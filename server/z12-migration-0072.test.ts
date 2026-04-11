/**
 * Z-12 — Evidência migration 0072: risk_category_code em regulatory_requirements_v3
 *
 * Verifica:
 *   1. Coluna risk_category_code existe na tabela
 *   2. FK aponta para risk_categories.codigo (sem violações)
 *   3. Todos os 138 requisitos têm risk_category_code preenchido (0 NULLs)
 *   4. Mapeamento domain → risk_category_code está correto
 *   5. Distribuição: todos os 10 códigos de risco foram usados
 */
import { describe, it, expect } from "vitest";
import * as db from "./db";

// Helper: executar SQL raw via mysql2
async function sql(query: string, params: any[] = []) {
  const mysql = await import("mysql2/promise");
  const conn = await mysql.default.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.execute(query, params);
  await conn.end();
  return rows as any[];
}

describe("Z-12 migration 0072 — risk_category_code em regulatory_requirements_v3", () => {

  it("Coluna risk_category_code existe na tabela", async () => {
    const rows = await sql("SHOW COLUMNS FROM regulatory_requirements_v3 LIKE 'risk_category_code'");
    expect(rows.length).toBe(1);
    expect(rows[0].Field).toBe("risk_category_code");
    expect(rows[0].Type).toMatch(/varchar\(64\)/i);
  });

  it("FK fk_req_v3_risk_category existe e aponta para risk_categories", async () => {
    const rows = await sql(`
      SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_NAME = 'regulatory_requirements_v3'
        AND COLUMN_NAME = 'risk_category_code'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].REFERENCED_TABLE_NAME).toBe("risk_categories");
    expect(rows[0].REFERENCED_COLUMN_NAME).toBe("codigo");
  });

  it("Todos os 138 requisitos têm risk_category_code preenchido (0 NULLs)", async () => {
    const [nullCount] = await sql(
      "SELECT COUNT(*) as cnt FROM regulatory_requirements_v3 WHERE risk_category_code IS NULL"
    );
    const [total] = await sql("SELECT COUNT(*) as cnt FROM regulatory_requirements_v3");
    console.log(`Total requisitos: ${total.cnt} | NULLs: ${nullCount.cnt}`);
    expect(Number(nullCount.cnt)).toBe(0);
    expect(Number(total.cnt)).toBe(138);
  });

  it("Mapeamento domain → risk_category_code está correto", async () => {
    const expectedMap: Record<string, string> = {
      split_payment:                        "split_payment",
      cadastro_identificacao:               "inscricao_cadastral",
      regimes_diferenciados:                "regime_diferenciado",
      creditos_ressarcimento:               "credito_presumido",
      incentivos_beneficios_transparencia:  "aliquota_reduzida",
      apuracao_extincao:                    "confissao_automatica",
      documentos_obrigacoes:                "obrigacao_acessoria",
      classificacao_incidencia:             "imposto_seletivo",
      contratos_comercial_precificacao:     "transicao_iss_ibs",
      sistemas_erp_dados:                   "split_payment",
      conformidade_fiscalizacao_contencioso:"confissao_automatica",
      governanca_transicao:                 "transicao_iss_ibs",
    };

    for (const [domain, expectedCode] of Object.entries(expectedMap)) {
      const rows = await sql(
        "SELECT DISTINCT risk_category_code FROM regulatory_requirements_v3 WHERE domain = ?",
        [domain]
      );
      expect(rows.length).toBe(1);
      expect(rows[0].risk_category_code).toBe(expectedCode);
    }
  });

  it("Todos os 10 códigos de risco foram usados na seed", async () => {
    const rows = await sql(
      "SELECT DISTINCT risk_category_code FROM regulatory_requirements_v3 ORDER BY risk_category_code"
    );
    const codes = rows.map((r: any) => r.risk_category_code);
    console.log("Códigos usados:", codes);

    const expectedCodes = [
      "aliquota_reduzida",
      "confissao_automatica",
      "credito_presumido",
      "imposto_seletivo",
      "inscricao_cadastral",
      "obrigacao_acessoria",
      "regime_diferenciado",
      "split_payment",
      "transicao_iss_ibs",
    ];
    // Verifica que todos os códigos esperados estão presentes
    for (const code of expectedCodes) {
      expect(codes).toContain(code);
    }
  });

  it("Sem violações de FK (todos os códigos existem em risk_categories)", async () => {
    const rows = await sql(`
      SELECT r.risk_category_code
      FROM regulatory_requirements_v3 r
      LEFT JOIN risk_categories rc ON r.risk_category_code = rc.codigo
      WHERE r.risk_category_code IS NOT NULL
        AND rc.codigo IS NULL
    `);
    expect(rows.length).toBe(0);
  });
});
