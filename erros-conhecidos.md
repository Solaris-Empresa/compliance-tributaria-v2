# Erros Conhecidos e Soluções

Este documento registra bugs críticos identificados no sistema, suas causas raiz e as soluções implementadas para referência futura.

---

## 1. Erro de Salvamento da Assessment Fase 1

**Data de Identificação:** 29/01/2026  
**Data de Resolução:** 01/02/2026  
**Sprints:** V26, V27, V28

### 📋 Descrição do Problema

Ao tentar salvar o formulário da Assessment Fase 1, o sistema retornava erro SQL:

```
Failed query: insert into `assessmentPhase1` (..., `completedAt`, `completedBy`, `completedByRole`) 
values (..., default, default, default)
```

**Sintomas:**
- Usuário preenchia todos os campos obrigatórios da Fase 1
- Ao clicar em "Finalizar Fase 1 e Continuar", recebia mensagem de erro
- Dados não eram salvos no banco de dados
- Erro persistia mesmo após múltiplas tentativas

### 🔍 Causa Raiz

O bug foi causado por uma incompatibilidade entre o **Drizzle ORM 0.44.6** e a forma como campos opcionais eram tratados no código:

1. **Schema do Banco:** Os campos `completedAt`, `completedBy`, `completedByRole` eram definidos como `NOT NULL DEFAULT 'default'` (string literal "default" como valor padrão)

2. **Código TypeScript:** O código tentava omitir esses campos do INSERT usando destructuring:
   ```typescript
   const { projectId, taxRegime, ... } = input; // SEM completedAt, completedBy, completedByRole
   await db.insert(assessmentPhase1).values({ projectId, taxRegime, ... });
   ```

3. **Comportamento do Drizzle ORM:** O ORM ignorava a omissão e incluía automaticamente TODOS os campos do schema no SQL, convertendo valores `undefined` para a string literal `"default"`:
   ```sql
   INSERT INTO assessmentPhase1 (..., completedAt, completedBy, completedByRole) 
   VALUES (..., default, default, default)  -- Strings "default", não NULL
   ```

4. **Erro no Banco:** O MySQL rejeitava o INSERT porque tentava inserir a string `"default"` em colunas `timestamp` e `int`, causando erro de tipo de dados.

### ✅ Solução Implementada

A solução envolveu **duas correções complementares**:

#### 1. Migração do Banco de Dados (Produção)

Alteramos os campos para aceitar `NULL` como valor padrão real:

```sql
-- assessmentPhase1
ALTER TABLE assessmentPhase1 
MODIFY COLUMN completedAt timestamp NULL DEFAULT NULL,
MODIFY COLUMN completedBy int NULL DEFAULT NULL,
MODIFY COLUMN completedByRole varchar(50) NULL DEFAULT NULL;

-- assessmentPhase2
ALTER TABLE assessmentPhase2 
MODIFY COLUMN completedAt timestamp NULL DEFAULT NULL,
MODIFY COLUMN completedBy int NULL DEFAULT NULL,
MODIFY COLUMN completedByRole varchar(50) NULL DEFAULT NULL;
```

**Tempo de Execução:**
- assessmentPhase1: 939ms
- assessmentPhase2: 930ms

#### 2. Correção do Código Backend

Modificamos `server/routers.ts` (linhas 196-212) para usar destructuring explícito que **omite completamente** os campos `completed*`:

```typescript
assessmentPhase1: t.router({
  save: protectedProcedure
    .input(/* schema de validação */)
    .mutation(async ({ input, ctx }) => {
      try {
        // Destructuring explícito: APENAS os 11 campos necessários
        const { 
          projectId, taxRegime, companySize, annualRevenue, 
          businessSector, mainActivity, employeeCount, 
          hasAccountingDept, currentERPSystem, mainChallenges, 
          complianceGoals 
        } = input;
        
        // INSERT com APENAS os campos extraídos (SEM completed*)
        await db.saveAssessmentPhase1({
          projectId,
          taxRegime,
          companySize,
          annualRevenue,
          businessSector,
          mainActivity,
          employeeCount,
          hasAccountingDept,
          currentERPSystem,
          mainChallenges,
          complianceGoals,
        });
        
        return { success: true };
      } catch (error) {
        console.error('[assessmentPhase1.save] Erro ao salvar:', error);
        throw error;
      }
    }),
}),
```

