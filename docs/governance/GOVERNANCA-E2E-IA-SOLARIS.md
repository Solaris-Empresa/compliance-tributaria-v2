# GOVERNANCA E2E — IA SOLARIS
## Visao do Product Owner (P.O.)
**Versao:** v2.3 · 14/04/2026 | **HEAD:** `564ada8` | **Baseline:** v6.2
**Repo:** [Solaris-Empresa/compliance-tributaria-v2](https://github.com/Solaris-Empresa/compliance-tributaria-v2)

> Todos os numeros neste documento foram validados contra o codigo-fonte em 14/04/2026.
> Discrepancias encontradas durante a validacao estao marcadas com [VALIDADO] ou [CORRIGIDO].

---

# 0. PRINCIPIO CENTRAL

> **Meta do produto: 98% de confiabilidade juridica**

A governanca da IA SOLARIS garante que:
- nenhuma decisao critica dependa exclusivamente de LLM
- toda classificacao seja rastreavel
- todo risco tenha base legal auditavel
- o sistema seja deterministico no core
- a evolucao seja controlada (sem regressao semantica)

### Regra de ouro

```
Erro aceitavel:  "nao classificado"
Erro inaceitavel: "classificado errado"
```

> A IA SOLARIS nao substitui o raciocinio juridico.
> Ela estrutura, acelera e garante consistencia na analise.

### Disclaimer juridico obrigatorio

> **AVISO LEGAL:** Este sistema e uma ferramenta de apoio a decisao tributaria.
> Os resultados gerados (riscos, oportunidades, planos de acao) NAO constituem
> parecer juridico. Toda classificacao deve ser validada por profissional
> habilitado antes de qualquer acao fiscal ou contabil. A severidade dos riscos
> e deterministica (baseada em tabela, nao em LLM), mas a aplicabilidade ao
> caso concreto depende de analise humana qualificada.

---

# 1. PIPELINE E2E — VISAO COMPLETA

```
EMPRESA (input)
  |
  v
FORMULARIO (5 JSONs: companyProfile, operationProfile,
            confirmedCnaes, product_answers, taxRegime)
  |
  v
ONDAS DE COLETA
  |-- Onda 1: SOLARIS (22 perguntas deterministicas)  [VALIDADO: onda1Injector.ts]
  |-- Onda 2: IA GEN (LLM, temperature 0.2)           [VALIDADO: llm.ts L299]
  |-- Onda 3: REGULATORIA (RAG + normative rules)     [VALIDADO: engine-gap-analyzer.ts]
  |
  v
ANALISE DE GAPS (por categoria, modelo pessimista)     [VALIDADO: gapEngine.ts]
  |
  v
ACL — Anti-Corruption Layer (gap → regra normativa)    [VALIDADO: gap-to-rule-mapper.ts]
  |-- 1 candidato → mapped
  |-- 2+ candidatos → ambiguous
  |-- 0 candidatos → unmapped
  |
  v
ENGINE DE RISCOS (100% deterministico, zero LLM)       [VALIDADO: risk-engine-v4.ts]
  |-- consolidateRisks (agrupa por risk_key)
  |-- inferNormativeRisks (NCM + CNAE → oportunidades)
  |-- merge + dedup
  |-- enrichWithRag (validacao, timeout 3s)
  |
  v
RISKS_V4 (output auditavel)                           [VALIDADO: db-queries-risks-v4.ts]
  |-- [fonte → categoria → artigo → ruleId]
  |-- severidade/urgencia da tabela (nunca LLM)
  |-- evidencias consolidadas
  |-- RAG validated/not validated
  |
  v
PLANOS DE ACAO → TAREFAS → UAT P.O.
```

---

# 2. CAMADAS DE GOVERNANCA DO PIPELINE

## CAMADA 1 — INPUT (dados da empresa)

| Dimensao | Detalhe |
|---|---|
| **Por que** | Dados incompletos → perguntas genericas → diagnostico fraco → risco juridico |
| **Como** | Validacao Zod, obrigatoriedade de campos, dual-schema EN/PT |
| **Resultado** | Perfil completo: tipo operacao, CNAEs, NCMs, regime tributario |
| **Como medir** | `extractProjectProfile()` retorna todos os campos nao-null |
| **Quando** | Fase 1 do assessment (antes de qualquer questionario) |
| **Onde no fluxo** | ENTRADA — alimenta todas as ondas seguintes |

**Referencia:** [DATA_DICTIONARY.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/DATA_DICTIONARY.md) (60 campos, 8 tabelas)

**Pontos de atencao:**
- [ ] `operationProfile` tem 5 campos EN (`operationType`, `multiState`, `clientType`, `paymentMethods`, `hasIntermediaries`) e 5 fallbacks PT — extractor aceita ambos [VALIDADO: project-profile-extractor.ts L160–193]
- [ ] `product_answers` usa snake_case (`ncm`), nao camelCase [VALIDADO: DATA_DICTIONARY.md L24]
- [ ] Driver TiDB pode retornar JSON como objeto ja parseado — usar `safeParseObject()` [VALIDADO: project-profile-extractor.ts L83–98]

---

## CAMADA 2 — COLETA (3 Ondas)

### Onda 1 — SOLARIS (deterministica)

| Dimensao | Detalhe |
|---|---|
| **Por que** | Base confiavel — perguntas curadas por especialista, nao LLM |
| **Como** | CSV curado → banco (`solaris_questions`) → injecao no pipeline, filtro por CNAE |
| **Resultado** | 22 perguntas deterministicas com categoria e referencia normativa |
| **Como medir** | Todas tem `risk_category_code` + `source_reference` nao-null |
| **Quando** | Primeira etapa da coleta |
| **Onde no fluxo** | Entrada do questionario — injetadas ANTES de Onda 2 e 3 |

**Arquivo:** `server/routers/onda1Injector.ts` [VALIDADO: fonte="solaris", L84]
**Perguntas ativas:** 22 (SOL-015..036, ativas) — SOL-001..014 soft-deleted (legado) [VALIDADO: ESTADO-ATUAL.md L84]

**Pontos de atencao:**
- [ ] Perguntas SOLARIS sao a base confiavel — nunca depender apenas de Onda 2
- [ ] Novas perguntas precisam de `risk_category_code` valido na tabela `risk_categories`

---

### Onda 2 — IA Generativa (assistida por LLM)

| Dimensao | Detalhe |
|---|---|
| **Por que** | Expandir cobertura alem das 24 perguntas SOLARIS usando perfil da empresa |
| **Como** | LLM (temperature 0.2) + validacao pos-LLM (score >= 3.5) + dedup semantico (0.92) |
| **Resultado** | Perguntas complementares categorizadas, rastreavies, sem duplicata com Onda 1 |
| **Como medir** | `used_profile_fields >= 2`, `category_assignment_mode` registrado, score >= 3.5 |
| **Quando** | Segunda etapa (apos Onda 1, antes de Onda 3) |
| **Onde no fluxo** | Expansao do questionario |

**Arquivo:** `server/routers/questionEngine.ts`
**Temperature:** 0.2 [VALIDADO: server/_core/llm.ts L299]

**Rastreabilidade:** `category_assignment_mode`, `prompt_version`, `used_profile_fields`, `source_type: "iagen"`

**Pontos de atencao:**
- [ ] Score < 3.5 → retry 2x → `NO_QUESTION` (descartada)
- [ ] Pergunta sem `source_reference` = bloqueada (Content Engine Rule #1)
- [ ] LLM nao cria conhecimento novo — transforma conhecimento validado via RAG

---

### Onda 3 — Regulatoria (RAG + Decision Kernel)

| Dimensao | Detalhe |
|---|---|
| **Por que** | Cobertura normativa completa — nenhum requisito legal sem avaliacao |
| **Como** | Leitura deterministica do banco (zero LLM) + Decision Kernel NCM/NBS |
| **Resultado** | Gaps com `source_reference = "{lei} Art. {artigo}"` |
| **Como medir** | NCM: confianca 100%. NBS: max 98% (`clampConfiancaNbs`). Decision Kernel: 48/48 testes |
| **Quando** | Terceira etapa (apos Ondas 1 e 2) |
| **Onde no fluxo** | Ultima coleta — garante cobertura normativa |

**Arquivos:** `engine-gap-analyzer.ts`, `normative-inference.ts`, `ncm-engine.ts`, `nbs-engine.ts`
**Origem:** `regulatory_requirements_v3` + `normative_product_rules` (20 regras) [VALIDADO: ESTADO-ATUAL.md L32]
**Decision Kernel:** 37/38 casos confirmados, 1 pending (1.0906.11.00 corretagem) [VALIDADO]

**Pontos de atencao:**
- [ ] `pending_validation` e PULADO (nao gera gap) — obrigatorio
- [ ] Fire-and-forget: DELETE `source='engine'` atomico antes de INSERT

---

## CAMADA 3 — ANALISE DE GAPS

| Dimensao | Detalhe |
|---|---|
| **Por que** | Sem gaps classificados, nao ha como gerar riscos |
| **Como** | Modelo pessimista: qualquer `nao_atendido` → risco elevado. Confidence obrigatoria (ADR-010) |
| **Resultado** | Cada gap: ausencia / parcial / inadequado com confianca numerica |
| **Como medir** | `evaluation_confidence` 0.0–1.0 + `evaluation_confidence_reason` nao-vazia |
| **Quando** | Apos coleta das 3 ondas |
| **Onde no fluxo** | CENTRO — transforma respostas em evidencias acionaveis |

**Arquivos:** `gapEngine.ts`, `analyze-gaps-questionnaires.ts`

**Cadeia inviolavel (ADR-010):** `Requisito → Gap → Risco → Acao`
- Risco sem `gap_id` nao existe
- Acao sem `risk_id` nao existe
- Cobertura < 100% bloqueia geracao de briefing

---

## CAMADA 4 — ACL (Anti-Corruption Layer)

| Dimensao | Detalhe |
|---|---|
| **Por que** | Gaps operacionais (linguagem do cliente) precisam virar regras normativas (linguagem da lei) sem perder precisao |
| **Como** | Mapeamento estrito: 1→mapped, 2+→ambiguous, 0→unmapped. Zero heuristica |
| **Resultado** | Gap vinculado a regra normativa ou marcado para revisao manual |
| **Como medir** | Taxa mapped vs ambiguous vs unmapped. Ambiguous > 10% = revisar categorias |
| **Quando** | Apos gaps, antes do engine |
| **Onde no fluxo** | PONTE entre mundo operacional e normativo — ponto critico |

**Arquivo:** `gap-to-rule-mapper.ts` (ADR-0026) [VALIDADO]

**Proibicoes absolutas:** Inferencia por dominio, score probabilistico, "best match", fallback silencioso.

---

## CAMADA 5 — ENGINE DE RISCOS (deterministico)

| Dimensao | Detalhe |
|---|---|
| **Por que** | Severidade de risco tributario NAO pode depender de LLM — consequencias juridicas reais |
| **Como** | Tabela `risk_categories` define tudo. Engine consolida, infere, enriquece |
| **Resultado** | Riscos deterministicos com breadcrumb 4 nos |
| **Como medir** | Mesmo input → mesmo output. Severidade vem da tabela, nunca calculada |
| **Quando** | Apos ACL |
| **Onde no fluxo** | CORE — classificacao juridica acontece aqui |

**Arquivo:** `risk-engine-v4.ts` (ADR-0022) [VALIDADO: 430 LOC]

**SEVERITY_TABLE (10 categorias)** [VALIDADO: risk-engine-v4.ts L70–81]:

| Categoria | Severidade | Urgencia |
|---|---|---|
| imposto_seletivo | alta | imediata |
| confissao_automatica | alta | imediata |
| split_payment | alta | imediata |
| inscricao_cadastral | alta | imediata |
| regime_diferenciado | media | curto_prazo |
| transicao_iss_ibs | media | medio_prazo |
| obrigacao_acessoria | media | curto_prazo |
| aliquota_zero | oportunidade | curto_prazo |
| aliquota_reduzida | oportunidade | curto_prazo |
| credito_presumido | oportunidade | curto_prazo |

**SOURCE_RANK** [VALIDADO: risk-engine-v4.ts L83–88]:
cnae=1 > ncm=2 > nbs=3 > solaris=4 > iagen=5

**Regras inviolaveis:**
- `inscricao_cadastral` = **alta** (nunca media)
- `oportunidade` retorna `[]` de planos de acao
- Breadcrumb sempre 4 nos: `[fonte, categoria, artigo, ruleId]`

---

## CAMADA 6 — RAG (validacao pos-engine)

| Dimensao | Detalhe |
|---|---|
| **Por que** | Validar que o risco tem base legal real, nao apenas categoria generica |
| **Como** | Busca FULLTEXT/LIKE em 2.515 chunks, blending de confianca |
| **Resultado** | Risco enriquecido com artigo exato, trecho da lei, confianca ajustada |
| **Como medir** | `rag_validated=1` + `rag_artigo_exato` preenchido. Gold Set: 8/8 verde |
| **Quando** | Apos engine, antes de persistir |
| **Onde no fluxo** | ULTIMA validacao — "selo de qualidade" juridica |

**Arquivo:** `rag-risk-validator.ts` [VALIDADO]
**Corpus:** 2.515 chunks, 10 leis + 3 CGIBS [VALIDADO: ESTADO-ATUAL.md L12]
**Timeout:** 3s (resiliencia — risco gerado sem RAG se demorar)
**Sem match:** confianca reduz 25%, `rag_validated=0` (nao deleta o risco)

---

## CAMADA 7 — OUTPUT (risks_v4)

| Dimensao | Detalhe |
|---|---|
| **Por que** | Advogado precisa saber de onde veio cada risco e qual lei fundamenta |
| **Como** | Breadcrumb 4 nos + evidence + RAG validation + audit log |
| **Resultado** | Risco auditavel e reversivel com base legal |
| **Como medir** | Breadcrumb completo + >=1 evidencia + artigo especifico |
| **Quando** | Output final do pipeline |
| **Onde no fluxo** | SAIDA — o que o usuario ve e o advogado audita |

**Exemplo de breadcrumb:** `[solaris → confissao_automatica → Art.45 LC214 → GAP-CA-SOL013]`

**Garantias:** Rastreavel, auditavel, deterministico, reversivel (soft delete + restore), aprovavel (audit log).

### Frontend — Gaps conhecidos (Discovery 13/04/2026)

O [UX_DICTIONARY.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/UX_DICTIONARY.md) documenta o estado real de cada tela. Principais gaps:

| Componente | Gap | Status |
|---|---|---|
| RiskDashboardV4 (1020L) | `upsertActionPlan` nao chamada | **RESOLVIDO** PR #526 — botao "+ Plano" + NewPlanModal |
| RiskDashboardV4 | `bulkApprove` nao existe | pendente (Issue #4b) |
| RiskDashboardV4 | SummaryBar ausente | **RESOLVIDO** PR #527 — 4 cards sticky |
| RiskDashboardV4 | HistoryTab sem audit log | **RESOLVIDO** PR #527 — audit log via getProjectAuditLog |
| RiskDashboardV4 | RAG validation badge parcial | pendente |
| ActionPlanPage (818L) | Criar plano ausente | **RESOLVIDO** PR #526 — botao "+ Novo plano" |
| ActionPlanPage | Editar plano ausente | pendente (Issue #3) |
| ActionPlanPage | Filtro por status ausente | pendente |

---

# 3. GOVERNANCA DO LLM

> **LLM NAO decide o risco. LLM apenas ajuda a descobrir onde olhar.**

| Controle | Objetivo | Arquivo | Validado? |
|---|---|---|---|
| Temperature 0.2 | Evitar variabilidade | `llm.ts` L299 | SIM |
| Schema Zod | Evitar resposta livre | `ai-schemas.ts` | SIM |
| Validacao pos-output | Evitar erro estrutural | `questionEngine.ts` | SIM |
| Categorias do banco | Evitar drift semantico | `risk_categories` | SIM |
| LLM-as-judge >= 3.5 | Evitar pergunta fraca | `questionEngine.ts` | SIM |
| NO_QUESTION protocol | Bloquear sem fonte | ADR-010 Rule #1 | SIM |
| RAG-only knowledge | Anti-alucinacao | ADR-010 Rule #4 | SIM |

---

# 4. GOVERNANCA DE CORRECOES ESTRUTURAIS

> "Uma correcao estrutural so esta concluida quando a recorrencia deixa de ser provavel."

Pacote implantado em 24/03/2026 (Sprint Prefill Contract). **Todos os artefatos validados em 14/04/2026:**

| Etapa | Artefato | Existe? | Link |
|---|---|---|---|
| 1 | Issue Template (10 campos) | SIM | `.github/ISSUE_TEMPLATE/structural-fix.md` |
| 2 | PR Template (10 secoes) | SIM | `.github/PULL_REQUEST_TEMPLATE/structural-pr.md` |
| 3 | Evidence Pack Template | SIM | [evidence-pack-template.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/evidence-pack-template.md) |
| 4 | CI Bloqueante | SIM | `.github/workflows/structural-fix-gate.yml` |
| 5 | Labels e Board | SIM | [labels-and-board.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/labels-and-board.md) |
| 6 | Changeset Disciplinado | SIM | [changeset-discipline.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/changeset-discipline.md) |
| 7 | Invariant Registry (8) | SIM | [invariant-registry.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/invariant-registry.md) |
| 8 | Suite PCT | SIM (117 testes) | `server/prefill-contract.test.ts` |
| 9 | Evidence Pack canonico | SIM | `docs/evidence-packs/2026-03-24-prefill-contract-sprint.md` |

### 8 Invariants do produto [VALIDADO: invariant-registry.md]

| ID | Invariant | Severidade | Testes |
|---|---|---|---|
| INV-001 | `campo_coletado → nunca_reaparece_vazio` | CRITICO | 17 testes PCT |
| INV-002 | `api_nunca_entrega_string_json` | CRITICO | 8 testes PCT |
| INV-003 | `builder_canonico_e_fonte_unica` | ALTO | testes PCT |
| INV-004 | `campo_sem_fonte → undefined` | ALTO | testes PCT |
| INV-005 | `pergunta_sem_fonte → invalida` | ALTO | revisao manual |
| INV-006 | `risco_sem_origem → invalido` | ALTO | a implementar |
| INV-007 | `acao_sem_evidence → invalida` | MEDIO | a implementar |
| INV-008 | `briefing_sem_coverage_100 → invalido` | CRITICO | a implementar |

### Riscos mitigados

| Risco | Mecanismo | Resultado |
|---|---|---|
| Issue sem diagnostico | Issue Template 10 campos | ~0% passam |
| Correcao sem testes | CI `required-files-check` | merge bloqueado |
| Regressao nao detectada | Suite PCT 117 testes + CI | deteccao automatica |
| Evidencia perdida | Evidence Pack obrigatorio | ~0% sem rastreabilidade |
| Sem aprovacao orquestrador | Label `orchestrator-gate` | CRITICO/ALTO bloqueados |
| Invariant violado | Registry + PCT | 4/8 automaticos, 4/8 planejados |
| Changeset confuso | 4 commits atomicos | rollback independente |

**Referencia completa:** [governance-final-report.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/governance-final-report.md)

---

# 5. GATES DE GOVERNANCA (STOP/GO)

| Gate | Quando | Criterio | Quem | Referencia |
|---|---|---|---|---|
| **Gate 0** (banco) | Antes de codar algo que toca DB | Campo no [DATA_DICTIONARY](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/DATA_DICTIONARY.md) | Manus + CC | CLAUDE.md L122 |
| **Gate UX** (frontend) | Antes de codar componente | Tela no [UX_DICTIONARY](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/UX_DICTIONARY.md) | CC + P.O. | CLAUDE.md L137 |
| **Gate A** (dados) | Antes de questionario | 5 JSONs preenchidos | sistema | automatico |
| **Gate B** (schema) | Antes de deploy | Migrations + FKs validas | Manus | manual |
| **Gate Spec** (5 labels) | Antes de implementar | 5 labels spec-* na issue + conteudo verificado | CC + CI | CLAUDE.md bloqueio + validate-pr.yml |
| **Gate C** (codigo) | Antes de merge | tsc 0 + testes PASS | CC | CI |
| **Gate D** (backend) | Apos pipeline | `risks_v4 > 0` | CC | manual |
| **Gate E** (UAT) | Apos deploy | 4 provas mensuraveis (ver abaixo) | P.O. | checklist |
| **Gate 7** (final) | Antes de fechar sprint | Todos os gates PASS | todos | padrao |

### Gate E — 4 Provas mensuraveis (UAT P.O.)

| Prova | Criterio PASS | Criterio FAIL |
|---|---|---|
| PROVA 1: Quantidade de riscos | 10 <= total <= 40 | total = 0 ou total > 60 |
| PROVA 2: Inferencia normativa | `aliquota_zero` + `credito_presumido` presentes | aba oportunidades vazia |
| PROVA 3: Titulos juridicos | Sem `"[categoria]"` e sem `"geral"` nos titulos | qualquer titulo com colchetes ou "geral" |
| PROVA 4: RAG validation | >= 50% riscos com `rag_validated=1` | 0% validados |

---

# 6. MODELO DE ORQUESTRACAO v1.1

**Documento completo:** [MODELO-ORQUESTRACAO-V2.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/MODELO-ORQUESTRACAO-V2.md)
**Aprovado:** 14/04/2026 | Validado: Claude Code + Consultor ChatGPT (12 ajustes incorporados)

### Fases (atualizado v1.1 — PR #518)

| Fase | Responsavel | O que faz | Gate |
|---|---|---|---|
| **0.0 SYNC** | Manus | `git fetch && git reset --hard origin/main` | R-SYNC-01 |
| F0 Discovery | Manus + CC | SHOW FULL COLUMNS + ux-spec-validator | Gate 0, Gate UX |
| F1 Planejamento | Orquestrador | Draft issues no GitHub + Milestone + Sprint Log | — |
| F2 Producao issues | Todos | 8 blocos obrigatorios, em lotes por dependencia | — |
| F3 Auditoria | CC (front) / Manus (banco) | Checklist binario 8 items | — |
| F4 Aprovacao | P.O. (P0) / Orq (P1/P2) | Spec congelada, label `spec-aprovada` | — |
| F4 Implementacao | CC + Manus | `gh issue view [N]` obrigatorio, 1 issue = 1 PR | Gate C |
| F4.5 Checkpoint | CC | 100% procedures chamadas, CI WARN | Gate D |
| F5 Gate C | CI | tsc + testes + issue vinculada + label | automatico |
| F6 Gate final | Todos | UAT P.O. com checklist da issue | Gate 7 |
| F7 Deploy+Smoke | Manus + CC | 4 provas Gate E em projeto de referencia | Gate E |

### 11 regras [VALIDADO: MODELO-ORQUESTRACAO-V2.md + CLAUDE.md]

| Regra | Descricao |
|---|---|
| ORQ-01 | Nenhuma implementacao sem issue completa (8 blocos) |
| ORQ-02 | Spec hibrida: resumo inline OBRIGATORIO + link arquivo |
| ORQ-03 | Auditoria assimetrica com checklist binario |
| ORQ-04 | Claude Code implementa frontend/logica |
| ORQ-05 | Manus valida banco/ambiente |
| ORQ-06 | UAT so apos batch completo |
| ORQ-07 | R-SYNC-01 obrigatorio (passo 0.0 — antes de tudo) |
| ORQ-08 | `gh issue view [N]` obrigatorio como primeiro comando |
| ORQ-09 | Gate UX obrigatorio antes de frontend |
| ORQ-10 | F4.5 Integration Checkpoint obrigatorio |
| ORQ-11 | Fast-track hotfix P0: Gate 0 minimo → `[HOTFIX]` PR → P.O. direto |

### CI/CD Enforcement (novo em v1.1)

| Workflow | Tipo | O que faz |
|---|---|---|
| `validate-pr.yml` | FAIL (bloqueia) | Issue vinculada + label spec-aprovada + tsc + testes |
| `project-automation.yml` | Automatico | PR aberto → label in-progress, PR mergeado → label done |
| `structural-fix-gate.yml` | FAIL (bloqueia) | Evidence pack + testes + referencia issue (issues estruturais) |

### Issue Template (8 blocos — `.github/ISSUE_TEMPLATE/sprint-issue.md`)

| Bloco | Conteudo | Quem preenche |
|---|---|---|
| 1. Contexto | O que, por que, aceite minimo | Orquestrador |
| 2. UX Spec | Resumo inline + link arquivo | Orquestrador |
| 3. Skeleton | Delta: o que muda (nao estrutura toda) | Claude Code |
| 4. Schema banco | SHOW FULL COLUMNS real | Manus |
| 5. Contrato API | Procedure existe? chamada? acao? | Claude Code |
| 6. Estado atual | Gerado via grep (nao estimado) | Claude Code |
| 7. Criterios aceite | Binarios (pass/fail) + plano testes | Orquestrador |
| 8. Armadilhas | O que parece certo mas esta errado (opcional) | Todos |
| 9. Refs codigo | Zod schema real + linha insercao + tipos TS (se componente >200L) | Claude Code |
| ADR | Decisao arquitetural ou "N/A" com justificativa | Orquestrador |
| Contrato | Input/output/erro da procedure | Claude Code |
| Fluxo E2E | Passo a passo usuario ate banco | Orquestrador + CC |

### 5 Labels obrigatorias (Gate Spec — PR #529)

| Label | Significado | Quem aplica |
|---|---|---|
| `spec-bloco9` | Bloco 9 preenchido com dados do codigo | Auditor (F3) |
| `spec-adr` | ADR criado ou N/A documentado | Auditor (F3) |
| `spec-contrato` | Contrato input/output/erro | Auditor (F3) |
| `spec-e2e` | Fluxo E2E completo | Auditor (F3) |
| `spec-aprovada` | P.O. aprovou (ULTIMA — so apos as 4 anteriores) | P.O. (F4) |

**CI Enforcement:** `validate-pr.yml` bloqueia merge se qualquer label ausente.
**Claude Code Enforcement:** CLAUDE.md bloqueio obrigatorio — para antes de criar branch.

### Sprint Log (`docs/governance/SPRINT-ZXX-LOG.md`)

Novo artefato para persistir decisoes entre sessoes do Orquestrador:
- Decisoes tomadas por sessao (APROVACAO/BLOQUEIO/AJUSTE/AMENDMENT)
- Status das issues por lote
- Pendencias para proxima sessao
- **Template:** [SPRINT-LOG-TEMPLATE.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/SPRINT-LOG-TEMPLATE.md)
- **Z-14:** [SPRINT-Z14-LOG.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/SPRINT-Z14-LOG.md)

### Matriz de responsabilidade

| Area | Manus | Claude Code | P.O. |
|---|---|---|---|
| Banco / SQL / Migrations | PRINCIPAL | suporte | — |
| Deploy / Ambiente | PRINCIPAL | — | — |
| Frontend React / TS | — | PRINCIPAL | valida |
| Engine / logica | — | PRINCIPAL | — |
| Testes unitarios | — | PRINCIPAL | — |
| Auditoria codigo | — | PRINCIPAL | — |
| Auditoria banco | PRINCIPAL | suporte | — |
| Aprovacao spec P0 / UAT | — | suporte | PRINCIPAL |
| Aprovacao spec P1/P2 | Orquestrador | Orquestrador | so em desacordo |

---

# 7. PAPEIS NA GOVERNANCA

| Papel | Responsabilidade | Ferramenta |
|---|---|---|
| **P.O. (Uires)** | Decisoes arquiteturais, aprovacao spec, UAT final | GitHub Issues |
| **Orquestrador (Claude Browser)** | Planejamento sprints, issues, despacho | SKILL.md |
| **Manus** | Banco, migrations, deploy, validacao ambiente | sandbox Manus |
| **Claude Code** | Frontend, logica, testes, auditoria codigo | Claude Code CLI |
| **Consultor (ChatGPT)** | Arquitetura, segunda opiniao | consulta |
| **Dr. Rodrigues** | Validacao juridica | parecer |

---

# 8. CONTENT ENGINE RULES (98% Confidence)

5 regras inviolaveis [VALIDADO: CLAUDE.md L80–88]:

1. **Fonte obrigatoria:** Toda pergunta: `source_type` + `source_reference` + `requirement_id` + `confidence`. Sem fonte = bloqueio.
2. **Cobertura 100%:** Nenhum requisito sem pergunta/resposta/gap. Cobertura < 100% bloqueia briefing.
3. **Cadeia inviolavel:** `Requisito → Gap → Risco → Acao`. Risco sem gap nao existe. Acao sem risco nao existe.
4. **Anti-alucinacao:** LLM nao cria conhecimento — transforma via RAG. Toda afirmacao com base normativa.
5. **CNAE condicional:** CNAE sem requisitos no RAG → `skipped` com `no_applicable_requirements`.

---

# 9. DEBITOS TECNICOS CONTROLADOS

| Item | Status | Impacto | Sprint alvo |
|---|---|---|---|
| fallback KEYWORD_TO_TOPIC | ativo | Baixo — fallback funcional | proximo |
| `requirement_id = category` | temporario | Medio — proxy, nao FK real | proximo |
| Sem weighting de evidencia | ativo | Baixo — todas as fontes peso igual | futuro |
| `upsertActionPlan` nao chamada | gap | Alto — nao e possivel criar plano novo pela UI | proximo |
| `bulkApprove` nao existe | ausente | Medio — aprovar 1 a 1 e viavel mas lento | proximo |
| `HistoryTab` sem audit log | gap | Baixo — aba existe, conteudo ausente | proximo |
| Kanban tarefas | ausente | Baixo — lista simples funcional | futuro |
| INV-006/007/008 sem testes | planejado | Alto — invariants sem deteccao automatica | proximo |
| RAG `transicao_iss_ibs` termo generico | ativo | Medio — "prestacao de servicos" retorna 34 hits inespecificos | proximo |
| RISK-TECH-01: LIKE vs FULLTEXT TiDB | aberto | Medio — falsos negativos possiveis no RAG | futuro |
| Dual-schema `operationProfile` EN/PT | ativo | Baixo — funciona mas complica manutencao | normalizar em Z-14 |

**Referencia tecnica:** [RISK-TECH-01.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/risks/RISK-TECH-01.md)

---

# 10. SPRINTS QUE CONSTRUIRAM ESTA ARQUITETURA

| Sprint | Entrega principal | PRs | Status |
|---|---|---|---|
| Z-07 | Risk Engine v4 deterministico + RiskDashboardV4 + ActionPlanPage | #427, #429 | ENCERRADA |
| Z-08 | Fix JSON.parse + pool.promise + conexao engine ao pipeline | #434, #435 | ENCERRADA |
| Z-09 | `risk_categories` configuravel + RAG sensor + ADR-0025 | #436–#443 | ENCERRADA |
| Z-10 | ACL Gap→Risk (ADR-0026) + mapper deterministico + PROTOCOLO-DEBUG | #448–#453 | ENCERRADA |
| Z-11 | CNAE skip + briefing guard + status transition | #467–#468 | ENCERRADA |
| Z-12 | Migrations 0072–0074 + hot swap ADR-0022 + R-SYNC-01 + RAG Lote D | #469–#483 | ENCERRADA |
| Z-13 | 8 bugs corrigidos (is_active, gap_type, JOIN, risk_category_code) + RAG CGIBS | #485–#499 | ENCERRADA |
| Z-13.5 | `generateRisksV4Pipeline` + `consolidateRisks` + `inferNormativeRisks` + `enrichRiskWithRag` + Gate 0 + Gate UX + Modelo Orquestracao v2 | #502–#516 | ENCERRADA |
| Z-14 (Lote A) | upsertActionPlan UI (#520) + SummaryBar + HistoryTab (#521) + Bloco 9 + Gate 0 dupla + 5 labels spec enforcement | #518–#529 | **EM ANDAMENTO** |

### Sprint Z-13.5 — Detalhamento (sessao 13–14/abr/2026)

**Engine novo (PRs #502–#505):**
- `generateRisksV4Pipeline()` — orquestra todo o fluxo: consolidate → infer → merge → enrich
- `consolidateRisks()` — N gaps da mesma categoria → 1 risco com evidencias agregadas
- `inferNormativeRisks()` — infere oportunidades (aliquota_zero, credito_presumido) a partir do perfil
- `enrichRiskWithRag()` — valida cada risco contra o corpus legal (timeout 3s)
- `normative_product_rules` — 20 regras NCM para cesta basica

**Bugs corrigidos (PRs #506–#509):**

| Bug | Causa raiz | Fix |
|---|---|---|
| B-Z13.5-001 | `safeParseObject`/`safeParseArray` nao lidavam com JSON pre-parseado pelo driver TiDB | Aceitar `unknown`, verificar tipo antes de `JSON.parse` |
| B-Z13.5-002 | 5 campos com nomes em PT (`tipoOperacao`) vs nomes reais em EN (`operationType`) | Dual-schema com fallback EN → PT |

**Governanca (PRs #510–#516):**
- DATA_DICTIONARY.md: 60 campos em 8 tabelas
- UX_DICTIONARY.md: 33 funcionalidades em 2 telas
- db-schema-validator + ux-spec-validator (2 agentes)
- Gate 0 (banco) + Gate UX (frontend) no CLAUDE.md
- MODELO-ORQUESTRACAO-V2.md: F0–F5, 10 regras
- SKILL.md atualizado (confirmado 14/abr)
- Post-mortem + auditoria final: 6/6 bugs prevenidos

### Bugs historicos — aprendizado consolidado

| Bug | Sprint | Causa raiz | Protecao implementada |
|---|---|---|---|
| B-Z13-001 | Z-13 | `is_active` → campo real e `active` (tinyint) | DATA_DICTIONARY: "NAO is_active" |
| B-Z13-003 | Z-13 | Mesmo erro em `normative_product_rules` | DATA_DICTIONARY: "NAO is_active" |
| B-Z13-004 | Z-13 | `risk_category_code` nao propagado para gap | DATA_DICTIONARY: campo documentado |
| B-Z13.5-001 | Z-13.5 | Driver TiDB retorna JSON como objeto, nao string | DATA_DICTIONARY: secao aviso driver |
| B-Z13.5-002 | Z-13.5 | `tipoOperacao` vs `operationType` (5 campos) | DATA_DICTIONARY: dual-schema EN/PT |
| Z-07 retrabalho | Z-07 | Spec UX nao incluida no prompt de implementacao | Gate UX + REGRA-ORQ-08 (`gh issue view`) |

**Todos os 6 bugs teriam sido prevenidos pela governanca atual.** Detalhes: [AUDITORIA-GOVERNANCA-FINAL.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/AUDITORIA-GOVERNANCA-FINAL.md)

---

# 11. METRICAS ATUAIS [TODAS VALIDADAS 14/04/2026]

| Indicador | Valor | Fonte de validacao |
|---|---|---|
| HEAD | `564ada8` | `git rev-parse --short HEAD` |
| Baseline | v6.2 | ESTADO-ATUAL.md |
| TypeScript | 0 erros | `npx tsc --noEmit` |
| Testes unitarios | 124/124 | `npx vitest run server/lib/` |
| Suite PCT | 117/117 | `npx vitest run server/prefill-contract.test.ts` |
| Decision Kernel | 48/48 testes | `npx vitest run server/lib/decision-kernel/` |
| Corpus RAG | 2.515 chunks | ESTADO-ATUAL.md |
| RAG Gold Set | 8/8 verde | ESTADO-ATUAL.md |
| Risk categories | 10 ativas | SEVERITY_TABLE risk-engine-v4.ts |
| Perguntas SOLARIS | 22 ativas (SOL-015..036) | ESTADO-ATUAL.md |
| Migrations | 86 | `ls drizzle/*.sql \| wc -l` |
| PRs mergeados | 529 | `gh pr list --state merged` |
| Campos banco documentados | 60 | DATA_DICTIONARY.md |
| Funcionalidades UX mapeadas | 33 | UX_DICTIONARY.md |
| Regras orquestracao | 11 (ORQ-01..11) | MODELO-ORQUESTRACAO-V2.md v1.1 |
| Labels spec-* | 5 (bloco9, adr, contrato, e2e, aprovada) | CI enforcement |
| CI Workflows | 17 ativos | `.github/workflows/` |
| Issue Templates | 5 (sprint-issue com 12 blocos) | `.github/ISSUE_TEMPLATE/` |
| Sprint Z-14 | **Lote A DONE** (#520 + #521) — Lote B pendente | SPRINT-Z14-LOG.md |
| Invariants formalizados | 8 | invariant-registry.md |
| Agentes automatizados | 2 | .claude/agents/ |
| SKILL.md | 170 linhas, atualizado 14/abr | Manus report + `grep REGRA-ORQ-08 SKILL.md` confirmado |
| Bugs historicos prevenidos | 6/6 | AUDITORIA-GOVERNANCA-FINAL.md |
| Temperature LLM | 0.2 | llm.ts L299 |

---

# 12. RASTREABILIDADE DOS ARTEFATOS

## Processo e modelo

| Arquivo | Link |
|---|---|
| MODELO-ORQUESTRACAO-V2.md (v1.1) | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/MODELO-ORQUESTRACAO-V2.md) |
| SPRINT-LOG-TEMPLATE.md | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/SPRINT-LOG-TEMPLATE.md) |
| SPRINT-Z14-LOG.md | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/SPRINT-Z14-LOG.md) |
| CLAUDE.md (Gates + regras) | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/CLAUDE.md) |
| HANDOFF-IMPLEMENTADOR.md | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/HANDOFF-IMPLEMENTADOR.md) |
| CONTEXTO-ORQUESTRADOR.md | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/CONTEXTO-ORQUESTRADOR.md) |

## Dicionarios

| Arquivo | Link |
|---|---|
| DATA_DICTIONARY.md (60 campos) | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/DATA_DICTIONARY.md) |
| UX_DICTIONARY.md (33 funcionalidades) | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/UX_DICTIONARY.md) |

## Agentes

| Arquivo | Link |
|---|---|
| db-schema-validator.md | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/.claude/agents/db-schema-validator.md) |
| ux-spec-validator.md | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/.claude/agents/ux-spec-validator.md) |

