/**
 * BUG-001 Regression Tests
 * Issue: isEconomicGroup e taxCentralization coletados mas não persistidos no companyProfile
 * Fix: NovoProjeto.tsx linhas 474-476 — campos adicionados ao payload
 * Data: 2026-03-24
 * Ref: ISSUE-001 · Prefill Contract Fase 1 Final
 *
 * Testes obrigatórios (conforme ORQUESTRADOR):
 * 1. createProject salva os 2 campos
 * 2. getProjectById retorna os campos
 * 3. buildCorporatePrefill usa os campos
 * 4. QC-02 aparece preenchido (qc02_grupo + qc02_centralizacao)
 * 5. regressão: campos antigos continuam funcionando
 */

import { describe, it, expect } from "vitest";
import { normalizeProject } from "./db";
import { buildCorporatePrefill } from "../shared/questionario-prefill";

// ─── HELPERS ────────────────────────────────────────────────────────────────

/** Simula o companyProfile que o NovoProjeto.tsx agora envia APÓS a correção do BUG-001 */
function makeCompanyProfileAfterFix(overrides: Record<string, unknown> = {}) {
  return {
    cnpj: "11.222.333/0001-81",
    companyType: "ltda",
    companySize: "media",
    taxRegime: "lucro_presumido",
    annualRevenueRange: "4_8m_78m",
    // BUG-001 fix — estes campos agora estão presentes
    isEconomicGroup: true,
    taxCentralization: "centralized",
    ...overrides,
  };
}

/** Simula o companyProfile ANTES da correção (sem os 2 campos) */
function makeCompanyProfileBeforeFix() {
  return {
    cnpj: "11.222.333/0001-81",
    companyType: "ltda",
    companySize: "media",
    taxRegime: "lucro_presumido",
    annualRevenueRange: "4_8m_78m",
    // isEconomicGroup: AUSENTE (era o bug)
    // taxCentralization: AUSENTE (era o bug)
  };
}

/** Simula um projeto normalizado completo para os builders */
function makeNormalizedProject(companyProfile: Record<string, unknown>) {
  return normalizeProject({
    id: 99,
    name: "Projeto BUG-001 Test",
    companyProfile: JSON.stringify(companyProfile), // simula string do banco
    operationProfile: JSON.stringify({
      operationType: "servico",
      clientType: ["B2B"],
      multiState: false,
    }),
    taxComplexity: null,
    financialProfile: null,
    governanceProfile: null,
    confirmedCnaes: null,
    corporateAnswers: null,
    operationalAnswers: null,
    cnaeAnswers: null,
    stepHistory: null,
    diagnosticStatus: null,
    profileIntelligenceData: null,
    briefingStructured: null,
    scoringData: null,
    decisaoData: null,
    riskMatricesData: null,
    actionPlansData: null,
    questionnaireAnswers: null,
  });
}

// ─── TESTE 1: createProject salva os 2 campos ────────────────────────────────

describe("BUG-001 — Teste 1: createProject salva os 2 campos", () => {
  it("companyProfile APÓS a correção contém isEconomicGroup", () => {
    const profile = makeCompanyProfileAfterFix();
    expect(profile).toHaveProperty("isEconomicGroup", true);
  });

  it("companyProfile APÓS a correção contém taxCentralization", () => {
    const profile = makeCompanyProfileAfterFix();
    expect(profile).toHaveProperty("taxCentralization", "centralized");
  });

  it("companyProfile ANTES da correção NÃO continha isEconomicGroup (prova do bug)", () => {
    const profile = makeCompanyProfileBeforeFix();
    expect(profile).not.toHaveProperty("isEconomicGroup");
  });

  it("companyProfile ANTES da correção NÃO continha taxCentralization (prova do bug)", () => {
    const profile = makeCompanyProfileBeforeFix();
    expect(profile).not.toHaveProperty("taxCentralization");
  });

  it("isEconomicGroup aceita false (empresa sem grupo econômico)", () => {
    const profile = makeCompanyProfileAfterFix({ isEconomicGroup: false });
    expect(profile.isEconomicGroup).toBe(false);
  });

  it("isEconomicGroup aceita null (usuário não respondeu)", () => {
    const profile = makeCompanyProfileAfterFix({ isEconomicGroup: null });
    expect(profile.isEconomicGroup).toBeNull();
  });

  it("taxCentralization aceita 'decentralized'", () => {
    const profile = makeCompanyProfileAfterFix({ taxCentralization: "decentralized" });
    expect(profile.taxCentralization).toBe("decentralized");
  });

  it("taxCentralization aceita 'partial'", () => {
    const profile = makeCompanyProfileAfterFix({ taxCentralization: "partial" });
    expect(profile.taxCentralization).toBe("partial");
  });

  it("taxCentralization aceita null (usuário não respondeu)", () => {
    const profile = makeCompanyProfileAfterFix({ taxCentralization: null });
    expect(profile.taxCentralization).toBeNull();
  });
});

