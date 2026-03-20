# Canonical Requirements Layer — Arquitetura e Modelo de Dados

**Versão:** 2.1  
**Criado em:** 2026-03-19  
**Autoridade:** Product Owner Uires Tapajós  
**Status:** PRODUCTION

---

## 1. Conceito de Canonical Layer

### 1.1 Problema que resolve

A base regulatória da Reforma Tributária é composta por **4 fontes legais distintas** (EC 132/2023, LC 214/2025, LC 224/2025, LC 227/2026). Um mesmo requisito operacional pode aparecer em múltiplas fontes — por exemplo, uma obrigação de declaração prevista na LC 214 pode ser reiterada ou complementada pela LC 227.

Sem uma camada canônica, o sistema geraria **duplicidade semântica**: o mesmo requisito seria apresentado ao contribuinte múltiplas vezes, inflando o diagnóstico e gerando confusão jurídica.

### 1.2 Princípio fundamental

> **Um requisito operacional deve existir apenas uma vez (canônico), mesmo que tenha múltiplas bases legais.**

A canonical layer resolve isso: cada requisito único recebe um `canonical_id`, e requisitos semanticamente equivalentes de fontes diferentes são **agrupados** sob o mesmo `canonical_id`, com todas as bases legais preservadas no campo `sources`.

### 1.3 Benefícios

| Benefício | Descrição |
|---|---|
| **Deduplicação** | Elimina requisitos duplicados cross-source |
| **Rastreabilidade** | Mantém todas as bases legais originais |
| **Priorização** | `risk_base` permite priorizar obrigações críticas |
| **Question Mapping** | Base limpa para mapear requisitos → perguntas dos questionários |
| **Auditoria** | Cada agrupamento tem justificativa documentada |

---

## 2. Modelo de Dados

### 2.1 Tabela `canonical_requirements`

```sql
CREATE TABLE canonical_requirements (
    canonical_id         VARCHAR(32) PRIMARY KEY,
    -- Identificador único canônico (ex: CAN-0001)

    canonical_description TEXT NOT NULL,
    -- Descrição acionável do requisito (derivada do membro representativo)

    requirement_type     VARCHAR(32) NOT NULL,
    -- Tipo normativo: obrigacao | vedacao | direito | opcao | definicao | principio

    normative_scope      VARCHAR(32) NOT NULL DEFAULT 'contribuinte',
    -- Sempre 'contribuinte' (filtro aplicado na TASK 1.3)

    sources              JSON NOT NULL,
    -- Lista de bases legais: [{source_id, article_id, requirement_id}, ...]

    risk_base            VARCHAR(16) NOT NULL DEFAULT 'medium',
    -- Nível de risco: high (obrigacao/vedacao) | medium (direito) | low (opcao/definicao)

    source_count         INT NOT NULL DEFAULT 1,
    -- Número de fontes distintas que contêm este requisito

    is_multi_source      BOOLEAN NOT NULL DEFAULT FALSE,
    -- TRUE se o requisito aparece em ≥2 fontes distintas

    created_at           DATETIME NOT NULL
)
```

### 2.2 Campo `canonical_group_id` em `regulatory_requirements`

```sql
ALTER TABLE regulatory_requirements
ADD COLUMN canonical_group_id VARCHAR(32) NULL;
-- Referência ao canonical_id do grupo ao qual este requisito pertence
-- NULL para requisitos não operacionais (is_operational = false)
```

### 2.3 Relação entre tabelas

```
regulatory_requirements
  ├── requirement_id (PK)
  ├── source_id → regulatory_sources
  ├── article_id → regulatory_articles
  ├── is_operational (BOOLEAN)
  └── canonical_group_id → canonical_requirements.canonical_id
                              ├── canonical_id (PK)
                              ├── sources (JSON: [{source_id, article_id, requirement_id}])
                              ├── risk_base
                              └── is_multi_source
```

---

## 3. Regras de Agrupamento

### 3.1 Algoritmo

O agrupamento usa **Union-Find** com dois critérios de similaridade:

**Critério 1 — Jaccard Similarity (threshold: 0.72)**
```python
jaccard(tokens_A, tokens_B) = |A ∩ B| / |A ∪ B|

# Tokens extraídos após:
# - Remoção de stopwords jurídicas (60+ termos)
# - Remoção de referências a artigos (Art. X, § Y)
# - Tokenização por espaço
```

**Critério 2 — Verbo + Objeto Tributário (threshold: 0.60)**
```python
# Ativa quando:
# - jaccard >= 0.60 (threshold menor)
# - mesmo verbo de obrigação/vedação/direito
# - mesmo objeto tributário (ex: "crédito", "nota fiscal")
```

### 3.2 Restrições

