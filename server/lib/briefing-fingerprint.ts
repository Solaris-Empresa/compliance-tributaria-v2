/**
 * briefing-fingerprint.ts — fingerprint por fonte para freshness check (2026-04-21)
 *
 * Cada uma das 6 fontes do briefing tem um fingerprint { ts, hash }:
 *   ts   = timestamp da última mudança detectável
 *   hash = SHA256 canônico do conteúdo atual
 *
 * Comparação:
 *   hash igual → sem mudança (ignora ts divergente — save sem alteração)
 *   hash diferente → mudança real → banner no UI
 *
 * Canonicalização: JSON com chaves ordenadas alfabeticamente antes de hashear.
 * Garante que mesmo conteúdo em ordem diferente → mesmo hash.
 */

import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import * as schema from "../../drizzle/schema";
import * as db from "../db";

export type SourceKey = "perfil" | "q1_solaris" | "q2_iagen" | "q3_cnae" | "q3_produtos" | "q3_servicos";

export interface SourceFingerprint {
  /** ISO 8601 timestamp, ou null se fonte ainda não foi tocada. */
  ts: string | null;
  /** SHA256 hex do conteúdo canonicalizado. */
  hash: string;
}

export type BriefingFingerprints = Record<SourceKey, SourceFingerprint>;

// ─────────────────────────────────────────────────────────────────────────────
// Canonicalização e hash
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna JSON canônico com chaves ordenadas alfabeticamente em todos os
 * níveis. Garante determinismo independente da ordem de inserção.
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(sortKeysDeep);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return Object.keys(o)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeysDeep(o[k]);
        return acc;
      }, {});
  }
  return v;
}

/** SHA256 hex do JSON canônico. */
export function hashContent(value: unknown): string {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}

function toIso(ts: number | string | Date | null | undefined): string | null {
  if (ts == null) return null;
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === "number") return new Date(ts).toISOString();
  if (typeof ts === "string") {
    const n = Number(ts);
    if (Number.isFinite(n)) return new Date(n).toISOString();
    return ts; // assumir já é ISO
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fingerprint por fonte
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Perfil — hash do conteúdo dos 5 JSONs + name + description.
 * Timestamp: projects.updatedAt (compartilhado).
 */
export async function fingerprintPerfil(input: {
  projectId: number;
  projectName?: string | null;
  projectDescription?: string | null;
  companyProfile?: unknown;
  operationProfile?: unknown;
  taxComplexity?: unknown;
  financialProfile?: unknown;
  governanceProfile?: unknown;
  projectUpdatedAt?: number | string | Date | null;
}): Promise<SourceFingerprint> {
  const payload = {
    name: input.projectName ?? null,
    description: input.projectDescription ?? null,
    companyProfile: input.companyProfile ?? null,
    operationProfile: input.operationProfile ?? null,
    taxComplexity: input.taxComplexity ?? null,
    financialProfile: input.financialProfile ?? null,
    governanceProfile: input.governanceProfile ?? null,
  };
  return {
    ts: toIso(input.projectUpdatedAt ?? null),
    hash: hashContent(payload),
  };
}

/**
 * Q1 SOLARIS — hash das respostas (project_id, codigo, resposta) + ts do MAX updated_at.
 * Nota: total dinâmico de perguntas elegíveis NÃO entra no hash do Q1 (é signal independente).
 * Razão: se jurídico mudar pergunta SOLARIS, hash de Q1 fica igual mas o total muda.
 * O cálculo de confiança muda, mas o "snapshot Q1" é das respostas do projeto.
 */
export async function fingerprintQ1Solaris(projectId: number): Promise<SourceFingerprint> {
  const database = await db.getDb();
  if (!database) return { ts: null, hash: hashContent([]) };
  const rows = await database
    .select({
      codigo: schema.solarisAnswers.codigo,
      resposta: schema.solarisAnswers.resposta,
      updatedAt: schema.solarisAnswers.updatedAt,
    })
    .from(schema.solarisAnswers)
    .where(eq(schema.solarisAnswers.projectId, projectId));
  const maxTs = rows.reduce<number>((m, r) => {
    const n = Number(r.updatedAt);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  const payload = rows
    .map((r) => ({ codigo: r.codigo, resposta: r.resposta }))
    .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)));
  return {
    ts: maxTs > 0 ? toIso(maxTs) : null,
    hash: hashContent(payload),
  };
}

