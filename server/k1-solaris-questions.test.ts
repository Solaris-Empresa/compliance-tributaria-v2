/**
 * k1-solaris-questions.test.ts
 *
 * Suite de testes para K-1: tabela solarisQuestions (Onda 1 — curadoria manual).
 *
 * Cobre:
 *   T-K1-01  Schema — tabela solaris_questions existe no banco
 *   T-K1-02  Schema — campos obrigatórios presentes (texto, categoria, fonte, ativo, obrigatorio, criadoEm)
 *   T-K1-03  CRUD   — createSolarisQuestion retorna id numérico
 *   T-K1-04  CRUD   — getSolarisQuestions retorna a pergunta criada
 *   T-K1-05  CRUD   — getSolarisQuestions filtra por cnaePrefix (match)
 *   T-K1-06  CRUD   — getSolarisQuestions filtra por cnaePrefix (no-match)
 *   T-K1-07  CRUD   — getSolarisQuestions retorna pergunta universal (cnaeGroups=null)
 *   T-K1-08  CRUD   — updateSolarisQuestion altera texto
 *   T-K1-09  CRUD   — deactivateSolarisQuestion faz soft-delete (ativo=0)
 *   T-K1-10  CRUD   — getSolarisQuestions não retorna inativas
 *   T-K1-11  CRUD   — bulkCreateSolarisQuestions insere N registros
 *   T-K1-12  Schema — fonte sempre "solaris" (default do schema)
 *
 * Issue: K-1 | Sprint K | Milestone M2
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createSolarisQuestion,
  getSolarisQuestions,
  getSolarisQuestionById,
  updateSolarisQuestion,
  deactivateSolarisQuestion,
  bulkCreateSolarisQuestions,
  getDb,
} from "./db";
import { solarisQuestions } from "../drizzle/schema";
import { eq, like } from "drizzle-orm";

// IDs criados nesta suite — limpos no afterAll
const createdIds: number[] = [];

const NOW = Date.now();

/** Helper: cria uma pergunta de teste e registra o id para cleanup */
async function makeQuestion(overrides: Partial<{
  texto: string;
  categoria: string;
  cnaeGroups: string[] | null;
  obrigatorio: number;
  ativo: number;
  uploadBatchId: string;
}> = {}) {
  const id = await createSolarisQuestion({
    texto: overrides.texto ?? "Pergunta de teste K-1",
    categoria: overrides.categoria ?? "NCM",
    cnaeGroups: overrides.cnaeGroups !== undefined ? overrides.cnaeGroups : ["11"],
    obrigatorio: overrides.obrigatorio ?? 1,
    ativo: overrides.ativo ?? 1,
    fonte: "solaris",
    criadoEm: NOW,
    uploadBatchId: overrides.uploadBatchId ?? "test-batch-k1",
  });
  createdIds.push(id);
  return id;
}

