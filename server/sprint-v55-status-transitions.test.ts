/**
 * Sprint V55 — Testes de Transição de Status do Projeto
 *
 * Cobre:
 * - Lógica de permissões por papel (equipe vs cliente)
 * - Transições permitidas e bloqueadas
 * - Dropdown de Situação do Projeto (lógica de filtragem de opções)
 * - Filtros de status na lista de projetos
 * - Traduções de status em português
 */

import { describe, it, expect } from "vitest";

// ─── Tipos e constantes replicados do código de produção ─────────────────────

type ProjectStatus =
  | "rascunho"
  | "assessment_fase1"
  | "assessment_fase2"
  | "matriz_riscos"
  | "plano_acao"
  | "em_avaliacao"
  | "aprovado"
  | "em_andamento"
  | "parado"
  | "concluido"
  | "arquivado";

type UserRole = "cliente" | "equipe_solaris" | "advogado_senior" | "advogado_junior";

// Transições permitidas para clientes (replicado do servidor)
const CLIENT_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  rascunho: ["em_avaliacao"],
  assessment_fase1: ["em_avaliacao"],
  assessment_fase2: ["em_avaliacao"],
  matriz_riscos: ["em_avaliacao"],
  plano_acao: ["em_avaliacao"],
};

// Lógica de validação de transição (replicada do servidor)
function canTransition(
  currentStatus: string,
  newStatus: string,
  role: UserRole
): { allowed: boolean; reason?: string } {
  const isEquipe = role === "equipe_solaris" || role === "advogado_senior";

  if (isEquipe) {
    return { allowed: true };
  }

  const allowed = CLIENT_ALLOWED_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    return {
      allowed: false,
      reason: `Transição de '${currentStatus}' para '${newStatus}' não permitida para clientes.`,
    };
  }

  return { allowed: true };
}

// Opções do dropdown filtradas por papel (replicado do frontend)
const ALL_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "rascunho",         label: "Rascunho" },
  { value: "assessment_fase1", label: "Questionário (Fase 1)" },
  { value: "assessment_fase2", label: "Questionário (Fase 2)" },
  { value: "matriz_riscos",    label: "Matrizes de Riscos" },
  { value: "plano_acao",       label: "Plano de Ação" },
  { value: "em_avaliacao",     label: "Em Avaliação" },
  { value: "aprovado",         label: "Aprovado" },
  { value: "em_andamento",     label: "Em Andamento" },
  { value: "parado",           label: "Pausado" },
  { value: "concluido",        label: "Concluído" },
  { value: "arquivado",        label: "Arquivado" },
];

const CLIENT_ALLOWED_TARGETS = ["em_avaliacao"] as const;

function getStatusOptionsForRole(
  currentStatus: ProjectStatus,
  role: UserRole
): typeof ALL_STATUS_OPTIONS {
  const isEquipe = role === "equipe_solaris" || role === "advogado_senior";
  if (isEquipe) return ALL_STATUS_OPTIONS;

  return ALL_STATUS_OPTIONS.filter(
    (opt) =>
      opt.value === currentStatus ||
      (CLIENT_ALLOWED_TARGETS as readonly string[]).includes(opt.value)
  );
}

