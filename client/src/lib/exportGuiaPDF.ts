/**
 * exportGuiaPDF — FEAT-GUIA-PRÁTICO (F-12 · ADR-GP-001)
 *
 * Exporta o guia prático (efêmero, em memória) para PDF client-side via jsPDF.
 * - Strip de emojis (jsPDF Helvetica = WinAnsi/Windows-1252 não suporta emoji).
 * - Disclaimer obrigatório (ADR-GP-001 D-2) + timestamp no rodapé.
 * - ZERO persistência: nada é gravado no banco; só download local.
 */
import jsPDF from "jspdf";
import type { RouterOutputs } from "@/lib/trpc";

type GuiaPraticoResponse = RouterOutputs["guiaPratico"]["gerar"];

export const GUIA_DISCLAIMER =
  "Conteúdo ilustrativo e orientativo, gerado por IA. NÃO substitui análise " +
  "jurídica profissional. Confira sempre a base legal citada antes de agir.";

// jsPDF Helvetica usa WinAnsi — remove emojis/símbolos fora do Latin-1.
function stripEmoji(s: string): string {
  return s
    .replace(
      /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{FE00}-\u{FE0F}\u{200D}]/gu,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

function tagLabel(tagTipo: string): string {
  switch (tagTipo) {
    case "tempo":
      return "Tempo";
    case "atencao":
      return "Atencao";
    case "referencia":
      return "Base legal";
    case "entregavel":
      return "Entregavel";
    default:
      return tagTipo;
  }
}

export function exportGuiaPDF(guia: GuiaPraticoResponse, taskTitulo: string): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 16; // margem
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const maxW = W - M * 2;
  let y = M;

  const ensure = (needed: number) => {
    if (y + needed > H - 22) {
      doc.addPage();
      y = M;
    }
  };

  const writeWrapped = (text: string, size: number, style: "normal" | "bold", lineH: number) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(stripEmoji(text), maxW) as string[];
    for (const ln of lines) {
      ensure(lineH);
      doc.text(ln, M, y);
      y += lineH;
    }
  };

  // ── Título ──────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(79, 70, 229); // indigo-600
  writeWrapped("Guia Pratico", 16, "bold", 7);
  doc.setTextColor(33, 33, 33);
  writeWrapped(taskTitulo, 12, "bold", 6);
  y += 2;

  // ── Contexto da empresa ─────────────────────────────────────────────────
  doc.setTextColor(90, 90, 90);
  writeWrapped(guia.contextoEmpresa, 9.5, "normal", 5);
  doc.setTextColor(33, 33, 33);
  y += 2;

  // ── Alerta crítico ──────────────────────────────────────────────────────
  ensure(8);
  doc.setTextColor(180, 83, 9); // amber-700
  writeWrapped("Alerta critico", 10, "bold", 5.5);
  doc.setTextColor(60, 60, 60);
  writeWrapped(guia.alertaCritico, 9.5, "normal", 5);
  doc.setTextColor(33, 33, 33);
  y += 3;

  // ── Passos ──────────────────────────────────────────────────────────────
  for (const passo of guia.passos) {
    ensure(12);
    writeWrapped(`${passo.numero}. ${passo.titulo}`, 11, "bold", 6);
    writeWrapped(passo.descricao, 9.5, "normal", 5);
    doc.setTextColor(99, 102, 241); // indigo-500
    writeWrapped(`[${tagLabel(passo.tagTipo)}] ${passo.tagTexto}`, 8.5, "normal", 4.5);
    doc.setTextColor(33, 33, 33);
    y += 2.5;
  }

  // ── Rodapé: disclaimer + timestamp em todas as páginas ──────────────────
  const stamp = new Date().toLocaleString("pt-BR");
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(220, 220, 220);
    doc.line(M, H - 18, W - M, H - 18);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    const dLines = doc.splitTextToSize(stripEmoji(GUIA_DISCLAIMER), maxW) as string[];
    let fy = H - 14;
    for (const ln of dLines) {
      doc.text(ln, M, fy);
      fy += 3.2;
    }
    doc.text(`Gerado em ${stamp}  -  pagina ${p}/${total}`, M, H - 5);
  }

  const safeTitle = stripEmoji(taskTitulo).replace(/[^\w\s-]/g, "").trim().slice(0, 40) || "guia";
  doc.save(`guia-pratico-${safeTitle.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
