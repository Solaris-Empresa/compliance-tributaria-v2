# AS-IS / TO-BE — UX-BRIEFING-C-V2 (Redesign Split View do Briefing) · Issue #1344

**Versão:** **v5.0** (2026-06-03 — consolida TODAS as decisões da sessão + formaliza os **4 artefatos F3 no doc** (§F3): D2 decidida (ImpactsSection = `<Streamdown>` + âncora), Bloco 9 data-testid, ADR, Contrato tRPC, Fluxo E2E. Base: v4.0 [GRIP Manus]) · **Autor:** Claude Code · **Status:** ANÁLISE (não implementado) · aguarda `spec-aprovada` P.O. + despacho (RACI)
**Alvo:** `client/src/pages/BriefingV3.tsx` (1200 LOC · `@ts-nocheck` = **9 erros, causa única** `loadTempData()` untyped — §3/§8 R2) · rota `/projetos/:id/briefing-v3`
**Skill:** `impact-tree` (11 passos) · **Mockup:** imagem PNG anexa à #1344 (Manus) · **Entrega F3:** comentário #1344 ([#issuecomment-4612640300](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/1344#issuecomment-4612640300))

> ⚠️ Este documento é **análise de impacto**. Nenhuma linha de código foi alterada. A implementação só inicia após aprovação do P.O. + despacho formal.

**Changelog v1→v2 (Despacho 2):** C1 gauge "Grau de Completude" + faixas + alerta<80 · C2 sem parser · C3 `BriefingV3.tsx` · C4 GapCard sem prefixo · A1 `@ts-nocheck`=9 erros · A2/A4/A5 contrato preciso.
**Changelog v2→v3.0 (Auditoria Orquestrador):** §0 — resolução verificada dos 7 bugs · 4 falhas TO-BE · 6 PRs · D1-D4.
**Changelog v3.0→v4.0 (Auditoria GRIP Manus):** **§★ DE/PARA** (tabela + checklist + plano de testes mapeado) — dado novo: **98% dos projetos com `briefingStructured` NULL** (fallback markdown = caminho principal) · `_hallucination_detected` confirmado em 46/93 (Opção 0) · `shared/source-type-labels.ts` (G5) · estender `BriefingLite`→`BriefingGapFull` (G2/BUG-1) · 20 arquivos `@ts-nocheck` (BUG-3, fora de escopo) · **§★.4 mockup do Manus** (layout 4 zonas confirmado + 3 divergências MK-1/MK-2/MK-3 das decisões C1/C4/UX-LABELS-01 + zero data-testid). **§★ é a referência canônica de implementação.**
**Changelog v4.0→v5.0 (consolidação final):** **D2 DECIDIDA** (ImpactsSection = bloco fixo via `<Streamdown>` + âncora de nav, NÃO regex) · **D4** = criar `shared/source-type-labels.ts` no PR-0 · **§F3 nova** — os 4 artefatos F3 formalizados no doc (Contrato tRPC · Bloco 9 data-testid · ADR · Fluxo E2E 4 cenários). Pendentes só **D1/D5 + `spec-aprovada`**.

---

## ★ v4.0 — DE/PARA + Checklist + Plano de Testes (base: Auditoria GRIP Manus)

> Esta seção é a **referência canônica de implementação**. A tabela DE/PARA define cada transição AS-IS→TO-BE; o checklist torna cada transição verificável; o plano de testes garante que o TO-BE seja entregue **conforme a tabela**. §0 (v3) e §1+ permanecem como evidência detalhada.
>
> **Premissa central (Manus, SQL):** **4851/4944 projetos (98%) têm `briefingStructured = NULL`** → o **fallback markdown é o CAMINHO PRINCIPAL**, não edge case. Só 93 projetos têm `structured`; 46 desses têm `_hallucination_detected`.

### ★.1 — Tabela DE → PARA (como está → a mudança)

