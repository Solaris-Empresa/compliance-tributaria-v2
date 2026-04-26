# Gold Set — Especificação de Arquétipos de Negócio
## Versão: v1.0 · Rodada 3.1
## Data: 2026-04-25 · Autor: Manus (IA SOLARIS Implementador Técnico)

---

**Status:** DRAFT_FOR_PO_APPROVAL
**Propósito:** Definir o conjunto de arquétipos canônicos de negócio (Gold Set) que servirão como
casos de referência para validação contínua do pipeline M1 → RAG → Gaps → Riscos.
**Aprovação necessária:** P.O. (Uires Tapajós) + Orquestrador (Claude) para ratificação dos
arquétipos e dos critérios de aceitação.
**Uso proibido:** Não usar como dados de treinamento sem aprovação explícita do P.O.

---

## 1. Objetivo e Escopo

O Gold Set é um conjunto de **casos de teste canônicos** que cobrem os principais arquétipos de
negócio presentes na base de projetos da IA SOLARIS. Cada arquétipo representa uma combinação
típica de setor econômico, regime tributário, papel na cadeia e tipo de relação comercial.

O Gold Set serve para:

1. **Validação de regressão:** garantir que novas versões do runner M1, do corpus RAG e do
   briefingEngine não degradem a qualidade dos relatórios para os arquétipos canônicos.
2. **Benchmark de qualidade:** medir o IQS (Input Quality Score) por arquétipo e identificar
   setores que precisam de correção de corpus ou dataset.
3. **Critério de aceite de PR:** todo PR que altere runner, corpus ou dataset deve passar no
   Gold Set antes de ser mergeado.

---

## 2. Estrutura JSON de um Arquétipo Gold Set

Cada arquétipo do Gold Set é definido por um objeto JSON com os seguintes campos:

```json
{
  "archetype_id": "GS-001",
  "familia": "agropecuario",
  "nome_caso": "Produtor Rural Soja Cerrado",
  "descricao": "Produtor rural PJ, soja em grão, Lucro Presumido, B2B nacional",
  "seed": {
    "cnae_principal": "0115-6/00",
    "ncm_principal": "1201.90.00",
    "natureza_operacao_principal": ["Produção própria", "Comércio"],
    "posicao_na_cadeia_economica": "Produtor",
    "tipo_de_relacao": ["B2B"],
    "territorio": "Nacional",
    "regime_tributario_atual": "Lucro Presumido"
  },
  "criterios_aceite": {
    "status_arquetipo": "confirmado",
    "score_confianca_min": 70,
    "hard_block_count_max": 0,
    "lc_conflict_count_max": 0,
    "precision_at_5_min": 0.75,
    "riscos_indevidos_max": 0,
    "iqs_min": 0.75
  },
  "artigos_esperados_no_rag": [
    "LC 214 Art. 128 I",
    "LC 214 Art. 138",
    "LC 214 Art. 163",
    "LC 214 Art. 164",
    "LC 214 Art. 165",
    "LC 214 Art. 168"
  ],
  "riscos_indevidos_conhecidos": [
    "IS sobre soja in natura (não incide — Art. 1º LC 227)"
  ],
  "status": "ACTIVE",
  "log_referencia": "m1_runner_logs ID 12",
  "data_criacao": "2026-04-25",
  "versao_runner": "v3"
}
```

### 2.1 Campos Obrigatórios

| Campo | Tipo | Descrição |
|---|---|---|
| `archetype_id` | `string` | Identificador único no formato `GS-NNN` |
| `familia` | `enum` | Uma das 6 famílias definidas na Seção 3 |
| `nome_caso` | `string` | Nome descritivo do caso |
| `descricao` | `string` | Descrição em uma linha do arquétipo |
| `seed` | `object` | Seed completa para o runner M1 |
| `criterios_aceite` | `object` | Critérios mínimos para PASS no Gold Set |
| `artigos_esperados_no_rag` | `array<string>` | Artigos que devem aparecer no top-10 do RAG |
| `riscos_indevidos_conhecidos` | `array<string>` | Riscos que NÃO devem ser gerados |
| `status` | `enum` | `ACTIVE`, `DRAFT`, `DEPRECATED` |
| `log_referencia` | `string` | ID do log de referência no banco |
| `data_criacao` | `date` | Data de criação do arquétipo |
| `versao_runner` | `string` | Versão do runner M1 usada na criação |

