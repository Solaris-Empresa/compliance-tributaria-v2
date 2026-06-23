/**
 * normalize-respostas.test.ts — BUG-RESP-VAZIA (#1552)
 *
 * Importa o helper REAL (Lição #110 — não replica). Cobre o contrato exigido
 * pelo DoD: resposta "" → null; demais valores válidos preservados.
 */
import { describe, it, expect } from "vitest";
import { normalizeRespostas } from "./normalize-respostas";

describe("normalizeRespostas (BUG-RESP-VAZIA #1552)", () => {
  it('resposta "" → null (produto e serviço)', () => {
    const out = normalizeRespostas([
      { pergunta_id: "p1", resposta: "" },
      { pergunta_id: "p2", resposta: "Não" },
    ]);
    expect(out[0].resposta).toBeNull();
    expect(out[1].resposta).toBe("Não");
  });

  it("preserva boolean false e number 0 (não são vazios)", () => {
    const out = normalizeRespostas([
      { pergunta_id: "b", resposta: false },
      { pergunta_id: "n", resposta: 0 },
    ]);
    expect(out[0].resposta).toBe(false); // false ≠ null
    expect(out[1].resposta).toBe(0); // 0 ≠ null
  });

  it("preserva os demais campos da resposta (pergunta_id, lei_ref, etc.)", () => {
    const out = normalizeRespostas([
      { pergunta_id: "p1", ncm_code: "2402", lei_ref: "Art. 409", resposta: "" },
    ]);
    expect(out[0]).toMatchObject({
      pergunta_id: "p1",
      ncm_code: "2402",
      lei_ref: "Art. 409",
      resposta: null,
    });
  });

  it("array vazio → array vazio", () => {
    expect(normalizeRespostas([])).toEqual([]);
  });

  it("não muta o array de entrada (retorna novos objetos)", () => {
    const input = [{ pergunta_id: "p1", resposta: "" as string }];
    const out = normalizeRespostas(input);
    expect(input[0].resposta).toBe(""); // original intacto
    expect(out[0].resposta).toBeNull();
    expect(out[0]).not.toBe(input[0]);
  });
});
