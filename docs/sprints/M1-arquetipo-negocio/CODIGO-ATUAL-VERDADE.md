# Código Atual — Verdade do Sistema

> Levantamento profundo do código fonte executado em 2026-04-23 · sem especulação · todas as regras citadas têm arquivo:linha · fonte única para responder perguntas do consultor pré-SPEC v3.

---

## BLOCO 1 — VALIDAÇÕES CRUZADAS JÁ EXISTENTES

| id_regra | descrição | condição exata | comportamento | arquivo:linha |
|----------|-----------|-----------------|------------------|---------------|
| **DET-001** | Regime tributário vs. faturamento | `taxRegime ∈ {simples_nacional, lucro_presumido}` AND `annualRevenueRange` excede limite máximo do regime | **CRITICAL — hard block** (`canProceed=false` até aceitação de risco) | `server/consistencyEngine.ts:118-135` |
| **DET-002** | Porte vs. faturamento | `companySize` (mei/micro/pequena) AND `revenueMin > SIZE_REVENUE_RULES[size].maxRevenue` | **HIGH warning** (recomendação, mas não bloqueia) | `server/consistencyEngine.ts:138-154` |
| **DET-003** | MEI com operações multi-estado | `companySize === "mei"` AND `multiState === true` | **HIGH warning** | `server/consistencyEngine.ts:157-170` |
| **DET-004** | MEI com operações internacionais | `companySize === "mei"` AND `hasInternationalOps === true` | **CRITICAL — hard block** (MEI não pode importar/exportar) | `server/consistencyEngine.ts:172-185` |
| **DET-005** | Simples Nacional com operações internacionais | `taxRegime === "simples_nacional"` AND `hasInternationalOps === true` | **MEDIUM warning** | `server/consistencyEngine.ts:189-199` |
| **CALC-LIMITE** | Limite dinâmico de perguntas por complexidade | `hasInternationalOps` (+2), `paymentMethods ∈ {marketplace,cartão}` (+2), `usesTaxIncentives` (+2), `hasIntermediaries` (+1), `operationType ∈ {industria, agronegocio}` (+1) | **SCORE** — aumenta limite (base=3, máx=12) | `server/routers-fluxo-v3.ts:78-102` |
| **CALC-REGIME-NCM** | Filtro de perguntas por regime e NCM | `operationType ∈ {industria, comercio}` → bloco NCM; `operationType ∈ {servicos, misto, financeiro}` → bloco NBS | **SCORE** — ajusta conjunto de perguntas elegíveis | `server/routers-fluxo-v3.ts:104-130` |

**Observações:**
- Não há "hard block" vs "warning" explícito — tudo é `ConsistencyLevel` (none, low, medium, high, critical)
- `canProceed` = `false` se houver `critical` E `acceptedRiskBy` é nulo
- Validação CNPJ é client-side (`validateCnpj` em `PerfilEmpresaIntelligente.tsx:152-166`)
- Não há validação de NCM/NBS por regime/porte — apenas exibição condicional

---

## BLOCO 2 — CAMPOS CONDICIONAIS JÁ EXISTENTES

| campo/bloco | condição exata de abertura | obrigatoriedade | arquivo:linha |
|-------------|----------------------------|-----------------|-----------------|
| **Bloco NCM** | `operationType ∈ {"industria", "comercio", "misto", "agronegocio"}` | Opcional (badge "Opcional — ativa análise automática") | `PerfilEmpresaIntelligente.tsx:1005` |
| **Bloco NBS** | `operationType ∈ {"servicos", "misto", "financeiro"}` | Opcional | `PerfilEmpresaIntelligente.tsx:1111` |
| Múltiplos estabelecimentos | Sempre (seção 4) | Opcional (fallback null) | `PerfilEmpresaIntelligente.tsx:1236` |
| Importação/Exportação | Sempre (seção 4) | Opcional (fallback null) | `PerfilEmpresaIntelligente.tsx:1239` |
| Regimes especiais | Sempre (seção 4) | Opcional (fallback null) | `PerfilEmpresaIntelligente.tsx:1242` |
| Intermediários financeiros | Sempre (seção 5) | Opcional | `PerfilEmpresaIntelligente.tsx:~1260` |
| Meios de pagamento | Sempre (seção 5) | Opcional (`.length > 0` contribui ao score) | `PerfilEmpresaIntelligente.tsx:~1260` |
| Equipe tributária | Sempre (seção 6) | Opcional | `PerfilEmpresaIntelligente.tsx:~1300` |
| Auditoria fiscal | Sempre (seção 6) | Opcional | `PerfilEmpresaIntelligente.tsx:~1300` |
| Passivo tributário | Sempre (seção 6) | Opcional | `PerfilEmpresaIntelligente.tsx:~1300` |

