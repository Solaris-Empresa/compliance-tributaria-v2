/**
 * analyze-gaps-questionnaires.ts — Sprint Z-11 / ENTREGA 4
 *
 * Pipeline Ondas 1+2: converte respostas de solaris_answers + iagen_answers
 * em gaps em project_gaps_v3, classificados por risk_category_code.
 *
 * NÃO substitui analyzeGaps() (Onda 3 — intacta).
 * Função nova ao lado do pipeline existente.
 *
 * DEC-Z11-ARCH-01: Opção B — dois loops distintos
 * DEC-Z11-ARCH-02: Map<string, AnswerData[]> agregação pessimista
 * DEC-Z11-ARCH-03: KEYWORD_TO_TOPIC mantido como fallback legado
 */

import mysql from "mysql2/promise";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnswerData {
  answer_value: string;
  fonte: "solaris" | "iagen";
  question_codigo: string;
  confidence_score: number;
  risk_category_code: string;
}

export interface CategoryClassification {
  compliance_status:
    | "atendido"
    | "parcialmente_atendido"
    | "nao_atendido"
    | "nao_aplicavel";
  evaluation_confidence: number;
}

export interface CategoryInfo {
  nome: string;
  artigo_base: string;
}

// ---------------------------------------------------------------------------
// Classificação de resposta individual
// ---------------------------------------------------------------------------

export function classifyAnswer(
  resposta: string,
): "atendido" | "parcialmente_atendido" | "nao_atendido" | "nao_aplicavel" {
  const r = resposta.toLowerCase().trim();
  if (r.startsWith("sim")) return "atendido";
  if (r.startsWith("não") || r === "nao") return "nao_atendido";
  if (
    r.includes("não sei") ||
    r.includes("nao sei") ||
    r.includes("depende") ||
    r.includes("verificar") ||
    r.includes("incerto") ||
    r.includes("pode ser") ||
    r.includes("não tenho certeza") ||
    r.includes("nao tenho certeza")
  )
    return "nao_atendido";
  if (
    r.includes("nao_aplicavel") ||
    r.includes("não aplicável") ||
    r === "n/a"
  )
    return "nao_aplicavel";
  if (r.includes("parcial")) return "parcialmente_atendido";
  // Ambíguo → pessimista (produto jurídico)
  return "nao_atendido";
}

// ---------------------------------------------------------------------------
// Classificação pessimista por categoria (DEC-Z11-ARCH-02)
// ---------------------------------------------------------------------------

export function classifyCategoryPessimistic(
  answers: AnswerData[],
): CategoryClassification {
  if (answers.length === 0) {
    return { compliance_status: "nao_atendido", evaluation_confidence: 0 };
  }

  const statuses = answers.map((a) => classifyAnswer(a.answer_value));
  const confidence =
    answers.reduce((sum, a) => sum + a.confidence_score, 0) / answers.length;

  if (statuses.some((s) => s === "nao_atendido")) {
    return { compliance_status: "nao_atendido", evaluation_confidence: confidence };
  }
  if (statuses.every((s) => s === "nao_aplicavel")) {
    return { compliance_status: "nao_aplicavel", evaluation_confidence: confidence };
  }
  if (statuses.some((s) => s === "parcialmente_atendido")) {
    return {
      compliance_status: "parcialmente_atendido",
      evaluation_confidence: confidence,
    };
  }
  return { compliance_status: "atendido", evaluation_confidence: confidence };
}

// ---------------------------------------------------------------------------
// Fetch answers from both ondas
// ---------------------------------------------------------------------------

export async function fetchQuestionnaireAnswers(
  projectId: number,
  conn: mysql.PoolConnection,
): Promise<AnswerData[]> {
  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    `SELECT sa.project_id, sa.resposta AS answer_value,
            sq.risk_category_code, 'solaris' AS fonte,
            sa.codigo AS question_codigo, 1.0 AS confidence_score
     FROM solaris_answers sa
     JOIN solaris_questions sq ON sq.id = sa.question_id
     WHERE sa.project_id = ?
     AND sq.risk_category_code IS NOT NULL
     AND sq.classification_scope = 'risk_engine'
     AND sq.ativo = 1

     UNION ALL

     SELECT ia.project_id, ia.resposta,
            ia.risk_category_code, 'iagen',
            CAST(ia.id AS CHAR), COALESCE(ia.confidence_score, 0.7)
     FROM iagen_answers ia
     WHERE ia.project_id = ?
     AND ia.risk_category_code IS NOT NULL`,
    [projectId, projectId],
  );

  return rows.map((r) => ({
    answer_value: String(r.answer_value ?? ""),
    fonte: r.fonte as "solaris" | "iagen",
    question_codigo: String(r.question_codigo ?? ""),
    confidence_score: Number(r.confidence_score ?? 0.7),
    risk_category_code: String(r.risk_category_code),
  }));
}

// ---------------------------------------------------------------------------
// Fetch category info from risk_categories
// ---------------------------------------------------------------------------

