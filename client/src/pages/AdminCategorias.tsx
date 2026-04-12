/**
 * AdminCategorias.tsx — Sprint Z-09 / ADR-0025
 *
 * Painel de administração das categorias de risco configuráveis.
 * Rota: /admin/categorias
 *
 * Seções:
 *   1. Sugestões pendentes (RAG sensor) — com chunk de origem expandível
 *   2. Categorias ativas — com edição e desativação
 *
 * Resolve: GAP-ARCH-08 (SLA 15 dias) · GAP-ARCH-09 (chunk de origem)
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronRight, Clock, Plus, Edit2, Power } from "lucide-react";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

type Severidade = "alta" | "media" | "oportunidade";
type Urgencia   = "imediata" | "curto_prazo" | "medio_prazo";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de display
// ─────────────────────────────────────────────────────────────────────────────

function SeveridadeBadge({ v }: { v: string }) {
  const map: Record<string, string> = {
    alta: "bg-red-100 text-red-800 border-red-200",
    media: "bg-amber-100 text-amber-800 border-amber-200",
    oportunidade: "bg-green-100 text-green-800 border-green-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${map[v] ?? "bg-gray-100 text-gray-800"}`}>
      {v}
    </span>
  );
}

function StatusBadge({ v }: { v: string }) {
  const map: Record<string, string> = {
    ativo: "bg-emerald-100 text-emerald-800",
    sugerido: "bg-blue-100 text-blue-800",
    pendente_revisao: "bg-amber-100 text-amber-800",
    inativo: "bg-gray-100 text-gray-500",
    legado: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[v] ?? "bg-gray-100"}`}>
      {v}
    </span>
  );
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  // BUG-TZ-01: mysql2 retorna DATE como Date JS com hora 05:00:00 UTC.
  // toLocaleDateString('pt-BR') convertia para BRT, exibindo 31/12/2025.
  // Fix: extrair data em UTC via toISOString().slice(0,10).
  const iso = d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente: Linha de sugestão expandível (GAP-ARCH-09)
// ─────────────────────────────────────────────────────────────────────────────

function SugestaoRow({
  s,
  onApprove,
  onReject,
}: {
  s: any;
  onApprove: (s: any) => void;
  onReject: (s: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow className={s.sla_vencido ? "bg-amber-50" : ""}>
        <TableCell>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm font-mono text-gray-700 hover:text-gray-900"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {s.codigo}
          </button>
        </TableCell>
        <TableCell className="max-w-[200px] truncate text-sm">{s.nome}</TableCell>
        <TableCell className="text-xs text-gray-600">{s.artigo_base}</TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className={`text-xs ${s.sla_vencido ? "text-amber-700 font-semibold" : "text-gray-500"}`}>
              {s.dias_pendente}d
              {s.sla_vencido && " ⚠ SLA"}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs text-green-700 border-green-300 hover:bg-green-50"
              onClick={() => onApprove(s)}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Aprovar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs text-red-700 border-red-300 hover:bg-red-50"
              onClick={() => onReject(s)}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Rejeitar
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded && s.chunkOrigem && (
        <TableRow>
          <TableCell colSpan={5} className="bg-slate-50 p-4">
            <div className="text-xs space-y-2">
              <div className="font-semibold text-slate-700">
                Chunk de origem — {s.chunkOrigem.lei.toUpperCase()} · {s.chunkOrigem.artigo}
              </div>
              <div className="font-medium text-slate-600">{s.chunkOrigem.titulo}</div>
              <div className="text-slate-500 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto border rounded p-2 bg-white">
                {s.chunkOrigem.conteudo}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
      {expanded && !s.chunkOrigem && (
        <TableRow>
          <TableCell colSpan={5} className="bg-slate-50 p-3 text-xs text-slate-400 italic">
            Chunk de origem não disponível (sugestão manual ou chunk removido).
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminCategorias() {
  const { user } = useAuth();

  // Queries
  const { data: suggestions, isLoading: loadingSugg, refetch: refetchSugg } =
    trpc.adminCategories.listSuggestions.useQuery();
  const { data: allCategories, isLoading: loadingCats, refetch: refetchCats } =
    trpc.adminCategories.listAllCategories.useQuery();

  // Mutations
  const approveMutation = trpc.adminCategories.approveSuggestion.useMutation({
    onSuccess: () => { refetchSugg(); refetchCats(); toast.success("Categoria aprovada com sucesso"); },
    onError: (e) => toast.error(`Erro ao aprovar: ${e.message}`),
  });
  const rejectMutation = trpc.adminCategories.rejectSuggestion.useMutation({
    onSuccess: () => { refetchSugg(); refetchCats(); toast.success("Sugestão rejeitada"); },
    onError: (e) => toast.error(`Erro ao rejeitar: ${e.message}`),
  });
  const upsertMutation = trpc.adminCategories.upsertCategory.useMutation({
    onSuccess: () => { refetchCats(); toast.success("Categoria salva com sucesso"); setShowUpsertModal(false); },
    onError: (e) => toast.error(`Erro ao salvar: ${e.message}`),
  });

  // State: modais
  const [approveTarget, setApproveTarget] = useState<any | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState("");
  const [showUpsertModal, setShowUpsertModal] = useState(false);
  const [upsertTarget, setUpsertTarget] = useState<any | null>(null);

  // State: form de aprovação
  const [approveSeveridade, setApproveSeveridade] = useState<Severidade>("media");
  const [approveUrgencia, setApproveUrgencia] = useState<Urgencia>("curto_prazo");
  const [approveVigenciaFim, setApproveVigenciaFim] = useState("");

  // State: form upsert
  const [upsertForm, setUpsertForm] = useState({
    codigo: "", nome: "", severidade: "media" as Severidade,
    urgencia: "curto_prazo" as Urgencia, tipo: "risk" as "risk" | "opportunity",
    artigo_base: "", lei_codigo: "LC-214-2025",
    vigencia_inicio: "2026-01-01", vigencia_fim: "",
    origem: "manual" as "lei_federal" | "regulamentacao" | "rag_sensor" | "manual",
    escopo: "nacional" as "nacional" | "estadual" | "setorial",
  });

  // Acesso restrito
  if (user && user.role !== "equipe_solaris") {
    return (
      <div className="p-8 text-center text-gray-500">
        Acesso restrito à equipe SOLARIS.
      </div>
    );
  }

  // Filtrar categorias ativas para a tabela principal
  const activeCategories = allCategories?.filter((c: any) => c.status === "ativo") ?? [];
  const inactiveCategories = allCategories?.filter((c: any) => c.status !== "ativo") ?? [];

  const handleApproveOpen = (s: any) => {
    setApproveTarget(s);
    setApproveSeveridade("media");
    setApproveUrgencia("curto_prazo");
    setApproveVigenciaFim("");
  };

  const handleApproveConfirm = () => {
    if (!approveTarget) return;
    approveMutation.mutate({
      id: approveTarget.id,
      aprovadoPor: user?.name ?? "equipe_solaris",
      severidade: approveSeveridade,
      urgencia: approveUrgencia,
      vigencia_fim: approveVigenciaFim || null,
    });
    setApproveTarget(null);
  };

  const handleRejectConfirm = () => {
    if (!rejectTarget) return;
    rejectMutation.mutate({ id: rejectTarget.id, motivo: rejectMotivo || "rejeitado pelo admin" });
    setRejectTarget(null);
    setRejectMotivo("");
  };

  const handleUpsertOpen = (cat?: any) => {
    if (cat) {
      setUpsertForm({
        codigo: cat.codigo,
        nome: cat.nome,
        severidade: cat.severidade,
        urgencia: cat.urgencia,
        tipo: cat.tipo,
        artigo_base: cat.artigo_base,
        lei_codigo: cat.lei_codigo,
        vigencia_inicio: cat.vigencia_inicio
          ? (cat.vigencia_inicio instanceof Date
              ? cat.vigencia_inicio.toISOString().slice(0, 10)
              : String(cat.vigencia_inicio).slice(0, 10))
          : "2026-01-01",
        vigencia_fim: cat.vigencia_fim
          ? (cat.vigencia_fim instanceof Date
              ? cat.vigencia_fim.toISOString().slice(0, 10)
              : String(cat.vigencia_fim).slice(0, 10))
          : "",
        origem: cat.origem,
        escopo: cat.escopo,
      });
      setUpsertTarget(cat);
    } else {
      setUpsertForm({
        codigo: "", nome: "", severidade: "media", urgencia: "curto_prazo",
        tipo: "risk", artigo_base: "", lei_codigo: "LC-214-2025",
        vigencia_inicio: "2026-01-01", vigencia_fim: "",
        origem: "manual", escopo: "nacional",
      });
      setUpsertTarget(null);
    }
    setShowUpsertModal(true);
  };

  const handleUpsertConfirm = () => {
    upsertMutation.mutate({
      ...upsertForm,
      vigencia_fim: upsertForm.vigencia_fim || null,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias de Risco</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerenciamento das categorias configuráveis — ADR-0025 · Sprint Z-09
          </p>
        </div>
        <Button onClick={() => handleUpsertOpen()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      {/* Seção 1: Sugestões pendentes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Sugestões Pendentes</CardTitle>
            {suggestions && suggestions.length > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {suggestions.length}
              </Badge>
            )}
            {suggestions?.some((s: any) => s.sla_vencido) && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                SLA vencido
              </Badge>
            )}
          </div>
          <CardDescription>
            Sugestões do sensor RAG aguardando aprovação. Linhas em âmbar = SLA de 15 dias vencido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSugg ? (
            <div className="text-sm text-gray-400 py-4 text-center">Carregando...</div>
          ) : !suggestions || suggestions.length === 0 ? (
            <div className="text-sm text-gray-400 py-6 text-center">
              Nenhuma sugestão pendente.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Código</TableHead>
                  <TableHead>Nome sugerido</TableHead>
                  <TableHead>Artigo base</TableHead>
                  <TableHead className="w-[100px]">Pendente</TableHead>
                  <TableHead className="w-[180px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((s: any) => (
                  <SugestaoRow
                    key={s.id}
                    s={s}
                    onApprove={handleApproveOpen}
                    onReject={setRejectTarget}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Seção 2: Categorias ativas */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Categorias Ativas</CardTitle>
            <Badge variant="secondary">{activeCategories.length}</Badge>
          </div>
          <CardDescription>
            Categorias em uso no engine de riscos. Vigência calculada automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCats ? (
            <div className="text-sm text-gray-400 py-4 text-center">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Vigência</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead className="max-w-[220px]">Descrição</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeCategories.map((cat: any) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-mono text-xs">{cat.codigo}</TableCell>
                    <TableCell className="text-sm">{cat.nome}</TableCell>
                    <TableCell><SeveridadeBadge v={cat.severidade} /></TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {formatDate(cat.vigencia_inicio)}
                      {cat.vigencia_fim ? ` → ${formatDate(cat.vigencia_fim)}` : " → ∞"}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">{cat.origem}</TableCell>
                    <TableCell className="text-xs text-gray-500">{cat.escopo}</TableCell>
                    <TableCell
                      className="text-xs text-gray-600 max-w-[220px] truncate"
                      title={cat.descricao ?? undefined}
                      data-testid={`cat-descricao-${cat.codigo}`}
                    >
                      {cat.descricao
                        ? cat.descricao.length > 80
                          ? cat.descricao.slice(0, 80) + "…"
                          : cat.descricao
                        : <span className="text-gray-300 italic">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => handleUpsertOpen(cat)}
                          title="Editar"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                          onClick={() => {
                            upsertMutation.mutate({ ...cat, status: "inativo", vigencia_fim: cat.vigencia_fim ? new Date(cat.vigencia_fim).toISOString().slice(0,10) : null });
                          }}
                          title="Desativar"
                        >
                          <Power className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Seção 3: Categorias inativas/legadas (colapsável) */}
      {inactiveCategories.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-500">
              Categorias Inativas / Legadas ({inactiveCategories.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveCategories.map((cat: any) => (
                  <TableRow key={cat.id} className="opacity-60">
                    <TableCell className="font-mono text-xs">{cat.codigo}</TableCell>
                    <TableCell className="text-sm">{cat.nome}</TableCell>
                    <TableCell><StatusBadge v={cat.status} /></TableCell>
                    <TableCell className="text-xs text-gray-400">{cat.origem}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleUpsertOpen(cat)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modal: Aprovar sugestão */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aprovar Sugestão</DialogTitle>
            <DialogDescription>
              Preencha severidade, urgência e vigência antes de aprovar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm font-medium text-gray-700">
              {approveTarget?.codigo} — {approveTarget?.nome}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Severidade</Label>
                <Select value={approveSeveridade} onValueChange={(v) => setApproveSeveridade(v as Severidade)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="oportunidade">Oportunidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Urgência</Label>
                <Select value={approveUrgencia} onValueChange={(v) => setApproveUrgencia(v as Urgencia)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imediata">Imediata</SelectItem>
                    <SelectItem value="curto_prazo">Curto prazo</SelectItem>
                    <SelectItem value="medio_prazo">Médio prazo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vigência fim (opcional — deixe vazio para indeterminada)</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={approveVigenciaFim}
                onChange={(e) => setApproveVigenciaFim(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setApproveTarget(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApproveConfirm}
              disabled={approveMutation.isPending}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Confirmar aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Rejeitar sugestão */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rejeitar Sugestão</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição (opcional).
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Motivo da rejeição..."
              value={rejectMotivo}
              onChange={(e) => setRejectMotivo(e.target.value)}
              className="text-sm"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectTarget(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Upsert categoria */}
      <Dialog open={showUpsertModal} onOpenChange={setShowUpsertModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{upsertTarget ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Código *</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={upsertForm.codigo}
                  onChange={(e) => setUpsertForm({ ...upsertForm, codigo: e.target.value })}
                  disabled={!!upsertTarget}
                  placeholder="ex: nova_categoria"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Lei código *</Label>
                <Input
                  className="h-8 text-xs"
                  value={upsertForm.lei_codigo}
                  onChange={(e) => setUpsertForm({ ...upsertForm, lei_codigo: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nome *</Label>
              <Input
                className="h-8 text-sm"
                value={upsertForm.nome}
                onChange={(e) => setUpsertForm({ ...upsertForm, nome: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Artigo base *</Label>
              <Input
                className="h-8 text-xs"
                value={upsertForm.artigo_base}
                onChange={(e) => setUpsertForm({ ...upsertForm, artigo_base: e.target.value })}
                placeholder="ex: Art. 9 LC 214/2025"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Severidade</Label>
                <Select value={upsertForm.severidade} onValueChange={(v) => setUpsertForm({ ...upsertForm, severidade: v as Severidade })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="oportunidade">Oportunidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Urgência</Label>
                <Select value={upsertForm.urgencia} onValueChange={(v) => setUpsertForm({ ...upsertForm, urgencia: v as Urgencia })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imediata">Imediata</SelectItem>
                    <SelectItem value="curto_prazo">Curto prazo</SelectItem>
                    <SelectItem value="medio_prazo">Médio prazo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={upsertForm.tipo} onValueChange={(v) => setUpsertForm({ ...upsertForm, tipo: v as "risk" | "opportunity" })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="risk">Risco</SelectItem>
                    <SelectItem value="opportunity">Oportunidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Vigência início *</Label>
                <Input type="date" className="h-8 text-xs" value={upsertForm.vigencia_inicio} onChange={(e) => setUpsertForm({ ...upsertForm, vigencia_inicio: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vigência fim (vazio = indeterminada)</Label>
                <Input type="date" className="h-8 text-xs" value={upsertForm.vigencia_fim} onChange={(e) => setUpsertForm({ ...upsertForm, vigencia_fim: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Origem</Label>
                <Select value={upsertForm.origem} onValueChange={(v) => setUpsertForm({ ...upsertForm, origem: v as any })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lei_federal">Lei Federal</SelectItem>
                    <SelectItem value="regulamentacao">Regulamentação</SelectItem>
                    <SelectItem value="rag_sensor">RAG Sensor</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Escopo</Label>
                <Select value={upsertForm.escopo} onValueChange={(v) => setUpsertForm({ ...upsertForm, escopo: v as any })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nacional">Nacional</SelectItem>
                    <SelectItem value="estadual">Estadual</SelectItem>
                    <SelectItem value="setorial">Setorial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowUpsertModal(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleUpsertConfirm} disabled={upsertMutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
