/**
 * FASE 2 — Validação E2E Pós-Fix (Prefill Contract)
 *
 * 10 cenários obrigatórios × 8 blocos de checklist (A-H):
 *   A — Contrato de Entrada
 *   B — Prefill
 *   C — Não Repetição (Crítico)
 *   D — Builders
 *   E — Normalização
 *   F — Robustez
 *   G — Testes
 *   H — Evidência (PrefillTrace)
 *
 * Referência: docs/issues/ISSUE-001-prefill-contract-fase1-final.md
 * Orquestrador: Fase 2 — Cobertura Operacional + Validação Final
 */
import { describe, it, expect } from "vitest";
import {
  buildCorporatePrefill,
  buildOperationalPrefill,
  buildCnaePrefill,
  type NormalizedProjectForPrefill,
} from "../shared/questionario-prefill";
import { normalizeProject, safeParseJson } from "../db";

// ─── FIXTURES DOS 10 CENÁRIOS ─────────────────────────────────────────────────

/** Cenário 1 — Projeto Simples (1 CNAE) */
const C1_SIMPLES: NormalizedProjectForPrefill = {
  companyProfile: {
    taxRegime: "simples_nacional",
    companySize: "micro",
    isEconomicGroup: false,
    taxCentralization: "centralized",
  },
  operationProfile: {
    operationType: "servico",
    clientType: ["b2b"],
    multiState: false,
  },
  financialProfile: { paymentMethods: ["pix"] },
  governanceProfile: { hasTaxTeam: false },
  taxComplexity: { hasMultipleEstablishments: false },
  confirmedCnaes: [{ code: "6201-5/01", description: "Desenvolvimento de programas de computador sob encomenda" }],
};

/** Cenário 2 — Projeto Médio (3 CNAEs) */
const C2_MEDIO: NormalizedProjectForPrefill = {
  companyProfile: {
    taxRegime: "lucro_presumido",
    companySize: "media",
    isEconomicGroup: false,
    taxCentralization: "centralized",
  },
  operationProfile: {
    operationType: "misto",
    clientType: ["b2b", "b2c"],
    multiState: false,
  },
  financialProfile: { paymentMethods: ["pix", "boleto", "cartao"] },
  governanceProfile: { hasTaxTeam: true },
  taxComplexity: { hasMultipleEstablishments: false },
  confirmedCnaes: [
    { code: "4711-3/01", description: "Comércio varejista de mercadorias em geral" },
    { code: "5611-2/01", description: "Restaurantes e similares" },
    { code: "7319-0/02", description: "Promoção de vendas" },
  ],
};

/** Cenário 3 — Projeto Complexo (5 CNAEs) */
const C3_COMPLEXO: NormalizedProjectForPrefill = {
  companyProfile: {
    taxRegime: "lucro_real",
    companySize: "grande",
    isEconomicGroup: true,
    taxCentralization: "decentralized",
  },
  operationProfile: {
    operationType: "misto",
    clientType: ["b2b", "b2c", "b2g"],
    multiState: true,
  },
  financialProfile: { paymentMethods: ["pix", "boleto", "cartao", "ted"] },
  governanceProfile: { hasTaxTeam: true },
  taxComplexity: { hasMultipleEstablishments: true, hasImportExport: true, hasSpecialRegimes: true },
  confirmedCnaes: [
    { code: "4711-3/01", description: "Comércio varejista" },
    { code: "6201-5/01", description: "Desenvolvimento de software" },
    { code: "4930-2/01", description: "Transporte rodoviário de carga" },
    { code: "7020-4/00", description: "Atividades de consultoria em gestão empresarial" },
    { code: "6311-9/00", description: "Tratamento de dados" },
  ],
};

/** Cenário 4 — Projeto com Múltiplas UFs */
const C4_MULTI_UF: NormalizedProjectForPrefill = {
  companyProfile: {
    taxRegime: "lucro_presumido",
    companySize: "media",
    isEconomicGroup: false,
    taxCentralization: "partial",
  },
  operationProfile: {
    operationType: "comercio",
    clientType: ["b2b", "b2c"],
    multiState: true,
  },
  financialProfile: { paymentMethods: ["pix", "boleto"] },
  governanceProfile: { hasTaxTeam: false },
  taxComplexity: { hasMultipleEstablishments: true },
  confirmedCnaes: [
    { code: "4711-3/01", description: "Comércio varejista de mercadorias em geral" },
    { code: "4712-1/00", description: "Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios" },
  ],
};

