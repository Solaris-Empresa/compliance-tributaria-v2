/**
 * realtime-reporter.ts — Custom Vitest reporter (Sprint Z-20 #717)
 *
 * Alimenta reports/battery-N/progress.md em tempo real:
 * - Append linha-a-linha, sem buffer
 * - Escrita imediata após onTaskUpdate
 * - Sumário final em onFinished
 *
 * Vitest 2.x Reporter API.
 * Regra: reporter é executado no processo principal, sem paralelismo de writes
 * no mesmo arquivo (serializado por Vitest). Lock externo não necessário aqui —
 * validação de lock fica no smoke-test-reporter.sh (Gate G0).
 */
import type { File, Reporter, Task, TaskResultPack, Vitest } from "vitest";
import {
  appendFileSync,
  mkdirSync,
  existsSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

export interface RealtimeReporterOptions {
  outputDir?: string;
  filename?: string;
}

export default class RealtimeReporter implements Reporter {
  private outputPath: string;
  private ctx?: Vitest;
  private startedAt: string;

  constructor(options: RealtimeReporterOptions = {}) {
    const outputDir = options.outputDir ?? "reports/battery-current";
    const filename = options.filename ?? "progress.md";
    this.outputPath = `${outputDir}/${filename}`;
    this.startedAt = new Date().toISOString();
  }

  onInit(ctx: Vitest): void {
    this.ctx = ctx;
    const dir = dirname(this.outputPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const header =
      `# Vitest Realtime Progress\n\n` +
      `**Started:** ${this.startedAt}\n` +
      `**Output:** ${this.outputPath}\n\n` +
      `| Arquivo | Teste | Estado | Duração | Timestamp |\n` +
      `|---|---|---|---|---|\n`;
    writeFileSync(this.outputPath, header, { encoding: "utf-8" });
  }

  onTaskUpdate(packs: TaskResultPack[]): void {
    for (const pack of packs) {
      const [id, result] = pack;
      if (!result?.state) continue;
      if (result.state !== "pass" && result.state !== "fail") continue;

      const task = this.findTask(id);
      const name = task?.name ?? id;
      const file = this.basenameOf(task);
      const duration =
        result.duration != null ? `${Math.round(result.duration)}ms` : "—";
      const icon = result.state === "pass" ? "PASS" : "FAIL";
      const timestamp = new Date().toISOString();
      const line = `| ${file} | ${this.escape(name)} | ${icon} | ${duration} | ${timestamp} |\n`;
      appendFileSync(this.outputPath, line, { encoding: "utf-8" });
    }
  }

  onFinished(files?: File[]): void {
    let pass = 0;
    let fail = 0;
    let skipped = 0;
    const walk = (t: Task): void => {
      if (t.type === "suite" && "tasks" in t) {
        for (const child of t.tasks) walk(child);
      } else if (t.result?.state === "pass") pass++;
      else if (t.result?.state === "fail") fail++;
      else if (t.mode === "skip" || t.mode === "todo") skipped++;
    };
    for (const f of files ?? []) walk(f);

    const summary =
      `\n## Summary\n\n` +
      `- **Pass:** ${pass}\n` +
      `- **Fail:** ${fail}\n` +
      `- **Skipped:** ${skipped}\n` +
      `- **Total:** ${pass + fail + skipped}\n` +
      `- **Started:** ${this.startedAt}\n` +
      `- **Finished:** ${new Date().toISOString()}\n`;
    appendFileSync(this.outputPath, summary, { encoding: "utf-8" });
  }

  private findTask(id: string): Task | undefined {
    if (!this.ctx) return undefined;
    // Vitest 2.x expõe state.idMap para lookup
    const state = (this.ctx as unknown as { state?: { idMap?: Map<string, Task> } })
      .state;
    if (state?.idMap) return state.idMap.get(id);
    return undefined;
  }

  private basenameOf(task?: Task): string {
    const file = (task as Task & { file?: { name?: string } } | undefined)?.file;
    const full = file?.name ?? "";
    const parts = full.split(/[\\/]/);
    return parts[parts.length - 1] ?? "";
  }

  private escape(s: string): string {
    return s.replace(/\|/g, "\\|");
  }
}
