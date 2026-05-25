/**
 * BUG-3 #1245 — contrato da migration 0116 (gate CNAE p/ 3 categorias imobiliárias).
 * Parseia as cnae_codes do .sql e exercita o gate puro `shouldInjectCategory` (sem DB, CI-safe #1043).
 *
 * Gate 0 (correção da DoD do despacho): o item "6810-2 recebe _locacao mas NÃO
 * regime_especifico_imoveis" contradiz o SQL — 6810-2 ESTÁ na lista de regime_especifico_imoveis.
 * Semanticamente correto (imobiliária recebe o regime geral de imóveis). Assertions corrigidas:
 * 6810-2 recebe regime + locacao; o negativo de 6810-2 é risco_art_269_270.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { shouldInjectCategory } from "./lib/deterministic-grounding";

const SQL = readFileSync(
  path.resolve(process.cwd(), "drizzle/0116_regime_imoveis_3cats_codes.sql"),
  "utf8",
);

/** Extrai os cnae_codes do bloco UPDATE cujo WHERE casa `codigo`. */
function codesFor(codigo: string): string[] {
  const whereIdx = SQL.indexOf(`WHERE codigo = '${codigo}'`);
  const start = SQL.lastIndexOf("UPDATE risk_categories", whereIdx);
  const block = SQL.slice(start, whereIdx);
  const m = block.match(/'\$\.cnae_codes',\s*JSON_ARRAY\(([^)]*)\)/);
  return m ? (m[1].match(/'[\d-]+'/g) ?? []).map((s) => s.replace(/'/g, "")) : [];
}

const PAST = new Date("2026-04-30"); // vigência passada → não bloqueia
const TODAY = new Date("2026-05-25");
const regime = codesFor("regime_especifico_imoveis");
const locacao = codesFor("regime_especifico_imoveis_locacao");
const risco = codesFor("risco_art_269_270");

describe("#1245 — migration 0116 gateia 3 categorias imobiliárias", () => {
  it("3 UPDATEs com as listas corretas no SQL", () => {
    expect((SQL.match(/^UPDATE risk_categories/gm) ?? []).length).toBe(3);
    expect([...regime].sort()).toEqual(["4110-7", "4120-4", "6810-2", "6822-6"]);
    expect([...locacao].sort()).toEqual(["6810-2", "6821-8", "6822-6"]);
    expect([...risco].sort()).toEqual(["4110-7", "4120-4", "4211-1", "4213-8"]);
  });

  it("6911-7 (advogado) é BLOQUEADO nas 3 categorias", () => {
    expect(shouldInjectCategory(regime, PAST, { cnae: "6911-7", today: TODAY })).toBe(false);
    expect(shouldInjectCategory(locacao, PAST, { cnae: "6911-7", today: TODAY })).toBe(false);
    expect(shouldInjectCategory(risco, PAST, { cnae: "6911-7", today: TODAY })).toBe(false);
  });

  it("4120-4 (construtora) recebe regime_especifico_imoveis + risco_art_269_270, não locacao", () => {
    expect(shouldInjectCategory(regime, PAST, { cnae: "4120-4", today: TODAY })).toBe(true);
    expect(shouldInjectCategory(risco, PAST, { cnae: "4120-4", today: TODAY })).toBe(true);
    expect(shouldInjectCategory(locacao, PAST, { cnae: "4120-4", today: TODAY })).toBe(false);
  });

  it("6810-2 (imobiliária) recebe _locacao + regime_especifico_imoveis, não risco (Gate 0: 6810-2 ESTÁ em regime)", () => {
    expect(shouldInjectCategory(locacao, PAST, { cnae: "6810-2", today: TODAY })).toBe(true);
    expect(shouldInjectCategory(regime, PAST, { cnae: "6810-2", today: TODAY })).toBe(true);
    expect(shouldInjectCategory(risco, PAST, { cnae: "6810-2", today: TODAY })).toBe(false);
  });
});
