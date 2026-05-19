/**
 * scripts/seed-normative-product-rules-cap23.ts
 *
 * Seed CONSERVADOR — Cap. 23 (agropecuário) anti-fallback.
 *
 * Bug de produção: NCMs 2304.00.10 e 2306.10.00 caíam em fallback Art. 139
 * (cultural) — falso positivo. Este seed impede que NCMs do Cap. 23 sejam
 * mapeados para regime cultural sem base legal verdadeira.
 *
 * NÃO afirma: aliquota_reduzida_60 / credito_presumido / isento.
 * NÃO referencia Art. 58 LC 214 para agro (Art. 58 = plataforma eletrônica
 * IBS/CBS; sem aderência a insumos agropecuários).
 * Aguarda: Decreto 12.955/2026 + Anexo IX estruturado para Fase 2 com
 * benefícios específicos.
 *
 * Padrão raw-SQL — espelha `server/lib/normative-inference.ts`.
 * Idempotência: SELECT prévio por (ncm_code, match_mode) — skip se já existe.
 * Colunas reais (mig 0076): id, regime, legal_reference, ncm_code, match_mode,
 * active, source_version, created_at. NÃO existe campo `code`.
 *
 * Uso: pnpm exec tsx scripts/seed-normative-product-rules-cap23.ts
 *      (requer DATABASE_URL; Manus executa em prod pós-merge).
 */

import { getDb } from "../server/db";

interface NcmRule {
  ncm_code: string;
  regime: string;
  legal_reference: string;
  match_mode: "exact" | "prefix";
}

const RULES_CAP23: NcmRule[] = [
  // Exact match — NCMs com bug confirmado em produção (projeto 6180001)
  {
    ncm_code: "2304.00.10",
    regime: "tratamento_agropecuario_especifico_pendente",
    legal_reference:
      "LC 214/2025 — Anexo agropecuário contendo 2304.00; benefício exato aguarda Decreto 12.955/2026",
    match_mode: "exact",
  },
  {
    ncm_code: "2306.10.00",
    regime: "tratamento_agropecuario_especifico_pendente",
    legal_reference:
      "LC 214/2025 — Anexo agropecuário contendo 23.06; benefício exato aguarda Decreto 12.955/2026",
    match_mode: "exact",
  },
  // Prefix match — demais NCMs Cap. 23 (validação Anexo IX pendente)
  {
    ncm_code: "2301",
    regime: "tratamento_agropecuario_especifico_pendente",
    legal_reference: "LC 214/2025 — validar Anexo IX completo",
    match_mode: "prefix",
  },
  {
    ncm_code: "2302",
    regime: "tratamento_agropecuario_especifico_pendente",
    legal_reference: "LC 214/2025 — validar Anexo IX completo",
    match_mode: "prefix",
  },
  {
    ncm_code: "2303",
    regime: "tratamento_agropecuario_especifico_pendente",
    legal_reference: "LC 214/2025 — validar Anexo IX completo",
    match_mode: "prefix",
  },
  {
    ncm_code: "2309",
    regime: "tratamento_agropecuario_especifico_pendente",
    legal_reference:
      "LC 214/2025 — validar Anexo IX completo; alimentação animal",
    match_mode: "prefix",
  },
];

async function execute(
  sql: string,
  params: unknown[] = []
): Promise<unknown[]> {
  const db = await getDb();
  if (!db) throw new Error("[seed] DATABASE_URL não configurado");
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as unknown[];
}

async function main(): Promise<void> {
  console.log(
    `[seed] normative_product_rules Cap. 23 — ${RULES_CAP23.length} regras conservadoras`
  );
  let inserted = 0;
  let skipped = 0;

  for (const rule of RULES_CAP23) {
    const rows = (await execute(
      "SELECT COUNT(*) as cnt FROM normative_product_rules WHERE ncm_code = ? AND match_mode = ?",
      [rule.ncm_code, rule.match_mode]
    )) as Array<{ cnt: number | string }>;
    const cnt = Number(rows[0]?.cnt ?? 0);
    if (cnt > 0) {
      console.log(
        `  ⏭️  skip ${rule.ncm_code} (${rule.match_mode}) — já existe`
      );
      skipped++;
      continue;
    }
    await execute(
      "INSERT INTO normative_product_rules (ncm_code, regime, legal_reference, match_mode, active, source_version) VALUES (?, ?, ?, ?, 1, 'LC214_2025')",
      [rule.ncm_code, rule.regime, rule.legal_reference, rule.match_mode]
    );
    console.log(`  ✅ ${rule.ncm_code} → ${rule.regime}`);
    inserted++;
  }

  console.log(
    `\n[seed] concluído — ${inserted} inseridas · ${skipped} skipped`
  );
  const totalRows = (await execute(
    "SELECT COUNT(*) as total FROM normative_product_rules WHERE ncm_code LIKE '23%'"
  )) as Array<{ total: number | string }>;
  console.log(
    `[seed] total atual em normative_product_rules WHERE ncm_code LIKE '23%': ${Number(totalRows[0]?.total ?? 0)}`
  );
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
