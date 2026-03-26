import { useState, useEffect } from "react";

// ── DATA ────────────────────────────────────────────────────────────────────

const CORPUS = [
  { lei: "lc214", label: "LC 214/2025", chunks: 1598, anchor: 1598, idMin: 1, idMax: 30839, status: "warn", note: "G-02: ids 617–779 campo lei a validar" },
  { lei: "lc227", label: "LC 227/2024", chunks: 434, anchor: 434, idMin: 808, idMax: 1241, status: "warn", note: "G-01: id 811 fragmentado" },
  { lei: "lc224", label: "LC 224/2024", chunks: 28, anchor: 28, idMin: 780, idMax: 807, status: "ok", note: "Íntegro — G5/G6 corrigidos" },
  { lei: "ec132", label: "EC 132/2023", chunks: 18, anchor: 18, idMin: 30840, idMax: 30857, status: "ok", note: "Íntegro — Sprint D" },
];

const GOLD_SET = [
  { id: "GS-01", label: "Integridade total", desc: "2.078 chunks, 0 sem anchor_id", status: "ok", value: "2.078 / 0 orphans" },
  { id: "GS-02", label: "Distribuição por lei", desc: "4 leis ativas, bate com baseline", status: "ok", value: "4 leis confirmadas" },
  { id: "GS-03", label: "lc227 — split payment", desc: "≥ 5 chunks recuperáveis", status: "warn", value: "Aguarda RFC-001" },
  { id: "GS-04", label: "lc214 Art.45 — confissão", desc: "≥ 1 chunk com tópico relevante", status: "warn", value: "Topicos incompletos (G5)" },
  { id: "GS-05", label: "lc224 — CNAE universal", desc: "cnaeGroups cobrindo grupos 46 e 49", status: "ok", value: "Corrigido Sprint A" },
  { id: "GS-06", label: "ec132 — cobertura total", desc: "≥ 18 chunks", status: "ok", value: "18 chunks confirmados" },
  { id: "GS-07", label: "Ausência de anomalias", desc: "anchor_id NOT NULL, lei válida", status: "warn", value: "G-01 + G-02 pendentes" },
  { id: "GS-08", label: "Ingestão rastreável", desc: "autor + data_revisao preenchidos", status: "ok", value: "100% Sprint D" },
];

const RFCS = [
  {
    id: "RFC-001", title: "Chunk fragmentado id 811", lei: "lc227", severity: "P2",
    status: "DRAFT", ids: "811", action: "Reingesta ou fusão c/ chunk anterior",
    sprint: "G", created: "2026-03-26", approved: false,
  },
  {
    id: "RFC-002", title: "Campo lei incorreto ids 617–779", lei: "lc214", severity: "P1",
    status: "DRAFT", ids: "617–779 (163 chunks)", action: "UPDATE SET lei = [correta] após diagnóstico",
    sprint: "G", created: "2026-03-26", approved: false,
  },
];

const SPRINTS = [
  { id: "Sprint A", date: "2026-03-26", pr: "#105", commit: "a28875b", changes: ["G1 label lc224", "G2 ano lc227", "G5 Art.45 tópicos", "G6 LC224 cnaeGroups"], status: "done" },
  { id: "Sprint B", date: "2026-03-26", pr: "#106", commit: "dbad765", changes: ["G8 companyProfile no briefing", "G7 RAG 4 queries paralelas", "Fix CI jobs"], status: "done" },
  { id: "Sprint D", date: "2026-03-26", pr: "#109", commit: "03fa2c1", changes: ["ec132 18 chunks ingeridos", "anchor_id 100%", "corpus-utils.mjs"], status: "done" },
  { id: "Sprint G", date: "2026-03-26", pr: "—", commit: "—", changes: ["RFC-001: id 811 fragmentado", "RFC-002: 163 chunks campo lei", "CORPUS-BASELINE.md v1.0"], status: "active" },
];

