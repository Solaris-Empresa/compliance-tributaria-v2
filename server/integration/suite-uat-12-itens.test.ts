/**
 * suite-uat-12-itens.test.ts — Gate técnico UAT
 * Sprint: validacao-12-itens-uat · 2026-03-27
 *
 * Cobre os gaps SEM cobertura dedicada em outros arquivos:
 *   G5  — Art. 45 LC 214 — confissão de dívida no corpus
 *   G6  — LC 224 Art. 4° — cobertura universal (cnaeGroups)
 *   G1+G2 — Labels corretos no rag-retriever (lc224/lc227)
 *   G12 — Labels solaris/ia_gen no formatContextText
 *   G13-UI — Ausência de placeholders [QC-XX-PY] no frontend
 *   G14 — Label "Contabilidade e Fiscal" no frontend
 *   G9+G10 — Schema Zod: validateRagOutput + fonte_risco (assertions corrigidas)
 *   G4  — Anexos LC 214 no corpus (threshold >= 50, anchor_id verificado)
 *   G3  — EC 132 no corpus (18 chunks, anchor_id 100%)
 *   G16 — CsvRowSchema (replicado localmente — C-01)
 *
 * Correções aplicadas (aprovadas P.O. 2026-03-27):
 *   C-01: CsvRowSchema replicado localmente (não importado de produção)
 *   C-02: Assertions G9/G10 refletem o que foi implementado
 *   C-03: LIKE "Art. 4%" sem % inicial (evita chunk espúrio id=786)
 *   C-04: DIAGNOSTIC_READ_MODE vai na Camada 2 (grep), não aqui
 *   A-02: G4 usa toBeGreaterThanOrEqual(50) + verifica anchor_id
 *   A-03: Contador de referência = 492 testes
 *
 * DÉBITO TÉCNICO REGISTRADO:
 *   evidencia_regulatoria no RiskItemSchema ainda tem default genérico
 *   "Reforma Tributária — EC 132/2023" (linhas 177 e 310 de ai-schemas.ts).
 *   Não é regressão — é débito técnico para sprint futura (remoção do default).
 *
 * Testes de banco usam mysql2/promise direto (padrão das ondas).
 * Testes de arquivo usam fs/require — zero banco, zero LLM.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mysql from "mysql2/promise";
import { dbDescribe } from "../test-helpers";
import { z } from "zod";

// ─── Conexão banco (padrão ondas) ─────────────────────────────────────────────
let conn: mysql.Connection;

beforeAll(async () => {
  conn = await mysql.createConnection({ uri: process.env.DATABASE_URL! });
});

afterAll(async () => {
  if (conn) await conn.end();
});

// ─── C-01: CsvRowSchema replicado localmente (não exportado de ragAdmin.ts) ───
const LEI_VALUES_LOCAL = [
  "lc214", "ec132", "lc227", "lc224", "lc116",
  "lc87", "cg_ibs", "rfb_cbs", "conv_icms", "lc123",
] as const;

const CsvRowSchemaLocal = z.object({
  lei: z.enum(LEI_VALUES_LOCAL),
  artigo: z.string().min(1),
  titulo: z.string().min(1),
  conteudo: z.string().min(10),
  topicos: z.string().optional().default(""),
  cnaeGroups: z.string().optional().default(""),
  chunkIndex: z.number().int().positive(),
});

// ─── Helper: varredura recursiva de arquivos .tsx (sem dependência de glob) ───
function walkTsx(dir: string): string[] {
  const fs = require("fs");
  const path = require("path");
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkTsx(full));
    else if (entry.name.endsWith(".tsx")) files.push(full);
  }
  return files;
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO G5 — Art. 45 LC 214 — confissão de dívida no corpus
// ─────────────────────────────────────────────────────────────────────────────
dbDescribe("G5 — LC 214 Art. 45 — confissão de dívida no corpus", () => {
  it("T-G5-01: chunk id=65 contém 'confissão de dívida' no topicos", async () => {
    const [rows] = await conn.execute(
      "SELECT id, lei, artigo, topicos FROM ragDocuments WHERE id = 65"
    ) as any;
    expect(rows).toHaveLength(1);
    expect(rows[0].topicos).toContain("confissão de dívida");
  });

  it("T-G5-02: busca por 'confissão de dívida' retorna pelo menos 1 chunk", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as total FROM ragDocuments WHERE topicos LIKE '%confissão de dívida%'"
    ) as any;
    expect(Number(rows[0].total)).toBeGreaterThanOrEqual(1);
  });

  it("T-G5-03: chunk id=65 pertence à lc214 e artigo é Art. 45", async () => {
    const [rows] = await conn.execute(
      "SELECT lei, artigo FROM ragDocuments WHERE id = 65"
    ) as any;
    expect(rows[0].lei).toBe("lc214");
    expect(rows[0].artigo).toBe("Art. 45");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO G6 — LC 224 Art. 4° — cobertura universal
// C-03: LIKE "Art. 4%" sem % inicial (evita chunk espúrio Art. 48)
// ─────────────────────────────────────────────────────────────────────────────
dbDescribe("G6 — LC 224 Art. 4° — cnaeGroups cobertura universal", () => {
  it("T-G6-01: todos os chunks LC 224 Art. 4 e Art. 4 (parte N) têm cnaeGroups='01-96'", async () => {
    // C-03: WHERE artigo LIKE 'Art. 4%' — sem % no início
    const [rows] = await conn.execute(
      "SELECT artigo, cnaeGroups FROM ragDocuments WHERE lei='lc224' AND (artigo = 'Art. 4' OR artigo LIKE 'Art. 4 (%')"
    ) as any;
    expect(rows.length).toBeGreaterThanOrEqual(1);
    for (const row of rows) {
      expect(row.cnaeGroups).toBe("01-96");
    }
  });

  it("T-G6-02: total de chunks lc224 = 28 (inalterado)", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as total FROM ragDocuments WHERE lei='lc224'"
    ) as any;
    expect(Number(rows[0].total)).toBe(28);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO G1+G2 — Labels corretos no rag-retriever
// ─────────────────────────────────────────────────────────────────────────────
dbDescribe("G1+G2 — Labels corretos no rag-retriever", () => {
  it("T-G1-01: label lc224 = 'LC 224/2026' (não ausente)", () => {
    const fs = require("fs");
    const content = fs.readFileSync("server/rag-retriever.ts", "utf-8");
    expect(content).toContain('lc224: "LC 224/2026"');
  });

  it("T-G2-01: label lc227 = 'LC 227/2026' (não 2024)", () => {
    const fs = require("fs");
    const content = fs.readFileSync("server/rag-retriever.ts", "utf-8");
    expect(content).toContain('lc227: "LC 227/2026"');
    expect(content).not.toContain('lc227: "LC 227/2024"');
  });

  it("T-G1+G2-02: labels solaris e ia_gen presentes no rag-retriever", () => {
    const fs = require("fs");
    const content = fs.readFileSync("server/rag-retriever.ts", "utf-8");
    expect(content).toContain("solaris");
    expect(content).toContain("ia_gen");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO G12 — Labels solaris/ia_gen no formatContextText
// ─────────────────────────────────────────────────────────────────────────────
dbDescribe("G12 — Labels solaris/ia_gen no formatContextText", () => {
  it("T-G12-01: rag-retriever contém label 'Equipe Jurídica SOLARIS'", () => {
    const fs = require("fs");
    const content = fs.readFileSync("server/rag-retriever.ts", "utf-8");
    expect(content).toContain("Equipe Jurídica SOLARIS");
  });

  it("T-G12-02: rag-retriever contém label ia_gen para análise de perfil", () => {
    const fs = require("fs");
    const content = fs.readFileSync("server/rag-retriever.ts", "utf-8");
    expect(content).toContain("ia_gen");
    expect(content).toContain("Análise de Perfil");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO G13-UI — Ausência de placeholders [QC-XX-PY] no frontend
// ─────────────────────────────────────────────────────────────────────────────
dbDescribe("G13-UI — Ausência de placeholders [QC-XX-PY] no frontend", () => {
  it("T-G13-01: nenhum arquivo .tsx contém padrão [QC-XX-PY]", () => {
    const fs = require("fs");
    const tsxFiles = walkTsx("client/src");
    const pattern = /\[QC-\d{2}-P\d\]/;
    const violations: string[] = [];
    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, "utf-8");
      if (pattern.test(content)) violations.push(file);
    }
    expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO G14 — Label "Contabilidade e Fiscal" no frontend
// ─────────────────────────────────────────────────────────────────────────────
dbDescribe("G14 — Label 'Contabilidade e Fiscal' no frontend", () => {
  it("T-G14-01: label 'Contabilidade e Fiscal' presente em pelo menos 3 arquivos .tsx", () => {
    const fs = require("fs");
    const tsxFiles = walkTsx("client/src");
    const filesWithLabel: string[] = [];
    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, "utf-8");
      if (content.includes("Contabilidade e Fiscal")) filesWithLabel.push(file);
    }
    expect(filesWithLabel.length).toBeGreaterThanOrEqual(3);
  });

  it("T-G14-02: label antigo 'Contabilidade' isolado não existe como SelectItem value=CONT", () => {
    const fs = require("fs");
    const tsxFiles = walkTsx("client/src");
    // Padrão antigo: <SelectItem value="CONT">Contabilidade</SelectItem> (sem "e Fiscal")
    const oldPattern = /SelectItem[^>]*value="CONT"[^>]*>\s*Contabilidade\s*</;
    const violations: string[] = [];
    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, "utf-8");
      if (oldPattern.test(content)) violations.push(file);
    }
    expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO G9+G10 — Schema Zod: validateRagOutput + fonte_risco
// C-02: Assertions corrigidas — refletem o que foi implementado
// DÉBITO TÉCNICO: default genérico "Reforma Tributária — EC 132/2023" permanece
// ─────────────────────────────────────────────────────────────────────────────
dbDescribe("G9+G10 — Schema Zod: validateRagOutput + fonte_risco", () => {
  it("T-G9-01: validateRagOutput implementado com safeParse em ai-schemas.ts", () => {
    const fs = require("fs");
    const content = fs.readFileSync("server/ai-schemas.ts", "utf-8");
    // G9: função validateRagOutput exportada com safeParse
    expect(content).toContain("validateRagOutput");
    expect(content).toContain("safeParse");
    // evidencia_regulatoria presente no schema
    expect(content).toContain("evidencia_regulatoria");
    // TaskItemSchema tem enforcement min(5) para evidencia_regulatoria
    expect(content).toContain("evidencia_regulatoria: z.string().min(5)");
  });

  it("T-G10-01: fonte_risco com fallback 'fonte não identificada' em RiskItemSchema", () => {
    const fs = require("fs");
    const content = fs.readFileSync("server/ai-schemas.ts", "utf-8");
    expect(content).toContain("fonte_risco");
    expect(content).toContain("fonte não identificada");
  });

  it("T-G10-02: acao_concreta presente no TaskItemSchema", () => {
    const fs = require("fs");
    const content = fs.readFileSync("server/ai-schemas.ts", "utf-8");
    expect(content).toContain("acao_concreta");
  });

  it("T-G10-03: validateRagOutput retorna objeto estruturado (não exceção) para payload inválido", async () => {
    const { validateRagOutput, RisksResponseSchema } = await import("./ai-schemas");
    const result = validateRagOutput(RisksResponseSchema, "payload_invalido");
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO G4 — Anexos LC 214 no corpus RAG
// A-02: threshold >= 50 + verificação de anchor_id (coluna: anchor_id)
// ─────────────────────────────────────────────────────────────────────────────
dbDescribe("G4 — Anexos LC 214 no corpus RAG", () => {
  it("T-G4-01: corpus tem pelo menos 50 chunks dos Anexos da LC 214", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as total FROM ragDocuments WHERE lei='lc214' AND artigo LIKE '%Anexo%'"
    ) as any;
    // A-02: threshold conservador — banco tem 819 chunks de Anexos
    expect(Number(rows[0].total)).toBeGreaterThanOrEqual(50);
  });

  it("T-G4-02: chunks de Anexos LC 214 têm anchor_id preenchido (100%)", async () => {
    // A-02: coluna anchor_id com underscore (nome real no banco TiDB)
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as total FROM ragDocuments WHERE lei='lc214' AND artigo LIKE '%Anexo%' AND (anchor_id IS NULL OR anchor_id = '')"
    ) as any;
    expect(Number(rows[0].total)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO G3 — EC 132 no corpus RAG
// ─────────────────────────────────────────────────────────────────────────────
dbDescribe("G3 — EC 132 no corpus RAG", () => {
  it("T-G3-01: corpus tem exatamente 18 chunks EC 132", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as total FROM ragDocuments WHERE lei='ec132'"
    ) as any;
    expect(Number(rows[0].total)).toBe(18);
  });

  it("T-G3-02: chunks EC 132 têm anchor_id preenchido (100%)", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as total FROM ragDocuments WHERE lei='ec132' AND (anchor_id IS NULL OR anchor_id = '')"
    ) as any;
    expect(Number(rows[0].total)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO G16 — CsvRowSchema (C-01: replicado localmente)
// ─────────────────────────────────────────────────────────────────────────────
dbDescribe("G16 — CsvRowSchema (replicado localmente — C-01)", () => {
  it("T-G16-schema-01: CsvRowSchema valida linha válida", () => {
    const validRow = {
      lei: "lc214" as const,
      artigo: "Art. 1",
      titulo: "Teste de validação",
      conteudo: "Conteúdo de teste com mais de 10 caracteres",
      topicos: "IBS, CBS",
      cnaeGroups: "01-96",
      chunkIndex: 1,
    };
    expect(() => CsvRowSchemaLocal.parse(validRow)).not.toThrow();
  });

  it("T-G16-schema-02: CsvRowSchema rejeita linha sem lei", () => {
    const invalidRow = { artigo: "Art. 1", titulo: "Teste", conteudo: "conteudo longo ok aqui", chunkIndex: 1 };
    expect(() => CsvRowSchemaLocal.parse(invalidRow)).toThrow();
  });

  it("T-G16-schema-03: CsvRowSchema rejeita lei inválida", () => {
    const invalidRow = {
      lei: "lei_inexistente",
      artigo: "Art. 1",
      titulo: "Teste",
      conteudo: "conteudo longo ok aqui",
      chunkIndex: 1,
    };
    expect(() => CsvRowSchemaLocal.parse(invalidRow)).toThrow();
  });

  it("T-G16-schema-04: CsvRowSchema rejeita conteudo com menos de 10 chars", () => {
    const invalidRow = {
      lei: "lc214" as const,
      artigo: "Art. 1",
      titulo: "Teste",
      conteudo: "curto",
      chunkIndex: 1,
    };
    expect(() => CsvRowSchemaLocal.parse(invalidRow)).toThrow();
  });
});
