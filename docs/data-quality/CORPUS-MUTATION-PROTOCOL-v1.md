# Corpus Mutation Protocol — v1.0
## Rodada 3.1 · Data: 2026-04-25 · Autor: Manus (IA SOLARIS Implementador Técnico)

---

**Status:** DRAFT_FOR_PO_APPROVAL
**Propósito:** Definir o protocolo obrigatório para qualquer mutação no corpus RAG (`ragDocuments`)
ou no dataset Decision Kernel (`ncm-dataset.json`), garantindo rastreabilidade, rollback seguro
e ausência de regressão.
**Aprovação necessária:** P.O. (Uires Tapajós) para ativação do protocolo.
**Vigência:** A partir da aprovação, toda mutação produtiva no corpus ou dataset deve seguir este
protocolo. Mutações sem protocolo são consideradas violações de governança.

---

## 1. Definições

| Termo | Definição |
|---|---|
| **Mutação** | Qualquer `INSERT`, `UPDATE` ou `DELETE` em `ragDocuments`, ou qualquer adição/alteração em `ncm-dataset.json` |
| **Patch** | Conjunto de mutações relacionadas com um objetivo único (ex: correção de `cnaeGroups` para agro) |
| **Snapshot** | Cópia dos registros afetados antes da mutação, armazenada para rollback |
| **Smoke Test** | Conjunto mínimo de queries SQL que validam a integridade do corpus após o patch |
| **Regressão** | Degradação de qualquer métrica do Gold Set após a mutação |
| **Corpus Tag Confidence** | Métrica de qualidade definida em `RAG-CORPUS-AUDIT-SETORIAL-v1.md` |

---

## 2. Tipos de Mutação

### 2.1 Mutação de Corpus RAG (`ragDocuments`)

| Tipo | Descrição | Exemplos |
|---|---|---|
| `CNAE_FIX` | Correção de `cnaeGroups` incorreto | Artigos agro com `cnaeGroups = "64,65,66"` |
| `CNAE_ADD` | Adição de `cnaeGroups` a registro vazio | Conv. ICMS com `cnaeGroups = ""` |
| `CONTENT_FIX` | Correção de conteúdo do artigo | Erro de transcrição, artigo revogado |
| `INGEST_NEW` | Ingestão de novo documento | Nova lei, nova resolução CG-IBS |
| `DEPRECATE` | Marcação de documento como obsoleto | Lei revogada, artigo alterado |

### 2.2 Mutação de Dataset NCM (`ncm-dataset.json`)

| Tipo | Descrição | Exemplos |
|---|---|---|
| `NCM_ADD` | Adição de novo NCM ao dataset | NCM 1201.90.00 (soja em grão) |
| `NCM_PROMOTE` | Promoção de `pending_validation` para `confirmed` | NCM validado juridicamente |
| `NCM_FIX` | Correção de campos de NCM existente | Regime incorreto, alíquota errada |
| `NCM_DEPRECATE` | Marcação de NCM como obsoleto | NCM alterado pela Receita Federal |

---

## 3. Fluxo Obrigatório para Mutação Produtiva

```
1. PROPOSTA → 2. REVISÃO → 3. APROVAÇÃO → 4. SNAPSHOT → 5. EXECUÇÃO → 6. SMOKE TESTS → 7. VALIDAÇÃO GOLD SET → 8. REGISTRO
```

### Passo 1 — Proposta de Mutação

O proponente (Implementador Técnico ou Orquestrador) deve criar um documento de proposta em
`docs/data-quality/` com o nome `<TIPO>-<SETOR>-<DATA>-v1.md`. O documento deve conter:

- Tipo de mutação (ver Seção 2)
- Registros afetados (IDs ou chaves)
- SQL de mutação (dentro de transação)
- SQL de snapshot (pré-mutação)
- SQL de rollback
- Smoke tests
- Impacto esperado no `corpus_tag_confidence`
- Impacto esperado no Gold Set

### Passo 2 — Revisão Técnica

O Orquestrador (Claude) deve revisar a proposta e confirmar:

- A mutação não viola regras jurídicas da Reforma Tributária
- Os artigos afetados são corretamente identificados
- O SQL de rollback é correto e reversível
- O impacto no Gold Set é estimado corretamente

### Passo 3 — Aprovação do P.O.

