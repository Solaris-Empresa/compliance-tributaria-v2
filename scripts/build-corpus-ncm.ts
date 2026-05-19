/**
 * scripts/build-corpus-ncm.ts — Corpus Onda 3 #A2 (row-chunker).
 * Input:  scripts/corpus-source/tabela_ncm_completa.txt (Latin-1)
 * Output: server/rag-corpus-ncm.ts
 * Lei:    tabela_ncm_completa (enum DB pendente migration — código-only)
 * Uso: pnpm exec tsx scripts/build-corpus-ncm.ts
 */
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildRowCorpus } from "./lib/corpus-row-chunker";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_FILE = resolve(
  root,
  "scripts/corpus-source/tabela_ncm_completa.txt"
);

if (!existsSync(SOURCE_FILE)) {
  throw new Error(`[ncm] Arquivo não encontrado: ${SOURCE_FILE}`);
}

const result = buildRowCorpus({
  inputPath: SOURCE_FILE,
  outputPath: resolve(root, "server/rag-corpus-ncm.ts"),
  lei: "tabela_ncm_completa",
  exportName: "RAG_CORPUS_NCM",
  mode: "ncm",
  encoding: "utf-8", // verificado: tabela_ncm_completa.txt é UTF-8 (ç=C3A7)
  topicos: "ncm,classificacao_fiscal,aliquota",
  headerComment:
    "Corpus RAG — Tabela NCM completa (TEC) — lookup de classificação fiscal\n" +
    "Corpus Onda 3 / #A2 — row-chunker, verbatim do .txt (Latin-1).",
});

console.log(`[ncm] ${result.totalRows} chunks emitidos.`);