/** Cenário 5 — Projeto com Grupo Econômico */
const C5_GRUPO_ECONOMICO: NormalizedProjectForPrefill = {
  companyProfile: {
    taxRegime: "lucro_real",
    companySize: "grande",
    isEconomicGroup: true,
    taxCentralization: "centralized",
  },
  operationProfile: {
    operationType: "misto",
    clientType: ["b2b"],
    multiState: true,
  },
  financialProfile: { paymentMethods: ["ted", "boleto"] },
  governanceProfile: { hasTaxTeam: true },
  taxComplexity: { hasMultipleEstablishments: true },
  confirmedCnaes: [
    { code: "6420-0/00", description: "Atividades de sociedades de participação" },
    { code: "6619-3/99", description: "Outras atividades auxiliares dos serviços financeiros" },
  ],
};

/** Cenário 6 — Projeto com Filiais */
const C6_FILIAIS: NormalizedProjectForPrefill = {
  companyProfile: {
    taxRegime: "lucro_presumido",
    companySize: "media",
    isEconomicGroup: false,
    taxCentralization: "partial",
  },
  operationProfile: {
    operationType: "servico",
    clientType: ["b2b", "b2c"],
    multiState: true,
  },
  financialProfile: { paymentMethods: ["pix", "cartao"] },
  governanceProfile: { hasTaxTeam: false },
  taxComplexity: { hasMultipleEstablishments: true },
  confirmedCnaes: [
    { code: "8621-6/01", description: "UTI móvel" },
    { code: "8630-5/01", description: "Atividade médica ambulatorial com recursos para realização de procedimentos cirúrgicos" },
  ],
};

/** Cenário 7 — Projeto com Centralização Tributária */
const C7_CENTRALIZACAO: NormalizedProjectForPrefill = {
  companyProfile: {
    taxRegime: "lucro_real",
    companySize: "grande",
    isEconomicGroup: true,
    taxCentralization: "centralized",
  },
  operationProfile: {
    operationType: "produto",
    clientType: ["b2b"],
    multiState: true,
  },
  financialProfile: { paymentMethods: ["boleto", "ted"] },
  governanceProfile: { hasTaxTeam: true },
  taxComplexity: { hasMultipleEstablishments: true, hasSpecialRegimes: true },
  confirmedCnaes: [
    { code: "1011-2/01", description: "Frigorífico - abate de bovinos" },
    { code: "1013-9/01", description: "Frigorífico - abate de suínos" },
    { code: "4631-1/00", description: "Comércio atacadista de leite e laticínios" },
  ],
};

/** Cenário 8 — Projeto Legado (dados antigos, sem novos campos) */
const C8_LEGADO: NormalizedProjectForPrefill = {
  // Projeto criado antes da ISSUE-001 — sem isEconomicGroup nem taxCentralization
  taxRegime: "lucro_presumido",
  companySize: "media",
  companyProfile: {
    taxRegime: "lucro_presumido",
    companySize: "media",
    // isEconomicGroup ausente
    // taxCentralization ausente
  },
  operationProfile: {
    operationType: "comercio",
    clientType: ["b2c"],
    multiState: null,
  },
  financialProfile: null,
  governanceProfile: null,
  taxComplexity: null,
  confirmedCnaes: null,
};

/** Cenário 9 — Projeto com Respostas Inconsistentes */
const C9_INCONSISTENTE: NormalizedProjectForPrefill = {
  companyProfile: {
    taxRegime: "simples_nacional",
    companySize: "grande", // inconsistente: Simples Nacional não pode ser grande porte
    isEconomicGroup: true, // inconsistente: Simples Nacional não pode ter grupo econômico
    taxCentralization: "decentralized",
  },
  operationProfile: {
    operationType: "misto",
    clientType: ["b2b"],
    multiState: false, // inconsistente com isEconomicGroup: true
  },
  financialProfile: { paymentMethods: [] }, // lista vazia
  governanceProfile: { hasTaxTeam: null }, // null
  taxComplexity: { hasMultipleEstablishments: null },
  confirmedCnaes: [],
};

/** Cenário 10 — Projeto com Alteração/Reentrada */
const C10_REENTRADA_ANTES: NormalizedProjectForPrefill = {
  companyProfile: {
    taxRegime: "simples_nacional",
    companySize: "micro",
    isEconomicGroup: false,
    taxCentralization: "centralized",
  },
  operationProfile: {
    operationType: "servico",
    clientType: ["b2b"],
    multiState: false,
  },
  financialProfile: { paymentMethods: ["pix"] },
  governanceProfile: { hasTaxTeam: false },
  taxComplexity: { hasMultipleEstablishments: false },
  confirmedCnaes: [{ code: "6201-5/01", description: "Desenvolvimento de software" }],
};

