// AuxiliaryScoresRow.tsx — Sprint Z-22 CPIE v3 (#725)
// Row com 2 cards auxiliares: Execução do Plano + Qualidade do Perfil.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckSquare, User, AlertCircle } from "lucide-react";

export interface ExecutionBlock {
  percent: number;
  plans: { approved: number; total: number };
  tasks: { done: number; total: number };
}

export interface ProfileBlock {
  percent: number;
  filled: number;
  total: number;
}

export interface AuxiliaryScoresRowProps {
  execution: ExecutionBlock | null;
  executionEmpty?: boolean;
  profile: ProfileBlock;
}

const LOW_PROFILE_THRESHOLD = 50;

export function AuxiliaryScoresRow({
  execution,
  executionEmpty,
  profile,
}: AuxiliaryScoresRowProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Execução do Plano */}
      <Card data-testid="score-card-execution">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckSquare className="h-4 w-4" />
            Execução do Plano
          </CardTitle>
        </CardHeader>
        <CardContent>
          {executionEmpty || !execution ? (
            <p
              data-testid="state-no-plans-yet"
              className="py-2 text-sm text-muted-foreground"
            >
              Nenhuma tarefa criada ainda.
            </p>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span
                  data-testid="score-valor-execution"
                  className="text-3xl font-semibold"
                >
                  {execution.percent}%
                </span>
              </div>
              <Progress value={execution.percent} className="mt-2 h-2" />
              <p
                data-testid="score-breakdown-execution"
                className="mt-2 text-xs text-muted-foreground"
              >
                {execution.tasks.done} de {execution.tasks.total} tarefas ·{" "}
                {execution.plans.approved} de {execution.plans.total} planos
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Qualidade do Perfil */}
      <Card data-testid="score-card-data-quality">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <User className="h-4 w-4" />
            Qualidade do Perfil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span
              data-testid="score-valor-profile"
              className="text-3xl font-semibold"
            >
              {profile.percent}%
            </span>
          </div>
          <Progress value={profile.percent} className="mt-2 h-2" />
          <p
            data-testid="score-breakdown-profile"
            className="mt-2 text-xs text-muted-foreground"
          >
            {profile.filled} de {profile.total} campos preenchidos
          </p>
          {profile.percent < LOW_PROFILE_THRESHOLD && (
            <Alert
              data-testid="score-alert-profile"
              variant="default"
              className="mt-3"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Perfil incompleto pode reduzir a precisão do diagnóstico.
                Complete os campos em "Perfil da Empresa".
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
