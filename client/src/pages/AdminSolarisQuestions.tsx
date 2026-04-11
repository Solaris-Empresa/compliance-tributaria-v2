/**
 * AdminSolarisQuestions.tsx
 * Gerenciamento completo de perguntas SOLARIS — Sprint L Entregável 1
 *
 * 3 abas:
 *   1. Lista — tabela com filtros, seleção múltipla, exclusão com undo
 *   2. Upload CSV — importação em lote (DEC-002)
 *   3. Histórico de Lotes — gerenciamento de lotes de upload
 */
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { trpc } from "../lib/trpc";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Upload, FileText, X, CheckCircle2, AlertCircle, AlertTriangle,
  Loader2, Download, Trash2, RotateCcw, Search, Filter, Eye,
  List, History,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = "idle" | "validating" | "validated" | "importing" | "done" | "error";

interface SolarisQuestion {
  id: number;
  codigo: string;
  titulo: string;
  texto: string;
  categoria: string;
  severidade_base: string | null;
  vigencia_inicio: number | null;
  upload_batch_id: string | null;
  ativo: number;
  criado_em: number;
}

interface UndoState {
  ids: number[];
  questions: SolarisQuestion[];
  timeoutId: ReturnType<typeof setTimeout> | null;
  secondsLeft: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const readFile = (f: File): Promise<string> =>
  new Promise((resolve) => {
    const r = new FileReader();
    r.onload = (e) => resolve(e.target!.result as string);
    r.readAsText(f, "UTF-8");
  });

const AREA_LABELS: Record<string, string> = {
  contabilidade_fiscal: "Contabilidade Fiscal",
  negocio: "Negócio",
  ti: "TI",
  juridico: "Jurídico",
};

const AREA_COLORS: Record<string, string> = {
  contabilidade_fiscal: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  negocio: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  ti: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  juridico: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

const SEVERIDADE_ICONS: Record<string, string> = {
  critica: "🔴",
  alta: "🟠",
  media: "🟡",
  baixa: "🟢",
};

function formatDate(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("pt-BR");
}

function shortBatchId(id: string | null): string {
  if (!id) return "—";
  return id.substring(0, 8);
}

// ── Aba 1: Lista ─────────────────────────────────────────────────────────────

function TabLista({
  onFilterBatch,
}: {
  onFilterBatch?: (batchId: string) => void;
}) {
  const utils = trpc.useUtils();

  // Filtros
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [severidade, setSeveridade] = useState("todas");
  const [vigencia, setVigencia] = useState<"todas" | "com" | "sem" | "vencida" | "a_vencer">("todas");
  const [batchFilter, setBatchFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState<"ativas" | "inativas" | "todas">("ativas");
  const [page, setPage] = useState(1);

  // Seleção
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; ids: number[]; questions: SolarisQuestion[] }>({
    open: false, ids: [], questions: [],
  });

  // Undo toast
  const [undo, setUndo] = useState<UndoState | null>(null);
  const undoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const hasFilters = debouncedSearch || categoria !== "todas" || severidade !== "todas" ||
    vigencia !== "todas" || batchFilter !== "todas" || statusFilter !== "ativas";

  const queryInput = useMemo(() => ({
    search: debouncedSearch || undefined,
    categoria: categoria !== "todas" ? categoria : undefined,
    severidade_base: severidade !== "todas" ? severidade : undefined,
    vigencia: vigencia !== "todas" ? vigencia : "todas" as const,
    upload_batch_id: batchFilter !== "todas" ? batchFilter : undefined,
    ativo: statusFilter === "ativas" ? true : statusFilter === "inativas" ? false : undefined,
    page,
    pageSize: 20,
  }), [debouncedSearch, categoria, severidade, vigencia, batchFilter, statusFilter, page]);

  const { data, isLoading, isError, refetch } = trpc.solarisAdmin.listQuestions.useQuery(queryInput);
  const { data: batches } = trpc.solarisAdmin.listBatches.useQuery();

  const deleteMutation = trpc.solarisAdmin.deleteQuestions.useMutation({
    onSuccess: (result) => {
      const deletedQuestions = deleteModal.questions;
      setDeleteModal({ open: false, ids: [], questions: [] });
      setSelected(new Set());
      refetch();

      // Iniciar undo de 8 segundos
      let secondsLeft = 8;
      const undoState: UndoState = {
        ids: result.ids,
        questions: deletedQuestions,
        timeoutId: null,
        secondsLeft,
      };

      const interval = setInterval(() => {
        secondsLeft--;
        setUndo((prev) => prev ? { ...prev, secondsLeft } : null);
        if (secondsLeft <= 0) {
          clearInterval(interval);
          setUndo(null);
        }
      }, 1000);

      undoState.timeoutId = setTimeout(() => {
        clearInterval(interval);
        setUndo(null);
      }, 8000);

      undoIntervalRef.current = interval;
      setUndo(undoState);
    },
  });

  const restoreMutation = trpc.solarisAdmin.restoreQuestions.useMutation({
    onSuccess: () => {
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
      if (undo?.timeoutId) clearTimeout(undo.timeoutId);
      setUndo(null);
      refetch();
    },
  });

  const handleSelectAll = () => {
    if (!data) return;
    if (selected.size === data.questions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.questions.map((q) => q.id)));
    }
  };

