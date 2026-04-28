/**
 * Hotfix Classe de Erro — Dataset Expansion 2026-04-28 (Opção A, 4 NCMs)
 *
 * Contexto: PR #855 corrigiu NCM 1201 (soja) individualmente. Existe classe
 * de NCMs ausentes do Decision Kernel que disparam V-10-FALLBACK → derivação
 * incorreta de `objeto` e `operationType` → IS aplicado errado.
 *
 * Este teste valida a expansão para 4 NCMs cobrindo:
 * - Agro commodities (IS deve ser BLOQUEADO): milho 1005.90.10, café 0901.21.00
 * - Combustíveis (IS deve ser PERMITIDO): diesel 2710.19.21, gasolina 2710.12.59
 *
 * Regressões críticas:
 * - Soja 1201.90.00 (PR #855) não regride
 * - Refrigerante 2202.10.00 (chapter 22) NÃO vira combustível (anti-etanol-leak)
 *
 * Etanol 2207.10.10 EXCLUÍDO deste PR (decisão de design — chapter 22 já mapeia
 * para "bebida"; adicionar tupla regime_geral|true|22 → combustivel quebraria
 * refrigerantes 2202.xx). Etanol fica para PR posterior com refator de
 * granularidade ou campo objeto_override no dataset.
 *
 * REGRA-ORQ-11 fast-track P0 — classe de erro
 */
import { describe, it, expect } from "vitest";
import { deriveObjetoFromNcm } from "./lib/archetype/deriveObjeto";
import { isCategoryAllowed } from "./lib/risk-eligibility";

describe("Hotfix Classe de Erro — Dataset Expansion 2026-04-28 (Opção A, 4 NCMs)", () => {
  // === Agro novos ===

  it("NCM 1005.90.10 (milho) deriva agricola sem fallback", () => {
    const result = deriveObjetoFromNcm("1005.90.10");
    expect(result.objeto).toBe("agricola");
    expect(result.blocker).toBeNull();
  });

  it("NCM 0901.21.00 (café) deriva agricola sem fallback", () => {
    const result = deriveObjetoFromNcm("0901.21.00");
    expect(result.objeto).toBe("agricola");
    expect(result.blocker).toBeNull();
  });

  // === Combustíveis novos ===

  it("NCM 2710.19.21 (diesel) deriva combustivel sem fallback", () => {
    const result = deriveObjetoFromNcm("2710.19.21");
    expect(result.objeto).toBe("combustivel");
    expect(result.blocker).toBeNull();
  });

  it("NCM 2710.12.59 (gasolina) deriva combustivel sem fallback", () => {
    const result = deriveObjetoFromNcm("2710.12.59");
    expect(result.objeto).toBe("combustivel");
    expect(result.blocker).toBeNull();
  });

  // === Regressões críticas ===

  it("NCM 1201.90.00 (soja) regression — continua agricola (PR #855 não regride)", () => {
    const result = deriveObjetoFromNcm("1201.90.00");
    expect(result.objeto).toBe("agricola");
    expect(result.blocker).toBeNull();
  });

  it("NCM 2202.10.00 (refrigerante) regression — continua bebida (chapter 22 NÃO vira combustível, anti-etanol-leak)", () => {
    const result = deriveObjetoFromNcm("2202.10.00");
    expect(result.objeto).toBe("bebida"); // CRÍTICO: NÃO pode virar "combustivel"
    expect(result.blocker).toBeNull();
  });

  // === Eligibility gates ===

  it("isCategoryAllowed('imposto_seletivo','industria') === ALLOWED para combustível distribuidor", () => {
    const elig = isCategoryAllowed("imposto_seletivo", "industria");
    expect(elig.allowed).toBe(true);
  });

  it("isCategoryAllowed('imposto_seletivo','agronegocio') === BLOCKED para milho/café/soja produtor", () => {
    const elig = isCategoryAllowed("imposto_seletivo", "agronegocio");
    expect(elig.allowed).toBe(false);
    expect(elig.final).toBe("enquadramento_geral");
  });
});
