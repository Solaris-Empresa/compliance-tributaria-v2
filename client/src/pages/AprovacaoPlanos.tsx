import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, MessageSquare, Clock, User } from "lucide-react";
import { Skeleton } from "../components/ui/skeleton";
// Toast será implementado via alert temporariamente

export default function AprovacaoPlanos() {
  const [, setLocation] = useLocation();
  const showToast = (msg: { title: string; variant?: string }) => alert(msg.title);
  const [selectedApproval, setSelectedApproval] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewType, setReviewType] = useState<"comment" | "suggestion" | "concern" | "approval">("comment");
  const [approvalComments, setApprovalComments] = useState("");

  // Query para listar aprovações (mock projectId = 1 por enquanto)
  const { data: approvals, isLoading, refetch } = trpc.approvals.list.useQuery({ projectId: 1 });

  // Query para detalhes da aprovação selecionada
  const { data: approvalDetails } = trpc.approvals.get.useQuery(
    { approvalId: selectedApproval! },
    { enabled: !!selectedApproval }
  );

  // Mutations
  const addReviewMutation = trpc.approvals.addReview.useMutation({
    onSuccess: () => {
      showToast({ title: "Comentário adicionado com sucesso" });
      setReviewComment("");
      refetch();
    },
  });

  const approveMutation = trpc.approvals.approve.useMutation({
    onSuccess: () => {
      showToast({ title: "Plano aprovado com sucesso", variant: "default" });
      setApprovalComments("");
      setSelectedApproval(null);
      refetch();
    },
  });

  const rejectMutation = trpc.approvals.reject.useMutation({
    onSuccess: () => {
      showToast({ title: "Plano rejeitado", variant: "destructive" });
      setApprovalComments("");
      setSelectedApproval(null);
      refetch();
    },
  });

  const requestRevisionMutation = trpc.approvals.requestRevision.useMutation({
    onSuccess: () => {
      showToast({ title: "Revisão solicitada" });
      setApprovalComments("");
      setSelectedApproval(null);
      refetch();
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="mr-1 h-3 w-3" />Pendente</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-100 text-green-800"><CheckCircle2 className="mr-1 h-3 w-3" />Aprovado</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejeitado</Badge>;
      case "needs_revision":
        return <Badge variant="outline" className="bg-orange-100 text-orange-800"><AlertCircle className="mr-1 h-3 w-3" />Precisa Revisão</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getReviewTypeBadge = (type: string) => {
    switch (type) {
      case "comment":
        return <Badge variant="secondary">Comentário</Badge>;
      case "suggestion":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Sugestão</Badge>;
      case "concern":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Preocupação</Badge>;
      case "approval":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Aprovação</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!approvals || approvals.length === 0) {
    return (
      <div className="container py-8">
        <Button variant="ghost" onClick={() => setLocation("/planos-acao")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Nenhuma aprovação pendente
            </CardTitle>
            <CardDescription>
              Não há planos aguardando aprovação no momento.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Button variant="ghost" onClick={() => setLocation("/planos-acao")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Planos de Ação
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Aprovação de Planos</h1>
        <p className="text-muted-foreground">
          Revise e aprove planos de ação antes da implementação
        </p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">Pendentes ({approvals.filter(a => a.status === "pending").length})</TabsTrigger>
          <TabsTrigger value="approved">Aprovados ({approvals.filter(a => a.status === "approved").length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejeitados ({approvals.filter(a => a.status === "rejected").length})</TabsTrigger>
          <TabsTrigger value="revision">Revisão ({approvals.filter(a => a.status === "needs_revision").length})</TabsTrigger>
        </TabsList>

        {["pending", "approved", "rejected", "needs_revision"].map((statusFilter) => (
          <TabsContent key={statusFilter} value={statusFilter === "needs_revision" ? "revision" : statusFilter}>
            <div className="space-y-4">
              {approvals
                .filter((approval) => approval.status === statusFilter)
                .map((approval) => (
                  <Card key={approval.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 mb-2">
                            Plano {approval.planType === "corporate" ? "Corporativo" : "por Ramo"}
                            {getStatusBadge(approval.status)}
                          </CardTitle>
                          <CardDescription>
                            Solicitado em {new Date(approval.requestedAt).toLocaleDateString("pt-BR")}
                            {approval.reviewedAt && ` • Revisado em ${new Date(approval.reviewedAt).toLocaleDateString("pt-BR")}`}
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedApproval(approval.id)}
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </CardHeader>
                    {approval.reviewComments && (
                      <CardContent>
                        <div className="bg-muted p-3 rounded-md">
                          <p className="text-sm font-medium mb-1">Comentários do Revisor:</p>
                          <p className="text-sm">{approval.reviewComments}</p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Modal de Detalhes da Aprovação */}
      {selectedApproval && approvalDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 mb-2">
                    Plano {approvalDetails.planType === "corporate" ? "Corporativo" : "por Ramo"}
                    {getStatusBadge(approvalDetails.status)}
                  </CardTitle>
                  <CardDescription>
                    Versão {approvalDetails.version} • ID do Plano: {approvalDetails.planId}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedApproval(null)}>
                  ✕
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Reviews */}
              {approvalDetails.reviews && approvalDetails.reviews.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Comentários e Revisões ({approvalDetails.reviews.length})
                  </h3>
                  <div className="space-y-3">
                    {approvalDetails.reviews.map((review) => (
                      <div key={review.id} className="bg-muted p-4 rounded-md">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium">Revisor #{review.reviewerId}</span>
                            {getReviewTypeBadge(review.reviewType)}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <p className="text-sm">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Adicionar Comentário */}
              {approvalDetails.status === "pending" && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Adicionar Comentário</h3>
                  <div className="space-y-3">
                    <Select value={reviewType} onValueChange={(v: any) => setReviewType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comment">Comentário</SelectItem>
                        <SelectItem value="suggestion">Sugestão</SelectItem>
                        <SelectItem value="concern">Preocupação</SelectItem>
                        <SelectItem value="approval">Aprovação</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Digite seu comentário..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={3}
                    />
                    <Button
                      onClick={() =>
                        addReviewMutation.mutate({
                          approvalId: selectedApproval,
                          comment: reviewComment,
                          reviewType,
                        })
                      }
                      disabled={!reviewComment.trim() || addReviewMutation.isPending}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Adicionar Comentário
                    </Button>
                  </div>
                </div>
              )}

              {/* Ações de Aprovação */}
              {approvalDetails.status === "pending" && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-3">Decisão Final</h3>
                  <Textarea
                    placeholder="Comentários opcionais..."
                    value={approvalComments}
                    onChange={(e) => setApprovalComments(e.target.value)}
                    rows={2}
                    className="mb-4"
                  />
                  <div className="flex gap-3">
                    <Button
                      variant="default"
                      onClick={() =>
                        approveMutation.mutate({
                          approvalId: selectedApproval,
                          comments: approvalComments,
                        })
                      }
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Aprovar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        requestRevisionMutation.mutate({
                          approvalId: selectedApproval,
                          comments: approvalComments || "Revisão necessária",
                        })
                      }
                      disabled={requestRevisionMutation.isPending}
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Solicitar Revisão
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() =>
                        rejectMutation.mutate({
                          approvalId: selectedApproval,
                          comments: approvalComments || "Plano rejeitado",
                        })
                      }
                      disabled={!approvalComments.trim() || rejectMutation.isPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
