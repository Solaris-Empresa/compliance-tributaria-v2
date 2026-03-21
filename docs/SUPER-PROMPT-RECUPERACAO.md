# SUPER PROMPT — RECUPERAÇÃO DE CONTEXTO COMPLETO
## Plataforma IA SOLARIS — Compliance da Reforma Tributária

> **INSTRUÇÕES DE USO:** Cole este documento inteiro em uma nova conversa com o agente Manus quando ele perder o contexto do projeto. O agente deve ler este documento completamente antes de executar qualquer ação e agir com **autonomia total** sem solicitar confirmações desnecessárias.

---

## 1. IDENTIDADE DO PROJETO

**Nome:** IA SOLARIS — Plataforma de Compliance da Reforma Tributária Brasileira  
**Domínio de produção:** `https://iasolaris.manus.space`  
**Domínio alternativo:** `https://compliancet-a6u3gslm.manus.space`  
**Repositório GitHub:** `https://github.com/utapajos/compliance-tributaria-v2`  
**Projeto Manus:** `compliance-tributaria-v2` (ID: `N7PFkxWLqJU4tzCNzzYH6p`)  
**Caminho no sandbox:** `/home/ubuntu/compliance-tributaria-v2`  
**Versão atual:** `v5.6.1` (Checkpoint Manus: `cde0b59e`)  
**Stack:** React 19 + Tailwind 4 + Express 4 + tRPC 11 + Drizzle ORM + MySQL/TiDB  
**Última atualização:** 21/03/2026

---

## 2. CREDENCIAIS E ACESSOS (CRÍTICO — NÃO PERDER)

### 2.1 GitHub
```
Repositório: utapajos/compliance-tributaria-v2
Branch principal: main
Token PAT (para ajudar - manus): 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
Permissões: repo (read/write)
```

**Como configurar o remote GitHub no sandbox:**
```bash
cd /home/ubuntu/compliance-tributaria-v2
git config user.email "uires.tapajos@iasolaris.com.br"
git config user.name "IA Solaris"
git remote set-url github https://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@github.com/utapajos/compliance-tributaria-v2.git
git push github main
```

> **ATENÇÃO:** O `origin` do projeto aponta para S3 interno da Manus (`s3://vida-prod-gitrepo/...`). Use `git remote add github <url>` para adicionar o GitHub como remote separado. O `webdev_save_checkpoint` usa o `origin` S3 automaticamente.

### 2.2 Variáveis de Ambiente (Secrets Manus)
As seguintes variáveis são injetadas automaticamente pela plataforma Manus:

| Variável | Descrição |
|---|---|
| `OPENAI_API_KEY` | Chave OpenAI para embeddings (`text-embedding-3-small`) e LLM (`gpt-4.1`) |
| `DATABASE_URL` | MySQL/TiDB connection string |
| `JWT_SECRET` | Segredo para cookies de sessão |
| `VITE_APP_ID` | ID do app Manus OAuth |
| `OAUTH_SERVER_URL` | Backend OAuth Manus |
| `BUILT_IN_FORGE_API_KEY` | Token para APIs internas Manus (server-side) |
| `BUILT_IN_FORGE_API_URL` | URL das APIs internas Manus |
| `OWNER_OPEN_ID` | OpenID do owner (Uires Tapajos) |
| `TRACE_LEVEL` | Nível de log do tracer: `debug`, `info`, `off` (configurar `info` em produção) |

> **CRÍTICO:** A `OPENAI_API_KEY` deve ser configurada com `preventMatching: true` no `webdev_request_secrets` para garantir que chegue ao servidor de produção. Esta foi a causa raiz do erro "Nenhum CNAE identificado" em sprints anteriores.

---

## 3. ARQUITETURA DO SISTEMA

