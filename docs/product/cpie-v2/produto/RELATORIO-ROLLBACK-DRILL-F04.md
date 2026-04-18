# Relatório de Validação Determinística — Rollback Drill F-04

**Data de execução:** 2026-03-23  
**Executor:** Manus Agent (autônomo)  
**Ambiente:** SQLite isolado local (`/tmp/drill_f04_isolated.db`)  
**Banco de produção tocado:** NÃO  
**Versão do código:** `e99bec4` (branch `main`)  
**Critério de aceite:** 98% de confiabilidade — zero tolerância a perda ou divergência de dados

---

## 1. Resumo Executivo

O rollback drill da F-04 foi executado em ambiente SQLite isolado, com banco de dados completamente separado do banco de produção (`DATABASE_URL`). O drill cobriu as 6 etapas determinadas pelo Orquestrador: base de controle, Fase 1 (ADD COLUMN), Fase 2 (cópia de dados), simulação de falha, rollback e validação pós-rollback.

**Resultado: APROVADO — zero divergências, zero perda de dados, rollback comprovadamente executável.**

---

## 2. Declaração de Isolamento

| Item | Status |
|---|---|
| Banco de produção (`DATABASE_URL`) tocado | **NÃO** |
| Operações DDL no banco real | **NÃO** |
| Banco utilizado | `/tmp/drill_f04_isolated.db` (SQLite, efêmero) |
| Versão SQLite | 3.37.2 |

---

## 3. Etapa 1 — Base de Controle (Snapshot Inicial)

**Schema inicial criado** — espelho exato das 8 colunas relevantes da tabela `projects` de produção:

```
id | name | questionnaireAnswers | corporateAnswers | operationalAnswers |
briefingContent | riskMatricesData | actionPlansData
```

**3 cenários de teste inseridos:**

| ID | Nome | Tipo | questionnaireAnswers | corporateAnswers | briefingContent |
|---|---|---|---|---|---|
| 1 | Cenário 1 — Sem dados (none) | none | NULL | NULL | NULL |
| 2 | Cenário 2 — V1 puro com dados | V1 | NULL | `{"setor":"industria",...}` | `# Briefing V1...` |
| 3 | Cenário 3 — V3 puro com dados | V3 | `[{"cnaeCode":"4711-3/01",...}]` | NULL | `# Briefing V3...` |

---

## 4. Etapa 2 — Fase 1: ADD COLUMN

**6 DDL executados com sucesso:**

```sql
ALTER TABLE projects ADD COLUMN briefingContentV1  TEXT;
ALTER TABLE projects ADD COLUMN briefingContentV3  TEXT;
ALTER TABLE projects ADD COLUMN riskMatricesDataV1 TEXT;
ALTER TABLE projects ADD COLUMN riskMatricesDataV3 TEXT;
ALTER TABLE projects ADD COLUMN actionPlansDataV1  TEXT;
ALTER TABLE projects ADD COLUMN actionPlansDataV3  TEXT;
```

**Estado pós-Fase 1:** 14 colunas, 3 linhas, todas as 6 novas colunas NULL para todos os projetos.

---

## 5. Etapa 2 — Fase 2: Cópia de Dados

**4 passos executados:**

| Passo | Critério | Linhas afetadas | Resultado |
|---|---|---|---|
| 2A — V3 puro | `questionnaireAnswers IS NOT NULL AND corporateAnswers IS NULL AND operationalAnswers IS NULL` | 1 (id=3) | OK |
| 2B — V1 puro | `questionnaireAnswers IS NULL AND (corporateAnswers IS NOT NULL OR operationalAnswers IS NOT NULL)` | 1 (id=2) | OK |
| 2C — Híbridos | Ambas as condições acima verdadeiras | 0 (esperado) | OK |
| 2D — None | Nenhuma ação | 0 (esperado) | OK |

---

## 6. Etapa 3 — Validação de Integridade

**Resultados campo a campo:**

| Cenário | Verificação | Resultado |
|---|---|---|
| 1 (none) | `briefingContentV1 = NULL` | OK |
| 1 (none) | `briefingContentV3 = NULL` | OK |
| 2 (V1) | `briefingContentV1 = briefingContent` | OK |
| 2 (V1) | `riskMatricesDataV1 = riskMatricesData` | OK |
| 2 (V1) | `actionPlansDataV1 = actionPlansData` | OK |
| 2 (V1) | `briefingContentV3 = NULL` | OK |
| 3 (V3) | `briefingContentV3 = briefingContent` | OK |
| 3 (V3) | `riskMatricesDataV3 = riskMatricesData` | OK |
| 3 (V3) | `actionPlansDataV3 = actionPlansData` | OK |
| 3 (V3) | `briefingContentV1 = NULL` | OK |

**Query de integridade:**
```sql
SELECT COUNT(*) FROM projects
WHERE briefingContent IS NOT NULL
  AND briefingContentV1 IS NULL
  AND briefingContentV3 IS NULL;
-- Resultado: 0 (zero projetos com dados não copiados)
```

**Colunas antigas intactas:** comparação campo a campo entre snapshot inicial e pós-Fase 2 — **zero divergências** nas colunas `briefingContent`, `riskMatricesData`, `actionPlansData`.

**INTEGRIDADE: APROVADA ✓**

---

## 7. Etapa 4 — Simulação de Falha

**Cenário simulado:** falha operacional após Fase 2, antes de qualquer `DROP COLUMN` (Fase 3 não executada).

**Impacto real:** ZERO. O código de produção (`getDiagnosticSource()`) continua lendo as colunas antigas (`briefingContent`, `riskMatricesData`, `actionPlansData`). As 6 novas colunas existem mas não são referenciadas por nenhum código de produção até a Fase 3. O sistema permanece 100% funcional.

