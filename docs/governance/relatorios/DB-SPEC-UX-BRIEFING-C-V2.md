# DB-SPEC — UX-BRIEFING-C-V2 (Redesign Split View do Briefing) · Issue #1344

**Data:** 2026-06-03 · **Autor:** Claude Code · **Status:** ANÁLISE (não implementado)
**Escopo de banco:** **ZERO migration · ZERO ALTER · ZERO DROP.** Contrato de **leitura** apenas.
**Acompanha:** `AS-IS-TO-BE-UX-BRIEFING-C-V2-20260603.md` (v5)

> Esta DB-SPEC documenta o **contrato de leitura** que o `briefingAdapter.ts` deve respeitar. Tipos confirmados por `ai-schemas.ts` (schema Zod = fonte de verdade do shape) + SQL do Manus (projeto 5700001) + Drizzle schema. Erros da 1ª proposta corrigidos (críticas N1-a..N3 aceitas).

---

## 1. Tabela `projects` — colunas consumidas (read-only, zero ALTER)

| Coluna | Tipo real (Drizzle) | Uso no redesign |
|---|---|---|
| `briefingStructured` | **TEXT (double-encoded JSON)** | **Fonte principal** — `briefingAdapter` (modo split) |
| `briefingContent` | TEXT (markdown) | **Fallback** (98% dos projetos) + tab **Método** (`<Streamdown>`) |
| `score_confianca` | `int("score_confianca")` (`drizzle/schema.ts:2009`) | **Coluna separada — NÃO é fonte do gauge.** O gauge lê `briefingStructured.confidence_score.nivel_confianca`. |

> `confiancaSnapshot` é **chave dentro do JSON** `briefingStructured`, **não** uma coluna (correção N2-a).

---

## 2. Schema JSON `briefingStructured` — tipos reais confirmados

Fonte: `BriefingStructuredSchema` (`server/ai-schemas.ts:178`) + SQL 5700001.

```
briefingStructured (TEXT, double-encoded):
├── nivel_risco_geral: string ("baixo"|"medio"|"alto"|"critico")   // ai-schemas.ts:180
├── resumo_executivo: string
├── principais_gaps: Array<{                                       // ai-schemas.ts:184
│     gap: string,                          // ← CAMPO REAL (NÃO "titulo") — N1-b
│     causa_raiz: string,
│     evidencia_regulatoria: string,
│     urgencia: "imediata"|"curto_prazo"|"medio_prazo",
│     source_type: "rag"|"cnae"|"descricao"|"solaris"|"questionario"|"iagen"|"regra_semantica",
│     source_reference: string,
│     _hallucination_detected?: boolean,    // pós-parse, FORA do Zod — ver §4
│     _hallucinated_articles?: string[]     // pós-parse, FORA do Zod
│   }>
├── oportunidades: string[]
├── recomendacoes_prioritarias: string[]    // ← NÃO "recomendacoes"
├── top_3_acoes: Array<{                     // ai-schemas.ts:225 (shape CONFIRMADO no Zod)
│     acao: string, justificativa: string, prazo: "imediato"|"curto_prazo"|"medio_prazo"
│   }>
├── inconsistencias: Array<{                 // InconsistenciaSchema (shape CONFIRMADO no Zod)
│     pergunta_origem: string, resposta_declarada: string,
│     contradicao_detectada: string, impacto: string
│   }>
├── confidence_score: {                      // ← OBJECT (NÃO number) — N1-a / BUG-F4
│     nivel_confianca: number (0-100),       // ← FONTE DO GAUGE (ai-schemas.ts:238)
│     limitacoes: string[],
│     recomendacao: string
│   }
├── dismissed_inconsistencias: string[]
├── confiancaSnapshot: { score, pilares[], geradoEm, formulaVersion, ... }  // freshness, NÃO gauge
└── approval_reservation?: {                 // opcional
      confidence_at_approval: number, threshold: number,
      predefined_reason: string, free_reason: string,
      approver_user_id: number, approver_user_name: string, approver_role: string,
      approved_at: number, answered_sources: string[], missing_sources: string[]
    }
```

