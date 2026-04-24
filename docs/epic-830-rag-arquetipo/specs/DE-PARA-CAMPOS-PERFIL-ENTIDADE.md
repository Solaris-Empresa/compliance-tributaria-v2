# DE/PARA — Campos do Perfil da Entidade (AS-IS → Target)

**Status:** DRAFT — aguardando decisão do P.O. sobre dúvidas da §8
**Data:** 2026-04-24
**Contexto:** Epic #830 — RAG com Arquétipo (M1) — pré-M1
**Base normativa:** ADR-0031 (modelo dimensional) + ADR-0032 (imutabilidade + versionamento)
**Estado de implementação:** **nenhum código tocado** — apenas documentação pré-M1

## Escopo

Este documento mapeia **todos os campos que hoje compõem o "perfil" do projeto** (AS-IS) para o **modelo dimensional canônico** (Target) definido pelo ADR-0031. Identifica o que se mantém, descarta, renomeia, cria e deriva, e registra o impacto em fluxo E2E e schema.

Não define implementação. Não especifica migração automática (proibida por ADR-0032 §4). Estratégia transitional segue política de não-migração: perfis legados mantêm sua versão (`profileVersion='1.0'`), novos perfis adotam `m1-v1.0.0`.

## Glossário rápido

- **AS-IS** — estado atual do código em `origin/main` (branch `tmp-v757-rebase` reflete o estado pós-v7.58)
- **Transitional** — coexistência do modelo antigo (legado) com o novo (dimensional), sem migração
- **Target** — modelo canônico pós-M1 conforme ADR-0031

---

## §1. Fontes atuais dos campos (AS-IS)

Sete fontes distintas carregam hoje dados do "perfil":

| Fonte | Tipo | Arquivo | Linhas |
|---|---|---|---|
| Tabela `projects` — colunas ENUM | Drizzle ORM | `drizzle/schema.ts` | 31-156 |
| Tabela `projects` — JSON `companyProfile` | JSON | `drizzle/schema.ts` | 119 |
| Tabela `projects` — JSON `operationProfile` | JSON | `drizzle/schema.ts` | 120 |
| Tabela `projects` — JSON `taxComplexity` | JSON | `drizzle/schema.ts` | 121 |
| Tabela `projects` — JSON `financialProfile` | JSON | `drizzle/schema.ts` | 122 |
| Runtime `ProjectProfile` | TS interface | `server/lib/project-profile-extractor.ts` | 30-50 |
| Runner archetype (Rodada D) | JS array | `tests/archetype-validation/run-50-v2.mjs` | 119-138 |
| Gate de elegibilidade (Hotfix IS) | TS enum | `server/lib/risk-eligibility.ts` | 34-40 |
| Runner seed (fonte de verdade operacional) | JSON | `tests/archetype-validation/M1-arquetipo-50-casos-brasil-v2.json` | — |
| Contrato M1→M2 proposto | TS interface | `docs/epic-830-rag-arquetipo/specs/CONTRATOS-ENTRE-MILESTONES.md` | 26-50 |

Nenhuma destas fontes é fonte única de verdade. A consolidação em torno do modelo dimensional é o objetivo de M1.

---

## §2. Tabela DE/PARA

Classificação por destino em Target. Referências `[file:line]` apontam para o AS-IS.

### §2.1. Campos MANTIDOS sem renomeação

Permanecem na tabela `projects` ou no runtime, com semântica inalterada. Continuam a servir funcionalidades não-dimensionais (identidade, status, auditoria).

| Campo AS-IS | Local | Referência |
|---|---|---|
| `id` | projects (PK) | schema.ts:32 |
| `name` | projects | schema.ts:33 |
| `clientId` | projects | schema.ts:34 |
| `status` | projects (enum fluxo) | schema.ts:35-61 |
| `createdById` · `createdByRole` · `createdAt` · `updatedAt` · `completedAt` | projects | schema.ts:63-67 |
| `mode` · `sessionToken` | projects | schema.ts:77-78 |
| `currentStep` · `currentStepName` · `stepUpdatedAt` · `stepHistory` | projects | schema.ts:82-85 |
| `description` | projects (texto livre) | schema.ts:80 |
| `confirmedCnaes` | projects (JSON) | schema.ts:81 |
| `faturamentoAnual` | projects | schema.ts:115 |
| `profileVersion` | projects (já preparado para versionamento) | schema.ts:148 |
| `consistencyStatus` · `consistencyAcceptedRisk*` | projects (gate consistência v6.0) | schema.ts:150-155 |

### §2.2. Campos MANTIDOS com renomeação

Conceito preservado; rótulo muda para alinhar ao vocabulário dimensional do ADR-0031.

| AS-IS (hoje) | Target (ADR-0031) | Referência AS-IS | Observação |
|---|---|---|---|
| `taxRegime` (enum) | `regime` (dimensão §5 Dim. Canônicas) | schema.ts:87-91 | Mesmo domínio de valores; renomeação apenas do campo |
| `operationProfile.operationType` | compõe `papel_na_cadeia` | schema.ts:120 · risk-eligibility.ts:34-40 | Valores `industria\|comercio\|servicos\|misto\|agronegocio\|financeiro` serão derivados, não mais diretos (ver §2.5) |
| `taxComplexity.usesTaxIncentives` | `territorio[]` contém `ZFM`/`ALC`/`incentivado` | schema.ts:121 | Booleano atual vira enum por tipo de incentivo |
| `taxComplexity.hasInternationalOps` | `papel_na_cadeia` contém `importador\|exportador` | schema.ts:121 | Booleano atual substituído por papel explícito |
| `taxComplexity.usesMarketplace` | `papel_na_cadeia` contém `marketplace` (ou `intermediador`) | schema.ts:121 | Depende de dúvida Q-3 (§8) |
| `operationProfile.multiState` (bool) | `territorio[]` contém `interestadual` | schema.ts:120 | Binário vira participação em dimensão |
| `operationProfile.clientType[]` | **descartado da dimensão** — migra para `operational_context` fora do arquétipo | schema.ts:120 | ADR-0031 não inclui tipo de cliente nas 5 dimensões canônicas; vide §2.3 |