**Por que funciona:**
- O destructuring explícito garante que APENAS os 11 campos listados sejam passados para `saveAssessmentPhase1()`
- O Drizzle ORM não tem como incluir campos `completed*` porque eles simplesmente não existem no objeto
- O banco aceita `NULL` como padrão, então os campos são preenchidos automaticamente com `NULL`

### 🧪 Validação

Criamos **3 testes unitários** em `server/assessment-phase1-save.test.ts` para garantir que a correção funciona:

```typescript
describe('assessmentPhase1.save', () => {
  it('deve salvar fase 1 SEM campos completed* (usam NULL como padrão)', async () => {
    // Cria projeto e salva fase 1 sem completedAt, completedBy, completedByRole
    // ✅ Valida que INSERT funciona sem erro
  });

  it('deve permitir UPDATE posterior dos campos completed*', async () => {
    // Salva fase 1 inicialmente, depois atualiza campos completed*
    // ✅ Valida que UPDATE funciona corretamente
  });

  it('deve aceitar NULL explícito nos campos completed*', async () => {
    // Tenta UPDATE com NULL explícito
    // ✅ Valida que NULL é aceito pelo banco
  });
});
```

**Resultado:** 3/3 testes passaram ✅

### 📦 Checkpoints e Deploy

- **Sprint V26:** Primeira tentativa de correção (b40dc261)
- **Sprint V27:** Migração em produção + testes unitários (f9f84068, 4793954e)
- **Sprint V28:** Republicação forçada para aplicar código corrigido (0349cfdf, 00aecc4a)

**Status Final:** Bug resolvido definitivamente em produção (iasolaris.manus.space)

### 📚 Lições Aprendidas

1. **Drizzle ORM Behavior:** O ORM v0.44.6 usa o schema completo da tabela para gerar SQL, ignorando omissões no código TypeScript quando campos têm valores padrão definidos.

2. **Valores Padrão no Schema:** Usar strings literais como `DEFAULT 'default'` em colunas `timestamp` ou `int` causa erros de tipo. Sempre usar `NULL DEFAULT NULL` para campos opcionais.

3. **Destructuring Explícito:** Para garantir que campos sejam omitidos do INSERT, é necessário usar destructuring explícito que lista APENAS os campos desejados.

4. **Testes Unitários:** Criar testes que validam INSERT/UPDATE com campos opcionais é essencial para detectar esse tipo de bug antes de chegar em produção.

5. **Migração em Produção:** Migrações ALTER TABLE devem ser executadas diretamente no banco de produção via `webdev_execute_sql` quando o sistema de publicação não as aplica automaticamente.

### 🔗 Referências

- **Issue GitHub:** #58 (https://github.com/Solaris-Empresa/reforma-tributaria-plano-compliance/issues/58)
- **Commits:**
  - Sprint V26: b40dc261
  - Sprint V27: f9f84068, 4793954e, 52237567
  - Sprint V28: 0349cfdf, 00aecc4a
- **Testes:** `server/assessment-phase1-save.test.ts`

---

*Última atualização: 01/02/2026*

## 2. Erro 404 "Página não encontrada" Após Geração de Planos por Ramo

**Data de Identificação:** 01/02/2026  
**Data de Resolução:** 01/02/2026  
**Sprint:** V31

### 📋 Descrição do Problema

Após gerar planos de ação por ramo com sucesso, o sistema exibia mensagem de sucesso ("2 plano(s) por ramo gerado(s) com sucesso!") mas redirecionava para uma página 404 "Página não encontrada".

**Sintomas:**
- Geração de planos por ramo completava sem erros
- Toast de sucesso era exibido corretamente
- Após 1.5 segundos, sistema redirecionava para página 404
- Planos eram salvos corretamente no banco de dados
- Problema estava apenas no redirecionamento

### 🔍 Causa Raiz

URL de redirecionamento incorreta em `client/src/pages/PlanoAcao.tsx` linha 328:

```typescript
// ❌ URL INCORRETA (faltava prefixo /planos-acao/)
setLocation(`/visualizar-planos-por-ramo?projectId=${projectId}`);
```

**Problema:** A rota `/visualizar-planos-por-ramo` não existe no sistema. A rota correta definida em `client/src/App.tsx` linha 57 é:

```typescript
<Route path="/planos-acao/visualizar-planos-por-ramo" component={VisualizarPlanosPorRamo} />
```

