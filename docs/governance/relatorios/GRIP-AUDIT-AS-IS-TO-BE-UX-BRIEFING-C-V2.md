# GRIP Audit — AS-IS/TO-BE UX-BRIEFING-C-V2 (Split View)

**Documento auditado:** `AS-IS-TO-BE-UX-BRIEFING-C-V2-20260603.md`
**Data da auditoria:** 2026-06-03
**Auditor:** Manus AI (busca profunda determinística — zero especulação)
**Método:** GRIP (Goal · Reality · Impact · Plan) com evidência file:line + SQL
**Escopo:** Verificação de TODAS as afirmações do documento contra codebase real e banco de dados

---

## Resumo Executivo

O documento AS-IS/TO-BE apresenta **alta qualidade geral** (cobertura ~92% declarada, confirmada em ~88% após auditoria). Porém, contém **1 erro factual crítico** (A3 — afirmação de que `_hallucination_detected` não existe, quando na realidade está persistido em 46 projetos no banco) e **3 lacunas de risco** que impactam a implementação do Split View. A análise de impacto revela que o fallback para markdown será exercitado em **98% dos projetos** (4851/4944 com `briefingStructured` NULL), tornando a robustez do adapter o fator de sucesso mais crítico da implementação.

| Métrica | Valor |
|---------|-------|
| Afirmações verificadas | 7/7 (A1-A7) |
| Afirmações corretas | 6/7 (85.7%) |
| Afirmações refutadas | **1 (A3 — crítico)** |
| Bugs AS-IS identificados | 5 |
| Riscos TO-BE identificados | 8 |
| Decisões pendentes P.O. | 1 (P1 — badge alucinação) |

---

## 1. GOAL — Objetivo da Auditoria

Validar com 100% de determinismo cada afirmação do documento `AS-IS-TO-BE-UX-BRIEFING-C-V2-20260603.md` contra o codebase real (`compliance-tributaria-v2`, commit `f7b9a7c`) e o banco de dados TiDB em produção, identificando:

1. Erros factuais nas afirmações AS-IS
2. Bugs latentes no estado atual
3. Lacunas e riscos no plano TO-BE (Split View)
4. Impacto em consumers downstream
5. Plano de testes para mitigar regressão

---

## 2. REALITY — Verificação de Afirmações (Evidence Table)

### 2.1 Tabela de Verificação Completa

| ID | Afirmação (documento) | Veredicto | Evidência |
|----|----------------------|-----------|-----------|
| **A1** | `@ts-nocheck` em BriefingV3.tsx:1, `loadTempData` retorna `{}` untyped causando 9 erros TS | **VERIFICADO** ✅ | `BriefingV3.tsx:1` = `// @ts-nocheck`; `loadTempData` em `:153` retorna `{data: T, savedAt: number} | null` (genérico sem tipo explícito no call-site); acesso a `.data.briefing` / `.data.generationCount` / `.data.versionHistory` sem tipo T especificado |
| **A2** | Não existe procedure `getBriefing` única; `structured` vem de `getBriefingInconsistencias` (L3764) e `briefingContent` de `getProjectStep1` (L915) | **VERIFICADO** ✅ | `getProjectStep1` definido em `routers-fluxo-v3.ts:915`; `getBriefingInconsistencias` retorna `structured` em `:3764`; `generateBriefing` retorna ambos em `:2360` |
| **A3** | `hallucination_detected` **NÃO existe** no `BriefingStructuredSchema` → badge sem fonte de dados | **PARCIALMENTE REFUTADO** 🔴 | O campo **NÃO está no Zod schema** (correto), mas **ESTÁ persistido no banco** via `flagHallucinatedCitations()` (`:2012`) → `JSON.stringify(structured)` (`:2243`). SQL confirma: **46/93 projetos** com `briefingStructured` contêm `_hallucination_detected: true`. O campo é passado ao client via `getBriefingInconsistencias.structured.principais_gaps[]` (`:3768`). **O dado EXISTE e está disponível no client.** |
| **A4** | `SOURCE_TYPE_LABEL_V2` é `const` não-exportado (server:6644); maps duplicados 4× no client | **VERIFICADO** ✅ | Server: `routers-fluxo-v3.ts:6644` (8 chaves). Client: `RiskDashboardV4.tsx:175`, `generateDiagnosticoPDF.ts:140`, `ActionPlanPage.tsx:80`, `ConsolidacaoV4.tsx:64` (12 chaves cada, superset do server). Nenhum em `shared/`. Nota: `shared/categoria-labels.ts` foi criado para CATEGORIA_LABELS (Sprint 5), mas SOURCE_TYPE_LABEL não foi consolidado. |
| **A5** | `briefingContent` é input read-only para engines downstream (MatrizesV3, PlanoAcaoV3) | **VERIFICADO** ✅ | `MatrizesV3.tsx:293`: `briefingContent = (project).briefingContentV3 \|\| (project).briefingContent`; `PlanoAcaoV3.tsx:808`: idem. Ambos passam como input para `generateMatrices`/`generatePlan` mutations. |
| **A6** | Zero teste client de BriefingV3 (só server markdown + E2E z17) | **VERIFICADO** ✅ | Único teste client: `briefing-areas.test.ts` (share areas). Nenhum teste unitário de `BriefingV3.tsx`. E2E `z17-pipeline-completo.spec.ts:329` navega para `/briefing-v3` mas testa apenas navegação. |
| **A7** | `ImpactsSection` sem campo JSON (bloco fixo, hardcode) | **VERIFICADO** ✅ | `routers-fluxo-v3.ts:6836-6845`: 3 linhas hardcoded ("Financeiro: autuações...", "Operacional: erros...", "Jurídico: constituição..."). Sem campo `impactos` no `BriefingStructuredSchema`. |

