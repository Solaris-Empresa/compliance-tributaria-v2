/**
 * scripts/seed-agro-coverage-art197i-1452.ts — #1452 Gate Agro Coverage (Despacho v16, spec-aprovada)
 *
 * Expande a cobertura da alíquota zero do **Art. 197, I** (máquinas/implementos agrícolas →
 * produtor rural não contribuinte) de **1 família (8436, #1275)** para as **10 famílias** /
 * 50 NCMs da Tabela, em `normative_product_rules` → regime `aliquota_zero_bens_capital_agro`.
 *
 * Fonte determinística (pdftotext): Resolução CGIBS 6/2026, **Anexo IV, Tabela II** (lado IBS,
 * internamente consistente) = Decreto 12.955/2026 **Anexo V, Tabela I** (lado CBS). Base: Art. 110
 * LC 214/2025 c/c Art. 197 dos regulamentos. Destinatário: produtor rural não contribuinte (Art. 164).
 *
 * Granularidade = **EXACT por NCM** (decisão: lista TAXATIVA por subitem — Lição #66; o resolver
 * resolve exact como `specific`). NÃO usa prefixo de família (8432, 8433...) porque a Tabela lista
 * subitens específicos — prefixo over-concederia a subitens fora da lista.
 *
 * Gate 0 (REGRA-ORQ-database / Lição #83):
 *   - Categoria `aliquota_zero_bens_capital_agro` JÁ existe em risk_categories (#1275) → recognition OK.
 *   - #1275 já seedou 8436 PREFIX + 4 EXACT (8436.10/21/91/99.00) → dedup-guard pula os existentes.
 *   - Tabela sem coluna status (0076); getDb() pool (Lição #89).
 *
 * ⚠️ Tech-debt sinalizado (não corrigido aqui): o **8436 PREFIX** do #1275 over-concede a TODO 8436.*
 *   (a Tabela só lista 8436.10/21/91/99.00). Alinhar 8436 a exact é decisão separada do P.O.
 *
 * Idempotência: SELECT prévio por (ncm_code, match_mode); skip se já existe.
 * Reversível: DELETE FROM normative_product_rules WHERE source_version='AGRO_1452'.
 *
 * Uso: pnpm exec tsx scripts/seed-agro-coverage-art197i-1452.ts  (Manus, pós-merge).
 */
import { getDb } from "../server/db";

const REGIME = "aliquota_zero_bens_capital_agro";
const LEGAL_REF =
  "Art. 110 LC 214/2025 c/c Art. 197, I (Resolução CGIBS 6/2026 Anexo IV Tab II; Decreto 12.955/2026 Anexo V Tab I) — alíquota zero IBS+CBS; destinatário produtor rural não contribuinte (Art. 164)";

// Art. 197, I — Tabela completa (50 NCMs / 10 famílias). Fonte: Resolução CGIBS 6 Anexo IV Tab II.
const NCMS_ART197_I: string[] = [
  "8424.41.00", "8424.49.00",
  "8429.11.90", "8429.20.90", "8429.30.00", "8429.40.00", "8429.51.92", "8429.51.99", "8429.52.12", "8429.52.19", "8429.59.00",
  "8432.10.00", "8432.21.00", "8432.31.10", "8432.31.90", "8432.39.10", "8432.39.90", "8432.41.00", "8432.42.00", "8432.80.00",
  "8433.20.10", "8433.20.90", "8433.30.00", "8433.40.00", "8433.51.00", "8433.52.00", "8433.53.00", "8433.59.11", "8433.59.90", "8433.60.10", "8433.60.21", "8433.60.29", "8433.60.90",
  "8434.10.00",
  "8435.10.00",
  "8436.10.00", "8436.21.00", "8436.91.00", "8436.99.00", // já em #1275 (exact) → dedup-guard pula
  "8437.10.00", "8437.80.10", "8437.90.00",
  "8701.10.00", "8701.30.00", "8701.91.00", "8701.92.00", "8701.93.00", "8701.94.90", "8701.95.90", // tratores
  "8716.20.00",
];

async function execute(sql: string, params: unknown[] = []): Promise<unknown[]> {
  const db = await getDb();
  if (!db) throw new Error("[seed-1452] DATABASE_URL não configurado");
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as unknown[];
}

async function main(): Promise<void> {
  console.log(`[seed-1452] Art. 197, I — ${NCMS_ART197_I.length} NCMs (exact) → ${REGIME}`);
  let inserted = 0;
  let skipped = 0;

  for (const ncm of NCMS_ART197_I) {
    const rows = (await execute(
      "SELECT regime FROM normative_product_rules WHERE ncm_code = ? AND match_mode = 'exact'",
      [ncm],
    )) as Array<{ regime: string }>;

    if (rows.length > 0) {
      const cur = rows[0]!;
      if (cur.regime !== REGIME) {
        console.warn(`  ⚠️  ${ncm} (exact) JÁ EXISTE com regime='${cur.regime}' (≠ ${REGIME}). NÃO sobrescrito — revisar.`);
      } else {
        console.log(`  ⏭️  skip ${ncm} (exact) — já existe idêntico (#1275)`);
      }
      skipped++;
      continue;
    }

    await execute(
      "INSERT INTO normative_product_rules (ncm_code, regime, legal_reference, match_mode, active, source_version) VALUES (?, ?, ?, 'exact', 1, 'AGRO_1452')",
      [ncm, REGIME, LEGAL_REF],
    );
    inserted++;
  }

  console.log(`\n[seed-1452] concluído — ${inserted} inseridas · ${skipped} skipped`);
  const total = (await execute(
    "SELECT COUNT(*) AS total FROM normative_product_rules WHERE regime = ? AND match_mode = 'exact'",
    [REGIME],
  )) as Array<{ total: number | string }>;
  console.log(`[seed-1452] total exact em '${REGIME}': ${Number(total[0]?.total ?? 0)} (esperado ${NCMS_ART197_I.length})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed-1452] ERRO:", err);
    process.exit(1);
  });
