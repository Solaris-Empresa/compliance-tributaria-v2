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

describe("M3.7 Item 12 — SQL UPDATE marca SOL-026..037 (12 codes LC 224 ativos)", () => {
  // Atualizado 2026-05-04: query empírica em produção retornou 12 codes ativos
  // (SOL-026..037), não os 5 documentados em E2E-3-ONDAS:
  //   - SOL-008, SOL-009: NÃO EXISTEM no banco
  //   - SOL-010..012: existem mas ativo=0 (já filtradas pelo getOnda1Questions)
  //   - SOL-026..037: as 12 perguntas LC 224 reais ativas (smoke E2E confirmado)

  it("script SQL existe e contém UPDATE para pending_legal", () => {
    expect(SQL_SCRIPT).toMatch(/UPDATE solaris_questions/);
    expect(SQL_SCRIPT).toMatch(/SET mapping_review_status\s*=\s*'pending_legal'/);
  });

  it("script SQL marca os 12 códigos LC 224 ativos (SOL-026..037)", () => {
    const codigosEsperados = [
      "SOL-026", "SOL-027", "SOL-028", "SOL-029", "SOL-030",
      "SOL-031", "SOL-032", "SOL-033", "SOL-034", "SOL-035",
      "SOL-036", "SOL-037",
    ];
    for (const codigo of codigosEsperados) {
      expect(SQL_SCRIPT).toContain(`'${codigo}'`);
    }
  });

  it("script SQL NÃO inclui SOL-008, SOL-009 (não existem no banco)", () => {
    // Verificar apenas no UPDATE, não em comentários explicativos
    const updateSection = SQL_SCRIPT.split("-- Verificação:")[0];
    expect(updateSection).not.toMatch(/'SOL-008'/);
    expect(updateSection).not.toMatch(/'SOL-009'/);
  });

  it("script SQL NÃO inclui SOL-010..012 no UPDATE (já estão ativo=0)", () => {
    const updateSection = SQL_SCRIPT.split("-- Verificação:")[0];
    expect(updateSection).not.toMatch(/'SOL-010'/);
    expect(updateSection).not.toMatch(/'SOL-011'/);
    expect(updateSection).not.toMatch(/'SOL-012'/);
  });

  it("script SQL inclui query de verificação", () => {
    expect(SQL_SCRIPT).toMatch(/SELECT codigo, mapping_review_status/);
  });

  it("script SQL inclui reversão documentada (após curadoria)", () => {
    expect(SQL_SCRIPT).toMatch(/approved_legal/);
    expect(SQL_SCRIPT).toMatch(/lei_ref IS NOT NULL/);
  });

  it("script SQL documenta investigações pendentes (issues separadas)", () => {
    expect(SQL_SCRIPT).toMatch(/Investigações pendentes/);
    expect(SQL_SCRIPT).toMatch(/cnae_groups\s*=\s*\["\[\]"\]/);
    expect(SQL_SCRIPT).toMatch(/E2E-3-ONDAS-QUESTIONARIOS-v1\.md/);
  });
});