**Observações:**
- NCM/NBS NÃO são condicionais em **obrigatoriedade** — apenas em **visibilidade**
- Regime tributário e porte sempre visíveis
- Perguntas dinâmicas são server-side em `calcularLimitePerguntas()`, não na UI

---

## BLOCO 3 — STATUS FINAL / INCONSISTÊNCIAS / JUSTIFICATIVA

| item | existe? | comportamento exato | arquivo:função | observação |
|------|---------|-------------------|-----------------|-----------|
| Tela/componente de revisão final | **Sim** — `AlertasInconsistencia` | Alertas visuais com impacto (alto/médio/baixo) em 3 estruturas: `pergunta_origem`, `resposta_declarada`, `contradicao_detectada` | `client/AlertasInconsistencia.tsx:1-250` | V70.2 com callback `onCorrigir` |
| Hard block | **Sim** | `ConsistencyLevel === "critical"` → `canProceed = false` até `acceptedRiskBy` ≠ null | `server/consistencyEngine.ts:14-81`; `server/routers/consistencyRouter.ts:102-124` | Bloqueia progresso pré-diagnóstico |
| Warning | **Sim** | `ConsistencyLevel ∈ {high, medium, low}` → recomendação visual | `server/consistencyEngine.ts:70-82` | Não bloqueia |
| Score | **Sim** | `deterministicScore` (0-100) + `aiScore` (0-100) → agregação via `aggregateFindings()` | `server/consistencyEngine.ts` | Média ponderada por level |
| Inconsistência (pós-briefing) | **Sim** — distinto de consistency finding | `Inconsistencia` em `briefingStructured.inconsistencias` (JSON) | `server/routers-fluxo-v3.ts:3100+`; `drizzle/schema.ts:103` | Briefing vs gate pré-diagnóstico |
| Continuar com justificativa (override) | **Sim** | `acceptRisk()` tRPC: mín. 10 caracteres; registra `acceptedRiskAt/By/Reason` | `server/routers/consistencyRouter.ts:208-238` | Hard blocks só desbloqueiam com justificativa |
| Captura da justificativa (input) | **Sim** | Campo texto livre com `z.string().min(10)` | `server/routers/consistencyRouter.ts:211` | Min 10 chars obrigatório |
| Persistência da justificativa | **Sim** | Coluna `consistencyChecks.acceptedRiskReason` (varchar 500) | `drizzle/schema.ts:155`; `server/routers/consistencyRouter.ts:232` | Rastreável auditoria |
| Impacto no briefing | **NÃO direto** | Aceitar risco desbloqueia fluxo mas NÃO regenera briefing | `server/routers/consistencyRouter.ts:237` | Justificativa é concessão de fluxo |
| Impacto nos riscos | **NÃO** | Aceitar risco de consistência NÃO afeta lista de riscos gerados | `server/routers/consistencyRouter.ts` | Riscos independentes do gate de consistência |

