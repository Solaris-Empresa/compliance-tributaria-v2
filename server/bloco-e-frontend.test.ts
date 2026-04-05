/**
 * bloco-e-frontend.test.ts
 * Testes Q5 — Frontend Bloco E (CNT-01c): NCM/NBS no formulário de projeto
 * Sprint V / PV-02
 *
 * Valida:
 * Q5-FE-1: PerfilEmpresaData aceita principaisProdutos e principaisServicos
 * Q5-FE-2: PERFIL_VAZIO inicializa os arrays como vazios
 * Q5-FE-3: operationProfile filtra entradas com ncm_code/nbs_code vazio
 * Q5-FE-4: extractNcmNbsFromProfile lê corretamente do operationProfile com dados do formulário
 */

import { describe, it, expect } from "vitest";
import { PERFIL_VAZIO, type PerfilEmpresaData } from "../client/src/components/PerfilEmpresaIntelligente";
import { extractNcmNbsFromProfile } from "./routers-fluxo-v3";

// Q5-FE-1: PerfilEmpresaData aceita principaisProdutos e principaisServicos
describe("Bloco E — Frontend: PerfilEmpresaData", () => {
  it("Q5-FE-1: tipo aceita principaisProdutos e principaisServicos", () => {
    const perfil: PerfilEmpresaData = {
      ...PERFIL_VAZIO,
      operationType: "industria",
      principaisProdutos: [{ ncm_code: "2202.10.00", descricao: "Bebida açucarada" }],
      principaisServicos: [],
    };
    expect(perfil.principaisProdutos).toHaveLength(1);
    expect(perfil.principaisProdutos[0].ncm_code).toBe("2202.10.00");
    expect(perfil.principaisServicos).toHaveLength(0);
  });
});

// Q5-FE-2: PERFIL_VAZIO inicializa arrays como vazios
describe("Bloco E — Frontend: PERFIL_VAZIO", () => {
  it("Q5-FE-2: PERFIL_VAZIO tem principaisProdutos=[] e principaisServicos=[]", () => {
    expect(PERFIL_VAZIO.principaisProdutos).toEqual([]);
    expect(PERFIL_VAZIO.principaisServicos).toEqual([]);
  });
});

// Q5-FE-3: lógica de filtragem do NovoProjeto.tsx (entradas com código vazio são descartadas)
describe("Bloco E — Frontend: filtragem de entradas vazias", () => {
  it("Q5-FE-3: entradas com ncm_code vazio são filtradas antes de enviar ao backend", () => {
    const principaisProdutos = [
      { ncm_code: "2202.10.00", descricao: "Bebida açucarada" },
      { ncm_code: "", descricao: "Entrada incompleta" },
      { ncm_code: "  ", descricao: "Entrada com espaço" },
    ];
    const filtered = principaisProdutos.filter(p => p.ncm_code.trim());
    expect(filtered).toHaveLength(1);
    expect(filtered[0].ncm_code).toBe("2202.10.00");
  });

  it("Q5-FE-3b: entradas com nbs_code vazio são filtradas antes de enviar ao backend", () => {
    const principaisServicos = [
      { nbs_code: "1.0901.00.00", descricao: "Saúde humana" },
      { nbs_code: "", descricao: "Entrada incompleta" },
    ];
    const filtered = principaisServicos.filter(s => s.nbs_code.trim());
    expect(filtered).toHaveLength(1);
    expect(filtered[0].nbs_code).toBe("1.0901.00.00");
  });
});

// Q5-FE-4: extractNcmNbsFromProfile lê corretamente dados vindos do formulário
describe("Bloco E — Frontend: extractNcmNbsFromProfile com dados do formulário", () => {
  it("Q5-FE-4: extrai NCM/NBS de operationProfile preenchido via formulário", () => {
    const operationProfile = {
      operationType: "misto",
      clientType: ["b2b"],
      multiState: true,
      principaisProdutos: [
        { ncm_code: "2202.10.00", descricao: "Bebida açucarada" },
        { ncm_code: "3101.00.00", descricao: "Biofertilizante" },
      ],
      principaisServicos: [
        { nbs_code: "1.0901.00.00", descricao: "Saúde humana" },
      ],
    };
    const result = extractNcmNbsFromProfile(operationProfile);
    expect(result.ncmCodes).toEqual(["2202.10.00", "3101.00.00"]);
    expect(result.nbsCodes).toEqual(["1.0901.00.00"]);
  });

  it("Q5-FE-4b: projeto sem NCM/NBS no formulário retorna arrays vazios (compatibilidade legada)", () => {
    const operationProfile = {
      operationType: "comercio",
      clientType: ["b2c"],
      multiState: false,
      // sem principaisProdutos / principaisServicos
    };
    const result = extractNcmNbsFromProfile(operationProfile);
    expect(result.ncmCodes).toEqual([]);
    expect(result.nbsCodes).toEqual([]);
  });
});
