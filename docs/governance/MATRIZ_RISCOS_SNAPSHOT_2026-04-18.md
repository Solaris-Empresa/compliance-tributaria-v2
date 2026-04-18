# MATRIZ DE RISCOS — SNAPSHOT DE EXPLORAÇÃO
## IA SOLARIS · Compliance Tributário v2
## Data: 2026-04-18 · HEAD: 3afc592 · Sprint: Z-19

---

## 0. Propósito

Baseline consolidado do estado atual da matriz de riscos, antes de
produzir a suite de testes de aferição "planejado x realizado".
Este documento existe porque:
- 3 fontes (DB, código, RN doc) divergem entre si
- UAT Gate E (2026-04-11) registrou 21 bugs catalogados
- O P.O. identificou suspeita de geração incorreta
- Precisamos de uma foto para saber o que testar

**Este documento é imutável após aprovação do P.O.** Mudanças geram
um novo snapshot datado, preservando o histórico.

---

## 1. Fontes consultadas

| # | Fonte | Tipo | Última modificação |
|---|---|---|---|
| 1 | `risk_categories` (DB TiDB) | Live | 2026-04-18 (query Manus) |
| 2 | `server/lib/risk-engine-v4.ts` | Código | 2026-04-14 (Z-12) |
| 3 | `server/lib/rag-risk-validator.ts` | Código | 2026-04-13 (Z-13.5) |
| 4 | `server/lib/action-plan-engine-v4.ts` | Código | (Z-12) |
| 5 | `server/routers/risks-v4.ts` | Código | 2026-04-17 |
| 6 | `server/cpie.ts` / `server/cpie-v2.ts` | Código | pré-Z-07 |
| 7 | `docs/governance/RN_GERACAO_RISCOS_V4.md` | Doc (repo) | — |
| 8 | `docs/governance/RN_CONSOLIDACAO_V4.md` | Doc (repo) | Z-16 |
| 9 | `0-MatrizRisco/MOCKUP - RISCO/UAT_GATE_E_FAIL_REPORT.md` | Doc externo | 2026-04-11 |
| 10 | `docs/adr/ADR-0023-cpie-score-opcao-a-sprint-z07.md` | ADR | Z-07 |

---

## 2. Pipeline de geração de riscos (atual)

```
Step 1-3 (Perfil)
  │
  └─→ companyProfile + operationProfile + taxComplexity + financialProfile + governanceProfile
  │    projects.profileCompleteness (CPIE) — 0-100
  │
Step 4 (Briefing)
  │
  └─→ generateBriefing (LLM + RAG)
  │
Step 5 (Matriz de Riscos)
  │
  ├─→ analyzeGapsFromQuestionnaires() [Z-11]
  │     Lê: solaris_answers JOIN solaris_questions WHERE risk_category_code IS NOT NULL
  │     Lê: iagen_answers WHERE risk_category_code IS NOT NULL
  │     Agrupa: Map<risk_category_code, AnswerData[]>
  │     Classifica pessimisticamente (nao_atendido ganha)
  │
  ├─→ analyzeGaps() [legado — Onda 3]
  │     Lê: questionnaireAnswersV3 + regulatory_requirements_v3
  │
  ├─→ gap-to-rule-mapper (ACL)
  │     Para cada gap:
  │       mapped (1 match)     → gera risco
  │       ambiguous (2+)       → reviewQueue
  │       unmapped (0)         → descarta
  │
  ├─→ consolidateRisks() [risk-engine-v4.ts]
  │     Agrupa por risk_key = {categoria}::op:{tipoOperacao}::geo:{mono|multi}
  │     Para cada grupo:
  │       Severity: risk_categories (DB) OR fallback SEVERITY_TABLE
  │       Artigo:   risk_categories.artigo_base OR gap.artigo
  │       Tipo:     risk_categories.tipo OR derivado (oportunidade→opportunity)
  │       Breadcrumb: [bestSource, categoria, artigo, risk_key]
  │       Confidence: ponderada por SOURCE_RANK
  │       Titulo:   TITULO_TEMPLATES[categoria] com {op} substituído
  │
  ├─→ enrichRiskWithRag() [rag-risk-validator.ts]
  │     Para cada risco: LIKE query em ragDocuments
  │     Se match: rag_validated=1, rag_confidence=0.85, rag_artigo_exato
  │     Se no match: rag_validated=0, confidence × 0.75 (penalidade)
  │
  └─→ INSERT risks_v4 (status='active', approved_at=NULL)

Step 6 (Planos de Ação)
  │
  └─→ buildActionPlans(risk) [action-plan-engine-v4.ts]
      RN-RISK-05: type='opportunity' → retorna []
      type='risk': consulta catálogo PLANS[ruleId]

Step 7 (ConsolidacaoV4)
  │
  └─→ calculateComplianceScore(risks aprovados)
      score = sum(peso × max(conf, 0.5)) / (n × 9) × 100
      Snapshot persistido em projects.scoringData
```

---

## 3. Categorias oficiais (fonte: DB `risk_categories`)

