/**
 * m3.7-solaris-lei-ref.test.ts
 * Sprint M3.7 — Item 3 — Schema solaris_questions com lei_ref + artigo_ref
 *
 * Issue: #940
 * Spec: paridade arquitetural com ragDocuments.lei (mysqlEnum estruturado).
 * Substitui inferência frágil por regex em texto livre por metadado estruturado.
 *
 * Vinculadas:
 * - PR #939 — REGRA-ORQ-29 e REGRA-ORQ-32 (governance)
 * - PR #948 — REGRA-ORQ-33 (RACI)
 * - Issue #940 (esta) — bloqueia Issue #944
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SCHEMA_SRC = readFileSync(
  path.resolve(__dirname, "..", "..", "drizzle", "schema.ts"),
  "utf-8",
);
const TRACKED_QUESTION_SRC = readFileSync(
  path.resolve(__dirname, "tracked-question.ts"),
  "utf-8",
);
const MIGRATION_SQL = readFileSync(
  path.resolve(__dirname, "..", "..", "drizzle", "0090_solaris_lei_ref_artigo_ref.sql"),
  "utf-8",
);

describe("M3.7 Item 3 — Schema solaris_questions estendido com lei_ref + artigo_ref", () => {
  it("schema declara leiRef como varchar(20) nullable", () => {
    expect(SCHEMA_SRC).toMatch(/leiRef:\s*varchar\(["']lei_ref["'],\s*\{\s*length:\s*20\s*\}\)/);
  });

  it("schema declara artigoRef como varchar(50) nullable", () => {
    expect(SCHEMA_SRC).toMatch(/artigoRef:\s*varchar\(["']artigo_ref["'],\s*\{\s*length:\s*50\s*\}\)/);
  });

  it("ambos os campos são nullable (sem .notNull())", () => {
    // Nullable = não tem .notNull() encadeado
    expect(SCHEMA_SRC).not.toMatch(/leiRef:\s*varchar\([^)]+\)\s*\.notNull/);
    expect(SCHEMA_SRC).not.toMatch(/artigoRef:\s*varchar\([^)]+\)\s*\.notNull/);
  });

  it("preserva campos existentes (mappingReviewStatus, classificationScope, riskCategoryCode)", () => {
    expect(SCHEMA_SRC).toMatch(/mappingReviewStatus:\s*mysqlEnum/);
    expect(SCHEMA_SRC).toMatch(/classificationScope:\s*mysqlEnum/);
    expect(SCHEMA_SRC).toMatch(/riskCategoryCode:\s*varchar/);
  });
});

describe("M3.7 Item 3 — Migration SQL 0090", () => {
  it("script SQL adiciona colunas lei_ref e artigo_ref via ALTER TABLE", () => {
    expect(MIGRATION_SQL).toMatch(/ALTER TABLE solaris_questions/);
    expect(MIGRATION_SQL).toMatch(/ADD COLUMN lei_ref VARCHAR\(20\)/);
    expect(MIGRATION_SQL).toMatch(/ADD COLUMN artigo_ref VARCHAR\(50\)/);
  });

  it("ambas as colunas são DEFAULT NULL (backward-compat)", () => {
    expect(MIGRATION_SQL).toMatch(/lei_ref VARCHAR\(20\)\s+DEFAULT NULL/);
    expect(MIGRATION_SQL).toMatch(/artigo_ref VARCHAR\(50\)\s+DEFAULT NULL/);
  });
});

describe("M3.7 Item 3 — extractLeiRefFromSolaris prioriza metadado estruturado", () => {
  it("usa leiRef + artigoRef quando ambos definidos", () => {
    expect(TRACKED_QUESTION_SRC).toMatch(/sq\.leiRef/);
    expect(TRACKED_QUESTION_SRC).toMatch(/sq\.artigoRef/);
  });

  it("normaliza prefixo 'lc' para 'LC ' (consistência com ragDocuments)", () => {
    expect(TRACKED_QUESTION_SRC).toMatch(/replace\(\/\^LC\/,\s*["']LC ["']\)/);
  });

  it("preserva fallback legado para topicos (perguntas pré-M3.7)", () => {
    expect(TRACKED_QUESTION_SRC).toMatch(/sq\.topicos/);
    expect(TRACKED_QUESTION_SRC).toMatch(/match\(\/LC\\s\*\\d/);
  });

  it("preserva fallback genérico final 'LC 214/2025 (genérico)'", () => {
    expect(TRACKED_QUESTION_SRC).toMatch(/LC 214\/2025 \(genérico\)/);
  });
});

describe("M3.7 Item 3 — extractLeiRefFromSolaris comportamento funcional", () => {
  // Import dinâmico após mock para evitar dependência de DB
  it("retorna 'LC 214 Art. 9' quando leiRef='lc214' e artigoRef='Art. 9'", async () => {
    const { extractLeiRefFromSolaris } = await import("./tracked-question");
    const sq = {
      leiRef: "lc214",
      artigoRef: "Art. 9",
      topicos: null,
    } as Parameters<typeof extractLeiRefFromSolaris>[0];
    expect(extractLeiRefFromSolaris(sq)).toBe("LC 214 Art. 9");
  });

  it("retorna 'LC 224' quando apenas leiRef='lc224' (sem artigoRef)", async () => {
    const { extractLeiRefFromSolaris } = await import("./tracked-question");
    const sq = {
      leiRef: "lc224",
      artigoRef: null,
      topicos: null,
    } as Parameters<typeof extractLeiRefFromSolaris>[0];
    expect(extractLeiRefFromSolaris(sq)).toBe("LC 224");
  });

  it("backward-compat: leiRef=null + topicos com regex match → fallback regex funciona", async () => {
    const { extractLeiRefFromSolaris } = await import("./tracked-question");
    const sq = {
      leiRef: null,
      artigoRef: null,
      topicos: "LC 214/2025 IBS CBS",
    } as Parameters<typeof extractLeiRefFromSolaris>[0];
    expect(extractLeiRefFromSolaris(sq)).toBe("LC 214/2025");
  });

  it("backward-compat: leiRef=null + topicos=null → fallback genérico", async () => {
    const { extractLeiRefFromSolaris } = await import("./tracked-question");
    const sq = {
      leiRef: null,
      artigoRef: null,
      topicos: null,
    } as Parameters<typeof extractLeiRefFromSolaris>[0];
    expect(extractLeiRefFromSolaris(sq)).toBe("LC 214/2025 (genérico)");
  });
});
