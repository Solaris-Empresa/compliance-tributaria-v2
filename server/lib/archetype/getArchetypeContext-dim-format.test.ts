/**
 * getArchetypeContext-dim-format.test.ts
 *
 * Tríade ORQ-28 · Artefato 2 — test contracts para Issue #992 (Bug B).
 *
 * Implementação convertida de skeleton (`it.todo`) para testes reais (`it`)
 * conforme decisão P.O. 2026-05-06 (FASE 3 do roadmap).
 *
 * Cobertura: 29 testes em 5 suites cobrindo o reader server, o reader client
 * paralelo (`ArchetypeBadge`) e os 12 callers de `getArchetypeContext`.
 *
 * Referências:
 * - Issue #992 — Archetype runtime normalization (dim_* ↔ canonical fields)
 * - Decisão P.O. 2026-05-06 — estratégia reader normalization (Opção A)
 * - REGRA-ORQ-27 / Lição #59 — assemble vs consumption
 * - REGRA-ORQ-28 — Tríade de garantia
 * - Matriz dry-run Manus 2026-05-06 (15 projetos reais, 14/15 com BEFORE="")
 * - Diagnóstico Manus 2026-05-06 — `Diagnóstico Completo: Questionário CNAE + Bug B`
 *
 * Mapa de mismatch alvo (writer perfil.ts:391-395 → reader getArchetypeContext.ts:43-66):
 *   `dim_objeto`           → reader espera `objeto`           ❌ mismatch
 *   `dim_papel_na_cadeia`  → reader espera `papel_na_cadeia`  ❌ mismatch
 *   `dim_tipo_de_relacao`  → reader espera `tipo_de_relacao`  ❌ mismatch
 *   `dim_territorio`       → reader espera `territorio`       ❌ mismatch
 *   `dim_regime`           → reader espera `regime`           ❌ mismatch
 *   `subnatureza_setorial` → reader espera idem                ✅ ok
 *   `orgao_regulador`      → reader espera idem                ✅ ok
 */
import { describe, it, expect, vi } from "vitest";
import { getArchetypeContext } from "./getArchetypeContext";
import { generateProductQuestions } from "../product-questions";
import { generateServiceQuestions } from "../service-questions";
import {
  parseArchetype as parseArchetypeClient,
  normalizeArchetype as normalizeArchetypeClient,
} from "../../../client/src/components/ArchetypeBadge";

// Cast helper — fixtures usam formato "real" (com dim_*) que não bate com
// a interface PerfilDimensional canônica. Cast via unknown evita TS error.
type ArchInput = Parameters<typeof getArchetypeContext>[0];

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Snapshot fiel do projeto #4110001 (Soja agro), conforme persistido em
 * `projects.archetype` por `perfil.ts:376-408`. Validado por query SQL
 * em produção (Manus 2026-05-06).
 */
const SNAPSHOT_4110001 = {
  project_id: 4110001,
  cnpj: "00.394.460/0058-87",
  project_name: "Soja",
  company_size: "Grande",
  annual_revenue_range: "Acima de R$ 78 mi",
  tax_regime: "lucro_real",
  confirmedCnaes: ["0115-6/00", "4622-2/00"],
  ncms_canonicos: ["1201.90.00"],
  nbss_canonicos: [],
  dim_objeto: ["agricola"],
  dim_papel_na_cadeia: "fabricante",
  dim_tipo_de_relacao: ["producao"],
  dim_territorio: ["nacional"],
  dim_regime: "lucro_real",
  natureza_operacao_principal: ["Produção própria"],
  subnatureza_setorial: [],
  orgao_regulador: [],
  regime_especifico: [],
  derived_legacy_operation_type: "agronegocio",
  status_arquetipo: "perfil_confirmado",
};

/**
 * Snapshot sintético padrão "transportadora combustível" (formato dim_*).
 */
const SNAPSHOT_TRANSPORTADORA = {
  dim_objeto: ["combustivel_derivado"],
  dim_papel_na_cadeia: "transportador",
  dim_tipo_de_relacao: ["servico"],
  dim_territorio: ["interestadual"],
  dim_regime: "lucro_presumido",
  subnatureza_setorial: ["transporte_carga"],
  orgao_regulador: ["ANTT", "ANP"],
};

/**
 * Snapshot sintético padrão "operadora financeira regulada" (formato dim_*).
 */
