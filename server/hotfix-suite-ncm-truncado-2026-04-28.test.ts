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

  // Reversão intencional de #859 por ADR-0035 / #1219 F1: "1201" (4 díg. puro)
  // deixou de ser "truncado inválido" e passou a ser GRUPO válido (posição NCM).
  // Os demais formatos abaixo continuam inválidos (não são nem grupo nem específico).
  // D2 (#1502 4º gate): "1201.90" (subposição NNNN.NN) SAIU desta lista — agora é válida.
  const truncadoExamples = [
    "12.01", // 4 dígitos com ponto
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

  // #1219 F1 — reversão #859: grupo NCM (4 díg. = posição) agora é válido.
  it("NCM grupo '1201' (4 díg. = posição) passa — reversão #859 por #1219/ADR-0035", () => {
    expect(() =>
      validateM1Seed({ ...baseSeed, ncms_principais: ["1201"] }),
    ).not.toThrow();
  });

  // D2 (18/jun/2026) — subposição NNNN.NN = nível da lei (Anexo I/IX). 4º gate
  // (validateM1Input) consolidado no helper @shared/ncm-nbs-validation (#1502 deixara
  // este gate de fora — Lição #74). "2304.00"/"1006.20" agora passam no backend.
  it("NCM subposição '1201.90' (6 díg.) passa — D2 / 4º gate (#1502)", () => {
    expect(() =>
      validateM1Seed({ ...baseSeed, ncms_principais: ["1201.90"] }),
    ).not.toThrow();
  });

  // Regression — NBS digitado em campo NCM (PDF #2 Transportadora real)
  it("NBS '1.0501.14.51' digitado em campo NCM bloqueado", () => {
    expect(() =>
      validateM1Seed({ ...baseSeed, ncms_principais: ["1.0501.14.51"] }),
    ).toThrow(/NCM_INVALID_FORMAT/);
  });
});
