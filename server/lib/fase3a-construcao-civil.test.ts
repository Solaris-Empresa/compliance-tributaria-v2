// Fase 3a (#1607) — 8 riscos setoriais de construção civil.
// Testa inferNormativeRisks com perfil de construtora (CNAE 41xx, lucro_real).
//
// BUG-TEST-B1 (01/07/2026): com a flag `enable-datadriven-inference` = ON (Fase 4),
// inferNormativeRisks passa a resolver as categorias via `applyCnaeCategoriaMap`
// (consulta a tabela `cnae_categoria_map` → getDb()), tornando esta suite
// DB-dependente. Sem DATABASE_URL, `getDb()` lança e a suite falha 5/6.
// Fix: `dbDescribe` (REGRA-ORQ-CI-01 / CI-HYGIENE-02 #1585) — skipa graciosamente
// em CI sem DB; roda como integração quando há DATABASE_URL (smoke Manus).
// A cobertura de CATEGORIA (positivo/negativo/discriminante) permanece verde em
// CI via `b1-fase3-paridade.test.ts` (matchMapRows — função pura, Lição #157).
import { it, expect } from "vitest";
import { dbDescribe } from "../test-helpers";
import { inferNormativeRisks } from "./normative-inference";
import type { ProjectProfile } from "./project-profile-extractor";

const UNIVERSAIS = [
  "risco_credito_condicionado_obra", // ACHADO-1 #1647
  "risco_redutor_ajuste",
  "risco_sinter_avaliacao",
  "risco_cib_cadastro",
  "risco_controle_empreendimento",
];
const CONDICIONAIS = [
  "risco_permuta_imoveis",
  "risco_tributacao_parcelas",
  "risco_sujeicao_passiva_scp",
  "risco_custos_historicos",
];

function profile(cnaes: string[], taxRegime: string | null = "lucro_real"): ProjectProfile {
  return {
    projectId: 999,
    cnaes,
    taxRegime,
    companySize: null,
    tipoOperacao: "construcao",
    tipoCliente: null,
    multiestadual: null,
    meiosPagamento: null,
    intermediarios: null,
    productNcms: [],
    archetype: null,
  };
}

dbDescribe("Fase 3a — 8 riscos construção civil (#1607)", () => {
  it("gera as 8 categorias setoriais para CNAE 41xx lucro_real", async () => {
    const risks = await inferNormativeRisks(999, profile(["4120-4/00"]));
    const cats = risks.map((r) => r.categoria);
    for (const c of [...UNIVERSAIS, ...CONDICIONAIS]) {
      expect(cats).toContain(c);
    }
  });

  it("condicionais: confidence ≈ 0.55 + rag_validation_note 'confirmar na Fase 3b'", async () => {
    const risks = await inferNormativeRisks(999, profile(["4120-4/00"]));
    for (const c of CONDICIONAIS) {
      const r = risks.find((x) => x.categoria === c)!;
      expect(r).toBeDefined();
      expect(r.confidence).toBeCloseTo(0.55);
      expect(r.rag_validation_note).toContain("confirmar na Fase 3b");
    }
  });

  it("universais: confidence ≈ 0.85, sem nota condicional", async () => {
    const risks = await inferNormativeRisks(999, profile(["4120-4/00"]));
    for (const c of UNIVERSAIS) {
      const r = risks.find((x) => x.categoria === c)!;
      expect(r.confidence).toBeCloseTo(0.85);
      expect(r.rag_validation_note ?? "").not.toContain("Fase 3b");
    }
  });

  it("CNAE 68 (atividades imobiliárias) também recebe os 8", async () => {
    const risks = await inferNormativeRisks(999, profile(["6810-2/01"]));
    const cats = risks.map((r) => r.categoria);
    for (const c of [...UNIVERSAIS, ...CONDICIONAIS]) expect(cats).toContain(c);
  });

  it("DoD negativo: não-construtora (CNAE 6201 software) NÃO recebe os 8", async () => {
    const risks = await inferNormativeRisks(999, profile(["6201-5/01"]));
    const cats = risks.map((r) => r.categoria);
    for (const c of [...UNIVERSAIS, ...CONDICIONAIS]) expect(cats).not.toContain(c);
  });

  it("Simples Nacional NÃO recebe os 8 (Art. 251 — regime regular)", async () => {
    const risks = await inferNormativeRisks(999, profile(["4120-4/00"], "simples_nacional"));
    const cats = risks.map((r) => r.categoria);
    for (const c of [...UNIVERSAIS, ...CONDICIONAIS]) expect(cats).not.toContain(c);
  });
});
