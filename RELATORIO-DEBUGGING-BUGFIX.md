# Relatório de Debugging - Bugfix: Planos de Ação por Ramo

**Data:** 01/02/2026  
**Projeto:** compliance-tributaria-v2  
**Issue:** Planos de ação por ramo não são gerados automaticamente após criação do projeto  
**Status:** 🟡 EM ANDAMENTO (70% completo)

---

## 📋 Sumário Executivo

Durante testes manuais do fluxo completo de criação de projetos, foi identificado que os **planos de ação por ramo não estavam sendo gerados automaticamente** após a adição de ramos ao projeto. Este relatório documenta a investigação completa, erros encontrados e correções aplicadas.

---

## 🐛 Problema Inicial Reportado

**Sintoma:** Após criar um projeto e selecionar 4 ramos de atividade (COM, IND, SER, AGR), apenas o plano corporativo era gerado. Os 4 planos por ramo não apareciam.

**Fluxo Esperado:**
1. Criar Projeto
2. Selecionar 4 ramos (COM, IND, SER, AGR)
3. Preencher Questionário Corporativo
4. **Gerar Plano Corporativo** ← ✅ Funcionava
5. Preencher Questionários por Ramo (4 questionários)
6. **Gerar Planos por Ramo (4 planos)** ← ❌ **NÃO funcionava**

**Total esperado:** 5 planos (1 corporativo + 4 por ramo)  
**Total obtido:** 1 plano (apenas corporativo)

---

## 🔍 Fase 1: Investigação Inicial

### 1.1. Análise do Código

**Arquivo investigado:** `server/routers/routers-branches.ts`

**Descoberta:** O router `branches.addToProject` (linhas 88-116) apenas adicionava o ramo ao projeto, mas **não disparava a geração automática de questionários e planos**.

```typescript
// ANTES (código original)
addToProject: protectedProcedure
  .input(z.object({
    projectId: z.number(),
    branchId: z.number(),
  }))
  .mutation(async ({ input, ctx }) => {
    const id = await dbBranches.addBranchToProject(input);
    return { id }; // ← Apenas adiciona, não gera planos
  }),
```

### 1.2. Tentativa de Correção #1

**Ação:** Modificar `branches.addToProject` para chamar `actionPlans.branch.generate()` automaticamente.

**Resultado:** ❌ **FALHOU**

**Erro encontrado:**
```
Questionário do ramo não encontrado.
```

**Causa raiz:** A função `actionPlans.branch.generate()` requer que o questionário do ramo (`branchAssessment`) já exista. Como o questionário não era gerado automaticamente, a geração do plano falhava.

---

## 🔍 Fase 2: Análise de Dependências

### 2.1. Fluxo de Dependências Identificado

```
Adicionar Ramo → Gerar Questionário → Gerar Plano
     ✅              ❌                  ❌
```

**Conclusão:** Era necessário gerar AMBOS (questionário E plano) automaticamente.

### 2.2. Verificação dos Routers Disponíveis

**Arquivo:** `server/routers/routers-assessments.ts`

**Router encontrado:** `branchAssessment.generate()`
- **Entrada:** `{ projectId, branchId }`
- **Saída:** Questionário gerado por IA
- **Pré-requisito:** Nenhum

**Router encontrado:** `actionPlans.branch.generate()`
- **Entrada:** `{ projectId, branchId }`
- **Saída:** Plano de ação gerado por IA
- **Pré-requisito:** Questionário do ramo deve existir

---

## ✅ Fase 3: Correção Proposta

### 3.1. Modificação do Router

**Arquivo:** `server/routers/routers-branches.ts` (linhas 97-122)

**Correção a ser aplicada:**

