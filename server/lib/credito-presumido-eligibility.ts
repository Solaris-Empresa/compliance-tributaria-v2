/**
 * credito-presumido-eligibility.ts — FEAT-SCOPE-02 (#1201)
 *
 * Gate de elegibilidade do credito_presumido (Art. 168 LC 214/2025 — produtor rural).
 * ADR-FEAT-SCOPE-02 (#1195). Consumido por consolidateRisks (skip da oportunidade).
 *
 * Critério legal (Art. 168 caput + Art. 164):
 *   - regime regular (NÃO Simples Nacional — guardrail Art. 41 §1º / Art. 168 §9º)
 *   - adquire de produtor rural / integrado não contribuinte → confirmado por questionário
 *     (perguntas SOL-050/051/052, risk_category_code='credito_presumido', criadas em #1198)
 *
 * NÃO usa CNAE (Art. 168 não restringe por CNAE) nem regex em texto livre (Lição #61).
 * Conservador: resposta ausente/negativa → não elegível (benefício não presumido).
 *
 * Arquitetura (Lição #65): função pura testável + orquestrador (lê gate codigos + respostas).
 */
import { getOnda1Answers } from "../db";
import { getCreditoPresumidoGateCodigos } from "./db-queries-credito-presumido";

export interface CreditoPresumidoEligibility {
  eligible: boolean;
  reason: string | null;
}

/**
 * FEAT-SOL-UX-01 PR-B2 (30/05/2026): coerção dual-column conservadora.
 *
 * Prioriza a coluna estruturada `resposta_opcao` (UX nova com radio).
 * Fallback para `resposta` (text — histórico texto-livre).
 *
 * Regra (conservadora — Lição #66 / Lição #67):
 *   - `respostaOpcao === 'sim'`            → "sim"  (caminho positivo)
 *   - `respostaOpcao === 'nao'`            → "nao"  (negativa explícita)
 *   - `respostaOpcao === 'nao_sei'`        → "nao"  (conservador — equivale a negar)
 *   - `respostaOpcao === 'nao_se_aplica'`  → "na"   (a função pura só aceita startsWith("sim"))
 *   - `respostaOpcao` ausente              → usa `resposta` (texto livre) inalterada
 *
 * Mantém a função pura `evaluateCreditoPresumidoEligibility` intocada — a coerção
 * acontece no orquestrador (única função que toca o DB).
 */
export function coerceOnda1AnswerToGateText(a: {
  resposta?: string | null;
  respostaOpcao?: "sim" | "nao" | "nao_sei" | "nao_se_aplica" | null;
}): string {
  const opcao = a.respostaOpcao ?? null;
  if (opcao === "sim") return "sim";
  if (opcao === "nao" || opcao === "nao_sei") return "nao";
  if (opcao === "nao_se_aplica") return "na";
  // Fallback histórico — texto livre preservado.
  return a.resposta ?? "";
}

/**
 * FUNÇÃO PURA — decide a elegibilidade a partir dos codigos-gate, das respostas
 * (map codigo→resposta) e do regime. Sem DB, sem CNAE, sem LIKE.
 */
export function evaluateCreditoPresumidoEligibility(
  gateCodigos: string[],
  answersByCodigo: Map<string, string>,
  regime: string | null | undefined,
): CreditoPresumidoEligibility {
  // Guardrail — Simples Nacional excluído (Art. 41 §1º / Art. 168 §9º)
  if (regime === "simples_nacional") {
    return { eligible: false, reason: "simples_nacional" };
  }
  // Sem perguntas-gate configuradas → conservador (não presumir benefício)
  if (!gateCodigos.length) {
    return { eligible: false, reason: "sem_gate_questions" };
  }
  // Todas as perguntas-gate devem ser respondidas afirmativamente ("sim")
  for (const codigo of gateCodigos) {
    const r = answersByCodigo.get(codigo)?.trim().toLowerCase();
    if (!r) return { eligible: false, reason: `${codigo}_nao_respondida` };
    if (!r.startsWith("sim")) return { eligible: false, reason: `${codigo}_negativa` };
  }
  return { eligible: true, reason: null };
}

/**
 * Orquestrador — lê os codigos-gate (cache) + as respostas Onda 1 (por projectId)
 * e aplica a função pura. Consumido por consolidateRisks.
 */
export async function isCreditoPresumidoArt168Eligible(
  projectId: number,
  regime?: string | null,
): Promise<CreditoPresumidoEligibility> {
  const gateCodigos = await getCreditoPresumidoGateCodigos();
  const answers = await getOnda1Answers(projectId);
  const map = new Map<string, string>();
  // FEAT-SOL-UX-01 PR-B2: usa coerção dual-column — prioriza resposta_opcao (UX nova),
  // mantém resposta texto-livre como fallback histórico.
  for (const a of answers as Array<{
    codigo?: string | null;
    resposta?: string | null;
    respostaOpcao?: "sim" | "nao" | "nao_sei" | "nao_se_aplica" | null;
  }>) {
    if (a.codigo) {
      map.set(
        a.codigo,
        coerceOnda1AnswerToGateText({
          resposta: a.resposta,
          respostaOpcao: a.respostaOpcao,
        }),
      );
    }
  }
  return evaluateCreditoPresumidoEligibility(gateCodigos, map, regime);
}

/**
 * P2-B (#1203): filtra gaps de credito_presumido quando o perfil NÃO é elegível.
 * Usado pelo briefingEngine (BriefingEngineView), que lê project_gaps_v3 direto —
 * caminho determinístico que NÃO passa pelo gate do consolidateRisks. Função pura.
 *   eligible=true  → mantém todos os gaps
 *   eligible=false → remove os gaps com risk_category_code='credito_presumido'
 */
export function filterCreditoPresumidoGaps<
  T extends { risk_category_code?: string | null },
>(gaps: T[], eligible: boolean): T[] {
  if (eligible) return gaps;
  return gaps.filter((g) => g.risk_category_code !== "credito_presumido");
}

/**
 * BUG-BRIEFING (#1202): restrição IMPERATIVA injetada no prompt do briefing LLM
 * (fluxoV3.generateBriefing) quando o perfil NÃO é elegível ao credito presumido do
 * Art. 168. Mesmo padrão de buildArt127PromptRestriction (#1194). Determinístico.
 *   eligible=true  → "" · eligible=false → bloco imperativo
 */
export function buildCreditoPresumidoRestriction(eligible: boolean): string {
  if (eligible) return "";
  return (
    "\nRESTRIÇÃO NORMATIVA OBRIGATÓRIA: O crédito presumido de produtor rural " +
    "(Art. 168 da LC 214/2025 e Arts. 245-249 do Decreto 12.955/2026) NÃO se aplica " +
    "ao perfil analisado (não confirmou aquisição de produtor rural não contribuinte, " +
    "ou é optante pelo Simples Nacional). NÃO mencione, NÃO sugira e NÃO gere gap nem " +
    "oportunidade relacionada a esse crédito presumido. Isto é determinístico.\n"
  );
}
