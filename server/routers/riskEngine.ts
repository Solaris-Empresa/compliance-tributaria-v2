/**
 * Risk Engine — B5 (Sprint 98% Confidence)
 * ADR-010 — Arquitetura canônica de conteúdo diagnóstico
 *
 * Responsabilidades:
 * - Derivar riscos a partir de gaps classificados (rastreabilidade obrigatória)
 * - Taxonomia hierárquica 3 níveis: domínio → categoria → tipo
 * - Hybrid deterministic scoring: base_criticality × gap_classification × porte × regime
 * - Campo origin: direto (gap único) | derivado (gap + requisito) | contextual (perfil + setor)
 * - Contextual Risk Layer: riscos adicionais derivados do perfil da empresa (ADR-010 v1.2)
 * - Nenhum risco sem gap_id rastreável (exceto contextual com justificativa obrigatória)
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import mysql from "mysql2/promise";

// ---------------------------------------------------------------------------
// Schemas públicos (exportados para testes)
// ---------------------------------------------------------------------------

export const RiskOriginSchema = z.enum(["direto", "derivado", "contextual"]);
export type RiskOrigin = z.infer<typeof RiskOriginSchema>;

export const RiskSeveritySchema = z.enum(["baixo", "medio", "alto", "critico"]);
export type RiskSeverity = z.infer<typeof RiskSeveritySchema>;

export const RiskTaxonomySchema = z.object({
  domain: z.string().min(1), // Nível 1: domínio (fiscal, trabalhista, societário, etc.)
  category: z.string().min(1), // Nível 2: categoria (apuração, recolhimento, obrigação acessória, etc.)
  type: z.string().min(1),    // Nível 3: tipo específico (split_payment, nfe, etc.)
});
export type RiskTaxonomy = z.infer<typeof RiskTaxonomySchema>;

export const RiskScoreSchema = z.object({
  base_score: z.number().min(0).max(100),
  adjusted_score: z.number().min(0).max(100),
  severity: RiskSeveritySchema,
  scoring_factors: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  confidence_reason: z.string(),
});
export type RiskScore = z.infer<typeof RiskScoreSchema>;

export const DerivedRiskSchema = z.object({
  gap_id: z.number().nullable(), // null apenas para origin=contextual com justificativa
  requirement_id: z.number().nullable(),
  source_reference: z.string().nullable(),
  gap_classification: z.string().nullable(),
  origin: RiskOriginSchema,
  origin_justification: z.string(),
  taxonomy: RiskTaxonomySchema,
  score: RiskScoreSchema,
  description: z.string(),
  mitigation_hint: z.string(),
  // G11 — fonte_risco: origem do pipeline que gerou o risco
  // Derivado de project_gaps_v3.source (migration 0061 G17)
  fonte_risco: z.enum(['solaris', 'cnae', 'iagen', 'v1']).default('v1'),
});
export type DerivedRisk = z.infer<typeof DerivedRiskSchema>;

// ---------------------------------------------------------------------------
// Taxonomia de domínios (Nível 1 → Nível 2 → Nível 3)
// ---------------------------------------------------------------------------

const DOMAIN_TAXONOMY: Record<string, { categories: Record<string, string[]> }> = {
  fiscal: {
    categories: {
      apuracao: ["split_payment", "credito_iva", "regime_cumulativo", "base_calculo"],
      recolhimento: ["guia_ibs", "guia_cbs", "prazo_vencimento", "parcelamento"],
      obrigacao_acessoria: ["nfe", "nfce", "nfse", "sped", "gia", "dctf"],
      transicao: ["periodo_transicao", "regra_grandfathering", "beneficio_fiscal"],
    },
  },
  trabalhista: {
    categories: {
      folha: ["esocial", "fgts", "inss", "irrf"],
      contratos: ["terceirizacao", "pj_vs_clt", "autonomo"],
    },
  },
  societario: {
    categories: {
      estrutura: ["holding", "reorganizacao", "fusao_aquisicao"],
      governanca: ["compliance_societario", "ata_assembleia"],
    },
  },
  contratual: {
    categories: {
      fornecedores: ["clausula_reforma", "repasse_tributo", "split_contratual"],
      clientes: ["precificacao", "contrato_servico"],
    },
  },
  operacional: {
    categories: {
      sistemas: ["erp", "pdv", "nfe_homologacao", "integracao_sefaz"],
      processos: ["treinamento", "procedimento_interno", "auditoria"],
    },
  },
  cadastral: {
    categories: {
      registro: ["cnpj", "inscricao_estadual", "inscricao_municipal"],
      enquadramento: ["cnae_principal", "cnae_secundario", "regime_tributario"],
    },
  },
};

// ---------------------------------------------------------------------------
// Mapeamento domínio → taxonomia (derivado do domain da tabela)
// ---------------------------------------------------------------------------

function mapDomainToTaxonomy(
  domain: string,
  gapType: string,
  description: string
): RiskTaxonomy {
  const domainKey = domain?.toLowerCase().replace(/\s+/g, "_") || "fiscal";

  // Mapeamento de domain da tabela para domínio da taxonomia
  const domainMap: Record<string, string> = {
    fiscal: "fiscal",
    tributario: "fiscal",
    trabalhista: "trabalhista",
    societario: "societario",
    contratual: "contratual",
    operacional: "operacional",
    cadastral: "cadastral",
    sistemas: "operacional",
    processos: "operacional",
  };

  const taxonomyDomain = domainMap[domainKey] || "fiscal";

  // Mapeamento de gap_type para categoria
  const categoryMap: Record<string, string> = {
    normativo: "obrigacao_acessoria",
    processo: "processos",
    sistema: "sistemas",
    cadastro: "registro",
    contrato: "fornecedores",
    financeiro: "recolhimento",
    acessorio: "obrigacao_acessoria",
  };

  const category = categoryMap[gapType?.toLowerCase()] || "apuracao";

  // Tipo específico derivado da descrição
  const descLower = description?.toLowerCase() || "";
  let type = "geral";
  if (descLower.includes("split")) type = "split_payment";
  else if (descLower.includes("nf-e") || descLower.includes("nfe")) type = "nfe";
  else if (descLower.includes("ibs")) type = "guia_ibs";
  else if (descLower.includes("cbs")) type = "guia_cbs";
  else if (descLower.includes("esocial")) type = "esocial";
  else if (descLower.includes("sped")) type = "sped";
  else if (descLower.includes("cnae")) type = "cnae_principal";
  else if (descLower.includes("treinamento")) type = "treinamento";
  else if (descLower.includes("contrato")) type = "clausula_reforma";
  else if (descLower.includes("erp")) type = "erp";

  return { domain: taxonomyDomain, category, type };
}

// ---------------------------------------------------------------------------
// Hybrid Deterministic Scoring
// ---------------------------------------------------------------------------

const CRITICALITY_BASE_SCORE: Record<string, number> = {
  critica: 90,
  alta: 70,
  media: 50,
  baixa: 30,
};

const GAP_CLASSIFICATION_MULTIPLIER: Record<string, number> = {
  ausencia: 1.0,    // Gap total — score máximo
  inadequado: 0.85, // Evidência presente mas inadequada
  parcial: 0.70,    // Parcialmente atendido
};

const PORTE_MULTIPLIER: Record<string, number> = {
  grande: 1.15,
  media: 1.05,
  pequena: 0.95,
  micro: 0.85,
  mei: 0.75,
};

const REGIME_MULTIPLIER: Record<string, number> = {
  lucro_real: 1.20,
  lucro_presumido: 1.05,
  simples_nacional: 0.90,
};

function calculateRiskScore(
  baseCriticality: string,
  gapClassification: string,
  porte: string | null,
  regime: string | null,
  origin: RiskOrigin
): RiskScore {
  const baseScore = CRITICALITY_BASE_SCORE[baseCriticality] ?? 50;
  const gapMultiplier = GAP_CLASSIFICATION_MULTIPLIER[gapClassification] ?? 1.0;
  const porteMultiplier = PORTE_MULTIPLIER[porte ?? "media"] ?? 1.0;
  const regimeMultiplier = REGIME_MULTIPLIER[regime ?? "lucro_presumido"] ?? 1.0;

  // Contextual risks têm score base reduzido (inferido, não direto)
  const originMultiplier = origin === "contextual" ? 0.80 : origin === "derivado" ? 0.90 : 1.0;

  const adjustedScore = Math.min(
    100,
    Math.round(baseScore * gapMultiplier * porteMultiplier * regimeMultiplier * originMultiplier)
  );

  const severity: RiskSeverity =
    adjustedScore >= 80 ? "critico" :
    adjustedScore >= 60 ? "alto" :
    adjustedScore >= 40 ? "medio" : "baixo";

  const scoringFactors = [
    `base_criticality=${baseCriticality}(${baseScore})`,
    `gap_classification=${gapClassification}(×${gapMultiplier})`,
    `porte=${porte ?? "media"}(×${porteMultiplier})`,
    `regime=${regime ?? "lucro_presumido"}(×${regimeMultiplier})`,
    `origin=${origin}(×${originMultiplier})`,
  ];

  // Confidence baseado na completude dos dados
  const hasPorte = porte !== null;
  const hasRegime = regime !== null;
  const confidence =
    origin === "direto" && hasPorte && hasRegime ? 0.92 :
    origin === "derivado" && hasPorte ? 0.85 :
    origin === "contextual" ? 0.72 : 0.78;

  const confidenceReason =
    origin === "direto" ? "Gap direto com dados completos do projeto" :
    origin === "derivado" ? "Risco derivado de requisito com gap classificado" :
    "Risco contextual inferido do perfil da empresa";

  return {
    base_score: baseScore,
    adjusted_score: adjustedScore,
    severity,
    scoring_factors: scoringFactors,
    confidence,
    confidence_reason: confidenceReason,
  };
}

// ---------------------------------------------------------------------------
// Contextual Risk Layer — riscos adicionais do perfil da empresa
// ---------------------------------------------------------------------------

interface ContextualRiskInput {
  projectId: number;
  porte: string | null;
  regime: string | null;
  cnaes: string[];
  confirmedCnaes: string[];
}

function generateContextualRisks(input: ContextualRiskInput): DerivedRisk[] {
  const risks: DerivedRisk[] = [];

  // Risco contextual 1: Empresa de grande porte sem split payment implementado
  if (input.porte === "grande" || input.porte === "media") {
    risks.push({
      gap_id: null,
      requirement_id: null,
      source_reference: "LC 214/2024 — Art. 25 (Split Payment)",
      gap_classification: null,
      origin: "contextual",
      origin_justification: `Empresa de porte ${input.porte} tem obrigação de split payment a partir de 2026 — risco estrutural independente de gaps identificados`,
      taxonomy: { domain: "fiscal", category: "recolhimento", type: "split_payment" },
      score: calculateRiskScore("alta", "ausencia", input.porte, input.regime, "contextual"),
      description: "Risco de não conformidade com split payment obrigatório para empresas de médio/grande porte na transição IBS/CBS",
      mitigation_hint: "Verificar integração do sistema de pagamentos com a plataforma do split payment do Comitê Gestor do IBS",
      fonte_risco: 'v1' as const, // risco contextual — sem gap_source
    });
  }

  // Risco contextual 2: Regime lucro real com múltiplos CNAEs
  if (input.regime === "lucro_real" && input.cnaes.length > 3) {
    risks.push({
      gap_id: null,
      requirement_id: null,
      source_reference: "EC 132/2023 — Art. 156-A §1º (Não cumulatividade plena)",
      gap_classification: null,
      origin: "contextual",
      origin_justification: `Empresa no lucro real com ${input.cnaes.length} CNAEs tem risco elevado de apuração incorreta de créditos IBS/CBS por atividade`,
      taxonomy: { domain: "fiscal", category: "apuracao", type: "credito_iva" },
      score: calculateRiskScore("alta", "ausencia", input.porte, input.regime, "contextual"),
      description: "Risco de apuração incorreta de créditos IBS/CBS em empresa com múltiplas atividades no lucro real",
      mitigation_hint: "Implementar controle de créditos por CNAE com segregação de receitas e despesas por atividade",
      fonte_risco: 'v1' as const, // risco contextual — sem gap_source
    });
  }

  return risks;
}

// ---------------------------------------------------------------------------
// Pool de conexão
// ---------------------------------------------------------------------------

let pool: mysql.Pool | null = null;
function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(process.env.DATABASE_URL ?? "");
  }
  return pool;
}

// ---------------------------------------------------------------------------
// Funções de banco (exportadas para testes)
// ---------------------------------------------------------------------------

export async function deriveRisksFromGaps(
  projectId: number,
  porte: string | null,
  regime: string | null
): Promise<DerivedRisk[]> {
  const db = getPool();

  // Buscar gaps classificados do projeto com dados do requisito
  // G17-B: filtro expandido para incluir gaps SOLARIS sem gap_classification
  //        (usam g.criticality como fallback para base_criticality)
  const [gaps] = await db.query<mysql.RowDataPacket[]>(
    `SELECT
       g.id as gap_id,
       g.requirement_id,
       g.gap_classification,
       g.criticality as gap_criticality,
       g.evaluation_confidence,
       g.source_reference as gap_source_reference,
       g.source as gap_source,
       g.gap_description as gap_desc_solaris,
       g.domain as gap_domain,
       r.base_criticality,
       r.default_gap_type,
       r.domain,
       r.description as req_description,
       r.source_reference as req_source_reference,
       r.legal_reference
     FROM project_gaps_v3 g
     LEFT JOIN regulatory_requirements_v3 r ON g.requirement_id = r.id
     WHERE g.project_id = ?
       AND (
         (g.gap_classification IS NOT NULL AND g.gap_classification != '')
         OR
         (g.source = 'solaris' AND g.criticality IS NOT NULL)
       )
     ORDER BY r.base_criticality DESC, g.gap_classification ASC`,
    [projectId]
  );

  const risks: DerivedRisk[] = [];

  for (const gap of gaps) {
    const origin: RiskOrigin = gap.requirement_id ? "derivado" : "direto";
    // G17-B: para gaps SOLARIS sem gap_classification, usar 'ausencia' como fallback
    // (gap identificado = ausência de controle; criticality do gap como base_criticality)
    const effectiveGapClassification: string =
      gap.gap_classification || (gap.gap_source === 'solaris' ? 'ausencia' : 'ausencia');
    const effectiveBaseCriticality: string =
      gap.base_criticality || gap.gap_criticality || 'media';
    const effectiveDomain: string = gap.domain || gap.gap_domain || 'fiscal';
    const effectiveGapType: string = gap.default_gap_type || 'normativo';
    const effectiveDescription: string = gap.req_description || gap.gap_desc_solaris || '';

    const score = calculateRiskScore(
      effectiveBaseCriticality,
      effectiveGapClassification,
      porte,
      regime,
      origin
    );
    // G11: derivar fonte_risco a partir de project_gaps_v3.source (migration 0061)
    const fonteRisco: 'solaris' | 'cnae' | 'iagen' | 'v1' =
      gap.gap_source === 'solaris' ? 'solaris'
      : gap.gap_source === 'cnae'  ? 'cnae'
      : gap.gap_source === 'iagen' ? 'iagen'
      : 'v1';
    risks.push({
      gap_id: gap.gap_id,
      requirement_id: gap.requirement_id || null,
      source_reference: gap.req_source_reference || gap.gap_source_reference || null,
      gap_classification: effectiveGapClassification,
      origin,
      origin_justification:
        origin === "derivado"
          ? `Risco derivado do gap classificado como '${effectiveGapClassification}' no requisito ${gap.requirement_id}`
          : `Risco direto do gap ${gap.gap_id} (source=${gap.gap_source})`,
      taxonomy: mapDomainToTaxonomy(effectiveDomain, effectiveGapType, effectiveDescription),
      score,
      description: `Risco ${score.severity} identificado: ${effectiveDescription || 'gap sem descrição'}`,
      mitigation_hint: `Regularizar ${effectiveGapType} referente a ${gap.req_source_reference || gap.gap_source_reference || 'requisito aplicável'}`,
      fonte_risco: fonteRisco,
    });
  }

  return risks;
}

export async function persistRisks(
  projectId: number,
  risks: DerivedRisk[]
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

  for (const risk of risks) {
    // Verificar se já existe risco para este gap
    if (risk.gap_id) {
      const [existing] = await db.query<mysql.RowDataPacket[]>(
        "SELECT id FROM project_risks_v3 WHERE project_id = ? AND gap_id = ?",
        [projectId, risk.gap_id]
      );

      if (existing.length > 0) {
        await db.query(
          `UPDATE project_risks_v3 SET
             origin = ?, risk_category_l1 = ?, risk_category_l2 = ?, risk_category_l3 = ?,
             base_score = ?, adjusted_score = ?, hybrid_score = ?, risk_level = ?,
             scoring_factors = ?, evaluation_confidence = ?, evaluation_confidence_reason = ?,
             source_reference = ?, origin_justification = ?,
             description = ?, mitigation_hint = ?,
             updated_at = NOW()
           WHERE project_id = ? AND gap_id = ?`,
          [
            risk.origin, risk.taxonomy.domain, risk.taxonomy.category, risk.taxonomy.type,
            risk.score.base_score, risk.score.adjusted_score, risk.score.adjusted_score,
            risk.score.severity,
            JSON.stringify(risk.score.scoring_factors),
            risk.score.confidence, risk.score.confidence_reason,
            risk.source_reference, risk.origin_justification,
            risk.description, risk.mitigation_hint,
            projectId, risk.gap_id,
          ]
        );
        updated++;
      } else {
        await db.query(
          `INSERT INTO project_risks_v3
             (client_id, project_id, gap_id, requirement_id,
              risk_code, requirement_code, requirement_name,
              domain, gap_type, probability, impact,
              risk_score, risk_score_normalized, risk_level, risk_dimension,
              financial_impact_percent, financial_impact_description,
              mitigation_strategy, analysis_version,
              origin, risk_category_l1, risk_category_l2, risk_category_l3,
              deterministic_score, contextual_score, hybrid_score,
              base_score, adjusted_score, scoring_factors,
              evaluation_confidence, evaluation_confidence_reason,
              source_reference, origin_justification, description, mitigation_hint,
              fonte_risco,
              created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            clientId, projectId, risk.gap_id, risk.requirement_id,
            `RISK-${projectId}-${risk.gap_id}`,
            risk.requirement_id ? `REQ-${risk.requirement_id}` : "CONTEXTUAL",
            risk.description?.substring(0, 255) || "Risco identificado",
            risk.taxonomy.domain, "normativo", 50, 50,
            risk.score.adjusted_score, risk.score.adjusted_score,
            risk.score.severity, "regulatorio",
            0.05, risk.description || "",
            risk.mitigation_hint || "", 1,
            risk.origin, risk.taxonomy.domain, risk.taxonomy.category, risk.taxonomy.type,
            risk.score.base_score, risk.score.adjusted_score, risk.score.adjusted_score,
            risk.score.base_score, risk.score.adjusted_score,
            JSON.stringify(risk.score.scoring_factors),
            risk.score.confidence, risk.score.confidence_reason,
            risk.source_reference, risk.origin_justification,
            risk.description, risk.mitigation_hint,
            risk.fonte_risco ?? 'v1',
          ]
        );
        inserted++;
      }
    } else {
      // Risco contextual (sem gap_id) — sempre insert
      await db.query(
        `INSERT INTO project_risks_v3
           (client_id, project_id, gap_id, requirement_id,
            risk_code, requirement_code, requirement_name,
            domain, gap_type, probability, impact,
            risk_score, risk_score_normalized, risk_level, risk_dimension,
            financial_impact_percent, financial_impact_description,
            mitigation_strategy, analysis_version,
            origin, risk_category_l1, risk_category_l2, risk_category_l3,
            deterministic_score, contextual_score, hybrid_score,
            base_score, adjusted_score, scoring_factors,
            evaluation_confidence, evaluation_confidence_reason,
              source_reference, origin_justification, description, mitigation_hint,
              fonte_risco,
            created_at, updated_at)
         VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          clientId, projectId,
          `RISK-${projectId}-CTX-${Date.now()}`,
          "CONTEXTUAL", "Risco Contextual",
          risk.taxonomy.domain, "normativo", 50, 50,
          risk.score.adjusted_score, risk.score.adjusted_score,
          risk.score.severity, "regulatorio",
          0.05, risk.description || "",
          risk.mitigation_hint || "", 1,
          risk.origin, risk.taxonomy.domain, risk.taxonomy.category, risk.taxonomy.type,
          risk.score.base_score, risk.score.adjusted_score, risk.score.adjusted_score,
          risk.score.base_score, risk.score.adjusted_score,
          JSON.stringify(risk.score.scoring_factors),
          risk.score.confidence, risk.score.confidence_reason,
          risk.source_reference, risk.origin_justification,
          risk.description, risk.mitigation_hint,
          risk.fonte_risco ?? 'v1',
        ]
      );
      inserted++;
    }
  }

  return { inserted, updated };
}

// ---------------------------------------------------------------------------
// tRPC Router — Risk Engine B5
// ---------------------------------------------------------------------------

export const riskEngineRouter = router({
  /**
   * Derivar e persistir riscos a partir dos gaps classificados de um projeto
   * ADR-010: origin obrigatório, taxonomia 3 níveis, hybrid scoring
   */
  deriveAndPersist: protectedProcedure
    .input(z.object({
      projectId: z.number().int().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getPool();

      // Buscar dados do projeto para o scoring contextual
      const [projects] = await db.query<mysql.RowDataPacket[]>(
        "SELECT companySize, taxRegime, confirmedCnaes FROM projects WHERE id = ?",
        [input.projectId]
      );

      if (projects.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
      }

      const project = projects[0];
      const porte = project.companySize || null;
      const regime = project.taxRegime || null;
      const cnaes: string[] = Array.isArray(project.confirmedCnaes)
        ? project.confirmedCnaes
        : (project.confirmedCnaes ? JSON.parse(project.confirmedCnaes) : []);

      // 1. Derivar riscos dos gaps
      const gapRisks = await deriveRisksFromGaps(input.projectId, porte, regime);

      // 2. Gerar riscos contextuais
      const contextualRisks = generateContextualRisks({
        projectId: input.projectId,
        porte,
        regime,
        cnaes,
        confirmedCnaes: cnaes,
      });

      const allRisks = [...gapRisks, ...contextualRisks];

      // 3. Persistir no banco
      const { inserted, updated } = await persistRisks(input.projectId, allRisks);

      return {
        total_risks: allRisks.length,
        gap_risks: gapRisks.length,
        contextual_risks: contextualRisks.length,
        inserted,
        updated,
        severity_distribution: {
          critico: allRisks.filter(r => r.score.severity === "critico").length,
          alto: allRisks.filter(r => r.score.severity === "alto").length,
          medio: allRisks.filter(r => r.score.severity === "medio").length,
          baixo: allRisks.filter(r => r.score.severity === "baixo").length,
        },
        origin_distribution: {
          direto: allRisks.filter(r => r.origin === "direto").length,
          derivado: allRisks.filter(r => r.origin === "derivado").length,
          contextual: allRisks.filter(r => r.origin === "contextual").length,
        },
      };
    }),

  /**
   * Listar riscos de um projeto com filtros
   */
  list: protectedProcedure
    .input(z.object({
      projectId: z.number().int().positive(),
      severity: z.enum(["baixo", "medio", "alto", "critico"]).optional(),
      origin: RiskOriginSchema.optional(),
      domain: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = getPool();

      let query = "SELECT * FROM project_risks_v3 WHERE project_id = ?";
      const params: (string | number)[] = [input.projectId];

      if (input.severity) {
        query += " AND severity = ?";
        params.push(input.severity);
      }
      if (input.origin) {
        query += " AND risk_origin = ?";
        params.push(input.origin);
      }
      if (input.domain) {
        query += " AND risk_domain = ?";
        params.push(input.domain);
      }

      query += " ORDER BY adjusted_score DESC, severity DESC";

      const [risks] = await db.query<mysql.RowDataPacket[]>(query, params);
      return { risks, total: risks.length };
    }),
});
