import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function EditarTemplate() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const templateId = parseInt(params.id || "0");
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    taxRegime: "" as "simples_nacional" | "lucro_presumido" | "lucro_real" | "mei" | "",
    businessType: "",
    companySize: "" as "mei" | "pequena" | "media" | "grande" | "",
    templateData: "",
  });

  const { data: template, isLoading } = trpc.templates.getById.useQuery({ id: templateId });

  const updateTemplate = trpc.templates.update.useMutation({
    onSuccess: () => {
      toast.success("Template atualizado com sucesso!");
      setLocation("/templates");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar template: ${error.message}`);
    },
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || "",
        taxRegime: template.taxRegime || "",
        businessType: template.businessType || "",
        companySize: template.companySize || "",
        templateData: template.templateData,
      });
    }
  }, [template]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nome do template é obrigatório");
      return;
    }

    if (!formData.templateData.trim()) {
      toast.error("Conteúdo do template é obrigatório");
      return;
    }

    // Validar JSON
    try {
      JSON.parse(formData.templateData);
    } catch (error) {
      toast.error("Conteúdo do template deve ser um JSON válido");
      return;
    }

    updateTemplate.mutate({
      id: templateId,
      name: formData.name,
      description: formData.description || undefined,
      taxRegime: formData.taxRegime || undefined,
      businessType: formData.businessType || undefined,
      companySize: formData.companySize || undefined,
      templateData: formData.templateData,
    });
  };

  // Controle de permissões
  if (user?.role !== "equipe_solaris" && user?.role !== "advogado_senior") {
    return (
      <ComplianceLayout>
        <div className="p-8">
          <p className="text-red-600">Você não tem permissão para editar templates.</p>
        </div>
      </ComplianceLayout>
    );
  }

  if (isLoading) {
    return (
      <ComplianceLayout>
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ComplianceLayout>
    );
  }

  if (!template) {
    return (
      <ComplianceLayout>
        <div className="p-8">
          <p className="text-red-600">Template não encontrado.</p>
        </div>
      </ComplianceLayout>
    );
  }

  return (
    <ComplianceLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/templates">
                <ArrowLeft className="h-4 w-4" />
                Voltar para Biblioteca
              </Link>
          </Button>
          <h1 className="text-3xl font-bold">Editar Template</h1>
          <p className="text-muted-foreground mt-1">
            Atualize as informações e o conteúdo do template
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>
                Nome e descrição do template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Template *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Template Reforma Tributária - Comércio Varejista"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva quando este template deve ser usado..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadados</CardTitle>
              <CardDescription>
                Características para filtrar templates compatíveis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Regime Tributário</Label>
                  <Select
                    value={formData.taxRegime || "none"}
                    onValueChange={(value) => setFormData({ ...formData, taxRegime: value === "none" ? "" : value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                      <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                      <SelectItem value="lucro_real">Lucro Real</SelectItem>
                      <SelectItem value="mei">MEI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Porte da Empresa</Label>
                  <Select
                    value={formData.companySize || "none"}
                    onValueChange={(value) => setFormData({ ...formData, companySize: value === "none" ? "" : value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      <SelectItem value="mei">MEI</SelectItem>
                      <SelectItem value="pequena">Pequena</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="grande">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business-type">Tipo de Negócio</Label>
                <Input
                  id="business-type"
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  placeholder="Ex: Comércio Varejista, Indústria, Serviços..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conteúdo do Template</CardTitle>
              <CardDescription>
                Estrutura JSON do plano de ação (fases, ações, tarefas)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="template-data">JSON do Plano *</Label>
                <Textarea
                  id="template-data"
                  value={formData.templateData}
                  onChange={(e) => setFormData({ ...formData, templateData: e.target.value })}
                  placeholder='{"fases": [...], "acoes": [...], "tarefas": [...]}'
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Formato JSON válido com a estrutura completa do plano de ação
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/templates")}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateTemplate.isPending}
            >
              {updateTemplate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ComplianceLayout>
  );
}