/**
 * Q2 IA Gen — hash das respostas + ts do MAX updated_at.
 */
export async function fingerprintQ2Iagen(projectId: number): Promise<SourceFingerprint> {
  const database = await db.getDb();
  if (!database) return { ts: null, hash: hashContent([]) };
  const rows = await database
    .select({
      questionText: schema.iagenAnswers.questionText,
      resposta: schema.iagenAnswers.resposta,
      updatedAt: schema.iagenAnswers.updatedAt,
    })
    .from(schema.iagenAnswers)
    .where(eq(schema.iagenAnswers.projectId, projectId));
  const maxTs = rows.reduce<number>((m, r) => {
    const n = Number(r.updatedAt);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  const payload = rows
    .map((r) => ({ q: r.questionText, r: r.resposta }))
    .sort((a, b) => String(a.q).localeCompare(String(b.q)));
  return {
    ts: maxTs > 0 ? toIso(maxTs) : null,
    hash: hashContent(payload),
  };
}

/**
 * Q3 CNAE — hash do questionnaireAnswers JSON + perguntas no cache.
 * Perguntas geradas (cache) entram porque add/remove de pergunta muda o Q3.
 * Timestamp: MAX entre cache.updatedAt (não existe updated_at na v3?) e agora projects.updatedAt como fallback.
 */
export async function fingerprintQ3Cnae(input: {
  projectId: number;
  questionnaireAnswers?: unknown;
  projectUpdatedAt?: number | string | Date | null;
}): Promise<SourceFingerprint> {
  const database = await db.getDb();
  let cacheContent: any[] = [];
  let cacheMaxTs = 0;
  if (database) {
    const rows = await database
      .select({
        cnaeCode: schema.questionnaireQuestionsCache.cnaeCode,
        level: schema.questionnaireQuestionsCache.level,
        questionsJson: schema.questionnaireQuestionsCache.questionsJson,
        updatedAt: schema.questionnaireQuestionsCache.updatedAt,
      })
      .from(schema.questionnaireQuestionsCache)
      .where(eq(schema.questionnaireQuestionsCache.projectId, input.projectId));
    for (const r of rows) {
      const ts = r.updatedAt instanceof Date ? r.updatedAt.getTime() : Number(r.updatedAt);
      if (Number.isFinite(ts) && ts > cacheMaxTs) cacheMaxTs = ts;
      try {
        const arr = typeof r.questionsJson === "string" ? JSON.parse(r.questionsJson) : [];
        cacheContent.push({ cnae: r.cnaeCode, level: r.level, perguntas: Array.isArray(arr) ? arr.length : 0 });
      } catch {
        cacheContent.push({ cnae: r.cnaeCode, level: r.level, perguntas: 0 });
      }
    }
  }
  const answers = Array.isArray(input.questionnaireAnswers)
    ? input.questionnaireAnswers
    : typeof input.questionnaireAnswers === "string"
      ? (() => {
          try { return JSON.parse(input.questionnaireAnswers as string); } catch { return []; }
        })()
      : [];
  const payload = {
    cache: cacheContent.sort((a, b) => a.cnae.localeCompare(b.cnae)),
    answers,
  };
  const ts = cacheMaxTs > 0
    ? toIso(cacheMaxTs)
    : toIso(input.projectUpdatedAt ?? null);
  return {
    ts,
    hash: hashContent(payload),
  };
}

/**
 * Q3 Produtos — hash do productAnswers JSON + principaisProdutos.
 * Timestamp: projects.updatedAt (granularidade: qualquer mudança em projects).
 */
export async function fingerprintQ3Produtos(input: {
  productAnswers?: unknown;
  principaisProdutos?: any[];
  projectUpdatedAt?: number | string | Date | null;
}): Promise<SourceFingerprint> {
  const answers = Array.isArray(input.productAnswers)
    ? input.productAnswers
    : typeof input.productAnswers === "string"
      ? (() => {
          try { return JSON.parse(input.productAnswers as string); } catch { return []; }
        })()
      : [];
  const produtos = Array.isArray(input.principaisProdutos) ? input.principaisProdutos : [];
  const payload = { produtos, answers };
  return {
    ts: toIso(input.projectUpdatedAt ?? null),
    hash: hashContent(payload),
  };
}

/**
 * Q3 Serviços — hash do serviceAnswers JSON + principaisServicos.
 */
export async function fingerprintQ3Servicos(input: {
  serviceAnswers?: unknown;
  principaisServicos?: any[];
  projectUpdatedAt?: number | string | Date | null;
}): Promise<SourceFingerprint> {
  const answers = Array.isArray(input.serviceAnswers)
    ? input.serviceAnswers
    : typeof input.serviceAnswers === "string"
      ? (() => {
          try { return JSON.parse(input.serviceAnswers as string); } catch { return []; }
        })()
      : [];
  const servicos = Array.isArray(input.principaisServicos) ? input.principaisServicos : [];
  const payload = { servicos, answers };
  return {
    ts: toIso(input.projectUpdatedAt ?? null),
    hash: hashContent(payload),
  };
}

/**
 * Computa os 6 fingerprints em paralelo.
 */
export async function computeAllFingerprints(input: {
  projectId: number;
  projectName?: string | null;
  projectDescription?: string | null;
  companyProfile?: unknown;
  operationProfile?: unknown;
  taxComplexity?: unknown;
  financialProfile?: unknown;
  governanceProfile?: unknown;
  questionnaireAnswers?: unknown;
  productAnswers?: unknown;
  serviceAnswers?: unknown;
  projectUpdatedAt?: number | string | Date | null;
}): Promise<BriefingFingerprints> {
  const opProfileAny = (input.operationProfile ?? {}) as Record<string, any>;
  const [perfil, q1, q2, q3cnae, q3produtos, q3servicos] = await Promise.all([
    fingerprintPerfil({
      projectId: input.projectId,
      projectName: input.projectName,
      projectDescription: input.projectDescription,
      companyProfile: input.companyProfile,
      operationProfile: input.operationProfile,
      taxComplexity: input.taxComplexity,
      financialProfile: input.financialProfile,
      governanceProfile: input.governanceProfile,
      projectUpdatedAt: input.projectUpdatedAt,
    }),
    fingerprintQ1Solaris(input.projectId),
    fingerprintQ2Iagen(input.projectId),
    fingerprintQ3Cnae({
      projectId: input.projectId,
      questionnaireAnswers: input.questionnaireAnswers,
      projectUpdatedAt: input.projectUpdatedAt,
    }),
    fingerprintQ3Produtos({
      productAnswers: input.productAnswers,
      principaisProdutos: opProfileAny.principaisProdutos ?? [],
      projectUpdatedAt: input.projectUpdatedAt,
    }),
    fingerprintQ3Servicos({
      serviceAnswers: input.serviceAnswers,
      principaisServicos: opProfileAny.principaisServicos ?? [],
      projectUpdatedAt: input.projectUpdatedAt,
    }),
  ]);
  return {
    perfil,
    q1_solaris: q1,
    q2_iagen: q2,
    q3_cnae: q3cnae,
    q3_produtos: q3produtos,
    q3_servicos: q3servicos,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Diff de fingerprints — detecta divergência entre snapshot e atual
// ─────────────────────────────────────────────────────────────────────────────

export interface FingerprintDiff {
  source: SourceKey;
  changed: boolean;
  /** Razão da divergência: "hash" (mudança real) · "ts_only" (save sem mudança) · "none". */
  reason: "hash" | "ts_only" | "none";
  before: SourceFingerprint | null;
  after: SourceFingerprint;
}

export function diffFingerprints(
  before: BriefingFingerprints | null,
  after: BriefingFingerprints
): FingerprintDiff[] {
  const keys: SourceKey[] = ["perfil", "q1_solaris", "q2_iagen", "q3_cnae", "q3_produtos", "q3_servicos"];
  return keys.map((key) => {
    const b = before ? before[key] : null;
    const a = after[key];
    if (!b) {
      // Sem snapshot prévio — tudo é "novo" mas não é "divergente"
      return { source: key, changed: false, reason: "none" as const, before: null, after: a };
    }
    if (b.hash !== a.hash) {
      return { source: key, changed: true, reason: "hash" as const, before: b, after: a };
    }
    if (b.ts !== a.ts) {
      // Timestamp divergente mas hash igual → save sem mudança, ignora.
      return { source: key, changed: false, reason: "ts_only" as const, before: b, after: a };
    }
    return { source: key, changed: false, reason: "none" as const, before: b, after: a };
  });
}

/** True se QUALQUER fonte mudou (hash diferente). */
export function hasDivergence(diffs: FingerprintDiff[]): boolean {
  return diffs.some((d) => d.changed);
}

void sql;
