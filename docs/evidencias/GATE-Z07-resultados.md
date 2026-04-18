# Gate Z-07 — Resultados de Validação

**Data:** 2026-04-09  
**Sprint:** Z-07  
**Executor:** Manus (implementador técnico)  
**Aprovação P.O.:** Uires Tapajós  
**Decisão registrada:** DEC-SWAP-05 (AUDIT-C-004 → Opção A)

---

## ETAPA 1 — Arquivos do Sprint Z-07 em `main`

| Arquivo | Status | Linhas |
|---|---|---|
| `server/lib/risk-engine-v4.ts` | ✅ Presente | 4.1 KB |
| `server/routers/risks-v4.ts` | ✅ Presente | 11 procedures |
| `drizzle/0064_risks_v4.sql` | ✅ Presente | 4 tabelas |

**4 tabelas verificadas no banco:**

| Tabela | Colunas-chave | Status |
|---|---|---|
| `risks_v4` | `id, project_id, rule_id, type, categoria, severidade, urgencia, evidence, breadcrumb, source_priority, confidence, status, approved_by, approved_at, deleted_reason` | ✅ |
| `action_plans` | `id, project_id, risk_id, titulo, responsavel, prazo, status, approved_by, approved_at, deleted_reason` | ✅ |
| `tasks` | `id, project_id, action_plan_id, titulo, responsavel, prazo, status, ordem, deleted_reason` | ✅ |
| `audit_log` | `id, project_id, entity, entity_id, action, user_id, user_name, user_role, before_state, after_state, reason` | ✅ |

---

## Cenário M-01 — Imposto Seletivo (NCM 2202.10.00)

**Input:** NCM 2202.10.00 (bebida açucarada)  
**Esperado:** `categoria = imposto_seletivo`, `type = risk`, `severidade = alta`, breadcrumb 4 nós

| Check | Valor | Resultado |
|---|---|---|
| `rule_id` | `IS-ART-2` | ✅ |
| `categoria` | `imposto_seletivo` | ✅ |
| `type` | `risk` | ✅ |
| `artigo` | `Art. 2` | ✅ |
| `severidade` | `alta` | ✅ |
| `urgencia` | `imediata` | ✅ |
| `breadcrumb nós` | `4` | ✅ |
| `breadcrumb[0].step` | `ncm-engine` | ✅ |
| `breadcrumb[1].gap` | `imposto_seletivo` | ✅ |
| `breadcrumb[2].categoria` | `imposto_seletivo` | ✅ |
| `breadcrumb[3].ruleId` | `IS-ART-2` | ✅ |
| `status` | `active` | ✅ |

**M-01: ✅ PASS** — risco IS-ART-2 com breadcrumb 4 nós confirmado

---

## Cenário M-02 — Alíquota Zero (NCM 1006.40.00)

**Input:** NCM 1006.40.00 (arroz — cesta básica)  
**Esperado:** `categoria = aliquota_zero`, `type = opportunity`, `severidade = oportunidade`, sem plano de ação

**Output JSON do risco:**

```json
{
  "id": "e76c033c-f665-4316-9945-674063c3926d",
  "rule_id": "AZ-ART-9",
  "type": "opportunity",
  "categoria": "aliquota_zero",
  "artigo": "Art. 9",
  "severidade": "oportunidade",
  "urgencia": "medio_prazo",
  "status": "active",
  "confidence": "0.9900",
  "breadcrumb_nodes": 4,
  "action_plans_count": 0
}
```

| Check | Valor | Resultado |
|---|---|---|
| `categoria` | `aliquota_zero` | ✅ |
| `type` | `opportunity` | ✅ |
| `severidade` | `oportunidade` | ✅ |
| `artigo` | `Art. 9` | ✅ |
| `breadcrumb nós` | `4` | ✅ |
| `action_plans_count` | `0` (sem plano) | ✅ |
| `status` | `active` | ✅ |

**Frontend:** O `ActionPlanPage.tsx` não exibe botão "+ Adicionar Plano" manual. Para `opportunity` sem planos, a UI exibe "Nenhum plano de ação gerado ainda" — sem botão de criação. O engine v4 não gera `action_plans` para `type = 'opportunity'`.

**M-02: ✅ PASS** — opportunity sem plano de ação confirmado

---

## Cenário M-03 — Soft Delete → SQL → Restore → audit_log

**Input:** Risco `IS-ART-2` (imposto_seletivo)  
**Sequência:** INSERT → soft delete → verificar SQL → restore → verificar audit_log

**PASSO 2 — SELECT após soft delete:**

```json
{
  "status": "deleted",
  "deleted_reason": "teste Gate Z-07"
}
```

| Check | Resultado |
|---|---|
| `status = deleted` | ✅ |
| `deleted_reason = "teste Gate Z-07"` | ✅ |
| Registro ainda existe (soft delete, não hard delete) | ✅ |

**PASSO 4 — audit_log após restore:**

```
[1] action=created  | entity=risk | entity_id=2acf07aa... | reason=Criado no Gate Z-07 M-03
[2] action=deleted  | entity=risk | entity_id=2acf07aa... | reason=teste Gate Z-07
[3] action=restored | entity=risk | entity_id=2acf07aa... | reason=Restaurado no Gate Z-07 M-03
```

| Check | Resultado |
|---|---|
| `soft delete ok` (status=deleted + reason) | ✅ |
| `audit_log 3 entradas` | ✅ |
| `audit: created` | ✅ |
| `audit: deleted` | ✅ |
| `audit: restored` | ✅ |
| `status após restore = active` | ✅ |
| `deleted_reason após restore = NULL` | ✅ |

**M-03: ✅ PASS** — soft delete + restore + audit_log confirmados

---

## Resumo Final

| Cenário | Resultado |
|---|---|
| M-01 — Imposto Seletivo (NCM 2202.10.00) | ✅ PASS |
| M-02 — Alíquota Zero (NCM 1006.40.00) | ✅ PASS |
| M-03 — Soft Delete → Restore → audit_log | ✅ PASS |

**Gate Z-07: ✅ APROVADO — 3/3 cenários passaram**

---

## Gap identificado (não bloqueante)

**MENOR-02:** O arquivo `drizzle/0064_risks_v4.sql` especificou `status ENUM('ativo','deletado')` e coluna `deleted_at`, mas a migration executada no banco criou `status ENUM('active','deleted')` sem `deleted_at`. A tabela está funcional — o `db-queries-risks-v4.ts` usa os valores corretos do banco. Registrado para correção no PR #E.

---

## Decisões registradas nesta sprint

| Código | Decisão | P.O. | Data |
|---|---|---|---|
| DEC-SWAP-05 | AUDIT-C-004 → Opção A: `scoringEngine.ts` não é tocado no Sprint Z-07. `generateRisks` não tem dependência do CPIE. PR #E criará `scoringEngine-v4.ts` na próxima sprint. | Uires Tapajós | 2026-04-09 |
