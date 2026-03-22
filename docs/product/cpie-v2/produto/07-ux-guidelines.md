# CPIE v2 — UX Guidelines

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado  
**Escopo:** Princípios de usabilidade, CTA por estado, hierarquia visual, auto-guiamento, redução de fricção e progressive disclosure

---

## 1. Princípios Fundamentais de Usabilidade

### 1.1 Feedback Imediato

O sistema deve comunicar o resultado de cada ação em menos de 200ms (feedback visual) e menos de 8 segundos (resultado final da análise). O usuário nunca deve ficar sem saber o que está acontecendo.

**Aplicação no CPIE v2:**
- Spinner imediato ao clicar em "Avançar"
- Indicador de qualidade da descrição atualizado a cada tecla
- Contador de caracteres da justificativa em tempo real
- Toast de confirmação após override registrado

### 1.2 Reversibilidade

Toda ação deve ser reversível. O usuário deve poder voltar ao estado anterior sem perda de dados.

**Aplicação no CPIE v2:**
- "Cancelar" no painel de justificativa fecha sem perder o texto digitado
- "Corrigir perfil" no painel MEDIUM fecha o painel e mantém o formulário editável
- Cancelar o modal de CNAEs retorna ao formulário com a análise mantida
- Editar qualquer campo reseta a análise (comportamento esperado e comunicado)

### 1.3 Prevenção de Erros

O sistema deve prevenir erros antes que aconteçam, não apenas reportá-los depois.

**Aplicação no CPIE v2:**
- Campos obrigatórios claramente marcados com asterisco vermelho
- Botão "Avançar" desabilitado enquanto campos obrigatórios não estão preenchidos
- Botão "Avançar" desabilitado enquanto justificativa < 50 chars
- Indicador de qualidade da descrição antes de disparar a análise

### 1.4 Consistência

Padrões visuais e de interação devem ser consistentes em todo o fluxo.

**Aplicação no CPIE v2:**
- Mesma paleta de cores para severidades em todos os contextos (vermelho=critical, laranja=high, amarelo=medium, azul=low)
- Mesmo padrão de banner (ícone + título em negrito + subtítulo) para todos os estados
- Mesmo padrão de botão primário (azul escuro, texto branco) em todos os CTAs

---

## 2. CTA por Estado — Tabela Completa

| Estado | CTA Primário | Texto exato | CTA Secundário | Texto exato | Botão Avançar |
|---|---|---|---|---|---|
| Formulário incompleto | — | — | — | — | Desabilitado |
| Formulário completo | Botão Avançar | "Avançar →" | — | — | Habilitado |
| Loading (análise) | — | — | — | — | "Analisando CNAEs..." (desabilitado) |
| Hard Block | — | — | (editar formulário) | — | Desabilitado |
| Soft Block | Link/botão | "Justificar e continuar →" | — | — | Desabilitado |
| Soft Block (painel aberto) | Botão | "Justificar e continuar →" | Botão | "Cancelar" | Habilitado (≥50 chars) |
| MEDIUM (painel) | Botão | "Estou ciente, prosseguir" | Botão | "Corrigir perfil" | Desabilitado |
| MEDIUM (após confirmar) | — | — | — | — | Habilitado |
| Limpo | — | — | — | — | Habilitado |

**Regras de nomenclatura dos CTAs:**
- Nunca usar "OK", "Sim", "Não" — sempre usar verbos de ação específicos
- Nunca usar "Pular" ou "Ignorar" — o sistema não permite ignorar análises
- Nunca usar "Tente novamente" para hard_block — o problema não é técnico, é de dados

---

## 3. Hierarquia Visual

### 3.1 Ordem de atenção visual

O layout do CPIE v2 guia o olhar do usuário na seguinte ordem:

```
1. Banner de status (cor + ícone + título)
   → Responde imediatamente: "posso avançar?"

2. Painel de ação (se necessário)
   → Responde: "o que preciso fazer?"

3. Lista de conflitos (ScorePanel)
   → Responde: "por que está bloqueado?"

4. Scores (barras de progresso)
   → Responde: "qual é a qualidade do perfil?"

5. Botão Avançar
   → Ação final
```

### 3.2 Uso de cores por severidade

| Severidade | Cor de fundo | Cor do texto | Cor da borda | Uso |
|---|---|---|---|---|
| `critical` | Vermelho claro | Vermelho escuro | Vermelho | Hard block, conflitos críticos |
| `high` | Laranja/amarelo claro | Laranja escuro | Amarelo | Soft block, conflitos high |
| `medium` | Amarelo muito claro | Âmbar | Amarelo | Conflitos medium, ressalvas |
| `low` | Azul claro | Azul | Azul | Conflitos low, informativos |
| `success` | Verde claro | Verde escuro | Verde | Aprovado, scores altos |

### 3.3 Tipografia por contexto

| Elemento | Peso | Tamanho | Uso |
|---|---|---|---|
| Título do banner | Bold | Base | Estado principal |
| Subtítulo do banner | Regular | Small | Orientação ao usuário |
| Título do conflito | Semibold | Small | Nome do conflito |
| Descrição do conflito | Regular | Small | Explicação técnica |
| Badge de severidade | Bold | Extra-small | Rótulo de severidade |
| Contador de chars | Regular | Extra-small | Feedback de progresso |

