/**
 * aliquota-zero-agro-eligibility.ts — GATE-NCM-NBS #1439b
 *
 * Gate de elegibilidade da oportunidade `aliquota_zero_bens_capital_agro`
 * (Art. 110 LC 214/2025 c/c Art. 197 Decreto 12.955/2026 — alíquota zero IBS/CBS
 * em bens de capital agrícolas). Consumido por consolidateRisks.
 *
 * Critério legal (curadoria Dr. José #1439a):
 *   - produto elegível (Tabela II Anexo IV) → SOL-058 = "sim"
 *   - destinatário = produtor rural NÃO CONTRIBUINTE do IBS/CBS → SOL-059 = "sim"
 *
 * Diferente do credito_presumido (que SKIPA quando não elegível): aqui a oportunidade
 * é MANTIDA e a confiança é ajustada — confirmado → high; não confirmado/ausente →
 * medium + nota (oportunidade condicional). Sem skip = não esconde benefício potencial.
 *
 * NÃO usa CNAE (a matriz resolve por NCM 8436; o gate é o destinatário, Art. 110).
 * NÃO usa regime do vendedor (a condição é do destinatário, não do contribuinte vendedor).
 * NÃO usa regex em texto livre (Lição #61). Conservador: ausente/negativa → não confirmado.
 *
 * Arquitetura (Lição #65): função pura testável + orquestrador (lê gate codigos + respostas).
 * Mirror de credito-presumido-eligibility.ts (reusa coerceOnda1AnswerToGateText).
 */
import { getOnda1Answers } from "../db";
import { coerceOnda1AnswerToGateText } from "./credito-presumido-eligibility";
import { getAliquotaZeroAgroGateCodigos } from "./db-queries-aliquota-zero-agro";

export interface AliquotaZeroAgroEligibility {
  eligible: boolean;
  reason: string | null;
}

/**
 * #1439b — confiança do gate Art. 110/197. Sem banda codificada no engine → valores
 * explícitos high/medium. PLACEHOLDER calibrável formalmente em #1440 (não inventado:
 * documentados + atrelados à issue de calibração; mesmo padrão dos CONFIDENCE_* do
 * resolver #1219 F2). Mantidos aqui (junto da lógica do gate) e não no engine.
 */
export const CONFIDENCE_AGRO_CONFIRMED = 0.95; // SOL-058 + SOL-059 = "sim" → oportunidade confirmada
export const CONFIDENCE_AGRO_PENDENTE = 0.5; // qualquer "não"/ausente → oportunidade condicional + nota

/**
 * FUNÇÃO PURA — decide a elegibilidade a partir dos codigos-gate e do map codigo→resposta.
 * Sem DB, sem CNAE, sem regime, sem LIKE. Todas as perguntas-gate devem ser "sim".
 */
export function evaluateAliquotaZeroAgroEligibility(
  gateCodigos: string[],
  answersByCodigo: Map<string, string>,
): AliquotaZeroAgroEligibility {
  // Sem perguntas-gate configuradas → conservador (oportunidade condicional, não confirmada).
  if (!gateCodigos.length) {
    return { eligible: false, reason: "sem_gate_questions" };
  }
  for (const codigo of gateCodigos) {
    const r = answersByCodigo.get(codigo)?.trim().toLowerCase();
    if (!r) return { eligible: false, reason: `${codigo}_nao_respondida` };
    if (!r.startsWith("sim")) return { eligible: false, reason: `${codigo}_negativa` };
  }
  return { eligible: true, reason: null };
}

/**
 * FUNÇÃO PURA — mapeia elegibilidade → confiança (high/medium) + nota condicional.
 * Centraliza o DoD negativo (Lição #124): a variável-do-gate (destinatário SOL-059)
 * flipa a banda de confiança. Testável sem DB.
 */
export function resolveAgroConfidence(
  elig: AliquotaZeroAgroEligibility,
): { confidence: number; note?: string } {
  if (elig.eligible) return { confidence: CONFIDENCE_AGRO_CONFIRMED };
  return { confidence: CONFIDENCE_AGRO_PENDENTE, note: buildAliquotaZeroAgroNote(elig.reason) };
}

/**
 * Nota exibida quando o destinatário (produtor rural não contribuinte) não foi confirmado.
 * Mantém a oportunidade visível como CONDICIONAL — não a remove (≠ credito_presumido).
 */
export function buildAliquotaZeroAgroNote(_reason: string | null): string {
  return (
    "Oportunidade condicional: a alíquota zero de IBS/CBS em bens de capital agrícolas " +
    "(Art. 110 da LC 214/2025 c/c Art. 197 do Decreto 12.955/2026) depende de o destinatário " +
    "ser produtor rural não contribuinte do IBS/CBS. Confirmação pendente no questionário " +
    "(SOL-058 — produto; SOL-059 — destinatário). Confirme a condição do destinatário para validar o benefício."
  );
}

/**
 * Orquestrador — lê os codigos-gate (cache) + as respostas Onda 1 (por projectId)
 * e aplica a função pura. Consumido por consolidateRisks. Reusa a coerção dual-column
 * (resposta_opcao prioritária, fallback texto livre) do credito_presumido.
 */
export async function isAliquotaZeroBensCapitalAgroEligible(
  projectId: number,
): Promise<AliquotaZeroAgroEligibility> {
  const gateCodigos = await getAliquotaZeroAgroGateCodigos();
  const answers = await getOnda1Answers(projectId);
  const map = new Map<string, string>();
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
  return evaluateAliquotaZeroAgroEligibility(gateCodigos, map);
}