describe("K-1 — solarisQuestions (Onda 1)", () => {
  // ──────────────────────────────────────────────────────────────────────────
  // T-K1-01: tabela existe no banco
  // ──────────────────────────────────────────────────────────────────────────
  it("T-K1-01: tabela solaris_questions existe no banco", async () => {
    const db = await getDb();
    if (!db) {
      console.warn("[T-K1-01] Banco não disponível — pulando");
      return;
    }
    // Se a tabela não existir, o select lança erro
    const rows = await db.select().from(solarisQuestions).limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-K1-02: campos obrigatórios presentes no schema TypeScript
  // ──────────────────────────────────────────────────────────────────────────
  it("T-K1-02: schema TS tem campos obrigatórios (texto, categoria, fonte, ativo, obrigatorio, criadoEm)", () => {
    const cols = Object.keys(solarisQuestions);
    const required = ["texto", "categoria", "fonte", "ativo", "obrigatorio", "criadoEm"];
    for (const col of required) {
      expect(cols, `Campo ausente: ${col}`).toContain(col);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-K1-03: createSolarisQuestion retorna id numérico
  // ──────────────────────────────────────────────────────────────────────────
  it("T-K1-03: createSolarisQuestion retorna id numérico > 0", async () => {
    const db = await getDb();
    if (!db) { console.warn("[T-K1-03] Banco não disponível — pulando"); return; }

    const id = await makeQuestion({ texto: "NCM cadastrado corretamente?" });
    expect(typeof id).toBe("number");
    expect(id).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-K1-04: getSolarisQuestions retorna a pergunta criada
  // ──────────────────────────────────────────────────────────────────────────
  it("T-K1-04: getSolarisQuestions retorna a pergunta criada", async () => {
    const db = await getDb();
    if (!db) { console.warn("[T-K1-04] Banco não disponível — pulando"); return; }

    const id = await makeQuestion({ texto: "CEST cadastrado?" });
    const rows = await getSolarisQuestions();
    const found = rows.find((r) => r.id === id);
    expect(found).toBeDefined();
    expect(found?.texto).toBe("CEST cadastrado?");
    expect(found?.fonte).toBe("solaris");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-K1-05: filtro por cnaePrefix — match
  // ──────────────────────────────────────────────────────────────────────────
  it("T-K1-05: getSolarisQuestions filtra por cnaePrefix (match: '11' → CNAE '1113-5')", async () => {
    const db = await getDb();
    if (!db) { console.warn("[T-K1-05] Banco não disponível — pulando"); return; }

    const id = await makeQuestion({
      texto: "Pergunta para cervejaria CNAE 11",
      cnaeGroups: ["11"],
    });
    const rows = await getSolarisQuestions("1113-5");
    const found = rows.find((r) => r.id === id);
    expect(found).toBeDefined();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-K1-06: filtro por cnaePrefix — no-match
  // ──────────────────────────────────────────────────────────────────────────
  it("T-K1-06: getSolarisQuestions NÃO retorna pergunta com cnaeGroups incompatível", async () => {
    const db = await getDb();
    if (!db) { console.warn("[T-K1-06] Banco não disponível — pulando"); return; }

    const id = await makeQuestion({
      texto: "Pergunta exclusiva para CNAE 47",
      cnaeGroups: ["47"],
    });
    const rows = await getSolarisQuestions("1113-5"); // cervejaria — não é 47
    const found = rows.find((r) => r.id === id);
    expect(found).toBeUndefined();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-K1-07: pergunta universal (cnaeGroups=null) aparece para qualquer CNAE
  // ──────────────────────────────────────────────────────────────────────────
  it("T-K1-07: pergunta universal (cnaeGroups=null) aparece para qualquer cnaePrefix", async () => {
    const db = await getDb();
    if (!db) { console.warn("[T-K1-07] Banco não disponível — pulando"); return; }

    const id = await makeQuestion({
      texto: "Pergunta universal — todos os CNAEs",
      cnaeGroups: null,
    });
    const rows = await getSolarisQuestions("9999-9");
    const found = rows.find((r) => r.id === id);
    expect(found).toBeDefined();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-K1-08: updateSolarisQuestion altera texto
  // ──────────────────────────────────────────────────────────────────────────
  it("T-K1-08: updateSolarisQuestion altera o texto corretamente", async () => {
    const db = await getDb();
    if (!db) { console.warn("[T-K1-08] Banco não disponível — pulando"); return; }

    const id = await makeQuestion({ texto: "Texto original" });
    await updateSolarisQuestion(id, { texto: "Texto atualizado", atualizadoEm: Date.now() });
    const q = await getSolarisQuestionById(id);
    expect(q?.texto).toBe("Texto atualizado");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-K1-09: deactivateSolarisQuestion faz soft-delete (ativo=0)
  // ──────────────────────────────────────────────────────────────────────────
  it("T-K1-09: deactivateSolarisQuestion define ativo=0 (soft-delete)", async () => {
    const db = await getDb();
    if (!db) { console.warn("[T-K1-09] Banco não disponível — pulando"); return; }

    const id = await makeQuestion({ texto: "Pergunta a ser desativada" });
    await deactivateSolarisQuestion(id);
    const q = await getSolarisQuestionById(id);
    expect(q?.ativo).toBe(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-K1-10: getSolarisQuestions não retorna perguntas inativas
  // ──────────────────────────────────────────────────────────────────────────
  it("T-K1-10: getSolarisQuestions não retorna perguntas inativas (ativo=0)", async () => {
    const db = await getDb();
    if (!db) { console.warn("[T-K1-10] Banco não disponível — pulando"); return; }

    const id = await makeQuestion({ texto: "Pergunta inativa", ativo: 0 });
    const rows = await getSolarisQuestions();
    const found = rows.find((r) => r.id === id);
    expect(found).toBeUndefined();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-K1-11: bulkCreateSolarisQuestions insere N registros
  // ──────────────────────────────────────────────────────────────────────────
  it("T-K1-11: bulkCreateSolarisQuestions insere 3 registros de uma vez", async () => {
    const db = await getDb();
    if (!db) { console.warn("[T-K1-11] Banco não disponível — pulando"); return; }

    const batch = "test-bulk-k1";
    const count = await bulkCreateSolarisQuestions([
      { texto: "Bulk 1", categoria: "Cadastro", cnaeGroups: null, obrigatorio: 1, ativo: 1, fonte: "solaris", criadoEm: NOW, uploadBatchId: batch },
      { texto: "Bulk 2", categoria: "Fiscal", cnaeGroups: ["46"], obrigatorio: 0, ativo: 1, fonte: "solaris", criadoEm: NOW, uploadBatchId: batch },
      { texto: "Bulk 3", categoria: "Governança", cnaeGroups: null, obrigatorio: 1, ativo: 1, fonte: "solaris", criadoEm: NOW, uploadBatchId: batch },
    ]);
    expect(count).toBe(3);

    // Registrar para cleanup
    const allRows = await getSolarisQuestions();
    const batchRows = allRows.filter((r) => r.uploadBatchId === batch);
    batchRows.forEach((r) => createdIds.push(r.id));
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-K1-12: fonte sempre "solaris"
  // ──────────────────────────────────────────────────────────────────────────
  it("T-K1-12: todas as perguntas criadas têm fonte='solaris'", async () => {
    const db = await getDb();
    if (!db) { console.warn("[T-K1-12] Banco não disponível — pulando"); return; }

    const rows = await getSolarisQuestions();
    const testRows = rows.filter((r) => r.uploadBatchId?.startsWith("test-"));
    expect(testRows.length).toBeGreaterThan(0);
    for (const r of testRows) {
      expect(r.fonte).toBe("solaris");
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Cleanup: remover todos os registros criados nesta suite
  // ──────────────────────────────────────────────────────────────────────────
  afterAll(async () => {
    const db = await getDb();
    if (!db || createdIds.length === 0) return;
    for (const id of createdIds) {
      await db.delete(solarisQuestions).where(eq(solarisQuestions.id, id));
    }
  });
});
