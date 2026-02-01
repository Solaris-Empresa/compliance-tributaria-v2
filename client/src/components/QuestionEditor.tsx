/**
 * Componente para Edição de Questões dos Questionários
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
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  question: string;
  type: "text" | "boolean" | "multiple_choice" | "number";
  options?: string[];
  required?: boolean;
}

interface QuestionEditDialogProps {
  question: Question;
  projectId: number;
  branchId: number;
  onSuccess?: () => void;
}

export function QuestionEditDialog({ question, projectId, branchId, onSuccess }: QuestionEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<{
    question: string;
    type: "text" | "boolean" | "multiple_choice" | "number";
    options: string;
    required: boolean;
  }>({
    question: question.question,
    type: question.type,
    options: question.options?.join("\n") || "",
    required: question.required || false,
  });

  const utils = trpc.useUtils();
  const updateMutation = trpc.questionsCrud.branch.updateQuestion.useMutation({
    onSuccess: () => {
      toast.success("Questão atualizada com sucesso!");
      utils.questionsCrud.branch.list.invalidate();
      setOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar questão: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates: any = {
      question: formData.question,
      type: formData.type,
      required: formData.required,
    };

    if (formData.type === "multiple_choice" && formData.options) {
      updates.options = formData.options.split("\n").filter(o => o.trim());
    }

    updateMutation.mutate({
      projectId,
      branchId,
      questionId: question.id,
      updates,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Questão</DialogTitle>
          <DialogDescription>
            Modifique a questão. Todas as alterações serão registradas no log de auditoria.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Questão *</Label>
            <Textarea
              id="question"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              required
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Resposta *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: any) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texto</SelectItem>
                <SelectItem value="boolean">Sim/Não</SelectItem>
                <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                <SelectItem value="number">Número</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.type === "multiple_choice" && (
            <div className="space-y-2">
              <Label htmlFor="options">Opções (uma por linha) *</Label>
              <Textarea
                id="options"
                value={formData.options}
                onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                rows={5}
                placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="required"
              checked={formData.required}
              onCheckedChange={(checked) => setFormData({ ...formData, required: checked as boolean })}
            />
            <Label htmlFor="required" className="cursor-pointer">
              Questão obrigatória
            </Label>
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

interface QuestionDeleteButtonProps {
  question: Question;
  projectId: number;
  branchId: number;
  onSuccess?: () => void;
}

export function QuestionDeleteButton({ question, projectId, branchId, onSuccess }: QuestionDeleteButtonProps) {
  const [open, setOpen] = useState(false);

  const utils = trpc.useUtils();
  const deleteMutation = trpc.questionsCrud.branch.deleteQuestion.useMutation({
    onSuccess: () => {
      toast.success("Questão excluída com sucesso!");
      utils.questionsCrud.branch.list.invalidate();
      setOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir questão: ${error.message}`);
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate({
      projectId,
      branchId,
      questionId: question.id,
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
            Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita.
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

interface QuestionCreateDialogProps {
  projectId: number;
  branchId: number;
  onSuccess?: () => void;
}

export function QuestionCreateDialog({ projectId, branchId, onSuccess }: QuestionCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<{
    question: string;
    type: "text" | "boolean" | "multiple_choice" | "number";
    options: string;
    required: boolean;
  }>({
    question: "",
    type: "text",
    options: "",
    required: false,
  });

  const utils = trpc.useUtils();
  const createMutation = trpc.questionsCrud.branch.addQuestion.useMutation({
    onSuccess: () => {
      toast.success("Questão criada com sucesso!");
      utils.questionsCrud.branch.list.invalidate();
      setOpen(false);
      setFormData({
        question: "",
        type: "text",
        options: "",
        required: false,
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Erro ao criar questão: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const questionData: any = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      question: formData.question,
      type: formData.type,
      required: formData.required,
    };

    if (formData.type === "multiple_choice" && formData.options) {
      questionData.options = formData.options.split("\n").filter(o => o.trim());
    }

    createMutation.mutate({
      projectId,
      branchId,
      question: questionData,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Questão
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Nova Questão</DialogTitle>
          <DialogDescription>
            Adicione uma nova questão ao questionário. Todas as questões são registradas no log de auditoria.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-question">Questão *</Label>
            <Textarea
              id="new-question"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              required
              rows={3}
              placeholder="Digite a questão..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-type">Tipo de Resposta *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: any) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texto</SelectItem>
                <SelectItem value="boolean">Sim/Não</SelectItem>
                <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                <SelectItem value="number">Número</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.type === "multiple_choice" && (
            <div className="space-y-2">
              <Label htmlFor="new-options">Opções (uma por linha) *</Label>
              <Textarea
                id="new-options"
                value={formData.options}
                onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                rows={5}
                placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="new-required"
              checked={formData.required}
              onCheckedChange={(checked) => setFormData({ ...formData, required: checked as boolean })}
            />
            <Label htmlFor="new-required" className="cursor-pointer">
              Questão obrigatória
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Questão"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
