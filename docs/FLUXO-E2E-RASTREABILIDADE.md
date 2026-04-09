# Fluxo E2E — Rastreabilidade Completa
**HEAD:** `f8a5864` · **Data:** 2026-04-09 · **Fonte da verdade:** [GitHub main](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/)

> Documento gerado por auditoria automática do código-fonte. Cada componente tem referência exata de arquivo, linha e URL GitHub.
>
> **Auditoria:** 2026-04-09 · Orquestrador (Claude Browser) · 3 gaps críticos corrigidos (CRÍTICO-01, CRÍTICO-02, CRÍTICO-03)

---

## Diagrama do Fluxo E2E (atualizado)

> **Diferenças em relação ao diagrama original (31/03):**
> - SOLARIS agora tem **auto-save debounce 800ms** (FIX_03) e **resume da última pergunta**
> - CNAE agora tem **8 operationTypes** no opLabel (FIX_02 — era 3)
> - **Gate obrigatório** no Briefing: todas as 3 camadas + Onda 1 concluída (BUG-BRIEFING-01)
> - **RAG por área** nas matrizes de risco (4 queries específicas por domínio)
> - **Score CPIE** é output explícito do Consolidador de Diagnóstico ⚠️ ver AUDIT-C-004
> - **Gap Engine** adicionado como camada intermediária entre Consolidadores e Pipeline LLM (CRÍTICO-01)

```mermaid
flowchart TD
    %% ── ENTRADAS ──────────────────────────────────────────────────────────
    subgraph ENTRADAS["📥 Entradas de Dados"]
        perfil["🏢 Perfil da Empresa\nFormularioProjeto.tsx"]
        solaris["🧠 SOLARIS Onda 1\nQuestionarioSolaris.tsx\n(auto-save FIX_03)"]
        iagen["🤖 IA GEN Onda 2\nQuestionarioIaGen.tsx"]
        cnae["📋 CNAE\nQuestionarioCNAE.tsx\n(8 opTypes FIX_02)"]
        ncm["📦 NCM\nQuestionarioProduto.tsx"]
        nbs["🔧 NBS\nQuestionarioServico.tsx"]
    end

    %% ── CONSOLIDADORES ─────────────────────────────────────────────────────
    subgraph CONSOLIDADORES["⚙️ Consolidadores"]
        cons_comp["✅ Consolidador de Completude\ncompleteDiagnosticLayer\nrouters-fluxo-v3.ts:1908"]
        cons_diag["🔍 Consolidador de Diagnóstico\ngetAggregatedDiagnostic\nrouters-fluxo-v3.ts:1820"]
    end

    %% ── OUTPUTS DO DIAGNÓSTICO ─────────────────────────────────────────────
    status_comp["📊 Status\ninsuficiente/parcial/completo"]
    score_cpie["🎯 Score CPIE\n0–100 ⚠️ AUDIT-C-004"]

    %% ── GAP ENGINE (CRÍTICO-01) ────────────────────────────────────────────
    subgraph GAP_ENGINE["🔬 Gap Engine (camada intermediária)"]
        gap_solaris["solaris-gap-analyzer.ts"]
        gap_iagen["iagen-gap-analyzer.ts"]
        gap_engine["engine-gap-analyzer.ts"]
        risk_cat["risk-categorizer.ts\n⚡ crítico para Z-07"]
    end
    gaps_confirmed["GapConfirmed[]\n← input do risk-engine-v4.ts (Z-07)"]

    %% ── PIPELINE LLM ───────────────────────────────────────────────────────
    subgraph LLM_PIPELINE["🤖 Pipeline LLM + RAG"]
        rag["📚 RAG\n2.509 docs · 10 leis\nserver/rag.ts"]
        briefing["📝 Briefing Final\ngenerateBriefingFromDiagnostic\nrouters-fluxo-v3.ts:1979"]
        riscos["⚠️ Matrizes de Risco\ngenerateRiskMatrices\nrouters-fluxo-v3.ts:1113\n[AS-IS: 4 áreas · Z-07: 10 categorias LC 214]"]
        gen_acoes["🚀 Gerador de Ações\ngenerateActionPlan\nrouters-fluxo-v3.ts:1267"]
    end

    %% ── OUTPUTS FINAIS ─────────────────────────────────────────────────────
    subgraph OUTPUTS["📤 Outputs Finais"]
        plano_acao["📋 Plano de Ação\nPlanoAcaoV3.tsx\n[AS-IS: 4 áreas · Z-07: 10 categorias]"]
        tarefas["✅ Tarefas Atômicas\nTasksV3.tsx · TaskBoard.tsx"]
    end

    %% ── FLUXO PRINCIPAL ────────────────────────────────────────────────────
    perfil --> cons_comp
    solaris --> cons_comp
    iagen --> cons_comp
    cnae --> cons_comp
    ncm --> cons_comp
    nbs --> cons_comp

    perfil --> cons_diag
    solaris --> cons_diag
    iagen --> cons_diag
    cnae --> cons_diag
    ncm --> cons_diag
    nbs --> cons_diag

    cons_comp <--> cons_diag
    cons_comp --> status_comp
    cons_diag --> score_cpie

    cons_diag --> gap_solaris
    cons_diag --> gap_iagen
    gap_solaris --> gap_engine
    gap_iagen --> gap_engine
    gap_engine --> risk_cat
    risk_cat --> gaps_confirmed

    gaps_confirmed --> briefing
    score_cpie --> briefing
    status_comp --> briefing
    rag --> briefing
    rag --> riscos

    briefing --> riscos
    gaps_confirmed --> riscos
    riscos --> gen_acoes
    briefing --> gen_acoes

    gen_acoes --> plano_acao
    plano_acao --> tarefas

    %% ── ESTILOS ────────────────────────────────────────────────────────────
    classDef entrada fill:#1e3a5f,stroke:#4a9eff,color:#fff
    classDef consolidador fill:#2d4a1e,stroke:#6abf40,color:#fff
    classDef gap fill:#3a1e4a,stroke:#9f40bf,color:#fff
    classDef llm fill:#4a1e3a,stroke:#bf40a0,color:#fff
    classDef output fill:#3a2d1e,stroke:#bf8040,color:#fff
    classDef infra fill:#1e2d4a,stroke:#4060bf,color:#fff

    class perfil,solaris,iagen,cnae,ncm,nbs entrada
    class cons_comp,cons_diag consolidador
    class gap_solaris,gap_iagen,gap_engine,risk_cat,gaps_confirmed gap
    class briefing,riscos,gen_acoes,rag llm
    class plano_acao,tarefas output
```