---

## 3. Famílias de Arquétipos

### Família 1 — Agropecuário (`agropecuario`)

**CNAE principal:** 01xx, 02xx, 03xx
**Legislação central:** LC 214 Art. 128 I, Art. 138, Art. 163–168
**Característica distintiva:** Regime especial de produtor rural, crédito presumido, alíquota zero
para cesta básica, NCMs de commodities agrícolas.

| ID | Nome do Caso | CNAE | NCM | Regime | Papel | Status |
|---|---|---|---|---|---|---|
| GS-001 | Produtor Rural Soja Cerrado | 0115-6/00 | 1201.90.00 | Lucro Presumido | Produtor | **ACTIVE** |
| GS-002 | Frigorífico Bovino Mato Grosso | 1012-1/03 | 0201.10.00 | Lucro Real | Produtor/fabricante | DRAFT |
| GS-003 | Cooperativa Citricultura SP | 0131-8/00 | 0805.10.00 | Simples Nacional | Produtor | DRAFT |
| GS-004 | Agroindústria Cana-de-Açúcar | 1071-6/00 | 1701.14.00 | Lucro Real | Produtor/fabricante | DRAFT |

**Volume mínimo:** 4 casos (1 ACTIVE + 3 DRAFT para validação progressiva)
**Critério de aceite padrão:** `score_confianca_min = 70`, `precision@5_min = 0.75`
**Artigos obrigatórios no RAG:** Art. 128 I, Art. 138, Art. 163–168 da LC 214

---

### Família 2 — Indústria e Manufatura (`industria`)

**CNAE principal:** 10xx–33xx
**Legislação central:** LC 214 Art. 9–15 (regime geral IBS/CBS), Art. 26–28 (créditos), Art. 100–115
**Característica distintiva:** Regime geral de IBS/CBS, créditos de insumos, substituição tributária
para setores específicos (combustíveis, bebidas, cigarros).

| ID | Nome do Caso | CNAE | NCM | Regime | Papel | Status |
|---|---|---|---|---|---|---|
| GS-005 | Indústria Metalúrgica SP | 2512-8/00 | 7308.90.10 | Lucro Real | Produtor/fabricante | DRAFT |
| GS-006 | Fabricante Embalagens Plásticas | 2222-6/00 | 3923.10.00 | Lucro Presumido | Produtor/fabricante | DRAFT |
| GS-007 | Indústria Farmacêutica | 2121-1/01 | 3004.90.99 | Lucro Real | Produtor/fabricante | DRAFT |
| GS-008 | Fabricante Bebidas (Cerveja) | 1113-5/01 | 2203.00.00 | Lucro Real | Produtor/fabricante | DRAFT |

**Volume mínimo:** 4 casos (todos DRAFT — aguardam validação após corpus P0)
**Critério de aceite padrão:** `score_confianca_min = 80`, `precision@5_min = 0.80`
**Artigos obrigatórios no RAG:** Art. 9–15, Art. 26–28 da LC 214

---

### Família 3 — Serviços e Saúde (`servicos_saude`)

**CNAE principal:** 86xx–88xx (saúde), 85xx (educação), 90xx–93xx (cultura/entretenimento)
**Legislação central:** LC 214 Art. 233–243 (regime saúde), EC 132 Art. 153 VIII (IS), LC 116/2003
**Característica distintiva:** Regime específico de saúde, imunidade de IS, regras de ISS/IBS
para serviços.

| ID | Nome do Caso | CNAE | NCM | Regime | Papel | Status |
|---|---|---|---|---|---|---|
| GS-009 | Hospital Privado São Paulo | 8610-1/01 | N/A | Lucro Real | Prestador de servico | DRAFT |
| GS-010 | Clínica Odontológica | 8630-5/04 | N/A | Simples Nacional | Prestador de servico | DRAFT |
| GS-011 | Laboratório de Análises Clínicas | 8640-2/02 | N/A | Lucro Presumido | Prestador de servico | DRAFT |
| GS-012 | Escola de Educação Básica | 8511-2/00 | N/A | Simples Nacional | Prestador de servico | DRAFT |

