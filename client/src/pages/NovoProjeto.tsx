import { useState, useEffect, useRef } from "react";
import { PerfilEmpresaIntelligente, PERFIL_VAZIO, calcProfileScore, type PerfilEmpresaData } from "@/components/PerfilEmpresaIntelligente";
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
  Lock, ShieldAlert, ShieldCheck, ShieldX
} from "lucide-react";
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
  const [pendingClientName, setPendingClientName] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number>(0);

  // Verificar rascunho salvo ao montar
  useEffect(() => {
    const saved = loadTempData<{ name?: string; description?: string; clientId?: number }>(DRAFT_PROJECT_ID, 'etapa1');
    if (saved && (saved.data?.name || saved.data?.description)) {
      setDraftSavedAt(saved.savedAt);
      setShowResumeBanner(true);
    }
  }, []);

  const handleResumeDraft = () => {
    const saved = loadTempData<{ name?: string; description?: string; clientId?: number }>(DRAFT_PROJECT_ID, 'etapa1');
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
  const [isCnaeFallback, setIsCnaeFallback] = useState(false);
  const [selectedCnaes, setSelectedCnaes] = useState<Set<string>>(new Set());
  const [customCnaes, setCustomCnaes] = useState<Cnae[]>([]);
  const [newCnaeCode, setNewCnaeCode] = useState("");
  const [newCnaeDesc, setNewCnaeDesc] = useState("");
  const [cnaeSearchQuery, setCnaeSearchQuery] = useState("");
  const [cnaeSearchResults, setCnaeSearchResults] = useState<CnaeEntry[]>([]);
  const [showCnaeDropdown, setShowCnaeDropdown] = useState(false);
  const cnaeSearchRef = useRef<HTMLDivElement>(null);
  // RF-1.05: loop de refinamento de CNAEs
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [refinementIteration, setRefinementIteration] = useState(1);

  // v6.0: Company Profile Intelligence — estado unificado
  const [perfilData, setPerfilData] = useState<PerfilEmpresaData>(PERFIL_VAZIO);

  // D1+D2: Consistency Gate
  const [showConsistencyGate, setShowConsistencyGate] = useState(false);
  const [consistencyResult, setConsistencyResult] = useState<any>(null);
  const [riskReason, setRiskReason] = useState("");
  const [pendingProjectPayload, setPendingProjectPayload] = useState<any>(null);

  const runConsistency = trpc.consistency.analyzeDeterministic.useMutation({
    onSuccess: (data) => {
      if (data.criticalCount > 0) {
        setConsistencyResult(data);
        setShowConsistencyGate(true);
      } else {
        // Sem críticos: prosseguir diretamente
        createProject.mutate(pendingProjectPayload);
      }
    },
    onError: () => {
      // Falha no gate: prosseguir sem bloquear
      toast.warning("Verificação de consistência indisponível. Prosseguindo...");
      createProject.mutate(pendingProjectPayload);
    },
  });

  const acceptRiskAndProceed = () => {
    if (riskReason.trim().length < 10) {
      toast.error("Justificativa deve ter pelo menos 10 caracteres");
      return;
    }
    setShowConsistencyGate(false);
    createProject.mutate(pendingProjectPayload);
  };

  const { data: clients, refetch: refetchClients } = trpc.users.listClients.useQuery();

  const createProject = trpc.fluxoV3.createProject.useMutation({
    onSuccess: (data) => { setProjectId(data.projectId); extractCnaes.mutate({ projectId: data.projectId, description }); },
    onError: (err) => toast.error(`Erro ao criar projeto: ${err.message}`),
  });

  const extractCnaes = trpc.fluxoV3.extractCnaes.useMutation({
    onSuccess: (data) => {
      setSuggestedCnaes(data.cnaes);
      setSelectedCnaes(new Set<string>(data.cnaes.map((c: Cnae) => c.code)));
      const fallback = data.cnaes.length > 0 &&
        data.cnaes.every((c: Cnae) => c.confidence <= 70) &&
        data.cnaes.some((c: Cnae) => c.justification?.includes("similaridade semântica"));
      setIsCnaeFallback(fallback);
      setShowCnaeModal(true);
    },
    onError: () => { toast.error("Não foi possível extrair CNAEs automaticamente. Adicione manualmente."); setIsCnaeFallback(false); setShowCnaeModal(true); },
  });

  const refineCnaes = trpc.fluxoV3.refineCnaes.useMutation({
    onSuccess: (data) => {
      setSuggestedCnaes(data.cnaes);
      setSelectedCnaes(new Set<string>(data.cnaes.map((c: Cnae) => c.code)));
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

  // v6.0: Computed validation via calcProfileScore
  const profileScore = calcProfileScore(perfilData);
  const profileValid = profileScore.missingRequired.length === 0;

  const handleSubmit = () => {
    if (!name.trim()) return toast.error("Informe o nome do projeto");
    if (description.trim().length < 100) return toast.error("A descrição deve ter pelo menos 100 caracteres");
    if (!clientId) return toast.error("Selecione um cliente");
    if (!profileValid) {
      const missing = profileScore.missingRequired.join(", ");
      return toast.error(`Preencha os campos obrigatórios: ${missing}`);
    }
    const companyProfile = {
      cnpj: perfilData.cnpj,
      companyType: perfilData.companyType,
      companySize: perfilData.companySize,
      annualRevenueRange: perfilData.annualRevenueRange || undefined,
      taxRegime: perfilData.taxRegime,
    };
    const operationProfile = {
      operationType: perfilData.operationType,
      clientType: perfilData.clientType,
      multiState: perfilData.multiState,
    };
    const taxComplexity = (perfilData.hasMultipleEstablishments !== null || perfilData.hasImportExport !== null || perfilData.hasSpecialRegimes !== null) ? {
      hasMultipleEstablishments: perfilData.hasMultipleEstablishments ?? undefined,
      hasImportExport: perfilData.hasImportExport ?? undefined,
      hasSpecialRegimes: perfilData.hasSpecialRegimes ?? undefined,
    } : undefined;
    const financialProfile = (perfilData.paymentMethods.length > 0 || perfilData.hasIntermediaries !== null) ? {
      paymentMethods: perfilData.paymentMethods.length > 0 ? perfilData.paymentMethods : undefined,
      hasIntermediaries: perfilData.hasIntermediaries ?? undefined,
    } : undefined;
    const governanceProfile = (perfilData.hasTaxTeam !== null || perfilData.hasAudit !== null || perfilData.hasTaxIssues !== null) ? {
      hasTaxTeam: perfilData.hasTaxTeam ?? undefined,
      hasAudit: perfilData.hasAudit ?? undefined,
      hasTaxIssues: perfilData.hasTaxIssues ?? undefined,
    } : undefined;
    const payload = {
      name: name.trim(),
      description: description.trim(),
      clientId,
      companyProfile,
      operationProfile,
      taxComplexity,
      financialProfile,
      governanceProfile,
    } as any;
    setPendingProjectPayload(payload);
    // D1: Rodar Consistency Gate antes de criar o projeto
    runConsistency.mutate({
      projectId: 0, // placeholder antes de criar
      companyProfile: {
        cnpj: perfilData.cnpj || undefined,
        companyType: perfilData.companyType || undefined,
        companySize: (perfilData.companySize as any) || undefined,
        annualRevenueRange: perfilData.annualRevenueRange || undefined,
        taxRegime: (perfilData.taxRegime as any) || undefined,
      },
      operationProfile: {
        operationType: perfilData.operationType || undefined,
        clientType: perfilData.clientType.length > 0 ? perfilData.clientType : undefined,
        multiState: perfilData.multiState ?? undefined,
      },
      taxComplexity: {
        hasInternationalOps: perfilData.hasImportExport ?? undefined,
        usesTaxIncentives: undefined,
        usesMarketplace: perfilData.paymentMethods.includes('marketplace'),
      },
      financialProfile: {
        paymentMethods: perfilData.paymentMethods.length > 0 ? perfilData.paymentMethods : undefined,
        hasIntermediaries: perfilData.hasIntermediaries ?? undefined,
      },
      governanceProfile: {
        hasTaxTeam: perfilData.hasTaxTeam ?? undefined,
        hasAudit: perfilData.hasAudit ?? undefined,
        hasTaxIssues: perfilData.hasTaxIssues ?? undefined,
      },
      description: description.trim(),
    });
  };

  const handleConfirmCnaes = () => {
    if (!projectId) return;
    const allCnaes = [...suggestedCnaes, ...customCnaes];
    const finalCnaes = allCnaes.filter(c => selectedCnaes.has(c.code));
    if (finalCnaes.length === 0) return toast.error("Selecione pelo menos 1 CNAE");
    confirmCnaes.mutate({ projectId, cnaes: finalCnaes });
  };

  const toggleCnae = (code: string) => {
    setSelectedCnaes(prev => { const next = new Set<string>(prev); if (next.has(code)) next.delete(code); else next.add(code); return next; });
  };

  const handleAddCustomCnae = () => {
    if (!newCnaeCode.trim() || !newCnaeDesc.trim()) return;
    const newCnae: Cnae = { code: newCnaeCode.trim(), description: newCnaeDesc.trim(), confidence: 100, justification: "Adicionado manualmente" };
    setCustomCnaes(prev => [...prev, newCnae]);
    setSelectedCnaes(prev => new Set<string>([...Array.from(prev), newCnae.code]));
    setNewCnaeCode(""); setNewCnaeDesc("");
  };

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
    const newCnae: Cnae = {
      code: entry.code,
      description: entry.description,
      confidence: 100,
      justification: "Adicionado manualmente via busca",
    };
    if (!customCnaes.find(c => c.code === entry.code) && !suggestedCnaes.find(c => c.code === entry.code)) {
      setCustomCnaes(prev => [...prev, newCnae]);
      setSelectedCnaes(prev => new Set<string>([...Array.from(prev), newCnae.code]));
      toast.success(`CNAE ${entry.code} adicionado!`);
    } else {
      toast.info(`CNAE ${entry.code} já está na lista.`);
    }
    setCnaeSearchQuery("");
    setNewCnaeCode("");
    setNewCnaeDesc("");
    setShowCnaeDropdown(false);
  };

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
      setSelectedCnaes(prev => { const next = new Set<string>(prev); next.delete(editingCnae.code); next.add(updated.code); return next; });
    }
  };

  const filteredClients = clients?.filter(c =>
    c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(clientSearch.toLowerCase())
  );
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

        {/* Informações do Projeto */}
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

        {/* v6.0: Company Profile Intelligence — componente redesenhado */}
        <PerfilEmpresaIntelligente
          value={perfilData}
          onChange={setPerfilData}
          description={description}
          projectId={projectId ?? undefined}
          projectName={name || undefined}
        />

        {/* Banner de análise IA */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-primary">Análise Inteligente de CNAEs</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Ao avançar, a IA analisará a descrição do negócio e identificará automaticamente os CNAEs relevantes. Você poderá confirmar, editar ou adicionar CNAEs antes de prosseguir.
            </p>
          </div>
        </div>

        {/* Gate de validação do perfil */}
        {!profileValid && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/8 border-2 border-destructive/30">
            <Lock className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive">Preencha os dados obrigatórios do Perfil da Empresa para continuar.</p>
              {profileScore.missingRequired.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground mt-0.5">Campos faltantes:</p>
                  <ul className="text-xs text-destructive/80 mt-1 space-y-0.5">
                    {profileScore.missingRequired.map(field => (
                      <li key={field} className="flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-destructive/60 shrink-0" />{field}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}

        {/* CTA principal */}
        <div className="flex justify-end pb-4">
          <Button size="lg" onClick={handleSubmit} disabled={isLoading || !name.trim() || descLength < 100 || !clientId || !profileValid} className="min-w-[220px]">
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />{createProject.isPending ? "Criando projeto..." : "Analisando CNAEs..."}</>
            ) : (
              <>Avançar<ArrowRight className="h-4 w-4 ml-2" /></>
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
                {isCnaeFallback && allCnaes.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 text-xs mb-1">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>A IA demorou mais que o esperado e usou <strong>busca semântica</strong> como alternativa. Revise as sugestões com atenção ou clique em <strong>Pedir nova análise</strong> para tentar novamente.</span>
                  </div>
                )}
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

      {/* D2: Modal do Consistency Gate */}
      <Dialog open={showConsistencyGate} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />Inconsistências Críticas Detectadas
            </DialogTitle>
            <DialogDescription>
              A verificação automática identificou inconsistências críticas no perfil da empresa. Corrija os dados ou justifique para prosseguir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-64 overflow-y-auto">
            {consistencyResult?.findings?.filter((f: any) => f.level === 'critical').map((f: any) => (
              <div key={f.id} className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                <p className="text-sm font-semibold text-destructive">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                {f.recommendation && (
                  <p className="text-xs text-foreground/70 flex items-start gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />{f.recommendation}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Justificativa para prosseguir mesmo assim</Label>
            <Textarea
              placeholder="Ex: Os dados foram confirmados com o contador da empresa. O regime está em processo de migração..."
              value={riskReason}
              onChange={(e) => setRiskReason(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
            <p className={`text-xs ${riskReason.trim().length >= 10 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {riskReason.trim().length} / 10 caracteres mínimos
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowConsistencyGate(false); setPendingProjectPayload(null); }}>
              <ShieldX className="h-4 w-4 mr-2" />Corrigir dados
            </Button>
            <Button
              variant="destructive"
              onClick={acceptRiskAndProceed}
              disabled={riskReason.trim().length < 10 || createProject.isPending}
            >
              {createProject.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Criando...</>
                : <>Prosseguir com ressalva<ArrowRight className="h-4 w-4 ml-2" /></>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ComplianceLayout>
  );
}
