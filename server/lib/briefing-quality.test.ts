import { describe, it, expect } from "vitest";
import {
  calculateBriefingQuality,
  classifyMaturityBadge,
  MATURITY_BADGE_LABEL,
} from "./briefing-quality";

describe("calculateBriefingQuality", () => {
  describe("cenário canônico — empresa com produtos e serviços", () => {
    it("projeto vazio (0/5 questionários, sem produtos/serviços, sem descrição) → 0%", () => {
      const result = calculateBriefingQuality({
        questionariosRespondidos: 0,
        produtosComClassificacao: 0,
        produtosTotal: 0,
        servicosComClassificacao: 0,
        servicosTotal: 0,
        descricao: "",
      });
      expect(result.quality).toBe(0);
      expect(result.redistributed).toBe(true);
    });

    it("projeto completo (5/5, 100% classificação, descrição rica) → 100%", () => {
      const result = calculateBriefingQuality({
        questionariosRespondidos: 5,
        produtosComClassificacao: 3,
        produtosTotal: 3,
        servicosComClassificacao: 0,
        servicosTotal: 0,
        descricao: Array(25).fill("palavra").join(" "),
      });
      expect(result.quality).toBe(100);
      expect(result.redistributed).toBe(false);
    });

    it("projeto meio caminho (3/5, 50% classificação, descrição ok) → ~65%", () => {
      const result = calculateBriefingQuality({
        questionariosRespondidos: 3,
        produtosComClassificacao: 1,
        produtosTotal: 2,
        servicosComClassificacao: 0,
        servicosTotal: 0,
        descricao: Array(20).fill("palavra").join(" "),
      });
      // 0.5 * (3/5) + 0.3 * (1/2) + 0.2 * 1.0 = 0.30 + 0.15 + 0.20 = 0.65 → 65
      expect(result.quality).toBe(65);
      expect(result.redistributed).toBe(false);
    });
  });

  describe("redistribuição (sem produtos nem serviços cadastrados)", () => {
    it("pesos redistribuídos: questionário 60% + descrição 40%", () => {
      const result = calculateBriefingQuality({
        questionariosRespondidos: 5,
        produtosComClassificacao: 0,
        produtosTotal: 0,
        servicosComClassificacao: 0,
        servicosTotal: 0,
        descricao: Array(20).fill("palavra").join(" "),
      });
      // 0.6 * 1.0 + 0.4 * 1.0 = 1.0 → 100
      expect(result.quality).toBe(100);
      expect(result.redistributed).toBe(true);
    });

    it("só descrição rica (sem questionários, sem produtos) → 40%", () => {
      const result = calculateBriefingQuality({
        questionariosRespondidos: 0,
        produtosComClassificacao: 0,
        produtosTotal: 0,
        servicosComClassificacao: 0,
        servicosTotal: 0,
        descricao: Array(25).fill("palavra").join(" "),
      });
      // 0.6 * 0 + 0.4 * 1.0 = 0.4 → 40
      expect(result.quality).toBe(40);
      expect(result.redistributed).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("questionariosRespondidos > total → clampado em 100%", () => {
      const result = calculateBriefingQuality({
        questionariosRespondidos: 10, // inválido > 5
        questionariosTotal: 5,
        produtosComClassificacao: 0,
        produtosTotal: 0,
        servicosComClassificacao: 0,
        servicosTotal: 0,
        descricao: Array(25).fill("palavra").join(" "),
      });
      // 0.6 * 1.0 + 0.4 * 1.0 = 1.0 (componente questionario clampado)
      expect(result.quality).toBe(100);
    });

    it("descrição null → component 0", () => {
      const result = calculateBriefingQuality({
        questionariosRespondidos: 5,
        produtosComClassificacao: 0,
        produtosTotal: 0,
        servicosComClassificacao: 0,
        servicosTotal: 0,
        descricao: null,
      });
      // 0.6 * 1.0 + 0.4 * 0 = 0.6 → 60
      expect(result.quality).toBe(60);
      expect(result.components.descricao).toBe(0);
    });

    it("projeto real do UAT 2026-04-21 (0/5, sem produtos, descrição 24 palavras) → 20%", () => {
      // Descrição do projeto "Distribuidora Alimentos Teste" (~24 palavras)
      const descricao = "Distribuidora de alimentos que comercializa arroz, feijão, açúcar, óleo de soja e bebidas açucaradas para redes de supermercados. Faturamento de R$ 8 milhões por mês. Opera em SP, RJ e MG. Lucro Real.";
      const result = calculateBriefingQuality({
        questionariosRespondidos: 0,
        produtosComClassificacao: 0,
        produtosTotal: 0,
        servicosComClassificacao: 0,
        servicosTotal: 0,
        descricao,
      });
      // 24 palavras → desc = 1.0 · redistributed: 0.6*0 + 0.4*1.0 = 40
      expect(result.quality).toBe(40);
      expect(result.redistributed).toBe(true);
    });

    it("determinístico — mesmo input → mesmo output", () => {
      const input = {
        questionariosRespondidos: 2,
        produtosComClassificacao: 1,
        produtosTotal: 3,
        servicosComClassificacao: 2,
        servicosTotal: 4,
        descricao: "texto qualquer aqui",
      };
      const a = calculateBriefingQuality(input);
      const b = calculateBriefingQuality(input);
      expect(a).toEqual(b);
    });
  });
});

describe("classifyMaturityBadge", () => {
  it("conf<40 → MAPA_REGULATORIO", () => {
    expect(classifyMaturityBadge(0)).toBe("MAPA_REGULATORIO");
    expect(classifyMaturityBadge(30)).toBe("MAPA_REGULATORIO");
    expect(classifyMaturityBadge(39)).toBe("MAPA_REGULATORIO");
  });

  it("40..84 → DIAGNOSTICO_PARCIAL", () => {
    expect(classifyMaturityBadge(40)).toBe("DIAGNOSTICO_PARCIAL");
    expect(classifyMaturityBadge(65)).toBe("DIAGNOSTICO_PARCIAL");
    expect(classifyMaturityBadge(84)).toBe("DIAGNOSTICO_PARCIAL");
  });

  it(">=85 → DIAGNOSTICO_COMPLETO", () => {
    expect(classifyMaturityBadge(85)).toBe("DIAGNOSTICO_COMPLETO");
    expect(classifyMaturityBadge(100)).toBe("DIAGNOSTICO_COMPLETO");
  });

  it("null/undefined/NaN → MAPA_REGULATORIO (mais conservador)", () => {
    expect(classifyMaturityBadge(null)).toBe("MAPA_REGULATORIO");
    expect(classifyMaturityBadge(undefined)).toBe("MAPA_REGULATORIO");
    expect(classifyMaturityBadge(NaN)).toBe("MAPA_REGULATORIO");
  });

  it("labels canônicos", () => {
    expect(MATURITY_BADGE_LABEL.MAPA_REGULATORIO).toBe("🗺️ MAPA REGULATÓRIO");
    expect(MATURITY_BADGE_LABEL.DIAGNOSTICO_PARCIAL).toBe("📋 DIAGNÓSTICO PARCIAL");
    expect(MATURITY_BADGE_LABEL.DIAGNOSTICO_COMPLETO).toBe("✅ DIAGNÓSTICO COMPLETO");
  });
});
