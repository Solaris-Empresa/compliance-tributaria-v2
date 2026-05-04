/**
 * m3.8.1-hotfix.test.ts
 * Sprint M3.8.1 — Hotfix consolidado dos 3 bugs identificados pelo Manus
 * em 2026-05-05 (post-deploy M3.8).
 *
 * Bugs cobertos:
 * - Bug A (P0): gapEngine.ts:459 wipe destrutivo (DELETE sem `AND source = 'v1'`)
 * - Bug B (P1): risk-engine-v4.ts default "iagen" mascarando todas as fontes
 * - Bug C (P2): "regulatorio" ausente do tipo Fonte + SOURCE_RANK
 *
 * Triade ORQ-28 (leve — fast-track P0 REGRA-ORQ-11):
 * Test contracts cobrem comportamento runtime + grep source-static do scoped DELETE.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  getBestSourcePriority,
  SOURCE_RANK,
  type GapRule,
  type Fonte,
} from "./risk-engine-v4";

const GAP_ENGINE_SRC = readFileSync(
  path.resolve(__dirname, "../routers/gapEngine.ts"),
  "utf-8",
);

const buildGap = (fonte: string, ruleId = "R-1"): GapRule => ({
  ruleId,
  categoria: "obrigacao_acessoria",
  artigo: "Art. 1",
  fonte,
  gapClassification: "ausencia",
  requirementId: "REQ-001",
  sourceReference: "LC 214 Art. 1",
  domain: "fiscal",
});

// ---------------------------------------------------------------------------
// Bug A — gapEngine.analyzeGaps DELETE scoped
// ---------------------------------------------------------------------------
describe("M3.8.1 Bug A — gapEngine.ts DELETE preserva multi-source", () => {
  it("DELETE inclui filtro `AND source = 'v1'` (não wipa solaris/iagen)", () => {
    expect(GAP_ENGINE_SRC).toMatch(
      /DELETE FROM project_gaps_v3 WHERE project_id = \? AND analysis_version = 3 AND source = 'v1'/,
    );
  });

  it("comentário inline documenta M3.8.1 + Bug A + race condition", () => {
    expect(GAP_ENGINE_SRC).toMatch(/M3\.8\.1 Bug A/);
  });

  it("não existe DELETE wide (sem source) na rota analyzeGaps", () => {
    // Match exato do DELETE wide antigo (sem AND source) — deve estar AUSENTE.
    const oldPattern =
      /DELETE FROM project_gaps_v3 WHERE project_id = \? AND analysis_version = 3"/;
    expect(GAP_ENGINE_SRC).not.toMatch(oldPattern);
  });
});

// ---------------------------------------------------------------------------
// Bug C — type Fonte + SOURCE_RANK incluem "regulatorio"
// ---------------------------------------------------------------------------
describe("M3.8.1 Bug C — SOURCE_RANK inclui 'regulatorio'", () => {
  it("SOURCE_RANK contém regulatorio com rank 6", () => {
    expect(SOURCE_RANK.regulatorio).toBe(6);
  });

  it("SOURCE_RANK preserva fontes legadas (cnae=1, ncm=2, nbs=3, solaris=4, iagen=5)", () => {
    expect(SOURCE_RANK.cnae).toBe(1);
    expect(SOURCE_RANK.ncm).toBe(2);
    expect(SOURCE_RANK.nbs).toBe(3);
    expect(SOURCE_RANK.solaris).toBe(4);
    expect(SOURCE_RANK.iagen).toBe(5);
  });

  it("regulatorio é a fonte de menor prioridade (rank mais alto)", () => {
    const ranks = Object.values(SOURCE_RANK);
    expect(SOURCE_RANK.regulatorio).toBe(Math.max(...ranks));
  });

  it("type Fonte aceita 'regulatorio' (compilação TS)", () => {
    // Test compile-time: se "regulatorio" não fosse parte de Fonte, esta atribuição
    // falharia em tsc. Test runtime apenas confirma que valor é aceitável.
    const f: Fonte = "regulatorio";
    expect(f).toBe("regulatorio");
  });
});

// ---------------------------------------------------------------------------
// Bug B — getBestSourcePriority default "regulatorio" + ranking correto
// ---------------------------------------------------------------------------
describe("M3.8.1 Bug B — getBestSourcePriority retorna fonte correta", () => {
  it("REGRESSÃO Bug B: gaps com fonte='regulatorio' → retorna 'regulatorio' (não 'iagen')", () => {
    // Cenário canônico do projeto #3480001: 138 gaps todos com fonte='regulatorio'.
    // ANTES: rank 99 para todos → loop nunca atualiza → retorna initial 'iagen'.
    // DEPOIS: rank 6 para regulatorio → loop encontra → retorna 'regulatorio'.
    const gaps = Array.from({ length: 10 }, () => buildGap("regulatorio"));
    expect(getBestSourcePriority(gaps)).toBe("regulatorio");
  });

  it("array vazio → default 'regulatorio' (não 'iagen')", () => {
    expect(getBestSourcePriority([])).toBe("regulatorio");
  });

  it("gaps mistos solaris + iagen → retorna 'solaris' (rank menor)", () => {
    const gaps = [buildGap("iagen"), buildGap("solaris"), buildGap("iagen")];
    expect(getBestSourcePriority(gaps)).toBe("solaris");
  });

  it("gaps mistos cnae + nbs → retorna 'cnae' (rank menor)", () => {
    const gaps = [buildGap("nbs"), buildGap("cnae"), buildGap("ncm")];
    expect(getBestSourcePriority(gaps)).toBe("cnae");
  });

  it("gaps mistos solaris + iagen + regulatorio → retorna 'solaris' (rank menor)", () => {
    // Cenário esperado pós-fix: matriz de riscos com fontes diversificadas.
    const gaps = [
      buildGap("regulatorio"),
      buildGap("iagen"),
      buildGap("solaris"),
      buildGap("regulatorio"),
    ];
    expect(getBestSourcePriority(gaps)).toBe("solaris");
  });

  it("fonte desconhecida → mantém initial value (regulatorio)", () => {
    // Edge case: se uma fonte nova for adicionada e SOURCE_RANK não atualizado,
    // o loop trata como rank 99 e o initial value 'regulatorio' é retornado.
    const gaps = [buildGap("fonte-nova-nao-mapeada")];
    expect(getBestSourcePriority(gaps)).toBe("regulatorio");
  });

  it("um único gap iagen → retorna 'iagen' (regression Q.IA Gen ainda funcional)", () => {
    expect(getBestSourcePriority([buildGap("iagen")])).toBe("iagen");
  });
});

// ---------------------------------------------------------------------------
// Documentação inline
// ---------------------------------------------------------------------------
describe("M3.8.1 — comentários inline documentam fixes", () => {
  const RISK_ENGINE_SRC = readFileSync(
    path.resolve(__dirname, "risk-engine-v4.ts"),
    "utf-8",
  );

  it("risk-engine-v4.ts comenta Bug B na função getBestSourcePriority", () => {
    expect(RISK_ENGINE_SRC).toMatch(/M3\.8\.1 Bug B/);
  });

  it("risk-engine-v4.ts comenta Bug C no type Fonte + SOURCE_RANK", () => {
    expect(RISK_ENGINE_SRC).toMatch(/M3\.8\.1 Bug C/);
  });
});