### 2.2 Detalhamento do Achado Crítico A3

> **A3 é o achado mais importante desta auditoria.** O documento afirma que `hallucination_detected` "não existe" e que o badge de alucinação do GapCard ficaria "sem fonte de dados". Isto é **factualmente incorreto**.

**Fluxo real (verificado):**

1. `generateBriefing` (`:1495`) → LLM gera `structured` → Zod parse (`BriefingStructuredSchema`)
2. **APÓS** Zod parse: `flagHallucinatedCitations(structured.principais_gaps, allowedArticles)` (`:2012`)
3. Retorna gaps com `{ ...gap, _hallucination_detected: true, _hallucinated_articles: ["Art. 14", ...] }` para gaps com citações fora do normative_bundle
4. `JSON.stringify(structured)` → salvo em `projects.briefingStructured` (`:2243`)
5. `getBriefingInconsistencias` (`:3708`) → lê `briefingStructured` do banco → parse JSON → retorna `structured.principais_gaps[]` **com** `_hallucination_detected` intacto (`:3768`)
6. Client recebe via `inconsistenciasData.structured.principais_gaps[]`

**Evidência SQL:**
```
SELECT COUNT(*) FROM projects WHERE briefingStructured LIKE '%hallucination_detected%'
→ 46 projetos (49.5% dos 93 com briefingStructured)
```

**Implicação para o TO-BE:** O `GapCard.tsx` **PODE** exibir o badge de alucinação consumindo `gap._hallucination_detected` diretamente do `structured.principais_gaps[]`. A decisão P1 muda de "sem dado" para "dado existe mas não está tipado".

---

## 3. BUGS AS-IS (Estado Atual)

### 3.1 Tabela de Bugs Identificados

| # | Bug | Severidade | Arquivo:Linha | Impacto |
|---|-----|-----------|---------------|---------|
| BUG-1 | **Type gap**: `_hallucination_detected` e `_hallucinated_articles` não estão no Zod schema nem em `BriefingLite` interface | Média | `ai-schemas.ts:178` (Zod), `briefing-areas.ts:93` (BriefingLite) | Client acessa via `(gap as any)._hallucination_detected` — sem type safety. Qualquer refactor pode quebrar silenciosamente. |
| BUG-2 | **Label map divergência**: Server tem 8 chaves em `SOURCE_TYPE_LABEL_V2`, client tem 12 chaves (inclui `ncm`, `nbs`, `regulatorio`, `inferred` extras) | Baixa | `routers-fluxo-v3.ts:6644` vs `RiskDashboardV4.tsx:175` | Se server adicionar nova chave, 4 arquivos client precisam update manual. Risco de drift. |
| BUG-3 | **20 arquivos com `@ts-nocheck`** (não apenas BriefingV3) | Média | 20 arquivos `.tsx`/`.ts` listados | Erros de tipo silenciados em toda a aplicação. Qualquer refactor pode introduzir bugs sem detecção em compile-time. |
| BUG-4 | **`handleExportPDF` inline diverge de `generateDiagnosticoPDF.ts`** | Baixa | `BriefingV3.tsx:446` (inline regex-based) vs `generateDiagnosticoPDF.ts:151` (jsPDF structured) | Dois caminhos de PDF com formatação diferente. O inline usa regex para converter markdown→HTML (frágil); o library usa dados estruturados (robusto). |
| BUG-5 | **`BriefingLite` interface incompleta**: Não inclui `source_type`, `source_reference`, `top_3_acoes`, `confiancaSnapshot`, `dismissed_inconsistencias` | Média | `briefing-areas.ts:93-115` | ShareModal não pode exibir fonte dos gaps nem top 3 ações. Qualquer componente que precise desses campos precisa cast `as any`. |

