/**
 * credito-presumido-engine.test.ts — FEAT-SCOPE-02 (#1201)
 * Consumo no engine (Lição #59): consolidateRisks PULA/EMITE credito_presumido conforme
 * o gate, e NÃO afeta outras categorias (C8 split_payment / C9 aliquota_reduzida).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  consolidateRisks,
  type GapRule,
  type OperationalContext,
} from "./risk-engine-v4";

vi.mock("./db-queries-risk-categories", () => ({
  listActiveCategories: vi.fn(),
  getCategoryByCode: vi.fn(() => Promise.resolve(null)), // fallback SEVERITY_TABLE
}));
vi.mock("./credito-presumido-eligibility", () => ({
  isCreditoPresumidoArt168Eligible: vi.fn(),
}));
vi.mock("./cnae-oportunidade-eligibility", () => ({
  isAliquotaReduzidaEligible: vi.fn(() =>
    Promise.resolve({ eligible: true, reason: "potencial" }),
  ),
}));

import { isCreditoPresumidoArt168Eligible } from "./credito-presumido-eligibility";

function gap(categoria: string, ruleId: string): GapRule {
  return {
    ruleId,
    categoria,
    artigo: "Art. 168",
    fonte: "cnae",
    gapClassification: "ausencia",
    requirementId: "REQ-CRE-001",
    sourceReference: "Art. 168 LC 214",
    domain: "creditos_ressarcimento",
  };
}

const ctx: OperationalContext = { tipoOperacao: "industria", confirmedCnaes: ["4120-4/00"] };
const has = (out: { categoria: string }[], c: string) => out.some((r) => r.categoria === c);

describe("FEAT-SCOPE-02 — consumo no engine (consolidateRisks)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("credito_presumido elegível → EMITE", async () => {
    vi.mocked(isCreditoPresumidoArt168Eligible).mockResolvedValue({ eligible: true, reason: null });
    const out = await consolidateRisks(1, [gap("credito_presumido", "CP-1")], ctx, 1, undefined, "lucro_real");
    expect(has(out, "credito_presumido")).toBe(true);
  });

  it("credito_presumido NÃO elegível → SKIP", async () => {
    vi.mocked(isCreditoPresumidoArt168Eligible).mockResolvedValue({ eligible: false, reason: "SOL-051_negativa" });
    const out = await consolidateRisks(1, [gap("credito_presumido", "CP-1")], ctx, 1, undefined, "lucro_real");
    expect(has(out, "credito_presumido")).toBe(false);
  });

  it("C8 — split_payment NÃO afetado pelo gate credito_presumido", async () => {
    vi.mocked(isCreditoPresumidoArt168Eligible).mockResolvedValue({ eligible: false, reason: "x" });
    const out = await consolidateRisks(1, [gap("split_payment", "SP-1")], ctx, 1, undefined, "lucro_real");
    expect(has(out, "split_payment")).toBe(true);
  });

  it("C9 — aliquota_reduzida NÃO afetada pelo gate credito_presumido", async () => {
    vi.mocked(isCreditoPresumidoArt168Eligible).mockResolvedValue({ eligible: false, reason: "x" });
    const out = await consolidateRisks(1, [gap("aliquota_reduzida", "AR-1")], ctx, 1, undefined, "lucro_real");
    expect(has(out, "aliquota_reduzida")).toBe(true);
  });
});
