# Backlog - Plataforma de Compliance Tributária

**Documento de Planejamento Técnico**  
**Autor:** Manus AI  
**Data:** 29 de Janeiro de 2026  
**Versão:** 1.0

---

## Sumário Executivo

Este documento detalha as melhorias arquiteturais necessárias para implementar um sistema robusto de normalização de banco de dados (relacionamento 1:N entre clientes e projetos) e um sistema granular de permissões baseado em papéis (RBAC - Role-Based Access Control). O objetivo é permitir que diferentes perfis de usuários (gestores de clientes, gestores empresariais, equipe Solaris) tenham acesso controlado e segmentado aos projetos de compliance tributária, garantindo segurança, escalabilidade e conformidade com as regras de negócio.

As mudanças propostas envolvem refatoração do schema do banco de dados, criação de novas tabelas de relacionamento, implementação de middlewares de autorização no backend e ajustes na interface do usuário para refletir as permissões de cada perfil.

---

## 1. Contexto e Motivação

### 1.1 Situação Atual

O sistema atual possui as seguintes limitações arquiteturais que impedem a escalabilidade e a gestão adequada de permissões:

**Problema 1: Falta de Normalização 1:N**  
Atualmente, a tabela `projects` não possui um relacionamento formal com uma tabela `clients`. Cada projeto armazena informações do cliente de forma redundante (campos como `clientName`, `clientId`), o que viola os princípios de normalização de banco de dados e dificulta a gestão centralizada de clientes.

**Problema 2: Sistema de Permissões Inexistente**  
O sistema atual não possui um mecanismo de controle de acesso granular. Todos os usuários autenticados têm acesso irrestrito a todos os projetos, independentemente de seu papel ou vínculo organizacional. Isso representa um risco de segurança e viola princípios de segregação de dados.

**Problema 3: Ausência de Hierarquia Organizacional**  
Não existe uma estrutura que permita representar a hierarquia entre IA Solaris (empresa prestadora de serviços), clientes corporativos e seus respectivos gestores internos.

### 1.2 Objetivos da Refatoração

A refatoração proposta visa alcançar os seguintes objetivos:

1. **Normalização do Banco de Dados:** Estabelecer relacionamento 1:N entre `clients` e `projects`, eliminando redundância e facilitando manutenção.

2. **Controle de Acesso Granular:** Implementar sistema RBAC que permita definir quem pode visualizar, editar ou excluir cada projeto.

3. **Suporte a Múltiplos Perfis:** Permitir que gestores de clientes vejam apenas projetos de sua empresa, enquanto a equipe Solaris tem visão global.

4. **Auditoria e Rastreabilidade:** Registrar quem acessa e modifica cada projeto para fins de auditoria e conformidade.

5. **Escalabilidade:** Preparar a arquitetura para suportar centenas de clientes e milhares de projetos sem degradação de performance.

---

## 2. Normalização do Banco de Dados (1:N)

### 2.1 Modelo Atual vs. Modelo Proposto

#### Modelo Atual (Problemático)

```
┌─────────────────┐
│    projects     │
├─────────────────┤
│ id              │
│ name            │
│ clientName      │ ← Redundante
│ clientId        │ ← Sem FK
│ ...             │
└─────────────────┘
```

**Problemas:**
- `clientName` e `clientId` são armazenados redundantemente em cada projeto
- Não há integridade referencial (Foreign Key)
- Alterações nos dados do cliente exigem atualização em múltiplos projetos
- Impossível consultar "todos os projetos de um cliente" de forma eficiente

#### Modelo Proposto (Normalizado)

```
┌─────────────────┐         ┌─────────────────┐
│     clients     │ 1     N │    projects     │
├─────────────────┤─────────├─────────────────┤
│ id (PK)         │         │ id (PK)         │
│ companyName     │         │ name            │
│ cnpj            │         │ clientId (FK)   │ ← FK para clients
│ contactEmail    │         │ status          │
│ contactPhone    │         │ ...             │
│ address         │         └─────────────────┘
│ createdAt       │
│ updatedAt       │
└─────────────────┘
```

