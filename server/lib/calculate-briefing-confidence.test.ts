/**
 * calculate-briefing-confidence.test.ts — fórmula ponderada v2 (2026-04-21)
 *
 * Valida:
 *   - Média ponderada Σ(wᵢ·cᵢ) / Σwᵢ
 *   - Aplicabilidade por tipo (produto / serviço / mista)
 *   - Modelo composto Q3 (30% cadastro + 70% respostas)
 *   - Q2 binário
 *   - Breakdown estruturado com detalhes por pilar
 *   - Caso real UAT 2026-04-21 (Distribuidora Alimentos Teste)
 */

import { describe, it, expect } from "vitest";
import {
  calculateBriefingConfidence,
  calculateBriefingConfidenceWithBreakdown,
  PESOS_CONFIANCA,
  Q3_PESO_CADASTRO,
  Q3_PESO_RESPOSTAS,
  type BriefingConfidenceSignals,
} from "./calculate-briefing-confidence";

const ZERO: BriefingConfidenceSignals = {
  perfilCompletude: 0,
  q1Respostas: 0,
  q1TotalPerguntas: 0,
  q2Respostas: 0,
  q3CnaeRespostas: 0,
  q3CnaeTotalPerguntas: 0,
  q3ProdutosCadastrados: 0,
  q3ProdutosComNCM: 0,
  q3ProdutosRespostas: 0,
  q3ProdutosTotalPerguntas: 0,
  q3ServicosCadastrados: 0,
  q3ServicosComNBS: 0,
  q3ServicosRespostas: 0,
  q3ServicosTotalPerguntas: 0,
  tipoEmpresa: "mista",
};