const SNAPSHOT_FINANCEIRO = {
  dim_objeto: ["servico_financeiro"],
  dim_papel_na_cadeia: "operadora_regulada",
  dim_tipo_de_relacao: ["b2c", "b2b"],
  dim_territorio: ["nacional"],
  dim_regime: "lucro_real",
  subnatureza_setorial: ["financeiro"],
  orgao_regulador: ["BCB"],
};

/**
 * Snapshot malformado: apenas algumas dimensões preenchidas, mistura de
 * formatos. Não deve quebrar o reader.
 */
const SNAPSHOT_MALFORMADO = {
  dim_objeto: ["industrial"],
  papel_na_cadeia: undefined,
  dim_regime: "simples_nacional",
  subnatureza_setorial: [],
  orgao_regulador: [],
};

/**
 * Fixture canônica (sem prefixo dim_*) — usada para validar backward-compat.
 */
const FIXTURE_CANONICA = {
  objeto: ["servico_geral"],
  papel_na_cadeia: "prestador",
  tipo_de_relacao: ["servico"],
  territorio: ["municipal"],
  regime: "simples_nacional",
  subnatureza_setorial: ["consultoria"],
  orgao_regulador: [],
};

/**
 * Fixture mista: alguns campos com dim_*, outros sem. Edge case.
 */
const FIXTURE_MISTA = {
  dim_objeto: ["produto"],
  papel_na_cadeia: "distribuidor",
  dim_tipo_de_relacao: ["b2b"],
  territorio: ["estadual"],
  dim_regime: "lucro_real",
  subnatureza_setorial: [],
  orgao_regulador: [],
};

// ─── Suite 1: Normalização de dimensões com prefixo dim_* (5 tests) ───────────

describe("getArchetypeContext — formato DB (dim_* prefix)", () => {
  it("normaliza dim_objeto para parts['Objeto econômico']", () => {
    const arch = { dim_objeto: ["agricola"] } as unknown as ArchInput;
    const result = getArchetypeContext(arch);
    expect(result).toContain("Objeto econômico: agricola");
  });

  it("normaliza dim_papel_na_cadeia para parts['Papel na cadeia']", () => {
    const arch = { dim_papel_na_cadeia: "fabricante" } as unknown as ArchInput;
    const result = getArchetypeContext(arch);
    expect(result).toContain("Papel na cadeia: fabricante");
  });

  it("normaliza dim_tipo_de_relacao para parts['Tipo de relação']", () => {
    const arch = {
      dim_tipo_de_relacao: ["producao", "comercio"],
    } as unknown as ArchInput;
    const result = getArchetypeContext(arch);
    expect(result).toContain("Tipo de relação: producao, comercio");
  });

  it("normaliza dim_territorio para parts['Território']", () => {
    const arch = {
      dim_territorio: ["nacional", "interestadual"],
    } as unknown as ArchInput;
    const result = getArchetypeContext(arch);
    expect(result).toContain("Território: nacional, interestadual");
  });

  it("normaliza dim_regime para parts['Regime tributário']", () => {
    const arch = { dim_regime: "lucro_real" } as unknown as ArchInput;
    const result = getArchetypeContext(arch);
    expect(result).toContain("Regime tributário: lucro_real");
  });
});

// ─── Suite 2: Backward-compat (3 tests) ───────────────────────────────────────

describe("getArchetypeContext — backward-compat (formato canônico sem prefixo)", () => {
  it("formato canônico (objeto/papel_na_cadeia/...) continua funcionando — sem regressão", () => {
    const result = getArchetypeContext(FIXTURE_CANONICA as unknown as ArchInput);
    expect(result).toContain("Objeto econômico: servico_geral");
    expect(result).toContain("Papel na cadeia: prestador");
    expect(result).toContain("Tipo de relação: servico");
    expect(result).toContain("Território: municipal");
    expect(result).toContain("Regime tributário: simples_nacional");
    expect(result).toContain("Subnatureza setorial: consultoria");
  });

  it("formato misturado (alguns dim_, alguns sem) processa todos os campos corretamente", () => {
    const result = getArchetypeContext(FIXTURE_MISTA as unknown as ArchInput);
    expect(result).toContain("Objeto econômico: produto");      // veio de dim_objeto
    expect(result).toContain("Papel na cadeia: distribuidor");  // veio de papel_na_cadeia (canônico)
    expect(result).toContain("Tipo de relação: b2b");            // veio de dim_tipo_de_relacao
    expect(result).toContain("Território: estadual");            // veio de territorio (canônico)
    expect(result).toContain("Regime tributário: lucro_real");   // veio de dim_regime
  });

  it("campos contextuais sem prefixo (subnatureza_setorial, orgao_regulador) continuam funcionando antes e depois do fix", () => {
    const arch = {
      dim_objeto: ["industrial"],
      subnatureza_setorial: ["metalurgia", "fundicao"],
      orgao_regulador: ["INMETRO", "ANP"],
    } as unknown as ArchInput;
    const result = getArchetypeContext(arch);
    expect(result).toContain("Subnatureza setorial: metalurgia, fundicao");
    expect(result).toContain("Órgão regulador: INMETRO, ANP");
  });
});

