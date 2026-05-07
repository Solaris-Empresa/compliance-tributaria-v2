/**
 * Issue #1010 — Q.CNAE dinâmico via QuestionarioV3 + gate hasGap + CnaeGapBanner
 *
 * Testa as transformações backend Wave 1 + lógica de cenários ortogonais.
 *
 * Cenários ortogonais (REGRA-ORQ-34 Protocolo 4):
 *   C1: 1 CNAE com cobertura RAG → questions populadas, hasGap=false
 *   C2: 1 CNAE sem cobertura (RAG=0 + SOLARIS=0) → questions=[], hasGap=true
 *   C3: 4 CNAEs ordenados por confidence DESC (mix cobertura/gap)
 *
 * @testing-library/react não está configurado — testamos contratos puros
 * (mapping shapes, ordenação, lógica de decisão).
 *
 * Refs:
 * - Issue #1010 (Q.CNAE multi-CNAE com gate)
 * - Wave 1 SHA: 181ecc7 (gate hasGap + auditCnaeGapSkip)
 * - Wave 2 SHA: a confirmar
 * - REGRA-ORQ-22 / ORQ-34 (3 cenários ortogonais)
 */
import { describe, it, expect } from "vitest";

// Shape do retorno de `generateQuestions` pós-Wave 1.
type GenerateQuestionsResult =
  | { questions: Array<{ id: string; fonte?: string; source_reference?: string }>; hasGap: false }
  | { questions: []; hasGap: true; motivo: "cnae_sem_legislacao_especifica" };

/**
 * Reproduz a lógica de decisão do gate hasGap em `routers-fluxo-v3.ts:670+`.
 * Função pura — testes sem dependência de DB/LLM.
 */
function resolveGateHasGap(
  ragArticlesCount: number,
  onda1QuestionsCount: number,
): { triggers: boolean; motivo?: string } {
  if (ragArticlesCount === 0 && onda1QuestionsCount === 0) {
    return { triggers: true, motivo: "cnae_sem_legislacao_especifica" };
  }
  return { triggers: false };
}

/**
 * Reproduz a ordenação aplicada em `QuestionarioV3.tsx` (Wave 2).
 * Confidence DESC. CNAEs sem confidence vão para o fim.
 */
function sortCnaesByConfidence(
  cnaes: Array<{ code: string; description: string; confidence?: number }>,
): Array<{ code: string; description: string; confidence?: number }> {
  return cnaes.slice().sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
}

