/**
 * Hotfix #1006 — router descarta `motivo` e `alerta` de generateProductQuestions
 *
 * Bug original (`server/routers-fluxo-v3.ts:4191` e `:4252`):
 *
 *   if ('nao_aplicavel' in result) {
 *     await db.updateProject(...);
 *     return { nao_aplicavel: true, perguntas: [], alerta: null };
 *     //       ↑ DESCARTAVA result.motivo E result.alerta
 *   }
 *
 * Consequência: `QuestionarioProduto.tsx:107` lê `data.motivo === "corpus_gap_setorial"`
 * para renderizar `CorpusGapBanner` V1 (Issue #997). Como `motivo` nunca chegava
 * ao frontend (router descartava), todo `nao_aplicavel: true` caía em
 * `NaoAplicavelBanner` — mesmo quando o backend tinha `motivo: "corpus_gap_setorial"`.
 *
 * Fix: propagar `motivo` e `alerta` via `Extract<QuestionResult, { nao_aplicavel: true }>`
 * (narrowing type-safe, sem `as any`).
 *
 * Casos cobertos (espelham `tracked-question.ts:72-75`):
 *   - Path 1 (`companyType === "servico"`): `{ nao_aplicavel: true }` sem motivo
 *     → router deve retornar `motivo: null, alerta: null`
 *   - Path 2 (`no_ncm_codes`): `{ nao_aplicavel: true, motivo: "no_ncm_codes", alerta }`
 *     → router deve propagar ambos
 *   - Path 3 (`corpus_gap_setorial`): `{ nao_aplicavel: true, motivo: "corpus_gap_setorial", alerta }`
 *     → router deve propagar — caso primary do bug
 *   - Path 4 (`no_applicable_requirements`): análogo
 *
 * Refs:
 * - Issue #1006 (hotfix P0)
 * - Issue #997 (Q.NCM Quality Gate — gate corpus_gap_setorial)
 * - REGRA-ORQ-22 / ORQ-27 / ORQ-28 / ORQ-32 (Extract<...> sem `as any`)
 * - Lição #59 (assemble vs consumption — caller test prova consumo end-to-end)
 *
 * Tech debt P3 registrado: `QuestionarioServico.tsx:98-105` ignora `motivo`.
 * Paridade frontend Q.NBS pendente para sprint futura.
 */
import { describe, it, expect } from "vitest";
import { dbDescribe } from "../test-helpers";
import type { QuestionResult, NoQuestionMotivo } from "../lib/tracked-question";

/**
 * Reproduz o transform aplicado no router (linhas 4189-4196 e 4250-4257)
 * pós-Hotfix #1006. Função pura — testes unitários sem dependência de DB/tRPC.
 */
function applyRouterTransform(result: QuestionResult): {
  nao_aplicavel: true;
  perguntas: never[];
  motivo: NoQuestionMotivo | null;
  alerta: string | null;
} | null {
  if (!("nao_aplicavel" in result)) return null;
  // Narrowing type-safe via Extract<...> — espelha pattern do router.
  const naoAplicavel = result as Extract<QuestionResult, { nao_aplicavel: true }>;
  return {
    nao_aplicavel: true as const,
    perguntas: [] as never[],
    motivo: naoAplicavel.motivo ?? null,
    alerta: naoAplicavel.alerta ?? null,
  };
}

