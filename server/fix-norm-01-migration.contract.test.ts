/**
 * FIX-NORM-01 (#1174) — contrato da migration de DADOS PURA.
 * Valida estaticamente o SQL (sem tocar engine/enrichArticle/DB). A verificação
 * end-to-end (enrichArticle propaga / DB state) é smoke do Manus pós-deploy.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SQL = readFileSync(
  path.resolve(process.cwd(), "drizzle/0102_fix_norm_01_artigo_base_bundles.sql"),
  "utf8"
);

describe("FIX-NORM-01 — migration 0102 (contrato do SQL)", () => {
  it("inscricao_cadastral: artigo_base → Art. 59 (guard no Art. 164)", () => {
    expect(SQL).toContain("WHERE codigo = 'inscricao_cadastral'");
    expect(SQL).toMatch(/artigo_base = 'Art\. 59 LC 214\/2025'/);
    expect(SQL).toContain("artigo_base = 'Art. 164 LC 214/2025'"); // guard idempotência
  });

  it("obrigacao_acessoria: artigo_base → Art. 60 (guard no Art. 102)", () => {
    expect(SQL).toContain("WHERE codigo = 'obrigacao_acessoria'");
    expect(SQL).toMatch(/artigo_base = 'Art\. 60 LC 214\/2025'/);
    expect(SQL).toContain("artigo_base = 'Art. 102 LC 214/2025'"); // guard
  });

  it("regime_diferenciado: artigo_base → Art. 126 genérico (guard no Art. 229)", () => {
    expect(SQL).toContain("WHERE codigo = 'regime_diferenciado'");
    expect(SQL).toMatch(/artigo_base = 'Art\. 126 LC 214\/2025'/);
    expect(SQL).toContain("artigo_base = 'Art. 229 LC 214/2025'"); // guard
    // regime genérico NÃO deve apontar para imóveis (251) — imóveis é categoria nova #1176
    expect(SQL).not.toMatch(/regime_diferenciado[\s\S]*?artigo_base = 'Art\. 251/);
  });

  it("transicao_iss_ibs: artigo_base → Art. 342 + status confirmed (guard nos Arts. 6-12)", () => {
    expect(SQL).toContain("WHERE codigo = 'transicao_iss_ibs'");
    expect(SQL).toMatch(/artigo_base = 'Art\. 342 LC 214\/2025'/);
    expect(SQL).toContain("normative_status = 'confirmed'");
    expect(SQL).toContain("artigo_base = 'Arts. 6-12 LC 214/2025'"); // guard
  });

  it("obrigacao_acessoria: cgibs6 corrigido — não contém 575-581 (fiscalização)", () => {
    expect(SQL).not.toMatch(/Art\. 57[5-9]/);
    expect(SQL).not.toMatch(/Art\. 58[01]/);
  });

  it("idempotência: 4 UPDATEs, cada um com guard WHERE artigo_base", () => {
    expect((SQL.match(/UPDATE risk_categories/g) ?? []).length).toBe(4);
    expect((SQL.match(/-- guard idempotência/g) ?? []).length).toBe(4);
  });

  it("rollback (DOWN) documentado no arquivo", () => {
    expect(SQL).toMatch(/ROLLBACK \(DOWN\)/i);
  });
});
