/**
 * scripts/ingest-cgibs6-completo.ts — CORPUS-RFC-010 / BUG-IBS-00 (Etapa B — ingestão DB)
 *
 * Re-ingere a Resolução CGIBS 6/2026 COMPLETA (Arts 1-617) em `ragDocuments`,
 * substituindo a ingestão parcial anterior (só Livro II / Arts 467-615).
 *
 * Pré-requisito: `server/rag-corpus-resolucao-cgibs6.ts` JÁ regenerado pela Etapa A
 *   (scripts/build-corpus-resolucao-cgibs6.ts, sem filtro). Auditoria 24/05/2026.
 *
 * Contrato (REGRA-INGEST-01): cada chunk DELETE+INSERT com anchor_id + autor +
 *   validateChunkBeforeInsert (conteudo 10-5000 — REGRA-ORQ-40; chunker já limita a 2000).
 * Driver único: Drizzle ORM (getDb) — sem mistura com raw SQL.
 *
 * RACI: EXECUÇÃO em produção é do Manus (tem DATABASE_URL). REGRA-ORQ-37: anexar o
 *   resultado LITERAL das queries de evidência (abaixo) no PR body.
 *
 * Uso: DATABASE_URL=... pnpm exec tsx scripts/ingest-cgibs6-completo.ts
 *
 * Evidência pós-ingestão (REGRA-ORQ-37):
 *   SELECT COUNT(*) AS chunks,
 *          MIN(CAST(REGEXP_SUBSTR(artigo,'[0-9]+') AS UNSIGNED)) AS min_art,
 *          MAX(CAST(REGEXP_SUBSTR(artigo,'[0-9]+') AS UNSIGNED)) AS max_art,
 *          SUM(anchor_id IS NOT NULL) AS com_anchor,
 *          SUM(autor    IS NOT NULL) AS com_autor
 *   FROM ragDocuments WHERE lei='resolucao_cgibs_6';
 *   -- Esperado: chunks≈828 · min_art=1 · max_art=617 · com_anchor=com_autor=chunks
 */
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { ragDocuments } from "../drizzle/schema";
import { validateChunkBeforeInsert } from "../server/lib/ingest-validator";
import { RAG_CORPUS_RESOLUCAO_CGIBS_6 } from "../server/rag-corpus-resolucao-cgibs6";

const LEI = "resolucao_cgibs_6" as const;
const AUTOR = "ingestao-cgibs6-completa-sprint-ibs-24mai2026";
const BATCH = 100;

/** anchor_id determinístico, lei-prefixado (evita colisão com LC/Decreto de mesmo nº). */
function anchorFor(artigo: string, chunkIndex: number): string {
  const slug = artigo
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
  return `${LEI}-${slug}-${chunkIndex}`;
}

async function main(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL ausente — definir antes de rodar (RACI: Manus).");

  const entries = RAG_CORPUS_RESOLUCAO_CGIBS_6;
  console.log(`[ingest-cgibs6] corpus regenerado: ${entries.length} chunks (Arts 1-617).`);

  // 1. Validação prévia (falha cedo se algum chunk violar o contrato).
  const rows = entries.map((e) => {
    const anchor_id = anchorFor(e.artigo, e.chunkIndex);
    validateChunkBeforeInsert({ lei: LEI, artigo: e.artigo, conteudo: e.conteudo, anchor_id, autor: AUTOR });
    return {
      anchor_id,
      lei: LEI,
      artigo: e.artigo.slice(0, 300),
      titulo: e.titulo.slice(0, 500),
      conteudo: e.conteudo,
      topicos: e.topicos,
      cnaeGroups: (e.cnaeGroups ?? "").slice(0, 500),
      chunkIndex: e.chunkIndex,
      autor: AUTOR,
    };
  });
  console.log(`[ingest-cgibs6] ${rows.length} chunks validados (REGRA-INGEST-01).`);

  // 2. DELETE da ingestão anterior (anchor_id é UNIQUE — limpar antes do re-INSERT).
  await db.delete(ragDocuments).where(eq(ragDocuments.lei, LEI));
  console.log(`[ingest-cgibs6] DELETE lei='${LEI}' concluído (remove Livro II parcial).`);

  // 3. INSERT em lotes.
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await db.insert(ragDocuments).values(batch);
    inserted += batch.length;
  }
  console.log(`[ingest-cgibs6] INSERT concluído: ${inserted} chunks (autor='${AUTOR}').`);
  console.log("[ingest-cgibs6] Rode a query de EVIDÊNCIA (REGRA-ORQ-37) e anexe ao PR.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[ingest-cgibs6] FALHA:", err);
    process.exit(1);
  });
