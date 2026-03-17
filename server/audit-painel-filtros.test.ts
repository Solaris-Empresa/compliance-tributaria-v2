/**
 * Testes unitários e funcionais — Filtros do Painel
 * Cobre: matchesFilter, filterCount, busca por nome, estado vazio, chips de filtro
 */
import { describe, it, expect } from "vitest";

// ─── Lógica de filtro extraída do Painel.tsx ────────────────────────────────

type FilterKey = "all" | "em_andamento" | "em_avaliacao" | "aprovado" | "rascunho";

const EM_ANDAMENTO_STATUSES = [
  "assessment_fase1", "assessment_fase2", "briefing", "matriz_riscos", "plano_acao",
  "questionario", "etapa1", "etapa2", "etapa3", "etapa4", "etapa5",
];

function matchesFilter(project: { status: string }, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "em_andamento") return EM_ANDAMENTO_STATUSES.includes(project.status);
  if (filter === "em_avaliacao") return project.status === "em_avaliacao";
  if (filter === "aprovado") return project.status === "aprovado" || project.status === "concluido";
  if (filter === "rascunho") return project.status === "rascunho" || project.status === "draft";
  return true;
}

function filterCount(projects: { status: string }[], key: FilterKey): number {
  return projects.filter(p => matchesFilter(p, key)).length;
}

