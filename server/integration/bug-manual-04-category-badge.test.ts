/**
 * BUG-MANUAL-04 — Testes M04-01..M04-06
 * ADR-0013: CategoryBadge risk_category_l2 no Frontend (RisksV3)
 *
 * Verifica:
 *   M04-01: Schema projectRisksV3 tem coluna riskCategoryL2
 *   M04-02: Tipo RiskItem tem campo riskCategoryL2 opcional
 *   M04-03: CategoryBadge exportado de Badges.tsx
 *   M04-04: CategoryBadge cobre 10 categorias canônicas LC 214/2025
 *   M04-05: RisksV3.tsx importa CategoryBadge
 *   M04-06: RisksV3.tsx tem coluna "Categoria" na tabela
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "../..");

// ── M04-01: Schema tem riskCategoryL2 ────────────────────────────────────────
describe("M04-01 — Schema projectRisksV3 tem riskCategoryL2", () => {
  it("drizzle/schema-compliance-engine-v3.ts deve declarar riskCategoryL2", () => {
    const schema = readFileSync(
      join(ROOT, "drizzle/schema-compliance-engine-v3.ts"),
      "utf-8"
    );
    expect(schema).toContain('riskCategoryL2');
    expect(schema).toContain('"risk_category_l2"');
  });
});

// ── M04-02: Tipo RiskItem tem riskCategoryL2 ─────────────────────────────────
describe("M04-02 — Tipo RiskItem tem riskCategoryL2", () => {
  it("client/src/types/compliance-v3/index.ts deve ter riskCategoryL2 no RiskItem", () => {
    const types = readFileSync(
      join(ROOT, "client/src/types/compliance-v3/index.ts"),
      "utf-8"
    );
    expect(types).toContain("riskCategoryL2");
    // Deve ser opcional (nullable)
    expect(types).toMatch(/riskCategoryL2\??\s*:\s*string\s*\|\s*null/);
  });
});

// ── M04-03: CategoryBadge exportado de Badges.tsx ────────────────────────────
describe("M04-03 — CategoryBadge exportado de Badges.tsx", () => {
  it("Badges.tsx deve exportar CategoryBadge", () => {
    const badges = readFileSync(
      join(ROOT, "client/src/components/compliance-v3/shared/Badges.tsx"),
      "utf-8"
    );
    expect(badges).toContain("export function CategoryBadge");
  });
});

// ── M04-04: CategoryBadge cobre 10 categorias canônicas ──────────────────────
describe("M04-04 — CategoryBadge cobre 10 categorias canônicas LC 214/2025", () => {
  const CATEGORIAS_CANONICAS = [
    "imposto_seletivo",
    "ibs_cbs",
    "regime_diferenciado",
    "aliquota_reduzida",
    "aliquota_zero",
    "split_payment",
    "cadastro_fiscal",
    "obrigacao_acessoria",
    "transicao",
    "enquadramento_geral",
  ];

  it("Badges.tsx deve conter todas as 10 categorias canônicas", () => {
    const badges = readFileSync(
      join(ROOT, "client/src/components/compliance-v3/shared/Badges.tsx"),
      "utf-8"
    );
    for (const cat of CATEGORIAS_CANONICAS) {
      expect(badges, `Categoria "${cat}" ausente em Badges.tsx`).toContain(cat);
    }
  });
});

// ── M04-05: RisksV3.tsx importa CategoryBadge ────────────────────────────────
describe("M04-05 — RisksV3.tsx importa CategoryBadge", () => {
  it("RisksV3.tsx deve importar CategoryBadge de Badges", () => {
    const risksV3 = readFileSync(
      join(ROOT, "client/src/pages/compliance-v3/RisksV3.tsx"),
      "utf-8"
    );
    expect(risksV3).toContain("CategoryBadge");
    expect(risksV3).toMatch(/import.*CategoryBadge.*from.*Badges/);
  });
});

// ── M04-06: RisksV3.tsx tem coluna "Categoria" na tabela ─────────────────────
describe("M04-06 — RisksV3.tsx tem coluna Categoria na tabela de riscos", () => {
  it("RisksV3.tsx deve ter th com texto 'Categoria'", () => {
    const risksV3 = readFileSync(
      join(ROOT, "client/src/pages/compliance-v3/RisksV3.tsx"),
      "utf-8"
    );
    expect(risksV3).toContain("Categoria");
    // Deve usar riskCategoryL2 para renderizar o badge
    expect(risksV3).toContain("riskCategoryL2");
    expect(risksV3).toContain("<CategoryBadge");
  });
});
