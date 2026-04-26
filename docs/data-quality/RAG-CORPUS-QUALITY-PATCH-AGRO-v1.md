# RAG Corpus Quality Patch — Setor Agro
## Versão: v1.1 · Rodada 3.1
## Data: 2026-04-25 · Autor: Manus (IA SOLARIS Implementador Técnico)

---

**Status:** NOT_APPROVED_FOR_EXECUTION
**Mutação produtiva:** BLOQUEADA até protocolo aprovado pelo P.O.
**Aprovação necessária:** P.O. (Uires Tapajós) + revisão anti-regressão pelo Orquestrador (Claude)
**Referência ao protocolo:** `docs/data-quality/CORPUS-MUTATION-PROTOCOL-v1.md`

---

## 1. Contexto e Motivação

O caso piloto Agro Soja (Projeto 2001 — Produtor Rural Soja Cerrado Ltda) revelou que artigos
fundamentais da LC 214/2025 para o setor agropecuário estão indexados com `cnaeGroups` incorretos
no corpus RAG. Como o retrieval vetorial usa `cnaeGroups` como filtro de relevância, esses artigos
**não são retornados** quando o contexto contém CNAE `0115-6/00` (Cultivo de soja) ou qualquer
outro CNAE da divisão 01 (Agricultura, pecuária e serviços relacionados).

O impacto direto é a ausência de gaps e riscos críticos relacionados ao regime optativo do produtor
rural (Art. 165), ao crédito presumido (Art. 168) e à alíquota reduzida de insumos agropecuários
(Art. 138) nos relatórios de compliance gerados para o setor agro.

---

## 2. Documentos RAG Afetados

### 2.1 Tabela de Divergências Identificadas

| ID | Lei | Artigo | Tema Jurídico | `cnaeGroups` Atual | `cnaeGroups` Proposto | Severidade |
|---|---|---|---|---|---|---|
| 148 | LC 214/2025 | Art. 110 | Alíquota zero — medicamentos e produtos agropecuários | `64,65,66` | `01,02,03,10,11,12,86,87,88` | **CRÍTICA** |
| 178 | LC 214/2025 | Art. 138 | Alíquota reduzida 60% — insumos agropecuários (parte 1) | `64,65,66` | `01,02,03,10,11,12` | **CRÍTICA** |
| 179 | LC 214/2025 | Art. 138 (parte 2) | Alíquota reduzida 60% — insumos agropecuários (parte 2) | `64,65,66` | `01,02,03,10,11,12` | **CRÍTICA** |
| 213 | LC 214/2025 | Art. 168 | Crédito presumido — regime regular (produtor rural) | `64,65,66` | `01,02,03,10,11,12` | **CRÍTICA** |
| 214 | LC 214/2025 | Art. 168 (parte 2) | Crédito presumido — Simples Nacional (produtor rural) | `64,65,66` | `01,02,03,10,11,12` | **CRÍTICA** |
| 39 | LC 214/2025 | Art. 26 | Não contribuintes IBS/CBS — produtor rural abaixo do limiar | `86,87,88,45,46,47` | `01,02,03,10,11,12,86,87,88` | **ALTA** |
| 944 | LC 227/2025 | Art. 108 | Distribuição de receita IBS — impacto no produtor rural | `64,65,66` | `01,02,03,10,11,12` | **MÉDIA** |

> **Nota:** O Art. 138 (parte 3) — ID 180 — já está correto (`01,02,03,10,11,12,13,14,15,16`). Não requer correção.

### 2.2 Artigos Legitimamente Cross-Sector (NÃO remover de financeiro)

Os artigos abaixo são aplicáveis a múltiplos setores. O patch deve usar `cnaeGroups` **composto**
(multi-CNAE) para preservar a cobertura financeira legítima:

| ID | Artigo | Setores legítimos | `cnaeGroups` composto correto |
|---|---|---|---|
| 148 | Art. 110 | Agro (01–03) + Saúde (86–88) | `01,02,03,10,11,12,86,87,88` |
| 39 | Art. 26 | Agro (01–03) + Saúde (86–88) + Construção (45–47) | `01,02,03,10,11,12,86,87,88,45,46,47` |

**Validação anti-regressão obrigatória:** após o patch, verificar que os IDs 148 e 39 continuam
sendo retornados no retrieval para CNAEs 86xx e 45xx, respectivamente.

### 2.3 Justificativa Jurídica por Artigo

**Art. 110 (ID 148):** Trata da alíquota zero de IBS/CBS para fornecimento e importação de
medicamentos e produtos agropecuários. O `cnaeGroups = "64,65,66"` (serviços financeiros) é
claramente incorreto. O artigo é relevante para CNAE 01xx (produtores rurais que adquirem
insumos) e 86xx (farmácias/hospitais). O `cnaeGroups` correto deve incluir ambos os grupos.

