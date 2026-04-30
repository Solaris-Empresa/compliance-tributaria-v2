# Vitest Realtime Progress

**Started:** 2026-04-30T11:49:52.055Z
**Output:** reports/battery-current/progress.md

| Arquivo | Teste | Estado | Duração | Timestamp |
|---|---|---|---|---|
| perfil-router.test.ts | computePerfilHash — determinismo + canonical | PASS | 7ms | 2026-04-30T11:49:52.519Z |
| perfil-router.test.ts | T1: mesmo input produz mesmo hash (determinístico) | PASS | 3ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T2: ordem de elementos em arrays NÃO altera hash (sort canonical) | PASS | 0ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T3: whitespace em strings de array NÃO altera hash (trim canonical) | PASS | 0ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T4: project_id diferente produz hash diferente | PASS | 1ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T5: cnpj diferente produz hash diferente | PASS | 0ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T6: dim_objeto diferente produz hash diferente | PASS | 0ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T7: subnatureza_setorial undefined trata como [] | PASS | 0ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | Constantes alinhadas com baseline determinístico | PASS | 3ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T8: RULES_HASH bate byte-a-byte com auditoria v7.60 | PASS | 0ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T9: RULES_VERSION e MODEL_VERSION = m1-v1.0.0 | PASS | 0ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T10: DATA_VERSION é ISO-8601 UTC válido (pós-#860) | PASS | 2ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | isM2PerfilEntidadeEnabled — 5 etapas de rollout | PASS | 2ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T11: Step 1 — flag global false default | PASS | 0ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T12: Step 3 — equipe_solaris com env opt-in | PASS | 0ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T13: Step 3 alt — whitelist de projetos via env | PASS | 0ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T14: Step 4 — flag global true ativa para todos | PASS | 0ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T15: env M2_PERFIL_ENTIDADE_ENABLED=false sobrescreve flag global true | PASS | 0ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T16: E2E_TEST_MODE=true sempre ativa | PASS | 0ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | FSM dual-path — preserva legado + adiciona perfil_entidade_confirmado | PASS | 2ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T17: cnaes_confirmados → perfil_entidade_confirmado é VÁLIDA (M2) | PASS | 1ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T18: cnaes_confirmados → onda1_solaris ainda VÁLIDA (legado preservado) | PASS | 0ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T19: perfil_entidade_confirmado → onda1_solaris é VÁLIDA | PASS | 0ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T20: VALID_TRANSITIONS.cnaes_confirmados contém AMBOS os destinos | PASS | 1ms | 2026-04-30T11:49:52.520Z |
| perfil-router.test.ts | T24: router perfil.ts importa isM2PerfilEntidadeEnabled (corrige feature flag morta) | PASS | 18828ms | 2026-04-30T11:50:11.354Z |
| perfil-router.test.ts | T25: assertM2Enabled rejeita FORBIDDEN quando flag global = false e role = cliente | PASS | 0ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | BUG-1 fix — guard isM2PerfilEntidadeEnabled consumido pelo router | PASS | 18828ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | validateM1Seed reuse — input gate compartilhado | PASS | 2ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T21: NCM truncado bloqueia (não duplicar regex no router perfil) | PASS | 1ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T22: CNAE placeholder bloqueia | PASS | 0ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T23: input válido (Produtor soja) passa | PASS | 0ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | PR-D — buildSeedFromProject mapeia legacy → Seed corretamente | PASS | 7ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T26: Bug-1 fix — agronegocio mapeia para 'Produtor/fabricante' (não 'Produtor') | PASS | 1ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T27: Bug-1 fix — misto mapeia para 'Atacadista' (decisão P.O.) | PASS | 0ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T28: Bug-1 fix — financeiro mapeia para 'Operadora' (operadora_regulada) | PASS | 0ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T29: Bug-1 regressão — industria continua 'Produtor/fabricante' | PASS | 0ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T30: Bug-1 regressão — comercio continua 'Atacadista' | PASS | 0ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T31: Bug-1 regressão — servicos continua 'Prestador de servico' | PASS | 0ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T32: Bug-2 fix — taxRegime snake_case 'simples_nacional' → 'Simples Nacional' | PASS | 2ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T33: Bug-2 fix — taxRegime snake_case 'lucro_presumido' → 'Lucro Presumido' | PASS | 0ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T34: Bug-2 fix — taxRegime snake_case 'lucro_real' → 'Lucro Real' | PASS | 0ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T35: Bug-2 fix — taxRegime snake_case 'mei' → 'MEI' | PASS | 0ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T36: Bug-2 idempotência — taxRegime title case 'Lucro Real' → 'Lucro Real' | PASS | 0ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T37: Bug-2 idempotência — taxRegime title case 'Simples Nacional' → 'Simples Nacional' | PASS | 0ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T38: Bug-2 fallback — taxRegime desconhecido passa direto (deriveRegime resolverá) | PASS | 0ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T39: Cenário Soja real — agronegocio + lucro_presumido + NCM válido = Seed completa | PASS | 1ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | PR-E — fontes_receita derivado de naturezaFromLegacy via NATUREZA_TO_FONTES | PASS | 3ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T40: agronegocio gera fontes_receita=['Producao propria'] | PASS | 0ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T41: industria gera fontes_receita=['Producao propria'] | PASS | 0ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T42: comercio gera fontes_receita=['Venda de mercadoria'] | PASS | 0ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T43: servicos gera fontes_receita=['Prestacao de servico'] | PASS | 0ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T44: misto gera fontes_receita=['Venda de mercadoria','Prestacao de servico'] | PASS | 1ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T45: financeiro gera fontes_receita=['Prestacao de servico'] | PASS | 0ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | PR-E — fluxo completo: projects row → buildSeedFromProject → buildSnapshot | PASS | 10ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T46: agronegocio + lucro_presumido → tipo_de_relacao contém 'producao', V-LC-102 NÃO dispara | PASS | 4ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T47: industria + lucro_real → tipo_de_relacao contém 'producao', papel='fabricante' | PASS | 1ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T48: comercio + simples_nacional → tipo_de_relacao=['venda'], papel='distribuidor' | PASS | 1ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T49: servicos + lucro_presumido + NBS → tipo_de_relacao=['servico'], papel='prestador' | PASS | 1ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T50: misto + lucro_presumido → tipo_de_relacao contém 'venda' e 'servico' | PASS | 1ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | T51: financeiro + lucro_real → tipo_de_relacao=['servico'], papel='operadora_regulada' | PASS | 2ms | 2026-04-30T11:50:11.356Z |
| perfil-router.test.ts | server/perfil-router.test.ts | PASS | 18864ms | 2026-04-30T11:50:11.356Z |

## Summary

- **Pass:** 51
- **Fail:** 0
- **Skipped:** 0
- **Total:** 51
- **Started:** 2026-04-30T11:49:52.055Z
- **Finished:** 2026-04-30T11:50:11.381Z
