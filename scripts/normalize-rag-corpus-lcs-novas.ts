/**
 * scripts/normalize-rag-corpus-lcs-novas.ts
 *
 * Tech debt sync — `server/rag-corpus-lcs-novas.ts` (auto-gerado 2026-03-18)
 * contém os 37 chunks pré-cirurgia do Art. 544. PR #1109 já aplicou a
 * surgery no DB de produção; este script aplica a MESMA surgery na fonte de
 * código (módulo `.ts`) para evitar regressão silenciosa em re-ingestão.
 *
 * AÇÃO (idêntica ao script #1109 fix-lc214-art544-chunks.ts, mas no plano
 * do módulo .ts em vez do DB):
 *   1. DELETE Art. 544 (parte 15) — ANEXO XI (~22.904 chars)
 *   2. SPLIT Art. 544 (parte N) WHERE conteudo.length > 5000 em sub-chunks
 *      de até 1800 chars (em fronteira de \n ou espaço); sub-chunks recebem
 *      artigo "Art. 544 (parte N.M)". Original removido após split.
 *
 * Preserva todos os outros 1.241 chunks intactos (lei/artigo/titulo/conteudo/
 * topicos/cnaeGroups/chunkIndex). Modulo re-emitido no mesmo formato do
 * chunker (template literal back-tick para conteudo/titulo).
 *
 * Uso: pnpm exec tsx scripts/normalize-rag-corpus-lcs-novas.ts
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { RAG_CORPUS_LCS_NOVAS } from "../server/rag-corpus-lcs-novas";
import type { CorpusEntry } from "../server/rag-corpus";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(root, "server/rag-corpus-lcs-novas.ts");

const PARTE_15_ARTIGO = "Art. 544 (parte 15)";
const SPLIT_THRESHOLD = 5000;
const MAX_CHUNK_CHARS = 1800;

/** Divide texto em pedaços <= max em fronteira de \n ou espaço. Determinístico. */
function splitDeterministic(text: string, max = MAX_CHUNK_CHARS): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n", max);
    if (cut < max * 0.5) cut = rest.lastIndexOf(" ", max);
    if (cut < max * 0.5) cut = max;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest.length > 0) out.push(rest);
  return out;
}

// Aplica surgery
const before = RAG_CORPUS_LCS_NOVAS.length;
let removedParte15 = 0;
let splitOriginals = 0;
let subChunksAdded = 0;

const transformed: CorpusEntry[] = RAG_CORPUS_LCS_NOVAS.flatMap((e) => {
  // DELETE parte 15
  if (e.artigo === PARTE_15_ARTIGO) {
    removedParte15++;
    return [];
  }
  // SPLIT oversize Art. 544 partes
  const m = e.artigo.match(/^Art\. 544 \(parte (\d+)\)$/);
  if (m && e.conteudo.length > SPLIT_THRESHOLD) {
    const baseNum = m[1];
    const parts = splitDeterministic(e.conteudo);
    splitOriginals++;
    subChunksAdded += parts.length;
    return parts.map((conteudo, i) => ({
      ...e,
      conteudo,
      artigo: `Art. 544 (parte ${baseNum}.${i + 1})`,
    }));
  }
  return [e];
});

// Emite módulo no mesmo formato do chunker (back-tick template literal)
const escapeBacktick = (s: string) =>
  s.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

const body = transformed
  .map((e) =>
    [
      "  {",
      `    lei: ${JSON.stringify(e.lei)},`,
      `    artigo: ${JSON.stringify(e.artigo)},`,
      `    titulo: \`${escapeBacktick(e.titulo)}\`,`,
      `    conteudo: \`${escapeBacktick(e.conteudo)}\`,`,
      `    topicos: ${JSON.stringify(e.topicos)},`,
      `    cnaeGroups: ${JSON.stringify(e.cnaeGroups)},`,
      `    chunkIndex: ${e.chunkIndex},`,
      "  },",
    ].join("\n"),
  )
  .join("\n");

const file = [
  "/**",
  " * Corpus RAG Expandido — LCs 214, 224 e 227 (gerado automaticamente)",
  ` * Total de entradas: ${transformed.length}`,
  " * Gerado em: 2026-03-18 08:05 (versão original)",
  ` * Surgery aplicada: ${new Date().toISOString().slice(0, 10)} — Art. 544 (parte 15) deletada (ANEXO XI ~22k chars) + 4 partes oversize divididas em ${subChunksAdded} sub-chunks (sync com PR #1109 no DB). Veja scripts/normalize-rag-corpus-lcs-novas.ts.`,
  " */",
  "",
  "import type { CorpusEntry } from './rag-corpus';",
  "",
  "// `as unknown as CorpusEntry[]` força TS a abandonar inferência de tipos",
  "// literais (TS2590: union de strings literais demasiado complexa com 1.254",
  "// entradas pós-surgery; só a anotação da const é insuficiente).",
  "export const RAG_CORPUS_LCS_NOVAS: CorpusEntry[] = ([",
  body,
  "] as unknown as CorpusEntry[]);",
  "",
].join("\n");

writeFileSync(OUT, file, "utf-8");

console.log(`[lcs-novas-sync] entries: ${before} → ${transformed.length}`);
console.log(`  - removed Art. 544 (parte 15): ${removedParte15}`);
console.log(`  - split oversize originals:    ${splitOriginals}`);
console.log(`  - sub-chunks created:          ${subChunksAdded}`);
console.log(`  - net delta:                   ${transformed.length - before}`);