## Auditorias e post-mortems

| Arquivo | Link |
|---|---|
| AUDITORIA-GOVERNANCA-FINAL.md | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/AUDITORIA-GOVERNANCA-FINAL.md) |
| POST-MORTEM-Z13.5-SESSAO-CLAUDE-CODE.md | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/POST-MORTEM-Z13.5-SESSAO-CLAUDE-CODE.md) |
| GOVERNANCA-SESSAO-13ABR2026.md | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/GOVERNANCA-SESSAO-13ABR2026.md) |
| governance-final-report.md | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/governance-final-report.md) |

## Qualidade e protocolos

| Arquivo | Link |
|---|---|
| RAG-QUALITY-GATE.md | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/RAG-QUALITY-GATE.md) |
| PROTOCOLO-DEBUG.md | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/PROTOCOLO-DEBUG.md) |
| RASTREABILIDADE-COMPLETA.md | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/RASTREABILIDADE-COMPLETA.md) |
| invariant-registry.md | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/invariant-registry.md) |

## CI/CD (novo em v1.1)

| Arquivo | Link |
|---|---|
| validate-pr.yml | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/.github/workflows/validate-pr.yml) |
| project-automation.yml | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/.github/workflows/project-automation.yml) |
| sprint-issue.md (template) | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/.github/ISSUE_TEMPLATE/sprint-issue.md) |
| PULL_REQUEST_TEMPLATE.md | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/.github/PULL_REQUEST_TEMPLATE.md) |
| evidence-pack-template.md | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/evidence-pack-template.md) |

