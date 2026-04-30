# Vitest Realtime Progress

**Started:** 2026-04-30T12:18:03.288Z
**Output:** reports/battery-current/progress.md

| Arquivo | Teste | Estado | Duração | Timestamp |
|---|---|---|---|---|
| diagnostic-integration.test.ts | server/integration/diagnostic-integration.test.ts | FAIL | 43ms | 2026-04-30T12:18:04.177Z |
| diagnostic-integration.test.ts | Bloco 3 — Leitura centralizada: getDiagnosticSource | FAIL | 25ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | 3.1 Projeto V1 — leitura correta | FAIL | 14ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | retorna todos os campos V1 e nenhum campo V3 | FAIL | 10ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | V1: assertFlowVersion permite acesso a endpoints V1 | PASS | 2ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | V1: assertFlowVersion BLOQUEIA acesso a endpoints V3 | PASS | 1ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | V1: validateV1DataSufficiency retorna null quando dados suficientes | PASS | 0ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | 3.2 Projeto V3 — leitura correta | FAIL | 4ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | retorna todos os campos V3 e nenhum campo V1 | FAIL | 3ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | V3: assertFlowVersion permite acesso a endpoints V3 | PASS | 1ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | V3: assertFlowVersion BLOQUEIA acesso a endpoints V1 | PASS | 0ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | V3: validateV3DataSufficiency retorna null quando dados suficientes | PASS | 0ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | 3.3 Projeto híbrido — comportamento definido | FAIL | 4ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | retorna flowVersion='hybrid' com ambos os campos disponíveis | FAIL | 1ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | híbrido: assertFlowVersion NÃO bloqueia (estado documentado, não bloqueante) | PASS | 2ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | 3.4 Sem leitura ambígua — isolamento garantido pelo adaptador | FAIL | 3ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | V3 puro: nenhum campo V1 é exposto mesmo que existam no banco | FAIL | 1ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | V1 puro: nenhum campo V3 é exposto mesmo que existam no banco | FAIL | 2ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | Bloco 4 — State Machine: validateTransition e getResumePoint | PASS | 8ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | 4.1 Projeto V1 — fluxo de estados | PASS | 2ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | projeto novo: currentStep=1, status=rascunho | PASS | 1ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | projeto V1 com corporateAnswers: pode avançar para operacional | PASS | 0ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | projeto V1 sem corporateAnswers: NÃO pode avançar para operacional | PASS | 0ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | projeto V1 com todos os dados: pode avançar para briefing | PASS | 0ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | 4.2 Projeto V3 — fluxo de estados | PASS | 1ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | projeto V3 com briefing: pode avançar para riscos | PASS | 0ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | projeto V3 sem briefing: NÃO pode avançar para riscos | PASS | 0ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | projeto V3 com riscos: pode avançar para plano | PASS | 0ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | 4.3 Mudança de rota — não pode pular etapas | PASS | 1ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | não pode pular do step 1 para o step 5 | PASS | 0ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | DOCUMENTA: state machine permite retroceder (comportamento de revisão) | PASS | 0ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | 4.4 Reload da página — getResumePoint consistente | PASS | 1ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | projeto no step 5 retoma no step 5 após reload | PASS | 0ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | projeto no step 8 com briefing retoma no step 8 | PASS | 0ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | resumeData reflete corretamente o estado do projeto | PASS | 0ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | 4.5 Stepper — consistência de FLOW_STEPS | PASS | 3ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | FLOW_STEPS tem 11 etapas definidas | PASS | 1ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | cada etapa tem stepNumber único e sequencial | PASS | 2ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | cada etapa tem stepName único | PASS | 0ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | etapas de diagnóstico V1 têm gates corretos | PASS | 0ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | Bloco 6 — Integridade de dados | FAIL | 10ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | 6.1 Projeto V1 puro — sem sobrescrita V3 | FAIL | 4ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | dados V1 retornados são idênticos ao que está no banco | FAIL | 2ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | leitura V1 não modifica os dados originais | FAIL | 2ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | 6.2 Projeto V3 puro — sem sobrescrita V1 | FAIL | 1ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | dados V3 retornados são idênticos ao que está no banco | FAIL | 1ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | 6.3 Projeto híbrido — ambos os dados disponíveis sem perda | FAIL | 1ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | dados V1 e V3 coexistem sem perda no estado híbrido | FAIL | 1ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | 6.4 Rollback após V3 — dados V1 preservados | FAIL | 2ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | após rollback para V1, dados V1 originais são preservados | FAIL | 1ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | determineFlowVersion é determinístico pós-rollback | PASS | 0ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | 6.5 Sem duplicidade inconsistente | FAIL | 2ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | flowVersion é único e imutável para cada estado de projeto | PASS | 0ms | 2026-04-30T12:18:04.178Z |
| diagnostic-integration.test.ts | leitura múltipla do mesmo projeto retorna dados idênticos (sem efeito colateral) | FAIL | 1ms | 2026-04-30T12:18:04.178Z |

## Summary

- **Pass:** 25
- **Fail:** 11
- **Skipped:** 0
- **Total:** 36
- **Started:** 2026-04-30T12:18:03.288Z
- **Finished:** 2026-04-30T12:18:04.200Z
