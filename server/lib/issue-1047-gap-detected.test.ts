/**
 * Issue #1047 — gap_detected + badge visual (REGRA-ORQ-29 / decisão P.O. 2026-05-09)
 *
 * Comportamento:
 *   gap_detected = TRUE  → "⚠️ Gap detectado" (vermelho)
 *     Pelo menos 1 gap tem fonte de questionário do usuário (solaris, iagen,
 *     cnae, ncm, nbs) — indica não-conformidade declarada.
 *
 *   gap_detected = FALSE → "🛡️ Risco inerente"  (azul)
 *     TODOS os gaps são 'regulatorio' (inferido por arquétipo) — risco
 *     inerente ao perfil, cliente declarou compliance.
 *
 * Score NÃO muda (decisão P.O. — sprint futura).
 *
 * Caso canônico #5040001 (8 riscos, 30/30 respostas "Sim" pelo cliente):
 *   - 3 riscos com fonte solaris (Split Payment, Confissão Auto, Obrig Acessória)
 *     → na verdade têm answer="Sim" — POREM o gap foi gerado pelo iagen-gap-analyzer
 *     ou solaris-gap-analyzer mesmo com resposta "Sim" (cenário arquetípico)
 *   - Comportamento esperado: badge reflete a fonte do gap, não o conteúdo
 *     da resposta. Refinamento futuro pode usar answerValue.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isGapDetected, consolidateRisks, type GapRule } from "./risk-engine-v4";

vi.mock("./db-queries-risk-categories", () => ({
  listActiveCategories: vi.fn().mockResolvedValue([]),
  getCategoryByCode: vi.fn().mockResolvedValue(null),
}));
vi.mock("./risk-eligibility", () => ({
  isCategoryAllowed: vi.fn(),
  insertEligibilityAuditLog: vi.fn().mockResolvedValue(undefined),
}));
import * as eligibilityModule from "./risk-eligibility";

const baseGap = (overrides: Partial<GapRule> = {}): GapRule => ({
  ruleId: "test-1",
  categoria: "split_payment",
  artigo: "Art. 9 LC 214/2025",
  fonte: "solaris",
  gapClassification: "solaris",
  requirementId: "req-1",
  sourceReference: "contraditorio",
  domain: "tax",
  ...overrides,
});

describe("Issue #1047 — função pura isGapDetected", () => {
  describe("TRUE — pelo menos 1 fonte de questionário do usuário", () => {
    it("gap com fonte=solaris → gap_detected=true", () => {
      expect(isGapDetected([{ fonte: "solaris" }])).toBe(true);
    });

    it("gap com fonte=iagen → gap_detected=true", () => {
      expect(isGapDetected([{ fonte: "iagen" }])).toBe(true);
    });

    it("gap com fonte=cnae → gap_detected=true", () => {
      expect(isGapDetected([{ fonte: "cnae" }])).toBe(true);
    });

    it("gap com fonte=ncm → gap_detected=true", () => {
      expect(isGapDetected([{ fonte: "ncm" }])).toBe(true);
    });

    it("gap com fonte=nbs → gap_detected=true", () => {
      expect(isGapDetected([{ fonte: "nbs" }])).toBe(true);
    });

    it("misto (1 regulatorio + 1 solaris) → gap_detected=true", () => {
      expect(
        isGapDetected([{ fonte: "regulatorio" }, { fonte: "solaris" }]),
      ).toBe(true);
    });

    it("3 fontes diferentes (regulatorio + iagen + solaris) → gap_detected=true", () => {
      expect(
        isGapDetected([
          { fonte: "regulatorio" },
          { fonte: "iagen" },
          { fonte: "solaris" },
        ]),
      ).toBe(true);
    });
  });

  describe("FALSE — todos os gaps são regulatorio (inerente)", () => {
    it("gap único com fonte=regulatorio → gap_detected=false", () => {
      expect(isGapDetected([{ fonte: "regulatorio" }])).toBe(false);
    });

    it("múltiplos gaps, todos regulatorio → gap_detected=false", () => {
      expect(
        isGapDetected([
          { fonte: "regulatorio" },
          { fonte: "regulatorio" },
          { fonte: "regulatorio" },
        ]),
      ).toBe(false);
    });

    it("array vazio → gap_detected=false (sem evidência = inerente)", () => {
      expect(isGapDetected([])).toBe(false);
    });
  });

  describe("Edge cases — fontes desconhecidas/inválidas", () => {
    it("fonte desconhecida 'foo' não conta como gap detectado", () => {
      expect(isGapDetected([{ fonte: "foo" }])).toBe(false);
    });

    it("fonte vazia '' não conta como gap detectado", () => {
      expect(isGapDetected([{ fonte: "" }])).toBe(false);
    });

    it("fonte 'inferred' (normative-inference) não conta como gap detectado", () => {
      expect(isGapDetected([{ fonte: "inferred" }])).toBe(false);
    });
  });
});

describe("Issue #1047 — integração com consolidateRisks", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.mocked(eligibilityModule.isCategoryAllowed).mockImplementation(
      (cat) =>
        ({
          final: cat,
          suggested: cat,
          allowed: true,
          reason: null,
        }) as never,
    );
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("risco com gap fonte=solaris → InsertRiskV4 com gap_detected=true", async () => {
    const gaps = [baseGap({ fonte: "solaris" })];
    const result = await consolidateRisks(
      5040001,
      gaps,
      { tipoOperacao: "misto", multiestadual: true },
      1,
    );
    expect(result.length).toBe(1);
    expect(result[0].gap_detected).toBe(true);
  });

  it("risco com gap fonte=regulatorio → InsertRiskV4 com gap_detected=false (inerente)", async () => {
    const gaps = [baseGap({ fonte: "regulatorio" })];
    const result = await consolidateRisks(
      5040001,
      gaps,
      { tipoOperacao: "misto", multiestadual: true },
      1,
    );
    expect(result.length).toBe(1);
    expect(result[0].gap_detected).toBe(false);
  });

  it("risco com mistura regulatorio+iagen → gap_detected=true (qualquer 1 user source)", async () => {
    const gaps = [
      baseGap({ ruleId: "r1", fonte: "regulatorio" }),
      baseGap({ ruleId: "r2", fonte: "iagen" }),
    ];
    const result = await consolidateRisks(
      5040001,
      gaps,
      { tipoOperacao: "misto", multiestadual: true },
      1,
    );
    // Mesma categoria + contexto → 1 risco consolidado
    expect(result.length).toBe(1);
    expect(result[0].gap_detected).toBe(true);
  });

  it("múltiplos riscos com fontes diferentes preservam classificação individual", async () => {
    const gaps = [
      baseGap({
        ruleId: "r1",
        categoria: "split_payment",
        artigo: "Art. 9",
        fonte: "solaris",
      }),
      baseGap({
        ruleId: "r2",
        categoria: "obrigacao_acessoria",
        artigo: "Art. 102",
        fonte: "regulatorio",
      }),
    ];
    const result = await consolidateRisks(
      5040001,
      gaps,
      { tipoOperacao: "misto", multiestadual: true },
      1,
    );
    expect(result.length).toBe(2);
    const split = result.find((r) => r.categoria === "split_payment");
    const obrig = result.find((r) => r.categoria === "obrigacao_acessoria");
    expect(split?.gap_detected).toBe(true);
    expect(obrig?.gap_detected).toBe(false);
  });
});

describe("Issue #1047 — DoD POSITIVO + NEGATIVO", () => {
  it("DoD POSITIVO: campo gap_detected sempre boolean (nunca null/undefined)", () => {
    const cases: Array<{ fonte: string }[]> = [
      [{ fonte: "solaris" }],
      [{ fonte: "regulatorio" }],
      [],
      [{ fonte: "foo" }],
    ];
    for (const c of cases) {
      const r = isGapDetected(c);
      expect(typeof r).toBe("boolean");
    }
  });

  it("DoD NEGATIVO: gap_detected nunca confunde gap com risco order — preserva semântica", () => {
    // Ordem dos gaps não afeta resultado
    const g1 = [{ fonte: "regulatorio" }, { fonte: "solaris" }];
    const g2 = [{ fonte: "solaris" }, { fonte: "regulatorio" }];
    expect(isGapDetected(g1)).toBe(isGapDetected(g2));
  });

  it("Caso #5040001 simulado: 3 gaps solaris + 5 regulatorio → todos os 3 solaris ficam gap_detected=true", () => {
    // Não testa o algoritmo de groupBy categoria — testa que cada gap solaris contribui
    expect(isGapDetected([{ fonte: "solaris" }, { fonte: "regulatorio" }])).toBe(true);
    expect(isGapDetected([{ fonte: "regulatorio" }])).toBe(false);
  });
});