**Diagnóstico D8 (2026-04-18):** verificação definitiva do DB live via
`SELECT * FROM risk_categories ORDER BY id DESC` retornou 10 rows
com `created_at = 2026-04-10T05:22:44` — seed único, sem inserções
posteriores. Última migration tocando a tabela: `0073_risk_categories_descricao.sql`
(Sprint Z-12, PR #471). DB live **alinhado ao seed**.

| # | codigo | nome | tipo | severidade | urgencia | artigo_base |
|---|---|---|---|---|---|---|
| 1 | imposto_seletivo | Imposto Seletivo | risk | alta | imediata | Art. 2 LC 214/2025 |
| 2 | confissao_automatica | Confissão Automática | risk | alta | imediata | Art. 45 LC 214/2025 |
| 3 | split_payment | Split Payment | risk | alta | imediata | Art. 9 LC 214/2025 |
| 4 | inscricao_cadastral | Inscrição Cadastral IBS/CBS | risk | alta | imediata | Art. 213 LC 214/2025 |
| 5 | regime_diferenciado | Regime Diferenciado | risk | media | curto_prazo | Art. 29 LC 214/2025 |
| 6 | transicao_iss_ibs | Transição ISS para IBS | risk | media | medio_prazo | Arts. 6-12 LC 214/2025 |
| 7 | obrigacao_acessoria | Obrigação Acessória | risk | media | curto_prazo | Art. 102 LC 214/2025 |
| 8 | aliquota_zero | Alíquota Zero | opportunity | oportunidade | curto_prazo | Art. 14 LC 214/2025 |
| 9 | aliquota_reduzida | Alíquota Reduzida | opportunity | oportunidade | curto_prazo | Art. 24 LC 214/2025 |
| 10 | credito_presumido | Crédito Presumido | opportunity | oportunidade | curto_prazo | Art. 58 LC 214/2025 |

**Observações:**
- Total efetivo: **10 categorias ativas** (7 risk + 3 opportunity).
- `tributacao_servicos` **NUNCA existiu no DB nem no código** — aparece apenas
  no `RN_GERACAO_RISCOS_V4.md:92` como entrada órfã de exemplo/descartada.
- Coluna `descricao` foi adicionada na migration 0073 (Z-12) mas não é usada no engine.
- Engine lê via `getCategoryByCode()` com cache TTL 1h (Sprint Z-09).
- FK: `risks_v4.categoria → risk_categories.codigo` (ON UPDATE CASCADE, ON DELETE RESTRICT — migration 0067).

**Nota histórica sobre revisão:** uma query anterior do Manus (2026-04-18 manhã)
retornou uma tabela com `tributacao_servicos` no lugar de `aliquota_reduzida`.
A diagnóstica oficial posterior (mesma data, tarde) comprovou que foi erro de
renderização/cópia do Manus — o DB live nunca teve `tributacao_servicos`.
Esta tabela é a **autoritativa**.

---

## 4. Hierarquia de fontes (decisão técnica)

```
NÍVEL 1 — risk_categories (DB TiDB)
  Fonte EFETIVA em runtime.
  Engine lê via getCategoryByCode().
  Atualização: migration + PR (ADR-0025).

NÍVEL 2 — SEVERITY_TABLE + Categoria enum (código)
  Fallback determinístico se DB falhar.
  Fonte do TypeScript type safety.
  Atualização: PR no repositório.

NÍVEL 3 — RN_GERACAO_RISCOS_V4.md (doc)
  Especificação de INTENÇÃO.
  Não consultado em runtime.
  Atualização: PR no repositório.
```

**Regra de precedência:** N1 > N2 > N3. Divergência entre níveis
é bug de governança, mesmo que o runtime "funcione".

---

## 5. Divergências detectadas e decisões

### Resumo

| ID | Divergência | Severidade | Decisão |
|---|---|---|---|
| ~~D1~~ | ~~aliquota_reduzida ausente no DB~~ | — | **REMOVIDA** — diagnóstico comprovou DB tem a categoria (row 9) |
| D2 | tributacao_servicos órfã no RN doc | Baixa | Remover do RN_GERACAO_RISCOS_V4.md:92 |
| D3 | inscricao_cadastral severidade: RN doc diz "media", código+DB dizem "alta" | Média | Atualizar RN doc |
| D4 | RN doc menciona categoria não-implementada (tributacao_servicos) | Baixa | Ver D2 |
| D5 | Thresholds score: código 75/50/25 × RN doc 70/50/30 + bypass totalAlta | **Alta** | Decidir qual é o certo antes de expor na UI |
| D6 | Timeline reforma: código 2033, RN doc 2032 | Baixa | RN doc está errada (LC 214/2025 Art. 349 confirma 2033) |
| D7 | CATEGORIA_ARTIGOS frontend × seed banco | **Média** | Unificar — artigos canônicos vêm do DB |
| ~~D8~~ | ~~Drift banco live × seed~~ | — | **FALSO POSITIVO** — SELECT inicial Manus foi errado; diagnóstico confirmou alinhamento |

---

### D2 — `tributacao_servicos`: órfã no RN doc (reclassificada)

**Status atualizado após diagnóstico 2026-04-18 (tarde):**

- DB live: **ausente** (nunca existiu — seed único 2026-04-10)
- Código enum `Categoria`: ausente
- `SEVERITY_TABLE`: ausente
- `TITULO_TEMPLATES`: ausente
- Frontend: sem referências
- CSVs SOLARIS: nenhuma pergunta
- **Produção 930001:** 0 riscos gerados
- **Única ocorrência no repo:** `docs/governance/RN_GERACAO_RISCOS_V4.md:92`
  (linha isolada dentro de bloco de exemplo da `SEVERITY_TABLE`)

**Diagnóstico:** categoria planejada/descartada durante Sprint Z-07
que ficou como comentário órfão no documento de RN. **Nunca foi
implementada.** Não há migration fantasma, não há drift de banco.

**Decisão P.O. (revisada):** **NÃO** aplicar Opção C (fusão com
`transicao_iss_ibs`) — basta **remover a linha 92 do RN doc** como
revisão documental. Prioridade **baixa**, junto com D3/D4.

---

### D3 — `inscricao_cadastral`: severidade

- DB: alta/imediata
- Código: alta/imediata
- RN doc: **media**/imediata

**Diagnóstico:** RN doc desatualizada. DB e código concordam.

**Decisão:** atualizar RN doc para alta/imediata (pós-snapshot).

---

### D4 — RN doc com categorias não implementadas

Consolidada em D2. `aliquota_reduzida` já existe em DB + código
(confirmado no diagnóstico). `tributacao_servicos` é órfã a remover
do RN doc linha 92.

---

### D5 — Thresholds do Compliance Score

| Nível | Código `compliance-score-v4.ts:46-51` | RN_CONSOLIDACAO_V4 §3 |
|---|---|---|
| critico | `score >= 75` | `score >= 70` **OU `totalAlta >= 2`** |
| alto | `score >= 50` | `score >= 50` **OU `totalAlta >= 1`** |
| medio | `score >= 25` | `score >= 30` |
| baixo | `score < 25` | `score < 30` |

**Divergência dupla:**
(a) limiares numéricos (75 vs 70, 25 vs 30)
(b) código **NÃO** tem bypass por `totalAlta` — RN tem

**Impacto:** projeto com 4 riscos alta + confidence=1.0:
- Código: score = 68.25 → "alto"
- RN: `totalAlta=4 ≥ 2` → "critico" (bypass)

**Decisão:** pendente P.O. Recomendação técnica: seguir RN doc
(bypass por totalAlta preserva sensibilidade a exposição alta em
projetos pequenos). Exige 1 PR em `compliance-score-v4.ts`.

---

### D6 — Timeline da reforma: 2032 vs 2033

- `ConsolidacaoV4.tsx §17.5` (código): marcos `2026 / 2027 / 2029 / 2033`
- `RN_CONSOLIDACAO_V4.md §4.9` (doc): marcos `[2026] [2027-2028] [2029] [2032]`

**Fato histórico:** LC 214/2025 Art. 349 + ADCT Art. 125 estabelecem
extinção do PIS/COFINS e ISS/ICMS em **2033**. Código está correto.

**Decisão:** atualizar RN doc de 2032 → 2033 (pós-snapshot).

---

### D7 — CATEGORIA_ARTIGOS frontend × seed banco

Identificada pelo inventário Manus §3. Frontend (`RiskDashboardV4.tsx`)
mantém mapa hardcoded `CATEGORIA_ARTIGOS` com artigos diferentes do
seed do banco:

| Categoria | Seed (banco) | Frontend hardcoded |
|---|---|---|
| split_payment | Art. 9 | Art. 29 |
| inscricao_cadastral | Art. 213 | Art. 21 |
| regime_diferenciado | Art. 29 | Art. 258 |
| obrigacao_acessoria | Art. 102 | Art. 88 |
| aliquota_zero | Art. 14 | Art. 125 |
| aliquota_reduzida | Art. 24 | Art. 120 |
| credito_presumido | Art. 58 | Art. 185 |

**Impacto jurídico:** o advogado pode ver 2 artigos diferentes para o
mesmo risco dependendo do componente que está consultando. Artigo é
**base legal** do parecer — divergência pode induzir erro.

**Manus qualificou como "só fallback de exibição"** — imprecisão:
embora o artigo canônico persista no banco, o mapa frontend pode
substituir em alguns componentes da UI. Precisa auditoria.

**Decisão:** remover `CATEGORIA_ARTIGOS` do frontend. Consumir sempre
`risk_categories.artigo_base` via tRPC. Prioridade **média**
(pós-snapshot).

---

### D8 — FALSO POSITIVO (descartada)

**Hipótese inicial:** drift entre seed e live DB.
**Diagnóstico posterior:** SELECT inicial Manus foi errado;
DB live alinhado ao seed desde 2026-04-10.
**Status:** descartada. Nenhuma ação técnica necessária.

---

## 6. CPIE — desambiguação e mapeamento dos 4 scores

O termo "CPIE" tem 3 significados históricos diferentes no repositório.
Esta seção desambigua e define qual é o "score na Matriz" que o P.O.
quer ver atualizando conforme aprovações.

### 6.1 Os 4 scores existentes — tabela definitiva

| # | Nome | Arquivo | Propósito | Reage a riscos aprovados? | Determinístico? |
|---|---|---|---|---|---|
| A | CPIE v1 (Profile) | `server/cpie.ts` | Qualidade do perfil (5 dims) | Não | Parcialmente (LLM para perguntas) |
| B | CPIE v2 (Profile + IA) | `server/cpie-v2.ts` | v1 + Arbitragem IA | Não | Parcialmente |
| C | CPIE-B (scoringEngine) | `server/routers/scoringEngine.ts` | Gaps 40% + Riscos 35% + Ações 25% | Sim — mas lê tabelas v3 legadas | Sim |
| D | **Compliance Score v4** | `server/lib/compliance-score-v4.ts` | `sum(peso × max(conf, 0.5)) / (n × 9) × 100` | **Sim — lê `risks_v4.approved_at`** | **Sim** |

**O que o P.O. quer na Matriz de Riscos:** o **score D (Compliance Score v4)**.
Esse sim muda conforme aprovações, é determinístico, e já está implementado.
Apenas **não está sendo exibido no RiskDashboardV4** — só é chamado no Step 7
(ConsolidacaoV4), uma única ocorrência em `server/routers/risks-v4.ts:1175`.

### 6.2 Score D (Compliance Score v4) — detalhamento

**Arquivo:** `server/lib/compliance-score-v4.ts`
**Determinismo:** 100% — mesma entrada, mesma saída. Zero LLM.
**RN:** RN-CV4-01..07, RN-CV4-10, RN-CV4-14

**Constantes:**
```typescript
SEVERIDADE_SCORE_MAP = { alta: 7, media: 5, oportunidade: 1 }
CONFIDENCE_FLOOR     = 0.5
MAX_PESO             = 9
```

**Filtros aplicados:**
1. RN-CV4-01: `approved_at IS NOT NULL` (riscos aprovados)
2. RN-CV4-02: `type !== 'opportunity'` (oportunidades fora)

**Fórmula:**
```
fator_confianca = max(risk.confidence, 0.5)
pontos_risco    = SEVERIDADE_SCORE_MAP[severidade] × fator_confianca
score           = ROUND(SUM(pontos_risco) / (n × 9) × 100)
```

**Classificação de nível (código `compliance-score-v4.ts:46-51`):**
```
score >= 75 → critico
score >= 50 → alto
score >= 25 → medio
score <  25 → baixo
```

### 6.3 ⚠️ Divergência adicional — D5

A RN_CONSOLIDACAO_V4.md usa thresholds diferentes do código:

| Nível | Código `compliance-score-v4.ts` | RN_CONSOLIDACAO_V4 |
|---|---|---|
| critico | `score >= 75` | `score >= 70` **OU `totalAlta >= 2`** |
| alto | `score >= 50` | `score >= 50` **OU `totalAlta >= 1`** |
| medio | `score >= 25` | `score >= 30` |
| baixo | `score < 25` | `score < 30` |

**Diagnóstico:** código e RN divergem em dois pontos:
(a) limiares numéricos (75 vs 70, 25 vs 30)
(b) código **NÃO** tem bypass por `totalAlta` — RN tem.

**Impacto no 930001 (hipótese):** projeto tem 4 riscos alta. Se todos
fossem aprovados com confidence=1.0:
- Pelo código: score = (4×7×1.0 + 3×5×1.0) / (7×9) × 100 = 43/63 × 100 = 68.25 → **alto**
- Pela RN: `totalAlta=4 ≥ 2` → **critico** (bypass)

Resultado potencialmente muito diferente. Precisa de decisão P.O.
(guardado para pós-snapshot junto com D3/D4).

### 6.4 Onde o Score D é calculado e usado hoje

```
CHAMADA: calculateComplianceScore() invocada em:
  server/routers/risks-v4.ts:1175  (procedure getConsolidacaoV4)

USADO POR:
  - ConsolidacaoV4.tsx (Step 7) — exibe score + snapshot

NÃO USADO POR:
  - RiskDashboardV4.tsx (Step 5 / Matriz) ← LACUNA IDENTIFICADA
  - ActionPlanPage.tsx (Step 6 / Planos)  ← LACUNA
  - Dashboard do projeto (visão geral)     ← LACUNA

PERSISTÊNCIA:
  projects.scoringData (JSON) — snapshots[], score_atual, nivel_atual
  Gravado em cada visita à ConsolidacaoV4.
```

### 6.5 Regra de integração DEC-01 (revisada) — Compliance Score na Matriz

Para atender ao P.O. ("preciso dele na matriz, pois conforme os riscos
aprovados, o nível de compliance pode aumentar ou diminuir"):

```
RiskDashboardV4 deve exibir um componente:

  ┌──────────────────────────────────────────────────┐
  │ SCORE DE COMPLIANCE: 43/100 · Nível: MÉDIO       │
  │ ─────────────────────────────────────────────    │
  │ Calculado sobre: 3 riscos aprovados              │
  │ [alta: 1] [media: 2] · 7 pendentes · 3 opor.     │
  │                                                  │
  │ O score sobe conforme você aprova/exclui riscos. │
  │ Ver detalhe auditável na Consolidação.           │
  └──────────────────────────────────────────────────┘

Reatividade:
  - Recalcula a cada approveRisk / deleteRisk
  - Usa mesma procedure: calculateComplianceScore(risks)
  - Invalida cache ao montar (consistente com Step 7)

NÃO é o CPIE v1/v2 (score A/B — qualidade do perfil).
É o Compliance Score v4 (score D — exposição tributária aprovada).

Semântica visível ao advogado:
  - "SCORE DE COMPLIANCE" (label do card)
  - Não usar a sigla "CPIE" na UI (confunde com score A/B)
  - O termo CPIE fica como nome técnico interno
```

### 6.6 E o score A/B (CPIE Profile) — ainda tem lugar?

Sim, mas secundário:
- **Dashboard do projeto (Step 1-3):** KPI "Qualidade do Perfil"
- **Header da Matriz:** chip pequeno "Perfil 75/100" — só aviso se < 50
- **Nunca** se confunde com o Score de Compliance principal

### 6.7 Status de débito técnico (ADR-0023)

```
ADR-0023 (2026-04-09):
  "Score CPIE-B continua lendo tabelas legadas (v3) até PR #E.
   Projetos novos com engine v4 terão CPIE-B zerado até PR #E."

Confirmação no 930001:
  profileCompleteness = 0
  profileConfidence = 0

O que funciona hoje:
  ✅ Score D (Compliance Score v4) — calculado corretamente
     sobre risks_v4, mas só exibido no Step 7.
  ❌ Score C (CPIE-B scoringEngine) — zerado para projetos v4.
  ❓ Score A/B (CPIE Profile) — precisa verificar se leitura
     de companyProfile funciona apesar de CPIE-B zerado.

PR #E pendente reconcilia Score C com engine v4.
Mesmo sem PR #E, podemos avançar com Score D na Matriz
(implementação nova, independente de reconciliação).
```

---

## 7. Fórmula do score de compliance (fonte: RN_CONSOLIDACAO_V4)

```typescript
// Constantes
SEVERIDADE_SCORE_MAP = { alta: 7, media: 5, oportunidade: 1 }
MAX_PESO            = 9
CONFIDENCE_FLOOR    = 0.5

// Filtros
riscos_elegiveis = WHERE type='risk'
                     AND status='active'
                     AND approved_at IS NOT NULL

// Cálculo por risco
fator_confianca = max(risk.confidence, 0.5)
pontos_risco    = SEVERIDADE_SCORE_MAP[severidade] × fator_confianca

// Score total
n                = COUNT(riscos_elegiveis)
soma_pontos      = SUM(pontos_risco)
score            = ROUND(soma_pontos / (n × 9) × 100)

// Níveis
score >= 70 OU totalAlta >= 2  → critico
score >= 50 OU totalAlta >= 1  → alto
score >= 30                    → medio
score <  30                    → baixo
```

**Regras:**
- Oportunidades **FORA** do numerador E denominador.
- `rag_confidence` **não entra** (só alerta visual).
- Snapshot salvo em `projects.scoringData.snapshots[]` a cada visita.
- `formula_version: 'v4.0'` registrada para auditoria futura.

---

## 8. Gate 7 — 4 provas de qualidade

Fonte: `docs/governance/GOVERNANCA-E2E-IA-SOLARIS.md:385-388`

| Prova | Regra | Falha se |
|---|---|---|
| P1 — Quantidade | 10 ≤ total ≤ 40 | total = 0 ou total > 60 |
| P2 — Inferência normativa | `aliquota_zero` + `credito_presumido` presentes | aba Oportunidades vazia |
| P3 — Títulos jurídicos | Sem `"[categoria]"` e sem `"geral"` | qualquer título com colchetes ou "geral" |
| P4 — RAG validation | ≥ 50% riscos com `rag_validated=1` | 0% validados |

---

## 9. Estado do projeto de referência 930001

Fonte: queries Manus 2026-04-18.

### 9.1 Perfil

| Campo | Valor |
|---|---|
| id | 930001 |
| profileCompleteness | **0** (CPIE zerado — ADR-0023) |
| profileConfidence | **0** |
| companyProfile.annualRevenueRange | 4800000-78000000 |
| companyProfile.cnpj | 00.394.460/0058-87 |
| companyProfile.companySize | media |
| companyProfile.companyType | ltda |
| companyProfile.isEconomicGroup | false |
| companyProfile.taxCentralization | centralized |
| companyProfile.taxRegime | lucro_real |

### 9.2 Distribuição de riscos

```
Total de riscos: 10
Total de grupos: 10 (1 risco por categoria — suspeito)
```

| categoria | severidade | total |
|---|---|---|
| aliquota_reduzida | oportunidade | 1 |
| aliquota_zero | oportunidade | 1 |
| confissao_automatica | alta | 1 |
| credito_presumido | oportunidade | 1 |
| imposto_seletivo | alta | 1 |
| inscricao_cadastral | alta | 1 |
| obrigacao_acessoria | media | 1 |
| regime_diferenciado | media | 1 |
| split_payment | alta | 1 |
| transicao_iss_ibs | media | 1 |

**Distribuição:** 4× alta · 3× media · 3× oportunidade · 0× critica · 0× baixa.

### 9.3 Observações sobre a distribuição

1. **Um risco por categoria — POR DESIGN** (decisão P.O. 2026-04-18):
   > "não posso repetir riscos, por isso, é um risco por categoria,
   >  caso contrário poderia ter o mesmo risco em várias categorias"

   Implicação técnica: `consolidateRisks()` agrupa por
   `risk_key = {categoria}::op:{tipoOperacao}::geo:{mono|multi}`.
   Se múltiplos gaps de uma mesma categoria coincidem em
   `tipoOperacao` + `multiestadual`, são fundidos em 1 risco —
   é isso que gera a distribuição 1:1 observada.

   **Regra do P.O.:** nunca repetir categoria. 930001 com
   `tipoOperacao='comercio'` uniforme produz exatamente 10 riscos
   para 10 categorias ativas (excluindo `tributacao_servicos` órfã).

   **Atenção:** se um projeto futuro tiver `multiestadual` alternado
   entre gaps de mesma categoria, `risk_key` gera 2 grupos distintos
   e a regra "1 por categoria" é violada. Ver `risk-engine-v4.ts:238-242`.
   **Ação P3:** testar se o engine garante unicidade por CATEGORIA
   (não só por risk_key) — pode precisar ajuste.

2. **`aliquota_reduzida` gerada corretamente via DB** (D1 descartada).
   Diagnóstico 2026-04-18 confirmou que a categoria existe em
   `risk_categories` (row 9, Art. 24). O risco veio do caminho oficial
   `getCategoryByCode()`, não de fallback. Funcionamento esperado.

3. **`tributacao_servicos` não gerada** — correto. Nunca foi
   implementada; só aparece no RN doc como órfã (D2 reclassificada).

4. **`inscricao_cadastral` como alta** — DB e código alinhados.
   RN doc desatualizada (D3).

### 9.4 Gate 7 — aferição COMPLETA

Dados confirmados pelo Manus em 2026-04-18:

| Prova | Status | Evidência |
|---|---|---|
| P1 — Quantidade | **PASS** | 10 riscos (borda inferior do intervalo 10-40) |
| P2 — Inferência normativa | **PASS** | `aliquota_zero` + `credito_presumido` presentes |
| P3 — Títulos jurídicos | **PASS** | 10 títulos com templates canônicos — nenhum com `[categoria]` ou palavra isolada "geral" (todos têm "comercio" no lugar de {op}) |
| P4 — RAG validation | **PASS** | **100% (10/10) `rag_validated=1`** — excelente |

**Resultado: 4/4 PASS.** Projeto 930001 passa todas as provas Gate 7.

**Títulos observados (P3):**
```
1.  Risco de incidência do Imposto Seletivo nas operações de comercio
2.  Risco de irregularidade cadastral no IBS/CBS nas operações de comercio
3.  Oportunidade de aproveitamento de crédito presumido nas operações de comercio
4.  Risco de enquadramento incorreto em regime diferenciado nas operações de comercio
5.  Risco de inconsistência na transição ISS/IBS nas operações de comercio
6.  Oportunidade de alíquota reduzida nas operações de comercio
7.  Risco de não conformidade com Split Payment nas operações de comercio
8.  Oportunidade de alíquota zero sobre produtos elegíveis nas operações de comercio
9.  Risco de confissão automática de débitos nas operações de comercio
10. Risco de descumprimento de obrigações acessórias nas operações de comercio
```

Todos seguem `TITULO_TEMPLATES[categoria]` com `{op}='comercio'`.
Nenhum caiu no fallback `"Risco: ${categoria} nas operações de {op}"`.

### 9.5 Verificações complementares ainda pendentes (não-Gate 7)

| # | Check | Query pendente |
|---|---|---|
| V1 | Breadcrumb 4 nós | `SELECT breadcrumb FROM risks_v4 WHERE project_id=930001` — contar `JSON_LENGTH(breadcrumb)=4` |
| V2 | Ordenação `SEVERITY_ORDER` respeitada | `SELECT severidade, COUNT(*) FROM risks_v4 WHERE project_id=930001 ORDER BY id` → verificar sequência |
| V3 | Invariante RN-RISK-05 (oportunidade → sem plano) | `SELECT COUNT(*) FROM action_plans ap JOIN risks_v4 r ON ap.risk_id=r.id WHERE r.type='opportunity' AND r.project_id=930001` → deve ser 0 |
| V4 | Consistência `type ⇔ severidade` | `SELECT type, severidade, COUNT(*) FROM risks_v4 WHERE project_id=930001 GROUP BY type, severidade` |
| V5 | **Unicidade por categoria** (regra P.O.) | `SELECT categoria, COUNT(*) FROM risks_v4 WHERE project_id=930001 GROUP BY categoria HAVING COUNT(*) > 1` — deve retornar 0 linhas |
| V6 | Compliance Score atual (se riscos aprovados) | `SELECT scoringData FROM projects WHERE id=930001` + calcular hipotético |

---

## 10. Status dos 21 bugs UAT Gate E (2026-04-11)

Fonte: `0-MatrizRisco/MOCKUP - RISCO/UAT_GATE_E_FAIL_REPORT.md`.

Status "presume-fechado" com base em sprints Z-13 a Z-18.
Requer **auditoria de código** para confirmar cada item.

### 10.1 RiskDashboardV4 (B-01 a B-13)

| # | Bug | Presunção | Verificar em |
|---|---|---|---|
| B-01 | Geração automática pós-briefing | FECHADO (Z-14) | `routers-fluxo-v3.ts` + frontend |
| B-02 | Botões do card (Editar/Excluir/Aprovar) | FECHADO (Z-15) | `RiskDashboardV4.tsx` |
| B-03 | Estado approved vs pending | FECHADO (Z-15) | `RiskDashboardV4.tsx` |
| B-04 | Modal de aprovação de risco | FECHADO (Z-15) | `RiskDashboardV4.tsx` |
| B-05 | Modal de exclusão (soft delete) | FECHADO (Z-15) | `RiskDashboardV4.tsx` |
| B-06 | Summary bar 4 cards | VERIFICAR | `RiskDashboardV4.tsx` |
| B-07 | Banner de aprovação pendente | VERIFICAR | `RiskDashboardV4.tsx` |
| B-08 | Agrupamento por categoria | VERIFICAR | `RiskDashboardV4.tsx` |
| B-09 | Painel evidências por SOURCE_RANK | VERIFICAR | `RiskDashboardV4.tsx` |
| B-10 | Aba Oportunidades (teal, sem "+ Plano") | VERIFICAR | `RiskDashboardV4.tsx` |
| B-11 | Aba Histórico (restore + audit_log) | VERIFICAR | `RiskDashboardV4.tsx` |
| B-12 | Chips dinâmicos de categoria | VERIFICAR | `RiskDashboardV4.tsx` |
| B-13 | Breadcrumb clicável (nó 3 modal, nó 4 tooltip) | VERIFICAR | `RiskDashboardV4.tsx` |

### 10.2 ActionPlanPage (B-14 a B-21)

| # | Bug | Presunção | Verificar em |
|---|---|---|---|
| B-14 | Integração ao fluxo (não tela vazia) | FECHADO (Z-14) | `ActionPlanPage.tsx` |
| B-15 | Banner rastreabilidade sticky | FECHADO (Z-12) | `ActionPlanPage.tsx:941` (TraceabilityBanner) |
| B-16 | Estado rascunho (opacity 40%) | FECHADO (Z-12) | `ActionPlanPage.tsx` |
| B-17 | Botão aprovar plano | FECHADO (Z-14) | `ActionPlanPage.tsx` |
| B-18 | Progresso barra X/N | VERIFICAR | `ActionPlanPage.tsx` |
| B-19 | Status inline tarefa | VERIFICAR | `ActionPlanPage.tsx` |
| B-20 | Modal editar plano | FECHADO (Z-16 #614) | `ActionPlanPage.tsx` |
| B-21 | Modal editar tarefa | FECHADO (Z-16 #614) | `ActionPlanPage.tsx` |

**Total presumido-fechado:** 9/21
**Total a verificar:** 12/21

---

## 11. Pendências técnicas e de produto (pós-snapshot)

Lista ordenada por prioridade. Nenhum item foi executado neste snapshot.

### P0 — Bloqueadores do snapshot (aprovação P.O.)

- **P0.1** — Decisão Q3: `aliquota_reduzida` remover do código OU adicionar ao DB (pendente).
- **P0.2** — Concluir auditoria dos 12 bugs UAT Gate E "a verificar".

### P1 — Alinhamento pós-snapshot

- **P1.1** — PR de governança: atualizar RN_GERACAO_RISCOS_V4 (D3, D4, D2).
- **P1.2** — Migration: DELETE `tributacao_servicos` de `risk_categories` (decisão C).
- **P1.3** — Código: remover referências a `tributacao_servicos` em docs (D4).
- **P1.4** — Decidir e aplicar resolução D1 (`aliquota_reduzida`).

### P2 — Débitos técnicos conhecidos

- **P2.1** — PR #E: reconciliar CPIE com engine v4 (ADR-0023). Elimina `profileCompleteness=0` em projetos novos.
- **P2.2** — Verificar por que `consolidateRisks` produziu 1 risco por grupo no 930001 (esperado: múltiplos gaps consolidados por `risk_key`).
- **P2.3** — Completar queries Gate 7 P3/P4 (títulos e `rag_validated`).

### P3 — Suite de testes (camadas propostas)

- **P3.1** — Camada 1: unit tests do engine (`risk-engine-v4.afericao.test.ts`).
- **P3.2** — Camada 2: script `scripts/audit-risk-matrix.mjs` (aferição real no 930001).
- **P3.3** — Camada 3: E2E Playwright da matriz (regression guard).
- **P3.4** — `scripts/categoria-drift-check.mjs` (DB × código × RN).

---

## 12. Referências cruzadas

- `docs/adr/ADR-0022-hot-swap-risk-engine-v4.md` — engine v4 ativo
- `docs/adr/ADR-0023-cpie-score-opcao-a-sprint-z07.md` — débito CPIE
- `docs/adr/ADR-0025-risk-categories-configurable-rag-sensor.md` — risk_categories configurável
- `docs/governance/RN_GERACAO_RISCOS_V4.md` — spec geração (desatualizada nos pontos D2, D3, D4)
- `docs/governance/RN_CONSOLIDACAO_V4.md` — score de compliance Step 7
- `docs/governance/RN_PLANOS_TAREFAS_V4.md` — planos e tarefas
- `docs/governance/GOVERNANCA-E2E-IA-SOLARIS.md` — Gate 7 P1-P4
- `server/lib/risk-engine-v4.ts` — engine determinístico
- `server/lib/rag-risk-validator.ts` — enrichment RAG
- `server/cpie-v2.ts` — CPIE v2

---

## 13. Rastreabilidade risco → gap → onda (NOVO)

> Inserido para atender pedido P.O. 2026-04-18:
> "identificar a fonte dos riscos, e a fonte da fonte, ou seja,
>  quero saber se temos os gaps identificados nas 3 ondas,
>  se essas são as fontes para gerar riscos, e a regra ou fórmula
>  para gerar risco. Nosso compromisso é 98% ou superior de
>  confiabilidade, este trabalho é essencial antes da liberação
>  para os advogados testarem."

### 13.1 As 3 ondas de origem — com schemas confirmados

```
╔══════════════════════════════════════════════════════════════════════╗
║ ONDA 1 — SOLARIS (Questionário jurídico curado pela equipe)          ║
╠══════════════════════════════════════════════════════════════════════╣
║ Tabela:      solaris_answers JOIN solaris_questions                  ║
║ Chave:       solaris_questions.risk_category_code                    ║
║ Qualif:      classification_scope = 'risk_engine' AND ativo = 1      ║
║ Fonte:       'solaris' — SOURCE_RANK = 4                             ║
║ Confidence:  1.0 (fixo — resposta humana)                            ║
║ Gap gerado:  compliance_status ∈ {nao_atendido, parcial}             ║
║ Pipeline:    analyze-gaps-questionnaires.ts                          ║
║ Migration:   0068_solaris_questions_risk_category.sql                ║
╚══════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════╗
║ ONDA 2 — IA GEN (Questionário personalizado pela IA)                 ║
╠══════════════════════════════════════════════════════════════════════╣
║ Tabela:      iagen_answers                                           ║
║ Chave:       iagen_answers.risk_category_code                        ║
║ Qualif:      risk_category_code IS NOT NULL                          ║
║ Fonte:       'iagen' — SOURCE_RANK = 5                               ║
║ Confidence:  ia.confidence_score (default 0.7)                       ║
║ Gap gerado:  compliance_status ∈ {nao_atendido, parcial}             ║
║ Pipeline:    analyze-gaps-questionnaires.ts (mesma função)           ║
║ Migration:   0069_iagen_answers_risk_category.sql                    ║
╚══════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════╗
║ ONDA 3A — RAG NORMATIVO (compliance contra regulatory_requirements)  ║
╠══════════════════════════════════════════════════════════════════════╣
║ Tabela:      regulatory_requirements_v3 (138 requisitos)             ║
║ Chave:       req.code (REQ-APU-001, REQ-IS-003, etc.)                ║
║ Fonte:       'cnae' (1), 'ncm' (2), 'nbs' (3)                        ║
║ Confidence:  variável conforme match                                 ║
║ Gap gerado:  analyzeGaps() → project_gaps_v3                         ║
║ Pipeline:    routers/gapEngine.ts (LEGADO)                           ║
╚══════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════╗
║ ONDA 3B — INFERÊNCIA NORMATIVA POR PERFIL (aditiva)                  ║
╠══════════════════════════════════════════════════════════════════════╣
║ Tabela:      normative_product_rules (migration 0076)                ║
║ Chave:       match por NCM + regime tributário                       ║
║ Fonte:       'ncm' (SOURCE_RANK 2)                                   ║
║ Gap gerado:  não gera gap — gera risco DIRETO (sem questionário)     ║
║ Pipeline:    server/lib/normative-inference.ts                       ║
║ Observação:  independente dos questionários — mesmo sem Ondas 1+2    ║
║              uma empresa com CNAE X + NCM Y pode ter risco gerado    ║
╚══════════════════════════════════════════════════════════════════════╝
```

### 13.2 Pipeline completo — gap → risco (código real)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. COLETA DE RESPOSTAS                                              │
│    solaris_answers (Onda 1) + iagen_answers (Onda 2)                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. analyzeGapsFromQuestionnaires() — Z-11                           │
│    server/lib/analyze-gaps-questionnaires.ts:170                    │
│                                                                     │
│    SELECT answer_value, risk_category_code, fonte, confidence       │
│    FROM solaris_answers JOIN solaris_questions                      │
│         WHERE classification_scope='risk_engine' AND ativo=1        │
│    UNION ALL                                                        │
│    FROM iagen_answers WHERE risk_category_code IS NOT NULL          │
│                                                                     │
│    Classificação pessimista por categoria (DEC-Z11-ARCH-02):        │
│      qualquer resposta 'nao_atendido' → categoria 'nao_atendido'    │
│      se todas 'atendido' → sem gap                                  │
│      se todas 'nao_aplicavel' → sem gap                             │
│                                                                     │
│    INSERT project_gaps_v3 (categoria=nao_atendido ou parcial)       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. analyzeGaps() — LEGADO Onda 3A                                   │
│    server/routers/gapEngine.ts                                      │
│                                                                     │
│    Para cada CNAE confirmado:                                       │
│      match regulatory_requirements_v3                               │
│      compara com respostas do questionário                          │
│    INSERT project_gaps_v3 (ondas 3)                                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. generateRisksV4Pipeline() — Z-13.5                               │
│    server/lib/generate-risks-pipeline.ts                            │
│                                                                     │
│    a) extractProjectProfile(projectId)                              │
│       → ProjectProfile {cnaes, taxRegime, tipoOperacao, ...}        │
│                                                                     │
│    b) consolidateRisks(projectId, gaps, context, actorId)           │
│       → agrupa gaps por risk_key = {cat}::op:{op}::geo:{mono|multi} │
│       → 1 grupo = 1 risco (consolidação por chave)                  │
│       → severidade via getCategoryByCode(DB) ou SEVERITY_TABLE      │
│       → artigo via risk_categories.artigo_base ou gap.artigo        │
│       → breadcrumb = [bestSource, categoria, artigo, risk_key]      │
│       → titulo via TITULO_TEMPLATES[categoria] com {op} substituído │
│       → confidence = weighted avg por 1/SOURCE_RANK                 │
│                                                                     │
│    c) inferNormativeRisks(projectId, profile)                       │
│       → lê normative_product_rules × profile.productNcms            │
│       → gera riscos ADICIONAIS sem passar por gaps                  │
│                                                                     │
│    d) mergeByRiskKey([consolidated, inferred])                      │
│       → último vence em colisão                                     │
│                                                                     │
│    e) enrichAllWithRag(merged, 3000ms timeout)                      │
│       → para cada risco: LIKE query em ragDocuments                 │
│       → se hit: rag_validated=1, rag_confidence=0.85                │
│       → se miss: rag_validated=0, confidence × 0.75 (penalidade)    │
│                                                                     │
│    f) summary { total, alta, media, oportunidades, rag_validated }  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. INSERT INTO risks_v4                                             │
│    approved_at = NULL, approved_by = NULL, status = 'active'        │
│    (tabela server/lib/db-queries-risks-v4.ts)                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 13.3 Fórmula de geração — RESUMO DETERMINÍSTICO

