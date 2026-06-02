/**
 * iagen-gap-analyzer.ts — ARQUITETURA MAX (FIX-09, FASE C)
 *
 * Converte iagen_answers (Onda 2 IA Generativa) em gaps em project_gaps_v3.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FIX-09 (FASE C, 2026-06-01): elimina KEYWORD_TO_TOPIC + SOLARIS_GAPS_MAP lookup.
 *
 * Antes (legado pré-FIX-09):
 *   1. iagen_answers.riskCategoryCode preenchido (DEC-Z11-ARCH-03) → usar direto
 *   2. Senão: extractTopicsFromQuestion(questionText) via KEYWORD_TO_TOPIC (35 keywords hardcoded)
 *   3. Senão: fallback SOLARIS_GAPS_MAP['risco_sistemico']
 *   ❌ Pergunta com palavras-chave fora do KEYWORD_TO_TOPIC → cai em risco_sistemico genérico
 *   ❌ Hardcode de keywords viola REGRA-ORQ-32 (no hardcode — visão sistêmica)
 *
 * Agora (FIX-09 — arquitetura Max):
 *   1. iagen_answers.riskCategoryCode preenchido → gap direto (fonte canônica única)
 *   2. iagen_answers.riskCategoryCode NULL → skip + warn (REGRA-ORQ-29)
 *   ✅ Zero dicionários intermediários
 *   ✅ Cobertura determinística — depende apenas de o LLM ter atribuído risk_category_code
 *   ✅ Quando categoryAssignmentMode='llm_assigned', LLM já fez o trabalho na geração
 *
 * Diferença vs SOLARIS (FIX-08):
 *   - SOLARIS: metadados curados pelo advogado (titulo, categoria, severidade_base,
 *     risk_category_code, gap_descricao) via UI admin
 *   - IAGEN: questões DINÂMICAS geradas pelo LLM; apenas risk_category_code é
 *     atribuído na geração (categoryAssignmentMode = 'llm_assigned' | 'human_validated')
 *   - Por isso categoria/severidade são DEFAULTS conservadores aqui ('compliance'/'alta')
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Detecção negativa (preservada do legado):
 *   - resposta.startsWith('sim') → empresa tem controle → sem gap
 *   - resposta.startsWith('não'|'nao') → gap
 *   - Incerteza ('não sei', 'depende', 'verificar', etc.) → gap (conservador)
 *   - Ambíguo (fallback) → gap por precaução
 *
 * Idempotência: DELETE source='iagen' antes de INSERT.
 */
import mysql from 'mysql2/promise';

// FIX-09: REMOVE imports SOLARIS_GAPS_MAP + mapTopicToCategory + KEYWORD_TO_TOPIC.
// Arquitetura Max — fonte canônica única: iagen_answers.risk_category_code.

// ─── Tipos e helpers puros (testáveis sem DB) ─────────────────────────────────

/** Severidade base do gap iagen (default conservador — sem curadoria humana). */
export type IagenSeveridade = "baixa" | "media" | "alta" | "critica";

/** Subconjunto enriquecido de `iagen_answers` consumido pelo analyzer. */
export interface IagenAnswerMetadata {
  id: number;
  question_text: string;
  resposta: string;
  risk_category_code: string | null;
}

/** Forma intermediária do gap antes do INSERT. */
export interface IagenGapToInsert {
  /** Sprint 3 (FIX-VIS-U4 paridade): id da resposta iagen — IAGEN não tem
   *  tabela `iagen_questions` (perguntas são dinâmicas LLM, persistidas inline),
   *  então a unidade rastreável é `iagen_answers.id`. Substitui o literal 0
   *  hardcoded em project_gaps_v3.question_id pré-Sprint 3. */
  iagen_answer_id: number;
  gap_descricao: string;
  area: string;
  severidade: IagenSeveridade;
  risk_category_code: string;
  source_reference: string;
  answer_value_preview: string;
}

/**
 * FIX-09 — Determina se uma resposta iagen indica não-conformidade.
 *
 * IAGEN é mais conservador que SOLARIS:
 *   - 'sim' → sem gap (único caminho positivo)
 *   - tudo o mais → gap (conservador — IA Gen reflete incerteza por design)
 *
 * Padrão preservado do legado pré-FIX-09.
 */
export function isNonCompliantIagenAnswer(resposta: string): boolean {
  const r = resposta.toLowerCase().trim();
  // Regra única positiva: 'sim' → empresa tem controle
  if (r.startsWith("sim")) return false;
  // 'não' / 'nao' → não-conformidade explícita
  if (r.startsWith("não") || r === "nao") return true;
  // Incerteza explícita → gap de incerteza
  if (r.includes("não sei") || r.includes("nao sei")) return true;
  if (r.includes("depende") || r.includes("verificar")) return true;
  if (r.includes("incerto") || r.includes("pode ser")) return true;
  if (r.includes("não tenho certeza") || r.includes("nao tenho certeza")) return true;
  // Ambíguo → gap por precaução (mais conservador que SOLARIS)
  return true;
}

/**
 * FIX-09 — Helper puro testável: monta gap iagen a partir dos metadados.
 * Retorna `null` quando `risk_category_code` for NULL (skip + warn no caller).
 *
 * Defaults conservadores:
 *   - area: 'compliance' (sem categoria curada — não há iagen_questions)
 *   - severidade: 'alta' (conservador — IAGEN é fonte secundária de evidência)
 *
 * gap_descricao gerada com base no questionText (truncado a 120 chars) para
 * preservar contexto sem inflar o banco.
 */
