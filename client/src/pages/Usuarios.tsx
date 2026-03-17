import { useState, useMemo } from "react";
import ComplianceLayout from "@/components/ComplianceLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Users, Search, Shield, UserCheck, UserX, RefreshCw,
  Mail, Building2, Phone, Calendar, Crown, User,
} from "lucide-react";
import { ROLES } from "@shared/translations";

const ROLE_OPTIONS = [
  { value: "all", label: "Todos os papéis" },
  { value: "cliente", label: "Cliente" },
  { value: "equipe_solaris", label: "Equipe SOLARIS" },
  { value: "advogado_senior", label: "Advogado Sênior" },
  { value: "advogado_junior", label: "Advogado Júnior" },
];

const ROLE_COLORS: Record<string, string> = {
  equipe_solaris: "bg-purple-100 text-purple-800 border-purple-200",
  advogado_senior: "bg-blue-100 text-blue-800 border-blue-200",
  advogado_junior: "bg-sky-100 text-sky-800 border-sky-200",
  cliente: "bg-green-100 text-green-800 border-green-200",
};

const ROLE_ICONS: Record<string, React.ElementType> = {
  equipe_solaris: Crown,
  advogado_senior: Shield,
  advogado_junior: Shield,
  cliente: User,
};

export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [confirmUser, setConfirmUser] = useState<{
    id: number; name: string; currentRole: string;
  } | null>(null);
  const [newRole, setNewRole] = useState("");

  const { data: users, isLoading, refetch } = trpc.users.list.useQuery(undefined, {
    enabled: currentUser?.role === "equipe_solaris" || currentUser?.role === "advogado_senior",
  });
  const { data: stats } = trpc.users.getStats.useQuery(undefined, {
    enabled: currentUser?.role === "equipe_solaris" || currentUser?.role === "advogado_senior",
  });

  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Papel atualizado com sucesso!");
      refetch();
      setConfirmUser(null);
      setNewRole("");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao atualizar papel");
    },
  });

  const filtered = useMemo(() => {
    if (!users) return [];
    return users.filter(u => {
      const matchSearch = !search ||
        (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.companyName || "").toLowerCase().includes(search.toLowerCase());
      const matchRole = filterRole === "all" || u.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [users, search, filterRole]);

  const handleRoleChange = (userId: number, userName: string, currentRole: string, role: string) => {
    if (role === currentRole) return;
    setConfirmUser({ id: userId, name: userName, currentRole });
    setNewRole(role);
  };

  const confirmRoleChange = () => {
    if (!confirmUser || !newRole) return;
    updateRole.mutate({ userId: confirmUser.id, role: newRole as any });
  };

  // Acesso restrito
  if (currentUser && currentUser.role !== "equipe_solaris" && currentUser.role !== "advogado_senior") {
    return (
      <ComplianceLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Acesso Restrito</h2>
            <p className="text-muted-foreground mt-2">Apenas a equipe SOLARIS pode acessar esta página.</p>
          </div>
        </div>
      </ComplianceLayout>
    );
  }

  return (
    <ComplianceLayout>
      <div className="max-w-6xl mx-auto space-y-6 py-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Gerenciamento de Usuários
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie papéis e permissões dos usuários da plataforma
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground mt-1">Total de Usuários</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold text-green-700">{stats.byRole?.cliente || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Clientes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold text-purple-700">
                  {(stats.byRole?.equipe_solaris || 0) + (stats.byRole?.advogado_senior || 0) + (stats.byRole?.advogado_junior || 0)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Equipe Interna</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold text-blue-700">{stats.recentSignups}</div>
                <div className="text-xs text-muted-foreground mt-1">Novos (7 dias)</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou empresa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Filtrar por papel" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || filterRole !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterRole("all"); }}>
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Contador */}
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Carregando..." : `${filtered.length} usuário${filtered.length !== 1 ? "s" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`}
          {(search || filterRole !== "all") && users ? ` de ${users.length} total` : ""}
        </p>

        {/* Lista */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-36" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <UserX className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p>Nenhum usuário encontrado com os filtros aplicados.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map(u => {
                  const Icon = ROLE_ICONS[u.role || "cliente"] || User;
                  return (
                    <div key={u.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                      {/* Avatar */}
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${ROLE_COLORS[u.role || "cliente"]}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{u.name || "Sem nome"}</span>
                          {u.id === currentUser?.id && (
                            <Badge variant="outline" className="text-xs">Você</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                          {u.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />{u.email}
                            </span>
                          )}
                          {u.companyName && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />{u.companyName}
                            </span>
                          )}
                          {u.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />{u.phone}
                            </span>
                          )}
                          {u.lastSignedIn && (
                            <span className="flex items-center gap-1 text-muted-foreground/60">
                              <Calendar className="h-3 w-3" />
                              {new Date(u.lastSignedIn).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Badge de role */}
                      <Badge className={`text-xs shrink-0 hidden sm:flex ${ROLE_COLORS[u.role || "cliente"]}`}>
                        {ROLES[u.role as keyof typeof ROLES] || u.role}
                      </Badge>

                      {/* Select de role — apenas para outros usuários */}
                      {u.id !== currentUser?.id ? (
                        <Select
                          value={u.role || "cliente"}
                          onValueChange={role => handleRoleChange(u.id, u.name || "Usuário", u.role || "cliente", role)}
                        >
                          <SelectTrigger className="w-44 h-8 text-xs shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cliente">Cliente</SelectItem>
                            <SelectItem value="equipe_solaris">Equipe SOLARIS</SelectItem>
                            <SelectItem value="advogado_senior">Advogado Sênior</SelectItem>
                            <SelectItem value="advogado_junior">Advogado Júnior</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="w-44 shrink-0 text-xs text-muted-foreground text-right pr-1">
                          (sua conta)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de confirmação */}
      <Dialog open={!!confirmUser} onOpenChange={() => { setConfirmUser(null); setNewRole(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Confirmar Mudança de Papel
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Alterar o papel de <strong>{confirmUser?.name}</strong>:
            </p>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Badge className={`text-xs ${ROLE_COLORS[confirmUser?.currentRole || "cliente"]}`}>
                {ROLES[confirmUser?.currentRole as keyof typeof ROLES] || confirmUser?.currentRole}
              </Badge>
              <span className="text-muted-foreground text-sm">→</span>
              <Badge className={`text-xs ${ROLE_COLORS[newRole] || ROLE_COLORS.cliente}`}>
                {ROLES[newRole as keyof typeof ROLES] || newRole}
              </Badge>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
              Esta ação altera as permissões imediatamente. O usuário precisará fazer login novamente para que as mudanças tenham efeito.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmUser(null); setNewRole(""); }}>
              Cancelar
            </Button>
            <Button onClick={confirmRoleChange} disabled={updateRole.isPending} className="gap-2">
              {updateRole.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ComplianceLayout>
  );
}
