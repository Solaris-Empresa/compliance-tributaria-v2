import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { sanitizeBriefingMarkdown } from "./briefing-sanitizer";

describe("briefing-sanitizer", () => {
  const originalFlag = process.env.BRIEFING_SANITIZER_ENABLED;

  beforeEach(() => {
    delete process.env.BRIEFING_SANITIZER_ENABLED;
  });

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.BRIEFING_SANITIZER_ENABLED;
    else process.env.BRIEFING_SANITIZER_ENABLED = originalFlag;
  });

  describe("cenário real do incidente UAT 2026-04-21", () => {
    it("bloqueia NCMs citados quando usuário não cadastrou nenhum", () => {
      const markdown =
        "Enquadramento em alíquota zero para arroz (NCM 1006), feijão (NCM 0713), açúcar (NCM 1701) e óleo (NCM 1507).";
      const result = sanitizeBriefingMarkdown(markdown, { ncms: [] });

      expect(result.sanitized).toContain("NCM 1006 (sugerido pela lei");
      expect(result.sanitized).toContain("NCM 0713 (sugerido pela lei");
      expect(result.sanitized).toContain("NCM 1701 (sugerido pela lei");
      expect(result.sanitized).toContain("NCM 1507 (sugerido pela lei");
      expect(result.blockedCodes).toHaveLength(4);
      expect(result.enabled).toBe(true);
    });
  });

  describe("códigos autorizados (cadastrados em meta.ncms)", () => {
    it("permite NCM cadastrado sem disclaimer", () => {
      const markdown = "O produto da empresa é NCM 1006.";
      const result = sanitizeBriefingMarkdown(markdown, { ncms: ["1006"] });

      expect(result.sanitized).toBe(markdown);
      expect(result.blockedCodes).toHaveLength(0);
    });

    it("normaliza NCM com ponto (1006.10) vs sem ponto (1006)", () => {
      const markdown = "Produto NCM 1006.10 da cesta básica.";
      const result = sanitizeBriefingMarkdown(markdown, { ncms: ["1006"] });

      expect(result.sanitized).toBe(markdown);
      expect(result.blockedCodes).toHaveLength(0);
    });

    it("caso misto — 1006 autorizado mas 0713 não", () => {
      const markdown = "Arroz NCM 1006 e feijão NCM 0713 são cesta básica.";
      const result = sanitizeBriefingMarkdown(markdown, { ncms: ["1006"] });

      expect(result.sanitized).toContain("NCM 1006 e");
      expect(result.sanitized).not.toContain("NCM 1006 (sugerido");
      expect(result.sanitized).toContain("NCM 0713 (sugerido pela lei");
      expect(result.blockedCodes).toHaveLength(1);
      expect(result.blockedCodes[0].code).toBe("0713");
    });
  });

  describe("repetições do mesmo código", () => {
    it("disclaimer completo só na primeira ocorrência", () => {
      const markdown = "NCM 1006 aparece. De novo NCM 1006. E mais NCM 1006.";
      const result = sanitizeBriefingMarkdown(markdown, { ncms: [] });

      const fullCount = (result.sanitized.match(/sugerido pela lei/g) ?? []).length;
      const shortCount = (result.sanitized.match(/\(sugerido\)/g) ?? []).length;

      expect(fullCount).toBe(1);
      expect(shortCount).toBe(2);
      expect(result.blockedCodes).toHaveLength(1);
      expect(result.blockedCodes[0].occurrences).toBe(3);
    });
  });

  describe("NBS (serviços)", () => {
    it("bloqueia NBS não cadastrado", () => {
      const markdown = "O serviço NBS 10250 requer atenção.";
      const result = sanitizeBriefingMarkdown(markdown, { nbs: [] });

      expect(result.sanitized).toContain("NBS 10250 (sugerido");
      expect(result.blockedCodes).toHaveLength(1);
      expect(result.blockedCodes[0].type).toBe("nbs");
    });

    it("permite NBS cadastrado", () => {
      const markdown = "Serviço NBS 10250.";
      const result = sanitizeBriefingMarkdown(markdown, { nbs: ["10250"] });

      expect(result.sanitized).toBe(markdown);
      expect(result.blockedCodes).toHaveLength(0);
    });
  });

  describe("feature flag", () => {
    it("BRIEFING_SANITIZER_ENABLED=false → no-op", () => {
      process.env.BRIEFING_SANITIZER_ENABLED = "false";
      const markdown = "NCM 9999 inventado.";
      const result = sanitizeBriefingMarkdown(markdown, { ncms: [] });

      expect(result.sanitized).toBe(markdown);
      expect(result.enabled).toBe(false);
      expect(result.blockedCodes).toHaveLength(0);
    });

    it("default (sem env var) → sanitizer ativo", () => {
      const markdown = "NCM 9999 inventado.";
      const result = sanitizeBriefingMarkdown(markdown, { ncms: [] });

      expect(result.enabled).toBe(true);
      expect(result.sanitized).not.toBe(markdown);
    });
  });

  describe("edge cases", () => {
    it("markdown sem NCM/NBS → sem mudanças", () => {
      const markdown = "Texto normal sem códigos fiscais.";
      const result = sanitizeBriefingMarkdown(markdown, {});

      expect(result.sanitized).toBe(markdown);
      expect(result.blockedCodes).toHaveLength(0);
    });

    it("meta undefined → comporta como vazio", () => {
      const markdown = "NCM 1006 citado.";
      const result = sanitizeBriefingMarkdown(markdown, {});

      expect(result.blockedCodes).toHaveLength(1);
    });

    it("caixa variada (ncm, Ncm, NCM) → todos capturados", () => {
      const markdown = "ncm 1006, Ncm 0713, NCM 1701.";
      const result = sanitizeBriefingMarkdown(markdown, { ncms: [] });

      expect(result.blockedCodes).toHaveLength(3);
    });

    it("é determinístico — mesma entrada → mesma saída", () => {
      const markdown = "NCM 1006, NCM 0713, NCM 1701.";
      const a = sanitizeBriefingMarkdown(markdown, { ncms: ["1006"] });
      const b = sanitizeBriefingMarkdown(markdown, { ncms: ["1006"] });
      expect(a.sanitized).toBe(b.sanitized);
      expect(a.blockedCodes).toEqual(b.blockedCodes);
    });
  });
});
