/**
 * G17 — Analisador de gaps da Onda 1 SOLARIS
 * Módulo puro — sem side effects de router tRPC
 * Usado por: server/routers-fluxo-v3.ts (fire-and-forget) e scripts/g17-backfill.ts
 *
 * Padrão de detecção negativa (D2 — conservador):
 *   resposta.trim().toLowerCase().startsWith('não') || === 'nao'
 *   "Não aplicável", "Não sei" → NÃO disparam gap
 *
 * Idempotência: DELETE source='solaris' antes de INSERT (D4).
 * Compatibilidade V1: projeto sem solaris_answers → retorna { inserted: 0 }.
 * Driver único: mysql2 pool raw (Opção A) — sem mistura Drizzle + raw.
 */

import mysql from 'mysql2/promise';
import { SOLARIS_GAPS_MAP } from '../config/solaris-gaps-map';

export async function analyzeSolarisAnswers(
  projectId: number
): Promise<{ inserted: number }> {
  console.log('[G17] analyzeSolarisAnswers iniciado — projectId:', projectId);

  const pool = mysql.createPool(process.env.DATABASE_URL ?? '');
  const conn = await pool.getConnection();

  try {
    // 1. Buscar respostas da Onda 1 com dados da pergunta (topicos, codigo)
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT sa.resposta, sq.topicos, sq.codigo
       FROM solaris_answers sa
       LEFT JOIN solaris_questions sq ON sq.id = sa.question_id
       WHERE sa.project_id = ? AND sq.ativo = 1`,
      [projectId]
    );

    if (!rows || rows.length === 0) {
      console.warn('[G17] Projeto sem solaris_answers (V1 legado ou vazio) — degradando graciosamente');
      return { inserted: 0 };
    }

    // 2. Mapear respostas negativas → gaps via SOLARIS_GAPS_MAP
    const gapsToInsert: Array<{
      gap_descricao: string;
      area: string;
      severidade: string;
      topico_trigger: string;
    }> = [];

    for (const row of rows) {
      const resposta = (row.resposta as string)?.trim().toLowerCase() ?? '';
      // D2: detecção conservadora — apenas "não" exato ou startsWith('não')
      const isNegative = resposta.startsWith('não') || resposta === 'nao';
      if (!isNegative) continue;

      // D6: normalizar tópicos com trim + toLowerCase
      const topicos = (row.topicos as string | null)
        ?.split(/[;,]/)
        .map((t: string) => t.trim().toLowerCase())
        .filter(Boolean) ?? [];

      for (const topico of topicos) {
        const gaps = SOLARIS_GAPS_MAP[topico];
        if (!gaps) {
          console.warn(`[G17] Tópico sem mapeamento: "${topico}" (${row.codigo})`);
          continue;
        }
        gapsToInsert.push(...gaps);
      }
    }

    console.log('[G17] gaps calculados:', gapsToInsert.length);

    if (gapsToInsert.length === 0) {
      console.warn('[G17] Nenhum gap gerado — verificar respostas e SOLARIS_GAPS_MAP');
      return { inserted: 0 };
    }

    // 3. DELETE + INSERT em transação atômica (Opção A — raw MySQL)
    await conn.beginTransaction();

    try {
      // Idempotência: deletar gaps SOLARIS anteriores para este projeto
      const [delResult] = await conn.execute(
        'DELETE FROM project_gaps_v3 WHERE project_id = ? AND source = ?',
        [projectId, 'solaris']
      ) as any;
      console.log('[G17] DELETE gaps SOLARIS anteriores:', delResult.affectedRows);

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
              'solaris', ?, ?,
              0, 'SOLARIS', ?,
              'operacional', 'normativo', 'nao_atendido', 'ausente',
              'baixa', 80, 'alto', 80,
              1, 'imediata', 30,
              'Resposta negativa na Onda 1 SOLARIS', NULL,
              'Critério não atendido: resposta negativa na Onda 1 SOLARIS',
              'Implementar controle conforme LC 214/2025', 0, NULL,
              0.9, 'Detectado por resposta negativa SOLARIS',
              0, 'não', ?)`,
          [
            projectId,
            gap.gap_descricao,
            gap.area,
            gap.severidade,
            now, now,
            gap.gap_descricao,
            gap.topico_trigger,
          ]
        );
      }

      // Confirmar no banco — não confiar só em gapsToInsert.length
      const [countResult] = await conn.execute(
        'SELECT COUNT(*) as total FROM project_gaps_v3 WHERE project_id = ? AND source = ?',
        [projectId, 'solaris']
      ) as any;
      const insertedConfirmado: number = countResult[0]?.total ?? 0;

      await conn.commit();
      console.log('[G17] inserted confirmado no banco:', insertedConfirmado);
      return { inserted: insertedConfirmado };

    } catch (err) {
      await conn.rollback();
      console.error('[G17] ROLLBACK — projectId:', projectId);
      console.error('[G17] Erro completo:', JSON.stringify(err, null, 2));
      throw err;
    }

  } finally {
    conn.release();
    await pool.end();
  }
}
