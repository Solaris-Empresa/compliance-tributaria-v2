/**
 * coverage-8-profiles.test.ts — DIAG-COVERAGE-03 · Fase 2 (CC-F2-TEST)
 *
 * BLOCO 1 (PURO, sem DB): gates hardcoded por perfil — comportamento determinístico.
 * BLOCO 2 (dbDescribe, com DB): categorias por perfil via shouldInjectCategory +
 *   contagem de perguntas SOLARIS. Preenchido com dados reais do L1 (Manus, e8407ff2).
 *
 * ESCOPO/limite do Bloco 2 (honestidade): shouldInjectCategory é o gate CNAE das
 * categorias `confirmed` (universais cnae_codes=null + restritas por prefixo). É o
 * mecanismo de injeção/grounding — NÃO a atribuição final do risk-engine-v4 (que
 * depende de gaps/respostas). Cobre a camada determinística declarada no L1.
 *
 * Fonte dos expected: L1-Q1 (risk_categories) + L1-Q3 (contagem SOLARIS), Manus 27/05.
 */
import { describe, it, expect } from "vitest";
import { dbDescribe } from "../test-helpers";
import { shouldInjectArt197 } from "../lib/art197-injection";
import {
  isRegimeImoveisOportunidade,
  isRegimeImoveisLocacao,
  isRegimeImoveisRisco,
} from "../lib/regime-imoveis-eligibility";
import { shouldInjectCategory } from "../lib/deterministic-grounding";
import { querySolarisByCnaes } from "../lib/solaris-query";
import { getDb } from "../db";
import { riskCategories } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const FIXED_TODAY = new Date("2026-05-27");

// ─── BLOCO 1 — gates hardcoded (PURO, sem DB) ───────────────────────────────
describe("BLOCO 1 — gates hardcoded por perfil (PURO, sem DB)", () => {
  // shouldInjectArt197: só P3 (CNAE grupo 28 + NCM 8436.*)
  it("P3 (2833-0/00 + NCM 8436.99.00) → shouldInjectArt197 = true", () => {
    expect(shouldInjectArt197(["2833-0/00"], ["8436.99.00"])).toBe(true);
  });
  it.each([
    ["P1", "4120-4/00"],
    ["P2", "6911-7/00"],
    ["P4", "4639-7/01"],
    ["P5", "4921-3/00"],
    ["P6", "6810-2/01"],
    ["P7", "6201-5/01"],
    ["P8", "8650-0/01"],
  ])("%s (%s, sem NCM 8436) → shouldInjectArt197 = false", (_id, cnae) => {
    expect(shouldInjectArt197([cnae], [])).toBe(false);
  });

  // regime-imoveis-eligibility (prefixos/subclasses hardcoded) — comportamento REAL
  it("P1 construtora (4120-4/00) → risco=true, oportunidade=true, locação=false", () => {
    expect(isRegimeImoveisRisco(["4120-4/00"])).toBe(true);
    expect(isRegimeImoveisOportunidade(["4120-4/00"])).toBe(true);
    expect(isRegimeImoveisLocacao(["4120-4/00"])).toBe(false);
  });
  // NOTA: pela eligibility, 6810-2/01 = VENDA própria → oportunidade (50%); locação
  // (70%) é a subclasse 6810-2/02. (Diverge do gate de risk_categories — ver findings.)
  it("P6 imobiliária (6810-2/01) → oportunidade=true, locação=false (venda, não aluguel)", () => {
    expect(isRegimeImoveisOportunidade(["6810-2/01"])).toBe(true);
    expect(isRegimeImoveisLocacao(["6810-2/01"])).toBe(false);
  });
  it("P2 advogado (6911) e P7 TI (6201) → nenhum gate de imóveis", () => {
    for (const cnae of ["6911-7/00", "6201-5/01"]) {
      expect(isRegimeImoveisRisco([cnae])).toBe(false);
      expect(isRegimeImoveisOportunidade([cnae])).toBe(false);
      expect(isRegimeImoveisLocacao([cnae])).toBe(false);
    }
  });
});

// ─── BLOCO 2 — categorias + perguntas por perfil (dbDescribe, com DB) ────────
interface ProfileSpec {
  id: string;
  cnae: string;
  regime: string;
  /** Categorias que DEVEM ser injetadas (L1-Q1 + shouldInjectCategory). */
  must_include: string[];
  /** Categorias que NÃO podem ser injetadas. */
  must_exclude: string[];
  /** Contagem de perguntas SOLARIS (L1-Q3). */
  qMin: number;
  qMax: number;
}

