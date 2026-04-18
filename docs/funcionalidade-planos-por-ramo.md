# Funcionalidade: Planos de Ação por Ramo de Atividade

## Visão Geral

A funcionalidade **"Planos de Ação por Ramo"** permite gerar planos de ação específicos para cada ramo de atividade (CNAE) cadastrado no projeto. Esta funcionalidade complementa o plano corporativo geral, fornecendo análises e ações customizadas para as particularidades de cada ramo.

## Pré-requisitos

Para que a seção "Planos de Ação por Ramo" apareça na interface, o projeto **DEVE** ter pelo menos 1 ramo de atividade cadastrado.

### Como Cadastrar Ramos de Atividade

1. Acesse a página **"Questionários por Ramo"** do projeto
2. Clique em **"Adicionar Ramo de Atividade"**
3. Selecione o(s) CNAE(s) desejado(s)
4. Preencha o questionário específico do ramo
5. Salve o questionário

Após cadastrar pelo menos 1 ramo, a seção "Planos de Ação por Ramo" ficará visível na página de Planos de Ação.

## Renderização Condicional

A seção é renderizada condicionalmente com base na seguinte lógica:

```typescript
// Arquivo: client/src/pages/PlanoAcao.tsx (linha 683)
{projectBranches.length > 0 && (
  <section className="mb-8">
    <h2 className="text-2xl font-bold mb-4">Planos de Ação por Ramo</h2>
    {/* Conteúdo da seção */}
  </section>
)}
```

**Condição:** `projectBranches.length > 0`

- ✅ **Renderiza:** Quando o projeto tem 1 ou mais ramos cadastrados
- ❌ **NÃO renderiza:** Quando o projeto não tem ramos cadastrados

## Fluxo de Uso

### 1. Verificar Ramos Cadastrados

Ao acessar a página "Planos de Ação", o sistema:
1. Consulta o backend via tRPC: `trpc.branches.getProjectBranches.useQuery({ projectId })`
2. Verifica se `projectBranches.length > 0`
3. Se verdadeiro, renderiza a seção "Planos de Ação por Ramo"

### 2. Gerar Planos por Ramo

Quando o usuário clica em **"Gerar Planos por Ramo"**:

1. **Etapa 1:** Gerar questionários por ramo (se não existirem)
   - Itera sobre todos os ramos selecionados
   - Chama `branchAssessment.generate` para cada ramo
   - Cria questionários específicos automaticamente

2. **Etapa 2:** Gerar planos de ação por ramo
   - Itera novamente sobre os ramos
   - Chama `actionPlans.branch.generate` para cada ramo
   - Gera planos customizados com base nos questionários

3. **Redirecionamento:** Após conclusão, redireciona para `/planos-acao/visualizar-planos-por-ramo?projectId=${projectId}`

### 3. Visualizar Planos Gerados

Na página de visualização, o usuário pode:
- Ver todos os planos gerados por ramo
- Comparar planos de diferentes ramos
- Exportar planos individuais ou consolidados

## Arquitetura Técnica

### Frontend

**Arquivo:** `client/src/pages/PlanoAcao.tsx`

**Query tRPC:**
```typescript
const { data: projectBranches = [] } = trpc.branches.getProjectBranches.useQuery({
  projectId: Number(projectId),
});
```

**Mutation para Gerar Planos:**
```typescript
const generateBranchPlansMutation = trpc.actionPlans.branch.generate.useMutation({
  onSuccess: () => {
    toast.success('Planos por ramo gerados com sucesso!');
    router.push(`/planos-acao/visualizar-planos-por-ramo?projectId=${projectId}`);
  },
});
```

### Backend

**Router:** `server/routers-action-plans.ts`

**Procedure:** `actionPlans.branch.generate`

**Lógica:**
1. Valida que projeto existe
2. Busca questionário do ramo específico
3. Busca dados corporativos (Fase 1 e 2)
4. Gera plano via IA (LLM)
5. Salva plano no banco de dados
6. Retorna plano gerado

## Projeto de Teste

Para demonstrar a funcionalidade, foi criado um projeto de teste completo:

**Projeto ID:** 540001  
**Nome:** Projeto Teste - Planos por Ramo v1.0  
**Ramos Cadastrados:** 3 (Comércio, Indústria, Serviços)  
**Assessment Fase 1:** ✅ Preenchido

### Como Acessar

1. Acesse: `/projetos/540001/plano-acao`
2. A seção "Planos de Ação por Ramo" estará visível
3. Clique em "Gerar Planos por Ramo" para testar

### Script de Criação

O projeto foi criado usando o script:
```bash
npx tsx server/seed-test-project-with-branches.ts
```

## Testes Automatizados

**Arquivo:** `server/planos-por-ramo-renderizacao.test.ts`

**Cobertura:** 5/5 testes (100%)

**Cenários Testados:**
1. ✅ Projeto com ramos → `projectBranches.length > 0`
2. ✅ Projeto sem ramos → `projectBranches.length === 0`
3. ✅ Projeto com exatamente 3 ramos
4. ✅ JOIN retorna dados completos dos ramos
5. ✅ Condição de renderização validada

**Executar Testes:**
```bash
pnpm test planos-por-ramo-renderizacao.test.ts
```

## Troubleshooting

### Seção "Planos por Ramo" Não Aparece

**Causa:** Projeto não tem ramos de atividade cadastrados

**Solução:**
1. Acesse "Questionários por Ramo"
2. Cadastre pelo menos 1 ramo de atividade
3. Retorne à página "Planos de Ação"
4. A seção deve aparecer automaticamente

**Validação Manual:**
```sql
SELECT COUNT(*) FROM projectBranches WHERE projectId = <SEU_PROJECT_ID>;
```

Se retornar 0, o projeto não tem ramos cadastrados.

### Erro ao Gerar Planos por Ramo

**Causa:** Questionários por ramo não existem

**Solução:** A partir da v1.0, o sistema gera questionários automaticamente antes de gerar planos. Se o erro persistir:
1. Verifique logs do backend
2. Confirme que ramos estão cadastrados
3. Tente gerar questionários manualmente primeiro

## Histórico de Mudanças

### v1.0.0 (02/02/2026)
- ✅ Correção: Geração automática de questionários antes dos planos
- ✅ Melhoria: Progresso visual durante geração (X/Y etapas)
- ✅ Melhoria: Toasts informativos para cada etapa
- ✅ Documentação: Criado projeto de teste completo
- ✅ Testes: 5 testes unitários validando renderização

## Referências

- **Código Frontend:** `client/src/pages/PlanoAcao.tsx` (linhas 167-336, 683-720)
- **Código Backend:** `server/routers-action-plans.ts` (router `actionPlans.branch`)
- **Schema do Banco:** `drizzle/schema.ts` (tabelas `projectBranches`, `activityBranches`)
- **Testes:** `server/planos-por-ramo-renderizacao.test.ts`
- **Script de Seed:** `server/seed-test-project-with-branches.ts`

## Suporte

Para dúvidas ou problemas, consulte:
- **Documentação Baseline:** `baseline.md`
- **Erros Conhecidos:** `erros-conhecidos.md`
- **Changelog:** `CHANGELOG.md`
- **GitHub Issues:** https://github.com/Solaris-Empresa/reforma-tributaria-plano-compliance/issues