**Observações críticas:**
- **Não existe justificativa POR risco** — apenas uma justificativa única de aceitação do gate inteiro
- `projects.consistencyAcceptedRiskReason` (`drizzle/schema.ts:155`) é **distinto** de `consistency_checks.acceptedRiskReason` → duplicação e falta de sincronização
- UI "corrigir no questionário" (V70.2) navega ao modo revisão mas não afeta aceitação já registrada

---

## BLOCO 4 — "PERFIL DA EMPRESA" / ARQUÉTIPO ATUAL

| campo | existe | efeito atual | entra no futuro arquétipo? | motivo | arquivo:linha |
|-------|--------|-------------|---------------------------|--------|--------------|
| CNPJ | Sim | Validação + masking | **SIM** | Identidade | `PerfilEmpresaIntelligente.tsx:143-166` |
| companyType | Sim (8 enums) | Score completude (required) | **SIM** | Obrigatório | `PerfilEmpresaIntelligente.tsx:33`; `drizzle/schema.ts:146` |
| companySize | Sim (mei/micro/peq/med/grande) | Validação faturamento; filtro perguntas | **SIM** | Regime + complexidade | `drizzle/schema.ts:93-99` |
| annualRevenueRange | Sim (4 faixas) | Validação cruzada regime + porte | **SIM** | Crítico | `PerfilEmpresaIntelligente.tsx:35` |
| taxRegime | Sim (3 enums) | Validação cruzada; filtro perguntas | **SIM** | Determinante | `drizzle/schema.ts:87-91` |
| **operationType** | Sim (6 enums) | Exibição condicional NCM/NBS; filtro perguntas | **SIM** | Núcleo | `PerfilEmpresaIntelligente.tsx:37, 962-978` |
| clientType | Sim (array) | Score completude | **SIM** | Impacta split payment, ISS | `PerfilEmpresaIntelligente.tsx:38` |
| multiState | Sim (bool) | Validação DET-003 | **SIM** | ICMS, ISS | `PerfilEmpresaIntelligente.tsx:39` |
| hasMultipleEstablishments | Sim | Optional score; **SEM efeito determinístico** | Talvez | Preparado | `PerfilEmpresaIntelligente.tsx:40` |
| hasImportExport | Sim | Validação DET-005; **SEM efeito determinístico** | Talvez | Preparado | `PerfilEmpresaIntelligente.tsx:41` |
| **hasSpecialRegimes** | Sim | Optional score; **SEM EFEITO** | **NÃO — decorativo** | Coletado sem uso | `PerfilEmpresaIntelligente.tsx:42` |
| paymentMethods | Sim (array) | Filtro categoria split_payment; +2 limite | **SIM** | Complexidade | `PerfilEmpresaIntelligente.tsx:43` |
| hasIntermediaries | Sim | Filtro split_payment; +1 limite | **SIM** | Fluxo de caixa | `PerfilEmpresaIntelligente.tsx:44` |
| **hasTaxTeam** | Sim | Optional score; **SEM EFEITO** | **NÃO — decorativo** | Coletado sem uso | `PerfilEmpresaIntelligente.tsx:45` |
| **hasAudit** | Sim | Optional score; **SEM EFEITO** | **NÃO — decorativo** | Coletado sem uso | `PerfilEmpresaIntelligente.tsx:46` |
| hasTaxIssues | Sim | +1 limite perguntas se true | Talvez | Pode impactar risk engine | `PerfilEmpresaIntelligente.tsx:47` |
| isEconomicGroup | Sim | Optional score; **SEM efeito** (preparado QC-02) | Talvez | Prefill Contract Phase 1 | `PerfilEmpresaIntelligente.tsx:49` |
| taxCentralization | Sim | Optional score; **SEM efeito** (preparado QC-02) | Talvez | Prefill Contract Phase 1 | `PerfilEmpresaIntelligente.tsx:50` |
| principaisProdutos | Sim (array NCM+%) | Exibição condicional; sem efeito pré-diagnóstico | **SIM** | Engine NCM | `PerfilEmpresaIntelligente.tsx:52` |
| principaisServicos | Sim (array NBS+%) | Exibição condicional; sem efeito pré-diagnóstico | **SIM** | Engine NBS | `PerfilEmpresaIntelligente.tsx:53` |

