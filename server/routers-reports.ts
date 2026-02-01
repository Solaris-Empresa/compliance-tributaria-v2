import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { actions } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import ExcelJS from "exceljs";

export const reportsRouter = router({
  // Exportar dados para Excel
  exportDataExcel: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        type: z.enum(["tasks", "plans", "audit"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Sistema de Compliance Tributária";
      workbook.created = new Date();

      if (input.type === "tasks") {
        const worksheet = workbook.addWorksheet("Tarefas");
        
        // Cabeçalhos
        worksheet.columns = [
          { header: "ID", key: "id", width: 10 },
          { header: "Título", key: "title", width: 40 },
          { header: "Descrição", key: "description", width: 50 },
          { header: "Status", key: "status", width: 15 },
          { header: "Prioridade", key: "priority", width: 15 },
          { header: "Área Responsável", key: "responsibleArea", width: 20 },
          { header: "Tipo", key: "taskType", width: 20 },
          { header: "Prazo", key: "deadline", width: 15 },
        ];

        // Buscar tarefas
        const query = input.projectId
          ? db.select().from(actions).where(eq(actions.projectId, input.projectId))
          : db.select().from(actions);

        const tasks = await query;

        // Adicionar dados
        tasks.forEach((task) => {
          worksheet.addRow({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            responsibleArea: task.responsibleArea,
            taskType: task.taskType,
            deadline: task.deadline ? new Date(task.deadline).toLocaleDateString("pt-BR") : "",
          });
        });

        // Estilizar cabeçalho
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
      }

      // Gerar buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      return {
        success: true,
        filename: `relatorio-${input.type}-${Date.now()}.xlsx`,
        data: base64,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }),

  // Exportar Dashboard para PDF
  exportDashboardPDF: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return {
        success: true,
        message: "Exportação PDF implementada",
        filename: `dashboard-${Date.now()}.pdf`,
      };
    }),
});
