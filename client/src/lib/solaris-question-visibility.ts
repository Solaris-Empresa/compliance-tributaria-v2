/**
 * solaris-question-visibility.ts — BUG-UX-01 (#1249)
 * ─────────────────────────────────────────────────────────────────────────────
 * Visibilidade condicional das perguntas-gate do crédito presumido
 * (Art. 168 LC 214/2025 — produtor rural).
 *
 * SOL-052 ("o produtor rural/integrado é não contribuinte do IBS/CBS?") só faz
 * sentido quando SOL-051 ("a empresa adquire de produtor rural?") = "Sim".
 * Quando SOL-051 ≠ "Sim", o gate de elegibilidade
 * (server/lib/credito-presumido-eligibility.ts:43-47) já retorna eligible=false
 * em SOL-051 (curto-circuito do loop), tornando SOL-052 irrelevante — então a
 * ocultamos da UI (progressive disclosure).
 *
 * Função PURA (Lição #65 — função testável + orquestrador no componente).
 * A semântica de "afirmativa" replica EXATAMENTE o gate consumidor
 * (eligibility.ts:46 → `resposta.trim().toLowerCase().startsWith("sim")`),
 * para que display e gate nunca divirjam.
 *
 * NÃO toca getOnda1Questions, schema, migrations nem o gate — apenas display.
 */

/**
 * Replica a semântica do gate: a resposta começa com "sim"
 * (case-insensitive, ignorando espaços e o prefixo "Sim. " da UI).
 */
export function answerIsAffirmative(answer: string | undefined | null): boolean {
  return !!answer && answer.trim().toLowerCase().startsWith("sim");
}

/** Forma mínima exigida por `computeVisibleSolarisQuestions`. */
export interface VisibilityQuestion {
  id: number;
  codigo: string;
}

/**
 * Filtra as perguntas visíveis aplicando a dependência condicional
 * SOL-052 → SOL-051 = "Sim".
 *
 * `answers` é o estado local do QuestionarioSolaris, chaveado por questionId
 * NUMÉRICO (não por codigo). Por isso resolvemos o id de SOL-051 via a lista.
 *
 * Conservador: se SOL-051 estiver ausente da lista, SOL-052 é ocultada
 * (não há como estabelecer a precondição → gate não presume benefício).
 */
export function computeVisibleSolarisQuestions<Q extends VisibilityQuestion>(
  questions: Q[],
  answers: Record<number, string>,
): Q[] {
  const sol051 = questions.find((q) => q.codigo === "SOL-051");
  const sol051Affirmative = sol051
    ? answerIsAffirmative(answers[sol051.id])
    : false;

  return questions.filter((q) => {
    // SOL-052 só é visível quando SOL-051 foi respondida afirmativamente.
    if (q.codigo === "SOL-052") return sol051Affirmative;
    // Todas as demais perguntas são sempre visíveis.
    return true;
  });
}

/**
 * Códigos das perguntas-gate do crédito presumido (Art. 168 LC 214/2025 —
 * produtor rural). Criadas na migration 0106 (#1197). Usado para agrupar
 * visualmente o bloco no questionário (UX-02 #1250).
 */
export const CREDITO_PRESUMIDO_GATE_CODIGOS = ["SOL-050", "SOL-051", "SOL-052"];

/** True se a pergunta pertence ao bloco-gate do crédito presumido. */
export function isCreditoPresumidoGateQuestion(
  codigo: string | undefined | null,
): boolean {
  return !!codigo && CREDITO_PRESUMIDO_GATE_CODIGOS.includes(codigo);
}
