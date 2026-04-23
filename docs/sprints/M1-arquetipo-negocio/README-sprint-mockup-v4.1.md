# README — Sprint Mockup v4.1 · Painel de Confiança

**Data:** 2026-04-23  
**Branch:** `docs/m1-arquetipo-exploracao`  
**Status:** artefato de análise pré-M1 · sem implementação

---

## O que este sprint entregou

Este sprint consolidou o Delta v4 (fluxo de CNAEs via modal) com a proposta do Painel de Confiança enterprise, elevando o mockup do formulário de Perfil da Entidade a um padrão de decisão assistida.

### Entregáveis

| ID | Arquivo | Tipo | Descrição |
|----|---------|------|-----------|
| D1 | `MOCKUP_perfil_entidade_deterministico_v4_1.html` | Mockup HTML | Formulário com Painel de Confiança enterprise (6 estados) |
| D2 | `M1-ARQUETIPO-FORM-DELTA-v4.1.md` | Delta consolidado | Especificação completa do v4.1 (13 seções) |
| D3 | `ADR-M1-PAINEL-CONFIANCA-E-CNAES-v1.md` | ADR | Decisão arquitetural e de produto |
| D4 | `CONTRATO-M1-PAINEL-CONFIANCA-v1.json` | Contrato de dados | Schema completo do estado do painel |
| D5 | `README-sprint-mockup-v4.1.md` | Este arquivo | Resumo executivo do sprint |

---

## O que mudou visualmente (v4 → v4.1)

### Adicionado no v4.1

O **Painel de Confiança** substitui o painel JSON técnico anterior. Ele ocupa a coluna direita em layout sticky e contém:

- **Score de confiança** (0–100) com anel visual e faixa (Baixa/Média/Alta)
- **Breakdown em 3 dimensões:** Completude (40%), Inferência validada (30%), Coerência (30%)
- **Lista priorizada de pendências** com cards de issue (HARD_BLOCK, PENDENTE_CRITICO, PENDENTE, INFO) e botão "Ir para campo"
- **Snapshot do Perfil da Entidade** com leitura textual do sistema
- **Preview de impacto nos riscos** (seção PC-05 — exploratória)
- **CTAs de confirmação e briefing** com estado habilitado/desabilitado explícito

### Preservado do v4

Todos os elementos do Delta v4 foram preservados sem regressão:

- Botão "Identificar CNAEs" após `descricao_negocio`
- Modal com sugestões automáticas e badge de confiança por CNAE
- Multi-select editável de CNAEs (allow_add, allow_remove)
- `auto_open_blocos_based_on_cnae`
- `show_confidence_cnae`
- `show_detected_profile_preview`
- "Perfil da Entidade" como único termo de UI (sem "Arquétipo")

### Removido (permanente desde v4)

- `cnae_principal_input` — campo de texto livre para CNAE

---

## O que é regra (não negociável)

| Regra | Descrição |
|-------|-----------|
| Gate E2E | `status_arquetipo = confirmado` é a única condição para liberar o briefing |
| HARD_BLOCK | Com HARD_BLOCK ativo, o botão "Confirmar Perfil da Entidade" permanece desabilitado |
| Score ≠ gate | Score alto não libera o fluxo sem confirmação explícita do Perfil da Entidade |
| CNAEs obrigatórios | Mínimo de 1 CNAE confirmado para avançar no formulário |
| Sem regressão | `cnae_principal_input` não deve ser reintroduzido |
| Termo de UI | Apenas "Perfil da Entidade" na UI — "arquétipo" é termo técnico interno |

---

## O que depende de spec antes de implementação

| Item | Status |
|------|--------|
| Algoritmo de cálculo do score (fórmula exata, pesos) | Exploratório — a definir |
| Lógica de inferência de CNAEs por `descricao_negocio` | Exploratório — lookup estático ou LLM |
| Persistência do estado do painel entre sessões | Não especificado |
| Comportamento mobile do painel colapsável | Exploratório |
| Integração PC-05 com motor de riscos real | Fase futura |

---

## O que ainda é exploratório

O Painel de Confiança como conceito de UX está aprovado. Os seguintes aspectos são exploratórios e não devem ser implementados sem spec:

- Os valores de score exibidos no mockup (10%, 25%, 40%, 60%, 70%, 90%) são ilustrativos — não representam o algoritmo real.
- A seção PC-05 (impacto nos riscos) é um placeholder — o motor de riscos real será especificado em fase posterior.
- O comportamento mobile do painel é indicado como "colapsável com resumo no topo" mas não foi mockado neste sprint.

---

## Estados do mockup v4.1

| Estado | Descrição | Score ilustrativo | Status |
|--------|-----------|-------------------|--------|
| S1 | Início — `descricao_negocio` preenchida, CNAEs pendentes | 10% | Em construção |
| S2 | Modal "Identificar CNAEs" aberto | 25% | Pendente |
| S3 | CNAEs confirmados + profile preview | 40% | Pendente |
| S4 | Blocos 1 e 2 pré-abertos por CNAE | 60% | Pendente |
| S5 | HARD_BLOCK ativo (NCM ausente) | 70% | Bloqueado |
| S6 | Perfil da Entidade confirmado | 90% | Confirmado |

---

## Próximos passos (dependem de aprovação do P.O.)

1. Aprovação do conceito do Painel de Confiança pelo P.O.
2. Spec do algoritmo de score (fórmula, pesos, fontes de dados)
3. Decisão sobre inferência de CNAEs (lookup estático vs. LLM)
4. Spec do comportamento mobile
5. Abertura de issue no Milestone #7 para implementação

---

*README gerado em 2026-04-23 · branch `docs/m1-arquetipo-exploracao` · artefato pré-M1 · sem implementação*
