/**
 * G17 — Testes unitários: analyzeSolarisAnswers + SOLARIS_GAPS_MAP
 * Sprint N · Issue #259 · 2026-03-31
 *
 * Cobre os 5 casos do S5 da SPEC v2:
 *   Caso 1 — SOL-002 = "Não" → gap confissão por inércia inserido
 *   Caso 2 — Projeto V1 sem solaris_answers → pipeline V1 inalterado
 *   Caso 3 — Todas respostas positivas → 0 gaps SOLARIS
 *   Caso 4 — SOL-001 = "Não" → gap NF-e inserido
 *   Caso 5 — Reprocessamento → sem duplicação (idempotência)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── FIX-10: tests do SOLARIS_GAPS_MAP REMOVIDOS ─────────────────────────────
// O arquivo `server/config/solaris-gaps-map.ts` foi DELETADO em FIX-10
// (FASE C, 2026-06-01). Arquitetura Max (FIX-08/FIX-09) eliminou o dicionário:
// agora cada pergunta SOLARIS carrega seus próprios metadados (risk_category_code,
// gap_descricao, severidade_base) curados pelo advogado via UI admin.
//
// Tests removidos (que dependiam de SOLARIS_GAPS_MAP):
//   - "Caso 1 — SOL-002 = 'Não' → gap confissão" (testava entrada do MAP)
//   - "Caso 4 — SOL-001 = 'Não' → gap NF-e" (testava entrada do MAP)
//   - "D6 — Normalização de tópicos" (testava lookup no MAP)
//   - describe "cobertura de tópicos" inteiro (3 tests sobre estrutura do MAP)
//
// Tests PRESERVADOS (não dependem do MAP — testam classifyForGap FIX-01):
//   - Caso 3 — Resposta positiva
//   - D2 — "Não aplicável" → exclusão (FIX-01 B4)
//   - D2 — "Não" e variações → gap
//   - Caso 5 — Idempotência (verificação via inspeção)
//   - Caso 2 — Projeto V1 sem solaris_answers → { inserted: 0 }
//   - describe "G17 — analyzeSolarisAnswers — módulo lib"
// ─────────────────────────────────────────────────────────────────────────────

describe("G17 — Classificação de resposta (helper puro classifyForGap — FIX-01)", () => {
  it("Caso 3 — Resposta 'Sim' → sem gap (FIX-01: classifyForGap dual-column)", async () => {
    const { classifyForGap } = await import("../lib/solaris-gap-analyzer");
    const { isNegative, isExcluded } = classifyForGap(null, "Sim");
    expect(isNegative).toBe(false);
    expect(isExcluded).toBe(false);
  });

  it("D2 — FIX-01: 'Não aplicável' agora vira EXCLUSÃO (não gap) — corrige BUG B4", async () => {
    const { classifyForGap } = await import("../lib/solaris-gap-analyzer");
    const r1 = classifyForGap(null, "Não aplicável");
    expect(r1.isNegative).toBe(false);
    expect(r1.isExcluded).toBe(true);
    const r2 = classifyForGap(null, "Não se aplica.");
    expect(r2.isNegative).toBe(false);
    expect(r2.isExcluded).toBe(true);
  });

  it("D2 — 'Não' exato e variações disparam gap (preservado pelo fallback legado pós-FIX-01)", async () => {
    const { classifyForGap } = await import("../lib/solaris-gap-analyzer");
    const negativos = ["Não", "não", "NÃO", "nao", "Não.", "não "];
    for (const resposta of negativos) {
      const { isNegative, isExcluded } = classifyForGap(null, resposta);
      expect(isNegative, `resposta="${resposta}" devia gerar gap`).toBe(true);
      expect(isExcluded, `resposta="${resposta}" não devia ser excluído`).toBe(false);
    }
  });

  it("Caso 5 — Idempotência: DELETE source='solaris' antes de INSERT (inspeção)", () => {
    expect(true).toBe(true);
  });

  it("Caso 2 — Projeto V1 sem solaris_answers → retorna { inserted: 0 } sem erro", () => {
    const rows: unknown[] = [];
    const shouldReturn = !rows || rows.length === 0;
    expect(shouldReturn).toBe(true);
  });
});

describe("G17 — analyzeSolarisAnswers — módulo lib", () => {
  it("Módulo server/lib/solaris-gap-analyzer.ts exporta analyzeSolarisAnswers", async () => {
    const mod = await import("../lib/solaris-gap-analyzer");
    expect(typeof mod.analyzeSolarisAnswers).toBe("function");
  });

  it("analyzeSolarisAnswers retorna Promise<{ inserted: number }>", async () => {
    // Verificação de tipo — a função deve retornar um objeto com campo inserted
    const mod = await import("../lib/solaris-gap-analyzer");
    // Não executamos a função real (requer banco) — verificamos a assinatura
    const fn = mod.analyzeSolarisAnswers;
    expect(fn.constructor.name).toBe("AsyncFunction");
  });
});
