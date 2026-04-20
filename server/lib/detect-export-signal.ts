/**
 * detect-export-signal.ts — issue #785 item G
 *
 * Detecta sinais de exportação internacional no texto livre do usuário
 * (description, correction, complement) e produz sufixo jurídico para
 * enriquecer o `briefingQueryCtx` enviado ao RAG.
 *
 * Motivação: keywords coloquiais como "Bolívia" ou "rondonopolis para la paz"
 * não batem com chunks do corpus jurídico (que usa "exportação/imunidade/exterior").
 * O detector preenche essa ponte semântica com uma lista curada de países e
 * termos — zero LLM, determinístico.
 *
 * Complementa o item F (regras fixas no system prompt — PR #789), que garante
 * que Art. 8 seja citado mesmo sem chunks RAG; G aumenta a chance do RAG
 * recuperar os chunks do Art. 8 quando existirem.
 */

// Lista curada de países estrangeiros — 50+ entradas incluindo variações de grafia.
// Brasil NÃO está na lista (é o país-base).
const FOREIGN_COUNTRIES: string[] = [
  // América do Sul
  "bolivia", "bolívia",
  "argentina",
  "paraguai", "paraguay",
  "uruguai", "uruguay",
  "chile",
  "peru", "perú",
  "colombia", "colômbia",
  "venezuela",
  "equador", "ecuador",
  "guiana", "guyana",
  "suriname",
  // América do Norte / Central
  "eua", "estados unidos", "usa", "united states",
  "canada", "canadá",
  "mexico", "méxico",
  "cuba",
  // Europa (principais)
  "portugal",
  "espanha", "spain", "españa",
  "alemanha", "germany",
  "franca", "frança", "france",
  "italia", "itália", "italy",
  "reino unido", "inglaterra", "uk", "united kingdom",
  "holanda", "países baixos", "netherlands",
  "suiça", "suíça", "switzerland",
  "suécia", "sweden",
  "belgica", "bélgica", "belgium",
  "austria", "áustria",
  // Ásia
  "china",
  "japao", "japão", "japan",
  "coreia", "coréia", "korea",
  "india", "índia",
  "vietna", "vietnã", "vietnam",
  "tailandia", "tailândia", "thailand",
  "singapura", "singapore",
  // África (principais parceiros do Brasil)
  "angola",
  "mocambique", "moçambique",
  "africa do sul", "south africa",
  "nigeria", "nigéria",
  // Oriente Médio
  "israel",
  "arabia saudita", "arábia saudita",
  "emirados arabes", "emirados árabes",
  // Oceania
  "australia", "austrália",
  "nova zelandia", "nova zelândia",
];

// Termos explícitos de exportação/operação internacional.
const EXPORT_TERMS: string[] = [
  "exportação", "exportacao",
  "exportar", "exportamos", "exporto",
  "exportado", "exportadas", "exportados",
  "mercado externo", "mercado internacional",
  "comercio exterior", "comércio exterior",
  "exterior",
  "operação internacional", "operacao internacional",
  "venda internacional", "vendas internacionais",
  "cross-border", "cross border",
  "transporte internacional",
  "cliente internacional",
  "no exterior", "fora do país", "fora do pais",
  "importação", "importacao", // importação também é operação internacional relevante para créditos
];

export interface ExportSignalResult {
  detected: boolean;
  countries: string[];       // países detectados (normalizados)
  terms: string[];           // termos explícitos detectados
  suffix: string;             // sufixo jurídico a anexar ao briefingQueryCtx
}

/**
 * Detecta sinais de exportação internacional no texto combinado.
 * Case-insensitive. Uma ocorrência basta.
 */
export function detectExportSignal(texts: Array<string | null | undefined>): ExportSignalResult {
  const blob = texts
    .filter((t): t is string => typeof t === "string" && t.length > 0)
    .join(" ")
    .toLowerCase();

  if (!blob) {
    return { detected: false, countries: [], terms: [], suffix: "" };
  }

  // Detecta países — word-ish match usando boundary de espaço/pontuação.
  const countriesFound = new Set<string>();
  for (const country of FOREIGN_COUNTRIES) {
    // Matches "bolivia", " bolivia ", "bolívia.", "-bolivia," etc.
    const pattern = new RegExp(`(^|[^a-zà-úç])${escapeRegex(country)}([^a-zà-úç]|$)`, "i");
    if (pattern.test(blob)) {
      // Normaliza para "bolivia" (sem acento) como forma canônica
      countriesFound.add(country.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    }
  }

  // Detecta termos explícitos.
  const termsFound = new Set<string>();
  for (const term of EXPORT_TERMS) {
    if (blob.includes(term)) {
      termsFound.add(term);
    }
  }

  const detected = countriesFound.size > 0 || termsFound.size > 0;

  if (!detected) {
    return { detected: false, countries: [], terms: [], suffix: "" };
  }

  // Sufixo determinístico injetado no RAG query — direciona busca para chunks
  // de Art. 8 LC 214/2025 (imunidade) e correlatos.
  const suffix = [
    "exportação",
    "imunidade tributária",
    "comércio exterior",
    "serviço internacional",
    "Art. 8 LC 214/2025",
    countriesFound.size > 0 ? "operação transfronteiriça" : "",
  ].filter(Boolean).join(" ");

  return {
    detected,
    countries: Array.from(countriesFound),
    terms: Array.from(termsFound),
    suffix,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
