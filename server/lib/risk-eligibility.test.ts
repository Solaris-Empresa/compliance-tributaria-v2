// Hotfix IS v1.2 — testes de risk-eligibility
// Cobertura: SPEC-HOTFIX-IS-v1.1 Bloco 8.1 (mantido em v1.2)

import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  isCategoryAllowed,
  isOperationType,
  ELIGIBILITY_TABLE,
  type EligibilityResult,
} from "./risk-eligibility";

// Fix IS P2 (dívida do F2 #1511) — isola a flag em TODOS os testes deste arquivo.
// Os describes legados assumem flag OFF (comportamento ELIGIBILITY_TABLE); sem este
// guard ficavam env-dependentes e falhavam quando o ambiente tinha
// ENABLE_UNIFIED_ELIGIBILITY=true (prod, pós-flip). Os testes flag-ON setam o env
// explicitamente no corpo (este beforeEach roda antes → estado limpo garantido).
beforeEach(() => {
  delete process.env.ENABLE_UNIFIED_ELIGIBILITY;
});

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
  // M3.8-3 (PR #970, REGRA-ORQ-29 + Lição #62):
  // downgrade_to mudou de "enquadramento_geral" → "unmapped" para evitar gap fantasma.
  // Handler em risk-engine-v4 faz skip da categoria "unmapped" (não gera risco).
  it("servicos bloqueia com downgrade para unmapped (cenário transportadora)", () => {
    const r = isCategoryAllowed("imposto_seletivo", "servicos");
    expect(r.allowed).toBe(false);
    expect(r.final).toBe("unmapped");
    expect(r.suggested).toBe("imposto_seletivo");
    expect(r.reason).toBe("sujeito_passivo_incompativel");
  });

  it("financeiro bloqueia com downgrade para unmapped", () => {
    const r = isCategoryAllowed("imposto_seletivo", "financeiro");
    expect(r.allowed).toBe(false);
    expect(r.final).toBe("unmapped");
    expect(r.reason).toBe("sujeito_passivo_incompativel");
  });

  it("agronegocio bloqueia com downgrade (ADR-0030 v1.1 D-6 — agro não-elegível)", () => {
    const r = isCategoryAllowed("imposto_seletivo", "agronegocio");
    expect(r.allowed).toBe(false);
    expect(r.final).toBe("unmapped");
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
    // M3.8-3: downgrade_to agora "unmapped" (era "enquadramento_geral")
    expect(r.final).toBe("unmapped");
    expect(r.suggested).not.toBe(r.final);
  });

  it("resultado sem restrição: final === suggested", () => {
    const r = isCategoryAllowed("ibs_cbs", "servicos");
    expect(r.final).toBe(r.suggested);
  });

  // A-2/A-3 (18/06/2026): tabela expandida para 3 categorias (era só imposto_seletivo).
  it("tabela ELIGIBILITY_TABLE expõe imposto_seletivo + transicao_iss_ibs + regime_diferenciado", () => {
    const keys = Object.keys(ELIGIBILITY_TABLE).sort();
    expect(keys).toEqual(
      ["imposto_seletivo", "regime_diferenciado", "transicao_iss_ibs"].sort(),
    );
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

// ---------------------------------------------------------------------------
// Hotfix v1.2.1 — aliases privados (servico → servicos)
// ---------------------------------------------------------------------------
describe("isCategoryAllowed — aliases (hotfix v1.2.1)", () => {
  it("servicos (canônico) → bloqueia IS com downgrade", () => {
    const r = isCategoryAllowed("imposto_seletivo", "servicos");
    expect(r.allowed).toBe(false);
    expect(r.final).toBe("unmapped"); // M3.8-3 PR #970
    expect(r.reason).toBe("sujeito_passivo_incompativel");
  });

  it("servico (alias singular) → normalizado para servicos, bloqueia IS", () => {
    const r = isCategoryAllowed("imposto_seletivo", "servico");
    expect(r.allowed).toBe(false);
    expect(r.final).toBe("unmapped"); // M3.8-3 PR #970
    expect(r.reason).toBe("sujeito_passivo_incompativel");
  });

  it("industria → permite IS (sem regressão)", () => {
    const r = isCategoryAllowed("imposto_seletivo", "industria");
    expect(r.allowed).toBe(true);
    expect(r.final).toBe("imposto_seletivo");
    expect(r.reason).toBe(null);
  });

  it("comercio → permite IS (sem regressão)", () => {
    const r = isCategoryAllowed("imposto_seletivo", "comercio");
    expect(r.allowed).toBe(true);
    expect(r.final).toBe("imposto_seletivo");
    expect(r.reason).toBe(null);
  });
});

// ─── A-2 (18/06/2026) — transicao_iss_ibs (Art. 342) ──────────────────────────
describe("isCategoryAllowed — transicao_iss_ibs (A-2)", () => {
  it("industria BLOQUEIA (fabricante não recolhe ISS) → unmapped", () => {
    const r = isCategoryAllowed("transicao_iss_ibs", "industria");
    expect(r.allowed).toBe(false);
    expect(r.final).toBe("unmapped");
    expect(r.reason).toBe("sujeito_passivo_incompativel");
  });
  it("servicos PERMITE (prestador de serviço)", () => {
    const r = isCategoryAllowed("transicao_iss_ibs", "servicos");
    expect(r.allowed).toBe(true);
    expect(r.final).toBe("transicao_iss_ibs");
  });
  it("misto PERMITE", () => {
    expect(isCategoryAllowed("transicao_iss_ibs", "misto").allowed).toBe(true);
  });
  it("comercio BLOQUEIA → unmapped", () => {
    expect(isCategoryAllowed("transicao_iss_ibs", "comercio").final).toBe("unmapped");
  });
});

// ─── A-3 (18/06/2026) — regime_diferenciado (band-aid: exclui só industria) ────
describe("isCategoryAllowed — regime_diferenciado (A-3 band-aid)", () => {
  it("industria BLOQUEIA (band-aid) → unmapped", () => {
    const r = isCategoryAllowed("regime_diferenciado", "industria");
    expect(r.allowed).toBe(false);
    expect(r.final).toBe("unmapped");
    expect(r.reason).toBe("sujeito_passivo_incompativel");
  });
  // Anti-regressão: agro/financeiro... regime_diferenciado é amplo (Título IV).
  // eligible NÃO remove agro/comercio/servicos/misto (evita falso negativo).
  it("agronegocio PERMITE (não falso-negativar agro)", () => {
    expect(isCategoryAllowed("regime_diferenciado", "agronegocio").allowed).toBe(true);
  });
  it("comercio PERMITE", () => {
    expect(isCategoryAllowed("regime_diferenciado", "comercio").allowed).toBe(true);
  });
  it("servicos PERMITE", () => {
    expect(isCategoryAllowed("regime_diferenciado", "servicos").allowed).toBe(true);
  });
});

// ─── PR-B F2 — wrapper atrás de ENABLE_UNIFIED_ELIGIBILITY ─────────────────────
describe("isCategoryAllowed — fonte única (flag ENABLE_UNIFIED_ELIGIBILITY)", () => {
  afterEach(() => {
    delete process.env.ENABLE_UNIFIED_ELIGIBILITY;
  });

  it("flag OFF (default): imposto_seletivo + servicos → unmapped (comportamento legado)", () => {
    delete process.env.ENABLE_UNIFIED_ELIGIBILITY;
    const r = isCategoryAllowed("imposto_seletivo", "servicos");
    expect(r.allowed).toBe(false);
    expect(r.final).toBe("unmapped");
  });

  it("flag ON: imposto_seletivo + servicos → PERMITE (D1-IS não-autoritativo, difere do legado)", () => {
    process.env.ENABLE_UNIFIED_ELIGIBILITY = "true";
    const r = isCategoryAllowed("imposto_seletivo", "servicos");
    expect(r.allowed).toBe(true); // defere ao gate NCM/CNAE (Art.409); ≠ flag OFF
    expect(r.final).toBe("imposto_seletivo");
  });

  it("flag ON: transicao_iss_ibs + industria → unmapped (paridade com legado)", () => {
    process.env.ENABLE_UNIFIED_ELIGIBILITY = "true";
    const r = isCategoryAllowed("transicao_iss_ibs", "industria");
    expect(r.allowed).toBe(false);
    expect(r.final).toBe("unmapped");
    expect(r.reason).toBe("sujeito_passivo_incompativel");
  });

  it("flag ON: regime_diferenciado + industria → unmapped; + agronegocio → permite", () => {
    process.env.ENABLE_UNIFIED_ELIGIBILITY = "true";
    expect(isCategoryAllowed("regime_diferenciado", "industria").final).toBe("unmapped");
    expect(isCategoryAllowed("regime_diferenciado", "agronegocio").allowed).toBe(true);
  });

  it("flag ON: operationType ausente → permissivo", () => {
    process.env.ENABLE_UNIFIED_ELIGIBILITY = "true";
    const r = isCategoryAllowed("transicao_iss_ibs", null);
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe("operation_type_ausente");
  });
});

// Fix IS P2 — contrato de PRODUÇÃO do imposto_seletivo na matriz (flag ON = prod pós-flip).
// Sob flag ON o IS é NÃO-AUTORITATIVO por operationType (D1-IS): isCategoryAllowed
// retorna allowed=true e DEFERE ao gate NCM/CNAE real (risk-engine-v4:615
// isImpostoSeletivoEligible, Art.393 §1º). Isto SUBSTITUI o gate operationType legado
// (que bloqueava servicos/financeiro/agro) — por isso os describes legados acima rodam
// com flag OFF isolada. O bloqueio real do IS (ex.: soja #5040001) é responsabilidade
// do gate 615, não deste módulo. Ref ADR-0038 Opção 2 · #1282.
describe("isCategoryAllowed — imposto_seletivo flag ON (defere ao gate 615)", () => {
  afterEach(() => delete process.env.ENABLE_UNIFIED_ELIGIBILITY);

  for (const op of ["servicos", "financeiro", "agronegocio"]) {
    it(`flag ON: imposto_seletivo + ${op} → allowed (não-autoritativo; gate 615 decide)`, () => {
      process.env.ENABLE_UNIFIED_ELIGIBILITY = "true";
      const r = isCategoryAllowed("imposto_seletivo", op);
      expect(r.allowed).toBe(true);
      expect(r.final).toBe("imposto_seletivo"); // NÃO faz downgrade unmapped (≠ legado)
    });
  }

  it("flag ON: imposto_seletivo + industria → allowed (igual ao legado p/ elegíveis)", () => {
    process.env.ENABLE_UNIFIED_ELIGIBILITY = "true";
    expect(isCategoryAllowed("imposto_seletivo", "industria").allowed).toBe(true);
  });

  it("contraste flag OFF (legado): imposto_seletivo + servicos → unmapped (gate operationType)", () => {
    delete process.env.ENABLE_UNIFIED_ELIGIBILITY;
    const r = isCategoryAllowed("imposto_seletivo", "servicos");
    expect(r.allowed).toBe(false);
    expect(r.final).toBe("unmapped");
  });
});