export function buildIagenGapFromAnswer(
  row: IagenAnswerMetadata,
): IagenGapToInsert | null {
  // Guard: sem risk_category_code → skip (REGRA-ORQ-29: sem requisito = sem gap).
  // Quando categoryAssignmentMode='llm_assigned', LLM deveria ter preenchido;
  // NULL indica problema de geração — não tente "adivinhar" o tópico.
  const rcc = (row.risk_category_code ?? "").trim();
  if (!rcc) return null;
  // Preview da pergunta para rastreabilidade (truncado defensivamente)
  const questionPreview = (row.question_text ?? "").trim().substring(0, 120);
  const gapDescricao = questionPreview
    ? `Gap categoria ${rcc} — pergunta IA Gen: "${questionPreview}${questionPreview.length === 120 ? "..." : ""}"`
    : `Gap categoria ${rcc} — resposta Onda 2 IA Generativa`;
  // answer_value_preview: 200 chars (preserva o que estava no SQL legado)
  const answerPreview = (row.resposta ?? "").substring(0, 200);
  return {
    iagen_answer_id: row.id, // Sprint 3 (FIX-VIS-U4 paridade)
    gap_descricao: gapDescricao,
    area: "compliance", // default — não há iagen_questions com categoria curada
    severidade: "alta", // default conservador — IAGEN é fonte LLM
    risk_category_code: rcc,
    source_reference: `IAGEN-${row.id}`,
    answer_value_preview: answerPreview,
  };
}

// ─── Procedure principal (I/O com DB) ─────────────────────────────────────────

export async function analyzeIagenAnswers(
  projectId: number,
): Promise<{ inserted: number }> {
  console.log('[IAGEN-MAX] analyzeIagenAnswers iniciado — projectId:', projectId);
  const pool = mysql.createPool(process.env.DATABASE_URL ?? '');
  const conn = await pool.getConnection();
  try {
    // SELECT preservado — risk_category_code já era selecionado desde Z-11
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT id, question_text, resposta, confidence_score, risk_category_code
       FROM iagen_answers
       WHERE project_id = ?`,
      [projectId]
    );
    if (!rows || rows.length === 0) {
      console.warn('[IAGEN-MAX] Projeto sem iagen_answers — nenhum gap gerado');
      return { inserted: 0 };
    }

    // FIX-09: 1 resposta = 1 gap (era N tópicos no legado via KEYWORD_TO_TOPIC).
    const gapsToInsert: IagenGapToInsert[] = [];

    for (const row of rows) {
      const resposta = String(row.resposta ?? '');
      if (!isNonCompliantIagenAnswer(resposta)) continue;

      const gap = buildIagenGapFromAnswer({
        id: Number(row.id),
        question_text: String(row.question_text ?? ''),
        resposta,
        risk_category_code: row.risk_category_code
          ? String(row.risk_category_code)
          : null,
      });

      if (gap === null) {
        console.warn(
          `[IAGEN-MAX] iagen_answer id=${row.id} sem risk_category_code — skip (REGRA-ORQ-29; verificar categoryAssignmentMode='llm_assigned')`,
        );
        continue;
      }
      gapsToInsert.push(gap);
    }

    console.log('[IAGEN-MAX] gaps calculados:', gapsToInsert.length);
    if (gapsToInsert.length === 0) {
      console.warn('[IAGEN-MAX] Nenhum gap gerado — todas respostas positivas ou sem risk_category_code');
      // Ainda assim garantir idempotência: limpar gaps anteriores
      await conn.execute(
        'DELETE FROM project_gaps_v3 WHERE project_id = ? AND source = ?',
        [projectId, 'iagen'],
      );
      return { inserted: 0 };
    }

    // DELETE + INSERT em transação atômica
    await conn.beginTransaction();
    try {
      const [delResult] = await conn.execute(
        'DELETE FROM project_gaps_v3 WHERE project_id = ? AND source = ?',
        [projectId, 'iagen']
      ) as any;
      console.log('[IAGEN-MAX] DELETE gaps iagen anteriores:', delResult.affectedRows);

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
              question_id, answer_value, source_reference,
              risk_category_code)
           VALUES
             (?, ?, ?, ?, 3,
              'iagen', ?, ?,
              0, 'IAGEN', ?,
              'operacional', 'normativo', 'nao_atendido', 'ausente',
              'baixa', 70, 'alto', 70,
              1, 'imediata', 30,
              'Resposta incerta na Onda 2 IA Gen (IAGEN-MAX)', NULL,
              'Critério não confirmado: resposta com baixa conformidade na Onda 2',
              'Revisar e confirmar conformidade conforme LC 214/2025', 0, NULL,
              0.7, 'Detectado por resposta não-conforme na Onda 2 iagen — IAGEN-MAX',
              ?, ?, ?,
              ?)`,
          // Sprint 3 (FIX-VIS-U4 paridade): substituído literal `0` por
          // placeholder `?` para persistir iagen_answers.id real em question_id.
          [
            projectId,
            gap.gap_descricao,
            gap.area,
            gap.severidade,
            now, now,
            gap.gap_descricao,
            gap.iagen_answer_id,         // FIX-VIS-U4: era literal 0
            gap.answer_value_preview,
            gap.source_reference,
            gap.risk_category_code,
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
      console.log('[IAGEN-MAX] inserted confirmado no banco:', insertedConfirmado);
      return { inserted: insertedConfirmado };
    } catch (err) {
      await conn.rollback();
      console.error('[IAGEN-MAX] ROLLBACK — projectId:', projectId);
      throw err;
    }
  } finally {
    conn.release();
    await pool.end();
  }
}