**Art. 138 (IDs 178, 179):** Trata da redução de 60% nas alíquotas de IBS/CBS sobre insumos
agropecuários do Anexo IX da LC 214. É o artigo mais crítico para o setor agro — define o
benefício fiscal central para produtores rurais que adquirem sementes, fertilizantes, defensivos
e outros insumos. O `cnaeGroups = "64,65,66"` é um erro de indexação grave.

**Art. 168 (IDs 213, 214):** Trata do crédito presumido de IBS/CBS para contribuintes do regime
regular e do Simples Nacional que sejam produtores rurais. É o mecanismo de compensação pelo
pagamento de insumos tributados. O `cnaeGroups = "64,65,66"` impede que esse benefício seja
identificado no RAG para qualquer empresa do setor agro.

**Art. 26 (ID 39):** Define que produtores rurais com receita abaixo de R$ 3,6M não são
contribuintes obrigatórios de IBS/CBS. O `cnaeGroups = "86,87,88,45,46,47"` (saúde e construção)
não inclui o grupo 01 (agricultura), que é o principal destinatário do artigo.

**Art. 108 LC 227 (ID 944):** Trata da distribuição de receita do IBS entre entes federativos,
com impacto na apuração do produtor rural. O `cnaeGroups = "64,65,66"` é incorreto.

---

## 3. SQL de Snapshot Pré-Patch (EXECUTAR ANTES DE QUALQUER MUTAÇÃO)

```sql
-- Snapshot pré-patch: salvar estado atual dos 7 registros afetados
-- OBRIGATÓRIO: executar em staging ANTES do patch e guardar resultado como evidência.
-- Salvar como: snapshot-pre-patch-ragDocuments-YYYYMMDD.json

SELECT
  id,
  title,
  "cnaeGroups",
  "leiId",
  "artigo",
  "topicTags",
  "createdAt",
  "updatedAt"
FROM "ragDocuments"
WHERE id IN (39, 148, 178, 179, 213, 214, 944)
ORDER BY id;
```

---

## 4. SQL de Aplicação do Patch (NÃO EXECUTAR SEM APROVAÇÃO)

```sql
-- ============================================================
-- PATCH: RAG-CORPUS-QUALITY-PATCH-AGRO-v1.1
-- Status: NOT_APPROVED_FOR_EXECUTION
-- Aprovação necessária: P.O. + Orquestrador (anti-regressão)
-- Executar APENAS após snapshot pré-patch salvo
-- ============================================================

BEGIN;

-- Correção 1: Art. 138 (partes 1 e 2) — insumos agropecuários
-- Sem cross-sector: apenas agro
UPDATE "ragDocuments"
SET "cnaeGroups" = '01,02,03,10,11,12',
    "updatedAt" = NOW()
WHERE id IN (178, 179);

-- Correção 2: Art. 168 (partes 1 e 2) — crédito presumido produtor rural
-- Sem cross-sector: apenas agro
UPDATE "ragDocuments"
SET "cnaeGroups" = '01,02,03,10,11,12',
    "updatedAt" = NOW()
WHERE id IN (213, 214);

-- Correção 3: Art. 110 — alíquota zero (cross-sector: agro + saúde)
-- PRESERVA cobertura de saúde (86,87,88)
UPDATE "ragDocuments"
SET "cnaeGroups" = '01,02,03,10,11,12,86,87,88',
    "updatedAt" = NOW()
WHERE id = 148;

-- Correção 4: Art. 26 — não contribuintes (cross-sector: agro + saúde + construção)
-- PRESERVA cobertura de saúde e construção
UPDATE "ragDocuments"
SET "cnaeGroups" = '01,02,03,10,11,12,86,87,88,45,46,47',
    "updatedAt" = NOW()
WHERE id = 39;

-- Correção 5: LC 227 Art. 108 — distribuição IBS (apenas agro)
UPDATE "ragDocuments"
SET "cnaeGroups" = '01,02,03,10,11,12',
    "updatedAt" = NOW()
WHERE id = 944;

-- Verificação pós-patch (executar dentro da transação antes do COMMIT)
SELECT id, "cnaeGroups" FROM "ragDocuments"
WHERE id IN (39, 148, 178, 179, 213, 214, 944)
ORDER BY id;
-- Esperado:
-- 39  → 01,02,03,10,11,12,86,87,88,45,46,47
-- 148 → 01,02,03,10,11,12,86,87,88
-- 178 → 01,02,03,10,11,12
-- 179 → 01,02,03,10,11,12
-- 213 → 01,02,03,10,11,12
-- 214 → 01,02,03,10,11,12
-- 944 → 01,02,03,10,11,12

COMMIT;
```

---

## 5. SQL de Rollback (Reverso Documentado)