---

## 4. Auto-Guiamento

O CPIE v2 deve guiar o usuário sem necessidade de manual ou suporte. Cada estado deve ser autoexplicativo.

### 4.1 Princípios de auto-guiamento

**Contexto sempre visível:** o usuário sempre sabe em qual etapa está e o que precisa fazer para avançar.

**Orientação proativa:** o sistema não espera o usuário errar para orientar. O indicador de qualidade da descrição, por exemplo, aparece antes da análise.

**Mensagens em linguagem natural:** evitar jargões técnicos nas mensagens ao usuário. Usar "contradições no perfil" em vez de "conflitos determinísticos".

### 4.2 Mensagens de orientação por estado

| Estado | Mensagem de orientação |
|---|---|
| Hard Block | "Corrija as contradições críticas antes de continuar. Não é possível prosseguir com inconsistências que inviabilizam a empresa juridicamente." |
| Soft Block | "Há inconsistências que precisam de atenção. Você pode prosseguir se tiver uma justificativa formal para as divergências encontradas." |
| MEDIUM | "O perfil foi aprovado, mas há pontos que merecem sua atenção. Revise e confirme sua ciência antes de continuar." |
| Limpo | "Perfil aprovado. Você pode avançar para a seleção de CNAEs." |

### 4.3 Tooltips informativos

Campos com conceitos não óbvios devem ter tooltips:

| Campo | Tooltip |
|---|---|
| `annualRevenueRange` | "Faturamento bruto anual. Inclua todas as receitas da empresa." |
| `taxRegime` | "Regime tributário atual. Se não souber, consulte o contador." |
| `companySize` | "Classificação BNDES/Sebrae: MEI (até R$81K/ano), Micro (até R$360K/ano), Pequena (até R$4,8M/ano), Média (até R$300M/ano), Grande (acima de R$300M/ano)." |
| `hasImportExport` | "Inclui qualquer operação de compra no exterior ou venda para o exterior, mesmo que esporádica." |

---

## 5. Redução de Fricção

### 5.1 Quando NÃO mostrar um conflito

O sistema deve filtrar conflitos que não agregam valor ao usuário:

- **Falsos positivos de porte:** conflitos de porte quando o faturamento está dentro dos limites oficiais (já implementado via filtro pós-IA)
- **Conflitos redundantes:** se a IA detecta um conflito já detectado pelas regras determinísticas, o conflito da IA é descartado
- **Conflitos de baixa confiança:** se `inferenceConfidence < 50`, os conflitos da Camada B não são gerados

### 5.2 Ordem de exibição dos conflitos

Os conflitos devem ser exibidos em ordem de severidade decrescente:

```
critical → high → medium → low
```

Dentro de cada severidade, os conflitos determinísticos aparecem antes dos da IA.

### 5.3 Limite de conflitos exibidos

Exibir no máximo 5 conflitos na lista principal. Se houver mais, mostrar "Ver mais N conflitos" com expansão opcional. Isso evita sobrecarga cognitiva.

### 5.4 Formulário progressivo

Campos avançados (como `hasSpecialRegimes`, `hasTaxTeam`, `hasAudit`) devem ser exibidos em uma seção colapsável "Informações adicionais" para não sobrecarregar o formulário inicial.

---

## 6. Progressive Disclosure

Progressive disclosure é o princípio de mostrar apenas o que é necessário em cada momento, revelando complexidade gradualmente.

### 6.1 Etapa 1 — Formulário básico

Exibir apenas os campos essenciais para a análise:
- Nome do projeto
- Descrição do negócio
- Campos obrigatórios do perfil

### 6.2 Etapa 2 — Resultado da análise

Exibir o resultado de forma progressiva:
1. Banner de status (imediato)
2. Painel de ação (se necessário)
3. Scores (ao expandir o ScorePanel)
4. Lista completa de conflitos (ao expandir)
5. Detalhes técnicos de cada conflito (ao clicar em um conflito)

### 6.3 Etapa 3 — Detalhes do conflito

Ao clicar em um conflito, exibir:
1. Título e descrição (já visíveis)
2. Campos em conflito (`conflictingFields`)
3. Valor inferido vs. declarado (quando disponível)
4. Pergunta de reconciliação (quando disponível)

### 6.4 O que NÃO mostrar ao usuário

Os seguintes dados são internos e não devem ser exibidos na UI:
- `consistencyVeto` (número técnico)
- `deterministicVeto` / `aiVeto` (números técnicos)
- `inferenceConfidence` (número técnico)
- IDs de conflito como `A1`, `B2`, `AI-001` (usar apenas internamente para rastreabilidade)
- `source: "deterministic"` / `source: "ai"` (distinção técnica irrelevante para o usuário)

---

## 7. Acessibilidade

### 7.1 Requisitos mínimos

- Todos os banners de status devem ter `role="alert"` para leitores de tela
- Botões desabilitados devem ter `aria-disabled="true"` e tooltip explicativo
- Cores de severidade não devem ser o único indicador — usar também ícones e texto
- Contador de caracteres deve ser anunciado por leitores de tela a cada mudança significativa

### 7.2 Contraste mínimo

Todas as combinações de cor/fundo devem ter contraste mínimo de 4.5:1 (WCAG AA).
