# CPIE v2 — UX States

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado  
**Rastreabilidade:** `client/src/pages/NovoProjeto.tsx` · `client/src/components/PerfilEmpresaIntelligente.tsx`

---

## 1. Estados de UI por Decisão do Gate

O CPIE v2 define **cinco estados de UI** distintos, cada um com comportamento visual e interativo específico.

---

### Estado 1 — Analisando (Loading)

**Quando:** após o usuário clicar em "Avançar" e enquanto o `analyzePreview` está em execução.

**Elementos visuais:**
- Botão "Avançar" substituído por "Analisando CNAEs..." com spinner
- Botão desabilitado (não clicável)
- Formulário permanece visível mas não editável

**Duração esperada:** 2–8 segundos (depende da latência da IA)

---

### Estado 2 — Hard Block

**Quando:** `blockType === "hard_block"` (conflito crítico ou `diagnosticConfidence < 15%`)

**Elementos visuais:**
- Banner vermelho com ícone de escudo: "🚫 BLOQUEADO — Contradições críticas detectadas"
- Descrição do motivo do bloqueio (`blockReason`)
- Lista de conflitos com severidade `critical` destacada em vermelho
- Botão "Avançar" desabilitado e cinza
- Sem opção de override

**Ação disponível:** editar o formulário para corrigir as contradições

**Mensagem de orientação:** "Corrija as contradições críticas antes de continuar. Não é possível prosseguir com inconsistências que inviabilizam a empresa juridicamente."

---

### Estado 3 — Soft Block com Override

**Quando:** `blockType === "soft_block_with_override"` (conflitos `high` sem críticos)

**Elementos visuais:**
- Banner amarelo/laranja: "⚠️ ATENÇÃO — Inconsistências moderadas detectadas"
- Subtítulo: "Conflitos de alta severidade detectados. Override permitido com justificativa ≥ 50 caracteres."
- Link/botão "Justificar e continuar →"
- Botão "Avançar" habilitado somente após justificativa válida

**Painel de justificativa (ao clicar em "Justificar e continuar"):**
- Título: "Justificativa formal para prosseguir"
- Subtítulo: "Descreva por que está prosseguindo mesmo com inconsistências. Esta decisão será registrada na trilha de auditoria."
- Textarea com contador de caracteres (ex: "58/50 caracteres mínimos")
- Contador verde quando ≥ 50 chars, vermelho quando < 50
- Botão "Cancelar" (fecha o painel)
- Botão "Avançar" muda para "Justificar e continuar →" quando o painel está ativo

**Ação disponível:** digitar justificativa ≥ 50 chars e clicar em "Justificar e continuar", ou cancelar e editar o formulário

---

### Estado 4 — Aprovado com Ressalvas (MEDIUM)

**Quando:** `canProceed === true` e presença de conflitos `medium` ou `low`

**Elementos visuais:**
- Banner verde com ícone de aviso: "✅ ⚠️ Perfil aprovado com ressalvas — Clique em Avançar para CNAEs para continuar. (N inconsistência(s) média(s) registrada(s))"
- Painel de revisão MEDIUM exibido automaticamente

**Painel de revisão MEDIUM:**
- Título: "Inconsistências moderadas identificadas"
- Subtítulo: "Revise os pontos abaixo antes de prosseguir. Sua ciência será registrada."
- Lista de conflitos MEDIUM com tipo e descrição
- Dois botões: "Corrigir perfil" (fecha o painel, reseta análise) e "Estou ciente, prosseguir" (confirma e habilita Avançar)

**Após confirmar ciência:**
- Painel de revisão some
- Botão "Avançar" habilitado
- Banner mantido com indicação de ressalvas

---

### Estado 5 — Aprovado Limpo

**Quando:** `canProceed === true` e `conflicts.length === 0`

**Elementos visuais:**
- Banner verde: "✅ Perfil aprovado — Clique em Avançar para CNAEs para continuar."
- Botão "Avançar" habilitado imediatamente
- Sem painéis adicionais

---

## 2. Tabela de CTAs por Estado

| Estado | CTA Primário | CTA Secundário | Mensagem Proibida |
|---|---|---|---|
| Loading | "Analisando CNAEs..." (desabilitado) | — | "Carregando..." (genérico) |
| Hard Block | — (Avançar desabilitado) | "Editar perfil" | "Tente novamente" |
| Soft Block | "Justificar e continuar →" | "Cancelar" | "Pular verificação" |
| MEDIUM | "Estou ciente, prosseguir" | "Corrigir perfil" | "Ignorar" |
| Limpo | "Avançar →" | — | — |

---

## 3. ScorePanel — Painel Lateral de Status

O `ScorePanel` exibe os três scores e os conflitos detectados. É exibido no painel lateral direito do formulário.

### 3.1 Seção "Status do Perfil"

Exibe as três barras de progresso:

| Barra | Label | Cor quando alto | Cor quando baixo |
|---|---|---|---|
| `completenessScore` | "Completude do formulário" | Verde | Vermelho |
| `consistencyScore` | "Consistência interna" | Verde | Vermelho |
| `diagnosticConfidence` | "Confiança diagnóstica" | Verde | Vermelho |

Threshold de cor: verde ≥ 70%, amarelo 40–69%, vermelho < 40%.

### 3.2 Seção "Conflitos detectados"

Exibe a lista de conflitos com:
- Badge de severidade colorido (`critical` = vermelho, `high` = laranja, `medium` = amarelo, `low` = azul)
- Tipo do conflito (`direct`, `inference`, `composite`)
- Descrição completa do conflito

### 3.3 Seção "ATENÇÃO" (quando há conflitos high/critical)

Banner amarelo/laranja com a mensagem do `blockReason`.

---

## 4. Hierarquia Visual

A hierarquia visual do CPIE v2 segue a ordem de importância:

```
1. Banner de status (topo da área de resultado)
   └── Comunica imediatamente se pode avançar ou não

2. Painel de ação (logo abaixo do banner)
   └── Justificativa (soft_block) ou Revisão MEDIUM

3. ScorePanel (painel lateral)
   └── Detalha os três scores e lista os conflitos

4. Botão Avançar (rodapé)
   └── Habilitado/desabilitado conforme o estado
```

---

## 5. Regras de Feedback Visual

### 5.1 Contador de caracteres da justificativa

```
< 50 chars → texto vermelho: "X/50 caracteres mínimos"
≥ 50 chars → texto verde: "X/50 caracteres mínimos"
```

### 5.2 Indicador de qualidade da descrição

A descrição livre tem um indicador de suficiência para análise da IA:

```
< 20 chars → sem indicador
20–79 chars → "⚠️ Descrição curta — adicione mais detalhes para melhor análise"
≥ 80 chars → "✅ Descrição suficiente para análise da IA"
```

### 5.3 Barra de progresso da descrição

A barra de progresso da descrição muda de cor conforme o comprimento:
- Vermelha: < 20 chars
- Amarela: 20–79 chars
- Azul: 80–159 chars
- Verde: ≥ 160 chars

---

## 6. Mensagens de Erro

| Cenário | Mensagem |
|---|---|
| `analyzePreview` falha | Toast: "Erro ao analisar o perfil. Tente novamente." |
| IA falha (AI-ERR) | Banner vermelho: "Erro técnico na análise. Por segurança, o avanço está bloqueado. Tente novamente." |
| `overrideSoftBlock` retorna FORBIDDEN | Toast: "Hard block não pode ser ignorado. Corrija as contradições críticas." |
| Justificativa < 50 chars | Botão desabilitado + contador vermelho |
| Formulário incompleto | Campos obrigatórios destacados em vermelho |
