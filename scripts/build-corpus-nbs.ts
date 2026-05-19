/**
 * scripts/build-corpus-nbs.ts — Corpus Onda 3 #A2 (row-chunker).
 * Input:  scripts/corpus-source/nbs_completa.csv (Latin-1, `;`-delimitado)
 * Output: server/rag-corpus-nbs.ts
 * Lei:    nbs_completa (enum DB pendente migration — código-only)
 * Uso: pnpm exec tsx scripts/build-corpus-nbs.ts
 */
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildRowCorpus } from "./lib/corpus-row-chunker";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_FILE = resolve(root, "scripts/corpus-source/nbs_completa.csv");

if (!existsSync(SOURCE_FILE)) {
  throw new Error(`[nbs] Arquivo não encontrado: ${SOURCE_FILE}`);
}

const result = buildRowCorpus({
  inputPath: SOURCE_FILE,
  outputPath: resolve(root, "server/rag-corpus-nbs.ts"),
  lei: "nbs_completa",
  exportName: "RAG_CORPUS_NBS",
  mode: "nbs",
  encoding: "latin1", // verificado: nbs_completa.csv é ISO-8859-1 (ç=E7)
  topicos: "nbs,classificacao_fiscal,aliquota",
  headerComment:
    "Corpus RAG — Tabela NBS 2.0 completa — lookup de classificação de serviços\n" +
    "Corpus Onda 3 / #A2 — row-chunker, verbatim do .csv (Latin-1).",
});

console.log(`[nbs] ${result.totalRows} chunks emitidos.`);
