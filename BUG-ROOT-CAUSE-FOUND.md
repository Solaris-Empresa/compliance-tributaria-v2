# 🔴 BUG CRÍTICO - CAUSA RAIZ IDENTIFICADA

**Data:** 01/02/2026  
**Componente:** `client/src/pages/NovoProjeto.tsx`  
**Severidade:** BLOQUEADOR TOTAL

---

## 🎯 Descoberta

O botão "Criar Projeto" **NÃO está disparando nenhum evento** quando clicado.

### Evidências Conclusivas

1. ✅ **onClick adicionado ao botão** (linha 242-246)
2. ❌ **onClick NUNCA é chamado** - nenhum log de "BOTÃO CLICADO" aparece
3. ❌ **onSubmit do form NUNCA é chamado** - nenhum log de "FORM SUBMIT DEBUG" aparece
4. ✅ **Select onChange funciona** - log de "Select onChange: 601604" apareceu
5. ✅ **Outros eventos funcionam** - inputs, checkboxes, selects todos funcionam

### Conclusão

**O botão está completamente "morto"** - nem onClick nem onSubmit são disparados. Isso indica um problema estrutural no componente Button do shadcn/ui ou no Card que o envolve.

---

## 🔍 Análise Técnica

### Hipóteses Testadas e Descartadas

❌ **Validação bloqueando:** Não é o problema, pois handleSubmit nunca é chamado  
❌ **Estado do formulário:** Não é o problema, pois onClick também não funciona  
❌ **clientId vazio:** Não é o problema, pois nenhum handler é executado  
❌ **isPending bloqueando:** Não é o problema, botão não está disabled

### Hipótese Atual (MAIS PROVÁVEL)

**O componente `<Card>` ou `<CardContent>` está bloqueando eventos de click/submit.**

Possíveis causas:
1. CSS `pointer-events: none` aplicado ao Card ou CardContent
2. Overlay invisível sobre o botão
3. Z-index negativo no botão
4. Event listener conflitante no Card
5. Problema no componente Button do shadcn/ui

---

## 🛠️ Correção Proposta

### Opção 1: Remover Card (Teste Rápido)
Temporariamente remover `<Card>` e `<CardContent>` para verificar se são eles que bloqueiam.

### Opção 2: Inspecionar CSS
Verificar se há `pointer-events: none` ou z-index problems no Card/CardContent.

### Opção 3: Substituir Button
Usar `<button>` nativo do HTML em vez do componente shadcn/ui.

### Opção 4: Mover botão para fora do Card
Colocar botão fora do `<CardContent>` para testar isoladamente.

---

## 🚀 Próxima Ação Imediata

**TESTE 1:** Substituir o componente `<Button>` do shadcn/ui por um `<button>` nativo do HTML e verificar se o problema persiste.

```tsx
{/* Substituir */}
<Button type="submit" onClick={...}>Criar Projeto</Button>

{/* Por */}
<button 
  type="submit" 
  onClick={(e) => {
    console.log('BOTÃO NATIVO CLICADO');
    handleSubmit(e);
  }}
  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded"
>
  Criar Projeto
</button>
```

Se o botão nativo funcionar, o problema está no componente Button do shadcn/ui.  
Se o botão nativo NÃO funcionar, o problema está no Card ou em outro componente pai.

---

**Status:** 🔄 Pronto para implementar correção de teste
