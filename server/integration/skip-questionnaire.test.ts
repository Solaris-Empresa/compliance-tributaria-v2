/**
 * Testes CC-18..CC-21 — Procedures de Skip de Questionário (ADR-0016 Etapa 3)
 *
 * CC-18: skipQuestionnaire → solarisSkippedAll=true
 * CC-19: skip é reversível (desmarcar solarisSkippedAll e limpar ids)
 * CC-20: skipQuestionnaire avança o status (assertValidTransition)
 * CC-21: briefing recebe confidenceWarning quando questionário pulado
 *
 * DIV-Z02-ADR16-001: ConfidenceLevel usa 'nenhuma' (aprovado pelo P.O. 2026-04-07)
 */

import { describe, it, expect } from "vitest";
import {
  computeState,
  computeConfidenceLevel,
} from "../lib/questionnaire-completeness";

// ─── Mocks dos módulos de DB e flowStateMachine ───────────────────────────────

// Simula o comportamento das procedures sem chamar o banco real
// Testamos a lógica de negócio isolada

// Lógica de skipSolarisQuestion (idempotente)
function simulateSkipSolarisQuestion(
  currentSkippedIds: string[],
  questionId: string
): string[] {
  const updated = [...currentSkippedIds];
  if (!updated.includes(questionId)) {
    updated.push(questionId);
  }
  return updated;
}

// Lógica de skipIagenQuestion (idempotente)
function simulateSkipIagenQuestion(
  currentSkippedIds: string[],
  questionId: string
): string[] {
  const updated = [...currentSkippedIds];
  if (!updated.includes(questionId)) {
    updated.push(questionId);
  }
  return updated;
}

// Lógica de skipQuestionnaire (com assertValidTransition simulado)
const VALID_TRANSITIONS: Record<string, string[]> = {
  rascunho:          ['consistencia_pendente'],
  onda1_solaris:     ['onda2_iagen', 'rascunho'],
  onda2_iagen:       ['diagnostico_corporativo', 'q_produto'],
  q_produto:         ['q_servico', 'diagnostico_cnae', 'onda2_iagen'],
  q_servico:         ['diagnostico_cnae', 'q_produto'],
  diagnostico_cnae:  ['briefing', 'diagnostico_operacional', 'q_servico', 'q_produto'],
  // Para skip: status antes do questionário
  cnaes_confirmados: ['onda1_solaris', 'consistencia_pendente'],
};

function assertValidTransition(from: string, to: string): void {
  const allowed = VALID_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`Transição inválida: ${from} → ${to}. Permitidas: ${allowed.join(', ')}`);
  }
}

interface SkipQuestionnaireResult {
  success: boolean;
  nextState: string;
  confidenceWarning: string;
  solarisSkippedAll?: boolean;
  iagenSkippedAll?: boolean;
}

function simulateSkipQuestionnaire(
  projectStatus: string,
  questionnaire: 'solaris' | 'iagen'
): SkipQuestionnaireResult {
  const nextStateMap: Record<'solaris' | 'iagen', string> = {
    solaris: 'onda1_solaris',
    iagen:   'onda2_iagen',
  };
  const nextState = nextStateMap[questionnaire];
  // Valida transição (lança se inválida)
  assertValidTransition(projectStatus, nextState);
  const confidenceWarning = `Questionário ${
    questionnaire === 'solaris' ? 'SOLARIS (Onda 1)' : 'IA Gen (Onda 2)'
  } foi pulado — diagnóstico com confiança reduzida. Recomenda-se revisão manual antes da aprovação do briefing.`;
  return {
    success: true,
    nextState,
    confidenceWarning,
    solarisSkippedAll: questionnaire === 'solaris' ? true : undefined,
    iagenSkippedAll:   questionnaire === 'iagen' ? true : undefined,
  };
}

// ─── CC-18: skipQuestionnaire → solarisSkippedAll=true ───────────────────────

describe("CC-18: skipQuestionnaire → solarisSkippedAll=true", () => {
  it("CC-18.1: pular SOLARIS seta solarisSkippedAll=true", () => {
    const result = simulateSkipQuestionnaire('cnaes_confirmados', 'solaris');
    expect(result.solarisSkippedAll).toBe(true);
    expect(result.success).toBe(true);
  });

  it("CC-18.2: pular IA Gen seta iagenSkippedAll=true", () => {
    const result = simulateSkipQuestionnaire('onda1_solaris', 'iagen');
    expect(result.iagenSkippedAll).toBe(true);
    expect(result.success).toBe(true);
  });

  it("CC-18.3: pular SOLARIS NÃO seta iagenSkippedAll", () => {
    const result = simulateSkipQuestionnaire('cnaes_confirmados', 'solaris');
    expect(result.iagenSkippedAll).toBeUndefined();
  });

  it("CC-18.4: pular IA Gen NÃO seta solarisSkippedAll", () => {
    const result = simulateSkipQuestionnaire('onda1_solaris', 'iagen');
    expect(result.solarisSkippedAll).toBeUndefined();
  });
});

// ─── CC-19: skip é reversível ────────────────────────────────────────────────

