# AS-IS / TO-BE — Classificação de Resposta SOLARIS → Gap → Risco → Ação

**Data:** 2026-06-01 · **HEAD:** `cd221064` · **Autor da análise:** Claude Code · **Skill aplicada:** `.claude/skills/impact-tree` (REGRA-ORQ-41)
**Pedido do P.O.:** diagnóstico profundo + AS-IS + TO-BE didáticos, sem implementar. Meta de produto: **≥ 98% de confiabilidade** (REGRA-ORQ-31). Cleanup de projetos sujos autorizado (RAG intocado).

---

## Seção 1 — Auto-auditoria das técnicas (P1-P10 da skill `impact-tree`)

| Passo | Técnica | Status | Achado-chave |
|---|---|---|---|
| P1 | ast-grep semântico | ✅ | 5 funções com `startsWith('não')` espalhadas; 4 consumers de `respostaOpcao` (todos do FEAT-SOL-UX-01); zero consumo em gap analyzers |
| P2 | Dead-read check (ts-prune + grep) | ✅ | **Z-11 `analyzeGapsFromQuestionnaires` é código morto** — 0 callers não-teste (`ts-prune` confirma export); 1 teste cobre; também `unified-answer.normalizeSolarisAnswers` retorna `[]` por design (EXCLUSÃO M3.9-4) |
| P3 | Issues pré-existentes | ✅ | **Issue #964 OPEN** ("M3.9 Item 4 — Formalizar exclusão de solaris_answers do Gap Engine") + cluster #961/#965/#966 (curadoria) |
| P4 | Grep incluindo testes | ✅ | 9 test files tocam tema; canônico = `server/integration/g17-solaris-gap.test.ts` (138 LOC) documenta `isNegative` legado; `server/lib/analyze-gaps-questionnaires.test.ts` cobre Z-11 morto |
| P5 | Grep .sql/.md/.json | ✅ | `drizzle/0120_sol_resposta_opcao.sql` (migration); 2 audits/PR bodies mencionam `respostaOpcao`; **0 ADRs mencionam `respostaOpcao`** |
| P6 | PDF / email / templates | ✅ | `generateDiagnosticoPDF.ts` não consome respostas SOLARIS diretas — apenas gaps/risks downstream. PR-C entregou texto sem citar PDF (não há regressão visual no PDF) |
| P7 | Snapshots `.snap` | ✅ | 3 `.snap` no projeto; nenhum fixa `respostaOpcao` ou `solaris_answers` |
| P8 | LOC reais | ✅ | analyzers somam **998 LOC** em 4 arquivos; `solaris-gap-analyzer.ts` = 162 LOC (alvo cirúrgico) |
| P9 | ADRs afetados | ⚠️ | **ADR-0027 (Aceito 2026-04-10) está VIOLADA** — decide que Z-11 é o pipeline canônico de Ondas 1+2, mas hoje Z-11 está morto. Bump necessário: **MAJOR** (mudança de fonte canônica + semântica de opção discreta) — ou deprecar ADR-0027 e criar ADR-NN sucessor |
| P10 | Writers/readers formal | ✅ | 4 analyzers escrevem em `project_gaps_v3`; G17 + IAGEN + ENGINE ativos; Z-11 morto. Reader único downstream = `db-queries-risks-v4.ts:1029` (sem filtro de source) |

**Cobertura total estimada:** 🟢 **95%** — única pendência: leitura completa do ADR-0027 + busca de issue de bump (Manus pode complementar P9).

---

## Seção 2 — Risco de regressão por gravidade

### 🔴 CRÍTICO (impacta diagnóstico em produção HOJE)