  const handleSelectOne = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const openDeleteModal = (ids: number[]) => {
    const questions = (data?.questions ?? []).filter((q) => ids.includes(q.id));
    setDeleteModal({ open: true, ids, questions });
  };

  const confirmDelete = () => {
    deleteMutation.mutate({ ids: deleteModal.ids });
  };

  const handleUndo = () => {
    if (!undo) return;
    restoreMutation.mutate({ ids: undo.ids });
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCategoria("todas");
    setSeveridade("todas");
    setVigencia("todas");
    setBatchFilter("todas");
    setStatusFilter("ativas");
    setPage(1);
  };

  const questions = data?.questions ?? [];
  const total = data?.total ?? 0;
  const allSelected = questions.length > 0 && selected.size === questions.length;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pergunta..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>

        <Select value={categoria} onValueChange={(v) => { setCategoria(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as áreas</SelectItem>
            <SelectItem value="contabilidade_fiscal">Contabilidade Fiscal</SelectItem>
            <SelectItem value="ti">TI</SelectItem>
            <SelectItem value="juridico">Jurídico</SelectItem>
            <SelectItem value="negocio">Negócio</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severidade} onValueChange={(v) => { setSeveridade(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Severidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="critica">🔴 Crítica</SelectItem>
            <SelectItem value="alta">🟠 Alta</SelectItem>
            <SelectItem value="media">🟡 Média</SelectItem>
            <SelectItem value="baixa">🟢 Baixa</SelectItem>
          </SelectContent>
        </Select>

        <Select value={vigencia} onValueChange={(v) => { setVigencia(v as typeof vigencia); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Vigência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="com">Com vigência</SelectItem>
            <SelectItem value="sem">Sem vigência</SelectItem>
            <SelectItem value="vencida">Vencida</SelectItem>
            <SelectItem value="a_vencer">A vencer</SelectItem>
          </SelectContent>
        </Select>

        <Select value={batchFilter} onValueChange={(v) => { setBatchFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Lote" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os lotes</SelectItem>
            {(batches ?? []).map((b) => (
              <SelectItem key={b.batch_id} value={b.batch_id}>
                {shortBatchId(b.batch_id)} ({b.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ativas">Ativas</SelectItem>
            <SelectItem value="inativas">Inativas</SelectItem>
            <SelectItem value="todas">Todas</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="w-3 h-3 mr-1" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Contador + ações em lote */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Exibindo {questions.length} de {total} perguntas</span>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-foreground font-medium">{selected.size} selecionada{selected.size > 1 ? "s" : ""}</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => openDeleteModal(Array.from(selected))}
              className="flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Excluir {selected.size}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              <X className="w-3 h-3 mr-1" />
              Limpar seleção
            </Button>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="rounded"
                />
              </th>
              <th className="p-3 text-left font-medium w-20">Código</th>
              <th className="p-3 text-left font-medium">Título</th>
              <th className="p-3 text-left font-medium w-36">Área</th>
              <th className="p-3 text-left font-medium w-24">Severidade</th>
              <th className="p-3 text-left font-medium w-24">Vigência</th>
              <th className="p-3 text-left font-medium w-24">Lote</th>
              <th className="p-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {isError && (
              <tr>
                <td colSpan={8} className="p-8 text-center">
                  <Alert variant="destructive">
                    <AlertDescription>Erro ao carregar perguntas. Tente novamente.</AlertDescription>
                  </Alert>
                </td>
              </tr>
            )}
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Carregando...
                </td>
              </tr>
            ) : questions.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  Nenhuma pergunta encontrada
                </td>
              </tr>
            ) : (
              questions.map((q) => (
                <tr key={q.id} className={`border-t hover:bg-muted/30 ${selected.has(q.id) ? "bg-primary/5" : ""}`}>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(q.id)}
                      onChange={() => handleSelectOne(q.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs font-mono text-blue-700 border-blue-300">
                      {q.codigo}
                    </Badge>
                  </td>
                  <td className="p-3 max-w-xs">
                    <span className="line-clamp-2 text-foreground" title={q.titulo}>{q.titulo}</span>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${AREA_COLORS[q.categoria] ?? "bg-muted text-muted-foreground"}`}>
                      {AREA_LABELS[q.categoria] ?? q.categoria}
                    </span>
                  </td>
                  <td className="p-3 text-xs">
                    {q.severidade_base ? (
                      <span>{SEVERIDADE_ICONS[q.severidade_base] ?? ""} {q.severidade_base}</span>
                    ) : "—"}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{formatDate(q.vigencia_inicio)}</td>
                  <td className="p-3 text-xs font-mono text-muted-foreground">{shortBatchId(q.upload_batch_id)}</td>
                  <td className="p-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteModal([q.id])}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1 h-auto"
                      title="Excluir esta pergunta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {total > 20 && (
        <div className="flex items-center justify-between text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Anterior
          </Button>
          <span className="text-muted-foreground">
            Página {page} de {Math.ceil(total / 20)}
          </span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>
            Próxima
          </Button>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={deleteModal.open} onOpenChange={(open) => !open && setDeleteModal({ open: false, ids: [], questions: [] })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirmar exclusão de perguntas
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Você está prestes a excluir:</p>
                <ul className="space-y-1 text-sm">
                  {deleteModal.questions.slice(0, 5).map((q) => (
                    <li key={q.id} className="flex items-start gap-2">
                      <Badge variant="outline" className="text-xs font-mono shrink-0">{q.codigo}</Badge>
                      <span className="text-foreground">{q.titulo}</span>
                    </li>
                  ))}
                  {deleteModal.questions.length > 5 && (
                    <li className="text-muted-foreground text-xs">
                      e mais {deleteModal.questions.length - 5} perguntas
                    </li>
                  )}
                </ul>
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Esta ação pode ser desfeita em até 8 segundos após a exclusão.
                    As perguntas excluídas não aparecerão mais no questionário SOLARIS de novos projetos.
                    Projetos já em andamento não são afetados.
                  </AlertDescription>
                </Alert>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar — manter as perguntas</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Excluindo...</>
              ) : (
                "Excluir mesmo assim"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toast de undo */}
      {undo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
          <div className="bg-foreground text-background rounded-lg shadow-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                ✓ {undo.ids.length} pergunta{undo.ids.length > 1 ? "s" : ""} excluída{undo.ids.length > 1 ? "s" : ""}.
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  className="text-background hover:text-background/80 hover:bg-background/20 h-auto py-1 px-2 text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Desfazer — {undo.secondsLeft}s
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { if (undo.timeoutId) clearTimeout(undo.timeoutId); if (undoIntervalRef.current) clearInterval(undoIntervalRef.current); setUndo(null); }}
                  className="text-background hover:text-background/80 hover:bg-background/20 h-auto p-1"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
            {/* Barra de progresso */}
            <div className="w-full bg-background/20 rounded-full h-1">
              <div
                className="bg-background h-1 rounded-full transition-all duration-1000"
                style={{ width: `${(undo.secondsLeft / 8) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Aba 2: Upload CSV ─────────────────────────────────────────────────────────

function TabUploadCsv() {
  type Phase = "idle" | "validating" | "validated" | "importing" | "done" | "error";

  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<{
    total: number; valid: number;
    errors: { row: number; field: string; message: string }[];
    preview?: { artigo: string; titulo: string; categoria: string; severidade_base: string; vigencia_inicio: string | null }[];
  } | null>(null);
  const [importResult, setImportResult] = useState<{ inserted: number; updated: number } | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.solarisAdmin.uploadCsv.useMutation({
    onSuccess: (data) => {
      if (phase === "validating") {
        setValidationResult({
          total: data.total,
          valid: data.valid,
          errors: (data.errors || []).map((e: { line: number; field: string; message: string }) => ({
            row: e.line, field: e.field ?? "—", message: e.message,
          })),
          preview: data.preview,
        });
        setPhase("validated");
      } else if (phase === "importing") {
        setImportResult({ inserted: data.inserted, updated: data.updated });
        setPhase("done");
      }
    },
    onError: (err: { message?: string }) => {
      setErrorMessage(err.message || "Erro de rede ao processar o arquivo.");
      setPhase("error");
    },
  });

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv") && selectedFile.type !== "text/csv") {
      setErrorMessage("Apenas arquivos .csv são aceitos");
      setPhase("error");
      return;
    }
    setFile(selectedFile);
    setValidationResult(null);
    setImportResult(null);
    setErrorMessage(null);
    setPhase("idle");
    const content = await readFile(selectedFile);
    setFileContent(content);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileContent(null);
    setValidationResult(null);
    setImportResult(null);
    setErrorMessage(null);
    setPhase("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleValidate = () => {
    if (!fileContent) return;
    setPhase("validating");
    uploadMutation.mutate({ csvContent: fileContent, dryRun: true });
  };

  const handleImport = () => {
    if (!fileContent) return;
    setShowConfirmModal(false);
    setPhase("importing");
    uploadMutation.mutate({ csvContent: fileContent, dryRun: false });
  };

  const fileSizeKB = file ? (file.size / 1024).toFixed(1) : "0";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold">Upload CSV — Perguntas SOLARIS</h2>
          <p className="text-sm text-muted-foreground mt-1">Importe perguntas curadas em lote via CSV (DEC-002)</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { window.location.href = "/template-solaris-questions.csv"; }}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Template CSV
        </Button>
      </div>

      {/* Seleção de arquivo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Selecionar arquivo</CardTitle>
        </CardHeader>
        <CardContent>
          {!file ? (
            <div
              className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Arraste um arquivo CSV ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground mt-1">Apenas arquivos .csv são aceitos</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{fileSizeKB} KB</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRemoveFile} className="text-muted-foreground hover:text-destructive">
                <X className="w-4 h-4" /> Remover
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validação */}
      {file && phase !== "done" && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Validação</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleValidate} disabled={phase === "validating" || phase === "importing"} className="w-full sm:w-auto">
              {phase === "validating" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Validando...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Validar CSV</>}
            </Button>
            {phase === "validated" && validationResult && (
              validationResult.errors.length === 0 ? (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    ✓ {validationResult.valid} linhas válidas — pronto para importar
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-amber-500/50 bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700 dark:text-amber-400">
                    {validationResult.valid} linhas válidas, {validationResult.errors.length} erros encontrados
                  </AlertDescription>
                </Alert>
              )
            )}
            {phase === "error" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Importação */}
      {phase === "validated" && validationResult && validationResult.errors.length === 0 && validationResult.valid > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Importação</CardTitle></CardHeader>
          <CardContent>
            <Button onClick={() => setShowConfirmModal(true)} className="w-full sm:w-auto">
              <Upload className="w-4 h-4 mr-2" />
              Importar {validationResult.valid} perguntas para o corpus SOLARIS
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Resultado */}
      {phase === "done" && importResult && (
        <Card>
          <CardContent className="pt-6">
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                ✓ {importResult.inserted} perguntas publicadas no corpus SOLARIS
                {importResult.updated > 0 && ` · ${importResult.updated} atualizadas`}
              </AlertDescription>
            </Alert>
            <Button variant="outline" onClick={handleRemoveFile} className="mt-4">Novo upload</Button>
          </CardContent>
        </Card>
      )}

      {/* Modal confirmação */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar importação</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a importar <strong>{validationResult?.valid} perguntas</strong> no corpus SOLARIS.
              Perguntas com o mesmo código serão atualizadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport}>
              {phase === "importing" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importando...</> : "Confirmar importação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Aba 3: Histórico de Lotes ─────────────────────────────────────────────────

function TabHistorico({ onViewBatch }: { onViewBatch: (batchId: string) => void }) {
  const utils = trpc.useUtils();
  const { data: batches, isLoading, isError, refetch } = trpc.solarisAdmin.listBatches.useQuery();
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; batchId: string; count: number } | null>(null);

  const deleteBatchMutation = trpc.solarisAdmin.deleteBatch.useMutation({
    onSuccess: () => {
      setDeleteModal(null);
      refetch();
    },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center p-12 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin mr-2" />Carregando lotes...
    </div>
  );
  if (isError) return (
    <Alert variant="destructive">
      <AlertDescription>Erro ao carregar histórico de lotes. Tente novamente.</AlertDescription>
    </Alert>
  );

  if (!batches || batches.length === 0) return (
    <div className="text-center p-12 text-muted-foreground">
      Nenhum lote de upload encontrado.
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left font-medium">Data do upload</th>
              <th className="p-3 text-left font-medium">Lote ID</th>
              <th className="p-3 text-left font-medium">Perguntas</th>
              <th className="p-3 text-left font-medium">Importado por</th>
              <th className="p-3 text-left font-medium w-48">Ações</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.batch_id} className="border-t hover:bg-muted/30">
                <td className="p-3 text-muted-foreground">{formatDate(b.created_at)}</td>
                <td className="p-3 font-mono text-xs">{shortBatchId(b.batch_id)}</td>
                <td className="p-3">
                  <Badge variant="secondary">{b.count} perguntas</Badge>
                </td>
                <td className="p-3 text-muted-foreground">{b.uploaded_by}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewBatch(b.batch_id)}
                      className="flex items-center gap-1 text-xs"
                    >
                      <Eye className="w-3 h-3" />
                      Ver perguntas
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteModal({ open: true, batchId: b.batch_id, count: b.count })}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Excluir lote
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!deleteModal?.open} onOpenChange={(open) => !open && setDeleteModal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Excluir lote inteiro
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>{deleteModal?.count} perguntas</strong> do lote{" "}
              <code className="text-xs bg-muted px-1 rounded">{deleteModal ? shortBatchId(deleteModal.batchId) : ""}</code>.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar — manter o lote</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteModal && deleteBatchMutation.mutate({ upload_batch_id: deleteModal.batchId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBatchMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Excluindo...</> : "Excluir mesmo assim"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function AdminSolarisQuestions() {
  const [activeTab, setActiveTab] = useState("lista");
  const [batchFilterFromHistory, setBatchFilterFromHistory] = useState<string | null>(null);

  const handleViewBatch = (batchId: string) => {
    setBatchFilterFromHistory(batchId);
    setActiveTab("lista");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Perguntas — Onda 1 SOLARIS</h1>
          <p className="text-sm text-muted-foreground mt-1">Administração do corpus de perguntas curadas pela equipe jurídica</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="lista" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload CSV
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico de Lotes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="pt-4">
            <TabLista />
          </TabsContent>

          <TabsContent value="upload" className="pt-4">
            <TabUploadCsv />
          </TabsContent>

          <TabsContent value="historico" className="pt-4">
            <TabHistorico onViewBatch={handleViewBatch} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
