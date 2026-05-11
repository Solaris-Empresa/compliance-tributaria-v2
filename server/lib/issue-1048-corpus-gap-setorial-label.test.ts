/**
 * Issue #1048 — label briefing "30% (2/2 NCM)" → mensagem corpus_gap_setorial
 *
 * Spec do P.O. (2026-05-09):
 *   - Fórmula correta: completude = ratioCadastro × 0.3 + ratioRespostas × 0.7
 *   - Caso #5040001: 1.0 × 0.3 + 0.0 × 0.7 = 0.30 → 30% é correto
 *   - Fix: quando product_answers vazio E corpus_gap_setorial ativo,
 *     exibir mensagem explicativa em vez do contador "(2/2 NCM)"
 *
 * Critérios:
 *   - Label correto quando gap ativo vs. label normal quando gap inativo
 *   - Zero alteração na fórmula de cálculo (não testado aqui — testes da
 *     fórmula em calculate-briefing-confidence.test.ts)
 *   - Função pura — sem dependência de DB, LLM ou estado externo
 */
import { describe, it, expect } from "vitest";
import { formatQ3PilarDetalhe } from "./format-confidence-breakdown";
import type { ConfiancaBreakdownPilar } from "./calculate-briefing-confidence";

// Helper para criar pilar com defaults
const pilar = (overrides: Partial<ConfiancaBreakdownPilar>): ConfiancaBreakdownPilar => ({
  key: "q3Produtos",
  label: "Q3 Produtos (NCM)",
  peso: 10,
  respostas: 0,
  total: null,
  completude: 0,
  contribuicao: 0,
  aplicavel: true,
  ...overrides,
});

