/**
 * prefill-contract.test.ts
 *
 * PREFILL CONTRACT TEST SUITE (PCT) — Sub-Sprint Estrutural
 * Cobre os 10 blocos do Checklist de Aceite do Prefill Contract v3
 *
 * Invariante crítico:
 *   "campo_coletado_no_perfil → nunca reaparece vazio no questionário"
 *
 * Blocos cobertos:
 *   BLOCO 1  — Fonte da Verdade (Persistência)
 *   BLOCO 2  — Normalização da API
 *   BLOCO 3  — Builders de Prefill (Shared)
 *   BLOCO 4  — Matriz de Prefill (Contrato)
 *   BLOCO 5  — Não Repetição de Perguntas (Crítico)
 *   BLOCO 6  — Prefill Funcional (direto, derivado, não aplicável)
 *   BLOCO 7  — Robustez (Edge Cases)
 *   BLOCO 8  — Logs e Rastreabilidade (PrefillTrace)
 *   BLOCO 9  — Testes Automatizados (cobertura mínima)
 *   BLOCO 10 — Casos de Validação (Simples, Complexo, Inconsistente)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  buildCorporatePrefill,
  buildOperationalPrefill,
  buildCnaePrefill,
  getPrefilledSectionsOperacional,
  getPrefilledSectionsCnae,
  TAX_REGIME_MAP,
  COMPANY_SIZE_MAP,
  OPERATION_TYPE_TO_CANAIS,
  OPERATION_TYPE_TO_SETOR,
  PAYMENT_METHOD_MAP,
  clientTypeToPerfilClientes,
  hasTaxTeamToEquipe,
  cnaeCountToAtividades,
  cnaesToObservacoes,
  type NormalizedProjectForPrefill,
} from "../shared/questionario-prefill";
import { safeParseJson, normalizeProject } from "./db";
import * as db from "./db";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const PROJETO_SIMPLES: NormalizedProjectForPrefill = {
  companyProfile: { taxRegime: "lucro_presumido", companySize: "media" },
  operationProfile: { operationType: "servicos", clientType: ["b2b"] },
  financialProfile: { paymentMethods: ["pix", "boleto"] },
  governanceProfile: { hasTaxTeam: false },
  taxComplexity: { hasMultipleEstablishments: false },
  confirmedCnaes: [{ code: "6201-5/01", description: "Desenvolvimento de programas de computador sob encomenda" }],
};

const PROJETO_COMPLEXO: NormalizedProjectForPrefill = {
  companyProfile: { taxRegime: "lucro_real", companySize: "grande" },
  operationProfile: { operationType: "misto", clientType: ["b2b", "b2c"], multiState: true },
  financialProfile: { paymentMethods: ["pix", "cartao", "boleto", "transferencia"] },
  governanceProfile: { hasTaxTeam: true },
  taxComplexity: { hasMultipleEstablishments: true },
  confirmedCnaes: [
    { code: "4711-3/01", description: "Comércio varejista de mercadorias em geral" },
    { code: "4711-3/02", description: "Comércio varejista de mercadorias em geral - hipermercados" },
    { code: "6201-5/01", description: "Desenvolvimento de programas de computador" },
    { code: "6202-3/00", description: "Desenvolvimento e licenciamento de programas de computador" },
    { code: "6209-1/00", description: "Suporte técnico, manutenção e outros serviços" },
  ],
};

const PROJETO_INCONSISTENTE: NormalizedProjectForPrefill = {
  // taxRegime em coluna direta (legado) mas companyProfile vazio
  taxRegime: "simples_nacional",
  companySize: "micro",
  companyProfile: null,
  operationProfile: null,
  financialProfile: null,
  governanceProfile: null,
  taxComplexity: null,
  confirmedCnaes: [],
};

const PROJETO_VAZIO: NormalizedProjectForPrefill = {
  companyProfile: null,
  operationProfile: null,
  financialProfile: null,
  governanceProfile: null,
  taxComplexity: null,
  confirmedCnaes: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2 — NORMALIZAÇÃO DA API (safeParseJson + normalizeProject)
// ─────────────────────────────────────────────────────────────────────────────

describe("BLOCO 2 — Normalização da API", () => {
  it("safeParseJson: objeto já parseado retorna como está", () => {
    const obj = { taxRegime: "lucro_real" };
    expect(safeParseJson(obj, null)).toBe(obj);
  });

  it("safeParseJson: string JSON é parseada corretamente", () => {
    const str = JSON.stringify({ taxRegime: "lucro_real", companySize: "grande" });
    const result = safeParseJson(str, null) as any;
    expect(result?.taxRegime).toBe("lucro_real");
    expect(result?.companySize).toBe("grande");
  });

  it("safeParseJson: null retorna fallback", () => {
    expect(safeParseJson(null, { default: true })).toEqual({ default: true });
  });

  it("safeParseJson: undefined retorna fallback", () => {
    expect(safeParseJson(undefined, [])).toEqual([]);
  });

  it("safeParseJson: string JSON inválida retorna fallback sem lançar erro", () => {
    expect(safeParseJson("{ invalid json }", null)).toBeNull();
  });

  it("normalizeProject: campos JSON como string são convertidos para objeto", () => {
    const raw = {
      id: 1,
      name: "Test",
      companyProfile: JSON.stringify({ taxRegime: "lucro_real", companySize: "grande" }),
      operationProfile: JSON.stringify({ operationType: "misto", clientType: ["b2b"] }),
      confirmedCnaes: JSON.stringify([{ code: "1234-5/00" }]),
    } as any;
    const normalized = normalizeProject(raw);
    expect(typeof normalized.companyProfile).toBe("object");
    expect((normalized.companyProfile as any)?.taxRegime).toBe("lucro_real");
    expect(typeof normalized.operationProfile).toBe("object");
    expect(Array.isArray(normalized.confirmedCnaes)).toBe(true);
    expect((normalized.confirmedCnaes as any[])[0]?.code).toBe("1234-5/00");
  });

  it("normalizeProject: campos já como objeto não são alterados", () => {
    const raw = {
      id: 1,
      companyProfile: { taxRegime: "lucro_presumido" },
      confirmedCnaes: [{ code: "1234-5/00" }],
    } as any;
    const normalized = normalizeProject(raw);
    expect((normalized.companyProfile as any)?.taxRegime).toBe("lucro_presumido");
    expect((normalized.confirmedCnaes as any[])[0]?.code).toBe("1234-5/00");
  });

  it("normalizeProject: campos null permanecem null (exceto confirmedCnaes que vira [])", () => {
    const raw = { id: 1, companyProfile: null, confirmedCnaes: null } as any;
    const normalized = normalizeProject(raw);
    expect(normalized.companyProfile).toBeNull();
    expect(normalized.confirmedCnaes).toEqual([]);
  });

  it("normalizeProject: não lança erro com objeto null/undefined", () => {
    expect(() => normalizeProject(null as any)).not.toThrow();
    expect(normalizeProject(null as any)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3 — BUILDERS DE PREFILL (Centralização)
// ─────────────────────────────────────────────────────────────────────────────

describe("BLOCO 3 — Builders de Prefill (Centralização)", () => {
  it("buildCorporatePrefill é uma função exportada do shared", () => {
    expect(typeof buildCorporatePrefill).toBe("function");
  });

  it("buildOperationalPrefill é uma função exportada do shared", () => {
    expect(typeof buildOperationalPrefill).toBe("function");
  });

  it("buildCnaePrefill é uma função exportada do shared", () => {
    expect(typeof buildCnaePrefill).toBe("function");
  });

  it("buildCorporatePrefill retorna objeto (nunca lança erro)", () => {
    expect(() => buildCorporatePrefill(PROJETO_SIMPLES)).not.toThrow();
    expect(typeof buildCorporatePrefill(PROJETO_SIMPLES)).toBe("object");
  });

  it("buildOperationalPrefill retorna objeto (nunca lança erro)", () => {
    expect(() => buildOperationalPrefill(PROJETO_SIMPLES)).not.toThrow();
    expect(typeof buildOperationalPrefill(PROJETO_SIMPLES)).toBe("object");
  });

  it("buildCnaePrefill retorna objeto (nunca lança erro)", () => {
    expect(() => buildCnaePrefill(PROJETO_SIMPLES)).not.toThrow();
    expect(typeof buildCnaePrefill(PROJETO_SIMPLES)).toBe("object");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4 — MATRIZ DE PREFILL (Contrato)
// ─────────────────────────────────────────────────────────────────────────────

describe("BLOCO 4 — Matriz de Prefill (Contrato)", () => {
  describe("TAX_REGIME_MAP — cobertura completa", () => {
    it("cobre simples_nacional", () => expect(TAX_REGIME_MAP["simples_nacional"]).toBeTruthy());
    it("cobre lucro_presumido", () => expect(TAX_REGIME_MAP["lucro_presumido"]).toBeTruthy());
    it("cobre lucro_real", () => expect(TAX_REGIME_MAP["lucro_real"]).toBeTruthy());
    it("cobre mei", () => expect(TAX_REGIME_MAP["mei"]).toBeTruthy());
  });

  describe("COMPANY_SIZE_MAP — cobertura completa", () => {
    it("cobre mei", () => expect(COMPANY_SIZE_MAP["mei"]).toBeTruthy());
    it("cobre micro", () => expect(COMPANY_SIZE_MAP["micro"]).toBeTruthy());
    it("cobre pequena", () => expect(COMPANY_SIZE_MAP["pequena"]).toBeTruthy());
    it("cobre media", () => expect(COMPANY_SIZE_MAP["media"]).toBeTruthy());
    it("cobre grande", () => expect(COMPANY_SIZE_MAP["grande"]).toBeTruthy());
  });

  describe("OPERATION_TYPE_TO_CANAIS — cobertura completa", () => {
    const tipos = ["industria", "comercio", "servicos", "misto", "agronegocio", "financeiro", "produto", "servico"];
    tipos.forEach(tipo => {
      it(`cobre ${tipo}`, () => {
        expect(Array.isArray(OPERATION_TYPE_TO_CANAIS[tipo])).toBe(true);
        expect(OPERATION_TYPE_TO_CANAIS[tipo].length).toBeGreaterThan(0);
      });
    });
  });

  describe("OPERATION_TYPE_TO_SETOR — cobertura completa", () => {
    const tipos = ["industria", "comercio", "servicos", "misto", "agronegocio", "financeiro", "produto", "servico"];
    tipos.forEach(tipo => {
      it(`cobre ${tipo}`, () => {
        expect(typeof OPERATION_TYPE_TO_SETOR[tipo]).toBe("string");
        expect(OPERATION_TYPE_TO_SETOR[tipo].length).toBeGreaterThan(0);
      });
    });
  });

  describe("PAYMENT_METHOD_MAP — cobertura completa", () => {
    const metodos = ["pix", "cartao", "boleto", "transferencia", "dinheiro", "marketplace"];
    metodos.forEach(m => {
      it(`cobre ${m}`, () => expect(PAYMENT_METHOD_MAP[m]).toBeTruthy());
    });
  });

  it("campos sem prefill legítimo NÃO estão no buildCorporatePrefill (qc02_grupo, qc02_centralizacao)", () => {
    const prefill = buildCorporatePrefill(PROJETO_COMPLEXO);
    // DA-4: qc02_grupo e qc02_centralizacao não são coletados no formulário inicial
    expect(prefill["qc02_grupo"]).toBeUndefined();
    expect(prefill["qc02_centralizacao"]).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 5 — NÃO REPETIÇÃO DE PERGUNTAS (Crítico)
// ─────────────────────────────────────────────────────────────────────────────

describe("BLOCO 5 — Não Repetição de Perguntas (Invariante Crítico)", () => {
  it("regime tributário coletado → qc01_regime preenchido (não reaparece vazio)", () => {
    const prefill = buildCorporatePrefill(PROJETO_SIMPLES);
    expect(prefill["qc01_regime"]).toBeTruthy();
    expect(prefill["qc01_regime"]).not.toBe("");
  });

  it("porte coletado → qc01_porte preenchido (não reaparece vazio)", () => {
    const prefill = buildCorporatePrefill(PROJETO_SIMPLES);
    expect(prefill["qc01_porte"]).toBeTruthy();
    expect(prefill["qc01_porte"]).not.toBe("");
  });

  it("operationType coletado → qo01_canais preenchido (não reaparece vazio)", () => {
    const prefill = buildOperationalPrefill(PROJETO_SIMPLES);
    expect(prefill["qo01_canais"]).toBeTruthy();
  });

  it("clientType coletado → qo01_clientes preenchido (não reaparece vazio)", () => {
    const prefill = buildOperationalPrefill(PROJETO_SIMPLES);
    expect(prefill["qo01_clientes"]).toBeTruthy();
    expect(prefill["qo01_clientes"]).not.toBe("");
  });

  it("paymentMethods coletados → qo03_meios preenchido (não reaparece vazio)", () => {
    const prefill = buildOperationalPrefill(PROJETO_SIMPLES);
    expect(Array.isArray(prefill["qo03_meios"])).toBe(true);
    expect((prefill["qo03_meios"] as string[]).length).toBeGreaterThan(0);
  });

  it("hasTaxTeam coletado → qo08_equipe preenchido (não reaparece vazio)", () => {
    const prefill = buildOperationalPrefill(PROJETO_SIMPLES);
    expect(prefill["qo08_equipe"]).toBeTruthy();
    expect(prefill["qo08_equipe"]).not.toBe("");
  });

  it("operationType coletado → qcnae01_setor preenchido (não reaparece vazio)", () => {
    const prefill = buildCnaePrefill(PROJETO_SIMPLES);
    expect(prefill["qcnae01_setor"]).toBeTruthy();
    expect(prefill["qcnae01_setor"]).not.toBe("");
  });

  it("confirmedCnaes coletados → qcnae01_atividades preenchido (não reaparece vazio)", () => {
    const prefill = buildCnaePrefill(PROJETO_SIMPLES);
    expect(prefill["qcnae01_atividades"]).toBeTruthy();
    expect(prefill["qcnae01_atividades"]).not.toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 6 — PREFILL FUNCIONAL (direto, derivado, não aplicável)
// ─────────────────────────────────────────────────────────────────────────────

describe("BLOCO 6 — Prefill Funcional", () => {
  describe("Campos diretos — QC-01", () => {
    it("lucro_presumido → 'Lucro Presumido'", () => {
      const p = buildCorporatePrefill(PROJETO_SIMPLES);
      expect(p["qc01_regime"]).toBe("Lucro Presumido");
    });

    it("lucro_real → 'Lucro Real'", () => {
      const p = buildCorporatePrefill(PROJETO_COMPLEXO);
      expect(p["qc01_regime"]).toBe("Lucro Real");
    });

    it("simples_nacional → 'Simples Nacional'", () => {
      const p = buildCorporatePrefill({ companyProfile: { taxRegime: "simples_nacional", companySize: "micro" } });
      expect(p["qc01_regime"]).toBe("Simples Nacional");
    });

    it("media → 'Médio porte (até R$ 78 mi)'", () => {
      const p = buildCorporatePrefill(PROJETO_SIMPLES);
      expect(p["qc01_porte"]).toBe("Médio porte (até R$ 78 mi)");
    });

    it("grande → 'Grande porte (acima de R$ 78 mi)'", () => {
      const p = buildCorporatePrefill(PROJETO_COMPLEXO);
      expect(p["qc01_porte"]).toBe("Grande porte (acima de R$ 78 mi)");
    });
  });

  describe("Campos derivados — QC-02", () => {
    it("multiState=true → qc02_filiais='Sim'", () => {
      const p = buildCorporatePrefill(PROJETO_COMPLEXO);
      expect(p["qc02_filiais"]).toBe("Sim");
    });

    it("hasMultipleEstablishments=false → qc02_filiais='Não'", () => {
      const p = buildCorporatePrefill(PROJETO_SIMPLES);
      expect(p["qc02_filiais"]).toBe("Não");
    });

    it("multiState tem prioridade sobre hasMultipleEstablishments", () => {
      const proj: NormalizedProjectForPrefill = {
        operationProfile: { multiState: true },
        taxComplexity: { hasMultipleEstablishments: false },
      };
      const p = buildCorporatePrefill(proj);
      expect(p["qc02_filiais"]).toBe("Sim");
    });
  });

  describe("Campos derivados — QO", () => {
    it("servicos → canais=['Venda direta B2B']", () => {
      const p = buildOperationalPrefill(PROJETO_SIMPLES);
      expect(p["qo01_canais"]).toEqual(["Venda direta B2B"]);
    });

    it("misto → canais=['Loja física', 'Venda direta B2B']", () => {
      const p = buildOperationalPrefill(PROJETO_COMPLEXO);
      expect(p["qo01_canais"]).toEqual(["Loja física", "Venda direta B2B"]);
    });

    it("b2b only → 'Pessoa Jurídica (B2B)'", () => {
      const p = buildOperationalPrefill(PROJETO_SIMPLES);
      expect(p["qo01_clientes"]).toBe("Pessoa Jurídica (B2B)");
    });

    it("b2b+b2c → 'Misto (B2B e B2C)'", () => {
      const p = buildOperationalPrefill(PROJETO_COMPLEXO);
      expect(p["qo01_clientes"]).toBe("Misto (B2B e B2C)");
    });

    it("pix+boleto → meios corretos", () => {
      const p = buildOperationalPrefill(PROJETO_SIMPLES);
      const meios = p["qo03_meios"] as string[];
      expect(meios).toContain("Pix");
      expect(meios).toContain("Boleto bancário");
    });

    it("hasTaxTeam=false → 'Contador autônomo'", () => {
      const p = buildOperationalPrefill(PROJETO_SIMPLES);
      expect(p["qo08_equipe"]).toBe("Contador autônomo");
    });

    it("hasTaxTeam=true → 'Equipe interna dedicada'", () => {
      const p = buildOperationalPrefill(PROJETO_COMPLEXO);
      expect(p["qo08_equipe"]).toBe("Equipe interna dedicada");
    });
  });

  describe("Campos derivados — CNAE", () => {
    it("servicos → setor='Serviços (geral)'", () => {
      const p = buildCnaePrefill(PROJETO_SIMPLES);
      expect(p["qcnae01_setor"]).toBe("Serviços (geral)");
    });

    it("1 CNAE → 'Não — apenas CNAE principal'", () => {
      const p = buildCnaePrefill(PROJETO_SIMPLES);
      expect(p["qcnae01_atividades"]).toBe("Não — apenas CNAE principal");
    });

    it("5 CNAEs → 'Sim — mais de 3 CNAEs secundários'", () => {
      const p = buildCnaePrefill(PROJETO_COMPLEXO);
      expect(p["qcnae01_atividades"]).toBe("Sim — mais de 3 CNAEs secundários");
    });

    it("observações contém os códigos CNAE", () => {
      const p = buildCnaePrefill(PROJETO_SIMPLES);
      expect(p["qcnae01_observacoes"]).toContain("6201-5/01");
    });
  });

  describe("Campos não aplicáveis — permanecem undefined (não forçados)", () => {
    it("qc02_grupo não é preenchido (dado não coletado)", () => {
      expect(buildCorporatePrefill(PROJETO_COMPLEXO)["qc02_grupo"]).toBeUndefined();
    });

    it("qc02_centralizacao não é preenchido (dado não coletado)", () => {
      expect(buildCorporatePrefill(PROJETO_COMPLEXO)["qc02_centralizacao"]).toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 7 — ROBUSTEZ (Edge Cases)
// ─────────────────────────────────────────────────────────────────────────────

describe("BLOCO 7 — Robustez (Edge Cases)", () => {
  it("projeto completamente vazio não quebra buildCorporatePrefill", () => {
    expect(() => buildCorporatePrefill(PROJETO_VAZIO)).not.toThrow();
  });

  it("projeto completamente vazio não quebra buildOperationalPrefill", () => {
    expect(() => buildOperationalPrefill(PROJETO_VAZIO)).not.toThrow();
  });

  it("projeto completamente vazio não quebra buildCnaePrefill", () => {
    expect(() => buildCnaePrefill(PROJETO_VAZIO)).not.toThrow();
  });

  it("projeto com JSONs null não quebra builders", () => {
    const proj: NormalizedProjectForPrefill = {
      companyProfile: null,
      operationProfile: null,
      financialProfile: null,
      governanceProfile: null,
      taxComplexity: null,
      confirmedCnaes: null,
    };
    expect(() => buildCorporatePrefill(proj)).not.toThrow();
    expect(() => buildOperationalPrefill(proj)).not.toThrow();
    expect(() => buildCnaePrefill(proj)).not.toThrow();
  });

  it("confirmedCnaes como array vazio não quebra buildCnaePrefill", () => {
    const proj: NormalizedProjectForPrefill = { confirmedCnaes: [] };
    expect(() => buildCnaePrefill(proj)).not.toThrow();
    const p = buildCnaePrefill(proj);
    expect(p["qcnae01_atividades"]).toBeUndefined();
  });

  it("clientType como array vazio não quebra buildOperationalPrefill", () => {
    const proj: NormalizedProjectForPrefill = {
      operationProfile: { clientType: [] },
    };
    expect(() => buildOperationalPrefill(proj)).not.toThrow();
  });

  it("hasTaxTeam=null não gera valor incorreto", () => {
    const proj: NormalizedProjectForPrefill = {
      governanceProfile: { hasTaxTeam: null },
    };
    const p = buildOperationalPrefill(proj);
    expect(p["qo08_equipe"]).toBeUndefined();
  });

  it("paymentMethods com valor desconhecido é filtrado silenciosamente", () => {
    const proj: NormalizedProjectForPrefill = {
      financialProfile: { paymentMethods: ["pix", "valor_desconhecido_xyz"] },
    };
    const p = buildOperationalPrefill(proj);
    const meios = p["qo03_meios"] as string[];
    expect(meios).toContain("Pix");
    expect(meios).not.toContain(undefined);
    expect(meios).not.toContain(null);
  });

  it("safeParseJson: string JSON de array retorna array", () => {
    const arr = [{ code: "1234-5/00" }];
    const result = safeParseJson(JSON.stringify(arr), []);
    expect(Array.isArray(result)).toBe(true);
    expect((result as any[])[0]?.code).toBe("1234-5/00");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 8 — LOGS E RASTREABILIDADE (PrefillTrace)
// ─────────────────────────────────────────────────────────────────────────────

describe("BLOCO 8 — Logs e Rastreabilidade (PrefillTrace)", () => {
  it("buildCorporatePrefill com trace registra paths usados", () => {
    const result = buildCorporatePrefill(PROJETO_SIMPLES, { trace: true }) as any;
    const trace = result._trace;
    expect(trace).toBeDefined();
    expect(Array.isArray(trace.prefill_source_paths_used)).toBe(true);
    expect(trace.prefill_source_paths_used).toContain("companyProfile.taxRegime");
    expect(trace.prefill_source_paths_used).toContain("companyProfile.companySize");
  });

  it("buildCorporatePrefill com trace registra campos resolvidos", () => {
    const result = buildCorporatePrefill(PROJETO_SIMPLES, { trace: true }) as any;
    const trace = result._trace;
    expect(trace.prefill_fields_resolved).toContain("qc01_regime");
    expect(trace.prefill_fields_resolved).toContain("qc01_porte");
  });

  it("buildCorporatePrefill com trace registra campos missing quando dados ausentes", () => {
    const result = buildCorporatePrefill(PROJETO_VAZIO, { trace: true }) as any;
    const trace = result._trace;
    expect(trace.prefill_fields_missing).toContain("qc01_regime");
    expect(trace.prefill_fields_missing).toContain("qc01_porte");
  });

  it("buildOperationalPrefill com trace registra paths corretos", () => {
    const result = buildOperationalPrefill(PROJETO_SIMPLES, { trace: true }) as any;
    const trace = result._trace;
    expect(trace.prefill_source_paths_used).toContain("operationProfile.operationType");
    expect(trace.prefill_source_paths_used).toContain("financialProfile.paymentMethods");
    expect(trace.prefill_source_paths_used).toContain("governanceProfile.hasTaxTeam");
  });

  it("buildCnaePrefill com trace registra paths corretos", () => {
    const result = buildCnaePrefill(PROJETO_SIMPLES, { trace: true }) as any;
    const trace = result._trace;
    expect(trace.prefill_source_paths_used).toContain("operationProfile.operationType");
    expect(trace.prefill_source_paths_used).toContain("confirmedCnaes");
  });

  it("buildCnaePrefill com trace registra erro de parse quando confirmedCnaes é string", () => {
    const proj = { confirmedCnaes: "[{\"code\":\"1234\"}]" } as any;
    const result = buildCnaePrefill(proj, { trace: true }) as any;
    const trace = result._trace;
    expect(trace.prefill_parse_errors.length).toBeGreaterThan(0);
  });

  it("trace sem option não polui o objeto de retorno com _trace", () => {
    const result = buildCorporatePrefill(PROJETO_SIMPLES);
    expect((result as any)._trace).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 9 — TESTES AUTOMATIZADOS (cobertura mínima)
// ─────────────────────────────────────────────────────────────────────────────

describe("BLOCO 9 — Cobertura Mínima (Deduplicação e Regressão)", () => {
  it("getPrefilledSectionsOperacional detecta QO-01 quando operationType presente", () => {
    const sections = getPrefilledSectionsOperacional(PROJETO_SIMPLES);
    expect(sections.has("QO-01")).toBe(true);
  });

  it("getPrefilledSectionsOperacional detecta QO-03 quando paymentMethods presente", () => {
    const sections = getPrefilledSectionsOperacional(PROJETO_SIMPLES);
    expect(sections.has("QO-03")).toBe(true);
  });

  it("getPrefilledSectionsOperacional detecta QO-08 quando hasTaxTeam presente", () => {
    const sections = getPrefilledSectionsOperacional(PROJETO_SIMPLES);
    expect(sections.has("QO-08")).toBe(true);
  });

  it("getPrefilledSectionsCnae detecta QCNAE-01 quando operationType presente", () => {
    const sections = getPrefilledSectionsCnae(PROJETO_SIMPLES);
    expect(sections.has("QCNAE-01")).toBe(true);
  });

  it("getPrefilledSectionsOperacional retorna Set vazio para projeto vazio", () => {
    const sections = getPrefilledSectionsOperacional(PROJETO_VAZIO);
    expect(sections.size).toBe(0);
  });

  it("getPrefilledSectionsCnae retorna Set vazio para projeto vazio", () => {
    const sections = getPrefilledSectionsCnae(PROJETO_VAZIO);
    expect(sections.size).toBe(0);
  });

  it("REGRESSÃO: buildCorporatePrefill com coluna direta (legado) ainda funciona", () => {
    // Projeto legado com taxRegime/companySize como colunas diretas (não no companyProfile)
    const projLegado: NormalizedProjectForPrefill = {
      taxRegime: "lucro_presumido",
      companySize: "pequena",
      companyProfile: null,
    };
    const p = buildCorporatePrefill(projLegado);
    expect(p["qc01_regime"]).toBe("Lucro Presumido");
    expect(p["qc01_porte"]).toBe("Empresa de Pequeno Porte (até R$ 4,8 mi)");
  });

  it("REGRESSÃO: companyProfile tem prioridade sobre colunas diretas", () => {
    const projMixed: NormalizedProjectForPrefill = {
      taxRegime: "simples_nacional",  // coluna direta (legado)
      companyProfile: { taxRegime: "lucro_real" },  // JSON canônico (DA-1)
    };
    const p = buildCorporatePrefill(projMixed);
    // DA-1: path canônico = companyProfile.taxRegime
    expect(p["qc01_regime"]).toBe("Lucro Real");
  });

  it("clientTypeToPerfilClientes: b2g sozinho → 'Governo (B2G)'", () => {
    expect(clientTypeToPerfilClientes(["b2g"])).toBe("Governo (B2G)");
  });

  it("clientTypeToPerfilClientes: b2b2c → 'Misto (B2B e B2C)'", () => {
    expect(clientTypeToPerfilClientes(["b2b2c"])).toBe("Misto (B2B e B2C)");
  });

  it("hasTaxTeamToEquipe: true → 'Equipe interna dedicada'", () => {
    expect(hasTaxTeamToEquipe(true)).toBe("Equipe interna dedicada");
  });

  it("hasTaxTeamToEquipe: false → 'Contador autônomo'", () => {
    expect(hasTaxTeamToEquipe(false)).toBe("Contador autônomo");
  });

  it("hasTaxTeamToEquipe: null → ''", () => {
    expect(hasTaxTeamToEquipe(null)).toBe("");
  });

  it("cnaeCountToAtividades: 1 → 'Não — apenas CNAE principal'", () => {
    expect(cnaeCountToAtividades(1)).toBe("Não — apenas CNAE principal");
  });

  it("cnaeCountToAtividades: 3 → 'Sim — 1 a 3 CNAEs secundários'", () => {
    expect(cnaeCountToAtividades(3)).toBe("Sim — 1 a 3 CNAEs secundários");
  });

  it("cnaeCountToAtividades: 5 → 'Sim — mais de 3 CNAEs secundários'", () => {
    expect(cnaeCountToAtividades(5)).toBe("Sim — mais de 3 CNAEs secundários");
  });

  it("cnaesToObservacoes: formata corretamente", () => {
    const obs = cnaesToObservacoes([
      { code: "1234-5/00", description: "Teste" },
      { code: "9876-5/00" },
    ]);
    expect(obs).toContain("1234-5/00 — Teste");
    expect(obs).toContain("9876-5/00");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 10 — VALIDAÇÃO MANUAL SIMULADA (Casos 1, 2, 3)
// ─────────────────────────────────────────────────────────────────────────────

describe("BLOCO 10 — Casos de Validação (Simples, Complexo, Inconsistente)", () => {
  describe("Caso 1 — Simples (1 CNAE, campos básicos)", () => {
    it("todos os campos básicos são preenchidos corretamente", () => {
      const corp = buildCorporatePrefill(PROJETO_SIMPLES);
      const oper = buildOperationalPrefill(PROJETO_SIMPLES);
      const cnae = buildCnaePrefill(PROJETO_SIMPLES);

      // Corporativo
      expect(corp["qc01_regime"]).toBe("Lucro Presumido");
      expect(corp["qc01_porte"]).toBe("Médio porte (até R$ 78 mi)");
      expect(corp["qc02_filiais"]).toBe("Não");

      // Operacional
      expect(oper["qo01_canais"]).toEqual(["Venda direta B2B"]);
      expect(oper["qo01_clientes"]).toBe("Pessoa Jurídica (B2B)");
      expect(oper["qo03_meios"]).toContain("Pix");
      expect(oper["qo08_equipe"]).toBe("Contador autônomo");

      // CNAE
      expect(cnae["qcnae01_setor"]).toBe("Serviços (geral)");
      expect(cnae["qcnae01_atividades"]).toBe("Não — apenas CNAE principal");
    });

    it("zero repetições: nenhum campo coletado reaparece vazio", () => {
      const corp = buildCorporatePrefill(PROJETO_SIMPLES);
      const oper = buildOperationalPrefill(PROJETO_SIMPLES);
      const cnae = buildCnaePrefill(PROJETO_SIMPLES);
      const allPrefilled = { ...corp, ...oper, ...cnae };
      // Nenhum campo preenchido deve ser string vazia
      Object.entries(allPrefilled).forEach(([key, val]) => {
        if (key === "_trace") return;
        if (typeof val === "string") expect(val).not.toBe("");
        if (Array.isArray(val)) expect(val.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Caso 2 — Complexo (múltiplos CNAEs, múltiplos campos derivados)", () => {
    it("todos os campos complexos são preenchidos corretamente", () => {
      const corp = buildCorporatePrefill(PROJETO_COMPLEXO);
      const oper = buildOperationalPrefill(PROJETO_COMPLEXO);
      const cnae = buildCnaePrefill(PROJETO_COMPLEXO);

      // Corporativo
      expect(corp["qc01_regime"]).toBe("Lucro Real");
      expect(corp["qc01_porte"]).toBe("Grande porte (acima de R$ 78 mi)");
      expect(corp["qc02_filiais"]).toBe("Sim");

      // Operacional
      expect(oper["qo01_canais"]).toEqual(["Loja física", "Venda direta B2B"]);
      expect(oper["qo01_clientes"]).toBe("Misto (B2B e B2C)");
      expect(oper["qo08_equipe"]).toBe("Equipe interna dedicada");

      // CNAE
      expect(cnae["qcnae01_atividades"]).toBe("Sim — mais de 3 CNAEs secundários");
    });
  });

  describe("Caso 3 — Inconsistente (dados legados, campos conflitantes)", () => {
    it("projeto inconsistente não quebra nenhum builder", () => {
      expect(() => buildCorporatePrefill(PROJETO_INCONSISTENTE)).not.toThrow();
      expect(() => buildOperationalPrefill(PROJETO_INCONSISTENTE)).not.toThrow();
      expect(() => buildCnaePrefill(PROJETO_INCONSISTENTE)).not.toThrow();
    });

    it("projeto inconsistente: coluna direta funciona como fallback", () => {
      const corp = buildCorporatePrefill(PROJETO_INCONSISTENTE);
      // companyProfile é null, mas taxRegime/companySize diretos existem
      expect(corp["qc01_regime"]).toBe("Simples Nacional");
      expect(corp["qc01_porte"]).toBe("MEI / Microempresa (até R$ 360 mil)");
    });

    it("projeto inconsistente: operacionais/CNAE retornam vazio sem erro", () => {
      const oper = buildOperationalPrefill(PROJETO_INCONSISTENTE);
      const cnae = buildCnaePrefill(PROJETO_INCONSISTENTE);
      // Sem operationProfile → sem canais/clientes/setor
      expect(oper["qo01_canais"]).toBeUndefined();
      expect(cnae["qcnae01_setor"]).toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 1 — FONTE DA VERDADE (Persistência) — Verificação de Schema
// ─────────────────────────────────────────────────────────────────────────────

describe("BLOCO 1 — Fonte da Verdade (Estrutura do Schema)", () => {
  it("NormalizedProjectForPrefill define todos os JSONs canônicos esperados", () => {
    // Verifica que o tipo tem os campos canônicos (teste de contrato de tipo)
    const proj: NormalizedProjectForPrefill = {
      companyProfile: null,
      operationProfile: null,
      financialProfile: null,
      governanceProfile: null,
      taxComplexity: null,
      confirmedCnaes: null,
    };
    // Se compilar sem erro, o contrato está correto
    expect(proj).toBeDefined();
  });

  it("normalizeProject cobre todos os JSONs canônicos do schema", () => {
    const raw = {
      companyProfile: null,
      operationProfile: null,
      financialProfile: null,
      governanceProfile: null,
      taxComplexity: null,
      confirmedCnaes: null,
      corporateAnswers: null,
      operationalAnswers: null,
      cnaeAnswers: null,
      stepHistory: null,
      diagnosticStatus: null,
    } as any;
    const normalized = normalizeProject(raw);
    // confirmedCnaes deve ser [] (não null) após normalização
    expect(normalized.confirmedCnaes).toEqual([]);
    // stepHistory deve ser [] (não null) após normalização
    expect(normalized.stepHistory).toEqual([]);
    // demais campos null permanecem null
    expect(normalized.companyProfile).toBeNull();
  });
});
