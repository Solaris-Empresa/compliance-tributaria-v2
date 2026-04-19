# SPEC — Suite de Testes: Matriz de Riscos v4

## IA SOLARIS · Compliance Tributário v2
## Versão 1.1 · 2026-04-18 · Audiência: P.O. · Orquestrador · Claude Code · Manus
## Baseline: `docs/governance/MATRIZ_RISCOS_SNAPSHOT_2026-04-18.md` (1628 linhas)
## Changelog v1.0 → v1.1: aplicadas C1-C7 + decisões P1-P5 (crítica Manus 2026-04-18)

---

## Contexto

A Matriz de Riscos v4 é o artefato central de compliance do produto
IA SOLARIS. A meta declarada pelo P.O. (DEC-06 do snapshot) é **98%
de confiabilidade jurídica antes da liberação para advogados**.

Esta spec define uma suite de testes **em 4 baterias iterativas**,
com correções entre cada bateria, seguida de teste manual com caso
real fornecido pelos advogados.

**Princípio da suite:**
- Manus roda testes **em background**
- Manus alimenta o relatório de progresso **durante** a execução
  (não após) — P.O. acompanha em tempo real
- Cada bateria produz achados → correções → próxima bateria
- Sem pressa: trabalho minucioso, 98% é o piso

---

## Bloco 1 — Fluxo declarado (ORQ-13)

**Step:** N/A — trilha de qualidade paralela ao fluxo de produto
**Upstream:** Snapshot aprovado (`MATRIZ_RISCOS_SNAPSHOT_2026-04-18.md`)
  + baseline do projeto 930001 documentada em §9 do snapshot
**Downstream:** Liberação para UAT com advogados (teste manual P.O.
  com caso real) → GO/NO-GO para produção

**Integrações obrigatórias (triggers automáticos):**
- TiDB Cloud (`DATABASE_URL`) — leitura de `risks_v4`, `risk_categories`,
  `project_gaps_v3`, `solaris_answers`, `iagen_answers`, `audit_log`
- Corpus RAG (`ragDocuments`) — validação de `rag_validated`
- audit_log — testes NÃO devem gerar lixo de auditoria em produção
  (usar projeto dedicado de testes destrutivos)

---

## Bloco 2 — UX Spec

**ISENÇÃO ORQ-16 (explicitada por bateria — C5):**

- **B1-B3:** isenção aplica — sem componentes UI novos. Suite usa
  `data-testid` existentes (listados em Bloco 9). Nenhum mockup
  necessário.
- **B4:** testa UI existente via Playwright (fluxo completo com caso
  real do advogado) — sem criar componentes novos. Isenção
  mantida: nenhum mockup de UI novo é requerido em nenhuma bateria.

O único artefato visual produzido pela spec é o **relatório de
progresso** (`progress.md`), cujo formato é definido no Bloco 5.

Novos `data-testid` para E2E listados no Bloco 9 são para elementos
já existentes no código — confirmar via grep antes da implementação.

---

## Bloco 3 — Skeleton (arquivos a criar ou modificar)

### 3.1 Arquivos NOVOS (9)

| # | Arquivo | Propósito |
|---|---|---|
| 1 | `server/lib/risk-engine-v4.afericao.test.ts` | Unit — complementa `risk-engine-v4.test.ts` com 10 critérios do snapshot §13.5 |
| 2 | `server/lib/compliance-score-v4.test.ts` | Unit — atualmente AUSENTE, testa fórmula + thresholds |
| 3 | `server/lib/normative-inference.test.ts` | Unit — atualmente AUSENTE, testa CNAES_ALIMENTAR/ATACADISTA + regras NCM |
| 4 | `server/lib/generate-risks-pipeline.integration.test.ts` | Integração — pipeline completo com DB real |
| 5 | `scripts/audit-risk-matrix.mjs` | Aferição evidence-based do projeto 930001 |
| 6 | `scripts/categoria-drift-check.mjs` | Drift-check DB × código × RN |
| 7 | `tests/e2e/risk-matrix-audit.spec.ts` | E2E — cobertura dos 21 bugs UAT Gate E |
| 8 | `tests/e2e/consolidacao-v4.spec.ts` | E2E — ausente, cobre fluxo Step 7 |
| 9 | `tests/e2e/soft-delete-cascade.spec.ts` | E2E — cascata risco → planos → tarefas |

### 3.2 Arquivos MODIFICADOS (3)

| # | Arquivo | Mudança |
|---|---|---|
| 10 | `package.json` | Adicionar scripts: `test:battery-1`, `test:battery-2`, `test:battery-3`, `test:battery-4`, `test:battery-full`, `test:afericao`, `test:drift` |
| 11 | `vitest.config.ts` | Custom reporter para alimentar `progress.md` em tempo real |
| 12 | `.gitignore` | Adicionar `reports/` (relatórios locais não commitados) |

### 3.3 Arquivos de governança (2)