```typescript
// DEPOIS (código corrigido)
addToProject: protectedProcedure
  .input(z.object({
    projectId: z.number(),
    branchId: z.number(),
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Adicionar ramo ao projeto
    const id = await dbBranches.addBranchToProject(input);
    
    // 2. Gerar questionário e plano de ação automaticamente
    try {
      // Import dos routers necessários (USAR IMPORT ESTÁTICO)
      const { assessmentsRouter } = await import("./routers-assessments.js");
      const { actionPlansRouter } = await import("./routers-action-plans.js");
      
      const assessmentsCaller = assessmentsRouter.createCaller(ctx);
      const actionPlansCaller = actionPlansRouter.createCaller(ctx);
      
      // 2.1. Gerar questionário do ramo via IA
      await assessmentsCaller.branchAssessment.generate({
        projectId: input.projectId,
        branchId: input.branchId,
      });
      console.log(`[branches.addToProject] Questionário gerado para ramo ${input.branchId}`);
      
      // 2.2. Gerar plano de ação via IA
      await actionPlansCaller.branch.generate({
        projectId: input.projectId,
        branchId: input.branchId,
      });
      console.log(`[branches.addToProject] Plano de ação gerado para ramo ${input.branchId}`);
    } catch (error) {
      console.error(`[branches.addToProject] Erro ao gerar questionário/plano:`, error);
      // Não falhar a operação se a geração falhar
    }
    
    return { id };
  }),
```

**Mudanças principais:**
1. ✅ Import dinâmico de `assessmentsRouter` e `actionPlansRouter`
2. ✅ Criação de callers com contexto do usuário
3. ✅ Geração sequencial: questionário → plano
4. ✅ Try/catch para não bloquear operação se IA falhar
5. ✅ Logs detalhados para debugging

### 3.2. Correção Adicional: Router `projects.create`

**Problema encontrado durante testes:** O router retornava `{ projectId }` mas o teste esperava `{ id }`.

**Arquivo:** `server/routers.ts` (linha 125)

**Correção:**
```typescript
// ANTES
return { projectId };

// DEPOIS
return { id: projectId, projectId }; // Retornar ambos para compatibilidade
```

---

## 🧪 Fase 4: Testes E2E

### 4.1. Criação do Teste

**Arquivo:** `server/bugfix-branch-plans-complete.test.ts`

**Escopo do teste:**
1. Criar projeto
2. Adicionar 2 ramos
3. Aguardar geração assíncrona (5 segundos)
4. Verificar se 2 questionários foram gerados
5. Verificar se 2 planos foram gerados

### 4.2. Resultados dos Testes

**Teste #1:** ❌ FALHOU
- **Erro:** `project.id is undefined`
- **Causa:** Router retornava `projectId` ao invés de `id`
- **Correção:** Modificado router para retornar ambos

**Teste #2:** ⚠️ PARCIALMENTE PASSOU
- ✅ Projeto criado com sucesso
- ✅ 2 ramos adicionados ao projeto
- ❌ Import dinâmico falhou: `Cannot read properties of undefined (reading 'createCaller')`
- ❌ Router `assessments.branchAssessment.list` não existe no teste

---

## 🚧 Fase 5: Problemas Remanescentes

### 5.1. Import Dinâmico Falhando

**Erro:**
```
Cannot read properties of undefined (reading 'createCaller')
```

**Causa provável:** O import dinâmico `await import("./routers-assessments.js")` pode não estar retornando o objeto esperado.

**Possíveis soluções:**
1. ✅ Verificar export do `assessmentsRouter` em `routers-assessments.ts`
2. ✅ Usar import estático ao invés de dinâmico
3. ✅ Adicionar validação após import

### 5.2. Router Inexistente no Teste

**Erro:**
```
No procedure found on path "assessments,branchAssessment,list"
```

**Causa:** O teste está tentando acessar `caller.assessments.branchAssessment.list()` mas esse router não existe ou não está registrado no `appRouter`.

**Solução necessária:** Verificar estrutura correta dos routers e ajustar teste.

### 5.3. Conflito de Git

**Erro:**
```
! [rejected]        HEAD -> main (non-fast-forward)
error: failed to push some refs
```

**Causa:** Branch local estava atrás do remoto após múltiplas modificações.

**Solução aplicada:** Rollback para checkpoint estável `dd19b6f5`.

---

## 📊 Resumo de Erros e Correções

| # | Erro | Arquivo | Status | Correção |
|---|------|---------|--------|----------|
| 1 | Planos por ramo não gerados | `routers-branches.ts` | ⚠️ PROPOSTA | Adicionar geração automática |
| 2 | Questionário não existia | `routers-branches.ts` | ⚠️ PROPOSTA | Gerar questionário antes do plano |
| 3 | `project.id` undefined | `routers.ts` | ⚠️ PROPOSTA | Retornar `id` e `projectId` |
| 4 | Import dinâmico falha | `routers-branches.ts` | 🔴 PENDENTE | Usar import estático |
| 5 | Router inexistente no teste | `bugfix-branch-plans-complete.test.ts` | 🔴 PENDENTE | Ajustar estrutura do teste |
| 6 | Conflito de git | Projeto | ✅ RESOLVIDO | Rollback para `dd19b6f5` |

