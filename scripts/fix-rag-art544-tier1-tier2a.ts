/**
 * fix-rag-art544-tier1-tier2a.ts — RAG-ART544 (#1551), despacho v125
 *
 * DELETE cirúrgico por IDs dos chunks Art.544 RUÍDO (Tier 1 + Tier 2A).
 * Classificação chunk-a-chunk prévia (Gate 0, Manus) — Lições #143/#144.
 *
 * NÃO usa `conteudo LIKE` (Gate 0 provou impreciso — Lição #144).
 * NÃO toca o Tier 3 substantivo (23 chunks: cesta básica/saúde/agro/cultura/
 * veículos id=766) — esses vão para re-tag (issue RAG-ART544-RETAG, NÃO DELETE).
 *
 * Tier 1 (6 · ruído puro):  751 (caput vigência), 752 (signatários),
 *                           1222/1223/1225/1226 (duplicatas Simples 5ª faixa)
 * Tier 2A (17 · Simples):   768, 769, 770-779, 390007-390011
 *                           (alíquotas/repartição Simples — leiFilter já cobre via lc123)
 *
 * Esperado: 46 → 23 chunks Art.544 (Tier 3 intacto).
 *
 * PADRÃO: raw-SQL via getDb() + db.$client.promise().execute (espelha
 *         scripts/fix-lc214-art544-chunks.ts / PR #1109).
 * IDEMPOTÊNCIA: DELETE por IDs; re-execução pós-fix é no-op (0 linhas).
 * COLUNA: `artigo` (DATA_DICTIONARY). autor: fix-rag-art544-tier1-tier2a-23jun2026.
 *
 * Uso: pnpm exec tsx scripts/fix-rag-art544-tier1-tier2a.ts
 *      (requer DATABASE_URL; Manus executa em prod pós-merge + review P.O.).
 */

import { getDb } from "../server/db";

// IDs confirmados por Gate 0 chunk-a-chunk (despacho v125).
const DELETE_IDS: readonly number[] = [
  // Tier 1 — ruído puro
  751, 752, 1222, 1223, 1225, 1226,
  // Tier 2A — Simples Nacional (alíquotas/repartição)
  768, 769, 770, 771, 772, 773, 774, 775, 776, 777, 778, 779,
  390007, 390008, 390009, 390010, 390011,
] as const;

async function execute(sql: string, params: unknown[] = []): Promise<unknown[]> {
  const db = await getDb();
  if (!db) throw new Error("[fix-art544-t1-t2a] DATABASE_URL não configurado");
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as unknown[];
}

async function countArt544(): Promise<number> {
  const rows = (await execute(
    "SELECT COUNT(*) AS n FROM ragDocuments WHERE lei = 'lc214' AND artigo LIKE '%544%'",
  )) as Array<{ n: number }>;
  return Number(rows[0]?.n ?? 0);
}

async function main(): Promise<void> {
  console.log("\n[fix-art544-t1-t2a] === Gate 0 (antes) ===");
  const before = await countArt544();
  console.log(`  Art.544 chunks: ${before}`);

  // Quais dos IDs-alvo ainda existem (idempotência observável)
  const placeholders = DELETE_IDS.map(() => "?").join(",");
  const existing = (await execute(
    `SELECT id, artigo FROM ragDocuments WHERE id IN (${placeholders}) ORDER BY id`,
    [...DELETE_IDS],
  )) as Array<{ id: number; artigo: string }>;
  console.log(`  IDs-alvo presentes: ${existing.length}/${DELETE_IDS.length}`);
  for (const r of existing) console.log(`    - ${r.id} | ${r.artigo}`);

  if (existing.length === 0) {
    console.log("[fix-art544-t1-t2a] Nada a deletar (idempotente). FIM.");
    process.exit(0);
  }

  console.log("\n[fix-art544-t1-t2a] === DELETE ===");
  const res = (await execute(
    `DELETE FROM ragDocuments WHERE id IN (${placeholders})`,
    [...DELETE_IDS],
  )) as unknown as { affectedRows?: number };
  const affected = (res as any)?.affectedRows ?? "?";
  console.log(`  affectedRows: ${affected}`);

  const after = await countArt544();
  console.log("\n[fix-art544-t1-t2a] === Gate 0 (depois) ===");
  console.log(`  Art.544 chunks: ${before} → ${after} (esperado: 23)`);
  console.log(`  Tier 3 substantivo intacto: ${after === 23 ? "✅" : "⚠️ revisar"}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[fix-art544-t1-t2a] ERRO:", err);
  process.exit(1);
});
