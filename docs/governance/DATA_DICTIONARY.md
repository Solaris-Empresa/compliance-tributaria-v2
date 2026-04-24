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

## Perfil da Entidade — M1 (Sprint M1 · 2026-04-24)

> **REGRA:** Esta seção cobre os campos e tipos introduzidos pelo milestone M1. Não implementar sem aprovação P.O. e prompt do Orquestrador. Artefato pré-M1.

### status_arquetipo — enum canônico (4 estados)

Campo derivado. Nunca preenchido diretamente pelo usuário. Calculado pelo pipeline de validação dimensional em `buildPerfilEntidade(project)`. Fica dentro do JSON `archetype` (não é coluna separada).

| Valor | Semântica | Condição de entrada |
|---|---|---|
| `pendente` | Estado inicial — dados válidos, sem issues, aguarda confirmação do usuário | Default; nenhuma das regras abaixo disparou |
| `inconsistente` | Qualquer issue detectada: campo obrigatório ausente, conflito lógico entre dimensões, ou `AmbiguityError` em `deriveOperationType()` | `missing_required_fields != empty` OU conflito lógico OU AmbiguityError |
| `bloqueado` | HARD_BLOCK de negócio ativo — `V-05-DENIED` (multi-CNPJ sem análise por CNPJ) | `BLOCK_FLOW` emitido pelo pipeline |
| `confirmado` | Usuário confirmou o perfil via CTA. Estado terminal. Snapshot imutável (ADR-0032) | `user_confirmed = true` E nenhuma das regras acima disparou |

**Tabela de transições (primeira regra que bate vence — SPEC-RUNNER §4.2.1):**

| # | Condição | `status_arquetipo` |
|---|---|---|
| 1 | HARD_BLOCK de negócio (V-05-DENIED) | `bloqueado` |
| 2 | AmbiguityError em `deriveOperationType()` | `inconsistente` |
| 3 | Conflito lógico entre dimensões | `inconsistente` |
| 4 | `missing_required_fields != empty` | `inconsistente` |
| 5 | `user_confirmed = true` (e nenhuma acima disparou) | `confirmado` |
| 6 | default | `pendente` |

### Campos novos da tabela `projects` (a adicionar em M1+)

| Campo | Tipo SQL | Semântica |
|---|---|---|
| `archetype` | `JSON NULL` | Snapshot imutável do Perfil da Entidade (ADR-0031 + ADR-0032). Contém as 5 dimensões + contextuais + metadata |
| `archetype_version` | `VARCHAR(20) NULL` | Versão do modelo. Ex: `m1-v1.0.0`. Escrito apenas na primeira confirmação |
| `archetype_perfil_hash` | `CHAR(64) NULL` | SHA-256 do conteúdo das dimensões + contextuais (ADR-0032 §2) |
| `archetype_rules_hash` | `CHAR(64) NULL` | SHA-256 do manifesto declarativo de regras (ADR-0032 §2 · Opção C aprovada P.O.) |
| `archetype_confirmed_at` | `TIMESTAMP NULL` | Quando usuário confirmou — marca imutabilidade (ADR-0032 §1) |

**Regra crítica:** `DROP COLUMN` proibido (ADR-0032 §4). Colunas legadas permanecem indefinidamente.

**Detecção de versão:**
```
isProjetoM1(p)     ≡ p.archetype_version !== null
isProjetoLegado(p) ≡ p.archetype_version === null
```

### buildPerfilEntidade(project) — função pura (a criar em M1+)

Não é coluna de banco. É a função de derivação do Perfil da Entidade.

| Aspecto | Valor |
|---|---|
| **Localização futura** | `server/lib/perfil-entidade.ts` |
| **Característica** | Função pura e determinística — sem LLM, sem fallback silencioso |
| **Regra** | Ambiguidade lança erro (não warning) — lição Z-17 |

### 5 Dimensões canônicas (ADR-0031)

| Dimensão | Tipo | Valores do enum fechado |
|---|---|---|
| `objeto[]` | `string[]` | produto, serviço, misto, imóvel, financeiro, intangível, energia, resíduo |
| `papel_na_cadeia` | `string` | transportador, distribuidor, fabricante, varejista, intermediador, prestador, importador, exportador, produtor |
| `tipo_de_relacao[]` | `string[]` | venda, serviço, produção, intermediação, locação |
| `territorio[]` | `string[]` | municipal, interestadual, internacional, ZFM, ALC, incentivado |
| `regime` | `string` | simples_nacional, lucro_presumido, lucro_real, mei, regime_específico_setorial |

**Nota:** `marketplace` não é enum próprio — é composição `papel_na_cadeia = 'intermediador'` + `tipo_de_relacao = ['intermediação']` (decisão P.O. 2026-04-24 Q-3).

### Gate E2E — regra canônica (instrução P.O. 2026-04-24)

```
gateLiberated = status_arquetipo === 'confirmado'
             AND erros_estruturais.length === 0
             AND hard_blocks.length === 0
```

**Nota:** Score/confiança NÃO libera o gate. `acceptRisk()` é mecanismo AS-IS (gate pré-diagnóstico) e não se aplica ao gate M1.

### Campos contextuais fora do arquétipo (não entram em perfil_hash)

| Campo | Localização | Uso |
|---|---|---|
| `clientType[]` | `operationProfile.clientType[]` | Contextual fora do arquétipo. Pode alimentar briefing/UX. Decisão P.O. 2026-04-24 (Q-1) |
| `companySize` | `projects.companySize` | Atributo não-dimensional |
| `company_type` | contexto do projeto | Identificação — não entra em `perfil_hash` |
| `annual_revenue_range` | contexto do projeto | Identificação — não entra em `perfil_hash` |

### Referências cruzadas M1

| Artefato | Branch | Conteúdo |
|---|---|---|
| `ADR-0031` | `docs/epic-830-rag-arquetipo` | Modelo dimensional canônico |
| `ADR-0032` | `docs/epic-830-rag-arquetipo` | Imutabilidade e versionamento |
| `DE-PARA-CAMPOS-PERFIL-ENTIDADE.md` | `docs/epic-830-rag-arquetipo/specs/` | Mapeamento AS-IS → Target |
| `SPEC-RUNNER-RODADA-D.md` | `docs/epic-830-rag-arquetipo/specs/` | Suite de testes e invariantes IS-1 a IS-8 |
| `MOCKUP_perfil_entidade_v5_1.html` | `docs/m1-arquetipo-exploracao` | Mockup baseline aprovado P.O. |
