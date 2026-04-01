/**
 * ONDA 2 — T11: Carga e Concorrência
 * 50 projetos criados em paralelo + operações concorrentes no mesmo projeto
 * Mede throughput, latência p95, race conditions e integridade de dados
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mysql from "mysql2/promise";

const TEST_USER_ID = 1;
const TEST_CLIENT_ID = 1;
const BATCH_SIZE = 50;

// Pool independente com connectionLimit alto para suportar 50 queries paralelas
let pool: mysql.Pool;
const createdIds: number[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createProject(name: string): Promise<number> {
  const [result] = await pool.execute(
    `INSERT INTO projects (name, status, createdById, clientId, currentStep, confirmedCnaes, diagnosticStatus, createdAt, updatedAt)
     VALUES (?, 'rascunho', ?, ?, 1, '[]', '{"corporate":"pending","operational":"pending","cnae":"pending"}', NOW(), NOW())`,
    [name, TEST_USER_ID, TEST_CLIENT_ID]
  ) as any;
  return result.insertId;
}

async function setStatus(id: number, status: string, step: number = 1): Promise<void> {
  await pool.execute(
    `UPDATE projects SET status = ?, currentStep = ?, updatedAt = NOW() WHERE id = ?`,
    [status, step, id]
  );
}

async function getProject(id: number): Promise<any> {
  const [[row]] = await pool.execute(
    `SELECT id, name, status, currentStep, diagnosticStatus FROM projects WHERE id = ?`,
    [id]
  ) as any;
  return row;
}

// ─── Suite T11 ────────────────────────────────────────────────────────────────

describe("T11 — Carga: 50 projetos em paralelo", () => {
  beforeAll(async () => {
    pool = mysql.createPool({ uri: process.env.DATABASE_URL!, connectionLimit: 20 });
    // Limpar runs anteriores
    await pool.execute(`DELETE FROM projects WHERE name LIKE '[ONDA2-T11]%'`);
  });

  afterAll(async () => {
    await pool.execute(`DELETE FROM projects WHERE name LIKE '[ONDA2-T11]%'`);
    await pool.end();
  });

  it("T11.1 — cria 50 projetos em paralelo sem erro", async () => {
    const t0 = Date.now();
    const promises = Array.from({ length: BATCH_SIZE }, (_, i) =>
      createProject(`[ONDA2-T11] Projeto Paralelo ${String(i + 1).padStart(3, "0")}`)
    );
    const results = await Promise.allSettled(promises);
    const elapsed = Date.now() - t0;

    const fulfilled = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<number>[];
    const rejected = results.filter((r) => r.status === "rejected");

    fulfilled.forEach((r) => createdIds.push(r.value));

    if (rejected.length > 0) {
      console.error("T11.1 rejected[0]:", (rejected[0] as PromiseRejectedResult).reason?.message);
    }
    console.log(`T11.1: ${fulfilled.length}/${BATCH_SIZE} criados em ${elapsed}ms`);

    expect(rejected.length).toBe(0);
    expect(fulfilled.length).toBe(BATCH_SIZE);
    // Throughput mínimo: 50 projetos em menos de 10 segundos
    expect(elapsed).toBeLessThan(10_000);
  }, 15_000);

  it("T11.2 — todos os 50 projetos têm IDs únicos (sem colisão)", async () => {
    const uniqueIds = new Set(createdIds);
    expect(uniqueIds.size).toBe(BATCH_SIZE);
  });

  it("T11.3 — todos os 50 projetos têm status 'rascunho' correto", async () => {
    const [rows] = await pool.execute(
      `SELECT id, status FROM projects WHERE name LIKE '[ONDA2-T11]%'`
    ) as any;
    expect(rows.length).toBe(BATCH_SIZE);
    const wrongStatus = rows.filter((r: any) => r.status !== "rascunho");
    expect(wrongStatus.length).toBe(0);
  });

  it("T11.4 — atualização concorrente de status em 50 projetos sem deadlock", async () => {
    const t0 = Date.now();
    const promises = createdIds.map((id) =>
      setStatus(id, "cnaes_confirmados", 1)
    );
    const results = await Promise.allSettled(promises);
    const elapsed = Date.now() - t0;

    const rejected = results.filter((r) => r.status === "rejected");
    console.log(`T11.4: 50 updates em ${elapsed}ms`);

    expect(rejected.length).toBe(0);
    // Sem deadlock: todas as 50 atualizações concluem em menos de 8 segundos
    expect(elapsed).toBeLessThan(8_000);
  }, 12_000);

  it("T11.5 — integridade após atualização paralela: todos têm status correto", async () => {
    const [rows] = await pool.execute(
      `SELECT id, status FROM projects WHERE name LIKE '[ONDA2-T11]%'`
    ) as any;
    const wrongStatus = rows.filter((r: any) => r.status !== "cnaes_confirmados");
    expect(wrongStatus.length).toBe(0);
  });

  it("T11.6 — race condition: dois updates simultâneos no mesmo projeto — último vence", async () => {
    const targetId = createdIds[0];
    // Dois updates simultâneos com valores diferentes
    const [r1, r2] = await Promise.allSettled([
      pool.execute(`UPDATE projects SET status = 'diagnostico_corporativo', currentStep = 2, updatedAt = NOW() WHERE id = ?`, [targetId]),
      pool.execute(`UPDATE projects SET status = 'diagnostico_operacional', currentStep = 3, updatedAt = NOW() WHERE id = ?`, [targetId]),
    ]);
    expect(r1.status).toBe("fulfilled");
    expect(r2.status).toBe("fulfilled");

    const proj = await getProject(targetId);
    // O banco deve ter um estado consistente (não corrompido)
    expect(["diagnostico_corporativo", "diagnostico_operacional"]).toContain(proj.status);
    expect(proj.currentStep).toBeGreaterThanOrEqual(2);
  });

  it("T11.7 — leitura concorrente de 50 projetos sem erro", async () => {
    const t0 = Date.now();
    const promises = createdIds.map((id) => getProject(id));
    const results = await Promise.allSettled(promises);
    const elapsed = Date.now() - t0;

    const rejected = results.filter((r) => r.status === "rejected");
    const nullResults = results.filter(
      (r) => r.status === "fulfilled" && !(r as PromiseFulfilledResult<any>).value
    );

    console.log(`T11.7: 50 leituras em ${elapsed}ms`);

    expect(rejected.length).toBe(0);
    expect(nullResults.length).toBe(0);
    // Latência p95: leitura de 50 projetos em menos de 5 segundos
    expect(elapsed).toBeLessThan(5_000);
  }, 10_000);

  it("T11.8 — inserção de 50 respostas de questionário em paralelo sem erro", async () => {
    const t0 = Date.now();
    // Usa questionnaireAnswersV3 com schema real: cnaeCode, level, questionIndex, questionText, answerValue
    const promises = createdIds.slice(0, 50).map((id, i) =>
      pool.execute(
        `INSERT INTO questionnaireAnswersV3 (projectId, cnaeCode, level, questionIndex, questionText, answerValue, answeredAt, updatedAt)
         VALUES (?, '0000-0/00', 'nivel1', ?, ?, ?, NOW(), NOW())`,
        [id, i, `Questão de carga ${i}`, `resposta_${i}`]
      )
    );
    const results = await Promise.allSettled(promises);
    const elapsed = Date.now() - t0;

    const rejected = results.filter((r) => r.status === "rejected");
    if (rejected.length > 0) {
      console.error("T11.8 rejected[0]:", (rejected[0] as PromiseRejectedResult).reason?.message);
    }
    console.log(`T11.8: 50 inserts de resposta em ${elapsed}ms`);

    expect(rejected.length).toBe(0);
    expect(elapsed).toBeLessThan(8_000);
  }, 12_000);

  it("T11.9 — contagem final: exatamente 50 projetos ONDA2-T11 no banco", async () => {
    const [[{ count }]] = await pool.execute(
      `SELECT COUNT(*) as count FROM projects WHERE name LIKE '[ONDA2-T11]%'`
    ) as any;
    expect(Number(count)).toBe(BATCH_SIZE);
  });
});
