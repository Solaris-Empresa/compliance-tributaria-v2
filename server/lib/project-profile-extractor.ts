// project-profile-extractor.ts — Sprint Z-13.5 Tarefa C
// Extrai e normaliza o ProjectProfile a partir do JSON do projeto no banco.
// Usa raw SQL com os nomes EXATOS das colunas conforme schema real:
//   confirmedCnaes, operationProfile, product_answers, taxRegime, companySize
//   (mix de camelCase e snake_case conforme auditoria de schema pré-Z-13.5)
// ─────────────────────────────────────────────────────────────────────────────

import { drizzle } from "drizzle-orm/mysql2";

// Lazy singleton — mesmo padrão de db-queries-risks-v4.ts
let _db: ReturnType<typeof drizzle> | null = null;
async function getDb(): Promise<ReturnType<typeof drizzle>> {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  if (!_db) throw new Error("[project-profile-extractor] DATABASE_URL não configurado");
  return _db;
}

async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  const [rows] = await (db.$client as any).promise().execute(sql, params);
  return rows as T[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Interface pública
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectProfile {
  projectId: number;
  /** CNAEs confirmados pelo cliente (array de strings, ex: ["4711-3/01", "4712-1/00"]) */
  cnaes: string[];
  /** Regime tributário: simples_nacional | lucro_presumido | lucro_real */
  taxRegime: string | null;
  /** Porte da empresa: mei | micro | pequena | media | grande */
  companySize: string | null;
  /** Tipo de operação: ex. "varejista", "atacadista", "prestador_servico" */
  tipoOperacao: string | null;
  /** Tipo de cliente: ex. "b2b", "b2c", "b2b2c" */
  tipoCliente: string | null;
  /** Operação multiestadual: true/false */
  multiestadual: boolean | null;
  /** Meios de pagamento aceitos: ex. ["cartao_credito", "pix", "boleto"] */
  meiosPagamento: string[] | null;
  /** Intermediários financeiros: ex. ["adquirente", "marketplace"] */
  intermediarios: string[] | null;
  /** NCMs dos produtos comercializados (extraídos de product_answers) */
  productNcms: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Row bruto retornado pelo banco
// ─────────────────────────────────────────────────────────────────────────────

interface ProjectRow {
  id: number;
  confirmedCnaes: string | null;       // camelCase no banco
  operationProfile: string | null;     // camelCase no banco
  product_answers: string | null;      // snake_case no banco (migration posterior)
  taxRegime: string | null;            // camelCase no banco
  companySize: string | null;          // camelCase no banco
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de parse seguro
// ─────────────────────────────────────────────────────────────────────────────

function safeParseArray(raw: unknown, fallback: unknown[] = []): unknown[] {
  if (!raw) return fallback;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function safeParseObject(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Extrator principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrai o ProjectProfile do banco para um projeto específico.
 * Retorna null se o projeto não for encontrado.
 */
export async function extractProjectProfile(
  projectId: number
): Promise<ProjectProfile | null> {
  // Nomes de colunas EXATOS conforme auditoria de schema pré-Z-13.5.
  // NÃO alterar sem nova auditoria — mix intencional de camelCase e snake_case.
  const rows = await query<ProjectRow>(
    `SELECT
       id,
       confirmedCnaes,
       operationProfile,
       product_answers,
       taxRegime,
       companySize
     FROM projects
     WHERE id = ?
     LIMIT 1`,
    [projectId]
  );

  if (!rows || rows.length === 0) return null;

  const row = rows[0];

  // Extrair CNAEs confirmados
  const cnaesRaw = safeParseArray(row.confirmedCnaes);
  const cnaes = cnaesRaw
    .map((c: unknown) => {
      if (typeof c === "string") return c;
      if (c && typeof c === "object") {
        const obj = c as Record<string, unknown>;
        return (obj.cnae ?? obj.code ?? obj.id ?? "") as string;
      }
      return "";
    })
    .filter(Boolean);

  // Extrair campos do operationProfile
  const opProfile = safeParseObject(row.operationProfile);

  // Extrair NCMs dos product_answers
  const productAnswersRaw = safeParseArray(row.product_answers);
  const productNcms = productAnswersRaw
    .map((p: unknown) => {
      if (p && typeof p === "object") {
        const obj = p as Record<string, unknown>;
        return ((obj.ncm ?? obj.ncmCode ?? "") as string) || "";
      }
      return "";
    })
    .filter(Boolean);

  return {
    projectId: row.id,
    cnaes,
    taxRegime: row.taxRegime ?? null,
    companySize: row.companySize ?? null,
    tipoOperacao: (opProfile.tipoOperacao as string) ?? null,
    tipoCliente: (opProfile.tipoCliente as string) ?? null,
    multiestadual:
      opProfile.multiestadual != null
        ? Boolean(opProfile.multiestadual)
        : null,
    meiosPagamento: Array.isArray(opProfile.meiosPagamento)
      ? (opProfile.meiosPagamento as string[])
      : null,
    intermediarios: Array.isArray(opProfile.intermediarios)
      ? (opProfile.intermediarios as string[])
      : null,
    productNcms,
  };
}
