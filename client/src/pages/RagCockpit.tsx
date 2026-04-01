import { useState } from "react";
import { trpc } from "../lib/trpc";

// ── HELPERS ──────────────────────────────────────────────────────────────────

function leiLabel(lei: string) {
  const map: Record<string, string> = {
    lc214: "LC 214/2025",
    lc227: "LC 227/2024",
    lc224: "LC 224/2024",
    ec132: "EC 132/2023",
    lc123: "LC 123/2006",
    lc116: "LC 116/2003",
    lc87:  "LC 87/1996",
    cg_ibs:   "CG-IBS",
    rfb_cbs:  "RFB-CBS",
    conv_icms: "Conv. ICMS",
  };
  return map[lei] ?? lei.toUpperCase();
}

// RFCs estáticas — governança de mudanças (não vêm do banco)
const RFCS = [
  {
    id: "RFC-001", title: "Fusão chunks 810+811 (lc227)", lei: "lc227",
    severity: "P2", status: "EXECUTED", ids: "810–811",
    action: "✅ Executada — id 810 = 3.547 bytes · id 811 SUPERSEDED",
    sprint: "G", created: "2026-03-26", approved: true,
  },
  {
    id: "RFC-002", title: "25 chunks migrados lc214→lc123", lei: "lc123",
    severity: "P1", status: "EXECUTED", ids: "664–722 (25 chunks)",
    action: "✅ Executada — Simples Nacional ativo no corpus",
    sprint: "G", created: "2026-03-26", approved: true,
  },
  {
    id: "RFC-003", title: "Artigos de leis avulsas na faixa 617–779",
    lei: "lc214", severity: "P3", status: "BACKLOG",
    ids: "~10 chunks (Art. 30/Lei 9.430, Art. 23/CIDE, Art. 14/IPI)",
    action: "Avaliar reclassificação futura — defensável como lc214 por ora",
    sprint: "H", created: "2026-03-26", approved: false,
  },
];

const SPRINTS = [
  { id: "Sprint A", date: "2026-03-26", pr: "#105", commit: "a28875b", changes: ["G1 label lc224", "G2 ano lc227", "G5 Art.45 tópicos", "G6 LC224 cnaeGroups"], status: "done" },
  { id: "Sprint B", date: "2026-03-26", pr: "#106", commit: "dbad765", changes: ["G8 companyProfile no briefing", "G7 RAG 4 queries paralelas", "Fix CI jobs"], status: "done" },
  { id: "Sprint D", date: "2026-03-26", pr: "#109", commit: "03fa2c1", changes: ["ec132 18 chunks ingeridos", "anchor_id 100%", "corpus-utils.mjs"], status: "done" },
  { id: "Sprint G", date: "2026-03-26", pr: "#126", commit: "a96cf25",
    changes: [
      "RFC-001: fusão chunks 810+811 — lc227 Art. 2 completo",
      "RFC-002: 25 chunks lc214→lc123 (Simples Nacional)",
      "5 leis ativas no corpus · gold set 8/8 verde",
      "Confiabilidade: 100% — meta 98% superada",
    ], status: "done" },
  { id: "Sprint H", date: "2026-03-27", pr: "#131", commit: "49520a0",
    changes: [
      "ragInventory tRPC endpoint — getSnapshot ao vivo",
      "GS-07 threshold < 10 bytes (cirúrgico)",
      "lc123 adicionado ao enum lei",
      "RAG Cockpit alimentado por dados reais",
      "16 updates cirúrgicos em topicos — retrieval cross-lei melhorado",
      "ids 618/633: ICMS+LC87 · ISS+LC116 — keywords de tributos extintos",
      "ids 657/669/690/698: Simples Nacional+LC123 — regime especial",
      "ids 734/781: LRF+LC101 — responsabilidade fiscal",
      "ids 621/625/631/635/736/739/741: PIS+COFINS+CBS — tributos federais",
    ], status: "done" },
  { id: "Suite UAT", date: "2026-03-27", pr: "#144", commit: "pending_merge",
    changes: [
      "25 testes novos — validação 12 itens UAT (G1–G16)",
      "517 testes totais (492 baseline + 25 novos)",
      "Evidence JSON — 18 verificações E2E banco/grep",
      "Gold set 8/8 = 100% confirmado via queries reais",
      "DIAGNOSTIC_READ_MODE=shadow confirmado",
    ], status: "done" },
  { id: "Sprint N — G17", date: "2026-03-31", pr: "#261–#263", commit: "d65c8b5",
    changes: [
      "G17: analyzeSolarisAnswers extraído para server/lib/solaris-gap-analyzer.ts",
      "Enums corrigidos: 'Sim'/'Não' → 'sim'/'nao'",
      "INSERT com transação + retorno { inserted: N } verificável",
      "3 gaps source=solaris validados em produção (projeto 2310001)",
      "Post-mortem: INSERT silencioso — 5 Whys + 7 ações corretivas",
    ], status: "done" },
  { id: "Sprint N — G11", date: "2026-03-31", pr: "#267", commit: "28ff332",
    changes: [
      "G11: campo fonte_risco em project_risks_v3 (migration 0062)",
      "Derivação automática: gap.source → fonte_risco",
      "FONTE_BADGE na coluna Origem das Matrizes de Risco",
      "12/12 testes passando · TypeScript 0 erros",
    ], status: "done" },
  { id: "Sprint N — G15", date: "2026-03-31", pr: "#269", commit: "802c3f2",
    changes: [
      "G15: Arquitetura 3 Ondas — campo fonte em solaris_questions",
      "ONDA_BADGE nos questionários SOLARIS e IA Gen",
      "Feature flag g15-fonte-perguntas=true",
      "ADR-0002: Arquitetura 3 Ondas de Perguntas",
      "INV-005: 5/5 testes cobrindo regulatorio/solaris/ia_gen",
    ], status: "done" },
  { id: "Sprint N — Gates v5.0", date: "2026-03-31", pr: "#266", commit: "75ac176",
    changes: [
      "Gates v5.0: Gate 0 Discovery + Gate 2.5 Risk Score + Gate 4 Post-mortem",
      "CI: validate-implementation.yml com Q6/Q7/R9/R2",
      "Feature flags: server/config/feature-flags.ts",
      "Skills solaris-orquestracao v4.0 + solaris-contexto v4.0",
      "DORA Metrics + tabela de erros v5.0 no MODELO-OPERACIONAL",
    ], status: "done" },
];

