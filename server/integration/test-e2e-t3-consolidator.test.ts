/**
 * IA SOLARIS — Teste E2E T3: Diagnostic Consolidator v2.1
 * ─────────────────────────────────────────────────────────────────────────────
 * Prova ponta a ponta:
 * 1. consolidateDiagnosticLayers() gera payload correto para generateBriefing
 * 2. isDiagnosticComplete() valida o GATE corretamente
 * 3. getNextDiagnosticLayer() retorna a camada correta
 * 4. getDiagnosticProgress() calcula o progresso corretamente
 * 5. Regras de progressão (corporate → operational → cnae)
 * 6. Payload consolidado é compatível com o formato allAnswers[] do generateBriefing
 */

import { describe, it, expect } from "vitest";
import {
  consolidateDiagnosticLayers,
  isDiagnosticComplete,
  getNextDiagnosticLayer,
  getDiagnosticProgress,
  type DiagnosticStatus,
} from "../diagnostic-consolidator";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const mockCompanyProfile = {
  cnpj: "11222333000181",
  companyType: "ltda",
  companySize: "media",
  taxRegime: "lucro_presumido",
  annualRevenueRange: "4_8m_78m",
  stateUF: "SP",
  employeeCount: "51-200",
};

const mockOperationProfile = {
  operationType: "misto",
  clientType: ["B2B", "B2C"],
  multiState: true,
  geographicScope: "nacional",
};

const mockTaxComplexity = {
  hasInternationalOps: false,
  usesTaxIncentives: true,
  hasImportExport: false,
  usesMarketplace: true,
  hasMultipleEstablishments: true,
};

const mockFinancialProfile = {
  paymentMethods: ["pix", "cartao_credito", "boleto"],
  hasIntermediaries: true,
};

const mockGovernanceProfile = {
  hasTaxTeam: true,
  hasAudit: false,
  hasTaxIssues: false,
};

