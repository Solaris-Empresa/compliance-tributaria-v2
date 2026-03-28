/**
 * Suite de testes K-4-A — Schema + State Machine
 * Issue: K-4-A | Sprint K | Milestone M2
 *
 * Cobre:
 *   T-K4A-01: solarisAnswers exportado do schema com colunas corretas
 *   T-K4A-02: iagenAnswers exportado do schema com colunas corretas
 *   T-K4A-03: solarisQuestions tem campo codigo
 *   T-K4A-04: enum status de projects inclui onda1_solaris e onda2_iagen
 *   T-K4A-05: VALID_TRANSITIONS exportado do flowStateMachine
 *   T-K4A-06: assertValidTransition aceita transição válida
 *   T-K4A-07: assertValidTransition rejeita transição inválida
 *   T-K4A-08: VALID_TRANSITIONS cobre todos os status críticos
 *
 * Zero alterações em frontend, rotas ou componentes existentes.
 * Regressão: K-1 (12 testes) e K-2 (12 testes) continuam passando.
 */

import { describe, it, expect } from "vitest";
import {
  solarisAnswers,
  iagenAnswers,
  solarisQuestions,
  projects,
} from "../drizzle/schema";
import {
  VALID_TRANSITIONS,
  assertValidTransition,
} from "./flowStateMachine";

// ─── T-K4A-01: solarisAnswers exportado ──────────────────────────────────────
describe("T-K4A-01: solarisAnswers exportado do schema", () => {
  it("deve existir como objeto Drizzle", () => {
    expect(solarisAnswers).toBeDefined();
    expect(typeof solarisAnswers).toBe("object");
  });

  it("deve ter as colunas esperadas via Object.keys()", () => {
    const cols = Object.keys(solarisAnswers);
    const expected = ["id", "projectId", "questionId", "codigo", "resposta", "fonte", "createdAt", "updatedAt"];
    for (const col of expected) {
      expect(cols, `Coluna ausente: ${col}`).toContain(col);
    }
  });

  it("deve ter fonte com default 'solaris'", () => {
    // Drizzle v0.44: colunas são acessíveis diretamente como propriedades
    const fonteCol = (solarisAnswers as any).fonte;
    expect(fonteCol).toBeDefined();
    expect(fonteCol.default).toBe("solaris");
  });
});

// ─── T-K4A-02: iagenAnswers exportado ────────────────────────────────────────
describe("T-K4A-02: iagenAnswers exportado do schema", () => {
  it("deve existir como objeto Drizzle", () => {
    expect(iagenAnswers).toBeDefined();
    expect(typeof iagenAnswers).toBe("object");
  });

  it("deve ter as colunas esperadas via Object.keys()", () => {
    const cols = Object.keys(iagenAnswers);
    const expected = ["id", "projectId", "questionText", "resposta", "confidenceScore", "fonte", "createdAt", "updatedAt"];
    for (const col of expected) {
      expect(cols, `Coluna ausente: ${col}`).toContain(col);
    }
  });

  it("deve ter fonte com default 'ia_gen'", () => {
    const fonteCol = (iagenAnswers as any).fonte;
    expect(fonteCol).toBeDefined();
    expect(fonteCol.default).toBe("ia_gen");
  });
});

// ─── T-K4A-03: solarisQuestions tem campo codigo ─────────────────────────────
describe("T-K4A-03: solarisQuestions tem campo codigo", () => {
  it("deve ter a coluna codigo via Object.keys()", () => {
    const cols = Object.keys(solarisQuestions);
    expect(cols, "Coluna 'codigo' ausente em solarisQuestions").toContain("codigo");
  });

  it("coluna codigo deve ser um objeto Drizzle (MySqlColumn)", () => {
    const codigoCol = (solarisQuestions as any).codigo;
    expect(codigoCol).toBeDefined();
    expect(typeof codigoCol).toBe("object");
  });
});

// ─── T-K4A-04: enum status inclui onda1_solaris e onda2_iagen ────────────────
describe("T-K4A-04: enum status de projects inclui novos valores", () => {
  // Drizzle v0.44: enumValues acessível via .enumValues na coluna
  const statusCol = (projects as any).status;

  it("coluna status deve existir", () => {
    expect(statusCol).toBeDefined();
  });

  it("deve incluir onda1_solaris no enumValues", () => {
    expect(statusCol.enumValues).toContain("onda1_solaris");
  });

  it("deve incluir onda2_iagen no enumValues", () => {
    expect(statusCol.enumValues).toContain("onda2_iagen");
  });

  it("deve manter todos os status legados", () => {
    const legados = [
      "rascunho", "consistencia_pendente", "cnaes_confirmados",
      "diagnostico_corporativo", "diagnostico_operacional", "diagnostico_cnae",
      "briefing", "aprovado",
    ];
    for (const s of legados) {
      expect(statusCol.enumValues, `Status legado ausente: ${s}`).toContain(s);
    }
  });
});

