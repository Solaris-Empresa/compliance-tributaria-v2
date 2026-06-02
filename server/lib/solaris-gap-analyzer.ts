/**
 * G17 — Analisador de gaps da Onda 1 SOLARIS — ARQUITETURA MAX (FIX-08)
 * Módulo puro — sem side effects de router tRPC
 * Usado por: server/routers-fluxo-v3.ts (fire-and-forget) e scripts/g17-backfill.ts
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FIX-08 (FASE B, 2026-06-01): arquitetura Max — zero dicionários intermediários.
 *
 * Antes (legado pré-FIX-08):
 *   pergunta.topicos → split(";") → SOLARIS_GAPS_MAP[topico] → gap
 *                                    mapTopicToCategory(topico) → risk_category_code
 *   ❌ Tópico novo sem entrada no MAP → gap perdido silenciosamente (B9)
 *
 * Agora (FIX-08):
 *   resposta negativa → gap direto montado a partir dos metadados da pergunta
 *     gap_descricao      = pergunta.gap_descricao (curado) ?? "Ausência: {titulo}"
 *     area               = pergunta.categoria (obrigatório no Zod do upload)
 *     severidade         = pergunta.severidade_base ?? 'media' (fallback defensivo)
 *     risk_category_code = pergunta.risk_category_code (obrigatório em CREATE — FIX-06)
 *     source_reference   = pergunta.codigo (SOL-NNN)
 *   ✅ 100% cobertura — sem dicionário de tradução, sem curadoria recorrente
 *
 * Dependências (todas mergeadas em main):
 *   - PR #1316 (FEAT-SOL-UX-01 PR-A): coluna resposta_opcao
 *   - PR #1321 (FIX-01): helper classifyForGap dual-column
 *   - PR #1323 (FIX-05): coluna gap_descricao
 *   - PR #1324 (FIX-06): risk_category_code obrigatório em CREATE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Decisão por opção (canônica — quando resposta_opcao IS NOT NULL):
 *   - sim           → sem gap
 *   - nao           → gap
 *   - nao_sei       → gap (conservador — produto jurídico)
 *   - nao_se_aplica → exclusão (distinto de "atendido", não gera gap)
 *
 * Fallback legado (resposta_opcao IS NULL — pré-PR-C):
 *   - "não se aplica", "não aplicável", "n/a", "na" → exclusão
 *   - startsWith("não") || === "nao"               → gap
 *   - resto                                         → sem gap
 *
 * Idempotência: DELETE source='solaris' antes de INSERT (D4).
 * Compatibilidade V1: projeto sem solaris_answers → retorna { inserted: 0 }.
 * Driver único: mysql2 pool raw (Opção A) — sem mistura Drizzle + raw.
 *
 * NOTA cross-domain: `server/lib/iagen-gap-analyzer.ts` ainda importa
 * SOLARIS_GAPS_MAP + mapTopicToCategory — esses dicionários NÃO foram deletados
 * neste PR. Migração do IAGEN para o mesmo padrão = sprint futura.
 */

import mysql from 'mysql2/promise';

// ─── Tipos e helpers puros (testáveis sem DB) ─────────────────────────────────

/** Valores discretos persistidos em solaris_answers.resposta_opcao (migration 0120). */
export type RespostaOpcao = "sim" | "nao" | "nao_sei" | "nao_se_aplica";

/** Severidade base persistida em solaris_questions.severidade_base. */
export type Severidade = "baixa" | "media" | "alta" | "critica";

/** Classificação determinística da resposta para o pipeline de gap. */
export interface GapClassification {
  /** true → resposta gera gap a partir dos metadados da pergunta */
  isNegative: boolean;
  /** true → resposta marca exclusão explícita (não-aplicabilidade), NÃO gera gap */
  isExcluded: boolean;
}

/**
 * Subconjunto enriquecido de `solaris_questions` consumido pelo G17 (FIX-08).
 * Todos os campos opcionais → tratados defensivamente em `buildGapFromQuestion`.
 */
export interface QuestionMetadata {
  /** Sprint 3 (FIX-VIS-U4): ID real da pergunta para persistir em project_gaps_v3.question_id
   *  (substitui o literal 0 que era hardcoded no SQL INSERT pré-Sprint 3). */
  id: number;
  codigo: string;
  titulo: string | null;
  categoria: string | null;
  severidade_base: string | null;
  risk_category_code: string | null;
  gap_descricao: string | null;
}

