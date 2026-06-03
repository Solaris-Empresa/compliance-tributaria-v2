# DB-SPEC — SOLARIS Gap Classification (TO-BE)

**Data:** 2026-06-01 · **Companion de:** `AS-IS-TO-BE-SOLARIS-GAP-CLASSIFICACAO-20260601.md` · **Status:** spec — não executado.

---

## 0. Escopo

Spec do banco para o TO-BE do gap analyzer SOLARIS. **Zero migration nova** — toda a coluna necessária (`solaris_answers.resposta_opcao`) **já existe em main** desde a migration `0120_sol_resposta_opcao.sql` (PR #1316, 30/05/2026). Este documento cobre:

1. Schema atual confirmado (sem mudanças)
2. Queries de **verificação pré-fix** (Manus roda antes de F1)
3. Queries de **cleanup autorizado pelo P.O.** (RAG intocado)
4. Queries de **DoD pós-fix** (verificação empírica de que `resposta_opcao` agora dispara gaps)

---

## 1. Schema atual (sem mudanças)

### 1.1 `solaris_answers` — coluna canônica

```sql
-- drizzle/0120_sol_resposta_opcao.sql (já em main desde 30/05/2026)
ALTER TABLE `solaris_answers`
  ADD COLUMN `resposta_opcao`
    ENUM('sim', 'nao', 'nao_sei', 'nao_se_aplica') NULL
    AFTER `resposta`;
```

Estado da coluna em produção (Manus 2026-06-01):

| `resposta_opcao` | count | `resposta` |
|---|---|---|
| `sim` | 6 | `""` |
| `sim` | 1 | `"Não."` (inconsistência B2) |
| `nao` | 5 | `""` (B1 — falsos negativos) |
| `nao_se_aplica` | 2 | `""` |
| `null` (pré-PR-C) | 12 | `""` |
| `null` | 89 | `"Sim."` |
| `null` | 11 | `"N/A."` |
| **total atual** | **126** | — |

### 1.2 `solaris_questions` — sem mudanças

Schema confirmado pelo Manus na Q1 anterior:
- `id, codigo, texto, titulo, categoria, cnae_groups (json), topicos, severidade_base, vigencia_inicio, risk_category_code, classification_scope (enum), mapping_review_status (enum), lei_ref, artigo_ref, fonte, criado_por_id, criado_em, atualizado_em, upload_batch_id, ativo, obrigatorio, observacao`

### 1.3 `project_gaps_v3` — sem mudanças

Writers atuais por source: `solaris`, `iagen`, `engine` (analyzer ativo cada). G17 escreve com `source='solaris'`, `gap_level='operacional'`, `gap_type='normativo'`, `compliance_status='nao_atendido'`, `evaluation_confidence=0.9`.

---

## 2. Queries de verificação pré-fix (Manus executa)

### Q-PRE-1 — Distribuição completa radio × texto (snapshot pré-fix)

```sql
SELECT
  COALESCE(resposta_opcao, '(null)') AS opcao,
  CASE
    WHEN resposta IS NULL OR TRIM(resposta) = '' THEN '(vazio)'
    WHEN TRIM(LOWER(resposta)) LIKE 'sim%' THEN 'sim*'
    WHEN TRIM(LOWER(resposta)) LIKE 'não%' OR TRIM(LOWER(resposta)) = 'nao' THEN 'não*'
    WHEN TRIM(LOWER(resposta)) IN ('n/a','na') THEN 'n/a'
    WHEN TRIM(LOWER(resposta)) LIKE 'não se aplica%' OR TRIM(LOWER(resposta)) LIKE 'não aplic%' THEN 'não aplic*'
    ELSE 'outro'
  END AS texto_bucket,
  COUNT(*) AS qty
FROM solaris_answers
GROUP BY 1, 2
ORDER BY 1, 2;
```

**Por que:** snapshot que permite comparação pré/pós-fix (deve aparecer no DoD).

### Q-PRE-2 — Identificar exatamente os 5 falsos negativos (B1)

```sql
SELECT sa.id, sa.project_id, sa.codigo, sa.resposta_opcao,
       LENGTH(COALESCE(sa.resposta,'')) AS resp_len,
       sa.created_at,
       (
         SELECT COUNT(*) FROM project_gaps_v3 g
         WHERE g.project_id = sa.project_id
           AND g.source = 'solaris'
           AND g.question_id = sa.question_id
       ) AS gaps_atuais
FROM solaris_answers sa
WHERE sa.resposta_opcao = 'nao'
  AND (sa.resposta IS NULL OR TRIM(sa.resposta) = '')
ORDER BY sa.project_id, sa.codigo;
```

**Por que:** lista exata para Manus deletar (cleanup F5) OU re-rodar `analyzeSolarisAnswers` (alternativa preservando projeto).

### Q-PRE-3 — Identificar o 1 caso B2 (radio "sim" + texto "não")

```sql
SELECT sa.id, sa.project_id, sa.codigo, sa.resposta_opcao,
       LEFT(sa.resposta, 100) AS resp_preview, sa.created_at
FROM solaris_answers sa
WHERE sa.resposta_opcao IN ('sim','nao_sei','nao_se_aplica')
  AND TRIM(LOWER(COALESCE(sa.resposta,''))) LIKE 'não%';
```

**Por que:** documentar inconsistências reais antes de decidir UX (toast bloqueante vs warning vs silencioso).

### Q-PRE-4 — Confirmar Z-11 morto (paridade dead-read no banco)

```sql
-- Nenhum INSERT em project_gaps_v3 com source='solaris' deveria conter requirement_code='CAT-...'
-- (esse padrão é exclusivo do Z-11 — analyze-gaps-questionnaires.ts:309)
SELECT COUNT(*) AS gaps_padrao_z11
FROM project_gaps_v3
WHERE source = 'solaris'
  AND requirement_code LIKE 'CAT-%';
```

**Esperado:** `0` (zero — confirma que Z-11 nunca escreveu em produção).

---

## 3. Queries de CLEANUP autorizado pelo P.O.

⚠️ **DESTRUCTIVE — executar em ordem, após backup.**

### Q-CLN-1 — Listar projetos elegíveis para limpeza

```sql
-- Critério: projetos com QUALQUER resposta_opcao não-null e texto inconsistente OU vazio
SELECT DISTINCT p.id, p.name, p.created_at,
       COUNT(sa.id) AS solaris_answers_count,
       SUM(CASE WHEN sa.resposta_opcao IS NOT NULL THEN 1 ELSE 0 END) AS com_opcao,
       SUM(CASE WHEN sa.resposta_opcao IS NOT NULL
                  AND (sa.resposta IS NULL OR TRIM(sa.resposta) = '') THEN 1 ELSE 0 END) AS dirty_count
FROM projects p
JOIN solaris_answers sa ON sa.project_id = p.id
WHERE sa.resposta_opcao IS NOT NULL
GROUP BY p.id, p.name, p.created_at
HAVING dirty_count > 0
ORDER BY p.id;
```

**P.O. revisa a lista antes do DELETE.**

### Q-CLN-2 — DELETE em ordem (respeitar FKs)

```sql
-- 1. tasks (filhas de action_plans)
DELETE t FROM tasks t
JOIN action_plans ap ON t.action_plan_id = ap.id
WHERE ap.project_id IN ( /* lista de IDs do Q-CLN-1 aprovada pelo P.O. */ );

-- 2. action_plans (filhos de risks_v4)
DELETE FROM action_plans WHERE project_id IN ( /* ... */ );

-- 3. risks_v4
DELETE FROM risks_v4 WHERE project_id IN ( /* ... */ );

-- 4. project_gaps_v3 (todas as fontes — solaris/iagen/engine)
DELETE FROM project_gaps_v3 WHERE project_id IN ( /* ... */ );

-- 5. solaris_answers
DELETE FROM solaris_answers WHERE project_id IN ( /* ... */ );

-- 6. iagen_answers (se existir)
DELETE FROM iagen_answers WHERE project_id IN ( /* ... */ );

-- 7. questionnaireAnswersV3 (Onda 3, se aplicável)
DELETE FROM questionnaireAnswersV3 WHERE project_id IN ( /* ... */ );

-- 8. projects (último)
DELETE FROM projects WHERE id IN ( /* ... */ );
```

⚠️ **RAG INTOCADO** — nenhum DELETE em `ragDocuments`, `risk_categories`, `solaris_questions`. Regra explícita do P.O.

### Q-CLN-3 — Verificação pós-cleanup

```sql
-- Nenhum dos IDs deletados deve aparecer em qualquer tabela:
SELECT 'projects' tab, COUNT(*) n FROM projects WHERE id IN ( /* lista */ )
UNION ALL SELECT 'solaris_answers', COUNT(*) FROM solaris_answers WHERE project_id IN ( /* lista */ )
UNION ALL SELECT 'project_gaps_v3', COUNT(*) FROM project_gaps_v3 WHERE project_id IN ( /* lista */ )
UNION ALL SELECT 'risks_v4', COUNT(*) FROM risks_v4 WHERE project_id IN ( /* lista */ )
UNION ALL SELECT 'action_plans', COUNT(*) FROM action_plans WHERE project_id IN ( /* lista */ )
UNION ALL SELECT 'ragDocuments_intocado', COUNT(*) FROM ragDocuments;
```

**Esperado:** zero em todas as linhas exceto `ragDocuments_intocado` (deve ser igual ao valor pré-cleanup).

---

## 4. Queries de DoD pós-fix (após F1+F2 mergeados e deployados)

### Q-DOD-1 — Gerar projeto de teste com cada combinação

Manus cria 1 projeto novo e usa a UI para preencher 15 perguntas SOL (uma por linha da matriz da seção 6.4 do AS-IS). Após `completeOnda1`:

```sql
-- Para cada combinação esperada (linhas 1-15 da matriz):
SELECT sa.codigo, sa.resposta_opcao, LENGTH(sa.resposta) AS rlen,
       (SELECT COUNT(*) FROM project_gaps_v3 g
        WHERE g.project_id = sa.project_id AND g.source = 'solaris'
          AND g.question_id = sa.question_id) AS gaps_gerados
FROM solaris_answers sa
WHERE sa.project_id = <id-projeto-teste>
ORDER BY sa.codigo;
```

**Asserts esperados:**

| `resposta_opcao` | `rlen` | `gaps_gerados` esperado |
|---|---|---|
| `sim` | 0 ou >0 | **0** (sem gap) |
| `nao` | 0 ou >0 | **≥1** (gap por tópico) |
| `nao_sei` | 0 ou >0 | **≥1** (conservador) |
| `nao_se_aplica` | 0 ou >0 | **0** (sem gap) |

### Q-DOD-2 — Confirmar que `resposta_opcao` aparece no SELECT do analyzer

Após deploy, em qualquer projeto novo:

```sql
SELECT EXISTS (
  SELECT 1 FROM solaris_answers sa
  WHERE sa.resposta_opcao IS NOT NULL
    AND sa.project_id = <id-projeto-teste>
) AS analyzer_recebeu_opcao;
```

Combinado com log do servidor: `tail -f` no log do backend deve mostrar `[G17] analyzeSolarisAnswers iniciado` SEM erro de "column not found" — confirma que o `SELECT` novo bate o schema.

### Q-DOD-3 — Regressão zero

```sql
-- Projetos pré-PR-C (resposta_opcao NULL) devem manter comportamento legado
SELECT
  (SELECT COUNT(*) FROM project_gaps_v3 WHERE source = 'solaris') AS total_gaps_solaris,
  (SELECT COUNT(*) FROM solaris_answers WHERE resposta_opcao IS NULL AND TRIM(LOWER(resposta)) LIKE 'não%') AS texto_negativo_legado;
-- Esperado: total_gaps_solaris >= texto_negativo_legado (legado preservado, novos casos adicionados)
```

---

## 5. Riscos do banco

| Risco | Mitigação |
|---|---|
| DELETE em ordem errada → FK violation | Q-CLN-2 segue ordem de dependência (tasks → plans → risks → gaps → answers → projects) |
| Excluir RAG por engano | Não há cláusula `DELETE FROM ragDocuments` no documento (proibida explicitamente) |
| `resposta_opcao` column missing em algum ambiente | Migration `0120` já em main `cd221064` — confirmar `SHOW COLUMNS FROM solaris_answers LIKE 'resposta_opcao'` antes do deploy do F1 |
| Reanálise pós-fix gera duplicatas | G17 já é idempotente (`solaris-gap-analyzer.ts:88-90` DELETE source='solaris' antes de INSERT) |

---

## 6. Não escopo deste DB-SPEC

- Migration nova: **NÃO** — coluna já existe
- Backfill via script TypeScript: **NÃO** — cleanup direto (P.O. autorizou)
- Mudança em `iagen_answers` schema (paridade): **NÃO** — sprint M3.9 futura
- Mudança em `risk_categories` ou `solaris_questions`: **NÃO** — out of scope

---

## Vinculações

- AS-IS-TO-BE principal: `AS-IS-TO-BE-SOLARIS-GAP-CLASSIFICACAO-20260601.md`
- Migration original: `drizzle/0120_sol_resposta_opcao.sql` (PR #1316)
- REGRA-ORQ-31 (meta 98%) — DoD comprova cobertura
- REGRA-ORQ-34 Protocolo 3 (DoD com critério NEGATIVO) — Q-DOD-3 cobre
