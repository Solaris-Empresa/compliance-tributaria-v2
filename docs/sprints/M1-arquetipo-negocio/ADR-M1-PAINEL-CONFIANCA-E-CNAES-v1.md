# ADR-M1-PAINEL-CONFIANCA-E-CNAES-v1

**Título:** Painel de Confiança lateral e fluxo de identificação de CNAEs no formulário de Perfil da Entidade  
**Status:** PROPOSTO (pré-M1 · aguarda aprovação do P.O. para implementação)  
**Data:** 2026-04-23  
**Branch:** `docs/m1-arquetipo-exploracao`  
**Autores:** Orquestrador Claude / Manus (implementador)  
**Referências:** `M1-ARQUETIPO-FORM-DELTA-v4.1.md` · `CONTRATO-M1-PAINEL-CONFIANCA-v1.json` · `MOCKUP_perfil_entidade_deterministico_v4_1.html`

---

## Contexto do problema

O formulário de Perfil da Entidade (arquétipo) é a porta de entrada do fluxo E2E de compliance. Antes do Delta v4, o formulário apresentava dois problemas estruturais:

**Problema 1 — Entrada de CNAE por texto livre.** O campo `cnae_principal_input` permitia que o usuário digitasse um código CNAE manualmente, sem sugestão, sem validação de confiança e sem capacidade de informar múltiplos CNAEs. Isso gerava perfis imprecisos e blocos condicionais mal ativados.

**Problema 2 — Ausência de feedback de progresso.** O usuário não tinha visibilidade sobre: (a) quais campos faltavam, (b) por que o botão de briefing estava bloqueado, (c) qual era a leitura atual do sistema sobre o perfil da entidade. O único feedback era o bloqueio do CTA, sem explicação.

O Delta v4 resolveu o Problema 1 com o modal de identificação de CNAEs e o multi-select editável. O Delta v4.1 resolve o Problema 2 com o Painel de Confiança.

---

## Decisão

**Adotar o Painel de Confiança como componente lateral persistente no formulário de Perfil da Entidade**, com as seguintes características:

1. **Posição:** coluna direita, sticky, visível durante todo o preenchimento do formulário.
2. **Score de confiança:** valor 0–100 com breakdown explícito em três dimensões (Completude, Inferência validada, Coerência).
3. **Lista de pendências:** issues priorizadas (HARD_BLOCK > PENDENTE_CRITICO > PENDENTE > INFO) com CTA de navegação direta ao campo.
4. **Snapshot do Perfil da Entidade:** leitura em tempo real dos campos-chave do perfil.
5. **CTA de confirmação:** botão "Confirmar Perfil da Entidade" habilitado apenas quando sem HARD_BLOCKs.
6. **CTA de briefing:** botão "Continuar para o briefing" habilitado apenas quando `status_arquetipo = confirmado`.
7. **Regra explícita:** texto permanente explicando o gate do fluxo.

**Adotar o fluxo de identificação de CNAEs via modal** (consolidado do Delta v4):

1. Campo `cnae_principal_input` removido permanentemente.
2. Botão "Identificar CNAEs" após `descricao_negocio`, habilitado com ≥ 10 caracteres.
3. Modal com sugestões automáticas e badge de confiança por CNAE (Alta/Média/Baixa).
4. Multi-select editável (`allow_add=true`, `allow_remove=true`, mínimo 1 CNAE).
5. `auto_open_blocos_based_on_cnae`: CNAEs pré-abrem e pré-preenchem blocos condicionais.
6. `show_detected_profile_preview`: painel de pré-visualização após confirmação dos CNAEs.

---

## Alternativas rejeitadas

### Alternativa A — Manter painel JSON técnico (estado anterior ao v4.1)

O painel anterior exibia o objeto JSON do perfil em construção. Foi rejeitado porque: (a) não é legível para o usuário final, (b) não indica o que falta, (c) não explica o bloqueio do fluxo, (d) não oferece CTA de correção.

### Alternativa B — Barra de progresso linear simples

Uma barra de progresso de 0–100% sem breakdown foi considerada. Rejeitada porque: (a) não distingue entre completude, inferência e coerência, (b) não mostra o que está bloqueando especificamente, (c) não oferece CTA de navegação ao campo problemático.

### Alternativa C — Painel colapsável por padrão

Painel fechado por padrão, aberto sob demanda. Rejeitado porque: (a) o usuário não saberia que há pendências sem abrir o painel, (b) o gate do briefing ficaria opaco, (c) a experiência de "por que está bloqueado?" seria degradada.