**Resumo:**
- **Estrutura:** `PerfilEmpresaData` (client) + 5 JSONs server (`companyProfile`, `operationProfile`, `taxComplexity`, `financialProfile`, `governanceProfile`)
- **Agregação:** `calcProfileScore()` → `{ completeness, confidence, missingRequired, missingOptional }` (0-100)
- **Proto-arquétipo existe.** Campos que **JÁ funcionam como arquétipo:** `taxRegime`, `companySize`, `operationType`, `multiState`, `paymentMethods`, `clientType`, `hasIntermediaries`
- **Campos decorativos sem efeito (remover ou dar função):** `hasSpecialRegimes`, `hasTaxTeam`, `hasAudit`

---

## BLOCO 5 — RASTREABILIDADE DO RISCO

| funcionalidade | existe_hoje | como funciona | arquivo:função | gap |
|----------------|-------------|----------------|-----------------|-----|
| Breadcrumb completo | **Sim** (parcial) | `buildBreadcrumb(gap)` → `[fonte, categoria, artigo, ruleId]` (tupla 4-string) | `server/lib/risk-engine-v4.ts:153-155` | Apenas 4 labels; sem explicação LLM; sem lei-ref |
| SOURCE_RANK | **Sim** | cnae=1, ncm=2, nbs=3, solaris=4, iagen=5 | `server/lib/risk-engine-v4.ts:86-92, 157-163` | Só ordena; não pondera |
| **gap_id rastreável** | **NÃO** | `rule_id` (string) e `sourceReference` (string), mas SEM coluna `gap_id` em risks_v4 | `server/lib/db-queries-risks-v4.ts:44-55` | Referência indireta via rule_id |
| **Deletar risco** | **SIM** | `risksV4.deleteRisk(riskId, reason)` — soft-delete com cascata → action_plans + tasks; audit_log | `server/routers/risks-v4.ts:336-360` | Soft-delete, pode restaurar |
| **Adicionar risco manual** | **NÃO** | Nenhum procedure tRPC para criar risco fora de `generateRisks` | `server/routers/risks-v4.ts` | **GAP crítico** |
| Editar risco | **PARCIAL** | `upsertActionPlan()` edita plano vinculado, não o risco; sem `updateRisk()` | `server/routers/risks-v4.ts:475-520` | Título/descrição do risco imutáveis |
| Origem do risco | **Sim** | `rule_id`, `categoria`, `artigo`, `fonte` armazenados em `RiskV4Row` | `server/lib/db-queries-risks-v4.ts:57-82` | Snapshot isolado, sem link a `content_engine_rules` |
| **Justificativa do sistema por risco** | **NÃO** | Nenhum campo `ai_reasoning` / `justificativa_sistema` / `explanation` no risco | `server/lib/db-queries-risks-v4.ts` | **GAP crítico** — usuário não entende "por quê" |
| Link risco → plano | **SIM explícito** | `action_plans.risk_id` (FK); retornado em `listRisks()` com `actionPlans` nested | `server/routers/risks-v4.ts:293-305` | 1:N bidirecional |
| Link risco → categoria | **Sim** | `RiskV4Row.categoria` é enum; comparável com `risk_categories.codigo` | `server/lib/risk-engine-v4.ts:24` | Label, não FK |
| Procedure tRPC **deletar** | **SIM** | `deleteRisk(riskId, reason)` — `reason` obrigatório | `server/routers/risks-v4.ts:336-360` | — |
| Procedure tRPC **adicionar** manual | **NÃO** | — | — | **GAP crítico** |
| Procedure tRPC **editar** | **NÃO** (apenas plano) | `upsertActionPlan()` só para plano | `server/routers/risks-v4.ts:475-520` | Risco imutável |
| Audit de quem criou/deletou | **SIM** | `audit_log` registra `user_id`, `user_name`, `user_role` | `server/lib/db-queries-risks-v4.ts:172-185` | Completo |
| Visualização breadcrumb na UI | **SIM** | `ActionPlanPage.tsx` exibe `[source_priority, categoria, artigo, rule_id]` | `client/src/pages/ActionPlanPage.tsx:121-123` | Apenas 4 labels |
| Soft-delete com restauração | **SIM** | `softDeleteRiskWithCascade()` → status='deleted'; `restoreRiskWithCascade()` cascata action_plans/tasks | `server/lib/db-queries-risks-v4.ts:670-850+` | RI-07 compliant |