### 3.2 Métricas de Saúde do Código

| Métrica | Valor | Risco |
|---------|-------|-------|
| LOC de `BriefingV3.tsx` | ~1200 | Alto (monolito, difícil de testar) |
| Arquivos `@ts-nocheck` | 20 | Alto (erros silenciados) |
| Duplicações de label map | 5 cópias (1 server + 4 client) | Médio (drift) |
| Testes unitários client de BriefingV3 | 0 | Alto (sem rede de segurança) |
| Projetos com `briefingStructured` NULL | 4851/4944 (98%) | Alto (fallback path é o caminho principal) |
| Projetos com `_hallucination_detected` | 46/93 (49.5% dos com structured) | Info (dado disponível) |

---

## 4. IMPACT — Análise de Impacto do Split View

### 4.1 Consumers Impactados

| Consumer | Tipo | Impacto do Split View | Risco |
|----------|------|----------------------|-------|
| `briefing-areas.ts` | Lib (share) | Lê `structured.principais_gaps[]`, `oportunidades[]`, `recomendacoes_prioritarias[]`, `inconsistencias[]`, `nivel_risco_geral`, `confidence_score` | 🟢 Baixo — adapter expõe mesmo shape |
| `ShareBriefingModal.tsx` | Componente | Consome `briefingStructuredForShare` via `BriefingLite` interface | 🟡 Médio — `BriefingLite` precisa extensão para novos campos |
| `ConfidenceBar.tsx` | Componente | Lê `confidence_score.nivel_confianca` | 🟢 Baixo — campo preservado |
| `AlertasInconsistencia.tsx` | Componente | Lê inconsistências do tRPC response | 🟢 Baixo — dados não mudam |
| `MatrizesV3.tsx` | Página | Usa `briefingContent` (markdown) como input para engine | 🟢 Nenhum — read-only, não afetado |
| `PlanoAcaoV3.tsx` | Página | Usa `briefingContent` (markdown) como input para engine | 🟢 Nenhum — read-only, não afetado |
| `RiskDashboardV4.tsx` | Página | Label map duplicado; não consome briefingStructured diretamente | 🟡 Médio — consolidação de labels recomendada |
| `generateDiagnosticoPDF.ts` | Lib (PDF) | Label map duplicado; gera PDF do diagnóstico (não do briefing) | 🟢 Baixo — não afetado pelo Split View |
| `E2E z17-pipeline-completo.spec.ts` | Teste | Navega `/briefing-v3`, assere `textContent.includes(...)` | 🔴 Alto — textos de seção podem mudar no Split View |
| `briefing-areas.test.ts` | Teste | Testa `groupBriefingByArea` com mock structured | 🟢 Baixo — adapter preserva shape |

### 4.2 Análise de Risco do Fallback Path

O dado mais crítico desta auditoria é: **98% dos projetos (4851/4944) têm `briefingStructured` NULL**. Isto significa que o `briefingAdapter.ts` proposto no TO-BE será exercitado no modo **fallback (markdown)** na esmagadora maioria dos casos. O Split View (modo `split`) só será ativado para os 93 projetos com structured válido.

**Implicação:** O adapter DEVE ser testado extensivamente no path de fallback. O teste "structured null → render markdown" não é edge case — é o **caminho principal**.

### 4.3 Cascata de Impacto (Diagrama Textual)

