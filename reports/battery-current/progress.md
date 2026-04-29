# Vitest Realtime Progress

**Started:** 2026-04-29T17:43:42.324Z
**Output:** reports/battery-current/progress.md

| Arquivo | Teste | Estado | Duração | Timestamp |
|---|---|---|---|---|
| flowStateMachine.test.ts | server/flowStateMachine.test.ts | PASS | 14ms | 2026-04-29T17:43:42.801Z |
| flowStateMachine.test.ts | FLOW_STEPS — estrutura | PASS | 5ms | 2026-04-29T17:43:42.801Z |
| flowStateMachine.test.ts | deve ter 11 etapas | PASS | 2ms | 2026-04-29T17:43:42.801Z |
| flowStateMachine.test.ts | deve ter stepNumbers sequenciais de 1 a 11 | PASS | 1ms | 2026-04-29T17:43:42.801Z |
| flowStateMachine.test.ts | deve ter a primeira etapa como perfil_empresa | PASS | 0ms | 2026-04-29T17:43:42.801Z |
| flowStateMachine.test.ts | deve ter a última etapa como dashboard | PASS | 0ms | 2026-04-29T17:43:42.801Z |
| flowStateMachine.test.ts | STEP_BY_NAME deve mapear todas as etapas corretamente | PASS | 0ms | 2026-04-29T17:43:42.801Z |
| flowStateMachine.test.ts | STEP_BY_NUMBER deve mapear todos os números corretamente | PASS | 0ms | 2026-04-29T17:43:42.801Z |
| flowStateMachine.test.ts | validateTransition — transições válidas | PASS | 2ms | 2026-04-29T17:43:42.801Z |
| flowStateMachine.test.ts | deve permitir avançar da etapa 1 para a 2 | PASS | 1ms | 2026-04-29T17:43:42.801Z |
| flowStateMachine.test.ts | deve permitir retroceder (revisão) | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve bloquear pular etapas (etapa 1 → etapa 4) | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve bloquear etapa desconhecida | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | validateTransition — gates de consistência | PASS | 1ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve bloquear descoberta_cnaes sem consistência executada | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve bloquear descoberta_cnaes com inconsistências críticas não aceitas | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve permitir descoberta_cnaes com consistência aprovada | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve permitir descoberta_cnaes com risco aceito mesmo com inconsistências críticas | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve permitir descoberta_cnaes com status low | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | validateTransition — gates de CNAEs | PASS | 1ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve bloquear confirmacao_cnaes sem CNAEs descobertos | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve bloquear diagnostico_corporativo sem CNAEs confirmados | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve permitir diagnostico_corporativo com CNAEs confirmados | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | validateTransition — gates de diagnóstico | PASS | 1ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve bloquear diagnostico_operacional sem diagnóstico corporativo | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve bloquear diagnostico_cnae sem diagnóstico operacional | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve bloquear briefing sem diagnóstico CNAE | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve bloquear riscos sem briefing gerado | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve bloquear plano sem riscos gerados | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve bloquear dashboard sem plano gerado | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | validateTransition — fluxo completo (happy path) | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve permitir o fluxo completo de 1 a 11 | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | getResumePoint | PASS | 1ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve retornar etapa 1 para projeto novo | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve retornar etapa 4 para projeto com CNAEs confirmados | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve retornar etapa 8 para projeto com briefing gerado | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve retornar resumeData com todos os flags corretos | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | createHistoryEntry | PASS | 1ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve criar entrada de histórico com timestamp ISO | PASS | 1ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve criar entrada sem userId quando não fornecido | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | validateTransition — testes de borda | PASS | 1ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve lidar com currentStep undefined (projeto sem step) | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve bloquear avanço de 11 etapas de uma vez | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| flowStateMachine.test.ts | deve permitir avançar exatamente 1 etapa | PASS | 0ms | 2026-04-29T17:43:42.802Z |
| perfil-router.test.ts | computePerfilHash — determinismo + canonical | PASS | 6ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T1: mesmo input produz mesmo hash (determinístico) | PASS | 3ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T2: ordem de elementos em arrays NÃO altera hash (sort canonical) | PASS | 0ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T3: whitespace em strings de array NÃO altera hash (trim canonical) | PASS | 0ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T4: project_id diferente produz hash diferente | PASS | 1ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T5: cnpj diferente produz hash diferente | PASS | 0ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T6: dim_objeto diferente produz hash diferente | PASS | 0ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T7: subnatureza_setorial undefined trata como [] | PASS | 0ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | Constantes alinhadas com baseline determinístico | PASS | 2ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T8: RULES_HASH bate byte-a-byte com auditoria v7.60 | PASS | 0ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T9: RULES_VERSION e MODEL_VERSION = m1-v1.0.0 | PASS | 0ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T10: DATA_VERSION é ISO-8601 UTC válido (pós-#860) | PASS | 1ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | isM2PerfilEntidadeEnabled — 5 etapas de rollout | PASS | 2ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T11: Step 1 — flag global false default | PASS | 0ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T12: Step 3 — equipe_solaris com env opt-in | PASS | 0ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T13: Step 3 alt — whitelist de projetos via env | PASS | 0ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T14: Step 4 — flag global true ativa para todos | PASS | 0ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T15: env M2_PERFIL_ENTIDADE_ENABLED=false sobrescreve flag global true | PASS | 0ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T16: E2E_TEST_MODE=true sempre ativa | PASS | 0ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | FSM dual-path — preserva legado + adiciona perfil_entidade_confirmado | PASS | 2ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T17: cnaes_confirmados → perfil_entidade_confirmado é VÁLIDA (M2) | PASS | 1ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T18: cnaes_confirmados → onda1_solaris ainda VÁLIDA (legado preservado) | PASS | 0ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T19: perfil_entidade_confirmado → onda1_solaris é VÁLIDA | PASS | 0ms | 2026-04-29T17:43:42.874Z |
| perfil-router.test.ts | T20: VALID_TRANSITIONS.cnaes_confirmados contém AMBOS os destinos | PASS | 1ms | 2026-04-29T17:43:42.874Z |
| m2-integration.test.ts | server/m2-integration.test.ts | PASS | 13ms | 2026-04-29T17:43:43.220Z |
| m2-integration.test.ts | M2 integração — contratos do router perfil.* + isM2PerfilEntidadeEnabled | PASS | 12ms | 2026-04-29T17:43:43.220Z |
| m2-integration.test.ts | T1: feature flag default false em produção (sem env override) | PASS | 3ms | 2026-04-29T17:43:43.220Z |
| m2-integration.test.ts | T2: equipe_solaris com env opt-in habilita procedures | PASS | 1ms | 2026-04-29T17:43:43.220Z |
| m2-integration.test.ts | T3: env M2_PERFIL_ENTIDADE_ENABLED=true sobrescreve flag global | PASS | 1ms | 2026-04-29T17:43:43.220Z |
| m2-integration.test.ts | T4: env M2_PERFIL_ENTIDADE_ENABLED=false força bloqueio mesmo para roles internas | PASS | 1ms | 2026-04-29T17:43:43.220Z |
| m2-integration.test.ts | T5: whitelist de projetos via env | PASS | 1ms | 2026-04-29T17:43:43.220Z |
| m2-integration.test.ts | T6: validateM1Seed reuse — NCM truncado bloqueia (regex helper PR #859) | PASS | 3ms | 2026-04-29T17:43:43.220Z |
| m2-integration.test.ts | T7: validateM1Seed reuse — NBS digitado em campo NCM bloqueado | PASS | 1ms | 2026-04-29T17:43:43.220Z |
| m2-integration.test.ts | T8: helper isValidNcmFormat detecta NCMs truncados (alinhamento frontend↔backend) | PASS | 0ms | 2026-04-29T17:43:43.220Z |
| ConfirmacaoPerfil.test.ts | client/src/pages/__tests__/ConfirmacaoPerfil.test.ts | PASS | 12ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | mapStatusToFsm — engine sem prefixo → FSM com prefixo perfil_ | PASS | 3ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | T1: confirmado → perfil_confirmado | PASS | 1ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | T2: inconsistente → perfil_inconsistente | PASS | 0ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | T3: bloqueado → perfil_bloqueado | PASS | 0ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | T4: undefined → perfil_pendente (default seguro) | PASS | 0ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | T5: pendente → perfil_pendente | PASS | 0ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | deriveVisualState — 8 estados visuais | PASS | 2ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | T6: c4_confirmado quando perfilGet.confirmed=true | PASS | 0ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | T7: s1_inicio quando sem dados e form não iniciado | PASS | 0ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | T8: s2_modal quando form iniciado mas sem build data | PASS | 0ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | T9: c3_bloqueado quando engine retorna bloqueado | PASS | 0ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | T10: c3_bloqueado quando >=1 HARD_BLOCK ativo | PASS | 0ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | T11: c2_inconsistente quando engine retorna inconsistente sem hard_block | PASS | 0ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | T12: c1_pendente quando engine retorna pendente | PASS | 0ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | T13: s4_painel_completo quando engine confirma sem persistir ainda | PASS | 0ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | inferOrigemFromBlockers — origem da derivação por presença de blocker | PASS | 1ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | T14: V-10-FALLBACK presente → origem='fallback' | PASS | 0ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | T15: ausente → origem='infer' | PASS | 0ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | T16: lista vazia → origem='infer' | PASS | 0ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | Termo proibido — 'Arquétipo' NÃO aparece em strings da UI cliente | PASS | 4ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | T17: ConfirmacaoPerfil.tsx NÃO contém 'Arquétipo' (com acento) em UI text | PASS | 2ms | 2026-04-29T17:43:43.221Z |
| ConfirmacaoPerfil.test.ts | T18: PainelConfianca.tsx NÃO contém 'Arquétipo' em UI text | PASS | 1ms | 2026-04-29T17:43:43.222Z |
| ConfirmacaoPerfil.test.ts | T19: DimensaoCard.tsx NÃO contém 'Arquétipo' em UI text | PASS | 0ms | 2026-04-29T17:43:43.222Z |
| ConfirmacaoPerfil.test.ts | T20: ConfirmacaoPerfil.tsx contém o termo canônico 'Perfil da Entidade' | PASS | 0ms | 2026-04-29T17:43:43.222Z |
| ConfirmacaoPerfil.test.ts | G-A5 (PR-C) — conditional rendering por natureza_operacao_principal | PASS | 1ms | 2026-04-29T17:43:43.222Z |
| ConfirmacaoPerfil.test.ts | T21: shouldShowNCM true para 'Produção própria' | PASS | 0ms | 2026-04-29T17:43:43.222Z |
| ConfirmacaoPerfil.test.ts | T22: shouldShowNCM true para 'Comércio' | PASS | 0ms | 2026-04-29T17:43:43.222Z |
| ConfirmacaoPerfil.test.ts | T23: shouldShowNCM false para 'Prestação de serviço' isolado | PASS | 0ms | 2026-04-29T17:43:43.222Z |
| ConfirmacaoPerfil.test.ts | T24: shouldShowNBS true para 'Transporte' | PASS | 0ms | 2026-04-29T17:43:43.222Z |
| ConfirmacaoPerfil.test.ts | T25: shouldShowNBS true para 'Locação' | PASS | 0ms | 2026-04-29T17:43:43.222Z |
| ConfirmacaoPerfil.test.ts | T26: shouldShowNBS false para 'Comércio' isolado | PASS | 0ms | 2026-04-29T17:43:43.222Z |
| ConfirmacaoPerfil.test.ts | T27: 'Intermediação' (Misto) ativa AMBOS NCM e NBS | PASS | 0ms | 2026-04-29T17:43:43.222Z |
| ConfirmacaoPerfil.test.ts | T28: natureza vazia → ambos false | PASS | 0ms | 2026-04-29T17:43:43.222Z |
| ConfirmacaoPerfil.test.ts | G-A10 (PR-C) — validação inline NCM/NBS | PASS | 1ms | 2026-04-29T17:43:43.222Z |
| ConfirmacaoPerfil.test.ts | T29: isValidNcmFormat aceita NCM completo '1201.90.00' | PASS | 0ms | 2026-04-29T17:43:43.222Z |
| ConfirmacaoPerfil.test.ts | T30: isValidNcmFormat rejeita NCM truncado '1201' | PASS | 0ms | 2026-04-29T17:43:43.222Z |
| ConfirmacaoPerfil.test.ts | T31: isValidNcmFormat rejeita formato inválido '12019000' | PASS | 0ms | 2026-04-29T17:43:43.222Z |
| ConfirmacaoPerfil.test.ts | T32: isNbsInNcmField detecta NBS '1.0501.14.59' digitado em campo NCM | PASS | 0ms | 2026-04-29T17:43:43.222Z |
| ConfirmacaoPerfil.test.ts | T33: isNbsInNcmField rejeita NCM legítimo '1201.90.00' | PASS | 0ms | 2026-04-29T17:43:43.222Z |
| ConfirmacaoPerfil.test.ts | T34: isNbsInNcmField com whitespace ainda detecta NBS | PASS | 0ms | 2026-04-29T17:43:43.222Z |
| ConfirmacaoPerfil.test.ts | T35: isValidNcmFormat insensível a espaços nas pontas | PASS | 0ms | 2026-04-29T17:43:43.222Z |
| perfil-router.test.ts | T24: router perfil.ts importa isM2PerfilEntidadeEnabled (corrige feature flag morta) | PASS | 717ms | 2026-04-29T17:43:43.567Z |
| perfil-router.test.ts | T25: assertM2Enabled rejeita FORBIDDEN quando flag global = false e role = cliente | PASS | 0ms | 2026-04-29T17:43:43.567Z |
| perfil-router.test.ts | BUG-1 fix — guard isM2PerfilEntidadeEnabled consumido pelo router | PASS | 717ms | 2026-04-29T17:43:43.567Z |
| perfil-router.test.ts | validateM1Seed reuse — input gate compartilhado | PASS | 2ms | 2026-04-29T17:43:43.567Z |
| perfil-router.test.ts | T21: NCM truncado bloqueia (não duplicar regex no router perfil) | PASS | 1ms | 2026-04-29T17:43:43.567Z |
| perfil-router.test.ts | T22: CNAE placeholder bloqueia | PASS | 0ms | 2026-04-29T17:43:43.567Z |
| perfil-router.test.ts | T23: input válido (Produtor soja) passa | PASS | 0ms | 2026-04-29T17:43:43.567Z |
| perfil-router.test.ts | server/perfil-router.test.ts | PASS | 731ms | 2026-04-29T17:43:43.567Z |

## Summary

- **Pass:** 102
- **Fail:** 0
- **Skipped:** 0
- **Total:** 102
- **Started:** 2026-04-29T17:43:42.324Z
- **Finished:** 2026-04-29T17:43:43.583Z
