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
| project_id | int | FK para projects |
| rule_id | varchar(64) | chave de negocio do risco |
| type | enum | `'risk'` \| `'opportunity'` |
| categoria | varchar(100) | codigo da categoria (snake_case) |
| titulo | varchar(500) | titulo juridico gerado |
| descricao | text | descricao detalhada |
| artigo | varchar(255) | artigo_base da categoria |
| severidade | enum | `'alta'` \| `'media'` \| `'oportunidade'` |
| urgencia | enum | `'imediata'` \| `'curto_prazo'` \| `'medio_prazo'` |
| status | enum | `'active'` \| `'deleted'` (NAO is_active) |
| evidence | json | `{gaps: EvidenceItem[], rag_*}` |
| breadcrumb | json | array 4 nos `[fonte, categoria, artigo, ruleId]` |
| source_priority | enum | `'cnae'` \| `'ncm'` \| `'nbs'` \| `'solaris'` \| `'iagen'` |
| confidence | decimal(5,4) | 0.0000 a 1.0000 |
| risk_key | varchar | `categoria::op:X::geo:Y::cli:Z` |
| operational_context | json | `{tipoOperacao, multiestadual, ...}` |
| evidence_count | int | total de gaps consolidados |
| rag_validated | tinyint(1) | 0=nao validado, 1=validado |
| rag_confidence | decimal(3,2) | confianca do RAG |
| rag_artigo_exato | varchar(255) | artigo exato encontrado no RAG |
| rag_validation_note | text | nota quando RAG nao valida |
| approved_by | int | FK para users |
| approved_at | timestamp | data de aprovacao |
| deleted_reason | text | motivo da exclusao |
| created_by | int | FK para users |
| updated_by | int | FK para users |

---

## project_gaps_v3 (campos extras fora do Drizzle)

| Campo | Tipo | Observacao |
|---|---|---|
| risk_category_code | varchar | snake_case |
| gap_classification | enum | `'ausencia'` \| `'parcial'` \| `'inadequado'` |
| evaluation_confidence | decimal | snake_case, 0.0–1.0 |
| evaluation_confidence_reason | text | justificativa da confianca (OBRIGATORIO ADR-010) |
| source_reference | varchar | snake_case |
| source | varchar | snake_case (NAO `fonte`) |
| answer_value | text | snake_case |
| question_id | int | FK para a questao que gerou o gap |

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
| regime | varchar(64) | `'aliquota_zero'` \| `'aliquota_reduzida'` |
| legal_reference | varchar(255) | ex: `'Art. 125 c/c Anexo I LC 214/2025'` |
| ncm_code | varchar(20) | codigo NCM |
| match_mode | enum | `'exact'` \| `'prefix'` |
| active | tinyint(1) | NAO is_active |
| source_version | varchar(64) | ex: `'LC214_2025'` |

---

## Tipos de dado do driver (B-Z13.5-001)

> **ATENCAO — Driver TiDB/mysql2**
>
> O driver mysql2 pode retornar colunas JSON como:
> - `string` (JSON serializado) — requer `JSON.parse()`
> - `object`/`array` ja parseado — NAO usar `JSON.parse()`
>
> **Sempre usar `safeParseObject()` / `safeParseArray()`** em vez de `JSON.parse()` direto.
> Funcoes em: `server/lib/project-profile-extractor.ts`

---

## ragDocuments

| Campo | Tipo | Observacao |
|---|---|---|
| conteudo | text | coluna de texto (NAO `content`, NAO `text`) |
| lei | enum | `'lc214'` \| `'ec132'` \| etc |
