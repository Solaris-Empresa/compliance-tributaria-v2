# M1 — ARQUÉTIPO FORM DELTA v5.1

> **Status:** `ARTEFATO_PRE_M1` · 2026-04-24  
> **Baseline anterior:** v5 (commit `c9a4c03`)  
> **Fontes:** ADR-0031 (commit `886f446`) · ADR-0032 (commit `90d48d2`) · SPEC-v3.1-rev1 · DATA_DICTIONARY · UX_DICTIONARY · FLOW_DICTIONARY  
> **Mockup:** `MOCKUP_perfil_entidade_v5_1.html`  
> **Regra:** Artefato pré-M1. Não implementar sem prompt do Orquestrador e aprovação do P.O.

---

## 1. Ajustes aplicados nesta versão (4 ajustes do P.O.)

| ID | Ajuste P.O. | Mudança no artefato |
|----|-------------|---------------------|
| **A1** | Remover `acknowledgeInconsistency` — inconsistente exige correção | Removido de C2 e de todos os estados. Substituído por "Corrigir dados" como único caminho. |
| **A2** | ADR-0031 e ADR-0032 no mesmo branch | Localizados em `docs/epic-830-rag-arquetipo` (commits `886f446` e `90d48d2`). Referenciados explicitamente no mockup. GAP-01 e GAP-02 resolvidos. |
| **A3** | `buildPerfilEntidade(project)` como contrato obrigatório; `status_arquetipo` como campo obrigatório no schema | Documentados como contratos obrigatórios neste delta (seções 4 e 5). |
| **A4** | Separar erro estrutural (inconsistente) de risco aceito | Separador conceitual explícito em S3 e C2. Tabela de distinção na seção 3. |

---

## 2. O que mudou de v5 → v5.1

| Campo / Elemento | v5 | v5.1 |
|------------------|----|------|
| Estado C2 | `acknowledgeInconsistency` checkbox presente | Removido. Único caminho: "Corrigir dados". |
| ADR-0031 / ADR-0032 | GAP-01 e GAP-02 (não encontrados) | Resolvidos. Branch: `docs/epic-830-rag-arquetipo`. Commits: `886f446` / `90d48d2`. |
| `buildPerfilEntidade` | GAP-08 (a criar) | Contrato obrigatório documentado (seção 4). |
| `status_arquetipo` | GAP-10 (campo a criar) | Campo obrigatório documentado (seção 5). |
| Separação de conceitos | Não explícita | Separador visual em S3 e C2 + tabela na seção 3. |

---

## 3. Separação de conceitos: Erro Estrutural vs. Risco Aceito

> **Regra P.O. (Ajuste A4):** Estado "inconsistente" exige sempre correção dos dados. Não existe "aceitar inconsistência" para liberar o gate do Perfil da Entidade.

| Conceito | Definição | Caminho no fluxo M1 | Mecanismo existente |
|----------|-----------|---------------------|---------------------|
| **Erro Estrutural** (`inconsistente`) | Conflito lógico entre dados declarados e regras do sistema. O dado está errado — não é escolha de negócio. | Único caminho: corrigir o dado. Sem override. | DET-001 a DET-005 em `consistencyEngine.ts` |
| **Risco Aceito** (`acceptRisk`) | Usuário está ciente de uma inconsistência de negócio e registra justificativa. Não é erro do sistema — é decisão consciente. | Registra ciência. NÃO libera gate M1. NÃO confirma perfil. | `acceptRisk()` em `consistencyRouter.ts:208-238` (AS-IS, gate pré-diagnóstico) |

**Implicação para implementação:** O mecanismo `acceptRisk()` existente no AS-IS é para o gate de consistência pré-diagnóstico (fora do escopo M1). O gate do Perfil da Entidade (M1 Target) não tem override — `status_arquetipo = 'inconsistente'` exige correção dos dados.

---

## 4. Contrato obrigatório: `buildPerfilEntidade(project)`

> **Status:** A CRIAR · Não existe no código atual · Implementação bloqueada pela REGRA-M1-GO-NO-GO

### 4.1 Definição

```typescript
// @shared/perfilEntidade.ts — view TypeScript pura (sem I/O de banco)
function buildPerfilEntidade(project: Project): PerfilEntidade
```

### 4.2 Responsabilidades

O `buildPerfilEntidade` é o **adaptador Transitional** que transforma o modelo atual (`Project`) no modelo dimensional canônico (`PerfilEntidade`). Ele deve:

1. Mapear campos do `Project` para as 5 dimensões (ADR-0031).
2. Derivar `status_arquetipo` com base nas regras de completude e consistência.
3. Calcular `eligibility.overall` com base no `status_arquetipo` e nos bloqueadores.
4. Retornar snapshot imutável (ADR-0032) após confirmação.
5. Ser determinístico: mesma entrada → mesma saída.