| # | Arquivo | Propósito |
|---|---|---|
| 13 | `docs/governance/TEST_PROGRESS_TEMPLATE.md` | Template do `progress.md` |
| 14 | `docs/governance/CASO_REAL_UAT_CHECKLIST.md` | Checklist para teste manual pós-bateria 4 |

### 3.4 Projeto de testes destrutivos (C6 + P5)

Criado pelo Manus via `trpc.createProject` **antes de G1.1** (pré-requisito
da Bateria 1). Perfil padronizado — paralelo estrutural ao 930001:

```
name:               "test_z20_destructive"
cnpj:               "00.000.000/0001-99"   (fake válido)
companyType:        ltda
companySize:        media
taxRegime:          lucro_real
annualRevenueRange: 4800000-78000000
confirmedCnaes:     ["4639-7/01"]           (atacadista alimentar)
operationProfile.tipoOperacao:  comercio
operationProfile.tipoCliente:   b2b
operationProfile.multiestadual: false
```

**Por que esse perfil:**
- Mesmo perfil do 930001 permite comparação determinística de outputs
- CNAE 4639-7/01 aciona `CNAES_ALIMENTAR` **e** `CNAES_ATACADISTA`
  (inferência Onda 3B gera 2 riscos inferidos)
- `multiestadual=false` evita variação de `risk_key` entre baterias

**ID atribuído dinamicamente** — spec lê de variável de ambiente
`E2E_DESTRUCTIVE_PROJECT_ID` (exposta pelo Orquestrador após a
criação). Nunca hardcoded.

**Limpeza entre baterias:** DELETE lógico do projeto ao final de
cada bateria via SQL (permitido em projeto de testes dedicado).
Projeto é recriado no início da próxima bateria com mesmo perfil.

### 3.5 Estrutura de diretórios criada

```
reports/                          (novo, .gitignored)
├── battery-1/
│   ├── progress.md               (alimentado em tempo real)
│   ├── final.md                  (commitado ao final da bateria)
│   ├── unit-coverage.json
│   ├── integration-evidence.json
│   ├── afericao-930001.md
│   └── e2e-screenshots/
├── battery-2/ ...
├── battery-3/ ...
└── battery-4/ ...

scripts/
├── audit-risk-matrix.mjs         (novo)
├── categoria-drift-check.mjs     (novo)
└── run-battery.mjs               (orquestrador shell — novo)
```

---

## Bloco 4 — Schema

**Nenhuma mudança de banco.** Todos os testes leem estado atual.

**Tabelas lidas (read-only):**
- `risks_v4` · `risk_categories` · `project_gaps_v3`
- `solaris_answers` · `solaris_questions`
- `iagen_answers`
- `regulatory_requirements_v3`
- `ragDocuments`
- `action_plans` · `tasks` · `audit_log`
- `projects` (para `scoringData` e `profileCompleteness`)

**Projeto de referência:** `930001` (leitura)
**Projeto de testes destrutivos:** a definir pelo Orquestrador
  (criar via `trpc.createProject` com `test_` no nome)

---

## Bloco 5 — Contrato de saída

### 5.1 Formato do `progress.md` (alimentado em tempo real pelo Manus)

```markdown
# Bateria N — Progresso em tempo real

**Iniciada em:** 2026-04-XX HH:MM:SS
**Branch:** test/z20-bateria-N
**Executor:** Manus (background task)
**Status:** running | passed_partial | failed | completed

## 1. Unit tests (engine puro)

| Teste | Status | Timestamp | Evidência |
|---|---|---|---|
| engine.SEVERITY_TABLE.10_categorias | ✅ PASS | 14:23:01 | — |
| engine.SOURCE_RANK.ordem | ✅ PASS | 14:23:02 | — |
| engine.classifyRisk.inscricao_cadastral_alta | ⏳ RUNNING | 14:23:03 | — |
| engine.classifyRisk.tributacao_servicos_ausente | ❌ FAIL | 14:23:04 | TypeError: enum mismatch |
| ... | | | |

**Subtotal Unit:** X PASS · Y FAIL · Z PENDING

## 2. Integration tests (DB + pipeline)
...

## 3. Aferição 930001 (10 critérios §13.5 snapshot)

| # | Critério | Status | Evidência |
|---|---|---|---|
| 1 | Todo risco tem origem (rule_id NOT NULL) | ✅ PASS | 10/10 |
| 2 | Toda categoria veio de ≥1 onda | ⏳ RUNNING | — |
| ... | | | |

## 4. Regression E2E (21 bugs UAT Gate E)

| Bug | CT | Status | Screenshot |
|---|---|---|---|
| B-01 | Geração automática pós-briefing | ✅ PASS | — |
| B-06 | Summary bar 4 cards | ❌ FAIL | battery-1/e2e-screenshots/B-06-fail.png |
| ... | | | |

## 5. Drift check (categoria-drift-check.mjs)

| Diff | Fonte A | Fonte B | Diff detectado |
|---|---|---|---|
| DB × código | 10 rows DB | 10 entries SEVERITY_TABLE | (listar divergências) |
| RN × código | 11 menções | 10 entries | `tributacao_servicos` órfã |
| ... | | | |

## Resumo

- **Total:** X PASS · Y FAIL · Z PENDING
- **Gaps encontrados:** N
- **Pronto para próxima bateria:** SIM / NÃO
- **Recomendação:** (texto automático baseado nos thresholds do Bloco 7)

---
*Atualizado automaticamente a cada teste. Última linha adicionada em: TIMESTAMP*
```

