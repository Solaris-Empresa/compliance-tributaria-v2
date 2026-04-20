/**
 * briefing-areas.ts — #767 feat(ux): resumo do briefing formato WhatsApp
 *
 * Classificador determinístico + formatador por área da empresa.
 *
 * 6 áreas: generico / fiscal / ti / contabilidade / legal / gestao
 *
 * Classificação: keywords regex. Zero LLM, zero custo extra, determinístico.
 * Mesmo pattern usado em classifyInconsistenciaImpacto (server/routers-fluxo-v3.ts).
 */

export type BriefingArea =
  | "generico"
  | "fiscal"
  | "ti"
  | "contabilidade"
  | "legal"
  | "gestao";

export const AREA_META: Record<BriefingArea, { label: string; emoji: string }> = {
  generico:      { label: "Genérico",      emoji: "📊" },
  fiscal:        { label: "Fiscal",        emoji: "💼" },
  ti:            { label: "T.I.",          emoji: "💻" },
  contabilidade: { label: "Contabilidade", emoji: "📚" },
  legal:         { label: "Legal",         emoji: "⚖️" },
  gestao:        { label: "Gestão",        emoji: "🎯" },
};

export const AREA_ORDER: BriefingArea[] = [
  "generico",
  "fiscal",
  "ti",
  "contabilidade",
  "legal",
  "gestao",
];

// ─── Classificação por keywords ──────────────────────────────────────────────

// Patterns apertados — evitam colisões cross-área.
// Ex.: "parametriza[çc][ãa]o" sem ERP NÃO cai em TI (palavra também aparece em fiscal).
const PATTERNS: Record<Exclude<BriefingArea, "generico">, RegExp[]> = {
  contabilidade: [
    /\b(escritura[çc][ãa]o|reconhecimento cont[áa]bil|segrega[çc][ãa]o cont[áa]bil)\b/i,
    /\b(lan[çc]amento cont[áa]bil|plano de contas|balancete|concilia[çc][ãa]o cont[áa]bil)\b/i,
    /\b(regime cont[áa]bil|compet[êe]ncia cont[áa]bil)\b/i,
  ],
  ti: [
    /\b(ERP|Sped|NF-?e|EFD|CT-?e)\b/i,
    /\b(banco de dados|API|webhook|automa[çc][ãa]o sist[êe]mica)\b/i,
    /\b(infraestrutura de TI|integra[çc][ãa]o sist[êe]mica)\b/i,
  ],
  fiscal: [
    /\b(IBS|CBS|Imposto Seletivo)\b/i,
    /\b(al[íi]quota|base de c[áa]lculo|cr[ée]dito tribut|apura[çc][ãa]o)\b/i,
    /\b(recolhimento|autua[çc][ãa]o|inscri[çc][ãa]o cadastral|retenc[ãa]o)\b/i,
    /\b(partilha|interestadual|regime especial|al[íi]quota zero)\b/i,
  ],
  legal: [
    /\b(parecer|conten[çc]ioso|litig[ií]o|processo administrativo)\b/i,
    /\b(interpreta[çc][ãa]o|jurisprud[êe]ncia|entendimento)\b/i,
    /\b(benef[íi]cio fiscal|isen[çc][ãa]o|imunidade)\b/i,
    /\b(Art\.\s*\d+|LC\s*\d+|Lei Complementar|Decreto)\b/i,
  ],
  gestao: [
    /\b(fluxo de caixa|estrat[ée]gi|competitividade|margem)\b/i,
    /\b(stakeholder|diretoria|governan[çc]a corporativa|rentabilidade)\b/i,
    /\b(impacto financeiro|or[çc]amento|invest(?:imento|ir))\b/i,
  ],
};

// Ordem de classificação — mais específico primeiro.
// Contabilidade + TI antes de Fiscal para evitar que "segregação contábil IBS/CBS"
// seja classificado como fiscal por conta do "IBS/CBS".
const CLASSIFY_ORDER: Array<Exclude<BriefingArea, "generico">> = [
  "contabilidade",
  "ti",
  "fiscal",
  "legal",
  "gestao",
];

export function classifyItemByArea(texto: string): BriefingArea {
  if (!texto) return "generico";
  for (const area of CLASSIFY_ORDER) {
    if (PATTERNS[area].some((p) => p.test(texto))) return area;
  }
  return "generico";
}

// ─── Tipagem mínima (espelha BriefingStructuredSchema) ──────────────────────

export interface BriefingLite {
  nivel_risco_geral?: string;
  resumo_executivo?: string;
  principais_gaps?: Array<{
    gap?: string;
    causa_raiz?: string;
    evidencia_regulatoria?: string;
    urgencia?: string;
  }>;
  oportunidades?: string[];
  recomendacoes_prioritarias?: string[];
  inconsistencias?: Array<{
    pergunta_origem?: string;
    contradicao_detectada?: string;
    impacto?: string;
  }>;
  confidence_score?: {
    nivel_confianca?: number;
    limitacoes?: string[];
    recomendacao?: string;
  };
}

export interface AreaBucket {
  gaps: NonNullable<BriefingLite["principais_gaps"]>;
  oportunidades: string[];
  recomendacoes: string[];
  inconsistencias: NonNullable<BriefingLite["inconsistencias"]>;
}

