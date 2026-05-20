/**
 * Test contracts — Migration 0099 (correção artigo_base + governança normativa)
 * Sprint BUG-FIX 20/05/2026 · Issue BUG-D1+L1
 * REGRA-ORQ-28 Artefato 2 + REGRA-ORQ-34 Protocolo 3 (DoD negativo)
 *
 * Validação runtime contra banco real é responsabilidade do Manus pós-deploy.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const MIGRATION_PATH = path.join(
  REPO_ROOT,
  "drizzle",
  "0099_risk_categories_artigo_base_correcao.sql"
);
const DOWN_PATH = path.join(REPO_ROOT, "drizzle", "downs", "0099_down.sql");
const SCHEMA_PATH = path.join(REPO_ROOT, "drizzle", "schema.ts");

describe("Migration 0099 — risk_categories artigo_base + governança normativa", () => {
  it("migration file existe e é legível", () => {
    const content = readFileSync(MIGRATION_PATH, "utf8");
    expect(content.length).toBeGreaterThan(0);
  });

  describe("PARTE A — 6 UPDATEs corrigindo artigo_base", () => {
    const sql = readFileSync(MIGRATION_PATH, "utf8");
    const cases: Array<[string, string]> = [
      ["split_payment", "Art. 31 LC 214/2025"],
      ["credito_presumido", "Art. 168 LC 214/2025"],
      ["inscricao_cadastral", "Art. 164 LC 214/2025"],
      ["imposto_seletivo", "Art. 409 LC 214/2025"],
      ["aliquota_reduzida", "Art. 127 LC 214/2025"],
      ["regime_diferenciado", "Art. 229 LC 214/2025"],
    ];

    for (const [codigo, expectedArtigo] of cases) {
      it(`${codigo} → ${expectedArtigo}`, () => {
        // Garante que existe UPDATE setando o artigo_base correto onde codigo = X
        const pattern = new RegExp(
          `UPDATE\\s+risk_categories\\s+SET[\\s\\S]*?artigo_base\\s*=\\s*'${expectedArtigo.replace(/\./g, "\\.")}'[\\s\\S]*?WHERE\\s+codigo\\s*=\\s*'${codigo}'`,
          "i"
        );
        expect(sql).toMatch(pattern);
      });
    }
  });

  describe("PARTE B — ALTER TABLE adicionando 5 colunas de governança", () => {
    const sql = readFileSync(MIGRATION_PATH, "utf8");
    const colunas = [
      "normative_bundle",
      "nature_type",
      "legal_confidence",
      "normative_status",
      "source_basis",
    ];
    for (const col of colunas) {
      it(`coluna ${col} é adicionada`, () => {
        expect(sql).toMatch(new RegExp(`ADD\\s+COLUMN\\s+\`?${col}\`?`, "i"));
      });
    }
  });

  describe("PARTE C — populate normative_bundle (4 categorias confirmed)", () => {
    const sql = readFileSync(MIGRATION_PATH, "utf8");
    const confirmadas = [
      "split_payment",
      "credito_presumido",
      "imposto_seletivo",
      "inscricao_cadastral",
    ];
    for (const codigo of confirmadas) {
      it(`${codigo} recebe normative_status='confirmed'`, () => {
        const pattern = new RegExp(
          `UPDATE\\s+risk_categories\\s+SET[\\s\\S]*?normative_status\\s*=\\s*'confirmed'[\\s\\S]*?WHERE\\s+codigo\\s*=\\s*'${codigo}'`,
          "i"
        );
        expect(sql).toMatch(pattern);
      });
    }
  });

  it("down file existe e contém DROP COLUMNS + reversão de artigo_base", () => {
    const down = readFileSync(DOWN_PATH, "utf8");
    expect(down).toMatch(/DROP\s+COLUMN\s+`?normative_bundle`?/i);
    expect(down).toMatch(/DROP\s+COLUMN\s+`?source_basis`?/i);
    // Reversão de artigo_base — restaura valores antigos
    expect(down).toMatch(/UPDATE\s+risk_categories[\s\S]*?'Art\.\s*9\s+LC\s+214\/2025'[\s\S]*?'split_payment'/i);
  });

  it("schema.ts declara as 5 novas colunas em riskCategories", () => {
    const schema = readFileSync(SCHEMA_PATH, "utf8");
    expect(schema).toMatch(/normativeBundle:\s*json\("normative_bundle"\)/);
    expect(schema).toMatch(/natureType:\s*varchar\("nature_type"/);
    expect(schema).toMatch(/legalConfidence:\s*varchar\("legal_confidence"/);
    expect(schema).toMatch(
      /normativeStatus:\s*varchar\("normative_status"[\s\S]*?\.default\("pending_document"\)/
    );
    expect(schema).toMatch(/sourceBasis:\s*json\("source_basis"\)/);
  });

  it("REGRA-ORQ-FILENAME-01: filename não contém substring 'rag'", () => {
    const filename = path.basename(MIGRATION_PATH);
    expect(filename.toLowerCase()).not.toContain("rag");
  });
});