### 3.1 Estrutura de Arquivos-Chave
```
/home/ubuntu/compliance-tributaria-v2/
├── server/
│   ├── routers.ts                    ← AppRouter principal (25+ routers registrados)
│   ├── routers-fluxo-v3.ts           ← extractCnaes + refineCnaes (PIPELINE PRINCIPAL)
│   ├── routers-admin-embeddings.ts   ← Rebuild de embeddings + histórico
│   ├── cnae-embeddings.ts            ← Cache em memória + warmUpEmbeddingCache()
│   ├── cnae-rag.ts                   ← Busca semântica por similaridade de cosseno
│   ├── cnae-health.ts                ← Lógica do health check do pipeline
│   ├── cnae-pipeline-validator.ts    ← Validação on-demand com 4 casos canônicos
│   ├── tracer.ts                     ← Tracing estruturado (requestId + etapas)
│   ├── build-version.ts              ← Versão semântica + git hash do build
│   ├── embeddings-scheduler.ts       ← Cron semanal (seg 03:00 BRT) + validação pós-rebuild
│   ├── db.ts                         ← Query helpers (Drizzle)
│   └── _core/
│       ├── index.ts                  ← Servidor Express (rotas REST + tRPC mount)
│       ├── env.ts                    ← Variáveis de ambiente tipadas
│       ├── llm.ts                    ← Helper invokeLLM() (GPT-4.1)
│       └── notification.ts          ← notifyOwner() helper
├── drizzle/
│   └── schema.ts                     ← 40+ tabelas MySQL
├── client/src/
│   ├── App.tsx                       ← Rotas React + layout
│   └── pages/                        ← Páginas da aplicação
├── docs/
│   ├── OBSERVABILITY.md              ← Guia de observabilidade e health checks
│   ├── DEPLOY-GUIDE.md               ← Fluxo de deploy e controle de versão
│   ├── SUPER-PROMPT-RECUPERACAO.md   ← ESTE ARQUIVO
│   └── architecture/
│       └── cnae-pipeline.md          ← Arquitetura detalhada do pipeline CNAE
└── README.md                         ← Documentação principal do projeto
```

### 3.2 Routers tRPC Registrados (appRouter)
```typescript
system, branches, corporateAssessment, branchAssessment, actionPlans,
tasksV2, comments, notificationsV2, analytics, permissions, audit,
approvals, reports, actionsCrud, questionsCrud, auditLogs,
permissionsCheck, sessions, sessionQuestionnaire, sessionActionPlan,
sessionConsolidation, onboarding, fluxoV3, adminEmbeddings,
complianceV3, diagnostic, gap, risk, consistency, flow, auth
```

