/**
 * briefingPdfStructured.ts — PDF-1 (Issue PDF-1, decisão P.O. híbrida 12/06/2026)
 *
 * Monta o corpo HTML do PDF de Briefing exportado via window.print().
 *
 * Abordagem HÍBRIDA (espelha o Split View na tela):
 *   - mode "split-view" → seções structured (resumo, completude, gaps, oportunidades,
 *     recomendações, ações) a partir de `briefingStructured` (mesmo dado dos cards)
 *     + seção "Metodologia" a partir do markdown legado (mesmo dado do MethodSection).
 *   - mode "legacy" / structured null → markdown legado puro (comportamento pré-fix,
 *     SEM regressão).
 *
 * Princípios:
 *   - Labels de fonte via SOURCE_TYPE_LABELS (@shared — NÃO recriar). PDF-3.
 *   - source_reference já vem sem o prefixo "Aplicação obrigatória: " (strip no adapter). PDF-2.
 *   - Texto vindo do LLM é escapado (esc) — structured path. O markdown legado mantém
 *     a conversão inline original verbatim (markdownToHtml) para paridade exata.
 *   - Funções puras → testáveis isoladamente (briefingPdfStructured.test.ts).
 */
import { SOURCE_TYPE_LABELS } from "@shared/source-type-labels";
import type { BriefingStructuredData } from "@/lib/briefingAdapter";

/** Escapa caracteres HTML para texto vindo do LLM (structured path). */
export function esc(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * markdownToHtml — conversão markdown→HTML do briefing legado.
 *
 * Extraído VERBATIM do antigo inline em BriefingV3.handleExportPDF para preservar
 * exatamente o output do PDF legado (CT-2 / zero regressão).
 */
export function markdownToHtml(content: string): string {
  return content
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n/g, "</p><p>")
    .split("\n")
    .map((line) => (line.startsWith("<") ? line : `<p>${line}</p>`))
    .join("\n");
}

const URGENCIA_LABEL: Record<string, string> = {
  imediata: "Imediata",
  curto_prazo: "Curto prazo",
  medio_prazo: "Médio prazo",
};

const PRAZO_LABEL: Record<string, string> = {
  imediato: "Imediato",
  curto_prazo: "Curto prazo",
  medio_prazo: "Médio prazo",
};

const RISCO_LABEL: Record<string, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
  critico: "Crítico",
};

/**
 * buildStructuredSectionsHtml — seções structured do PDF (espelha os cards do Split View).
 *
 * Ordem mirando a tela: Resumo + Nível de risco → Completude (+ ressalva <85%) →
 * Recomendações prioritárias → Principais Gaps (com Fonte) → Oportunidades → Ações.
 */
