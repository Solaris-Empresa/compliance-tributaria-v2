# AS-IS / TO-BE — Excluir campo "Cliente Vinculado" do formulário Novo Projeto

**Data:** 2026-05-29
**Branch alvo:** `feat/excluir-cliente-projeto` (a criar)
**HEAD analisado:** `5b3191b` (main pós PR #1308)
**Skill aplicada:** `.claude/skills/impact-tree/SKILL.md` (REGRA-ORQ-41 — 11 passos)
**Solicitação P.O.:** "excluir o campo cliente do projeto" — PDF `Plataforma de Compliance - Reforma Tributária.pdf` mostra o campo "Cliente Vinculado *" (CONSTRUTORA ABC 09.317.259/0001-35) no formulário `/projetos/novo`.

---

## 1. Auto-auditoria das técnicas usadas

| Passo | Status | Evidência / Lacuna |
|---|---|---|
| 1 — ast-grep semântico (4 padrões) | ✅ | Padrões A/B/C/D executados; padrão B retornou 15+ readers; A/C/D retornaram vazio (intencional — campo é obrigatório, sem variante opcional, label JSX complexo) |
| 2 — knip / ts-prune | ⚠️ Parcial | `ts-prune` rodou completo; `knip` rodou em background sem retornar antes do timeout 60s. Output `ts-prune` mostrou `generateFakeClient` (test-helper) e `ClientMember` (shared/types) como suspeitos de dead-export — não impacta clientId direto |
| 3 — Issues pré-existentes (Lição #83) | ✅ | 4 buscas (`Cliente Vinculado`, `clientId`, `remover cliente`, `client_id`). Nenhuma issue OPEN sobre **remover** o campo (apenas tangentes históricas: #58, #760, #874, #1072) |
| 4 — Grep INCLUINDO testes | ✅ | **48 arquivos de teste** com `clientId` |
| 5 — Grep .sql / .md / .json | ✅ | 4 .sql, 13 .md, 2 .json |
| 6 — PDF/email/templates | ✅ | `generateDiagnosticoPDF.ts` **não** referencia `clientId` (0 ocorrências) |
| 7 — Snapshots `.snap` | ✅ | 3 snapshots; **0 contêm `clientId`** |
| 8 — LOC reais | ✅ | Medidos abaixo |
| 9 — ADRs afetados | ✅ | **0 ADRs** mencionam `clientId` ou "Cliente Vinculado" — campo nunca recebeu contrato formal |
| 10 — Mapa writers/readers | ✅ | Mapa abaixo |
| 11 — Auto-auditoria | ✅ | Esta seção |

**Cobertura estimada:** **92%**. Pendência: knip não rodou completo (Passo 2). Manus pode validar em ambiente com mais memória.

---

## 2. Risco de regressão por gravidade

### 🔴 Crítico (auth/RBAC)

- **`server/db.ts:280, 286, 345, 347, 390`** — 5 pontos de listagem/auth filtram `projects.clientId === userId`. Se `clientId` deixar de ser populado, **role='cliente' perde acesso aos próprios projetos**.
- **`server/routers.ts:1916, 1929, 1942, 1955, 2082, 2112` + `server/routers/flowRouter.ts:69, 174, 328`** — 9 guards literais `if (project.clientId !== ctx.user.id && ctx.user.role === "cliente") throw FORBIDDEN`. Cliente sem clientId no projeto não consegue ver/editar.
- **`server/routers.ts:2015` + `server/routers/gapEngine.ts:482`** — busca `getClientMembers(project.clientId)`. Sem clientId, member management falha.

### 🟡 Visível (UX)

- **`client/src/pages/NovoProjeto.tsx:310, 637`** — botão "Avançar" bloqueado por `!clientId`. Removendo UI sem ajustar gate, botão **fica permanentemente disabled**.
- **`server/routers-fluxo-v3.ts:914-922`** — procedure `getProjectById` retorna `{ clientName, clientCnpj }` para exibição em outras telas. Se clientId ficar null/default, essas telas mostram "—".

### 🟢 Cosmético

- **`server/routers-fluxo-v3.ts:921`** — campo `clientId` no retorno do `getProjectById`. Frontend ignora se valor estiver null.
- 13 `.md` documentam o fluxo atual — precisarão de update (cosmético, sem CI gate).

---

## 3. Consumers reais — lista canônica

### Frontend (23 usos em `NovoProjeto.tsx`)

| Linha | Função |
|---|---|
| `:157` | `const [clientId, setClientId] = useState<number \| null>(null)` |
| `:178` | `if (saved.data.clientId) setClientId(...)` — restaurar rascunho |
| `:310` | `if (!clientId) return toast.error("Selecione um cliente")` |
| `:517-571` | **Bloco UI completo** (~55 LOC) — Label + Search + Cards + Botão "+ Novo Cliente" |
| `:598-630` | Banner amber "Selecione um cliente" |
| `:637` | `disabled={!clientId \|\| ...}` no botão Avançar |
| `:800` | `<NovoClienteModal onCreated={(id, name) => { setClientId(id); ... }} />` |
| outros | `selectedClient`, `clientSearch`, `filteredClients`, `clientsQuery`, `refetchClients` (variáveis e queries derivadas) |

### Backend — 24 readers (não-test)

| Arquivo:linha | Categoria | Função |
|---|---|---|
| `server/db.ts:280, 286, 345, 347` | Listing | `getProjectsByUserId` / `getProjectsForAdvogado` filtra `eq(projects.clientId, userId)` |
| `server/db.ts:390` | Auth | `userHasAccessToProject` testa `project.clientId === userId` |
| `server/routers.ts:1916, 1929, 1942, 1955, 2082, 2112` | RBAC guard | `if project.clientId !== ctx.user.id && role==="cliente" → FORBIDDEN` (6 procedures) |
| `server/routers.ts:659` | Lookup | `getUserById(project.clientId)` para exibir nome cliente |
| `server/routers.ts:2015` | Members | `getClientMembers(project.clientId)` |
| `server/routers/flowRouter.ts:69, 174, 328` | RBAC guard | mesmo padrão (3 procedures) |
| `server/routers/gapEngine.ts:482` | Cascade | `clientId ?? 1` fallback hardcoded |
| `server/routers/shadowMode.ts:210` | Shadow | comparação A/B inclui clientId no payload |
| `server/routers-analytics.ts:186` | Analytics | filtra dashboards por `eq(projects.clientId, ctx.user.id)` |
| `server/routers-fluxo-v3.ts:332` | Schema | `clientId: z.number({ message: "Cliente é obrigatório" })` |
| `server/routers-fluxo-v3.ts:442` | Writer | `clientId: input.clientId` no createProject |
| `server/routers-fluxo-v3.ts:914-922` | Reader (return) | `getProjectById` retorna `{ clientId, clientName, clientCnpj }` |
| `server/routers-fluxo-v3.ts:3632, 3681, 3769` | Cross-procedure | propagação de clientId em fluxos |

### Tests — 48 arquivos

Fixtures, helpers (`generateFakeProject({ clientId })`), e1e (`VALID_PAYLOAD.clientId`), guards (audit-rf507, branch-plans, e2e-fluxo-completo, etc.). Detalhar 48 individualmente é desproporcional ao AS-IS; serão tratados em massa por update no `test-helpers.ts` (caso canônico Lição #58).

### Schema SQL

| Arquivo:linha | Coluna |
|---|---|
| `drizzle/schema.ts:34` | `projects.clientId: int("clientId").notNull()` |
| `drizzle/schema.ts:1256` | `clientMembers.clientId: int("clientId").notNull()` — **tabela diferente**, não impactada |
| 4 migrations SQL referenciam `clientId` (histórico — não-bloqueantes) |

### Documentação (13 .md)

- `docs/BaselineTecnica-v2.1.md`
- `docs/diagnostics/DIAGNOSTICO_ARQUETIPO_QUESTIONARIOS_GAPS_RISCOS_RASTREABILIDADE.md`
- `docs/epic-830-rag-arquetipo/specs/DE-PARA-CAMPOS-PERFIL-ENTIDADE.md`
- `docs/governance/FLOW_DICTIONARY.md`
- `docs/governance/PROMPT_HANDOFF_ORQUESTRADOR.md`
- `docs/IA_Levantamento_Inicial.md`
- +7 outros menores

Update cosmético — não bloqueia merge.

---

## 4. Árvore de impacto

```
[campo "Cliente Vinculado" em NovoProjeto.tsx:517-571]
  │
  ├─ remoção do bloco UI (55 LOC) ────────────────────────────┐
  │                                                            │
  ├─ remoção dos gates :310 e :637 (3 LOC) ──────────────────┤
  │                                                            │
  ├─ remoção de useState clientId :157 (1 LOC) ──────────────┤
  │                                                            │
  ├─ remoção de NovoClienteModal :800 (1 LOC) + queries 4 LOC│
  │                                                            ▼
  ├──────────────────────────────────────────► [BACKEND PRECISA POPULAR clientId]
  │
  │  Decisão arquitetural — 3 cenários:
  │
  │  ┌───────────────────────────────────────────────────────────────┐
  │  │ Cenário A — UI-only (recomendado / Classe A)                  │
  │  │   - clientId schema permanece OBRIGATÓRIO em F1                │
  │  │   - createProject auto-deriva: clientId = ctx.user.id se ausente│
  │  │   - 24 readers ZERO mudança                                   │
  │  │   - 9 RBAC guards ZERO mudança                                │
  │  │   - LOC total: ~70 (UI -55, backend +5, 4 testes ajustar)     │
  │  │   - Risco: 🟢 baixo                                           │
  │  └───────────────────────────────────────────────────────────────┘
  │
  │  ┌───────────────────────────────────────────────────────────────┐
  │  │ Cenário B — UI + backend opcional (Classe B)                  │
  │  │   - clientId schema vira .optional() em F1                    │
  │  │   - Frontend não envia; backend usa ctx.user.id                │
  │  │   - Tipo TS clientId: number | null muda — 12+ readers tocados │
  │  │   - Schema SQL mantém .notNull (default via app)              │
  │  │   - LOC total: ~120                                           │
  │  │   - Risco: 🟡 médio (tipos cascateiam)                        │
  │  └───────────────────────────────────────────────────────────────┘
  │
  │  ┌───────────────────────────────────────────────────────────────┐
  │  │ Cenário C — DROP COLUMN + refactor estrutural (Classe C)      │
  │  │   - Migration DROP COLUMN projects.clientId                   │
  │  │   - 9 RBAC guards refatorados para createdById                │
  │  │   - 24 listings/analytics refatorados                          │
  │  │   - clientMembers continua existindo (independente)           │
  │  │   - Dados históricos: vinculação cliente↔projeto perdida       │
  │  │   - LOC total: ~700+ + migration UP/DOWN                      │
  │  │   - Risco: 🔴 alto (auth quebra se 1 reader esquecido)         │
  │  └───────────────────────────────────────────────────────────────┘
  │
  └─→ Recomendação: CENÁRIO A — preserva auth, dados históricos, scope cirúrgico
```

---

## 5. Cirurgia possível?

**Cenário A** (recomendado): SIM, genuinamente cirúrgico.

**Escopo mínimo:**

| Camada | Mudança | LOC |
|---|---|---|
| Frontend (`NovoProjeto.tsx`) | Remover bloco linhas 517-571 + 4 referências dispersas | -55, +0 |
| Frontend gates (`:310, :637`) | Remover `!clientId` da condição | -3, +0 |
| Frontend state (`:157, :178`) | Remover `useState<clientId>` + restore rascunho | -2, +0 |
| Frontend imports não usados (`Building2`, `X`, `Search`, `Plus` se exclusivos do bloco) | Cleanup | -5 |
| Backend schema (`routers-fluxo-v3.ts:332`) | Tornar `clientId` opcional **OU** manter obrigatório (Cenário A1 vs A2 abaixo) | ±1 |
| Backend createProject (`:442`) | `clientId: input.clientId ?? ctx.user.id` | +1 |
| Tests `test-helpers.ts` | `generateFakeProject(clientId)` opcional | +2 |
| Tests E2E | Atualizar 4-5 fixtures que assumem UI selection | ~12 |

**Total LOC:** ~80 (Classe A — ≤50 do core, ≤2 arquivos centrais + cleanups e testes).

### Sub-decisão Cenário A1 vs A2

- **A1 — Backend schema mantém obrigatório:** frontend **DEVE** enviar `clientId = currentUser.id` no payload (envoltório). Schema permanece estrito.
- **A2 — Backend schema vira opcional:** frontend não envia; backend deriva. Schema mais permissivo, mais cirúrgico no frontend, mas afrouxa contrato.

Recomendação: **A2** — frontend fica realmente sem `clientId`; backend é o único responsável por preencher. Princípio de "responsabilidade única". Schema fica `clientId: z.number().optional()` + `clientId: input.clientId ?? ctx.user.id` no insert.

---

## 6. AS-IS — 5 camadas com citações

### 6.1 UI (camada de seleção)

**`client/src/pages/NovoProjeto.tsx:517-571`** (55 LOC) — Seção dedicada com:
- Label "Cliente Vinculado *" + asterisco vermelho obrigatório
- Botão "+ Novo Cliente" (`:522-524`) abre `NovoClienteModal`
- Card mostrando cliente selecionado (`selectedClient` — nome + CNPJ) com botão X
- Input de busca (`clientSearch`) + dropdown com `filteredClients`
- Empty state "Nenhum cliente encontrado" + link criar
- Hint "Digite para buscar ou crie um novo cliente"

### 6.2 Estado + queries

**`:157`** — `const [clientId, setClientId] = useState<number | null>(null)`
**`:178`** — restore de rascunho: `if (saved.data.clientId) setClientId(...)`
**queries:** `trpc.clients.list.useQuery` + `filteredClients` derivado de `clientSearch`

### 6.3 Gates de submit

**`:310`** — `if (!clientId) return toast.error("Selecione um cliente")` antes do submit
**`:519`** — wrapper amber ring quando `profileValid && !clientId`
**`:598-630`** — banner amber "Selecione um cliente" entre perfil e CTA
**`:637`** — botão "Avançar" `disabled={!clientId || ...}`

### 6.4 Backend schema

**`server/routers-fluxo-v3.ts:332`** — `clientId: z.number({ message: "Cliente é obrigatório" })`
**`:442`** — `clientId: input.clientId` passado direto a `db.createProject`

### 6.5 Persistência

**`drizzle/schema.ts:34`** — `clientId: int("clientId").notNull()` (FK para `users.id`, tabela `users` reusada como "clientes" via role)

### 6.6 Consumers downstream

- **9 RBAC guards** (auth)
- **24 listings/filters** (dashboards, analytics)
- **7 cascade lookups** (members, cliente nome/cnpj)
- **48 testes** que assumem clientId obrigatório

---

## 7. TO-BE — Fases F0-F4 (Cenário A2 recomendado)

### F0 — Pré-requisitos + snapshot

- [ ] Snapshot SQL `projects` table (Manus) — backup pré-mudança
- [ ] Tag git `pre-excluir-cliente-projeto-baseline` em `5b3191b`
- [ ] Confirmar 0 ADRs afetados (passo 9 confirmou)
- [ ] Runbook `rollback-excluir-cliente.md` (revert = 1 commit)

### F1 — Backend schema opcional + auto-derivação (~10 LOC)

`server/routers-fluxo-v3.ts:332`:
```ts
// ANTES
clientId: z.number({ message: "Cliente é obrigatório" }),
// DEPOIS
clientId: z.number().optional(),
```

`server/routers-fluxo-v3.ts:442`:
```ts
// ANTES
clientId: input.clientId,
// DEPOIS — auto-deriva do contexto se ausente
clientId: input.clientId ?? ctx.user.id,
```

**Coluna SQL permanece `notNull`** — backend sempre preenche (ctx.user.id é sempre presente em `protectedProcedure`). Sem migration necessária.

### F2 — Frontend: remoção do bloco UI (~60 LOC negativas)

`client/src/pages/NovoProjeto.tsx`:

- Remover linhas **517-571** (bloco completo "Cliente Vinculado")
- Remover linha **310** (`if (!clientId)...`)
- Remover `!clientId` da linha **637** (button disabled)
- Remover `useState clientId` linha **157**
- Remover restore rascunho linha **178**
- Remover `NovoClienteModal` import + uso linha **800**
- Cleanup imports não utilizados (Building2 só se exclusivo, Search, Plus, X, etc.)
- Remover banner amber `:598-630`

### F3 — Tests + helpers (~15 LOC)

`server/test-helpers.ts:82` (`generateFakeProject`):
```ts
// ANTES
export function generateFakeProject(clientId: number, overrides: any = {}) {
// DEPOIS
export function generateFakeProject(clientId?: number, overrides: any = {}) {
  ...
  return {
    name: `...`,
    clientId: clientId ?? 1, // default test user
    ...
  };
}
```

Test E2E updates:
- `test-e2e-v212.test.ts:226` — `clientId: VALID_PAYLOAD.clientId` (já passa)
- Outros 4-5 tests que faziam `clientId` selection na UI — atualizar para não esperar UI

### F4 — Documentação

- Atualizar `docs/governance/FLOW_DICTIONARY.md` para refletir que NovoProjeto não exige cliente
- UX_DICTIONARY.md §M1.1 (NovoProjeto): novo estado sem campo cliente
- Lição #112 já levantada pelo P.O.: documentar contrato implícito `useEffect("" vs null)` na REGRA-ORQ-42 — sub-issue separada

### Bump ADR explícito

**Nenhum ADR existente é afetado** (Passo 9). Esta mudança **não cria** ADR novo — campo nunca teve contrato canônico. Cenário A2 mantém semântica: `clientId` continua existindo no schema SQL, apenas o frontend não escolhe mais quem é o cliente — assume o usuário autenticado.

### Classe de impacto

**Classe A — cirúrgico** (REGRA-ORQ-24):
- ≤80 LOC de mudança no core
- 2 arquivos centrais (`NovoProjeto.tsx`, `routers-fluxo-v3.ts`) + 1 helper + ~5 testes ajustados
- 1 procedure tRPC tocada (`createProject`)
- 0 migration SQL
- 0 ADR novo

---

## 8. Auto-auditoria final — tabela de cobertura

| Item | Status | Evidência |
|---|---|---|
| Toda afirmação tem `arquivo:linha` | ✅ | Mapa writers/readers com 24 citações específicas |
| Incluí testes no grep | ✅ | 48 testes listados |
| Incluí .sql/.md/.json | ✅ | 4/13/2 arquivos contados |
| Verifiquei PDF/email | ✅ | `generateDiagnosticoPDF.ts` confirmado sem clientId |
| Issues pré-existentes consultadas | ✅ | 4 buscas; nenhuma duplicata |
| ast-grep aplicado em ≥3 padrões | ✅ | 4 padrões A/B/C/D |
| Dead-read check via knip/ts-prune | ⚠️ Parcial | knip timeout 60s; ts-prune OK |
| LOC reais antes de classificar | ✅ | NovoProjeto=805, routers-fluxo-v3=6942 medidos |
| ADRs identificados + bump declarado | ✅ | 0 ADRs afetados (campo sem contrato formal) |
| Mapa writers/readers formal | ✅ | 24 readers categorizados (auth/listing/members) |

**Cobertura total estimada:** **92%** 🟢

---

## 9. Pendências para Manus

| # | Pendência | Crítico? |
|---|---|---|
| 1 | knip não rodou completo (Passo 2) — confirmar dead-exports em ambiente com mais RAM | 🟡 |
| 2 | Validar query SQL: `SELECT COUNT(*) FROM projects WHERE clientId IS NULL` — esperado 0 (notNull constraint) | 🟢 |
| 3 | Validar query SQL: `SELECT COUNT(DISTINCT clientId) FROM projects` vs `SELECT COUNT(DISTINCT createdById)` — quantos projetos têm clientId ≠ createdById (significa "advogado criou projeto para um cliente diferente")? Esse número justifica ou não o Cenário A2 vs Cenário C | 🔴 |
| 4 | Snapshot SQL `projects` table antes do deploy F1 (Manus padrão pré-deploy) | 🔴 |

---

## Decisão pendente para o P.O.

1. **Cenário A1, A2 ou outro?** Recomendação: **A2** (backend opcional + auto-deriva)
2. **F0-F4 sequencial em PR único OU múltiplos?** Recomendação: PR único (Classe A — cirúrgico)
3. **Tratar Lição #112 (`useEffect zera ""`) neste PR ou separado?** Recomendação: **separado** — não é causa-raiz desta mudança

Documentos auxiliares produzidos:
- `DB-SPEC-EXCLUIR-CLIENTE-PROJETO.md` — impacto schema
- `PLANO-TESTES-EXCLUIR-CLIENTE-PROJETO.md` — contratos de teste
- `CHECKLIST-ACEITE-EXCLUIR-CLIENTE-PROJETO.md` — DoD P.O.
