# SPEC v3.1 — M1-PERFIL-ENTIDADE

> Status: `DRAFT_FOR_PO_APPROVAL` · 2026-04-23
> Incorpora os 8 pontos da VALIDACAO-SPEC-v3 com os ajustes conceituais solicitados pelo P.O.
> **Target model NÃO reduzido ao estado atual do código** — 3 camadas explícitas separam AS-IS / Transitional / Target.

---

## O que mudou de v3 → v3.1

| # | Ajuste | Como foi incorporado |
|---|---|---|
| 1 | Listar `companyProfile` como origem | Adicionada à lista de 5+1 origens (§2.1) |
| 2 | Separar campos existentes / transitional / novos | Nova estrutura **3 camadas** (§3) |
| 3 | Resolver conflito `possui_bens`/`possui_servicos` | Mantidos como **campo independente + derivação redundante** com alerta se divergirem (§3.4) |
| 4 | Enum canônico único para `status_arquetipo` | **Decidido: 4 valores** `pendente / inconsistente / bloqueado / confirmado` (§4) |
| 5 | Injection points de `STOP_IF_NOT_ELIGIBLE` em seção própria | §7 separado da regra de produto |
| 6 | DET-002/003/005 → pending declarado como intencional | Tabela de mapeamento explícita (§6) |
| 7 | "Unificar 5+1 JSONs sem schema novo" → view TypeScript | `buildPerfilEntidade(project)` em `@shared/` (§3.2 Transitional) |
| 8 | Critério GO corrigido | "49 PASS + 1 BLOCKED + 0 FAIL" (§9) |

---

## 1. Princípios

1. **Perfil da Entidade é resultado determinístico** — nenhuma inferência LLM no cálculo de status/eligibilidade
2. **Não existe análise sem elegibilidade** — gate global antes de RAG/perguntas/briefing/riscos/plano
3. **Sem elegibilidade → não segue no E2E** — `STOP_IF_NOT_ELIGIBLE` é regra de produto, não apenas técnica
4. **Reaproveitamento sem ruptura** — code existente não é quebrado; novos componentes adaptam-se à verdade atual
5. **Separação em 3 camadas** — AS-IS (existe hoje), Transitional (adapter/compat), Target (visão final)
6. **Separar medir, validar, decidir** — medir = completude/score; validar = inconsistências; decidir = eligibility

---

## 2. Modelo de dados — origens

### 2.1 Fontes de origem (6 colunas JSON + tipo client)

| Origem | Camada | Arquivo de definição | Observação |
|---|---|---|---|
| `PerfilEmpresaData` | AS-IS | `client/src/components/PerfilEmpresaIntelligente.tsx:31-78` | Tipo TypeScript client-side |
| `companyProfile` | AS-IS | `drizzle/schema.ts` coluna JSON | **Incluída (omissão corrigida)** — contém cnpj, companyType, companySize, taxRegime, annualRevenueRange |
| `operationProfile` | AS-IS | idem | operationType, clientType[], multiState, principaisProdutos[], principaisServicos[] |
| `taxComplexity` | AS-IS | idem | hasInternationalOps, usesTaxIncentives, usesMarketplace |
| `financialProfile` | AS-IS | idem | paymentMethods[], hasIntermediaries |
| `governanceProfile` | AS-IS | idem | hasTaxTeam, hasAudit, hasTaxIssues |

### 2.2 Novo objeto unificado (Target)

```
PerfilEntidade = {
  // AS-IS (reaproveitado)
  ...companyProfile,
  ...operationProfile,
  ...taxComplexity,
  ...financialProfile,
  ...governanceProfile,

  // Target (campos novos)
  natureza_da_operacao: NaturezaOperacao[],  // multi (substitui operationType singular)
  papel_operacional: PapelOperacional[],
  setor_regulado: boolean,
  orgao_regulador: OrgaoRegulador[],
  opera_territorio_incentivado: boolean,
  tipo_territorio_incentivado: TipoTerritorioIncentivado | null,
  papel_comercio_exterior: PapelComercioExterior | null,

  // Derivados (computados por buildPerfilEntidade)
  possui_bens_derivado: boolean,     // cross-check com possui_bens
  possui_servicos_derivado: boolean, // cross-check com possui_servicos

  // Meta
  status_arquetipo: StatusArquetipo,
  eligibility: { overall: EligibilityOverall, reasons: string[] }
}
```