export function buildStructuredSectionsHtml(data: BriefingStructuredData): string {
  const parts: string[] = [];

  // 1. Resumo executivo + nível de risco geral (DecisionPanel)
  parts.push("<h1>Resumo Executivo</h1>");
  parts.push(
    `<p><strong>Nível de risco geral:</strong> ${esc(
      RISCO_LABEL[data.nivel_risco_geral] ?? data.nivel_risco_geral
    )}</p>`
  );
  if (data.resumo_executivo.trim()) {
    parts.push(`<p>${esc(data.resumo_executivo)}</p>`);
  }

  // 2. Completude / confiança (+ badge orientativo <85%) — SPLIT-1
  const conf = data.confidence_score.nivel_confianca;
  parts.push("<h2>Completude do Diagnóstico</h2>");
  parts.push(`<p><strong>Completude:</strong> ${conf}%</p>`);
  if (conf < 85) {
    parts.push(
      `<div class="scope-block"><h2>Diagnóstico em construção</h2>` +
        `<p>Completude atual: <strong>${conf}%</strong> (mínimo para confiabilidade plena: 85%).</p>` +
        (data.confidence_score.limitacoes.length > 0
          ? `<ul>${data.confidence_score.limitacoes
              .map((l) => `<li>${esc(l)}</li>`)
              .join("")}</ul>`
          : "") +
        (data.confidence_score.recomendacao.trim()
          ? `<p>${esc(data.confidence_score.recomendacao)}</p>`
          : "") +
        `</div>`
    );
  }

  // 3. Recomendações prioritárias (PriorityCards)
  if (data.recomendacoes_prioritarias.length > 0) {
    parts.push("<h1>Recomendações Prioritárias</h1>");
    parts.push(
      `<ul>${data.recomendacoes_prioritarias
        .map((r) => `<li>${esc(r)}</li>`)
        .join("")}</ul>`
    );
  }

  // 4. Principais Gaps (GapCard) — com linha Fonte (label PDF-3 + reference PDF-2)
  parts.push(`<h1>Principais Gaps (${data.principais_gaps.length})</h1>`);
  if (data.principais_gaps.length === 0) {
    parts.push("<p>Nenhum gap identificado.</p>");
  }
  for (const gap of data.principais_gaps) {
    parts.push(`<h3>${esc(gap.gap)}</h3>`);
    if (gap.causa_raiz.trim()) {
      parts.push(`<p><strong>Causa raiz:</strong> ${esc(gap.causa_raiz)}</p>`);
    }
    if (gap.evidencia_regulatoria.trim()) {
      parts.push(
        `<p><strong>Evidência regulatória:</strong> ${esc(
          gap.evidencia_regulatoria
        )}</p>`
      );
    }
    parts.push(
      `<p><strong>Urgência:</strong> ${esc(
        URGENCIA_LABEL[gap.urgencia] ?? gap.urgencia
      )}</p>`
    );
    const fonteLabel = SOURCE_TYPE_LABELS[gap.source_type] ?? gap.source_type;
    const fonte = gap.source_reference
      ? `${esc(fonteLabel)} — ${esc(gap.source_reference)}`
      : esc(fonteLabel);
    parts.push(`<p><strong>Fonte:</strong> ${fonte}</p>`);
  }

  // 5. Oportunidades (OpportunityCard)
  if (data.oportunidades.length > 0) {
    parts.push(`<h1>Oportunidades (${data.oportunidades.length})</h1>`);
    parts.push(
      `<ul>${data.oportunidades.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>`
    );
  }

  // 6. Ações prioritárias (ActionsList — top_3_acoes)
  if (data.top_3_acoes.length > 0) {
    parts.push("<h1>Ações Prioritárias</h1>");
    for (const acao of data.top_3_acoes) {
      parts.push(`<h3>${esc(acao.acao)}</h3>`);
      if (acao.justificativa.trim()) {
        parts.push(`<p>${esc(acao.justificativa)}</p>`);
      }
      parts.push(
        `<p><strong>Prazo:</strong> ${esc(
          PRAZO_LABEL[acao.prazo] ?? acao.prazo
        )}</p>`
      );
    }
  }

  return parts.join("\n");
}

/**
 * buildBriefingPdfBody — corpo HTML do PDF (orquestrador híbrido).
 *
 * @param structured  dados structured quando Split View ativo; null → legado puro
 * @param markdown    briefing markdown (displayContent) — usado integral no legado,
 *                    e como seção "Metodologia" no híbrido (espelha MethodSection)
 */
export function buildBriefingPdfBody(params: {
  structured: BriefingStructuredData | null;
  markdown: string;
}): string {
  const { structured, markdown } = params;

  // Legado / sem structured → markdown puro (comportamento pré-fix, zero regressão).
  if (!structured) {
    return markdownToHtml(markdown);
  }

  // Híbrido → seções structured + Metodologia (markdown, se houver).
  const sections = buildStructuredSectionsHtml(structured);
  const methodology =
    markdown && markdown.trim()
      ? `<h1>Metodologia</h1>\n${markdownToHtml(markdown)}`
      : "";
  return methodology ? `${sections}\n${methodology}` : sections;
}
