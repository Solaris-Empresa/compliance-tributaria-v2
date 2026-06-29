#!/usr/bin/env node
/**
 * sync-governance.mjs — Gerador do manifesto de governança do Cockpit P.O. (v10)
 *
 * Varre o corpus de governança REAL que o Claude Code usa e atualiza toda sessão
 * e emite docs/painel-po/governance-manifest.json. Resolve a causa-raiz da drift
 * do painel: a Seção 4 (Relatório de Documentação) era mantida à mão e envelhecia.
 *
 * Fontes varridas:
 *   .claude/rules            — corpus de governança (REGRA-ORQ, Lições, SPEC-FIRST, regras de stack)
 *   .claude/skills           — skills operacionais (cada SKILL.md)
 *   docs/adr                 — ADRs reais (ADR-0009..ADR-0039 + outros)
 *   docs/governance/audits/      — auditorias de fim de sessão (REGRA-ORQ-19)
 *   docs/governance/post-mortems/
 *   docs/governance/relatorios/  — AS-IS/TO-BE, análises (REGRA-ORQ-41)
 *   CLAUDE.md                    — instruções-raiz do projeto
 *
 * Uso:  node docs/painel-po/sync-governance.mjs
 * Saída: docs/painel-po/governance-manifest.json (commitado; o painel embute/le)
 */

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", ".."); // repo root (docs/painel-po → ../..)

function rel(p) {
  return p.replace(ROOT + "\\", "").replace(ROOT + "/", "").replace(/\\/g, "/");
}
function read(p) {
  try { return readFileSync(p, "utf8"); } catch { return ""; }
}
function mtimeISO(p) {
  try { return statSync(p).mtime.toISOString().slice(0, 10); } catch { return null; }
}
function sizeKB(p) {
  try { return Math.round(statSync(p).size / 1024); } catch { return 0; }
}
function listMd(dir) {
  try {
    return readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => join(dir, f));
  } catch { return []; }
}

// ── .claude/rules — corpus de governança ─────────────────────────────────────
const rulesDir = join(ROOT, ".claude", "rules");
const ruleFiles = listMd(rulesDir).map((p) => {
  const body = read(p);
  const name = basename(p);
  const entry = {
    file: rel(p),
    name,
    sizeKB: sizeKB(p),
    updated: mtimeISO(p),
    githubUrl: `https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/${rel(p)}`,
  };
  if (name === "governance-core.md") {
    entry.regraOrqCount = (body.match(/^##\s+REGRA-[A-Z0-9-]+/gm) || []).length;
  }
  if (name === "governance-lessons.md") {
    entry.licoesCount = (body.match(/^##\s+Lição\s+#\d+/gm) || []).length;
  }
  return entry;
});

// ── Catálogo REGRA-ORQ ───────────────────────────────────────────────────────
const coreBody = read(join(rulesDir, "governance-core.md"));
const regraOrq = [];
for (const m of coreBody.matchAll(/^##\s+(REGRA-[A-Z0-9-]+)\s*(?:[—-]\s*(.+))?$/gm)) {
  regraOrq.push({ id: m[1].trim(), title: (m[2] || "").trim() });
}

// ── Catálogo Lições ──────────────────────────────────────────────────────────
const lessonsBody = read(join(rulesDir, "governance-lessons.md"));
const licoes = [];
for (const m of lessonsBody.matchAll(/^##\s+Lição\s+#(\d+)\s*[—-]\s*(.+)$/gm)) {
  licoes.push({ n: Number(m[1]), title: m[2].trim() });
}

// ── Skills ───────────────────────────────────────────────────────────────────
const skillsDir = join(ROOT, ".claude", "skills");
let skills = [];
try {
  skills = readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const skillFile = join(skillsDir, d.name, "SKILL.md");
      const body = read(skillFile);
      const descM = body.match(/^description:\s*["']?(.+?)["']?\s*$/m);
      const nameM = body.match(/^name:\s*["']?(.+?)["']?\s*$/m);
      return {
        name: nameM ? nameM[1].trim() : d.name,
        slug: d.name,
        description: descM ? descM[1].trim() : "",
        file: rel(skillFile),
        updated: mtimeISO(skillFile),
        githubUrl: `https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/${rel(skillFile)}`,
      };
    });
} catch { /* skills dir ausente */ }

// ── ADRs reais ───────────────────────────────────────────────────────────────
const adrDir = join(ROOT, "docs", "adr");
const adrs = listMd(adrDir)
  .filter((p) => basename(p) !== "ADR-INDEX.md")
  .map((p) => {
    const body = read(p);
    const h1 = body.match(/^#\s+(.+)$/m);
    return {
      file: basename(p),
      title: h1 ? h1[1].trim() : basename(p, ".md"),
      updated: mtimeISO(p),
      githubUrl: `https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/${rel(p)}`,
    };
  })
  .sort((a, b) => a.file.localeCompare(b.file));

// ── Audits / Post-mortems / Relatórios (contagem + recentes) ─────────────────
function summarizeDir(dirRel, limit = 8) {
  const dir = join(ROOT, dirRel);
  const files = listMd(dir)
    .map((p) => ({ file: basename(p), updated: mtimeISO(p), path: rel(p) }))
    .sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
  return { count: files.length, recent: files.slice(0, limit) };
}
const audits = summarizeDir("docs/governance/audits");
const postMortems = summarizeDir("docs/governance/post-mortems");
const relatorios = summarizeDir("docs/governance/relatorios");

// ── Stack rules (backend/frontend/database/testing) — já em ruleFiles, marcados
const stackRules = ["backend.md", "frontend.md", "database.md", "testing.md"];

// ── HEAD git ─────────────────────────────────────────────────────────────────
let head = null;
try { head = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { /* */ }

// ── CLAUDE.md ────────────────────────────────────────────────────────────────
const claudeMd = existsSync(join(ROOT, "CLAUDE.md"))
  ? { file: "CLAUDE.md", updated: mtimeISO(join(ROOT, "CLAUDE.md")), sizeKB: sizeKB(join(ROOT, "CLAUDE.md")),
      githubUrl: "https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/CLAUDE.md" }
  : null;

const manifest = {
  generatedAt: new Date().toISOString(),
  head,
  panelVersion: "v10",
  summary: {
    regraOrq: regraOrq.length,
    licoes: licoes.length,
    licaoMax: licoes.reduce((m, l) => Math.max(m, l.n), 0),
    skills: skills.length,
    adrs: adrs.length,
    ruleFiles: ruleFiles.length,
    audits: audits.count,
    postMortems: postMortems.count,
    relatorios: relatorios.count,
  },
  claudeMd,
  ruleFiles,
  stackRules,
  regraOrq,
  licoes,
  skills,
  adrs,
  audits,
  postMortems,
  relatorios,
};

const outPath = join(__dirname, "governance-manifest.json");
writeFileSync(outPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log("✅ governance-manifest.json gerado:");
console.log(`   HEAD ${head} · panel ${manifest.panelVersion}`);
console.log(`   REGRA-ORQ: ${manifest.summary.regraOrq} · Lições: ${manifest.summary.licoes} (máx #${manifest.summary.licaoMax})`);
console.log(`   Skills: ${manifest.summary.skills} · ADRs: ${manifest.summary.adrs} · rule files: ${manifest.summary.ruleFiles}`);
console.log(`   Audits: ${manifest.summary.audits} · Post-mortems: ${manifest.summary.postMortems} · Relatórios: ${manifest.summary.relatorios}`);
console.log(`   → ${rel(outPath)}`);