**Severidade do risco:**
```
severidade = DB.risk_categories[categoria].severidade
             OR SEVERITY_TABLE[categoria].severity
             OR 'media' (último fallback — deveria nunca acontecer)
```

**Urgência do risco:**
```
urgencia = DB.risk_categories[categoria].urgencia
           OR SEVERITY_TABLE[categoria].urgency
           OR 'curto_prazo' (último fallback)
```

**Tipo do risco:**
```
type = DB.risk_categories[categoria].tipo
       OR (severidade === 'oportunidade' ? 'opportunity' : 'risk')
```

**Artigo:**
```
artigo = DB.risk_categories[categoria].artigo_base
         OR gap.artigo (primeiro gap do grupo)
         (NUNCA inventado por LLM — RN-RISK-01)
```

**Título:**
```
titulo = TITULO_TEMPLATES[categoria].replace('{op}', ctx.tipoOperacao ?? 'geral')
         OR `Risco: ${categoria} nas operações de {op}` (fallback)
```

**Confidence:**
```
confidence_por_gap = 1 / SOURCE_RANK[gap.fonte]
confidence_risco   = Σ(confidence_gap × evidence.confidence) / Σ(confidence_gap)
                     (média ponderada por 1/SOURCE_RANK)

se RAG hit:  confidence × 0.8 + 0.85 × 0.2 (blend)
se RAG miss: confidence × 0.75            (penalidade)
```

