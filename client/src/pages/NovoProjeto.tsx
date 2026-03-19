// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { searchCnaes, getCnaeByCode, type CnaeEntry } from "@/../../shared/cnae-table";
import { useAutoSave, loadTempData, clearTempData } from "@/hooks/usePersistenceV3";
import { ResumeBanner } from "@/components/ResumeBanner";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import ComplianceLayout from "@/components/ComplianceLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, ArrowRight, Building2, Loader2, Plus, Sparkles, CheckCircle2,
  Edit2, AlertCircle, ChevronRight, Search, X, RefreshCw, MessageSquare,
  ChevronDown, ChevronUp, Info, Lock
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Cnae {
  code: string;
  description: string;
  confidence: number;
  justification?: string;
}

function CnaeCard({ cnae, selected, onToggle, onEdit }: {
  cnae: Cnae; selected: boolean; onToggle: () => void; onEdit: (cnae: Cnae) => void;
}) {
  const confidenceColor =
    cnae.confidence >= 80 ? "bg-emerald-100 text-emerald-700" :
    cnae.confidence >= 60 ? "bg-amber-100 text-amber-700" :
    "bg-red-100 text-red-700";
  return (
    <div
      className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 ${selected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-semibold text-primary">{cnae.code}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${confidenceColor}`}>{cnae.confidence}% relevância</span>
          </div>
          <p className="text-sm font-medium text-foreground leading-snug">{cnae.description}</p>
          {cnae.justification && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{cnae.justification}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button className="p-1.5 rounded-lg hover:bg-muted transition-colors" onClick={(e) => { e.stopPropagation(); onEdit(cnae); }}>
            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selected ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
            {selected && <CheckCircle2 className="h-4 w-4 text-white" />}
          </div>
        </div>
      </div>
    </div>
  );
}

// Máscara de CNPJ: formata enquanto o usuário digita (XX.XXX.XXX/XXXX-XX)
function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function NovoClienteModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number, name: string) => void; }) {
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const cnpjDigits = cnpj.replace(/\D/g, "");
  const cnpjValid = cnpjDigits.length === 0 || cnpjDigits.length === 14;
  const createClient = trpc.fluxoV3.createClientOnTheFly.useMutation({
    onSuccess: (data) => { toast.success(`Cliente criado!`); onCreated(data.userId, data.companyName); onClose(); setCompanyName(""); setCnpj(""); setEmail(""); setPhone(""); },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Novo Cliente</DialogTitle>
          <DialogDescription>Cadastre rapidamente um novo cliente para vincular ao projeto.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Razão Social <span className="text-destructive">*</span></Label>
            <Input placeholder="Ex: Empresa ABC Ltda" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>CNPJ</Label>
            <Input
              placeholder="00.000.000/0000-00"
              value={cnpj}
              onChange={(e) => setCnpj(maskCnpj(e.target.value))}
              maxLength={18}
              className={!cnpjValid ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {!cnpjValid && (
              <p className="text-xs text-destructive">CNPJ deve ter 14 dígitos (ex: 11.222.333/0001-81)</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" placeholder="contato@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Telefone</Label><Input placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => createClient.mutate({ companyName, cnpj: cnpj || undefined, email: email || undefined, phone: phone || undefined })} disabled={!companyName.trim() || createClient.isPending || !cnpjValid}>
            {createClient.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}Criar Cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditCnaeModal({ cnae, onSave, onClose }: { cnae: Cnae | null; onSave: (updated: Cnae) => void; onClose: () => void; }) {
  const [code, setCode] = useState(cnae?.code || "");
  const [description, setDescription] = useState(cnae?.description || "");
  const [justification, setJustification] = useState(cnae?.justification || "");
  if (!cnae) return null;
  return (
    <Dialog open={!!cnae} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Editar CNAE</DialogTitle><DialogDescription>Ajuste os dados do CNAE.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5"><Label>Código CNAE</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex: 6201-5/01" /></div>
          <div className="space-y-1.5"><Label>Descrição</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Justificativa</Label><Textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { onSave({ ...cnae, code, description, justification }); onClose(); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
// ID fixo para rascunho antes de criar o projeto no banco
const DRAFT_PROJECT_ID = 0;

export default function NovoProjeto() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  // Estado local para exibir card do cliente recém-criado antes do refetch completar
  const [pendingClientName, setPendingClientName] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number>(0);

  // Verificar rascunho salvo ao montar
  useEffect(() => {
    const saved = loadTempData(DRAFT_PROJECT_ID, 'etapa1');
    if (saved && (saved.data?.name || saved.data?.description)) {
      setDraftSavedAt(saved.savedAt);
      setShowResumeBanner(true);
    }
  }, []);

  const handleResumeDraft = () => {
    const saved = loadTempData(DRAFT_PROJECT_ID, 'etapa1');
    if (saved?.data) {
      setName(saved.data.name || '');
      setDescription(saved.data.description || '');
      if (saved.data.clientId) setClientId(saved.data.clientId);
    }
    setShowResumeBanner(false);
  };

  const handleDiscardDraft = () => {
    clearTempData(DRAFT_PROJECT_ID, 'etapa1');
    setShowResumeBanner(false);
  };
  const [showCnaeModal, setShowCnaeModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [editingCnae, setEditingCnae] = useState<Cnae | null>(null);
  const [suggestedCnaes, setSuggestedCnaes] = useState<Cnae[]>([]);
  const [selectedCnaes, setSelectedCnaes] = useState<Set<string>>(new Set());
  const [customCnaes, setCustomCnaes] = useState<Cnae[]>([]);
  const [newCnaeCode, setNewCnaeCode] = useState("");
  const [newCnaeDesc, setNewCnaeDesc] = useState("");
  // Autocomplete CNAE manual
  const [cnaeSearchQuery, setCnaeSearchQuery] = useState("");
  const [cnaeSearchResults, setCnaeSearchResults] = useState<CnaeEntry[]>([]);
  const [showCnaeDropdown, setShowCnaeDropdown] = useState(false);
  const cnaeSearchRef = useRef<HTMLDivElement>(null);
  // RF-1.05: loop de refinamento de CNAEs
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [refinementIteration, setRefinementIteration] = useState(1);

  // v2.1: Company Profile Layer (OBRIGATÓRIO)
  // Bloco 1: Identificação
  const [cnpj, setCnpj] = useState("");
  const [cnpjError, setCnpjError] = useState("");
  const [foundingYear, setFoundingYear] = useState("");
  const [stateUF, setStateUF] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [annualRevenueRange, setAnnualRevenueRange] = useState("");
  const [taxRegime, setTaxRegime] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [companySize, setCompanySize] = useState("");
  // Bloco 2: Operação
  const [operationType, setOperationType] = useState("");
  const [clientType, setClientType] = useState<string[]>([]);
  const [multiState, setMultiState] = useState<boolean | null>(null);
  const [geographicScope, setGeographicScope] = useState("");
  // Bloco 3: Complexidade Tributária
  const [hasMultipleEstablishments, setHasMultipleEstablishments] = useState<boolean | null>(null);
  const [hasImportExport, setHasImportExport] = useState<boolean | null>(null);
  const [hasSpecialRegimes, setHasSpecialRegimes] = useState<boolean | null>(null);
  // Bloco 4: Financeiro
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [hasIntermediaries, setHasIntermediaries] = useState<boolean | null>(null);
  // Bloco 5: Governança
  const [hasTaxTeam, setHasTaxTeam] = useState<boolean | null>(null);
  const [hasAudit, setHasAudit] = useState<boolean | null>(null);
  const [hasTaxIssues, setHasTaxIssues] = useState<boolean | null>(null);

  const { data: clients, refetch: refetchClients } = trpc.users.listClients.useQuery();

  const createProject = trpc.fluxoV3.createProject.useMutation({
    onSuccess: (data) => { setProjectId(data.projectId); extractCnaes.mutate({ projectId: data.projectId, description }); },
    onError: (err) => toast.error(`Erro ao criar projeto: ${err.message}`),
  });

  const extractCnaes = trpc.fluxoV3.extractCnaes.useMutation({
    onSuccess: (data) => {
      setSuggestedCnaes(data.cnaes);
      setSelectedCnaes(new Set(data.cnaes.map((c: Cnae) => c.code)));
      setShowCnaeModal(true);
    },
    onError: () => { toast.error("Não foi possível extrair CNAEs automaticamente. Adicione manualmente."); setShowCnaeModal(true); },
  });

  const refineCnaes = trpc.fluxoV3.refineCnaes.useMutation({
    onSuccess: (data) => {
      setSuggestedCnaes(data.cnaes);
      setSelectedCnaes(new Set(data.cnaes.map((c: Cnae) => c.code)));
      setCustomCnaes([]);
      setRefinementIteration(prev => prev + 1);
      setFeedbackText("");
      setShowFeedbackPanel(false);
      toast.success(`Nova análise concluída (iteração ${refinementIteration + 1}). Revise os CNAEs atualizados.`);
    },
    onError: (err) => toast.error(`Erro ao refinar CNAEs: ${err.message}`),
  });

  const handleRefineCnaes = () => {
    if (!projectId) return toast.error("Projeto não encontrado. Recarregue a página e tente novamente.");
    if (feedbackText.trim().length < 5) return toast.error("Descreva o que precisa ser ajustado (mínimo 5 caracteres)");
    const allCurrent = [...suggestedCnaes, ...customCnaes];
    refineCnaes.mutate({
      projectId,
      description,
      feedback: feedbackText.trim(),
      currentCnaes: allCurrent,
      iteration: refinementIteration,
    });
  };

  const confirmCnaes = trpc.fluxoV3.confirmCnaes.useMutation({
    onSuccess: () => {
      clearTempData(DRAFT_PROJECT_ID, 'etapa1');
      toast.success("CNAEs confirmados! Avançando para o questionário...");
      setShowCnaeModal(false);
      setLocation(`/projetos/${projectId}/questionario-v3`);
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  // Auto-save no localStorage a cada 500ms de inatividade
  useAutoSave(DRAFT_PROJECT_ID, 'etapa1', { name, description, clientId }, 500);

  // v2.1: Validação CNPJ com dígito verificador (módulo 11)
  const validateCnpjDV = (digits: string): boolean => {
    if (digits.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(digits)) return false; // todos iguais
    const calc = (d: string, weights: number[]) =>
      d.split("").slice(0, weights.length).reduce((acc, n, i) => acc + parseInt(n) * weights[i], 0);
    const w1 = [5,4,3,2,9,8,7,6,5,4,3,2];
    const w2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
    const r1 = calc(digits, w1) % 11;
    const d1 = r1 < 2 ? 0 : 11 - r1;
    const r2 = calc(digits, w2) % 11;
    const d2 = r2 < 2 ? 0 : 11 - r2;
    return parseInt(digits[12]) === d1 && parseInt(digits[13]) === d2;
  };

  const handleCnpjChange = (value: string) => {
    const masked = maskCnpj(value);
    setCnpj(masked);
    const digits = masked.replace(/\D/g, "");
    if (digits.length === 0) { setCnpjError(""); return; }
    if (digits.length < 14) { setCnpjError(""); return; }
    if (!validateCnpjDV(digits)) setCnpjError("CNPJ inválido — verifique os dígitos verificadores");
    else setCnpjError("");
  };

  const toggleClientType = (val: string) =>
    setClientType(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const togglePaymentMethod = (val: string) =>
    setPaymentMethods(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  // v2.1: Computed validation flags
  const cnpjDigits = cnpj.replace(/\D/g, "");
  const cnpjFilled = cnpjDigits.length === 14;
  const cnpjValid = cnpjFilled && !cnpjError;
  const profileValid =
    cnpjValid &&
    !!companyType &&
    !!companySize &&
    !!taxRegime &&
    !!operationType &&
    clientType.length > 0 &&
    multiState !== null;

  const handleSubmit = () => {
    if (!name.trim()) return toast.error("Informe o nome do projeto");
    if (description.trim().length < 100) return toast.error("A descrição deve ter pelo menos 100 caracteres");
    if (!clientId) return toast.error("Selecione um cliente");
    // v2.1: Validar campos obrigatórios do Company Profile
    if (!cnpjFilled || cnpjError) return toast.error("CNPJ é obrigatório e deve ser válido (com dígito verificador)");
    if (!companyType) return toast.error("Selecione o Tipo Jurídico da empresa");
    if (!companySize) return toast.error("Selecione o Porte da empresa");
    if (!taxRegime) return toast.error("Selecione o Regime Tributário");
    if (!operationType) return toast.error("Selecione o Tipo de Operação");
    if (clientType.length === 0) return toast.error("Selecione pelo menos 1 Tipo de Cliente");
    if (multiState === null) return toast.error("Informe se a empresa opera em múltiplos estados");
    // v2.1: Montar os blocos do Company Profile (obrigatórios)
    const companyProfile = {
      cnpj,
      companyType,
      companySize,
      foundingYear: foundingYear ? parseInt(foundingYear) : undefined,
      stateUF: stateUF || undefined,
      employeeCount: employeeCount || undefined,
      annualRevenueRange: annualRevenueRange || undefined,
      taxRegime,
    };
    const operationProfile = {
      operationType,
      clientType,
      multiState,
      geographicScope: geographicScope || undefined,
    };
    const taxComplexity = (hasMultipleEstablishments !== null || hasImportExport !== null || hasSpecialRegimes !== null) ? {
      hasMultipleEstablishments: hasMultipleEstablishments ?? undefined,
      hasImportExport: hasImportExport ?? undefined,
      hasSpecialRegimes: hasSpecialRegimes ?? undefined,
    } : undefined;
    const financialProfile = (paymentMethods.length > 0 || hasIntermediaries !== null) ? {
      paymentMethods: paymentMethods.length > 0 ? paymentMethods : undefined,
      hasIntermediaries: hasIntermediaries ?? undefined,
    } : undefined;
    const governanceProfile = (hasTaxTeam !== null || hasAudit !== null || hasTaxIssues !== null) ? {
      hasTaxTeam: hasTaxTeam ?? undefined,
      hasAudit: hasAudit ?? undefined,
      hasTaxIssues: hasTaxIssues ?? undefined,
    } : undefined;
    createProject.mutate({
      name: name.trim(),
      description: description.trim(),
      clientId,
      companyProfile,
      operationProfile,
      taxComplexity,
      financialProfile,
      governanceProfile,
    } as any);
  };

  const handleConfirmCnaes = () => {
    if (!projectId) return;
    const allCnaes = [...suggestedCnaes, ...customCnaes];
    const finalCnaes = allCnaes.filter(c => selectedCnaes.has(c.code));
    if (finalCnaes.length === 0) return toast.error("Selecione pelo menos 1 CNAE");
    confirmCnaes.mutate({ projectId, cnaes: finalCnaes });
  };

  const toggleCnae = (code: string) => {
    setSelectedCnaes(prev => { const next = new Set(prev); if (next.has(code)) next.delete(code); else next.add(code); return next; });
  };

  const handleAddCustomCnae = () => {
    if (!newCnaeCode.trim() || !newCnaeDesc.trim()) return;
    const newCnae: Cnae = { code: newCnaeCode.trim(), description: newCnaeDesc.trim(), confidence: 100, justification: "Adicionado manualmente" };
    setCustomCnaes(prev => [...prev, newCnae]);
    setSelectedCnaes(prev => new Set([...prev, newCnae.code]));
    setNewCnaeCode(""); setNewCnaeDesc("");
  };

  // Autocomplete: buscar CNAEs enquanto o usuário digita
  const handleCnaeSearch = (query: string) => {
    setCnaeSearchQuery(query);
    if (query.trim().length >= 2) {
      const results = searchCnaes(query, 8);
      setCnaeSearchResults(results);
      setShowCnaeDropdown(results.length > 0);
    } else {
      setCnaeSearchResults([]);
      setShowCnaeDropdown(false);
    }
  };

  const handleSelectCnaeFromDropdown = (entry: CnaeEntry) => {
    // Adicionar diretamente à lista sem precisar de segundo clique
    const newCnae: Cnae = {
      code: entry.code,
      description: entry.description,
      confidence: 100,
      justification: "Adicionado manualmente via busca",
    };
    if (!customCnaes.find(c => c.code === entry.code) && !suggestedCnaes.find(c => c.code === entry.code)) {
      setCustomCnaes(prev => [...prev, newCnae]);
      setSelectedCnaes(prev => new Set([...prev, newCnae.code]));
      toast.success(`CNAE ${entry.code} adicionado!`);
    } else {
      toast.info(`CNAE ${entry.code} já está na lista.`);
    }
    setCnaeSearchQuery("");
    setNewCnaeCode("");
    setNewCnaeDesc("");
    setShowCnaeDropdown(false);
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cnaeSearchRef.current && !cnaeSearchRef.current.contains(e.target as Node)) {
        setShowCnaeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEditCnae = (updated: Cnae) => {
    setSuggestedCnaes(prev => prev.map(c => c.code === editingCnae?.code ? updated : c));
    setCustomCnaes(prev => prev.map(c => c.code === editingCnae?.code ? updated : c));
    if (editingCnae && editingCnae.code !== updated.code) {
      setSelectedCnaes(prev => { const next = new Set(prev); next.delete(editingCnae.code); next.add(updated.code); return next; });
    }
  };

  const filteredClients = clients?.filter(c =>
    c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(clientSearch.toLowerCase())
  );
  // Usar pendingClientName como fallback enquanto o refetch não retorna o novo cliente
  const selectedClient = clients?.find(c => c.id === clientId) ||
    (clientId && pendingClientName ? { id: clientId, name: pendingClientName, companyName: pendingClientName, cnpj: undefined } : undefined);
  const allCnaes = [...suggestedCnaes, ...customCnaes];
  const selectedCount = allCnaes.filter(c => selectedCnaes.has(c.code)).length;
  const descLength = description.trim().length;
  const descProgress = Math.min((descLength / 300) * 100, 100);
  const isLoading = createProject.isPending || extractCnaes.isPending;

  return (
    <ComplianceLayout>
      <div className="max-w-2xl mx-auto space-y-8 py-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href="/projetos"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Novo Projeto</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Etapa 1 de 5 — Criação do Projeto</p>
          </div>
        </div>

        {showResumeBanner && (
          <ResumeBanner
            savedAt={draftSavedAt}
            onResume={handleResumeDraft}
            onDiscard={handleDiscardDraft}
            label="rascunho do projeto"
          />
        )}

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {["Projeto", "Questionário", "Briefing", "Riscos", "Plano"].map((step, i) => (
            <div key={step} className="flex items-center gap-2 shrink-0">
              <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? "bg-white/20" : "bg-muted-foreground/20"}`}>{i + 1}</span>
                {step}
              </div>
              {i < 4 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
            </div>
          ))}
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Informações do Projeto</CardTitle>
            <CardDescription>Preencha os dados abaixo. A IA irá analisar a descrição para identificar os CNAEs automaticamente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="project-name" className="text-sm font-semibold">Nome do Projeto <span className="text-destructive">*</span></Label>
              <Input id="project-name" placeholder="Ex: Diagnóstico Tributário 2025 — Empresa ABC" value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-sm font-semibold">Descrição do Negócio <span className="text-destructive">*</span></Label>
                <span className={`text-xs font-medium ${descLength >= 100 ? "text-emerald-600" : "text-muted-foreground"}`}>{descLength} caracteres {descLength < 100 && `(mín. 100)`}</span>
              </div>
              <Textarea
                id="description"
                placeholder={"Descreva o negócio da empresa: principais atividades, como funciona a operação, desafios tributários atuais, regime tributário, setores de atuação, produtos/serviços oferecidos...\n\nQuanto mais detalhada a descrição, mais precisos serão os CNAEs identificados pela IA."}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={7}
                className="resize-none leading-relaxed"
              />
              <Progress value={descProgress} className="h-1.5" />
              {descLength >= 100 && (
                <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Descrição suficiente para análise da IA</p>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Cliente Vinculado <span className="text-destructive">*</span></Label>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary" onClick={() => setShowNewClientModal(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Novo Cliente
                </Button>
              </div>
              {selectedClient ? (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-primary/5 border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="h-4 w-4 text-primary" /></div>
                    <div>
                      <p className="text-sm font-semibold">{selectedClient.companyName || selectedClient.name}</p>
                      {selectedClient.cnpj && <p className="text-xs text-muted-foreground">{selectedClient.cnpj}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setClientId(null); setClientSearch(""); }}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar cliente por nome ou empresa..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="pl-9" />
                  </div>
                  {clientSearch && (
                    <div className="border rounded-lg divide-y max-h-48 overflow-y-auto shadow-sm">
                      {filteredClients && filteredClients.length > 0 ? (
                        filteredClients.map(client => (
                          <button key={client.id} className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left" onClick={() => { setClientId(client.id); setClientSearch(""); }}>
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                              <p className="text-sm font-medium">{client.companyName || client.name}</p>
                              {client.cnpj && <p className="text-xs text-muted-foreground">{client.cnpj}</p>}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Nenhum cliente encontrado.{" "}
                          <button className="text-primary hover:underline" onClick={() => setShowNewClientModal(true)}>Criar novo cliente</button>
                        </div>
                      )}
                    </div>
                  )}
                  {!clientSearch && (
                    <p className="text-xs text-muted-foreground">
                      Digite para buscar ou{" "}
                      <button className="text-primary hover:underline" onClick={() => setShowNewClientModal(true)}>crie um novo cliente</button>
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* v2.1.1: Company Profile Layer — GATE DO SISTEMA */}
        <Card className={`shadow-sm transition-colors ${profileValid ? "border-emerald-500/40" : "border-destructive/40"}`}>
          <div className="px-6 pt-5 pb-2">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${profileValid ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                {profileValid
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  : <Lock className="h-4 w-4 text-destructive" />
                }
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Perfil da Empresa</p>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${profileValid ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>
                    {profileValid ? "Preenchido" : "Obrigatório"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Essas informações são necessárias para iniciar o diagnóstico tributário e gerar o questionário personalizado.
                </p>
              </div>
            </div>
          </div>

          <CardContent className="pt-2 pb-6 space-y-6">
              <Separator />

              {/* Bloco 1: Identificação */}
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">1. Identificação</p>
                <div className="grid grid-cols-2 gap-4">
                  {/* CNPJ — obrigatório */}
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-sm">CNPJ <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="00.000.000/0000-00"
                      value={cnpj}
                      onChange={(e) => handleCnpjChange(e.target.value)}
                      maxLength={18}
                      className={cnpjError ? "border-destructive" : cnpjValid ? "border-emerald-500" : ""}
                    />
                    {cnpjError && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{cnpjError}</p>}
                    {cnpjValid && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />CNPJ válido</p>
                    )}
                    {!cnpjFilled && cnpjDigits.length > 0 && (
                      <p className="text-xs text-muted-foreground">{14 - cnpjDigits.length} dígito(s) restante(s)</p>
                    )}
                  </div>
                  {/* Tipo Jurídico — obrigatório */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Tipo Jurídico <span className="text-destructive">*</span></Label>
                    <Select value={companyType} onValueChange={setCompanyType}>
                      <SelectTrigger className={!companyType ? "border-amber-400/60" : ""}><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ltda">Ltda</SelectItem>
                        <SelectItem value="sa">S.A.</SelectItem>
                        <SelectItem value="mei">MEI</SelectItem>
                        <SelectItem value="eireli">Eireli</SelectItem>
                        <SelectItem value="scp">SCP</SelectItem>
                        <SelectItem value="cooperativa">Cooperativa</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Porte — obrigatório */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Porte <span className="text-destructive">*</span></Label>
                    <Select value={companySize} onValueChange={setCompanySize}>
                      <SelectTrigger className={!companySize ? "border-amber-400/60" : ""}><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mei">MEI</SelectItem>
                        <SelectItem value="micro">Microempresa</SelectItem>
                        <SelectItem value="pequena">Pequena Empresa</SelectItem>
                        <SelectItem value="media">Média Empresa</SelectItem>
                        <SelectItem value="grande">Grande Empresa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Regime Tributário — obrigatório */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Regime Tributário <span className="text-destructive">*</span></Label>
                    <Select value={taxRegime} onValueChange={setTaxRegime}>
                      <SelectTrigger className={!taxRegime ? "border-amber-400/60" : ""}><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                        <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                        <SelectItem value="lucro_real">Lucro Real</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Ano de Fundação — opcional */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Ano de Fundação</Label>
                    <Input placeholder="Ex: 2010" value={foundingYear} onChange={(e) => setFoundingYear(e.target.value.replace(/\D/g, "").slice(0, 4))} maxLength={4} />
                  </div>
                  {/* Estado (UF) — opcional */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Estado (UF)</Label>
                    <Select value={stateUF} onValueChange={setStateUF}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Número de Funcionários — opcional */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Número de Funcionários</Label>
                    <Select value={employeeCount} onValueChange={setEmployeeCount}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-9">1 a 9 (MEI/ME)</SelectItem>
                        <SelectItem value="10-49">10 a 49 (Pequena)</SelectItem>
                        <SelectItem value="50-249">50 a 249 (Média)</SelectItem>
                        <SelectItem value="250+">250+ (Grande)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Faturamento Anual — opcional */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Faturamento Anual</Label>
                    <Select value={annualRevenueRange} onValueChange={setAnnualRevenueRange}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ate_360k">Até R$ 360 mil (Simples)</SelectItem>
                        <SelectItem value="360k_4_8m">R$ 360 mil a R$ 4,8 mi</SelectItem>
                        <SelectItem value="4_8m_78m">R$ 4,8 mi a R$ 78 mi</SelectItem>
                        <SelectItem value="acima_78m">Acima de R$ 78 mi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Bloco 2: Operação */}
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">2. Operação</p>
                {/* Tipo de Operação — obrigatório */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Tipo de Operação <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2 flex-wrap">
                    {[["produto","Venda de Produtos"],["servico","Prestação de Serviços"],["misto","Misto (Produto + Serviço)"]].map(([val, label]) => (
                      <button key={val} type="button"
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                          operationType === val ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50"
                        }`}
                        onClick={() => setOperationType(operationType === val ? "" : val)}
                      >{label}</button>
                    ))}
                  </div>
                  {!operationType && <p className="text-xs text-amber-600">Selecione o tipo de operação</p>}
                </div>
                {/* Tipo de Cliente — obrigatório (mínimo 1) */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Tipo de Cliente <span className="text-destructive">*</span> <span className="text-xs text-muted-foreground">(mínimo 1)</span></Label>
                  <div className="flex gap-4 flex-wrap">
                    {[["B2B","B2B (Empresas)"],["B2C","B2C (Consumidores)"],["Governo","Governo"]].map(([val, label]) => (
                      <label key={val} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={clientType.includes(val)} onCheckedChange={() => toggleClientType(val)} />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                  {clientType.length === 0 && <p className="text-xs text-amber-600">Selecione pelo menos 1 tipo de cliente</p>}
                </div>
                {/* Opera em múltiplos estados — obrigatório */}
                <div className="flex items-center justify-between">
                  <span className="text-sm">Opera em múltiplos estados? <span className="text-destructive">*</span></span>
                  <div className="flex gap-2">
                    {([[true,"Sim"],[false,"Não"]] as [boolean, string][]).map(([bval, blabel]) => (
                      <button key={blabel} type="button"
                        className={`px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${
                          multiState === bval ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50"
                        }`}
                        onClick={() => setMultiState(multiState === bval ? null : bval)}
                      >{blabel}</button>
                    ))}
                  </div>
                </div>
                {multiState === null && <p className="text-xs text-amber-600">Informe se opera em múltiplos estados</p>}
                {/* Abrangência Geográfica — opcional */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Abrangência Geográfica</Label>
                  <Select value={geographicScope} onValueChange={setGeographicScope}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local (1 município)</SelectItem>
                      <SelectItem value="regional">Regional (vários municípios)</SelectItem>
                      <SelectItem value="estadual">Estadual</SelectItem>
                      <SelectItem value="nacional">Nacional</SelectItem>
                      <SelectItem value="internacional">Internacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Bloco 3: Complexidade Tributária */}
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">3. Complexidade Tributária</p>
                {[
                  ["hasMultipleEstablishments", hasMultipleEstablishments, setHasMultipleEstablishments, "Possui múltiplos estabelecimentos/filiais?"],
                  ["hasImportExport", hasImportExport, setHasImportExport, "Realiza operações de importação ou exportação?"],
                  ["hasSpecialRegimes", hasSpecialRegimes, setHasSpecialRegimes, "Possui regimes tributários especiais (RECOF, Drawback, ZFM, etc.)?"],
                ].map(([key, val, setter, label]) => (
                  <div key={key as string} className="flex items-center justify-between">
                    <span className="text-sm">{label as string}</span>
                    <div className="flex gap-2">
                      {[[true,"Sim"],[false,"Não"]].map(([bval, blabel]) => (
                        <button key={blabel as string} type="button"
                          className={`px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${
                            val === bval ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50"
                          }`}
                          onClick={() => (setter as any)(val === bval ? null : bval)}
                        >{blabel as string}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Bloco 4: Financeiro */}
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">4. Financeiro</p>
                <div className="space-y-1.5">
                  <Label className="text-sm">Meios de Pagamento <span className="text-xs text-muted-foreground">(múltipla seleção)</span></Label>
                  <div className="flex gap-4 flex-wrap">
                    {[["Pix","Pix"],["Cartao","Cartão"],["Boleto","Boleto"],["Outros","Outros"]].map(([val, label]) => (
                      <label key={val} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={paymentMethods.includes(val)} onCheckedChange={() => togglePaymentMethod(val)} />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Utiliza intermediários financeiros (marketplace, plataformas)?</span>
                  <div className="flex gap-2">
                    {[[true,"Sim"],[false,"Não"]].map(([bval, blabel]) => (
                      <button key={blabel as string} type="button"
                        className={`px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${
                          hasIntermediaries === bval ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50"
                        }`}
                        onClick={() => setHasIntermediaries(hasIntermediaries === bval ? null : bval as boolean)}
                      >{blabel as string}</button>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Bloco 5: Governança */}
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">5. Governança</p>
                {[
                  ["hasTaxTeam", hasTaxTeam, setHasTaxTeam, "Possui equipe tributária interna (contador, advogado fiscal)?"],
                  ["hasAudit", hasAudit, setHasAudit, "Realiza auditoria fiscal periódica?"],
                  ["hasTaxIssues", hasTaxIssues, setHasTaxIssues, "Possui passivo tributário ou pendências com a Receita Federal?"],
                ].map(([key, val, setter, label]) => (
                  <div key={key as string} className="flex items-center justify-between">
                    <span className="text-sm">{label as string}</span>
                    <div className="flex gap-2">
                      {[[true,"Sim"],[false,"Não"]].map(([bval, blabel]) => (
                        <button key={blabel as string} type="button"
                          className={`px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${
                            val === bval ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50"
                          }`}
                          onClick={() => (setter as any)(val === bval ? null : bval)}
                        >{blabel as string}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
        </Card>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-primary">Análise Inteligente de CNAEs</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Ao avançar, a IA analisará a descrição do negócio e identificará automaticamente os CNAEs relevantes. Você poderá confirmar, editar ou adicionar CNAEs antes de prosseguir.
            </p>
          </div>
        </div>

        {/* v2.1.1: Banner GATE — bloqueia avanço */}
        {!profileValid && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/8 border-2 border-destructive/30">
            <Lock className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive">Preencha os dados obrigatórios do Perfil da Empresa para continuar.</p>
              <p className="text-xs text-muted-foreground mt-0.5">Campos faltantes:</p>
              <ul className="text-xs text-destructive/80 mt-1 space-y-0.5">
                {!cnpjValid && <li className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-destructive/60 shrink-0" />CNPJ válido com dígito verificador</li>}
                {!companyType && <li className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-destructive/60 shrink-0" />Tipo Jurídico</li>}
                {!companySize && <li className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-destructive/60 shrink-0" />Porte da empresa</li>}
                {!taxRegime && <li className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-destructive/60 shrink-0" />Regime Tributário</li>}
                {!operationType && <li className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-destructive/60 shrink-0" />Tipo de Operação</li>}
                {clientType.length === 0 && <li className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-destructive/60 shrink-0" />Tipo de Cliente (mínimo 1)</li>}
                {multiState === null && <li className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-destructive/60 shrink-0" />Opera em múltiplos estados (Sim/Não)</li>}
              </ul>
            </div>
          </div>
        )}

        <div className="flex justify-end pb-4">
          <Button size="lg" onClick={handleSubmit} disabled={isLoading || !name.trim() || descLength < 100 || !clientId || !profileValid} className="min-w-[220px]">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />{createProject.isPending ? "Criando projeto..." : "Analisando CNAEs..."}</>
            ) : (
              <>Avançar — Identificar CNAEs<Sparkles className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        </div>
      </div>

      {/* Modal CNAEs */}
      <Dialog open={showCnaeModal} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />CNAEs Identificados pela IA</DialogTitle>
            <DialogDescription>A IA identificou os CNAEs abaixo com base na descrição do negócio. Confirme, edite ou adicione CNAEs antes de prosseguir.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {extractCnaes.isPending ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Analisando a descrição do negócio...</p>
              </div>
            ) : (
              <>
                {allCnaes.length > 0 ? (
                  <div className="space-y-3">
                    {allCnaes.map((cnae) => (
                      <CnaeCard key={cnae.code} cnae={cnae} selected={selectedCnaes.has(cnae.code)} onToggle={() => toggleCnae(cnae.code)} onEdit={(c) => setEditingCnae(c)} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                    <AlertCircle className="h-8 w-8" />
                    <p className="text-sm">Nenhum CNAE identificado automaticamente.</p>
                    <p className="text-xs">Adicione CNAEs manualmente abaixo.</p>
                  </div>
                )}
                <div className="border rounded-xl p-4 bg-muted/30 space-y-3" ref={cnaeSearchRef}>
                  <p className="text-sm font-semibold flex items-center gap-2"><Search className="h-4 w-4 text-primary" />Buscar e Adicionar CNAE</p>
                  <p className="text-xs text-muted-foreground">Digite o código (ex: 4744) ou palavras-chave (ex: moldura, software, transporte)</p>
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por código ou descrição..."
                        value={cnaeSearchQuery}
                        onChange={(e) => handleCnaeSearch(e.target.value)}
                        onFocus={() => cnaeSearchQuery.length >= 2 && setShowCnaeDropdown(cnaeSearchResults.length > 0)}
                        className="pl-9 text-sm"
                      />
                      {cnaeSearchQuery && (
                        <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => { setCnaeSearchQuery(""); setNewCnaeCode(""); setNewCnaeDesc(""); setShowCnaeDropdown(false); }}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {showCnaeDropdown && cnaeSearchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        {cnaeSearchResults.map((entry) => (
                          <button
                            key={entry.code}
                            className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors border-b last:border-b-0 flex items-start gap-2"
                            onMouseDown={(e) => { e.preventDefault(); handleSelectCnaeFromDropdown(entry); }}
                          >
                            <span className="font-mono text-xs font-semibold text-primary shrink-0 mt-0.5">{entry.code}</span>
                            <span className="text-xs text-foreground leading-snug">{entry.description}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {cnaeSearchQuery.length >= 2 && cnaeSearchResults.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1.5 pl-1">Nenhum CNAE encontrado. Tente outras palavras-chave.</p>
                    )}
                  </div>
                  {newCnaeCode && newCnaeDesc && (
                    <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
                      <span className="font-mono text-xs font-semibold text-primary">{newCnaeCode}</span>
                      <span className="text-xs text-foreground flex-1 truncate">{newCnaeDesc}</span>
                      <Button size="sm" className="h-7 text-xs" onClick={handleAddCustomCnae}>
                        <Plus className="h-3 w-3 mr-1" />Adicionar
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          {/* RF-1.05: Painel de feedback para nova análise */}
          {showFeedbackPanel && (
            <div className="border rounded-xl p-4 bg-amber-50 border-amber-200 space-y-3 mx-1 mb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  O que precisa ser ajustado? {refinementIteration > 1 && <span className="text-xs font-normal text-amber-600">(iteração {refinementIteration})</span>}
                </p>
                <button className="text-amber-600 hover:text-amber-800" onClick={() => { setShowFeedbackPanel(false); setFeedbackText(""); }}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Textarea
                placeholder="Ex: Falta o CNAE de transporte de cargas. O CNAE 4711-3/02 não se aplica pois a empresa não tem loja física. Inclua atividades de e-commerce..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={3}
                className="text-sm resize-none bg-white border-amber-200 focus:border-amber-400"
              />
              <div className="flex items-center justify-between">
                <span className={`text-xs ${feedbackText.trim().length >= 5 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {feedbackText.trim().length} caracteres {feedbackText.trim().length < 5 && '(mín. 5)'}
                </span>
                <Button
                  size="sm"
                  onClick={handleRefineCnaes}
                  disabled={feedbackText.trim().length < 5 || refineCnaes.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {refineCnaes.isPending
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Analisando...</>
                    : <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Gerar nova análise</>
                  }
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-4 mt-2">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{selectedCount}</span> CNAE{selectedCount !== 1 ? "s" : ""} selecionado{selectedCount !== 1 ? "s" : ""}</p>
                {!showFeedbackPanel && !extractCnaes.isPending && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                    onClick={() => setShowFeedbackPanel(true)}
                    disabled={refineCnaes.isPending || confirmCnaes.isPending}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />Pedir nova análise
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCnaeModal(false)} disabled={confirmCnaes.isPending || refineCnaes.isPending}>Cancelar</Button>
                <Button onClick={handleConfirmCnaes} disabled={selectedCount === 0 || confirmCnaes.isPending || refineCnaes.isPending}>
                  {confirmCnaes.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Confirmando...</> : <>Confirmar e Avançar<ArrowRight className="h-4 w-4 ml-2" /></>}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NovoClienteModal open={showNewClientModal} onClose={() => setShowNewClientModal(false)} onCreated={(id, name) => { setClientId(id); setPendingClientName(name); refetchClients(); }} />
      <EditCnaeModal cnae={editingCnae} onSave={handleEditCnae} onClose={() => setEditingCnae(null)} />
    </ComplianceLayout>
  );
}