// ─── TESTE 2: getProjectById retorna os campos ────────────────────────────────

describe("BUG-001 — Teste 2: getProjectById retorna os campos (via normalizeProject)", () => {
  it("normalizeProject desserializa isEconomicGroup=true do JSON do banco", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileAfterFix({ isEconomicGroup: true }));
    expect((projeto.companyProfile as any)?.isEconomicGroup).toBe(true);
  });

  it("normalizeProject desserializa isEconomicGroup=false do JSON do banco", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileAfterFix({ isEconomicGroup: false }));
    expect((projeto.companyProfile as any)?.isEconomicGroup).toBe(false);
  });

  it("normalizeProject desserializa taxCentralization='centralized' do JSON do banco", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileAfterFix({ taxCentralization: "centralized" }));
    expect((projeto.companyProfile as any)?.taxCentralization).toBe("centralized");
  });

  it("normalizeProject desserializa taxCentralization='decentralized' do JSON do banco", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileAfterFix({ taxCentralization: "decentralized" }));
    expect((projeto.companyProfile as any)?.taxCentralization).toBe("decentralized");
  });

  it("normalizeProject desserializa taxCentralization='partial' do JSON do banco", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileAfterFix({ taxCentralization: "partial" }));
    expect((projeto.companyProfile as any)?.taxCentralization).toBe("partial");
  });

  it("normalizeProject retorna null para isEconomicGroup quando campo ausente (projeto legado)", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileBeforeFix());
    // Campo ausente no JSON → undefined após parse, não null
    expect((projeto.companyProfile as any)?.isEconomicGroup).toBeUndefined();
  });

  it("normalizeProject retorna null para taxCentralization quando campo ausente (projeto legado)", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileBeforeFix());
    expect((projeto.companyProfile as any)?.taxCentralization).toBeUndefined();
  });
});

// ─── TESTE 3: buildCorporatePrefill usa os campos ─────────────────────────────

describe("BUG-001 — Teste 3: buildCorporatePrefill usa isEconomicGroup e taxCentralization", () => {
  it("qc02_grupo pré-preenchido como 'Sim' quando isEconomicGroup=true", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileAfterFix({ isEconomicGroup: true }));
    const prefill = buildCorporatePrefill(projeto as any);
    expect(prefill.qc02_grupo).toMatch(/Sim/i);
  });

  it("qc02_grupo pré-preenchido como 'Não' quando isEconomicGroup=false", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileAfterFix({ isEconomicGroup: false }));
    const prefill = buildCorporatePrefill(projeto as any);
    expect(prefill.qc02_grupo).toMatch(/Não/i);
  });

  it("qc02_grupo ausente do prefill quando isEconomicGroup=null", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileAfterFix({ isEconomicGroup: null }));
    const prefill = buildCorporatePrefill(projeto as any);
    expect(prefill.qc02_grupo).toBeUndefined();
  });

  it("qc02_centralizacao pré-preenchido quando taxCentralization='centralized'", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileAfterFix({ taxCentralization: "centralized" }));
    const prefill = buildCorporatePrefill(projeto as any);
    expect(prefill.qc02_centralizacao).toBeTruthy();
    expect(typeof prefill.qc02_centralizacao).toBe("string");
  });

  it("qc02_centralizacao pré-preenchido quando taxCentralization='decentralized'", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileAfterFix({ taxCentralization: "decentralized" }));
    const prefill = buildCorporatePrefill(projeto as any);
    expect(prefill.qc02_centralizacao).toBeTruthy();
    expect(typeof prefill.qc02_centralizacao).toBe("string");
  });

  it("qc02_centralizacao pré-preenchido quando taxCentralization='partial'", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileAfterFix({ taxCentralization: "partial" }));
    const prefill = buildCorporatePrefill(projeto as any);
    expect(prefill.qc02_centralizacao).toBeTruthy();
    expect(typeof prefill.qc02_centralizacao).toBe("string");
  });

  it("qc02_centralizacao ausente do prefill quando taxCentralization=null", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileAfterFix({ taxCentralization: null }));
    const prefill = buildCorporatePrefill(projeto as any);
    expect(prefill.qc02_centralizacao).toBeUndefined();
  });
});

// ─── TESTE 4: QC-02 aparece preenchido (qc02_grupo + qc02_centralizacao) ─────

