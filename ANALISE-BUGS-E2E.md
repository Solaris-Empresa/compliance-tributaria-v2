# Análise de Bugs E2E - Teste Completo

**Data:** 01/02/2026  
**Checkpoint Inicial:** cd5bfc15  
**Fase:** Análise e Identificação de Bugs Críticos

---

## 🎯 Objetivo do Teste E2E

Validar fluxo completo: **Projeto → Questionários → Planos de Ação** com geração via IA real (sem mock).

---

## 🐛 Bugs Identificados

### BUG #1: Botão "Criar Projeto" Não Funciona ⚠️ CRÍTICO

**Componente:** `client/src/pages/NovoProjeto.tsx`  
**Severidade:** 🔴 **BLOQUEADOR TOTAL**

#### Evidências
1. ❌ Nenhuma mutation `projects.create` nos logs de rede
2. ❌ Botão clicado mas nenhuma ação disparada
3. ✅ Código do componente estruturalmente correto (linhas 66-94)
4. ✅ Validações implementadas corretamente
5. ✅ Handler `handleSubmit` conectado ao form

#### Hipóteses
1. **Problema de estado do formulário:** `clientId` pode estar como string vazia mesmo após seleção
2. **Validação silenciosa:** Validação na linha 74-77 pode estar bloqueando sem feedback
3. **Problema no Select component:** `onValueChange` pode não estar atualizando estado
4. **Race condition:** Estado não atualizado antes da validação

#### Solução Proposta
**Adicionar logs de debug** para identificar qual validação está bloqueando:

```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  console.log('=== DEBUG FORM SUBMIT ===');
  console.log('name:', name);
  console.log('clientId:', clientId);
  console.log('planPeriodMonths:', planPeriodMonths);
  console.log('selectedBranches:', selectedBranches);

  if (!name.trim()) {
    toast.error("Nome do projeto é obrigatório");
    return;
  }

  if (!clientId) {
    console.log('❌ BLOQUEADO: clientId vazio');
    toast.error("Selecione um cliente");
    return;
  }

  // ... resto das validações
};
```

**Correção Definitiva:**
- Verificar se `Select` do shadcn/ui está retornando valor correto
- Adicionar `console.log` no `onValueChange` do Select de cliente
- Garantir que estado seja atualizado antes de submit

---

### BUG #2: Nested Anchor Tags no Painel ⚠️ MÉDIO

**Componente:** `client/src/pages/Painel.tsx` (linha 115-116)  
**Severidade:** 🟡 **UX - Não Bloqueador**

#### Evidências
```
Error: <a> cannot contain a nested <a>
at client/src/pages/Painel.tsx:115
```

#### Descrição
Cards de projetos recentes têm `<Link>` (que renderiza `<a>`) aninhado dentro de outro `<Link>`.

#### Solução
Remover `<Link>` externo e manter apenas o interno, ou usar `<div>` com `onClick` no externo.

---

## 📊 Resumo da Análise

| Bug | Severidade | Componente | Bloqueador | Prioridade |
|-----|-----------|------------|------------|------------|
| #1: Botão Criar Projeto | 🔴 Crítico | NovoProjeto.tsx | ✅ Sim | P0 |
| #2: Nested Anchors | 🟡 Médio | Painel.tsx | ❌ Não | P1 |

---

## 🔧 Plano de Correção

### Fase 1: Debug e Identificação (BUG #1)
1. ✅ Adicionar logs de debug no `handleSubmit`
2. ✅ Adicionar logs no `onValueChange` do Select
3. ⏳ Testar no browser e verificar console
4. ⏳ Identificar qual validação está bloqueando

### Fase 2: Correção (BUG #1)
1. ⏳ Corrigir estado do `clientId` se necessário
2. ⏳ Garantir que Select atualiza estado corretamente
3. ⏳ Adicionar feedback visual melhor (loading state no Select)
4. ⏳ Testar criação de projeto end-to-end

### Fase 3: Correção (BUG #2)
1. ⏳ Corrigir nested anchors no Painel.tsx
2. ⏳ Validar que não há mais erros no console

### Fase 4: Validação Final
1. ⏳ Executar teste E2E completo novamente
2. ⏳ Validar criação de projeto
3. ⏳ Validar questionários
4. ⏳ Validar geração de planos via IA
5. ⏳ Checkpoint final

---

## 🎯 Próximos Passos Imediatos

1. **Implementar logs de debug** em NovoProjeto.tsx
2. **Testar no browser** e verificar console
3. **Identificar causa raiz** do bloqueio
4. **Implementar correção** imediatamente
5. **Validar correção** com teste manual
6. **Continuar teste E2E** até o final do fluxo

---

## 📝 Notas Técnicas

- Mutation `projects.create` existe e está corretamente implementada no router
- Componente NovoProjeto.tsx usa React Hook Form implicitamente via `useState`
- Select do shadcn/ui pode ter comportamento assíncrono de atualização de estado
- Validação `if (!clientId)` pode estar sendo atingida mesmo após seleção visual

---

**Status:** 🔄 Análise completa, pronto para implementar correções