// ─── T-K4A-05: VALID_TRANSITIONS exportado ───────────────────────────────────
describe("T-K4A-05: VALID_TRANSITIONS exportado do flowStateMachine", () => {
  it("deve ser um objeto não-vazio", () => {
    expect(VALID_TRANSITIONS).toBeDefined();
    expect(typeof VALID_TRANSITIONS).toBe("object");
    expect(Object.keys(VALID_TRANSITIONS).length).toBeGreaterThan(0);
  });

  it("deve incluir onda1_solaris como chave", () => {
    expect(VALID_TRANSITIONS).toHaveProperty("onda1_solaris");
  });

  it("deve incluir onda2_iagen como chave", () => {
    expect(VALID_TRANSITIONS).toHaveProperty("onda2_iagen");
  });

  it("onda1_solaris deve permitir avançar para onda2_iagen", () => {
    expect(VALID_TRANSITIONS["onda1_solaris"]).toContain("onda2_iagen");
  });

  it("onda1_solaris deve permitir retroceder para rascunho", () => {
    expect(VALID_TRANSITIONS["onda1_solaris"]).toContain("rascunho");
  });

  it("onda2_iagen deve permitir avançar para diagnostico_corporativo", () => {
    expect(VALID_TRANSITIONS["onda2_iagen"]).toContain("diagnostico_corporativo");
  });
});

// ─── T-K4A-06: assertValidTransition aceita transição válida ─────────────────
describe("T-K4A-06: assertValidTransition aceita transições válidas", () => {
  it("rascunho → onda1_solaris deve ser válido", () => {
    expect(() => assertValidTransition("rascunho", "onda1_solaris")).not.toThrow();
  });

  it("onda1_solaris → onda2_iagen deve ser válido", () => {
    expect(() => assertValidTransition("onda1_solaris", "onda2_iagen")).not.toThrow();
  });

  it("onda2_iagen → diagnostico_corporativo deve ser válido", () => {
    expect(() => assertValidTransition("onda2_iagen", "diagnostico_corporativo")).not.toThrow();
  });

  it("onda1_solaris → rascunho (retrocesso) deve ser válido", () => {
    expect(() => assertValidTransition("onda1_solaris", "rascunho")).not.toThrow();
  });

  it("briefing → matriz_riscos deve ser válido", () => {
    expect(() => assertValidTransition("briefing", "matriz_riscos")).not.toThrow();
  });
});

// ─── T-K4A-07: assertValidTransition rejeita transição inválida ──────────────
describe("T-K4A-07: assertValidTransition rejeita transições inválidas", () => {
  it("rascunho → diagnostico_corporativo (pulo de etapa) deve lançar erro", () => {
    expect(() => assertValidTransition("rascunho", "diagnostico_corporativo")).toThrow();
  });

  it("onda1_solaris → briefing (pulo de etapa) deve lançar erro", () => {
    expect(() => assertValidTransition("onda1_solaris", "briefing")).toThrow();
  });

  it("aprovado → rascunho (retrocesso não permitido) deve lançar erro", () => {
    expect(() => assertValidTransition("aprovado", "rascunho")).toThrow();
  });

  it("arquivado → qualquer coisa deve lançar erro", () => {
    expect(() => assertValidTransition("arquivado", "aprovado")).toThrow();
  });

  it("mensagem de erro deve mencionar os status envolvidos", () => {
    try {
      assertValidTransition("rascunho", "briefing");
      expect(true).toBe(false); // não deve chegar aqui
    } catch (e: any) {
      expect(e.message).toContain("rascunho");
      expect(e.message).toContain("briefing");
    }
  });
});

// ─── T-K4A-08: VALID_TRANSITIONS cobre status críticos ───────────────────────
describe("T-K4A-08: VALID_TRANSITIONS cobre status críticos do enum", () => {
  const statusCriticos = [
    "rascunho",
    "onda1_solaris",
    "onda2_iagen",
    "diagnostico_corporativo",
    "diagnostico_operacional",
    "diagnostico_cnae",
    "briefing",
    "aprovado",
  ];

  for (const status of statusCriticos) {
    it(`"${status}" deve ter entrada em VALID_TRANSITIONS`, () => {
      expect(VALID_TRANSITIONS).toHaveProperty(status);
    });
  }
});
