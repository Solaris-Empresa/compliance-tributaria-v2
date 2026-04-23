# SPEC v3.1-rev1 — M1-PERFIL-ENTIDADE

> Status: `DRAFT_FOR_RODADA_D` · 2026-04-23
> Revisão 1 da v3.1 incorporando os 7 ajustes P.O. "AMARELO POSITIVO".
> **Após esta rev1 P.O. liberou Rodada D.** Implementação M1 segue suspensa.

---

## Mudanças v3.1 → v3.1-rev1 (7 ajustes)

| # | Ajuste | Onde ficou |
|---|---|---|
| 1 | `confidence_score` = explicabilidade, nunca libera fluxo sozinho | §4, §5, §13 (nova) |
| 2 | Justificar inconsistência NÃO confirma perfil nem libera gate | §5.3, §6.2, §13 |
| 3 | `acceptRisk` renomeado `acknowledgeInconsistency` | §6, §13 |
| 4 | Injection point E restrito a `archetype_required=true` | §7.2 |
| 5 | Multi-CNPJ: grupo econômico é informativo; denied somente em tentativa de consolidação | §5.3, §6 |
| 6 | Marketplace + estoque próprio: **backlog M1.1 declarado** (não ambíguo) | §10 |
| 7 | Alinhar com mockup v4.1-rev1: score visual ≠ gate; PC-05 exploratório; CNAEs múltiplos via modal | §13 (nova seção completa) |

---

## 1. Princípios

1. **Perfil da Entidade é resultado determinístico** — nenhuma inferência LLM no cálculo de status/eligibilidade
2. **Sem elegibilidade → não segue no E2E**
3. **Reaproveitamento sem ruptura** — AS-IS preservado durante migração
4. **Separação em 3 camadas** — AS-IS / Transitional / Target
5. **Separar medir, validar, decidir** — medir = completude/score (explicabilidade) · validar = inconsistências · decidir = eligibility (gate)
6. **Score é explicabilidade, não gate** (novo rev1) — score alto sozinho nunca libera fluxo
7. **Ciência ≠ aceitação** (novo rev1) — `acknowledgeInconsistency` registra ciência mas não eleva status

---

## 2. Modelo de dados — origens

### 2.1 Seis origens (mantidas)

| Origem | Camada | Arquivo |
|---|---|---|
| `PerfilEmpresaData` | AS-IS | `client/src/components/PerfilEmpresaIntelligente.tsx:31-78` |
| `companyProfile` | AS-IS | `drizzle/schema.ts` coluna JSON |
| `operationProfile` | AS-IS | idem |
| `taxComplexity` | AS-IS | idem |
| `financialProfile` | AS-IS | idem |
| `governanceProfile` | AS-IS | idem |

### 2.2 Objeto unificado (Target) — inalterado da v3.1

Estrutura `PerfilEntidade` mantém-se (ver v3.1 §2.2).

---

## 3. Três camadas (AS-IS / Transitional / Target)

Estrutura inalterada da v3.1 §3. Reforços pontuais:

- **§3.2 Transitional:** `acceptRisk` renomeado para `acknowledgeInconsistency` em todos os adapters
- **§3.3 Target:** `eligibility.overall` permanece gate; score é separado

---

## 4. Enum canônico `status_arquetipo` (ajuste alinhamento mockup v4.1)

**Valores finais (4) — estende v3.1 com "em construção" como variante inicial de "pendente":**

```typescript
type StatusArquetipo = 'pendente' | 'inconsistente' | 'bloqueado' | 'confirmado';
```