O P.O. (Uires Tapajós) deve aprovar explicitamente a mutação antes da execução. A aprovação deve
ser registrada no documento de proposta com data e hora.

### Passo 4 — Snapshot Pré-Mutação

Antes de qualquer mutação, executar o SQL de snapshot para preservar o estado anterior:

```sql
-- Exemplo para mutação de corpus agro
CREATE TABLE IF NOT EXISTS ragDocuments_snapshot_20260425_agro AS
SELECT id, cnaeGroups, topicos, lei, artigo, updated_at
FROM ragDocuments
WHERE id IN (148, 178, 179, 213, 214, 39, 944);
```

O snapshot deve ser armazenado com nome único incluindo data e identificador do patch.

### Passo 5 — Execução da Mutação

A mutação deve ser executada dentro de uma transação SQL:

```sql
BEGIN;
-- Mutações aqui
-- Se smoke tests falharem: ROLLBACK
-- Se smoke tests passarem: COMMIT
```

### Passo 6 — Smoke Tests

Após a execução, verificar a integridade com os smoke tests definidos na proposta. Os smoke tests
devem incluir:

1. Verificação de que os registros afetados têm os novos valores
2. Verificação de que nenhum registro não afetado foi alterado
3. Verificação de que o `corpus_tag_confidence` melhorou ou se manteve
4. Verificação de que nenhum setor teve regressão de `corpus_tag_confidence`

Se qualquer smoke test falhar: executar ROLLBACK imediatamente e reportar ao P.O.

### Passo 7 — Validação do Gold Set

Após os smoke tests passarem, executar o Gold Set para os arquétipos ACTIVE afetados pelo setor
da mutação. Verificar ausência de regressão conforme critérios da Seção 5.3 do
`GOLD-SET-ARCHETYPE-SPEC-v1.md`.

Se qualquer arquétipo ACTIVE regredir: executar rollback e reportar ao P.O.

### Passo 8 — Registro

Após validação bem-sucedida, registrar a mutação no log de mutações (Seção 6 deste documento)
com: data, tipo, registros afetados, executor, resultado dos smoke tests, resultado do Gold Set.

---

## 4. SQL Templates

### 4.1 Template de Snapshot (Corpus RAG)

```sql
-- Snapshot pré-patch: salvar estado atual dos registros afetados
INSERT INTO corpus_mutation_log (
  patch_id, record_id, field_name, old_value, new_value, mutation_type, status, created_at
)
SELECT
  '<PATCH_ID>',
  id,
  'cnaeGroups',
  cnaeGroups,
  '<NEW_VALUE>',
  'CNAE_FIX',
  'PENDING',
  NOW()
FROM ragDocuments
WHERE id IN (<ID_LIST>);
```

### 4.2 Template de Mutação (CNAE_FIX)

```sql
BEGIN;

-- Verificar que os registros existem antes de alterar
SELECT COUNT(*) FROM ragDocuments WHERE id IN (<ID_LIST>);
-- Esperado: COUNT = <N>

-- Executar mutação
UPDATE ragDocuments
SET cnaeGroups = '<NEW_VALUE>',
    updated_at = NOW()
WHERE id IN (<ID_LIST>);

-- Verificar resultado
SELECT id, cnaeGroups FROM ragDocuments WHERE id IN (<ID_LIST>);

-- Se correto: COMMIT
-- Se incorreto: ROLLBACK
COMMIT;
```

### 4.3 Template de Rollback (CNAE_FIX)

```sql
BEGIN;

-- Restaurar valores do snapshot
UPDATE ragDocuments rd
JOIN corpus_mutation_log cml ON rd.id = cml.record_id
SET rd.cnaeGroups = cml.old_value,
    rd.updated_at = NOW()
WHERE cml.patch_id = '<PATCH_ID>'
  AND cml.field_name = 'cnaeGroups';

-- Marcar patch como revertido
UPDATE corpus_mutation_log
SET status = 'ROLLED_BACK', rolled_back_at = NOW()
WHERE patch_id = '<PATCH_ID>';

COMMIT;
```

### 4.4 Template de Smoke Test (CNAE_FIX)