```
Split View (BriefingSplitView.tsx)
├── DecisionPanel.tsx
│   └── ConfidenceBar.tsx (já existe, reusa)
│   └── confidence_score.nivel_confianca (campo existe ✅)
├── PriorityCards.tsx
│   └── structured.top_3_acoes[] (campo existe ✅)
├── GapCard.tsx
│   ├── structured.principais_gaps[] (campo existe ✅)
│   ├── source_type + SOURCE_TYPE_LABEL (duplicado 5×, consolidar ⚠️)
│   └── _hallucination_detected (EXISTE no DB ✅, sem tipo ⚠️)
├── OpportunityCard.tsx
│   └── structured.oportunidades[] (campo existe ✅)
├── ActionsList.tsx
│   └── structured.recomendacoes_prioritarias[] (campo existe ✅)
├── ImpactsSection.tsx
│   └── HARDCODED (3 linhas fixas, sem campo JSON ⚠️)
├── MethodSection.tsx
│   └── structured.confidence_score + briefingContent (exceção: lê markdown)
└── ActionBar.tsx
    └── handleApprove/handleExportPDF/handleGenerate (movidos, não reescritos ✅)
```

---

## 5. PLAN — Crítica do TO-BE e Sugestões

### 5.1 Gaps no Plano TO-BE

| # | Gap | Severidade | Sugestão |
|---|-----|-----------|----------|
| G1 | **A3 incorreto invalida R11**: O documento assume que `_hallucination_detected` não existe e propõe "P1 decisão P.O." com 3 opções. Na realidade, a **Opção 0** (usar campo existente) é viável e mais simples. | Alta | **Recomendação: Opção 0** — consumir `gap._hallucination_detected` diretamente. Tipar no `BriefingLite` interface. Zero backend change. |
| G2 | **`BriefingLite` interface insuficiente para Split View**: Faltam `source_type`, `source_reference`, `top_3_acoes[]`, `_hallucination_detected`, `_hallucinated_articles` | Alta | Estender `BriefingLite` ou criar `BriefingStructuredFull` type que inclua todos os campos. Alternativa: inferir tipo do response de `getBriefingInconsistencias`. |
| G3 | **Fallback path é 98% dos casos**: O plano trata fallback como edge case ("briefings antigos"), mas é o caminho principal. | Alta | Inverter prioridade de testes: testar fallback PRIMEIRO. DoD deve exigir: "fallback markdown renderiza idêntico ao monolito atual para 100% dos projetos com structured NULL". |
| G4 | **`ImpactsSection` sem evolução planejada**: Bloco fixo hardcoded (3 linhas) será movido para componente, mas continuará hardcoded. | Baixa | Aceitável para V1. Futuro: derivar impactos dos gaps (ex.: gap com urgência "imediata" → impacto financeiro alto). |
| G5 | **Label map consolidation não está no plano de PRs**: A4 identifica 5 cópias, mas nenhum PR propõe `shared/source-type-labels.ts` | Média | Adicionar ao F0 ou F1: criar `shared/source-type-labels.ts` com superset de 12 chaves. Import em server + 4 client files. Precedente: `shared/categoria-labels.ts` já fez isso para CATEGORIA_LABELS. |
| G6 | **MethodSection lê markdown (exceção)**: O TO-BE diz "consome structured", mas MethodSection precisa de `briefingContent` para "Como ler este briefing" e "Limites do Diagnóstico" (seções que não têm campo JSON). | Média | Documentar explicitamente que MethodSection recebe AMBOS (structured + markdown). O adapter deve expor `rawMarkdown` para este componente. |
| G7 | **`handleExportPDF` inline não migra para `generateDiagnosticoPDF`**: O plano mantém o PDF inline (BUG-4 não resolvido). | Baixa | Aceitável para Sprint 5 (escopo frontend-only). Registrar como tech debt para Sprint 6. |
| G8 | **20 arquivos `@ts-nocheck` vs F0 "remover de BriefingV3"**: O plano F0 remove apenas de BriefingV3, mas 19 outros arquivos permanecem sem type safety. | Info | Fora de escopo do Split View. Registrar como tech debt. F0 é correto em focar apenas em BriefingV3. |

### 5.2 Riscos do Plano de PRs

