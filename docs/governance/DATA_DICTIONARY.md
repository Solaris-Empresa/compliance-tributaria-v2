# DATA DICTIONARY — IA SOLARIS

**Criado:** Sprint Z-13.5 | **Atualizado:** Sprint Z-14 | **Motivo:** Post-mortem B-Z13.5-001 / B-Z13.5-002 / B-Z14-001
**Regra:** Este documento e fonte autoritativa para nomes de campos do banco.

---

## Documentos de regras de negocio

| Arquivo | Conteudo |
|---|---|
| [RN_GERACAO_RISCOS_V4.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/RN_GERACAO_RISCOS_V4.md) | Pipeline 3 passos, SEVERITY/URGENCIA/TYPE, ACL, 10 RNs |
| [RN_PLANOS_TAREFAS_V4.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/RN_PLANOS_TAREFAS_V4.md) | Catalogo buildActionPlans, fluxo status, cascata, audit log |

**REGRA-ORQ-00:** Ler AMBOS antes de criar qualquer issue que toque riscos ou planos.

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
| operationType | string | `'comercio'` \| `'servicos'` \| `'industria'`. **Q-2 RESOLVIDA 2026-04-24:** em projetos M1+ é valor **derivado** das 5 dimensões (não entrada direta) |
| multiState | boolean | true/false |
| clientType | string[] | `['B2B']` \| `['B2C']`. **Q-1 RESOLVIDA 2026-04-24:** campo **contextual fora do arquétipo** — não entra em `perfil_hash` nem afeta `status_arquetipo`/gate E2E. Preservado aqui para consumo por briefing/UX |
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
| **data_inicio** | **DATE NOT NULL** | Sprint Z-16 #614 — Opção C: MODIFY NOT NULL (sem DEFAULT) |
| **data_fim** | **DATE NOT NULL** | Sprint Z-16 #614 — Opção C: MODIFY NOT NULL (sem DEFAULT) |
| status | **ENUM('todo','doing','done','blocked','deleted')** | DEFAULT 'todo' — ⚠️ NAO e 'pendente' |
| prioridade | enum('alta','media','baixa') | DEFAULT 'media' |
| ordem | int | DEFAULT 0 |
| deleted_reason | text | NULL |
| created_by | int | NOT NULL |
| created_at | timestamp | CURRENT_TIMESTAMP |
| updated_at | timestamp | CURRENT_TIMESTAMP |

> **Atenção:** `tasks.prazo` é DATE (campo livre), diferente de `action_plans.prazo` que é ENUM.

> **Atualizado em Sprint Z-16 Fase 2 (2026-04-16):** `data_inicio` e `data_fim` adicionados como DATE NOT NULL via ALTER TABLE MODIFY (Opção C aprovada pelo P.O.). Interfaces TypeScript `TaskRow` e `InsertTaskV4` atualizadas em `server/lib/db-queries-risks-v4.ts`. Defaults no código: `data_inicio = CURDATE()`, `data_fim = CURDATE() + 30 dias`.

---

## projects.scoringData (v4)

> **Atualizado em Z-22 / issue #800 (2026-04-21)**
> **Calculado por (ativa):** `calculateComplianceScore()` em `server/lib/compliance-score-v4.ts`
> **Chamado em:** `trpc.risksV4.calculateAndSaveScore` — Sprint Z-16 PR #634, hot swap Z-12 ADR-0022
> **Função legada (deprecated):** `calculateGlobalScore()` em `server/ai-helpers.ts` — Sprint V61, substituída

### Campos gravados pela função ativa (`calculateComplianceScore`)

| Campo | Tipo | Observacao |
|---|---|---|
| score | number | 0-100 — fórmula abaixo |
| nivel | string | `'baixo'` \| `'medio'` \| `'alto'` \| `'critico'` |
| total_riscos_aprovados | number | count de `approved_at != NULL` |
| total_alta | number | count severidade=alta |
| total_media | number | count severidade=media |
| formula_version | string | `'v4.0'` — identifica versão da fórmula |
| snapshots | array | histórico dos cálculos (RN-CV4-10) |