---

## 3. Três camadas explícitas

### 3.1 Camada AS-IS — existe hoje no código

**Campos reaproveitáveis sem mudança:**

| Campo | Onde vive hoje | Efeito atual |
|---|---|---|
| cnpj | `companyProfile.cnpj` | Validação + masking |
| companyType | `companyProfile.companyType` | Score completude (required) |
| companySize | `companyProfile.companySize` | Validação faturamento (DET-002) |
| annualRevenueRange | `companyProfile.annualRevenueRange` | Validação cruzada regime+porte (DET-001/002) |
| taxRegime | `companyProfile.taxRegime` | Validação cruzada (DET-001, DET-005) |
| operationType | `operationProfile.operationType` | Exibição condicional NCM/NBS |
| clientType | `operationProfile.clientType` | Score completude |
| multiState | `operationProfile.multiState` | DET-003 (MEI + multi-estado) |
| principaisProdutos[] | `operationProfile.principaisProdutos` | Q.Produtos + risco NCM |
| principaisServicos[] | `operationProfile.principaisServicos` | Q.Serviços + risco NBS |
| paymentMethods[] | `financialProfile.paymentMethods` | CALC-LIMITE |
| hasIntermediaries | `financialProfile.hasIntermediaries` | CALC-LIMITE |
| hasInternationalOps | `taxComplexity.hasInternationalOps` | DET-004 (MEI), DET-005 (Simples) |
| hasImportExport | `PerfilEmpresaData.hasImportExport` | Score opcional |
| possui_bens | `PerfilEmpresaData.possui_bens` | **Campo independente do usuário** |
| possui_servicos | `PerfilEmpresaData.possui_servicos` | **Campo independente do usuário** |
| confirmedCnaes[] | `drizzle/schema.ts` | Determinação CNAE |
| isEconomicGroup | `PerfilEmpresaData.isEconomicGroup` | Hoje sem efeito (QC-02 prep) |

**Funções reaproveitáveis:**

| Função | Arquivo | Uso no Target |
|---|---|---|
| `calcProfileScore()` | `PerfilEmpresaIntelligente.tsx:169-202` | Fonte de `completeness` e `confidence` |
| `consistencyEngine.runDeterministicChecks()` | `server/consistencyEngine.ts:108-200` | Fonte de `inconsistencias` |
| `consistencyRouter.acceptRisk()` | `server/routers/consistencyRouter.ts:208-238` | Justificativa pós-hard-block |
| `extractProjectProfile()` | `server/lib/project-profile-extractor.ts:109-200` | Dual-schema reader (camelCase/snake_case) |
| `softDeleteRiskWithCascade()` | `server/lib/db-queries-risks-v4.ts:670-850` | Deleção de risco (stays) |
| `calculate-briefing-confidence` (6 pilares) | `server/lib/calculate-briefing-confidence.ts:44-56` | Confidence score continuous |

**Estruturas reaproveitáveis:**
- Tabela `risk_categories` (cache TTL 1h)
- `audit_log` em 3+ níveis
- Breadcrumb `[fonte, categoria, artigo, ruleId]` (será **estendido**, não substituído)

---

### 3.2 Camada Transitional — adapters e compatibilidade

Objetivo: permitir que **código existente continue funcionando** enquanto novos campos são preenchidos.

**Adapters:**

| Adapter | Direção | Propósito |
|---|---|---|
| `buildPerfilEntidade(project)` | 6 JSONs → objeto unificado | View TypeScript pura, sem DDL novo |
| `operationTypeToNatureza(operationType)` | AS-IS singular → Target array | `"industria"` → `["Producao"]` |
| `naturezaToOperationType(natureza[])` | Target → AS-IS | Inverso, para consumidores legados |
| `checkPossuiBensConsistency(profile)` | Validação cruzada | `possui_bens` user × `tipo_objeto_economico` contém "bens" → warning se divergir |
| `mapDETToEligibility(detFinding)` | Consistency → Eligibility | Tabela de tradução determinística (§6) |

**Decisão explícita sobre `possui_bens`/`possui_servicos` (resolução do conflito v3):**

