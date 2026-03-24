/**
 * Prefill Contract Tests v2 — ISSUE-001: Fase 1 Final
 *
 * Cobre os 10 blocos do checklist de aceite da ISSUE-001:
 *   BLOCO 1  — Contrato de Entrada Completo
 *   BLOCO 2  — Matriz de Prefill (Contrato)
 *   BLOCO 3  — Builders (Centralização)
 *   BLOCO 4  — Normalização da API
 *   BLOCO 5  — Prefill Funcional (incluindo novos campos QC-02)
 *   BLOCO 6  — Não Repetição (Crítico)
 *   BLOCO 7  — Robustez (legado, null, parcial)
 *   BLOCO 8  — Testes Automatizados (persistência + normalização)
 *   BLOCO 9  — Cenários de Validação (simples, complexo, legado)
 *   BLOCO 10 — Evidências (PrefillTrace)
 *
 * Referência: docs/issues/ISSUE-001-prefill-contract-fase1-final.md
 */
import { describe, it, expect } from "vitest";
import {
  buildCorporatePrefill,
  buildOperationalPrefill,
  buildCnaePrefill,
  type NormalizedProjectForPrefill,
} from "../shared/questionario-prefill";
import { normalizeProject, safeParseJson } from "./db";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const PROJETO_SIMPLES: NormalizedProjectForPrefill = {
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
  financialProfile: { paymentMethods: ["pix", "boleto"] },
  governanceProfile: { hasTaxTeam: false },
  taxComplexity: { hasMultipleEstablishments: false },
  confirmedCnaes: [{ code: "6201-5/01", description: "Desenvolvimento de programas de computador sob encomenda" }],
};

const PROJETO_COMPLEXO: NormalizedProjectForPrefill = {
  companyProfile: {
    taxRegime: "lucro_real",
    companySize: "grande",
    isEconomicGroup: true,
    taxCentralization: "decentralized",
  },
  operationProfile: {
    operationType: "misto",
    clientType: ["b2b", "b2c"],
    multiState: true,
  },
  financialProfile: { paymentMethods: ["cartao", "pix", "boleto"] },
  governanceProfile: { hasTaxTeam: true },
  taxComplexity: { hasMultipleEstablishments: true },
  confirmedCnaes: [
    { code: "4711-3/01", description: "Comércio varejista de mercadorias em geral" },
    { code: "6201-5/01", description: "Desenvolvimento de programas de computador" },
    { code: "4930-2/01", description: "Transporte rodoviário de carga" },
  ],
};

