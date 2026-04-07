/**
 * pr375-div-z01-004-005.test.ts
 *
 * Testes obrigatórios para PR #375:
 * - DIV-Z01-004: assertValidTransition lança TRPCError (não Error nativo)
 * - DIV-Z01-005 Opção C: categoria transicao (Arts. 25–30 LC 214/2025)
 */

import { describe, it, expect } from "vitest";
import { TRPCError } from "@trpc/server";
import { assertValidTransition } from "./flowStateMachine";
import { categorizeRisk } from "./lib/risk-categorizer";

// ─── DIV-Z01-004: TRPCError em transição inválida ────────────────────────────

describe("DIV-Z01-004 — assertValidTransition lança TRPCError", () => {
  it("Caso 4: TRPCError lançado em transição inválida", () => {
    let caught: unknown;
    try {
      assertValidTransition("onda1_solaris", "briefing"); // inválido
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(TRPCError);
    expect((caught as TRPCError).code).toBe("FORBIDDEN");
    expect((caught as TRPCError).message).toContain("Transição inválida");
    expect((caught as TRPCError).message).toContain("onda1_solaris");
    expect((caught as TRPCError).message).toContain("briefing");
  });

  it("Status desconhecido lança TRPCError com FORBIDDEN", () => {
    let caught: unknown;
    try {
      assertValidTransition("status_inexistente", "rascunho");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(TRPCError);
    expect((caught as TRPCError).code).toBe("FORBIDDEN");
    expect((caught as TRPCError).message).toContain("desconhecido");
  });

  it("Transição válida NÃO lança erro", () => {
    expect(() => assertValidTransition("rascunho", "consistencia_pendente")).not.toThrow();
    expect(() => assertValidTransition("consistencia_pendente", "cnaes_confirmados")).not.toThrow();
  });

  it("Mensagem de erro inclui transições permitidas", () => {
    let caught: unknown;
    try {
      assertValidTransition("rascunho", "aprovado"); // inválido
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(TRPCError);
    expect((caught as TRPCError).message).toContain("consistencia_pendente"); // transição permitida
  });
});

// ─── DIV-Z01-005 Opção C: categoria transicao ────────────────────────────────

describe("DIV-Z01-005 — categoria transicao (Arts. 25–30 LC 214/2025)", () => {
  it("Caso novo 1: lei_ref='Art. 25 LC 214/2025' → transicao", () => {
    expect(categorizeRisk({ lei_ref: "Art. 25 LC 214/2025" })).toBe("transicao");
  });

  it("Caso novo 2: lei_ref='Art. 28 LC 214/2025' → transicao", () => {
    expect(categorizeRisk({ lei_ref: "Art. 28 LC 214/2025" })).toBe("transicao");
  });

  it("Caso novo 3: descricao='período de transição 2026-2032' → transicao", () => {
    expect(categorizeRisk({ description: "período de transição 2026-2032" })).toBe("transicao");
  });

  it("Art. 26 → transicao", () => {
    expect(categorizeRisk({ lei_ref: "Art. 26 LC 214/2025" })).toBe("transicao");
  });

  it("Art. 30 → transicao", () => {
    expect(categorizeRisk({ lei_ref: "Art. 30 LC 214/2025" })).toBe("transicao");
  });

  it("Descrição com 'fase de transição' → transicao", () => {
    expect(categorizeRisk({ description: "Risco de não adequação à fase de transição do IBS" })).toBe("transicao");
  });

  it("Art. 2 (IS) não é confundido com Art. 25 (transicao)", () => {
    // Art. 2 deve ser imposto_seletivo, não transicao
    expect(categorizeRisk({ lei_ref: "Art. 2 LC 214/2025" })).toBe("imposto_seletivo");
  });

  it("Imposto seletivo não é confundido com transicao", () => {
    expect(categorizeRisk({ description: "Imposto seletivo sobre bebidas alcoólicas" })).toBe("imposto_seletivo");
  });
});

// ─── Regressão: 10 categorias canônicas ──────────────────────────────────────

describe("Regressão — 10 categorias canônicas aprovadas", () => {
  const casos: Array<[string, ReturnType<typeof categorizeRisk>]> = [
    ["imposto seletivo sobre tabaco", "imposto_seletivo"],
    ["medicamento com alíquota reduzida", "regime_diferenciado"],
    ["produto isento de tributação", "aliquota_zero"],
    ["alíquota reduzida de 50%", "aliquota_reduzida"],
    ["split payment automático", "split_payment"],
    ["apuração de IBS e CBS", "ibs_cbs"],
    ["inscrição no cadastro fiscal", "cadastro_fiscal"],
    ["entrega de NF-e e SPED", "obrigacao_acessoria"],
    ["período de transição 2026-2032", "transicao"],
    ["risco genérico sem categoria", "enquadramento_geral"],
  ];

  casos.forEach(([desc, expected]) => {
    it(`"${desc}" → ${expected}`, () => {
      expect(categorizeRisk({ description: desc })).toBe(expected);
    });
  });
});