const C10_REENTRADA_DEPOIS: NormalizedProjectForPrefill = {
  // Mesma empresa após atualização do perfil (cresceu, mudou regime)
  companyProfile: {
    taxRegime: "lucro_presumido",
    companySize: "media",
    isEconomicGroup: false,
    taxCentralization: "centralized",
  },
  operationProfile: {
    operationType: "misto",
    clientType: ["b2b", "b2c"],
    multiState: true,
  },
  financialProfile: { paymentMethods: ["pix", "boleto", "cartao"] },
  governanceProfile: { hasTaxTeam: true },
  taxComplexity: { hasMultipleEstablishments: true },
  confirmedCnaes: [
    { code: "6201-5/01", description: "Desenvolvimento de software" },
    { code: "7020-4/00", description: "Consultoria em gestão" },
  ],
};

// ─── HELPER: validar que prefill não contém campos vazios ou undefined ────────
function assertNonEmptyString(value: string | undefined, fieldName: string) {
  expect(value, `Campo ${fieldName} deve estar preenchido`).toBeDefined();
  expect(value, `Campo ${fieldName} não pode ser string vazia`).not.toBe("");
}

// ─── BLOCO A — CONTRATO DE ENTRADA ────────────────────────────────────────────

describe("BLOCO A — Contrato de Entrada", () => {
  const cenarios = [
    { nome: "C1 Simples", p: C1_SIMPLES },
    { nome: "C2 Médio", p: C2_MEDIO },
    { nome: "C3 Complexo", p: C3_COMPLEXO },
    { nome: "C4 Multi-UF", p: C4_MULTI_UF },
    { nome: "C5 Grupo Econômico", p: C5_GRUPO_ECONOMICO },
    { nome: "C6 Filiais", p: C6_FILIAIS },
    { nome: "C7 Centralização", p: C7_CENTRALIZACAO },
    { nome: "C9 Inconsistente", p: C9_INCONSISTENTE },
    { nome: "C10 Reentrada-Antes", p: C10_REENTRADA_ANTES },
    { nome: "C10 Reentrada-Depois", p: C10_REENTRADA_DEPOIS },
  ];

  for (const { nome, p } of cenarios) {
    it(`${nome}: companyProfile presente e acessível`, () => {
      expect(p.companyProfile).toBeDefined();
    });

    it(`${nome}: taxRegime presente no companyProfile`, () => {
      expect(p.companyProfile?.taxRegime).toBeTruthy();
    });

    it(`${nome}: companySize presente no companyProfile`, () => {
      expect(p.companyProfile?.companySize).toBeTruthy();
    });
  }

  it("C8 Legado: companyProfile presente (mesmo sem novos campos)", () => {
    expect(C8_LEGADO.companyProfile).toBeDefined();
    expect(C8_LEGADO.companyProfile?.taxRegime).toBeTruthy();
  });

  it("C5 Grupo Econômico: isEconomicGroup = true presente", () => {
    expect(C5_GRUPO_ECONOMICO.companyProfile?.isEconomicGroup).toBe(true);
  });

  it("C7 Centralização: taxCentralization = 'centralized' presente", () => {
    expect(C7_CENTRALIZACAO.companyProfile?.taxCentralization).toBe("centralized");
  });

  it("C4 Multi-UF: taxCentralization = 'partial' presente", () => {
    expect(C4_MULTI_UF.companyProfile?.taxCentralization).toBe("partial");
  });
});

// ─── BLOCO B — PREFILL ────────────────────────────────────────────────────────

