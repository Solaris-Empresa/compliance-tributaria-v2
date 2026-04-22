// Hotfix IS v1.2 — testes de risk-eligibility
// Cobertura: SPEC-HOTFIX-IS-v1.1 Bloco 8.1 (mantido em v1.2)

import { describe, it, expect } from "vitest";
import {
  isCategoryAllowed,
  isOperationType,
  ELIGIBILITY_TABLE,
  type EligibilityResult,
} from "./risk-eligibility";

describe("isCategoryAllowed — imposto_seletivo eligible", () => {
  it("industria permite imposto_seletivo sem reason", () => {
    const r = isCategoryAllowed("imposto_seletivo", "industria");
    expect(r.allowed).toBe(true);
    expect(r.final).toBe("imposto_seletivo");
    expect(r.reason).toBe(null);
  });

  it("comercio permite imposto_seletivo sem reason", () => {
    const r = isCategoryAllowed("imposto_seletivo", "comercio");
    expect(r.allowed).toBe(true);
    expect(r.final).toBe("imposto_seletivo");
    expect(r.reason).toBe(null);
  });

  it("misto permite imposto_seletivo sem reason", () => {
    const r = isCategoryAllowed("imposto_seletivo", "misto");
    expect(r.allowed).toBe(true);
    expect(r.final).toBe("imposto_seletivo");
    expect(r.reason).toBe(null);
  });
});

describe("isCategoryAllowed — imposto_seletivo blocked", () => {
  it("servicos bloqueia com downgrade para enquadramento_geral (cenário transportadora)", () => {
    const r = isCategoryAllowed("imposto_seletivo", "servicos");
    expect(r.allowed).toBe(false);
    expect(r.final).toBe("enquadramento_geral");
    expect(r.suggested).toBe("imposto_seletivo");
    expect(r.reason).toBe("sujeito_passivo_incompativel");
  });

  it("financeiro bloqueia com downgrade para enquadramento_geral", () => {
    const r = isCategoryAllowed("imposto_seletivo", "financeiro");
    expect(r.allowed).toBe(false);
    expect(r.final).toBe("enquadramento_geral");
    expect(r.reason).toBe("sujeito_passivo_incompativel");
  });

  it("agronegocio bloqueia com downgrade (ADR-0030 v1.1 D-6 — agro não-elegível)", () => {
    const r = isCategoryAllowed("imposto_seletivo", "agronegocio");
    expect(r.allowed).toBe(false);
    expect(r.final).toBe("enquadramento_geral");
    expect(r.reason).toBe("sujeito_passivo_incompativel");
  });
});

describe("isCategoryAllowed — fallbacks", () => {
  it("operationType null → permite com reason operation_type_ausente", () => {
    const r = isCategoryAllowed("imposto_seletivo", null);
    expect(r.allowed).toBe(true);
    expect(r.final).toBe("imposto_seletivo");
    expect(r.reason).toBe("operation_type_ausente");
  });

  it("operationType undefined → permite com reason operation_type_ausente", () => {
    const r = isCategoryAllowed("imposto_seletivo", undefined);
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe("operation_type_ausente");
  });

  it("operationType string vazia → permite com reason operation_type_ausente", () => {
    const r = isCategoryAllowed("imposto_seletivo", "   ");
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe("operation_type_ausente");
  });

  it("operationType desconhecido (fora canônicos) → permite com warning", () => {
    const r = isCategoryAllowed("imposto_seletivo", "Industria");
    // note: case-sensitive. "Industria" ≠ "industria"
    expect(r.allowed).toBe(true);
    expect(r.final).toBe("imposto_seletivo");
    expect(r.reason).toBe("operation_type_desconhecido");
  });
});

