/**
 * AdminSolarisQuestions.tsx
 * Gerenciamento completo de perguntas SOLARIS — Sprint L Entregável 1
 *
 * 3 abas:
 *   1. Lista — tabela com filtros, seleção múltipla, exclusão com undo
 *   2. Upload CSV — importação em lote (DEC-002)
 *   3. Histórico de Lotes — gerenciamento de lotes de upload
 */
import { useState, useRef, useCallback, useEffect, useMemo, Fragment } from "react";
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
  List, History, Pencil, Plus,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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
  risk_category_code?: string | null;
  topicos?: string | null;
  classification_scope?: string | null;
  tax_regimes?: unknown; // JSON: string[] | null (F5 ADR-0038)
  cnae_groups?: unknown; // JSON: string[] | null (F7-A CNAE-ADMIN-01)
  gap_descricao?: string | null; // CSV-TEMPLATE-FIX-01 B.1 — round-trip identidade
  lei_ref?: string | null;        // CSV-TEMPLATE-FIX-01 B.2 — rastreabilidade normativa
  artigo_ref?: string | null;     // CSV-TEMPLATE-FIX-01 B.2
  mapping_review_status?: string | null; // CSV-TEMPLATE-FIX-01 B.2 — gate jurídico
  ativo: number;
  criado_em: number;
}

// ── F5 (ADR-0038) — regime tributário ────────────────────────────────────────
const TAX_REGIME_OPTIONS = [
  { value: "simples_nacional", label: "Simples Nacional" },
  { value: "lucro_presumido", label: "Lucro Presumido" },
  { value: "lucro_real", label: "Lucro Real" },
] as const;
const TAX_REGIME_LABEL: Record<string, string> = Object.fromEntries(
  TAX_REGIME_OPTIONS.map((o) => [o.value, o.label]),
);

