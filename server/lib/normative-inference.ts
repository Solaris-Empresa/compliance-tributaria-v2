// normative-inference.ts — Sprint Z-13.5 Tarefa 2
// Infere riscos/oportunidades a partir do perfil do projeto e regras normativas.
// Lê normative_product_rules do banco (migration 0076).
// Usa ProjectProfile de project-profile-extractor.ts.

import { drizzle } from "drizzle-orm/mysql2";
import type { ProjectProfile } from "./project-profile-extractor";
import type { InsertRiskV4 } from "./db-queries-risks-v4";
import type { ConsolidatedEvidence, OperationalContext } from "./risk-engine-v4";
import { buildRiskKey } from "./risk-engine-v4";
import {
  isRegimeImoveisOportunidade,
  isRegimeImoveisLocacao,
  isRegimeImoveisRisco,
  isConstrucaoCivilImoveis,
} from "./regime-imoveis-eligibility";

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
// CORPUS-RFC-006 A4: adicionado "4623-1/09" (Comércio Atacadista de Alimentos
// para Animais — farelos de soja, rações). Caso canônico #5040001/#5460001.
// Exportado para teste isolado (CORPUS-RFC-006 — função pura).
export const CNAES_ALIMENTAR: ReadonlySet<string> = new Set([
  "4639-7/01", "4632-0/01", "4631-1/00", "4634-6/01", "4635-4/01",
  "4623-1/09",
]);

// CNAEs atacadistas
// CORPUS-RFC-006 A4: adicionado "4623-1/09" (consistência com CNAES_ALIMENTAR).
// Exportado para teste isolado (CORPUS-RFC-006 — função pura).
export const CNAES_ATACADISTA: ReadonlySet<string> = new Set([
  "4639-7/01", "4632-0/01", "4631-1/00", "4634-6/01", "4635-4/01",
  "4637-1/07", "4633-8/01", "4636-2/02",
  "4623-1/09",
]);

/**
 * CORPUS-RFC-006 A4 — exportado para teste isolado (função pura).
 * Verifica se algum CNAE do projeto está na lista de alimentares.
 */
export function hasAlimentarCnaeFn(cnaes: string[]): boolean {
  return cnaes.some((c) => CNAES_ALIMENTAR.has(c));
}

/**
 * CORPUS-RFC-006 A4 — exportado para teste isolado (função pura).
 * Verifica se algum CNAE do projeto está na lista de atacadistas.
 */