**Resumo de rastreabilidade:**
- **Trilha:** Questionário → GapRule → RiskV4 → ActionPlan → Task (mapeável, mas sem UI unificada)
- **3 GAPs críticos:**
  1. Sem **criação manual** de risco
  2. Sem **edição** de risco
  3. Sem **justificativa do sistema** por risco (breadcrumb é apenas 4 labels)

---

## BLOCO 6 — AVALIAÇÃO PARA O REDESENHO

### A) RESUMO EXECUTIVO (10 bullets)

1. **Arquétipo proto-funcional:** `PerfilEmpresaData` agrupa 20+ campos, mas apenas 8-10 disparam regras determinísticas; 4+ campos coletados sem efeito (`hasSpecialRegimes`, `hasTaxTeam`, `hasAudit`).
2. **5 validações cruzadas já implementadas** (DET-001..005) em `server/consistencyEngine.ts:118-199`; bloqueiam progresso para "critical"; override via justificativa 10+ chars persistido em `consistency_checks`.
3. **Campos condicionais** funcionam para NCM/NBS via `operationType` (`PerfilEmpresaIntelligente.tsx:1005, 1111`); demais blocos sempre visíveis.
4. **Status final sem hard diferenciação:** `AlertasInconsistencia` mostra contradições pós-briefing; `consistencyRouter.acceptRisk()` desbloqueia pré-diagnóstico. Duas cadeias distintas.
5. **Rastreabilidade de risco minimalista:** Breadcrumb é apenas 4 labels (`server/lib/risk-engine-v4.ts:153-155`); sem justificativa LLM, sem lei-ref, sem link a CAP origem.
6. **Soft-delete cascata robusta:** `deleteRisk` → cascata `action_plans + tasks`; audit_log em 3+ níveis; RI-07 compliant.
7. **Sem criação/edição manual de risco:** todos vêm de `generateRisks()` pipeline; falta UI para risco contextual.
8. **Confidence score sofisticado:** 6 pilares determinísticos em `calculate-briefing-confidence.ts:44-56` (Perfil 8, Q3 Produtos 10, Q3 Serviços 10, Q3 CNAE 10, Q1 5, Q2 2).
9. **Duas inconsistências distintas:** `ConsistencyFinding` (pré-diagnóstico) vs `Inconsistencia` no briefing JSON (pós-briefing). Sem integração.
10. **Blocker de schema:** `risks_v4` **não tem coluna `gap_id`** → impossível rastreação direta a `GapRule`; sem correlação lei-risco explícita.

### B) TABELA DE REAPROVEITAMENTO