### 4.3 Contrato de tipos

```typescript
interface PerfilEntidade {
  // Identificação
  project_id: string;
  cnpj: string;
  project_name: string;
  company_type: string;
  company_size: string;
  annual_revenue_range: string;
  tax_regime: TaxRegime;

  // CNAEs
  cnaes: Array<{ code: string; description: string; confidence: 'alta' | 'media' | 'baixa'; source: 'cnae' | 'user' | 'infer'; }>;

  // 5 Dimensões (ADR-0031)
  dim_objeto: string[];
  dim_papel_na_cadeia: string[];
  dim_tipo_de_relacao: string[];
  dim_territorio: TerritorioDim;
  dim_regime: RegimeDim;

  // Status e gate
  status_arquetipo: StatusArquetipo;   // enum canônico — ver seção 5
  eligibility: EligibilityResult;

  // Versionamento (ADR-0032)
  model_version: string;               // ex: 'm1-v1.0.0'
  data_version: string;                // timestamp ISO
  perfil_hash: string;                 // hash do conteúdo
  rules_hash: string;                  // hash das regras aplicadas

  // Auditoria
  confirmed_at?: string;               // ISO timestamp
  confirmed_by?: string;               // user_id
}
```

### 4.4 Localização no código (a criar)

```
shared/perfilEntidade.ts          ← buildPerfilEntidade() + tipos
server/routers/m1-perfil.ts       ← tRPC procedures (a criar)
drizzle/schema.ts                 ← tabela archetype_profiles (a criar)
```

---

## 5. Campo obrigatório: `status_arquetipo`

> **Status:** A CRIAR em `drizzle/schema.ts` · Implementação bloqueada pela REGRA-M1-GO-NO-GO

### 5.1 Enum canônico

```typescript
// shared/perfilEntidade.ts
type StatusArquetipo = 'pendente' | 'inconsistente' | 'bloqueado' | 'confirmado';
```

### 5.2 Tabela de transições

| De | Para | Condição de transição |
|----|------|-----------------------|
| `pendente` | `pendente` | campos obrigatórios faltando OU completude < 100% |
| `pendente` | `inconsistente` | todos os campos preenchidos + DET warnings (HIGH/MEDIUM) |
| `pendente` | `bloqueado` | DET CRITICAL OU multi-CNPJ (V-05) |
| `inconsistente` | `inconsistente` | erro estrutural não corrigido |
| `inconsistente` | `pendente` | usuário corrige dado → completude < 100% |
| `inconsistente` | `bloqueado` | DET CRITICAL detectado após preenchimento |
| `inconsistente` | `confirmado` | ❌ PROIBIDO — inconsistente exige correção |
| `bloqueado` | `inconsistente` | HARD_BLOCK resolvido + DET warning restante |
| `bloqueado` | `confirmado` | ❌ PROIBIDO — bloqueado exige correção |
| qualquer | `confirmado` | completude 100% + zero erros estruturais + zero HARD_BLOCKs + CTA acionado |

### 5.3 Schema Drizzle (a criar)

```typescript
// drizzle/schema.ts — a adicionar
export const archetypeProfiles = mysqlTable('archetype_profiles', {
  id: varchar('id', { length: 36 }).primaryKey(),
  project_id: varchar('project_id', { length: 36 }).notNull(),
  status_arquetipo: mysqlEnum('status_arquetipo', ['pendente', 'inconsistente', 'bloqueado', 'confirmado']).notNull().default('pendente'),
  eligibility_overall: mysqlEnum('eligibility_overall', ['allowed', 'denied', 'pending']).notNull().default('pending'),
  model_version: varchar('model_version', { length: 20 }).notNull(),
  data_version: varchar('data_version', { length: 30 }).notNull(),
  perfil_hash: varchar('perfil_hash', { length: 64 }),
  rules_hash: varchar('rules_hash', { length: 64 }),
  snapshot_json: text('snapshot_json'),           // JSON imutável (ADR-0032)
  confirmed_at: bigint('confirmed_at', { mode: 'number' }),
  confirmed_by: varchar('confirmed_by', { length: 36 }),
  created_at: bigint('created_at', { mode: 'number' }).notNull(),
  updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
});
```

---

## 6. ADR-0031 e ADR-0032 — localização e resumo

| ADR | Título | Branch | Commit | Status |
|-----|--------|--------|--------|--------|
| **ADR-0031** | Modelo Dimensional do Perfil da Entidade | `docs/epic-830-rag-arquetipo` | `886f446` | PROPOSED · Aprovado para documentação pré-M1 |
| **ADR-0032** | Imutabilidade, Versionamento e Não-Migração | `docs/epic-830-rag-arquetipo` | `90d48d2` | PROPOSED · Aprovado para documentação pré-M1 |

### ADR-0031 — Pontos-chave para o mockup

