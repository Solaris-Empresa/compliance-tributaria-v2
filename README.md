# Plataforma de Compliance - Reforma Tributária

Sistema completo de gestão de compliance tributário desenvolvido para auxiliar empresas na adequação à reforma tributária brasileira. A plataforma oferece assessment automatizado, geração de planos de ação via IA, matriz de riscos e acompanhamento de execução.

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Controle de Acesso](#controle-de-acesso)
- [Desenvolvimento](#desenvolvimento)
- [Testes](#testes)
- [Troubleshooting](#troubleshooting)
- [Deploy](#deploy)

**Documentação Técnica Detalhada:**
- [`docs/OBSERVABILITY.md`](docs/OBSERVABILITY.md) — Health checks, tracing estruturado, endpoints de diagnóstico
- [`docs/DEPLOY-GUIDE.md`](docs/DEPLOY-GUIDE.md) — Fluxo de deploy, controle de versão, checklist, rollback
- [`docs/architecture/cnae-pipeline.md`](docs/architecture/cnae-pipeline.md) — Arquitetura do pipeline CNAE Discovery

---

## 🎯 Visão Geral

A plataforma implementa um fluxo completo de compliance tributário dividido em fases sequenciais que guiam empresas desde a avaliação inicial até a execução de ações corretivas.

### Fluxo Principal

O sistema segue um fluxo linear que garante a qualidade e completude do processo de compliance. Cada fase depende da anterior e adiciona camadas progressivas de análise e planejamento.

**Assessment Fase 1** coleta informações básicas da empresa através de um formulário estruturado que captura regime tributário, porte, faturamento anual, setor de atuação e atividade principal. Esses dados formam a base para todas as análises subsequentes.

**Assessment Fase 2** utiliza inteligência artificial para gerar perguntas dinâmicas e contextualizadas baseadas nas respostas da Fase 1. O sistema analisa o perfil da empresa e cria um questionário personalizado que explora gaps específicos de compliance, práticas contábeis, sistemas utilizados e preparação para a reforma tributária.

**Levantamento Inicial (Briefing)** processa todas as respostas do assessment através de um modelo de linguagem avançado que identifica gaps de compliance, avalia níveis de risco e gera recomendações estratégicas. O briefing consolida uma visão executiva da situação da empresa e aponta áreas críticas que requerem atenção imediata.

**Matriz de Riscos** documenta riscos tributários identificados com classificação de probabilidade e impacto. O sistema permite geração automática via IA ou cadastro manual de riscos, oferecendo flexibilidade para diferentes cenários de uso.

**Plano de Ação** traduz o briefing e a matriz de riscos em um cronograma executável com ações específicas, responsáveis, prazos e dependências. O plano pode ser gerado automaticamente pela IA ou adaptado de templates previamente aprovados, garantindo consistência e qualidade.

**Execução** transforma o plano aprovado em tarefas rastreáveis organizadas em sprints. O sistema oferece kanban board, gestão de comentários, controles COSO e dashboards de progresso para acompanhamento em tempo real.

### Tecnologias

A plataforma utiliza uma stack moderna e robusta que prioriza type-safety, developer experience e performance. **React 19** com **Tailwind CSS 4** compõem o frontend, oferecendo componentes reativos e estilização utilitária. **tRPC 11** estabelece contratos type-safe entre cliente e servidor, eliminando a necessidade de validação manual de APIs. **Express 4** gerencia o backend com middleware customizado para autenticação e autorização. **Drizzle ORM** fornece acesso type-safe ao banco de dados **MySQL/TiDB**, permitindo queries complexas com autocompletar e validação em tempo de compilação. **Vitest** garante qualidade através de testes unitários e de integração com suporte nativo a TypeScript.

---

## 🏗️ Arquitetura

O sistema segue uma arquitetura monolítica modular que separa claramente responsabilidades entre camadas enquanto mantém a simplicidade operacional de um único processo.

### Estrutura de Diretórios

A organização do código reflete a separação de responsabilidades e facilita a navegação. O diretório `client/` contém toda a aplicação frontend com subdivisões por tipo de componente. `client/src/pages/` agrupa componentes de página completos, `client/src/components/` mantém componentes reutilizáveis e `client/src/lib/` centraliza utilitários e configurações. O diretório `server/` concentra a lógica de negócio com `server/routers.ts` definindo todos os procedimentos tRPC, `server/db.ts` encapsulando queries ao banco de dados e `server/_core/` isolando infraestrutura como autenticação e integração com LLM. O diretório `drizzle/` gerencia schema e migrações do banco de dados, enquanto `shared/` mantém constantes e tipos compartilhados entre cliente e servidor.

### Fluxo de Dados

Requisições do cliente são iniciadas através de hooks tRPC (`trpc.*.useQuery` ou `trpc.*.useMutation`) que automaticamente serializam parâmetros e gerenciam estados de loading e erro. O cliente tRPC envia requisições HTTP POST para `/api/trpc` onde o servidor Express roteia para o procedimento correspondente. Cada procedimento executa validação de input via Zod, autenticação via middleware protectedProcedure e autorização via validateProjectAccess quando aplicável. A camada de negócio acessa o banco de dados através de funções em `server/db.ts` que retornam objetos Drizzle tipados. Respostas são serializadas via Superjson (preservando tipos como Date) e retornadas ao cliente onde hooks tRPC atualizam automaticamente o estado da UI.

### Integração com IA

O sistema integra modelos de linguagem para geração de conteúdo contextualizado em três pontos críticos do fluxo. A geração de perguntas dinâmicas na Fase 2 do assessment analisa respostas da Fase 1 e cria um questionário personalizado que explora gaps específicos da empresa. A geração do briefing processa todas as respostas do assessment e produz uma análise executiva com identificação de riscos, gaps de compliance e recomendações estratégicas. A geração do plano de ação transforma o briefing e a matriz de riscos em um cronograma executável com ações, responsáveis, prazos e dependências. Todas as integrações utilizam a função `invokeLLM` do módulo `server/_core/llm.ts` que encapsula autenticação, retry logic e tratamento de erros.

---

## 🔐 Controle de Acesso

O sistema implementa um modelo de controle de acesso baseado em roles (RBAC) com três níveis de permissão e validação granular por projeto. A arquitetura de segurança prioriza simplicidade, auditabilidade e consistência.

### Roles de Usuário

O sistema define três roles principais com hierarquia de permissões clara. **Equipe SOLARIS** possui acesso total a todos os projetos e funcionalidades administrativas, incluindo criação de projetos, gestão de usuários e aprovação de planos. **Advogado Sênior** tem acesso total a todos os projetos com permissões especiais para aprovar ou rejeitar planos de ação, mas sem acesso a funcionalidades administrativas do sistema. **Cliente** tem acesso restrito apenas aos projetos nos quais está vinculado como participante, podendo visualizar e responder assessments mas sem permissões de aprovação ou gestão.

### Padrão de Validação de Acesso

Todos os procedimentos tRPC que manipulam dados de projetos devem implementar validação de acesso consistente. O padrão estabelecido utiliza `protectedProcedure` como base para garantir autenticação e `validateProjectAccess` para verificar autorização específica ao projeto.

#### Estrutura Básica

```typescript
procedureName: protectedProcedure
  .input(z.object({
    projectId: z.number(),
    // outros campos...
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Validar acesso ao projeto (SEMPRE primeiro)
    await validateProjectAccess(ctx, input.projectId);
    
    // 2. Lógica de negócio
    const result = await db.someOperation(input);
    
    // 3. Retornar resultado
    return { success: true, data: result };
  }),
```

#### Função validateProjectAccess

A função `validateProjectAccess` encapsula toda a lógica de autorização e deve ser chamada no início de toda mutation ou query que acessa dados de projeto.

```typescript
const validateProjectAccess = async (ctx: any, projectId: number) => {
  // 1. Verificar existência do projeto
  const project = await db.getProjectById(projectId);
  if (!project) {
    throw new TRPCError({ 
      code: "NOT_FOUND", 
      message: "Project not found" 
    });
  }

  // 2. Equipe SOLARIS e Advogado Sênior têm acesso total
  if (ctx.user.role === "equipe_solaris" || 
      ctx.user.role === "advogado_senior") {
    return project;
  }

  // 3. Cliente precisa estar vinculado ao projeto
  const hasAccess = await db.isUserInProject(ctx.user.id, projectId);
  if (!hasAccess) {
    throw new TRPCError({ 
      code: "FORBIDDEN", 
      message: "Access denied" 
    });
  }

  return project;
};
```

#### Exemplos de Uso

**Query simples** que retorna dados do projeto:

```typescript
get: protectedProcedure
  .input(z.object({ projectId: z.number() }))
  .query(async ({ input, ctx }) => {
    await validateProjectAccess(ctx, input.projectId);
    return await db.getProjectById(input.projectId);
  }),
```

**Mutation com validação adicional de role**:

```typescript
approve: protectedProcedure
  .input(z.object({
    projectId: z.number(),
    planId: z.number(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Validar acesso ao projeto
    await validateProjectAccess(ctx, input.projectId);
    
    // Validação adicional: apenas advogado sênior pode aprovar
    if (ctx.user.role !== "advogado_senior") {
      throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: "Only senior lawyer can approve" 
      });
    }
    
    await db.updateActionPlanStatus(input.planId, "aprovado", ctx.user.id);
    return { success: true };
  }),
```

**Mutation com múltiplos parâmetros**:

```typescript
update: protectedProcedure
  .input(z.object({
    projectId: z.number(),
    name: z.string().optional(),
    planPeriodMonths: z.number().optional(),
    notificationFrequency: z.enum([
      "diaria", "semanal", "apenas_atrasos", 
      "marcos_importantes", "personalizada"
    ]).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const { projectId, ...data } = input;
    
    // Validar acesso antes de qualquer operação
    await validateProjectAccess(ctx, projectId);
    
    await db.updateProject(projectId, data);
    return { success: true };
  }),
```

### Boas Práticas

**Sempre valide acesso primeiro** antes de qualquer lógica de negócio ou query ao banco de dados. Isso previne vazamento de informações através de mensagens de erro e garante auditabilidade consistente.

**Nunca reutilize projectAccessMiddleware** como procedure base. O middleware foi descontinuado porque tentava acessar `input` antes da validação Zod, causando erros de "projectId is required". Use sempre `protectedProcedure` + `validateProjectAccess`.

**Extraia projectId explicitamente** quando houver múltiplos parâmetros no input. Isso torna o código mais legível e evita erros de destructuring.

**Adicione validações de role** após `validateProjectAccess` quando necessário. A função valida apenas acesso ao projeto, não permissões específicas como aprovação.

**Teste cenários de acesso negado** para cada procedimento. Os testes devem cobrir: usuário não autenticado, cliente não vinculado ao projeto, projeto inexistente e validações de role específicas.

### Casos de Uso Comuns

**Procedimentos de leitura** (queries) devem sempre validar acesso mesmo que apenas retornem dados. Isso previne enumeração de projetos e vazamento de informações sensíveis.

**Procedimentos de escrita** (mutations) devem validar acesso antes de qualquer modificação no banco de dados. Rollback de transações não desfaz logs de auditoria ou efeitos colaterais.

**Procedimentos com geração via IA** devem validar acesso antes de invocar o LLM. Chamadas LLM são custosas e não devem ser executadas para usuários sem permissão.

**Procedimentos administrativos** podem adicionar validações extras de role após `validateProjectAccess`. Por exemplo, criação de templates ou gestão de usuários.

---

## 💻 Desenvolvimento

O ambiente de desenvolvimento prioriza produtividade através de type-safety, hot reload e ferramentas de debugging integradas.

### Configuração Inicial

Clone o repositório e instale dependências com `pnpm install`. Configure variáveis de ambiente copiando `.env.example` para `.env` e preenchendo credenciais de banco de dados e APIs externas. Execute migrações com `pnpm db:push` para criar tabelas no banco de dados. Inicie o servidor de desenvolvimento com `pnpm dev` que ativa hot reload tanto para cliente quanto servidor.

### Scripts Disponíveis

O projeto oferece scripts npm para tarefas comuns de desenvolvimento. `pnpm dev` inicia servidor de desenvolvimento com hot reload em `http://localhost:3000`. `pnpm build` compila cliente e servidor para produção. `pnpm test` executa suite de testes com Vitest. `pnpm db:push` aplica mudanças de schema ao banco de dados. `pnpm db:studio` abre interface visual Drizzle Studio para explorar dados.

### Adicionando Novos Procedimentos

Novos procedimentos tRPC devem seguir o padrão estabelecido para manter consistência e segurança. Defina o procedimento em `server/routers.ts` dentro do router apropriado. Use `protectedProcedure` como base e adicione validação de input com Zod. Chame `validateProjectAccess` no início da mutation/query se o procedimento manipula dados de projeto. Implemente lógica de negócio através de funções em `server/db.ts`. Retorne objetos tipados que serão automaticamente serializados pelo tRPC. Adicione testes em `server/*.test.ts` cobrindo casos de sucesso e falha.

### Trabalhando com Banco de Dados

Modificações no schema devem seguir o fluxo Drizzle. Edite `drizzle/schema.ts` adicionando ou modificando tabelas. Execute `pnpm db:push` para aplicar mudanças ao banco de dados. Crie ou atualize funções em `server/db.ts` para acessar novos campos. Use Drizzle Studio (`pnpm db:studio`) para visualizar e editar dados durante desenvolvimento.

---

## 🧪 Testes

O projeto utiliza Vitest para testes unitários e de integração com foco em validação de acesso e lógica de negócio crítica.

### Estrutura de Testes

Testes são organizados em arquivos `*.test.ts` dentro do diretório `server/`. O arquivo `server/test-helpers.ts` fornece utilitários para criar contextos de teste com diferentes roles. Cada arquivo de teste cobre um módulo específico (ex: `projectAccess.test.ts` valida controle de acesso, `auth.logout.test.ts` testa autenticação).

### Executando Testes

Execute todos os testes com `pnpm test`. Para executar arquivo específico use `pnpm test <nome-do-arquivo>`. Testes rodam com timeout de 60 segundos para acomodar operações com IA. Alguns testes que envolvem geração LLM são marcados como `skip` para evitar custos e timeouts em CI/CD.

### Escrevendo Testes de Acesso

Testes de validação de acesso devem cobrir todos os cenários de permissão. Crie callers com diferentes roles usando `createCaller` do test-helpers. Teste acesso permitido para roles autorizados (equipe_solaris, advogado_senior). Teste acesso negado para cliente não vinculado ao projeto. Teste erro NOT_FOUND para projetos inexistentes. Teste validações adicionais de role quando aplicável (ex: apenas advogado sênior pode aprovar).

### Exemplo de Teste

```typescript
describe("validateProjectAccess - Cliente", () => {
  it("should DENY access to cliente not in project", async () => {
    const clienteCaller = createCaller({ 
      id: 999, 
      role: "cliente" 
    });
    
    await expect(
      clienteCaller.projects.getById({ id: testProjectId })
    ).rejects.toThrow("Access denied");
  });
  
  it("should ALLOW access to cliente IN project", async () => {
    // Assumindo que cliente foi adicionado ao projeto
    const clienteCaller = createCaller({ 
      id: clienteId, 
      role: "cliente" 
    });
    
    const result = await clienteCaller.projects.getById({ 
      id: testProjectId 
    });
    
    expect(result.id).toBe(testProjectId);
  });
});
```

---

## 🔧 Troubleshooting

Esta seção documenta erros comuns encontrados durante o desenvolvimento e suas soluções práticas. Os problemas estão organizados por categoria para facilitar a identificação e resolução rápida.

### Erros de Validação de Acesso

**Erro: "projectId is required"**

Este erro ocorre quando um procedimento tRPC tenta acessar `input.projectId` antes da validação Zod. O problema era comum em procedimentos que usavam `projectAccessMiddleware` como procedure base.

**Causa raiz**: O middleware `projectAccessMiddleware` tentava extrair `projectId` do input antes do Zod fazer o parse, resultando em `undefined`.

**Solução**: Substitua `projectAccessMiddleware` por `protectedProcedure` e adicione `validateProjectAccess` manualmente dentro da mutation/query.

```typescript
// ❌ Errado (causa "projectId is required")
get: projectAccessMiddleware
  .input(z.object({ projectId: z.number() }))
  .query(async ({ input }) => {
    return await db.getProjectById(input.projectId);
  }),

// ✅ Correto
get: protectedProcedure
  .input(z.object({ projectId: z.number() }))
  .query(async ({ input, ctx }) => {
    await validateProjectAccess(ctx, input.projectId);
    return await db.getProjectById(input.projectId);
  }),
```

**Erro: "Access denied"**

Este erro indica que um usuário autenticado tentou acessar um projeto sem permissão. O sistema valida acesso baseado em roles e vinculação ao projeto.

**Causas comuns**: Cliente tentando acessar projeto no qual não está vinculado. Usuário com role incorreto tentando executar operação privilegiada. Token de autenticação expirado ou inválido.

**Solução**: Verifique que o usuário tem o role adequado (`equipe_solaris`, `advogado_senior` ou `cliente`). Para clientes, confirme que estão vinculados ao projeto através da tabela `project_participants`. Valide que o token JWT não expirou verificando o cookie de sessão.

**Erro: "Project not found"**

Este erro ocorre quando um procedimento tenta acessar um projeto que não existe no banco de dados.

**Causas comuns**: ID de projeto inválido ou inexistente passado na requisição. Projeto foi deletado mas o frontend ainda mantém referência. Erro de tipo (string ao invés de number) no projectId.

**Solução**: Verifique que o projectId existe no banco de dados usando Drizzle Studio (`pnpm db:studio`). Confirme que o tipo do parâmetro é `number` e não `string`. Adicione validação no frontend para prevenir requisições com IDs inválidos.

### Erros de Geração via IA

**Erro: "LLM invoke failed: 412 Precondition Failed – usage exhausted"**

Este erro indica que a conta atingiu o limite de uso da API de LLM. É comum durante desenvolvimento intensivo ou execução de testes automatizados.

**Solução temporária**: Aguarde alguns minutos para o limite ser resetado. Marque testes que envolvem LLM como `skip` durante desenvolvimento.

**Solução permanente**: Implemente mocks para `invokeLLM` usando `vi.mock()` do Vitest. Configure rate limiting no frontend para prevenir chamadas excessivas. Adicione cache de respostas LLM para perguntas frequentes.

**Erro: Geração de briefing/plano de ação trava no loading**

Este problema ocorre quando a geração via LLM demora mais que o esperado ou falha silenciosamente.

**Diagnóstico**: Verifique logs do navegador em `.manus-logs/browserConsole.log` procurando por erros de timeout. Verifique logs do servidor em `.manus-logs/devserver.log` para erros de API LLM. Confirme que o procedimento `generate` está sendo chamado verificando network requests.

**Solução**: Aumente o timeout do procedimento se a geração é legítima mas lenta. Adicione retry logic com backoff exponencial para falhas temporárias. Implemente feedback visual de progresso (ex: "Analisando respostas...", "Gerando recomendações...").

**Erro: Perguntas da Fase 2 não são geradas**

Este problema ocorre quando o procedimento `assessmentPhase2.generateQuestions` não é chamado ou falha.

**Causas comuns**: Fase 1 não foi completada antes de tentar gerar perguntas. Validação de acesso ao projeto falhando. Erro na serialização de dados da Fase 1.

**Solução**: Confirme que `assessmentPhase1` foi salvo com sucesso verificando o banco de dados. Verifique que o usuário tem permissão para acessar o projeto. Valide que os dados da Fase 1 estão no formato esperado (JSON válido).

### Erros de Salvamento de Dados

**Erro: "Erro ao salvar" (Assessment Fase 2)**

Este erro ocorria quando o frontend tentava salvar respostas da Fase 2 mas o procedimento `assessmentPhase2.save` não existia.

**Status**: Corrigido na versão 8766acff. O procedimento `save` foi adicionado como alias para `saveAnswers`.

**Prevenção**: Sempre verifique que procedimentos chamados pelo frontend existem no backend. Adicione testes de integração que validam contratos entre cliente e servidor.

**Erro: Progresso do assessment é perdido ao navegar entre páginas**

Este problema ocorre quando o salvamento automático não está funcionando ou as respostas não são persistidas corretamente.

**Diagnóstico**: Verifique console do navegador procurando por erros de salvamento. Confirme que o `useEffect` de salvamento automático está sendo acionado (adicione `console.log` temporário). Verifique que as respostas estão sendo salvas no banco de dados.

**Solução**: Confirme que o procedimento `save` existe e está funcionando corretamente. Aumente a frequência de salvamento automático se necessário (padrão: 30 segundos). Adicione indicação visual de "salvando..." para feedback ao usuário.

**Erro: "Invalid JSON" ao salvar respostas**

Este erro ocorre quando o frontend envia dados em formato incorreto para procedimentos que esperam JSON stringificado.

**Causa raiz**: Alguns procedimentos esperam `answers` como string JSON, mas o frontend pode estar enviando objeto JavaScript.

**Solução**: Use `JSON.stringify(answers)` antes de enviar para procedimentos que esperam string. Valide o schema Zod do procedimento para confirmar o tipo esperado. Considere padronizar para sempre aceitar objetos e fazer stringify no backend.

### Erros de Testes

**Erro: Testes excedem timeout de 5 segundos**

Este problema ocorre em testes que envolvem geração via LLM ou operações demoradas no banco de dados.

**Solução**: Configure timeout global no `vitest.config.ts` com `testTimeout: 60000` (60 segundos). Marque testes lentos como `skip` durante desenvolvimento rápido. Implemente mocks para LLM para acelerar testes.

**Erro: "No procedure found on path"**

Este erro indica que o teste está tentando chamar um procedimento tRPC que não existe.

**Causas comuns**: Nome do procedimento incorreto no teste. Procedimento foi renomeado mas teste não foi atualizado. Procedimento existe mas não foi exportado no router.

**Solução**: Verifique que o nome do procedimento no teste corresponde exatamente ao definido em `routers.ts`. Confirme que o procedimento está dentro do router correto. Use autocomplete do TypeScript para evitar erros de digitação.

**Erro: Testes falhando com "data is undefined"**

Este erro ocorre quando um teste espera que uma query retorne dados mas recebe `undefined`.

**Causas comuns**: Dados de teste não foram criados antes da query. Validação de acesso negando a query. Campo esperado não existe no schema do banco de dados.

**Solução**: Adicione setup adequado no `beforeEach` para criar dados de teste. Verifique que o caller do teste tem permissões adequadas. Confirme que o campo existe no schema Drizzle e foi migrado para o banco.

### Erros de Banco de Dados

**Erro: "Column not found"**

Este erro ocorre quando o código tenta acessar uma coluna que não existe no banco de dados.

**Causa raiz**: Schema Drizzle foi modificado mas migração não foi aplicada ao banco de dados.

**Solução**: Execute `pnpm db:push` para aplicar mudanças de schema ao banco. Verifique que a coluna foi criada usando Drizzle Studio (`pnpm db:studio`). Se o problema persistir, delete o banco de dados de desenvolvimento e recrie com `pnpm db:push`.

**Erro: "Foreign key constraint fails"**

Este erro ocorre ao tentar inserir ou deletar registros que violam constraints de chave estrangeira.

**Causas comuns**: Tentando criar registro que referencia ID inexistente. Tentando deletar registro que é referenciado por outros registros. Ordem incorreta de inserção (filho antes do pai).

**Solução**: Verifique que IDs referenciados existem antes de inserir. Implemente cascade delete no schema Drizzle se apropriado. Insira registros pai antes dos filhos.

**Erro: Conexão com banco de dados falha**

Este problema ocorre quando o servidor não consegue conectar ao banco de dados.

**Diagnóstico**: Verifique que `DATABASE_URL` está configurado corretamente no `.env`. Confirme que o banco de dados está rodando e acessível. Teste conexão manualmente usando cliente MySQL.

**Solução**: Valide formato da connection string (deve incluir host, porta, usuário, senha, database). Verifique firewall e regras de segurança se usando banco remoto. Confirme que credenciais estão corretas.

### Erros de Frontend

**Erro: "Cannot read property 'X' of undefined"**

Este erro comum ocorre quando o código tenta acessar propriedade de objeto que é `undefined`.

**Causas comuns**: Query tRPC ainda está carregando (`data` é `undefined`). Backend retornou `null` mas frontend não trata esse caso. Destructuring de objeto opcional sem validação.

**Solução**: Sempre verifique `isLoading` antes de acessar `data` de queries. Use optional chaining (`data?.field`) para acessar propriedades opcionais. Adicione estados de loading e empty no componente.

```typescript
// ❌ Errado
const { data } = trpc.projects.getById.useQuery({ id });
return <div>{data.name}</div>;

// ✅ Correto
const { data, isLoading } = trpc.projects.getById.useQuery({ id });
if (isLoading) return <Spinner />;
if (!data) return <div>Projeto não encontrado</div>;
return <div>{data.name}</div>;
```

**Erro: Infinite loop de re-renders**

Este problema ocorre quando um componente React entra em loop infinito de renderização.

**Causas comuns**: Criar novo objeto/array em render que é usado como dependência de `useEffect`. Atualizar estado dentro de render sem condição. Query tRPC com input instável (novo objeto a cada render).

**Solução**: Use `useState` ou `useMemo` para estabilizar referências de objetos/arrays. Mova atualizações de estado para `useEffect` ou event handlers. Estabilize inputs de queries tRPC com `useMemo`.

```typescript
// ❌ Errado (infinite loop)
const { data } = trpc.items.getByDate.useQuery({
  date: new Date(), // Novo objeto a cada render!
});

// ✅ Correto
const [date] = useState(() => new Date());
const { data } = trpc.items.getByDate.useQuery({ date });
```

**Erro: Toast de erro aparece múltiplas vezes**

Este problema ocorre quando o mesmo erro é capturado e exibido múltiplas vezes.

**Causas comuns**: Query tRPC com retry automático mostrando toast a cada tentativa. Múltiplos componentes ouvindo o mesmo erro. Error boundary e handler local ambos mostrando toast.

**Solução**: Configure `retry: false` em queries que não devem retentar automaticamente. Centralize tratamento de erros em um único local (error boundary ou mutation handler). Use debounce para prevenir toasts duplicados.

### Dicas Gerais de Debug

**Logs estruturados**: O sistema mantém logs estruturados em `.manus-logs/` que facilitam debugging. Use `tail -f .manus-logs/devserver.log` para acompanhar logs do servidor em tempo real. Verifique `browserConsole.log` para erros do frontend. Analise `networkRequests.log` para debugar chamadas tRPC.

**Drizzle Studio**: Use `pnpm db:studio` para visualizar e editar dados do banco durante desenvolvimento. É especialmente útil para verificar se dados foram salvos corretamente ou para criar dados de teste manualmente.

**TypeScript errors**: Sempre resolva erros de TypeScript antes de executar testes. Erros de tipo frequentemente indicam problemas reais de lógica que falhariam em runtime.

**Testes incrementais**: Ao adicionar novos procedimentos, escreva testes imediatamente. Testes incrementais são mais fáceis de debugar que suites grandes.

**Hot reload**: O servidor de desenvolvimento suporta hot reload tanto para cliente quanto servidor. Se mudanças não aparecem, tente reiniciar o servidor com `pnpm dev`.

---

## 🚀 Deploy

O sistema está configurado para deploy na plataforma Manus que oferece hosting integrado, domínios customizados e SSL automático. Consulte o guia completo em [`docs/DEPLOY-GUIDE.md`](docs/DEPLOY-GUIDE.md).

### Preparação para Deploy

Antes de publicar, confirme: (1) TypeScript sem erros (`npx tsc --noEmit`), (2) todos os testes passando (`pnpm test`), (3) CHANGELOG.md atualizado com a versão semântica, (4) variáveis de ambiente configuradas no painel Secrets (`OPENAI_API_KEY`, `TRACE_LEVEL`).

### Deploy via Manus

Acesse o painel de gerenciamento do projeto na interface Manus. Clique no botão **Publish** no header superior direito. O sistema automaticamente faz build, deploy e configura SSL. Após deploy bem-sucedido (~60s), verifique a versão publicada:

```bash
curl https://iasolaris.manus.space/api/version | jq '{version, gitHash, env}'
curl https://iasolaris.manus.space/api/health/cnae | jq '{status}'
curl https://iasolaris.manus.space/api/health/cnae/validate | jq '.summary'
```

### Controle de Versão

O campo `gitHash` em `/api/version` corresponde aos primeiros 7 caracteres do ID do checkpoint Manus. Compare com o checkpoint publicado para confirmar que o deploy está atualizado. O servidor envia uma notificação automática ao owner a cada restart em produção confirmando versão e ambiente.

### Configuração de Domínio

A plataforma Manus oferece três opções de domínio. Domínio automático (xxx.manus.space) é gerado automaticamente e pode ter o prefixo customizado. Domínios Manus podem ser comprados diretamente na plataforma através do painel Settings → Domains. Domínios customizados externos podem ser vinculados configurando registros DNS conforme instruções no painel.

### Monitoramento e Observabilidade

Consulte o guia completo em [`docs/OBSERVABILITY.md`](docs/OBSERVABILITY.md). Resumo dos endpoints de diagnóstico:

| Endpoint | Descrição | HTTP |
|---|---|---|
| `GET /api/health/cnae` | Status do pipeline (chave, cache, embeddings, LLM) | 200/503 |
| `GET /api/health/cnae/validate` | Validação on-demand com 4 casos canônicos (~3s) | 200/503 |
| `GET /api/version` | Versão semântica, git hash, ambiente | 200 |

O tracer estruturado (`server/tracer.ts`) registra cada chamada `extractCnaes` e `refineCnaes` com `requestId` único e latência por etapa. Configure `TRACE_LEVEL=info` em produção para visibilidade sem verbosidade excessiva.

---

## 📄 Licença

Este projeto é proprietário e confidencial. Todos os direitos reservados.

---

**Documentação gerada por Manus AI** • Última atualização: 21/03/2026 (v5.6.0)
