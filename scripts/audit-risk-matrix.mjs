#!/usr/bin/env node
/**
 * audit-risk-matrix.mjs — Aferição evidence-based (Sprint Z-20 #717)
 *
 * Script de aferição "PLANEJADO × REALIZADO" contra o projeto de
 * referência (930001) ou destrutivo (1200001).
 *
 * Avalia os 10 critérios do §13.5 do snapshot.
 * Saída: reports/battery-N/afericao-{projectId}.md
 *
 * Uso:
 *   DATABASE_URL=... E2E_REFERENCE_PROJECT_ID=930001 \
 *     node scripts/audit-risk-matrix.mjs [--battery=1]
 *
 * Exit 0 sempre — o relatório é a saída, não o exit code.
 * Análise do relatório é responsabilidade do P.O. (evidence-based).
 */
import { appendFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ─── Parâmetros ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const batteryArg = args.find((a) => a.startsWith("--battery="));
const battery = batteryArg?.split("=")[1] ?? "1";
const projectId = Number(
  process.env.E2E_REFERENCE_PROJECT_ID ?? "930001"
);
const outDir = resolve(ROOT, `reports/battery-${battery}`);
const outPath = resolve(outDir, `afericao-${projectId}.md`);

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

// ─── Bootstrap relatório ────────────────────────────────────────────────
function write(s) {
  appendFileSync(outPath, s + "\n", "utf-8");
}

writeFileSync(
  outPath,
  `# Aferição — Projeto ${projectId} (Bateria ${battery})\n\n` +
    `Executado em: ${new Date().toISOString()}\n` +
    `Script: audit-risk-matrix.mjs\n\n`,
  "utf-8"
);

// ─── Early exit se sem DB ───────────────────────────────────────────────
if (!process.env.DATABASE_URL) {
  write("## ⚠️ DATABASE_URL ausente");
  write("");
  write("Script precisa de DATABASE_URL para executar aferição real.");
  write("Saindo com exit 0 — relatório documenta estado `skipped`.");
  write("");
  write("## Status: SKIPPED");
  console.log(`Aferição SKIPPED (sem DATABASE_URL). Relatório: ${outPath}`);
  process.exit(0);
}

// ─── Conexão DB ─────────────────────────────────────────────────────────
import mysql from "mysql2/promise";

const pool = mysql.createPool(process.env.DATABASE_URL);

async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (e) {
    write(`\n⚠️ Query error: ${e.message}\nSQL: ${sql}\n`);
    return [];
  }
}

// ─── 10 critérios do §13.5 ──────────────────────────────────────────────

write(`## Critérios §13.5 — meta 98% de confiabilidade\n`);
write(`| # | Critério | Planejado | Realizado | Status |`);
write(`|---|---|---|---|---|`);

async function criterio(n, nome, planejado, realizadoFn) {
  try {
    const realizado = await realizadoFn();
    const status = realizado.pass ? "✅ PASS" : "❌ FAIL";
    write(
      `| ${n} | ${nome} | ${planejado} | ${realizado.value} | ${status} |`
    );
    return realizado.pass;
  } catch (e) {
    write(`| ${n} | ${nome} | ${planejado} | ERROR: ${e.message} | ❌ FAIL |`);
    return false;
  }
}

let passed = 0;
let total = 0;

