/**
 * generateDiagnosticoPDF.ts — Sprint Z-16 #626
 * PDF client-side via jsPDF + autoTable
 * RN-CV4-11 (disclaimer) + RN-CV4-12 (jsPDF)
 * Leitura defensiva: data_fim ?? '—'
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  classifyExposicao,
  EXPOSICAO_CONFIG,
  getMetaInfo,
  META_EXPOSICAO,
} from "./exposicao-risco-thresholds";

export interface DiagnosticoPDFData {
  cnpj?: string;
  empresa?: string;
  cnaes?: string[];
  score: number;
  nivel: string;
  totalAlta: number;
  totalMedia: number;
  risks: Array<{
    titulo: string;
    categoria: string;
    severidade: string;
    artigo: string;
    source_priority: string;
    rag_validated?: number;
  }>;
  opportunities: Array<{
    titulo: string;
    categoria: string;
    artigo: string;
  }>;
  plans: Array<{
    titulo: string;
    responsavel: string;
    prazo: string;
    status: string;
    tasks?: Array<{
      titulo: string;
      status: string;
      data_fim?: string | null;
    }>;
  }>;
}

const DISCLAIMER = `AVISO LEGAL: Este diagnóstico é uma ferramenta de apoio à decisão tributária elaborada com base nas informações fornecidas pela empresa. Os resultados apresentados — incluindo a identificação de riscos, oportunidades e planos de ação — NÃO constituem parecer jurídico. Toda classificação e recomendação deve ser validada por advogado tributarista ou contador habilitado antes de qualquer ação fiscal, contábil ou de compliance. IA SOLARIS não se responsabiliza por decisões tomadas sem a devida validação profissional.`;

const CATEGORIA_LABELS: Record<string, string> = {
  imposto_seletivo: "Imposto Seletivo",
  confissao_automatica: "Confissão Automática",
  split_payment: "Split Payment",
  inscricao_cadastral: "Inscrição Cadastral",
  regime_diferenciado: "Regime Diferenciado",
  transicao_iss_ibs: "Transição ISS/IBS",
  obrigacao_acessoria: "Obrigação Acessória",
  aliquota_zero: "Alíquota Zero",
  aliquota_reduzida: "Alíquota Reduzida",
  credito_presumido: "Crédito Presumido",
};

export function generateDiagnosticoPDF(data: DiagnosticoPDFData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  // ─── Header ─────────────────────────────────────────────────────────
  doc.setFillColor(15, 68, 124); // blue-800
  doc.rect(0, 0, pageW, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Diagnóstico de Adequação Tributária", margin, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Reforma Tributária — LC 214/2025`, margin, 21);
  if (data.cnpj) doc.text(`CNPJ: ${data.cnpj}`, margin, 27);
  doc.text(
    `Gerado em: ${new Date().toLocaleDateString("pt-BR")}`,
    pageW - margin, 27, { align: "right" }
  );
  y = 40;

  // ─── Disclaimer (topo) ──────────────────────────────────────────────
  doc.setTextColor(120, 80, 0);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  const disclaimerLines = doc.splitTextToSize(DISCLAIMER, pageW - margin * 2);
  doc.text(disclaimerLines, margin, y);
  y += disclaimerLines.length * 3 + 6;

  // ─── Score / Exposição ao Risco (issue #802) ────────────────────────
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Exposição ao Risco de Compliance", margin, y);
  y += 5;

  // Subtítulo
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text(
    "O objetivo não é aumentar o indicador. É reduzir a exposição ao risco.",
    margin,
    y
  );
  y += 6;

  // Alerta anti-erro
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(146, 64, 14); // amber-800
  const alertaLines = doc.splitTextToSize(
    "ATENÇÃO: Este indicador mede EXPOSIÇÃO ao risco — não o nível de compliance. Quanto MENOR o valor, MELHOR a situação.",
    pageW - margin * 2
  );
  doc.text(alertaLines, margin, y);
  y += alertaLines.length * 3.5 + 2;

  // Classificação UX (fonte única de verdade — #802)
  const level = classifyExposicao(data.score);
  const cfg = EXPOSICAO_CONFIG[level];
  const meta = getMetaInfo(data.score);
  doc.setTextColor(30, 30, 30);

  const distanciaRow =
    meta.distancia === 0
      ? "0 pontos · meta atingida"
      : `${meta.distancia} pontos para ${meta.distanciaLabel}`;

  autoTable(doc, {
    startY: y,
    head: [["Indicador", "Valor"]],
    body: [
      ["Exposição atual", `${data.score} / 100 pontos  ↓`],
      ["Nível", `${cfg.emoji} ${cfg.label}`],
      ["Interpretação", cfg.interpretation],
      ["Ação recomendada", cfg.action],
      ["Meta", `≤ ${META_EXPOSICAO} pontos`],
      ["Distância até a meta", distanciaRow],
      ["Riscos Alta Severidade", String(data.totalAlta)],
      ["Riscos Média Severidade", String(data.totalMedia)],
      ["Total Oportunidades", String(data.opportunities.length)],
      ["Total Planos", String(data.plans.length)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 68, 124] },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // Tabela Limites Ideais (thresholds)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Limites Ideais (thresholds)", margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Faixa", "Nível", "Interpretação", "Ação"]],
    body: [
      ["0–30", "🟢 Baixa exposição", "Situação controlada", "Manter monitoramento"],
      ["31–55", "🟡 Exposição moderada", "Riscos relevantes", "Revisar aprovações"],
      ["56–75", "🟠 Alta exposição", "Exposição significativa", "Priorizar mitigação"],
      ["76–100", "🔴 Exposição crítica", "Alto risco de não conformidade", "Ação imediata"],
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [100, 100, 100] },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // Nota pedagógica
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(30, 64, 175); // blue-800
  const notaLines = doc.splitTextToSize(
    "Projetos com riscos aprovados normalmente começam com exposição entre 56 e 75. A redução ocorre conforme os riscos são tratados ou removidos.",
    pageW - margin * 2
  );
  doc.text(notaLines, margin, y);
  y += notaLines.length * 3.5 + 2;

  // Frase final
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(
    "O verde não é o ponto de partida. É o resultado do trabalho.",
    margin,
    y
  );
  y += 8;

  // ─── Riscos Aprovados ───────────────────────────────────────────────
  if (data.risks.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Riscos Aprovados", margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Risco", "Categoria", "Severidade", "Origem", "Base Legal", "RAG"]],
      body: data.risks.map((r) => [
        r.titulo.length > 40 ? r.titulo.slice(0, 40) + "…" : r.titulo,
        CATEGORIA_LABELS[r.categoria] ?? r.categoria,
        r.severidade,
        r.source_priority?.toUpperCase() ?? "—",
        r.artigo || "—",
        r.rag_validated ? "✓" : "—",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [163, 45, 45] }, // red-800
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ─── Oportunidades ──────────────────────────────────────────────────
  if (data.opportunities.length > 0) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Oportunidades Tributárias", margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Oportunidade", "Categoria", "Base Legal"]],
      body: data.opportunities.map((o) => [
        o.titulo.length > 50 ? o.titulo.slice(0, 50) + "…" : o.titulo,
        CATEGORIA_LABELS[o.categoria] ?? o.categoria,
        o.artigo || "—",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 109, 17] }, // green-800
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ─── Planos de Ação ─────────────────────────────────────────────────
  if (data.plans.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Planos de Ação", margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Plano", "Responsável", "Prazo", "Status"]],
      body: data.plans.map((p) => [
        p.titulo.length > 40 ? p.titulo.slice(0, 40) + "…" : p.titulo,
        p.responsavel,
        p.prazo,
        p.status,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [24, 95, 165] }, // blue-700
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ─── Disclaimer (rodapé) ────────────────────────────────────────────
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setTextColor(120, 80, 0);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text(disclaimerLines, margin, y);

  // ─── Save ───────────────────────────────────────────────────────────
  const cnpjSlug = (data.cnpj ?? "sem-cnpj").replace(/\D/g, "");
  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`diagnostico-${cnpjSlug}-${dateSlug}.pdf`);
}
