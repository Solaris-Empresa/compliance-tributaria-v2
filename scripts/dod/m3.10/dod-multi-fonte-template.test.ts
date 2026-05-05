/**
 * Test unit de formatReport (Lição #71 — autor valida não só o parser,
 * mas também o report writer que renderiza a evidência DoD).
 *
 * Cobre 3 cenários ortogonais (REGRA-ORQ-34 Protocolo 4):
 * 1. Matriz vazia (0 riscos)
 * 2. Mono-fonte (1 fonte agregada, 0 multi-fonte por risco)
 * 3. Multi-fonte misturado (2+ fontes agregadas, ≥1 risco multi-fonte)
 *
 * runDoD() não é testado aqui (requer DATABASE_URL — escopo de integração).
 */
import { describe, it, expect } from "vitest";
import { formatReport, type DoDResult } from "./dod-multi-fonte-template";

describe("formatReport (Lição #71)", () => {
  it("renderiza matriz vazia com ambos verdicts FAIL", () => {
    const empty: DoDResult = {
      projectId: 999,
      q1Aggregate: { distinctSources: 0, distribution: {} },
      q2PerRisk: { multiFontes: [], monoFontes: [] },
      verdict: { aggregatePass: false, perRiskAtLeastOne: false },
    };

    const report = formatReport(empty);

    expect(report).toContain("projeto #999");
    expect(report).toContain("Distintos: 0");
    expect(report).toContain("DoD (>=2): ❌ FAIL");
    expect(report).toContain("DoD (>=1 multi): ❌ FAIL");
    expect(report).toContain("SUMMARY: 0 multi-fonte / 0 mono-fonte");
  });

  it("renderiza mono-fonte (1 source agregada) com ambos verdicts FAIL", () => {
    // Cenário pre-deploy Fix C-bis: matriz só com 'solaris'
    const monoOnly: DoDResult = {
      projectId: 3690001,
      q1Aggregate: {
        distinctSources: 1,
        distribution: { solaris: 6 },
      },
      q2PerRisk: {
        multiFontes: [],
        monoFontes: [
          { ruleCode: "credito_presumido", fonte: "solaris", gapCount: 14 },
          { ruleCode: "split_payment", fonte: "solaris", gapCount: 22 },
        ],
      },
      verdict: { aggregatePass: false, perRiskAtLeastOne: false },
    };

    const report = formatReport(monoOnly);

    expect(report).toContain("projeto #3690001");
    expect(report).toContain("solaris: 6 riscos");
    expect(report).toContain("DoD (>=2): ❌ FAIL");
    expect(report).toContain("DoD (>=1 multi): ❌ FAIL");
    expect(report).toContain("🟢 MONO");
    expect(report).not.toContain("🔴 MULTI");
    expect(report).toContain("SUMMARY: 0 multi-fonte / 2 mono-fonte");
  });

  it("renderiza multi-fonte misturado com ambos verdicts PASS", () => {
    // Cenário pós-Fix C-bis #3780001 (audit v7.64)
    const multiMixed: DoDResult = {
      projectId: 3780001,
      q1Aggregate: {
        distinctSources: 2,
        distribution: { iagen: 2, regulatorio: 6 },
      },
      q2PerRisk: {
        multiFontes: [
          {
            ruleCode: "confissao_automatica",
            fontes: ["iagen", "regulatorio"],
            gapCount: 29,
          },
          {
            ruleCode: "regime_diferenciado",
            fontes: ["iagen", "regulatorio"],
            gapCount: 13,
          },
        ],
        monoFontes: [
          { ruleCode: "split_payment", fonte: "regulatorio", gapCount: 22 },
          { ruleCode: "credito_presumido", fonte: "regulatorio", gapCount: 14 },
        ],
      },
      verdict: { aggregatePass: true, perRiskAtLeastOne: true },
    };

    const report = formatReport(multiMixed);

    expect(report).toContain("projeto #3780001");
    expect(report).toContain("iagen: 2 riscos");
    expect(report).toContain("regulatorio: 6 riscos");
    expect(report).toContain("DoD (>=2): ✅ PASS");
    expect(report).toContain("DoD (>=1 multi): ✅ PASS");
    expect(report).toContain("🔴 MULTI");
    expect(report).toContain("🟢 MONO");
    expect(report).toContain("fontes=[iagen, regulatorio]");
    expect(report).toContain("SUMMARY: 2 multi-fonte / 2 mono-fonte");
  });
});