- **Mantidos como campos independentes do usuário** (compatibilidade AS-IS preservada)
- **Adicionada derivação redundante**: `possui_bens_derivado = natureza_da_operacao ⊇ {Producao, Comercio, Agro}`
- **Checker de divergência**: se `possui_bens !== possui_bens_derivado` → warning visual + sugestão (não bloqueia)
- Evita reintroduzir classe de bug do hotfix IS (transportadora classificada como "servicos" genérico)

**Dual-read (tech debt conhecido):**
- `extractProjectProfile` já faz fallback `operationType`↔`tipoOperacao`, `multiState`↔`multiestadual`
- Transitional mantém esse comportamento; Target remove dual-read após migração completa

---

### 3.3 Camada Target — visão final do arquétipo

**5 campos novos (que NÃO existem hoje):**

| Campo | Tipo | Aonde vive no Target | Como é preenchido |
|---|---|---|---|
| `papel_operacional` | `string[]` | `PerfilEntidade.papel_operacional` | User seleciona (multi) — derivável do CNAE no futuro |
| `setor_regulado` | `boolean` | idem | User marca — pré-preenchido se natureza ∈ {saude, financeiro, energia, transporte, agro} |
| `orgao_regulador[]` | `OrgaoRegulador[]` | idem | Multi-select: ANVISA, ANS, BACEN, SUSEP, ANATEL, ANP, ANEEL, ANAC, MAPA |
| `opera_territorio_incentivado` | `boolean` | idem | User marca — cascata com `tipo_territorio_incentivado` |
| `tipo_territorio_incentivado` | `enum` | idem | ZFM, ALC, Amazônia Ocidental, ZPE, Outro |
| `papel_comercio_exterior` | `enum` | idem | Importador, Exportador, Ambos, Trading, Por conta e ordem, Encomendante |
| `natureza_da_operacao` | `string[]` multi | idem | Substitui `operationType` singular — adapter bidirecional mantém AS-IS funcional |

**Gate E2E `STOP_IF_NOT_ELIGIBLE` (Target-only):**
- Função pura `isEligible(perfilEntidade) → EligibilityOverall`
- Middleware tRPC em 5 routers (ver §7)
- UI painel global mostra `BLOCKED` quando `eligibility.overall !== 'allowed'`

**Rastreabilidade do risco estendida (Target-only):**
- Breadcrumb: `[fonte, categoria, artigo, ruleId, gap_id, lei_referencia, justificativa_sistema]`
- Campo novo `source: 'system' | 'user'` em `risks_v4`
- tRPC `addRiskManual(riskData)` e `updateRisk(riskId, fields)` — ambos com audit_log

---

### 3.4 Derivações (regras determinísticas)

| Derivado | Regra | Usado por |
|---|---|---|
| `possui_bens_derivado` | `natureza_da_operacao ∩ {Producao, Comercio, Agro, Construcao} ≠ ∅` OR `tipo_objeto_economico ∋ 'bens'` | Checker consistency (não-blocker) |
| `possui_servicos_derivado` | `natureza_da_operacao ∩ {Servico, Tecnologia, Plataforma digital, Financeiro, Saude, Educacao} ≠ ∅` OR `tipo_objeto_economico ∋ 'servicos'` | idem |
| `tipo_operacao_normalizado` | `operationType` normalizado via alias table ADR-0030 (`servico → servicos`) | Gate IS v2.1 (compatibilidade preservada) |
| `completeness` | count(campos_preenchidos_com_efeito) / count(campos_obrigatorios) | `eligibility.overall` |
| `confidence` | fórmula 6 pilares `calculate-briefing-confidence.ts:44-56` | UX lateral painel |

---

## 4. Enum canônico — `status_arquetipo` (decisão final)

**Escolhido:** 4 valores (unifica v2 + v3)

```typescript
type StatusArquetipo = 'pendente' | 'inconsistente' | 'bloqueado' | 'confirmado';
```

| Valor | Semântica | Quando dispara |
|---|---|---|
| `pendente` | Dados faltando; usuário ainda preenche | `missingRequired.length > 0` ou `completeness < 100` |
| `inconsistente` | Conflito detectado mas corrigível com justificativa | DET warnings (HIGH/MEDIUM) OU divergência `possui_bens` × derivado |
| `bloqueado` | HARD BLOCK ou multi-CNPJ | DET CRITICAL OR `integra_grupo_economico + !analise_1_cnpj_operacional` |
| `confirmado` | Arquétipo pronto para liberar pipeline | Completude 100% + zero blockers + zero inconsistências não-justificadas |