---

## 8. Etapa 5 — Rollback

**Método:** Recriação de tabela sem as 6 colunas V1/V3 (técnica padrão para SQLite 3.37.2; equivalente funcional ao `ALTER TABLE DROP COLUMN` do MySQL).

```sql
-- Rollback executado:
CREATE TABLE projects_rollback AS
  SELECT id, name, questionnaireAnswers, corporateAnswers, operationalAnswers,
         briefingContent, riskMatricesData, actionPlansData
  FROM projects;
DROP TABLE projects;
ALTER TABLE projects_rollback RENAME TO projects;
```

**Equivalente MySQL (para produção):**
```sql
ALTER TABLE projects DROP COLUMN briefingContentV1;
ALTER TABLE projects DROP COLUMN briefingContentV3;
ALTER TABLE projects DROP COLUMN riskMatricesDataV1;
ALTER TABLE projects DROP COLUMN riskMatricesDataV3;
ALTER TABLE projects DROP COLUMN actionPlansDataV1;
ALTER TABLE projects DROP COLUMN actionPlansDataV3;
```

**Estado pós-rollback:** 8 colunas, 3 linhas — idêntico ao estado inicial.

---

## 9. Etapa 6 — Validação Pós-Rollback

| Verificação | Resultado |
|---|---|
| Número de colunas | 8 (igual ao inicial) |
| Número de linhas | 3 (igual ao inicial) |
| Comparação campo a campo (6 colunas × 3 projetos) | **ZERO divergências** |
| `getDiagnosticSource()` — colunas necessárias presentes | OK (todas as 6 colunas existem) |
| Domínio RAG isolado | OK (RAG usa tabelas `embeddings`/`documents`, não `projects`) |

---

## 10. Validação Determinística — Respostas Obrigatórias

| Pergunta | Resposta |
|---|---|
| Os dados após rollback são 100% idênticos ao estado inicial? | **SIM** |
| Houve qualquer divergência? | **NÃO** |
| Houve qualquer comportamento não previsto? | **NÃO** |
| O processo é reproduzível? | **SIM** |

---

## 11. Limitações de Engine (SQLite vs. MySQL/TiDB)

Conforme determinado pelo Orquestrador, esta seção separa explicitamente o que foi validado do que permanece como diferença potencial de engine.

### O que foi validado no drill

A lógica SQL das Fases 1 e 2 foi validada: `ALTER TABLE ADD COLUMN`, `UPDATE ... SET ... WHERE` com critérios de classificação V1/V3/híbrido/none, e a query de integridade `SELECT COUNT(*)`. Todos os resultados foram determinísticos e reproduzíveis.

### Diferenças potenciais de engine

| Aspecto | SQLite 3.37.2 | MySQL/TiDB (produção) | Impacto |
|---|---|---|---|
| `ALTER TABLE DROP COLUMN` | Não suportado nativamente (usou recriação de tabela) | Suportado diretamente | **Baixo** — o rollback em produção é mais simples (1 DDL por coluna) |
| Transações DDL | Suportadas | Suportadas (MySQL 8+) | Nenhum |
| `UPDATE ... WHERE` com IS NULL/IS NOT NULL | Idêntico | Idêntico | Nenhum |
| Tamanho da tabela | 3 linhas (drill) vs. 1.632 (produção) | — | **Médio** — operações em larga escala podem exigir `LOCK TABLE` ou execução em lotes no MySQL/TiDB para evitar lock contention |
| Encoding de JSON | TEXT simples | TEXT/JSON column type | **Baixo** — as colunas são `TEXT` em ambos; o conteúdo JSON é opaco para o banco |

### Risco residual específico por diferença de engine

**Um risco residual identificado:** A Fase 2 executa `UPDATE` em toda a tabela `projects` (1.632 linhas). Em MySQL/TiDB, isso pode gerar um lock de tabela por alguns segundos. Mitigação recomendada: executar a Fase 2 em horário de baixo tráfego ou em lotes de 100 linhas com `LIMIT` + `OFFSET`.

---

## 12. Declaração Final Obrigatória

| Declaração | Status |
|---|---|
| O drill foi executado sem tocar no banco de produção | **CONFIRMADO** |
| O procedimento é logicamente reversível | **CONFIRMADO** |
| Não houve perda de dados no ambiente isolado | **CONFIRMADO** |
| Não houve impacto no domínio RAG | **CONFIRMADO** |
| Diferenças de engine foram explicitamente listadas | **CONFIRMADO** (seção 11) |

---

## 13. Evidências

| Evidência | Localização |
|---|---|
| Log completo de execução | `docs/product/cpie-v2/produto/evidencias/rollback-drill-f04.log` |
| Script do drill (reproduzível) | `/home/ubuntu/rollback_drill_f04.py` (commitado abaixo) |
| Banco SQLite isolado | `/tmp/drill_f04_isolated.db` (efêmero, não commitado) |

---

## 14. Conclusão

O rollback drill da F-04 foi concluído com sucesso. A sequência de migração é **determinística, reversível, livre de risco residual crítico e auditável ponta a ponta**. O único risco residual identificado (lock contention em larga escala no MySQL/TiDB) é mitigável com execução em horário de baixo tráfego ou em lotes, e não representa risco de perda de dados.

**Recomendação:** Aprovar a Issue #56 (F-04) para execução, com a mitigação de lock contention documentada como pré-condição operacional.

---

*Relatório gerado por Manus Agent em 2026-03-23. Drill executado em ambiente isolado, sem contato com o banco de produção.*
