/**
 * scripts/emit-corpus-sql.ts
 *
 * MISSÃO M4-REVISED (2026-05-19) — TAREFA C (geração de SQL).
 *
 * Emite INSERT bulk para `ragDocuments` a partir dos módulos de corpus já
 * gerados deterministicamente pelo chunker (server/rag-corpus-*.ts).
 *
 * FONTE ÚNICA DE VERDADE = o módulo .ts gerado (que veio verbatim do
 * .txt normalizado). Nenhuma re-leitura/re-parse → zero divergência.
 * Nenhum conteúdo autorado (REGRA ANTI-ALUCINAÇÃO).
 *
 * Colunas reais de ragDocuments (drizzle/schema.ts): lei, artigo, titulo,
 * conteudo, topicos, cnaeGroups, chunkIndex. (`anchor_id` é nullable e não é
 * produzido pelo chunker — mesmo padrão do precedente #1082 decreto12955;
 * NÃO há coluna `isUniversal` — universalidade é codificada por cnaeGroups="".)
 *
 * Escape MySQL (modo padrão, backslash = escape): `\` → `\\`, `'` → `''`.
 * Newlines preservados literais dentro do string literal (MySQL aceita).
 *
 * Uso: pnpm exec tsx scripts/emit-corpus-sql.ts
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { CorpusEntry } from "../server/rag-corpus";
import { RAG_CORPUS_LC123 } from "../server/rag-corpus-lc123";
import { RAG_CORPUS_RESOLUCAO_CGSN_140 } from "../server/rag-corpus-resolucao-cgsn-140";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATE = "20260519";

function sqlStr(v: string): string {
  return "'" + v.replace(/\\/g, "\\\\").replace(/'/g, "''") + "'";
}

function emit(slug: string, entries: CorpusEntry[], outFile: string): void {
  const rows = entries
    .map(
      e =>
        `  (${sqlStr(e.lei)}, ${sqlStr(e.artigo)}, ${sqlStr(e.titulo)}, ` +
        `${sqlStr(e.conteudo)}, ${sqlStr(e.topicos)}, ${sqlStr(e.cnaeGroups)}, ${e.chunkIndex})`
    )
    .join(",\n");

  const sql = [
    "-- ============================================================",
    `-- Corpus SOLARIS — INSERT bulk | Lei: ${slug} | Gerado: ${DATE}`,
    `-- Chunks: ${entries.length}`,
    "-- Executor: Claude Code (gerou) | Ingestão em produção: Manus",
    "-- Conteúdo verbatim do .txt normalizado (de-indent + ordinal). Sem autoria.",
    "-- REGRA-ORQ-37: Manus deve confirmar COUNT(*) em produção após INSERT.",
    "-- ============================================================",
    "",
    "INSERT INTO ragDocuments (lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex)",
    "VALUES",
    rows + ";",
    "",
    "-- ============================================================",
    "-- VERIFICAÇÃO PÓS-INGESTÃO (Manus executa após INSERT):",
    `-- SELECT lei, COUNT(*) AS chunks FROM ragDocuments WHERE lei = '${slug}' GROUP BY lei;`,
    `-- Resultado esperado: ${entries.length} chunks`,
    "-- ============================================================",
    "",
  ].join("\n");

  writeFileSync(outFile, sql, "utf-8");
  console.log(`[emit-sql] ${slug} → ${outFile} | ${entries.length} chunks`);
}

emit(
  "lc123",
  RAG_CORPUS_LC123,
  resolve(root, `scripts/corpus-source/ingest_lc123_${DATE}.sql`)
);
emit(
  "resolucao_cgsn_140",
  RAG_CORPUS_RESOLUCAO_CGSN_140,
  resolve(root, `scripts/corpus-source/ingest_resolucao_cgsn_140_${DATE}.sql`)
);
