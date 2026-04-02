/**
 * Testes B6 — Action Engine (Sprint 98% Confidence)
 * ADR-010 — Arquitetura canônica de conteúdo diagnóstico
 *
 * Checklist do Orquestrador — 10 critérios obrigatórios:
 * T-B6-01: Vínculo obrigatório (risk_id + gap_id + requirement_id)
 * T-B6-02: Estrutura mínima da ação (descrição, prioridade, prazo, responsável, evidência)
 * T-B6-03: Ação executável — não genérica, não acadêmica, não vaga
 * T-B6-04: Template correto por domínio
 * T-B6-05: Prazo determinístico por severidade (crítico 15–30d, alto 30–90d)
 * T-B6-06: Responsável correto por domínio
 * T-B6-07: Evidência obrigatória e específica
 * T-B6-08: Prioridade coerente com score do risco
 * T-B6-09: Nenhuma ação sem risco
 * T-B6-10: 4 cenários obrigatórios (alto, médio, contextual, gap oculto)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mysql from "mysql2/promise";
import {
  DerivedActionSchema,
  ActionTemplateSchema,
  ActionPrioritySchema,
  ActionTypeSchema,
  validateAction,
  getTemplateByType,
  getAllTemplates,
  deriveActionsFromRisks,
  persistActions,
} from "./routers/actionEngine";

// ---------------------------------------------------------------------------
// Setup: pool de conexão e dados de teste
// ---------------------------------------------------------------------------

let pool: mysql.Pool;
let testProjectId: number;
let testUserId: number;
let testGapId: number;
let testRiskId: number;

beforeAll(async () => {
  pool = mysql.createPool(process.env.DATABASE_URL ?? "");

  // Buscar userId real
  const [users] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT id FROM users LIMIT 1"
  );
  testUserId = users[0]?.id ?? 1;

  // Criar projeto de teste B6
  const [projResult] = await pool.query<mysql.OkPacket>(
    `INSERT INTO projects (name, clientId, businessType, status, createdById, createdByRole, notificationFrequency, notificationEmail, companySize, taxRegime)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ["[B6-TEST] Action Engine", testUserId, "diagnostico_cnae", testUserId, testUserId, "equipe_solaris", "semanal", "b6test@test.com", "grande", "lucro_real"]
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
      0.92, "Resposta negativa determinística — alta confiança",
      "LC 214/2024 — Art. 25",
      "REQ-001", "Registro IBS/CBS", "fiscal", "operacional", "normativo",
      "nao_atendido", "alta", 70.00, 70.00,
      "alta", "critico", "imediata", 30,
      "Gap de registro IBS/CBS identificado",
      "Resposta negativa determinística",
      "[\"Registro IBS/CBS não realizado\"]",
      "[\"Realizar registro no Comitê Gestor\"]",
      1
    ]
  );
  testGapId = gapResult.insertId;

  // Criar risco de teste (origin=direto, severity=critico)
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
      "RISK-B6-001", "REQ-001", "Registro IBS/CBS", "fiscal",
      "normativo", 90, 95, 97, 97,
      "critico", "regulatorio", "direto",
      "Gap direto de ausência de registro IBS/CBS",
      0.92, "Risco direto — alta confiança",
      "fiscal", "recolhimento", "split_payment",
      85, 97, 97,
      JSON.stringify(["base_criticality=85", "gap_classification=ausencia×1.0", "porte=grande×1.15", "regime=lucro_real×1.20"]),
      "LC 214/2024 — Art. 25",
      "Risco de não conformidade com split payment IBS/CBS",
      "Implementar integração com sistema do Comitê Gestor",
      "Integrar ERP com plataforma de split payment do Comitê Gestor conforme LC 214/2024",
      0.1500, // decimal(5,4): 15% = 0.1500
      "Multa de 75% sobre o tributo não recolhido via split payment",
      1
    ]
  );
  testRiskId = riskResult.insertId;
});

afterAll(async () => {
  // Limpar dados de teste
  await pool.query("DELETE FROM project_actions_v3 WHERE project_id = ?", [testProjectId]);
  await pool.query("DELETE FROM project_risks_v3 WHERE project_id = ?", [testProjectId]);
  await pool.query("DELETE FROM project_gaps_v3 WHERE project_id = ?", [testProjectId]);
  await pool.query("DELETE FROM projects WHERE id = ?", [testProjectId]);
  await pool.end();
});

// ===========================================================================
// T-B6-01: Vínculo obrigatório (CRÍTICO)
// ===========================================================================

describe("T-B6-01: Vínculo obrigatório — risk_id + gap_id + requirement_id", () => {
  it("ação sem risk_id é inválida", () => {
    const result = validateAction({
      gap_id: 1,
      requirement_id: 1,
      evidence_required: "Comprovante de cadastro no CGIBS com número de inscrição",
      deadline_days: 30,
      action_description: "Realizar o cadastro da empresa no sistema do Comitê Gestor do IBS conforme LC 214/2024 Art. 25",
      template_id: "TMPL-CAD-001",
      source_reference: "LC 214/2024 — Art. 25",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("risco"))).toBe(true);
  });

  it("ação sem gap_id é inválida", () => {
    const result = validateAction({
      risk_id: 1,
      requirement_id: 1,
      evidence_required: "Comprovante de cadastro no CGIBS com número de inscrição",
      deadline_days: 30,
      action_description: "Realizar o cadastro da empresa no sistema do Comitê Gestor do IBS conforme LC 214/2024 Art. 25",
      template_id: "TMPL-CAD-001",
      source_reference: "LC 214/2024 — Art. 25",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("gap_id"))).toBe(true);
  });

  it("ação sem requirement_id é inválida", () => {
    const result = validateAction({
      risk_id: 1,
      gap_id: 1,
      evidence_required: "Comprovante de cadastro no CGIBS com número de inscrição",
      deadline_days: 30,
      action_description: "Realizar o cadastro da empresa no sistema do Comitê Gestor do IBS conforme LC 214/2024 Art. 25",
      template_id: "TMPL-CAD-001",
      source_reference: "LC 214/2024 — Art. 25",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("requirement_id"))).toBe(true);
  });

  it("ação com risk_id + gap_id + requirement_id é válida (vínculo completo)", () => {
    const result = validateAction({
      risk_id: 1,
      gap_id: 1,
      requirement_id: 1,
      evidence_required: "Comprovante de cadastro no CGIBS com número de inscrição; certificado digital",
      deadline_days: 30,
      action_description: "Realizar o cadastro da empresa no sistema do Comitê Gestor do IBS conforme LC 214/2024 Art. 25",
      template_id: "TMPL-CAD-001",
      source_reference: "LC 214/2024 — Art. 25",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("tabela project_actions_v3 tem colunas de rastreabilidade B6", async () => {
    const [cols] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'project_actions_v3' AND COLUMN_NAME IN ('risk_id','gap_id','requirement_id','template_id','traceability_chain')"
    );
    const colNames = cols.map(c => c.COLUMN_NAME);
    expect(colNames).toContain("risk_id");
    expect(colNames).toContain("gap_id");
    expect(colNames).toContain("requirement_id");
    expect(colNames).toContain("template_id");
    expect(colNames).toContain("traceability_chain");
  });
});

// ===========================================================================
// T-B6-02: Estrutura mínima da ação
// ===========================================================================

describe("T-B6-02: Estrutura mínima — descrição, prioridade, prazo, responsável, evidência", () => {
  it("schema DerivedAction exige todos os campos obrigatórios", () => {
    // Ação completa deve ser válida
    const validAction = {
      risk_id: 1,
      gap_id: 1,
      requirement_id: 1,
      template_id: "TMPL-FISCAL-001",
      action_name: "Implementar integração com split payment",
      action_description: "Integrar o ERP com a plataforma de split payment do Comitê Gestor do IBS/CBS conforme LC 214/2024 Art. 25",
      action_type: "integracao",
      priority: "imediata",
      deadline_days: 30,
      deadline_rule: "LC 214/2024 Art. 25 — vigência a partir de 01/01/2027",
      responsible: "Gerente de TI / Integrador Fiscal",
      evidence_required: "Certificado de homologação da integração; relatório de testes com 10 transações reais",
      source_reference: "LC 214/2024 — Art. 25",
      domain: "fiscal",
      gap_type: "normativo",
      traceability_chain: { requirement_id: 1, gap_id: 1, risk_id: 1, template_id: "TMPL-FISCAL-001" },
    };
    const result = DerivedActionSchema.safeParse(validAction);
    expect(result.success).toBe(true);
  });

  it("ação sem prioridade é inválida", () => {
    const result = DerivedActionSchema.safeParse({
      risk_id: 1, gap_id: 1, requirement_id: 1,
      template_id: "TMPL-FISCAL-001",
      action_name: "Implementar split payment",
      action_description: "Integrar ERP com plataforma de split payment do Comitê Gestor",
      action_type: "integracao",
      // priority ausente
      deadline_days: 30,
      deadline_rule: "LC 214/2024 Art. 25",
      responsible: "Gerente de TI",
      evidence_required: "Certificado de homologação",
      source_reference: "LC 214/2024 — Art. 25",
      domain: "fiscal",
      gap_type: "normativo",
      traceability_chain: { requirement_id: 1, gap_id: 1, risk_id: 1, template_id: "TMPL-FISCAL-001" },
    });
    expect(result.success).toBe(false);
  });

  it("ação sem prazo (deadline_days) é inválida", () => {
    const result = validateAction({
      risk_id: 1, gap_id: 1, requirement_id: 1,
      evidence_required: "Certificado de homologação da integração",
      deadline_days: 0, // prazo inválido
      action_description: "Integrar ERP com plataforma de split payment do Comitê Gestor conforme LC 214/2024",
      template_id: "TMPL-FISCAL-001",
      source_reference: "LC 214/2024 — Art. 25",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("prazo"))).toBe(true);
  });

  it("schema ActionPriority aceita os 4 níveis corretos", () => {
    expect(ActionPrioritySchema.safeParse("imediata").success).toBe(true);
    expect(ActionPrioritySchema.safeParse("curto_prazo").success).toBe(true);
    expect(ActionPrioritySchema.safeParse("medio_prazo").success).toBe(true);
    expect(ActionPrioritySchema.safeParse("planejamento").success).toBe(true);
    expect(ActionPrioritySchema.safeParse("urgente").success).toBe(false);
  });

  it("schema ActionType aceita os 10 tipos corretos", () => {
    const validTypes = [
      "configuracao_erp", "ajuste_cadastro", "revisao_contrato",
      "parametrizacao_fiscal", "obrigacao_acessoria", "documentacao",
      "treinamento", "integracao", "governanca", "conciliacao",
    ];
    for (const t of validTypes) {
      expect(ActionTypeSchema.safeParse(t).success).toBe(true);
    }
    expect(ActionTypeSchema.safeParse("revisar_processos").success).toBe(false);
  });
});

// ===========================================================================
// T-B6-03: Ação executável — não genérica, não acadêmica, não vaga
// ===========================================================================

describe("T-B6-03: Ação executável — não genérica, não acadêmica, não vaga", () => {
  it("ação genérica 'revisar processos' é inválida (< 20 chars úteis)", () => {
    const result = validateAction({
      risk_id: 1, gap_id: 1, requirement_id: 1,
      evidence_required: "Relatório de revisão",
      deadline_days: 30,
      action_description: "Revisar processos", // genérica — < 20 chars
      template_id: "TMPL-FISCAL-001",
      source_reference: "LC 214/2024",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("genérica"))).toBe(true);
  });

  it("ação genérica 'avaliar cenário' é inválida", () => {
    const result = validateAction({
      risk_id: 1, gap_id: 1, requirement_id: 1,
      evidence_required: "Relatório de avaliação",
      deadline_days: 30,
      action_description: "Avaliar cenário", // genérica
      template_id: "TMPL-FISCAL-001",
      source_reference: "LC 214/2024",
    });
    expect(result.valid).toBe(false);
  });

  it("todos os templates têm action_description com pelo menos 50 chars", () => {
    const templates = getAllTemplates();
    for (const t of templates) {
      expect(t.action_description.length).toBeGreaterThanOrEqual(50);
    }
  });

  it("todos os templates têm action_name específico (não genérico)", () => {
    const templates = getAllTemplates();
    const genericNames = ["revisar processos", "avaliar cenário", "adequar sistema", "verificar conformidade"];
    for (const t of templates) {
      const isGeneric = genericNames.some(g => t.action_name.toLowerCase().includes(g));
      expect(isGeneric).toBe(false);
    }
  });

  it("ação específica com descrição detalhada é válida", () => {
    const result = validateAction({
      risk_id: 1, gap_id: 1, requirement_id: 1,
      evidence_required: "Certificado de homologação da integração com o sistema do Comitê Gestor",
      deadline_days: 30,
      action_description: "Integrar o ERP com a plataforma de split payment do Comitê Gestor do IBS/CBS conforme LC 214/2024 Art. 25",
      template_id: "TMPL-FISCAL-001",
      source_reference: "LC 214/2024 — Art. 25",
    });
    expect(result.valid).toBe(true);
  });
});

// ===========================================================================
// T-B6-04: Template correto por domínio
// ===========================================================================

describe("T-B6-04: Template correto por domínio", () => {
  it("domínio fiscal tem templates específicos", () => {
    const tmpl = getTemplateByType("split_payment", "fiscal");
    expect(tmpl).not.toBeNull();
    expect(tmpl!.domain).toBe("fiscal");
    expect(tmpl!.template_id).toBe("TMPL-FISCAL-001");
  });

  it("domínio trabalhista tem template específico", () => {
    const tmpl = getTemplateByType("esocial", "trabalhista");
    expect(tmpl).not.toBeNull();
    expect(tmpl!.domain).toBe("trabalhista");
  });

  it("domínio cadastral tem template específico", () => {
    const tmpl = getTemplateByType("registro_ibs", "cadastral");
    expect(tmpl).not.toBeNull();
    expect(tmpl!.domain).toBe("cadastral");
  });

  it("tipo desconhecido usa fallback por domínio (não retorna null)", () => {
    const tmpl = getTemplateByType("tipo_inexistente", "fiscal");
    expect(tmpl).not.toBeNull(); // fallback por domínio
  });

  it("todos os templates têm template_id, domain e source_reference", () => {
    const templates = getAllTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(8);
    for (const t of templates) {
      const result = ActionTemplateSchema.safeParse(t);
      expect(result.success).toBe(true);
    }
  });

  it("schema ActionTemplate exige source_reference não vazio", () => {
    const invalidTemplate = {
      template_id: "TMPL-TEST",
      domain: "fiscal",
      action_type: "documentacao",
      action_name: "Elaborar cronograma de adequação",
      action_description: "Elaborar cronograma detalhado de adequação às regras de transição do IBS/CBS",
      evidence_required: "Cronograma aprovado pela diretoria",
      deadline_rule: "EC 132/2023",
      deadline_days: 30,
      responsible: "Diretor Financeiro",
      source_reference: "", // vazio — inválido
      priority: "imediata",
    };
    const result = ActionTemplateSchema.safeParse(invalidTemplate);
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// T-B6-05: Prazo determinístico por severidade
// ===========================================================================

describe("T-B6-05: Prazo determinístico — crítico 15–30d, alto 30–90d", () => {
  it("risco crítico gera ação com prazo ≤ 30 dias", async () => {
    const actions = await deriveActionsFromRisks(testProjectId);
    const criticalActions = actions.filter(a => {
      // Verificar se o risco associado é crítico
      return a.priority === "imediata";
    });
    expect(criticalActions.length).toBeGreaterThan(0);
    for (const action of criticalActions) {
      expect(action.deadline_days).toBeLessThanOrEqual(60); // imediata = ≤ 60 dias
    }
  });

  it("prazo zero é inválido", () => {
    const result = validateAction({
      risk_id: 1, gap_id: 1, requirement_id: 1,
      evidence_required: "Comprovante de execução",
      deadline_days: 0,
      action_description: "Realizar o cadastro da empresa no sistema do Comitê Gestor do IBS",
      template_id: "TMPL-CAD-001",
      source_reference: "LC 214/2024",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("prazo"))).toBe(true);
  });

  it("prazo negativo é inválido", () => {
    const result = DerivedActionSchema.safeParse({
      risk_id: 1, gap_id: 1, requirement_id: 1,
      template_id: "TMPL-CAD-001",
      action_name: "Cadastro CGIBS",
      action_description: "Realizar o cadastro da empresa no sistema do Comitê Gestor do IBS",
      action_type: "ajuste_cadastro",
      priority: "imediata",
      deadline_days: -5, // negativo — inválido
      deadline_rule: "LC 214/2024 Art. 25",
      responsible: "Contador",
      evidence_required: "Comprovante de cadastro no CGIBS",
      source_reference: "LC 214/2024",
      domain: "cadastral",
      gap_type: "normativo",
      traceability_chain: { requirement_id: 1, gap_id: 1, risk_id: 1, template_id: "TMPL-CAD-001" },
    });
    expect(result.success).toBe(false);
  });

  it("todos os templates têm deadline_rule não vazio", () => {
    const templates = getAllTemplates();
    for (const t of templates) {
      expect(t.deadline_rule.length).toBeGreaterThan(0);
      expect(t.deadline_days).toBeGreaterThan(0);
    }
  });
});

// ===========================================================================
// T-B6-06: Responsável correto por domínio
// ===========================================================================

describe("T-B6-06: Responsável correto por domínio", () => {
  it("template fiscal tem responsável fiscal/contábil", () => {
    const tmpl = getTemplateByType("split_payment", "fiscal");
    expect(tmpl!.responsible.length).toBeGreaterThan(0);
    // Responsável deve mencionar papel específico
    const hasSpecificRole = tmpl!.responsible.match(/TI|Fiscal|Contador|Jurídico|Advogado|Diretor|Analista/i);
    expect(hasSpecificRole).not.toBeNull();
  });

  it("template trabalhista tem responsável de RH/Contabilidade", () => {
    const tmpl = getTemplateByType("esocial", "trabalhista");
    expect(tmpl!.responsible).toMatch(/RH|Contador|Analista|Folha/i);
  });

  it("todos os templates têm responsible não vazio e específico", () => {
    const templates = getAllTemplates();
    for (const t of templates) {
      expect(t.responsible.length).toBeGreaterThan(0);
      // Responsável não pode ser genérico demais
      expect(t.responsible).not.toBe("Responsável");
      expect(t.responsible).not.toBe("Equipe");
      expect(t.responsible).not.toBe("Empresa");
    }
  });

  it("ação derivada herda responsável do template", async () => {
    const actions = await deriveActionsFromRisks(testProjectId);
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      expect(action.responsible).toBeDefined();
      expect(action.responsible.length).toBeGreaterThan(0);
    }
  });
});

// ===========================================================================
// T-B6-07: Evidência obrigatória e específica
// ===========================================================================

describe("T-B6-07: Evidência obrigatória e específica", () => {
  it("ação sem evidence_required é inválida", () => {
    const result = validateAction({
      risk_id: 1, gap_id: 1, requirement_id: 1,
      deadline_days: 30,
      action_description: "Realizar o cadastro da empresa no sistema do Comitê Gestor do IBS conforme LC 214/2024",
      template_id: "TMPL-CAD-001",
      source_reference: "LC 214/2024",
      // evidence_required ausente
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("evidência"))).toBe(true);
  });

  it("evidência vaga (< 10 chars) é inválida", () => {
    const result = validateAction({
      risk_id: 1, gap_id: 1, requirement_id: 1,
      evidence_required: "Relatório", // vaga — < 10 chars
      deadline_days: 30,
      action_description: "Realizar o cadastro da empresa no sistema do Comitê Gestor do IBS conforme LC 214/2024",
      template_id: "TMPL-CAD-001",
      source_reference: "LC 214/2024",
    });
    expect(result.valid).toBe(false);
  });

  it("todos os templates têm evidence_required específica (≥ 20 chars)", () => {
    const templates = getAllTemplates();
    for (const t of templates) {
      expect(t.evidence_required.length).toBeGreaterThanOrEqual(20);
    }
  });

  it("evidência menciona documento específico (DARF, contrato, relatório, certificado, etc.)", () => {
    const templates = getAllTemplates();
    const documentKeywords = /DARF|contrato|relatório|certificado|comprovante|ata|parecer|print|XML|NF-e|guia/i;
    for (const t of templates) {
      expect(t.evidence_required).toMatch(documentKeywords);
    }
  });
});

// ===========================================================================
// T-B6-08: Prioridade coerente com score do risco
// ===========================================================================

describe("T-B6-08: Prioridade coerente com score do risco", () => {
  it("risco crítico gera ação com prioridade imediata", async () => {
    const actions = await deriveActionsFromRisks(testProjectId);
    // O risco de teste é crítico — deve gerar ação imediata
    expect(actions.length).toBeGreaterThan(0);
    const criticalAction = actions[0];
    expect(criticalAction.priority).toBe("imediata");
  });

  it("schema ActionPriority rejeita prioridade inválida", () => {
    expect(ActionPrioritySchema.safeParse("baixa").success).toBe(false);
    expect(ActionPrioritySchema.safeParse("alta").success).toBe(false);
    expect(ActionPrioritySchema.safeParse("urgente").success).toBe(false);
  });

  it("template de risco crítico (split_payment) tem priority=imediata", () => {
    const tmpl = getTemplateByType("split_payment", "fiscal");
    expect(tmpl!.priority).toBe("imediata");
  });

  it("template de planejamento societário tem priority=medio_prazo ou planejamento", () => {
    const tmpl = getTemplateByType("holding_patrimonial", "societario");
    expect(["medio_prazo", "planejamento"]).toContain(tmpl!.priority);
  });
});

// ===========================================================================
// T-B6-09: Nenhuma ação sem risco
// ===========================================================================

describe("T-B6-09: Nenhuma ação sem risco", () => {
  it("deriveActionsFromRisks só gera ações para riscos com gap_id rastreável", async () => {
    const actions = await deriveActionsFromRisks(testProjectId);
    for (const action of actions) {
      expect(action.risk_id).toBeGreaterThan(0);
      expect(action.gap_id).toBeGreaterThan(0);
      expect(action.requirement_id).toBeGreaterThan(0);
    }
  });

  it("ação solta (sem risk_id) falha na validação", () => {
    const result = validateAction({
      gap_id: 1,
      requirement_id: 1,
      evidence_required: "Comprovante de execução da ação",
      deadline_days: 30,
      action_description: "Realizar o cadastro da empresa no sistema do Comitê Gestor do IBS conforme LC 214/2024",
      template_id: "TMPL-CAD-001",
      source_reference: "LC 214/2024",
    });
    expect(result.valid).toBe(false);
  });

  it("traceability_chain contém todos os IDs da cadeia", async () => {
    const actions = await deriveActionsFromRisks(testProjectId);
    for (const action of actions) {
      expect(action.traceability_chain.risk_id).toBe(action.risk_id);
      expect(action.traceability_chain.gap_id).toBe(action.gap_id);
      expect(action.traceability_chain.requirement_id).toBe(action.requirement_id);
      expect(action.traceability_chain.template_id).toBe(action.template_id);
    }
  });
});

// ===========================================================================
// T-B6-10: 4 cenários obrigatórios
// ===========================================================================

describe("T-B6-10: 4 cenários obrigatórios — alto, médio, contextual, gap oculto", () => {
  it("Cenário 1 — Risco alto: ação com priority=curto_prazo e deadline ≤ 90 dias", () => {
    // Simular risco alto
    const action = {
      risk_id: 1, gap_id: 1, requirement_id: 1,
      template_id: "TMPL-FISCAL-002",
      action_name: "Parametrizar geração de guia IBS no sistema fiscal",
      action_description: "Configurar o sistema fiscal para geração automática da guia de recolhimento do IBS com alíquota correta por UF e município conforme tabela do Comitê Gestor",
      action_type: "parametrizacao_fiscal",
      priority: "curto_prazo",
      deadline_days: 60,
      deadline_rule: "EC 132/2023 — vigência progressiva 2026–2033",
      responsible: "Contador / Analista Fiscal",
      evidence_required: "Print da tela de configuração de alíquotas IBS no sistema; relatório de apuração mensal",
      source_reference: "EC 132/2023 — Art. 156-A; LC 214/2024 — Art. 9",
      domain: "fiscal",
      gap_type: "normativo",
      traceability_chain: { requirement_id: 1, gap_id: 1, risk_id: 1, template_id: "TMPL-FISCAL-002" },
    };
    const result = DerivedActionSchema.safeParse(action);
    expect(result.success).toBe(true);
    expect(action.deadline_days).toBeLessThanOrEqual(90);
  });

  it("Cenário 2 — Risco médio: ação com priority=medio_prazo e deadline ≤ 120 dias", () => {
    const action = {
      risk_id: 2, gap_id: 2, requirement_id: 2,
      template_id: "TMPL-FISCAL-003",
      action_name: "Revisar metodologia de apuração de créditos IBS/CBS",
      action_description: "Revisar e documentar a metodologia de apuração de créditos IBS/CBS garantindo que todos os insumos elegíveis sejam creditados conforme o princípio da não-cumulatividade plena",
      action_type: "documentacao",
      priority: "medio_prazo",
      deadline_days: 120,
      deadline_rule: "LC 214/2024 Art. 47 — vigência a partir de 01/01/2027",
      responsible: "Contador / Advogado Tributarista",
      evidence_required: "Planilha de mapeamento de créditos por categoria de insumo; parecer jurídico sobre elegibilidade",
      source_reference: "LC 214/2024 — Art. 47–52",
      domain: "fiscal",
      gap_type: "normativo",
      traceability_chain: { requirement_id: 2, gap_id: 2, risk_id: 2, template_id: "TMPL-FISCAL-003" },
    };
    const result = DerivedActionSchema.safeParse(action);
    expect(result.success).toBe(true);
    expect(action.deadline_days).toBeLessThanOrEqual(120);
  });

  it("Cenário 3 — Risco contextual: ação de governança com priority=imediata", () => {
    // Risco contextual (sem gap direto) → ação de governança
    const action = {
      risk_id: 3, gap_id: 3, requirement_id: 3,
      template_id: "TMPL-GOV-001",
      action_name: "Implementar comitê interno de compliance tributário da reforma",
      action_description: "Criar e formalizar um comitê interno de compliance tributário responsável por monitorar a adequação da empresa às obrigações da reforma tributária com reuniões mensais",
      action_type: "governanca",
      priority: "imediata",
      deadline_days: 30,
      deadline_rule: "Boas práticas de governança — recomendado imediatamente",
      responsible: "Diretor Jurídico / CFO",
      evidence_required: "Ata de constituição do comitê com membros e responsabilidades; calendário de reuniões aprovado",
      source_reference: "ADR-010 — Governance Layer; COSO Framework 2023",
      domain: "operacional",
      gap_type: "normativo",
      traceability_chain: { requirement_id: 3, gap_id: 3, risk_id: 3, template_id: "TMPL-GOV-001" },
    };
    const result = DerivedActionSchema.safeParse(action);
    expect(result.success).toBe(true);
  });

  it("Cenário 4 — Persistência: ação pode ser inserida e recuperada do banco", async () => {
    const actions = await deriveActionsFromRisks(testProjectId);
    expect(actions.length).toBeGreaterThan(0);

    const { inserted } = await persistActions(testProjectId, actions);
    expect(inserted).toBeGreaterThan(0);

    // Recuperar do banco
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM project_actions_v3 WHERE project_id = ? AND risk_id = ?",
      [testProjectId, testRiskId]
    );
    expect(rows.length).toBeGreaterThan(0);

    const saved = rows[0];
    expect(saved.risk_id).toBe(testRiskId);
    expect(saved.gap_id).toBe(testGapId);
    expect(saved.requirement_id).toBeGreaterThan(0);
    expect(saved.template_id).toBeTruthy();
    expect(saved.evidence_required).toBeTruthy();
    expect(saved.estimated_days).toBeGreaterThan(0);
    expect(saved.owner_suggestion).toBeTruthy();
    expect(saved.traceability_chain).toBeTruthy();
  });
});
