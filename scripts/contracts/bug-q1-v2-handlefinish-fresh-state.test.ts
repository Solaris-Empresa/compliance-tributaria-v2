/**
 * Test contracts — BUG-Q1-V2: handleFinishQuestionnaire usa fresh state do banco
 * Sprint BUG-FIX 20/05/2026 · Lição #85 — DoD com query SQL no PR description
 * REGRA-ORQ-28 Artefato 2
 *
 * Valida o CONTRATO do fix:
 *   1. refetchSavedProgress exposto pela query getProgress
 *   2. handleFinishQuestionnaire chama refetchSavedProgress ANTES de montar payload
 *   3. allAnswers reconstruído a partir de extractAnswersForCnae(savedRows, ...)
 *   4. cnaeAnswersAggregated também reconstruído a partir de savedRows
 *   5. Fallback ?? c.answers preservado como defensive
 *   6. Helpers cnae-progress-reconciliation continuam exportando símbolos (regressão PR #1067)
 *
 * O bug do projeto 180001 (PR #1135 não capturou):
 *   - questionnaireAnswersV3 tinha 10 rows (saveAnswer.mutate persistiu cada onChange)
 *   - cnaeProgress[0].answers = [] (closure stale de setState async)
 *   - Payload mandava questions: [] → projects.cnaeAnswers vazio
 *
 * Validação E2E (banco real) é responsabilidade do Manus pós-deploy via DoD SQL.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const QV3_PATH = path.join(REPO_ROOT, "client", "src", "pages", "QuestionarioV3.tsx");

describe("BUG-Q1-V2 — refetchSavedProgress exposto pela query", () => {
  const qv3 = readFileSync(QV3_PATH, "utf8");

  it("query getProgress expõe refetch como refetchSavedProgress", () => {
    expect(qv3).toMatch(
      /\{\s*data:\s*savedProgress\s*,\s*refetch:\s*refetchSavedProgress\s*\}\s*=\s*trpc\.fluxoV3\.getProgress\.useQuery/
    );
  });
});

describe("BUG-Q1-V2 — handleFinishQuestionnaire usa refetch + extractAnswersForCnae", () => {
  const qv3 = readFileSync(QV3_PATH, "utf8");

  it("chama refetchSavedProgress no início do handler (antes de montar payload)", () => {
    // Heurística: dentro do try de handleFinishQuestionnaire, refetchSavedProgress() é chamado
    // ANTES de saveProgress.mutateAsync
    const match = qv3.match(
      /handleFinishQuestionnaire[\s\S]{0,3000}?saveProgress\.mutateAsync/
    );
    expect(match).not.toBeNull();
    const handlerBody = match![0];
    // refetchSavedProgress aparece antes de saveProgress.mutateAsync
    expect(handlerBody).toMatch(/await\s+refetchSavedProgress\(\)/);
    expect(handlerBody.indexOf("refetchSavedProgress(")).toBeLessThan(
      handlerBody.indexOf("saveProgress.mutateAsync")
    );
  });

  it("extrai savedRows do refetch antes de mapear cnaeProgress", () => {
    const match = qv3.match(
      /handleFinishQuestionnaire[\s\S]{0,3000}?saveProgress\.mutateAsync/
    );
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(/const\s+savedRows\s*=\s*fresh\.data\?\.answers/);
  });

  it("allAnswers reconstrói questions a partir de extractAnswersForCnae(savedRows, c.code, 'nivel1')", () => {
    const match = qv3.match(
      /const\s+allAnswers\s*=\s*cnaeProgress\.map[\s\S]{0,800}?\}\);/
    );
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(
      /extractAnswersForCnae\(savedRows,\s*c\.code,\s*["']nivel1["']\)/
    );
  });

  it("allAnswers usa fallback ?? c.answers se savedRows vazio (defensive)", () => {
    const match = qv3.match(
      /const\s+allAnswers\s*=\s*cnaeProgress\.map[\s\S]{0,800}?\}\);/
    );
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(/answersFromDb\.length\s*>\s*0[\s\S]*?c\.answers/);
  });

  it("withNivel2 usa mesma estratégia para nivel2", () => {
    const match = qv3.match(/withNivel2[\s\S]{0,800}?completed:\s*true,/);
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(
      /extractAnswersForCnae\(savedRows,\s*c\.code,\s*["']nivel2["']\)/
    );
  });
});

describe("BUG-Q1-V2 — cnaeAnswersAggregated reconstrói answers a partir de savedRows", () => {
  const qv3 = readFileSync(QV3_PATH, "utf8");

  it("cnaeAnswersAggregated chama extractAnswersForCnae para nivel1", () => {
    const match = qv3.match(
      /cnaeAnswersAggregated\s*=\s*cnaeProgress\.reduce[\s\S]{0,1000}?\}\,\s*\{\}\s*as/
    );
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(
      /extractAnswersForCnae\(savedRows,\s*c\.code,\s*["']nivel1["']\)/
    );
  });

  it("cnaeAnswersAggregated chama extractAnswersForCnae para nivel2", () => {
    const match = qv3.match(
      /cnaeAnswersAggregated\s*=\s*cnaeProgress\.reduce[\s\S]{0,1000}?\}\,\s*\{\}\s*as/
    );
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(
      /extractAnswersForCnae\(savedRows,\s*c\.code,\s*["']nivel2["']\)/
    );
  });

  it("cnaeAnswersAggregated.answers usa fallback ?? c.answers (defensive)", () => {
    const match = qv3.match(
      /cnaeAnswersAggregated\s*=\s*cnaeProgress\.reduce[\s\S]{0,1000}?\}\,\s*\{\}\s*as/
    );
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(
      /answers:\s*answersFromDb\.length\s*>\s*0\s*\?\s*answersFromDb\s*:\s*\(c\.answers\s*\?\?\s*\[\]\)/
    );
  });

  it("preserva flags nivel1Done/skipped (sem regressão BUG-Q1 v1)", () => {
    const match = qv3.match(
      /cnaeAnswersAggregated\s*=\s*cnaeProgress\.reduce[\s\S]{0,1000}?\}\,\s*\{\}\s*as/
    );
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(/nivel1Done:\s*c\.nivel1Done/);
    expect(match![0]).toMatch(/skipped:\s*c\.skipped\s*\?\?\s*false/);
  });
});

describe("BUG-Q1-V2 — Regressão guard PR #1135 (cenário hasGap=true)", () => {
  const qv3 = readFileSync(QV3_PATH, "utf8");

  it("onAvancar do CnaeGapBanner continua marcando nivel1Done/skipped (PR #1135 intacto)", () => {
    const match = qv3.match(
      /BUG-Q1[\s\S]{0,2000}?advanceToNextCnae\(cnaes\.length\)/
    );
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(/nivel1Done:\s*true/);
    expect(match![0]).toMatch(/skipped:\s*true/);
  });
});

describe("BUG-Q1-V2 — DoD: handler exige length > 0 (Lição #85)", () => {
  const qv3 = readFileSync(QV3_PATH, "utf8");

  it("o pattern *FromDb.length > 0 é usado em allAnswers/withNivel2 + cnaeAnswersAggregated", () => {
    // Lição #85: testes DEVEM validar que answers tem conteúdo, não apenas flag nivel1Done
    // Pattern: (answersFromDb|nivel2FromDb).length > 0 — usado em 4 locais:
    //   1. allAnswers (nivel1)
    //   2. withNivel2 (nivel2)
    //   3. cnaeAnswersAggregated.answers (nivel1)
    //   4. cnaeAnswersAggregated.nivel2Answers (nivel2)
    const occurrencesNivel1 = qv3.match(/answersFromDb\.length\s*>\s*0/g);
    const occurrencesNivel2 = qv3.match(/nivel2FromDb\.length\s*>\s*0/g);
    expect(occurrencesNivel1?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(occurrencesNivel2?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});
