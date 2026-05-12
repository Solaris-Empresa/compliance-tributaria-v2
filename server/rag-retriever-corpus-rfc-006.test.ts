/**
 * CORPUS-RFC-006 — Sprint 0: testes das funções puras do retriever ampliado.
 *
 * Cobre:
 *   - extractNcmsFromContext (P3): extração regex de NCMs
 *   - mergeAndDedup (3-pass): novo terceiro argumento, dedup correto
 *
 * Funções que dependem de DB (fetchNcmCandidates, fetchSetorialCandidates,
 * fetchCandidates) NÃO são testadas aqui — são integration. Esta suite roda
 * sem DATABASE_URL.
 */
import { describe, it, expect } from "vitest";
import {
  extractNcmsFromContext,
  mergeAndDedup,
  isSetorialArtigo,
  matchesCnaeBoundary,
} from "./rag-retriever";

// ─── extractNcmsFromContext (P3) ───────────────────────────────────────────────

describe("CORPUS-RFC-006 P3 — extractNcmsFromContext", () => {
  describe("Captura básica", () => {
    it("retorna [] para string vazia", () => {
      expect(extractNcmsFromContext("")).toEqual([]);
    });

    it("retorna [] sem dígitos válidos", () => {
      expect(extractNcmsFromContext("texto sem números")).toEqual([]);
    });

    it("captura NCM 4 dígitos isolado", () => {
      expect(extractNcmsFromContext("produto NCM 2304")).toEqual(["2304"]);
    });

    it("captura NCM 6 dígitos com ponto (subheading)", () => {
      expect(extractNcmsFromContext("NCM 2304.00 farelo")).toEqual(["2304.00"]);
    });

    it("captura múltiplos NCMs preservando ordem", () => {
      const result = extractNcmsFromContext(
        "Empresa usa NCM 2304 e também 2306 nas operações",
      );
      expect(result).toEqual(["2304", "2306"]);
    });
  });

  describe("Deduplicação", () => {
    it("remove duplicatas mantendo ordem de primeira ocorrência", () => {
      const result = extractNcmsFromContext(
        "NCM 2304 inicial, depois 2306, retorna 2304 novamente",
      );
      expect(result).toEqual(["2304", "2306"]);
    });

    it("considera '2304' e '2304.00' como diferentes (subheading vs heading)", () => {
      const result = extractNcmsFromContext("NCM 2304 e variante 2304.00");
      expect(result).toEqual(["2304", "2304.00"]);
    });
  });

  describe("Boundary (anti falso-positivo)", () => {
    it("captura ano '2026' isoladamente — limitação aceita (não há contexto léxico)", () => {
      // Documentado: regex \b\d{4}\b captura QUALQUER 4 dígitos com word-boundary.
      // Filtragem semântica (ano vs NCM) acontece downstream via LIKE em
      // chunks reais — anos não aparecem em conteudo+topicos de produtos.
      expect(extractNcmsFromContext("Reforma 2026")).toEqual(["2026"]);
    });

    it("NÃO captura número com mais de 4 dígitos consecutivos sem subheading", () => {
      // "23040010" tem 8 dígitos consecutivos sem ponto — regex \b\d{4}(?:\.\d{2})?\b
      // bate apenas os primeiros 4 (boundary não tolera dígito subsequente).
      expect(extractNcmsFromContext("código 23040010 completo")).toEqual([]);
    });

    it("NÃO captura número de 3 dígitos", () => {
      expect(extractNcmsFromContext("Art. 138")).toEqual([]);
    });

    it("NÃO captura número de 5 dígitos sem ponto", () => {
      expect(extractNcmsFromContext("12345")).toEqual([]);
    });
  });

  describe("Caso canônico — projeto #5040001", () => {
    it("contextQuery com NCMs 2304 e 2306 (farelos de soja) é extraído corretamente", () => {
      const contextQuery =
        "Empresa I COMÉRCIO comercializa NCM 2306.10 (torta de soja) e 2304.00 (farelos)";
      const result = extractNcmsFromContext(contextQuery);
      expect(result).toContain("2306.10");
      expect(result).toContain("2304.00");
    });

    it("respeita slice(0, 3) — extrai todos, caller limita downstream", () => {
      // Função pura retorna TUDO. slice(0, 3) está no caller (fetchNcmCandidates).
      const result = extractNcmsFromContext("2301 2302 2303 2304 2305");
      expect(result.length).toBe(5);
      expect(result.slice(0, 3)).toEqual(["2301", "2302", "2303"]);
    });
  });
});