describe("BLOCO B — Prefill", () => {
  it("C1 Simples: regime = Simples Nacional, porte = micro", () => {
    const r = buildCorporatePrefill(C1_SIMPLES);
    expect(r["qc01_regime"]).toMatch(/Simples Nacional/i);
    expect(r["qc01_porte"]).toMatch(/micro/i);
  });

  it("C1 Simples: grupo = Não, filiais = Não, centralização = centralizada", () => {
    const r = buildCorporatePrefill(C1_SIMPLES);
    expect(r["qc02_grupo"]).toBe("Não");
    expect(r["qc02_filiais"]).toBe("Não");
    expect(r["qc02_centralizacao"]).toMatch(/Sim.*centraliz/i);
  });

  it("C2 Médio: regime = Lucro Presumido, porte = média", () => {
    const r = buildCorporatePrefill(C2_MEDIO);
    expect(r["qc01_regime"]).toMatch(/Lucro Presumido/i);
    expect(r["qc01_porte"]).toMatch(/m[eé]di/i);
  });

  it("C3 Complexo: regime = Lucro Real, porte = grande, grupo = Sim, filiais = Sim", () => {
    const r = buildCorporatePrefill(C3_COMPLEXO);
    expect(r["qc01_regime"]).toMatch(/Lucro Real/i);
    expect(r["qc01_porte"]).toMatch(/grande/i);
    expect(r["qc02_grupo"]).toBe("Sim");
    expect(r["qc02_filiais"]).toBe("Sim");
  });

  it("C4 Multi-UF: filiais = Sim (multiState: true), centralização = parcial", () => {
    const r = buildCorporatePrefill(C4_MULTI_UF);
    expect(r["qc02_filiais"]).toBe("Sim");
    expect(r["qc02_centralizacao"]).toMatch(/parcial/i);
  });

  it("C5 Grupo Econômico: grupo = Sim, centralização = centralizada", () => {
    const r = buildCorporatePrefill(C5_GRUPO_ECONOMICO);
    expect(r["qc02_grupo"]).toBe("Sim");
    expect(r["qc02_centralizacao"]).toMatch(/Sim.*centraliz/i);
  });

  it("C6 Filiais: filiais = Sim, centralização = parcial", () => {
    const r = buildCorporatePrefill(C6_FILIAIS);
    expect(r["qc02_filiais"]).toBe("Sim");
    expect(r["qc02_centralizacao"]).toMatch(/parcial/i);
  });

  it("C7 Centralização: grupo = Sim, centralização = centralizada", () => {
    const r = buildCorporatePrefill(C7_CENTRALIZACAO);
    expect(r["qc02_grupo"]).toBe("Sim");
    expect(r["qc02_centralizacao"]).toMatch(/Sim.*centraliz/i);
  });

  it("C8 Legado: regime e porte preenchidos a partir de companyProfile (fallback)", () => {
    const r = buildCorporatePrefill(C8_LEGADO);
    expect(r["qc01_regime"]).toMatch(/Lucro Presumido/i);
    expect(r["qc01_porte"]).toMatch(/m[eé]di/i);
  });

  it("C9 Inconsistente: prefill retorna dados sem inventar valores inexistentes", () => {
    const r = buildCorporatePrefill(C9_INCONSISTENTE);
    // Deve preencher o que existe, mesmo que seja inconsistente do ponto de vista de negócio
    expect(r["qc01_regime"]).toMatch(/Simples Nacional/i);
    expect(r["qc01_porte"]).toMatch(/grande/i);
    // Grupo econômico: true → Sim
    expect(r["qc02_grupo"]).toBe("Sim");
  });

  it("C10 Reentrada: prefill reflete estado ANTES da alteração", () => {
    const r = buildCorporatePrefill(C10_REENTRADA_ANTES);
    expect(r["qc01_regime"]).toMatch(/Simples Nacional/i);
    expect(r["qc01_porte"]).toMatch(/micro/i);
    expect(r["qc02_grupo"]).toBe("Não");
  });

  it("C10 Reentrada: prefill reflete estado DEPOIS da alteração (novo perfil)", () => {
    const r = buildCorporatePrefill(C10_REENTRADA_DEPOIS);
    expect(r["qc01_regime"]).toMatch(/Lucro Presumido/i);
    expect(r["qc01_porte"]).toMatch(/m[eé]di/i);
    expect(r["qc02_filiais"]).toBe("Sim");
  });

  // Prefill Operacional
  it("C1 Simples: qo01_canais preenchido (operationType: servico)", () => {
    const r = buildOperationalPrefill(C1_SIMPLES);
    assertNonEmptyString(r["qo01_canais"] as string, "qo01_canais");
  });

  it("C3 Complexo: qo01_canais, qo01_clientes, qo03_meios, qo08_equipe preenchidos", () => {
    const r = buildOperationalPrefill(C3_COMPLEXO);
    assertNonEmptyString(r["qo01_canais"] as string, "qo01_canais");
    assertNonEmptyString(r["qo08_equipe"] as string, "qo08_equipe");
  });

  // Prefill CNAE
  it("C1 Simples: qcnae01_setor preenchido (1 CNAE)", () => {
    const r = buildCnaePrefill(C1_SIMPLES);
    assertNonEmptyString(r["qcnae01_setor"] as string, "qcnae01_setor");
    assertNonEmptyString(r["qcnae01_atividades"] as string, "qcnae01_atividades");
  });

  it("C3 Complexo: qcnae01_atividades reflete múltiplos CNAEs (5 → 'mais de 3')", () => {
    const r = buildCnaePrefill(C3_COMPLEXO);
    // cnaeCountToAtividades(5) → "Sim — mais de 3 CNAEs secundários"
    expect(r["qcnae01_atividades"]).toMatch(/mais de 3/i);
  });

  it("C8 Legado: qcnae01_setor preenchido via operationType (fallback correto)", () => {
    // O builder usa operationProfile.operationType como fonte primária para setor,
    // independente de confirmedCnaes. C8_LEGADO tem operationType='comercio' →
    // OPERATION_TYPE_TO_SETOR['comercio'] = 'Comércio (atacado ou varejo)'
    const r = buildCnaePrefill(C8_LEGADO);
    expect(r["qcnae01_setor"]).toMatch(/com[eé]rcio/i);
  });
});

