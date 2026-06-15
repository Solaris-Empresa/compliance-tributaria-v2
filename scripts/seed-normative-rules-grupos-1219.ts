/**
 * scripts/seed-normative-rules-grupos-1219.ts
 *
 * GATE-NCM-NBS #1219 F5 — curadoria: adiciona GRUPOS (prefix) curados a
 * normative_product_rules / normative_service_rules para o resolver (F2/ADR-0035)
 * resolver grupo→regra (source='normative_rules', não fallback).
 *
 * ⚠️ REGRA-ORQ-29 / Lição #88 / precedente seed-normative-product-rules-cap23.ts:
 * NÃO asserir regime de BENEFÍCIO (aliquota_zero / aliquota_reduzida_60 /
 * credito_presumido) sem base legal validada. O despacho F5 sugeria
 * 8436→Art.197, 2306/2304→aliquota_reduzida_60, 1006→aliquota_zero — porém o
 * cap23 já recusou esses benefícios ("aguarda Decreto 12.955/2026 + Anexo IX").
 * Portanto os grupos entram com regime CONSERVADOR *_pendente. O benefício
 * específico de cada grupo aguarda validação jurídica (Dr. José) — issue futura.
 *
 * O benefício do Art. 197 (máquinas agrícolas, grupo 8436) NÃO depende deste
 * regime: é injetado por art197-injection.ts (gate CNAE 28 + NCM 8436), separado.
 *
 * Padrão raw-SQL idempotente (espelha cap23): SELECT prévio por (code, match_mode),
 * skip se já existe. Colunas product (mig 0076): id, regime, legal_reference,
 * ncm_code, match_mode, active, source_version, created_at. Service: nbs_code.
 *
 * Uso: pnpm exec tsx scripts/seed-normative-rules-grupos-1219.ts
 *      (requer DATABASE_URL; Manus executa em prod pós-merge — Lição #89: scripts/
 *       fora do tsconfig, validar por leitura + execução).
 */

import { getDb } from "../server/db";

const SOURCE_VERSION = "1219-F5-grupos";

interface ProductGroup {
  ncm_code: string;
  regime: string;
  legal_reference: string;
  match_mode: "exact" | "prefix";
}
interface ServiceGroup {
  nbs_code: string;
  regime: string;
  legal_reference: string;
  match_mode: "exact" | "prefix";
}

// ── NCM grupos (prefix 4 díg.) — regime CONSERVADOR (benefício aguarda Dr. José) ──
const PRODUCT_GROUPS: ProductGroup[] = [
  {
    ncm_code: "8436",
    regime: "tratamento_bens_capital_agro_pendente",
    legal_reference:
      "Grupo 8436 (máquinas/implementos agrícolas). Benefício Art. 197 é injetado por art197-injection (gate CNAE 28 + NCM 8436), não por este regime. Regime específico aguarda Decreto 12.955/2026 + validação jurídica.",
    match_mode: "prefix",
  },
  {
    ncm_code: "2306",
    regime: "tratamento_agropecuario_especifico_pendente",
    legal_reference:
      "Grupo 2306 (farelos/tortas). aliquota_reduzida_60 NÃO afirmada sem Anexo IX (precedente cap23). Aguarda Decreto 12.955/2026 + validação jurídica.",
    match_mode: "prefix",
  },
  {
    ncm_code: "2304",
    regime: "tratamento_agropecuario_especifico_pendente",
    legal_reference:
      "Grupo 2304 (torta de soja). aliquota_reduzida_60 NÃO afirmada sem Anexo IX (precedente cap23). Aguarda validação jurídica.",
    match_mode: "prefix",
  },
  {
    ncm_code: "1006",
    regime: "cesta_basica_pendente",
    legal_reference:
      "Grupo 1006 (arroz). aliquota_zero da cesta básica (Anexo I) é TAXATIVA por subitem (ex: 1006.30.21 ≠ 1006.10) — grupo NÃO concede aliquota_zero; refino específico obrigatório (ADR-0035). Aguarda lista Anexo I validada.",
    match_mode: "prefix",
  },
];