async function fetchCategoryInfo(
  conn: mysql.PoolConnection,
  categoryCodes: string[],
): Promise<Map<string, CategoryInfo>> {
  if (categoryCodes.length === 0) return new Map();
  const placeholders = categoryCodes.map(() => "?").join(",");
  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    `SELECT codigo, nome, artigo_base FROM risk_categories
     WHERE codigo IN (${placeholders}) AND status = 'ativo'`,
    categoryCodes,
  );
  const map = new Map<string, CategoryInfo>();
  for (const r of rows) {
    map.set(r.codigo, { nome: r.nome, artigo_base: r.artigo_base });
  }
  return map;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export async function analyzeGapsFromQuestionnaires(
  projectId: number,
  clientId: number,
  pool: mysql.Pool,
): Promise<{ gapsInserted: number }> {
  console.log(
    "[Z11-GAPS] analyzeGapsFromQuestionnaires iniciado — projectId:",
    projectId,
  );
  const conn = await pool.getConnection();
  try {
    // 1. Fetch all answers with risk_category_code from Ondas 1+2
    const answers = await fetchQuestionnaireAnswers(projectId, conn);

    if (answers.length === 0) {
      console.warn(
        "[Z11-GAPS] Nenhuma resposta com risk_category_code — 0 gaps gerados",
      );
      return { gapsInserted: 0 };
    }

    // 2. Group by risk_category_code — Map<string, AnswerData[]>
    const categoryAnswers = new Map<string, AnswerData[]>();
    for (const a of answers) {
      const arr = categoryAnswers.get(a.risk_category_code) ?? [];
      arr.push(a);
      categoryAnswers.set(a.risk_category_code, arr);
    }

    // 3. Fetch category metadata
    const categoryCodes = Array.from(categoryAnswers.keys());
    const categoryInfoMap = await fetchCategoryInfo(conn, categoryCodes);

    // 4. Classify pessimistically and build gaps
    const gapsToInsert: Array<{
      risk_category_code: string;
      compliance_status: string;
      evaluation_confidence: number;
      fonte: string;
      question_codigo: string;
      answer_value: string;
      nome: string;
      artigo_base: string;
    }> = [];

    for (const [categoryCode, answerList] of categoryAnswers) {
      const { compliance_status, evaluation_confidence } =
        classifyCategoryPessimistic(answerList);

      // Skip atendido and nao_aplicavel — no gap
      if (
        compliance_status === "atendido" ||
        compliance_status === "nao_aplicavel"
      )
        continue;

      const info = categoryInfoMap.get(categoryCode) ?? {
        nome: categoryCode,
        artigo_base: "N/A",
      };

      // Use fonte with highest priority from answers (solaris=priority over iagen)
      const hasSolaris = answerList.some((a) => a.fonte === "solaris");
      const fonte = hasSolaris ? "solaris" : "iagen";

      // Concatenate answer values for reference
      const representativeAnswer = answerList
        .map((a) => a.answer_value)
        .join(" | ")
        .substring(0, 200);

      gapsToInsert.push({
        risk_category_code: categoryCode,
        compliance_status,
        evaluation_confidence,
        fonte,
        question_codigo: answerList.map((a) => a.question_codigo).join(","),
        answer_value: representativeAnswer,
        nome: info.nome,
        artigo_base: info.artigo_base,
      });
    }

    console.log("[Z11-GAPS] gaps a inserir:", gapsToInsert.length);
    if (gapsToInsert.length === 0) {
      console.warn("[Z11-GAPS] Todas categorias atendidas — 0 gaps gerados");
      return { gapsInserted: 0 };
    }

    // 5. DELETE + INSERT em transação atômica
    await conn.beginTransaction();
    try {
      // Delete previous questionnaire gaps (source='solaris' or 'iagen' with CAT- prefix)
      await conn.execute(
        `DELETE FROM project_gaps_v3
         WHERE project_id = ?
         AND source IN ('solaris','iagen')
         AND requirement_code LIKE 'CAT-%'`,
        [projectId],
      );

      const now = new Date()
        .toISOString()
        .replace("T", " ")
        .replace(/\.\d+Z$/, "");

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
             (?, ?, ?, 'alta', 3,
              ?, ?, ?,
              ?, ?, ?,
              'operacional', 'normativo', ?, 'ausente',
              'baixa', 70, 'alto', 70,
              1, 'imediata', 30,
              'Gap identificado via questionário Onda 1+2', NULL,
              ?, ?,
              0, ?,
              ?, ?,
              0, ?, ?)`,
          [
            projectId,
            `Gap na categoria ${gap.nome}`,
            gap.risk_category_code,
            gap.fonte,
            now,
            now,
            clientId,
            `CAT-${gap.risk_category_code}`,
            gap.nome,
            gap.compliance_status,
            `Categoria ${gap.risk_category_code} não atendida`,
            `Revisar conformidade com ${gap.artigo_base}`,
            gap.compliance_status === "nao_atendido" ? "ausencia" : "parcial",
            gap.evaluation_confidence,
            `Classificação pessimista: ${gap.compliance_status}`,
            gap.answer_value,
            `risk_categories:${gap.risk_category_code}`,
          ],
        );
      }

      // Confirm count
      const [countResult] = (await conn.execute(
        `SELECT COUNT(*) as total FROM project_gaps_v3
         WHERE project_id = ? AND source IN ('solaris','iagen')
         AND requirement_code LIKE 'CAT-%'`,
        [projectId],
      )) as any;
      const insertedConfirmado: number = countResult[0]?.total ?? 0;
      await conn.commit();
      console.log("[Z11-GAPS] inserted confirmado:", insertedConfirmado);
      return { gapsInserted: insertedConfirmado };
    } catch (err) {
      await conn.rollback();
      console.error("[Z11-GAPS] ROLLBACK — projectId:", projectId);
      throw err;
    }
  } finally {
    conn.release();
  }
}
