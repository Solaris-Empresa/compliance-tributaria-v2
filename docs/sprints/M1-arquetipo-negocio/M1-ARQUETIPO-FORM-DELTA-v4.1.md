# M1-ARQUETIPO-FORM-DELTA-v4.1

**Versão:** v4.1 (consolidado)  
**Data:** 2026-04-23  
**Branch:** `docs/m1-arquetipo-exploracao`  
**Status:** artefato de análise pré-M1 · sem implementação  
**Baseline obrigatória:** `M1-ARQUETIPO-FORM-DELTA-v4.md` (preservada integralmente)  
**Mockup:** `MOCKUP_perfil_entidade_deterministico_v4_1.html`  
**ADR:** `ADR-M1-PAINEL-CONFIANCA-E-CNAES-v1.md`  
**Contrato:** `CONTRATO-M1-PAINEL-CONFIANCA-v1.json`

---

## 1. Objetivo do Painel de Confiança

O **Painel de Confiança** é um componente lateral persistente que acompanha o preenchimento do formulário de Perfil da Entidade. Seu propósito é duplo: oferecer ao usuário uma leitura em tempo real da qualidade e completude do caso, e controlar visualmente o gate de liberação do fluxo E2E para o briefing.

O painel não é um elemento estético. Ele é parte do controle do fluxo — sem ele, o usuário não tem visibilidade sobre por que o botão "Continuar para o briefing" está bloqueado, quais campos faltam e qual é a leitura atual do sistema sobre o Perfil da Entidade.

**Distinção fundamental:** o score de confiança é uma camada de explicabilidade. Ele não substitui o gate do fluxo. Um caso com score de 70% mas com um HARD_BLOCK ativo permanece bloqueado. O gate só abre quando `status_arquetipo = confirmado` e não há HARD_BLOCKs ativos.

---

## 2. Estrutura visual do painel

O painel ocupa a coluna direita em layout de duas colunas (32–36% da largura em desktop). Em mobile, é colapsável com resumo no topo.

| Seção | ID | Conteúdo |
|-------|----|----------|
| Resumo Executivo | PC-01 | Score total (anel/barra), status badge, gate badge, mensagem executiva |
| Composição da confiança | PC-02 | Breakdown das 3 dimensões com barras individuais |
| Pendências e bloqueios | PC-03 | Lista priorizada de issues com CTA de correção |
| Snapshot do Perfil da Entidade | PC-04 | Campos-chave do perfil + leitura textual do sistema |
| Impacto nos riscos | PC-05 | Preview dos riscos previstos com base no perfil |
| Liberação do próximo passo | PC-06 | CTA de confirmação + CTA de briefing + regra explícita |

---

## 3. Composição da confiança

A confiança do caso é composta por três dimensões com pesos visuais distintos:

| Dimensão | Peso visual | O que mede |
|----------|-------------|------------|
| **Completude** | 40% | Percentual de campos obrigatórios preenchidos, incluindo campos condicionais efetivamente abertos |
| **Inferência validada** | 30% | Se os CNAEs foram identificados, confirmados e se o Perfil da Entidade foi confirmado pelo usuário |
| **Coerência** | 30% | Consistência entre os dados preenchidos e as regras cruzadas do caso |

**Faixas do score total:**

| Faixa | Label | Cor |
|-------|-------|-----|
| 0–59 | Baixa confiança | Vermelho |
| 60–84 | Confiança média | Amarelo |
| 85–100 | Alta confiança | Verde |

**Nota obrigatória no mockup:** score alto sozinho não libera o fluxo. Um caso com 70% de confiança e um HARD_BLOCK ativo permanece bloqueado.

---

## 4. Regras de bloqueio e liberação

### 4.1 Status do Perfil da Entidade

| Status | Condição visual |
|--------|----------------|
| Em construção | Caso iniciado, mas com dados insuficientes |
| Pendente | Faltam confirmações ou campos obrigatórios |
| Bloqueado | Existe ao menos um HARD_BLOCK ativo |
| Confirmado | Perfil validado pelo usuário e sem bloqueios críticos |

### 4.2 Gates visuais do fluxo E2E

