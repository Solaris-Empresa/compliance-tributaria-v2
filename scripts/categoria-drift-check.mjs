#!/usr/bin/env node
/**
 * categoria-drift-check.mjs — Drift check (Sprint Z-20 #717)
 *
 * Compara 3 fontes de categorias de risco:
 *  - N1: DB risk_categories (runtime autoritativo)
 *  - N2: SEVERITY_TABLE em server/lib/risk-engine-v4.ts
 *  - N3: RN_GERACAO_RISCOS_V4.md (spec)
 *
 * Imprime divergências. Exit 0 sempre (evidência, não pass/fail).
 *
 * Uso:
 *   DATABASE_URL=... node scripts/categoria-drift-check.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "reports/battery-1");
const OUT = resolve(OUT_DIR, "drift-check.md");
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

function bootstrap() {
  writeFileSync(
    OUT,
    `# Drift check — categorias de risco\n\nExecutado em ${new Date().toISOString()}\n\n`,
    "utf-8"
  );
}
function write(s) {
  import("node:fs").then(({ appendFileSync }) => appendFileSync(OUT, s + "\n", "utf-8"));
}

bootstrap();

// ─── N2: SEVERITY_TABLE (código) ───────────────────────────────────────
const engineSrc = readFileSync(
  resolve(ROOT, "server/lib/risk-engine-v4.ts"),
  "utf-8"
);
const tableMatch = engineSrc.match(/SEVERITY_TABLE[\s\S]*?= \{([\s\S]*?)\};/);
const codeCategorias = new Set(
  [...(tableMatch?.[1].matchAll(/^\s*(\w+):/gm) ?? [])].map((m) => m[1])
);

// ─── N3: RN doc ─────────────────────────────────────────────────────────
let rnCategorias = new Set();
try {
  const rnSrc = readFileSync(
    resolve(ROOT, "docs/governance/RN_GERACAO_RISCOS_V4.md"),
    "utf-8"
  );
  const severityMatch = rnSrc.match(/const SEVERITY[\s\S]*?= \{([\s\S]*?)\}/);
  rnCategorias = new Set(
    [...(severityMatch?.[1].matchAll(/^\s*(\w+):/gm) ?? [])].map((m) => m[1])
  );
} catch (e) {
  console.error(`Erro lendo RN: ${e.message}`);
}

// ─── N1: DB (se disponível) ─────────────────────────────────────────────
let dbCategorias = new Set();
if (process.env.DATABASE_URL) {
  const mysql = await import("mysql2/promise");
  const pool = mysql.default.createPool(process.env.DATABASE_URL);
  try {
    const [rows] = await pool.execute(
      "SELECT codigo FROM risk_categories WHERE status='ativo' ORDER BY codigo"
    );
    dbCategorias = new Set(rows.map((r) => r.codigo));
  } catch (e) {
    console.error(`Erro query DB: ${e.message}`);
  } finally {
    await pool.end();
  }
}

// ─── Diff ───────────────────────────────────────────────────────────────
setTimeout(() => {
  // Aguarda writes assíncronos concluírem
}, 100);

import { appendFileSync } from "node:fs";

function line(s) {
  appendFileSync(OUT, s + "\n", "utf-8");
}

line(`## Fontes`);
line(``);
line(`- **N1 DB** (risk_categories): ${dbCategorias.size} categorias ${dbCategorias.size ? "" : "(sem DATABASE_URL — skipped)"}`);
line(`- **N2 Código** (SEVERITY_TABLE): ${codeCategorias.size} categorias`);
line(`- **N3 RN doc**: ${rnCategorias.size} categorias`);
line(``);

line(`## Categorias por fonte`);
line(``);
line(`| Categoria | DB | Código | RN | Status |`);
line(`|---|---|---|---|---|`);

const all = new Set([...dbCategorias, ...codeCategorias, ...rnCategorias]);
let align = 0;
let drift = 0;

for (const cat of [...all].sort()) {
  const d = dbCategorias.has(cat) ? "✅" : "❌";
  const c = codeCategorias.has(cat) ? "✅" : "❌";
  const r = rnCategorias.has(cat) ? "✅" : "❌";
  const aligned =
    (dbCategorias.size === 0 || dbCategorias.has(cat)) &&
    codeCategorias.has(cat) &&
    rnCategorias.has(cat);
  const status = aligned ? "OK" : "⚠️ DRIFT";
  if (aligned) align++;
  else drift++;
  line(`| ${cat} | ${d} | ${c} | ${r} | ${status} |`);
}

line(``);
line(`## Resumo`);
line(``);
line(`- **Alinhadas:** ${align}`);
line(`- **Com drift:** ${drift}`);
line(``);

if (drift > 0) {
  line(`⚠️ **${drift} categoria(s) divergem entre as 3 fontes.**`);
  line(``);
  line(`Ver snapshot §5 para decisões P.O.:`);
  line(`- D2: tributacao_servicos (órfã RN — DEC-02)`);
  line(`- D3: inscricao_cadastral severidade (RN desatualizada)`);
  line(`- D4: RN doc com categorias não implementadas`);
} else {
  line(`✅ Nenhum drift entre DB × Código × RN.`);
}

console.log(`Drift check concluído: ${align} alinhadas, ${drift} com drift`);
console.log(`Relatório: ${OUT}`);
process.exit(0);
