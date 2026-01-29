// @ts-nocheck
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Search, Mail, Phone } from "lucide-react";
import { Link } from "wouter";

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: clientes, isLoading } = trpc.users.listClients.useQuery();

  const clientesFiltrados = clientes?.filter(cliente =>
    cliente.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.cnpj?.includes(searchTerm)
  );

  return (
    <ComplianceLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Clientes</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os clientes da plataforma
            </p>
          </div>
          <Button asChild>
            <Link href="/clientes/novo">
                <Plus className="h-4 w-4" />
                Novo Cliente
              </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, empresa ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Lista de Clientes */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Carregando clientes...
          </div>
        ) : clientesFiltrados && clientesFiltrados.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clientesFiltrados.map((cliente) => (
              <Card key={cliente.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{cliente.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {cliente.companyName || "Sem empresa"}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cliente.cnpj && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">CNPJ</Badge>
                      <span className="text-muted-foreground">{cliente.cnpj}</span>
                    </div>
                  )}
                  {cliente.segment && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">Segmento</Badge>
                      <span className="text-muted-foreground">{cliente.segment}</span>
                    </div>
                  )}
                  {cliente.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{cliente.email}</span>
                    </div>
                  )}
                  {cliente.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{cliente.phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
              <p className="text-muted-foreground text-center mb-6">
                {searchTerm
                  ? "Tente ajustar os filtros de busca"
                  : "Comece cadastrando seu primeiro cliente"}
              </p>
              <Button asChild>
                <Link href="/clientes/novo">
                    <Plus className="h-4 w-4" />
                    Cadastrar Primeiro Cliente
                  </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ComplianceLayout>
  );
}