function filterBySearch(projects: { name: string }[], search: string): { name: string }[] {
  if (!search) return projects;
  return projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockProjects = [
  { id: 1, name: "Projeto Alpha",   status: "assessment_fase1" },
  { id: 2, name: "Projeto Beta",    status: "briefing" },
  { id: 3, name: "Projeto Gamma",   status: "em_avaliacao" },
  { id: 4, name: "Projeto Delta",   status: "aprovado" },
  { id: 5, name: "Projeto Epsilon", status: "concluido" },
  { id: 6, name: "Projeto Zeta",    status: "rascunho" },
  { id: 7, name: "Projeto Eta",     status: "draft" },
  { id: 8, name: "Projeto Theta",   status: "plano_acao" },
  { id: 9, name: "Projeto Iota",    status: "matriz_riscos" },
];

// ─── Testes: matchesFilter ────────────────────────────────────────────────────

describe("matchesFilter", () => {
  it("all — retorna todos os projetos", () => {
    const result = mockProjects.filter(p => matchesFilter(p, "all"));
    expect(result).toHaveLength(9);
  });

  it("em_andamento — retorna apenas projetos em etapas ativas", () => {
    const result = mockProjects.filter(p => matchesFilter(p, "em_andamento"));
    expect(result.map(p => p.name)).toEqual([
      "Projeto Alpha",   // assessment_fase1
      "Projeto Beta",    // briefing
      "Projeto Theta",   // plano_acao
      "Projeto Iota",    // matriz_riscos
    ]);
  });

  it("em_avaliacao — retorna apenas projetos com status em_avaliacao", () => {
    const result = mockProjects.filter(p => matchesFilter(p, "em_avaliacao"));
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Projeto Gamma");
  });

  it("aprovado — retorna projetos com status aprovado ou concluido", () => {
    const result = mockProjects.filter(p => matchesFilter(p, "aprovado"));
    expect(result).toHaveLength(2);
    expect(result.map(p => p.name)).toContain("Projeto Delta");
    expect(result.map(p => p.name)).toContain("Projeto Epsilon");
  });

  it("rascunho — retorna projetos com status rascunho ou draft", () => {
    const result = mockProjects.filter(p => matchesFilter(p, "rascunho"));
    expect(result).toHaveLength(2);
    expect(result.map(p => p.name)).toContain("Projeto Zeta");
    expect(result.map(p => p.name)).toContain("Projeto Eta");
  });

  it("não retorna projetos de outra categoria no filtro em_andamento", () => {
    const result = mockProjects.filter(p => matchesFilter(p, "em_andamento"));
    const names = result.map(p => p.name);
    expect(names).not.toContain("Projeto Gamma");   // em_avaliacao
    expect(names).not.toContain("Projeto Delta");   // aprovado
    expect(names).not.toContain("Projeto Zeta");    // rascunho
  });

  it("não retorna projetos em_andamento no filtro aprovado", () => {
    const result = mockProjects.filter(p => matchesFilter(p, "aprovado"));
    const names = result.map(p => p.name);
    expect(names).not.toContain("Projeto Alpha");
    expect(names).not.toContain("Projeto Beta");
  });
});

// ─── Testes: filterCount ─────────────────────────────────────────────────────

describe("filterCount", () => {
  it("all — conta todos os 9 projetos", () => {
    expect(filterCount(mockProjects, "all")).toBe(9);
  });

  it("em_andamento — conta 4 projetos", () => {
    expect(filterCount(mockProjects, "em_andamento")).toBe(4);
  });

  it("em_avaliacao — conta 1 projeto", () => {
    expect(filterCount(mockProjects, "em_avaliacao")).toBe(1);
  });

  it("aprovado — conta 2 projetos", () => {
    expect(filterCount(mockProjects, "aprovado")).toBe(2);
  });

  it("rascunho — conta 2 projetos", () => {
    expect(filterCount(mockProjects, "rascunho")).toBe(2);
  });

  it("soma de todas as categorias exclusivas é igual ao total", () => {
    const emAndamento = filterCount(mockProjects, "em_andamento");
    const emAvaliacao = filterCount(mockProjects, "em_avaliacao");
    const aprovado    = filterCount(mockProjects, "aprovado");
    const rascunho    = filterCount(mockProjects, "rascunho");
    expect(emAndamento + emAvaliacao + aprovado + rascunho).toBe(9);
  });
});

// ─── Testes: busca por nome ───────────────────────────────────────────────────

describe("filterBySearch", () => {
  it("busca vazia retorna todos os projetos", () => {
    expect(filterBySearch(mockProjects, "")).toHaveLength(9);
  });

  it("busca case-insensitive por nome parcial", () => {
    const result = filterBySearch(mockProjects, "alpha");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Projeto Alpha");
  });

  it("busca por prefixo 'Projeto' retorna todos", () => {
    const result = filterBySearch(mockProjects, "Projeto");
    expect(result).toHaveLength(9);
  });

  it("busca sem correspondência retorna lista vazia", () => {
    const result = filterBySearch(mockProjects, "XYZ_inexistente");
    expect(result).toHaveLength(0);
  });

  it("busca por substring do meio do nome", () => {
    const result = filterBySearch(mockProjects, "elt");  // "Delta"
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Projeto Delta");
  });
});

// ─── Testes: combinação filtro + busca ───────────────────────────────────────

describe("filtro + busca combinados", () => {
  it("filtro em_andamento + busca 'Alpha' retorna 1 projeto", () => {
    const byFilter = mockProjects.filter(p => matchesFilter(p, "em_andamento"));
    const result   = filterBySearch(byFilter, "Alpha");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Projeto Alpha");
  });

  it("filtro em_andamento + busca 'Gamma' retorna 0 (Gamma não é em_andamento)", () => {
    const byFilter = mockProjects.filter(p => matchesFilter(p, "em_andamento"));
    const result   = filterBySearch(byFilter, "Gamma");
    expect(result).toHaveLength(0);
  });

  it("filtro aprovado + busca 'Delta' retorna 1 projeto", () => {
    const byFilter = mockProjects.filter(p => matchesFilter(p, "aprovado"));
    const result   = filterBySearch(byFilter, "Delta");
    expect(result).toHaveLength(1);
  });

  it("filtro all + busca 'Projeto' retorna todos os 9", () => {
    const byFilter = mockProjects.filter(p => matchesFilter(p, "all"));
    const result   = filterBySearch(byFilter, "Projeto");
    expect(result).toHaveLength(9);
  });
});

// ─── Testes: estado vazio ─────────────────────────────────────────────────────

describe("estado vazio", () => {
  it("lista vazia com filtro all retorna 0", () => {
    expect(filterCount([], "all")).toBe(0);
  });

  it("lista vazia com busca retorna 0", () => {
    expect(filterBySearch([], "Alpha")).toHaveLength(0);
  });

  it("projeto com status desconhecido não aparece em nenhuma categoria exclusiva", () => {
    const unknownProject = [{ id: 99, name: "Projeto X", status: "status_desconhecido" }];
    expect(filterCount(unknownProject, "em_andamento")).toBe(0);
    expect(filterCount(unknownProject, "em_avaliacao")).toBe(0);
    expect(filterCount(unknownProject, "aprovado")).toBe(0);
    expect(filterCount(unknownProject, "rascunho")).toBe(0);
    expect(filterCount(unknownProject, "all")).toBe(1); // aparece só no "Todos"
  });
});

// ─── Testes: chips de filtro (configuração) ───────────────────────────────────

describe("chips de filtro — configuração", () => {
  const FILTER_CHIPS = [
    { key: "all" as FilterKey,          label: "Todos" },
    { key: "em_andamento" as FilterKey, label: "Em Andamento" },
    { key: "em_avaliacao" as FilterKey, label: "Aguardando Aprovação" },
    { key: "aprovado" as FilterKey,     label: "Aprovados" },
    { key: "rascunho" as FilterKey,     label: "Rascunho" },
  ];

  it("existem 5 chips de filtro", () => {
    expect(FILTER_CHIPS).toHaveLength(5);
  });

  it("todos os chips têm key e label definidos", () => {
    FILTER_CHIPS.forEach(chip => {
      expect(chip.key).toBeTruthy();
      expect(chip.label).toBeTruthy();
    });
  });

  it("o primeiro chip é 'all'", () => {
    expect(FILTER_CHIPS[0].key).toBe("all");
  });

  it("cada key é única", () => {
    const keys = FILTER_CHIPS.map(c => c.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(FILTER_CHIPS.length);
  });
});
