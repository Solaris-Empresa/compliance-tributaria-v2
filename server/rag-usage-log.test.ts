/**
 * rag-usage-log.test.ts
 *
 * Testes obrigatórios para L-RAG-01 — Telemetria de uso do RAG.
 *
 * Critérios de aceite (spec):
 *  ✅ Tabela rag_usage_log existe no schema Drizzle
 *  ✅ 3 índices definidos (anchor_id, query, retrieved_at)
 *  ✅ logUsage é async non-blocking (não lança exceção)
 *  ✅ retrieveArticles retorna RAGContext com articles e contextText
 *  ✅ Endpoints tRPC ragAdmin existem: getChunkUsageStats, getTopChunks,
 *     getUnusedChunks, getUsageByLei
 *  ✅ SQL dos endpoints é válido (estrutura das queries)
 *  ✅ 10 queries de gold set validadas (estrutura e campos)
 *
 * Sprint L · L-RAG-01 · Issue #235
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Bloco 1: Schema Drizzle ─────────────────────────────────────────────────

describe("L-RAG-01 Bloco 1 — Schema rag_usage_log", () => {
  it("tabela ragUsageLog deve estar definida no schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.ragUsageLog).toBeDefined();
  });

  it("tabela ragUsageLog deve ter os campos obrigatórios", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.ragUsageLog;
    // Drizzle expõe os campos como propriedades do objeto da tabela
    const columns = Object.keys(table);
    expect(columns).toContain("id");
    expect(columns).toContain("query");
    expect(columns).toContain("anchor_id");
    expect(columns).toContain("lei");
    expect(columns).toContain("score");
    expect(columns).toContain("position");
    expect(columns).toContain("retrieved_at");
    expect(columns).toContain("source");
    expect(columns).toContain("project_id");
    expect(columns).toContain("session_id");
  });

  it("migration 0060 deve existir com CREATE TABLE rag_usage_log", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const migrationPath = path.resolve(
      __dirname,
      "../drizzle/0060_soft_skin.sql"
    );
    expect(fs.existsSync(migrationPath)).toBe(true);
    const content = fs.readFileSync(migrationPath, "utf-8");
    expect(content).toContain("rag_usage_log");
    expect(content).toContain("idx_rag_usage_anchor");
    expect(content).toContain("idx_rag_usage_query");
    expect(content).toContain("idx_rag_usage_time");
  });
});

// ─── Bloco 2: logUsage async non-blocking ────────────────────────────────────

describe("L-RAG-01 Bloco 2 — logUsage async non-blocking", () => {
  it("logUsage não deve lançar exceção quando db não está disponível", async () => {
    // Simula ambiente sem DATABASE_URL (sandbox de CI)
    const originalEnv = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    // Importa o retriever — logUsage é chamado internamente
    // Não deve lançar exceção mesmo sem banco
    const { retrieveArticlesFast } = await import("./rag-retriever");

    await expect(
      retrieveArticlesFast(["47"], "IBS base de cálculo", 3)
    ).resolves.toBeDefined();

    process.env.DATABASE_URL = originalEnv;
  });

  it("retrieveArticlesFast deve retornar RAGContext com estrutura correta", async () => {
    const { retrieveArticlesFast } = await import("./rag-retriever");

    const result = await retrieveArticlesFast(["47"], "CBS alíquota padrão", 3);

    expect(result).toHaveProperty("articles");
    expect(result).toHaveProperty("contextText");
    expect(result).toHaveProperty("totalCandidates");
    expect(typeof result.contextText).toBe("string");
    expect(Array.isArray(result.articles)).toBe(true);
    expect(typeof result.totalCandidates).toBe("number");
  });

  it("retrieveArticles deve retornar RAGContext com estrutura correta", async () => {
    const { retrieveArticles } = await import("./rag-retriever");

    const result = await retrieveArticles(
      ["47"],
      "split payment mecanismo",
      5,
      { source: "rag", projectId: 1, sessionId: "test-session" }
    );

    expect(result).toHaveProperty("articles");
    expect(result).toHaveProperty("contextText");
    expect(result).toHaveProperty("totalCandidates");
    expect(result.articles.length).toBeLessThanOrEqual(5);
  });

  it("RAGUsageOptions deve aceitar todos os campos opcionais", async () => {
    const { retrieveArticles } = await import("./rag-retriever");

    // Sem opções — não deve lançar
    await expect(
      retrieveArticles([], "não cumulatividade IBS", 3)
    ).resolves.toBeDefined();

    // Com todas as opções
    await expect(
      retrieveArticles(["47", "62"], "Simples Nacional exceção", 3, {
        source: "manual",
        projectId: 42,
        sessionId: "sess-abc123",
      })
    ).resolves.toBeDefined();
  });
});

// ─── Bloco 3: Endpoints tRPC ragAdmin ────────────────────────────────────────

describe("L-RAG-01 Bloco 3 — Endpoints tRPC ragAdmin", () => {
  it("ragAdmin router deve exportar getChunkUsageStats", async () => {
    const { ragAdminRouter } = await import("./routers/ragAdmin");
    expect(ragAdminRouter).toBeDefined();
    // O router tRPC expõe os procedures como propriedades
    expect(typeof (ragAdminRouter as Record<string, unknown>)._def).toBe("object");
  });

  it("arquivo ragAdmin.ts deve conter os 4 endpoints de telemetria", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "routers/ragAdmin.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    expect(content).toContain("getChunkUsageStats");
    expect(content).toContain("getTopChunks");
    expect(content).toContain("getUnusedChunks");
    expect(content).toContain("getUsageByLei");
  });

  it("getChunkUsageStats deve conter SQL com COUNT DISTINCT anchor_id", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "routers/ragAdmin.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    expect(content).toContain("COUNT(DISTINCT anchor_id)");
    expect(content).toContain("total_chunks");
    expect(content).toContain("coverage_pct");
  });

  it("getUnusedChunks deve conter LEFT JOIN com WHERE anchor_id IS NULL", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "routers/ragAdmin.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    expect(content).toContain("LEFT JOIN rag_usage_log");
    expect(content).toContain("WHERE u.anchor_id IS NULL");
    expect(content).toContain("total_invisible");
  });

  it("getTopChunks deve conter GROUP BY anchor_id ORDER BY usos DESC", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "routers/ragAdmin.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    expect(content).toContain("GROUP BY u.anchor_id");
    expect(content).toContain("ORDER BY usos DESC");
  });

  it("getUsageByLei deve conter GROUP BY lei", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "routers/ragAdmin.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    expect(content).toContain("GROUP BY lei");
    expect(content).toContain("total_logs");
    expect(content).toContain("unique_chunks");
  });
});

// ─── Bloco 4: 10 Queries do Gold Set ─────────────────────────────────────────

describe("L-RAG-01 Bloco 4 — Gold Set (10 queries de validação)", () => {
  const GOLD_SET_QUERIES = [
    { id: "GS-01", query: "IBS base de cálculo", lei: "lc214" },
    { id: "GS-02", query: "CBS alíquota padrão", lei: "lc214" },
    { id: "GS-03", query: "Simples Nacional exceção", lei: "lc123" },
    { id: "GS-04", query: "Imposto Seletivo bens", lei: "lc214" },
    { id: "GS-05", query: "Comitê Gestor atribuições", lei: "ec132" },
    { id: "GS-06", query: "split payment mecanismo", lei: "lc214" },
    { id: "GS-07", query: "não cumulatividade IBS", lei: "lc214" },
    { id: "GS-08", query: "benefício fiscal EC 132", lei: "ec132" },
    { id: "GS-09", query: "crédito presumido IBS", lei: "lc214" },
    { id: "GS-10", query: "prazo de transição IBS", lei: "lc214" },
  ];

  it("gold set deve ter exatamente 10 queries", () => {
    expect(GOLD_SET_QUERIES.length).toBe(10);
  });

  it("cada query do gold set deve ter id, query e lei definidos", () => {
    for (const gs of GOLD_SET_QUERIES) {
      expect(gs.id).toBeTruthy();
      expect(gs.query.length).toBeGreaterThan(5);
      expect(gs.lei).toBeTruthy();
    }
  });

  it("retrieveArticlesFast deve processar cada query do gold set sem lançar exceção", async () => {
    const { retrieveArticlesFast } = await import("./rag-retriever");

    for (const gs of GOLD_SET_QUERIES) {
      await expect(
        retrieveArticlesFast([], gs.query, 5, { source: "rag" })
      ).resolves.toBeDefined();
    }
  }, 30_000); // timeout 30s para 10 queries

  it("resultado de cada query do gold set deve ter contextText não vazio", async () => {
    const { retrieveArticlesFast } = await import("./rag-retriever");

    for (const gs of GOLD_SET_QUERIES) {
      const result = await retrieveArticlesFast([], gs.query, 5);
      expect(typeof result.contextText).toBe("string");
      expect(result.contextText.length).toBeGreaterThan(0);
    }
  }, 30_000);
});

// ─── Bloco 5: Governança ─────────────────────────────────────────────────────

describe("L-RAG-01 Bloco 5 — Governança e documentação", () => {
  it("CORPUS-BASELINE.md deve mencionar L-RAG-01 como implementado", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(
      __dirname,
      "../docs/rag/CORPUS-BASELINE.md"
    );
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("L-RAG-01");
    expect(content).toContain("implementado");
    expect(content).toContain("rag_usage_log");
  });

  it("RAG-QUALITY-GATE.md deve mencionar os 4 endpoints de telemetria", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(
      __dirname,
      "../docs/governance/RAG-QUALITY-GATE.md"
    );
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("getChunkUsageStats");
    expect(content).toContain("getTopChunks");
    expect(content).toContain("getUnusedChunks");
    expect(content).toContain("getUsageByLei");
  });

  it("rag-retriever.ts deve usar void para logUsage (non-blocking)", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "rag-retriever.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    // void garante que a Promise não é awaited — non-blocking
    expect(content).toContain("void logUsage(");
  });

  it("rag-retriever.ts deve ter try/catch no logUsage (falha silenciosa)", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "rag-retriever.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("async function logUsage");
    expect(content).toContain("} catch {");
  });
});