**Mapa campo → componente:** `confidence_score.nivel_confianca`→DecisionPanel gauge · `nivel_risco_geral`→RiscoBadge · `principais_gaps[]`→GapCard · `gap._hallucination_detected`→badge alucinação · `top_3_acoes[]`→PriorityCards · `oportunidades[]`→OpportunityCard · `recomendacoes_prioritarias[]`→ActionsList · `resumo_executivo`→DecisionPanel · `inconsistencias[]`→AlertasInconsistencia.

---

## 3. ⚠️ Double-encoding (DP-19 / Lição #72) — OBRIGATÓRIO

```
briefingStructured é TEXT no TiDB/MySQL. O driver retorna string.
O backend já trata em routers-fluxo-v3.ts:3741:
    const parsed = typeof bs === "string" ? JSON.parse(bs) : bs;

briefingAdapter.ts DEVE seguir o MESMO padrão:
  - NUNCA JSON.parse() sobre um objeto já parseado → "[object Object]" (Lição #72)
  - Preferir consumir `structured` de getBriefingInconsistencias (já desfaz 1 nível)
```

---

## 4. ⚠️ `_hallucination_detected` / `_hallucinated_articles` — pós-parse

```
Adicionados por flagHallucinatedCitations() (validate-article-citations.ts:78)
APÓS o parse Zod, antes de JSON.stringify(structured) (routers-fluxo-v3.ts:2243).
NÃO constam no BriefingStructuredSchema (ai-schemas.ts:178) — por design.
SQL confirma: 46/93 projetos com structured contêm _hallucination_detected.
Adapter: gap._hallucination_detected ?? false (optional chaining). NÃO buscar no Zod.
```

---

## 5. Campos a confirmar (presença de DADOS, não shape) — Manus, antes do PR-2

> O **shape** já está confirmado pelo Zod (§2). Estas queries confirmam **presença/distribuição de dados** (N2-b):

```sql
SELECT JSON_EXTRACT(JSON_UNQUOTE(briefingStructured), '$.top_3_acoes') FROM projects WHERE id=5700001;
SELECT JSON_EXTRACT(JSON_UNQUOTE(briefingStructured), '$.inconsistencias') FROM projects WHERE id=5700001;
-- distribuição do fallback (caminho de 98%):
SELECT COUNT(*) total, SUM(briefingStructured IS NULL) nulls FROM projects;
```
> Lembrar do double-encoding: `JSON_EXTRACT` direto retorna NULL — usar `JSON_UNQUOTE` (ou parse no app).

---

## 6. Tabelas NÃO tocadas (zero migration nesta frente)

| Tabela | Motivo |
|---|---|
| `risks_v4` | Read-only — não consumida pelo redesign |
| `project_gaps_v3` | Read-only — não consumida pelo redesign |
| `project_briefings_v3` | **Fora do escopo** — DROP é **ADR-0034 Fase 2** (frente separada, BLOQUEADA; tem writer ativo `briefingEngine.ts:942`). **NÃO incluir DROP nesta frente** (correção N1-c). |

---

## 7. Vinculadas
Issue #1344 · `AS-IS-TO-BE-UX-BRIEFING-C-V2-20260603.md` (v5 §F3.1 contrato) · `ai-schemas.ts:178` (BriefingStructuredSchema) · `validate-article-citations.ts:78` (`_hallucination_detected`) · `routers-fluxo-v3.ts:2243/3741` (persist/parse) · `drizzle/schema.ts:2009` (`score_confianca`) · ADR-0034 Fase 2 (`project_briefings_v3` DROP — frente separada) · DP-19 · Lição #72 · REGRA-ORQ-27/34/41.