### Alternativa D — Tooltip no botão de briefing

Explicar o bloqueio apenas via tooltip no botão desabilitado. Rejeitado porque: (a) tooltips são difíceis de descobrir, (b) não oferecem lista de pendências, (c) não permitem navegação direta ao campo problemático.

### Alternativa E — Manter `cnae_principal_input` com autocomplete

Manter o campo de texto com autocomplete de CNAE. Rejeitado porque: (a) não suporta múltiplos CNAEs, (b) não exibe confiança por CNAE, (c) não ativa `auto_open_blocos_based_on_cnae`, (d) regride o fluxo aprovado no Delta v4.

---

## Consequências

### Positivas

- O usuário tem visibilidade completa do estado do caso em tempo real.
- O gate do briefing é explicado, não apenas bloqueado.
- A lista de pendências com CTA reduz o tempo de preenchimento e os erros por omissão.
- O snapshot do Perfil da Entidade permite que o usuário valide a leitura do sistema antes de confirmar.
- O fluxo de CNAEs via modal garante múltiplos CNAEs com confiança explícita.
- A seção PC-05 (impacto nos riscos) prepara o usuário para a etapa seguinte.

### Negativas / riscos

- O painel aumenta a complexidade da UI — requer cuidado no design mobile.
- O algoritmo de score de confiança precisa ser especificado com precisão antes da implementação para evitar inconsistências.
- A lógica de inferência de CNAEs por `descricao_negocio` (confiança Alta/Média/Baixa) precisa ser definida — lookup estático ou LLM.
- O painel sticky em mobile pode sobrepor conteúdo se não for tratado como colapsável.

### Neutras

- O painel não altera a lógica de negócio do formulário — apenas torna o estado visível.
- O score de confiança é informativo; o gate do fluxo continua sendo controlado por `status_arquetipo`.

---

## Relação com o Perfil da Entidade

O Painel de Confiança é o espelho visual do Perfil da Entidade em construção. Cada campo preenchido no formulário atualiza o painel. O snapshot (PC-04) exibe os mesmos campos que compõem o objeto `PerfilEntidade` no backend:

```
natureza_da_operacao, cnaes[], papel_operacional,
setor_regulado, orgao_regulador, abrangencia_geografica,
territorio_incentivado, comercio_exterior
```

A confirmação do Perfil da Entidade (CTA "Confirmar Perfil da Entidade") é o ato que muda `status_arquetipo` de `pendente` para `confirmado`. Sem esta confirmação explícita, o gate E2E permanece fechado mesmo com score alto.

---

## Relação com o gate E2E

O gate E2E é a única condição que libera o botão "Continuar para o briefing":

```
gate_e2e.can_continue = true
  ← status_arquetipo = "confirmado"
  AND issues.filter(tipo = "HARD_BLOCK").length = 0
```

O Painel de Confiança torna este gate visível através de:
- Badge "Fluxo E2E" com estados: Bloqueado / Aguardando confirmação / Liberado
- Regra explícita permanente no rodapé do painel
- Tooltip no botão desabilitado: "Complete e confirme o Perfil da Entidade para liberar o próximo passo."

---

## Relação com a rastreabilidade de risco

A seção PC-05 do painel ("Como isso impactará os riscos") é o primeiro ponto de contato do usuário com a rastreabilidade de risco. Ela exibe um preview dos riscos previstos com base no perfil atual, preparando o usuário para a etapa de análise de riscos.

Na etapa de riscos, o sistema mostrará por que cada risco foi apontado, com base em três elementos: os dados do Perfil da Entidade, a regra aplicada e a base legal correspondente. O Painel de Confiança estabelece a expectativa desta rastreabilidade desde o preenchimento do formulário.

---

## Critérios de implementação (pré-condições para codificação)

Os seguintes itens devem ser especificados antes de qualquer implementação:

1. Algoritmo de cálculo do score de confiança (fórmula, pesos, fontes de dados)
2. Lógica de inferência de CNAEs por `descricao_negocio` (lookup estático vs. LLM)
3. Persistência do estado do painel entre sessões
4. Comportamento mobile do painel colapsável
5. Integração do PC-05 com o motor de riscos real

**Nenhum destes itens deve ser implementado sem aprovação explícita do P.O.**

---

*ADR gerado em 2026-04-23 · branch `docs/m1-arquetipo-exploracao` · artefato pré-M1 · sem implementação*
