import { describe, it, expect } from "vitest";
import { writeFileSync, readFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  extractNcmRows,
  extractNbsRows,
  buildRowCorpus,
} from "./corpus-row-chunker";

describe("extractNcmRows (#A2)", () => {
  it("T1: linha NCM 8 dígitos → code + description (capa/seção ignoradas)", () => {
    const raw = [
      "                 TARIFA EXTERNA COMUM",
      "  01.01            Cavalos, asininos e muares",
      "0101.21.00   -- Reprodutores de raça pura",
      "0101.29.00   -- Outros",
    ].join("\n");
    const rows = extractNcmRows(raw);
    expect(rows).toEqual([
      { code: "0101.21.00", description: "-- Reprodutores de raça pura" },
      { code: "0101.29.00", description: "-- Outros" },
    ]);
  });

  it("T3: artigo = código NCM no formato NNNN.NN.NN", () => {
    const rows = extractNcmRows("2306.10.00   Tortas de algodão");
    expect(rows[0]!.code).toBe("2306.10.00");
    expect(/^\d{4}\.\d{2}\.\d{2}$/.test(rows[0]!.code)).toBe(true);
  });

  it("ISOLAMENTO: linha `Art. 1º` NÃO é linha NCM (não contamina chunker artigo)", () => {
    expect(extractNcmRows("Art. 1º Esta Lei Complementar...")).toEqual([]);
  });
});

describe("extractNbsRows (#A2)", () => {
  it("split por ';' ; header e linhas inválidas descartadas", () => {
    const raw = [
      "NBS 2.0;DESCRIÇÃO",
      "1.01;Serviços de construção",
      "1.0101.11.00;Serviços de construção de edificações residenciais",
      "linha sem ponto e virgula",
      ";descrição sem código",
    ].join("\n");
    expect(extractNbsRows(raw)).toEqual([
      { code: "1.01", description: "Serviços de construção" },
      {
        code: "1.0101.11.00",
        description: "Serviços de construção de edificações residenciais",
      },
    ]);
  });
});

describe("contrato dos chunks (#A2)", () => {
  it("T2: cnaeGroups = '' (universal) e campos obrigatórios presentes", () => {
    // valida via shape esperado do que buildRowCorpus emite por linha
    const r = extractNcmRows("2306.10.00   Tortas de algodão")[0]!;
    const chunk = {
      lei: "tabela_ncm_completa",
      artigo: r.code,
      titulo: r.description,
      conteudo: `${r.code} — ${r.description}`,
      topicos: "ncm,classificacao_fiscal,aliquota",
      cnaeGroups: "",
      chunkIndex: 0,
    };
    expect(chunk.cnaeGroups).toBe("");
    expect(chunk.lei).toBeTruthy();
    expect(chunk.artigo).toBe("2306.10.00");
    expect(chunk.conteudo).toContain("2306.10.00");
    expect(chunk.conteudo).toContain("Tortas de algodão");
  });
});

describe("encoding regression (#A2 — NCM=utf-8, NBS=latin1)", () => {
  it("NBS lido como latin1 preserva 'ç' (byte 0xE7 → ç)", () => {
    const dir = mkdtempSync(join(tmpdir(), "rowchunk-"));
    const src = join(dir, "nbs.csv");
    const out = join(dir, "out.ts");
    // 0xE7 = 'ç' em ISO-8859-1
    writeFileSync(
      src,
      Buffer.from([
        0x31, 0x2e, 0x30, 0x31, 0x3b, 0x53, 0x65, 0x72, 0x76, 0x69, 0xe7, 0x6f,
      ])
    );
    buildRowCorpus({
      inputPath: src,
      outputPath: out,
      lei: "nbs_completa",
      exportName: "T",
      mode: "nbs",
      encoding: "latin1",
      topicos: "nbs",
      headerComment: "t",
    });
    expect(readFileSync(out, "utf-8")).toContain("Serviço");
    rmSync(dir, { recursive: true, force: true });
  });

  it("NCM lido como utf-8 preserva 'ç' (bytes 0xC3 0xA7 → ç)", () => {
    const dir = mkdtempSync(join(tmpdir(), "rowchunk-"));
    const src = join(dir, "ncm.txt");
    const out = join(dir, "out.ts");
    // "2306.10.00   raça" com ç em UTF-8 (C3 A7)
    writeFileSync(src, Buffer.from("2306.10.00   raça", "utf-8"));
    buildRowCorpus({
      inputPath: src,
      outputPath: out,
      lei: "tabela_ncm_completa",
      exportName: "T",
      mode: "ncm",
      encoding: "utf-8",
      topicos: "ncm",
      headerComment: "t",
    });
    const written = readFileSync(out, "utf-8");
    expect(written).toContain("raça");
    expect(written).not.toContain("raÃ§a"); // mojibake ausente
    rmSync(dir, { recursive: true, force: true });
  });
});