```sql
-- Smoke Test 1: Verificar que os registros afetados têm o novo valor
SELECT id, cnaeGroups
FROM ragDocuments
WHERE id IN (<ID_LIST>)
  AND cnaeGroups != '<NEW_VALUE>';
-- Esperado: 0 linhas

-- Smoke Test 2: Verificar que nenhum registro não afetado foi alterado
SELECT COUNT(*)
FROM ragDocuments
WHERE id NOT IN (<ID_LIST>)
  AND cnaeGroups = '<OLD_VALUE>'
  AND lei = '<LEI>';
-- Esperado: COUNT = <N_ORIGINAL>

-- Smoke Test 3: Verificar corpus_tag_confidence do setor afetado
SELECT
  COUNT(*) AS total_artigos_esperados,
  SUM(CASE WHEN cnaeGroups LIKE '%<CNAE_SETOR>%' THEN 1 ELSE 0 END) AS artigos_corretos,
  ROUND(SUM(CASE WHEN cnaeGroups LIKE '%<CNAE_SETOR>%' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS corpus_tag_confidence
FROM ragDocuments
WHERE id IN (<IDS_ARTIGOS_ESPERADOS_SETOR>);
-- Esperado: corpus_tag_confidence >= <VALOR_MINIMO>
```

---

## 5. Schema da Tabela `corpus_mutation_log`

Para rastreabilidade, criar a tabela de log de mutações (se não existir):

```sql
CREATE TABLE IF NOT EXISTS corpus_mutation_log (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  patch_id      VARCHAR(64) NOT NULL,
  record_id     INT NOT NULL,
  field_name    VARCHAR(64) NOT NULL,
  old_value     TEXT,
  new_value     TEXT,
  mutation_type VARCHAR(32) NOT NULL,
  status        ENUM('PENDING', 'COMMITTED', 'ROLLED_BACK') DEFAULT 'PENDING',
  executor      VARCHAR(128),
  created_at    DATETIME DEFAULT NOW(),
  committed_at  DATETIME,
  rolled_back_at DATETIME,
  INDEX idx_patch_id (patch_id),
  INDEX idx_record_id (record_id)
);
```

> **Nota:** A criação desta tabela requer aprovação do P.O. e deve ser executada via `pnpm db:push`
> após adição ao `drizzle/schema.ts`. Esta tabela é de governança e não afeta o pipeline de produção.

---

## 6. Log de Mutações Produtivas

| Patch ID | Data | Tipo | Registros | Executor | Smoke Tests | Gold Set | Status |
|---|---|---|---|---|---|---|---|
| *(nenhuma mutação produtiva executada ainda)* | — | — | — | — | — | — | — |

---

## 7. Patches Pendentes de Aprovação

| Patch ID | Documento de Proposta | Tipo | Registros | Aprovação P.O. | Aprovação Orquestrador |
|---|---|---|---|---|---|
| `PATCH-AGRO-001` | `RAG-CORPUS-QUALITY-PATCH-AGRO-v1.md` | `CNAE_FIX` | 7 registros | **PENDENTE** | **PENDENTE** |
| `NCM-AGRO-001` | `NCM-DATASET-CANDIDATE-AGRO-1201-90-00-v1.md` | `NCM_ADD` | 1 registro | **PENDENTE** | **PENDENTE** |

---

## 8. Regras de Governança

1. **Nenhuma mutação produtiva** pode ser executada sem aprovação explícita do P.O.
2. **Toda mutação** deve ter snapshot, rollback e smoke tests documentados antes da execução.
3. **Toda mutação** deve ser validada contra o Gold Set antes de ser considerada concluída.
4. **Mutações de NCM** requerem aprovação adicional do Orquestrador (validação jurídica).
5. **Mutações de `CONTENT_FIX`** requerem revisão jurídica do Orquestrador antes da aprovação do P.O.
6. **Mutações de `INGEST_NEW`** requerem revisão completa do novo documento pelo Orquestrador.
7. **Rollback automático** deve ser executado se qualquer smoke test falhar, sem exceções.
8. **Regressão no Gold Set** bloqueia o patch — não pode ser mergeado sem investigação e correção.

---

## 9. Histórico de Versões

| Versão | Data | Alteração |
|---|---|---|
| v1.0 | 2026-04-25 | Criação inicial — Rodada 3.1 — protocolo completo com 8 passos, SQL templates, schema de log, regras de governança |

---

*Documento gerado pelo Implementador Técnico IA SOLARIS · Rodada 3.1 · 2026-04-25*
*Protocolo BLOQUEADO para execução até aprovação formal do P.O.*