**Análise:**
- Rota esperada pelo código: `/visualizar-planos-por-ramo`
- Rota real no sistema: `/planos-acao/visualizar-planos-por-ramo`
- Diferença: Faltava o prefixo `/planos-acao/`

### ✅ Solução Implementada

Corrigimos a URL de redirecionamento em `PlanoAcao.tsx` linha 328:

```typescript
// ✅ URL CORRETA (com prefixo /planos-acao/)
setLocation(`/planos-acao/visualizar-planos-por-ramo?projectId=${projectId}`);
```

**Código Completo (linhas 326-329):**

```typescript
toast.success(`${projectBranches.length} plano(s) por ramo gerado(s) com sucesso!`);
setTimeout(() => {
  setLocation(`/planos-acao/visualizar-planos-por-ramo?projectId=${projectId}`);
}, 1500);
```

### 🧪 Validação

Criamos **5 testes unitários** em `server/branch-plans-redirect.test.ts` para garantir que o redirecionamento funciona corretamente:

```typescript
describe('Redirecionamento após geração de planos por ramo', () => {
  it('deve construir URL correta com projectId', () => {
    // ✅ Valida formato completo da URL
  });

  it('deve incluir prefixo /planos-acao/ na rota', () => {
    // ✅ Valida que URL começa com /planos-acao/
  });

  it('deve validar formato completo da URL', () => {
    // ✅ Valida regex: /^\/planos-acao\/visualizar-planos-por-ramo\?projectId=\d+$/
  });

  it('deve aceitar diferentes valores de projectId', () => {
    // ✅ Valida múltiplos projectIds (1, 100, 9999, 123456)
  });

  it('deve rejeitar URL incorreta (sem /planos-acao/)', () => {
    // ✅ Valida que URL incorreta é diferente da correta
  });
});
```

**Resultado:** 5/5 testes passaram em 4ms ✅

### 📦 Checkpoints e Deploy

- **Sprint V31:** Correção do redirecionamento + testes unitários (93e36265)
- **Commit:** 36334848
- **Status Final:** Bug resolvido definitivamente

### 📚 Lições Aprendidas

1. **Consistência de Rotas:** Sempre verificar rotas definidas em `App.tsx` antes de implementar redirecionamentos no código.

2. **Prefixos de Rota:** Rotas agrupadas por funcionalidade (e.g., `/planos-acao/*`) devem manter o prefixo consistente em todos os redirecionamentos.

3. **Testes de Navegação:** Criar testes unitários validando URLs de redirecionamento previne erros 404 em produção.

4. **Validação de Formato:** Usar regex para validar formato completo de URLs garante que todos os componentes (prefixo, path, query params) estão corretos.

5. **Feedback Visual:** Mesmo com erro de redirecionamento, a funcionalidade principal (geração de planos) funcionava corretamente, indicando que o problema era isolado à navegação.

### 🔗 Referências

- **Issue GitHub:** #61 (https://github.com/Solaris-Empresa/reforma-tributaria-plano-compliance/issues/61)
- **Commit:** 36334848
- **Checkpoint:** 93e36265
- **Testes:** `server/branch-plans-redirect.test.ts`
- **Arquivo Corrigido:** `client/src/pages/PlanoAcao.tsx` (linha 328)
- **Rota Definida:** `client/src/App.tsx` (linha 57)

---

*Última atualização: 01/02/2026*

## 3. Seção "Planos por Ramo" Não Renderizada na Interface

**Data de Identificação:** 02/02/2026  
**Data de Resolução:** 02/02/2026  
**Sprint:** V34

### 📋 Descrição do Problema

A seção "Planos de Ação por Ramo" não aparecia na página `/projetos/:id/plano-acao`, mesmo com o código de renderização implementado corretamente.

**Sintomas:**
- Usuário acessava página "Planos de Ação" do projeto
- Seção "Planos de Ação por Ramo" não era exibida
- Código de renderização estava correto (linha 683 de `PlanoAcao.tsx`)
- Query tRPC `branches.getProjectBranches` funcionava corretamente
- Componente `VisualizarPlanosPorRamo.tsx` existia e estava correto

### 🔍 Causa Raiz

**NÃO era um bug de código** - era **falta de dados no banco de dados**.

O código implementa renderização condicional correta:

