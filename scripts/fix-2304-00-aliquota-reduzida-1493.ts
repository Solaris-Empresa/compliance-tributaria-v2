/**
 * scripts/fix-2304-00-aliquota-reduzida-1493.ts
 *
 * ACHADO-001 (#1493) — corrige o mapeamento da subposição NCM 2304.00.
 *
 * Diagnóstico (Manus + Consultor, 18/06/2026):
 *   id    | ncm_code   | regime                                       | match_mode
 *   60003 | 2304       | tratamento_agropecuario_especifico_pendente  | prefix
 *   30001 | 2304.00.10 | aliquota_reduzida_60                         | exact
 *   —     | 2304.00    | NÃO EXISTE                                   | —
 *
 *   → Um projeto com NCM exatamente "2304.00" casa apenas o grupo `2304` (prefix)
 *     → regime errado (`tratamento_..._pendente`). A LC 214/2025 (Art. 138 + Anexo IX)
 *     beneficia a SUBPOSIÇÃO "2304.00", nunca a posição "2304" isolada (Consultor,
 *     literal PDF). Logo a ação correta é INSERT de regra exact 2304.00 — não UPDATE
 *     do grupo (errata da spec anterior: UPDATE WHERE ncm_code='2304.00' = 0 linhas).
 *
 * Ações (idempotentes):
 *   1. INSERT regra exact 2304.00 → aliquota_reduzida_60 (não toca o grupo 2304 prefix,
 *      que permanece fallback para outras subposições 2304.xx).
 *   2. UPDATE legal_reference de 2304.00.10 — errata Q1: item 6 (defensivos) →
 *      itens 7 e 20 (Anexo IX). Não altera o regime (já aliquota_reduzida_60 via
 *      scripts/update-cap23-regimes-definitivos.ts).
 *
 * Base legal: Art. 138 c/c Anexo IX, itens 7 e 20, LC 214/2025 (Consultor 18/06/2026).
 * Condicionantes de fruição (destinação fertilizante/ração, registro MAPA) ficam FORA
 * do resolver (REGRA-ORQ-21 — são atributos de elegibilidade, não de classificação).
 *
 * PADRÃO: raw-SQL via getDb() + $client.promise().execute() (espelha
 *         scripts/update-cap23-regimes-definitivos.ts / seed-*-cap23.ts).
 * COLUNAS reais (mig 0076): id, regime, legal_reference, ncm_code, match_mode,
 *         active, source_version, created_at.
 * NOTA: o predicado de UPDATE usa (ncm_code, match_mode) — não `id=30001` (frágil:
 *       o id varia por ambiente) — alinhado ao padrão dos demais scripts.
 *
 * Uso: pnpm exec tsx scripts/fix-2304-00-aliquota-reduzida-1493.ts
 *      (requer DATABASE_URL; Manus executa em prod pós-merge + review P.O.).
 */

import { getDb } from "../server/db";

const LEGAL_REF_2304 =
  "Art. 138 c/c Anexo IX, itens 7 e 20, LC 214/2025";

async function execute(
  sql: string,
  params: unknown[] = []
): Promise<unknown[]> {
  const db = await getDb();
  if (!db) throw new Error("[fix-2304-00] DATABASE_URL não configurado");
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as unknown[];
}

async function main(): Promise<void> {
  console.log("[fix-2304-00] ACHADO-001 #1493 — subposição 2304.00 (aliquota_reduzida_60)");

  // ─── Ação 1: INSERT regra exact 2304.00 (idempotente) ───────────────────────
  const existing = (await execute(
    "SELECT id, regime FROM normative_product_rules WHERE ncm_code = ? AND match_mode = ?",
    ["2304.00", "exact"]
  )) as Array<{ id: number; regime: string }>;

  if (existing.length > 0) {
    console.log(
      `  ⏭️  INSERT skip — 2304.00 (exact) já existe (id=${existing[0]!.id}, regime=${existing[0]!.regime})`
    );
  } else {
    await execute(
      "INSERT INTO normative_product_rules (ncm_code, regime, legal_reference, match_mode, active, source_version) VALUES (?, ?, ?, ?, 1, 'LC214_2025')",
      ["2304.00", "aliquota_reduzida_60", LEGAL_REF_2304, "exact"]
    );
    console.log("  ✅ INSERT 2304.00 (exact) → aliquota_reduzida_60");
  }

  // ─── Ação 2: UPDATE legal_reference de 2304.00.10 (errata item 6 → 7 e 20) ───
  const cur = (await execute(
    "SELECT id, regime, legal_reference FROM normative_product_rules WHERE ncm_code = ? AND match_mode = ?",
    ["2304.00.10", "exact"]
  )) as Array<{ id: number; regime: string; legal_reference: string }>;

  if (cur.length === 0) {
    console.log("  ⚠️  2304.00.10 (exact) NÃO ENCONTRADO — update-cap23 não aplicado?");
  } else if (cur[0]!.legal_reference === LEGAL_REF_2304) {
    console.log("  ⏭️  UPDATE skip — legal_reference de 2304.00.10 já corrigida (idempotente)");
  } else {
    await execute(
      "UPDATE normative_product_rules SET legal_reference = ? WHERE ncm_code = ? AND match_mode = ?",
      [LEGAL_REF_2304, "2304.00.10", "exact"]
    );
    console.log(
      `  ✅ UPDATE 2304.00.10 legal_reference — errata item 6 → itens 7 e 20 (regime ${cur[0]!.regime} inalterado)`
    );
  }

  // ─── Diagnóstico pós (DoD SQL) ──────────────────────────────────────────────
  const finalState = (await execute(
    "SELECT ncm_code, regime, match_mode, legal_reference FROM normative_product_rules WHERE ncm_code LIKE '2304%' ORDER BY ncm_code"
  )) as Array<{
    ncm_code: string;
    regime: string;
    match_mode: string;
    legal_reference: string;
  }>;
  console.log("\n[fix-2304-00] === Estado final WHERE ncm_code LIKE '2304%' ===");
  for (const r of finalState) {
    console.log(`  ${r.ncm_code} (${r.match_mode}) | ${r.regime} | ${r.legal_reference}`);
  }
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