const SOURCE_FILES = [
  { path: "server/rag-retriever.ts", role: "Motor de recuperação RAG (LIKE + topicos + cnaeGroups)", critical: true },
  { path: "server/rag-corpus.ts", role: "Corpus estático de 63 artigos", critical: true },
  { path: "server/routers/ragInventory.ts", role: "tRPC endpoint ragInventory.getSnapshot — cockpit ao vivo", critical: true },
  { path: "scripts/corpus-utils.mjs", role: "Utilitários de ingestão — buildAnchorId, upsertChunk", critical: true },
  { path: "scripts/migrate-anchor-id-legado.mjs", role: "Migração de anchor_id para chunks legados", critical: false },
  { path: "drizzle/schema.ts", role: "Schema ragDocuments — enum lei, anchor_id UNIQUE", critical: true },
  { path: "docs/rag/CORPUS-BASELINE.md", role: "Fonte de verdade do estado do corpus (documento vivo)", critical: true },
  { path: "docs/rag/RAG-GOVERNANCE.md", role: "Regras de governança — RFCs, rollback, métricas", critical: false },
  { path: "docs/rag/RFC/CORPUS-RFC-001.md", role: "RFC G-01: id 811 fragmentado", critical: false },
  { path: "docs/rag/RFC/CORPUS-RFC-002.md", role: "RFC G-02: ids 617–779 campo lei", critical: false },
  { path: "docs/rag/gold-set-queries.sql", role: "8 queries canônicas de validação de cobertura", critical: false },
  // Sprint N
  { path: "server/lib/solaris-gap-analyzer.ts", role: "G17: módulo isolado de análise SOLARIS — INSERT com transação", critical: true },
  { path: "server/config/feature-flags.ts", role: "Feature flags — g15-fonte-perguntas, g17-solaris-analyzer, bloqueios", critical: false },
  { path: "docs/adr/0001-g17-modulo-isolado.md", role: "ADR-0001: G17 módulo isolado (Sprint N)", critical: false },
  { path: "docs/adr/0002-arquitetura-3-ondas-perguntas.md", role: "ADR-0002: Arquitetura 3 Ondas de Perguntas (Sprint N)", critical: false },
  { path: "docs/governance/post-mortems/2026-03-31-g17-insert-silencioso.md", role: "Post-mortem G17: INSERT silencioso — 5 Whys + DORA Sprint N", critical: false },
  { path: ".github/workflows/validate-implementation.yml", role: "CI: Gates v5.0 — Q6/Q7/R9/R2 automáticos", critical: false },
];

// ── COMPONENTS ───────────────────────────────────────────────────────────────

const sev: Record<string, string> = { P0: "#ef4444", P1: "#f97316", P2: "#eab308", P3: "#6b7280" };
const sevDark: Record<string, string> = { P0: "#450a0a", P1: "#431407", P2: "#422006", P3: "#1f2937" };

function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 99,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
      color, background: bg, border: `1px solid ${color}33`
    }}>{text}</span>
  );
}

function Dot({ status }: { status: string }) {
  const c = status === "ok" ? "#22c55e" : status === "warn" ? "#f59e0b" : "#ef4444";
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c, marginRight: 6, flexShrink: 0 }} />;
}

function ScoreRing({ value, target = 98, size = 120 }: { value: number; target?: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (value / 100) * circ;
  const color = value >= target ? "#22c55e" : value >= 85 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={10} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x={size / 2} y={size / 2 + 6} textAnchor="middle"
        style={{ transform: "rotate(90deg)", transformOrigin: `${size / 2}px ${size / 2}px`, fill: color, fontSize: 22, fontWeight: 700, fontFamily: "monospace" }}>
        {value}%
      </text>
      <text x={size / 2} y={size / 2 + 22} textAnchor="middle"
        style={{ transform: "rotate(90deg)", transformOrigin: `${size / 2}px ${size / 2}px`, fill: "#64748b", fontSize: 9, fontFamily: "sans-serif" }}>
        meta: {target}%
      </text>
    </svg>
  );
}

