/**
 * BUG-IBS-01 Fase 3 — contrato da migration 0108 (validação estática do SQL).
 * Garante que os artigos_cgibs6 espelham EXATAMENTE o prod (Manus 25/05, REGRA-ORQ-37)
 * — não os "ranges" do relatório (que não batiam: credito_presumido = 515,518,520,521,523,
 * não 515-523). Total 89 artigos em 8 categorias.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SQL = readFileSync(
  path.resolve(process.cwd(), "drizzle/0108_bug_ibs_01_fase3_cgibs6_bundles.sql"),
  "utf8",
);

/** Extrai a JSON_ARRAY de artigos do bloco UPDATE de uma categoria. */
function artigosOf(codigo: string): string[] {
  const re = new RegExp(
    `JSON_ARRAY\\(([^)]*)\\)\\)\\s*\\nWHERE codigo = '${codigo}'`,
  );
  const m = SQL.match(re);
  if (!m) return [];
  return (m[1].match(/'Art\. \d+'/g) ?? []).map((s) => s.replace(/'/g, ""));
}

describe("BUG-IBS-01 Fase 3 — migration 0108 (contrato do SQL)", () => {
  it("8 UPDATEs (categorias com cgibs6 curado)", () => {
    expect((SQL.match(/UPDATE risk_categories/g) ?? []).length).toBe(8);
  });

  it("usa JSON_SET idempotente na chave flat artigos_cgibs6 (compatível enrichArticle)", () => {
    expect((SQL.match(/JSON_SET\(normative_bundle, '\$\.artigos_cgibs6'/g) ?? []).length).toBe(8);
  });

  it("split_payment = 28-37 + 593-595 (operacional + penalidades) — 13 artigos", () => {
    const a = artigosOf("split_payment");
    expect(a).toHaveLength(13);
    expect(a).toContain("Art. 28");
    expect(a).toContain("Art. 595");
  });

  it("credito_presumido = 483,484,515,518,520,521,523 (NÃO range 515-523) — 7 artigos", () => {
    const a = artigosOf("credito_presumido");
    expect(a).toEqual(["Art. 483","Art. 484","Art. 515","Art. 518","Art. 520","Art. 521","Art. 523"]);
    expect(a).not.toContain("Art. 516"); // prova: range descartado, lista exata do jurídico
  });

  it("regime_especifico_imoveis = 359-390 (32 artigos; exclui 391-396)", () => {
    const a = artigosOf("regime_especifico_imoveis");
    expect(a).toHaveLength(32);
    expect(a).toContain("Art. 359");
    expect(a).toContain("Art. 390");
    expect(a).not.toContain("Art. 391"); // cooperativas
    expect(a).not.toContain("Art. 396"); // alimentação
  });

  it("contagens por categoria batem com o prod (total 89)", () => {
    const counts: Record<string, number> = {
      split_payment: 13, confissao_automatica: 3, inscricao_cadastral: 7,
      obrigacao_acessoria: 11, credito_presumido: 7, regime_especifico_imoveis: 32,
      regime_especifico_imoveis_locacao: 14, risco_art_269_270: 2,
    };
    let total = 0;
    for (const [cod, n] of Object.entries(counts)) {
      expect(artigosOf(cod)).toHaveLength(n);
      total += n;
    }
    expect(total).toBe(89);
  });

  it("imposto_seletivo / aliquota_reduzida / regime_diferenciado NÃO são atualizados (decisão jurídica)", () => {
    expect(SQL).not.toMatch(/WHERE codigo = 'imposto_seletivo'/);
    expect(SQL).not.toMatch(/WHERE codigo = 'aliquota_reduzida'/);
    expect(SQL).not.toMatch(/WHERE codigo = 'regime_diferenciado'/);
    // documentados no comentário
    expect(SQL).toMatch(/not_covered_materially/);
    expect(SQL).toMatch(/split_required/);
  });

  it("rollback (DOWN) documentado", () => {
    expect(SQL).toMatch(/DOWN/);
    expect(SQL).toMatch(/pré-Fase 3/);
  });
});

describe("BUG-IBS-DRIFT-01 — normative_status='confirmed' (imóveis 0107 nasceram pending_document)", () => {
  /** O UPDATE de status lista os 3 codigos de imóveis num único IN (...). */
  function statusFlipHas(codigo: string): boolean {
    const m = SQL.match(/SET normative_status = 'confirmed'\s*\nWHERE codigo IN \(([^)]*)\)/);
    return m ? m[1].includes(`'${codigo}'`) : false;
  }

  it("UPDATE normative_status='confirmed' presente (sem o flip, grounding de imóveis falha em DB limpo)", () => {
    expect(SQL).toMatch(/SET normative_status = 'confirmed'/);
  });
  it("regime_especifico_imoveis normative_status = confirmed", () => {
    expect(statusFlipHas("regime_especifico_imoveis")).toBe(true);
  });
  it("regime_especifico_imoveis_locacao normative_status = confirmed", () => {
    expect(statusFlipHas("regime_especifico_imoveis_locacao")).toBe(true);
  });
  it("risco_art_269_270 normative_status = confirmed", () => {
    expect(statusFlipHas("risco_art_269_270")).toBe(true);
  });
});