**Justificativa da escolha:**
- `pendente` ≠ `incompleto` (v2) — mais claro em português
- `bloqueado` distingue hard block de simples faltante (diferente de v3 que tinha só `inconsistente`)
- `inconsistente` cobre warnings que o usuário pode justificar e seguir
- `confirmado` ≠ `valido` (v1) — evita colisão semântica com validação HTML/browser

**Migração da bateria v2:**
- Valores no `RESULT-50-casos-brasil-v2.json` precisam ser re-mapeados:
  - `valido` → `confirmado`
  - `incompleto` → `pendente`
  - `bloqueado` → `bloqueado` (mantém)
- `run-50-v2.mjs` gera novos outputs; suite JSON pode manter campos de input (não afetados)

---

## 5. Eligibilidade

### 5.1 Contrato

```typescript
type EligibilityOverall = 'allowed' | 'denied' | 'pending';

type Eligibility = {
  overall: EligibilityOverall;
  reasons: string[];          // lista de motivos legíveis
  failed_rules: string[];     // IDs (DET-001, V-05, etc)
  missing_fields: string[];   // campos que elevam para allowed se preenchidos
  timestamp: string;          // ISO 8601
};
```

### 5.2 Definição de cada valor

| Valor | Condições |
|---|---|
| `allowed` | `status_arquetipo === 'confirmado'` AND zero hard blocks AND zero multi-CNPJ |
| `denied` | violação de regra legal (DET CRITICAL) OR multi-CNPJ OR conflito lógico crítico |
| `pending` | completude < 100% OR inconsistência não-justificada OR dados insuficientes |

### 5.3 Mapeamento DET → Eligibility (explícito — muda comportamento intencional)

| Regra | Severity código | Mapeamento v3.1 | Comportamento AS-IS | Comportamento Target |
|---|---|---|---|---|
| DET-001 Regime × faturamento | CRITICAL | `denied` | Hard block, override com justificativa | Hard block, **sem override** no E2E |
| DET-002 Porte × faturamento | HIGH warning | `pending` | Permite proceed | **Bloqueia E2E** até corrigir |
| DET-003 MEI × multi-estado | HIGH warning | `pending` | Permite proceed | **Bloqueia E2E** até corrigir |
| DET-004 MEI × internacional | CRITICAL | `denied` | Hard block | Hard block |
| DET-005 Simples × internacional | MEDIUM warning | `pending` | Permite proceed | **Bloqueia E2E** até corrigir |
| V-05 multi-CNPJ | N/A (novo) | `denied` | N/A (campo sem efeito) | Hard block novo |
| `completeness < 100` | N/A | `pending` | Informativo | **Bloqueia E2E** |

**Declaração intencional:** as mudanças de warning→pending acima **endurecem o gate**. Justificativa: a v3.1 assume que o produto maduro precisa de 100% confidence antes de usar LLM. Warnings históricos que permitiam proceed eram concessões de "beta". No Target, toda inconsistência vira gate.

**Exit válido de `pending`:**
- Usuário corrige o dado (via UI)
- Usuário justifica (min 10 chars) via `acceptRisk()` existente — marca `inconsistente` mas não eleva para `allowed`
- **Para elevar `pending` → `allowed`:** corrigir dados até zero inconsistências (justificativa sozinha não libera o gate global)

---

## 6. Integração com código atual (reuso explícito)

| Componente do código | Uso em v3.1 | Alteração necessária |
|---|---|---|
| `consistencyEngine.runDeterministicChecks()` | Fonte primária | Nenhuma |
| `consistencyRouter.acceptRisk()` | Justificativa | Nenhuma (mas justificativa **não eleva** para allowed) |
| `calcProfileScore()` | Fonte de completude | Nenhuma; apenas consumidor lê `completeness` |
| `risksV4.deleteRisk()` | Deletar risco | Adicionar `source` no filtro (system/user) |
| `softDeleteRiskWithCascade()` | Cascata soft-delete | Nenhuma |
| `audit_log` | Auditoria | Adicionar entidades `archetype_gate`, `eligibility_change` |
| `risk_categories` (tabela) | Cache categoria | Nenhuma |