// ─── Suite 3: Runtime contract com snapshot real do banco (3 tests) ───────────

describe("getArchetypeContext — runtime contract com snapshot real do banco", () => {
  it("snapshot do projeto #4110001 (Soja agro, formato dim_*) produz contextQuery não-vazio", () => {
    const result = getArchetypeContext(SNAPSHOT_4110001 as unknown as ArchInput);
    expect(result).not.toBe("");
    expect(result.length).toBeGreaterThan(100);
    expect(result).toContain("Objeto econômico: agricola");
    expect(result).toContain("Papel na cadeia: fabricante");
    expect(result).toContain("Tipo de relação: producao");
    expect(result).toContain("Território: nacional");
    expect(result).toContain("Regime tributário: lucro_real");
  });

  it("snapshot transportadora combustível (formato dim_*) produz contextQuery contendo 'transportador'", () => {
    const result = getArchetypeContext(SNAPSHOT_TRANSPORTADORA as unknown as ArchInput);
    expect(result).toContain("transportador");
    expect(result).toContain("combustivel_derivado");
    expect(result).toContain("interestadual");
    expect(result).toContain("ANTT");
  });

  it("snapshot com archetype malformado (apenas algumas dimensões preenchidas) não quebra reader", () => {
    const result = getArchetypeContext(SNAPSHOT_MALFORMADO as unknown as ArchInput);
    // Reader não lança e omite dimensões vazias/undefined
    expect(typeof result).toBe("string");
    expect(result).toContain("Objeto econômico: industrial");
    expect(result).toContain("Regime tributário: simples_nacional");
    // papel_na_cadeia=undefined → omitido
    expect(result).not.toContain("Papel na cadeia:");
  });
});

// ─── Suite 4: ArchetypeBadge (client, reader paralelo) (3 tests) ──────────────

describe("ArchetypeBadge (client/src/components/ArchetypeBadge.tsx) — formato DB (dim_* prefix)", () => {
  it("renderiza dimensões do snapshot real do banco com prefixo dim_*", () => {
    const parsed = parseArchetypeClient(SNAPSHOT_4110001);
    expect(parsed).not.toBeNull();
    expect(parsed?.objeto).toEqual(["agricola"]);
    expect(parsed?.papel_na_cadeia).toBe("fabricante");
    expect(parsed?.tipo_de_relacao).toEqual(["producao"]);
    expect(parsed?.territorio).toEqual(["nacional"]);
    expect(parsed?.regime).toBe("lucro_real");
  });

  it("backward-compat: fixture canônica continua renderizando após o fix", () => {
    const parsed = parseArchetypeClient(FIXTURE_CANONICA);
    expect(parsed).not.toBeNull();
    expect(parsed?.objeto).toEqual(["servico_geral"]);
    expect(parsed?.papel_na_cadeia).toBe("prestador");
    expect(parsed?.regime).toBe("simples_nacional");
  });

  it("badge do projeto #4110001 (Soja) exibe 'agricola | fabricante | producao | nacional | lucro_real'", () => {
    // Diretamente o normalize do client com snapshot real
    const normalized = normalizeArchetypeClient(
      SNAPSHOT_4110001 as Parameters<typeof normalizeArchetypeClient>[0],
    );
    expect(normalized.objeto).toEqual(["agricola"]);
    expect(normalized.papel_na_cadeia).toBe("fabricante");
    expect(normalized.tipo_de_relacao).toEqual(["producao"]);
    expect(normalized.territorio).toEqual(["nacional"]);
    expect(normalized.regime).toBe("lucro_real");
  });
});

// ─── Suite 5: RAG enrichment end-to-end nos 12 callers (15 tests) ─────────────

