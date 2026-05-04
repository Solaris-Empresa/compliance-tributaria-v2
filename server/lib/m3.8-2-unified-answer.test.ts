/**
 * m3.8-2-unified-answer.test.ts
 * Sprint M3.8 — Item 2 (escopo reduzido V7) — UnifiedAnswer + extractRequirementId
 *
 * Issue: #959
 * Princípios:
 * - Lição #62 (Contexto vs Evidência): apenas EVIDÊNCIA alimenta Gap Engine
 * - Lição #63 (Spec ≠ Viável): apenas service_answers idN ativa em Fase 1
 *
 * Triade ORQ-28 OBRIGATÓRIA — alta complexidade.
 *
 * Vinculadas:
 * - PR #956 — Lições #62 e #63
 * - PR #967 — M3.8-1A (question_source pré-requisito)
 * - PR #968 — M3.8-1B (eliminar hardcode solaris)
 * - Issues #961-#966 — backlog M3.9 ativará outras fontes
 */
import { describe, it, expect } from "vitest";
import {
  extractRequirementId,
  parseAnswerValue,
  resolveAnswer,
  normalizeServiceAnswers,
  normalizeSolarisAnswers,
  normalizeIagenAnswers,
  normalizeQcnaeOnda3Answers,
  groupByRequirement,
  type UnifiedAnswer,
  type ServiceAnswerInput,
} from "./unified-answer";

describe("M3.8-2 — extractRequirementId (Lição #63 mapeamento determinístico)", () => {
  it("padrão lc214-art-art-4-id4 → 4", () => {
    expect(extractRequirementId("lc214-art-art-4-id4")).toBe(4);
  });

  it("padrão lc214-art-art-12-id20 → 20", () => {
    expect(extractRequirementId("lc214-art-art-12-id20")).toBe(20);
  });

  it("padrão lc227-art-art-3-id99 → 99", () => {
    expect(extractRequirementId("lc227-art-art-3-id99")).toBe(99);
  });

  it("padrão SOL-038 → null (M3.9-1 backlog — solaris_questions.risk_category_code NULL)", () => {
    expect(extractRequirementId("SOL-038")).toBeNull();
  });

  it("padrão fallback-servico-001 → null (legado, removido em PR #952)", () => {
    expect(extractRequirementId("fallback-servico-001")).toBeNull();
  });

  it("padrão inválido genérico → null", () => {
    expect(extractRequirementId("anything-without-id-suffix")).toBeNull();
  });

  it("null → null", () => {
    expect(extractRequirementId(null)).toBeNull();
  });

  it("undefined → null", () => {
    expect(extractRequirementId(undefined)).toBeNull();
  });

  it("string vazia → null", () => {
    expect(extractRequirementId("")).toBeNull();
  });
});

describe("M3.8-2 — parseAnswerValue", () => {
  it("'sim' → 'Sim'", () => {
    expect(parseAnswerValue("sim")).toBe("Sim");
  });

  it("'Sim, com ressalvas' → 'Sim'", () => {
    expect(parseAnswerValue("Sim, com ressalvas")).toBe("Sim");
  });

  it("'não' → 'Não'", () => {
    expect(parseAnswerValue("não")).toBe("Não");
  });

  it("'nao' → 'Não'", () => {
    expect(parseAnswerValue("nao")).toBe("Não");
  });

  it("'parcial' → 'Parcial'", () => {
    expect(parseAnswerValue("parcial")).toBe("Parcial");
  });

  it("'parcialmente atendido' → 'Parcial'", () => {
    expect(parseAnswerValue("parcialmente atendido")).toBe("Parcial");
  });

  it("'não aplicável' → null (não é 'Não')", () => {
    expect(parseAnswerValue("não aplicável")).toBeNull();
  });

  it("'não sei' → null (não é 'Não')", () => {
    expect(parseAnswerValue("não sei")).toBeNull();
  });

  it("'nao_respondido' → null", () => {
    expect(parseAnswerValue("nao_respondido")).toBeNull();
  });

  it("string vazia → null", () => {
    expect(parseAnswerValue("")).toBeNull();
  });

  it("null → null", () => {
    expect(parseAnswerValue(null)).toBeNull();
  });

  it("undefined → null", () => {
    expect(parseAnswerValue(undefined)).toBeNull();
  });

  it("boolean true → 'Sim'", () => {
    expect(parseAnswerValue(true)).toBe("Sim");
  });

  it("boolean false → 'Não'", () => {
    expect(parseAnswerValue(false)).toBe("Não");
  });
});

