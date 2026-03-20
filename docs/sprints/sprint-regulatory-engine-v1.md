# SPRINT — REGULATORY ENGINE — FOUNDATION SPRINT v1.0

**Status:** DONE  
**Encerramento:** 2026-03-19  
**Autoridade:** Product Owner Uires Tapajós  
**Repositório:** [utapajos/compliance-tributaria-v2](https://github.com/utapajos/compliance-tributaria-v2)

---

## 1. OBJETIVO

Estruturar a **base canônica regulatória** da Plataforma COMPLIANCE da Reforma Tributária, ingerindo, parseando, classificando e normalizando os textos legais das 4 principais normas da reforma tributária brasileira:

- **LC 214/2025** — Lei Complementar do IBS/CBS/IS (fonte primária)
- **EC 132/2023** — Emenda Constitucional da Reforma Tributária
- **LC 224/2025** — Lei Complementar de transição
- **LC 227/2026** — Lei Complementar complementar

O objetivo central foi criar uma base relacional auditável, com rastreabilidade jurídica completa (Art → § → Inciso → Alínea), classificação normativa precisa e filtro operacional sem falsos positivos.

---

## 2. TASKS CONCLUÍDAS

| Task | Título | Issues GitHub | Status |
|---|---|---|---|
| **TASK 1** | Ingestão e Parsing LC 214/2025 | [#18](https://github.com/utapajos/compliance-tributaria-v2/issues/18) | ✅ DONE |
| **TASK 1.1** | Classificação Normativa e Filtro Operacional | [#19](https://github.com/utapajos/compliance-tributaria-v2/issues/19) | ✅ DONE |
| **TASK 1.2** | Multi-Source Regulatory Expansion | [#20](https://github.com/utapajos/compliance-tributaria-v2/issues/20) | ✅ DONE |
| **TASK 1.3** | Normative Scope & Operational Correction | [#21](https://github.com/utapajos/compliance-tributaria-v2/issues/21) | ✅ DONE |
| **TASK 1.3A** | Evidence Correction & Audit Trail Fix | [#22](https://github.com/utapajos/compliance-tributaria-v2/issues/22) | ✅ DONE |

---

## 3. ARQUITETURA FINAL

### 3.1 Tabelas do Regulatory Engine (banco MySQL/TiDB — mesmo banco da plataforma)

```sql
-- Fontes regulatórias
regulatory_sources (
  source_id        VARCHAR(32) PK,   -- ex: LC214-2025
  name             TEXT,             -- nome oficial da norma
  type             VARCHAR(32),      -- Lei Complementar | Emenda Constitucional
  effective_date   DATE,
  file_hash        VARCHAR(64),      -- SHA256 do PDF original
  pages            INT,
  char_count       INT,
  ingested_at      DATETIME
)

-- Artigos com hierarquia jurídica completa
regulatory_articles (
  article_id       VARCHAR(128) PK,  -- ex: LC214-2025-ART-0011-PAR-003-INC-014
  source_id        VARCHAR(32) FK,
  article_number   VARCHAR(64),      -- ex: Art. 11
  hierarchy_level  VARCHAR(32),      -- artigo | paragrafo | inciso | alinea
  parent_id        VARCHAR(128),     -- FK auto-referencial
  content_text     TEXT,             -- texto literal da norma
  page_number      INT
)

-- Requisitos estruturados (unidade mínima de compliance)
regulatory_requirements (
  requirement_id          VARCHAR(256) PK,
  source_id               VARCHAR(32) FK,
  article_id              VARCHAR(128) FK,
  legal_basis_text        TEXT,           -- texto literal — NÃO alterado
  description             TEXT,           -- descrição estruturada
  operational_description TEXT,           -- descrição acionável (TASK 1.1)
  normative_type          VARCHAR(32),    -- obrigacao|vedacao|direito|definicao|opcao|principio
  normative_scope         VARCHAR(32),    -- contribuinte|ente_federativo|meta_norma|administrativo|sistemico
  is_operational          BOOLEAN,        -- true APENAS SE scope=contribuinte E type in (obrigacao,vedacao,direito)
  status                  VARCHAR(16),    -- active
  created_at              DATETIME
)

-- Coverage reports por fonte e consolidado
coverage_reports (
  report_id               VARCHAR(128) PK,
  source_id               VARCHAR(32),
  version                 VARCHAR(16),
  total_articles          INT,
  articles_with_requirements INT,
  coverage_percentage     DECIMAL(5,2),
  total_requirements      INT,
  operational_requirements INT,
  coverage_operacional    DECIMAL(5,2),
  generated_at            DATETIME,
  metadata                JSON
)
```

### 3.2 Hierarquia de Parsing Jurídico

```
Norma (PDF/HTML)
  └── Artigo (Art. Xº)
        ├── Parágrafo (§ Xº)
        │     ├── Inciso (I, II, III...)
        │     │     └── Alínea (a, b, c...)
        │     └── Alínea (a, b, c...)
        ├── Inciso (I, II, III...)
        │     └── Alínea (a, b, c...)
        └── Alínea (a, b, c...)
```

### 3.3 Regra de Operacionalidade (TASK 1.3)

```python
is_operational = (
    normative_scope == "contribuinte"
    AND normative_type IN ("obrigacao", "vedacao", "direito")
)
```

---

## 4. MÉTRICAS FINAIS

### 4.1 Base Regulatória Consolidada (4 fontes)

| Fonte | Artigos | Requisitos | Operacionais | Coverage |
|---|---|---|---|---|
| LC 214/2025 | 3.676 | 482 | 313 | 45.4% |
| EC 132/2023 | 312 | 71 | 0 | 0% (meta_norma) |
| LC 224/2025 | 114 | 9 | 9 | 100% |
| LC 227/2026 | 1.776 | 255 | 192 | 52.3% |
| **TOTAL** | **5.778** | **817** | **514** | **62.9%** |

### 4.2 Distribuição por `normative_type`

| normative_type | Quantidade | % |
|---|---|---|
| obrigacao | 200 | 24.5% |
| direito | 193 | 23.6% |
| vedacao | 49 | 6.0% |
| definicao | 19 | 2.3% |
| opcao | 18 | 2.2% |
| principio | 3 | 0.4% |
| *(outros — TASK 1.2)* | 335 | 41.0% |
| **Total** | **817** | **100%** |

### 4.3 Distribuição por `normative_scope`

| normative_scope | Quantidade | % | Descrição |
|---|---|---|---|
| **contribuinte** | **556** | **68.1%** | Obrigações/direitos do sujeito passivo |
| ente_federativo | 114 | 14.0% | Normas para Estados, Municípios, União |
| meta_norma | 87 | 10.6% | EC, princípios, delegações de competência |
| administrativo | 49 | 6.0% | Normas para a administração tributária |
| sistemico | 11 | 1.3% | Transição, vigência, revogações |

### 4.4 Operacionalidade

| Métrica | Valor |
|---|---|
| `is_operational = true` (TASK 1.2 — inflado) | 782 |
| `is_operational = true` (TASK 1.3 — real) | **514** |
| Falsos positivos eliminados | **268** |
| Redução de falsos positivos | 34.3% |

---

## 5. PRINCIPAIS APRENDIZADOS

### 5.1 Falso Positivo Eliminado (TASK 1.3)

A regra original de operacionalidade (`is_operational = true` para qualquer `obrigacao|vedacao|direito`) gerava **268 falsos positivos** — normas estruturais (EC 132, princípios, normas para entes federativos) eram incorretamente marcadas como operacionais para o contribuinte.

**Solução:** Introdução do campo `normative_scope` com 5 valores, e redefinição da regra: `is_operational = true` **apenas** quando `scope = contribuinte` E `type ∈ {obrigacao, vedacao, direito}`.

**Impacto:** A EC 132/2023 inteira (71 requisitos) passou de `is_operational=true` para `is_operational=false`, o que é juridicamente correto — emendas constitucionais não geram obrigação direta ao contribuinte.

### 5.2 Multi-Source Estruturado (TASK 1.2)

A expansão para 4 fontes revelou que cada norma tem um perfil de operacionalidade distinto:
- **LC 214/2025:** 45.4% coverage (lei longa com muitas definições e transições)
- **EC 132/2023:** 0% operacional (meta-norma constitucional)
- **LC 224/2025:** 100% operacional (lei curta e focada no contribuinte)
- **LC 227/2026:** 52.3% operacional (lei mista com normas para entes e contribuintes)

### 5.3 Classificação Normativa Consolidada (TASK 1.1 + 1.3)

O modelo de classificação em 2 dimensões (`normative_type` × `normative_scope`) provou ser mais preciso que a classificação unidimensional. A combinação dos dois campos permite filtros precisos para qualquer caso de uso:
- "Quais são as obrigações do contribuinte?" → `scope=contribuinte AND type=obrigacao`
- "Quais são os direitos do contribuinte?" → `scope=contribuinte AND type=direito`
- "Quais normas são para entes federativos?" → `scope=ente_federativo`

### 5.4 Integridade de Evidências (TASK 1.3A)

O audit trail deve ser gerado com rótulos derivados automaticamente dos dados reais do banco (não manualmente), para evitar inconsistências entre `caso`, `article_id` e `requirement_id`. O campo `false_positives_corrected` deve ser calculado como `before - after`, não como delta incremental de execução.

---

## 6. SCRIPTS DO REGULATORY ENGINE

| Script | Descrição |
|---|---|
| `regulatory_engine/regulatory_engine_v1.py` | TASK 1 — Ingestão + parsing + extração |
| `regulatory_engine/task1_1_classification.py` | TASK 1.1 — Classificação normativa |
| `regulatory_engine/task1_2_multisource.py` | TASK 1.2 — Expansão multi-source |
| `regulatory_engine/task1_3_scope_correction.py` | TASK 1.3 — Correção de escopo |
| `regulatory_engine/task1_3a_evidence_fix.py` | TASK 1.3A — Correção documental |

---

## 7. CHECKPOINT FINAL

| Campo | Valor |
|---|---|
| **Checkpoint ID** | `53274580` |
| **Timestamp** | 2026-03-19T22:17:55 |
| **Banco** | TiDB serverless v8.5.3 (mesmo banco da plataforma) |
| **Tabelas criadas** | 4 (regulatory_sources, regulatory_articles, regulatory_requirements, coverage_reports) |
| **Total de registros** | 5.778 artigos + 817 requisitos + 4 fontes + 4 coverage reports |
| **TypeScript** | 0 erros |
| **Issues GitHub** | #18, #19, #20, #21, #22 — todas CLOSED |

---

## 8. PRÓXIMAS SPRINTS SUGERIDAS

| Sprint | Objetivo |
|---|---|
| **TASK 2 — Requirement Mapping** | Mapear os 514 requisitos operacionais para as seções dos questionários (QC, QO, QCNAE) |
| **TASK 3 — Gap Analysis** | Identificar artigos sem cobertura (54.6% da LC 214) e expandir o parser |
| **TASK 4 — Briefing Generator** | Usar os requisitos operacionais para gerar o briefing jurídico automaticamente |
| **TASK 5 — Vector Layer** | Adicionar embeddings semânticos para busca por similaridade jurídica |

---

*Documento gerado automaticamente pelo IA SOLARIS — 2026-03-19*  
*Autoridade: Product Owner Uires Tapajós*
