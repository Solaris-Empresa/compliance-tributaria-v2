# AS-IS / TO-BE — Feature "Guia Prático" (Modal IA Generativa no Plano de Ação)

**Data:** 2026-06-12 · **Autor da análise:** Claude Code (skill `impact-tree`, REGRA-ORQ-41)
**Spec auditada:** `Especificação Técnica_ Feature _Guia Prático_ — Modal com IA Generativa.md` (Manus, v2.0, 04/06)
**Veredito da spec:** ⚠️ **direção correta, dados ~60% imprecisos** — arquivos/tabelas/campos fantasma + 6 violações de governança. **Não implementar como escrito.**

---

## 1. Auto-auditoria das técnicas usadas

| Técnica | Aplicada | Evidência |
|---|---|---|
| ast-grep disponível | ✅ | v0.42.1 |
| knip disponível | ✅ | v6.14.2 |
| Issues pré-existentes (Lição #83) | ✅ | `gh issue search "Guia Prático/guia-pratico"` → **0** (primeira entrada) |
| Componentes reais verificados | ✅ | `ls client/src/pages` + teste de existência dos nomes da spec |
| Schema real verificado | ✅ | `drizzle/schema.ts` + `db-queries-risks-v4.ts` (raw SQL) |
| LLM real verificado | ✅ | `server/_core/llm.ts:287` (`invokeLLM`), `:332` (gpt-4.1) |
| PDF real verificado | ✅ | `package.json` (jspdf, **sem html2canvas**), `generateDiagnosticoPDF.ts` |
| LOC para classe (ORQ-24) | ✅ | `ActionPlanPage.tsx` = 1350 LOC |
| Governança (ORQ-30/auth) | ✅ | `risks-v4.ts` 21 protectedProcedure · llm.ts temperatura |

**Cobertura estimada: 🟢 ~92%** (pendências: nomes exatos das colunas de `risks_v4`/`tasks` confirmados via `db-queries`, não via Drizzle).

---

## 2. Risco de regressão por gravidade

| Gravidade | Item | Detalhe |
|---|---|---|
| 🟢 Cosmético | Botão na linha de tarefa | Aditivo no `TaskRow` (estado aprovado). Sem remover nada. |
| 🟡 Visível | Layout da linha | +~110px à direita; `flex-wrap` em viewport < md. |
| 🔴 Crítico (governança, não regressão) | **temperature 0.3** | **VIOLA REGRA-ORQ-30** (máx 0.1). |
| 🔴 Crítico (segurança) | **`publicProcedure`** | Endpoint sem auth → vaza dados de projeto. Padrão é `protectedProcedure` + `validateProjectAccess`. |
| 🔴 Crítico (anti-alucinação) | LLM gera orientação prescritiva nova | ADR-010 Regra 4 + ANTI-HAL-1 (#1386): toda afirmação precisa de base normativa verificável. |

**Nenhuma regressão de fluxo existente** se read-only. Os riscos críticos são de **governança/segurança/alucinação**, não de quebrar o que já existe.

---

## 3. Consumers reais (canônico, arquivo:linha)

### 3.1 Componentes (spec ERROU os nomes)

| Spec diz | Real | Evidência |
|---|---|---|
| `PlanosV4.tsx` | **`ActionPlanPage.tsx`** (1350 LOC) | `App.tsx:170` rota `/projetos/:projectId/planos-v4` |
| `PlanoAcaoCard.tsx` | **inexistente** — card inline no ActionPlanPage | `ls client/src/components` → só `ActionEditor.tsx` |
| `TarefaRow.tsx` | **`TaskRow`** (função interna) | `ActionPlanPage.tsx:207` `function TaskRow(...)` |

### 3.2 Dados (spec usou API Drizzle inexistente p/ essas tabelas)

| Spec | Real | Evidência |
|---|---|---|
| `ctx.db.query.tarefas.findFirst` (Drizzle) | **raw SQL `query(...)`** | `db-queries-risks-v4.ts:7` "Tabelas: risks_v4 · action_plans · tasks · audit_log" (raw, não Drizzle) |
| tabela `projetos` | **`projects`** (Drizzle) | `schema.ts:31` |
| tabela `tarefas` | **`tasks`** (raw SQL) | `db-queries-risks-v4.ts:301` `DELETE t FROM tasks t` |
| tabela `riscos` | **`risks_v4`** (raw SQL) | `db-queries-risks-v4.ts:252` `INSERT INTO risks_v4` |
| campo `projeto.regimeTributario` | **`projects.taxRegime`** (enum) | `schema.ts:89` |
| campo `projeto.setorAtuacao` | **NÃO EXISTE** | só `escopo` enum + CNAE/companyProfile; setor é inferido |
| campo `projeto.faturamentoAnual` | **`faturamentoAnual`** ✓ existe | `schema.ts:117` |
| `tarefa.titulo`, `tarefa.responsavel` | ✓ existem (`tasks`) | `db-queries-risks-v4.ts:128/130` |
| `risco.nome` | **`risks_v4.titulo`** ou `categoria` | colunas: id, project_id, type, categoria, titulo, descricao, **artigo**, severidade, urgencia, source_priority... |
| `risco.baseLegal` | **`risks_v4.artigo`** (+ `rag_artigo_exato`/`rag_trecho_legal`) | idem |
| `risco.origem` | **`risks_v4.source_priority`** ou `type` | idem |
| `riscos.tarefaId` (join) | **NÃO confirmado** — risks_v4 não tem `tarefaId`; a relação é risco→action_plan→task | precisa join real, não `eq(riscos.tarefaId, taskId)` |

### 3.3 Infra a reutilizar (não recriar)

| Spec propõe | Real a reutilizar | Evidência |
|---|---|---|
| `openai.chat.completions.create` direto | **`invokeLLM(params)`** | `server/_core/llm.ts:287` (retry + audit_log) |
| `model: 'gpt-4o'` | **gpt-4.1** | `llm.ts:332` |
| `temperature: 0.3` | **0.1 (máx) ou 0** | REGRA-ORQ-30 |
| `publicProcedure` | **`protectedProcedure`** + `validateProjectAccess` | `risks-v4.ts` (21×) |
| jsPDF + **html2canvas** (novo dep) | **`generateDiagnosticoPDF.ts`** (jsPDF + autotable, já instalado) | `package.json` sem html2canvas |

---

## 4. Árvore de impacto (cascata)

```
Feature "Guia Prático"
├── FRONTEND
│   ├── ActionPlanPage.tsx:207 (TaskRow)        [EDIT aditivo — inserir botão no estado aprovado]
│   ├── GuiaPraticoButton.tsx                    [NOVO]
│   ├── GuiaPraticoModal.tsx (portal)           [NOVO]
│   └── PDF export → reusar generateDiagnosticoPDF.ts  [REUSO, não html2canvas]
├── BACKEND
│   ├── server/routers/guia-pratico.ts          [NOVO — protectedProcedure .query]
│   ├── server/routers/index.ts (appRouter)     [EDIT — registrar router]  (server/_core/index.ts:7)
│   ├── leitura: raw SQL query() em projects/risks_v4/tasks  [SELECT only]
│   └── LLM: invokeLLM (temp 0.1) + Zod + audit_log on fail  [REUSO + testing.md]
├── SCHEMA
│   └── ZERO migrations  [confirmado — read-only]
└── GOVERNANÇA
    ├── ADR novo (Classe C — ORQ-24)            [OBRIGATÓRIO]
    ├── REGRA-ORQ-30 (temp ≤0.1)                [violação a corrigir]
    ├── ADR-010 / ANTI-HAL-1 (anti-alucinação)  [aplicar]
    └── testing.md (extractJson + integração + audit_log)  [exigido p/ feature LLM]
```

---

## 5. Cirurgia possível?

**Sim, parcialmente.** O TO-BE de UI é cirúrgico e aditivo (1 botão no `TaskRow` + 2 componentes novos). **Mas o backend NÃO é trivial:** novo router LLM com SELECTs raw-SQL multi-tabela + invokeLLM + Zod + audit_log + auth. E há decisões de produto pendentes (anti-alucinação, "consulte advogado"). Escopo real = **Classe C** (cross-cutting backend+frontend+LLM+PDF), não a "alteração cirúrgica" que a spec sugere.

---

## 6. AS-IS (real, com citações)

- **Página ativa de tarefas:** `ActionPlanPage.tsx` (rota `/projetos/:projectId/planos-v4`, `App.tsx:170`), 1350 LOC. Consome `trpc.risksV4.*` (`upsertTask`, `deleteTask`, `listRisks`).
- **Linha de tarefa:** função interna `TaskRow` (`ActionPlanPage.tsx:207`), com `locked` (= plano rascunho), checkbox de status, `onEdit`/`onDelete`. **Não há "TarefaRow.tsx".**
- **Persistência de tarefas/riscos:** **raw SQL** via `db-queries-risks-v4.ts` (tabelas `risks_v4`, `action_plans`, `tasks`, `audit_log`) — **fora do Drizzle ORM**.
- **LLM:** unificado em `invokeLLM` (`llm.ts:287`), modelo gpt-4.1, com retry. Convenção (testing.md): extractJson test + integração + `insertAuditLog` em falha.
- **PDF:** `generateDiagnosticoPDF.ts` (jsPDF + jspdf-autotable) já consumido por ActionPlanPage/ComplianceDashboard/ConsolidacaoV4/PlanoAcaoV3. **html2canvas não instalado.**
- **Auth:** todo router de risco/plano usa `protectedProcedure` (JWT) + `validateProjectAccess`.

## 7. TO-BE (corrigido) com fases + bump ADR

**Premissa read-only confirmada viável** (zero migration). Correções obrigatórias vs spec aplicadas.

- **F0 — Governança (ADR + decisões P.O.):**
  - **ADR novo** (Classe C, ORQ-24 obrigatório): "Guia Prático LLM efêmero read-only no Plano de Ação". Declara: sem persistência, invokeLLM temp 0.1, anti-alucinação (base = `risks_v4.artigo`/`rag_artigo_exato`), protectedProcedure.
  - **Decisão P.O.:** (a) o system prompt "NUNCA diga consulte um advogado" **contradiz** o posicionamento do produto ("Revisão por advogado tributarista recomendada" em todo briefing) — resolver; (b) tolerância a alucinação de passos prescritivos.
- **F1 — Backend (`guia-pratico.ts`):** `protectedProcedure.query` + `validateProjectAccess`; SELECTs **raw SQL** em `projects`/`risks_v4`/`tasks` (join real risco↔task via action_plan, **não** `riscos.tarefaId`); `invokeLLM({ temperature: 0.1, model padrão, context: 'guiaPratico' })`; Zod `GuiaPraticoResponseSchema`; `insertAuditLog` em falha. Registrar em `appRouter`.
- **F2 — Testes LLM (testing.md):** extractJson unit test + integração com LLM real + audit_log.
- **F3 — Frontend componentes:** `GuiaPraticoButton.tsx` + `GuiaPraticoModal.tsx` (portal, AbortController, loading skeletons, seletores, textarea 500).
- **F4 — Inserção no TaskRow:** editar `ActionPlanPage.tsx:207` (estado aprovado, ao lado de onEdit/onDelete).
- **F5 — PDF:** reusar/estender `generateDiagnosticoPDF.ts` (jsPDF) — **não** adicionar html2canvas; carimbo data/hora obrigatório.

**Bump ADR:** **novo ADR** (não há ADR de Guia Prático). ADR-010 (content architecture 98%) é **referenciado** (anti-alucinação), sem bump.

## 8. Auto-auditoria final (cobertura)

| Item | Status | Evidência |
|---|---|---|
| Toda afirmação com arquivo:linha | ✅ | seções 3/6 |
| Grep incluindo testes | ✅ | (sem consumers de teste — feature nova) |
| Grep .sql/.md/.json | ✅ | db-queries (raw SQL), package.json, ADRs |
| Verifiquei PDF/template | ✅ | generateDiagnosticoPDF + package.json |
| Issues pré-existentes | ✅ | 0 |
| ast-grep ≥3 padrões | 🟡 | descoberta foi por grep/ls (alvo é feature nova, não 1 símbolo); ast-grep disponível |
| Dead-read (knip) | 🟡 | N/A — feature nova, sem campo persistido |
| LOC antes de classe | ✅ | ActionPlanPage 1350 → Classe C |
| ADR + bump | ✅ | ADR novo obrigatório; ADR-010 referenciado |
| Writers/readers | ✅ | read-only (só SELECT raw SQL) |
| **Cobertura** | **🟢 ~92%** | pendência: colunas exatas risks_v4/tasks + join real |

## 9. Pendências para Manus / DB-SPEC

1. **Confirmar colunas exatas** (raw SQL, não Drizzle) de `tasks` e `risks_v4`, e **o join real** risco↔tarefa (via `action_plans`, pois `risks_v4` não tem `tarefaId`).
2. **Confirmar como obter "setor"** (não existe `setorAtuacao` — vem de CNAE/companyProfile).
3. **Decisão P.O.** sobre system prompt "consulte advogado" + tolerância anti-alucinação.

---

## Resumo das correções obrigatórias vs spec (antes de F0)

| # | Spec | Correção | Regra |
|---|---|---|---|
| 1 | `temperature: 0.3` | **0.1 (máx)** | REGRA-ORQ-30 🔴 |
| 2 | `publicProcedure` | **protectedProcedure + validateProjectAccess** | segurança 🔴 |
| 3 | `openai...create` + `gpt-4o` | **invokeLLM + gpt-4.1** | testing.md / llm.ts |
| 4 | jsPDF + **html2canvas** | **reusar generateDiagnosticoPDF (jsPDF)** | sem novo dep (ORQ-20) |
| 5 | `PlanosV4/PlanoAcaoCard/TarefaRow` | **ActionPlanPage / TaskRow inline** | arquivos fantasma |
| 6 | `ctx.db.query.tarefas` (Drizzle) | **raw SQL query()** | risks/tasks são raw SQL |
| 7 | `projetos/regimeTributario/setorAtuacao` | **projects/taxRegime/(setor via CNAE)** | schema real |
| 8 | `risco.nome/baseLegal/origem` | **risks_v4.titulo/artigo/source_priority** | schema real |
| 9 | (ausente) testes LLM | **extractJson + integração + audit_log** | testing.md |
| 10 | "Classe cirúrgica" | **Classe C → ADR obrigatório** | REGRA-ORQ-24 |
| 11 | system prompt "nunca consulte advogado" | **decisão P.O.** (contradiz produto) | REGRA-ORQ-31 |
| 12 | LLM gera passos prescritivos | **âncora anti-alucinação** (risks_v4.artigo) | ADR-010 / ANTI-HAL-1 |

---

## Anexo — Visual TO-BE (mockups botao-novo.pdf + to-be-pop-up.pdf)

### Mapa card → dados reais (confirma consumers, seção 3)

| Elemento no card (mockup) | Campo real | Tabela |
|---|---|---|
| "Avaliar enquadramento em regime diferenciado…" | `categoria`/título da ação | `action_plans`/`risks_v4` |
| breadcrumb "Questionário de conformidade SOLARIS › Regime Diferenciado" | `source_priority`(solaris→label) + `categoria` | `risks_v4` |
| "Art. 126 LC 214/2025; Arts. 200, 201, 203, 245 Decreto" | `artigo` + `normative_bundle.artigos_decreto` | `risks_v4` / `risk_categories` |
| "Responsável: advogado" / "advogado·gestor_fiscal·ti" | `responsavel` | `tasks` |
| Botão "Guia Prático" (pill gradiente, quebra 2 linhas) | — | TaskRow inline (`ActionPlanPage.tsx:207`) |

> A ref "Art. 126" no card é o valor corrigido no **LEGAL-3 (#1389)** — a âncora anti-alucinação JÁ existe no dado.

### Mapa modal → dados (to-be-pop-up.pdf)

| Banner/seção | Origem |
|---|---|
| "Empresa de TI e Consultoria" | **`projects.businessType`** (não `setorAtuacao`) — **verificar cobertura (Lição #66)** |
| "Simples Nacional" | `projects.taxRegime` |
| "Responsável: Advogado" | `tasks.responsavel` |
| Alerta âmbar + 4 passos (tags ⏱/📌/✅) | saída LLM (`alertaCritico`, `passos[]` com `tagTipo`) |
| Footer "Regerar / Exportar PDF" + carimbo | client-side (jsPDF, carimbo `new Date()`) |

### Achados de UX do visual

- 🟠 **Anti-alucinação materializada:** o passo 2 do mockup vaza *"ISS diferenciado por município"* — ISS é o regime **antigo** (substituído por IBS/CBS). Prova que regra de prompt é best-effort (Lição #90); decisão D-2 = guia ilustrativo não-vinculante + disclaimer.
- 🟡 **Divergência de layout:** o `to-be-pop-up.pdf` **não mostra** os seletores (Resumido/Normal/Detalhado · Simples/Normal/Especialista) nem a textarea (0/500) que a spec/HTML têm. Decisão P.O.: **canônico = HTML/spec** (seletores + textarea abaixo do scroll).
- 🟢 Botão aditivo no TaskRow + modal não tocam fluxos existentes.
