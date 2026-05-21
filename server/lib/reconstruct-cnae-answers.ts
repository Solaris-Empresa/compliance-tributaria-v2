/**
 * reconstruct-cnae-answers.ts — BUG-Q1-V3 (Sprint BUG-FIX 20/05/2026)
 *
 * Reconstrói o campo agregado `projects.cnaeAnswers` a partir das rows
 * granulares de `questionnaireAnswersV3` (source of truth no banco).
 *
 * Motivação: 2 PRs frontend (#1135 + #1140) falharam ao montar o payload
 * de cnaeAnswers — closure stale do React state + refetch não-confiável.
 * O backend tem acesso síncrono e determinístico à tabela granular.
 * Decisão P.O. 2026-05-21: persistência de cnaeAnswers é responsabilidade
 * do backend, não do frontend (que envia apenas flags).
 *
 * Função PURA — sem I/O, testável isoladamente (DoD: mock N rows → answers.length === N).
 */

export interface QAnswerRow {
  cnaeCode: string;
  cnaeDescription?: string | null;
  level: string; // "nivel1" | "nivel2"
  questionText: string;
  answerValue: string;
}

export interface CnaeFlag {
  skipped: boolean;
}

export interface CnaeAnswerEntry {
  description: string;
  answers: Array<{ question: string; answer: string }>;
  nivel2Answers: Array<{ question: string; answer: string }>;
  nivel1Done: boolean;
  nivel2Done: boolean;
  skipped: boolean;
}

/**
 * Reconstrói cnaeAnswers por CNAE.
 *
 * @param rows           Rows de questionnaireAnswersV3 (todas do projeto)
 * @param confirmedCnaes CNAEs confirmados do projeto (para description + garantir presença)
 * @param flags          Flags por CNAE vindas do frontend (skipped)
 * @returns              Mapa { [cnaeCode]: CnaeAnswerEntry }
 *
 * Regras:
 *   - answers/nivel2Answers vêm SEMPRE das rows (banco), nunca do frontend
 *   - nivel1Done = há respostas nivel1 OU CNAE foi explicitamente skipped
 *   - description: prioriza confirmedCnaes; fallback para cnaeDescription das rows
 *   - Lista de CNAEs = união de (confirmedCnaes + rows + flags) para robustez
 */
export function reconstructCnaeAnswers(
  rows: ReadonlyArray<QAnswerRow>,
  confirmedCnaes: ReadonlyArray<{ code?: string; description?: string }>,
  flags: Record<string, CnaeFlag>,
): Record<string, CnaeAnswerEntry> {
  const allCodes = new Set<string>([
    ...confirmedCnaes.map((c) => c.code).filter((x): x is string => !!x),
    ...rows.map((r) => r.cnaeCode),
    ...Object.keys(flags),
  ]);

  const descByCode = new Map<string, string>();
  for (const c of confirmedCnaes) {
    if (c.code) descByCode.set(c.code, c.description ?? "");
  }
  for (const r of rows) {
    if (!descByCode.has(r.cnaeCode) && r.cnaeDescription) {
      descByCode.set(r.cnaeCode, r.cnaeDescription);
    }
  }

  const result: Record<string, CnaeAnswerEntry> = {};
  for (const code of allCodes) {
    const n1 = rows.filter((r) => r.cnaeCode === code && r.level === "nivel1");
    const n2 = rows.filter((r) => r.cnaeCode === code && r.level === "nivel2");
    const skipped = flags[code]?.skipped ?? false;
    result[code] = {
      description: descByCode.get(code) ?? "",
      answers: n1.map((r) => ({ question: r.questionText, answer: r.answerValue })),
      nivel2Answers: n2.map((r) => ({ question: r.questionText, answer: r.answerValue })),
      nivel1Done: n1.length > 0 || skipped, // derivado de FATO
      nivel2Done: n2.length > 0,
      skipped,
    };
  }
  return result;
}
