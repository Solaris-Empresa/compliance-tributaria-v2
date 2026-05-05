import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  console.log("=== questionnaireAnswersV3 for 3750060 ===");
  const [answers] = await conn.execute(
    `SELECT question_source, COUNT(*) AS total, 
     SUM(resposta = 'nao') AS resp_nao, 
     SUM(resposta = 'sim') AS resp_sim, 
     SUM(resposta = 'parcial') AS resp_parcial
     FROM questionnaireAnswersV3 WHERE project_id = 3750060 GROUP BY question_source`
  );
  console.table(answers);

  console.log("\n=== Solaris answer values for 3750060 ===");
  const [solarisVals] = await conn.execute(
    `SELECT resposta, COUNT(*) AS cnt FROM solaris_answers WHERE project_id = 3750060 GROUP BY resposta`
  );
  console.table(solarisVals);

  console.log("\n=== IAGEN answer values for 3750060 ===");
  const [iagenVals] = await conn.execute(
    `SELECT resposta, COUNT(*) AS cnt FROM iagen_answers WHERE project_id = 3750060 GROUP BY resposta`
  );
  console.table(iagenVals);

  // Check if analyzeGaps was called - look at gaps with source='v1'
  console.log("\n=== Gaps v1 detail (first 5) ===");
  const [v1gaps] = await conn.execute(
    `SELECT id, requirement_id, gap_classification, compliance_status, risk_category_code, source_reference 
     FROM project_gaps_v3 
     WHERE project_id = 3750060 AND source = 'v1' AND analysis_version = 3
     LIMIT 5`
  );
  console.table(v1gaps);

  // Check total v1 gaps and their compliance_status distribution
  console.log("\n=== Gaps v1 compliance_status distribution ===");
  const [v1status] = await conn.execute(
    `SELECT compliance_status, COUNT(*) AS cnt 
     FROM project_gaps_v3 
     WHERE project_id = 3750060 AND source = 'v1' AND analysis_version = 3
     GROUP BY compliance_status`
  );
  console.table(v1status);

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