describe("M3.8-2 — resolveAnswer (most-negative wins)", () => {
  const buildAnswer = (value: "Sim" | "Não" | "Parcial" | null): UnifiedAnswer => ({
    requirementId: 4,
    answerValue: value,
    source: "qnbs_regulatorio",
    sourceRef: "lc214-art-art-4-id4",
  });

  it("array vazio → null", () => {
    expect(resolveAnswer([])).toBeNull();
  });

  it("uma resposta 'Sim' → 'Sim'", () => {
    expect(resolveAnswer([buildAnswer("Sim")])).toBe("Sim");
  });

  it("uma resposta 'Não' → 'Não'", () => {
    expect(resolveAnswer([buildAnswer("Não")])).toBe("Não");
  });

  it("conflito Sim + Não → 'Não' (most-negative wins)", () => {
    expect(resolveAnswer([buildAnswer("Sim"), buildAnswer("Não")])).toBe("Não");
  });

  it("conflito Sim + Parcial → 'Parcial'", () => {
    expect(resolveAnswer([buildAnswer("Sim"), buildAnswer("Parcial")])).toBe("Parcial");
  });

  it("conflito Parcial + Não → 'Não'", () => {
    expect(resolveAnswer([buildAnswer("Parcial"), buildAnswer("Não")])).toBe("Não");
  });

  it("apenas null → null", () => {
    expect(resolveAnswer([buildAnswer(null), buildAnswer(null)])).toBeNull();
  });
});

describe("M3.8-2 — normalizeServiceAnswers (ÚNICA fonte ATIVA em Fase 1)", () => {
  it("normaliza padrão idN para UnifiedAnswer com requirementId derivado", () => {
    const input: ServiceAnswerInput[] = [
      {
        pergunta_id: "q1",
        resposta: "Não",
        fonte_ref: "lc214-art-art-4-id4",
        lei_ref: "Art. 4 LC 214",
      },
    ];
    const result = normalizeServiceAnswers(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      requirementId: 4,
      answerValue: "Não",
      source: "qnbs_regulatorio",
      sourceRef: "lc214-art-art-4-id4",
    });
  });

  it("Regra de Integridade — filtra entradas SOL-XXX (sem requirementId)", () => {
    const input: ServiceAnswerInput[] = [
      {
        pergunta_id: "q1",
        resposta: "Não",
        fonte_ref: "lc214-art-art-4-id4", // mapeável
        lei_ref: "Art. 4 LC 214",
      },
      {
        pergunta_id: "q2",
        resposta: "Não",
        fonte_ref: "SOL-038", // não mapeável (M3.9-1)
        lei_ref: "LC 224",
      },
    ];
    const result = normalizeServiceAnswers(input);
    expect(result).toHaveLength(1);
    expect(result[0].requirementId).toBe(4);
  });

  it("3 respostas com padrão idN distintos → 3 UnifiedAnswer", () => {
    const input: ServiceAnswerInput[] = [
      { pergunta_id: "1", resposta: "Não", fonte_ref: "lc214-art-art-3-id3", lei_ref: "Art. 3" },
      { pergunta_id: "2", resposta: "Não", fonte_ref: "lc214-art-art-4-id4", lei_ref: "Art. 4" },
      { pergunta_id: "3", resposta: "Não", fonte_ref: "lc214-art-art-12-id20", lei_ref: "Art. 12" },
    ];
    const result = normalizeServiceAnswers(input);
    expect(result).toHaveLength(3);
    expect(result.map(r => r.requirementId)).toEqual([3, 4, 20]);
  });

  it("array vazio → []", () => {
    expect(normalizeServiceAnswers([])).toEqual([]);
  });
});

