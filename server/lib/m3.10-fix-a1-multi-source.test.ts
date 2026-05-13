/**
 * m3.10-fix-a1-multi-source.test.ts
 * Sprint M3.10 Fix A1 — backend lê project_gaps_v3 direto (todos sources)
 *
 * Bug original (post-mortem #975 — UPSTREAM):
 *   gaps SOLARIS/IAGEN escritos em project_gaps_v3 não tinham consumidor
 *   no caminho de risco. Frontend só passava ao engine os 138 gaps v1
 *   retornados por gapEngine.analyzeGaps. Resultado: matriz mono-fonte.
 *
 * Fix A1: nova procedure `generateRisksAllSources` que consome via
 * `getAllGapsForProject` os 3 sources. Frontend simplificado para 1 chamada.
 *
 * Pré-requisito: Fix B (PR #976) preencheu risk_category_code para gaps
 * solaris/iagen — sem isso, este Fix não basta (cairiam em "unmapped").
 *
 * Cobertura:
 * - getAllGapsForProject: source-static (existência da função + query)
 * - mapSourceToOrigin: helpers internos cobertos via grep + intent
 * - generateRisksAllSources procedure: source-static (existência + flow)
 * - frontend: usa generateRisksAllSources no auto-trigger
 *
 * Nota: testes de integração com DB real (que validariam comportamento
 * end-to-end multi-fonte) são responsabilidade do Manus pós-merge via
 * Definition of Done (post-mortem #975 Seção 9).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const DB_QUERIES_SRC = readFileSync(
  path.resolve(__dirname, "db-queries-risks-v4.ts"),
  "utf-8",
);
const RISKS_V4_SRC = readFileSync(
  path.resolve(__dirname, "../routers/risks-v4.ts"),
  "utf-8",
);
const FRONTEND_SRC = readFileSync(
  path.resolve(__dirname, "../../client/src/components/RiskDashboardV4.tsx"),
  "utf-8",
);

// ---------------------------------------------------------------------------
// Backend: getAllGapsForProject
// ---------------------------------------------------------------------------
describe("M3.10 Fix A1 — getAllGapsForProject (db-queries-risks-v4)", () => {
  it("função getAllGapsForProject está exportada", () => {
    expect(DB_QUERIES_SRC).toMatch(
      /export\s+async\s+function\s+getAllGapsForProject\s*\(/,
    );
  });

  it("retorna Promise<GapInput[]>", () => {
    expect(DB_QUERIES_SRC).toMatch(
      /getAllGapsForProject[\s\S]{0,200}Promise<GapInput\[\]>/,
    );
  });

  it("query lê project_gaps_v3 com filtro por project_id E analysis_version=3", () => {
    expect(DB_QUERIES_SRC).toMatch(
      /FROM\s+project_gaps_v3[\s\S]{0,200}WHERE\s+project_id\s*=\s*\?\s+AND\s+analysis_version\s*=\s*3/i,
    );
  });

  it("query NÃO filtra por source (lê v1 + solaris + iagen)", () => {
    // Match na query da função getAllGapsForProject — não pode ter AND source =
    const fnBody = DB_QUERIES_SRC.match(
      /export\s+async\s+function\s+getAllGapsForProject[\s\S]+?\n\}/,
    );
    expect(fnBody).toBeTruthy();
    expect(fnBody![0]).not.toMatch(/AND\s+source\s*=/i);
  });

  it("seleciona risk_category_code (necessário para Fix B funcionar)", () => {
    expect(DB_QUERIES_SRC).toMatch(/SELECT[\s\S]{0,500}risk_category_code/);
  });

  it("seleciona source (mapeado para sourceOrigin)", () => {
    expect(DB_QUERIES_SRC).toMatch(/SELECT[\s\S]{0,200}\bsource\b/);
  });

  it("mapSourceToOrigin: 'v1' → 'regulatorio'", () => {
    expect(DB_QUERIES_SRC).toMatch(/case\s+["']v1["']:\s*\n?\s*return\s+["']regulatorio["']/);
  });

  it("mapSourceToOrigin: 'solaris' → 'solaris'", () => {
    expect(DB_QUERIES_SRC).toMatch(/case\s+["']solaris["']:\s*\n?\s*return\s+["']solaris["']/);
  });

  it("mapSourceToOrigin: 'iagen' → 'iagen'", () => {
    expect(DB_QUERIES_SRC).toMatch(/case\s+["']iagen["']:\s*\n?\s*return\s+["']iagen["']/);
  });

  it("mapping para gapStatus cobre os 4 valores do schema (compliant/parcial/nao_aplicavel/nao_compliant)", () => {
    expect(DB_QUERIES_SRC).toMatch(/return\s+["']compliant["']/);
    expect(DB_QUERIES_SRC).toMatch(/return\s+["']parcial["']/);
    expect(DB_QUERIES_SRC).toMatch(/return\s+["']nao_aplicavel["']/);
    expect(DB_QUERIES_SRC).toMatch(/return\s+["']nao_compliant["']/);
  });

  it("propaga risk_category_code do banco para gap.categoria", () => {
    // GapInput.categoria recebe row.risk_category_code (Fix B) — pode ser undefined
    expect(DB_QUERIES_SRC).toMatch(
      /categoria:\s*row\.risk_category_code/,
    );
  });

  it("comentário inline documenta M3.10 Fix A1 + post-mortem #975", () => {
    expect(DB_QUERIES_SRC).toMatch(/M3\.10 Fix A1/);
    expect(DB_QUERIES_SRC).toMatch(/post-mortem/i);
  });
});

// ---------------------------------------------------------------------------
// Backend: nova procedure generateRisksAllSources
// ---------------------------------------------------------------------------
describe("M3.10 Fix A1 — procedure generateRisksAllSources (risks-v4 router)", () => {
  it("procedure generateRisksAllSources existe", () => {
    expect(RISKS_V4_SRC).toMatch(/generateRisksAllSources:\s*protectedProcedure/);
  });

  it("input schema apenas projectId (não recebe gaps externamente)", () => {
    // Match: generateRisksAllSources: ... .input(z.object({ projectId: z.number() }))
    const procBody = RISKS_V4_SRC.match(
      /generateRisksAllSources[\s\S]{0,800}\.input\(z\.object\(\{[\s\S]{0,200}\}\)\)/,
    );
    expect(procBody).toBeTruthy();
    expect(procBody![0]).toMatch(/projectId:\s*z\.number\(\)/);
    expect(procBody![0]).not.toMatch(/gaps:\s*z\.array/);
  });

  it("import de getAllGapsForProject presente", () => {
    expect(RISKS_V4_SRC).toMatch(
      /getAllGapsForProject[\s\S]{0,200}from\s+["'][./]+lib\/db-queries-risks-v4["']/s,
    );
  });

  it("procedure chama getAllGapsForProject", () => {
    expect(RISKS_V4_SRC).toMatch(/await\s+getAllGapsForProject\s*\(\s*input\.projectId\s*\)/);
  });

  it("procedure chama GapToRuleMapper.mapMany", () => {
    expect(RISKS_V4_SRC).toMatch(
      /generateRisksAllSources[\s\S]{0,3000}new\s+GapToRuleMapper[\s\S]{0,500}\.mapMany\(gaps\)/,
    );
  });

  it("procedure chama deleteRisksByProject (limpa snapshot anterior)", () => {
    expect(RISKS_V4_SRC).toMatch(
      /generateRisksAllSources[\s\S]{0,6000}await\s+deleteRisksByProject\(\s*input\.projectId\s*\)/,
      // Limit ampliado para 6000 chars após Fix #1072: novo bloco
      // de versionamento (saveRiskMatrixVersion pré-delete + snapshot da
      // matriz anterior) adicionou ~1300 chars antes do deleteRisksByProject.
    );
  });

  it("procedure chama generateRisksV4Pipeline", () => {
    expect(RISKS_V4_SRC).toMatch(
      /generateRisksAllSources[\s\S]{0,6000}await\s+generateRisksV4Pipeline\(/,
      // Limit ampliado pelo Fix #1072 (vide comentário acima).
    );
  });

  it("retorna gapsBySource (instrumentação para Definition of Done)", () => {
    expect(RISKS_V4_SRC).toMatch(/gapsBySource/);
  });

  it("usa allowLayerInference: false (consistente com mapGapsToRules legado)", () => {
    const procBody = RISKS_V4_SRC.match(
      /generateRisksAllSources[\s\S]+?(?=\n\s{2,4}\/\*\*[\s\S]{0,100}\d+\.\s|\n\}\);)/,
    );
    expect(procBody).toBeTruthy();
    expect(procBody![0]).toMatch(/allowLayerInference:\s*false/);
  });

  it("não modifica generateRisksFromGaps legado (compat preservada)", () => {
    expect(RISKS_V4_SRC).toMatch(/generateRisksFromGaps:\s*protectedProcedure/);
    expect(RISKS_V4_SRC).toMatch(/mappedRules:\s*z\.array\(GapRuleSchema\)/);
  });

  it("não modifica mapGapsToRules legado (compat preservada)", () => {
    expect(RISKS_V4_SRC).toMatch(/mapGapsToRules:\s*protectedProcedure/);
  });

  it("comentário inline documenta M3.10 Fix A1 + post-mortem #975", () => {
    expect(RISKS_V4_SRC).toMatch(/M3\.10 Fix A1/);
    expect(RISKS_V4_SRC).toMatch(/post-mortem/i);
  });
});

// ---------------------------------------------------------------------------
// Frontend: RiskDashboardV4 usa generateRisksAllSources
// ---------------------------------------------------------------------------
describe("M3.10 Fix A1 — frontend RiskDashboardV4 usa pipeline unificado", () => {
  it("declara generateAllSourcesMutation via trpc.risksV4.generateRisksAllSources", () => {
    expect(FRONTEND_SRC).toMatch(
      /generateAllSourcesMutation\s*=\s*trpc\.risksV4\.generateRisksAllSources\.useMutation/,
    );
  });

  it("auto-trigger (useEffect com hasAutoTriggered) chama generateAllSourcesMutation (após Fix C-bis: dentro de IIFE async)", () => {
    // M3.10 Fix C-bis (PR posterior): auto-trigger agora chama
    // ensureV1GapsMutation primeiro (write), depois generateAllSourcesMutation
    // (read+consolidate). Janela ampla cobre comentários inline + try/catch.
    expect(FRONTEND_SRC).toMatch(
      /hasAutoTriggered\.current\s*=\s*true[\s\S]{0,1500}generateAllSourcesMutation\.mutate\(\s*\{\s*projectId\s*\}/,
    );
  });

  it("botão 'Gerar Riscos v4' chama generateAllSourcesMutation (após Fix C-bis: dentro de onClick async)", () => {
    // M3.10 Fix C-bis: onClick agora é async, com try/catch para ensureV1Gaps
    // antes de generateAllSources. A chamada a generateAllSourcesMutation.mutate
    // continua presente — apenas dentro de uma função async.
    expect(FRONTEND_SRC).toMatch(
      /onClick=\{\s*async\s*\(\)[\s\S]{0,800}generateAllSourcesMutation\.mutate\(\s*\{\s*projectId\s*\}\s*\)/,
    );
  });

  it("isGenerating inclui generateAllSourcesMutation.isPending", () => {
    expect(FRONTEND_SRC).toMatch(
      /isGenerating\s*=[\s\S]{0,500}generateAllSourcesMutation\.isPending/,
    );
  });

  it("onSuccess seta reviewQueue + pipelineStats a partir do result", () => {
    expect(FRONTEND_SRC).toMatch(/setReviewQueue\(\s*result\.reviewQueue/);
    expect(FRONTEND_SRC).toMatch(/setPipelineStats\(\s*result\.stats/);
  });

  it("mantém mutations legadas para compat (renomeada para _legacyAnalyzeGapsMutation em Fix C-bis)", () => {
    // M3.10 Fix C-bis: analyzeGapsMutation foi renomeada para _legacyAnalyzeGapsMutation
    // (com JSDoc @deprecated). mapGapsMutation e generateFromGapsMutation preservadas.
    expect(FRONTEND_SRC).toMatch(/_legacyAnalyzeGapsMutation\s*=\s*trpc\.gapEngine\.analyzeGaps/);
    expect(FRONTEND_SRC).toMatch(/mapGapsMutation\s*=\s*trpc\.risksV4\.mapGapsToRules/);
    expect(FRONTEND_SRC).toMatch(
      /generateFromGapsMutation\s*=\s*trpc\.risksV4\.generateRisksFromGaps/,
    );
  });

  it("comentário inline documenta M3.10 Fix A1 + post-mortem #975", () => {
    expect(FRONTEND_SRC).toMatch(/M3\.10 Fix A1/);
    expect(FRONTEND_SRC).toMatch(/post-mortem/i);
  });
});

// ---------------------------------------------------------------------------
// Sanidade — Fix A1 depende de Fix B
// ---------------------------------------------------------------------------
describe("M3.10 Fix A1 — pré-requisito Fix B (PR #976)", () => {
  it("Fix B mergeado: TOPICO_TO_CATEGORIA existe no repo", () => {
    const TOPICO_SRC = readFileSync(
      path.resolve(__dirname, "../config/topico-to-categoria.ts"),
      "utf-8",
    );
    expect(TOPICO_SRC).toMatch(/export\s+const\s+TOPICO_TO_CATEGORIA/);
    expect(TOPICO_SRC).toMatch(/export\s+function\s+mapTopicToCategory/);
  });

  it("Fix B mergeado: solaris-gap-analyzer popula risk_category_code no INSERT", () => {
    const SOLARIS_SRC = readFileSync(
      path.resolve(__dirname, "solaris-gap-analyzer.ts"),
      "utf-8",
    );
    expect(SOLARIS_SRC).toMatch(/source_reference[\s\S]{0,80}risk_category_code/);
  });

  it("Fix B mergeado: iagen-gap-analyzer popula risk_category_code no INSERT", () => {
    const IAGEN_SRC = readFileSync(
      path.resolve(__dirname, "iagen-gap-analyzer.ts"),
      "utf-8",
    );
    expect(IAGEN_SRC).toMatch(/source_reference[\s\S]{0,80}risk_category_code/);
  });
});
