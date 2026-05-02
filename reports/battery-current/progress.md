# Vitest Realtime Progress

**Started:** 2026-05-02T15:22:24.895Z
**Output:** reports/battery-current/progress.md

| Arquivo | Teste | Estado | Duração | Timestamp |
|---|---|---|---|---|
| gap-to-rule-mapper.test.ts | server/lib/gap-to-rule-mapper.test.ts | PASS | 10ms | 2026-05-02T15:22:25.401Z |
| gap-to-rule-mapper.test.ts | Gap-to-Rule Mapper v2 — Gold Set Z-10 | PASS | 9ms | 2026-05-02T15:22:25.401Z |
| gap-to-rule-mapper.test.ts | T1: gap com categoria explícita válida em risk_categories → mapped | PASS | 3ms | 2026-05-02T15:22:25.401Z |
| gap-to-rule-mapper.test.ts | T2: gap com categoria explícita inexistente/inativa → unmapped (DEC-Z10-06) | PASS | 1ms | 2026-05-02T15:22:25.401Z |
| gap-to-rule-mapper.test.ts | T3: artigo com exatamente 1 candidato em risk_categories → mapped | PASS | 1ms | 2026-05-02T15:22:25.401Z |
| gap-to-rule-mapper.test.ts | T4: artigo com 2+ candidatos → ambiguous, NUNCA mapped | PASS | 1ms | 2026-05-02T15:22:25.401Z |
| gap-to-rule-mapper.test.ts | T5: artigo sem nenhum candidato em risk_categories → unmapped | PASS | 0ms | 2026-05-02T15:22:25.402Z |
| gap-to-rule-mapper.test.ts | T6: gap sem categoria, sem artigo, allowLayerInference=false → unmapped | PASS | 0ms | 2026-05-02T15:22:25.402Z |
| gap-to-rule-mapper.test.ts | T7: allowLayerInference=true + layer=onda2 + artigo 1 candidato → mapped com fonte=iagen | PASS | 1ms | 2026-05-02T15:22:25.402Z |
| getArchetypeContext.test.ts | server/lib/archetype/getArchetypeContext.test.ts | PASS | 11ms | 2026-05-02T15:22:25.700Z |
| getArchetypeContext.test.ts | getArchetypeContext (NOVA-03 helper) | PASS | 10ms | 2026-05-02T15:22:25.700Z |
| getArchetypeContext.test.ts | Backward-compat — fallback para string vazia | PASS | 5ms | 2026-05-02T15:22:25.700Z |
| getArchetypeContext.test.ts | retorna '' para null | PASS | 2ms | 2026-05-02T15:22:25.700Z |
| getArchetypeContext.test.ts | retorna '' para undefined | PASS | 0ms | 2026-05-02T15:22:25.700Z |
| getArchetypeContext.test.ts | retorna '' para string vazia | PASS | 0ms | 2026-05-02T15:22:25.700Z |
| getArchetypeContext.test.ts | retorna '' para JSON inválido (sem quebrar caller) | PASS | 1ms | 2026-05-02T15:22:25.700Z |
| getArchetypeContext.test.ts | retorna '' para objeto vazio | PASS | 0ms | 2026-05-02T15:22:25.700Z |
| getArchetypeContext.test.ts | Cenários canônicos (5 dimensões + contextuais) | PASS | 1ms | 2026-05-02T15:22:25.700Z |
| getArchetypeContext.test.ts | formata cenário financeiro completo | PASS | 1ms | 2026-05-02T15:22:25.700Z |
| getArchetypeContext.test.ts | formata cenário transportadora combustível (caso símbolo) | PASS | 0ms | 2026-05-02T15:22:25.700Z |
| getArchetypeContext.test.ts | formata cenário agro produtor | PASS | 0ms | 2026-05-02T15:22:25.700Z |
| getArchetypeContext.test.ts | Omissão de dimensões vazias | PASS | 1ms | 2026-05-02T15:22:25.700Z |
| getArchetypeContext.test.ts | omite arrays vazios e mantém regime + papel | PASS | 1ms | 2026-05-02T15:22:25.700Z |
| getArchetypeContext.test.ts | omite arrays undefined/null sem quebrar | PASS | 0ms | 2026-05-02T15:22:25.700Z |
| getArchetypeContext.test.ts | Aceita JSON string serializado | PASS | 0ms | 2026-05-02T15:22:25.700Z |
| getArchetypeContext.test.ts | desserializa JSON string e formata | PASS | 0ms | 2026-05-02T15:22:25.700Z |
| getArchetypeContext.test.ts | Formato de output (separador) | PASS | 1ms | 2026-05-02T15:22:25.700Z |
| getArchetypeContext.test.ts | usa ' \| ' como separador entre dimensões | PASS | 0ms | 2026-05-02T15:22:25.700Z |
| getArchetypeContext.test.ts | não inclui pipe trailing quando única dimensão presente | PASS | 0ms | 2026-05-02T15:22:25.701Z |
| m3-archetype-e2e.test.ts | server/lib/m3-archetype-e2e.test.ts | PASS | 14ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | E1 — getArchetypeContext format | PASS | 4ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | formata todas as 7 dimensões do arquétipo financeiro | PASS | 2ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | omite dimensões ausentes | PASS | 1ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | E2 — backward-compat null/inválido | PASS | 2ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | retorna string vazia para null | PASS | 0ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | retorna string vazia para undefined | PASS | 0ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | retorna string vazia para empty string | PASS | 0ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | retorna string vazia para invalid JSON string | PASS | 0ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | retorna string vazia para non-object | PASS | 0ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | retorna string vazia para array | PASS | 0ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | aceita JSON string válida e parseia | PASS | 0ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | E3 — mapper propaga questionId/answerValue/gapId/questionSource | PASS | 3ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | propaga 4 campos de rastreabilidade quando presentes | PASS | 3ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | usa null quando campos de rastreabilidade ausentes (backward-compat) | PASS | 1ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | E4 — consolidateRisks emite archetype_context | PASS | 2ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | inclui archetype_context na evidence quando passado | PASS | 1ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | omite archetype_context quando não passado (backward-compat) | PASS | 0ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | omite archetype_context quando string vazia | PASS | 0ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | E5 — evidence carrega rastreabilidade end-to-end | PASS | 1ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | evidence inclui questionId/answerValue/gapId/questionSource quando GapRule traz | PASS | 1ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | evidence usa null para rastreabilidade quando GapRule não traz (backward-compat) | PASS | 1ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | E6 — cadeia completa archetype → evidence | PASS | 2ms | 2026-05-02T15:22:25.737Z |
| m3-archetype-e2e.test.ts | archetype financeiro → contextString → evidence.archetype_context populada | PASS | 1ms | 2026-05-02T15:22:25.737Z |
| sprint-z13.5-engine-tests.test.ts | C1 — Chave de consolidacao (risk_key) | PASS | 6ms | 2026-05-02T15:22:25.737Z |
| sprint-z13.5-engine-tests.test.ts | C1: 10 gaps geram 3 riscos distintos agrupados por categoria+contexto | PASS | 5ms | 2026-05-02T15:22:25.737Z |
| sprint-z13.5-engine-tests.test.ts | C2 — Agregacao de evidencias | PASS | 3ms | 2026-05-02T15:22:25.737Z |
| sprint-z13.5-engine-tests.test.ts | C2: 22 gaps de split_payment — nenhum gap perdido na consolidacao | PASS | 3ms | 2026-05-02T15:22:25.737Z |
| sprint-z13.5-engine-tests.test.ts | C3 — Severidade maxima | PASS | 1ms | 2026-05-02T15:22:25.737Z |
| sprint-z13.5-engine-tests.test.ts | C3: severidade do risco consolidado e a maxima entre os gaps do grupo | PASS | 1ms | 2026-05-02T15:22:25.737Z |
| m3-sprint-e2e-suite.test.ts | server/lib/m3-sprint-e2e-suite.test.ts | PASS | 14ms | 2026-05-02T15:22:25.743Z |
| m3-sprint-e2e-suite.test.ts | T01 — archetype enriquece contextQuery RAG (padrão product-questions) | PASS | 3ms | 2026-05-02T15:22:25.743Z |
| m3-sprint-e2e-suite.test.ts | archetype financeiro gera string com dimensões para concatenar ao contextQuery | PASS | 2ms | 2026-05-02T15:22:25.743Z |
| m3-sprint-e2e-suite.test.ts | archetype null → contextQuery legado (sem enriquecimento) | PASS | 1ms | 2026-05-02T15:22:25.743Z |
| m3-sprint-e2e-suite.test.ts | T02 — archetype enriquece contextQuery RAG (padrão service-questions) | PASS | 1ms | 2026-05-02T15:22:25.743Z |
| m3-sprint-e2e-suite.test.ts | archetype transportadora gera string com território interestadual | PASS | 0ms | 2026-05-02T15:22:25.743Z |
| m3-sprint-e2e-suite.test.ts | T03 — IA GEN Onda 2 consome archetype no profileFields | PASS | 2ms | 2026-05-02T15:22:25.743Z |
| m3-sprint-e2e-suite.test.ts | archCtx não-vazio é adicionado ao profileFields (padrão routers-fluxo-v3.ts:3833) | PASS | 1ms | 2026-05-02T15:22:25.743Z |
| m3-sprint-e2e-suite.test.ts | archCtx vazio (null) → profileFields sem linha extra | PASS | 0ms | 2026-05-02T15:22:25.743Z |
| m3-sprint-e2e-suite.test.ts | T04 — Gap Engine enriquece gap_description com archetype | PASS | 1ms | 2026-05-02T15:22:25.743Z |
| m3-sprint-e2e-suite.test.ts | archetype agro → gap_description inclui contexto setorial | PASS | 0ms | 2026-05-02T15:22:25.743Z |
| m3-sprint-e2e-suite.test.ts | archetype null → gap_description inalterada (backward-compat) | PASS | 0ms | 2026-05-02T15:22:25.743Z |
| m3-sprint-e2e-suite.test.ts | T05 — Risk Engine usa derived_legacy_operation_type como drop-in | PASS | 1ms | 2026-05-02T15:22:25.743Z |
| m3-sprint-e2e-suite.test.ts | archetype com derived_legacy → operationType vem do archetype (não do opProfile) | PASS | 0ms | 2026-05-02T15:22:25.743Z |
| m3-sprint-e2e-suite.test.ts | archetype null → fallback para opProfile.operationType (legado) | PASS | 0ms | 2026-05-02T15:22:25.743Z |
| m3-sprint-e2e-suite.test.ts | archetype sem derived_legacy → fallback para opProfile.tipoOperacao | PASS | 0ms | 2026-05-02T15:22:25.743Z |
| m3-sprint-e2e-suite.test.ts | buildRiskKey produz mesma chave com mesmos inputs | PASS | 0ms | 2026-05-02T15:22:25.744Z |
| m3-sprint-e2e-suite.test.ts | T06 — Pipeline v4 injeta archetype_context em ConsolidatedEvidence | PASS | 1ms | 2026-05-02T15:22:25.744Z |
| m3-sprint-e2e-suite.test.ts | archetype financeiro → evidence.archetype_context populada | PASS | 1ms | 2026-05-02T15:22:25.744Z |
| m3-sprint-e2e-suite.test.ts | archetype undefined → evidence SEM archetype_context (backward-compat) | PASS | 0ms | 2026-05-02T15:22:25.744Z |
| m3-sprint-e2e-suite.test.ts | T07 — Rastreabilidade: GapRule propaga questionId/answerValue/gapId/questionSource | PASS | 1ms | 2026-05-02T15:22:25.744Z |
| m3-sprint-e2e-suite.test.ts | GapRule com rastreabilidade → evidence.gaps[] carrega campos | PASS | 0ms | 2026-05-02T15:22:25.744Z |
| m3-sprint-e2e-suite.test.ts | GapRule sem rastreabilidade → evidence.gaps[] usa null (backward-compat) | PASS | 0ms | 2026-05-02T15:22:25.744Z |
| m3-sprint-e2e-suite.test.ts | T08 — Rastreabilidade: múltiplos gaps com fontes diferentes consolidam corretamente | PASS | 1ms | 2026-05-02T15:22:25.744Z |
| m3-sprint-e2e-suite.test.ts | 2 gaps mesma categoria → 1 risco com 2 evidence entries rastreáveis | PASS | 1ms | 2026-05-02T15:22:25.744Z |
| m3-sprint-e2e-suite.test.ts | T09 — Backward-compat: archetype null/undefined/inválido não quebra engines | PASS | 1ms | 2026-05-02T15:22:25.744Z |
| m3-sprint-e2e-suite.test.ts | consolidateRisks funciona sem archetype (5o param omitido) | PASS | 1ms | 2026-05-02T15:22:25.744Z |
| m3-sprint-e2e-suite.test.ts | getArchetypeContext com JSON inválido → '' (não lança exceção) | PASS | 0ms | 2026-05-02T15:22:25.744Z |
| m3-sprint-e2e-suite.test.ts | getArchetypeContext com objeto parcial → formata apenas dimensões presentes | PASS | 0ms | 2026-05-02T15:22:25.744Z |
| m3-sprint-e2e-suite.test.ts | T10 — Cadeia completa: archetype financeiro → risk com evidence rastreável + archetype_context | PASS | 2ms | 2026-05-02T15:22:25.744Z |
| m3-sprint-e2e-suite.test.ts | end-to-end: archetype + rastreabilidade + evidence completa | PASS | 2ms | 2026-05-02T15:22:25.744Z |
| risk-engine-v4.test.ts | server/lib/risk-engine-v4.test.ts | PASS | 41ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | Bloco A — classificação determinística | PASS | 7ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | A1: imposto_seletivo → severity alta, urgência imediata | PASS | 2ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | A2: confissao_automatica → severity alta, urgência imediata | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | A3: split_payment → severity alta, urgência imediata | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | A4: inscricao_cadastral → severity alta, urgência imediata | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | A5: regime_diferenciado → severity media, urgência curto_prazo | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | A6: obrigacao_acessoria → severity media, urgência curto_prazo | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | A7: SEVERITY_TABLE cobre 10 categorias canônicas + 1 fallback (v2.1) | PASS | 3ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | Bloco B — invariantes críticas | PASS | 3ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | B1: ruleId nunca é null no risco produzido | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | B2: artigo vem do GapRule, nunca inventado | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | B3: breadcrumb tem exatamente 4 nós | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | B4: oportunidade → buildActionPlans retorna array vazio | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | B5: evidence ordenada por SOURCE_RANK (menor = primeiro) | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | B6: função pura — mesma entrada produz mesma saída | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | B7: array vazio de gaps → array vazio de riscos | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | Bloco C — decision table completa | PASS | 2ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | C1: todas as categorias 'alta' têm urgência 'imediata' | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | C2: transicao_iss_ibs → severity media, urgência medio_prazo | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | C3: aliquota_zero → severity oportunidade, urgência curto_prazo | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | C4: aliquota_reduzida → severity oportunidade, urgência curto_prazo | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | C5: credito_presumido → severity oportunidade, urgência curto_prazo | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | C6: SOURCE_RANK respeita ordem cnae < ncm < nbs < solaris < iagen | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | C7: computeRiskMatrix preserva ruleId de cada gap na saída | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | C8: computeRiskMatrix ordena riscos por severity (alta > media > oportunidade) | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | Bloco D — action plan engine | PASS | 3ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | D1: risco severity alta gera plano de ação com prioridade imediata | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | D2: risco severity media gera plano com prioridade correspondente à urgência | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | D3: múltiplos riscos alta geram planos via fallback categoria | PASS | 1ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | D4: plano de ação preserva ruleId do risco de origem | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | D5: plano de ação contém breadcrumb de 4 nós | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | D6: mix de severidades — oportunidades filtradas, demais geram planos | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | D7: buildActionPlans é função pura — mesma entrada, mesma saída | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | D8: buildActionPlans com array vazio retorna array vazio | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | Bloco E — DB categories cache | PASS | 2ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | R-31: cache TTL — segunda chamada não vai ao banco | PASS | 1ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | R-32: categoria com vigencia_fim expirada não aparece | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | Bloco F — consolidateRisks | PASS | 20ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | T-01: 138 gaps alimentar → between 20 and 45 consolidated risks, all unique risk_key | PASS | 18ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | T-01b: consolidateRisks groups gaps by categoria, produces evidence_count | PASS | 1ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | T-01c: consolidateRisks with empty gaps returns empty array | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | Bloco G — gate de elegibilidade em consolidateRisks | PASS | 4ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | G1: servicos → imposto_seletivo bloqueado, downgrade para enquadramento_geral | PASS | 2ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | G2: servico (alias singular) → imposto_seletivo também bloqueado | PASS | 1ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | G3: industria → imposto_seletivo permanece (sem regressão) | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| risk-engine-v4.test.ts | G4: comercio → imposto_seletivo permanece (sem regressão) | PASS | 0ms | 2026-05-02T15:22:25.763Z |
| sprint-z13.5-engine-tests.test.ts | C4: pipeline completa mesmo com RAG timeout — riscos retornados sem enriquecimento | PASS | 3012ms | 2026-05-02T15:22:28.743Z |
| sprint-z13.5-engine-tests.test.ts | C4 — RAG timeout (resiliencia) | PASS | 3013ms | 2026-05-02T15:22:28.743Z |
| sprint-z13.5-engine-tests.test.ts | C5 — Merge sem duplicatas (infer + consolidate) | PASS | 2ms | 2026-05-02T15:22:28.743Z |
| sprint-z13.5-engine-tests.test.ts | C5: mergeByRiskKey elimina duplicatas entre consolidate e infer | PASS | 1ms | 2026-05-02T15:22:28.743Z |
| sprint-z13.5-engine-tests.test.ts | server/lib/sprint-z13.5-engine-tests.test.ts | PASS | 3024ms | 2026-05-02T15:22:28.743Z |

## Summary

- **Pass:** 101
- **Fail:** 0
- **Skipped:** 0
- **Total:** 101
- **Started:** 2026-05-02T15:22:24.895Z
- **Finished:** 2026-05-02T15:22:28.756Z
