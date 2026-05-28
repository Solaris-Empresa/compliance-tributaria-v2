/**
 * e2e-alignment.test.ts — DIAG-COVERAGE-03 V3 (28/05/2026)
 *
 * Valida o alinhamento entre os 13 cenários E2E do Manus (28/05/2026, PIDs
 * 960015–960028, 13/13 × 10/10) e os gates determinísticos do pipeline.
 *
 * NÃO reproduz o E2E. Valida a camada de gate que ALIMENTA o LLM — para cada
 * cenário, confirma que `shouldInjectArt197` (D1-C) responde corretamente ao
 * par CNAE/NCM observado em produção. Esta suite é PURA (sem DB).
 *
 * Limites declarados (Lição #87):
 *   - Provar que o gate determinístico responde corretamente NÃO prova que o
 *     LLM downstream parafraseia corretamente. Cobertura aqui é da camada
 *     determinística que ALIMENTA o briefing — não do briefing em si.
 *   - O LLM pode citar Art. 197 (via grounding) MESMO quando shouldInjectArt197
 *     retorna false, se o reranker do RAG escolher Art. 197 por outras razões
 *     (não é injeção determinística). Esta suite só valida injeção determinística.
 *
 * Referência: evidence-13-full.json (Manus 28/05/2026 07:12).
 */
import { describe, it, expect } from "vitest";
import { shouldInjectArt197 } from "../lib/art197-injection";
import { shouldInjectCategory } from "../lib/deterministic-grounding";

// ─── E2E × shouldInjectArt197 — 8 cenários (controles negativos + sem NCM) ───
describe("E2E × Gates — shouldInjectArt197 (cenários do evidence-13-full.json)", () => {
  // Agro (T01/T02/T03) — CNAE 01xx / 1081 ≠ grupo 28 → false
  it("T01 soja NCM 1201.90.00 + CNAE 0115-6/00 (PID 960015): false", () =>
    expect(shouldInjectArt197(["0115-6/00"], ["1201.90.00"])).toBe(false));
  it("T02 milho NCM 1005.90.10 + CNAE 0111-3/02 (PID 960016): false", () =>
    expect(shouldInjectArt197(["0111-3/02"], ["1005.90.10"])).toBe(false));
  it("T03 café NCM 0901.21.00 + CNAE 1081-3/02 (PID 960017): false", () =>
    expect(shouldInjectArt197(["1081-3/02"], ["0901.21.00"])).toBe(false));
  // Combustíveis (T04/T06) — NCM 27xx ≠ família 8436 → false
  it("T04 diesel NCM 2710.19.21 transportadora 4930-2/02 (PID 960018): false", () =>
    expect(shouldInjectArt197(["4930-2/02"], ["2710.19.21"])).toBe(false));
  it("T06 gasolina NCM 2710.12.59 distribuidora 4681-8/01 (PID 960021): false", () =>
    expect(shouldInjectArt197(["4681-8/01"], ["2710.12.59"])).toBe(false));
  // Bebidas (T08) — NCM 22xx ≠ família 8436 → false
  it("T08 cerveja NCM 2203.00.00 distribuidora 4635-4/02 (PID 960023): false", () =>
    expect(shouldInjectArt197(["4635-4/02"], ["2203.00.00"])).toBe(false));
  // Pharma (T09) — NCM 30xx ≠ família 8436 → false
  it("T09 medicamentos NCM 3004.90.99 + CNAE 2121-1/01 (PID 960024): false", () =>
    expect(shouldInjectArt197(["2121-1/01"], ["3004.90.99"])).toBe(false));
  // TI/Serviços (T13) — sem NCM → false (gate exige NCM 8436.* presente)
  it("T13 TI sem NCM + CNAE 6201-5/01 (PID 960028): false", () =>
    expect(shouldInjectArt197(["6201-5/01"], [])).toBe(false));
});

// ─── E2E × pending_vigency — vigência futura NUNCA injeta ───────────────────
describe("E2E × Gates — pending_vigency (T01 confirma Arts. 245-250 via Decreto)", () => {
  // regime_diferenciado_produtor_rural_credito tem vigência 2027-01-01 (pending) —
  // mesmo que CNAE 0115-6/00 (soja, T01) case prefixo "0111-3", "0115-6" etc., o
  // gate vigência bloqueia. Em 2026-05-28 o T01 cita Arts. 245-250 no briefing via
  // Decreto 12.955 (grounding universal) — comportamento LLM, não gate determinístico,
  // correto por design.
  it("produtor_rural_credito (vigência 2027-01-01) NÃO injeta para 0115-6/00 em 2026-05-28", () => {
    expect(
      shouldInjectCategory(
        ["0111-3", "0112-1", "0115-6"],
        new Date("2027-01-01"),
        { cnae: "0115-6/00", today: new Date("2026-05-28") },
      ),
    ).toBe(false);
  });
});
