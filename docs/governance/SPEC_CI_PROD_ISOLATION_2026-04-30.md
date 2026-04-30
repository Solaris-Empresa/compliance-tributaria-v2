# SPEC: Isolamento CI ↔ Produção TiDB

**Issue:** #873
**Prioridade:** P0-PROCESS
**Data:** 2026-04-30
**Autor:** Manus (implementador técnico)
**Status:** DRAFT — aguarda sprint dedicada

---

## 1. Problema

Os workflows GitHub Actions (`test-suite.yml`, `structural-fix-gate.yml`) injetam `secrets.DATABASE_URL` de produção diretamente nos jobs de teste. Isso causa:

- Criação massiva de dados sintéticos em produção
- Poluição de métricas e dashboards
- Risco de mutação acidental em dados reais
- Impossibilidade de cleanup sem downtime

## 2. Escala Real (Diagnóstico 2026-04-30)

| Métrica | Valor |
|---------|-------|
| Users sintéticos em prod | **15.908** |
| Projetos de teste em prod | **268** |
| Estimativa cascades (FK) | **~500k rows** |
| Workflows afetados | `test-suite.yml` (L29, L34), `structural-fix-gate.yml` (L156, L163) |
| Período de acúmulo | ~24/04 a 30/04 (6 dias) |
| Bursts típicos | 10-50 users/run, 5-15 projetos/run |

## 3. Camadas de Solução

### Camada 1 — DATABASE_URL_TEST (imediato)

Criar secret `DATABASE_URL_TEST` apontando para banco TiDB isolado (branch ou cluster separado). Substituir nos 2 workflows.

### Camada 2 — Prefixo obrigatório em testes

Todos os testes que criam dados devem usar prefixo `TEST_` em nomes e emails `@ci-test.internal`. Facilita identificação e cleanup.

### Camada 3 — Cleanup automático pós-run

Job final no workflow que deleta dados criados pelo run (usando transaction ID ou prefixo).

### Camada 4 — Guard em produção

Middleware que rejeita criação de users com email `@example.com`, `@test.com`, `@teste.com` quando `NODE_ENV=production`.

### Camada 5 — Cleanup Retroativo (Classe C)

**Reclassificação:** Classe C (não A). Escala grande mas dados sintéticos sem valor de negócio.

#### 5.1 Pré-requisitos BLOQUEANTES

1. **Issue #873 fix mergeado** — Sem isolamento, cleanup é Sísifo (próximo CI run recria)
2. **Backup TiDB completo** pré-cleanup (snapshot ou export)
3. **DRY-RUN obrigatório** — lista candidatos antes de DELETE, P.O. revisa

#### 5.2 Critérios de Identificação

| Critério | Segurança | Notas |
|----------|-----------|-------|
| `users.email LIKE '%@example.com'` | SEGURO | Domínio RFC 2606 reservado |
| `users.email LIKE '%@test.com'` | SEGURO | Domínio RFC 2606 reservado |
| `users.email LIKE '%@teste.com'` | VERIFICAR | Pode existir domínio real brasileiro |
| `users.openId LIKE 'test-%-@%'` | SEGURO | Pattern timestamp = sintético forte |
| `users.name = 'Test User'` (exato) | SEGURO | Nome genérico de fixture |
| `users.name LIKE 'Test User%'` | VERIFICAR | Pode pegar user real com nome similar |
| `users.name LIKE 'Cliente Teste%'` | SEGURO | Pattern de fixture com timestamp |

#### 5.3 Procedimento

```sql
-- PASSO 1: DRY-RUN (lista candidatos, NÃO deleta)
SELECT id, email, name, role, created_at
FROM users
WHERE email LIKE '%@example.com'
   OR email LIKE '%@test.com'
   OR email LIKE '%@teste.com'
   OR openId LIKE 'test-%-@%'
   OR name = 'Test User'
   OR name LIKE 'Cliente Teste %'
ORDER BY created_at DESC;

-- PASSO 2: Exportar lista para revisão P.O.
-- (salvar CSV, P.O. aprova antes de continuar)

-- PASSO 3: DELETE FK-aware em TRANSACTION
START TRANSACTION;

-- Ordem FK-aware (filhos primeiro):
-- 1. solaris_answers (FK → projects)
-- 2. cpie_analysis_history (FK → projects)
-- 3. risks (FK → projects)
-- 4. action_plans (FK → projects)
-- 5. projects (FK → users via userId)
-- 6. clientMembers (FK → users)
-- 7. users

-- NÃO COMMIT até P.O. revisar contagem de rows afetados
-- ROLLBACK se contagem divergir >5% do DRY-RUN

-- PASSO 4: Após COMMIT, verificar integridade
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM ragDocuments;  -- NÃO deve mudar
```

#### 5.4 Estimativas

| Métrica | Valor |
|---------|-------|
| Rows diretos (users + projects) | ~16.176 |
| Rows cascades (answers, risks, etc.) | ~500k (estimativa) |
| Duração estimada | TBD em DRY-RUN |
| Risco de downtime | Baixo (TiDB MVCC, mas locks em batch grande) |
| Recomendação | Batch de 1000 rows por DELETE com SLEEP(1) entre batches |

#### 5.5 Validação pós-cleanup

- `ragDocuments` count INALTERADO (2515)
- Nenhum user com role `equipe_solaris` ou `advogado_senior` deletado
- Nenhum projeto com `archetype IS NOT NULL` deletado
- Health endpoint `healthy`

## 4. Cronograma

| Camada | Sprint | Dependência |
|--------|--------|-------------|
| 1 (DATABASE_URL_TEST) | Dedicada #873 | Nenhuma |
| 2 (Prefixo) | Junto com Camada 1 | Nenhuma |
| 3 (Cleanup auto) | Junto com Camada 1 | Camada 2 |
| 4 (Guard prod) | Após Camada 1 | Nenhuma |
| 5 (Cleanup retro) | Sprint dedicada subsequente | Camada 1 mergeada |

## 5. Referências

- Issue #873: https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/873
- Issue #874: https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/874
- Diagnóstico D5-D9: Sessão Manus 2026-04-30
- Smoke R3-A: Cenários 1-5 PASS (prod validado)
