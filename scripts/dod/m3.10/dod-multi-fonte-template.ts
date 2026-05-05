/**
 * dod-multi-fonte-template.ts — Template canônico para validação DoD multi-fonte.
 *
 * Reproduz as queries Q1 (multi-fonte agregado) e Q2 (multi-fonte por risco)
 * do audit M3.10 (`docs/governance/audits/v7.64-2026-05-05-audit-m3.10-multi-fonte.md`).
 *
 * Este script é o substituto da família `dod-3780001.ts` / `dod-queries-3750060.ts`
 * produzida em sandbox Manus durante M3.10. As queries originais não foram
 * commitadas (issue #987) — este template aplica os patterns corretos
 * documentados nas Lições #71 (autor valida parser) e #72 (mysql2 auto-parse).
 *
 * Uso:
 *   DATABASE_URL=mysql://... npx tsx scripts/dod/m3.10/dod-multi-fonte-template.ts <projectId>
 *
 * Exemplo:
 *   DATABASE_URL=$PROD_DB_URL npx tsx scripts/dod/m3.10/dod-multi-fonte-template.ts 3780001
 *
 * Vinculadas:
 * - Audit v7.64 (caso canônico das queries)
 * - Lição #71 (.claude/rules/governance.md) — autor valida o parser ANTES de reportar
 * - Lição #72 (.claude/rules/governance.md) — antipattern JSON.parse em coluna mysql2
 * - Issue #987 — recuperação dos scripts DoD originais
 */
import mysql from "mysql2/promise";
import { safeParseJsonColumn } from "./safe-parse-json-column";

interface RiskRow {
  id: string;
  ruleCode: string | null;
  source_priority: string;
  evidence: unknown; // mysql2 retorna objeto JSON parseado — usar safeParseJsonColumn
}

interface ConsolidatedEvidence {
  gaps?: { fonte?: string }[];
}

interface DoDResult {
  projectId: number;
  q1Aggregate: { distinctSources: number; distribution: Record<string, number> };
  q2PerRisk: {
    multiFontes: Array<{ ruleCode: string; fontes: string[]; gapCount: number }>;
    monoFontes: Array<{ ruleCode: string; fonte: string; gapCount: number }>;
  };
  verdict: { aggregatePass: boolean; perRiskAtLeastOne: boolean };
}

async function runDoD(projectId: number): Promise<DoDResult> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL ausente — exportar antes de rodar");
  }

  const pool = mysql.createPool(process.env.DATABASE_URL);

  try {
    // Q1: Multi-fonte AGREGADO — distintos source_priority na matriz
    const [q1Rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT source_priority, COUNT(*) AS total
       FROM risks_v4
       WHERE projectId = ? AND status IN ('active','pending')
       GROUP BY source_priority`,
      [projectId],
    );

    const distribution: Record<string, number> = {};
    for (const row of q1Rows) {
      distribution[row.source_priority] = Number(row.total);
    }
    const distinctSources = Object.keys(distribution).length;

    // Q2: Multi-fonte POR RISCO — extração de evidence.gaps[*].fonte
    const [q2Rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT id, ruleCode, source_priority, evidence
       FROM risks_v4
       WHERE projectId = ? AND status IN ('active','pending')`,
      [projectId],
    );

    const multiFontes: DoDResult["q2PerRisk"]["multiFontes"] = [];
    const monoFontes: DoDResult["q2PerRisk"]["monoFontes"] = [];

    for (const row of q2Rows as RiskRow[]) {
      // ✅ Pattern correto (Lição #72) — mysql2 auto-parseia, usar helper
      const ev = safeParseJsonColumn<ConsolidatedEvidence>(row.evidence, {
        gaps: [],
      });
      const gaps = ev.gaps ?? [];
      const fontes = [
        ...new Set(
          gaps
            .map((g) => g.fonte)
            .filter((f): f is string => typeof f === "string" && f.length > 0),
        ),
      ].sort();

      const ruleCode = row.ruleCode ?? row.id;
      if (fontes.length >= 2) {
        multiFontes.push({ ruleCode, fontes, gapCount: gaps.length });
      } else {
        monoFontes.push({
          ruleCode,
          fonte: fontes[0] ?? row.source_priority,
          gapCount: gaps.length,
        });
      }
    }

    const result: DoDResult = {
      projectId,
      q1Aggregate: { distinctSources, distribution },
      q2PerRisk: { multiFontes, monoFontes },
      verdict: {
        aggregatePass: distinctSources >= 2,
        perRiskAtLeastOne: multiFontes.length >= 1,
      },
    };

    return result;
  } finally {
    await pool.end();
  }
}

function formatReport(result: DoDResult): string {
  const lines: string[] = [];
  lines.push(`=== DoD M3.10 multi-fonte — projeto #${result.projectId} ===`);
  lines.push("");
  lines.push("Q1. Multi-fonte AGREGADO (source_priority distintos):");
  lines.push(`    Distintos: ${result.q1Aggregate.distinctSources}`);
  for (const [source, count] of Object.entries(result.q1Aggregate.distribution)) {
    lines.push(`    ${source}: ${count} riscos`);
  }
  lines.push(
    `    DoD (>=2): ${result.verdict.aggregatePass ? "✅ PASS" : "❌ FAIL"}`,
  );
  lines.push("");
  lines.push("Q2. Multi-fonte POR RISCO (evidence.gaps[*].fonte):");
  for (const r of result.q2PerRisk.multiFontes) {
    lines.push(
      `    🔴 MULTI | ${r.ruleCode.padEnd(24)} | fontes=[${r.fontes.join(", ")}] (${r.gapCount} gaps)`,
    );
  }
  for (const r of result.q2PerRisk.monoFontes) {
    lines.push(
      `    🟢 MONO  | ${r.ruleCode.padEnd(24)} | fontes=[${r.fonte}] (${r.gapCount} gaps)`,
    );
  }
  lines.push("");
  lines.push(
    `    SUMMARY: ${result.q2PerRisk.multiFontes.length} multi-fonte / ${result.q2PerRisk.monoFontes.length} mono-fonte`,
  );
  lines.push(
    `    DoD (>=1 multi): ${result.verdict.perRiskAtLeastOne ? "✅ PASS" : "❌ FAIL"}`,
  );
  return lines.join("\n");
}

// Entry point
if (require.main === module) {
  const projectIdArg = process.argv[2];
  if (!projectIdArg || isNaN(Number(projectIdArg))) {
    console.error("Uso: npx tsx scripts/dod/m3.10/dod-multi-fonte-template.ts <projectId>");
    process.exit(1);
  }
  runDoD(Number(projectIdArg))
    .then((result) => {
      console.log(formatReport(result));
      process.exit(
        result.verdict.aggregatePass && result.verdict.perRiskAtLeastOne ? 0 : 1,
      );
    })
    .catch((err) => {
      console.error("DoD falhou:", err);
      process.exit(2);
    });
}

export { runDoD, formatReport, DoDResult };
