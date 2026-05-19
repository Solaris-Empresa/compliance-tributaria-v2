/**
 * scripts/build-corpus-lc123.ts
 *
 * Chunker determinístico da LC 123/2006 (Simples Nacional — base legal).
 * Corpus Onda 2 — SCAFFOLD (infraestrutura, sem conteúdo).
 *
 * NOTA: o slug `lc123` JÁ EXISTE no enum `lei` desde a Sprint H (migration 0055)
 * — NÃO é adicionado pela migration 0095. Não há, porém, build script nem
 * server/rag-corpus-lc123.ts: este scaffold preenche essa lacuna de builder.
 *
 * Input:  scripts/corpus-source/lc123.txt  (aguarda extração pelo Manus)
 * Output: server/rag-corpus-lc123.ts
 * Lei:    lc123 (enum em drizzle/schema.ts — pré-existente, migration 0055)
 *
 * REGRA ANTI-ALUCINAÇÃO: Claude Code NÃO autora conteúdo legal. O .txt
 * canônico é extraído da fonte pelo Manus. Sem o .txt, este script ABORTA.
 *
 * Uso: pnpm exec tsx scripts/build-corpus-lc123.ts
 */

import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCorpus } from "./lib/corpus-chunker";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const LEI_SLUG = "lc123";
// M4-REVISED: usa o .txt normalizado (de-indent + ordinal) — canônico intacto.
const SOURCE_FILE = resolve(root, "scripts/corpus-source/lc123_normalized.txt");
const OUTPUT_FILE = resolve(root, "server/rag-corpus-lc123.ts");

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
    exportName: "RAG_CORPUS_LC123",
    universalOverride: true,
    headerComment:
      "Corpus RAG — LC 123/2006 (Simples Nacional — base legal)\n" +
      "Corpus Onda 2 — conteúdo extraído de fonte canônica (.txt).",
  });

  console.log(
    `[${LEI_SLUG}] ${result.totalArtigos} artigos → ${result.totalChunks} chunks emitidos.`
  );
}

main();