---

## 🎯 Próximos Passos

### Curto Prazo (Urgente)
1. 🔴 **Corrigir import dinâmico em `routers-branches.ts`**
   - Substituir import dinâmico por estático
   - Validar exports dos routers
   
2. 🔴 **Ajustar teste E2E para usar routers corretos**
   - Usar `branchAssessment.generate()` ao invés de `list()`
   - Validar estrutura do `appRouter`
   
3. 🔴 **Executar teste completo e validar 100%**
   - Garantir que 2 questionários são gerados
   - Garantir que 2 planos são gerados
   
4. 🔴 **Criar checkpoint com correção**
   - Documentar mudanças
   - Push para GitHub
   
5. 🔴 **Criar e fechar issue #58**
   - "Sprint V21: Bugfix - Geração Automática de Planos por Ramo"

### Médio Prazo (Melhorias)
1. Adicionar timeout configurável para geração de IA
2. Implementar retry automático se geração falhar
3. Adicionar notificação ao usuário quando planos forem gerados
4. Criar indicador de progresso na UI durante geração

### Longo Prazo (Otimizações)
1. Paralelizar geração de questionários e planos
2. Implementar cache de planos gerados
3. Adicionar opção de regenerar planos manualmente
4. Implementar versionamento de planos

---

## 📝 Lições Aprendidas

1. **Dependências implícitas:** Sempre verificar pré-requisitos de funções antes de chamá-las automaticamente
2. **Import dinâmico:** Pode causar problemas em ambientes de teste - considerar imports estáticos
3. **Testes E2E:** Essenciais para validar fluxos complexos com múltiplas etapas
4. **Logs detalhados:** Facilitam debugging de operações assíncronas
5. **Compatibilidade de API:** Retornar múltiplos formatos (`id` e `projectId`) evita breaking changes
6. **Checkpoints frequentes:** Evitar múltiplas modificações sem checkpoint intermediário
7. **Rollback como ferramenta:** Usar rollback para estado estável ao invés de tentar corrigir conflitos de git

---

## 🔗 Referências

- **Issue GitHub:** A ser criada (#58)
- **Checkpoint atual:** `dd19b6f5` (estável)
- **Arquivo principal a modificar:** `server/routers/routers-branches.ts`
- **Teste a criar:** `server/bugfix-branch-plans-complete.test.ts`
- **Commits anteriores:** 080e824 → cc051a47 → 4ab95343 → dd19b6f5

---

## 📌 Notas Técnicas

### Estrutura de Routers tRPC

```typescript
// appRouter (server/routers.ts)
export const appRouter = router({
  branches: branchesRouter,
  assessments: assessmentsRouter,
  actionPlans: actionPlansRouter,
  // ...
});

// assessmentsRouter (server/routers/routers-assessments.ts)
export const assessmentsRouter = router({
  corporateAssessment: router({
    generate: protectedProcedure.mutation(...),
    answer: protectedProcedure.mutation(...),
    complete: protectedProcedure.mutation(...),
  }),
  branchAssessment: router({
    generate: protectedProcedure.mutation(...),
    answer: protectedProcedure.mutation(...),
    complete: protectedProcedure.mutation(...),
  }),
});

// actionPlansRouter (server/routers/routers-action-plans.ts)
export const actionPlansRouter = router({
  corporate: router({
    generate: protectedProcedure.mutation(...),
  }),
  branch: router({
    generate: protectedProcedure.mutation(...),
  }),
});
```

### Chamada Correta no Teste

```typescript
// ❌ ERRADO
await caller.assessments.branchAssessment.list({ projectId });

// ✅ CORRETO
await caller.assessments.branchAssessment.generate({ 
  projectId, 
  branchId 
});
```

---

**Status Final:** 🟡 **EM ANDAMENTO** (70% completo)

**Próxima ação:** Implementar correções propostas e executar testes E2E completos.

---

**Autor:** Manus AI Agent  
**Última atualização:** 01/02/2026 10:59 GMT-3
