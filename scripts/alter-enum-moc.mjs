import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const sql = `ALTER TABLE ragDocuments MODIFY COLUMN lei ENUM('lc214','lc227','lc224','lc123','ec132','lc116','lc87','conv_icms','cg_ibs','rfb_cbs','resolucao_cgibs_1','resolucao_cgibs_2','resolucao_cgibs_3','decreto12955','resolucao_cgibs_6','portaria_mf_cgibs_7','resolucao_cgibs_4','resolucao_cgibs_5','nt_2025_002','nt_008_2026','resolucao_cgsn_140','moc_cte_v4','moc_mdfe_v3') NOT NULL`;
  
  console.log('[ALTER TABLE] Adding moc_cte_v4, moc_mdfe_v3 to enum lei...');
  await conn.execute(sql);
  console.log('[ALTER TABLE] ✅ Done.');
  
  const [rows] = await conn.execute("SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='ragDocuments' AND COLUMN_NAME='lei'");
  console.log('New ENUM:', rows[0].COLUMN_TYPE);
  
  await conn.end();
  process.exit(0);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
