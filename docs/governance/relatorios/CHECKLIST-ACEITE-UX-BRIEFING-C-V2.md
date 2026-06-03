# CHECKLIST DE ACEITE — UX-BRIEFING-C-V2 (#1344)

**Para o P.O. assinar ANTES de liberar F0.** Acompanha `AS-IS-TO-BE-UX-BRIEFING-C-V2-20260603.md`.

---

## A. Pré-requisitos de governança (gate F3)
- [ ] Mockup HTML do Conceito C v2 criado pelo Manus (`docs/sprints/Sprint-5/MOCKUP_*.html`)
- [ ] Issue #1344 recebe as 4 seções: **Bloco 9** (data-testid derivado do mockup), **ADR** (novo leve), **Contrato** (10 procedures §5.2 — confirmadas), **Fluxo E2E**
- [ ] Issue #1344 recebe as 5 labels: `spec-bloco9 · spec-adr · spec-contrato · spec-e2e · spec-aprovada`
- [ ] Label `rag:corpus` **removida** de #1344 (falso-positivo frontend — Lição #92)
- [ ] `ux-spec-validator` reporta **LIBERAR**

## B. Decisões arquiteturais a aprovar
- [ ] **Consumir `structured` (JSON), NÃO parser de markdown** (AS-IS §7.1) — diverge da regra 5 da issue; é a maior redução de risco
- [ ] **F0 remove `@ts-nocheck` antes** do refactor (#793) — aprovar o pré-passo
- [ ] **Feature flag** `BRIEFING_UI_VERSION` (default `legacy` até F5) como mecanismo de rollback
- [ ] **Fallback markdown** para briefings legados (`structured` null)
- [ ] 5 PRs incrementais (F0→F5), monolito preservado ≥1 sprint após flip

## C. Classificação confirmada
- [ ] Classe **C** (1200 LOC + @ts-nocheck + runtime crítico) — aceita
- [ ] REGRA-ORQ-20 (avaliação de risco estrutural) — bloco preenchido no AS-IS §8

## D. Invariantes que NÃO podem regredir (assinar ciente)
- [ ] Fluxo **Aprovar Briefing** idêntico (gate conf<85% + reservation + navegação `/risk-dashboard-v4`)
- [ ] Regenerar / Corrigir / Mais Informações (`correction`/`complement`) preservados
- [ ] 7 `data-testid` existentes preservados (AS-IS §5.7)
- [ ] E2E z17 CT-05..08 verde
- [ ] Todos os "Elementos Obrigatórios" da issue (versão, data, stepper, inconsistências, "Como ler", disclaimer, footer)
- [ ] Export PDF, Share WhatsApp, Auto-save, Anotações da Equipe funcionam

## E. RACI
- [ ] Implementação só inicia após esta checklist assinada + despacho formal do Orquestrador
- [ ] Claude Code implementa · Manus revisa+valida runtime (3 cenários) · P.O. aprova merges

---

## F. Decisões (D1-D5) — D2/D3/D4 decididas; faltam D1/D5
- [ ] **D1 — badge hallucination:** ⬜ Implementar (Opção 0, recomendado — `_hallucination_detected` existe 46/93, validado pelo mockup MK-4) · ⬜ Deferir V2
- [x] **D2 — ImpactsSection:** ✅ DECIDIDA — bloco fixo via `<Streamdown>` + âncora de nav (não regex, não remover tab)
- [x] **D3 — F3+F4:** ✅ DECIDIDA — separar em 6 PRs (PR-0..PR-5)
- [x] **D4 — SOURCE_TYPE_LABEL:** ✅ DECIDIDA — criar `shared/source-type-labels.ts` no PR-0/F0 (G5/TK-3)
- [ ] **D5 — threshold confiança (TK-2):** ⬜ alerta visual <80 "atenção" + gate aprovação <85 "exige justificativa" (server inalterado, recomendado) · ⬜ alinhar alerta a <85 · ⬜ alinhar gate a <80
- [ ] **ConfidenceBar (TK-1):** ciente que as faixas atuais (>=85/70-84/<70) divergem de C1 (4 faixas) — DecisionPanel implementa C1, não reusa a faixa do componente

---

**Assinatura P.O.:** _______________  **Data:** ___/___/______
**Veredito:** ⬜ LIBERA F0 · ⬜ DEVOLVE (motivo): _______________