**Vantagens:**
- **Integridade Referencial:** Foreign Key garante que todo projeto pertence a um cliente válido
- **Eliminação de Redundância:** Dados do cliente armazenados uma única vez
- **Facilidade de Manutenção:** Atualizar dados do cliente reflete automaticamente em todos os projetos
- **Consultas Eficientes:** Índice em `clientId` permite buscar projetos por cliente rapidamente

### 2.2 Schema Detalhado da Tabela `clients`

```sql
CREATE TABLE clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  companyName VARCHAR(255) NOT NULL,
  tradeName VARCHAR(255),
  cnpj CHAR(18) UNIQUE NOT NULL,
  stateRegistration VARCHAR(50),
  municipalRegistration VARCHAR(50),
  
  -- Informações de Contato
  contactEmail VARCHAR(320) NOT NULL,
  contactPhone VARCHAR(20),
  contactPerson VARCHAR(255),
  
  -- Endereço
  addressStreet VARCHAR(255),
  addressNumber VARCHAR(20),
  addressComplement VARCHAR(100),
  addressNeighborhood VARCHAR(100),
  addressCity VARCHAR(100),
  addressState CHAR(2),
  addressZipCode CHAR(9),
  
  -- Informações Fiscais
  taxRegime ENUM('simples_nacional', 'lucro_presumido', 'lucro_real'),
  companySize ENUM('mei', 'micro', 'pequena', 'media', 'grande'),
  businessSector VARCHAR(255),
  
  -- Metadata
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  createdBy INT NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  
  -- Índices
  INDEX idx_cnpj (cnpj),
  INDEX idx_company_name (companyName),
  INDEX idx_is_active (isActive)
);
```

### 2.3 Refatoração da Tabela `projects`

```sql
ALTER TABLE projects
  ADD COLUMN clientId INT NOT NULL AFTER id,
  ADD CONSTRAINT fk_projects_client 
    FOREIGN KEY (clientId) REFERENCES clients(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  ADD INDEX idx_client_id (clientId);

-- Remover campos redundantes
ALTER TABLE projects
  DROP COLUMN clientName;
```

**Observações:**
- `ON DELETE RESTRICT`: Impede exclusão de cliente que possui projetos
- `ON UPDATE CASCADE`: Atualiza automaticamente `clientId` se o ID do cliente mudar
- Índice em `clientId` otimiza consultas do tipo "projetos do cliente X"

### 2.4 Migração de Dados Existentes

Para migrar os dados existentes sem perda de informação, será necessário:

1. **Criar tabela `clients` temporária** com dados únicos extraídos de `projects`
2. **Inserir clientes únicos** baseado em `clientId` ou `clientName`
3. **Atualizar `projects.clientId`** para referenciar os IDs da nova tabela `clients`
4. **Remover campos redundantes** após validação

```sql
-- Passo 1: Extrair clientes únicos
INSERT INTO clients (id, companyName, cnpj, contactEmail, createdBy)
SELECT DISTINCT 
  clientId,
  clientName,
  'PENDENTE',  -- CNPJ precisa ser preenchido manualmente
  'contato@cliente.com',  -- Email precisa ser preenchido
  1  -- createdBy = sistema
FROM projects
WHERE clientId IS NOT NULL;

-- Passo 2: Validar integridade
SELECT p.id, p.name, p.clientId, c.companyName
FROM projects p
LEFT JOIN clients c ON p.clientId = c.id
WHERE c.id IS NULL;  -- Deve retornar vazio

-- Passo 3: Adicionar FK após validação
ALTER TABLE projects
  ADD CONSTRAINT fk_projects_client 
    FOREIGN KEY (clientId) REFERENCES clients(id);
```

---

## 3. Sistema de Permissões (RBAC)

### 3.1 Perfis de Usuário

O sistema deve suportar os seguintes perfis (roles) com permissões distintas:

| Perfil | Descrição | Permissões |
|--------|-----------|------------|
| **admin_solaris** | Administrador da IA Solaris | Acesso total a todos os clientes e projetos. Pode gerenciar usuários e permissões. |
| **gestor_solaris** | Gestor de Contas da IA Solaris | Pode visualizar e gerenciar projetos dos clientes sob sua responsabilidade. |
| **equipe_solaris** | Membro da Equipe Solaris | Pode visualizar e editar projetos aos quais foi atribuído como participante. |
| **gestor_cliente** | Gestor do Cliente Corporativo | Pode visualizar e gerenciar projetos da sua empresa. Não vê projetos de outros clientes. |
| **usuario_cliente** | Usuário do Cliente Corporativo | Pode visualizar projetos da sua empresa aos quais tem acesso explícito. |
| **auditor** | Auditor Externo | Acesso somente leitura a projetos específicos para fins de auditoria. |

### 3.2 Matriz de Permissões

| Ação | admin_solaris | gestor_solaris | equipe_solaris | gestor_cliente | usuario_cliente | auditor |
|------|---------------|----------------|----------------|----------------|-----------------|---------|
| **Clientes** |
| Criar cliente | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Visualizar todos os clientes | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Visualizar seu cliente | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editar cliente | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Excluir cliente | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Projetos** |
| Criar projeto | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Visualizar todos os projetos | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ |
| Visualizar projetos do seu cliente | ✅ | ✅ | ✅** | ✅ | ✅** | ✅** |
| Editar projeto | ✅ | ✅ | ✅** | ✅** | ❌ | ❌ |
| Excluir projeto | ✅ | ✅ | ❌ | ✅** | ❌ | ❌ |
| **Usuários** |
| Criar usuário | ✅ | ✅ | ❌ | ✅*** | ❌ | ❌ |
| Visualizar usuários | ✅ | ✅ | ❌ | ✅*** | ❌ | ❌ |
| Editar permissões | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

**Legendas:**
- ✅ Permitido
- ❌ Negado
- \* Apenas clientes sob sua gestão
- \*\* Apenas projetos aos quais foi atribuído
- \*\*\* Apenas usuários da sua empresa

### 3.3 Tabelas de Controle de Acesso

#### 3.3.1 Tabela `user_client_assignments`

Relaciona usuários aos clientes que eles podem gerenciar (para gestores Solaris e gestores de clientes).

```sql
CREATE TABLE user_client_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  clientId INT NOT NULL,
  role ENUM('gestor_solaris', 'gestor_cliente', 'usuario_cliente') NOT NULL,
  assignedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assignedBy INT NOT NULL,
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (assignedBy) REFERENCES users(id),
  
  UNIQUE KEY unique_user_client (userId, clientId),
  INDEX idx_user_id (userId),
  INDEX idx_client_id (clientId)
);
```

**Exemplo de Uso:**
- Gestor Solaris "João" é atribuído aos clientes "Empresa A" e "Empresa B"
- Gestor Cliente "Maria" (da Empresa A) pode ver apenas projetos da Empresa A

#### 3.3.2 Tabela `project_permissions`

Controla permissões granulares em nível de projeto (para casos onde um usuário precisa acesso a projetos específicos fora do seu escopo padrão).

```sql
CREATE TABLE project_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projectId INT NOT NULL,
  userId INT NOT NULL,
  permissionLevel ENUM('read', 'write', 'admin') NOT NULL DEFAULT 'read',
  grantedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  grantedBy INT NOT NULL,
  expiresAt TIMESTAMP NULL,
  
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (grantedBy) REFERENCES users(id),
  
  UNIQUE KEY unique_project_user (projectId, userId),
  INDEX idx_project_id (projectId),
  INDEX idx_user_id (userId),
  INDEX idx_expires_at (expiresAt)
);
```

**Níveis de Permissão:**
- `read`: Pode visualizar o projeto e seus dados
- `write`: Pode editar o projeto (avaliações, plano de ação, tarefas)
- `admin`: Pode gerenciar permissões e excluir o projeto

#### 3.3.3 Refatoração da Tabela `users`