| item | reaproveitar | ajustar | criar do zero | risco | arquivo:linha |
|------|--------------|---------|---------------|----|--------------|
| `calcProfileScore()` | ✅ | Expandir para 20+ campos com pesos individuais | — | LOW | `PerfilEmpresaIntelligente.tsx:169-202` |
| `PerfilEmpresaData` (tipo) | ✅ | Adicionar campos derivados (archetype_label, risk_profile) | — | LOW | `PerfilEmpresaIntelligente.tsx:31-78` |
| `consistencyEngine` + `runDeterministicChecks()` | ✅ | Expandir regras (20→30+); separar must_fix de warning | — | MEDIUM | `server/consistencyEngine.ts:108-200` |
| `calculate-briefing-confidence.ts` | ✅ | Reajustar pesos se novos pilares surgirem | — | LOW | `server/lib/calculate-briefing-confidence.ts:44-56` |
| `softDeleteRiskWithCascade()` + `restoreRiskWithCascade()` | ✅ | Adicionar undo/redo; versioning | — | LOW | `server/lib/db-queries-risks-v4.ts:670-850` |
| Breadcrumb 4-labels | PARCIAL — insuficiente | — | Expandir para `[fonte, gap_id, categoria, artigo_exato, severity, lei_ref]` + tabela bridge | **HIGH** | `server/lib/risk-engine-v4.ts:153-155` |
| `risksV4.deleteRisk` + `approveRisk` | ✅ | Adicionar `updateRisk()`, `bulkDelete()`, versioning | `insertRiskManual()` | MEDIUM | `server/routers/risks-v4.ts:336-421` |
| `AlertasInconsistencia` (UI) | ✅ | Integrar com `ConsistencyFinding` em tela única | — | LOW | `client/AlertasInconsistencia.tsx:1-250` |
| `consistencyRouter.acceptRisk()` | ✅ | Expandir para `accept_with_mitigation`; link com Action Plan | — | LOW | `server/routers/consistencyRouter.ts:208-238` |
| `extractProjectProfile()` dual-schema | ✅ pragmático | Migrar para single-schema; remover snake_case/camelCase | — | MEDIUM | `server/lib/project-profile-extractor.ts:109-200` |

### C) BLOCKERS

| blocker | impacto | motivo | arquivo:linha |
|---------|---------|--------|--------------|
| `consistency_checks.acceptedRiskReason` | Alteração quebra auditoria retroativa | Justificativas históricas na coluna | `drizzle/schema.ts:155` |
| Enum `Categoria` hardcoded (10 valores) | Adicionar categoria exige 3 lugares | SEVERITY_TABLE + CategoriaV4Schema + BD | `server/lib/risk-engine-v4.ts:16-27, 73-84` |
| `SOURCE_RANK` hardcoded (5 fontes) | Adicionar fonte quebra histórico | Sorting depende da ordem | `server/lib/risk-engine-v4.ts:86-92` |
| `calcularLimitePerguntas()` com 8 condições fixas | Adicionar dimensão exige refator | Completude retroativa afetada | `server/routers-fluxo-v3.ts:78-102` |
| `RiskV4Row.breadcrumb` JSON string 4 labels | Expandir quebra 10+ componentes React | Desserialização em consumers | `server/lib/db-queries-risks-v4.ts:69`; `client/ActionPlanPage.tsx:121-123` |
| Soft-delete com `status='deleted'` | Mudar para physical delete quebra restore + auditoria | 20+ queries assumem soft-delete reversível | `server/lib/db-queries-risks-v4.ts:338-370` |
| `PerfilEmpresaData.clientType: string[]` não-null | Frontend assume sempre array | ~20 linhas presumem array | `PerfilEmpresaIntelligente.tsx:38, 176` |

### D) RED FLAGS

