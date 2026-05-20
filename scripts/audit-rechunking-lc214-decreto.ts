/**
 * scripts/audit-rechunking-lc214-decreto.ts
 *
 * Laudo de qualidade de chunks (C2): lc214 + decreto12955.
 * Métricas DETERMINÍSTICAS a partir dos módulos .ts reais (não inventadas).
 *
 * ⚠️ lc214: o código contém apenas ~792 chunks (rag-corpus.ts inline +
 * rag-corpus-lcs-novas.ts). O corpus real em produção tem ~1.574 — o
 * restante existe só no DB (autoridade Manus). Este laudo cobre o
 * SUBCONJUNTO visível em código (escopo declarado).
 *
 * Uso: pnpm exec tsx scripts/audit-rechunking-lc214-decreto.ts
 */
import { RAG_CORPUS } from "../server/rag-corpus";
import { RAG_CORPUS_DECRETO_12955 } from "../server/rag-corpus-decreto12955";
import type { CorpusEntry } from "../server/rag-corpus";

function stats(label: string, chunks: CorpusEntry[]) {
  const lens = chunks.map((c) => (c.conteudo ?? "").length);
  const n = lens.length;
  const sum = lens.reduce((a, b) => a + b, 0);
  const sorted = [...lens].sort((a, b) => a - b);
  const median = n ? sorted[Math.floor(n / 2)]! : 0;
  const lt100 = lens.filter((l) => l < 100).length;
  const r100_299 = lens.filter((l) => l >= 100 && l < 300).length;
  const ideal300_800 = lens.filter((l) => l >= 300 && l <= 800).length;
  const r801_2000 = lens.filter((l) => l > 800 && l <= 2000).length;
  const gt2000 = lens.filter((l) => l > 2000).length;
  const uniqueArtigos = new Set(chunks.map((c) => c.artigo)).size;
  const semArtigo = chunks.filter(
    (c) => !c.artigo || c.artigo.trim() === "",
  ).length;
  // duplicatas exatas de conteudo
  const seen = new Map<string, number>();
  for (const c of chunks)
    seen.set(c.conteudo, (seen.get(c.conteudo) ?? 0) + 1);
  const dupGroups = [...seen.values()].filter((v) => v > 1).length;
  const dupChunks = [...seen.values()]
    .filter((v) => v > 1)
    .reduce((a, b) => a + b, 0);
  console.log(`\n=== ${label} (${n} chunks) ===`);
  console.log(`total=${n} avg=${n ? Math.round(sum / n) : 0} mediana=${median} min=${sorted[0] ?? 0} max=${sorted[n - 1] ?? 0} uniqueArtigos=${uniqueArtigos}`);
  console.log(`HIST <100=${lt100}(${pct(lt100, n)}) 100-299=${r100_299}(${pct(r100_299, n)}) 300-800=${ideal300_800}(${pct(ideal300_800, n)}) 801-2000=${r801_2000}(${pct(r801_2000, n)}) >2000=${gt2000}(${pct(gt2000, n)})`);
  console.log(`sem_artigo=${semArtigo} dup_grupos=${dupGroups} dup_chunks=${dupChunks}`);
}
function pct(x: number, n: number) {
  return n ? `${((x / n) * 100).toFixed(1)}%` : "0%";
}

const lc214 = (RAG_CORPUS as CorpusEntry[]).filter((c) => c.lei === "lc214");
stats("lc214 (SUBCONJUNTO código — ~50% do prod 1.574)", lc214);

// Cobertura art. 1–127 vs 128–260 (extrai número do campo artigo "Art. N")
const artNum = (a: string) => {
  const m = (a ?? "").match(/(\d+)/);
  return m ? parseInt(m[1]!, 10) : NaN;
};
const nums = lc214.map((c) => artNum(c.artigo)).filter((x) => !Number.isNaN(x));
const reformaGeral = nums.filter((x) => x >= 1 && x <= 127).length;
const setorial = nums.filter((x) => x >= 128 && x <= 260).length;
const fora = nums.filter((x) => x > 260).length;
console.log(
  `lc214 cobertura: art1-127=${reformaGeral} art128-260=${setorial} art>260=${fora} sem_num=${lc214.length - nums.length}`,
);

stats("decreto12955 (100% código = prod)", RAG_CORPUS_DECRETO_12955);
const dnums = RAG_CORPUS_DECRETO_12955.map((c) => artNum(c.artigo)).filter(
  (x) => !Number.isNaN(x),
);
console.log(
  `decreto12955: chunks_com_num_artigo=${dnums.length} sem_num=${RAG_CORPUS_DECRETO_12955.length - dnums.length} artigos_distintos=${new Set(dnums).size}`,
);