### §2.3. Campos EXCLUÍDOS do Perfil (Target)

Saem do "perfil" que alimenta M1→M2. Podem permanecer no banco por compatibilidade (política ADR-0032 §4 proíbe DROP retroativo em histórico), mas **não participam mais** da derivação do arquétipo.

| Campo AS-IS | Local | Motivo da exclusão |
|---|---|---|
| `operationProfile.clientType[]` (B2B/B2C) | schema.ts:120 | ADR-0031 §Dimensões não inclui tipo de cliente; classificação tributária não depende disso |
| `financialProfile.paymentMethods[]` | schema.ts:122 | Mesmo motivo — irrelevante para IS/CBS/IBS |
| `financialProfile.hasIntermediaries` | schema.ts:122 | Sobrepõe `papel_na_cadeia` (intermediador) |
| `governanceProfile.*` (hasTaxTeam, hasAudit, hasTaxIssues) | schema.ts:123 | Orientação de atuação consultiva, não tributação |
| `operationProfile` → `tipoOperacao` livre-string | project-profile-extractor.ts:39 | Free-text substituído por enums fechados (ADR-0031 Princípio 3) |
| `taxComplexity.*` (todos 3) | schema.ts:121 | Reestruturado — booleanos viram ENUMs ou papéis explícitos (ver §2.2) |
| `corporateAnswers` · `operationalAnswers` (LEGADO v2.1) | schema.ts:125-126 | Marcados como legado no próprio schema; não contribuem |

Nota: **não deletar colunas**. Valores legados permanecem para auditoria e para reprodução de briefings antigos (ADR-0032 §3 Congelamento de briefing).

### §2.4. Campos RENOMEADOS — resumo canônico

Lista consolidada do §2.2 como tabela de lookup única:

| DE (AS-IS) | PARA (Target) |
|---|---|
| `projects.taxRegime` | `regime` |
| `projects.operationProfile.operationType` (entrada direta) | derivado, compõe `papel_na_cadeia` |
| `projects.operationProfile.multiState` (bool) | `territorio[]` contém `interestadual` |
| `projects.taxComplexity.hasInternationalOps` (bool) | `papel_na_cadeia` contém `importador`/`exportador` |
| `projects.taxComplexity.usesTaxIncentives` (bool) | `territorio[]` contém `incentivado`/`ZFM`/`ALC` |
| `projects.taxComplexity.usesMarketplace` (bool) | `papel_na_cadeia` contém `marketplace`/`intermediador` |

### §2.5. Campos NOVOS (Target)

Criados para atender ADR-0031 (dimensões) + ADR-0032 (metadata imutável). Nenhum existe hoje.

#### §2.5.1. Dimensões canônicas (ADR-0031)

Campos do arquétipo propriamente dito, vindos do preenchimento do formulário/questionário:

| Campo Target | Tipo | Fonte (ADR-0031) |
|---|---|---|
| `objeto` | `string[]` (enum fechado) | combustível, alimento, medicamento, serviço médico, serviço financeiro, bens/mercadorias, serviços, energia, … |
| `papel_na_cadeia` | `string` (enum fechado) | transportador, distribuidor, fabricante, varejista, intermediador, prestador, importador, exportador, marketplace, produtor |
| `tipo_de_relacao` | `string[]` (enum fechado) | venda, serviço, produção, intermediação, locação |
| `territorio` | `string[]` (enum fechado) | municipal, interestadual, internacional, ZFM, ALC, incentivado |
| `regime` | `string` (enum fechado) | simples_nacional, lucro_presumido, lucro_real, mei, regime_específico_setorial |

#### §2.5.2. Campos contextuais (ADR-0031 interface rascunho)

| Campo Target | Tipo | Uso |
|---|---|---|
| `subnatureza_setorial` | `string \| null` | presente só para setores regulados; disjunto de papel |
| `orgao_regulador` | `string[]` | ANEEL, ANATEL, ANP, CVM, BACEN, ANS, ANVISA, … |

#### §2.5.3. Metadata de imutabilidade (ADR-0032)

Obrigatórios em todo snapshot do arquétipo:

| Campo Target | Tipo | Semântica |
|---|---|---|
| `status_arquetipo` | enum | `pendente \| inconsistente \| bloqueado \| confirmado` (conforme Rodada D) |
| `motivo_bloqueio` | `string \| null` | presente apenas quando `status_arquetipo='bloqueado'` |
| `model_version` | `string` | `m1-v1.0.0` na primeira versão |
| `data_version` | `string` | ISO timestamp da geração do perfil |
| `perfil_hash` | `string` | SHA-256 do conteúdo serializado das dimensões + contextuais |
| `rules_hash` | `string` | SHA-256 das regras aplicadas (função de derivação + tabelas de enums) |
| `imutavel` | `true` (marker) | flag explícito documentando a política |

