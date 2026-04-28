# Gold Set — Especificação de Arquétipos de Negócio
## Versão: v1.2 · Rodada 3.2 (Prompt 3)
## Data: 2026-04-26 · Autor: Manus (IA SOLARIS Implementador Técnico)

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

## 2. Dois Níveis de Família

A decisão do P.O. (consolidada na Rodada 3.2) é manter **duas dimensões de classificação**
separadas para cada arquétipo, com propósitos distintos:

### 2.1 `familia_setorial` — Agrupamento Amplo (Gestão / Roadmap)

Usado para agrupamento por setor econômico, priorização de roadmap e comunicação com o P.O.
É o nível de granularidade adequado para planejamento de sprints e relatórios executivos.

**Enum `familia_setorial` (7 valores):**

| Valor | Descrição | CNAE Principal |
|---|---|---|
| `agropecuario` | Produção primária, agronegócio, pesca, extrativismo | 01xx, 02xx, 03xx |
| `industria` | Manufatura, transformação, agroindústria | 10xx–33xx |
| `servicos_saude` | Saúde, educação, cultura, entretenimento | 85xx–88xx, 90xx–93xx |
| `combustiveis_energia` | Refino, distribuição e varejo de combustíveis, energia | 19xx, 35xx, 46.81, 47.31 |
| `comercio_distribuicao` | Comércio varejista, atacadista, importação | 45xx–47xx |
| `financeiro_telecom` | Serviços financeiros, seguros, telecom | 61xx, 64xx–66xx |
| `transporte_logistica` | Transporte rodoviário, ferroviário, aéreo, logística | 49xx–53xx |

> **Nota de governança:** A evolução desta lista exige **Change Request** formal, seguindo o
> mesmo padrão dos enums críticos do sistema (`CriticalRiskCategory`, `CentralRequirementType`,
> `FallbackCriticality`). Nenhum valor pode ser adicionado, removido ou renomeado sem aprovação
> explícita do P.O. e do Orquestrador.

---

### 2.2 `archetype_family` — Unidade de Validação Granular

Usado como unidade de validação do Gold Set e como chave de agrupamento para análise de
regressão. É o nível de granularidade adequado para identificar padrões de falha específicos
por tipo de negócio.

**Enum `archetype_family` (6 valores iniciais — extensível por curadoria):**

| Valor | Descrição | `familia_setorial` correspondente |
|---|---|---|
| `agro_produtor_commodity` | Produtor rural ou cooperativa de commodity agrícola | `agropecuario` |
| `combustivel_fabricante_refinaria` | Refinaria ou fabricante de combustíveis | `combustiveis_energia` |
| `transportador_combustiveis` | Transportadora especializada em combustíveis perigosos | `transporte_logistica` |
| `saude_regulada` | Prestador de serviço de saúde regulado (hospital, clínica, laboratório) | `servicos_saude` |
| `servico_financeiro` | Banco, fintech, seguradora ou corretora | `financeiro_telecom` |
| `operadora_regulada_telecom` | Operadora de telecomunicações regulada pela Anatel | `financeiro_telecom` |

> **Nota de governança:** A evolução desta lista também exige **Change Request** formal. Novos
> `archetype_family` podem ser adicionados conforme curadoria do Orquestrador, mas sempre com
> aprovação explícita do P.O. A lista é extensível — outros arquétipos específicos serão
> adicionados conforme cobertura dos 24 casos DRAFT.

---

### 2.3 Diferença de Uso

| Dimensão | Propósito | Granularidade | Quem usa |
|---|---|---|---|
| `familia_setorial` | Agrupamento setorial, roadmap, priorização | Ampla (7 valores) | P.O., Orquestrador |
| `archetype_family` | Unidade de validação, análise de regressão | Granular (6+ valores) | Runner, Gold Set CI |

---

## 3. Estrutura JSON de um Arquétipo Gold Set

Cada arquétipo do Gold Set é definido por um objeto JSON com os seguintes campos:

