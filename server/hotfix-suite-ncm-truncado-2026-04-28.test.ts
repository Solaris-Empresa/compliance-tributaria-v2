/**
 * hotfix-suite-ncm-truncado-2026-04-28.test.ts — D2 do hotfix-suite-robustecimento.
 *
 * Cobertura: garantir que o gate de input M1 (PR #859 — validateM1Seed) rejeita
 * todos os formatos truncados/invalidos de NCM. Inclui regression para NBS
 * digitado em campo NCM.
 *
 * Sem mocks. validateM1Seed e funcao pura.
 */
import { describe, it, expect } from "vitest";
import { validateM1Seed } from "./lib/archetype/validateM1Input";

describe("Hotfix Suite — NCM truncado rejeitado pelo gate de input (PR #859)", () => {
  const baseSeed = {
    cnae_principal_confirmado: "0115-6/00",
    natureza_operacao_principal: ["Produção própria"],
    nbss_principais: [],
  };

  const truncadoExamples = [
    "1201", // 4 dígitos
    "12.01", // 4 dígitos com ponto
    "1201.90", // 6 dígitos
    "12019000", // 8 dígitos sem pontos
    "1201.9000", // formato errado
    "1201.90.0", // 7 dígitos
    "12.01.90.00", // formato errado
  ];

  for (const ncm of truncadoExamples) {
    it(`NCM '${ncm}' bloqueado por NCM_INVALID_FORMAT`, () => {
      expect(() =>
        validateM1Seed({ ...baseSeed, ncms_principais: [ncm] }),
      ).toThrow(/NCM_INVALID_FORMAT/);
    });
  }

  it("NCM completo '1201.90.00' passa", () => {
    expect(() =>
      validateM1Seed({ ...baseSeed, ncms_principais: ["1201.90.00"] }),
    ).not.toThrow();
  });

  // Regression — NBS digitado em campo NCM (PDF #2 Transportadora real)
  it("NBS '1.0501.14.51' digitado em campo NCM bloqueado", () => {
    expect(() =>
      validateM1Seed({ ...baseSeed, ncms_principais: ["1.0501.14.51"] }),
    ).toThrow(/NCM_INVALID_FORMAT/);
  });
});
