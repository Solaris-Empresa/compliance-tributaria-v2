// form-wizard-steps.test.ts — F1 (módulo puro do stepper)
import { describe, it, expect } from "vitest";
import { STEP_DEFS, LAST_STEP, stepValid, canSubmit, stepHasContentFor, nextStep, prevStep } from "./form-wizard-steps";
import { type PerfilEmpresaData } from "../components/PerfilEmpresaIntelligente";

const CNPJ_OK = "11222333000181";
const CPF_OK = "52998224725";

function pj(over: Partial<PerfilEmpresaData> = {}): PerfilEmpresaData {
  return {
    cnpj: CNPJ_OK, cpf: "", taxIdType: "cnpj",
    companyType: "ltda", companySize: "media", taxRegime: "lucro_real",
    annualRevenueRange: "", operationType: "industria", clientType: ["b2b"],
    paymentMethods: [], multiState: null, hasMultipleEstablishments: null,
    hasImportExport: null, hasIntermediaries: null, hasTaxTeam: null,
    hasAudit: null, hasTaxIssues: null, isEconomicGroup: null, taxCentralization: null,
    principaisProdutos: [], principaisServicos: [],
    ...over,
  } as PerfilEmpresaData;
}
function pf(over: Partial<PerfilEmpresaData> = {}): PerfilEmpresaData {
  return pj({ taxIdType: "cpf", cnpj: "", cpf: CPF_OK, companyType: "", companySize: "", taxRegime: "", operationType: "", ...over });
}

describe("STEP_DEFS — D2 (Passo 0 separado)", () => {
  it("6 passos, Passo 0 = tipo, último = confirmacao", () => {
    expect(STEP_DEFS).toHaveLength(6);
    expect(STEP_DEFS[0].key).toBe("tipo");
    expect(STEP_DEFS[LAST_STEP].key).toBe("confirmacao");
  });
});

describe("stepValid — passos sem gate", () => {
  it.each([0, 4, 5])("passo %i (sem requiredLabels) sempre válido", (s) => {
    expect(stepValid(pj(), s, 0)).toBe(true);
  });
});

describe("stepValid — Passo 1 Identificação (CNPJ/CPF)", () => {
  it("PJ CNPJ válido → válido", () => expect(stepValid(pj(), 1, 0)).toBe(true));
  it("PJ CNPJ inválido → inválido", () => expect(stepValid(pj({ cnpj: "123" }), 1, 0)).toBe(false));
  it("PF CPF válido → válido (CNPJ irrelevante não bloqueia)", () => expect(stepValid(pf(), 1, 0)).toBe(true));
  it("PF CPF inválido → inválido", () => expect(stepValid(pf({ cpf: "111" }), 1, 0)).toBe(false));
});

describe("stepValid — Passo 2 Perfil (PJ 5 obrig · PF só Cliente)", () => {
  it("PJ com os 5 → válido", () => expect(stepValid(pj(), 2, 0)).toBe(true));
  it.each(["companyType", "companySize", "taxRegime", "operationType"] as const)(
    "PJ sem %s → inválido", (campo) => expect(stepValid(pj({ [campo]: "" } as Partial<PerfilEmpresaData>), 2, 0)).toBe(false)
  );
  it("PJ sem clientType → inválido", () => expect(stepValid(pj({ clientType: [] }), 2, 0)).toBe(false));
  it("PF não cobra TJ/Porte/Regime/Operação (vazios) → válido com Cliente", () =>
    expect(stepValid(pf(), 2, 0)).toBe(true));
  it("PF sem clientType → inválido", () => expect(stepValid(pf({ clientType: [] }), 2, 0)).toBe(false));
});

describe("stepValid — Passo 3 Descrição (≥100)", () => {
  it("descrição < 100 → inválido", () => expect(stepValid(pj(), 3, 99)).toBe(false));
  it("descrição = 100 → válido", () => expect(stepValid(pj(), 3, 100)).toBe(true));
});

describe("canSubmit — todos os passos anteriores válidos", () => {
  it("PJ completo + desc≥100 → pode submeter", () => expect(canSubmit(pj(), 100)).toBe(true));
  it("PJ completo mas desc<100 → NÃO pode", () => expect(canSubmit(pj(), 50)).toBe(false));
  it("PJ sem Porte → NÃO pode", () => expect(canSubmit(pj({ companySize: "" }), 100)).toBe(false));
  it("PF completo + desc≥100 → pode submeter", () => expect(canSubmit(pf(), 100)).toBe(true));
});

describe("F3 — stepHasContentFor (DoD: PJ todos têm · PF todos têm hoje)", () => {
  it.each([0, 1, 2, 3, 4, 5])("passo %i tem conteúdo para PJ", (s) =>
    expect(stepHasContentFor(s, false)).toBe(true));
  it.each([0, 1, 2, 3, 4, 5])("passo %i tem conteúdo para PF (hoje)", (s) =>
    expect(stepHasContentFor(s, true)).toBe(true));
  it("passo inexistente → false", () => expect(stepHasContentFor(99, false)).toBe(false));
});

describe("F3 — nextStep/prevStep com dados atuais (PF não pula nada hoje)", () => {
  it.each([[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 5]] as const)(
    "nextStep(%i, PF) = %i", (from, to) => expect(nextStep(from, true)).toBe(to));
  it.each([[5, 4], [4, 3], [3, 2], [2, 1], [1, 0], [0, 0]] as const)(
    "prevStep(%i, PF) = %i", (from, to) => expect(prevStep(from, true)).toBe(to));
});

describe("F3 — skip prova-de-futuro (predicado injetável: passos 1 e 2 sem conteúdo p/ PF)", () => {
  // se um passo virar só-PJ no futuro, a navegação pula automaticamente.
  const skip12 = (s: number, isPF: boolean) => (isPF && (s === 1 || s === 2) ? false : true);
  it("nextStep(0, PF) pula 1 e 2 → 3", () => expect(nextStep(0, true, skip12)).toBe(3));
  it("prevStep(3, PF) pula 2 e 1 → 0", () => expect(prevStep(3, true, skip12)).toBe(0));
  it("PJ não pula (skip só afeta PF)", () => expect(nextStep(0, false, skip12)).toBe(1));
});