## ADRs

| ADR | Link |
|---|---|
| ADR-010 Content Architecture 98% | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/adr/ADR-010-content-architecture-98.md) |
| ADR-0022 Hot Swap Risk Engine v4 | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/adr/ADR-0022-hot-swap-risk-engine-v4.md) |
| ADR-0025 Risk Categories Configurable | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/adr/ADR-0025-risk-categories-configurable-rag-sensor.md) |
| ADR-0026 Anti-Corruption Layer | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/adr/ADR-0026-anti-corruption-layer-gap-risk.md) |
| ADR-INDEX | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/adr/ADR-INDEX.md) |

## Contratos Decision Kernel

| Contrato | Link |
|---|---|
| CNT-01a (NCM) | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/contracts/CNT-01a.md) |
| CNT-01b (NBS) | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/contracts/CNT-01b.md) |
| CNT-01c (Bloco E) | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/contracts/CNT-01c.md) |
| CNT-02 (Dataset) | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/contracts/CNT-02.md) |
| CNT-03 (Output) | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/contracts/CNT-03.md) |

## RAG

| Arquivo | Link |
|---|---|
| CORPUS-BASELINE.md | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/rag/CORPUS-BASELINE.md) |
| HANDOFF-RAG.md | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/rag/HANDOFF-RAG.md) |
| RAG-GOVERNANCE.md | [abrir](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/rag/RAG-GOVERNANCE.md) |