describe("M3.8-2 — Stubs documentados (Lição #63 + Issues M3.9)", () => {
  it("normalizeSolarisAnswers retorna [] (EXCLUSÃO DEFINITIVA — Issue #964)", () => {
    expect(normalizeSolarisAnswers([{}, {}, {}])).toEqual([]);
  });

  it("normalizeIagenAnswers retorna [] (STUB — bloqueado por Issue #962)", () => {
    expect(normalizeIagenAnswers([{}, {}])).toEqual([]);
  });

  it("normalizeQcnaeOnda3Answers retorna [] (STUB — bloqueado por Issue #963 + trigger Q.CNAE Onda 3)", () => {
    expect(normalizeQcnaeOnda3Answers([{}])).toEqual([]);
  });
});

describe("M3.8-2 — groupByRequirement", () => {
  it("agrupa respostas por requirementId", () => {
    const answers: UnifiedAnswer[] = [
      { requirementId: 4, answerValue: "Não", source: "qnbs_regulatorio", sourceRef: "lc214-art-art-4-id4" },
      { requirementId: 4, answerValue: "Sim", source: "iagen_onda2", sourceRef: "iagen-1" }, // hipotético quando M3.9-5 ativar
      { requirementId: 20, answerValue: "Parcial", source: "qnbs_regulatorio", sourceRef: "lc214-art-art-12-id20" },
    ];
    const grouped = groupByRequirement(answers);
    expect(grouped.size).toBe(2);
    expect(grouped.get(4)).toHaveLength(2);
    expect(grouped.get(20)).toHaveLength(1);
  });

  it("filtra entradas com requirementId null", () => {
    const answers: UnifiedAnswer[] = [
      { requirementId: 4, answerValue: "Não", source: "qnbs_regulatorio" },
      { requirementId: null, answerValue: "Não", source: "qnbs_solaris", sourceRef: "SOL-038" },
    ];
    const grouped = groupByRequirement(answers);
    expect(grouped.size).toBe(1);
    expect(grouped.has(4)).toBe(true);
  });
});

describe("M3.8-2 — Integração lógica (cenário real #3270001)", () => {
  it("3 respostas Q.NBS padrão idN viram 3 gaps com evidência real", () => {
    // Cenário do projeto #3270001: 15 respostas, 3 mapeáveis (idN), 12 SOL-XXX
    const fifteenAnswers: ServiceAnswerInput[] = [
      // 3 mapeáveis
      { pergunta_id: "1", resposta: "Não", fonte_ref: "lc214-art-art-4-id4", lei_ref: "Art. 4" },
      { pergunta_id: "2", resposta: "Não", fonte_ref: "lc214-art-art-12-id20", lei_ref: "Art. 12" },
      { pergunta_id: "3", resposta: "Não", fonte_ref: "lc214-art-art-3-id3", lei_ref: "Art. 3" },
      // 12 SOL-XXX (não mapeáveis em Fase 1)
      ...Array.from({ length: 12 }, (_, i) => ({
        pergunta_id: `${i + 4}`,
        resposta: "Não",
        fonte_ref: `SOL-${String(i + 26).padStart(3, "0")}`,
        lei_ref: "LC 224 art. 4",
      })),
    ];

    const result = normalizeServiceAnswers(fifteenAnswers);

    // Apenas 3 mapeáveis (Regra de Integridade filtrou 12 SOL-XXX)
    expect(result).toHaveLength(3);
    expect(result.map(r => r.requirementId).sort((a, b) => a! - b!)).toEqual([3, 4, 20]);
    expect(result.every(r => r.source === "qnbs_regulatorio")).toBe(true);
    expect(result.every(r => r.answerValue === "Não")).toBe(true);
  });
});