### 5.2 Formato do `final.md` (commitado ao final da bateria)

Mesmo conteúdo do `progress.md` final, mais:
- Diff entre baterias (o que melhorou, o que regrediu)
- Lista priorizada de correções recomendadas
- Estimativa de esforço por correção

### 5.3 Tempo real — regra de alimentação

**Manus DEVE:**
1. Escrever cada resultado de teste **dentro de 2 segundos** da conclusão
2. Nunca buffer em memória sem flush — um crash não pode perder progresso
3. Usar append, não rewrite — escrever nova linha ao final
4. Commitar `progress.md` a cada 10 testes OU a cada 5 minutos (o que vier primeiro)
5. Ao final: renomear `progress.md` → `progress-final.md` e criar `final.md` curado

**P.O. DEVE conseguir:**
- Abrir `reports/battery-N/progress.md` a qualquer momento e ver estado corrente
- Ver timestamp da última atualização (ao final do arquivo)
- Não esperar bateria terminar para começar a discussão sobre correções

---

## Bloco 6 — Estado atual (comandos a executar antes)

```bash
# Confirma branch e HEAD
git fetch origin && git log origin/main --oneline -1

# Confirma que snapshot foi mergeado (pré-requisito)
ls docs/governance/MATRIZ_RISCOS_SNAPSHOT_2026-04-18.md

# Confirma arquivos de teste já existentes (para não duplicar)
ls server/lib/risk-engine-v4.test.ts
ls server/lib/rag-risk-validator.test.ts
ls server/routers/scoringEngine.test.ts
ls tests/e2e/z14-risk-action-plan.spec.ts
ls tests/e2e/z17-pipeline-completo.spec.ts

# Confirma pendências documentadas
grep -n "ausente" docs/governance/MATRIZ_RISCOS_SNAPSHOT_2026-04-18.md | head -5

# DB connection sanity
echo "SELECT COUNT(*) FROM risks_v4 WHERE project_id=930001;" | # execute via Manus
```

**Esperado:**
- HEAD em `main` contendo o snapshot mergeado
- 3 testes unit existem (risk-engine-v4, rag-risk-validator, scoringEngine)
- 4 testes E2E existem (z14, z17, action-plan-ui-refinements, hub-hotswap)
- Pendências §21.3 confirmam: compliance-score-v4, normative-inference, consolidacao-v4, soft-delete → **ausentes**

---

## Bloco 7 — Critérios de aceite (por bateria)

### Gate G0 — smoke-test do reporter (C3) — antes de qualquer bateria

**Pré-condição absoluta.** Antes de G1.1 da Bateria 1.

**Arquivo:** `scripts/smoke-test-reporter.sh`

**Executa 3 testes sintéticos que validam o reporter em tempo real:**

1. **Append simples:** 1 processo escreve 10 linhas em `progress.md`
   com delay de 500ms entre cada. Verificação: cada linha aparece
   em tempo real (delta < 2s entre escrita e leitura).
2. **Lock de arquivo (concorrência):** 2 processos paralelos escrevem
   5 linhas cada simultaneamente. Verificação: arquivo final tem
   10 linhas sem corrupção, sem interleaving partial.
3. **Flush sem buffer:** kill -9 do processo após 3 escritas.
   Verificação: as 3 linhas estão no disco (não perdidas em buffer).

**Critério G0:** PASS em todos os 3 testes antes de qualquer bateria.

**Ação se G0 FAIL:**
- Reporter está quebrado — abortar bateria
- Corrigir `vitest.config.ts` custom reporter
- Reexecutar G0 até PASS

**Por que G0 vem antes de G1.1:** se o reporter não funciona, o P.O.
não consegue acompanhar a bateria em tempo real. A falha de infraestrutura
de observabilidade precede qualquer falha de teste de negócio.

---

### Bateria 1 — Baseline (primeira passada)

**Objetivo:** fotografar o estado real vs esperado. Vai falhar muito —
esse é o ponto.

**Gates:**
- [ ] G1.1: Todos os 9 arquivos novos compilam sem erro
- [ ] G1.2: Unit tests executam (pass/fail registrado para todos)
- [ ] G1.3: Integration tests executam com DATABASE_URL válido
- [ ] G1.4: Aferição 930001 produz 10 linhas (mesmo que todas FAIL)
- [ ] G1.5: E2E executa 21 CTs (mesmo que falhem)
- [ ] G1.6: `progress.md` alimentado em tempo real (evidência: diff
  entre 2 leituras com intervalo de 1 min mostra linhas adicionadas)