---

## Gaps Críticos Corrigidos (Auditoria 2026-04-09)

| ID | Severidade | Correção Aplicada |
|----|-----------|-------------------|
| CRÍTICO-01 | 🔴 | **Gap Engine adicionado ao diagrama** — `solaris-gap-analyzer.ts`, `iagen-gap-analyzer.ts`, `engine-gap-analyzer.ts`, `risk-categorizer.ts`. O input do `risk-engine-v4.ts` (Z-07) é `GapConfirmed[]`, não dados brutos dos consolidadores. |
| CRÍTICO-02 | 🔴 | **Score CPIE marcado com ⚠️ AUDIT-C-004** — decisão de arquitetura P.O. pendente (Opção A vs B). Não implementar dependências do Score CPIE até resolução. |
| CRÍTICO-03 | 🔴 | **4 áreas marcadas como [AS-IS]** — Sprint Z-07 substitui por 10 categorias RAG da LC 214/2025: `imposto_seletivo`, `confissao_automatica`, `split_payment`, `inscricao_cadastral`, `regime_diferenciado`, `transicao_iss_ibs`, `obrigacao_acessoria`, `aliquota_zero`, `aliquota_reduzida`, `credito_presumido`. |
| IMPORTANTE-01 | 🟡 | **Contagem RAG confirmada via SQL**: `ragDocuments COUNT = 2.509` (HEAD f8a5864 correto). |
| IMPORTANTE-02 | 🟡 | **riskEngine.ts marcado como sem consumidor ativo** — substituído pelo Engine v2 (`generateRiskMatrices`). Sprint Z-07 consolida em engine único. |
| IMPORTANTE-03 | 🟡 | **SOLARIS: 24 perguntas ativas** (não 20) — confirmado via SQL: `solaris_questions WHERE ativo=1 = 24`. |
| MENOR-01 | 🟢 | **Link RAG corrigido** — `#Lgrep` removido (era artefato de geração automática). |
| MENOR-02 | 🟢 | **Seção Infraestrutura de Suporte consolidada** — duplicações removidas. |