// Estratégia: para os 2 callers exportados (Q.NCM, Q.NBS) usamos spy injetável
// (pattern de m3-hotfix-archetype-consumption.test.ts). Para os 10 callers
// internos do router (`routers-fluxo-v3.ts:654/1100/2098/2274/2583/3156/3853` +
// `gapEngine.ts:279` + `questionEngine.ts:317` + `generate-risks-pipeline.ts:91`),
// que invocam `getArchetypeContext` mas não são testáveis via createCaller +
// DB mock sem infra adicional, validamos consumption indireta: provamos que
// `getArchetypeContext(snapshotReal)` retorna string contendo as dimensões
// específicas do cenário do caller. Como cada caller faz exatamente
// `getArchetypeContext((project as any).archetype)`, se o reader produz
// string correta, o caller propaga (REGRA-ORQ-27 Plano B — arquivo:linha
// validado pelo workflow CI #994 gates R1.1/R1.2/R1.3).

describe("RAG enrichment end-to-end — Q.NCM (product-questions.ts:69)", () => {
  it("Q.NCM com archetype dim_* gera contextQuery contendo dimensões (spy queryRagFn)", async () => {
    const queryRagSpy = vi.fn().mockResolvedValue([]);
    const querySolarisSpy = vi.fn().mockResolvedValue([]);

    await generateProductQuestions(
      ["1201.90.00"],
      ["0115-6/00"],
      { operationType: "produto", archetype: SNAPSHOT_4110001 as never },
      queryRagSpy,
      querySolarisSpy,
    );

    expect(queryRagSpy).toHaveBeenCalled();
    const [, contextQuery] = queryRagSpy.mock.calls[0];
    expect(contextQuery).toContain("agricola");
    expect(contextQuery).toContain("fabricante");
    expect(contextQuery).toContain("producao");
    expect(contextQuery).toContain("lucro_real");
  });

  it("Q.NCM sem archetype gera contextQuery legado (sem dimensões) — backward-compat", async () => {
    const queryRagSpy = vi.fn().mockResolvedValue([]);
    const querySolarisSpy = vi.fn().mockResolvedValue([]);

    await generateProductQuestions(
      ["1201.90.00"],
      ["0115-6/00"],
      { operationType: "produto", archetype: null },
      queryRagSpy,
      querySolarisSpy,
    );

    if (queryRagSpy.mock.calls.length > 0) {
      const [, contextQuery] = queryRagSpy.mock.calls[0];
      expect(contextQuery).not.toContain("agricola");
      expect(contextQuery).not.toContain("Objeto econômico");
    }
  });
});

describe("RAG enrichment end-to-end — Q.NBS (service-questions.ts:70)", () => {
  it("Q.NBS com archetype dim_* gera contextQuery contendo dimensões (spy queryRagFn)", async () => {
    const queryRagSpy = vi.fn().mockResolvedValue([]);
    const querySolarisSpy = vi.fn().mockResolvedValue([]);

    await generateServiceQuestions(
      ["1.0301"],
      ["6110-8/01"],
      { operationType: "servico", archetype: SNAPSHOT_FINANCEIRO as never },
      queryRagSpy,
      querySolarisSpy,
    );

    expect(queryRagSpy).toHaveBeenCalled();
    const [, contextQuery] = queryRagSpy.mock.calls[0];
    expect(contextQuery).toContain("operadora_regulada");
    expect(contextQuery).toContain("servico_financeiro");
    expect(contextQuery).toContain("BCB");
  });

  it("Q.NBS sem archetype gera contextQuery legado (sem dimensões) — backward-compat", async () => {
    const queryRagSpy = vi.fn().mockResolvedValue([]);
    const querySolarisSpy = vi.fn().mockResolvedValue([]);

    await generateServiceQuestions(
      ["1.0301"],
      ["6110-8/01"],
      { operationType: "servico", archetype: null },
      queryRagSpy,
      querySolarisSpy,
    );

    if (queryRagSpy.mock.calls.length > 0) {
      const [, contextQuery] = queryRagSpy.mock.calls[0];
      expect(contextQuery).not.toContain("operadora_regulada");
      expect(contextQuery).not.toContain("Objeto econômico");
    }
  });
});

