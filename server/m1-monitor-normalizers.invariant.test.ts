/**
 * m1-monitor-normalizers.invariant.test.ts — PR-J Fase 2b (atualizado)
 *
 * Pós-extract: aponta para server/lib/archetype/seedNormalizers.ts (única fonte).
 *
 * Mudanças vs Fase 2a:
 *   - Removido teste "equivalência cross-file" (trivializado — só 1 arquivo agora)
 *   - Existência das constantes valida módulo extraído + import nos callers
 *   - Snapshots literais regenerados contra seedNormalizers.ts
 *   - Conteúdo canonical via regex preservado
 *
 * Vinculadas:
 *   - PR #892 Fase 1 (gap m1-monitor identificado)
 *   - PR #893 Fase 2a (snapshots de comportamento como gate)
 *   - Fase 2b refactor (extract para seedNormalizers.ts)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  TAX_REGIME_ALIASES,
  SNAKE_TO_LABEL,
  POSICAO_ALIASES,
  NATUREZA_TO_FONTES,
} from "./lib/archetype/seedNormalizers";

const NORMALIZERS_PATH = join(__dirname, "lib", "archetype", "seedNormalizers.ts");
const PERFIL_PATH = join(__dirname, "routers", "perfil.ts");
const MONITOR_PATH = join(__dirname, "routers-m1-monitor.ts");

const normalizersSrc = readFileSync(NORMALIZERS_PATH, "utf8");
const perfilSrc = readFileSync(PERFIL_PATH, "utf8");
const monitorSrc = readFileSync(MONITOR_PATH, "utf8");

/** Extrai o body literal `{...}` que segue uma declaração `const NAME: Record<string, string> = ` ou `export const ...` */
function extractConstBody(src: string, name: string): string | null {
  const re = new RegExp(
    `(?:export\\s+)?const\\s+${name}\\s*:\\s*Record<string,\\s*string>\\s*=\\s*(\\{[\\s\\S]*?\\});`,
    "m",
  );
  const match = src.match(re);
  return match ? match[1] : null;
}

