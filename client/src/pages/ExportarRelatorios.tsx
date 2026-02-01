import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, FileSpreadsheet } from "lucide-react";

export default function ExportarRelatorios() {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<"tasks" | "plans" | "audit">("tasks");

  const { data: projects } = trpc.branches.list.useQuery();
  const exportExcel = trpc.reports.exportDataExcel.useMutation();
  const exportPDF = trpc.reports.exportDashboardPDF.useMutation();

  const handleExportExcel = async () => {
    try {
      const result = await exportExcel.mutateAsync({
        projectId: selectedProject === "all" ? undefined : parseInt(selectedProject),
        type: selectedType,
      });

      if (result.success && result.data) {
        const byteCharacters = atob(result.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: result.mimeType });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
    }
  };

  const handleExportPDF = async () => {
    try {
      await exportPDF.mutateAsync({
        projectId: selectedProject === "all" ? undefined : parseInt(selectedProject),
      });
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Exportar Relatórios</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Exportar para Excel
            </CardTitle>
            <CardDescription>
              Exporte dados de tarefas, planos ou auditoria para planilha Excel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Projeto</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Projetos</SelectItem>
                  {projects?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Dados</label>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as typeof selectedType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tasks">Tarefas</SelectItem>
                  <SelectItem value="plans">Planos de Ação</SelectItem>
                  <SelectItem value="audit">Histórico de Auditoria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleExportExcel} 
              disabled={exportExcel.isPending}
              className="w-full"
            >
              {exportExcel.isPending ? "Exportando..." : "Exportar Excel"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5" />
              Exportar Dashboard para PDF
            </CardTitle>
            <CardDescription>
              Gere um relatório PDF completo do Dashboard Executivo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Projeto</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Projetos</SelectItem>
                  {projects?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleExportPDF} 
              disabled={exportPDF.isPending}
              className="w-full"
            >
              {exportPDF.isPending ? "Gerando..." : "Gerar PDF"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
