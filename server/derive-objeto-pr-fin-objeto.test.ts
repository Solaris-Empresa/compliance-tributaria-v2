/**
 * derive-objeto-pr-fin-objeto.test.ts — PR-FIN-OBJETO regression
 *
 * Contexto: Smoke R3-A 2026-04-30 Cenário 6 detectou que clientes financeiros
 * com NBS não-mapeado (ex: 1.0301.10.00 = Bancos Comerciais) caíam em fallback
 * tolerante retornando objeto="servico_geral", o que disparava V-LC-202
 * HARD_BLOCK (papel=operadora_regulada sem servico_financeiro/regulado em objeto).
 *
 * PR-FIN-OBJETO eleva fallback de servico_geral para servico_financeiro quando
 * subnatureza_setorial⊇["financeiro"]. PR-F garante esse contexto via
 * buildSeedFromProject quando operationType=financeiro.
 *
 * Pré-análise rules_hash impact: ZERO cenários da suite oficial afetados.
 * Suite usa apenas NBS canonical mapeado para financeiro (S18 com 1.0901.33.00).
 *
 * Cobertura:
 *   T67 — financeiro + NBS não-mapeado → servico_financeiro (fix principal)
 *   T68 — financeiro + NBS canonical → servico_financeiro (regressão path determinístico)
 *   T69 — saude_regulada + NBS não-mapeado → servico_geral (regressão preservada — outras subnaturezas mantêm comportamento)
 *   T70 — não-regulado + NBS não-mapeado → servico_geral (regressão preservada)
 *
 * Escopo coberto:
 *   - Caso "financeiro com NBS não-mapeado" (path fallback NBS) ✅
 *
 * Escopo NÃO coberto neste PR (gap conhecido — registrado em backlog M3):
 *   - Caso "financeiro SEM NBS" (nbss=[]): loop deriveObjetoForSeed nunca
 *     chama deriveObjetoFromNbs. Para resolver requer fix em
 *     buildPerfilEntidade.ts:71-106 (fora do escopo deste PR).
 *
 * Refs: PR #870, PR #871, PR #880 (PR-F), PR #884 (PR-FIN-NBS), Smoke R3-A 2026-04-30.
 */
import { describe, it, expect } from "vitest";
import { deriveObjetoFromNbs } from "./lib/archetype/deriveObjeto";

describe("PR-FIN-OBJETO — fallback elevado para servico_financeiro (financeiro)", () => {
  it("T67: NBS não-mapeado (1.0301.10.00) + subnatureza=['financeiro'] → servico_financeiro + V-10-FALLBACK-REGULATED INFO", () => {
    const result = deriveObjetoFromNbs("1.0301.10.00", {
      subnaturezaSetorial: ["financeiro"],
    });

    expect(result.objeto).toBe("servico_financeiro");
    expect(result.blocker).toBeDefined();
    expect(result.blocker?.id).toBe("V-10-FALLBACK-REGULATED");
    expect(result.blocker?.severity).toBe("INFO");
    expect(result.blocker?.rule).toContain("inferido como servico_financeiro");
  });

  it("T68: NBS canonical (1.0901.33.00) + subnatureza=['financeiro'] → servico_financeiro path determinístico (regressão preservada)", () => {
    const result = deriveObjetoFromNbs("1.0901.33.00", {
      subnaturezaSetorial: ["financeiro"],
    });

    expect(result.objeto).toBe("servico_financeiro");
    // Path determinístico (regime_especial|1.0901): blocker=null, NÃO entra em fallback
    expect(result.blocker).toBeNull();
  });

  it("T69: NBS não-mapeado + subnatureza=['saude_regulada'] → servico_geral (regressão preservada — outras subnaturezas reguladas mantêm comportamento)", () => {
    const result = deriveObjetoFromNbs("9.9999.99.99", {
      subnaturezaSetorial: ["saude_regulada"],
    });

    expect(result.objeto).toBe("servico_geral");
    expect(result.blocker?.id).toBe("V-10-FALLBACK-REGULATED");
    // Não tem mensagem de "inferido como servico_financeiro"
    expect(result.blocker?.rule).toContain("ALERTA FORTE");
    expect(result.blocker?.rule).toContain("saude_regulada");
  });

  it("T70: NBS não-mapeado + subnatureza vazia (não-regulado) → servico_geral + V-10-FALLBACK normal (regressão preservada)", () => {
    const result = deriveObjetoFromNbs("9.9999.99.99", {
      subnaturezaSetorial: [],
    });

    expect(result.objeto).toBe("servico_geral");
    expect(result.blocker?.id).toBe("V-10-FALLBACK"); // Não é REGULATED (subnatureza vazia)
    expect(result.blocker?.severity).toBe("INFO");
  });

  it("T70b: NBS não-mapeado + context undefined (caller legado) → servico_geral + V-10-FALLBACK (regressão preservada)", () => {
    const result = deriveObjetoFromNbs("9.9999.99.99");

    expect(result.objeto).toBe("servico_geral");
    expect(result.blocker?.id).toBe("V-10-FALLBACK");
  });
});