Dúvida aberta sobre composição de `rules_hash` registrada na §8 (Q-5).

### §2.6. Campos DERIVADOS

Calculados deterministicamente a partir das respostas do formulário atual + do novo questionário dimensional. Nunca preenchidos diretamente pelo usuário.

| Campo Target | Derivado de | Função |
|---|---|---|
| `papel_na_cadeia` | `posicao_na_cadeia_economica` (seed runner) + `operationProfile.operationType` + operações secundárias | Mapeamento enum-para-enum determinístico |
| `territorio[]` | `abrangencia_operacional` + `opera_multiplos_estados` + `opera_territorio_incentivado` + `uf_principal_operacao` + `possui_filial_outra_uf` | Agrega booleanos e arrays em dimensão territorial |
| `tipo_de_relacao[]` | `natureza_operacao_principal` + `fontes_receita` | Ex.: "Comercio"+"Venda de mercadoria" → `venda`; "Tecnologia"+"Assinatura/mensalidade" → `serviço` |
| `objeto[]` | `tipo_objeto_economico` + `ncms_principais` + `nbss_principais` + classificação de NCM/NBS por categoria | Enum fechado; **não usar substring match** (ADR-0031 Princípio 2) |
| `status_arquetipo` | pipeline de validação dimensional | `pendente` (inicial) → `inconsistente` (gaps) → `bloqueado` (controle negativo multi-CNPJ) → `confirmado` (usuário confirma) |
| `perfil_hash` | Dimensões + contextuais | SHA-256 determinístico |
| `rules_hash` | Código da função + tabelas de enums | SHA-256 determinístico — composição exata em aberto (§8 Q-5) |
| `OperationType` do Hotfix IS v1.2 | `papel_na_cadeia` + `tipo_de_relacao` + `objeto` | Mantido como **derivação legada** para compatibilidade do gate de elegibilidade; não é mais fonte primária |

---

## §3. Estratégia AS-IS / Transitional / Target

Política de não-migração (ADR-0032 §4) define a convivência:

| Fase | O que acontece | `profileVersion` | `model_version` |
|---|---|---|---|
| AS-IS | Perfis atuais continuam válidos (`profileVersion='1.0'`). Gate IS usa `operationType` direto | `1.0` | — (ausente) |
| Transitional | Novos perfis (após M1 GO) calculam dimensões; perfis antigos **não são recalculados** | `1.0` (legado) ou `m1-v1.0.0` (novo) | `null` ou `m1-v1.0.0` |
| Target | Todos os perfis novos têm `model_version` + `perfil_hash` + `rules_hash`. Briefings antigos permanecem íntegros (ADR-0032 §3) | `m1-v1.0.0` | `m1-v1.0.0` |

Não há "data de corte": é evento por projeto. Um mesmo cliente pode ter projeto velho (v1.0) e projeto novo (m1-v1.0.0) convivendo.

---

## §4. Campos que serão mantidos — lista consolidada

Atendendo explicitamente ao item 1 do entregável:

- `projects.id` · `name` · `clientId` · `status` · `createdById` · `createdByRole` · `createdAt` · `updatedAt` · `completedAt`
- `projects.description` (alimentado por `descricao_negocio_livre` — decisão P.O. §9.1.1)
- `projects.confirmedCnaes` (alimentado pelo modal existente via botão "Identificar CNAEs" — decisão P.O. §9.1.1; array de CNAEs múltiplos, editáveis, confirmados pelo usuário)
- `projects.faturamentoAnual` · `projects.profileVersion`
- `projects.currentStep*` · `stepHistory`
- `projects.mode` · `sessionToken`
- `projects.consistencyStatus` · `consistencyAcceptedRisk*`
- `projects.companySize` (mantido como atributo não-dimensional — ADR-0031 não elenca porte nas 5 dimensões)
- `projects.taxRegime` (mantido **e** renomeado para `regime` na serialização do arquétipo)
- `projects.questionnaireAnswers` · `productAnswers` · `serviceAnswers` · `cnaeAnswers` · `solarisSkippedIds` · `iagenSkippedIds` · `solarisSkippedAll` · `iagenSkippedAll` · `diagnosticStatus`
- `projects.briefingContent*` · `riskMatricesData*` · `actionPlansData*` · `scoringData` · `decisaoData` (geração de output — não são "perfil")

---

## §5. Campos que serão excluídos — lista consolidada

Atendendo ao item 2. Os campos saem do escopo de **composição do arquétipo**, mas permanecem no banco:

- `projects.operationProfile.clientType[]`
- `projects.operationProfile.operationType` (deixa de ser entrada direta; vira derivado)
- `projects.taxComplexity.hasInternationalOps`
- `projects.taxComplexity.usesTaxIncentives`
- `projects.taxComplexity.usesMarketplace`
- `projects.financialProfile.paymentMethods[]`
- `projects.financialProfile.hasIntermediaries`
- `projects.governanceProfile.hasTaxTeam`
- `projects.governanceProfile.hasAudit`
- `projects.governanceProfile.hasTaxIssues`
- `projects.corporateAnswers` · `operationalAnswers` (já marcados LEGADO em schema.ts:125-126)

---

## §6. Campos que serão renomeados — lista consolidada

Atendendo ao item 3:

| DE | PARA |
|---|---|
| `taxRegime` | `regime` |
| `operationProfile.multiState` (bool) | `territorio[]` ∋ `interestadual` |
| `taxComplexity.hasInternationalOps` (bool) | `papel_na_cadeia` ∋ `importador` ∨ `exportador` |
| `taxComplexity.usesTaxIncentives` (bool) | `territorio[]` ∋ `incentivado`/`ZFM`/`ALC` |
| `taxComplexity.usesMarketplace` (bool) | `papel_na_cadeia` ∋ `marketplace`/`intermediador` |

Renomeação pura (`taxRegime`→`regime`) coexiste com transformações semânticas (booleanos → participação em enum fechado).

---

## §7. Campos novos — lista consolidada

Atendendo ao item 4. Nenhum existe hoje no banco ou na interface `ProjectProfile`:

**Dimensões (5):** `objeto[]` · `papel_na_cadeia` · `tipo_de_relacao[]` · `territorio[]` · `regime`
**Contextuais (2):** `subnatureza_setorial` · `orgao_regulador[]`
**Metadata ADR-0032 (7):** `status_arquetipo` · `motivo_bloqueio` · `model_version` · `data_version` · `perfil_hash` · `rules_hash` · `imutavel`

Total: **14 campos novos**.

---

## §8. Campos derivados — lista consolidada

Atendendo ao item 5. Derivações determinísticas, nunca editáveis por usuário:

- `papel_na_cadeia` ← função pura de (posição na cadeia + operações secundárias + operationType legado)
- `territorio[]` ← função pura de (abrangência + multi-estado + filiais + UF principal + incentivado)
- `tipo_de_relacao[]` ← função pura de (natureza da operação + fontes de receita)
- `objeto[]` ← função pura de (tipo de objeto econômico + NCM/NBS + classificação de categoria)
- `status_arquetipo` ← pipeline (preenchimento → validação dimensional → confirmação usuário)
- `perfil_hash` ← SHA-256 das dimensões + contextuais
- `rules_hash` ← SHA-256 do ruleset (composição em aberto — Q-5)
- `OperationType` (Hotfix IS) ← derivação **reversa** de papel+relação+objeto, para manter compatibilidade do gate existente sem quebrar `risk-eligibility.ts`

---

## §9. Impacto no fluxo E2E

Atendendo ao item 6. Mudanças que o usuário **perceberia** + integrações internas afetadas.

### §9.1. Fluxo do usuário (`client/src/pages/`)

| Etapa atual | Mudança proposta |
|---|---|
| `NovoProjeto.tsx` (Etapa 1) | **Ver §9.1.1 — decisão P.O. 2026-04-24 sobre captura de CNAE e remoção de "Cliente Vinculado"** |
| `QuestionarioV3.tsx` (Etapa 2) | **Adicionar** perguntas dimensionais ausentes: papel na cadeia, tipo de relação, território, objeto. Enums fechados (radios/checkboxes, não free text) |
| Novo **ConfirmacaoPerfil** (não existe hoje) | Tela nova — usuário **confirma** o perfil dimensional derivado antes de seguir (ADR-0031 Princípio 6). Dispara congelamento (ADR-0032 §1) |
| `BriefingV3.tsx` (Etapa 3) | Mantém-se imutável após geração (ADR-0032 §3). Briefings antigos **não regeneram** com regras novas |
| `MatrizesV3.tsx` (Etapa 4) | Consome arquétipo versionado — se perfil é `m1-v1.0.0`, regras novas; se é `1.0` (legado), fluxo v3 atual |
| `PlanoAcaoV3.tsx` (Etapa 5) | Herda versão do arquétipo do projeto |

#### §9.1.1. NovoProjeto.tsx — Decisão P.O. 2026-04-24 (CNAE + Cliente Vinculado)

**Decisão formal do P.O.:** não reescrever o RAG/LLM atual de CNAE. Reusar a rotina/modal já testada em produção. Mudar apenas o **ponto de acionamento** e remover campos que não alimentam o Perfil da Entidade.

**Regras vinculantes:**

1. **Reuso, não reescrita** — código atual do modal CNAE (RAG + LLM) é mantido intacto. Zero alteração em `server/` ou na lógica de sugestão
2. **Acionamento por botão explícito** — após preenchimento de `descricao_negocio_livre`, usuário clica em novo botão **"Identificar CNAEs"** para abrir o modal. O botão "Avançar" **não** dispara o modal
3. **Resultado = `cnaes[]` múltiplos** — usuário pode confirmar 1+ CNAEs sugeridos; lista é editável (adicionar/remover) antes de avançar
4. **Cliente Vinculado removido do fluxo M1** — campo não alimenta o Perfil da Entidade; permanece em `projects.clientId` (preservado por ADR-0032 §4), mas não é capturado nesta etapa
5. **Avançar puro** — botão "Avançar" só valida existência de `cnaes[]` confirmados e `descricao_negocio_livre` preenchida; não abre modal

**Diff conceitual no form (NovoProjeto.tsx):**

```diff
  [Campo: Nome do projeto]
  [Campo: Descrição do negócio (textarea)]          — alimenta descricao_negocio_livre
- [Campo: Cliente Vinculado (select)]               — REMOVIDO do fluxo M1
+ [Botão "Identificar CNAEs"]                       — NOVO: abre modal com RAG/LLM existente
  [Lista de CNAEs sugeridos/confirmados (editável)] — alimenta confirmedCnaes []
  [Botão Avançar]                                   — valida e avança; NÃO abre modal
```

