# Diagnóstico — Adoção do Arquétipo nos Questionários, Gaps, Riscos e Rastreabilidade

**Status:** Diagnóstico read-only para servir de fonte oficial das issues da sprint "Arquétipo como fonte de contexto do produto"
**Data:** 2026-05-01
**HEAD:** `c1234d4` (pós-merge #899)
**Modo:** análise empírica via grep/Read em paralelo (4 clusters de exploração)
**Restrições atendidas:** zero código modificado, zero migration, zero PR de feature

---

## 1. Resumo executivo

### Achado central

**`projects.archetype` está persistido (M2 entregue) mas NÃO é consumido por nenhum router downstream.** Todos os 4 tipos de questionário, o gap engine e o risk engine continuam alimentados pela **camada legada** (`companyProfile`, `operationProfile`, `confirmedCnaes`).

A confirmação do Perfil da Entidade pelo cliente em M2 é, portanto, **simbólica para o pipeline**: o snapshot fica gravado em `projects.archetype` mas o questionário, gap e risco que o cliente recebe são gerados ignorando as 6 dimensões confirmadas.

### Impacto de produto (em 1 frase)

Cliente confirma `papel_na_cadeia="transportador"` + `objeto="combustível"` em M2 → questionário gera perguntas genéricas de varejista → gap nasce sem contexto → risco IS aparece para transportadora (que não é contribuinte de IS) → advogado precisa explicar manualmente que aquele risco não se aplica.

### Severidade

🔴 **Alta** — produto exige 98% de confiabilidade jurídica e a cadeia `Perfil → Quest → Resp → Gap → Risco` está estruturalmente desconectada do arquétipo confirmado. Risco direto: cliente real (advogado) recebe diagnóstico que ele precisa **defender perante o cliente final** com fundamentação que o sistema não fornece.

### Estado da rastreabilidade

🟠 **Parcial** — `risks_v4` tem `evidence` (JSON com pergunta/resposta como string serializada) mas **NÃO há FK** `risk → gap → question → answer`. Para responder "por que esse risco apareceu?" o usuário/advogado depende de inspeção manual de JSON.

### Estado da auditoria

🟢 **Boa para CRUD** (auditLog completo de criação/aprovação/soft-delete) / 🔴 **Ausente para causalidade** (não registra `questionnaireVersion`, `rag_corpus_version`, `from_question_id`).

### Estado dos testes E2E

🟡 **Cobre pipeline mas não causalidade** — `tests/e2e/z17-pipeline-completo.spec.ts` (20 casos) valida que risco "existe" pós-pipeline, mas nenhum teste valida "este risco veio desta pergunta".

---

## 2. Mapa do fluxo atual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO ATUAL (M2 desconectado)                        │
└─────────────────────────────────────────────────────────────────────────────┘

[1] Cliente confirma CNAEs            (legado: confirmedCnaes[])
        ↓
[2] Cliente passa pelo M2 — Perfil da Entidade
        → server/lib/archetype/buildPerfilEntidade.ts (engine M1 determinístico)
        → grava snapshot em projects.archetype (JSON, imutável)
        → grava archetypeVersion + archetypeRulesHash + archetypePerfilHash
        → grava archetypeConfirmedAt + archetypeConfirmedBy
        ✅ ESTADO PERSISTIDO

[3] Geração de questionários — 5 fontes DESACOPLADAS
        ├─→ Onda 1 SOLARIS (hardcoded por CNAE)        ❌ não lê archetype
        ├─→ Onda 2 IA GEN (LLM com 5 JSONs legacy)     ❌ não lê archetype
        ├─→ Q.CNAE (5 seções hardcoded)                 ❌ não lê archetype
        ├─→ Q.Produto/NCM (RAG por NCM + SOLARIS)      ❌ não lê archetype
        └─→ Q.Serviço/NBS (RAG por NBS + SOLARIS)      ❌ não lê archetype
        ↓
[4] Respostas em questionnaireAnswersV3 / solarisAnswers / iagenAnswers / cnaeAnswers
        ↓
[5] Gap engine (server/routers/gapEngine.ts)
        SELECT companySize, taxRegime, confirmedCnaes FROM projects
        ❌ NÃO lê projects.archetype
        ↓ classifyGap() pura (mesma lógica para todas empresas)
        ↓
[6] Risk engine v4 (server/lib/risk-engine-v4.ts)
        SELECT companySize, taxRegime FROM projects
        ❌ NÃO lê projects.archetype (apenas porte/regime planos)
        ↓ deriveRisksFromGaps() + generateContextualRisks()
        ↓ Hotfix IS v1.2 introduziu gate por operationType (parcial)
        ↓
[7] risks_v4 com evidence: JSON [{ pergunta?, resposta?, fonte? }]
        ❌ NÃO tem FK question_id / gap_id
        ❌ NÃO tem questionnaire_version / rag_corpus_version
        ↓
[8] UI Matriz de Riscos (RiskDashboardV4.tsx)
        ✅ Mostra breadcrumb [fonte, categoria, artigo, ruleId]
        ✅ Mostra evidence.pergunta/resposta como string
        ❌ Sem badge "gerado por pergunta X do questionário Y"
        ❌ Sem dimensões do arquétipo relevantes ao risco
```

## 3. Mapa do fluxo desejado

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DESEJADO (M3 — RAG consome arquétipo)          │
└─────────────────────────────────────────────────────────────────────────────┘

[1] CNAEs confirmados                                    (mantido)
[2] M2 Perfil da Entidade → projects.archetype           (mantido — já entregue)

[3] Geração de questionários — TODOS recebem archetype
        ├─→ Onda 1 SOLARIS — filtra por papel/objeto/regime
        ├─→ Onda 2 IA GEN — prompt LLM inclui 6 dimensões
        ├─→ Q.CNAE — perguntas filtradas por subnatureza_setorial + orgao_regulador
        ├─→ Q.Produto/NCM — diferencia produtor vs importador vs varejista
        └─→ Q.Serviço/NBS — diferencia serviço regulado vs comum
        ↓
[4] Respostas com sourceQuestionnaireVersion gravado
        ↓
[5] Gap engine — recebe archetype + respostas
        Gap conhece papel_na_cadeia + objeto + regime + território
        ↓
[6] Risk engine — recebe archetype + gaps + RAG dimensional
        Aplicabilidade: IS não aplica a transportador (apriori, não downgrade)
        FK: risk.gap_id, risk.requirement_id (já existem em parte)
        Novo: risk.from_question_id, risk.questionnaire_version, risk.rag_corpus_version
        ↓
[7] risks_v4 com trilha completa Perfil→Risco
        ↓
[8] UI Matriz de Riscos com drawer de rastreabilidade
        Cada risco expande: fundamento legal + gap + pergunta + resposta + dimensões
```

---

## 4. Tabela consolidada das 12 frentes

| # | Frente | Usa arquétipo hoje? | Deveria usar? | Gap principal | Prioridade | Issue futura sugerida |
|---|---|---|---|---|---|---|
| 1 | IA GEN questionários (Onda 2) | ❌ NÃO | ✅ SIM (essencial) | LLM recebe 5 JSONs legacy, sem `papel_na_cadeia/objeto/regime` dimensional | 🔴 P1 | M3-Q-IAGEN — incluir 6 dimensões no prompt LLM |
| 2 | Compliance Q.CNAE | ❌ NÃO (5 seções hardcoded) | 🟡 SIM (parcial — para setor regulado) | Banco digital recebe perguntas iguais a comércio comum; sem diferenciação `subnatureza_setorial` | 🟠 P2 | M3-Q-CNAE — diferenciar setores regulados (BCB/ANS/ANATEL/ANTT) |
| 3 | Compliance Q.Produto/NCM | ❌ NÃO | ✅ SIM (essencial) | Importadora recebe mesmas perguntas de varejista; sem `papel_na_cadeia` | 🔴 P1 | M3-Q-NCM — receber `archetype.papel_na_cadeia` + `objeto` |
| 4 | Compliance Q.Serviço/NBS | ❌ NÃO | ✅ SIM (essencial) | Transportadora regulada (ANTT) trata-se como serviço comum | 🔴 P1 | M3-Q-NBS — receber `archetype.subnatureza_setorial` + `orgao_regulador` |
| 5 | Estrutura geral / orquestrador | ❌ NÃO há contrato único | ✅ SIM | 5 fontes DESACOPLADAS, duplicação de lógica de inferência de papel | 🟠 P2 | M3-Q-ORCHESTRATOR — interface comum `QuestionGeneratorInput` recebendo `PerfilDimensional` opcional |
| 6 | Gap engine | ❌ NÃO | ✅ SIM | `classifyGap()` é pura — mesma classificação para todas empresas | 🔴 P1 | M3-GAP-01 — gap recebe `projects.archetype`; gaps conhecem papel/objeto/regime |
| 7 | Risk engine (matriz) | 🟡 PARCIAL (porte/regime planos + hotfix IS v1.2 gate por operationType) | ✅ SIM (dimensional pleno) | `risk-engine-v4` lê `companySize`/`taxRegime` mas NÃO `archetype`; aplicabilidade depende de gate operationType pós-fato | 🔴 P1 | M3-RISK-01 — risk engine consome `archetype.objeto/papel/regime` para aplicabilidade apriori |
| 8 | Rastreabilidade do risco | ❌ NÃO há FK estruturada | ✅ SIM | `evidence` é JSON com pergunta/resposta como string; sem `question_id`/`gap_id` FK em `risks_v4` | 🔴 P1 | M3-TRACE-01 — adicionar FKs (Opção A: campo JSON + question_id; Opção C: colunas FK) |
| 9 | Modelo de dados rastreabilidade | 🟡 PARCIAL | ✅ SIM | Schema tem `archetype` + `questionnaireAnswersV3` + `risks_v4` mas sem elos | 🟠 P2 | M3-TRACE-02 — migration `0089_add_risk_traceability_fks` |
| 10 | UI/UX matriz de riscos | 🟡 PARCIAL (mostra evidence string) | ✅ SIM | Sem drawer de "explicar risco" com pergunta + resposta + dimensões | 🟠 P2 | M3-UI-01 — drawer de rastreabilidade no `RiskDashboardV4` |
| 11 | Logs/auditoria/compliance | 🟢 BOA (CRUD) / 🔴 AUSENTE (causal) | ✅ SIM | Sem `questionnaire_version`, `rag_corpus_version`, `from_question_id` no audit_log | 🟠 P2 | M3-AUDIT-01 — adicionar versioning causal em `audit_log` |
| 12 | Testes E2E | 🟡 PARCIAL (z17 cobre pipeline) | ✅ SIM | Nenhum teste prova "risco X veio de pergunta Y"; sem cenários setoriais | 🟠 P2 | M3-TEST-01 — E2E setoriais (financeiro/combustível/agro/transportadora) + assertion de rastreabilidade |

---

## 5. Detalhamento por frente

### Frente 1 — IA GEN questionários (Onda 2)

**Estado atual:** O gerador de Onda 2 (`generateOnda2Questions` em `server/routers-fluxo-v3.ts:3765-3940`) consome perfil via 5 JSONs legacy: `companyProfile`, `operationProfile`, `taxComplexity`, `financialProfile`, `governanceProfile` (linhas 3776-3780).

**Arquivos envolvidos:**
- `server/routers-fluxo-v3.ts:3765-3940` — `generateOnda2Questions`
- Linhas 3830-3855 — construção do `profileFields[]` enviado ao LLM

**Fluxo atual:**
1. Busca 5 JSONs do projeto
2. Constrói `profileFields[]` com regime/porte/CNAE/operationType/multiState
3. Busca categorias ativas de risco do banco
4. LLM gera 5-12 perguntas requerindo `risk_category_code`
5. Retorna `Pergunta[]` com `fonte: "ia_gen"` + `confidence_score`

**Usa `projects.archetype`?** ❌ **NÃO** — apenas camada legada.

**Como deveria usar:** prompt LLM deveria receber as 6 dimensões do arquétipo (`objeto`, `papel_na_cadeia`, `tipo_de_relacao`, `territorio`, `regime`, `subnatureza_setorial`) para gerar perguntas específicas ao perfil confirmado.

**Gap identificado:** Onda 2 não diferencia transportadora vs comércio vs indústria — usa apenas `operationType` plano ("industria"/"comercio"/"servicos"), perdendo nuances do `papel_na_cadeia` (transportador vs distribuidor vs intermediador).

**Risco de produto:** advogado de transportadora de combustível recebe perguntas IA GEN sobre "alíquota de IBS sobre venda de mercadoria" (irrelevante para serviço de transporte).

**Risco técnico:** prompt LLM atual é estável; mudança exige A/B comparativo para garantir que perguntas novas não ficam piores que as atuais.

**Sugestão de implementação futura:** estender `generateOnda2Questions` para aceitar parâmetro opcional `archetype: PerfilDimensional`. Fallback no legado se ausente.

**Testes necessários:** snapshot de prompt para 4 perfis (transportador, distribuidor, fabricante, prestador). Validar que prompt contém as 6 dimensões.

**Critério de aceite futuro:** dado projeto com `archetype.papel_na_cadeia="transportador"`, prompt LLM contém literal "transportador" (não apenas "servicos"). Snapshot diff aprovado por P.O.

**Prioridade:** 🔴 P1.

---

### Frente 2 — Compliance Q.CNAE

**Estado atual:** 5 seções hardcoded estruturais (QCNAE-01 a QCNAE-05) em `client/src/pages/QuestionarioCNAE.tsx:55-100`. **NÃO há geração dinâmica por LLM.**

**Arquivos envolvidos:**
- `client/src/pages/QuestionarioCNAE.tsx:55-100` — frontend (5 seções)
- `server/routers-fluxo-v3.ts:4208+` — `completeQuestionarioCnae` (apenas persiste)
- `shared/questionario-prefill.ts` — `buildCnaePrefill()` preenche QCNAE-01 com CNAEs confirmados

**Usa `projects.archetype`?** ❌ **NÃO** — apenas `confirmedCnaes[]` + `operationProfile.operationType`.

**Gap identificado:** banco digital (CNAE 6411-603) recebe perguntas idênticas a comércio comum. Sem diferenciação `subnatureza_setorial="financeiro"` + `orgao_regulador="BCB"`.

**Risco de produto:** advogado de cliente regulado (BCB/ANS/ANATEL/ANTT) precisa filtrar manualmente perguntas irrelevantes.

**Sugestão futura:** seções 3-5 do QCNAE viram condicionais — se `archetype.subnatureza_setorial="financeiro"` exibe seção dedicada a regulação BCB; se transporte exibe seção ANTT; etc.

**Critério de aceite:** dado `archetype.subnatureza_setorial="financeiro"`, QCNAE-04 exibe seção "Regulação BCB" com 5 perguntas específicas.

**Prioridade:** 🟠 P2 (estruturalmente posterior a Frente 1/3/4).

---

### Frente 3 — Compliance Q.Produto/NCM

**Estado atual:** `generateProductQuestions()` em `server/lib/product-questions.ts:64-147` combina **RAG por NCM** + **SOLARIS filtrado por CNAE**. Recebe `companyProfile: { operationType }` apenas.

**Arquivos envolvidos:**
- `server/lib/product-questions.ts:64-147` — gerador
- `server/routers-fluxo-v3.ts:4093-4125` — invocação
- `server/lib/completeness.ts:91-130` — `inferCompanyType(operationType, cnaes)` retorna "produto"|"servico"|"misto"
- `server/rag-retriever.ts` — `queryRag([ncm, ...cnaeCodes], contextQuery, 3)`

**Fluxo atual:**
1. `inferCompanyType()` → se "servico" retorna `{ nao_aplicavel: true }`
2. Para cada NCM: `queryRag()` → chunks RAG
3. Para cada chunk: gera pergunta via LLM (`generateQuestionFromChunk`)
4. Filtra SOLARIS por CNAE
5. Deduplica e retorna `TrackedQuestion[]`

**Usa `projects.archetype`?** ❌ **NÃO** — `inferCompanyType` é heurística baseada em `operationType` + CNAE, não no arquétipo confirmado.

**Gap identificado:** importadora de eletrônicos recebe mesmas perguntas de varejista. Sem captura de:
- Drawback de importação
- Regime de importação direto vs intermediário
- NCMs com Anexo XIV (alíquotas reduzidas)
- Diferenciação produtor vs importador vs distribuidor vs varejista

**Risco de produto:** importador perde questões críticas de elegibilidade a regimes especiais.

**Sugestão futura:** `generateProductQuestions` aceita `archetype.papel_na_cadeia` + `archetype.objeto`. Se `papel="importador"` injeta perguntas dedicadas (drawback, RECOF, classificação aduaneira). Se `papel="produtor"` injeta perguntas de cadeia produtiva.

**Critério de aceite:** dado projeto com `archetype.papel_na_cadeia="importador"` + NCM 8517.62.59, perguntas geradas incluem ao menos 1 sobre drawback ou RECOF.

**Prioridade:** 🔴 P1.

---

### Frente 4 — Compliance Q.Serviço/NBS

**Estado atual:** `generateServiceQuestions()` em `server/lib/service-questions.ts` — espelho de `product-questions.ts`. Mesma estrutura RAG + SOLARIS.

**Usa `projects.archetype`?** ❌ **NÃO** — idem Q.Produto.

**Gap identificado:** não diferencia:
- Transporte regulado (ANTT) — Lei 11.442/2007
- Telecom regulado (ANATEL) — LGT
- Saúde regulado (ANS) — Lei 9.961/2000
- Financeiro regulado (BCB) — LC 105/2001
- Energia regulada (ANEEL) — Lei 9.427/1996

**Risco de produto:** transportadora de carga recebe perguntas genéricas "IBS sobre serviços" sem distinguir regime de não-cumulatividade aplicável a transporte interestadual.

**Sugestão futura:** se `archetype.subnatureza_setorial ∈ ["transporte_carga","transporte_passageiro"]`, perguntas dedicadas ANTT. Se `subnatureza="financeiro"`, perguntas BCB. Etc.

**Critério de aceite:** dado `archetype.subnatureza_setorial="transporte_carga"` + NBS 1.0501.10.00, perguntas geradas incluem ao menos 1 sobre RNTRC ou tabela de fretes.

**Prioridade:** 🔴 P1.

---

### Frente 5 — Estrutura geral / orquestrador

**Estado atual:** 5 fontes de perguntas DESACOPLADAS, sem orquestrador comum:

| Fonte | Função | Arquivo |
|---|---|---|
| Onda 1 SOLARIS | `injectOnda1IntoQuestions()` | `server/routers/onda1Injector.ts` (hardcoded por CNAE) |
| Onda 2 IA GEN | `generateOnda2Questions()` | `server/routers-fluxo-v3.ts:3765-3940` |
| Q.Produto | `generateProductQuestions()` | `server/lib/product-questions.ts` |
| Q.Serviço | `generateServiceQuestions()` | `server/lib/service-questions.ts` |
| Q.CNAE | 5 seções hardcoded | `client/src/pages/QuestionarioCNAE.tsx` |

**Contrato único?** ❌ **NÃO** — cada módulo decide sozinho. Nenhum recebe `PerfilDimensional` (6 dimensões).

**Duplicação de lógica:**
- Inferência de papel: `routers/perfil.ts:123-129` mapeia `operationType → papel`. Mesma lógica não existe em product/service-questions (que ignoram papel).
- `inferCompanyType(operationType, cnaes)` em `completeness.ts:91-130` — usado em product/service-questions, não em onda 2.
- RAG retrieval em `rag-retriever.ts` usa CNAE groups + keyword matching — sem dimensões.

**Risco técnico:** módulos contraditórios. Onda 2 com `operationType="financeiro"` gera perguntas genéricas; Q.Serviço com mesmo input gera RAG/SOLARIS de "serviço genérico". Nenhum aplica `subnatureza_setorial="financeiro"` + `orgao_regulador="BCB"`.

**Sugestão futura:** criar interface comum `QuestionGeneratorInput`:

```
interface QuestionGeneratorInput {
  projectId: number;
  archetype?: PerfilDimensional;       // NOVO — opcional para fallback
  cnaes: string[];
  ncms?: string[];
  nbss?: string[];
  legacyOperationType?: string;        // DEPRECATED, manter para fallback
}
```

Cada gerador importa o tipo + lê `archetype` quando presente.

**Prioridade:** 🟠 P2 (estruturalmente vem depois das frentes individuais 1/3/4 mas antes do 6/7).

---

### Frente 6 — Gap engine

**Estado atual:** Origem dos gaps = respostas (`questionnaireAnswersV3` + `solaris_answers` + `iagen_answers`) + requisitos (`regulatory_requirements_v3`).

**Arquivos envolvidos:**
- `server/routers/gapEngine.ts:231-457` — motor principal, `classifyGap()` linhas 94-177
- `server/lib/engine-gap-analyzer.ts:67-217` — Decision Kernel (NCM/NBS)
- `server/lib/analyze-gaps-questionnaires.ts:170-342` — Ondas 1+2 SOLARIS
- `server/lib/iagen-gap-analyzer.ts:98-170` — IA Generativa
- Tabela: `project_gaps_v3` (colunas: `id`, `project_id`, `requirement_code`, `domain`, `gap_classification`, `evaluation_confidence`, `source` ∈ [v1|solaris|iagen|engine])

**Fluxo atual:**
1. Busca projeto: `SELECT id, name, clientId FROM projects` (linha 244) — **nenhuma coluna archetype**
2. Busca requisitos: `FROM regulatory_requirements_v3` — genéricos
3. Busca respostas: `FROM questionnaireAnswersV3`
4. Para cada requisito: aplica `classifyGap()` (função pura, determinística)
5. Persiste em `project_gaps_v3` com `source`

**Usa `projects.archetype`?** ❌ **NÃO** — grep confirma zero referências em `gapEngine.ts`, `engine-gap-analyzer.ts`, `analyze-gaps-questionnaires.ts`, `iagen-gap-analyzer.ts`.

**Gap identificado:** `classifyGap()` é função pura → mesma entrada (resposta + requirement) = mesma classificação para todas as empresas. Não considera porte, regime, CNAE, papel, objeto.

**Casos de erro potencial:**
- Transportadora com CNAE secundário em comércio: recebe gap de IS (que não se aplica)
- Microempresa (MEI): recebe gaps de lucro real (inaplicável)
- Empresa sem operação internacional: recebe gaps de transição fiscal

**Sugestão futura:** `gapEngine` recebe `archetype` no contexto. Adicionar etapa de **filtragem de aplicabilidade** antes da classificação:

```
SE archetype.papel_na_cadeia="transportador" E requirement.aplica_a INCLUI "fabricante"
  ENTÃO gap = nao_aplicavel (não inserir em project_gaps_v3)
```

**Critério de aceite:** dado projeto com `archetype.papel_na_cadeia="transportador"`, gap engine NÃO gera gaps com `requirement.domain="imposto_seletivo"` para perfil exclusivamente prestador.

**Prioridade:** 🔴 P1.

---

### Frente 7 — Risk engine (matriz)

**Estado atual:** `riskEngine.ts` em `server/routers/riskEngine.ts:1-678` lê `companySize`, `taxRegime`, `confirmedCnaes`, `operationProfile` (linha 604). **NÃO lê `archetype`.**

**Arquivos envolvidos:**
- `server/routers/riskEngine.ts:1-678` — orquestrador
- `server/lib/risk-engine-v4.ts:1-150+` — `calculateRiskScore(baseCriticality, gapClassification, porte, regime, origin)` linhas 205-259
- Multipliers: `PORTE_MULTIPLIER` (grande=1.15, ..., mei=0.75) e `REGIME_MULTIPLIER` (lucro_real=1.20, ..., simples=0.90)
- Contextual Risk Layer: linhas 273-315 (`generateContextualRisks`)

**Fluxo atual:**
1. Busca projeto: `SELECT companySize, taxRegime, confirmedCnaes, operationProfile FROM projects`
2. Extrai porte/regime
3. Busca gaps: `FROM project_gaps_v3 g LEFT JOIN regulatory_requirements_v3 r`
4. Para cada gap: `calculateRiskScore(...)` aplica multipliers
5. Gera riscos contextuais por porte/regime
6. Persiste em `project_risks_v3` (ou `risks_v4` no novo schema)

**Usa `projects.archetype`?** ❌ **NÃO** — apenas `companySize` + `taxRegime` + `operationProfile` (JSON legado).

**Hotfix IS v1.2 (gate de elegibilidade):** `isCategoryAllowed()` linha 415 filtra risco IS por `operationType`. Se `operationType="transportador"`, risco IS é **downgraded** para `enquadramento_geral`. **Limitação:** gate só funciona com `operationType` plano, não com arquétipo dimensional.

**Casos de erro potencial:**
- Transportadora de combustível recebe risco IS de alta severidade → depois IS é downgraded para `enquadramento_geral` (perda de contexto, e perda da informação "este risco não se aplica porque é transporte")
- Empresa sem operação internacional recebe risco de transição fiscal
- MEI recebe riscos de lucro real com multiplier 1.20 (score inflado)
- Risco de NFS-e gerado para indústria de manufatura

**Sugestão futura (em duas camadas):**

1. **Apriori (preferencial):** `riskEngine` recebe `archetype` e filtra **APLICABILIDADE** antes de calcular score. Se categoria não aplica ao papel/objeto, risco NÃO é gerado (em vez de downgraded).

2. **Aposteriori (compatibilidade):** manter `isCategoryAllowed()` como segurança, mas com dimensões do arquétipo (`papel_na_cadeia`, `objeto`, `subnatureza_setorial`) em vez de `operationType` plano.

**Critério de aceite:** dado projeto com `archetype.papel_na_cadeia="transportador"` + gap "IS não recolhido", risk engine retorna 0 riscos categoria `imposto_seletivo` (não-gerado, não-downgraded).

**Prioridade:** 🔴 P1.

---

### Frente 8 — Rastreabilidade do risco

**Estado atual:** `risks_v4` (em `server/db-queries-risks-v4.ts:241-277`) tem:
- `breadcrumb`: JSON array `[fonte, categoria, artigo, ruleId]` (4 nós)
- `evidence`: JSON array com `{ fonte?, prioridade?, pergunta?, resposta?, confianca?, ... }`
- `rule_id`: referência única
- **Sem FK direta** para `gaps`, `questions`, ou `answers`

**Lacunas críticas:**
- `risks_v4` **NÃO tem FK** para `questionnaireAnswersV3` ou tabelas de gaps
- `evidence` é array JSON com referências como **strings serializadas** (cópia, não referência)
- Não há link estruturado `risk_id → gap_id → question_id`
- Trilha `Perfil → Quest → Pergunta → Resposta → Gap → Risco` existe **implicitamente** em JSON, sem navegabilidade

**Não confirmado empíricamente:** se há tabela `project_gaps_v3` no schema atual ou se foi substituída por estrutura v4. Validar via `grep -n "project_gaps_v3\|risks_v4" drizzle/schema.ts`.

**Modelo mínimo proposto (3 opções):**

**Opção A — denormalizada (compatível com v4):**
```
evidence: { 
  pergunta, resposta, confianca, fonte,
  question_id?: int,             // NOVO — FK questionnaireAnswersV3.id
  answer_source?: "solaris"|"iagen"|"qa_v3",
  gap_id?: int                   // NOVO — FK project_gaps_v3.id
}
```
Vantagem: zero migration. Desvantagem: integridade frouxa (FK em JSON).

**Opção B — normalizada (nova tabela):**
```
risk_evidence_sources (
  risk_id FK → risks_v4.id,
  question_source_type: "solaris" | "iagen" | "qa_v3",
  source_id: int,
  weight: decimal
)
```
Vantagem: rastreabilidade muitos-para-muitos. Desvantagem: 1 migration + JOIN extra.

**Opção C — FK simples em `risks_v4`:**
```
ALTER TABLE risks_v4 ADD COLUMN primary_question_id INT NULL;
ALTER TABLE risks_v4 ADD COLUMN primary_gap_id INT NULL;
```
Vantagem: cobertura mínima viável (caso primário). Desvantagem: não-cobre múltiplas perguntas → 1 risco.

**Recomendação:** **Opção C** para MVP (1 migration trivial, 95% dos casos). **Opção B** se aparecer caso real de risco multi-pergunta com pesos.

**Critério de aceite:** dado risco gerado, query `SELECT * FROM risks_v4 WHERE id=X` retorna `primary_question_id` populado. Frontend consegue navegar `risk → pergunta`.

**Prioridade:** 🔴 P1.

---

### Frente 9 — Modelo de dados da rastreabilidade

**Estado atual (schema empírico):**

| Tabela | Linhas em `drizzle/schema.ts` | Campos relevantes para rastreabilidade |
|---|---|---|
| `projects` | 31-167 | `archetype` (JSON), `archetypeVersion`, `archetypePerfilHash`, `archetypeRulesHash`, `archetypeConfirmedAt`, `archetypeConfirmedBy` |
| `questionnaireAnswersV3` | 1209-1224 | `cnaeCode`, `questionIndex`, `questionText`, `answerValue`, FK `projectId` (sem link a riscos) |
| `solarisAnswers` | 1743-1759 | `projectId` FK, `questionId` FK, `codigo`, `resposta`, `fonte="solaris"` |
| `iagenAnswers` | 1769-1793 | `projectId` FK, `questionText` (string, não FK), `resposta`, `fonte="ia_gen"` |
| `risks_v4` | (db-queries-risks-v4.ts:58-83) | `evidence` JSON, `breadcrumb` JSON, `rule_id`, `source_priority`, sem FK para gap/question |
| `auditLog` | 986-1010 | `user`, `project`, `entityType`, `action`, `changes`, `timestamp` |
| `audit_log` (riscos v4) | (db-queries-risks-v4.ts) | `entity_type`, `action`, `before_state`, `after_state` (JSON), `user_id`, `user_name`, `user_role` |

**Elos existentes:**
- Risk → (via JSON) → Evidence (perguntas/respostas serializadas)
- SolarisAnswers/IagenAnswers → Project (FK)
- AuditLog → Project (FK)

**Elos faltantes:**
- Risk → Gap (sem FK)
- Risk → Question/Answer (apenas via JSON serializado)
- Gap → QuestionnaireAnswerV3 (sem FK)
- Audit_log NÃO grava `archetype_version`, `questionnaire_version`, `rag_corpus_version` na criação do risco

**Modelo mínimo viável proposto:**

```sql
-- Migration 0089_add_risk_traceability_fks
ALTER TABLE risks_v4 ADD COLUMN primary_question_id INT NULL;
ALTER TABLE risks_v4 ADD COLUMN primary_gap_id INT NULL;
ALTER TABLE risks_v4 ADD COLUMN questionnaire_version VARCHAR(32) NULL;
ALTER TABLE risks_v4 ADD COLUMN rag_corpus_version VARCHAR(64) NULL;
ALTER TABLE risks_v4 ADD COLUMN archetype_version_at_creation VARCHAR(32) NULL;
-- FKs frouxas (sem CASCADE — preservação histórica)
```

**Critério de aceite:** após migration, todo `INSERT INTO risks_v4` popula `archetype_version_at_creation` (read de `projects.archetypeVersion`).

**Prioridade:** 🟠 P2 (depende de Frente 8 e suporta Frentes 10/11).

---

### Frente 10 — UI/UX da matriz de riscos

**Estado atual (componentes empíricos):**

- `client/src/pages/MatrizRiscos.tsx` — página principal, gera via `trpc.riskMatrix.generate`, lista via `trpc.riskMatrix.list`
- `client/src/pages/RiskDashboardV4.tsx` — dashboard v4
  - `Breadcrumb4` (linhas 164-190): exibe 4 nós `[fonte, categoria, artigo, ruleId]`
  - `EvidencePanel` (linhas 194-229): renderiza até 2 evidências (acordeão expansível) — mostra `fonte`, `prioridade`, `confianca%`, `pergunta`, `resposta`
  - `RiskCard` (linhas 243-400): breadcrumb + evidence + status aprovação + RAG badge

**O que já existe:** evidência mostra pergunta e resposta como string. Há acordeão expansível.

**O que falta:**
1. **Seção "Origem"** — badge/accordion com "Pergunta #N (Solaris/IA Gen/Questionnaire)", "Resposta: X", "Gap detectado: Y"
2. **Seção "Gap"** — qual gap originou (depende de FK de Frente 9)
3. **Seção "Contexto Arquétipo"** — dimensões do perfil relevantes ao risco (objeto, papel, regime — as 2-3 dimensões que ativaram a regra)
4. **Botão "Explicar este risco"** — drawer com narrativa: "este risco apareceu porque você confirmou em [data] que sua empresa atua como [papel] em [objeto], e respondeu [resposta] na pergunta [N] do questionário [tipo]"

**Sugestão de implementação:**
- Reusar componente de drawer existente (se houver `BriefingDetailed*` ou `GapDetail*` — não confirmado empíricamente)
- Adicionar nova seção em `RiskCard` (linhas 243-400) com link para drawer
- Drawer chama nova procedure tRPC `risk.getTraceability(riskId)` que retorna estrutura completa

**Critério de aceite:** dado risco com `primary_question_id`, drawer "Explicar este risco" abre e mostra: pergunta original, resposta do usuário, gap derivado, dimensões do arquétipo relevantes, fundamento legal.

**Prioridade:** 🟠 P2 (depende de Frente 8/9).

---

### Frente 11 — Logs, auditoria e compliance

**Estado atual (factual):**

✅ **Auditoria de risco completa:**
- `insertAuditLog()` (db-queries-risks-v4.ts:575) persiste `auditLog` atomicamente
- `insertRiskV4WithAudit()` (linha 595) — risco + auditLog em transação
- `softDeleteRiskWithCascade()` (linha 650) — cascata + N+1 auditLog entries
- `restoreRiskWithCascade()` (linha 730) — restore + cascata + auditLog
- Schema audit_log (riscos v4): registra `entity_type` (risk|action_plan|task), `action` (created|updated|deleted|restored|approved), `before_state`/`after_state` JSON, `user_id`, `user_name`, `user_role`

✅ **Versionamento implementado (parcial):**
- `RULES_VERSION = "m1-v1.0.0"` + `RULES_HASH` (sha256) em `server/lib/archetype/perfilHash.ts:12-14`
- `archetypeVersion`, `archetypeRulesHash`, `archetypePerfilHash` (sha256) em `projects` schema
- `archetypeConfirmedAt`, `archetypeConfirmedBy` — write-once timestamps

❌ **Versionamento ausente:**
- `questionnaireVersion` — NÃO existe campo para registrar versão do questionário (SOLARIS/IA Gen/CNAE)
- `rag_corpus_version` — NÃO existe campo para registrar versão do corpus RAG usado
- `from_question_id` em `risks_v4` — NÃO existe (cobertura via Frente 8/9)

❌ **Causalidade ausente:**
- Tabela `solarisAnswers`/`iagenAnswers` não tem rastreamento `question_id → risk_id`
- Auditoria jurídica não consegue recuperar: "qual pergunta gerou este risco?"

**Lacunas vs requisito 98% confiabilidade jurídica:**

| Lacuna | Impacto jurídico |
|---|---|
| Sem `questionnaire_version` em respostas | Advogado não consegue auditar "qual versão do questionário SOLARIS gerou este risco?" |
| Sem `rag_corpus_version` ao gerar risco | Impossível validar "qual versão da jurisprudência suportou este risco?" |
| Sem `from_question_id` em `risks_v4` | Risco órfão — não há link para pergunta original (origem não rastreável) |
| Sem `archetype_version_at_creation` em `risks_v4` | Mudança de modelo arquétipo invalida riscos antigos sem histórico |

**Sugestão futura:** combinar com Frente 8/9. Migration `0089` adiciona 5 colunas em `risks_v4`:
- `primary_question_id`, `primary_gap_id`, `questionnaire_version`, `rag_corpus_version`, `archetype_version_at_creation`

E `auditLog` recebe campo JSON `causal_context` com mesmas 5 informações.

**Critério de aceite:** SQL `SELECT after_state FROM audit_log WHERE entity_type='risk' AND entity_id=X LIMIT 1` retorna JSON com `causal_context.from_question_id`, `causal_context.from_questionnaire_version`, `causal_context.rag_corpus_version`, `causal_context.archetype_version` populados.

**Prioridade:** 🟠 P2 (depende de Frente 9 — modelo de dados).

---

### Frente 12 — Testes E2E e critérios de aceite

**Estado atual (factual):**

**Suite E2E identificadas:** 16 specs em `tests/e2e/` (*.spec.ts), 176 casos de teste.

Principais:
- `tests/e2e/z17-pipeline-completo.spec.ts` (20 casos CT-01..20) — cobre Perfil → Quest → Gaps → Briefing → Riscos → Planos → Tarefas
- `tests/e2e/02-e2e-completo.spec.ts` (fluxo Onda1→2)
- `tests/e2e/risk-matrix-audit.spec.ts` (11 bugs UAT)

**Cobertura cadeia `Perfil → Questionário → Resposta → Gap → Risco`:**

| Etapa | Teste | Arquivo:linha | Cobertura |
|---|---|---|---|
| Perfil | CT-01 | z17:135 | ✅ Criar projeto com CNAEs confirmados |
| Quest SOLARIS (Onda 1) | CT-02 | z17:149 | ✅ Responder e concluir |
| Quest IA Gen (Onda 2) | CT-03 | z17:~200 | ✅ Gerar e responder adaptativas |
| Gaps | CT-04 | z17:~250 | ✅ `getAggregatedDiagnostic` calcula gaps |
| Riscos | CT-09..13 | z17:~300 | ✅ Matrizes geradas + RAG por área |
| **Rastreabilidade** | — | — | ❌ **Nenhum teste valida "este risco veio desta pergunta"** |

**Testes de determinismo M1:**
- ✅ `server/perfil-router.test.ts:50..100` valida `computePerfilHash` determinístico + sort-canonical + trim-insensitive (62 testes)
- ✅ `server/audit-e2e-fluxo-v3.test.ts` valida fluxo v3 com mock DB

**Lacunas críticas:**
1. ❌ Nenhum teste E2E valida "risco → pergunta original"
2. ❌ Sem testes para setores regulados (financeiro/combustível/agro/transportadora)
3. ❌ Sem teste de regressão ao atualizar versão de questionário/RAG
4. ❌ Sem teste de aplicabilidade (ex: transportadora não recebe risco IS)

**Cenários obrigatórios para cobertura mínima (98% confiabilidade):**

1. **Auditoria de origem:** E2E valida `question_id → gap_id → risk_id` (rastreabilidade causal)
2. **Versionamento questionário:** após adicionar `questionnaireVersion`, validar gravação em cada resposta
3. **Versionamento RAG:** após risco gerado, validar `rag_corpus_version` populado
4. **Setor agro:** fluxo completo CNAE agro + NCM específico → validar gaps setoriais + ausência de gaps inaplicáveis
5. **Setor financeiro:** fluxo `operationType="financeiro"` → validar risco BCB + ausência de risco IS
6. **Transportadora combustível:** fluxo `papel="transportador"` + `objeto="combustivel"` → validar **0 riscos categoria IS**
7. **Regressão pós-versioning:** atualizar RAG/questionário, E2E valida riscos anteriores mantêm mesma origem
8. **Soft delete com auditoria:** deletion de risco registra motivo + cascata + auditLog

**Formato mínimo de auditoria jurídica aceitável (validado por teste):**

```sql
SELECT after_state FROM audit_log WHERE entity_type='risk' AND entity_id='X' LIMIT 1;
-- Esperado:
-- { "from_question_id": 123, 
--   "from_questionnaire_version": "v2.1.0",
--   "from_gap_id": 456,
--   "rag_corpus_version": "2.509-chunks-v3",
--   "archetype_version": "m1-v1.0.0" }
```

**Critério de aceite por teste:** cada teste novo deve **assertar empíricamente** o caminho causal completo, não apenas existência do risco.

**Prioridade:** 🟠 P2 (depende de Frente 8/9/11 — sem modelo de dados de rastreabilidade, testes não têm o que assertar).

---

## 6. Priorização recomendada

```
🔴 P1 — Sprint M3 RAG (próxima sprint, marco principal P2 do BACKLOG_M3)
   ├─ Frente 1 (M3-Q-IAGEN)
   ├─ Frente 3 (M3-Q-NCM)
   ├─ Frente 4 (M3-Q-NBS)
   ├─ Frente 6 (M3-GAP-01)
   ├─ Frente 7 (M3-RISK-01)
   └─ Frente 8 (M3-TRACE-01) — modelo mínimo Opção C

🟠 P2 — Sprint M3+1 ou M3+2 (após base limpa do P1)
   ├─ Frente 2 (M3-Q-CNAE) — depende de Frente 1/3/4
   ├─ Frente 5 (M3-Q-ORCHESTRATOR) — refactor que extrai padrão comum
   ├─ Frente 9 (M3-TRACE-02) — migration adicional
   ├─ Frente 10 (M3-UI-01) — drawer rastreabilidade
   ├─ Frente 11 (M3-AUDIT-01) — versioning causal
   └─ Frente 12 (M3-TEST-01) — E2E setoriais + assertion rastreabilidade

🟡 P3 — Backlog
   └─ Frente 12.4-7 (cenários adicionais regressão)
```

---

## 7. Dependências entre futuras issues

```
M3-TRACE-01 (Frente 8 — FKs em risks_v4)
   ├─ pré-requisito de M3-RISK-01 (risco precisa saber qual pergunta originou)
   ├─ pré-requisito de M3-UI-01 (drawer precisa de FK navegável)
   └─ pré-requisito de M3-AUDIT-01 (auditoria causal precisa de origem rastreável)

M3-Q-IAGEN, M3-Q-NCM, M3-Q-NBS (Frentes 1/3/4)
   └─ podem rodar EM PARALELO (independentes entre si)
   └─ pré-requisito de M3-Q-CNAE (Frente 2 — usa padrão estabelecido)
   └─ pré-requisito de M3-Q-ORCHESTRATOR (Frente 5 — extrai padrão comum)

M3-GAP-01 (Frente 6) ──┐
                       ├─→ deve vir antes de M3-RISK-01 (Frente 7)
M3-Q-* (Frentes 1/3/4) ┘    porque risco depende de gap correto

M3-AUDIT-01 (Frente 11) ──→ M3-TEST-01 (Frente 12 — E2E precisa assertar audit_log)
```

**Sequência sugerida:**

```
Semana 1:  M3-TRACE-01 (FKs base)
Semana 1:  M3-Q-IAGEN + M3-Q-NCM + M3-Q-NBS (3 paralelos)
Semana 2:  M3-GAP-01 (depende de Q-* concluídos)
Semana 2:  M3-RISK-01 (depende de M3-GAP-01)
Semana 3:  M3-Q-CNAE + M3-UI-01 + M3-AUDIT-01 (3 paralelos)
Semana 4:  M3-Q-ORCHESTRATOR + M3-TRACE-02 + M3-TEST-01 (refactor + cobertura)
```

---

## 8. Riscos de implementação

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| `rules_hash` muda quando engine começa a ler `archetype` | 🟠 Média | 🔴 Alto (quebra reprodutibilidade histórica) | Snapshot tests de behavior em PRs do tipo PR-J Fase 2a/2b validam byte-a-byte |
| Onda 2 LLM regredir qualidade ao receber 6 dimensões | 🟠 Média | 🟠 Médio | A/B comparativo de prompt; aprovação P.O. via diff de output |
| Migration de FK em `risks_v4` quebrar dados existentes | 🟡 Baixa | 🔴 Alto | Migration com NULL default; backfill em job separado; gates DRY-RUN |
| 5 fontes de questionário desacopladas → refactor grande | 🟠 Média | 🟠 Médio | Frente 5 (orquestrador) é P2 — fazer 1/3/4 individualmente primeiro |
| Aplicabilidade apriori vs gate aposteriori (risco não-gerado vs downgraded) | 🟡 Baixa | 🟡 Baixo | Manter `isCategoryAllowed()` como segunda camada de segurança |
| UI drawer "Explicar risco" exigir mudança grande | 🟡 Baixa | 🟢 Baixo | Reusar componente existente (BriefingDetailed se houver); MVP com modal simples |
| Issue #873 (CI prod isolation) bloqueia testes E2E | 🟠 Média | 🟠 Médio | Frente 12 depende de Issue #873 (não rodar E2E reais sem TEST DB) |
| Drift entre `auditLog` (legado) vs `audit_log` v4 | 🟢 Baixa | 🟡 Baixo | Documentar qual é fonte da verdade pré M3-AUDIT-01 |

---

## 9. Proposta de fatiamento em issues

### Issue M3-TRACE-01 — FKs de rastreabilidade em `risks_v4` (Classe A)

**Escopo:** migration adicionando colunas opcionais (`primary_question_id`, `primary_gap_id`) — Opção C do diagnóstico Frente 8.
**Esforço:** ~2h Classe A.
**Pré-requisitos:** nenhum.
**Habilita:** M3-RISK-01, M3-UI-01, M3-AUDIT-01.

### Issue M3-Q-IAGEN — Onda 2 LLM consome arquétipo (Classe B)

**Escopo:** `generateOnda2Questions` aceita parâmetro `archetype: PerfilDimensional | undefined`. Prompt LLM inclui as 6 dimensões quando presentes. Fallback para legado quando ausente.
**Esforço:** ~4h Classe B.
**Pré-requisitos:** nenhum (independente).
**Validação:** snapshot de prompt para 4 perfis (transportador, distribuidor, fabricante, prestador). A/B contra prompt atual com aprovação P.O.

### Issue M3-Q-NCM — Q.Produto consome `papel_na_cadeia` + `objeto` (Classe B)

**Escopo:** `generateProductQuestions` aceita arquétipo. Diferencia produtor/importador/distribuidor/varejista.
**Esforço:** ~4h Classe B.
**Pré-requisitos:** nenhum.
**Validação:** dado `papel="importador"`, perguntas geradas incluem ao menos 1 sobre drawback/RECOF.

### Issue M3-Q-NBS — Q.Serviço consome `subnatureza_setorial` + `orgao_regulador` (Classe B)

**Escopo:** `generateServiceQuestions` aceita arquétipo. Diferencia setor regulado (BCB/ANS/ANATEL/ANTT/ANEEL) vs serviço comum.
**Esforço:** ~4h Classe B.
**Pré-requisitos:** nenhum.
**Validação:** dado `subnatureza="transporte_carga"` + NBS 1.0501.10.00, perguntas incluem RNTRC ou tabela de fretes.

### Issue M3-GAP-01 — Gap engine recebe arquétipo (Classe B)

**Escopo:** `gapEngine` lê `projects.archetype`. Adiciona etapa de filtragem de aplicabilidade antes da classificação. Gaps inaplicáveis ao papel/objeto NÃO são gerados.
**Esforço:** ~4h Classe B.
**Pré-requisitos:** Frentes 1/3/4 entregues (gaps nascem de respostas que vêm dos questionários atualizados).
**Validação:** dado `papel="transportador"`, gap engine não gera gaps `domain="imposto_seletivo"`.

### Issue M3-RISK-01 — Risk engine consome arquétipo (Classe B)

**Escopo:** `riskEngine` lê `projects.archetype`. Aplicabilidade APRIORI por dimensão (não downgrade aposteriori). Substitui `isCategoryAllowed()` baseado em `operationType` por validação dimensional.
**Esforço:** ~6h Classe B.
**Pré-requisitos:** M3-TRACE-01 (FK `primary_gap_id`) + M3-GAP-01.
**Validação:** dado `papel="transportador"` + gap "IS não recolhido", risk engine retorna 0 riscos categoria `imposto_seletivo`.

### Issue M3-Q-CNAE — Q.CNAE diferencia setores regulados (Classe B)

**Escopo:** seções 3-5 do `QuestionarioCNAE.tsx` viram condicionais por `subnatureza_setorial`.
**Esforço:** ~4h Classe B (frontend).
**Pré-requisitos:** padrão estabelecido em M3-Q-IAGEN/NCM/NBS.
**Validação:** dado `subnatureza="financeiro"`, QCNAE-04 exibe seção dedicada BCB com 5+ perguntas.

### Issue M3-Q-ORCHESTRATOR — interface comum `QuestionGeneratorInput` (Classe B refactor)

**Escopo:** extrair tipo + utility comum dos 4 geradores. Cada gerador implementa interface. Eliminar duplicação `inferCompanyType` vs perfil.ts.
**Esforço:** ~5h Classe B.
**Pré-requisitos:** Frentes 1/2/3/4 individuais entregues.
**Validação:** todos os 4 geradores recebem `archetype` via interface comum; testes existentes passam byte-a-byte.

### Issue M3-TRACE-02 — versioning causal em audit_log (Classe A)

**Escopo:** migration adicionando `questionnaire_version`, `rag_corpus_version`, `archetype_version_at_creation` em `risks_v4` + populate em `insertRiskV4WithAudit`.
**Esforço:** ~3h Classe A.
**Pré-requisitos:** M3-TRACE-01.
**Validação:** SQL `SELECT * FROM risks_v4 WHERE id=X` retorna 5 colunas de versioning populadas.

### Issue M3-UI-01 — drawer "Explicar este risco" (Classe B frontend)

**Escopo:** componente novo `RiskExplanationDrawer` em `client/src/components/`. Botão em `RiskCard`. Procedure tRPC `risk.getTraceability(riskId)`.
**Esforço:** ~6h Classe B.
**Pré-requisitos:** M3-TRACE-01.
**Validação:** dado risco com `primary_question_id`, drawer abre e mostra pergunta + resposta + gap + dimensões + fundamento.

### Issue M3-AUDIT-01 — auditoria causal completa (Classe A)

**Escopo:** `insertAuditLog` recebe `causal_context` JSON com 5 campos. Validação no schema Zod.
**Esforço:** ~2h Classe A.
**Pré-requisitos:** M3-TRACE-01, M3-TRACE-02.
**Validação:** SQL `SELECT after_state FROM audit_log` retorna `causal_context` populado para todo risco criado pós-deploy.

### Issue M3-TEST-01 — E2E setoriais + assertion rastreabilidade (Classe B)

**Escopo:** 4 specs novas em `tests/e2e/`:
- `setor-financeiro-rastreabilidade.spec.ts`
- `setor-transportadora-combustivel.spec.ts`
- `setor-agro-rastreabilidade.spec.ts`
- `regressao-pos-versioning.spec.ts`

Cada spec valida cadeia `pergunta → resposta → gap → risco` empíricamente via `audit_log`.
**Esforço:** ~6h Classe B.
**Pré-requisitos:** M3-AUDIT-01 + Issue #873 (CI prod isolation) ou `CI_HAS_TEST_DB=true`.
**Validação:** suite `pnpm test:e2e` executa 4 specs novas com 100% PASS.

---

## 10. Critérios de aceite por issue

Resumo executável (assertion empírica por issue):

| Issue | Comando de validação | Resultado esperado |
|---|---|---|
| M3-TRACE-01 | `\d risks_v4` (PostgreSQL) ou `SHOW COLUMNS FROM risks_v4` (MySQL) | Colunas `primary_question_id` e `primary_gap_id` presentes (NULL default) |
| M3-Q-IAGEN | snapshot test do prompt LLM com `archetype.papel="transportador"` | Prompt contém literal "transportador" (não apenas "servicos") |
| M3-Q-NCM | criar projeto `papel="importador"` + NCM 8517.62.59 + chamar `generateProductQuestions` | Output inclui ≥1 pergunta sobre drawback ou RECOF |
| M3-Q-NBS | criar projeto `subnatureza="transporte_carga"` + NBS 1.0501.10.00 | Output inclui ≥1 pergunta sobre RNTRC ou tabela de fretes |
| M3-GAP-01 | criar projeto `papel="transportador"` + responder questionário | `SELECT * FROM project_gaps_v3 WHERE project_id=X AND domain='imposto_seletivo'` retorna 0 rows |
| M3-RISK-01 | mesmo cenário + `riskEngine.generate` | `SELECT * FROM risks_v4 WHERE project_id=X AND categoria='imposto_seletivo'` retorna 0 rows |
| M3-Q-CNAE | abrir `/projetos/:id/questionario-cnae` com `subnatureza="financeiro"` | Seção QCNAE-04 mostra título "Regulação BCB" |
| M3-Q-ORCHESTRATOR | grep `inferCompanyType\|TAX_REGIME_ALIASES\|POSICAO_ALIASES` em todos os geradores | Cada constante existe em UM ÚNICO local importado por todos |
| M3-TRACE-02 | `INSERT INTO risks_v4 ...` via `insertRiskV4WithAudit` | Colunas de versioning populadas |
| M3-UI-01 | clique em "Explicar este risco" no `RiskCard` | Drawer abre e mostra pergunta + resposta + gap + 3 dimensões + fundamento |
| M3-AUDIT-01 | `SELECT after_state->>'causal_context' FROM audit_log WHERE entity_type='risk'` | JSON com 5 campos populados |
| M3-TEST-01 | `pnpm test:e2e tests/e2e/setor-*.spec.ts` | 4 specs PASS, cada uma assertando cadeia causal completa |

---

## 11. Anexo — Notas metodológicas

**Como este diagnóstico foi produzido:**

1. **Branch:** `diagnostic/arquetipo-questionarios-gaps-riscos` (zero código modificado)
2. **HEAD:** `c1234d4` (pós-merge #899)
3. **Método:** 4 agentes Explore em paralelo, cada um cobrindo 2-5 frentes via grep/Read empírico
4. **Restrições atendidas:**
   - ✅ Não implementar código
   - ✅ Não criar migration
   - ✅ Não alterar RAG
   - ✅ Não alterar engine
   - ✅ Não criar issues (apenas propor)
   - ✅ Não abrir PR de feature (apenas docs-only)
   - ✅ Citar arquivos e funções com linha quando possível
   - ✅ Separar fato (com citação), hipótese (sem confirmação) e recomendação

**Itens marcados como "não confirmado" e como validar:**

| Item | Validação sugerida |
|---|---|
| Existência de tabela `project_gaps_v3` (vs estrutura v4) | `grep -n "project_gaps_v3\|risks_v4" drizzle/schema.ts` |
| Componentes de referência tipo `BriefingDetailed*` | `find client/src -name "*Detail*" -o -name "*Drawer*"` |
| Pipeline de retroalimentação archetype → engines (M3 documentado em algum lugar?) | `grep -rn "archetype" docs/governance/ docs/specs/` |

**Fontes oficiais citadas no diagnóstico:**

- `docs/produto/PERFIL-DA-ENTIDADE-FONTE-DA-VERDADE.md` (canônico, PR #899)
- `docs/epic-830-rag-arquetipo/adr/ADR-0031-modelo-dimensional.md`
- `docs/epic-830-rag-arquetipo/adr/ADR-0032-imutabilidade-versionamento.md`
- `docs/governance/audits/v7.60-2026-04-28-bundle-m1-corpus-gate.md` §7.1 (achado empírico do desacoplamento M1↔RAG)
- `docs/governance/BACKLOG_M3.md` Prioridade 2 (M3-RAG-01..04 — marco principal)

**Próximo passo recomendado:**

P.O. revisa este diagnóstico → seleciona quais issues abrir (sugestão: as 6 issues P1) → despacha criação no GitHub Project Board.
