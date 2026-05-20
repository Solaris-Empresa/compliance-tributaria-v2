/**
 * scripts/fix-lc214-art544-chunks.ts
 *
 * Corpus surgery — Art. 544 LC 214 (PR #1104 §4 audit follow-up).
 *
 * PROBLEMA (audit empírico):
 *   Art. 544 está dividido em 37 partes; algumas são gigantes e poluem o
 *   re-ranker (embedding dilution). Em particular:
 *     • parte 15: ~22.904 chars — embute o ANEXO XI (tabela NCMs de
 *       Soberania/Segurança Nacional). Os NCMs individuais já existem
 *       distribuídos em `tabela_ncm_completa` (10.030 chunks); o ganho
 *       semântico do agrupamento Anexo XI é o único que se perde — P.O.
 *       autorizou o DELETE (19/05/2026).
 *     • partes 4/7/13/17: 5.376–10.774 chars — embedding dilution.
 *
 * AÇÃO:
 *   1. DELETE Art. 544 (parte 15)  — chunk gigante, ANEXO XI.
 *   2. SPLIT  Art. 544 (parte N) WHERE LENGTH(conteudo) > 5000 em sub-chunks
 *      de até 1800 chars, em fronteiras de whitespace/parágrafo. Cada
 *      sub-chunk preserva lei/titulo/topicos/cnaeGroups da original e ganha
 *      artigo "Art. 544 (parte N.M)". A original é deletada após split.
 *
 * NÃO TOCAR:
 *   • Anexo IX item 6 (mantido per spec)
 *   • Demais chunks lc214 (fora de Art. 544)
 *
 * NÃO ABRANGE (deferido per anti-alucinação + RACI):
 *   • Inspeção do PDF da LC 214
 *   • Expansão do Anexo IX além de item 6
 *   → caminho correto: Manus extrai .txt → chunker determinístico → ingest
 *     (padrão Onda 1/2). Fora do escopo desta surgery.
 *
 * DRIFT código vs DB (declarado, fora de escopo):
 *   `server/rag-corpus-lcs-novas.ts` (auto-gerado, 2026-03-18) ainda contém
 *   os chunks pré-fix. Re-ingest desse módulo restauraria o bug. Fix da
 *   raiz exige re-execução do build-script de lcs-novas com o conteúdo
 *   normalizado — separado deste PR. Esta surgery atua somente em prod DB.
 *
 * PADRÃO: raw-SQL via `getDb()` + `db.$client.promise().execute(sql, params)`
 *         (espelha `server/lib/normative-inference.ts` e os seed scripts).
 * IDEMPOTÊNCIA: SELECT-prévio em cada etapa; re-execução pós-fix é no-op.
 * COLUNA: `conteudo` (NÃO `content` — DATA_DICTIONARY:271).
 *
 * Uso: pnpm exec tsx scripts/fix-lc214-art544-chunks.ts
 *      (requer DATABASE_URL; Manus executa em prod pós-merge + review P.O.).
 */

import { getDb } from "../server/db";

const ART544_FILTER = "lei = 'lc214' AND artigo LIKE 'Art. 544%'";
const PARTE_15_ARTIGO = "Art. 544 (parte 15)";
const SPLIT_THRESHOLD = 5000;
const MAX_CHUNK_CHARS = 1800;

interface ChunkRow {
  id: number;
  artigo: string;
  titulo: string;
  conteudo: string;
  topicos: string;
  cnaeGroups: string;
  len: number;
}

async function execute(
  sql: string,
  params: unknown[] = []
): Promise<unknown[]> {
  const db = await getDb();
  if (!db) throw new Error("[fix-art544] DATABASE_URL não configurado");
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as unknown[];
}

/** Divide texto em pedaços <= max em fronteiras de whitespace. Determinístico. */
function splitDeterministic(text: string, max = MAX_CHUNK_CHARS): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n", max);
    if (cut < max * 0.5) cut = rest.lastIndexOf(" ", max);
    if (cut < max * 0.5) cut = max; // fallback duro (determinístico)
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest.length > 0) out.push(rest);
  return out;
}

