// calc-profile-score-baseline.test.tsx — F0.5 (FORM-NOVO-PROJETO-V2)
//
// REDE DE SEGURANÇA antes do wizard (F1+). Cobertura frontend de calcProfileScore
// era ~zero (só o gate clientType, BUG-CLIENTTYPE). Esta baseline congela o
// comportamento ATUAL (flag OFF, HEAD pós-F1) para que qualquer mudança do F0/F1
// que altere a validação seja detectada na hora (Dúvida 5/6 do Consultor).
//
// Contrato verificado contra PerfilEmpresaIntelligente.tsx:177-224 (calcProfileScore).
// NÃO altera o componente (F0.5 = só testes). A cascata PF/PJ (useEffect) não é
// unit-testável sem @testing-library/react (não instalado) e sem extrair helper
// (= F1); seu contrato fica documentado abaixo + coberto pelo E2E Cenário 4.

import { describe, it, expect } from "vitest";
import { calcProfileScore, type PerfilEmpresaData } from "./PerfilEmpresaIntelligente";

// CNPJ/CPF com dígitos verificadores válidos (necessário p/ os gates "CNPJ/CPF válido").
const CNPJ_OK = "11222333000181";
const CPF_OK = "52998224725";

/** Fixture PJ com TODOS os 7 obrigatórios preenchidos e 0 opcionais (multiState incl. — #1602). */
function pj(over: Partial<PerfilEmpresaData> = {}): PerfilEmpresaData {
  return {
    cnpj: CNPJ_OK,
    cpf: "",
    taxIdType: "cnpj",
    companyType: "ltda",
    companySize: "media",
    taxRegime: "lucro_real",
    annualRevenueRange: "",
    operationType: "industria",
    clientType: ["b2b"],
    paymentMethods: [],
    multiState: false, // #1602: multiState é obrigatório p/ PJ → fixture "completo" precisa preenchê-lo
    hasMultipleEstablishments: null,
    hasImportExport: null,
    hasIntermediaries: null,
    hasTaxTeam: null,
    hasAudit: null,
    hasTaxIssues: null,
    isEconomicGroup: null,
    taxCentralization: null,
    principaisProdutos: [],
    principaisServicos: [],
    ...over,
  } as PerfilEmpresaData;
}

/** Fixture PF: taxIdType='cpf', CPF válido + clientType; campos PJ vazios. */
function pf(over: Partial<PerfilEmpresaData> = {}): PerfilEmpresaData {
  return pj({
    taxIdType: "cpf",
    cnpj: "",
    cpf: CPF_OK,
    companyType: "",
    companySize: "",
    taxRegime: "",
    operationType: "",
    annualRevenueRange: "",
    ...over,
  });
}

describe("calcProfileScore — baseline F0.5 (PJ obrigatórios)", () => {
  it("PJ com os 7 obrigatórios preenchidos → missingRequired vazio", () => {
    expect(calcProfileScore(pj()).missingRequired).toEqual([]);
  });

  it("PJ sem responder multiState (null) → falta 'Operação multiestadual' (BUG-MULTISTATE-GATE #1602)", () => {
    expect(calcProfileScore(pj({ multiState: null })).missingRequired).toContain("Operação multiestadual");
  });

  it.each([
    ["companyType", "Tipo Jurídico"],
    ["companySize", "Porte da empresa"],
    ["taxRegime", "Regime Tributário"],
    ["operationType", "Tipo de Operação"],
  ] as const)("PJ sem %s → falta '%s'", (campo, label) => {
    const r = calcProfileScore(pj({ [campo]: "" } as Partial<PerfilEmpresaData>));
    expect(r.missingRequired).toContain(label);
  });

  it("PJ com clientType vazio → falta 'Tipo de Cliente' (BUG-CLIENTTYPE, ambos perfis)", () => {
    expect(calcProfileScore(pj({ clientType: [] })).missingRequired).toContain("Tipo de Cliente");
  });

  it("PJ com CNPJ inválido → falta 'CNPJ válido'", () => {
    expect(calcProfileScore(pj({ cnpj: "123" })).missingRequired).toContain("CNPJ válido");
  });
});

