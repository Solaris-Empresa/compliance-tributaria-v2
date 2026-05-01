/**
 * m1-monitor-normalizers.invariant.test.ts — PR-J Fase 2a
 *
 * Invariantes cross-file via leitura estática de source code + snapshot.
 *
 * Por que não chama m1Monitor.runAndLog?
 *   O procedure faz DB hit (persiste runner log) — sem TEST DB (Issue #873
 *   pendente), integration test bate em prod ou não roda. Estratégia
 *   alternativa: extrair blocos literais das constantes inline e validar via
 *   snapshot byte-a-byte. Fase 2b refactor (extract para
 *   server/lib/archetype/seedNormalizers.ts) deve atualizar este teste para
 *   apontar ao novo módulo + manter snapshots intactos = comportamento preservado.
 *
 * Vinculadas:
 *   - PR #892 Fase 1 (gap m1-monitor coverage identificado)
 *   - Lição #44 (pré-análise é diagnóstico onde há lacuna)
 *   - Issue #873 (CI prod isolation — habilita integration test futuro)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PERFIL_PATH = join(__dirname, "routers", "perfil.ts");
const MONITOR_PATH = join(__dirname, "routers-m1-monitor.ts");

const perfilSrc = readFileSync(PERFIL_PATH, "utf8");
const monitorSrc = readFileSync(MONITOR_PATH, "utf8");

/** Extrai o body literal `{...}` que segue uma declaração `const NAME: Record<string, string> = ` */
function extractConstBody(src: string, name: string): string | null {
  const re = new RegExp(
    `const\\s+${name}\\s*:\\s*Record<string,\\s*string>\\s*=\\s*(\\{[\\s\\S]*?\\});`,
    "m",
  );
  const match = src.match(re);
  return match ? match[1] : null;
}

