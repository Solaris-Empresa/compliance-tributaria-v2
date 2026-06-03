// briefing-components.test.tsx — UX-BRIEFING-C-V2 (#1344) · PR-2 (F2) DoD
// Env do vitest é "node" (sem jsdom): testamos por CHAMADA de função — o guard de modo
// (legacy → null) e a construção do elemento (sem throw nos .map) são exercidos sem DOM.
// Render em DOM real + asserção de data-testid é responsabilidade do E2E (PR-3).
import { describe, it, expect } from "vitest";
import {
  parseBriefingStructured,
  type BriefingAdapterResult,
} from "@/lib/briefingAdapter";
import { DecisionPanel } from "@/components/briefing/DecisionPanel";
import { GapCard } from "@/components/briefing/GapCard";
import { PriorityCards } from "@/components/briefing/PriorityCards";
import { OpportunityCard } from "@/components/briefing/OpportunityCard";
import { ActionsList } from "@/components/briefing/ActionsList";
import { ImpactsSection } from "@/components/briefing/ImpactsSection";
import { MethodSection } from "@/components/briefing/MethodSection";
import { RoundsSummarySection } from "@/components/briefing/RoundsSummarySection";
import { BriefingNav } from "@/components/briefing/BriefingNav";
import { ActionBar } from "@/components/briefing/ActionBar";

const legacy: BriefingAdapterResult = { mode: "legacy" };

const structured = parseBriefingStructured({
  nivel_risco_geral: "alto",
  resumo_executivo: "Resumo executivo suficiente para o teste.",
  principais_gaps: [
    {
      gap: "Gap de teste",
      causa_raiz: "Causa",
      evidencia_regulatoria: "Art. 15 LC 214/2025",
      urgencia: "imediata",
      source_type: "cnae",
      source_reference: "Art. 15 LC 214/2025",
      _hallucination_detected: true,
    },
  ],
  oportunidades: ["Oportunidade 1"],
  recomendacoes_prioritarias: ["Recomendação 1"],
  top_3_acoes: [
    { acao: "Ação 1", justificativa: "Justificativa", prazo: "imediato" },
  ],
  inconsistencias: [],
  confidence_score: {
    nivel_confianca: 87,
    limitacoes: [],
    recomendacao: "Revisão",
  },
});

// Componentes que consomem o adapter (guard de modo obrigatório).
const adapterComponents: {
  name: string;
  C: (p: { result: BriefingAdapterResult }) => unknown;
}[] = [
  { name: "DecisionPanel", C: DecisionPanel },
  { name: "GapCard", C: GapCard },
  { name: "PriorityCards", C: PriorityCards },
  { name: "OpportunityCard", C: OpportunityCard },
  { name: "ActionsList", C: ActionsList },
];

describe("briefing components (PR-2)", () => {
  it("fixture structured é split-view (sanidade)", () => {
    expect(structured.mode).toBe("split-view");
  });

  for (const { name, C } of adapterComponents) {
    it(`${name}: result.mode === "legacy" → retorna null (sem crash)`, () => {
      expect(C({ result: legacy })).toBeNull();
    });
    it(`${name}: structured → constrói elemento (sem throw)`, () => {
      expect(C({ result: structured })).not.toBeNull();
    });
  }

  it("RoundsSummarySection: vazio → null; com itens → elemento", () => {
    expect(RoundsSummarySection({ roundsSummary: [] })).toBeNull();
    expect(
      RoundsSummarySection({
        roundsSummary: [
          {
            cnaeCode: "4711-3",
            cnaeDescription: "Comércio",
            roundsCompleted: 2,
          },
        ],
      })
    ).not.toBeNull();
  });

  it("ImpactsSection / MethodSection / BriefingNav / ActionBar constroem sem throw", () => {
    expect(ImpactsSection({})).not.toBeNull();
    expect(MethodSection({ content: "## Como calculamos" })).not.toBeNull();
    expect(
      BriefingNav({ activeTab: "gaps", onTabChange: () => undefined })
    ).not.toBeNull();
    expect(ActionBar({})).not.toBeNull();
  });
});
