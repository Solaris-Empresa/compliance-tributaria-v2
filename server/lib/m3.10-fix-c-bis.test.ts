/**
 * m3.10-fix-c-bis.test.ts
 * Sprint M3.10 Fix C-bis (post-mortem #975 + projeto #3690001)
 *
 * Bug original (UPSTREAM, regressão do PR #977):
 *   Auto-trigger novo do RiskDashboardV4 chama generateAllSourcesMutation,
 *   que apenas LÊ project_gaps_v3. Nenhum caller do auto-trigger ESCREVE gaps
 *   v1 (regulatorio). Resultado: projeto greenfield (#3690001) tem 0 gaps v1
 *   no banco → matriz mono-solaris (winner-takes-all do rank).
 *
 * Bug original (UI, herdado de Sprint Z-12):
 *   risks_v4.source_priority é mono-valor (fonte vencedora do rank).
 *   evidence.gaps[*].fonte preserva multi-fonte mas é ignorado pela UI.
 *   Resultado: 3/6 riscos no #3690001 têm contribuição multi-fonte (solaris +
 *   iagen) no evidence, mas UI exibe só "Solaris".
 *
 * Fix C-bis (este PR):
 *   1. Auto-trigger e botão manual: sequência write→read com try/catch
 *      (await ensureV1GapsMutation → generateAllSourcesMutation)
 *   2. UI Breadcrumb4: lê evidence.gaps[*].fonte e exibe N badges
 *   3. Fallback para [source_priority] quando evidence ausente/malformado
 *
 * Triade ORQ-28 (LEVE — fast-track P0, frontend-only):
 *   Test contracts source-static + helper unitário.
 *   Validação E2E real é responsabilidade do Manus (greenfield + pré-existente
 *   + edge case evidence vazio).
 *
 * Vinculadas:
 * - PR #975 (post-mortem mono-fonte)
 * - PR #976 (Fix B — risk_category_code)
 * - PR #977 (Fix A1 — pipeline unificado, mas regressão de write)
 * - Diagnóstico Manus 2026-05-05 (#3690001 com 0 gaps v1)
 * - Lição #65 (rastrear fluxo end-to-end)
 * - Lição #66 (spec sem dados = ilusão)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const FRONTEND_SRC = readFileSync(
  path.resolve(
    __dirname,
    "../../client/src/components/RiskDashboardV4.tsx",
  ),
  "utf-8",
);

// ---------------------------------------------------------------------------
// Frente 1 — restauração da chamada a gapEngine.analyzeGaps (write-only)
// ---------------------------------------------------------------------------
describe("M3.10 Fix C-bis — Frente 1: ensureV1GapsMutation no fluxo", () => {
  it("declara ensureV1GapsMutation via trpc.gapEngine.analyzeGaps", () => {
    expect(FRONTEND_SRC).toMatch(
      /ensureV1GapsMutation\s*=\s*trpc\.gapEngine\.analyzeGaps\.useMutation/,
    );
  });

  it("ensureV1GapsMutation NÃO tem onSuccess (write-only — não dispara cadeia legada)", () => {
    // Extrai bloco da declaração de ensureV1GapsMutation até a primeira linha
    // que fecha a useMutation (`});` em coluna 2). Filtra comentários (//) para
    // que menções a "onSuccess" em comentários explicativos não causem falso positivo.
    const lines = FRONTEND_SRC.split("\n");
    const startIdx = lines.findIndex((l) =>
      /ensureV1GapsMutation\s*=\s*trpc\.gapEngine\.analyzeGaps\.useMutation/.test(l),
    );
    expect(startIdx).toBeGreaterThanOrEqual(0);
    const endIdx = lines.findIndex(
      (l, i) => i > startIdx && /^\s{0,4}\}\);?\s*$/.test(l),
    );
    expect(endIdx).toBeGreaterThan(startIdx);
    const blockNoComments = lines
      .slice(startIdx, endIdx + 1)
      .filter((l) => !/^\s*\/\//.test(l)) // remove linhas de comentário
      .join("\n");
    expect(blockNoComments).not.toMatch(/onSuccess:/);
    expect(blockNoComments).toMatch(/onError:/);
  });

  it("auto-trigger usa try/catch + sequência ensureV1Gaps → generateAllSources", () => {
    // Fix #1072-v2: sessionStorage.setItem substitui hasAutoTriggered.current = true
    expect(FRONTEND_SRC).toMatch(
      /sessionStorage\.setItem\(autoTriggerKey[\s\S]{0,800}try\s*\{[\s\S]{0,300}await\s+ensureV1GapsMutation\.mutateAsync/,
    );
  });

  it("auto-trigger: catch absorve falha (não relança) e Passo 2 ainda roda", () => {
    // Fix #1072-v2: sessionStorage.setItem substitui hasAutoTriggered.current = true
    const trigger = FRONTEND_SRC.match(
      /sessionStorage\.setItem\(autoTriggerKey[\s\S]{0,1500}generateAllSourcesMutation\.mutate\(\s*\{\s*projectId\s*\}\s*\)/,
    );
    expect(trigger).toBeTruthy();
    expect(trigger![0]).toMatch(/catch\s*\(\s*err\s*\)/);
    expect(trigger![0]).toMatch(/console\.warn[\s\S]{0,200}M3\.10 Fix C-bis/);
    // Passo 2 (generateAllSourcesMutation.mutate) DEVE estar APÓS o fechamento
    // do catch — não dentro do bloco try nem do catch
    const lines = trigger![0].split("\n");
    const catchIdx = lines.findIndex((l) => /catch\s*\(\s*err/.test(l));
    const generateIdx = lines.findIndex((l) =>
      /generateAllSourcesMutation\.mutate/.test(l),
    );
    expect(generateIdx).toBeGreaterThan(catchIdx);
    // E as linhas entre catch e generate devem incluir o fechamento `}` do catch
    const between = lines.slice(catchIdx, generateIdx).join("\n");
    expect(between).toMatch(/\}\s*$/m); // pelo menos um } isolado fechando catch
  });

  it("botão manual usa mesma sequência write→read", () => {
    // Match: onClick async com ensureV1GapsMutation.mutateAsync seguido de generateAllSourcesMutation.mutate
    expect(FRONTEND_SRC).toMatch(
      /onClick=\{\s*async\s*\(\)[\s\S]{0,500}ensureV1GapsMutation\.mutateAsync[\s\S]{0,500}generateAllSourcesMutation\.mutate/,
    );
  });

  it("isGenerating inclui ensureV1GapsMutation.isPending", () => {
    expect(FRONTEND_SRC).toMatch(
      /isGenerating\s*=[\s\S]{0,500}ensureV1GapsMutation\.isPending/,
    );
  });

  it("idempotência: ensureV1Gaps chama analyzeGaps com dry_run: false", () => {
    // dry_run: false → ativa DELETE+INSERT scoped no procedure (Bug A fix M3.8.1)
    expect(FRONTEND_SRC).toMatch(
      /ensureV1GapsMutation\.mutateAsync\(\s*\{\s*project_id:\s*projectId,\s*dry_run:\s*false\s*\}/,
    );
  });
});

// ---------------------------------------------------------------------------
// Mutation legada — preservada com deprecated marker
// ---------------------------------------------------------------------------
describe("M3.10 Fix C-bis — _legacyAnalyzeGapsMutation preservada para compat", () => {
  it("_legacyAnalyzeGapsMutation está declarada (compat para uso externo)", () => {
    expect(FRONTEND_SRC).toMatch(
      /_legacyAnalyzeGapsMutation\s*=\s*trpc\.gapEngine\.analyzeGaps\.useMutation/,
    );
  });

  it("_legacyAnalyzeGapsMutation tem JSDoc @deprecated apontando para ensureV1GapsMutation", () => {
    expect(FRONTEND_SRC).toMatch(
      /@deprecated\s+M3\.10 Fix C-bis[\s\S]{0,300}ensureV1GapsMutation/,
    );
  });

  it("auto-trigger NÃO chama _legacyAnalyzeGapsMutation (apenas display de isPending)", () => {
    // Fix #1072-v2: sessionStorage.setItem substitui hasAutoTriggered.current = true
    const trigger = FRONTEND_SRC.match(
      /sessionStorage\.setItem\(autoTriggerKey[\s\S]{0,1000}generateAllSourcesMutation\.mutate\(\s*\{\s*projectId\s*\}\s*\)/,
    );
    expect(trigger).toBeTruthy();
    expect(trigger![0]).not.toMatch(/_legacyAnalyzeGapsMutation\.mutate/);
  });

  it("botão manual NÃO chama _legacyAnalyzeGapsMutation no onClick", () => {
    // O botão tem onClick={async () => { ... }} — extrair esse bloco
    const botao = FRONTEND_SRC.match(
      /onClick=\{\s*async\s*\(\)[\s\S]{0,1000}generateAllSourcesMutation\.mutate\(\s*\{\s*projectId\s*\}\s*\)/,
    );
    expect(botao).toBeTruthy();
    expect(botao![0]).not.toMatch(/_legacyAnalyzeGapsMutation\.mutate/);
  });
});

// ---------------------------------------------------------------------------
// Frente 2 — UI exibe múltiplas fontes do evidence
// ---------------------------------------------------------------------------
describe("M3.10 Fix C-bis — Frente 2: getSourceContributors helper", () => {
  it("função getSourceContributors está declarada", () => {
    expect(FRONTEND_SRC).toMatch(
      /function\s+getSourceContributors\s*\(\s*risk:\s*RiskData\s*\):\s*string\[\]/,
    );
  });

  it("helper retorna [source_priority] quando evidence é null (fallback 1)", () => {
    expect(FRONTEND_SRC).toMatch(
      /if\s*\(\s*!evidence\s*\)\s*return\s+\[\s*risk\.source_priority\s*\]/,
    );
  });

  it("helper retorna [source_priority] quando evidence é Array (formato legado)", () => {
    expect(FRONTEND_SRC).toMatch(
      /if\s*\(\s*Array\.isArray\(evidence\)\s*\)\s*return\s+\[\s*risk\.source_priority\s*\]/,
    );
  });

  it("helper extrai fontes de evidence.gaps[*].fonte quando ConsolidatedEvidence", () => {
    expect(FRONTEND_SRC).toMatch(
      /\(evidence\s+as\s+ConsolidatedEvidence\)\.gaps[\s\S]{0,200}\.map\(\s*\(\s*g\s*\)\s*=>\s*g\.fonte\s*\)/,
    );
  });

  it("helper faz dedup via Set e ordenação alfabética", () => {
    expect(FRONTEND_SRC).toMatch(
      /\[\s*\.\.\.new\s+Set\(fontes\)\s*\]\.sort\(\)/,
    );
  });

  it("helper retorna [source_priority] quando gaps array vazio", () => {
    expect(FRONTEND_SRC).toMatch(
      /if\s*\(\s*!gaps\s*\|\|\s*gaps\.length\s*===\s*0\s*\)\s*return\s+\[\s*risk\.source_priority\s*\]/,
    );
  });

  it("helper filtra fontes vazias/null antes de dedup", () => {
    expect(FRONTEND_SRC).toMatch(
      /\.filter\(\s*\([\s\S]{0,80}=>\s*typeof\s+f\s*===\s*["']string["']\s*&&\s*f\.length\s*>\s*0\s*\)/,
    );
  });
});

// ---------------------------------------------------------------------------
// Frente 2 — Breadcrumb4 renderiza N badges de fonte
// ---------------------------------------------------------------------------
describe("M3.10 Fix C-bis — Breadcrumb4 renderiza múltiplas fontes", () => {
  it("Breadcrumb4 aceita prop opcional fontes: string[]", () => {
    expect(FRONTEND_SRC).toMatch(
      /function\s+Breadcrumb4\s*\(\s*\{[\s\S]{0,200}fontes\?:\s*string\[\]/,
    );
  });

  it("compat: quando fontes não fornecido, deriva [breadcrumb[0]] (1 badge)", () => {
    expect(FRONTEND_SRC).toMatch(
      /fontesExibidas\s*=\s*fontes\s+&&\s+fontes\.length\s*>\s*0\s*\?\s*fontes\s*:\s*\[\s*fonte\s*\]/,
    );
  });

  it("renderiza badge para cada fonte via .map", () => {
    expect(FRONTEND_SRC).toMatch(
      /fontesExibidas\.map\(\s*\(f,\s*i\)\s*=>/,
    );
  });

  it("badge de fonte usa SOURCE_LABELS para tradução", () => {
    expect(FRONTEND_SRC).toMatch(
      /\{\s*SOURCE_LABELS\[f\]\s*\?\?\s*f\s*\}/,
    );
  });

  it("badge de fonte tem data-testid risk-source-badge-{fonte}", () => {
    expect(FRONTEND_SRC).toMatch(
      /data-testid=\{\s*`risk-source-badge-\$\{f\}`\s*\}/,
    );
  });

  it("separador '+' entre múltiplos badges de fonte (não '›')", () => {
    // O separador "›" é entre fonte → categoria → artigo → ruleId
    // Entre fontes múltiplas, usar "+"
    expect(FRONTEND_SRC).toMatch(
      /\{i\s*>\s*0\s*&&\s*<span[\s\S]{0,200}>\s*\+\s*<\/span>\}/,
    );
  });

  it("ambos callers de Breadcrumb4 passam fontes via getSourceContributors", () => {
    const callers = FRONTEND_SRC.match(
      /<Breadcrumb4\s+breadcrumb=\{breadcrumb\}\s+fontes=\{getSourceContributors\(risk\)\}\s*\/>/g,
    );
    expect(callers).toBeTruthy();
    expect(callers!.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Sanidade — SOURCE_LABELS cobre fontes ampliadas (M3.8.1 + M3.10)
// ---------------------------------------------------------------------------
describe("M3.10 Fix C-bis — SOURCE_LABELS cobertura completa", () => {
  it("SOURCE_LABELS tem 'regulatorio' (M3.8.1 Bug C ampliação)", () => {
    expect(FRONTEND_SRC).toMatch(/regulatorio:\s*["']Regulatório["']/);
  });

  it("SOURCE_LABELS tem 'inferred' (normative-inference)", () => {
    expect(FRONTEND_SRC).toMatch(/inferred:\s*["']Inferido["']/);
  });

  it("SOURCE_LABELS preserva valores legados (cnae, ncm, nbs, solaris, iagen)", () => {
    expect(FRONTEND_SRC).toMatch(/cnae:\s*["']CNAE["']/);
    expect(FRONTEND_SRC).toMatch(/ncm:\s*["']NCM["']/);
    expect(FRONTEND_SRC).toMatch(/nbs:\s*["']NBS["']/);
    expect(FRONTEND_SRC).toMatch(/solaris:\s*["']Solaris["']/);
    expect(FRONTEND_SRC).toMatch(/iagen:\s*["']IA Gen["']/);
  });
});

// ---------------------------------------------------------------------------
// Compat — pré-requisitos da Sprint M3.10 mantidos
// ---------------------------------------------------------------------------
describe("M3.10 Fix C-bis — pré-requisitos das sprints anteriores preservados", () => {
  it("Fix B (PR #976): topico-to-categoria existe", () => {
    const TOPICO_SRC = readFileSync(
      path.resolve(__dirname, "../config/topico-to-categoria.ts"),
      "utf-8",
    );
    expect(TOPICO_SRC).toMatch(/export\s+function\s+mapTopicToCategory/);
  });

  it("Fix A1 (PR #977): generateRisksAllSources procedure existe", () => {
    const RISKS_V4_SRC = readFileSync(
      path.resolve(__dirname, "../routers/risks-v4.ts"),
      "utf-8",
    );
    expect(RISKS_V4_SRC).toMatch(/generateRisksAllSources:\s*protectedProcedure/);
  });

  it("Fix A1 (PR #977): getAllGapsForProject existe e lê todos sources", () => {
    const DB_SRC = readFileSync(
      path.resolve(__dirname, "db-queries-risks-v4.ts"),
      "utf-8",
    );
    expect(DB_SRC).toMatch(/export\s+async\s+function\s+getAllGapsForProject/);
    // Sem filtro por source — confirmação crítica
    const fnBody = DB_SRC.match(
      /export\s+async\s+function\s+getAllGapsForProject[\s\S]+?\n\}/,
    );
    expect(fnBody).toBeTruthy();
    expect(fnBody![0]).not.toMatch(/AND\s+source\s*=/i);
  });
});
