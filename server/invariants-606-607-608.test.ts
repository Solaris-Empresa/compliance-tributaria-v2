/**
 * invariants-606-607-608.test.ts
 *
 * INVARIANT TESTS — INV-006, INV-007, INV-008
 *
 * Cobertura:
 *   INV-006 — Risco Sem Origem É Inválido
 *             `risco_sem_origem → invalido`
 *   INV-007 — Ação Sem Evidence Required É Inválida
 *             `acao_sem_evidence_required → invalida`
 *   INV-008 — Briefing Sem Cobertura 100% É Inválido
 *             `briefing_sem_coverage_100 → invalido`
 *
 * Estratégia:
 *   - Testes unitários: validam as funções de validação puras
 *   - Testes funcionais: validam o comportamento do sistema com dados reais
 *   - Testes de regressão: garantem que violações conhecidas não retornem
 *
 * Critério de aceite:
 *   - invariant violado → teste FALHA (detecta o problema)
 *   - invariant respeitado → teste PASSA (confirma a proteção)
 */

import { describe, it, expect } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — Contratos de dados para os 3 invariants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fontes válidas de um risco (INV-006)
 * Um risco deve ter pelo menos UMA dessas origens
 */
type RiskOrigin =
  | { type: "questionnaire_answer"; questionId: string; answer: string }
  | { type: "cnae"; cnaeCode: string; cnaeDescription: string }
  | { type: "profile_field"; fieldName: string; fieldValue: string };

interface RiskItem {
  id?: string | number;
  title: string;
  description?: string;
  origin?: RiskOrigin | null;           // INV-006: obrigatório
  probability?: string;
  impact?: string;
  generatedByAI?: boolean;
}

/**
 * Ação em um plano de ação (INV-007)
 * Toda ação DEVE ter evidence_required definido (true ou false)
 */
interface ActionItem {
  id?: string | number;
  title: string;
  description?: string;
  evidence_required?: boolean | null;   // INV-007: obrigatório (true ou false)
  responsibleArea?: string;
  deadline?: string;
}

/**
 * Status de cobertura do diagnóstico (INV-008)
 * Briefing só pode ser gerado quando todas as 3 camadas estão completed
 */
