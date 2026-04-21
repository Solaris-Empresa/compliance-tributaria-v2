/**
 * briefing-confidence-signals.ts — fontes dinâmicas da confiança v2 (2026-04-21)
 *
 * Computa os 6 pilares de confiança em tempo real a partir do estado
 * atual do projeto. Zero hardcoded defaults.
 *
 * Fontes mapeadas:
 *   Perfil        → replica calcProfileScore (client/PerfilEmpresaIntelligente.tsx:169)
 *                   7 obrigatórios (70% peso) + 12 opcionais (30% peso)
 *   Q1 SOLARIS    → solaris_questions (ativo=1 + cnae match) vs solaris_answers
 *   Q2 IA Gen     → iagen_answers (total = respostas; binário no schema atual)
 *   Q3 CNAE       → questionnaireQuestionsCache vs questionnaireAnswers JSON
 *   Q3 Produtos   → operationProfile.principaisProdutos + productAnswers[]
 *   Q3 Serviços   → operationProfile.principaisServicos + serviceAnswers[]
 *   Tipo empresa  → operationProfile.operationType (via inferCompanyType)
 *
 * Determinístico: mesmo estado do projeto → mesmos signals.
 */

import { eq } from "drizzle-orm";
import * as schema from "../../drizzle/schema";
import * as db from "../db";
import { inferCompanyType } from "./completeness";
import type {
  BriefingConfidenceSignals,
  TipoEmpresa,
} from "./calculate-briefing-confidence";

// ─────────────────────────────────────────────────────────────────────────────
// Perfil — replica calcProfileScore do frontend
// Source: client/src/components/PerfilEmpresaIntelligente.tsx:169
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 7 campos obrigatórios do perfil (mesma lista do frontend).
 * Alteração aqui DEVE ser espelhada em calcProfileScore.
 */
export const PERFIL_CAMPOS_OBRIGATORIOS = [
  "cnpj",
  "companyType",
  "companySize",
  "taxRegime",
  "operationType",
  "clientType",
  "multiState",
] as const;

/**
 * 12 campos opcionais do perfil (mesma lista do frontend).
 */
export const PERFIL_CAMPOS_OPCIONAIS = [
  "annualRevenueRange",
  "hasMultipleEstablishments",
  "hasImportExport",
  "hasSpecialRegimes",
  "paymentMethods",
  "hasIntermediaries",
  "hasTaxTeam",
  "hasAudit",
  "hasTaxIssues",
  "isEconomicGroup",
  "taxCentralization",
  "produtosOuServicos", // tem 1+ NCM ou 1+ NBS
] as const;

function isTruthy(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "boolean") return true; // presença de bool conta como preenchido
  return Boolean(v);
}

function isPresent(v: unknown): boolean {
  // Para campos bool (null = não respondido; true OU false = respondido)
  return v !== null && v !== undefined;
}

/**
 * Calcula completude do perfil no backend, replicando calcProfileScore.
 * Retorna 0-1 (ratio), breakdown em contagens.
 */
