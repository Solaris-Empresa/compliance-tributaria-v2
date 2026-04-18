/**
 * populate-1200001.mjs — Popular projeto 1200001 para Bateria 2 Z-20
 *
 * Fluxo:
 *   1. generateRisksFromGaps (gaps sintéticos baseados no CNAE 4639-7/01)
 *   2. bulkApprove (5 riscos) via tRPC → popula audit_log
 *   3. bulkGenerateActionPlans via tRPC → gera planos + tarefas
 *   4. approveActionPlan (3 planos) via tRPC → popula audit_log
 *   5. Validação final via SQL
 */
import mysql from "mysql2/promise";

const PROJECT_ID = 1200001;
const APP_URL = "http://localhost:3000";
const E2E_SECRET = process.env.E2E_TEST_SECRET;

// Gaps sintéticos baseados no CNAE 4639-7/01 (comércio atacadista)
// Cobrindo as 10 categorias oficiais para garantir cobertura máxima
const SYNTHETIC_GAPS = [
  { ruleId: "LC214-ART11-SPLIT", categoria: "split_payment", artigo: "Art. 11 LC 214/2025", fonte: "cnae", gapClassification: "obrigatorio", requirementId: "REQ-SPLIT-01", sourceReference: "LC 214/2025 Art. 11", domain: "tributario" },
  { ruleId: "LC214-ART18-IBS", categoria: "inscricao_cadastral", artigo: "Art. 18 LC 214/2025", fonte: "cnae", gapClassification: "obrigatorio", requirementId: "REQ-CAD-01", sourceReference: "LC 214/2025 Art. 18", domain: "tributario" },
  { ruleId: "LC214-ART24-ALIQ", categoria: "aliquota_reduzida", artigo: "Art. 24 LC 214/2025", fonte: "cnae", gapClassification: "oportunidade", requirementId: "REQ-ALIQ-01", sourceReference: "LC 214/2025 Art. 24", domain: "tributario" },
  { ruleId: "LC214-ART32-ISS", categoria: "transicao_iss_ibs", artigo: "Art. 32 LC 214/2025", fonte: "cnae", gapClassification: "obrigatorio", requirementId: "REQ-ISS-01", sourceReference: "LC 214/2025 Art. 32", domain: "tributario" },
  { ruleId: "LC214-ART45-IS", categoria: "imposto_seletivo", artigo: "Art. 45 LC 214/2025", fonte: "cnae", gapClassification: "obrigatorio", requirementId: "REQ-IS-01", sourceReference: "LC 214/2025 Art. 45", domain: "tributario" },
  { ruleId: "LC214-ART56-CONF", categoria: "confissao_automatica", artigo: "Art. 56 LC 214/2025", fonte: "ncm", gapClassification: "obrigatorio", requirementId: "REQ-CONF-01", sourceReference: "LC 214/2025 Art. 56", domain: "tributario" },
  { ruleId: "LC214-ART67-OBR", categoria: "obrigacao_acessoria", artigo: "Art. 67 LC 214/2025", fonte: "ncm", gapClassification: "obrigatorio", requirementId: "REQ-OBR-01", sourceReference: "LC 214/2025 Art. 67", domain: "tributario" },
  { ruleId: "LC214-ART78-REG", categoria: "regime_diferenciado", artigo: "Art. 78 LC 214/2025", fonte: "ncm", gapClassification: "oportunidade", requirementId: "REQ-REG-01", sourceReference: "LC 214/2025 Art. 78", domain: "tributario" },
  { ruleId: "LC214-ART89-CRED", categoria: "credito_presumido", artigo: "Art. 89 LC 214/2025", fonte: "solaris", gapClassification: "oportunidade", requirementId: "REQ-CRED-01", sourceReference: "LC 214/2025 Art. 89", domain: "tributario" },
  { ruleId: "LC214-ART95-ZERO", categoria: "aliquota_zero", artigo: "Art. 95 LC 214/2025", fonte: "solaris", gapClassification: "oportunidade", requirementId: "REQ-ZERO-01", sourceReference: "LC 214/2025 Art. 95", domain: "tributario" },
];

