#!/usr/bin/env node
/**
 * smoke-test-reporter.mjs — Gate G0 (Sprint Z-20 #717)
 *
 * 3 testes sintéticos validam que o reporter em tempo real funciona:
 *  T1: append linha-a-linha sem buffer
 *  T2: concorrência — 10 processos paralelos escrevendo (POSIX O_APPEND
 *      garante atomicidade para writes < PIPE_BUF; testamos que todas
 *      as linhas aparecem sem corrupção)
 *  T3: flush — conteúdo persistido no disco, nada em buffer de memória
 *
 * Usa Node APIs — portável entre Linux/macOS/Windows.
 * Exit 0 = PASS · Exit 1 = FAIL.
 */
import { appendFileSync, writeFileSync, readFileSync, mkdirSync, fsyncSync, openSync, closeSync, existsSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIR = resolve(ROOT, "reports/battery-smoke");
const PROGRESS = resolve(DIR, "progress.md");

const CONCURRENT_WORKERS = 10;
const LINES_PER_WORKER = 5;

// Modo worker: apenas escreve e sai
if (process.argv[2] === "--worker") {
  const workerId = process.argv[3] ?? "?";
  for (let i = 0; i < LINES_PER_WORKER; i++) {
    const fd = openSync(PROGRESS, "a");
    const line = `worker-${workerId} line-${i} ts-${process.hrtime.bigint()}\n`;
    const buf = Buffer.from(line);
    // POSIX O_APPEND: write single buffer é atomico < PIPE_BUF
    const { writeSync } = await import("node:fs");
    writeSync(fd, buf, 0, buf.length);
    fsyncSync(fd);
    closeSync(fd);
  }
  process.exit(0);
}

// Modo orquestrador
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  if (existsSync(PROGRESS)) console.error("--- progress.md ---\n" + readFileSync(PROGRESS, "utf-8"));
  process.exit(1);
}

function pass(msg) {
  console.log(`PASS: ${msg}`);
}

// Setup
if (existsSync(DIR)) rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
writeFileSync(PROGRESS, `# Gate G0 smoke-test — ${new Date().toISOString()}\n`);

// ────────────────────────── T1: append básico ────────────────────────────
try {
  for (let i = 0; i < 3; i++) {
    appendFileSync(PROGRESS, `T1 line ${i}\n`);
  }
  const content = readFileSync(PROGRESS, "utf-8");
  const t1Lines = content.split("\n").filter((l) => l.startsWith("T1 line ")).length;
  if (t1Lines !== 3) fail(`T1 esperava 3 linhas, encontrou ${t1Lines}`);
  pass(`T1 — append básico (${t1Lines} linhas)`);
} catch (e) {
  fail(`T1 threw: ${e instanceof Error ? e.message : String(e)}`);
}

// ────────────────────────── T2: concorrência ──────────────────────────────
appendFileSync(PROGRESS, `\n--- T2: ${CONCURRENT_WORKERS} workers ---\n`);
const children = [];
for (let w = 0; w < CONCURRENT_WORKERS; w++) {
  const child = spawn(
    process.execPath,
    [fileURLToPath(import.meta.url), "--worker", String(w)],
    { stdio: "ignore" }
  );
  children.push(
    new Promise((resolveP, rejectP) => {
      child.on("exit", (code) => (code === 0 ? resolveP() : rejectP(new Error(`worker ${w} exit ${code}`))));
      child.on("error", rejectP);
    })
  );
}

try {
  await Promise.all(children);
} catch (e) {
  fail(`T2 worker falhou: ${e instanceof Error ? e.message : String(e)}`);
}

const t2Content = readFileSync(PROGRESS, "utf-8");
const workerLines = t2Content.split("\n").filter((l) => l.startsWith("worker-"));
const expected = CONCURRENT_WORKERS * LINES_PER_WORKER;
if (workerLines.length !== expected) {
  fail(`T2 esperava ${expected} linhas, encontrou ${workerLines.length} (sugere corrupção ou perda por race)`);
}

// Verifica que cada worker apareceu
const workerIds = new Set(workerLines.map((l) => l.match(/^worker-(\d+)/)?.[1]));
if (workerIds.size !== CONCURRENT_WORKERS) {
  fail(`T2 workers únicos: esperava ${CONCURRENT_WORKERS}, encontrou ${workerIds.size}`);
}

// Verifica integridade — nenhuma linha truncada/interleaved
const corrupt = workerLines.filter((l) => !/^worker-\d+ line-\d+ ts-\d+$/.test(l));
if (corrupt.length > 0) {
  fail(`T2 linhas corrompidas (interleaving): ${corrupt.slice(0, 3).join(" | ")}`);
}
pass(`T2 — ${CONCURRENT_WORKERS} workers paralelos (${workerLines.length} linhas íntegras)`);

// ────────────────────────── T3: flush ─────────────────────────────────────
const before = readFileSync(PROGRESS, "utf-8").length;
appendFileSync(PROGRESS, "T3 flush probe\n");
const fd = openSync(PROGRESS, "r+");
fsyncSync(fd);
closeSync(fd);
const after = readFileSync(PROGRESS, "utf-8").length;
if (after <= before) fail(`T3 flush não persistiu: before=${before}, after=${after}`);
pass(`T3 — flush OK (escreveu ${after - before} bytes)`);

// ────────────────────────── Summary ───────────────────────────────────────
appendFileSync(PROGRESS, `\n--- Gate G0 PASS at ${new Date().toISOString()} ---\n`);
console.log(`\n=== Gate G0: PASS (file: ${PROGRESS}) ===`);
process.exit(0);
