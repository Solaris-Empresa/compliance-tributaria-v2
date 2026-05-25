/**
 * scripts/lib/corpus-chunker.ts — Parser e chunker determinístico de TXTs canônicos.
 *
 * Convenções (espelham o padrão de server/rag-corpus-lcs-novas.ts):
 *   - 1 artigo → 1 chunk quando conteudo ≤ 2.000 chars.
 *   - Artigo longo → divide em "Art. X (parte 2)", "Art. X (parte 3)", ...
 *     com chunkIndex 0, 1, 2 (compatível com merge dedup do retriever).
 *   - cnaeGroups: string CSV com 2 dígitos do grupo CNAE — vazio quando universal.
 *   - topicos: termos operacionais detectados via dicionário setorial.
 *
 * Uso: cada script de build importa as funções daqui e fornece o caminho do
 * TXT + a `lei` (literal do enum) + um filtro de range de artigos.
 *
 * CORPUS-RFC-008 — Issue #1074 (P0 fast-track ORQ-11).
 */

import { readFileSync, writeFileSync } from "node:fs";

/** Tipo do entry compatível com server/rag-corpus.ts `CorpusEntry`. */
export interface CorpusEntry {
  lei: string;
  artigo: string;
  titulo: string;
  conteudo: string;
  topicos: string;
  cnaeGroups: string;
  chunkIndex: number;
}

const MAX_CHUNK_CHARS = 2000;

/**
 * Detecta o início de um artigo: linha que começa com `Art.` seguido de número.
 * Aceita:
 *   "Art. 1º  A Contribuição..."        → numero "1", suffix ordinal "º"
 *   "Art. 10.  São imunes..."           → numero "10"
 *   "Art. 467. As alíquotas..."         → numero "467"
 *
 * NÃO casa com referências internas tipo "art. 84" (minúsculo) ou "Art. 1º da Lei".
 */
const ARTIGO_START_RE = /^Art\.\s+(\d+)\s*(º|\.)?\s+/;

/**
 * Extrai todos os artigos de um TXT no formato canônico planalto/cgibs.
 * Cada artigo agrega TODAS as linhas até o próximo "Art. N" ou EOF.
 *
 * Filtros estruturais ignorados antes do primeiro artigo:
 *   - Preâmbulo (header HTML do planalto, "PRESIDÊNCIA DA REPÚBLICA", etc.)
 *   - Sumário (linhas com "............ 6", "............ 18", típicas do PDF→TXT)
 *
 * @param raw     conteúdo bruto do TXT
 * @param filter  opcional — função que decide se um artigo entra ou não
 *                (ex: somente Art. 467-615 para CGIBS 6 Livro II)
 */