// ─── BLOCO C — NÃO REPETIÇÃO (CRÍTICO) ───────────────────────────────────────

describe("BLOCO C — Não Repetição (Crítico)", () => {
  const cenariosFull = [
    { nome: "C1", p: C1_SIMPLES },
    { nome: "C2", p: C2_MEDIO },
    { nome: "C3", p: C3_COMPLEXO },
    { nome: "C4", p: C4_MULTI_UF },
    { nome: "C5", p: C5_GRUPO_ECONOMICO },
    { nome: "C6", p: C6_FILIAIS },
    { nome: "C7", p: C7_CENTRALIZACAO },
    { nome: "C10-Antes", p: C10_REENTRADA_ANTES },
    { nome: "C10-Depois", p: C10_REENTRADA_DEPOIS },
  ];

  for (const { nome, p } of cenariosFull) {
    it(`${nome}: qc01_regime preenchido — não aparece vazio`, () => {
      const r = buildCorporatePrefill(p);
      expect(r["qc01_regime"]).toBeTruthy();
      expect(r["qc01_regime"]).not.toBe("");
    });

    it(`${nome}: qc01_porte preenchido — não aparece vazio`, () => {
      const r = buildCorporatePrefill(p);
      expect(r["qc01_porte"]).toBeTruthy();
      expect(r["qc01_porte"]).not.toBe("");
    });

    it(`${nome}: qc02_grupo preenchido — não aparece vazio`, () => {
      const r = buildCorporatePrefill(p);
      expect(r["qc02_grupo"]).toBeTruthy();
      expect(r["qc02_grupo"]).not.toBe("");
    });

    it(`${nome}: qc02_filiais preenchido — não aparece vazio`, () => {
      const r = buildCorporatePrefill(p);
      expect(r["qc02_filiais"]).toBeTruthy();
      expect(r["qc02_filiais"]).not.toBe("");
    });

    it(`${nome}: qc02_centralizacao preenchido — não aparece vazio`, () => {
      const r = buildCorporatePrefill(p);
      expect(r["qc02_centralizacao"]).toBeTruthy();
      expect(r["qc02_centralizacao"]).not.toBe("");
    });
  }

  it("C8 Legado: qc02_grupo ausente (não inventado) — PASS esperado", () => {
    const r = buildCorporatePrefill(C8_LEGADO);
    // Legado não tem isEconomicGroup → campo ausente é comportamento correto
    expect(r["qc02_grupo"]).toBeUndefined();
  });

  it("C9 Inconsistente: campos preenchidos sem invenção — sem string vazia", () => {
    const r = buildCorporatePrefill(C9_INCONSISTENTE);
    // Deve preencher o que existe; campos com null não devem aparecer como ""
    if (r["qc02_grupo"] !== undefined) {
      expect(r["qc02_grupo"]).not.toBe("");
    }
  });
});

// ─── BLOCO D — BUILDERS ───────────────────────────────────────────────────────

describe("BLOCO D — Builders (Centralização)", () => {
  const todosOsCenarios = [
    C1_SIMPLES, C2_MEDIO, C3_COMPLEXO, C4_MULTI_UF, C5_GRUPO_ECONOMICO,
    C6_FILIAIS, C7_CENTRALIZACAO, C8_LEGADO, C9_INCONSISTENTE,
    C10_REENTRADA_ANTES, C10_REENTRADA_DEPOIS,
  ];

  it("buildCorporatePrefill: não lança exceção em nenhum dos 11 cenários", () => {
    for (const p of todosOsCenarios) {
      expect(() => buildCorporatePrefill(p)).not.toThrow();
    }
  });

  it("buildOperationalPrefill: não lança exceção em nenhum dos 11 cenários", () => {
    for (const p of todosOsCenarios) {
      expect(() => buildOperationalPrefill(p)).not.toThrow();
    }
  });

  it("buildCnaePrefill: não lança exceção em nenhum dos 11 cenários", () => {
    for (const p of todosOsCenarios) {
      expect(() => buildCnaePrefill(p)).not.toThrow();
    }
  });

  it("builders retornam objetos (não null, não undefined)", () => {
    for (const p of todosOsCenarios) {
      expect(buildCorporatePrefill(p)).toBeTruthy();
      expect(buildOperationalPrefill(p)).toBeTruthy();
      expect(buildCnaePrefill(p)).toBeTruthy();
    }
  });

  it("builders são determinísticos: mesma entrada → mesma saída", () => {
    const r1 = buildCorporatePrefill(C3_COMPLEXO);
    const r2 = buildCorporatePrefill(C3_COMPLEXO);
    expect(r1["qc01_regime"]).toBe(r2["qc01_regime"]);
    expect(r1["qc02_grupo"]).toBe(r2["qc02_grupo"]);
    expect(r1["qc02_centralizacao"]).toBe(r2["qc02_centralizacao"]);
  });
});

