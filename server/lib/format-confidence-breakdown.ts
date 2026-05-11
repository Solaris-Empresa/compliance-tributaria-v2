/**
 * format-confidence-breakdown.ts — Issue #1048
 *
 * Formata o "detalhe" exibido em cada pilar da seção "Como calculamos a
 * Confiança" do briefing. Função pura — extraída de routers-fluxo-v3.ts
 * para teste isolado.
 *
 * Spec do P.O. (2026-05-09 / Issue #1048):
 *   Fórmula correta: completude = ratioCadastro × 0.3 + ratioRespostas × 0.7
 *   Caso #5040001:   1.0 × 0.3 + 0.0 × 0.7 = 0.30 → 30% é correto.
 *
 *   Problema: label "30% (2/2 NCM)" confunde — parece sugerir completude total
 *   enquanto o pilar contribui apenas 3,0 (de 10 possíveis).
 *
 *   Fix UX: quando há cadastrados mas nenhuma pergunta gerada
 *   (corpus_gap_setorial), o detalhe explica o motivo em vez de exibir
 *   só o contador.
 */

import type { ConfiancaBreakdownPilar } from "./calculate-briefing-confidence";

/**
 * Formata o "detalhe" de um pilar Q3 Produtos (NCM) ou Q3 Serviços (NBS)
 * para exibição no breakdown da confiança.
 *
 * Cenários:
 *   1. Sem cadastro (cadastrados=0)
 *      → "sem NCM cadastrado"
 *
 *   2. Cadastrado + sem perguntas geradas (corpus_gap_setorial)
 *      Quando p.total == null/0 e d.cadastrados > 0, significa que o RAG
 *      não retornou chunks com artigos setoriais aplicáveis (≥98% de
 *      confiança) para esses NCMs/NBSs. Exibir explicação.
 *      → "2/2 NCM cadastrados — corpus regulatório sem artigos setoriais
 *         aplicáveis para esses NCMs"
 *
 *   3. Cadastrado + perguntas geradas (caso normal)
 *      → "3/5 NCM · 7/10 perguntas"
 *
 *   4. Sem detalhe disponível (fallback)
 *      → "X/Y perguntas" OU "sem resposta"
 */
export function formatQ3PilarDetalhe(
  pilar: ConfiancaBreakdownPilar,
  codeLabel: "NCM" | "NBS",
): string {
  const d = pilar.detalhe;

  if (d && (d.cadastrados ?? 0) === 0) {
    return `sem ${codeLabel} cadastrado`;
  }

  if (d) {
    // Issue #1048: detectar corpus_gap_setorial pela ausência de perguntas
    // mesmo com cadastros presentes.
    const semPerguntas = pilar.total == null || pilar.total === 0;
    if (semPerguntas) {
      return `${d.comClassificacao ?? 0}/${d.cadastrados ?? 0} ${codeLabel} cadastrados — corpus regulatório sem artigos setoriais aplicáveis para esses ${codeLabel}s`;
    }
    return `${d.comClassificacao ?? 0}/${d.cadastrados ?? 0} ${codeLabel} · ${pilar.respostas}/${pilar.total} perguntas`;
  }

  // Fallback: sem detalhe estruturado
  return pilar.total != null
    ? `${pilar.respostas}/${pilar.total} perguntas`
    : "sem resposta";
}