describe("isCategoryAllowed — outras categorias (não-restritas)", () => {
  it("ibs_cbs sempre permitida independente de operationType", () => {
    const r1 = isCategoryAllowed("ibs_cbs", "servicos");
    const r2 = isCategoryAllowed("ibs_cbs", "financeiro");
    const r3 = isCategoryAllowed("ibs_cbs", null);
    for (const r of [r1, r2, r3]) {
      expect(r.allowed).toBe(true);
      expect(r.final).toBe("ibs_cbs");
      expect(r.reason).toBe(null);
    }
  });

  it("cadastro_fiscal sempre permitida para qualquer operationType", () => {
    const r = isCategoryAllowed("cadastro_fiscal", "servicos");
    expect(r.allowed).toBe(true);
    expect(r.final).toBe("cadastro_fiscal");
    expect(r.reason).toBe(null);
  });

  it("enquadramento_geral sempre permitida (categoria fallback)", () => {
    const r = isCategoryAllowed("enquadramento_geral", "servicos");
    expect(r.allowed).toBe(true);
    expect(r.final).toBe("enquadramento_geral");
    expect(r.reason).toBe(null);
  });
});

describe("isCategoryAllowed — resultado estrutural", () => {
  it("resultado sempre preserva suggested idêntico ao input", () => {
    const r = isCategoryAllowed("imposto_seletivo", "servicos");
    expect(r.suggested).toBe("imposto_seletivo");
  });

  it("downgrade muda final mas mantém suggested", () => {
    const r = isCategoryAllowed("imposto_seletivo", "servicos");
    expect(r.suggested).toBe("imposto_seletivo");
    expect(r.final).toBe("enquadramento_geral");
    expect(r.suggested).not.toBe(r.final);
  });

  it("resultado sem restrição: final === suggested", () => {
    const r = isCategoryAllowed("ibs_cbs", "servicos");
    expect(r.final).toBe(r.suggested);
  });

  it("tabela ELIGIBILITY_TABLE expõe apenas imposto_seletivo em v1.2", () => {
    const keys = Object.keys(ELIGIBILITY_TABLE);
    expect(keys).toEqual(["imposto_seletivo"]);
  });
});

describe("isOperationType — type guard", () => {
  it("aceita 6 valores canônicos", () => {
    expect(isOperationType("industria")).toBe(true);
    expect(isOperationType("comercio")).toBe(true);
    expect(isOperationType("servicos")).toBe(true);
    expect(isOperationType("misto")).toBe(true);
    expect(isOperationType("agronegocio")).toBe(true);
    expect(isOperationType("financeiro")).toBe(true);
  });

  it("rejeita case diferente (é case-sensitive)", () => {
    expect(isOperationType("Industria")).toBe(false);
    expect(isOperationType("COMERCIO")).toBe(false);
  });

  it("rejeita null, undefined, number, object", () => {
    expect(isOperationType(null)).toBe(false);
    expect(isOperationType(undefined)).toBe(false);
    expect(isOperationType(0)).toBe(false);
    expect(isOperationType({})).toBe(false);
    expect(isOperationType([])).toBe(false);
  });

  it("rejeita strings desconhecidas", () => {
    expect(isOperationType("")).toBe(false);
    expect(isOperationType("outro")).toBe(false);
    expect(isOperationType("industria ")).toBe(false);
  });

  it("narrow type guard permite uso sem cast", () => {
    const v: unknown = "industria";
    if (isOperationType(v)) {
      const arr: readonly ("industria" | "comercio" | "misto")[] = [
        "industria",
        "comercio",
        "misto",
      ];
      // v é OperationType; arr.includes compila sem cast
      const included: boolean = (
        arr as readonly string[]
      ).includes(v);
      expect(included).toBe(true);
    }
  });
});

describe("EligibilityResult — forma do resultado", () => {
  it("result.allowed=true quando reason=null (categoria não-restrita)", () => {
    const r: EligibilityResult = isCategoryAllowed("ibs_cbs", "servicos");
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe(null);
  });

  it("result.allowed=true com reason pode coexistir (fallback permissivo)", () => {
    const r: EligibilityResult = isCategoryAllowed("imposto_seletivo", null);
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe("operation_type_ausente");
  });
});
