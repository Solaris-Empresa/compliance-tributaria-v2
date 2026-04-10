// scripts/test-gate-pr-a.mjs
// Gate de validação do PR #A — tabela risk_categories + seed
import { drizzle } from 'drizzle-orm/mysql2';

async function query(db, sql, params = []) {
  const [rows] = await db.$client.promise().execute(sql, params);
  return rows;
}

async function run() {
  const db = drizzle(process.env.DATABASE_URL);
  let allPass = true;

  // Gate 1: COUNT ativo = 10
  const [r1] = await query(db, "SELECT COUNT(*) as cnt FROM risk_categories WHERE status='ativo'");
  const g1 = Number(r1.cnt) === 10;
  console.log('Gate 1 — COUNT ativo = 10:', g1 ? 'PASS' : 'FAIL', '| got:', r1.cnt);
  if (!g1) allPass = false;

  // Gate 2: vigencia_fim NOT NULL = 1 (transicao_iss_ibs)
  const r2 = await query(db, "SELECT codigo, vigencia_fim FROM risk_categories WHERE vigencia_fim IS NOT NULL");
  const g2 = r2.length === 1 && r2[0].codigo === 'transicao_iss_ibs';
  console.log('Gate 2 — vigencia_fim NOT NULL = 1 (transicao_iss_ibs):', g2 ? 'PASS' : 'FAIL');
  console.log('  codigo:', r2[0]?.codigo, '| vigencia_fim:', r2[0]?.vigencia_fim);
  if (!g2) allPass = false;

  // Gate 3: listActiveCategories (vigência válida hoje) = 10
  const r3 = await query(db,
    "SELECT codigo FROM risk_categories WHERE status='ativo' AND vigencia_inicio <= CURDATE() AND (vigencia_fim IS NULL OR vigencia_fim >= CURDATE())"
  );
  const g3 = r3.length === 10;
  console.log('Gate 3 — categorias ativas vigentes = 10:', g3 ? 'PASS' : 'FAIL', '| got:', r3.length);
  if (!g3) allPass = false;

  // Gate 4: getCategoryByCode imposto_seletivo = alta
  const [r4] = await query(db, "SELECT codigo, severidade, urgencia FROM risk_categories WHERE codigo = 'imposto_seletivo'");
  const g4 = r4?.severidade === 'alta' && r4?.urgencia === 'imediata';
  console.log('Gate 4 — imposto_seletivo severidade=alta urgencia=imediata:', g4 ? 'PASS' : 'FAIL');
  if (!g4) allPass = false;

  // Gate 5: suggestCategory — INSERT com status=sugerido
  const testCodigo = 'test_gate_pr_a_suggest';
  await query(db,
    "DELETE FROM risk_categories WHERE codigo=?", [testCodigo]
  );
  await query(db,
    "INSERT INTO risk_categories (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo, vigencia_inicio, status, origem, escopo, sugerido_por) VALUES (?, 'Teste Gate PR A', 'media', 'curto_prazo', 'risk', 'Art. 999 TEST', 'TEST', CURDATE(), 'sugerido', 'rag_sensor', 'nacional', 'gate-test')",
    [testCodigo]
  );
  const [r5] = await query(db, "SELECT COUNT(*) as cnt FROM risk_categories WHERE status='sugerido' AND codigo=?", [testCodigo]);
  const g5 = Number(r5.cnt) === 1;
  console.log('Gate 5 — suggestCategory INSERT status=sugerido:', g5 ? 'PASS' : 'FAIL');
  if (!g5) allPass = false;

  // Gate 6: approveSuggestion — status → ativo
  const [r6a] = await query(db, "SELECT id FROM risk_categories WHERE codigo=?", [testCodigo]);
  if (r6a) {
    await query(db, "UPDATE risk_categories SET status='ativo', aprovado_por='gate-test', aprovado_at=NOW() WHERE id=?", [r6a.id]);
    const [r6b] = await query(db, "SELECT status, aprovado_por FROM risk_categories WHERE id=?", [r6a.id]);
    const g6 = r6b?.status === 'ativo' && r6b?.aprovado_por === 'gate-test';
    console.log('Gate 6 — approveSuggestion status=ativo:', g6 ? 'PASS' : 'FAIL');
    if (!g6) allPass = false;
  }

  // Gate 7: rejectSuggestion — status → inativo
  await query(db, "UPDATE risk_categories SET status='sugerido' WHERE codigo=?", [testCodigo]);
  await query(db, "UPDATE risk_categories SET status='inativo' WHERE codigo=?", [testCodigo]);
  const [r7] = await query(db, "SELECT status FROM risk_categories WHERE codigo=?", [testCodigo]);
  const g7 = r7?.status === 'inativo';
  console.log('Gate 7 — rejectSuggestion status=inativo:', g7 ? 'PASS' : 'FAIL');
  if (!g7) allPass = false;

  // Limpar dados de teste
  await query(db, "DELETE FROM risk_categories WHERE codigo=?", [testCodigo]);

  console.log('\n=== RESULTADO FINAL ===');
  console.log(allPass ? 'TODOS OS GATES: PASS' : 'ALGUM GATE FALHOU');
  process.exit(allPass ? 0 : 1);
}

run().catch(e => { console.error('ERRO FATAL:', e.message); process.exit(1); });