export function extractArticles(
  raw: string,
  filter?: (numero: number) => boolean,
): Array<{ numero: number; conteudo: string }> {
  const lines = raw.split(/\r?\n/);
  const articles: Array<{ numero: number; conteudo: string }> = [];
  let current: { numero: number; lines: string[] } | null = null;

  for (const line of lines) {
    const match = line.match(ARTIGO_START_RE);
    if (match) {
      if (current) {
        articles.push({
          numero: current.numero,
          conteudo: current.lines.join("\n").trim(),
        });
      }
      const numero = parseInt(match[1]!, 10);
      current = { numero, lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) {
    articles.push({
      numero: current.numero,
      conteudo: current.lines.join("\n").trim(),
    });
  }

  if (filter) return articles.filter((a) => filter(a.numero));
  return articles;
}

// ─── Mapeamento setor → cnaeGroups (decisão P.O. 2026-05-13) ─────────────────

const SETOR_CNAE_GROUPS: ReadonlyArray<{
  keywords: readonly string[];
  cnaeGroups: string;
}> = [
  {
    // Agronegócio / insumos agropecuários
    keywords: [
      "agropecuári",
      "agropecuár",
      "fertilizant",
      "defensiv",
      "ração",
      "racao",
      "sement",
      "biocombustív",
      "produtor rural",
      "produtores rurais",
      "cesta básica",
      "cesta basica",
      "alimento",
      "carne",
      "leite",
      "soja",
      "milho",
      "café",
      "trigo",
      "arroz",
      "feijão",
    ],
    cnaeGroups: "01,02,03,10,11,12,23,46,47",
  },
  {
    // Serviços financeiros / seguros / bancário
    keywords: [
      "serviços financeiros",
      "servicos financeiros",
      "instituição financeira",
      "instituicao financeira",
      "bancári",
      "seguro",
      "previdênci",
      "previdenci",
      "câmbio",
      "cambio",
      "fundo de investimento",
      "operação de crédito",
      "operacao de credito",
      "intermediação financeira",
      "intermediacao financeira",
    ],
    cnaeGroups: "64,65,66",
  },
  {
    // Saúde / medicamentos / planos
    keywords: [
      "medicament",
      "plano de saúde",
      "plano de saude",
      "serviços de saúde",
      "servicos de saude",
      "hospital",
      "ANVISA",
      "produtos para a saúde",
      "produtos para a saude",
      "dispositivo médico",
      "dispositivo medico",
    ],
    cnaeGroups: "21,47,86",
  },
  {
    // Transporte
    keywords: [
      "transporte coletivo",
      "transporte rodoviário",
      "transporte rodoviario",
      "transporte aéreo",
      "transporte aereo",
      "transporte ferroviário",
      "transporte ferroviario",
      "transporte aquaviário",
      "transporte aquaviario",
      "frete",
      "transportador autônomo",
      "transportador autonomo",
      "ANTT",
      "ANTAQ",
    ],
    cnaeGroups: "49,50,51,52",
  },
  {
    // Construção civil
    keywords: [
      "construção civil",
      "construcao civil",
      "incorporação imobiliária",
      "incorporacao imobiliaria",
      "obra de construção",
      "obra de construcao",
      "incorporador",
      "construtora",
    ],
    cnaeGroups: "41,42,43",
  },
];

/**
 * Heurística determinística para cnaeGroups: itera dicionários setoriais; o
 * PRIMEIRO matched setor vence. Lista de dicionários é ordem-sensitive — agro
 * vem antes de financeiro para evitar falso match em "operação rural de crédito".
 *
 * Retorna "" quando:
 *   - Nenhum dicionário casa (artigo geral de alíquota / disposição comum)
 *   - É chamado com `universalOverride=true` (todo Livro I do Decreto)
 */
export function inferCnaeGroups(
  conteudo: string,
  universalOverride = false,
): string {
  if (universalOverride) return "";

  const lower = conteudo.toLowerCase();
  for (const setor of SETOR_CNAE_GROUPS) {
    for (const kw of setor.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return setor.cnaeGroups;
      }
    }
  }
  return "";
}

// ─── Tópicos operacionais ────────────────────────────────────────────────────

const TOPICO_DICT: ReadonlyArray<{ keyword: string; topic: string }> = [
  { keyword: "alíquota", topic: "aliquota" },
  { keyword: "aliquota", topic: "aliquota" },
  { keyword: "imunidade", topic: "imunidade" },
  { keyword: "isenção", topic: "isencao" },
  { keyword: "isencao", topic: "isencao" },
  { keyword: "não cumulatividade", topic: "nao_cumulatividade" },
  { keyword: "nao cumulatividade", topic: "nao_cumulatividade" },
  { keyword: "crédito", topic: "credito" },
  { keyword: "credito", topic: "credito" },
  { keyword: "ressarcimento", topic: "ressarcimento" },
  { keyword: "split payment", topic: "split_payment" },
  { keyword: "fato gerador", topic: "fato_gerador" },
  { keyword: "base de cálculo", topic: "base_calculo" },
  { keyword: "base de calculo", topic: "base_calculo" },
  { keyword: "redução", topic: "reducao" },
  { keyword: "reducao", topic: "reducao" },
  { keyword: "crédito presumido", topic: "credito_presumido" },
  { keyword: "credito presumido", topic: "credito_presumido" },
  { keyword: "regime específico", topic: "regime_especifico" },
  { keyword: "regime especifico", topic: "regime_especifico" },
  { keyword: "regime diferenciado", topic: "regime_diferenciado" },
  { keyword: "Zona Franca", topic: "ZFM" },
  { keyword: "ZFM", topic: "ZFM" },
  { keyword: "importação", topic: "importacao" },
  { keyword: "importacao", topic: "importacao" },
  { keyword: "exportação", topic: "exportacao" },
  { keyword: "exportacao", topic: "exportacao" },
  { keyword: "combustív", topic: "combustivel" },
  { keyword: "biocombustív", topic: "biocombustivel" },
  { keyword: "cesta básica", topic: "cesta_basica" },
  { keyword: "cesta basica", topic: "cesta_basica" },
];

const BASE_TOPICOS = ["CBS", "IBS", "Reforma Tributária"];

/**
 * Extrai tópicos de um artigo combinando dicionário operacional + tags base.
 * Dedup por valor (Set), ordem alfabética estável para reprodutibilidade.
 */
export function extractTopicos(conteudo: string, extra: readonly string[] = []): string {
  const set = new Set<string>(BASE_TOPICOS);
  const lower = conteudo.toLowerCase();
  for (const { keyword, topic } of TOPICO_DICT) {
    if (lower.includes(keyword.toLowerCase())) set.add(topic);
  }
  for (const e of extra) set.add(e);
  return Array.from(set).sort().join(", ");
}

// ─── Titulo: primeira sentença significativa ─────────────────────────────────

/**
 * Extrai um titulo curto (≤ 200 chars) do conteúdo:
 *   1. Remove o prefixo "Art. Nº  " literal.
 *   2. Pega a primeira sentença até o primeiro ":" ou "." mantendo legibilidade.
 *   3. Trunca em 200 chars adicionando reticência se necessário.
 */
export function extractTitulo(numero: number, conteudo: string): string {
  // Remove o prefixo "Art. N." / "Art. Nº" do início do conteúdo
  let body = conteudo.replace(/^Art\.\s+\d+\s*(?:º|\.)?\s+/, "").trim();
  // Pega até o primeiro ":" ou "." (mas pelo menos 30 chars)
  const colonIdx = body.indexOf(":");
  const dotIdx = body.indexOf(".");
  let cut = body.length;
  if (colonIdx > 30 && colonIdx < cut) cut = colonIdx;
  if (dotIdx > 30 && dotIdx < cut) cut = dotIdx;
  body = body.slice(0, cut).trim();
  if (body.length > 200) {
    body = body.slice(0, 197).trimEnd() + "...";
  }
  if (body.length === 0) {
    body = `Artigo ${numero}`;
  }
  return body;
}

// ─── Chunking ────────────────────────────────────────────────────────────────

/**
 * Divide o conteúdo em pedaços ≤ MAX_CHUNK_CHARS, quebrando preferencialmente
 * em fim de parágrafo (`\n\n`) ou ponto final. Cada pedaço vira um chunk com
 * artigo "Art. N (parte M)" quando há mais de 1 pedaço; primeiro pedaço usa
 * artigo "Art. N" e chunkIndex 0.
 */
export function splitChunks(numero: number, conteudo: string): Array<{ artigo: string; conteudo: string; chunkIndex: number }> {
  if (conteudo.length <= MAX_CHUNK_CHARS) {
    return [{ artigo: `Art. ${numero}`, conteudo, chunkIndex: 0 }];
  }

  const parts: string[] = [];
  let remaining = conteudo;
  while (remaining.length > MAX_CHUNK_CHARS) {
    // Quebra natural decrescente: parágrafo → ponto → quebra de linha → ESPAÇO.
    let cut = -1;
    const window = remaining.slice(0, MAX_CHUNK_CHARS);
    const lastParagraph = window.lastIndexOf("\n\n");
    if (lastParagraph > 1500) cut = lastParagraph + 2;
    if (cut < 0) {
      const lastDot = window.lastIndexOf(". ");
      if (lastDot > 1500) cut = lastDot + 2;
    }
    if (cut < 0) {
      const lastNewline = window.lastIndexOf("\n");
      if (lastNewline > 1500) cut = lastNewline + 1;
    }
    if (cut < 0) {
      // BUG-IBS-00: NUNCA cortar no meio de palavra — recua até o último espaço da janela.
      const lastSpace = window.lastIndexOf(" ");
      if (lastSpace > 0) cut = lastSpace + 1;
    }
    if (cut < 0) cut = MAX_CHUNK_CHARS; // fallback teórico: palavra única > 2000 chars
    parts.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining.length > 0) parts.push(remaining);

  // BUG-IBS-00: funde fragmento final minúsculo no chunk anterior (evita conteudo < 10 chars
  // rejeitado pelo validateChunkBeforeInsert — caso "culo" do Art. 259).
  const MIN_TAIL_CHARS = 40;
  while (parts.length >= 2 && parts[parts.length - 1].length < MIN_TAIL_CHARS) {
    const tail = parts.pop()!;
    parts[parts.length - 1] = `${parts[parts.length - 1]} ${tail}`.trim();
  }

  return parts.map((conteudo, idx) => ({
    artigo: idx === 0 ? `Art. ${numero}` : `Art. ${numero} (parte ${idx + 1})`,
    conteudo,
    chunkIndex: idx,
  }));
}

// ─── Pipeline principal ──────────────────────────────────────────────────────

export interface BuildOptions {
  /** Caminho do TXT canônico (input). */
  inputPath: string;
  /** Caminho do .ts a emitir (output). */
  outputPath: string;
  /** Literal do enum `lei` (decreto12955, resolucao_cgibs_6, portaria_mf_cgibs_7). */
  lei: string;
  /** Nome do export const no arquivo gerado (ex: RAG_CORPUS_DECRETO_12955). */
  exportName: string;
  /** Filtro opcional de range de artigos (ex: Livro II da CGIBS 6 = 467..615). */
  filter?: (numero: number) => boolean;
  /** Quando true, força cnaeGroups="" para todos os chunks (Livro I do Decreto). */
  universalOverride?: boolean;
  /** Quando definido, força cnaeGroups="" para artigos com numero ≤ threshold
   *  (modela "Livro I = Art. 1-465 universais" do Decreto 12.955). */
  universalUpTo?: number;
  /** Header docstring do arquivo gerado. */
  headerComment: string;
}

export function buildCorpus(opts: BuildOptions): { totalArtigos: number; totalChunks: number } {
  const raw = readFileSync(opts.inputPath, "utf-8");
  const articles = extractArticles(raw, opts.filter);

  const entries: CorpusEntry[] = [];
  for (const art of articles) {
    const isUniversal =
      opts.universalOverride === true ||
      (opts.universalUpTo !== undefined && art.numero <= opts.universalUpTo);
    const cnaeGroups = inferCnaeGroups(art.conteudo, isUniversal);
    const topicos = extractTopicos(art.conteudo);
    const chunks = splitChunks(art.numero, art.conteudo);
    for (const c of chunks) {
      entries.push({
        lei: opts.lei,
        artigo: c.artigo,
        titulo: extractTitulo(art.numero, c.conteudo),
        conteudo: c.conteudo,
        topicos,
        cnaeGroups,
        chunkIndex: c.chunkIndex,
      });
    }
  }

  // Emite arquivo .ts
  const header = opts.headerComment
    .split("\n")
    .map((l) => ` * ${l}`)
    .join("\n");
  const body = entries
    .map((e) => {
      // Escapa backticks no conteúdo para usar template literal
      const escapeBacktick = (s: string) => s.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
      return [
        "  {",
        `    lei: "${e.lei}",`,
        `    artigo: ${JSON.stringify(e.artigo)},`,
        `    titulo: ${JSON.stringify(e.titulo)},`,
        `    conteudo: \`${escapeBacktick(e.conteudo)}\`,`,
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
    ` * Gerado automaticamente por scripts/build-corpus-${opts.lei.replace(/_/g, "-")}.ts.`,
    ` * Total de entradas: ${entries.length} (${articles.length} artigos)`,
    " * NÃO editar manualmente — re-gerar via script para preservar determinismo.",
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
  return { totalArtigos: articles.length, totalChunks: entries.length };
}
