# DB-SPEC — Excluir campo "Cliente Vinculado" do formulário Novo Projeto

**Data:** 2026-05-29 · **Vinculada:** `AS-IS-TO-BE-EXCLUIR-CLIENTE-PROJETO-20260529.md`
**Cenário recomendado:** A2 (UI removida + backend opcional + auto-deriva)

---

## 1. Schema atual (`drizzle/schema.ts`)

### 1.1 Tabela `projects` — coluna `clientId` (`:34`)

```ts
export const projects = mysqlTable("projects", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  clientId: int("clientId").notNull(),                     // ← alvo
  status: mysqlEnum("status", [...]).notNull().default("rascunho"),
  // ...
});
```

**Semântica atual:** FK lógica para `users.id` (a aplicação reusa tabela `users` como "clientes" via `role='cliente'`). Sem `references()` declarado — não há FK constraint SQL formal, apenas semântica de aplicação.

### 1.2 Tabela `clientMembers` (`:1256`) — **NÃO É TOCADA**

```ts
export const clientMembers = mysqlTable("client_members", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("clientId").notNull(),  // ← FK para users.id (dono)
  name: varchar("name", { length: 255 }).notNull(),
  // ...
});
```

Convivência mantida. Esta tabela continua usando `clientId` como FK ao dono da conta — independente da remoção UI no NovoProjeto.

---

## 2. Mudança no Cenário A2

### 2.1 Coluna `projects.clientId` — PRESERVADA

**Sem migration SQL.** Coluna permanece `int notNull`. O backend popula via `input.clientId ?? ctx.user.id` em `createProject`.

### 2.2 Mudança no Zod schema (não-DB)

`server/routers-fluxo-v3.ts:332` (input do `createProject`):

```ts
// ANTES
clientId: z.number({ message: "Cliente é obrigatório" }),

// DEPOIS (F1)
clientId: z.number().optional(),
```

### 2.3 Mudança no código de inserção

`server/routers-fluxo-v3.ts:442`:

```ts
// ANTES
clientId: input.clientId,

// DEPOIS (F1)
clientId: input.clientId ?? ctx.user.id,
```

---

## 3. Queries SQL de verificação (Manus pré-implementação)

### Q1 — Distribuição atual de clientId vs createdById

```sql
SELECT
  CASE
    WHEN clientId = createdById THEN 'iguais (próprio dono criou)'
    WHEN clientId <> createdById THEN 'diferentes (advogado criou para cliente)'
    ELSE 'NULL'
  END AS cenario,
  COUNT(*) AS total
FROM projects
GROUP BY cenario;
```

**Decisão da Manus depende deste resultado:**

- Se **>95% são "iguais"** → Cenário A2 puro é seguro (auto-derivação não muda nada na prática)
- Se **>10% são "diferentes"** → cenário A2 quebra fluxo "advogado cria projeto para cliente" → reabre discussão (talvez precisa manter UI para advogado/admin e remover só para cliente)

### Q2 — Confirmar coluna nunca está NULL

```sql
SELECT COUNT(*) AS nulls FROM projects WHERE clientId IS NULL;
```

**Esperado:** `0` (constraint `notNull`). Se ≠0 → bug latente, abrir issue separada.

### Q3 — Confirmar role do "cliente" típico

```sql
SELECT u.role, COUNT(DISTINCT p.id) AS projetos
FROM projects p
JOIN users u ON p.clientId = u.id
GROUP BY u.role;
```

**Confirma** o pressuposto de que `projects.clientId` sempre aponta para um user com role compatível.

---

## 4. Down migration

**Não há migration SQL** — não há rollback de schema necessário.

**Rollback de código:** `git revert <commit>` restaura schema Zod obrigatório + UI do cliente.

---

## 5. Impacto em índices

`projects.clientId` provavelmente tem índice (Manus confirmar via `SHOW INDEXES FROM projects`). Cenário A2 **não** remove a coluna → índice mantido funcional.

---

## 6. Conclusão DB-SPEC

| Item | Estado |
|---|---|
| Schema SQL alterado? | ❌ Não — preserva `clientId int notNull` |
| Migration UP necessária? | ❌ Não |
| Migration DOWN necessária? | ❌ Não |
| Snapshot pré-deploy | ✅ Recomendado (padrão Manus) |
| Índices impactados | ❌ Nenhum |
| Constraints (FK/check) | ❌ Nenhuma |
| Tabela `clientMembers` | ❌ Inalterada |

**Cenário A2 é DB-neutral** — toda a mudança é de aplicação (schema Zod + UI + código de insert). Sem risco de inconsistência de dados.

---

## 7. Se Q1 mostrar que Cenário C é necessário (DROP COLUMN)

Caso o resultado de Q1 indique que >10% dos projetos têm `clientId ≠ createdById`, o Cenário A2 quebra um fluxo legítimo. Nesse caso reabrir discussão com 2 caminhos:

**Caminho 1 — Híbrido (recomendado se Q1 quebrar A2):**
- Mantém UI cliente APENAS para `role in ('advogado_senior', 'advogado_junior', 'equipe_solaris')`
- Para `role='cliente'`, oculta UI + auto-deriva = ctx.user.id
- LOC adicional: ~20 (condicional por role no JSX)

**Caminho 2 — DROP COLUMN (Cenário C completo):**
- Migration DROP COLUMN projects.clientId + refactor 24 readers para usar `createdById`
- LOC: ~700+
- Dados históricos: `clientId ≠ createdById` vira perda de vinculação (precisa migration de backfill para outra tabela `project_clients`)

Recomendação: aguardar Q1 antes de decidir.