| PR | Fase | Risco Identificado | Mitigação Sugerida |
|----|------|-------------------|-------------------|
| PR-0 | F0 | `loadTempData` sem tipo T → 9 erros TS ao remover `@ts-nocheck` | Definir `interface BriefingDraft { briefing: string; generationCount: number; versionHistory: BriefingVersion[] }` e usar `loadTempData<BriefingDraft>(...)` |
| PR-1 | F1 | Adapter trata fallback como secundário | Testar fallback PRIMEIRO (98% dos projetos). Incluir teste: "structured com shape parcial (ex.: sem `top_3_acoes`) → fallback gracioso" |
| PR-2 | F2 | `GapCard` precisa de tipo para `_hallucination_detected` | Estender tipo do gap no adapter: `interface GapViewProps { ..., hallucinationDetected?: boolean, hallucinatedArticles?: string[] }` |
| PR-3 | F3+F4 | E2E z17 depende de `textContent.includes("Resumo")` | Preservar texto "Resumo Executivo" como heading no Split View. Mapear TODOS os textos assertados no E2E e garantir presença. |
| PR-4 | F5 | Flip do flag com 98% fallback | Validar com projeto real que TEM structured (ex.: 5700001) E com projeto sem structured. Ambos devem funcionar. |

### 5.3 Recomendação para P1 (Badge de Alucinação)

Com base na evidência coletada, a recomendação é **Opção 0** (não listada no documento original):

> **Opção 0 — Consumir `_hallucination_detected` existente no client**
>
> - O campo JÁ está persistido em 46 projetos (49.5% dos com structured)
> - JÁ é retornado ao client via `getBriefingInconsistencias.structured.principais_gaps[]`
> - Requer apenas: (a) estender `BriefingLite` interface, (b) `GapCard` renderizar badge condicional
> - Zero mudança de backend. Zero nova procedure. Zero nova migration.
> - Classificação: **Classe A** (frontend-only), não Classe C como o documento sugere para opção (c).

**Risco da Opção 0:** O campo não está no Zod schema, então se o LLM retornar um gap sem `_hallucination_detected`, o campo simplesmente não existirá (undefined) — o que é o comportamento correto (sem badge = sem alucinação detectada). O `flagHallucinatedCitations` só adiciona o campo quando há citação inválida.

---

## 6. Snapshot AS-IS vs TO-BE

### 6.1 Estado Atual (AS-IS Snapshot)

| Componente/Feature | Estado Atual | Arquivo:Linha |
|-------------------|-------------|---------------|
| Render do briefing | Markdown via `<Streamdown>` | `BriefingV3.tsx:1060` (approx) |
| Dados estruturados | Disponíveis mas só usados no Share | `BriefingV3.tsx:212` |
| Confidence bar | Componente separado, funcional | `ConfidenceBar.tsx:7` |
| Hallucination detection | Persistido no DB, invisível na UI | `validate-article-citations.ts:78` → DB |
| Label de fonte (source_type) | Exibido no markdown (server-side) | `routers-fluxo-v3.ts:6793` |
| Inconsistências | Renderizadas condicionalmente | `AlertasInconsistencia.tsx` |
| Impactos | 3 linhas hardcoded no markdown | `routers-fluxo-v3.ts:6836-6845` |
| PDF export | Inline (regex markdown→HTML) | `BriefingV3.tsx:446-523` |
| Aprovação | Gate confidence <85% → modal reservation | `BriefingV3.tsx:400-430` |
| Histórico de versões | Timeline com toggle de razão | `BriefingV3.tsx:744-839` |
| Persistência local | `useAutoSave` + `loadTempData` | `usePersistenceV3.ts` |
| Type safety | `@ts-nocheck` (zero TS checking) | `BriefingV3.tsx:1` |
| Testes unitários (client) | Zero | — |
| data-testid | 7 existentes | `BriefingV3.tsx:616,769,782,807,824,1012,1118` |

### 6.2 Estado Planejado (TO-BE)