describe("PR-J Fase 2b — invariantes pós-extract seedNormalizers", () => {
  describe("Existência das 4 constantes em seedNormalizers.ts", () => {
    it("seedNormalizers.ts exporta TAX_REGIME_ALIASES", () => {
      expect(extractConstBody(normalizersSrc, "TAX_REGIME_ALIASES")).not.toBeNull();
      expect(TAX_REGIME_ALIASES).toBeDefined();
    });

    it("seedNormalizers.ts exporta SNAKE_TO_LABEL", () => {
      expect(extractConstBody(normalizersSrc, "SNAKE_TO_LABEL")).not.toBeNull();
      expect(SNAKE_TO_LABEL).toBeDefined();
    });

    it("seedNormalizers.ts exporta POSICAO_ALIASES", () => {
      expect(extractConstBody(normalizersSrc, "POSICAO_ALIASES")).not.toBeNull();
      expect(POSICAO_ALIASES).toBeDefined();
    });

    it("seedNormalizers.ts exporta NATUREZA_TO_FONTES", () => {
      expect(extractConstBody(normalizersSrc, "NATUREZA_TO_FONTES")).not.toBeNull();
      expect(NATUREZA_TO_FONTES).toBeDefined();
    });
  });

  describe("Callers importam de seedNormalizers (não declaram inline)", () => {
    it("perfil.ts importa TAX_REGIME_ALIASES e NATUREZA_TO_FONTES", () => {
      expect(perfilSrc).toMatch(/import\s*\{[^}]*TAX_REGIME_ALIASES[^}]*\}\s*from\s*["']\.\.\/lib\/archetype\/seedNormalizers["']/);
      expect(perfilSrc).toMatch(/import\s*\{[^}]*NATUREZA_TO_FONTES[^}]*\}\s*from\s*["']\.\.\/lib\/archetype\/seedNormalizers["']/);
    });

    it("perfil.ts NÃO declara mais const TAX_REGIME_ALIASES inline", () => {
      expect(extractConstBody(perfilSrc, "TAX_REGIME_ALIASES")).toBeNull();
    });

    it("perfil.ts NÃO declara mais const NATUREZA_TO_FONTES inline", () => {
      expect(extractConstBody(perfilSrc, "NATUREZA_TO_FONTES")).toBeNull();
    });

    it("m1-monitor.ts importa SNAKE_TO_LABEL, POSICAO_ALIASES, NATUREZA_TO_FONTES", () => {
      expect(monitorSrc).toMatch(/import\s*\{[^}]*SNAKE_TO_LABEL[^}]*\}\s*from\s*["']\.\/lib\/archetype\/seedNormalizers["']/);
      expect(monitorSrc).toMatch(/import\s*\{[^}]*POSICAO_ALIASES[^}]*\}\s*from\s*["']\.\/lib\/archetype\/seedNormalizers["']/);
      expect(monitorSrc).toMatch(/import\s*\{[^}]*NATUREZA_TO_FONTES[^}]*\}\s*from\s*["']\.\/lib\/archetype\/seedNormalizers["']/);
    });

    it("m1-monitor.ts NÃO declara mais const SNAKE_TO_LABEL inline", () => {
      expect(extractConstBody(monitorSrc, "SNAKE_TO_LABEL")).toBeNull();
    });

    it("m1-monitor.ts NÃO declara mais const POSICAO_ALIASES inline", () => {
      expect(extractConstBody(monitorSrc, "POSICAO_ALIASES")).toBeNull();
    });

    it("m1-monitor.ts NÃO declara mais const NATUREZA_TO_FONTES inline", () => {
      expect(extractConstBody(monitorSrc, "NATUREZA_TO_FONTES")).toBeNull();
    });
  });

  describe("Snapshot byte-a-byte de seedNormalizers.ts (gate forte)", () => {
    it("TAX_REGIME_ALIASES literal preservado", () => {
      const body = extractConstBody(normalizersSrc, "TAX_REGIME_ALIASES");
      expect(body).toMatchSnapshot();
    });

    it("SNAKE_TO_LABEL literal preservado", () => {
      const body = extractConstBody(normalizersSrc, "SNAKE_TO_LABEL");
      expect(body).toMatchSnapshot();
    });

    it("POSICAO_ALIASES literal preservado", () => {
      const body = extractConstBody(normalizersSrc, "POSICAO_ALIASES");
      expect(body).toMatchSnapshot();
    });

    it("NATUREZA_TO_FONTES literal preservado", () => {
      const body = extractConstBody(normalizersSrc, "NATUREZA_TO_FONTES");
      expect(body).toMatchSnapshot();
    });
  });

  describe("Invariantes de conteúdo conhecido (via import direto)", () => {
    it("TAX_REGIME_ALIASES mapeia snake_case → title case", () => {
      expect(TAX_REGIME_ALIASES["lucro_real"]).toBe("Lucro Real");
      expect(TAX_REGIME_ALIASES["lucro_presumido"]).toBe("Lucro Presumido");
      expect(TAX_REGIME_ALIASES["simples_nacional"]).toBe("Simples Nacional");
      expect(TAX_REGIME_ALIASES["mei"]).toBe("MEI");
    });

    it("TAX_REGIME_ALIASES inclui idempotência title case", () => {
      expect(TAX_REGIME_ALIASES["Lucro Real"]).toBe("Lucro Real");
      expect(TAX_REGIME_ALIASES["Lucro Presumido"]).toBe("Lucro Presumido");
      expect(TAX_REGIME_ALIASES["Simples Nacional"]).toBe("Simples Nacional");
      expect(TAX_REGIME_ALIASES["MEI"]).toBe("MEI");
    });

    it("SNAKE_TO_LABEL mapeia snake_case → title case (incl. aliases extras)", () => {
      expect(SNAKE_TO_LABEL["lucro_real"]).toBe("Lucro Real");
      expect(SNAKE_TO_LABEL["lucro_presumido"]).toBe("Lucro Presumido");
      expect(SNAKE_TO_LABEL["simples_nacional"]).toBe("Simples Nacional");
      expect(SNAKE_TO_LABEL["simples"]).toBe("Simples Nacional"); // alias extra
      expect(SNAKE_TO_LABEL["mei"]).toBe("MEI");
      expect(SNAKE_TO_LABEL["regime_geral"]).toBe("Lucro Real"); // fallback razoável
    });

    it("POSICAO_ALIASES mapeia para Produtor/fabricante", () => {
      expect(POSICAO_ALIASES["fabricante"]).toBe("Produtor/fabricante");
      expect(POSICAO_ALIASES["produtor"]).toBe("Produtor/fabricante");
      expect(POSICAO_ALIASES["Produtor"]).toBe("Produtor/fabricante");
      expect(POSICAO_ALIASES["Fabricante"]).toBe("Produtor/fabricante");
    });

    it("POSICAO_ALIASES mapeia para Atacadista/Varejista", () => {
      expect(POSICAO_ALIASES["distribuidor"]).toBe("Atacadista");
      expect(POSICAO_ALIASES["atacadista"]).toBe("Atacadista");
      expect(POSICAO_ALIASES["varejista"]).toBe("Varejista");
      expect(POSICAO_ALIASES["Comerciante"]).toBe("Varejista");
    });

    it("POSICAO_ALIASES mapeia operadora_regulada → Operadora", () => {
      expect(POSICAO_ALIASES["operadora"]).toBe("Operadora");
      expect(POSICAO_ALIASES["operadora_regulada"]).toBe("Operadora");
    });

    it("NATUREZA_TO_FONTES contém mappings canonical", () => {
      expect(NATUREZA_TO_FONTES["Produção própria"]).toBe("Producao propria");
      expect(NATUREZA_TO_FONTES["Comércio"]).toBe("Venda de mercadoria");
      expect(NATUREZA_TO_FONTES["Prestação de serviço"]).toBe("Prestacao de servico");
      expect(NATUREZA_TO_FONTES["Transporte"]).toBe("Prestacao de servico");
      expect(NATUREZA_TO_FONTES["Intermediação"]).toBe("Comissao/intermediacao");
      expect(NATUREZA_TO_FONTES["Locação"]).toBe("Aluguel/locacao");
    });
  });
});
