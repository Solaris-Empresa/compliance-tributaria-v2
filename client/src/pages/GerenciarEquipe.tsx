// @ts-nocheck
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Users, Plus, Edit3, Trash2, Shield, Eye, Pencil,
  CheckCircle2, XCircle, Loader2, Mail, User, Crown
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type MemberRole = "admin" | "colaborador" | "visualizador";

const ROLE_CONFIG: Record<MemberRole, { label: string; description: string; icon: React.ElementType; color: string; badgeClass: string }> = {
  admin: {
    label: "Admin",
    description: "Acesso total: criar, editar e aprovar projetos, gerenciar equipe.",
    icon: Crown,
    color: "text-amber-600",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-300",
  },
  colaborador: {
    label: "Colaborador",
    description: "Pode visualizar e editar projetos, mas não pode aprovar nem gerenciar equipe.",
    icon: Pencil,
    color: "text-blue-600",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-300",
  },
  visualizador: {
    label: "Visualizador",
    description: "Apenas visualização. Não pode editar nem aprovar nada.",
    icon: Eye,
    color: "text-slate-600",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
  },
};

export default function GerenciarEquipe() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [newMember, setNewMember] = useState({ name: "", email: "", memberRole: "colaborador" as MemberRole });

  const { data: members, isLoading, refetch } = trpc.clientMembers.list.useQuery();

  const addMember = trpc.clientMembers.add.useMutation({
    onSuccess: () => {
      toast.success("Membro adicionado com sucesso!");
      setShowAddModal(false);
      setNewMember({ name: "", email: "", memberRole: "colaborador" });
      refetch();
    },
    onError: (err) => toast.error(err.message || "Erro ao adicionar membro."),
  });

  const updateMember = trpc.clientMembers.update.useMutation({
    onSuccess: () => {
      toast.success("Membro atualizado!");
      setEditingMember(null);
      refetch();
    },
    onError: (err) => toast.error(err.message || "Erro ao atualizar membro."),
  });

  const removeMember = trpc.clientMembers.remove.useMutation({
    onSuccess: () => {
      toast.success("Membro removido.");
      refetch();
    },
    onError: (err) => toast.error(err.message || "Erro ao remover membro."),
  });

  const handleAdd = () => {
    if (!newMember.name.trim() || !newMember.email.trim()) {
      toast.error("Preencha nome e e-mail.");
      return;
    }
    addMember.mutate(newMember);
  };

  const handleUpdate = () => {
    if (!editingMember) return;
    updateMember.mutate({
      id: editingMember.id,
      name: editingMember.name,
      email: editingMember.email,
      memberRole: editingMember.memberRole,
      active: editingMember.active,
    });
  };

  const handleToggleActive = (member: any) => {
    updateMember.mutate({ id: member.id, active: !member.active });
  };

  const handleRemove = (id: number) => {
    if (!confirm("Tem certeza que deseja remover este membro?")) return;
    removeMember.mutate({ id });
  };

  const activeMembers = (members || []).filter(m => m.active);
  const inactiveMembers = (members || []).filter(m => !m.active);

  return (
    <ComplianceLayout>
      <div className="max-w-4xl mx-auto space-y-6 py-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Gerenciar Equipe
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie os membros da sua equipe e seus níveis de acesso à plataforma.
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Membro
          </Button>
        </div>

        {/* Cards de papéis */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(Object.entries(ROLE_CONFIG) as [MemberRole, typeof ROLE_CONFIG[MemberRole]][]).map(([role, config]) => {
            const Icon = config.icon;
            const count = (members || []).filter(m => m.memberRole === role && m.active).length;
            return (
              <Card key={role} className="border-muted/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg bg-muted/50", config.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{config.label}</p>
                      <p className="text-xs text-muted-foreground">{count} membro{count !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{config.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Lista de membros ativos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Membros Ativos
              <Badge variant="secondary" className="ml-1">{activeMembers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Carregando membros...</span>
              </div>
            ) : activeMembers.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Users className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">Nenhum membro adicionado ainda.</p>
                <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar primeiro membro
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {activeMembers.map(member => {
                  const roleConfig = ROLE_CONFIG[member.memberRole as MemberRole];
                  const RoleIcon = roleConfig?.icon || User;
                  return (
                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{member.name}</p>
                          <Badge variant="outline" className={cn("text-xs shrink-0", roleConfig?.badgeClass)}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {roleConfig?.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingMember({ ...member })}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => handleToggleActive(member)}
                          title="Desativar membro"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemove(member.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Membros inativos */}
        {inactiveMembers.length > 0 && (
          <Card className="border-muted/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                <XCircle className="h-4 w-4" />
                Membros Inativos
                <Badge variant="secondary" className="ml-1">{inactiveMembers.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {inactiveMembers.map(member => {
                  const roleConfig = ROLE_CONFIG[member.memberRole as MemberRole];
                  return (
                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border border-dashed opacity-60 hover:opacity-80 transition-opacity">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate line-through">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => handleToggleActive(member)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Reativar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemove(member.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal de adição */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Adicionar Membro da Equipe
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome <span className="text-destructive">*</span></label>
                <Input
                  value={newMember.name}
                  onChange={e => setNewMember(m => ({ ...m, name: e.target.value }))}
                  placeholder="Nome completo..."
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">E-mail <span className="text-destructive">*</span></label>
                <Input
                  type="email"
                  value={newMember.email}
                  onChange={e => setNewMember(m => ({ ...m, email: e.target.value }))}
                  placeholder="email@empresa.com"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Papel / Nível de Acesso</label>
                <div className="space-y-2">
                  {(Object.entries(ROLE_CONFIG) as [MemberRole, typeof ROLE_CONFIG[MemberRole]][]).map(([role, config]) => {
                    const Icon = config.icon;
                    return (
                      <label key={role} className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        newMember.memberRole === role ? "border-primary bg-primary/5" : "border-muted hover:bg-muted/30"
                      )}>
                        <input
                          type="radio"
                          name="memberRole"
                          value={role}
                          checked={newMember.memberRole === role}
                          onChange={() => setNewMember(m => ({ ...m, memberRole: role }))}
                          className="mt-0.5 accent-primary"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <Icon className={cn("h-4 w-4", config.color)} />
                            <span className="text-sm font-medium">{config.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancelar</Button>
              <Button onClick={handleAdd} disabled={addMember.isPending || !newMember.name.trim() || !newMember.email.trim()}>
                {addMember.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                Adicionar Membro
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de edição */}
        <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-primary" />
                Editar Membro
              </DialogTitle>
            </DialogHeader>
            {editingMember && (
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome</label>
                  <Input
                    value={editingMember.name}
                    onChange={e => setEditingMember((m: any) => ({ ...m, name: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">E-mail</label>
                  <Input
                    type="email"
                    value={editingMember.email}
                    onChange={e => setEditingMember((m: any) => ({ ...m, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Papel / Nível de Acesso</label>
                  <div className="space-y-2">
                    {(Object.entries(ROLE_CONFIG) as [MemberRole, typeof ROLE_CONFIG[MemberRole]][]).map(([role, config]) => {
                      const Icon = config.icon;
                      return (
                        <label key={role} className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          editingMember.memberRole === role ? "border-primary bg-primary/5" : "border-muted hover:bg-muted/30"
                        )}>
                          <input
                            type="radio"
                            name="editMemberRole"
                            value={role}
                            checked={editingMember.memberRole === role}
                            onChange={() => setEditingMember((m: any) => ({ ...m, memberRole: role }))}
                            className="mt-0.5 accent-primary"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <Icon className={cn("h-4 w-4", config.color)} />
                              <span className="text-sm font-medium">{config.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingMember(null)}>Cancelar</Button>
              <Button onClick={handleUpdate} disabled={updateMember.isPending}>
                {updateMember.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ComplianceLayout>
  );
}