- [ ] G1.7: `final.md` gerado e commitado

**Mínimo aceitável para avançar:**
- ≥ 50% dos unit tests PASS
- ≥ 30% dos integration tests PASS
- ≥ 5/10 critérios de aferição PASS
- ≥ 10/21 bugs UAT verificados (mesmo que 5 permaneçam abertos)

**Ação se gates falharem:**
- Se G1.1 FAIL: correções de sintaxe/imports antes de qualquer bateria
- Se G1.6 FAIL: reescrever reporter do vitest — tempo real é inegociável

---

### Bateria 2 — Pós-primeiras correções

**Pré-condição:** Orquestrador despachou correções dos gaps da Bateria 1.

**Gates:**
- [ ] G2.1: Todos os gaps prioritários (P0) da Bateria 1 corrigidos
- [ ] G2.2: ≥ 80% unit tests PASS
- [ ] G2.3: ≥ 70% integration tests PASS
- [ ] G2.4: ≥ 8/10 critérios de aferição PASS
- [ ] G2.5: ≥ 17/21 bugs UAT verificados como resolvidos
- [ ] G2.6: Drift check: zero divergências críticas entre DB × código
- [ ] G2.7: `progress.md` mostra que todos os testes rodaram

**Mínimo aceitável para avançar:**
- Todos acima simultaneamente

---

### Bateria 3 — Estabilização

**Pré-condição:** Orquestrador despachou correções da Bateria 2.

**Gates:**
- [ ] G3.1: 100% unit tests PASS
- [ ] G3.2: 100% integration tests PASS
- [ ] G3.3: 10/10 critérios de aferição PASS
- [ ] G3.4: 21/21 bugs UAT verificados (ver exceção abaixo)
- [ ] G3.5: Zero flaky tests em 3 execuções consecutivas (critério
  anti-intermitência)
- [ ] G3.6: Drift check: zero divergências (DB × código × RN
  alinhados após PRs de governança P1)
- [ ] G3.7: Exposição ao Risco de Compliance visível no RiskDashboardV4 (DEC-01)

**EXCEÇÃO B3 (C7) — "blocked-by-product-decision":**

Bugs marcados com label `blocked-by-product-decision` **NÃO contam**
no denominador do 100%. Regras da exceção:

- Cada exceção requer justificativa explícita do P.O. no issue do bug
- Máximo **3 exceções** por bateria (acima disso, travar e reavaliar)
- A justificativa deve citar qual decisão de produto está pendente
- Bugs em exceção são listados no `final.md` como "débito consciente"

**Exemplo legítimo:** bug B-XX requer decisão P.O. sobre se a UI deve
mostrar X ou Y. Enquanto P.O. não decide, o teste está bloqueado.
Label `blocked-by-product-decision` aplicada → sai do denominador.

**Anti-abuso:** labels aplicadas sem justificativa do P.O. são
consideradas tentativa de burlar o gate — Orquestrador remove e
conta no denominador.

---

### Bateria 4 — Validação final

**Pré-condição:** Bateria 3 aprovada.

**Gates:**
- [ ] G4.1: Tudo da Bateria 3 mantém-se PASS
- [ ] G4.2: 1 projeto real (fornecido pelo advogado) processado
  end-to-end sem erros
- [ ] G4.3: Relatório entregue ao P.O. com:
  - Tempo total de processamento por etapa
  - Cobertura das 10 categorias no projeto real
  - Rag_validated ≥ 50% no projeto real
  - Breadcrumb 4 nós em 100% dos riscos
- [ ] G4.4: P.O. aprova explicitamente a passagem para teste manual

---

### Pós-Bateria 4 — Teste manual P.O.

Executado pelo próprio P.O. com caso real dos advogados. Fora do
escopo da suite automatizada. Checklist em
`docs/governance/CASO_REAL_UAT_CHECKLIST.md`.

---

## Bloco 8 — Armadilhas conhecidas

1. **LIMIT ? em queries TiDB falha silenciosamente.**
   Usar `LIMIT ${Math.max(1, Math.min(500, n))}` — interpolação
   com clamp. Regra documentada em `.claude/rules/database.md`.

2. **DATABASE_URL ausente = testes silenciosamente passam com mock vazio.**
   O runner deve abortar explicitamente se `DATABASE_URL` não estiver
   setada ao rodar integration/aferição. Nunca fallback para vazio.

3. **930001 é projeto compartilhado — NÃO MUTAR.**
   Apenas SELECTs. Para testes destrutivos (deleteRisk,
   deleteActionPlan): criar projeto novo com prefixo `test_bateria_N_`.

4. **Vitest reporter customizado pode quebrar em testes paralelos.**
   Usar lock de arquivo ao fazer append ao `progress.md`
   (`proper-lockfile` ou equivalente).

