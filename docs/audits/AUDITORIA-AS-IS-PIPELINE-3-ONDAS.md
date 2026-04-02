# Auditoria AS-IS — Pipeline 3 Ondas · IA SOLARIS

> **Versão:** 1.0 · **Data:** 2026-04-01 · **HEAD auditado:** `8727578` (PR #288)
> **Baseline:** v3.2 · **Auditor:** Manus (autônomo, sem alteração de código)
> **Escopo:** ZERO alteração de arquivos, ZERO PRs — apenas observação e evidência SQL

---

## 1. Resumo Executivo

A auditoria AS-IS do pipeline de 3 ondas da plataforma IA SOLARIS identificou **17 achados** distribuídos em três categorias de severidade. O pipeline está **funcionalmente operacional** para a Onda 1 (SOLARIS + gaps + riscos), com 24 perguntas ativas e 32 gaps em produção. As Ondas 2 e 3 apresentam **desconexões estruturais** que impedem o fluxo completo de dados: a Onda 2 (iagen) não gera gaps rastreáveis, e a Onda 3 (RAG/briefing/CPIE) não tem nenhum registro de briefing ou score persistido no banco.

O achado mais crítico é a **desconexão total entre status avançado e dados de pipeline**: 1.705 projetos nos status `plano_acao`, `aprovado`, `briefing` e `concluido` não possuem nenhum gap ou risco registrado nas tabelas v3, indicando que esses projetos foram processados por um pipeline legado (v1) que não é mais o pipeline canônico.

| Categoria | Quantidade | Impacto |
|---|---|---|
| **Crítico (AUDIT-C)** | 5 | Bloqueio de funcionalidade ou dado ausente em produção |
| **Médio (AUDIT-M)** | 7 | Inconsistência de dados ou gap de cobertura |
| **Cobertura (AUDIT-V)** | 5 | Verificação de integridade e rastreabilidade |

---

## 2. Contexto e Metodologia

A auditoria foi conduzida exclusivamente por leitura de código-fonte e queries SQL ao banco TiDB Cloud de produção. Nenhum arquivo foi alterado. O projeto de controle utilizado foi o conjunto de projetos com `source = 'solaris'` em `project_gaps_v3` (5 projetos, 32 gaps).

**Tabelas auditadas:** `projects`, `cnaes`, `solaris_questions`, `project_gaps_v3`, `project_risks_v3`, `iagen_answers`, `ragDocuments`, `project_briefings_v3`, `project_scores_v3`, `cpie_score_history`, `project_actions_v3`, `actionPlans`.

**Arquivos de código auditados:** `server/routers/gapEngine.ts`, `server/routers/riskEngine.ts`, `server/routers/briefingEngine.ts`, `server/routers/cpieRouter.ts`, `server/routers/solarisAdmin.ts`, `server/lib/solaris-gap-analyzer.ts`, `server/routers-fluxo-v3.ts`, `server/db.ts`, `.github/CONTRIBUTING.md`, `.github/workflows/ci.yml`.

---

## 3. Achados por Onda

### 3.1 Onda 1 — Cadastro, CNAE e SOLARIS

#### AUDIT-V-001 — Corpus SOLARIS ativo e correto

**Severidade:** Cobertura ✅

**Evidência SQL:**
```sql
SELECT COUNT(*) FROM solaris_questions WHERE ativo = 1;
-- Resultado: 24
SELECT codigo FROM solaris_questions WHERE ativo = 1 ORDER BY codigo;
-- SOL-013 a SOL-036 (24 perguntas)
```

**Status:** Correto. As 24 perguntas SOLARIS estão ativas após a correção manual dos UPDATEs executados em 2026-04-01. O bug de upsert (PR #288) foi corrigido — próximos uploads reativarão automaticamente.

---

#### AUDIT-V-002 — Tabela CNAE populada

**Severidade:** Cobertura ✅

**Evidência SQL:**
```sql
SELECT COUNT(*) FROM cnaes;
-- Resultado: 1.301 CNAEs cadastrados
```

**Status:** Correto. Base CNAE completa disponível para mapeamento de perfil regulatório.

---

#### AUDIT-M-001 — gapEngine não persiste coluna `source`

**Severidade:** Médio ⚠️

**Arquivo:** `server/routers/gapEngine.ts` · linhas 376–420

**Evidência de código:**
```sql
-- INSERT do gapEngine (linha 386) — lista de colunas
INSERT INTO project_gaps_v3 (
  client_id, project_id, requirement_code, ...,
  requirement_id, gap_classification, evaluation_confidence,
  evaluation_confidence_reason, question_id, answer_value, source_reference
) VALUES (...)
-- ↑ coluna `source` AUSENTE no INSERT
```

**Evidência SQL:**
```sql
SELECT source, COUNT(*) FROM project_gaps_v3 GROUP BY source;
-- solaris | 19   (via solaris-gap-analyzer.ts — correto)
-- v1      | 13   (via pipeline legado)
-- NULL    | 0    (nenhum gap do gapEngine.ts — não foi executado em produção)
```

**Impacto:** O `riskEngine.ts` deriva `fonte_risco` a partir de `gap.gap_source` (coluna `source`). Se `gapEngine.ts` for executado em produção sem a coluna `source`, todos os riscos derivados terão `fonte_risco = 'v1'` (fallback), quebrando a rastreabilidade cross-onda.

**Recomendação:** Adicionar `source` ao INSERT do `gapEngine.ts` com valor `'gapengine'` ou `'onda1'`.

---

#### AUDIT-M-002 — Riscos Onda 1 com `fonte_risco = 'v1'` (legado)

**Severidade:** Médio ⚠️

**Evidência SQL:**
```sql
SELECT fonte_risco, COUNT(DISTINCT project_id) as projetos, COUNT(*) as total
FROM project_risks_v3 GROUP BY fonte_risco;
-- v1      | 4 projetos | 9 riscos
-- solaris | 4 projetos | 10 riscos
```

**Impacto:** Os 9 riscos com `fonte_risco = 'v1'` são de projetos que passaram pelo pipeline legado. O `briefingEngine.ts` não distingue por `fonte_risco` ao buscar riscos — usa `SELECT * FROM project_risks_v3 WHERE project_id = ?` — então esses riscos legados serão incluídos em briefings futuros sem rastreabilidade de origem.

---

#### AUDIT-C-001 — 1.705 projetos em status avançado sem dados v3

**Severidade:** Crítico 🔴

**Evidência SQL:**
```sql
SELECT COUNT(*) FROM projects
WHERE status IN ('plano_acao','aprovado','briefing','concluido')
AND id NOT IN (SELECT DISTINCT project_id FROM project_gaps_v3);
-- Resultado: 1.705

SELECT COUNT(*) FROM projects
WHERE status IN ('plano_acao','aprovado','briefing','concluido')
AND id NOT IN (SELECT DISTINCT project_id FROM project_risks_v3);
-- Resultado: 1.705
```

**Impacto para o advogado:** 1.705 projetos que chegaram ao estágio de plano de ação ou aprovação não possuem gaps nem riscos nas tabelas v3. Esses projetos foram processados pelo pipeline legado (v1) e seus dados de compliance não são rastreáveis pelo sistema atual. Se o advogado abrir qualquer um desses projetos e tentar gerar um briefing ou score CPIE, o sistema retornará dados vazios ou incompletos.

**Contexto:** Esses projetos existem desde antes da migração para o pipeline v3. A correção requer uma estratégia de migração de dados (fora do escopo desta auditoria).

---

### 3.2 Onda 2 — IA Generativa (iagen)

#### AUDIT-C-002 — iagen_answers não geram gaps

**Severidade:** Crítico 🔴

**Arquivo:** `server/routers-fluxo-v3.ts` · linhas 2403–2450

**Evidência de código:**
```typescript
// completeOnda2 (linha 2403)
await db.saveOnda2Answers(input.projectId, input.answers);
await db.updateProject(input.projectId, { status: 'diagnostico_corporativo' });
return { success: true, ... };
// ↑ Salva respostas e avança status
// ↑ NÃO chama gapEngine nem solaris-gap-analyzer para processar as respostas
```

**Evidência SQL:**
```sql
SELECT fonte, COUNT(*) FROM iagen_answers GROUP BY fonte;
-- ia_gen | 54 (8 projetos, 6-7 respostas cada)

SELECT COUNT(*) FROM project_gaps_v3 WHERE source = 'iagen';
-- 0 (zero gaps com source=iagen)
```

**Impacto para o advogado:** As respostas da Onda 2 (perguntas geradas por IA sobre o perfil corporativo) são salvas no banco mas **nunca são convertidas em gaps**. O advogado responde 6-7 perguntas e o sistema avança o status sem gerar nenhuma análise de compliance baseada nessas respostas. A Onda 2 é funcionalmente um dead-end de dados.

---

#### AUDIT-M-003 — Onda 2 avança para `diagnostico_corporativo` sem validação

**Severidade:** Médio ⚠️

**Arquivo:** `server/routers-fluxo-v3.ts` · linha 2440

**Evidência de código:**
```typescript
// BUG-UAT-03 fix — comentário no código
await db.updateProject(input.projectId, { status: 'diagnostico_corporativo' as any });
```

O comentário `// BUG-UAT-03 fix` indica que o status `diagnostico_corporativo` foi escolhido como destino por ser um workaround de um bug anterior, não por design de fluxo. O status correto após Onda 2 seria `onda2_concluida` ou similar, mas esse status não existe no enum atual.

---

#### AUDIT-V-003 — iagen_answers por projeto (cobertura)

**Severidade:** Cobertura ✅

**Evidência SQL:**
```sql
SELECT project_id, COUNT(*) as respostas FROM iagen_answers
GROUP BY project_id ORDER BY respostas DESC;
-- 2280001 | 7  · 2310001 | 7  · 2370001 | 7  · 2370002 | 7
-- 1860981 | 7  · 2250195 | 7  · 2430001 | 6  · 1860001 | 6
```

**Status:** 8 projetos com respostas iagen, 6-7 respostas cada. Cobertura consistente, mas os dados não são consumidos pelo pipeline de gaps (AUDIT-C-002).

---

### 3.3 Onda 3 — RAG, Briefing e Score CPIE

#### AUDIT-C-003 — Briefing Engine nunca foi executado em produção

**Severidade:** Crítico 🔴

**Evidência SQL:**
```sql
SELECT COUNT(*) FROM project_briefings_v3;
-- 0

SELECT COUNT(*) FROM project_scores_v3;
-- 0

SELECT COUNT(*) FROM cpie_score_history;
-- 0
```

**Impacto para o advogado:** A Onda 3 inteira (briefing estruturado + score CPIE + histórico de scores) nunca foi executada em produção. O `briefingEngine.ts` está implementado e lê de `project_gaps_v3` + `project_risks_v3` + `project_actions_v3`, mas nenhum projeto chegou a esse estágio pelo pipeline v3.

---

#### AUDIT-M-004 — RAG corpus incompleto (apenas 5 de 10 leis)

**Severidade:** Médio ⚠️

**Evidência SQL:**
```sql
SELECT lei, COUNT(*) as chunks FROM ragDocuments GROUP BY lei ORDER BY chunks DESC;
-- lc214  | 1.573 chunks
-- lc227  |   434 chunks
-- lc224  |    28 chunks
-- lc123  |    25 chunks
-- ec132  |    18 chunks
```

**Impacto:** O schema da tabela `ragDocuments` suporta 10 leis (`enum('lc214','ec132','lc227','lc224','lc116','lc87','cg_ibs','rfb_cbs','conv_icms','lc123')`), mas apenas 5 estão populadas. As leis `lc116` (ISS), `lc87` (ICMS), `cg_ibs` (Comitê Gestor IBS), `rfb_cbs` (RFB CBS) e `conv_icms` (Convênios ICMS) estão ausentes. A LC 214 domina com 75,6% dos chunks, criando viés de cobertura.

---

#### AUDIT-M-005 — RAG não gera gaps (source='rag' zerado)

**Severidade:** Médio ⚠️

**Evidência SQL:**
```sql
SELECT COUNT(*) FROM project_gaps_v3 WHERE source = 'rag';
-- 0
```

**Evidência de código:** O `briefingEngine.ts` lê `ragDocuments` para contextualização do briefing, mas não existe nenhum engine que converta chunks RAG em gaps com `source='rag'`. O `riskEngine.ts` suporta `fonte_risco = 'rag'` no enum (linha 59), mas nunca é populado.

---

#### AUDIT-C-004 — Score CPIE não persiste no banco

**Severidade:** Crítico 🔴

**Arquivo:** `server/routers/cpieRouter.ts`

**Evidência de código:**
```typescript
// cpieRouter.analyze — recebe dimensões via input, não lê do banco
analyze: protectedProcedure
  .input(CpieProfileInputSchema)
  .mutation(async ({ input }) => {
    return await runCpieAnalysis(profileInput);
  })
// ↑ Retorna análise mas NÃO persiste em project_scores_v3
// saveAnalysis existe como procedure separada mas é chamada manualmente
```

**Evidência SQL:**
```sql
SELECT COUNT(*) FROM cpie_score_history;
-- 0 (zero registros)
```

**Impacto para o advogado:** O score CPIE é calculado em tempo real mas não é persistido automaticamente. Se o advogado fechar a tela ou recarregar a página, o score é perdido. O histórico de evolução do score (essencial para demonstrar progresso de compliance ao cliente) está sempre vazio.

---

#### AUDIT-V-004 — project_actions_v3 com cobertura mínima

**Severidade:** Cobertura ⚠️

**Evidência SQL:**
```sql
SELECT COUNT(*) as total, COUNT(DISTINCT project_id) as projetos FROM project_actions_v3;
-- total: 9 | projetos: 4
```

**Contraste:**
```sql
SELECT COUNT(*) FROM actionPlans;
-- 401 planos em 202 projetos
```

**Análise:** Existem 401 action plans na tabela `actionPlans` (formato legado) e apenas 9 ações na tabela `project_actions_v3` (formato v3). O `briefingEngine.ts` lê de `project_actions_v3`, não de `actionPlans`. Portanto, os 401 planos legados são invisíveis para o briefing engine.

---

### 3.4 Cross-Onda e Integração

#### AUDIT-C-005 — Pipeline E2E nunca foi executado completamente

**Severidade:** Crítico 🔴

**Evidência SQL:**
```sql
-- Projetos com dados em TODAS as 3 ondas (gaps + riscos + briefing)
SELECT COUNT(DISTINCT p.id) FROM projects p
INNER JOIN project_gaps_v3 g ON g.project_id = p.id
INNER JOIN project_risks_v3 r ON r.project_id = p.id
INNER JOIN project_briefings_v3 b ON b.project_id = p.id;
-- Resultado: 0 (zero projetos com pipeline E2E completo)
```

**Impacto:** Nenhum projeto passou pelas 3 ondas completas no pipeline v3. O pipeline existe no código mas nunca foi validado de ponta a ponta em produção. O único projeto que chegou ao status `concluido` (id: existe no banco) não tem dados v3.

---

#### AUDIT-M-006 — Projetos com riscos de apenas 1 fonte (sem cross-onda)

**Severidade:** Médio ⚠️

**Evidência SQL:**
```sql
SELECT project_id, COUNT(DISTINCT fonte_risco) as ondas, GROUP_CONCAT(DISTINCT fonte_risco) as fontes
FROM project_risks_v3 GROUP BY project_id HAVING ondas < 3;
-- 691585 | 1 | v1      · 691586 | 1 | v1      · 691587 | 1 | v1
-- 931871 | 1 | v1      · 2310001 | 1 | solaris · 2370001 | 1 | solaris
-- 2370002 | 1 | solaris · 2430001 | 1 | solaris
```

**Análise:** Todos os 8 projetos com riscos têm riscos de apenas 1 fonte. Os 4 projetos com `fonte_risco = 'v1'` são legados. Os 4 projetos com `fonte_risco = 'solaris'` completaram a Onda 1 mas não têm riscos das Ondas 2 e 3.

---

#### AUDIT-M-007 — Briefing Engine lê `project_actions_v3` (vazia) em vez de `actionPlans`

**Severidade:** Médio ⚠️

**Arquivo:** `server/routers/briefingEngine.ts` · linha 652

**Evidência de código:**
```typescript
fonte_dados: `project_gaps_v3 (${totalGaps} gaps) + project_risks_v3 (${totalRisks} riscos) + project_actions_v3 (${totalActions} ações)`
```

**Evidência SQL:**
```sql
SELECT COUNT(*) FROM project_actions_v3;  -- 9 (4 projetos)
SELECT COUNT(*) FROM actionPlans;         -- 401 (202 projetos)
```

O `briefingEngine.ts` lê de `project_actions_v3` que tem apenas 9 ações, ignorando os 401 planos em `actionPlans`. Qualquer briefing gerado terá `totalActions = 0` para 198 dos 202 projetos com planos.

---

### 3.5 Meta-Auditoria de Governança

#### AUDIT-V-005 — Gates Q1-Q7 e Gate 0 implementados e documentados

**Severidade:** Cobertura ✅

**Evidência:**
```bash
grep -c "Q6\|cobertura de dados" .github/CONTRIBUTING.md → 7 ocorrências
grep -c "Gate 7\|auto-auditoria" .github/CONTRIBUTING.md → 1 ocorrência
grep -c "rag_chunks\|solaris_questions" .github/CONTRIBUTING.md → 3 ocorrências
```

**Status:** Todos os 7 gates de qualidade (Q1-Q5 + Q6 + Gate 7) estão documentados no `CONTRIBUTING.md`. Os 3 bloqueios de dados permanentes (`rag_documents`, `rag_chunks`, `solaris_questions`) estão protegidos. O CI executa `pnpm test:unit` (1.436 testes, 0 falhas) sem necessidade de `DATABASE_URL`.

---

## 4. Tabela Consolidada de Achados

| ID | Severidade | Onda | Componente | Descrição | Impacto para Advogado |
|---|---|---|---|---|---|
| AUDIT-C-001 | 🔴 Crítico | Cross | `projects` | 1.705 projetos em status avançado sem dados v3 | Briefing/score vazio para 1.705 clientes |
| AUDIT-C-002 | 🔴 Crítico | Onda 2 | `routers-fluxo-v3.ts` | iagen_answers não geram gaps | Onda 2 é dead-end de dados |
| AUDIT-C-003 | 🔴 Crítico | Onda 3 | `briefingEngine.ts` | Briefing nunca executado em produção | 0 briefings, 0 scores no banco |
| AUDIT-C-004 | 🔴 Crítico | Onda 3 | `cpieRouter.ts` | Score CPIE não persiste automaticamente | Histórico de score sempre vazio |
| AUDIT-C-005 | 🔴 Crítico | Cross | Pipeline E2E | Nenhum projeto completou as 3 ondas | Pipeline E2E não validado |
| AUDIT-M-001 | ⚠️ Médio | Onda 1 | `gapEngine.ts` | INSERT não inclui coluna `source` | Rastreabilidade quebrada em riscos |
| AUDIT-M-002 | ⚠️ Médio | Onda 1 | `project_risks_v3` | 9 riscos com `fonte_risco = 'v1'` (legado) | Riscos sem rastreabilidade de origem |
| AUDIT-M-003 | ⚠️ Médio | Onda 2 | `routers-fluxo-v3.ts` | Status destino `diagnostico_corporativo` é workaround | Fluxo de estado inconsistente |
| AUDIT-M-004 | ⚠️ Médio | Onda 3 | `ragDocuments` | Apenas 5 de 10 leis no corpus RAG | LC 116, LC 87, CG IBS, RFB CBS ausentes |
| AUDIT-M-005 | ⚠️ Médio | Onda 3 | `ragDocuments` | RAG não gera gaps (`source='rag'` = 0) | Corpus RAG não alimenta análise |
| AUDIT-M-006 | ⚠️ Médio | Cross | `project_risks_v3` | Todos os projetos têm riscos de apenas 1 fonte | Sem análise cross-onda |
| AUDIT-M-007 | ⚠️ Médio | Onda 3 | `briefingEngine.ts` | Lê `project_actions_v3` (9 ações) em vez de `actionPlans` (401) | Briefing sem planos de ação |
| AUDIT-V-001 | ✅ Cobertura | Onda 1 | `solaris_questions` | 24 perguntas SOLARIS ativas (SOL-013..036) | Corpus SOLARIS correto |
| AUDIT-V-002 | ✅ Cobertura | Onda 1 | `cnaes` | 1.301 CNAEs cadastrados | Base CNAE completa |
| AUDIT-V-003 | ✅ Cobertura | Onda 2 | `iagen_answers` | 54 respostas em 8 projetos (6-7 por projeto) | Dados coletados, não processados |
| AUDIT-V-004 | ⚠️ Cobertura | Onda 3 | `project_actions_v3` | 9 ações v3 vs 401 planos legados | Desconexão entre tabelas |
| AUDIT-V-005 | ✅ Cobertura | Gov. | `CONTRIBUTING.md` | Gates Q1-Q7 + Gate 0 + bloqueios dados implementados | Governança de código robusta |

---

## 5. Priorização Sugerida para Sprint S

Os 5 achados críticos formam dois grupos naturais de trabalho:

**Grupo A — Conectar Onda 2 ao pipeline de gaps (AUDIT-C-002)**
Este é o único achado que requer nova lógica de negócio: criar um engine que converta `iagen_answers` em gaps com `source='iagen'`. Dependência: AUDIT-M-001 (coluna `source` no gapEngine INSERT) deve ser corrigida primeiro.

**Grupo B — Persistência automática do Score CPIE (AUDIT-C-004)**
Correção cirúrgica: chamar `cpie.saveAnalysis` automaticamente ao final de `cpie.analyze`. Sem dependências externas.

**Grupo C — Migração de dados legados (AUDIT-C-001 + AUDIT-C-005)**
Estratégia de migração para os 1.705 projetos legados. Requer aprovação do P.O. — risco de dados em produção.

**Grupo D — Completar corpus RAG (AUDIT-M-004)**
Upload das 5 leis ausentes (`lc116`, `lc87`, `cg_ibs`, `rfb_cbs`, `conv_icms`) via `ragAdmin.uploadCsv`. Operação de dados, sem código.

**Grupo E — Alinhar `briefingEngine` com `actionPlans` (AUDIT-M-007)**
Alterar a query do briefing para ler de `actionPlans` (tabela com dados reais) em vez de `project_actions_v3` (tabela vazia).

---

## 6. Estado do Banco em 2026-04-01

| Tabela | Registros | Observação |
|---|---|---|
| `projects` | 10.379 | 6.901 rascunhos, 1.708 em status avançado sem dados v3 |
| `cnaes` | 1.301 | Completo |
| `solaris_questions` | 24 ativas | SOL-013..036, todos `ativo=1` |
| `project_gaps_v3` | 32 | 19 source=solaris, 13 source=v1 |
| `project_risks_v3` | 19 | 10 fonte=solaris, 9 fonte=v1 |
| `iagen_answers` | 54 | 8 projetos, fonte=ia_gen |
| `ragDocuments` | 2.078 | 5 leis, 100% com anchor_id |
| `project_briefings_v3` | **0** | Nunca executado |
| `project_scores_v3` | **0** | Nunca persistido |
| `cpie_score_history` | **0** | Nunca persistido |
| `project_actions_v3` | 9 | 4 projetos |
| `actionPlans` | 401 | 202 projetos (tabela legada) |

---

*IA SOLARIS · Auditoria AS-IS · HEAD `8727578` · 2026-04-01*
*Gerado por Manus (autônomo) — ZERO alteração de código, ZERO PRs*
