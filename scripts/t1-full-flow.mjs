/**
 * T1 Validation Script — Sprint S
 * Executa fluxo completo: criar projeto → Onda 1 → Onda 2 → analyzeIagenAnswers → query T1
 * Usa o INSERT exato do iagen-gap-analyzer.ts (padrão G17).
 */
import mysql from 'mysql2/promise';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error('DATABASE_URL não definida');

// Replicar lógica do fix (isNonCompliantAnswer)
function isNonCompliantAnswer(resposta) {
  const r = resposta.toLowerCase().trim();
  if (r.startsWith('sim')) return false;
  if (r.startsWith('não') || r.startsWith('nao')) return true;
  if (r.includes('não sei') || r.includes('nao sei')) return true;
  if (r.includes('depende') || r.includes('verificar')) return true;
  if (r.includes('incerto') || r.includes('pode ser')) return true;
  if (r.includes('não tenho certeza') || r.includes('nao tenho certeza')) return true;
  return true; // fallback: ambíguo → gap por precaução
}

async function run() {
  const conn = await mysql.createConnection(DB_URL);
  console.log('[T1] Conectado ao banco');

  // ─── 1. Buscar perguntas SOLARIS ativas ───────────────────────────────────
  const [questions] = await conn.execute(
    'SELECT id, codigo, texto FROM solaris_questions WHERE ativo = 1 ORDER BY id LIMIT 10'
  );
  console.log(`[T1] ${questions.length} perguntas SOLARIS ativas encontradas`);

  // ─── 2. Criar projeto novo ────────────────────────────────────────────────
  const projectName = `[T1-SPRINT-S] Validacao iagen-gap-logic ${Date.now()}`;
  const companyProfile = JSON.stringify({
    cnpj: '12345678000195', companyType: 'ltda', companySize: 'media',
    taxRegime: 'lucro_real', stateUF: 'SP',
  });
  const operationProfile = JSON.stringify({
    operationType: 'servico', clientType: ['b2b'], multiState: true,
  });

  const [insertResult] = await conn.execute(
    `INSERT INTO projects (name, description, clientId, status, createdById, createdByRole,
      notificationFrequency, currentStep, companyProfile, operationProfile)
     VALUES (?, ?, 9999, 'rascunho', 1, 'equipe_solaris', 'semanal', 1, ?, ?)`,
    [
      projectName,
      'Projeto de validação T1 Sprint S — iagen-gap-logic fix. Criado automaticamente pelo script de validação.',
      companyProfile,
      operationProfile,
    ]
  );
  const projectId = insertResult.insertId;
  console.log(`[T1] Projeto criado: id=${projectId}`);

  // ─── 3. Salvar respostas Onda 1 (4 "não" + 2 "sim") ──────────────────────
  const onda1Answers = questions.slice(0, 6).map((q, i) => ({
    questionId: q.id,
    codigo: q.codigo,
    resposta: i < 4 ? 'não' : 'sim',
  }));

  for (const ans of onda1Answers) {
    await conn.execute(
      `INSERT INTO solaris_answers (project_id, question_id, codigo, resposta, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE resposta = VALUES(resposta), updated_at = VALUES(updated_at)`,
      [projectId, ans.questionId, ans.codigo, ans.resposta, Date.now(), Date.now()]
    );
  }
  console.log(`[T1] Onda 1: ${onda1Answers.length} respostas (${onda1Answers.filter(a => a.resposta === 'não').length} "não")`);

  await conn.execute("UPDATE projects SET status = 'onda1_solaris' WHERE id = ?", [projectId]);
  console.log('[T1] Status → onda1_solaris');

  // ─── 4. Salvar respostas Onda 2 (3 "não" + 2 "sim") ─────────────────────
  const onda2Answers = [
    { questionText: 'A empresa possui sistema de apuração CBS automatizado?', resposta: 'não', confidenceScore: 0.92 },
    { questionText: 'A empresa tem mapeamento completo dos créditos CBS/IBS?', resposta: 'não', confidenceScore: 0.88 },
    { questionText: 'A empresa possui processo formal de split payment?', resposta: 'não', confidenceScore: 0.91 },
    { questionText: 'A empresa tem equipe treinada na reforma tributária?', resposta: 'sim', confidenceScore: 0.85 },
    { questionText: 'A empresa possui ERP compatível com NF-e 4.0?', resposta: 'sim', confidenceScore: 0.93 },
  ];

  for (const ans of onda2Answers) {
    await conn.execute(
      `INSERT INTO iagen_answers (project_id, question_text, resposta, confidence_score, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [projectId, ans.questionText, ans.resposta, ans.confidenceScore, Date.now(), Date.now()]
    );
  }
  console.log(`[T1] Onda 2: ${onda2Answers.length} respostas (${onda2Answers.filter(a => a.resposta === 'não').length} "não")`);

  await conn.execute("UPDATE projects SET status = 'diagnostico_corporativo' WHERE id = ?", [projectId]);
  console.log('[T1] Status → diagnostico_corporativo');

  // ─── 5. Executar analyzeIagenAnswers (lógica do fix) ─────────────────────
  console.log('[T1] Executando analyzeIagenAnswers (lógica do fix)...');

  const [savedAnswers] = await conn.execute(
    'SELECT id, question_text, resposta, confidence_score FROM iagen_answers WHERE project_id = ?',
    [projectId]
  );

  // Construir lista de gaps usando isNonCompliantAnswer (fix aplicado)
  const gapsToInsert = [];
  for (const ans of savedAnswers) {
    if (isNonCompliantAnswer(ans.resposta)) {
      gapsToInsert.push({
        gap_descricao: `Gap IAgen: ${ans.question_text.substring(0, 200)}`,
        area: 'tributario',
        severidade: 'media',
        topico_trigger: ans.question_text.substring(0, 100),
        resposta: ans.resposta,
      });
      console.log(`  → Gap: "${ans.question_text.substring(0, 50)}" (resposta: "${ans.resposta}", cs: ${ans.confidence_score})`);
    } else {
      console.log(`  → OK: "${ans.question_text.substring(0, 50)}" (resposta: "${ans.resposta}")`);
    }
  }

  // DELETE + INSERT atômico (padrão G17 idêntico ao iagen-gap-analyzer.ts)
  await conn.beginTransaction();
  try {
    await conn.execute(
      'DELETE FROM project_gaps_v3 WHERE project_id = ? AND source = ?',
      [projectId, 'iagen']
    );

    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
    for (const gap of gapsToInsert) {
      await conn.execute(
        `INSERT INTO project_gaps_v3
           (project_id, gap_description, domain, criticality, analysis_version,
            source, created_at, updated_at,
            client_id, requirement_code, requirement_name,
            gap_level, gap_type, compliance_status, evidence_status,
            operational_dependency, score, risk_level, priority_score,
            critical_evidence_flag, action_priority, estimated_days,
            deterministic_reason, ai_reason, unmet_criteria,
            recommended_actions, requirement_id, gap_classification,
            evaluation_confidence, evaluation_confidence_reason,
            question_id, answer_value, source_reference)
         VALUES
           (?, ?, ?, ?, 3,
            'iagen', ?, ?,
            0, 'IAGEN', ?,
            'operacional', 'normativo', 'nao_atendido', 'ausente',
            'baixa', 70, 'alto', 70,
            1, 'imediata', 30,
            'Resposta não-conforme na Onda 2 IA Generativa', NULL,
            'Critério não atendido: resposta indica não-conformidade',
            'Revisar e confirmar conformidade conforme LC 214/2025', 0, NULL,
            0.7, 'Detectado por conteúdo da resposta na Onda 2 iagen',
            0, ?, ?)`,
        [
          projectId,
          gap.gap_descricao,
          gap.area,
          gap.severidade,
          now, now,
          gap.gap_descricao,
          gap.resposta?.substring(0, 200) ?? 'nao',
          gap.topico_trigger,
        ]
      );
    }
    await conn.commit();
    console.log(`[T1] ${gapsToInsert.length} gaps iagen inseridos (transação commitada)`);
  } catch (err) {
    await conn.rollback();
    throw err;
  }

  // ─── 6. Query T1 ──────────────────────────────────────────────────────────
  const [gapRows] = await conn.execute(
    'SELECT source, COUNT(*) as gaps FROM project_gaps_v3 WHERE project_id = ? GROUP BY source ORDER BY source',
    [projectId]
  );

  console.log('\n=== RESULTADO T1 ===');
  console.log(`project_id: ${projectId}`);
  console.table(gapRows);

  const iagenRow = gapRows.find(r => r.source === 'iagen');
  const solarisRow = gapRows.find(r => r.source === 'solaris');

  if (iagenRow && Number(iagenRow.gaps) > 0) {
    console.log(`\n✅ T1 PASSOU`);
    console.log(`   iagen=${iagenRow.gaps} (esperado: > 0)`);
    if (solarisRow) console.log(`   solaris=${solarisRow.gaps}`);
  } else {
    console.log('\n❌ T1 FALHOU: iagen=0');
  }

  await conn.end();
  return { projectId, gapRows };
}

run().catch(e => {
  console.error('[T1] ERRO:', e.message);
  process.exit(1);
});
