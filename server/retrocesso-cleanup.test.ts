/**
 * RETROCESSO CLEANUP — Testes F-03
 *
 * Cobertura:
 *  Bloco 1 — determineCleanupScope (lógica pura, sem banco)
 *  Bloco 2 — retrocessoRequiresCleanup (helper booleano)
 *  Bloco 3 — getRetrocessoWarningMessage (mensagens de confirmação)
 *  Bloco 4 — executeRetrocessoCleanup (integração com banco mockado)
 *  Bloco 5 — Invariantes de isolamento V1/V3/híbrido
 *  Bloco 6 — Casos extremos e edge cases
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  determineCleanupScope,
  retrocessoRequiresCleanup,
  getRetrocessoWarningMessage,
  executeRetrocessoCleanup,
} from "./retrocesso-cleanup";

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DO BANCO
// ─────────────────────────────────────────────────────────────────────────────
const { mockUpdate, mockDelete } = vi.hoisted(() => {
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  return { mockUpdate, mockDelete };
});

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    update: mockUpdate,
    delete: mockDelete,
  }),
}));

vi.mock("../drizzle/schema", () => ({
  projects: { id: "id" },
  questionnaireAnswersV3: { projectId: "projectId" },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });
  mockDelete.mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 1 — determineCleanupScope
// ─────────────────────────────────────────────────────────────────────────────
describe("Bloco 1 — determineCleanupScope", () => {
  it("1.1 — avanço não gera limpeza", () => {
    const scope = determineCleanupScope(5, 8, "v1");
    expect(scope.columns).toHaveLength(0);
  });

  it("1.2 — permanência na mesma etapa não gera limpeza", () => {
    const scope = determineCleanupScope(8, 8, "v1");
    expect(scope.columns).toHaveLength(0);
  });

  it("1.3 — flowVersion=none nunca gera limpeza", () => {
    const scope = determineCleanupScope(10, 1, "none");
    expect(scope.columns).toHaveLength(0);
  });

  it("1.4 — retrocesso V1 de etapa 8 para 7 limpa briefingContent, riskMatricesData e actionPlansData", () => {
    // toStep=7 → etapas 8,9,10 > 7 → limpa briefing (8), riscos (9) e plano (10)
    const scope = determineCleanupScope(8, 7, "v1");
    expect(scope.columns).toContain("briefingContent");
    expect(scope.columns).toContain("riskMatricesData"); // etapa 9 > 7
    expect(scope.columns).toContain("actionPlansData"); // etapa 10 > 7
  });

  it("1.5 — retrocesso V1 de etapa 10 para 7 limpa briefing, riscos e plano", () => {
    const scope = determineCleanupScope(10, 7, "v1");
    expect(scope.columns).toContain("briefingContent");
    expect(scope.columns).toContain("riskMatricesData");
    expect(scope.columns).toContain("actionPlansData");
  });

  it("1.6 — retrocesso V1 de etapa 9 para 4 limpa todos os dados de diagnóstico", () => {
    // toStep=4 → etapas 5,6,7,8,9,10 > 4 → limpa tudo (incluindo actionPlansData da etapa 10)
    const scope = determineCleanupScope(9, 4, "v1");
    expect(scope.columns).toContain("corporateAnswers");
    expect(scope.columns).toContain("operationalAnswers");
    expect(scope.columns).toContain("cnaeAnswers");
    expect(scope.columns).toContain("briefingContent");
    expect(scope.columns).toContain("riskMatricesData");
    expect(scope.columns).toContain("actionPlansData"); // etapa 10 > 4, sempre limpa
  });

  it("1.7 — retrocesso V3 de etapa 9 para 7 limpa briefingContent e riskMatricesData (sem corporateAnswers V1)", () => {
    const scope = determineCleanupScope(9, 7, "v3");
    expect(scope.columns).toContain("briefingContent");
    expect(scope.columns).toContain("riskMatricesData");
    // V3 não tem corporateAnswers/operationalAnswers/cnaeAnswers como colunas JSON
    expect(scope.columns).not.toContain("corporateAnswers");
    expect(scope.columns).not.toContain("operationalAnswers");
  });

  it("1.8 — retrocesso híbrido de etapa 10 para 4 limpa colunas V1 e V3", () => {
    const scope = determineCleanupScope(10, 4, "hybrid");
    expect(scope.columns).toContain("corporateAnswers");
    expect(scope.columns).toContain("operationalAnswers");
    expect(scope.columns).toContain("cnaeAnswers");
    expect(scope.columns).toContain("briefingContent");
    expect(scope.columns).toContain("riskMatricesData");
    expect(scope.columns).toContain("actionPlansData");
  });

  it("1.9 — retrocesso de etapa 2 para 1 limpa colunas de diagnóstico (limpeza conservadora)", () => {
    // toStep=1 → etapas 5,6,7,8,9,10 > 1 → limpa todas as colunas de diagnóstico
    // (mesmo que o projeto ainda não tenha chegado lá — limpeza idempotente)
    const scope = determineCleanupScope(2, 1, "v1");
    expect(scope.columns.length).toBeGreaterThan(0);
  });

  it("1.10 — retrocesso V1 de etapa 11 para 1 limpa todos os dados de diagnóstico", () => {
    const scope = determineCleanupScope(11, 1, "v1");
    expect(scope.columns).toContain("corporateAnswers");
    expect(scope.columns).toContain("operationalAnswers");
    expect(scope.columns).toContain("cnaeAnswers");
    expect(scope.columns).toContain("briefingContent");
    expect(scope.columns).toContain("riskMatricesData");
    expect(scope.columns).toContain("actionPlansData");
  });

  it("1.11 — retrocesso V3 de etapa 8 para 8 não gera limpeza (mesma etapa)", () => {
    const scope = determineCleanupScope(8, 8, "v3");
    expect(scope.columns).toHaveLength(0);
  });

  it("1.12 — retrocesso V1 de etapa 6 para 5 limpa operationalAnswers e dados das etapas posteriores", () => {
    // Retroceder para etapa 5 descarta etapas 6,7,8,9,10 → limpa operational, cnae, briefing, riscos, plano
    const scope = determineCleanupScope(6, 5, "v1");
    expect(scope.columns).toContain("operationalAnswers");
    expect(scope.columns).toContain("cnaeAnswers"); // etapa 7 > 5
    expect(scope.columns).not.toContain("corporateAnswers"); // etapa 5 = toStep, não descartada
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2 — retrocessoRequiresCleanup
// ─────────────────────────────────────────────────────────────────────────────
describe("Bloco 2 — retrocessoRequiresCleanup", () => {
  it("2.1 — retrocesso V1 de 9 para 7 requer limpeza", () => {
    expect(retrocessoRequiresCleanup(9, 7, "v1")).toBe(true);
  });

  it("2.2 — avanço não requer limpeza", () => {
    expect(retrocessoRequiresCleanup(5, 9, "v1")).toBe(false);
  });

  it("2.3 — flowVersion=none nunca requer limpeza", () => {
    expect(retrocessoRequiresCleanup(10, 1, "none")).toBe(false);
  });

  it("2.4 — retrocesso de etapa 3 para 1 requer limpeza (etapas 5-10 > 1 seriam limpas)", () => {
    // fromStep=3, toStep=1 → etapas 2,3,4,5,6,7,8,9,10 > 1 → inclui etapas de diagnóstico
    // Porém fromStep=3 significa que o projeto ainda não chegou na etapa 5, então
    // os dados de diagnóstico não existem. A lógica de limpeza é conservadora:
    // ela limpa as colunas mesmo que estejam NULL (idempotente).
    expect(retrocessoRequiresCleanup(3, 1, "v1")).toBe(true);
  });

  it("2.5 — retrocesso V3 de etapa 8 para 6 requer limpeza", () => {
    expect(retrocessoRequiresCleanup(8, 6, "v3")).toBe(true);
  });

  it("2.6 — permanência na mesma etapa não requer limpeza", () => {
    expect(retrocessoRequiresCleanup(7, 7, "v1")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3 — getRetrocessoWarningMessage
// ─────────────────────────────────────────────────────────────────────────────
describe("Bloco 3 — getRetrocessoWarningMessage", () => {
  it("3.1 — retrocesso sem limpeza retorna string vazia", () => {
    const msg = getRetrocessoWarningMessage(5, 9, "v1");
    expect(msg).toBe("");
  });

  it("3.2 — retrocesso com limpeza retorna mensagem não vazia", () => {
    const msg = getRetrocessoWarningMessage(9, 7, "v1");
    expect(msg.length).toBeGreaterThan(0);
  });

  it("3.3 — mensagem menciona 'Briefing gerado pela IA' ao retroceder de etapa 9 para 7", () => {
    const msg = getRetrocessoWarningMessage(9, 7, "v1");
    expect(msg).toContain("Briefing gerado pela IA");
  });

  it("3.4 — mensagem menciona 'Matrizes de riscos' ao retroceder de etapa 10 para 8", () => {
    const msg = getRetrocessoWarningMessage(10, 8, "v1");
    expect(msg).toContain("Matrizes de riscos");
  });

  it("3.5 — mensagem menciona 'não pode ser desfeita'", () => {
    const msg = getRetrocessoWarningMessage(10, 1, "v1");
    expect(msg).toContain("não pode ser desfeita");
  });

  it("3.6 — flowVersion=none retorna string vazia mesmo com retrocesso grande", () => {
    const msg = getRetrocessoWarningMessage(10, 1, "none");
    expect(msg).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4 — executeRetrocessoCleanup (integração com banco mockado)
// ─────────────────────────────────────────────────────────────────────────────
describe("Bloco 4 — executeRetrocessoCleanup", () => {
  it("4.1 — avanço retorna cleaned=false sem chamar banco", async () => {
    const result = await executeRetrocessoCleanup(1, 5, 9, "v1");
    expect(result.cleaned).toBe(false);
    expect(result.cleanedColumns).toHaveLength(0);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("4.2 — flowVersion=none retorna cleaned=false sem chamar banco", async () => {
    const result = await executeRetrocessoCleanup(1, 10, 1, "none");
    expect(result.cleaned).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("4.3 — retrocesso V1 de 9 para 7 chama db.update com briefingContent e riskMatricesData", async () => {
    const result = await executeRetrocessoCleanup(1, 9, 7, "v1");
    expect(result.cleaned).toBe(true);
    expect(result.cleanedColumns).toContain("briefingContent");
    expect(result.cleanedColumns).toContain("riskMatricesData");
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockDelete).not.toHaveBeenCalled(); // V1 não deleta questionnaireAnswersV3
  });

  it("4.4 — retrocesso V3 de 9 para 4 chama db.update E db.delete (questionnaireAnswersV3)", async () => {
    const result = await executeRetrocessoCleanup(1, 9, 4, "v3");
    expect(result.cleaned).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledTimes(1); // V3 deleta questionnaireAnswersV3
    expect(result.cleanedColumns).toContain("questionnaireAnswersV3 (tabela)");
  });

  it("4.5 — retrocesso híbrido de 10 para 4 chama db.update E db.delete", async () => {
    const result = await executeRetrocessoCleanup(1, 10, 4, "hybrid");
    expect(result.cleaned).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it("4.6 — retrocesso V3 de 9 para 8 NÃO deleta questionnaireAnswersV3 (etapas 5-7 não afetadas)", async () => {
    const result = await executeRetrocessoCleanup(1, 9, 8, "v3");
    expect(result.cleaned).toBe(true);
    expect(mockDelete).not.toHaveBeenCalled(); // toStep=8 > etapas 5,6,7
  });

  it("4.7 — resultado contém fromStep e toStep corretos", async () => {
    const result = await executeRetrocessoCleanup(42, 10, 5, "v1");
    expect(result.fromStep).toBe(10);
    expect(result.toStep).toBe(5);
    expect(result.flowVersion).toBe("v1");
  });

  it("4.8 — retrocesso de etapa 2 para 1 retorna cleaned=true (limpeza conservadora de etapas > 1)", async () => {
    // A limpeza é conservadora: limpa colunas mesmo que estejam NULL (idempotente)
    // toStep=1 → etapas 5,6,7,8,9,10 > 1 → há colunas para limpar
    const result = await executeRetrocessoCleanup(1, 2, 1, "v1");
    expect(result.cleaned).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 5 — Invariantes de isolamento V1/V3/híbrido
// ─────────────────────────────────────────────────────────────────────────────
describe("Bloco 5 — Invariantes de isolamento V1/V3/híbrido", () => {
  it("5.1 — V1 nunca limpa colunas V3 exclusivas (questionnaireAnswersV3 via tabela)", async () => {
    const result = await executeRetrocessoCleanup(1, 10, 4, "v1");
    expect(result.cleanedColumns).not.toContain("questionnaireAnswersV3 (tabela)");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("5.2 — V3 nunca limpa corporateAnswers/operationalAnswers/cnaeAnswers (colunas V1)", () => {
    const scope = determineCleanupScope(10, 4, "v3");
    expect(scope.columns).not.toContain("corporateAnswers");
    expect(scope.columns).not.toContain("operationalAnswers");
    expect(scope.columns).not.toContain("cnaeAnswers");
  });

  it("5.3 — híbrido limpa tanto colunas V1 quanto V3", () => {
    const scope = determineCleanupScope(10, 4, "hybrid");
    // V1
    expect(scope.columns).toContain("corporateAnswers");
    expect(scope.columns).toContain("operationalAnswers");
    expect(scope.columns).toContain("cnaeAnswers");
    // V3 (colunas JSON compartilhadas)
    expect(scope.columns).toContain("briefingContent");
    expect(scope.columns).toContain("riskMatricesData");
    expect(scope.columns).toContain("actionPlansData");
  });

  it("5.4 — RAG e CNAEs confirmados NUNCA aparecem nas colunas de limpeza", () => {
    const scope = determineCleanupScope(11, 1, "hybrid");
    expect(scope.columns).not.toContain("confirmedCnaes");
    expect(scope.columns).not.toContain("ragData");
    expect(scope.columns).not.toContain("cnaeData");
    expect(scope.columns).not.toContain("regulatoryData");
  });

  it("5.5 — stepHistory NUNCA aparece nas colunas de limpeza", () => {
    const scope = determineCleanupScope(11, 1, "v1");
    expect(scope.columns).not.toContain("stepHistory");
    expect(scope.columns).not.toContain("currentStep");
    expect(scope.columns).not.toContain("status");
  });

  it("5.6 — limpeza é idempotente: executar duas vezes não causa erro", async () => {
    await expect(
      executeRetrocessoCleanup(1, 9, 7, "v1").then(() =>
        executeRetrocessoCleanup(1, 9, 7, "v1")
      )
    ).resolves.not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 6 — Casos extremos e edge cases
// ─────────────────────────────────────────────────────────────────────────────
describe("Bloco 6 — Edge cases", () => {
  it("6.1 — fromStep=0 e toStep=0 não gera limpeza", () => {
    const scope = determineCleanupScope(0, 0, "v1");
    expect(scope.columns).toHaveLength(0);
  });

  it("6.2 — fromStep muito alto (99) retrocedendo para 1 limpa todos os dados V1", () => {
    const scope = determineCleanupScope(99, 1, "v1");
    expect(scope.columns).toContain("corporateAnswers");
    expect(scope.columns).toContain("briefingContent");
    expect(scope.columns).toContain("actionPlansData");
  });

  it("6.3 — retrocesso de etapa 5 para 4 limpa corporateAnswers e todos os dados posteriores (V1)", () => {
    // toStep=4 → etapas 5,6,7,8,9,10 > 4 → limpa tudo
    const scope = determineCleanupScope(5, 4, "v1");
    expect(scope.columns).toContain("corporateAnswers");
    expect(scope.columns).toContain("operationalAnswers"); // etapa 6 > 4
    expect(scope.columns).toContain("briefingContent"); // etapa 8 > 4
  });

  it("6.4 — retrocesso V3 de etapa 7 para 4 deleta questionnaireAnswersV3 (etapas 5,6,7 > 4)", async () => {
    const result = await executeRetrocessoCleanup(1, 7, 4, "v3");
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(result.cleanedColumns).toContain("questionnaireAnswersV3 (tabela)");
  });

  it("6.5 — retrocesso V3 de etapa 7 para 5 deleta questionnaireAnswersV3 (etapas 6,7 > 5)", async () => {
    const result = await executeRetrocessoCleanup(1, 7, 5, "v3");
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it("6.6 — retrocesso V3 de etapa 7 para 7 não deleta questionnaireAnswersV3 (mesma etapa)", async () => {
    const result = await executeRetrocessoCleanup(1, 7, 7, "v3");
    expect(result.cleaned).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("6.7 — determineCleanupScope retorna reason descritivo ao limpar", () => {
    const scope = determineCleanupScope(9, 7, "v1");
    expect(scope.reason.length).toBeGreaterThan(0);
    expect(scope.reason).toContain("7");
  });

  it("6.8 — determineCleanupScope retorna reason descritivo ao não limpar", () => {
    const scope = determineCleanupScope(5, 9, "v1");
    expect(scope.reason.length).toBeGreaterThan(0);
  });
});
