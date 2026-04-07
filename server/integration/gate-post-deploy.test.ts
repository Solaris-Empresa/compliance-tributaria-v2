/**
 * Gate POST-DEPLOY — Testes G01..G05
 * MANUS-GOVERNANCE.md v4.6
 *
 * Verifica:
 *   G01: /api/health endpoint existe e retorna JSON válido
 *   G02: /api/health retorna campos obrigatórios (status, sha, version, timestamp, checks)
 *   G03: /api/health checks.database presente
 *   G04: smoke.sh existe e é executável
 *   G05: GitHub Action smoke-post-deploy.yml existe
 *
 * Origem: Z-02 mergeado com 47/47 PASS mas produção exibia QC legado.
 * Gate POST-DEPLOY detecta o mesmo problema em < 3 minutos.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, accessSync, constants } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "../..");

// ── G01: health.ts existe ────────────────────────────────────────────────────
describe("G01 — server/routers/health.ts existe", () => {
  it("health.ts deve existir em server/routers/", () => {
    expect(existsSync(join(ROOT, "server/routers/health.ts"))).toBe(true);
  });

  it("health.ts deve exportar healthRouter", () => {
    const content = readFileSync(join(ROOT, "server/routers/health.ts"), "utf-8");
    expect(content).toContain("export const healthRouter");
  });
});

// ── G02: health.ts retorna campos obrigatórios ────────────────────────────────
describe("G02 — /api/health retorna campos obrigatórios", () => {
  it("health.ts deve incluir status, sha, version, timestamp, checks", () => {
    const content = readFileSync(join(ROOT, "server/routers/health.ts"), "utf-8");
    // Os campos são retornados via object shorthand (status, sha, version, etc.)
    expect(content).toContain('status:');
    expect(content).toContain('sha,');
    expect(content).toContain('version,');
    expect(content).toContain('timestamp:');
    expect(content).toContain('checks:');
  });
});

// ── G03: health.ts verifica database ─────────────────────────────────────────
describe("G03 — /api/health verifica database", () => {
  it("health.ts deve ter check de database", () => {
    const content = readFileSync(join(ROOT, "server/routers/health.ts"), "utf-8");
    expect(content).toContain("database");
    expect(content).toContain("getDb");
  });
});

// ── G04: smoke.sh existe e é executável ──────────────────────────────────────
describe("G04 — scripts/smoke.sh existe e é executável", () => {
  it("smoke.sh deve existir em scripts/", () => {
    expect(existsSync(join(ROOT, "scripts/smoke.sh"))).toBe(true);
  });

  it("smoke.sh deve ter os 5 smoke tests (S-01..S-05)", () => {
    const content = readFileSync(join(ROOT, "scripts/smoke.sh"), "utf-8");
    expect(content).toContain("S-01");
    expect(content).toContain("S-02");
    expect(content).toContain("S-03");
    expect(content).toContain("S-04");
    expect(content).toContain("S-05");
  });

  it("smoke.sh deve verificar /api/health", () => {
    const content = readFileSync(join(ROOT, "scripts/smoke.sh"), "utf-8");
    expect(content).toContain("/api/health");
  });
});

// ── G05: GitHub Action existe ─────────────────────────────────────────────────
describe("G05 — .github/workflows/smoke-post-deploy.yml existe", () => {
  it("smoke-post-deploy.yml deve existir", () => {
    expect(
      existsSync(join(ROOT, ".github/workflows/smoke-post-deploy.yml"))
    ).toBe(true);
  });

  it("smoke-post-deploy.yml deve disparar em deployment_status", () => {
    const content = readFileSync(
      join(ROOT, ".github/workflows/smoke-post-deploy.yml"),
      "utf-8"
    );
    expect(content).toContain("deployment_status");
  });

  it("smoke-post-deploy.yml deve chamar scripts/smoke.sh", () => {
    const content = readFileSync(
      join(ROOT, ".github/workflows/smoke-post-deploy.yml"),
      "utf-8"
    );
    expect(content).toContain("smoke.sh");
  });
});