/** Forma intermediária do gap antes do INSERT — testável sem DB. */
export interface GapToInsert {
  /** Sprint 3 (FIX-VIS-U4): question_id real (solaris_questions.id). */
  question_id: number;
  /** Sprint 3 (FIX-VIS-U6 — opção c híbrido autorizada P.O.):
   *  - resposta_opcao disponível → 'nao' / 'nao_sei' (ENUM canônico Sprint 1)
   *  - legado (resposta_opcao NULL) → fallback para resposta texto truncado a 200 chars
   *  UI mapeia 'nao' → "Não" · 'nao_sei' → "Não sei" no parseEvidence/render. */
  answer_value: string;
  gap_descricao: string;
  area: string;
  severidade: Severidade;
  risk_category_code: string;
  source_reference: string;
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

/**
 * Sprint 3 (FIX-VIS-U6) — opção (c) híbrida autorizada P.O.: deriva o valor a
 * persistir em project_gaps_v3.answer_value a partir do par (opcao, resposta).
 *
 * - `opcao` preenchida (radio button — Sprint 1 PR #1316) → persistir o ENUM
 *   canônico (`'nao'` / `'nao_sei'`). UI mapeia downstream.
 * - `opcao` NULL (legado pré-PR-C) → fallback para `resposta` texto truncado
 *   a 200 chars (padrão IAGEN — Lição #59 evita verbosidade no banco).
 *
 * Função pura, testável sem DB.
 */
export function deriveAnswerValueCanonical(
  opcao: RespostaOpcao | null,
  resposta: string,
): string {
  if (opcao !== null) return opcao; // 'sim' | 'nao' | 'nao_sei' | 'nao_se_aplica'
  // Fallback legado: truncar a 200 chars (paridade com IAGEN preview)
  return (resposta ?? "").substring(0, 200);
}

/**
 * FIX-08 — Função pura testável: monta o gap a partir dos metadados da pergunta.
 * Retorna `null` quando a pergunta não tem `risk_category_code` (skip + warn).
 *
 * Esta é a essência da "arquitetura Max": substitui o lookup em
 * SOLARIS_GAPS_MAP + topico-to-categoria por leitura direta dos metadados
 * que o advogado curou no momento do upload/criação (FIX-06).
 *
 * Sprint 3 (FIX-VIS-U4 + U6): recebe agora `answer_value_canonical` (string já
 * derivada pelo caller via `deriveAnswerValueCanonical`) e propaga junto com
 * `question_id` (row.id) — substitui os literais `0` e `'não'` que eram
 * hardcoded no SQL INSERT da arquitetura legada.
 */
export function buildGapFromQuestion(
  row: QuestionMetadata,
  answer_value_canonical: string,
): GapToInsert | null {
  // Guard: sem risk_category_code → não há mapeamento determinístico → skip
  // (REGRA-ORQ-29: sem requisito = sem gap). FIX-06 torna obrigatório em CREATE;
  // perguntas legadas com risk_category_code=NULL caem aqui até serem curadas.
  if (!row.risk_category_code || row.risk_category_code.trim() === "") {
    return null;
  }
  // gap_descricao curado → preferido; fallback "Ausência: {titulo}" → fallback "Ausência: {codigo}"
  const gapDescricao = row.gap_descricao?.trim()
    ? row.gap_descricao.trim()
    : `Ausência: ${row.titulo?.trim() || row.codigo}`;
  // Defensivo: categoria nullable no schema atual → fallback contabilidade_fiscal
  const area = row.categoria?.trim() || "contabilidade_fiscal";
  // Defensivo: severidade_base nullable → fallback "media"
  const sev = (row.severidade_base?.trim() as Severidade | undefined) ?? "media";
  const severidade: Severidade = (["baixa", "media", "alta", "critica"] as const).includes(
    sev as Severidade,
  )
    ? sev as Severidade
    : "media";
  return {
    question_id: row.id,
    answer_value: answer_value_canonical,
    gap_descricao: gapDescricao,
    area,
    severidade,
    risk_category_code: row.risk_category_code.trim(),
    source_reference: row.codigo,
  };
}

// ─── Procedure principal (I/O com DB) ─────────────────────────────────────────

export async function analyzeSolarisAnswers(
  projectId: number,
): Promise<{ inserted: number }> {
  console.log('[G17-MAX] analyzeSolarisAnswers iniciado — projectId:', projectId);

  const pool = mysql.createPool(process.env.DATABASE_URL ?? '');
  const conn = await pool.getConnection();

  try {
    // FIX-08: SELECT enriquecido — traz todos os metadados que `buildGapFromQuestion`
    // precisa (categoria, severidade_base, risk_category_code, gap_descricao, titulo).
    // ELIMINA: sq.topicos (não mais consumido — substituído por risk_category_code direto).
    //
    // Sprint 3 (FIX-VIS-U4): adicionado `sq.id AS question_id_real` — substitui o
    // literal 0 hardcoded no SQL INSERT. Habilita rastreabilidade end-to-end
    // Risco → Pergunta SOLARIS no frontend.
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT sa.resposta, sa.resposta_opcao,
              sq.id AS question_id_real,
              sq.codigo, sq.titulo, sq.categoria, sq.severidade_base,
              sq.risk_category_code, sq.gap_descricao
       FROM solaris_answers sa
       LEFT JOIN solaris_questions sq ON sq.id = sa.question_id
       WHERE sa.project_id = ? AND sq.ativo = 1`,
      [projectId]
    );

    if (!rows || rows.length === 0) {
      console.warn('[G17-MAX] Projeto sem solaris_answers (V1 legado ou vazio) — degradando graciosamente');
      return { inserted: 0 };
    }

    // FIX-08: 1 resposta negativa = 1 gap (era N tópicos → N gaps no legado).
    // Granularidade simplificada — cada pergunta carrega 1 risk_category_code
    // e 1 gap_descricao curada (sem multiplicação).
    const gapsToInsert: GapToInsert[] = [];

    for (const row of rows) {
      const opcao = (row.resposta_opcao as RespostaOpcao | null) ?? null;
      const resposta = (row.resposta as string) ?? '';
      const { isNegative, isExcluded } = classifyForGap(opcao, resposta);
      if (isExcluded) continue;
      if (!isNegative) continue;

      // Sprint 3 (FIX-VIS-U6): derivar valor canônico antes do INSERT.
      const answerValueCanonical = deriveAnswerValueCanonical(opcao, resposta);

      const gap = buildGapFromQuestion(
        {
          // Sprint 3 (FIX-VIS-U4): id real (alias SQL: question_id_real)
          id: row.question_id_real as number,
          codigo: row.codigo as string,
          titulo: (row.titulo as string | null) ?? null,
          categoria: (row.categoria as string | null) ?? null,
          severidade_base: (row.severidade_base as string | null) ?? null,
          risk_category_code: (row.risk_category_code as string | null) ?? null,
          gap_descricao: (row.gap_descricao as string | null) ?? null,
        },
        answerValueCanonical,
      );

      if (gap === null) {
        console.warn(
          `[G17-MAX] ${row.codigo} sem risk_category_code — skip (curadoria pendente — REGRA-ORQ-29)`,
        );
        continue;
      }

      gapsToInsert.push(gap);
    }

    console.log('[G17-MAX] gaps calculados:', gapsToInsert.length);

    if (gapsToInsert.length === 0) {
      console.warn('[G17-MAX] Nenhum gap gerado — todas respostas positivas/exclusão ou perguntas sem risk_category_code');
      // Ainda assim, garantir idempotência: deletar gaps anteriores
      await conn.execute(
        'DELETE FROM project_gaps_v3 WHERE project_id = ? AND source = ?',
        [projectId, 'solaris'],
      );
      return { inserted: 0 };
    }

    // DELETE + INSERT em transação atômica (Opção A — raw MySQL)
    await conn.beginTransaction();

    try {
      // Idempotência: deletar gaps SOLARIS anteriores para este projeto
      const [delResult] = await conn.execute(
        'DELETE FROM project_gaps_v3 WHERE project_id = ? AND source = ?',
        [projectId, 'solaris'],
      ) as any;
      console.log('[G17-MAX] DELETE gaps SOLARIS anteriores:', delResult.affectedRows);

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
              'solaris', ?, ?,
              0, 'SOLARIS', ?,
              'operacional', 'normativo', 'nao_atendido', 'ausente',
              'baixa', 80, 'alto', 80,
              1, 'imediata', 30,
              'Resposta negativa na Onda 1 SOLARIS (G17-MAX)', NULL,
              'Critério não atendido: resposta negativa na Onda 1 SOLARIS',
              'Implementar controle conforme LC 214/2025', 0, NULL,
              0.9, 'Detectado por resposta negativa SOLARIS — G17-MAX',
              ?, ?, ?,
              ?)`,
          // Sprint 3 (FIX-VIS-U4 + U6): substituídos literais `0, 'não'` por
          // placeholders dinâmicos `?, ?` (question_id real + answer_value canônico).
          [
            projectId,
            gap.gap_descricao,
            gap.area,
            gap.severidade,
            now, now,
            gap.gap_descricao,
            gap.question_id,        // FIX-VIS-U4: ID real (era literal 0)
            gap.answer_value,       // FIX-VIS-U6: 'nao'/'nao_sei' canônico ou texto legado
            gap.source_reference,
            gap.risk_category_code,
          ]
        );
      }

      // Confirmar no banco — não confiar só em gapsToInsert.length
      const [countResult] = await conn.execute(
        'SELECT COUNT(*) as total FROM project_gaps_v3 WHERE project_id = ? AND source = ?',
        [projectId, 'solaris'],
      ) as any;
      const insertedConfirmado: number = countResult[0]?.total ?? 0;

      await conn.commit();
      console.log('[G17-MAX] inserted confirmado no banco:', insertedConfirmado);
      return { inserted: insertedConfirmado };

    } catch (err) {
      await conn.rollback();
      console.error('[G17-MAX] ROLLBACK — projectId:', projectId);
      console.error('[G17-MAX] Erro completo:', JSON.stringify(err, null, 2));
      throw err;
    }

  } finally {
    conn.release();
    await pool.end();
  }
}
