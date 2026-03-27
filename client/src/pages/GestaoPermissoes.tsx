import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Shield, UserPlus, Trash2 } from "lucide-react";

const PERMISSION_LEVELS = [
  { value: "view", label: "Visualizar", color: "bg-blue-500" },
  { value: "edit", label: "Editar", color: "bg-green-500" },
  { value: "approve", label: "Aprovar", color: "bg-purple-500" },
  { value: "admin", label: "Administrador", color: "bg-red-500" },
];

const AREAS = [
  { value: "TI", label: "TI" },
  { value: "CONT", label: "Contabilidade e Fiscal" },
  { value: "FISC", label: "Fiscal" },
  { value: "JUR", label: "Jurídico" },
  { value: "OPS", label: "Operações" },
  { value: "COM", label: "Comercial" },
  { value: "ADM", label: "Administrativo" },
];

export default function GestaoPermissoes() {
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("view");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: projects } = trpc.branches.list.useQuery();
  // TODO: Implementar listUsers no backend
  const users: any[] = [];
  const { data: permissions, refetch } = trpc.permissions.list.useQuery(
    { projectId: selectedProject ? parseInt(selectedProject) : 0 },
    { enabled: !!selectedProject }
  );

  const grantPermission = trpc.permissions.create.useMutation({
    onSuccess: () => {
      refetch();
      setDialogOpen(false);
      setSelectedUser("");
      setSelectedLevel("view");
      setSelectedAreas([]);
    },
  });

  const revokePermission = trpc.permissions.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const handleGrantPermission = () => {
    if (!selectedProject || !selectedUser) return;

    grantPermission.mutate({
      projectId: parseInt(selectedProject),
      userId: parseInt(selectedUser),
      permissionLevel: selectedLevel as any,
      areas: selectedAreas.length > 0 ? (selectedAreas as any) : undefined,
    });
  };

  const toggleArea = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Gestão de Permissões
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie permissões de usuários por projeto
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedProject}>
              <UserPlus className="h-4 w-4 mr-2" />
              Conceder Permissão
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conceder Permissão</DialogTitle>
              <DialogDescription>
                Atribua permissões a um usuário para este projeto
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Usuário</label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Nível de Permissão</label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERMISSION_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Áreas (opcional)</label>
                <div className="flex flex-wrap gap-2">
                  {AREAS.map((area) => (
                    <Badge
                      key={area.value}
                      variant={selectedAreas.includes(area.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleArea(area.value)}
                    >
                      {area.label}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Deixe vazio para acesso a todas as áreas
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleGrantPermission}
                disabled={!selectedUser || grantPermission.isPending}
              >
                {grantPermission.isPending ? "Concedendo..." : "Conceder"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Selecione um Projeto</CardTitle>
          <CardDescription>
            Escolha um projeto para visualizar e gerenciar permissões
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um projeto" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project: any) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProject && permissions && (
        <Card>
          <CardHeader>
            <CardTitle>Matriz de Acesso</CardTitle>
            <CardDescription>
              {permissions.length} permiss{permissions.length === 1 ? "ão" : "ões"} ativa{permissions.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {permissions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma permissão concedida para este projeto
              </p>
            ) : (
              <div className="space-y-4">
                {permissions.map((perm: any) => {
                  const level = PERMISSION_LEVELS.find((l) => l.value === perm.level);
                  return (
                    <div
                      key={perm.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{perm.user?.name || "Usuário"}</span>
                          <Badge className={level?.color}>{level?.label}</Badge>
                        </div>
                        {perm.areas && perm.areas.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {perm.areas.map((area: string) => {
                              const areaInfo = AREAS.find((a) => a.value === area);
                              return (
                                <Badge key={area} variant="outline">
                                  {areaInfo?.label || area}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
          revokePermission.mutate({ id: perm.id })
                        }
                        disabled={revokePermission.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
