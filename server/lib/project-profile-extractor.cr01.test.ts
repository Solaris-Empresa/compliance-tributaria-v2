// project-profile-extractor.cr01.test.ts — CR-01 (#1607 Fase 0) DoD de 3 perfis.
//
// Testa a LÓGICA DE RESOLUÇÃO do regime via helper puro `resolveTaxRegime`
// (sem DB). A versão anterior chamava `extractProjectProfile`, que exige
// DATABASE_URL no `getDb()` (`if (!_db && process.env.DATABASE_URL)`) e lança
// antes do mock — quebrava o CI (Lição #110 / REGRA-ORQ-CI-01). O helper puro
// torna P1/P2 determinísticos sem DATABASE_URL.
//
//   P1 — construtora-SN:  simples_nacional no companyProfile JSON
//                         → gate imóveis EXCLUI (corrige falso-positivo)
//   P2 — construtora-LR:  lucro_real na coluna direta → gate imóveis INCLUI
//   P3 — atacadista-LR-JSON: lucro_real só no companyProfile JSON
//                         → gate crédito presumido (:218) passa a disparar
//                         → EMPÍRICO em runtime (Manus) + classificação Dr. José
//                           antes do merge (proxy incompleto Arts. 168-171, REGRA-ORQ-44)
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from "vitest";
import { resolveTaxRegime } from "./project-profile-extractor";

describe("CR-01 · resolveTaxRegime · DoD 3 perfis (dual-storage Lição #140)", () => {
  it("P1 — construtora-SN: coluna null + simples_nacional no companyProfile → simples_nacional", () => {
    expect(
      resolveTaxRegime(null, { cnpj: "x", taxRegime: "simples_nacional" })
    ).toBe("simples_nacional");
  });

  it("P2 — construtora-LR: coluna direta lucro_real → usa a coluna", () => {
    expect(resolveTaxRegime("lucro_real", null)).toBe("lucro_real");
  });

  it("P3 — atacadista-LR-JSON: coluna null + lucro_real só no companyProfile → lucro_real (gate crédito presumido :218 dispara — classificar Dr. José)", () => {
    expect(resolveTaxRegime(null, { taxRegime: "lucro_real" })).toBe("lucro_real");
  });

  it("companyProfile como string JSON (não auto-parseado) → parseia e usa (Lição #72)", () => {
    expect(resolveTaxRegime(null, '{"taxRegime":"simples_nacional"}')).toBe(
      "simples_nacional"
    );
  });

  it("prioridade: coluna direta vence o companyProfile", () => {
    expect(
      resolveTaxRegime("lucro_presumido", { taxRegime: "lucro_real" })
    ).toBe("lucro_presumido");
  });

  it("nenhuma fonte → null (nunca hardcode lucro_real — REGRA-ORQ-29/32)", () => {
    expect(resolveTaxRegime(null, null)).toBeNull();
    expect(resolveTaxRegime(undefined, undefined)).toBeNull();
    expect(resolveTaxRegime(null, {})).toBeNull();
    expect(resolveTaxRegime(null, "{}")).toBeNull();
  });

  it("companyProfile malformado (string não-JSON) → null, sem crash", () => {
    expect(resolveTaxRegime(null, "INVALID_JSON{{")).toBeNull();
  });
});
