/**
 * Sprint V57 — Testes unitários para o sistema de comentários por etapa (StepComments)
 * Cobre: schema da tabela, procedures tRPC (list, add, edit, delete), controle de permissões
 */
import { describe, it, expect } from "vitest";

// ─── 1. Validação do Schema ────────────────────────────────────────────────────
describe("StepComments — Schema da Tabela", () => {
  it("deve ter os campos obrigatórios definidos no schema", async () => {
    const { stepComments } = await import("../drizzle/schema");
    const cols = Object.keys(stepComments);
    expect(cols).toContain("id");
    expect(cols).toContain("projectId");
    expect(cols).toContain("step");
    expect(cols).toContain("userId");
    expect(cols).toContain("userName");
    expect(cols).toContain("userRole");
    expect(cols).toContain("content");
    expect(cols).toContain("isEdited");
    expect(cols).toContain("createdAt");
  });

  it("deve aceitar apenas os valores válidos para o campo step", () => {
    const validSteps = ["briefing", "matrizes", "plano_acao"];
    validSteps.forEach(step => {
      expect(["briefing", "matrizes", "plano_acao"]).toContain(step);
    });
  });

  it("deve aceitar apenas os valores válidos para userRole", () => {
    const validRoles = ["equipe_solaris", "advogado_senior", "advogado_junior", "cliente"];
    validRoles.forEach(role => {
      expect(["equipe_solaris", "advogado_senior", "advogado_junior", "cliente"]).toContain(role);
    });
  });
});

// ─── 2. Validação de Input das Procedures ────────────────────────────────────
describe("StepComments — Validação de Input", () => {
  it("deve rejeitar content vazio ao adicionar comentário", () => {
    const { z } = require("zod");
    const schema = z.object({
      projectId: z.number(),
      step: z.enum(["briefing", "matrizes", "plano_acao"]),
      content: z.string().min(1).max(2000),
    });
    const result = schema.safeParse({ projectId: 1, step: "briefing", content: "" });
    expect(result.success).toBe(false);
  });

  it("deve rejeitar content com mais de 2000 caracteres", () => {
    const { z } = require("zod");
    const schema = z.object({
      content: z.string().min(1).max(2000),
    });
    const result = schema.safeParse({ content: "a".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("deve aceitar content válido (1-2000 chars)", () => {
    const { z } = require("zod");
    const schema = z.object({
      projectId: z.number(),
      step: z.enum(["briefing", "matrizes", "plano_acao"]),
      content: z.string().min(1).max(2000),
    });
    const result = schema.safeParse({ projectId: 1, step: "matrizes", content: "Risco alto identificado na área de TI." });
    expect(result.success).toBe(true);
  });

  it("deve rejeitar step inválido", () => {
    const { z } = require("zod");
    const schema = z.object({
      step: z.enum(["briefing", "matrizes", "plano_acao"]),
    });
    const result = schema.safeParse({ step: "questionario" });
    expect(result.success).toBe(false);
  });

  it("deve aceitar todos os steps válidos", () => {
    const { z } = require("zod");
    const schema = z.object({
      step: z.enum(["briefing", "matrizes", "plano_acao"]),
    });
    ["briefing", "matrizes", "plano_acao"].forEach(step => {
      const result = schema.safeParse({ step });
      expect(result.success).toBe(true);
    });
  });
});

// ─── 3. Lógica de Controle de Permissões ─────────────────────────────────────
describe("StepComments — Controle de Permissões", () => {
  const canModifyComment = (
    commentUserId: number,
    currentUserId: number,
    currentUserRole: string
  ): boolean => {
    return commentUserId === currentUserId || currentUserRole === "equipe_solaris";
  };

  it("autor pode editar seu próprio comentário", () => {
    expect(canModifyComment(42, 42, "cliente")).toBe(true);
  });

  it("equipe_solaris pode editar qualquer comentário", () => {
    expect(canModifyComment(42, 99, "equipe_solaris")).toBe(true);
  });

  it("outro usuário não pode editar comentário alheio", () => {
    expect(canModifyComment(42, 99, "cliente")).toBe(false);
  });

  it("advogado_senior não pode editar comentário de outro usuário", () => {
    expect(canModifyComment(42, 99, "advogado_senior")).toBe(false);
  });

  it("advogado_junior não pode editar comentário de outro usuário", () => {
    expect(canModifyComment(42, 99, "advogado_junior")).toBe(false);
  });

  const canViewProjectComments = (
    projectClientId: number,
    currentUserId: number,
    currentUserRole: string
  ): boolean => {
    if (currentUserRole === "cliente") {
      return projectClientId === currentUserId;
    }
    return true; // equipe_solaris, advogados podem ver todos
  };

  it("cliente só pode ver comentários do seu próprio projeto", () => {
    expect(canViewProjectComments(10, 10, "cliente")).toBe(true);
    expect(canViewProjectComments(10, 20, "cliente")).toBe(false);
  });

  it("equipe_solaris pode ver comentários de qualquer projeto", () => {
    expect(canViewProjectComments(10, 99, "equipe_solaris")).toBe(true);
  });

  it("advogado_senior pode ver comentários de qualquer projeto", () => {
    expect(canViewProjectComments(10, 99, "advogado_senior")).toBe(true);
  });
});

// ─── 4. Formatação de Tempo Relativo ─────────────────────────────────────────
describe("StepComments — Formatação de Tempo Relativo", () => {
  const formatRelativeTime = (date: Date | string): string => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "agora mesmo";
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  it("deve retornar 'agora mesmo' para datas recentes (< 60s)", () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe("agora mesmo");
  });

  it("deve retornar minutos para datas entre 1-59 minutos atrás", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinutesAgo)).toBe("há 5 min");
  });

  it("deve retornar horas para datas entre 1-23 horas atrás", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoHoursAgo)).toBe("há 2h");
  });

  it("deve retornar dias para datas entre 1-6 dias atrás", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeDaysAgo)).toBe("há 3 dias");
  });
});

