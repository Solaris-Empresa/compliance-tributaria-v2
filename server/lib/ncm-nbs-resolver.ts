// ncm-nbs-resolver.ts — GATE-NCM-NBS #1219 F2 (ADR-0035)
// Resolver ÚNICO em cascata para NCM/NBS — ponto único de decisão.
// Cascata: específico → grupo → capítulo → fallback (regime_geral).
// Princípio (ADR-0035): armazena-se o específico; decide-se pelo grupo.
//
// Fonte das regras: tabelas normative_product_rules / normative_service_rules
// (campos regime, {ncm,nbs}_code, match_mode). NÃO usa o Decision Kernel dataset
// (exact-only) — esse permanece em deriveObjeto (ver Lição #74 / F10 abaixo).
//
// F10 (R1) — verificado nesta sessão: deriveObjetoFromNbs("1.0501") cai em
// fallback servico_geral (lookupNbs é exact-only; o dataset não tem grupos),
// ANTES de extractNbsDivisao. NÃO quebra (sem throw) — degrada para genérico.
// O resolveNbs aqui resolve grupo via normative_service_rules (prefix), caminho
// separado. Migração de deriveObjeto para consumir o resolver fica em F3.

import { drizzle } from "drizzle-orm/mysql2";

// ─── Contrato (ADR-0035 §3 — NÃO alterar a interface) ──────────────────────────
export interface NcmNbsResolution {
  code: string; // código informado pelo usuário
  resolution_level: "specific" | "group" | "chapter" | "fallback";
  resolved_code: string; // código usado para decisão (ncm_code/nbs_code da regra vencedora)
  regime: string;
  confidence: number; // PLACEHOLDER — calibrar em F5 com dados reais
  source: "normative_rules" | "dataset" | "fallback" | "negative_precedence"; // §10 exclusion list
}

// ─── Confidence (R4) — PLACEHOLDER, calibrar em F5; NÃO são valores finais ──────
export const CONFIDENCE_SPECIFIC = 0.98; // PLACEHOLDER — exato/refino
export const CONFIDENCE_GROUP = 0.8; // PLACEHOLDER — grupo (posição/subposição)
export const CONFIDENCE_CHAPTER = 0.6; // PLACEHOLDER — capítulo
export const CONFIDENCE_FALLBACK = 0.3; // PLACEHOLDER — sem regra

const REGIME_FALLBACK = "regime_geral";

// ─── Feature flag (ADR-0035 §6) — rollback ──────────────────────────────────────
// Integração nos 4 matchers (F3) DEVE gatear em isNcmResolverEnabled(): quando
// false (default), os matchers mantêm o comportamento atual e não consomem o
// resolver. O resolver em si é função pura/utilitária (sempre classifica).
export function isNcmResolverEnabled(): boolean {
  return process.env.ENABLE_NCM_RESOLVER === "true";
}

