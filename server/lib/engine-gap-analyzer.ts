/**
 * engine-gap-analyzer.ts — Decision Kernel: integração Onda 3
 *
 * Converte outputs do ncm-engine + nbs-engine em gaps em project_gaps_v3.
 * Padrão idêntico ao iagen-gap-analyzer.ts (DELETE + INSERT atômico).
 *
 * Regras obrigatórias (Orquestrador Claude — 2026-04-05, Bloco D):
 *   - source = 'engine' (nunca 'rag')
 *   - Casos pending_validation NÃO geram entrada no banco
 *   - evaluation_confidence = confianca.valor / 100
 *   - evaluation_confidence_reason = confianca.tipo
 *   - source_reference = `${fonte.lei} Art. ${fonte.artigo}`
 *   - gap_description = `${codigo}: ${regime} — ${descricao}`
 *   - Idempotência: DELETE source='engine' antes de INSERT
 *   - Fire-and-forget — não bloqueia o fluxo da Onda 3
 *
 * DECISÃO ARQUITETURAL — Bloco D (Opção A):
 *   NCM/NBS recebidos como parâmetros de entrada (não persistidos no schema de projetos).
 *   Pendência: Bloco E (PR separado) — adicionar campos ao schema de projetos
 *   com contrato CNT-01c + migration controlada + aprovação P.O.
 *
 * Fonte canônica: LC 214/2025 — https://www.planalto.gov.br/ccivil_03/leis/lcp/Lcp214compilado.htm
 */