describe("calculate-briefing-confidence — v2 ponderada", () => {
  describe("pesos canônicos (fonte única da verdade)", () => {
    it("pesos 8/10/10/10/5/2", () => {
      expect(PESOS_CONFIANCA.perfil).toBe(8);
      expect(PESOS_CONFIANCA.q3Produtos).toBe(10);
      expect(PESOS_CONFIANCA.q3Servicos).toBe(10);
      expect(PESOS_CONFIANCA.q3Cnae).toBe(10);
      expect(PESOS_CONFIANCA.q1).toBe(5);
      expect(PESOS_CONFIANCA.q2).toBe(2);
    });

    it("Q3 composto: 30% cadastro + 70% respostas", () => {
      expect(Q3_PESO_CADASTRO).toBe(0.3);
      expect(Q3_PESO_RESPOSTAS).toBe(0.7);
    });

    it("denominador total por tipo — produto=35, servico=35, mista=45", () => {
      expect(8 + 10 + 10 + 5 + 2).toBe(35); // produto ou serviço
      expect(8 + 10 + 10 + 10 + 5 + 2).toBe(45); // mista
    });
  });

  describe("cenários canônicos", () => {
    it("tudo zero + mista → 0%", () => {
      expect(calculateBriefingConfidence(ZERO)).toBe(0);
    });

    it("tudo 100% + mista → 100%", () => {
      expect(
        calculateBriefingConfidence({
          perfilCompletude: 1,
          q1Respostas: 10,
          q1TotalPerguntas: 10,
          q2Respostas: 1,
          q3CnaeRespostas: 10,
          q3CnaeTotalPerguntas: 10,
          q3ProdutosCadastrados: 3,
          q3ProdutosComNCM: 3,
          q3ProdutosRespostas: 10,
          q3ProdutosTotalPerguntas: 10,
          q3ServicosCadastrados: 2,
          q3ServicosComNBS: 2,
          q3ServicosRespostas: 10,
          q3ServicosTotalPerguntas: 10,
          tipoEmpresa: "mista",
        })
      ).toBe(100);
    });
  });

  describe("modelo composto Q3 — regra crítica 30/70", () => {
    it("Q3 Produtos com 0 cadastrados → completude = 0", () => {
      const b = calculateBriefingConfidenceWithBreakdown({
        ...ZERO,
        perfilCompletude: 1,
        tipoEmpresa: "produto",
      });
      const q3p = b.pilares.find((p) => p.key === "q3Produtos")!;
      expect(q3p.completude).toBe(0);
      expect(q3p.contribuicao).toBe(0);
    });

    it("Q3 Produtos com 3 cadastrados e 0 NCM → ratio cadastro = 0, total = 0", () => {
      const b = calculateBriefingConfidenceWithBreakdown({
        ...ZERO,
        q3ProdutosCadastrados: 3,
        q3ProdutosComNCM: 0,
        q3ProdutosRespostas: 0,
        q3ProdutosTotalPerguntas: 0,
        tipoEmpresa: "produto",
      });
      const q3p = b.pilares.find((p) => p.key === "q3Produtos")!;
      expect(q3p.completude).toBe(0);
    });

    it("Q3 Produtos: 3/3 com NCM + 0 respostas → 0,3·1 + 0,7·0 = 30% do pilar", () => {
      const b = calculateBriefingConfidenceWithBreakdown({
        ...ZERO,
        q3ProdutosCadastrados: 3,
        q3ProdutosComNCM: 3,
        q3ProdutosRespostas: 0,
        q3ProdutosTotalPerguntas: 10,
        tipoEmpresa: "produto",
      });
      const q3p = b.pilares.find((p) => p.key === "q3Produtos")!;
      expect(q3p.completude).toBeCloseTo(0.3, 5);
      expect(q3p.contribuicao).toBeCloseTo(3, 5); // 10 · 0.3
    });

    it("Q3 Produtos: 3/3 NCM + 5/10 respostas → 0,3·1 + 0,7·0,5 = 0,65 → 65%", () => {
      const b = calculateBriefingConfidenceWithBreakdown({
        ...ZERO,
        q3ProdutosCadastrados: 3,
        q3ProdutosComNCM: 3,
        q3ProdutosRespostas: 5,
        q3ProdutosTotalPerguntas: 10,
        tipoEmpresa: "produto",
      });
      const q3p = b.pilares.find((p) => p.key === "q3Produtos")!;
      expect(q3p.completude).toBeCloseTo(0.65, 5);
    });

    it("Q3 Produtos: todos cadastrados com NCM + respostas completas → 100%", () => {
      const b = calculateBriefingConfidenceWithBreakdown({
        ...ZERO,
        q3ProdutosCadastrados: 5,
        q3ProdutosComNCM: 5,
        q3ProdutosRespostas: 20,
        q3ProdutosTotalPerguntas: 20,
        tipoEmpresa: "produto",
      });
      const q3p = b.pilares.find((p) => p.key === "q3Produtos")!;
      expect(q3p.completude).toBe(1);
    });

    it("Q3 Produtos: 2 cadastrados mas só 1 com NCM + respostas 0/10 → 0,3·0,5 + 0 = 15%", () => {
      const b = calculateBriefingConfidenceWithBreakdown({
        ...ZERO,
        q3ProdutosCadastrados: 2,
        q3ProdutosComNCM: 1,
        q3ProdutosRespostas: 0,
        q3ProdutosTotalPerguntas: 10,
        tipoEmpresa: "produto",
      });
      const q3p = b.pilares.find((p) => p.key === "q3Produtos")!;
      expect(q3p.completude).toBeCloseTo(0.15, 5);
    });
  });

  describe("Q2 IA Gen binário (limitação do schema atual)", () => {
    it("q2Respostas = 0 → completude 0", () => {
      const b = calculateBriefingConfidenceWithBreakdown(ZERO);
      expect(b.pilares.find((p) => p.key === "q2")!.completude).toBe(0);
    });

    it("q2Respostas >= 1 → completude 1 (binário)", () => {
      const b = calculateBriefingConfidenceWithBreakdown({ ...ZERO, q2Respostas: 1 });
      expect(b.pilares.find((p) => p.key === "q2")!.completude).toBe(1);
    });

    it("q2 sempre aplicável (entra no denominador)", () => {
      const b = calculateBriefingConfidenceWithBreakdown(ZERO);
      expect(b.pilares.find((p) => p.key === "q2")!.aplicavel).toBe(true);
    });
  });

  describe("caso real UAT 2026-04-21 (1.pdf — Distribuidora Alimentos Teste)", () => {
    it("perfil 100%, só Q1 respondido (10/10), 0 produtos — tipo mista → 29%", () => {
      const c = calculateBriefingConfidence({
        ...ZERO,
        perfilCompletude: 1,
        q1Respostas: 10,
        q1TotalPerguntas: 10,
        tipoEmpresa: "mista",
      });
      // Numerador: 8·1 + 10·0 + 10·0 + 10·0 + 5·1 + 2·0 = 13
      // Denominador: 8 + 10 + 10 + 10 + 5 + 2 = 45
      // 13/45 ≈ 28.89 → 29
      expect(c).toBe(29);
    });

    it("mesmo cenário + tipo produto → 37%", () => {
      const c = calculateBriefingConfidence({
        ...ZERO,
        perfilCompletude: 1,
        q1Respostas: 10,
        q1TotalPerguntas: 10,
        tipoEmpresa: "produto",
      });
      // Denominador: 8+10+10+5+2 = 35
      expect(c).toBe(37);
    });

    it("perfil 60% + Q1 1/10 (mista) → 5%", () => {
      const c = calculateBriefingConfidence({
        ...ZERO,
        perfilCompletude: 0.625, // 5/8 campos canônicos
        q1Respostas: 1,
        q1TotalPerguntas: 10,
        tipoEmpresa: "mista",
      });
      // Numerador: 8·0.625 + 5·0.1 = 5.5
      // 5.5/45 ≈ 12.22 → 12
      expect(c).toBe(12);
    });
  });

  describe("aplicabilidade por tipo de empresa", () => {
    it("tipo produto — Q3 Serviços fora do denominador", () => {
      const b = calculateBriefingConfidenceWithBreakdown({
        ...ZERO,
        perfilCompletude: 1,
        q1Respostas: 10,
        q1TotalPerguntas: 10,
        q2Respostas: 1,
        q3CnaeRespostas: 10,
        q3CnaeTotalPerguntas: 10,
        q3ProdutosCadastrados: 3,
        q3ProdutosComNCM: 3,
        q3ProdutosRespostas: 10,
        q3ProdutosTotalPerguntas: 10,
        tipoEmpresa: "produto",
      });
      expect(b.score).toBe(100);
      expect(b.pesoTotal).toBe(35);
      const q3s = b.pilares.find((p) => p.key === "q3Servicos")!;
      expect(q3s.aplicavel).toBe(false);
    });

    it("default sem tipoEmpresa = 'mista'", () => {
      const a = calculateBriefingConfidence({ ...ZERO });
      const b = calculateBriefingConfidence({ ...ZERO, tipoEmpresa: "mista" });
      expect(a).toBe(b);
    });
  });

  describe("breakdown — transparência ao cliente", () => {
    it("retorna 6 pilares na ordem canônica", () => {
      const b = calculateBriefingConfidenceWithBreakdown(ZERO);
      expect(b.pilares).toHaveLength(6);
      expect(b.pilares.map((p) => p.key)).toEqual([
        "perfil",
        "q3Produtos",
        "q3Servicos",
        "q3Cnae",
        "q1",
        "q2",
      ]);
    });

    it("rótulos PT-BR em cada pilar", () => {
      const b = calculateBriefingConfidenceWithBreakdown(ZERO);
      expect(b.pilares[0].label).toBe("Perfil da empresa");
      expect(b.pilares[1].label).toBe("Q3 Produtos (NCM)");
      expect(b.pilares[4].label).toBe("Q1 SOLARIS (Onda 1)");
    });

    it("Q3 carrega detalhe estruturado (ratioCadastro + ratioRespostas)", () => {
      const b = calculateBriefingConfidenceWithBreakdown({
        ...ZERO,
        q3ProdutosCadastrados: 3,
        q3ProdutosComNCM: 2,
        q3ProdutosRespostas: 4,
        q3ProdutosTotalPerguntas: 10,
        tipoEmpresa: "produto",
      });
      const q3p = b.pilares.find((p) => p.key === "q3Produtos")!;
      expect(q3p.detalhe?.ratioCadastro).toBeCloseTo(2 / 3, 5);
      expect(q3p.detalhe?.ratioRespostas).toBeCloseTo(0.4, 5);
      expect(q3p.detalhe?.cadastrados).toBe(3);
      expect(q3p.detalhe?.comClassificacao).toBe(2);
    });
  });

  describe("edge cases", () => {
    it("valores negativos tratados como 0", () => {
      const c = calculateBriefingConfidence({
        ...ZERO,
        q1Respostas: -5,
        q1TotalPerguntas: 10,
      });
      expect(c).toBe(0);
    });

    it("respostas > total → clampado em 100%", () => {
      const b = calculateBriefingConfidenceWithBreakdown({
        ...ZERO,
        perfilCompletude: 1,
        q1Respostas: 100, // > 10
        q1TotalPerguntas: 10,
        tipoEmpresa: "mista",
      });
      const q1 = b.pilares.find((p) => p.key === "q1")!;
      expect(q1.completude).toBe(1);
    });

    it("perfilCompletude > 1 clampado em 1", () => {
      const b = calculateBriefingConfidenceWithBreakdown({
        ...ZERO,
        perfilCompletude: 5,
      });
      expect(b.pilares.find((p) => p.key === "perfil")!.completude).toBe(1);
    });

    it("determinístico — mesmo input → mesmo output", () => {
      const input: BriefingConfidenceSignals = {
        perfilCompletude: 0.625,
        q1Respostas: 3,
        q1TotalPerguntas: 10,
        q2Respostas: 1,
        q3CnaeRespostas: 2,
        q3CnaeTotalPerguntas: 8,
        q3ProdutosCadastrados: 2,
        q3ProdutosComNCM: 1,
        q3ProdutosRespostas: 3,
        q3ProdutosTotalPerguntas: 10,
        q3ServicosCadastrados: 0,
        q3ServicosComNBS: 0,
        q3ServicosRespostas: 0,
        q3ServicosTotalPerguntas: 0,
        tipoEmpresa: "mista",
      };
      const a = calculateBriefingConfidenceWithBreakdown(input);
      const b = calculateBriefingConfidenceWithBreakdown(input);
      expect(a).toEqual(b);
    });
  });
});
