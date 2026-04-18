# DIV-Z01-006 — Backend implementado sem frontend conectado
## IA SOLARIS · Governance

**Sprint:** Z-01
**ID:** 006
**Data:** 2026-04-07
**Reportado por:** Orquestrador (E2E manual pós-sprint)
**Status:** RESOLVIDA · Gate FC implementado

---

## Divergência identificada

| Item | Esperado (TO-BE DEC-M3-05) | Realizado |
|---|---|---|
| Q.Produtos na UI | Tela "Q. de Produtos" com perguntas NCM | Tela "Questionário Corporativo" genérico |
| Q.Serviços na UI | Tela "Q. de Serviços" com perguntas NBS | Tela "Questionário Operacional" genérico |
| Rotas em App.tsx | /questionario-produto · /questionario-servico | Rotas inexistentes |
| DiagnosticoStepper | Steps 4 e 5 com labels TO-BE | Steps 4 e 5 com labels AS-IS |

## Causa raiz

Os prompts da Sprint Z-01 especificaram apenas o backend:
  - server/lib/product-questions.ts ✅
  - server/lib/service-questions.ts ✅
  - server/integration/*.test.ts ✅

Nenhum prompt especificou:
  - Qual componente React chama qual procedure tRPC
  - Que App.tsx precisa de novas rotas
  - Que DiagnosticoStepper.tsx precisa ser atualizado
  - Que QuestionarioIaGen.tsx precisa corrigir navegação

## Por que os testes não detectaram

198 testes testaram funções isoladas com mocks. Nenhum teste verificou:
  - Se trpc.fluxoV3.getProductQuestions está registrado no router
  - Se algum componente React chama este hook
  - Se a rota /questionario-produto existe em App.tsx

## Impacto

Feature completa no backend · invisível para o usuário · E2E manual revelou

## Resolução

Gate FC implementado: antes de mergear PR com procedure tRPC nova,
verificar se existe consumidor no frontend (grep + test manifest).
Definição de "done" atualizada para incluir frontend.

**Corrigido em:** PR feat/z02-to-be-flow-refactor (em andamento)