export function hasAtacadistaCnaeFn(cnaes: string[]): boolean {
  return cnaes.some((c) => CNAES_ATACADISTA.has(c));
}

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
    // M3.8-1B: riscos inferidos por gatilho semântico (CNAE + regime + payment trigger)
    // não são da Onda 1 SOLARIS — fonte real é "inferred" (regra hardcoded no engine,
    // mas com base normativa rastreável em artigo). REGRA-ORQ-32 exige fonte determinística.
    breadcrumb: ["inferred", categoria, artigo, riskKey],
    source_priority: "inferred",
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

  if (profile.cnaes.length === 0) {
    console.warn(`[normative-inference] project=${projectId} cnaes vazio — inferência pulada`);
  }
  if (profile.productNcms.length === 0) {
    console.warn(`[normative-inference] project=${projectId} NCMs vazios — aliquota_zero potencial apenas`);
  }

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

  // ── Regime específico de bens imóveis (FEAT-COB-01 #1176) ──────────────────
  // Gate por CNAE automático (D2 — Art. 360 V + §13 / Art. 263). Simples Nacional
  // excluído: o regime é do contribuinte sujeito ao regime regular (Art. 251).
  if (profile.taxRegime !== "simples_nacional") {
    // Oportunidade 50% (Art. 261 caput) — construção/incorporação/alienação/intermediação.
    if (isRegimeImoveisOportunidade(profile.cnaes)) {
      results.push(makeInferredRisk(
        projectId, "regime_especifico_imoveis", "opportunity", "oportunidade", "curto_prazo",
        "Art. 261",
        `Oportunidade de redução de 50% nas operações com bens imóveis (${op})`,
        0.85, ctx,
      ));
    }
    // Oportunidade 70% (Art. 261 parágrafo único) — locação/cessão/arrendamento.
    if (isRegimeImoveisLocacao(profile.cnaes)) {
      results.push(makeInferredRisk(
        projectId, "regime_especifico_imoveis_locacao", "opportunity", "oportunidade", "curto_prazo",
        "Art. 261 PU",
        `Oportunidade de redução de 70% na locação, cessão onerosa e arrendamento de bens imóveis (${op})`,
        0.85, ctx,
      ));
    }
    // Risco/obrigação (Arts. 269-270) — cadastro de obra (CIB) + apuração por empreendimento.
    if (isRegimeImoveisRisco(profile.cnaes)) {
      results.push(makeInferredRisk(
        projectId, "risco_art_269_270", "risk", "media", "curto_prazo",
        "Art. 269 e 270",
        `Obrigação de cadastro de obra (CIB) e apuração por empreendimento de construção civil (${op})`,
        0.85, ctx,
      ));
    }

    // ── Fase 3a (#1607): 8 riscos setoriais de construção civil ────────────────
    // Gate jurídico Dr. José (29/06). Severidade/urgência = migration 0128 (Fase 1).
    // SKIP SEVERITY_TABLE/TITULO (makeInferredRisk passa inline — D1).
    // UNIVERSAIS (deveres gerais do regime → confidence afirmado ~0.85).
    // CONDICIONAIS (dependem da operação → confidence ~0.55 + rag_validation_note "a confirmar
    //   na Fase 3b"); Path B setorial dispara para todo 41/42/43/68 — qualificação por
    //   pergunta SOLARIS é tech-debt TB-1/TB-2 (assemble≠consumption, Lição #59).
    // NOTA: risco_cib_cadastro (265-266) e risco_controle_empreendimento (270) têm overlap
    //   conceitual com risco_art_269_270 (acima) — mantidos separados por decisão do gate.
    if (isConstrucaoCivilImoveis(profile.cnaes)) {
      // Universais
      results.push(makeInferredRisk(
        projectId, "risco_redutor_ajuste", "risk", "alta", "imediata",
        "Art. 257 LC 214/2025",
        `Risco de perda do Redutor de Ajuste nas operações com bens imóveis (${op})`,
        0.85, ctx,
      ));
      results.push(makeInferredRisk(
        projectId, "risco_sinter_avaliacao", "risk", "alta", "imediata",
        "Art. 256 LC 214/2025",
        `Risco de divergência na avaliação dos imóveis pelo SINTER (${op})`,
        0.85, ctx,
      ));
      results.push(makeInferredRisk(
        projectId, "risco_cib_cadastro", "risk", "alta", "imediata",
        "Arts. 265-266 LC 214/2025",
        `Obrigação de inscrição dos imóveis no CIB (Cadastro Imobiliário Brasileiro) (${op})`,
        0.85, ctx,
      ));
      results.push(makeInferredRisk(
        projectId, "risco_controle_empreendimento", "risk", "alta", "imediata",
        "Art. 270 LC 214/2025",
        `Obrigação de apuração segregada por empreendimento de construção civil (${op})`,
        0.85, ctx,
      ));
      // Condicionais (potenciais — confidence reduzido + nota; confirmar na Fase 3b)
      results.push(makeInferredRisk(
        projectId, "risco_permuta_imoveis", "risk", "alta", "curto_prazo",
        "Art. 252 §2º I e §5º LC 214/2025",
        `Risco tributário na permuta de imóveis — torna e manutenção do redutor (${op})`,
        0.55, ctx,
        "Risco potencial — aplica-se apenas a quem realiza permuta de imóveis; confirmar na Fase 3b.",
      ));
      results.push(makeInferredRisk(
        projectId, "risco_tributacao_parcelas", "risk", "media", "medio_prazo",
        "Art. 262 LC 214/2025",
        `Tributação do IBS/CBS no recebimento de cada parcela na incorporação/parcelamento (${op})`,
        0.55, ctx,
        "Risco potencial — aplica-se apenas a incorporação imobiliária ou parcelamento de solo; confirmar na Fase 3b.",
      ));
      results.push(makeInferredRisk(
        projectId, "risco_sujeicao_passiva_scp", "risk", "media", "medio_prazo",
        "Arts. 263-264 LC 214/2025",
        `Sujeição passiva — recolhimento pelo sócio ostensivo em sociedade em conta de participação (${op})`,
        0.55, ctx,
        "Risco potencial — aplica-se apenas a quem opera via SCP (sociedade em conta de participação); confirmar na Fase 3b.",
      ));
      results.push(makeInferredRisk(
        projectId, "risco_custos_historicos", "risk", "alta", "curto_prazo",
        "Art. 258 LC 214/2025",
        `Levantamento dos custos históricos dos imóveis até 31/12/2026 para o Redutor de Ajuste (${op})`,
        0.55, ctx,
        "Risco potencial — aplica-se apenas a quem tinha imóvel ou imóvel em construção antes de 2027; confirmar na Fase 3b.",
      ));
    }
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
