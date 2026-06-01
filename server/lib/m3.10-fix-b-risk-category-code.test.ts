/**
 * m3.10-fix-b-risk-category-code.test.ts
 * Sprint M3.10 Fix B — preencher risk_category_code nos INSERTs dos analyzers órfãos
 *
 * Bug original: gaps SOLARIS/IAGEN tinham risk_category_code = NULL → cairiam em
 * "unmapped" no GapToRuleMapper → matriz mono-fonte ('regulatorio').
 *
 * Causa raiz validada: docs/governance/post-mortems/2026-05-05-mono-fonte-matriz-riscos.md
 * Dry-run validador: PR #975 Seção 4 (Manus 2026-05-05)
 *
 * Triade ORQ-28 leve (Fix B é cirúrgico — Manus valida Fix B isolado pós-merge).
 *
 * Cobertura:
 * - mapTopicToCategory: 15 tópicos do dry-run + edge cases (null, undefined, vazio, desconhecido)
 * - solaris-gap-analyzer.ts: INSERT inclui risk_category_code (grep static)
 * - iagen-gap-analyzer.ts: INSERT inclui risk_category_code (grep static)
 * - tipos: SolarisGapDefinition + iagen gapsToInsert têm campo risk_category_code
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  mapTopicToCategory,
  TOPICO_TO_CATEGORIA,
} from "../config/topico-to-categoria";

const SOLARIS_SRC = readFileSync(
  path.resolve(__dirname, "solaris-gap-analyzer.ts"),
  "utf-8",
);
const IAGEN_SRC = readFileSync(
  path.resolve(__dirname, "iagen-gap-analyzer.ts"),
  "utf-8",
);

// ---------------------------------------------------------------------------
// mapTopicToCategory — 15 tópicos validados pelo dry-run Manus 2026-05-05
// ---------------------------------------------------------------------------
describe("M3.10 Fix B — mapTopicToCategory (mapeamento curado)", () => {
  it("'confissao_automatica' → 'confissao_automatica'", () => {
    expect(mapTopicToCategory("confissao_automatica")).toBe(
      "confissao_automatica",
    );
  });

  it("'nfe' → 'confissao_automatica' (mapping curado)", () => {
    expect(mapTopicToCategory("nfe")).toBe("confissao_automatica");
  });

  it("'cgibs' → 'confissao_automatica'", () => {
    expect(mapTopicToCategory("cgibs")).toBe("confissao_automatica");
  });

  it("'divida_ativa' → 'confissao_automatica'", () => {
    expect(mapTopicToCategory("divida_ativa")).toBe("confissao_automatica");
  });

  it("'apuracao_assistida' → 'obrigacao_acessoria'", () => {
    expect(mapTopicToCategory("apuracao_assistida")).toBe(
      "obrigacao_acessoria",
    );
  });

  it("'apuracao' → 'obrigacao_acessoria'", () => {
    expect(mapTopicToCategory("apuracao")).toBe("obrigacao_acessoria");
  });

  it("'retificacao' → 'obrigacao_acessoria'", () => {
    expect(mapTopicToCategory("retificacao")).toBe("obrigacao_acessoria");
  });

  it("'espontaneidade' → 'obrigacao_acessoria'", () => {
    expect(mapTopicToCategory("espontaneidade")).toBe("obrigacao_acessoria");
  });

  it("'erp' → 'regime_diferenciado'", () => {
    expect(mapTopicToCategory("erp")).toBe("regime_diferenciado");
  });

  it("'governanca' → 'enquadramento_geral'", () => {
    expect(mapTopicToCategory("governanca")).toBe("enquadramento_geral");
  });

  it("'risco_sistemico' → 'enquadramento_geral'", () => {
    expect(mapTopicToCategory("risco_sistemico")).toBe("enquadramento_geral");
  });

  it("'contraditorio' → 'split_payment'", () => {
    expect(mapTopicToCategory("contraditorio")).toBe("split_payment");
  });

  it("'ampla_defesa' → 'split_payment'", () => {
    expect(mapTopicToCategory("ampla_defesa")).toBe("split_payment");
  });

  it("'judicializacao' → 'split_payment'", () => {
    expect(mapTopicToCategory("judicializacao")).toBe("split_payment");
  });

  it("'passivo_tributario' → 'inscricao_cadastral'", () => {
    expect(mapTopicToCategory("passivo_tributario")).toBe(
      "inscricao_cadastral",
    );
  });
});

// ---------------------------------------------------------------------------
// mapTopicToCategory — edge cases
// ---------------------------------------------------------------------------
describe("M3.10 Fix B — mapTopicToCategory edge cases", () => {
  it("null → null", () => {
    expect(mapTopicToCategory(null)).toBeNull();
  });

  it("undefined → null", () => {
    expect(mapTopicToCategory(undefined)).toBeNull();
  });

  it("string vazia → null", () => {
    expect(mapTopicToCategory("")).toBeNull();
  });

  it("apenas espaços → null", () => {
    expect(mapTopicToCategory("   ")).toBeNull();
  });

  it("tópico desconhecido → null (gap fica órfão até curadoria expandir)", () => {
    expect(mapTopicToCategory("topico_completamente_inventado_xyz")).toBeNull();
  });

  it("normaliza case (maiúsculas) → mapeia", () => {
    expect(mapTopicToCategory("CONFISSAO_AUTOMATICA")).toBe(
      "confissao_automatica",
    );
  });

  it("normaliza espaços externos → mapeia", () => {
    expect(mapTopicToCategory("  nfe  ")).toBe("confissao_automatica");
  });
});

// ---------------------------------------------------------------------------
// TOPICO_TO_CATEGORIA — completude do mapping
// ---------------------------------------------------------------------------
describe("M3.10 Fix B — TOPICO_TO_CATEGORIA contém os 15 do dry-run", () => {
  const TOPICOS_DRY_RUN = [
    "confissao_automatica",
    "nfe",
    "cgibs",
    "divida_ativa",
    "apuracao_assistida",
    "apuracao",
    "retificacao",
    "espontaneidade",
    "erp",
    "governanca",
    "risco_sistemico",
    "contraditorio",
    "ampla_defesa",
    "judicializacao",
    "passivo_tributario",
  ];

  it.each(TOPICOS_DRY_RUN)("tópico '%s' está mapeado", (topico) => {
    expect(TOPICO_TO_CATEGORIA[topico]).toBeDefined();
    expect(TOPICO_TO_CATEGORIA[topico]).not.toBeNull();
  });

  it("nenhum mapping aponta para categoria desconhecida", () => {
    const categoriasValidas = new Set([
      "imposto_seletivo",
      "ibs_cbs",
      "regime_diferenciado",
      "aliquota_reduzida",
      "aliquota_zero",
      "cadastro_fiscal",
      "split_payment",
      "obrigacao_acessoria",
      "transicao",
      "enquadramento_geral",
      "confissao_automatica",
      "inscricao_cadastral",
      "transicao_iss_ibs",
      "credito_presumido",
    ]);
    for (const [topico, categoria] of Object.entries(TOPICO_TO_CATEGORIA)) {
      expect(categoriasValidas.has(categoria), `Tópico '${topico}' aponta para categoria inválida '${categoria}'`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// solaris-gap-analyzer.ts — INSERT inclui risk_category_code
//
// FIX-08 (FASE B, 2026-06-01): arquitetura mudou — `mapTopicToCategory` foi
// REMOVIDO do solaris-gap-analyzer.ts. Agora `risk_category_code` vem direto
// dos metadados da pergunta (sq.risk_category_code, tornado obrigatório no
// FIX-06 PR #1324). Testes atualizados para refletir a nova arquitetura:
//   - import de mapTopicToCategory → REMOVIDO no solaris (preservado no iagen-gap-analyzer)
//   - riskCategoryCode = mapTopicToCategory(gap.topico_trigger) → SUBSTITUÍDO por
//     gap.risk_category_code direto do SELECT enriquecido
//   - SELECT enriquecido inclui sq.risk_category_code + sq.gap_descricao + sq.categoria
//   - O contrato "INSERT inclui coluna risk_category_code" PERMANECE (Fix B downstream OK)
// ---------------------------------------------------------------------------
describe("FIX-08 (substitui M3.10 Fix B) — solaris-gap-analyzer: risk_category_code direto da pergunta", () => {
  it("import de mapTopicToCategory REMOVIDO (substituído por leitura direta da pergunta)", () => {
    expect(SOLARIS_SRC).not.toMatch(
      /import\s+\{\s*mapTopicToCategory\s*\}\s+from\s+['"][./]+config\/topico-to-categoria['"]/,
    );
  });

  it("SELECT enriquecido inclui sq.risk_category_code (vem direto da pergunta — FIX-08)", () => {
    // FIX-08: SELECT traz risk_category_code da JOIN com solaris_questions
    expect(SOLARIS_SRC).toMatch(/sq\.risk_category_code/);
  });

  it("SELECT enriquecido inclui sq.gap_descricao + sq.categoria (FIX-05/06 metadados)", () => {
    expect(SOLARIS_SRC).toMatch(/sq\.gap_descricao/);
    expect(SOLARIS_SRC).toMatch(/sq\.categoria/);
  });

  it("INSERT inclui coluna risk_category_code na lista de colunas (preservado)", () => {
    expect(SOLARIS_SRC).toMatch(/source_reference[\s\S]{0,80}risk_category_code/);
  });

  it("INSERT bind do risk_category_code agora vem de gap.risk_category_code (não mais de variável derivada via MAP)", () => {
    expect(SOLARIS_SRC).toMatch(/gap\.risk_category_code/);
  });

  it("comentário inline documenta FIX-08 (substituiu M3.10 Fix B)", () => {
    expect(SOLARIS_SRC).toMatch(/FIX-08/);
  });
});

// ---------------------------------------------------------------------------
// iagen-gap-analyzer.ts — INSERT inclui risk_category_code
//
// FIX-09 (FASE C, 2026-06-01): arquitetura mudou — IAGEN agora usa
// EXCLUSIVAMENTE `iagen_answers.risk_category_code` (atribuído pelo LLM na
// geração — categoryAssignmentMode='llm_assigned'). KEYWORD_TO_TOPIC e
// SOLARIS_GAPS_MAP fallback REMOVIDOS. mapTopicToCategory também removido.
// Tests atualizados para refletir a nova arquitetura:
//   - import de mapTopicToCategory → REMOVIDO no iagen
//   - import de SOLARIS_GAPS_MAP → REMOVIDO no iagen
//   - KEYWORD_TO_TOPIC dict (35 keywords hardcoded) → REMOVIDO
//   - O path Z-11 risk_category_code direto VIROU O ÚNICO caminho (sem fallback)
//   - Skip + warn quando risk_category_code NULL (REGRA-ORQ-29)
// ---------------------------------------------------------------------------
describe("FIX-09 (substitui M3.10 Fix B IAGEN) — iagen-gap-analyzer: risk_category_code direto", () => {
  it("import de mapTopicToCategory REMOVIDO (arquitetura Max sem dicionários)", () => {
    expect(IAGEN_SRC).not.toMatch(
      /import\s+\{\s*mapTopicToCategory\s*\}\s+from\s+['"][./]+config\/topico-to-categoria['"]/,
    );
  });

  it("import de SOLARIS_GAPS_MAP REMOVIDO (sem fallback via keyword)", () => {
    expect(IAGEN_SRC).not.toMatch(
      /import\s+\{\s*SOLARIS_GAPS_MAP\s*\}\s+from/,
    );
  });

  it("KEYWORD_TO_TOPIC dict REMOVIDO (35 keywords hardcoded eliminadas — REGRA-ORQ-32)", () => {
    expect(IAGEN_SRC).not.toMatch(/const\s+KEYWORD_TO_TOPIC\s*:/);
  });

  it("helper buildIagenGapFromAnswer exportado (testável sem DB)", () => {
    expect(IAGEN_SRC).toMatch(/export\s+function\s+buildIagenGapFromAnswer/);
  });

  it("tipo IagenGapToInsert tem campo risk_category_code obrigatório (não nullable)", () => {
    expect(IAGEN_SRC).toMatch(/risk_category_code:\s*string;/);
  });

  it("INSERT inclui coluna risk_category_code (preservado)", () => {
    expect(IAGEN_SRC).toMatch(/source_reference[\s\S]{0,80}risk_category_code/);
  });

  it("INSERT bind do risk_category_code vem de gap.risk_category_code (já normalizado pelo helper)", () => {
    expect(IAGEN_SRC).toMatch(/gap\.risk_category_code,?\s*\n?\s*\]/);
  });

  it("comentário inline documenta FIX-09 (substituiu M3.10 Fix B do IAGEN)", () => {
    expect(IAGEN_SRC).toMatch(/FIX-09/);
  });

  it("guard: skip + warn quando risk_category_code NULL (REGRA-ORQ-29)", () => {
    expect(IAGEN_SRC).toMatch(/REGRA-ORQ-29/);
  });
});

// ---------------------------------------------------------------------------
// Sanidade do mapping — categorias batem com risk-categorizer.CategoriaCanonica
// ---------------------------------------------------------------------------
describe("M3.10 Fix B — preservação contratual (categorias válidas)", () => {
  it("não introduz categoria fora dos enums conhecidos (risk-categorizer + risk-engine-v4)", () => {
    // Categorias canônicas vivem em 2 arquivos por inconsistência pré-existente:
    // - risk-categorizer.ts:24 type CategoriaCanonica (10 + unmapped)
    // - risk-engine-v4.ts:22 type Categoria (extensão com confissao_automatica,
    //   inscricao_cadastral, transicao_iss_ibs, credito_presumido)
    // Validar contra ambos.
    const RISK_CATEGORIZER_SRC = readFileSync(
      path.resolve(__dirname, "risk-categorizer.ts"),
      "utf-8",
    );
    const RISK_ENGINE_SRC = readFileSync(
      path.resolve(__dirname, "risk-engine-v4.ts"),
      "utf-8",
    );
    const knownCategoriesSrc = RISK_CATEGORIZER_SRC + "\n" + RISK_ENGINE_SRC;

    for (const categoria of Object.values(TOPICO_TO_CATEGORIA)) {
      const pattern = new RegExp(`\\|\\s*"${categoria}"`);
      expect(
        knownCategoriesSrc,
        `Categoria '${categoria}' não existe em CategoriaCanonica (risk-categorizer.ts) nem Categoria (risk-engine-v4.ts)`,
      ).toMatch(pattern);
    }
  });
});