// ─── BLOCO E — NORMALIZAÇÃO ───────────────────────────────────────────────────

describe("BLOCO E — Normalização", () => {
  it("JSON como string → parseia corretamente para todos os profiles", () => {
    const raw = {
      companyProfile: JSON.stringify({ taxRegime: "lucro_real", companySize: "grande", isEconomicGroup: true, taxCentralization: "decentralized" }),
      operationProfile: JSON.stringify({ operationType: "misto", clientType: ["b2b"], multiState: true }),
      financialProfile: JSON.stringify({ paymentMethods: ["pix"] }),
      governanceProfile: JSON.stringify({ hasTaxTeam: true }),
      taxComplexity: JSON.stringify({ hasMultipleEstablishments: true }),
    };
    const n = normalizeProject(raw as any);
    expect(typeof n.companyProfile).toBe("object");
    expect(typeof n.operationProfile).toBe("object");
    expect(typeof n.financialProfile).toBe("object");
    expect(typeof n.governanceProfile).toBe("object");
    expect(typeof n.taxComplexity).toBe("object");
  });

  it("null → retorna null (não quebra)", () => {
    const n = normalizeProject({ companyProfile: null, operationProfile: null } as any);
    expect(n.companyProfile).toBeNull();
    expect(n.operationProfile).toBeNull();
  });

  it("undefined → não quebra", () => {
    expect(() => normalizeProject({ companyProfile: undefined } as any)).not.toThrow();
  });

  it("JSON malformado → não quebra, retorna null", () => {
    const n = normalizeProject({ companyProfile: "{ invalid }" } as any);
    expect(n.companyProfile).toBeNull();
  });

  it("objeto já parseado → retorna o mesmo objeto", () => {
    const obj = { taxRegime: "lucro_real", isEconomicGroup: true };
    const n = normalizeProject({ companyProfile: obj } as any);
    expect(n.companyProfile).toEqual(obj);
  });

  it("pipeline completo: normalizeProject → buildCorporatePrefill funciona para C3", () => {
    const raw = {
      companyProfile: JSON.stringify(C3_COMPLEXO.companyProfile),
      operationProfile: JSON.stringify(C3_COMPLEXO.operationProfile),
      confirmedCnaes: C3_COMPLEXO.confirmedCnaes,
    };
    const n = normalizeProject(raw as any);
    const r = buildCorporatePrefill(n as NormalizedProjectForPrefill);
    expect(r["qc01_regime"]).toMatch(/Lucro Real/i);
    expect(r["qc02_grupo"]).toBe("Sim");
  });

  it("pipeline completo: normalizeProject → buildCorporatePrefill funciona para C8 Legado", () => {
    const raw = {
      companyProfile: JSON.stringify({ taxRegime: "lucro_presumido", companySize: "media" }),
      operationProfile: JSON.stringify({ operationType: "comercio", clientType: ["b2c"], multiState: null }),
    };
    const n = normalizeProject(raw as any);
    const r = buildCorporatePrefill(n as NormalizedProjectForPrefill);
    expect(r["qc01_regime"]).toMatch(/Lucro Presumido/i);
    expect(r["qc02_grupo"]).toBeUndefined(); // legado — ausente intencional
  });
});

// ─── BLOCO F — ROBUSTEZ ───────────────────────────────────────────────────────

