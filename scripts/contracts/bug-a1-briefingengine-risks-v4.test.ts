/**
 * Test contracts — Issue BUG-A1 (#1124): briefingEngine deve ler risks_v4
 * Sprint BUG-FIX 20/05/2026
 * REGRA-ORQ-28 Artefato 2 (mudança de refactor sem schema change — Triade combinada no PR)
 *
 * Estes testes validam o CONTRATO do fix sobre o conteúdo dos arquivos editados.
 * Validação runtime (briefing.section_riscos.top_risks > 0) é responsabilidade
 * do Manus pós-deploy via DoD SQL.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const BRIEFING_PATH = path.join(REPO_ROOT, "server", "routers", "briefingEngine.ts");
const FLUXO_PATH = path.join(REPO_ROOT, "server", "routers-fluxo-v3.ts");

describe("BUG-A1 — briefingEngine.ts: query migrada de project_risks_v3 para risks_v4", () => {
  const briefing = readFileSync(BRIEFING_PATH, "utf8");

  it("não contém mais SELECT * FROM project_risks_v3", () => {
    expect(briefing).not.toMatch(/SELECT\s+\*\s+FROM\s+project_risks_v3/i);
  });

  it("contém SELECT FROM risks_v4 com filtro status='active'", () => {
    expect(briefing).toMatch(/FROM\s+risks_v4/i);
    expect(briefing).toMatch(/AND\s+status\s*=\s*'active'/i);
  });

  it("aliases v3→v4 preservam consumers JS (requirement_id, risk_code, risk_dimension)", () => {
    expect(briefing).toMatch(/rule_id\s+AS\s+requirement_id/i);
    expect(briefing).toMatch(/rule_id\s+AS\s+risk_code/i);
    expect(briefing).toMatch(/categoria\s+AS\s+risk_dimension/i);
  });

  it("CASE severidade mapeia para domínio v3 (risk_level: alto/medio/baixo)", () => {
    expect(briefing).toMatch(/CASE\s+severidade/i);
    expect(briefing).toMatch(/WHEN\s+'alta'\s+THEN\s+'alto'/i);
    expect(briefing).toMatch(/WHEN\s+'media'\s+THEN\s+'medio'/i);
    expect(briefing).toMatch(/WHEN\s+'oportunidade'\s+THEN\s+'baixo'/i);
  });

  it("source_reference usa COALESCE(rag_artigo_exato, artigo)", () => {
    expect(briefing).toMatch(/COALESCE\(rag_artigo_exato,\s*artigo\)\s+AS\s+source_reference/i);
  });

  it("gap_id retornado como NULL (descontinuado em v4)", () => {
    expect(briefing).toMatch(/NULL\s+AS\s+gap_id/i);
  });

  it("inclui campos novos do v4: gap_detected, rag_validated, rag_confidence, evidence_count", () => {
    expect(briefing).toMatch(/\bgap_detected\b/);
    expect(briefing).toMatch(/\brag_validated\b/);
    expect(briefing).toMatch(/\brag_confidence\b/);
    expect(briefing).toMatch(/\bevidence_count\b/);
  });

  it("ORDER BY usa FIELD(severidade) + confidence DESC (substitui hybrid_score)", () => {
    expect(briefing).toMatch(
      /ORDER\s+BY[\s\S]*?FIELD\(severidade,\s*'alta',\s*'media',\s*'oportunidade'\)[\s\S]*?confidence\s+DESC/i
    );
  });
});

describe("BUG-A1 — briefingEngine.ts: filtros JS adaptados ao domínio v4", () => {
  const briefing = readFileSync(BRIEFING_PATH, "utf8");

  it("risksCriticos usa filter('alto') (decisão P.O. Opção A — colapso com risksAltos)", () => {
    // Aceita aspas duplas ou simples
    expect(briefing).toMatch(
      /risksCriticos\s*=\s*risks\.filter\(\(r:\s*any\)\s*=>\s*r\.risk_level\s*===\s*["']alto["']\)/
    );
  });

  it("risksCriticos NÃO usa filter('critico') (valor inexistente em v4)", () => {
    expect(briefing).not.toMatch(
      /risksCriticos\s*=\s*risks\.filter\(\(r:\s*any\)\s*=>\s*r\.risk_level\s*===\s*["']critico["']\)/
    );
  });

  it("risksAltos continua filter('alto')", () => {
    expect(briefing).toMatch(
      /risksAltos\s*=\s*risks\.filter\(\(r:\s*any\)\s*=>\s*r\.risk_level\s*===\s*["']alto["']\)/
    );
  });
});

describe("BUG-A1 — briefingEngine.ts: financial_exposure_total descontinuado (P.O. Opção A)", () => {
  const briefing = readFileSync(BRIEFING_PATH, "utf8");

  it("financial_exposure_total é literal 0 (não reduce sobre financial_impact_percent)", () => {
    expect(briefing).toMatch(/financial_exposure_total:\s*0,/);
  });

  it("não contém mais r.financial_impact_percent (campo descontinuado)", () => {
    expect(briefing).not.toMatch(/r\.financial_impact_percent/);
  });
});

describe("BUG-A1 — briefingEngine.ts: metadata strings atualizadas", () => {
  const briefing = readFileSync(BRIEFING_PATH, "utf8");

  it("fonte_dados menciona risks_v4 e actionPlans (não project_risks_v3 nem project_actions_v3)", () => {
    // Captura literal da template string da fonte_dados (escopo cirúrgico — evita falso positivo)
    expect(briefing).toMatch(
      /fonte_dados:\s*`[^`]*risks_v4\s+\(\$\{totalRisks\}\s+riscos\)[^`]*actionPlans/
    );
    expect(briefing).not.toMatch(
      /fonte_dados:\s*`[^`]*project_risks_v3\s+\(\$\{totalRisks\}/
    );
    expect(briefing).not.toMatch(
      /fonte_dados:\s*`[^`]*project_actions_v3\s+\(\$\{totalActions\}/
    );
  });

  it("traceabilityMap.riscos = [\"risks_v4\"]", () => {
    expect(briefing).toMatch(/riscos:\s*\[\s*["']risks_v4["']\s*\]/);
    expect(briefing).not.toMatch(/riscos:\s*\[\s*["']project_risks_v3["']\s*\]/);
  });

  it("traceabilityMap.plano_acao = [\"actionPlans\"] (não project_actions_v3)", () => {
    expect(briefing).toMatch(/plano_acao:\s*\[\s*["']actionPlans["']\s*\]/);
  });
});

describe("BUG-A1 — routers-fluxo-v3.ts: G17-B desativado", () => {
  const fluxo = readFileSync(FLUXO_PATH, "utf8");

  it("não contém mais chamada ativa a deriveRisksFromGaps no fluxo completeOnda1", () => {
    // Imports (L64) preservados — testes ainda usam. Mas não pode haver invocação ativa.
    // Procura por `deriveRisksFromGaps(` em contexto não-comentado.
    const lines = fluxo.split("\n");
    const activeCalls = lines.filter(
      (l) =>
        /deriveRisksFromGaps\s*\(/.test(l) &&
        !l.trim().startsWith("//") &&
        !l.trim().startsWith("*") &&
        !/import/.test(l)
    );
    expect(activeCalls).toEqual([]);
  });

  it("não contém mais chamada ativa a persistRisks no fluxo completeOnda1", () => {
    const lines = fluxo.split("\n");
    const activeCalls = lines.filter(
      (l) =>
        /\bpersistRisks\s*\(/.test(l) &&
        !l.trim().startsWith("//") &&
        !l.trim().startsWith("*") &&
        !/import/.test(l)
    );
    expect(activeCalls).toEqual([]);
  });

  it("contém log de descontinuação g17b_deactivated", () => {
    expect(fluxo).toMatch(/event:\s*["']g17b_deactivated["']/);
    expect(fluxo).toMatch(/issue:\s*["']BUG-A1\s+#1124["']/);
  });

  it("preserva import de deriveRisksFromGaps/persistRisks (testes legados precisam)", () => {
    expect(fluxo).toMatch(
      /import\s*\{\s*deriveRisksFromGaps\s*,\s*persistRisks\s*\}\s*from\s+["']\.\/routers\/riskEngine["']/
    );
  });
});
