/**
 * ADR-0018 — Validação E2E com LLM Real
 * BUG-BRIEFING-01: cnaeAnswers (IS + alíquota zero) devem aparecer no briefing gerado
 *
 * Estratégia: banco de produção real + LLM real (sem mocks)
 * Objetivo: confirmar que o briefing gerado menciona IS, Art. 2, alíquota zero e Art. 14
 *
 * Pré-condições injetadas:
 *   - diagnosticStatus: { corporate: "completed", operational: "completed", cnae: "completed" }
 *   - solarisCount >= 1 (1 resposta inserida diretamente via mysql2)
 *   - cnaeAnswers com IS=sim e aliquota_zero=sim
 *   - status: "onda1_solaris" (bypassa gate de solarisCount)
 *
 * Cleanup: DELETE do projeto e dados relacionados no afterAll
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mysql from "mysql2/promise";
import { fluxoV3Router } from "../routers-fluxo-v3";

let conn: mysql.Connection;
let testProjectId: number;
let testUserId: number;
let testClientId: number;

// Contexto de usuário equipe_solaris para o caller
function makeCtx(userId: number) {
  return {
    user: { id: userId, role: "equipe_solaris" as const, name: "ADR-0018 Validação", email: "adr0018@test.com" },
  } as any;
}

beforeAll(async () => {
  conn = await mysql.createConnection(process.env.DATABASE_URL!);

  // 1. Criar usuário equipe_solaris (criador do projeto)
  const openId = `adr0018-user-${Date.now()}`;
  await conn.execute(
    `INSERT INTO users (openId, name, email, role) VALUES (?, ?, ?, ?)`,
    [openId, "ADR-0018 Validação", `${openId}@test.com`, "equipe_solaris"]
  );
  const [userRows] = await conn.execute(`SELECT id FROM users WHERE openId = ?`, [openId]) as any;
  testUserId = userRows[0].id;

  // 2. Criar usuário cliente (clientId NOT NULL)
  const clientOpenId = `adr0018-client-${Date.now()}`;
  await conn.execute(
    `INSERT INTO users (openId, name, email, role) VALUES (?, ?, ?, ?)`,
    [clientOpenId, "Cliente ADR-0018", `${clientOpenId}@test.com`, "cliente"]
  );
  const [clientRows] = await conn.execute(`SELECT id FROM users WHERE openId = ?`, [clientOpenId]) as any;
  testClientId = clientRows[0].id;

  // 3. Criar projeto com cnaeAnswers IS=sim + aliquota_zero=sim
  //    diagnosticStatus completo + status onda1_solaris (bypassa gate solaris)
  const cnaeAnswers = JSON.stringify({
    sections: [
      {
        id: "IS",
        resposta: "sim",
        descricao: "Bebidas açucaradas sujeitas ao Imposto Seletivo — Art. 2 LC 214/2025",
        ncmCodes: ["2202.10.00"],
      },
      {
        id: "aliquota_zero",
        resposta: "sim",
        descricao: "Arroz com alíquota zero — Art. 14 LC 214/2025",
        ncmCodes: ["1006.40.00"],
      },
    ],
  });

  const diagnosticStatus = JSON.stringify({
    corporate: "completed",
    operational: "completed",
    cnae: "completed",
  });

  const confirmedCnaes = JSON.stringify([
    { code: "4635-4/02", description: "Comércio atacadista de cerveja, chope e refrigerante", confidence: 98 },
  ]);

  const [projResult] = await conn.execute(
    `INSERT INTO projects
       (name, description, clientId, createdById, createdByRole,
        status, currentStep, taxRegime, companySize, businessType,
        cnaeAnswers, diagnosticStatus, confirmedCnaes,
        notificationFrequency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "[ADR-0018-TEST] Validação IS + Alíquota Zero",
      "Distribuidora de bebidas e alimentos. Comercializa refrigerantes (NCM 2202.10.00) sujeitos ao Imposto Seletivo e arroz (NCM 1006.40.00) com alíquota zero. Regime Lucro Real. Operações em SP, RJ e MG.",
      testClientId,
      testUserId,
      "equipe_solaris",
      "onda1_solaris",   // bypassa gate de solarisCount
      6,                 // currentStep 6 = pós-diagnóstico
      "lucro_real",
      "media",
      "comercio",
      cnaeAnswers,
      diagnosticStatus,
      confirmedCnaes,
      "semanal",
    ]
  ) as any;
  testProjectId = projResult.insertId;

  // 4. Inserir 1 resposta SOLARIS (bypassa FK com SET FOREIGN_KEY_CHECKS=0)
  const now = Date.now();
  await conn.execute(`SET FOREIGN_KEY_CHECKS=0`);
  await conn.execute(
    `INSERT INTO solaris_answers (project_id, question_id, codigo, resposta, fonte, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [testProjectId, 1, "SOL-001", "Sim, a empresa distribui bebidas açucaradas sujeitas ao IS e arroz com alíquota zero.", "solaris", now, now]
  );
  await conn.execute(`SET FOREIGN_KEY_CHECKS=1`);
}, 30000);

afterAll(async () => {
  if (!conn) return;
  try {
    await conn.execute(`SET FOREIGN_KEY_CHECKS=0`);
    await conn.execute(`DELETE FROM solaris_answers WHERE project_id = ?`, [testProjectId]);
    await conn.execute(`DELETE FROM projects WHERE id = ?`, [testProjectId]);
    await conn.execute(`DELETE FROM users WHERE id IN (?, ?)`, [testUserId, testClientId]);
    await conn.execute(`SET FOREIGN_KEY_CHECKS=1`);
  } catch (e) {
    console.error("[afterAll] Cleanup error:", e);
  }
  await conn.end();
}, 30000);

describe("ADR-0018 — Validação E2E com LLM Real", () => {
  it("ADR0018-E2E-01: briefing menciona Imposto Seletivo, Art. 2, alíquota zero e Art. 14", async () => {
    const caller = fluxoV3Router.createCaller(makeCtx(testUserId));

    const result = await caller.generateBriefingFromDiagnostic({
      projectId: testProjectId,
    });

    // Capturar o texto completo do resultado para análise
    const resultText = JSON.stringify(result, null, 2);

    console.log("\n=== BRIEFING COMPLETO (ADR-0018 E2E) ===");
    console.log(resultText);
    console.log("=== FIM DO BRIEFING ===\n");

    // Extrair o conteúdo markdown se disponível
    const briefingContent = (result as any)?.briefingContent
      ?? (result as any)?.content
      ?? (result as any)?.markdown
      ?? resultText;

    console.log("\n=== BRIEFING CONTENT (markdown) ===");
    console.log(briefingContent);
    console.log("=== FIM DO CONTENT ===\n");

    // Verificações dos 4 checks obrigatórios
    const fullText = `${resultText} ${briefingContent}`;

    const hasIS = fullText.includes("Imposto Seletivo");
    const hasArt2 = fullText.includes("Art. 2") || fullText.includes("Art.2") || fullText.includes("artigo 2");
    const hasAliquotaZero = fullText.includes("alíquota zero") || fullText.includes("aliquota zero");
    const hasArt14 = fullText.includes("Art. 14") || fullText.includes("Art.14") || fullText.includes("artigo 14");

    console.log("\n=== CHECKS ADR-0018 ===");
    console.log(`[1] Imposto Seletivo: ${hasIS ? "✅ Y" : "❌ N"}`);
    console.log(`[2] Art. 2:           ${hasArt2 ? "✅ Y" : "❌ N"}`);
    console.log(`[3] alíquota zero:    ${hasAliquotaZero ? "✅ Y" : "❌ N"}`);
    console.log(`[4] Art. 14:          ${hasArt14 ? "✅ Y" : "❌ N"}`);

    if (hasIS) {
      const idx = fullText.indexOf("Imposto Seletivo");
      console.log(`\nTrecho IS: ...${fullText.slice(Math.max(0, idx - 50), idx + 100)}...`);
    }
    if (hasArt2) {
      const term = fullText.includes("Art. 2") ? "Art. 2" : "Art.2";
      const idx = fullText.indexOf(term);
      console.log(`\nTrecho Art.2: ...${fullText.slice(Math.max(0, idx - 50), idx + 100)}...`);
    }
    if (hasAliquotaZero) {
      const term = fullText.includes("alíquota zero") ? "alíquota zero" : "aliquota zero";
      const idx = fullText.indexOf(term);
      console.log(`\nTrecho alíquota zero: ...${fullText.slice(Math.max(0, idx - 50), idx + 100)}...`);
    }
    if (hasArt14) {
      const term = fullText.includes("Art. 14") ? "Art. 14" : "Art.14";
      const idx = fullText.indexOf(term);
      console.log(`\nTrecho Art.14: ...${fullText.slice(Math.max(0, idx - 50), idx + 100)}...`);
    }

    expect(hasIS, "Briefing deve mencionar 'Imposto Seletivo'").toBe(true);
    expect(hasArt2, "Briefing deve mencionar 'Art. 2' (IS)").toBe(true);
    expect(hasAliquotaZero, "Briefing deve mencionar 'alíquota zero'").toBe(true);
    expect(hasArt14, "Briefing deve mencionar 'Art. 14' (alíquota zero)").toBe(true);
  }, 300000); // 5 minutos para o LLM real
});