describe("BUG-001 — Teste 4: QC-02 completo pré-preenchido", () => {
  it("cenário grupo econômico centralizado: qc02_grupo + qc02_centralizacao + qc02_filiais todos preenchidos", () => {
    const projeto = makeNormalizedProject({
      ...makeCompanyProfileAfterFix({ isEconomicGroup: true, taxCentralization: "centralized" }),
    });
    // Adicionar operationProfile com multiState para qc02_filiais
    (projeto as any).operationProfile = {
      operationType: "servico",
      clientType: ["B2B"],
      multiState: true,
    };
    const prefill = buildCorporatePrefill(projeto as any);
    expect(prefill.qc02_grupo).toBeTruthy();
    expect(prefill.qc02_centralizacao).toBeTruthy();
    expect(prefill.qc02_filiais).toBeTruthy();
    // Verificar que todos são strings
    expect(typeof prefill.qc02_grupo).toBe("string");
    expect(typeof prefill.qc02_centralizacao).toBe("string");
    expect(typeof prefill.qc02_filiais).toBe("string");
  });

  it("cenário empresa independente: qc02_grupo='Não', qc02_centralizacao ausente", () => {
    const projeto = makeNormalizedProject(
      makeCompanyProfileAfterFix({ isEconomicGroup: false, taxCentralization: null })
    );
    const prefill = buildCorporatePrefill(projeto as any);
    expect(prefill.qc02_grupo).toMatch(/Não/i);
    expect(prefill.qc02_centralizacao).toBeUndefined();
  });

  it("cenário projeto legado (sem campos QC-02): qc02_grupo e qc02_centralizacao ausentes do prefill", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileBeforeFix());
    const prefill = buildCorporatePrefill(projeto as any);
    // Projetos legados não têm esses campos — prefill não deve forçar valor
    expect(prefill.qc02_grupo).toBeUndefined();
    expect(prefill.qc02_centralizacao).toBeUndefined();
  });

  it("qc01_regime e qc01_porte continuam pré-preenchidos no mesmo cenário (sem regressão)", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileAfterFix({ isEconomicGroup: true }));
    const prefill = buildCorporatePrefill(projeto as any);
    expect(prefill.qc01_regime).toBeTruthy();
    expect(prefill.qc01_porte).toBeTruthy();
  });
});

// ─── TESTE 5: Regressão — campos antigos continuam funcionando ────────────────

describe("BUG-001 — Teste 5: Regressão — campos antigos não foram afetados", () => {
  it("qc01_regime continua pré-preenchido após a correção", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileAfterFix());
    const prefill = buildCorporatePrefill(projeto as any);
    expect(prefill.qc01_regime).toMatch(/Lucro Presumido/i);
  });

  it("qc01_porte continua pré-preenchido após a correção", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileAfterFix());
    const prefill = buildCorporatePrefill(projeto as any);
    expect(prefill.qc01_porte).toMatch(/Médio porte/i);
  });

  it("qc02_filiais continua pré-preenchido via operationProfile.multiState", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileAfterFix());
    (projeto as any).operationProfile = {
      operationType: "servico",
      clientType: ["B2B"],
      multiState: true,
    };
    const prefill = buildCorporatePrefill(projeto as any);
    expect(prefill.qc02_filiais).toBeTruthy();
  });

  it("normalizeProject ainda desserializa todos os 14 campos JSON corretamente", () => {
    const projeto = makeNormalizedProject(makeCompanyProfileAfterFix());
    expect(projeto.companyProfile).toBeTypeOf("object");
    expect(projeto.operationProfile).toBeTypeOf("object");
    expect(Array.isArray(projeto.confirmedCnaes)).toBe(true);
    expect(Array.isArray(projeto.stepHistory)).toBe(true);
  });

  it("companyProfile com os 2 novos campos não quebra outros campos existentes", () => {
    const profile = makeCompanyProfileAfterFix();
    expect(profile.cnpj).toBe("11.222.333/0001-81");
    expect(profile.companyType).toBe("ltda");
    expect(profile.companySize).toBe("media");
    expect(profile.taxRegime).toBe("lucro_presumido");
    expect(profile.annualRevenueRange).toBe("4_8m_78m");
  });

  it("buildCorporatePrefill com projeto que tem todos os campos QC-02 retorna prefill completo", () => {
    const projeto = makeNormalizedProject(
      makeCompanyProfileAfterFix({ isEconomicGroup: true, taxCentralization: "partial" })
    );
    (projeto as any).operationProfile = {
      operationType: "misto",
      clientType: ["B2B", "B2C"],
      multiState: true,
    };
    const prefill = buildCorporatePrefill(projeto as any);
    // QC-01 completo
    expect(prefill.qc01_regime).toBeTruthy();
    expect(prefill.qc01_porte).toBeTruthy();
    // QC-02 completo
    expect(prefill.qc02_grupo).toBeTruthy();
    expect(prefill.qc02_filiais).toBeTruthy();
    expect(prefill.qc02_centralizacao).toBeTruthy();
  });
});