// ── NBS grupos (prefix N.NNNN) — só os AUSENTES; "1.15"(TI)/"1.13" já existem ──
const SERVICE_GROUPS: ServiceGroup[] = [
  {
    nbs_code: "1.05",
    regime: "aliquota_padrao",
    legal_reference:
      "Grupo 1.05xx (transporte de cargas). Regra geral LC 214/2025; regime diferenciado de transporte aguarda confirmação jurídica (ver #1281).",
    match_mode: "prefix",
  },
  {
    nbs_code: "1.09",
    regime: "regime_especifico_pendente",
    legal_reference:
      "Grupo 1.09xx (serviços financeiros). Regime específico financeiro LC 214/2025 aguarda validação jurídica.",
    match_mode: "prefix",
  },
  {
    nbs_code: "1.06",
    regime: "aliquota_padrao",
    legal_reference:
      "Grupo 1.06xx (serviços diversos). Regra geral LC 214/2025; regime específico aguarda validação jurídica.",
    match_mode: "prefix",
  },
];

async function rawAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  if (!db) throw new Error("[seed-grupos-1219] DATABASE_URL não configurado");
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as T[];
}
async function rawExec(sql: string, params: unknown[] = []): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("[seed-grupos-1219] DATABASE_URL não configurado");
  await (db.$client as any).promise().execute(sql, params);
}

async function main() {
  let insP = 0,
    skpP = 0,
    insS = 0,
    skpS = 0;

  for (const g of PRODUCT_GROUPS) {
    const existing = await rawAll<{ id: number }>(
      `SELECT id FROM normative_product_rules WHERE ncm_code = ? AND match_mode = ?`,
      [g.ncm_code, g.match_mode],
    );
    if (existing.length > 0) {
      skpP++;
      console.log(`[skip] product ${g.ncm_code} (${g.match_mode}) já existe`);
      continue;
    }
    await rawExec(
      `INSERT INTO normative_product_rules (regime, legal_reference, ncm_code, match_mode, active, source_version)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [g.regime, g.legal_reference, g.ncm_code, g.match_mode, SOURCE_VERSION],
    );
    insP++;
    console.log(`[insert] product ${g.ncm_code} → ${g.regime}`);
  }

  for (const g of SERVICE_GROUPS) {
    const existing = await rawAll<{ id: number }>(
      `SELECT id FROM normative_service_rules WHERE nbs_code = ? AND match_mode = ?`,
      [g.nbs_code, g.match_mode],
    );
    if (existing.length > 0) {
      skpS++;
      console.log(`[skip] service ${g.nbs_code} (${g.match_mode}) já existe`);
      continue;
    }
    await rawExec(
      `INSERT INTO normative_service_rules (regime, legal_reference, nbs_code, match_mode, active, source_version)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [g.regime, g.legal_reference, g.nbs_code, g.match_mode, SOURCE_VERSION],
    );
    insS++;
    console.log(`[insert] service ${g.nbs_code} → ${g.regime}`);
  }

  const [{ cnt: totalP }] = await rawAll<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM normative_product_rules WHERE active = 1`,
  );
  const [{ cnt: totalS }] = await rawAll<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM normative_service_rules WHERE active = 1`,
  );
  console.log(
    `\n[F5] product: +${insP} (${skpP} skip) → total ativo ${totalP} | service: +${insS} (${skpS} skip) → total ativo ${totalS}`,
  );
  console.log(
    "[F5] Regimes de BENEFÍCIO (aliquota_zero/reduzida_60/Art.197) NÃO asseridos — aguardam Dr. José (REGRA-ORQ-29).",
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[seed-grupos-1219] erro:", e);
    process.exit(1);
  });
