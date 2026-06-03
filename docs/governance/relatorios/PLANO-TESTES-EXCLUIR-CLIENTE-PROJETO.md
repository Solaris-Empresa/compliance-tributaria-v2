# Plano de Testes — Excluir campo "Cliente Vinculado" do formulário Novo Projeto

**Data:** 2026-05-29 · **Vinculada:** `AS-IS-TO-BE-EXCLUIR-CLIENTE-PROJETO-20260529.md`
**Cenário implementado:** A2

---

## §C.1 — Contratos unitários (F1 backend) — 4 contratos

**Arquivo destino:** `server/integration/excluir-cliente-projeto.test.ts` (NOVO)

```typescript
import { describe, it, expect } from "vitest";
import { z } from "zod";

// schema espelhado de routers-fluxo-v3.ts createProject (pattern Lição #110:
// importar schema real, NÃO replicar — exportar como const no router)
import { createProjectInputSchema } from "../routers-fluxo-v3";

describe("createProject — clientId opcional (Cenário A2)", () => {
  // TU-01: payload sem clientId é aceito (frontend pós-remoção UI)
  it("TU-01: aceita payload sem clientId", () => {
    const result = createProjectInputSchema.safeParse({
      name: "Projeto Teste",
      description: "Descrição com mais de 50 caracteres para passar o gate de schema obrigatório.",
      companyProfile: { /* mínimo válido */ },
      operationProfile: { /* mínimo válido */ },
    });
    expect(result.success).toBe(true);
  });

  // TU-02: payload com clientId explícito também é aceito (retrocompat)
  it("TU-02: aceita payload com clientId explícito (retrocompat)", () => {
    const result = createProjectInputSchema.safeParse({
      clientId: 42,
      name: "Projeto Teste",
      description: "...".repeat(20),
      companyProfile: { /* mínimo válido */ },
      operationProfile: { /* mínimo válido */ },
    });
    expect(result.success).toBe(true);
  });

  // TU-03: payload sem name continua rejeitado (não-regressão F1)
  it("TU-03: rejeita payload sem name (não-regressão)", () => {
    const result = createProjectInputSchema.safeParse({
      description: "...".repeat(20),
      companyProfile: { /* mínimo válido */ },
      operationProfile: { /* mínimo válido */ },
    });
    expect(result.success).toBe(false);
  });

  // TU-04: descrição < 50 chars ainda rejeitada (não-regressão F1)
  it("TU-04: rejeita descrição curta (não-regressão)", () => {
    const result = createProjectInputSchema.safeParse({
      name: "Projeto",
      description: "curta",
      companyProfile: { /* mínimo válido */ },
      operationProfile: { /* mínimo válido */ },
    });
    expect(result.success).toBe(false);
  });
});
```

---

## §C.2 — Contratos integração (F1 backend) — 3 contratos

```typescript
// caller do procedure (não só schema isolado)
describe("fluxoV3Router.createProject — auto-derivação clientId", () => {
  // TI-01: chamada sem clientId no input → DB persiste clientId = ctx.user.id
  it("TI-01: auto-deriva clientId de ctx.user.id quando ausente", async () => {
    const ctx = createMockContext(userId=99);
    const caller = fluxoV3Router.createCaller(ctx);
    const { projectId } = await caller.createProject({
      name: "Projeto Auto-Derivado",
      description: "...".repeat(20),
      companyProfile: { /* mínimo */ },
      operationProfile: { /* mínimo */ },
    });
    const project = await db.getProjectById(projectId);
    expect(project?.clientId).toBe(99);  // ctx.user.id, não null
  });

  // TI-02: chamada com clientId explícito → DB persiste o explícito
  it("TI-02: usa clientId explícito quando fornecido", async () => {
    const ctx = createMockContext(userId=99);
    const caller = fluxoV3Router.createCaller(ctx);
    const { projectId } = await caller.createProject({
      clientId: 42,  // ctx.user.id = 99, mas o input pede 42
      name: "Projeto Cliente Explícito",
      description: "...".repeat(20),
      companyProfile: { /* mínimo */ },
      operationProfile: { /* mínimo */ },
    });
    const project = await db.getProjectById(projectId);
    expect(project?.clientId).toBe(42);
  });

  // TI-03: persistência respeita constraint notNull (regressão schema)
  it("TI-03: clientId nunca persiste como NULL", async () => {
    const ctx = createMockContext(userId=99);
    const caller = fluxoV3Router.createCaller(ctx);
    const { projectId } = await caller.createProject({
      name: "Projeto Sem ClientId Input",
      description: "...".repeat(20),
      companyProfile: { /* mínimo */ },
      operationProfile: { /* mínimo */ },
    });
    const project = await db.getProjectById(projectId);
    expect(project?.clientId).not.toBeNull();
    expect(typeof project?.clientId).toBe("number");
  });
});
```

---

## §C.3 — Contratos regressão (auth + listings) — 5 contratos

**Arquivo destino:** `server/integration/excluir-cliente-projeto-auth.test.ts` (NOVO)

