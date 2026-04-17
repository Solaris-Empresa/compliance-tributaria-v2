/**
 * clean-legacy-db.mjs
 * Limpa dados legado do banco preservando tabelas RAG e referência normativa.
 * Autorizado pelo P.O. Uires Tapajós em 16/04/2026.
 *
 * PRESERVAR (RAG + referência normativa):
 *   ragDocuments, regulatory_articles, regulatory_requirements,
 *   regulatory_requirements_v3, regulatory_sources, normative_product_rules,
 *   solaris_questions, risk_categories, users
 *
 * LIMPAR (dados de projetos/testes):
 *   tasks, action_plans, risks_v4, audit_log, projects,
 *   iagen_answers, solaris_answers, questionnaire_responses,
 *   questionnaireAnswersV3, questionnaireProgressV3,
 *   project_assessments_v3, project_actions_v3, project_briefings_v3,
 *   project_gaps_v3, project_risks_v3, project_scores_v3,
 *   project_snapshots_v3, project_status_log, project_tasks_v3,
 *   sessions, compliance_sessions, complianceSessions,
 *   onboardingProgress, notifications
 */

import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Tabelas a limpar (ordem respeita FK: filhas antes de pais)
const toDelete = [
  // Sprint Z-17 — dados de tarefas/planos/riscos
  'tasks',
  'action_plans',
  'audit_log',
  'risks_v4',
  // Projetos e questionários
  'iagen_answers',
  'solaris_answers',
  'questionnaire_responses',
  'questionnaireAnswersV3',
  'questionnaireProgressV3',
  'questionnaireResponses',
  'project_assessments_v3',
  'project_actions_v3',
  'project_briefings_v3',
  'project_gaps_v3',
  'project_risks_v3',
  'project_scores_v3',
  'project_snapshots_v3',
  'project_status_log',
  'project_tasks_v3',
  'projects',
  // Sessões e notificações
  'sessions',
  'compliance_sessions',
  'complianceSessions',
  'onboardingProgress',
  'notifications',
  // Legado de outras sprints
  'cpie_analysis_history',
  'cpie_score_history',
  'cpie_settings',
  'diagnostic_shadow_divergences',
  'consistency_checks',
  'coverage_reports',
  'gap_analysis',
  'gap_audit_trail',
  'gapAnalysis',
  'gapAuditTrail',
  'risk_analysis',
  'risk_session_summary',
  'riskMatrix',
  'riskMatrixPromptHistory',
  'riskMatrixVersions',
  'sessionActionPlans',
  'sessionBranchAnswers',
  'sessionConsolidations',
  'corporateActionPlanVersions',
  'corporateActionPlans',
  'corporateAssessmentVersions',
  'corporateAssessments',
  'cosoControls',
  'milestones',
  'phases',
  'planApprovals',
  'planReviews',
  'projectBranches',
  'projectParticipants',
  'projectPermissions',
  'taskComments',
  'taskHistory',
  'taskObservers',
  'stepComments',
  'compliance_usage_logs_v3',
  'embeddingRebuildLogs',
  'req_v3_to_canonical',
  'requirement_question_mapping',
  'notificationPreferences',
  'cpie_score_history',
];

// Desabilitar FK checks para truncate
await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

let cleaned = 0;
let skipped = 0;

for (const table of toDelete) {
  try {
    const [result] = await conn.execute(`DELETE FROM \`${table}\``);
    const affected = result.affectedRows ?? 0;
    console.log(`✓ ${table}: ${affected} registros removidos`);
    cleaned++;
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      console.log(`- ${table}: tabela não existe (skip)`);
      skipped++;
    } else {
      console.error(`✗ ${table}: ERRO — ${e.message}`);
    }
  }
}

await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
await conn.end();

console.log(`\n=== Limpeza concluída: ${cleaned} tabelas limpas, ${skipped} não encontradas ===`);
