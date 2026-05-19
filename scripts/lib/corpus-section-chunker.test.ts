import { describe, it, expect } from "vitest";
import { extractSections, splitLong } from "./corpus-section-chunker";

const BODY = (s: string) =>
  s.padEnd(90, " conteúdo verbatim do manual técnico.");

describe("extractSections", () => {
  it("ignora linha de Sumário (ToC) com dotted leaders", () => {
    const raw = [
      "  2.1       Conceitos ........................................................ 7",
      "  2.1.1     CTe (modelo 57) ................................................. 7",
    ].join("\n");
    expect(extractSections(raw)).toEqual([]); // ToC → nada
  });

  it("detecta heading de corpo indentado e captura id+titulo", () => {
    const raw = [
      "  2 Considerações Iniciais",
      BODY("O CTe foi desenvolvido"),
    ].join("\n");
    const s = extractSections(raw);
    expect(s).toHaveLength(1);
    expect(s[0]!.id).toBe("2");
    expect(s[0]!.titulo).toBe("Considerações Iniciais");
    expect(s[0]!.conteudo).toContain("O CTe foi desenvolvido"); // verbatim
  });

  it("detecta numeração aninhada (2.1.7.1)", () => {
    const raw = [
      "  2.1.7.1 Assinatura RSA",
      BODY("Detalhe técnico da assinatura"),
    ].join("\n");
    expect(extractSections(raw)[0]!.id).toBe("2.1.7.1");
  });

  it("descarta seção com conteúdo < 80 chars", () => {
    const raw = ["  9 Curto", "  texto"].join("\n");
    expect(extractSections(raw)).toEqual([]);
  });

  it("ignora preâmbulo antes da 1ª seção (capa)", () => {
    const raw = [
      "Projeto CTe",
      "Versão 4.00",
      "  1 Introdução",
      BODY("Este manual define"),
    ].join("\n");
    const s = extractSections(raw);
    expect(s).toHaveLength(1);
    expect(s[0]!.id).toBe("1");
  });

  it("ISOLAMENTO: linha estilo `Art. 1º` NÃO é seção (não contamina chunker de artigo)", () => {
    const raw = [
      "Art. 1º Esta Lei Complementar estabelece normas gerais e diversas disposições aplicáveis",
    ].join("\n");
    expect(extractSections(raw)).toEqual([]); // SECTION_START_RE exige id numérico no início
  });

  it("descarta linha de tabela de versão/data (título começa com dígito)", () => {
    const raw = [
      "  4.00     08/2022           Versão inicial do MOC 4.00 publicada no portal",
      "  4.00.1   01/2023           Erratas e correções diversas aplicadas ao manual",
    ].join("\n");
    expect(extractSections(raw)).toEqual([]); // título inicia com dígito → não-seção
  });

  it("múltiplas seções sequenciais preservam ordem e fronteiras", () => {
    const raw = [
      "  1 Introdução",
      BODY("Conteúdo da introdução"),
      "  2 Conceitos",
      BODY("Conteúdo de conceitos"),
    ].join("\n");
    const s = extractSections(raw);
    expect(s.map(x => x.id)).toEqual(["1", "2"]);
    expect(s[0]!.conteudo).not.toContain("Conteúdo de conceitos");
  });
});

describe("splitLong", () => {
  it("texto <= maxChars → 1 pedaço", () => {
    expect(splitLong("abc", 1200)).toEqual(["abc"]);
  });

  it("texto > maxChars → múltiplos pedaços determinísticos e reconstituíveis", () => {
    const txt = Array.from({ length: 400 }, (_, i) => `palavra${i}`).join(" ");
    const parts = splitLong(txt, 1200);
    expect(parts.length).toBeGreaterThan(1);
    parts.forEach(p => expect(p.length).toBeLessThanOrEqual(1200));
    // determinístico: mesma entrada → mesma saída
    expect(splitLong(txt, 1200)).toEqual(parts);
  });
});