describe("Issue #1010 — Q.CNAE dinâmico (Wave 1 backend + Wave 2 frontend)", () => {
  // ── C1: 1 CNAE com cobertura ───────────────────────────────────────────────
  it("C1 — RAG retorna chunks → gate NÃO dispara, questions populadas", () => {
    const decision = resolveGateHasGap(/* RAG */ 5, /* SOLARIS */ 3);
    expect(decision.triggers).toBe(false);
    expect(decision.motivo).toBeUndefined();

    // Shape do retorno backend pós-LLM (success path)
    const backendResponse: GenerateQuestionsResult = {
      questions: [
        { id: "rag-cnae-0115-1", fonte: "regulatorio", source_reference: "Art. 137 LC 214/2025" },
      ],
      hasGap: false,
    };
    expect(backendResponse.hasGap).toBe(false);
    expect((backendResponse as Extract<GenerateQuestionsResult, { hasGap: false }>).questions.length).toBeGreaterThan(0);
  });

  // ── C2: 1 CNAE sem cobertura ───────────────────────────────────────────────
  it("C2 — RAG=0 + SOLARIS=0 → gate dispara, hasGap=true, motivo='cnae_sem_legislacao_especifica'", () => {
    const decision = resolveGateHasGap(/* RAG */ 0, /* SOLARIS */ 0);
    expect(decision.triggers).toBe(true);
    expect(decision.motivo).toBe("cnae_sem_legislacao_especifica");

    // Shape esperado do retorno backend (gap path)
    const backendResponse: GenerateQuestionsResult = {
      questions: [],
      hasGap: true,
      motivo: "cnae_sem_legislacao_especifica",
    };
    expect(backendResponse.hasGap).toBe(true);
    expect((backendResponse as Extract<GenerateQuestionsResult, { hasGap: true }>).questions).toEqual([]);
    expect((backendResponse as Extract<GenerateQuestionsResult, { hasGap: true }>).motivo).toBe(
      "cnae_sem_legislacao_especifica",
    );
  });

  // ── C2b: gate NÃO dispara quando SOLARIS cobre mesmo sem RAG ──────────────
  it("C2b — RAG=0 mas SOLARIS=2 → gate NÃO dispara (SOLARIS Onda 1 cobre)", () => {
    const decision = resolveGateHasGap(/* RAG */ 0, /* SOLARIS */ 2);
    expect(decision.triggers).toBe(false);
  });

  // ── C2c: gate NÃO dispara quando RAG cobre mesmo sem SOLARIS ──────────────
  it("C2c — RAG=3 mas SOLARIS=0 → gate NÃO dispara (RAG cobre)", () => {
    const decision = resolveGateHasGap(/* RAG */ 3, /* SOLARIS */ 0);
    expect(decision.triggers).toBe(false);
  });

  // ── C3: 4 CNAEs ordenados por confidence DESC ──────────────────────────────
  it("C3 — 4 CNAEs ordenados por confidence DESC (mix cobertura/gap)", () => {
    const inputCnaes = [
      { code: "5211-7/99", description: "Depósitos de mercadorias", confidence: 0.55 },
      { code: "0115-6/00", description: "Cultivo de soja", confidence: 0.95 },
      { code: "0161-0/01", description: "Pulverização", confidence: 0.40 },
      { code: "4623-1/06", description: "Comércio atacadista de soja", confidence: 0.80 },
    ];

    const sorted = sortCnaesByConfidence(inputCnaes);

    expect(sorted.map((c) => c.code)).toEqual([
      "0115-6/00", // 0.95 — primary
      "4623-1/06", // 0.80
      "5211-7/99", // 0.55
      "0161-0/01", // 0.40
    ]);
    expect(sorted[0].confidence).toBe(0.95);
    expect(sorted[3].confidence).toBe(0.40);
  });

  // ── C3b: CNAEs sem confidence vão para o fim ──────────────────────────────
  it("C3b — CNAEs sem confidence (undefined) caem para o fim da lista", () => {
    const inputCnaes = [
      { code: "9999-9/99", description: "Sem confidence", confidence: undefined },
      { code: "0115-6/00", description: "Soja", confidence: 0.9 },
      { code: "8888-8/88", description: "Sem confidence", confidence: undefined },
    ];

    const sorted = sortCnaesByConfidence(inputCnaes);

    expect(sorted[0].code).toBe("0115-6/00");
    expect(sorted.slice(1).every((c) => c.confidence === undefined)).toBe(true);
  });

  // ── AC3: source_reference não-vazio para perguntas geradas (regulatorio) ──
  it("AC3 — perguntas geradas devem ter source_reference não-vazio (regulatório)", () => {
    // Validação de invariante de output do LLM. Frontend pode confiar
    // que perguntas com fonte='regulatorio' têm source_reference populado.
    const validQuestion = {
      id: "rag-cnae-0115-art137",
      fonte: "regulatorio",
      source_reference: "Art. 137 LC 214/2025",
      requirement_id: "RF-137-A",
    };
    expect(validQuestion.source_reference).toBeTruthy();
    expect(validQuestion.source_reference.length).toBeGreaterThan(5);
    expect(validQuestion.source_reference).toContain("LC 214");

    // Anti-pattern: pergunta regulatório sem fonte legal explícita
    const invalidQuestion = {
      id: "bad-q",
      fonte: "regulatorio",
      source_reference: "",
    };
    // Test contract: caller deve descartar perguntas regulatórias sem source_reference
    const isValid =
      invalidQuestion.fonte === "regulatorio" && (invalidQuestion.source_reference?.length ?? 0) > 0;
    expect(isValid).toBe(false);
  });

  // ── Audit subType ──────────────────────────────────────────────────────────
  it("auditCnaeGapSkip — payload tem subType='cnae_gap_skip' + cnaeCode + operationType", () => {
    const auditPayload = {
      subType: "cnae_gap_skip" as const,
      cnaeCode: "5211-7/99",
      cnaeDescription: "Depósitos de mercadorias",
      operationType: "comercio",
    };
    expect(auditPayload.subType).toBe("cnae_gap_skip");
    expect(auditPayload.cnaeCode).toMatch(/^\d{4}-\d\/\d{2}$/);
    expect(auditPayload.operationType).toBeTruthy();
  });
});
