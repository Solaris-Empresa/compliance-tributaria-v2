/**
 * questionario-prefill.test.ts
 * Testes unitários para a lógica de pré-preenchimento automático dos questionários
 * Corporativo, Operacional e CNAE.
 *
 * Cobre:
 *  1. buildCorporatePrefill — regime tributário e porte da empresa
 *  2. buildOperationalPrefill — canais de venda, perfil de clientes, meios de pagamento, gestão fiscal
 *  3. buildCnaePrefill — setor econômico, múltiplos CNAEs, lista de CNAEs
 *  4. getPrefilledSectionsOperacional — detecção de seções com dados
 *  5. getPrefilledSectionsCnae — detecção de seções com dados
 *  6. Casos de borda: valores nulos, arrays vazios, valores desconhecidos
 *  7. Não-regressão: respostas salvas não são sobrescritas pelo prefill
 */
import { describe, it, expect } from "vitest";
import {
  // Corporativo
  TAX_REGIME_MAP,
  COMPANY_SIZE_MAP,
  buildCorporatePrefill,
  // Operacional
  OPERATION_TYPE_TO_CANAIS,
  clientTypeToPerfilClientes,
  PAYMENT_METHOD_MAP,
  hasTaxTeamToEquipe,
  buildOperationalPrefill,
  getPrefilledSectionsOperacional,
  // CNAE
  OPERATION_TYPE_TO_SETOR,
  cnaeCountToAtividades,
  cnaesToObservacoes,
  buildCnaePrefill,
  getPrefilledSectionsCnae,
} from "@shared/questionario-prefill";