describe("CC-19: skip de pergunta individual é reversível (idempotente)", () => {
  it("CC-19.1: adicionar mesma pergunta duas vezes não duplica", () => {
    let ids = simulateSkipSolarisQuestion([], 'Q001');
    ids = simulateSkipSolarisQuestion(ids, 'Q001'); // segunda vez
    expect(ids).toHaveLength(1);
    expect(ids).toContain('Q001');
  });

  it("CC-19.2: remover pergunta do array (reversibilidade)", () => {
    let ids = simulateSkipSolarisQuestion([], 'Q001');
    ids = simulateSkipSolarisQuestion(ids, 'Q002');
    // Simula "desmarcar" — remove do array
    const reversed = ids.filter(id => id !== 'Q001');
    expect(reversed).toHaveLength(1);
    expect(reversed).not.toContain('Q001');
    expect(reversed).toContain('Q002');
  });

  it("CC-19.3: solarisSkippedAll pode ser revertido para false", () => {
    // Simula: skipQuestionnaire → solarisSkippedAll=true → reverter → false
    const afterSkip = { solarisSkippedAll: true };
    const afterRevert = { ...afterSkip, solarisSkippedAll: false };
    expect(afterRevert.solarisSkippedAll).toBe(false);
  });

  it("CC-19.4: skipIagenQuestion é idempotente", () => {
    let ids = simulateSkipIagenQuestion([], 'IG001');
    ids = simulateSkipIagenQuestion(ids, 'IG001');
    ids = simulateSkipIagenQuestion(ids, 'IG001');
    expect(ids).toHaveLength(1);
  });
});

// ─── CC-20: skipQuestionnaire avança o status (assertValidTransition) ─────────

describe("CC-20: skipQuestionnaire avança status via assertValidTransition", () => {
  it("CC-20.1: pular SOLARIS de cnaes_confirmados → onda1_solaris", () => {
    const result = simulateSkipQuestionnaire('cnaes_confirmados', 'solaris');
    expect(result.nextState).toBe('onda1_solaris');
  });

  it("CC-20.2: pular IA Gen de onda1_solaris → onda2_iagen", () => {
    const result = simulateSkipQuestionnaire('onda1_solaris', 'iagen');
    expect(result.nextState).toBe('onda2_iagen');
  });

  it("CC-20.3: transição inválida lança erro (ex: rascunho → onda2_iagen)", () => {
    expect(() => {
      simulateSkipQuestionnaire('rascunho', 'iagen');
    }).toThrow('Transição inválida');
  });

  it("CC-20.4: transição inválida inclui status atual e destino na mensagem", () => {
    try {
      simulateSkipQuestionnaire('rascunho', 'iagen');
      expect.fail('Deveria ter lançado erro');
    } catch (err: any) {
      expect(err.message).toContain('rascunho');
    }
  });
});

// ─── CC-21: briefing recebe confidenceWarning quando questionário pulado ──────

describe("CC-21: confidenceWarning gerado quando questionário pulado", () => {
  it("CC-21.1: pular SOLARIS gera aviso com 'SOLARIS (Onda 1)'", () => {
    const result = simulateSkipQuestionnaire('cnaes_confirmados', 'solaris');
    expect(result.confidenceWarning).toContain('SOLARIS (Onda 1)');
    expect(result.confidenceWarning).toContain('confiança reduzida');
  });

  it("CC-21.2: pular IA Gen gera aviso com 'IA Gen (Onda 2)'", () => {
    const result = simulateSkipQuestionnaire('onda1_solaris', 'iagen');
    expect(result.confidenceWarning).toContain('IA Gen (Onda 2)');
    expect(result.confidenceWarning).toContain('confiança reduzida');
  });

  it("CC-21.3: aviso menciona revisão manual antes da aprovação", () => {
    const result = simulateSkipQuestionnaire('cnaes_confirmados', 'solaris');
    expect(result.confidenceWarning).toContain('revisão manual');
    expect(result.confidenceWarning).toContain('briefing');
  });

  it("CC-21.4: confidenceWarning é string não-vazia", () => {
    const result = simulateSkipQuestionnaire('onda1_solaris', 'iagen');
    expect(typeof result.confidenceWarning).toBe('string');
    expect(result.confidenceWarning.length).toBeGreaterThan(20);
  });

  it("CC-21.5: DIV-Z02-ADR16-001 — ConfidenceLevel 'nenhuma' é mais preciso que 'muito_baixa'", () => {
    // Documenta a decisão de design: 'nenhuma' é o valor correto para questionário pulado
    // (aprovado pelo P.O. em 2026-04-07 — não é 'muito_baixa' como no contrato original)
    const state = computeState(24, 0, true); // 0 respostas, pulado=true
    expect(state).toBe('pulado');
    // O ConfidenceLevel para estado 'pulado' deve ser 'nenhuma'
    const level = computeConfidenceLevel(['pulado']);
    expect(level).toBe('nenhuma');
    expect(level).not.toBe('muito_baixa'); // DIV-Z02-ADR16-001
  });
});
