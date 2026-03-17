/**
 * Testes unitários para RF-2.07 UX: Badge "Revisado" no stepper de CNAEs
 *
 * Comportamento esperado:
 * - `revisado: true` é marcado quando o usuário confirma retorno a um CNAE concluído
 * - `revisado: false` é restaurado quando o usuário re-conclui o CNAE (handleFinishLevel1)
 * - O badge "Revisado" é exibido apenas quando `revisado === true && nivel1Done === true`
 * - CNAEs não concluídos nunca recebem `revisado: true`
 */

import { describe, it, expect } from "vitest";

// ─── Tipos espelhando o componente ────────────────────────────────────────────

interface CnaeProgress {
  code: string;
  description: string;
  nivel1Done: boolean;
  nivel2Done: boolean;
  skippedNivel2: boolean;
  revisado: boolean;
  answers: { question: string; answer: string }[];
  nivel2Answers: { question: string; answer: string }[];
}

// ─── Funções de lógica pura (extraídas do componente) ─────────────────────────

function initCnaeProgress(cnaes: { code: string; description: string }[]): CnaeProgress[] {
  return cnaes.map(c => ({
    code: c.code,
    description: c.description,
    nivel1Done: false,
    nivel2Done: false,
    skippedNivel2: false,
    revisado: false,
    answers: [],
    nivel2Answers: [],
  }));
}

function markRevisado(progress: CnaeProgress[], targetIdx: number): CnaeProgress[] {
  return progress.map((c, i) =>
    i === targetIdx && c.nivel1Done ? { ...c, revisado: true } : c
  );
}

function finishLevel1(
  progress: CnaeProgress[],
  currentIdx: number,
  newAnswers: { question: string; answer: string }[]
): CnaeProgress[] {
  return progress.map((c, i) =>
    i === currentIdx ? { ...c, nivel1Done: true, revisado: false, answers: newAnswers } : c
  );
}

