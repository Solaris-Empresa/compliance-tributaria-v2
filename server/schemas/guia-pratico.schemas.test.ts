/**
 * guia-pratico.schemas.test.ts — A2 (Triade ORQ-28, test-contracts)
 *
 * Escopo ESTRITAMENTE determinístico (REGRA-ORQ-27 — assemble ≠ consumption):
 *   ✅ valida estrutura/bounds do Zod (válido/inválido, min/max, enums)
 *   ❌ NÃO testa conteúdo do LLM, qualidade, ISS, refs normativas, chamada real à API
 *      (não-determinístico — verificável só por smoke runtime amostral, ADR-GP-001)
 */
import { describe, it, expect } from "vitest";
import {
  guiaPraticoResponseSchema,
  guiaPraticoInputSchema,
  guiaPraticoPassoSchema,
  guiaPraticoTagTipo,
  type GuiaPraticoResponse,
} from "./guia-pratico.schemas";

const validPasso = {
  numero: 1,
  titulo: "Inventariar contratos vigentes",
  descricao: "Extraia do ERP todos os contratos ativos.",
  tagTipo: "tempo" as const,
  tagTexto: "⏱ 6-8 horas",
};

const validResponse: GuiaPraticoResponse = {
  contextoEmpresa: "Empresa de TI · Simples Nacional",
  alertaCritico: "Atrasos podem gerar autuações.",
  passos: [validPasso, { ...validPasso, numero: 2, tagTipo: "referencia" }],
};

describe("A2 — guiaPraticoResponseSchema (estrutura)", () => {
  it("aceita resposta válida (2 passos)", () => {
    expect(guiaPraticoResponseSchema.safeParse(validResponse).success).toBe(true);
  });

  it("aceita 8 passos (limite superior)", () => {
    const passos = Array.from({ length: 8 }, (_, i) => ({ ...validPasso, numero: i + 1 }));
    expect(guiaPraticoResponseSchema.safeParse({ ...validResponse, passos }).success).toBe(true);
  });

  it("rejeita < 2 passos (min)", () => {
    expect(guiaPraticoResponseSchema.safeParse({ ...validResponse, passos: [validPasso] }).success).toBe(false);
  });

  it("rejeita > 8 passos (max)", () => {
    const passos = Array.from({ length: 9 }, (_, i) => ({ ...validPasso, numero: ((i % 8) + 1) }));
    expect(guiaPraticoResponseSchema.safeParse({ ...validResponse, passos }).success).toBe(false);
  });

  it("rejeita contextoEmpresa/alertaCritico vazios", () => {
    expect(guiaPraticoResponseSchema.safeParse({ ...validResponse, contextoEmpresa: "" }).success).toBe(false);
    expect(guiaPraticoResponseSchema.safeParse({ ...validResponse, alertaCritico: "" }).success).toBe(false);
  });
});

describe("A2 — guiaPraticoPassoSchema (bounds de campo)", () => {
  it("rejeita numero fora de 1-8", () => {
    expect(guiaPraticoPassoSchema.safeParse({ ...validPasso, numero: 0 }).success).toBe(false);
    expect(guiaPraticoPassoSchema.safeParse({ ...validPasso, numero: 9 }).success).toBe(false);
  });

  it("rejeita titulo > 120 chars", () => {
    expect(guiaPraticoPassoSchema.safeParse({ ...validPasso, titulo: "x".repeat(121) }).success).toBe(false);
  });

  it("rejeita descricao > 800 chars", () => {
    expect(guiaPraticoPassoSchema.safeParse({ ...validPasso, descricao: "x".repeat(801) }).success).toBe(false);
  });

  it("rejeita tagTexto > 200 chars", () => {
    expect(guiaPraticoPassoSchema.safeParse({ ...validPasso, tagTexto: "x".repeat(201) }).success).toBe(false);
  });

  it("rejeita tagTipo fora do enum", () => {
    expect(guiaPraticoPassoSchema.safeParse({ ...validPasso, tagTipo: "outro" }).success).toBe(false);
    expect(guiaPraticoTagTipo.options).toEqual(["tempo", "atencao", "referencia", "entregavel"]);
  });
});

describe("A2 — guiaPraticoInputSchema (request + defaults)", () => {
  it("aplica defaults 'normal' quando ausentes", () => {
    const r = guiaPraticoInputSchema.parse({ taskId: 1, projectId: 2 });
    expect(r.detalhamento).toBe("normal");
    expect(r.nivelTecnico).toBe("normal");
  });

  it("rejeita contextoAdicional > 500 chars", () => {
    expect(
      guiaPraticoInputSchema.safeParse({ taskId: 1, projectId: 2, contextoAdicional: "x".repeat(501) }).success,
    ).toBe(false);
  });

  it("rejeita enums inválidos de detalhamento/nivelTecnico", () => {
    expect(guiaPraticoInputSchema.safeParse({ taskId: 1, projectId: 2, detalhamento: "max" }).success).toBe(false);
    expect(guiaPraticoInputSchema.safeParse({ taskId: 1, projectId: 2, nivelTecnico: "guru" }).success).toBe(false);
  });

  it("rejeita taskId/projectId não-inteiros", () => {
    expect(guiaPraticoInputSchema.safeParse({ taskId: 1.5, projectId: 2 }).success).toBe(false);
  });
});

describe("A2 — fallback de consumo (documenta contrato do procedure)", () => {
  it("Zod.parse de JSON malformado lança → caller faz fallback de UI (não testa LLM)", () => {
    // O procedure: GuiaPraticoResponseSchema.parse(JSON.parse(raw)) — se raw truncado/inválido,
    // lança ZodError/SyntaxError → UI mostra fallback gracioso. Aqui só provamos que parse falha.
    expect(() => guiaPraticoResponseSchema.parse({ contextoEmpresa: "x" })).toThrow();
  });
});