**Breadcrumb (4 nós, sempre):**
```
[0] fonte  = gap com menor SOURCE_RANK do grupo
[1] categoria
[2] artigo = risk_categories.artigo_base OU gap.artigo
[3] risk_key ou rule_id
```

**Score de compliance do projeto (agregado, para o RiskDashboardV4):**
```
filtro: risks_v4 WHERE project_id = ? AND status = 'active'
                   AND approved_at IS NOT NULL
                   AND type = 'risk'

fator_confianca = max(risk.confidence, 0.5)
pontos_risco    = {alta: 7, media: 5, oportunidade: 1}[severidade] × fator_confianca
score_projeto   = ROUND(Σ pontos_risco / (n × 9) × 100)

nivel (código): >=75 critico / >=50 alto / >=25 medio / <25 baixo
(ver D5 — divergência com RN)
```

### 13.4 Verificação no 930001 — rastreabilidade

Para fechar a auditoria de rastreabilidade, queries necessárias
(pedido Manus):

```sql
-- Q1: Quantos gaps por projeto, separados por onda
SELECT source_type AS onda, COUNT(*) total
FROM project_gaps_v3
WHERE project_id = 930001
GROUP BY source_type;

-- Q2: Rastreabilidade risco → gap (via rule_id ou evidence JSON)
SELECT r.id, r.categoria, r.rule_id, r.source_priority,
       JSON_LENGTH(JSON_EXTRACT(r.evidence, '$.gaps')) n_gaps_evidence
FROM risks_v4 r
WHERE r.project_id = 930001
ORDER BY r.categoria;

-- Q3: Existem riscos sem gap de origem? (violação RN-RISK-06)
SELECT r.id, r.categoria, r.rule_id
FROM risks_v4 r
WHERE r.project_id = 930001
  AND (r.rule_id IS NULL OR r.rule_id = '');

-- Q4: Respostas SOLARIS com risk_category_code (Onda 1)
SELECT sq.risk_category_code, COUNT(*) respostas
FROM solaris_answers sa
JOIN solaris_questions sq ON sq.id = sa.question_id
WHERE sa.project_id = 930001
  AND sq.risk_category_code IS NOT NULL
GROUP BY sq.risk_category_code;

-- Q5: Respostas IA GEN com risk_category_code (Onda 2)
SELECT risk_category_code, COUNT(*) respostas
FROM iagen_answers
WHERE project_id = 930001
  AND risk_category_code IS NOT NULL
GROUP BY risk_category_code;

-- Q6: Riscos da inferência normativa (Onda 3B) vs gaps (Ondas 1+2+3A)
SELECT CASE
         WHEN r.rule_id LIKE 'infer_%' THEN 'inferido'
         ELSE 'gap'
       END AS origem,
       COUNT(*) total
FROM risks_v4 r
WHERE r.project_id = 930001
GROUP BY origem;
```