async function diagnose(): Promise<void> {
  console.log("\n[fix-art544] === DIAGNÓSTICO ATUAL (Gate 0) ===");
  const rows = (await execute(
    `SELECT id, artigo, LENGTH(conteudo) AS len FROM ragDocuments
       WHERE ${ART544_FILTER}
       ORDER BY len DESC
       LIMIT 50`
  )) as Array<{ id: number; artigo: string; len: number }>;
  console.log(`  total Art. 544: ${rows.length} chunks`);
  for (const r of rows.slice(0, 10)) {
    console.log(`    id=${r.id} | ${r.artigo} | ${r.len} chars`);
  }
}

async function deleteParte15(): Promise<number> {
  console.log("\n[fix-art544] === STEP 1 — DELETE parte 15 (ANEXO XI) ===");
  const rows = (await execute(
    `SELECT id, LENGTH(conteudo) AS len FROM ragDocuments
       WHERE lei = 'lc214' AND artigo = ?`,
    [PARTE_15_ARTIGO]
  )) as Array<{ id: number; len: number }>;
  if (rows.length === 0) {
    console.log("  ⏭️  parte 15 já removida — no-op");
    return 0;
  }
  console.log(`  identificada: id=${rows[0]!.id} | ${rows[0]!.len} chars`);
  await execute(`DELETE FROM ragDocuments WHERE lei = 'lc214' AND artigo = ?`, [
    PARTE_15_ARTIGO,
  ]);
  console.log(`  ✅ ${rows.length} chunk(s) removido(s)`);
  return rows.length;
}

async function splitOversize(): Promise<{ deleted: number; inserted: number }> {
  console.log(
    `\n[fix-art544] === STEP 2 — SPLIT chunks > ${SPLIT_THRESHOLD} chars ===`
  );
  const rows = (await execute(
    `SELECT id, artigo, titulo, conteudo, topicos, cnaeGroups,
            LENGTH(conteudo) AS len
       FROM ragDocuments
       WHERE ${ART544_FILTER} AND LENGTH(conteudo) > ?
       ORDER BY len DESC`,
    [SPLIT_THRESHOLD]
  )) as ChunkRow[];

  if (rows.length === 0) {
    console.log("  ⏭️  nenhum chunk oversize — no-op (já dividido)");
    return { deleted: 0, inserted: 0 };
  }
  console.log(`  ${rows.length} chunk(s) oversize encontrados`);

  let inserted = 0;
  let deleted = 0;
  for (const row of rows) {
    const parts = splitDeterministic(row.conteudo, MAX_CHUNK_CHARS);
    console.log(
      `  ${row.artigo} (${row.len} chars) → ${parts.length} sub-chunks`
    );
    // Insere sub-chunks com artigo "Art. 544 (parte N.M)"
    const baseNumMatch = row.artigo.match(/parte (\d+)/);
    const baseNum = baseNumMatch ? baseNumMatch[1] : "?";
    for (let i = 0; i < parts.length; i++) {
      const subArtigo = `Art. 544 (parte ${baseNum}.${i + 1})`;
      await execute(
        `INSERT INTO ragDocuments (lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex)
         VALUES ('lc214', ?, ?, ?, ?, ?, 0)`,
        [subArtigo, row.titulo, parts[i], row.topicos, row.cnaeGroups]
      );
      inserted++;
    }
    // Remove a chunk original (após inserir os filhos para evitar perda em falha intermediária)
    await execute(`DELETE FROM ragDocuments WHERE id = ?`, [row.id]);
    deleted++;
  }
  console.log(
    `  ✅ ${deleted} chunks divididos · ${inserted} sub-chunks criados`
  );
  return { deleted, inserted };
}

async function main(): Promise<void> {
  console.log("[fix-art544] Corpus surgery — Art. 544 LC 214 (PR #1104 §4)");
  await diagnose();

  const deletedParte15 = await deleteParte15();
  const { deleted: deletedSplit, inserted } = await splitOversize();

  console.log("\n[fix-art544] === RESULTADO ===");
  console.log(`  parte 15 removida: ${deletedParte15}`);
  console.log(
    `  chunks oversize divididos: ${deletedSplit} → ${inserted} sub-chunks`
  );
  console.log("\n[fix-art544] === DIAGNÓSTICO PÓS-FIX ===");
  await diagnose();
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
