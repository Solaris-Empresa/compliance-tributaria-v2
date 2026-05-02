// generate-risks-pipeline.ts — Sprint Z-13.5
// Orquestra: consolidateRisks → inferNormativeRisks → merge → enrichWithRag
// Arquivo novo — não altera nenhum arquivo existente.

import { consolidateRisks, type GapRule, type OperationalContext } from "./risk-engine-v4";
import { inferNormativeRisks } from "./normative-inference";
import { enrichRiskWithRag } from "./rag-risk-validator";
import { extractProjectProfile } from "./project-profile-extractor";
import { getArchetypeContext } from "./archetype/getArchetypeContext";
import type { InsertRiskV4 } from "./db-queries-risks-v4";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PipelineSummary {
  total: number;
  alta: number;
  media: number;
  oportunidades: number;
  rag_validated: number;
  inferred: number;
}

export interface PipelineResult {
  risks: InsertRiskV4[];
  summary: PipelineSummary;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mergeByRiskKey(risks: InsertRiskV4[]): InsertRiskV4[] {
  const map = new Map<string, InsertRiskV4>();
  for (const risk of risks) {
    const key = risk.risk_key ?? risk.rule_id;
    map.set(key, risk);
  }
  return Array.from(map.values());
}

async function enrichAllWithRag(
  risks: InsertRiskV4[],
  timeoutMs: number,
): Promise<InsertRiskV4[]> {
  try {
    const enriched = await Promise.race([
      Promise.all(risks.map((r) => enrichRiskWithRag(r))),
      new Promise<InsertRiskV4[]>((_, reject) =>
        setTimeout(() => reject(new Error("RAG timeout")), timeoutMs)
      ),
    ]);
    return enriched;
  } catch {
    // Timeout or error — return risks without RAG enrichment
    return risks;
  }
}

// ─── Pipeline principal ──────────────────────────────────────────────────────

/**
 * Pipeline completa de geração de riscos v4.
 * 1. Extrai perfil do projeto
 * 2. Consolida gaps em riscos
 * 3. Infere riscos normativos
 * 4. Merge + dedup por risk_key
 * 5. Enriquece com RAG (timeout 3s)
 *
 * NÃO persiste — o caller (router) é responsável por persistir.
 */
export async function generateRisksV4Pipeline(
  projectId: number,
  gaps: GapRule[],
  actorId: number,
): Promise<PipelineResult> {
  // 1. Extrair perfil do projeto
  const profile = await extractProjectProfile(projectId);

  // 2. Extrair contexto operacional
  const context: OperationalContext = profile
    ? {
        tipoOperacao: profile.tipoOperacao ?? undefined,
        tipoCliente: profile.tipoCliente ?? undefined,
        multiestadual: profile.multiestadual ?? undefined,
        meiosPagamento: profile.meiosPagamento ?? undefined,
        intermediarios: profile.intermediarios ?? undefined,
      }
    : {};

  // 3. Consolidar gaps em riscos
  // M3 NOVA-06: enriquecer evidência com contexto do arquétipo (formato: "Objeto: X | Papel: Y | ...")
  const archetypeContext = profile
    ? getArchetypeContext(profile.archetype as Parameters<typeof getArchetypeContext>[0])
    : "";
  const consolidated = await consolidateRisks(
    projectId,
    gaps,
    context,
    actorId,
    archetypeContext || undefined,
  );

  // 4. Inferir riscos normativos independentes
  let inferred: InsertRiskV4[] = [];
  if (profile) {
    try {
      inferred = await inferNormativeRisks(projectId, profile);
    } catch {
      // Non-fatal — normative inference is additive
    }
  }

  // 5. Merge + dedup por risk_key (último vence em colisão)
  const merged = mergeByRiskKey([...consolidated, ...inferred]);

  // 6. Enriquecer com RAG (timeout 3s)
  const enriched = await enrichAllWithRag(merged, 3000);

  // 7. Summary
  const summary: PipelineSummary = {
    total: enriched.length,
    alta: enriched.filter((r) => r.severidade === "alta").length,
    media: enriched.filter((r) => r.severidade === "media").length,
    oportunidades: enriched.filter((r) => r.type === "opportunity").length,
    rag_validated: enriched.filter((r) => r.rag_validated === 1).length,
    inferred: inferred.length,
  };

  return { risks: enriched, summary };
}
