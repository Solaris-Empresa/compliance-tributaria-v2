# ERROS CONHECIDOS — Plataforma Compliance Reforma Tributária

**Versão:** 1.0  
**Data:** 2026-03-24  
**Autor:** Manus AI / Equipe de Engenharia  
**Propósito:** Registro oficial de erros, bugs, falhas e decisões pendentes para apoio a soluções definitivas e paliativas durante incidentes na plataforma.

---

## Índice

1. [Como usar este documento](#1-como-usar-este-documento)
2. [Classificação de Severidade](#2-classificação-de-severidade)
3. [Erros Corrigidos — Histórico](#3-erros-corrigidos--histórico)
4. [Erros Conhecidos Ativos](#4-erros-conhecidos-ativos)
5. [Riscos Arquiteturais Documentados](#5-riscos-arquiteturais-documentados)
6. [Decisões Pendentes (Não Bloqueantes)](#6-decisões-pendentes-não-bloqueantes)
7. [Runbook de Incidentes Comuns](#7-runbook-de-incidentes-comuns)
8. [Invariants do Sistema](#8-invariants-do-sistema)
9. [Histórico de Versões deste Documento](#9-histórico-de-versões-deste-documento)

---

## 1. Como usar este documento

Este documento é a **fonte de verdade** para erros conhecidos da plataforma. Ao identificar um incidente:

1. Consulte a **Seção 4** (Erros Conhecidos Ativos) para verificar se já está catalogado.
2. Se identificado, aplique a **solução paliativa** imediatamente para restaurar o serviço.
3. Escale para a solução definitiva conforme prioridade indicada.
4. Se o erro não estiver catalogado, abra uma issue usando o template em `.github/ISSUE_TEMPLATE/structural-fix.md` e adicione a este documento.

> **Regra de ouro:** Nunca feche um incidente sem atualizar este documento.

---

## 2. Classificação de Severidade

| Nível | Código | Critério | Tempo de Resposta |
|---|---|---|---|
| Crítico | **P0** | Sistema inacessível ou dados corrompidos | Imediato (< 1h) |
| Alto | **P1** | Funcionalidade core quebrada, workaround disponível | < 4h |
| Médio | **P2** | Funcionalidade degradada, impacto parcial | < 24h |
| Baixo | **P3** | Cosmético, UX ruim, sem perda de dados | Próxima sprint |
| Informativo | **INFO** | Comportamento documentado, não é bug | N/A |

---

## 3. Erros Corrigidos — Histórico

Esta seção registra erros já resolvidos. Mantida para referência em caso de regressão.

---

### ERR-001 — Navegação para Rota Legada após Confirmação de CNAEs

| Campo | Detalhe |
|---|---|
| **ID** | ERR-001 |
| **Alias** | UAT-001 |
| **Severidade** | P0 (bloqueava o fluxo principal) |
| **Status** | ✅ CORRIGIDO — Sprint Onda 1 (2026-03-23) |
| **Checkpoint** | `bb4b0395` |

**Sintoma observado:** Após confirmar os CNAEs no fluxo de criação de projeto, o usuário era redirecionado para `/questionario-v3` (rota legada) em vez das novas rotas v2.1 (`/questionario-corporativo-v2`, `/questionario-operacional`, `/questionario-cnae`). O fluxo travava e o usuário não conseguia avançar.

**Causa raiz:** 6 pontos de saída do fluxo (`onSuccess` e `statusToStep`) nos arquivos `NovoProjeto.tsx`, `ProjetoDetalhesV2.tsx`, `QuestionarioCorporativoV2.tsx`, `QuestionarioOperacional.tsx`, `QuestionarioCNAE.tsx` e `flowStepperUtils.ts` ainda apontavam para a rota legada.

**Solução definitiva aplicada:** Todos os pontos de saída atualizados para as rotas corretas v2.1.

**Arquivos modificados:**
- `client/src/pages/NovoProjeto.tsx`
- `client/src/pages/ProjetoDetalhesV2.tsx`
- `client/src/pages/QuestionarioCorporativoV2.tsx`
- `client/src/pages/QuestionarioOperacional.tsx`
- `client/src/pages/QuestionarioCNAE.tsx`
- `client/src/lib/flowStepperUtils.ts`

**Teste de regressão:** `server/sprint-v60-v63-e2e.test.ts` — T06 (navegação pós-CNAE)

---

### ERR-002 — Persistência V1 em vez de V3 nos Endpoints de Geração

| Campo | Detalhe |
|---|---|
| **ID** | ERR-002 |
| **Alias** | UAT-002 |
| **Severidade** | P0 (dados gerados não eram persistidos corretamente) |
| **Status** | ✅ CORRIGIDO — Sprint Onda 1 (2026-03-23) |
| **Checkpoint** | `bb4b0395` |

**Sintoma observado:** Após gerar Briefing, Matriz de Riscos ou Plano de Ação, os dados eram salvos nas colunas V1 (`briefingContent`, `riskMatricesData`, `actionPlansData`) em vez das colunas V3 (`briefingContentV3`, `riskMatricesDataV3`, `actionPlansDataV3`). Ao reabrir o projeto, os dados gerados não apareciam.

**Causa raiz:** Os 5 endpoints de geração (`generateBriefingFromDiagnostic`, `approveBriefing`, `approveRiskMatrices`, `saveActionPlan`, `approveActionPlans`) no `routers-fluxo-v3.ts` persistiam nas colunas V1. O `diagnostic-source.ts` não retornava dados V3 para projetos com `flowVersion = "v1"`.

**Solução definitiva aplicada:** Persistência migrada para V3. Dual-read V3/V1 implementado nos componentes e no `diagnostic-source.ts`.

**Arquivos modificados:**
- `server/routers-fluxo-v3.ts` (5 endpoints)
- `server/diagnostic-source.ts`
- `client/src/pages/PlanoAcaoV3.tsx`
- `client/src/pages/BriefingV3.tsx`
- `client/src/pages/MatrizesV3.tsx`

**Teste de regressão:** `server/sprint-v60-v63-e2e.test.ts` — T08 (persistência V3)

---

### ERR-003 — Prefill de Questionários Ignorado (Lógica Local vs. Builder Canônico)

| Campo | Detalhe |
|---|---|
| **ID** | ERR-003 |
| **Alias** | BUG-PREFILL-CORPORATIVO |
| **Severidade** | P1 (degradação de UX — campos não pré-preenchidos) |
| **Status** | ✅ CORRIGIDO — Sub-Sprint Prefill Contract (2026-03-24) |
| **Checkpoint** | `f1babb41` |

**Sintoma observado:** Ao abrir o Questionário Corporativo, os campos `qc01_regime` (regime tributário) e `qc01_porte` (porte da empresa) não eram pré-preenchidos com os dados do perfil da empresa, mesmo quando o perfil estava completo.

**Causa raiz (4 causas independentes):**
1. `QuestionarioCorporativoV2.tsx` tinha lógica local de prefill duplicada e divergente do builder canônico em `shared/questionario-prefill.ts`.
2. `getProjectById()` no `db.ts` retornava `companyProfile` como string JSON (não como objeto) para projetos legados — o MySQL2 não faz parse automático de colunas `json()`.
3. O tipo `NormalizedProjectForPrefill` não incluía `isEconomicGroup` e `taxCentralization`.
4. O builder `buildCorporatePrefill` não mapeava os campos QC-02 (grupo econômico, filiais, centralização).

**Solução definitiva aplicada:**
- `normalizeProject()` adicionado ao `db.ts` com `safeParseJson()` — aplicado em `getProjectById()` e `getProjectsByUser()`.
- `shared/questionario-prefill.ts` reescrito com builders completos (QC-01, QC-02, QO, CNAE) e `PrefillTrace` para rastreabilidade.
- `QuestionarioCorporativoV2.tsx` refatorado para usar exclusivamente `buildCorporatePrefill()`.

**Arquivos modificados:**
- `server/db.ts`
- `shared/questionario-prefill.ts`
- `client/src/pages/QuestionarioCorporativoV2.tsx`

**Testes de regressão:** `server/prefill-contract.test.ts` (117 testes), `server/prefill-contract-v2.test.ts` (81 testes)

---

### ERR-004 — isEconomicGroup e taxCentralization Não Persistidos no Banco

| Campo | Detalhe |
|---|---|
| **ID** | ERR-004 |
| **Alias** | BUG-001 (pós-autoauditoria) |
| **Severidade** | P1 (campos coletados mas não salvos — prefill QC-02 incompleto) |
| **Status** | ✅ CORRIGIDO — Pós-Autoauditoria (2026-03-24) |
| **Checkpoint** | `ed4630c6` |

**Sintoma observado:** Ao criar um projeto com grupo econômico (`isEconomicGroup = true`) ou centralização fiscal (`taxCentralization = "centralizado"`), esses valores não eram salvos no banco. Ao abrir o Questionário Corporativo, os campos `qc02_grupo` e `qc02_centralizacao` não eram pré-preenchidos.

**Causa raiz:** `NovoProjeto.tsx` montava o objeto `companyProfile` (linhas 468-474) sem incluir `isEconomicGroup` e `taxCentralization`. Os campos existiam no formulário, no schema Zod, no banco e nos builders — mas o elo de persistência estava quebrado.

**Solução definitiva aplicada:** 2 linhas adicionadas ao objeto `companyProfile` em `NovoProjeto.tsx`:
```ts
isEconomicGroup: perfilData.isEconomicGroup,
taxCentralization: perfilData.taxCentralization,
```

**Arquivos modificados:**
- `client/src/pages/NovoProjeto.tsx` (linhas 468-474)

**Testes de regressão:** `server/bug001-regression.test.ts` (33 testes)

---

### ERR-005 — Banner QC-01 Usa Path Legado em vez de Canônico

| Campo | Detalhe |
|---|---|
| **ID** | ERR-005 |
| **Alias** | OBS-002 (autoauditoria) |
| **Severidade** | P2 (banner informativo não aparecia para projetos novos) |
| **Status** | ✅ CORRIGIDO — Pós-Autoauditoria (2026-03-24) |
| **Checkpoint** | `ed4630c6` |

**Sintoma observado:** O banner informativo no topo do Questionário Corporativo (QC-01) que exibe o regime tributário e porte da empresa não aparecia para projetos criados após a migração para o fluxo V3, mesmo com dados disponíveis no perfil.

**Causa raiz:** O banner usava `projeto.taxRegime` e `projeto.companySize` (colunas legadas, sempre `null` em projetos V3) em vez de `projeto.companyProfile?.taxRegime` e `projeto.companyProfile?.companySize` (path canônico).

**Solução definitiva aplicada:** Banner atualizado para usar `companyProfile.taxRegime` e `companyProfile.companySize`.

**Arquivos modificados:**
- `client/src/pages/QuestionarioCorporativoV2.tsx` (bloco do banner, linhas 314-335)

---

### ERR-006 — Descoberta de CNAEs Falha por Chave OpenAI Inválida ou Ausente

| Campo | Detalhe |
|---|---|
| **ID** | ERR-006 |
| **Alias** | INCIDENTE-OPENAI-KEY |
| **Severidade** | P0 (bloqueava completamente a etapa de descoberta de CNAEs) |
| **Status** | ✅ CORRIGIDO — configuração de chave via `webdev_request_secrets` |
| **Checkpoint** | Pré-sprint (configuração de ambiente) |

**Sintoma observado:** A etapa de descoberta/confirmação de CNAEs no fluxo de criação de projeto falhava silenciosamente ou exibia erro genérico. O usuário não conseguia avançar além da etapa de CNAEs.

**Causa raiz:** A variável de ambiente `OPENAI_API_KEY` estava ausente, expirada ou com formato inválido (não começava com `sk-`). O endpoint de descoberta de CNAEs usa o modelo GPT-4.1 via `invokeLLM()` — sem chave válida, todas as chamadas retornam HTTP 401.

**Solução paliativa:** Verificar a chave no painel de Secrets do projeto. Se ausente ou inválida, reconfigurar via `webdev_request_secrets` com uma chave válida da OpenAI.

**Solução definitiva:** Chave configurada e validada via `server/openai-key-validation.test.ts` (2 testes: presença + chamada real ao modelo).

**Como verificar:** Executar `pnpm test -- openai-key-validation` — deve passar 2/2. Se falhar, a chave precisa ser reconfigurada.

**Arquivos relacionados:**
- `server/openai-key-validation.test.ts`
- `server/_core/llm.ts`
- `server/routers-fluxo-v3.ts` (endpoint `discoverCnaes`)

---

### ERR-007 — Dois Fluxos de Diagnóstico Sem Rota Canônica Definida (Legado V1 + V3)

| Campo | Detalhe |
|---|---|
| **ID** | ERR-007 |
| **Alias** | ADR-001 — Problema Central |
| **Severidade** | P1 (projetos podiam ter respostas nos dois fluxos sem que nenhum sistema soubesse) |
| **Status** | ✅ RESOLVIDO ARQUITETURALMENTE — ADR-005 (isolamento físico de colunas) |
| **Checkpoint** | Pré-sprint v2.2 |

**Sintoma observado:** Um projeto podia ter respostas no fluxo V1 (`corporateAnswers`, `operationalAnswers`, `cnaeAnswers`) e no fluxo V3 (`questionnaireAnswersV3`) simultaneamente, sem que o sistema soubesse qual era a fonte de verdade. Briefings e matrizes podiam ser gerados a partir de dados errados.

**Causa raiz:** Dois fluxos coexistiam sem separação física de dados. O `flowVersion` era usado como guarda lógico, mas não havia isolamento de colunas.

**Solução definitiva aplicada (ADR-005):** Colunas físicas separadas por fluxo: `briefingContentV3`, `riskMatricesDataV3`, `actionPlansDataV3`. `diagnostic-source.ts` implementa dual-read com fallback V1 para projetos legados.

**Regra atual:** Projetos com `flowVersion = "v3"` usam exclusivamente colunas V3. Projetos com `flowVersion = "v1"` usam colunas V1 com fallback.

---

## 4. Erros Conhecidos Ativos

Erros identificados, documentados, mas ainda sem correção definitiva implementada.

---

### ERR-008 — Sobreposição de Perguntas QC-07 e QO-03 (Meios de Pagamento)

| Campo | Detalhe |
|---|---|
| **ID** | ERR-008 |
| **Alias** | DECISÃO-001 |
| **Severidade** | P3 (UX confusa — mesma pergunta em dois questionários) |
| **Status** | ⚠️ ATIVO — Decisão pendente do PO |
| **Impacto** | Advogados podem responder a mesma pergunta duas vezes |

**Sintoma observado:** A pergunta sobre meios de pagamento aparece em dois questionários distintos:
- **QC-07** (Questionário Corporativo): "Quais meios de pagamento a empresa utiliza?" — contexto de compliance fiscal corporativo.
- **QO-03** (Questionário Operacional): "Quais meios de pagamento a empresa aceita?" — contexto de operação e fluxo de caixa.

**Análise:** As perguntas têm propósitos distintos (compliance fiscal vs. operação), mas as opções de resposta são idênticas. O usuário percebe como duplicação.

**Soluções disponíveis:**

| Opção | Descrição | Impacto |
|---|---|---|
| **A — Manter ambas com prefill cruzado** (recomendada) | QC-07 pré-preenche com resposta de QO-03 | Mínimo — 2h de implementação |
| **B — Remover QC-07** | Eliminar a pergunta do Corporativo | Médio — revisar regras de risco que dependem de QC-07 |
| **C — Consolidar em seção única** | Criar seção "Meios de Pagamento" compartilhada | Alto — refatoração de 2 questionários |

**Solução paliativa:** Nenhuma necessária — o sistema funciona corretamente. O impacto é apenas de UX.

**Próximo passo:** PO deve escolher uma das 3 opções acima para implementação na próxima sprint.

---

### ERR-009 — Projetos Legados Sem isEconomicGroup e taxCentralization

| Campo | Detalhe |
|---|---|
| **ID** | ERR-009 |
| **Alias** | MIGRAÇÃO-LEGADO-QC02 |
| **Severidade** | P2 (prefill QC-02 incompleto para projetos criados antes de 2026-03-24) |
| **Status** | ⚠️ ATIVO — Script de migração não executado |
| **Impacto** | Projetos legados mostram `prefill_fields_missing` no PrefillTrace para QC-02 |

**Sintoma observado:** Projetos criados antes de 2026-03-24 não têm os campos `isEconomicGroup` e `taxCentralization` no `companyProfile`. Ao abrir o Questionário Corporativo, os campos `qc02_grupo` e `qc02_centralizacao` não são pré-preenchidos.

**Causa raiz:** Os campos foram adicionados ao schema e ao formulário em 2026-03-24 (Sub-Sprint Prefill Contract). Projetos anteriores não passaram pelo novo formulário.

**Solução paliativa:** O sistema funciona normalmente — os campos simplesmente não são pré-preenchidos para projetos legados. O advogado preenche manualmente.

**Solução definitiva (script de migração):**
```sql
-- Preencher isEconomicGroup a partir de hasMultipleEstablishments
UPDATE projects
SET companyProfile = JSON_SET(
  companyProfile,
  '$.isEconomicGroup', JSON_EXTRACT(companyProfile, '$.taxComplexity.hasMultipleEstablishments'),
  '$.taxCentralization', 'nao_informado'
)
WHERE JSON_EXTRACT(companyProfile, '$.isEconomicGroup') IS NULL
  AND flowVersion = 'v3';
```

**Atenção:** Executar o script apenas após validação em ambiente de staging. Fazer backup antes.

---

### ERR-010 — Erro TypeScript em shadowMode.ts (Cache Incremental)

| Campo | Detalhe |
|---|---|
| **ID** | ERR-010 |
| **Alias** | TS-SHADOWMODE-CACHE |
| **Severidade** | INFO (falso positivo — não afeta runtime) |
| **Status** | ⚠️ ATIVO — Ruído no watcher TypeScript |
| **Impacto** | Watcher TS reporta erro falso; `tsc --noEmit` confirma zero erros reais |

**Sintoma observado:** O watcher TypeScript (modo incremental) reporta erro em `server/runtime/shadowMode.ts` sobre `getDiagnosticReadMode` não exportada. O erro aparece no console do servidor durante o hot-reload.

**Causa raiz:** Cache incremental do TypeScript desatualizado. A função `getDiagnosticReadMode` **existe e é exportada** em `server/diagnostic-source.ts` (linha 55). O cache foi gerado antes de uma refatoração de imports e não foi invalidado.

**Solução paliativa:** Ignorar o erro no watcher — ele não afeta o funcionamento do sistema. Para silenciar, executar:
```bash
rm -rf /home/ubuntu/compliance-tributaria-v2/.tsbuildinfo
```
O próximo build recompilará do zero e o erro desaparecerá.

**Solução definitiva:** O erro desaparece automaticamente após `pnpm dev` (reinício limpo do servidor). Já foi resolvido na sessão atual via `webdev_restart_server`.

---

## 5. Riscos Arquiteturais Documentados

Riscos identificados nos ADRs que podem se tornar incidentes se não monitorados.

---

### RISCO-001 — Briefing como Ponto Único de Falha no Pipeline

**Origem:** ADR-002, Risco 2  
**Probabilidade:** Baixa (mitigada)  
**Impacto:** Alto — GAP analysis, Matriz de Riscos e Plano de Ação são todos derivados do Briefing

**Descrição:** Se `generateBriefing` falhar após 3 tentativas, todo o pipeline downstream (riscos, ações, briefing) para. O usuário fica preso sem conseguir avançar.

**Mitigação implementada:** `generateWithRetry` com 3 tentativas + backoff exponencial. Briefing de fallback determinístico (sem IA) implementado para quando todas as tentativas falham.

**Sintoma de incidente:** Usuário vê spinner infinito na tela de geração de briefing. Logs mostram `generateBriefing failed after 3 attempts`.

**Solução paliativa:** Verificar `OPENAI_API_KEY` (ver ERR-006). Se a chave estiver válida, aguardar 5 minutos e tentar novamente (pode ser instabilidade temporária da API OpenAI). Se persistir por mais de 15 minutos, o briefing de fallback deve ser acionado automaticamente.

---

### RISCO-002 — Variabilidade do Diagnóstico por Instabilidade do Modelo

**Origem:** ADR-002, Risco 3  
**Probabilidade:** Média  
**Impacto:** Médio — diagnósticos diferentes para o mesmo perfil em execuções distintas

**Descrição:** A qualidade do RAG, qualidade do prompt e estabilidade do modelo introduzem variabilidade. Dois projetos com perfis idênticos podem receber diagnósticos diferentes.

**Mitigação implementada:** Shadow Mode com baseline de 203 divergências esperadas documentadas. Divergências acima do baseline são alertas.

**Monitoramento:** `docs/product/cpie-v2/produto/SHADOW-MONITOR-BASELINE-UAT-2026-03-23.md`

---

### RISCO-003 — Inconsistência Composta Não Detectada no Perfil

**Origem:** ADR-002, Risco 1; `docs/product/cpie-v2/produto/08-risk-model.md`  
**Probabilidade:** Média  
**Impacto:** Alto — diagnóstico tributário incorreto para a realidade da empresa

**Descrição:** Campos individuais podem estar corretos mas a combinação ser impossível (ex: Simples Nacional + faturamento > R$4,8M). O Consistency Engine detecta inconsistências compostas, mas apenas as determinísticas. Inconsistências sutis podem passar.

**Mitigação implementada:** Consistency Engine com `hard_block` para inconsistências críticas e `soft_block_with_override` para inconsistências moderadas.

**Sintoma de incidente:** Projeto avança com perfil inconsistente → diagnóstico incorreto → advogado identifica erro no UAT.

**Solução paliativa:** Abrir o projeto, editar o perfil da empresa e corrigir a inconsistência. O sistema permitirá regenerar o diagnóstico.

---

## 6. Decisões Pendentes (Não Bloqueantes)

Decisões que precisam ser tomadas pelo PO mas não bloqueiam o UAT.

| ID | Decisão | Opções | Responsável | Prazo |
|---|---|---|---|---|
| **DEC-001** | Sobreposição QC-07 / QO-03 (meios de pagamento) | A: prefill cruzado / B: remover QC-07 / C: consolidar | PO | Pré-Sprint 2 |
| **DEC-002** | Campo `qc02_obs` (observações QC-02) — pré-preenchível? | Manter sem prefill / Remover / Sugerir texto via IA | PO + Jurídico | Pós-UAT |
| **DEC-003** | Migração de projetos legados (ERR-009) | Executar script SQL / Deixar sem migração | PO + DBA | Pós-UAT |

---

## 7. Runbook de Incidentes Comuns

### INC-001 — Usuário não consegue avançar após confirmação de CNAEs

**Diagnóstico rápido:**
1. Verificar URL atual do usuário — deve ser `/questionario-corporativo-v2` (não `/questionario-v3`).
2. Se for `/questionario-v3`, o ERR-001 regrediu — verificar se o deploy está na versão correta (checkpoint `bb4b0395` ou posterior).
3. Verificar `flowVersion` do projeto no banco: `SELECT flowVersion FROM projects WHERE id = ?` — deve ser `"v3"`.

**Solução paliativa:** Pedir ao usuário para acessar diretamente `/questionario-corporativo-v2?projectId=<ID>`.

---

### INC-002 — Briefing/Matriz/Plano não aparecem após geração

**Diagnóstico rápido:**
1. Verificar se os dados foram salvos nas colunas corretas:
```sql
SELECT 
  id,
  flowVersion,
  briefingContentV3 IS NOT NULL as tem_briefing_v3,
  briefingContent IS NOT NULL as tem_briefing_v1
FROM projects WHERE id = ?;
```
2. Se `tem_briefing_v1 = true` e `tem_briefing_v3 = false`, o ERR-002 regrediu.

**Solução paliativa:** Regenerar o briefing — o sistema deve salvar nas colunas V3 corretamente.

---

### INC-003 — Campos não pré-preenchidos nos questionários

**Diagnóstico rápido:**
1. Verificar se o `companyProfile` está populado:
```sql
SELECT JSON_EXTRACT(companyProfile, '$.taxRegime') as regime,
       JSON_EXTRACT(companyProfile, '$.companySize') as porte
FROM projects WHERE id = ?;
```
2. Se `regime` e `porte` são `null`, o perfil não foi salvo corretamente.
3. Se estão preenchidos mas o prefill não funciona, verificar se `normalizeProject()` está sendo aplicado (ERR-003).

**Solução paliativa:** Pedir ao usuário para editar e re-salvar o perfil da empresa.

---

### INC-004 — Descoberta de CNAEs falha ou retorna vazio

**Diagnóstico rápido:**
1. Executar `pnpm test -- openai-key-validation` — se falhar, a chave está inválida (ERR-006).
2. Verificar logs do servidor: `grep "invokeLLM\|discoverCnaes\|401\|invalid_api" .manus-logs/devserver.log`.

**Solução paliativa:**
1. Verificar e reconfigurar `OPENAI_API_KEY` via painel de Secrets.
2. Se a chave estiver válida, aguardar 5 minutos (pode ser rate limit da OpenAI) e tentar novamente.

---

### INC-005 — Erro TypeScript no watcher (falso positivo)

**Diagnóstico rápido:**
1. Executar `npx tsc --noEmit` — se retornar 0 erros, é falso positivo (ERR-010).
2. Se retornar erros reais, investigar o arquivo indicado.

**Solução paliativa:**
```bash
rm -rf /home/ubuntu/compliance-tributaria-v2/.tsbuildinfo
# Reiniciar o servidor
```

---

## 8. Invariants do Sistema

Propriedades que **nunca devem ser violadas**. Se violadas, constituem incidente P0.

| ID | Invariant | Teste de Verificação |
|---|---|---|
| **INV-001** | Todo projeto tem exatamente um `flowVersion` (`v1` ou `v3`) | `server/prefill-contract.test.ts` — BLOCO 1 |
| **INV-002** | `companyProfile` nunca chega ao frontend como string JSON | `server/prefill-contract.test.ts` — BLOCO 2 |
| **INV-003** | Builders de prefill nunca lançam exceção — retornam objeto vazio em caso de dados ausentes | `server/prefill-contract.test.ts` — BLOCO 4 |
| **INV-004** | `normalizeProject()` é aplicado em todos os pontos de retorno de projeto | `server/prefill-contract.test.ts` — BLOCO 5 |
| **INV-005** | Nenhum questionário tem lógica local de prefill — todos usam builders canônicos | `server/prefill-contract-v2.test.ts` — BLOCO 7 |
| **INV-006** | Toda entrada de risco tem `id`, `category`, `probability`, `impact` e `description` | `server/invariants-606-607-608.test.ts` — INV-006 |
| **INV-007** | Todo plano de ação tem `id`, `riskId`, `action`, `responsible` e `deadline` | `server/invariants-606-607-608.test.ts` — INV-007 |
| **INV-008** | Todo briefing tem `projectId`, `content` e `generatedAt` | `server/invariants-606-607-608.test.ts` — INV-008 |

**Como verificar todos os invariants:**
```bash
cd /home/ubuntu/compliance-tributaria-v2
npx vitest run server/prefill-contract.test.ts server/prefill-contract-v2.test.ts server/invariants-606-607-608.test.ts
# Esperado: 245/245 ✅
```

---

## 9. Histórico de Versões deste Documento

| Versão | Data | Autor | Mudanças |
|---|---|---|---|
| 1.0 | 2026-03-24 | Manus AI | Criação inicial — 10 erros catalogados (7 corrigidos, 3 ativos), 3 riscos arquiteturais, 3 decisões pendentes, 5 runbooks, 8 invariants |

---

*Documento mantido pela equipe de engenharia. Atualizar sempre que um novo erro for identificado ou um erro ativo for resolvido.*