| Valor | Semântica | Quando dispara | Mapeamento mockup |
|---|---|---|---|
| `pendente` | Dados faltando | `missingRequired.length > 0` ou `completeness < 100` | "Em construção" (0–30% preenchido) + "Pendente" (≥30% mas incompleto) |
| `inconsistente` | Conflito DETECTÁVEL e que foi CIENTIFICADO pelo usuário | DET warning (HIGH/MEDIUM) com `acknowledgeInconsistency` registrado | Mostrado como "Inconsistente" em PC-03 |
| `bloqueado` | HARD BLOCK | DET CRITICAL ou V-05 multi-CNPJ ativo (tentativa de consolidação) | "Bloqueado" — HARD_BLOCK no PC-03 |
| `confirmado` | Arquétipo pronto + usuário confirmou via CTA "Confirmar Perfil da Entidade" | Completude 100% + zero HARD_BLOCKs + CTA acionado | "Confirmado" com gate E2E liberado |

**Ajuste rev1 (crítico):** para elevar a `confirmado` é necessária **ação explícita do usuário** (CTA "Confirmar Perfil da Entidade" no PC-04), além das condições determinísticas. Score alto + zero blockers **não é suficiente** — falta confirmação do usuário.

---

## 5. Eligibilidade

### 5.1 Contrato (inalterado)

```typescript
type EligibilityOverall = 'allowed' | 'denied' | 'pending';

type Eligibility = {
  overall: EligibilityOverall;
  reasons: string[];
  failed_rules: string[];
  missing_fields: string[];
  timestamp: string;
};
```

### 5.2 Definição de cada valor (ajuste rev1 em multi-CNPJ)

| Valor | Condições |
|---|---|
| `allowed` | `status_arquetipo === 'confirmado'` (inclui confirmação explícita) AND zero hard blocks AND zero tentativa de consolidação multi-CNPJ |
| `denied` | DET CRITICAL OR **tentativa explícita** de consolidação multi-CNPJ OR conflito lógico crítico |
| `pending` | completeness < 100% OR inconsistência ainda não cientificada via `acknowledgeInconsistency` OR dados insuficientes |

### 5.3 Mapeamento DET → Eligibility (ajuste rev1: multi-CNPJ informativo)

| Regra | Severity código | Mapeamento v3.1-rev1 | Observação rev1 |
|---|---|---|---|
| DET-001 Regime × faturamento | CRITICAL | `denied` | Hard block (mantém) |
| DET-002 Porte × faturamento | HIGH warning | `pending` → vira `inconsistente` após `acknowledgeInconsistency` | Mudança comportamental declarada |
| DET-003 MEI × multi-estado | HIGH warning | `pending` → vira `inconsistente` após `acknowledgeInconsistency` | idem |
| DET-004 MEI × internacional | CRITICAL | `denied` | Hard block (mantém) |
| DET-005 Simples × internacional | MEDIUM warning | `pending` → vira `inconsistente` após `acknowledgeInconsistency` | idem |
| **V-05 multi-CNPJ (rev1)** | **2 níveis** | **(a)** `isEconomicGroup=true` sem tentativa de consolidação → **INFO** (não bloqueia) · **(b)** `isEconomicGroup=true` + `nivel_analise=consolidado` → `denied` | **Mudança rev1:** grupo econômico sozinho é informativo; apenas tentativa de consolidação dispara bloqueio |
| `completeness < 100%` | N/A | `pending` | Bloqueia E2E |

**Campo "Tentativa de consolidação":**
- Inferido por `nivel_analise !== 'CNPJ operacional unico'`
- OR explicitado pelo usuário em campo `tentativa_consolidacao: boolean`
- Sem tentativa: grupo econômico é exibido no PC-04 como INFO; fluxo segue normalmente

**Exit válido de `pending` / `inconsistente` → `allowed`:**
- **Somente** corrigir dados até zero inconsistências
- `acknowledgeInconsistency` marca `inconsistente` mas **NÃO eleva** para `allowed`
- CTA "Confirmar Perfil da Entidade" só ativa quando `completeness=100% AND zero HARD_BLOCKs`

---

## 6. Integração com código atual

### 6.1 Reuso (inalterado)

