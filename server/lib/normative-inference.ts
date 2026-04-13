// normative-inference.ts — Sprint Z-13.5 Tarefa 2
// Infere riscos/oportunidades a partir do perfil do projeto e regras normativas.
// Lê normative_product_rules do banco (migration 0076).
// Usa ProjectProfile de project-profile-extractor.ts.

import { drizzle } from "drizzle-orm/mysql2";
import type { ProjectProfile } from "./project-profile-extractor";
import type { InsertRiskV4 } from "./db-queries-risks-v4";
import type { ConsolidatedEvidence, OperationalContext } from "./risk-engine-v4";
import { buildRiskKey } from "./risk-engine-v4";

// ─── DB ──────────────────────────────────────────────────────────────────────

let _db: ReturnType<typeof drizzle> | null = null;
async function getDb(): Promise<ReturnType<typeof drizzle>> {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  if (!_db) throw new Error("[normative-inference] DATABASE_URL não configurado");
  return _db;
}

async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as T[];
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface NormativeRule {
  id: number;
  regime: string;
  legal_reference: string;
  ncm_code: string;
  match_mode: "exact" | "prefix";
  active: number;
  source_version: string;
}

// CNAEs do setor alimentar (atacado/distribuição)
const CNAES_ALIMENTAR = new Set([
  "4639-7/01", "4632-0/01", "4631-1/00", "4634-6/01", "4635-4/01",
]);

// CNAEs atacadistas
const CNAES_ATACADISTA = new Set([
  "4639-7/01", "4632-0/01", "4631-1/00", "4634-6/01", "4635-4/01",
  "4637-1/07", "4633-8/01", "4636-2/02",
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loadNormativeRules(regime: string): Promise<NormativeRule[]> {
  return query<NormativeRule>(
    `SELECT id, regime, legal_reference, ncm_code, match_mode, active, source_version
     FROM normative_product_rules
     WHERE regime = ? AND active = 1`,
    [regime]
  );
}

function hasEligibleNcm(productNcms: string[], rules: NormativeRule[]): boolean {
  return productNcms.some((ncm) =>
    rules.some((rule) =>
      rule.match_mode === "exact"
        ? ncm === rule.ncm_code
        : ncm.startsWith(rule.ncm_code)
    )
  );
}

function hasAlimentarCnae(cnaes: string[]): boolean {
  return cnaes.some((c) => CNAES_ALIMENTAR.has(c));
}

function hasAtacadistaCnae(cnaes: string[]): boolean {
  return cnaes.some((c) => CNAES_ATACADISTA.has(c));
}

function hasPaymentTrigger(profile: ProjectProfile): boolean {
  const meios = profile.meiosPagamento ?? [];
  const triggers = ["cartao", "cartao_credito", "cartao_debito", "pix", "marketplace"];
  if (meios.some((m) => triggers.includes(m))) return true;
  if (profile.intermediarios && profile.intermediarios.length > 0) return true;
  return false;
}

function buildContext(profile: ProjectProfile): OperationalContext {
  return {
    tipoOperacao: profile.tipoOperacao ?? undefined,
    tipoCliente: profile.tipoCliente ?? undefined,
    multiestadual: profile.multiestadual ?? undefined,
    meiosPagamento: profile.meiosPagamento ?? undefined,
    intermediarios: profile.intermediarios ?? undefined,
  };
}

function makeInferredRisk(
  projectId: number,
  categoria: string,
  tipo: "risk" | "opportunity",
  severidade: "alta" | "media" | "oportunidade",
  urgencia: "imediata" | "curto_prazo" | "medio_prazo",
  artigo: string,
  titulo: string,
  confidence: number,
  context: OperationalContext,
  validationNote?: string,
): InsertRiskV4 {
  const riskKey = buildRiskKey(categoria, context);
  const evidence: ConsolidatedEvidence = {
    gaps: [],
    rag_validated: false,
    rag_confidence: 0,
    rag_validation_note: validationNote,
  };
  return {
    project_id: projectId,
    rule_id: riskKey,
    type: tipo,
    categoria: categoria as any,
    titulo,
    descricao: validationNote ?? null,
    artigo,
    severidade: severidade as any,
    urgencia: urgencia as any,
    evidence,
    breadcrumb: ["solaris", categoria, artigo, riskKey],
    source_priority: "solaris" as any,
    confidence,
    risk_key: riskKey,
    operational_context: context,
    evidence_count: 0,
    rag_validated: 0,
    rag_confidence: 0,
    rag_validation_note: validationNote ?? null,
    created_by: 0,
    updated_by: 0,
  };
}

// ─── Função principal ────────────────────────────────────────────────────────

/**
 * Infere riscos/oportunidades a partir do perfil do projeto e regras normativas.
 * Retorna InsertRiskV4[] prontos para persistir.
 */
export async function inferNormativeRisks(
  projectId: number,
  profile: ProjectProfile,
): Promise<InsertRiskV4[]> {
  const results: InsertRiskV4[] = [];
  const ctx = buildContext(profile);
  const op = profile.tipoOperacao ?? "geral";

  // ── Alíquota zero ─────────────────────────────────────────────────────────
  if (hasAlimentarCnae(profile.cnaes)) {
    const rules = await loadNormativeRules("aliquota_zero");

    if (profile.productNcms.length > 0 && hasEligibleNcm(profile.productNcms, rules)) {
      results.push(makeInferredRisk(
        projectId, "aliquota_zero", "opportunity", "oportunidade", "curto_prazo",
        "Art. 125 c/c Anexo I LC 214/2025",
        `Oportunidade de alíquota zero sobre produtos elegíveis nas operações de ${op}`,
        0.90, ctx,
      ));
    } else if (profile.productNcms.length === 0) {
      results.push(makeInferredRisk(
        projectId, "aliquota_zero", "opportunity", "oportunidade", "curto_prazo",
        "Art. 125 c/c Anexo I LC 214/2025",
        `Oportunidade de alíquota zero sobre produtos elegíveis nas operações de ${op}`,
        0.45, ctx,
        "NCMs não informados — validar elegibilidade manual",
      ));
    }
  }

  // ── Crédito presumido ─────────────────────────────────────────────────────
  if (hasAtacadistaCnae(profile.cnaes) && profile.taxRegime === "lucro_real") {
    results.push(makeInferredRisk(
      projectId, "credito_presumido", "opportunity", "oportunidade", "curto_prazo",
      "Art. 185 LC 214/2025",
      `Oportunidade de aproveitamento de crédito presumido nas operações de ${op}`,
      0.85, ctx,
    ));
  }

  // ── Split payment ─────────────────────────────────────────────────────────
  if (hasPaymentTrigger(profile)) {
    results.push(makeInferredRisk(
      projectId, "split_payment", "risk", "alta", "imediata",
      "Art. 29 LC 214/2025",
      `Risco de não conformidade com Split Payment nas operações de ${op}`,
      0.80, ctx,
    ));
  }

  return results;
}
