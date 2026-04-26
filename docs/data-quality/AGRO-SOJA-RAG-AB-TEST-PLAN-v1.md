# Plano de Teste A/B/C/D — RAG Agro Soja
## Versão: v1.1 · Rodada 3.1
## Data: 2026-04-25 · Autor: Manus (IA SOLARIS Implementador Técnico)
## Caso piloto: Projeto 2001 — Produtor Rural Soja Cerrado Ltda

---

**Status:** NOT_APPROVED_FOR_EXECUTION
**Declaração de piloto:** Este experimento é um **piloto controlado** para o setor agropecuário.
Os resultados não devem ser generalizados para outros setores sem experimento equivalente.
**Aprovação necessária:** P.O. (Uires Tapajós) para execução das Abordagens B e D.
**Aprovação adicional:** Orquestrador (Claude) para execução da Abordagem C (promoção NCM).
**Referência ao protocolo:** `docs/data-quality/CORPUS-MUTATION-PROTOCOL-v1.md`

---

## 1. Objetivo

Medir o impacto incremental de cada correção de qualidade (corpus RAG + dataset NCM + arquétipo M1)
sobre as métricas de precisão, cobertura e confiabilidade dos relatórios de compliance gerados para
o setor agropecuário. O experimento usa o caso Agro Soja como caso de referência e compara quatro
abordagens progressivas.

---

## 2. Seed de Referência (Fixa para Todas as Abordagens)

```json
{
  "project_id": 2001,
  "nome_projeto": "Produtor Rural Soja Cerrado Ltda",
  "cnae_principal": "0115-6/00",
  "ncm_principal": "1201.90.00",
  "natureza_operacao_principal": ["Produção própria", "Comércio"],
  "posicao_na_cadeia_economica": "Produtor",
  "tipo_de_relacao": ["B2B"],
  "territorio": "Nacional",
  "regime_tributario_atual": "Lucro Presumido",
  "user_confirmed": true
}
```

---

## 3. Abordagens do Experimento

### Abordagem A — Baseline (Estado Atual)

**Descrição:** RAG sem correção de corpus nem de dataset. Corpus com `cnaeGroups` incorretos para
artigos agro. NCM 1201.90.00 não mapeado (fallback ativo).

**Pré-condições:**
- `cnaeGroups` dos IDs 148, 178, 179, 213, 214, 39, 944 = valores atuais (incorretos)
- NCM 1201.90.00 não presente no `ncm-dataset.json`
- Arquétipo M1 não utilizado no briefingEngine

**Dados disponíveis:** Log ID 12 do `m1_runner_logs` (score=70, hard_blocks=0, fallback=1).
**Veredito esperado:** `DRAFT_LOW_CONFIDENCE`

---

### Abordagem B — Corpus Corrigido

**Descrição:** RAG com `cnaeGroups` corrigidos para os 7 artigos agro identificados. NCM 1201.90.00
ainda não mapeado (fallback INFO permanece). Arquétipo M1 não utilizado no briefingEngine.

**Pré-condições:**
- Executar SQL do `RAG-CORPUS-QUALITY-PATCH-AGRO-v1.md` (IDs 148, 178, 179, 213, 214, 39, 944)
- NCM 1201.90.00 ainda não presente no `ncm-dataset.json`
- Arquétipo M1 não utilizado no briefingEngine

**Dependência:** Aprovação do P.O. para execução do SQL.
**Veredito esperado:** `DRAFT_LOW_CONFIDENCE` (melhora de retrieval, fallback ainda presente)

---

### Abordagem C — Corpus Corrigido + NCM Validado

**Descrição:** RAG com corpus corrigido E NCM 1201.90.00 promovido para `confirmed` no dataset.
`V-10-FALLBACK` eliminado. Score M1 = 100%. Arquétipo M1 não utilizado no briefingEngine.

**Pré-condições:**
- Abordagem B executada e validada
- NCM 1201.90.00 adicionado ao `ncm-dataset.json` com `status = "confirmed"`
- Checklist jurídico do `NCM-DATASET-CANDIDATE-AGRO-1201-90-00-v1.md` completo
- Aprovação jurídica do Orquestrador (Claude) confirmada

**Dependência:** Aprovação do Orquestrador para promoção do NCM.
**Veredito esperado:** `APPROVABLE`

---

### Abordagem D — Corpus Corrigido + NCM Validado + Arquétipo M1

**Descrição:** Abordagem C com integração do arquétipo M1 confirmado no `briefingEngine`. O
contexto de geração de gaps e riscos recebe explicitamente: `papel_na_cadeia`, `tipo_de_relacao`,
`posicao_na_cadeia_economica`, `score_confianca` e `status_arquetipo`.

**Pré-condições:**
- Abordagem C executada e validada
- `briefingEngine` atualizado para injetar dados do `m1_runner_logs` no contexto do prompt
- Aprovação do P.O. para alteração do `briefingEngine`

**Dependência:** Sprint separado — alteração no `briefingEngine`.
**Veredito esperado:** `APPROVABLE` com melhora de ≥ 10pp em recall vs Abordagem C

