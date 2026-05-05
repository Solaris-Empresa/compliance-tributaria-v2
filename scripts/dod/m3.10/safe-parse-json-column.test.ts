/**
 * Test unit do helper canônico de Lição #72.
 *
 * Lição #71: autor do script DoD é responsável por validar o parser
 * antes de reportar PASS/FAIL. Este teste é a salvaguarda residual.
 *
 * Cenários cobrem:
 * - Caminho esperado (mysql2 default — objeto)
 * - Fallbacks defensivos (null, string vazia, JSON inválido)
 * - Caso canônico do bug (objeto passado como input — antipattern era throw)
 */
import { describe, it, expect } from "vitest";
import { safeParseJsonColumn } from "./safe-parse-json-column";

describe("safeParseJsonColumn (Lição #72)", () => {
  it("retorna objeto JS quando driver já parseou (caminho esperado)", () => {
    const input = { gaps: [{ fonte: "regulatorio" }] };
    const result = safeParseJsonColumn(input, { gaps: [] });
    expect(result).toEqual({ gaps: [{ fonte: "regulatorio" }] });
  });

  it("não throws quando recebe objeto (caso canônico do bug Sprint M3.10)", () => {
    // O bug original: JSON.parse({}) → "[object Object]" → throws
    // Este helper deve absorver e retornar o próprio objeto
    const input = { gaps: [] };
    expect(() => safeParseJsonColumn(input, { gaps: [] })).not.toThrow();
  });

  it("parseia string JSON válida", () => {
    const input = '{"gaps":[{"fonte":"solaris"}]}';
    const result = safeParseJsonColumn<{ gaps: { fonte: string }[] }>(input, {
      gaps: [],
    });
    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0].fonte).toBe("solaris");
  });

  it("retorna fallback quando input é null", () => {
    const fallback = { gaps: [] as string[] };
    const result = safeParseJsonColumn(null, fallback);
    expect(result).toBe(fallback);
  });

  it("retorna fallback quando input é undefined", () => {
    const fallback = { gaps: [] as string[] };
    const result = safeParseJsonColumn(undefined, fallback);
    expect(result).toBe(fallback);
  });

  it("retorna fallback quando string é vazia", () => {
    const fallback = { gaps: [] as string[] };
    const result = safeParseJsonColumn("", fallback);
    expect(result).toBe(fallback);
  });

  it("retorna fallback quando JSON é malformed (não throws)", () => {
    const fallback = { gaps: [] as string[] };
    const result = safeParseJsonColumn("{invalid json", fallback);
    expect(result).toBe(fallback);
  });

  it("retorna fallback quando input é tipo inesperado (number)", () => {
    const fallback = { gaps: [] as string[] };
    // @ts-expect-error — testando coerção defensiva
    const result = safeParseJsonColumn(42, fallback);
    expect(result).toBe(fallback);
  });

  it("retorna fallback quando input é boolean", () => {
    const fallback = { gaps: [] as string[] };
    // @ts-expect-error — testando coerção defensiva
    const result = safeParseJsonColumn(true, fallback);
    expect(result).toBe(fallback);
  });
});
