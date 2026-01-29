# Análise Completa: Bug de Transição Assessment Fase 1→2

## Resumo Executivo
Bug crítico bloqueador impede transição de Assessment Fase 1 para Fase 2. Erro: "Cannot read properties of undefined (reading 'projectId')".

## Sintomas
- Formulário Assessment Fase 1 preenche corretamente
- Botão "Salvar Rascunho" funciona (dados salvos no banco confirmados)
- Botão "Finalizar Fase 1 e Continuar" dispara erro
- Erro aparece no console do browser, não nos logs do servidor
- Toast de erro aparece para o usuário

## Investigação Realizada

### 1. Logs do Browser (browserConsole.log)
```
[handleComplete] Erro capturado: TRPCClientError: Cannot read properties of undefined (reading 'projectId')
```

### 2. Logs do Servidor (devserver.log)
- Nenhuma chamada ao endpoint `assessmentPhase1.complete` registrada
- Logs de debug adicionados não aparecem
- Conclusão: Erro acontece ANTES da chamada chegar ao backend

### 3. Código Frontend (AssessmentFase1.tsx)
```typescript
const handleComplete = async () => {
  try {
    console.log('[handleComplete] Iniciando... projectId:', projectId);
    
    // Validar campos obrigatórios
    const requiredFields = [
      "taxRegime",
      "companySize",
      "annualRevenue",
      "businessSector",
      "mainActivity",
    ];

    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);

    if (missingFields.length > 0) {
      toast.error("Preencha todos os campos obrigatórios antes de continuar");
      return;
    }

    console.log('[handleComplete] Campos validados, salvando dados...');
    // Primeiro salvar os dados
    const saveResult = await savePhase1.mutateAsync({
      projectId,
      ...formData,
      annualRevenue: parseFloat(formData.annualRevenue),
      employeeCount: formData.employeeCount ? parseInt(formData.employeeCount) : undefined,
    });
    console.log('[handleComplete] Dados salvos com sucesso:', saveResult);

    console.log('[handleComplete] Completando fase com projectId:', projectId);
    // Depois completar a fase
    const completeResult = await completePhase1.mutateAsync({ projectId });
    console.log('[handleComplete] Fase completada com sucesso:', completeResult);
  } catch (error) {
    console.error('[handleComplete] Erro capturado:', error);
    toast.error(`Erro ao salvar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};
```

**Observação:** O log `[handleComplete] Iniciando... projectId: 1` NÃO aparece nos logs, indicando que o erro acontece ANTES do handleComplete ser executado ou durante a execução do `savePhase1.mutateAsync`.

### 4. Código Backend (routers.ts)
```typescript
complete: projectAccessMiddleware
  .input(z.object({ projectId: z.number() }))
  .mutation(async ({ input }) => {
    console.log('[assessmentPhase1.complete] Recebido:', input);
    
    const phase1 = await db.getAssessmentPhase1(input.projectId);
    if (!phase1) throw new TRPCError({ code: "NOT_FOUND", message: "Phase 1 not found" });

    await db.saveAssessmentPhase1({
      ...phase1,
      completedAt: new Date(),
      completedBy: ctx.user.id,
      completedByRole: ctx.user.role as any,
    });

    // Avançar status do projeto
    await db.updateProject(input.projectId, { status: "assessment_fase2" });

    return { success: true };
  }),
```

**Observação:** Log `[assessmentPhase1.complete] Recebido:` NÃO aparece, confirmando que a chamada não chega ao backend.

## Hipóteses

### Hipótese 1: Erro no middleware `projectAccessMiddleware`
O middleware pode estar tentando acessar `input.projectId` antes do input ser validado pelo Zod.

### Hipótese 2: Erro na mutation `savePhase1`
O erro pode estar acontecendo durante a execução de `savePhase1.mutateAsync`, não no `completePhase1`.

### Hipótese 3: Problema de contexto tRPC
O contexto do tRPC pode estar undefined em algum ponto da cadeia de execução.

## Próximos Passos

1. ✅ Adicionar logs detalhados no handleComplete (FEITO - logs não aparecem)
2. ✅ Verificar logs do servidor (FEITO - nenhuma chamada registrada)
3. ⏳ Investigar middleware `projectAccessMiddleware`
4. ⏳ Testar `savePhase1` isoladamente
5. ⏳ Adicionar logs no middleware do backend
6. ⏳ Verificar se o erro vem do tRPC client ou server

## Status Atual
- **Progresso E2E:** 85%
- **Bug:** CRÍTICO - Bloqueador
- **Prioridade:** ALTA
- **Impacto:** Impede fluxo completo do Assessment

## Dados de Teste
- **Cliente ID:** 1
- **Projeto ID:** 1
- **Status Projeto:** assessment_fase2 (atualizado manualmente via SQL)
- **Dados Fase 1:** Salvos no banco (confirmado via SQL)

## Conclusão Preliminar
O erro "Cannot read properties of undefined (reading 'projectId')" está acontecendo no lado do cliente (tRPC client) ou no middleware do backend ANTES da validação do input. A chamada não está chegando ao handler do endpoint `complete`.

**Recomendação:** Investigar middleware `projectAccessMiddleware` e adicionar logs detalhados para identificar onde exatamente o `projectId` está sendo acessado de forma inválida.