**Fórmula ativa:**
```
score = round( Σ(peso × max(confidence, 0.5)) / (n × 9) × 100 )
  peso = { alta: 7, media: 5, oportunidade: 1 }
  n    = count(approved AND type != 'opportunity')
```

**Classificação de nivel:**
- `score >= 75` → `'critico'`
- `score >= 50` → `'alto'`
- `score >= 25` → `'medio'`
- else → `'baixo'`

### Campos legados (gravados pela função deprecated em projetos antigos)

| Campo | Tipo | Observacao |
|---|---|---|
| score_global | number | **Legado V61** — ainda presente em projetos antigos. Frontend lê este como fallback de `score` |
| impacto_estimado | string | Legado V61 — tradução financeira |
| custo_inacao | string | Legado V61 |
| prioridade | string | Legado V61 |
| total_riscos | number | Legado V61 (diferente de `total_riscos_aprovados`) |
| riscos_criticos | number | Legado V61 |
| riscos_altos | number | Legado V61 |

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

---

## Perfil da Entidade M1 (Epic #830 · ADR-0031 + ADR-0032)

**Status:** DRAFT — aguardando implementação pós-GO M1. Decisões P.O. consolidadas em `docs/epic-830-rag-arquetipo/specs/DE-PARA-CAMPOS-PERFIL-ENTIDADE.md`.

**Motivação:** modelo dimensional substitui `operationType` direto por 5 dimensões canônicas. Política de não-migração (ADR-0032 §4) — projetos legados `profileVersion='1.0'` preservados.

### Colunas novas em `projects` (a implementar pós-GO M1)

| Campo | Tipo | Observacao |
|---|---|---|
| archetype | JSON nullable | Snapshot imutável (`status_arquetipo=confirmado` → imutável). Shape em SPEC-RUNNER-RODADA-D §6.1 |
| archetype_version | VARCHAR(20) | Ex.: `"m1-v1.0.0"` |
| archetype_perfil_hash | CHAR(64) | SHA-256 das dimensões + contextuais via CANONICAL-JSON-SPEC |
| archetype_rules_hash | CHAR(64) | SHA-256 do manifesto declarativo (CANONICAL-RULES-MANIFEST.md) |
| archetype_confirmed_at | TIMESTAMP nullable | Quando usuário confirmou (marca imutabilidade) |

### Shape do JSON `archetype` (quando `model_version='m1-v1.0.0'`)

| Campo | Tipo | Enum | Observacao |
|---|---|---|---|
| objeto | json array string | enum fechado (14 valores) | Categorias: combustivel, bebida, tabaco, alimento, medicamento, energia_eletrica, servico_financeiro, servico_digital, servico_regulado, bens_industrializados, bens_mercadoria_geral, servico_geral, agricola, pecuario |
| papel_na_cadeia | string | enum fechado (12 valores) | fabricante, distribuidor, varejista, prestador, transportador, importador, exportador, comercio_exterior_misto, intermediador, produtor, operadora_regulada, indefinido |
| tipo_de_relacao | json array string | enum fechado (6 valores) | venda, servico, producao, intermediacao, locacao, indefinida |
| territorio | json array string | enum fechado (8 valores) | municipal, estadual, interestadual, nacional, internacional, ZFM, ALC, incentivado_outro |
| regime | string | enum fechado (5 valores) | simples_nacional, lucro_presumido, lucro_real, mei, indefinido. **Q-D3 RESOLVIDA 2026-04-24:** `regime_especifico_setorial` removido do enum — agora é campo contextual separado `regime_especifico[]` |
| regime_especifico | json array string | enum aberto v1 | **Q-D3 RESOLVIDA 2026-04-24:** modificador ortogonal ao regime principal. Ex.: `["combustivel_monofasico"]`. Pode ser vazio. Extensível |
| subnatureza_setorial | json array string | enum v1 (7 valores) | Q-D4 RESOLVIDA: sempre array. `[]` = não-regulado; `["telecomunicacoes"]`, `["saude","saude_regulada"]`, etc. Obrigatório >=1 valor se `papel=operadora_regulada`. Enum v1: telecomunicacoes, saude, saude_regulada, energia, financeiro, combustiveis, transporte |
| orgao_regulador | json array string | livre | Ex.: `["ANATEL", "ANVISA"]`; enum aberto (ANATEL, ANVISA, ANS, ANEEL, BCB, CVM, SUSEP, ANP, ANTT, ANTAQ, ANAC, ...) |
| derived_legacy_operation_type | string (OperationType) | industria, comercio, servicos, misto, agronegocio, financeiro | Campo derivado obrigatório (Q-2 Opção A) — consumido por `risk-eligibility.ts` |
| status_arquetipo | string | enum fechado (4 valores) | pendente, inconsistente, bloqueado, confirmado |
| motivo_bloqueio | string nullable | livre | Preenchido apenas quando status=bloqueado |
| model_version | string | semver | Ex.: `"m1-v1.0.0"` |
| data_version | string | ISO-8601 UTC | Ex.: `"2026-04-24T12:00:00.000Z"` |
| perfil_hash | string | `sha256:[64 hex]` | Hash das dimensões + contextuais |
| rules_hash | string | `sha256:[64 hex]` | Hash do manifesto de regras |
| imutavel | boolean | sempre `true` | Marker de política |

