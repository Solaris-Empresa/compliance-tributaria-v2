import { describe, it, expect } from "vitest";
import {
  consolidateGapsByArticle,
  normalizeEvidenciaKey,
  type BriefingGap,
} from "./consolidate-gaps";

describe("normalizeEvidenciaKey", () => {
  it("extrai Art. N sem parágrafo", () => {
    expect(normalizeEvidenciaKey("Art. 14 LC 214/2025")).toBe("art. 14");
    expect(normalizeEvidenciaKey("art.14LC214/2025")).toBe("art. 14");
  });

  it("extrai Art. N §M com normalização", () => {
    expect(normalizeEvidenciaKey("Art. 21 §1º LC 214/2025")).toBe("art. 21 §1");
    expect(normalizeEvidenciaKey("art.21 § 1° LC214/2025")).toBe("art. 21 §1");
    expect(normalizeEvidenciaKey("ART. 21 §1ª LC 214/2025")).toBe("art. 21 §1");
  });

  it("distingue parágrafos diferentes do mesmo artigo", () => {
    const k1 = normalizeEvidenciaKey("Art. 21 §1º LC 214/2025");
    const k2 = normalizeEvidenciaKey("Art. 21 §2º LC 214/2025");
    const k3 = normalizeEvidenciaKey("Art. 21 LC 214/2025");
    expect(k1).not.toBe(k2);
    expect(k1).not.toBe(k3);
    expect(k2).not.toBe(k3);
  });

  it("retorna vazio para input vazio/null", () => {
    expect(normalizeEvidenciaKey("")).toBe("");
    expect(normalizeEvidenciaKey(undefined)).toBe("");
    expect(normalizeEvidenciaKey(null)).toBe("");
  });
});

describe("consolidateGapsByArticle", () => {
  it("passa direto quando há 0 ou 1 gap", () => {
    expect(consolidateGapsByArticle([])).toEqual([]);
    const one: BriefingGap[] = [{ gap: "X", evidencia_regulatoria: "Art. 14 LC 214/2025" }];
    expect(consolidateGapsByArticle(one)).toEqual(one);
  });

  it("não consolida gaps com artigos diferentes", () => {
    const gaps: BriefingGap[] = [
      { gap: "G1", evidencia_regulatoria: "Art. 14 LC 214/2025", urgencia: "imediata" },
      { gap: "G2", evidencia_regulatoria: "Art. 15 LC 214/2025", urgencia: "imediata" },
      { gap: "G3", evidencia_regulatoria: "Art. 21 §1º LC 214/2025", urgencia: "media" },
    ];
    expect(consolidateGapsByArticle(gaps)).toHaveLength(3);
  });

  it("consolida 3 gaps com mesmo Art. 21 §1º em 1 gap", () => {
    const gaps: BriefingGap[] = [
      { gap: "Controles automatizados", causa_raiz: "sistema X", evidencia_regulatoria: "Art. 21 §1º LC 214/2025", urgencia: "imediata" },
      { gap: "ERP não parametrizado", causa_raiz: "ERP Y", evidencia_regulatoria: "Art. 21 §1º LC 214/2025", urgencia: "imediata" },
      { gap: "Mecanismos preventivos", causa_raiz: "processo Z", evidencia_regulatoria: "art.21 § 1° LC 214/2025", urgencia: "media" },
    ];
    const out = consolidateGapsByArticle(gaps);
    expect(out).toHaveLength(1);
    expect(out[0].gap).toContain("Controles automatizados");
    expect(out[0].gap).toContain("Também cobre:");
    expect(out[0].gap).toContain("ERP não parametrizado");
    expect(out[0].gap).toContain("Mecanismos preventivos");
    expect(out[0].causa_raiz).toBe("sistema X | ERP Y | processo Z");
    // Urgência mais alta (imediata) vence
    expect(out[0].urgencia).toBe("imediata");
  });

  it("preserva ordem de aparição", () => {
    const gaps: BriefingGap[] = [
      { gap: "A", evidencia_regulatoria: "Art. 14 LC 214/2025" },
      { gap: "B1", evidencia_regulatoria: "Art. 21 §1º LC 214/2025" },
      { gap: "C", evidencia_regulatoria: "Art. 15 LC 214/2025" },
      { gap: "B2", evidencia_regulatoria: "Art. 21 §1º LC 214/2025" },
    ];
    const out = consolidateGapsByArticle(gaps);
    // Esperado: [A, merged-B, C] — B aparece na posição do primeiro B1
    expect(out).toHaveLength(3);
    expect(out[0].gap).toBe("A");
    expect(out[1].gap).toContain("B1");
    expect(out[1].gap).toContain("B2");
    expect(out[2].gap).toBe("C");
  });

  it("não consolida quando parágrafos diferem", () => {
    const gaps: BriefingGap[] = [
      { gap: "G1", evidencia_regulatoria: "Art. 21 §1º LC 214/2025" },
      { gap: "G2", evidencia_regulatoria: "Art. 21 §2º LC 214/2025" },
      { gap: "G3", evidencia_regulatoria: "Art. 21 LC 214/2025" },
    ];
    expect(consolidateGapsByArticle(gaps)).toHaveLength(3);
  });

  it("gaps sem evidencia_regulatoria nunca são consolidados entre si", () => {
    const gaps: BriefingGap[] = [
      { gap: "G1" },
      { gap: "G2" },
    ];
    expect(consolidateGapsByArticle(gaps)).toHaveLength(2);
  });

  it("prefere urgência imediata como primary no merge", () => {
    const gaps: BriefingGap[] = [
      { gap: "baixa-first", urgencia: "baixa", evidencia_regulatoria: "Art. 14 LC 214/2025" },
      { gap: "imediata-second", urgencia: "imediata", evidencia_regulatoria: "Art. 14 LC 214/2025" },
    ];
    const out = consolidateGapsByArticle(gaps);
    expect(out).toHaveLength(1);
    expect(out[0].urgencia).toBe("imediata");
    // Primary = o de maior urgência
    expect(out[0].gap?.startsWith("imediata-second")).toBe(true);
    // Outro entra na lista "Também cobre"
    expect(out[0].gap).toContain("baixa-first");
  });
});
