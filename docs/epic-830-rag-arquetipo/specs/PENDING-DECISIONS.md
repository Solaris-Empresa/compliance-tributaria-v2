# Decisões abertas na exploração pré-M1

> Lista viva. Pontos em discussão ainda não consolidados em ADR nem em
> arquivo de `decisions/`.

## Decisões em discussão

### UX de erro para consultor tributário
**Pergunta:** quando gate bloqueia risco por arquétipo, como explicar ao
consultor de forma que ele confie? Mostra regra aplicada? Permite override?
**Impacto:** médio-alto — afeta adoção.
**Status:** não decidido.

### "Regime específico" no enum (BLOCKER #7)
**Pergunta:** remover do enum ou adicionar campo dependente com
tipo_regime_especifico?
**Impacto:** baixo — cosmético.
**Status:** aguardando decisão P.O.

### Processo de recálculo explícito
**Pergunta:** como consultor aciona recálculo de arquétipo de um projeto
específico? Botão na UI? Endpoint admin? Bloqueado até ADR?
**Impacto:** médio — relacionado à política de imutabilidade já consolidada.
**Status:** pós-M1. Não bloqueia exploração.

## Decisões consolidadas

### ✅ Política de imutabilidade do arquétipo
**Decisão:** arquétipo é snapshot imutável após cálculo. Não recalcula
retroativamente.
**Data:** 2026-04-23
**Fonte:** feedback do consultor (ajuste não-bloqueante 1)
**Documentação:** README do diretório, seção "Política de versionamento e imutabilidade"
**Próximo passo:** formalizar em ADR-0032 (após ADR-0031 do modelo dimensional)

### ✅ Política de não migração de dados
**Decisão:** empresas cadastradas com modelo antigo permanecem com modelo
antigo. Não há migração automática quando modelo evolui.
**Data:** 2026-04-23
**Fonte:** feedback do consultor (ajuste não-bloqueante 2)
**Documentação:** README do diretório, seção "Política de versionamento e imutabilidade"
**Próximo passo:** formalizar em ADR-0032 junto com imutabilidade
