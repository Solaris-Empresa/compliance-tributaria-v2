import { useParams, Link } from "wouter";
import { ArrowLeft, FileText, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExportActions } from "@/hooks/compliance-v3/useExportActions";
import { toast } from "sonner";

export default function ExportsV3() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { exportCsv, exportPdf, isExporting, lastExportFilename } = useExportActions(projectId);

  const handleExportPdf = async () => {
    try {
      await exportPdf();
      toast.success("PDF gerado com sucesso!");
    } catch {
      toast.error("Erro ao gerar PDF. Tente novamente.");
    }
  };

  const handleExportCsv = async () => {
    try {
      await exportCsv();
      toast.success("CSV exportado com sucesso!");
    } catch {
      toast.error("Erro ao exportar CSV. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4 flex items-center gap-3">
        <Link href={`/projetos/${projectId}/compliance-v3`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold">Exportar Relatórios</h1>
          <p className="text-xs text-muted-foreground">Relatório Tributário — Reforma Tributária v3</p>
        </div>
      </div>

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PDF Export */}
          <Card className="border-2 hover:border-blue-300 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2.5 bg-red-50">
                  <FileText className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Relatório Executivo PDF</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Sumário + Riscos + Plano de Ação</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>✓ Sumário executivo com análise de IA</p>
                  <p>✓ Radar de compliance por domínio</p>
                  <p>✓ Top 10 riscos críticos</p>
                  <p>✓ Plano de ação priorizado</p>
                  <p>✓ Formato HTML renderizável</p>
                </div>
                <Button
                  className="w-full"
                  onClick={handleExportPdf}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</>
                  ) : (
                    <><Download className="w-4 h-4 mr-2" /> Exportar PDF</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* CSV Export */}
          <Card className="border-2 hover:border-green-300 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2.5 bg-green-50">
                  <FileSpreadsheet className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Relatório Técnico CSV</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Dados completos para análise</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>✓ Seção 1: Scores por requisito</p>
                  <p>✓ Seção 2: Gaps identificados</p>
                  <p>✓ Seção 3: Matriz de riscos</p>
                  <p>✓ Seção 4: Plano de ação</p>
                  <p>✓ Encoding UTF-8 com BOM</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleExportCsv}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exportando...</>
                  ) : (
                    <><Download className="w-4 h-4 mr-2" /> Exportar CSV</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {lastExportFilename && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            ✓ Último arquivo exportado: <strong>{lastExportFilename}</strong>
          </div>
        )}

        <div className="rounded-lg bg-muted/40 border px-4 py-3 text-xs text-muted-foreground">
          <strong>Nota:</strong> Os relatórios são gerados com base nos dados do assessment mais recente.
          Execute um assessment completo antes de exportar para obter dados atualizados.
        </div>
      </div>
    </div>
  );
}
