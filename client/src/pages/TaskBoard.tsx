/**
 * TaskBoard.tsx — Sprint K · Issue #151
 * Taskboard P.O. ao vivo — dados do GitHub em tempo real via tRPC
 * Rota: /admin/taskboard
 */
import { useState } from "react";
import { trpc } from "../lib/trpc";

// ── TYPES ─────────────────────────────────────────────────────────────────────
type Status = "done" | "in_progress" | "todo" | "blocked" | "backlog";
type Priority = "critical" | "high" | "medium" | "low" | "normal";

interface Card {
  number: number;
  title: string;
  status: Status;
  priority: Priority;
  areas: string[];
  milestone: string | null;
  milestoneNumber: number | null;
  isEpic: boolean;
  updatedAt: string;
}

interface Milestone {
  number: number;
  title: string;
  description: string | null;
  state: string;
  openIssues: number;
  closedIssues: number;
  total: number;
  pct: number;
  dueOn: string | null;
}

interface RecentPR {
  number: number;
  title: string;
  mergedAt: string | null;
  branch: string;
  milestone: string | null;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; dot: string }> = {
  done:        { label: "Concluído",    color: "#22c55e", bg: "rgba(34,197,94,0.12)",   dot: "#22c55e" },
  in_progress: { label: "Em Andamento", color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  dot: "#3b82f6" },
  todo:        { label: "A Fazer",      color: "#eab308", bg: "rgba(234,179,8,0.12)",   dot: "#eab308" },
  blocked:     { label: "Bloqueado",    color: "#ef4444", bg: "rgba(239,68,68,0.12)",   dot: "#ef4444" },
  backlog:     { label: "Backlog",      color: "#64748b", bg: "rgba(100,116,139,0.12)", dot: "#64748b" },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  critical: { label: "CRÍTICO", color: "#ef4444" },
  high:     { label: "ALTO",    color: "#f97316" },
  medium:   { label: "MÉDIO",   color: "#eab308" },
  low:      { label: "BAIXO",   color: "#22c55e" },
  normal:   { label: "",        color: "#64748b" },
};

const AREA_COLORS: Record<string, { bg: string; color: string }> = {
  backend:    { bg: "rgba(6,182,212,0.15)",   color: "#06b6d4" },
  frontend:   { bg: "rgba(59,130,246,0.15)",  color: "#3b82f6" },
  database:   { bg: "rgba(34,197,94,0.15)",   color: "#86efac" },
  docs:       { bg: "rgba(100,116,139,0.2)",  color: "#94a3b8" },
  governance: { bg: "rgba(234,179,8,0.15)",   color: "#eab308" },
  epic:       { bg: "rgba(168,85,247,0.2)",   color: "#a855f7" },
  "tech-debt":{ bg: "rgba(239,68,68,0.15)",   color: "#fca5a5" },
  uat:        { bg: "rgba(249,115,22,0.15)",  color: "#f97316" },
};