```typescript
describe("Auth/RBAC — clientId auto-derivado preserva guards (regressão)", () => {
  // TR-01: cliente que criou projeto pode acessá-lo
  it("TR-01: role='cliente' acessa projeto que ele mesmo criou", async () => {
    const ctx = createMockContext(userId=99, role="cliente");
    const caller = fluxoV3Router.createCaller(ctx);
    const { projectId } = await caller.createProject({...});
    // Outra procedure que tem guard `project.clientId !== ctx.user.id`
    const result = await caller.getProjectById({ id: projectId });
    expect(result).toBeDefined();
  });

  // TR-02: cliente NÃO acessa projeto de OUTRO cliente
  it("TR-02: role='cliente' bloqueado de projeto de outro user", async () => {
    const ctx1 = createMockContext(userId=99, role="cliente");
    const caller1 = fluxoV3Router.createCaller(ctx1);
    const { projectId } = await caller1.createProject({...});

    const ctx2 = createMockContext(userId=100, role="cliente");
    const caller2 = fluxoV3Router.createCaller(ctx2);
    await expect(caller2.getProjectById({ id: projectId })).rejects.toThrow(/FORBIDDEN|NOT_FOUND/);
  });

  // TR-03: advogado_senior acessa qualquer projeto (não filtra por clientId)
  it("TR-03: role='advogado_senior' acessa projeto de qualquer cliente", async () => {
    const ctxCli = createMockContext(userId=99, role="cliente");
    const callerCli = fluxoV3Router.createCaller(ctxCli);
    const { projectId } = await callerCli.createProject({...});

    const ctxAdv = createMockContext(userId=1, role="advogado_senior");
    const callerAdv = fluxoV3Router.createCaller(ctxAdv);
    const result = await callerAdv.getProjectById({ id: projectId });
    expect(result).toBeDefined();
  });

  // TR-04: getProjectsByUserId continua retornando os projetos do cliente
  it("TR-04: listagem por clientId retorna projetos auto-derivados", async () => {
    const ctx = createMockContext(userId=99, role="cliente");
    const caller = fluxoV3Router.createCaller(ctx);
    await caller.createProject({ name: "P1", ... });
    await caller.createProject({ name: "P2", ... });

    const list = await db.getProjectsByUserId(99);
    expect(list.length).toBeGreaterThanOrEqual(2);
  });

  // TR-05: analytics filtra por clientId continua funcionando
  it("TR-05: analytics filtra dashboards por clientId auto-derivado", async () => {
    const ctx = createMockContext(userId=99, role="cliente");
    const caller = analyticsRouter.createCaller(ctx);
    await fluxoV3Router.createCaller(ctx).createProject({...});

    const dashboard = await caller.getDashboard();
    expect(dashboard.projectsCount).toBeGreaterThanOrEqual(1);
  });
});
```

---

## §C.4 — Contratos E2E Playwright (F2 UI removida) — 4 cenários

**Arquivo destino:** `tests/e2e/excluir-cliente-projeto.spec.ts` (NOVO)

| ID | Cenário | Asserção |
|---|---|---|
| **E2E-01** | Abrir `/projetos/novo` e confirmar bloco "Cliente Vinculado" ausente | `expect(page.locator('text=Cliente Vinculado')).not.toBeVisible()` |
| **E2E-02** | Preencher nome + descrição + perfil + clicar Avançar (sem selecionar cliente) | botão Avançar habilitado quando perfil ok; navega para próxima etapa |
| **E2E-03** | Confirmar que projeto criado tem `clientId = currentUser.id` | via API: `GET /api/trpc/fluxoV3.getProjectById` retorna `clientId` igual ao ID do usuário logado |
| **E2E-04** | Confirmar que botão "+ Novo Cliente" + modal não aparecem | `expect(page.locator('text=Novo Cliente')).not.toBeVisible()` |

---

## §C.5 — DoD por fase

| Fase | DoD | Verificação | Responsável |
|---|---|---|---|
| **F0** | Snapshot SQL + tag `pre-excluir-cliente-projeto-baseline` em `5b3191b` + runbook rollback | Manus reporta arquivos | Manus |
| **F1** | TU-01..04 + TI-01..03 + TR-01..05 PASS (12/12) · `pnpm tsc --noEmit` 0 erros · CI verde | CI automático | Claude Code (impl) + Manus (revisão) |
| **F2** | E2E-01..04 PASS (4/4) · UI sem bloco "Cliente Vinculado" · botão Avançar não bloqueia por clientId | Manus testa em ambiente staging | Manus |
| **F3** | 48 testes legados que usam `clientId` continuam PASS (não-regressão) | CI automático | Claude Code |
| **F4** | UX_DICTIONARY + FLOW_DICTIONARY atualizados | Revisão P.O. | Claude Code + P.O. |

---

## §C.6 — Lições aplicáveis

- **Lição #59** (assemble ≠ consumption) — TR-04/TR-05 validam que clientId auto-derivado é CONSUMIDO pelos readers, não apenas escrito
- **Lição #65** (writers/readers end-to-end) — 24 readers mapeados no AS-IS Passo 10
- **Lição #110** (schema real, não replicado) — TU-01..04 importam `createProjectInputSchema` real (a exportar)
- **Lição #111** (testar com valor real do frontend) — frontend pós-F2 envia payload **sem** `clientId` → TU-01 testa exatamente isso
- **REGRA-ORQ-27** (validação de consumo) — todos os contratos têm asserção dinâmica
- **REGRA-ORQ-35** (NUNCA ASSUMA) — investigação prévia completou 10/11 passos

---

**Total:** 4 unit + 3 integração + 5 regressão + 4 E2E = **16 contratos** + 5 DoDs por fase.
**Confiabilidade declarada:** 90% (residual 10%: schema Zod pode precisar refinamento se Q1 do DB-SPEC revelar fluxo "advogado cria para cliente" → reabrir spec).
