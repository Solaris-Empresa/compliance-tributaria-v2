// FormWizard.tsx — F1 (FORM-NOVO-PROJETO-V2)
//
// Casca de navegação do wizard (progress + nav voltar/avançar/submit + slot).
// Controlado: recebe `value`/`descriptionLength` e consulta o módulo PURO
// `form-wizard-steps` para habilitar "Avançar" (inv. 6). NÃO toca lógica de campo.
// F1: o slot renderiza o conteúdo do form (children). O F2-refactor particiona
// os campos por passo. Submit só no último passo (inv. 2).
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2, Check } from "lucide-react";
import { STEP_DEFS, LAST_STEP, stepValid } from "@/lib/form-wizard-steps";
import { type PerfilEmpresaData } from "@/components/PerfilEmpresaIntelligente";

interface FormWizardProps {
  value: PerfilEmpresaData;
  descriptionLength: number;
  submitting?: boolean;
  onSubmit: () => void;
  children: React.ReactNode;
}

export function FormWizard({ value, descriptionLength, submitting, onSubmit, children }: FormWizardProps) {
  const [step, setStep] = useState(0);
  const canAdvance = stepValid(value, step, descriptionLength);
  const isLast = step === LAST_STEP;

  return (
    <div data-testid="form-wizard">
      {/* Progress */}
      <div className="flex items-center gap-1.5 mb-4" data-testid="wizard-progress">
        {STEP_DEFS.map((d, i) => (
          <React.Fragment key={d.id}>
            <div
              data-testid={`step-indicator-${d.id}`}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                i < step
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : i === step
                    ? "border-primary text-primary font-bold"
                    : "border-border text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < LAST_STEP && <div className="h-0.5 flex-1 bg-border" />}
          </React.Fragment>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mb-3" data-testid="wizard-step-label">
        Passo {step + 1} de {STEP_DEFS.length} — {STEP_DEFS[step].label}
      </p>

      {/* Slot do conteúdo (F1: form completo; F2 particiona por passo) */}
      <div>{children}</div>

      {/* Navegação */}
      <div className="flex justify-between mt-4">
        <Button
          variant="outline"
          data-testid="btn-wizard-voltar"
          disabled={step === 0 || submitting}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        {isLast ? (
          <Button data-testid="btn-criar-projeto-wizard" disabled={!canAdvance || submitting} onClick={onSubmit}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Criar projeto e iniciar diagnóstico <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            data-testid="btn-wizard-avancar"
            disabled={!canAdvance || submitting}
            onClick={() => setStep((s) => Math.min(LAST_STEP, s + 1))}
          >
            Avançar <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
