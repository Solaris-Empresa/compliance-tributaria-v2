# DATA DICTIONARY — IA SOLARIS

**Criado:** Sprint Z-13.5 | **Atualizado:** Sprint Z-14 | **Motivo:** Post-mortem B-Z13.5-001 / B-Z13.5-002 / B-Z14-001
**Regra:** Este documento e fonte autoritativa para nomes de campos do banco.

---

## ⚠️ Regra de verificação dupla (B-Z14-001)

> `SHOW FULL COLUMNS` mostra o **banco atual**.
> O banco pode estar **desatualizado** em relação à migration.
> **SEMPRE cruzar com:**
> ```bash
> grep -n "[campo]" drizzle/*.sql
> ```
> **A migration é a fonte de verdade — não o banco.**
>
> Exemplo do bug B-Z14-001: banco mostrava `prazo DATE` mas migration define `prazo ENUM('30_dias','60_dias','90_dias')`.
> O implementador usou o banco → form errado → retrabalho.

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

## action_plans (raw SQL — migration 0064_risks_v4.sql)

| Campo | Tipo REAL (migration) | Observacao |
|---|---|---|
| id | varchar(36) | UUID |
| project_id | int | FK para projects |
| risk_id | varchar(36) | FK para risks_v4 |
| titulo | varchar(500) | NOT NULL |
| descricao | text | NULL |
| responsavel | varchar(100) | NOT NULL — campo obrigatorio no form |
| prazo | **ENUM('30_dias','60_dias','90_dias')** | ⚠️ NAO e date — usar `<Select>` no form |
| status | **ENUM('rascunho','aprovado','em_andamento','concluido','deleted')** | DEFAULT 'rascunho' — ⚠️ NAO existe 'pendente' |
| approved_by | int | NULL — FK para users |
| approved_at | timestamp | NULL |
| deleted_reason | text | NULL |
| created_by | int | NOT NULL |
| updated_by | int | NOT NULL |
| created_at | timestamp | CURRENT_TIMESTAMP |
| updated_at | timestamp | CURRENT_TIMESTAMP |

> **⚠️ Armadilha B-Z14-001:** O banco pode mostrar `prazo DATE` por divergência de schema.
> A migration define `ENUM('30_dias','60_dias','90_dias')`. Usar sempre o valor da migration.

---

## tasks (raw SQL — migration 0064_risks_v4.sql)

| Campo | Tipo REAL (migration) | Observacao |
|---|---|---|
| id | varchar(36) | UUID |
| action_plan_id | varchar(36) | FK para action_plans |
| project_id | int | FK para projects |
| titulo | varchar(500) | NOT NULL |
| descricao | text | NULL |
| responsavel | varchar(255) | NULL |
| prazo | **DATE** | NULL — tasks usa date livre (diferente de action_plans!) |
| status | **ENUM('todo','doing','done','blocked','deleted')** | DEFAULT 'todo' — ⚠️ NAO e 'pendente' |
| prioridade | enum('alta','media','baixa') | DEFAULT 'media' |
| ordem | int | DEFAULT 0 |
| deleted_reason | text | NULL |
| created_by | int | NOT NULL |
| created_at | timestamp | CURRENT_TIMESTAMP |
| updated_at | timestamp | CURRENT_TIMESTAMP |

> **Atenção:** `tasks.prazo` é DATE (campo livre), diferente de `action_plans.prazo` que é ENUM.

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
