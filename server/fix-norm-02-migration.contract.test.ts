/**
 * FIX-NORM-02 (#1175) — contrato da migration de DADOS PURA (Caminho B1).
 * Valida estaticamente o SQL (sem tocar engine/DB). Garante que o bundle é
 * compatível com os consumidores (article-level no decreto; cgibs6 vazio).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SQL = readFileSync(
  path.resolve(process.cwd(), "drizzle/0103_fix_norm_02_confissao_automatica_bundle.sql"),
  "utf8"
);

describe("FIX-NORM-02 — migration 0103 (contrato do SQL · Caminho B1)", () => {
  it("confissao_automatica: bundle populado + status confirmed", () => {
    expect(SQL).toContain("WHERE codigo = 'confissao_automatica'");
    expect(SQL).toContain("normative_status = 'confirmed'");
  });

  it("artigos_decreto: ARTICLE-LEVEL ['Art. 44','Art. 46','Art. 112'] (sem § — casa no corpus)", () => {
    expect(SQL).toMatch(/'artigos_decreto', JSON_ARRAY\(\s*'Art\. 44', 'Art\. 46', 'Art\. 112'\s*\)/);
    // o array decreto NÃO pode ter § (quebraria inArray + formatArticleRange)
    const decretoLine = SQL.split("\n").find((l) => l.includes("'artigos_decreto'")) ?? "";
    expect(decretoLine).not.toMatch(/§|caput/);
  });

  it("artigos_cgibs6: VAZIO (números CGIBS 6 ainda não curados — FIX-NORM-02-CGIBS)", () => {
    expect(SQL).toMatch(/'artigos_cgibs6', JSON_ARRAY\(\)/);
  });

  it("idempotência: guard WHERE normative_status='pending_document'", () => {
    expect(SQL).toContain("normative_status = 'pending_document'");
    expect(SQL).toContain("AND artigo_base = 'Art. 45 LC 214/2025'");
  });

  it("rollback (DOWN) documentado: normative_bundle=NULL + status=pending_document", () => {
    expect(SQL).toMatch(/ROLLBACK \(DOWN\)/i);
    expect(SQL).toMatch(/normative_bundle = NULL/);
  });

  it("não toca engine: 1 UPDATE executável (o do DOWN é comentado)", () => {
    // só conta UPDATE no início de linha (executável); o DOWN é "-- UPDATE"
    expect((SQL.match(/^UPDATE risk_categories/gm) ?? []).length).toBe(1);
  });
});