### 3.3 Endpoints REST (Express)
| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/health/cnae` | Status do pipeline (chave, cache, embeddings, LLM) |
| `GET` | `/api/health/cnae/validate` | Validação on-demand com 4 casos canônicos (~3s) |
| `GET` | `/api/version` | Versão semântica, git hash, ambiente |
| `POST` | `/api/trpc/*` | Todos os procedimentos tRPC |
| `GET` | `/api/oauth/callback` | Callback OAuth Manus |

### 3.4 Pipeline CNAE Discovery
O pipeline de identificação de CNAEs é o componente mais crítico da plataforma:

1. **`extractCnaes`** (`fluxoV3.extractCnaes`): Dado o contexto do projeto (descrição do negócio, respostas do questionário), usa GPT-4.1 + busca semântica nos 1.332 embeddings para identificar CNAEs relevantes. Instrumentado com tracer (9 etapas, `requestId` único).

2. **`refineCnaes`** (`fluxoV3.refineCnaes`): Refinamento dos CNAEs identificados com base em feedback do usuário. Instrumentado com tracer (9 etapas).

3. **Cache de Embeddings**: 1.332 CNAEs × 1.536 dimensões (`text-embedding-3-small`). Carregado no startup via `warmUpEmbeddingCache()` (elimina cold start). Invalidado manualmente via `/admin/embeddings`.

4. **Rebuild Semanal**: Cron toda segunda-feira às 03:00 BRT. Após o rebuild, executa validação automática com 4 casos canônicos e notifica o owner via `notifyOwner()`.

---

## 4. TABELAS DO BANCO DE DADOS (PRINCIPAIS)

```
users                    ← Usuários autenticados (role: admin|user)
projects                 ← Projetos de compliance (status, CNAE, faturamento)
projectParticipants      ← Membros do projeto (role: owner|member|viewer)
activityBranches         ← CNAEs selecionados por projeto
assessmentPhase1         ← Questionário fase 1 (perfil da empresa)
assessmentPhase2         ← Questionário fase 2 (complexidade tributária)
riskMatrix               ← Matriz de riscos gerada por IA
actionPlans              ← Planos de ação gerados por IA
actions                  ← Ações individuais do plano
phases                   ← Fases do plano de ação
auditLog                 ← Log de auditoria de todas as operações
planApprovals            ← Aprovações jurídicas dos planos
cnaeEmbeddings           ← 1.332 vetores de embeddings (1.536 dims)
embeddingRebuildHistory  ← Histórico de rebuilds de embeddings
```

---

## 5. HISTÓRICO DE SPRINTS (ÚLTIMAS 5)

| Sprint | Versão | Checkpoint | Descrição |
|---|---|---|---|
| v5.6.1 | docs | `cde0b59e` | Documentação técnica completa + push GitHub |
| v5.6.0 | código | `72524167` | Warm-up cache startup + tracer refineCnaes + alerta deploy |
| v5.5.1 | código | `ead9c909` | Endpoint `/api/health/cnae/validate` on-demand |
| v5.5.0 | código | `5d81f5b1` | Tracer estruturado + `/api/version` |
| v5.4.0 | código | `ea616dd9` | Health check + validação semanal automática |

---

## 6. COMANDOS ESSENCIAIS DE DIAGNÓSTICO

### 6.1 Verificar estado de produção (executar após qualquer deploy)
```bash
# Versão publicada
curl https://iasolaris.manus.space/api/version | python3 -m json.tool

# Status do pipeline
curl https://iasolaris.manus.space/api/health/cnae | python3 -m json.tool

# Validação completa (~3s)
curl https://iasolaris.manus.space/api/health/cnae/validate | python3 -m json.tool
```

### 6.2 Verificar estado do servidor local (sandbox)
```bash
cd /home/ubuntu/compliance-tributaria-v2
curl http://localhost:3000/api/health/cnae | python3 -m json.tool
curl http://localhost:3000/api/version
```

### 6.3 Executar testes
```bash
cd /home/ubuntu/compliance-tributaria-v2
npx vitest run --reporter=verbose 2>&1 | tail -10
# Resultado esperado: ~1337 testes, ~76 falhas conhecidas (testes de integração sem DB)
```

### 6.4 Verificar TypeScript
```bash
cd /home/ubuntu/compliance-tributaria-v2
npx tsc --noEmit 2>&1
# Resultado esperado: 0 erros
```

### 6.5 Configurar GitHub e fazer push
```bash
cd /home/ubuntu/compliance-tributaria-v2
git config user.email "uires.tapajos@iasolaris.com.br"
git config user.name "IA Solaris"
git remote set-url github https://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@github.com/utapajos/compliance-tributaria-v2.git
git push github main
```

---

## 7. WORKFLOW DE DEPLOY (PASSO A PASSO)

1. **Implementar** as mudanças nos arquivos do projeto.
2. **Verificar TypeScript:** `npx tsc --noEmit` — deve retornar 0 erros.
3. **Executar testes:** `npx vitest run` — verificar que não houve regressão.
4. **Atualizar CHANGELOG.md** com a nova versão semântica.
5. **Marcar itens** como `[x]` no `todo.md`.
6. **Salvar checkpoint:** usar a ferramenta `webdev_save_checkpoint` (NÃO usar `git push origin`).
7. **Push GitHub:** configurar o remote `github` e executar `git push github main`.
8. **Publicar:** clicar no botão **Publish** no painel de gerenciamento Manus.
9. **Verificar deploy:** executar os 3 comandos de diagnóstico da seção 6.1.

> **REGRA CRÍTICA:** O `origin` do git aponta para S3 interno da Manus. Para push no GitHub, sempre use o remote `github` (não `origin`). O `webdev_save_checkpoint` é a única forma de salvar no S3/Manus.

---

## 8. PROBLEMAS CONHECIDOS E SOLUÇÕES

### Problema: "Nenhum CNAE identificado automaticamente"
**Causa raiz histórica:** Deploy desatualizado (servidor rodando checkpoint anterior) ou `OPENAI_API_KEY` não chegando ao servidor de produção.

**Diagnóstico:**
```bash
curl https://iasolaris.manus.space/api/version  # verificar gitHash
curl https://iasolaris.manus.space/api/health/cnae  # verificar apiKeyPresent
curl https://iasolaris.manus.space/api/health/cnae/validate  # validar pipeline
```

**Solução:**
1. Se `apiKeyPresent: false` → reconfigurar `OPENAI_API_KEY` com `preventMatching: true` no painel Secrets.
2. Se deploy desatualizado → publicar o checkpoint mais recente via botão Publish.
3. Se pipeline falha → verificar logs do tracer (procurar `[TRACE requestId]` nos logs do servidor).

### Problema: Cache não carregado (`cacheLoaded: false`)
**Causa:** Cold start após deploy. O `warmUpEmbeddingCache()` é chamado no startup via `setImmediate`, mas pode levar alguns segundos.

**Solução:** Aguardar 10-15 segundos após o deploy e verificar novamente. Se persistir, chamar `trpc.adminEmbeddings.invalidateCache` para forçar recarregamento.

### Problema: Push para GitHub falha com "remote: Permission denied"
**Causa:** Token PAT expirado ou remote `origin` aponta para S3.

**Solução:** Reconfigurar o remote `github` com o token atualizado (seção 6.5).

---

## 9. PRÓXIMAS TAREFAS PENDENTES (BACKLOG)

As seguintes tarefas estão no `todo.md` e ainda não foram implementadas:

1. **Wire "Pedir nova análise"** ao `refineCnaes` no frontend — o botão existe no modal de CNAEs mas não está conectado ao backend (prioridade alta).
2. **`TRACE_LEVEL=info`** em produção — configurar no painel Secrets para ativar logs JSON estruturados.
3. **Atualizar `BaselineTecnica-v2.1.md`** para v2.2 cobrindo sprints v5.4.0–v5.6.1.
4. **Warm-up no health check** — se cache não carregado ao chamar `/api/health/cnae`, disparar warm-up automaticamente.

---

## 10. INSTRUÇÕES PARA O AGENTE (AUTONOMIA TOTAL)

Ao receber este super prompt, o agente deve:

1. **Ler** este documento completamente antes de qualquer ação.
2. **Verificar** o estado atual do projeto com `curl http://localhost:3000/api/health/cnae`.
3. **Verificar** o git log com `git log --oneline -5` para confirmar o checkpoint atual.
4. **Agir com autonomia total** — não solicitar confirmações para operações de rotina (commits, push, testes, deploy).
5. **Sempre** atualizar o `todo.md` antes de iniciar qualquer implementação.
6. **Sempre** executar `npx tsc --noEmit` antes de fazer checkpoint.
7. **Sempre** fazer push para o GitHub após cada checkpoint usando o remote `github`.
8. **Sempre** verificar produção após deploy com os 3 comandos da seção 6.1.
9. **Nunca** usar `git push origin` — o `origin` é S3 interno, use `webdev_save_checkpoint`.
10. **Nunca** hardcodar a porta do servidor — usar `process.env.PORT`.

---

## 11. CONTEXTO DE NEGÓCIO

A plataforma IA SOLARIS auxilia empresas brasileiras na adequação à **Reforma Tributária** (EC 132/2023, LC 214/2025). O fluxo principal é:

1. **Cadastro do projeto** com dados da empresa (CNPJ, faturamento, setor).
2. **Identificação de CNAEs** via IA (pipeline `extractCnaes` + `refineCnaes`).
3. **Questionário de assessment** em 5 fases (perfil, complexidade, riscos, etc.).
4. **Geração do plano de ação** via GPT-4.1 com recomendações específicas por CNAE.
5. **Aprovação jurídica** do plano por advogado sênior.
6. **Execução e monitoramento** das ações com gestão de tarefas e KPIs.

**Usuários:** Equipe SOLARIS (admin), Clientes (owner do projeto), Advogados Seniores (aprovação), Colaboradores (execução de tarefas).

---

*Super Prompt gerado em 21/03/2026 — v5.6.1 | Manus AI*