import mysql from 'mysql2/promise';
import { lookupNcm } from './decision-kernel/engine/ncm-engine';
import { lookupNbs } from './decision-kernel/engine/nbs-engine';

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface EngineGapRow {
  codigo: string;
  sistema: 'NCM' | 'NBS';
  regime: string;
  descricao: string;
  confianca_valor: number;
  confianca_tipo: string;
  fonte_lei: string;
  fonte_artigo: string;
  gap_description: string;
  source_reference: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildGapDescription(codigo: string, regime: string, descricao: string): string {
  return `${codigo}: ${regime} — ${descricao}`.substring(0, 500);
}

function buildSourceReference(lei: string, artigo: string): string {
  return `${lei} Art. ${artigo}`.substring(0, 300);
}

// ─── Função principal ─────────────────────────────────────────────────────────

/**
 * analyzeEngineGaps — integra Decision Kernel na Onda 3.
 *
 * @param projectId  ID do projeto
 * @param ncmCodes   Códigos NCM do perfil operacional (ex: ['9619.00.00'])
 * @param nbsCodes   Códigos NBS do perfil operacional (ex: ['1.1506.21.00'])
 *
 * Comportamento por status:
 *   'confirmado'         → gera gap em project_gaps_v3
 *   'pending_validation' → NÃO grava no banco (regra obrigatória Bloco D)
 */
export async function analyzeEngineGaps(
  projectId: number,
  ncmCodes: string[],
  nbsCodes: string[],
): Promise<{ inserted: number; skipped_pending: number }> {
  const conn = await mysql.createConnection(process.env.DATABASE_URL as string);

  try {
    const gapsToInsert: EngineGapRow[] = [];
    let skippedPending = 0;

    // ── 1. Processar NCM ──────────────────────────────────────────────────
    for (const codigo of ncmCodes) {
      const result = lookupNcm({ codigo, sistema: 'NCM' });

      // pending_validation → NÃO grava (regra obrigatória)
      if (result.confianca.tipo === 'fallback' && result.nota?.includes('pendente de validação')) {
        console.log(`[ENGINE-GAP] NCM ${codigo} pending_validation — skipped (não grava no banco)`);
        skippedPending++;
        continue;
      }

      // fallback genérico (código desconhecido) → não grava gaps sem base legal sólida
      if (result.confianca.tipo === 'fallback' && !result.nota?.includes('pendente')) {
        console.log(`[ENGINE-GAP] NCM ${codigo} não encontrado no dataset M1 — skipped`);
        continue;
      }

      gapsToInsert.push({
        codigo,
        sistema: 'NCM',
        regime: result.regime,
        descricao: result.descricao,
        confianca_valor: result.confianca.valor,
        confianca_tipo: result.confianca.tipo,
        fonte_lei: result.fonte.lei,
        fonte_artigo: result.fonte.artigo,
        gap_description: buildGapDescription(codigo, result.regime, result.descricao),
        source_reference: buildSourceReference(result.fonte.lei, result.fonte.artigo),
      });
    }

    // ── 2. Processar NBS ──────────────────────────────────────────────────
    for (const codigo of nbsCodes) {
      const result = lookupNbs({ codigo, sistema: 'NBS' });

      // fallback (código desconhecido ou pending) → não grava
      if (result.confianca.tipo === 'fallback') {
        if (result.nota?.includes('pendente de validação')) {
          console.log(`[ENGINE-GAP] NBS ${codigo} pending_validation — skipped`);
          skippedPending++;
        } else {
          console.log(`[ENGINE-GAP] NBS ${codigo} não encontrado no dataset M1 — skipped`);
        }
        continue;
      }

      gapsToInsert.push({
        codigo,
        sistema: 'NBS',
        regime: result.regime,
        descricao: result.descricao,
        confianca_valor: result.confianca.valor,
        confianca_tipo: result.confianca.tipo,
        fonte_lei: result.fonte.lei,
        fonte_artigo: result.fonte.artigo,
        gap_description: buildGapDescription(codigo, result.regime, result.descricao),
        source_reference: buildSourceReference(result.fonte.lei, result.fonte.artigo),
      });
    }

    console.log('[ENGINE-GAP] gaps calculados:', gapsToInsert.length, '| pending skipped:', skippedPending);

    if (gapsToInsert.length === 0) {
      console.warn('[ENGINE-GAP] Nenhum gap gerado — todos os códigos são desconhecidos ou pending_validation');
      return { inserted: 0, skipped_pending: skippedPending };
    }

    // ── 3. DELETE + INSERT em transação atômica ───────────────────────────
    await conn.beginTransaction();
    try {
      const [delResult] = await conn.execute(
        'DELETE FROM project_gaps_v3 WHERE project_id = ? AND source = ?',
        [projectId, 'engine']
      ) as any;
      console.log('[ENGINE-GAP] DELETE gaps engine anteriores:', delResult.affectedRows);

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
              'engine', ?, ?,
              0, ?, ?,
              'operacional', 'normativo', 'nao_atendido', 'ausente',
              'baixa', 70, 'alto', 70,
              1, 'imediata', 30,
              ?, NULL,
              'Enquadramento tributário identificado pelo Decision Kernel (LC 214/2025)',
              'Revisar enquadramento conforme LC 214/2025', 0, NULL,
              ?, ?,
              0, ?, ?)`,
          [
            projectId,
            gap.gap_description,
            gap.sistema === 'NCM' ? 'fiscal_ncm' : 'fiscal_nbs',
            'alta',
            now, now,
            gap.sistema,
            `${gap.sistema} ${gap.codigo} — ${gap.regime}`,
            `Decision Kernel: ${gap.codigo} → ${gap.regime} (${gap.confianca_tipo}, confiança ${gap.confianca_valor}%)`,
            gap.confianca_valor / 100,
            gap.confianca_tipo,
            gap.codigo,
            gap.source_reference,
          ]
        );
      }

      // Confirmar no banco
      const [countResult] = await conn.execute(
        'SELECT COUNT(*) as total FROM project_gaps_v3 WHERE project_id = ? AND source = ?',
        [projectId, 'engine']
      ) as any;
      const insertedConfirmado: number = countResult[0]?.total ?? 0;
      await conn.commit();
      console.log('[ENGINE-GAP] inserted confirmado no banco:', insertedConfirmado);
      return { inserted: insertedConfirmado, skipped_pending: skippedPending };

    } catch (err) {
      await conn.rollback();
      console.error('[ENGINE-GAP] ROLLBACK — projectId:', projectId);
      throw err;
    }

  } finally {
    await conn.end();
  }
}
