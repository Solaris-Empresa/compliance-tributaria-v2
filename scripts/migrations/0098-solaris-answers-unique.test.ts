/**
 * Test contracts — Migration 0098 (UNIQUE INDEX solaris_answers)
 * Sprint BUG-FIX 20/05/2026 · Issue BUG-I2
 * REGRA-ORQ-28 Artefato 2 + REGRA-ORQ-34 Protocolo 3 (DoD negativo)
 *
 * Estes testes validam o CONTRATO da migration. Validação runtime contra
 * banco real é responsabilidade do Manus pós-deploy (DoD via SQL direto).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const MIGRATION_PATH = path.join(
  REPO_ROOT,
  "drizzle",
  "0098_solaris_answers_unique_project_codigo.sql"
);
const DOWN_PATH = path.join(REPO_ROOT, "drizzle", "downs", "0098_down.sql");
const SCHEMA_PATH = path.join(REPO_ROOT, "drizzle", "schema.ts");

describe("Migration 0098 — UNIQUE INDEX solaris_answers", () => {
  it("migration file existe e é legível", () => {
    const content = readFileSync(MIGRATION_PATH, "utf8");
    expect(content.length).toBeGreaterThan(0);
  });

  it("contém DELETE de duplicatas (PASSO 1)", () => {
    const sql = readFileSync(MIGRATION_PATH, "utf8");
    expect(sql).toMatch(/DELETE\s+sa1\s+FROM\s+solaris_answers\s+sa1/i);
    expect(sql).toMatch(/sa1\.id\s+<\s+sa2\.id/);
  });

  it("contém ADD UNIQUE INDEX (PASSO 2) com nome canônico", () => {
    const sql = readFileSync(MIGRATION_PATH, "utf8");
    expect(sql).toMatch(/ADD\s+UNIQUE\s+INDEX\s+`?idx_solaris_answers_project_codigo`?/i);
    expect(sql).toMatch(/\(`?project_id`?\s*,\s*`?codigo`?\)/);
  });

  it("down file existe e remove o índice", () => {
    const down = readFileSync(DOWN_PATH, "utf8");
    expect(down).toMatch(/DROP\s+INDEX\s+`?idx_solaris_answers_project_codigo`?/i);
  });

  it("schema.ts declara uniqueIndex consistente com migration", () => {
    const schema = readFileSync(SCHEMA_PATH, "utf8");
    // Import explícito de uniqueIndex
    expect(schema).toMatch(/import[\s\S]*?uniqueIndex[\s\S]*?from\s+"drizzle-orm\/mysql-core"/);
    // Declaração na tabela solarisAnswers com mesmo nome do índice no banco
    expect(schema).toMatch(
      /uniqueIndex\(["']idx_solaris_answers_project_codigo["']\)[\s\S]*?\.on\(\s*table\.projectId\s*,\s*table\.codigo\s*\)/
    );
  });

  it("REGRA-ORQ-FILENAME-01: filename não contém substring 'rag'", () => {
    // Migration toca solaris_answers, não ragDocuments. Guard touchesRag não dispara.
    const filename = path.basename(MIGRATION_PATH);
    expect(filename.toLowerCase()).not.toContain("rag");
  });
});