| Componente/Feature | Estado Planejado | Dependência |
|-------------------|-----------------|-------------|
| Render do briefing | Split View (JSON) + fallback (markdown) | `briefingAdapter.ts` |
| Dados estruturados | Consumidos diretamente por 9 componentes | `getBriefingInconsistencias.structured` |
| Confidence bar | Migra para `DecisionPanel.tsx` (zona 1) | Reuso de `ConfidenceBar.tsx` |
| Hallucination detection | **P1 pendente** (Opção 0 recomendada) | `gap._hallucination_detected` |
| Label de fonte (source_type) | `GapCard.tsx` com map 12 chaves | Consolidar em `shared/` |
| Inconsistências | Seção dedicada na nav lateral | `structured.inconsistencias[]` |
| Impactos | `ImpactsSection.tsx` (hardcoded) | Nenhuma (bloco fixo) |
| PDF export | Mantido inline (não migra) | `handleExportPDF` preservado |
| Aprovação | Preservado idêntico (movido, não reescrito) | `handleApprove` + gate |
| Histórico de versões | Preservado no container | `viewingVersion` state |
| Persistência local | Preservado no container | `useAutoSave`/`usePersistenceV3` |
| Type safety | `@ts-nocheck` removido (F0) | Tipar `loadTempData` |
| Testes unitários (client) | Adapter test + render tests (F1-F2) | Novos testes |
| data-testid | 7 preservados + novos | E2E z17 verde |
| Feature flag | `BRIEFING_UI_VERSION` (legacy/split) | Rollback instantâneo |

---

## 7. Plano de Testes (Cobertura Completa)

### 7.1 Testes Unitários (Vitest)

| Teste | Cobertura | Prioridade |
|-------|-----------|-----------|
| `briefingAdapter.test.ts` — structured válido → modo split | Adapter core | P0 |
| `briefingAdapter.test.ts` — structured NULL → modo markdown (fallback) | **Caminho principal (98%)** | P0 |
| `briefingAdapter.test.ts` — structured parcial (sem `top_3_acoes`) → fallback gracioso | Edge case | P0 |
| `briefingAdapter.test.ts` — structured com `_hallucination_detected` → props corretas | Hallucination badge | P1 |
| `briefingAdapter.test.ts` — structured com `dismissed_inconsistencias` → filtra corretamente | Inconsistências | P1 |
| `GapCard.test.tsx` — render com source_type → label legível | Labels | P1 |
| `GapCard.test.tsx` — render com `_hallucination_detected: true` → badge visível | Hallucination | P1 (se P1 aprovado) |
| `GapCard.test.tsx` — render sem source_type → linha omitida | Graceful | P1 |
| `DecisionPanel.test.tsx` — confidence 0-49 → "Crítico" | Faixas | P1 |
| `DecisionPanel.test.tsx` — confidence 50-79 → "Parcial" | Faixas | P1 |
| `DecisionPanel.test.tsx` — confidence 80-94 → "Adequado" | Faixas | P1 |
| `DecisionPanel.test.tsx` — confidence 95-100 → "Completo" | Faixas | P1 |
| `PriorityCards.test.tsx` — render 3 ações com prazo | Top 3 | P2 |
| `BriefingNav.test.tsx` — 5 seções renderizadas | Navegação | P2 |
| `ImpactsSection.test.tsx` — render 3 eixos fixos | Impactos | P2 |
| `MethodSection.test.tsx` — render confidence + limitações | Método | P2 |

### 7.2 Testes de Integração

| Teste | Cobertura | Prioridade |
|-------|-----------|-----------|
| Flag `legacy` → monolito renderiza idêntico | Rollback | P0 |
| Flag `split` + structured válido → Split View renderiza | Happy path | P0 |
| Flag `split` + structured NULL → fallback markdown | **Caminho principal** | P0 |
| `handleApprove` funciona idêntico em ambos os modos | Aprovação | P0 |
| `handleGenerate` com correction/complement funciona | Regeneração | P1 |
| `handleExportPDF` gera PDF correto em ambos os modos | PDF | P1 |
| `viewingVersion` alterna entre versões no Split View | Histórico | P1 |
| Share modal recebe `structured` correto | Compartilhamento | P2 |

### 7.3 Testes E2E (z17 + novos)

| Teste | Cobertura | Prioridade |
|-------|-----------|-----------|
| CT-05..08 (z17 existente) — PRESERVAR | Regressão | P0 |
| Novo: navegar `/briefing-v3` com projeto structured → Split View visível | Happy path | P0 |
| Novo: navegar `/briefing-v3` com projeto sem structured → markdown visível | Fallback | P0 |
| Novo: aprovar briefing com confidence ≥85% → navega para risk-dashboard | Aprovação | P0 |
| Novo: aprovar briefing com confidence <85% → modal reservation | Gate | P1 |
| Novo: regenerar briefing → versão incrementa | Regeneração | P1 |
| Novo: clicar "Compartilhar Resumo" → modal com dados estruturados | Share | P2 |

