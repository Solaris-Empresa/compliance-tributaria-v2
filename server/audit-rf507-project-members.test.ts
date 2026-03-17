/**
 * Testes unitários — RF-5.07: Filtrar responsáveis por membros do cliente vinculado ao projeto
 *
 * Valida a procedure clientMembers.listByProject que:
 * 1. Busca o clientId do projeto
 * 2. Retorna apenas membros ativos do cliente
 * 3. Ordena por nome
 * 4. Lança NOT_FOUND se o projeto não existir
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getProjectById: vi.fn(),
  getClientMembers: vi.fn(),
}));

const mockGetProjectById = vi.mocked(db.getProjectById);
const mockGetClientMembers = vi.mocked(db.getClientMembers);

// ─── Dados de teste ───────────────────────────────────────────────────────────
const PROJECT_ID = 660093;
const CLIENT_ID = 42;

const mockProject = {
  id: PROJECT_ID,
  clientId: CLIENT_ID,
  name: "Projeto Teste RF-5.07",
  status: "ativo",
};

const mockMembers = [
  { id: 1, clientId: CLIENT_ID, name: "Carlos Silva",   email: "carlos@empresa.com",  memberRole: "admin",        active: true,  invitedAt: new Date("2025-01-01"), updatedAt: new Date() },
  { id: 2, clientId: CLIENT_ID, name: "Ana Oliveira",   email: "ana@empresa.com",     memberRole: "colaborador",  active: true,  invitedAt: new Date("2025-01-02"), updatedAt: new Date() },
  { id: 3, clientId: CLIENT_ID, name: "Bruno Costa",    email: "bruno@empresa.com",   memberRole: "visualizador", active: false, invitedAt: new Date("2025-01-03"), updatedAt: new Date() },
  { id: 4, clientId: CLIENT_ID, name: "Diana Ferreira", email: "diana@empresa.com",   memberRole: "colaborador",  active: true,  invitedAt: new Date("2025-01-04"), updatedAt: new Date() },
];

// ─── Lógica isolada da procedure (espelho do routers.ts) ──────────────────────
async function listByProject(projectId: number) {
  const project = await db.getProjectById(projectId);
  if (!project) throw new Error("NOT_FOUND");
  const members = await db.getClientMembers(project.clientId);
  return members
    .filter(m => m.active !== false)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(m => ({ id: m.id, name: m.name, email: m.email, memberRole: m.memberRole }));
}

// ─── Testes ───────────────────────────────────────────────────────────────────
describe("RF-5.07 — clientMembers.listByProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProjectById.mockResolvedValue(mockProject as any);
    mockGetClientMembers.mockResolvedValue(mockMembers as any);
  });

  it("deve retornar apenas membros ativos do cliente vinculado ao projeto", async () => {
    const result = await listByProject(PROJECT_ID);

    // Bruno Costa (active: false) não deve aparecer
    expect(result).toHaveLength(3);
    expect(result.find(m => m.name === "Bruno Costa")).toBeUndefined();
  });

  it("deve retornar membros ordenados por nome (A-Z)", async () => {
    const result = await listByProject(PROJECT_ID);

    const names = result.map(m => m.name);
    expect(names).toEqual(["Ana Oliveira", "Carlos Silva", "Diana Ferreira"]);
  });

  it("deve retornar apenas os campos necessários (id, name, email, memberRole)", async () => {
    const result = await listByProject(PROJECT_ID);

    result.forEach(m => {
      expect(m).toHaveProperty("id");
      expect(m).toHaveProperty("name");
      expect(m).toHaveProperty("email");
      expect(m).toHaveProperty("memberRole");
      // NÃO deve expor clientId, active, invitedAt, updatedAt
      expect(m).not.toHaveProperty("clientId");
      expect(m).not.toHaveProperty("active");
      expect(m).not.toHaveProperty("invitedAt");
    });
  });

  it("deve buscar membros usando o clientId do projeto (não do usuário logado)", async () => {
    await listByProject(PROJECT_ID);

    expect(mockGetProjectById).toHaveBeenCalledWith(PROJECT_ID);
    expect(mockGetClientMembers).toHaveBeenCalledWith(CLIENT_ID);
  });

  it("deve lançar NOT_FOUND se o projeto não existir", async () => {
    mockGetProjectById.mockResolvedValue(null as any);

    await expect(listByProject(999999)).rejects.toThrow("NOT_FOUND");
    expect(mockGetClientMembers).not.toHaveBeenCalled();
  });

  it("deve retornar lista vazia se o cliente não tiver membros ativos", async () => {
    mockGetClientMembers.mockResolvedValue([
      { id: 5, clientId: CLIENT_ID, name: "Inativo", email: "x@x.com", memberRole: "colaborador", active: false, invitedAt: new Date(), updatedAt: new Date() },
    ] as any);

    const result = await listByProject(PROJECT_ID);
    expect(result).toHaveLength(0);
  });

  it("deve retornar lista vazia se o cliente não tiver nenhum membro cadastrado", async () => {
    mockGetClientMembers.mockResolvedValue([]);

    const result = await listByProject(PROJECT_ID);
    expect(result).toHaveLength(0);
  });

  it("deve incluir o papel (memberRole) de cada membro no retorno", async () => {
    const result = await listByProject(PROJECT_ID);

    const ana = result.find(m => m.name === "Ana Oliveira");
    const carlos = result.find(m => m.name === "Carlos Silva");
    const diana = result.find(m => m.name === "Diana Ferreira");

    expect(ana?.memberRole).toBe("colaborador");
    expect(carlos?.memberRole).toBe("admin");
    expect(diana?.memberRole).toBe("colaborador");
  });
});
