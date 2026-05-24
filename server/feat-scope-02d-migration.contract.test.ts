/**
 * FEAT-SCOPE-02-D (#1197) — contrato da migration 0106 (validação estática do SQL).
 * Garante que as 3 perguntas usam as COLUNAS REAIS (Gate 0 / G2 SHOW FULL COLUMNS),
 * não as colunas assumidas no despacho (question_key/eliminatoria/ordem — inexistentes).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SQL = readFileSync(
  path.resolve(process.cwd(), "drizzle/0106_feat_scope_02d_credito_presumido_questions.sql"),
  "utf8",
);

describe("FEAT-SCOPE-02-D — migration 0106 (contrato do SQL)", () => {
  it("3 INSERTs em solaris_questions", () => {
    expect((SQL.match(/INSERT INTO solaris_questions/g) ?? []).length).toBe(3);
  });

  it("codigos SOL-050/051/052 (próximos livres — G1)", () => {
    for (const c of ["SOL-050", "SOL-051", "SOL-052"]) {
      expect(SQL).toContain(`'${c}'`);
    }
  });

  it("engine link: categoria + risk_category_code = 'credito_presumido'", () => {
    expect((SQL.match(/'credito_presumido', 'credito_presumido'/g) ?? []).length).toBe(3);
  });

  it("criado_em fornecido (bigint NOT NULL sem default — G2)", () => {
    expect((SQL.match(/FLOOR\(UNIX_TIMESTAMP\(NOW\(3\)\) \* 1000\)/g) ?? []).length).toBe(3);
  });

  it("mapping_review_status='curated_internal' (exibida — db.ts:1381)", () => {
    // >= 3: as 3 perguntas usam o valor (pode haver menção em comentário)
    expect((SQL.match(/'curated_internal'/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("metadado estruturado: lei_ref='lc214' + artigo_ref (Art. 168 / Art. 164) — Lição #61", () => {
    expect((SQL.match(/'lc214'/g) ?? []).length).toBe(3);
    expect(SQL).toMatch(/'Art\. 168 caput; Art\. 41 §1º'/);
    expect(SQL).toMatch(/'Art\. 168 caput'/);
    expect(SQL).toMatch(/'Art\. 164 caput'/);
  });

  it("cnae_groups NULL (universal — Art. 168 não restringe por CNAE)", () => {
    // 3 ocorrências de NULL na posição de cnae_groups (após 'credito_presumido', 'credito_presumido', )
    expect((SQL.match(/'credito_presumido', 'credito_presumido', NULL/g) ?? []).length).toBe(3);
  });

  it("idempotência: guard NOT EXISTS por codigo (codigo não tem unique key)", () => {
    expect((SQL.match(/WHERE NOT EXISTS \(SELECT 1 FROM solaris_questions WHERE codigo = 'SOL-05[012]'\)/g) ?? []).length).toBe(3);
  });

  it("NÃO usa colunas inexistentes do despacho (question_key/question_text/eliminatoria/ordem)", () => {
    expect(SQL).not.toMatch(/question_key|question_text|eliminatoria|\bordem\b/);
  });

  it("rollback (DOWN) documentado: DELETE por codigo", () => {
    expect(SQL).toMatch(/ROLLBACK \(DOWN\)/i);
    expect(SQL).toMatch(/DELETE FROM solaris_questions WHERE codigo IN \('SOL-050', 'SOL-051', 'SOL-052'\)/);
  });
});
