# Análise Técnica — Bug PC-04: Tela Branca Pós-Erro NCM/NBS

**Data:** 2026-04-30
**Autor:** Manus (investigação estática, sem alteração de código)
**Branch:** `investigation/pc-04-tela-branca-2026-04-30` (untracked, sem commit)
**main HEAD:** `1115647`
**Status:** Diagnóstico puro — aguardando decisão P.O. para despachar fix

---

## Bloco 2 — Diagnóstico Estático do Código

### 2.1 Lógica de render condicional NCM/NBS

As funções `shouldShowNCM` e `shouldShowNBS` (linhas 472-477 de `ConfirmacaoPerfil.tsx`) controlam a exibição condicional dos campos NCM e NBS com base na `natureza_operacao_principal`. Ambas verificam se algum item da natureza pertence a um conjunto pré-definido (`NATUREZA_REQUER_NCM` / `NATUREZA_REQUER_NBS`). Essas funções operam corretamente e não são a causa do bug — elas nunca chegam a ser avaliadas quando o erro ocorre.

### 2.2 Tratamento de erro no componente

O componente `ConfirmacaoPerfil.tsx` constrói um objeto `painelData` (linha 114) via `useMemo`, que depende de `perfilBuild.data`. Quando `perfilBuild` retorna erro (não dados), o `useMemo` nunca executa com dados válidos. A composição de `painelData` referencia `perfilBuild.data?.blockers`, `perfilBuild.data?.missing_required_fields` e `perfilBuild.data?.snapshot` — todos `undefined` quando há erro.

### 2.3 Early returns identificados

| Linha | Condição | Retorno |
|-------|----------|---------|
| 243 | `perfilGet.isLoading \|\| perfilBuild.isLoading` | Spinner (Loader2) |
| 251 | `perfilGet.error \|\| perfilBuild.error` | **Alert destrutivo + nada mais** |
| 265 | Nenhuma das anteriores | Página completa com painelData |

O early return da **linha 251** é o ponto exato onde a tela "fica em branco" — renderiza apenas o banner de erro e retorna, impedindo qualquer renderização do restante da página.

### 2.4 Uso de perfilBuild no componente

`perfilBuild` é chamado via `trpc.perfil.build.useQuery` (linha 85) com `enabled: projectId > 0 && !perfilGet.data?.confirmed`. Quando a query retorna erro, o React Query popula `perfilBuild.error` e mantém `perfilBuild.data` como `undefined`.

### 2.5 Validação no engine (backend)

O arquivo `server/lib/archetype/validateM1Input.ts` contém a validação NCM/NBS:

| Linha | Validação | Ação |
|-------|-----------|------|
| 82 | NCM obrigatório (natureza requer) | `throw TRPCError({ code: "BAD_REQUEST", message: "NCM_REQUIRED: ..." })` |
| 87-90 | NCM formato inválido (regex) | `throw TRPCError({ code: "BAD_REQUEST", message: "NCM_INVALID_FORMAT: ..." })` |
| 99-101 | NBS obrigatório | `throw TRPCError({ code: "BAD_REQUEST", message: "NBS_REQUIRED: ..." })` |

Todas as validações usam `throw TRPCError` — ou seja, o backend **não retorna 200 com blockers**, mas sim **lança exceção HTTP 4xx**.

---

## Bloco 3 — Root Cause

### Hipótese confirmada: **H1 + H3 combinados**

O fluxo completo do bug é:

```
1. Usuário cria projeto com NCM truncado (ex: "1201") ou NBS em campo NCM (ex: "1.0501.14.59")
2. Dados salvos em operationProfile.principaisProdutos[].ncm_code no banco
3. Usuário navega para /projetos/{id}/perfil-entidade
4. Frontend chama trpc.perfil.build.useQuery({ projectId })
5. Backend: perfil.build → buildSeedFromProject → extrai ncms_principais do operationProfile
6. Backend: validateM1Seed → NCM_REGEX.test(ncm) falha → throw TRPCError(BAD_REQUEST)
7. tRPC retorna HTTP 4xx com mensagem "NCM_INVALID_FORMAT: '1201' não está no formato..."
8. Frontend: perfilBuild.error é populado, perfilBuild.data permanece undefined
9. Frontend: linha 251 → if (perfilBuild.error) → early return com Alert apenas
10. Resultado: tela branca com banner de erro no topo, sem dimensões, sem score, sem CTA
```

