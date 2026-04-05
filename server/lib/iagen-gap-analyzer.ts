/**
 * iagen-gap-analyzer.ts — Sprint S Lote A
 *
 * Converte iagen_answers (Onda 2 IA Generativa) em gaps em project_gaps_v3.
 * Padrão idêntico ao solaris-gap-analyzer.ts (DELETE + INSERT atômico).
 *
 * Lógica de detecção (fix/iagen-gap-logic — Sprint S):
 *   - resposta.startsWith('não') ou 'nao' → não-conformidade → gap (padrão G17)
 *   - Padrões de incerteza ('não sei', 'depende', 'verificar') → gap de incerteza
 *   - resposta.startsWith('sim') → empresa tem controle → sem gap
 *   - confidence_score NÃO é usado para detectar gap (era o bug anterior)
 *   - Palavras-chave no question_text mapeiam para tópicos do SOLARIS_GAPS_MAP
 *   - Fallback: se nenhum tópico mapeado, usa gap genérico de risco_sistemico
 *
 * Idempotência: DELETE source='iagen' antes de INSERT (igual ao G17).
 */
import mysql from 'mysql2/promise';
import { SOLARIS_GAPS_MAP } from '../config/solaris-gaps-map';

// Mapeamento de palavras-chave do question_text → tópicos do SOLARIS_GAPS_MAP
const KEYWORD_TO_TOPIC: Record<string, string> = {
  'nf-e': 'nfe',
  'nota fiscal': 'nfe',
  'nota fiscal eletrônica': 'nfe',
  'nfe': 'nfe',
  'ibs': 'cgibs',
  'cbs': 'cgibs',
  'cgibs': 'cgibs',
  'confissão': 'confissao_automatica',
  'confissao': 'confissao_automatica',
  'inércia': 'confissao_automatica',
  'inercia': 'confissao_automatica',
  'crédito': 'cgibs',
  'credito': 'cgibs',
  'benefício fiscal': 'risco_sistemico',
  'beneficio fiscal': 'risco_sistemico',
  'guerra fiscal': 'risco_sistemico',
  'interestadual': 'risco_sistemico',
  'lucro real': 'parametrizacao',
  'lucro presumido': 'parametrizacao',
  'simples nacional': 'parametrizacao',
  'regime tributário': 'parametrizacao',
  'regime tributario': 'parametrizacao',
  'erp': 'erp',
  'sistema': 'erp',
  'parametrização': 'parametrizacao',
  'parametrizacao': 'parametrizacao',
  'alíquota': 'cgibs',
  'aliquota': 'cgibs',
  'transição': 'risco_sistemico',
  'transicao': 'risco_sistemico',
  'reforma tributária': 'risco_sistemico',
  'reforma tributaria': 'risco_sistemico',
};

/**
 * Extrai tópicos do SOLARIS_GAPS_MAP a partir do texto da pergunta.
 * Retorna array de tópicos únicos encontrados.
 */
function extractTopicsFromQuestion(questionText: string): string[] {
  const lower = questionText.toLowerCase();
  const found = new Set<string>();
  for (const [keyword, topic] of Object.entries(KEYWORD_TO_TOPIC)) {
    if (lower.includes(keyword) && SOLARIS_GAPS_MAP[topic]) {
      found.add(topic);
    }
  }
  return Array.from(found);
}

/**
 * Determina se uma resposta iagen indica não-conformidade (gap de compliance).
 *
 * Padrão G17 (solaris-gap-analyzer): usa conteúdo da resposta, NÃO confidence_score.
 * confidence_score mede a certeza do LLM na interpretação — não o status de compliance.
 *
 * Regras:
 *   1. 'não' / 'nao' → empresa não tem o controle → gap real
 *   2. Padrões de incerteza → empresa não sabe → gap de incerteza
 *   3. 'sim' → empresa tem o controle → sem gap
 *   4. Ambíguo (fallback) → gap de incerteza por precaução
 */
