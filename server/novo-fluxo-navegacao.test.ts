/**
 * novo-fluxo-navegacao.test.ts
 * Sprint V43 — Testes de Navegação Guiada do Fluxo v2.0
 *
 * Valida que o FluxoStepper está presente nas páginas corretas,
 * que o hook useFluxoSession centraliza o acesso ao sessionToken,
 * e que a navegação entre telas está corretamente configurada.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const pagesDir = path.join(__dirname, "../client/src/pages");
const componentsDir = path.join(__dirname, "../client/src/components");
const hooksDir = path.join(__dirname, "../client/src/hooks");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readPage(name: string): string {
  return fs.readFileSync(path.join(pagesDir, name), "utf-8");
}

function readComponent(name: string): string {
  return fs.readFileSync(path.join(componentsDir, name), "utf-8");
}

function readHook(name: string): string {
  return fs.readFileSync(path.join(hooksDir, name), "utf-8");
}

// ─── Testes: FluxoStepper Component ──────────────────────────────────────────

describe("FluxoStepper Component", () => {
  it("deve existir o componente FluxoStepper", () => {
    const exists = fs.existsSync(path.join(componentsDir, "FluxoStepper.tsx"));
    expect(exists).toBe(true);
  });

  it("deve exportar FluxoStepper como named export", () => {
    const content = readComponent("FluxoStepper.tsx");
    expect(content).toContain("export function FluxoStepper");
  });

  it("deve definir todos os 6 passos do fluxo v2.0", () => {
    const content = readComponent("FluxoStepper.tsx");
    expect(content).toContain("modo-uso");
    expect(content).toContain("briefing");
    expect(content).toContain("questionario");
    expect(content).toContain("plano-acao");
    expect(content).toContain("consolidacao");
  });

  it("deve aceitar prop 'current' para indicar passo ativo", () => {
    const content = readComponent("FluxoStepper.tsx");
    expect(content).toContain("current:");
  });

  it("deve aceitar prop 'className' para customização", () => {
    const content = readComponent("FluxoStepper.tsx");
    expect(content).toContain("className");
  });
});

// ─── Testes: useFluxoSession Hook ─────────────────────────────────────────────

describe("useFluxoSession Hook", () => {
  it("deve existir o hook useFluxoSession", () => {
    const exists = fs.existsSync(path.join(hooksDir, "useFluxoSession.ts"));
    expect(exists).toBe(true);
  });

  it("deve exportar useFluxoSession como default ou named export", () => {
    const content = readHook("useFluxoSession.ts");
    expect(content).toMatch(/export (default function|function|const) useFluxoSession/);
  });

  it("deve centralizar acesso ao sessionToken via sessionStorage", () => {
    const content = readHook("useFluxoSession.ts");
    expect(content).toContain("sessionStorage");
    expect(content).toContain("sessionToken");
  });

  it("deve expor função para salvar sessionToken", () => {
    const content = readHook("useFluxoSession.ts");
    expect(content).toMatch(/save.*[Ss]ession|set.*[Ss]ession|store.*[Ss]ession/);
  });

  it("deve expor ramos confirmados", () => {
    const content = readHook("useFluxoSession.ts");
    expect(content).toContain("confirmedBranches");
  });
});

// ─── Testes: Navegação em ModoUso ─────────────────────────────────────────────

describe("ModoUso.tsx — Navegação", () => {
  it("deve importar FluxoStepper", () => {
    const content = readPage("ModoUso.tsx");
    expect(content).toContain("FluxoStepper");
  });

  it("deve navegar para /briefing ao escolher modo", () => {
    const content = readPage("ModoUso.tsx");
    expect(content).toContain("/briefing");
  });

  it("deve criar sessão antes de navegar", () => {
    const content = readPage("ModoUso.tsx");
    expect(content).toMatch(/sessions\.create|createSession|create.*session/i);
  });
});

// ─── Testes: Navegação em BriefingInteligente ────────────────────────────────

describe("BriefingInteligente.tsx — Navegação", () => {
  it("deve importar FluxoStepper", () => {
    const content = readPage("BriefingInteligente.tsx");
    expect(content).toContain("FluxoStepper");
  });

  it("deve navegar para /questionario-ramos após confirmar ramos", () => {
    const content = readPage("BriefingInteligente.tsx");
    expect(content).toContain("/questionario-ramos");
  });

  it("deve usar sessions.suggestBranches para sugestão de IA", () => {
    const content = readPage("BriefingInteligente.tsx");
    expect(content).toMatch(/suggestBranches|suggest.*[Bb]ranch/);
  });
});

// ─── Testes: Navegação em QuestionarioRamos ───────────────────────────────────

describe("QuestionarioRamos.tsx — Navegação", () => {
  it("deve importar FluxoStepper", () => {
    const content = readPage("QuestionarioRamos.tsx");
    expect(content).toContain("FluxoStepper");
  });

  it("deve usar FluxoStepper com current='questionario'", () => {
    const content = readPage("QuestionarioRamos.tsx");
    expect(content).toContain('current="questionario"');
  });

  it("deve navegar para /plano-acao-session ao concluir todos os ramos", () => {
    const content = readPage("QuestionarioRamos.tsx");
    expect(content).toContain("/plano-acao-session");
  });

  it("deve passar sessionToken como query param na navegação", () => {
    const content = readPage("QuestionarioRamos.tsx");
    expect(content).toMatch(/session=.*sessionToken|\?session=/);
  });
});

// ─── Testes: Navegação em PlanoAcaoSession ────────────────────────────────────

describe("PlanoAcaoSession.tsx — Navegação", () => {
  it("deve importar FluxoStepper", () => {
    const content = readPage("PlanoAcaoSession.tsx");
    expect(content).toContain("FluxoStepper");
  });

  it("deve usar FluxoStepper com current='plano-acao'", () => {
    const content = readPage("PlanoAcaoSession.tsx");
    expect(content).toContain('current="plano-acao"');
  });

  it("deve ter botão para navegar para /matriz-riscos-session", () => {
    const content = readPage("PlanoAcaoSession.tsx");
    expect(content).toContain("/matriz-riscos-session");
  });

  it("deve ter botão para navegar para /consolidacao", () => {
    const content = readPage("PlanoAcaoSession.tsx");
    expect(content).toContain("/consolidacao");
  });
});

// ─── Testes: Navegação em MatrizRiscosSession ─────────────────────────────────

describe("MatrizRiscosSession.tsx — Navegação", () => {
  it("deve importar FluxoStepper", () => {
    const content = readPage("MatrizRiscosSession.tsx");
    expect(content).toContain("FluxoStepper");
  });

  it("deve usar FluxoStepper com current='matriz-riscos'", () => {
    const content = readPage("MatrizRiscosSession.tsx");
    expect(content).toContain('current="matriz-riscos"');
  });

  it("deve ter botão voltar para /plano-acao-session", () => {
    const content = readPage("MatrizRiscosSession.tsx");
    expect(content).toContain("/plano-acao-session");
  });

  it("deve ter botão avançar para /consolidacao", () => {
    const content = readPage("MatrizRiscosSession.tsx");
    expect(content).toContain("/consolidacao");
  });
});

// ─── Testes: Navegação em Consolidacao ───────────────────────────────────────

describe("Consolidacao.tsx — Navegação", () => {
  it("deve importar FluxoStepper", () => {
    const content = readPage("Consolidacao.tsx");
    expect(content).toContain("FluxoStepper");
  });

  it("deve usar FluxoStepper com current='consolidacao'", () => {
    const content = readPage("Consolidacao.tsx");
    expect(content).toContain('current="consolidacao"');
  });

  it("deve ter opção de salvar no histórico", () => {
    const content = readPage("Consolidacao.tsx");
    expect(content).toMatch(/salvar.*hist|saveToHistory|save.*hist/i);
  });

  it("deve ter opção de exportar dados", () => {
    const content = readPage("Consolidacao.tsx");
    expect(content).toMatch(/export|Export|CSV|JSON/);
  });
});

// ─── Testes: App.tsx — Rotas Registradas ─────────────────────────────────────

describe("App.tsx — Rotas do Fluxo v2.0", () => {
  const appContent = fs.readFileSync(
    path.join(__dirname, "../client/src/App.tsx"),
    "utf-8"
  );

  it("deve ter rota /modo-uso registrada", () => {
    expect(appContent).toContain("/modo-uso");
  });

  it("deve ter rota /briefing registrada", () => {
    expect(appContent).toContain("/briefing");
  });

  it("deve ter rota /questionario-ramos registrada", () => {
    expect(appContent).toContain("/questionario-ramos");
  });

  it("deve ter rota /plano-acao-session registrada", () => {
    expect(appContent).toContain("/plano-acao-session");
  });

  it("deve ter rota /matriz-riscos-session registrada", () => {
    expect(appContent).toContain("/matriz-riscos-session");
  });

  it("deve ter rota /consolidacao registrada", () => {
    expect(appContent).toContain("/consolidacao");
  });
});
