/**
 * m3.7-mapping-review-gate.test.ts
 * Sprint M3.7 — Item 12 — Gate determinístico mappingReviewStatus
 *
 * Issue: #945
 * Spec: REGRA-ORQ-29 + Lição #61 — perguntas sem metadado determinístico
 * não entram no questionário. Gate via mappingReviewStatus enum existente.
 *
 * REGRA-ORQ-27 Plano B: leitura source code + regex match.
 * (Tests funcionais de getOnda1Questions exigem DB integration — não cobertos aqui.)
 *
 * Vinculadas:
 * - PR #939 — REGRA-ORQ-29 (governance)
 * - PR #948 — REGRA-ORQ-33 (RACI)
 * - Issue #945 (esta)
 * - Análise profunda Manus 2026-05-04
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const DB_SRC = readFileSync(
  path.resolve(__dirname, "..", "db.ts"),
  "utf-8",
);
const SQL_SCRIPT = readFileSync(
  path.resolve(__dirname, "..", "..", "scripts", "m3.7-item-12-mapping-review-update.sql"),
  "utf-8",
);

describe("M3.7 Item 12 — Gate mappingReviewStatus em getOnda1Questions", () => {
  it("getOnda1Questions filtra mappingReviewStatus via inArray", () => {
    expect(DB_SRC).toMatch(/inArray\(solarisQuestions\.mappingReviewStatus,\s*\['curated_internal',\s*'approved_legal'\]\)/);
  });

  it("getOnda1Questions NÃO inclui pending_legal no filtro (gate funcional)", () => {
    // O array de inclusão NÃO deve conter 'pending_legal'
    const match = DB_SRC.match(/inArray\(solarisQuestions\.mappingReviewStatus,\s*\[([^\]]+)\]/);
    expect(match).toBeTruthy();
    if (match) {
      expect(match[1]).not.toContain("pending_legal");
    }
  });

  it("getOnda1Questions preserva filtro existente eq(ativo, 1) via and()", () => {
    expect(DB_SRC).toMatch(/and\(\s*eq\(solarisQuestions\.ativo,\s*1\)/);
  });

  it("inArray é importado de drizzle-orm em db.ts", () => {
    expect(DB_SRC).toMatch(/import\s*\{[^}]*inArray[^}]*\}\s*from\s*["']drizzle-orm["']/);
  });
});

describe("M3.7 Item 12 — SQL UPDATE marca SOL-008..012 como pending_legal", () => {
  it("script SQL existe e marca os 5 códigos corretos", () => {
    expect(SQL_SCRIPT).toMatch(/UPDATE solaris_questions/);
    expect(SQL_SCRIPT).toMatch(/SET mapping_review_status\s*=\s*'pending_legal'/);
    expect(SQL_SCRIPT).toMatch(/SOL-008/);
    expect(SQL_SCRIPT).toMatch(/SOL-009/);
    expect(SQL_SCRIPT).toMatch(/SOL-010/);
    expect(SQL_SCRIPT).toMatch(/SOL-011/);
    expect(SQL_SCRIPT).toMatch(/SOL-012/);
  });

  it("script SQL inclui query de verificação", () => {
    expect(SQL_SCRIPT).toMatch(/SELECT codigo, mapping_review_status/);
  });

  it("script SQL inclui reversão documentada (após curadoria)", () => {
    expect(SQL_SCRIPT).toMatch(/approved_legal/);
    expect(SQL_SCRIPT).toMatch(/lei_ref IS NOT NULL/);
  });
});
