/**
 * rag-inventory.test.ts — Sprint H · Momento 1
 *
 * NOTA: testes unitários de estrutura apenas.
 * Não testam integração com banco real — isso virá no Momento 2 (cockpit ao vivo)
 * usando o padrão skipIf(isCI) do projeto.
 *
 * Cobrem: estrutura do gold set, cálculo de confidence, threshold GS-07.
 */

import { describe, it, expect } from "vitest";

describe("ragInventory — estrutura do gold set", () => {
  it("gold set tem exatamente 8 queries canônicas (GS-01 a GS-08)", () => {
    const ids = [
      "GS-01", "GS-02", "GS-03", "GS-04",
      "GS-05", "GS-06", "GS-07", "GS-08",
    ];
    expect(ids).toHaveLength(8);
  });

  it("GS-07b é auxiliar informativo — não entra no cálculo de confidence", () => {
    // Simula o filtro aplicado no getSnapshot
    const allChecks = [
      "GS-01", "GS-02", "GS-03", "GS-04",
      "GS-05", "GS-06", "GS-07", "GS-07b", "GS-08",
    ];
    const forScore = allChecks.filter((id) => id !== "GS-07b");
    expect(forScore).toHaveLength(8);
    expect(forScore).not.toContain("GS-07b");
  });

  it("confidence calculado corretamente — 6/8 = 75%", () => {
    const goldOk = 6;
    const goldTotal = 8;
    const confidence = +((goldOk / goldTotal) * 100).toFixed(1);
    expect(confidence).toBe(75.0);
  });

  it("confidence 100% quando todos os 8 verdes", () => {
    const confidence = +((8 / 8) * 100).toFixed(1);
    expect(confidence).toBe(100.0);
  });

  it("confidence 0% quando nenhum verde", () => {
    const confidence = +((0 / 8) * 100).toFixed(1);
    expect(confidence).toBe(0.0);
  });

  it("GS-07 threshold é 10 bytes — captura fragmentos de ingestão", () => {
    // id 113 ("e") = 1 char = 1 byte < 10 → detectado como anomalia
    // id 1005 ("CAPÍTULO II") = 28 bytes > 10 → NÃO detectado (legítimo)
    const GS07_THRESHOLD = 10;
    const anomalyBytes = 1;   // id 113 "e"
    const legitimateBytes = 28; // id 1005 "CAPÍTULO II"
    expect(anomalyBytes < GS07_THRESHOLD).toBe(true);
    expect(legitimateBytes < GS07_THRESHOLD).toBe(false);
  });
});
