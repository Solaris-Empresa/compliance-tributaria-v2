import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function NovoProjeto() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [planPeriodMonths, setPlanPeriodMonths] = useState("12");

  const { data: clients } = trpc.users.listClients.useQuery();
  const createProject = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      toast.success("Projeto criado com sucesso!");
      setLocation(`/projetos/${data.projectId}`);
    },
    onError: (error) => {
      toast.error(`Erro ao criar projeto: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Nome do projeto é obrigatório");
      return;
    }

    if (!clientId) {
      toast.error("Selecione um cliente");
      return;
    }

    if (!planPeriodMonths) {
      toast.error("Período do plano é obrigatório");
      return;
    }

    createProject.mutate({
      name: name.trim(),
      clientId: parseInt(clientId),
      planPeriodMonths: parseInt(planPeriodMonths),
    });
  };

  return (
    <ComplianceLayout>
      <div className="p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/projetos">
                <ArrowLeft className="h-4 w-4" />
                Voltar para Projetos
              </Link>
          </Button>
          <h1 className="text-3xl font-bold">Novo Projeto</h1>
          <p className="text-muted-foreground mt-1">
            Crie um novo projeto de compliance tributário
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Projeto</CardTitle>
            <CardDescription>
              Preencha os dados básicos para iniciar o assessment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome do Projeto */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Projeto *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Adequação Reforma Tributária - Transportadora XYZ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Cliente */}
              <div className="space-y-2">
                <Label htmlFor="client">Cliente *</Label>
                <Select value={clientId} onValueChange={setClientId} required>
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name || client.email}
                        {client.companyName && ` - ${client.companyName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecione o cliente responsável por este projeto
                </p>
              </div>

              {/* Período do Plano */}
              <div className="space-y-2">
                <Label htmlFor="period">Período do Plano de Ação *</Label>
                <Select
                  value={planPeriodMonths}
                  onValueChange={setPlanPeriodMonths}
                  required
                >
                  <SelectTrigger id="period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 meses</SelectItem>
                    <SelectItem value="24">24 meses</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  O período define o prazo total para execução do plano de ação
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={createProject.isPending}
                  className="flex-1"
                >
                  {createProject.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar Projeto"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  disabled={createProject.isPending}
                >
                  <Link href="/projetos">Cancelar</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-2">Próximos Passos</h3>
            <p className="text-sm text-muted-foreground">
              Após criar o projeto, você será direcionado para o Assessment Fase 1, onde coletaremos
              informações básicas sobre o regime tributário e características da empresa.
            </p>
          </CardContent>
        </Card>
      </div>
    </ComplianceLayout>
  );
}