Sem essas queries, não sabemos:
- quantos gaps saíram de cada onda
- se todos os 10 riscos estão rastreáveis a gaps
- se `aliquota_reduzida` veio de Onda 1, 2 ou 3
- se algum risco veio só de `inferNormativeRisks` (sem gap)

### 13.5 Meta de 98% de confiabilidade — o que aferir

Para fechar o compromisso antes da liberação para advogados:

| Critério | Como medir | Status 930001 |
|---|---|---|
| 1. Todo risco tem origem | `rule_id IS NOT NULL` em 100% | Pendente Q3 |
| 2. Toda categoria veio de ≥1 onda | Q4 + Q5 cobrem 10 categorias | Pendente |
| 3. Severidade determinística | DB.risk_categories não modificado em runtime | OK (função pura) |
| 4. Artigo rastreável ao RAG | rag_validated = 1 em ≥50% | **100% PASS** |
| 5. Breadcrumb 4 nós | `JSON_LENGTH(breadcrumb) = 4` em 100% | Pendente V1 |
| 6. Sem planos para oportunidade | RN-RISK-05 | Pendente V3 |
| 7. Unicidade por categoria | Uma linha por codigo por projeto | Pendente V5 |
| 8. Score visível ao advogado | Score D aparece no RiskDashboardV4 | **FALHA** (só Step 7) |
| 9. Fonte primária explícita | Breadcrumb[0] = fonte de menor SOURCE_RANK | Pendente V1 |
| 10. Nenhuma categoria órfã gerando | `tributacao_servicos` não aparece | PASS (já confirmado) |