function isNonCompliantAnswer(resposta: string): boolean {
  const r = resposta.toLowerCase().trim();
  // Regra 3: 'sim' → empresa tem controle → sem gap
  if (r.startsWith('sim')) return false;
  // Regra 1: 'não' / 'nao' → não-conformidade → gap
  if (r.startsWith('não') || r === 'nao') return true;
  // Regra 2: incerteza explícita → gap de incerteza
  if (r.includes('não sei') || r.includes('nao sei')) return true;
  if (r.includes('depende') || r.includes('verificar')) return true;
  if (r.includes('incerto') || r.includes('pode ser')) return true;
  if (r.includes('não tenho certeza') || r.includes('nao tenho certeza')) return true;
  // Regra 4: ambíguo → gap por precaução
  return true;
}

export async function analyzeIagenAnswers(
  projectId: number
): Promise<{ inserted: number }> {
  console.log('[IAGEN-GAP] analyzeIagenAnswers iniciado — projectId:', projectId);
  const pool = mysql.createPool(process.env.DATABASE_URL ?? '');
  const conn = await pool.getConnection();
  try {
    // 1. Buscar respostas da Onda 2 para o projeto
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT id, question_text, resposta, confidence_score
       FROM iagen_answers
       WHERE project_id = ?`,
      [projectId]
    );
    if (!rows || rows.length === 0) {
      console.warn('[IAGEN-GAP] Projeto sem iagen_answers — nenhum gap gerado');
      return { inserted: 0 };
    }

    // 2. Mapear respostas incertas → gaps via SOLARIS_GAPS_MAP
    const gapsToInsert: Array<{
      gap_descricao: string;
      area: string;
      severidade: string;
      topico_trigger: string;
      question_text: string;
      resposta: string;
    }> = [];

    for (const row of rows) {
      const resposta = String(row.resposta ?? '');
      const questionText = String(row.question_text ?? '');

      if (!isNonCompliantAnswer(resposta)) continue;

      const topics = extractTopicsFromQuestion(questionText);

      if (topics.length === 0) {
        // Fallback: gap genérico de risco sistêmico
        const fallbackGaps = SOLARIS_GAPS_MAP['risco_sistemico'];
        if (fallbackGaps) {
          gapsToInsert.push(...fallbackGaps.map(g => ({
            ...g,
            topico_trigger: 'risco_sistemico',
            question_text: questionText,
            resposta,
          })));
        }
        continue;
      }

      for (const topic of topics) {
        const gaps = SOLARIS_GAPS_MAP[topic];
        if (!gaps) continue;
        gapsToInsert.push(...gaps.map(g => ({
          ...g,
          topico_trigger: topic,
          question_text: questionText,
          resposta,
        })));
      }
    }

    console.log('[IAGEN-GAP] gaps calculados:', gapsToInsert.length);
    if (gapsToInsert.length === 0) {
      console.warn('[IAGEN-GAP] Nenhum gap gerado — todas as respostas indicam conformidade (sim)');
      return { inserted: 0 };
    }

    // 3. DELETE + INSERT em transação atômica
    await conn.beginTransaction();
    try {
      const [delResult] = await conn.execute(
        'DELETE FROM project_gaps_v3 WHERE project_id = ? AND source = ?',
        [projectId, 'iagen']
      ) as any;
      console.log('[IAGEN-GAP] DELETE gaps iagen anteriores:', delResult.affectedRows);

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
              'Resposta incerta na Onda 2 IA Generativa', NULL,
              'Critério não confirmado: resposta com baixa confiança na Onda 2',
              'Revisar e confirmar conformidade conforme LC 214/2025', 0, NULL,
              0.7, 'Detectado por resposta incerta na Onda 2 iagen',
              0, ?, ?)`,
          [
            projectId,
            gap.gap_descricao,
            gap.area,
            gap.severidade,
            now, now,
            gap.gap_descricao,
            gap.resposta?.substring(0, 200) ?? 'incerto',
            gap.topico_trigger,
          ]
        );
      }

      // Confirmar no banco
      const [countResult] = await conn.execute(
        'SELECT COUNT(*) as total FROM project_gaps_v3 WHERE project_id = ? AND source = ?',
        [projectId, 'iagen']
      ) as any;
      const insertedConfirmado: number = countResult[0]?.total ?? 0;
      await conn.commit();
      console.log('[IAGEN-GAP] inserted confirmado no banco:', insertedConfirmado);
      return { inserted: insertedConfirmado };
    } catch (err) {
      await conn.rollback();
      console.error('[IAGEN-GAP] ROLLBACK — projectId:', projectId);
      throw err;
    }
  } finally {
    conn.release();
    await pool.end();
  }
}
