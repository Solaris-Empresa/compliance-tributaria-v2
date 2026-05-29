/**
 * validate-cpf.test.ts — 13 contratos obrigatórios (TC-01 a TC-13)
 *
 * BUG-AGRO-CPF F1 (#1290) — PLANO-TESTES §C.1.
 * 10 validateCpf + 3 maskCpf · todos devem PASS antes do PR.
 */
import { describe, it, expect } from "vitest";
import { validateCpf, maskCpf } from "./validate-cpf";

describe("validateCpf — Opção A (DV local sem RFB)", () => {
  // TC-01: CPF válido formatado
  it("TC-01: aceita CPF válido com formatação", () =>
    expect(validateCpf("529.982.247-25")).toBe(true));

  // TC-02: CPF válido sem formatação
  it("TC-02: aceita CPF válido sem formatação", () =>
    expect(validateCpf("52998224725")).toBe(true));

  // TC-03: CPF inválido — DV errado
  it("TC-03: rejeita CPF com dígito verificador errado", () =>
    expect(validateCpf("529.982.247-26")).toBe(false));

  // TC-04: CPF inválido — sequência repetida
  it("TC-04: rejeita sequência repetida (111.111.111-11)", () =>
    expect(validateCpf("111.111.111-11")).toBe(false));

  // TC-05: CPF inválido — comprimento errado (10 dígitos)
  it("TC-05: rejeita CPF com 10 dígitos", () =>
    expect(validateCpf("5299822472")).toBe(false));

  // TC-06: CPF inválido — comprimento errado (12 dígitos)
  it("TC-06: rejeita CPF com 12 dígitos", () =>
    expect(validateCpf("529982247250")).toBe(false));

  // TC-07: CPF inválido — string vazia
  it("TC-07: rejeita string vazia", () =>
    expect(validateCpf("")).toBe(false));

  // TC-08: CPF inválido — apenas letras
  it("TC-08: rejeita string não-numérica", () =>
    expect(validateCpf("abc.def.ghi-jk")).toBe(false));

  // TC-09: CPF inválido — 000.000.000-00
  it("TC-09: rejeita CPF 000.000.000-00", () =>
    expect(validateCpf("000.000.000-00")).toBe(false));

  // TC-10: CPF válido — outro CPF real de teste (literatura pública)
  it("TC-10: aceita segundo CPF válido de teste", () =>
    expect(validateCpf("153.509.460-56")).toBe(true));
});

describe("maskCpf — formatação progressiva", () => {
  // TC-11: máscara progressiva — 3 dígitos
  it("TC-11: formata 3 dígitos como 529", () =>
    expect(maskCpf("529")).toBe("529"));

  // TC-12: máscara progressiva — 6 dígitos
  it("TC-12: formata 6 dígitos como 529.982", () =>
    expect(maskCpf("529982")).toBe("529.982"));

  // TC-13: máscara completa — 11 dígitos
  it("TC-13: formata 11 dígitos como 529.982.247-25", () =>
    expect(maskCpf("52998224725")).toBe("529.982.247-25"));
});