**Nota:** Critérios 1-7 e 9-10 são **propriedades do engine**.
Critério 8 é **propriedade de UI** (lacuna identificada em 6.4).
Precisa ser atacado antes da liberação.

---

## 14. Decisões registradas nesta iteração

| # | Decisão | Por | Data |
|---|---|---|---|
| DEC-01 | Score **D (Compliance Score v4)** deve ser exibido no RiskDashboardV4, atualizando com aprovações/exclusões de riscos. Score A/B (CPIE Profile) permanece secundário (chip/aviso). NÃO usar sigla "CPIE" na UI principal. | P.O. | 2026-04-18 |
| DEC-02 | `tributacao_servicos`: remover linha 92 do RN_GERACAO_RISCOS_V4.md (reclassificada como órfã no doc — nunca foi implementada, Opção C original não se aplica) | P.O. | 2026-04-18 |
| DEC-03 | Alinhamento RN × código × DB (D3, D5, D6) fica para PR pós-snapshot | P.O. | 2026-04-18 |
| DEC-04 | `aliquota_reduzida` — confirmada presente em DB (row 9) e código; sem ação necessária (D1 descartada) | diagnóstico | 2026-04-18 |
| DEC-05 | "1 risco por categoria" é regra de produto inviolável — não pode haver o mesmo risco em 2 categorias, nem 2 riscos da mesma categoria | P.O. | 2026-04-18 |
| DEC-06 | Meta de 98% de confiabilidade antes de liberar para advogados — 10 critérios auditáveis listados em §13.5 | P.O. | 2026-04-18 |
| DEC-07 | Snapshot + inventário consolidados em 1 arquivo único (Opção A) | P.O. | 2026-04-18 |
| DEC-08 | D7 (CATEGORIA_ARTIGOS frontend) elevada para prioridade média — advogado não pode ver 2 artigos diferentes | P.O. | 2026-04-18 |
| DEC-09 | D8 (drift DB) descartada — era falso positivo da query Manus inicial | diagnóstico | 2026-04-18 |

---

## 15. Schemas detalhados (integrado do inventário Manus)

### 15.1 Tabela `risks_v4`

Migration principal: `drizzle/0064_risks_v4.sql` (Z-07). Campos adicionados
em migrations posteriores (`0075_risks_v4_rag_fields.sql`, Z-13.5).

| Coluna | Tipo | Constraint | Descrição |
|---|---|---|---|
| id | VARCHAR(36) | PK | UUID v4 gerado pelo servidor |
| project_id | INT | NOT NULL | FK → projects.id |
| rule_id | VARCHAR(255) | NOT NULL | Chave da regra de origem (GAP-IS-001 ou risk_key) |
| type | ENUM('risk','opportunity') | NOT NULL | — |
| categoria | VARCHAR(100) | NOT NULL, FK → risk_categories.codigo | 0066/0067 |
| titulo | VARCHAR(500) | NOT NULL | Determinístico |
| descricao | TEXT | NULL | Pode ser LLM |
| artigo | VARCHAR(255) | NOT NULL | RN-RISK-01 — nunca NULL |
| severidade | ENUM('alta','media','oportunidade') | NOT NULL | RN-RISK-02 — nunca LLM |
| urgencia | ENUM('imediata','curto_prazo','medio_prazo') | NOT NULL | Determinística |
| evidence | JSON | NOT NULL | Array ordenado por SOURCE_RANK |
| breadcrumb | JSON | NOT NULL | 4 nós: [fonte, categoria, artigo, ruleId] |
| source_priority | ENUM('cnae','ncm','nbs','solaris','iagen') | NOT NULL | Fonte menor SOURCE_RANK |
| confidence | DECIMAL(5,4) | NOT NULL DEFAULT 1.0 | 0.0–1.0 |
| status | ENUM('active','deleted') | NOT NULL DEFAULT 'active' | Soft delete |
| approved_by | INT | NULL | — |
| approved_at | TIMESTAMP | NULL | NULL = pendente |
| deleted_reason | TEXT | NULL | Obrigatório quando status='deleted' |
| created_by, updated_by | INT | NOT NULL | — |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | — |
| updated_at | TIMESTAMP | NOT NULL DEFAULT NOW() ON UPDATE | — |

Campos RAG (Z-13.5):
| Coluna | Tipo | Descrição |
|---|---|---|
| risk_key | VARCHAR(255) NULL | `{cat}::op:{op}::geo:{mono\|multi}` |
| operational_context | JSON NULL | Contexto operacional (CNAEs, regime...) |
| evidence_count | INT NOT NULL DEFAULT 0 | Gaps consolidados neste risco |
| rag_validated | TINYINT(1) NOT NULL DEFAULT 0 | 1 = validado |
| rag_confidence | DECIMAL(3,2) NOT NULL DEFAULT 0 | 0.00–1.00 |
| rag_artigo_exato | VARCHAR(255) NULL | Artigo encontrado no corpus |
| rag_paragrafo, rag_inciso | VARCHAR(100) NULL | — |
| rag_trecho_legal | TEXT NULL | Primeiros 500 chars |
| rag_query | VARCHAR(500) NULL | Query LIKE usada |
| rag_validation_note | TEXT NULL | Nota de validação |

**Índices:** project_id, status, rule_id.

### 15.2 Tabelas `action_plans` e `tasks` + `audit_log`

**`action_plans`:** prazo ENUM `30_dias|60_dias|90_dias|180_dias`
(`180_dias` adicionado em `0077_add_180_dias_prazo.sql`). Status ENUM
`rascunho|aprovado|em_andamento|concluido|deleted` (default `rascunho`).

**`tasks`:** status ENUM `todo|doing|done|blocked|deleted`. Campos
`data_inicio, data_fim` DATE NULL (migration `0087_tasks_data_inicio_fim.sql`).

**`audit_log`:** entity ENUM `risk|action_plan|task`; action ENUM
`created|updated|deleted|restored|approved`; `created_at` **imutável**
(sem `ON UPDATE`). `before_state` obrigatório em `deleted`.
`reason.length >= 10` em deletes.

---

## 16. Procedures tRPC — risks-v4 router (19 procedures)

Arquivo: `server/routers/risks-v4.ts`

| # | Procedure | Tipo | Sprint | Descrição |
|---|---|---|---|---|
| 1 | `generateRisks` | mutation | Z-07 | Pipeline completo: gaps → consolidação → RAG → persist |
| 2 | `listRisks` | query | Z-07 | Lista riscos ativos com planos/tarefas aninhados |
| 3 | `getActionPlanSuggestion` | query | Z-07 | Sugestão de plano via LLM |
| 4 | `deleteRisk` | mutation | Z-07 | Soft delete com cascata |
| 5 | `restoreRisk` | mutation | Z-07 | Restore (90 dias) |
| 6 | `approveRisk` | mutation | Z-07 | `approved_at=NOW()` |
| 7 | `bulkApprove` | mutation | Z-14 #533 | Aprova todos pendentes |
| 8 | `upsertActionPlan` | mutation | Z-07 | Cria/edita plano |
| 9 | `deleteActionPlan` | mutation | Z-07 | Soft delete com cascata |
| 10 | `restoreActionPlan` | mutation | Z-07 | Restore |
| 11 | `approveActionPlan` | mutation | Z-07 | Aprova + dispara `persistCpieScore` (fire-and-forget) |
| 12 | `upsertTask` | mutation | Z-07 | Cria/edita tarefa |
| 13 | `deleteTask` | mutation | Z-07 | Soft delete |
| 14 | `mapGapsToRules` | mutation | Z-10 | ACL gap → rule |
| 15 | `generateRisksFromGaps` | mutation | Z-10 | Versão sem LLM de tarefas |
| 16 | `getAuditLog` | query | Z-07 | Audit log do projeto |
| 17 | `bulkGenerateActionPlans` | mutation | Z-14 | Planos para todos aprovados |
| 18 | `getProjectAuditLog` | query | Z-14 | Audit log completo |
| 19 | `calculateAndSaveScore` | mutation | Z-16 #622 | Score v4 + snapshot |