**Volume mínimo:** 4 casos (todos DRAFT — aguardam correção corpus P1)
**Critério de aceite padrão:** `score_confianca_min = 80`, `precision@5_min = 0.75`
**Artigos obrigatórios no RAG:** Art. 233–243 da LC 214, Art. 153 VIII da EC 132

---

### Família 4 — Combustíveis e Energia (`combustiveis_energia`)

**CNAE principal:** 19xx (refino), 35xx (energia), 46.81-8 (distribuição), 47.31-8 (varejo)
**Legislação central:** LC 214 Art. 116–118 (regime monofásico), LC 227 Art. 11–12 (IS combustíveis)
**Característica distintiva:** Regime monofásico de tributação, IS sobre combustíveis fósseis,
substituição tributária na cadeia de distribuição.

| ID | Nome do Caso | CNAE | NCM | Regime | Papel | Status |
|---|---|---|---|---|---|---|
| GS-013 | Transportadora de Combustíveis Perigosos | 4930-2/02 | 2710.19.21 | Lucro Real | Prestador de servico | **ACTIVE** |
| GS-014 | Distribuidora de Combustíveis | 4681-8/01 | 2710.12.59 | Lucro Real | Distribuidor | DRAFT |
| GS-015 | Posto de Combustíveis | 4731-8/00 | 2710.12.59 | Lucro Presumido | Varejista | DRAFT |
| GS-016 | Refinaria de Petróleo | 1921-7/00 | 2709.00.10 | Lucro Real | Produtor/fabricante | DRAFT |

**Volume mínimo:** 4 casos (1 ACTIVE + 3 DRAFT)
**Critério de aceite padrão:** `score_confianca_min = 85`, `precision@5_min = 0.80`
**Artigos obrigatórios no RAG:** Art. 116–118 da LC 214, Art. 11–12 da LC 227

> **Nota:** GS-013 é o caso de referência validado em produção (log ID 1, score=100, PASS).

---

### Família 5 — Comércio e Distribuição (`comercio_distribuicao`)

**CNAE principal:** 45xx–47xx (comércio varejista e atacadista)
**Legislação central:** LC 214 Art. 9–15 (regime geral), Art. 26–28 (créditos), LC 87/96 (ICMS-ST)
**Característica distintiva:** Regime geral de IBS/CBS, ICMS-ST para produtos específicos,
crédito de entrada na cadeia de distribuição.

| ID | Nome do Caso | CNAE | NCM | Regime | Papel | Status |
|---|---|---|---|---|---|---|
| GS-017 | Atacadista de Alimentos | 4639-7/01 | 1905.90.90 | Lucro Presumido | Distribuidor | DRAFT |
| GS-018 | Varejista de Eletrodomésticos | 4753-9/00 | 8516.50.00 | Lucro Real | Varejista | DRAFT |
| GS-019 | E-commerce B2C Vestuário | 4781-4/00 | 6109.10.00 | Simples Nacional | Varejista | DRAFT |
| GS-020 | Importador de Eletrônicos | 4757-1/00 | 8471.30.12 | Lucro Real | Importador | DRAFT |

**Volume mínimo:** 4 casos (todos DRAFT)
**Critério de aceite padrão:** `score_confianca_min = 75`, `precision@5_min = 0.75`
**Artigos obrigatórios no RAG:** Art. 9–15 da LC 214, Art. 13 e 17 da LC 87/96

---

### Família 6 — Serviços Financeiros e Telecom (`financeiro_telecom`)

**CNAE principal:** 61xx (telecom), 64xx–66xx (financeiro)
**Legislação central:** LC 214 Art. 169–184 (financeiro), CG-IBS Art. 7º (telecom), EC 132 Art. 156-A §6º
**Característica distintiva:** Regime específico de serviços financeiros, IS sobre operações
financeiras, regras especiais de IBS/CBS para telecom.

| ID | Nome do Caso | CNAE | NCM | Regime | Papel | Status |
|---|---|---|---|---|---|---|
| GS-021 | Banco Comercial Médio Porte | 6422-1/00 | N/A | Lucro Real | Prestador de servico | DRAFT |
| GS-022 | Fintech de Pagamentos | 6499-3/99 | N/A | Lucro Real | Prestador de servico | DRAFT |
| GS-023 | Operadora de Telecom | 6110-8/01 | N/A | Lucro Real | Prestador de servico | DRAFT |
| GS-024 | Seguradora de Vida | 6511-1/01 | N/A | Lucro Real | Prestador de servico | DRAFT |

