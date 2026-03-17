import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Send,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = "briefing" | "matrizes" | "plano_acao";

interface StepCommentsProps {
  projectId: number;
  step: Step;
  /** Título exibido no cabeçalho da seção */
  title?: string;
  /** Inicia colapsado */
  defaultCollapsed?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  equipe_solaris: "Equipe SOLARIS",
  advogado_senior: "Advogado Sênior",
  advogado_junior: "Advogado Júnior",
  cliente: "Cliente",
};

const ROLE_COLORS: Record<string, string> = {
  equipe_solaris: "bg-blue-100 text-blue-800",
  advogado_senior: "bg-purple-100 text-purple-800",
  advogado_junior: "bg-indigo-100 text-indigo-800",
  cliente: "bg-green-100 text-green-800",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "agora mesmo";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function StepComments({
  projectId,
  step,
  title = "Anotações da Equipe",
  defaultCollapsed = false,
}: StepCommentsProps) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const utils = trpc.useUtils();

  const { data: comments = [], isLoading } = trpc.stepComments.list.useQuery(
    { projectId, step },
    { enabled: !collapsed }
  );

  const addMutation = trpc.stepComments.add.useMutation({
    onSuccess: () => {
      setNewComment("");
      utils.stepComments.list.invalidate({ projectId, step });
      toast.success("Anotação adicionada");
    },
    onError: (err) => toast.error(err.message || "Erro ao adicionar anotação"),
  });

  const editMutation = trpc.stepComments.edit.useMutation({
    onSuccess: () => {
      setEditingId(null);
      utils.stepComments.list.invalidate({ projectId, step });
      toast.success("Anotação atualizada");
    },
    onError: (err) => toast.error(err.message || "Erro ao editar anotação"),
  });

  const deleteMutation = trpc.stepComments.delete.useMutation({
    onSuccess: () => {
      utils.stepComments.list.invalidate({ projectId, step });
      toast.success("Anotação removida");
    },
    onError: (err) => toast.error(err.message || "Erro ao remover anotação"),
  });

  const handleAdd = () => {
    const content = newComment.trim();
    if (!content) return;
    addMutation.mutate({ projectId, step, content });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAdd();
    }
  };

  const startEdit = (id: number, content: string) => {
    setEditingId(id);
    setEditContent(content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const confirmEdit = (id: number) => {
    const content = editContent.trim();
    if (!content) return;
    editMutation.mutate({ commentId: id, content });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Remover esta anotação?")) return;
    deleteMutation.mutate({ commentId: id });
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newComment]);

  const commentCount = comments.length;

  return (
    <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">
              {commentCount === 0
                ? "Nenhuma anotação ainda"
                : `${commentCount} anotaç${commentCount === 1 ? "ão" : "ões"}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {commentCount > 0 && (
            <Badge variant="secondary" className="text-xs font-medium">
              {commentCount}
            </Badge>
          )}
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="border-t border-border">
          {/* Input de novo comentário */}
          <div className="px-5 py-4 bg-muted/20">
            <div className="flex gap-3">
              <Avatar className="w-8 h-8 shrink-0 mt-1">
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                  {user?.name ? getInitials(user.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex flex-col gap-2">
                <Textarea
                  ref={textareaRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Adicione uma anotação... (Ctrl+Enter para enviar)"
                  className="min-h-[72px] resize-none text-sm bg-background"
                  maxLength={2000}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {newComment.length}/2000
                  </span>
                  <Button
                    size="sm"
                    onClick={handleAdd}
                    disabled={!newComment.trim() || addMutation.isPending}
                    className="gap-2"
                  >
                    {addMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Enviar
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de comentários */}
          <div className="divide-y divide-border">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Carregando anotações...</span>
              </div>
            ) : comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <MessageSquare className="w-8 h-8 opacity-30" />
                <p className="text-sm">Seja o primeiro a adicionar uma anotação</p>
              </div>
            ) : (
              comments.map((comment) => {
                const isOwner = user?.id === comment.userId;
                const canModify = isOwner || user?.role === "equipe_solaris";
                const isEditing = editingId === comment.id;

                return (
                  <div key={comment.id} className="px-5 py-4 hover:bg-muted/20 transition-colors group">
                    <div className="flex gap-3">
                      <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                        <AvatarFallback className="text-xs bg-muted font-semibold">
                          {getInitials(comment.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        {/* Autor + role + timestamp */}
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {comment.userName}
                          </span>
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full font-medium",
                              ROLE_COLORS[comment.userRole] || "bg-muted text-muted-foreground"
                            )}
                          >
                            {ROLE_LABELS[comment.userRole] || comment.userRole}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatRelativeTime(comment.createdAt)}
                            {comment.isEdited && (
                              <span className="ml-1 italic">(editado)</span>
                            )}
                          </span>
                        </div>

                        {/* Conteúdo ou editor */}
                        {isEditing ? (
                          <div className="flex flex-col gap-2">
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="min-h-[72px] resize-none text-sm"
                              maxLength={2000}
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEdit}
                                className="gap-1.5"
                              >
                                <X className="w-3.5 h-3.5" />
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => confirmEdit(comment.id)}
                                disabled={!editContent.trim() || editMutation.isPending}
                                className="gap-1.5"
                              >
                                {editMutation.isPending ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                Salvar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                            {comment.content}
                          </p>
                        )}
                      </div>

                      {/* Ações (visíveis no hover) */}
                      {canModify && !isEditing && (
                        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7"
                            onClick={() => startEdit(comment.id, comment.content)}
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(comment.id)}
                            title="Excluir"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
