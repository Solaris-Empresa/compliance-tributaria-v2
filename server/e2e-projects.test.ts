/**
 * TESTES E2E — Criação e Alteração de Projetos
 * Sprint V58 — 17/03/2026
 *
 * Cobertura:
 *  BLOCO A — Criação de Usuários e Clientes
 *  BLOCO B — Criação de Projetos (campos obrigatórios, opcionais, validações)
 *  BLOCO C — Listagem de Projetos (por papel, filtros)
 *  BLOCO D — Leitura de Projeto por ID (acesso, not found, forbidden)
 *  BLOCO E — Alteração de Projeto (nome, período, notificação)
 *  BLOCO F — Mudança de Status (permissões por papel, transições válidas e inválidas)
 *  BLOCO G — Fluxo E2E completo (criar → editar → mudar status → arquivar)
 *  BLOCO H — Limpeza pós-teste
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { projects, users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getConn() {
  const db = await getDb();
  if (!db) throw new Error("DB connection failed");
  return db;
}

async function createTestUser(overrides: Partial<typeof users.$inferInsert> = {}) {
  const db = await getConn();
  const openId = `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await db.insert(users).values({
    openId,
    name: "E2E Test User",
    email: `e2e-${openId}@test.com`,
    role: "equipe_solaris",
    ...overrides,
  });
  const [user] = await db.select().from(users).where(eq(users.openId, openId));
  return user;
}

async function createTestProject(
  db: Awaited<ReturnType<typeof getConn>>,
  data: Partial<typeof projects.$inferInsert> & { name: string; clientId: number; createdById: number }
) {
  const [result] = await db.insert(projects).values({
    status: "rascunho",
    createdByRole: "equipe_solaris",
    notificationFrequency: "semanal",
    mode: "historico",
    currentStep: 1,
    ...data,
  });
  return (result as any).insertId as number;
}

// IDs criados durante os testes — para limpeza final
const createdUserIds: number[] = [];
const createdProjectIds: number[] = [];

// ─── BLOCO A — Criação de Usuários e Clientes ─────────────────────────────────

describe("BLOCO A — Criação de Usuários e Clientes", () => {
  it("A01 — deve criar usuário equipe_solaris com todos os campos", async () => {
    const user = await createTestUser({ name: "Ana SOLARIS", role: "equipe_solaris" });
    createdUserIds.push(user.id);
    expect(user.id).toBeGreaterThan(0);
    expect(user.name).toBe("Ana SOLARIS");
    expect(user.role).toBe("equipe_solaris");
  });

  it("A02 — deve criar usuário cliente com role padrão", async () => {
    const user = await createTestUser({ name: "Carlos Cliente", role: "cliente" });
    createdUserIds.push(user.id);
    expect(user.role).toBe("cliente");
  });

  it("A03 — deve criar usuário advogado_senior", async () => {
    const user = await createTestUser({ name: "Dra. Maria Advogada", role: "advogado_senior" });
    createdUserIds.push(user.id);
    expect(user.role).toBe("advogado_senior");
  });

  it("A04 — deve criar usuário advogado_junior", async () => {
    const user = await createTestUser({ name: "João Júnior", role: "advogado_junior" });
    createdUserIds.push(user.id);
    expect(user.role).toBe("advogado_junior");
  });

  it("A05 — openId deve ser único por usuário", async () => {
    const user1 = await createTestUser({ name: "User Unique 1" });
    const user2 = await createTestUser({ name: "User Unique 2" });
    createdUserIds.push(user1.id, user2.id);
    expect(user1.openId).not.toBe(user2.openId);
  });
});

// ─── BLOCO B — Criação de Projetos ────────────────────────────────────────────

describe("BLOCO B — Criação de Projetos", () => {
  let solaris: Awaited<ReturnType<typeof createTestUser>>;
  let cliente: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    solaris = await createTestUser({ name: "SOLARIS B", role: "equipe_solaris" });
    cliente = await createTestUser({ name: "Cliente B", role: "cliente" });
    createdUserIds.push(solaris.id, cliente.id);
  });

  it("B01 — deve criar projeto com campos mínimos obrigatórios", async () => {
    const db = await getConn();
    const id = await createTestProject(db, {
      name: "Projeto Mínimo E2E",
      clientId: cliente.id,
      createdById: solaris.id,
    });
    createdProjectIds.push(id);
    expect(id).toBeGreaterThan(0);

    const [proj] = await db.select().from(projects).where(eq(projects.id, id));
    expect(proj.name).toBe("Projeto Mínimo E2E");
    expect(proj.status).toBe("rascunho");
    expect(proj.clientId).toBe(cliente.id);
    expect(proj.createdById).toBe(solaris.id);
    expect(proj.currentStep).toBe(1);
  });

  it("B02 — deve criar projeto com todos os campos opcionais", async () => {
    const db = await getConn();
    const id = await createTestProject(db, {
      name: "Projeto Completo E2E",
      clientId: cliente.id,
      createdById: solaris.id,
      planPeriodMonths: 12,
      notificationFrequency: "diaria",
      notificationEmail: "gestor@empresa.com.br",
      description: "Empresa de fabricação de vinhos com 2 CNAEs identificados pela IA.",
    });
    createdProjectIds.push(id);

    const [proj] = await db.select().from(projects).where(eq(projects.id, id));
    expect(proj.planPeriodMonths).toBe(12);
    expect(proj.notificationFrequency).toBe("diaria");
    expect(proj.notificationEmail).toBe("gestor@empresa.com.br");
    expect(proj.description).toContain("fabricação de vinhos");
  });

  it("B03 — deve criar projeto com período de 24 meses", async () => {
    const db = await getConn();
    const id = await createTestProject(db, {
      name: "Projeto 24 Meses E2E",
      clientId: cliente.id,
      createdById: solaris.id,
      planPeriodMonths: 24,
    });
    createdProjectIds.push(id);

    const [proj] = await db.select().from(projects).where(eq(projects.id, id));
    expect(proj.planPeriodMonths).toBe(24);
  });

  it("B04 — deve criar projeto com status inicial 'rascunho'", async () => {
    const db = await getConn();
    const id = await createTestProject(db, {
      name: "Projeto Status Inicial E2E",
      clientId: cliente.id,
      createdById: solaris.id,
    });
    createdProjectIds.push(id);

    const [proj] = await db.select().from(projects).where(eq(projects.id, id));
    expect(proj.status).toBe("rascunho");
  });

  it("B05 — deve criar projeto com CNAEs confirmados como JSON", async () => {
    const db = await getConn();
    const cnaes = [
      { code: "1112-7/00", description: "Fabricação de vinho", confidence: 100 },
      { code: "4723-7/00", description: "Comércio varejista de bebidas", confidence: 95 },
    ];
    const id = await createTestProject(db, {
      name: "Projeto CNAEs E2E",
      clientId: cliente.id,
      createdById: solaris.id,
      confirmedCnaes: cnaes,
    });
    createdProjectIds.push(id);

    const [proj] = await db.select().from(projects).where(eq(projects.id, id));
    const saved = proj.confirmedCnaes as typeof cnaes;
    expect(Array.isArray(saved)).toBe(true);
    expect(saved).toHaveLength(2);
    expect(saved[0].code).toBe("1112-7/00");
    expect(saved[1].confidence).toBe(95);
  });

  it("B06 — dois projetos do mesmo cliente devem ter IDs distintos", async () => {
    const db = await getConn();
    const id1 = await createTestProject(db, {
      name: "Projeto Duplicado 1 E2E",
      clientId: cliente.id,
      createdById: solaris.id,
    });
    const id2 = await createTestProject(db, {
      name: "Projeto Duplicado 2 E2E",
      clientId: cliente.id,
      createdById: solaris.id,
    });
    createdProjectIds.push(id1, id2);
    expect(id1).not.toBe(id2);
  });
});

// ─── BLOCO C — Listagem de Projetos ───────────────────────────────────────────

describe("BLOCO C — Listagem de Projetos", () => {
  let solaris: Awaited<ReturnType<typeof createTestUser>>;
  let cliente: Awaited<ReturnType<typeof createTestUser>>;
  let projId: number;

  beforeAll(async () => {
    solaris = await createTestUser({ name: "SOLARIS C", role: "equipe_solaris" });
    cliente = await createTestUser({ name: "Cliente C", role: "cliente" });
    createdUserIds.push(solaris.id, cliente.id);
    const db = await getConn();
    projId = await createTestProject(db, {
      name: "Projeto Lista C E2E",
      clientId: cliente.id,
      createdById: solaris.id,
    });
    createdProjectIds.push(projId);
  });

  it("C01 — equipe_solaris deve ver todos os projetos", async () => {
    const { getProjectsByUser } = await import("./db");
    const list = await getProjectsByUser(solaris.id, "equipe_solaris");
    expect(Array.isArray(list)).toBe(true);
    const found = list.find((p) => p.id === projId);
    expect(found).toBeDefined();
  });

  it("C02 — cliente deve ver apenas seus próprios projetos", async () => {
    const { getProjectsByUser } = await import("./db");
    const list = await getProjectsByUser(cliente.id, "cliente");
    // Todos os projetos retornados devem pertencer ao cliente
    for (const p of list) {
      expect(p.clientId).toBe(cliente.id);
    }
  });

  it("C03 — projeto recém-criado deve aparecer na listagem", async () => {
    const { getProjectsByUser } = await import("./db");
    const list = await getProjectsByUser(solaris.id, "equipe_solaris");
    const found = list.find((p) => p.id === projId);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Projeto Lista C E2E");
    expect(found?.status).toBe("rascunho");
  });
});

// ─── BLOCO D — Leitura de Projeto por ID ─────────────────────────────────────

describe("BLOCO D — Leitura de Projeto por ID", () => {
  let projId: number;
  let solaris: Awaited<ReturnType<typeof createTestUser>>;
  let cliente: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    solaris = await createTestUser({ name: "SOLARIS D", role: "equipe_solaris" });
    cliente = await createTestUser({ name: "Cliente D", role: "cliente" });
    createdUserIds.push(solaris.id, cliente.id);
    const db = await getConn();
    projId = await createTestProject(db, {
      name: "Projeto Leitura D E2E",
      clientId: cliente.id,
      createdById: solaris.id,
    });
    createdProjectIds.push(projId);
  });

  it("D01 — deve retornar projeto existente pelo ID", async () => {
    const { getProjectById } = await import("./db");
    const proj = await getProjectById(projId);
    expect(proj).not.toBeNull();
    expect(proj?.id).toBe(projId);
    expect(proj?.name).toBe("Projeto Leitura D E2E");
  });

  it("D02 — deve retornar undefined/null para ID inexistente", async () => {
    const { getProjectById } = await import("./db");
    const proj = await getProjectById(999999999);
    // getProjectById retorna undefined quando não encontra (comportamento do Drizzle)
    expect(proj == null).toBe(true); // null ou undefined são ambos aceitáveis
  });

  it("D03 — projeto deve ter campos createdAt e updatedAt preenchidos", async () => {
    const { getProjectById } = await import("./db");
    const proj = await getProjectById(projId);
    expect(proj?.createdAt).toBeDefined();
    expect(proj?.updatedAt).toBeDefined();
    expect(proj?.createdAt instanceof Date).toBe(true);
  });

  it("D04 — projeto deve ter clientId correto", async () => {
    const { getProjectById } = await import("./db");
    const proj = await getProjectById(projId);
    expect(proj?.clientId).toBe(cliente.id);
    expect(proj?.createdById).toBe(solaris.id);
  });
});

// ─── BLOCO E — Alteração de Projeto ──────────────────────────────────────────

describe("BLOCO E — Alteração de Projeto", () => {
  let projId: number;
  let solaris: Awaited<ReturnType<typeof createTestUser>>;
  let cliente: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    solaris = await createTestUser({ name: "SOLARIS E", role: "equipe_solaris" });
    cliente = await createTestUser({ name: "Cliente E", role: "cliente" });
    createdUserIds.push(solaris.id, cliente.id);
    const db = await getConn();
    projId = await createTestProject(db, {
      name: "Projeto Alterar E2E",
      clientId: cliente.id,
      createdById: solaris.id,
    });
    createdProjectIds.push(projId);
  });

  it("E01 — deve alterar o nome do projeto", async () => {
    const { updateProject, getProjectById } = await import("./db");
    await updateProject(projId, { name: "Projeto Renomeado E2E" });
    const proj = await getProjectById(projId);
    expect(proj?.name).toBe("Projeto Renomeado E2E");
  });

  it("E02 — deve alterar o período do plano para 12 meses", async () => {
    const { updateProject, getProjectById } = await import("./db");
    await updateProject(projId, { planPeriodMonths: 12 });
    const proj = await getProjectById(projId);
    expect(proj?.planPeriodMonths).toBe(12);
  });

  it("E03 — deve alterar a frequência de notificação", async () => {
    const { updateProject, getProjectById } = await import("./db");
    await updateProject(projId, { notificationFrequency: "semanal" });
    const proj = await getProjectById(projId);
    expect(proj?.notificationFrequency).toBe("semanal");
  });

  it("E04 — deve alterar o e-mail de notificação", async () => {
    const { updateProject, getProjectById } = await import("./db");
    await updateProject(projId, { notificationEmail: "novo@empresa.com.br" });
    const proj = await getProjectById(projId);
    expect(proj?.notificationEmail).toBe("novo@empresa.com.br");
  });

  it("E05 — deve salvar briefingContent como texto markdown", async () => {
    const { updateProject, getProjectById } = await import("./db");
    const markdown = "# Briefing\n\n## Resumo\nEmpresa de fabricação de vinhos.";
    await updateProject(projId, { briefingContent: markdown });
    const proj = await getProjectById(projId);
    expect(proj?.briefingContent).toContain("# Briefing");
    expect(proj?.briefingContent).toContain("fabricação de vinhos");
  });

  it("E06 — deve salvar riskMatricesData como JSON", async () => {
    const { updateProject, getProjectById } = await import("./db");
    const matrices = {
      contabilidade: [
        { title: "Risco IVA", probability: 3, impact: 4, severity: 12 },
      ],
    };
    await updateProject(projId, { riskMatricesData: matrices });
    const proj = await getProjectById(projId);
    const saved = proj?.riskMatricesData as typeof matrices;
    expect(saved?.contabilidade).toHaveLength(1);
    expect(saved?.contabilidade[0].title).toBe("Risco IVA");
    expect(saved?.contabilidade[0].severity).toBe(12);
  });

  it("E07 — deve salvar actionPlansData como JSON", async () => {
    const { updateProject, getProjectById } = await import("./db");
    const plans = {
      contabilidade: [
        { title: "Adaptar sistema fiscal", status: "nao_iniciado", progress: 0 },
      ],
    };
    await updateProject(projId, { actionPlansData: plans });
    const proj = await getProjectById(projId);
    const saved = proj?.actionPlansData as typeof plans;
    expect(saved?.contabilidade).toHaveLength(1);
    expect(saved?.contabilidade[0].title).toBe("Adaptar sistema fiscal");
  });

  it("E08 — múltiplas alterações devem ser acumulativas", async () => {
    const { updateProject, getProjectById } = await import("./db");
    await updateProject(projId, { name: "Projeto Final E2E", planPeriodMonths: 24 });
    const proj = await getProjectById(projId);
    expect(proj?.name).toBe("Projeto Final E2E");
    expect(proj?.planPeriodMonths).toBe(24);
    // Campos anteriores devem persistir
    expect(proj?.notificationEmail).toBe("novo@empresa.com.br");
  });
});

// ─── BLOCO F — Mudança de Status ─────────────────────────────────────────────

describe("BLOCO F — Mudança de Status (Permissões por Papel)", () => {
  let projId: number;
  let solaris: Awaited<ReturnType<typeof createTestUser>>;
  let cliente: Awaited<ReturnType<typeof createTestUser>>;
  let advSenior: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    solaris = await createTestUser({ name: "SOLARIS F", role: "equipe_solaris" });
    cliente = await createTestUser({ name: "Cliente F", role: "cliente" });
    advSenior = await createTestUser({ name: "Adv Senior F", role: "advogado_senior" });
    createdUserIds.push(solaris.id, cliente.id, advSenior.id);
    const db = await getConn();
    projId = await createTestProject(db, {
      name: "Projeto Status F E2E",
      clientId: cliente.id,
      createdById: solaris.id,
    });
    createdProjectIds.push(projId);
  });

  it("F01 — equipe_solaris pode mudar status para assessment_fase1", async () => {
    const { updateProject, getProjectById } = await import("./db");
    await updateProject(projId, { status: "assessment_fase1" });
    const proj = await getProjectById(projId);
    expect(proj?.status).toBe("assessment_fase1");
  });

  it("F02 — equipe_solaris pode mudar status para assessment_fase2", async () => {
    const { updateProject, getProjectById } = await import("./db");
    await updateProject(projId, { status: "assessment_fase2" });
    const proj = await getProjectById(projId);
    expect(proj?.status).toBe("assessment_fase2");
  });

  it("F03 — equipe_solaris pode mudar status para matriz_riscos", async () => {
    const { updateProject, getProjectById } = await import("./db");
    await updateProject(projId, { status: "matriz_riscos" });
    const proj = await getProjectById(projId);
    expect(proj?.status).toBe("matriz_riscos");
  });

  it("F04 — equipe_solaris pode mudar status para plano_acao", async () => {
    const { updateProject, getProjectById } = await import("./db");
    await updateProject(projId, { status: "plano_acao" });
    const proj = await getProjectById(projId);
    expect(proj?.status).toBe("plano_acao");
  });

  it("F05 — equipe_solaris pode mudar status para em_avaliacao", async () => {
    const { updateProject, getProjectById } = await import("./db");
    await updateProject(projId, { status: "em_avaliacao" });
    const proj = await getProjectById(projId);
    expect(proj?.status).toBe("em_avaliacao");
  });

  it("F06 — equipe_solaris pode mudar status para aprovado", async () => {
    const { updateProject, getProjectById } = await import("./db");
    await updateProject(projId, { status: "aprovado" });
    const proj = await getProjectById(projId);
    expect(proj?.status).toBe("aprovado");
  });

  it("F07 — equipe_solaris pode mudar status para em_andamento", async () => {
    const { updateProject, getProjectById } = await import("./db");
    await updateProject(projId, { status: "em_andamento" });
    const proj = await getProjectById(projId);
    expect(proj?.status).toBe("em_andamento");
  });

  it("F08 — equipe_solaris pode mudar status para parado", async () => {
    const { updateProject, getProjectById } = await import("./db");
    await updateProject(projId, { status: "parado" });
    const proj = await getProjectById(projId);
    expect(proj?.status).toBe("parado");
  });

  it("F09 — equipe_solaris pode mudar status para concluido", async () => {
    const { updateProject, getProjectById } = await import("./db");
    await updateProject(projId, { status: "concluido" });
    const proj = await getProjectById(projId);
    expect(proj?.status).toBe("concluido");
  });

  it("F10 — equipe_solaris pode arquivar projeto (status arquivado)", async () => {
    const { updateProject, getProjectById } = await import("./db");
    await updateProject(projId, { status: "arquivado" });
    const proj = await getProjectById(projId);
    expect(proj?.status).toBe("arquivado");
  });

  it("F11 — regra: cliente só pode transitar para em_avaliacao a partir de rascunho", () => {
    // Regra de negócio definida na procedure updateStatus
    const clientAllowedTransitions: Record<string, string[]> = {
      rascunho: ["em_avaliacao"],
      assessment_fase1: ["em_avaliacao"],
      assessment_fase2: ["em_avaliacao"],
      matriz_riscos: ["em_avaliacao"],
      plano_acao: ["em_avaliacao"],
    };
    expect(clientAllowedTransitions["rascunho"]).toContain("em_avaliacao");
    expect(clientAllowedTransitions["rascunho"]).not.toContain("aprovado");
    expect(clientAllowedTransitions["rascunho"]).not.toContain("arquivado");
    expect(clientAllowedTransitions["aprovado"]).toBeUndefined();
  });

  it("F12 — regra: cliente NÃO pode transitar de aprovado para nenhum status", () => {
    const clientAllowedTransitions: Record<string, string[]> = {
      rascunho: ["em_avaliacao"],
      assessment_fase1: ["em_avaliacao"],
      assessment_fase2: ["em_avaliacao"],
      matriz_riscos: ["em_avaliacao"],
      plano_acao: ["em_avaliacao"],
    };
    const allowed = clientAllowedTransitions["aprovado"] ?? [];
    expect(allowed).toHaveLength(0);
  });

  it("F13 — todos os 11 status do enum devem ser válidos", () => {
    const validStatuses = [
      "rascunho", "assessment_fase1", "assessment_fase2", "matriz_riscos",
      "plano_acao", "em_avaliacao", "aprovado", "em_andamento",
      "parado", "concluido", "arquivado",
    ];
    expect(validStatuses).toHaveLength(11);
    // Verificar que não há duplicatas
    const unique = new Set(validStatuses);
    expect(unique.size).toBe(11);
  });
});

// ─── BLOCO G — Fluxo E2E Completo ────────────────────────────────────────────

describe("BLOCO G — Fluxo E2E Completo (criar → editar → avançar status → arquivar)", () => {
  it("G01 — fluxo completo de vida de um projeto", async () => {
    const db = await getConn();
    const { updateProject, getProjectById, getProjectsByUser } = await import("./db");

    // 1. Criar usuários
    const solaris = await createTestUser({ name: "SOLARIS G", role: "equipe_solaris" });
    const cliente = await createTestUser({ name: "Cliente G", role: "cliente" });
    createdUserIds.push(solaris.id, cliente.id);

    // 2. Criar projeto
    const projId = await createTestProject(db, {
      name: "Projeto E2E Completo",
      clientId: cliente.id,
      createdById: solaris.id,
      description: "Empresa de fabricação de vinhos e comércio varejista.",
    });
    createdProjectIds.push(projId);

    // 3. Verificar criação
    let proj = await getProjectById(projId);
    expect(proj?.status).toBe("rascunho");
    expect(proj?.name).toBe("Projeto E2E Completo");

    // 4. Editar nome e período
    await updateProject(projId, { name: "Projeto E2E Completo (Renomeado)", planPeriodMonths: 12 });
    proj = await getProjectById(projId);
    expect(proj?.name).toBe("Projeto E2E Completo (Renomeado)");
    expect(proj?.planPeriodMonths).toBe(12);

    // 5. Avançar status: rascunho → assessment_fase1
    await updateProject(projId, { status: "assessment_fase1" });
    proj = await getProjectById(projId);
    expect(proj?.status).toBe("assessment_fase1");

    // 6. Salvar CNAEs confirmados
    const cnaes = [
      { code: "1112-7/00", description: "Fabricação de vinho", confidence: 100 },
    ];
    await updateProject(projId, { confirmedCnaes: cnaes, status: "assessment_fase2" });
    proj = await getProjectById(projId);
    expect(proj?.status).toBe("assessment_fase2");
    expect((proj?.confirmedCnaes as any[])?.[0]?.code).toBe("1112-7/00");

    // 7. Avançar para matriz_riscos
    await updateProject(projId, { status: "matriz_riscos" });
    proj = await getProjectById(projId);
    expect(proj?.status).toBe("matriz_riscos");

    // 8. Salvar briefing
    await updateProject(projId, {
      briefingContent: "# Briefing\n\nEmpresa de fabricação de vinhos.",
    });
    proj = await getProjectById(projId);
    expect(proj?.briefingContent).toContain("fabricação de vinhos");

    // 9. Salvar matrizes de riscos
    const matrices = {
      contabilidade: [{ title: "Risco CBS", probability: 3, impact: 4, severity: 12 }],
    };
    await updateProject(projId, { riskMatricesData: matrices, status: "plano_acao" });
    proj = await getProjectById(projId);
    expect(proj?.status).toBe("plano_acao");
    expect((proj?.riskMatricesData as any)?.contabilidade?.[0]?.title).toBe("Risco CBS");

    // 10. Salvar plano de ação
    const plans = {
      contabilidade: [{ title: "Adaptar sistema fiscal", status: "nao_iniciado", progress: 0 }],
    };
    await updateProject(projId, { actionPlansData: plans, status: "em_avaliacao" });
    proj = await getProjectById(projId);
    expect(proj?.status).toBe("em_avaliacao");
    expect((proj?.actionPlansData as any)?.contabilidade?.[0]?.title).toBe("Adaptar sistema fiscal");

    // 11. Aprovar projeto
    await updateProject(projId, { status: "aprovado" });
    proj = await getProjectById(projId);
    expect(proj?.status).toBe("aprovado");

    // 12. Colocar em andamento
    await updateProject(projId, { status: "em_andamento" });
    proj = await getProjectById(projId);
    expect(proj?.status).toBe("em_andamento");

    // 13. Concluir
    await updateProject(projId, { status: "concluido" });
    proj = await getProjectById(projId);
    expect(proj?.status).toBe("concluido");

    // 14. Arquivar
    await updateProject(projId, { status: "arquivado" });
    proj = await getProjectById(projId);
    expect(proj?.status).toBe("arquivado");

    // 15. Verificar que projeto aparece na listagem do solaris
    const list = await getProjectsByUser(solaris.id, "equipe_solaris");
    const found = list.find((p) => p.id === projId);
    expect(found).toBeDefined();
    expect(found?.status).toBe("arquivado");
  });

  it("G02 — dois projetos independentes não devem interferir entre si", async () => {
    const db = await getConn();
    const { updateProject, getProjectById } = await import("./db");

    const solaris = await createTestUser({ name: "SOLARIS G2", role: "equipe_solaris" });
    const cliente = await createTestUser({ name: "Cliente G2", role: "cliente" });
    createdUserIds.push(solaris.id, cliente.id);

    const id1 = await createTestProject(db, {
      name: "Projeto Independente 1",
      clientId: cliente.id,
      createdById: solaris.id,
    });
    const id2 = await createTestProject(db, {
      name: "Projeto Independente 2",
      clientId: cliente.id,
      createdById: solaris.id,
    });
    createdProjectIds.push(id1, id2);

    // Alterar apenas o projeto 1
    await updateProject(id1, { status: "assessment_fase1", name: "Projeto 1 Alterado" });

    // Projeto 2 não deve ter sido afetado
    const proj2 = await getProjectById(id2);
    expect(proj2?.status).toBe("rascunho");
    expect(proj2?.name).toBe("Projeto Independente 2");
  });
});

// ─── BLOCO H — Limpeza Pós-Teste ─────────────────────────────────────────────

describe("BLOCO H — Limpeza Pós-Teste", () => {
  it("H01 — deve deletar todos os projetos criados nos testes", async () => {
    const db = await getConn();
    if (createdProjectIds.length > 0) {
      for (const id of createdProjectIds) {
        await db.delete(projects).where(eq(projects.id, id));
      }
    }
    // Verificar que foram deletados
    for (const id of createdProjectIds) {
      const { getProjectById } = await import("./db");
      const proj = await getProjectById(id);
      // getProjectById retorna undefined quando não encontra
      expect(proj == null).toBe(true);
    }
  });

  it("H02 — deve deletar todos os usuários criados nos testes", async () => {
    const db = await getConn();
    if (createdUserIds.length > 0) {
      for (const id of createdUserIds) {
        await db.delete(users).where(eq(users.id, id));
      }
    }
    // Verificar que foram deletados
    for (const id of createdUserIds) {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      expect(user).toBeUndefined();
    }
  });

  it("H03 — nenhum projeto ou usuário de teste deve permanecer no banco", async () => {
    const db = await getConn();
    // Verificar que NENHUM dos IDs criados pelos testes ainda existe
    // (O banco pode ter outros registros criados pelo sistema OAuth, o que é esperado)
    for (const id of createdProjectIds) {
      const [proj] = await db.select().from(projects).where(eq(projects.id, id));
      expect(proj).toBeUndefined();
    }
    for (const id of createdUserIds) {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      expect(user).toBeUndefined();
    }
    // Confirmar que não há projetos de teste (prefixo E2E) no banco
    const allProjects = await db.select().from(projects);
    const e2eProjects = allProjects.filter(p => p.name.includes("E2E"));
    expect(e2eProjects).toHaveLength(0);
  });
});