**Impacto nos artefatos:**
- `NovoProjeto.tsx` (frontend): reorganizar ordem + adicionar botão + remover campo; **não** toca código RAG/LLM
- Modal CNAE existente: inalterado
- `server/routers/` (endpoints de sugestão CNAE): inalterados
- `projects.clientId`: continua gravado (pré-M1 ou via contexto do projeto), só não é capturado neste form

**Pré-requisito futuro (Gate UX):** mockup HTML atualizado em `docs/epic-830-rag-arquetipo/mockups/MOCKUP_novo-projeto.html` (a criar, fora de escopo pré-M1).

### §9.2. Integrações internas

- **M1 → M2 (RAG):** consome snapshot imutável. Filtro pré-RAG passa a usar `papel_na_cadeia` + `objeto` como eixos principais (ver Q-1 pendente no CONTRATOS-ENTRE-MILESTONES.md)
- **M1 → M6 (Riscos):** `risk-eligibility.ts` continua funcional via derivação reversa (`OperationType` calculado). Zero quebra
- **Hotfix IS gate:** não alterar `server/lib/risk-eligibility.ts`. Derivação reversa preserva contrato atual
- **RAG 2.509 chunks:** inalterado — filtro acontece **antes** do vector search, não no corpus

### §9.3. Proibições herdadas

- Não recalcular briefing de projeto com perfil `1.0` quando regras de `m1-v1.0.0` entrarem em vigor (ADR-0032 §3)
- Não migrar dados automaticamente (ADR-0032 §4)
- Não remover colunas legadas (mantêm auditoria)
- **Não** reescrever o fluxo RAG/LLM de sugestão de CNAE (§9.1.1 · decisão P.O. 2026-04-24)
- **Não** disparar modal CNAE a partir do botão "Avançar" — só do botão explícito "Identificar CNAEs"
- **Não** capturar "Cliente Vinculado" no form M1 — campo permanece em `projects.clientId` mas fora do fluxo de confirmação do perfil

---

## §10. Impacto no schema

Atendendo ao item 7. Só documentação; execução em M1+.

### §10.1. ADD COLUMN necessários (tabela `projects`)

Quando implementar (não agora):

```sql
-- Arquétipo dimensional (JSON único, imutável após confirmação)
ALTER TABLE projects ADD COLUMN archetype JSON NULL
  COMMENT 'Snapshot imutável do Perfil da Entidade v2 (ADR-0031 + ADR-0032)';

-- Metadata de versionamento explícito
ALTER TABLE projects ADD COLUMN archetype_version VARCHAR(20) NULL
  COMMENT 'Versão do modelo (ex: m1-v1.0.0)';

ALTER TABLE projects ADD COLUMN archetype_perfil_hash CHAR(64) NULL
  COMMENT 'SHA-256 do conteúdo das dimensões + contextuais';

ALTER TABLE projects ADD COLUMN archetype_rules_hash CHAR(64) NULL
  COMMENT 'SHA-256 do ruleset aplicado';

ALTER TABLE projects ADD COLUMN archetype_confirmed_at TIMESTAMP NULL
  COMMENT 'Quando usuário confirmou — marca imutabilidade';
```

Migração reversível; rollback = `DROP COLUMN` nas 5 novas. Colunas existentes não tocadas.

Não há uso de enum MySQL para as dimensões — elas ficam no JSON para evitar ALTER ENUM (que é pesado no TiDB). Validação por TypeScript + tests determinísticos.

### §10.2. DROP COLUMN — proibido

Política ADR-0032 §4. Colunas legadas (`operationProfile`, `taxComplexity`, `financialProfile`, `governanceProfile`, `corporateAnswers`, `operationalAnswers`) **permanecem** no schema indefinidamente.

### §10.3. Índices

Avaliar criar em M1+:

```sql
CREATE INDEX idx_projects_archetype_version ON projects(archetype_version);
-- Para queries do RAG filter que precisam seletar perfis por versão de modelo
```

Fora do escopo pré-M1.

### §10.4. Rollback seguro

- **CI:** migration guardada por `scripts/db-push-guard.mjs` (regra database.md)
- **Tela branca:** ausência de `archetype` não quebra fluxo — retorna ao modo `profileVersion='1.0'`
- **Cascata:** nenhum dado anterior é alterado
- **Catastrófico:** `DROP COLUMN` das 5 novas reverte 100%

---

## §11. Dúvidas pendentes para o P.O.

Atendendo ao item 8. Cada dúvida precisa decisão antes de M1-F2 (implementação). Referências cruzadas com `PENDING-DECISIONS.md` e `BLOCKERS-pre-m1.md`.

### Q-1. `clientType` (B2B/B2C) — realmente sai? — **RESOLVIDA 2026-04-24 · campo contextual não-arquétipo**

ADR-0031 não elenca tipo de cliente nas 5 dimensões.

**Decisão P.O. 2026-04-24:** `clientType` é mantido como **campo contextual fora do arquétipo**, preservando compatibilidade com código legado e habilitando consumo por camadas não-core (briefing, UX, recomendações comerciais).

**5 regras vinculantes:**

1. `clientType` **NÃO** entra nas 5 dimensões canônicas do Perfil da Entidade (ADR-0031 inalterado)
2. `clientType` **NÃO** afeta `status_arquetipo` (não participa da derivação)
3. `clientType` **NÃO** afeta gate E2E (não bloqueia avanço)
4. `clientType` **PODE** alimentar briefing, UX e contexto comercial (consumidores não-arquétipo)
5. `clientType` permanece em `operationProfile.clientType[]` no banco para compatibilidade

