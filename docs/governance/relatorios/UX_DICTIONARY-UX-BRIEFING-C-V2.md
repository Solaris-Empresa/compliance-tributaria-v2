# UX DICTIONARY — UX-BRIEFING-C-V2 (Split View)

**Criado:** Sprint 5 (2026-06-03) | **Motivo:** Gate F3 — artefato obrigatório (checklist 7/7)
**Precedente:** §M1.1 (BUG-AGRO-CPF, PR #1297, SHA `835c813`)
**Issue:** #1344 | **PR:** #1354
**Tela host:** `client/src/pages/BriefingV3.tsx` (1200 linhas, `@ts-nocheck`)
**Rota:** `/projetos/:id/briefing-v3`
**Feature flag:** `BRIEFING_UI_VERSION` — `legacy` (monolito atual) | `v2` (Split View)

---

## Regra de ouro

> **NUNCA implementar frontend sem entrada neste dicionário.**
> Se o componente não estiver aqui, executar `.claude/agents/ux-spec-validator.md` e criar entrada antes de codar.

---

## 1. DecisionPanel

**Arquivo TO-BE:** `client/src/components/briefing/DecisionPanel.tsx`
**Zona:** 1 (sidebar fixa)
**Fonte de dados:** `structured.confidence_score.nivel_confianca` (number 0-100) + `structured.nivel_risco_geral` (enum) + contadores derivados

### Labels visíveis

| Chave | Label PT-BR | Evidência |
|---|---|---|
| `gauge_title` | "Grau de Completude do Diagnóstico" | C1 / DP-05 (AS-IS-TO-BE v5 §7.2) |
| `faixa_0_49` | "Crítico" | C1 faixas (`:29` AS-IS-TO-BE) |
| `faixa_50_79` | "Parcial" | C1 faixas |
| `faixa_80_94` | "Adequado" | C1 faixas |
| `faixa_95_100` | "Completo" | C1 faixas |
| `alerta_label` | "Alerta: completude abaixo de 80%" | C1 alerta <80 |
| `risco_badge_title` | "Nível de Exposição" | Mockup Zona 1 |
| `risco_baixo` | "Baixo" | `Badges.tsx:23` |
| `risco_medio` | "Médio" | `Badges.tsx:22` |
| `risco_alto` | "Alto" | `Badges.tsx:21` |
| `risco_critico` | "Crítico" | `Badges.tsx:20` |
| `counter_gaps` | "Gaps" | Mockup Zona 1 |
| `counter_oportunidades` | "Oportunidades" | Mockup Zona 1 |
| `counter_acoes` | "Ações" | Mockup Zona 1 |
| `counter_inconsistencias` | "Inconsistências" | Mockup Zona 1 |
| `counter_top3` | "Prioridades" | Mockup Zona 1 |
| `resumo_executivo_title` | "Resumo Executivo" | Mockup Zona 1 |

### Faixas de completude (C1 — decisão aprovada)

| Faixa | Range | Cor | Ícone |
|---|---|---|---|
| Crítico | 0–49 | Vermelho (`bg-red-500`) | `ShieldAlert` |
| Parcial | 50–79 | Âmbar (`bg-amber-500`) | `Shield` |
| Adequado | 80–94 | Verde (`bg-emerald-500`) | `ShieldCheck` |
| Completo | 95–100 | Verde escuro (`bg-green-600`) | `ShieldCheck` + check |

> **ATENÇÃO:** Estas faixas são DIFERENTES das do `ConfidenceBar.tsx` existente (>=85/70-84/<70). O `DecisionPanel` usa as 4 faixas C1. O `ConfidenceBar` existente NÃO é reutilizado — é substituído pelo gauge do DecisionPanel.

### Estados

| Estado | Condição | Comportamento visual |
|---|---|---|
| `loading` | `isLoading` de `getBriefingInconsistencias` | Skeleton pulse |
| `loaded` | dados disponíveis | Gauge + badges + contadores |
| `alerta` | `nivel_confianca < 80` | Borda vermelha + ícone alerta + texto "Alerta" |
| `aprovado` | `approval_reservation === null` E briefing aprovado | Badge "Aprovado" verde |
| `aprovado-com-ressalva` | `approval_reservation !== null` | `BriefingReservationBadge` (componente existente reusado) |

### Invariantes

- Gauge lê `confidence_score.nivel_confianca` (number dentro de OBJECT — NÃO é number direto). Ref: `ai-schemas.ts:237`.
- Alerta visual (faixa <80) ≠ gate de aprovação (<85). Ambos coexistem: visual "Adequado" (82%) MAS aprovar exige justificativa (gate 85%).
- `nivel_risco_geral` enum: `"baixo" | "medio" | "alto" | "critico"` (`ai-schemas.ts:180`).
- Contadores derivados de `structured.principais_gaps.length`, `structured.oportunidades.length`, `structured.recomendacoes_prioritarias.length`, `structured.inconsistencias.length`, `structured.top_3_acoes.length`.

### data-testid (novos)

| Seletor | Elemento |
|---|---|
| `decision-panel` | Container raiz |
| `decision-panel-gauge` | Gauge circular/barra |
| `decision-panel-faixa` | Badge de faixa textual |
| `decision-panel-alerta` | Banner de alerta <80 |
| `decision-panel-risco-badge` | Badge nivel_risco_geral |
| `decision-panel-resumo` | Bloco resumo executivo |

---

## 2. GapCard

**Arquivo TO-BE:** `client/src/components/briefing/GapCard.tsx`
**Zona:** 2 (tab "Gaps")
**Fonte de dados:** `structured.principais_gaps[i]`

### Labels visíveis (por `source_type` — decisão UX-LABELS-01 #1342)

| `source_type` (enum) | Label PT-BR | Evidência |
|---|---|---|
| `questionario` | "Declaração do contribuinte" | `SOURCE_TYPE_LABEL_V2` (`:6644`) |
| `regra_semantica` | "Aplicação obrigatória por perfil" | `SOURCE_TYPE_LABEL_V2` (`:6649`) |
| `solaris` | "Questionário de conformidade SOLARIS" | `SOURCE_TYPE_LABEL_V2` (`:6651`) — UX-LABELS-01 |
| `rag` | "Norma aplicável identificada" | `SOURCE_TYPE_LABEL_V2` (`:6645`) |
| `cnae` | "Incidência por atividade econômica (CNAE)" | `SOURCE_TYPE_LABEL_V2` (`:6646`) |
| `descricao` | "Sinal identificado na descrição da atividade" | `SOURCE_TYPE_LABEL_V2` (`:6647`) |
| `iagen` | "Análise complementar por IA" | `SOURCE_TYPE_LABEL_V2` (`:6649`) |

> **SEM EMOJI** nos labels (UX-LABELS-01 #1342). Mockup MK-3 mostra "🔮 Diagnóstico SOLARIS" — **REJEITADO**, usar label canônico acima.

### Labels de urgência

| `urgencia` (enum) | Label PT-BR | Cor | Evidência |
|---|---|---|---|
| `imediata` | "Imediata" | Vermelho (`bg-red-100 text-red-800`) | `Badges.tsx:26`, `URGENCIA_LABELS` |
| `curto_prazo` | "Curto Prazo" | Laranja (`bg-orange-100 text-orange-800`) | `Badges.tsx:27` |
| `medio_prazo` | "Médio Prazo" | Amarelo (`bg-yellow-100 text-yellow-800`) | `Badges.tsx:28` |

### Badge de alucinação (DP-06 — Opção 0)

| Condição | Label | Ícone | Evidência |
|---|---|---|---|
| `gap._hallucination_detected === true` | "Verificar artigo citado" | `⚠️` (AlertTriangle) | Mockup MK-4 ✅ + DB confirmado 46/93 |
| `gap._hallucination_detected !== true` | — (ausente) | — | — |

### Campos renderizados

| Campo JSON | Elemento UI | Nota |
|---|---|---|
| `gap` | Título principal (h3/bold) | **NÃO é "titulo"** — campo chama-se `gap` |
| `causa_raiz` | Texto expandido | Visível ao expandir card |
| `evidencia_regulatoria` | Link/texto referência legal | Visível ao expandir card |
| `urgencia` | Badge colorido | Sempre visível |
| `source_type` | Badge de fonte | Sempre visível, label via map |
| `source_reference` | Texto de referência | **SEM prefixo** "Aplicação obrigatória:" (C4/UX-LABELS-02 #1346) |
| `_hallucination_detected` | Badge alerta | Condicional |
| `_hallucinated_articles` | Tooltip/detalhe | Opcional, lista artigos suspeitos |

### Estados

| Estado | Condição | Comportamento |
|---|---|---|
| `default` | Card colapsado | Mostra: `gap` (título) + badges (urgência, fonte, alucinação) |
| `expandido` | Click/toggle | Mostra: + `causa_raiz` + `evidencia_regulatoria` + `source_reference` |
| `hallucination` | `_hallucination_detected === true` | Badge ⚠️ + borda amarela/warning |

### Variantes (por `source_type`)

Cada variante muda apenas o badge de fonte (cor + texto). Layout idêntico.

| Variante | Badge cor |
|---|---|
| `questionario` | Azul (`bg-blue-100`) |
| `regra_semantica` | Roxo (`bg-purple-100`) |
| `solaris` | Indigo (`bg-indigo-100`) |
| `rag` | Verde (`bg-green-100`) |
| `cnae` | Cinza (`bg-gray-100`) |
| `descricao` | Teal (`bg-teal-100`) |
| `iagen` | Âmbar (`bg-amber-100`) |

### data-testid (novos)

| Seletor | Elemento |
|---|---|
| `briefing-gap-card-{i}` | Container do gap (0-indexed) |
| `briefing-gap-source-badge-{i}` | Badge de fonte |
| `briefing-gap-urgencia-badge-{i}` | Badge de urgência |
| `briefing-gap-hallucination-badge-{i}` | Badge ⚠️ alucinação |
| `briefing-gap-expand-{i}` | Botão expandir |

---

## 3. PriorityCards

**Arquivo TO-BE:** `client/src/components/briefing/PriorityCards.tsx`
**Zona:** 2 (acima das tabs, ou Zona 1 inferior)
**Fonte de dados:** `structured.top_3_acoes[]` (max 3 items, `ai-schemas.ts:225`)

### Labels visíveis

| Chave | Label PT-BR | Evidência |
|---|---|---|
| `section_title` | "Top 3 Prioridades" | Markdown builder (`:6740`) |
| `prazo_imediato` | "Imediato" | `URGENCIA_LABEL_V2` (`:6637`) sem emoji |
| `prazo_curto_prazo` | "Curto Prazo" | idem |
| `prazo_medio_prazo` | "Médio Prazo" | idem |
| `justificativa_prefix` | "Por quê:" | Markdown builder (`:6747`) |

### Campos renderizados

| Campo JSON | Elemento UI |
|---|---|
| `acao` | Título do card (bold) |
| `justificativa` | Texto descritivo |
| `prazo` | Badge de prazo (enum: `"imediato" | "curto_prazo" | "medio_prazo"`) |

### Estados

| Estado | Condição | Comportamento |
|---|---|---|
| `loading` | Query pendente | 3 skeleton cards |
| `loaded` | `top_3_acoes.length > 0` | 1-3 cards renderizados |
| `vazio` | `top_3_acoes.length === 0` | Seção oculta (campo opcional, `ai-schemas.ts:225`) |

### data-testid (novos)

| Seletor | Elemento |
|---|---|
| `briefing-priority-cards` | Container seção |
| `briefing-priority-card-{i}` | Card individual (0-indexed) |

---

## 4. OpportunityCard

**Arquivo TO-BE:** `client/src/components/briefing/OpportunityCard.tsx`
**Zona:** 2 (tab "Oportunidades")
**Fonte de dados:** `structured.oportunidades[]` (string[], max 5, `ai-schemas.ts:207`)

### Labels visíveis

| Chave | Label PT-BR |
|---|---|
| `tab_title` | "Oportunidades" |

### Estados

| Estado | Condição | Comportamento |
|---|---|---|
| `default` | `oportunidades.length > 0` | Lista de cards com texto |
| `vazio` | `oportunidades.length === 0` | Mensagem "Nenhuma oportunidade identificada" |

### data-testid (novos)

| Seletor | Elemento |
|---|---|
| `briefing-opportunities-list` | Container lista |
| `briefing-opportunity-{i}` | Item individual |

---

## 5. ActionsList

**Arquivo TO-BE:** `client/src/components/briefing/ActionsList.tsx`
**Zona:** 2 (tab "Ações")
**Fonte de dados:** `structured.recomendacoes_prioritarias[]` (string[], max 5, `ai-schemas.ts:216`)

### Labels visíveis

| Chave | Label PT-BR |
|---|---|
| `tab_title` | "Ações Recomendadas" |

### Estados

| Estado | Condição | Comportamento |
|---|---|---|
| `default` | `recomendacoes_prioritarias.length > 0` | Lista numerada |
| `vazio` | `recomendacoes_prioritarias.length === 0` | Mensagem "Nenhuma ação recomendada" |

### data-testid (novos)

| Seletor | Elemento |
|---|---|
| `briefing-actions-list` | Container lista |
| `briefing-action-{i}` | Item individual |

---

## 6. ImpactsSection

**Arquivo TO-BE:** `client/src/components/briefing/ImpactsSection.tsx`
**Zona:** 2 (tab "Impactos")
**Fonte de dados:** Bloco fixo hardcoded (NÃO vem do JSON — `server/routers-fluxo-v3.ts:6835-6843`)

### Labels visíveis (fixos — 3 eixos)

| Chave | Label PT-BR | Conteúdo fixo |
|---|---|---|
| `impacto_financeiro` | "Financeiro" | "autuações, glosa de créditos, tributação indevida" |
| `impacto_operacional` | "Operacional" | "erros sistêmicos recorrentes, retrabalho" |
| `impacto_juridico` | "Jurídico" | "constituição automática de débito tributário, perda de espontaneidade" |

### Estados

| Estado | Condição | Comportamento |
|---|---|---|
| `loading` | Query pendente | Skeleton |
| `loaded` | Sempre (bloco fixo) | 3 cards/linhas com ícone + texto |

### Invariantes

- Conteúdo é **estático** — não depende do projeto. Ref: `server:6835-6843`.
- No fallback markdown (98% dos projetos), renderizado via `<Streamdown>` do `briefingContent`.
- No Split View (2%), renderizado como componente dedicado com os 3 textos fixos.

### data-testid (novos)

| Seletor | Elemento |
|---|---|
| `briefing-impacts-section` | Container seção |
| `briefing-impact-{tipo}` | Item (financeiro/operacional/juridico) |

---

## 7. MethodSection

**Arquivo TO-BE:** `client/src/components/briefing/MethodSection.tsx`
**Zona:** 2 (tab "Metodologia")
**Fonte de dados:** `structured.confidence_score` + `confiancaSnapshot.pilares[]` (via `checkBriefingFreshness`)

### Labels visíveis

| Chave | Label PT-BR | Evidência |
|---|---|---|
| `tab_title` | "Metodologia" | Mockup Zona 2 |
| `section_limites` | "Limites do Diagnóstico" | Markdown builder (`:6878`) |
| `section_calculo` | "Como calculamos a Confiança" | Markdown builder (`:6899`) |
| `confianca_label` | "Nível de Confiança: {X}%" | Markdown builder (`:6882`) |
| `pilares_intro` | "Média ponderada de 6 pilares de informação fornecida pela empresa." | Markdown builder (`:6903`) |

### Estados

| Estado | Condição | Comportamento |
|---|---|---|
| `loading` | Query pendente | Skeleton |
| `loaded` | `confidence_score` disponível | Tabela de pilares + limitações + recomendação |

### data-testid (novos)

| Seletor | Elemento |
|---|---|
| `briefing-method-section` | Container seção |
| `briefing-method-pilares-table` | Tabela de pilares |

---

## 8. BriefingNav

**Arquivo TO-BE:** `client/src/components/briefing/BriefingNav.tsx`
**Zona:** 2 (navegação por tabs)
**Fonte de dados:** Estático (5 tabs fixas)

### Labels visíveis

| Chave | Label PT-BR | Ordem |
|---|---|---|
| `tab_gaps` | "Gaps" | 1 |
| `tab_oportunidades` | "Oportunidades" | 2 |
| `tab_acoes` | "Ações" | 3 |
| `tab_impactos` | "Impactos" | 4 |
| `tab_metodologia` | "Metodologia" | 5 |

### Estados

| Estado | Condição | Comportamento |
|---|---|---|
| `tab_ativo` | Tab selecionada | Fundo primário + texto branco (ou underline) |
| `tab_inativo` | Tab não selecionada | Fundo transparente + texto muted |

### Invariantes

- Contadores opcionais ao lado do label: "Gaps (5)" / "Oportunidades (3)" etc.
- Tab default ao carregar: "Gaps" (primeira).

### data-testid (novos)

| Seletor | Elemento |
|---|---|
| `briefing-nav` | Container nav |
| `briefing-nav-tab-{slug}` | Tab individual (gaps/oportunidades/acoes/impactos/metodologia) |

---

## 9. ActionBar

**Arquivo TO-BE:** `client/src/components/briefing/ActionBar.tsx`
**Zona:** 0 (superior) + 3 (inferior sticky)
**Fonte de dados:** Estado do briefing (aprovado/pendente/gerando)

### Labels visíveis — Barra Superior (Zona 0)

| Chave | Label PT-BR | Ícone | Evidência |
|---|---|---|---|
| `btn_regenerar` | "Regenerar" | `RefreshCw` | BriefingV3:1015 |
| `btn_regenerar_loading` | "Gerando..." | `Loader2` (spin) | BriefingV3:1015 |
| `btn_corrigir` | "Corrigir" | `Edit3` | BriefingV3:1101 |
| `btn_mais_info` | "Mais Informações" | `MessageSquare` | BriefingV3:1105 |
| `btn_compartilhar` | "Compartilhar Resumo" | `Share2` | BriefingV3:1121 |
| `btn_anotacoes` | "Anotações da Equipe — Briefing" | — | StepComments (`:1172`) |

### Labels visíveis — Barra Inferior (Zona 3)

| Chave | Label PT-BR | Ícone | Evidência |
|---|---|---|---|
| `btn_historico` | "Histórico ({N})" | `History` | BriefingV3:634 |
| `btn_exportar_pdf` | "Exportar PDF" | `Download` | BriefingV3:1109 |
| `btn_aprovar` | "Aprovar Briefing" | `ThumbsUp` | BriefingV3:1097 |

### Estados

| Estado | Condição | Comportamento |
|---|---|---|
| `default` | Briefing gerado, não aprovado | Todos os botões habilitados |
| `loading_regenerar` | `isGenerating === true` | Botão "Regenerar" → "Gerando..." + spinner; demais disabled |
| `aprovado` | Briefing já aprovado | "Aprovar Briefing" disabled; "Regenerar" habilitado (cria nova versão) |
| `sem_briefing` | Nenhum briefing gerado | Apenas "Regenerar" (como "Gerar") visível |

### Invariantes

- **Handlers reusados** (NÃO reescritos): `handleApprove`, `handleGenerate`, `handleExportPDF`, `handleFeedbackSubmit`.
- State lifting: `isApproving`, `canApprove`, `briefing`, `feedbackMode` lifted ao container `BriefingSplitView`.
- `btn_compartilhar` disabled quando `briefingStructuredForShare` é null (sem structured).
- Confirmação de regeneração via `window.confirm` quando briefing já existe (BriefingV3:1001-1008).

### data-testid (preservados + novos)

| Seletor | Tipo | Elemento |
|---|---|---|
| `btn-regenerar-briefing` | **PRESERVADO** (`:1012`) | Botão regenerar |
| `btn-compartilhar-resumo` | **PRESERVADO** (`:1118`) | Botão compartilhar |
| `briefing-action-bar-top` | NOVO | Container barra superior |
| `briefing-action-bar-bottom` | NOVO | Container barra inferior |
| `btn-aprovar-briefing` | NOVO | Botão aprovar |
| `btn-corrigir-briefing` | NOVO | Botão corrigir |
| `btn-mais-info-briefing` | NOVO | Botão mais informações |
| `btn-exportar-pdf-briefing` | NOVO | Botão exportar PDF |

---

## 10. BriefingV3 (Host) — Feature Flag

**Arquivo:** `client/src/pages/BriefingV3.tsx` (existente, 1200 linhas)
**Rota:** `/projetos/:id/briefing-v3`

### Variantes (feature flag `BRIEFING_UI_VERSION`)

| Flag | Comportamento | Componente renderizado |
|---|---|---|
| `legacy` (default) | Monolito atual — markdown via `<Streamdown>` | `BriefingV3.tsx` byte-idêntico |
| `v2` | Split View — JSON structured | `BriefingSplitView.tsx` (novo container) |

### Estados do host

| Estado | Condição | Comportamento |
|---|---|---|
| `loading` | Queries pendentes | Skeleton (DashboardLayoutSkeleton ou inline) |
| `error` | Projeto não encontrado / forbidden | Mensagem de erro |
| `no_briefing` | `briefingContent` vazio E `briefingStructured` null | CTA "Gerar Briefing" |
| `legacy_render` | Flag=legacy E briefing existe | Markdown via Streamdown (AS-IS) |
| `split_render` | Flag=v2 E `briefingStructured` não-null | Split View (TO-BE) |
| `split_fallback` | Flag=v2 E `briefingStructured` null (98% dos projetos!) | Markdown via Streamdown (fallback — DP-01 P0) |

### Invariantes

- **7 data-testid PRESERVADOS** (E2E z17 depende):
  - `briefing-version-timestamp` (`:616`)
  - `version-history-row-{v}` (`:769`)
  - `version-history-reason-{v}` (`:782`)
  - `btn-toggle-reason-{v}` (`:807`)
  - `version-history-reason-full-{v}` (`:824`)
  - `btn-regenerar-briefing` (`:1012`)
  - `btn-compartilhar-resumo` (`:1118`)
- **Fallback (98%)** é o caminho MAIS exercitado. Deve ser testado PRIMEIRO.
- Flag `legacy` = monolito byte-idêntico em comportamento. Zero regressão.
- Flag `v2` = Split View. Ativado por query param `?ui=split` ou env `BRIEFING_UI_VERSION=v2`.

---

## 11. Componentes REUSADOS (NÃO reescrever)

| Componente | Arquivo | Uso no Split View |
|---|---|---|
| `BriefingReservationBadge` | `components/BriefingReservationBadge.tsx` | DecisionPanel (estado aprovado-com-ressalva) |
| `BriefingFreshnessBanner` | `components/BriefingFreshnessBanner.tsx` | Topo (banner de stale data) |
| `ShareBriefingModal` | `components/ShareBriefingModal.tsx` | ActionBar btn_compartilhar |
| `ApproveReservationModal` | `components/ApproveReservationModal.tsx` | ActionBar btn_aprovar (conf<85) |
| `StepComments` | `components/StepComments.tsx` | ActionBar btn_anotacoes |
| `ConfidenceBar` | `components/ConfidenceBar.tsx` | **NÃO reusado no DecisionPanel** (faixas diferentes). Preservado para outros consumers. |
| `AlertasInconsistencia` | inline em BriefingV3 | Movido para dentro do Split View |
| `FlowStepper` | `components/FlowStepper.tsx` | Pipeline steps (Zona 0) |
| `RetrocessoConfirmModal` | `components/RetrocessoConfirmModal.tsx` | Navegação regressiva |

---

## 12. Procedures tRPC consumidas (10 — contrato F3.1)

| Procedure | Linha | Componente consumidor |
|---|---|---|
| `getProjectStep1` | 915 | BriefingSplitView (project + briefingContent fallback) |
| `generateBriefing` | 1495 | ActionBar (Regenerar) |
| `approveBriefing` | 2586 | ActionBar (Aprovar — conf>=85) |
| `approveBriefingWithReservation` | 2720 | ActionBar (Aprovar — conf<85) |
| `getProgress` | 1187 | FlowStepper |
| `getRoundsSummary` | 1333 | (não usado no Split View) |
| `getBriefingInconsistencias` | 3708 | DecisionPanel + GapCard + contadores |
| `checkBriefingFreshness` | 2511 | BriefingFreshnessBanner + MethodSection |
| `getLiveBriefingSources` | 6295 | MethodSection (fontes respondidas/faltantes) |
| `dismissInconsistencia` | 2376 | (preservado, não movido) |

---

## 13. Princípios UX (spec UX-BRIEFING-C-V2)

1. **Structured-first** — consumir JSON, NÃO parsear markdown (decisão §7.1)
2. **Fallback gracioso** — 98% dos projetos sem structured → markdown via Streamdown (DP-01 P0)
3. **Labels canônicos** — sem emoji, sem prefixo, via `shared/source-type-labels.ts` (UX-LABELS-01/02)
4. **Rastreabilidade** — cada gap mostra fonte (`source_type`) + referência (`source_reference`)
5. **Transparência** — badge ⚠️ quando artigo citado é suspeito (`_hallucination_detected`)
6. **Reversibilidade** — feature flag permite rollback instantâneo para monolito
7. **Zero regressão** — 7 data-testid preservados, E2E z17 verde, handlers movidos (não reescritos)

---

## 14. Vinculadas

- **Decisões aprovadas:** C1 (faixas), C2 (sem parser), C3 (host), C4 (sem prefixo), UX-LABELS-01 (#1342), UX-LABELS-02 (#1346)
- **ADRs:** ADR-0034 (dead-code removal), ADR-010 (arquitetura 98%)
- **Issues:** #1344 (spec principal), #1342 (labels), #1346 (prefixo)
- **PRs:** #1354 (docs F3), #1345 (dead-code PR-1)
- **Testes dependentes:** `tests/e2e/z17-pipeline-completo.spec.ts` (CT-05..08), `client/src/lib/briefing-areas.test.ts`
- **Lições:** #72 (nunca parsear markdown para extrair dados)
