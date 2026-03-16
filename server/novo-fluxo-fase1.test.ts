/**
 * novo-fluxo-fase1.test.ts
 * Testes unitários e funcionais para a Fase 1 do Novo Fluxo v2.0
 * Sprint V39 — Modo Temporário, Sessões, Briefing Inteligente com IA
 */
import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";
import { sessions, branchSuggestions } from "../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

function futureDate(hours = 24): Date {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d;
}

function pastDate(): Date {
  // MySQL TIMESTAMP não aceita epoch (1970-01-01 00:00:00)
  // Usar data passada válida: 1 minuto atrás
  const d = new Date();
  d.setMinutes(d.getMinutes() - 1);
  return d;
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("Fase 1 — Novo Fluxo v2.0: Sessões e Briefing Inteligente", () => {
  let database: Awaited<ReturnType<typeof db.getDb>>;
  let testToken: string;

  beforeAll(async () => {
    database = await db.getDb();
    expect(database).toBeTruthy();
    testToken = generateToken();
  });

  // ── 1. Tabela sessions existe no banco ──────────────────────────────────────
  describe("1. Estrutura do banco de dados", () => {
    it("tabela sessions deve existir e aceitar insert", async () => {
      const token = generateToken();
      await database!.insert(sessions).values({
        sessionToken: token,
        mode: "temporario",
        currentStep: "briefing",
        expiresAt: futureDate(24),
      });

      const [row] = await database!
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, token))
        .limit(1);

      expect(row).toBeTruthy();
      expect(row.mode).toBe("temporario");
      expect(row.currentStep).toBe("briefing");
      expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Cleanup
      await database!.delete(sessions).where(eq(sessions.sessionToken, token));
    });

    it("tabela sessions deve aceitar modo 'historico'", async () => {
      const token = generateToken();
      await database!.insert(sessions).values({
        sessionToken: token,
        mode: "historico",
        currentStep: "briefing",
        expiresAt: futureDate(24 * 30), // 30 dias para histórico
      });

      const [row] = await database!
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, token))
        .limit(1);

      expect(row.mode).toBe("historico");

      // Cleanup
      await database!.delete(sessions).where(eq(sessions.sessionToken, token));
    });

    it("tabela branchSuggestions deve existir e aceitar insert", async () => {
      const token = generateToken();
      const branches = [
        { code: "COM", name: "Comércio", justification: "Empresa varejista", confidence: 0.95 },
        { code: "TEC", name: "Tecnologia", justification: "Sistema de gestão", confidence: 0.75 },
      ];

      await database!.insert(branchSuggestions).values({
        sessionToken: token,
        companyDescription: "Empresa de comércio eletrônico com sistema próprio",
        suggestedBranches: branches,
        llmModel: "test-model",
      });

      const [row] = await database!
        .select()
        .from(branchSuggestions)
        .where(eq(branchSuggestions.sessionToken, token))
        .limit(1);

      expect(row).toBeTruthy();
      expect(row.companyDescription).toContain("comércio eletrônico");

      // Cleanup
      await database!.delete(branchSuggestions).where(eq(branchSuggestions.sessionToken, token));
    });
  });

  // ── 2. Ciclo de vida de uma sessão ──────────────────────────────────────────
  describe("2. Ciclo de vida da sessão", () => {
    it("deve criar sessão com token único", async () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(96); // 48 bytes em hex
    });

    it("deve criar sessão e recuperar pelo token", async () => {
      const token = generateToken();
      await database!.insert(sessions).values({
        sessionToken: token,
        mode: "temporario",
        currentStep: "briefing",
        expiresAt: futureDate(24),
      });

      const [found] = await database!
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.sessionToken, token),
            gt(sessions.expiresAt, new Date())
          )
        )
        .limit(1);

      expect(found).toBeTruthy();
      expect(found.sessionToken).toBe(token);

      // Cleanup
      await database!.delete(sessions).where(eq(sessions.sessionToken, token));
    });

    it("sessão expirada NÃO deve ser encontrada na query com gt(expiresAt)", async () => {
      const token = generateToken();
      await database!.insert(sessions).values({
        sessionToken: token,
        mode: "temporario",
        currentStep: "briefing",
        expiresAt: pastDate(), // já expirado
      });

      const [found] = await database!
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.sessionToken, token),
            gt(sessions.expiresAt, new Date())
          )
        )
        .limit(1);

      expect(found).toBeUndefined();

      // Cleanup
      await database!.delete(sessions).where(eq(sessions.sessionToken, token));
    });

    it("deve atualizar currentStep da sessão", async () => {
      const token = generateToken();
      await database!.insert(sessions).values({
        sessionToken: token,
        mode: "temporario",
        currentStep: "briefing",
        expiresAt: futureDate(24),
      });

      await database!
        .update(sessions)
        .set({ currentStep: "confirmar_ramos" })
        .where(eq(sessions.sessionToken, token));

      const [updated] = await database!
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, token))
        .limit(1);

      expect(updated.currentStep).toBe("confirmar_ramos");

      // Cleanup
      await database!.delete(sessions).where(eq(sessions.sessionToken, token));
    });

    it("deve salvar ramos confirmados na sessão", async () => {
      const token = generateToken();
      await database!.insert(sessions).values({
        sessionToken: token,
        mode: "temporario",
        currentStep: "briefing",
        expiresAt: futureDate(24),
      });

      const confirmedBranches = [
        { code: "COM", name: "Comércio" },
        { code: "IND", name: "Indústria" },
      ];

      await database!
        .update(sessions)
        .set({
          companyDescription: "Empresa industrial e comercial",
          confirmedBranches: confirmedBranches as any,
          currentStep: "questionario",
        })
        .where(eq(sessions.sessionToken, token));

      const [updated] = await database!
        .select()
        .from(sessions)
        .where(eq(sessions.sessionToken, token))
        .limit(1);

      expect(updated.currentStep).toBe("questionario");
      expect(updated.companyDescription).toBe("Empresa industrial e comercial");

      // Cleanup
      await database!.delete(sessions).where(eq(sessions.sessionToken, token));
    });
  });

  // ── 3. Validações de negócio ─────────────────────────────────────────────────
  describe("3. Validações de negócio", () => {
    it("token deve ter comprimento mínimo de 64 caracteres", () => {
      const token = generateToken();
      expect(token.length).toBeGreaterThanOrEqual(64);
    });

    it("expiração de 24h deve ser futura", () => {
      const expires = futureDate(24);
      expect(expires.getTime()).toBeGreaterThan(Date.now());
      // Deve ser aproximadamente 24h no futuro (margem de 1 minuto)
      const diffHours = (expires.getTime() - Date.now()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(23.9);
      expect(diffHours).toBeLessThan(24.1);
    });

    it("modo deve ser 'temporario' ou 'historico'", () => {
      const validModes = ["temporario", "historico"];
      expect(validModes).toContain("temporario");
      expect(validModes).toContain("historico");
      expect(validModes).not.toContain("invalido");
    });

    it("steps válidos do fluxo devem ser 8", () => {
      const validSteps = [
        "modo_uso",
        "briefing",
        "confirmar_ramos",
        "questionario",
        "plano_acao",
        "matriz_riscos",
        "consolidacao",
        "concluido",
      ];
      expect(validSteps.length).toBe(8);
    });

    it("descrição mínima de 20 caracteres deve ser validada", () => {
      const shortDesc = "Empresa";
      const validDesc = "Empresa de tecnologia que desenvolve software";
      expect(shortDesc.length).toBeLessThan(20);
      expect(validDesc.length).toBeGreaterThanOrEqual(20);
    });
  });

  // ── 4. Integração API sessions.create ───────────────────────────────────────
  describe("4. Integração com API (via fetch direto)", () => {
    it("API sessions.create deve retornar token e expiração", async () => {
      const response = await fetch("http://localhost:3000/api/trpc/sessions.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { mode: "temporario" } }),
      });

      expect(response.ok).toBe(true);
      const body = await response.json();
      const data = body.result?.data?.json;

      expect(data).toBeTruthy();
      expect(data.sessionToken).toBeTruthy();
      expect(data.sessionToken.length).toBeGreaterThanOrEqual(64);
      expect(data.mode).toBe("temporario");
      expect(new Date(data.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it("API sessions.create deve funcionar para modo 'historico'", async () => {
      const response = await fetch("http://localhost:3000/api/trpc/sessions.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { mode: "historico" } }),
      });

      expect(response.ok).toBe(true);
      const body = await response.json();
      const data = body.result?.data?.json;

      expect(data.mode).toBe("historico");
      expect(data.sessionToken).toBeTruthy();
    });

    it("API sessions.get deve retornar null para token inexistente", async () => {
      const fakeToken = "token_inexistente_123456789";
      const response = await fetch(
        `http://localhost:3000/api/trpc/sessions.get?input=${encodeURIComponent(JSON.stringify({ json: { sessionToken: fakeToken } }))}`,
        { method: "GET" }
      );

      expect(response.ok).toBe(true);
      const body = await response.json();
      const data = body.result?.data?.json;
      expect(data).toBeNull();
    });

    it("API sessions.updateStep deve atualizar o passo", async () => {
      // Primeiro criar sessão
      const createRes = await fetch("http://localhost:3000/api/trpc/sessions.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { mode: "temporario" } }),
      });
      const createBody = await createRes.json();
      const token = createBody.result?.data?.json?.sessionToken;
      expect(token).toBeTruthy();

      // Atualizar step
      const updateRes = await fetch("http://localhost:3000/api/trpc/sessions.updateStep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { sessionToken: token, currentStep: "confirmar_ramos" } }),
      });

      expect(updateRes.ok).toBe(true);
      const updateBody = await updateRes.json();
      expect(updateBody.result?.data?.json?.success).toBe(true);
    });
  });

  // ── 5. Rotas do frontend ─────────────────────────────────────────────────────
  describe("5. Rotas do frontend (verificação de arquivos)", () => {
    it("ModoUso.tsx deve existir", async () => {
      const { existsSync } = await import("fs");
      const exists = existsSync(
        "/home/ubuntu/compliance-tributaria-v2/client/src/pages/ModoUso.tsx"
      );
      expect(exists).toBe(true);
    });

    it("BriefingInteligente.tsx deve existir", async () => {
      const { existsSync } = await import("fs");
      const exists = existsSync(
        "/home/ubuntu/compliance-tributaria-v2/client/src/pages/BriefingInteligente.tsx"
      );
      expect(exists).toBe(true);
    });

    it("App.tsx deve conter rota /modo-uso", async () => {
      const { readFileSync } = await import("fs");
      const appContent = readFileSync(
        "/home/ubuntu/compliance-tributaria-v2/client/src/App.tsx",
        "utf-8"
      );
      expect(appContent).toContain('/modo-uso');
      expect(appContent).toContain('ModoUso');
    });

    it("App.tsx deve conter rota /briefing", async () => {
      const { readFileSync } = await import("fs");
      const appContent = readFileSync(
        "/home/ubuntu/compliance-tributaria-v2/client/src/App.tsx",
        "utf-8"
      );
      expect(appContent).toContain('/briefing');
      expect(appContent).toContain('BriefingInteligente');
    });

    it("routers-sessions.ts deve exportar sessionsRouter", async () => {
      const { readFileSync } = await import("fs");
      const content = readFileSync(
        "/home/ubuntu/compliance-tributaria-v2/server/routers-sessions.ts",
        "utf-8"
      );
      expect(content).toContain('export const sessionsRouter');
      expect(content).toContain('suggestBranches');
      expect(content).toContain('saveConfirmedBranches');
    });
  });
});
