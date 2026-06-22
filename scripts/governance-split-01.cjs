#!/usr/bin/env node
/**
 * GOVERNANCE-SPLIT-01 — split .claude/rules/governance.md (>150k) into 4 files.
 *
 * Why: a single rule file over the 150k-char limit is truncated by Claude Code,
 * so recent rules (Lições #130+, REGRA-ORQ-45/46/47) were not being loaded.
 *
 * Strategy (zero-loss for existing content):
 *   - governance-core.md     ← preamble + ALL REGRA-ORQ-* + gates/flow sections
 *   - governance-lessons.md  ← ALL "## Lição #" sections (verbatim, in order)
 *   - governance-spec-first.md ← CHECKLIST-VAL-01 + CHECKLIST-REVIEW-01 (existing)
 *                                + a generated SOLARIS-SPEC-FIRST v1.2 overview
 *   - governance-adr-ref.md  ← generated ADR index (from docs/adr/)
 *
 * Parsing is FENCE-AWARE: "## " lines inside ``` code fences are NOT treated as
 * section boundaries (e.g. "## Issues pré-existentes verificadas" templates that
 * live inside Lição #83/#84).
 *
 * Verification: reconstructs the original section stream (preamble + every section
 * body in original order, regardless of target file) and diffs byte-for-byte
 * against the original. Aborts on any mismatch.
 */
const fs = require("fs");
const path = require("path");

const SRC = path.join(".claude", "rules", "governance.md");
const OUT_DIR = path.join(".claude", "rules");
const ADR_DIR = path.join("docs", "adr");

const FM = (desc) =>
  `---\ndescription: ${desc}\nglobs:\n  - "docs/governance/**"\n---\n`;

const raw = fs.readFileSync(SRC, "utf8");
const eol = raw.includes("\r\n") ? "\r\n" : "\n";
const lines = raw.split(/\r?\n/);

// ---- fence-aware split into top-level sections ----
let inFence = false;
let sections = [];
let cur = { h: "__preamble__", lines: [] };
for (const l of lines) {
  if (/^\s*```/.test(l)) inFence = !inFence;
  if (!inFence && /^## /.test(l)) {
    sections.push(cur);
    cur = { h: l.replace(/^## /, "").trim(), lines: [l] };
  } else {
    cur.lines.push(l);
  }
}
sections.push(cur);

// ---- route each section to a bucket ----
const buckets = { core: [], lessons: [], specfirst: [] };
for (const s of sections) {
  if (s.h === "__preamble__") continue; // handled separately
  if (/^Lição #/.test(s.h)) buckets.lessons.push(s);
  else if (/^CHECKLIST-(VAL|REVIEW)-01\b/.test(s.h)) buckets.specfirst.push(s);
  else buckets.core.push(s); // REGRA-ORQ-*, gates, flow, INGEST, etc.
}

const preamble = sections.find((s) => s.h === "__preamble__");
const bodyOf = (s) => s.lines.join(eol);

// ---- ZERO-LOSS verification ----
// reconstruct: preamble + every section (original order) joined exactly as source
const reconstructed = [preamble, ...sections.filter((s) => s.h !== "__preamble__")]
  .map(bodyOf)
  .join(eol);
if (reconstructed !== raw) {
  console.error("FATAL: reconstruction != source. Aborting (would lose content).");
  // find first diff
  for (let i = 0; i < Math.max(reconstructed.length, raw.length); i++) {
    if (reconstructed[i] !== raw[i]) {
      console.error("first diff at char", i, JSON.stringify(raw.slice(i, i + 40)), "vs", JSON.stringify(reconstructed.slice(i, i + 40)));
      break;
    }
  }
  process.exit(1);
}
console.log("zero-loss reconstruction: OK (byte-identical to source)");

// ---- build ADR index (generated, additive) ----
const adrFiles = fs
  .readdirSync(ADR_DIR)
  .filter((f) => f.endsWith(".md"))
  .sort();
const adrRows = adrFiles.map((f) => {
  let title = "";
  try {
    const c = fs.readFileSync(path.join(ADR_DIR, f), "utf8");
    const m = c.split(/\r?\n/).find((l) => /^#\s+/.test(l));
    if (m) title = m.replace(/^#\s+/, "").trim();
  } catch (_) {}
  return `| \`${f}\` | ${title.replace(/\|/g, "\\|") || "—"} |`;
});

// ---- write governance-core.md ----
const coreHeader = `${FM(
  "Governance CORE — REGRA-ORQ-00..47, gates (0/UX/F7), F1-F7 flow, R-SYNC, classes A/B/C, RACI, prompt conventions"
)}\n# Governance Rules — Core (REGRA-ORQ + Gates + Flow)\n\n> Parte 1 de 4 do corpus de governança (split GOVERNANCE-SPLIT-01).\n> Lições → \`governance-lessons.md\` · SPEC-FIRST/checklists → \`governance-spec-first.md\` · ADRs → \`governance-adr-ref.md\`.\n`;
fs.writeFileSync(
  path.join(OUT_DIR, "governance-core.md"),
  coreHeader + eol + buckets.core.map(bodyOf).join(eol) + eol,
  "utf8"
);