---

## 4. Métricas de Avaliação (IQS — Input Quality Score)

### 4.1 Métricas de Retrieval RAG

| Métrica | Definição | Fórmula | Critério de Aceite |
|---|---|---|---|
| **precision@5** | Fração dos top-5 artigos retornados que são relevantes para o setor agro | `artigos_relevantes_top5 / 5` | ≥ 0.80 (Abordagem C) |
| **precision@10** | Fração dos top-10 artigos retornados que são relevantes | `artigos_relevantes_top10 / 10` | ≥ 0.70 (Abordagem C) |
| **recall dos artigos esperados** | Fração dos artigos esperados (Art. 128 I, 138, 163–168) que aparecem no top-10 | `artigos_esperados_no_top10 / 8` | ≥ 0.75 (Abordagem C) |

### 4.2 Métricas de Geração

| Métrica | Definição | Critério de Aceite |
|---|---|---|
| **Requisitos recuperados** | Número de requisitos regulatórios gerados pelo RAG para o caso | ≥ 8 (Abordagem C) |
| **Gaps gerados** | Número de gaps identificados no relatório de compliance | ≥ 6 (Abordagem C) |
| **Riscos gerados** | Número de riscos derivados dos gaps | ≥ 4 (Abordagem C) |
| **Riscos indevidos** | Riscos que não se aplicam ao setor agro (ex: IS sobre soja) | = 0 (Abordagem C) |
| **Riscos sem `source_reference`** | Riscos sem referência legal explícita | = 0 |
| **Riscos sem `anchor_id`** | Riscos sem âncora no corpus | = 0 |
| **Riscos sem `gap_id`** | Riscos sem gap associado | = 0 |

### 4.3 IQS — Input Quality Score (Composto)

O IQS é calculado como a média ponderada das métricas acima:

```
IQS = (0.30 × precision@5)
    + (0.20 × recall_artigos_esperados)
    + (0.20 × (1 - taxa_riscos_indevidos))
    + (0.15 × (1 - taxa_fallback))
    + (0.15 × (score_confianca_M1 / 100))
```

| IQS | Classificação |
|---|---|
| ≥ 0.90 | EXCELENTE |
| 0.75–0.89 | BOM |
| 0.60–0.74 | PARCIAL |
| < 0.60 | INSUFICIENTE |

### 4.4 Vereditos da Matriz

| Veredito | Critério |
|---|---|
| `APPROVABLE` | `score_confianca = 100`, `hard_block_count = 0`, `riscos_indevidos = 0`, `precision@5 ≥ 0.80`, `IQS ≥ 0.85` |
| `DRAFT_LOW_CONFIDENCE` | `score_confianca < 100` ou `fallback_count > 0` ou `precision@5 < 0.60` |
| `BLOCKED_INPUT_QUALITY` | `hard_block_count > 0` ou `missing_field_count > 0` ou `status_arquetipo = inconsistente` |

---

## 5. Resultados Esperados por Abordagem

| Métrica | A (Baseline) | B (Corpus) | C (Corpus+NCM) | D (Corpus+NCM+M1) |
|---|---|---|---|---|
| precision@5 | ~0.40 | ~0.75 | ~0.82 | ~0.90 |
| precision@10 | ~0.35 | ~0.65 | ~0.72 | ~0.85 |
| recall artigos esperados | ~0.45 | ~0.75 | ~0.80 | ~0.90 |
| Requisitos recuperados | ~5 | ~9 | ~10 | ~13 |
| Gaps gerados | ~4 | ~7 | ~8 | ~10 |
| Riscos gerados | ~3 | ~5 | ~6 | ~8 |
| Riscos indevidos | ~3 | ~1 | ~0 | ~0 |
| Riscos sem source_reference | ~2 | ~1 | ~0 | ~0 |
| Taxa de fallback | 50% | 50% | **0%** | 0% |
| Score M1 | 70% | 70% | **100%** | 100% |
| **IQS estimado** | ~0.42 | ~0.67 | **~0.87** | ~0.93 |
| **Veredito da matriz** | `BLOCKED_INPUT_QUALITY` | `DRAFT_LOW_CONFIDENCE` | `APPROVABLE` | `APPROVABLE` |

> **Nota:** Os valores da coluna A são baseados nos logs IDs 9, 10 e 12 (dados reais). Os valores
> das colunas B, C e D são estimativas analíticas baseadas na análise do corpus e do dataset.
> Os valores reais devem ser medidos após execução de cada abordagem.

---

## 6. Procedimento de Execução

### Passo 1 — Registrar Abordagem A (já disponível)

Os dados da Abordagem A estão disponíveis nos logs IDs 9, 10 e 12 do `m1_runner_logs`.
Não requer execução adicional. Registrar IQS calculado com os dados reais do log ID 12.

### Passo 2 — Executar Abordagem B (requer aprovação P.O.)