---

# 13. CHECKLIST MASTER — P.O.

Use antes de aprovar qualquer sprint:

### Dados
- [ ] 5 JSONs preenchidos para o projeto de teste
- [ ] `operationProfile` com campos EN confirmados (Gate 0)

### Pipeline
- [ ] Onda 1 gera perguntas SOLARIS para os CNAEs
- [ ] Onda 2 gera perguntas complementares (score >= 3.5)
- [ ] Onda 3 gera gaps de engine para NCMs/NBSs
- [ ] Gaps classificados (ausencia/parcial/inadequado)
- [ ] ACL mapeou gaps → regras (verificar fila de ambiguos)

### Engine
- [ ] `risks_v4` gerados (> 0 riscos)
- [ ] Titulos sem "geral" (tipo de operacao real)
- [ ] Breadcrumb 4 nos em cada risco
- [ ] Oportunidades presentes (aliquota_zero, credito_presumido)
- [ ] RAG validation executada

### Frontend
- [ ] Risk Dashboard carrega sem erro
- [ ] Filtros funcionam
- [ ] Aprovacao/exclusao/restauracao OK
- [ ] Action Plan com banner sticky
- [ ] Audit log registrando

### Governanca
- [ ] Gate 0 executado
- [ ] Gate UX executado
- [ ] tsc 0 erros
- [ ] Testes passando
- [ ] Issues com spec congelada

---

**Total de artefatos rastreados: 53+** (30 governanca + 2 agentes + 4 CI/CD + 5 labels + 6 ADRs + 5 contratos + 5 RAG + Sprint Logs)
**Todos com link direto para o GitHub e validados contra o codigo-fonte.**
