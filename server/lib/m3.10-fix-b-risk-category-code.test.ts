/**
 * m3.10-fix-b-risk-category-code.test.ts
 * Sprint M3.10 Fix B — preencher risk_category_code nos INSERTs dos analyzers órfãos.
 *
 * FIX-10 (FASE C, 2026-06-01): tests de `mapTopicToCategory` e `TOPICO_TO_CATEGORIA`
 * REMOVIDOS — arquivo `server/config/topico-to-categoria.ts` deletado neste PR.
 * Tests preservados validam apenas a NOVA arquitetura Max (FIX-08/FIX-09):
 *   - solaris-gap-analyzer: risk_category_code vem direto da pergunta (sq.risk_category_code)
 *   - iagen-gap-analyzer: risk_category_code vem direto de iagen_answers (LLM-assigned)
 *
 * Cobertura legada removida pelo FIX-10:
 *   ❌ mapTopicToCategory: 15 tópicos do dry-run + 7 edge cases
 *   ❌ TOPICO_TO_CATEGORIA: completude do mapping (15 dry-run + categorias válidas)
 *
 * Cobertura mantida (atualizada pelo FIX-08 e FIX-09):
 *   ✅ solaris-gap-analyzer.ts: INSERT inclui risk_category_code (grep static)
 *   ✅ iagen-gap-analyzer.ts: INSERT inclui risk_category_code (grep static)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
// FIX-10: imports REMOVIDOS — config/topico-to-categoria.ts deletado.
// Antes: import { mapTopicToCategory, TOPICO_TO_CATEGORIA } from "../config/topico-to-categoria";

const SOLARIS_SRC = readFileSync(
  path.resolve(__dirname, "solaris-gap-analyzer.ts"),
  "utf-8",
);
const IAGEN_SRC = readFileSync(
  path.resolve(__dirname, "iagen-gap-analyzer.ts"),
  "utf-8",
);

// ---------------------------------------------------------------------------
// FIX-10 (FASE C, 2026-06-01): 30 tests REMOVIDOS por obsolescência.
// Arquivos `solaris-gaps-map.ts` e `topico-to-categoria.ts` foram deletados;
// arquitetura Max (FIX-08/FIX-09) eliminou o lookup intermediário.
//
// Tests removidos:
//   - "M3.10 Fix B — mapTopicToCategory (mapeamento curado)" × 15 it.each
//   - "M3.10 Fix B — mapTopicToCategory edge cases" × 7
//   - "M3.10 Fix B — TOPICO_TO_CATEGORIA contém os 15 do dry-run" × 16 (it.each)
//
// Cobertura legada PRESERVADA via grep estático nos arquivos solaris/iagen:
//   - SOLARIS_SRC e IAGEN_SRC continuam sendo lidos
//   - Tests "FIX-08/FIX-09 substitui M3.10 Fix B" continuam asserting a nova arquitetura
// ---------------------------------------------------------------------------

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
// FIX-10 (FASE C, 2026-06-01): describe "preservação contratual" REMOVIDO.
// Iterava sobre TOPICO_TO_CATEGORIA (arquivo deletado). Não há substituto
// imediato — o contrato de "risk_category_code curado existe em
// risk_categories" agora é responsabilidade da curadoria do advogado via UI
// admin (FIX-06 obriga preenchimento + validação CRUD vs risk_categories
// pode ser adicionada em sprint futura).
// ---------------------------------------------------------------------------
describe.skip("M3.10 Fix B — preservação contratual (REMOVIDO FIX-10)", () => {
  it.skip("REMOVIDO FIX-10: TOPICO_TO_CATEGORIA não existe mais", () => {
    // Documentação intencional. Validação de risk_category_code vs
    // risk_categories agora é runtime via FK do banco (FIX-06 Zod).
  });
});
