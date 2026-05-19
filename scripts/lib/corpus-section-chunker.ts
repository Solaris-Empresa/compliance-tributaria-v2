/**
 * scripts/lib/corpus-section-chunker.ts
 *
 * Chunker determinístico por SEÇÃO (não por artigo) para manuais técnicos
 * com estrutura `N`, `N.N`, `N.N.N` (ex.: MOC CT-e/MDF-e Visão Geral).
 *
 * MOTIVAÇÃO (issue #1089, Sprint Corpus Onda 2): os manuais MOC não têm
 * estrutura `Art. N` — o chunker de artigo (corpus-chunker.ts) detecta 0.
 * Este módulo é SEPARADO: `ARTIGO_START_RE` NÃO é tocado (REGRA-ORQ-20/34).
 *
 * Diagnóstico empírico (moc_cte_v4.txt / moc_mdfe_v3.txt):
 *  - Sumário (ToC): linhas com "....... <página>" (dotted leaders).
 *  - Corpo: heading indentado `  2.1.7  Título` SEM dotted leader.
 *  → Separação determinística: linha com /\.{4,}/ = ToC (descartada);
 *    heading de corpo = /^\s*(\d+(\.\d+)*)\s+\S/ E sem dotted leader.
 *
 * REGRA ANTI-ALUCINAÇÃO (REGRA-ORQ-29): `conteudo`/`titulo` são verbatim do
 * `.txt`. Nada é inferido/parafraseado. `topicos` reutiliza o extrator
 * determinístico já provado (corpus-chunker.extractTopicos) — sem autoria.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { extractTopicos } from "./corpus-chunker";
import type { CorpusEntry } from "../../server/rag-corpus";

/**
 * Heading de corpo: indentação opcional + id numérico (`2`, `2.1`, `2.1.7.1`)
 * + título que COMEÇA COM LETRA. O requisito de letra inicial descarta
 * determinísticamente linhas de tabela de versão/data (`4.00  08/2022  Versão
 * inicial...`) que precedem a 1ª seção real — falsos positivos observados
 * empiricamente em moc_cte_v4.txt / moc_mdfe_v3.txt. Headings reais sempre
 * iniciam com maiúscula (Introdução, Conceitos, DACTE, Schema XML…).
 */
const SECTION_START_RE = /^\s*(\d+(?:\.\d+)*)\s+([A-Za-zÀ-ÿ].*?)\s*$/;
/** Linha do Sumário (ToC): possui "dotted leaders" (`....`) — descartada. */
const TOC_LINE_RE = /\.{4,}/;

export interface SectionEntry {
  id: string;
  titulo: string;
  conteudo: string;
}

/**
 * Extrai seções do corpo. Descarta linhas de ToC (dotted leaders) e
 * preâmbulo (linhas antes da 1ª seção). Determinístico, sem autoria.
 */
export function extractSections(raw: string, minChars = 80): SectionEntry[] {
  const lines = raw.split(/\r?\n/);
  const sections: SectionEntry[] = [];
  let current: { id: string; titulo: string; lines: string[] } | null = null;

  for (const line of lines) {
    if (TOC_LINE_RE.test(line)) continue; // ToC / ruído de página
    const m = line.match(SECTION_START_RE);
    if (m) {
      if (current) {
        const conteudo = current.lines.join("\n").trim();
        if (conteudo.length >= minChars) {
          sections.push({ id: current.id, titulo: current.titulo, conteudo });
        }
      }
      current = { id: m[1]!, titulo: m[2]!.trim(), lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) {
    const conteudo = current.lines.join("\n").trim();
    if (conteudo.length >= minChars) {
      sections.push({ id: current.id, titulo: current.titulo, conteudo });
    }
  }
  return sections;
}

/** Divide texto > maxChars em pedaços determinísticos no último whitespace. */
export function splitLong(text: string, maxChars = 1200): string[] {
  if (text.length <= maxChars) return [text];
  const out: string[] = [];
  let rest = text;
  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf("\n", maxChars);
    if (cut < maxChars * 0.5) cut = rest.lastIndexOf(" ", maxChars);
    if (cut < maxChars * 0.5) cut = maxChars; // fallback duro (determinístico)
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest.length > 0) out.push(rest);
  return out;
}

export interface SectionBuildOptions {
  inputPath: string;
  outputPath: string;
  lei: string;
  exportName: string;
  /** cnaeGroups fixo do documento (config, não conteúdo). Default "". */
  cnaeGroups?: string;
  headerComment: string;
  minChars?: number;
  maxChunkChars?: number;
}

export function buildSectionCorpus(opts: SectionBuildOptions): {
  totalSections: number;
  totalChunks: number;
} {
  const raw = readFileSync(opts.inputPath, "utf-8");
  const sections = extractSections(raw, opts.minChars ?? 80);
  const cnaeGroups = opts.cnaeGroups ?? "";

  const entries: CorpusEntry[] = [];
  for (const s of sections) {
    const parts = splitLong(s.conteudo, opts.maxChunkChars ?? 1200);
    parts.forEach((conteudo, chunkIndex) => {
      entries.push({
        lei: opts.lei as CorpusEntry["lei"],
        artigo: `Seção ${s.id}`.slice(0, 300),
        titulo: s.titulo.slice(0, 500),
        conteudo,
        topicos: extractTopicos(conteudo),
        cnaeGroups,
        chunkIndex,
      });
    });
  }

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
    ` * Gerado por scripts/build-corpus-${opts.lei.replace(/_/g, "-")}.ts`,
    ` * (corpus-section-chunker — seções, não artigos).`,
    ` * Total: ${entries.length} chunks (${sections.length} seções).`,
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
  return { totalSections: sections.length, totalChunks: entries.length };
}
