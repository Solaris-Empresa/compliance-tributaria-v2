# SPEC AMENDMENT — CPIE v3: Dashboard de Compliance (v1.1)

## IA SOLARIS · Compliance Tributário v2
## Versão 1.1 · 2026-04-19 · Audiência: P.O. · Orquestrador · Claude Code · Manus
## Supersede (parcial): SPEC-CPIE-V3-DASHBOARD-COMPLIANCE-v1.0 (2026-04-18)
## ADR fundamentador: [ADR-0029](../adr/ADR-0029-cpie-v3-drop-estrategia-excecoes.md)

---

## Natureza deste documento

**Isto é um AMENDMENT DELTA, não uma spec reescrita.** A spec v1.0 permanece em vigor integralmente, exceto pelos blocos listados em "Blocos substituídos" abaixo. Ambos os documentos devem ser lidos em conjunto pelo implementador.

### Blocos preservados de v1.0 (sem alteração)
- **Contexto** (linhas 9-29) — 4 scores "CPIE", decisão P.O. 18/04, 3 indicadores visíveis
- **Bloco 1 — Fluxo declarado (ORQ-13)** — página em paralelo ao fluxo principal
- **Bloco 2 — UX Spec** — wireframe conceitual, data-testids como contrato
- **Bloco 3.1 — Arquivos NOVOS** (11 itens) — já implementados em Wave A.1 (PR #728)
- **Bloco 3.2 — Arquivos MODIFICADOS** (itens 12-17) — já implementados em Wave A.1 (PR #728)
- **Bloco 5 — Contrato da procedure `trpc.compliance.computeScores`** — read-only, já implementado em Wave A.1
- **Bloco 6 — Estado atual (comandos pré-implementação)** — válido, complementado pelo Bloco 6' deste amendment
- **Bloco 9 — data-testid (cobertura E2E)** — preservado **exceto** um data-testid obsoleto após PR #732 (ver armadilha #15): o `menu-link-compliance-dashboard` listado na seção "Novos em navegação" v1.0 foi removido de `ComplianceLayout.tsx` em commit `307316b` (2026-04-19). Discoverability agora passa pelo `btn-ver-score-projeto` em `ProjetoDetalhesV2.tsx` (já preservado na mesma seção v1.0). Todos os demais data-testid da v1.0 permanecem em vigor.
- **ADR-CPIE-V3-01 e ADR-CPIE-V3-02** — on-demand e zero persistência, preservados

### Blocos substituídos por v1.1
- **Bloco 3.3** — de "@deprecated, NÃO deletar" (14 arquivos) → "DELETAR" (24 arquivos)
- **Bloco 3.4** — inclui agora autorização explícita de apagamento de dados
- **Bloco 4** — de "Nenhuma mudança de banco" → migration destrutiva detalhada
- **Bloco 7 seção "Depreciação do legado (wave B)"** — critérios de aceite recalibrados para DROP
- **Bloco 8 item #2** — invariante "NÃO deletar" removida; substituída pela ordem de execução (Guardrail 1 do ADR-0029)

### Bloco novo adicionado
- **Bloco EX — Exceções autorizadas a restrições absolutas** (EX-1, EX-2, EX-3)
- **Bloco 6' — Comandos pré-implementação (complemento Wave A.2 + B)**

---

## Wave structure após este amendment

| Wave | Escopo | Status | PR |
|---|---|---|---|
| **A.1** | Arquivos novos (Bloco 3.1) + modificados contidos (itens 12, 13, 14, 15, 16, 17) + procedure nova (Bloco 5) | ✅ MERGED | #728 |
| **A.2** | Remoção de gate em `NovoProjeto.tsx` + simplificação `PerfilEmpresaIntelligente.tsx` (itens 16, 17 da Bloco 3.2 v1, revisitados) + cascata em consumidores descobertos | PENDENTE | TBD |
| **B** | DELETE dos 24 arquivos + migration destrutiva (DROP TABLE + DROP COLUMN) + EX-1, EX-2, EX-3 | PENDENTE | mesmo PR que A.2 |

**Decisão P.O.:** Wave A.2 + Wave B em **PR único**, porque DELETE de código + consumidores + migration destrutiva formam uma única operação coesa (ALT-2 rejeitada no ADR-0029).

---

## Bloco 3.3 (SUBSTITUÍDO) — Arquivos a DELETAR na Wave B

> **Mudança fundamental em relação à v1.0:** os arquivos listados abaixo **são deletados do repositório**, não mais marcados com `@deprecated`. Justificativa e autorização: ADR-0029 D-1.

### Categoria A — Módulos CPIE backend (migração v1.0 #18-#25)

| # | Arquivo | Procedure/Função chave a sumir |
|---|---|---|
| 1 | `server/cpie.ts` | `calcDimensionScores`, `saveAnalysis` |
| 2 | `server/cpie-v2.ts` | Conflict Intelligence |
| 3 | `server/cpie-v2-evidence.ts` | Evidência CPIE v2 fase 1 |
| 4 | `server/cpie-v2-evidence-fase2.ts` | Evidência CPIE v2 fase 2 |
| 5 | `server/routers/cpieRouter.ts` | `trpc.cpie.*` — analyze, getAnalysisHistory, saveAnalysisToHistory, getProjectAnalysis, generateReport, getSettings, updateSettings, batchAnalyze, generateMonthlyReport |
| 6 | `server/routers/cpieV2Router.ts` | `trpc.cpieV2.*` — analyzePreview, overrideSoftBlock, acknowledgeMediumConflicts, analyze |
| 7 | `server/routers/scoringEngine.ts` | `trpc.scoringEngine.*` — getScore, getHistory, persistScore, getLowScoreProjects |
| 8 | `server/jobs/monthlyReportJob.ts` | `initMonthlyReportJob`, `runMonthlyReport` |

### Categoria B — Scripts de teste manual CPIE (migração v1.0 #25 desmembrado)

| # | Arquivo | Uso |
|---|---|---|
| 9 | `server/calibration-test.ts` | Script de calibração CPIE-B |
| 10 | `server/determinism-test.ts` | Validação de determinismo CPIE-B |
| 11 | `server/pre-homologacao.ts` | Pré-homologação CPIE v1 |

### Categoria C — Testes órfãos (NOVO no amendment — grep 2026-04-19)

Comando reproduzível:
```bash
find server -name "*.test.ts" | xargs grep -lE "cpie|CPIE" 2>/dev/null
grep -nE "from [\"']\\.\\./cpie" server/integration/*.test.ts
```

| # | Arquivo | Motivo de exclusão |
|---|---|---|
| 12 | `server/cpie.test.ts` | Testes de `server/cpie.ts` (será deletado — item 1) |
| 13 | `server/cpie-v2.test.ts` | Testes de `server/cpie-v2.ts` (será deletado — item 2) |
| 14 | `server/cpieV2Router.test.ts` | Testes do router v2 (será deletado — item 6) |
| 15 | `server/sprint-s-lotes-be.test.ts` | Cobre cenários de CPIE-B (scoringEngine, item 7) |
| 16 | `server/integration/routers-scoring-engine.test.ts` | Integration do scoringEngine (item 7) |
| 17 | `server/integration/e2e-flow.test.ts` | Importa `from "../cpie"` na linha 18 + `describe("Fluxo CPIE — E2E")` — 100% CPIE (evidência grep: 9 matches de CPIE/cpie no arquivo) |

> **Decisão R3 (registrada no ADR-0029):** `server/integration/routers-bateria-avancada.test.ts` **NÃO é deletado**. Apesar do comentário de header mencionar "Plataforma CPIE v2", o arquivo importa apenas `vitest` e `mysql2/promise` — nenhum `trpc.cpie*`, nenhum `from "../cpie"`. Os 50 testes cobrem `project_gaps_v3`, `project_risks_v3`, `project_actions_v3` (Pipeline 3 Ondas v3/v4 ativo, não CPIE). Edição opcional: remover a string "CPIE v2" do comentário de header (linha 4), sem efeito em runtime. Claude Code decide se aplica o ajuste cosmético junto.

### Categoria D — Componentes frontend CPIE (migração v1.0 #26-#29, #31)

| # | Arquivo | Consumidores a ajustar (ver Categoria F) |
|---|---|---|
| 18 | `client/src/components/CpieScoreBadge.tsx` | `Projetos.tsx`, `ComplianceDashboardV3.tsx` |
| 19 | `client/src/components/CpieBatchPanel.tsx` | `AdminConsistencia.tsx` |
| 20 | `client/src/components/CpieHistoryPanel.tsx` | `ProjetoDetalhesV2.tsx` |
| 21 | `client/src/components/CpieSettingsPanel.tsx` | `AdminConsistencia.tsx` |
| 22 | `client/src/pages/AdminCpieDashboard.tsx` | rota `/admin/cpie-dashboard` em `App.tsx` |

### Categoria E — Script raiz (NOVO no amendment)

| # | Arquivo | Uso |
|---|---|---|
| 23 | `cpie_stress_runner.ts` (raiz do repo) | Stress test manual CPIE — sem uso em CI |

### Decisão sobre `CpieReportExport.tsx` (migração v1.0 #30 "Reaproveitar")

A spec v1.0 marcou como "Reaproveitar — renomear ou manter + usar no novo dashboard (PDF export)". Após análise na Wave A.1, o `generateDiagnosticoPDF.ts` já cobre a exportação PDF do dashboard novo. Portanto:

| # | Arquivo | Destino |
|---|---|---|
| 24 | `client/src/components/CpieReportExport.tsx` | **DELETAR** — PDF export do Compliance Dashboard é feito via `generateDiagnosticoPDF.ts` (já conectado em Wave A.1 conforme ADR-CPIE-V3-01). Import em `PerfilEmpresaIntelligente.tsx` e `AdminConsistencia.tsx` removido na Categoria F. |
| — | `client/public/__manus__/version.json` | **NÃO TOCAR** — padrão PR #173, #177, #179, #184 (HANDOFF-IMPLEMENTADOR seção "Resolução de Conflito em `version.json`") |

**Total Wave B deletados: 24 arquivos** (numerados 1-24 acima).

---

## Bloco 3.2' (ADENDO AO BLOCO 3.2 V1) — Arquivos MODIFICADOS adicionais na Wave A.2

Os itens 12-17 da Bloco 3.2 v1.0 já foram endereçados em Wave A.1 (PR #728), exceto edições específicas abaixo. Os itens novos foram descobertos via grep em 2026-04-19.

### Categoria F — Consumidores descobertos via grep (NOVO)

Comando reproduzível:
```bash
grep -rnE "trpc\.(cpie|cpieV2|scoringEngine)" client/src/ | grep -v "\.test\."
grep -rnE "from.*components/Cpie|import Cpie[A-Z]" client/src/
```

| # | Arquivo | Edição mínima obrigatória |
|---|---|---|
| 25 | `client/src/pages/Painel.tsx` | Remover linha 14 (`trpc.scoringEngine.getLowScoreProjects.useQuery`) + estado/renderização da seção "Projetos com score baixo". Substituir por empty state ou remover seção inteira. |
| 26 | `client/src/pages/Projetos.tsx` | Remover import `CpieScoreBadge` (linha 3) + todos os usos do badge na lista. Coluna "Score CPIE" removida. |
| 27 | `client/src/pages/AdminConsistencia.tsx` | Remover 3 imports: `CpieReportExport` (linha 28), `CpieBatchPanel` (linha 29), `CpieSettingsPanel` (linha 30). Remover uso de `trpc.cpie.generateMonthlyReport` (linha 98). Decidir destino da página inteira: manter com painéis CPIE removidos OU marcar como candidata a DROP em sprint futura (registrar decisão no PR). |
| 28 | `client/src/pages/compliance-v3/ScoreView.tsx` | Remover chamadas `trpc.scoringEngine.getScore/getHistory/persistScore` (linhas 25, 30, 34). Substituir por redirecionamento para `/projetos/:id/compliance-dashboard` (Compliance Dashboard v3 novo) OU empty state. Registrar decisão no PR. |
| 29 | `client/src/pages/compliance-v3/ComplianceDashboardV3.tsx` | Remover import `CpieScoreCard` de `@/components/CpieScoreBadge` (linha 18). Remover uso do card. Esta página permanece em funcionamento para as demais métricas (não é CPIE legado). |
| 30 | `client/src/pages/ProjetoDetalhesV2.tsx` | Remover import `CpieHistoryPanel` (linha 37) + uso. A rota `/projetos/:id` mantém-se ativa; apenas o painel de histórico é removido. |
| 31 | `client/src/components/PerfilEmpresaIntelligente.tsx` | Além da simplificação já feita em Wave A.1 (remover `trpc.cpie.analyze`, `trpc.cpieV2.analyzePreview`), remover também: `trpc.cpie.getProjectAnalysis` (linha 802), `trpc.cpie.saveAnalysisToHistory` (linha 833), import `CpieReportExport` (linha 27). |
| 32 | `client/src/App.tsx` | Remover import `AdminCpieDashboard` (linha 79) + rota `/admin/cpie-dashboard` (linha 147). |

**Total Wave A.2 + B modificados adicionais: 8 arquivos** (25-32).

**Total geral modificados (Wave A.1 + A.2 + B): 6 (v1.0 itens 12-17) + 8 (este amendment) = 14 arquivos.**

---

## Bloco 3.4 (SUBSTITUÍDO) — Dados a APAGAR e a PRESERVAR

### Dados AUTORIZADOS para apagamento (P.O. 2026-04-18)

**Autorização explícita registrada:** *"todos os dados do banco podem ser apagados, com exceção RAG. Não preciso dos dados do cpie legado."*

| Entidade | Registros atuais | Risco de perda |
|---|---|---|
| `cpieAnalysisHistory` (tabela) | histórico de análises CPIE v1 | sem uso em produção — snapshots do Step 7 preservam histórico jurídico |
| `cpieSettings` (tabela) | configurações de pesos CPIE-B | sem uso em produção |
| `cpie_score_history` (tabela) | 0 registros úteis (ADR-0023) | zero |
| `projects.profileCompleteness` (coluna) | default=0 em 2367 projetos (ADR-0023) | zero — valores eram bug estrutural |
| `projects.profileConfidence` (coluna) | default=0 | zero |
| `projects.profileLastAnalyzedAt` (coluna) | `NULL` em 2367 projetos | zero |
| `projects.profileIntelligenceData` (coluna) | payload JSON não lido | sem consumidor após Wave B |

### Dados invariantes (NÃO tocar em nenhuma circunstância)

| Entidade | Motivo |
|---|---|
| `rag_documents` + `rag_chunks` | 2.515 chunks · 10 leis + 3 CGIBS · base jurídica irrecuperável |
| `cnaes` | base de filtro setorial em todo o produto |
| `solaris_questions` | corpus Dr. José Rodrigues (24 perguntas ativas SOL-013..036) |
| `risks_v4`, `action_plans_v4`, `tasks_v4` | Pipeline 3 Ondas ativo |
| `product_answers`, `service_answers` | DEC-M3-05 (NCM/NBS) |
| `company_profile` (objeto completo em `projects.companyProfile`) | Compliance Score v4 depende |

### Gates de execução da limpeza

1. Antes da migration destrutiva: `SELECT COUNT(*) FROM cpieAnalysisHistory` + `SELECT COUNT(*) FROM cpieSettings` + `SELECT COUNT(*) FROM cpie_score_history` — registrar contagens no body do PR como evidência do que foi apagado.
2. Após a migration: `SHOW TABLES LIKE 'cpie%'` deve retornar zero linhas + `SHOW COLUMNS FROM projects LIKE 'profile%'` deve retornar zero linhas.
3. Invariante pós-migration: `SELECT COUNT(*) FROM rag_chunks` DEVE continuar retornando 2.515.

---

## Bloco 4 (SUBSTITUÍDO) — Schema: Migration destrutiva

> **Mudança em relação à v1.0:** a v1.0 declarava *"Nenhuma mudança de banco"*. A v1.1 exige uma migration destrutiva para remover tabelas + colunas autorizadas em Bloco 3.4.

### Migration Drizzle nova

**Nome:** `drizzle/0088_drop_cpie_legado.sql` (próxima numeração sequencial — última existente é `drizzle/0087_tasks_data_inicio_fim.sql`, confirmada via `ls drizzle/*.sql | tail -1` em 2026-04-19).

> **Convenção do repo:** migrations Drizzle ficam em `drizzle/NNNN_slug.sql` (flat, não em subdiretório `drizzle/migrations/`).

**Conteúdo:**

```sql
-- drop_cpie_legado — Sprint Z-22 Wave B
-- ADR-0029 D-2 + EX-3 · P.O. Uires Tapajos · 2026-04-18
-- IRREVERSIVEL — sem rollback via down()

-- Gate 1: contagens pre-drop (evidencia para PR body)
SELECT 'pre_drop_cpieAnalysisHistory' AS label, COUNT(*) AS n FROM cpieAnalysisHistory;
SELECT 'pre_drop_cpieSettings' AS label, COUNT(*) AS n FROM cpieSettings;
SELECT 'pre_drop_cpie_score_history' AS label, COUNT(*) AS n FROM cpie_score_history;
SELECT 'pre_drop_rag_chunks_INVARIANTE' AS label, COUNT(*) AS n FROM rag_chunks;

-- DROP das 3 tabelas CPIE legado
DROP TABLE IF EXISTS cpieAnalysisHistory;
DROP TABLE IF EXISTS cpieSettings;
DROP TABLE IF EXISTS cpie_score_history;

-- DROP das 4 colunas em projects (EX-3 do ADR-0029)
ALTER TABLE projects DROP COLUMN IF EXISTS profileCompleteness;
ALTER TABLE projects DROP COLUMN IF EXISTS profileConfidence;
ALTER TABLE projects DROP COLUMN IF EXISTS profileLastAnalyzedAt;
ALTER TABLE projects DROP COLUMN IF EXISTS profileIntelligenceData;

-- Gate 2: invariante pos-drop
SELECT 'post_drop_rag_chunks_INVARIANTE' AS label, COUNT(*) AS n FROM rag_chunks;
-- Esperado: 2515 (valor fixo do Corpus RAG baseline v7.12)
```

### Schema Drizzle (`drizzle/schema.ts`)

Remover as seguintes exportações/definições:
- `cpieAnalysisHistory` table export
- `cpieSettings` table export
- `cpieScoreHistory` table export (se presente)
- Campos da tabela `projects`: `profileCompleteness`, `profileConfidence`, `profileLastAnalyzedAt`, `profileIntelligenceData`

Após edição, rodar:
```bash
pnpm tsc --noEmit
# Esperado: 0 erros (imports em arquivos deletados nao contam)
```

---

## Bloco 7 (ADENDO SUBSTITUINDO SEÇÃO "Depreciação do legado (wave B)") — Critérios de aceite recalibrados

### Remoção do legado (Wave A.2 + B)

- [ ] **Nenhum arquivo da Categoria A-E do Bloco 3.3** permanece no repositório (`find` retorna 0 matches para todos os 24 deletes)
- [ ] **Nenhum import de `trpc.cpie*` / `trpc.cpieV2*` / `trpc.scoringEngine`** em `client/src/` (`grep -rn "trpc\.\\(cpie\\|cpieV2\\|scoringEngine\\)" client/src/` retorna 0 linhas)
- [ ] **Nenhum import de componente `Cpie*`** em `client/src/` (`grep -rn "from.*components/Cpie" client/src/` retorna 0 linhas)
- [ ] **Nenhuma chamada a `initMonthlyReportJob` ou `persistCpieScoreForProject`** em `server/` (EX-1 e EX-2 aplicadas)
- [ ] **Migration destrutiva aplicada** — evidência: bloco JSON no PR com contagens pré e pós-drop
- [ ] **Invariante RAG preservada:** `SELECT COUNT(*) FROM rag_chunks` = 2.515 antes E depois da migration
- [ ] **TypeScript build:** `pnpm tsc --noEmit` → 0 erros
- [ ] **Testes unit:** `pnpm vitest run` → passa (testes CPIE deletados, demais intactos)
- [ ] **Suite E2E existente:** `compliance-dashboard.spec.ts` → 5/5 PASS (Wave A.1 preservada)
- [ ] **Suite E2E nova de regressão:** 2 CTs adicionados conforme Guardrail 4 do ADR-0029:
  - CT-B1: criar projeto com `companyProfile` incompleto — não deve disparar `cpieV2.analyzePreview` nem bloquear (valida remoção do gate)
  - CT-B2: aprovar plano em `routers-fluxo-v3` — não deve invocar `persistCpieScoreForProject` (valida EX-2 via audit log)

### Invariantes preservadas (não devem quebrar)

- [ ] `calculateAndSaveScore` em `risks-v4.ts` continua funcional (Step 7 snapshot)
- [ ] `client/src/pages/ConsolidacaoV4.tsx` renderiza sem erro
- [ ] `client/src/pages/compliance-v3/ComplianceDashboardV3.tsx` renderiza sem erro (após remoção do `CpieScoreCard`)
- [ ] Suite E2E pré-existente (33 CTs Z-17/Z-18/Z-19 + 5 CTs Wave A.1 = 38 CTs) → 38/38 PASS

### PR body obrigatório (REGRA-ORQ-15 + ADR-0029)

Conforme `.github/pull_request_template.md`:
- `risk_level: "high"` (override explícito — migration destrutiva irreversível)
- JSON de evidência com 7 campos: `ci_tsc`, `ci_vitest`, `ci_e2e`, `ci_lint`, `migration_applied`, `pre_drop_counts`, `post_drop_rag_count`
- Checkboxes: "Li e concordo com ADR-0029" + "Spec v1.1 aprovada pelo P.O. na issue #725"
- F4.5 Integration Checkpoint: listar todas as procedures CPIE removidas + confirmar zero consumers órfãos

---

## Bloco 8 (ITEM #2 SUBSTITUÍDO) — Armadilhas

### Item #2 original (v1.0) — REMOVIDO
~~"NÃO deletar código CPIE legado — apenas marcar `@deprecated`. Drop ficará em sprint de limpeza futura (decisão D9.b)."~~

### Item #2 substituto (v1.1)
**Ordem de execução inflexível para evitar build quebrado em estado intermediário**, conforme Guardrail 1 do ADR-0029:
1. Ajustar consumidores frontend (Categoria F — itens 25-32)
2. Remover chamadas backend a funções que serão deletadas (EX-2 + varreduras)
3. Aplicar EX-1 em `server/_core/index.ts` (2 linhas)
4. Deletar os 24 arquivos da Categoria A-E (Bloco 3.3)
5. Editar `drizzle/schema.ts` removendo tabelas/colunas
6. Aplicar migration destrutiva (EX-3 + DROP TABLE)
7. Rodar `pnpm tsc --noEmit` → esperado 0 erros
8. Rodar `pnpm vitest run` → esperado verde
9. Rodar suite E2E (`pnpm test:e2e`) → 38/38 + 2 regressão = 40/40 PASS

**Violação da ordem = rollback difícil** (git reset não restaura dados de tabelas dropadas).

### Itens 1, 3-10 de v1.0 — mantidos integralmente

(Não repetidos aqui — ler v1.0.)

### Novas armadilhas específicas da Wave B (v1.1)

11. **CI Governance Gate:** `scripts/validate-governance.sh` valida apenas spec ORQ-16 (hash `329ae5e8...`). Esta spec v1.1 NÃO tem hash em `APPROVED_SPEC.json` — o CI não vai falhar por isso, mas também não há validação automática. Mitigação: P.O. aprova por comentário explícito na issue #725 referenciando hash SHA-256 manualmente calculado da v1.1 (ADR-0029 Guardrail 5).

12. **Manus deploy congelado:** a deploy-em-produção da Wave A.2+B fica adiada. UAT é feita no dev server Manus em URL temporária. Produção mantém Wave A.1 até Manus destravar (ticket suporte aberto).

13. **Categoria C item 15 ambíguo:** `sprint-s-lotes-be.test.ts` cobre cenários do Sprint S (CPIE-B scoring). Se algum teste não-CPIE convive no arquivo, quebra por deletar inteiro. Mitigação: inspeção manual pelo Claude Code antes do delete — decidir "deletar tudo" vs "manter arquivo com CPIE-B cases removidos". Registrar decisão no body do PR.

14. **Paralelismo Manus + Claude Code:** R-SYNC-01 obrigatório antes de qualquer checkpoint (`git fetch origin && git reset --hard origin/main`). Violação criou bifurcação em Sprint Z-12 (PRs #473/#474).

15. **HEAD de `origin/main` pode avançar entre aprovação da spec e despacho F6.** No momento de escrita deste amendment (2026-04-19 14:28 UTC), HEAD era `307316b` (commit `fix(z22): remover item Dashboard Compliance do sidebar global`, PR #732). Entre a aprovação do P.O. e o despacho F6 ao Claude Code, outros PRs de governança/hotfix podem mergear — por exemplo, PR #733 (hotfix UX transparência CPIE) que inclui remoção do item admin "Dashboard CPIE" do sidebar, remoção de `CpieScoreBadge` de `/projetos`, renomeação de "Período" para "Prazo do plano", subida do botão "Dashboard de Compliance" ao topo em `ProjetoDetalhesV2.tsx`, e badge "Snapshot persistido" em `ConsolidacaoV4.tsx`. Impactos:
    - (a) O `data-testid="menu-link-compliance-dashboard"` listado no Bloco 9 v1.0 (seção "Novos em navegação") **já foi removido** em 307316b. O acesso ao Compliance Dashboard é agora via `btn-ver-score-projeto` em `client/src/pages/ProjetoDetalhesV2.tsx` (criado na Wave A.1). Isso **NÃO exige reversão nem novo ajuste** — apenas ciência de que qualquer E2E novo deve usar `btn-ver-score-projeto` como seletor de discoverability, não o menu link.
    - (b) A branch `feat/z22-725-cpie-v3-wave-a2-drop` DEVE partir de `origin/main` **no momento do despacho F6** (não de um SHA fixo como 307316b). R-SYNC-01 obrigatório antes do primeiro commit para garantir que HEAD local = HEAD remoto atual.
    - (c) Se PR #733 mergear antes do F6, o item 26 da Categoria F (remover `CpieScoreBadge` de `Projetos.tsx`) **já está parcialmente feito** — Claude Code deve verificar via grep antes de aplicar o patch. Mesmo princípio para item 32 parte "rota `/admin/cpie-dashboard` em `App.tsx`" (link do menu já foi removido em PR #733; a rota + o arquivo `AdminCpieDashboard.tsx` continuam para a Wave B deletar).

16. **Impacto em `ComplianceLayout.tsx`:** PR #732 removeu o item "Dashboard Compliance" (link sidebar para `/projetos`). Se PR #733 for mergeado antes do F6, também removerá o item admin "Dashboard CPIE" (link para `/admin/cpie-dashboard`) + import `BarChart3`. Em ambos os cenários, **nenhuma edição adicional em `ComplianceLayout.tsx`** é exigida pela Wave A.2+B — o cleanup do legado é completado apenas via deleção dos arquivos do Bloco 3.3 (Categorias D e E).

---

## Bloco EX (NOVO) — Exceções autorizadas a restrições absolutas

> **Fundamento legal:** todas as exceções abaixo estão registradas em [ADR-0029](../adr/ADR-0029-cpie-v3-drop-estrategia-excecoes.md) seção "Decisão" → D-3. Cada exceção é limitada ao escopo listado; não se estende a outros arquivos ou operações.

### EX-1 · Edição em `server/_core/index.ts`

- **Restrição absoluta violada:** HANDOFF-IMPLEMENTADOR.md v1.1 — "Editar `server/_core/` sem aprovação | Infraestrutura crítica"
- **Edição autorizada:** remoção das duas linhas abaixo (import + invocação)
  - Linha 13: `import { initMonthlyReportJob } from "../jobs/monthlyReportJob";`
  - Linha 143: `initMonthlyReportJob();`
- **Tipo:** subtrativa, 2 linhas, sem adição de lógica
- **Nenhuma outra edição em `server/_core/*` é autorizada por esta spec.**

### EX-2 · Remoção comportamental em `server/routers-fluxo-v3.ts`

- **Restrição não é absoluta**, mas remoção comportamental exige registro formal
- **Edição autorizada:** remover chamada `persistCpieScoreForProject` nas linhas ~1653-1657 (fire-and-forget após aprovação de plano)
- **Justificativa técnica:** o próprio comentário inline do código declara *"pipeline não afetado"*. Além disso, após Wave B a função `persistCpieScoreForProject` deixa de existir (reside em `server/routers/scoringEngine.ts`, item 7 do Bloco 3.3).
- **Verificação obrigatória:** grep confirmando que a chamada é a única referência à função no arquivo.

### EX-3 · `DROP COLUMN` em tabela `projects`

- **Restrição absoluta violada:** `docs/governance/ESTADO-ATUAL.md` seção Bloqueios Permanentes + HANDOFF-IMPLEMENTADOR.md v1.1 — "DROP COLUMN qualquer | Irreversível sem aprovação"
- **Operação autorizada:** `ALTER TABLE projects DROP COLUMN` para exatamente as 4 colunas listadas em Bloco 3.4 (`profileCompleteness`, `profileConfidence`, `profileLastAnalyzedAt`, `profileIntelligenceData`)
- **Autorização dos dados:** explícita em ADR-0029 D-2 (P.O. 2026-04-18)
- **Nenhum outro `DROP COLUMN` é autorizado por esta spec.**

### Precedente limitado

As três exceções acima **não criam precedente genérico**. Cada ocorrência futura de edição em `server/_core/*`, remoção comportamental em router, ou `DROP COLUMN` exige ADR próprio + autorização P.O. explícita + registro no HANDOFF-IMPLEMENTADOR.

---

## Bloco 6' (ADENDO AO BLOCO 6 V1) — Comandos pré-implementação (Wave A.2 + B)

Antes de começar a implementação, o Claude Code deve executar e copiar os outputs no prompt F6 (como evidência para o PR):

```bash
# Confirmar HEAD atual (R-SYNC-01)
git fetch origin && git diff --stat origin/main
# Esperado: vazio (branch sincronizada com main)

# Grep 1 — consumers backend de funções que serão deletadas
grep -rnE "initMonthlyReportJob|persistCpieScoreForProject" server/
# Esperado após Wave B: 0 resultados

# Grep 2 — consumers frontend de trpc.cpie*/scoringEngine
grep -rnE "trpc\.(cpie|cpieV2|scoringEngine)" client/src/ | grep -v "\.test\."
# Esperado após Wave B: 0 resultados

# Grep 3 — imports de componentes Cpie*
grep -rnE "from.*components/Cpie|import Cpie[A-Z]" client/src/
# Esperado após Wave B: 0 resultados

# Grep 4 — arquivos da Categoria A-E (confirmar deleção)
for f in server/cpie.ts server/cpie-v2.ts server/routers/cpieRouter.ts \
         server/routers/cpieV2Router.ts server/routers/scoringEngine.ts \
         server/jobs/monthlyReportJob.ts cpie_stress_runner.ts; do
  [ -f "$f" ] && echo "AINDA EXISTE: $f" || echo "OK deletado: $f"
done
# Esperado após Wave B: todos "OK deletado"

# Schema — confirmar migration aplicada
ls drizzle/*.sql | tail -3
# Esperado: 0088_drop_cpie_legado.sql presente (última é 0087 antes da Wave B)

# RAG invariante (antes E depois)
# No banco de dev: SELECT COUNT(*) FROM rag_chunks;
# Esperado: 2515
```

---

## Aprovação

Este amendment só entra em vigor com:

1. Comentário explícito do P.O. na issue #725 aprovando v1.1 e referenciando o ADR-0029 (formato no template de aprovação anexo ao despacho)
2. Registro do hash SHA-256 do arquivo v1.1 no comentário de aprovação (calculado via `sha256sum docs/specs/SPEC-CPIE-V3-DASHBOARD-COMPLIANCE-v1.1.md`)
3. ADR-0029 mergeado em `docs/adr/`
4. Apenas **após** os três itens acima, o despacho F6 para o Claude Code pode ser emitido

---

## Rastreabilidade

- Spec v1.0: `docs/specs/SPEC-CPIE-V3-DASHBOARD-COMPLIANCE-v1.md` (2026-04-18)
- ADR fundamentador: `docs/adr/ADR-0029-cpie-v3-drop-estrategia-excecoes.md` (2026-04-19)
- Sprint: Z-22 · Wave A.2 + B
- Issue: #725
- PR A.1 (merged): #728
- PR A.2+B (a abrir): TBD
- P.O.: Uires Tapajós
- Orquestrador: Claude (Anthropic)
- Implementador solo da sprint: Claude Code
- Consultor arquitetural: ChatGPT (previsto para Z-23)