function AreaTag({ area }: { area: string }) {
  const cfg = AREA_COLORS[area] ?? { bg: "rgba(100,116,139,0.15)", color: "#94a3b8" };
  return (
    <span style={{
      fontSize: 10, padding: "1px 7px", borderRadius: 10,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`, fontWeight: 500,
    }}>
      {area}
    </span>
  );
}

function StatusDot({ status }: { status: Status }) {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: STATUS_CONFIG[status].dot, flexShrink: 0,
    }} />
  );
}

function Badge({ children, color, bg, border }: { children: React.ReactNode; color: string; bg: string; border?: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 600,
      color, background: bg, border: `1px solid ${border ?? color}55`,
    }}>
      {children}
    </span>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ background: "#2e3350", borderRadius: 4, height: 6, overflow: "hidden", flex: 1, maxWidth: 160 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s" }} />
    </div>
  );
}

// ── CARD COMPONENT ────────────────────────────────────────────────────────────
function IssueCard({ card }: { card: Card }) {
  const isBlocked = card.status === "blocked";
  const isEpic = card.isEpic;
  const prio = PRIORITY_CONFIG[card.priority];

  return (
    <div style={{
      background: "#22263a", border: `1px solid ${isBlocked ? "#ef4444" : isEpic ? "#a855f7" : "#2e3350"}`,
      borderLeft: isBlocked ? "3px solid #ef4444" : isEpic ? "3px solid #a855f7" : undefined,
      borderRadius: 8, padding: "10px 12px", marginBottom: 8,
    }}>
      <div style={{ fontSize: 10, color: "#8892b0", marginBottom: 3 }}>
        #{card.number}
        {card.priority !== "normal" && (
          <span style={{ marginLeft: 6, color: prio.color, fontWeight: 700 }}>
            ● {prio.label}
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.4, marginBottom: 6 }}>
        {card.title}
      </div>
      {card.areas.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
          {card.areas.map((a) => <AreaTag key={a} area={a} />)}
        </div>
      )}
      {card.milestone && (
        <div style={{ fontSize: 10, color: "#8892b0", marginTop: 4 }}>
          {card.milestone.replace("M2 — ", "").replace("M3 — ", "").replace("M4 — ", "").replace("M1 — ", "")}
        </div>
      )}
    </div>
  );
}

// ── KANBAN COLUMN ─────────────────────────────────────────────────────────────
function KanbanCol({ status, cards }: { status: Status; cards: Card[] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div style={{
      background: "#1a1d27", border: "1px solid #2e3350",
      borderRadius: 12, overflow: "hidden", minWidth: 200,
    }}>
      <div style={{
        padding: "11px 14px", fontSize: 10, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.8px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: cfg.bg, color: cfg.color, borderBottom: "1px solid #2e3350",
      }}>
        <span>{cfg.label}</span>
        <span style={{
          background: "#1a1d27", border: "1px solid #2e3350",
          borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700,
        }}>
          {cards.length}
        </span>
      </div>
      <div style={{ padding: 10 }}>
        {cards.length === 0 ? (
          <div style={{ fontSize: 11, color: "#4a5580", textAlign: "center", padding: "20px 0" }}>
            Nenhuma issue
          </div>
        ) : (
          cards.map((c) => <IssueCard key={c.number} card={c} />)
        )}
      </div>
    </div>
  );
}

// ── MILESTONE SECTION ─────────────────────────────────────────────────────────
function MilestoneSection({ ms, cards }: { ms: Milestone; cards: Card[] }) {
  const pctColor = ms.pct >= 80 ? "#22c55e" : ms.pct >= 40 ? "#3b82f6" : "#eab308";
  const msCards = cards.filter((c) => c.milestoneNumber === ms.number);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "13px 18px",
        background: "#1a1d27", border: "1px solid #2e3350",
        borderRadius: "10px 10px 0 0", borderBottom: "none",
      }}>
        <Badge color="#a855f7" bg="rgba(168,85,247,0.15)">M{ms.number}</Badge>
        <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{ms.title}</span>
        <ProgressBar pct={ms.pct} color={pctColor} />
        <span style={{ fontSize: 11, fontWeight: 700, color: pctColor }}>{ms.pct}%</span>
        <Badge color="#64748b" bg="rgba(100,116,139,0.15)">
          {ms.closedIssues}/{ms.total}
        </Badge>
      </div>
      <div style={{
        background: "#1a1d27", border: "1px solid #2e3350",
        borderRadius: "0 0 10px 10px", padding: "12px 18px",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        {msCards.length === 0 ? (
          <div style={{ fontSize: 11, color: "#4a5580" }}>Nenhuma issue vinculada a este milestone.</div>
        ) : (
          msCards.map((c) => (
            <div key={c.number} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "7px 10px", background: "#22263a",
              border: `1px solid ${c.status === "blocked" ? "#ef444433" : "#2e3350"}`,
              borderRadius: 6,
            }}>
              <StatusDot status={c.status} />
              <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{c.title}</span>
              <span style={{ fontSize: 10, color: "#8892b0" }}>#{c.number}</span>
              <Badge
                color={STATUS_CONFIG[c.status].color}
                bg={STATUS_CONFIG[c.status].bg}
              >
                {STATUS_CONFIG[c.status].label}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function TaskBoard() {
  const [activeTab, setActiveTab] = useState<"kanban" | "milestones" | "prs" | "riscos">("kanban");
  const { data, isLoading, error, refetch, isFetching } = trpc.taskboard.getSnapshot.useQuery(
    undefined,
    { refetchInterval: 5 * 60 * 1000 } // auto-refresh a cada 5 min
  );

  const tabs = [
    { id: "kanban",     label: "Kanban por Status" },
    { id: "milestones", label: "Milestones" },
    { id: "prs",        label: "PRs Recentes" },
    { id: "riscos",     label: "Bloqueios & Riscos" },
  ] as const;

  // ── LOADING / ERROR ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ background: "#0f1117", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#8892b0" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div>Carregando dados do GitHub...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ background: "#0f1117", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#ef4444", maxWidth: 400 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Erro ao carregar dados</div>
          <div style={{ fontSize: 12, color: "#8892b0", marginBottom: 16 }}>
            {error?.message ?? "Verifique se o GITHUB_TOKEN está configurado no servidor."}
          </div>
          <button
            onClick={() => refetch()}
            style={{
              background: "#3b82f6", color: "white", border: "none",
              borderRadius: 6, padding: "8px 16px", cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const { kpis, cards, milestones, recentPRs } = data as {
    generatedAt: string;
    kpis: Record<string, number>;
    cards: Card[];
    milestones: Milestone[];
    recentPRs: RecentPR[];
  };

  const cardsByStatus = (status: Status) => cards.filter((c) => c.status === status);
  const activeMilestones = milestones.filter((m) => m.state === "open");

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "#0f1117", minHeight: "100vh", color: "#e2e8f0", fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 13 }}>

      {/* HEADER */}
      <div style={{
        background: "#1a1d27", borderBottom: "1px solid #2e3350",
        padding: "18px 28px", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg, #f97316, #a855f7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 900, color: "white",
          }}>S</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>IA SOLARIS — Taskboard</div>
            <div style={{ fontSize: 11, color: "#8892b0" }}>
              Compliance Tributária · Dados ao vivo do GitHub
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Badge color="#22c55e" bg="rgba(34,197,94,0.15)">1.470 testes</Badge>
          <Badge color="#3b82f6" bg="rgba(59,130,246,0.15)">2.454 chunks RAG</Badge>
          <Badge color="#f97316" bg="rgba(249,115,22,0.15)">UAT Round 2 pendente</Badge>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            style={{
              background: isFetching ? "#2e3350" : "#22263a",
              border: "1px solid #2e3350", color: "#8892b0",
              borderRadius: 6, padding: "5px 12px", cursor: "pointer",
              fontSize: 11, display: "flex", alignItems: "center", gap: 5,
            }}
          >
            {isFetching ? "⏳ Atualizando..." : "🔄 Atualizar"}
          </button>
        </div>
      </div>

      {/* KPI BAR */}
      <div style={{
        display: "flex", gap: 12, padding: "14px 28px",
        background: "#1a1d27", borderBottom: "1px solid #2e3350",
        overflowX: "auto",
      }}>
        {[
          { value: kpis.totalOpen,      label: "Issues Abertas",   color: "#eab308" },
          { value: kpis.inProgress,     label: "Em Andamento",     color: "#3b82f6" },
          { value: kpis.todo,           label: "A Fazer",          color: "#a855f7" },
          { value: kpis.blocked,        label: "Bloqueadas",       color: "#ef4444" },
          { value: kpis.backlog,        label: "Backlog/Débito",   color: "#64748b" },
          { value: kpis.totalMilestones,label: "Milestones Ativos",color: "#06b6d4" },
          { value: kpis.recentMerged,   label: "PRs Recentes",     color: "#22c55e" },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: "#22263a", border: "1px solid #2e3350",
            borderRadius: 10, padding: "11px 18px", minWidth: 110,
            textAlign: "center", flexShrink: 0,
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 10, color: "#8892b0", textTransform: "uppercase", letterSpacing: "0.4px", marginTop: 2 }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{
        display: "flex", padding: "0 28px",
        background: "#1a1d27", borderBottom: "1px solid #2e3350",
        overflowX: "auto",
      }}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "12px 20px", cursor: "pointer", fontSize: 12, fontWeight: 600,
              color: activeTab === tab.id ? "#f97316" : "#8892b0",
              borderBottom: activeTab === tab.id ? "2px solid #f97316" : "2px solid transparent",
              whiteSpace: "nowrap", transition: "all 0.2s",
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ padding: "24px 28px" }}>

        {/* ── KANBAN ── */}
        {activeTab === "kanban" && (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid #2e3350" }}>
              Visão Kanban — Todas as Issues por Status
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 14,
            }}>
              {(["done", "in_progress", "todo", "blocked", "backlog"] as Status[]).map((s) => (
                <KanbanCol key={s} status={s} cards={cardsByStatus(s)} />
              ))}
            </div>
          </>
        )}

        {/* ── MILESTONES ── */}
        {activeTab === "milestones" && (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid #2e3350" }}>
              Milestones Ativos
            </div>
            {activeMilestones.length === 0 ? (
              <div style={{ color: "#8892b0" }}>Nenhum milestone ativo.</div>
            ) : (
              activeMilestones.map((ms) => (
                <MilestoneSection key={ms.number} ms={ms} cards={cards} />
              ))
            )}
          </>
        )}

        {/* ── PRs RECENTES ── */}
        {activeTab === "prs" && (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid #2e3350" }}>
              PRs Recentes Mergeados
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentPRs.map((pr) => (
                <div key={pr.number} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", background: "#1a1d27",
                  border: "1px solid #2e3350", borderRadius: 8,
                }}>
                  <Badge color="#22c55e" bg="rgba(34,197,94,0.15)">✓ mergeado</Badge>
                  <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>#{pr.number} — {pr.title}</span>
                  <span style={{ fontSize: 10, color: "#8892b0" }}>
                    {pr.mergedAt ? new Date(pr.mergedAt).toLocaleDateString("pt-BR") : "—"}
                  </span>
                  {pr.milestone && (
                    <Badge color="#a855f7" bg="rgba(168,85,247,0.15)">{pr.milestone.split(" — ")[0]}</Badge>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── BLOQUEIOS & RISCOS ── */}
        {activeTab === "riscos" && (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid #2e3350" }}>
              Bloqueios Ativos de Governança
            </div>
            {[
              {
                icon: "🚫",
                title: "NÃO ativar DIAGNOSTIC_READ_MODE=new",
                desc: "Aguarda 48-72h de observação pós-UAT Round 2. Ativação prematura pode causar divergência silenciosa nos dados de diagnóstico.",
              },
              {
                icon: "🔒",
                title: "NÃO executar F-04 Fase 3 (alterar leitura para novas colunas)",
                desc: "Issue #56. Altera o ponto de leitura do diagnóstico de colunas legadas para colunas V1/V3. Requer UAT concluído e aprovação formal.",
              },
              {
                icon: "💣",
                title: "NÃO executar DROP COLUMN nas colunas legadas",
                desc: "Issue #62. Operação irreversível. Aguarda F-04 Fase 3 + validação de zero divergências no Shadow Mode.",
              },
            ].map((b) => (
              <div key={b.title} style={{
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 8, padding: "14px 16px", marginBottom: 10,
                display: "flex", gap: 12, alignItems: "flex-start",
              }}>
                <span style={{ fontSize: 20 }}>{b.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, color: "#ef4444", marginBottom: 4 }}>{b.title}</div>
                  <div style={{ fontSize: 11, color: "#8892b0", marginBottom: 8 }}>{b.desc}</div>
                  <Badge color="#ef4444" bg="rgba(239,68,68,0.15)">Aprovação P.O. obrigatória</Badge>
                </div>
              </div>
            ))}

            <div style={{ fontSize: 15, fontWeight: 700, margin: "24px 0 16px", paddingBottom: 8, borderBottom: "1px solid #2e3350" }}>
              Riscos e Débitos Técnicos Mapeados
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["ID", "Descrição", "Risco", "Mitigação Atual", "Próxima Ação"].map((h) => (
                    <th key={h} style={{
                      background: "#22263a", color: "#8892b0", fontSize: 10,
                      textTransform: "uppercase", letterSpacing: "0.5px",
                      padding: "10px 12px", textAlign: "left",
                      borderBottom: "1px solid #2e3350",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { id: "GAP-NCM", desc: "Chunks dos Anexos LC 214 (824 chunks) não recuperados pelo retriever para comércio/indústria", risk: "ALTO", risk_color: "#ef4444", mit: "Documentado em HANDOFF-NCM-ANEXOS-LC214-v1.md", next: "UPDATE topicos + cnaeGroups + ajuste de prompt (pós-Sprint K)" },
                  { id: "#101",    desc: "123 testes legados com fetch real sem mock no CI", risk: "MÉDIO", risk_color: "#eab308", mit: "skipIf(isCI) aplicado como paliativo", next: "Refatorar com mocks — Sprint futura" },
                  { id: "#99",     desc: "27 arquivos de teste com falhas pre-existentes no CI", risk: "MÉDIO", risk_color: "#eab308", mit: "Catalogado, não bloqueia CI principal", next: "Triagem e correção — Sprint futura" },
                  { id: "DT-EvidDefault", desc: "evidencia_regulatoria default genérico em RiskItemSchema e BriefingSchema", risk: "BAIXO", risk_color: "#22c55e", mit: "Registrado no PR #144", next: "Corrigir em sprint futura" },
                  { id: "DT-CRUDg15",    desc: "routers-questions-crud.ts não atualizado com campos G15 (fonte, requirement_id)", risk: "BAIXO", risk_color: "#22c55e", mit: "Registrado no BASELINE v2.1", next: "Sprint K" },
                ].map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #2e3350" }}>
                    <td style={{ padding: "9px 12px", fontWeight: 700, fontSize: 11 }}>{r.id}</td>
                    <td style={{ padding: "9px 12px", fontSize: 12 }}>{r.desc}</td>
                    <td style={{ padding: "9px 12px", fontWeight: 700, color: r.risk_color }}>{r.risk}</td>
                    <td style={{ padding: "9px 12px", fontSize: 11, color: "#8892b0" }}>{r.mit}</td>
                    <td style={{ padding: "9px 12px", fontSize: 11 }}>{r.next}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

      </div>

      {/* FOOTER */}
      <div style={{
        padding: "12px 28px", borderTop: "1px solid #2e3350",
        fontSize: 10, color: "#4a5580", display: "flex", justifyContent: "space-between",
      }}>
        <span>IA SOLARIS · Taskboard P.O. · Sprint K · Issue #151</span>
        <span>Atualização automática a cada 5 min · Dados: GitHub API</span>
      </div>
    </div>
  );
}
