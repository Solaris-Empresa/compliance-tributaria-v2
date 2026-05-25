/**
 * FASE 4 / Passo 3 — contrato da migration 0111 (3 categorias grounding-only).
 * Valida cnae_codes + vigencia_inicio + normative_status (pending_vigency p/ 2027).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SQL = readFileSync(
  path.resolve(process.cwd(), "drizzle/0111_bug_ibs_fase4_3cats.sql"),
  "utf8",
);

describe("FASE 4 Passo 3 — migration 0111 (3 cats)", () => {
  it("3 INSERTs (reabilitacao_urbana + reciclagem + bens_usados)", () => {
    expect((SQL.match(/^INSERT INTO risk_categories/gm) ?? []).length).toBe(3);
    for (const c of ["regime_diferenciado_reabilitacao_urbana", "credito_presumido_reciclagem", "credito_presumido_bens_usados"]) {
      expect(SQL).toContain(`'${c}'`);
    }
  });

  it("bundle via JSON_OBJECT com artigos_cgibs6 (strings) + cnae_codes", () => {
    expect((SQL.match(/JSON_OBJECT\('tema'/g) ?? []).length).toBe(3);
    expect((SQL.match(/'artigos_cgibs6', JSON_ARRAY\('Art\. /g) ?? []).length).toBe(3);
    expect((SQL.match(/'cnae_codes', JSON_ARRAY\('/g) ?? []).length).toBe(3);
  });

  it("reabilitacao_urbana: confirmed + 2026-04-30 + CNAEs construção/imobiliária", () => {
    expect(SQL).toMatch(/'regime_diferenciado_reabilitacao_urbana'[\s\S]*?'2026-04-30'[\s\S]*?'confirmed'/);
    expect(SQL).toMatch(/JSON_ARRAY\('4120-4','4110-7','4211-1','4213-8'\)/);
  });

  it("reciclagem + bens_usados: pending_vigency + 2027-01-01 (vigência diferida)", () => {
    // contar só os valores executados (não o comentário): '...', 'pending_vigency', + '2027-01-01', NULL,
    expect((SQL.match(/'nacional', 'pending_vigency'/g) ?? []).length).toBe(2);
    expect((SQL.match(/'2027-01-01', NULL,/g) ?? []).length).toBe(2);
  });

  it("7 NOT NULL preenchidos (nome/severidade/urgencia/tipo/artigo_base/lei_codigo/origem) — 3x", () => {
    const colList = /\(codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,\s*vigencia_inicio, vigencia_fim, status, origem, escopo, normative_status, normative_bundle\)/g;
    expect((SQL.match(colList) ?? []).length).toBe(3);
  });

  it("idempotente (WHERE NOT EXISTS 3x) + DOWN documentado", () => {
    expect((SQL.match(/WHERE NOT EXISTS \(SELECT 1 FROM risk_categories WHERE codigo = '/g) ?? []).length).toBe(3);
    expect(SQL).toMatch(/DOWN/);
    expect(SQL).toMatch(/DELETE FROM risk_categories WHERE codigo IN/);
  });
});