```json
{
  "archetype_id": "GS-001",
  "familia_setorial": "agropecuario",
  "archetype_family": "agro_produtor_commodity",
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

### 3.1 Campos Obrigatórios

| Campo | Tipo | Descrição |
|---|---|---|
| `archetype_id` | `string` | Identificador único no formato `GS-NNN` |
| `familia_setorial` | `enum` | Uma das 7 famílias setoriais (Seção 2.1) |
| `archetype_family` | `enum` | Uma das 6+ famílias granulares (Seção 2.2) |
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

## 4. Mapeamento dos 24 Casos — Dois Níveis de Família

### Ancoragens Fixas (confirmadas pelo P.O.)

| ID | Nome do Caso | `familia_setorial` | `archetype_family` | Status |
|---|---|---|---|---|
| **GS-001** | Produtor Rural Soja Cerrado | `agropecuario` | `agro_produtor_commodity` | **ACTIVE** ✓ |
| **GS-013** | Transportadora de Combustíveis Perigosos | `transporte_logistica` | `transportador_combustiveis` | **ACTIVE** ✓ |

### Mapeamento Completo dos 24 Casos

| ID | Nome do Caso | `familia_setorial` | `archetype_family` | Status |
|---|---|---|---|---|
| GS-001 | Produtor Rural Soja Cerrado | `agropecuario` | `agro_produtor_commodity` | **ACTIVE** |
| GS-002 | Frigorífico Bovino Mato Grosso | `industria` | *(a definir — agroindústria_processamento)* | DRAFT |
| GS-003 | Cooperativa Citricultura SP | `agropecuario` | `agro_produtor_commodity` | DRAFT |
| GS-004 | Agroindústria Cana-de-Açúcar | `industria` | *(a definir — agroindústria_processamento)* | DRAFT |
| GS-005 | Indústria Metalúrgica SP | `industria` | *(a definir — industria_geral)* | DRAFT |
| GS-006 | Fabricante Embalagens Plásticas | `industria` | *(a definir — industria_geral)* | DRAFT |
| GS-007 | Indústria Farmacêutica | `industria` | *(a definir — industria_regulada)* | DRAFT |
| GS-008 | Fabricante Bebidas (Cerveja) | `industria` | *(a definir — industria_geral)* | DRAFT |
| GS-009 | Hospital Privado São Paulo | `servicos_saude` | `saude_regulada` | DRAFT |
| GS-010 | Clínica Odontológica | `servicos_saude` | `saude_regulada` | DRAFT |
| GS-011 | Laboratório de Análises Clínicas | `servicos_saude` | `saude_regulada` | DRAFT |
| GS-012 | Escola de Educação Básica | `servicos_saude` | *(a definir — educacao_regulada)* | DRAFT |
| GS-013 | Transportadora de Combustíveis Perigosos | `transporte_logistica` | `transportador_combustiveis` | **ACTIVE** |
| GS-014 | Distribuidora de Combustíveis | `combustiveis_energia` | `combustivel_fabricante_refinaria` | DRAFT |
| GS-015 | Posto de Combustíveis | `comercio_distribuicao` | *(a definir — varejo_combustivel)* | DRAFT |
| GS-016 | Refinaria de Petróleo | `combustiveis_energia` | `combustivel_fabricante_refinaria` | DRAFT |
| GS-017 | Atacadista de Alimentos | `comercio_distribuicao` | *(a definir — atacadista_geral)* | DRAFT |
| GS-018 | Varejista de Eletrodomésticos | `comercio_distribuicao` | *(a definir — varejista_geral)* | DRAFT |
| GS-019 | E-commerce B2C Vestuário | `comercio_distribuicao` | *(a definir — varejista_geral)* | DRAFT |
| GS-020 | Importador de Eletrônicos | `comercio_distribuicao` | *(a definir — importador_geral)* | DRAFT |
| GS-021 | Banco Comercial Médio Porte | `financeiro_telecom` | `servico_financeiro` | DRAFT |
| GS-022 | Fintech de Pagamentos | `financeiro_telecom` | `servico_financeiro` | DRAFT |
| GS-023 | Operadora de Telecom | `financeiro_telecom` | `operadora_regulada_telecom` | DRAFT |
| GS-024 | Seguradora de Vida | `financeiro_telecom` | `servico_financeiro` | DRAFT |

> **Nota sobre `archetype_family` marcados como "a definir":** Os 14 casos DRAFT com
> `archetype_family` pendente aguardam curadoria do Orquestrador para definição dos novos
> valores de enum. Cada novo valor exige Change Request conforme Seção 2.2. Os valores
> marcados como "a definir" são sugestões preliminares do Implementador Técnico e não estão
> aprovados.

---

## 5. Famílias por Setor — Tabela Consolidada

### Família Setorial: `agropecuario`

**CNAE principal:** 01xx, 02xx, 03xx
**Legislação central:** LC 214 Art. 128 I, Art. 138, Art. 163–168
**Característica distintiva:** Regime especial de produtor rural, crédito presumido, alíquota zero
para cesta básica, NCMs de commodities agrícolas.

| ID | Nome | CNAE | NCM | Regime | `archetype_family` | Status |
|---|---|---|---|---|---|---|
| GS-001 | Produtor Rural Soja Cerrado | 0115-6/00 | 1201.90.00 | Lucro Presumido | `agro_produtor_commodity` | **ACTIVE** |
| GS-003 | Cooperativa Citricultura SP | 0131-8/00 | 0805.10.00 | Simples Nacional | `agro_produtor_commodity` | DRAFT |

---

### Família Setorial: `industria`

**CNAE principal:** 10xx–33xx
**Legislação central:** LC 214 Art. 9–15, Art. 26–28, Art. 100–115

| ID | Nome | CNAE | NCM | Regime | `archetype_family` | Status |
|---|---|---|---|---|---|---|
| GS-002 | Frigorífico Bovino MT | 1012-1/03 | 0201.10.00 | Lucro Real | *(a definir)* | DRAFT |
| GS-004 | Agroindústria Cana-de-Açúcar | 1071-6/00 | 1701.14.00 | Lucro Real | *(a definir)* | DRAFT |
| GS-005 | Indústria Metalúrgica SP | 2512-8/00 | 7308.90.10 | Lucro Real | *(a definir)* | DRAFT |
| GS-006 | Fabricante Embalagens Plásticas | 2222-6/00 | 3923.10.00 | Lucro Presumido | *(a definir)* | DRAFT |
| GS-007 | Indústria Farmacêutica | 2121-1/01 | 3004.90.99 | Lucro Real | *(a definir)* | DRAFT |
| GS-008 | Fabricante Bebidas (Cerveja) | 1113-5/01 | 2203.00.00 | Lucro Real | *(a definir)* | DRAFT |

---

### Família Setorial: `servicos_saude`

**CNAE principal:** 86xx–88xx, 85xx
**Legislação central:** LC 214 Art. 233–243, EC 132 Art. 153 VIII, LC 116/2003

| ID | Nome | CNAE | NCM | Regime | `archetype_family` | Status |
|---|---|---|---|---|---|---|
| GS-009 | Hospital Privado SP | 8610-1/01 | N/A | Lucro Real | `saude_regulada` | DRAFT |
| GS-010 | Clínica Odontológica | 8630-5/04 | N/A | Simples Nacional | `saude_regulada` | DRAFT |
| GS-011 | Laboratório Análises Clínicas | 8640-2/02 | N/A | Lucro Presumido | `saude_regulada` | DRAFT |
| GS-012 | Escola de Educação Básica | 8511-2/00 | N/A | Simples Nacional | *(a definir)* | DRAFT |

---

### Família Setorial: `combustiveis_energia`

**CNAE principal:** 19xx, 35xx, 46.81-8
**Legislação central:** LC 214 Art. 116–118, LC 227 Art. 11–12

| ID | Nome | CNAE | NCM | Regime | `archetype_family` | Status |
|---|---|---|---|---|---|---|
| GS-014 | Distribuidora de Combustíveis | 4681-8/01 | 2710.12.59 | Lucro Real | `combustivel_fabricante_refinaria` | DRAFT |
| GS-016 | Refinaria de Petróleo | 1921-7/00 | 2709.00.10 | Lucro Real | `combustivel_fabricante_refinaria` | DRAFT |

---

### Família Setorial: `transporte_logistica`

**CNAE principal:** 49xx–53xx
**Legislação central:** LC 214 Art. 9–15, Conv. ICMS aplicáveis

| ID | Nome | CNAE | NCM | Regime | `archetype_family` | Status |
|---|---|---|---|---|---|---|
| GS-013 | Transportadora Combustíveis Perigosos | 4930-2/02 | 2710.19.21 | Lucro Real | `transportador_combustiveis` | **ACTIVE** |

---

### Família Setorial: `comercio_distribuicao`

**CNAE principal:** 45xx–47xx
**Legislação central:** LC 214 Art. 9–15, Art. 26–28, LC 87/96

| ID | Nome | CNAE | NCM | Regime | `archetype_family` | Status |
|---|---|---|---|---|---|---|
| GS-015 | Posto de Combustíveis | 4731-8/00 | 2710.12.59 | Lucro Presumido | *(a definir)* | DRAFT |
| GS-017 | Atacadista de Alimentos | 4639-7/01 | 1905.90.90 | Lucro Presumido | *(a definir)* | DRAFT |
| GS-018 | Varejista de Eletrodomésticos | 4753-9/00 | 8516.50.00 | Lucro Real | *(a definir)* | DRAFT |
| GS-019 | E-commerce B2C Vestuário | 4781-4/00 | 6109.10.00 | Simples Nacional | *(a definir)* | DRAFT |
| GS-020 | Importador de Eletrônicos | 4757-1/00 | 8471.30.12 | Lucro Real | *(a definir)* | DRAFT |

---

### Família Setorial: `financeiro_telecom`

**CNAE principal:** 61xx, 64xx–66xx
**Legislação central:** LC 214 Art. 169–184, CG-IBS Art. 7º, EC 132 Art. 156-A §6º

| ID | Nome | CNAE | NCM | Regime | `archetype_family` | Status |
|---|---|---|---|---|---|---|
| GS-021 | Banco Comercial Médio Porte | 6422-1/00 | N/A | Lucro Real | `servico_financeiro` | DRAFT |
| GS-022 | Fintech de Pagamentos | 6499-3/99 | N/A | Lucro Real | `servico_financeiro` | DRAFT |
| GS-023 | Operadora de Telecom | 6110-8/01 | N/A | Lucro Real | `operadora_regulada_telecom` | DRAFT |
| GS-024 | Seguradora de Vida | 6511-1/01 | N/A | Lucro Real | `servico_financeiro` | DRAFT |

---

## 6. Resumo do Gold Set

| `familia_setorial` | Casos | ACTIVE | DRAFT | `archetype_family` presentes | Prioridade |
|---|---|---|---|---|---|
| `agropecuario` | 2 | 1 (GS-001) | 1 | `agro_produtor_commodity` | **P0** |
| `industria` | 6 | 0 | 6 | *(a definir)* | P1 |
| `servicos_saude` | 4 | 0 | 4 | `saude_regulada`, *(a definir)* | P1 |
| `combustiveis_energia` | 2 | 0 | 2 | `combustivel_fabricante_refinaria` | **P0** |
| `transporte_logistica` | 1 | 1 (GS-013) | 0 | `transportador_combustiveis` | **P0** |
| `comercio_distribuicao` | 5 | 0 | 5 | *(a definir)* | P2 |
| `financeiro_telecom` | 4 | 0 | 4 | `servico_financeiro`, `operadora_regulada_telecom` | P2 |
| **Total** | **24** | **2** | **22** | — | — |

---

## 7. Critérios de Aceitação do Gold Set

### 7.1 Critério de PASS por Arquétipo

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

### 7.2 Critério de PASS do Gold Set Completo

O Gold Set é considerado PASS quando:
- 100% dos arquétipos ACTIVE passam individualmente.
- Nenhum arquétipo ACTIVE regride em relação à execução anterior.
- O IQS médio dos arquétipos ACTIVE é ≥ 0.85.

### 7.3 Critério de Regressão

Uma regressão é detectada quando, para qualquer arquétipo ACTIVE:
- `score_confianca` cai mais de 10pp em relação ao log de referência.
- `precision@5` cai mais de 0.10 em relação ao log de referência.
- Um novo `hard_block` aparece que não existia no log de referência.
- Um risco indevido aparece que não existia no log de referência.

---

## 8. Processo de Ativação de Arquétipos (DRAFT → ACTIVE)

Um arquétipo pode ser promovido de DRAFT para ACTIVE quando:

1. A seed é executada no runner M1 e retorna `status_arquetipo = confirmado`.
2. O briefingEngine gera um relatório com IQS ≥ `criterios_aceite.iqs_min`.
3. Os artigos esperados aparecem no top-10 do RAG.
4. Nenhum risco indevido é gerado.
5. O P.O. aprova a promoção explicitamente.

---

## 9. Localização dos Arquivos

Os arquivos JSON dos arquétipos do Gold Set serão armazenados em:

```
docs/data-quality/gold-set/
  GS-001-agropecuario-soja-cerrado.json
  GS-013-transporte-logistica-combustiveis.json
  ...
```

> **Nota:** Os arquivos JSON individuais serão criados após aprovação do P.O. para cada arquétipo.
> Este documento define apenas a especificação e estrutura.

---

## 10. Histórico de Versões

| Versão | Data | Alteração |
|---|---|---|
| v1.0 | 2026-04-25 | Criação inicial — Rodada 3.1 — 6 famílias, 24 arquétipos, estrutura JSON, critérios de aceite |
| v1.2 | 2026-04-26 | Rodada 3.2 (Prompt 3) — dois níveis de família: `familia_setorial` (7 valores) + `archetype_family` (6 valores iniciais); mapeamento dos 24 casos; nota de governança Change Request; `transporte_logistica` adicionado como 7ª família setorial |

---

*Documento gerado pelo Implementador Técnico IA SOLARIS · Rodada 3.2 · 2026-04-26*
*NÃO usar como dados de treinamento sem aprovação explícita do P.O.*
