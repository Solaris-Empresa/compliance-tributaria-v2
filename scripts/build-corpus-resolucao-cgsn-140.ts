/**
 * scripts/build-corpus-resolucao-cgsn-140.ts
 *
 * Chunker determinístico da Resolução CGSN 140/2018 (Simples Nacional).
 * Corpus Onda 2 — SCAFFOLD (infraestrutura, sem conteúdo).
 *
 * Input:  scripts/corpus-source/resolucao_cgsn_140.txt  (aguarda extração pelo Manus)
 * Output: server/rag-corpus-resolucao-cgsn-140.ts
 * Lei:    resolucao_cgsn_140 (enum em drizzle/schema.ts — migration 0095)
 *
 * REGRA ANTI-ALUCINAÇÃO: Claude Code NÃO autora conteúdo legal. O .txt
 * canônico é extraído da fonte pelo Manus. Sem o .txt, este script ABORTA.
 *
 * Uso: pnpm exec tsx scripts/build-corpus-resolucao-cgsn-140.ts
 */

import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCorpus } from "./lib/corpus-chunker";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const LEI_SLUG = "resolucao_cgsn_140";
// M4-REVISED: usa o .txt normalizado (de-indent + ordinal) — canônico intacto.
const SOURCE_FILE = resolve(
  root,
  "scripts/corpus-source/resolucao_cgsn_140_normalized.txt"
);
const OUTPUT_FILE = resolve(root, "server/rag-corpus-resolucao-cgsn-140.ts");

// TODO(Corpus Onda 2): aguarda extração de texto canônico pelo Manus.
// Domínio: Simples Nacional / MEI → universal (cnaeGroups="", isUniversal=true).
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
    exportName: "RAG_CORPUS_RESOLUCAO_CGSN_140",
    universalOverride: true,
    headerComment:
      "Corpus RAG — Resolução CGSN 140/2018 (Simples Nacional)\n" +
      "Corpus Onda 2 — conteúdo extraído de fonte canônica (.txt).",
  });

  console.log(
    `[${LEI_SLUG}] ${result.totalArtigos} artigos → ${result.totalChunks} chunks emitidos.`
  );
}

main();
