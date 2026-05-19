/**
 * scripts/build-corpus-moc-mdfe-v3.ts
 *
 * Chunker determinístico do MOC MDF-e v3.00a (Visão Geral).
 * Corpus Onda 2 — SCAFFOLD (infraestrutura, sem conteúdo).
 *
 * Input:  scripts/corpus-source/moc_mdfe_v3.txt  (aguarda extração pelo Manus)
 * Output: server/rag-corpus-moc-mdfe-v3.ts
 * Lei:    moc_mdfe_v3 (enum em drizzle/schema.ts — migration 0095)
 *
 * REGRA ANTI-ALUCINAÇÃO: Claude Code NÃO autora conteúdo legal. O .txt
 * canônico é extraído da fonte pelo Manus. Sem o .txt, este script ABORTA.
 *
 * Uso: pnpm exec tsx scripts/build-corpus-moc-mdfe-v3.ts
 */

import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCorpus } from "./lib/corpus-chunker";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const LEI_SLUG = "moc_mdfe_v3";
const SOURCE_FILE = resolve(root, "scripts/corpus-source/moc_mdfe_v3.txt");
const OUTPUT_FILE = resolve(root, "server/rag-corpus-moc-mdfe-v3.ts");

// TODO(Corpus Onda 2): aguarda extração de texto canônico pelo Manus.
// Domínio: transporte rodoviário (MDF-e) → cnaeGroups heurístico "49".
function main(): void {
  if (!existsSync(SOURCE_FILE)) {
    throw new Error(
      `[${LEI_SLUG}] Arquivo .txt não encontrado: ${SOURCE_FILE}\n` +
        "Execute a extração de texto (Manus) antes de rodar este build script."
    );
  }

  const result = buildCorpus({
    inputPath: SOURCE_FILE,
    outputPath: OUTPUT_FILE,
    lei: LEI_SLUG,
    exportName: "RAG_CORPUS_MOC_MDFE_V3",
    headerComment:
      "Corpus RAG — MOC MDF-e v3.00a (Visão Geral)\n" +
      "Corpus Onda 2 — conteúdo extraído de fonte canônica (.txt).",
  });

  console.log(
    `[${LEI_SLUG}] ${result.totalArtigos} artigos → ${result.totalChunks} chunks emitidos.`
  );
}

main();
