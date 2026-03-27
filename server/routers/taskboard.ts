/**
 * taskboard.ts — Sprint K · Issue #151
 * Router tRPC que agrega dados do GitHub (issues, milestones, PRs)
 * e retorna estrutura pronta para o TaskBoard do P.O.
 *
 * Endpoint: trpc.taskboard.getSnapshot
 * Acesso: protectedProcedure (apenas usuários autenticados)
 * Cache: 5 minutos (TTL simples em memória)
 */
import { protectedProcedure, router } from "../_core/trpc";

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface GHIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  labels: Array<{ name: string; color: string }>;
  milestone: { number: number; title: string } | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  pull_request?: unknown;
}

interface GHMilestone {
  number: number;
  title: string;
  description: string | null;
  state: "open" | "closed";
  open_issues: number;
  closed_issues: number;
  due_on: string | null;
}

interface GHPullRequest {
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  merged_at: string | null;
  created_at: string;
  head: { ref: string };
  milestone: { number: number; title: string } | null;
}

// ── CACHE ─────────────────────────────────────────────────────────────────────
let _cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// ── GITHUB FETCH HELPER ───────────────────────────────────────────────────────
const REPO = "Solaris-Empresa/compliance-tributaria-v2";
const GH_TOKEN = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";

async function ghFetch<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (GH_TOKEN) headers["Authorization"] = `Bearer ${GH_TOKEN}`;

  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ── STATUS CLASSIFIER ─────────────────────────────────────────────────────────
function classifyStatus(issue: GHIssue): "done" | "in_progress" | "todo" | "blocked" | "backlog" {
  if (issue.state === "closed") return "done";
  const labels = issue.labels.map((l) => l.name.toLowerCase());
  if (labels.some((l) => l.includes("blocked") || l.includes("requires:po-approval"))) return "blocked";
  if (labels.some((l) => l.includes("tech-debt") || l.includes("debito-tecnico"))) return "backlog";
  if (labels.some((l) => l.includes("in-progress") || l.includes("shadow-mode"))) return "in_progress";
  // Heurística: issues mais antigas abertas sem bloqueio = in_progress se milestone ativo
  if (issue.milestone && issue.number < 100) return "in_progress";
  return "todo";
}

function extractPriority(issue: GHIssue): "critical" | "high" | "medium" | "low" | "normal" {
  const labels = issue.labels.map((l) => l.name);
  if (labels.includes("priority:critical")) return "critical";
  if (labels.includes("priority:high")) return "high";
  if (labels.includes("priority:medium")) return "medium";
  if (labels.includes("priority:low")) return "low";
  return "normal";
}

function extractArea(issue: GHIssue): string[] {
  return issue.labels
    .map((l) => l.name)
    .filter((n) => n.startsWith("area:") || ["backend", "frontend", "database", "docs", "governance", "epic", "tech-debt", "uat"].includes(n))
    .map((n) => n.replace("area:", ""));
}

// ── SNAPSHOT BUILDER ──────────────────────────────────────────────────────────
async function buildSnapshot() {
  const [openIssues, closedIssues, milestones, openPRs, mergedPRs] = await Promise.all([
    ghFetch<GHIssue[]>("/issues?state=open&per_page=100&labels="),
    ghFetch<GHIssue[]>("/issues?state=closed&per_page=30&sort=updated"),
    ghFetch<GHMilestone[]>("/milestones?state=all&per_page=20"),
    ghFetch<GHPullRequest[]>("/pulls?state=open&per_page=20"),
    ghFetch<GHPullRequest[]>("/pulls?state=closed&per_page=15&sort=updated"),
  ]);

  // Filtrar PRs dos issues (GitHub retorna PRs junto com issues)
  const issuesOnly = openIssues.filter((i) => !i.pull_request);
  const closedIssuesOnly = closedIssues.filter((i) => !i.pull_request).slice(0, 10);

  // Montar cards
  const cards = [
    ...issuesOnly.map((i) => ({
      number: i.number,
      title: i.title,
      status: classifyStatus(i),
      priority: extractPriority(i),
      areas: extractArea(i),
      milestone: i.milestone?.title ?? null,
      milestoneNumber: i.milestone?.number ?? null,
      isEpic: i.labels.some((l) => l.name === "epic"),
      updatedAt: i.updated_at,
    })),
    ...closedIssuesOnly.map((i) => ({
      number: i.number,
      title: i.title,
      status: "done" as const,
      priority: extractPriority(i),
      areas: extractArea(i),
      milestone: i.milestone?.title ?? null,
      milestoneNumber: i.milestone?.number ?? null,
      isEpic: i.labels.some((l) => l.name === "epic"),
      updatedAt: i.closed_at ?? i.updated_at,
    })),
  ];

  // Montar milestones com progresso
  const activeMilestones = milestones
    .filter((m) => m.state === "open" || m.open_issues + m.closed_issues > 0)
    .map((m) => ({
      number: m.number,
      title: m.title,
      description: m.description,
      state: m.state,
      openIssues: m.open_issues,
      closedIssues: m.closed_issues,
      total: m.open_issues + m.closed_issues,
      pct: m.open_issues + m.closed_issues > 0
        ? Math.round((m.closed_issues / (m.open_issues + m.closed_issues)) * 100)
        : 0,
      dueOn: m.due_on,
    }));

  // PRs recentes mergeados
  const recentPRs = mergedPRs
    .filter((p) => p.merged_at)
    .slice(0, 10)
    .map((p) => ({
      number: p.number,
      title: p.title,
      mergedAt: p.merged_at,
      branch: p.head.ref,
      milestone: p.milestone?.title ?? null,
    }));

  // KPIs
  const totalOpen = issuesOnly.length;
  const blocked = issuesOnly.filter((i) => classifyStatus(i) === "blocked").length;
  const inProgress = issuesOnly.filter((i) => classifyStatus(i) === "in_progress").length;
  const todo = issuesOnly.filter((i) => classifyStatus(i) === "todo").length;
  const backlog = issuesOnly.filter((i) => classifyStatus(i) === "backlog").length;

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      totalOpen,
      blocked,
      inProgress,
      todo,
      backlog,
      totalMilestones: activeMilestones.filter((m) => m.state === "open").length,
      recentMerged: recentPRs.length,
    },
    cards,
    milestones: activeMilestones,
    recentPRs,
  };
}

// ── ROUTER ────────────────────────────────────────────────────────────────────
export const taskboardRouter = router({
  getSnapshot: protectedProcedure.query(async () => {
    const now = Date.now();
    if (_cache && now - _cache.ts < CACHE_TTL_MS) {
      return _cache.data;
    }
    const data = await buildSnapshot();
    _cache = { data, ts: now };
    return data;
  }),
});