| Gate | Condição | Efeito visual |
|------|----------|---------------|
| GATE-01 | `status_arquetipo ≠ confirmado` | "Continuar para o briefing" desabilitado |
| GATE-02 | Existem HARD_BLOCKs ativos | Status visual = Bloqueado |
| GATE-03 | CNAEs não confirmados | `inferencia_validada` não atinge máximo |
| GATE-04 | Score alto mas sem confirmação do perfil | Fluxo permanece não liberado |

### 4.3 Tipos de issue no painel (PC-03)

Issues são exibidas em ordem de prioridade:

| Tipo | Cor | Descrição |
|------|-----|-----------|
| `HARD_BLOCK` | Vermelho | Bloqueia confirmação do Perfil da Entidade |
| `PENDENTE_CRITICO` | Amarelo escuro | Reduz significativamente a confiança |
| `PENDENTE` | Azul | Campo obrigatório não preenchido |
| `INFO` | Índigo | Informativo, não bloqueia |

Cada card de issue exibe: título curto, tipo, por que importa, impacto no fluxo, ação recomendada e botão "Ir para campo".

---

## 5. Integração com Identificação de CNAEs

O Painel de Confiança reflete em tempo real o estado dos CNAEs:

| Evento | Efeito no painel |
|--------|-----------------|
| `descricao_negocio` preenchida | Habilita botão "Identificar CNAEs" |
| CNAEs sugeridos mas não confirmados | `inferencia_validada` parcial · issue PENDENTE_CRITICO |
| CNAEs confirmados | `inferencia_validada` sobe · profile preview atualizado · blocos pré-abertos |
| CNAE removido | Painel recalcula score e issues |

O campo `cnaes[]` no painel snapshot exibe os códigos confirmados. Enquanto nenhum CNAE está confirmado, o snapshot mostra "—" e a leitura do sistema indica "dados insuficientes".

---

## 6. Integração com Perfil da Entidade

O snapshot do Perfil da Entidade (PC-04) exibe os campos-chave em tempo real:

```
natureza_da_operacao  →  produto / serviço / misto
cnaes                 →  lista de códigos confirmados
papel_operacional     →  fabricante / distribuidor / varejista / etc.
setor_regulado        →  true / false
orgao_regulador       →  ANP / ANATEL / ANVISA / etc.
abrangencia_geografica → mono / multi
territorio_incentivado → false / ZFM / RECOF / etc.
comercio_exterior     →  nenhum / importador / exportador / ambos
```

Abaixo dos campos, o painel exibe uma **leitura textual do sistema** — uma frase que resume o perfil detectado (ex.: "DISTRIBUIDOR_PRESUMIDO_MULTI_ANP — split_payment, regime_diferenciado, obrigacao_acessoria").

O CTA duplo no PC-04 oferece:
- **"Confirmar Perfil da Entidade"** — ativa quando não há HARD_BLOCKs e todos os campos obrigatórios estão preenchidos
- **"Corrigir Perfil da Entidade"** — sempre disponível após a primeira confirmação

---

## 7. Integração futura com riscos (PC-05 — prévia exploratória)

A seção PC-05 (“Prévia exploratória de riscos”) exibe itens ilustrativos com base no perfil atual. **Esta seção é exclusivamente exploratória e não representa o motor de riscos real.** Os itens exibidos no mockup são exemplos de intenção de design e dependem de SPEC aprovada pelo P.O.

> **PC-05 não é risco real.** A integração com o motor de riscos é fase futura. Nenhum dado desta seção deve ser tratado como output do sistema de compliance.

Exemplos ilustrativos exibidos no mockup:
- “Setor regulado pode acionar obrigações acessórias específicas.”
- “Operação com bens exige classificação por NCM.”
- “Atuação multiestadual impacta territorialidade do caso.”

A nota obrigatória desta seção: “Na etapa de riscos real, o sistema mostrará por que cada risco foi apontado, com base nos dados do Perfil da Entidade, na regra aplicada e na base legal correspondente. Esta integração é fase futura.”

---

## 8. Impacto no gate E2E

O gate E2E depende **exclusivamente** da combinação de duas condições:

```
gate_e2e.can_continue = true
  ← status_arquetipo = "confirmado"
  AND issues.filter(tipo = "HARD_BLOCK").length = 0
```

