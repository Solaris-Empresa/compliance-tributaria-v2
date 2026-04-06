/**
 * M2.1 — Testes de Completude Diagnóstica
 *
 * 5 casos obrigatórios conforme especificação do Orquestrador.
 * Testa a função pura calcDiagnosticCompleteness sem dependências de banco.
 */
import { describe, it, expect } from "vitest";
import {
  calcDiagnosticCompleteness,
  getPendingDiagnosticLayers,
  type DiagnosticCompletenessInput,
} from "../lib/completeness";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const allCompleted = {
  corporate: "completed",
  operational: "completed",
  cnae: "completed",
};

const partialStatus = {
  corporate: "completed",
  operational: "pending",
  cnae: "pending",
};

const operationProfileFilled = {
  principaisProdutos: [{ ncm_code: "1234.56.78", descricao: "Produto X" }],
  principaisServicos: [],
};

// ─── Caso 1: insuficiente — zero respostas em ambas as ondas ─────────────────

describe("M2.1 — calcDiagnosticCompleteness", () => {
  it("Caso 1: retorna 'insuficiente' quando solarisAnswersCount=0 e iagenAnswersCount=0", () => {
    const input: DiagnosticCompletenessInput = {
      solarisAnswersCount: 0,
      iagenAnswersCount: 0,
      diagnosticStatus: null,
      operationProfile: null,
    };
    expect(calcDiagnosticCompleteness(input)).toBe("insuficiente");
  });

  // ─── Caso 2: parcial — respostas existem mas diagnóstico incompleto ─────────

  it("Caso 2: retorna 'parcial' quando há respostas mas nem todas as camadas estão 'completed'", () => {
    const input: DiagnosticCompletenessInput = {
      solarisAnswersCount: 5,
      iagenAnswersCount: 3,
      diagnosticStatus: partialStatus,
      operationProfile: null,
    };
    expect(calcDiagnosticCompleteness(input)).toBe("parcial");
  });

  // ─── Caso 3: adequado — todas as camadas concluídas mas sem operationProfile ─

  it("Caso 3: retorna 'adequado' quando todas as camadas estão 'completed' mas operationProfile é null", () => {
    const input: DiagnosticCompletenessInput = {
      solarisAnswersCount: 7,
      iagenAnswersCount: 7,
      diagnosticStatus: allCompleted,
      operationProfile: null,
    };
    expect(calcDiagnosticCompleteness(input)).toBe("adequado");
  });

  // ─── Caso 4: completo — todas as camadas concluídas + operationProfile preenchido

  it("Caso 4: retorna 'completo' quando todas as camadas estão 'completed' e operationProfile está preenchido", () => {
    const input: DiagnosticCompletenessInput = {
      solarisAnswersCount: 7,
      iagenAnswersCount: 7,
      diagnosticStatus: allCompleted,
      operationProfile: operationProfileFilled,
    };
    expect(calcDiagnosticCompleteness(input)).toBe("completo");
  });

  // ─── Caso 5: parcial — diagnosticStatus null mas há respostas ───────────────

  it("Caso 5: retorna 'parcial' quando diagnosticStatus é null mas há respostas em pelo menos uma onda", () => {
    const input: DiagnosticCompletenessInput = {
      solarisAnswersCount: 3,
      iagenAnswersCount: 0,
      diagnosticStatus: null,
      operationProfile: null,
    };
    expect(calcDiagnosticCompleteness(input)).toBe("parcial");
  });
});

// ─── Testes de getPendingDiagnosticLayers ────────────────────────────────────

describe("M2.1 — getPendingDiagnosticLayers", () => {
  it("retorna todas as 3 dimensões quando diagnosticStatus é null", () => {
    const pending = getPendingDiagnosticLayers(null);
    expect(pending).toEqual(["Corporativo", "Operacional", "CNAE"]);
  });

  it("retorna apenas as dimensões não concluídas", () => {
    const pending = getPendingDiagnosticLayers(partialStatus);
    expect(pending).toEqual(["Operacional", "CNAE"]);
  });

  it("retorna array vazio quando todas as dimensões estão 'completed'", () => {
    const pending = getPendingDiagnosticLayers(allCompleted);
    expect(pending).toEqual([]);
  });
});