function emptyBucket(): AreaBucket {
  return { gaps: [], oportunidades: [], recomendacoes: [], inconsistencias: [] };
}

export function groupBriefingByArea(
  structured: BriefingLite | null | undefined
): Record<BriefingArea, AreaBucket> {
  const buckets: Record<BriefingArea, AreaBucket> = {
    generico:      emptyBucket(),
    fiscal:        emptyBucket(),
    ti:            emptyBucket(),
    contabilidade: emptyBucket(),
    legal:         emptyBucket(),
    gestao:        emptyBucket(),
  };

  if (!structured) return buckets;

  (structured.principais_gaps ?? []).forEach((g) => {
    const text = `${g.gap ?? ""} ${g.causa_raiz ?? ""} ${g.evidencia_regulatoria ?? ""}`;
    const area = classifyItemByArea(text);
    buckets[area].gaps.push(g);
  });

  (structured.oportunidades ?? []).forEach((o) => {
    buckets[classifyItemByArea(o)].oportunidades.push(o);
  });

  (structured.recomendacoes_prioritarias ?? []).forEach((r) => {
    buckets[classifyItemByArea(r)].recomendacoes.push(r);
  });

  (structured.inconsistencias ?? []).forEach((inc) => {
    const text = `${inc.pergunta_origem ?? ""} ${inc.contradicao_detectada ?? ""}`;
    buckets[classifyItemByArea(text)].inconsistencias.push(inc);
  });

  return buckets;
}

// ─── Formatador WhatsApp-friendly ────────────────────────────────────────────

export interface FormatOptions {
  projectName: string;
  area: BriefingArea;
  bucket: AreaBucket;
  structured: BriefingLite;
}

export function formatWhatsAppSummary(opts: FormatOptions): string {
  const { projectName, area, bucket, structured } = opts;
  const meta = AREA_META[area];
  const lines: string[] = [];

  lines.push(`🏢 *IA SOLARIS — Resumo ${meta.label}*`);
  lines.push(`${meta.emoji} *Projeto:* ${projectName}`);

  // Risco geral (sempre no cabeçalho — orientador)
  const nivelRisco = structured.nivel_risco_geral ?? "não informado";
  const confianca = structured.confidence_score?.nivel_confianca;
  const confLabel = typeof confianca === "number" ? ` (${confianca}% confiança)` : "";
  const riscoEmoji = nivelRisco === "critico" ? "🔴" : nivelRisco === "alto" ? "🟠" : nivelRisco === "medio" ? "🟡" : "🟢";
  lines.push(`${riscoEmoji} *Risco Geral:* ${capitalize(nivelRisco)}${confLabel}`);
  lines.push("");

  // Resumo executivo (só no Genérico)
  if (area === "generico" && structured.resumo_executivo) {
    lines.push(`📝 *Resumo Executivo:*`);
    lines.push(structured.resumo_executivo);
    lines.push("");
  }

  // Gaps
  if (bucket.gaps.length > 0) {
    lines.push(`📌 *${bucket.gaps.length} Gap${bucket.gaps.length !== 1 ? "s" : ""} de ${meta.label}:*`);
    bucket.gaps.forEach((g, i) => {
      lines.push(`${i + 1}. ${g.gap ?? "(sem descrição)"}`);
      if (g.evidencia_regulatoria) {
        const urg = g.urgencia ? ` · Urgência: ${g.urgencia}` : "";
        lines.push(`   📖 ${g.evidencia_regulatoria}${urg}`);
      }
    });
    lines.push("");
  }

  // Recomendações
  if (bucket.recomendacoes.length > 0) {
    lines.push(`✅ *Recomendações de ${meta.label}:*`);
    bucket.recomendacoes.forEach((r) => lines.push(`• ${r}`));
    lines.push("");
  }

  // Oportunidades
  if (bucket.oportunidades.length > 0) {
    lines.push(`💡 *Oportunidades:*`);
    bucket.oportunidades.forEach((o) => lines.push(`• ${o}`));
    lines.push("");
  }

  // Inconsistências (só menciona contagem, não detalhe — detalhe vai no genérico)
  if (bucket.inconsistencias.length > 0) {
    lines.push(`⚠️ *${bucket.inconsistencias.length} Inconsistência${bucket.inconsistencias.length !== 1 ? "s" : ""} detectada${bucket.inconsistencias.length !== 1 ? "s" : ""}.*`);
    lines.push("");
  }

  // Vazio
  if (
    bucket.gaps.length === 0 &&
    bucket.recomendacoes.length === 0 &&
    bucket.oportunidades.length === 0 &&
    bucket.inconsistencias.length === 0 &&
    area !== "generico"
  ) {
    lines.push(`ℹ️ _Nenhum item específico de ${meta.label} identificado neste diagnóstico._`);
    lines.push("");
  }

  // Limitações (só no Genérico)
  if (area === "generico" && structured.confidence_score?.limitacoes && structured.confidence_score.limitacoes.length > 0) {
    lines.push(`⚠️ *Limitações do diagnóstico:*`);
    structured.confidence_score.limitacoes.forEach((l) => lines.push(`• ${l}`));
    lines.push("");
  }

  lines.push(`_Gerado automaticamente pela IA SOLARIS. Revisão humana recomendada._`);

  return lines.join("\n").trim();
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