**Score alto não é condição para liberação do gate.** Um caso com score 70% e sem HARD_BLOCKs ainda permanece bloqueado enquanto `status_arquetipo ≠ confirmado`. O estado S5 do mockup ilustra exatamente este cenário: score 70%, HARD_BLOCK ativo, fluxo bloqueado.

O botão "Continuar para o briefing" (PC-06) é o único CTA principal do painel. Quando bloqueado, exibe tooltip: "Complete e confirme o Perfil da Entidade para liberar o próximo passo."

A regra explícita sempre visível no rodapé do painel: "Gate liberado quando: `status_arquetipo = confirmado` AND sem HARD_BLOCKs ativos."

---

## 9. Limites desta fase exploratória

Este documento e o mockup são artefatos de análise pré-M1. Os seguintes pontos são exploratórios e dependem de spec antes de implementação:

| Item | Status |
|------|--------|
| Algoritmo de cálculo do score de confiança | Exploratório — pesos e fórmula a definir em spec |
| Lógica de inferência de CNAEs por descrição | Exploratório — lookup estático ou LLM a decidir |
| Persistência do estado do painel entre sessões | Não especificado |
| Comportamento mobile do painel colapsável | Exploratório |
| Integração do PC-05 com o motor de riscos real | Fase futura |

---

## 10. Critérios de aceite visuais (v4.1)

Os seguintes critérios devem ser verificados no mockup antes de qualquer implementação:

1. O mockup preserva integralmente o fluxo v4 de Identificar CNAEs e multi-select editável.
2. Existe painel lateral persistente de "Confiança do Caso".
3. O painel mostra score total com breakdown explícito das 3 dimensões.
4. O painel mostra lista priorizada de pendências e bloqueios com CTA de correção.
5. O painel mostra snapshot legível do Perfil da Entidade.
6. O painel mostra CTA de "Confirmar Perfil da Entidade".
7. O botão "Continuar para o briefing" aparece claramente bloqueado quando aplicável.
8. A documentação explica a diferença entre score de confiança e gate de fluxo.
9. A documentação explicita que os riscos serão rastreáveis com base no Perfil da Entidade.
10. Nenhum texto da UI usa "Arquétipo" — apenas "Perfil da Entidade".

---

## 11. Baseline v4 preservada (não regredir)

Todos os elementos do v4 são preservados integralmente no v4.1:

| Elemento | Status no v4.1 |
|----------|----------------|
| `project_name` como 1º campo | ✅ preservado |
| `descricao_negocio` antes de CNAEs | ✅ preservado |
| Botão "Identificar CNAEs" após `descricao_negocio` | ✅ preservado |
| Modal de identificação de CNAEs | ✅ preservado |
| `cnaes` em multi_select editável | ✅ preservado |
| `allow_add` e `allow_remove` para CNAEs | ✅ preservado |
| `auto_open_blocos_based_on_cnae` | ✅ preservado |
| `show_confidence_cnae` | ✅ preservado |
| `show_detected_profile_preview` | ✅ preservado |
| "Perfil da Entidade" como termo de UI | ✅ preservado |
| Gate E2E visual dependente de `status_arquetipo` | ✅ preservado |
| ~~`cnae_principal_input`~~ | ✅ removido (não reintroduzir) |

---

## 12. Escopo funcional (invariante)

```json
{
  "analise": "1_cnpj_por_vez",
  "grupo_economico": "informativo_sem_consolidacao_multi_cnpj",
  "ui_label": "Perfil da Entidade",
  "termo_tecnico_interno": "arquetipo",
  "regra_central": "sem elegibilidade nao segue no fluxo E2E e nao chega no briefing"
}
```

---

## 13. Backlog pendente (não agir sem autorização P.O.)

Herdado do v3/v4, sem alterações:

- Criar migration para tabela `eligibility_audit_log`
- Criar `drizzle/downs/0089_down.sql`
- Resolver divergência sandbox main (tag `backup/main-pre-sync-20260421-230108`)
- Corrigir trigger `smoke-post-deploy.yml`
- Retomar Sprint Z-22 — Issue #725 (Dashboard Compliance v3)

---

*Documento gerado em 2026-04-23 · branch `docs/m1-arquetipo-exploracao` · artefato pré-M1 · sem implementação*