**Volume mínimo:** 4 casos (todos DRAFT — corpus financeiro adequado, telecom insuficiente)
**Critério de aceite padrão:** `score_confianca_min = 80`, `precision@5_min = 0.80`
**Artigos obrigatórios no RAG:** Art. 169–184 da LC 214, CG-IBS Art. 7º

---

## 4. Resumo do Gold Set

| Família | Casos Totais | ACTIVE | DRAFT | Prioridade Corpus |
|---|---|---|---|---|
| Agropecuário | 4 | 1 (GS-001) | 3 | **P0** |
| Indústria e Manufatura | 4 | 0 | 4 | P1 |
| Serviços e Saúde | 4 | 0 | 4 | P1 |
| Combustíveis e Energia | 4 | 1 (GS-013) | 3 | **P0** |
| Comércio e Distribuição | 4 | 0 | 4 | P2 |
| Financeiro e Telecom | 4 | 0 | 4 | P2 |
| **Total** | **24** | **2** | **22** | — |

**Volume total:** 24 arquétipos (2 ACTIVE, 22 DRAFT)
**Meta de cobertura:** 24 arquétipos ACTIVE até o final do Sprint M2
**Meta de IQS médio:** ≥ 0.85 para todos os arquétipos ACTIVE

---

## 5. Critérios de Aceitação do Gold Set

### 5.1 Critério de PASS por Arquétipo

Um arquétipo passa no Gold Set quando **todos** os seguintes critérios são atendidos:

| Critério | Valor Mínimo |
|---|---|
| `status_arquetipo` | `confirmado` |
| `score_confianca` | ≥ `criterios_aceite.score_confianca_min` |
| `hard_block_count` | = 0 |
| `lc_conflict_count` | = 0 |
| `precision@5` | ≥ `criterios_aceite.precision_at_5_min` |
| `riscos_indevidos` | = 0 |
| `IQS` | ≥ `criterios_aceite.iqs_min` |

### 5.2 Critério de PASS do Gold Set Completo

O Gold Set é considerado PASS quando:
- 100% dos arquétipos ACTIVE passam individualmente.
- Nenhum arquétipo ACTIVE regride em relação à execução anterior.
- O IQS médio dos arquétipos ACTIVE é ≥ 0.85.

### 5.3 Critério de Regressão

Uma regressão é detectada quando, para qualquer arquétipo ACTIVE:
- `score_confianca` cai mais de 10pp em relação ao log de referência.
- `precision@5` cai mais de 0.10 em relação ao log de referência.
- Um novo `hard_block` aparece que não existia no log de referência.
- Um risco indevido aparece que não existia no log de referência.

---

## 6. Processo de Ativação de Arquétipos (DRAFT → ACTIVE)

Um arquétipo pode ser promovido de DRAFT para ACTIVE quando:

1. A seed é executada no runner M1 e retorna `status_arquetipo = confirmado`.
2. O briefingEngine gera um relatório com IQS ≥ `criterios_aceite.iqs_min`.
3. Os artigos esperados aparecem no top-10 do RAG.
4. Nenhum risco indevido é gerado.
5. O P.O. aprova a promoção explicitamente.

---

## 7. Localização dos Arquivos

Os arquivos JSON dos arquétipos do Gold Set serão armazenados em:

```
docs/data-quality/gold-set/
  GS-001-agropecuario-soja-cerrado.json
  GS-013-combustiveis-transportadora.json
  ...
```

> **Nota:** Os arquivos JSON individuais serão criados após aprovação do P.O. para cada arquétipo.
> Este documento define apenas a especificação e estrutura.

---

## 8. Histórico de Versões

| Versão | Data | Alteração |
|---|---|---|
| v1.0 | 2026-04-25 | Criação inicial — Rodada 3.1 — 6 famílias, 24 arquétipos, estrutura JSON, critérios de aceite |

---

*Documento gerado pelo Implementador Técnico IA SOLARIS · Rodada 3.1 · 2026-04-25*
*NÃO usar como dados de treinamento sem aprovação explícita do P.O.*