**H2 descartada:** Não existe check `painelData === null` explícito — o componente nunca chega a avaliar `painelData` porque o early return na linha 251 intercepta antes.

### Arquivos e linhas envolvidos

| Arquivo | Linhas | Papel |
|---------|--------|-------|
| `server/lib/archetype/validateM1Input.ts` | 86-91 | Lança `TRPCError(BAD_REQUEST)` para NCM inválido |
| `server/routers/perfil.ts` | 228-234 | Chama `validateM1Seed` dentro de `perfil.build` |
| `client/src/pages/ConfirmacaoPerfil.tsx` | 251-259 | Early return fatal: renderiza apenas Alert |

---

## Bloco 4 — Reprodução Empírica

A reprodução empírica completa via browser automation não foi executada (requer Playwright headless com OAuth real). No entanto, a análise estática é **conclusiva** — o fluxo é determinístico:

O backend **sempre** lança `TRPCError(BAD_REQUEST)` quando `NCM_REGEX.test(ncm)` falha. Não há branch condicional, não há fallback, não há try/catch que converta em blockers. O `throw` na linha 87 de `validateM1Input.ts` é incondicional.

A evidência empírica dos Cenários 3 e 4 do smoke R3-A (screenshots do P.O.) confirma exatamente este comportamento: banner vermelho `NCM_INVALID_FORMAT` + tela branca abaixo.

### Análise: backend retorna 200 ou 4xx?

**Resposta definitiva: 4xx (BAD_REQUEST).** O backend lança `TRPCError` com `code: "BAD_REQUEST"`, que tRPC converte em HTTP 400. O frontend trata como `perfilBuild.error`, não como `perfilBuild.data` com blockers.

Esta é a distinção crítica para a escolha entre Opção A e Opção B (ver Bloco 5).

---

## Bloco 5 — Análise Comparativa das 3 Opções de Fix

### Opção A — Manter comportamento atual (tela branca + erro)

**Comportamento:** A página `/perfil-entidade` renderiza apenas o banner de erro `NCM_INVALID_FORMAT`. O restante (PC-01 status, PC-04 dimensões, PC-06 CTA) não aparece. O usuário vê uma tela branca com uma mensagem vermelha no topo.

**Prós:** Já implementado. Bloqueio funcional correto (CTA nunca habilita). Zero esforço de desenvolvimento.

**Contras:** UX confuso — o usuário não tem contexto do que foi inferido corretamente (papel, regime, território). Não há caminho de correção visível (sem botão "Voltar para CNAEs" ou "Editar perfil"). O usuário precisa navegar manualmente para corrigir o NCM. Aparência de "bug" mesmo sendo comportamento intencional.

### Opção B — Perfil parcial + erro destacado em campo + CTA desabilitado

**Comportamento:** O backend retorna HTTP 200 com um payload que inclui tanto as dimensões já deriváveis (papel, regime, território, objeto) quanto uma lista de `blockers` indicando o problema NCM/NBS. O frontend renderiza a página completa com as dimensões parciais, destaca o erro inline no campo NCM/NBS, e desabilita o CTA "Confirmar Perfil" com tooltip explicativo. Uma ação alternativa ("Voltar para CNAEs" ou "Editar perfil") é exibida.

**Mudanças necessárias:**

No **backend** (`validateM1Input.ts`): Converter os `throw TRPCError` de NCM/NBS em retorno de `blockers` com severity `HARD_BLOCK`. O engine continuaria computando as dimensões possíveis (papel, regime, território derivam de CNAE/natureza, não de NCM) e retornaria o snapshot parcial junto com os blockers. Isso requer refatorar `validateM1Seed` para retornar `{ valid: false, blockers: [...] }` ao invés de lançar exceção, e ajustar `perfil.build` para incluir os blockers no response.