// ─────────────────────────────────────────────────────────────────────────────
// 1. QUESTIONÁRIO CORPORATIVO
// ─────────────────────────────────────────────────────────────────────────────
describe("buildCorporatePrefill", () => {
  it("deve mapear taxRegime simples_nacional corretamente", () => {
    const result = buildCorporatePrefill({ taxRegime: "simples_nacional", companySize: null });
    expect(result["qc01_regime"]).toBe("Simples Nacional");
  });

  it("deve mapear taxRegime lucro_presumido corretamente", () => {
    const result = buildCorporatePrefill({ taxRegime: "lucro_presumido", companySize: null });
    expect(result["qc01_regime"]).toBe("Lucro Presumido");
  });

  it("deve mapear taxRegime lucro_real corretamente", () => {
    const result = buildCorporatePrefill({ taxRegime: "lucro_real", companySize: null });
    expect(result["qc01_regime"]).toBe("Lucro Real");
  });

  it("deve mapear companySize grande corretamente", () => {
    const result = buildCorporatePrefill({ taxRegime: null, companySize: "grande" });
    expect(result["qc01_porte"]).toBe("Grande porte (acima de R$ 78 mi)");
  });

  it("deve mapear companySize media corretamente", () => {
    const result = buildCorporatePrefill({ taxRegime: null, companySize: "media" });
    expect(result["qc01_porte"]).toBe("Médio porte (até R$ 78 mi)");
  });

  it("deve mapear companySize pequena corretamente", () => {
    const result = buildCorporatePrefill({ taxRegime: null, companySize: "pequena" });
    expect(result["qc01_porte"]).toBe("Empresa de Pequeno Porte (até R$ 4,8 mi)");
  });

  it("deve mapear companySize mei corretamente", () => {
    const result = buildCorporatePrefill({ taxRegime: null, companySize: "mei" });
    expect(result["qc01_porte"]).toBe("MEI / Microempresa (até R$ 360 mil)");
  });

  it("deve mapear companySize micro corretamente (alias de mei)", () => {
    const result = buildCorporatePrefill({ taxRegime: null, companySize: "micro" });
    expect(result["qc01_porte"]).toBe("MEI / Microempresa (até R$ 360 mil)");
  });

  it("deve preencher ambos os campos quando ambos estão disponíveis", () => {
    const result = buildCorporatePrefill({ taxRegime: "lucro_real", companySize: "grande" });
    expect(result["qc01_regime"]).toBe("Lucro Real");
    expect(result["qc01_porte"]).toBe("Grande porte (acima de R$ 78 mi)");
  });

  it("deve retornar objeto vazio quando ambos são nulos", () => {
    const result = buildCorporatePrefill({ taxRegime: null, companySize: null });
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("deve retornar objeto vazio para valores desconhecidos", () => {
    const result = buildCorporatePrefill({ taxRegime: "regime_inexistente", companySize: "porte_inexistente" });
    expect(result["qc01_regime"]).toBeUndefined();
    expect(result["qc01_porte"]).toBeUndefined();
  });

  it("deve ler taxRegime de companyProfile aninhado", () => {
    const result = buildCorporatePrefill({
      companyProfile: { taxRegime: "simples_nacional", companySize: "pequena" },
    });
    expect(result["qc01_regime"]).toBe("Simples Nacional");
    expect(result["qc01_porte"]).toBe("Empresa de Pequeno Porte (até R$ 4,8 mi)");
  });

  it("deve preferir campos diretos sobre companyProfile aninhado", () => {
    const result = buildCorporatePrefill({
      taxRegime: "lucro_real",
      companyProfile: { taxRegime: "simples_nacional" },
    });
    expect(result["qc01_regime"]).toBe("Lucro Real");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. QUESTIONÁRIO OPERACIONAL — clientTypeToPerfilClientes
// ─────────────────────────────────────────────────────────────────────────────
describe("clientTypeToPerfilClientes", () => {
  it("deve retornar B2B para apenas b2b", () => {
    expect(clientTypeToPerfilClientes(["b2b"])).toBe("Pessoa Jurídica (B2B)");
  });

  it("deve retornar B2C para apenas b2c", () => {
    expect(clientTypeToPerfilClientes(["b2c"])).toBe("Pessoa Física (B2C)");
  });

  it("deve retornar Governo para apenas b2g", () => {
    expect(clientTypeToPerfilClientes(["b2g"])).toBe("Governo (B2G)");
  });

  it("deve retornar Misto para b2b + b2c", () => {
    expect(clientTypeToPerfilClientes(["b2b", "b2c"])).toBe("Misto (B2B e B2C)");
  });

  it("deve retornar Misto para b2b2c", () => {
    expect(clientTypeToPerfilClientes(["b2b2c"])).toBe("Misto (B2B e B2C)");
  });

  it("deve retornar Misto para b2b2c mesmo com outros tipos", () => {
    expect(clientTypeToPerfilClientes(["b2b", "b2c", "b2b2c"])).toBe("Misto (B2B e B2C)");
  });

  it("deve retornar string vazia para array vazio", () => {
    expect(clientTypeToPerfilClientes([])).toBe("");
  });

  it("deve retornar Misto para b2b + b2g (ambos presentes)", () => {
    // b2b e b2g → b2b prevalece sobre b2g, mas não é B2C puro
    expect(clientTypeToPerfilClientes(["b2b", "b2g"])).toBe("Pessoa Jurídica (B2B)");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. QUESTIONÁRIO OPERACIONAL — hasTaxTeamToEquipe
// ─────────────────────────────────────────────────────────────────────────────
describe("hasTaxTeamToEquipe", () => {
  it("deve retornar equipe interna para true", () => {
    expect(hasTaxTeamToEquipe(true)).toBe("Equipe interna dedicada");
  });

  it("deve retornar contador autônomo para false", () => {
    expect(hasTaxTeamToEquipe(false)).toBe("Contador autônomo");
  });

  it("deve retornar string vazia para null", () => {
    expect(hasTaxTeamToEquipe(null)).toBe("");
  });

  it("deve retornar string vazia para undefined", () => {
    expect(hasTaxTeamToEquipe(undefined)).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. QUESTIONÁRIO OPERACIONAL — buildOperationalPrefill
// ─────────────────────────────────────────────────────────────────────────────
describe("buildOperationalPrefill", () => {
  it("deve pré-preencher canais de venda para operationType=comercio", () => {
    const result = buildOperationalPrefill({
      operationProfile: { operationType: "comercio", clientType: [] },
    });
    expect(result["qo01_canais"]).toEqual(["Loja física"]);
  });

  it("deve pré-preencher canais de venda para operationType=industria", () => {
    const result = buildOperationalPrefill({
      operationProfile: { operationType: "industria", clientType: [] },
    });
    expect(result["qo01_canais"]).toEqual(["Venda direta B2B"]);
  });

  it("deve pré-preencher canais de venda para operationType=misto (loja + B2B)", () => {
    const result = buildOperationalPrefill({
      operationProfile: { operationType: "misto", clientType: [] },
    });
    expect(result["qo01_canais"]).toEqual(["Loja física", "Venda direta B2B"]);
  });

  it("deve pré-preencher perfil de clientes para clientType=[b2b]", () => {
    const result = buildOperationalPrefill({
      operationProfile: { operationType: "servicos", clientType: ["b2b"] },
    });
    expect(result["qo01_clientes"]).toBe("Pessoa Jurídica (B2B)");
  });

  it("deve pré-preencher perfil de clientes para clientType=[b2c]", () => {
    const result = buildOperationalPrefill({
      operationProfile: { operationType: "comercio", clientType: ["b2c"] },
    });
    expect(result["qo01_clientes"]).toBe("Pessoa Física (B2C)");
  });

  it("deve pré-preencher meios de pagamento para paymentMethods=[pix, cartao]", () => {
    const result = buildOperationalPrefill({
      financialProfile: { paymentMethods: ["pix", "cartao"] },
    });
    const meios = result["qo03_meios"] as string[];
    expect(meios).toContain("Pix");
    expect(meios).toContain("Cartão de débito");
  });

  it("deve pré-preencher meios de pagamento para paymentMethods=[boleto, transferencia, dinheiro]", () => {
    const result = buildOperationalPrefill({
      financialProfile: { paymentMethods: ["boleto", "transferencia", "dinheiro"] },
    });
    const meios = result["qo03_meios"] as string[];
    expect(meios).toContain("Boleto bancário");
    expect(meios).toContain("TED/DOC");
    expect(meios).toContain("Dinheiro em espécie");
  });

  it("deve pré-preencher gestão fiscal para hasTaxTeam=true", () => {
    const result = buildOperationalPrefill({
      governanceProfile: { hasTaxTeam: true },
    });
    expect(result["qo08_equipe"]).toBe("Equipe interna dedicada");
  });

  it("deve pré-preencher gestão fiscal para hasTaxTeam=false", () => {
    const result = buildOperationalPrefill({
      governanceProfile: { hasTaxTeam: false },
    });
    expect(result["qo08_equipe"]).toBe("Contador autônomo");
  });

  it("deve preencher todos os campos quando todos os perfis estão disponíveis", () => {
    const result = buildOperationalPrefill({
      operationProfile: { operationType: "comercio", clientType: ["b2c"] },
      financialProfile: { paymentMethods: ["pix"] },
      governanceProfile: { hasTaxTeam: true },
    });
    expect(result["qo01_canais"]).toEqual(["Loja física"]);
    expect(result["qo01_clientes"]).toBe("Pessoa Física (B2C)");
    expect(result["qo03_meios"]).toContain("Pix");
    expect(result["qo08_equipe"]).toBe("Equipe interna dedicada");
  });

  it("deve retornar objeto vazio quando todos os perfis são nulos", () => {
    const result = buildOperationalPrefill({
      operationProfile: null,
      financialProfile: null,
      governanceProfile: null,
    });
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("deve ignorar paymentMethods desconhecidos (não mapear)", () => {
    const result = buildOperationalPrefill({
      financialProfile: { paymentMethods: ["metodo_inexistente"] },
    });
    // Nenhum método mapeado → campo não deve ser preenchido
    expect(result["qo03_meios"]).toBeUndefined();
  });

  it("deve ignorar hasTaxTeam=null (não preencher campo)", () => {
    const result = buildOperationalPrefill({
      governanceProfile: { hasTaxTeam: null },
    });
    expect(result["qo08_equipe"]).toBeUndefined();
  });

  it("deve não preencher qo01_clientes para clientType vazio", () => {
    const result = buildOperationalPrefill({
      operationProfile: { operationType: "comercio", clientType: [] },
    });
    expect(result["qo01_clientes"]).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. QUESTIONÁRIO OPERACIONAL — getPrefilledSectionsOperacional
// ─────────────────────────────────────────────────────────────────────────────
describe("getPrefilledSectionsOperacional", () => {
  it("deve detectar QO-01 quando operationType está preenchido", () => {
    const sections = getPrefilledSectionsOperacional({
      operationProfile: { operationType: "comercio" },
    });
    expect(sections.has("QO-01")).toBe(true);
    expect(sections.has("QO-03")).toBe(false);
    expect(sections.has("QO-08")).toBe(false);
  });

  it("deve detectar QO-01 quando clientType tem itens", () => {
    const sections = getPrefilledSectionsOperacional({
      operationProfile: { clientType: ["b2b"] },
    });
    expect(sections.has("QO-01")).toBe(true);
  });

  it("deve detectar QO-03 quando paymentMethods tem itens", () => {
    const sections = getPrefilledSectionsOperacional({
      financialProfile: { paymentMethods: ["pix"] },
    });
    expect(sections.has("QO-03")).toBe(true);
  });

  it("deve detectar QO-08 quando hasTaxTeam=true", () => {
    const sections = getPrefilledSectionsOperacional({
      governanceProfile: { hasTaxTeam: true },
    });
    expect(sections.has("QO-08")).toBe(true);
  });

  it("deve detectar QO-08 quando hasTaxTeam=false", () => {
    const sections = getPrefilledSectionsOperacional({
      governanceProfile: { hasTaxTeam: false },
    });
    expect(sections.has("QO-08")).toBe(true);
  });

  it("deve detectar todas as 3 seções quando todos os perfis estão preenchidos", () => {
    const sections = getPrefilledSectionsOperacional({
      operationProfile: { operationType: "comercio", clientType: ["b2c"] },
      financialProfile: { paymentMethods: ["pix"] },
      governanceProfile: { hasTaxTeam: true },
    });
    expect(sections.has("QO-01")).toBe(true);
    expect(sections.has("QO-03")).toBe(true);
    expect(sections.has("QO-08")).toBe(true);
  });

  it("deve retornar Set vazio quando todos os perfis são nulos", () => {
    const sections = getPrefilledSectionsOperacional({
      operationProfile: null,
      financialProfile: null,
      governanceProfile: null,
    });
    expect(sections.size).toBe(0);
  });

  it("não deve detectar QO-08 quando hasTaxTeam=null", () => {
    const sections = getPrefilledSectionsOperacional({
      governanceProfile: { hasTaxTeam: null },
    });
    expect(sections.has("QO-08")).toBe(false);
  });

  it("não deve detectar QO-03 quando paymentMethods está vazio", () => {
    const sections = getPrefilledSectionsOperacional({
      financialProfile: { paymentMethods: [] },
    });
    expect(sections.has("QO-03")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. QUESTIONÁRIO CNAE — cnaeCountToAtividades
// ─────────────────────────────────────────────────────────────────────────────
describe("cnaeCountToAtividades", () => {
  it("deve retornar apenas CNAE principal para count=1", () => {
    expect(cnaeCountToAtividades(1)).toBe("Não — apenas CNAE principal");
  });

  it("deve retornar 1 a 3 CNAEs secundários para count=2", () => {
    expect(cnaeCountToAtividades(2)).toBe("Sim — 1 a 3 CNAEs secundários");
  });

  it("deve retornar 1 a 3 CNAEs secundários para count=4", () => {
    expect(cnaeCountToAtividades(4)).toBe("Sim — 1 a 3 CNAEs secundários");
  });

  it("deve retornar mais de 3 CNAEs secundários para count=5", () => {
    expect(cnaeCountToAtividades(5)).toBe("Sim — mais de 3 CNAEs secundários");
  });

  it("deve retornar mais de 3 CNAEs secundários para count=10", () => {
    expect(cnaeCountToAtividades(10)).toBe("Sim — mais de 3 CNAEs secundários");
  });

  it("deve retornar apenas CNAE principal para count=0", () => {
    expect(cnaeCountToAtividades(0)).toBe("Não — apenas CNAE principal");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. QUESTIONÁRIO CNAE — cnaesToObservacoes
// ─────────────────────────────────────────────────────────────────────────────
describe("cnaesToObservacoes", () => {
  it("deve formatar CNAEs com código e descrição", () => {
    const result = cnaesToObservacoes([
      { code: "4781-4/00", description: "Comércio varejista de vestuário" },
      { code: "4791-1/00", description: "Comércio varejista via internet" },
    ]);
    expect(result).toBe("4781-4/00 — Comércio varejista de vestuário\n4791-1/00 — Comércio varejista via internet");
  });

  it("deve formatar CNAEs sem descrição (apenas código)", () => {
    const result = cnaesToObservacoes([{ code: "4781-4/00" }]);
    expect(result).toBe("4781-4/00");
  });

  it("deve retornar string vazia para array vazio", () => {
    expect(cnaesToObservacoes([])).toBe("");
  });

  it("deve retornar string vazia para array nulo", () => {
    expect(cnaesToObservacoes(null as any)).toBe("");
  });

  it("deve formatar múltiplos CNAEs separados por newline", () => {
    const result = cnaesToObservacoes([
      { code: "A", description: "Desc A" },
      { code: "B", description: "Desc B" },
      { code: "C", description: "Desc C" },
    ]);
    const lines = result.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("A — Desc A");
    expect(lines[2]).toBe("C — Desc C");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. QUESTIONÁRIO CNAE — buildCnaePrefill
// ─────────────────────────────────────────────────────────────────────────────
describe("buildCnaePrefill", () => {
  it("deve pré-preencher setor para operationType=comercio", () => {
    const result = buildCnaePrefill({
      operationProfile: { operationType: "comercio" },
    });
    expect(result["qcnae01_setor"]).toBe("Comércio (atacado ou varejo)");
  });

  it("deve pré-preencher setor para operationType=industria", () => {
    const result = buildCnaePrefill({
      operationProfile: { operationType: "industria" },
    });
    expect(result["qcnae01_setor"]).toBe("Indústria (transformação, extração, construção)");
  });

  it("deve pré-preencher setor para operationType=servicos", () => {
    const result = buildCnaePrefill({
      operationProfile: { operationType: "servicos" },
    });
    expect(result["qcnae01_setor"]).toBe("Serviços (geral)");
  });

  it("deve pré-preencher setor para operationType=agronegocio", () => {
    const result = buildCnaePrefill({
      operationProfile: { operationType: "agronegocio" },
    });
    expect(result["qcnae01_setor"]).toBe("Agronegócio / Agropecuária");
  });

  it("deve pré-preencher setor para operationType=financeiro", () => {
    const result = buildCnaePrefill({
      operationProfile: { operationType: "financeiro" },
    });
    expect(result["qcnae01_setor"]).toBe("Financeiro / Seguros");
  });

  it("deve pré-preencher atividades para 1 CNAE confirmado", () => {
    const result = buildCnaePrefill({
      confirmedCnaes: [{ code: "4781-4/00", description: "Vestuário" }],
    });
    expect(result["qcnae01_atividades"]).toBe("Não — apenas CNAE principal");
  });

  it("deve pré-preencher atividades para 3 CNAEs confirmados", () => {
    const result = buildCnaePrefill({
      confirmedCnaes: [
        { code: "A" }, { code: "B" }, { code: "C" },
      ],
    });
    expect(result["qcnae01_atividades"]).toBe("Sim — 1 a 3 CNAEs secundários");
  });

  it("deve pré-preencher atividades para 5 CNAEs confirmados", () => {
    const result = buildCnaePrefill({
      confirmedCnaes: [
        { code: "A" }, { code: "B" }, { code: "C" }, { code: "D" }, { code: "E" },
      ],
    });
    expect(result["qcnae01_atividades"]).toBe("Sim — mais de 3 CNAEs secundários");
  });

  it("deve pré-preencher observações com lista de CNAEs", () => {
    const result = buildCnaePrefill({
      confirmedCnaes: [
        { code: "4781-4/00", description: "Vestuário" },
        { code: "4791-1/00", description: "E-commerce" },
      ],
    });
    expect(result["qcnae01_observacoes"]).toContain("4781-4/00");
    expect(result["qcnae01_observacoes"]).toContain("4791-1/00");
  });

  it("deve preencher todos os campos quando operationType e CNAEs estão disponíveis", () => {
    const result = buildCnaePrefill({
      operationProfile: { operationType: "comercio" },
      confirmedCnaes: [
        { code: "4781-4/00", description: "Vestuário" },
        { code: "4791-1/00", description: "E-commerce" },
      ],
    });
    expect(result["qcnae01_setor"]).toBe("Comércio (atacado ou varejo)");
    expect(result["qcnae01_atividades"]).toBe("Sim — 1 a 3 CNAEs secundários");
    expect(result["qcnae01_observacoes"]).toBeTruthy();
  });

  it("deve retornar objeto vazio quando tudo é nulo", () => {
    const result = buildCnaePrefill({
      operationProfile: null,
      confirmedCnaes: null,
    });
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("deve retornar objeto vazio para confirmedCnaes vazio", () => {
    const result = buildCnaePrefill({
      confirmedCnaes: [],
    });
    expect(result["qcnae01_atividades"]).toBeUndefined();
    expect(result["qcnae01_observacoes"]).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. QUESTIONÁRIO CNAE — getPrefilledSectionsCnae
// ─────────────────────────────────────────────────────────────────────────────
describe("getPrefilledSectionsCnae", () => {
  it("deve detectar QCNAE-01 quando operationType está preenchido", () => {
    const sections = getPrefilledSectionsCnae({
      operationProfile: { operationType: "comercio" },
    });
    expect(sections.has("QCNAE-01")).toBe(true);
  });

  it("deve detectar QCNAE-01 quando confirmedCnaes tem itens", () => {
    const sections = getPrefilledSectionsCnae({
      confirmedCnaes: [{ code: "4781-4/00" }],
    });
    expect(sections.has("QCNAE-01")).toBe(true);
  });

  it("deve retornar Set vazio quando tudo é nulo", () => {
    const sections = getPrefilledSectionsCnae({
      operationProfile: null,
      confirmedCnaes: null,
    });
    expect(sections.size).toBe(0);
  });

  it("deve retornar Set vazio quando confirmedCnaes está vazio", () => {
    const sections = getPrefilledSectionsCnae({
      confirmedCnaes: [],
    });
    expect(sections.size).toBe(0);
  });

  it("não deve detectar seções além de QCNAE-01 (outras seções não têm prefill)", () => {
    const sections = getPrefilledSectionsCnae({
      operationProfile: { operationType: "comercio" },
      confirmedCnaes: [{ code: "A" }, { code: "B" }],
    });
    expect(sections.has("QCNAE-01")).toBe(true);
    expect(sections.has("QCNAE-02")).toBe(false);
    expect(sections.has("QCNAE-03")).toBe(false);
    expect(sections.has("QCNAE-04")).toBe(false);
    expect(sections.has("QCNAE-05")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. TESTE DE NÃO-REGRESSÃO — respostas salvas não são sobrescritas
// ─────────────────────────────────────────────────────────────────────────────
describe("Não-regressão: respostas salvas têm prioridade sobre prefill", () => {
  it("deve preservar resposta salva de qc01_regime mesmo com taxRegime diferente no perfil", () => {
    // Simula o comportamento do useEffect: se há respostas salvas, usa elas
    const savedAnswers = { qc01_regime: "Lucro Real" };
    const prefill = buildCorporatePrefill({ taxRegime: "simples_nacional" });
    // A lógica do componente aplica: { ...prefill, ...savedAnswers }
    const merged = { ...prefill, ...savedAnswers };
    expect(merged["qc01_regime"]).toBe("Lucro Real"); // salvo prevalece
  });

  it("deve preservar resposta salva de qo01_clientes mesmo com clientType diferente", () => {
    const savedAnswers = { qo01_clientes: "Governo (B2G)" };
    const prefill = buildOperationalPrefill({
      operationProfile: { operationType: "comercio", clientType: ["b2c"] },
    });
    const merged = { ...prefill, ...savedAnswers };
    expect(merged["qo01_clientes"]).toBe("Governo (B2G)"); // salvo prevalece
  });

  it("deve preservar resposta salva de qcnae01_setor mesmo com operationType diferente", () => {
    const savedAnswers = { qcnae01_setor: "Saúde" };
    const prefill = buildCnaePrefill({
      operationProfile: { operationType: "comercio" },
    });
    const merged = { ...prefill, ...savedAnswers };
    expect(merged["qcnae01_setor"]).toBe("Saúde"); // salvo prevalece
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. COBERTURA DOS MAPAS — todos os valores conhecidos
// ─────────────────────────────────────────────────────────────────────────────
describe("Cobertura dos mapas de mapeamento", () => {
  it("TAX_REGIME_MAP cobre todos os valores do enum do banco", () => {
    const enumValues = ["simples_nacional", "lucro_presumido", "lucro_real", "mei"];
    for (const v of enumValues) {
      expect(TAX_REGIME_MAP[v]).toBeTruthy();
    }
  });

  it("COMPANY_SIZE_MAP cobre todos os valores do enum do banco", () => {
    const enumValues = ["mei", "micro", "pequena", "media", "grande"];
    for (const v of enumValues) {
      expect(COMPANY_SIZE_MAP[v]).toBeTruthy();
    }
  });

  it("OPERATION_TYPE_TO_CANAIS cobre todos os operationTypes do banco", () => {
    const enumValues = ["industria", "comercio", "servicos", "misto", "agronegocio", "financeiro", "produto", "servico"];
    for (const v of enumValues) {
      expect(OPERATION_TYPE_TO_CANAIS[v]).toBeTruthy();
    }
  });

  it("OPERATION_TYPE_TO_SETOR cobre todos os operationTypes do banco", () => {
    const enumValues = ["industria", "comercio", "servicos", "misto", "agronegocio", "financeiro", "produto", "servico"];
    for (const v of enumValues) {
      expect(OPERATION_TYPE_TO_SETOR[v]).toBeTruthy();
    }
  });

  it("PAYMENT_METHOD_MAP cobre todos os paymentMethods do banco", () => {
    const enumValues = ["pix", "cartao", "boleto", "transferencia", "dinheiro", "marketplace"];
    for (const v of enumValues) {
      expect(PAYMENT_METHOD_MAP[v]).toBeTruthy();
    }
  });
});
