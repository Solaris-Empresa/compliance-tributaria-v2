# CPIE v2 — Regras de CTA (Call to Action)

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado  
**Rastreabilidade:** `client/src/pages/NovoProjeto.tsx` · `docs/product/cpie-v2/produto/07-ux-guidelines.md`

---

## 1. Princípio

Cada estado do CPIE v2 tem exatamente **um CTA primário** e no máximo **um CTA secundário**. Nunca dois CTAs primários simultâneos. O CTA primário deve ser sempre a ação mais segura para o sistema (nunca a ação que contorna a validação).

---

## 2. Tabela de CTAs por Estado

| Estado | CTA Primário | CTA Secundário | CTA Proibido |
|---|---|---|---|
| Formulário incompleto | "Avançar →" (desabilitado) | — | Qualquer ação que avance |
| Formulário completo, sem análise | "Avançar →" (ativo) | — | — |
| Analisando (loading) | "Analisando CNAEs..." (spinner, desabilitado) | — | — |
| HARD_BLOCK | "Avançar →" (desabilitado, cinza) | — | Override, prosseguir |
| SOFT_BLOCK (sem override) | "Avançar →" (desabilitado) | "Justificar e continuar →" (link) | Avançar sem justificativa |
| OVERRIDE (digitando justificativa) | "Justificar e continuar →" (ativo quando ≥ 50 chars) | "Cancelar" | Avançar sem justificativa válida |
| CONFLICT_REVIEW (painel MEDIUM) | "Estou ciente, prosseguir" | "Corrigir perfil" | Avançar sem confirmação |
| APROVADO_LIMPO | "Avançar →" (ativo) | — | — |
| APROVADO_COM_OVERRIDE | "Avançar →" (ativo) | — | — |
| APROVADO_MEDIUM | "Avançar para CNAEs →" (ativo) | — | — |

---

## 3. Regras de Habilitação do Botão Principal

```typescript
// Botão "Avançar" habilitado quando:
const isAdvanceEnabled =
  !analyzePreviewInline.isPending &&
  !createProject.isPending &&
  !persistCpieV2.isPending &&
  !extractCnaes.isPending &&
  cpieV2Gate?.blockType !== "hard_block" &&
  !(cpieV2Gate?.blockType === "soft_block_with_override" && !alreadyApproved) &&
  !(showConflictReview && !alreadyApproved);
```

---

## 4. Textos dos CTAs

### 4.1 Botão principal (variações por estado)

| Estado | Texto do botão |
|---|---|
| Sem análise / limpo | "Avançar →" |
| Analisando | "Analisando CNAEs..." |
| APROVADO_MEDIUM (pós-confirmação) | "Avançar para CNAEs →" |
| OVERRIDE (pós-justificativa) | "Justificar e continuar →" |

### 4.2 Link de override (SOFT_BLOCK)

```
"Justificar e continuar →"
```

### 4.3 Painel CONFLICT_REVIEW

**Título:** "⚠️ Inconsistências moderadas detectadas"  
**Subtítulo:** "Revise os conflitos abaixo antes de prosseguir. Esta decisão será registrada na trilha de auditoria."  
**CTA primário:** "Estou ciente, prosseguir"  
**CTA secundário:** "Corrigir perfil"

### 4.4 Painel OVERRIDE

**Título:** "⚠️ Justificativa formal para prosseguir"  
**Subtítulo:** "Descreva por que está prosseguindo mesmo com inconsistências. Esta decisão será registrada na trilha de auditoria."  
**Placeholder:** "Descreva o motivo técnico ou de negócio..."  
**Contador:** "{n}/50 caracteres mínimos"  
**CTA primário:** "Justificar e continuar →" (desabilitado se < 50 chars)  
**CTA secundário:** "Cancelar"

---

## 5. Mensagens de Feedback por Estado

| Estado | Mensagem | Cor |
|---|---|---|
| HARD_BLOCK | "🚫 Perfil bloqueado — Inconsistências críticas impedem o avanço." | Vermelho |
| SOFT_BLOCK | "⚠️ ATENÇÃO — Inconsistências moderadas detectadas. Conflitos de alta severidade detectados. Override permitido com justificativa ≥ 50 caracteres." | Amarelo |
| APROVADO_LIMPO | "✅ Perfil aprovado — Clique em Avançar para continuar." | Verde |
| APROVADO_COM_OVERRIDE | "✅ Perfil aprovado com override registrado." | Verde |
| APROVADO_MEDIUM | "⚠️ Perfil aprovado com ressalvas — Clique em Avançar para CNAEs para continuar. ({n} inconsistência(s) média(s) registrada(s))" | Verde/Amarelo |

---

## 6. Regras de Acessibilidade

1. O botão principal nunca deve ser removido do DOM — apenas desabilitado (`disabled`) para manter a posição do layout.
2. Botões desabilitados devem ter `aria-disabled="true"` e `title` explicativo.
3. O painel CONFLICT_REVIEW deve ter `role="alert"` para leitores de tela.
4. O contador de caracteres da justificativa deve ser atualizado em tempo real via `aria-live="polite"`.
5. Após confirmação no painel CONFLICT_REVIEW, o foco deve ser movido para o botão principal.
