/**
 * Test contracts — BUG-G1: artigos do briefing-prompt vêm de risk_categories
 * Sprint BUG-FIX 20/05/2026 · Decisão P.O. 18:16 — Nível A (2 substituições)
 * REGRA-ORQ-28 Artefato 2
 *
 * Valida o CONTRATO do fix:
 *   1. Helper `getArticleByCategory` existe e funciona
 *   2. Cache TTL 1h é respeitado
 *   3. `routers-fluxo-v3.ts` importa o helper
 *   4. As 2 procedures (generateBriefing + generateBriefingFromDiagnostic) buscam
 *      os artigos dinâmicos ANTES do generateWithRetry
 *   5. Os literals "Art. 2 LC 214/2025" e "Art. 59 LC 214/2025" SOMENTE
 *      aparecem como fallback (linhas com "?? "). Art. 21 §1º → Art. 59
 *      (cadastral) corrigido em LEGAL-1 (04/06/2026).
 *   6. Os 2 artigos ainda sem categoria (Art. 8, Art. 14/15) têm TODOs inline
 *      citando BUG-G1. Art. 9 → Art. 125 (cesta básica) resolvido em LEGAL-1.
 *
 * Validação runtime contra banco real é responsabilidade do Manus pós-deploy.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const ROUTERS_FLUXO_PATH = path.join(REPO_ROOT, "server", "routers-fluxo-v3.ts");
const CACHE_HELPER_PATH = path.join(REPO_ROOT, "server", "lib", "riskCategoriesCache.ts");

describe("BUG-G1 — riskCategoriesCache.ts (helper)", () => {
  const cache = readFileSync(CACHE_HELPER_PATH, "utf8");

  it("exporta getArticleByCategory + invalidateCache", () => {
    expect(cache).toMatch(/export\s+async\s+function\s+getArticleByCategory/);
    expect(cache).toMatch(/export\s+function\s+invalidateCache/);
  });

  it("TTL configurado para 1 hora (60 * 60 * 1000)", () => {
    expect(cache).toMatch(/TTL_MS\s*=\s*60\s*\*\s*60\s*\*\s*1000/);
  });

  it("retorno tipado Promise<string | null>", () => {
    expect(cache).toMatch(/getArticleByCategory\([^)]*\):\s*Promise<string\s*\|\s*null>/);
  });

  it("query Drizzle lê codigo + artigoBase de riskCategories", () => {
    expect(cache).toMatch(/from\(riskCategories\)/);
    expect(cache).toMatch(/riskCategories\.codigo/);
    expect(cache).toMatch(/riskCategories\.artigoBase/);
  });

  it("invalidateCache zera cache + expiry", () => {
    expect(cache).toMatch(/invalidateCache[\s\S]*?cache\s*=\s*null[\s\S]*?cacheExpiry\s*=\s*0/);
  });

  it("expõe _getCacheStateForTests para asserts de teste", () => {
    expect(cache).toMatch(/export\s+function\s+_getCacheStateForTests/);
  });

  it("throw em DB indisponível (não silencia)", () => {
    expect(cache).toMatch(/Database\s+not\s+available/);
    expect(cache).toMatch(/throw\s+new\s+Error/);
  });
});

describe("BUG-G1 — routers-fluxo-v3.ts (import + uso)", () => {
  const fluxo = readFileSync(ROUTERS_FLUXO_PATH, "utf8");

  it("importa getArticleByCategory do helper novo", () => {
    expect(fluxo).toMatch(
      /import\s+\{\s*getArticleByCategory\s*\}\s+from\s+["']\.\/lib\/riskCategoriesCache["']/
    );
  });

  it("procedure generateBriefing busca os 2 artigos ANTES do generateWithRetry", () => {
    // Heurística: existe a sequência [await getArticleByCategory("imposto_seletivo") ... await getArticleByCategory("inscricao_cadastral") ... await generateWithRetry] na mesma vizinhança
    const briefingChunk = fluxo.match(
      /generateBriefing:\s*protectedProcedure[\s\S]{0,40000}?await\s+generateWithRetry/
    );
    expect(briefingChunk).not.toBeNull();
    const text = briefingChunk![0];
    expect(text).toMatch(/await\s+getArticleByCategory\(\s*["']imposto_seletivo["']/);
    expect(text).toMatch(/await\s+getArticleByCategory\(\s*["']inscricao_cadastral["']/);
  });

  it("procedure generateBriefingFromDiagnostic busca os 2 artigos ANTES do genRetry", () => {
    const fromDiagChunk = fluxo.match(
      /generateBriefingFromDiagnostic:\s*protectedProcedure[\s\S]{0,80000}?await\s+genRetry/
    );
    expect(fromDiagChunk).not.toBeNull();
    const text = fromDiagChunk![0];
    expect(text).toMatch(/await\s+getArticleByCategory\(\s*["']imposto_seletivo["']/);
    expect(text).toMatch(/await\s+getArticleByCategory\(\s*["']inscricao_cadastral["']/);
  });

  it("NÃO existe mais literal 'Art. 2 LC 214/2025' em prompt template (apenas em fallback ?? )", () => {
    const lines = fluxo.split("\n");
    const literalsForaDeFallback = lines.filter((line) => {
      // Linha contém "Art. 2 LC 214/2025" MAS não contém "??" (fallback explícito)
      // E não é comentário histórico
      return (
        /Art\.\s*2\s+LC\s+214\/2025/.test(line) &&
        !/\?\?/.test(line) &&
        !line.trim().startsWith("//")
      );
    });
    expect(literalsForaDeFallback).toEqual([]);
  });

  it("NÃO existe literal 'Art. 59 LC 214/2025' fora de fallback ?? (cadastral, pós LEGAL-1)", () => {
    // LEGAL-1 (04/06/2026): fallback cadastral Art. 21 §1º → Art. 59. O prompt usa
    // a var ${artigoCadastroCit_*}; o literal "Art. 59" só aparece no fallback ??.
    const lines = fluxo.split("\n");
    const literalsForaDeFallback = lines.filter((line) => {
      return (
        /Art\.\s*59\s+LC\s+214\/2025/.test(line) &&
        !/\?\?/.test(line) &&
        !line.trim().startsWith("//")
      );
    });
    expect(literalsForaDeFallback).toEqual([]);
  });

  it("usa ${artigoISCit_brief} no prompt da procedure generateBriefing", () => {
    expect(fluxo).toMatch(/IMPOSTO\s+SELETIVO\s+\(\$\{artigoISCit_brief\}\)/);
  });

  it("usa ${artigoCadastroCit_brief} no prompt da procedure generateBriefing", () => {
    expect(fluxo).toMatch(/INSCRIÇÃO\s+CADASTRAL[^(]*\(\$\{artigoCadastroCit_brief\}\)/);
  });

  it("usa ${artigoISCit_fromDiag} no prompt da procedure generateBriefingFromDiagnostic", () => {
    expect(fluxo).toMatch(/IMPOSTO\s+SELETIVO\s+\(\$\{artigoISCit_fromDiag\}\)/);
  });

  it("usa ${artigoCadastroCit_fromDiag} no prompt da procedure generateBriefingFromDiagnostic", () => {
    expect(fluxo).toMatch(/INSCRIÇÃO\s+CADASTRAL[^(]*\(\$\{artigoCadastroCit_fromDiag\}\)/);
  });
});

describe("BUG-G1 — TODOs nos 3 artigos sem categoria correspondente", () => {
  const fluxo = readFileSync(ROUTERS_FLUXO_PATH, "utf8");

  it("Art. 8 (exportação) — TODO mencionando categoria 'exportacao'", () => {
    const occurrences = fluxo.match(
      /\[BUG-G1 TODO:\s*criar\s+categoria\s+['"]exportacao['"]\s+em\s+risk_categories/g
    );
    // Esperado: 2 ocorrências (uma em cada procedure)
    expect(occurrences?.length).toBe(2);
  });

  it("Art. 9 → Art. 125 (cesta básica) — LEGAL-1 resolvido: cita Art. 125 nas 2 procedures, sem TODO pendente", () => {
    // LEGAL-1 (04/06/2026): Art. 9 (imunidades) → Art. 125 (Cesta Básica Nacional
    // de Alimentos / alíquota zero), validado contra PDF LC 214. TODO removido.
    const todoPendente = fluxo.match(/\[BUG-G1 TODO:\s*aliquota_zero/g);
    expect(todoPendente).toBeNull();
    const cestaBasica125 = fluxo.match(
      /CESTA BÁSICA \/ ALÍQUOTA ZERO \(Art\. 125 LC 214\/2025\)/g
    );
    expect(cestaBasica125?.length).toBe(2);
  });

  it("Art. 14/15 (IBS interestadual) — TODO mencionando categoria 'ibs_interestadual'", () => {
    const occurrences = fluxo.match(
      /\[BUG-G1 TODO:\s*criar\s+categoria\s+['"]ibs_interestadual['"]\s+em\s+risk_categories/g
    );
    expect(occurrences?.length).toBe(2);
  });
});

describe("BUG-G1 — Cache TTL behavior (unit test do helper)", () => {
  // Mock isolado do db — testa apenas a lógica de cache (não toca DB real)
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("primeira chamada faz query; segunda usa cache; pós-TTL refaz query", async () => {
    const mockSelect = vi.fn().mockResolvedValue([
      { codigo: "imposto_seletivo", artigoBase: "Art. 409 LC 214/2025" },
      { codigo: "inscricao_cadastral", artigoBase: "Art. 164 LC 214/2025" },
    ]);

    vi.doMock("../../server/db", () => ({
      getDb: vi.fn().mockResolvedValue({
        select: () => ({ from: () => mockSelect() }),
      }),
    }));

    const { getArticleByCategory, _getCacheStateForTests, invalidateCache } =
      await import("../../server/lib/riskCategoriesCache");
    invalidateCache();

    // 1ª chamada — popula cache
    const r1 = await getArticleByCategory("imposto_seletivo");
    expect(r1).toBe("Art. 409 LC 214/2025");
    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(_getCacheStateForTests().hasCache).toBe(true);

    // 2ª chamada (dentro de 1h) — usa cache
    const r2 = await getArticleByCategory("inscricao_cadastral");
    expect(r2).toBe("Art. 164 LC 214/2025");
    expect(mockSelect).toHaveBeenCalledTimes(1); // não cresceu

    // Avança 1h + 1ms — TTL expira
    vi.advanceTimersByTime(60 * 60 * 1000 + 1);
    const r3 = await getArticleByCategory("imposto_seletivo");
    expect(r3).toBe("Art. 409 LC 214/2025");
    expect(mockSelect).toHaveBeenCalledTimes(2); // refresh
  });

  it("retorna null para codigo inexistente", async () => {
    vi.doMock("../../server/db", () => ({
      getDb: vi.fn().mockResolvedValue({
        select: () => ({
          from: () =>
            Promise.resolve([
              { codigo: "imposto_seletivo", artigoBase: "Art. 409 LC 214/2025" },
            ]),
        }),
      }),
    }));

    const { getArticleByCategory, invalidateCache } = await import(
      "../../server/lib/riskCategoriesCache"
    );
    invalidateCache();

    const r = await getArticleByCategory("codigo_inexistente_xyz");
    expect(r).toBeNull();
  });
});
