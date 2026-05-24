/**
 * cnae-oportunidade-engine.test.ts — FEAT-SCOPE-01 (#1177)
 *
 * Test contracts (REGRA-ORQ-28) de CONSUMO no engine (Lição #59 — assemble ≠
 * consumption): prova que `consolidateRisks` de fato PULA ou EMITE a
 * oportunidade `aliquota_reduzida` conforme o CNAE do projeto.
 *
 * Mocka as duas camadas DB (getCategoryByCode → null → SEVERITY_TABLE;
 * getCnaeOportunidadeRows → fixture do seed Fase 1).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  consolidateRisks,
  type GapRule,
  type OperationalContext,
} from "./risk-engine-v4";
import type { CnaeOportunidadeRow } from "./cnae-oportunidade-eligibility";

vi.mock("./db-queries-risk-categories", () => ({
  listActiveCategories: vi.fn(),
  getCategoryByCode: vi.fn(() => Promise.resolve(null)), // fallback SEVERITY_TABLE
}));
vi.mock("./db-queries-cnae-oportunidade", () => ({
  getCnaeOportunidadeRows: vi.fn(),
  clearCnaeOportunidadeCache: vi.fn(),
}));

import { getCnaeOportunidadeRows } from "./db-queries-cnae-oportunidade";

const SEED: CnaeOportunidadeRow[] = [
  { cnae_4dig: "7112", elegibilidade: "potencial", gate_especial: null, requer_questionario: 1, inciso_art127: "XI — Engenheiros", conselho_profissional: "CREA/CONFEA" },
  { cnae_4dig: "9311", elegibilidade: "potencial", gate_especial: "§3º", requer_questionario: 0, inciso_art127: "X — Ed. Física", conselho_profissional: "CREF" },
  { cnae_4dig: "4120", elegibilidade: "excluido", gate_especial: null, requer_questionario: 0, inciso_art127: null, conselho_profissional: null },
];

function gapAliquota(): GapRule {
  return {
    ruleId: "RULE-AR-1",
    categoria: "aliquota_reduzida",
    artigo: "Art. 127",
    fonte: "cnae",
    gapClassification: "ausencia",
    requirementId: "REQ-AR",
    sourceReference: "LC 214/2025 Art. 127",
    domain: "fiscal",
  };
}

const hasAliquota = (out: { categoria: string }[]) =>
  out.some((r) => r.categoria === "aliquota_reduzida");

describe("FEAT-SCOPE-01 — consumo no engine (consolidateRisks)", () => {
  beforeEach(() => {
    vi.mocked(getCnaeOportunidadeRows).mockResolvedValue(SEED);
  });

  it("Contract 1 — CNAE 4120 (construtora) → NÃO emite aliquota_reduzida", async () => {
    const ctx: OperationalContext = { tipoOperacao: "servico", confirmedCnaes: ["4120-4/00"] };
    const out = await consolidateRisks(1, [gapAliquota()], ctx, 1);
    expect(hasAliquota(out)).toBe(false);
  });

  it("Contract 2 — CNAE 7112 (engenharia) → EMITE aliquota_reduzida (gate §1º II)", async () => {
    const ctx: OperationalContext = { tipoOperacao: "servico", confirmedCnaes: ["7112-0/00"] };
    const out = await consolidateRisks(1, [gapAliquota()], ctx, 1);
    expect(hasAliquota(out)).toBe(true);
  });

  it("Contract 3 — CNAE 9311 (ed. física) → EMITE aliquota_reduzida (gate §3º)", async () => {
    const ctx: OperationalContext = { tipoOperacao: "servico", confirmedCnaes: ["9311-5/00"] };
    const out = await consolidateRisks(1, [gapAliquota()], ctx, 1);
    expect(hasAliquota(out)).toBe(true);
  });

  it("Edge — sem CNAE → NÃO emite (default conservador)", async () => {
    const ctx: OperationalContext = { tipoOperacao: "servico" };
    const out = await consolidateRisks(1, [gapAliquota()], ctx, 1);
    expect(hasAliquota(out)).toBe(false);
  });
});