const SOURCE_FILES = [
  { path: "server/rag-retriever.ts", role: "Motor de recuperação RAG (LIKE + topicos + cnaeGroups)", critical: true },
  { path: "server/rag-corpus.ts", role: "Corpus estático de 63 artigos", critical: true },
  { path: "scripts/corpus-utils.mjs", role: "Utilitários de ingestão — buildAnchorId, upsertChunk", critical: true },
  { path: "scripts/migrate-anchor-id-legado.mjs", role: "Migração de anchor_id para chunks legados", critical: false },
  { path: "drizzle/schema.ts", role: "Schema ragDocuments — enum lei, anchor_id UNIQUE", critical: true },
  { path: "docs/rag/CORPUS-BASELINE.md", role: "Fonte de verdade do estado do corpus (documento vivo)", critical: true },
  { path: "docs/rag/RAG-GOVERNANCE.md", role: "Regras de governança — RFCs, rollback, métricas", critical: false },
  { path: "docs/rag/RFC/CORPUS-RFC-001.md", role: "RFC G-01: id 811 fragmentado", critical: false },
  { path: "docs/rag/RFC/CORPUS-RFC-002.md", role: "RFC G-02: ids 617–779 campo lei", critical: false },
  { path: "docs/rag/gold-set-queries.sql", role: "8 queries canônicas de validação de cobertura", critical: false },
];

// ── HELPERS ─────────────────────────────────────────────────────────────────

const totalChunks = CORPUS.reduce((s, c) => s + c.chunks, 0);
const goldOk = GOLD_SET.filter((g) => g.status === "ok").length;
const goldTotal = GOLD_SET.length;
const corpusConfidence = +((goldOk / goldTotal) * 100).toFixed(1);
const anomalies = RFCS.filter((r) => r.status === "DRAFT" || r.status === "OPEN").length;

// ── COMPONENTS ──────────────────────────────────────────────────────────────

const sev: Record<string, string> = { P0: "#ef4444", P1: "#f97316", P2: "#eab308", P3: "#6b7280" };
const sevBg: Record<string, string> = { P0: "#fee2e2", P1: "#ffedd5", P2: "#fefce8", P3: "#f3f4f6" };
const sevDark: Record<string, string> = { P0: "#450a0a", P1: "#431407", P2: "#422006", P3: "#1f2937" };

// Suppress unused warning
void sevBg;

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

// ── TABS ────────────────────────────────────────────────────────────────────