**Implicação em `perfil_hash` e `rules_hash`:**
- `clientType` **NÃO** entra em `perfil_hash` (só as 5 dimensões + contextuais do arquétipo entram)
- `clientType` **NÃO** entra em `rules_hash` (manifesto só tem regras do arquétipo)
- Mudança de `clientType` no projeto não invalida snapshot do arquétipo

**Diferenciação vs `subnatureza_setorial` e `regime_especifico`:**
- `subnatureza_setorial` e `regime_especifico` são **contextuais DO arquétipo** — entram em `perfil_hash` e são usados em LOGICAL-CONFLICTS
- `clientType` é **contextual FORA do arquétipo** — não entra em hash; consumidores são briefing/UX apenas

### Q-2. `operationProfile.operationType` — derivar ou manter entrada direta? — **RESOLVIDA 2026-04-24 · Opção A**

Hotfix IS v1.2 trata `operationType` como campo de entrada validado (enum fixo em `risk-eligibility.ts`). Modelo dimensional propõe derivar a partir de papel+relação+objeto.

**Decisão aprovada pelo P.O. (2026-04-24) — Opção A:** `operationType` deixa de ser input do usuário e passa a ser **campo derivado** das dimensões.

**Regras vinculantes da decisão:**

1. `deriveOperationType(perfil)` deve ser **determinística** — sem LLM, sem `contains()`, sem fallback silencioso
2. **Ambiguidade lança erro**, não warning (lição Z-17)
3. Campo `operationProfile.operationType` **permanece no banco** como valor derivado (não DROP — ADR-0032 §4)
4. **Projetos legados não recalculam** (`profileVersion='1.0'` preservam `operationType` original)
5. Snapshot do arquétipo **deve registrar** `derived_legacy_operation_type` + `rules_hash` (ADR-0032 §2)
6. **Usuário não pode editar** `operationType` em projetos `m1-v1.0.0+` — campo é read-only derivado

**Artefato-filho obrigatório:** `docs/epic-830-rag-arquetipo/specs/DERIVATION-OPERATIONTYPE.md` (criado nesta sessão) contém a tabela de decisão `(papel_na_cadeia, tipo_de_relacao, objeto) → OperationType`.

**Consequências formalizadas:**
- `risk-eligibility.ts` **NÃO é tocado** — preserva contrato de gate Hotfix IS v1.2/v2/v2.1
- Formulário M1 remove pergunta direta de `operationType`; cliente responde dimensões; sistema deriva
- Projetos pós-GO M1 escrevem `operationProfile.operationType` com valor computado (não de input)

### Q-3. `marketplace` é `papel_na_cadeia` ou `tipo_de_relacao`? — **RESOLVIDA 2026-04-24**

ADR-0031 exemplos canônicos (transportadora/distribuidora/refinaria) não cobrem marketplace.

**Decisão aprovada pelo P.O. (2026-04-24):** marketplace **não é enum próprio**. É definido por **composição**:
- `papel_na_cadeia = "intermediador"` **E**
- `tipo_de_relacao = ["intermediação"]` (exclusivamente)

**Regra crítica:** se `papel_na_cadeia = "intermediador"` coexistir com `tipo_de_relacao` contendo `"venda"` (ou qualquer valor além de `"intermediação"`) → **AmbiguityError**. Marketplace-com-estoque não resolve para OperationType único.

**Consequências formalizadas:**
- Enum `papel_na_cadeia` (SPEC §3.3): valor `"marketplace"` **removido** — passa de 13 para 12 valores
- SPEC §2.2 derivação atualizada: `atua_como_marketplace_plataforma == true` mapeia para `intermediador` com constraint obrigatório em `tipo_de_relacao`
- Nova subseção SPEC §2.2.2 formaliza composição marketplace
- DERIVATION-OPERATIONTYPE §3.2 R-20 removida; R-21 desbloqueada (`intermediador` + apenas `intermediação` → `servicos`) + R-21-AMB adicionada (`intermediador` + `venda` → AmbiguityError)
- CANONICAL-RULES-MANIFEST §3.3 enum atualizado (12 valores)
- Cenários S04 (Marketplace de sellers) e S03 (E-commerce) do runner v3 precisam seeds alinhadas com composição; S04 testa caso canônico puro, S03 continua com `papel=varejista` (não é marketplace)

### Q-4. `multi-CNPJ info` — quais cenários disparam? — **RESOLVIDA 2026-04-24**

Runner v2 atual tem apenas V-05 binário (denied). Rodada D exige diferenciar estados.

**Decisão aprovada pelo P.O. (2026-04-24) — modelo canônico de 3 estados:**

| Estado | Condição na seed | Efeito |
|---|---|---|
| **NONE** | `integra_grupo_economico == false` (ou ausente) | Nada (nenhum blocker, nenhum efeito) |
| **INFO** | `integra_grupo_economico == true` E `analise_1_cnpj_operacional == true` | Não altera `status_arquetipo`; entra em `blockers_triggered` como `V-05-INFO` com `severity="INFO"` |
| **DENIED** | `integra_grupo_economico == true` E `analise_1_cnpj_operacional == false` | `status_arquetipo = "bloqueado"`; emite `V-05-DENIED` com `severity="BLOCK_FLOW"` |

