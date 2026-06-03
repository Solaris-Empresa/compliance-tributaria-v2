// BriefingNav.tsx — UX-BRIEFING-C-V2 (#1344) · PR-2 (F2)
// Spec: UX_DICTIONARY §UX-BRIEFING-C-V2 §8. 5 tabs (default: Gaps). testid: briefing-nav-tab-{slug}.
// Errata P.O. (03/06/2026): tab 5 = "Metodologia" (não "Método").

export type BriefingTab =
  | "gaps"
  | "oportunidades"
  | "acoes"
  | "impactos"
  | "metodologia";

const TABS: { slug: BriefingTab; label: string }[] = [
  { slug: "gaps", label: "Gaps" },
  { slug: "oportunidades", label: "Oportunidades" },
  { slug: "acoes", label: "Ações Prioritárias" },
  { slug: "impactos", label: "Impactos" },
  { slug: "metodologia", label: "Metodologia" },
];

export function BriefingNav({
  activeTab,
  onTabChange,
}: {
  activeTab: BriefingTab;
  onTabChange: (tab: BriefingTab) => void;
}) {
  return (
    <nav
      role="tablist"
      aria-label="Seções do briefing"
      className="flex flex-wrap gap-1 border-b"
    >
      {TABS.map(t => {
        const active = t.slug === activeTab;
        return (
          <button
            key={t.slug}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={`briefing-nav-tab-${t.slug}`}
            onClick={() => onTabChange(t.slug)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