| Restrição | Regra |
|---|---|
| **Cross-type** | Nunca agrupar `obrigacao` com `direito` |
| **Mesma fonte** | Threshold mais alto (0.88) para evitar agrupar artigos complementares |
| **Fontes distintas** | Threshold padrão (0.72) para identificar duplicidades reais |
| **Base legal** | Nunca alterada — apenas agrupada no campo `sources` |

### 3.3 Prioridade de fonte representativa

Quando um grupo tem múltiplas fontes, o membro representativo é escolhido por:

```
LC 214/2025 (prioridade 1) > LC 227/2026 (2) > LC 224/2025 (3) > EC 132/2023 (4)
```

A LC 214 é a lei principal do IBS/CBS/IS e tem precedência sobre as demais.

---

## 4. Exemplos Reais de Agrupamento

### 4.1 Caso CAN-0491 — Jaccard = 1.0 (identidade semântica perfeita)

| Campo | Requisito A | Requisito B |
|---|---|---|
| requirement_id | `REQ-LC214-ART-0481-PAR-004-001` | `REQ-LC227-2026-ART-0008-PAR-004-001` |
| source_id | LC214-2025 | LC227-2026 |
| normative_type | direito | direito |
| jaccard | **1.0** | — |
| **canonical_id** | **CAN-0491** | **CAN-0491** |

**Justificativa:** Texto idêntico em duas fontes distintas. A LC 227 reitera o direito previsto na LC 214. Unificados sob CAN-0491 com `is_multi_source=true`.

---

### 4.2 Caso CAN-0483 — Jaccard = 0.909 (alta similaridade)

| Campo | Requisito A | Requisito B |
|---|---|---|
| requirement_id | `REQ-LC214-ART-0408-PAR-001-001` | `REQ-LC227-2026-ART-0195-PAR-020-001` |
| source_id | LC214-2025 | LC227-2026 |
| normative_type | obrigacao | obrigacao |
| risk_base | **high** | — |
| jaccard | **0.909** | — |
| **canonical_id** | **CAN-0483** | **CAN-0483** |

**Justificativa:** Mesma obrigação com redação ligeiramente diferente entre LC 214 e LC 227. Tokens quase idênticos (Jaccard 0.909). Unificados com risk_base=high.

---

### 4.3 Caso CAN-0448 — Jaccard = 0.882

| Campo | Requisito A | Requisito B |
|---|---|---|
| requirement_id | `REQ-LC214-ART-0057-PAR-008-001` | `REQ-LC227-2026-ART-0178-PAR-049-001` |
| source_id | LC214-2025 | LC227-2026 |
| normative_type | direito | direito |
| jaccard | **0.882** | — |
| **canonical_id** | **CAN-0448** | **CAN-0448** |

---

## 5. Métricas da TASK 2.1

| Métrica | Valor |
|---|---|
| Requisitos operacionais (antes) | 514 |
| Grupos canônicos (depois) | **499** |
| Duplicidades eliminadas | **15** |
| Taxa de deduplicação | **2.92%** |
| Grupos multi-source (≥2 fontes) | **7** |
| Grupos únicos (1 fonte) | 492 |
| Comparações realizadas | 51.370 |
| Agrupamentos realizados | 15 |
| Threshold Jaccard | 0.72 |

### 5.1 Distribuição por source_count

| Fontes | Grupos canônicos |
|---|---|
| 1 fonte | 492 |
| 2 fontes | 7 |

### 5.2 Distribuição por requirement_type

| Type | Canônicos |
|---|---|
| direito | ~193 |
| obrigacao | ~200 |
| vedacao | ~49 |
| opcao | ~18 |
| definicao | ~19 |
| principio | ~3 |

---

## 6. Rastreabilidade

A rastreabilidade é garantida em 3 níveis:

```
canonical_id (CAN-XXXX)
  └── sources[].requirement_id (REQ-LC214-ART-XXXX-001)
        └── article_id (LC214-2025-ART-XXXX)
              └── source_id (LC214-2025)
                    └── regulatory_sources.file_hash (SHA256 do PDF original)
```

Nenhum requisito original foi excluído. A coluna `canonical_group_id` em `regulatory_requirements` mantém o link bidirecional.

---

## 7. Próximos Passos

| Task | Objetivo |
|---|---|
| **TASK 2.2 — Question Mapping** | Mapear cada `canonical_id` para as seções dos questionários QC, QO, QCNAE |
| **TASK 2.3 — Risk Scoring** | Calcular score de risco por empresa com base nos canonical requirements |
| **TASK 3 — Gap Analysis** | Identificar artigos sem cobertura e expandir o parser |
| **TASK 4 — Briefing Generator** | Gerar briefing jurídico usando canonical requirements + perfil da empresa |

---

*Documento gerado pelo IA SOLARIS — 2026-03-19*  
*Autoridade: Product Owner Uires Tapajós*