No **frontend** (`ConfirmacaoPerfil.tsx`): Remover o early return da linha 251 para o caso específico de `perfilBuild.error` quando o erro é de validação NCM/NBS. Alternativamente, se o backend agora retorna 200 com blockers, o `perfilBuild.data` existirá e o early return nunca será atingido — o componente renderizará normalmente com os blockers exibidos inline.

**Prós:** Usuário vê contexto completo. Erro específico no campo problemático. Caminho de correção claro. UX profissional.

**Contras:** Requer refatoração do backend (validateM1Seed) para retornar blockers ao invés de throw. Risco de regressão nos testes existentes que esperam TRPCError (8 arquivos de teste referenciam validateM1Seed). Esforço médio.

### Opção C — Bloquear upstream em /projetos/novo antes de avançar

**Comportamento:** A validação NCM/NBS (regex `NNNN.NN.NN`) é aplicada no formulário legacy `/projetos/novo` (componente `PerfilEmpresaIntelligente.tsx`), impedindo que o usuário avance para a etapa seguinte com NCM/NBS inválido. A página `/perfil-entidade` nunca receberia input inválido.

**Mudanças necessárias:** Adicionar validação regex no componente `PerfilEmpresaIntelligente.tsx` no campo de input NCM. O formulário já mostra "Formato inválido. Use NNNN.NN.NN" (evidência do screenshot do P.O.), mas essa validação é **apenas visual** — o dado é salvo mesmo com formato inválido. A correção seria impedir o submit/avanço quando o NCM não passa na regex.

**Prós:** Defesa em profundidade. Usuário corrige cedo, contexto fresco. `/perfil-entidade` fica simples (assume input válido).

**Contras:** Requer mudança em `PerfilEmpresaIntelligente.tsx` (form legacy complexo). Validação dupla (form legacy + engine) pode divergir no futuro. Esforço alto. O M1 monitor já aceita seeds inválidos como input do admin — cria assimetria.

**Observação importante:** O screenshot do P.O. mostra que o frontend **já exibe** "Formato inválido. Use NNNN.NN.NN" no campo NCM, mas o dado é salvo mesmo assim. Isso indica que a validação frontend existe como hint visual mas não como bloqueio de submit. A Opção C corrigiria isso.

---

## Bloco 6 — Custo de Cada Opção

| Opção | Esforço Claude Code | Arquivos tocados | Risco regressão | Testes impactados |
|-------|---------------------|------------------|-----------------|-------------------|
| A (manter) | 0 | 0 | 0 | 0 |
| B (perfil parcial) | ~1-2h | 3 (validateM1Input.ts, perfil.ts, ConfirmacaoPerfil.tsx) | Baixo-Médio (8 test files referenciam validateM1Seed) | ~8 arquivos de teste precisam ajuste |
| C (validação upstream) | ~3-4h | 2+ (PerfilEmpresaIntelligente.tsx + form validation logic) | Médio (toca form legacy complexo) | Novos testes necessários |
| B + C (combinado) | ~4-5h | 5+ | Médio | ~10 arquivos |

---

## Recomendação Técnica (Manus)

**Recomendação: Opção B (perfil parcial) como fix principal, com Opção C como follow-up não-bloqueante.**

A justificativa técnica é a seguinte. A Opção B resolve o problema na camada correta: a página `/perfil-entidade` é o ponto onde o usuário precisa de contexto para entender e corrigir o problema. Converter `validateM1Seed` de "throw exception" para "return blockers" é uma melhoria arquitetural — o padrão de retornar blockers já existe no engine (o `buildSnapshot` retorna `status_arquetipo: "bloqueado"` com blockers), e a validação NCM/NBS deveria seguir o mesmo padrão ao invés de curto-circuitar com exceção.

A Opção C é desejável como defesa em profundidade, mas não resolve o problema de UX quando o usuário já tem dados inválidos salvos (projetos existentes). Além disso, o form legacy `PerfilEmpresaIntelligente.tsx` é complexo e tocá-lo tem risco de regressão maior.

A Opção A é aceitável como decisão consciente de P.O. se o bug for considerado edge-case raro (apenas users que digitam NCM truncado ou NBS em campo NCM), mas a UX é objetivamente ruim.

**Prioridade sugerida:** B agora (sprint corrente), C no backlog M3.