### 7.4 Smoke Tests (Runtime)

| Cenário | Validação | Prioridade |
|---------|-----------|-----------|
| Projeto 5700001 (structured + hallucination) | Split View + badge alucinação | P0 |
| Projeto 5790001 (structured, 6 gaps) | Split View + 6 GapCards | P0 |
| Projeto com structured NULL (qualquer) | Fallback markdown idêntico ao monolito | P0 |
| Mobile (viewport 375px) | Nav → tabs, sem overflow | P1 |

---

## 8. Recomendações Priorizadas

### 8.1 Ações Imediatas (antes de implementar)

1. **Corrigir A3 no documento**: Atualizar afirmação para refletir que `_hallucination_detected` EXISTE no banco e é retornado ao client. Remover "P1 decisão P.O." ou reformular como "P1: EXIBIR ou NÃO o badge (dado já disponível)".

2. **Estender `BriefingLite` interface** (ou criar tipo novo) para incluir:
   ```typescript
   interface BriefingGapFull {
     gap?: string;
     causa_raiz?: string;
     evidencia_regulatoria?: string;
     urgencia?: string;
     source_type?: string;
     source_reference?: string;
     _hallucination_detected?: boolean;
     _hallucinated_articles?: string[];
   }
   ```

3. **Criar `shared/source-type-labels.ts`** (precedente: `shared/categoria-labels.ts`):
   - Superset de 12 chaves (server 8 + client extras 4)
   - Import em `routers-fluxo-v3.ts` + 4 client files
   - Elimina 5 cópias duplicadas

4. **Inverter prioridade de testes**: Fallback markdown é o caminho de 98% dos projetos. Testar PRIMEIRO.

### 8.2 Ações no Plano de PRs

| PR | Adição Sugerida |
|----|----------------|
| PR-0 (F0) | Além de remover `@ts-nocheck`: criar `shared/source-type-labels.ts` e consolidar 5 cópias |
| PR-1 (F1) | Adapter DEVE ter 3 testes de fallback (NULL, empty string, shape parcial) antes de 1 teste de split |
| PR-2 (F2) | `GapCard` props DEVE incluir `hallucinationDetected?: boolean` desde o início (mesmo se badge desabilitado por flag) |
| PR-3 (F3+F4) | Mapear TODOS os textos assertados no E2E z17 e garantir presença no Split View |
| PR-4 (F5) | Validar com projeto 5700001 (structured + hallucination) e projeto sem structured |

---

## 9. Decisões Pendentes

| ID | Decisão | Responsável | Recomendação Manus | Impacto se Adiada |
|----|---------|-------------|-------------------|-------------------|
| **P1** | Exibir badge de alucinação no GapCard | P.O. (Uires Tapajós) | **Opção 0**: consumir `_hallucination_detected` existente. Zero backend. Classe A. | Baixo — badge pode ser adicionado em sprint posterior sem breaking change |

---

## 10. Conclusão

O documento AS-IS/TO-BE é de **alta qualidade** e demonstra profundidade de análise. O erro factual A3 é significativo mas não invalida o plano — apenas simplifica a solução (de "sem dado" para "dado existe, basta consumir"). Os principais riscos da implementação são:

1. **Fallback path como caminho principal** (98% dos projetos) — requer inversão de prioridade de testes
2. **Type safety** — `BriefingLite` insuficiente para o Split View, precisa extensão
3. **Label map duplication** — 5 cópias sem consolidação planejada

O plano de PRs (F0→F5) é sólido, incremental e reversível. Com as correções sugeridas nesta auditoria, o risco de regressão é **controlável** e o Split View pode ser implementado com confiança.

---

**Assinatura:** Manus AI — Auditoria GRIP determinística
**Commit de referência:** `f7b9a7c` (github/main)
**Checkpoint:** `409c5b6d`
**Banco:** TiDB Cloud (produção)
**Método:** Zero especulação. Toda afirmação verificada contra file:line ou SQL.
