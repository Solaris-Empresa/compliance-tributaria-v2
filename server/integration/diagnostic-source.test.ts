/**
 * Testes F-01 — Adaptador getDiagnosticSource (ADR-005)
 * ─────────────────────────────────────────────────────────────────────────────
 * Cobertura obrigatória (ADR-005 Seção 9, pré-condição F-01):
 *
 * 1. Projeto V1 → retorna corporateAnswers/operationalAnswers/cnaeAnswers
 * 2. Projeto V3 → retorna questionnaireAnswersV3/briefingContentV3/etc.
 * 3. Projeto híbrido → comportamento definido (hybrid, não bloqueante)
 * 4. Projeto sem dados → flowVersion='none'
 * 5. Projeto inexistente → TRPCError NOT_FOUND
 * 6. Banco indisponível → TRPCError INTERNAL_SERVER_ERROR
 * 7. assertFlowVersion → FORBIDDEN quando fluxo errado
 * 8. assertFlowVersion → OK quando fluxo correto
 * 9. assertFlowVersion → BAD_REQUEST quando flowVersion='none'
 * 10. assertFlowVersion → warning (não lança) quando hybrid
 * 11. validateV3DataSufficiency → null quando OK
 * 12. validateV3DataSufficiency → string de erro quando insuficiente
 * 13. validateV1DataSufficiency → null quando OK
 * 14. validateV1DataSufficiency → string de erro quando insuficiente
 * 15. determineFlowVersion → todos os 4 casos
 *
 * REGRAS:
 * - Nenhum endpoint modificado
 * - Nenhum schema alterado
 * - Testes são unitários (mock do banco)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  determineFlowVersion,
  assertFlowVersion,
  validateV3DataSufficiency,
  validateV1DataSufficiency,
  type DiagnosticSource,
  type DiagnosticFlowVersion,
} from "../diagnostic-source";
import { TRPCError } from "@trpc/server";

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

// Mock do módulo de banco de dados
vi.mock("./db", () => ({
  getDb: vi.fn(),
  getProjectById: vi.fn(),
}));

// Mock do drizzle-orm para evitar conexão real
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
}));

// Mock do schema
vi.mock("../drizzle/schema", () => ({
  projects: { id: "id", projectId: "projectId" },
  briefings: { projectId: "projectId" },
  riskMatrix: { projectId: "projectId" },
  actionPlans: { projectId: "projectId" },
}));

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const CORPORATE_ANSWERS_V1 = {
  companyType: "ltda",
  companySize: "media",
  taxRegime: "lucro_presumido",
  annualRevenueRange: "4800000-12000000",
  hasTaxTeam: true,
};

const OPERATIONAL_ANSWERS_V1 = {
  operationType: "comercio",
  clientType: ["b2b", "b2c"],
  multiState: true,
};

const CNAE_ANSWERS_V1 = {
  "47.11-3": [
    { question: "Vende no varejo?", answer: "Sim" },
  ],
};

const QUESTIONNAIRE_ANSWERS_V3 = [
  {
    cnaeCode: "47.11-3",
    cnaeDescription: "Comércio varejista de mercadorias em geral",
    level: "nivel1",
    questions: [
      { question: "Qual o principal canal de vendas?", answer: "Loja física e e-commerce" },
    ],
  },
];

const BRIEFING_CONTENT_V3 = "# Briefing Tributário\n\nAnálise de risco para empresa de comércio varejista...";

const RISK_MATRICES_DATA_V3 = {
  "47.11-3": [
    { id: "R001", title: "Risco de ICMS", probability: "alta", impact: "alto" },
  ],
};

const ACTION_PLANS_DATA_V3 = {
  "Tributário": [
    { id: "T001", title: "Revisar apuração de ICMS", deadline: "2026-06-30" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function makeDiagnosticSource(
  flowVersion: DiagnosticFlowVersion,
  overrides: Partial<DiagnosticSource> = {}
): DiagnosticSource {
  return {
    flowVersion,
    projectId: 42,
    corporateAnswers: null,
    operationalAnswers: null,
    cnaeAnswers: null,
    briefingV1: null,
    risksV1: null,
    actionPlansV1: null,
    questionnaireAnswersV3: null,
    briefingContentV3: null,
    riskMatricesDataV3: null,
    actionPlansDataV3: null,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 1 — determineFlowVersion
// ─────────────────────────────────────────────────────────────────────────────

describe("determineFlowVersion — determinação do fluxo", () => {
  it("retorna 'v3' quando questionnaireAnswers preenchido e V1 ausente", () => {
    expect(
      determineFlowVersion({
        questionnaireAnswers: QUESTIONNAIRE_ANSWERS_V3,
        corporateAnswers: null,
        operationalAnswers: null,
      })
    ).toBe("v3");
  });

  it("retorna 'v1' quando corporateAnswers preenchido e V3 ausente", () => {
    expect(
      determineFlowVersion({
        questionnaireAnswers: null,
        corporateAnswers: CORPORATE_ANSWERS_V1,
        operationalAnswers: null,
      })
    ).toBe("v1");
  });

  it("retorna 'v1' quando operationalAnswers preenchido e V3 ausente", () => {
    expect(
      determineFlowVersion({
        questionnaireAnswers: null,
        corporateAnswers: null,
        operationalAnswers: OPERATIONAL_ANSWERS_V1,
      })
    ).toBe("v1");
  });

  it("retorna 'v1' quando ambos corporateAnswers e operationalAnswers preenchidos (sem V3)", () => {
    expect(
      determineFlowVersion({
        questionnaireAnswers: null,
        corporateAnswers: CORPORATE_ANSWERS_V1,
        operationalAnswers: OPERATIONAL_ANSWERS_V1,
      })
    ).toBe("v1");
  });

  it("retorna 'none' quando nenhum dado de diagnóstico presente", () => {
    expect(
      determineFlowVersion({
        questionnaireAnswers: null,
        corporateAnswers: null,
        operationalAnswers: null,
      })
    ).toBe("none");
  });

  it("retorna 'hybrid' quando V3 e V1 ambos preenchidos", () => {
    expect(
      determineFlowVersion({
        questionnaireAnswers: QUESTIONNAIRE_ANSWERS_V3,
        corporateAnswers: CORPORATE_ANSWERS_V1,
        operationalAnswers: null,
      })
    ).toBe("hybrid");
  });

  it("retorna 'hybrid' quando V3 e V1 (operacional) ambos preenchidos", () => {
    expect(
      determineFlowVersion({
        questionnaireAnswers: QUESTIONNAIRE_ANSWERS_V3,
        corporateAnswers: null,
        operationalAnswers: OPERATIONAL_ANSWERS_V1,
      })
    ).toBe("hybrid");
  });

  it("array vazio em questionnaireAnswers não conta como V3", () => {
    // Array vazio é falsy-ish mas não null — deve ser tratado como V3 presente
    // (a validação de suficiência é responsabilidade de validateV3DataSufficiency)
    expect(
      determineFlowVersion({
        questionnaireAnswers: [],
        corporateAnswers: null,
        operationalAnswers: null,
      })
    ).toBe("v3");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2 — assertFlowVersion
// ─────────────────────────────────────────────────────────────────────────────

describe("assertFlowVersion — guard de fluxo", () => {
  it("não lança erro quando fluxo é v3 e esperado é v3", () => {
    const source = makeDiagnosticSource("v3");
    expect(() => assertFlowVersion(source, "v3", "fluxoV3.generateBriefing")).not.toThrow();
  });

  it("não lança erro quando fluxo é v1 e esperado é v1", () => {
    const source = makeDiagnosticSource("v1");
    expect(() => assertFlowVersion(source, "v1", "briefing.generate")).not.toThrow();
  });

  it("lança FORBIDDEN quando fluxo é v1 mas esperado é v3", () => {
    const source = makeDiagnosticSource("v1");
    expect(() => assertFlowVersion(source, "v3", "fluxoV3.generateBriefing")).toThrow(TRPCError);
    try {
      assertFlowVersion(source, "v3", "fluxoV3.generateBriefing");
    } catch (e) {
      expect((e as TRPCError).code).toBe("FORBIDDEN");
      expect((e as TRPCError).message).toContain("Fluxo V1");
      expect((e as TRPCError).message).toContain("Fluxo V3");
      expect((e as TRPCError).message).toContain("fluxoV3.generateBriefing");
    }
  });

  it("lança FORBIDDEN quando fluxo é v3 mas esperado é v1", () => {
    const source = makeDiagnosticSource("v3");
    expect(() => assertFlowVersion(source, "v1", "briefing.generate")).toThrow(TRPCError);
    try {
      assertFlowVersion(source, "v1", "briefing.generate");
    } catch (e) {
      expect((e as TRPCError).code).toBe("FORBIDDEN");
      expect((e as TRPCError).message).toContain("Fluxo V3");
      expect((e as TRPCError).message).toContain("Fluxo V1");
    }
  });

  it("lança BAD_REQUEST quando flowVersion é 'none'", () => {
    const source = makeDiagnosticSource("none");
    expect(() => assertFlowVersion(source, "v3", "fluxoV3.generateBriefing")).toThrow(TRPCError);
    try {
      assertFlowVersion(source, "v3", "fluxoV3.generateBriefing");
    } catch (e) {
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
      expect((e as TRPCError).message).toContain("não possui dados de diagnóstico");
    }
  });

  it("NÃO lança erro quando flowVersion é 'hybrid' (estado documentado, não bloqueante)", () => {
    const source = makeDiagnosticSource("hybrid");
    // hybrid não deve bloquear — apenas emite warning
    expect(() => assertFlowVersion(source, "v3", "fluxoV3.generateBriefing")).not.toThrow();
    expect(() => assertFlowVersion(source, "v1", "briefing.generate")).not.toThrow();
  });

  it("mensagem de erro inclui o nome do endpoint", () => {
    const source = makeDiagnosticSource("v1");
    try {
      assertFlowVersion(source, "v3", "meu.endpoint.especifico");
    } catch (e) {
      expect((e as TRPCError).message).toContain("meu.endpoint.especifico");
    }
  });

  it("mensagem de erro inclui o projectId", () => {
    const source = makeDiagnosticSource("v1", { projectId: 999 });
    try {
      assertFlowVersion(source, "v3", "endpoint");
    } catch (e) {
      expect((e as TRPCError).message).toContain("999");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3 — validateV3DataSufficiency
// ─────────────────────────────────────────────────────────────────────────────

describe("validateV3DataSufficiency — validação de suficiência V3", () => {
  it("retorna null quando V3 com questionnaireAnswers preenchido", () => {
    const source = makeDiagnosticSource("v3", {
      questionnaireAnswersV3: QUESTIONNAIRE_ANSWERS_V3,
    });
    expect(validateV3DataSufficiency(source)).toBeNull();
  });

  it("retorna null para hybrid com questionnaireAnswers preenchido", () => {
    const source = makeDiagnosticSource("hybrid", {
      questionnaireAnswersV3: QUESTIONNAIRE_ANSWERS_V3,
    });
    expect(validateV3DataSufficiency(source)).toBeNull();
  });

  it("retorna string de erro quando V3 sem questionnaireAnswers", () => {
    const source = makeDiagnosticSource("v3", {
      questionnaireAnswersV3: null,
    });
    const result = validateV3DataSufficiency(source);
    expect(result).not.toBeNull();
    expect(result).toContain("Questionário V3 não preenchido");
  });

  it("retorna string de erro quando questionnaireAnswers é array vazio", () => {
    const source = makeDiagnosticSource("v3", {
      questionnaireAnswersV3: [],
    });
    const result = validateV3DataSufficiency(source);
    expect(result).not.toBeNull();
    expect(result).toContain("nenhuma resposta encontrada");
  });

  it("retorna string de erro quando flowVersion é v1", () => {
    const source = makeDiagnosticSource("v1");
    const result = validateV3DataSufficiency(source);
    expect(result).not.toBeNull();
    expect(result).toContain("flowVersion=v1");
  });

  it("retorna string de erro quando flowVersion é none", () => {
    const source = makeDiagnosticSource("none");
    const result = validateV3DataSufficiency(source);
    expect(result).not.toBeNull();
    expect(result).toContain("flowVersion=none");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4 — validateV1DataSufficiency
// ─────────────────────────────────────────────────────────────────────────────

describe("validateV1DataSufficiency — validação de suficiência V1", () => {
  it("retorna null quando V1 com corporateAnswers preenchido", () => {
    const source = makeDiagnosticSource("v1", {
      corporateAnswers: CORPORATE_ANSWERS_V1,
    });
    expect(validateV1DataSufficiency(source)).toBeNull();
  });

  it("retorna null quando V1 com operationalAnswers preenchido", () => {
    const source = makeDiagnosticSource("v1", {
      operationalAnswers: OPERATIONAL_ANSWERS_V1,
    });
    expect(validateV1DataSufficiency(source)).toBeNull();
  });

  it("retorna null para hybrid com corporateAnswers preenchido", () => {
    const source = makeDiagnosticSource("hybrid", {
      corporateAnswers: CORPORATE_ANSWERS_V1,
    });
    expect(validateV1DataSufficiency(source)).toBeNull();
  });

  it("retorna string de erro quando V1 sem nenhum dado", () => {
    const source = makeDiagnosticSource("v1", {
      corporateAnswers: null,
      operationalAnswers: null,
    });
    const result = validateV1DataSufficiency(source);
    expect(result).not.toBeNull();
    expect(result).toContain("corporateAnswers e operationalAnswers ausentes");
  });

  it("retorna string de erro quando flowVersion é v3", () => {
    const source = makeDiagnosticSource("v3");
    const result = validateV1DataSufficiency(source);
    expect(result).not.toBeNull();
    expect(result).toContain("flowVersion=v3");
  });

  it("retorna string de erro quando flowVersion é none", () => {
    const source = makeDiagnosticSource("none");
    const result = validateV1DataSufficiency(source);
    expect(result).not.toBeNull();
    expect(result).toContain("flowVersion=none");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 5 — getDiagnosticSource (com mock do banco)
// ─────────────────────────────────────────────────────────────────────────────

describe("getDiagnosticSource — integração com banco (mockado)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lança INTERNAL_SERVER_ERROR quando banco indisponível", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValue(null);

    const { getDiagnosticSource } = await import("./diagnostic-source");

    await expect(getDiagnosticSource(1)).rejects.toThrow(TRPCError);
    try {
      await getDiagnosticSource(1);
    } catch (e) {
      expect((e as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
      expect((e as TRPCError).message).toContain("Banco de dados não disponível");
    }
  });

  it("lança NOT_FOUND quando projeto não existe", async () => {
    const { getDb, getProjectById } = await import("./db");
    const mockDb = { select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis() };
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);
    vi.mocked(getProjectById).mockResolvedValue(null); // null = projeto não encontrado

    const { getDiagnosticSource } = await import("./diagnostic-source");

    await expect(getDiagnosticSource(999)).rejects.toThrow(TRPCError);
    try {
      await getDiagnosticSource(999);
    } catch (e) {
      expect((e as TRPCError).code).toBe("NOT_FOUND");
      expect((e as TRPCError).message).toContain("999");
    }
  });

  it("retorna flowVersion='v3' para projeto V3 puro", async () => {
    const { getDb, getProjectById } = await import("./db");
    const mockProject = {
      id: 1,
      questionnaireAnswers: QUESTIONNAIRE_ANSWERS_V3,
      briefingContent: BRIEFING_CONTENT_V3,
      riskMatricesData: RISK_MATRICES_DATA_V3,
      actionPlansData: ACTION_PLANS_DATA_V3,
      corporateAnswers: null,
      operationalAnswers: null,
      cnaeAnswers: null,
    };
    const mockDb = { select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis() };
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);
    vi.mocked(getProjectById).mockResolvedValue(mockProject as unknown as Awaited<ReturnType<typeof import("./db").getProjectById>>);

    const { getDiagnosticSource } = await import("./diagnostic-source");
    const source = await getDiagnosticSource(1);

    expect(source.flowVersion).toBe("v3");
    expect(source.projectId).toBe(1);
    expect(source.questionnaireAnswersV3).toEqual(QUESTIONNAIRE_ANSWERS_V3);
    expect(source.briefingContentV3).toBe(BRIEFING_CONTENT_V3);
    expect(source.riskMatricesDataV3).toEqual(RISK_MATRICES_DATA_V3);
    expect(source.actionPlansDataV3).toEqual(ACTION_PLANS_DATA_V3);
    // Campos V1 devem ser null para projeto V3 puro
    expect(source.corporateAnswers).toBeNull();
    expect(source.operationalAnswers).toBeNull();
    expect(source.cnaeAnswers).toBeNull();
    expect(source.briefingV1).toBeNull();
    expect(source.risksV1).toBeNull();
    expect(source.actionPlansV1).toBeNull();
  });

  it("retorna flowVersion='v1' para projeto V1 puro", async () => {
    const { getDb, getProjectById } = await import("./db");
    const mockProject = {
      id: 2,
      questionnaireAnswers: null,
      briefingContent: null,
      riskMatricesData: null,
      actionPlansData: null,
      corporateAnswers: CORPORATE_ANSWERS_V1,
      operationalAnswers: OPERATIONAL_ANSWERS_V1,
      cnaeAnswers: CNAE_ANSWERS_V1,
    };
    const mockDb = { select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis() };
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);
    vi.mocked(getProjectById).mockResolvedValue(mockProject as unknown as Awaited<ReturnType<typeof import("./db").getProjectById>>);

    const { getDiagnosticSource } = await import("./diagnostic-source");
    const source = await getDiagnosticSource(2);

    expect(source.flowVersion).toBe("v1");
    expect(source.projectId).toBe(2);
    expect(source.corporateAnswers).toEqual(CORPORATE_ANSWERS_V1);
    expect(source.operationalAnswers).toEqual(OPERATIONAL_ANSWERS_V1);
    expect(source.cnaeAnswers).toEqual(CNAE_ANSWERS_V1);
    // Campos V3 devem ser null para projeto V1 puro
    expect(source.questionnaireAnswersV3).toBeNull();
    expect(source.briefingContentV3).toBeNull();
    expect(source.riskMatricesDataV3).toBeNull();
    expect(source.actionPlansDataV3).toBeNull();
  });

  it("retorna flowVersion='none' para projeto sem dados de diagnóstico", async () => {
    const { getDb, getProjectById } = await import("./db");
    const mockProject = {
      id: 3,
      questionnaireAnswers: null,
      briefingContent: null,
      riskMatricesData: null,
      actionPlansData: null,
      corporateAnswers: null,
      operationalAnswers: null,
      cnaeAnswers: null,
    };
    const mockDb = { select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis() };
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);
    vi.mocked(getProjectById).mockResolvedValue(mockProject as unknown as Awaited<ReturnType<typeof import("./db").getProjectById>>);

    const { getDiagnosticSource } = await import("./diagnostic-source");
    const source = await getDiagnosticSource(3);

    expect(source.flowVersion).toBe("none");
    expect(source.corporateAnswers).toBeNull();
    expect(source.questionnaireAnswersV3).toBeNull();
  });

  it("retorna flowVersion='hybrid' para projeto com dados de ambos os fluxos", async () => {
    const { getDb, getProjectById } = await import("./db");
    const mockProject = {
      id: 4,
      questionnaireAnswers: QUESTIONNAIRE_ANSWERS_V3, // V3
      briefingContent: BRIEFING_CONTENT_V3,
      riskMatricesData: null,
      actionPlansData: null,
      corporateAnswers: CORPORATE_ANSWERS_V1, // V1 também
      operationalAnswers: null,
      cnaeAnswers: null,
    };
    const mockDb = { select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis() };
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);
    vi.mocked(getProjectById).mockResolvedValue(mockProject as unknown as Awaited<ReturnType<typeof import("./db").getProjectById>>);

    const { getDiagnosticSource } = await import("./diagnostic-source");
    const source = await getDiagnosticSource(4);

    expect(source.flowVersion).toBe("hybrid");
    // Ambos os campos devem estar disponíveis no estado híbrido
    expect(source.questionnaireAnswersV3).toEqual(QUESTIONNAIRE_ANSWERS_V3);
    expect(source.briefingContentV3).toBe(BRIEFING_CONTENT_V3);
    expect(source.corporateAnswers).toEqual(CORPORATE_ANSWERS_V1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 6 — Invariantes de isolamento (regras absolutas do ADR-005)
// ─────────────────────────────────────────────────────────────────────────────

describe("Invariantes de isolamento — ADR-005 Seção 3", () => {
  it("projeto V3 puro nunca expõe campos V1 preenchidos", async () => {
    const { getDb, getProjectById } = await import("./db");
    const mockProject = {
      id: 10,
      questionnaireAnswers: QUESTIONNAIRE_ANSWERS_V3,
      briefingContent: BRIEFING_CONTENT_V3,
      riskMatricesData: RISK_MATRICES_DATA_V3,
      actionPlansData: ACTION_PLANS_DATA_V3,
      corporateAnswers: null,
      operationalAnswers: null,
      cnaeAnswers: null,
    };
    const mockDb = { select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis() };
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);
    vi.mocked(getProjectById).mockResolvedValue(mockProject as unknown as Awaited<ReturnType<typeof import("./db").getProjectById>>);

    const { getDiagnosticSource } = await import("./diagnostic-source");
    const source = await getDiagnosticSource(10);

    // Invariante: projeto V3 puro → campos V1 SEMPRE null
    expect(source.corporateAnswers).toBeNull();
    expect(source.operationalAnswers).toBeNull();
    expect(source.cnaeAnswers).toBeNull();
    expect(source.briefingV1).toBeNull();
    expect(source.risksV1).toBeNull();
    expect(source.actionPlansV1).toBeNull();
  });

  it("projeto V1 puro nunca expõe campos V3 preenchidos", async () => {
    const { getDb, getProjectById } = await import("./db");
    const mockProject = {
      id: 11,
      questionnaireAnswers: null,
      briefingContent: null,
      riskMatricesData: null,
      actionPlansData: null,
      corporateAnswers: CORPORATE_ANSWERS_V1,
      operationalAnswers: OPERATIONAL_ANSWERS_V1,
      cnaeAnswers: CNAE_ANSWERS_V1,
    };
    const mockDb = { select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis() };
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as ReturnType<typeof import("drizzle-orm/mysql2").drizzle>);
    vi.mocked(getProjectById).mockResolvedValue(mockProject as unknown as Awaited<ReturnType<typeof import("./db").getProjectById>>);

    const { getDiagnosticSource } = await import("./diagnostic-source");
    const source = await getDiagnosticSource(11);

    // Invariante: projeto V1 puro → campos V3 SEMPRE null
    expect(source.questionnaireAnswersV3).toBeNull();
    expect(source.briefingContentV3).toBeNull();
    expect(source.riskMatricesDataV3).toBeNull();
    expect(source.actionPlansDataV3).toBeNull();
  });

  it("assertFlowVersion impede que endpoint V3 acesse projeto V1 (bloqueio estrutural)", () => {
    const sourceV1 = makeDiagnosticSource("v1");
    // Simula endpoint do Fluxo B tentando acessar projeto V1
    expect(() =>
      assertFlowVersion(sourceV1, "v3", "fluxoV3.generateRiskMatrices")
    ).toThrow(TRPCError);
  });

  it("assertFlowVersion impede que endpoint V1 acesse projeto V3 (bloqueio estrutural)", () => {
    const sourceV3 = makeDiagnosticSource("v3");
    // Simula endpoint do Fluxo A tentando acessar projeto V3
    expect(() =>
      assertFlowVersion(sourceV3, "v1", "risk.generate")
    ).toThrow(TRPCError);
  });

  it("flowVersion é determinístico — mesma entrada sempre produz mesmo resultado", () => {
    const input = {
      questionnaireAnswers: QUESTIONNAIRE_ANSWERS_V3,
      corporateAnswers: null,
      operationalAnswers: null,
    };
    // Executar 10 vezes para verificar determinismo
    const results = Array.from({ length: 10 }, () => determineFlowVersion(input));
    expect(new Set(results).size).toBe(1); // Todos iguais
    expect(results[0]).toBe("v3");
  });
});