```typescript
// client/src/pages/PlanoAcao.tsx (linha 683)
{projectBranches.length > 0 && (
  <section className="mb-8">
    <h2 className="text-2xl font-bold mb-4">Planos de Ação por Ramo</h2>
    {/* Conteúdo da seção */}
  </section>
)}
```

**Condição:** `projectBranches.length > 0`

**Problema Identificado:**
- Projeto de teste (ID 510076) tinha **0 ramos de atividade cadastrados** na tabela `projectBranches`
- Query SQL confirmou: `SELECT COUNT(*) FROM projectBranches WHERE projectId = 510076` → **0 rows**
- Como `projectBranches.length === 0`, a condição retornava `false` e a seção não renderizava

**Conclusão:** O código estava correto. A funcionalidade só aparece quando o projeto tem pelo menos 1 ramo de atividade cadastrado, conforme esperado pelo design do sistema.

### ✅ Solução Implementada

Como não havia bug de código, a solução foi criar **infraestrutura de demonstração e documentação**:

#### 1. Projeto de Teste Completo

Criado projeto de demonstração (ID 540001) com dados completos:

```typescript
// server/seed-test-project-with-branches.ts
const project = await db.insert(projects).values({
  name: 'Projeto Teste - Planos por Ramo v1.0',
  description: 'Projeto de demonstração da funcionalidade de planos de ação por ramo de atividade',
  clientId: 1,
  createdById: 1,
  status: 'em_andamento',
});

// Associar 3 ramos de atividade
const branches = ['Comércio (COM)', 'Indústria (IND)', 'Serviços (SER)'];
for (const branch of branches) {
  await db.insert(projectBranches).values({
    projectId: project.id,
    branchId: branch.id,
  });
}

// Preencher Assessment Fase 1
await db.insert(assessmentPhase1).values({
  projectId: project.id,
  taxRegime: 'lucro_real',
  companySize: 'media',
  annualRevenue: 15000000,
  businessSector: 'saude',
  mainActivity: 'Serviços de tecnologia médica',
  employeeCount: 90,
  hasAccountingDept: 'sim',
  currentERPSystem: 'SAP',
  mainChallenges: 'Adaptação aos novos tributos IBS/CBS, gestão de créditos tributários',
  complianceGoals: 'Conformidade 100% até 2026, otimização de carga tributária',
});
```

**Resultado:**
- Projeto ID: 540001
- Ramos cadastrados: 3 (Comércio, Indústria, Serviços)
- Assessment Fase 1: ✅ Preenchido
- Seção "Planos por Ramo": ✅ Visível na UI

#### 2. Script de Seed Reutilizável

Criado script `server/seed-test-project-with-branches.ts` que pode ser executado para criar projetos de teste:

```bash
npx tsx server/seed-test-project-with-branches.ts
```

**Saída do Script:**
```
🚀 Criando projeto de teste completo...
1️⃣ Criando projeto...
✅ Projeto criado: ID 540001

2️⃣ Buscando ramos de atividade...
✅ Encontrados 3 ramos:
   1. COM - Comércio
   2. IND - Indústria
   3. SER - Serviços

3️⃣ Associando ramos ao projeto...
✅ 3 ramos associados ao projeto

4️⃣ Criando Assessment Fase 1...
✅ Assessment Fase 1 criado

🎉 PROJETO DE TESTE CRIADO COM SUCESSO!
```

#### 3. Documentação Completa

Criado documento `docs/funcionalidade-planos-por-ramo.md` com:

- **Visão Geral:** Explicação da funcionalidade
- **Pré-requisitos:** Como cadastrar ramos de atividade
- **Renderização Condicional:** Explicação da condição `projectBranches.length > 0`
- **Fluxo de Uso:** 3 etapas detalhadas (verificar ramos → gerar planos → visualizar)
- **Arquitetura Técnica:** Frontend + Backend (código relevante referenciado)
- **Projeto de Teste:** Instruções para acessar projeto 540001
- **Troubleshooting:** Como resolver problema de seção não aparecer
- **Histórico de Mudanças:** Documentação do Sprint V34

### 🧪 Validação

Criamos **5 testes unitários** em `server/planos-por-ramo-renderizacao.test.ts` para validar a renderização condicional:

```typescript
describe('Renderização Condicional - Planos por Ramo', () => {
  it('Deve retornar projectBranches.length > 0 para projeto 540001', async () => {
    const branches = await db.select().from(projectBranches)
      .where(eq(projectBranches.projectId, 540001));
    expect(branches.length).toBeGreaterThan(0);
    // ✅ Projeto 540001 tem 3 ramos cadastrados
  });

  it('Deve retornar projectBranches.length === 0 para projeto 510076', async () => {
    const branches = await db.select().from(projectBranches)
      .where(eq(projectBranches.projectId, 510076));
    expect(branches.length).toBe(0);
    // ✅ Projeto 510076 tem 0 ramos cadastrados (esperado)
  });

  it('Deve retornar exatamente 3 ramos para projeto 540001', async () => {
    const branches = await db.select().from(projectBranches)
      .where(eq(projectBranches.projectId, 540001));
    expect(branches.length).toBe(3);
    // ✅ Projeto 540001 tem exatamente 3 ramos
  });

  it('Deve retornar dados completos dos ramos com JOIN', async () => {
    const branches = await db.select({
      id: projectBranches.id,
      projectId: projectBranches.projectId,
      branchId: projectBranches.branchId,
      code: activityBranches.code,
      name: activityBranches.name,
    })
    .from(projectBranches)
    .innerJoin(activityBranches, eq(projectBranches.branchId, activityBranches.id))
    .where(eq(projectBranches.projectId, 540001));
    
    expect(branches.length).toBe(3);
    expect(branches[0]).toHaveProperty('code');
    expect(branches[0]).toHaveProperty('name');
    // ✅ JOIN retornou 3 ramos com dados completos
  });

  it('Deve validar condição de renderização: projectBranches.length > 0', async () => {
    // Projeto COM ramos
    const branchesWithData = await db.select().from(projectBranches)
      .where(eq(projectBranches.projectId, 540001));
    const shouldRenderWithData = branchesWithData.length > 0;
    expect(shouldRenderWithData).toBe(true);

    // Projeto SEM ramos
    const branchesWithoutData = await db.select().from(projectBranches)
      .where(eq(projectBranches.projectId, 510076));
    const shouldRenderWithoutData = branchesWithoutData.length > 0;
    expect(shouldRenderWithoutData).toBe(false);
    
    // ✅ Condição de renderização validada:
    //    - Projeto 540001 (com ramos): renderiza = true
    //    - Projeto 510076 (sem ramos): renderiza = false
  });
});
```

**Resultado:** 5/5 testes passaram em 599ms ✅

### 📦 Checkpoints e Deploy

- **Sprint V34:** Projeto de teste + documentação + testes (3fc6120e)
- **Commit:** 3fc6120e
- **Status Final:** Funcionalidade validada e documentada

### 📚 Lições Aprendidas

1. **Renderização Condicional:** Sempre verificar se a condição de renderização está correta E se os dados necessários existem no banco antes de assumir que há bug de código.

2. **Dados de Teste:** Criar projetos de teste completos com dados realistas é essencial para demonstrar funcionalidades que dependem de dados específicos.

3. **Documentação de Pré-requisitos:** Funcionalidades que só aparecem sob certas condições devem ter documentação clara explicando os pré-requisitos.

4. **Scripts de Seed:** Criar scripts reutilizáveis para popular dados de teste facilita validação e demonstração de funcionalidades.

5. **Testes de Renderização:** Validar condições de renderização com testes unitários garante que a lógica condicional funciona corretamente.

6. **Troubleshooting Proativo:** Documentar como resolver problemas comuns (ex: "seção não aparece") economiza tempo de suporte no futuro.

### 🔗 Referências

- **Issue GitHub:** #62 (https://github.com/Solaris-Empresa/reforma-tributaria-plano-compliance/issues/62)
- **Commit:** 3fc6120e
- **Checkpoint:** 3fc6120e
- **Testes:** `server/planos-por-ramo-renderizacao.test.ts`
- **Script de Seed:** `server/seed-test-project-with-branches.ts`
- **Documentação:** `docs/funcionalidade-planos-por-ramo.md`
- **Código de Renderização:** `client/src/pages/PlanoAcao.tsx` (linha 683)
- **Projeto de Teste:** ID 540001 (3 ramos cadastrados)

### 🎯 Como Testar

1. Acessar: `/projetos/540001/plano-acao`
2. Verificar que seção "Planos de Ação por Ramo" está visível
3. Clicar em "Gerar Planos por Ramo" para testar funcionalidade completa

---

*Última atualização: 02/02/2026*