const mockCnaeAnswers = [
  {
    cnaeCode: "6201-5/01",
    cnaeDescription: "Desenvolvimento de programas de computador sob encomenda",
    level: "nivel1",
    questions: [
      { question: "Qual é o principal serviço prestado?", answer: "Desenvolvimento de software sob encomenda" },
      { question: "A empresa emite NFS-e?", answer: "Sim, para todos os clientes" },
    ],
  },
  {
    cnaeCode: "6201-5/01",
    cnaeDescription: "Desenvolvimento de programas de computador sob encomenda",
    level: "nivel2",
    questions: [
      { question: "Como é feita a apuração do ISS?", answer: "Mensalmente via PGDAS" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TESTES DO CONSOLIDADOR
// ─────────────────────────────────────────────────────────────────────────────

describe("T3 — Diagnostic Consolidator", () => {

  it("1. consolidateDiagnosticLayers() gera camada CORPORATIVO com dados corretos", () => {
    const layers = consolidateDiagnosticLayers({
      companyProfile: mockCompanyProfile,
      operationProfile: mockOperationProfile,
    });

    const corporate = layers.find(l => l.cnaeCode === "CORPORATIVO");
    expect(corporate).toBeDefined();
    expect(corporate!.cnaeDescription).toBe("Diagnóstico Corporativo — Perfil da Empresa");
    expect(corporate!.level).toBe("diagnostico_corporativo");

    // Verificar que os dados foram mapeados para labels legíveis
    const taxRegimeQ = corporate!.questions.find(q => q.question.includes("regime tributário"));
    expect(taxRegimeQ).toBeDefined();
    expect(taxRegimeQ!.answer).toBe("Lucro Presumido");

    const companySizeQ = corporate!.questions.find(q => q.question.includes("porte"));
    expect(companySizeQ).toBeDefined();
    expect(companySizeQ!.answer).toBe("Média Empresa");

    const companyTypeQ = corporate!.questions.find(q => q.question.includes("tipo jurídico"));
    expect(companyTypeQ).toBeDefined();
    expect(companyTypeQ!.answer).toBe("Sociedade Limitada (LTDA)");
  });

  it("2. consolidateDiagnosticLayers() gera camada OPERACIONAL com dados corretos", () => {
    const layers = consolidateDiagnosticLayers({
      companyProfile: mockCompanyProfile,
      operationProfile: mockOperationProfile,
    });

    const operational = layers.find(l => l.cnaeCode === "OPERACIONAL");
    expect(operational).toBeDefined();
    expect(operational!.level).toBe("diagnostico_operacional");

    const operationTypeQ = operational!.questions.find(q => q.question.includes("tipo de operação"));
    expect(operationTypeQ).toBeDefined();
    expect(operationTypeQ!.answer).toBe("Misto (Produtos e Serviços)");

    const multiStateQ = operational!.questions.find(q => q.question.includes("múltiplos estados"));
    expect(multiStateQ).toBeDefined();
    expect(multiStateQ!.answer).toBe("Sim");
  });

  it("3. consolidateDiagnosticLayers() inclui dados de taxComplexity e financialProfile", () => {
    const layers = consolidateDiagnosticLayers({
      companyProfile: mockCompanyProfile,
      operationProfile: mockOperationProfile,
      taxComplexity: mockTaxComplexity,
      financialProfile: mockFinancialProfile,
      governanceProfile: mockGovernanceProfile,
    });

    const corporate = layers.find(l => l.cnaeCode === "CORPORATIVO");
    const operational = layers.find(l => l.cnaeCode === "OPERACIONAL");

    // Governança vai para o corporativo
    const taxTeamQ = corporate!.questions.find(q => q.question.includes("equipe interna"));
    expect(taxTeamQ).toBeDefined();
    expect(taxTeamQ!.answer).toBe("Sim");

    // Marketplace vai para o operacional
    const marketplaceQ = operational!.questions.find(q => q.question.includes("marketplace"));
    expect(marketplaceQ).toBeDefined();
    expect(marketplaceQ!.answer).toBe("Sim");

    // Métodos de pagamento
    const paymentQ = operational!.questions.find(q => q.question.includes("métodos de pagamento"));
    expect(paymentQ).toBeDefined();
    expect(paymentQ!.answer).toContain("pix");
  });

  it("4. consolidateDiagnosticLayers() inclui respostas CNAE como 3ª camada", () => {
    const layers = consolidateDiagnosticLayers({
      companyProfile: mockCompanyProfile,
      operationProfile: mockOperationProfile,
      cnaeAnswers: mockCnaeAnswers,
    });

    expect(layers.length).toBe(4); // CORPORATIVO + OPERACIONAL + 2 CNAE layers
    const cnaeLayers = layers.filter(l => l.cnaeCode === "6201-5/01");
    expect(cnaeLayers.length).toBe(2); // nivel1 e nivel2
  });

  it("5. Payload consolidado é compatível com o formato allAnswers[] do generateBriefing", () => {
    const layers = consolidateDiagnosticLayers({
      companyProfile: mockCompanyProfile,
      operationProfile: mockOperationProfile,
      cnaeAnswers: mockCnaeAnswers,
    });

    // Verificar que cada layer tem a estrutura exata que o generateBriefing espera
    for (const layer of layers) {
      expect(layer).toHaveProperty("cnaeCode");
      expect(layer).toHaveProperty("cnaeDescription");
      expect(layer).toHaveProperty("level");
      expect(layer).toHaveProperty("questions");
      expect(Array.isArray(layer.questions)).toBe(true);
      for (const q of layer.questions) {
        expect(q).toHaveProperty("question");
        expect(q).toHaveProperty("answer");
        expect(typeof q.question).toBe("string");
        expect(typeof q.answer).toBe("string");
      }
    }
  });

  it("6. consolidateDiagnosticLayers() funciona sem dados opcionais (mínimo viável)", () => {
    const layers = consolidateDiagnosticLayers({
      companyProfile: { companyType: "ltda", taxRegime: "simples_nacional" },
      operationProfile: { operationType: "servico" },
    });

    expect(layers.length).toBe(2); // Apenas CORPORATIVO e OPERACIONAL
    expect(layers[0].cnaeCode).toBe("CORPORATIVO");
    expect(layers[1].cnaeCode).toBe("OPERACIONAL");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES DA MÁQUINA DE ESTADOS
// ─────────────────────────────────────────────────────────────────────────────

describe("T3 — Máquina de Estados do Diagnóstico", () => {

  it("7. isDiagnosticComplete() retorna false quando nenhuma camada está completa", () => {
    const status: DiagnosticStatus = {
      corporate: "not_started",
      operational: "not_started",
      cnae: "not_started",
    };
    expect(isDiagnosticComplete(status)).toBe(false);
  });

  it("8. isDiagnosticComplete() retorna false quando apenas 2 camadas estão completas", () => {
    const status: DiagnosticStatus = {
      corporate: "completed",
      operational: "completed",
      cnae: "in_progress",
    };
    expect(isDiagnosticComplete(status)).toBe(false);
  });

  it("9. isDiagnosticComplete() retorna true quando todas as 3 camadas estão completas", () => {
    const status: DiagnosticStatus = {
      corporate: "completed",
      operational: "completed",
      cnae: "completed",
    };
    expect(isDiagnosticComplete(status)).toBe(true);
  });

  it("10. getNextDiagnosticLayer() retorna 'corporate' quando nenhuma camada foi iniciada", () => {
    const status: DiagnosticStatus = {
      corporate: "not_started",
      operational: "not_started",
      cnae: "not_started",
    };
    expect(getNextDiagnosticLayer(status)).toBe("corporate");
  });

  it("11. getNextDiagnosticLayer() retorna 'operational' após corporate completed", () => {
    const status: DiagnosticStatus = {
      corporate: "completed",
      operational: "not_started",
      cnae: "not_started",
    };
    expect(getNextDiagnosticLayer(status)).toBe("operational");
  });

  it("12. getNextDiagnosticLayer() retorna 'cnae' após corporate e operational completed", () => {
    const status: DiagnosticStatus = {
      corporate: "completed",
      operational: "completed",
      cnae: "not_started",
    };
    expect(getNextDiagnosticLayer(status)).toBe("cnae");
  });

  it("13. getNextDiagnosticLayer() retorna null quando todas as camadas estão completas", () => {
    const status: DiagnosticStatus = {
      corporate: "completed",
      operational: "completed",
      cnae: "completed",
    };
    expect(getNextDiagnosticLayer(status)).toBeNull();
  });

  it("14. getDiagnosticProgress() retorna 0 quando nenhuma camada foi iniciada", () => {
    const status: DiagnosticStatus = {
      corporate: "not_started",
      operational: "not_started",
      cnae: "not_started",
    };
    expect(getDiagnosticProgress(status)).toBe(0);
  });

  it("15. getDiagnosticProgress() retorna ~33 quando corporate está in_progress", () => {
    const status: DiagnosticStatus = {
      corporate: "in_progress",
      operational: "not_started",
      cnae: "not_started",
    };
    const progress = getDiagnosticProgress(status);
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(50);
  });

  it("16. getDiagnosticProgress() retorna 100 quando todas as camadas estão completas", () => {
    const status: DiagnosticStatus = {
      corporate: "completed",
      operational: "completed",
      cnae: "completed",
    };
    expect(getDiagnosticProgress(status)).toBe(100);
  });
});
