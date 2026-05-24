/**
 * FEAT-SCOPE-01 (#1177) — contrato da migration 0104 (validação estática do SQL).
 * Garante que a tabela + seed Fase 1 batem com o sign-off do P.O. (24/05/2026).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SQL = readFileSync(
  path.resolve(process.cwd(), "drizzle/0104_cnae_aplicavel_oportunidade.sql"),
  "utf8",
);

describe("FEAT-SCOPE-01 — migration 0104 (contrato do SQL)", () => {
  it("cria a tabela idempotente (IF NOT EXISTS) com unique (oportunidade, cnae)", () => {
    expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS cnae_aplicavel_oportunidade/);
    expect(SQL).toMatch(/UNIQUE KEY uq_cnae_oport \(oportunidade_codigo, cnae_4dig\)/);
    expect(SQL).toMatch(/ENUM\('potencial','excluido','pending_legal'\)/);
  });

  it("seed Fase 1 = 14 linhas (7 §1ºII + 2 §3º + 5 exclusões)", () => {
    const valueRows = (SQL.match(/^\s*\('aliquota_reduzida',/gm) ?? []).length;
    expect(valueRows).toBe(14);
  });

  it("4120 (construtora) = excluido", () => {
    expect(SQL).toMatch(/'4120','excluido'/);
  });

  it("7112 (engenharia) = potencial, gate §1º II (gate_especial NULL, requer_questionario 1)", () => {
    const line = SQL.split("\n").find((l) => l.includes("'7112'")) ?? "";
    expect(line).toMatch(/'potencial'/);
    expect(line).toMatch(/NULL, 1,/); // gate_especial NULL + requer_questionario 1
  });

  it("9311 e 8591 (ed. física) = potencial com gate '§3º' e requer_questionario 0", () => {
    for (const cnae of ["9311", "8591"]) {
      const line = SQL.split("\n").find((l) => l.includes(`'${cnae}'`)) ?? "";
      expect(line).toMatch(/'potencial'/);
      expect(line).toMatch(/'§3º',0,/);
    }
  });

  it("não seeda 7490/7119/7120 na Fase 1 (deferidos)", () => {
    for (const cnae of ["7490", "7119", "7120"]) {
      expect(SQL.includes(`'${cnae}','`)).toBe(false);
    }
  });

  it("trilha GOV-001: sign_off_autor + sign_off_data em todas as linhas", () => {
    const autores = (SQL.match(/'P\.O\. \(Uires Tapajos\)','2026-05-24'/g) ?? []).length;
    expect(autores).toBe(14);
  });

  it("rollback (DOWN) documentado", () => {
    expect(SQL).toMatch(/ROLLBACK \(DOWN\)/i);
    expect(SQL).toMatch(/DROP TABLE IF EXISTS cnae_aplicavel_oportunidade/);
  });
});
