# ADR-0039 — Remover ponte dual-name `hasImportExport` → `hasInternationalOps`

**Status:** Aceito · **Data:** 2026-06-26 · **Issue:** BUG-RELABEL-INTL-OPS (#1600)
**Decisão P.O.** + **parecer Dr. José** (LC 214/2025) + prova runtime (Manus).

## Contexto

O formulário "Novo Projeto" coleta **"Realiza operações de importação ou exportação?"** (`PerfilEmpresaData.hasImportExport`). O helper `align-intl-ops.ts`, atrás da flag `ENABLE_INTL_OPS_ALIGN` (=`true` em prod), derivava `taxComplexity.hasInternationalOps = hasImportExport` no `createProject` (`routers-fluxo-v3.ts:497`).

Os engines (prompt Onda 2 `:5445`, `calcularLimitePerguntas:158`, DET-004/005 `consistencyEngine.ts:172/189`, tag "internacional" `db-requirements.ts:99`) leem `hasInternationalOps`. Com a ponte ativa, o usuário que declarava import/export de **bens** fazia o LLM receber **"Operações internacionais: Sim"**.

## Decisão

**Remover a ponte** (helper `alignIntlOps` + import + chamada + flag). O `taxComplexity` passa a ser persistido como veio do form, **sem derivar** `hasInternationalOps`.

**Não** se troca os leitores nem se relabela o prompt (Componentes 1 e 2 do despacho original — barrados):
- **Mérito jurídico (Dr. José):** importação/exportação de **bens materiais** (Art. 65/81) ≠ **operações internacionais** (conceito amplo — imateriais Art. 64/80, serviços financeiros Art. 231). Conflar induz viés diagnóstico (findings sobre escopo não declarado).
- **ConsistencyGate:** coleta `hasInternationalOps` **diretamente** ("operações internacionais"). Mesmo dormente (prova runtime: `consistency_checks`=0, 0 navegações), seu input é semanticamente correto — trocar os leitores o orfanaria e mentiria sobre o conceito.

## Consequências

- `hasImportExport` (NovoProjeto) fica coletado mas **sem leitor de inferência** — correto por Dr. José. Findings próprios de import/export (Art. 65/81) = backlog.
- `hasInternationalOps` fica **sem fonte viva** (ponte morta + ConsistencyGate dormente) → leitores tornam-se dormentes/inócuos (sem input → não disparam). Limpeza = backlog (junto de `usesTaxIncentives`/`usesMarketplace`).
- ConsistencyGate dormente = candidato a dead-code sweep (backlog, estilo ADR-0034).

## Princípio

*O diagnóstico reflete o que o contribuinte declarou* (anti-alucinação / REGRA-ORQ-31). Não inferir escopo amplo a partir de sinal estreito.

## Vinculadas
REGRA-ORQ-33 (escalação jurídica Dr. José) · ADR-0034 (dead-code sweep) · Lição #59/#147 · parecer LC 214 Arts. 64/65/80/81/231.
