/**
 * ScoreView — redirect para Compliance Dashboard v3 (Wave A.1)
 *
 * fix(z22) Wave A.2+B: conteúdo original dependia de trpc.scoringEngine.*
 * (CPIE-B legado deletado). Página mantida para preservar URL de bookmarks
 * (/projetos/:id/compliance-v3/score), redirecionando imediatamente para o
 * novo Dashboard de Compliance on-demand.
 *
 * Decisão registrada: ADR-0029 D-5 (compliance-v3/* preservado com edição
 * cirúrgica) + absorção C da Errata F6.1.
 */
import { useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export default function ScoreView() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (projectId) {
      setLocation(`/projetos/${projectId}/compliance-dashboard`);
    }
  }, [projectId, setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-dashed">
        <CardContent className="py-10 text-center space-y-4">
          <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">Redirecionando…</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O Score CPIE foi substituído pela{" "}
              <strong>Exposição ao Risco de Compliance</strong> on-demand.
            </p>
          </div>
          {projectId ? (
            <Link href={`/projetos/${projectId}/compliance-dashboard`}>
              <Button>Ir para o Dashboard de Compliance</Button>
            </Link>
          ) : (
            <Link href="/projetos">
              <Button variant="outline">Ver Projetos</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
