/**
 * cnae-progress-reconciliation.ts — Issue #1066
 *
 * Reconcilia o array `cnaeProgress[i].answers` (state React do QuestionarioV3)
 * com as respostas persistidas em `questionnaireAnswersV3` (tabela granular).
 *
 * Causa raiz (caso #5400001):
 *   - `saveAnswer.mutate` grava respostas individuais em `questionnaireAnswersV3`
 *     a cada interação do usuário
 *   - `handleFinishLevel1` é o ÚNICO ponto que popula `cnaeProgress[i].answers`
 *   - Quando `hasGap=true` ou sequência é interrompida, `handleFinishLevel1`
 *     não é chamado → `cnaeProgress[i].answers = []` mesmo com respostas no banco
 *   - `handleFinishQuestionnaire` monta payload com `questions: []` → coluna
 *     JSON `projects.questionnaireAnswers` fica stale
 *
 * Fix: reconciliar antes de `advanceToNextCnae` — popular state local a partir
 * da tabela granular quando state estiver vazio/incompleto.
 *
 * Função pura — extraída para teste isolado.
 */

export interface SavedAnswerRow {
  cnaeCode: string;
  cnaeDescription?: string | null;
  level: string;
  questionText: string;
  answerValue: string;
}

export interface CnaeProgressAnswer {
  question: string;
  answer: string;
}

/**
 * Filtra respostas salvas para um CNAE/level específico e converte para
 * o formato `cnaeProgress[i].answers`.
 *
 * @param savedAnswers Linhas de `questionnaireAnswersV3` (todas do projeto)
 * @param cnaeCode CNAE alvo
 * @param level "nivel1" ou "nivel2"
 */
export function extractAnswersForCnae(
  savedAnswers: ReadonlyArray<SavedAnswerRow>,
  cnaeCode: string,
  level: "nivel1" | "nivel2" = "nivel1",
): CnaeProgressAnswer[] {
  if (!cnaeCode) return [];
  return savedAnswers
    .filter((a) => a.cnaeCode === cnaeCode && a.level === level)
    .map((a) => ({ question: a.questionText, answer: a.answerValue }));
}

/**
 * Decide se as respostas do CNAE devem ser sobrescritas no state React.
 *
 * Política idempotente: só sobrescreve quando `currentAnswers` está vazio
 * ou tem menos itens que `savedAnswers`. Preserva o caso normal onde
 * `handleFinishLevel1` já populou tudo.
 *
 * @param currentAnswers Estado atual em `cnaeProgress[i].answers`
 * @param savedAnswers Respostas da tabela granular para o mesmo CNAE
 * @returns `true` se reconciliação deve aplicar (currentAnswers tem menos)
 */
export function shouldReconcile(
  currentAnswers: ReadonlyArray<CnaeProgressAnswer>,
  savedAnswers: ReadonlyArray<CnaeProgressAnswer>,
): boolean {
  if (savedAnswers.length === 0) return false;
  return currentAnswers.length < savedAnswers.length;
}
