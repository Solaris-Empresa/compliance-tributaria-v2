import { describe, it, expect } from "vitest";
import {
  classifyExposicao,
  getExposicaoConfig,
  EXPOSICAO_CONFIG,
  EXPOSICAO_TEXTOS,
} from "./exposicao-risco-thresholds";

describe("classifyExposicao — thresholds 0-30/31-55/56-75/76-100", () => {
  it("baixa: 0 até 30 inclusive", () => {
    expect(classifyExposicao(0)).toBe("baixa");
    expect(classifyExposicao(15)).toBe("baixa");
    expect(classifyExposicao(30)).toBe("baixa");
  });

  it("moderada: 31 até 55", () => {
    expect(classifyExposicao(31)).toBe("moderada");
    expect(classifyExposicao(45)).toBe("moderada");
    expect(classifyExposicao(55)).toBe("moderada");
  });

  it("alta: 56 até 75", () => {
    expect(classifyExposicao(56)).toBe("alta");
    expect(classifyExposicao(66)).toBe("alta");
    expect(classifyExposicao(75)).toBe("alta");
  });

  it("crítica: 76 até 100", () => {
    expect(classifyExposicao(76)).toBe("critica");
    expect(classifyExposicao(90)).toBe("critica");
    expect(classifyExposicao(100)).toBe("critica");
  });

  it("clampa acima de 100 em 100 e retorna crítica", () => {
    expect(classifyExposicao(150)).toBe("critica");
  });

  it("clampa abaixo de 0 em 0 e retorna baixa", () => {
    expect(classifyExposicao(-10)).toBe("baixa");
  });

  it("arredonda antes de classificar", () => {
    expect(classifyExposicao(30.4)).toBe("baixa");     // round → 30
    expect(classifyExposicao(30.5)).toBe("moderada");  // round → 31
    expect(classifyExposicao(55.4)).toBe("moderada");  // round → 55
    expect(classifyExposicao(55.5)).toBe("alta");      // round → 56
    expect(classifyExposicao(75.4)).toBe("alta");      // round → 75
    expect(classifyExposicao(75.5)).toBe("critica");   // round → 76
  });

  it("NaN/Infinity retornam baixa (fallback seguro)", () => {
    expect(classifyExposicao(NaN)).toBe("baixa");
    expect(classifyExposicao(Infinity)).toBe("baixa");
  });
});

describe("getExposicaoConfig", () => {
  it("retorna null para input inválido", () => {
    expect(getExposicaoConfig(null)).toBeNull();
    expect(getExposicaoConfig(undefined)).toBeNull();
    expect(getExposicaoConfig(NaN)).toBeNull();
  });

  it("retorna config com 4 campos obrigatórios", () => {
    const cfg = getExposicaoConfig(66);
    expect(cfg).not.toBeNull();
    expect(cfg?.label).toBe("Alta exposição");
    expect(cfg?.emoji).toBe("🟠");
    expect(cfg?.action).toBeTruthy();
    expect(cfg?.className).toBeTruthy();
  });
});

describe("EXPOSICAO_CONFIG — sanidade estrutural", () => {
  it("tem todas as 4 faixas", () => {
    expect(Object.keys(EXPOSICAO_CONFIG).sort()).toEqual([
      "alta", "baixa", "critica", "moderada",
    ]);
  });

  it("ranges cobrem 0-100 sem gap ou overlap", () => {
    const ranges = Object.values(EXPOSICAO_CONFIG)
      .map((c) => c.range)
      .sort((a, b) => a.min - b.min);
    expect(ranges[0].min).toBe(0);
    expect(ranges[ranges.length - 1].max).toBe(100);
    for (let i = 0; i < ranges.length - 1; i++) {
      expect(ranges[i + 1].min).toBe(ranges[i].max + 1);
    }
  });

  it("cores distintas entre faixas", () => {
    const classes = Object.values(EXPOSICAO_CONFIG).map((c) => c.className);
    const unique = new Set(classes);
    expect(unique.size).toBe(4);
  });
});

describe("EXPOSICAO_TEXTOS — fonte única de verdade para copy", () => {
  it("título canônico", () => {
    expect(EXPOSICAO_TEXTOS.titulo).toBe("Exposição ao Risco de Compliance");
  });

  it("subtítulo usa 'indicador' (não 'score' — evita ambiguidade)", () => {
    expect(EXPOSICAO_TEXTOS.subtitulo).toContain("indicador");
    expect(EXPOSICAO_TEXTOS.subtitulo).not.toContain("score");
  });

  it("nota pedagógica menciona faixa 56-75 explicitamente", () => {
    expect(EXPOSICAO_TEXTOS.nota_pedagogica).toContain("56");
    expect(EXPOSICAO_TEXTOS.nota_pedagogica).toContain("75");
    expect(EXPOSICAO_TEXTOS.nota_pedagogica).toContain("riscos aprovados");
  });

  it("alerta sinaliza MENOR = MELHOR", () => {
    expect(EXPOSICAO_TEXTOS.alerta).toMatch(/MENOR.*MELHOR/);
  });

  it("frase final consolida", () => {
    expect(EXPOSICAO_TEXTOS.frase_final).toContain("ponto de partida");
  });
});
