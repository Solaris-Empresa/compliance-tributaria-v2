// calc-profile-score.test.tsx — BUG-CLIENTTYPE (18/06/2026, Opção B)
// Contrato CHECKLIST-VAL-01: o gate frontend (calcProfileScore) DEVE exigir clientType
// em paridade com o backend Zod `clientType: z.array(z.string()).min(1)`
// (server/routers-fluxo-v3.ts:367, desde v2.1). Divergência (#1299 tornou opcional;
// #1300 F6 restaurou; backend nunca relaxou) foi exposta por re-deploy limpo.

import { describe, it, expect } from "vitest";
import { calcProfileScore } from "./PerfilEmpresaIntelligente";

// Fixture mínima — só os campos que calcProfileScore lê importam; arrays devem existir.
function mk(over: Record<string, unknown> = {}) {
  return {
    cnpj: "",
    cpf: "",
    taxIdType: "cnpj",
    companyType: "ltda",
    companySize: "media",
    taxRegime: "lucro_real",
    annualRevenueRange: "",
    operationType: "industria",
    clientType: [],
    paymentMethods: [],
    multiState: null,
    hasMultipleEstablishments: null,
    hasImportExport: null,
    hasSpecialRegimes: null,
    hasIntermediaries: null,
    hasTaxTeam: null,
    hasAudit: null,
    hasTaxIssues: null,
    isEconomicGroup: null,
    taxCentralization: null,
    principaisProdutos: [],
    principaisServicos: [],
    ...over,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("calcProfileScore — clientType obrigatório (BUG-CLIENTTYPE Opção B)", () => {
  it("PJ sem clientType → missingRequired inclui 'Tipo de Cliente'", () => {
    const r = calcProfileScore(mk({ taxIdType: "cnpj", clientType: [] }));
    expect(r.missingRequired).toContain("Tipo de Cliente");
  });

  it("PJ com clientType → NÃO falta 'Tipo de Cliente'", () => {
    const r = calcProfileScore(mk({ taxIdType: "cnpj", clientType: ["b2b"] }));
    expect(r.missingRequired).not.toContain("Tipo de Cliente");
  });

  it("PF sem clientType → missingRequired inclui 'Tipo de Cliente' (#1300 F6)", () => {
    const r = calcProfileScore(mk({ taxIdType: "cpf", clientType: [] }));
    expect(r.missingRequired).toContain("Tipo de Cliente");
  });

  it("PF com clientType → NÃO falta 'Tipo de Cliente'", () => {
    const r = calcProfileScore(mk({ taxIdType: "cpf", clientType: ["b2b"] }));
    expect(r.missingRequired).not.toContain("Tipo de Cliente");
  });
});
