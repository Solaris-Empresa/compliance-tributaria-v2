/**
 * G17 — Analisador de gaps da Onda 1 SOLARIS
 * Módulo puro — sem side effects de router tRPC
 * Usado por: server/routers-fluxo-v3.ts (fire-and-forget) e scripts/g17-backfill.ts
 *
 * FIX-01 (FEAT-SOL-UX-01 follow-up, 2026-06-01): G17 agora lê `resposta_opcao`
 * (ENUM dual-column da migration 0120) como fonte canônica. Texto livre
 * permanece como fallback legado para projetos pré-PR-C (resposta_opcao=null).
 *
 * Decisão por opção (canônica — quando resposta_opcao IS NOT NULL):
 *   - sim           → sem gap
 *   - nao           → gap
 *   - nao_sei       → gap (conservador — produto jurídico)
 *   - nao_se_aplica → exclusão (distinto de "atendido", não gera gap)
 *
 * Fallback legado (resposta_opcao IS NULL — pré-PR-C):
 *   - "não se aplica", "não aplicável", "n/a", "na" → exclusão (corrige B4)
 *   - startsWith("não") || === "nao"               → gap
 *   - resto                                         → sem gap
 *
 * Idempotência: DELETE source='solaris' antes de INSERT (D4).
 * Compatibilidade V1: projeto sem solaris_answers → retorna { inserted: 0 }.
 * Driver único: mysql2 pool raw (Opção A) — sem mistura Drizzle + raw.
 */

import mysql from 'mysql2/promise';
import { SOLARIS_GAPS_MAP } from '../config/solaris-gaps-map';
// M3.10 Fix B: mapping topico → risk_category_code para evitar NULL em project_gaps_v3.
// Sem isso, gaps SOLARIS cairiam em "unmapped" no GapToRuleMapper.
// Ver post-mortem: docs/governance/post-mortems/2026-05-05-mono-fonte-matriz-riscos.md
import { mapTopicToCategory } from '../config/topico-to-categoria';

/** Valores discretos persistidos em solaris_answers.resposta_opcao (migration 0120). */
export type RespostaOpcao = "sim" | "nao" | "nao_sei" | "nao_se_aplica";

/** Classificação determinística da resposta para o pipeline de gap. */
export interface GapClassification {
  /** true → resposta gera gaps via SOLARIS_GAPS_MAP */
  isNegative: boolean;
  /** true → resposta marca exclusão explícita (não-aplicabilidade), NÃO gera gap */
  isExcluded: boolean;
}

/**
 * FIX-01 — Função pura testável (padrão `credito-presumido-eligibility.ts`).
 * Implementa a regra de classificação dual-column descrita no header do módulo.
 * Não toca DB, não faz I/O — apenas decide o destino da resposta.
 */
export function classifyForGap(
  opcao: RespostaOpcao | null,
  resposta: string,
): GapClassification {
  // Fonte canônica: resposta_opcao (radio button) quando presente
  if (opcao !== null) {
    return {
      isNegative: opcao === "nao" || opcao === "nao_sei",
      isExcluded: opcao === "nao_se_aplica",
      // opcao === "sim" → ambos false → sem gap (correto)
    };
  }
  // Fallback legado (resposta_opcao IS NULL — projetos pré-PR-C)
  const r = resposta.trim().toLowerCase();
  // Exclusão explícita ANTES do prefix-match (corrige bug B4 — "não se aplica" vinha como gap)
  if (
    r.startsWith("não se aplica") ||
    r.startsWith("não aplicável") ||
    r === "n/a" ||
    r === "na"
  ) {
    return { isNegative: false, isExcluded: true };
  }
  const isNegative = r.startsWith("não") || r === "nao";
  return { isNegative, isExcluded: false };
}

export async function analyzeSolarisAnswers(
  projectId: number
): Promise<{ inserted: number }> {
  console.log('[G17] analyzeSolarisAnswers iniciado — projectId:', projectId);

  const pool = mysql.createPool(process.env.DATABASE_URL ?? '');
  const conn = await pool.getConnection();

  try {
    // 1. Buscar respostas da Onda 1 com dados da pergunta (topicos, codigo)
    // FIX-01: incluir resposta_opcao no SELECT (coluna ENUM da migration 0120)
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT sa.resposta, sa.resposta_opcao, sq.topicos, sq.codigo
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
      // FIX-01: classificação via helper puro `classifyForGap` — dual-column com fallback legado
      const opcao = (row.resposta_opcao as RespostaOpcao | null) ?? null;
      const resposta = (row.resposta as string) ?? '';
      const { isNegative, isExcluded } = classifyForGap(opcao, resposta);
      if (isExcluded) continue;
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
        // M3.10 Fix B: derivar risk_category_code a partir do tópico.
        // Tópicos não mapeados → null (gap fica sem categoria, será tratado como
        // "unmapped" downstream). Curadoria deve expandir TOPICO_TO_CATEGORIA.
        const riskCategoryCode = mapTopicToCategory(gap.topico_trigger);

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
              question_id, answer_value, source_reference,
              risk_category_code)
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
              0, 'não', ?,
              ?)`,
          [
            projectId,
            gap.gap_descricao,
            gap.area,
            gap.severidade,
            now, now,
            gap.gap_descricao,
            gap.topico_trigger,
            riskCategoryCode, // M3.10 Fix B: pode ser null se tópico não mapeado
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
