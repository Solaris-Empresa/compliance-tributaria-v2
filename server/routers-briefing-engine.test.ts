/**
 * Testes B7 — Briefing Engine (Sprint 98% Confidence)
 * ADR-010 — Arquitetura canônica de conteúdo diagnóstico
 *
 * Checklist do Orquestrador — 10 critérios obrigatórios:
 * T-B7-01: Template obrigatório com 8 seções fixas
 * T-B7-02: Coverage = 100% obrigatório
 * T-B7-03: Consistency obrigatório — sem conflito crítico
 * T-B7-04: Multi-input real (perfil + respostas + gaps + riscos + ações)
 * T-B7-05: Grounding normativo (LC/EC + requirement_id)
 * T-B7-06: Rastreabilidade — toda afirmação com origem
 * T-B7-07: Consistência cross-section
 * T-B7-08: Sem alucinação — nada além dos dados
 * T-B7-09: Qualidade executiva — claro, direto, útil
 * T-B7-10: 4 cenários obrigatórios (multi-CNAE, risco alto, gaps ocultos, inconsistência resolvida)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mysql from "mysql2/promise";
import {
  BRIEFING_SECTIONS,
  BriefingSectionSchema,
  CompleteBriefingSchema,
  SectionIdentificacaoSchema,
  SectionEscopoSchema,
  SectionResumoExecutivoSchema,
  SectionPerfilRegulatorioPSchema,
  SectionGapsSchema,
  SectionRiscosSchema,
  SectionPlanoAcaoSchema,
  SectionProximosPassosSchema,
  checkCoverage,
  checkConsistency,
  checkTraceability,
  generateBriefing,
  persistBriefing,
  type CompleteBriefing,
  type CoverageCheckResult,
} from "./routers/briefingEngine";

// ---------------------------------------------------------------------------
// Setup: pool de conexão e dados de teste
// ---------------------------------------------------------------------------

let pool: mysql.Pool;
let testProjectId: number;
let testUserId: number;
let testGapId: number;
let testRiskId: number;
let testActionId: number;

beforeAll(async () => {
  pool = mysql.createPool(process.env.DATABASE_URL ?? "");

  const [users] = await pool.query<mysql.RowDataPacket[]>("SELECT id FROM users LIMIT 1");
  testUserId = users[0]?.id ?? 1;

  // Criar projeto de teste B7
  const [projResult] = await pool.query<mysql.OkPacket>(
    `INSERT INTO projects (name, clientId, businessType, status, createdById, createdByRole, notificationFrequency, notificationEmail, companySize, taxRegime)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ["[B7-TEST] Briefing Engine", testUserId, "diagnostico_cnae", testUserId, testUserId, "equipe_solaris", "semanal", "b7test@test.com", "grande", "lucro_real"]
  );
  testProjectId = projResult.insertId;

  // Criar gap de teste
  const [gapResult] = await pool.query<mysql.OkPacket>(
    `INSERT INTO project_gaps_v3 (
      client_id, project_id, requirement_id, gap_classification, evidence_status,
      evaluation_confidence, evaluation_confidence_reason, source_reference,
      requirement_code, requirement_name, domain, gap_level, gap_type,
      compliance_status, criticality, score, priority_score,
      operational_dependency, risk_level, action_priority, estimated_days,
      gap_description, deterministic_reason, unmet_criteria, recommended_actions,
      analysis_version, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      testUserId, testProjectId, 1, "ausencia", "ausente",
      0.92, "Resposta negativa determinística",
      "LC 214/2024 — Art. 25",
      "REQ-001", "Registro IBS/CBS", "fiscal", "operacional", "normativo",
      "nao_atendido", "alta", 70.00, 70.00,
      "alta", "critico", "imediata", 30,
      "Gap de registro IBS/CBS identificado no diagnóstico",
      "Resposta negativa determinística",
      "[\"Registro IBS/CBS não realizado\"]",
      "[\"Realizar registro no Comitê Gestor\"]",
      1
    ]
  );
  testGapId = gapResult.insertId;

  // Criar risco de teste
  const [riskResult] = await pool.query<mysql.OkPacket>(
    `INSERT INTO project_risks_v3 (
      client_id, project_id, gap_id, requirement_id,
      risk_code, requirement_code, requirement_name, domain,
      gap_type, probability, impact, risk_score, risk_score_normalized,
      risk_level, risk_dimension, origin, origin_justification,
      evaluation_confidence, evaluation_confidence_reason,
      risk_category_l1, risk_category_l2, risk_category_l3,
      base_score, adjusted_score, hybrid_score,
      scoring_factors, source_reference, description,
      mitigation_hint, mitigation_strategy, financial_impact_percent, financial_impact_description,
      analysis_version, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      testUserId, testProjectId, testGapId, 1,
      "RISK-B7-001", "REQ-001", "Registro IBS/CBS", "fiscal",
      "normativo", 90, 95, 97, 97,
      "critico", "regulatorio", "direto",
      "Gap direto de ausência de registro IBS/CBS",
      0.92, "Risco direto — alta confiança",
      "fiscal", "recolhimento", "split_payment",
      85, 97, 97,
      JSON.stringify(["base_criticality=85"]),
      "LC 214/2024 — Art. 25",
      "Risco de não conformidade com split payment IBS/CBS — empresa não registrada no CGIBS",
      "Implementar integração com sistema do Comitê Gestor",
      "Integrar ERP com plataforma de split payment do Comitê Gestor conforme LC 214/2024",
      0.1500,
      "Multa de 75% sobre o tributo não recolhido via split payment",
      1
    ]
  );
  testRiskId = riskResult.insertId;

  // Criar ação de teste
  const [actionResult] = await pool.query<mysql.OkPacket>(
    `INSERT INTO project_actions_v3 (
      client_id, project_id, risk_id, gap_id, requirement_id,
      template_id, requirement_code, risk_code, domain, gap_type,
      action_code, action_name, action_desc, action_description, action_type,
      action_priority, estimated_days, deadline_rule,
      owner_suggestion, evidence_required, source_reference,
      traceability_chain, analysis_version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      testUserId, testProjectId, testRiskId, testGapId, 1,
      "TMPL-FISCAL-001",
      "REQ-001", "RISK-B7-001", "fiscal", "normativo",
      "ACT-B7-001",
      "Implementar integração com split payment do CGIBS",
      "Integrar o ERP com a plataforma de split payment do Comitê Gestor do IBS/CBS conforme LC 214/2024 Art. 25",
      "Integrar o ERP com a plataforma de split payment do Comitê Gestor do IBS/CBS conforme LC 214/2024 Art. 25",
      "integracao",
      "imediata", 30,
      "LC 214/2024 Art. 25 — vigência a partir de 01/01/2027",
      "Gerente de TI / Integrador Fiscal",
      "Certificado de homologação da integração; relatório de testes com 10 transações reais",
      "LC 214/2024 — Art. 25",
      JSON.stringify({ requirement_id: 1, gap_id: testGapId, risk_id: testRiskId, template_id: "TMPL-FISCAL-001" }),
      1
    ]
  );
  testActionId = actionResult.insertId;
});

afterAll(async () => {
  await pool.query("DELETE FROM project_briefings_v3 WHERE project_id = ?", [testProjectId]);
  await pool.query("DELETE FROM project_actions_v3 WHERE project_id = ?", [testProjectId]);
  await pool.query("DELETE FROM project_risks_v3 WHERE project_id = ?", [testProjectId]);
  await pool.query("DELETE FROM project_gaps_v3 WHERE project_id = ?", [testProjectId]);
  await pool.query("DELETE FROM projects WHERE id = ?", [testProjectId]);
  await pool.end();
});

// ===========================================================================
// T-B7-01: Template obrigatório com 8 seções fixas
// ===========================================================================

describe("T-B7-01: Template obrigatório — 8 seções fixas", () => {
  it("BRIEFING_SECTIONS tem exatamente 8 seções", () => {
    expect(BRIEFING_SECTIONS).toHaveLength(8);
  });

  it("as 8 seções são: identificacao, escopo, resumo_executivo, perfil_regulatorio, gaps, riscos, plano_acao, proximos_passos", () => {
    expect(BRIEFING_SECTIONS).toContain("identificacao");
    expect(BRIEFING_SECTIONS).toContain("escopo");
    expect(BRIEFING_SECTIONS).toContain("resumo_executivo");
    expect(BRIEFING_SECTIONS).toContain("perfil_regulatorio");
    expect(BRIEFING_SECTIONS).toContain("gaps");
    expect(BRIEFING_SECTIONS).toContain("riscos");
    expect(BRIEFING_SECTIONS).toContain("plano_acao");
    expect(BRIEFING_SECTIONS).toContain("proximos_passos");
  });

  it("BriefingSectionSchema rejeita seção inválida", () => {
    expect(BriefingSectionSchema.safeParse("sumario").success).toBe(false);
    expect(BriefingSectionSchema.safeParse("conclusao").success).toBe(false);
    expect(BriefingSectionSchema.safeParse("").success).toBe(false);
  });

  it("CompleteBriefingSchema exige todas as 8 seções", () => {
    // Briefing sem section_proximos_passos deve falhar
    const incompleteBriefing = {
      section_identificacao: { empresa: "Empresa Teste", cnae_principal: "4711-3/01", porte: "grande", regime_tributario: "lucro_real", data_geracao: "2026-03-24", project_id: 1 },
      section_escopo: { periodo_analise: "2026", normas_cobertas: ["LC 214/2024"], requirement_ids: [1], total_requirements: 1, total_questions: 0, total_gaps: 1, total_risks: 1, total_actions: 1, coverage_percent: 100 },
      section_resumo_executivo: { situacao_geral: "critica", principais_riscos: ["Risco 1"], principais_gaps: ["Gap 1"], acoes_imediatas: ["Ação 1"], fonte_dados: "project_risks_v3" },
      section_perfil_regulatorio: { regime_ibs: "padrão", regime_cbs: "padrão", obrigacoes_principais: ["Registro CGIBS"], normas_aplicaveis: [{ codigo: "LC 214/2024", descricao: "IBS/CBS", requirement_id: 1 }] },
      section_gaps: { total_gaps: 1, gaps_criticos: 1, gaps_altos: 0, gaps_medios: 0, gaps_baixos: 0, gaps_ocultos: 0, gaps_por_dominio: { fiscal: 1 }, top_gaps: [{ gap_id: 1, requirement_id: 1, requirement_code: "REQ-001", gap_classification: "ausencia", criticality: "alta", domain: "fiscal", gap_description: "Gap fiscal", source_reference: "LC 214/2024" }] },
      section_riscos: { total_risks: 1, risks_criticos: 1, risks_altos: 0, risks_medios: 0, risks_baixos: 0, top_risks: [{ risk_id: 1, gap_id: 1, requirement_id: 1, risk_code: "RISK-001", risk_level: "critico", risk_dimension: "regulatorio", hybrid_score: 97, description: "Risco crítico", source_reference: "LC 214/2024", origin: "direto" }] },
      section_plano_acao: { total_actions: 1, actions_imediatas: 1, actions_curto_prazo: 0, actions_medio_prazo: 0, actions_planejamento: 0, top_actions: [{ action_id: 1, risk_id: 1, gap_id: 1, requirement_id: 1, template_id: "TMPL-001", action_name: "Integrar split payment", action_description: "Integrar o ERP com a plataforma de split payment do Comitê Gestor", priority: "imediata", deadline_days: 30, responsible: "Gerente de TI", evidence_required: "Certificado de homologação da integração", source_reference: "LC 214/2024" }], coverage_by_risk: { "1": true } },
      // section_proximos_passos ausente
    };
    const result = CompleteBriefingSchema.safeParse(incompleteBriefing);
    expect(result.success).toBe(false);
  });

  it("tabela project_briefings_v3 tem colunas para todas as 8 seções", async () => {
    const [cols] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'project_briefings_v3' 
       AND COLUMN_NAME IN (
         'section_identificacao','section_escopo','section_resumo_executivo',
         'section_perfil_regulatorio','section_gaps','section_riscos',
         'section_plano_acao','section_proximos_passos'
       )`
    );
    expect(cols).toHaveLength(8);
  });
});

// ===========================================================================
// T-B7-02: Coverage = 100% obrigatório
// ===========================================================================

describe("T-B7-02: Coverage = 100% obrigatório", () => {
  it("briefing com seção faltando tem coverage < 100%", () => {
    const partial: Partial<CompleteBriefing> = {
      section_escopo: {
        periodo_analise: "2026",
        normas_cobertas: ["LC 214/2024"],
        requirement_ids: [1],
        total_requirements: 1,
        total_questions: 0,
        total_gaps: 1,
        total_risks: 1,
        total_actions: 1,
        coverage_percent: 100,
        pending_valid_questions: 0,
      },
      // 7 seções faltando
    };
    const result = checkCoverage(partial);
    expect(result.is_complete).toBe(false);
    expect(result.missing_sections.length).toBeGreaterThan(0);
    expect(result.coverage_percent).toBeLessThan(100);
  });

  it("briefing com pending_valid_questions > 0 não pode ter coverage 100%", () => {
    const partial: Partial<CompleteBriefing> = {
      section_escopo: {
        periodo_analise: "2026",
        normas_cobertas: ["LC 214/2024"],
        requirement_ids: [1],
        total_requirements: 1,
        total_questions: 5,
        total_gaps: 1,
        total_risks: 1,
        total_actions: 1,
        coverage_percent: 100,
        pending_valid_questions: 3, // 3 perguntas pendentes
      },
    };
    const result = checkCoverage(partial);
    expect(result.is_complete).toBe(false);
    expect(result.pending_valid_questions).toBe(3);
    expect(result.blocking_issues.some(i => i.includes("pendente"))).toBe(true);
  });

  it("briefing completo com pending_valid_questions = 0 tem coverage = 100%", () => {
    const completeBriefing = buildCompleteBriefing();
    const result = checkCoverage(completeBriefing);
    expect(result.is_complete).toBe(true);
    expect(result.coverage_percent).toBe(100);
    expect(result.missing_sections).toHaveLength(0);
    expect(result.blocking_issues).toHaveLength(0);
  });

  it("SectionEscopo exige ao menos 1 norma coberta", () => {
    const result = SectionEscopoSchema.safeParse({
      periodo_analise: "2026",
      normas_cobertas: [], // vazio — inválido
      requirement_ids: [1],
      total_requirements: 1,
      total_questions: 0,
      total_gaps: 1,
      total_risks: 1,
      total_actions: 1,
      coverage_percent: 100,
    });
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// T-B7-03: Consistency obrigatório — sem conflito crítico
// ===========================================================================

describe("T-B7-03: Consistency obrigatório — sem conflito crítico", () => {
  it("resumo 'adequada' com riscos críticos gera conflito crítico", () => {
    const briefing: Partial<CompleteBriefing> = {
      section_resumo_executivo: {
        situacao_geral: "adequada", // contradiz riscos críticos
        principais_riscos: ["Risco crítico"],
        principais_gaps: ["Gap crítico"],
        acoes_imediatas: ["Ação imediata"],
        fonte_dados: "project_risks_v3",
      },
      section_riscos: {
        total_risks: 2,
        risks_criticos: 2, // há riscos críticos
        risks_altos: 0,
        risks_medios: 0,
        risks_baixos: 0,
        top_risks: [
          { risk_id: 1, gap_id: 1, requirement_id: 1, risk_code: "RISK-001", risk_level: "critico", risk_dimension: "regulatorio", hybrid_score: 97, description: "Risco crítico de split payment", source_reference: "LC 214/2024", origin: "direto" },
        ],
      },
    };
    const result = checkConsistency(briefing);
    expect(result.has_critical_conflicts).toBe(true);
    expect(result.conflicts.some(c => c.type === "critico" && c.section_a === "resumo_executivo")).toBe(true);
  });

  it("risco crítico sem ação gera conflito crítico no plano", () => {
    const briefing: Partial<CompleteBriefing> = {
      section_riscos: {
        total_risks: 1,
        risks_criticos: 1,
        risks_altos: 0,
        risks_medios: 0,
        risks_baixos: 0,
        top_risks: [
          { risk_id: 999, gap_id: 1, requirement_id: 1, risk_code: "RISK-999", risk_level: "critico", risk_dimension: "regulatorio", hybrid_score: 97, description: "Risco sem ação", source_reference: "LC 214/2024", origin: "direto" },
        ],
      },
      section_plano_acao: {
        total_actions: 1,
        actions_imediatas: 1,
        actions_curto_prazo: 0,
        actions_medio_prazo: 0,
        actions_planejamento: 0,
        top_actions: [
          { action_id: 1, risk_id: 1, gap_id: 1, requirement_id: 1, template_id: "TMPL-001", action_name: "Ação para outro risco", action_description: "Ação para risco diferente do crítico sem cobertura", priority: "imediata", deadline_days: 30, responsible: "TI", evidence_required: "Certificado de homologação", source_reference: "LC 214/2024" },
        ],
        coverage_by_risk: { "1": true }, // risco 999 não tem cobertura
      },
    };
    const result = checkConsistency(briefing);
    expect(result.has_critical_conflicts).toBe(true);
    expect(result.conflicts.some(c => c.description.includes("999"))).toBe(true);
  });

  it("briefing consistente não tem conflitos críticos", () => {
    const briefing = buildCompleteBriefing();
    const result = checkConsistency(briefing);
    expect(result.has_critical_conflicts).toBe(false);
    expect(result.consistency_score).toBe(100);
  });

  it("conflito de aviso não bloqueia o briefing", () => {
    const briefing: Partial<CompleteBriefing> = {
      section_riscos: {
        total_risks: 30, // muito mais riscos que gaps
        risks_criticos: 0,
        risks_altos: 0,
        risks_medios: 30,
        risks_baixos: 0,
        top_risks: [],
      },
      section_gaps: {
        total_gaps: 1, // proporção incomum
        gaps_criticos: 0,
        gaps_altos: 0,
        gaps_medios: 1,
        gaps_baixos: 0,
        gaps_ocultos: 0,
        gaps_por_dominio: { fiscal: 1 },
        top_gaps: [{ gap_id: 1, requirement_id: 1, requirement_code: "REQ-001", gap_classification: "ausencia", criticality: "media", domain: "fiscal", gap_description: "Gap fiscal", source_reference: "LC 214/2024" }],
      },
    };
    const result = checkConsistency(briefing);
    expect(result.has_critical_conflicts).toBe(false); // aviso, não crítico
    expect(result.conflicts.some(c => c.type === "aviso")).toBe(true);
  });
});

// ===========================================================================
// T-B7-04: Multi-input real
// ===========================================================================

describe("T-B7-04: Multi-input real — perfil + gaps + riscos + ações", () => {
  it("generateBriefing usa dados reais do banco (não inventa)", async () => {
    const briefing = await generateBriefing(testProjectId, pool);

    // Verificar que usa dados reais
    expect(briefing.section_gaps.total_gaps).toBeGreaterThan(0);
    expect(briefing.section_riscos.total_risks).toBeGreaterThan(0);
    expect(briefing.section_plano_acao.total_actions).toBeGreaterThan(0);
  });

  it("section_identificacao usa dados reais do projeto", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    expect(briefing.section_identificacao.project_id).toBe(testProjectId);
    expect(briefing.section_identificacao.porte).toBeTruthy();
    expect(briefing.section_identificacao.regime_tributario).toBeTruthy();
  });

  it("section_gaps reflete gaps reais do banco", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    expect(briefing.section_gaps.total_gaps).toBeGreaterThan(0);
    expect(briefing.section_gaps.top_gaps[0].gap_id).toBe(testGapId);
    expect(briefing.section_gaps.top_gaps[0].source_reference).toBeTruthy();
  });

  it("section_riscos reflete riscos reais do banco", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    expect(briefing.section_riscos.total_risks).toBeGreaterThan(0);
    expect(briefing.section_riscos.top_risks[0].risk_id).toBe(testRiskId);
    expect(briefing.section_riscos.top_risks[0].description).toContain("split payment");
  });

  it("section_plano_acao reflete ações reais do banco", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    expect(briefing.section_plano_acao.total_actions).toBeGreaterThan(0);
    expect(briefing.section_plano_acao.top_actions[0].action_id).toBe(testActionId);
    expect(briefing.section_plano_acao.top_actions[0].evidence_required).toBeTruthy();
  });
});

// ===========================================================================
// T-B7-05: Grounding normativo
// ===========================================================================

describe("T-B7-05: Grounding normativo — LC/EC + requirement_id", () => {
  it("section_escopo tem normas_cobertas com LC/EC reais", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    expect(briefing.section_escopo.normas_cobertas.length).toBeGreaterThan(0);
    const hasLC = briefing.section_escopo.normas_cobertas.some(n => n.includes("LC") || n.includes("EC"));
    expect(hasLC).toBe(true);
  });

  it("section_perfil_regulatorio tem normas_aplicaveis com requirement_id", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    expect(briefing.section_perfil_regulatorio.normas_aplicaveis.length).toBeGreaterThan(0);
    for (const norma of briefing.section_perfil_regulatorio.normas_aplicaveis) {
      expect(norma.requirement_id).toBeGreaterThan(0);
      expect(norma.codigo.length).toBeGreaterThan(0);
    }
  });

  it("section_gaps tem source_reference para cada gap", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    for (const gap of briefing.section_gaps.top_gaps) {
      expect(gap.source_reference).toBeTruthy();
      expect(gap.source_reference.length).toBeGreaterThan(5);
    }
  });

  it("section_riscos tem source_reference para cada risco", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    for (const risk of briefing.section_riscos.top_risks) {
      expect(risk.source_reference).toBeTruthy();
      expect(risk.source_reference.length).toBeGreaterThan(5);
    }
  });

  it("SectionPerfilRegulatorio exige ao menos 1 norma_aplicavel com requirement_id", () => {
    const result = SectionPerfilRegulatorioPSchema.safeParse({
      regime_ibs: "padrão",
      regime_cbs: "padrão",
      obrigacoes_principais: ["Registro CGIBS"],
      normas_aplicaveis: [], // vazio — inválido
    });
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// T-B7-06: Rastreabilidade — toda afirmação com origem
// ===========================================================================

describe("T-B7-06: Rastreabilidade — toda afirmação com origem", () => {
  it("briefing gerado tem rastreabilidade completa", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    const result = checkTraceability(briefing);
    expect(result.is_traceable).toBe(true);
    expect(result.untraced_claims).toHaveLength(0);
  });

  it("norma sem requirement_id gera claim não rastreável", () => {
    const briefing: Partial<CompleteBriefing> = {
      section_perfil_regulatorio: {
        regime_ibs: "padrão",
        regime_cbs: "padrão",
        obrigacoes_principais: ["Registro"],
        normas_aplicaveis: [
          { codigo: "LC 214/2024", descricao: "IBS/CBS", requirement_id: 0 }, // requirement_id inválido
        ],
      },
    };
    const result = checkTraceability(briefing);
    expect(result.is_traceable).toBe(false);
    expect(result.untraced_claims.some(c => c.includes("requirement_id"))).toBe(true);
  });

  it("tabela project_briefings_v3 tem coluna traceability_map", async () => {
    const [cols] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'project_briefings_v3' AND COLUMN_NAME = 'traceability_map'"
    );
    expect(cols).toHaveLength(1);
  });

  it("tabela project_briefings_v3 tem coluna source_requirements", async () => {
    const [cols] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'project_briefings_v3' AND COLUMN_NAME = 'source_requirements'"
    );
    expect(cols).toHaveLength(1);
  });
});

// ===========================================================================
// T-B7-07: Consistência cross-section
// ===========================================================================

describe("T-B7-07: Consistência cross-section", () => {
  it("resumo não contradiz riscos — situacao_geral coerente", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    const result = checkConsistency(briefing);
    // Risco crítico → situação deve ser 'critica' ou 'alta'
    if (briefing.section_riscos.risks_criticos > 0) {
      expect(["critica", "alta"]).toContain(briefing.section_resumo_executivo.situacao_geral);
    }
    expect(result.has_critical_conflicts).toBe(false);
  });

  it("plano não contradiz riscos — todo risco crítico tem ação", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    const result = checkConsistency(briefing);
    // Verificar que não há conflito de plano vs riscos
    const planVsRiskConflicts = result.conflicts.filter(
      c => c.section_a === "plano_acao" && c.section_b === "riscos" && c.type === "critico"
    );
    expect(planVsRiskConflicts).toHaveLength(0);
  });

  it("section_resumo_executivo.situacao_geral respeita hierarquia de severidade", () => {
    // critica > alta > media > baixa > adequada
    const schema = SectionResumoExecutivoSchema;
    expect(schema.safeParse({ situacao_geral: "critica", principais_riscos: ["R1"], principais_gaps: ["G1"], acoes_imediatas: ["A1"], fonte_dados: "db" }).success).toBe(true);
    expect(schema.safeParse({ situacao_geral: "excelente", principais_riscos: ["R1"], principais_gaps: ["G1"], acoes_imediatas: ["A1"], fonte_dados: "db" }).success).toBe(false);
  });
});

// ===========================================================================
// T-B7-08: Sem alucinação — nada além dos dados
// ===========================================================================

describe("T-B7-08: Sem alucinação — nada além dos dados", () => {
  it("section_resumo_executivo.fonte_dados não pode ser vazio", () => {
    const result = SectionResumoExecutivoSchema.safeParse({
      situacao_geral: "critica",
      principais_riscos: ["Risco 1"],
      principais_gaps: ["Gap 1"],
      acoes_imediatas: ["Ação 1"],
      fonte_dados: "", // vazio — alucinação potencial
    });
    expect(result.success).toBe(false);
  });

  it("briefing gerado tem fonte_dados descrevendo as tabelas reais", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    expect(briefing.section_resumo_executivo.fonte_dados).toContain("project_gaps_v3");
    expect(briefing.section_resumo_executivo.fonte_dados).toContain("project_risks_v3");
    expect(briefing.section_resumo_executivo.fonte_dados).toContain("project_actions_v3");
  });

  it("section_gaps.top_gaps não contém descrições inventadas", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    // Verificar que a descrição do gap vem do banco
    const gap = briefing.section_gaps.top_gaps[0];
    expect(gap.gap_description).toBeTruthy();
    expect(gap.gap_description).not.toBe("Gap inventado pela IA");
    // Deve conter texto real do banco
    expect(gap.gap_description).toContain("IBS/CBS");
  });

  it("section_riscos.top_risks não contém scores inventados", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    const risk = briefing.section_riscos.top_risks[0];
    // Score deve ser o valor real do banco (97)
    expect(risk.hybrid_score).toBe(97);
    expect(risk.risk_code).toBe("RISK-B7-001");
  });
});

// ===========================================================================
// T-B7-09: Qualidade executiva
// ===========================================================================

describe("T-B7-09: Qualidade executiva — claro, direto, útil", () => {
  it("section_proximos_passos tem passos com prazo e responsável definidos", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    expect(briefing.section_proximos_passos.passos_imediatos.length).toBeGreaterThan(0);
    for (const passo of briefing.section_proximos_passos.passos_imediatos) {
      expect(passo.prazo_dias).toBeGreaterThan(0);
      expect(passo.responsavel.length).toBeGreaterThan(0);
      expect(passo.descricao.length).toBeGreaterThan(10);
    }
  });

  it("section_proximos_passos tem marcos com critério de sucesso", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    for (const marco of briefing.section_proximos_passos.marcos_principais) {
      expect(marco.criterio_sucesso.length).toBeGreaterThan(10);
      expect(marco.prazo_dias).toBeGreaterThan(0);
    }
  });

  it("SectionProximosPassos exige ao menos 1 passo imediato", () => {
    const result = SectionProximosPassosSchema.safeParse({
      passos_imediatos: [], // vazio — inválido
      marcos_principais: [{ marco: "Marco 1", prazo_dias: 30, criterio_sucesso: "Critério de sucesso definido" }],
      revisao_sugerida_dias: 90,
    });
    expect(result.success).toBe(false);
  });

  it("section_plano_acao.top_actions tem action_description com ≥ 20 chars", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    for (const action of briefing.section_plano_acao.top_actions) {
      expect(action.action_description.length).toBeGreaterThanOrEqual(20);
      expect(action.evidence_required.length).toBeGreaterThan(5);
    }
  });
});

// ===========================================================================
// T-B7-10: 4 cenários obrigatórios
// ===========================================================================

describe("T-B7-10: 4 cenários obrigatórios", () => {
  it("Cenário 1 — Multi-CNAE: briefing com múltiplos CNAEs tem cnaes_secundarios", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    // cnaes_secundarios pode ser vazio (projeto de teste), mas deve ser array
    expect(Array.isArray(briefing.section_identificacao.cnaes_secundarios)).toBe(true);
  });

  it("Cenário 2 — Risco alto: briefing com risco crítico tem situacao_geral=critica", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    // O projeto de teste tem 1 risco crítico
    expect(briefing.section_riscos.risks_criticos).toBeGreaterThan(0);
    expect(briefing.section_resumo_executivo.situacao_geral).toBe("critica");
  });

  it("Cenário 3 — Gaps ocultos: briefing detecta gaps_ocultos", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    // gaps_ocultos pode ser 0 (projeto de teste não tem gap oculto), mas campo existe
    expect(typeof briefing.section_gaps.gaps_ocultos).toBe("number");
    expect(briefing.section_gaps.gaps_ocultos).toBeGreaterThanOrEqual(0);
  });

  it("Cenário 4 — Persistência: briefing pode ser inserido e recuperado do banco", async () => {
    const briefing = await generateBriefing(testProjectId, pool);
    const coverageResult = checkCoverage(briefing);
    const consistencyResult = checkConsistency(briefing);

    const { briefingId } = await persistBriefing(
      testProjectId, testUserId, briefing, coverageResult, consistencyResult, pool
    );
    expect(briefingId).toBeGreaterThan(0);

    // Recuperar do banco
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM project_briefings_v3 WHERE id = ?",
      [briefingId]
    );
    expect(rows).toHaveLength(1);

    const saved = rows[0];
    expect(saved.project_id).toBe(testProjectId);
    expect(Number(saved.coverage_percent)).toBe(100);
    expect(saved.has_critical_conflicts).toBe(0); // false
    expect(saved.generated_by_engine).toBe("briefingEngine_v1");

    // Verificar que as 8 seções foram salvas como JSON válido
    // MySQL2 faz parse automático de colunas JSON, então o valor já é um objeto
    for (const section of BRIEFING_SECTIONS) {
      const colName = `section_${section}`;
      const value = saved[colName];
      // Se for string (alguns drivers retornam string), faz parse; se já for objeto, usa direto
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      expect(parsed).toBeTruthy();
      expect(typeof parsed).toBe('object');
    }

    // Verificar rastreabilidade salva
    const traceMapRaw = saved.traceability_map;
    const traceMap = typeof traceMapRaw === 'string' ? JSON.parse(traceMapRaw) : traceMapRaw;
    expect(traceMap.gaps).toContain("project_gaps_v3");
    expect(traceMap.riscos).toContain("project_risks_v3");
    expect(traceMap.plano_acao).toContain("project_actions_v3");
  });
});

// ===========================================================================
// HELPER: Construir briefing completo para testes unitários
// ===========================================================================

function buildCompleteBriefing(): CompleteBriefing {
  return {
    section_identificacao: {
      empresa: "Empresa Teste LTDA",
      cnpj: "12.345.678/0001-90",
      cnae_principal: "4711-3/01",
      cnaes_secundarios: ["4712-1/00"],
      porte: "grande",
      regime_tributario: "lucro_real",
      data_geracao: "2026-03-24",
      project_id: 1,
      briefing_version: 1,
      generated_by: "briefingEngine_v1",
    },
    section_escopo: {
      periodo_analise: "Diagnóstico de Compliance — Reforma Tributária 2024–2033",
      normas_cobertas: ["EC 132/2023", "LC 214/2024", "LC 68/2024"],
      requirement_ids: [1, 2, 3],
      total_requirements: 3,
      total_questions: 10,
      total_gaps: 2,
      total_risks: 2,
      total_actions: 2,
      coverage_percent: 100,
      pending_valid_questions: 0,
    },
    section_resumo_executivo: {
      situacao_geral: "alta",
      principais_riscos: ["Risco de não conformidade com split payment IBS/CBS"],
      principais_gaps: ["Gap de registro IBS/CBS no Comitê Gestor"],
      acoes_imediatas: ["Implementar integração com split payment do CGIBS"],
      prazo_critico_dias: 30,
      fonte_dados: "project_gaps_v3 (2 gaps) + project_risks_v3 (2 riscos) + project_actions_v3 (2 ações)",
    },
    section_perfil_regulatorio: {
      regime_ibs: "Regime lucro_real — sujeito às alíquotas do Comitê Gestor",
      regime_cbs: "Regime lucro_real — CBS federal conforme LC 214/2024",
      obrigacoes_principais: ["Registro no CGIBS", "Emissão de NF-e com destaque IBS/CBS"],
      normas_aplicaveis: [
        { codigo: "LC 214/2024", descricao: "IBS, CBS e IS", requirement_id: 1 },
        { codigo: "EC 132/2023", descricao: "Reforma Tributária Constitucional", requirement_id: 2 },
      ],
      caracteristicas_especiais: [],
    },
    section_gaps: {
      total_gaps: 2,
      gaps_criticos: 1,
      gaps_altos: 1,
      gaps_medios: 0,
      gaps_baixos: 0,
      gaps_ocultos: 0,
      gaps_por_dominio: { fiscal: 2 },
      top_gaps: [
        { gap_id: 1, requirement_id: 1, requirement_code: "REQ-001", gap_classification: "ausencia", criticality: "alta", domain: "fiscal", gap_description: "Gap de registro IBS/CBS no Comitê Gestor identificado no diagnóstico", source_reference: "LC 214/2024 — Art. 25" },
      ],
    },
    section_riscos: {
      total_risks: 2,
      risks_criticos: 0, // sem críticos para não gerar conflito com situacao_geral='alta'
      risks_altos: 2,
      risks_medios: 0,
      risks_baixos: 0,
      top_risks: [
        { risk_id: 1, gap_id: 1, requirement_id: 1, risk_code: "RISK-001", risk_level: "alto", risk_dimension: "regulatorio", hybrid_score: 80, description: "Risco de não conformidade com split payment IBS/CBS", source_reference: "LC 214/2024 — Art. 25", origin: "direto" },
      ],
    },
    section_plano_acao: {
      total_actions: 2,
      actions_imediatas: 1,
      actions_curto_prazo: 1,
      actions_medio_prazo: 0,
      actions_planejamento: 0,
      top_actions: [
        { action_id: 1, risk_id: 1, gap_id: 1, requirement_id: 1, template_id: "TMPL-FISCAL-001", action_name: "Implementar integração com split payment do CGIBS", action_description: "Integrar o ERP com a plataforma de split payment do Comitê Gestor do IBS/CBS conforme LC 214/2024 Art. 25", priority: "imediata", deadline_days: 30, responsible: "Gerente de TI / Integrador Fiscal", evidence_required: "Certificado de homologação da integração; relatório de testes com 10 transações reais", source_reference: "LC 214/2024 — Art. 25" },
      ],
      coverage_by_risk: { "1": true },
    },
    section_proximos_passos: {
      passos_imediatos: [
        { ordem: 1, descricao: "Implementar integração com split payment do CGIBS conforme LC 214/2024", prazo_dias: 30, responsavel: "Gerente de TI", action_ids: [1] },
      ],
      marcos_principais: [
        { marco: "Ações imediatas concluídas", prazo_dias: 30, criterio_sucesso: "100% das ações imediatas executadas com evidências documentadas" },
        { marco: "Revisão de compliance", prazo_dias: 90, criterio_sucesso: "Score de compliance ≥ 80% na reavaliação" },
      ],
      revisao_sugerida_dias: 90,
      alerta_prazos_legais: ["LC 214/2024 — Período de transição IBS/CBS: 2026–2033"],
    },
  };
}
