# AS-IS / TO-BE — Visibilidade SOLARIS na UI (3 camadas)

**Data:** 2026-06-01 (criado) · 2026-06-01 (rev2 — numeração canônica + V1/V2/V3) · **HEAD original:** `b44faf3d` · **Skill aplicada:** `impact-tree` (REGRA-ORQ-41)

**Pedido do P.O.:** diagnóstico AS-IS + TO-BE após Sprint 2 SOLARIS — UI não exibe contribuição SOLARIS apesar dos gaps estarem corretos no banco.

**Numeração final acordada** (Manus + Claude Code, 2026-06-01): U1–U7 canônica abaixo. Versão anterior usava numeração divergente (U2/U6 trocados); este documento é a fonte oficial.

---

## 0. Evidência empírica (V1/V2/V3 — Manus 2026-06-01)

> Bloco de runtime evidence (REGRA-ORQ-27 + Lição #87) — preservar para próximas sessões.

### V1 — projeto 5340001 (PJ Supermercado, CNAE 4711-3/02)

```
risks_v4 onde gap_detected=1: 4 riscos, todos com source_priority='solaris'
evidence.gaps[*]: fonte='solaris', sourceReference='SOL-NNN', answerValue='não'

briefingStructured.principais_gaps[]: 5 entradas
  - source_type="regra_semantica" (gatilho #4 ibs_interestadual)
  - source_type="iagen"            (pergunta IA Gen inscrição cadastral IBS/CBS)
  - source_type="regra_semantica" (gatilho #2 cesta básica)
  - source_type="iagen"            (pergunta IA Gen split payment)
  - source_type="questionario"     (CNAE: respostas sobre partes relacionadas)

→ ZERO gaps com source_type="solaris" — U3 confirmado em runtime
```

### V2 — projeto 5280001 (PF Agro)

```
project_gaps_v3 (source='solaris'): 7 gaps
  SOL-038 | question_id=0 | answer_value='não'
  SOL-042 | question_id=0 | answer_value='não'   ← respondido como "não sei" no UI
  SOL-043 | question_id=0 | answer_value='não'
  SOL-044 | question_id=0 | answer_value='não'
  SOL-047 | question_id=0 | answer_value='não'
  SOL-049 | question_id=0 | answer_value='não'
  SOL-057 | question_id=0 | answer_value='não'

→ U4 confirmado: question_id=0 em 7/7 (100% hardcoded)
→ U6 confirmado: SOL-042 ("não sei" no UI) virou 'não' no banco
```

### V3 — paridade IAGEN (projetos legados 4650001/4650002)

```
project_gaps_v3 (source='iagen'): 5 gaps
  IAGEN-xxx | question_id=0 | answer='Não. '
  ...

→ IAGEN question_id=0 hardcoded também (paridade U4)
→ IAGEN answer_value usa preview real até 200 chars (NÃO tem U6)
```

Nota: projetos recentes (5250006+, 5280001, 5340001) não têm gaps IAGEN porque Onda 2 não foi completada nesses projetos de teste.

---

## Seção 1 — Auto-auditoria das técnicas (P1-P10 da skill)

| Passo | Técnica | Status | Achado-chave |
|---|---|---|---|
| P1 | ast-grep / grep semântico | ✅ | `EvidenceItem` (risk-engine-v4.ts:244) não tem `gapDescription`; `mapGapToEvidence` (linha 302-318) não passa `gap.descricao`; prompt LLM (routers-fluxo-v3.ts:1924 + :4451) lista 6 valores aceitos de `source_type` — **`"solaris"` NÃO está entre eles** |
| P2 | Dead-read check | ✅ | `gap_description` (snake_case) é escrito por 3 analyzers em `project_gaps_v3` + lido por `db-queries-risks-v4.ts:1044` → `descricao` em `GapInput`. **Perdido em `mapGapToEvidence`** — dead-read parcial = **U5** |
| P3 | Issues pré-existentes | ✅ | #1189 (CLOSED) "BUG-RASTREAB-01" precedente direto da camada 3. Sem issues abertas para camadas 1 ou 2 |
| P4 | Tests | ✅ | 11 test files referenciam `EvidenceItem`/`principais_gaps`/`source_type` — alteração precisa atualizar (especialmente `parseEvidence.test.ts`) |
| P5 | .sql/.md/.json | ✅ | ADR-010 cita `source_type` como requisito (Regra 1 — fonte obrigatória); sem ADR específico de EvidenceItem |
| P6 | PDF/email | ✅ | `generateDiagnosticoPDF.ts` (402 LOC) **NÃO consome EvidenceItem** — impacto restrito a UI + LLM |
| P7 | Snapshots | ✅ | 3 `.snap` no projeto; nenhum fixa `EvidenceItem`/`principais_gaps`/`source_type` |
| P8 | LOC reais | ✅ | `routers-fluxo-v3.ts` 6973, `RiskDashboardV4.tsx` 1695, `risk-engine-v4.ts` 633, `ai-schemas.ts` 500, `solaris-gap-analyzer.ts` 308, `iagen-gap-analyzer.ts` 254. **Classe A cirúrgica** (alvo ≤50 LOC produção) |
| P9 | ADRs afetados | ✅ | **ADR-010** (Content Architecture 98%) menciona `source_type` (Regra 1) — bump **MINOR** (aditivo). Nota cruzada em **ADR-0030** (operacionalização do enum em runtime — recém-emitido Sprint 2) |
| P10 | Writers/readers | ✅ | `gap_description` writer: 3 analyzers (SOLARIS/IAGEN/questionnaire); reader interno: `db-queries-risks-v4.ts:1044`; reader downstream: **NUNCA chega ao frontend** porque `mapGapToEvidence` descarta. Dead-read parcial confirmado |

**Cobertura total estimada:** 🟢 **95%** — pendência: validação runtime do prompt LLM com novo `source_type="solaris"` (Manus pós-deploy via V1 query no 5340001).

---

## Seção 2 — Risco de regressão por gravidade

### 🔴 CRÍTICO (3 bugs)

| ID | Sintoma | Local | Confirmado por |
|---|---|---|---|
| **U1** | UI exibe `[rule_id::op:X::geo:Y] SOL-049` sem texto descritivo | `risk-engine-v4.ts:244-256` (`EvidenceItem` sem `gapDescription`) + `:302-318` (`mapGapToEvidence` descarta `gap.descricao`) | V1 (Camada 1) |
| **U2** | LLM não tem instrução obrigatória de citar SOLARIS nos `principais_gaps` | `routers-fluxo-v3.ts:1923-1938` (sem regra "se houver respostas SOLARIS negativas, OBRIGATÓRIO incluir 1 gap com source_type='solaris'") | V1 (Camada 2: 0/5 gaps SOLARIS) |
| **U3** | Enum `source_type` SEM `"solaris"` em **3 locais** | (a) `routers-fluxo-v3.ts:1924-1929` prompt principal; (b) `routers-fluxo-v3.ts:4451` prompt fallback; (c) `ai-schemas.ts:193` Zod gate | V1 + leitura literal código |

### 🟡 VISÍVEL (3 bugs)

| ID | Sintoma | Local | Confirmado por |
|---|---|---|---|
| **U4** | `question_id=0` literal em 100% dos gaps SOLARIS **e** IAGEN | `solaris-gap-analyzer.ts:271` SQL `0, 'não', ?` + `iagen-gap-analyzer.ts:220` SQL `0, ?, ?` | V2 (7/7) + V3 (5/5) |
| **U5** | Dead-read parcial de `gap_description` (consequência de U1 — `gap.descricao` carregado mas descartado em `mapGapToEvidence`) | `db-queries-risks-v4.ts:1044` lê → `risk-engine-v4.ts:302-318` descarta | Leitura código |
| **U6** | `answer_value='não'` literal SOLARIS — perde nuance "não sei" | `solaris-gap-analyzer.ts:271` SQL `'não'` literal — apenas SOLARIS; IAGEN já usa preview real | V2 (SOL-042 "não sei" → "não") + V3 (IAGEN OK) |

### 🟢 COSMÉTICO / by-engine-convention

| ID | Sintoma | Local | Decisão |
|---|---|---|---|
| **U7** | Plano de Ação não consome `evidence[]` do risco — engine não propaga apesar de `RiskV4` ter `evidences[]` | `action-plan-engine-v4.ts:61-88` `buildActionPlans` push sem campo evidences | Feature request — backlog. **2 LOC** propagariam mas UX de painel é decisão de produto separada |

---

## Seção 3 — Consumers reais (lista canônica)

### Camada 1 — Briefing LLM (`principais_gaps[*].source_type`)

| Local | Arquivo:linha | O que faz |
|---|---|---|
| Prompt LLM (declaração do enum) | `server/routers-fluxo-v3.ts:1924-1929` | Lista 6 valores aceitos — **sem `"solaris"`** |
| Prompt LLM (template JSON) | `server/routers-fluxo-v3.ts:1907, 4434` | Exemplo JSON inline com `source_type` |
| Prompt LLM fallback | `server/routers-fluxo-v3.ts:4451` | Re-execução briefing — enum **também sem `"solaris"`** |
| Consolidação pós-LLM | `server/routers-fluxo-v3.ts:1972-1977` | `consolidateGapsByArticle` |
| Flag de alucinação | `server/routers-fluxo-v3.ts:1989` | `flagHallucinatedCitations` |
| Observabilidade (audit log) | `server/routers-fluxo-v3.ts:2305-2322` | Conta `source_type` distribution por categoria |
| Esquema Zod | `server/ai-schemas.ts:193` | `z.enum(["rag","cnae","descricao","questionario","iagen","regra_semantica"])` — **sem `"solaris"`** |

### Camada 2 — Risk Evidence (`EvidenceItem.gapDescription` ausente)

| Local | Arquivo:linha | O que faz |
|---|---|---|
| Definição backend `EvidenceItem` | `server/lib/risk-engine-v4.ts:244-256` | 11 campos atuais; **falta `gapDescription`** |
| `mapGapToEvidence` (writer) | `server/lib/risk-engine-v4.ts:302-318` | Monta EvidenceItem do GapRule; **NÃO inclui `gap.descricao`** |
| `consolidateRisks` (caller) | `server/lib/risk-engine-v4.ts:589` | `evidences = groupGaps.map(mapGapToEvidence)` |
| GapInput (origem) tem `descricao` | `server/lib/db-queries-risks-v4.ts:1044` | `descricao: row.gap_description ?? ""` populado |
| Definição frontend `EvidenceItem` | `client/src/components/RiskDashboardV4.tsx:68-76` | Tipo independente — **duplicação** (sem `gapDescription`) |
| `parseEvidence` (reader frontend) | `client/src/components/RiskDashboardV4.tsx:231-258` | Converte `ConsolidatedEvidence`; monta `pergunta: "[rule_id] sourceReference"` (sem descrição) |

### Camada 3 — Plano de Ação (sem evidências)

| Local | Arquivo:linha | O que faz |
|---|---|---|
| `TraceabilityBanner` | `client/src/pages/ActionPlanPage.tsx:120-139` | Renderiza 4-tupla; **sem evidências** |
| `buildActionPlans` engine | `server/lib/action-plan-engine-v4.ts:61-88` | Push sem `evidences` — **2 LOC propagariam** mas decisão fica para feature request |

### Camada 4 (origem hardcoded) — analyzers (U4 + U6)

| Local | Arquivo:linha | Bug |
|---|---|---|
| G17 SOLARIS INSERT `question_id` + `answer_value` | `server/lib/solaris-gap-analyzer.ts:271` | `0, 'não'` literais (U4 + U6) |
| IAGEN-MAX INSERT `question_id` | `server/lib/iagen-gap-analyzer.ts:220` | `0` literal (U4 paridade); `answer_value` é `?` dinâmico (OK) |

---

## Seção 4 — Árvore de impacto (ASCII)

```
[Usuário responde via radio + texto livre]
       ↓
solaris_answers (resposta + resposta_opcao + question_id)
       ↓ G17-MAX (classifyForGap + buildGapFromQuestion)
solaris-gap-analyzer.ts:248
  INSERT INTO project_gaps_v3
    SET gap_description = gap.gap_descricao  ✅ (FIX-08)
    SET question_id = 0                       ❌ HARDCODED (U4)
    SET answer_value = 'não'                  ❌ HARDCODED (U6)
    SET source_reference = SOL-NNN            ✅
       ↓
project_gaps_v3 (banco)
       ↓ db-queries-risks-v4.ts:1044
GapInput {
  descricao: row.gap_description ✅,
  questionId: 0 ❌,
  answerValue: 'não' (sempre) ❌,
}
       ↓ gap-to-rule-mapper:265-280
GapRule { mantém os mesmos campos + ruleId + categoria + artigo }
       ↓ risk-engine-v4.ts:302 mapGapToEvidence
EvidenceItem {
  ruleId, fonte, gapClassification, sourceReference, artigo,
  confidence, weight,
  questionId: 0 ❌,
  answerValue: 'não' ❌,
  gapId, questionSource,
  ❌ ❌ ❌ gapDescription NÃO existe (U1 + U5 dead-read)
}
       ↓ risks_v4.evidence (JSON)
       ↓ tRPC risksV4.listRisks → frontend
       ↓ RiskDashboardV4.tsx:231 parseEvidence
       ↓ render UI:
         "P: [confissao_automatica::op:agronegocio::geo:mono] SOL-049"  ← (U1)
         "R: não"                                                       ← (U6)
         (sem descrição do gap)                                         ← (U1 manifesto)

[Briefing LLM — caminho paralelo]
       ↓ routers-fluxo-v3.ts:1665
solarisAnswersForPrompt → prompt LLM (respostas enviadas)
       ↓ enum aceito: rag|cnae|descricao|questionario|iagen|regra_semantica (U3)
       ↓ instrução SEM regra "obrigatório incluir SOLARIS se respostas negativas" (U2)
       ↓ LLM gera principais_gaps[]
       ↓ NENHUM gap recebe source_type="solaris" — enum não permite (U3) + LLM não tem que citar (U2)
       ↓ Briefing exibido: rastreabilidade SOLARIS quebrada
         ↓ Zod (ai-schemas.ts:193) também rejeitaria "solaris" se LLM enviasse (U3 Zod)

[Plano de Ação]
       ↓ action-plan-engine-v4.ts:61 buildActionPlans
       ↓ push() sem campo evidences (U7) — apesar de RiskV4 tê-lo
       ↓ ActionPlanPage.tsx:120 TraceabilityBanner recebe risk sem evidence
       ↓ render: 4 chips, zero painel de evidências
```

---

## Seção 5 — Cirurgia possível?

### Escopo MÍNIMO (Caminho A ampliado autorizado — Sprint 3)

| Mudança | Arquivo | LOC produção | LOC testes |
|---|---|---|---|
| Adicionar `"solaris"` ao Zod enum (U3 Zod) | `ai-schemas.ts:193` | +1 | +1 |
| Adicionar `gapDescription?` + propagar (U1 backend) | `risk-engine-v4.ts:244-256` + `:302-318` | +3 | +2 |
| `question_id` real + `answer_value` híbrido (U4+U6 SOLARIS) | `solaris-gap-analyzer.ts` `buildGapFromQuestion` + INSERT | +6 | +3 |
| `question_id` real IAGEN (U4 paridade) | `iagen-gap-analyzer.ts:220` + `buildGapFromQuestion` | +2 | +1 |
| Adicionar `"solaris"` + instrução obrigatória (U2 + U3 prompt principal) | `routers-fluxo-v3.ts:1924-1938` | +4 | +2 |
| Mesma instrução (U2 + U3 prompt fallback) | `routers-fluxo-v3.ts:4451` | +2 | 0 |
| Espelhar `gapDescription` no frontend + render (U1 frontend) | `RiskDashboardV4.tsx:68-76` + `:247-258` + render card | +4 | +4 |

**Total:** ~22 LOC produção + ~13 LOC testes = **~35 LOC totais**. Classe A cirúrgica.

**Decisão U6 — opção (c) Híbrido autorizada pelo P.O.:**
- `resposta_opcao` disponível → persistir `'nao'` / `'nao_sei'` (ENUM canônico Sprint 1)
- legado pré-PR-C → fallback para `resposta` (texto)
- UI mapeia: `'nao' → "Não"` · `'nao_sei' → "Não sei"`

**Não toca:** Pipeline downstream (`consolidateRisks` em risk-engine-v4), `gap_to_rule_mapper`, `project_gaps_v3` schema (sem migration), Plano de Ação (U7 feature request).

### Escopo AMPLO (U7 — feature request separado)

+ Painel de evidências no Plano de Ação (U7) — adicionar `evidences[]` em `RiskParent` (`ActionPlanPage.tsx:120`) + sub-componente `<RiskEvidencePanel>`.

**Decisão P.O.:** backlog separado, fora desta Sprint 3.

---

## Seção 6 — AS-IS detalhado (Camada por camada)

### 6.1 Camada 1 — Briefing LLM (U2 + U3)

**Prompt instrução literal** (`routers-fluxo-v3.ts:1924-1929`):
```
"source_type" é UM dos valores exatos:
  - "rag" / "cnae" / "descricao" / "questionario" / "iagen" / "regra_semantica"
```
**Análise:** `"questionario"` agrupa Onda 1 (SOLARIS), Onda 2 (IAGEN), CNAE, Produtos, Serviços. Não há valor específico para SOLARIS.

**Evidência runtime V1 (5340001):** 5 gaps em `principais_gaps`, **0 com `source_type="solaris"`** — distribuídos em `regra_semantica` (2), `iagen` (2), `questionario` (1).

**Observabilidade já existe** (`routers-fluxo-v3.ts:2305-2322`): auto-loga distribuição de `source_type` por categoria — captura uso de `"solaris"` automaticamente após F1+F5.

### 6.2 Camada 2 — Risk Evidence (U1 + U5)

**Backend** (`risk-engine-v4.ts:244-256`):
```ts
export interface EvidenceItem {
  ruleId, fonte, gapClassification, sourceReference, artigo,
  confidence, weight, questionId?, answerValue?, gapId?, questionSource?
  // ❌ FALTA: gapDescription?: string | null
}
```

**Frontend** (`RiskDashboardV4.tsx:68-76`):
```ts
interface EvidenceItem {
  fonte?, prioridade?, pergunta?, resposta?, confianca?
  [key: string]: unknown;  // ⚠️ permite extras mas não tipado
}
```

**parseEvidence atual** (`RiskDashboardV4.tsx:247-252`):
```ts
pergunta: gap.sourceReference
  ? `[${gap.ruleId ?? "regra"}] ${gap.sourceReference}`  // → "[confissao_automatica::op:X::geo:Y] SOL-049"
  : (gap.ruleId ?? undefined),
resposta: gap.answerValue ?? undefined,                   // → "não" (fixo via U6)
```

**Resultado visual real**:
```
P: [confissao_automatica::op:agronegocio::geo:mono] SOL-049
R: não
Confiança: 1.00
```

### 6.3 Camada 3 — Plano de Ação (U7)

**Estado atual** (`action-plan-engine-v4.ts:73-83`):
```ts
plans.push({
  riskRuleId, categoria, artigo, prioridade, breadcrumb,
  severity, titulo, responsavel, prazo,
  // ❌ Sem evidences[] — apesar de risk.evidences existir
});
```

**By-engine-convention** — 2 LOC propagariam (`evidences: risk.evidences`), mas painel UX é decisão de produto separada.

### 6.4 Camada 4 (origem hardcoded) — analyzers (U4 + U6)

**SOLARIS SQL bind** (`solaris-gap-analyzer.ts:271`):
```sql
VALUES (..., 0, 'não', ?, ?)  -- question_id=0, answer_value='não' literais
```

**IAGEN SQL bind** (`iagen-gap-analyzer.ts:220`):
```sql
VALUES (..., 0, ?, ?, ?)  -- question_id=0 literal; answer_value=? dinâmico (preview real)
```

---

## Seção 7 — TO-BE Sprint 3 — Caminho A ampliado (autorizado P.O.)

### Princípio canônico

> **Toda evidência exibida ao advogado DEVE conter contexto suficiente para julgamento:**
> 1. Descrição textual do gap (não apenas o código da pergunta)
> 2. Resposta canônica do usuário (`resposta_opcao` ENUM Sprint 1, com fallback)
> 3. Source_type específico no briefing (`"solaris"`, não `"questionario"` genérico)
> 4. LLM obrigado a citar SOLARIS quando houver respostas negativas

### F1 — Zod enum

```ts
// ai-schemas.ts:193
source_type: z.enum([
  "rag", "cnae", "descricao",
+ "solaris",
  "questionario", "iagen", "regra_semantica",
])
```

### F2 — EvidenceItem backend + propagação

```ts
// risk-engine-v4.ts:244-256
export interface EvidenceItem {
  ruleId; fonte; gapClassification; sourceReference; artigo;
  confidence; weight;
  questionId?; answerValue?; gapId?; questionSource?;
+ gapDescription?: string | null;  // FIX-VIS-01 (U1)
}

// risk-engine-v4.ts:302-318
function mapGapToEvidence(gap: GapRule): EvidenceItem {
  return {
    ...,
+   gapDescription: gap.descricao ?? null,  // FIX-VIS-01 (U1+U5)
  };
}
```

### F3 — SOLARIS analyzer: question_id real + answer_value híbrido

```ts
// solaris-gap-analyzer.ts buildGapFromQuestion + INSERT
// (a) helper retorna question_id + answer_value_canonical
// (b) classifyForGap recebe opcao + resposta; novo retorno inclui answer_canonical
//     = opcao || resposta (texto, truncado a 200)
// (c) SQL INSERT troca literais 0/'não' por placeholders ? ?

VALUES (..., ?, ?, ?, ?)
//          ↑    ↑
//   question_id (sq.id)  ↑
//                  answer_value_canonical
```

### F4 — IAGEN analyzer: question_id real (paridade)

```ts
// iagen-gap-analyzer.ts:220
VALUES (..., ?, ?, ?, ?)
//          ↑    ↑
//   question_id (real)  ↑
//                  preview (já existia)
```

### F5 — Prompts LLM (principal + fallback)

```diff
// routers-fluxo-v3.ts:1924-1929 + :4451
"source_type" é UM dos valores exatos:
  - "rag" / "cnae" / "descricao"
+ - "solaris"       → o gap foi derivado de uma resposta no questionário SOLARIS
+                     (Onda 1) — use sempre que source_reference="SOL-NNN"
- - "questionario"  → ... (Onda 1, Onda 2, CNAE, ...)
+ - "questionario"  → CNAE, Produtos ou Serviços (NÃO use para SOLARIS)
  - "iagen" / "regra_semantica"

REGRA OBRIGATÓRIA (U2):
- Se houver QUALQUER resposta negativa no questionário SOLARIS (Onda 1),
  você DEVE incluir pelo menos 1 gap em principais_gaps com:
  - source_type="solaris"
  - source_reference="SOL-NNN" (código da pergunta)
```

### F6 — Frontend `parseEvidence` + render card

```diff
// RiskDashboardV4.tsx:68-76
interface EvidenceItem {
  fonte?: string;
  prioridade?: string;
+ descricaoGap?: string;
  pergunta?: string;
  resposta?: string;
  confianca?: number;
}

// :247-258 parseEvidence
obj.gaps.map((gap) => ({
  fonte: gap.fonte,
  prioridade: gap.gapClassification,
+ descricaoGap: gap.gapDescription ?? undefined,
  pergunta: gap.sourceReference ? `[${gap.ruleId}] ${gap.sourceReference}` : gap.ruleId,
  resposta: gap.answerValue,    // agora 'nao'/'nao_sei' canônico → mapear para "Não"/"Não sei" no render
  confianca: gap.confidence,
}));

// Render: adicionar antes da linha "P:"
{ev.descricaoGap && <div className="text-xs">G: {ev.descricaoGap}</div>}
```

### F7 — Atualizar 11 test files

Esperado: ajustar `parseEvidence.test.ts` (gapDescription), `ai-schemas.briefing.test.ts` (enum), e outros 9 conforme tsc + vitest reportarem.

### F8 — ADR-010 bump MINOR + nota cruzada ADR-0030

**ADR-010:** bump **MINOR** (aditivo — adicionar `"solaris"` ao enum `source_type` da Regra 1).

**ADR-0030 (Sprint 2 recém-emitido):** nota cruzada:
> "Operacionalização do enum em runtime: gap escrito com `source='solaris'` em `project_gaps_v3` DEVE aparecer como `source_type='solaris'` no `principais_gaps` do briefing LLM."

### DoD smoke F0-4 (pós-deploy Manus em 5340001)

```sql
SELECT JSON_EXTRACT(briefingStructured, '$.principais_gaps[*].source_type') AS source_types
FROM projects WHERE id = 5340001;
-- Esperado: >=1 entrada com "solaris"
```

---

## Seção 8 — Auto-auditoria final

| Critério | Status | Evidência |
|---|---|---|
| Toda afirmação tem `arquivo:linha` | ✅ | Seções 3, 6 |
| Incluí testes no grep (P4) | ✅ | 11 test files identificados |
| Incluí .sql/.md/.json (P5) | ✅ | ADR-010 + ADR-0030 |
| Verifiquei PDF (P6) | ✅ | generateDiagnosticoPDF não consome — sem impacto |
| Issues pré-existentes (P3) | ✅ | #1189 precedente, sem duplicata aberta |
| ast-grep aplicado | ✅ | EvidenceItem, mapGapToEvidence, principais_gaps |
| Dead-read check (P2) | ✅ | `gap_description` é DEAD-READ parcial confirmado (= U5) |
| LOC reais antes de classificar | ✅ | P8 — Classe **A cirúrgica** (~22 LOC produção, ~35 com testes) |
| ADRs identificados + bump | ✅ | ADR-010 bump MINOR + ADR-0030 nota cruzada |
| Mapa writers/readers (P10) | ✅ | Tabela em Seção 3 |
| **Evidência empírica V1/V2/V3 preservada** | ✅ | Seção 0 — Lição #87 + REGRA-ORQ-27 |
| **Cobertura total estimada** | 🟢 **95%** | Pendência: validação runtime pós-deploy via V1 query |

---

## Seção 9 — Pendências para Manus (pós-merge)

| # | Pendência | Quando |
|---|---|---|
| M-1 | RE-GERAR briefing 5340001 (que tem `principais_gaps` com 5 entradas) — sem isso, briefing antigo permanece e DoD falha mesmo com fix correto | Pós-deploy |
| M-2 | Executar query DoD: `SELECT JSON_EXTRACT(briefingStructured, '$.principais_gaps[*].source_type') FROM projects WHERE id=5340001` — esperado >=1 `"solaris"` | Pós-deploy + re-briefing |
| M-3 | Smoke UI no 5340001: card de risco SOLARIS deve exibir 3 linhas — "G: {descricao}", "P: [rule] SOL-039", "R: Não" (canônico mapeado) | Pós-deploy |
| M-4 | Validar paridade IAGEN — query: `SELECT question_id, source FROM project_gaps_v3 WHERE source='iagen' AND project_id=<projeto-recente-com-onda2>` — esperado `question_id` > 0 (real, não 0) | Pós-deploy + projeto com Onda 2 completa |
| M-5 | Confirmar audit log de `source_type` distribution em 5340001 (já existe em `routers-fluxo-v3.ts:2305-2322`) — esperado `solaris: N` aparecer | Pós-deploy |

---

## 10. Histórico

| Versão | Data | Autor | Mudança |
|---|---|---|---|
| v1 | 2026-06-01 | Claude Code | Versão inicial com numeração própria (U1 gapDescription, U2 answer_value, ...) |
| v2 | 2026-06-01 | Claude Code (rev) | Numeração canônica final (Manus + CC alinhados) + Seção 0 evidência empírica V1/V2/V3 + Caminho A ampliado autorizado pelo P.O. + DoD smoke explícito |