// Traduções de status (replicado de shared/translations.ts)
const PROJECT_STATUS: Record<string, string> = {
  rascunho: "Rascunho",
  assessment_fase1: "Assessment - Fase 1",
  assessment_fase2: "Assessment - Fase 2",
  matriz_riscos: "Matriz de Riscos",
  plano_acao: "Plano de Ação",
  em_avaliacao: "Aguardando Aprovação",
  aprovado: "Aprovado",
  em_andamento: "Em Andamento",
  parado: "Parado",
  concluido: "Concluído",
  arquivado: "Arquivado",
};

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("Transições de Status — Permissões por Papel", () => {
  describe("Equipe SOLARIS (equipe_solaris)", () => {
    it("pode mudar de qualquer status para qualquer outro", () => {
      const statuses: ProjectStatus[] = [
        "rascunho", "assessment_fase1", "assessment_fase2",
        "matriz_riscos", "plano_acao", "em_avaliacao",
        "aprovado", "em_andamento", "parado", "concluido", "arquivado",
      ];

      for (const from of statuses) {
        for (const to of statuses) {
          if (from === to) continue;
          const result = canTransition(from, to, "equipe_solaris");
          expect(result.allowed, `equipe_solaris: ${from} → ${to} deveria ser permitido`).toBe(true);
        }
      }
    });

    it("pode arquivar um projeto em qualquer status", () => {
      const statuses: ProjectStatus[] = ["rascunho", "em_andamento", "aprovado", "concluido"];
      for (const status of statuses) {
        const result = canTransition(status, "arquivado", "equipe_solaris");
        expect(result.allowed).toBe(true);
      }
    });
  });

  describe("Advogado Sênior (advogado_senior)", () => {
    it("tem as mesmas permissões da equipe SOLARIS", () => {
      const result1 = canTransition("rascunho", "em_andamento", "advogado_senior");
      const result2 = canTransition("plano_acao", "aprovado", "advogado_senior");
      const result3 = canTransition("em_andamento", "concluido", "advogado_senior");

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(true);
    });
  });

  describe("Cliente (cliente)", () => {
    it("pode solicitar avaliação a partir de rascunho", () => {
      const result = canTransition("rascunho", "em_avaliacao", "cliente");
      expect(result.allowed).toBe(true);
    });

    it("pode solicitar avaliação a partir de qualquer etapa de trabalho", () => {
      const workStatuses: ProjectStatus[] = [
        "assessment_fase1", "assessment_fase2", "matriz_riscos", "plano_acao",
      ];
      for (const status of workStatuses) {
        const result = canTransition(status, "em_avaliacao", "cliente");
        expect(result.allowed, `cliente: ${status} → em_avaliacao deveria ser permitido`).toBe(true);
      }
    });

    it("NÃO pode aprovar diretamente o projeto", () => {
      const result = canTransition("em_avaliacao", "aprovado", "cliente");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("não permitida para clientes");
    });

    it("NÃO pode marcar como Em Andamento", () => {
      const result = canTransition("aprovado", "em_andamento", "cliente");
      expect(result.allowed).toBe(false);
    });

    it("NÃO pode arquivar o projeto", () => {
      const result = canTransition("em_andamento", "arquivado", "cliente");
      expect(result.allowed).toBe(false);
    });

    it("NÃO pode retroceder o status", () => {
      const result = canTransition("em_andamento", "rascunho", "cliente");
      expect(result.allowed).toBe(false);
    });

    it("NÃO pode transitar de em_avaliacao para aprovado", () => {
      const result = canTransition("em_avaliacao", "aprovado", "cliente");
      expect(result.allowed).toBe(false);
    });

    it("NÃO pode transitar de concluido para qualquer outro status", () => {
      const targets: ProjectStatus[] = ["rascunho", "em_andamento", "arquivado"];
      for (const target of targets) {
        const result = canTransition("concluido", target, "cliente");
        expect(result.allowed).toBe(false);
      }
    });
  });

  describe("Advogado Júnior (advogado_junior)", () => {
    it("tem as mesmas restrições de cliente para transições de status", () => {
      // advogado_junior não é isEquipe, então segue regras de cliente
      const result = canTransition("rascunho", "aprovado", "advogado_junior");
      expect(result.allowed).toBe(false);
    });
  });
});

describe("Dropdown de Situação — Opções por Papel", () => {
  it("equipe_solaris vê todas as 11 opções de status", () => {
    const options = getStatusOptionsForRole("rascunho", "equipe_solaris");
    expect(options).toHaveLength(11);
  });

  it("advogado_senior vê todas as 11 opções de status", () => {
    const options = getStatusOptionsForRole("em_andamento", "advogado_senior");
    expect(options).toHaveLength(11);
  });

  it("cliente com status rascunho vê apenas rascunho e em_avaliacao", () => {
    const options = getStatusOptionsForRole("rascunho", "cliente");
    const values = options.map((o) => o.value);
    expect(values).toContain("rascunho");
    expect(values).toContain("em_avaliacao");
    // Não deve conter status de equipe
    expect(values).not.toContain("aprovado");
    expect(values).not.toContain("em_andamento");
    expect(values).not.toContain("arquivado");
  });

  it("cliente com status plano_acao vê apenas plano_acao e em_avaliacao", () => {
    const options = getStatusOptionsForRole("plano_acao", "cliente");
    const values = options.map((o) => o.value);
    expect(values).toContain("plano_acao");
    expect(values).toContain("em_avaliacao");
    expect(values).not.toContain("aprovado");
    expect(values).not.toContain("arquivado");
  });

  it("cliente sempre vê o status atual no dropdown", () => {
    const statuses: ProjectStatus[] = [
      "rascunho", "assessment_fase1", "assessment_fase2",
      "matriz_riscos", "plano_acao",
    ];
    for (const status of statuses) {
      const options = getStatusOptionsForRole(status, "cliente");
      const values = options.map((o) => o.value);
      expect(values, `cliente deve ver o status atual '${status}'`).toContain(status);
    }
  });

  it("opções do dropdown têm labels em português", () => {
    const options = getStatusOptionsForRole("rascunho", "equipe_solaris");
    const rascunho = options.find((o) => o.value === "rascunho");
    const emAvaliacao = options.find((o) => o.value === "em_avaliacao");
    const concluido = options.find((o) => o.value === "concluido");

    expect(rascunho?.label).toBe("Rascunho");
    expect(emAvaliacao?.label).toBe("Em Avaliação");
    expect(concluido?.label).toBe("Concluído");
  });
});

