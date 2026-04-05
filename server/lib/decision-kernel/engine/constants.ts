/**
 * constants.ts — Decision Kernel: constantes canônicas de source
 *
 * Governança via código (não via schema) — ver RFC MIG-001.
 * O campo project_gaps_v3.source é varchar(20); os valores válidos
 * são controlados por esta constante.
 *
 * Aprovado: Orquestrador Claude — 2026-04-04
 */

export const VALID_SOURCES = ['solaris', 'iagen', 'engine', 'v1'] as const;
export const ENGINE_SOURCE = 'engine' as const;

// 'rag' foi explicitamente depreciado — ver docs/rag/RFC/CORPUS-RFC-MIG001.md

export type ValidSource = typeof VALID_SOURCES[number];

/**
 * Mapeamento engine → project_gaps_v3 (TASK-ENG-04)
 * Campos que já existem na tabela e recebem output do Decision Kernel:
 *
 *   source                       = ENGINE_SOURCE ('engine')
 *   evaluation_confidence        = confianca.valor / 100   (ex: 100 → 1.00, 98 → 0.98)
 *   evaluation_confidence_reason = confianca.tipo          (ex: 'deterministico')
 *   source_reference             = `${fonte.lei} ${fonte.artigo}`
 *   gap_description              = `NCM ${ncm_code}: ${regime} — ${descricao}`
 *
 * Nenhuma migration necessária — campos já existem no schema.
 */