```sql
-- ============================================================
-- ROLLBACK: RAG-CORPUS-QUALITY-PATCH-AGRO-v1.1
-- Usar apenas se smoke test falhar ou regressão detectada
-- ============================================================

BEGIN;

UPDATE "ragDocuments"
SET "cnaeGroups" = '64,65,66', "updatedAt" = NOW()
WHERE id IN (178, 179, 213, 214, 944);

UPDATE "ragDocuments"
SET "cnaeGroups" = '64,65,66', "updatedAt" = NOW()
WHERE id = 148;

UPDATE "ragDocuments"
SET "cnaeGroups" = '86,87,88,45,46,47', "updatedAt" = NOW()
WHERE id = 39;

-- Verificação pós-rollback
SELECT id, "cnaeGroups" FROM "ragDocuments"
WHERE id IN (39, 148, 178, 179, 213, 214, 944)
ORDER BY id;

COMMIT;
```

---

## 6. Smoke Test em Staging (Pós-Patch)

```sql
-- Teste 1: artigos agro retornam para CNAE 01xx?
SELECT id, title, "cnaeGroups"
FROM "ragDocuments"
WHERE "cnaeGroups" LIKE '%01%'
  AND id IN (39, 148, 178, 179, 213, 214, 944);
-- Esperado: 7 registros

-- Teste 2: artigos financeiros legítimos preservados (não afetados)?
SELECT COUNT(*) AS financeiro_preservado
FROM "ragDocuments"
WHERE "cnaeGroups" LIKE '%64%'
  AND id NOT IN (39, 148, 178, 179, 213, 214, 944);
-- Esperado: mesmo valor que antes do patch

-- Teste 3: nenhum dos 7 registros com tag financeira residual pura?
SELECT id FROM "ragDocuments"
WHERE id IN (178, 179, 213, 214, 944)
  AND "cnaeGroups" LIKE '%64%';
-- Esperado: 0 registros

-- Teste 4: cross-sector preservado para saúde?
SELECT id FROM "ragDocuments"
WHERE id IN (39, 148)
  AND "cnaeGroups" LIKE '%86%';
-- Esperado: 2 registros (IDs 39 e 148)
```

---

## 7. Critérios de Regressão

| Critério | Método | Resultado Esperado |
|---|---|---|
| Artigos agro retornam para CNAE 01xx | Smoke test 1 | 7/7 registros com tag correta |
| Artigos financeiros legítimos preservados | Smoke test 2 | COUNT igual ao pré-patch |
| Sem tag financeira residual nos artigos agro puros | Smoke test 3 | 0 registros |
| Cross-sector saúde preservado | Smoke test 4 | 2/2 registros |
| `precision@5` agro ≥ 0.70 | Plano A/B abordagem B | ≥ 0.70 (baseline: ~0.40) |
| `precision@5` financeiro não regride | Plano A/B setor financeiro | ≥ valor baseline pré-patch |

**O patch deve ser revertido (rollback) se:**
- Smoke test 2 retornar COUNT menor que o pré-patch;
- Smoke test 3 retornar qualquer registro;
- `precision@5` financeiro cair mais de 5pp.

---

## 8. Projetos e Setores Potencialmente Impactados

| Impacto | Tipo | Estimativa |
|---|---|---|
| Projetos com CNAE 01–03 (agro) | Melhora de retrieval | ~8–12% da base ativa |
| Projetos com CNAE 10–12 (agroindústria) | Melhora de retrieval | ~3–5% da base ativa |
| Projetos com CNAE 86–88 (saúde) | Neutro — cross-sector preservado | ~10–15% da base ativa |
| Projetos com CNAE 64–66 (financeiro) | Risco de regressão se smoke test 3 falhar | ~15–20% da base ativa |

---

## 9. Impacto Esperado no Score M1

| Métrica | Antes do Patch | Depois do Patch |
|---|---|---|
| Artigos agro no top-10 RAG | 5 (apenas 163–167) | 8 (+ Art. 110, 138, 168) |
| Gaps gerados para agro | ~14 (sem Art. 138/168) | ~18 (com Art. 138/168) |
| Riscos sem `source_reference` | ~3 | ~0 |
| `precision@5` para CNAE 01xx | ~0.40 | ~0.75 |
| Score M1 (caso Agro Soja) | 70% | 85% (sem NCM) / 100% (com NCM) |

---

## 10. Histórico de Versões

| Versão | Data | Alteração |
|---|---|---|
| v1.0 | 2026-04-25 | Criação inicial — plano de correção mapeado |
| v1.1 | 2026-04-25 | Rodada 3.1 — status NOT_APPROVED_FOR_EXECUTION, snapshot SQL obrigatório, SQL de aplicação com BEGIN/COMMIT, rollback documentado, smoke tests, critérios de regressão, artigos cross-sector tratados com cnaeGroups composto |

---

*Documento gerado pelo Implementador Técnico IA SOLARIS · Rodada 3.1 · 2026-04-25*
*NÃO executar SQL sem aprovação formal do P.O. e revisão anti-regressão do Orquestrador.*
