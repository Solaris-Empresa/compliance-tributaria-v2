/**
 * FEAT-COB-01 (#1176) — contrato da migration 0107 (validação estática do SQL).
 * Garante que as 3 categorias do regime de imóveis incluem as 7 COLUNAS NOT NULL sem
 * default de risk_categories (Gate 0 — o despacho original só listava 3 colunas → INSERT
 * falharia com "Field 'nome' doesn't have a default value") + bundle no shape OBJETO
 * compatível com enrichArticle (não o shape nested do despacho v4).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SQL = readFileSync(
  path.resolve(process.cwd(), "drizzle/0107_feat_cob_01_regime_imoveis.sql"),
  "utf8",
);

describe("FEAT-COB-01 — migration 0107 (contrato do SQL)", () => {
  it("3 INSERTs em risk_categories", () => {
    expect((SQL.match(/INSERT INTO risk_categories/g) ?? []).length).toBe(3);
  });

  it("as 3 categorias (G-A Opção 1 — risco_art_269_270 literal)", () => {
    for (const c of [
      "'regime_especifico_imoveis'",
      "'regime_especifico_imoveis_locacao'",
      "'risco_art_269_270'",
    ]) {
      expect(SQL).toContain(c);
    }
  });

  it("Gate 0: column list inclui as 7 NOT NULL sem default (nome/severidade/urgencia/tipo/lei_codigo/vigencia_inicio/origem)", () => {
    const colList =
      /\(codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,\s*vigencia_inicio, vigencia_fim, status, origem, escopo, normative_bundle\)/g;
    expect((SQL.match(colList) ?? []).length).toBe(3);
  });

  it("lei_codigo='LC-214-2025' (convenção do seed 0065) — 3x", () => {
    expect((SQL.match(/'LC-214-2025'/g) ?? []).length).toBe(3);
  });

  it("tipo: 2 opportunity + 1 risk", () => {
    expect((SQL.match(/'opportunity'/g) ?? []).length).toBe(2);
    expect((SQL.match(/'risk'/g) ?? []).length).toBe(1);
  });

  it("severidade: 2 'oportunidade' (oportunidades) + 1 'media' (risco)", () => {
    expect((SQL.match(/'oportunidade'/g) ?? []).length).toBe(2);
    expect((SQL.match(/'media'/g) ?? []).length).toBe(1);
  });

  it("bundle shape OBJETO compatível com enrichArticle (artigos_decreto + artigos_lc214)", () => {
    expect((SQL.match(/"artigos_decreto"/g) ?? []).length).toBe(3);
    expect((SQL.match(/"artigos_lc214"/g) ?? []).length).toBe(3);
    expect((SQL.match(/"artigos_cgibs6"/g) ?? []).length).toBe(3);
  });

  it("NÃO usa o shape nested do despacho v4 (primary_source/regulatory_sources/reducao/nature_type)", () => {
    expect(SQL).not.toMatch(/primary_source|regulatory_sources|nature_type|"reducao"/);
  });

  it("risco_art_269_270: bundle artigos_decreto [388,389,390] = LC 269/270 (Art. 389/390 decreto)", () => {
    expect(SQL).toMatch(/"tema":"risco_art_269_270","artigos_lc214":\[269,270\],"artigos_decreto":\[388,389,390\]/);
  });

  it("NÃO insere em regulatory_requirements_v3 (geração por-perfil — decisão N1.4)", () => {
    expect(SQL).not.toMatch(/INSERT INTO regulatory_requirements_v3/);
  });

  it("idempotência: guard NOT EXISTS por codigo (3x)", () => {
    expect((SQL.match(/WHERE NOT EXISTS \(SELECT 1 FROM risk_categories WHERE codigo = '/g) ?? []).length).toBe(3);
  });

  it("rollback (DOWN) documentado: DELETE por codigo", () => {
    expect(SQL).toMatch(/DOWN/);
    expect(SQL).toMatch(/DELETE FROM risk_categories WHERE codigo IN/);
  });
});