// Expected derivados do L1 (Manus, e8407ff2): 11 universais (cnae_codes=null) aplicam
// a todos; restritas por prefixo de CNAE. Contagens = L1-Q3.
const PROFILES: ProfileSpec[] = [
  {
    id: "P1_CONSTRUTORA", cnae: "4120-4/00", regime: "lucro_real",
    must_include: ["split_payment", "confissao_automatica", "inscricao_cadastral", "obrigacao_acessoria", "regime_especifico_imoveis", "risco_art_269_270", "regime_diferenciado_reabilitacao_urbana"],
    must_exclude: ["regime_diferenciado_produtor_rural", "regime_diferenciado_aliquota_reduzida_30"],
    qMin: 16, qMax: 16,
  },
  {
    id: "P2_ADVOGADO", cnae: "6911-7/00", regime: "lucro_presumido",
    must_include: ["split_payment", "confissao_automatica", "inscricao_cadastral", "obrigacao_acessoria", "regime_diferenciado_aliquota_reduzida_30"],
    must_exclude: ["regime_especifico_imoveis", "regime_diferenciado_produtor_rural", "risco_art_269_270"],
    qMin: 12, qMax: 12,
  },
  {
    id: "P3_FABRICANTE_MAQUINAS", cnae: "2833-0/00", regime: "lucro_real",
    must_include: ["split_payment", "confissao_automatica", "aliquota_zero"],
    must_exclude: ["regime_diferenciado_aliquota_reduzida_30", "regime_especifico_imoveis", "regime_diferenciado_produtor_rural"],
    qMin: 12, qMax: 12,
  },
  {
    id: "P4_ATACADISTA_AGRICOLA", cnae: "4639-7/01", regime: "lucro_real",
    must_include: ["split_payment", "confissao_automatica", "credito_presumido"],
    must_exclude: ["regime_especifico_imoveis", "regime_diferenciado_produtor_rural"],
    qMin: 15, qMax: 15,
  },
  {
    id: "P5_TRANSPORTADORA", cnae: "4921-3/00", regime: "lucro_real",
    must_include: ["split_payment", "confissao_automatica", "regime_diferenciado_transporte"],
    must_exclude: ["regime_especifico_imoveis", "regime_diferenciado_produtor_rural"],
    qMin: 12, qMax: 12,
  },
  {
    id: "P6_IMOBILIARIA", cnae: "6810-2/01", regime: "lucro_real",
    // NOTA: o gate risk_categories injeta tanto regime_especifico_imoveis quanto
    // regime_especifico_imoveis_locacao para 6810-2/01 (cnae_codes "6810-2" por prefixo).
    must_include: ["split_payment", "confissao_automatica", "regime_especifico_imoveis_locacao"],
    must_exclude: ["regime_diferenciado_produtor_rural", "regime_diferenciado_aliquota_reduzida_30"],
    qMin: 12, qMax: 12,
  },
  {
    id: "P7_TI_SAAS", cnae: "6201-5/01", regime: "lucro_presumido",
    must_include: ["split_payment", "confissao_automatica"],
    must_exclude: ["regime_diferenciado_aliquota_reduzida_30", "regime_especifico_imoveis", "regime_diferenciado_produtor_rural"],
    qMin: 12, qMax: 12,
  },
  {
    id: "P8_SAUDE", cnae: "8650-0/01", regime: "lucro_real",
    must_include: ["split_payment", "confissao_automatica", "regime_diferenciado_aliquota_reduzida_30"],
    must_exclude: ["regime_diferenciado_produtor_rural", "regime_especifico_imoveis"],
    qMin: 12, qMax: 12,
  },
];

dbDescribe("BLOCO 2 — categorias + perguntas por perfil (com DB)", () => {
  for (const p of PROFILES) {
    it(`${p.id} (${p.cnae}) — categorias confirmadas + perguntas SOLARIS`, async () => {
      const db = await getDb();
      if (!db) throw new Error("getDb() null — DATABASE_URL ausente");

      const cats = await db
        .select()
        .from(riskCategories)
        .where(eq(riskCategories.normativeStatus, "confirmed"));

      const applicable: string[] = [];
      for (const cat of cats) {
        const raw = cat.normativeBundle as unknown;
        let cnaeCodes: string[] | undefined;
        if (raw) {
          try {
            const bundle = (typeof raw === "string" ? JSON.parse(raw) : raw) as
              | { cnae_codes?: string[] }
              | string[]
              | null;
            if (bundle && !Array.isArray(bundle)) cnaeCodes = bundle.cnae_codes;
          } catch {
            /* bundle malformado → trata como universal (cnaeCodes undefined) */
          }
        }
        if (shouldInjectCategory(cnaeCodes, cat.vigenciaInicio, { cnae: p.cnae, today: FIXED_TODAY })) {
          applicable.push(cat.codigo);
        }
      }

      const missing = p.must_include.filter((c) => !applicable.includes(c));
      expect(missing, `[${p.id}] must_include faltando: ${missing.join(", ")} | aplicáveis: ${applicable.join(", ")}`).toEqual([]);

      const unexpected = p.must_exclude.filter((c) => applicable.includes(c));
      expect(unexpected, `[${p.id}] must_exclude indevidas: ${unexpected.join(", ")}`).toEqual([]);

      const qs = await querySolarisByCnaes([p.cnae], undefined, { contextType: "q_solaris" });
      expect(qs.length, `[${p.id}] perguntas SOLARIS=${qs.length} (esperado ${p.qMin}-${p.qMax})`).toBeGreaterThanOrEqual(p.qMin);
      expect(qs.length).toBeLessThanOrEqual(p.qMax);
    });
  }
});
