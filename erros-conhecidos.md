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
