#!/usr/bin/env node
/**
 * sync-rag.mjs — Gerador data-driven do Dashboard RAG do Cockpit P.O. (F2, Issue #1652)
 *
 * Resolve o hardcode "2.515 chunks" (v5.0 abril, pré-NCM/NBS) no doc RAG.
 *
 * Fonte de verdade do NÚMERO EXIBIDO = banco (`ragDocuments`, o corpus servido).
 * O count build-time (`server/rag-corpus-*.ts`) é cross-check (sinal de drift de ingestão).
 *
 * Display (D-RAG-NUM Opção A — não mente por omissão nem por excesso):
 *   Corpus RAG: <total> chunks · <leis> leis
 *     ├── Normativos: <normative> chunks · <leis_norm> leis
 *     └── Tabelas NCM/NBS: <reference> chunks (referência)
 *
 * db_* vêm de:
 *   - se `DATABASE_URL` setado → query COUNT(*) FROM ragDocuments (Manus/CI-com-DB);
 *   - senão → preserva os db_* do rag-manifest.json existente (último valor verificado pelo Manus).
 *
 * Uso:  node docs/painel-po/sync-rag.mjs
 * Saída: docs/painel-po/rag-manifest.json (commitado; gate F1 compara) + números no doc RAG.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const SERVER = join(ROOT, "server");
const MANIFEST = join(__dirname, "rag-manifest.json");
const RAG_DOC = join(__dirname, "GOVERNANCA-RAG-PO-COMPLETO.md");

// Tabelas de referência (índices de classificação fiscal, NÃO legislação) — D-RAG-NUM.
const REFERENCE_LEIS = ["tabela_ncm_completa", "nbs_completa"];

// ── 1. Build-time: conta chunks nos corpus .ts (cross-check / drift) ──────────
// Glob server/rag-corpus-*.ts (exclui rag-corpus.ts base/union — não é corpus de lei).
const corpusFiles = readdirSync(SERVER)
  .filter((f) => /^rag-corpus-.+\.ts$/.test(f))
  .sort();

let buildChunks = 0;
for (const f of corpusFiles) {
  const src = readFileSync(join(SERVER, f), "utf-8");
  const n = (src.match(/conteudo:/g) || []).length;
  buildChunks += n;
}

// ── 2. DB: COUNT(*) ragDocuments (se DATABASE_URL) OU preserva snapshot Manus ──
async function readDbFromDatabase() {
  const { createConnection } = await import("mysql2/promise");
  const conn = await createConnection(process.env.DATABASE_URL);
  try {
    const [rows] = await conn.query(
      "SELECT lei, COUNT(*) AS n FROM ragDocuments GROUP BY lei ORDER BY n DESC",
    );
    return rows.map((r) => ({ lei: r.lei, chunks: Number(r.n) }));
  } finally {
    await conn.end();
  }
}

function readDbFromManifest() {
  if (!existsSync(MANIFEST)) {
    throw new Error(
      "[sync-rag] sem DATABASE_URL e sem rag-manifest.json — Manus precisa semear o snapshot (COUNT(*) ragDocuments).",
    );
  }
  return JSON.parse(readFileSync(MANIFEST, "utf-8")).breakdown ?? [];
}

const breakdown = process.env.DATABASE_URL
  ? await readDbFromDatabase()
  : readDbFromManifest();

// ── 3. Classifica e agrega ────────────────────────────────────────────────────
const withType = breakdown.map((b) => ({
  ...b,
  type: REFERENCE_LEIS.includes(b.lei) ? "reference" : "normative",
}));
const sum = (arr) => arr.reduce((a, b) => a + b.chunks, 0);
const dbTotal = sum(withType);
const dbReference = sum(withType.filter((b) => b.type === "reference"));
const dbNormative = dbTotal - dbReference;
const dbLeisTotal = withType.length;
const dbLeisNormative = withType.filter((b) => b.type === "normative").length;

// ── 4. Manifest ───────────────────────────────────────────────────────────────
const manifest = {
  generated_at: new Date().toISOString(),
  db_chunks_total: dbTotal,
  db_chunks_normative: dbNormative,
  db_chunks_reference: dbReference,
  db_leis_total: dbLeisTotal,
  db_leis_normative: dbLeisNormative,
  rag_corpus_files: corpusFiles.length,
  build_chunks: buildChunks,
  drift_build_vs_db: dbTotal - buildChunks,
  breakdown: withType,
};
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n", "utf-8");

// ── 5. Atualiza os números no doc RAG (substitui o hardcode) ──────────────────
if (existsSync(RAG_DOC)) {
  let doc = readFileSync(RAG_DOC, "utf-8");
  const fmt = (n) => n.toLocaleString("pt-BR");
  // Bloco de status entre as âncoras <!-- RAG-NUM:START --> ... <!-- RAG-NUM:END -->
  const block =
    "<!-- RAG-NUM:START (gerado por sync-rag.mjs — não editar à mão) -->\n" +
    `**Corpus RAG: ${fmt(dbTotal)} chunks · ${dbLeisTotal} leis**\n` +
    `- Normativos: **${fmt(dbNormative)}** chunks · ${dbLeisNormative} leis\n` +
    `- Tabelas NCM/NBS: **${fmt(dbReference)}** chunks (referência, não legislação)\n` +
    (manifest.drift_build_vs_db === 0
      ? "- ✅ Corpus sincronizado (build-time == banco)\n"
      : `- ⚠️ Drift build-time vs banco: ${manifest.drift_build_vs_db} (ingestão pendente)\n`) +
    "<!-- RAG-NUM:END -->";
  if (doc.includes("<!-- RAG-NUM:START")) {
    doc = doc.replace(/<!-- RAG-NUM:START[\s\S]*?<!-- RAG-NUM:END -->/, block);
    writeFileSync(RAG_DOC, doc, "utf-8");
  } else {
    console.warn("[sync-rag] âncoras RAG-NUM ausentes no doc — inserir manualmente uma vez.");
  }
}

console.log("✅ rag-manifest.json gerado:");
console.log(`   Total: ${dbTotal} · Normativos: ${dbNormative} · Tabelas: ${dbReference}`);
console.log(`   Leis: ${dbLeisTotal} (${dbLeisNormative} normativas) · corpus .ts: ${corpusFiles.length}`);
console.log(`   build-time: ${buildChunks} · drift: ${manifest.drift_build_vs_db}`);
console.log(`   fonte db: ${process.env.DATABASE_URL ? "DATABASE_URL (query)" : "rag-manifest.json (snapshot Manus)"}`);