| Bug | Local | Sintoma | Impacto medido |
|---|---|---|---|
| **B1 — Falso negativo grave** | `solaris-gap-analyzer.ts:54-57` | Radio="Não" + textarea vazio → **NENHUM gap gerado** (texto vazio não casa `startsWith('não')`) | **5 registros em produção** (Manus 2026-06-01) |
| **B2 — Inconsistência texto vs radio não detectada** | `saveSolarisAnswer` + analyzers | Radio="Sim" + texto="Não" → gap gerado (texto prioriza incorretamente) | **1 registro em produção** |
| **B3 — `resposta_opcao` é dead-write para gaps** | Ambos analyzers SELECTs ignoram a coluna | FEAT-SOL-UX-01 entregue end-to-end (PRs #1316/#1317/#1318) mas **último elo (analyzer)** não consome a coluna nova | Caso canônico **Lição #117** ("registrar lição ≠ aplicar fix") — eu mesmo registrei e a aplicação ficou pendente |

### 🟡 VISÍVEL (latente, com baixo impacto atual)

| Bug | Local | Sintoma | Impacto |
|---|---|---|---|
| **B4 — "Não se aplica" texto-livre vira gap** | `solaris-gap-analyzer.ts:56` (`startsWith('não')` casa "não se aplica") | Usuário escreve "Não se aplica" no textarea → gap gerado indevidamente | Baixo atualmente (poucos usuários escrevem por extenso); cresce com adoção |
| **B5 — "N/A" não detectado como nao_aplicavel no Z-11** | `analyze-gaps-questionnaires.ts:52` (ordem de avaliação) | Z-11 é morto, mas se ativado: "não aplicável" e "não se aplica" sempre viram "nao_atendido" antes da regra de "nao_aplicavel" alcançar | Zero hoje (Z-11 morto); Bloqueante se ADR-0027 for cumprida |
| **B6 — ADR-0027 violada** | Arquitetura geral | Z-11 nunca foi conectado ao runtime apesar de ser o pipeline canônico aceito em 2026-04-10 | Erosão silenciosa de governança — toda decisão futura sobre Ondas 1+2 sem base ADR formal |

### 🟢 COSMÉTICO (sem impacto funcional)

| Bug | Local | Sintoma |
|---|---|---|
| **B7 — "Não sei" → pessimista correto pelo motivo errado** | `analyze-gaps-questionnaires.ts:52` captura ANTES da regra dedicada (linhas 53-63) | Resultado funcional idêntico ao desejado, mas dead-code na regra dedicada para variações com acento |

---

## Seção 3 — Consumers reais (lista canônica com `arquivo:linha`)

### Camada 1 — Escrita de respostas SOLARIS

| Componente | Arquivo:linha | Status |
|---|---|---|
| Frontend write (single auto-save) | `client/src/pages/QuestionarioSolaris.tsx:266-272` (PR-C) | ✅ envia `respostaOpcao` |
| Frontend write (batch submit) | `client/src/pages/QuestionarioSolaris.tsx:288-292` | ✅ envia `respostaOpcao` no payload |
| Backend Zod (single) | `server/routers-fluxo-v3.ts:5109` | ✅ aceita `respostaOpcao` |
| Backend Zod (batch) | `server/routers-fluxo-v3.ts:5007` | ✅ aceita `respostaOpcao` |
| Persistência ORM | `server/db.ts:1431-1438` | ✅ grava `respostaOpcao` no INSERT + onDuplicateKeyUpdate |
| Schema DB | `drizzle/schema.ts:1776` + migration `drizzle/0120_sol_resposta_opcao.sql` | ✅ coluna ENUM NULL |

### Camada 2 — Leitura de respostas SOLARIS para classificação

| Componente | Arquivo:linha | Status de consumo da coluna `resposta_opcao` |
|---|---|---|
| **G17 analyzer (ATIVO)** | `server/lib/solaris-gap-analyzer.ts:34` SELECT + `:56` `startsWith('não')` | ❌ **NÃO consome** — SELECT só pega `resposta` (text) |
| **Z-11 analyzer (DEAD)** | `server/lib/analyze-gaps-questionnaires.ts:114` SELECT | ❌ **NÃO consome** — SELECT só pega `sa.resposta AS answer_value` |
| Gate Art. 168 (`credito-presumido`) | `server/lib/credito-presumido-eligibility.ts:88-103` orquestrador + helper `coerceOnda1AnswerToGateText` | ✅ **CONSOME** `respostaOpcao` (entregue no PR-B #1317) |
| Briefing fingerprint | `server/lib/briefing-fingerprint.ts:121-126` | ⚠️ Lê `solarisAnswers.resposta` para hash — não consome `respostaOpcao` |
| `unified-answer.parseAnswerValue` | `server/lib/unified-answer.ts:93-109` | ❌ Trata texto livre apenas; consumer dele (`normalizeSolarisAnswers`) **retorna `[]` por design** (M3.9-4) |

### Camada 3 — Pipeline downstream (gap → risco → ação)

| Componente | Arquivo:linha | Comportamento |
|---|---|---|
| Pipeline writer (gaps) | `solaris-gap-analyzer.ts:102` INSERT em `project_gaps_v3` com `source='solaris'` | Idempotente: DELETE+INSERT atômico |
| Pipeline reader (gaps→risks) | `server/lib/db-queries-risks-v4.ts:1029` `FROM project_gaps_v3 WHERE project_id = ? AND analysis_version = 3` | Lê **todos** os gaps; não filtra por source — `risk-engine-v4` é fonte-agnóstico |
| ACL gap→regra | `server/lib/gap-to-rule-mapper.ts:92-196` | Mapeia gap por `risk_category_code` (CASO A) ou `sourceReference` (CASO B) |
| Engine de risco v4 | `server/lib/risk-engine-v4.ts:633 LOC` | Determinístico (ADR-0022 Hot Swap) |
| Gerador de plano de ação | `server/lib/task-generator-v4.ts:142 LOC` | Lê risk; `source_priority` aparece em label da task (`task-generator-v4.ts:90`) |

### Camada 4 — Analyzers paralelos (paridade arquitetural)

| Analyzer | Estado | Source | Caller |
|---|---|---|---|
| `analyzeSolarisAnswers` (G17) | ATIVO | `solaris` | `routers-fluxo-v3.ts:5054` (`completeOnda1`) |
| `analyzeIagenAnswers` (Onda 2) | ATIVO | `iagen` | `routers-fluxo-v3.ts:5516` (`completeOndaIaGen`) |
| `analyzeEngineGaps` (Onda 3) | ATIVO | `engine` | `routers-fluxo-v3.ts:5539, 5634` |
| `analyzeGapsFromQuestionnaires` (Z-11) | **DEAD** | `solaris\|iagen` | nenhum caller não-teste — viola ADR-0027 |

---

## Seção 4 — Árvore de impacto (ASCII)

```
[Advogado tributarista]
        │
        ▼ Upload CSV via /admin/solaris-questions
solarisAdmin.uploadCsv (Zod schema, FK risk_categories, upload_batch_id)
        │
        ▼ INSERT/UPDATE
solaris_questions
   ├── codigo (SOL-NNN)
   ├── texto / titulo
   ├── topicos (CSV → SOLARIS_GAPS_MAP key)
   ├── cnae_groups (null = universal)
   ├── risk_category_code (FK risk_categories)
   ├── classification_scope (risk_engine | diagnostic_only)
   └── mapping_review_status (curated_internal | pending_legal | approved_legal)

[Usuário do projeto]
        │
        ▼ Abre /projetos/:id/questionario-solaris
getOnda1Questions(projectId)
        │ filtros: ativo=1, mapping_review_status IN (curated, approved),
        │          cnae_groups match (null = universal)
        ▼
QuestionarioSolaris.tsx (RadioGroup + Textarea opcional — PR-C #1318)
        │
        ├── handleOpcaoChange(id, opcao)   →  scheduleSave(800ms debounce)
        └── handleAnswerChange(id, texto)  →  scheduleSave(800ms debounce)
                │
                ▼
saveSolarisAnswer mutation (`fluxoV3.saveSolarisAnswer`)
                │
                ▼ db.saveOnda1Answers (upsert idempotente)
solaris_answers
   ├── resposta (text NOT NULL — justificativa/complemento)   ◄── escrito
   └── resposta_opcao (ENUM nullable — UX nova PR-A)          ◄── escrito (✅ ESCRITA)

        │
        ▼ Quando usuário clica "Concluir Onda 1"
completeOnda1 mutation
   ├── db.saveOnda1Answers (batch)
   ├── updateProject(status="onda1_solaris")
   └── void analyzeSolarisAnswers(projectId)  ◄── fire-and-forget G17
                │
                ▼
G17 analyzeSolarisAnswers (server/lib/solaris-gap-analyzer.ts)
   SELECT sa.resposta, sq.topicos, sq.codigo                  ◄── ❌ NÃO LÊ resposta_opcao
   FROM solaris_answers sa JOIN solaris_questions sq
   WHERE sa.project_id = ? AND sq.ativo = 1
   │
   │  for each row:
   │    isNegative = resposta.startsWith('não') || resposta === 'nao'
   │    if (!isNegative) continue   ◄── BUG B1: texto vazio sai daqui mesmo com radio='nao'
   │    for each topico in sq.topicos:
   │      gap = SOLARIS_GAPS_MAP[topico]
   │      risk_category_code = mapTopicToCategory(topico)
   │
   ▼ DELETE source='solaris' + INSERT atômico
project_gaps_v3
   ├── source = 'solaris'
   ├── gap_level = 'operacional'
   ├── gap_type = 'normativo'
   ├── compliance_status = 'nao_atendido'
   ├── risk_category_code (M3.10 Fix B)
   └── evaluation_confidence = 0.9

[ Z-11 analyzeGapsFromQuestionnaires — DEAD CODE, viola ADR-0027 ]

        │ pipeline downstream
        ▼
db-queries-risks-v4.ts:1029 SELECT * FROM project_gaps_v3 (sem filtro source)
        │
        ▼ generateRisksV4Pipeline
risk-engine-v4 (633 LOC, determinístico ADR-0022)
   ├── consolidateRisks (gap → risk via GapToRuleMapper)
   ├── inferNormativeRisks
   ├── merge + dedup por risk_key
   └── enrichRiskWithRag (timeout 3s, opcional)
        │
        ▼ INSERT
risks_v4
   ├── source_priority = 'solaris' (winner-takes-all do rank: cnae=1 < ncm=2 < nbs=3 < solaris=4 < iagen=5)
   ├── categoria, artigo, severity, urgency
   └── evidence.gaps[] (multi-fonte JSON — Fix C-bis M3.10)

        │
        ▼ task-generator-v4 (142 LOC, determinístico)
action_plans + tasks
        │
        ▼ Frontend
PlanoAcaoV3.tsx + ConsolidacaoV4.tsx + generateDiagnosticoPDF
```

---

## Seção 5 — Cirurgia possível?

### Escopo MÍNIMO (Opção A original do anexo)

**Edit:** `server/lib/solaris-gap-analyzer.ts` (162 LOC) — ~15 LOC adicionadas.
- Adicionar `sa.resposta_opcao` ao SELECT
- Priorizar `respostaOpcao` quando presente, fallback para `resposta.startsWith('não')`

**Não toca:** Z-11 (morto), ADR-0027 (continua violada), `unified-answer.ts` (M3.9-4 mantida), iagen-gap-analyzer (paridade não exigida ainda)
**Risco:** baixo. Backward-compatible.
**Cobertura da meta 98%:** parcial — corrige B1 + B3, deixa B2, B4, B6 abertos.

### Escopo CIRÚRGICO+ (cobertura B1, B2, B3, B4 — meta 98%)

**Edits:**
- `solaris-gap-analyzer.ts` — semântica explícita por opção (4 casos) + invariante "radio prioriza texto"
- `solaris-gap-analyzer.test.ts` (criar) — 8 testes de matriz (5 cenários de radio × 3 estados de texto)
- ADR novo deprecando ADR-0027 (decisão arquitetural: `resposta_opcao` é fonte canônica única)

**Não toca:** Z-11 (mantém morto OU deleta), iagen analyzer (paralelo a sprint futura)
**Risco:** baixo-médio (mudança de semântica de input, mas Zod aceita opcional)
**Cobertura da meta 98%:** alta — corrige 5 dos 6 bugs (B6 = decisão arquitetural pelo P.O.)

### Escopo AMPLO (todos os bugs + alinhar ADRs + paridade analyzers)

**Edits:** os 4 analyzers + ADR-0027 → ADR-NN sucessor + remoção de Z-11 morto + paridade `iagen-gap-analyzer.ts`
**Risco:** médio (4 arquivos, 998 LOC tocadas em algum grau)
**Cobertura da meta 98%:** total
**Quando fazer:** se P.O. decidir consolidar gap pipeline numa só sprint (ex: M3.9)

---

## Seção 6 — AS-IS (tabela didática de combinações + fórmulas + lógica)

### 6.1 Camada 1 — CSV upload (advogado → `solaris_questions`)

Mapeamento CSV → coluna (`server/routers/solarisAdmin.ts:47-60`):

| CSV header | Coluna `solaris_questions` | Tipo / validação | Obrigatório |
|---|---|---|---|
| `titulo` | `titulo` | `varchar(255)` | Sim |
| `conteudo` | `texto` | `text` | Sim |
| `topicos` | `topicos` | `text` (CSV separado por vírgula) | Sim — chave para `SOLARIS_GAPS_MAP` |
| `cnaeGroups` | `cnae_groups` | `json` array (`null` = universal) | Não |
| `lei` | `fonte` | `varchar(20)` fixo `"solaris"` | Sim |
| `artigo` | `codigo` | `varchar(10)` (formato `SOL-NNN`) | Sim |
| `categoria` | `categoria` | enum `contabilidade_fiscal\|negocio\|ti\|juridico` | Sim |
| `severidade_base` | `severidade_base` | enum `baixa\|media\|alta\|critica` | Sim |
| `vigencia_inicio` | `vigencia_inicio` | data | Não |
| `risk_category_code` | `risk_category_code` | FK `risk_categories.codigo` | Não (NULL → gap "unmapped") |
| `classification_scope` | `classification_scope` | enum `risk_engine\|diagnostic_only` | Default `risk_engine` |

**Filtro de visibilidade** ao apresentar a pergunta ao usuário (`db.ts:1371-1397`):
- `ativo = 1`
- `mapping_review_status IN ('curated_internal', 'approved_legal')` (gate jurídico — `pending_legal` fica oculto)
- `cnae_groups` match: `NULL` (universal) OU prefixo bidirecional com algum `confirmedCnaes[0]`

### 6.2 Camada 2 — Resposta do usuário (UI → `solaris_answers`)

Dois campos persistidos no mesmo INSERT (`db.ts:1431-1438`):

| Coluna | Tipo | Fonte na UI | Semântica atual |
|---|---|---|---|
| `resposta` | `text NOT NULL` | Textarea (FEAT-SOL-UX-01 PR-C tornou **opcional** com label "Justificativa / complemento (opcional)") | Texto livre — interpretado por prefix `startsWith('não')` no analyzer |
| `resposta_opcao` | `ENUM('sim','nao','nao_sei','nao_se_aplica') NULL` | RadioGroup PR-C | **Não consumida** pelos analyzers de gap |

### 6.3 Camada 3 — Classificação por analyzer (CORE do problema)

**G17 (`solaris-gap-analyzer.ts:54-57`) — único analyzer ATIVO em produção:**

```ts
const resposta = (row.resposta as string)?.trim().toLowerCase() ?? '';
const isNegative = resposta.startsWith('não') || resposta === 'nao';
if (!isNegative) continue;          // sai → SEM gap
// caso isNegative=true: gera N gaps (1 por tópico em SOLARIS_GAPS_MAP)
```

**Z-11 (`analyze-gaps-questionnaires.ts:47-72`) — código morto:**

```ts
function classifyAnswer(resposta: string): "atendido"|"parcialmente_atendido"|"nao_atendido"|"nao_aplicavel" {
  const r = resposta.toLowerCase().trim();
  if (r.startsWith("sim")) return "atendido";
  if (r.startsWith("não") || r === "nao") return "nao_atendido";  // ← captura ANTES das regras dedicadas
  if (r.includes("não sei") || r.includes("nao sei") || r.includes("depende") || ...)
    return "nao_atendido";          // ← dead-code para strings que começam com "não"
  if (r.includes("nao_aplicavel") || r.includes("não aplicável") || r === "n/a")
    return "nao_aplicavel";          // ← só alcança se nada acima casou
  if (r.includes("parcial")) return "parcialmente_atendido";
  return "nao_atendido";              // ← fallback pessimista (qualquer string não-reconhecida)
}
```

### 6.4 Tabela didática AS-IS — todas as combinações de input → output

**Convenção:** ✅ = comportamento desejado pelo produto, ❌ = BUG, * = comportamento por sorte/coincidência.

| # | Radio (`resposta_opcao`) | Texto (`resposta`) | G17 AS-IS (PROD) | Z-11 AS-IS (morto) | Esperado pelo produto |
|---|---|---|---|---|---|
| 1 | `null` (pré-PR-C) | `""` | sem gap | `nao_atendido` (linha 72 fallback) | sem gap (pergunta não respondida → contar como missing, não gap) |
| 2 | `null` | `"Sim."` | sem gap ✅ | `atendido` ✅ | sem gap ✅ |
| 3 | `null` | `"Não."` | gap ✅ | `nao_atendido` ✅ | gap ✅ |
| 4 | `null` | `"N/A."` | sem gap ✅* (não casa `startsWith('não')`) | `nao_aplicavel` ✅ | sem gap ✅ |
| 5 | `null` | `"não se aplica"` | gap ❌ (BUG B4) | `nao_atendido` ❌ (BUG B5) | sem gap (intenção do usuário é N.A.) |
| 6 | `null` | `"não sei"` | gap ✅* (efeito colateral) | `nao_atendido` ✅* (efeito colateral linha 52) | gap (conservador para compliance) |
| 7 | `sim` | `""` | sem gap ✅* | `nao_atendido` ❌ (linha 72) | sem gap ✅ |
| 8 | `nao` | `""` | **sem gap ❌ (BUG B1 — 5 casos PROD)** | `nao_atendido` ✅* | gap ✅ |
| 9 | `nao_sei` | `""` | sem gap ❌ (BUG B1) | `nao_atendido` ✅* | gap (conservador) |
| 10 | `nao_se_aplica` | `""` | sem gap ✅* | `nao_atendido` ❌ | sem gap ✅ |
| 11 | `sim` | `"Sim."` | sem gap ✅ | `atendido` ✅ | sem gap ✅ |
| 12 | `nao` | `"Não."` | gap ✅ | `nao_atendido` ✅ | gap ✅ |
| 13 | `sim` | `"Não."` | gap ❌ (BUG B2 — 1 caso PROD; texto prioriza erroneamente) | `nao_atendido` ❌ | **inválido** (radio e texto contraditórios — bloquear no save OU radio prioriza) |
| 14 | `nao` | `"Sim."` | sem gap ❌ (BUG B2 simétrico) | `atendido` ❌ | **inválido** OU radio prioriza → gap |
| 15 | `nao_sei` | `"Sim, mas com dúvida"` | sem gap ❌ | `atendido` ❌ | gap (radio prioriza — usuário declarou incerteza) |

**Dos 15 cenários: 7 estão errados no G17 (PROD) e 9 estão errados no Z-11 (se ativado).**

### 6.5 Camada 4 — Mapeamento gap → risco (downstream OK)

Determinístico, sem bug detectado nesta análise:

1. `analyzeSolarisAnswers` insere gap em `project_gaps_v3` com `risk_category_code` derivado de `mapTopicToCategory(topico)` (`server/config/topico-to-categoria.ts`) — M3.10 Fix B.
2. `db-queries-risks-v4.ts:1029` lê todos os gaps (sem filtro de source).
3. `gap-to-rule-mapper.ts` (286 LOC) tenta mapeamento:
   - **CASO A:** gap.categoria → `risk_categories.codigo`
   - **CASO B:** gap.sourceReference → `risk_categories.artigo_base`
4. `risk-engine-v4` consolida e classifica (`severity`, `urgency`, `breadcrumb`).
5. Persiste em `risks_v4` com `source_priority` (rank: cnae=1, ncm=2, nbs=3, **solaris=4**, iagen=5) e `evidence.gaps[]` JSON multi-fonte (Lição #68 / Fix C-bis M3.10).

### 6.6 Camada 5 — Risco → ação

`task-generator-v4.ts:142 LOC` lê o risk persistido:
- Cria 1 plano de ação por risco
- Cria N tasks (template determinístico por `rule_id`)
- Label da task inclui `"SOLARIS"` se `source_priority === 'solaris'` (`task-generator-v4.ts:90`)

Sem bug detectado aqui — herança transparente da source.

### 6.7 Resumo executivo da matriz de bugs

| ID | Severidade | Local | Impacto em produção |
|---|---|---|---|
| B1 | 🔴 | `solaris-gap-analyzer.ts:56` ignora `resposta_opcao` | 5 falsos negativos confirmados (Manus 2026-06-01) |
| B2 | 🔴 | Save aceita inconsistência radio≠texto sem validar | 1 caso confirmado |
| B3 | 🔴 | Dead-write generalizado de `resposta_opcao` (B1 é a manifestação) | igual a B1 |
| B4 | 🟡 | `startsWith('não')` casa "não se aplica" | Baixo (poucos usuários por extenso) |
| B5 | 🟡 | Z-11 `classifyAnswer` ordem incorreta | Zero hoje (Z-11 morto) |
| B6 | 🟡 | ADR-0027 violada (Z-11 nunca conectada) | Erosão de governança |
| B7 | 🟢 | Z-11 dead-code na regra dedicada de "não sei" | Zero funcional |

---

## Seção 7 — TO-BE com fases F0-Fn (alinhado à meta 98%)

### Princípio canônico TO-BE

> **`resposta_opcao` é a fonte de verdade canônica para classificação.**
> Texto livre (`resposta`) é **complemento auditável** (justificativa para o advogado revisar), nunca decide gap quando o radio está presente.

### Semântica explícita por opção (regra TO-BE)

| `resposta_opcao` | `compliance_status` | Gera gap? | Racional |
|---|---|---|---|
| `sim` | `atendido` | ❌ não | Usuário confirma conformidade |
| `nao` | `nao_atendido` | ✅ sim | Falha explícita |
| `nao_sei` | `nao_atendido` | ✅ sim (badge "conservador") | Conservador para compliance — alinhado com `coerceOnda1AnswerToGateText` do PR-B |
| `nao_se_aplica` | `nao_aplicavel` | ❌ não | Pergunta inaplicável ao contexto (não confundir com falha) |
| `null` (pergunta não respondida) | `nao_iniciado` | ❌ não — conta como missing | Diferenciar "não respondido" de "respondido como falha" |

### Validação de invariante (TO-BE)

| Invariante | Onde aplicar | Comportamento na violação |
|---|---|---|
| **INV-1:** se `resposta_opcao IS NOT NULL`, ele é a única fonte para gap | analyzer | texto livre vira apenas evidência |
| **INV-2:** se `resposta_opcao IS NULL` e `resposta IS NOT NULL`, aplicar fallback texto-livre (`startsWith` + variações) | analyzer | back-compat com projetos pré-PR-C |
| **INV-3:** salvar `resposta_opcao='sim'` + texto começando com "não" **avisa** mas não bloqueia (UX inconsistência) | frontend `handleSubmit` | toast/badge inconsistência opcional (P3) |
| **INV-4:** `analyzeSolarisAnswers` é idempotente (DELETE+INSERT) | analyzer | preservado do atual |

### F0 — Decisão arquitetural (P.O.)

| Decisão | Opções | Recomendação |
|---|---|---|
| Z-11 morto | (a) eliminar código (`unified-answer.normalizeSolarisAnswers` já documenta a exclusão); (b) ativar conforme ADR-0027; (c) congelar com comentário "DEAD — ver ADR-NN" | **(a) eliminar** — ADR-0027 será deprecada por ADR-NN que cristaliza TO-BE; Issue #964 já tem decisão "exclusão definitiva" |
| ADR-0027 | (a) bump MAJOR; (b) deprecar + ADR-NN sucessor | **(b)** — semântica nova (`resposta_opcao` canônico) é mudança de paradigma |
| Inconsistência radio≠texto | (a) bloquear no save Zod; (b) permitir + badge UX; (c) ignorar | **(b)** — `resposta_opcao` prioriza; texto inconsistente vira evidência para review jurídico |
| Cleanup de produção | confirmado pelo P.O. (apagar projetos sujos, RAG intocado) | Manus executa DELETE em `projects` cascateando para `solaris_answers`/`project_gaps_v3`/`risks_v4` — script separado pós-fix |

### F1 — Edit cirúrgico do G17 (analyzer ativo)

**Arquivo:** `server/lib/solaris-gap-analyzer.ts` (162 LOC)
**Mudanças (~30 LOC):**

```diff
- SELECT sa.resposta, sq.topicos, sq.codigo
+ SELECT sa.resposta, sa.resposta_opcao, sq.topicos, sq.codigo

- const resposta = (row.resposta as string)?.trim().toLowerCase() ?? '';
- const isNegative = resposta.startsWith('não') || resposta === 'nao';
- if (!isNegative) continue;
+ const opcao = row.resposta_opcao as RespostaOpcao | null;
+ const resposta = (row.resposta as string)?.trim().toLowerCase() ?? '';
+ // INV-1: resposta_opcao é canônica quando presente; texto vira evidência
+ // INV-2: fallback texto-livre só quando resposta_opcao é NULL
+ const classification = classifyForGap(opcao, resposta);
+ if (classification === 'nao_aplicavel' || classification === 'atendido') continue;
+ // 'nao_atendido' (vindo de 'nao', 'nao_sei', "não", ou fallback pessimista) → gera gap
```

Helper puro testável:

```ts
export type GapClassification = 'atendido' | 'nao_atendido' | 'nao_aplicavel' | 'nao_iniciado';
export function classifyForGap(
  opcao: RespostaOpcao | null,
  textoLowerTrimmed: string
): GapClassification {
  // INV-1
  if (opcao === 'sim') return 'atendido';
  if (opcao === 'nao' || opcao === 'nao_sei') return 'nao_atendido';
  if (opcao === 'nao_se_aplica') return 'nao_aplicavel';
  // INV-2 (back-compat texto-livre)
  if (!textoLowerTrimmed) return 'nao_iniciado';
  if (textoLowerTrimmed.startsWith('sim')) return 'atendido';
  if (textoLowerTrimmed === 'n/a' || textoLowerTrimmed.includes('aplicáv')
      || textoLowerTrimmed.includes('aplicav') || textoLowerTrimmed.includes('aplica'))
    return 'nao_aplicavel';
  if (textoLowerTrimmed.startsWith('não') || textoLowerTrimmed === 'nao') return 'nao_atendido';
  return 'nao_atendido'; // fallback pessimista
}
```

### F2 — Test contracts (REGRA-ORQ-28)

**Arquivo novo:** `server/lib/solaris-gap-analyzer.test.ts` (~80 LOC) — função pura `classifyForGap` × 15 cenários da matriz da seção 6.4.

Pattern idêntico ao `credito-presumido-eligibility.test.ts` (15 PASS hoje):
- Unitário sem DB (não precisa `dbDescribe`)
- 1 test por linha da matriz
- Asserts `expect(classifyForGap(...)).toBe('nao_atendido')` etc.

### F3 — Limpeza do código morto Z-11

**Decisão depende de F0.** Se (a) eliminar:
- `server/lib/analyze-gaps-questionnaires.ts` → DELETE (342 LOC removidas)
- `server/lib/analyze-gaps-questionnaires.test.ts` → DELETE
- ADR-NN documenta a remoção citando Issue #964

**Risco:** baixo (zero callers não-teste).

### F4 — Paridade IAGEN (sprint paralela, fora do escopo PR-C followup)

`iagen-gap-analyzer.ts` tem mesma lógica `startsWith('não')` (linha 91-93). Para meta 98%, eventualmente também consumir uma coluna `resposta_opcao` em `iagen_answers` — **NÃO existe ainda**. Backlog M3.9.

### F5 — Cleanup de produção

Após F1+F2 mergeados e deployados:
- Manus executa DELETE em `projects` afetados (lista que P.O. autorizar)
- CASCADE limpa `solaris_answers`, `iagen_answers`, `project_gaps_v3`, `risks_v4`, `action_plans`, `tasks`
- **RAG intocado** (regra explícita do P.O.)
- Re-cadastro dos projetos com a UX nova

### F6 — ADR sucessor de ADR-0027

**Arquivo novo:** `docs/adr/ADR-NN-resposta-opcao-canonica.md`

Conteúdo:
- Deprecar ADR-0027 (ou marcar como "Superseded by ADR-NN")
- Cristalizar: `solaris_answers.resposta_opcao` é fonte canônica
- Texto livre = evidência auditável (não decide gap quando radio existe)
- Z-11 oficialmente removido (cita Issue #964)
- Paridade IAGEN é backlog M3.9 (campo `iagen_answers.resposta_opcao` a criar)
- Vincula REGRA-ORQ-31 (meta 98%) e Lição #117 (não é só registrar)

---

## Seção 8 — Auto-auditoria final

| Critério | Status | Evidência |
|---|---|---|
| Toda afirmação tem `arquivo:linha` | ✅ | Seções 3, 6.3, 6.5 |
| Incluí testes no grep | ✅ | P4 — 9 test files mapeados |
| Incluí .sql/.md/.json | ✅ | P5 — migration, audits, 0 ADRs com `respostaOpcao` |
| Verifiquei PDF/email | ✅ | P6 — PDF não consome respostas SOLARIS |
| Issues pré-existentes consultadas | ✅ | P3 — Issue #964 OPEN + cluster M3.9 |
| ast-grep aplicado em ≥3 padrões | ✅ | P1 — 4 padrões |
| Dead-read check via ts-prune | ✅ | P2 — Z-11 confirmado morto |
| LOC reais antes de classificar | ✅ | P8 — 998 LOC nos 4 analyzers, 162 LOC alvo cirúrgico |
| ADRs identificados + bump declarado | ✅ | P9 — ADR-0027 violada, bump = deprecação + ADR-NN |
| Mapa writers/readers formal | ✅ | P10 — 4 analyzers escrevem, 1 reader downstream |
| **Classe de impacto** | **B** | F1+F2 = ~110 LOC alvo; F3+F6 = docs+delete; F4+F5 = fora do escopo cirúrgico |
| **Cobertura total estimada** | 🟢 **95%** | P9 leitura completa do ADR-0027 pode ser complementada pelo Manus |

---

## Seção 9 — Pendências para Manus

| # | Pendência | Por que Manus |
|---|---|---|
| M-1 | Leitura **completa** do ADR-0027 + identificação de PRs vinculados (#457/#459/#460) | Pode haver contexto Z-12 que justifica a deprecação completa |
| M-2 | Listar IDs dos projetos com `(resposta='', resposta_opcao IN ('nao','nao_se_aplica'))` para cleanup | Acesso ao banco TiDB de produção |
| M-3 | Confirmar paridade IAGEN — `iagen_answers.resposta` em produção, quantos registros têm `startsWith('não')` mal-classificados | SQL em produção |
| M-4 | Avaliar Issue #964 (M3.9-4) — decisão P.O. sobre formalizar exclusão de `solaris_answers` do `gapEngine` v2 (cluster `unified-answer.ts`) | Histórico de decisões cross-sprint |
| M-5 | Identificar se `analyze-gaps-questionnaires.test.ts` falha quando o módulo for deletado em F3 | Decisão de manter helper `classifyAnswer` extraído ou remover junto |

---

## Vinculações

- **REGRA-ORQ-31** (meta 98% confiabilidade) — objetivo do TO-BE
- **REGRA-ORQ-32** (no hardcode) — `resposta_opcao` ENUM é solução data-driven, não regex em texto livre
- **REGRA-ORQ-41** (Protocolo AS-IS/TO-BE com impact-tree) — este documento é a aplicação
- **Lição #117** (registrar lição ≠ aplicar fix) — caso canônico vivo: PR-C entregou a coluna, fix do analyzer ficou pendente
- **Lição #59 / #65** (assemble ≠ consumption / rastrear fluxo end-to-end) — analyzer não consome a coluna entregue
- **Lição #66** (spec sem dados = ilusão) — Z-11 é spec arquitetural (ADR-0027) sem implementação real
- **Lição #74** (fix downstream incompleto) — PR-C é o fix downstream; analyzer é a origem que faltou
- **ADR-0010** (substituição QC/QO por NCM/NBS) — contexto histórico
- **ADR-0022** (Hot Swap Risk Engine v4) — pipeline downstream intacto
- **ADR-0027** (Fonte de Verdade Respostas por Onda) — **VIOLADA, candidata a deprecação**
- **Issue #964** (M3.9 Item 4 — exclusão `solaris_answers` do Gap Engine) — vincular decisão F0

## Cláusula final

Documento entregue conforme pedido P.O. (2026-06-01): **apenas diagnóstico + AS-IS + TO-BE**. Nenhuma implementação iniciada. Branch `main` em `cd221064` intacta. Para autorizar execução, P.O. precisa decidir F0 (Z-11) + escopo (Opção A mínima vs Cirúrgica+ vs Ampla).
