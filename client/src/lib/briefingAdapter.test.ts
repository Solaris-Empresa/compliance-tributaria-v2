// briefingAdapter.test.ts — Tríade ORQ-28 Artefato 2 (test contracts)
// Issue #1344 | PR #1354 | Criado: 2026-06-03
// SKELETON — contratos declarados como it.todo. Implementação bloqueada até spec-aprovada.
import { describe, it } from "vitest";

describe("briefingAdapter", () => {
  it.todo("retorna fallback legado quando briefingStructured é null (DP-01 P0 — 98% dos projetos)");
  it.todo("retorna fallback legado quando briefingStructured é string vazia");
  it.todo("confidence_score.nivel_confianca é number 0-100 (OBJECT, não number direto — ai-schemas.ts:237)");
  it.todo("gap.gap é string não-vazia (NÃO gap.titulo — campo inexistente)");
  it.todo("_hallucination_detected ausente → false por default (optional chaining)");
  it.todo("recomendacoes_prioritarias existe (NÃO 'recomendacoes' — campo inexistente)");
  it.todo("double-encoding: briefingStructured string → JSON.parse → objeto (DP-19/Lição #72)");
  it.todo("approval_reservation null → estado aprovado sem ressalva");
  it.todo("strip 'Aplicação obrigatória: ' do source_reference para dados legados (N2-b)");
  it.todo("top_3_acoes ausente → array vazio (campo opcional ai-schemas.ts:225)");
});
