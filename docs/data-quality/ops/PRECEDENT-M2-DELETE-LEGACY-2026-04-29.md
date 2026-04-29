# PRECEDENT-M2 — DELETE Legacy Projects

**Data:** 2026-04-29T09:00Z
**Operador:** Manus (autorizado por P.O. Uires Tapajós)
**Objetivo:** Limpar 9.803 projetos legacy + dados filhos para preparar M2 (Perfil da Entidade)

---

## Pré-condições verificadas

| Check | Valor |
|-------|-------|
| main HEAD | `06b7faf` (PR #862) |
| ragDocuments pré-DELETE | 2.515 |
| ragDocuments com cnaeGroups | 2.515 |
| risk_categories | 11 |
| users | 15.977 |
| projects | 9.803 |

## Schema Discovery

### FKs formais para `projects` (apenas 3)

| Tabela | Coluna | Constraint |
|--------|--------|-----------|
| iagen_answers | project_id | FK → projects.id |
| project_status_log | project_id | FK → projects.id |
| solaris_answers | project_id | FK → projects.id |

### FKs cascateadas (entre child tables)

| Tabela | FK para |
|--------|---------|
| tasks | action_plans.id |
| action_plans | risks_v4.id |
| solaris_answers | solaris_questions.id |

### Tabelas distintas confirmadas

`actionPlans` (camelCase, 1.170 rows, legacy v1) e `action_plans` (snake_case, 181 rows, v4 com FK → risks_v4) são **tabelas distintas** com schemas completamente diferentes.

`projects_audit_log` **NÃO EXISTE** — removida do script.

## Ordem topológica executada

```
NÍVEL 3: tasks (FK → action_plans)
NÍVEL 2: action_plans (FK → risks_v4), solaris_answers (FK → projects + solaris_questions)
NÍVEL 1.5: iagen_answers (FK → projects + risk_categories), project_status_log (FK → projects)
NÍVEL 1: 55 tabelas sem FK formal
NÍVEL 0: projects
```

## Resultado da transação

| Tabela | Rows deletados |
|--------|---------------|
| tasks | 533 |
| action_plans | 181 |
| solaris_answers | 879 |
| iagen_answers | 92 |
| project_status_log | 5.825 |
| actionPlanVersions | 887 |
| actionPlans | 1.170 |
| actions | 226 |
| assessmentPhase1 | 8.922 |
| assessmentPhase2 | 3.749 |
| auditLog | 131 |
| audit_log | 1.407 |
| branchActionPlans | 1.565 |
| branchAssessments | 1.756 |
| briefingVersions | 1.919 |
| briefings | 1.868 |
| consistency_checks | 8 |
| corporateActionPlans | 303 |
| corporateAssessments | 303 |
| diagnostic_shadow_divergences | 537 |
| m1_runner_logs | 21 |
| notifications | 296 |
| projectBranches | 302 |
| projectPermissions | 1 |
| project_actions_v3 | 37 |
| project_briefings_v3 | 36 |
| project_gaps_v3 | 5.058 |
| project_risks_v3 | 37 |
| questionnaireAnswersV3 | 4.848 |
| riskMatrix | 296 |
| risks_v4 | 307 |
| sessionBranchAnswers | 608 |
| sessions | 369 |
| stepComments | 1 |
| **projects** | **9.803** |
| **TOTAL** | **~44.158** |

Tabelas com 0 rows (DELETE executado mas nada a remover): actionPlanPromptHistory, branchActionPlanVersions, branchAssessmentVersions, branchSuggestions, complianceSessions, compliance_sessions, compliance_usage_logs_v3, corporateActionPlanVersions, corporateAssessmentVersions, cosoControls, cpie_analysis_history, gapAuditTrail, milestones, phases, planApprovals, projectParticipants, project_assessments_v3, project_scores_v3, project_snapshots_v3, project_tasks_v3, questionnaireProgressV3, questionnaireQuestionsCache, riskMatrixPromptHistory, riskMatrixVersions, sessionConsolidations, taskHistory.

## Verificação pós-DELETE

### V1: Contagens zeradas ✅

| Tabela | Count |
|--------|-------|
| projects | 0 |
| briefings | 0 |
| risks_v4 | 0 |
| tasks | 0 |
| solaris_answers | 0 |
| iagen_answers | 0 |

### V2: RAG intacto ✅

| Métrica | Valor |
|---------|-------|
| ragDocuments total | **2.515** |
| ragDocuments com cnaeGroups | **2.515** |

### V3: 7 Sentinels ✅

| id | cnaeGroups |
|----|-----------|
| 39 | `01,02,03,10,11,12,86,87,88,45,46,47` |
| 148 | `01,02,03,10,11,12,86,87,88` |
| 178 | `01,02,03,10,11,12` |
| 179 | `01,02,03,10,11,12` |
| 213 | `01,02,03,10,11,12` |
| 214 | `01,02,03,10,11,12` |
| 944 | `01,02,03,10,11,12` |

### V4: Art. 169 LC 214 ✅

| id | lei | artigo | chunkIndex | cnaeGroups |
|----|-----|--------|------------|-----------|
| 215 | lc214 | Art. 169 | 0 | `49,50,51,52,53,64,65,66` |
| 216 | lc214 | Art. 169 (parte 2) | 1 | `49,50,51,52,53,64,65,66` |

### V5: Art. 169 LC 227 NÃO TOCADO ✅

| id | lei | artigo | chunkIndex | cnaeGroups |
|----|-----|--------|------------|-----------|
| 1041 | lc227 | Art. 169 | 0 | `10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33` |

### V6: Integridade hash ✅

```
RAG Integrity Hash (SHA-256 de JSON(id+lei+artigo+chunkIndex+cnaeGroups)):
63bf1cdff8ff1473b36312399bed6c73a3f3252a88919c09bb87b4971dc65bbd
```

### V7: Tabelas de referência NÃO TOCADAS ✅

| Tabela | Pré-DELETE | Pós-DELETE |
|--------|-----------|-----------|
| risk_categories | 11 | 11 |
| users | 15.977 | 15.977 |
| ragDocuments | 2.515 | 2.515 |

## Nota sobre diff TSV

O diff byte-a-byte entre baseline e postcheck TSV mostra diferenças de **formato** (newlines dentro de campos `conteudo_short` no baseline vs espaços no postcheck). Isso é artefato de serialização, NÃO mudança de dados. A verificação definitiva é o hash de integridade V6 que cobre `id+lei+artigo+chunkIndex+cnaeGroups` — os campos críticos para o RAG.

## Rollback

Não aplicável — DELETE é irreversível sem backup externo. A operação foi autorizada pelo P.O. com ciência de que os dados deletados eram projetos de teste/demo sem valor de produção.

## Condições de abort (todas PASS)

- [x] ragDocuments = 2.515 (abort se ≠ 2515)
- [x] risk_categories = 11 (abort se alterada)
- [x] users = 15.977 (abort se alterada)
- [x] projects = 0 (abort se ≠ 0 pós-DELETE)