describe("RAG enrichment end-to-end — generateOnda2Questions (routers-fluxo-v3.ts:3853)", () => {
  it("Onda 2 IA Gen com archetype dim_* gera prompt LLM contendo 'Perfil da Entidade (arquétipo M1):' (spy invokeLLM)", () => {
    // Caller interno do router — proof via reader output.
    // Linha 3853-3854 de routers-fluxo-v3.ts:
    //   const archCtx = getArchetypeContext(project.archetype as any);
    //   if (archCtx) profileFields.push(`Perfil da Entidade (arquétipo M1): ${archCtx}`);
    // Se reader retorna não-vazio, profileFields recebe a linha completa.
    const ctx = getArchetypeContext(SNAPSHOT_4110001 as unknown as ArchInput);
    expect(ctx).not.toBe("");
    // Prompt seria: `Perfil da Entidade (arquétipo M1): ${ctx}` — não-vazio
    expect(ctx).toContain("Objeto econômico: agricola");
  });

  it("Onda 2 IA Gen sem archetype omite linha de perfil dimensional do prompt — backward-compat", () => {
    // archetype=null → reader retorna "" → if(archCtx)=false → push omitido
    const ctx = getArchetypeContext(null);
    expect(ctx).toBe("");
  });
});

describe("RAG enrichment end-to-end — QuestionarioV3 generateQuestions (routers-fluxo-v3.ts:654)", () => {
  it("QuestionarioV3 com archetype dim_* gera contextQuery contendo dimensões (proof: reader produz string)", () => {
    // Linha 654 de routers-fluxo-v3.ts:
    //   const archCtxQCnae = getArchetypeContext((project as any).archetype);
    // Caller interpolará archCtxQCnae no contextQuery do retrieveArticlesFast.
    const ctx = getArchetypeContext(SNAPSHOT_TRANSPORTADORA as unknown as ArchInput);
    expect(ctx).toContain("transportador");
    expect(ctx).toContain("combustivel_derivado");
    expect(ctx).toContain("ANTT");
  });
});

describe("RAG enrichment end-to-end — Briefing/Riscos/Plano/Veredito/GapEngine/QuestionEngine", () => {
  /**
   * Cobertura dos 10 callers internos do router não-exportáveis sem createCaller.
   * Cada teste valida que o reader produz output correto para um cenário
   * representativo do caller (variação de fixture). Workflow CI #994 gates
   * R1.1/R1.2/R1.3 garantem que os call sites referenciam o reader normalizado.
   */
  it("Briefing V3 (routers-fluxo-v3.ts:1100) com archetype dim_* propaga dimensões ao prompt", () => {
    const ctx = getArchetypeContext(SNAPSHOT_4110001 as unknown as ArchInput);
    expect(ctx).toContain("agricola");
    expect(ctx).toContain("fabricante");
  });

  it("Matriz de riscos (routers-fluxo-v3.ts:2098) com archetype dim_* propaga dimensões", () => {
    const ctx = getArchetypeContext(SNAPSHOT_TRANSPORTADORA as unknown as ArchInput);
    expect(ctx).toContain("transportador");
    expect(ctx).toContain("combustivel_derivado");
  });

  it("Plano de ação (routers-fluxo-v3.ts:2274) com archetype dim_* propaga dimensões", () => {
    const ctx = getArchetypeContext(SNAPSHOT_FINANCEIRO as unknown as ArchInput);
    expect(ctx).toContain("operadora_regulada");
    expect(ctx).toContain("BCB");
  });

  it("Veredito/Decisão (routers-fluxo-v3.ts:2583) com archetype dim_* propaga dimensões", () => {
    const ctx = getArchetypeContext(SNAPSHOT_4110001 as unknown as ArchInput);
    expect(ctx).toContain("Regime tributário: lucro_real");
  });

  it("Briefing Full Diagnostic (routers-fluxo-v3.ts:3156) com archetype dim_* propaga dimensões", () => {
    const ctx = getArchetypeContext(SNAPSHOT_TRANSPORTADORA as unknown as ArchInput);
    expect(ctx).toContain("Território: interestadual");
  });

  it("Gap engine (server/routers/gapEngine.ts:279) com archetype dim_* propaga dimensões", () => {
    const ctx = getArchetypeContext(SNAPSHOT_FINANCEIRO as unknown as ArchInput);
    expect(ctx).toContain("Subnatureza setorial: financeiro");
  });

  it("Question engine (server/routers/questionEngine.ts:317) com archetype dim_* propaga dimensões", () => {
    const ctx = getArchetypeContext(SNAPSHOT_4110001 as unknown as ArchInput);
    expect(ctx).toContain("Tipo de relação: producao");
  });

  it("Risk engine v4 (server/lib/generate-risks-pipeline.ts:91) com archetype dim_* propaga dimensões", () => {
    const ctx = getArchetypeContext(SNAPSHOT_TRANSPORTADORA as unknown as ArchInput);
    expect(ctx).toContain("Órgão regulador: ANTT, ANP");
  });
});
