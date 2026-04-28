/**
 * hotfix-suite-is-gate-2026-04-28.test.ts — D3 do hotfix-suite-robustecimento.
 *
 * Cobertura: gate isCategoryAllowed por categoria x setor (operationType).
 * Atualmente ELIGIBILITY_TABLE so contem 'imposto_seletivo' (cf.
 * server/lib/risk-eligibility.ts:79). Quando crescer, expandir aqui.
 *
 * Tabela de elegibilidade v1.2 (ADR-0030 v1.1 D-6):
 *   imposto_seletivo eligible: industria, comercio, misto
 *   imposto_seletivo bloqueado: agronegocio, servicos, financeiro
 *   downgrade target: enquadramento_geral
 */
import { describe, it, expect } from "vitest";
import { isCategoryAllowed } from "./lib/risk-eligibility";

describe("Hotfix Suite — Gate isCategoryAllowed por categoria x setor", () => {
  describe("imposto_seletivo (ELIGIBILITY_TABLE v1.2)", () => {
    it("agronegocio BLOCKED (downgrade enquadramento_geral)", () => {
      const r = isCategoryAllowed("imposto_seletivo", "agronegocio");
      expect(r.allowed).toBe(false);
      expect(r.final).toBe("enquadramento_geral");
      expect(r.reason).toBe("sujeito_passivo_incompativel");
    });

    it("servicos BLOCKED", () => {
      const r = isCategoryAllowed("imposto_seletivo", "servicos");
      expect(r.allowed).toBe(false);
      expect(r.final).toBe("enquadramento_geral");
    });

    it("financeiro BLOCKED", () => {
      const r = isCategoryAllowed("imposto_seletivo", "financeiro");
      expect(r.allowed).toBe(false);
      expect(r.final).toBe("enquadramento_geral");
    });

    it("industria ALLOWED (combustivel, bebida, tabaco etc.)", () => {
      const r = isCategoryAllowed("imposto_seletivo", "industria");
      expect(r.allowed).toBe(true);
      expect(r.final).toBe("imposto_seletivo");
      expect(r.reason).toBeNull();
    });

    it("comercio ALLOWED (revenda combustivel etc.)", () => {
      const r = isCategoryAllowed("imposto_seletivo", "comercio");
      expect(r.allowed).toBe(true);
      expect(r.final).toBe("imposto_seletivo");
    });

    it("misto ALLOWED (caso comercio + servicos com componente IS)", () => {
      const r = isCategoryAllowed("imposto_seletivo", "misto");
      expect(r.allowed).toBe(true);
    });

    it("operationType vazio/null retorna allowed=true (fallback permissivo)", () => {
      const r = isCategoryAllowed("imposto_seletivo", "");
      expect(r.allowed).toBe(true);
      expect(r.reason).toBe("operation_type_ausente");
    });
  });

  // TODO: expandir quando ELIGIBILITY_TABLE crescer (incluir aliquota_zero,
  // credito_presumido, regime_especial, monofasia etc.).
});