**Regras implícitas:**
- `generateRisks` usa concorrência 3 para LLM de tarefas
- Falhas de tarefa → audit_log (`after_state.error`), sem interromper fluxo
- `approveActionPlan` não aguarda `persistCpieScore` (assíncrono)

---

## 17. Regras de Negócio — consolidado

### 17.1 RN-RISK (geração)

| Código | Regra | Arquivo |
|---|---|---|
| RN-RISK-01 | artigo nunca NULL — vem de GapRule.artigo ou risk_categories.artigo_base | risk-engine-v4.ts |
| RN-RISK-02 | severidade nunca LLM — sempre de SEVERITY_TABLE ou risk_categories | risk-engine-v4.ts |
| RN-RISK-03 | categoria nunca LLM — vem de risk_category_code do gap | db-queries-risks-v4.ts |
| RN-RISK-04 | 1 gap → 1 risco por categoria (N gaps de mesma categoria consolidam) | risk-engine-v4.ts |
| RN-RISK-05 | type='opportunity' → buildActionPlans retorna [] | action-plan-engine-v4.ts |
| RN-RISK-06 | ruleId nunca NULL | db-queries-risks-v4.ts |
| RN-RISK-07 | approved_at=NULL ao criar | 0064 migration |
| RN-RISK-08 | status='active' ao criar | 0064 DEFAULT |
| RN-RISK-09 | evidence[] ordenada por SOURCE_RANK crescente | sortBySourceRank |
| RN-RISK-10 | confidence = ponderada (0.0-1.0) | calcWeightedConfidence |

### 17.2 RN-AP (planos de ação)

| Código | Regra |
|---|---|
| RN-AP-01 | risk_id nunca NULL (FK obrigatória) |
| RN-AP-02 | status inicial = 'rascunho' |
| RN-AP-03 | titulo.length >= 5 |
| RN-AP-04 | responsavel obrigatório |
| RN-AP-05 | prazo ENUM 30/60/90/180_dias |
| RN-AP-06 | Soft delete (nunca DELETE físico) |
| RN-AP-07 | Excluir plano → cascata soft delete tarefas |
| RN-AP-08 | audit_log em toda mutação |
| RN-AP-09 | type='opportunity' → botão "+ Plano" não renderizado |

**Catálogo canônico de responsáveis:**
`gestor_fiscal · diretor · ti · juridico · advogado`

### 17.3 RN-TASK (tarefas)

| Código | Regra |
|---|---|
| RN-TASK-01 | actionPlanId nunca NULL |
| RN-TASK-02 | status inicial = 'todo' |
| RN-TASK-03 | BLOQUEADA (opacity 40%) quando plan.status='rascunho' |
| RN-TASK-04 | LIBERADA quando plan.status='aprovado' |
| RN-TASK-05 | Soft delete |
| RN-TASK-06 | Excluir plano → cascata tarefas |
| RN-TASK-07 | audit_log em toda mutação |
| RN-TASK-08 | Progresso = COUNT(done)/COUNT(*) |

**Máquina de estados:**
```
todo ↔ doing ↔ done (toggle)
doing → blocked → todo
```
`titulo.length >= 3` (vs >= 5 em planos).

### 17.4 RN-CV4 (score de compliance) — consolidado

Ver §6.2 (Score D) e §7 (fórmula). Pontos críticos:
- RN-CV4-01: apenas aprovados
- RN-CV4-02: oportunidades fora do denominador
- RN-CV4-03: snapshot acumulado (nunca deletado)
- RN-CV4-04: confidence floor = 0.5
- RN-CV4-10: `formula_version` registrada em cada snapshot
- RN-CV4-14: **thresholds divergem entre código e RN (D5)**

---

## 18. Engine — constantes determinísticas (arquivo: `server/lib/risk-engine-v4.ts`)

### 18.1 SEVERITY_TABLE (fallback hardcoded)

```typescript
imposto_seletivo:     { severity: "alta",         urgency: "imediata"    }
confissao_automatica: { severity: "alta",         urgency: "imediata"    }
split_payment:        { severity: "alta",         urgency: "imediata"    }
inscricao_cadastral:  { severity: "alta",         urgency: "imediata"    }
regime_diferenciado:  { severity: "media",        urgency: "curto_prazo" }
transicao_iss_ibs:    { severity: "media",        urgency: "medio_prazo" }
obrigacao_acessoria:  { severity: "media",        urgency: "curto_prazo" }
aliquota_zero:        { severity: "oportunidade", urgency: "curto_prazo" }
aliquota_reduzida:    { severity: "oportunidade", urgency: "curto_prazo" }
credito_presumido:    { severity: "oportunidade", urgency: "curto_prazo" }
```

Precedência: DB risk_categories > SEVERITY_TABLE > default `media/curto_prazo`.

### 18.2 SOURCE_RANK

`cnae=1 · ncm=2 · nbs=3 · solaris=4 · iagen=5` — menor = maior prioridade.

### 18.3 TITULO_TEMPLATES

Ver §9.4 (10 títulos já confirmados em 930001). `{op}` substituído por
`context.tipoOperacao ?? "geral"`.

### 18.4 Inferência Normativa — CNAES hardcoded (`normative-inference.ts`)

```typescript
CNAES_ALIMENTAR   = { "4639-7/01", "4632-0/01", "4631-1/00", "4634-6/01", "4635-4/01" }
CNAES_ATACADISTA  = CNAES_ALIMENTAR ∪ { "4637-1/07", "4633-8/01", "4636-2/02" }
```
**Regra implícita:** CNAE alimentar é subconjunto de atacadista —
projeto com CNAE 4639-7/01 recebe 2 riscos inferidos (credito_presumido + regime_diferenciado).

### 18.5 RAG_QUERIES (`rag-risk-validator.ts`)

```
split_payment        → "split payment"        (~20 hits)
confissao_automatica → "apuração do IBS"       (~10 hits)
aliquota_zero        → "cesta básica"          (~5 hits)
credito_presumido    → "crédito presumido"     (~32 hits)
obrigacao_acessoria  → "obrigação acessória"   (~7 hits)
inscricao_cadastral  → "sujeito passivo"       (~74 hits — PROXY)
transicao_iss_ibs    → "prestação de serviços" (~34 hits — PROXY)
imposto_seletivo     → "imposto seletivo"      (~54 hits)
regime_diferenciado  → "regime diferenciado"   (~3 hits)
aliquota_reduzida    → "alíquota reduzida"     (~8 hits)
```

**Atenção:** `inscricao_cadastral` e `transicao_iss_ibs` usam proxies —
o `rag_artigo_exato` retornado pode não ser o mais relevante para essas
categorias.

### 18.6 Enrichment RAG — fórmula de confidence

**Com hit:**
- `rag_validated = 1`
- `rag_confidence = 0.85` (fixo)
- `confidence_final = confidence_base × 0.8 + 0.85 × 0.2` (blend)

**Sem hit (ou timeout 3s):**
- `rag_validated = 0`
- `confidence_final = confidence_base × 0.75` (penalidade 25%)
- `rag_validation_note = "Base legal não localizada no corpus RAG"`

**Invariante:** risco nunca é bloqueado por falha de RAG.

---

## 19. Frontend — UX atual

### 19.1 RiskDashboardV4 (`client/src/components/RiskDashboardV4.tsx`, 1272 linhas)

- **Abas:** Riscos · Oportunidades · Histórico (`data-testid="history-tab"`)
- **Filtros:** severidade (todos/alta/media/oportunidade) + categoria (10 categorias)
- **Summary Bar** (`data-testid="summary-bar"`): `summary-count-alta | summary-count-media | summary-count-oportunidade`
- **Botão "Ver Planos de Ação"** (`btn-ver-planos`) — Z-17 #668:
  - Habilitado se pelo menos 1 risco aprovado
  - Desabilitado se nenhum aprovado
  - Oculto se 0 riscos
- **Breadcrumb4** cores: fonte=azul · categoria=roxo · artigo=verde · ruleId=cinza
- **RAG Badge:** `rag-badge-validated` (rag_validated=1) ou `rag-badge-pending` (=0)
- **Aprovação:** botão `approve-risk-button` + `bulk-approve-button`

### 19.2 ActionPlanPage (`client/src/pages/ActionPlanPage.tsx`, 1216 linhas)