| Componente | Uso v3.1-rev1 |
|---|---|
| `consistencyEngine.runDeterministicChecks()` | Fonte primária de inconsistências |
| `calcProfileScore()` | Fonte de completude + confidence (explicabilidade) |
| `extractProjectProfile()` | Dual-schema reader (stays) |
| `softDeleteRiskWithCascade()` | Sem alteração |
| Tabela `risk_categories` | Sem alteração |
| `audit_log` | Adicionar entidades `archetype_gate`, `eligibility_change`, `inconsistency_acknowledged` |

### 6.2 Rename explícito

**`consistencyRouter.acceptRisk()` → `consistencyRouter.acknowledgeInconsistency()`**

| Aspecto | AS-IS | rev1 Target |
|---|---|---|
| Nome do procedure | `acceptRisk` | `acknowledgeInconsistency` |
| Semântica | "Aceitou risco, pode seguir" | "Reconheceu ciência da inconsistência" |
| Efeito em `status_arquetipo` | AS-IS desbloqueava fluxo pré-diagnóstico | **Não eleva para `confirmado`** |
| Efeito em `eligibility.overall` | — | **Não eleva para `allowed`** |
| Registro | `acceptedRiskReason`, `acceptedRiskBy`, `acceptedRiskAt` | `acknowledgedInconsistencyReason`, `acknowledgedBy`, `acknowledgedAt` (novos nomes de colunas via migration OU aliases) |
| Mínimo caracteres | 10 | 10 (mantido) |

**Decisão de migration:** colunas físicas do banco podem manter nomes AS-IS (`acceptedRiskReason` etc.) para não quebrar queries históricas; o **rename é semântico na API tRPC**. Adapter lê/escreve colunas AS-IS mas expõe nome novo na interface.

---

## 7. STOP_IF_NOT_ELIGIBLE

### 7.1 Regra de produto (inalterada)

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

### 7.2 Injection points (ajuste rev1 no ponto E)

| # | Onde | Antes de | Mudança rev1 |
|---|---|---|---|
| A | `server/routers/questionEngine` | Gerar Q1/Q2/Q3 | — |
| B | `server/routers-fluxo-v3.ts` | `generateBriefing` | — |
| C | `server/routers/risks-v4.ts` | `generateRisks` | — |
| D | `server/lib/action-plan-engine-v4.ts` | `buildActionPlans` | — |
| **E (rev1)** | `server/_core/llm.ts` via `invokeLLM` | **Apenas chamadas com `archetype_required=true`** | **Mudança rev1:** não bloqueia usos de LLM independentes do Perfil (ex: tradução, sumarização, debug interno). Chamadas devem declarar `archetype_required: boolean` no options |
| F | Frontend | `GlobalEligibilityBanner` | — |

**Contrato rev1 para invokeLLM:**

```typescript
// server/_core/llm.ts
type InvokeLLMOptions = {
  // ... existing
  archetype_required?: boolean; // default: false
};

function invokeLLM(prompt: string, options: InvokeLLMOptions) {
  if (options.archetype_required && !isEligible(project).overall === 'allowed') {
    throw new StopPipelineError('STOP_IF_NOT_ELIGIBLE');
  }
  // ... proceed
}
```

**Chamadas classificadas como `archetype_required=true`** (Target):
- Geração de riscos (`risk-engine-v4` invocando LLM)
- Geração de briefing (`briefingEngine`)
- Geração de plano (`action-plan-engine-v4`)
- Geração de perguntas Q3 especializadas

**Chamadas `archetype_required=false`** (passam livre):
- Geração de CNAE a partir de descrição livre (é **entrada** do arquétipo, não consumidor)
- Tradução / normalização de texto
- Debug / testes internos

---

## 8. Riscos — rastreabilidade e governança

Estrutura inalterada da v3.1 §8. Reforço rev1:

- `addRiskManual` requer `eligibility.overall === 'allowed'`
- Campo `source: 'system' | 'user'` (mantido)
- Breadcrumb 7-elements (mantido)

---