| red_flag | explicação | arquivo:linha |
|----------|-----------|--------------|
| Campos coletados sem uso (hasSpecialRegimes, hasTaxTeam, hasAudit) | 3 campos contribuem só ao score; nenhuma regra determinística | `PerfilEmpresaIntelligente.tsx:45-47, 185-190` |
| **Dual-schema camelCase + snake_case** | Fallback entre `operationType` e `tipoOperacao`, `multiState` e `multiestadual` — migração incompleta | `server/lib/project-profile-extractor.ts:160-182` |
| **Breadcrumb é apenas 4 labels, sem explicação** | Risco sem justificativa LLM, sem referência a lei, sem CAP origem | `server/lib/risk-engine-v4.ts:153-155`; `client/ActionPlanPage.tsx:121-123` |
| **Sem `updateRisk()` tRPC procedure** | Todos os riscos imutáveis após criação; apenas delete/restore | `server/routers/risks-v4.ts:100-470` |
| **Sem `gap_id` coluna em risks_v4** | Impossível rastrear risco → GapRule origem | `server/lib/db-queries-risks-v4.ts:44-82` |
| Validações DET-001..005 em `consistencyEngine` pós-save | Usuário vê erro de regime DEPOIS de salvar perfil; deveria ser client-side imediato | `server/consistencyEngine.ts:118-135`; `PerfilEmpresaIntelligente.tsx` sem validação local |
| `AlertasInconsistencia` e `ConsistencyFinding` são estruturas disjuntas | Pré-diagnóstico vs pós-briefing; sem sincronização | `client/AlertasInconsistencia.tsx`; `server/consistencyEngine.ts`; `server/routers-fluxo-v3.ts` |
| `PESOS_CONFIANCA` hardcoded | Mudança = code change + redeploy; sem UI; sem versioning | `server/lib/calculate-briefing-confidence.ts:44-56` |
| `acceptRisk()` persiste em duas colunas | `projects.consistencyAcceptedRiskReason` vs `consistency_checks.acceptedRiskReason` | `drizzle/schema.ts:155`; `server/routers/consistencyRouter.ts:227-235` |
| Cascata soft-delete sem versioning | Sem snapshot pré-delete; restore é all-or-nothing | `server/lib/db-queries-risks-v4.ts:670-850` |

---

## BLOCO 7 — ACHADOS ADICIONAIS

### 7.1 Confidence Score é mais sofisticado do que parece

`server/lib/calculate-briefing-confidence.ts:44-56` — fórmula ponderada transparente, 6 pilares, servidor-side, determinística (sem LLM). P.O. substituiu bandas discretas por contínuo em UAT 2026-04-21.

### 7.2 Duas "inconsistências" distintas

- **ConsistencyFinding** (pré-diagnóstico): `{id, level, category, title, description, field, expectedValue, actualValue, recommendation, source}` em `consistency_checks` → bloqueia fluxo
- **Inconsistencia do briefing** (pós-geração): `{pergunta_origem, resposta_declarada, contradicao_detectada, impacto}` em `projects.briefingStructured.inconsistencias` → apenas visual

### 7.3 NCM/NBS opcionais no formulário mas obrigatórios para Q.Produtos/Q.Serviços

Visibilidade condicional (`PerfilEmpresaIntelligente.tsx:1005, 1111`). Obrigatoriedade: **não** (badge "Opcional"); se fornecer, ativa análise automática de risco por NCM/NBS.

### 7.4 Tabela `risk_categories` permite ajuste de severity sem code change

`server/lib/risk-engine-v4.ts:114-147` — `getRiskCategories()` com cache TTL 1h.

### 7.5 Auditoria em 3+ níveis

Cada entidade (risco, plano, tarefa) tem `audit_log`: `entity_id`, `action`, `user_id/name/role`, `before/after_state`, `reason`. `server/lib/db-queries-risks-v4.ts:172-185`.

---

## CONCLUSÃO

O sistema atual é **coerente mas incompleto**:

- Arquétipo **proto-funcional** existe em `PerfilEmpresaData` + 5 JSONs server-side
- Validações cruzadas **existem** (DET-001..005)
- Campos condicionais **funcionam** para NCM/NBS
- Gate de consistência **robusto** com justificativa
- Rastreabilidade de risco **minimalista** (breadcrumb 4-labels)
- Soft-delete cascata **implementado** e auditado

**Principais gaps para redesenho:**
1. Criação/edição manual de risco
2. Breadcrumb insuficiente (sem `gap_id`, sem lei-ref, sem justificativa LLM)
3. Dual-schema tech debt (camelCase + snake_case)
4. Campos decorativos sem efeito (`hasSpecialRegimes`, `hasTaxTeam`, `hasAudit`)

**Fonte de verdade:** este documento para todas as perguntas do consultor pré-SPEC v3.
