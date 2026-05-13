/**
 * scripts/build-corpus-decreto12955.ts
 *
 * Chunker determinístico do Decreto 12.955/2026 (regulamento CBS).
 *
 * Input:  scripts/corpus-source/decreto12955.txt
 * Output: server/rag-corpus-decreto12955.ts
 * Lei:    decreto12955 (enum em drizzle/schema.ts)
 *
 * Regra cnaeGroups:
 *   - Art. 1-465 (Livro I = normas comuns CBS+IBS) → cnaeGroups=""
 *   - Art. 466-620 (Livro II/III = específicos CBS) → heurística setorial
 *
 * Uso: pnpm exec tsx scripts/build-corpus-decreto12955.ts
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCorpus } from "./lib/corpus-chunker";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const result = buildCorpus({
  inputPath: resolve(root, "scripts/corpus-source/decreto12955.txt"),
  outputPath: resolve(root, "server/rag-corpus-decreto12955.ts"),
  lei: "decreto12955",
  exportName: "RAG_CORPUS_DECRETO_12955",
  // Livro I do Decreto = Art. 1-465 (verificado em scan estrutural: linha 7664 inicia LIVRO II).
  universalUpTo: 465,
  headerComment:
    "Corpus RAG — Decreto 12.955/2026 (regulamento CBS)\n" +
    "Fonte: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12955.htm\n" +
    "CORPUS-RFC-008 — Issue #1074 (P0 fast-track ORQ-11).",
});

console.log(
  `[decreto12955] ${result.totalArtigos} artigos → ${result.totalChunks} chunks emitidos.`,
);
