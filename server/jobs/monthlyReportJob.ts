/**
 * monthlyReportJob.ts — Sprint L2
 *
 * Job agendado que gera e envia o relatório executivo mensal do CPIE
 * automaticamente no dia configurado em cpie_settings.monthlyReportDay.
 *
 * Estratégia:
 *   - Cron roda todo dia à 08:00 (horário do servidor)
 *   - Verifica se hoje é o dia configurado E se o relatório ainda não foi
 *     gerado este mês (lastMonthlyReportAt < início do mês atual)
 *   - Se sim: gera o relatório via generateMonthlyReportHtml() e notifica o owner
 *   - Persiste o timestamp e log na tabela cpie_settings
 */

import cron from "node-cron";
import { getDb } from "../db";
import { cpieSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { generateMonthlyReportHtml } from "../cpie";

let jobInitialized = false;

export function initMonthlyReportJob() {
  if (jobInitialized) return;
  jobInitialized = true;

  // Roda todo dia às 08:00 (horário do servidor)
  cron.schedule("0 8 * * *", async () => {
    try {
      await runMonthlyReportIfDue();
    } catch (err) {
      console.error("[monthlyReportJob] Erro inesperado:", err);
    }
  });

  console.log("[monthlyReportJob] Cron de relatório mensal inicializado (diário às 08:00).");
}

export async function runMonthlyReportIfDue(): Promise<{ ran: boolean; reason?: string }> {
  const drizzle = await getDb();
  if (!drizzle) return { ran: false, reason: "DB indisponível" };

  // Buscar configurações
  const rows = await drizzle.select().from(cpieSettings).limit(1);
  let settings = rows[0];

  // Criar singleton se não existir
  if (!settings) {
    await drizzle.insert(cpieSettings).values({ id: 1 });
    settings = { id: 1, minScoreToAdvance: 30, batchSizeLimit: 50, gateEnabled: 1, monthlyReportDay: 1, lastMonthlyReportAt: null, lastJobLog: null, updatedAt: null, updatedById: null };
  }

  const today = new Date();
  const todayDay = today.getDate();
  const configuredDay = settings.monthlyReportDay ?? 1;

  // Verificar se hoje é o dia configurado
  if (todayDay !== configuredDay) {
    return { ran: false, reason: `Hoje é dia ${todayDay}, relatório configurado para dia ${configuredDay}` };
  }

  // Verificar se já foi gerado este mês
  if (settings.lastMonthlyReportAt) {
    const lastRun = new Date(settings.lastMonthlyReportAt);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    if (lastRun >= startOfMonth) {
      return { ran: false, reason: `Relatório já gerado este mês em ${lastRun.toLocaleString("pt-BR")}` };
    }
  }

  // Gerar relatório
  const now = Date.now();
  let logMsg = "";
  try {
    const { html, monthName, year, stats } = await generateMonthlyReportHtml();

    // Notificar owner com resumo
    const content = [
      `**Período:** ${monthName}/${year}`,
      `**Total de projetos:** ${stats.total}`,
      `**Score médio CPIE:** ${stats.avgScore}%`,
      `**Projetos com risco alto:** ${stats.highRisk}`,
      `**Projetos com score baixo (<50%):** ${stats.lowScore}`,
      `**Projetos excelentes (≥80%):** ${stats.excellent}`,
      "",
      "O relatório completo está disponível no painel de Consistência em /admin/consistencia.",
    ].join("\n");

    await notifyOwner({
      title: `📊 Relatório Mensal CPIE — ${monthName}/${year}`,
      content,
    });

    logMsg = `OK: relatório ${monthName}/${year} gerado em ${new Date(now).toLocaleString("pt-BR")} | ${stats.total} projetos, score médio ${stats.avgScore}%`;
    console.log(`[monthlyReportJob] ${logMsg}`);

    // Suprimir aviso de html não utilizado — o relatório é enviado via notifyOwner
    void html;
  } catch (err) {
    logMsg = `ERRO: ${String(err)}`;
    console.error(`[monthlyReportJob] ${logMsg}`);
  }

  // Persistir log e timestamp
  await drizzle.update(cpieSettings)
    .set({ lastMonthlyReportAt: now, lastJobLog: logMsg, updatedAt: now })
    .where(eq(cpieSettings.id, 1));

  return { ran: true };
}