## 9. Critério GO M1 (inalterado)

| Critério | Resultado esperado |
|---|---|
| 7 P0 resolvidos + 7 ajustes rev1 aplicados | ✅ este documento |
| Bateria 50 cenários (vocabulário novo) | 49 PASS + 1 BLOCKED (S27) + 0 FAIL |
| Rodada D validada | Avaliador roda v3.1-rev1 contra código |
| `isEligible()` 100% cobertura de branches | Testes unitários |
| 6 injection points cobertos | A-F (com E restrito) |

---

## 10. Backlog M1.1+ (ajuste rev1 explícito)

Decisão firme sobre marketplace + estoque próprio:

| Item | Decisão rev1 | Justificativa |
|---|---|---|
| Marketplace + estoque próprio (R9) | **Backlog M1.1** firme | Edge case dos 5% não-cobertos do KPI 95%; UX atual (cards multi em tipo_objeto_economico) permite preenchimento manual sem campo dedicado; falso ambíguo na v3.1 |
| LLM para `justificativa_sistema` | Backlog M1.1 | Placeholder aceitável em M1 |
| Mapeamento CNAE → papel_operacional exaustivo | Backlog M1.1 | Manual OK em M1 |
| UI bloqueio multi-CNPJ (modal/banner/tela) | Backlog M1.1 | Decisão UX pós-M1 |
| Versioning de arquétipo (v1.0, v1.1) | Backlog M1.1 | Prevenção de metadata rot |
| Cache de `eligibility` | Backlog M1.2 | Hoje stateless |

---

## 11. Riscos e mitigações

Mantido da v3.1 §11 com ajuste rev1:

- **Novo risco:** usuário entende `acknowledgeInconsistency` como "aceito, pode seguir" (comportamento AS-IS)
  - **Mitigação:** UX no PC-03 mostra explicitamente "Ciência registrada — complete/corrija para liberar o fluxo"; microcopy do modal reforça "Isto não libera o próximo passo"

---

## 12. Próximo passo (ajuste rev1)

1. **P.O. aprova esta v3.1-rev1**
2. Orquestrador gera `APPROVED_SPEC-M1-PERFIL-ENTIDADE.json` hash-locked
3. **Claude Code executa Rodada D** (autorizada pelo P.O. nesta rev1):
   - Re-roda bateria 50 cenários com vocabulário `pendente/inconsistente/bloqueado/confirmado`
   - Atualiza `run-50-v2.mjs` → `run-50-v3.mjs` com:
     - Nova semântica de `status_arquetipo` (4 valores)
     - `acknowledgeInconsistency` não elevando para `allowed`
     - Multi-CNPJ 2-níveis (INFO sem consolidação; denied com)
     - `archetype_required=true` só em pontos declarados
   - Espera: **49 PASS + 1 BLOCKED (S27) + 0 FAIL**
4. Se rodada D → GO, abre F1 (SPEC formal)
5. **F1 aprovado → implementação autorizada** (SE passar REGRA-M1-GO-NO-GO completa)

**Implementação M1 continua suspensa.**

---

## 13. Alinhamento com Mockup v4.1-rev1 e Painel de Confiança PC-01..PC-06 (ajuste rev1 crítico)

Esta seção é **nova na rev1** e endereça o ajuste #7.

### 13.1 Score é explicabilidade, não gate

- O **score de confiança** (0-100%) vive no PC-01 e PC-02 do painel
- Composição: **Completude 40% · Inferência validada 30% · Coerência 30%** (delta v4.1 §3)
- Faixas visuais: 0-59 vermelho · 60-84 amarelo · 85-100 verde
- **Regra hard:** "score alto sozinho nunca libera o fluxo. Um caso com 70% de confiança e um HARD_BLOCK ativo permanece bloqueado." (delta v4.1 §3 nota obrigatória)
- **Gate continua sendo apenas `status_arquetipo === 'confirmado'` + `eligibility.overall === 'allowed'`**