### Convivência com legado (ADR-0032 §4 + Q-7 RESOLVIDA 2026-04-24)

**Coexistência dual `profileVersion` × `archetype_version`:**

| Campo | Origem | Projetos que têm valor | Política de escrita |
|---|---|---|---|
| `profileVersion` (existente, VARCHAR 20) | legado | todos os projetos pré-M1 (valor `"1.0"`) | **IMUTÁVEL** em projetos M1+ — sistema NUNCA altera (P-7) |
| `archetype_version` (NOVA, VARCHAR 20 nullable) | M1+ | apenas projetos que confirmaram arquétipo | Escrita UMA VEZ na primeira confirmação; bumps aditivos preservam snapshots antigos |

**Detecção determinística:**
```
isProjetoM1(p)     ≡ p.archetype_version IS NOT NULL
isProjetoLegado(p) ≡ p.archetype_version IS NULL
```

**Consequências práticas:**
- Projetos `profileVersion='1.0'` **não recalculam** — `operationProfile.operationType` preservado
- Projetos `m1-v1.0.0+` escrevem `archetype` + atualizam `operationProfile.operationType` como valor **derivado** (ver Q-2). `profileVersion` continua no valor original (pode ser `"1.0"` mesmo em projeto M1+ — `archetype_version` é a fonte de verdade)
- Gate Hotfix IS (`risk-eligibility.ts`) continua consumindo `OperationType` — intocado
- Queries de auditoria: `WHERE archetype_version IS NOT NULL` identifica todos os projetos M1+
- Rollback seguro: DROP `archetype_version` volta projetos M1+ a ficarem indistinguíveis de legados (mas snapshots JSON em `archetype` persistem)

### Estados novos em `projects.status` (Q-8 RESOLVIDA 2026-04-24)

Enum `projects.status` recebe **4 valores novos** via ALTER TABLE em M1-F2, inseridos entre `cnaes_confirmados` e `assessment_fase1`:

| Valor novo | Significado | Mapping com status_arquetipo |
|---|---|---|
| `perfil_pendente` | User preenchendo form dimensional M1 | `status_arquetipo = "pendente"` |
| `perfil_inconsistente` | Validação dimensional detectou issues | `status_arquetipo = "inconsistente"` |
| `perfil_bloqueado` | HARD_BLOCK terminal (V-05-DENIED) | `status_arquetipo = "bloqueado"` |
| `perfil_confirmado` | User confirmou perfil; próximo passo briefing | `status_arquetipo = "confirmado"` |

Total enum após migração: **26 → 30 valores**. Projetos legados `profileVersion='1.0'` permanecem em estados pré-existentes (não migram automaticamente).
