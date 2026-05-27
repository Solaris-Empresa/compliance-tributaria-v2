import { describe, it, expect } from "vitest";
import { shouldInjectArt197 } from "./art197-injection";

// D1-C — gate hardcoded INTERINO (CNAE grupo 28 + NCM 8436.*). Tech-debt → NEW-CAT.
// A injeção (fetchArt197Chunks) depende de DB → validada pelo smoke Manus (3/3 runs);
// aqui cobrimos a lógica pura do gate.
describe("D1-C — shouldInjectArt197 (gate interino CNAE 28 + NCM 8436.*)", () => {
  it("injeta para fabricante CNAE 2833 com NCM 8436.* (caso 2700001)", () => {
    expect(shouldInjectArt197(["2833-0/00"], ["8436.99.00"])).toBe(true);
    expect(shouldInjectArt197(["2833-0/00"], ["8436.10.00"])).toBe(true); // sibling 8436.*
  });

  it("NÃO injeta sem grupo CNAE 28", () => {
    expect(shouldInjectArt197(["4711-3/01"], ["8436.99.00"])).toBe(false); // comércio
    expect(shouldInjectArt197(["0151-2/01"], ["8436.99.00"])).toBe(false); // agropecuária
  });

  it("NÃO injeta sem NCM 8436.*", () => {
    expect(shouldInjectArt197(["2833-0/00"], ["2202.10.00"])).toBe(false); // bebida
    expect(shouldInjectArt197(["2833-0/00"], ["8437.10.00"])).toBe(false); // 8437 ≠ 8436
  });

  it("injeta quando há múltiplos NCMs e ao menos um é 8436.*", () => {
    expect(shouldInjectArt197(["2833-0/00"], ["2202.10.00", "8436.99.00"])).toBe(true);
  });

  it("NÃO injeta com listas vazias", () => {
    expect(shouldInjectArt197([], [])).toBe(false);
    expect(shouldInjectArt197(["2833-0/00"], [])).toBe(false);
    expect(shouldInjectArt197([], ["8436.99.00"])).toBe(false);
  });
});