// Regra normativa (alinhado a normative-inference.ts NormativeRule).
export interface ResolverRule {
  regime: string;
  code: string; // ncm_code ou nbs_code
  match_mode: "exact" | "prefix";
  // #1492 (ADR-0035 §10) — exclusion list / precedência negativa.
  // active=0 ⇒ regra desativada (curada) que BLOQUEIA o grupo pai ativo se for a
  // mais específica a casar. Opcional: ausente (testes puros pré-#1492) = tratado
  // como ativa (caminho normal). DB: tinyint 0/1.
  active?: number;
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Núcleo PURO da cascata — testável sem DB (Lição #65).
 * Encontra a regra mais específica que casa o código e classifica o nível.
 *
 * - exact: dígitos do código === dígitos da regra
 * - prefix: dígitos do código começam com os dígitos da regra
 * - vencedor: regra com mais dígitos (mais específica)
 * - nível por granularidade do vencedor: exact ou >=6 díg. = specific ·
 *   4-5 díg. = group · 2-3 díg. = chapter
 * - sem match → fallback (regime_geral)
 */
export function classifyResolution(
  code: string,
  rules: ResolverRule[],
): NcmNbsResolution {
  const norm = digitsOnly(code);

  const matches = rules.filter((r) => {
    const rnorm = digitsOnly(r.code);
    if (rnorm.length === 0) return false;
    return r.match_mode === "exact" ? norm === rnorm : norm.startsWith(rnorm);
  });

  if (matches.length === 0) {
    return {
      code,
      resolution_level: "fallback",
      resolved_code: code,
      regime: REGIME_FALLBACK,
      confidence: CONFIDENCE_FALLBACK,
      source: "fallback",
    };
  }

  const winner = matches.reduce((a, b) =>
    digitsOnly(b.code).length > digitsOnly(a.code).length ? b : a,
  );

  // ─── Precedência negativa (ADR-0035 §10 — exclusion list / #1492) ───────────
  // Se a regra MAIS específica que casa o código está active=0 (desativação
  // curada — ex.: 1006.10 sem_beneficio, P.O. v17), ela SOMBREIA o grupo pai
  // ativo: o resolver NÃO propaga o match do grupo. Retorna o regime declarado
  // pela regra inativa ou, na ausência, regime_geral.
  // `active` ausente (undefined, testes puros pré-#1492) → caminho normal.
  if (Number(winner.active) === 0) {
    return {
      code,
      resolution_level: "specific",
      resolved_code: winner.code,
      regime: winner.regime || REGIME_FALLBACK,
      // confidence: específico desativado é determinação de alta confiança
      // (sabemos que NÃO herda o benefício). REGRA-ORQ-21 — valor não congelado no ADR.
      confidence: CONFIDENCE_SPECIFIC,
      source: "negative_precedence",
    };
  }

  const wlen = digitsOnly(winner.code).length;

  const level: NcmNbsResolution["resolution_level"] =
    winner.match_mode === "exact" || wlen >= 6
      ? "specific"
      : wlen >= 4
        ? "group"
        : "chapter";

  const confidence =
    level === "specific"
      ? CONFIDENCE_SPECIFIC
      : level === "group"
        ? CONFIDENCE_GROUP
        : CONFIDENCE_CHAPTER;

  return {
    code,
    resolution_level: level,
    resolved_code: winner.code,
    regime: winner.regime,
    confidence,
    source: "normative_rules",
  };
}

// ─── DB (padrão de normative-inference.ts) ──────────────────────────────────────
let _db: ReturnType<typeof drizzle> | null = null;
function getDb(): ReturnType<typeof drizzle> {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  if (!_db) throw new Error("[ncm-nbs-resolver] DATABASE_URL não configurado");
  return _db;
}

// #1492 (ADR-0035 §10): carrega TODAS as regras (ativas + inativas). As regras
// active=0 entram no conjunto como blacklist de precedência negativa — não são
// mais filtradas no SELECT (era `WHERE active = 1`). O bloqueio é decidido em
// classifyResolution. (Nome `loadActiveRules` mantido por escopo cirúrgico — ver
// nota de rename Nível 2 no PR #1492.)
async function loadActiveRules(
  table: "normative_product_rules" | "normative_service_rules",
  codeCol: "ncm_code" | "nbs_code",
): Promise<ResolverRule[]> {
  // table/codeCol são literais controlados (union fechada) — sem injeção.
  const db = getDb();
  const [rows] = await (db.$client as any)
    .promise()
    .execute(
      `SELECT regime, ${codeCol} AS code, match_mode, active FROM ${table}`,
    );
  return rows as ResolverRule[];
}

/** Resolve um NCM via normative_product_rules em cascata. */
export async function resolveNcm(code: string): Promise<NcmNbsResolution> {
  const rules = await loadActiveRules("normative_product_rules", "ncm_code");
  return classifyResolution(code, rules);
}

/** Resolve um NBS via normative_service_rules em cascata. */
export async function resolveNbs(code: string): Promise<NcmNbsResolution> {
  const rules = await loadActiveRules("normative_service_rules", "nbs_code");
  return classifyResolution(code, rules);
}