---

## 7. STOP_IF_NOT_ELIGIBLE — regra de produto + injection points

### 7.1 Regra de produto (stays)

```json
{
  "rule_id": "STOP_IF_NOT_ELIGIBLE",
  "scope": "E2E",
  "condition": "status_arquetipo != 'confirmado' OR eligibility.overall != 'allowed'",
  "action": [
    "STOP_PIPELINE",
    "DO_NOT_RUN_RAG",
    "DO_NOT_GENERATE_QUESTIONS",
    "DO_NOT_BUILD_BRIEFING",
    "DO_NOT_GENERATE_RISKS",
    "DO_NOT_GENERATE_PLAN"
  ],
  "ui": {
    "state": "BLOCKED",
    "message": "Arquétipo inválido ou não elegível. Complete/corrija os dados para continuar.",
    "show_missing_fields": true,
    "show_conflicts": true
  },
  "audit": {
    "log": true,
    "fields": ["arquetipo_snapshot", "failed_rules", "missing_fields", "timestamp"]
  }
}
```

### 7.2 Injection points (separado, nível de implementação)

**Onde o gate precisa ser inserido no código atual (referência, não implementação):**

| Ponto de injeção | Arquivo atual | Ação necessária |
|---|---|---|
| A | `server/routers/questionEngine.ts` (ou equivalente) antes de gerar Q1/Q2/Q3 | Middleware tRPC que chama `isEligible()` e retorna 409 se !allowed |
| B | `server/routers-fluxo-v3.ts` antes de `generateBriefing` | idem |
| C | `server/routers/risks-v4.ts` procedure `generateRisks` | idem |
| D | `server/lib/action-plan-engine-v4.ts` antes de `buildActionPlans` | idem |
| E | Todo acesso a RAG (`llm.ts` via `invokeLLM`) com entity-type `archetype_dependent` | Wrapper que valida antes de chamar |
| F | Frontend: painel global de status do projeto | Componente novo `GlobalEligibilityBanner` — lê `eligibility.overall` e mostra BLOCKED |

**Função central:**

```typescript
// shared/eligibility.ts (novo)
export function isEligible(project: ProjectWithProfile): Eligibility {
  const perfil = buildPerfilEntidade(project);
  const status = computeStatusArquetipo(perfil);
  const inconsistencies = runDeterministicChecks(perfil);
  const completeness = calcProfileScore(perfil).completeness;
  return computeEligibility(status, inconsistencies, completeness);
}
```

---

## 8. Riscos — rastreabilidade e governança

### 8.1 Regra gate

- `risksV4.generateRisks()` só executa se `isEligible() === 'allowed'`
- `risksV4.addRiskManual()` (novo) só permite `source: 'user'` se `isEligible() === 'allowed'`

### 8.2 Origem do risco (breadcrumb estendido)

**AS-IS (hoje):** `[fonte, categoria, artigo, ruleId]` — 4 labels
**Target (v3.1):** `[fonte, categoria, artigo, ruleId, gap_id, lei_referencia, justificativa_sistema]` — 7 elementos

| Elemento | Existe hoje? | Origem |
|---|---|---|
| fonte | ✅ | `RiskV4Row.fonte` |
| categoria | ✅ | `RiskV4Row.categoria` |
| artigo | ✅ | `RiskV4Row.artigo` |
| ruleId | ✅ | `RiskV4Row.rule_id` |
| **gap_id** | ❌ | Nova coluna em `risks_v4` + FK para tabela `gaps` |
| **lei_referencia** | ❌ | Nova coluna (ex: "LC 214/2025 art. 92") |
| **justificativa_sistema** | ❌ | Nova coluna text (gerada por LLM + approved) |

### 8.3 Governança — separação system/user

| Campo novo | Tipo | Ação |
|---|---|---|
| `source` | `'system' | 'user'` | Default 'system'; user se criado via `addRiskManual` |
| `created_by_user_id` | string? | null se system |
| `reviewed_by_user_id` | string? | null se não revisado |

### 8.4 Procedures tRPC novas

