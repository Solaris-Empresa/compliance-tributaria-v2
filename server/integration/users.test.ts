import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "../routers";
import { createMockContext, dbDescribe, generateFakeClient } from "../test-helpers";

dbDescribe("Users Router", () => {
  let mockContext: ReturnType<typeof createMockContext>;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    mockContext = createMockContext(1, "equipe_solaris");
    caller = appRouter.createCaller(mockContext as any);
  });

  describe("users.createClient", () => {
    it("should create client and return valid userId", async () => {
      const fakeClient = generateFakeClient();
      const result = await caller.users.createClient(fakeClient);

      expect(result).toBeDefined();
      expect(result.userId).toBeGreaterThan(0);
      expect(Number.isInteger(result.userId)).toBe(true);
    });
  });

  describe("users.listClients (PR-LISTCLIENTS-FIX — M3 pré-condição)", () => {
    it("should list clients (legacy: equipe_solaris)", async () => {
      const result = await caller.users.listClients();
      expect(Array.isArray(result)).toBe(true);
    });

    it("role=equipe_solaris retorna lista completa de clientes", async () => {
      const callerEquipe = appRouter.createCaller(
        createMockContext(1, "equipe_solaris") as any,
      );
      const result = await callerEquipe.users.listClients();
      expect(Array.isArray(result)).toBe(true);
      // Pode estar vazio em ambiente recém-cleanup; validamos apenas tipo + role-gate aprovado
      for (const u of result) {
        expect(u.role).toBe("cliente");
      }
    });

    it("role=advogado_senior preserva comportamento equipe_solaris", async () => {
      const callerAdv = appRouter.createCaller(
        createMockContext(2, "advogado_senior") as any,
      );
      const result = await callerAdv.users.listClients();
      expect(Array.isArray(result)).toBe(true);
      for (const u of result) {
        expect(u.role).toBe("cliente");
      }
    });

    it("role=cliente retorna apenas próprio user (auto-vínculo)", async () => {
      // Cria primeiro um cliente real para garantir que exista no DB
      const callerEquipe = appRouter.createCaller(
        createMockContext(1, "equipe_solaris") as any,
      );
      const fake = generateFakeClient();
      const created = await callerEquipe.users.createClient(fake);
      expect(created.userId).toBeGreaterThan(0);

      // Cliente recém-criado faz listClients via Caminho A (caller próprio)
      const callerCliente = appRouter.createCaller(
        createMockContext(created.userId, "cliente") as any,
      );
      const result = await callerCliente.users.listClients();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(created.userId);
      expect(result[0].role).toBe("cliente");
    });

    it("role inválida (advogado_junior) retorna FORBIDDEN", async () => {
      const callerInvalid = appRouter.createCaller(
        createMockContext(50, "advogado_junior") as any,
      );
      await expect(callerInvalid.users.listClients()).rejects.toThrow(
        /FORBIDDEN|Role não autorizada/i,
      );
    });
  });
});
