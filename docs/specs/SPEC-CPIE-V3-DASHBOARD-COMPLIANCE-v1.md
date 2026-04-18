# SPEC — CPIE v3: Dashboard de Compliance (on-demand)

## IA SOLARIS · Compliance Tributário v2
## Versão 1.0 · 2026-04-18 · Audiência: P.O. · Orquestrador · Claude Code · Manus
## Base: CPIE_SCORES_MAPEAMENTO.md (mergeado em #721)

---

## Contexto

**Problema atual (pré-TO-BE):**
- 4 scores chamados "CPIE" coexistindo (v1 Profile, v2 Conflict Intelligence, CPIE-B Scoring Engine, Compliance Score v4) → ambiguidade crônica
- Dashboard admin mostra `0% · 0/2367 analisados` — `profileCompleteness` nunca populado (bug estrutural documentado em PR #721)
- Gate `min_score_to_advance=30` em comportamento indefinido
- LLM usado para gerar perguntas dinâmicas do perfil — conflita com determinismo jurídico

**Decisão P.O. 18/04/2026 (declarada em `Decisão final consolidada`):**

> CPIE v3 = Dashboard simples, manual, determinístico,
> sem persistência nova e sem dependência de LLM.

**3 indicadores visíveis:**

| Nome na UI | Base | Cálculo |
|---|---|---|
| **Score de Compliance** (principal) | Compliance Score v4 existente | `Σ(peso × max(conf, 0.5)) / (n × 9) × 100` |
| **Qualidade do Perfil** (auxiliar) | Campos preenchidos em `companyProfile` | `filled/total × 100` — cálculo frontend |
| **Execução do Plano** (auxiliar) | Tasks done vs total | `done/total × 100` |

---

## Bloco 1 — Fluxo declarado (ORQ-13)

**Step:** N/A — página em paralelo ao fluxo principal
**Upstream:** 
  - (a) Usuário clica link "Dashboard Compliance" no menu global, OU
  - (b) Usuário clica botão "Ver Score" dentro de um projeto
**Downstream:** 
  - Usuário clica "Gerar Dashboard" → 3 scores renderizam
  - (opcional) Usuário clica "Exportar PDF" → download

**Integrações obrigatórias (triggers):**
- `trpc.compliance.computeScores({ projectId })` — procedure nova read-only
- Leitura: `risks_v4`, `action_plans`, `tasks`, `projects.companyProfile`
- Escrita: **zero** (sem persistência nova)

**ORQ-14 — 4 elementos obrigatórios:**
- Imediato: 3 cards + valores
- Cascata: nenhum side-effect
- Formato: ver Bloco 5
- Navegação: botão "Voltar ao projeto" + botão "Exportar PDF"

**RN:** mesmo Compliance Score v4 (RN-CV4 existente em `RN_CONSOLIDACAO_V4.md`)

---

## Bloco 2 — UX Spec

**Mockup de referência:** documentado na discussão 2026-04-18 (wireframe ASCII com frames ScoreCard + IndicatorsRow + Filters + RiskList + ActionPlanCard + AuditLog + ScoreExplanation).

Dado que CPIE v3 é página nova, **ORQ-16 aplica:** mockup HTML completo deve ser gerado pelo Orquestrador antes de F6 se houver necessidade de revisão visual. Para esta spec, o wireframe conceitual é suficiente — `data-testid` listados no Bloco 9 fazem o contrato.

**Princípios visuais:**
- "1 tela → 1 decisão → 1 score claro"
- Score principal ocupa hero do topo (grande, visual)
- Auxiliares ficam em row secundário (pequenos, cinza claro)
- Modal de fórmula é clicável — transparência obrigatória
- Export PDF é botão secundário visível

---

## Bloco 3 — Skeleton (arquivos a criar ou modificar)

### 3.1 Arquivos NOVOS

| # | Arquivo | Propósito |
|---|---|---|
| 1 | `server/routers/complianceRouter.ts` | Router tRPC novo — procedure `computeScores` (read-only) |
| 2 | `server/lib/compute-compliance-scores.ts` | Função pura — orquestra Compliance Score v4 + cálculos auxiliares |
| 3 | `server/lib/compute-execution-score.ts` | Cálculo "Execução do Plano" (`done/total × 100`) — função pura |
| 4 | `server/lib/compute-execution-score.test.ts` | Unit test |
| 5 | `client/src/pages/ComplianceDashboard.tsx` | Página nova — rota `/projetos/:id/compliance-dashboard` |
| 6 | `client/src/components/compliance/ScoreCard.tsx` | Card principal (grande, hero) |
| 7 | `client/src/components/compliance/AuxiliaryScoresRow.tsx` | Row com 2 cards auxiliares |
| 8 | `client/src/components/compliance/ScoreFormulaModal.tsx` | Modal de fórmula |
| 9 | `client/src/lib/compute-profile-quality.ts` | Função pura frontend — conta campos preenchidos |
| 10 | `client/src/lib/compute-profile-quality.test.ts` | Unit test |
| 11 | `tests/e2e/compliance-dashboard.spec.ts` | E2E Playwright |

### 3.2 Arquivos MODIFICADOS

| # | Arquivo | Mudança |
|---|---|---|
| 12 | `server/_core/trpc.ts` (ou onde routers são registrados) | Registrar `complianceRouter` |
| 13 | `client/src/App.tsx` | Adicionar rota `/projetos/:id/compliance-dashboard` (lazy) |
| 14 | `client/src/components/ComplianceLayout.tsx` | Link "Dashboard Compliance" no menu global |
| 15 | `client/src/pages/ProjetoDetalhesV2.tsx` | Botão contextual "Ver Score" |
| 16 | `client/src/pages/NovoProjeto.tsx` | **Remover gate** — linhas ~220-270 (bloco `cpieV2.analyzePreview` + `createProject.onSuccess`). Fluxo passa direto para `createProject`. |
| 17 | `client/src/components/PerfilEmpresaIntelligente.tsx` | **Simplificar** — remover `cpie.analyze.useMutation` + chamadas IA. Manter contador de % campos via `compute-profile-quality.ts`. |

### 3.3 Arquivos DEPRECADOS (marcar `@deprecated`, NÃO deletar)

| # | Arquivo | Status |
|---|---|---|
| 18 | `server/cpie.ts` | `@deprecated use compute-compliance-scores` |
| 19 | `server/cpie-v2.ts` | `@deprecated — Conflict Intelligence não usado no CPIE v3` |
| 20 | `server/routers/cpieRouter.ts` | `@deprecated use complianceRouter` |
| 21 | `server/routers/cpieV2Router.ts` | `@deprecated — analyzePreview gate removido` |
| 22 | `server/routers/scoringEngine.ts` | `@deprecated — CPIE-B substituído por Compliance Score v4` |
| 23 | `server/jobs/monthlyReportJob.ts` | `@deprecated — cron não executa` |
| 24 | `server/cpie-v2-evidence.ts`, `cpie-v2-evidence-fase2.ts` | `@deprecated` |
| 25 | `server/calibration-test.ts`, `determinism-test.ts`, `pre-homologacao.ts` | `@deprecated` |
| 26 | `client/src/components/CpieScoreBadge.tsx` | `@deprecated — não é mais exibido em /projetos` |
| 27 | `client/src/components/CpieBatchPanel.tsx` | `@deprecated` |
| 28 | `client/src/components/CpieHistoryPanel.tsx` | `@deprecated` |
| 29 | `client/src/components/CpieSettingsPanel.tsx` | `@deprecated` |
| 30 | `client/src/components/CpieReportExport.tsx` | **Reaproveitar** — renomear ou manter + usar no novo dashboard (PDF export) |
| 31 | `client/src/pages/AdminCpieDashboard.tsx` | `@deprecated — substituído por ComplianceDashboard.tsx` |

### 3.4 Arquivos NÃO tocar (explícito)

| Arquivo | Motivo |
|---|---|
| `server/lib/compliance-score-v4.ts` | Core preservado — usado por Step 7 |
| `server/routers/risks-v4.ts` procedure `calculateAndSaveScore` | Preservado — Step 7 depende do snapshot |
| `client/src/pages/ConsolidacaoV4.tsx` | Preservado — Step 7 continua gerando entregável formal |
| Tabelas DB `cpieAnalysisHistory`, `cpieSettings`, `cpie_score_history` | Preservadas — drop em sprint futura |
| Colunas `projects.profileCompleteness/profileConfidence/profileLastAnalyzedAt/profileIntelligenceData` | Preservadas — drop em sprint futura |

---

## Bloco 4 — Schema

**Nenhuma mudança de banco.**

Tabelas CPIE legadas (`cpieAnalysisHistory`, `cpieSettings`, `cpie_score_history`) e colunas `projects.profileCompleteness/profileConfidence/profileLastAnalyzedAt/profileIntelligenceData` **permanecem** mas param de ser escritas. Drop diferido para sprint futura (decisão D9.b).

**Zero migration.**

---

## Bloco 5 — Contrato da procedure nova

### `trpc.compliance.computeScores`

**Tipo:** query (leitura pura, idempotente)
**Autenticação:** protectedProcedure
**Input:**
```typescript
{ projectId: number }
```
**Output:**
```typescript
{
  formula_version: "v3.0",
  computed_at: string,  // ISO 8601
  compliance: {
    score: number,              // 0-100 (cap ~77.78% pela fórmula v4)
    nivel: "critico" | "alto" | "medio" | "baixo",
    total_riscos_aprovados: number,
    total_alta: number,
    total_media: number,
    total_oportunidade: number,
  } | {
    score: 0,
    nivel: "baixo",
    state: "no_approved_risks",    // estado especial — renderiza texto "nenhum risco aprovado ainda"
  },
  execution: {
    percent: number,               // 0-100
    plans: {
      approved: number,
      total: number,
    },
    tasks: {
      done: number,
      total: number,
    },
  } | {
    state: "no_plans_yet",         // estado especial se 0 planos
  },
}
```

**Cálculo "Qualidade do Perfil" NÃO está no output** — é calculado no frontend via `compute-profile-quality.ts` usando `companyProfile` já disponível (não precisa round-trip).

**Restrições:**
- **Zero escrita** — procedure é puramente read-only
- **Zero LLM** — todas as fórmulas determinísticas
- **Reusa** `calculateComplianceScore` de `compliance-score-v4.ts` sem modificá-lo

### Exemplo de retorno (projeto com dados):
```json
{
  "formula_version": "v3.0",
  "computed_at": "2026-04-18T20:45:00Z",
  "compliance": {
    "score": 62,
    "nivel": "alto",
    "total_riscos_aprovados": 3,
    "total_alta": 1,
    "total_media": 2,
    "total_oportunidade": 0
  },
  "execution": {
    "percent": 33,
    "plans": { "approved": 2, "total": 5 },
    "tasks": { "done": 3, "total": 9 }
  }
}
```

### Exemplo de retorno (projeto sem dados):
```json
{
  "formula_version": "v3.0",
  "computed_at": "2026-04-18T20:45:00Z",
  "compliance": { "score": 0, "nivel": "baixo", "state": "no_approved_risks" },
  "execution": { "state": "no_plans_yet" }
}
```

---

## Bloco 6 — Estado atual (comandos pré-implementação)

```bash
# Confirmar base source disponível
ls server/lib/compliance-score-v4.ts
# Esperado: arquivo existe (v4 mergeado em PR #722 no main)

# Confirmar componentes CPIE atuais a deprecar
ls client/src/components/CpieScoreBadge.tsx \
   client/src/components/CpieBatchPanel.tsx \
   client/src/components/CpieHistoryPanel.tsx \
   client/src/components/CpieSettingsPanel.tsx \
   client/src/pages/AdminCpieDashboard.tsx
# Esperado: todos existem

# Confirmar gate atual em NovoProjeto.tsx
grep -n "cpieV2.analyzePreview\|canProceed" client/src/pages/NovoProjeto.tsx | head -5
# Esperado: linhas 220-270 têm o gate

# Confirmar router registry
grep -n "cpieRouter\|cpieV2Router" server/_core/trpc.ts server/routers/index.ts 2>/dev/null | head -5
# Identificar onde registrar complianceRouter novo

# TypeScript baseline
pnpm tsc --noEmit 2>&1 | tail -3
# Esperado: 0 erros (base limpa)
```

---

## Bloco 7 — Critérios de aceite

### Funcionalidade principal (wave A)

- [ ] Rota `/projetos/:id/compliance-dashboard` renderiza página
- [ ] Botão "Gerar Dashboard" dispara `trpc.compliance.computeScores.fetch()`
- [ ] Card **Score de Compliance** renderiza com valor + nível + breakdown
- [ ] Card **Qualidade do Perfil** renderiza com % campos preenchidos + alerta se < 50%
- [ ] Card **Execução do Plano** renderiza com % tasks done + plans approved count
- [ ] Modal "Ver Fórmula" abre com explicação determinística (sem LLM)
- [ ] Botão "Exportar PDF" gera arquivo com os 3 scores + fórmula
- [ ] Estado "sem dados" renderiza quando:
  - 0 riscos aprovados (Compliance Score)
  - 0 tasks (Execução — evita divisão por zero)
- [ ] Voltar ao projeto funciona (breadcrumb ou botão)

### Discoverability (wave A)

- [ ] Link "Dashboard Compliance" aparece no menu principal
- [ ] Botão "Ver Score" contextual em `/projetos/:id` redireciona para o dashboard

### Remoção de gate + simplificação IA (wave A)

- [ ] `NovoProjeto.tsx` não chama mais `trpc.cpieV2.analyzePreview`
- [ ] Fluxo de criação de projeto **não trava** por score baixo (qualquer perfil passa)
- [ ] `PerfilEmpresaIntelligente.tsx` não chama mais `trpc.cpie.analyze`
- [ ] `PerfilEmpresaIntelligente.tsx` ainda mostra contador de % campos (via função pura nova)

### Depreciação do legado (wave B)

- [ ] 14 arquivos marcados com `@deprecated` (ver Bloco 3.3)
- [ ] TypeScript build continua passando com zero erros
- [ ] Testes unit existentes em `server/cpie.test.ts` etc continuam passando OU são marcados `it.skip` com justificativa

### Qualidade

- [ ] `pnpm tsc --noEmit` → 0 erros
- [ ] Unit tests novos passam (compute-execution-score, compute-profile-quality)
- [ ] E2E `compliance-dashboard.spec.ts` passa (5 CTs — listados abaixo)
- [ ] `trpc.compliance.computeScores` é read-only (verificar via audit_log — zero entries após N chamadas)

---

## Bloco 8 — Armadilhas

1. **NÃO modificar `calculateAndSaveScore`** em `risks-v4.ts` — Step 7 Consolidação depende do snapshot. Criar procedure **nova**, não reusar/alterar.

2. **NÃO deletar código CPIE legado** — apenas marcar `@deprecated`. Drop ficará em sprint de limpeza futura (decisão D9.b).

3. **Divisão por zero em Execução do Plano:** se `tasks.total === 0`, **não calcular `done/total`** — retornar `{ state: "no_plans_yet" }`. Frontend renderiza "Nenhuma tarefa criada ainda".

4. **Compliance Score = 0 não é nível crítico:** o nível `baixo` é bom (sem exposição). Estado especial `no_approved_risks` é diferente: é "ainda não há dados", não "score zero".

5. **Cálculo Qualidade do Perfil deve bater com cpie.ts legado** (para usuários que viram score antigo não se assustarem com mudança): usar mesma definição de "campo preenchido" do `cpie.ts:calcDimensionScores`:
   - `cnpj`: length === 14 dígitos
   - `companyType`, `companySize`, `taxRegime`, `annualRevenueRange`, `operationType`: `!!value`
   - `clientType`, `paymentMethods`: `Array.length > 0`
   - Booleans (`multiState`, `hasImportExport`, etc): `!== null && !== undefined`
   - **Total de campos:** 16 (mesmo do `confidenceScore` legado)

6. **NOVO data-testid obrigatório** nos componentes novos — E2E precisa.

7. **PDF export reusa `generateDiagnosticoPDF.ts`** ou variante? **Decisão:** criar variante `generateComplianceDashboardPDF` (ou passar flag) que renderiza apenas os 3 scores + fórmula, não todo o diagnóstico. Custo: 1h de adaptação.

8. **Remoção do gate em NovoProjeto é breaking change para UX:** usuários acostumados a receber feedback de perfil incompleto agora podem criar projeto vazio. Mitigação: `PerfilEmpresaIntelligente` continua mostrando alerta "Perfil 32% — complete para melhor diagnóstico", só que sem travar.

9. **Rota nova conflita com rota existente?** Verificar que `/projetos/:id/compliance-dashboard` não colide com rotas wildcard. Playwright `--list` pode validar.

10. **Dashboard admin atual `/admin/cpie-dashboard`:** após deploy, redirecionar para `/admin/compliance-redirect` com mensagem "substituído por Dashboard de Compliance por projeto" OU deixar página com banner deprecated. **Decisão:** deixar página com banner, redirect é refactor mais caro.

---

## Bloco 9 — data-testid (cobertura E2E)

### Novos na página `ComplianceDashboard.tsx`

```
compliance-dashboard-page
btn-gerar-dashboard
score-card-principal
score-valor-principal             # exibe o número (ex: "62")
score-nivel-principal             # exibe nível (ex: "MÉDIO")
score-breakdown-principal         # "3 aprovados · 1 alta · 2 média"
score-card-profile
score-valor-profile               # "45%"
score-alert-profile               # alerta se < 50%
score-card-execution
score-valor-execution             # "33%"
score-breakdown-execution         # "3 de 9 tarefas · 2 de 5 planos"
btn-ver-formula
formula-modal
formula-modal-close
btn-exportar-pdf
btn-voltar-projeto
state-no-approved-risks           # quando Compliance vazio
state-no-plans-yet                # quando Execução vazia
```

### Novos em navegação

```
menu-link-compliance-dashboard    # em ComplianceLayout
btn-ver-score-projeto             # contextual em ProjetoDetalhesV2
```

### Preservados (não tocar)

Componentes de Step 5 (RiskDashboardV4) e Step 7 (ConsolidacaoV4) mantêm seus `data-testid` inalterados.

---

## ADR — Decisões arquiteturais

### ADR-CPIE-V3-01 — On-demand em vez de reativo

**Contexto:** modelo anterior (cpieV2.analyzePreview, cpie.analyze, monthlyReportJob) tentava manter score atualizado automaticamente. Resultado: 4 pontos de cálculo, `saveAnalysis` órfão, cron nunca configurado, 0/2367 projetos analisados.

**Decisão:** um único ponto de cálculo (`computeScores`) disparado por clique explícito do usuário.

**Consequências:**
- (+) Simplicidade — 1 procedure, 1 botão, 1 resultado
- (+) Performance previsível — sem cálculo em background
- (+) UX de controle — usuário decide quando quer o número
- (−) Descoberta — precisa educar usuário sobre o botão (mitigado por link menu + botão contextual)

**Alternativa rejeitada:** cálculo automático ao abrir a página. Motivo: ficaria parecido com tentativas anteriores que falharam.

---

### ADR-CPIE-V3-02 — Zero persistência nova

**Contexto:** modelos anteriores persistiam em 3 tabelas + 4 colunas. Nada era lido consistentemente (`profileCompleteness=0` em 2367 projetos).

**Decisão:** procedure read-only, cálculo efêmero, nenhuma escrita no banco.

**Consequências:**
- (+) Zero migration
- (+) Zero bug de "dado stale"
- (+) Coerência permanente — número exibido é sempre da última leitura
- (−) Sem histórico temporal — usuário não vê evolução do score ao longo do tempo
- (−) Auditoria jurídica por snapshot fica restrita ao Step 7 (que preserva em `projects.scoringData.snapshots[]`)

**Mitigação da perda de histórico:** Step 7 continua salvando snapshots — se P.O. precisar de histórico, vai à consolidação. Dashboard é consulta viva.

---

### ADR-CPIE-V3-03 — LLM proibido no cálculo

**Contexto:** cpie.ts v1 usa LLM para gerar `dynamicQuestions` + `insights`. CPIE v2 usa LLM como "árbitro de realidade". Ambos introduzem não-determinismo.

**Decisão:** 100% determinístico. Zero chamada LLM nos cálculos dos 3 scores.

**Consequências:**
- (+) Defensibilidade jurídica — mesmo input, mesmo output, sempre
- (+) Zero custo de API LLM
- (+) Zero latência de chamada externa
- (−) Perda de feature "assistente IA" para completar perfil
- Mitigação: `PerfilEmpresaIntelligente` continua existindo mas simplificado — só contador de campos, sem sugestões LLM

---

### ADR-CPIE-V3-04 — Coexistência com Step 7

**Contexto:** Step 7 (ConsolidacaoV4) já mostra score + gera PDF + salva snapshot. Risco de duplicação.

**Decisão:** coexistem com propósitos distintos:
- **Dashboard Compliance:** consulta rápida, on-demand, efêmera, 3 scores
- **Step 7:** entregável formal ao cliente, com snapshot histórico, PDF completo com base legal, tabelas de riscos/planos

**Consequências:**
- (+) Sem refatoração do Step 7 (escopo reduzido)
- (+) Propósitos claros para o advogado
- (−) Possível confusão inicial sobre "qual é o oficial"

**Mitigação:** dashboard mostra banner "Para entregável ao cliente, use a Consolidação Step 7" com link.

---

### ADR-CPIE-V3-05 — Legado CPIE deprecado, não deletado

**Contexto:** ~20 arquivos no código (v1, v2, CPIE-B, router, componentes UI). Deletar requer verificação de imports órfãos + migration de tabelas.

**Decisão:** marcar `@deprecated` com comentário explicativo. Drop em sprint futura.

**Consequências:**
- (+) Entrega rápida desta sprint
- (+) Zero risco de quebrar algo não-mapeado
- (+) Dev futuros sabem que é legado (JSDoc `@deprecated`)
- (−) Código morto no repo (até o drop futuro)

---

## Contrato (resumo — Bloco 5 completo)

### Input/Output: ver Bloco 5.

### Erros:
- `NOT_FOUND` — projeto não existe ou não pertence ao usuário
- `UNAUTHORIZED` — sem cookie de auth
- (nenhum erro de validação de dados — leitura é sempre segura)

### Performance esperada:
- < 500ms por chamada (1 query `risks_v4` + 1 `action_plans` + 1 `tasks` + cálculo in-memory)
- Sem cache necessário — on-demand é rápido o suficiente

---

## Fluxo E2E (operacional)

```
1. P.O. aprova esta spec
   ↓
2. Orquestrador cria issue + aplica 5 labels spec-* (após F3 PASS)
   ↓
3. Orquestrador despacha F6 Claude Code
   Claude Code cria branch feat/cpie-v3-dashboard-compliance
   ↓
4. Wave A (1-2 dias):
   a. Criar compute-compliance-scores.ts + compute-execution-score.ts
   b. Criar complianceRouter.ts + registrar em _core/trpc
   c. Criar ComplianceDashboard.tsx + 3 componentes filhos
   d. Criar compute-profile-quality.ts (frontend)
   e. Modificar App.tsx (rota lazy)
   f. Modificar ComplianceLayout.tsx (menu link)
   g. Modificar ProjetoDetalhesV2.tsx (botão contextual)
   h. REMOVER gate em NovoProjeto.tsx (linhas ~220-270)
   i. Simplificar PerfilEmpresaIntelligente.tsx
   j. tsc 0 erros + unit tests novos passando
   ↓
5. Wave B (1-2 dias):
   a. Marcar @deprecated em 14 arquivos (Bloco 3.3)
   b. Verificar que tsc continua passando
   c. Adaptar CpieReportExport → generateComplianceDashboardPDF (ou equivalente)
   ↓
6. E2E Playwright (compliance-dashboard.spec.ts):
   CT-1: /projetos/:id/compliance-dashboard carrega
   CT-2: Botão "Gerar Dashboard" dispara compute + renderiza 3 cards
   CT-3: Modal de fórmula abre e mostra explicação
   CT-4: Link menu leva ao dashboard
   CT-5: Botão "Exportar PDF" gera download (presence check)
   ↓
7. PR aberto: "feat(compliance): Dashboard de Compliance v3 on-demand"
   Body template ORQ-15 + risk_level: medium + evidência JSON
   ↓
8. Manus executa E2E em ambiente com dados reais (projeto 930001 ou destrutivo)
   ↓
9. P.O. aprova merge
   ↓
10. Pós-merge: UAT com advogado (teste manual real)
```

---

## O que NÃO entra nesta sprint (explícito)

- ❌ Drop de tabelas/colunas CPIE legadas (sprint futura)
- ❌ Deletar código CPIE legado (só `@deprecated`)
- ❌ Refatoração do Step 7 ConsolidacaoV4 (fica como está)
- ❌ Dashboard admin agregado `/admin/compliance-dashboard` (fica para depois)
- ❌ Histórico de snapshots no dashboard novo (sem persistência = sem histórico)
- ❌ Recálculo automático em approveRisk/deleteRisk (é on-demand)
- ❌ Backfill dos 2367 `profileCompleteness=0` (cálculo é frontend, não usa esse campo)
- ❌ Ativação de CPIE v2 Fase 3 (Conflict Intelligence — não entra no TO-BE)

---

## Condição de merge — ESPECIAL

Fluxo de aceite em 4 etapas:

```
ETAPA 1 — Implementação wave A + wave B (Claude Code)
ETAPA 2 — E2E 5/5 PASS validado pelo Manus
ETAPA 3 — Teste manual P.O. — acessar dashboard, gerar, ver 3 scores, exportar PDF
ETAPA 4 — P.O. aprova merge
```

**NÃO mergear antes da ETAPA 4.** Mesmo com E2E 100% PASS.

Pós-merge: **UAT com advogado** (caso real) = validação final antes de considerar CPIE v3 estável.

---

## Pendências bloqueadoras (antes de F1)

Nenhuma pendência bloqueadora. Todas as 6 decisões (D1-D10) fechadas. TO-BE consolidado. Base técnica (`compliance-score-v4.ts`) existe no main desde #722.

---

## Referências

- `docs/governance/CPIE_SCORES_MAPEAMENTO.md` — mapeamento dos 4 scores anteriores (mergeado em #721)
- `server/lib/compliance-score-v4.ts` — core reutilizado
- `docs/governance/RN_CONSOLIDACAO_V4.md` — RN-CV4-01..16 (regra do Score D)
- ADR-0023 — débito CPIE-B (endereçado via deprecação)
- SPEC-TESTE-MATRIZ-RISCOS-v1.md — padrão de spec seguido

---

## Decisões consolidadas (da conversa P.O. 2026-04-18)

| ID | Tema | Decisão |
|---|---|---|
| D1 | Escopo do Dashboard | 1 projeto por vez (`/projetos/:id/compliance-dashboard`) |
| D3 | Cálculo vs persistência | Nova procedure read-only `computeScores` |
| D4 | Relação com Step 7 | Coexistem (propósitos distintos) |
| D7 | PerfilEmpresaIntelligente | Manter sem IA (só contador) |
| D9 | Legado CPIE (DB + código) | `@deprecated`, drop em sprint futura |
| D10 | Discoverability | Menu global + botão contextual (ambos) |
| — | Modelo geral | On-demand, manual, determinístico |
| — | Persistência | Zero |
| — | LLM no cálculo | Proibido |
| — | Gate de score | Removido |

---

*IA SOLARIS · Spec CPIE v3 · Dashboard de Compliance on-demand · 2026-04-18*
*Versão 1.0 · Aguarda aprovação P.O. + Orquestrador*
*Após aprovação: submeter como issue com 5 labels spec-* + 4 blocos obrigatórios (Bloco 9 · ADR · Contrato · Fluxo E2E — todos presentes)*
