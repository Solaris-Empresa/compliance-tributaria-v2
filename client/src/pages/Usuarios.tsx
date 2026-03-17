import { useState } from "react";
import { trpc } from "@/lib/trpc";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Users,
  Search,
  Shield,
  User,
  Crown,
  Building2,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  cliente: "Cliente",
  equipe_solaris: "Equipe SOLARIS",
  advogado_senior: "Advogado Sênior",
  advogado_junior: "Advogado Júnior",
};

const ROLE_COLORS: Record<string, string> = {
  cliente: "bg-blue-100 text-blue-700 border-blue-200",
  equipe_solaris: "bg-purple-100 text-purple-700 border-purple-200",
  advogado_senior: "bg-amber-100 text-amber-700 border-amber-200",
  advogado_junior: "bg-green-100 text-green-700 border-green-200",
};

const ROLE_ICONS: Record<string, React.ElementType> = {
  cliente: User,
  equipe_solaris: Crown,
  advogado_senior: Shield,
  advogado_junior: Shield,
};

export default function Usuarios() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("todos");

  const { data: users, isLoading, error } = trpc.users.list.useQuery(undefined, {
    enabled: user?.role === "equipe_solaris" || user?.role === "advogado_senior",
  });

  // Verificação de acesso
  if (user && user.role !== "equipe_solaris" && user.role !== "advogado_senior") {
    return (
      <ComplianceLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle className="w-12 h-12 text-destructive" />
          <p className="text-muted-foreground text-center">
            Acesso restrito. Apenas a equipe SOLARIS pode visualizar a lista de usuários.
          </p>
        </div>
      </ComplianceLayout>
    );
  }

  const filteredUsers = users?.filter((u) => {
    const matchesSearch =
      (u.name?.toLowerCase() ?? "").includes(searchTerm.toLowerCase()) ||
      (u.email?.toLowerCase() ?? "").includes(searchTerm.toLowerCase()) ||
      (u.companyName?.toLowerCase() ?? "").includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "todos" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleCounts = users?.reduce(
    (acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <ComplianceLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Usuários
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie todos os usuários cadastrados na plataforma
            </p>
          </div>
          {users && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{users.length}</span> usuários cadastrados
            </div>
          )}
        </div>

        {/* Resumo por papel */}
        {roleCounts && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Object.entries(ROLE_LABELS).map(([role, label]) => {
              const Icon = ROLE_ICONS[role] ?? User;
              const count = roleCounts[role] ?? 0;
              return (
                <button
                  key={role}
                  onClick={() => setRoleFilter(roleFilter === role ? "todos" : role)}
                  className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${
                    roleFilter === role ? "ring-2 ring-primary" : ""
                  } ${ROLE_COLORS[role]?.replace("text-", "border-").replace("bg-", "bg-") ?? "bg-muted"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-medium">{label}</span>
                  </div>
                  <div className="text-2xl font-bold">{count}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Filtros */}
        <div className="mb-6 flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Lista de usuários */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-muted-foreground">Erro ao carregar usuários. Verifique suas permissões.</p>
            </CardContent>
          </Card>
        ) : filteredUsers && filteredUsers.length > 0 ? (
          <div className="space-y-3">
            {filteredUsers.map((u) => {
              const Icon = ROLE_ICONS[u.role] ?? User;
              return (
                <Card key={u.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-4 px-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          ROLE_COLORS[u.role]?.replace("border-", "").split(" ").slice(0, 2).join(" ") ?? "bg-muted"
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground truncate">
                              {u.name ?? "Sem nome"}
                            </span>
                            <Badge className={`text-xs border shrink-0 ${ROLE_COLORS[u.role] ?? "bg-gray-100"}`}>
                              {ROLE_LABELS[u.role] ?? u.role}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                            {u.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {u.email}
                              </span>
                            )}
                            {u.companyName && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {u.companyName}
                              </span>
                            )}
                            {u.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {u.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Cadastrado em {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        #{u.id}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm || roleFilter !== "todos" ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || roleFilter !== "todos"
                  ? "Tente ajustar os filtros de busca"
                  : "Os usuários aparecerão aqui após o primeiro acesso"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ComplianceLayout>
  );
}