---

## Tabela de Rastreabilidade E2E

| Componente | Arquivo | Linha | GitHub | Objetivo |
|-----------|---------|-------|--------|----------|
| 📥 Perfil da Empresa | `client/src/pages/FormularioProjeto.tsx` | L2 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/client/src/pages/FormularioProjeto.tsx#L2) | Cadastro inicial da empresa: razão social, CNPJ, operationType (produto/serviço/misto/comercio/industria/agronegocio/financeiro), regime tributário e porte. |
| 📥 SOLARIS (Onda 1) | `client/src/pages/QuestionarioSolaris.tsx` | L2 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/client/src/pages/QuestionarioSolaris.tsx#L2) | Questionário estratégico de **24 perguntas ativas** (SOL-013..036) sobre o negócio. Auto-save debounce 800ms (FIX_03). Resume da última pergunta respondida. |
| 📥 IA GEN (Onda 2) | `client/src/pages/QuestionarioIaGen.tsx` | L2 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/client/src/pages/QuestionarioIaGen.tsx#L2) | Questionário gerado por IA com base nas respostas da Onda 1 SOLARIS. Perguntas adaptativas por perfil de empresa. |
| 📥 CNAE | `client/src/pages/QuestionarioCNAE.tsx` | L2 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/client/src/pages/QuestionarioCNAE.tsx#L2) | Identificação e confirmação dos CNAEs da empresa. Embedding semântico com opLabel de 8 operationTypes (FIX_02). |
| 📥 NCM | `client/src/pages/QuestionarioProduto.tsx` | L2 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/client/src/pages/QuestionarioProduto.tsx#L2) | Classificação fiscal de produtos (NCM). Alimenta o diagnóstico de incidência CBS/IBS sobre mercadorias. |
| 📥 NBS | `client/src/pages/QuestionarioServico.tsx` | L2 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/client/src/pages/QuestionarioServico.tsx#L2) | Classificação fiscal de serviços (NBS). Alimenta o diagnóstico de incidência CBS/IBS sobre serviços. |
| ⚙️ Consolidador de Completude | `server/routers-fluxo-v3.ts` | L1908 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/server/routers-fluxo-v3.ts#L1908) | Verifica se todas as 3 camadas do diagnóstico estão completas (QC, QO, CNAE). Retorna status: insuficiente / parcial / completo. |
| ⚙️ Consolidador de Diagnóstico | `server/routers-fluxo-v3.ts` | L1820 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/server/routers-fluxo-v3.ts#L1820) | Agrega dados de todas as entradas e calcula gaps, score CPIE e status por camada. Alimenta o Gap Engine. |
| 🔬 Gap Engine — solaris-gap-analyzer | `server/lib/solaris-gap-analyzer.ts` | L1 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/server/lib/solaris-gap-analyzer.ts) | Analisa gaps específicos das respostas SOLARIS (Onda 1). Produz `GapConfirmed[]`. **Camada intermediária obrigatória entre Consolidadores e Pipeline LLM.** |
| 🔬 Gap Engine — iagen-gap-analyzer | `server/lib/iagen-gap-analyzer.ts` | L1 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/server/lib/iagen-gap-analyzer.ts) | Analisa gaps específicos das respostas IA GEN (Onda 2). Produz `GapConfirmed[]`. |
| 🔬 Gap Engine — engine-gap-analyzer | `server/lib/engine-gap-analyzer.ts` | L1 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/server/lib/engine-gap-analyzer.ts) | Orquestra os analyzers e consolida `GapConfirmed[]` final. |
| 🔬 Gap Engine — risk-categorizer | `server/lib/risk-categorizer.ts` | L1 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/server/lib/risk-categorizer.ts) | Categoriza os gaps em domínios de risco. **⚡ Crítico para Sprint Z-07** — o `risk-engine-v4.ts` recebe `GapConfirmed[]` deste componente. |
| 📤 Status de Completude | `server/routers-fluxo-v3.ts` | L2220 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/server/routers-fluxo-v3.ts#L2220) | Retorna insuficiente / parcial / completo por camada. Gate obrigatório antes de gerar briefing. |
| 📤 Score CPIE ⚠️ | `server/routers-fluxo-v3.ts` | L1820 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/server/routers-fluxo-v3.ts#L1820) | Score de compliance 0–100. **⚠️ AUDIT-C-004 ABERTO** — cálculo aguarda decisão P.O. (Opção A vs B). Não implementar dependências até resolução. |
| 📤 Riscos [AS-IS] | `server/routers-fluxo-v3.ts` | L1113 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/server/routers-fluxo-v3.ts#L1113) | **[AS-IS]** 4 matrizes de risco (Contabilidade, Negócio, TI, Jurídico) geradas por LLM com RAG específico por área. **Sprint Z-07 substitui por 10 categorias LC 214/2025.** Armazenadas em `project_risks_v3`. |
| 🤖 Briefing Final | `server/routers-fluxo-v3.ts` | L1979 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/server/routers-fluxo-v3.ts#L1979) | Gerado por LLM com RAG. Consolida perfil + SOLARIS + IA GEN + CNAE + `GapConfirmed[]`. Gate: todas as 3 camadas completas + Onda 1 concluída (BUG-BRIEFING-01 corrigido). |
| 🤖 Gerador de Ações | `server/routers-fluxo-v3.ts` | L1267 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/server/routers-fluxo-v3.ts#L1267) | Gera plano de ação por área a partir das matrizes de risco + briefing. Enriquecido com respostas do questionário (V70.2). |
| 📤 Plano de Ação [AS-IS] | `client/src/pages/PlanoAcaoV3.tsx` | L638 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/client/src/pages/PlanoAcaoV3.tsx#L638) | **[AS-IS]** Plano estruturado por área (Contabilidade, Negócio, TI, Jurídico) com prioridade, prazo e responsável. **Sprint Z-07 substitui por 10 categorias LC 214/2025.** |
| 📤 Tarefas Atômicas | `client/src/pages/compliance-v3/TasksV3.tsx` | L20 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/client/src/pages/compliance-v3/TasksV3.tsx#L20) | Tarefas granulares derivadas do plano de ação. Gerenciadas em quadro Kanban (TaskBoard.tsx). |
| 🏗️ RAG Engine | `server/rag.ts` | L1 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/server/rag.ts) | Retrieval-Augmented Generation: **2.509 documentos** de 10 leis da Reforma Tributária (confirmado via SQL). Usado em `generateBriefingFromDiagnostic` e `generateRiskMatrices`. |
| 🏗️ CNAE Embeddings | `server/cnae-embeddings.ts` | L251 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/server/cnae-embeddings.ts#L251) | Engine de embeddings semânticos para identificação automática de CNAEs. opLabel com 8 operationTypes (FIX_02 — BUG-CNAE-AUTO). |
| 🏗️ Risk Engine (sem consumidor ativo) | `server/riskEngine.ts` | L1 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/server/riskEngine.ts) | Engine matemático probability × impact. **SEM CONSUMIDOR ATIVO no frontend** — substituído pelo Engine v2 (`generateRiskMatrices`). Sprint Z-07 consolida em engine único. |
| 🏗️ Shadow Mode | `server/diagnostic-shadow/` | L1 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/server/diagnostic-shadow/) | Modo de leitura paralela (`DIAGNOSTIC_READ_MODE=shadow`). Afeta como o diagnóstico é calculado. Interação com shadow validation necessária antes do hot-swap Z-07. |
| 🏗️ Schema DB (TiDB Cloud) | `drizzle/schema.ts` | L1768 | [→ GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/f8a58640c04a6774fe3672e8cc8b48f92482820f/drizzle/schema.ts#L1768) | Banco TiDB Cloud. Tabelas principais: `projects`, `solaris_answers`, `project_risks_v3`, `ragDocuments`, `questionnaire_answers_v3`. |

---

## Procedures tRPC — Mapa Completo (routers-fluxo-v3.ts)

| Procedure | Linha | Tipo | Papel no Fluxo E2E |
|-----------|-------|------|-------------------|
| `createProject` | L67 | mutation | Cria projeto e perfil da empresa |
| `extractCnaes` | L147 | mutation | Extrai CNAEs via embedding semântico |
| `refineCnaes` | L333 | mutation | Refina CNAEs com LLM |
| `confirmCnaes` | L434 | mutation | Confirma CNAEs selecionados |
| `getOnda1Questions` | L2307 | query | Carrega perguntas SOLARIS + respostas salvas |
| `saveSolarisAnswer` | L2433 | mutation | Auto-save individual SOLARIS (FIX_03) |
| `completeOnda1` | L2345 | mutation | Finaliza Onda 1 SOLARIS |
| `generateOnda2Questions` | L2461 | mutation | Gera perguntas IA GEN com base na Onda 1 |
| `completeOnda2` | L2582 | mutation | Finaliza Onda 2 IA GEN |
| `getProductQuestions` | L2718 | query | Carrega perguntas NCM (produtos) |
| `completeProductQuestionnaire` | L2802 | mutation | Finaliza questionário NCM |
| `getServiceQuestions` | L2761 | query | Carrega perguntas NBS (serviços) |
| `completeServiceQuestionnaire` | L2841 | mutation | Finaliza questionário NBS |
| `completeDiagnosticLayer` | L1908 | mutation | **Consolidador de Completude** — gate por camada |
| `getAggregatedDiagnostic` | L1820 | query | **Consolidador de Diagnóstico** — alimenta Gap Engine |
| `getDiagnosticStatus` | L2220 | query | Status insuficiente/parcial/completo |
| `generateBriefingFromDiagnostic` | L1979 | mutation | **Briefing Final** — LLM + RAG + gate 3 camadas + `GapConfirmed[]` |
| `generateRiskMatrices` | L1113 | mutation | **Matrizes de Risco [AS-IS]** — 4 áreas · RAG por área · alvo do hot-swap Z-07 |
| `approveMatrices` | L1242 | mutation | Aprovação das matrizes pelo consultor |
| `generateActionPlan` | L1267 | mutation | **Gerador de Ações** — plano por área |
| `approveActionPlan` | L1554 | mutation | Aprovação do plano de ação |
| `updateTask` | L1441 | mutation | Atualiza tarefa atômica (status, responsável) |

---

## Confirmações SQL (2026-04-09)

| Tabela | Query | Resultado | Observação |
|--------|-------|-----------|------------|
| `ragDocuments` | `COUNT(*)` | **2.509** | Confirma contagem correta para HEAD f8a5864 |
| `solaris_questions` | `WHERE ativo=1` | **24** | 24 perguntas ativas (SOL-013..036), não 20 |
| `solaris_questions` | `COUNT(*)` | **36** | 36 total (inclui inativas) |
| `project_risks_v3` | `COUNT(*)` | **4** | 4 registros de risco |
| `cpie_settings` | `COUNT(*)` | **1** | 1 configuração CPIE (confirma AUDIT-C-004 pendente) |

---

## Fixes Aplicados nesta Sessão (Gate B ✅)

| Fix | Bug | Componente afetado | Arquivo | PR |
|-----|-----|-------------------|---------|-----|
| FIX_01 | Gate EVIDENCE | PR template + FF-EVIDENCE-01/02 | `.github/pull_request_template.md` · `server/integration/fitness-functions.test.ts` | [#414](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/414) |
| FIX_02 | BUG-CNAE-AUTO | CNAE Embeddings — opLabel 8 valores | `server/cnae-embeddings.ts:228` | [#414](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/414) |
| FIX_03 | BUG-SOLARIS-SAVE | SOLARIS auto-save + resume | `server/routers-fluxo-v3.ts:2433` · `client/src/pages/QuestionarioSolaris.tsx` | [#414](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/414) |

---

## Pendências para Sprint Z-07

| ID | Tipo | Descrição | Responsável |
|----|------|-----------|-------------|
| AUDIT-C-004 | 🔴 Decisão P.O. | Score CPIE — Opção A vs B de cálculo | P.O. (Uires Tapajós) |
| Z-07-PREP-01 | 🔴 Implementação | Gap Engine: garantir interface `GapConfirmed[]` compatível com `risk-engine-v4.ts` | Manus |
| Z-07-PREP-02 | 🔴 Implementação | Substituir 4 áreas por 10 categorias LC 214/2025 em `generateRiskMatrices` | Manus |
| Z-07-PREP-03 | 🟡 Validação | Shadow validation antes do hot-swap (interação com `diagnostic-shadow/`) | Manus |

---

*Última atualização: 2026-04-09 — Auditoria Orquestrador (Claude Browser) — 8 gaps corrigidos.*
*Próxima atualização: Sprint Z-07 (Sistema de Riscos v4)*