**Regras vinculantes:**
1. NONE → nada
2. INFO → não altera status_arquetipo
3. DENIED → status_arquetipo = bloqueado

**Consequências formalizadas:**
- Suite v3 ganha **cenário S51** novo para cobrir estado INFO (Q-D6 RESOLVIDA junto — Opção A)
- Suite v3 total: **51 cenários** (50 PASS incluindo S51 INFO-PASS + 1 BLOCKED em S27)
- Gate GO do runner (§5.1) permanece `FAIL=0 ∧ BLOCKED=1` — independente do total (Q-C3 RESOLVIDA 2026-04-24 removeu AMBIGUOUS)
- Nova severity `INFO` introduzida em runner v3 (SPEC §7.2)
- Invariante IS-7 garante que `severity="INFO"` nunca afeta `status_arquetipo`
- Frontend M1: INFO renderiza como alerta não-bloqueante; DENIED bloqueia avanço com mensagem de orientação

### Q-5. Composição do `rules_hash` — **RESOLVIDA 2026-04-24 · Opção C**

ADR-0032 §2 exige `rules_hash` mas não especifica conteúdo. Propostas foram:
**Opção A:** hash só do código da função de derivação (SHA-256 do arquivo `.ts` concatenado)
**Opção B:** hash (código + tabelas de enums + `model_version`)
**Opção C:** hash de um **manifesto** (JSON com version + enums + nome de função), independente do bytecode

**Decisão aprovada pelo P.O. (2026-04-24) — Opção C:** `rules_hash` é hash do manifesto declarativo.

**Regras vinculantes:**
1. **Não** usar código-fonte como fonte de hash (bytecode é instável contra refactor)
2. **Não** usar dados de input (seed, respostas) — hash é do modelo, não da instância
3. **Usar JSON canônico** com ordem determinística (chaves lexicográficas, arrays mantêm ordem de definição)
4. **Hash apenas do modelo lógico** — dimensões + enums + derivações + regras de negócio declarativas

**Artefato-filho obrigatório:** `docs/epic-830-rag-arquetipo/specs/CANONICAL-RULES-MANIFEST.md` (criado nesta sessão) contém a estrutura canônica, versionamento e exemplos.

**Consequências formalizadas:**
- Refactor interno que preserva semântica **não muda** `rules_hash` (manifesto JSON inalterado)
- Adicionar regra nova exige bump de versão (processo de governança explícito)
- Auditoria humana do manifesto é legível (versus bytecode)
- Snapshots históricos permanecem reproduzíveis — manifesto antigo permanece disponível

### Q-6. `status_arquetipo` estados intermediários — **RESOLVIDA 2026-04-24**

Rodada D exige: `pendente | inconsistente | bloqueado | confirmado`.

**Decisão aprovada pelo P.O. (2026-04-24) — Opção 1 com interpretação híbrida:**

**Regras vinculantes:**
1. `confirmado` e `bloqueado` são **terminais** (ADR-0032 §1)
2. `AmbiguityError` da derivação → `inconsistente`
3. `V-05-INFO` (severity `"INFO"`) **não altera** `status_arquetipo`
4. `seed.user_confirmed = true` resolve estado `confirmado` no runner
5. Snapshot é **imutável** (ADR-0032)
6. Edição cria **novo snapshot** (preserva o anterior)

**Ajuste adicional (resolve Q-C2):** `missing_required_fields != empty` → `inconsistente`.

**Tabela de derivação determinística (primeira regra que bate vence):**

| # | Condição | `status_arquetipo` |
|---|---|---|
| 1 | `HARD_BLOCK` de negócio (V-05-DENIED) | `bloqueado` |
| 2 | `AmbiguityError` em `deriveOperationType()` | `inconsistente` |
| 3 | Conflito lógico entre dimensões | `inconsistente` |
| 4 | `missing_required_fields != empty` | `inconsistente` |
| 5 | `user_confirmed = true` (e nada acima disparou) | `confirmado` |
| 6 | default | `pendente` |

**Gate E2E:** frontend só permite avançar ao briefing quando `status_arquetipo == "confirmado"`.

**Semântica revista:**
- `pendente` = estado de espera coerente (dados válidos, sem issues, falta só a confirmação do usuário)
- `inconsistente` = qualquer issue detectada (quantitativa, qualitativa, ou de derivação legada) — 3 classes unificadas

**Consequências formalizadas:**
- SPEC-RUNNER §4 reescrita com 8 subseções (§4.1 a §4.8) cobrindo tabela determinística, transições, cenários, imutabilidade, gate E2E, invariantes IS-1 a IS-8, alinhamento com mockup
- SPEC-RUNNER §8.1 incorpora IS-1 a IS-8 formalmente
- DERIVATION-OPERATIONTYPE §4.3 atualizada — AmbiguityError → `status_arquetipo = "inconsistente"` + `derived_legacy_operation_type = null`
- Seed v3 ganha campo `user_confirmed: boolean` (Q-C1 RESOLVIDA junto)
- Q-C2 RESOLVIDA: missing_required_fields vai para `inconsistente`
- Mockup `docs/epic-830-rag-arquetipo/mockups/MOCKUP_perfil-confirmacao.html` registrado como pré-requisito para issue futura de implementação (Gate UX — REGRA-ORQ-09)
- Q-C4 aberta: artefato-filho `LOGICAL-CONFLICTS-v1.0.md` com enumeração das regras de conflito lógico + lista canônica de campos obrigatórios por dimensão

### Q-7. Compatibilidade com `profileVersion='1.0'` existente

