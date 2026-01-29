import { useState } from "react";
import { trpc } from "@/lib/trpc";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText, 
  Eye, 
  Edit2,
  Trash2, 
  TrendingUp,
  Filter,
  X,
  Download,
} from "lucide-react";
import { Link } from "wouter";
import { TAX_REGIME, COMPANY_SIZE } from "@shared/translations";
import { toast } from "sonner";

type TaxRegime = "simples_nacional" | "lucro_presumido" | "lucro_real" | "mei";
type CompanySize = "mei" | "pequena" | "media" | "grande";

interface Template {
  id: number;
  name: string;
  description: string | null;
  taxRegime: TaxRegime | null;
  businessType: string | null;
  companySize: CompanySize | null;
  templateData: string;
  usageCount: number;
  createdAt: Date;
  createdBy: number;
}

export default function BibliotecaTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [filters, setFilters] = useState<{
    taxRegime?: TaxRegime;
    companySize?: CompanySize;
  }>({});

  const { data: templates = [], refetch } = trpc.templates.list.useQuery();

  const deleteTemplateMutation = trpc.templates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template excluído com sucesso");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir template: ${error.message}`);
    },
  });

  const handleViewTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setIsViewDialogOpen(true);
  };

  const exportPdfMutation = trpc.templates.exportToPdf.useMutation({
    onSuccess: (data) => {
      // Converter base64 para blob e fazer download
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF exportado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao exportar PDF: ${error.message}`);
    },
  });

  const handleExportPdf = (templateId: number, templateName: string) => {
    toast.info('Gerando PDF...');
    exportPdfMutation.mutate({ id: templateId });
  };

  const handleDeleteTemplate = (templateId: number, templateName: string) => {
    if (confirm(`Tem certeza que deseja excluir o template "${templateName}"?`)) {
      deleteTemplateMutation.mutate({ id: templateId });
    }
  };

  const filteredTemplates = templates.filter(template => {
    if (filters.taxRegime && template.taxRegime !== filters.taxRegime) {
      return false;
    }
    if (filters.companySize && template.companySize !== filters.companySize) {
      return false;
    }
    return true;
  });

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = filters.taxRegime || filters.companySize;

  const parseTemplateData = (data: string) => {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  };

  return (
    <ComplianceLayout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Biblioteca de Templates</h1>
          <p className="text-gray-600 mt-2">
            Gerencie templates de planos de ação reutilizáveis para acelerar novos projetos
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Templates</p>
                  <p className="text-3xl font-bold">{templates.length}</p>
                </div>
                <FileText className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Mais Usado</p>
                  <p className="text-xl font-bold truncate">
                    {templates.length > 0
                      ? templates.reduce((prev, curr) =>
                          (curr.usageCount || 0) > (prev.usageCount || 0) ? curr : prev
                        ).name
                      : "—"}
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Uso Total</p>
                  <p className="text-3xl font-bold">
                    {templates.reduce((sum, t) => sum + (t.usageCount || 0), 0)}
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                <CardTitle>Filtros</CardTitle>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Regime Tributário</label>
                <Select
                  value={filters.taxRegime || "all"}
                  onValueChange={(value) =>
                    setFilters({ ...filters, taxRegime: value === "all" ? undefined : (value as TaxRegime) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="simples_nacional">{TAX_REGIME.simples_nacional}</SelectItem>
                    <SelectItem value="lucro_presumido">{TAX_REGIME.lucro_presumido}</SelectItem>
                    <SelectItem value="lucro_real">{TAX_REGIME.lucro_real}</SelectItem>
                    <SelectItem value="mei">{TAX_REGIME.mei}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Porte da Empresa</label>
                <Select
                  value={filters.companySize || "all"}
                  onValueChange={(value) =>
                    setFilters({ ...filters, companySize: value === "all" ? undefined : (value as CompanySize) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="mei">{COMPANY_SIZE.mei}</SelectItem>
                    <SelectItem value="pequena">{COMPANY_SIZE.pequena}</SelectItem>
                    <SelectItem value="media">{COMPANY_SIZE.media}</SelectItem>
                    <SelectItem value="grande">{COMPANY_SIZE.grande}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Templates */}
        <div className="grid gap-6">
          {filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {hasActiveFilters
                    ? "Nenhum template encontrado com os filtros aplicados"
                    : "Nenhum template disponível ainda"}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="mt-4">
                    Limpar Filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription className="mt-2">{template.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewTemplate(template)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link href={`/templates/${template.id}/editar`} className="flex items-center gap-2">
                          <Edit2 className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportPdf(template.id, template.name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id, template.name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.taxRegime && (
                      <Badge variant="secondary">
                        {TAX_REGIME[template.taxRegime]}
                      </Badge>
                    )}
                    {template.companySize && (
                      <Badge variant="secondary">
                        {COMPANY_SIZE[template.companySize]}
                      </Badge>
                    )}
                    {template.businessType && (
                      <Badge variant="outline">{template.businessType}</Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span>Usado {template.usageCount || 0} vezes</span>
                      <span>•</span>
                      <span>Criado em {new Date(template.createdAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Dialog de Visualização */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTemplate?.name}</DialogTitle>
              {selectedTemplate?.description && (
                <DialogDescription>{selectedTemplate.description}</DialogDescription>
              )}
            </DialogHeader>

            {selectedTemplate && (
              <div className="space-y-6">
                {/* Metadados */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Regime Tributário</p>
                    <p className="text-sm">
                      {selectedTemplate.taxRegime
                        ? TAX_REGIME[selectedTemplate.taxRegime]
                        : "Não especificado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Porte da Empresa</p>
                    <p className="text-sm">
                      {selectedTemplate.companySize
                        ? COMPANY_SIZE[selectedTemplate.companySize]
                        : "Não especificado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Tipo de Negócio</p>
                    <p className="text-sm">{selectedTemplate.businessType || "Não especificado"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Uso</p>
                    <p className="text-sm">{selectedTemplate.usageCount || 0} vezes</p>
                  </div>
                </div>

                {/* Conteúdo do Template */}
                <div>
                  <h4 className="font-semibold mb-3">Conteúdo do Plano</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {JSON.stringify(parseTemplateData(selectedTemplate.templateData), null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ComplianceLayout>
  );
}