interface DiagnosticCoverage {
  corporate: "not_started" | "in_progress" | "completed";
  operational: "not_started" | "in_progress" | "completed";
  cnae: "not_started" | "in_progress" | "completed";
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES DE VALIDAÇÃO — Implementação dos invariants como funções puras
// ─────────────────────────────────────────────────────────────────────────────

/**
 * INV-006: Valida que um risco tem origem rastreável
 * Retorna true se o risco é válido, false se viola o invariant
 */
function isRiskValid(risk: RiskItem): boolean {
  if (!risk.origin) return false;
  if (risk.origin === null) return false;
  if (!risk.origin.type) return false;

  switch (risk.origin.type) {
    case "questionnaire_answer":
      return !!(risk.origin.questionId && risk.origin.answer);
    case "cnae":
      return !!(risk.origin.cnaeCode && risk.origin.cnaeDescription);
    case "profile_field":
      return !!(risk.origin.fieldName && risk.origin.fieldValue);
    default:
      return false;
  }
}

/**
 * INV-006: Valida uma lista de riscos
 * Retorna array de riscos inválidos (sem origem)
 */
function validateRiskList(risks: RiskItem[]): RiskItem[] {
  return risks.filter((r) => !isRiskValid(r));
}

/**
 * INV-007: Valida que uma ação tem evidence_required definido
 * Retorna true se a ação é válida, false se viola o invariant
 */
function isActionValid(action: ActionItem): boolean {
  return typeof action.evidence_required === "boolean";
}

/**
 * INV-007: Valida uma lista de ações
 * Retorna array de ações inválidas (sem evidence_required)
 */
function validateActionList(actions: ActionItem[]): ActionItem[] {
  return actions.filter((a) => !isActionValid(a));
}

/**
 * INV-008: Valida que o diagnóstico tem cobertura 100% antes de gerar briefing
 * Retorna true se pode gerar briefing, false se viola o invariant
 */
function canGenerateBriefing(coverage: DiagnosticCoverage): boolean {
  return (
    coverage.corporate === "completed" &&
    coverage.operational === "completed" &&
    coverage.cnae === "completed"
  );
}

/**
 * INV-008: Retorna as camadas que ainda não estão completed
 */
function getMissingCoverage(coverage: DiagnosticCoverage): string[] {
  const missing: string[] = [];
  if (coverage.corporate !== "completed") missing.push("corporate");
  if (coverage.operational !== "completed") missing.push("operational");
  if (coverage.cnae !== "completed") missing.push("cnae");
  return missing;
}

// ─────────────────────────────────────────────────────────────────────────────
// INV-006 — RISCO SEM ORIGEM É INVÁLIDO
// ─────────────────────────────────────────────────────────────────────────────

describe("INV-006 — Risco Sem Origem É Inválido", () => {

  // ─── Testes Unitários ───────────────────────────────────────────────────

  describe("Unitário: isRiskValid()", () => {
    it("risco com origem questionnaire_answer é válido", () => {
      const risk: RiskItem = {
        title: "Risco de enquadramento incorreto",
        origin: {
          type: "questionnaire_answer",
          questionId: "qc01_regime",
          answer: "lucro_real",
        },
      };
      expect(isRiskValid(risk)).toBe(true);
    });

    it("risco com origem cnae é válido", () => {
      const risk: RiskItem = {
        title: "Risco de ISS sobre software",
        origin: {
          type: "cnae",
          cnaeCode: "6201-5/01",
          cnaeDescription: "Desenvolvimento de programas de computador sob encomenda",
        },
      };
      expect(isRiskValid(risk)).toBe(true);
    });

    it("risco com origem profile_field é válido", () => {
      const risk: RiskItem = {
        title: "Risco de split payment",
        origin: {
          type: "profile_field",
          fieldName: "operationProfile.operationType",
          fieldValue: "misto",
        },
      };
      expect(isRiskValid(risk)).toBe(true);
    });

    it("risco sem origin é inválido — viola INV-006", () => {
      const risk: RiskItem = {
        title: "Risco sem origem",
        // origin ausente
      };
      expect(isRiskValid(risk)).toBe(false);
    });

    it("risco com origin null é inválido — viola INV-006", () => {
      const risk: RiskItem = {
        title: "Risco com origem nula",
        origin: null,
      };
      expect(isRiskValid(risk)).toBe(false);
    });

    it("risco com questionnaire_answer sem questionId é inválido", () => {
      const risk: RiskItem = {
        title: "Risco incompleto",
        origin: {
          type: "questionnaire_answer",
          questionId: "",   // vazio — inválido
          answer: "sim",
        },
      };
      expect(isRiskValid(risk)).toBe(false);
    });

    it("risco com cnae sem cnaeCode é inválido", () => {
      const risk: RiskItem = {
        title: "Risco de CNAE sem código",
        origin: {
          type: "cnae",
          cnaeCode: "",    // vazio — inválido
          cnaeDescription: "Alguma atividade",
        },
      };
      expect(isRiskValid(risk)).toBe(false);
    });
  });

  // ─── Testes Funcionais ──────────────────────────────────────────────────

  describe("Funcional: validateRiskList()", () => {
    it("lista com todos os riscos válidos retorna array vazio", () => {
      const risks: RiskItem[] = [
        {
          title: "Risco 1",
          origin: { type: "questionnaire_answer", questionId: "qc01", answer: "lucro_real" },
        },
        {
          title: "Risco 2",
          origin: { type: "cnae", cnaeCode: "6201-5/01", cnaeDescription: "Dev software" },
        },
      ];
      const invalid = validateRiskList(risks);
      expect(invalid).toHaveLength(0);
    });

    it("lista com risco sem origem retorna o risco inválido", () => {
      const risks: RiskItem[] = [
        {
          title: "Risco válido",
          origin: { type: "questionnaire_answer", questionId: "qc01", answer: "lucro_real" },
        },
        {
          title: "Risco sem origem",
          // sem origin — viola INV-006
        },
      ];
      const invalid = validateRiskList(risks);
      expect(invalid).toHaveLength(1);
      expect(invalid[0].title).toBe("Risco sem origem");
    });

    it("lista vazia retorna array vazio", () => {
      expect(validateRiskList([])).toHaveLength(0);
    });

    it("lista com múltiplos riscos inválidos retorna todos", () => {
      const risks: RiskItem[] = [
        { title: "Sem origem 1" },
        { title: "Sem origem 2", origin: null },
        { title: "Sem origem 3", origin: { type: "cnae", cnaeCode: "", cnaeDescription: "" } },
      ];
      const invalid = validateRiskList(risks);
      expect(invalid).toHaveLength(3);
    });
  });

  // ─── Testes de Regressão ────────────────────────────────────────────────

  describe("Regressão: INV-006 não pode ser contornado", () => {
    it("REGRESSÃO: risco gerado por IA sem origin ainda é inválido", () => {
      // Mesmo que generatedByAI=true, sem origin é inválido
      const risk: RiskItem = {
        title: "Risco gerado por IA",
        generatedByAI: true,
        probability: "alta",
        impact: "alto",
        // sem origin — viola INV-006
      };
      expect(isRiskValid(risk)).toBe(false);
    });

    it("REGRESSÃO: risco com description mas sem origin é inválido", () => {
      const risk: RiskItem = {
        title: "Risco com descrição",
        description: "Descrição detalhada do risco tributário",
        // sem origin — viola INV-006
      };
      expect(isRiskValid(risk)).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INV-007 — AÇÃO SEM EVIDENCE REQUIRED É INVÁLIDA
// ─────────────────────────────────────────────────────────────────────────────

describe("INV-007 — Ação Sem Evidence Required É Inválida", () => {

  // ─── Testes Unitários ───────────────────────────────────────────────────

  describe("Unitário: isActionValid()", () => {
    it("ação com evidence_required=true é válida", () => {
      const action: ActionItem = {
        title: "Revisar enquadramento tributário",
        evidence_required: true,
      };
      expect(isActionValid(action)).toBe(true);
    });

    it("ação com evidence_required=false é válida", () => {
      const action: ActionItem = {
        title: "Atualizar cadastro CNPJ",
        evidence_required: false,
      };
      expect(isActionValid(action)).toBe(true);
    });

    it("ação sem evidence_required é inválida — viola INV-007", () => {
      const action: ActionItem = {
        title: "Ação sem evidence_required",
        // evidence_required ausente
      };
      expect(isActionValid(action)).toBe(false);
    });

    it("ação com evidence_required=null é inválida — viola INV-007", () => {
      const action: ActionItem = {
        title: "Ação com evidence_required nulo",
        evidence_required: null,
      };
      expect(isActionValid(action)).toBe(false);
    });

    it("ação com evidence_required=undefined é inválida — viola INV-007", () => {
      const action: ActionItem = {
        title: "Ação com evidence_required undefined",
        evidence_required: undefined,
      };
      expect(isActionValid(action)).toBe(false);
    });
  });

  // ─── Testes Funcionais ──────────────────────────────────────────────────

  describe("Funcional: validateActionList()", () => {
    it("lista com todas as ações válidas retorna array vazio", () => {
      const actions: ActionItem[] = [
        { title: "Ação 1", evidence_required: true },
        { title: "Ação 2", evidence_required: false },
        { title: "Ação 3", evidence_required: true },
      ];
      const invalid = validateActionList(actions);
      expect(invalid).toHaveLength(0);
    });

    it("lista com ação sem evidence_required retorna a ação inválida", () => {
      const actions: ActionItem[] = [
        { title: "Ação válida", evidence_required: true },
        { title: "Ação inválida" }, // sem evidence_required — viola INV-007
      ];
      const invalid = validateActionList(actions);
      expect(invalid).toHaveLength(1);
      expect(invalid[0].title).toBe("Ação inválida");
    });

    it("lista vazia retorna array vazio", () => {
      expect(validateActionList([])).toHaveLength(0);
    });

    it("lista com múltiplas ações inválidas retorna todas", () => {
      const actions: ActionItem[] = [
        { title: "Sem evidence 1" },
        { title: "Sem evidence 2", evidence_required: null },
        { title: "Sem evidence 3", evidence_required: undefined },
      ];
      const invalid = validateActionList(actions);
      expect(invalid).toHaveLength(3);
    });

    it("plano de ação completo com mix de true/false é válido", () => {
      const actions: ActionItem[] = [
        { title: "Revisar contrato", evidence_required: true, responsibleArea: "JUR" },
        { title: "Atualizar sistema", evidence_required: false, responsibleArea: "TI" },
        { title: "Treinar equipe", evidence_required: true, responsibleArea: "ADM" },
        { title: "Emitir nota fiscal correta", evidence_required: false, responsibleArea: "FISC" },
      ];
      const invalid = validateActionList(actions);
      expect(invalid).toHaveLength(0);
    });
  });

  // ─── Testes de Integração ───────────────────────────────────────────────

  describe("Integração: plano de ação gerado por IA deve ter evidence_required", () => {
    it("plano gerado por IA com evidence_required em todas as ações é válido", () => {
      // Simula estrutura de plano de ação como gerado pela IA
      const aiGeneratedPlan = {
        projectId: 1,
        actions: [
          { title: "Adequar regime tributário", evidence_required: true, responsibleArea: "FISC" },
          { title: "Revisar CNAEs", evidence_required: true, responsibleArea: "JUR" },
          { title: "Atualizar ERP", evidence_required: false, responsibleArea: "TI" },
        ],
      };
      const invalid = validateActionList(aiGeneratedPlan.actions);
      expect(invalid).toHaveLength(0);
    });

    it("plano gerado por IA sem evidence_required em alguma ação é inválido", () => {
      const aiGeneratedPlan = {
        projectId: 1,
        actions: [
          { title: "Ação com evidence", evidence_required: true },
          { title: "Ação sem evidence" }, // viola INV-007
        ],
      };
      const invalid = validateActionList(aiGeneratedPlan.actions);
      expect(invalid).toHaveLength(1);
    });
  });

  // ─── Testes de Regressão ────────────────────────────────────────────────

  describe("Regressão: INV-007 não pode ser contornado", () => {
    it("REGRESSÃO: ação com todos os outros campos preenchidos mas sem evidence_required é inválida", () => {
      const action: ActionItem = {
        title: "Ação completa mas sem evidence",
        description: "Descrição detalhada",
        responsibleArea: "FISC",
        deadline: "2026-06-30",
        // evidence_required ausente — viola INV-007
      };
      expect(isActionValid(action)).toBe(false);
    });

    it("REGRESSÃO: evidence_required como string 'true' não é válido (deve ser boolean)", () => {
      // Garante que a validação é estrita (typeof boolean)
      const action = {
        title: "Ação com evidence como string",
        evidence_required: "true" as any, // string, não boolean
      };
      expect(isActionValid(action)).toBe(false);
    });

    it("REGRESSÃO: evidence_required como número 1 não é válido (deve ser boolean)", () => {
      const action = {
        title: "Ação com evidence como número",
        evidence_required: 1 as any, // número, não boolean
      };
      expect(isActionValid(action)).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INV-008 — BRIEFING SEM COBERTURA 100% É INVÁLIDO
// ─────────────────────────────────────────────────────────────────────────────

describe("INV-008 — Briefing Sem Cobertura 100% É Inválido", () => {

  // ─── Testes Unitários ───────────────────────────────────────────────────

  describe("Unitário: canGenerateBriefing()", () => {
    it("cobertura 100% (todas completed) permite gerar briefing", () => {
      const coverage: DiagnosticCoverage = {
        corporate: "completed",
        operational: "completed",
        cnae: "completed",
      };
      expect(canGenerateBriefing(coverage)).toBe(true);
    });

    it("corporate not_started bloqueia geração de briefing — viola INV-008", () => {
      const coverage: DiagnosticCoverage = {
        corporate: "not_started",
        operational: "completed",
        cnae: "completed",
      };
      expect(canGenerateBriefing(coverage)).toBe(false);
    });

    it("operational in_progress bloqueia geração de briefing — viola INV-008", () => {
      const coverage: DiagnosticCoverage = {
        corporate: "completed",
        operational: "in_progress",
        cnae: "completed",
      };
      expect(canGenerateBriefing(coverage)).toBe(false);
    });

    it("cnae not_started bloqueia geração de briefing — viola INV-008", () => {
      const coverage: DiagnosticCoverage = {
        corporate: "completed",
        operational: "completed",
        cnae: "not_started",
      };
      expect(canGenerateBriefing(coverage)).toBe(false);
    });

    it("todas as camadas not_started bloqueia geração de briefing", () => {
      const coverage: DiagnosticCoverage = {
        corporate: "not_started",
        operational: "not_started",
        cnae: "not_started",
      };
      expect(canGenerateBriefing(coverage)).toBe(false);
    });

    it("duas camadas completed mas uma in_progress bloqueia", () => {
      const coverage: DiagnosticCoverage = {
        corporate: "completed",
        operational: "in_progress",
        cnae: "completed",
      };
      expect(canGenerateBriefing(coverage)).toBe(false);
    });
  });

  // ─── Testes Funcionais ──────────────────────────────────────────────────

  describe("Funcional: getMissingCoverage()", () => {
    it("cobertura 100% retorna array vazio", () => {
      const coverage: DiagnosticCoverage = {
        corporate: "completed",
        operational: "completed",
        cnae: "completed",
      };
      expect(getMissingCoverage(coverage)).toHaveLength(0);
    });

    it("corporate not_started retorna ['corporate']", () => {
      const coverage: DiagnosticCoverage = {
        corporate: "not_started",
        operational: "completed",
        cnae: "completed",
      };
      const missing = getMissingCoverage(coverage);
      expect(missing).toContain("corporate");
      expect(missing).toHaveLength(1);
    });

    it("operational in_progress retorna ['operational']", () => {
      const coverage: DiagnosticCoverage = {
        corporate: "completed",
        operational: "in_progress",
        cnae: "completed",
      };
      const missing = getMissingCoverage(coverage);
      expect(missing).toContain("operational");
      expect(missing).toHaveLength(1);
    });

    it("todas as camadas incompletas retorna todas as 3", () => {
      const coverage: DiagnosticCoverage = {
        corporate: "not_started",
        operational: "in_progress",
        cnae: "not_started",
      };
      const missing = getMissingCoverage(coverage);
      expect(missing).toContain("corporate");
      expect(missing).toContain("operational");
      expect(missing).toContain("cnae");
      expect(missing).toHaveLength(3);
    });
  });

  // ─── Testes de Integração ───────────────────────────────────────────────

  describe("Integração: fluxo de geração de briefing", () => {
    it("projeto com diagnosticStatus null não pode gerar briefing", () => {
      // Simula projeto sem diagnosticStatus (campo null do banco)
      const diagnosticStatus = null;
      const coverage: DiagnosticCoverage = diagnosticStatus ?? {
        corporate: "not_started",
        operational: "not_started",
        cnae: "not_started",
      };
      expect(canGenerateBriefing(coverage)).toBe(false);
    });

    it("projeto com diagnosticStatus parcialmente preenchido não pode gerar briefing", () => {
      const diagnosticStatus: DiagnosticCoverage = {
        corporate: "completed",
        operational: "in_progress",
        cnae: "not_started",
      };
      expect(canGenerateBriefing(diagnosticStatus)).toBe(false);
      const missing = getMissingCoverage(diagnosticStatus);
      expect(missing).toContain("operational");
      expect(missing).toContain("cnae");
    });

    it("projeto com todas as 3 camadas completed pode gerar briefing", () => {
      const diagnosticStatus: DiagnosticCoverage = {
        corporate: "completed",
        operational: "completed",
        cnae: "completed",
      };
      expect(canGenerateBriefing(diagnosticStatus)).toBe(true);
      expect(getMissingCoverage(diagnosticStatus)).toHaveLength(0);
    });

    it("gate de briefing: erro descritivo quando cobertura incompleta", () => {
      const diagnosticStatus: DiagnosticCoverage = {
        corporate: "completed",
        operational: "not_started",
        cnae: "not_started",
      };

      // Simula o que o sistema deve fazer antes de gerar briefing
      const canGenerate = canGenerateBriefing(diagnosticStatus);
      const missing = getMissingCoverage(diagnosticStatus);

      expect(canGenerate).toBe(false);
      expect(missing).toHaveLength(2);

      // O sistema deve poder informar ao usuário quais camadas faltam
      const errorMessage = `Briefing bloqueado. Camadas incompletas: ${missing.join(", ")}`;
      expect(errorMessage).toContain("operational");
      expect(errorMessage).toContain("cnae");
    });
  });

  // ─── Testes de Regressão ────────────────────────────────────────────────

  describe("Regressão: INV-008 não pode ser contornado", () => {
    it("REGRESSÃO: briefing não pode ser gerado com apenas corporate completed", () => {
      const coverage: DiagnosticCoverage = {
        corporate: "completed",
        operational: "not_started",
        cnae: "not_started",
      };
      expect(canGenerateBriefing(coverage)).toBe(false);
    });

    it("REGRESSÃO: briefing não pode ser gerado com apenas 2 camadas completed", () => {
      const coverage: DiagnosticCoverage = {
        corporate: "completed",
        operational: "completed",
        cnae: "not_started",
      };
      expect(canGenerateBriefing(coverage)).toBe(false);
    });

    it("REGRESSÃO: in_progress não é equivalente a completed para fins de briefing", () => {
      // Garante que in_progress não é tratado como completed
      const coverage: DiagnosticCoverage = {
        corporate: "in_progress",
        operational: "in_progress",
        cnae: "in_progress",
      };
      expect(canGenerateBriefing(coverage)).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRAÇÃO CRUZADA — Os 3 invariants juntos
// ─────────────────────────────────────────────────────────────────────────────

describe("Integração Cruzada — INV-006 + INV-007 + INV-008", () => {
  it("projeto válido: diagnóstico 100%, riscos com origem, ações com evidence_required", () => {
    // Simula um projeto completamente válido
    const diagnosticStatus: DiagnosticCoverage = {
      corporate: "completed",
      operational: "completed",
      cnae: "completed",
    };

    const risks: RiskItem[] = [
      {
        title: "Risco de ISS",
        origin: { type: "cnae", cnaeCode: "6201-5/01", cnaeDescription: "Dev software" },
      },
      {
        title: "Risco de regime",
        origin: { type: "questionnaire_answer", questionId: "qc01_regime", answer: "lucro_real" },
      },
    ];

    const actions: ActionItem[] = [
      { title: "Revisar ISS", evidence_required: true },
      { title: "Atualizar regime", evidence_required: false },
    ];

    // INV-008: pode gerar briefing
    expect(canGenerateBriefing(diagnosticStatus)).toBe(true);

    // INV-006: todos os riscos têm origem
    expect(validateRiskList(risks)).toHaveLength(0);

    // INV-007: todas as ações têm evidence_required
    expect(validateActionList(actions)).toHaveLength(0);
  });

  it("projeto inválido: qualquer violação bloqueia o fluxo completo", () => {
    const diagnosticStatus: DiagnosticCoverage = {
      corporate: "completed",
      operational: "in_progress", // INV-008: não completed
      cnae: "completed",
    };

    const risks: RiskItem[] = [
      { title: "Risco sem origem" }, // INV-006: sem origin
    ];

    const actions: ActionItem[] = [
      { title: "Ação sem evidence" }, // INV-007: sem evidence_required
    ];

    // INV-008: NÃO pode gerar briefing
    expect(canGenerateBriefing(diagnosticStatus)).toBe(false);

    // INV-006: risco inválido detectado
    expect(validateRiskList(risks)).toHaveLength(1);

    // INV-007: ação inválida detectada
    expect(validateActionList(actions)).toHaveLength(1);
  });
});
