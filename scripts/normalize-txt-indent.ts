/**
 * scripts/normalize-txt-indent.ts
 *
 * MISSÃO M4-REVISED (2026-05-19) — TAREFA A.
 *
 * Normaliza determinísticamente o layout de início de artigo dos .txt
 * canônicos cuja extração PDF→txt do Manus preservou indentação de página +
 * ordinal ASCII (`1o`), impedindo o chunker de detectar artigos.
 *
 * NÃO altera o engine (corpus-chunker.ts intacto, REGRA-ORQ-20/34).
 * NÃO autora/edita conteúdo legal — só formato (REGRA ANTI-ALUCINAÇÃO).
 * NÃO muta a fonte canônica — emite arquivos derivados `*_normalized.txt`.
 *
 * Lógica delegada a scripts/lib/corpus-normalize.ts (coberta por unit test
 * scripts/lib/corpus-normalize.test.ts — 7 casos, inclui regressão decreto12955).
 *
 * Uso: pnpm exec tsx scripts/normalize-txt-indent.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeArticleLayout } from "./lib/corpus-normalize";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const TARGETS = [
  { in: "lc123.txt", out: "lc123_normalized.txt" },
  { in: "resolucao_cgsn_140.txt", out: "resolucao_cgsn_140_normalized.txt" },
] as const;

for (const t of TARGETS) {
  const src = resolve(root, "scripts/corpus-source", t.in);
  const dst = resolve(root, "scripts/corpus-source", t.out);
  const raw = readFileSync(src, "utf-8");
  const normalized = normalizeArticleLayout(raw);
  writeFileSync(dst, normalized, "utf-8");

  const col0 = normalized
    .split(/\r?\n/)
    .filter(l => /^Art\.\s+\d+/.test(l)).length;
  console.log(`[normalize] ${t.in} → ${t.out} | linhas '^Art. <n>' = ${col0}`);
}
