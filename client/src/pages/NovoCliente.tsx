import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function NovoCliente() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    companyName: "",
    cnpj: "",
    cpf: "",
    segment: "",
    phone: "",
    observations: "",
  });

  const createClient = trpc.users.createClient.useMutation({
    onSuccess: () => {
      toast.success("Cliente cadastrado com sucesso!");
      setLocation("/clientes");
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar cliente: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }

    createClient.mutate(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ComplianceLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clientes">
              <a>
                <ArrowLeft className="h-5 w-5" />
              </a>
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Novo Cliente</h1>
            <p className="text-muted-foreground mt-1">
              Cadastre um novo cliente na plataforma
            </p>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Informações do Cliente</CardTitle>
              <CardDescription>
                Preencha os dados do cliente. Campos com * são obrigatórios.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="font-semibold">Dados Pessoais</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="João Silva"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="joao@empresa.com.br"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => handleChange("cpf", e.target.value)}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                    />
                  </div>
                </div>
              </div>

              {/* Dados da Empresa */}
              <div className="space-y-4">
                <h3 className="font-semibold">Dados da Empresa</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Razão Social</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => handleChange("companyName", e.target.value)}
                      placeholder="Empresa LTDA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => handleChange("cnpj", e.target.value)}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="segment">Segmento</Label>
                    <Input
                      id="segment"
                      value={formData.segment}
                      onChange={(e) => handleChange("segment", e.target.value)}
                      placeholder="Ex: Transporte, Varejo, Indústria"
                    />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => handleChange("observations", e.target.value)}
                  placeholder="Informações adicionais sobre o cliente..."
                  rows={4}
                />
              </div>

              {/* Botões */}
              <div className="flex gap-4 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/clientes")}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createClient.isPending}>
                  {createClient.isPending ? "Cadastrando..." : "Cadastrar Cliente"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </ComplianceLayout>
  );
}