async function run() {
  total++;
  if (
    await criterio(
      1,
      "Todo risco tem origem (rule_id NOT NULL)",
      "100%",
      async () => {
        const rows = await query(
          "SELECT COUNT(*) total, COUNT(rule_id) com_rule FROM risks_v4 WHERE project_id = ? AND status='active'",
          [projectId]
        );
        const { total: t, com_rule: c } = rows[0] ?? {};
        return { value: `${c}/${t}`, pass: t === c && t > 0 };
      }
    )
  )
    passed++;

  total++;
  if (
    await criterio(
      2,
      "Categorias cobertas pelas 3 Ondas",
      "≥5",
      async () => {
        const rows = await query(
          "SELECT COUNT(DISTINCT categoria) n FROM risks_v4 WHERE project_id = ? AND status='active'",
          [projectId]
        );
        const n = rows[0]?.n ?? 0;
        return { value: `${n} categorias`, pass: n >= 5 };
      }
    )
  )
    passed++;

  total++;
  if (
    await criterio(
      3,
      "Severidade determinística (valores do enum)",
      "apenas alta/media/oportunidade",
      async () => {
        const rows = await query(
          "SELECT DISTINCT severidade FROM risks_v4 WHERE project_id = ? AND status='active'",
          [projectId]
        );
        const valid = new Set(["alta", "media", "oportunidade"]);
        const invalid = rows.filter((r) => !valid.has(r.severidade));
        return {
          value: rows.map((r) => r.severidade).join(", "),
          pass: invalid.length === 0,
        };
      }
    )
  )
    passed++;

  total++;
  if (
    await criterio(
      4,
      "Artigo rastreável ao RAG",
      "≥50% rag_validated=1 (PROVA 4)",
      async () => {
        const rows = await query(
          "SELECT SUM(rag_validated) validados, COUNT(*) total FROM risks_v4 WHERE project_id = ? AND status='active'",
          [projectId]
        );
        const { validados: v, total: t } = rows[0] ?? {};
        const pct = t > 0 ? (v / t) * 100 : 0;
        return {
          value: `${v}/${t} (${pct.toFixed(1)}%)`,
          pass: pct >= 50,
        };
      }
    )
  )
    passed++;

  total++;
  if (
    await criterio(
      5,
      "Breadcrumb 4 nós",
      "100%",
      async () => {
        const rows = await query(
          "SELECT breadcrumb FROM risks_v4 WHERE project_id = ? AND status='active'",
          [projectId]
        );
        let ok = 0;
        for (const r of rows) {
          try {
            const bc =
              typeof r.breadcrumb === "string"
                ? JSON.parse(r.breadcrumb)
                : r.breadcrumb;
            if (Array.isArray(bc) && bc.length === 4) ok++;
          } catch {
            /* skip */
          }
        }
        return {
          value: `${ok}/${rows.length}`,
          pass: ok === rows.length && rows.length > 0,
        };
      }
    )
  )
    passed++;

  total++;
  if (
    await criterio(
      6,
      "Oportunidade sem plano (RN-RISK-05)",
      "0 planos em riscos type=opportunity",
      async () => {
        const rows = await query(
          `SELECT COUNT(*) n FROM action_plans ap
         JOIN risks_v4 r ON ap.risk_id = r.id
         WHERE r.project_id = ? AND r.type='opportunity' AND r.status='active' AND ap.status != 'deleted'`,
          [projectId]
        );
        const n = rows[0]?.n ?? 0;
        return { value: `${n} planos`, pass: n === 0 };
      }
    )
  )
    passed++;

  total++;
  if (
    await criterio(
      7,
      "Unicidade por categoria (DEC-05)",
      "≤ 1 risco por categoria ativo",
      async () => {
        const rows = await query(
          `SELECT categoria, COUNT(*) n FROM risks_v4
         WHERE project_id = ? AND status='active'
         GROUP BY categoria HAVING COUNT(*) > 1`,
          [projectId]
        );
        return {
          value:
            rows.length === 0
              ? "OK"
              : rows.map((r) => `${r.categoria}:${r.n}`).join(", "),
          pass: rows.length === 0,
        };
      }
    )
  )
    passed++;

  total++;
  if (
    await criterio(
      8,
      "Score visível (DEC-01)",
      "projects.scoringData NOT NULL",
      async () => {
        const rows = await query(
          "SELECT scoringData FROM projects WHERE id = ?",
          [projectId]
        );
        const sd = rows[0]?.scoringData;
        return {
          value: sd ? "presente" : "NULL",
          pass: sd != null,
        };
      }
    )
  )
    passed++;

  total++;
  if (
    await criterio(
      9,
      "Fonte primária = menor SOURCE_RANK",
      "source_priority consistente com breadcrumb[0]",
      async () => {
        const rows = await query(
          "SELECT source_priority, breadcrumb FROM risks_v4 WHERE project_id = ? AND status='active'",
          [projectId]
        );
        let ok = 0;
        for (const r of rows) {
          try {
            const bc =
              typeof r.breadcrumb === "string"
                ? JSON.parse(r.breadcrumb)
                : r.breadcrumb;
            if (Array.isArray(bc) && bc[0] === r.source_priority) ok++;
          } catch {
            /* skip */
          }
        }
        return {
          value: `${ok}/${rows.length}`,
          pass: ok === rows.length && rows.length > 0,
        };
      }
    )
  )
    passed++;

  total++;
  if (
    await criterio(
      10,
      "Nenhuma categoria órfã (tributacao_servicos)",
      "0 riscos com categoria fora das 10 oficiais",
      async () => {
        const rows = await query(
          `SELECT DISTINCT categoria FROM risks_v4
         WHERE project_id = ? AND status='active'
         AND categoria NOT IN (
           'imposto_seletivo','confissao_automatica','split_payment',
           'inscricao_cadastral','regime_diferenciado','transicao_iss_ibs',
           'obrigacao_acessoria','aliquota_zero','aliquota_reduzida',
           'credito_presumido'
         )`,
          [projectId]
        );
        return {
          value:
            rows.length === 0
              ? "nenhuma órfã"
              : rows.map((r) => r.categoria).join(", "),
          pass: rows.length === 0,
        };
      }
    )
  )
    passed++;

  write(``);
  write(`## Resumo`);
  write(``);
  write(`- **Critérios PASS:** ${passed}/${total}`);
  write(`- **Meta 98% (B4):** ${passed === total ? "✅" : "❌"}`);
  write(`- **Meta B1 (≥5/10):** ${passed >= 5 ? "✅" : "❌"}`);
  write(``);
  write(`Gerado em ${new Date().toISOString()}`);

  await pool.end();
  console.log(`Aferição concluída: ${passed}/${total} PASS`);
  console.log(`Relatório: ${outPath}`);
}

run().catch((e) => {
  write(`\n## FATAL: ${e.message}\n${e.stack}\n`);
  console.error(e);
  process.exit(0); // Sempre 0 — relatório é a saída
});
