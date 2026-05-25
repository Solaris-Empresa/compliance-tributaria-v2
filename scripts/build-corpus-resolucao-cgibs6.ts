/**
 * scripts/build-corpus-resolucao-cgibs6.ts
 *
 * Chunker determinístico da Resolução CGIBS 6/2026 — DOCUMENTO COMPLETO (Art. 1-617).
 *
 * Input:  scripts/corpus-source/resolucao_cgibs6_completo.txt
 * Output: server/rag-corpus-resolucao-cgibs6.ts
 * Lei:    resolucao_cgibs_6 (enum em drizzle/schema.ts)
 *
 * CORPUS-RFC-010 / BUG-IBS-00 (24/05/2026): correção da ingestão parcial.
 * A versão anterior (CORPUS-RFC-008 / #1074, P0 fast-track) filtrava `numero >= 467`
 * (apenas Livro II) sob a premissa NÃO-VERIFICADA de que o Livro I seria "idêntico ao
 * Decreto 12.955". A auditoria (24/05) REFUTOU a premissa: o Livro I (Arts 1-466) é a
 * operacionalização IBS-específica (cadastro, fato gerador, split payment, DTE,
 * fiscalização, transição), com numeração própria — NÃO substituível pelo Decreto (CBS,
 * numeração diferente). Resultado: ~76% do regulamento ficou fora do corpus → briefing
 * "IBS-light". Fix: ingerir o documento completo (sem filtro).
 *
 * Estrutura: LIVRO I (1-466 normas comuns/IBS) · LIVRO II (467-615 específicas IBS) ·
 * LIVRO III (616-617 disposições finais).
 *
 * Uso: pnpm exec tsx scripts/build-corpus-resolucao-cgibs6.ts
 * Pós-build: ingestão em ragDocuments via scripts/ingest-cgibs6-completo.ts (Etapa B — Manus).
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
  // Documento completo — Art. 1-617 (sem filtro). CORPUS-RFC-010 / BUG-IBS-00.
  // (filtro `numero >= 467` removido — ver auditoria 24/05/2026.)
  headerComment:
    "Corpus RAG — Resolução CGIBS 6/2026 (documento COMPLETO — Arts 1-617)\n" +
    "Fonte: https://www.cgibs.gov.br (Diário Oficial 30/04/2026)\n" +
    "Escopo: LIVRO I (1-466 normas comuns/IBS — cadastro, fato gerador, split payment,\n" +
    "DTE, fiscalização, transição IBS) + LIVRO II (467-615 específicas IBS) + LIVRO III.\n" +
    "CORPUS-RFC-010 / BUG-IBS-00 — correção da ingestão parcial CORPUS-RFC-008 (#1074).",
});

console.log(
  `[resolucao_cgibs_6 — completo Arts 1-617] ${result.totalArtigos} artigos → ${result.totalChunks} chunks emitidos.`,
);
