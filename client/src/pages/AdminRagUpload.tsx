import { useState, useRef, useCallback } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, X, CheckCircle2, AlertCircle, AlertTriangle, Loader2, Download } from "lucide-react";

// ── State types ──────────────────────────────────────────────────────────────
type Phase = "idle" | "validating" | "validated" | "importing" | "done" | "error";

interface ValidationResult {
  total: number;
  valid: number;
  errors: { row: number; field: string; message: string }[];
}

interface ImportResult {
  inserted: number;
}

// ── FileReader helper ────────────────────────────────────────────────────────
const readFile = (f: File): Promise<string> =>
  new Promise((resolve) => {
    const r = new FileReader();
    r.onload = (e) => resolve(e.target!.result as string);
    r.readAsText(f, "UTF-8");
  });

// ── Main component ───────────────────────────────────────────────────────────
export default function AdminRagUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.ragAdmin.uploadCsv.useMutation({
    onSuccess: (data) => {
      if (phase === "validating") {
        // dryRun result
        const result: ValidationResult = {
          total: data.total,
          valid: data.valid,
          errors: (data.errors || []).map((e: { row: number; message: string }) => ({
            row: e.row,
            field: "—",
            message: e.message,
          })),
        };
        setValidationResult(result);
        setPhase("validated");
      } else if (phase === "importing") {
        setImportResult({ inserted: data.inserted });
        setPhase("done");
      }
    },
    onError: (err) => {
      setErrorMessage(err.message || "Erro de rede ao processar o arquivo.");
      setPhase("error");
    },
  });

  // ── File selection ─────────────────────────────────────────────────────────
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  };

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

  // ── Validate (dryRun: true) ────────────────────────────────────────────────
  const handleValidate = async () => {
    if (!fileContent) return;
    setPhase("validating");
    setErrorMessage(null);
    uploadMutation.mutate({ csvContent: fileContent, dryRun: true });
  };

  // ── Import (dryRun: false) ─────────────────────────────────────────────────
  const handleImport = async () => {
    if (!fileContent) return;
    setShowConfirmModal(false);
    setPhase("importing");
    uploadMutation.mutate({ csvContent: fileContent, dryRun: false });
  };

  const handleNewUpload = () => {
    handleRemoveFile();
  };

  const fileSizeKB = file ? (file.size / 1024).toFixed(1) : "0";

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Seção A — Header ─────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Upload CSV — Corpus RAG SOLARIS</h1>
            <p className="text-sm text-muted-foreground mt-1">Importe chunks legislativos em lote</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/template-rag-upload.csv")}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Template CSV
          </Button>
        </div>

        {/* ── Seção B — Seleção de arquivo ─────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Selecionar arquivo</CardTitle>
          </CardHeader>
          <CardContent>
            {!file ? (
              <div
                className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Arraste um arquivo CSV ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-1">Apenas arquivos .csv são aceitos</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleInputChange}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{fileSizeKB} KB</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleRemoveFile} className="text-muted-foreground hover:text-destructive">
                  <X className="w-4 h-4" />
                  Remover
                </Button>
              </div>
            )}

            {/* Alerta de arquivo inválido */}
            {phase === "error" && errorMessage?.includes("csv") && (
              <Alert variant="destructive" className="mt-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* ── Seção C — Validação ───────────────────────────────────────────── */}
        {file && phase !== "done" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Validação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleValidate}
                disabled={phase === "validating" || phase === "importing"}
                className="w-full sm:w-auto"
              >
                {phase === "validating" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Validar CSV
                  </>
                )}
              </Button>

              {/* Resultado da validação */}
              {phase === "validated" && validationResult && (
                <>
                  {validationResult.errors.length === 0 ? (
                    <Alert className="border-green-500/50 bg-green-500/10">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700 dark:text-green-400">
                        ✓ {validationResult.valid} linhas válidas — pronto para importar
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <Alert className="border-amber-500/50 bg-amber-500/10">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-700 dark:text-amber-400">
                          {validationResult.valid} linhas válidas, {validationResult.errors.length} erros encontrados
                        </AlertDescription>
                      </Alert>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="text-left p-2 border border-border font-medium">#Linha</th>
                              <th className="text-left p-2 border border-border font-medium">Campo</th>
                              <th className="text-left p-2 border border-border font-medium">Problema</th>
                            </tr>
                          </thead>
                          <tbody>
                            {validationResult.errors.slice(0, 50).map((err, i) => (
                              <tr key={i} className="hover:bg-muted/30">
                                <td className="p-2 border border-border text-muted-foreground">{err.row}</td>
                                <td className="p-2 border border-border">
                                  <Badge variant="outline" className="text-xs">{err.field}</Badge>
                                </td>
                                <td className="p-2 border border-border text-destructive">{err.message}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {validationResult.errors.length > 50 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Exibindo 50 de {validationResult.errors.length} erros. Corrija o arquivo e valide novamente.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Erro de rede */}
              {phase === "error" && !errorMessage?.includes("csv") && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {errorMessage || "Erro de rede ao processar o arquivo."}
                    <Button
                      variant="link"
                      size="sm"
                      className="ml-2 p-0 h-auto text-destructive-foreground underline"
                      onClick={handleValidate}
                    >
                      Tentar novamente
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Seção D — Confirmação ─────────────────────────────────────────── */}
        {phase === "validated" && validationResult && validationResult.errors.length === 0 && validationResult.valid > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Importação</CardTitle>
            </CardHeader>
            <CardContent>
                    <Button
                  onClick={() => setShowConfirmModal(true)}
                  className="w-full sm:w-auto"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importar {validationResult.valid} linhas
                </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Resultado da importação ───────────────────────────────────────── */}
        {phase === "done" && importResult && (
          <Card>
            <CardContent className="pt-6">
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-400">
                  ✓ {importResult.inserted} chunks importados com sucesso no corpus RAG SOLARIS
                </AlertDescription>
              </Alert>
              <Button variant="outline" onClick={handleNewUpload} className="mt-4">
                Novo upload
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Modal de confirmação ──────────────────────────────────────────────── */}
      {showConfirmModal && validationResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-semibold">Confirmar importação</h2>
            <p className="text-sm text-muted-foreground">
              Você está prestes a importar <strong>{validationResult.valid} chunks</strong> no corpus RAG SOLARIS.
              Esta operação não pode ser desfeita automaticamente.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleImport}>
                Confirmar importação
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