describe("PR-J Fase 2a — invariantes cross-file (gates Fase 2b)", () => {
  describe("Existência das constantes inline (gate Fase 2b: extract preserva)", () => {
    it("perfil.ts contém TAX_REGIME_ALIASES inline", () => {
      expect(extractConstBody(perfilSrc, "TAX_REGIME_ALIASES")).not.toBeNull();
    });

    it("perfil.ts contém NATUREZA_TO_FONTES inline", () => {
      expect(extractConstBody(perfilSrc, "NATUREZA_TO_FONTES")).not.toBeNull();
    });

    it("m1-monitor.ts contém SNAKE_TO_LABEL inline (≈ TAX_REGIME_ALIASES)", () => {
      expect(extractConstBody(monitorSrc, "SNAKE_TO_LABEL")).not.toBeNull();
    });

    it("m1-monitor.ts contém POSICAO_ALIASES inline", () => {
      expect(extractConstBody(monitorSrc, "POSICAO_ALIASES")).not.toBeNull();
    });

    it("m1-monitor.ts contém NATUREZA_TO_FONTES inline", () => {
      expect(extractConstBody(monitorSrc, "NATUREZA_TO_FONTES")).not.toBeNull();
    });
  });

  describe("Invariante T4 standby: NATUREZA_TO_FONTES semanticamente idêntica", () => {
    it("perfil.ts NATUREZA_TO_FONTES === m1-monitor.ts NATUREZA_TO_FONTES (whitespace-insensitive)", () => {
      // T4 standby diagnosticou equivalência semântica — perfil.ts é compacto,
      // m1-monitor.ts tem padding visual de alinhamento. Normalizamos whitespace
      // múltiplo para comparar conteúdo lógico (chave→valor) ignorando indentação.
      const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
      const fromPerfil = extractConstBody(perfilSrc, "NATUREZA_TO_FONTES");
      const fromMonitor = extractConstBody(monitorSrc, "NATUREZA_TO_FONTES");
      expect(fromPerfil).not.toBeNull();
      expect(fromMonitor).not.toBeNull();
      expect(normalize(fromPerfil!)).toBe(normalize(fromMonitor!));
    });
  });

  describe("Snapshot byte-a-byte (gate forte — Fase 2b deve atualizar)", () => {
    it("perfil.ts TAX_REGIME_ALIASES literal preservado", () => {
      const body = extractConstBody(perfilSrc, "TAX_REGIME_ALIASES");
      expect(body).toMatchSnapshot();
    });

    it("perfil.ts NATUREZA_TO_FONTES literal preservado", () => {
      const body = extractConstBody(perfilSrc, "NATUREZA_TO_FONTES");
      expect(body).toMatchSnapshot();
    });

    it("m1-monitor.ts SNAKE_TO_LABEL literal preservado", () => {
      const body = extractConstBody(monitorSrc, "SNAKE_TO_LABEL");
      expect(body).toMatchSnapshot();
    });

    it("m1-monitor.ts POSICAO_ALIASES literal preservado", () => {
      const body = extractConstBody(monitorSrc, "POSICAO_ALIASES");
      expect(body).toMatchSnapshot();
    });

    it("m1-monitor.ts NATUREZA_TO_FONTES literal preservado", () => {
      const body = extractConstBody(monitorSrc, "NATUREZA_TO_FONTES");
      expect(body).toMatchSnapshot();
    });
  });

  describe("Invariantes de conteúdo conhecido (string contains)", () => {
    it("TAX_REGIME_ALIASES (perfil.ts) mapeia snake → title", () => {
      const body = extractConstBody(perfilSrc, "TAX_REGIME_ALIASES")!;
      expect(body).toMatch(/lucro_real:\s*"Lucro Real"/);
      expect(body).toMatch(/lucro_presumido:\s*"Lucro Presumido"/);
      expect(body).toMatch(/simples_nacional:\s*"Simples Nacional"/);
      expect(body).toMatch(/mei:\s*"MEI"/);
    });

    it("TAX_REGIME_ALIASES (perfil.ts) inclui idempotência title", () => {
      const body = extractConstBody(perfilSrc, "TAX_REGIME_ALIASES")!;
      expect(body).toMatch(/"Lucro Real":\s*"Lucro Real"/);
      expect(body).toMatch(/"Lucro Presumido":\s*"Lucro Presumido"/);
      expect(body).toMatch(/"Simples Nacional":\s*"Simples Nacional"/);
      expect(body).toMatch(/MEI:\s*"MEI"/);
    });

    it("SNAKE_TO_LABEL (m1-monitor.ts) mapeia snake → title", () => {
      const body = extractConstBody(monitorSrc, "SNAKE_TO_LABEL")!;
      expect(body).toMatch(/"lucro_real":\s*"Lucro Real"/);
      expect(body).toMatch(/"lucro_presumido":\s*"Lucro Presumido"/);
      expect(body).toMatch(/"simples_nacional":\s*"Simples Nacional"/);
      expect(body).toMatch(/"mei":\s*"MEI"/);
    });

    it("POSICAO_ALIASES (m1-monitor.ts) mapeia para Produtor/fabricante", () => {
      const body = extractConstBody(monitorSrc, "POSICAO_ALIASES")!;
      expect(body).toMatch(/"fabricante":\s*"Produtor\/fabricante"/);
      expect(body).toMatch(/"produtor":\s*"Produtor\/fabricante"/);
      expect(body).toMatch(/"Produtor":\s*"Produtor\/fabricante"/);
    });

    it("POSICAO_ALIASES (m1-monitor.ts) mapeia para Atacadista/Varejista", () => {
      const body = extractConstBody(monitorSrc, "POSICAO_ALIASES")!;
      expect(body).toMatch(/"atacadista":\s*"Atacadista"/);
      expect(body).toMatch(/"varejista":\s*"Varejista"/);
      expect(body).toMatch(/"Comerciante":\s*"Varejista"/);
    });

    it("POSICAO_ALIASES (m1-monitor.ts) mapeia operadora_regulada → Operadora", () => {
      const body = extractConstBody(monitorSrc, "POSICAO_ALIASES")!;
      expect(body).toMatch(/"operadora_regulada":\s*"Operadora"/);
    });

    it("NATUREZA_TO_FONTES (perfil.ts + m1-monitor.ts) contém mappings canonical", () => {
      const fromPerfil = extractConstBody(perfilSrc, "NATUREZA_TO_FONTES")!;
      const fromMonitor = extractConstBody(monitorSrc, "NATUREZA_TO_FONTES")!;
      for (const body of [fromPerfil, fromMonitor]) {
        expect(body).toMatch(/"Produção própria":\s*"Producao propria"/);
        expect(body).toMatch(/"Comércio":\s*"Venda de mercadoria"/);
        expect(body).toMatch(/"Prestação de serviço":\s*"Prestacao de servico"/);
      }
    });
  });
});