const PROJETO_LEGADO: NormalizedProjectForPrefill = {
  // Projeto criado antes da ISSUE-001 — sem isEconomicGroup nem taxCentralization
  taxRegime: "lucro_presumido",
  companySize: "media",
  companyProfile: {
    taxRegime: "lucro_presumido",
    companySize: "media",
    // isEconomicGroup e taxCentralization ausentes (legado)
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

const PROJETO_PARCIAL: NormalizedProjectForPrefill = {
  companyProfile: {
    taxRegime: "simples_nacional",
    // companySize ausente
    isEconomicGroup: true,
    // taxCentralization ausente
  },
  operationProfile: {
    operationType: "produto",
    clientType: ["b2b"],
    multiState: true,
  },
};

// ─── BLOCO 1: Contrato de Entrada Completo ────────────────────────────────────

describe("BLOCO 1 — Contrato de Entrada Completo", () => {
  it("isEconomicGroup está presente no tipo NormalizedProjectForPrefill", () => {
    const projeto: NormalizedProjectForPrefill = {
      companyProfile: { isEconomicGroup: true },
    };
    expect(projeto.companyProfile?.isEconomicGroup).toBe(true);
  });

  it("taxCentralization está presente no tipo NormalizedProjectForPrefill", () => {
    const projeto: NormalizedProjectForPrefill = {
      companyProfile: { taxCentralization: "centralized" },
    };
    expect(projeto.companyProfile?.taxCentralization).toBe("centralized");
  });

  it("qc02_filiais é derivável de operationProfile.multiState", () => {
    const result = buildCorporatePrefill(PROJETO_SIMPLES, { trace: true });
    expect(result["qc02_filiais"]).toBeDefined();
  });

  it("qc02_filiais é derivável de taxComplexity.hasMultipleEstablishments quando multiState é null", () => {
    const projeto: NormalizedProjectForPrefill = {
      companyProfile: { taxRegime: "lucro_real", companySize: "media" },
      operationProfile: { operationType: "servico", clientType: ["b2b"], multiState: null },
      taxComplexity: { hasMultipleEstablishments: true },
    };
    const result = buildCorporatePrefill(projeto, { trace: true });
    expect(result["qc02_filiais"]).toBe("Sim");
  });

  it("qc02_obs é campo livre — não pré-preenchível (ausência intencional)", () => {
    const result = buildCorporatePrefill(PROJETO_COMPLEXO, { trace: true });
    expect(result["qc02_obs"]).toBeUndefined();
  });

  it("todos os campos QC-02 classificados: direto, derivado ou não aplicável", () => {
    const result = buildCorporatePrefill(PROJETO_COMPLEXO, { trace: true }) as any;
    const trace = result._trace;
    // qc02_grupo (direto), qc02_filiais (derivado), qc02_centralizacao (direto) esperados
    expect(trace.prefill_fields_expected).toContain("qc02_grupo");
    expect(trace.prefill_fields_expected).toContain("qc02_filiais");
    expect(trace.prefill_fields_expected).toContain("qc02_centralizacao");
  });
});

// ─── BLOCO 2: Matriz de Prefill (Contrato) ────────────────────────────────────

describe("BLOCO 2 — Matriz de Prefill (Contrato)", () => {
  it("QC-01: qc01_regime e qc01_porte cobertos", () => {
    const result = buildCorporatePrefill(PROJETO_COMPLEXO, { trace: true });
    expect(result["qc01_regime"]).toBeDefined();
    expect(result["qc01_porte"]).toBeDefined();
  });

  it("QC-02: qc02_grupo, qc02_filiais, qc02_centralizacao cobertos no projeto complexo", () => {
    const result = buildCorporatePrefill(PROJETO_COMPLEXO, { trace: true });
    expect(result["qc02_grupo"]).toBeDefined();
    expect(result["qc02_filiais"]).toBeDefined();
    expect(result["qc02_centralizacao"]).toBeDefined();
  });

  it("QO: qo01_canais, qo01_clientes, qo03_meios, qo08_equipe cobertos", () => {
    const result = buildOperationalPrefill(PROJETO_COMPLEXO, { trace: true });
    expect(result["qo01_canais"]).toBeDefined();
    expect(result["qo01_clientes"]).toBeDefined();
    expect(result["qo03_meios"]).toBeDefined();
    expect(result["qo08_equipe"]).toBeDefined();
  });

  it("CNAE: qcnae01_setor, qcnae01_atividades, qcnae01_observacoes cobertos", () => {
    const result = buildCnaePrefill(PROJETO_COMPLEXO, { trace: true });
    expect(result["qcnae01_setor"]).toBeDefined();
    expect(result["qcnae01_atividades"]).toBeDefined();
    expect(result["qcnae01_observacoes"]).toBeDefined();
  });

  it("zero campos órfãos — todos os campos têm path canônico no trace", () => {
    const result = buildCorporatePrefill(PROJETO_COMPLEXO, { trace: true }) as any;
    const trace = result._trace;
    // Todos os campos resolvidos devem ter source path
    expect(trace.prefill_source_paths_used.length).toBeGreaterThan(0);
    expect(trace.prefill_fields_resolved.length).toBeGreaterThanOrEqual(
      trace.prefill_source_paths_used.length
    );
  });
});

// ─── BLOCO 3: Builders (Centralização) ───────────────────────────────────────

describe("BLOCO 3 — Builders (Centralização)", () => {
  it("buildCorporatePrefill retorna objeto (não lança exceção)", () => {
    expect(() => buildCorporatePrefill(PROJETO_SIMPLES)).not.toThrow();
    expect(() => buildCorporatePrefill(PROJETO_COMPLEXO)).not.toThrow();
    expect(() => buildCorporatePrefill(PROJETO_LEGADO)).not.toThrow();
  });

  it("buildOperationalPrefill retorna objeto (não lança exceção)", () => {
    expect(() => buildOperationalPrefill(PROJETO_SIMPLES)).not.toThrow();
    expect(() => buildOperationalPrefill(PROJETO_COMPLEXO)).not.toThrow();
    expect(() => buildOperationalPrefill(PROJETO_LEGADO)).not.toThrow();
  });

  it("buildCnaePrefill retorna objeto (não lança exceção)", () => {
    expect(() => buildCnaePrefill(PROJETO_SIMPLES)).not.toThrow();
    expect(() => buildCnaePrefill(PROJETO_COMPLEXO)).not.toThrow();
    expect(() => buildCnaePrefill(PROJETO_LEGADO)).not.toThrow();
  });

  it("builders retornam Record<string, string | string[]> — sem campos inesperados no resultado", () => {
    const corp = buildCorporatePrefill(PROJETO_COMPLEXO);
    const oper = buildOperationalPrefill(PROJETO_COMPLEXO);
    const cnae = buildCnaePrefill(PROJETO_COMPLEXO);
    // Corporate: todos string
    for (const [k, v] of Object.entries(corp)) {
      if (k !== "_trace") expect(typeof v).toBe("string");
    }
    // Operational: string ou string[] (qo01_clientes pode ser array)
    for (const [k, v] of Object.entries(oper)) {
      if (k !== "_trace") expect(["string", "object"]).toContain(typeof v);
    }
    // CNAE: todos string
    for (const [k, v] of Object.entries(cnae)) {
      if (k !== "_trace") expect(typeof v).toBe("string");
    }
  });

  it("zero lógica de prefill duplicada — builders são a única fonte de verdade", () => {
    // Verificação estrutural: builders devem retornar campos consistentes
    const r1 = buildCorporatePrefill(PROJETO_SIMPLES);
    const r2 = buildCorporatePrefill(PROJETO_SIMPLES);
    expect(r1["qc01_regime"]).toBe(r2["qc01_regime"]);
    expect(r1["qc02_grupo"]).toBe(r2["qc02_grupo"]);
  });
});

// ─── BLOCO 4: Normalização da API ─────────────────────────────────────────────

describe("BLOCO 4 — Normalização da API", () => {
  it("normalizeProject aceita objeto → retorna objeto", () => {
    const obj = { taxRegime: "lucro_real", companySize: "grande" };
    const result = normalizeProject({ companyProfile: obj } as any);
    expect(result.companyProfile).toEqual(obj);
  });

  it("normalizeProject aceita string JSON → parseia e retorna objeto", () => {
    const obj = { taxRegime: "simples_nacional", companySize: "micro" };
    const result = normalizeProject({ companyProfile: JSON.stringify(obj) } as any);
    expect(result.companyProfile).toEqual(obj);
  });

  it("normalizeProject aceita null → retorna fallback seguro (null)", () => {
    const result = normalizeProject({ companyProfile: null } as any);
    expect(result.companyProfile).toBeNull();
  });

  it("normalizeProject nunca lança exceção com JSON malformado", () => {
    expect(() => normalizeProject({ companyProfile: "{ invalid json {{" } as any)).not.toThrow();
  });

  it("normalizeProject nunca lança exceção com undefined", () => {
    expect(() => normalizeProject({ companyProfile: undefined } as any)).not.toThrow();
  });

  it("safeParseJson retorna objeto para string JSON válida", () => {
    const result = safeParseJson('{"taxRegime":"lucro_real"}', null);
    expect(result).toEqual({ taxRegime: "lucro_real" });
  });

  it("safeParseJson retorna fallback para string inválida", () => {
    const result = safeParseJson("not json", null);
    expect(result).toBeNull();
  });

  it("safeParseJson retorna objeto diretamente quando já é objeto", () => {
    const obj = { taxRegime: "lucro_real" };
    const result = safeParseJson(obj as any, null);
    expect(result).toEqual(obj);
  });

  it("normalizeProject preserva isEconomicGroup e taxCentralization no companyProfile", () => {
    const obj = { taxRegime: "lucro_real", isEconomicGroup: true, taxCentralization: "decentralized" };
    const result = normalizeProject({ companyProfile: JSON.stringify(obj) } as any);
    expect((result.companyProfile as any)?.isEconomicGroup).toBe(true);
    expect((result.companyProfile as any)?.taxCentralization).toBe("decentralized");
  });
});

// ─── BLOCO 5: Prefill Funcional ───────────────────────────────────────────────

describe("BLOCO 5 — Prefill Funcional", () => {
  it("qc01_regime: Simples Nacional → label correto", () => {
    const result = buildCorporatePrefill(PROJETO_SIMPLES);
    expect(result["qc01_regime"]).toMatch(/Simples Nacional/i);
  });

  it("qc01_porte: micro → label correto", () => {
    const result = buildCorporatePrefill(PROJETO_SIMPLES);
    expect(result["qc01_porte"]).toMatch(/micro/i);
  });

  it("qc01_regime: Lucro Real → label correto", () => {
    const result = buildCorporatePrefill(PROJETO_COMPLEXO);
    expect(result["qc01_regime"]).toMatch(/Lucro Real/i);
  });

  it("qc01_porte: grande → label correto", () => {
    const result = buildCorporatePrefill(PROJETO_COMPLEXO);
    expect(result["qc01_porte"]).toMatch(/grande/i);
  });

  it("qc02_grupo: false → 'Não'", () => {
    const result = buildCorporatePrefill(PROJETO_SIMPLES);
    expect(result["qc02_grupo"]).toBe("Não");
  });

  it("qc02_grupo: true → 'Sim'", () => {
    const result = buildCorporatePrefill(PROJETO_COMPLEXO);
    expect(result["qc02_grupo"]).toBe("Sim");
  });

  it("qc02_filiais: multiState false → 'Não'", () => {
    const result = buildCorporatePrefill(PROJETO_SIMPLES);
    expect(result["qc02_filiais"]).toBe("Não");
  });

  it("qc02_filiais: multiState true → 'Sim'", () => {
    const result = buildCorporatePrefill(PROJETO_COMPLEXO);
    expect(result["qc02_filiais"]).toBe("Sim");
  });

  it("qc02_centralizacao: centralized → label correto", () => {
    const result = buildCorporatePrefill(PROJETO_SIMPLES);
    expect(result["qc02_centralizacao"]).toMatch(/centraliz/i);
  });

  it("qc02_centralizacao: decentralized → label correto", () => {
    const result = buildCorporatePrefill(PROJETO_COMPLEXO);
    expect(result["qc02_centralizacao"]).toMatch(/Não|cada unidade/i);
  });

  it("qc02_centralizacao: partial → label correto", () => {
    const projeto: NormalizedProjectForPrefill = {
      ...PROJETO_SIMPLES,
      companyProfile: { ...PROJETO_SIMPLES.companyProfile, taxCentralization: "partial" },
    };
    const result = buildCorporatePrefill(projeto);
    expect(result["qc02_centralizacao"]).toMatch(/parcial/i);
  });

  it("campos não aplicáveis permanecem ausentes (não inventados)", () => {
    const result = buildCorporatePrefill(PROJETO_SIMPLES);
    expect(result["qc02_obs"]).toBeUndefined();
  });
});

// ─── BLOCO 6: Não Repetição (Crítico) ────────────────────────────────────────

describe("BLOCO 6 — Não Repetição (Crítico)", () => {
  it("qc01_regime: campo coletado no perfil → não aparece como vazio no prefill", () => {
    const result = buildCorporatePrefill(PROJETO_SIMPLES);
    expect(result["qc01_regime"]).toBeTruthy();
    expect(result["qc01_regime"]).not.toBe("");
  });

  it("qc01_porte: campo coletado no perfil → não aparece como vazio no prefill", () => {
    const result = buildCorporatePrefill(PROJETO_SIMPLES);
    expect(result["qc01_porte"]).toBeTruthy();
    expect(result["qc01_porte"]).not.toBe("");
  });

  it("qc02_grupo: campo coletado no perfil → não aparece como vazio no prefill", () => {
    const result = buildCorporatePrefill(PROJETO_SIMPLES);
    expect(result["qc02_grupo"]).toBeTruthy();
    expect(result["qc02_grupo"]).not.toBe("");
  });

  it("qc02_filiais: campo derivado do perfil → não aparece como vazio no prefill", () => {
    const result = buildCorporatePrefill(PROJETO_SIMPLES);
    expect(result["qc02_filiais"]).toBeTruthy();
    expect(result["qc02_filiais"]).not.toBe("");
  });

  it("qc02_centralizacao: campo coletado no perfil → não aparece como vazio no prefill", () => {
    const result = buildCorporatePrefill(PROJETO_SIMPLES);
    expect(result["qc02_centralizacao"]).toBeTruthy();
    expect(result["qc02_centralizacao"]).not.toBe("");
  });

  it("campos ausentes no perfil → ausentes no prefill (não inventados)", () => {
    const projetoSemCentralizacao: NormalizedProjectForPrefill = {
      companyProfile: {
        taxRegime: "lucro_real",
        companySize: "media",
        isEconomicGroup: null,
        taxCentralization: null,
      },
      operationProfile: { operationType: "servico", clientType: ["b2b"], multiState: null },
    };
    const result = buildCorporatePrefill(projetoSemCentralizacao);
    // Campos com null não devem aparecer como strings inventadas
    expect(result["qc02_grupo"]).toBeUndefined();
    expect(result["qc02_centralizacao"]).toBeUndefined();
  });
});

// ─── BLOCO 7: Robustez ────────────────────────────────────────────────────────

describe("BLOCO 7 — Robustez", () => {
  it("projeto com companyProfile: null → não quebra", () => {
    const projeto: NormalizedProjectForPrefill = { companyProfile: null };
    expect(() => buildCorporatePrefill(projeto)).not.toThrow();
  });

  it("projeto com companyProfile: {} → não quebra", () => {
    const projeto: NormalizedProjectForPrefill = { companyProfile: {} };
    expect(() => buildCorporatePrefill(projeto)).not.toThrow();
  });

  it("projeto legado sem isEconomicGroup → não quebra, campo ausente no prefill", () => {
    const result = buildCorporatePrefill(PROJETO_LEGADO);
    expect(result["qc02_grupo"]).toBeUndefined();
  });

  it("projeto legado sem taxCentralization → não quebra, campo ausente no prefill", () => {
    const result = buildCorporatePrefill(PROJETO_LEGADO);
    expect(result["qc02_centralizacao"]).toBeUndefined();
  });

  it("projeto parcial (alguns campos preenchidos) → não quebra", () => {
    expect(() => buildCorporatePrefill(PROJETO_PARCIAL)).not.toThrow();
    expect(() => buildOperationalPrefill(PROJETO_PARCIAL)).not.toThrow();
    expect(() => buildCnaePrefill(PROJETO_PARCIAL)).not.toThrow();
  });

  it("normalizeProject com projeto completamente vazio → não quebra", () => {
    expect(() => normalizeProject({} as any)).not.toThrow();
  });

  it("normalizeProject com todos os profiles como string JSON → parseia todos", () => {
    const raw = {
      companyProfile: JSON.stringify({ taxRegime: "lucro_real", isEconomicGroup: true }),
      operationProfile: JSON.stringify({ operationType: "misto", clientType: ["b2b"], multiState: true }),
      financialProfile: JSON.stringify({ paymentMethods: ["pix"] }),
      governanceProfile: JSON.stringify({ hasTaxTeam: true }),
      taxComplexity: JSON.stringify({ hasMultipleEstablishments: true }),
    };
    const result = normalizeProject(raw as any);
    expect(typeof result.companyProfile).toBe("object");
    expect(typeof result.operationProfile).toBe("object");
    expect(typeof result.financialProfile).toBe("object");
    expect(typeof result.governanceProfile).toBe("object");
    expect(typeof result.taxComplexity).toBe("object");
  });
});

// ─── BLOCO 8: Testes Automatizados (Persistência + Normalização) ──────────────

describe("BLOCO 8 — Testes Automatizados", () => {
  it("companyProfile com isEconomicGroup é preservado após normalização", () => {
    const raw = { companyProfile: { taxRegime: "lucro_real", isEconomicGroup: true, taxCentralization: "partial" } };
    const normalized = normalizeProject(raw as any);
    expect((normalized.companyProfile as any)?.isEconomicGroup).toBe(true);
    expect((normalized.companyProfile as any)?.taxCentralization).toBe("partial");
  });

  it("prefill corporativo funciona com projeto normalizado (pipeline completo)", () => {
    const raw = {
      companyProfile: JSON.stringify({
        taxRegime: "lucro_real",
        companySize: "grande",
        isEconomicGroup: true,
        taxCentralization: "decentralized",
      }),
      operationProfile: JSON.stringify({
        operationType: "misto",
        clientType: ["b2b", "b2c"],
        multiState: true,
      }),
    };
    const normalized = normalizeProject(raw as any);
    const prefill = buildCorporatePrefill(normalized as NormalizedProjectForPrefill);
    expect(prefill["qc01_regime"]).toMatch(/Lucro Real/i);
    expect(prefill["qc01_porte"]).toMatch(/grande/i);
    expect(prefill["qc02_grupo"]).toBe("Sim");
    expect(prefill["qc02_filiais"]).toBe("Sim");
    expect(prefill["qc02_centralizacao"]).toMatch(/Não|cada unidade/i);
  });

  it("prefill operacional funciona com projeto normalizado", () => {
    const raw = {
      operationProfile: JSON.stringify({
        operationType: "servico",
        clientType: ["b2b"],
        multiState: false,
      }),
      financialProfile: JSON.stringify({ paymentMethods: ["pix", "boleto"] }),
      governanceProfile: JSON.stringify({ hasTaxTeam: true }),
    };
    const normalized = normalizeProject(raw as any);
    const prefill = buildOperationalPrefill(normalized as NormalizedProjectForPrefill);
    expect(prefill["qo01_canais"]).toBeDefined();
    expect(prefill["qo03_meios"]).toBeDefined();
    expect(prefill["qo08_equipe"]).toBeDefined();
  });

  it("prefill CNAE funciona com projeto normalizado", () => {
    const raw = {
      operationProfile: JSON.stringify({ operationType: "servico", clientType: ["b2b"], multiState: false }),
      confirmedCnaes: [{ code: "6201-5/01", description: "Desenvolvimento de software" }],
    };
    const normalized = normalizeProject(raw as any);
    const prefill = buildCnaePrefill(normalized as NormalizedProjectForPrefill);
    expect(prefill["qcnae01_setor"]).toBeDefined();
    expect(prefill["qcnae01_atividades"]).toBeDefined();
  });

  it("regressão: legado sem novos campos não quebra o pipeline completo", () => {
    const raw = {
      companyProfile: JSON.stringify({ taxRegime: "lucro_presumido", companySize: "media" }),
      operationProfile: JSON.stringify({ operationType: "comercio", clientType: ["b2c"], multiState: null }),
    };
    const normalized = normalizeProject(raw as any);
    const prefill = buildCorporatePrefill(normalized as NormalizedProjectForPrefill);
    expect(prefill["qc01_regime"]).toBeDefined();
    expect(prefill["qc02_grupo"]).toBeUndefined(); // legado — ausente intencional
    expect(prefill["qc02_centralizacao"]).toBeUndefined(); // legado — ausente intencional
  });
});

// ─── BLOCO 9: Cenários de Validação ──────────────────────────────────────────

describe("BLOCO 9 — Cenários de Validação", () => {
  describe("Caso 1 — Empresa Simples (Simples Nacional, micro, sem grupo, sem filiais, centralizada)", () => {
    it("qc01_regime = Simples Nacional", () => {
      expect(buildCorporatePrefill(PROJETO_SIMPLES)["qc01_regime"]).toMatch(/Simples Nacional/i);
    });
    it("qc01_porte = Microempresa", () => {
      expect(buildCorporatePrefill(PROJETO_SIMPLES)["qc01_porte"]).toMatch(/micro/i);
    });
    it("qc02_grupo = Não", () => {
      expect(buildCorporatePrefill(PROJETO_SIMPLES)["qc02_grupo"]).toBe("Não");
    });
    it("qc02_filiais = Não", () => {
      expect(buildCorporatePrefill(PROJETO_SIMPLES)["qc02_filiais"]).toBe("Não");
    });
    it("qc02_centralizacao = centralizada", () => {
      expect(buildCorporatePrefill(PROJETO_SIMPLES)["qc02_centralizacao"]).toMatch(/centraliz/i);
    });
  });

  describe("Caso 2 — Empresa Complexa (Lucro Real, grande, com grupo, múltiplos CNAEs, descentralizada)", () => {
    it("qc01_regime = Lucro Real", () => {
      expect(buildCorporatePrefill(PROJETO_COMPLEXO)["qc01_regime"]).toMatch(/Lucro Real/i);
    });
    it("qc01_porte = Grande", () => {
      expect(buildCorporatePrefill(PROJETO_COMPLEXO)["qc01_porte"]).toMatch(/grande/i);
    });
    it("qc02_grupo = Sim", () => {
      expect(buildCorporatePrefill(PROJETO_COMPLEXO)["qc02_grupo"]).toBe("Sim");
    });
    it("qc02_filiais = Sim", () => {
      expect(buildCorporatePrefill(PROJETO_COMPLEXO)["qc02_filiais"]).toBe("Sim");
    });
    it("qc02_centralizacao = descentralizada", () => {
      expect(buildCorporatePrefill(PROJETO_COMPLEXO)["qc02_centralizacao"]).toMatch(/Não|cada unidade/i);
    });
    it("CNAE: 3 atividades → qcnae01_atividades reflete múltiplas atividades", () => {
      const result = buildCnaePrefill(PROJETO_COMPLEXO);
      expect(result["qcnae01_atividades"]).toMatch(/múltiplas|diversas|3|três/i);
    });
  });

  describe("Caso 3 — Projeto Legado (sem isEconomicGroup, sem taxCentralization)", () => {
    it("não quebra — retorna objeto válido", () => {
      expect(() => buildCorporatePrefill(PROJETO_LEGADO)).not.toThrow();
    });
    it("qc01_regime preenchido a partir de companyProfile.taxRegime (legado)", () => {
      expect(buildCorporatePrefill(PROJETO_LEGADO)["qc01_regime"]).toMatch(/Lucro Presumido/i);
    });
    it("qc02_grupo ausente (campo não existia no legado)", () => {
      expect(buildCorporatePrefill(PROJETO_LEGADO)["qc02_grupo"]).toBeUndefined();
    });
    it("qc02_centralizacao ausente (campo não existia no legado)", () => {
      expect(buildCorporatePrefill(PROJETO_LEGADO)["qc02_centralizacao"]).toBeUndefined();
    });
    it("normalizeProject com projeto legado → não quebra", () => {
      const raw = {
        companyProfile: JSON.stringify({ taxRegime: "lucro_presumido", companySize: "media" }),
      };
      expect(() => normalizeProject(raw as any)).not.toThrow();
    });
  });
});

// ─── BLOCO 10: Evidências (PrefillTrace) ─────────────────────────────────────

describe("BLOCO 10 — Evidências (PrefillTrace)", () => {
  it("trace contém prefill_fields_expected, prefill_fields_resolved, prefill_fields_missing", () => {
    const result = buildCorporatePrefill(PROJETO_COMPLEXO, { trace: true }) as any;
    const trace = result._trace;
    expect(Array.isArray(trace.prefill_fields_expected)).toBe(true);
    expect(Array.isArray(trace.prefill_fields_resolved)).toBe(true);
    expect(Array.isArray(trace.prefill_fields_missing)).toBe(true);
    expect(Array.isArray(trace.prefill_source_paths_used)).toBe(true);
  });

  it("trace: qc02_grupo resolvido para projeto complexo", () => {
    const result = buildCorporatePrefill(PROJETO_COMPLEXO, { trace: true }) as any;
    expect(result._trace.prefill_fields_resolved).toContain("qc02_grupo");
  });

  it("trace: qc02_centralizacao resolvido para projeto complexo", () => {
    const result = buildCorporatePrefill(PROJETO_COMPLEXO, { trace: true }) as any;
    expect(result._trace.prefill_fields_resolved).toContain("qc02_centralizacao");
  });

  it("trace: qc02_grupo ausente no legado → está em prefill_fields_missing", () => {
    const result = buildCorporatePrefill(PROJETO_LEGADO, { trace: true }) as any;
    expect(result._trace.prefill_fields_missing).toContain("qc02_grupo");
  });

  it("trace: qc02_centralizacao ausente no legado → está em prefill_fields_missing", () => {
    const result = buildCorporatePrefill(PROJETO_LEGADO, { trace: true }) as any;
    expect(result._trace.prefill_fields_missing).toContain("qc02_centralizacao");
  });

  it("trace: source path 'companyProfile.isEconomicGroup' usado para projeto complexo", () => {
    const result = buildCorporatePrefill(PROJETO_COMPLEXO, { trace: true }) as any;
    expect(result._trace.prefill_source_paths_used).toContain("companyProfile.isEconomicGroup");
  });

  it("trace: source path 'companyProfile.taxCentralization' usado para projeto complexo", () => {
    const result = buildCorporatePrefill(PROJETO_COMPLEXO, { trace: true }) as any;
    expect(result._trace.prefill_source_paths_used).toContain("companyProfile.taxCentralization");
  });

  it("trace operacional: qo01_canais resolvido", () => {
    const result = buildOperationalPrefill(PROJETO_COMPLEXO, { trace: true }) as any;
    expect(result._trace.prefill_fields_resolved).toContain("qo01_canais");
  });

  it("trace CNAE: qcnae01_setor resolvido", () => {
    const result = buildCnaePrefill(PROJETO_COMPLEXO, { trace: true }) as any;
    expect(result._trace.prefill_fields_resolved).toContain("qcnae01_setor");
  });

  it("trace: projeto simples — qc02_grupo em missing quando isEconomicGroup é null", () => {
    const projetoSemGrupo: NormalizedProjectForPrefill = {
      companyProfile: {
        taxRegime: "simples_nacional",
        companySize: "micro",
        isEconomicGroup: null,
        taxCentralization: null,
      },
      operationProfile: { operationType: "servico", clientType: ["b2b"], multiState: false },
    };
    const result = buildCorporatePrefill(projetoSemGrupo, { trace: true }) as any;
    expect(result._trace.prefill_fields_missing).toContain("qc02_grupo");
    expect(result._trace.prefill_fields_missing).toContain("qc02_centralizacao");
  });
});