describe("Issue #1048 — formatQ3PilarDetalhe", () => {
  describe("Cenário 1: sem cadastro (cadastrados = 0)", () => {
    it("NCM: retorna 'sem NCM cadastrado'", () => {
      const p = pilar({
        detalhe: {
          ratioCadastro: 0,
          ratioRespostas: 0,
          cadastrados: 0,
          comClassificacao: 0,
        },
      });
      expect(formatQ3PilarDetalhe(p, "NCM")).toBe("sem NCM cadastrado");
    });

    it("NBS: retorna 'sem NBS cadastrado'", () => {
      const p = pilar({
        key: "q3Servicos",
        label: "Q3 Serviços (NBS)",
        detalhe: { cadastrados: 0, comClassificacao: 0 },
      });
      expect(formatQ3PilarDetalhe(p, "NBS")).toBe("sem NBS cadastrado");
    });
  });

  describe("Cenário 2: corpus_gap_setorial (cadastrados > 0, sem perguntas)", () => {
    it("caso canônico #5040001 — 2/2 NCM cadastrados + 0 perguntas → mensagem explicativa", () => {
      const p = pilar({
        key: "q3Produtos",
        respostas: 0,
        total: null,
        completude: 0.30,
        contribuicao: 3.0,
        detalhe: {
          ratioCadastro: 1.0,
          ratioRespostas: 0,
          cadastrados: 2,
          comClassificacao: 2,
        },
      });
      const detalhe = formatQ3PilarDetalhe(p, "NCM");
      expect(detalhe).toContain("2/2 NCM cadastrados");
      expect(detalhe).toContain("corpus regulatório sem artigos setoriais aplicáveis");
      expect(detalhe).toContain("NCMs");
    });

    it("p.total === 0 também ativa mensagem corpus_gap (não só null)", () => {
      const p = pilar({
        total: 0,
        detalhe: { cadastrados: 3, comClassificacao: 3 },
      });
      const detalhe = formatQ3PilarDetalhe(p, "NCM");
      expect(detalhe).toContain("corpus regulatório sem artigos setoriais aplicáveis");
    });

    it("NBS: mesma lógica para serviços (NBS sem perguntas)", () => {
      const p = pilar({
        key: "q3Servicos",
        label: "Q3 Serviços (NBS)",
        total: null,
        detalhe: { cadastrados: 1, comClassificacao: 1 },
      });
      const detalhe = formatQ3PilarDetalhe(p, "NBS");
      expect(detalhe).toContain("1/1 NBS cadastrados");
      expect(detalhe).toContain("corpus regulatório sem artigos setoriais aplicáveis");
      expect(detalhe).toContain("NBSs");
    });

    it("regressão proibida — NUNCA exibir só '2/2 NCM' quando corpus_gap ativo", () => {
      const p = pilar({
        total: null,
        detalhe: { cadastrados: 2, comClassificacao: 2 },
      });
      const detalhe = formatQ3PilarDetalhe(p, "NCM");
      // Mensagem completa contém "2/2 NCM cadastrados" mas com explicação anexa
      expect(detalhe).not.toBe("2/2 NCM");
      expect(detalhe.length).toBeGreaterThan("2/2 NCM".length);
    });

    it("mostra cadastrados parciais (1/2) quando nem todos têm classificação", () => {
      const p = pilar({
        total: null,
        detalhe: { cadastrados: 2, comClassificacao: 1 },
      });
      const detalhe = formatQ3PilarDetalhe(p, "NCM");
      expect(detalhe).toContain("1/2 NCM cadastrados");
    });
  });

  describe("Cenário 3: caso normal (cadastrados + perguntas geradas)", () => {
    it("3/5 NCM com 7/10 perguntas → contador completo, sem mensagem de gap", () => {
      const p = pilar({
        respostas: 7,
        total: 10,
        detalhe: { cadastrados: 5, comClassificacao: 3 },
      });
      const detalhe = formatQ3PilarDetalhe(p, "NCM");
      expect(detalhe).toBe("3/5 NCM · 7/10 perguntas");
      expect(detalhe).not.toContain("corpus regulatório");
    });

    it("100% cadastrado + 100% respondido → exibe contador limpo", () => {
      const p = pilar({
        respostas: 10,
        total: 10,
        completude: 1.0,
        detalhe: { cadastrados: 2, comClassificacao: 2 },
      });
      const detalhe = formatQ3PilarDetalhe(p, "NCM");
      expect(detalhe).toBe("2/2 NCM · 10/10 perguntas");
    });

    it("perguntas parciais (3/10) — exibe contador, sem mensagem de gap", () => {
      const p = pilar({
        respostas: 3,
        total: 10,
        detalhe: { cadastrados: 2, comClassificacao: 2 },
      });
      const detalhe = formatQ3PilarDetalhe(p, "NCM");
      expect(detalhe).toBe("2/2 NCM · 3/10 perguntas");
    });
  });

  describe("Cenário 4: fallback (sem detalhe estruturado)", () => {
    it("sem detalhe + total presente → 'X/Y perguntas'", () => {
      const p = pilar({
        respostas: 5,
        total: 10,
        detalhe: undefined,
      });
      expect(formatQ3PilarDetalhe(p, "NCM")).toBe("5/10 perguntas");
    });

    it("sem detalhe + total null → 'sem resposta'", () => {
      const p = pilar({
        respostas: 0,
        total: null,
        detalhe: undefined,
      });
      expect(formatQ3PilarDetalhe(p, "NCM")).toBe("sem resposta");
    });
  });

  describe("Toggle: gap ativo vs gap inativo (mesmo cadastrados)", () => {
    it("mesma quantidade de cadastrados produz outputs diferentes conforme p.total", () => {
      const base = { cadastrados: 2, comClassificacao: 2 };

      const semPerguntas = pilar({ total: null, detalhe: base });
      const comPerguntas = pilar({ respostas: 5, total: 10, detalhe: base });

      const dSem = formatQ3PilarDetalhe(semPerguntas, "NCM");
      const dCom = formatQ3PilarDetalhe(comPerguntas, "NCM");

      expect(dSem).not.toBe(dCom);
      expect(dSem).toContain("corpus regulatório");
      expect(dCom).toContain("5/10 perguntas");
    });
  });

  describe("DoD POSITIVO + NEGATIVO", () => {
    it("DoD POSITIVO: função é pura — mesma entrada produz mesmo output", () => {
      const p = pilar({
        total: null,
        detalhe: { cadastrados: 2, comClassificacao: 2 },
      });
      const r1 = formatQ3PilarDetalhe(p, "NCM");
      const r2 = formatQ3PilarDetalhe(p, "NCM");
      expect(r1).toBe(r2);
    });

    it("DoD NEGATIVO: output nunca contém substring '30%' (só o detalhe, não a porcentagem)", () => {
      const cases = [
        pilar({ total: null, detalhe: { cadastrados: 2, comClassificacao: 2 } }),
        pilar({ respostas: 0, total: 10, detalhe: { cadastrados: 1, comClassificacao: 1 } }),
        pilar({ detalhe: { cadastrados: 0, comClassificacao: 0 } }),
      ];
      for (const p of cases) {
        const detalhe = formatQ3PilarDetalhe(p, "NCM");
        expect(detalhe).not.toContain("30%");
        expect(detalhe).not.toContain("%");
      }
    });

    it("DoD NEGATIVO: caso #5040001 nunca retorna apenas '(2/2 NCM)'", () => {
      const p = pilar({
        total: null,
        completude: 0.30,
        contribuicao: 3.0,
        detalhe: { cadastrados: 2, comClassificacao: 2 },
      });
      const detalhe = formatQ3PilarDetalhe(p, "NCM");
      expect(detalhe).not.toBe("2/2 NCM");
      expect(detalhe.length).toBeGreaterThan(10);
    });
  });
});
