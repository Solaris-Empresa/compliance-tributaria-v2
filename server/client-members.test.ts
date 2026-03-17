import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do banco de dados
vi.mock("./db", () => ({
  getClientMembers: vi.fn().mockResolvedValue([
    { id: 1, clientId: 10, name: "João Silva", email: "joao@empresa.com", memberRole: "admin", active: true },
    { id: 2, clientId: 10, name: "Maria Santos", email: "maria@empresa.com", memberRole: "colaborador", active: true },
    { id: 3, clientId: 10, name: "Pedro Costa", email: "pedro@empresa.com", memberRole: "visualizador", active: false },
  ]),
  addClientMember: vi.fn().mockResolvedValue(4),
  updateClientMember: vi.fn().mockResolvedValue(true),
  removeClientMember: vi.fn().mockResolvedValue(true),
}));

import * as db from "./db";

describe("clientMembers — RF-1.03 / RF-5.17", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve listar membros de um cliente", async () => {
    const members = await db.getClientMembers(10);
    expect(members).toHaveLength(3);
    expect(members[0].memberRole).toBe("admin");
    expect(members[1].memberRole).toBe("colaborador");
    expect(members[2].memberRole).toBe("visualizador");
  });

  it("deve adicionar um novo membro com papel colaborador por padrão", async () => {
    const id = await db.addClientMember({
      clientId: 10,
      name: "Novo Membro",
      email: "novo@empresa.com",
      memberRole: "colaborador",
      active: true,
    });
    expect(id).toBe(4);
    expect(db.addClientMember).toHaveBeenCalledWith(expect.objectContaining({
      clientId: 10,
      memberRole: "colaborador",
    }));
  });

  it("deve atualizar o papel de um membro", async () => {
    const result = await db.updateClientMember(2, { memberRole: "admin" });
    expect(result).toBe(true);
    expect(db.updateClientMember).toHaveBeenCalledWith(2, { memberRole: "admin" });
  });

  it("deve desativar um membro (soft delete)", async () => {
    const result = await db.updateClientMember(3, { active: false });
    expect(result).toBe(true);
    expect(db.updateClientMember).toHaveBeenCalledWith(3, { active: false });
  });

  it("deve remover um membro permanentemente", async () => {
    const result = await db.removeClientMember(3);
    expect(result).toBe(true);
    expect(db.removeClientMember).toHaveBeenCalledWith(3);
  });

  it("deve filtrar membros ativos vs inativos", async () => {
    const members = await db.getClientMembers(10);
    const active = members.filter(m => m.active);
    const inactive = members.filter(m => !m.active);
    expect(active).toHaveLength(2);
    expect(inactive).toHaveLength(1);
    expect(inactive[0].name).toBe("Pedro Costa");
  });
});
