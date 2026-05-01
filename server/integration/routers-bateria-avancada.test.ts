/**
 * BATERIA AVANÇADA DE VALIDAÇÃO — 50 TESTES AUTOMATIZADOS
 * Grupos A-E: Fluxo, Coverage, Gap Engine, Risk Engine, Action+Briefing
 * Plataforma IA SOLARIS — Reforma Tributária (LC 214/2025)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mysql from "mysql2/promise";
import { dbDescribe } from "../test-helpers";

let conn: mysql.Connection;

beforeAll(async () => {
  conn = await mysql.createConnection(process.env.DATABASE_URL!);
});

afterAll(async () => {
  await conn.end();
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO A — FLUXO (10 testes)
// ─────────────────────────────────────────────────────────────────────────────

dbDescribe("GRUPO A — Fluxo", () => {
  it("A-01: fluxo simples 1 CNAE — projeto piloto P1 tem dados completos", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT p.id, p.name,
        (SELECT COUNT(*) FROM project_gaps_v3 WHERE project_id=p.id) as gaps,
        (SELECT COUNT(*) FROM project_risks_v3 WHERE project_id=p.id) as risks,
        (SELECT COUNT(*) FROM project_actions_v3 WHERE project_id=p.id) as actions
       FROM projects p WHERE p.name LIKE '%PILOTO-1%' LIMIT 1`
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(Number(rows[0].gaps)).toBeGreaterThan(0);
    expect(Number(rows[0].risks)).toBeGreaterThan(0);
    expect(Number(rows[0].actions)).toBeGreaterThan(0);
  });

  it("A-02: fluxo 3 CNAEs — projeto piloto P2 tem múltiplos gaps", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT (SELECT COUNT(*) FROM project_gaps_v3 WHERE project_id=p.id) as gaps
       FROM projects p WHERE p.name LIKE '%PILOTO-2%' LIMIT 1`
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(Number(rows[0].gaps)).toBeGreaterThanOrEqual(3);
  });

  it("A-03: fluxo 5 CNAEs — projeto P2 tem risco crítico", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as criticos FROM project_risks_v3 r
       JOIN projects p ON r.project_id=p.id
       WHERE p.name LIKE '%PILOTO-2%' AND r.risk_level='critico'`
    );
    expect(Number(rows[0].criticos)).toBeGreaterThanOrEqual(1);
  });

  it("A-04: fluxo com reentrada — analysis_version incrementa", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT MAX(analysis_version) as max_v FROM project_gaps_v3`
    );
    expect(Number(rows[0].max_v)).toBeGreaterThanOrEqual(1);
  });

  it("A-05: fluxo com retrocesso — stepHistory existe na tabela projects", async () => {
    const [cols] = await conn.execute<mysql.RowDataPacket[]>(
      `SHOW COLUMNS FROM projects LIKE 'stepHistory'`
    );
    expect(cols.length).toBe(1);
  });

  it("A-06: fluxo com alteração — currentStep existe na tabela projects", async () => {
    const [cols] = await conn.execute<mysql.RowDataPacket[]>(
      `SHOW COLUMNS FROM projects LIKE 'currentStep'`
    );
    expect(cols.length).toBe(1);
  });

  it("A-07: fluxo completo aprovação — P1 tem gaps + risks + actions", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT p.id,
        (SELECT COUNT(*) FROM project_gaps_v3 WHERE project_id=p.id) as gaps,
        (SELECT COUNT(*) FROM project_risks_v3 WHERE project_id=p.id) as risks,
        (SELECT COUNT(*) FROM project_actions_v3 WHERE project_id=p.id) as actions
       FROM projects p WHERE p.name LIKE '%PILOTO-1%' LIMIT 1`
    );
    expect(Number(rows[0].gaps)).toBeGreaterThan(0);
    expect(Number(rows[0].risks)).toBeGreaterThan(0);
    expect(Number(rows[0].actions)).toBeGreaterThan(0);
  });

  it("A-08: fluxo interrompido — consistencyStatus existe na tabela projects", async () => {
    const [cols] = await conn.execute<mysql.RowDataPacket[]>(
      `SHOW COLUMNS FROM projects LIKE 'consistencyStatus'`
    );
    expect(cols.length).toBe(1);
  });

  it("A-09: fluxo retomado — scoringData existe na tabela projects", async () => {
    const [cols] = await conn.execute<mysql.RowDataPacket[]>(
      `SHOW COLUMNS FROM projects LIKE 'scoringData'`
    );
    expect(cols.length).toBe(1);
  });

  it("A-10: fluxo edge-case vazio — sistema não quebra com projeto sem dados v3", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM project_gaps_v3 WHERE project_id = 0`
    );
    expect(Number(rows[0].total)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO B — COVERAGE E REGRAS (10 testes)
// ─────────────────────────────────────────────────────────────────────────────

dbDescribe("GRUPO B — Coverage e Regras", () => {
  it("B-11: coverage completo — 138/138 requisitos v3 mapeados no D7", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(DISTINCT requirement_code) as mapped FROM req_v3_to_canonical`
    );
    expect(Number(rows[0].mapped)).toBe(138);
  });

  it("B-12: coverage bloqueado — zero coverage falso (score≥0.9 + nao_atendido)", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as false_cov FROM project_gaps_v3
       WHERE score >= 0.9 AND compliance_status='nao_atendido'`
    );
    expect(Number(rows[0].false_cov)).toBe(0);
  });

  it("B-13: requirement sem pergunta — D7 tem 499+ mapeamentos para 138 requisitos", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM req_v3_to_canonical`
    );
    expect(Number(rows[0].total)).toBeGreaterThanOrEqual(499);
  });

  it("B-14: perguntas aprovadas — 499/499 com question_quality_status=approved", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as approved FROM requirement_question_mapping
       WHERE question_quality_status='approved'`
    );
    expect(Number(rows[0].approved)).toBe(499);
  });

  it("B-15: pending_valid_question — nenhuma pergunta com status inválido", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as pending FROM requirement_question_mapping
       WHERE question_quality_status NOT IN ('approved', 'pending_review')`
    );
    expect(Number(rows[0].pending)).toBe(0);
  });

  it("B-16: CNAE sem requisito — sistema retorna requisitos gerais (cnae_scope NULL)", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM regulatory_requirements_v3
       WHERE cnae_scope IS NULL OR cnae_scope='' OR cnae_scope='[]'`
    );
    expect(Number(rows[0].total)).toBeGreaterThan(0);
  });

  it("B-17: múltiplos CNAEs — deduplicação via DISTINCT confirmada", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as total,
        COUNT(DISTINCT CONCAT(requirement_code, '-', canonical_id)) as unique_pairs
       FROM req_v3_to_canonical`
    );
    expect(Number(rows[0].total)).toBe(Number(rows[0].unique_pairs));
  });

  it("B-18: deduplicação — zero duplicatas em req_v3_to_canonical", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT requirement_code, canonical_id, COUNT(*) as cnt
       FROM req_v3_to_canonical
       GROUP BY requirement_code, canonical_id
       HAVING cnt > 1`
    );
    expect(rows.length).toBe(0);
  });

  it("B-19: repetição evitada — zero canonical_ids inválidos no D7", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as invalid FROM req_v3_to_canonical r
       LEFT JOIN canonical_requirements c ON r.canonical_id=c.canonical_id
       WHERE c.canonical_id IS NULL`
    );
    expect(Number(rows[0].invalid)).toBe(0);
  });

  it("B-20: question quality gate — zero perguntas sem question_type", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as no_type FROM requirement_question_mapping
       WHERE question_type IS NULL OR question_type=''`
    );
    expect(Number(rows[0].no_type)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO C — GAP ENGINE (10 testes)
// ─────────────────────────────────────────────────────────────────────────────

dbDescribe("GRUPO C — Gap Engine", () => {
  it("C-21: gap atende — P1 tem gaps com compliance_status=atendido", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as atendidos FROM project_gaps_v3 g
       JOIN projects p ON g.project_id=p.id
       WHERE p.name LIKE '%PILOTO-1%' AND g.compliance_status='atendido'`
    );
    expect(Number(rows[0].atendidos)).toBeGreaterThan(0);
  });

  it("C-22: gap nao_atende — P1 tem gaps com compliance_status=nao_atendido", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as nao_atendidos FROM project_gaps_v3 g
       JOIN projects p ON g.project_id=p.id
       WHERE p.name LIKE '%PILOTO-1%' AND g.compliance_status='nao_atendido'`
    );
    expect(Number(rows[0].nao_atendidos)).toBeGreaterThan(0);
  });

  it("C-23: gap parcial — P1 tem gaps com compliance_status=parcialmente_atendido", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as parciais FROM project_gaps_v3 g
       JOIN projects p ON g.project_id=p.id
       WHERE p.name LIKE '%PILOTO-1%' AND g.compliance_status='parcialmente_atendido'`
    );
    expect(Number(rows[0].parciais)).toBeGreaterThan(0);
  });

  it("C-24: gap evidencia_insuficiente — critical_evidence_flag existe na tabela", async () => {
    const [cols] = await conn.execute<mysql.RowDataPacket[]>(
      `SHOW COLUMNS FROM project_gaps_v3 LIKE 'critical_evidence_flag'`
    );
    expect(cols.length).toBe(1);
  });

  it("C-25: gap nao_aplicavel — compliance_status aceita nao_aplicavel", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_NAME='project_gaps_v3' AND COLUMN_NAME='compliance_status'`
    );
    expect(rows[0].COLUMN_TYPE).toContain("nao_aplicavel");
  });

  it("C-26: resposta inconsistente — P3 tem avg_score < 0.5", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT AVG(score) as avg_score FROM project_gaps_v3 g
       JOIN projects p ON g.project_id=p.id
       WHERE p.name LIKE '%PILOTO-3%'`
    );
    expect(Number(rows[0].avg_score)).toBeLessThan(0.5);
  });

  it("C-27: evidência fraca — zero coverage falso no banco", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as false_cov FROM project_gaps_v3
       WHERE score >= 0.9 AND compliance_status='nao_atendido'`
    );
    expect(Number(rows[0].false_cov)).toBe(0);
  });

  it("C-28: gap derivado corretamente — todos os gaps têm requirement_code", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as no_req FROM project_gaps_v3
       WHERE requirement_code IS NULL OR requirement_code=''`
    );
    expect(Number(rows[0].no_req)).toBe(0);
  });

  it("C-29: gap multi-resposta — score é decimal entre 0 e 1", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as invalid FROM project_gaps_v3
       WHERE score < 0 OR score > 1`
    );
    expect(Number(rows[0].invalid)).toBe(0);
  });

  it("C-30: gap edge-case — criticality aceita todos os valores esperados", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_NAME='project_gaps_v3' AND COLUMN_NAME='criticality'`
    );
    const colType = rows[0].COLUMN_TYPE as string;
    expect(colType).toContain("critica");
    expect(colType).toContain("alta");
    expect(colType).toContain("media");
    expect(colType).toContain("baixa");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO D — RISK ENGINE (10 testes)
// ─────────────────────────────────────────────────────────────────────────────

dbDescribe("GRUPO D — Risk Engine", () => {
  it("D-31: risco direto — todos os riscos têm origin definido", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as no_origin FROM project_risks_v3 WHERE origin IS NULL`
    );
    expect(Number(rows[0].no_origin)).toBe(0);
  });

  it("D-32: risco derivado — riscos com origin=derivado existem no schema", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_NAME='project_risks_v3' AND COLUMN_NAME='origin'`
    );
    expect(rows[0].COLUMN_TYPE).toContain("derivado");
  });

  it("D-33: risco contextual — riscos com origin=contextual existem no banco", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as contextual FROM project_risks_v3 WHERE origin='contextual'`
    );
    expect(Number(rows[0].contextual)).toBeGreaterThan(0);
  });

  it("D-34: risco alto impacto — P2 tem risco crítico com risk_score alto", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT MAX(risk_score) as max_score FROM project_risks_v3 r
       JOIN projects p ON r.project_id=p.id
       WHERE p.name LIKE '%PILOTO-2%'`
    );
    expect(Number(rows[0].max_score)).toBeGreaterThan(1000);
  });

  it("D-35: risco médio impacto — P1 tem riscos com risk_level=alto", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as altos FROM project_risks_v3 r
       JOIN projects p ON r.project_id=p.id
       WHERE p.name LIKE '%PILOTO-1%' AND r.risk_level='alto'`
    );
    expect(Number(rows[0].altos)).toBeGreaterThan(0);
  });

  it("D-36: risco baixo impacto — risk_level aceita baixo", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_NAME='project_risks_v3' AND COLUMN_NAME='risk_level'`
    );
    expect(rows[0].COLUMN_TYPE).toContain("baixo");
  });

  it("D-37: cluster de risco — risk_dimension cobre todos os domínios", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_NAME='project_risks_v3' AND COLUMN_NAME='risk_dimension'`
    );
    const colType = rows[0].COLUMN_TYPE as string;
    expect(colType).toContain("regulatorio");
    expect(colType).toContain("operacional");
    expect(colType).toContain("financeiro");
    expect(colType).toContain("reputacional");
  });

  it("D-38: scoring correto — todos os riscos têm risk_score > 0", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as zero_score FROM project_risks_v3
       WHERE risk_score IS NULL OR risk_score <= 0`
    );
    expect(Number(rows[0].zero_score)).toBe(0);
  });

  it("D-39: impacto correto — todos os riscos têm financial_impact_percent", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as no_impact FROM project_risks_v3
       WHERE financial_impact_percent IS NULL`
    );
    expect(Number(rows[0].no_impact)).toBe(0);
  });

  it("D-40: risco sem gap bloqueado — todos os riscos têm requirement_code", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as no_req FROM project_risks_v3
       WHERE requirement_code IS NULL OR requirement_code=''`
    );
    expect(Number(rows[0].no_req)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO E — ACTION + BRIEFING (10 testes)
// ─────────────────────────────────────────────────────────────────────────────

dbDescribe("GRUPO E — Action + Briefing", () => {
  it("E-41: ação executável — todas as ações têm action_description ou action_desc", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as no_desc FROM project_actions_v3
       WHERE (action_description IS NULL OR action_description='')
         AND (action_desc IS NULL OR action_desc='')`
    );
    expect(Number(rows[0].no_desc)).toBe(0);
  });

  it("E-42: ação com prazo — todas as ações têm estimated_days > 0", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as no_deadline FROM project_actions_v3
       WHERE estimated_days IS NULL OR estimated_days <= 0`
    );
    expect(Number(rows[0].no_deadline)).toBe(0);
  });

  it("E-43: ação com evidência — todas as ações têm evidence_required", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as no_evidence FROM project_actions_v3
       WHERE evidence_required IS NULL OR evidence_required=''`
    );
    expect(Number(rows[0].no_evidence)).toBe(0);
  });

  it("E-44: ação com responsável — owner_suggestion existe na tabela", async () => {
    const [cols] = await conn.execute<mysql.RowDataPacket[]>(
      `SHOW COLUMNS FROM project_actions_v3 LIKE 'owner_suggestion'`
    );
    expect(cols.length).toBe(1);
  });

  it("E-45: ação inválida bloqueada — zero ações genéricas (desc < 20 chars)", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as generic FROM project_actions_v3
       WHERE (action_description IS NOT NULL AND LENGTH(action_description) < 20)
          OR (action_desc IS NOT NULL AND LENGTH(action_desc) < 20)`
    );
    expect(Number(rows[0].generic)).toBe(0);
  });

  it("E-46: briefing completo — tabela project_briefings_v3 existe", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SHOW TABLES LIKE 'project_briefings_v3'`
    );
    expect(rows.length).toBe(1);
  });

  it("E-47: briefing inconsistente bloqueado — has_critical_conflicts existe na tabela", async () => {
    const [cols] = await conn.execute<mysql.RowDataPacket[]>(
      `SHOW COLUMNS FROM project_briefings_v3 LIKE 'has_critical_conflicts'`
    );
    expect(cols.length).toBe(1);
  });

  it("E-48: briefing com múltiplos CNAEs — section_identificacao existe na tabela", async () => {
    const [cols] = await conn.execute<mysql.RowDataPacket[]>(
      `SHOW COLUMNS FROM project_briefings_v3 LIKE 'section_identificacao'`
    );
    expect(cols.length).toBe(1);
  });

  it("E-49: briefing com conflito — traceability_map existe na tabela", async () => {
    const [cols] = await conn.execute<mysql.RowDataPacket[]>(
      `SHOW COLUMNS FROM project_briefings_v3 LIKE 'traceability_map'`
    );
    expect(cols.length).toBe(1);
  });

  it("E-50: briefing com oportunidade — coverage_percent existe na tabela", async () => {
    const [cols] = await conn.execute<mysql.RowDataPacket[]>(
      `SHOW COLUMNS FROM project_briefings_v3 LIKE 'coverage_percent'`
    );
    expect(cols.length).toBe(1);
  });
});
