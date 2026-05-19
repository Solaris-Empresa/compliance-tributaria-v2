/**
 * scripts/build-corpus-moc-mdfe-v3.ts
 *
 * Chunker determinístico do MOC MDF-e v3.00a (Visão Geral).
 * Corpus Onda 2 — issue #1089 (section-chunker, NÃO chunker de artigo).
 *
 * Input:  scripts/corpus-source/moc_mdfe_v3.txt
 * Output: server/rag-corpus-moc-mdfe-v3.ts
 * Lei:    moc_mdfe_v3 (DB enum via migration 0095, #1087 mergeado)
 *
 * Estratégia: corpus-section-chunker (estrutura N/N.N/N.N.N; ToC filtrado
 * por dotted-leader). ARTIGO_START_RE NÃO tocado (REGRA-ORQ-20/34).
 * REGRA ANTI-ALUCINAÇÃO: conteúdo verbatim do .txt. Sem o .txt, ABORTA.
 *
 * Uso: pnpm exec tsx scripts/build-corpus-moc-mdfe-v3.ts
 */

import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSectionCorpus } from "./lib/corpus-section-chunker";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const LEI_SLUG = "moc_mdfe_v3";
const SOURCE_FILE = resolve(root, "scripts/corpus-source/moc_mdfe_v3.txt");
const OUTPUT_FILE = resolve(root, "server/rag-corpus-moc-mdfe-v3.ts");

function main(): void {
  if (!existsSync(SOURCE_FILE)) {
    throw new Error(
      `[${LEI_SLUG}] Arquivo .txt não encontrado: ${SOURCE_FILE}\n` +
        "Execute a extração de texto (Manus) antes de rodar este build script."
    );
  }

  const result = buildSectionCorpus({
    inputPath: SOURCE_FILE,
    outputPath: OUTPUT_FILE,
    lei: LEI_SLUG,
    exportName: "RAG_CORPUS_MOC_MDFE_V3",
    cnaeGroups: "49", // transporte rodoviário (config do documento, não conteúdo)
    headerComment:
      "Corpus RAG — MOC MDF-e v3.00a (Visão Geral)\n" +
      "Corpus Onda 2 / issue #1089 — section-chunker, verbatim do .txt.",
  });

  console.log(
    `[${LEI_SLUG}] ${result.totalSections} seções → ${result.totalChunks} chunks emitidos.`
  );
}

main();