/** Parse defensivo de tax_regimes (Lição #72 — mysql2/superjson auto-parseia JSON). */
function parseTaxRegimes(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw === "string") {
    try {
      const p: unknown = JSON.parse(raw);
      return Array.isArray(p) ? p.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Tokens de cor por regime (Lista v2): Universal cinza · LP roxo · LR azul · SN verde. */
const TAX_REGIME_COLOR: Record<string, string> = {
  simples_nacional: "text-green-700 border-green-300",
  lucro_presumido: "text-violet-700 border-violet-300",
  lucro_real: "text-blue-700 border-blue-300",
};

/** Badges da coluna Regimes — vazio/null → "Todos" (universal). */
function TaxRegimesBadges({ value }: { value: unknown }) {
  const arr = parseTaxRegimes(value);
  if (arr.length === 0) {
    return <Badge variant="outline" className="text-xs text-gray-600 border-gray-300">Todos</Badge>;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {arr.map((r) => (
        <Badge key={r} variant="outline" className={`text-xs ${TAX_REGIME_COLOR[r] ?? "text-violet-700 border-violet-300"}`}>
          {TAX_REGIME_LABEL[r] ?? r}
        </Badge>
      ))}
    </span>
  );
}

/** Multi-select de regimes. value=[] = "Todos" (universal → persiste NULL). */
function TaxRegimesMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const isTodos = value.length === 0;
  const toggle = (regime: string) =>
    onChange(value.includes(regime) ? value.filter((v) => v !== regime) : [...value, regime]);
  return (
    <div className="flex flex-wrap gap-2" data-testid="input-tax-regimes">
      <Badge
        data-testid="option-todos"
        variant={isTodos ? "default" : "outline"}
        className="cursor-pointer"
        onClick={() => onChange([])}
      >
        Todos
      </Badge>
      {TAX_REGIME_OPTIONS.map((o) => (
        <Badge
          key={o.value}
          data-testid={`option-${o.value}`}
          variant={value.includes(o.value) ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => toggle(o.value)}
        >
          {o.label}
        </Badge>
      ))}
    </div>
  );
}

// ── F7-A/B (CNAE-ADMIN-01) — grupos CNAE ─────────────────────────────────────
/** Parse defensivo de cnae_groups (Lição #72 — JSON array | null). */
function parseCnaeGroups(raw: unknown): string[] {
  return parseTaxRegimes(raw); // mesma lógica (JSON string-array → string[])
}

/** Badges da coluna Grupos CNAE — vazio/null → "Todos os CNAEs" (universal). */
function CnaeGroupsBadges({ value }: { value: unknown }) {
  const arr = parseCnaeGroups(value);
  if (arr.length === 0) {
    return <Badge variant="outline" className="text-xs text-muted-foreground">Todos os CNAEs</Badge>;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {arr.map((g) => (
        <Badge key={g} variant="outline" className="text-xs text-violet-700 border-violet-300">{g}</Badge>
      ))}
    </span>
  );
}

/** Chip-input aberto de grupos CNAE. value=[] = "Todos os CNAEs" (universal → persiste NULL). */
function CnaeGroupsChipInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [text, setText] = useState("");
  const add = () => {
    const t = text.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setText("");
  };
  return (
    <div
      className="flex flex-wrap gap-2 items-center border rounded-md p-2 min-h-[38px]"
      data-testid="input-cnae-groups"
    >
      {value.map((g, i) => (
        <Badge
          key={g}
          data-testid={`cnae-chip-${i}`}
          variant="outline"
          className="text-xs text-violet-700 border-violet-300"
        >
          {g}
          <span
            data-testid={`cnae-chip-remove-${i}`}
            className="ml-1 cursor-pointer text-muted-foreground"
            onClick={() => onChange(value.filter((x) => x !== g))}
          >
            ×
          </span>
        </Badge>
      ))}
      <input
        className="flex-1 min-w-[140px] outline-none text-sm bg-transparent"
        placeholder="CNAE + Enter (ex: 28 ou 4639-7/01); vazio = Todos"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); add(); }
        }}
        onBlur={add}
      />
    </div>
  );
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
  // Lista v2 (#1540) — filtros adicionais + ordenação + paginação client-side (read-only)
  const [regimeFilter, setRegimeFilter] = useState<string[]>([]);
  const [cnaeFilter, setCnaeFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<string>("codigo");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [clientPageSize, setClientPageSize] = useState<"20" | "50" | "100" | "todos">("20");
  // Lista v2 PR-2 — group-by, acessibilidade, modal detalhe, buscas salvas
  const [groupBy, setGroupBy] = useState<"" | "categoria" | "severidade_base" | "regime" | "risk" | "lote" | "status" | "vigencia">("");
  const [fontLarge, setFontLarge] = useState(false);
  const [dense, setDense] = useState(false);
  const [detailQ, setDetailQ] = useState<SolarisQuestion | null>(null);
  const [savedSearches, setSavedSearches] = useState<Array<{ name: string; q: string; cat: string; sev: string; vig: string; lote: string; st: string; reg: string[]; cnae: string; risk: string[] }>>(() => {
    try { return JSON.parse(localStorage.getItem("solaris-admin-buscas") || "[]"); } catch { return []; }
  });

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
    vigencia !== "todas" || batchFilter !== "todas" || statusFilter !== "ativas" ||
    regimeFilter.length > 0 || cnaeFilter.trim() !== "" || riskFilter.length > 0;

  // Lista v2 — busca o UNIVERSO (corpus ~52; pageSize máx=100) e filtra/ordena/pagina
  // client-side. Read-only: reusa a procedure existente, SEM query/backend novo (Lição #66).
  const { data, isLoading, isError, refetch } = trpc.solarisAdmin.listQuestions.useQuery({
    page: 1, pageSize: 100, vigencia: "todas" as const,
  });
  const { data: batches } = trpc.solarisAdmin.listBatches.useQuery();

  const allQuestions: SolarisQuestion[] = useMemo(() => data?.questions ?? [], [data]);
  const counts = useMemo(() => ({
    total: allQuestions.length,
    ativas: allQuestions.filter((q) => q.ativo).length,
    inativas: allQuestions.filter((q) => !q.ativo).length,
    regimeEspecifico: allQuestions.filter((q) => parseTaxRegimes(q.tax_regimes).length > 0).length,
  }), [allQuestions]);
  const riskCodes = useMemo(
    () => [...new Set(allQuestions.map((q) => q.risk_category_code).filter(Boolean) as string[])].sort(),
    [allQuestions],
  );
  const vigStatus = useCallback((q: SolarisQuestion): "sem" | "vencida" | "a_vencer" => {
    if (!q.vigencia_inicio) return "sem";
    return q.vigencia_inicio < Date.now() ? "vencida" : "a_vencer";
  }, []);

  const filtered = useMemo(() => {
    const s = debouncedSearch.trim().toLowerCase();
    return allQuestions.filter((q) => {
      if (s && !`${q.codigo} ${q.titulo} ${q.texto} ${q.risk_category_code ?? ""}`.toLowerCase().includes(s)) return false;
      if (statusFilter === "ativas" && !q.ativo) return false;
      if (statusFilter === "inativas" && q.ativo) return false;
      if (categoria !== "todas" && q.categoria !== categoria) return false;
      if (severidade !== "todas" && q.severidade_base !== severidade) return false;
      if (vigencia === "com" && !q.vigencia_inicio) return false;
      if (vigencia === "sem" && q.vigencia_inicio) return false;
      if (vigencia === "vencida" && vigStatus(q) !== "vencida") return false;
      if (vigencia === "a_vencer" && vigStatus(q) !== "a_vencer") return false;
      if (batchFilter !== "todas" && q.upload_batch_id !== batchFilter) return false;
      if (regimeFilter.length > 0) {
        const regs = parseTaxRegimes(q.tax_regimes);
        if (!regimeFilter.some((r) => (r === "__uni" ? regs.length === 0 : regs.includes(r)))) return false;
      }
      if (riskFilter.length > 0 && !riskFilter.includes(q.risk_category_code ?? "")) return false;
      const c = cnaeFilter.trim();
      if (c) {
        const groups = parseCnaeGroups(q.cnae_groups);
        if (!groups.some((g) => g.startsWith(c) || c.startsWith(g))) return false;
      }
      return true;
    });
  }, [allQuestions, debouncedSearch, statusFilter, categoria, severidade, vigencia, batchFilter, regimeFilter, riskFilter, cnaeFilter, vigStatus]);

  const sorted = useMemo(() => {
    const SEV_RANK: Record<string, number> = { critica: 4, alta: 3, media: 2, baixa: 1 };
    return [...filtered].sort((a, b) => {
      let r: number;
      if (sortKey === "severidade_base") r = (SEV_RANK[a.severidade_base ?? ""] ?? 0) - (SEV_RANK[b.severidade_base ?? ""] ?? 0);
      else if (sortKey === "vigencia_inicio") r = (a.vigencia_inicio ?? 0) - (b.vigencia_inicio ?? 0);
      else r = String((a as unknown as Record<string, unknown>)[sortKey] ?? "").localeCompare(String((b as unknown as Record<string, unknown>)[sortKey] ?? ""), "pt");
      return r * sortDir;
    });
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (k: string) => {
    if (sortKey === k) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(k); setSortDir(1); }
  };

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

  // Edit modal
  const [editingQuestion, setEditingQuestion] = useState<SolarisQuestion | null>(null);
  const [editForm, setEditForm] = useState({
    titulo: "", texto: "", categoria: "", severidade_base: "",
    vigencia_inicio: "", topicos: "", risk_category_code: "", classification_scope: "",
    tax_regimes: [] as string[], cnae_groups: [] as string[],
  });

  const openEditModal = (q: SolarisQuestion) => {
    setEditingQuestion(q);
    setEditForm({
      titulo: q.titulo || "",
      texto: q.texto || "",
      categoria: q.categoria || "",
      severidade_base: q.severidade_base || "",
      vigencia_inicio: q.vigencia_inicio ? String(q.vigencia_inicio) : "",
      topicos: q.topicos || "",
      risk_category_code: q.risk_category_code || "",
      classification_scope: q.classification_scope || "risk_engine",
      tax_regimes: parseTaxRegimes(q.tax_regimes),
      cnae_groups: parseCnaeGroups(q.cnae_groups),
    });
  };

  const updateMutation = trpc.solarisAdmin.updateQuestion.useMutation({
    onSuccess: () => {
      toast.success("Pergunta atualizada com sucesso");
      setEditingQuestion(null);
      refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar: ${err.message}`);
    },
  });

  const handleSaveEdit = () => {
    if (!editingQuestion) return;
    updateMutation.mutate({
      id: editingQuestion.id,
      titulo: editForm.titulo || undefined,
      texto: editForm.texto || undefined,
      categoria: (editForm.categoria || undefined) as "contabilidade_fiscal" | "negocio" | "ti" | "juridico" | undefined,
      severidade_base: (editForm.severidade_base || undefined) as "critica" | "alta" | "media" | "baixa" | undefined,
      vigencia_inicio: editForm.vigencia_inicio || undefined,
      topicos: editForm.topicos || undefined,
      risk_category_code: editForm.risk_category_code || undefined,
      classification_scope: (editForm.classification_scope as "risk_engine" | "diagnostic_only") || undefined,
      tax_regimes: editForm.tax_regimes, // [] → backend normaliza p/ NULL (universal)
      // F7-B: chips vazios → "" → backend normaliza p/ NULL (universal, DoD negativo)
      cnae_groups: editForm.cnae_groups.length ? JSON.stringify(editForm.cnae_groups) : "",
    });
  };

  // Create question modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    titulo: "", texto: "", categoria: "contabilidade_fiscal", severidade_base: "",
    vigencia_inicio: "", topicos: "", risk_category_code: "", classification_scope: "risk_engine",
    cnae_groups: [] as string[], tax_regimes: [] as string[],
  });

  const resetCreateForm = () => setCreateForm({
    titulo: "", texto: "", categoria: "contabilidade_fiscal", severidade_base: "",
    vigencia_inicio: "", topicos: "", risk_category_code: "", classification_scope: "risk_engine",
    cnae_groups: [] as string[], tax_regimes: [] as string[],
  });

  const createMutation = trpc.solarisAdmin.createQuestion.useMutation({
    onSuccess: (result) => {
      toast.success(`Pergunta ${result.codigo} criada com sucesso`);
      setCreateOpen(false);
      resetCreateForm();
      refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao criar: ${err.message}`);
    },
  });

  const handleCreate = () => {
    if (!createForm.titulo.trim() || !createForm.texto.trim()) {
      toast.error("Título e Texto são obrigatórios");
      return;
    }
    // FIX-06 (2026-06-01): severidade_base e risk_category_code agora são
    // obrigatórios no backend Zod. Validação client-side em paralelo evita
    // round-trip de rede com mensagem de erro melhor para o usuário.
    if (!createForm.severidade_base) {
      toast.error("Severidade base é obrigatória");
      return;
    }
    if (!createForm.risk_category_code?.trim()) {
      toast.error("Categoria de risco (risk_category_code) é obrigatória");
      return;
    }
    createMutation.mutate({
      titulo: createForm.titulo,
      texto: createForm.texto,
      categoria: createForm.categoria as "contabilidade_fiscal" | "negocio" | "ti" | "juridico",
      severidade_base: createForm.severidade_base as "critica" | "alta" | "media" | "baixa",
      vigencia_inicio: createForm.vigencia_inicio || undefined,
      topicos: createForm.topicos || undefined,
      risk_category_code: createForm.risk_category_code,
      classification_scope: (createForm.classification_scope as "risk_engine" | "diagnostic_only") || undefined,
      // F7-B: chips → JSON array; vazio → undefined (universal)
      cnae_groups: createForm.cnae_groups.length ? JSON.stringify(createForm.cnae_groups) : undefined,
      tax_regimes: createForm.tax_regimes, // [] → backend normaliza p/ NULL (universal)
    });
  };

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
    setRegimeFilter([]);
    setCnaeFilter("");
    setRiskFilter([]);
    setPage(1);
  };

  // paginação client-side sobre o conjunto filtrado/ordenado (Lista v2)
  const total = filtered.length;
  const pageSizeNum = clientPageSize === "todos" ? Math.max(1, sorted.length) : Number(clientPageSize);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSizeNum));
  const questions = sorted.slice((page - 1) * pageSizeNum, page * pageSizeNum);
  const allSelected = questions.length > 0 && questions.every((q) => selected.has(q.id));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);

  // ── PR-2: group-by, visibilidade, export, buscas salvas ──────────────────────
  const groupKeyOf = (q: SolarisQuestion): string => {
    if (groupBy === "regime") { const r = parseTaxRegimes(q.tax_regimes); return r.length ? r.map((x) => TAX_REGIME_LABEL[x] ?? x).join(", ") : "Universal"; }
    if (groupBy === "status") return q.ativo ? "Ativas" : "Inativas";
    if (groupBy === "vigencia") { const v = vigStatus(q); return v === "sem" ? "Sem vigência" : v === "vencida" ? "Vencida" : "A vencer"; }
    if (groupBy === "risk") return q.risk_category_code || "—";
    if (groupBy === "lote") return q.upload_batch_id || "—";
    if (groupBy === "severidade_base") return q.severidade_base || "—";
    if (groupBy === "categoria") return AREA_LABELS[q.categoria] || q.categoria || "—";
    return "";
  };
  const groups = useMemo(() => {
    if (!groupBy) return null;
    const m = new Map<string, SolarisQuestion[]>();
    for (const q of sorted) { const k = groupKeyOf(q); const arr = m.get(k); if (arr) arr.push(q); else m.set(k, [q]); }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted, groupBy]);

  // Painel "Visibilidade por Regime": universais ativas + específicas ativas por regime
  const visibility = useMemo(() => {
    const uni = allQuestions.filter((q) => q.ativo && parseTaxRegimes(q.tax_regimes).length === 0).length;
    return TAX_REGIME_OPTIONS.map((o) => {
      const esp = allQuestions.filter((q) => q.ativo && parseTaxRegimes(q.tax_regimes).includes(o.value)).length;
      return { label: o.label, total: uni + esp, uni, esp };
    });
  }, [allQuestions]);

  // CSV-TEMPLATE-FIX-01 B.1 (#6) — export alinhado ao template de IMPORT (round-trip identidade):
  // mesmas colunas/ordem/camelCase, separador de coluna VÍRGULA, separador interno ";" (multi-valor),
  // vigencia_inicio CRUA "YYYY-MM-DD" (não formatDate pt-BR), gap_descricao incluída.
  // Colunas espelham CsvRowSchema em server/routers/solarisAdmin.ts:61.
  const exportCsv = () => {
    const cols = [
      "titulo", "conteudo", "topicos", "cnaeGroups", "lei", "artigo", "categoria",
      "severidade_base", "vigencia_inicio", "risk_category_code", "classification_scope",
      "gap_descricao", "taxRegimes",
      // B.2 — rastreabilidade normativa + gate jurídico
      "lei_ref", "artigo_ref", "mapping_review_status",
    ];
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const valueOf = (q: SolarisQuestion, c: string): string => {
      switch (c) {
        case "titulo": return q.titulo ?? "";
        case "conteudo": return q.texto ?? "";
        case "topicos": return q.topicos ?? "";
        case "cnaeGroups": return parseCnaeGroups(q.cnae_groups).join(";");
        case "lei": return "solaris"; // fixo — parser exige z.literal("solaris")
        case "artigo": return q.codigo ?? ""; // artigo → codigo (SOL-NNN)
        case "categoria": return q.categoria ?? "";
        case "severidade_base": return q.severidade_base ?? "";
        // valor cru "YYYY-MM-DD" (varchar) — NÃO formatDate (quebraria identidade)
        case "vigencia_inicio": return q.vigencia_inicio == null ? "" : String(q.vigencia_inicio);
        case "risk_category_code": return q.risk_category_code ?? "";
        case "classification_scope": return q.classification_scope ?? "risk_engine";
        case "gap_descricao": return q.gap_descricao ?? "";
        case "taxRegimes": return parseTaxRegimes(q.tax_regimes).join(";");
        // B.2 — emitidos fielmente. Nota: mapping_review_status='approved_legal' é exportado
        // como está, mas o reimport o rejeita (Opção A) — round-trip de approved_legal é
        // intencionalmente não suportado (aprovação legal é ação humana).
        case "lei_ref": return q.lei_ref ?? "";
        case "artigo_ref": return q.artigo_ref ?? "";
        case "mapping_review_status": return q.mapping_review_status ?? "curated_internal";
        default: return "";
      }
    };
    const lines = sorted.map((q) => cols.map((c) => esc(valueOf(q, c))).join(",")).join("\n");
    const blob = new Blob(["﻿" + cols.join(",") + "\n" + lines], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "solaris-questions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const saveCurrentSearch = () => {
    const name = window.prompt("Nome da busca salva:");
    if (!name) return;
    const entry = { name, q: search, cat: categoria, sev: severidade, vig: vigencia, lote: batchFilter, st: statusFilter, reg: regimeFilter, cnae: cnaeFilter, risk: riskFilter };
    const next = [...savedSearches.filter((s) => s.name !== name), entry];
    setSavedSearches(next);
    try { localStorage.setItem("solaris-admin-buscas", JSON.stringify(next)); } catch { /* ignore */ }
  };
  const applySearch = (name: string) => {
    const s = savedSearches.find((x) => x.name === name); if (!s) return;
    setSearch(s.q); setDebouncedSearch(s.q); setCategoria(s.cat); setSeveridade(s.sev);
    setVigencia(s.vig as typeof vigencia); setBatchFilter(s.lote); setStatusFilter(s.st as typeof statusFilter);
    setRegimeFilter(s.reg); setCnaeFilter(s.cnae); setRiskFilter(s.risk); setPage(1);
  };

  const renderRow = (q: SolarisQuestion) => (
    <tr key={q.id} data-testid={`row-${q.codigo}`} className={`border-t hover:bg-muted/30 ${selected.has(q.id) ? "bg-primary/5" : ""} ${q.ativo ? "" : "opacity-60"}`}>
      <td className="p-3"><input type="checkbox" checked={selected.has(q.id)} onChange={() => handleSelectOne(q.id)} className="rounded" /></td>
      <td className="p-3"><Badge variant="outline" className="text-xs font-mono text-blue-700 border-blue-300 cursor-pointer" onClick={() => setDetailQ(q)}>{q.codigo}</Badge></td>
      <td className="p-3"><span className="text-foreground" title={q.titulo}>{q.titulo}</span>{q.ativo ? null : <span className="ml-2 text-[10px] bg-red-100 text-red-700 rounded px-1.5 py-0.5 font-bold">INATIVA</span>}</td>
      <td className="p-3 text-xs">{q.severidade_base ? <span>{SEVERIDADE_ICONS[q.severidade_base] ?? ""} {q.severidade_base}</span> : "—"}</td>
      <td className="p-3 text-xs text-muted-foreground">{formatDate(q.vigencia_inicio)}</td>
      <td className="p-3"><TaxRegimesBadges value={q.tax_regimes} /></td>
      <td className="p-3"><CnaeGroupsBadges value={q.cnae_groups} /></td>
      <td className="p-3">{q.risk_category_code ? <Badge variant="outline" className="text-xs font-mono text-emerald-700 border-emerald-300">{q.risk_category_code}</Badge> : <span className="text-xs text-muted-foreground">—</span>}</td>
      <td className="p-3 text-xs font-mono text-muted-foreground">{shortBatchId(q.upload_batch_id)}</td>
      <td className="p-3">
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setDetailQ(q)} className="text-muted-foreground hover:text-violet-600 hover:bg-violet-50 p-1 h-auto" title="Ver detalhes"><Eye className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => openEditModal(q)} className="text-muted-foreground hover:text-blue-600 hover:bg-blue-50 p-1 h-auto" title="Editar esta pergunta"><Pencil className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => openDeleteModal([q.id])} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1 h-auto" title="Excluir esta pergunta"><Trash2 className="w-4 h-4" /></Button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className={`space-y-4 ${fontLarge ? "text-[17px]" : ""}`}>
      {/* Cards de resumo (Lista v2) — clicáveis = atalho de filtro */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button data-testid="card-total" onClick={() => { setStatusFilter("todas"); setPage(1); }}
          className="flex flex-col items-start gap-1 rounded-lg border bg-card p-4 text-left hover:shadow-md transition border-l-4 border-l-blue-600">
          <span className="text-3xl font-extrabold text-blue-700">{counts.total}</span>
          <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1"><FileText className="w-4 h-4" /> Total</span>
        </button>
        <button data-testid="card-ativas" onClick={() => { setStatusFilter("ativas"); setPage(1); }}
          className="flex flex-col items-start gap-1 rounded-lg border bg-card p-4 text-left hover:shadow-md transition border-l-4 border-l-green-600">
          <span className="text-3xl font-extrabold text-green-700">{counts.ativas}</span>
          <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Ativas</span>
        </button>
        <button data-testid="card-inativas" onClick={() => { setStatusFilter("inativas"); setPage(1); }}
          className="flex flex-col items-start gap-1 rounded-lg border bg-card p-4 text-left hover:shadow-md transition border-l-4 border-l-gray-400">
          <span className="text-3xl font-extrabold text-gray-600">{counts.inativas}</span>
          <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1"><X className="w-4 h-4" /> Inativas</span>
        </button>
        <button data-testid="card-regime-especifico" onClick={() => { setRegimeFilter(TAX_REGIME_OPTIONS.map((o) => o.value)); setStatusFilter("todas"); setPage(1); }}
          className="flex flex-col items-start gap-1 rounded-lg border bg-card p-4 text-left hover:shadow-md transition border-l-4 border-l-violet-600">
          <span className="text-3xl font-extrabold text-violet-700">{counts.regimeEspecifico}</span>
          <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1"><Filter className="w-4 h-4" /> Regime específico</span>
        </button>
      </div>

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

        {/* Status segmentado proeminente (Lista v2) com contagem */}
        <div className="inline-flex rounded-md border overflow-hidden" role="group" aria-label="Status">
          {([["ativas", "Ativas", counts.ativas], ["inativas", "Inativas", counts.inativas], ["todas", "Todas", counts.total]] as const).map(([v, l, n], i) => (
            <button
              key={v}
              data-testid={`seg-status-${v}`}
              onClick={() => { setStatusFilter(v); setPage(1); }}
              className={`px-3 min-h-[44px] text-sm ${i > 0 ? "border-l" : ""} ${statusFilter === v ? "bg-primary text-primary-foreground font-semibold" : "bg-background hover:bg-muted"}`}
            >
              {l} <span className="opacity-70 text-xs">({n})</span>
            </button>
          ))}
        </div>

        {/* Código de Risco (multi — adiciona; remove via chip) */}
        <Select value="" onValueChange={(v) => { setRiskFilter((p) => (p.includes(v) ? p : [...p, v])); setPage(1); }}>
          <SelectTrigger className="w-[180px]" data-testid="filter-risk">
            <SelectValue placeholder={riskFilter.length ? `Risco (${riskFilter.length})` : "Código de Risco"} />
          </SelectTrigger>
          <SelectContent>
            {riskCodes.map((rc) => (<SelectItem key={rc} value={rc}>{rc}</SelectItem>))}
          </SelectContent>
        </Select>

        {/* Grupo CNAE */}
        <Input
          data-testid="filter-cnae"
          placeholder="Grupo CNAE (ex: 28)"
          value={cnaeFilter}
          onChange={(e) => { setCnaeFilter(e.target.value); setPage(1); }}
          className="w-[160px]"
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="btn-limpar-tudo" className="text-muted-foreground">
            <X className="w-3 h-3 mr-1" />
            Limpar tudo
          </Button>
        )}
      </div>

      {/* Regime (multi) + chips de filtros ativos (Lista v2) */}
      <div className="flex flex-wrap gap-2 items-center" data-testid="filter-regime">
        <span className="text-xs text-muted-foreground mr-1">Regime:</span>
        {([["__uni", "Universal"], ...TAX_REGIME_OPTIONS.map((o) => [o.value, o.label] as [string, string])] as [string, string][]).map(([v, l]) => (
          <Badge
            key={v}
            data-testid={`filter-regime-${v}`}
            variant={regimeFilter.includes(v) ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => { setRegimeFilter((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v])); setPage(1); }}
          >
            {l}
          </Badge>
        ))}
      </div>

      {(regimeFilter.length > 0 || riskFilter.length > 0 || cnaeFilter.trim() !== "") && (
        <div className="flex flex-wrap gap-2">
          {regimeFilter.map((r) => (
            <Badge key={`cr-${r}`} data-testid={`chip-regime-${r}`} variant="secondary" className="cursor-pointer" onClick={() => { setRegimeFilter((p) => p.filter((x) => x !== r)); setPage(1); }}>
              Regime: {r === "__uni" ? "Universal" : (TAX_REGIME_LABEL[r] ?? r)} ✕
            </Badge>
          ))}
          {riskFilter.map((r) => (
            <Badge key={`ck-${r}`} data-testid={`chip-risk-${r}`} variant="secondary" className="cursor-pointer" onClick={() => { setRiskFilter((p) => p.filter((x) => x !== r)); setPage(1); }}>
              Risco: {r} ✕
            </Badge>
          ))}
          {cnaeFilter.trim() !== "" && (
            <Badge data-testid="chip-cnae" variant="secondary" className="cursor-pointer" onClick={() => { setCnaeFilter(""); setPage(1); }}>
              CNAE: {cnaeFilter} ✕
            </Badge>
          )}
        </div>
      )}

      {/* Controles de visualização (Lista v2 PR-2) */}
      <div className="flex flex-wrap gap-2 items-center text-sm">
        <span className="text-muted-foreground">Agrupar por:</span>
        <Select value={groupBy || "none"} onValueChange={(v) => { setGroupBy((v === "none" ? "" : v) as typeof groupBy); setPage(1); }}>
          <SelectTrigger className="w-[170px] h-9" data-testid="groupby"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Nenhum (lista) —</SelectItem>
            <SelectItem value="categoria">Área</SelectItem>
            <SelectItem value="severidade_base">Severidade</SelectItem>
            <SelectItem value="regime">Regime</SelectItem>
            <SelectItem value="risk">Código do Risco</SelectItem>
            <SelectItem value="lote">Lote</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="vigencia">Vigência</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" data-testid="btn-export" onClick={exportCsv} className="gap-1"><Download className="w-4 h-4" /> Exportar (CSV)</Button>
        <Button variant="outline" size="sm" onClick={saveCurrentSearch} className="gap-1">★ Salvar busca</Button>
        {savedSearches.length > 0 && (
          <Select value="" onValueChange={applySearch}>
            <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder="Buscas salvas…" /></SelectTrigger>
            <SelectContent>{savedSearches.map((s) => (<SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>))}</SelectContent>
          </Select>
        )}
        <span className="flex-1" />
        <span className="text-muted-foreground">Texto:</span>
        <Button variant={fontLarge ? "outline" : "default"} size="sm" data-testid="btn-font-a" onClick={() => setFontLarge(false)} className="w-9 px-0" title="Texto normal">A</Button>
        <Button variant={fontLarge ? "default" : "outline"} size="sm" data-testid="btn-font-a-plus" onClick={() => setFontLarge(true)} className="w-10 px-0 text-base" title="Texto grande">A+</Button>
        <Button variant="outline" size="sm" data-testid="btn-densidade" onClick={() => setDense((d) => !d)} title="Alternar densidade">{dense ? "Confortável" : "Compacto"}</Button>
      </div>

      {/* Painel Visibilidade por Regime (quando agrupado por regime) */}
      {groupBy === "regime" && (
        <div className="rounded-lg border bg-violet-50/50 p-3">
          <div className="text-sm font-semibold text-violet-800 mb-2">Visibilidade por regime do projeto (ativas)</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {visibility.map((v) => (
              <div key={v.label} className="rounded border bg-white px-3 py-2">
                <div className="font-semibold">{v.label}: {v.total}</div>
                <div className="text-xs text-muted-foreground">{v.uni} universais + {v.esp} específicas</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contador + ações em lote */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>Exibindo {questions.length} de {total} perguntas</span>
          <Select value={clientPageSize} onValueChange={(v) => { setClientPageSize(v as typeof clientPageSize); setPage(1); }}>
            <SelectTrigger className="w-[110px] h-8" data-testid="pagesize"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20 / pág</SelectItem>
              <SelectItem value="50">50 / pág</SelectItem>
              <SelectItem value="100">100 / pág</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Nova Pergunta
          </Button>
        </div>
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
        <table className={`w-full text-sm ${dense ? "[&_td]:py-1 [&_th]:py-1" : ""}`}>
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
              <th className="p-3 text-left font-medium w-20 cursor-pointer select-none" onClick={() => toggleSort("codigo")}>Código{sortKey === "codigo" ? (sortDir > 0 ? " ▲" : " ▼") : ""}</th>
              <th className="p-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort("titulo")}>Título{sortKey === "titulo" ? (sortDir > 0 ? " ▲" : " ▼") : ""}</th>
              <th className="p-3 text-left font-medium w-24 cursor-pointer select-none" onClick={() => toggleSort("severidade_base")}>Severidade{sortKey === "severidade_base" ? (sortDir > 0 ? " ▲" : " ▼") : ""}</th>
              <th className="p-3 text-left font-medium w-24 cursor-pointer select-none" onClick={() => toggleSort("vigencia_inicio")}>Vigência{sortKey === "vigencia_inicio" ? (sortDir > 0 ? " ▲" : " ▼") : ""}</th>
              <th className="p-3 text-left font-medium w-40" data-testid="col-tax-regimes">Regimes</th>
              <th className="p-3 text-left font-medium w-40" data-testid="col-cnae-groups">Grupos CNAE</th>
              <th className="p-3 text-left font-medium w-36">Código do Risco</th>
              <th className="p-3 text-left font-medium w-24">Lote</th>
              <th className="p-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {isError && (
              <tr>
                <td colSpan={9} className="p-8 text-center">
                  <Alert variant="destructive">
                    <AlertDescription>Erro ao carregar perguntas. Tente novamente.</AlertDescription>
                  </Alert>
                </td>
              </tr>
            )}
            {isLoading ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Carregando...
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-10 text-center text-muted-foreground">
                  Nenhuma pergunta corresponde aos filtros.{" "}
                  <button className="underline text-primary" onClick={clearFilters}>Limpar filtros</button>
                </td>
              </tr>
            ) : groupBy && groups ? (
              groups.map(([k, items]) => (
                <Fragment key={k}>
                  <tr className="bg-violet-50">
                    <td colSpan={10} className="px-3 py-2 font-semibold text-violet-800">
                      {k} <span className="font-normal text-muted-foreground text-xs">— {items.length} pergunta(s)</span>
                    </td>
                  </tr>
                  {items.map(renderRow)}
                </Fragment>
              ))
            ) : (
              questions.map(renderRow)
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação (client-side) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            Anterior
          </Button>
          <span className="text-muted-foreground">
            Página {Math.min(page, totalPages)} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Próxima
          </Button>
        </div>
      )}

      {/* Modal de detalhe (read-only) — "Editar" reusa o fluxo atual */}
      <Dialog open={!!detailQ} onOpenChange={(o) => !o && setDetailQ(null)}>
        <DialogContent className="max-w-2xl" data-testid="modal-detalhe">
          {detailQ && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-blue-700 border-blue-300">{detailQ.codigo}</Badge>
                  <span>{detailQ.titulo}</span>
                  {detailQ.ativo ? null : <span className="text-[10px] bg-red-100 text-red-700 rounded px-1.5 py-0.5 font-bold">INATIVA</span>}
                </DialogTitle>
                <DialogDescription>Detalhes da pergunta (somente leitura)</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Área:</span> {AREA_LABELS[detailQ.categoria] ?? detailQ.categoria ?? "—"}</div>
                <div><span className="text-muted-foreground">Severidade:</span> {detailQ.severidade_base ? `${SEVERIDADE_ICONS[detailQ.severidade_base] ?? ""} ${detailQ.severidade_base}` : "—"}</div>
                <div><span className="text-muted-foreground">Vigência:</span> {formatDate(detailQ.vigencia_inicio)}</div>
                <div><span className="text-muted-foreground">Lote:</span> {shortBatchId(detailQ.upload_batch_id)}</div>
                <div className="flex items-center gap-1"><span className="text-muted-foreground">Regimes:</span> <TaxRegimesBadges value={detailQ.tax_regimes} /></div>
                <div className="flex items-center gap-1"><span className="text-muted-foreground">CNAE:</span> <CnaeGroupsBadges value={detailQ.cnae_groups} /></div>
                <div className="col-span-2"><span className="text-muted-foreground">Código do Risco:</span> {detailQ.risk_category_code ?? "—"}</div>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{detailQ.texto || "—"}</div>
              <div className="rounded-md border border-violet-200 bg-violet-50 p-2 text-xs text-violet-800">
                {parseTaxRegimes(detailQ.tax_regimes).length === 0
                  ? "Visibilidade: aparece para projetos de QUALQUER regime (universal)."
                  : `Visibilidade: aparece apenas para projetos com regime ${parseTaxRegimes(detailQ.tax_regimes).map((r) => TAX_REGIME_LABEL[r] ?? r).join(", ")}.`}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { const q = detailQ; setDetailQ(null); openEditModal(q); }}>Editar</Button>
                <Button onClick={() => setDetailQ(null)}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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

      {/* Dialog de edição inline */}
      <Dialog open={!!editingQuestion} onOpenChange={(open) => { if (!open) setEditingQuestion(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Pergunta</DialogTitle>
            <DialogDescription>
              Edite os campos abaixo. Apenas campos alterados serão salvos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-titulo">Título</Label>
              <Input
                id="edit-titulo"
                value={editForm.titulo}
                onChange={(e) => setEditForm((f) => ({ ...f, titulo: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-texto">Texto / Conteúdo</Label>
              <Textarea
                id="edit-texto"
                rows={6}
                value={editForm.texto}
                onChange={(e) => setEditForm((f) => ({ ...f, texto: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select
                  value={editForm.categoria || "_none"}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, categoria: v === "_none" ? "" : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Nenhuma</SelectItem>
                    <SelectItem value="contabilidade_fiscal">Contabilidade Fiscal</SelectItem>
                    <SelectItem value="negocio">Negócio</SelectItem>
                    <SelectItem value="ti">TI</SelectItem>
                    <SelectItem value="juridico">Jurídico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Severidade</Label>
                <Select
                  value={editForm.severidade_base || "_none"}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, severidade_base: v === "_none" ? "" : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Nenhuma</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-vigencia">Vigência Início</Label>
                <Input
                  id="edit-vigencia"
                  placeholder="2026-01-01 ou vazio"
                  value={editForm.vigencia_inicio}
                  onChange={(e) => setEditForm((f) => ({ ...f, vigencia_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-risk-code">Risk Category Code</Label>
                <Input
                  id="edit-risk-code"
                  placeholder="Ex: TRIB-001"
                  value={editForm.risk_category_code}
                  onChange={(e) => setEditForm((f) => ({ ...f, risk_category_code: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-topicos">Tópicos</Label>
              <Textarea
                id="edit-topicos"
                rows={3}
                placeholder="Tópicos separados por vírgula ou linha"
                value={editForm.topicos}
                onChange={(e) => setEditForm((f) => ({ ...f, topicos: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Classification Scope</Label>
              <Select
                value={editForm.classification_scope || "risk_engine"}
                onValueChange={(v) => setEditForm((f) => ({ ...f, classification_scope: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="risk_engine">risk_engine</SelectItem>
                  <SelectItem value="diagnostic_only">diagnostic_only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Regimes tributários aplicáveis</Label>
              <TaxRegimesMultiSelect
                value={editForm.tax_regimes}
                onChange={(v) => setEditForm((f) => ({ ...f, tax_regimes: v }))}
              />
              <p className="text-xs text-muted-foreground">"Todos" (nenhum selecionado) = universal (persiste NULL).</p>
            </div>
            <div className="space-y-1">
              <Label>Grupos CNAE aplicáveis</Label>
              <CnaeGroupsChipInput
                value={editForm.cnae_groups}
                onChange={(v) => setEditForm((f) => ({ ...f, cnae_groups: v }))}
              />
              <p className="text-xs text-muted-foreground">Vazio = "Todos os CNAEs" (universal, persiste NULL).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuestion(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
              ) : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de criação de pergunta */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); resetCreateForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Pergunta Solaris</DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo. O código (SOL-NNN) será gerado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="create-titulo">Título *</Label>
              <Input
                id="create-titulo"
                placeholder="Ex: Obrigação de emissão de NF-e"
                value={createForm.titulo}
                onChange={(e) => setCreateForm((f) => ({ ...f, titulo: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-texto">Texto / Conteúdo *</Label>
              <Textarea
                id="create-texto"
                rows={6}
                placeholder="Texto completo da pergunta que será exibida no questionário..."
                value={createForm.texto}
                onChange={(e) => setCreateForm((f) => ({ ...f, texto: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Categoria *</Label>
                <Select
                  value={createForm.categoria}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, categoria: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contabilidade_fiscal">Contabilidade Fiscal</SelectItem>
                    <SelectItem value="negocio">Negócio</SelectItem>
                    <SelectItem value="ti">TI</SelectItem>
                    <SelectItem value="juridico">Jurídico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Severidade</Label>
                <Select
                  value={createForm.severidade_base || "_none"}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, severidade_base: v === "_none" ? "" : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Nenhuma</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="create-vigencia">Vigência Início</Label>
                <Input
                  id="create-vigencia"
                  placeholder="2026-01-01"
                  value={createForm.vigencia_inicio}
                  onChange={(e) => setCreateForm((f) => ({ ...f, vigencia_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="create-risk-code">Risk Category Code</Label>
                <Input
                  id="create-risk-code"
                  placeholder="Ex: TRIB-001"
                  value={createForm.risk_category_code}
                  onChange={(e) => setCreateForm((f) => ({ ...f, risk_category_code: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-topicos">Tópicos</Label>
              <Textarea
                id="create-topicos"
                rows={2}
                placeholder="IBS, CBS, NF-e (separados por vírgula)"
                value={createForm.topicos}
                onChange={(e) => setCreateForm((f) => ({ ...f, topicos: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Classification Scope</Label>
                <Select
                  value={createForm.classification_scope}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, classification_scope: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="risk_engine">risk_engine</SelectItem>
                    <SelectItem value="diagnostic_only">diagnostic_only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Grupos CNAE aplicáveis</Label>
                <CnaeGroupsChipInput
                  value={createForm.cnae_groups}
                  onChange={(v) => setCreateForm((f) => ({ ...f, cnae_groups: v }))}
                />
                <p className="text-xs text-muted-foreground">Vazio = "Todos os CNAEs" (universal).</p>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Regimes tributários aplicáveis</Label>
              <TaxRegimesMultiSelect
                value={createForm.tax_regimes}
                onChange={(v) => setCreateForm((f) => ({ ...f, tax_regimes: v }))}
              />
              <p className="text-xs text-muted-foreground">"Todos" (nenhum selecionado) = universal (persiste NULL).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetCreateForm(); }}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</>
              ) : "Criar Pergunta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          {/* CNAE-ADMIN-01 — marcador de build (verificação de deploy): qual bundle está no ar. */}
          <p className="text-[10px] text-muted-foreground/70 mt-0.5" data-testid="build-hash">
            build: {(import.meta.env as Record<string, string | undefined>).VITE_BUILD_HASH ?? "dev"}
          </p>
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
