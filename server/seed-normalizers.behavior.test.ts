/**
 * seed-normalizers.behavior.test.ts — PR-J Fase 2a
 *
 * Snapshot tests de COMPORTAMENTO de buildSeedFromProject.
 *
 * Estratégia: capturar output byte-a-byte ANTES do refactor seedNormalizers.
 * Fase 2b refactor (extract para server/lib/archetype/seedNormalizers.ts)
 * deve PASS contra esses mesmos snapshots — qualquer mudança comportamental
 * é detectada pelo gate.
 *
 * Cobertura:
 *   - 5 cenários operationType: financeiro/comercio/industria/servicos/agronegocio
 *   - 2 cenários taxRegime alias: snake_case → title case + idempotente
 *   - Edge cases: misto, fontes_receita derivada via NATUREZA_TO_FONTES
 *
 * Vinculadas:
 *   - PR #892 (Fase 1 pré-análise)
 *   - Lição #43 (callgraph completo) + Lição #44 (pré-análise onde há lacuna)
 */
import { describe, it, expect } from "vitest";
import { buildSeedFromProject } from "./routers/perfil";

describe("PR-J Fase 2a — buildSeedFromProject behavior snapshots", () => {
  it("financeiro com NBS vazio (cenário PR #886 BUG-FIN-OBJETO V2)", () => {
    const seed = buildSeedFromProject({
      operationProfile: {
        operationType: "financeiro",
        taxRegime: "lucro_real",
      },
      companyProfile: { companySize: "Grande" },
      confirmedCnaes: [{ code: "6422-1/00" }],
    });
    expect(seed).toMatchSnapshot();
  });

  it("comercio com fontes_receita derivada via NATUREZA_TO_FONTES", () => {
    const seed = buildSeedFromProject({
      operationProfile: {
        operationType: "comercio",
        taxRegime: "lucro_presumido",
      },
      companyProfile: { companySize: "Medio" },
      confirmedCnaes: [{ code: "4711-3/02" }],
    });
    expect(seed).toMatchSnapshot();
  });

  it("industria com posicao Produtor/fabricante", () => {
    const seed = buildSeedFromProject({
      operationProfile: {
        operationType: "industria",
        taxRegime: "lucro_real",
      },
      companyProfile: { companySize: "Grande" },
      confirmedCnaes: [{ code: "1011-2/01" }],
    });
    expect(seed).toMatchSnapshot();
  });

  it("servicos com posicao Prestador de servico", () => {
    const seed = buildSeedFromProject({
      operationProfile: {
        operationType: "servicos",
        taxRegime: "simples_nacional",
      },
      companyProfile: { companySize: "Pequeno" },
      confirmedCnaes: [{ code: "6201-5/01" }],
    });
    expect(seed).toMatchSnapshot();
  });

  it("agronegocio (BUG-1 fix: posicao=Produtor/fabricante)", () => {
    const seed = buildSeedFromProject({
      operationProfile: {
        operationType: "agronegocio",
        taxRegime: "lucro_presumido",
      },
      companyProfile: { companySize: "Grande" },
      confirmedCnaes: [{ code: "0115-6/00" }],
    });
    expect(seed).toMatchSnapshot();
  });

  it("taxRegime alias snake_case → title case (BUG-2 fix)", () => {
    const seed = buildSeedFromProject({
      operationProfile: {
        operationType: "industria",
        taxRegime: "lucro_real",
      },
      companyProfile: { companySize: "Medio" },
      confirmedCnaes: [],
    });
    // Invariante específica do alias resolution
    expect(seed.regime_tributario_atual).toBe("Lucro Real");
  });

  it("taxRegime title case input (idempotente passthrough)", () => {
    const seed = buildSeedFromProject({
      operationProfile: {
        operationType: "industria",
        taxRegime: "Lucro Real",
      },
      companyProfile: { companySize: "Medio" },
      confirmedCnaes: [],
    });
    expect(seed.regime_tributario_atual).toBe("Lucro Real");
  });

  it("misto com naturezas múltiplas + posicao=Atacadista (decisão P.O. BUG-1)", () => {
    const seed = buildSeedFromProject({
      operationProfile: {
        operationType: "misto",
        taxRegime: "lucro_real",
      },
      companyProfile: { companySize: "Grande" },
      confirmedCnaes: [{ code: "4711-3/02" }],
    });
    expect(seed).toMatchSnapshot();
  });

  it("financeiro com setor_regulado=true + orgao_regulador=BCB (PR-F BUG-4)", () => {
    const seed = buildSeedFromProject({
      operationProfile: {
        operationType: "financeiro",
        taxRegime: "Lucro Real",
      },
      companyProfile: { companySize: "Grande" },
      confirmedCnaes: [{ code: "6422-1/00" }],
    });
    // Invariantes específicas do PR-F (#880)
    expect(seed.setor_regulado).toBe(true);
    expect(seed.orgao_regulador_principal).toEqual(["BCB"]);
    expect(seed.subnatureza_setorial).toEqual(["financeiro"]);
  });

  it("não-financeiro NÃO marca setor_regulado", () => {
    const seed = buildSeedFromProject({
      operationProfile: {
        operationType: "comercio",
        taxRegime: "Lucro Real",
      },
      companyProfile: { companySize: "Medio" },
      confirmedCnaes: [{ code: "4711-3/02" }],
    });
    expect(seed.setor_regulado).toBe(false);
    expect(seed.orgao_regulador_principal).toEqual([]);
    expect(seed.subnatureza_setorial).toEqual([]);
  });
});