5. **RAG timeout de 3s em testes de integração é flaky.**
   Aumentar para 10s em testes; nunca remover o timeout (viola
   contrato do pipeline).

6. **Score D tem fórmula diferente entre código e RN (D5 do snapshot).**
   Teste deve verificar a fórmula do **código** (é o runtime), mas
   reportar a divergência com a RN no relatório — decisão P.O.
   antes de alinhar (já registrada como pendência P1.5).

7. **Projetos com perfil incompleto geram título "nas operações de geral"**
   (RI-12 do snapshot). Gate 7 P3 falha se ocorrer. Teste deve
   cobrir esse caso com projeto cujo perfil tem `tipoOperacao=NULL`.

8. **Cascade de soft delete pode deixar audit_log órfão.**
   Verificar em E2E de cascata que `audit_log.before_state` contém
   o estado pré-delete completo, não apenas referências.

9. **Manus não pode travar se 1 teste falhar — deve continuar.**
   Qualquer teste com erro vira `FAIL` no relatório, não aborta a bateria.

10. **audit_log é permanente — não limpar entre baterias.**
    O teste de produção fica poluído se limpar. Usar projeto de
    testes dedicado.

---

## Bloco 9 — data-testid (cobertura E2E)

### Existentes (verificar com grep — já implementados)

```
# RiskDashboardV4
summary-bar · summary-count-alta · summary-count-media · summary-count-oportunidade
btn-ver-planos · approve-risk-button · bulk-approve-button
rag-badge-validated · rag-badge-pending · history-tab

# ActionPlanPage
traceability-banner · new-plan-button · plan-title-input
plan-responsavel-select · plan-prazo-select
task-edit-modal · task-delete-modal · task-overdue-indicator
btn-ver-consolidacao · btn-ver-consolidacao-top · btn-exportar-pdf-planos
history-tab · audit-log

# ConsolidacaoV4
compliance-score-card · kpi-score · kpi-alta · kpi-media
kpi-riscos-aprovados · kpi-planos · kpi-tarefas
tabela-riscos-aprovados · risk-row · secao-oportunidades
disclaimer-box · btn-download-pdf
```

### Novos necessários para os E2E desta spec

```
# risk-matrix-audit.spec.ts — aferição visual
audit-summary-total · audit-summary-by-severity · audit-summary-by-category

# soft-delete-cascade.spec.ts
deleted-risk-card · restored-risk-card
cascade-indicator-plans · cascade-indicator-tasks

# consolidacao-v4.spec.ts (se não existirem)
secao-riscos-desconsiderados · risco-desconsiderado-row
secao-planos · plano-row · plano-tarefas-lista
timeline-reforma · proximo-passo-box
```

**Gap gerenciado:** se algum `data-testid` novo não existir no
componente, a suite deve falhar com mensagem clara citando a linha
faltante — Claude Code corrige via PR antes de avançar.

---

## Bloco 9.1 — Triagem dos 21 bugs UAT Gate E (C2)

Fonte: `MATRIZ_RISCOS_SNAPSHOT_2026-04-18.md §10` — os 21 bugs
catalogados no UAT Gate E de 2026-04-11 (B-01 a B-21).

**Classificação obrigatória por cobertura de teste** — a ser preenchida
pelo Claude Code ao implementar os arquivos da suite (B1):

### Playwright COBRE (automatizável em B1-B3)

Bugs verificáveis por DOM query, assertion de URL, chamada de API
via tRPC client, ou contagem de elementos. Incluídos nas suites
`risk-matrix-audit.spec.ts`, `soft-delete-cascade.spec.ts`,
`consolidacao-v4.spec.ts`.

```
[ Claude Code lista quais dos 21 bugs estão aqui após implementação ]
```

### Inspeção humana (manual, checklist na Bateria 4)

Bugs de UX, fluxo de aprovação jurídica, layout ou ordem visual que
não são deterministicamente detectáveis por teste automatizado.
Entram no `docs/governance/CASO_REAL_UAT_CHECKLIST.md` para
verificação P.O. durante Bateria 4.

```
[ Claude Code lista quais dos 21 bugs estão aqui após implementação ]
```

### UX puro (fora do escopo desta suite)

Bugs de percepção, preferência subjetiva, ou estética pura sem
impacto funcional. Movidos para backlog separado — não entram
no denominador dos gates B1-B4.

```
[ Claude Code lista quais dos 21 bugs estão aqui após implementação ]
```

**Regra de soma:** `|Playwright| + |Inspeção humana| + |UX puro| = 21`.

**Entregável desta seção:** ao final da implementação da suite
(primeira execução da B1), Claude Code atualiza este Bloco 9.1
com a triagem completa. A versão **v1.2 da spec** refletirá a
triagem concreta.

**Impacto nos thresholds:**
- B2 usa apenas bugs em "Playwright cobre" como denominador
  (se a categoria tem 13 bugs, threshold é 17/13 — precisa ajuste)
- **Ajuste automático:** Claude Code recalcula os thresholds de B2
  e B3 com base no denominador real após a triagem