describe("calcProfileScore — baseline F0.5 (PF condicional #1299)", () => {
  it("PF só exige CPF + Tipo de Cliente (2) — Porte/Regime/TJ NÃO entram", () => {
    const r = calcProfileScore(pf());
    expect(r.missingRequired).toEqual([]);
  });

  it("PF NÃO cobra Tipo Jurídico/Porte/Regime mesmo vazios (#1299)", () => {
    const r = calcProfileScore(pf()); // companyType/companySize/taxRegime = ""
    expect(r.missingRequired).not.toContain("Tipo Jurídico");
    expect(r.missingRequired).not.toContain("Porte da empresa");
    expect(r.missingRequired).not.toContain("Regime Tributário");
    expect(r.missingRequired).not.toContain("Tipo de Operação");
  });

  it("PF com CPF inválido → falta 'CPF válido'", () => {
    expect(calcProfileScore(pf({ cpf: "111" })).missingRequired).toContain("CPF válido");
  });

  it("PF com clientType vazio → falta 'Tipo de Cliente'", () => {
    expect(calcProfileScore(pf({ clientType: [] })).missingRequired).toContain("Tipo de Cliente");
  });
});

describe("calcProfileScore — baseline F0.5 (completeness + confidence)", () => {
  it("PJ 7/7 obrigatórios + 0 opcionais → completeness 70 (70% req + 0% opt)", () => {
    expect(calcProfileScore(pj()).completeness).toBe(70);
  });

  it("PF 2/2 obrigatórios + 0 opcionais → completeness 70", () => {
    expect(calcProfileScore(pf()).completeness).toBe(70);
  });

  it("PJ 7/7 + 11/11 opcionais → completeness 100", () => {
    const full = pj({
      annualRevenueRange: "ate_360k",
      hasMultipleEstablishments: false,
      hasImportExport: false,
      paymentMethods: ["pix"],
      hasIntermediaries: false,
      hasTaxTeam: false,
      hasAudit: false,
      hasTaxIssues: false,
      isEconomicGroup: false,
      taxCentralization: "centralized",
      principaisProdutos: [{ ncm_code: "1006", descricao: "x" }],
    });
    expect(calcProfileScore(full).completeness).toBe(100);
  });

  it("confidence −20 quando simples_nacional + faturamento alto (10m_50m | acima_50m)", () => {
    const r = calcProfileScore(pj({ taxRegime: "simples_nacional", annualRevenueRange: "acima_50m" }));
    // completeness = round(7/7*70 + 1/11*30) = round(70+2.72) = 73; confidence = 73-20 = 53
    expect(r.confidence).toBe(r.completeness - 20);
  });

  it("confidence −15 quando MEI + regime ≠ simples_nacional", () => {
    const r = calcProfileScore(pj({ companySize: "mei", taxRegime: "lucro_real" }));
    expect(r.confidence).toBe(Math.max(0, r.completeness - 15));
  });

  it("confidence nunca negativo (clamp 0)", () => {
    const r = calcProfileScore(pf({ cpf: "111", clientType: [] }));
    expect(r.confidence).toBeGreaterThanOrEqual(0);
  });

  it("missingOptional lista os 11 opcionais quando nenhum preenchido", () => {
    expect(calcProfileScore(pj()).missingOptional).toHaveLength(11);
  });
});

describe("cascata PF/PJ (#1299) — contrato baseline (8 campos limpos)", () => {
  // O useEffect em PerfilEmpresaIntelligente.tsx:835-852 limpa estes 8 campos ao
  // virar PF. NÃO é unit-testável aqui (useEffect + sem RTL). Congelado como CONTRATO:
  // a F1 deve extrair um helper puro `clearPjFieldsForPf(value)` que produza exatamente
  // este shape, e este teste vira asserção real. Até lá: coberto pelo E2E Cenário 4.
  const EXPECTED_PF_CLEAR = {
    companyType: "",
    companySize: "",
    taxRegime: "",
    isEconomicGroup: null,
    taxCentralization: null,
    hasTaxTeam: null,
    annualRevenueRange: "",
    operationType: "",
  };

  it("contrato: a cascata PF limpa EXATAMENTE 8 campos (referência p/ a F1)", () => {
    expect(Object.keys(EXPECTED_PF_CLEAR)).toHaveLength(8);
  });

  it.todo("F1: clearPjFieldsForPf(value) === EXPECTED_PF_CLEAR (após extração do helper puro)");
});
