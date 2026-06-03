# PLANO DE TESTES — UX-BRIEFING-C-V2 (#1344)

**Status:** análise · acompanha `AS-IS-TO-BE-UX-BRIEFING-C-V2-20260603.md`
**Princípio:** cada fase verde no CI antes da próxima. Anti-regressão > velocidade.

---

## Contratos de teste por fase

### F0 — Remover `@ts-nocheck` (#793)
- [ ] `tsc --noEmit` = 0 erros **sem** `@ts-nocheck` em BriefingV3.tsx
- [ ] Suíte unit completa verde (baseline)
- [ ] DoD negativo: `grep "@ts-nocheck" client/src/pages/BriefingV3.tsx` → 0

### F1 — `briefingAdapter.ts` (test contract REAL — o gate de verdade)
`client/src/lib/briefingAdapter.test.ts`:
- [ ] T-ADP-01: `structured` válido → `mode:"split"` + mapeia gaps/top3/oportunidades/confidence
- [ ] T-ADP-02: `structured = null` → `mode:"markdown"` (fallback) com o markdown intacto
- [ ] T-ADP-03: `structured` shape parcial/inválido → `mode:"markdown"` (não lança)
- [ ] T-ADP-04: `principais_gaps` vazio → split renderiza "0 gaps" (não quebra)
- [ ] T-ADP-05: dedup/ordem determinística dos gaps (mesma entrada = mesma saída)
- [ ] T-ADP-06: gap com **`_hallucination_detected`** (campo real, underscore) → adapter expõe flag p/ GapCard
- [ ] T-ADP-07: `confidence_score` **objeto** `{nivel_confianca}` → mapeia; `confidence_score` **número** (legado) → mapeia defensivamente (BUG-F4)

### F2 — Componentes presentacionais (render isolado)
- [ ] T-CMP-01..09: cada componente (DecisionPanel, PriorityCards, BriefingNav, GapCard, OpportunityCard, ActionsList, ImpactsSection, MethodSection, ActionBar) renderiza com props mock sem erro
- [ ] T-CMP-10: `GapCard` exibe Fonte (badge) usando os labels Opção C (UX-LABELS-01/02 já mergeados)
- [ ] tsc 0

### F3/F4 — Integração + fiação (anti-regressão)
- [ ] T-INT-01: flag `legacy` → render idêntico ao monolito (snapshot textual das seções)
- [ ] T-INT-02: flag `split` → Split View com 4 zonas
- [ ] T-INT-03: **handleApprove** — gate conf<85% abre `ApproveReservationModal`; conf≥85% chama `approveBriefing` e navega `/risk-dashboard-v4`
- [ ] T-INT-04: **handleGenerate** com `correction` → mutation recebe `correction` (não `complement`); com `complement` → recebe `complement`
- [ ] T-INT-05: 7 data-testid existentes presentes (§5.7 do AS-IS)
- [ ] T-INT-06: dismissInconsistencia + handleCorrigirInconsistencia preservam navegação `?revisao=true&pergunta=`
- [ ] T-INT-07: export PDF inline gera HTML+print (smoke)
- [ ] T-INT-08: GapCard com `_hallucination_detected=true` → badge "⚠️ Verificar artigo citado" visível (`briefing-gap-hallucination-badge-{i}`)
- [ ] **T-INT-09 (Falha TO-BE 4 — smoke pós-F5):** aprovar briefing com Split View → `MatrizesV3` (`briefingContent` de query própria) gera riscos · `PlanoAcaoV3` gera planos. Confirma BUG-F5 (read do banco, não do state)

### E2E (preservar — `tests/e2e/z17-pipeline-completo.spec.ts`)
- [ ] CT-05..08 navega `/briefing-v3` e assere textos de seção (Resumo, Gaps, etc.) — **devem permanecer** no Split View
- [ ] Novo CT: selecionar Aprovar → confirma navegação para risk-dashboard-v4

### F5 — Validação runtime Manus (REGRA-ORQ-34 Protocolo 4 — 3 cenários)
- [ ] C1 (greenfield, conf≥85%): briefing novo → Split View completo, Aprovar funciona
- [ ] C2 (conf<85%): gate reservation abre modal, justificativa obrigatória, aprova com ressalva
- [ ] C3 (legado, `structured` null): **fallback markdown** renderiza (não tela branca)

---

## Matriz teste × risco (rastreabilidade)
| Risco (AS-IS §8) | Coberto por |
|---|---|
| R1 Aprovar | T-INT-03 · E2E CT-08 |
| R2 @ts-nocheck | F0 tsc |
| R3 structured null | T-ADP-02/03 · C3 |
| R4 seção perdida | E2E textContent · CHECKLIST elementos obrigatórios |
| R5 E2E quebra | T-INT-05 · CT-05..08 |
| R6 PDF | T-INT-07 |
| R9 correction/complement | T-INT-04 |

---

## Comandos
```bash
pnpm tsc --noEmit
pnpm vitest run client/src/lib/briefingAdapter.test.ts
pnpm test:unit
pnpm test:e2e tests/e2e/z17-pipeline-completo.spec.ts
```
