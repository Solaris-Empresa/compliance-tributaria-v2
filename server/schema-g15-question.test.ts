/**
 * schema-g15-question.test.ts
 * Sprint J — G15: rastreabilidade de origem das perguntas do questionário
 *
 * Cobre os 3 campos adicionados ao QuestionSchema em ai-schemas.ts:
 *   - fonte: enum("regulatorio" | "solaris" | "ia_gen") — default "ia_gen"
 *   - requirement_id: string opcional — default ""
 *   - source_reference: string opcional — default ""
 *
 * INV-005: pergunta nunca deve ter fonte undefined — default "ia_gen" garante isso.
 */

import { describe, it, expect } from "vitest";
import { QuestionSchema } from "./ai-schemas";

// Base mínima válida para um QuestionSchema (campos obrigatórios)
const baseQuestion = {
  id: "q1",
  text: "A empresa já realizou o mapeamento de suas operações sob a LC 214/2025?",
};

describe("G15 — QuestionSchema: rastreabilidade de origem (fonte/requirement_id/source_reference)", () => {

  // T-G15-01: pergunta regulatória com todos os campos preenchidos — schema aceita
  it("T-G15-01: pergunta regulatória com todos os campos — schema aceita", () => {
    const result = QuestionSchema.safeParse({
      ...baseQuestion,
      fonte: "regulatorio",
      requirement_id: "RF-045",
      source_reference: "LC 214/2025 Art. 9°",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fonte).toBe("regulatorio");
      expect(result.data.requirement_id).toBe("RF-045");
      expect(result.data.source_reference).toBe("LC 214/2025 Art. 9°");
    }
  });

  // T-G15-02: pergunta ia_gen com campos vazios — schema aceita
  it("T-G15-02: pergunta ia_gen com campos vazios — schema aceita", () => {
    const result = QuestionSchema.safeParse({
      ...baseQuestion,
      fonte: "ia_gen",
      requirement_id: "",
      source_reference: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fonte).toBe("ia_gen");
      expect(result.data.requirement_id).toBe("");
      expect(result.data.source_reference).toBe("");
    }
  });

  // T-G15-03: sem campo fonte — default "ia_gen" aplicado automaticamente
  it("T-G15-03: sem campo fonte — default ia_gen aplicado automaticamente", () => {
    const result = QuestionSchema.safeParse({
      ...baseQuestion,
      // fonte ausente intencionalmente
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // INV-005: fonte nunca deve ser undefined
      expect(result.data.fonte).toBeDefined();
      expect(result.data.fonte).toBe("ia_gen");
      // requirement_id e source_reference também têm defaults
      expect(result.data.requirement_id).toBe("");
      expect(result.data.source_reference).toBe("");
    }
  });

  // T-G15-04: fonte inválida — ZodError
  it("T-G15-04: fonte inválida — ZodError", () => {
    const result = QuestionSchema.safeParse({
      ...baseQuestion,
      fonte: "desconhecido", // valor fora do enum
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fonteError = result.error.issues.find(i => i.path.includes("fonte"));
      expect(fonteError).toBeDefined();
    }
  });

  // T-G15-05: INV-005 — output nunca tem fonte undefined (migração progressiva)
  it("T-G15-05: INV-005 — output nunca tem fonte undefined mesmo sem o campo", () => {
    // Simula outputs antigos do LLM que não retornavam o campo fonte
    const legacyOutputs = [
      { ...baseQuestion },                                    // sem fonte
      { ...baseQuestion, fonte: undefined },                  // fonte explicitamente undefined
      { ...baseQuestion, fonte: null as any },                // fonte null
    ];

    for (const output of legacyOutputs) {
      const result = QuestionSchema.safeParse(output);
      // Outputs sem fonte válida devem ou receber default "ia_gen" ou falhar — nunca retornar undefined
      if (result.success) {
        expect(result.data.fonte).not.toBeUndefined();
        expect(result.data.fonte).toBe("ia_gen");
      }
      // Se falhar (ex: null não é aceito), o schema está protegendo corretamente
    }
  });

});