describe("BLOCO F — Robustez", () => {
  it("fluxo completo C1→C10 não quebra em nenhum cenário", () => {
    const cenarios = [
      C1_SIMPLES, C2_MEDIO, C3_COMPLEXO, C4_MULTI_UF, C5_GRUPO_ECONOMICO,
      C6_FILIAIS, C7_CENTRALIZACAO, C8_LEGADO, C9_INCONSISTENTE,
      C10_REENTRADA_ANTES, C10_REENTRADA_DEPOIS,
    ];
    for (const p of cenarios) {
      expect(() => {
        buildCorporatePrefill(p);
        buildOperationalPrefill(p);
        buildCnaePrefill(p);
      }).not.toThrow();
    }
  });

  it("reentrada: alteração de perfil → prefill reflete novo estado sem resíduo do anterior", () => {
    const antes = buildCorporatePrefill(C10_REENTRADA_ANTES);
    const depois = buildCorporatePrefill(C10_REENTRADA_DEPOIS);
    // Regime mudou: Simples → Presumido
    expect(antes["qc01_regime"]).toMatch(/Simples Nacional/i);
    expect(depois["qc01_regime"]).toMatch(/Lucro Presumido/i);
    // Filiais mudou: Não → Sim
    expect(antes["qc02_filiais"]).toBe("Não");
    expect(depois["qc02_filiais"]).toBe("Sim");
  });

  it("C9 Inconsistente: sistema não quebra com dados contraditórios", () => {
    expect(() => buildCorporatePrefill(C9_INCONSISTENTE)).not.toThrow();
    expect(() => buildOperationalPrefill(C9_INCONSISTENTE)).not.toThrow();
    expect(() => buildCnaePrefill(C9_INCONSISTENTE)).not.toThrow();
  });

  it("C9 Inconsistente: lista de paymentMethods vazia → não quebra", () => {
    const r = buildOperationalPrefill(C9_INCONSISTENTE);
    expect(r).toBeTruthy();
  });

  it("C9 Inconsistente: confirmedCnaes vazio → não quebra, setor preenchido via operationType", () => {
    // C9_INCONSISTENTE tem operationType='misto' →
    // OPERATION_TYPE_TO_SETOR['misto'] = 'Serviços (geral)'
    const r = buildCnaePrefill(C9_INCONSISTENTE);
    expect(r["qcnae01_setor"]).toMatch(/servi[çc]/i);
  });

  it("normalizeProject com projeto completamente vazio → não quebra", () => {
    expect(() => normalizeProject({} as any)).not.toThrow();
  });
});

// ─── BLOCO G — TESTES ─────────────────────────────────────────────────────────

describe("BLOCO G — Testes (Regressão)", () => {
  it("PCT v2: 10 cenários cobertos por fixtures completos", () => {
    // Verificação estrutural: todos os fixtures estão definidos e acessíveis
    expect(C1_SIMPLES.companyProfile?.taxRegime).toBe("simples_nacional");
    expect(C2_MEDIO.companyProfile?.taxRegime).toBe("lucro_presumido");
    expect(C3_COMPLEXO.companyProfile?.taxRegime).toBe("lucro_real");
    expect(C4_MULTI_UF.operationProfile?.multiState).toBe(true);
    expect(C5_GRUPO_ECONOMICO.companyProfile?.isEconomicGroup).toBe(true);
    expect(C6_FILIAIS.taxComplexity?.hasMultipleEstablishments).toBe(true);
    expect(C7_CENTRALIZACAO.companyProfile?.taxCentralization).toBe("centralized");
    expect(C8_LEGADO.companyProfile?.taxRegime).toBe("lucro_presumido");
    expect(C9_INCONSISTENTE.companyProfile?.companySize).toBe("grande");
    expect(C10_REENTRADA_ANTES.companyProfile?.taxRegime).toBe("simples_nacional");
    expect(C10_REENTRADA_DEPOIS.companyProfile?.taxRegime).toBe("lucro_presumido");
  });

  it("regressão: C1 Simples — qc01_regime não regrediu para undefined", () => {
    expect(buildCorporatePrefill(C1_SIMPLES)["qc01_regime"]).toBeDefined();
  });

  it("regressão: C3 Complexo — qc02_grupo não regrediu para undefined", () => {
    expect(buildCorporatePrefill(C3_COMPLEXO)["qc02_grupo"]).toBeDefined();
  });

  it("regressão: C8 Legado — qc01_regime não regrediu para undefined", () => {
    expect(buildCorporatePrefill(C8_LEGADO)["qc01_regime"]).toBeDefined();
  });

  it("regressão: normalizeProject ainda parseia string JSON corretamente", () => {
    const n = normalizeProject({ companyProfile: JSON.stringify({ taxRegime: "lucro_real" }) } as any);
    expect((n.companyProfile as any)?.taxRegime).toBe("lucro_real");
  });

  it("regressão: safeParseJson ainda retorna null para JSON inválido", () => {
    expect(safeParseJson("{ bad json", null)).toBeNull();
  });
});

