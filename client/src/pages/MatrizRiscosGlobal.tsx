// @ts-nocheck
import ComplianceLayout from "@/components/ComplianceLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";

export default function MatrizRiscosGlobal() {
  return (
    <ComplianceLayout>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Matriz de Riscos</h1>
          <p className="text-muted-foreground">
            Visualização consolidada de riscos identificados em todos os projetos
          </p>
        </div>

        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            A Matriz de Riscos está disponível dentro de cada projeto individual. 
            Para acessar, navegue até um projeto específico e selecione "Matriz de Riscos" no fluxo de trabalho.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Funcionalidade em Desenvolvimento</CardTitle>
            <CardDescription>
              Visualização global de riscos consolidados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Visualização Global em Desenvolvimento
              </h3>
              <p className="text-muted-foreground max-w-md">
                Esta página mostrará uma visão consolidada de todos os riscos identificados 
                em todos os projetos da plataforma. Por enquanto, acesse a Matriz de Riscos 
                dentro de cada projeto individual.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ComplianceLayout>
  );
}
