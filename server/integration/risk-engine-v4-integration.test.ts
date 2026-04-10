/**
 * risk-engine-v4-integration.test.ts — Sprint Z-09 / GAP-CONTRACT-03
 *
 * Teste de integração real: getRiskCategories() + computeRiskMatrix()
 * lendo da tabela risk_categories sem mocks.
 *
 * Pré-requisito: DATABASE_URL configurado, migration 0065 aplicada.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mysql from "mysql2/promise";
import { getRiskCategories, resetCategoryCache, computeRiskMatrix, type GapRule } from "../lib/risk-engine-v4";

const HAS_DB = !!process.env.DATABASE_URL;

let pool: mysql.Pool;

const TEST_CODIGO_ATIVO = "__test_integ_ativo__";
const TEST_CODIGO_EXPIRADO = "__test_integ_expirado__";

beforeAll(async () => {
  if (!HAS_DB) return;
  pool = mysql.createPool(process.env.DATABASE_URL!);

  // Limpar dados de teste anteriores (idempotente)
  await pool.execute(
    `DELETE FROM risk_categories WHERE codigo IN (?, ?)`,
    [TEST_CODIGO_ATIVO, TEST_CODIGO_EXPIRADO]
  );

  // Inserir categoria ativa (vigencia_fim = NULL)
  await pool.execute(
    `INSERT INTO risk_categories
       (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
        vigencia_inicio, vigencia_fim, status, origem, escopo)
     VALUES (?, 'Teste Ativo', 'alta', 'imediata', 'risk', 'Art. 999', 'LC214',
             '2025-01-01', NULL, 'ativo', 'lei_federal', 'nacional')`,
    [TEST_CODIGO_ATIVO]
  );

  // Inserir categoria expirada (vigencia_fim = 2020-01-01)
  await pool.execute(
    `INSERT INTO risk_categories
       (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
        vigencia_inicio, vigencia_fim, status, origem, escopo)
     VALUES (?, 'Teste Expirado', 'media', 'curto_prazo', 'risk', 'Art. 998', 'LC214',
             '2019-01-01', '2020-01-01', 'ativo', 'lei_federal', 'nacional')`,
    [TEST_CODIGO_EXPIRADO]
  );

  // Resetar cache para forçar leitura do banco
  resetCategoryCache();
});

afterAll(async () => {
  if (!HAS_DB) return;
  // Cleanup obrigatório
  await pool.execute(
    `DELETE FROM risk_categories WHERE codigo IN (?, ?)`,
    [TEST_CODIGO_ATIVO, TEST_CODIGO_EXPIRADO]
  );
  await pool.end();
});

describe.skipIf(!HAS_DB)("GAP-CONTRACT-03 — integração real risk_categories", () => {
  it("apenas categoria ativa retorna de getRiskCategories()", async () => {
    resetCategoryCache();
    const table = await getRiskCategories();

    expect(table[TEST_CODIGO_ATIVO]).toEqual({
      severity: "alta",
      urgency: "imediata",
    });
    expect(table[TEST_CODIGO_EXPIRADO]).toBeUndefined();
  });

  it("computeRiskMatrix com gap da categoria do banco produz risco correto", async () => {
    resetCategoryCache();

    // Pré-carregar categorias do banco
    const categories = await getRiskCategories();
    expect(categories[TEST_CODIGO_ATIVO]).toBeDefined();

    // Criar gap com a categoria inserida no banco
    const gap: GapRule = {
      ruleId: "RULE-INTEG-001",
      categoria: TEST_CODIGO_ATIVO,
      artigo: "Art. 999",
      fonte: "cnae",
      gapClassification: "ausencia",
      requirementId: "REQ-INTEG-001",
      sourceReference: "LC 214/2025 Art. 999",
      domain: "fiscal",
    };

    const risks = computeRiskMatrix([gap]);
    expect(risks).toHaveLength(1);
    expect(risks[0].categoria).toBe(TEST_CODIGO_ATIVO);
    expect(risks[0].breadcrumb).toHaveLength(4);
    expect(risks[0].ruleId).toBe("RULE-INTEG-001");
  });
});