- 5 dimensões independentes: `objeto`, `papel_na_cadeia`, `tipo_de_relacao`, `territorio`, `regime`
- Regras operam por dimensão isolada — não por produto cartesiano
- LLM pode auxiliar o usuário, mas **não pode ser fonte de verdade do modelo** (§Princípio 5)
- O usuário deve confirmar o Perfil da Entidade antes de seguir no fluxo (§Princípio 6)
- Derivações devem usar enums fechados, tabelas oficiais ou listas controladas (§Princípio 3)

### ADR-0032 — Pontos-chave para o mockup

- Perfil confirmado é **imutável** — qualquer alteração gera novo snapshot
- Campos de versionamento obrigatórios: `model_version`, `data_version`, `perfil_hash`, `rules_hash`
- Briefing gerado é imutável — alterações no perfil não alteram briefing anterior
- Não existe migração automática de perfis existentes
- M2 consome snapshot versionado do Perfil da Entidade

---

## 7. Gate E2E — regra canônica

```typescript
// Condição necessária e suficiente para liberar o gate do Perfil da Entidade
const gateLiberated =
  status_arquetipo === 'confirmado' &&
  erros_estruturais.length === 0;

// Condição de eligibility
const eligibilityAllowed =
  status_arquetipo === 'confirmado' &&
  hard_blocks.length === 0 &&
  multi_cnpj === false;
```

**Regras invariantes (não regredir):**

1. Score alto NÃO libera o fluxo — gate depende exclusivamente de `status_arquetipo = 'confirmado'` AND `erros_estruturais.length === 0`
2. `status_arquetipo = 'inconsistente'` exige correção dos dados — sem override, sem `acknowledgeInconsistency`
3. DET-001 CRITICAL → `denied` sem override no E2E (mudança intencional v3.1 vs AS-IS)
4. PC-05 é prévia exploratória — não representa motor de riscos real; não bloqueia nem libera gate
5. Fórmula do score é exploratória — pesos e cálculo dependem de SPEC aprovada
6. Snapshot imutável após confirmação (ADR-0032)
7. `cnae_principal_input` removido — substituído por modal `open_cnae_modal` (herdado v4)
8. "Perfil da Entidade" na UI — "arquétipo" é termo técnico interno

---

## 8. GAPs atualizados

| ID | GAP | Status v5.1 |
|----|-----|-------------|
| **GAP-01** | ADR-0031 não encontrado | ✅ RESOLVIDO — commit `886f446`, branch `docs/epic-830-rag-arquetipo` |
| **GAP-02** | ADR-0032 não encontrado | ✅ RESOLVIDO — commit `90d48d2`, branch `docs/epic-830-rag-arquetipo` |
| **GAP-03** | Fórmula do score exploratória | ⏳ ABERTO — depende de SPEC aprovada |
| **GAP-04** | Inferência de CNAEs: lookup vs. LLM vs. RAG | ⏳ ABERTO — depende de spec de integração |
| **GAP-05** | Comportamento mobile do painel | ⏳ ABERTO — baixa prioridade |
| **GAP-06** | PC-05 integrado ao motor de riscos real | ⏳ ABERTO — exploratório |
| **GAP-07** | `acknowledgeInconsistency` vs. `acceptRisk()` | ✅ RESOLVIDO — A1: `acknowledgeInconsistency` removido; `acceptRisk()` é AS-IS, fora do escopo M1 |
| **GAP-08** | `buildPerfilEntidade(project)` não existe | ⏳ ABERTO — contrato documentado na seção 4; implementação bloqueada |
| **GAP-09** | Tabela `eligibility_audit_log` não existe | ⏳ ABERTO — migration pendente |
| **GAP-10** | Campo `status_arquetipo` não existe no schema | ⏳ ABERTO — schema documentado na seção 5; implementação bloqueada |

---

## 9. Itens exploratórios (não implementar sem aprovação P.O.)

- Algoritmo de score (GAP-03)
- Inferência de CNAEs (GAP-04)
- PC-05 integrado ao motor de riscos real (GAP-06)
- Comportamento mobile (GAP-05)

---

## 10. Backlog pendente (herdado — não agir sem autorização P.O.)

- Criar migration para `eligibility_audit_log` (GAP-09)
- Criar `archetype_profiles` table e `status_arquetipo` field (GAP-10)
- Criar `buildPerfilEntidade()` em `@shared/perfilEntidade.ts` (GAP-08)
- Criar `drizzle/downs/0089_down.sql`
- Resolver divergência sandbox main (tag `backup/main-pre-sync-20260421-230108`)
- Corrigir trigger `smoke-post-deploy.yml`
- Retomar Sprint Z-22 — Issue #725 (Dashboard Compliance v3)
- Fazer cherry-pick de ADR-0031 e ADR-0032 para `docs/m1-arquetipo-exploracao` (pendente aprovação P.O.)