### 13.2 PC-05 é exploratório (não-gating)

- Seção PC-05 ("Como isso impactará os riscos") exibe preview informativo
- **Não representa o motor de riscos real**
- Decisões de gate **NÃO** dependem de PC-05
- Nota obrigatória: "Na etapa de riscos, o sistema mostrará por que cada risco foi apontado, com base nos dados do Perfil da Entidade, na regra aplicada e na base legal correspondente." (delta v4.1 §7)

### 13.3 CNAEs múltiplos e editáveis via modal

- Campo `cnaes[]` é **array** (não singular)
- Identificação: botão "Identificar CNAEs" (LLM+RAG sobre descrição livre)
- Confirmação: modal com múltipla seleção
- Remoção: painel recalcula score + issues (delta v4.1 §5)
- Enquanto nenhum CNAE está confirmado: snapshot mostra "—" e `inferencia_validada` não atinge máximo

### 13.4 Mapeamento das 6 seções do painel

| Seção | ID | Papel no gate |
|---|---|---|
| PC-01 Resumo Executivo | Informativo | Status badge + gate badge visíveis |
| PC-02 Composição da confiança | Informativo | Breakdown (não participa do gate) |
| PC-03 Pendências e bloqueios | **Gating** via lista de HARD_BLOCKs | Lista priorizada com CTA de correção |
| PC-04 Snapshot do Perfil | **Gating via CTA "Confirmar Perfil da Entidade"** | Ativa só se completeness=100% + zero HARD_BLOCKs |
| PC-05 Impacto nos riscos | **Exploratório** | Preview; não-gating |
| PC-06 Liberação do próximo passo | **Gate final** | CTA de briefing; visível mas só ativo se arquétipo confirmado |

### 13.5 Gates visuais reconhecidos (delta v4.1 §4.2)

| Gate | Condição | Efeito visual |
|---|---|---|
| GATE-01 | `status_arquetipo ≠ confirmado` | "Continuar para o briefing" desabilitado |
| GATE-02 | HARD_BLOCKs ativos | Status = Bloqueado |
| GATE-03 | CNAEs não confirmados | `inferencia_validada` não atinge máximo |
| GATE-04 | Score alto sem confirmação | Fluxo permanece não liberado |

**GATE-04 é a materialização visual do ajuste #1 rev1** — score alto sozinho nunca libera.

### 13.6 Tipos de issue no PC-03 (delta v4.1 §4.3)

| Tipo | Cor | Descrição rev1 |
|---|---|---|
| `HARD_BLOCK` | Vermelho | Bloqueia `confirmado` + dispara `eligibility = denied` |
| `PENDENTE_CRITICO` | Amarelo escuro | Reduz significativamente confiança · equivale a `inconsistente` pendente de acknowledge |
| `PENDENTE` | Azul | Campo obrigatório não preenchido · equivale a `pendente` |
| `INFO` | Índigo | Informativo; não bloqueia (ex: grupo econômico sem tentativa de consolidação) |

---

## Anexo — Mapeamento ajuste rev1 → seção

| # Ajuste | Seção |
|---|---|
| 1. Score explicabilidade | §4, §13.1 |
| 2. Justificativa não eleva | §5.3, §6.2 |
| 3. Rename acknowledgeInconsistency | §6.2 |
| 4. Injection E restrito | §7.2 |
| 5. Multi-CNPJ 2 níveis | §5.3 |
| 6. Marketplace + estoque = backlog M1.1 firme | §10 |
| 7. Alinhamento mockup v4.1-rev1 | §13 |

---

## Estado declarado

| Item | Status |
|---|---|
| v3.1-rev1 | **DRAFT para aprovação final antes da Rodada D** |
| Rodada D | **AUTORIZADA** pelo P.O. após esta rev1 |
| Implementação M1 | **SUSPENSA** (continua até REGRA-M1-GO-NO-GO completa passar em v3.1-rev1) |