1. Obter aprovação do P.O. para o SQL do `RAG-CORPUS-QUALITY-PATCH-AGRO-v1.md`.
2. Executar snapshot pré-patch (SQL da Seção 3 do patch).
3. Executar o SQL de correção dos 7 registros dentro de transação.
4. Executar smoke tests (SQL da Seção 6 do patch).
5. Se smoke tests passarem: executar runner M1 para Projeto 2001 com a mesma seed.
6. Registrar: `m1_runner_logs.id`, `score_confianca`, `blockers_json`.
7. Executar o `briefingEngine` para o Projeto 2001.
8. Registrar: requisitos, gaps, riscos, riscos_indevidos, calcular IQS.
9. Se smoke tests falharem: executar rollback SQL e reportar ao P.O.

### Passo 3 — Executar Abordagem C (requer aprovação Orquestrador + P.O.)

1. Completar checklist jurídico do `NCM-DATASET-CANDIDATE-AGRO-1201-90-00-v1.md`.
2. Obter aprovação do Orquestrador para promoção do NCM.
3. Adicionar o registro ao `ncm-dataset.json` com `status = "confirmed"`.
4. Executar runner M1 para Projeto 2001.
5. Verificar: `V-10-FALLBACK` ausente, `score_confianca = 100`.
6. Executar o `briefingEngine` e registrar métricas + IQS.

### Passo 4 — Executar Abordagem D (requer aprovação P.O. — sprint separado)

1. Obter aprovação do P.O. para alteração do `briefingEngine`.
2. Injetar dados do `m1_runner_logs` no contexto do prompt do `briefingEngine`.
3. Executar o `briefingEngine` e registrar métricas + IQS.
4. Comparar com Abordagem C para medir o delta do arquétipo M1.

---

## 7. Critérios de Sucesso do Experimento

O experimento será considerado **PASS** quando:

1. A Abordagem C atingir `veredito = APPROVABLE` (score=100, hard_blocks=0, riscos_indevidos=0, IQS ≥ 0.85).
2. A Abordagem B mostrar melhora ≥ 30pp em `precision@5` em relação à Abordagem A.
3. A Abordagem D mostrar melhora ≥ 10pp em `recall` em relação à Abordagem C.
4. Nenhuma regressão no caso Transportadora de Combustíveis Perigosos (Projeto 2001 original).

O experimento será **PARTIAL** se a Abordagem C atingir `APPROVABLE` mas a Abordagem D não
mostrar melhora significativa (delta < 5pp em qualquer métrica).

O experimento será **FAIL** se a Abordagem C não atingir `APPROVABLE` mesmo após as correções.

---

## 8. Restrições do Piloto

Este experimento é um **piloto controlado** para o setor agropecuário (CNAE 01–03). As seguintes
restrições se aplicam:

1. Os resultados **não devem ser generalizados** para outros setores sem experimento equivalente.
2. A promoção do NCM 1201.90.00 para `confirmed` aplica-se **apenas** a este NCM específico.
3. A correção do corpus agro pode ter efeito colateral no setor financeiro — monitorar.
4. O experimento não autoriza alterações no runner, validateConflicts ou regras C1-C6.
5. Todos os riscos gerados devem ser revisados manualmente antes de qualquer aprovação automática.

---

## 9. Riscos do Experimento

| Risco | Probabilidade | Mitigação |
|---|---|---|
| SQL de corpus causa regressão em outros setores | **BAIXA** | Smoke tests + rollback SQL documentado |
| NCM 1201.90.00 promovido com regime incorreto | **MÉDIA** | Checklist jurídico obrigatório + aprovação Orquestrador |
| Reindexação de embeddings necessária após correção corpus | **MÉDIA** | Verificar se o sistema usa cache de embeddings |
| briefingEngine não usa cnaeGroups no filtro de retrieval | **ALTA** | Verificar implementação do retrieval antes de executar B |
| Generalização indevida para outros setores | **ALTA** | Restrições do piloto documentadas na Seção 8 |

---

## 10. Dependências e Cronograma

| Abordagem | Dependência | Responsável | Estimativa |
|---|---|---|---|
| A | Nenhuma (já disponível) | — | Imediato |
| B | Aprovação SQL corpus | P.O. (Uires Tapajós) | Sprint atual |
| C | Aprovação NCM + validação jurídica | Orquestrador (Claude) + P.O. | Sprint seguinte |
| D | Aprovação alteração briefingEngine | P.O. | Sprint separado |

---

## 11. Histórico de Versões

| Versão | Data | Alteração |
|---|---|---|
| v1.0 | 2026-04-25 | Criação inicial — plano A/B/C/D mapeado |
| v1.1 | 2026-04-25 | Rodada 3.1 — status NOT_APPROVED_FOR_EXECUTION, IQS composto, declaração de piloto, restrições de generalização, smoke tests integrados ao procedimento, vereditos com IQS |

---

*Documento gerado pelo Implementador Técnico IA SOLARIS · Rodada 3.1 · 2026-04-25*
*NÃO executar sem aprovação formal do P.O. e do Orquestrador conforme dependências acima.*