async function trpcPost(path, body, sessionCookie) {
  const resp = await fetch(`${APP_URL}/api/trpc/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": sessionCookie,
    },
    body: JSON.stringify({ json: body }),
  });
  const text = await resp.text();
  try {
    const json = JSON.parse(text);
    if (json.error) throw new Error(json.error.json?.message || JSON.stringify(json.error));
    return json.result?.data?.json ?? json.result?.data;
  } catch (e) {
    if (e.message.includes("json.error")) throw e;
    throw new Error(`Parse error: ${text.slice(0, 200)}`);
  }
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    // === LOGIN ===
    console.log("=== PASSO 1: Login via auth.testLogin ===");
    const loginResp = await fetch(`${APP_URL}/api/trpc/auth.testLogin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: { testSecret: E2E_SECRET } }),
    });
    const setCookie = loginResp.headers.get("set-cookie") || "";
    const sessionMatch = setCookie.match(/app_session_id=([^;]+)/);
    if (!sessionMatch) throw new Error("Login falhou — cookie não obtido. set-cookie: " + setCookie.slice(0, 100));
    const SESSION = `app_session_id=${sessionMatch[1]}`;
    console.log("Login OK — sessão obtida\n");

    // === PASSO 2: generateRisksFromGaps ===
    console.log("=== PASSO 2: generateRisksFromGaps (10 gaps sintéticos) ===");
    const genResult = await trpcPost("risksV4.generateRisksFromGaps", {
      projectId: PROJECT_ID,
      mappedRules: SYNTHETIC_GAPS,
    }, SESSION);
    console.log(`Riscos gerados: ${genResult?.summary?.total ?? JSON.stringify(genResult)}`);

    // === PASSO 3: Verificar riscos gerados ===
    console.log("\n=== PASSO 3: Verificar riscos gerados ===");
    const [risks] = await conn.execute(
      "SELECT id, categoria, severidade, status FROM risks_v4 WHERE project_id = ? AND status = 'active' ORDER BY id",
      [PROJECT_ID]
    );
    console.log(`risks_v4 ativos: ${risks.length}`);
    risks.forEach(r => console.log(`  id=${r.id} cat=${r.categoria} sev=${r.severidade}`));

    if (risks.length === 0) throw new Error("Nenhum risco gerado — pipeline falhou");

    // === PASSO 4: bulkApprove (primeiros 5 riscos) via tRPC ===
    console.log("\n=== PASSO 4: bulkApprove (5 riscos) via tRPC ===");
    const riskIds = risks.slice(0, 5).map(r => r.id);
    const approveResult = await trpcPost("risksV4.bulkApprove", {
      projectId: PROJECT_ID,
      riskIds: riskIds,
    }, SESSION);
    console.log(`bulkApprove resultado: ${JSON.stringify(approveResult).slice(0, 200)}`);

    // Confirmar audit_log
    const [auditAfterApprove] = await conn.execute(
      "SELECT COUNT(*) as total FROM audit_log WHERE project_id = ? AND action = 'approved'",
      [PROJECT_ID]
    );
    console.log(`audit_log (approved): ${auditAfterApprove[0].total}`);

    // === PASSO 5: bulkGenerateActionPlans ===
    console.log("\n=== PASSO 5: bulkGenerateActionPlans ===");
    const plansResult = await trpcPost("risksV4.bulkGenerateActionPlans", {
      projectId: PROJECT_ID,
    }, SESSION);
    console.log(`Planos gerados: ${JSON.stringify(plansResult).slice(0, 200)}`);

    // === PASSO 6: Aprovar 3 planos ===
    console.log("\n=== PASSO 6: approveActionPlan (3 planos) ===");
    const [plans] = await conn.execute(
      "SELECT id FROM action_plans WHERE project_id = ? LIMIT 3",
      [PROJECT_ID]
    );
    for (const plan of plans) {
      try {
        await trpcPost("risksV4.approveActionPlan", { planId: plan.id }, SESSION);
        console.log(`  Plano ${plan.id} aprovado`);
      } catch (e) {
        console.log(`  Plano ${plan.id} erro: ${e.message.slice(0, 80)}`);
      }
    }

    // === PASSO 7: Validação final ===
    console.log("\n=== PASSO 7: Validação final ===");
    const [finalRisks] = await conn.execute(
      "SELECT COUNT(*) as total, SUM(approved_at IS NOT NULL) as aprovados FROM risks_v4 WHERE project_id = ?",
      [PROJECT_ID]
    );
    const [finalPlans] = await conn.execute(
      "SELECT COUNT(*) as total FROM action_plans WHERE project_id = ?",
      [PROJECT_ID]
    );
    const [finalTasks] = await conn.execute(
      `SELECT COUNT(*) as total, MIN(cnt) as min_por_plano, MAX(cnt) as max_por_plano
       FROM (
         SELECT ap.id, COUNT(t.id) as cnt
         FROM action_plans ap
         LEFT JOIN tasks t ON t.action_plan_id = ap.id
         WHERE ap.project_id = ?
         GROUP BY ap.id
       ) sub`,
      [PROJECT_ID]
    );
    const [finalAudit] = await conn.execute(
      "SELECT COUNT(*) as total FROM audit_log WHERE project_id = ?",
      [PROJECT_ID]
    );

    console.log(`\n=== RELATÓRIO FINAL ===`);
    console.log(`risks_v4: ${finalRisks[0].total} registros · ${finalRisks[0].aprovados} aprovados`);
    console.log(`action_plans: ${finalPlans[0].total} registros`);
    console.log(`tasks: ${finalTasks[0].total} total · min=${finalTasks[0].min_por_plano}/max=${finalTasks[0].max_por_plano} por plano`);
    console.log(`audit_log: ${finalAudit[0].total} registros`);
    const prontoB2 = finalRisks[0].aprovados >= 3 && finalPlans[0].total >= 3 && finalTasks[0].total >= 2 && finalAudit[0].total > 0;
    console.log(`\nPronto para B2 fixme: ${prontoB2 ? 'SIM ✅' : 'NÃO ❌'}`);

  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
