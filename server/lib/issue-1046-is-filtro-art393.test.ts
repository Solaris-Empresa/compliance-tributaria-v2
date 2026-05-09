/**
 * Issue #1046 — IS filtro Art. 393 §1º LC 214/2025
 *
 * Causa raiz: regra `imposto_seletivo::op:misto::geo:multi` é arquetípica
 * e dispara para qualquer empresa misto/multiestadual, sem validar
 * elegibilidade pelo NCM/CNAE conforme lista taxativa Art. 393 §1º.
 *
 * Caso canônico (projeto #5040001):
 *   NCMs 2306.10.00, 2304.00.10 (farelos de soja, Capítulo 23)
 *   CNAE 4623-1/09 (comércio atacadista alimentos para animais)
 *   → Nenhum bate com a lista taxativa → IS NÃO deve ser gerado.
 *
 * Lista taxativa Art. 393 §1º:
 *   I. tabaco               → NCM 24
 *   II. bebidas alcoólicas  → NCM 22
 *   III. bebidas açucaradas → NCM 22
 *   IV. veículos            → NCM 87
 *   V. embarcações          → NCM 89
 *   VI. aeronaves           → NCM 88
 *   VII. minerais/petróleo  → NCM 26, 27
 *   VIII. apostas           → CNAE 92
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isImpostoSeletivoEligible } from "./risk-eligibility-is-ncm-cnae";
import { consolidateRisks, type GapRule } from "./risk-engine-v4";

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
  ruleId: "test-is-1",
  categoria: "imposto_seletivo",
  artigo: "Art. 2 LC 214/2025",
  fonte: "regulatorio",
  gapClassification: "regulatorio",
  requirementId: "req-is",
  sourceReference: "imposto seletivo",
  domain: "tax",
  ...overrides,
});

describe("Issue #1046 — IS filtro Art. 393 §1º — função pura", () => {
  describe("NCMs elegíveis (lista taxativa)", () => {
    it("NCM 2402.20.00 (cigarro) → eligible", () => {
      const result = isImpostoSeletivoEligible(["2402.20.00"], []);
      expect(result.eligible).toBe(true);
      expect(result.matchedPrefix).toBe("ncm:24");
    });

    it("NCM 2203.00.00 (cerveja) → eligible", () => {
      const result = isImpostoSeletivoEligible(["2203.00.00"], []);
      expect(result.eligible).toBe(true);
      expect(result.matchedPrefix).toBe("ncm:22");
    });

    it("NCM 8703.21.00 (automóvel) → eligible", () => {
      const result = isImpostoSeletivoEligible(["8703.21.00"], []);
      expect(result.eligible).toBe(true);
      expect(result.matchedPrefix).toBe("ncm:87");
    });

    it("NCM 8802.40.00 (aeronave) → eligible", () => {
      const result = isImpostoSeletivoEligible(["8802.40.00"], []);
      expect(result.eligible).toBe(true);
      expect(result.matchedPrefix).toBe("ncm:88");
    });

    it("NCM 8901.10.00 (embarcação) → eligible", () => {
      const result = isImpostoSeletivoEligible(["8901.10.00"], []);
      expect(result.eligible).toBe(true);
      expect(result.matchedPrefix).toBe("ncm:89");
    });

    it("NCM 2701.11.00 (carvão mineral) → eligible", () => {
      const result = isImpostoSeletivoEligible(["2701.11.00"], []);
      expect(result.eligible).toBe(true);
      expect(result.matchedPrefix).toBe("ncm:27");
    });

    it("NCM 2601.11.00 (minério de ferro) → eligible", () => {
      const result = isImpostoSeletivoEligible(["2601.11.00"], []);
      expect(result.eligible).toBe(true);
      expect(result.matchedPrefix).toBe("ncm:26");
    });
  });

  describe("CNAEs elegíveis (Divisão 92 — apostas)", () => {
    it("CNAE 9200-3/01 (loterias) → eligible", () => {
      const result = isImpostoSeletivoEligible([], ["9200-3/01"]);
      expect(result.eligible).toBe(true);
      expect(result.matchedPrefix).toBe("cnae:92");
    });

    it("CNAE 9249-9/00 (outras atividades de jogos) → eligible", () => {
      const result = isImpostoSeletivoEligible([], ["9249-9/00"]);
      expect(result.eligible).toBe(true);
      expect(result.matchedPrefix).toBe("cnae:92");
    });
  });

  describe("Não-elegíveis (caso canônico #5040001)", () => {
    it("NCM 2306.10.00 (torta de soja) → NÃO eligible", () => {
      const result = isImpostoSeletivoEligible(["2306.10.00"], []);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("ncm_cnae_not_in_art_393");
    });

    it("NCM 2304.00.10 (farelo de soja) → NÃO eligible", () => {
      const result = isImpostoSeletivoEligible(["2304.00.10"], []);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("ncm_cnae_not_in_art_393");
    });

    it("Caso #5040001 completo: NCMs farelos + CNAE comércio alimentos → NÃO eligible", () => {
      const result = isImpostoSeletivoEligible(
        ["2306.10.00", "2304.00.10"],
        ["4623-1/09"],
      );
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("ncm_cnae_not_in_art_393");
    });

    it("CNAE 4623-1/09 (comércio atacadista) sozinho → NÃO eligible", () => {
      const result = isImpostoSeletivoEligible([], ["4623-1/09"]);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("ncm_cnae_not_in_art_393");
    });

    it("CNAE 4930-2/02 (transporte rodoviário) → NÃO eligible (REGRA-ORQ-29)", () => {
      const result = isImpostoSeletivoEligible([], ["4930-2/02"]);
      expect(result.eligible).toBe(false);
    });
  });

  describe("Edge cases — fallback permissivo", () => {
    it("NCMs e CNAEs vazios → eligible com reason='ncm_cnae_ausentes' (fallback permissivo)", () => {
      const result = isImpostoSeletivoEligible([], []);
      expect(result.eligible).toBe(true);
      expect(result.reason).toBe("ncm_cnae_ausentes");
    });

    it("Múltiplos NCMs, um elegível → eligible", () => {
      const result = isImpostoSeletivoEligible(
        ["2306.10.00", "2402.20.00"], // farelo + cigarro
        [],
      );
      expect(result.eligible).toBe(true);
      expect(result.matchedPrefix).toBe("ncm:24");
    });

    it("NCM com formatação alternativa (sem pontos) → normalizado", () => {
      const result = isImpostoSeletivoEligible(["24022000"], []);
      expect(result.eligible).toBe(true);
      expect(result.matchedPrefix).toBe("ncm:24");
    });

    it("CNAE com formatação alternativa → normalizado", () => {
      const result = isImpostoSeletivoEligible([], ["9200301"]);
      expect(result.eligible).toBe(true);
      expect(result.matchedPrefix).toBe("cnae:92");
    });
  });
});

describe("Issue #1046 — guard em consolidateRisks", () => {
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

  it("Caso #5040001: NCMs 2306/2304 + CNAE 4623 → IS bloqueado", async () => {
    const gaps = [baseGap({ categoria: "imposto_seletivo" })];
    const result = await consolidateRisks(
      5040001,
      gaps,
      {
        tipoOperacao: "misto",
        multiestadual: true,
        ncmCodes: ["2306.10.00", "2304.00.10"],
        confirmedCnaes: ["4623-1/09"],
      },
      1,
    );
    expect(result).toEqual([]);
  });

  it("Empresa de tabaco (NCM 24) → IS gerado normalmente", async () => {
    const gaps = [baseGap({ categoria: "imposto_seletivo" })];
    const result = await consolidateRisks(
      9999001,
      gaps,
      {
        tipoOperacao: "industria",
        multiestadual: false,
        ncmCodes: ["2402.20.00"],
        confirmedCnaes: ["1220-4/02"],
      },
      1,
    );
    expect(result.length).toBe(1);
    expect(result[0].categoria).toBe("imposto_seletivo");
  });

  it("Apostas (CNAE 92) → IS gerado normalmente", async () => {
    const gaps = [baseGap({ categoria: "imposto_seletivo" })];
    const result = await consolidateRisks(
      9999002,
      gaps,
      {
        tipoOperacao: "servicos",
        multiestadual: false,
        ncmCodes: [],
        confirmedCnaes: ["9200-3/01"],
      },
      1,
    );
    expect(result.length).toBe(1);
    expect(result[0].categoria).toBe("imposto_seletivo");
  });

  it("Sem NCMs/CNAEs (onboarding incompleto) → IS gerado (fallback permissivo)", async () => {
    const gaps = [baseGap({ categoria: "imposto_seletivo" })];
    const result = await consolidateRisks(
      9999003,
      gaps,
      {
        tipoOperacao: "misto",
        multiestadual: true,
        // ncmCodes e confirmedCnaes ausentes
      },
      1,
    );
    // Fallback permissivo: sem dado, não bloqueia
    expect(result.length).toBe(1);
  });

  it("warn message inclui Issue #1046 + Art. 393 §1º + reason", async () => {
    const gaps = [baseGap({ categoria: "imposto_seletivo" })];
    await consolidateRisks(
      5040001,
      gaps,
      {
        tipoOperacao: "misto",
        ncmCodes: ["2306.10.00"],
        confirmedCnaes: ["4623-1/09"],
      },
      1,
    );
    const warnCalls = warnSpy.mock.calls.flat().join(" ");
    expect(warnCalls).toMatch(/#1046/);
    expect(warnCalls).toMatch(/Art. 393/);
    expect(warnCalls).toMatch(/ncm_cnae_not_in_art_393/);
  });

  it("Outras categorias (não IS) não são afetadas pelo filtro NCM/CNAE", async () => {
    const gaps = [
      baseGap({ categoria: "split_payment", artigo: "Art. 9" }),
      baseGap({ categoria: "obrigacao_acessoria", artigo: "Art. 102" }),
    ];
    const result = await consolidateRisks(
      5040001,
      gaps,
      {
        tipoOperacao: "misto",
        ncmCodes: ["2306.10.00"], // NCMs não elegíveis ao IS
        confirmedCnaes: ["4623-1/09"],
      },
      1,
    );
    expect(result.length).toBe(2);
    expect(result.map((r) => r.categoria).sort()).toEqual([
      "obrigacao_acessoria",
      "split_payment",
    ]);
  });
});

describe("Issue #1046 — DoD POSITIVO + NEGATIVO", () => {
  it("DoD POSITIVO: empresa do caso canônico #5040001 não recebe IS", () => {
    const result = isImpostoSeletivoEligible(
      ["2306.10.00", "2304.00.10"],
      ["4623-1/09"],
    );
    expect(result.eligible).toBe(false);
  });

  it("DoD POSITIVO: empresa de tabaco (NCM 24) recebe IS", () => {
    const result = isImpostoSeletivoEligible(["2402.20.00"], []);
    expect(result.eligible).toBe(true);
  });

  it("DoD NEGATIVO: regressão proibida — IS não pode ser gerado para NCMs Capítulo 23 (resíduos alimentares)", () => {
    const ncmsCapitulo23 = [
      "2301.10.00",
      "2302.10.00",
      "2303.10.00",
      "2304.00.10",
      "2305.00.10",
      "2306.10.00",
    ];
    for (const ncm of ncmsCapitulo23) {
      const result = isImpostoSeletivoEligible([ncm], []);
      expect(result.eligible).toBe(false);
    }
  });
});
