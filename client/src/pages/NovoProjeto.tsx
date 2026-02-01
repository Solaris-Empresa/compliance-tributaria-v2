
import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Building2 } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function NovoProjeto() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [planPeriodMonths, setPlanPeriodMonths] = useState("12");
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);

  const { data: clients } = trpc.users.listClients.useQuery();
  const { data: branches, isLoading: loadingBranches } = trpc.branches.list.useQuery();
  
  const createProject = trpc.projects.create.useMutation({
    onSuccess: async (data) => {
      // Adicionar ramos ao projeto
      if (selectedBranches.length > 0) {
        try {
          // Adicionar ramos um por um
          for (const branchId of selectedBranches) {
            await addBranchesToProject.mutateAsync({
              projectId: data.projectId,
              branchId,
            });
          }
        } catch (error) {
          console.error("Erro ao adicionar ramos:", error);
        }
      }
      
      toast.success("Projeto criado com sucesso!");
      setLocation(`/projetos/${data.projectId}`);
    },
    onError: (error) => {
      toast.error(`Erro ao criar projeto: ${error.message}`);
    },
  });

  const addBranchesToProject = trpc.branches.addToProject.useMutation();

  const handleBranchToggle = (branchId: number) => {
    setSelectedBranches(prev =>
      prev.includes(branchId)
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

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

    if (selectedBranches.length === 0) {
      toast.error("Selecione pelo menos um ramo de atividade");
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
              Preencha os dados básicos e selecione os ramos de atividade
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
                <Select value={clientId} onValueChange={(value) => {
                  console.log('Select onChange:', value);
                  setClientId(value);
                }} required>
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

              {/* Ramos de Atividade */}
              <div className="space-y-3">
                <Label>Ramos de Atividade *</Label>
                <p className="text-xs text-muted-foreground">
                  Selecione os ramos de atividade da empresa (mínimo 1)
                </p>
                
                {loadingBranches ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-lg p-4">
                    {branches?.map((branch) => (
                      <div key={branch.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`branch-${branch.id}`}
                          checked={selectedBranches.includes(branch.id)}
                          onCheckedChange={() => handleBranchToggle(branch.id)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={`branch-${branch.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            <Building2 className="h-3 w-3 inline mr-1" />
                            {branch.name}
                          </label>
                          {branch.description && (
                            <p className="text-xs text-muted-foreground">
                              {branch.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedBranches.length > 0 && (
                  <p className="text-xs text-green-600">
                    ✓ {selectedBranches.length} ramo(s) selecionado(s)
                  </p>
                )}
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
                <button
                  type="submit"
                  disabled={createProject.isPending || addBranchesToProject.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {(createProject.isPending || addBranchesToProject.isPending) ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </span>
                  ) : (
                    "Criar Projeto"
                  )}
                </button>
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
              Após criar o projeto, você responderá o <strong>Questionário Corporativo</strong> e os 
              <strong> Questionários por Ramo</strong> selecionados. Com base nas respostas, serão gerados 
              o <strong>Plano Corporativo</strong> e os <strong>Planos por Ramo</strong> com tarefas específicas.
            </p>
          </CardContent>
        </Card>
      </div>
    </ComplianceLayout>
  );
}