function shouldShowBadge(cnae: CnaeProgress): boolean {
  return cnae.revisado === true && cnae.nivel1Done === true;
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("RF-2.07 UX: Badge 'Revisado' no stepper de CNAEs", () => {
  const cnaes = [
    { code: "4781-4/00", description: "Comércio varejista de vestuário" },
    { code: "4782-2/01", description: "Comércio varejista de calçados" },
    { code: "4783-1/00", description: "Comércio varejista de bijuterias" },
  ];

  it("deve inicializar todos os CNAEs com revisado=false", () => {
    const progress = initCnaeProgress(cnaes);
    expect(progress.every(c => c.revisado === false)).toBe(true);
  });

  it("deve marcar revisado=true ao confirmar retorno ao CNAE concluído", () => {
    let progress = initCnaeProgress(cnaes);
    // Simular conclusão do primeiro CNAE
    progress = finishLevel1(progress, 0, [{ question: "Q1", answer: "Sim" }]);
    expect(progress[0].nivel1Done).toBe(true);
    expect(progress[0].revisado).toBe(false);

    // Simular retorno confirmado ao CNAE 0 (a partir do CNAE 1)
    progress = markRevisado(progress, 0);
    expect(progress[0].revisado).toBe(true);
    expect(progress[1].revisado).toBe(false); // outros não afetados
    expect(progress[2].revisado).toBe(false);
  });

  it("NÃO deve marcar revisado=true em CNAE que ainda não foi concluído", () => {
    let progress = initCnaeProgress(cnaes);
    // Tentar marcar revisado em CNAE não concluído (nivel1Done=false)
    progress = markRevisado(progress, 0);
    expect(progress[0].revisado).toBe(false); // não marcado pois nivel1Done=false
  });

  it("deve limpar revisado=false ao re-concluir o CNAE (handleFinishLevel1)", () => {
    let progress = initCnaeProgress(cnaes);
    // Concluir e marcar como revisado
    progress = finishLevel1(progress, 0, [{ question: "Q1", answer: "Sim" }]);
    progress = markRevisado(progress, 0);
    expect(progress[0].revisado).toBe(true);

    // Re-concluir o CNAE (usuário respondeu novamente)
    progress = finishLevel1(progress, 0, [{ question: "Q1", answer: "Não" }]);
    expect(progress[0].revisado).toBe(false); // limpo após re-conclusão
    expect(progress[0].nivel1Done).toBe(true); // ainda concluído
    expect(progress[0].answers[0].answer).toBe("Não"); // respostas atualizadas
  });

  it("deve exibir badge apenas quando revisado=true E nivel1Done=true", () => {
    const cnaeNaoConcluido: CnaeProgress = {
      code: "4781-4/00", description: "...", nivel1Done: false,
      nivel2Done: false, skippedNivel2: false, revisado: true,
      answers: [], nivel2Answers: [],
    };
    const cnaeConcluido: CnaeProgress = {
      code: "4782-2/01", description: "...", nivel1Done: true,
      nivel2Done: false, skippedNivel2: false, revisado: false,
      answers: [], nivel2Answers: [],
    };
    const cnaeRevisado: CnaeProgress = {
      code: "4783-1/00", description: "...", nivel1Done: true,
      nivel2Done: false, skippedNivel2: false, revisado: true,
      answers: [], nivel2Answers: [],
    };

    expect(shouldShowBadge(cnaeNaoConcluido)).toBe(false); // nivel1Done=false
    expect(shouldShowBadge(cnaeConcluido)).toBe(false);    // revisado=false
    expect(shouldShowBadge(cnaeRevisado)).toBe(true);      // ambos true
  });

  it("deve funcionar corretamente com múltiplos CNAEs revisados", () => {
    let progress = initCnaeProgress(cnaes);
    // Concluir todos os CNAEs
    progress = finishLevel1(progress, 0, []);
    progress = finishLevel1(progress, 1, []);
    progress = finishLevel1(progress, 2, []);

    // Marcar dois como revisados
    progress = markRevisado(progress, 0);
    progress = markRevisado(progress, 2);

    expect(progress[0].revisado).toBe(true);
    expect(progress[1].revisado).toBe(false);
    expect(progress[2].revisado).toBe(true);

    const badges = progress.filter(c => shouldShowBadge(c));
    expect(badges).toHaveLength(2);
    expect(badges.map(b => b.code)).toEqual(["4781-4/00", "4783-1/00"]);
  });

  it("deve preservar o estado revisado dos outros CNAEs ao re-concluir um", () => {
    let progress = initCnaeProgress(cnaes);
    progress = finishLevel1(progress, 0, []);
    progress = finishLevel1(progress, 1, []);
    progress = markRevisado(progress, 0);
    progress = markRevisado(progress, 1);

    // Re-concluir apenas o CNAE 0
    progress = finishLevel1(progress, 0, [{ question: "Q1", answer: "Sim" }]);

    expect(progress[0].revisado).toBe(false); // limpo
    expect(progress[1].revisado).toBe(true);  // preservado
  });

  it("deve manter o código e descrição do CNAE ao marcar revisado", () => {
    let progress = initCnaeProgress(cnaes);
    progress = finishLevel1(progress, 0, []);
    progress = markRevisado(progress, 0);

    expect(progress[0].code).toBe("4781-4/00");
    expect(progress[0].description).toBe("Comércio varejista de vestuário");
  });

  it("deve preservar as respostas anteriores ao marcar revisado", () => {
    let progress = initCnaeProgress(cnaes);
    const originalAnswers = [{ question: "Q1", answer: "Sim" }, { question: "Q2", answer: "Não" }];
    progress = finishLevel1(progress, 0, originalAnswers);
    progress = markRevisado(progress, 0);

    // As respostas originais devem ser preservadas ao marcar revisado
    expect(progress[0].answers).toHaveLength(2);
    expect(progress[0].answers[0].answer).toBe("Sim");
    expect(progress[0].answers[1].answer).toBe("Não");
  });
});
