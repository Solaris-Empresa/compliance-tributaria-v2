/**
 * scripts/lib/corpus-row-chunker.ts
 *
 * Chunker determinístico por LINHA para tabelas de referência (NCM/NBS):
 * 1 chunk por código + descrição. Issue #A2 (Corpus Onda 3 — desbloqueado
 * após #1091/PR #1095).
 *
 * Não é norma legal — é lookup de classificação fiscal. ARTIGO_START_RE
 * (corpus-chunker.ts) e o section-chunker NÃO são tocados.
 *
 * Diagnóstico empírico (Gate 0):
 *  - `nbs_completa.csv`  : CSV `;`-delimitado, header `NBS 2.0;DESCRIÇÃO`,
 *    ~1237 linhas de dados, códigos `1.01` / `1.0101.11.00`.
 *  - `tabela_ncm_completa.txt`: documento TEC (capa/sumário/seções); os
 *    códigos NCM reais são linhas `NNNN.NN.NN  <descrição>` (~10037).
 *  - **Encodings DIFEREM (verificado por bytes + file(1)):**
 *      `nbs_completa.csv`        = ISO-8859-1 / Latin-1 (ç = 0xE7)
 *      `tabela_ncm_completa.txt` = UTF-8           (ç = 0xC3 0xA7)
 *    Ler com o encoding errado → mojibake ("raça" vira "raÃ§a"). O encoding
 *    é parâmetro obrigatório por arquivo (não hardcoded).
 *
 * REGRA ANTI-ALUCINAÇÃO (REGRA-ORQ-29): code/descrição verbatim da fonte.
 * Nada inferido. `topicos` = tags fixas de classificação (metadado de
 * referência ditado pela spec, não conteúdo autorado).
 */

import { readFileSync, writeFileSync } from "node:fs";
import type { CorpusEntry } from "../../server/rag-corpus";

export interface RowEntry {
  code: string;
  description: string;
}

/** NBS: `<código>;<descrição>` (Latin-1). Header e linhas sem `;` descartados. */
export function extractNbsRows(raw: string): RowEntry[] {
  const out: RowEntry[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const i = line.indexOf(";");
    if (i <= 0) continue; // sem separador ou código vazio
    const code = line.slice(0, i).trim();
    const description = line.slice(i + 1).trim();
    if (!code || !description) continue;
    if (/^nbs\b/i.test(code)) continue; // linha de header (NBS 2.0;DESCRIÇÃO)
    if (!/^\d/.test(code)) continue; // código NBS sempre inicia com dígito
    out.push({ code, description });
  }
  return out;
}

/** NCM: linha `NNNN.NN.NN  <descrição>` (8 dígitos plenos). Capa/seções não casam. */
const NCM_ROW_RE = /^\s*(\d{4}\.\d{2}\.\d{2})\s+(\S.*?)\s*$/;

export function extractNcmRows(raw: string): RowEntry[] {
  const out: RowEntry[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(NCM_ROW_RE);
    if (!m) continue;
    const description = m[2]!.trim();
    if (!description) continue;
    out.push({ code: m[1]!, description });
  }
  return out;
}

export interface RowBuildOptions {
  inputPath: string;
  outputPath: string;
  lei: string;
  exportName: string;
  mode: "ncm" | "nbs";
  /** Encoding REAL do arquivo (obrigatório): "utf-8" (NCM) | "latin1" (NBS). */
  encoding: BufferEncoding;
  /** Tags fixas de classificação (metadado, ditado pela spec). */
  topicos: string;
  headerComment: string;
}

export function buildRowCorpus(opts: RowBuildOptions): { totalRows: number } {
  // CRÍTICO: encoding difere por arquivo (NCM=utf-8, NBS=latin1).
  const raw = readFileSync(opts.inputPath, opts.encoding);
  const rows = opts.mode === "ncm" ? extractNcmRows(raw) : extractNbsRows(raw);

  const entries: CorpusEntry[] = rows.map(r => ({
    lei: opts.lei as CorpusEntry["lei"],
    artigo: r.code.slice(0, 300),
    titulo: r.description.slice(0, 500),
    conteudo: `${r.code} — ${r.description}`,
    topicos: opts.topicos,
    cnaeGroups: "", // universal — NCM/NBS aplicam-se a qualquer CNAE
    chunkIndex: 0,
  }));

  const header = opts.headerComment
    .split("\n")
    .map(l => ` * ${l}`)
    .join("\n");
  const body = entries
    .map(e => {
      const esc = (s: string) =>
        s.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
      return [
        "  {",
        `    lei: "${e.lei}",`,
        `    artigo: ${JSON.stringify(e.artigo)},`,
        `    titulo: ${JSON.stringify(e.titulo)},`,
        `    conteudo: \`${esc(e.conteudo)}\`,`,
        `    topicos: ${JSON.stringify(e.topicos)},`,
        `    cnaeGroups: ${JSON.stringify(e.cnaeGroups)},`,
        `    chunkIndex: ${e.chunkIndex},`,
        "  },",
      ].join("\n");
    })
    .join("\n");

  const file = [
    "/**",
    header,
    " *",
    ` * Gerado por scripts/build-corpus-${opts.mode}.ts (corpus-row-chunker).`,
    ` * Total: ${entries.length} linhas (1 chunk por código ${opts.mode.toUpperCase()}).`,
    " * NÃO editar manualmente — re-gerar via script (determinístico).",
    " */",
    "",
    "import type { CorpusEntry } from './rag-corpus';",
    "",
    `export const ${opts.exportName}: CorpusEntry[] = [`,
    body,
    "];",
    "",
  ].join("\n");

  writeFileSync(opts.outputPath, file, "utf-8");
  return { totalRows: entries.length };
}