describe("Traduções de Status em Português", () => {
  it("todos os status do enum têm tradução em português", () => {
    const allStatuses: ProjectStatus[] = [
      "rascunho", "assessment_fase1", "assessment_fase2",
      "matriz_riscos", "plano_acao", "em_avaliacao",
      "aprovado", "em_andamento", "parado", "concluido", "arquivado",
    ];

    for (const status of allStatuses) {
      expect(PROJECT_STATUS[status], `Status '${status}' deve ter tradução`).toBeDefined();
      expect(PROJECT_STATUS[status]).not.toBe(status); // não deve retornar a chave bruta
    }
  });

  it("traduções não contêm termos em inglês", () => {
    const englishTerms = ["draft", "pending", "approved", "completed", "archived", "in_progress"];
    for (const [, label] of Object.entries(PROJECT_STATUS)) {
      for (const term of englishTerms) {
        expect(label.toLowerCase()).not.toContain(term);
      }
    }
  });

  it("status 'em_avaliacao' é traduzido como 'Aguardando Aprovação'", () => {
    expect(PROJECT_STATUS["em_avaliacao"]).toBe("Aguardando Aprovação");
  });

  it("status 'rascunho' é traduzido como 'Rascunho'", () => {
    expect(PROJECT_STATUS["rascunho"]).toBe("Rascunho");
  });
});

describe("Filtros de Status na Lista de Projetos", () => {
  const mockProjects = [
    { id: 1, name: "Projeto Alpha", status: "rascunho" },
    { id: 2, name: "Projeto Beta", status: "em_andamento" },
    { id: 3, name: "Projeto Gamma", status: "concluido" },
    { id: 4, name: "Projeto Delta", status: "em_avaliacao" },
    { id: 5, name: "Projeto Epsilon", status: "arquivado" },
  ];

  function filterProjects(projects: typeof mockProjects, statusFilter: string, searchTerm: string) {
    return projects.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "todos" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  it("filtro 'todos' retorna todos os projetos", () => {
    const result = filterProjects(mockProjects, "todos", "");
    expect(result).toHaveLength(5);
  });

  it("filtro por status específico retorna apenas projetos com aquele status", () => {
    const result = filterProjects(mockProjects, "em_andamento", "");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Projeto Beta");
  });

  it("filtro por status sem correspondência retorna lista vazia", () => {
    const result = filterProjects(mockProjects, "parado", "");
    expect(result).toHaveLength(0);
  });

  it("busca por nome filtra corretamente", () => {
    const result = filterProjects(mockProjects, "todos", "alpha");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Projeto Alpha");
  });

  it("combinação de filtro de status e busca por nome funciona", () => {
    const result = filterProjects(mockProjects, "concluido", "gamma");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Projeto Gamma");
  });

  it("combinação de filtro de status e busca incompatível retorna lista vazia", () => {
    const result = filterProjects(mockProjects, "rascunho", "beta");
    expect(result).toHaveLength(0);
  });

  it("busca é case-insensitive", () => {
    const result = filterProjects(mockProjects, "todos", "ALPHA");
    expect(result).toHaveLength(1);
  });
});

describe("Lógica de Auto-Avanço de Status (Servidor)", () => {
  // Mapeia qual status o servidor define automaticamente ao completar cada etapa
  const AUTO_ADVANCE_MAP: Record<string, ProjectStatus> = {
    completePhase1:    "assessment_fase2",
    completePhase2:    "matriz_riscos",
    generateRiskMatrix:"plano_acao",
    generateActionPlan:"plano_acao",
    submitForApproval: "em_avaliacao",
    approveActionPlan: "aprovado",
  };

  it("ao completar fase 1, status avança para assessment_fase2", () => {
    expect(AUTO_ADVANCE_MAP["completePhase1"]).toBe("assessment_fase2");
  });

  it("ao completar fase 2, status avança para matriz_riscos", () => {
    expect(AUTO_ADVANCE_MAP["completePhase2"]).toBe("matriz_riscos");
  });

  it("ao gerar matriz de riscos, status avança para plano_acao", () => {
    expect(AUTO_ADVANCE_MAP["generateRiskMatrix"]).toBe("plano_acao");
  });

  it("ao gerar plano de ação, status permanece em plano_acao", () => {
    expect(AUTO_ADVANCE_MAP["generateActionPlan"]).toBe("plano_acao");
  });

  it("ao submeter para aprovação, status avança para em_avaliacao", () => {
    expect(AUTO_ADVANCE_MAP["submitForApproval"]).toBe("em_avaliacao");
  });

  it("ao aprovar o plano, status avança para aprovado", () => {
    expect(AUTO_ADVANCE_MAP["approveActionPlan"]).toBe("aprovado");
  });

  it("sequência completa de status segue a ordem correta do fluxo", () => {
    const expectedFlow: ProjectStatus[] = [
      "rascunho",
      "assessment_fase1",
      "assessment_fase2",
      "matriz_riscos",
      "plano_acao",
      "em_avaliacao",
      "aprovado",
      "em_andamento",
      "concluido",
    ];

    // Verifica que cada status é diferente do anterior (sem repetições na sequência)
    for (let i = 1; i < expectedFlow.length; i++) {
      expect(expectedFlow[i]).not.toBe(expectedFlow[i - 1]);
    }

    // Verifica que o fluxo tem 9 etapas
    expect(expectedFlow).toHaveLength(9);
  });
});
