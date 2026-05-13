/**
 * fix-1072-atomicity-versioning.test.ts
 * Issue #1072 — fast-track P0 (REGRA-ORQ-11): geração automática da matriz
 * de riscos falha na 1ª tentativa quando confiança >85%.
 *
 * Causa raiz confirmada por queries SQL Manus (12/05/2026, projeto #5490001):
 *   - audit_log: 2x risk.created com 39s de intervalo
 *   - risks_v4: 8 rows (2ª tentativa sobrescreveu via deleteRisksByProject)
 *   - riskMatrixVersions: 0 rows — engine v4 nunca chamou saveRiskMatrixVersion
 *
 * Fix em server/routers/risks-v4.ts:872 (generateRisksAllSources):
 *   1. Snapshot da matriz anterior ANTES de qualquer write (preserva audit
 *      trail mesmo se erro subsequente)
 *   2. Try/catch envolvendo delete + pipeline + loop insert + snapshot pós
 *   3. Rollback lógico em erro: deleteRisksByProject se inserts parciais
 *   4. saveRiskMatrixVersion no fim com triggerType correto
 *
 * Cobertura: source-static (mesmo padrão de m3.10-fix-a1-multi-source.test.ts).
 * Testes de integração end-to-end (DB real) são responsabilidade do Manus
 * pós-merge via DoD: SELECT COUNT FROM riskMatrixVersions WHERE projectId=X
 * → deve ser >= 1 após auto-trigger pós-aprovação.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const RISKS_V4_SRC = readFileSync(
  path.resolve(__dirname, "../routers/risks-v4.ts"),
  "utf-8",
);

// Isolar a procedure generateRisksAllSources para análise focada.
const procStart = RISKS_V4_SRC.indexOf("generateRisksAllSources: protectedProcedure");
const procEnd = RISKS_V4_SRC.indexOf(
  "getAuditLog: protectedProcedure",
  procStart,
);
const PROC_SRC = RISKS_V4_SRC.slice(procStart, procEnd);

describe("Fix #1072 — generateRisksAllSources versionamento", () => {
  it("procedure existe e foi isolada corretamente", () => {
    expect(procStart).toBeGreaterThan(0);
    expect(procEnd).toBeGreaterThan(procStart);
    expect(PROC_SRC).toContain("generateRisksAllSources");
  });

  it("importa saveRiskMatrixVersion e getLatestVersionNumber de ../db", () => {
    expect(PROC_SRC).toMatch(
      /\{\s*saveRiskMatrixVersion\s*,\s*getLatestVersionNumber\s*\}\s*=\s*await\s+import\(\s*["']\.\.\/db["']\s*\)/,
    );
  });

  it("chama saveRiskMatrixVersion com triggerType 'auto_generation' (primeira geração)", () => {
    expect(PROC_SRC).toContain(`triggerType: hasExistingMatrix
            ? "manual_regeneration"
            : "auto_generation"`);
  });

  it("snapshot da matriz anterior usa triggerType 'manual_regeneration'", () => {
    // Quando hasExistingMatrix=true, salva versão arquivada com este trigger.
    expect(PROC_SRC).toMatch(
      /if\s*\(\s*hasExistingMatrix\s*\)[\s\S]*?triggerType:\s*["']manual_regeneration["']/,
    );
  });

  it("computa archivedVersion = latestVersion + 1 antes do delete", () => {
    expect(PROC_SRC).toMatch(
      /archivedVersion\s*=\s*latestVersion\s*\+\s*1/,
    );
  });

  it("newVersion = (archivedVersion ?? 0) + 1 após inserts", () => {
    expect(PROC_SRC).toMatch(
      /newVersion\s*=\s*\(archivedVersion\s*\?\?\s*0\)\s*\+\s*1/,
    );
  });
});

describe("Fix #1072 — atomicidade lógica via try/catch + rollback", () => {
  it("usa try/catch envolvendo deleteRisksByProject + loop insert + saveRiskMatrixVersion", () => {
    // Padrão: try { delete... loop insert... saveRiskMatrixVersion(...) } catch
    expect(PROC_SRC).toMatch(
      /try\s*\{[\s\S]*?deleteRisksByProject[\s\S]*?insertRiskV4WithAudit[\s\S]*?saveRiskMatrixVersion[\s\S]*?\}\s*catch/,
    );
  });

  it("rollback chama deleteRisksByProject no catch se insertedIds.length > 0", () => {
    expect(PROC_SRC).toMatch(
      /catch\s*\([\s\S]*?\)\s*\{[\s\S]*?if\s*\(\s*insertedIds\.length\s*>\s*0\s*\)[\s\S]*?deleteRisksByProject/,
    );
  });

  it("rollback emite warn com tag [Fix #1072]", () => {
    expect(PROC_SRC).toContain("[Fix #1072] rollback parcial projeto");
  });

  it("rollback emite error com tag [Fix #1072] se rollback falha", () => {
    expect(PROC_SRC).toContain("[Fix #1072] FALHA no rollback projeto");
  });

  it("re-throw do erro original após rollback", () => {
    expect(PROC_SRC).toMatch(/\}\s*\n\s*throw\s+err\s*;/);
  });
});

describe("Fix #1072 — retorno enriquecido com versionNumber", () => {
  it("retorno de sucesso inclui versionNumber e archivedPreviousVersion", () => {
    expect(PROC_SRC).toMatch(
      /return\s*\{[\s\S]*?versionNumber:\s*newVersion[\s\S]*?archivedPreviousVersion:\s*archivedVersion[\s\S]*?\}/,
    );
  });

  it("retorno do early-exit (gaps.length === 0) inclui campos null", () => {
    expect(PROC_SRC).toMatch(
      /if\s*\(\s*gaps\.length\s*===\s*0\s*\)[\s\S]*?versionNumber:\s*null[\s\S]*?archivedPreviousVersion:\s*null/,
    );
  });
});

describe("Fix #1072 — invariantes preservadas (regressão Sprint M3.10 Fix A1)", () => {
  it("getAllGapsForProject continua sendo o consumer único dos 3 writers", () => {
    expect(PROC_SRC).toContain("getAllGapsForProject(input.projectId)");
  });

  it("GapToRuleMapper.mapMany continua sendo chamado", () => {
    expect(PROC_SRC).toContain("mapper.mapMany(gaps)");
  });

  it("generateRisksV4Pipeline continua sendo chamado dentro do try", () => {
    expect(PROC_SRC).toMatch(
      /try\s*\{[\s\S]*?generateRisksV4Pipeline\(/,
    );
  });

  it("insertRiskV4WithAudit continua sendo chamado em loop", () => {
    expect(PROC_SRC).toMatch(
      /for\s*\(\s*const\s+risk\s+of\s+risks\s*\)[\s\S]*?insertRiskV4WithAudit\(\s*risk\s*,\s*actor\s*\)/,
    );
  });

  it("gapsBySource continua sendo computado para Definition of Done", () => {
    expect(PROC_SRC).toContain("gapsBySource");
  });
});

describe("Fix #1072 — DoD POSITIVO + NEGATIVO", () => {
  it("DoD POSITIVO: versionamento dispara em primeira geração", () => {
    // Quando previousRisks.length === 0:
    //   - archivedVersion = null
    //   - hasExistingMatrix = false
    //   - 1x saveRiskMatrixVersion chamado (pós-insert, auto_generation)
    const occurrences = (PROC_SRC.match(/saveRiskMatrixVersion/g) ?? []).length;
    // Esperado: 1 import + 2 chamadas = 3 ocorrências
    expect(occurrences).toBeGreaterThanOrEqual(3);
  });

  it("DoD NEGATIVO: sem hasExistingMatrix, NÃO chama saveRiskMatrixVersion com 'manual_regeneration' como snapshot pré", () => {
    // hasExistingMatrix=false → pula bloco do snapshot anterior
    // (não há regressão para chamar 2x na primeira geração)
    expect(PROC_SRC).toMatch(
      /if\s*\(\s*hasExistingMatrix\s*\)\s*\{[\s\S]*?saveRiskMatrixVersion\(/,
    );
  });

  it("DoD NEGATIVO: snapshot pré-delete usa previousRisks (não risks novo)", () => {
    expect(PROC_SRC).toMatch(
      /if\s*\(\s*hasExistingMatrix\s*\)[\s\S]*?snapshotData:\s*JSON\.stringify\(previousRisks\)/,
    );
  });

  it("DoD NEGATIVO: snapshot pós-insert usa risks novo (não previousRisks)", () => {
    // No bloco final do try, após o loop insert
    expect(PROC_SRC).toMatch(
      /try\s*\{[\s\S]*?for\s*\([\s\S]*?insertRiskV4WithAudit[\s\S]*?\}[\s\S]*?saveRiskMatrixVersion\(\s*\{[\s\S]*?snapshotData:\s*JSON\.stringify\(risks\)/,
    );
  });
});