function OverviewTab() {
  return (
    <div>
      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total de chunks", value: "2.078", sub: "100% anchor_id", color: "#22c55e" },
          { label: "Leis ativas", value: "4", sub: "lc214 · lc227 · lc224 · ec132", color: "#6366f1" },
          { label: "Anomalias abertas", value: String(anomalies), sub: "G-01 · G-02", color: anomalies > 0 ? "#f59e0b" : "#22c55e" },
          { label: "RFCs pendentes", value: String(RFCS.length), sub: "Sprint G", color: "#f59e0b" },
          { label: "Gold set verde", value: `${goldOk}/${goldTotal}`, sub: "queries canônicas", color: goldOk === goldTotal ? "#22c55e" : "#f59e0b" },
          { label: "Testes passando", value: "489+", sub: "baseline v1.6", color: "#22c55e" },
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
          <div style={{ color: "#64748b", fontSize: 11, textAlign: "center" }}>Confiabilidade RAG<br />gold set atual</div>
        </div>
        <div>
          <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Status por subsistema</div>
          {[
            { label: "Integridade do corpus", value: "2.078 chunks · 0 orphans · 100% anchor_id", ok: true },
            { label: "Distribuição de leis", value: "4 leis · ec132 íntegra · lc224 íntegra", ok: true },
            { label: "Recuperabilidade lc227", value: "id 811 fragmentado — RFC-001 DRAFT", ok: false },
            { label: "Recuperabilidade lc214", value: "163 chunks campo lei pendente — RFC-002 DRAFT", ok: false },
            { label: "Rastreabilidade (anchor_id)", value: "100% preenchido · sistema de rollback ativo", ok: true },
            { label: "Gold set GS-05, GS-06, GS-08", value: "Verdes · Sprints A, B, D entregues", ok: true },
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

function CorpusTab() {
  return (
    <div>
      <div style={{ color: "#64748b", fontSize: 12, marginBottom: 16 }}>
        Baseline v1.0 · commit d18dadb · 2026-03-26 · total: 2.078 chunks · 100% anchor_id
      </div>

      {/* Bar chart */}
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Distribuição por lei</div>
        {CORPUS.map(c => {
          const w = (c.chunks / totalChunks) * 100;
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
            {CORPUS.map((c, i) => (
              <tr key={c.lei} style={{ borderBottom: "1px solid #0f172a", background: i % 2 === 0 ? "#0b1423" : "#0f172a" }}>
                <td style={{ padding: "10px 14px", color: "#a5b4fc", fontFamily: "monospace", fontSize: 12 }}>{c.lei}</td>
                <td style={{ padding: "10px 14px", color: "#e2e8f0" }}>{c.label}</td>
                <td style={{ padding: "10px 14px", color: "#e2e8f0", fontFamily: "monospace" }}>{c.chunks.toLocaleString()}</td>
                <td style={{ padding: "10px 14px", color: "#e2e8f0", fontFamily: "monospace" }}>{c.anchor.toLocaleString()}</td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ color: "#22c55e", fontFamily: "monospace" }}>100%</span>
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

function QualityTab() {
  const okCount = GOLD_SET.filter(g => g.status === "ok").length;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "12px 20px" }}>
          <div style={{ color: "#64748b", fontSize: 11 }}>Gold set aprovado</div>
          <div style={{ color: "#22c55e", fontSize: 28, fontWeight: 700, fontFamily: "monospace" }}>{okCount}/{goldTotal}</div>
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
        {GOLD_SET.map(g => (
          <div key={g.id} style={{
            background: "#0f172a", border: `1px solid ${g.status === "ok" ? "#14532d" : "#451a03"}`,
            borderRadius: 10, padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 12
          }}>
            <span style={{
              width: 56, fontSize: 11, fontWeight: 700, fontFamily: "monospace",
              color: g.status === "ok" ? "#22c55e" : "#f59e0b"
            }}>{g.id}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{g.label}</div>
              <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>{g.desc}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#64748b", fontSize: 12, fontFamily: "monospace" }}>{g.value}</div>
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
        <span style={{ color: "#94a3b8", fontWeight: 600 }}>Para atingir 98%: </span>
        GS-03 e GS-07 dependem de RFC-001 (id 811). GS-04 requer melhoria de topicos (G5 residual). Com Sprint G completo: 8/8 verde → 100% gold set → 98%+ de confiabilidade.
      </div>
    </div>
  );
}

function IncidentsTab() {
  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { label: "P0 Crítico", count: 0, color: "#ef4444" },
          { label: "P1 Alto", count: 1, color: "#f97316" },
          { label: "P2 Médio", count: 1, color: "#eab308" },
          { label: "P3 Baixo", count: 0, color: "#6b7280" },
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
              <div style={{ textAlign: "center", minWidth: 72 }}>
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

// ── MAIN ────────────────────────────────────────────────────────────────────

export default function RAGCockpit() {
  const [tab, setTab] = useState(0);
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 3000);
    return () => clearInterval(t);
  }, []);

  const tabs = [
    { label: "Visão geral", alert: 0 },
    { label: "Corpus por lei", alert: 0 },
    { label: "Qualidade / Gold set", alert: goldTotal - goldOk },
    { label: "Anomalias / Incidentes", alert: anomalies },
    { label: "Change Management", alert: RFCS.length },
    { label: "Arquivos fonte", alert: 0 },
    { label: "Rollback & Fallback", alert: 0 },
  ];

  const panels = [
    <OverviewTab key="overview" />, <CorpusTab key="corpus" />, <QualityTab key="quality" />,
    <IncidentsTab key="incidents" />, <ChangeMgmtTab key="change" />, <FilesTab key="files" />, <RollbackTab key="rollback" />
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
          <div style={{ color: "#334155", fontSize: 11, marginTop: 3 }}>
            Corpus baseline v1.0 · commit d18dadb · 2026-03-26 · Sprint G pré-execução
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
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
        </div>
      </div>

      {/* Alert banner */}
      {anomalies > 0 && (
        <div style={{
          background: "#431407", borderBottom: "1px solid #f97316",
          padding: "8px 24px", display: "flex", alignItems: "center", gap: 8, fontSize: 13
        }}>
          <span style={{ color: "#f97316", fontWeight: 700 }}>⚠ {anomalies} anomalia{anomalies > 1 ? "s" : ""} ativa{anomalies > 1 ? "s" : ""}: </span>
          <span style={{ color: "#fca5a5" }}>RFC-001 (P2 · id 811 lc227 fragmentado) · RFC-002 (P1 · 163 chunks campo lei incorreto) — aguardando diagnóstico e aprovação do P.O.</span>
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
