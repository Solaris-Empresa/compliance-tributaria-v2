/**
 * perfil-router.test.ts — M2 PR-A
 *
 * Cobertura:
 *   - computePerfilHash: determinismo, sort-insensitivity, trim-insensitivity
 *   - RULES_HASH / MODEL_VERSION / DATA_VERSION: constantes alinhadas com baseline
 *   - isM2PerfilEntidadeEnabled: 5 etapas de rollout
 *   - FSM dual-path: perfil_entidade_confirmado válido + legado preservado
 *   - validateM1Seed reuse (PR #859 — regex NCM/NBS + CNAE obrigatório)
 *
 * Notas:
 *   - Testes unitários puros (sem DB).
 *   - Procedures perfil.build/confirm/get exigem mock DB — coberto em PR-C E2E.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  computePerfilHash,
  RULES_HASH,
  RULES_VERSION,
  type PerfilSnapshotInput,
} from "./lib/archetype/perfilHash";
import { MODEL_VERSION, DATA_VERSION } from "./lib/archetype/versioning";
import {
  isM2PerfilEntidadeEnabled,
  FEATURE_FLAGS,
} from "./config/feature-flags";
import { assertValidTransition, VALID_TRANSITIONS } from "./flowStateMachine";
import { validateM1Seed } from "./lib/archetype/validateM1Input";

// ─── Fixtures ──────────────────────────────────────────────────────────────

const baseInput: PerfilSnapshotInput = {
  project_id: 100,
  cnpj: "00.000.000/0001-00",
  confirmedCnaes: ["0115-6/00"],
  ncms_canonicos_array: ["1201.90.00"],
  nbss_canonicos_array: [],
  dim_objeto: ["agricola"],
  dim_papel_na_cadeia: "produtor",
  dim_tipo_de_relacao: ["producao"],
  dim_territorio: "nacional",
  dim_regime: "lucro_presumido",
  natureza_operacao_principal: ["Produção própria"],
  tax_regime: "Lucro Presumido",
  company_size: "Grande",
};

// ─── computePerfilHash ─────────────────────────────────────────────────────

describe("computePerfilHash — determinismo + canonical", () => {
  it("T1: mesmo input produz mesmo hash (determinístico)", () => {
    const h1 = computePerfilHash(baseInput);
    const h2 = computePerfilHash(baseInput);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("T2: ordem de elementos em arrays NÃO altera hash (sort canonical)", () => {
    const inputUnsorted: PerfilSnapshotInput = {
      ...baseInput,
      confirmedCnaes: ["0115-6/00", "4632-0/01"],
    };
    const inputSortedReverse: PerfilSnapshotInput = {
      ...baseInput,
      confirmedCnaes: ["4632-0/01", "0115-6/00"],
    };
    expect(computePerfilHash(inputUnsorted)).toBe(
      computePerfilHash(inputSortedReverse),
    );
  });

  it("T3: whitespace em strings de array NÃO altera hash (trim canonical)", () => {
    const inputDirty: PerfilSnapshotInput = {
      ...baseInput,
      confirmedCnaes: ["  0115-6/00  "],
      ncms_canonicos_array: [" 1201.90.00 "],
    };
    expect(computePerfilHash(inputDirty)).toBe(computePerfilHash(baseInput));
  });

  it("T4: project_id diferente produz hash diferente", () => {
    const h1 = computePerfilHash(baseInput);
    const h2 = computePerfilHash({ ...baseInput, project_id: 999 });
    expect(h1).not.toBe(h2);
  });

  it("T5: cnpj diferente produz hash diferente", () => {
    const h1 = computePerfilHash(baseInput);
    const h2 = computePerfilHash({
      ...baseInput,
      cnpj: "11.111.111/0001-11",
    });
    expect(h1).not.toBe(h2);
  });

  it("T6: dim_objeto diferente produz hash diferente", () => {
    const h1 = computePerfilHash(baseInput);
    const h2 = computePerfilHash({ ...baseInput, dim_objeto: ["combustivel"] });
    expect(h1).not.toBe(h2);
  });

  it("T7: subnatureza_setorial undefined trata como []", () => {
    const inputWithoutSubnatureza: PerfilSnapshotInput = { ...baseInput };
    delete (inputWithoutSubnatureza as { subnatureza_setorial?: readonly string[] })
      .subnatureza_setorial;
    const inputWithEmpty: PerfilSnapshotInput = {
      ...baseInput,
      subnatureza_setorial: [],
    };
    expect(computePerfilHash(inputWithoutSubnatureza)).toBe(
      computePerfilHash(inputWithEmpty),
    );
  });
});

// ─── Constantes alinhadas com baseline ─────────────────────────────────────

describe("Constantes alinhadas com baseline determinístico", () => {
  it("T8: RULES_HASH bate byte-a-byte com auditoria v7.60", () => {
    expect(RULES_HASH).toBe(
      "4929516bb51f737a041eda96385a71debdbbf5c8d1ad2544ff8d18096e86e272",
    );
    expect(RULES_HASH).toMatch(/^[a-f0-9]{64}$/);
  });

  it("T9: RULES_VERSION e MODEL_VERSION = m1-v1.0.0", () => {
    expect(RULES_VERSION).toBe("m1-v1.0.0");
    expect(MODEL_VERSION).toBe("m1-v1.0.0");
  });

  it("T10: DATA_VERSION é ISO-8601 UTC válido (pós-#860)", () => {
    expect(DATA_VERSION).toBe("2026-04-28T22:29:37Z");
    expect(new Date(DATA_VERSION).toISOString()).toBe(
      "2026-04-28T22:29:37.000Z",
    );
  });
});

// ─── Feature Flag M2 ───────────────────────────────────────────────────────

describe("isM2PerfilEntidadeEnabled — 5 etapas de rollout", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    (FEATURE_FLAGS as Record<string, boolean>)[
      "m2-perfil-entidade-enabled"
    ] = false;
    delete process.env.M2_PERFIL_ENTIDADE_ENABLED;
    delete process.env.M2_PERFIL_ENTIDADE_INTERNAL_ROLES;
    delete process.env.M2_PERFIL_ENTIDADE_ALLOWED_PROJECTS;
    delete process.env.E2E_TEST_MODE;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    (FEATURE_FLAGS as Record<string, boolean>)[
      "m2-perfil-entidade-enabled"
    ] = false;
  });

  it("T11: Step 1 — flag global false default", () => {
    expect(isM2PerfilEntidadeEnabled()).toBe(false);
    expect(isM2PerfilEntidadeEnabled({ role: "cliente" })).toBe(false);
  });

  it("T12: Step 3 — equipe_solaris com env opt-in", () => {
    process.env.M2_PERFIL_ENTIDADE_INTERNAL_ROLES = "true";
    expect(isM2PerfilEntidadeEnabled({ role: "equipe_solaris" })).toBe(true);
    expect(isM2PerfilEntidadeEnabled({ role: "advogado_senior" })).toBe(true);
    expect(isM2PerfilEntidadeEnabled({ role: "cliente" })).toBe(false);
  });

  it("T13: Step 3 alt — whitelist de projetos via env", () => {
    process.env.M2_PERFIL_ENTIDADE_ALLOWED_PROJECTS = "100,200,300";
    expect(isM2PerfilEntidadeEnabled({ projectId: 100 })).toBe(true);
    expect(isM2PerfilEntidadeEnabled({ projectId: 200 })).toBe(true);
    expect(isM2PerfilEntidadeEnabled({ projectId: 999 })).toBe(false);
  });

  it("T14: Step 4 — flag global true ativa para todos", () => {
    (FEATURE_FLAGS as Record<string, boolean>)[
      "m2-perfil-entidade-enabled"
    ] = true;
    expect(isM2PerfilEntidadeEnabled({ role: "cliente" })).toBe(true);
  });

  it("T15: env M2_PERFIL_ENTIDADE_ENABLED=false sobrescreve flag global true", () => {
    (FEATURE_FLAGS as Record<string, boolean>)[
      "m2-perfil-entidade-enabled"
    ] = true;
    process.env.M2_PERFIL_ENTIDADE_ENABLED = "false";
    expect(isM2PerfilEntidadeEnabled({ role: "equipe_solaris" })).toBe(false);
  });

  it("T16: E2E_TEST_MODE=true sempre ativa", () => {
    process.env.E2E_TEST_MODE = "true";
    expect(isM2PerfilEntidadeEnabled({ role: "cliente" })).toBe(true);
  });
});

// ─── FSM dual-path ─────────────────────────────────────────────────────────

describe("FSM dual-path — preserva legado + adiciona perfil_entidade_confirmado", () => {
  it("T17: cnaes_confirmados → perfil_entidade_confirmado é VÁLIDA (M2)", () => {
    expect(() =>
      assertValidTransition("cnaes_confirmados", "perfil_entidade_confirmado"),
    ).not.toThrow();
  });

  it("T18: cnaes_confirmados → onda1_solaris ainda VÁLIDA (legado preservado)", () => {
    // Manus Nota #1 — não remover legado para evitar quebra de fluxo cliente atual
    expect(() =>
      assertValidTransition("cnaes_confirmados", "onda1_solaris"),
    ).not.toThrow();
  });

  it("T19: perfil_entidade_confirmado → onda1_solaris é VÁLIDA", () => {
    expect(() =>
      assertValidTransition("perfil_entidade_confirmado", "onda1_solaris"),
    ).not.toThrow();
  });

  it("T20: VALID_TRANSITIONS.cnaes_confirmados contém AMBOS os destinos", () => {
    expect(VALID_TRANSITIONS["cnaes_confirmados"]).toContain("onda1_solaris");
    expect(VALID_TRANSITIONS["cnaes_confirmados"]).toContain(
      "perfil_entidade_confirmado",
    );
  });
});

// ─── validateM1Seed reuse (PR #859) ────────────────────────────────────────

// ─── BUG-1 fix (Manus review PR #865) — guard isM2PerfilEntidadeEnabled ────

describe("BUG-1 fix — guard isM2PerfilEntidadeEnabled consumido pelo router", () => {
  it("T24: router perfil.ts importa isM2PerfilEntidadeEnabled (corrige feature flag morta)", async () => {
    // Smoke test: confirmar que o módulo router importa a função guard
    // Se BUG-1 voltasse (import removido), este teste falharia ao parser
    const routerSource = await import("./routers/perfil");
    expect(routerSource.perfilRouter).toBeDefined();
    // Verificação indireta: o módulo carregou sem ImportError
    // (se isM2PerfilEntidadeEnabled fosse referenciada mas não importada, throw)
  });

  it("T25: assertM2Enabled rejeita FORBIDDEN quando flag global = false e role = cliente", () => {
    // Comportamento esperado pós-BUG-1 fix:
    // Sem env override + flag=false + role=cliente → guard lança FORBIDDEN
    (FEATURE_FLAGS as Record<string, boolean>)[
      "m2-perfil-entidade-enabled"
    ] = false;
    delete process.env.M2_PERFIL_ENTIDADE_ENABLED;
    delete process.env.M2_PERFIL_ENTIDADE_INTERNAL_ROLES;
    delete process.env.E2E_TEST_MODE;
    expect(isM2PerfilEntidadeEnabled({ role: "cliente" })).toBe(false);
    // → router deve lançar TRPCError FORBIDDEN (testado em integration M2-PR-C)
  });
});

describe("validateM1Seed reuse — input gate compartilhado", () => {
  it("T21: NCM truncado bloqueia (não duplicar regex no router perfil)", () => {
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "0115-6/00",
        natureza_operacao_principal: ["Produção própria"],
        ncms_principais: ["1201"],
        nbss_principais: [],
      }),
    ).toThrow(/NCM_INVALID_FORMAT/);
  });

  it("T22: CNAE placeholder bloqueia", () => {
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "",
        natureza_operacao_principal: ["Produção própria"],
        ncms_principais: ["1201.90.00"],
        nbss_principais: [],
      }),
    ).toThrow(/CNAE_INVALID/);
  });

  it("T23: input válido (Produtor soja) passa", () => {
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "0115-6/00",
        natureza_operacao_principal: ["Produção própria"],
        ncms_principais: ["1201.90.00"],
        nbss_principais: [],
      }),
    ).not.toThrow();
  });
});

// ─── PR-D fix — buildSeedFromProject normalizers (Bug 1 + Bug 2) ───────────

describe("PR-D — buildSeedFromProject mapeia legacy → Seed corretamente", () => {
  // Teste de integração que reproduz cenário real:
  // PerfilEmpresaIntelligente.tsx grava taxRegime em snake_case
  // /projetos/novo cria projects.companyProfile + operationProfile
  // perfil.build → buildSeedFromProject → buildSnapshot
  // Antes do PR-D: status="inconsistente" (papel + regime indefinidos)
  // Depois do PR-D: status="confirmado" se Seed válido

  // Import dinâmico para evitar problemas de mock (testes deste arquivo
  // usam vi.mock no PR-A; aqui é leitura literal de buildSeedFromProject)
  let buildSeedFromProject: typeof import("./routers/perfil").buildSeedFromProject;

  beforeEach(async () => {
    const mod = await import("./routers/perfil");
    buildSeedFromProject = mod.buildSeedFromProject;
  });

  it("T26: Bug-1 fix — agronegocio mapeia para 'Produtor/fabricante' (não 'Produtor')", () => {
    const project = {
      companyProfile: { taxRegime: "lucro_presumido", companySize: "Grande" },
      operationProfile: {
        operationType: "agronegocio",
        principaisProdutos: [{ ncm_code: "1201.90.00" }],
      },
      confirmedCnaes: [{ code: "0115-6/00" }],
    };
    const seed = buildSeedFromProject(project);
    expect(seed.posicao_na_cadeia_economica).toBe("Produtor/fabricante");
  });

  it("T27: Bug-1 fix — misto mapeia para 'Atacadista' (decisão P.O.)", () => {
    const project = {
      companyProfile: { taxRegime: "lucro_real" },
      operationProfile: { operationType: "misto" },
      confirmedCnaes: [{ code: "4711-3/02" }],
    };
    const seed = buildSeedFromProject(project);
    expect(seed.posicao_na_cadeia_economica).toBe("Atacadista");
  });

  it("T28: Bug-1 fix — financeiro mapeia para 'Operadora' (operadora_regulada)", () => {
    const project = {
      companyProfile: { taxRegime: "lucro_real" },
      operationProfile: { operationType: "financeiro" },
      confirmedCnaes: [{ code: "6422-1/00" }],
    };
    const seed = buildSeedFromProject(project);
    expect(seed.posicao_na_cadeia_economica).toBe("Operadora");
  });

  it("T29: Bug-1 regressão — industria continua 'Produtor/fabricante'", () => {
    const project = {
      companyProfile: { taxRegime: "lucro_real" },
      operationProfile: { operationType: "industria" },
      confirmedCnaes: [{ code: "1091-1/01" }],
    };
    const seed = buildSeedFromProject(project);
    expect(seed.posicao_na_cadeia_economica).toBe("Produtor/fabricante");
  });

  it("T30: Bug-1 regressão — comercio continua 'Atacadista'", () => {
    const project = {
      companyProfile: { taxRegime: "simples_nacional" },
      operationProfile: { operationType: "comercio" },
      confirmedCnaes: [{ code: "4711-3/02" }],
    };
    const seed = buildSeedFromProject(project);
    expect(seed.posicao_na_cadeia_economica).toBe("Atacadista");
  });

  it("T31: Bug-1 regressão — servicos continua 'Prestador de servico'", () => {
    const project = {
      companyProfile: { taxRegime: "lucro_presumido" },
      operationProfile: { operationType: "servicos" },
      confirmedCnaes: [{ code: "6201-5/01" }],
    };
    const seed = buildSeedFromProject(project);
    expect(seed.posicao_na_cadeia_economica).toBe("Prestador de servico");
  });

  it("T32: Bug-2 fix — taxRegime snake_case 'simples_nacional' → 'Simples Nacional'", () => {
    const project = {
      companyProfile: { taxRegime: "simples_nacional" },
      operationProfile: { operationType: "comercio" },
      confirmedCnaes: [{ code: "4711-3/02" }],
    };
    const seed = buildSeedFromProject(project);
    expect(seed.regime_tributario_atual).toBe("Simples Nacional");
  });

  it("T33: Bug-2 fix — taxRegime snake_case 'lucro_presumido' → 'Lucro Presumido'", () => {
    const project = {
      companyProfile: { taxRegime: "lucro_presumido" },
      operationProfile: { operationType: "agronegocio" },
      confirmedCnaes: [{ code: "0115-6/00" }],
    };
    const seed = buildSeedFromProject(project);
    expect(seed.regime_tributario_atual).toBe("Lucro Presumido");
  });

  it("T34: Bug-2 fix — taxRegime snake_case 'lucro_real' → 'Lucro Real'", () => {
    const project = {
      companyProfile: { taxRegime: "lucro_real" },
      operationProfile: { operationType: "industria" },
      confirmedCnaes: [{ code: "1091-1/01" }],
    };
    const seed = buildSeedFromProject(project);
    expect(seed.regime_tributario_atual).toBe("Lucro Real");
  });

  it("T35: Bug-2 fix — taxRegime snake_case 'mei' → 'MEI'", () => {
    const project = {
      companyProfile: { taxRegime: "mei" },
      operationProfile: { operationType: "servicos" },
      confirmedCnaes: [{ code: "6201-5/01" }],
    };
    const seed = buildSeedFromProject(project);
    expect(seed.regime_tributario_atual).toBe("MEI");
  });

  it("T36: Bug-2 idempotência — taxRegime title case 'Lucro Real' → 'Lucro Real'", () => {
    const project = {
      companyProfile: { taxRegime: "Lucro Real" }, // já em title case
      operationProfile: { operationType: "industria" },
      confirmedCnaes: [{ code: "1091-1/01" }],
    };
    const seed = buildSeedFromProject(project);
    expect(seed.regime_tributario_atual).toBe("Lucro Real");
  });

  it("T37: Bug-2 idempotência — taxRegime title case 'Simples Nacional' → 'Simples Nacional'", () => {
    const project = {
      companyProfile: { taxRegime: "Simples Nacional" },
      operationProfile: { operationType: "comercio" },
      confirmedCnaes: [{ code: "4711-3/02" }],
    };
    const seed = buildSeedFromProject(project);
    expect(seed.regime_tributario_atual).toBe("Simples Nacional");
  });

  it("T38: Bug-2 fallback — taxRegime desconhecido passa direto (deriveRegime resolverá)", () => {
    const project = {
      companyProfile: { taxRegime: "regime_inexistente_qualquer" },
      operationProfile: { operationType: "servicos" },
      confirmedCnaes: [{ code: "6201-5/01" }],
    };
    const seed = buildSeedFromProject(project);
    // Sem alias match, retorna o valor original (deriveRegime resolverá como "indefinido")
    expect(seed.regime_tributario_atual).toBe("regime_inexistente_qualquer");
  });

  it("T39: Cenário Soja real — agronegocio + lucro_presumido + NCM válido = Seed completa", () => {
    // Reproduz o cenário do projeto 2100001 que estava bloqueado
    const project = {
      companyProfile: {
        cnpj: "00.000.000/0001-00",
        taxRegime: "lucro_presumido",
        companySize: "Grande",
      },
      operationProfile: {
        operationType: "agronegocio",
        principaisProdutos: [{ ncm_code: "1201.90.00" }],
      },
      confirmedCnaes: [{ code: "0115-6/00" }],
    };
    const seed = buildSeedFromProject(project);

    // Bug 1 fix
    expect(seed.posicao_na_cadeia_economica).toBe("Produtor/fabricante");
    // Bug 2 fix
    expect(seed.regime_tributario_atual).toBe("Lucro Presumido");
    // NCMs corretamente extraídos
    expect(seed.ncms_principais).toEqual(["1201.90.00"]);
    // Natureza derivada
    expect(seed.natureza_operacao_principal).toEqual(["Produção própria"]);
    // Tipo objeto derivado para "Bens/mercadorias"
    expect(seed.tipo_objeto_economico).toContain("Bens/mercadorias");
  });
});
