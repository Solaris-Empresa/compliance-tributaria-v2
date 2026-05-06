/**
 * getArchetypeContext-dim-format.test.ts
 *
 * Tríade ORQ-28 · Artefato 2 — test contracts skeleton para Issue #992 (Bug B)
 *
 * **NÃO IMPLEMENTAR** estes testes neste PR. Este arquivo é apenas o skeleton de
 * contratos (`it.todo`) que **deve** ser convertido em testes reais (`it`) no PR
 * de implementação do fix do Bug B (label `bug-b-impl`). O workflow CI
 * `validate-spec-bug-b-archetype.yml` (Artefato 3) bloqueia merge se os
 * `it.todo` permanecerem após a implementação.
 *
 * Referências:
 * - Issue #992 — Archetype runtime normalization (dim_* ↔ canonical fields)
 * - Decisão P.O. 2026-05-06 — estratégia reader normalization (Opção A)
 * - REGRA-ORQ-28 — Triade de garantia
 * - REGRA-ORQ-27 / Lição #59 — assemble vs consumption
 * - Diagnóstico Manus 2026-05-06 — `Diagnóstico Completo: Questionário CNAE + Bug B (getArchetypeContext).md`
 *
 * Mapa de mismatch alvo (writer perfil.ts:391-395 → reader getArchetypeContext.ts:43-66):
 *   `dim_objeto`           → reader espera `objeto`           ❌
 *   `dim_papel_na_cadeia`  → reader espera `papel_na_cadeia`  ❌
 *   `dim_tipo_de_relacao`  → reader espera `tipo_de_relacao`  ❌
 *   `dim_territorio`       → reader espera `territorio`       ❌
 *   `dim_regime`           → reader espera `regime`           ❌
 *   `subnatureza_setorial` → reader espera `subnatureza_setorial` ✅ (sem prefixo)
 *   `orgao_regulador`      → reader espera `orgao_regulador`      ✅ (sem prefixo)
 *
 * Critério de aceite: após implementação do reader normalization, todos os
 * `it.todo` deste arquivo devem ser convertidos em `it` com asserções reais
 * que provem que o reader aceita ambos formatos (com prefixo `dim_*` e sem).
 */
import { describe, it } from "vitest";

// ─── Suite 1: Normalização de dimensões com prefixo dim_* ─────────────────────

describe("getArchetypeContext — formato DB (dim_* prefix)", () => {
  it.todo(
    "normaliza dim_objeto para parts['Objeto econômico']",
  );
  it.todo(
    "normaliza dim_papel_na_cadeia para parts['Papel na cadeia']",
  );
  it.todo(
    "normaliza dim_tipo_de_relacao para parts['Tipo de relação']",
  );
  it.todo(
    "normaliza dim_territorio para parts['Território']",
  );
  it.todo(
    "normaliza dim_regime para parts['Regime tributário']",
  );
});

// ─── Suite 2: Backward-compat ─────────────────────────────────────────────────

describe("getArchetypeContext — backward-compat (formato canônico sem prefixo)", () => {
  it.todo(
    "formato canônico (objeto/papel_na_cadeia/...) continua funcionando — sem regressão",
  );
  it.todo(
    "formato misturado (alguns dim_, alguns sem) processa todos os campos corretamente",
  );
  it.todo(
    "campos contextuais sem prefixo (subnatureza_setorial, orgao_regulador) continuam funcionando antes e depois do fix",
  );
});

// ─── Suite 3: Runtime contract com snapshot real do banco ─────────────────────

describe("getArchetypeContext — runtime contract com snapshot real do banco", () => {
  /**
   * Fixture ESPELHADA do projeto #4110001 (Soja agro) — formato real
   * persistido em `projects.archetype` por `perfil.ts:376-408`.
   *
   * Após o fix, este snapshot deve produzir contextQuery contendo:
   *   - "Objeto econômico: agricola"
   *   - "Papel na cadeia: fabricante"
   *   - "Tipo de relação: producao"
   *   - "Território: nacional"
   *   - "Regime tributário: lucro_real"
   */
  it.todo(
    "snapshot do projeto #4110001 (Soja agro, formato dim_*) produz contextQuery não-vazio",
  );
  it.todo(
    "snapshot transportadora combustível (formato dim_*) produz contextQuery contendo 'transportador'",
  );
  it.todo(
    "snapshot com archetype malformado (apenas algumas dimensões preenchidas) não quebra reader",
  );
});