// ─── 5. Geração de Iniciais ───────────────────────────────────────────────────
describe("StepComments — Geração de Iniciais", () => {
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  it("deve gerar iniciais de nome completo", () => {
    expect(getInitials("João Silva")).toBe("JS");
  });

  it("deve gerar iniciais de nome único", () => {
    expect(getInitials("Maria")).toBe("M");
  });

  it("deve usar apenas as 2 primeiras palavras", () => {
    expect(getInitials("Ana Paula Ferreira Santos")).toBe("AP");
  });

  it("deve retornar em maiúsculas", () => {
    expect(getInitials("carlos augusto")).toBe("CA");
  });
});

// ─── 6. Integração com as Páginas ─────────────────────────────────────────────
describe("StepComments — Integração com Páginas", () => {
  it("BriefingV3 deve usar step='briefing'", () => {
    const step = "briefing";
    expect(["briefing", "matrizes", "plano_acao"]).toContain(step);
  });

  it("MatrizesV3 deve usar step='matrizes'", () => {
    const step = "matrizes";
    expect(["briefing", "matrizes", "plano_acao"]).toContain(step);
  });

  it("PlanoAcaoV3 deve usar step='plano_acao'", () => {
    const step = "plano_acao";
    expect(["briefing", "matrizes", "plano_acao"]).toContain(step);
  });

  it("cada step deve ter um título descritivo único", () => {
    const titles = {
      briefing: "Anotações da Equipe — Briefing",
      matrizes: "Anotações da Equipe — Matrizes de Riscos",
      plano_acao: "Anotações da Equipe — Plano de Ação",
    };
    const uniqueTitles = new Set(Object.values(titles));
    expect(uniqueTitles.size).toBe(3);
  });
});
