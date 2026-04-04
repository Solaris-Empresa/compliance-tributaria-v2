# Changelog — IA Solaris / Plataforma de Compliance Tributária

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [Sprint S] — 2026-04-04 · `d08c12a`

### Corrigido
- **BUG-M-007** `server/lib/iagen-gap-analyzer.ts` — `isUncertainAnswer` usava `confidence_score < 0.7` como proxy de gap, ignorando respostas "não" com alta certeza do LLM. Substituído por `isNonCompliantAnswer` que analisa o conteúdo da resposta (padrão G17). (PR #295 · `d08c12a`)

### Adicionado
- **Lote A** `server/lib/iagen-gap-analyzer.ts` — Engine de análise de respostas IAgen, integrado ao `completeOnda2` como fire-and-forget. Gera gaps `source='iagen'` em `project_gaps_v3`. (PR #292)
- **Lote B** `server/routers-fluxo-v3.ts` — `persistCpieScoreForProject` chamado em `approveActionPlan`, persistindo score CPIE em `cpie_score_history`. (PR #292)
- **Lote E** `server/routers/briefingEngine.ts` — `briefingEngine` passa a ler `actionPlans` (401 registros) em vez de `project_actions_v3` (9 registros). (PR #292)
- **Lote D** `docs/rag/` — 5 novas leis ingeridas: `conv_icms` (278 chunks), `lc116` (60), `cg_ibs` (26), `rfb_cbs` (7), `lc87` (5). Corpus total: 2.454 chunks · 10 leis. (PR #296)
- **Gate Q8** — Nova regra de governança: verificar ordem de execução dos lotes antes de abrir PR.
- **T1 validado** — Projeto 2490006: `source='iagen' | gaps=3` após `completeOnda2` com fix aplicado.

### Removido
- **Lote C** — Hard delete de 1.705 projetos legados (cascade) para limpar banco de produção.

### Indicadores pós-Sprint S
| Indicador | Valor |
|---|---|
| Testes passando | 1.436 (0 falhas) |
| TypeScript erros | 1 pré-existente (Sprint T) |
| PRs mergeados | 295 |
| Corpus RAG | 2.454 chunks · 10 leis |
| Perguntas SOLARIS ativas | 24 (SOL-013..036) |
| Migrations | 62 |

---

## [Sprint M] — 2026-03-31 · `2f17184`

### Corrigido
- **BUG-UAT-03** `server/routers-fluxo-v3.ts` — `completeOnda2` gravava o status de origem (`onda2_iagen`) em vez do status de destino (`diagnostico_corporativo`). Toda procedure `completeOndaX` deve gravar o status DESTINO, não o status atual. (PR #254 · `199afc8`)
- **BUG-UAT-05** `client/src/components/DiagnosticoStepper.tsx` — Hardcode `"SOL-001 a SOL-012"` removido e substituído por descrição genérica. (PR #256 · `2f17184`)

### Adicionado
- **auth.testLogin** `server/routers.ts` — Endpoint de login de teste protegido por `E2E_TEST_MODE=true` e `E2E_TEST_SECRET`. Retorna `FORBIDDEN` em produção. 8 testes unit adicionados. (PR #256)
- **E2E Playwright** `tests/e2e/` — 5 suites cobrindo CT-01, CT-04, CT-06, CT-07 e CT-37 (fluxo completo Onda 1 → Onda 2 → Corporativo). (PR #256)
- **SOL-013/014 soft-delete** — Perguntas SOL-013 e SOL-014 desativadas via `ativo=0`. Corpus SOLARIS: SOL-001..012 ativos.
- **Painel PO** `docs/painel-po/index.html` — Atualizado com estado de 31/03/2026. (PR #257)

### Indicadores pós-Sprint M
| Indicador | Valor |
|---|---|
| Testes passando | 2.678 (vitest unit) |
| Suites E2E Playwright | 5 (CT-01/04/06/07/37) |
| TypeScript erros | 0 |
| PRs mergeados | 256 |
| Corpus SOLARIS ativo | SOL-001..012 (12 perguntas) |

---

## [Sprint K-4-D] — 2026-03-28 · `5d7ad7d`

### Adicionado
- Wiring completo das etapas 7-8 do `DiagnosticoStepper` (PR #184)
- Integração Onda 1 → Onda 2 → Plano Consolidado no fluxo de diagnóstico

### Corrigido
- **T06.1** (`onda1-t06-t10.test.ts`): asserção `questionario-corporativo-v2` → `questionario-solaris` (PR #184)

### Indicadores pós-K-4-D
| Indicador | Valor |
|---|---|
| Testes passando | 2.652 / 2.773 |
| TypeScript erros | 0 |
| PRs mergeados | 184 |

---

## [Sprint K-4-C] — 2026-03-27 · `e54d606`

### Adicionado
- Questionário IA Generativa (Onda 2 — Etapa 7) com geração dinâmica por CNAE (PR #182)
- Persistência de respostas da Onda 2 entre navegações do stepper
- Botão "Iniciar Questionário IA Generativa" com estado habilitado/desabilitado por progresso

### Indicadores pós-K-4-C
| Indicador | Valor |
|---|---|
| Testes passando | 2.648 / 2.769 |
| TypeScript erros | 0 |
| PRs mergeados | 182 |

---

## [Sprint K-4-B] — 2026-03-26 · `d72dc11`

### Adicionado
- Etapa 7 do `DiagnosticoStepper`: chip "Onda 2" visível e navegável (PR #177)
- Etapa 8 do `DiagnosticoStepper`: chip "Consolidação" desbloqueado após Onda 2 concluída (PR #177)
- Modal de confirmação ao retroceder das etapas 7-8 com dados preenchidos
- `MATRIZ-RASTREABILIDADE-v1.1.md` atualizado com rastreabilidade K-4-B

### Indicadores pós-K-4-B
| Indicador | Valor |
|---|---|
| Testes passando | 2.640 / 2.761 |
| TypeScript erros | 0 |
| PRs mergeados | 177 |

---

## [Sprint K — Onda 2 + Governança DEC-007] — 2026-03-28 · `5d7ad7d`

### Adicionado

**K-4-A — Migrations Onda 2 + VALID_TRANSITIONS** (`drizzle/schema.ts`, `server/db.ts`)
- Migration 0058: tabelas `onda2_questionario`, `onda2_respostas`, `onda2_status`, `cpie_onda2_state`
- `VALID_TRANSITIONS` — máquina de estados com 11 transições válidas, enforcement backend
- 36 novos testes unitários (K-4-A suite) · PRs #176–#178

**K-4-B — Stepper 8 etapas + Onda 1 completa** (`DiagnosticoStepper.tsx`, `ProjetoDetalhesV2.tsx`)
- Stepper visual com 8 etapas: Briefing → Questionário → CNAE → Diagnóstico → Relatório → Questionário IA Gen → Matrizes → Plano
- Rota `/questionario-solaris` substituindo `/questionario-corporativo-v2`
- 70 novos testes unitários (K-4-B suite) · PRs #179–#181

**K-4-C — QuestionárioIaGen + Onda 2 wiring** (`QuestionarioIaGen.tsx`, `routers-fluxo-v3.ts`)
- Componente `QuestionarioIaGen.tsx` — questionário de IA generativa para Onda 2
- Procedure `completeOnda2` + callback `onStartOnda2` no stepper
- Rota `/questionario-iagen` registrada em `App.tsx`
- 82 novos testes unitários (K-4-C suite) · PR #182

**K-4-D — Wiring etapas 7-8 + fix T06.1** (`DiagnosticoStepper.tsx`, `ProjetoDetalhesV2.tsx`)
- `onStartMatrizes` e `onStartPlano` adicionados à interface `DiagnosticoStepperProps`
- Cases `matrizes` e `plano` preenchidos no `handleStepStart`
- Fix T06.1: asserção atualizada de `questionario-corporativo-v2` para `questionario-solaris`
- PR #184 (branch limpo, zero conflitos)

**DEC-007 — Infraestrutura de Contexto para Agentes de IA**
- `docs/governance/ESTADO-ATUAL.md` — porta de entrada universal para todos os agentes
- `docs/governance/HANDOFF-IMPLEMENTADOR.md` — guia operacional para o Manus
- `docs/governance/CONTEXTO-ORQUESTRADOR.md` — estado do produto para o Claude
- `docs/governance/RASTREABILIDADE-COMPLETA.md` — PR × Sprint × RF × arquivo × status
- `.github/CODEOWNERS` — notificação automática ao P.O. em arquivos críticos
- 7 issues criadas no M4 (#187–#193) · PRs #185, #186, #194

### Corrigido
- T06.1 (`onda1-t06-t10.test.ts`): asserção `questionario-corporativo-v2` → `questionario-solaris`

### Indicadores pós-Sprint K
| Indicador | Valor |
|---|---|
| Testes passando | 2.652 / 2.773 |
| TypeScript erros | 0 |
| PRs mergeados | 189 |
| Tabelas no schema | 63 |
| Migrations aplicadas | 60 |
| Corpus RAG chunks | 2.078 |

---

## [Sprint de Governança CI/CD] — 2026-03-25

### Adicionado
- PR template unificado com evidência JSON obrigatória (`.github/pull_request_template.md`)
- Workflow `pr-governance.yml` — validação automática de PR body e file guard em todos os PRs
- Workflow `test-suite.yml` — TypeScript + Vitest em todo PR (pnpm)
- Workflow `migration-guard.yml` — disciplina obrigatória em migrations
- Scripts `validate-pr-body.js` e `changed-files-guard.js` (Node.js puro, sem dependências)
- 9 labels de governança: `db:migration`, `critical-path`, `rag:review`, `risk:low`, `risk:medium`, `risk:high`, `needs-orchestrator`, `blocked`, `observability`
- `docs/DEFINITION-OF-DONE.md` — DoD formal por tipo de entrega

### Expandido
- `structural-fix-gate.yml` — 5º job `governance-check` adicionado (roda em todos os PRs, sem if de label)
- `structural-gate-summary` — `needs` atualizado para incluir `governance-check`

### Backup
- `.github/PULL_REQUEST_TEMPLATE/backup-original-pr-template.md` — template anterior preservado

---

## [Governança v2 — Modelo Operacional] — 2026-03-25 · `1e0664c`

### Adicionado
- `docs/MODELO-OPERACIONAL.md` v1.0 — papéis (P.O., Orquestrador, Implementador, Consultor)
- Sprint de Governança registrada como P0 no BASELINE e PRODUCT-LIFECYCLE

### Atualizado
- `docs/INDICE-DOCUMENTACAO.md` v2.06 — 130 documentos, Categoria 1 com MODELO-OPERACIONAL
- `docs/PRODUCT-LIFECYCLE.md` v1.2 — Orquestrador como persona, Gate Fase 4 com verificação independente
- `docs/BASELINE-PRODUTO.md` v1.2 — novo modelo operacional, Sprint Governança P0

---

## [Baseline Unificado + Playruns + Suporte] — 2026-03-25 · `bc83f9b`

### Adicionado
- `docs/BASELINE-PRODUTO.md` v1.0 — documento vivo unificado
- `docs/PRODUCT-LIFECYCLE.md` v1.0 — ciclo de vida do produto com 8 fases e gates
- `docs/playruns/PLAYRUN-TEMPLATE.md` + `PLAYRUN-001-SUB-SPRINT-PREFILL-CONTRACT.md`
- `docs/suporte/FAQ.md`, `MANUAL-USUARIO.md`, `ESCALACAO.md`
- `docs/MODELO-OPERACIONAL.md` — modelo operacional de papéis

### Removido
- `docs/STATUS-BASELINE-PROPOSTA-TESTES.md` — conteúdo migrado para BASELINE-PRODUTO.md

---

## [5.6.0] — Cache Warm-up + Tracer refineCnaes + Alerta de Deploy - 2026-03-21

### Adicionado

**Warm-up do Cache de Embeddings no Startup** (`server/cnae-embeddings.ts`, `server/_core/index.ts`)

- Nova função exportada `warmUpEmbeddingCache()`: idempotente, retorna `{ loaded, size, durationMs }`, segura para chamar múltiplas vezes.
- Chamada via `setImmediate` durante o startup do servidor, sem bloquear o `server.listen`.
- Elimina o cold start: os 1.332 embeddings são carregados em memória antes da primeira requisição do usuário após cada deploy.
- Log no startup: `[startup] ✅ Cache de embeddings pré-carregado: 1332 CNAEs em Xms`.

**Tracer Estruturado no `refineCnaes`** (`server/routers-fluxo-v3.ts`)

- 9 etapas instrumentadas: `start`, `project_loaded`, `embedding_context_start`, `embedding_context_done`, `llm_call_start`, `llm_call_done`, `llm_call_error`, `serialize_start`, `serialize_done`, `finish`.
- Cada etapa registra `requestId` único e latência individual em ms.
- Agora é possível diagnosticar falhas no botão "Pedir nova análise" com precisão, identificando em qual etapa o pipeline parou.

**Alerta Automático de Versão Pós-Deploy** (`server/_core/index.ts`)

- Em `NODE_ENV=production`, o servidor envia notificação ao owner via `notifyOwner()` a cada restart/deploy.
- Inclui: versão semântica, git hash, commit message, ambiente, versão do Node e timestamp ISO.
- Facilita controle de deploy sem acesso a logs: o owner recebe confirmação imediata de qual versão está rodando.

### Testes
- 37 testes unitários passando em 914ms (tracer-version.test.ts + cnae-health-validator.test.ts).

---

## [5.5.0] - Tracing Estruturado + Controle de Versão do Deploy - 2026-03-21

### Adicionado

**Tracing Estruturado por Requisição** (`server/tracer.ts`, `server/routers-fluxo-v3.ts`)

- Novo módulo `tracer.ts` com `createTrace(operation, context)` que gera um `requestId` único de 8 chars por chamada.
- Cada etapa do pipeline é registrada com latência individual em ms: `project_loaded`, `embedding_context_start`, `embedding_context_done`, `llm_call_start`, `llm_call_done`, `fallback_start`, `fallback_embedding_done`, `fallback_embedding_error`, `fallback_hardcoded`.
- Saída JSON estruturada: `{"trace":"step","requestId":"A1B2C3D4","operation":"extractCnaes","step":"llm_call_done","t":1823,...}` — facilita grep/parsing em logs de produção.
- Nível de log configurável via `TRACE_LEVEL`: `"debug"` (todos os steps), `"info"` (apenas start/finish), `"off"` (desabilitado). Padrão: `"debug"` em dev, `"info"` em produção.
- `requestId` incluído nas notificações `notifyOwner` e nos logs de erro para correlação entre alertas e logs.
- `requestId` retornado na resposta do `extractCnaes` para correlação no frontend.

**Endpoint `GET /api/version`** (`server/build-version.ts`, `server/_core/index.ts`)

- Rota REST pública que retorna metadados do build: `version` (semântica), `gitHash` (7 chars do commit), `commitTime`, `commitMessage`, `serverTime`, `env`, `uptimeSeconds`, `nodeVersion`.
- Campo `howToVerify` explica como comparar o `gitHash` com o ID do checkpoint Manus para confirmar que o deploy está atualizado.
- **Como usar:** `curl https://iasolaris.manus.space/api/version` → compare `gitHash` com os primeiros 7 chars do ID do checkpoint publicado.

**Diagnóstico Confirmado**

- O endpoint `/api/health/cnae` em produção retornava HTML (SPA React) ao invés de JSON, confirmando que a versão publicada era anterior à Sprint v5.4.0. O deploy precisava ser atualizado.

**Testes Unitários** (`server/tracer-version.test.ts`)

- 21 novos testes cobrindo: `createTrace` (10 cenários), `getBuildVersionInfo` (9 cenários), `GET /api/version` (1 integração).
- Total acumulado: 72 testes passando em 853ms.

---

## [5.4.0] - Observabilidade e Teste Automatizado CNAE - 2026-03-21

### Adicionado

**Endpoint de Diagnóstico `GET /api/health/cnae`** (`server/cnae-health.ts`, `server/_core/index.ts`)

- Rota REST pública que retorna o status completo do pipeline CNAE Discovery em JSON.
- Não requer autenticação — permite diagnósticos rápidos sem acesso a logs de produção.
- Resposta inclui 4 componentes: `openaiKey` (chave presente + prefixo), `embeddingsDb` (contagem + cobertura + última atualização), `embeddingsCache` (estado do cache em memória + tamanho + idade), `lastRebuild` (status + CNAEs processados + duração + timestamp).
- Status geral: `"ok"` (todos os componentes OK), `"degraded"` (cache não carregado ou rebuild pendente), `"down"` (chave ausente ou embeddings insuficientes).
- HTTP 200 para `ok`/`degraded`, HTTP 503 para `down`.
- Versão do pipeline incluída na resposta (`"version": "5.4.0"`).

**Função `getCacheStatus()`** (`server/cnae-embeddings.ts`)

- Nova função exportada que retorna o estado atual do cache em memória sem disparar carregamento.
- Retorna `{ loaded: boolean, size: number, ageMinutes: number }` para uso pelo health check.

**Validação Automática Pós-Rebuild** (`server/cnae-pipeline-validator.ts`, `server/embeddings-scheduler.ts`)

- Novo módulo `cnae-pipeline-validator.ts` com 4 casos de teste canônicos:
  - Cervejaria artesanal → CNAE `1113-5/02` (Fabricação de cervejas e chopes)
  - Desenvolvimento de software → CNAE `6201-5/01` (Desenvolvimento de programas sob encomenda)
  - Restaurante/lanchonete → CNAE `5611-2/01` (Restaurantes e similares)
  - Farmácia/drogaria → CNAE `4771-7/01` (Comércio varejista de produtos farmacêuticos)
- Verifica cobertura mínima de 95% dos 1.332 CNAEs no banco.
- Verifica dimensionalidade dos embeddings (1.536 dims = `text-embedding-3-small`).
- Resultado enviado via `notifyOwner()` com detalhes de cada caso (rank encontrado, erros).
- Integrado ao `embeddings-scheduler.ts`: executa automaticamente após cada rebuild semanal bem-sucedido.

**Testes Unitários** (`server/cnae-health-validator.test.ts`)

- 16 novos testes cobrindo: `getCacheStatus`, `checkCnaeHealth` (5 cenários), `validateCnaePipeline` (5 cenários), `runAndNotifyValidation` (2 cenários).
- Todos os 16 testes passando em <500ms.

---

## [5.2.0] - Resiliência CNAE Discovery — Timeout + Alertas Granulares - 2026-03-21

### Adicionado
- **Timeout explícito de 25s** no `extractCnaes`: `timeoutMs: 25_000` + `maxRetries: 1`. GPT-4.1 responde em <5s normalmente; acima disso o fallback semântico garante sugestões ao usuário imediatamente.
- **Detecção de fallback semântico no frontend**: estado `isCnaeFallback` detecta quando os CNAEs vêm do fallback (confidence ≤70 + justificativa padrão).
- **Banner de aviso no modal de CNAEs**: quando o fallback semântico é ativado, exibe alerta amber orientando o usuário a revisar as sugestões ou pedir nova análise.
- **Alerta imediato de chave expirada** no job de rebuild de embeddings: HTTP 401/403 da OpenAI aborta o rebuild e envia `notifyOwner` com instruções de ação.
- **Alerta de falha parcial** no rebuild: se >10% dos batches falharem, envia `notifyOwner` com taxa de erro e último erro.
- **Log diferenciado TIMEOUT vs ERROR** no `extractCnaes`: facilita diagnóstico nos logs do servidor.

---

## [5.1.0] - Fix CNAE Discovery + Monitoramento LLM - 2026-03-21

### Corrigido

**Bug Crítico: CNAE Discovery retornava "Nenhum CNAE identificado" em produção**

- **Causa raiz**: O commit `ff024f5` (Sprint V71) migrou o `llm.ts` de Gemini 2.5 Flash (via `BUILT_IN_FORGE_API_KEY`) para **GPT-4.1 via `api.openai.com` diretamente**, mas a `OPENAI_API_KEY` não havia sido configurada como secret no ambiente de produção (`iasolaris.manus.space`). Toda chamada ao `extractCnaes` falhava com `"OPENAI_API_KEY is not configured"`, ativando o `onError` no frontend e abrindo o modal de CNAE vazio.
- **Fix**: `OPENAI_API_KEY` configurada como secret no ambiente de produção. Validada: GPT-4.1 acessível + `text-embedding-3-small` gerando embeddings de 1.536 dimensões.
- **Impacto**: Todos os fluxos dependentes de LLM (questionário, briefing, riscos, plano de ação) também estavam afetados em produção.

### Adicionado

**Monitoramento de Erros LLM — `extractCnaes` e `refineCnaes`** (`server/routers-fluxo-v3.ts`)

- **Logging estruturado** no `catch` do `extractCnaes`: emite `console.error` com `projectId`, preview da descrição (120 chars) e mensagem de erro exata — facilita diagnóstico via logs do servidor sem necessidade de vasculhar o histórico Git.
- **Logging em cascata** no fallback de embeddings: se o LLM falha E o embedding também falha, loga `[FALLBACK_ERROR]` com o erro do embedding; se nenhum candidato é encontrado, loga `[FATAL]` antes de re-lançar.
- **Log de sucesso do fallback**: `[FALLBACK_OK]` registra quantos candidatos semânticos foram usados quando o LLM falhou mas o embedding funcionou.
- **Notificação ao owner** via `notifyOwner()` quando `extractCnaes` ou `refineCnaes` falham — alerta imediato em produção sem depender de monitoramento externo.
- **Logging estruturado** no `catch` do `refineCnaes`: emite `console.error` com `projectId`, iteração, preview da descrição e mensagem de erro.

### Formato dos logs

```
[extractCnaes][ERROR]          projectId=123 | descPreview="..." | erro=...
[extractCnaes][FALLBACK_ERROR] projectId=123 | embedding também falhou: ...
[extractCnaes][FALLBACK_OK]    projectId=123 | usando 5 candidatos semânticos
[extractCnaes][FATAL]          projectId=123 | nenhum candidato disponível — re-lançando erro original
[refineCnaes][ERROR]           projectId=123 | iter=2 | descPreview="..." | erro=...
```

---

## [5.0.0] - v2.1 Company Profile Layer - 2026-03-19

### Adicionado

**v2.1 — Company Profile Layer (Tarefa 1 do Roadmap v2.1)**

- **5 colunas JSON** na tabela `projects`: `companyProfile`, `operationProfile`, `taxComplexity`, `financialProfile`, `governanceProfile` (migração `0040_faithful_sunfire.sql`)
- **Accordion "Perfil da Empresa"** no `NovoProjeto.tsx` — opcional, colapsa por padrão
- **Bloco 1 — Identificação:** CNPJ com validação de dígito verificador (módulo 11), Ano de Fundação, Estado (UF), Número de Funcionários, Faturamento Anual, Regime Tributário
- **Bloco 2 — Operação:** Tipo de Operação (toggle), Tipo de Cliente (checkboxes: B2B/B2C/Governo), Abrangência Geográfica
- **Bloco 3 — Complexidade Tributária:** 3 perguntas Sim/Não (filiais, importação/exportação, regimes especiais)
- **Bloco 4 — Financeiro:** Meios de Pagamento (checkboxes: Pix/Cartão/Boleto/Outros), Intermediários financeiros
- **Bloco 5 — Governança:** 3 perguntas Sim/Não (equipe tributária, auditoria, passivo tributário)
- **`CompanyContext`** no `cnae-embeddings.ts`: `buildSemanticCnaeContext` enriquece a busca semântica com regime tributário, porte e tipo de operação
- **`extractCnaes`** passa `companyProfile` + `operationProfile` do projeto ao `buildSemanticCnaeContext`
- **`createProject`** aceita e persiste os 5 blocos de Company Profile

### Compatibilidade
- Todos os campos são opcionais — projetos existentes não são afetados
- Branch: `feature/v2.1-company-profile`

---

## [4.5.0] - Sprint V74 - 2026-03-18 (build recompilado)

### Corrigido

**V74 — Bug Fix: Geração Automática do Plano de Ação após Aprovação da Matriz de Riscos**

- **Causa raiz**: `MatrizesV3.handleApprove` não invalidava o cache tRPC antes de navegar para `/plano-v3`. O `PlanoAcaoV3` recebia o projeto com status antigo (`"matriz_riscos"`) do cache, não reconhecia `"plano_acao"` e não disparava a geração automática.
- **Fix 1** (`client/src/pages/MatrizesV3.tsx`): Adicionado `await utils.fluxoV3.getProjectStep1.invalidate({ projectId })` antes de `setLocation(...)` no `handleApprove`, garantindo que o cache seja limpo antes da navegação
- **Fix 2** (`client/src/pages/PlanoAcaoV3.tsx`): Adicionado `refetchOnMount: "always"` e `staleTime: 0` na query `getProjectStep1`, garantindo que a página sempre busque dados frescos do servidor ao montar
- TypeScript: zero erros após todas as mudanças

---

## [4.4.0] - Sprint V73 - 2026-03-18

### Adicionado

**V73 — Agendamento Automático de Rebuild de Embeddings CNAE**

- **`server/embeddings-scheduler.ts`** — Módulo `node-cron` com cron job `0 3 * * 1` (toda segunda-feira às 03:00 BRT)
  - Executa rebuild completo dos 1.332 CNAEs via OpenAI `text-embedding-3-small` em batches de 95
  - Registra cada execução na tabela `embeddingRebuildLogs` com status, CNAEs processados, erros e duração
  - Envia notificação ao owner via `notifyOwner()` ao concluir (✅) ou falhar (❌)
  - Proteção contra execução dupla via `rebuildState.running`
  - Graceful shutdown: `task.stop()` no evento `SIGTERM`
- **`drizzle/schema.ts`**: Nova tabela `embeddingRebuildLogs` com campos `triggeredBy`, `triggeredByUserId`, `status`, `totalCnaes`, `processedCnaes`, `errorCount`, `lastError`, `durationSeconds`, `startedAt`, `finishedAt`. Migração `0037_aberrant_songbird`
- **`server/routers-admin-embeddings.ts`**: Procedure `adminEmbeddings.getHistory` — retorna as últimas 20 execuções ordenadas por data
- **`client/src/pages/AdminEmbeddings.tsx`**: Duas novas seções:
  - **Rebuild Automático Agendado** — exibe frequência, horário e tipo de notificação
  - **Histórico de Rebuilds** — tabela com data, disparador (cron/manual), status, CNAEs, erros e duração
- **`server/_core/index.ts`**: `initEmbeddingsScheduler()` chamado após WebSocket na inicialização do servidor

### Técnico
- Expressão cron: `0 3 * * 1` com timezone `America/São_Paulo`
- `runRebuild` e `rebuildState` exportados de `routers-admin-embeddings.ts` para reutilização no scheduler
- TypeScript: zero erros após todas as mudanças

---

## [4.3.0] - Sprint V72 - 2026-03-18

### Adicionado

**V72 — Endpoint de Administração de Embeddings CNAE**

- **`server/routers-admin-embeddings.ts`** — Router tRPC exclusivo para `equipe_solaris` com 3 procedures:
  - `adminEmbeddings.getStatus` — retorna cobertura, total no banco e estado do rebuild em andamento
  - `adminEmbeddings.rebuild` — dispara rebuild completo em background (batches de 95 CNAEs via OpenAI `text-embedding-3-small`)
  - `adminEmbeddings.invalidateCache` — invalida o cache em memória do servidor sem chamar a API
- **`client/src/pages/AdminEmbeddings.tsx`** — Página de administração com:
  - Cards de status: CNAEs no banco, cobertura % com barra de progresso, data da última atualização
  - Barra de progresso em tempo real via WebSocket (`embeddings:rebuild:started/progress/completed/error`)
  - Log de eventos com scroll automático e código de cores (info/success/error/progress)
  - Informações técnicas: modelo, dimensões, batch size, métrica de similaridade
- **Sidebar**: Link "Embeddings" com ícone `Cpu` visível apenas para `equipe_solaris`
- **Rota `/admin/embeddings`** registrada no `App.tsx`

### Técnico
- Controle de acesso via middleware `solarisOnly` (lança `FORBIDDEN` para outros papéis)
- Estado singleton `rebuildState` previne execuções paralelas (retorna `CONFLICT` se já rodando)
- Após rebuild: `invalidateEmbeddingCache()` é chamado automaticamente para forçar recarga
- Progresso emitido via `notifyUser()` do WebSocket existente (sem dependências novas)
- TypeScript: zero erros após todas as mudanças

---

## [4.2.0] - Sprint V71 - 2026-03-18

### Adicionado

**V71 — Busca Semântica de CNAEs via Embeddings Vetoriais (OpenAI text-embedding-3-small)**

Substituição completa do RAG baseado em tokens e dicionário de sinônimos hard-coded por busca vetorial semântica, garantindo precisão na identificação de múltiplas atividades distintas em uma mesma descrição de negócio.

- **`drizzle/schema.ts`**: Nova tabela `cnaeEmbeddings` com campos `cnaeCode`, `cnaeDescription`, `embeddingJson` (TEXT, 1536 dimensões) e `createdAt`. Migração `0036_cnae_embeddings`
- **`scripts/generate-cnae-embeddings.mjs`**: Script de geração em batch (14 batches de ~95 CNAEs) que chama `text-embedding-3-small` para todos os 1.332 CNAEs e persiste no banco. Idempotente (upsert por código)
- **`server/cnae-embeddings.ts`**: Módulo principal com:
  - `findSimilarCnaes(description, topN)` — gera embedding da query via OpenAI API e calcula similaridade de cosseno contra cache em memória (TTL 1h)
  - `buildSemanticCnaeContext(description, topNPerQuery=20)` — estratégia **multi-query**: divide a descrição em cláusulas por atividade (vírgula, ponto-e-vírgula, "e", "além de"), busca em paralelo para cada cláusula
  - **Estratégia de merge em 2 camadas**: top-5 de cada cláusula individual são "garantidos" (sempre entram no contexto), completado com pool geral até 50 candidatos
  - `invalidateEmbeddingCache()` para re-geração sob demanda
  - `getFallbackCandidates()` para fallback síncrono quando a API OpenAI falha
- **`server/routers-fluxo-v3.ts`**: `extractCnaes` e `refineCnaes` substituem `buildCnaeRagContext` / `findCandidateCnaes` por `buildSemanticCnaeContext`

### Melhorado

**V71 — Prompt de Identificação de CNAEs (extractCnaes)**
- Instrução explícita de 2 passos: (1) decompor a descrição em atividades distintas, (2) selecionar CNAE para cada atividade
- Contexto rotulado como "candidatos selecionados por similaridade semântica" para orientar o modelo

### Técnico
- **Teste validado** (`scripts/test-ze-final.mjs`): descrição com 3 atividades distintas → todos os 3 CNAEs garantidos no contexto:
  - `4632-0/01` Comércio Atacadista De Cereais E Leguminosas (posição 1, 73.2% — GARANTIDO)
  - `4930-2/01` Transporte Rodoviário De Carga (posição 8, 60.6% — GARANTIDO)
  - `4683-4/00` Corretivos Do Solo / Insumos Agrícolas (posição 14, 56.0% — GARANTIDO)
- O módulo `cnae-rag.ts` (RAG por tokens) é mantido como referência histórica mas não é mais chamado pelo fluxo principal
- TypeScript: zero erros após todas as mudanças

---

## [4.1.0] - Sprint V70.3 - 2026-03-18

### Corrigido

**V70.3 — Bug Fix Crítico: Plano de Ação não gerava após Matriz de Riscos**

- **Causa raiz**: `generateActionPlan` fazia 4 chamadas LLM sequenciais (~3 min total), causando timeout HTTP antes da resposta chegar ao browser
- **Fix 1** (`server/routers-fluxo-v3.ts`): Loop `for...of` substituído por `Promise.all` paralelo — as 4 áreas (Contabilidade, Negócio, TI, Jurídico) são geradas simultaneamente. Redução: ~3 min → ~45 s
- **Fix 2** (`server/_core/index.ts`): `server.timeout = 300s` e `keepAliveTimeout = 310s` configurados no HTTP server Express para suportar chamadas LLM longas sem cortar a conexão
- **Fix 3** (`client/src/pages/PlanoAcaoV3.tsx`): Tela de loading atualizada para informar geração paralela das 4 áreas e tempo esperado (~1 min)

### Melhorado

**V70.3 — Otimização: Paralelização de todas as procedures LLM sequenciais**

- **`generateRiskMatrices`** (`server/routers-fluxo-v3.ts`): Loop `for...of areas` → `Promise.all` paralelo. RAG compartilhado (1 busca para 4 áreas). Redução: ~3 min → ~45 s
- **`generateAll`** (`server/routers-assessments.ts`): Loop `for...of projectBranches` → `Promise.allSettled` paralelo. Não falha tudo se 1 ramo falhar. Retorna contador de falhas (`failed`)
- **`notifyNewComment`** (`server/routers-notifications.ts`): Loop `for...of recipientIds` → `Promise.allSettled` paralelo. Melhora latência em grupos com muitos destinatários

### Técnico
- Padrão adotado: `Promise.all` para operações críticas que devem falhar juntas (LLM), `Promise.allSettled` para operações independentes (notificações, ramos opcionais)
- TypeScript: zero erros após todas as mudanças

---

## [4.0.0] - Sprint V69 - 2026-03-17

### Adicionado

**V69 — Onboarding Guiado para Advogados**
- **Tour interativo step-by-step** (6 passos) com overlay escuro, spotlight no elemento alvo e tooltip posicionado dinamicamente
- **Disparo automático no primeiro login**: `getStatus` detecta `isNew = true` e abre o tour sem ação do usuário
- **Botão "Retomar Tour"** no sidebar com badge "Novo" quando o usuário tem progresso parcial
- **Persistência por usuário**: tabela `onboardingProgress` no banco (migração 0029), procedures `getStatus`, `markStep`, `skip`, `reset`
- **Barra de progresso** (X/6 etapas) e botões Próximo / Pular / Concluir Tour
- `server/routers-onboarding.ts`: router tRPC com 4 procedures protegidas
- `client/src/components/OnboardingTour.tsx`: componente com `createPortal`, spotlight via `box-shadow`, posicionamento dinâmico
- `client/src/components/ComplianceLayout.tsx`: integração do tour e botão de retomada no sidebar

### Testes
- `sprint-v69-e2e.test.ts`: 19 testes (fluxo completo, skip, reset, idempotência, validação Zod, edge cases)
- **160/160 testes passando** (141 anteriores + 19 V69)

---

## [3.9.0] - Sprint V66 - 2026-03-17

### Adicionado

**V66 — Expansão do Corpus RAG (25 → 63 artigos)**
- `server/rag-corpus.ts` expandido: +12 Resoluções CG-IBS, +11 IN RFB/CBS, +14 Convênios CONFAZ
- **CG-IBS**: alíquotas de referência, split payment (PIX/cartão), cashback baixa renda, contencioso TA-IBS, regimes especiais setoriais, cooperativas, distribuição entre entes
- **RFB/CBS**: migração PIS/COFINS→CBS, EFD-Contribuições, NF-e/NFS-e, Simples Nacional, CBS-Importação, serviços financeiros (método de adição)
- **Convênios CONFAZ**: transição geral, créditos acumulados, ICMS-ST, benefícios fiscais, DIFAL, obrigações acessórias, energia, telecom, Zona Franca, agronegócio, construção civil, e-commerce, farmacêutico, automotivo
- Enum `lei` expandido: `cg_ibs`, `rfb_cbs`, `conv_icms` (migração 0028)
- Script `rag-ingest.mjs` atualizado: importa do `rag-corpus.ts` via `tsx` em tempo real
- **Banco limpo** para testes da equipe de advogados (users + projetos zerados, corpus preservado)

### Testes
- `sprint-v66-e2e.test.ts`: 32 testes (integridade, busca semântica, cobertura setorial, prazos críticos)
- **141/141 testes passando** (86 V60-V63 + 23 V64-V65 + 32 V66)
- Precisão de citação RAG estimada: ~90% (25 artigos) → ~95% (63 artigos)

---

## [3.8.0] - Sprints V64+V65 - 2026-03-17

### Adicionado

**V65 — RAG Híbrido (LIKE + Re-ranking LLM)**
- `server/rag-corpus.ts` — Corpus de 25 artigos reais: EC 132/2023, LC 214/2025, LC 227/2024
- `server/rag-retriever.ts` — Motor de busca híbrido: `retrieveArticlesFast` (LIKE) + `retrieveArticles` (re-ranking LLM temperatura 0.0)
- `server/rag-ingest.mjs` — Script de ingerão do corpus no banco (25 chunks)
- Tabela `ragDocuments` no schema + migração 0027
- Substituição completa do `cnae-articles-map.ts` nos 5 pontos de injeção de contexto
- Instrução anti-alucinação: "cite apenas artigos fornecidos no contexto"
- Fallback silencioso quando banco indisponível ou corpus vazio

**V64 — Alertas Visuais de Inconsistência**
- `client/src/components/AlertasInconsistencia.tsx` — Badge + painel expansível + modal de detalhes
- Codificação por cor: alto=vermelho, medio=laranja, baixo=amarelo
- Procedure `getBriefingInconsistencias` no router
- `getProjectSummary` agora expõe `inconsistencias[]` e `briefingStructured`
- `BriefingV3` integrado com refetch automático após gerar novo briefing

### Testes
- `sprint-v64-v65-e2e.test.ts`: 23 testes — V64 (4 testes) + V65 (10 testes) + Edge Cases (6) + Integração (3)
- `sprint-v60-v63-e2e.test.ts`: 86 testes — atualizados para compatibilidade com RAG V65
- **Total acumulado: 109/109 testes passando**

---

## [3.7.0] - Sprints V60-V63 - 2026-03-17

### Adicionado

**V60 — Production Pack**
- `server/ai-schemas.ts` — Schemas Zod enriquecidos para todos os outputs de IA
- `server/ai-helpers.ts` — `generateWithRetry`, `invokeLLMStructured`, `calculateGlobalScore`
- Temperatura 0.2 em todos os 7 pontos de diagnóstico; 0.4 no `momento_wow`; 0.0 no re-ranking
- System prompts com papéis definidos: Auditor de Riscos, Consultor Sênior, Sócio de Tributação

**V61 — Scoring Financeiro + Confidence Score**
- `calculateGlobalScore` com `impacto_estimado`, `custo_inacao`, `prioridade`
- `ConfidenceSchema` com `nivel_confianca` + `recomendacao` enum
- Campos `scoringData`, `briefingStructured`, `faturamentoAnual` no banco

**V62 — Pré-RAG Estático** (substituído pelo RAG dinâmico na V65)
- `server/cnae-articles-map.ts` — 20 grupos CNAE mapeados para artigos regulatórios

**V63 — Motor de Decisão Explícito**
- `DecisaoResponseSchema` com `acao_principal`, `prazo_dias`, `risco_se_nao_fazer`, `momento_wow`
- Procedure `generateDecision` integrada ao `approveActionPlan`
- Tela de conclusão do `PlanoAcaoV3` exibe a decisão executiva

### Testes
- `sprint-v60-v63-e2e.test.ts`: 86 testes — 5 projetos × 3 CNAEs cada, cobertura completa V60-V63

---

## [3.6.0] - Sprint V56 - 2026-03-17

### Corrigido

**Bug BUG-04: 404 em /usuarios**
- Criada página `Usuarios.tsx` completa com listagem, filtros, busca e gerenciamento de papéis
- Rota `/usuarios` registrada no `App.tsx`
- Procedures `users.updateRole` e `users.deleteUser` adicionadas ao servidor com controle de acesso por papel

**Bug BUG-05 / BUG-06: 0 Riscos Mapeados e 0 Tarefas Criadas**
- Causa raiz: campos `briefingContent`, `riskMatricesData` e `actionPlansData` não existiam na tabela `projects`
- Adicionados os 3 campos ao schema Drizzle (`drizzle/schema.ts`) como `text` nullable
- Migração executada via `pnpm db:push`
- `getProjectStep1` atualizado para retornar os 3 novos campos
- `getProjectSummary` agora lê corretamente `riskMatricesData` e `actionPlansData` do banco

**Bug BUG-07: Questionário bloqueado para edição**
- `cnaeProgress` agora restaura o estado de progresso a partir das respostas salvas no banco (`savedProgress.answers`)
- CNAEs já respondidos aparecem como concluídos ao reabrir o questionário

**Bug BUG-08: Re-edição de Briefing, Matrizes e Plano de Ação**
- `BriefingV3`: carrega conteúdo salvo do banco ao invés de sempre regenerar; aviso azul "Briefing aprovado anteriormente" exibido
- `MatrizesV3`: carrega matrizes salvas do banco; aviso azul "Matrizes de riscos aprovadas anteriormente" exibido
- `PlanoAcaoV3`: carrega plano salvo do banco; tela de conclusão exibida automaticamente quando projeto está aprovado; botão "Editar Plano de Ação" adicionado

### Adicionado

**Página de Usuários (`/usuarios`) — Completa**
- Listagem de todos os usuários com avatar, nome, email e data de último login
- Filtro por papel (equipe_solaris, advogado_senior, advogado_junior, cliente)
- Busca por nome ou email em tempo real
- Seleção de papel via `Select` com confirmação por modal de diálogo
- Estatínticas no topo: total de usuários, ativos nos últimos 7 dias, por papel
- Controle de acesso: apenas `equipe_solaris` pode alterar papéis

**Notificações de Re-geração**
- Banner azul no `BriefingV3` quando o briefing já foi aprovado anteriormente
- Banner azul no `MatrizesV3` quando as matrizes já foram aprovadas anteriormente

**Limpeza Completa do Banco**
- Todas as tabelas de dados de teste truncadas (projetos, clientes, questionários, briefings, matrizes, planos, tarefas)
- Tabela `users` preservada (1.264 registros)

**Testes de Regressão — Sprint V56 (33 testes)**
- `sprint-v56-regression.test.ts`: 33 testes cobrindo:
  - Verificação de limpeza do banco
  - Fluxo de upsertUser (criação de novos usuários via OAuth)
  - Controle de acesso para `users.updateRole`
  - Estatísticas de usuários (`getStats`)
  - Schema dos novos campos (`briefingContent`, `riskMatricesData`, `actionPlansData`)
  - Contagem de riscos e tarefas no `getProjectSummary`
  - Retorno de campos de conteúdo no `getProjectStep1`
  - Fluxo completo de re-edição (regressão end-to-end)

---

## [3.5.0] - Sprint V55 - 2026-03-17

### Adicionado

**Dropdown de "Situação do Projeto" na ProjetoDetalhesV2**
- Substituiu o badge estático de status por um `Select` interativo do shadcn/ui no header da página de detalhes
- Ícone `Tag` ao lado do dropdown para sinalizar visualmente o campo de situação
- Indicador circular colorido em cada opção do dropdown (ponto colorido por status)
- Spinner de carregamento (`RefreshCw` animado) durante a mutação de atualização
- Controle de permissões: equipe SOLARIS vê todos os 11 status; clientes vêem apenas o status atual + "Em Avaliação"
- Persistência via mutação tRPC `projects.updateStatus` com feedback de toast

**Filtros de Status na Lista de Projetos (Projetos.tsx)**
- Dropdown de filtro por status com todas as 11 opções + "Todos os status"
- Indicador colorido (ponto) em cada opção do filtro
- Botão de limpar filtros (X) quando há filtros ativos
- Contador de resultados com informação sobre filtros ativos
- Skeleton de carregamento nos cards de projetos
- Estado vazio melhorado com botão "Limpar Filtros" quando há filtros ativos

**Testes Unitários — Sprint V55 (36 testes)**
- `sprint-v55-status-transitions.test.ts`: 36 testes cobrindo:
  - Permissões por papel (equipe_solaris, advogado_senior, cliente, advogado_junior)
  - Transições permitidas e bloqueadas por papel
  - Opções do dropdown filtradas por papel
  - Traduções de status em português
  - Filtros de status na lista de projetos
  - Lógica de auto-avanço de status no servidor

### Alterado

**Procedure `projects.updateStatus` (routers.ts)**
- Adicionado log de auditoria no console com papel do usuário e IDs
- Retorno enriquecido com `changedBy` (papel do usuário que realizou a mudança)

---

## [3.3.0] - Sprint V53 - 2026-03-17

### Adicionado

**Máscara de CNPJ no Modal "Novo Cliente" (NovoProjeto.tsx)**
- Função `maskCnpj()` aplicada ao input em tempo real: formata como `XX.XXX.XXX/XXXX-XX` enquanto o usuário digita
- Validação inline: borda vermelha e mensagem de erro quando CNPJ tem número de dígitos inválido (diferente de 0 ou 14)
- Botão "Criar Cliente" desabilitado enquanto CNPJ está incompleto (exceto campo vazio)
- Limite `maxLength={18}` no input para impedir entrada excessiva

**RF-5.08 UI — Painel de Notificações por Tarefa (PlanoAcaoV3)**
- Substituiu checkboxes HTML nativos por `Switch` do shadcn/ui com `Label` acessível por ID único por tarefa
- Painel com borda e fundo sutil (`bg-muted/30`) para delimitar visualmente a seção de notificações
- Badge "Âmbar — Ativas" exibido no cabeçalho do painel quando ao menos uma opção está ativa
- Ícone de sino preenchido (`fill-amber-500`) no header do card quando há notificações ativas
- Campo `beforeDays` com clamping automático (1–30) e mensagem de erro se fora do intervalo
- Três toggles independentes: Mudança de status, Atualização de progresso, Novo comentário

**Badge "Revisado" no Stepper de CNAEs (RF-2.07 UX)**
- Badge âmbar exibido ao lado do código CNAE quando o usuário retorna a um CNAE concluído e confirma navegação
- Badge desaparece automaticamente ao re-concluir o CNAE via `handleFinishLevel1`

### Corrigido

**Bug 1 — CNPJ overflow no INSERT de novo cliente**
- Sanitização server-side no `routers-fluxo-v3.ts`: extrai dígitos, formata `XX.XXX.XXX/XXXX-XX` se 14 dígitos, trunca para 18 chars
- Migração de schema: `cnpj varchar(18)` → `varchar(20)` para margem de segurança

**Bug 2 — Botão "Avançar" não habilitava após criar cliente via modal**
- Estado `pendingClientName` adicionado ao `NovoProjeto.tsx`
- `selectedClient` usa `pendingClientName` como fallback imediato enquanto o refetch não retorna o novo cliente

**Bug 3 — Tela branca ao solicitar aprofundamento no QuestionarioV3**
- `loadedQuestionsRef` movido para antes dos `useEffect`s que o utilizam (ordem de declaração corrigida)
- `handleAcceptDeepDive` pré-registra `cacheKey` no ref antes de `setCurrentLevel` para evitar chamada dupla sem `previousAnswers`

### Testes
- 14 novos testes unitários passando (`bugfix-sprint-v53.test.ts`): Bug 1 (6), Bug 2 (4), Bug 3 (4)
- 9 testes para badge "Revisado" (`audit-rf207-badge-revisado.test.ts`)
- Checkpoints: `4f6f0b7e` (bugfix), `747892b3` (badge Revisado)

---

## [3.0.0] - Sprint V45 - 2026-03-16

### Adicionado

**Etapa 1 — Criação de Projeto com Extração de CNAEs via IA**
- Novo formulário de criação de projeto com 3 campos: Nome, Descrição (texto longo) e Cliente vinculado
- Busca de cliente com filtro em tempo real e botão "+ Novo Cliente" on-the-fly
- Extração automática de CNAEs via IA Gen (OpenAI) a partir da descrição da empresa
- Modal de confirmação de CNAEs com cards de relevância percentual (adicionar/editar/remover)
- Stepper visual das 5 etapas do fluxo

**Etapa 2 — Questionário Adaptativo por CNAE (2 Níveis)**
- Questionário gerado dinamicamente pela IA para cada CNAE confirmado
- Nível 1: até 10 perguntas essenciais por CNAE; Nível 2: aprofundamento opcional
- UX inspirada em SurveyMonkey: sim/não, escala Likert, múltipla escolha, texto livre, slider
- Salvamento automático de respostas a cada avanço

**Etapa 3 — Briefing de Compliance**
- Geração automática do Briefing via IA com renderização em Markdown
- Ciclo de aprovação: aprovar, solicitar correção ou fornecer mais informações
- Regeneração incorporando feedback até aprovação

**Etapa 4 — Matrizes de Riscos (4 Áreas)**
- 4 matrizes independentes: Contabilidade, T.I., Advocacia Tributária, Áreas de Negócio
- Colunas: Evento, Probabilidade, Impacto, Severidade (calculada), Plano de Ação
- Edição inline com ciclo de aprovação e regeneração parcial ou total

**Etapa 5 — Plano de Ação com Gestão de Tarefas**
- Plano gerado por área (Contabilidade, TI, Jurídico, Negócio)
- Gestão completa: status, % andamento, datas início/fim, responsável, notificações por e-mail
- Filtros por status, área, prazo e responsável
- Exportação CSV e PDF simples

### Alterado
- Menu lateral limpo: removidos 4 itens (Dashboard de Tarefas, Questionário Corporativo, Modelos Padrões, Painel de Indicadores Executivos)
- Corrigido nested `<a>` no ComplianceLayout
- Instalado `react-markdown` para renderização do briefing

### Testes
- 35 testes unitários passando: 14 (Etapa 1) + 21 (Etapas 2-5)
- Checkpoint: `5d49b4ab`

---

## [2.0.0] - Sprint V44 - 2026-03-16

### Adicionado
- Teste E2E completo do fluxo v2.0: 20/20 testes passando
- Fluxo validado: ModoUso → BriefingInteligente → QuestionarioRamos → PlanoAcaoSession → MatrizRiscosSession → Consolidacao
- Exportação de dados (JSON + CSV) com integridade cruzada validada
- Checkpoint: `b47e1af8`

---

## [1.0.0] - 2026-02-01

### 🎉 Release Inicial - Baseline v1.0

Esta é a primeira versão estável do Sistema de Compliance Tributária para Reforma Tributária Brasileira, pronta para produção. O sistema oferece fluxo completo end-to-end desde criação de projetos até geração de planos de ação personalizados via IA.

### ✨ Funcionalidades Principais

#### Gestão de Projetos
- Criação e gerenciamento de projetos de compliance tributário
- Controle de acesso baseado em roles (admin, user)
- Autenticação via Manus OAuth
- Dashboard com listagem e filtros de projetos

#### Assessment Tributário (Fase 1 e Fase 2)
- **Fase 1**: Formulário estruturado com dados básicos da empresa (regime tributário, porte, setor, receita anual)
- **Fase 2**: Questionário dinâmico gerado via IA baseado nas respostas da Fase 1
- Salvamento automático de progresso
- Validação de campos obrigatórios

#### Questionários Corporativos e por Ramo de Atividade
- Geração automática de questionário corporativo via IA
- Geração de questionários específicos por ramo de atividade (CNAE)
- Suporte a múltiplos ramos por projeto
- Histórico de versões de questionários

#### Geração de Planos de Ação
- **Plano Corporativo**: Gerado com base no assessment e questionário corporativo
- **Planos por Ramo**: Gerados individualmente para cada ramo de atividade
- Parsing robusto de JSON retornado pela IA (suporta markdown code blocks)
- Histórico completo de versões de planos

#### Matriz de Riscos
- Identificação e categorização de riscos tributários
- Avaliação de probabilidade e impacto
- Sugestão de controles e evidências
- Histórico de versões da matriz

### 🔧 Tecnologias e Arquitetura

**Frontend:**
- React 19 com TypeScript
- Tailwind CSS 4 para estilização
- Wouter para roteamento
- tRPC Client para comunicação type-safe com backend
- Shadcn/ui para componentes de UI

**Backend:**
- Node.js 22 com Express 4
- tRPC 11 para APIs type-safe
- Drizzle ORM para acesso ao banco de dados
- MySQL/TiDB como banco de dados
- Superjson para serialização avançada (suporte a Date, Map, Set)

**Integrações:**
- Manus OAuth para autenticação
- Manus LLM API para geração de conteúdo via IA
- Manus Storage (S3) para armazenamento de arquivos

### 🐛 Bugs Corrigidos

#### Sprint V27-V28: Erro de Salvamento Assessment Fase 1
- **Problema**: Drizzle ORM convertia `undefined` para `default` no SQL INSERT, causando erro em campos `completedAt`, `completedBy`, `completedByRole`
- **Solução**: Migração do banco (ALTER TABLE para aceitar NULL) + correção do código (destructuring explícito sem campos completed*)
- **Testes**: 3/3 testes unitários validados
- **Issues**: #58 (GitHub)

#### Sprint V29: Erro "Ramo não encontrado" na Geração de Planos
- **Problema**: Frontend enviava `branch.id` (ID do relacionamento) ao invés de `branch.branchId` (ID do ramo)
- **Solução**: Correção em PlanoAcao.tsx linhas 309 e 322
- **Testes**: 4/4 testes unitários validados
- **Issues**: #59 (GitHub)

#### Sprint V30: Erro de Parsing JSON na Geração de Planos
- **Problema**: IA retornava JSON envolvido em markdown code blocks (\`\`\`json ... \`\`\`), causando erro no `JSON.parse()`
- **Solução**: Adição de `.trim()` e `replace()` para remover markdown antes do parsing
- **Testes**: 6/6 testes unitários validados
- **Issues**: #60 (GitHub)

#### Sprint V31: Erro 404 Após Geração de Planos por Ramo
- **Problema**: Redirecionamento para URL incorreta (`/visualizar-planos-por-ramo` sem prefixo `/planos-acao/`)
- **Solução**: Correção da URL em PlanoAcao.tsx linha 328
- **Testes**: 5/5 testes unitários validados
- **Issues**: #61 (GitHub)

### 📚 Documentação

- **baseline.md**: Documentação técnica completa do sistema (arquitetura, módulos, banco de dados, APIs, frontend)
- **erros-conhecidos.md**: Registro de bugs encontrados e soluções aplicadas
- **ROLLBACK.md**: Procedimentos detalhados para rollback para v1.0.0

### 🧪 Cobertura de Testes

**Testes Unitários:**
- Assessment Fase 1: 3/3 testes (100%)
- Branch Assessment Generate: 4/4 testes (100%)
- Action Plans JSON Parsing: 6/6 testes (100%)
- Branch Plans Redirect: 5/5 testes (100%)
- **Total**: 18/18 testes passaram (100%)

**Testes End-to-End:**
- Fluxo completo validado manualmente em produção
- Criação de projeto → Assessment → Questionários → Planos de Ação

### 📦 Banco de Dados

**Tabelas Principais:**
- `user`: Usuários do sistema (autenticação Manus OAuth)
- `projects`: Projetos de compliance
- `assessmentPhase1`: Dados básicos da empresa (Fase 1)
- `assessmentPhase2`: Questionário dinâmico (Fase 2)
- `corporateQuestionnaire`: Questionário corporativo
- `activityBranches`: Ramos de atividade (CNAE)
- `projectBranches`: Relacionamento projeto ↔ ramos
- `branchAssessments`: Questionários por ramo
- `actionPlans`: Planos de ação corporativos
- `branchActionPlans`: Planos de ação por ramo
- `riskMatrix`: Matriz de riscos tributários
- `briefingVersions`: Histórico de versões de briefing
- `actionPlanVersions`: Histórico de versões de planos
- `riskMatrixVersions`: Histórico de versões da matriz

### 🚀 Deploy e Infraestrutura

- **Ambiente de Produção**: iasolaris.manus.space
- **Sistema de Checkpoints**: Versionamento automático via Manus Platform
- **Repositório GitHub**: Solaris-Empresa/reforma-tributaria-plano-compliance
- **Checkpoint v1.0.0**: `93e36265` (Sprint V31)

### 🔐 Segurança

- Autenticação via Manus OAuth com sessão persistente
- Controle de acesso baseado em roles (admin/user)
- Validação de acesso a projetos em todos os endpoints
- Proteção contra SQL Injection via Drizzle ORM (prepared statements)
- Sanitização de inputs do usuário

### 📊 Métricas de Desenvolvimento

- **Sprints Concluídos**: 33 sprints (V1-V33)
- **Issues Resolvidas**: 61 issues no GitHub
- **Commits**: 100+ commits
- **Linhas de Código**: ~15.000 linhas (frontend + backend)
- **Tempo de Desenvolvimento**: 4 semanas

### 🎯 Próximos Passos (Roadmap v1.1)

- Implementar validação inline nos formulários de Assessment
- Adicionar indicadores de progresso visual no fluxo end-to-end
- Criar testes E2E automatizados com Playwright
- Implementar sistema de notificações para proprietários de projetos
- Adicionar exportação de planos de ação em PDF
- Melhorar feedback visual durante operações LLM longas

---

## Formato de Versionamento

- **MAJOR.MINOR.PATCH** (Semantic Versioning)
- **MAJOR**: Mudanças incompatíveis na API
- **MINOR**: Novas funcionalidades compatíveis com versões anteriores
- **PATCH**: Correções de bugs compatíveis com versões anteriores

---

**Autor**: Manus AI  
**Data de Release**: 01 de Fevereiro de 2026  
**Checkpoint**: 93e36265  
**GitHub**: https://github.com/Solaris-Empresa/reforma-tributaria-plano-compliance
