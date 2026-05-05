import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  console.log("=== questionnaireAnswersV3 answer distribution for 3750060 ===");
  const [answers] = await conn.execute(
    "SELECT answerValue, COUNT(*) AS cnt FROM questionnaireAnswersV3 WHERE projectId = 3750060 GROUP BY answerValue"
  );
  console.table(answers);

  console.log("\n=== questionnaireAnswersV3 total for 3750060 ===");
  const [total] = await conn.execute(
    "SELECT COUNT(*) AS total FROM questionnaireAnswersV3 WHERE projectId = 3750060"
  );
  console.table(total);

  console.log("\n=== Solaris answer values for 3750060 ===");
  const [solarisVals] = await conn.execute(
    "SELECT resposta, COUNT(*) AS cnt FROM solaris_answers WHERE project_id = 3750060 GROUP BY resposta"
  );
  console.table(solarisVals);

  console.log("\n=== IAGEN answer values for 3750060 ===");
  const [iagenVals] = await conn.execute(
    "SELECT resposta, COUNT(*) AS cnt FROM iagen_answers WHERE project_id = 3750060 GROUP BY resposta"
  );
  console.table(iagenVals);

  console.log("\n=== Gaps v1 compliance_status distribution for 3750060 ===");
  const [v1status] = await conn.execute(
    "SELECT compliance_status, COUNT(*) AS cnt FROM project_gaps_v3 WHERE project_id = 3750060 AND source = 'v1' AND analysis_version = 3 GROUP BY compliance_status"
  );
  console.table(v1status);

  console.log("\n=== Gaps v1 gap_classification distribution for 3750060 ===");
  const [v1class] = await conn.execute(
    "SELECT gap_classification, COUNT(*) AS cnt FROM project_gaps_v3 WHERE project_id = 3750060 AND source = 'v1' AND analysis_version = 3 GROUP BY gap_classification"
  );
  console.table(v1class);

  // Check how analyzeGaps uses these answers - what is the question_source column?
  console.log("\n=== questionnaireAnswersV3 sample for 3750060 (first 3) ===");
  const [sample] = await conn.execute(
    "SELECT id, cnaeCode, level, questionIndex, LEFT(answerValue, 50) AS answer_preview FROM questionnaireAnswersV3 WHERE projectId = 3750060 LIMIT 5"
  );
  console.table(sample);

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