// ─── Suite 4: ArchetypeBadge (client) ─────────────────────────────────────────

describe("ArchetypeBadge (client/src/components/ArchetypeBadge.tsx) — formato DB (dim_* prefix)", () => {
  it.todo(
    "renderiza dimensões do snapshot real do banco com prefixo dim_*",
  );
  it.todo(
    "backward-compat: fixture canônica continua renderizando após o fix",
  );
  it.todo(
    "badge do projeto #4110001 (Soja) exibe 'agricola | fabricante | producao | nacional | lucro_real'",
  );
});

// ─── Suite 5: RAG enrichment end-to-end (runtime real) ────────────────────────

describe("RAG enrichment end-to-end — Q.NCM (product-questions.ts:69)", () => {
  it.todo(
    "Q.NCM com archetype dim_* gera contextQuery contendo dimensões (spy queryRagFn)",
  );
  it.todo(
    "Q.NCM sem archetype gera contextQuery legado (sem dimensões) — backward-compat",
  );
});

describe("RAG enrichment end-to-end — Q.NBS (service-questions.ts:70)", () => {
  it.todo(
    "Q.NBS com archetype dim_* gera contextQuery contendo dimensões (spy queryRagFn)",
  );
  it.todo(
    "Q.NBS sem archetype gera contextQuery legado (sem dimensões) — backward-compat",
  );
});

describe("RAG enrichment end-to-end — generateOnda2Questions (routers-fluxo-v3.ts:3853)", () => {
  it.todo(
    "Onda 2 IA Gen com archetype dim_* gera prompt LLM contendo 'Perfil da Entidade (arquétipo M1):' (spy invokeLLM)",
  );
  it.todo(
    "Onda 2 IA Gen sem archetype omite linha de perfil dimensional do prompt — backward-compat",
  );
});

describe("RAG enrichment end-to-end — QuestionarioV3 generateQuestions (routers-fluxo-v3.ts:654)", () => {
  it.todo(
    "QuestionarioV3 com archetype dim_* gera contextQuery contendo dimensões (spy retrieveArticlesFast)",
  );
  it.todo(
    "QuestionarioV3 sem archetype gera contextQuery legado — backward-compat",
  );
});

describe("RAG enrichment end-to-end — Briefing/Riscos/Plano/Veredito/GapEngine/QuestionEngine", () => {
  /**
   * Cobertura dos demais 7 callers de getArchetypeContext (Manus 2026-05-06):
   *   routers-fluxo-v3.ts:1100  (Briefing V3)
   *   routers-fluxo-v3.ts:2098  (Matriz de riscos)
   *   routers-fluxo-v3.ts:2274  (Plano de ação)
   *   routers-fluxo-v3.ts:2583  (Veredito/Decisão)
   *   routers-fluxo-v3.ts:3156  (Briefing Full Diagnostic)
   *   server/routers/gapEngine.ts:279  (Gap engine)
   *   server/routers/questionEngine.ts:317  (Question engine)
   */
  it.todo(
    "Briefing V3 com archetype dim_* propaga dimensões ao prompt (spy)",
  );
  it.todo(
    "Matriz de riscos com archetype dim_* propaga dimensões (spy)",
  );
  it.todo(
    "Plano de ação com archetype dim_* propaga dimensões (spy)",
  );
  it.todo(
    "Veredito/Decisão com archetype dim_* propaga dimensões (spy)",
  );
  it.todo(
    "Briefing Full Diagnostic com archetype dim_* propaga dimensões (spy)",
  );
  it.todo(
    "Gap engine com archetype dim_* propaga dimensões (spy)",
  );
  it.todo(
    "Question engine com archetype dim_* propaga dimensões (spy)",
  );
});