- Se triagem revelar < 10 bugs automatizáveis: Orquestrador
  reavalia escopo antes de B2

---

## ADR — Decisões arquiteturais

### ADR-TST-01 — 4 baterias iterativas em vez de 1 execução única

**Contexto:** A meta de 98% de confiabilidade é difícil de atingir em
uma única passada. Os 12 bugs hotfix do Z-17 e os 21 bugs UAT Gate E
demonstram que a primeira execução sempre revela gaps não previstos.

**Decisão:** 4 baterias com correções entre cada. Cada bateria tem
thresholds progressivamente mais exigentes (50% → 80% → 100% →
caso real).

**Alternativas rejeitadas:**
- (a) 1 execução única: maximiza pressão para perfeição na primeira
  vez — gera atalhos perigosos.
- (b) 2 baterias: pouco espaço para amadurecer correções finas.
- (c) 5+ baterias: diminishing returns; fadiga do P.O.

**Consequências:** tempo total maior (estimado 2-4 sprints), mas
qualidade final mais alta. Cada bateria produz um commit datado
que serve como histórico de evolução da qualidade.

---

### ADR-TST-02 — Aferição evidence-based complementa pass/fail

**Contexto:** Testes tradicionais retornam PASS/FAIL. Para os 10
critérios de confiabilidade do §13.5 do snapshot, isso é insuficiente
— o P.O. precisa ver **porquê** passou ou falhou.

**Decisão:** Criar script `scripts/audit-risk-matrix.mjs` que,
além de PASS/FAIL, imprime:
- Planejado (o que a regra diz)
- Realizado (o que o DB/código mostra)
- Delta (diferença quantitativa se aplicável)

**Alternativas rejeitadas:**
- Só pass/fail: obriga P.O. a debuggar para entender o motivo.
- Screenshot: não funciona para dados tabulares.

**Consequências:** aferição demora mais para rodar (~30s por critério),
mas permite ação imediata do Orquestrador ao ler o relatório.

---

### Decisões P.O. registradas (P1, P2, P3)

**DECISÃO P1 — Thresholds do score (D5 do snapshot):**
- Thresholds oficiais: **75/50/25** (código — `compliance-score-v4.ts:46-51`)
- Runtime atual é a fonte de verdade — RN será atualizada
- Ação: `RN_CONSOLIDACAO_V4.md §3` será corrigida em PR pós-snapshot
  (P1.5) para remover bypass por `totalAlta` e alinhar limiares
- Justificativa: todos os snapshots históricos em `projects.scoringData`
  usaram os thresholds do código; mudar código agora invalidaria histórico
  (registrado P.O. 2026-04-18)

**DECISÃO P2 — Cap 77.78% é design intencional (RI-06):**
- `MAX_PESO=9` reserva espaço para severidade futura "crítica" (peso 9)
- Severidade mais alta atual é "alta" (peso 7) → cap natural `7/9 = 77.78%`
- Padrão comum em engines determinísticos (reserva para expansão
  sem invalidar scores históricos)
- Ação: documentar em `RN_CONSOLIDACAO_V4.md §3` como "reserva para
  severidade crítica futura"
- Validação (B1): projeto sintético com 10 riscos alta + confidence=1.0
  deve produzir score ≈ 77 (confirma design, descarta bug)
- (registrado P.O. 2026-04-18)