export function computePerfilCompleteness(input: {
  companyProfile?: Record<string, any> | null;
  operationProfile?: Record<string, any> | null;
  taxComplexity?: Record<string, any> | null;
  financialProfile?: Record<string, any> | null;
  governanceProfile?: Record<string, any> | null;
}): {
  completude: number; // 0..1
  obrigatoriosPreenchidos: number;
  obrigatoriosTotais: number;
  opcionaisPreenchidos: number;
  opcionaisTotais: number;
} {
  const cp = input.companyProfile ?? {};
  const op = input.operationProfile ?? {};
  const tc = input.taxComplexity ?? {};
  const fp = input.financialProfile ?? {};
  const gp = input.governanceProfile ?? {};

  // 7 obrigatórios
  const obrigatorios: boolean[] = [
    isTruthy(cp.cnpj),
    isTruthy(cp.companyType),
    isTruthy(cp.companySize),
    isTruthy(cp.taxRegime),
    isTruthy(cp.operationType) || isTruthy(op.operationType),
    Array.isArray(op.clientType) ? op.clientType.length > 0 : isTruthy(op.clientType),
    isPresent(op.multiState) || isPresent((op as any).multiestadual),
  ];
  const obrigatoriosPreenchidos = obrigatorios.filter(Boolean).length;

  // 12 opcionais
  const temProduto = Array.isArray(op.principaisProdutos) && op.principaisProdutos.length > 0;
  const temServico = Array.isArray(op.principaisServicos) && op.principaisServicos.length > 0;
  const opcionais: boolean[] = [
    isTruthy(cp.annualRevenueRange),
    isPresent(tc.hasMultipleEstablishments),
    isPresent(tc.hasImportExport),
    isPresent(tc.hasSpecialRegimes),
    Array.isArray(fp.paymentMethods) && fp.paymentMethods.length > 0,
    isPresent(fp.hasIntermediaries),
    isPresent(gp.hasTaxTeam),
    isPresent(gp.hasAudit),
    isPresent(gp.hasTaxIssues),
    isPresent((op as any).isEconomicGroup) || isPresent((cp as any).isEconomicGroup),
    isPresent((op as any).taxCentralization) || isPresent((cp as any).taxCentralization),
    temProduto || temServico,
  ];
  const opcionaisPreenchidos = opcionais.filter(Boolean).length;

  // Fórmula idêntica ao frontend: 0,7·(obrig/7) + 0,3·(opc/12)
  const completude =
    (obrigatoriosPreenchidos / PERFIL_CAMPOS_OBRIGATORIOS.length) * 0.7 +
    (opcionaisPreenchidos / PERFIL_CAMPOS_OPCIONAIS.length) * 0.3;

  return {
    completude: Math.max(0, Math.min(1, completude)),
    obrigatoriosPreenchidos,
    obrigatoriosTotais: PERFIL_CAMPOS_OBRIGATORIOS.length,
    opcionaisPreenchidos,
    opcionaisTotais: PERFIL_CAMPOS_OPCIONAIS.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Q1 SOLARIS — perguntas elegíveis ao projeto (por CNAE + ativo=1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Conta perguntas SOLARIS elegíveis ao projeto.
 * Elegível = ativo=1 AND (cnaeGroups NULL OR contém algum CNAE do projeto).
 * Match: prefix-match bidirecional (ex: group "11" match CNAE "1113-5").
 */
export async function countQ1SolarisEligible(cnaes: string[]): Promise<number> {
  const database = await db.getDb();
  if (!database) return 0;
  const rows = await database
    .select({
      id: schema.solarisQuestions.id,
      cnaeGroups: schema.solarisQuestions.cnaeGroups,
    })
    .from(schema.solarisQuestions)
    .where(eq(schema.solarisQuestions.ativo, 1));

  const projectCnaes = cnaes.map((c) => String(c).trim()).filter(Boolean);
  let count = 0;
  for (const r of rows) {
    const groups = (r.cnaeGroups as unknown as string[] | null) ?? null;
    if (!groups || groups.length === 0) {
      count += 1; // universal
      continue;
    }
    const match = groups.some((g) =>
      projectCnaes.some((c) => c.startsWith(String(g)) || String(g).startsWith(c))
    );
    if (match) count += 1;
  }
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// Q3 CNAE — perguntas em cache + respostas nos questionnaireAnswers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Conta perguntas Q3 CNAE geradas para o projeto (via cache).
 */
export async function countQ3CnaeTotal(projectId: number): Promise<number> {
  const database = await db.getDb();
  if (!database) return 0;
  const rows = await database
    .select({ questionsJson: schema.questionnaireQuestionsCache.questionsJson })
    .from(schema.questionnaireQuestionsCache)
    .where(eq(schema.questionnaireQuestionsCache.projectId, projectId));
  let total = 0;
  for (const row of rows) {
    try {
      const arr = typeof row.questionsJson === "string"
        ? JSON.parse(row.questionsJson)
        : [];
      if (Array.isArray(arr)) total += arr.length;
    } catch {
      /* ignora row malformada */
    }
  }
  return total;
}

/**
 * Conta respostas Q3 CNAE a partir do campo questionnaireAnswers do projeto.
 * Exclui layers CORPORATIVO/OPERACIONAL (são legacy, não Q3 CNAE).
 */
export function countQ3CnaeAnswers(questionnaireAnswers: unknown): number {
  const arr = parseJsonArray(questionnaireAnswers);
  return arr
    .filter((l: any) => l?.cnaeCode !== "CORPORATIVO" && l?.cnaeCode !== "OPERACIONAL")
    .reduce((sum: number, l: any) => sum + (Array.isArray(l?.questions) ? l.questions.length : 0), 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Q3 Produtos / Serviços — listas de cadastro + arrays de respostas
// ─────────────────────────────────────────────────────────────────────────────

function parseJsonArray(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function countFilledAnswers(arr: any[]): number {
  return arr.filter((a: any) => isTruthy(a?.resposta) || isTruthy(a?.answer)).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Orquestrador — compõe todos os 6 pilares em tempo real
// ─────────────────────────────────────────────────────────────────────────────

export interface ComputeSignalsInput {
  projectId: number;
  cnaesConfirmados: string[];
  companyProfile?: Record<string, any> | null;
  operationProfile?: Record<string, any> | null;
  taxComplexity?: Record<string, any> | null;
  financialProfile?: Record<string, any> | null;
  governanceProfile?: Record<string, any> | null;
  /** Parsed OR string JSON — respostas Q3 CNAE. */
  questionnaireAnswers?: unknown;
  /** Parsed OR string JSON — respostas Q3 Produtos. */
  productAnswers?: unknown;
  /** Parsed OR string JSON — respostas Q3 Serviços. */
  serviceAnswers?: unknown;
}

/**
 * Metadados auxiliares computados (para snapshot + breakdown enriquecido).
 */
export interface SignalsMetadata {
  perfil: {
    obrigatoriosPreenchidos: number;
    obrigatoriosTotais: number;
    opcionaisPreenchidos: number;
    opcionaisTotais: number;
  };
  inferenciaTipo: {
    operationTypeDeclarado: string | null;
    tipoInferido: TipoEmpresa;
  };
}

export interface SignalsWithMetadata {
  signals: BriefingConfidenceSignals;
  metadata: SignalsMetadata;
}

/**
 * Computa todos os signals em tempo real a partir do estado atual do projeto.
 * Ponto único de verdade para a fórmula de confiança.
 */
export async function computeConfidenceSignals(
  input: ComputeSignalsInput
): Promise<SignalsWithMetadata> {
  const perfil = computePerfilCompleteness({
    companyProfile: input.companyProfile,
    operationProfile: input.operationProfile,
    taxComplexity: input.taxComplexity,
    financialProfile: input.financialProfile,
    governanceProfile: input.governanceProfile,
  });

  // Q1 SOLARIS
  const q1Respostas = await db.countOnda1Answers(input.projectId);
  const q1Total = await countQ1SolarisEligible(input.cnaesConfirmados);

  // Q2 IA Gen — binário (schema atual só grava quando responde).
  const q2Respostas = await db.countOnda2Answers(input.projectId);

  // Q3 CNAE
  const q3CnaeTotal = await countQ3CnaeTotal(input.projectId);
  const q3CnaeRespostas = countQ3CnaeAnswers(input.questionnaireAnswers);

  // Q3 Produtos — composto (cadastro + respostas)
  const principaisProdutos = Array.isArray((input.operationProfile as any)?.principaisProdutos)
    ? (input.operationProfile as any).principaisProdutos
    : [];
  const produtosCadastrados = principaisProdutos.length;
  const produtosComNCM = principaisProdutos.filter((p: any) => isTruthy(p?.ncm_code)).length;
  const productAnswersArr = parseJsonArray(input.productAnswers);
  const q3ProdutosRespostas = countFilledAnswers(productAnswersArr);
  const q3ProdutosTotalPerguntas = productAnswersArr.length;

  // Q3 Serviços — composto (cadastro + respostas)
  const principaisServicos = Array.isArray((input.operationProfile as any)?.principaisServicos)
    ? (input.operationProfile as any).principaisServicos
    : [];
  const servicosCadastrados = principaisServicos.length;
  const servicosComNBS = principaisServicos.filter((s: any) => isTruthy(s?.nbs_code)).length;
  const serviceAnswersArr = parseJsonArray(input.serviceAnswers);
  const q3ServicosRespostas = countFilledAnswers(serviceAnswersArr);
  const q3ServicosTotalPerguntas = serviceAnswersArr.length;

  // Tipo empresa — reaproveita inferCompanyType existente
  const operationTypeDeclarado =
    (input.operationProfile as any)?.operationType ??
    (input.companyProfile as any)?.operationType ??
    null;
  const raw = inferCompanyType(input.operationProfile ?? null, input.cnaesConfirmados);
  const tipoEmpresa: TipoEmpresa = raw === "misto" ? "mista" : (raw as TipoEmpresa);

  const signals: BriefingConfidenceSignals = {
    perfilCompletude: perfil.completude,
    // fix UAT 2026-04-21: metadata para breakdown exibir "7/7 + 11/12" no display.
    perfilObrigatoriosPreenchidos: perfil.obrigatoriosPreenchidos,
    perfilObrigatoriosTotais: perfil.obrigatoriosTotais,
    perfilOpcionaisPreenchidos: perfil.opcionaisPreenchidos,
    perfilOpcionaisTotais: perfil.opcionaisTotais,
    q1Respostas,
    q1TotalPerguntas: q1Total,
    q2Respostas,
    q3CnaeRespostas,
    q3CnaeTotalPerguntas: q3CnaeTotal,
    q3ProdutosCadastrados: produtosCadastrados,
    q3ProdutosComNCM: produtosComNCM,
    q3ProdutosRespostas,
    q3ProdutosTotalPerguntas,
    q3ServicosCadastrados: servicosCadastrados,
    q3ServicosComNBS: servicosComNBS,
    q3ServicosRespostas,
    q3ServicosTotalPerguntas,
    tipoEmpresa,
  };

  const metadata: SignalsMetadata = {
    perfil: {
      obrigatoriosPreenchidos: perfil.obrigatoriosPreenchidos,
      obrigatoriosTotais: perfil.obrigatoriosTotais,
      opcionaisPreenchidos: perfil.opcionaisPreenchidos,
      opcionaisTotais: perfil.opcionaisTotais,
    },
    inferenciaTipo: {
      operationTypeDeclarado: typeof operationTypeDeclarado === "string" ? operationTypeDeclarado : null,
      tipoInferido: tipoEmpresa,
    },
  };

  return { signals, metadata };
}