// ─── mergeAndDedup (3-pass) ────────────────────────────────────────────────────

const makeArt = (
  anchorId: string,
  artigo = "Art. X",
  titulo = "Título",
): {
  lei: string;
  artigo: string;
  titulo: string;
  conteudo: string;
  anchorId?: string;
} => ({
  lei: "lc214",
  artigo,
  titulo,
  conteudo: `Conteúdo de ${anchorId}`,
  anchorId,
});

describe("CORPUS-RFC-006 — mergeAndDedup (3-pass)", () => {
  describe("Retrocompat — 2 argumentos", () => {
    it("aceita apenas pass1 + pass2 (terceiro arg opcional)", () => {
      const p1 = [makeArt("a1")];
      const p2 = [makeArt("a2")];
      const result = mergeAndDedup(p1, p2);
      expect(result).toHaveLength(2);
      expect(result.map((a) => a.anchorId)).toEqual(["a1", "a2"]);
    });

    it("dedup funciona quando pass3 está vazio", () => {
      const p1 = [makeArt("a1"), makeArt("a2")];
      const p2 = [makeArt("a2"), makeArt("a3")]; // a2 duplicado
      const result = mergeAndDedup(p1, p2);
      expect(result).toHaveLength(3);
      expect(result.map((a) => a.anchorId)).toEqual(["a1", "a2", "a3"]);
    });
  });

  describe("3-pass merge (CORPUS-RFC-006)", () => {
    it("inclui pass3 no merge preservando ordem global", () => {
      const p1 = [makeArt("a1")];
      const p2 = [makeArt("a2")];
      const p3 = [makeArt("a3"), makeArt("a4")];
      const result = mergeAndDedup(p1, p2, p3);
      expect(result.map((a) => a.anchorId)).toEqual(["a1", "a2", "a3", "a4"]);
    });

    it("dedup entre os 3 passes (anchor_id compartilhado)", () => {
      const p1 = [makeArt("shared")];
      const p2 = [makeArt("shared"), makeArt("p2-only")];
      const p3 = [makeArt("shared"), makeArt("p3-only")];
      const result = mergeAndDedup(p1, p2, p3);
      expect(result.map((a) => a.anchorId)).toEqual([
        "shared",
        "p2-only",
        "p3-only",
      ]);
    });

    it("ordem: pass1 → pass2 → pass3 (preserva primeira ocorrência)", () => {
      const p1 = [makeArt("shared", "Art. 1")];
      const p2: ReturnType<typeof makeArt>[] = [];
      const p3 = [makeArt("shared", "Art. 999")]; // mesmo anchor, diferente artigo
      const result = mergeAndDedup(p1, p2, p3);
      // Mantém Art. 1 (primeira ocorrência), não Art. 999
      expect(result).toHaveLength(1);
      expect(result[0].artigo).toBe("Art. 1");
    });

    it("dedup legacy (sem anchor_id) por lei-artigo-titulo[:50]", () => {
      const sem1 = { lei: "lc214", artigo: "Art. 5", titulo: "Mesmo título", conteudo: "x" };
      const sem2 = { lei: "lc214", artigo: "Art. 5", titulo: "Mesmo título", conteudo: "y" };
      const result = mergeAndDedup([sem1], [sem2], []);
      expect(result).toHaveLength(1);
    });
  });

  describe("Caso canônico — 3-pass com cenário #5040001", () => {
    it("Pass 1 traz Art. 1 (genérico), Pass 2 traz Art. 138 (setorial), Pass 3 traz Anexo IX (NCM-targeted)", () => {
      const pass1 = [makeArt("lc214-art1", "Art. 1 LC 214/2025")];
      const pass2 = [makeArt("lc214-art138", "Art. 138 LC 214/2025")];
      const pass3 = [
        makeArt("lc214-anexo9-id30283", "Anexo IX"),
        makeArt("lc214-anexo9-id30295", "Anexo IX"),
      ];
      const result = mergeAndDedup(pass1, pass2, pass3);
      expect(result).toHaveLength(4);
      const artigos = result.map((a) => a.artigo);
      expect(artigos).toContain("Art. 138 LC 214/2025");
      expect(artigos).toContain("Anexo IX");
    });

    it("Soma máxima respeita 20 + 20 + 15 = até 55 candidatos únicos", () => {
      // Constrói pools no tamanho máximo previsto
      const pass1 = Array.from({ length: 20 }, (_, i) => makeArt(`p1-${i}`));
      const pass2 = Array.from({ length: 20 }, (_, i) => makeArt(`p2-${i}`));
      const pass3 = Array.from({ length: 15 }, (_, i) => makeArt(`p3-${i}`));
      const result = mergeAndDedup(pass1, pass2, pass3);
      expect(result).toHaveLength(55);
    });
  });

  describe("DoD POSITIVO + NEGATIVO", () => {
    it("DoD POSITIVO: 3 passes vazios retornam []", () => {
      expect(mergeAndDedup([], [], [])).toEqual([]);
    });

    it("DoD NEGATIVO: nunca duplica anchor_id no resultado", () => {
      const p1 = [makeArt("a"), makeArt("b")];
      const p2 = [makeArt("a"), makeArt("c")];
      const p3 = [makeArt("b"), makeArt("c"), makeArt("d")];
      const result = mergeAndDedup(p1, p2, p3);
      const anchorIds = result.map((a) => a.anchorId);
      const uniqueAnchorIds = new Set(anchorIds);
      expect(anchorIds.length).toBe(uniqueAnchorIds.size);
    });

    it("DoD POSITIVO: função pura — mesma entrada produz mesma saída", () => {
      const p1 = [makeArt("a")];
      const p2 = [makeArt("b")];
      const p3 = [makeArt("c")];
      expect(mergeAndDedup(p1, p2, p3)).toEqual(mergeAndDedup(p1, p2, p3));
    });
  });
});

