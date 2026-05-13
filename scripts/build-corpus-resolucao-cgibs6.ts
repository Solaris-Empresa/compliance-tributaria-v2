/**
 * scripts/build-corpus-resolucao-cgibs6.ts
 *
 * Chunker determinístico da Resolução CGIBS 6/2026 — APENAS LIVRO II (Art. 467-615).
 *
 * Input:  scripts/corpus-source/resolucao_cgibs6_completo.txt
 * Output: server/rag-corpus-resolucao-cgibs6.ts
 * Lei:    resolucao_cgibs_6 (enum em drizzle/schema.ts)
 *
 * Decisão crítica: Livro I da Resolução CGIBS 6 é IDÊNTICO ao Livro I do Decreto
 * 12.955 (disposições comuns CBS+IBS — confirmado pela Portaria Conjunta 7). Para
 * evitar ~465 chunks duplicados no corpus, ingere apenas o Livro II (IBS-específico,
 * Art. 467-615 = ~149 artigos canônicos → ~170 chunks com partições).
 *
 * cnaeGroups: heurística setorial (todos os artigos são IBS-específicos do Livro II
 * — não são "universais" como o Livro I do Decreto).
 *
 * Uso: pnpm exec tsx scripts/build-corpus-resolucao-cgibs6.ts
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCorpus } from "./lib/corpus-chunker";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const result = buildCorpus({
  inputPath: resolve(root, "scripts/corpus-source/resolucao_cgibs6_completo.txt"),
  outputPath: resolve(root, "server/rag-corpus-resolucao-cgibs6.ts"),
  lei: "resolucao_cgibs_6",
  exportName: "RAG_CORPUS_RESOLUCAO_CGIBS_6",
  // Livro II = Art. 467-615 (verificado em scan estrutural — linhas 204+).
  filter: (numero) => numero >= 467 && numero <= 615,
  headerComment:
    "Corpus RAG — Resolução CGIBS 6/2026 (apenas Livro II — normas específicas IBS)\n" +
    "Fonte: https://www.cgibs.gov.br (Diário Oficial 30/04/2026)\n" +
    "Escopo: Art. 467-615 (Livro I omitido — idêntico ao Livro I do Decreto 12.955\n" +
    "conforme Portaria Conjunta MF/CGIBS 7/2026).\n" +
    "CORPUS-RFC-008 — Issue #1074 (P0 fast-track ORQ-11).",
});

console.log(
  `[resolucao_cgibs_6 — Livro II] ${result.totalArtigos} artigos → ${result.totalChunks} chunks emitidos.`,
);
