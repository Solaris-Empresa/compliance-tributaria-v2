/**
 * scripts/lib/corpus-normalize.ts
 *
 * Normalização determinística de layout de artigos para o chunker de corpus.
 *
 * Motivação (Sprint Corpus Onda 2, 2026-05-19): a extração PDF→txt do Manus
 * para `lc123.txt` e `resolucao_cgsn_140.txt` preservou indentação de página
 * e usou ordinal ASCII (`1o`, `2o`) em vez de `º` (U+00BA). O chunker
 * (scripts/lib/corpus-chunker.ts) usa `ARTIGO_START_RE = /^Art\.\s+(\d+)\s*(º|\.)?\s+/`,
 * ancorado na coluna 0 e exigindo `º`/`.` — então 0 artigos eram detectados.
 *
 * Esta normalização NÃO altera o engine (corpus-chunker.ts intacto) e NÃO
 * autora conteúdo (REGRA ANTI-ALUCINAÇÃO). É uma transformação puramente
 * mecânica, lossless e idempotente, aplicada APENAS a linhas que iniciam
 * (após espaços) com `Art. <número>`:
 *
 *   1. Remove a indentação à esquerda da linha de início de artigo
 *      (`       Art. 1o ...`  →  `Art. 1o ...`)
 *   2. Converte o ordinal ASCII para `º` quando o número é imediatamente
 *      seguido de `o` e de espaço (`Art. 1o Esta`  →  `Art. 1º Esta`)
 *
 * O texto canônico (.txt extraído pelo Manus) permanece intacto — o build
 * script emite um arquivo derivado `<slug>.normalized.txt` para auditoria.
 *
 * Linhas que não começam com `Art. <número>` (corpo, incisos, cabeçalhos de
 * página) são preservadas byte-a-byte. Sub-artigos `Art. 3o-A` NÃO são
 * convertidos (o `-` após o número não é espaço) — comportamento idêntico ao
 * que o engine já tem para entradas limpas; fora do escopo desta correção.
 */

/** Linha que (após espaços opcionais) inicia um artigo: `Art. <dígitos>`. */
const ARTICLE_LINE_RE = /^\s*Art\.\s+\d+/;

/**
 * Normaliza o layout de linhas de início de artigo para casar com
 * `ARTIGO_START_RE` do chunker, sem tocar no engine nem no resto do texto.
 */
export function normalizeArticleLayout(raw: string): string {
  return raw
    .split(/\r?\n/)
    .map(line => {
      if (!ARTICLE_LINE_RE.test(line)) return line; // preserva byte-a-byte
      // 1. de-indenta apenas a linha de início de artigo
      let out = line.replace(/^\s+(Art\.)/, "$1");
      // 2. ordinal ASCII → º, somente quando `<dígitos>o` é seguido de espaço
      out = out.replace(/^(Art\.\s+\d+)o(\s)/, "$1º$2");
      return out;
    })
    .join("\n");
}
