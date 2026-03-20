# Question Mapping Engine — TASK 3

**Autoridade:** Product Owner Uires Tapajós  
**Modo:** STRICT MODE — GOVERNANCE CRÍTICA  
**Data:** 2026-03-20  
**Status:** DONE

---

## 1. Princípio Fundamental

> **Pergunta NÃO é gerada. Pergunta é DERIVADA de requisito.**

Nenhuma palavra é inventada. Nenhuma interpretação jurídica nova é criada. O template de pergunta é construído exclusivamente por reformatação estrutural do `canonical_description` original, usando padrões fixos baseados no `normative_type`.

---

## 2. Objetivo

Mapear cada `canonical_requirement` para uma pergunta estruturada que será exibida nos questionários da plataforma (QC, QO, QCNAE), mantendo rastreabilidade completa até a base legal original.

---

## 3. Tabela `requirement_question_mapping`

```sql
CREATE TABLE requirement_question_mapping (
    mapping_id            VARCHAR(32) PRIMARY KEY,  -- ex: MAP-A3F2B1C0
    canonical_id          VARCHAR(32) NOT NULL,      -- FK → canonical_requirements
    question_template     TEXT NOT NULL,             -- pergunta derivada
    question_type         VARCHAR(32) NOT NULL,      -- boolean|multiple|input
    questionnaire_section VARCHAR(16) NOT NULL,      -- QC|QO|QCNAE
    validation_rule       VARCHAR(128),              -- ex: required:true
    required              BOOLEAN NOT NULL,
    created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_canonical_id (canonical_id),
    INDEX idx_section (questionnaire_section)
);
```

---

## 4. Regras de Derivação (Controladas)

### 4.1 Template por `normative_type`

| normative_type | Prefixo do template | question_type | required |
|---|---|---|---|
| `obrigacao` | "A empresa cumpre a seguinte obrigação: [texto]" | boolean | true |
| `vedacao` | "A empresa se abstém de: [texto]" | boolean | true |
| `direito` | "A empresa exerce ou pretende exercer o seguinte direito: [texto]" | boolean | false |
| `opcao` | "A empresa optou por: [texto]" | multiple | false |
| `definicao` | "A empresa se enquadra na seguinte definição: [texto]" | boolean | false |

### 4.2 Classificação de Seção por Keyword Scoring

A seção do questionário é determinada por pontuação de palavras-chave no texto legal:

| Seção | Palavras-chave principais |
|---|---|
| **QC** (Corporativo) | regime, tributário, cadastro, cnpj, pessoa jurídica, sede, filial, holding, grupo econômico |
| **QO** (Operacional) | operação, transação, prestação, nota fiscal, apuração, recolhimento, escrituração |
| **QCNAE** (Especializado) | setor, atividade, cnae, alíquota diferenciada, isenção, regime especial |

**Regra de desempate:** QO > QC > QCNAE (operacional é mais frequente).

---

## 5. Resultado TASK 3

| Métrica | Valor |
|---|---|
| Total canonical_requirements | 499 |
| Total mapeados | 499 |
| Não mapeados | 0 |
| Duplicidades | 0 |
| Validação 1:1 | ✅ APROVADA |

### Distribuição por Seção

| Seção | Quantidade | % |
|---|---|---|
| **QC** (Questionário Corporativo) | 327 | 65.5% |
| **QO** (Questionário Operacional) | 159 | 31.9% |
| **QCNAE** (Especializado por CNAE) | 13 | 2.6% |

### Distribuição por Tipo

| normative_type | Quantidade |
|---|---|
| obrigacao | 235 |
| direito | 193 |
| vedacao | 71 |

---

## 6. Rastreabilidade

Cadeia completa de rastreabilidade:

```
Texto legal original (PDF)
    ↓ [parse_lc214.py / task1_2_multisource.py]
regulatory_articles (3.676 + 2.102 artigos)
    ↓ [regulatory_engine_v1.py / task1_2_multisource.py]
regulatory_requirements (817 requisitos)
    ↓ [task1_1_classification.py / task1_3_scope_correction.py]
  + normative_type + normative_scope + is_operational
    ↓ [task2_1_canonical_engine.py]
canonical_requirements (499 grupos canônicos)
    ↓ [task2_2_safe_mode.py]
  + canonical_relation_type
    ↓ [task3_question_mapping.py]
requirement_question_mapping (499 perguntas derivadas)
    ↓ [TASK 4 — Briefing Generator]
Briefing jurídico personalizado por empresa/CNAE
```

---

## 7. Proibições Absolutas

- **NÃO** gerar pergunta livre (sem base no texto legal)
- **NÃO** interpretar juridicamente o requisito
- **NÃO** inventar regra de validação
- **NÃO** alterar `canonical_description` ou `legal_basis_text`
- **NÃO** excluir requisitos originais

---

## 8. Próximos Passos

| Task | Objetivo |
|---|---|
| **TASK 4 — Briefing Generator** | Usar `requirement_question_mapping` para gerar briefing jurídico personalizado por CNAE e perfil da empresa |
| **TASK 5 — Question UI Integration** | Conectar `requirement_question_mapping` aos questionários QC, QO, QCNAE da plataforma |
| **TASK 6 — Gap Analysis** | Identificar canonical_requirements sem cobertura nos questionários atuais |

---

*Documento gerado pelo IA SOLARIS — 2026-03-20*  
*Autoridade: Product Owner Uires Tapajós*