Adicionar campo `clientId` para vincular usuários de clientes corporativos:

```sql
ALTER TABLE users
  ADD COLUMN clientId INT NULL AFTER role,
  ADD CONSTRAINT fk_users_client 
    FOREIGN KEY (clientId) REFERENCES clients(id)
    ON DELETE SET NULL,
  ADD INDEX idx_client_id (clientId);

-- Atualizar enum de roles
ALTER TABLE users
  MODIFY COLUMN role ENUM(
    'admin_solaris',
    'gestor_solaris',
    'equipe_solaris',
    'gestor_cliente',
    'usuario_cliente',
    'auditor',
    'advogado_senior',
    'advogado_junior'
  ) NOT NULL;
```

**Regras de Negócio:**
- Usuários com role `gestor_cliente` ou `usuario_cliente` **DEVEM** ter `clientId` preenchido
- Usuários Solaris (`admin_solaris`, `gestor_solaris`, `equipe_solaris`) têm `clientId = NULL`
- Auditores podem ter `clientId = NULL` (auditores externos) ou preenchido (auditores internos)

### 3.4 Lógica de Autorização no Backend

#### 3.4.1 Middleware de Autorização

Criar middleware `checkProjectAccess` para validar se o usuário tem permissão para acessar um projeto:

```typescript
// server/_core/authorization.ts

export async function checkProjectAccess(
  userId: number,
  projectId: number,
  requiredPermission: 'read' | 'write' | 'admin'
): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user) return false;

  // Admin Solaris tem acesso total
  if (user.role === 'admin_solaris') return true;

  // Buscar projeto e cliente
  const project = await getProjectById(projectId);
  if (!project) return false;

  // Gestor Solaris: verificar se gerencia o cliente do projeto
  if (user.role === 'gestor_solaris') {
    const assignment = await db
      .select()
      .from(userClientAssignments)
      .where(and(
        eq(userClientAssignments.userId, userId),
        eq(userClientAssignments.clientId, project.clientId)
      ))
      .limit(1);
    
    return assignment.length > 0;
  }

  // Usuários de cliente: verificar se pertencem ao mesmo cliente
  if (user.role === 'gestor_cliente' || user.role === 'usuario_cliente') {
    if (user.clientId !== project.clientId) return false;
    
    // Gestor do cliente tem acesso total aos projetos da empresa
    if (user.role === 'gestor_cliente') return true;
    
    // Usuário do cliente: verificar permissão explícita
    const permission = await db
      .select()
      .from(projectPermissions)
      .where(and(
        eq(projectPermissions.projectId, projectId),
        eq(projectPermissions.userId, userId)
      ))
      .limit(1);
    
    if (permission.length === 0) return false;
    
    // Verificar nível de permissão
    const permLevel = permission[0].permissionLevel;
    if (requiredPermission === 'read') return true;
    if (requiredPermission === 'write') return permLevel === 'write' || permLevel === 'admin';
    if (requiredPermission === 'admin') return permLevel === 'admin';
  }

  // Equipe Solaris: verificar se é participante do projeto
  if (user.role === 'equipe_solaris') {
    const participant = await db
      .select()
      .from(projectParticipants)
      .where(and(
        eq(projectParticipants.projectId, projectId),
        eq(projectParticipants.userId, userId)
      ))
      .limit(1);
    
    return participant.length > 0;
  }

  // Auditor: verificar permissão explícita
  if (user.role === 'auditor') {
    const permission = await db
      .select()
      .from(projectPermissions)
      .where(and(
        eq(projectPermissions.projectId, projectId),
        eq(projectPermissions.userId, userId)
      ))
      .limit(1);
    
    return permission.length > 0 && permission[0].permissionLevel === 'read';
  }

  return false;
}
```

#### 3.4.2 Procedure Protegido com Autorização