- `addRiskManual(projectId, riskData)` — requer `isEligible()` = allowed
- `updateRisk(riskId, fields)` — permite editar título/descrição (hoje imutável)
- `bulkDelete(riskIds[], reason)` — conveniência para UI

---

## 9. Critério GO M1 (corrigido)

| Critério | Resultado esperado |
|---|---|
| 7 P0 resolvidos na spec v3.1 | ✅ este documento endereça os 7 P0 da crítica |
| Bateria 50 cenários re-rodada com vocabulário novo | **49 PASS + 1 BLOCKED esperado (S27) + 0 FAIL** |
| Rodada D (spec v3.1 contra código) validada | Avaliador confirma viabilidade Target |
| `eligibility` funcionando (testes unitários) | Função `isEligible()` com 100% cobertura de branches |
| `STOP_IF_NOT_ELIGIBLE` ativo em 6 pontos de injeção | A/B/C/D/E/F da §7.2 todos cobertos |

**Não exigido para GO M1:**
- Rollout em produção (fica para M1.6)
- Migração de dados existentes (permitido `db:reset` pelo P.O.)
- LLM para justificativa_sistema (placeholder "Não informado" aceitável em M1)

---

## 10. O que fica em M1.1+ (backlog explícito)

| Item | Por que adiado |
|---|---|
| Justificativa LLM por risco (`justificativa_sistema` não-placeholder) | M1 foca no schema + fluxo; geração LLM é refinamento |
| Mapeamento exaustivo CNAE → `papel_operacional_especifico` | 1.331 subclasses CNAE; M1 suporta preenchimento manual |
| Campo discriminante marketplace + estoque próprio | R9 da crítica; não-crítico para 95% dos casos |
| UI de bloqueio multi-CNPJ em modal vs banner vs tela | R10 da crítica; decisão UX pós-mockup |
| Versioning do arquétipo (`v1.0`, `v1.1`) | Metadata rot prevention; M1.1 adiciona quando schema evoluir |

---

## 11. Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Mudança warning→pending confunde usuário | Alta | UX clara: "Corrija para continuar" com CTA para campo ofensor |
| Migração vocabulário `status_arquetipo` quebra bateria v2 | Alta | Adapter no runner + commit único com mapeamento |
| Gate E2E em 6 pontos exige refator amplo | Média | Middleware tRPC único compartilhado, não duplicar |
| `eligibility` fica stateless vs state-machine | Média | Spec escolhe stateless (recalcula a cada request); cache opcional em M1.1 |
| Campos novos do Target sem mapeamento CNAE | Média | Default "Outros" com motivo obrigatório (fallback controlado) |

---

## 12. Próximo passo

1. **P.O. revisa esta v3.1 DRAFT**
2. Se aprovada:
   - Orquestrador gera `APPROVED_SPEC-M1-PERFIL-ENTIDADE.json` hash-locked
   - Claude Code executa **rodada D** (bateria v2 adaptada ao novo vocabulário)
   - Re-avalia REGRA-M1-GO-NO-GO
3. Se rodada D GO → abre F1 (SPEC formal com Bloco 9 etc.)
4. F1 aprovado → implementação autorizada

**Implementação M1 segue suspensa.**

---

## Anexo — Mapeamento explícito de cada ponto da validação v3

| # crítica v3 | Endereçamento em v3.1 |
|---|---|
| 1. Falta `companyProfile` | §2.1 incluído explicitamente |
| 2. Campos misturados | §3 três camadas separam AS-IS / Transitional / Target; §3.3 lista os 5 novos com tipo |
| 3. Conflito possui_bens/servicos | §3.2 e §3.4 — mantém campos + adiciona derivação redundante com checker |
| 4. `status_arquetipo` 3 vocabulários | §4 — **decisão: 4 valores canônicos** com justificativa |
| 5. DET-002/003/005 pending = mudança | §5.3 declarado intencional com tabela AS-IS × Target |
| 6. STOP_IF_NOT_ELIGIBLE injection | §7.1 (produto) + §7.2 (6 pontos de injeção) separados |
| 7. "Unificar sem schema novo" ambíguo | §3.2 — view TypeScript `buildPerfilEntidade()` pura |
| 8. "50 PASS" impreciso | §9 — "49 PASS + 1 BLOCKED + 0 FAIL" |
