/**
 * scripts/build-corpus-portaria7.ts
 *
 * Chunker determinístico da Portaria Conjunta MF/CGIBS 7/2026 (2 artigos).
 *
 * Input:  scripts/corpus-source/portaria_conjunta_7.txt
 * Output: server/rag-corpus-portaria7.ts
 * Lei:    portaria_mf_cgibs_7 (enum em drizzle/schema.ts)
 *
 * Conteúdo: formaliza o reconhecimento das disposições comuns CBS+IBS nos
 * regulamentos respectivos (Decreto 12.955 Livro I ≡ Resolução CGIBS 6 Livro I).
 * Não há diferenciação setorial — cnaeGroups="" para os 2 artigos.
 *
 * Uso: pnpm exec tsx scripts/build-corpus-portaria7.ts
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCorpus } from "./lib/corpus-chunker";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const result = buildCorpus({
  inputPath: resolve(root, "scripts/corpus-source/portaria_conjunta_7.txt"),
  outputPath: resolve(root, "server/rag-corpus-portaria7.ts"),
  lei: "portaria_mf_cgibs_7",
  exportName: "RAG_CORPUS_PORTARIA_7",
  universalOverride: true,
  headerComment:
    "Corpus RAG — Portaria Conjunta MF/CGIBS 7/2026\n" +
    "Fonte: https://www.cgibs.gov.br (Diário Oficial 30/04/2026, SEI 60959979)\n" +
    "Conteúdo: 2 artigos formalizando equivalência Decreto 12.955 Livro I ≡\n" +
    "Resolução CGIBS 6 Livro I (disposições comuns CBS+IBS).\n" +
    "CORPUS-RFC-008 — Issue #1074 (P0 fast-track ORQ-11).",
});

console.log(
  `[portaria_mf_cgibs_7] ${result.totalArtigos} artigos → ${result.totalChunks} chunks emitidos.`,
);
