/**
 * consolidate-gaps.ts — issue #780 item 1
 *
 * Consolida gaps do briefing que citam o mesmo dispositivo legal.
 * Pós-processamento determinístico após LLM retornar — mesmo pattern
 * de `classifyInconsistenciaImpacto`.
 *
 * Motivação UAT 2026-04-20: LLM produzia 3 gaps distintos todos com
 * `evidencia_regulatoria = "Art. 21 §1º LC 214/2025"` — inflava contagem
 * de gaps e confundia o cliente. Agora agrupa em 1 gap com múltiplas
 * sub-recomendações quando o artigo (com parágrafo) é o mesmo.
 */

export interface BriefingGap {
  gap?: string;
  causa_raiz?: string;
  evidencia_regulatoria?: string;
  urgencia?: string;
  [key: string]: unknown;
}

const URGENCY_RANK: Record<string, number> = {
  imediata: 4,
  curta:    3,
  media:    2,
  baixa:    1,
};

/**
 * Normaliza `evidencia_regulatoria` para chave de agrupamento.
 * Preserva "Art. N §M" mas descarta diferenças de formatação (espaços,
 * caso, LC/Lei). Dois gaps só são consolidados se tiverem o MESMO artigo
 * com o MESMO parágrafo.
 *
 * Exemplos:
 *   "Art. 21 §1º LC 214/2025"     → "art. 21 §1"
 *   "art.21 § 1° LC214/2025"      → "art. 21 §1"
 *   "Art. 21 LC 214/2025"         → "art. 21"       (diferente de §1)
 *   "Art. 21 §2º LC 214/2025"     → "art. 21 §2"    (diferente de §1)
 */
export function normalizeEvidenciaKey(ev: string | undefined | null): string {
  if (!ev) return "";
  const s = String(ev).toLowerCase();
  // Captura "art." seguido de número e parágrafo opcional
  const match = s.match(/art\.?\s*(\d+)(?:\s*§\s*(\d+)[º°ª]?)?/i);
  if (!match) return s.trim();
  const artigo = match[1];
  const paragrafo = match[2] ? ` §${match[2]}` : "";
  return `art. ${artigo}${paragrafo}`;
}

function pickUrgencyRank(u: string | undefined): number {
  if (!u) return 0;
  return URGENCY_RANK[u.toLowerCase()] ?? 0;
}

/**
 * Consolida gaps que compartilham o mesmo artigo+parágrafo.
 *
 * Estratégia:
 *   - Agrupa por `normalizeEvidenciaKey(evidencia_regulatoria)`.
 *   - Grupos com 1 gap → passa direto.
 *   - Grupos com 2+ gaps → merge:
 *     • primary = gap com maior `urgencia` (empate: primeiro do array).
 *     • `gap` = texto do primary + seção "Também cobre" com bullets dos outros.
 *     • `causa_raiz` = concat dos causa_raiz não vazios com separador " | ".
 *     • `urgencia` = maior urgência do grupo.
 *     • `evidencia_regulatoria` = preserva o texto do primary (inclui "LC...").
 *
 * Preserva a ordem original dos primeiros gaps de cada grupo.
 */
export function consolidateGapsByArticle(gaps: BriefingGap[] | undefined | null): BriefingGap[] {
  if (!Array.isArray(gaps) || gaps.length <= 1) return gaps ?? [];

  type Bucket = { key: string; items: BriefingGap[]; firstIndex: number };
  const buckets: Map<string, Bucket> = new Map();
  let orderCounter = 0;

  for (const g of gaps) {
    const key = normalizeEvidenciaKey(g?.evidencia_regulatoria);
    if (!key) {
      // Sem chave normalizável → chave única para não consolidar
      const uniqueKey = `__no_key_${orderCounter}__`;
      buckets.set(uniqueKey, { key: uniqueKey, items: [g], firstIndex: orderCounter });
      orderCounter++;
      continue;
    }
    const existing = buckets.get(key);
    if (existing) {
      existing.items.push(g);
    } else {
      buckets.set(key, { key, items: [g], firstIndex: orderCounter });
    }
    orderCounter++;
  }

  // Ordena buckets pela firstIndex (preserva ordem original dos gaps)
  const ordered = Array.from(buckets.values()).sort((a, b) => a.firstIndex - b.firstIndex);

  return ordered.map((bucket) => {
    if (bucket.items.length === 1) return bucket.items[0];

    // Pick primary: maior urgência; empate → primeiro
    const primary = bucket.items.reduce(
      (best, cur) => (pickUrgencyRank(cur.urgencia) > pickUrgencyRank(best.urgencia) ? cur : best),
      bucket.items[0]
    );
    const others = bucket.items.filter((x) => x !== primary);

    // Construção do texto do gap consolidado
    const gapParts: string[] = [];
    if (primary.gap) gapParts.push(primary.gap);
    if (others.length > 0) {
      gapParts.push("\n\nTambém cobre:");
      others.forEach((o) => {
        if (o.gap) gapParts.push(`• ${o.gap}`);
      });
    }

    // Causas raiz concatenadas
    const causasRaiz = bucket.items
      .map((i) => i.causa_raiz)
      .filter((c): c is string => typeof c === "string" && c.trim().length > 0);
    const causaRaizMerged = causasRaiz.length > 0 ? causasRaiz.join(" | ") : undefined;

    // Maior urgência
    const maxUrgencia = bucket.items.reduce(
      (best, cur) => (pickUrgencyRank(cur.urgencia) > pickUrgencyRank(best) ? (cur.urgencia ?? best) : best),
      primary.urgencia ?? ""
    );

    return {
      ...primary,
      gap: gapParts.join("\n"),
      causa_raiz: causaRaizMerged,
      urgencia: maxUrgencia,
      evidencia_regulatoria: primary.evidencia_regulatoria,
      // Preserva qualquer campo extra do primary
    };
  });
}