function Tab({ label, active, onClick, alert }: { label: string; active: boolean; onClick: () => void; alert: number }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 16px", border: "none", cursor: "pointer",
      borderBottom: active ? "2px solid #6366f1" : "2px solid transparent",
      background: "transparent", color: active ? "#6366f1" : "#94a3b8",
      fontWeight: active ? 600 : 400, fontSize: 13, position: "relative",
      transition: "color 0.15s", whiteSpace: "nowrap"
    }}>
      {label}
      {alert > 0 && (
        <span style={{
          position: "absolute", top: 4, right: 4, background: "#ef4444",
          color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 700,
          padding: "0 5px", lineHeight: "16px", minWidth: 16, textAlign: "center"
        }}>{alert}</span>
      )}
    </button>
  );
}

// ── TABS ─────────────────────────────────────────────────────────────────────

function OverviewTab({ totalChunks, totalLeis, goldOk, goldTotal, corpusConfidence, anomalies, snapshot }: {
  totalChunks: number; totalLeis: number; goldOk: number; goldTotal: number;
  corpusConfidence: number; anomalies: number; snapshot: any;
}) {
  const semAnchor = snapshot ? Number(snapshot.totals.sem_anchor_id) : 0;
  return (
    <div>
      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total de chunks", value: totalChunks.toLocaleString("pt-BR"), sub: `${totalLeis} leis ativas`, color: "#22c55e" },
          { label: "Leis ativas", value: String(totalLeis), sub: snapshot?.by_lei?.map((r: any) => r.lei).join(" · ") ?? "—", color: "#6366f1" },
          { label: "Anomalias críticas", value: String(anomalies), sub: anomalies === 0 ? "corpus íntegro" : "requer RFC", color: anomalies > 0 ? "#f59e0b" : "#22c55e" },
          { label: "Sem anchor_id", value: String(semAnchor), sub: semAnchor === 0 ? "100% rastreável" : "orphans detectados", color: semAnchor > 0 ? "#f59e0b" : "#22c55e" },
          { label: "Gold set verde", value: `${goldOk}/${goldTotal}`, sub: "queries canônicas", color: goldOk === goldTotal ? "#22c55e" : "#f59e0b" },
          { label: "Confiabilidade", value: `${corpusConfidence}%`, sub: "meta: 98%", color: corpusConfidence >= 98 ? "#22c55e" : "#f59e0b" },
        ].map(k => (
          <div key={k.label} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>{k.label}</div>
            <div style={{ color: k.color, fontSize: 24, fontWeight: 700, fontFamily: "monospace", letterSpacing: "-1px" }}>{k.value}</div>
            <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Score + status */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <ScoreRing value={corpusConfidence} />
          <div style={{ color: "#64748b", fontSize: 11, textAlign: "center" }}>Confiabilidade RAG<br />gold set ao vivo</div>
        </div>
        <div>
          <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Status por subsistema</div>
          {[
            { label: "Integridade do corpus", value: `${totalChunks.toLocaleString("pt-BR")} chunks · ${semAnchor} orphans · ${semAnchor === 0 ? "100%" : "parcial"} anchor_id`, ok: semAnchor === 0 },
            { label: "Distribuição de leis", value: `${totalLeis} leis ativas`, ok: totalLeis >= 4 },
            { label: "Gold set canônico", value: `${goldOk}/${goldTotal} verde · ${corpusConfidence}% confiabilidade`, ok: goldOk === goldTotal },
            { label: "Anomalias críticas", value: anomalies === 0 ? "Nenhuma anomalia crítica detectada" : `${anomalies} anomalia(s) — requer RFC`, ok: anomalies === 0 },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid #0f172a" }}>
              <Dot status={s.ok ? "ok" : "warn"} />
              <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500, minWidth: 230 }}>{s.label}</span>
              <span style={{ color: "#64748b", fontSize: 12 }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Regra de ouro */}
      <div style={{ background: "#1a1232", border: "1px solid #4f46e5", borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "#a5b4fc" }}>
        <span style={{ fontWeight: 700 }}>Regra de ouro: </span>
        Nenhum UPDATE no banco sem (1) dry-run documentado, (2) aprovação do Orquestrador, (3) aprovação do P.O. e (4) SQL de rollback na RFC.
      </div>
    </div>
  );
}

function CorpusTab({ CORPUS, totalChunks, snapshotAt }: { CORPUS: any[]; totalChunks: number; snapshotAt: string | null }) {
  return (
    <div>
      <div style={{ color: "#64748b", fontSize: 12, marginBottom: 16 }}>
        {snapshotAt
          ? `Dados ao vivo · atualizado ${new Date(snapshotAt).toLocaleString("pt-BR")} · total: ${totalChunks.toLocaleString("pt-BR")} chunks`
          : "Carregando..."}
      </div>

      {/* Bar chart */}
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Distribuição por lei</div>
        {CORPUS.map((c: any) => {
          const w = totalChunks > 0 ? (c.chunks / totalChunks) * 100 : 0;
          return (
            <div key={c.lei} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Dot status={c.status} />
                  <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500 }}>{c.label}</span>
                  <span style={{ color: "#475569", fontSize: 11 }}>{c.lei}</span>
                </div>
                <span style={{ color: "#94a3b8", fontSize: 13, fontFamily: "monospace" }}>{c.chunks.toLocaleString()}</span>
              </div>
              <div style={{ background: "#1e293b", borderRadius: 4, height: 8, overflow: "hidden" }}>
                <div style={{ width: `${w}%`, background: c.status === "ok" ? "#6366f1" : "#f59e0b", height: "100%", borderRadius: 4, transition: "width 0.6s ease" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ color: "#475569", fontSize: 11 }}>{w.toFixed(1)}% do corpus · ids {c.idMin.toLocaleString()}–{c.idMax.toLocaleString()}</span>
                <span style={{ color: c.status === "ok" ? "#22c55e" : "#f59e0b", fontSize: 11 }}>{c.note}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#0f172a", borderBottom: "1px solid #1e293b" }}>
              {["Lei", "Label", "Chunks", "anchor_id", "Cobertura", "id_min", "id_max", "Status"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: 11, letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CORPUS.map((c: any, i: number) => (
              <tr key={c.lei} style={{ borderBottom: "1px solid #0f172a", background: i % 2 === 0 ? "#0b1423" : "#0f172a" }}>
                <td style={{ padding: "10px 14px", color: "#a5b4fc", fontFamily: "monospace", fontSize: 12 }}>{c.lei}</td>
                <td style={{ padding: "10px 14px", color: "#e2e8f0" }}>{c.label}</td>
                <td style={{ padding: "10px 14px", color: "#e2e8f0", fontFamily: "monospace" }}>{c.chunks.toLocaleString()}</td>
                <td style={{ padding: "10px 14px", color: "#e2e8f0", fontFamily: "monospace" }}>{c.anchor.toLocaleString()}</td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ color: c.status === "ok" ? "#22c55e" : "#f59e0b", fontFamily: "monospace" }}>
                    {c.chunks > 0 ? `${((c.anchor / c.chunks) * 100).toFixed(0)}%` : "—"}
                  </span>
                </td>
                <td style={{ padding: "10px 14px", color: "#64748b", fontFamily: "monospace" }}>{c.idMin.toLocaleString()}</td>
                <td style={{ padding: "10px 14px", color: "#64748b", fontFamily: "monospace" }}>{c.idMax.toLocaleString()}</td>
                <td style={{ padding: "10px 14px" }}>
                  <Badge text={c.status === "ok" ? "✓ Íntegro" : "⚠ Anomalia"} color={c.status === "ok" ? "#22c55e" : "#f59e0b"} bg={c.status === "ok" ? "#052e16" : "#431407"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QualityTab({ GOLD_SET, goldOk, goldTotal, corpusConfidence }: {
  GOLD_SET: any[]; goldOk: number; goldTotal: number; corpusConfidence: number;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "12px 20px" }}>
          <div style={{ color: "#64748b", fontSize: 11 }}>Gold set aprovado</div>
          <div style={{ color: "#22c55e", fontSize: 28, fontWeight: 700, fontFamily: "monospace" }}>{goldOk}/{goldTotal}</div>
        </div>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "12px 20px" }}>
          <div style={{ color: "#64748b", fontSize: 11 }}>Score de cobertura</div>
          <div style={{ color: corpusConfidence >= 98 ? "#22c55e" : "#f59e0b", fontSize: 28, fontWeight: 700, fontFamily: "monospace" }}>{corpusConfidence}%</div>
        </div>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "12px 20px" }}>
          <div style={{ color: "#64748b", fontSize: 11 }}>Meta de confiabilidade</div>
          <div style={{ color: "#6366f1", fontSize: 28, fontWeight: 700, fontFamily: "monospace" }}>98%</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {GOLD_SET.map((g: any) => (
          <div key={g.id} style={{
            background: "#0f172a", border: `1px solid ${g.status === "ok" ? "#14532d" : "#451a03"}`,
            borderRadius: 10, padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 12
          }}>
            <span style={{
              width: 60, fontSize: 11, fontWeight: 700, fontFamily: "monospace",
              color: g.status === "ok" ? "#22c55e" : "#f59e0b"
            }}>{g.id}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{g.label}</div>
              <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>
                {g.value ? JSON.stringify(g.value) : "—"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <Badge
                text={g.status === "ok" ? "✓ Verde" : "⚠ Pendente"}
                color={g.status === "ok" ? "#22c55e" : "#f59e0b"}
                bg={g.status === "ok" ? "#052e16" : "#431407"}
              />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 16px", fontSize: 12, color: "#475569" }}>
        <span style={{ color: "#94a3b8", fontWeight: 600 }}>Gold set ao vivo: </span>
        Queries executadas em tempo real contra o banco. GS-07b é informativo (chunks SUPERSEDED de governança) e não entra no cálculo de confidence.
      </div>
    </div>
  );
}

function AnomaliesTab({ anomaliesData }: { anomaliesData: any[] }) {
  const rfcOpen = RFCS.filter(r => r.status === "DRAFT" || r.status === "OPEN" || r.status === "BACKLOG");
  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { label: "P0 Crítico", count: anomaliesData.filter((a: any) => a.bytes < 5).length, color: "#ef4444" },
          { label: "P1 Alto", count: rfcOpen.filter(r => r.severity === "P1").length, color: "#f97316" },
          { label: "P2 Médio", count: rfcOpen.filter(r => r.severity === "P2").length, color: "#eab308" },
          { label: "P3 Baixo", count: rfcOpen.filter(r => r.severity === "P3").length, color: "#6b7280" },
        ].map(p => (
          <div key={p.label} style={{
            background: "#0f172a", border: `1px solid ${p.count > 0 ? p.color + "44" : "#1e293b"}`,
            borderRadius: 10, padding: "12px 18px", textAlign: "center", flex: 1
          }}>
            <div style={{ color: p.count > 0 ? p.color : "#334155", fontSize: 28, fontWeight: 700, fontFamily: "monospace" }}>{p.count}</div>
            <div style={{ color: p.count > 0 ? p.color + "bb" : "#334155", fontSize: 11 }}>{p.label}</div>
          </div>
        ))}
      </div>

      {/* Anomalias críticas do banco */}
      {anomaliesData.length > 0 && (
        <div style={{ background: "#0f172a", border: "1px solid #f9731644", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ color: "#f97316", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            Anomalias críticas detectadas no corpus ({anomaliesData.length})
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                {["ID", "Lei", "Artigo", "Bytes", "anchor_id", "Autor"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {anomaliesData.map((a: any) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #0f172a" }}>
                  <td style={{ padding: "6px 10px", color: "#f97316", fontFamily: "monospace" }}>{a.id}</td>
                  <td style={{ padding: "6px 10px", color: "#a5b4fc", fontFamily: "monospace" }}>{a.lei}</td>
                  <td style={{ padding: "6px 10px", color: "#94a3b8" }}>{a.artigo}</td>
                  <td style={{ padding: "6px 10px", color: "#f97316", fontFamily: "monospace" }}>{a.bytes}</td>
                  <td style={{ padding: "6px 10px", color: a.anchor_id ? "#22c55e" : "#ef4444", fontFamily: "monospace" }}>{a.anchor_id ? "✓" : "NULL"}</td>
                  <td style={{ padding: "6px 10px", color: "#64748b" }}>{a.autor ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* RFCs */}
      {RFCS.map(r => (
        <div key={r.id} style={{
          background: "#0f172a", border: `1px solid ${sev[r.severity]}44`,
          borderRadius: 12, padding: 18, marginBottom: 12
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: sev[r.severity], fontSize: 13, fontFamily: "monospace", fontWeight: 700 }}>{r.id}</span>
              <Badge text={r.severity} color={sev[r.severity]} bg={sevDark[r.severity]} />
              <Badge text={r.status} color="#6366f1" bg="#1e1b4b" />
            </div>
            <span style={{ color: "#475569", fontSize: 12 }}>Sprint {r.sprint} · {r.created}</span>
          </div>
          <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{r.title}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
            <div><span style={{ color: "#475569" }}>Lei: </span><span style={{ color: "#a5b4fc", fontFamily: "monospace" }}>{r.lei}</span></div>
            <div><span style={{ color: "#475569" }}>IDs afetados: </span><span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{r.ids}</span></div>
            <div style={{ gridColumn: "span 2" }}><span style={{ color: "#475569" }}>Ação: </span><span style={{ color: "#94a3b8" }}>{r.action}</span></div>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <Badge text={r.approved ? "✓ P.O. aprovado" : "⏳ Aguarda aprovação P.O."} color={r.approved ? "#22c55e" : "#f59e0b"} bg={r.approved ? "#052e16" : "#431407"} />
            <Badge text="Dry-run obrigatório antes do UPDATE" color="#6366f1" bg="#1e1b4b" />
          </div>
        </div>
      ))}

      {/* Runbook */}
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 18, marginTop: 4 }}>
        <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Runbook de resposta a incidente</div>
        <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
          {["Detectar", "Isolar", "Impactar", "RFC", "Aprovar", "Executar", "Verificar", "Registrar"].map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", background: "#1e293b",
                  border: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#6366f1", fontWeight: 700, fontSize: 12, margin: "0 auto 4px"
                }}>{i + 1}</div>
                <div style={{ color: "#64748b", fontSize: 11 }}>{s}</div>
              </div>
              {i < 7 && <div style={{ width: 16, height: 1, background: "#1e293b", flexShrink: 0, margin: "0 2px 16px" }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RastreabilidadeTab({ byAutor }: { byAutor: any[] }) {
  return (
    <div>
      <div style={{ color: "#64748b", fontSize: 12, marginBottom: 16 }}>
        Distribuição de chunks por autor de ingestão — dados ao vivo
      </div>
      {byAutor.length === 0 ? (
        <div style={{ color: "#475569", fontSize: 13, padding: "20px 0" }}>Nenhum dado de rastreabilidade disponível.</div>
      ) : (
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#0f172a", borderBottom: "1px solid #1e293b" }}>
                {["Autor", "Chunks", "id_min", "id_max", "Última revisão"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: 11, letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byAutor.map((a: any, i: number) => (
                <tr key={i} style={{ borderBottom: "1px solid #0f172a", background: i % 2 === 0 ? "#0b1423" : "#0f172a" }}>
                  <td style={{ padding: "10px 14px", color: "#a5b4fc", fontFamily: "monospace", fontSize: 12 }}>{a.autor ?? "(null)"}</td>
                  <td style={{ padding: "10px 14px", color: "#e2e8f0", fontFamily: "monospace" }}>{Number(a.qtd).toLocaleString()}</td>
                  <td style={{ padding: "10px 14px", color: "#64748b", fontFamily: "monospace" }}>{a.id_min}</td>
                  <td style={{ padding: "10px 14px", color: "#64748b", fontFamily: "monospace" }}>{a.id_max}</td>
                  <td style={{ padding: "10px 14px", color: "#64748b", fontSize: 12 }}>{a.ultima_revisao ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ChangeMgmtTab() {
  return (
    <div>
      <div style={{ color: "#64748b", fontSize: 12, marginBottom: 16 }}>
        Histórico de sprints RAG · RFCs versionadas · toda mudança rastreada
      </div>
      {SPRINTS.map(s => (
        <div key={s.id} style={{
          display: "flex", gap: 16, marginBottom: 4,
          padding: "14px 0", borderBottom: "1px solid #0f172a"
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: 40 }}>
            <div style={{
              width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
              background: s.status === "done" ? "#22c55e" : "#6366f1",
              border: "2px solid #0f172a"
            }} />
            <div style={{ flex: 1, width: 1, background: "#1e293b", marginTop: 4 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 14 }}>{s.id}</span>
                <Badge
                  text={s.status === "done" ? "✓ Concluída" : "⚡ Em andamento"}
                  color={s.status === "done" ? "#22c55e" : "#6366f1"}
                  bg={s.status === "done" ? "#052e16" : "#1e1b4b"}
                />
                {s.pr !== "—" && <span style={{ color: "#475569", fontSize: 12, fontFamily: "monospace" }}>PR {s.pr}</span>}
              </div>
              <span style={{ color: "#334155", fontSize: 12 }}>{s.date}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {s.changes.map(c => (
                <span key={c} style={{
                  background: "#1e293b", color: "#94a3b8", fontSize: 11,
                  padding: "2px 8px", borderRadius: 6
                }}>{c}</span>
              ))}
            </div>
            {s.commit !== "—" && (
              <div style={{ marginTop: 6, color: "#334155", fontSize: 11, fontFamily: "monospace" }}>commit {s.commit}</div>
            )}
          </div>
        </div>
      ))}

      {/* RFC checklist */}
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 18, marginTop: 12 }}>
        <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Checklist obrigatório de RFC</div>
        {[
          "Snapshot pré-execução registrada em CORPUS-BASELINE.md",
          "Dry-run executado e resultado colado na RFC",
          "Aprovação do Orquestrador (Claude)",
          "Aprovação do P.O. (Uires Tapajós) antes do UPDATE",
          "SQL de rollback documentado na RFC",
          "Gold set executado pós-correção",
          "CORPUS-BASELINE.md v+1 atualizado com snapshot pós",
          "PR com PR body referenciando RFC e evidências",
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "5px 0", borderBottom: "1px solid #0f172a" }}>
            <span style={{ color: "#334155", fontSize: 13, marginTop: 1 }}>☐</span>
            <span style={{ color: "#64748b", fontSize: 13 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilesTab() {
  return (
    <div>
      <div style={{ color: "#64748b", fontSize: 12, marginBottom: 16 }}>
        Arquivos fonte do sistema RAG · arquivos críticos têm impacto direto na recuperabilidade do corpus
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {SOURCE_FILES.map(f => (
          <div key={f.path} style={{
            background: "#0f172a",
            border: `1px solid ${f.critical ? "#312e81" : "#1e293b"}`,
            borderRadius: 10, padding: "12px 16px",
            display: "flex", alignItems: "flex-start", gap: 12
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0,
              background: f.critical ? "#6366f1" : "#334155"
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <code style={{ color: "#a5b4fc", fontSize: 12, background: "#1e1b4b", padding: "2px 6px", borderRadius: 4 }}>{f.path}</code>
                {f.critical && <Badge text="crítico" color="#6366f1" bg="#1e1b4b" />}
              </div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{f.role}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "12px 16px", fontSize: 12 }}>
        <span style={{ color: "#6366f1", fontWeight: 600 }}>Arquivos críticos: </span>
        <span style={{ color: "#475569" }}>qualquer alteração em arquivos marcados como crítico exige revisão do Orquestrador, testes de regressão e atualização do CORPUS-BASELINE.md.</span>
      </div>
    </div>
  );
}

function RollbackTab() {
  return (
    <div>
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 18, marginBottom: 16 }}>
        <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Estratégia de rollback</div>
        <div style={{ color: "#64748b", fontSize: 12, marginBottom: 14 }}>
          O campo <code style={{ color: "#a5b4fc" }}>autor</code> em todos os chunks permite rollback cirúrgico por sprint ou por RFC.
        </div>
        {[
          { title: "Rollback de ingestão completa", code: `DELETE FROM ragDocuments\nWHERE autor = 'ingestao-sprint-g-2026-03-26';` },
          { title: "Rollback de RFC-002 (se executada)", code: `UPDATE ragDocuments\nSET lei = 'lc214',\n    autor = 'ingestao-automatica-sprint-d'\nWHERE id BETWEEN 617 AND 779\n  AND autor = 'correcao-rfc-002-sprint-g';` },
          { title: "Verificação pós-rollback", code: `SELECT lei, COUNT(*) FROM ragDocuments\nWHERE id BETWEEN 617 AND 779\nGROUP BY lei;\n-- Deve mostrar somente lc214 com 163 registros` },
        ].map(r => (
          <div key={r.title} style={{ marginBottom: 14 }}>
            <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{r.title}</div>
            <pre style={{
              background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 8,
              padding: "12px 14px", color: "#7dd3fc", fontSize: 12,
              fontFamily: "monospace", margin: 0, overflowX: "auto", whiteSpace: "pre-wrap"
            }}>{r.code}</pre>
          </div>
        ))}
      </div>

      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 18 }}>
        <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Fallback de recuperação (sem rollback de banco)</div>
        <div style={{ color: "#64748b", fontSize: 12, marginBottom: 8 }}>
          Se uma lei retornar 0 chunks, o <code style={{ color: "#a5b4fc" }}>rag-retriever.ts</code> pode ampliar a busca de topicos para conteudo:
        </div>
        <pre style={{
          background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 8,
          padding: "12px 14px", color: "#7dd3fc", fontSize: 12,
          fontFamily: "monospace", overflowX: "auto", whiteSpace: "pre-wrap"
        }}>{`// Fallback: se topicos retorna 0, buscar em conteudo
if (results.length === 0) {
  results = await db.query(
    \`SELECT * FROM ragDocuments
     WHERE lei = ? AND conteudo LIKE ?\`,
    [lei, \`%\${term}%\`]
  );
}`}</pre>
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

export default function RAGCockpit() {
  const [tab, setTab] = useState(0);

  // ── Tarefa 1: query tRPC ao vivo ──────────────────────────────────────────
  const { data: snapshot, isLoading, isError, error, refetch } = trpc.ragInventory.getSnapshot.useQuery(
    undefined,
    { refetchInterval: 60_000 } // atualiza a cada 60s
  );

  // ── Tarefa 3: loading state ───────────────────────────────────────────────
  if (isLoading) return (
    <div style={{
      background: "#020817", minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ color: "#64748b", fontSize: 14 }}>
        Carregando inventário do corpus RAG...
      </div>
    </div>
  );

  // ── Tarefa 3b: error state (401 não autenticado ou erro de servidor) ─────
  if (isError) return (
    <div style={{
      background: "#020817", minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 16
    }}>
      <div style={{ color: "#f97316", fontSize: 16, fontWeight: 700 }}>⚠ RAG Cockpit indisponível</div>
      <div style={{ color: "#64748b", fontSize: 13, textAlign: "center", maxWidth: 400 }}>
        {(error as any)?.data?.code === "UNAUTHORIZED"
          ? "Você precisa estar autenticado para acessar o RAG Cockpit. Faça login e tente novamente."
          : `Erro ao carregar inventário: ${(error as any)?.message ?? "erro desconhecido"}`
        }
      </div>
      <button
        onClick={() => refetch()}
        style={{
          background: "#1e293b", color: "#94a3b8", border: "1px solid #334155",
          borderRadius: 6, padding: "6px 16px", cursor: "pointer", fontSize: 13
        }}
      >
        Tentar novamente
      </button>
    </div>
  );

  // ── Tarefa 2: derivar dados do snapshot ───────────────────────────────────
  const totalChunks      = snapshot ? Number(snapshot.totals.total_chunks) : 0;
  const totalLeis        = snapshot ? Number(snapshot.totals.total_leis)   : 0;
  const goldOk           = snapshot ? snapshot.gold_set.filter((g: any) => g.status === "ok").length : 0;
  const goldTotal        = snapshot ? snapshot.gold_set.length : 8;
  const corpusConfidence = snapshot?.confidence ?? 0;
  const anomalies        = snapshot ? snapshot.anomalies.length : 0;
  const snapshotAt       = snapshot?.snapshot_at ?? null;

  // ── Tarefa 6: derivar arrays das abas ─────────────────────────────────────
  const CORPUS = snapshot?.by_lei.map((r: any) => ({
    lei:    r.lei,
    label:  leiLabel(r.lei),
    chunks: Number(r.total),
    anchor: Number(r.total) - Number(r.sem_anchor),
    idMin:  Number(r.id_min),
    idMax:  Number(r.id_max),
    status: Number(r.sem_anchor) > 0 ? "warn" : "ok",
    note:   Number(r.sem_anchor) > 0 ? `${r.sem_anchor} sem anchor_id` : "Íntegro",
  })) ?? [];

  const GOLD_SET      = snapshot?.gold_set ?? [];
  const anomaliesData = snapshot?.anomalies ?? [];
  const byAutor       = snapshot?.by_autor ?? [];

  const tabs = [
    { label: "Visão geral",           alert: 0 },
    { label: "Corpus por lei",        alert: 0 },
    { label: "Qualidade / Gold set",  alert: goldTotal - goldOk },
    { label: "Anomalias / Incidentes", alert: anomalies },
    { label: "Rastreabilidade",       alert: 0 },
    { label: "Change Management",     alert: 0 },
    { label: "Arquivos fonte",        alert: 0 },
    { label: "Rollback & Fallback",   alert: 0 },
  ];

  const panels = [
    <OverviewTab key="overview" totalChunks={totalChunks} totalLeis={totalLeis} goldOk={goldOk} goldTotal={goldTotal} corpusConfidence={corpusConfidence} anomalies={anomalies} snapshot={snapshot} />,
    <CorpusTab key="corpus" CORPUS={CORPUS} totalChunks={totalChunks} snapshotAt={snapshotAt} />,
    <QualityTab key="quality" GOLD_SET={GOLD_SET} goldOk={goldOk} goldTotal={goldTotal} corpusConfidence={corpusConfidence} />,
    <AnomaliesTab key="anomalies" anomaliesData={anomaliesData} />,
    <RastreabilidadeTab key="rastreabilidade" byAutor={byAutor} />,
    <ChangeMgmtTab key="change" />,
    <FilesTab key="files" />,
    <RollbackTab key="rollback" />,
  ];

  return (
    <div style={{
      background: "#020817", color: "#e2e8f0", fontFamily: "'DM Sans', 'IBM Plex Sans', sans-serif",
      minHeight: "100vh", padding: 0
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0a0f1a 0%, #0f172a 100%)",
        borderBottom: "1px solid #1e293b", padding: "16px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", background: "#22c55e",
              boxShadow: "0 0 8px #22c55e", animation: "pulse 2s ease-in-out infinite"
            }} />
            <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px" }}>
              IA SOLARIS — RAG Cockpit
            </span>
            <span style={{ color: "#334155", fontSize: 13 }}>·</span>
            <span style={{ color: "#475569", fontSize: 13 }}>compliance-tributaria-v2</span>
          </div>
          {/* Tarefa 4: timestamp ao vivo */}
          <div style={{ color: "#334155", fontSize: 11, marginTop: 3, display: "flex", alignItems: "center", gap: 8 }}>
            {snapshotAt
              ? `Corpus ao vivo · atualizado ${new Date(snapshotAt).toLocaleTimeString("pt-BR")}`
              : "Carregando..."}
            {/* Tarefa 5: botão Atualizar */}
            <button
              onClick={() => refetch()}
              style={{
                background: "transparent",
                border: "1px solid #1e293b",
                borderRadius: 6,
                padding: "2px 10px",
                fontSize: 11,
                color: "#475569",
                cursor: "pointer",
                marginLeft: 4,
              }}
            >
              Atualizar
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          {/* Badge UAT em andamento */}
          <div style={{
            background: "#1a2744", border: "1px solid #3b82f6",
            borderRadius: 8, padding: "6px 14px", textAlign: "center"
          }}>
            <div style={{ color: "#22c55e", fontWeight: 700, fontSize: 12, letterSpacing: "0.05em" }}>✅ SPRINT N CONCLUÍDA</div>
            <div style={{ color: "#334155", fontSize: 10, marginTop: 2 }}>G11 · G15 · G17 · Gates v5.0 · 9 PRs</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: corpusConfidence >= 98 ? "#22c55e" : "#f59e0b", fontFamily: "monospace", fontWeight: 700, fontSize: 20 }}>{corpusConfidence}%</div>
            <div style={{ color: "#334155", fontSize: 10 }}>confiabilidade</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#6366f1", fontFamily: "monospace", fontWeight: 700, fontSize: 20 }}>98%</div>
            <div style={{ color: "#334155", fontSize: 10 }}>meta</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: anomalies > 0 ? "#f59e0b" : "#22c55e", fontFamily: "monospace", fontWeight: 700, fontSize: 20 }}>{anomalies}</div>
            <div style={{ color: "#334155", fontSize: 10 }}>anomalias</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#94a3b8", fontFamily: "monospace", fontWeight: 700, fontSize: 20 }}>{totalChunks.toLocaleString("pt-BR")}</div>
            <div style={{ color: "#334155", fontSize: 10 }}>chunks</div>
          </div>
        </div>
      </div>

      {/* Alert banner */}
      {anomalies > 0 && (
        <div style={{
          background: "#431407", borderBottom: "1px solid #f97316",
          padding: "8px 24px", display: "flex", alignItems: "center", gap: 8, fontSize: 13
        }}>
          <span style={{ color: "#f97316", fontWeight: 700 }}>⚠ {anomalies} anomalia{anomalies > 1 ? "s" : ""} crítica{anomalies > 1 ? "s" : ""} detectada{anomalies > 1 ? "s" : ""}: </span>
          <span style={{ color: "#fca5a5" }}>chunks com conteúdo &lt; 10 bytes ou sem anchor_id — requer RFC.</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ background: "#0a0f1a", borderBottom: "1px solid #1e293b", padding: "0 24px", display: "flex", overflowX: "auto" }}>
        {tabs.map((t, i) => (
          <Tab key={t.label} label={t.label} active={tab === i} onClick={() => setTab(i)} alert={t.alert} />
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "20px 24px", maxWidth: 1100, margin: "0 auto" }}>
        {panels[tab]}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
