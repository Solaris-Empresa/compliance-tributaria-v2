/**
 * scripts/retrigger-pipeline.ts — Sprint M3.8.1 Hotfix
 *
 * Re-trigger do pipeline de gaps + riscos para projetos existentes,
 * usando o código corrigido pelos 3 fixes da Sprint M3.8.1.
 *
 * Escopo (P.O. autorizou — 2026-05-05):
 *   FAZ:
 *     1. DELETE gaps/riscos/action_plans antigos APENAS dos projetos especificados
 *     2. await analyzeSolarisAnswers(projectId) — sequencial
 *     3. await analyzeIagenAnswers(projectId) — sequencial
 *     4. Print resumo: gaps por source para validação
 *
 *   NÃO FAZ (BLOQUEADO):
 *     - NÃO toca regulatory_requirements_v3
 *     - NÃO toca rag_chunks / rag_corpus_*
 *     - NÃO toca solaris_questions
 *     - NÃO toca respostas (questionnaireAnswersV3, *_answers)
 *     - NÃO toca outros projetos (apenas IDs explícitos)
 *     - NÃO altera schema
 *
 * Pós-execução:
 *   - P.O./Manus visita /risk-dashboard-v4/<projectId> para cada projeto
 *   - Auto-trigger detecta activeRisks=[] e dispara:
 *     analyzeGaps (com fix Bug A — preserva solaris/iagen)
 *     → mapGapsToRules → generateRisksFromGaps (com fix Bug B/C)
 *
 * Uso:
 *   DATABASE_URL="..." pnpm exec tsx scripts/retrigger-pipeline.ts 3480001 3270001
 *
 * Vinculadas:
 *   - PR Hotfix M3.8.1 (Bugs A/B/C)
 *   - REGRA-ORQ-11 (fast-track P0)
 *   - REGRA-ORQ-28 (triade leve)
 */

import mysql from "mysql2/promise";
import { analyzeSolarisAnswers } from "../server/lib/solaris-gap-analyzer";
import { analyzeIagenAnswers } from "../server/lib/iagen-gap-analyzer";

const DEFAULT_PROJECT_IDS = [3480001, 3270001];

interface ProjectSummary {
  projectId: number;
  resetCounts: {
    gapsDeleted: number;
    risksDeleted: number;
    plansDeleted: number;
  };
  solaris: { inserted: number } | { error: string };
  iagen: { inserted: number } | { error: string };
  finalGapsBySource: Record<string, number>;
}

async function resetProjectArtifacts(
  conn: mysql.Connection,
  projectId: number,
): Promise<{ gapsDeleted: number; risksDeleted: number; plansDeleted: number }> {
  // Apaga gaps antigos de TODOS os sources (será regenerado por solaris/iagen/gapEngine).
  const [gapsResult] = await conn.execute<mysql.ResultSetHeader>(
    "DELETE FROM project_gaps_v3 WHERE project_id = ?",
    [projectId],
  );

  // Apaga riscos antigos.
  const [risksResult] = await conn.execute<mysql.ResultSetHeader>(
    "DELETE FROM project_risks_v4 WHERE project_id = ?",
    [projectId],
  );

  // Apaga action plans antigos (best-effort — tabela pode não existir em ambientes legados).
  let plansDeleted = 0;
  try {
    const [plansResult] = await conn.execute<mysql.ResultSetHeader>(
      "DELETE FROM project_action_plans_v4 WHERE project_id = ?",
      [projectId],
    );
    plansDeleted = plansResult.affectedRows;
  } catch (err) {
    console.log(
      JSON.stringify({
        event: "plans_delete_skipped",
        projectId,
        reason: String(err).split("\n")[0],
      }),
    );
  }

  return {
    gapsDeleted: gapsResult.affectedRows,
    risksDeleted: risksResult.affectedRows,
    plansDeleted,
  };
}

async function summarizeGapsBySource(
  conn: mysql.Connection,
  projectId: number,
): Promise<Record<string, number>> {
  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    "SELECT source, COUNT(*) AS c FROM project_gaps_v3 WHERE project_id = ? GROUP BY source",
    [projectId],
  );
  const summary: Record<string, number> = {};
  for (const row of rows) {
    summary[String(row.source ?? "null")] = Number(row.c);
  }
  return summary;
}

async function processProject(
  conn: mysql.Connection,
  projectId: number,
): Promise<ProjectSummary> {
  console.log(
    JSON.stringify({ event: "retrigger_start", projectId, ts: new Date().toISOString() }),
  );

  // 1. Reset (delete-only do escopo do projeto)
  const resetCounts = await resetProjectArtifacts(conn, projectId);
  console.log(JSON.stringify({ event: "reset_complete", projectId, ...resetCounts }));

  // 2. analyzeSolarisAnswers (puro — DELETE source='solaris' + INSERT)
  let solaris: ProjectSummary["solaris"];
  try {
    solaris = await analyzeSolarisAnswers(projectId);
    console.log(JSON.stringify({ event: "solaris_complete", projectId, ...solaris }));
  } catch (err) {
    solaris = { error: String(err).split("\n")[0] };
    console.log(JSON.stringify({ event: "solaris_error", projectId, ...solaris }));
  }

  // 3. analyzeIagenAnswers (puro — DELETE source='iagen' + INSERT)
  let iagen: ProjectSummary["iagen"];
  try {
    iagen = await analyzeIagenAnswers(projectId);
    console.log(JSON.stringify({ event: "iagen_complete", projectId, ...iagen }));
  } catch (err) {
    iagen = { error: String(err).split("\n")[0] };
    console.log(JSON.stringify({ event: "iagen_error", projectId, ...iagen }));
  }

  // 4. Resumo gaps por source (para validação manual)
  const finalGapsBySource = await summarizeGapsBySource(conn, projectId);

  console.log(
    JSON.stringify({ event: "retrigger_done", projectId, finalGapsBySource }),
  );

  return { projectId, resetCounts, solaris, iagen, finalGapsBySource };
}

async function main() {
  const argv = process.argv.slice(2);
  const projectIds = argv.length > 0 ? argv.map((s) => Number(s)) : DEFAULT_PROJECT_IDS;

  if (projectIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    console.error("Uso: pnpm exec tsx scripts/retrigger-pipeline.ts <projectId> [<projectId>...]");
    console.error("Cada projectId deve ser inteiro positivo.");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não definido. Abortando.");
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      event: "retrigger_pipeline_start",
      ts: new Date().toISOString(),
      projectIds,
      sprint: "M3.8.1",
      bugs_aplicados: ["A scoped DELETE", "B default regulatorio", "C SOURCE_RANK regulatorio"],
    }),
  );

  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const summaries: ProjectSummary[] = [];

  try {
    for (const projectId of projectIds) {
      const summary = await processProject(conn, projectId);
      summaries.push(summary);
    }
  } finally {
    await conn.end();
  }

  // Sumário final
  console.log(
    JSON.stringify({
      event: "retrigger_pipeline_complete",
      ts: new Date().toISOString(),
      summaries,
      next_step:
        "Visite /risk-dashboard-v4/<projectId> em produção para cada projeto. " +
        "Auto-trigger detecta activeRisks=[] e dispara analyzeGaps → mapGapsToRules → " +
        "generateRisksFromGaps. Riscos regenerados com fixes M3.8.1.",
    }),
  );
}

main().catch((err) => {
  console.error("retrigger-pipeline falhou:", err);
  process.exit(1);
});
