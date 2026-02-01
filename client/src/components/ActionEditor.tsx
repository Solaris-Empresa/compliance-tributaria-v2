/**
 * Componente para Edição de Ações dos Planos de Ação
 * Sprint V18 - Sistema de Edição Completo + Auditoria
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Action {
  id: number;
  projectId: number;
  category: "corporate" | "branch";
  branchId: number | null;
  title: string;
  description: string | null;
  responsibleArea: "TI" | "CONT" | "FISC" | "JUR" | "OPS" | "COM" | "ADM";
  taskType: "STRATEGIC" | "OPERATIONAL" | "COMPLIANCE";
  priority: "baixa" | "media" | "alta" | "critica";
  status: "SUGGESTED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  ownerId: number;
  startDate: Date;
  deadline: Date;
  dependsOn: number | null;
  estimatedHours: number | null;
}

interface ActionEditorProps {
  action: Action;
  projectId: number;
  onSuccess?: () => void;
}

export function ActionEditDialog({ action, projectId, onSuccess }: ActionEditorProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: action.title,
    description: action.description || "",
    responsibleArea: action.responsibleArea,
    taskType: action.taskType,
    priority: action.priority,
    status: action.status,
    startDate: new Date(action.startDate).toISOString().split("T")[0],
    deadline: new Date(action.deadline).toISOString().split("T")[0],
    estimatedHours: action.estimatedHours || 0,
  });

  const utils = trpc.useUtils();
  const updateMutation = trpc.actionsCrud.update.useMutation({
    onSuccess: () => {
      toast.success("Ação atualizada com sucesso!");
      utils.actionsCrud.list.invalidate();
      setOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar ação: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      actionId: action.id,
      projectId,
      ...formData,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Ação</DialogTitle>
          <DialogDescription>
            Modifique os campos da ação. Todas as alterações serão registradas no log de auditoria.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="responsibleArea">Área Responsável *</Label>
              <Select
                value={formData.responsibleArea}
                onValueChange={(value: any) => setFormData({ ...formData, responsibleArea: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TI">TI</SelectItem>
                  <SelectItem value="CONT">Contabilidade</SelectItem>
                  <SelectItem value="FISC">Fiscal/Tributário</SelectItem>
                  <SelectItem value="JUR">Jurídico</SelectItem>
                  <SelectItem value="OPS">Operações</SelectItem>
                  <SelectItem value="COM">Comercial</SelectItem>
                  <SelectItem value="ADM">Administrativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taskType">Tipo de Tarefa *</Label>
              <Select
                value={formData.taskType}
                onValueChange={(value: any) => setFormData({ ...formData, taskType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRATEGIC">Estratégica</SelectItem>
                  <SelectItem value="OPERATIONAL">Operacional</SelectItem>
                  <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUGGESTED">Sugerido</SelectItem>
                  <SelectItem value="IN_PROGRESS">Em Progresso</SelectItem>
                  <SelectItem value="COMPLETED">Concluído</SelectItem>
                  <SelectItem value="OVERDUE">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Prazo *</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedHours">Horas Estimadas</Label>
            <Input
              id="estimatedHours"
              type="number"
              value={formData.estimatedHours}
              onChange={(e) => setFormData({ ...formData, estimatedHours: parseInt(e.target.value) || 0 })}
              min="0"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ActionDeleteButtonProps {
  action: Action;
  projectId: number;
  onSuccess?: () => void;
}

export function ActionDeleteButton({ action, projectId, onSuccess }: ActionDeleteButtonProps) {
  const [open, setOpen] = useState(false);

  const utils = trpc.useUtils();
  const deleteMutation = trpc.actionsCrud.delete.useMutation({
    onSuccess: () => {
      toast.success("Ação excluída com sucesso!");
      utils.actionsCrud.list.invalidate();
      setOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir ação: ${error.message}`);
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate({
      actionId: action.id,
      projectId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir a ação "{action.title}"? Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ActionCreateDialogProps {
  projectId: number;
  category: "corporate" | "branch";
  branchId?: number;
  ownerId: number;
  onSuccess?: () => void;
}

export function ActionCreateDialog({ projectId, category, branchId, ownerId, onSuccess }: ActionCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    responsibleArea: "FISC" as const,
    taskType: "COMPLIANCE" as const,
    priority: "media" as const,
    status: "SUGGESTED" as const,
    startDate: new Date().toISOString().split("T")[0],
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    estimatedHours: 0,
  });

  const utils = trpc.useUtils();
  const createMutation = trpc.actionsCrud.create.useMutation({
    onSuccess: () => {
      toast.success("Ação criada com sucesso!");
      utils.actionsCrud.list.invalidate();
      setOpen(false);
      setFormData({
        title: "",
        description: "",
        responsibleArea: "FISC",
        taskType: "COMPLIANCE",
        priority: "media",
        status: "SUGGESTED",
        startDate: new Date().toISOString().split("T")[0],
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        estimatedHours: 0,
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Erro ao criar ação: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      projectId,
      category,
      branchId,
      ownerId,
      ...formData,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Ação
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Ação</DialogTitle>
          <DialogDescription>
            Adicione uma nova ação ao plano. Todas as ações são registradas no log de auditoria.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-title">Título *</Label>
            <Input
              id="new-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Ex: Implementar novo sistema de controle fiscal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-description">Descrição</Label>
            <Textarea
              id="new-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Descreva os detalhes da ação..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-responsibleArea">Área Responsável *</Label>
              <Select
                value={formData.responsibleArea}
                onValueChange={(value: any) => setFormData({ ...formData, responsibleArea: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TI">TI</SelectItem>
                  <SelectItem value="CONT">Contabilidade</SelectItem>
                  <SelectItem value="FISC">Fiscal/Tributário</SelectItem>
                  <SelectItem value="JUR">Jurídico</SelectItem>
                  <SelectItem value="OPS">Operações</SelectItem>
                  <SelectItem value="COM">Comercial</SelectItem>
                  <SelectItem value="ADM">Administrativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-taskType">Tipo de Tarefa *</Label>
              <Select
                value={formData.taskType}
                onValueChange={(value: any) => setFormData({ ...formData, taskType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRATEGIC">Estratégica</SelectItem>
                  <SelectItem value="OPERATIONAL">Operacional</SelectItem>
                  <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-priority">Prioridade *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUGGESTED">Sugerido</SelectItem>
                  <SelectItem value="IN_PROGRESS">Em Progresso</SelectItem>
                  <SelectItem value="COMPLETED">Concluído</SelectItem>
                  <SelectItem value="OVERDUE">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-startDate">Data de Início *</Label>
              <Input
                id="new-startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-deadline">Prazo *</Label>
              <Input
                id="new-deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-estimatedHours">Horas Estimadas</Label>
            <Input
              id="new-estimatedHours"
              type="number"
              value={formData.estimatedHours}
              onChange={(e) => setFormData({ ...formData, estimatedHours: parseInt(e.target.value) || 0 })}
              min="0"
              placeholder="0"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Ação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
