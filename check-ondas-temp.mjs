import mysql from "mysql2/promise";
import fs from "fs";
try {
  const pool = mysql.createPool(process.env.DATABASE_URL);
  const [tables] = await pool.query("SHOW TABLES LIKE '%answer%'");
  const [proj] = await pool.query("SELECT id, corporateAnswers IS NOT NULL as hasCorp, operationProfile IS NOT NULL as hasOp, cnaeAnswers IS NOT NULL as hasCnae FROM projects WHERE id=3270001");
  const [risks] = await pool.query("SELECT COUNT(*) as cnt, fonte_risco_tipo FROM risk_matrices_v4 WHERE project_id=3270001 AND deleted_at IS NULL GROUP BY fonte_risco_tipo");
  const output = JSON.stringify({tables, proj, risks}, null, 2);
  fs.writeFileSync("/tmp/ondas-out.txt", output);
  console.log("OK");
  await pool.end();
} catch(e) {
  fs.writeFileSync("/tmp/ondas-out.txt", "ERROR: " + e.message);
  console.log("ERR:", e.message);
}
