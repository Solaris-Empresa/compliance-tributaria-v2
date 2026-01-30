# Plataforma de Compliance - Reforma Tributária

Sistema completo de gestão de compliance tributário desenvolvido para auxiliar empresas na adequação à reforma tributária brasileira. A plataforma oferece assessment automatizado, geração de planos de ação via IA, matriz de riscos e acompanhamento de execução.

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Controle de Acesso](#controle-de-acesso)
- [Desenvolvimento](#desenvolvimento)
- [Testes](#testes)
- [Deploy](#deploy)

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

## 🚀 Deploy

O sistema está configurado para deploy na plataforma Manus que oferece hosting integrado, domínios customizados e SSL automático.

### Preparação para Deploy

Crie um checkpoint através do comando `pnpm checkpoint` ou via interface Manus. Verifique que todos os testes estão passando com `pnpm test`. Confirme que variáveis de ambiente estão configuradas corretamente. Teste a build de produção localmente com `pnpm build`.

### Deploy via Manus

Acesse o painel de gerenciamento do projeto na interface Manus. Clique no botão "Publish" no header superior direito. O sistema automaticamente faz build, deploy e configura SSL. Após deploy bem-sucedido, o sistema estará disponível no domínio configurado.

### Configuração de Domínio

A plataforma Manus oferece três opções de domínio. Domínio automático (xxx.manus.space) é gerado automaticamente e pode ter o prefixo customizado. Domínios Manus podem ser comprados diretamente na plataforma através do painel Settings → Domains. Domínios customizados externos podem ser vinculados configurando registros DNS conforme instruções no painel.

### Monitoramento

O painel Dashboard oferece métricas de uso incluindo UV (unique visitors) e PV (page views). Logs de servidor são acessíveis através do diretório `.manus-logs/` que contém `devserver.log`, `browserConsole.log`, `networkRequests.log` e `sessionReplay.log`. Alertas de erro podem ser configurados através do sistema de notificações integrado.

---

## 📄 Licença

Este projeto é proprietário e confidencial. Todos os direitos reservados.

---

**Documentação gerada por Manus AI** • Última atualização: 30/01/2026
