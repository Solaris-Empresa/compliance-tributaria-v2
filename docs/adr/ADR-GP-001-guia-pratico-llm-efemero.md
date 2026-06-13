# ADR-GP-001 — Guia Prático: Modal IA Generativa efêmero no Plano de Ação
## Status: Proposto (aguarda aprovação P.O.) · 2026-06-12 · v2

> Reescrito após 3 rodadas de crítica (24/24 aceitas). Veredito ORQ-23: ciclo encerrado.
> AS-IS/TO-BE: `docs/governance/relatorios/AS-IS-TO-BE-GUIA-PRATICO-20260612.md`.

## Contexto

Tarefas do Plano de Ação (`ActionPlanPage.tsx`, rota `/projetos/:projectId/planos-v4`) são exibidas como texto puro, sem orientação de execução → abandono. Proposta: botão **"Guia Prático"** por tarefa (estado aprovado) que abre um modal com um guia gerado por LLM (read-only, efêmero, exportável em PDF).

**Classe C** (REGRA-ORQ-24): cross-cutting (backend router + frontend componentes + LLM + PDF); `ActionPlanPage.tsx` = 1350 LOC. → ADR obrigatório.

A spec original (Manus v2.0, 04/06) tinha **12 imprecisões** vs codebase real (arquivos/tabelas/campos fantasma + violações de governança), corrigidas abaixo.

## Decisão

### Arquitetura (read-only, zero persistência)
- **Sem migration · sem mutation · sem INSERT/UPDATE/DELETE.** Apenas SELECTs de contexto + chamada LLM stateless + render em memória + PDF client-side.
- **Backend:** `server/routers/guia-pratico.ts` — **`protectedProcedure.query`** + `validateProjectAccess` (NÃO `publicProcedure`). Registrado no `appRouter`.
- **Leitura de contexto:** **raw SQL** via `db-queries-risks-v4.ts` (tabelas `risks_v4`/`action_plans`/`tasks` NÃO são Drizzle). Join: `tasks.action_plan_id → action_plans.id`; risco via `risk_id`.
- **LLM:** **`invokeLLM`** (`server/_core/llm.ts:287`) · modelo **gpt-4.1** · **`temperature: 0.1`** (REGRA-ORQ-30) · `max_tokens` por nível (tabela abaixo) · `insertAuditLog` em falha (testing.md).
- **Validação:** `guiaPraticoResponseSchema` (AZ-01, `server/schemas/guia-pratico.schemas.ts`) — congelado antes do código.
- **Frontend:** `GuiaPraticoButton.tsx` (TaskRow inline em `ActionPlanPage.tsx:207`, estado aprovado) + `GuiaPraticoModal.tsx` (**shadcn `Dialog`**, não `createPortal`). AbortController via **signal nativo tRPC v11**.
- **PDF:** reusar **`generateDiagnosticoPDF.ts`** (jsPDF + autotable, já instalado). **NÃO** adicionar `html2canvas`. Carimbo data/hora obrigatório.
- **Campo "setor":** `projects.businessType` (NÃO `setorAtuacao` — inexistente) — **condicional à query de cobertura** (ver Regras).

### D-2 — Confiabilidade da feature: Opção (a) Ilustrativo Não-Vinculante

> O Guia Prático gera **conteúdo operacional livre** (fluxos, valores, sistemas) **sem fonte validada para ancorar**. Por isso **não** se aplica a barra de 99% do produto jurídico. Decisão honesta:

- **Rótulo:** "Guia orientativo/ilustrativo" — **NÃO** "tolerância zero a alucinação".
- **Restrições de conteúdo = best-effort no PROMPT** (Lição #90 — nudge ≠ garantia):
  - O prompt **instrui** evitar ISS como vigente (substituído por IBS/CBS) — vazamento residual **tolerado**.
  - O prompt **instrui** ancorar refs legais em `risks_v4.artigo` — vazamento residual **tolerado**.
  - ⚠️ Linguagem absoluta ("proibido"/"obrigatório") **proibida** para regras de prompt; reservada a código determinístico.
- **Disclaimer obrigatório e explícito**, na **tela (antes dos cards) E no PDF**: *"Este guia é orientativo e não substitui análise jurídica. Exemplos são ilustrativos. Revisão por advogado recomendada."*
- **Exemplos livres permitidos**, marcados **"(exemplo ilustrativo)"**.

### Parâmetros (Notas rodada 3)

| Detalhamento | max_tokens | Latência esperada | UX de loading |
|---|---|---|---|
| resumido | 1.500 | ~1–2s | spinner padrão |
| normal | 2.500 | ~2–4s | spinner padrão |
| detalhado | 4.000 | ~6–12s | "Gerando guia detalhado — pode levar alguns segundos…" |

(Substitui a promessa "máx ~3s" — Nota 8.) Rate limiting (Nota 5): debounce "Regerar" 2s · máx 10 chamadas/sessão · timeout invokeLLM 30s · erro "O guia demorou mais que o esperado. Tente novamente."

## Regras invioláveis

- **Zero persistência** (B-07/B-08: confirmar sem INSERT/UPDATE/DELETE e sem `.sql`).
- **`protectedProcedure` + `validateProjectAccess`** — nunca `publicProcedure`.
- **`temperature ≤ 0.1`** (REGRA-ORQ-30) · **invokeLLM** (não openai direto).
- **Disclaimer ilustrativo** presente em tela E PDF.
- **Linguagem de prompt = best-effort**, nunca rotulada como garantia.
- **businessType:** se `taxa_pct (status='aprovado') < 70%` → **fallback gracioso obrigatório** (banner não exibe campo em branco). Critério fechado pela query (Manus).

## Lei do produto (esta feature)

```
Erro aceitável:    guia ilustrativo com exemplo genérico (marcado, sob disclaimer)
Erro inaceitável:  apresentar como parecer vinculante · publicProcedure · persistir dado
```

## Triade ORQ-28 (obrigatória — Classe C)

| Artefato | Conteúdo | Estado |
|---|---|---|
| **AZ-01** | `guia-pratico.schemas.ts` congelado | PR `feat/schema-guia-pratico` (pré-req de A2/A3) |
| **A1** | Issue 8 seções | P.O. abre após este ADR aprovado |
| **A2** | test-contracts skeleton | após merge AZ-01 — cobre **só determinístico** |
| **A3** | CI gate | após merge AZ-01 (paralelo a A2) |

**Escopo A2 (anti-teatro):** ✅ Zod válido/inválido · fallback UI quando `Zod.parse` falha · auth gate · query/join · montagem do prompt (assemble). ❌ NÃO testa "LLM não retorna ISS" nem qualidade de conteúdo (não-determinístico).

## Plano de implementação (split PR)

- **PR-1 — Backend** (B-01→B-08). Inclui artefato legível p/ P.O.: `docs/prompts/GUIA-PRATICO-PROMPT-EXEMPLO.md` (System + User prompt renderizado com dados fictícios). **Critério de merge:** CI verde + Vitest determinístico passando + mock `invokeLLM` com resposta contendo "ISS" → Zod valida estrutura (smoke de **assemble**, não garantia de conteúdo) + **OK P.O. explícito**.
- **PR-2 — Frontend** (F-01→F-14). Só abre **após OK P.O. no PR-1**. Canônico = HTML/spec (seletores Resumido/Normal/Detalhado + Simples/Normal/Especialista + textarea 0/500).

## Critério de aceite

- [ ] Determinístico (A2): schema, fallback, auth, join, assembly — Vitest verde.
- [ ] **Smoke de qualidade pós-merge** (Nota 7, estilo FASE 6 do PDF-1): amostra de N projetos reais — verificar refs/ISS/coerência. **Gate de liberação**, não aspiração.
- [ ] Disclaimer visível em tela e PDF.
- [ ] businessType: taxa ≥70% (ou fallback implementado).
- [ ] Zero persistência confirmada (B-07/B-08).

## Gating de F0

Implementação (B-01→F-14) **só inicia** após: **este ADR aprovado P.O.** + **query businessType** (≥70% ou fallback definido) + **issue formal** + **OK P.O. explícito**.

## Vinculadas

- REGRA-ORQ-24 (Classe C) · ORQ-27 (assemble≠consumption) · ORQ-28 (Triade) · ORQ-30 (temp ≤0.1) · ORQ-41 (AS-IS/TO-BE)
- Lição #59 · #66 · #87 · **#90** (nudge ≠ garantia) · ADR-010 (content architecture 98%) · ANTI-HAL-1 (#1386)
- AZ-01: `server/schemas/guia-pratico.schemas.ts` · AS-IS/TO-BE: `relatorios/AS-IS-TO-BE-GUIA-PRATICO-20260612.md`