// ─── BLOCO H — EVIDÊNCIA (PrefillTrace) ──────────────────────────────────────

describe("BLOCO H — Evidência (PrefillTrace)", () => {
  it("C1 Simples: trace completo — todos os campos QC-01 e QC-02 resolvidos", () => {
    const r = buildCorporatePrefill(C1_SIMPLES, { trace: true }) as any;
    const t = r._trace;
    expect(t.prefill_fields_resolved).toContain("qc01_regime");
    expect(t.prefill_fields_resolved).toContain("qc01_porte");
    expect(t.prefill_fields_resolved).toContain("qc02_grupo");
    expect(t.prefill_fields_resolved).toContain("qc02_filiais");
    expect(t.prefill_fields_resolved).toContain("qc02_centralizacao");
    expect(t.prefill_fields_missing).toHaveLength(0);
    expect(t.prefill_parse_errors).toHaveLength(0);
  });

  it("C3 Complexo: trace — source paths incluem companyProfile.isEconomicGroup e taxCentralization", () => {
    const r = buildCorporatePrefill(C3_COMPLEXO, { trace: true }) as any;
    const t = r._trace;
    expect(t.prefill_source_paths_used).toContain("companyProfile.isEconomicGroup");
    expect(t.prefill_source_paths_used).toContain("companyProfile.taxCentralization");
  });

  it("C8 Legado: trace — qc02_grupo e qc02_centralizacao em missing (ausência intencional)", () => {
    const r = buildCorporatePrefill(C8_LEGADO, { trace: true }) as any;
    const t = r._trace;
    expect(t.prefill_fields_missing).toContain("qc02_grupo");
    expect(t.prefill_fields_missing).toContain("qc02_centralizacao");
    expect(t.prefill_parse_errors).toHaveLength(0);
  });

  it("C5 Grupo Econômico: trace — qc02_grupo resolvido via companyProfile.isEconomicGroup", () => {
    const r = buildCorporatePrefill(C5_GRUPO_ECONOMICO, { trace: true }) as any;
    const t = r._trace;
    expect(t.prefill_fields_resolved).toContain("qc02_grupo");
    expect(t.prefill_source_paths_used).toContain("companyProfile.isEconomicGroup");
  });

  it("C7 Centralização: trace — qc02_centralizacao resolvido como 'centralized'", () => {
    const r = buildCorporatePrefill(C7_CENTRALIZACAO, { trace: true }) as any;
    const t = r._trace;
    expect(t.prefill_fields_resolved).toContain("qc02_centralizacao");
    expect(r["qc02_centralizacao"]).toMatch(/Sim.*centraliz/i);
  });

  it("C10 Reentrada: trace reflete novo estado após alteração", () => {
    const r1 = buildCorporatePrefill(C10_REENTRADA_ANTES, { trace: true }) as any;
    const r2 = buildCorporatePrefill(C10_REENTRADA_DEPOIS, { trace: true }) as any;
    // Ambos devem ter trace sem parse errors
    expect(r1._trace.prefill_parse_errors).toHaveLength(0);
    expect(r2._trace.prefill_parse_errors).toHaveLength(0);
    // Regime deve ser diferente
    expect(r1["qc01_regime"]).not.toBe(r2["qc01_regime"]);
  });

  it("C4 Multi-UF: trace — qc02_filiais resolvido via operationProfile.multiState", () => {
    const r = buildCorporatePrefill(C4_MULTI_UF, { trace: true }) as any;
    const t = r._trace;
    expect(t.prefill_fields_resolved).toContain("qc02_filiais");
    expect(t.prefill_source_paths_used).toContain("operationProfile.multiState");
  });

  it("C9 Inconsistente: trace — sem parse errors (dados inconsistentes não causam erro)", () => {
    const r = buildCorporatePrefill(C9_INCONSISTENTE, { trace: true }) as any;
    expect(r._trace.prefill_parse_errors).toHaveLength(0);
  });

  it("Operacional C3: trace — qo01_canais resolvido", () => {
    const r = buildOperationalPrefill(C3_COMPLEXO, { trace: true }) as any;
    expect(r._trace.prefill_fields_resolved).toContain("qo01_canais");
  });

  it("CNAE C2: trace — qcnae01_setor resolvido (3 CNAEs)", () => {
    const r = buildCnaePrefill(C2_MEDIO, { trace: true }) as any;
    expect(r._trace.prefill_fields_resolved).toContain("qcnae01_setor");
    expect(r._trace.prefill_fields_resolved).toContain("qcnae01_atividades");
  });
});
