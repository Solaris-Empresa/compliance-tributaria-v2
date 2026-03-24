/**
 * Action Engine — B6 (Sprint 98% Confidence)
 * ADR-010 — Arquitetura canônica de conteúdo diagnóstico
 *
 * Responsabilidades:
 * - Gerar ações executáveis a partir de riscos classificados (rastreabilidade obrigatória)
 * - Templates de ação por domínio (fiscal, trabalhista, societário, etc.)
 * - Rastreabilidade completa: risk_id → gap_id → requirement_id → template_id
 * - Prazos determinísticos por regra (deadline_rule)
 * - Evidência obrigatória em toda ação
 * - Ação sem risco → inválida
 * - Ação sem evidência → inválida
 * - Ação sem prazo → inválida
 * - Ação genérica → inválida
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import mysql from "mysql2/promise";

// ---------------------------------------------------------------------------
// Pool de conexão
// ---------------------------------------------------------------------------

let _pool: mysql.Pool | null = null;
function getPool(): mysql.Pool {
  if (!_pool) {
    _pool = mysql.createPool(process.env.DATABASE_URL ?? "");
  }
  return _pool;
}

// ---------------------------------------------------------------------------
// Schemas públicos (exportados para testes)
// ---------------------------------------------------------------------------

export const ActionPrioritySchema = z.enum(["imediata", "curto_prazo", "medio_prazo", "planejamento"]);
export type ActionPriority = z.infer<typeof ActionPrioritySchema>;

export const ActionTypeSchema = z.enum([
  "configuracao_erp",
  "ajuste_cadastro",
  "revisao_contrato",
  "parametrizacao_fiscal",
  "obrigacao_acessoria",
  "documentacao",
  "treinamento",
  "integracao",
  "governanca",
  "conciliacao",
]);
export type ActionType = z.infer<typeof ActionTypeSchema>;

export const ActionTemplateSchema = z.object({
  template_id: z.string().min(1),
  domain: z.string().min(1),
  action_type: ActionTypeSchema,
  action_name: z.string().min(1),
  action_description: z.string().min(20), // Ação genérica → inválida
  evidence_required: z.string().min(10),  // Evidência obrigatória
  deadline_rule: z.string().min(1),       // Prazo obrigatório
  deadline_days: z.number().int().positive(),
  responsible: z.string().min(1),
  source_reference: z.string().min(1),    // Rastreabilidade normativa
  priority: ActionPrioritySchema,
});
export type ActionTemplate = z.infer<typeof ActionTemplateSchema>;

export const DerivedActionSchema = z.object({
  risk_id: z.number().int().positive(),   // Ação sem risco → inválida
  gap_id: z.number().int().positive(),    // Rastreabilidade gap
  requirement_id: z.number().int().positive(), // Rastreabilidade requisito
  template_id: z.string().min(1),
  action_description: z.string().min(20),
  action_name: z.string().min(1),
  action_type: ActionTypeSchema,
  priority: ActionPrioritySchema,
  deadline_days: z.number().int().positive(), // Prazo obrigatório
  deadline_rule: z.string().min(1),
  responsible: z.string().min(1),
  evidence_required: z.string().min(10),  // Evidência obrigatória
  source_reference: z.string().min(1),
  traceability_chain: z.object({
    requirement_id: z.number(),
    gap_id: z.number(),
    risk_id: z.number(),
    template_id: z.string(),
  }),
  domain: z.string().min(1),
  gap_type: z.string().min(1),
});
export type DerivedAction = z.infer<typeof DerivedActionSchema>;

// ---------------------------------------------------------------------------
// Templates de ação por domínio (ADR-010 — Biblioteca canônica)
// ---------------------------------------------------------------------------

// Mapa: risk_category_l3 (tipo) → template de ação
const ACTION_TEMPLATES: Record<string, ActionTemplate> = {
  // ── FISCAL / RECOLHIMENTO ──────────────────────────────────────────────
  split_payment: {
    template_id: "TMPL-FISCAL-001",
    domain: "fiscal",
    action_type: "integracao",
    action_name: "Implementar integração com sistema de split payment do Comitê Gestor",
    action_description:
      "Integrar o ERP/sistema de faturamento com a plataforma de split payment do Comitê Gestor do IBS/CBS, " +
      "conforme LC 214/2024 Art. 25. A integração deve garantir que o recolhimento automático de IBS e CBS " +
      "ocorra no momento da liquidação financeira, sem necessidade de guia manual.",
    evidence_required:
      "Certificado de homologação da integração com o sistema do Comitê Gestor; " +
      "relatório de testes de split payment com pelo menos 10 transações reais; " +
      "print do painel de monitoramento mostrando recolhimentos automáticos.",
    deadline_rule: "LC 214/2024 Art. 25 — vigência a partir de 01/01/2027 (fase 1 de transição)",
    deadline_days: 180,
    responsible: "Gerente de TI / Integrador Fiscal",
    source_reference: "LC 214/2024 — Art. 25; Resolução CGSN 162/2023",
    priority: "imediata",
  },
  guia_ibs: {
    template_id: "TMPL-FISCAL-002",
    domain: "fiscal",
    action_type: "parametrizacao_fiscal",
    action_name: "Parametrizar geração de guia IBS no sistema fiscal",
    action_description:
      "Configurar o sistema fiscal para geração automática da guia de recolhimento do IBS (Imposto sobre Bens e Serviços), " +
      "com alíquota correta por UF e município, conforme tabela do Comitê Gestor. " +
      "Validar cálculo de base de cálculo, créditos e débitos conforme EC 132/2023.",
    evidence_required:
      "Print da tela de configuração de alíquotas IBS no sistema; " +
      "relatório de apuração mensal com segregação IBS por UF; " +
      "DARF/guia de recolhimento gerada corretamente.",
    deadline_rule: "EC 132/2023 — vigência progressiva 2026–2033",
    deadline_days: 90,
    responsible: "Contador / Analista Fiscal",
    source_reference: "EC 132/2023 — Art. 156-A; LC 214/2024 — Art. 9",
    priority: "curto_prazo",
  },
  credito_iva: {
    template_id: "TMPL-FISCAL-003",
    domain: "fiscal",
    action_type: "parametrizacao_fiscal",
    action_name: "Revisar metodologia de apuração de créditos IBS/CBS",
    action_description:
      "Revisar e documentar a metodologia de apuração de créditos IBS/CBS, garantindo que todos os insumos " +
      "elegíveis sejam creditados conforme o princípio da não-cumulatividade plena (LC 214/2024 Art. 47). " +
      "Incluir mapeamento de atividades com crédito restrito ou vedado.",
    evidence_required:
      "Planilha de mapeamento de créditos por categoria de insumo; " +
      "parecer jurídico sobre elegibilidade de créditos; " +
      "relatório de apuração com segregação crédito/débito.",
    deadline_rule: "LC 214/2024 Art. 47 — vigência a partir de 01/01/2027",
    deadline_days: 120,
    responsible: "Contador / Advogado Tributarista",
    source_reference: "LC 214/2024 — Art. 47–52; EC 132/2023 — Art. 156-A §5",
    priority: "curto_prazo",
  },
  // ── FISCAL / OBRIGAÇÃO ACESSÓRIA ──────────────────────────────────────
  nfe: {
    template_id: "TMPL-FISCAL-004",
    domain: "fiscal",
    action_type: "obrigacao_acessoria",
    action_name: "Atualizar layout NF-e para campos IBS/CBS",
    action_description:
      "Atualizar o layout da Nota Fiscal Eletrônica (NF-e) para incluir os campos obrigatórios de " +
      "IBS e CBS conforme NT 2024.001 da SEFAZ. Validar com o ambiente de homologação da SEFAZ " +
      "e atualizar o certificado digital se necessário.",
    evidence_required:
      "XML de NF-e homologada com campos IBS/CBS preenchidos; " +
      "relatório de validação do ambiente de homologação SEFAZ; " +
      "manual de operação atualizado para emissão de NF-e.",
    deadline_rule: "NT 2024.001 SEFAZ — obrigatório a partir de 01/07/2026",
    deadline_days: 60,
    responsible: "Analista Fiscal / TI",
    source_reference: "NT 2024.001 SEFAZ; LC 214/2024 — Art. 70",
    priority: "imediata",
  },
  nfse: {
    template_id: "TMPL-FISCAL-005",
    domain: "fiscal",
    action_type: "obrigacao_acessoria",
    action_name: "Migrar para NFS-e Nacional (padrão ABRASF v3)",
    action_description:
      "Migrar a emissão de Nota Fiscal de Serviços Eletrônica (NFS-e) para o padrão nacional " +
      "ABRASF v3, conforme LC 214/2024 Art. 71. Desativar NFS-e municipal legada após homologação. " +
      "Garantir segregação CBS no XML.",
    evidence_required:
      "NFS-e emitida no padrão ABRASF v3 com CBS destacada; " +
      "confirmação de credenciamento no sistema nacional; " +
      "relatório de migração de NFS-e municipais anteriores.",
    deadline_rule: "LC 214/2024 Art. 71 — obrigatório a partir de 01/01/2027",
    deadline_days: 90,
    responsible: "Analista Fiscal / TI",
    source_reference: "LC 214/2024 — Art. 71; Resolução CGSN 162/2023",
    priority: "curto_prazo",
  },
  // ── FISCAL / TRANSIÇÃO ────────────────────────────────────────────────
  periodo_transicao: {
    template_id: "TMPL-FISCAL-006",
    domain: "fiscal",
    action_type: "documentacao",
    action_name: "Elaborar cronograma de adequação ao período de transição IBS/CBS",
    action_description:
      "Elaborar cronograma detalhado de adequação às regras de transição do IBS/CBS (2026–2033), " +
      "incluindo datas-chave de vigência de alíquotas progressivas, obrigações acessórias e " +
      "extinção de tributos substituídos (PIS, COFINS, ISS, ICMS parcial).",
    evidence_required:
      "Cronograma aprovado pela diretoria com datas e responsáveis; " +
      "matriz de impacto por tributo substituído; " +
      "ata de reunião de alinhamento com equipe contábil.",
    deadline_rule: "EC 132/2023 — Art. 348 (disposições transitórias)",
    deadline_days: 30,
    responsible: "Diretor Financeiro / Contador",
    source_reference: "EC 132/2023 — Art. 348–368; LC 214/2024 — Art. 350",
    priority: "imediata",
  },
  // ── TRABALHISTA ────────────────────────────────────────────────────────
  esocial: {
    template_id: "TMPL-TRAB-001",
    domain: "trabalhista",
    action_type: "obrigacao_acessoria",
    action_name: "Adequar eventos eSocial para nova tributação da folha",
    action_description:
      "Revisar e adequar os eventos eSocial (S-1200, S-2300, S-5001) para refletir as mudanças " +
      "na tributação da folha de pagamento decorrentes da reforma tributária. " +
      "Validar cálculo de INSS e contribuições sociais conforme nova legislação.",
    evidence_required:
      "Relatório de transmissão eSocial sem erros por 3 meses consecutivos; " +
      "parecer do contador sobre adequação dos eventos; " +
      "print do painel eSocial com status 'processado com sucesso'.",
    deadline_rule: "Portaria MF 1.320/2024 — vigência a partir de 01/01/2026",
    deadline_days: 60,
    responsible: "Analista de RH / Contador",
    source_reference: "Portaria MF 1.320/2024; EC 132/2023 — Art. 195",
    priority: "imediata",
  },
  // ── SOCIETÁRIO ────────────────────────────────────────────────────────
  holding_patrimonial: {
    template_id: "TMPL-SOC-001",
    domain: "societario",
    action_type: "revisao_contrato",
    action_name: "Revisar estrutura societária para otimização tributária pós-reforma",
    action_description:
      "Revisar a estrutura societária da empresa para identificar oportunidades de otimização " +
      "tributária no contexto da reforma (IBS/CBS), incluindo análise de holdings patrimoniais, " +
      "reorganizações societárias e regimes especiais disponíveis.",
    evidence_required:
      "Parecer jurídico-tributário sobre estrutura societária; " +
      "relatório de simulação de carga tributária antes/depois; " +
      "ata de aprovação da estrutura pela diretoria.",
    deadline_rule: "Planejamento tributário — recomendado antes de 01/01/2027",
    deadline_days: 180,
    responsible: "Advogado Societário / Diretor Financeiro",
    source_reference: "LC 214/2024 — Art. 200–210; EC 132/2023 — Art. 156-A",
    priority: "medio_prazo",
  },
  // ── OPERACIONAL / CADASTRAL ───────────────────────────────────────────
  registro_ibs: {
    template_id: "TMPL-CAD-001",
    domain: "cadastral",
    action_type: "ajuste_cadastro",
    action_name: "Realizar cadastro no sistema do Comitê Gestor do IBS",
    action_description:
      "Realizar o cadastro da empresa no sistema do Comitê Gestor do IBS (CGIBS), " +
      "incluindo habilitação para emissão de documentos fiscais eletrônicos com IBS destacado " +
      "e acesso ao portal de apuração e recolhimento.",
    evidence_required:
      "Comprovante de cadastro no CGIBS com número de inscrição; " +
      "certificado digital atualizado para acesso ao portal; " +
      "confirmação de acesso ao painel de apuração.",
    deadline_rule: "LC 214/2024 Art. 25 — cadastro obrigatório antes de 01/01/2027",
    deadline_days: 90,
    responsible: "Contador / Responsável Fiscal",
    source_reference: "LC 214/2024 — Art. 25; Resolução CGSN 162/2023",
    priority: "imediata",
  },
  // ── GOVERNANÇA ────────────────────────────────────────────────────────
  governanca_tributaria: {
    template_id: "TMPL-GOV-001",
    domain: "operacional",
    action_type: "governanca",
    action_name: "Implementar comitê interno de compliance tributário da reforma",
    action_description:
      "Criar e formalizar um comitê interno de compliance tributário responsável por monitorar " +
      "a adequação da empresa às obrigações da reforma tributária, com reuniões mensais, " +
      "relatórios de progresso e escalada de riscos para a diretoria.",
    evidence_required:
      "Ata de constituição do comitê com membros e responsabilidades; " +
      "calendário de reuniões aprovado; " +
      "relatório do primeiro trimestre de monitoramento.",
    deadline_rule: "Boas práticas de governança — recomendado imediatamente",
    deadline_days: 30,
    responsible: "Diretor Jurídico / CFO",
    source_reference: "ADR-010 — Governance Layer; COSO Framework 2023",
    priority: "imediata",
  },
};

// Mapa de fallback por domínio (quando não há template específico para o tipo)
const DOMAIN_FALLBACK_TEMPLATES: Record<string, string> = {
  fiscal: "TMPL-FISCAL-006",
  trabalhista: "TMPL-TRAB-001",
  societario: "TMPL-SOC-001",
  cadastral: "TMPL-CAD-001",
  operacional: "TMPL-GOV-001",
  contratual: "TMPL-SOC-001",
};

// ---------------------------------------------------------------------------
// Regras de prazo por severidade (deadline_rule determinístico)
// ---------------------------------------------------------------------------

const DEADLINE_BY_SEVERITY: Record<string, { days: number; priority: ActionPriority }> = {
  critico: { days: 30, priority: "imediata" },
  alto: { days: 60, priority: "curto_prazo" },
  medio: { days: 120, priority: "medio_prazo" },
  baixo: { days: 180, priority: "planejamento" },
};

// ---------------------------------------------------------------------------
// Função principal: derivar ações a partir de riscos
// ---------------------------------------------------------------------------

export async function deriveActionsFromRisks(
  projectId: number
): Promise<DerivedAction[]> {
  const db = getPool();

  // Buscar riscos do projeto com dados de gap e requisito
  const [risks] = await db.query<mysql.RowDataPacket[]>(
    `SELECT
       r.id AS risk_id,
       r.gap_id,
       r.requirement_id,
       r.risk_level AS severity,
       r.risk_category_l1 AS domain,
       r.risk_category_l2 AS category,
       r.risk_category_l3 AS type,
       r.source_reference,
       r.description AS risk_description,
       r.origin,
       g.gap_classification,
       g.gap_type,
       g.requirement_code,
       g.requirement_name,
       g.domain AS gap_domain
     FROM project_risks_v3 r
     LEFT JOIN project_gaps_v3 g ON r.gap_id = g.id
     WHERE r.project_id = ?
       AND r.gap_id IS NOT NULL
     ORDER BY
       CASE r.risk_level
         WHEN 'critico' THEN 1
         WHEN 'alto' THEN 2
         WHEN 'medio' THEN 3
         WHEN 'baixo' THEN 4
       END`,
    [projectId]
  );

  const actions: DerivedAction[] = [];

  for (const risk of risks) {
    // Ação sem risco → inválida (garantido pelo WHERE gap_id IS NOT NULL)
    if (!risk.risk_id || !risk.gap_id || !risk.requirement_id) continue;

    // Selecionar template por tipo de risco
    const riskType = risk.type || "";
    const riskDomain = risk.domain || risk.gap_domain || "fiscal";

    let template = ACTION_TEMPLATES[riskType];

    // Fallback por domínio se não houver template específico
    if (!template) {
      const fallbackId = DOMAIN_FALLBACK_TEMPLATES[riskDomain] || "TMPL-FISCAL-006";
      template = ACTION_TEMPLATES[Object.keys(ACTION_TEMPLATES).find(k => ACTION_TEMPLATES[k].template_id === fallbackId) || "periodo_transicao"];
    }

    if (!template) continue;

    // Prazo determinístico por severidade
    const deadlineRule = DEADLINE_BY_SEVERITY[risk.severity] || DEADLINE_BY_SEVERITY["medio"];

    // Ajustar prazo: usar o menor entre o template e a regra de severidade
    const finalDays = Math.min(template.deadline_days, deadlineRule.days * 2);
    const finalPriority = deadlineRule.priority;

    // Construir ação com rastreabilidade completa
    const action: DerivedAction = {
      risk_id: risk.risk_id,
      gap_id: risk.gap_id,
      requirement_id: risk.requirement_id,
      template_id: template.template_id,
      action_name: template.action_name,
      action_description: template.action_description,
      action_type: template.action_type,
      priority: finalPriority,
      deadline_days: finalDays,
      deadline_rule: template.deadline_rule,
      responsible: template.responsible,
      evidence_required: template.evidence_required,
      source_reference: risk.source_reference || template.source_reference,
      domain: riskDomain,
      gap_type: risk.gap_type || "normativo",
      traceability_chain: {
        requirement_id: risk.requirement_id,
        gap_id: risk.gap_id,
        risk_id: risk.risk_id,
        template_id: template.template_id,
      },
    };

    // Validar ação antes de incluir
    const validation = DerivedActionSchema.safeParse(action);
    if (!validation.success) {
      console.warn(`[ActionEngine] Ação inválida para risk_id=${risk.risk_id}:`, validation.error.issues);
      continue;
    }

    actions.push(action);
  }

  return actions;
}

// ---------------------------------------------------------------------------
// Função de persistência
// ---------------------------------------------------------------------------

export async function persistActions(
  projectId: number,
  actions: DerivedAction[]
): Promise<{ inserted: number; updated: number }> {
  const db = getPool();
  let inserted = 0;
  let updated = 0;

  // Buscar client_id do projeto
  const [projs] = await db.query<mysql.RowDataPacket[]>(
    "SELECT clientId FROM projects WHERE id = ?",
    [projectId]
  );
  const clientId = projs[0]?.clientId ?? 0;

  for (const action of actions) {
    // Verificar se já existe ação para este risco
    const [existing] = await db.query<mysql.RowDataPacket[]>(
      "SELECT id FROM project_actions_v3 WHERE project_id = ? AND risk_id = ?",
      [projectId, action.risk_id]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE project_actions_v3 SET
           gap_id = ?, requirement_id = ?, template_id = ?,
           action_name = ?, action_desc = ?, action_description = ?,
           action_type = ?, action_priority = ?,
           estimated_days = ?, deadline_rule = ?,
           owner_suggestion = ?, evidence_required = ?,
           source_reference = ?, traceability_chain = ?,
           updated_at = NOW()
         WHERE project_id = ? AND risk_id = ?`,
        [
          action.gap_id, action.requirement_id, action.template_id,
          action.action_name, action.action_description, action.action_description,
          action.action_type, action.priority,
          action.deadline_days, action.deadline_rule,
          action.responsible, action.evidence_required,
          action.source_reference, JSON.stringify(action.traceability_chain),
          projectId, action.risk_id,
        ]
      );
      updated++;
    } else {
      await db.query(
        `INSERT INTO project_actions_v3 (
           client_id, project_id, risk_id, gap_id, requirement_id, template_id,
           requirement_code, risk_code, domain, gap_type,
           action_code, action_name, action_desc, action_description,
           action_type, action_priority, estimated_days, deadline_rule,
           owner_suggestion, evidence_required,
           source_reference, traceability_chain,
           status, progress_percent, analysis_version,
           created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          clientId, projectId, action.risk_id, action.gap_id, action.requirement_id, action.template_id,
          `REQ-${action.requirement_id}`,
          `RISK-${projectId}-${action.risk_id}`,
          action.domain, action.gap_type,
          `ACT-${projectId}-${action.risk_id}`,
          action.action_name, action.action_description, action.action_description,
          action.action_type, action.priority, action.deadline_days, action.deadline_rule,
          action.responsible, action.evidence_required,
          action.source_reference, JSON.stringify(action.traceability_chain),
          "nao_iniciado", 0, 1,
        ]
      );
      inserted++;
    }
  }

  return { inserted, updated };
}

// ---------------------------------------------------------------------------
// Função de validação de ação (para testes e API)
// ---------------------------------------------------------------------------

export function validateAction(action: Partial<DerivedAction>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!action.risk_id) errors.push("ação sem risco → inválida");
  if (!action.gap_id) errors.push("ação sem gap_id → inválida");
  if (!action.requirement_id) errors.push("ação sem requirement_id → inválida");
  if (!action.evidence_required || action.evidence_required.length < 10)
    errors.push("ação sem evidência → inválida");
  if (!action.deadline_days || action.deadline_days <= 0)
    errors.push("ação sem prazo → inválida");
  if (!action.action_description || action.action_description.length < 20)
    errors.push("ação genérica → inválida");
  if (!action.template_id)
    errors.push("ação sem template_id → inválida");
  if (!action.source_reference)
    errors.push("ação sem source_reference → inválida");

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Função auxiliar para obter template por tipo
// ---------------------------------------------------------------------------

export function getTemplateByType(riskType: string, domain?: string): ActionTemplate | null {
  if (ACTION_TEMPLATES[riskType]) return ACTION_TEMPLATES[riskType];
  if (domain) {
    const fallbackId = DOMAIN_FALLBACK_TEMPLATES[domain];
    if (fallbackId) {
      const key = Object.keys(ACTION_TEMPLATES).find(k => ACTION_TEMPLATES[k].template_id === fallbackId);
      if (key) return ACTION_TEMPLATES[key];
    }
  }
  return null;
}

export function getAllTemplates(): ActionTemplate[] {
  return Object.values(ACTION_TEMPLATES);
}

// ---------------------------------------------------------------------------
// tRPC Router
// ---------------------------------------------------------------------------

export const actionEngineRouter = router({
  /**
   * Derivar ações a partir dos riscos classificados do projeto
   */
  deriveActions: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const actions = await deriveActionsFromRisks(input.projectId);

      if (actions.length === 0) {
        return {
          actions: [],
          inserted: 0,
          updated: 0,
          message: "Nenhum risco rastreável encontrado para gerar ações",
        };
      }

      const { inserted, updated } = await persistActions(input.projectId, actions);

      return {
        actions,
        inserted,
        updated,
        message: `${inserted + updated} ações geradas (${inserted} novas, ${updated} atualizadas)`,
      };
    }),

  /**
   * Listar ações do projeto com rastreabilidade completa
   */
  listActions: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = getPool();
      const [actions] = await db.query<mysql.RowDataPacket[]>(
        `SELECT
           a.*,
           r.risk_level, r.risk_category_l1, r.risk_category_l2, r.risk_category_l3,
           r.description AS risk_description,
           g.gap_classification, g.requirement_name
         FROM project_actions_v3 a
         LEFT JOIN project_risks_v3 r ON a.risk_id = r.id
         LEFT JOIN project_gaps_v3 g ON a.gap_id = g.id
         WHERE a.project_id = ?
         ORDER BY
           CASE a.action_priority
             WHEN 'imediata' THEN 1
             WHEN 'curto_prazo' THEN 2
             WHEN 'medio_prazo' THEN 3
             WHEN 'planejamento' THEN 4
           END`,
        [input.projectId]
      );
      return actions;
    }),

  /**
   * Obter templates disponíveis
   */
  getTemplates: protectedProcedure.query(() => {
    return getAllTemplates();
  }),

  /**
   * Validar uma ação antes de persistir
   */
  validateAction: protectedProcedure
    .input(z.object({
      risk_id: z.number().optional(),
      gap_id: z.number().optional(),
      requirement_id: z.number().optional(),
      evidence_required: z.string().optional(),
      deadline_days: z.number().optional(),
      action_description: z.string().optional(),
      template_id: z.string().optional(),
      source_reference: z.string().optional(),
    }))
    .query(({ input }) => {
      return validateAction(input as Partial<DerivedAction>);
    }),
});
