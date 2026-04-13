# DATA DICTIONARY — IA SOLARIS

**Criado:** Sprint Z-13.5 | **Motivo:** Post-mortem B-Z13.5-001 / B-Z13.5-002
**Regra:** Este documento e fonte autoritativa para nomes de campos do banco.

## Regra de ouro

**NUNCA assumir nome de campo sem verificar este documento.**
Se o campo nao estiver aqui, executar antes de codar:

```sql
SHOW FULL COLUMNS FROM [tabela];
SELECT JSON_KEYS([campo_json]) FROM [tabela] WHERE [campo_json] IS NOT NULL LIMIT 3;
```

---

## projects (camelCase no banco — exceto campos adicionados por migration)

| Campo | Tipo | Observacao |
|---|---|---|
| confirmedCnaes | json camelCase | array de strings `["4639-7/01"]` |
| operationProfile | json camelCase | ver sub-campos abaixo |
| product_answers | json snake_case | array `[{ncm, descricao}]` |
| taxRegime | camelCase | `'lucro_real'` \| `'lucro_presumido'` \| `'simples'` |
| companySize | camelCase | `'media'` \| `'grande'` \| etc |

### operationProfile — sub-campos (schema novo, gerado pela UI)

| Campo JSON | Tipo | Observacao |
|---|---|---|
| operationType | string | `'comercio'` \| `'servicos'` \| `'industria'` |
| multiState | boolean | true/false |
| clientType | string[] | `['B2B']` \| `['B2C']` |
| paymentMethods | string[] | `['cartao','pix']` |
| hasIntermediaries | boolean | true/false |

### operationProfile — sub-campos (schema legado, projetos antigos)

| Campo JSON | Tipo | Observacao |
|---|---|---|
| tipoOperacao | string | fallback para operationType |
| multiestadual | boolean | fallback para multiState |
| tipoCliente | string[] | fallback para clientType |
| meiosPagamento | string[] | fallback para paymentMethods |
| intermediarios | boolean | fallback para hasIntermediaries |

---

## risks_v4 (raw SQL — sem Drizzle)

| Campo | Tipo | Observacao |
|---|---|---|
| type | enum | `'risk'` \| `'opportunity'` |
| severidade | enum | `'alta'` \| `'media'` \| `'oportunidade'` |
| status | enum | `'active'` \| `'deleted'` (NAO is_active) |
| evidence | json | `{gaps: EvidenceItem[], rag_*}` |
| risk_key | varchar | `categoria::op:X::geo:Y::cli:Z` |
| operational_context | json | `{tipoOperacao, multiestadual, ...}` |

---

## project_gaps_v3 (campos extras fora do Drizzle)

| Campo | Tipo | Observacao |
|---|---|---|
| risk_category_code | varchar | snake_case |
| gap_classification | enum | `'ausencia'` \| `'parcial'` \| `'inadequado'` |
| evaluation_confidence | decimal | snake_case |
| source_reference | varchar | snake_case |
| source | varchar | snake_case (NAO `fonte`) |
| answer_value | text | snake_case |

---

## risk_categories

| Campo | Tipo | Observacao |
|---|---|---|
| status | enum | `'ativo'` \| `'inativo'` (NAO is_active) |
| codigo | varchar | chave de negocio |

---

## regulatory_requirements_v3

| Campo | Tipo | Observacao |
|---|---|---|
| active | tinyint(1) | NAO is_active |

---

## normative_product_rules

| Campo | Tipo | Observacao |
|---|---|---|
| active | tinyint(1) | NAO is_active |
| match_mode | enum | `'exact'` \| `'prefix'` |

---

## ragDocuments

| Campo | Tipo | Observacao |
|---|---|---|
| conteudo | text | coluna de texto (NAO `content`, NAO `text`) |
| lei | enum | `'lc214'` \| `'ec132'` \| etc |