**DECISÃO P3 — PR #E (CPIE-B) antes da Bateria 3:**
- Plano A: PR #E mergeado antes de B3 → suite testa estado final
- Plano B (se PR #E > 2 sprints):
  - CPIE-B registrado como "débito aceito" no `final.md` de cada bateria
  - Suite valida apenas **Score D** (`compliance-score-v4.ts`)
  - Critério 8 do §13.5 marcado `N/A — débito PR #E aceito`
  - Orquestrador decide Plano A ou B antes de despachar F6 da suite
- (registrado P.O. 2026-04-18)

---

### ADR-TST-03 — Relatório alimentado em tempo real

**Contexto:** P.O. explicitou: "Manus deve alimentar o relatório
durante os testes, não depois." Padrão atual de Vitest/Playwright
é bufferizado — só escreve ao final.

**Decisão:** Custom reporter do Vitest que:
1. Implementa `onTestFinished` hook
2. Faz append ao `progress.md` com lock de arquivo
3. Flush imediato (sem bufferização)

Para Playwright E2E: wrapper shell script que captura output
linha a linha e escreve em progress.md.

**Alternativas rejeitadas:**
- Polling do log por P.O.: funciona mas incentiva bufferização pelo runner.
- Dashboard web: overengineering para 4 baterias.

**Consequências:** reporter customizado adiciona complexidade.
Risk de quebra em testes muito paralelos. Mitigação: lock de arquivo
+ testes serializados na aferição (Vitest `--no-file-parallelism`).

---

## Contrato (Bloco 5 API)

**Nenhuma nova procedure tRPC.** Testes consomem procedures existentes:

| Procedure | Uso |
|---|---|
| `trpc.risksV4.listRisks` | Aferição + E2E |
| `trpc.risksV4.getProjectAuditLog` | E2E de audit_log |
| `trpc.risksV4.approveRisk` | E2E de aprovação |
| `trpc.risksV4.deleteRisk` | E2E de soft delete |
| `trpc.risksV4.calculateAndSaveScore` | E2E ConsolidacaoV4 |
| `trpc.risksV4.generateRisks` | Integration test do pipeline |

**Outputs da spec:**
- `reports/battery-N/progress.md` (tempo real)
- `reports/battery-N/final.md` (ao final)
- `reports/battery-N/afericao-930001.md` (ao rodar aferição)
- `reports/battery-N/e2e-screenshots/*.png` (falhas Playwright)

---

## Fluxo E2E (da suite de testes, não do produto)

```
1. P.O. aprova esta spec
   ↓
2. Orquestrador cria issue #N com spec
   Atribui labels: spec-bloco9, spec-adr, spec-contrato, spec-e2e, spec-aprovada
   Cria milestone "Sprint Z-20 — Suite de Testes"
   ↓
3. Orquestrador despacha Claude Code (F6 implementação)
   Claude Code cria branch test/z20-suite-matriz-riscos
   Claude Code implementa os 14 arquivos (9 novos + 3 modificados + 2 governance)
   Claude Code commita e abre PR
   ↓
4. Orquestrador despacha Manus (bateria 1 — background)
   Manus executa: pnpm test:battery-1 em background
   Manus alimenta reports/battery-1/progress.md em tempo real
   Manus commita snapshots do progress.md a cada 10 testes
   Manus avisa Orquestrador quando progress.md atinge "status: completed"
   ↓
5. P.O. lê reports/battery-1/final.md
   P.O. identifica gaps prioritários (lista rebaixada por severidade)
   P.O. retorna ao Orquestrador: "corrigir X, Y, Z"
   ↓
6. Orquestrador despacha Claude Code (F6 correções Bateria 1)
   Claude Code aplica fixes
   Claude Code commita incremento
   ↓
7. Orquestrador despacha Manus (Bateria 2)
   Repete passo 4 em reports/battery-2/
   ↓
8. P.O. + Orquestrador repetem ciclo até Bateria 4 PASS
   ↓
9. P.O. executa teste manual com caso real do advogado
   Usa docs/governance/CASO_REAL_UAT_CHECKLIST.md
   ↓
10. P.O. aprova GO/NO-GO para UAT externa com advogados
```

---

## O que NÃO entra nesta spec (explícito)

1. **Mudanças de lógica de negócio** — suite apenas AFERE.
   Correções detectadas geram issues separadas.

2. **Testes de performance/load** — escopo Z-21+.

3. **Testes de segurança** — escopo separado (pentest).

4. **Fixação dos 12 bugs UAT Gate E "a verificar" do snapshot §10.2** —
   apenas VERIFICA se estão fechados. Correções viram PRs separados.

5. **PR #E (reconciliação CPIE-B v4)** — débito ADR-0023 permanece.
   Suite registra impacto mas não resolve.

6. **Frontend novo** — nenhum componente UI criado. Score v4
   visível na matriz (DEC-01) é escopo de spec separada Z-20+.

---

## Condição de merge — ESPECIAL Z-20 (suite de testes)

Fluxo de aceite em 6 etapas (mais rigoroso que o padrão):

```
ETAPA 1 — Implementação dos 14 arquivos (Claude Code)
ETAPA 2 — Bateria 1 executada pelo Manus em background
          + progress.md alimentado em tempo real (validado por P.O.)
ETAPA 3 — Correções Bateria 1 + Bateria 2
ETAPA 4 — Correções Bateria 2 + Bateria 3 (100% PASS)
ETAPA 5 — Bateria 4 com caso real do advogado
ETAPA 6 — Aprovação explícita P.O. após teste manual

Merge da PR da spec só acontece em ETAPA 6.
Cada bateria intermediária é commitada mas PR permanece OPEN.
```

**Nunca mergear antes da aprovação explícita P.O. após ETAPA 6.**
Mesmo com todos os gates PASS.

---

## Pendências por bateria (estratificadas — C1)

Substitui a lista plana de "5 pendências bloqueadoras" da v1.0.
Esta versão estratifica por bateria, evitando que pendências de
B3/B4 bloqueiem a abertura de F1 para a B1.

### ANTES DA BATERIA 1 (bloqueadoras de F1)

- [ ] **P5 + C6** — Criar projeto `test_z20_destructive` com o perfil
  definido em Bloco 3.4. Responsável: Orquestrador despacha Manus.
  ID exposto em `E2E_DESTRUCTIVE_PROJECT_ID`.
- [ ] **P1** — Confirmar que thresholds oficiais são 75/50/25 (código).
  Já decidido (ver ADR "Decisões P.O. registradas"), pendência é
  apenas confirmação pelo Orquestrador antes de abrir issue.
- [ ] **C2** — Placeholder de triagem dos 21 bugs UAT inserido no
  Bloco 9.1. Preenchimento concreto é responsabilidade do Claude Code
  ao implementar a suite — não bloqueia F1.
- [ ] **C3 / G0** — Smoke-test do reporter implementado antes de G1.1.
  Responsável: Claude Code como primeiro artefato da F6.

### ANTES DA BATERIA 3 (bloqueadoras de avanço B2 → B3)

- [ ] **P3** — PR #E (CPIE-B) mergeado **OU** Plano B ativado
  (CPIE como débito aceito, Score D isolado).
  Responsável: Orquestrador decide antes de despachar correções B2.
- [ ] **P1.5** — PR atualizando `RN_CONSOLIDACAO_V4.md §3` com
  thresholds 75/50/25 mergeado (alinha RN × código).
- [ ] **P1.2-P1.4** — Demais PRs de governança pós-snapshot
  mergeados (D2, D3, D6 do snapshot §5) para drift check zerar.

### ANTES DA BATERIA 4 (bloqueadoras de validação final)

- [ ] **P4** — Projeto UAT do advogado provisionado no DB com os
  **6 requisitos** (ver abaixo). Responsável: P.O. fornece caso
  via advogado parceiro; Manus importa e executa pipeline completo.

### 6 requisitos do projeto UAT (P4 — substitui lista v1.0)

1. Caso de **empresa real** (anonimizado se necessário por LGPD)
2. Cobrir **no mínimo 5 das 10 categorias** oficiais (garantir
   diversidade entre alta/media/oportunidade)
3. Ter **respostas completas nas Ondas 1+2** (SOLARIS + IA GEN) —
   não apenas dados de perfil
4. Ter CNAE(s) válido(s) para acionar **Onda 3 (RAG)** com hits
   mínimos no corpus `ragDocuments`
5. **NÃO ser o 930001** (projeto sintético de teste) nem o
   `test_z20_destructive` (projeto dedicado a B1-B3)
6. Ter `status=aprovado` OU `em_andamento` com Ondas 1+2 concluídas
   no sistema — ou seja, o projeto já **passou pelo fluxo SOLARIS
   completo**, não é apenas um seed de DB. Isso garante que a
   Bateria 4 testa o pipeline integral, não dados sintéticos.

### Matriz bloqueadora × bateria

| Pendência | B1 | B2 | B3 | B4 |
|---|---|---|---|---|
| P1 (thresholds) | Confirma | — | Aplica RN | — |
| P2 (cap 77.8%) | Valida em teste sintético | — | — | — |
| P3 (PR #E) | — | — | **Bloqueia** | — |
| P4 (projeto UAT) | — | — | — | **Bloqueia** |
| P5 (projeto destrutivo) | **Bloqueia** | — | — | — |
| C1 (estratificação) | — | — | — | — |
| C2 (triagem bugs) | — | **Ajusta denominador** | **Ajusta denominador** | — |
| C3 (reporter smoke) | **Bloqueia via G0** | — | — | — |
| C5 (ORQ-16 por bateria) | — | — | — | — |
| C6 (perfil destrutivo) | Ver P5 | — | — | — |
| C7 (exceção B3) | — | — | **Aplica** | — |

---

## Referências

- `docs/governance/MATRIZ_RISCOS_SNAPSHOT_2026-04-18.md` — baseline (§13.5, §21, §23)
- `docs/governance/RN_GERACAO_RISCOS_V4.md` — regras RN-RISK
- `docs/governance/RN_PLANOS_TAREFAS_V4.md` — regras RN-AP, RN-TASK
- `docs/governance/RN_CONSOLIDACAO_V4.md` — regras RN-CV4 (score D)
- `docs/governance/GOVERNANCA-E2E-IA-SOLARIS.md` — Gate 7 P1-P4
- `docs/adr/ADR-0022-hot-swap-risk-engine-v4.md` — engine v4 ativo
- `docs/adr/ADR-0023-cpie-score-opcao-a-sprint-z07.md` — débito CPIE-B
- `docs/adr/ADR-0025-risk-categories-configurable-rag-sensor.md` — risk_categories configurável
- `server/lib/risk-engine-v4.ts` — fonte do engine
- `server/lib/compliance-score-v4.ts` — Score D
- `server/lib/rag-risk-validator.ts` — enrichment RAG
- `server/lib/generate-risks-pipeline.ts` — pipeline Z-13.5
- `server/routers/risks-v4.ts` — 19 procedures tRPC

---

*IA SOLARIS · Spec de Suite de Testes · Matriz de Riscos v4*
*Versão 1.1 · 2026-04-18 · C1-C7 + P1-P5 aplicadas*
*Após aprovação: submeter como issue com 5 labels spec-* + 4 blocos obrigatórios*
*v1.2 será gerada após triagem concreta dos 21 bugs UAT (Bloco 9.1)*