// ---- write governance-lessons.md ----
const lessonsHeader = `${FM(
  "Governance LESSONS — Lições aprendidas #59..#141 (casos canônicos, anti-padrões, vinculadas)"
)}\n# Governance Rules — Lições Aprendidas\n\n> Parte 2 de 4 do corpus de governança (split GOVERNANCE-SPLIT-01).\n> REGRA-ORQ/gates/flow → \`governance-core.md\`.\n`;
fs.writeFileSync(
  path.join(OUT_DIR, "governance-lessons.md"),
  lessonsHeader + eol + buckets.lessons.map(bodyOf).join(eol) + eol,
  "utf8"
);

// ---- write governance-spec-first.md ----
const specOverview = `## SOLARIS-SPEC-FIRST v1.2 — índice da metodologia

> Materializada e consolidada em REGRA-ORQ-43 (índice) + REGRA-ORQ-44 (DoD negativo).
> Esta seção é o ponto de entrada; as regras canônicas vivem em \`governance-core.md\`.

A metodologia spec-first é o fluxo único obrigatório para features/bugs Classe B/C:

| Etapa | Regra canônica (em \`governance-core.md\`) |
|---|---|
| 1. Classificar impacto (A/B/C) | REGRA-ORQ-24 |
| 2. Análise cross-cutting AS-IS/TO-BE | REGRA-ORQ-41 + skill \`.claude/skills/impact-tree/SKILL.md\` |
| 3. Artefatos da issue (Triade) | REGRA-ORQ-28 |
| 4. Template canônico da issue | \`.github/ISSUE_TEMPLATE/sprint-issue.md\` |
| 5. Papéis (RACI) | REGRA-ORQ-33 |
| 6. DoD negativo por consumer crítico | REGRA-ORQ-44 |
| 7. Enforcement de merge | \`.github/workflows/validate-pr.yml\` |
| Auditoria de fim de sessão | REGRA-ORQ-19 (Passo 8: lições commitadas — REGRA-ORQ-46) |
| Auditoria de corpus | \`docs/governance/corpus-audit-checklist.md\` |

Os checklists operacionais que sustentam o spec-first estão abaixo (CHECKLIST-VAL-01 / CHECKLIST-REVIEW-01).
`;
const specHeader = `${FM(
  "Governance SPEC-FIRST — metodologia SOLARIS-SPEC-FIRST v1.2 + CHECKLIST-VAL-01 + CHECKLIST-REVIEW-01"
)}\n# Governance Rules — SPEC-FIRST + Checklists\n\n> Parte 3 de 4 do corpus de governança (split GOVERNANCE-SPLIT-01).\n`;
fs.writeFileSync(
  path.join(OUT_DIR, "governance-spec-first.md"),
  specHeader + eol + specOverview + eol + buckets.specfirst.map(bodyOf).join(eol) + eol,
  "utf8"
);

// ---- write governance-adr-ref.md ----
const adrHeader = `${FM(
  "Governance ADR-REF — índice dos Architecture Decision Records ativos + referências cruzadas"
)}\n# Governance Rules — Índice de ADRs\n\n> Parte 4 de 4 do corpus de governança (split GOVERNANCE-SPLIT-01).\n> Conteúdo GERADO a partir de \`docs/adr/\`. Fonte autoritativa: \`docs/adr/ADR-INDEX.md\`.\n`;
const adrBody = `## ADRs ativos (${adrFiles.length} arquivos em \`docs/adr/\`)

| Arquivo | Título |\n|---|---|\n${adrRows.join("\n")}\n\n## Referências cruzadas (regra → ADR)\n\nAs regras em \`governance-core.md\` e as lições em \`governance-lessons.md\` referenciam ADRs por número (ex.: \`ADR-0035\`, \`ADR-0038\`). Para o texto completo de cada decisão, consultar o arquivo correspondente em \`docs/adr/\`. Destaques operacionais:\n\n- **ADR-0022** — hot swap risk engine v4 (\`generateRiskMatrices\` desativado; \`risksV4\` ativo)\n- **ADR-0025** — risk_categories configuráveis (RAG sensor)\n- **ADR-0035** — resolver cascata NCM/NBS (grupo vs específico)\n- **ADR-0036** — reranker NCM-aware (Opção A)\n- **ADR-0037** — gate de deploy 4 HEADs obrigatório\n- **ADR-0038** — filtro de questionário por regime tributário\n`;
fs.writeFileSync(
  path.join(OUT_DIR, "governance-adr-ref.md"),
  adrHeader + eol + adrBody.replace(/\n/g, eol) + eol,
  "utf8"
);

// ---- report sizes ----
const sz = (f) => fs.statSync(path.join(OUT_DIR, f)).size;
for (const f of [
  "governance-core.md",
  "governance-lessons.md",
  "governance-spec-first.md",
  "governance-adr-ref.md",
]) {
  console.log(f.padEnd(28), sz(f), "bytes", sz(f) < 150000 ? "OK(<150k)" : "OVER-150k");
}
console.log("routed sections:", {
  core: buckets.core.length,
  lessons: buckets.lessons.length,
  specfirst: buckets.specfirst.length,
});