// ─── Regressão: isSetorialArtigo e matchesCnaeBoundary continuam funcionando ───

describe("CORPUS-RFC-006 — regressão Issue #997 preservada", () => {
  it("isSetorialArtigo continua marcando Art. 138 como setorial", () => {
    expect(isSetorialArtigo("Art. 138 LC 214/2025")).toBe(true);
  });

  it("isSetorialArtigo marca Anexo IX como setorial", () => {
    expect(isSetorialArtigo("Anexo IX")).toBe(true);
  });

  it("isSetorialArtigo NÃO marca Art. 1 (genérico)", () => {
    expect(isSetorialArtigo("Art. 1")).toBe(false);
  });

  it("matchesCnaeBoundary boundary-aware (Issue #997 AC1) preservado", () => {
    expect(matchesCnaeBoundary("46", "46")).toBe(true);
    // "01,02,46,47" → contém "46" exato → match
    expect(matchesCnaeBoundary("01,02,46,47", "46")).toBe(true);
    // String longa SEM "46" (>= 50 chars) → não bate (fallback length-aware falha)
    const longoSem46 =
      "01,02,03,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25";
    expect(longoSem46.length).toBeGreaterThanOrEqual(50);
    expect(matchesCnaeBoundary(longoSem46, "46")).toBe(false);
  });
});