- **Traceability Banner** (`traceability-banner`): 5 chips `[fonte › cat › art › ruleId › risco]`
- **Lock tarefas:** `isLocked = plan.status === 'rascunho'` → `pointer-events:none, opacity:40%`
- **Ordenação tarefas:** overdue → todo → doing → blocked → done → deleted; dentro de cada grupo por `data_fim` crescente
- **Overdue:** `task.data_fim < today` AND status ≠ done/deleted
- **Botão "Ver Consolidação"** (`btn-ver-consolidacao`) — Sprint Z-19 #712 (PR #714 aberto)
- **Botão "Exportar PDF"** (`btn-exportar-pdf-planos`) — gera via jsPDF no browser

### 19.3 ConsolidacaoV4 (`client/src/pages/ConsolidacaoV4.tsx`)

- **KPIs:** `kpi-score · kpi-alta · kpi-media`
- **Compliance Score Card:** chama `trpc.risksV4.calculateAndSaveScore` no mount
- **Disclaimer** (`disclaimer-box`) obrigatório no topo
- **Timeline Reforma:** marcos `2026 / 2027 / 2029 / 2033` (hardcoded — D6)

### 19.4 Artefatos produzidos no fluxo E2E

| # | Artefato | Tabela/Campo | Gerado por | Destinatário |
|---|---|---|---|---|
| 1 | Respostas questionários | solaris_answers, iagen_answers | Usuário | Sistema |
| 2 | Gaps de compliance | project_gaps_v3 | Gap Engine | Sistema |
| 3 | Briefing aprovado | projects.briefingData | LLM + RAG | Advogado |
| 4 | Matriz de Riscos | risks_v4 | Pipeline v4 (determinístico) | Advogado |
| 5 | Planos + Tarefas | action_plans + tasks | LLM + manual | Advogado |
| 6 | Score de Compliance | projects.scoringData | calculateComplianceScore | Sistema |
| 7 | PDF Diagnóstico | arquivo local | jsPDF (browser) | Cliente final |
| 8 | Audit Log | audit_log | Toda mutação | Auditoria fiscal |

---

## 20. Cascata de Soft Delete

```
Excluir RISCO (deleteRisk):
  risks_v4.status='deleted', deleted_reason=reason
  → action_plans WHERE risk_id=? → status='deleted'
  → tasks WHERE action_plan_id IN (...) → status='deleted'
  audit_log: entity='risk', action='deleted', before_state, reason

Excluir PLANO (deleteActionPlan):
  action_plans.status='deleted'
  → tasks WHERE action_plan_id=? → status='deleted'
  audit_log: entity='action_plan', action='deleted'

Excluir TAREFA (deleteTask):
  tasks.status='deleted' (nível folha, sem cascata)
  audit_log: entity='task', action='deleted'

Restaurar RISCO (restoreRisk):
  risks_v4.status='active'
  → action_plans: status restaurado
  → tasks: status restaurado
  (RI-07: sem granularidade — restaura TODOS os filhos)
```

---

## 21. Testes existentes + lacunas

### 21.1 Unit (Vitest)

| Arquivo | Blocos | Casos |
|---|---|---|
| `server/lib/risk-engine-v4.test.ts` | A-F | 16 (classifyRisk, breadcrumb, sortBySourceRank, computeRiskMatrix, getRiskCategories, consolidateRisks) |
| `server/lib/rag-risk-validator.test.ts` | T-04 | 3 (import, tipos, penalidade) |
| `server/routers/scoringEngine.test.ts` | T-B8-01..10 | 10 (CPIE-B, dimensões, maturidade) |

### 21.2 E2E (Playwright)

| Arquivo | Casos | Cobertura |
|---|---|---|
| `tests/e2e/z14-risk-action-plan.spec.ts` | CT-01..09 | Dashboard, cards, aprovação, oportunidade sem plano |
| `tests/e2e/z17-pipeline-completo.spec.ts` | CT-01..20 | Pipeline E2E: questionários → riscos → planos → tarefas |
| `tests/e2e/action-plan-ui-refinements.spec.ts` | CT-01..16 | Sprint Z-19 (PR #714) |
| `tests/e2e/pdf-consolidacao.spec.ts` | — | PDF |

### 21.3 Lacunas (candidatas a testes da suite "planejado × realizado")

- Sem unit para `normative-inference.ts`
- Sem unit para `generate-risks-pipeline.ts`
- Sem unit para `compliance-score-v4.ts`
- Sem E2E para `ConsolidacaoV4.tsx`
- Sem teste de cascata soft delete (risco → planos → tarefas)

---

## 22. Regras Implícitas Detectadas (12 RIs — do inventário Manus)

| ID | Regra | Arquivo | Impacto |
|---|---|---|---|
| RI-01 | `CATEGORIA_ARTIGOS` frontend diverge do seed | RiskDashboardV4.tsx | **Médio — D7** |
| RI-02 | Cache de categorias TTL 1h — delay de propagação | risk-engine-v4.ts | Baixo |
| RI-03 | `risk_key` não inclui project_id — único só por projeto | risk-engine-v4.ts | Baixo |
| RI-04 | Score só calcula ao visitar ConsolidacaoV4 | ConsolidacaoV4.tsx | **Médio — lacuna UI** |
| RI-05 | Score CPIE-B (v3) e Score v4 coexistem sem sync | scoringEngine.ts vs compliance-score-v4.ts | Médio |
| RI-06 | `MAX_PESO=9` → score 100% matematicamente impossível (cap ~77.8%) | compliance-score-v4.ts | Confirmar intenção com P.O. |
| RI-07 | Restore de risco restaura TODOS os filhos (sem granularidade) | risks-v4.ts | Baixo |
| RI-08 | CNAES_ALIMENTAR ⊂ CNAES_ATACADISTA — projeto alimentar recebe 2 inferências | normative-inference.ts | Intencional não documentado |
| RI-09 | `inscricao_cadastral` e `transicao_iss_ibs` usam proxies RAG | rag-risk-validator.ts | Baixo (artigo pode não ser melhor match) |
| RI-10 | Falha LLM de tarefa não interrompe fluxo — só audit_log | risks-v4.ts | Risco: plano sem tarefas silencioso |
| RI-11 | Prazo `180_dias` adicionado depois (0077) — código legado pode quebrar | 0077_add_180_dias | Auditar uso legado |
| RI-12 | Título "nas operações de geral" quando tipoOperacao=null | risk-engine-v4.ts | Violação Gate 7 P3 se ocorrer |

---

## 23. Pendências consolidadas (ordenadas por prioridade)

### P0 — Bloqueadores antes da liberação para advogados

- **P0.1** Expor Compliance Score v4 no RiskDashboardV4 (DEC-01)
- **P0.2** Resolver D5 (thresholds código × RN) — decisão P.O. sobre bypass totalAlta
- **P0.3** Concluir auditoria dos 12 bugs UAT Gate E "a verificar" (§10)
- **P0.4** Executar queries Q1-Q6 de rastreabilidade (§13.4) no 930001

### P1 — Alinhamento pós-snapshot (PR de governança)

- **P1.1** Remover `tributacao_servicos` do RN_GERACAO_RISCOS_V4.md:92 (D2)
- **P1.2** Atualizar `inscricao_cadastral` para "alta" no RN_GERACAO_RISCOS (D3)
- **P1.3** Atualizar timeline 2032 → 2033 no RN_CONSOLIDACAO_V4 §4.9 (D6)
- **P1.4** Remover `CATEGORIA_ARTIGOS` hardcoded do frontend (D7)
- **P1.5** PR de thresholds código conforme decisão P.O. (D5)

### P2 — Débitos técnicos conhecidos

- **P2.1** PR #E — reconciliar CPIE-B (scoringEngine) com engine v4 (ADR-0023)
- **P2.2** Verificar unicidade por categoria (§9.5 V5) em projetos com `multiestadual` alternado
- **P2.3** `PENDENCIA_RAG_EXPANSAO_NCM_NBS.md` (Manus §23 P-05)

### P3 — Suite de testes (4 camadas)

- **P3.1** Unit: `risk-engine-v4.afericao.test.ts`
- **P3.2** Unit: `compliance-score-v4.test.ts` (ausente)
- **P3.3** Unit: `normative-inference.test.ts` (ausente)
- **P3.4** Integration: `generate-risks-pipeline.integration.test.ts`
- **P3.5** Script: `scripts/audit-risk-matrix.mjs` (aferição real)
- **P3.6** Script: `scripts/categoria-drift-check.mjs` (DB × código × RN)
- **P3.7** E2E: `risk-matrix-audit.spec.ts`
- **P3.8** E2E: `consolidacao-v4.spec.ts` (ausente)
- **P3.9** E2E: cascata soft delete

---

## 24. Sinalização de pendências abertas para P.O.

Antes da próxima iteração, o P.O. precisa decidir:

1. **D5 — thresholds de score**: seguir RN (70/50/30 + bypass totalAlta) ou código (75/50/25 sem bypass)?
2. **RI-06 — cap ~77.8%**: design intencional ou bug?
3. **Aprovar P0.1-P0.4** para iniciar suite de testes
4. **Ordem de P1**: fazer 1 PR consolidado (5 docs) ou PRs separados?

---

*IA SOLARIS · Snapshot de Matriz de Riscos · 2026-04-18*
*Documento imutável — novas versões geram novo arquivo datado*
*Baseline + Inventário consolidado (24 seções · ~1400 linhas)*
*Status: aguardando aprovação P.O. para liberar suite de testes*
