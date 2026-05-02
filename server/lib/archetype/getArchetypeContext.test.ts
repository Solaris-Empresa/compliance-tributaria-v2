/**
 * getArchetypeContext.test.ts — Sprint M3 NOVA-03
 *
 * Validação do helper centralizado. Cobre:
 *   - Backward-compat absoluta (null/undefined/string inválida → "")
 *   - Aceita JSON string OU objeto parseado
 *   - Formata 7 dimensões do PerfilDimensional
 *   - Omite dimensões vazias
 *   - Cenários canônicos: financeiro, transportadora, agro
 */
import { describe, it, expect } from "vitest";
import { getArchetypeContext } from "./getArchetypeContext";

describe("getArchetypeContext (NOVA-03 helper)", () => {
  describe("Backward-compat — fallback para string vazia", () => {
    it("retorna '' para null", () => {
      expect(getArchetypeContext(null)).toBe("");
    });

    it("retorna '' para undefined", () => {
      expect(getArchetypeContext(undefined)).toBe("");
    });

    it("retorna '' para string vazia", () => {
      expect(getArchetypeContext("")).toBe("");
    });

    it("retorna '' para JSON inválido (sem quebrar caller)", () => {
      expect(getArchetypeContext("not-json")).toBe("");
      expect(getArchetypeContext("{broken")).toBe("");
    });

    it("retorna '' para objeto vazio", () => {
      expect(getArchetypeContext({} as never)).toBe("");
    });
  });

  describe("Cenários canônicos (5 dimensões + contextuais)", () => {
    it("formata cenário financeiro completo", () => {
      const arch = {
        objeto: ["servico_financeiro"],
        papel_na_cadeia: "operadora_regulada",
        tipo_de_relacao: ["servico"],
        territorio: ["nacional"],
        regime: "lucro_real",
        subnatureza_setorial: ["financeiro"],
        orgao_regulador: ["BCB"],
        regime_especifico: [],
      };
      const result = getArchetypeContext(arch as never);
      expect(result).toContain("servico_financeiro");
      expect(result).toContain("operadora_regulada");
      expect(result).toContain("nacional");
      expect(result).toContain("lucro_real");
      expect(result).toContain("financeiro");
      expect(result).toContain("BCB");
    });

    it("formata cenário transportadora combustível (caso símbolo)", () => {
      const arch = {
        objeto: ["combustivel"],
        papel_na_cadeia: "transportador",
        tipo_de_relacao: ["servico"],
        territorio: ["nacional"],
        regime: "lucro_presumido",
        subnatureza_setorial: ["transporte_carga"],
        orgao_regulador: ["ANTT"],
        regime_especifico: [],
      };
      const result = getArchetypeContext(arch as never);
      expect(result).toContain("combustivel");
      expect(result).toContain("transportador");
      expect(result).toContain("ANTT");
    });

    it("formata cenário agro produtor", () => {
      const arch = {
        objeto: ["agricola"],
        papel_na_cadeia: "produtor",
        tipo_de_relacao: ["producao"],
        territorio: ["nacional"],
        regime: "lucro_presumido",
        subnatureza_setorial: ["agroindustria"],
        orgao_regulador: ["MAPA"],
        regime_especifico: [],
      };
      const result = getArchetypeContext(arch as never);
      expect(result).toContain("agricola");
      expect(result).toContain("produtor");
      expect(result).toContain("MAPA");
    });
  });

  describe("Omissão de dimensões vazias", () => {
    it("omite arrays vazios e mantém regime + papel", () => {
      const arch = {
        objeto: ["mercadoria"],
        papel_na_cadeia: "distribuidor",
        tipo_de_relacao: [],
        territorio: [],
        regime: "lucro_presumido",
        subnatureza_setorial: [],
        orgao_regulador: [],
        regime_especifico: [],
      };
      const result = getArchetypeContext(arch as never);
      expect(result).toContain("mercadoria");
      expect(result).toContain("distribuidor");
      expect(result).toContain("lucro_presumido");
      expect(result).not.toContain("Tipo de relação");
      expect(result).not.toContain("Território");
      expect(result).not.toContain("Subnatureza");
      expect(result).not.toContain("Órgão regulador");
    });

    it("omite arrays undefined/null sem quebrar", () => {
      const arch = {
        objeto: ["servico_geral"],
        papel_na_cadeia: "prestador",
        regime: "simples_nacional",
      };
      const result = getArchetypeContext(arch as never);
      expect(result).toContain("servico_geral");
      expect(result).toContain("prestador");
      expect(result).toContain("simples_nacional");
    });
  });

  describe("Aceita JSON string serializado", () => {
    it("desserializa JSON string e formata", () => {
      const arch = {
        objeto: ["alimento"],
        papel_na_cadeia: "varejista",
        regime: "simples_nacional",
        tipo_de_relacao: ["venda"],
        territorio: ["municipal"],
      };
      const result = getArchetypeContext(JSON.stringify(arch));
      expect(result).toContain("alimento");
      expect(result).toContain("varejista");
      expect(result).toContain("simples_nacional");
      expect(result).toContain("municipal");
    });
  });

  describe("Formato de output (separador)", () => {
    it("usa ' | ' como separador entre dimensões", () => {
      const arch = {
        objeto: ["servico_financeiro"],
        papel_na_cadeia: "operadora_regulada",
        regime: "lucro_real",
      };
      const result = getArchetypeContext(arch as never);
      expect(result).toMatch(/Objeto econômico:.*\|.*Papel na cadeia:.*\|.*Regime tributário:/);
    });

    it("não inclui pipe trailing quando única dimensão presente", () => {
      const arch = {
        regime: "mei",
      };
      const result = getArchetypeContext(arch as never);
      expect(result).toBe("Regime tributário: mei");
      expect(result).not.toMatch(/\|/);
    });
  });
});
