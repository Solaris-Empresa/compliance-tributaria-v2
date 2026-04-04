/**
 * Q5 — Testes de regressão: solarisAdmin BUG 1 + BUG 2
 * Sprint R · PR #288 · 2026-04-01
 *
 * BUG 1 — upsert não reativava ativo=1 (fix: linha 388 solarisAdmin.ts)
 * BUG 2 — listBatches mostrava lotes deletados (fix: linha 285 solarisAdmin.ts)
 *
 * Estes testes verificam a lógica de negócio SEM banco de dados.
 * Os caminhos SQL são validados por inspeção de código (string matching).
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROUTER_PATH = path.resolve(
  __dirname,
  "../routers/solarisAdmin.ts"
);

const routerSource = fs.readFileSync(ROUTER_PATH, "utf-8");

// ── BUG 1 — upsert deve reativar ativo=1 ─────────────────────────────────────

describe("BUG 1 — upsert reativa ativo=1 em reimportação de CSV", () => {
  it("UPDATE do upsert inclui 'ativo = 1' no SET", () => {
    // Verifica que o bloco UPDATE do upsert contém ativo = 1
    // Regex: UPDATE solaris_questions SET ... ativo = 1 ... WHERE codigo = ?
    const updateBlock = routerSource.match(
      /UPDATE solaris_questions SET[\s\S]*?WHERE codigo = \?/
    );
    expect(updateBlock).not.toBeNull();
    expect(updateBlock![0]).toContain("ativo = 1");
  });

  it("INSERT do upsert também seta ativo = 1 (comportamento existente preservado)", () => {
    // Verifica que o INSERT ainda seta ativo = 1 (não foi quebrado pela correção)
    const insertBlock = routerSource.match(
      /INSERT INTO solaris_questions[\s\S]*?VALUES \([\s\S]*?\)/
    );
    expect(insertBlock).not.toBeNull();
    // O INSERT usa literal 1 para ativo na lista de VALUES
    expect(insertBlock![0]).toContain("1, 1, 'solaris'");
  });

  it("Lógica de reativação: UPDATE cobre pergunta com ativo=0 (documentado)", () => {
    // Documenta o comportamento esperado:
    // Antes do fix: UPDATE não incluía ativo → pergunta com ativo=0 permanecia 0
    // Após o fix: UPDATE inclui ativo = 1 → pergunta reativada independente do estado anterior
    const hasAtivoInUpdate = routerSource.includes(
      "ativo = 1,\n                  texto = ?"
    );
    expect(hasAtivoInUpdate).toBe(true);
  });
});

// ── BUG 2 — listBatches oculta lotes deletados ───────────────────────────────

describe("BUG 2 — listBatches oculta lotes com ativo=0", () => {
  it("Query listBatches inclui filtro 'AND ativo = 1'", () => {
    // Verifica que a query de listagem de lotes filtra apenas perguntas ativas
    const listBatchesBlock = routerSource.match(
      /SELECT upload_batch_id as batch_id[\s\S]*?GROUP BY upload_batch_id/
    );
    expect(listBatchesBlock).not.toBeNull();
    expect(listBatchesBlock![0]).toContain("AND ativo = 1");
  });

  it("deleteBatch faz soft-delete (ativo=0) nas perguntas do lote", () => {
    // Verifica que deleteBatch usa UPDATE ativo = 0 (não DELETE)
    const deleteBatchBlock = routerSource.match(
      /deleteBatch[\s\S]*?UPDATE solaris_questions SET ativo = 0[\s\S]*?WHERE upload_batch_id = \?/
    );
    expect(deleteBatchBlock).not.toBeNull();
  });

  it("Após deleteBatch, lote não aparece em listBatches (lógica documentada)", () => {
    // Documenta o comportamento esperado:
    // deleteBatch: UPDATE ativo=0 WHERE upload_batch_id = ?
    // listBatches: WHERE upload_batch_id IS NOT NULL AND ativo = 1
    // → lote deletado tem todas as perguntas com ativo=0 → COUNT(*) = 0 → não aparece no GROUP BY
    const listHasAtivoFilter = routerSource.includes("AND ativo = 1");
    const deleteSetAtivo0 = routerSource.includes(
      "UPDATE solaris_questions SET ativo = 0, atualizado_em = ? WHERE upload_batch_id = ?"
    );
    expect(listHasAtivoFilter).toBe(true);
    expect(deleteSetAtivo0).toBe(true);
  });
});