```typescript
// server/routers.ts

export const projectRouter = {
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      // Verificar permissão
      const hasAccess = await checkProjectAccess(
        ctx.user.id,
        input.id,
        'read'
      );
      
      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Você não tem permissão para acessar este projeto'
        });
      }
      
      return await getProjectById(input.id);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({ /* ... */ })
    }))
    .mutation(async ({ input, ctx }) => {
      // Verificar permissão de escrita
      const hasAccess = await checkProjectAccess(
        ctx.user.id,
        input.id,
        'write'
      );
      
      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Você não tem permissão para editar este projeto'
        });
      }
      
      return await updateProject(input.id, input.data);
    }),
};
```

### 3.5 Filtros de Listagem por Permissão

Ao listar projetos, aplicar filtros baseados no perfil do usuário:

```typescript
export async function listProjectsForUser(userId: number) {
  const user = await getUserById(userId);
  if (!user) return [];

  // Admin Solaris: retorna todos
  if (user.role === 'admin_solaris') {
    return await db.select().from(projects);
  }

  // Gestor Solaris: retorna projetos dos clientes que gerencia
  if (user.role === 'gestor_solaris') {
    const clientIds = await db
      .select({ clientId: userClientAssignments.clientId })
      .from(userClientAssignments)
      .where(eq(userClientAssignments.userId, userId));
    
    return await db
      .select()
      .from(projects)
      .where(inArray(projects.clientId, clientIds.map(c => c.clientId)));
  }

  // Gestor/Usuário de Cliente: retorna projetos do seu cliente
  if (user.role === 'gestor_cliente' || user.role === 'usuario_cliente') {
    if (!user.clientId) return [];
    
    let query = db
      .select()
      .from(projects)
      .where(eq(projects.clientId, user.clientId));
    
    // Usuário de cliente: filtrar apenas projetos com permissão explícita
    if (user.role === 'usuario_cliente') {
      const projectIds = await db
        .select({ projectId: projectPermissions.projectId })
        .from(projectPermissions)
        .where(eq(projectPermissions.userId, userId));
      
      query = query.where(
        inArray(projects.id, projectIds.map(p => p.projectId))
      );
    }
    
    return await query;
  }

  // Equipe Solaris: retorna projetos onde é participante
  if (user.role === 'equipe_solaris') {
    const projectIds = await db
      .select({ projectId: projectParticipants.projectId })
      .from(projectParticipants)
      .where(eq(projectParticipants.userId, userId));
    
    return await db
      .select()
      .from(projects)
      .where(inArray(projects.id, projectIds.map(p => p.projectId)));
  }

  return [];
}
```

---

## 4. Interface do Usuário (Frontend)

### 4.1 Ajustes na Navegação

**Página de Projetos:**
- Exibir apenas projetos aos quais o usuário tem acesso
- Adicionar badge visual indicando o cliente (para usuários Solaris)
- Filtros por cliente (apenas para admin/gestor Solaris)

**Página de Clientes:**
- Visível apenas para admin_solaris e gestor_solaris
- Ocultar para usuários de clientes

**Página de Detalhes do Projeto:**
- Exibir informações do cliente (nome, CNPJ, contato)
- Botão "Gerenciar Permissões" visível apenas para admin/gestor
- Indicador visual do nível de permissão do usuário atual

### 4.2 Componente de Seletor de Cliente

Criar componente `<ClientSelector>` para uso em formulários de criação de projeto:

```tsx
// client/src/components/ClientSelector.tsx

export function ClientSelector({ value, onChange }: Props) {
  const { data: clients } = trpc.clients.list.useQuery();
  const { user } = useAuth();

  // Filtrar clientes baseado no perfil
  const availableClients = useMemo(() => {
    if (user?.role === 'admin_solaris' || user?.role === 'gestor_solaris') {
      return clients || [];
    }
    if (user?.clientId) {
      return clients?.filter(c => c.id === user.clientId) || [];
    }
    return [];
  }, [clients, user]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione o cliente" />
      </SelectTrigger>
      <SelectContent>
        {availableClients.map(client => (
          <SelectItem key={client.id} value={client.id.toString()}>
            {client.companyName} - {client.cnpj}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### 4.3 Indicadores Visuais de Permissão

Adicionar badges nas listagens de projetos:

```tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>{project.name}</CardTitle>
      <div className="flex gap-2">
        {/* Badge do Cliente (apenas para Solaris) */}
        {isSolarisUser && (
          <Badge variant="outline">
            {project.client.companyName}
          </Badge>
        )}
        
        {/* Badge de Permissão */}
        <Badge variant={getPermissionBadgeVariant(userPermission)}>
          {userPermission === 'admin' && '👑 Admin'}
          {userPermission === 'write' && '✏️ Edição'}
          {userPermission === 'read' && '👁️ Leitura'}
        </Badge>
      </div>
    </div>
  </CardHeader>