Há projetos em produção com `profileVersion='1.0'` (schema.ts:148). ADR-0032 §4 proíbe migração automática.
**Dúvida:** novo `archetype_version` (m1-v1.0.0) **substitui** `profileVersion` ou **coexiste**?
**Opção A:** deprecate `profileVersion`, usa só `archetype_version` daqui pra frente
**Opção B:** ambos coexistem (`profileVersion` para legado v2.1, `archetype_version` para M1+)
**Recomendação:** Opção B — compatível com política de não-migração; cada campo anota sua era

### Q-7 RESOLVIDA 2026-04-24 — Coexistência dual

**Decisão P.O.:** ambos os campos coexistem indefinidamente. Nenhum é substituído.

| Campo | Tipo | Escrito por | Lido por | Quando |
|---|---|---|---|---|
| `profileVersion` | VARCHAR(20) existente | fluxo legado (pré-M1) | detecção de legado (`archetype_version IS NULL`) | valor `"1.0"` em projetos anteriores; **imutável** em projetos M1+ |
| `archetype_version` | VARCHAR(20) NOVA | fluxo M1+ (primeira confirmação) | detecção de M1+ | `"m1-v1.0.0"` quando `status_arquetipo="confirmado"` pela primeira vez |

**Detecção determinística:**
```
isProjetoM1(p)     ≡ p.archetype_version !== null
isProjetoLegado(p) ≡ p.archetype_version === null
```

**Regras vinculantes (IV-L1..L4 em SPEC-RUNNER §8.1):**
1. `profileVersion` **nunca** é modificada pelo sistema M1+ (preservação imutável)
2. `archetype_version` escrita apenas em projetos M1+ na primeira confirmação
3. Bump de `archetype_version` é aditivo no snapshot novo (ADR-0032 §4 não-migração)
4. Proibição P-7: alterar `profileVersion` de legado é defeito

**Consequências:**
- Zero migração de dados históricos
- Queries de auditoria simples: `WHERE archetype_version IS NOT NULL` para identificar M1+
- Legados continuam consumindo gate Hotfix IS via `operationType` original (intocado)
- ADR-0032 §4 totalmente respeitado

### Q-8. Posição do arquétipo no `status` do projeto — **RESOLVIDA 2026-04-24**

**Decisão P.O. 2026-04-24:** mapping 1-para-1 explícito com 4 valores novos no enum `projects.status`:

| `status_arquetipo` | `projects.status` (NOVO) |
|---|---|
| `pendente` | `perfil_pendente` |
| `inconsistente` | `perfil_inconsistente` |
| `bloqueado` | `perfil_bloqueado` |
| `confirmado` | `perfil_confirmado` |

**Posicionamento no enum:** entre `cnaes_confirmados` (existente) e `assessment_fase1` (existente). Total: 26 → 30 valores.

**Migration obrigatória em M1-F2** (não nesta fase): ALTER TABLE projects MODIFY COLUMN status ENUM(...). Rollback: DROP dos 4 valores — projetos legados preservados em estados pré-existentes (ADR-0032 §4).

**Invariantes** (formalizadas em SPEC-RUNNER §4.7.1):
- IS-M-1: `status_arquetipo = "confirmado"` ↔ `projects.status ∈ {perfil_confirmado, assessment_fase1, ..., arquivado}`
- IS-M-2: `status_arquetipo = "bloqueado"` → `projects.status = "perfil_bloqueado"` (terminal)
- IS-M-3: Edição após confirmado volta para `perfil_pendente` (preserva snapshot antigo)
- IS-M-4: Estados `perfil_*` apenas em projetos `m1-v1.0.0+`

---

## §12. Não-escopo deste documento

Conforme ADR-0031 §Não-escopo e ADR-0032 §12:

- Implementação de formulário dimensional
- Código de derivação de dimensões
- Algoritmo de cálculo de hashes
- UI da tela de confirmação
- Migração de dados históricos (proibida)
- Impacto no score/confidence (ADR-0032 §12)
- UX do versionamento ao usuário
- Retenção/arquivamento de snapshots antigos

Serão tratados em specs próprios ou ADRs subsequentes.

---

## §13. Referências

- `docs/epic-830-rag-arquetipo/adr/ADR-0031-modelo-dimensional.md`
- `docs/epic-830-rag-arquetipo/adr/ADR-0032-imutabilidade-versionamento.md`
- `docs/epic-830-rag-arquetipo/specs/CONTRATOS-ENTRE-MILESTONES.md` (contrato M1→M2)
- `docs/epic-830-rag-arquetipo/specs/BLOCKERS-pre-m1.md`
- `docs/epic-830-rag-arquetipo/specs/PENDING-DECISIONS.md`
- Código AS-IS (branch `main` / worktree `tmp-v757-rebase`):
  - `drizzle/schema.ts:31-156`
  - `server/lib/project-profile-extractor.ts:30-50`
  - `server/lib/risk-eligibility.ts:34-40`
- Runner Rodada D (worktree `tmp-m1-50push`):
  - `tests/archetype-validation/run-50-v2.mjs:119-138`
  - `tests/archetype-validation/M1-arquetipo-50-casos-brasil-v2.json`

## §14. Status

DRAFT. Aguardando veredito do P.O. sobre Q-1 a Q-8 da §11 antes de publicar como PROPOSED. Nenhum código tocado. Implementação permanece bloqueada por REGRA-M1-GO-NO-GO.
