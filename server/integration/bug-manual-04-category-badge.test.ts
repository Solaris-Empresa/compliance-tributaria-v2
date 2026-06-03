/**
 * BUG-MANUAL-04 — Testes M04-01..M04-06
 * ADR-0013: CategoryBadge risk_category_l2 no Frontend
 *
 * ADR-0034 Fase 1 (2026-06-03): RisksV3.tsx removida (dashboard V3 órfão).
 * M04-05/06 re-apontados para MatrizRiscosSession.tsx — consumidor ATIVO
 * sobrevivente de CategoryBadge (/matriz-riscos-session).
 *
 * Verifica:
 *   M04-01: Schema projectRisksV3 tem coluna riskCategoryL2
 *   M04-02: Tipo RiskItem tem campo riskCategoryL2 opcional
 *   M04-03: CategoryBadge exportado de Badges.tsx
 *   M04-04: CategoryBadge cobre 10 categorias canônicas LC 214/2025
 *   M04-05: página ativa (MatrizRiscosSession) importa CategoryBadge
 *   M04-06: página ativa (MatrizRiscosSession) renderiza <CategoryBadge
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

// ── M04-05: página ativa importa CategoryBadge ───────────────────────────────
// ADR-0034 Fase 1: re-apontado de RisksV3.tsx (removida) → MatrizRiscosSession.tsx
describe("M04-05 — página ativa importa CategoryBadge", () => {
  it("MatrizRiscosSession.tsx deve importar CategoryBadge de Badges", () => {
    const page = readFileSync(
      join(ROOT, "client/src/pages/MatrizRiscosSession.tsx"),
      "utf-8"
    );
    expect(page).toContain("CategoryBadge");
    expect(page).toMatch(/import.*CategoryBadge.*from.*Badges/);
  });
});

// ── M04-06: página ativa renderiza <CategoryBadge ────────────────────────────
// ADR-0034 Fase 1: re-apontado de RisksV3.tsx (removida) → MatrizRiscosSession.tsx.
// As asserções de coluna "Categoria" + riskCategoryL2 eram markup específico do
// RisksV3 (deletado); o consumidor ativo usa riskCategoryCode.
describe("M04-06 — página ativa renderiza <CategoryBadge", () => {
  it("MatrizRiscosSession.tsx deve renderizar o componente CategoryBadge", () => {
    const page = readFileSync(
      join(ROOT, "client/src/pages/MatrizRiscosSession.tsx"),
      "utf-8"
    );
    expect(page).toContain("<CategoryBadge");
  });
});
