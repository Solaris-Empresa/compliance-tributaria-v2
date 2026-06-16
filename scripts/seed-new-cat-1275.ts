/**
 * scripts/seed-new-cat-1275.ts
 *
 * GATE-NCM-NBS #1219 / #1275 — NEW-CAT aliquota_zero_bens_capital_agro.
 * Spec v2 aprovada (P.O. + Manus + Claude Code). Gate jurídico D0-JUR: Dr. José
 * confirmou LC 214 Art. 110 + Decreto 12.955/2026 Art. 197 + CGIBS 6 Art. 197
 * (Anexo IV Tabela II).
 *
 * Faz o Art. 197 (alíquota zero — bens de capital agro) chegar à MATRIZ de riscos:
 *   1. risk_categories: nova categoria opportunity, status=ativo, normative_status=confirmed
 *   2. normative_product_rules (8436 prefix): regime pendente → categoria
 *   3. 4 regras exact (8436.10/21/91/99.00) — Anexo IV Tabela II
 *
 * O elo gap→categoria (engine-gap-analyzer) + TITULO_TEMPLATES são código (PR).
 *
 * Idempotente (SELECT-skip; precedente seed-normative-product-rules-cap23.ts).
 * scripts/ fora do tsconfig (Lição #89) — validar por leitura + tsx; Manus executa em prod.
 * Uso: pnpm exec tsx scripts/seed-new-cat-1275.ts   (requer DATABASE_URL)
 *
 * ── ROLLBACK (DOWN) ─────────────────────────────────────────────────────────
 *   DELETE FROM normative_product_rules WHERE source_version = '1275-NEW-CAT';
 *   UPDATE normative_product_rules SET regime='tratamento_bens_capital_agro_pendente'
 *     WHERE ncm_code='8436' AND match_mode='prefix';
 *   DELETE FROM risk_categories WHERE codigo='aliquota_zero_bens_capital_agro';
 */

import { getDb } from "../server/db";

const CODIGO = "aliquota_zero_bens_capital_agro";
const SOURCE_VERSION = "1275-NEW-CAT";

const EXACT_NCMS = ["8436.10.00", "8436.21.00", "8436.91.00", "8436.99.00"];

async function rawAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  if (!db) throw new Error("[seed-1275] DATABASE_URL não configurado");
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as T[];
}
async function rawExec(sql: string, params: unknown[] = []): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("[seed-1275] DATABASE_URL não configurado");
  await (db.$client as any).promise().execute(sql, params);
}

async function main() {
  // ── Bloco 1: risk_categories (idempotente) ──────────────────────────────
  const existingCat = await rawAll<{ id: number }>(
    `SELECT id FROM risk_categories WHERE codigo = ?`,
    [CODIGO],
  );
  if (existingCat.length > 0) {
    console.log(`[skip] risk_categories ${CODIGO} já existe`);
  } else {
    await rawExec(
      `INSERT INTO risk_categories
         (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
          vigencia_inicio, status, origem, escopo, descricao,
          normative_status, source_basis, normative_bundle)
       VALUES (?, ?, 'oportunidade', 'curto_prazo', 'opportunity', ?, 'LC-214-2025',
          '2026-01-01 00:00:00', 'ativo', 'regulamentacao', 'setorial', ?,
          'confirmed',
          JSON_ARRAY('LC 214/2025 Art. 110','Decreto 12.955/2026 Art. 197','Res. CGIBS 6/2026 Art. 197'),
          JSON_OBJECT('artigos_decreto', JSON_ARRAY('Art. 197'),
                      'artigos_cgibs6',  JSON_ARRAY('Art. 197'),
                      'artigos_portaria7', NULL))`,
      [
        CODIGO,
        "Alíquota zero — bens de capital agro",
        "Art. 110 LC 214 c/c Art. 197 Decreto 12.955/2026",
        "Alíquota zero IBS/CBS — máquinas/implementos agrícolas destinados a produtor rural não contribuinte",
      ],
    );
    console.log(`[insert] risk_categories ${CODIGO} (status=ativo, normative_status=confirmed)`);
  }

  // ── Bloco 2: UPDATE 8436 prefix → categoria (WHERE determinístico) ───────
  await rawExec(
    `UPDATE normative_product_rules
     SET regime = ?,
         legal_reference = 'LC 214/2025 Art. 110 c/c Decreto 12.955/2026 Art. 197 (Anexo IV Tabela II). Gate: CNAE grupo 28 + NCM elegível + destinatário produtor rural não contribuinte.'
     WHERE ncm_code = '8436' AND match_mode = 'prefix'`,
    [CODIGO],
  );
  console.log(`[update] normative_product_rules 8436 prefix → regime=${CODIGO}`);

  // ── Bloco 3: 4 regras exact (idempotente) ───────────────────────────────
  let insExact = 0,
    skpExact = 0;
  for (const ncm of EXACT_NCMS) {
    const ex = await rawAll<{ id: number }>(
      `SELECT id FROM normative_product_rules WHERE ncm_code = ? AND match_mode = 'exact'`,
      [ncm],
    );
    if (ex.length > 0) {
      skpExact++;
      console.log(`[skip] exact ${ncm} já existe`);
      continue;
    }
    await rawExec(
      `INSERT INTO normative_product_rules
         (ncm_code, match_mode, regime, legal_reference, active, source_version)
       VALUES (?, 'exact', ?, 'Decreto 12.955/2026 Art. 197 c/c Anexo IV Tabela II', 1, ?)`,
      [ncm, CODIGO, SOURCE_VERSION],
    );
    insExact++;
    console.log(`[insert] exact ${ncm} → ${CODIGO}`);
  }

  // ── Verificação ──────────────────────────────────────────────────────────
  const [{ st }] = await rawAll<{ st: string }>(
    `SELECT status AS st FROM risk_categories WHERE codigo = ?`,
    [CODIGO],
  );
  const [{ cnt }] = await rawAll<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM normative_product_rules WHERE source_version = ?`,
    [SOURCE_VERSION],
  );
  console.log(
    `\n[#1275] risk_categories.${CODIGO} status=${st} | exact rules source_version=${SOURCE_VERSION}: ${cnt} (esperado 4) | inseridas=${insExact} skip=${skpExact}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[seed-1275] erro:", e);
    process.exit(1);
  });