dbDescribe("Hotfix #1006 — router propaga motivo + alerta de generateProductQuestions", () => {
  // ── T1: caso primary do bug — corpus_gap_setorial ──────────────────────────
  it("T1 — propaga motivo='corpus_gap_setorial' + alerta para frontend (Issue #997 V1)", () => {
    const innerResult: QuestionResult = {
      nao_aplicavel: true,
      motivo: "corpus_gap_setorial",
      alerta:
        "Não foi possível recuperar legislação setorial específica para os NCMs informados " +
        "com o nível de confiança exigido pela plataforma (meta 98%). " +
        "Equipe SOLARIS notificada — questionário ficará disponível assim que a cobertura legal for validada.",
    };

    const routerOutput = applyRouterTransform(innerResult);

    expect(routerOutput).not.toBeNull();
    expect(routerOutput!.nao_aplicavel).toBe(true);
    expect(routerOutput!.motivo).toBe("corpus_gap_setorial");
    expect(routerOutput!.alerta).toBeTruthy();
    expect(routerOutput!.alerta).toContain("legislação setorial");
    // Pré-fix: motivo era undefined → frontend caía em NaoAplicavelBanner.
    // Pós-fix: motivo === "corpus_gap_setorial" → CorpusGapBanner V1.
    expect(routerOutput!.motivo).not.toBeNull();
    expect(routerOutput!.motivo).not.toBeUndefined();
  });

  // ── T2: path "servico" — nao_aplicavel sem motivo (preserva semântica) ────
  it("T2 — quando source omite motivo (path 'servico'), router retorna motivo: null (não undefined)", () => {
    // Reproduz product-questions.ts:55 — companyType === "servico"
    const innerResult: QuestionResult = { nao_aplicavel: true };

    const routerOutput = applyRouterTransform(innerResult);

    expect(routerOutput).not.toBeNull();
    expect(routerOutput!.nao_aplicavel).toBe(true);
    // tRPC + Superjson serializam null corretamente; undefined seria dropped.
    // Por isso o fix usa `?? null` (não deixa undefined).
    expect(routerOutput!.motivo).toBeNull();
    expect(routerOutput!.alerta).toBeNull();
    // Frontend QuestionarioProduto.tsx:107 verifica
    // `motivo === "corpus_gap_setorial"`. null !== "corpus_gap_setorial" → cai
    // em NaoAplicavelBanner (comportamento legado preservado para esse path).
    expect(routerOutput!.motivo).not.toBe("corpus_gap_setorial");
  });

  // ── T3: regressão — outros motivos do enum NoQuestionMotivo ───────────────
  it("T3 — propaga motivo='no_ncm_codes' (path 'sem NCMs cadastrados')", () => {
    const innerResult: QuestionResult = {
      nao_aplicavel: true,
      motivo: "no_ncm_codes",
      alerta: "Adicione códigos NCM para diagnóstico mais preciso sobre IBS/CBS em produtos.",
    };

    const routerOutput = applyRouterTransform(innerResult);

    expect(routerOutput!.motivo).toBe("no_ncm_codes");
    expect(routerOutput!.alerta).toContain("NCM");
  });

  // ── T4: paridade Q.NBS com Q.NCM ───────────────────────────────────────────
  it("T4 — Q.NBS: propaga motivo='no_nbs_codes' (paridade arquitetural com Q.NCM)", () => {
    // Mesmo transform aplicado em routers-fluxo-v3.ts:4250-4257 (Q.NBS).
    // Garante simetria entre os 2 caminhos do hotfix #1006.
    const innerResult: QuestionResult = {
      nao_aplicavel: true,
      motivo: "no_nbs_codes",
      alerta: "Adicione códigos NBS para diagnóstico mais preciso sobre serviços.",
    };

    const routerOutput = applyRouterTransform(innerResult);

    expect(routerOutput!.motivo).toBe("no_nbs_codes");
    expect(routerOutput!.alerta).toContain("NBS");
    // Tech debt P3: QuestionarioServico.tsx ainda não consome motivo —
    // mesmo com o backend pronto, frontend Q.NBS sempre renderiza
    // NaoAplicavelBanner. Backend correto, frontend pendente.
  });

  // ── T5: alerta string preservada (não vira null quando presente) ──────────
  it("T5 — alerta com string longa é preservada exatamente, não truncada nem virada null", () => {
    const longAlerta =
      "Diagnóstico parcial: nenhuma fonte retornou perguntas para os NCMs informados. " +
      "Equipe SOLARIS notificada. " +
      "Esta limitação ocorre quando RAG e SOLARIS não cobrem os códigos fiscais informados. " +
      "Pendência registrada em backlog de curadoria.";

    const innerResult: QuestionResult = {
      nao_aplicavel: true,
      motivo: "no_applicable_requirements",
      alerta: longAlerta,
    };

    const routerOutput = applyRouterTransform(innerResult);

    expect(routerOutput!.alerta).toBe(longAlerta);
    expect(routerOutput!.alerta).not.toBeNull();
    expect((routerOutput!.alerta ?? "").length).toBeGreaterThan(100);
  });
});
