# Backlog M3 — IA SOLARIS Compliance Tributária

**Atualizado:** 2026-05-02 pós-encerramento Sprint M3 (12 PRs mergeados — 9 features M3 + 2 docs + 1 fix)
**HEAD:** `bc649fa` (pós PR #913 NOVA-09)
**Status marco principal:** ✅ M3 ENCERRADA — Perfil da Entidade integrado a 5 engines + UI + E2E

---

## Prioridade 1 — Destravar cliente real

1. ✅ **PR-LISTCLIENTS-FIX** — **ENTREGUE (#902 — `3925134`)**
   Destrava `role=cliente` para criação de projeto pela UI. `listClients` procedure auto-vincula `role=cliente` ao próprio user.

## Prioridade 2 — M3 Consumo arquétipo no RAG ⭐ MARCO PRINCIPAL — ✅ ENCERRADO

Implementação seguiu padrão cirúrgico `arch ?? legacy` (não substituição) — todos os engines mantêm leitura legado e adicionam camada dimensional opcional via helper centralizado `getArchetypeContext` (NOVA-03 fundação, PR #903).

2. ✅ **M3-RAG-01** — RAG/contextQuery dimensional — **ENTREGUE via NOVA-02 (#905)**
   `product-questions.ts` e `service-questions.ts` enriquecem `contextQuery` com `getArchetypeContext(archetype)` antes de chamar RAG. Backward-compat: archetype null → query original.

3. ✅ **M3-RAG-02** — IA GEN consome archetype — **ENTREGUE via NOVA-01 (#904)**
   `routers-fluxo-v3.ts` (briefing) e `routers-session-questionnaire.ts` (perguntas adaptativas) injetam `Perfil da Entidade (arquétipo M1): {ctx}` no prompt LLM. 6 LOC aditivas por gerador.

4. ✅ **M3-RAG-03** — Gap engine consome archetype — **ENTREGUE via NOVA-04 (#907)**
   `gapEngine.ts` enriquece `gap_description` com sufixo `(contexto: {archCtx})` quando archetype presente. 1 query SELECT extendida + 1 ternário.

5. ✅ **M3-RAG-04 + bonus** — Smoke E2E + suite acceptance — **ENTREGUE via NOVA-09 (#913) + acceptance (sessão)**
   17 testes E2E integração (`server/lib/m3-archetype-e2e.test.ts`) + 10 testes acceptance (`server/lib/m3-sprint-acceptance.test.ts`). Suite oficial 58 cenários M1: GO 59/0/1.

### Entregas adicionais não previstas no backlog original (escopo expandido pelo P.O.)

5a. ✅ **NOVA-05 (#906)** — Risk engine usa `derived_legacy_operation_type`
   `riskEngine.ts` cadeia `archetype.derived_legacy ?? operationType ?? tipoOperacao ?? null`. Preserva `buildRiskKey` + `rules_hash` invariante.

5b. ✅ **NOVA-06 (#908)** — Rastreabilidade end-to-end Risco→Pergunta→Resposta→Gap
   4 campos opcionais (`questionId`, `answerValue`, `gapId`, `questionSource`) propagados de `GapInput` → `GapRule` → `EvidenceItem` → `risks_v4.evidence.gaps[]`. `archetype_context` top-level em `ConsolidatedEvidence`. Habilita drawer de rastreabilidade no frontend (futuro M3.5).

5c. ✅ **NOVA-07 (#909)** — Badge UX no header do Questionário
   `client/src/components/ArchetypeBadge.tsx` (95 LOC) renderiza badge violet com tooltip de 7 dimensões. Integrado em `QuestionarioCNAE.tsx`. Backward-compat: archetype null → componente retorna null.

## Issues abertas pós-M3 (backlog técnico residual)

- **#911** — cleanup gapId rename ambíguo (Manus review #908) · Nível 3 backlog · `tech-debt`+`priority:low`
- **#914** — fix(ci) secrets ausentes (OAUTH_SERVER_URL/OPENAI_API_KEY) causam Run Unit Tests + TypeScript+Vitest FAIL · `tech-debt`+`priority:medium`

## Próximas frentes candidatas (M3.5 ou Sprint dedicado)

- **NOVA-06 frontend:** `RiskExplanationDrawer.tsx` + `risk.getTraceability(riskId)` tRPC procedure — consome `evidence.gaps[].questionId` etc.
- **Replicar `<ArchetypeBadge>`:** Operacional, Produto, Serviço, IaGen (NOVA-07 só cobriu QuestionarioCNAE)
- **NCM mapping chapters 02 (carnes), 47 (celulose):** A48, A50 fallback documentado
- **373 docs corpus `cnaeGroups="64,65,66"`:** auditoria de uso indevido financeiro→outros

## Prioridade 3 — Operacional crítica

6. **Issue #873 abordagem A+C** (Manus ~5h Classe B)
   CI prod isolation Camadas 1-4. Provisiona TEST DB + secret `CI_HAS_TEST_DB=true` → desativa guard PR-FIX-2 sem PR adicional.

7. **Issue #875 cleanup retroativo** (Manus Classe C com gates)
   16k+ users sintéticos + 268 projetos teste. Pré-requisito: Issue #873 mergeada (senão Sísifo).

8. **cpie_analysis_history Opção A revisada** (Claude Code ~30min)
   Pré-check Manus: `SHOW TABLES LIKE 'cpie_%'` em prod. Se existe: rodar 0088 manual. Registrar 0088 no `_journal.json`.

## Prioridade 4 — Bugs latentes M2

9. **PR-H 3 bugs ALTOS adapter** (Classe B ~6h — base limpa pós PR-J)
   BUG-5 `abrangencia_operacional` hardcoded `["Nacional"]`. BUG-6 `atua_importacao` hardcoded false. BUG-7 `atua_exportacao` hardcoded false. Fix em UM lugar via `seedNormalizers.ts`.

10. **PR-I 5 bugs MÉDIOS regime/ZFM** (Classe B ~4h)
    `tipo_regime_especial`, `opera_territorio_incentivado`, `tipo_territorio_incentivado` etc. Mesma estratégia centralizada.

11. **PR-FIN-OBJETO-V3** (Reativo, não preemptivo)
    Generalização Mudança 1+2 do V2 para outros setores regulados (saúde, energia, telecom, combustíveis, transporte). **Trigger:** cliente real entra na carteira E reproduz cenário análogo BUG-FIN-OBJETO. Lição #41 aplicada.

## Prioridade 5 — UX/cosméticos

12. **PR-G PC-04 fix UX tela branca** (Classe C com SPEC + ADR + crítica ORQ-22)
    Erro NCM/NBS deixa tela em branco. Aguarda SPEC formal Manus. REGRA-ORQ-24 exige Classe C → ADR + 2 rounds crítica.

## Prioridade 6 — Validação contínua

13. **Smokes 7-10** setores regulados (~10-15min cada)
14. **Lições #1-#40** consolidação (~2-3h Classe A)
    Varrer `git log --all --grep="Lição"` + handoffs históricos para preencher placeholder em `LICOES_ARQUITETURAIS.md`.
15. **TAX_REGIME_ALIASES vs SNAKE_TO_LABEL** — bug ou design? (Decisão produto)
    Decisão de não-consolidação documentada no PR-J Fase 2b — confirmar se é design ou retrabalho futuro.
16. **PR-FIX-3 LLM tests sem `OPENAI_API_KEY`** (~30min Classe A)
    Endereça fails residuais Run Unit Tests não-DB. Padrão similar ao PR-FIX-2 (`SKIP_LLM_TESTS = !process.env.OPENAI_API_KEY`).

## Prioridade 7 — Governança

17. **BACKLOG_M3.md atualizar status PRs** (~15min Classe A) — manutenção contínua deste arquivo
18. **Lições #46-#49 a registrar** (~30min Classe A)
    - #46 ✅ já registrada (PR #890 + PR #898) — validação empírica de ambiente
    - #47 Validações P.O. devem ser explicitamente mapeadas no plano de sprint
    - #48 Issue #873 bloqueia cobertura runtime efetiva
    - #49 Análise de duplicação deve verificar escopo lexical, não só similaridade textual

---

## Roadmap Epic Perfil da Empresa

```
[Marco 1: M1 Arquétipo determinístico]                        ✅
[Marco 2: M2 Perfil Entidade UI]                              ✅
[Marco 3: Cliente real ponta-a-ponta]                         🔄
[Marco 4: M3 RAG consome arquétipo] ⭐ PRÓXIMO                  ⏸️
[Marco 5: Robustez setores regulados]                         ⏸️
[Marco 6: Cobertura bugs latentes M2]                         ⏸️
[Marco 7: UX polishing M2]                                    ⏸️
[Marco 8: Operacional saudável]                               ⏸️
```

---

## Fontes da verdade

- `docs/produto/PERFIL-DA-ENTIDADE-FONTE-DA-VERDADE.md` (NEW canonical)
- `docs/governance/BASELINE-PRODUTO.md`
- `docs/governance/LICOES_ARQUITETURAIS.md`
- `docs/governance/PROMPT_HANDOFF_ORQUESTRADOR.md`
- `docs/HANDOFF-MANUS.md` (handoff Manus operacional)