</Card>
```

---

## 5. Casos de Uso Detalhados

### 5.1 Caso de Uso: Gestor Solaris Gerencia Múltiplos Clientes

**Ator:** João Silva (gestor_solaris)  
**Contexto:** João gerencia 5 clientes corporativos na IA Solaris

**Fluxo:**
1. João faz login no sistema
2. Sistema identifica role `gestor_solaris`
3. Sistema consulta `user_client_assignments` e identifica que João gerencia os clientes A, B, C, D e E
4. Na página "Projetos", João vê apenas projetos dos clientes A, B, C, D e E
5. João pode filtrar projetos por cliente usando dropdown
6. João pode criar novos projetos para qualquer um dos 5 clientes
7. João pode editar e gerenciar permissões dos projetos sob sua responsabilidade
8. João **não** pode ver projetos de outros clientes gerenciados por outros gestores Solaris

### 5.2 Caso de Uso: Gestor de Cliente Vê Apenas Projetos da Sua Empresa

**Ator:** Maria Santos (gestor_cliente, clientId=10)  
**Contexto:** Maria é gestora de compliance na Empresa XYZ (cliente da IA Solaris)

**Fluxo:**
1. Maria faz login no sistema
2. Sistema identifica role `gestor_cliente` e `clientId=10`
3. Sistema filtra automaticamente apenas projetos onde `projects.clientId = 10`
4. Maria vê todos os projetos da Empresa XYZ
5. Maria pode criar novos projetos para a Empresa XYZ
6. Maria pode editar projetos da sua empresa
7. Maria pode convidar outros usuários da Empresa XYZ para participar dos projetos
8. Maria **não** pode ver projetos de outras empresas
9. Maria **não** pode ver a lista de clientes (menu "Clientes" está oculto)

### 5.3 Caso de Uso: Usuário de Cliente com Acesso Restrito

**Ator:** Pedro Costa (usuario_cliente, clientId=10)  
**Contexto:** Pedro é analista na Empresa XYZ e precisa acessar apenas 2 projetos específicos

**Fluxo:**
1. Gestor Maria concede permissão de leitura para Pedro nos projetos P1 e P2
2. Sistema insere registros em `project_permissions`:
   - `(projectId=P1, userId=Pedro, permissionLevel=read)`
   - `(projectId=P2, userId=Pedro, permissionLevel=read)`
3. Pedro faz login no sistema
4. Sistema identifica role `usuario_cliente` e `clientId=10`
5. Sistema consulta `project_permissions` e identifica que Pedro tem acesso apenas a P1 e P2
6. Pedro vê apenas os projetos P1 e P2 na listagem
7. Pedro pode visualizar detalhes, mas **não** pode editar
8. Pedro **não** vê outros projetos da Empresa XYZ

### 5.4 Caso de Uso: Auditor Externo com Acesso Temporário

**Ator:** Dr. Carlos Mendes (auditor, clientId=NULL)  
**Contexto:** Auditor externo contratado para revisar projeto P5 da Empresa ABC

**Fluxo:**
1. Admin Solaris concede permissão de leitura temporária para Dr. Carlos no projeto P5
2. Sistema insere registro em `project_permissions`:
   - `(projectId=P5, userId=Carlos, permissionLevel=read, expiresAt='2026-03-31')`
3. Dr. Carlos faz login no sistema
4. Sistema identifica role `auditor`
5. Sistema consulta `project_permissions` e identifica acesso ao projeto P5
6. Dr. Carlos vê apenas o projeto P5
7. Dr. Carlos pode visualizar todos os documentos, avaliações e plano de ação
8. Dr. Carlos **não** pode editar nenhum dado
9. Após 31/03/2026, o acesso expira automaticamente

---

## 6. Considerações de Implementação

### 6.1 Ordem de Implementação Recomendada

1. **Fase 1: Normalização do Banco de Dados**
   - Criar tabela `clients`
   - Migrar dados existentes
   - Adicionar FK em `projects`
   - Atualizar queries do backend

2. **Fase 2: Estrutura de Permissões**
   - Criar tabelas `user_client_assignments` e `project_permissions`
   - Atualizar enum de roles em `users`
   - Adicionar campo `clientId` em `users`

3. **Fase 3: Lógica de Autorização**
   - Implementar middleware `checkProjectAccess`
   - Refatorar procedures para validar permissões
   - Implementar filtros de listagem

4. **Fase 4: Interface do Usuário**
   - Criar componente `ClientSelector`
   - Ajustar navegação baseada em role
   - Adicionar indicadores visuais de permissão

5. **Fase 5: Testes e Validação**
   - Testes unitários de autorização
   - Testes de integração end-to-end
   - Testes de performance com múltiplos clientes

### 6.2 Impactos e Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Migração de dados falha | Alto | Backup completo antes da migração. Executar em ambiente de staging primeiro. |
| Performance degradada | Médio | Adicionar índices adequados. Implementar cache de permissões. |
| Usuários perdem acesso | Alto | Manter logs de auditoria. Implementar modo de "super admin" para recuperação. |
| Complexidade de manutenção | Médio | Documentar bem o código. Criar testes automatizados abrangentes. |

### 6.3 Métricas de Sucesso

- **Integridade de Dados:** 100% dos projetos vinculados a clientes válidos
- **Segurança:** 0 casos de acesso não autorizado em testes de penetração
- **Performance:** Tempo de resposta < 200ms para listagem de projetos (até 1000 registros)
- **Usabilidade:** Taxa de erro de usuários < 2% ao navegar entre projetos

---

## 7. Próximos Passos

### 7.1 Backlog Priorizado

**Alta Prioridade:**
1. Criar tabela `clients` e migrar dados existentes
2. Implementar middleware de autorização básico
3. Refatorar listagem de projetos para filtrar por cliente

**Média Prioridade:**
4. Criar interface de gestão de clientes
5. Implementar sistema de convites para usuários de clientes
6. Adicionar logs de auditoria de acesso

**Baixa Prioridade:**
7. Implementar permissões temporárias com expiração automática
8. Criar dashboard de permissões para admin
9. Implementar notificações de mudanças de permissão

### 7.2 Documentação Adicional Necessária

- Diagrama ER (Entity-Relationship) completo do banco de dados
- Fluxogramas de autorização para cada perfil de usuário
- Manual do usuário explicando os diferentes perfis e permissões
- Guia de troubleshooting para problemas de acesso

---

## 8. Conclusão

A implementação da normalização 1:N entre clientes e projetos, combinada com um sistema robusto de permissões baseado em papéis (RBAC), é fundamental para a escalabilidade e segurança da Plataforma de Compliance Tributária. As mudanças propostas neste documento garantem que:

- **Dados sejam organizados de forma eficiente**, eliminando redundância e facilitando manutenção
- **Acesso seja controlado de forma granular**, respeitando hierarquias organizacionais e princípios de segregação de dados
- **Sistema seja escalável**, suportando centenas de clientes e milhares de projetos sem degradação de performance
- **Auditoria seja possível**, registrando quem acessa e modifica cada projeto

A implementação deve ser feita de forma incremental, começando pela normalização do banco de dados e evoluindo para o sistema completo de permissões, sempre com testes rigorosos em cada etapa para garantir a integridade e segurança dos dados.

---

**Documento elaborado por:** Manus AI  
**Revisão:** Pendente  
**Aprovação:** Pendente