| # | Dimensão | DE (AS-IS — como está) | PARA (TO-BE — a mudança) | Evidência | Risco |
|---|---|---|---|---|---|
| DP-01 | **Render (caminho principal)** | markdown via `<Streamdown>` (`BriefingV3.tsx:1060`) | `briefingAdapter` → **fallback legado quando `result.mode === "legacy"` (98%)** (contrato canônico do adapter — `parseBriefingStructured` retorna `{ mode: "legacy" }`, NÃO `null`), idêntico ao monolito | 4851/4944 NULL | 🔴 |
| DP-02 | **Render (caminho structured)** | `structured` só usado no ShareModal (`:212`) | Split View consome `structured` em 9 componentes (93 projetos) | `getBriefingInconsistencias.structured` | 🟡 |
| DP-03 | **Estrutura do arquivo** | `BriefingV3.tsx` 1200 LOC monolito | `BriefingSplitView.tsx` + 9 componentes em `components/briefing/` | — | Classe C |
| DP-04 | **Type safety** | `@ts-nocheck` (`:1`) — 9 erros (causa: `loadTempData` untyped) | removido; `loadTempData<BriefingDraft>(...)`; tsc 0 | `usePersistenceV3:153` | 🔴 |
| DP-05 | **Gauge** | "Confiança" no markdown | DecisionPanel **"Grau de Completude do Diagnóstico"** + faixas (0-49 Crítico/50-79 Parcial/80-94 Adequado/95-100 Completo) + **alerta <80** | `confidence_score.nivel_confianca` | 🟡 |
| DP-06 | **Badge alucinação** | persistido no DB, **invisível na UI** (46/93) | GapCard exibe ⚠️ "Verificar artigo citado" via `gap._hallucination_detected` (**Opção 0, frontend-only Classe A**) | `validate-article-citations.ts:78` | 🟢 |
| DP-07 | **Label de fonte** | `SOURCE_TYPE_LABEL_V2` const não-export (`server:6644`) + **5 cópias** (1 server + 4 client) | **`shared/source-type-labels.ts`** (12 chaves) importado por server + 4 client + GapCard (precedente `shared/categoria-labels.ts`) | G5/BUG-2 | 🟡 |
| DP-08 | **Prefixo source_reference** | "Aplicação obrigatória: X" (dobrado) | sem prefixo (UX-LABELS-02 #1346) | — | 🟢 |
| DP-09 | **Tipo do gap (client)** | `BriefingLite` sem `source_type`/`_hallucination_detected`/`top_3_acoes` → `as any` | `BriefingGapFull` com todos os campos tipados | `briefing-areas.ts:93` | 🟡 |
| DP-10 | **Impactos** | 3 linhas hardcoded no markdown (`server:6836`) | `ImpactsSection.tsx` — bloco fixo via **`<Streamdown>` + âncora de nav** (D2 decidida; NÃO regex) | A7/G4/D2 | 🟡 |
| DP-11 | **MethodSection** | parte do markdown | consome **structured + `briefingContent` (rawMarkdown)** — exceção C2 | G6 | 🟡 |
| DP-12 | **Aprovação** | `handleApprove` inline (`:400`) + gate<85% + reservation | **movido (NÃO reescrito)** p/ container/ActionBar | `:400` | 🔴 |
| DP-13 | **PDF export** | `handleExportPDF` inline (`:446`) | **mantido intacto** (não migra; tech debt G7) | `:446` | 🟢 |
| DP-14 | **Feature flag** | inexistente | `BRIEFING_UI_VERSION` (default `legacy` até F5) | — | 🟢 |
| DP-15 | **Testes client** | **zero** | adapter tests (**fallback PRIMEIRO**) + render tests por componente | A6/G3 | 🔴 |
| DP-16 | **data-testid** | 7 existentes (`:616,769,782,807,824,1012,1118`) | 7 **preservados** + novos (Bloco 9) | §5.7 | 🟡 |
| DP-17 | **briefingContent → engine** | input read-only de `MatrizesV3:293`/`PlanoAcaoV3:808` (de query própria) | **NÃO tocado** | A5 | 🟢 |
| DP-18 | **Histórico/Inconsistências/Share/Auto-save** | inline | **preservados** no container (reuso de componentes) | — | 🟢 |
| DP-19 | **Parsing de `briefingStructured`** | coluna **TEXT double-encoded** `"\"{...}\""` (`JSON.stringify` em col TEXT, `server:2243`); `getBriefingInconsistencias:3708` já faz `typeof==="string"?JSON.parse:raw` | adapter consome `structured` **de `getBriefingInconsistencias` (já parseado)**, NÃO a coluna raw; parse defensivo (Lição #72 — duplo-parse) | `server:2243/3708` · `confidence_score`=OBJECT `{nivel_confianca:65,...}` no 5700001 | 🔴 |

### ★.2 — Checklist DE/PARA (cada transição verificável)

- [ ] **DP-01** Fallback markdown renderiza **idêntico ao monolito** para projeto `structured=NULL` (caminho de 98%)
- [ ] **DP-02** Split View renderiza as 4 zonas para projeto com `structured` válido (ex.: 5700001)
- [ ] **DP-03** `BriefingSplitView.tsx` + 9 componentes criados em `components/briefing/`; monolito preservado atrás do flag
- [ ] **DP-04** `@ts-nocheck` removido de BriefingV3; `loadTempData<BriefingDraft>` tipado; `tsc --noEmit` = 0
- [ ] **DP-05** Gauge exibe **"Grau de Completude do Diagnóstico"** (texto exato) + faixa correta + alerta quando <80
- [ ] **DP-06** GapCard exibe badge ⚠️ quando `gap._hallucination_detected === true`; ausente caso contrário
- [ ] **DP-07** `shared/source-type-labels.ts` criado (12 chaves); 5 cópias eliminadas; server + 4 client + GapCard importam dele
- [ ] **DP-08** GapCard exibe `source_reference` sem prefixo "Aplicação obrigatória:"
- [ ] **DP-09** `BriefingGapFull` tipado; zero `as any` no acesso a campos do gap
- [ ] **DP-10** `ImpactsSection` exibe os 3 eixos fixos via `<Streamdown>` + âncora de nav (D2 — não regex)
- [ ] **DP-11** `MethodSection` recebe structured **+** rawMarkdown (fórmula/limites do markdown)
- [ ] **DP-12** `handleApprove` movido sem reescrita: gate<85%→reservation; ≥85%→`/risk-dashboard-v4` (idêntico)
- [ ] **DP-13** `handleExportPDF` inline preservado byte-a-byte
- [ ] **DP-14** Flag `BRIEFING_UI_VERSION`: `legacy`=monolito, `split`=novo; default `legacy` até F5
- [ ] **DP-15** Adapter tests (fallback primeiro) + render tests por componente — todos PASS
- [ ] **DP-16** Os 7 data-testid existentes presentes (grep) + novos do Bloco 9
- [ ] **DP-17** `MatrizesV3`/`PlanoAcaoV3` geram riscos/planos após aprovação (briefingContent intacto)
- [ ] **DP-18** Histórico de versões, inconsistências, share modal, auto-save funcionam idênticos
- [ ] **DP-19** Adapter consome `structured` de `getBriefingInconsistencias` (já parseado); parse defensivo trata double-encoding sem `JSON.parse` sobre objeto (Lição #72); `confidence_score` lido como OBJECT (`.nivel_confianca`)

### ★.3 — Plano de Testes mapeado ao DE/PARA (assegura TO-BE = tabela)

> Prioridade invertida (Manus G3): **fallback (98%) testado primeiro.** Cada teste rastreia a linha DE/PARA que assegura.

| DP | Teste que assegura a transição | Tipo | Prioridade | Critério |
|---|---|---|---|---|
| **DP-01** | adapter `structured=null` → `mode:"markdown"`; render = Streamdown atual | Unit + E2E | **P0** | idêntico ao monolito (snapshot textual) |
| DP-02 | adapter `structured` válido → `mode:"split"` com gaps/top3/oport/confiança | Unit | P0 | shape completo |
| DP-02 | `structured` parcial (sem `top_3_acoes`) → fallback gracioso | Unit | **P0** | não lança |
| DP-03 | flag `legacy` → monolito byte-idêntico (E2E z17 CT-05..08) | E2E | P0 | verde |
| DP-04 | `tsc --noEmit` sem `@ts-nocheck`; `loadTempData<BriefingDraft>` | tsc | P0 | 0 erros |
| DP-05 | DecisionPanel: confidence 30→"Crítico", 65→"Parcial", 88→"Adequado", 98→"Completo"; <80→alerta; label exato | Render | P1 | 4 faixas + alerta + "Grau de Completude do Diagnóstico" |
| **TK-2/D5** | conf 82 → faixa "Adequado" SEM alerta visual, MAS aprovar → reservation modal (gate <85) + hint "aprovar exigirá justificativa" | Render + E2E | P1 | visual (80) ≠ gate (85) coerente e documentado |
| **TK-1** | DecisionPanel usa 4 faixas C1 (não as 3 do ConfidenceBar `>=85/70-84/<70`) | Render | P1 | boundary 49/79/94 correto |
| DP-06 | GapCard `_hallucination_detected=true`→badge; ausente→sem badge | Render + Smoke(5700001) | P1 | `briefing-gap-hallucination-badge-{i}` |
| DP-07 | grep: 0 cópias locais de SOURCE_TYPE_LABEL; todos importam `shared/source-type-labels` | grep/unit | P1 | 1 fonte de verdade |
| DP-08 | GapCard render: `source_reference` sem "Aplicação obrigatória:" | Render | P1 | texto sem prefixo |
| DP-09 | tsc: acesso a `gap.source_type`/`._hallucination_detected` sem `as any` | tsc | P1 | tipado |
| DP-10 | ImpactsSection render: 3 eixos fixos via `<Streamdown>` + âncora | Render | P2 | Financeiro/Operacional/Jurídico (D2) |
| DP-11 | MethodSection recebe rawMarkdown + structured | Render | P2 | fórmula visível |
| DP-12 | E2E aprovar: ≥85%→`/risk-dashboard-v4`; <85%→ApproveReservationModal; reservation persiste | E2E | **P0** | redirect + modal + banco |
| DP-13 | handleExportPDF gera HTML+print em ambos os modos | Smoke | P1 | PDF gerado |
| DP-14 | flag `split`+structured null→fallback; flag `legacy`→monolito | Integração + Smoke | P0 | rollback instantâneo |
| DP-15 | suíte adapter (3 fallback + 1 split) + render tests por componente | Unit | P0 | 100% PASS |
| DP-16 | grep dos 7 data-testid existentes (0 removidos) + novos | grep/E2E | P1 | presentes |
| DP-17 | **Smoke pós-F5:** aprovar com Split View → `MatrizesV3` gera riscos + `PlanoAcaoV3` gera planos | Smoke (Manus) | **P0** | pipeline downstream intacto |
| DP-18 | viewingVersion alterna versões; share modal recebe structured; auto-save persiste | Integração | P1 | sem regressão |
| **DP-19** | adapter: input objeto→usa direto; input string (double-encoded)→`JSON.parse` (1×, pois server já desfez 1 nível); **nunca `JSON.parse` sobre objeto** (Lição #72); `confidence_score` OBJECT→`.nivel_confianca` | Unit | **P0** | sem `[object Object]`; 5700001→65 "Parcial" |

**Cenários smoke runtime obrigatórios (Manus, REGRA-ORQ-34 Protocolo 4):**
1. Projeto **5700001** (structured + `_hallucination_detected`) → Split View + badge ✅
2. Projeto **5790001** (structured, 6 gaps) → 6 GapCards ✅
3. Projeto **`structured=NULL`** (qualquer — 98% dos casos) → **fallback markdown idêntico ao monolito** ✅
4. Mobile 375px → nav vira tabs, sem overflow ✅

### ★.4 — Mockup do Manus (`mockup-ux-briefing-c-v2.html`) — layout confirmado + divergências a corrigir

> Mockup = projeto **5700001** (tem `structured` → modo **split**, o caso de 2%). O **fallback markdown (98%)** NÃO é mostrado no mockup — continua sendo o caminho mais crítico a validar.

**Layout confirmado (4 zonas):**
- **Zona 0 — Header + ActionBar superior:** breadcrumb · título · badge "Versão 2" · timestamp · **ActionBar superior** (Regenerar · Corrigir · Mais Informações · Compartilhar · **Anotações (N)**) · pipeline steps (Projeto › Questionário › **3 Briefing** › 4 Riscos › 5 Plano).
- **Zona 1 — Sidebar fixa esquerda (`w-72`):** Gauge · badge "Nível de Exposição" (● ALTO + Score) · Contadores (Gaps 5 · Ações 3 · Oportunidades 3 · Recomendações 4) · Resumo Executivo.
- **Zona 2 — Conteúdo tabbed:** BriefingNav 5 tabs `Gaps(5) · Ações Prioritárias(3) · Oportunidades(3) · Impactos · Método` · GapCards (título · badges fonte/urgência/**alucinação** · linha "Ref:").
- **Zona 3 — ActionBar inferior sticky:** "Ver Histórico (N)" · **Exportar PDF** · **✓ Aprovar Briefing**.
- **Nota:** ActionBar é **dividida** (superior: editar/compartilhar; inferior: exportar/aprovar) — diverge do "Zona 4 única" da issue. Aceitável; registrar.

**🔴 Divergências do mockup vs decisões JÁ APROVADAS (implementação segue a DECISÃO, não o mockup):**

| # | Mockup mostra | Decisão aprovada | Ação na implementação |
|---|---|---|---|
| MK-1 | Gauge **"Confiança do Diagnóstico"** + "Baixa" (vermelho) para 65% | **C1 / FEAT-COMPLETUDE-01:** "Grau de Completude do Diagnóstico" + faixa **"Parcial"** (50-79) para 65% + alerta <80 | DecisionPanel usa **label e faixa de C1** (DP-05), NÃO "Confiança/Baixa" |
| MK-2 | Gap 2: `Ref: Aplicação obrigatória: obrigação cadastral IBS/CBS` (**prefixo dobrado**) | **C4 / UX-LABELS-02 (#1346):** sem prefixo "Aplicação obrigatória:" | GapCard exibe só o assunto (DP-08) |
| MK-3 | Badges de fonte com **emoji** + "🔮 Diagnóstico SOLARIS" | **UX-LABELS-01 (mergeado #1342):** sem emoji · `solaris` = "Questionário de conformidade SOLARIS" · `questionario` = "Declaração do contribuinte" | GapCard usa o map de `shared/source-type-labels.ts` (DP-07), NÃO os labels/emoji do mockup |
| MK-4 | **Badge alucinação presente** em Gaps 1+2 ("⚠️ Verificar artigo citado") | ✅ alinha com Opção 0 (DP-06) — campo `_hallucination_detected` existe (46/93) | **Confirma DP-06** — implementar o badge |
| MK-5 | **Zero `data-testid`** no HTML | REGRA-ORQ-16 exige inventário | Bloco 9 (§3 do comentário #1344) é **derivado na implementação**, não vem do mockup |

> **Conclusão:** o mockup é a referência **visual/de layout**, mas MK-1/MK-2/MK-3 são **regressões de decisões já mergeadas** — se copiados literalmente, violam C1/C4/UX-LABELS-01. A implementação segue as decisões; o mockup informa só a disposição espacial. MK-4 valida o badge de alucinação; MK-5 confirma que o Bloco 9 é responsabilidade da implementação.

### ★.5 — Críticas técnicas do Manus ao mockup (riscos adicionais — verificados)

| # | Risco técnico | Evidência (verificada) | Ação |
|---|---|---|---|
| **TK-1 🔴** | **`ConfidenceBar` tem faixas incompatíveis com C1 — breaking change não documentada** | `ConfidenceBar.tsx:27-55` = **3 faixas** `>=85 alta / 70-84 média / <70 baixa`. C1 = **4 faixas** `0-49 Crítico / 50-79 Parcial / 80-94 Adequado / 95-100 Completo` | DecisionPanel **NÃO reusa a lógica de faixa** do ConfidenceBar — implementa as 4 faixas de C1 (ou parametriza o componente). Reuso só do visual (gauge/barra). Adicionar como risco no plano de PRs (F2). |
| **TK-2 🔴 (D5)** | **3 thresholds divergentes**: ConfidenceBar `85/70` · C1 alerta visual `<80` · gate server aprovação `<85` (`routers-fluxo-v3.ts:2610`) | conf 80-84 → faixa "Adequado" (sem alerta) MAS aprovação ainda exige ressalva (<85) → UX contraditória | **D5 (decisão P.O.):** alerta visual `<80` = "atenção"; gate `<85` = "exige justificativa" — documentar ambos + hint em 80-84 "aprovar exigirá justificativa". **NÃO mexer no gate server (85).** |
| **TK-3 🟡** | **`shared/source-type-labels.ts` (DP-07/G5) ainda NÃO existe** | grep: 0 em `shared/`; 5 cópias (server + 4 client) | **Criar no PR-0 (F0)**, ANTES do PR-2 (F2) onde GapCard consome. Sequenciamento obrigatório. |
| **TK-4 🟡** | **ActionBar dividida (sup./inf.) → state lifting** | mockup: `handleApprove`/Exportar inferior; Regenerar/Corrigir superior — hoje no mesmo bloco | `isApproving`/`canApprove`/`briefing` **lifted ao container** ou via props. Documentar no Bloco 9 / contrato (DP-12). |
| **TK-5 🟢** | **Mockup do fallback (98%) ausente** | mockup = só projeto 5700001 (split) | Sugestão: 2º mockup simplificado (Streamdown + ActionBar preservada) para o modo fallback. **Pendência Manus.** |
| **MK-4+ ✅** | **SQL confirma:** 5700001 tem `_hallucination_detected:true` nos gaps **0 e 1** | mockup exibe o badge nesses 2 gaps | **P.O. validou Opção 0 implicitamente** ao aprovar o mockup com o badge → D1 = implementar (forte evidência). |

> **Governança:** `FLOW_DICTIONARY.md` e `UX_DICTIONARY.md` **atualizados** (informado pelo P.O.) → Gate UX (REGRA-ORQ-09/13) tem fonte de verdade corrente para a rota/fluxo do briefing.

---

## 0. Auditoria do Orquestrador (v3.0) — resolução VERIFICADA dos 7 bugs

> Cada item resolvível por código foi **verificado** (REGRA-ORQ-27), não só aceito. SQL (estado dos dados) fica com Manus (RACI). Onde a auditoria divergiu do meu schema-read, reconciliei com o mecanismo real.

### 0.1 Snapshot AS-IS → TO-BE (corrigido)
| Dimensão | AS-IS | TO-BE | Risco v3 |
|---|---|---|---|
| Arquivo | `BriefingV3.tsx` 1200 LOC monolito | `BriefingSplitView.tsx` + 9 componentes | Classe C |
| Render | `<Streamdown>` sobre markdown | `briefingStructured` (JSON) + fallback markdown | 🟡 |
| TypeScript | `@ts-nocheck` (9 erros, causa única `loadTempData`) | F0 remove + tipa | 🔴 (de-riscado) |
| Procedures tRPC | 10, sem `getBriefing` única | mesmas 10, zero alteração | ✅ |
| `structured` | só no ShareModal (L212) | 9 componentes | 🟡 |
| Aprovação | `handleApprove` L400 + gate<85% + reservation | movido (não reescrito) p/ container | 🔴 |
| PDF | `handleExportPDF` L446 inline | intacto | ✅ |
| Feature flag | inexistente | `BRIEFING_UI_VERSION` (default legacy até F5) | ✅ |
| Fallback null | inexistente (tela vazia) | `briefingAdapter` → Streamdown | 🔴→mitigado |
| Testes client | zero (A6) | render tests + adapter tests | 🔴 gap |
| `_hallucination_detected` | **existe no banco** (pós-parse), não no Zod | GapCard lê direto + type annotation | ✅ (era 🔴) |
| `briefingContent` input engine | MatrizesV3:293/PlanoAcaoV3:808 (de query própria) | não tocado | ✅ baixo (era 🔴) |

### 0.2 Resolução dos bugs (BUG-F1..F7)
| Bug | Orig | Status v3 | Resolução verificada (arquivo:linha) |
|---|---|---|---|
| **F1** hallucination | 🔴 | ✅ resolvido | Campo = **`_hallucination_detected`** (underscore) + `_hallucinated_articles`, adicionado por `flagHallucinatedCitations` (`server/lib/validate-article-citations.ts:78`) **pós-parse Zod**, persistido via `JSON.stringify(structured)` (`server/routers-fluxo-v3.ts:2243`). → **existe no banco** (memo certo) E **não no Zod schema** (A3 certo) — sem contradição. GapCard consome `gap._hallucination_detected` direto. **Frontend-only + type annotation; NÃO precisa mudar `ai-schemas.ts`** (campo é pós-parse, não validado). |
| **F4** confidence_score | 🔴 | ✅ resolvido | **SQL Manus confirmou: OBJECT** `{nivel_confianca:65, limitacoes[], recomendacao}` no proj 5700001 (= schema `ai-schemas.ts:178`). Gauge usa `.nivel_confianca`. **+ NOVO (DP-19): `briefingStructured` é double-encoded** (`JSON.stringify` em col TEXT, server:2243) — adapter consome de `getBriefingInconsistencias:3708` (já parseado) com parse defensivo (Lição #72). 5700001=65 → "Parcial" → path do reservation modal (<85%). |
| **F5** briefingContent input | 🔴 | ✅ baixo | `MatrizesV3.tsx:293` (`project`) + `PlanoAcaoV3.tsx:808` (`proj`) leem de **query tRPC própria (banco)**, NÃO do state do BriefingV3. Redesign não toca banco/geração → **zero risco**. Ramo P0 da auditoria não se aplica. Smoke pós-F5 mesmo assim (Falha TO-BE 4). |
| **F2** SOURCE_TYPE_LABEL dup | 🟡 | aceito | GapCard **reusa** o map 11-chaves dos 4 clients (NÃO cria 5ª cópia). `shared/` = housekeeping (D4). |
| **F3** ImpactsSection | 🟡 | aceito | A "Impactos" do markdown atual JÁ é **bloco pedagógico fixo** (`buildBriefingMarkdownV2` §8 — Financeiro/Operacional/Jurídico hardcoded). Hardcode no componente = **fiel ao comportamento atual** (não é UX enganosa nova). D2. |
| **F6** zero teste client | 🟡 | aceito | Render tests por componente com mock do proj 5700001 (PLANO-TESTES). |
| **F7** line numbers `~` | 🟡 | ✅ confirmado | `handleResolverInconsistencia:248` · `handleGenerate:322` · `handleApprove:400` · `handleExportPDF:446` · `handleFeedbackSubmit:525` · `handleCorrigirInconsistencia:538` |

### 0.3 Falhas TO-BE (aceitas)
1. `React.memo` em GapCard/PriorityCards/DecisionPanel + `useMemo` nos dados derivados do adapter.
2. Tipo explícito do adapter: `type BriefingViewData = { mode:"split"; gaps; top3; oportunidades; recomendacoes; confianca } | { mode:"markdown"; markdown }`.
3. **Separar F3 e F4 em PRs distintos** → 6 PRs.
4. DoD F5 inclui smoke de geração de **riscos + planos** pós-aprovação com Split View ativo.

### 0.4 Plano de PRs revisado (6 PRs)
`PR-0` F0 remove `@ts-nocheck` **+ cria `shared/source-type-labels.ts`** (TK-3) → `PR-1` F1 adapter+tipo+tests → `PR-2` F2 componentes (DecisionPanel com **4 faixas C1, não reusa faixa do ConfidenceBar** — TK-1)+memo+render tests → `PR-3` F3 flag+container **sem** handlers (**lift `isApproving`/`canApprove`/`briefing`** — TK-4) → `PR-4` F4 fiação handlers (maior risco, isolado) → `PR-5` F5 flip+ADR+smoke. F0-F2 não tocam o caminho default.

### 0.5 Decisões P.O. (D1-D4) — recomendação v3 verificada
| # | Decisão | Recomendação v3 |
|---|---|---|
| **D1** | badge hallucination | **Implementar (Opção A)** — dado já existe (`_hallucination_detected`); frontend-only + type annotation. NÃO mudar Zod (campo é pós-parse). |
| **D2** | ImpactsSection | ✅ **DECIDIDA (P.O.):** bloco fixo renderizado via `<Streamdown>` (reuso do renderer) **+ âncora de navegação** — NÃO regex. Mantém os 3 eixos fixos (Financeiro/Operacional/Jurídico) com markdown consistente. |
| **D3** | F3+F4 | **Separar (Opção B)** — 6 PRs, rollback granular |
| **D4** | SOURCE_TYPE_LABEL | **Criar `shared/source-type-labels.ts` no PR-0/F0** (G5/TK-3) — antes do F2; elimina as 5 cópias |
| **D5** | threshold confiança (TK-2) | alerta visual `<80` = "atenção" · gate aprovação `<85` = "exige justificativa" (server inalterado) · hint em 80-84. **Decisão P.O. para confirmar/ajustar.** |

---

## 1. Auto-auditoria das técnicas (impact-tree)

| Passo | Técnica | Status | Evidência |
|---|---|---|---|
| 1 | ast-grep semântico | ✅ | ast-grep 0.42.1 disponível; padrões de tRPC/handlers mapeados |
| 2 | Dead-read (knip) | 🟡 parcial | knip 6.14.2 disponível; não há campo persistido novo (refactor de view) |
| 3 | Issues pré-existentes | ✅ | #1344 (esta) · #793 (@ts-nocheck BriefingV3) · #767 (share) · #59 (retrocesso) |
| 4 | Grep incluindo testes | ✅ | 16+ test files mapeados (§5.5) |
| 5 | Grep .sql/.md/.json | ✅ | 5 ADRs (§5.6) · sem .sql (frontend) · sem mockup .html |
| 6 | PDF/email/templates | ✅ | `handleExportPDF` é **inline** (markdown→HTML→print), NÃO usa `generateDiagnosticoPDF` |
| 7 | Snapshots .snap | ✅ | Briefing usa `toContain()`, não `.snap` — zero snapshots a quebrar |
| 8 | LOC reais | ✅ | BriefingV3.tsx = **1200 LOC** · routers-fluxo-v3.ts = 7007 LOC |
| 9 | ADRs + bump | ✅ | §7.4 — refactor de view: **ADR novo leve** (decomposição), sem bump de contrato |
| 10 | Writers/readers | ✅ | §6 — contrato de dados (markdown + structured) |
| 11 | Auto-auditoria final | ✅ | §11 |

**Cobertura estimada:** 🟢 **~92%** — pendência única: mockup HTML (Manus) + confirmação de 3 line numbers aproximados (marcados `~`).

---

## 2. Classificação de impacto (REGRA-ORQ-24)

**Classe C — mudança estrutural.** Justificativa medida (não palpite):
- Alvo de **1200 LOC** com **`@ts-nocheck`** (refactor transversal de view monolítica)
- ~10 componentes novos propostos + adapter de dados
- Toca runtime crítico (`BriefingV3` está na lista REGRA-ORQ-20: BriefingV3 · generateBriefing)
- Preserva 10 procedures tRPC + 11 componentes filhos + fluxo de aprovação (cascata REGRA-ORQ-14)

→ Exige: AS-IS/TO-BE (este) + PLANO-TESTES + CHECKLIST-ACEITE + **ADR** + feature flag + rollback em N níveis (REGRA-ORQ-20).

---

## 3. Risco de regressão por gravidade

| Gravidade | Item | Por quê |
|---|---|---|
| 🔴 Crítico | **Fluxo Aprovar Briefing** (`handleApprove` BriefingV3:~400 + gate conf<85% + `approveBriefing`/`approveBriefingWithReservation` + navegação `/risk-dashboard-v4`) | Quebra = usuário não avança o pipeline. Cascata REGRA-ORQ-14. |
| 🔴 Crítico | **`@ts-nocheck`** em arquivo de 1200 LOC — **medido: 9 erros, causa única** `loadTempData()` retorna `{}` untyped (BriefingV3:155,163-166,306,309-310) | Refatorar sem types ativos esconde erros (2 crashes P0 históricos #792/#793); **F0 de-riscado** — tipar `loadTempData` em `usePersistenceV3` resolve os 9 |
| 🔴 Crítico | **Regenerar / Corrigir / Mais Informações** (`handleGenerate` + `correction`/`complement`) | Quebra = perde capacidade de iterar o briefing |
| 🟡 Visível | **Export PDF inline** (`handleExportPDF` BriefingV3:446-523) | Implementação própria markdown→HTML→print; não reutilizável |
| 🟡 Visível | **Inconsistências** (`AlertasInconsistencia` + `dismissInconsistencia` + `handleCorrigirInconsistencia`) | Quebra = some o alerta jurídico |
| 🟡 Visível | **Histórico de versões** (inline BriefingV3:732-836 + 5 `data-testid`) | E2E/testes dependem dos testids |
| 🟡 Visível | **Auto-save** (`useAutoSave`/`usePersistenceV3`) + **ResumeBanner** + **FreshnessBanner** | Estado efêmero; quebra silenciosa (Lição #86) |
| 🟡 Visível | **Share WhatsApp** (`ShareBriefingModal` + `briefingStructuredForShare`) | Consome `structured` — já é o padrão do TO-BE |
| 🟢 Cosmético | Stepper, badges, ConfidenceBar | Apresentação pura |

---

## 4. Árvore de impacto (cascata)

```
BriefingV3.tsx (1200 LOC, @ts-nocheck)  ◄── rota /projetos/:id/briefing-v3 (App.tsx)
│
├─ ENTRADA (navegação para cá):
│   ├─ QuestionarioV3.tsx · QuestionarioCNAE.tsx (após concluir → briefing-v3)
│   ├─ FlowStepper.tsx · DiagnosticoStepper.tsx (etapa "Briefing")
│   └─ MatrizesV3.tsx · ProjetoDetalhesV2.tsx (botão voltar)
│
├─ DADOS (10 procedures fluxoV3 — server/routers-fluxo-v3.ts):
│   ├─ getProjectStep1 (915)  ├─ generateBriefing (1495) → {briefing(md), structured(JSON), llmRetries}
│   ├─ approveBriefing (2586) ├─ approveBriefingWithReservation (2720)
│   ├─ getProgress (1187)     ├─ getRoundsSummary (1333)
│   ├─ getBriefingInconsistencias (3708) → {inconsistencias, structured(JSON), confidenceScore}
│   ├─ checkBriefingFreshness (2511) ├─ getLiveBriefingSources (6295)
│   └─ dismissInconsistencia (2376)
│
├─ RENDER ATUAL: markdown string via <Streamdown> (BriefingV3:1060)
│   └─ markdown produzido por buildBriefingMarkdownV2 (server:6656) — 12 seções (§6.2)
│
├─ COMPONENTES FILHOS (11):
│   ResumeBanner · BriefingFreshnessBanner · AlertasInconsistencia · ShareBriefingModal ·
│   ApproveReservationModal · BriefingReservationBadge · StepComments (Anotações) ·
│   ConfidenceBar · FlowStepper · RetrocessoConfirmModal · Streamdown
│
├─ SAÍDA (navegação a partir daqui):
│   ├─ Aprovar → /risk-dashboard-v4 (status → matriz_riscos; SEM auto-gen de riscos)
│   └─ Corrigir Inconsistência → /questionario-v3?revisao=true&pergunta=…
│
└─ TESTES (16+): briefing-markdown-v2.test (26, server) · briefing-areas.test (client) ·
    routers-fluxo-v3-etapas2-5.test · E2E z17-pipeline-completo.spec (CT-05..08)
```

---

## 5. Consumers reais (lista canônica · file:line)

### 5.1 Rota + navegação de entrada
- `client/src/App.tsx` — import + `<Route path="/projetos/:id/briefing-v3" component={BriefingV3} />`
- `client/src/components/FlowStepper.tsx` · `DiagnosticoStepper.tsx` — etapa "Briefing"
- `client/src/pages/QuestionarioV3.tsx` · `QuestionarioCNAE.tsx` — navegam para briefing-v3 após concluir
- `client/src/pages/MatrizesV3.tsx` · `ProjetoDetalhesV2.tsx` · `PlanoAcaoV3.tsx` · `FormularioProjeto.tsx` — referências de navegação

### 5.2 Contrato tRPC (10 procedures — `server/routers-fluxo-v3.ts`)
> **A2 — não existe procedure `getBriefing` única.** `structured` (JSON) ← `getBriefingInconsistencias.structured` (L3764); `briefingContent` (markdown) ← `getProjectStep1` (L915); ambos ← `generateBriefing` na (re)geração (L2360).

| Procedure | Linha | Input | Output relevante |
|---|---|---|---|
| getProjectStep1 | 915 | `{projectId}` | project + `briefingContent` + answers + `diagnosticCompleteness` |
| generateBriefing | 1495 | `{projectId, allAnswers[], correction?, complement?}` | **`{briefing: markdown, structured: JSON, llmRetries}`** (L2360) |
| approveBriefing | 2586 | `{projectId, briefingContent}` | status→`matriz_riscos`; **gate conf<85% → erro `CONFIDENCE_BELOW_THRESHOLD`** |
| approveBriefingWithReservation | 2720 | `{projectId, briefingContent, predefinedReason, freeReason(20-1000)}` | persiste `approval_reservation` |
| getProgress | 1187 | `{projectId}` | `{progress, answers[]}` |
| getRoundsSummary | 1333 | `{projectId}` | resumo de rounds por CNAE |
| getBriefingInconsistencias | 3708 | `{projectId}` | `{inconsistencias[], structured: JSON(L3764), confidenceScore, approvalReservation}` |
| checkBriefingFreshness | 2511 | `{projectId}` | `{hasSnapshot, diverged, diffs[], snapshot}` |
| getLiveBriefingSources | 6295 | `{projectId}` | `{answered[], missing[]}` |
| dismissInconsistencia | 2376 | `{projectId, perguntaOrigem, motivo?}` | move p/ `dismissed_inconsistencias` |

### 5.3 Componentes filhos (file:line de definição)
`ResumeBanner` (components/ResumeBanner.tsx) · `BriefingFreshnessBanner` (BriefingFreshnessBanner.tsx) · `AlertasInconsistencia`+`InconsistenciaBadge` (AlertasInconsistencia.tsx) · `ShareBriefingModal` (ShareBriefingModal.tsx) · `ApproveReservationModal` (ApproveReservationModal.tsx) · `BriefingReservationBadge` (BriefingReservationBadge.tsx) · `StepComments` (StepComments.tsx — "Anotações da Equipe") · `ConfidenceBar` (ConfidenceBar.tsx) · `FlowStepper` (FlowStepper.tsx) · `RetrocessoConfirmModal` (RetrocessoConfirmModal.tsx) · `Streamdown` (MarkdownRenderer.tsx)

### 5.4 Tipos compartilhados (contratos)
- `BriefingStructuredSchema` (Zod) — `server/ai-schemas.ts:178` — `{nivel_risco_geral, resumo_executivo, principais_gaps[], top_3_acoes[], oportunidades[], recomendacoes_prioritarias[], inconsistencias[], confidence_score}`
- `BriefingMarkdownMeta` — `server/routers-fluxo-v3.ts:6483`
- `ConfiancaBreakdown` — `server/lib/calculate-briefing-confidence.ts`
- `PredefinedReason` — `client/src/components/ApproveReservationModal.tsx:28`
- `ApprovalReservation` — `client/src/components/BriefingReservationBadge.tsx`
- `BriefingArea` — `client/src/lib/briefing-areas.ts`

### 5.5 Testes (16+ — todos consumers a preservar)
- **Server (não afetados — markdown intacto):** `briefing-markdown-v2.test.ts` (26 casos), `briefing.test.ts`, `briefing-quality.test.ts`, `briefing-confidence-signals.test.ts`, `briefing-fingerprint.test.ts`, `calculate-briefing-confidence.test.ts`, `briefing-sanitizer.test.ts`, `bug-briefing-cnae-restriction.test.ts`, `bug-briefing-credito-presumido.test.ts`, `routers-fluxo-v3-etapas2-5.test.ts`, `briefing-adr0018-validation.test.ts`, `briefing-context-injection.test.ts`, `routers-briefing-engine.test.ts`, `sprint-v64-v65-e2e.test.ts`
- **Client (a revisar):** `client/src/lib/briefing-areas.test.ts` (share areas)
- **E2E (RISCO):** `tests/e2e/z17-pipeline-completo.spec.ts` — CT-05..08 navega `/briefing-v3` (L328) e assere `textContent.includes("Resumo"/...)` → **o Split View deve preservar esses textos de seção**

### 5.6 ADRs (frontend de view — sem bump de contrato)
- ADR-0018 (context injection) · ADR-0016 (completude/confiança) · ADR-0031 (imutabilidade snapshot) · ADR-0030 (SOLARIS canônico) · ADR-010 (arquitetura 98%) — **nenhum governa a camada de apresentação** → refactor não viola nenhum.

### 5.7 data-testid existentes (PRESERVAR — E2E/testes dependem)
`briefing-version-timestamp` (616) · `version-history-row-{v}` (769) · `version-history-reason-{v}` (782) · `btn-toggle-reason-{v}` (807) · `version-history-reason-full-{v}` (824) · `btn-regenerar-briefing` (1012) · `btn-compartilhar-resumo` (1118)

---

## 6. AS-IS — contrato de dados (a camada que importa)

### 6.1 Render atual = MARKDOWN string
- `briefing` (state, BriefingV3:120) = `result.briefing` de `generateBriefing` (BriefingV3:364) = output de `buildBriefingMarkdownV2`
- Renderizado por `<Streamdown>{displayContent}</Streamdown>` (BriefingV3:1060) — markdown puro
- **`structured` (JSON) JÁ disponível** mas hoje só usado no share (`briefingStructuredForShare = inconsistenciasData.structured`, BriefingV3:212 → ShareModal:1183)

### 6.2 Estrutura do markdown (buildBriefingMarkdownV2 — server:6656)
12 blocos, vários **condicionais**: (1) cabeçalho · (2) banner conf<85% [cond] · (3) Top 3 Ações [cond: gaps≥3] · (4) Resumo Executivo · (5) Gaps `### Gap N` · (6) Oportunidades · (7) Recomendações · (8) Impactos · (9) Inconsistências [cond] · (10) Limites + "Como calculamos a Confiança" · (11) Como ler · (12) rodapé.

### 6.3 Writers/readers do briefing
- **Writer:** `generateBriefing` grava `briefingContent` (markdown) + `briefingStructured` (JSON) em `projects` (server:2237-2243)
- **Readers:** `getProjectStep1` (briefingContent), `getBriefingInconsistencias` (structured), cliente render (markdown)

---

## 7. TO-BE — Split View (Conceito C v2)

### 7.1 🔑 Decisão arquitetural central (maior redução de risco)
**Consumir `structured` (JSON) — NÃO parsear markdown.** A issue #1344 (regra 5) propõe "parser de markdown → seções". **Rejeitado:** o JSON estruturado (`BriefingStructuredSchema`) já existe no retorno de `generateBriefing.structured` e `getBriefingInconsistencias.structured`, e já é consumido no share. Construir um parser de markdown seria reintroduzir fragilidade (Lição #72-style) e duplicar a verdade. As zonas estruturadas (Gaps, Oportunidades, Top 3, Confiança, Inconsistências) leem direto do JSON; o markdown permanece só como **fallback** (§9.2) e fonte do PDF inline.

### 7.2 Arquitetura de componentes (novos em `client/src/components/briefing/`)
| Componente | Zona | Fonte de dados |
|---|---|---|
| `BriefingSplitView.tsx` | container | orquestra; mantém os 10 hooks tRPC atuais |
| `DecisionPanel.tsx` | Zona 1 (topo fixo) | **C1:** gauge "Grau de Completude do Diagnóstico" ← `confidence_score.nivel_confianca` (0-100) + faixa qualitativa (0-49 Crítico/50-79 Parcial/80-94 Adequado/95-100 Completo) + **alerta <80** · `nivel_risco_geral` (badge exposição) · counts · versão. (`ConfidenceBar.tsx:7` já lê esse campo) |
| `PriorityCards.tsx` | Zona 2 | `structured.top_3_acoes[]` |
| `BriefingNav.tsx` | Zona 3 nav | índice (Gaps/Oport/Ações/Impactos/Método) |
| `GapCard.tsx` | Zona 3 | `structured.principais_gaps[]` {gap, causa_raiz, evidencia_regulatoria, urgencia, source_type(7), source_reference} · **C4:** `source_reference` sem prefixo "Aplicação obrigatória:" · label de fonte via map 11-chaves (A4 — `SOURCE_TYPE_LABEL_V2` não exportado) · **badge alucinação SEM dado (A3 → P1)** |
| `OpportunityCard.tsx` | Zona 3 | `structured.oportunidades[]` |
| `ActionsList.tsx` | Zona 3 | `structured.recomendacoes_prioritarias[]` |
| `ImpactsSection.tsx` | Zona 3 | bloco fixo |
| `MethodSection.tsx` | Zona 3 | `structured.confidence_score` + `confiancaBreakdown` |
| `ActionBar.tsx` | Zona 4 | **reusa handlers atuais** (não reescreve) |
| `lib/briefingAdapter.ts` | adapter | normaliza `structured` → props; fallback p/ markdown |

**Reuso obrigatório (NÃO reescrever):** `ApproveReservationModal`, `ShareBriefingModal`, `AlertasInconsistencia`, `BriefingFreshnessBanner`, `ResumeBanner`, `StepComments`, `BriefingReservationBadge`, `ConfidenceBar`, `RetrocessoConfirmModal`, `FlowStepper`. Todos os handlers (`handleApprove`, `handleGenerate`, `handleExportPDF`, etc.) são **movidos para `BriefingSplitView`, não reescritos**.

### 7.3 Fases (F0–F5) — incrementais, cada uma verde no CI

| Fase | Escopo | Risco | Reversível |
|---|---|---|---|
| **F0** | Pré-passo: remover `@ts-nocheck` de BriefingV3 (issue #793) — base tipada para o refactor | 🟡 | sim (PR isolado) |
| **F1** | `briefingAdapter.ts` + testes unitários (structured→props, fallback markdown). **Zero UI.** | 🟢 | sim |
| **F2** | Componentes presentacionais (DecisionPanel, GapCard, etc.) **sem fiação** — Storybook/render isolado | 🟢 | sim |
| **F3** | `BriefingSplitView` atrás de **feature flag** (`?ui=split` ou env); monolito intacto como default | 🟡 | **flag** |
| **F4** | Fiar ações (mover handlers); preservar 7 data-testid + textos de seção (E2E) | 🔴 | **flag** |
| **F5** | Flip do flag para default + validação Manus em 3 cenários; monolito vira fallback 1 sprint | 🔴 | **flag instantâneo** |

### 7.4 ADR
**Novo ADR leve (ADR-00XX) — "BriefingV3 Split View + consumo de briefingStructured".** Não há bump de contrato (procedures inalteradas). Registra: (a) decisão de consumir JSON estruturado vs parser markdown, (b) decomposição em componentes, (c) feature flag + fallback. ADRs 0016/0018/0030/0031/010 referenciados (não alterados).

---

## 8. Matriz de Riscos + Mitigação

| # | Risco | Sev | Prob | Mitigação | Detecção |
|---|---|---|---|---|---|
| R1 | Quebra do fluxo Aprovar (gate conf<85% + reservation + navegação) | 🔴 | Média | Mover handler intacto (não reescrever); test contract do gate; E2E aprovação | E2E z17 CT-08 + teste do gate |
| R2 | `@ts-nocheck` esconde erro de tipo no refactor | 🔴 | Alta | **F0 remove @ts-nocheck antes** (#793); tsc 0 obrigatório por fase | tsc por fase |
| R3 | `structured` null em briefings legados → tela vazia | 🔴 | Média | **Fallback markdown** (§9.2): se structured ausente/malformado, renderiza Streamdown atual | adapter test + cenário legado |
| R4 | Perda de seção exigida (Inconsistências, Como ler, versão) | 🟡 | Média | Checklist "Elementos Obrigatórios" da issue; E2E assere textos | E2E textContent.includes |
| R5 | E2E z17 quebra (textos/testids mudam) | 🟡 | Alta | Preservar 7 data-testid + strings de seção; rodar E2E antes do flip | tests/e2e/z17 |
| R6 | Export PDF inline quebra | 🟡 | Baixa | Manter `handleExportPDF` como está em F4; não migrar p/ generateDiagnosticoPDF nesta sprint | smoke PDF |
| R7 | Auto-save/ResumeBanner perde estado | 🟡 | Baixa | Manter `useAutoSave`/`usePersistenceV3` no container | teste de persistência |
| R8 | Share modal perde `structured` | 🟢 | Baixa | adapter expõe o mesmo `structured` ao ShareModal | briefing-areas.test |
| R9 | Regenerar/Corrigir/Mais Info perdem `correction`/`complement` | 🔴 | Média | Mover `handleGenerate` intacto; test contract dos params | routers-fluxo-v3-etapas2-5.test |
| R10 | Responsividade mobile (nav→tabs) quebra | 🟢 | Média | Mobile-first; teste visual Manus | smoke mobile |
| **R11** | **Badge alucinação do GapCard sem fonte de dados** (`hallucination_detected` inexistente — A3) | 🟡 | Alta | **P1 — decisão P.O.:** (a) deferir V2 [rec.] · (b) detectar disclaimer no texto do gap [frágil] · (c) novo campo backend [sai de frontend-only → Classe C] | grep schema (campo ausente) |

---

## 9. Rollback & Fallback (defesa em profundidade)

### 9.1 Rollback — Feature flag (espelha `BRIEFING_TEMPLATE_VERSION` v1/v2 já existente)
- **Mecanismo:** flag `BRIEFING_UI_VERSION` (env) ou query `?ui=split` / `?ui=legacy`. Default = `legacy` (monolito) até F5.
- **Nível 1 (CI):** tsc/testes vermelhos em qualquer fase → PR não mergeia.
- **Nível 2 (tela branca pós-deploy):** flip do flag para `legacy` → monolito intacto volta instantaneamente (1 var, sem revert de código).
- **Nível 3 (regressão parcial):** monolito `BriefingV3.tsx` permanece no repo como fallback por ≥1 sprint após F5; remoção só em sprint separada.
- **Nível 4 (catastrófico):** `git revert` do PR de F5 (flip) — barato porque F0-F4 não alteram o caminho default.

### 9.2 Fallback — degradação graciosa (Lição #67/#68)
```ts
// briefingAdapter.ts
function toBriefingView(structured, markdown) {
  if (!isValidStructured(structured)) {
    return { mode: "markdown", markdown };   // legacy/null → render Streamdown atual
  }
  return { mode: "split", ...mapStructured(structured) };
}
```
Briefings antigos (sem `structured` ou com shape inválido) **nunca quebram** — caem no render markdown atual. O Split View é progressive enhancement sobre dado válido.

### 9.3 Abort criteria
Pausar/reverter se: (a) E2E z17 vermelho após F4; (b) qualquer cenário de aprovação falha; (c) `structured` null produz tela vazia em vez de fallback markdown; (d) tsc não-zero após F0.

---

## 10. Plano de Ação (sequência de PRs)

| PR | Fase | Conteúdo | Gate |
|---|---|---|---|
| PR-0 | F0 | Remover `@ts-nocheck` de BriefingV3 (#793) — só tipagem, zero comportamento | tsc 0 · unit verde |
| PR-1 | F1 | `briefingAdapter.ts` + `briefingAdapter.test.ts` (structured→props + fallback) | test contract do adapter |
| PR-2 | F2 | 9 componentes presentacionais (sem fiação) + render tests | tsc 0 · render tests |
| PR-3 | F3+F4 | `BriefingSplitView` atrás de flag + fiação dos handlers (movidos, não reescritos) | E2E z17 + testids preservados |
| PR-4 | F5 | Flip do flag + ADR + validação Manus 3 cenários | DoD §11 + smoke runtime |

> Cada PR é independente e reversível. F0-F2 não tocam o caminho default (zero risco de regressão em produção).

---

## 11. DoD (Definition of Done)

**Por fase:**
- F0: `tsc --noEmit` 0 sem `@ts-nocheck` · suíte unit verde
- F1: adapter test cobre (a) structured válido→split, (b) structured null→markdown, (c) shape parcial→fallback
- F2: cada componente renderiza isolado com props mock · tsc 0
- F3/F4: flag `legacy` = monolito byte-idêntico em comportamento · flag `split` = Split View · 7 data-testid presentes · E2E z17 CT-05..08 verde
- F5: validação Manus runtime em **3 cenários** (REGRA-ORQ-34 Protocolo 4): (1) briefing novo conf≥85%, (2) briefing conf<85% (gate reservation), (3) briefing legado `structured` null (fallback markdown)

**Critérios funcionais (da issue #1344, preservados):**
- Painel de decisão sem scroll (confiança+exposição+métricas+versão) · Top 3 cards · Nav lateral 5 seções · Barra de ações com 5 botões existentes · **Aprovar Briefing funciona idêntico** · todos os "Elementos Obrigatórios" presentes (versão, data, stepper, inconsistências, "Como ler", disclaimer, footer)

**Critério NEGATIVO (REGRA-ORQ-34 Protocolo 3):**
- `grep` deve confirmar 0 reescrita dos handlers de aprovação (devem ser os mesmos, movidos) · nenhum `data-testid` removido · E2E z17 não regride

---

## 12. Auto-auditoria final (cobertura)

| Item | Status | Evidência |
|---|---|---|
| Toda afirmação tem arquivo:linha | ✅ | §5, §6, §7 |
| Incluí testes no grep | ✅ | §5.5 (16+ files) |
| Incluí .md/.json | ✅ | §5.6 ADRs · ai-schemas.ts:178 |
| Verifiquei PDF | ✅ | handleExportPDF inline (não generateDiagnosticoPDF) |
| Issues pré-existentes | ✅ | #1344/#793/#767/#59 |
| ast-grep + análise estrutural | ✅ | handlers/tRPC mapeados |
| Dead-read/knip | 🟡 | sem campo novo (refactor view) |
| LOC antes de classificar | ✅ | 1200 LOC → Classe C |
| ADRs + bump | ✅ | ADR novo leve, sem bump |
| Writers/readers | ✅ | §6.3 |
| **Cobertura total** | 🟢 **~92%** | pendência: mockup (Manus) + 3 line# `~` |

---

## 13. Pendências (decisões + Manus)

1. **🔴 P1 — DECISÃO P.O.:** badge de alucinação do GapCard (`hallucination_detected`) **não tem dado estruturado** (A3). Escolher: (a) deferir V2 [recomendado, mantém frontend-only] · (b) detectar disclaimer no texto · (c) novo campo backend [vira Classe C].
2. **P2 — SQL (Manus, RACI):** `SELECT COUNT(*)... briefingStructured IS NULL` + amostra do proj 5700001 (despacho §1.3). Campos já confirmados pelo schema Zod (ai-schemas.ts:178); SQL valida o estado dos dados (quantifica R3/fallback).
3. **Mockup:** ✅ entregue como imagem PNG anexa à #1344. Diff data-testid Gap=0 contra ele no F3 (Bloco 9 — §3 do comentário, preservar os 7 existentes §5.7).
4. **Label `rag:corpus`:** ✅ já removida; `spec-bloco9/adr/contrato/e2e` adicionadas.
5. Confirmar 3 line numbers `~` (handleApprove ~400, handleGenerate, leitura de param em QuestionarioV3) por leitura direta antes do F4.

---

## F3 — Artefatos formais (gate F3 da issue #1344)

> Formalizados aqui no doc (além do comentário #issuecomment-4612640300). Labels `spec-bloco9·spec-adr·spec-contrato·spec-e2e` já aplicadas na #1344; falta `spec-aprovada` (P.O.).

### F3.1 — Contrato tRPC (exato — sem "ou similar")

| Procedure (`server/routers-fluxo-v3.ts`) | L | Input (Zod) | Output consumido |
|---|---|---|---|
| `getProjectStep1` | 915 | `{projectId:number}` | `briefingContent` (markdown), profile, answers |
| `getBriefingInconsistencias` | 3708 | `{projectId:number}` | **`structured`** (JSON, já parseado — DP-19), `inconsistencias[]`, `confidenceScore`, `approvalReservation` |
| `generateBriefing` | 1495 | `{projectId, allAnswers[], correction?, complement?}` | `{briefing:md, structured:JSON, llmRetries}` |
| `approveBriefing` | 2586 | `{projectId, briefingContent}` | status→`matriz_riscos`; **gate `<85`→`CONFIDENCE_BELOW_THRESHOLD` (L2610)** |
| `approveBriefingWithReservation` | 2720 | `{projectId, briefingContent, predefinedReason, freeReason(20-1000)}` | persiste `approval_reservation` |
| `checkBriefingFreshness` | 2511 | `{projectId}` | `{hasSnapshot, diverged, diffs[]}` |
| `getLiveBriefingSources` | 6295 | `{projectId}` | `{answered[], missing[]}` |
| `dismissInconsistencia` | 2376 | `{projectId, perguntaOrigem, motivo?}` | move p/ `dismissed_inconsistencias` |

**Fonte do Split View:** `structured` de `getBriefingInconsistencias` (já desfaz o double-encoding — DP-19). Tipo client: `BriefingGapFull` (DP-09) inclui `source_type · source_reference · _hallucination_detected · _hallucinated_articles · urgencia · causa_raiz · evidencia_regulatoria`.

### F3.2 — Bloco 9 (inventário data-testid)

**Novos (kebab-case):**
```
briefing-completude-gauge · briefing-completude-faixa-label · briefing-completude-alerta (cond. <80)
briefing-risco-geral-badge · briefing-contador-gaps · briefing-contador-acoes · briefing-contador-oportunidades · briefing-contador-recomendacoes · briefing-resumo-executivo
briefing-nav-tab-gaps · briefing-nav-tab-acoes · briefing-nav-tab-oportunidades · briefing-nav-tab-impactos · briefing-nav-tab-metodo
briefing-gap-card-{i} · briefing-gap-fonte-badge-{i} · briefing-gap-urgencia-badge-{i} · briefing-gap-hallucination-badge-{i} (cond. _hallucination_detected)
briefing-acao-card-{i} · briefing-oportunidade-card-{i} · briefing-recomendacao-item-{i}
briefing-impactos-section · briefing-method-section
briefing-actionbar-superior · briefing-actionbar-inferior · briefing-btn-aprovar
```
**PRESERVAR (E2E/testes dependem — não renomear):** `briefing-version-timestamp` · `version-history-row-{v}` · `version-history-reason-{v}` · `btn-toggle-reason-{v}` · `version-history-reason-full-{v}` · `btn-regenerar-briefing` · `btn-compartilhar-resumo`
> Diff Gap=0 contra o mockup PNG no F3 (REGRA-ORQ-16). O mockup não traz testids (MK-5).

### F3.3 — ADR-00XX (proposta de decisão)

**Título:** "BriefingV3 Split View + consumo de `briefingStructured`"
**Status:** Proposto · aguarda P.O. · **Supersede:** nenhum (aditivo)
**Decisão:** (1) apresentar o briefing em Split View (4 zonas) consumindo `briefingStructured` (JSON) — **rejeitado parser de markdown** (C2); (2) **fallback `LegacyBriefingView` (Streamdown)** quando `structured` null — **caminho de 98%** (DP-01); (3) **Opção 0 hallucination** — consumir `_hallucination_detected` existente (D1); (4) `ImpactsSection` = bloco fixo via `<Streamdown>` + âncora (D2); (5) **feature flag `BRIEFING_UI_VERSION`** (default `legacy` até F5); (6) **F0** remove `@ts-nocheck` (#793, 9 erros causa única `loadTempData`) **+ cria `shared/source-type-labels.ts`** (D4); (7) `BriefingGapFull` tipado (G2); (8) gauge = "Grau de Completude" 4 faixas (C1) — DecisionPanel **não reusa** as 3 faixas do ConfidenceBar (TK-1); (9) threshold visual <80 ≠ gate <85 (D5).
**Consequências:** zero alteração de contrato tRPC (procedures inalteradas); `briefingContent` permanece input read-only de MatrizesV3/PlanoAcaoV3 (A5); rollback por flag/revert (F0-F2 não tocam default).
**Referencia:** ADR-010 (arquitetura 98%) · ADR-0030 (SOLARIS canônico) · ADR-0031 (snapshot).

### F3.4 — Fluxo E2E (4 cenários formais)

| # | Cenário | Passos | Asserção |
|---|---|---|---|
| **E1** | Carregamento (split) | navega `/projetos/5700001/briefing-v3` (tem `structured`) | 4 zonas renderizam; gauge "Grau de Completude" + faixa "Parcial" (65); 5 GapCards; badge alucinação em 2 gaps |
| **E2** | **Fallback (98%)** | navega briefing de projeto com `structured=NULL` | **`<Streamdown>` markdown idêntico ao monolito**; sem tela branca; ActionBar preservada |
| **E3** | Aprovação | clicar "Aprovar Briefing" | conf≥85 → `/risk-dashboard-v4`; conf<85 (ex.: 5700001=65) → `ApproveReservationModal` (justificativa obrigatória) → persiste `approval_reservation` |
| **E4** | Ações + regressão | Regenerar · Corrigir · Mais Info · Exportar PDF · Compartilhar · z17 CT-05..08 | versão incrementa; PDF gera; share recebe `structured`; **z17 CT-05..08 verde** (textos de seção preservados) |

---

## 14. Vinculadas
Issue #1344 · #793 (@ts-nocheck) · #767 (share) · #59 (retrocesso) · REGRA-ORQ-09/14/16/20/24/34/41 · ADR-0016/0018/0030/0031/010 · Lições #65/#67/#68/#72/#86 · `PLANO-TESTES-UX-BRIEFING-C-V2.md` · `CHECKLIST-ACEITE-UX-BRIEFING-C-V2.md`
**DB-SPEC:** `DB-SPEC-UX-BRIEFING-C-V2.md` — contrato de **leitura** (zero migration/ALTER/DROP); tipos reais de `briefingStructured` + double-encoding + `_hallucination_detected` pós-parse.

---

## ADENDO v2 — Despacho 2 (2026-06-03) — busca profunda + correções P.O.

**Correções incorporadas:** C1 gauge = **"Grau de Completude do Diagnóstico"** (dado `confidence_score.nivel_confianca`; faixas 0-49 Crítico/50-79 Parcial/80-94 Adequado/95-100 Completo; alerta <80) · C2 sem parser (consome `briefingStructured`; `MethodSection` exceção via `briefingContent`) · C3 `BriefingV3.tsx` confirmado · C4 GapCard sem prefixo "Aplicação obrigatória:" (UX-LABELS-02 #1346).

**Achados empíricos novos:**
- **A1 — `@ts-nocheck` = exatamente 9 erros, 1 causa raiz:** `loadTempData()` retorna `{}` untyped → acessos a `.briefing/.generationCount/.versionHistory` (BriefingV3.tsx:155,163-166,306,309-310). **F0 de-riscado** (tipar `loadTempData` em `usePersistenceV3`).
- **A2 — Sem procedure `getBriefing` única:** `structured` ← `getBriefingInconsistencias.structured` (server:3764); `briefingContent` ← `getProjectStep1` (server:915).
- **A3 🔴 — `hallucination_detected` NÃO existe** no `BriefingStructuredSchema`. Badge de alucinação do GapCard sem fonte de dados → **P1 (decisão P.O.):** deferir V2 / detectar disclaimer / novo campo backend.
- **A4 — `SOURCE_TYPE_LABEL_V2` é `const` não-exportado** (server:6644); maps de fonte duplicados 4× no client (não em `shared/`). GapCard reusa o 11-chaves (ou F0-3 consolida).
- **A5 — `briefingContent` é input de engine** (`MatrizesV3.tsx:293`, `PlanoAcaoV3.tsx:808`) → read-only.
- **A6 — Zero teste client de BriefingV3** (só server markdown + E2E z17).
- **A7 — `ImpactsSection` sem campo JSON** (bloco fixo, hardcode).

**Schema confirmado (ai-schemas.ts:178):** `nivel_risco_geral` · `resumo_executivo` · `principais_gaps[]{gap,causa_raiz,evidencia_regulatoria,urgencia,source_type(7),source_reference}` · `oportunidades[]` · `recomendacoes_prioritarias[]` · `top_3_acoes[]{acao,justificativa,prazo}` · `inconsistencias[]` · `confidence_score{nivel_confianca,limitacoes[],recomendacao}`. **Faltam:** `impactos` (fixo) e `hallucination_detected` (P1).

**Entrega F3:** comentário em #1344 (#issuecomment-4612640300) com Artefatos 1-4 (Contrato, Bloco 9, ADR, Fluxo E2E). Labels: `rag:corpus` removida; `spec-bloco9/adr/contrato/e2e` adicionadas; `spec-aprovada` aguarda P.O.
