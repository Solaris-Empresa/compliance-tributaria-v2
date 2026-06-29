# Análise — Investigação CR-02 do Manus (retrieval vs geração)

> **Objeto:** `INVESTIGACAO-CR-02-CNAEGROUPS.md` (Manus, read-only DB, 2026-06-29).
> **Método:** leitura da evidência de banco do Manus + verificação de código `arquivo:linha`. **Sem veredito jurídico.** Issue #1607.
> **Veredito:** a investigação **confirma** que `cnaeGroups` é campo de **retrieval** e **corrige** o registro (a LC 214 nunca esteve vazia). O CR-02 fica **duplamente refutado**. O fix do Decreto é **higiene de grounding**, não geração.

---

## 1. O que a investigação confirma (convergência)

| Achado do Manus | Bate com |
|---|---|
| `cnaeGroups` é lido por `rag-retriever.ts:134` (Caller A) e `:364` `fetchSetorialCandidates` (Caller B) | minha v2 — campo de **retrieval/grounding**, não de geração |
| `belongsToUniversalPool` (`:314`): `cnaeGroups` vazio = pool universal (recuperado p/ qualquer CNAE) | mecanismo de **recuperação** |
| H2 (coluna trocada) e H3 (runtime≠tabela) **descartadas** | — |

→ A investigação **não toca** o motor de geração (`normative-inference.ts`), porque `cnaeGroups` não o alimenta. Confirmado.

## 2. Correção factual do registro (o "vazio para todos" era falso — H1 snapshot divergente)

A evidência literal de banco do Manus mostra o **estado real**:

| Diploma | `cnaeGroups` | Constatação |
|---|---|---|
| **LC 214 Arts. 252–270** (principais) | **`41,42,43,68`** ✅ | **JÁ marcado para construção** — nunca esteve vazio |
| LC 214 Art. 252/255p2/258p2-3/262 | `64,65,66` (financeiro) | tag setorial divergente — gate Dr. José |
| LC 214 Art. 264/266/267/268 | multi-setorial / manufatura | disposição geral — gate Dr. José |
| **Decreto 12.955 Arts. 360–372** (18 chunks) | **`` (vazio)** | **gap real, mas restrito ao Decreto** |
| **Res. CGIBS 6** (maioria) | `01,02,03,10,11,12,23,46,47` (agro/alimentos) | **mis-tag de ingestão** — gate Dr. José |

→ A premissa do CR-02 (DOC3: *"cnaeGroups='' em todos os artigos dos 3 diplomas"*) era **incorreta** (generalização de uma query que só olhou o Decreto). A LC 214 — o diploma principal dos 13 riscos — **já está corretamente marcada**.

## 3. Consequência: CR-02 duplamente refutado

1. **cnaeGroups não gera risco** (alimenta retrieval — minha v2, confirmado pelos Callers A/B do Manus).
2. **A LC 214 nem estava vazia** (já tem `41,42,43,68`) — então o retrieval setorial da LC 214 **já funciona** para CNAE 41.

→ Logo, popular `cnaeGroups` **não é** o que faz os 13 riscos aparecerem. O gargalo da **matriz** permanece o **GAP-3** (regras no engine v4 ativo) — ver `CRITICA-QUADRO-EVIDENCIAS-FLUXO-ATIVO-20260629.md`.

## 4. O fix do Decreto é legítimo — mas como **higiene de grounding**, não geração

O gap real (Decreto 12.955 Arts. 360–372 com `cnaeGroups=''` → pool universal) **vale corrigir**: hoje esses chunks são
recuperados para **qualquer** CNAE, diluindo a precisão setorial. Marcá-los `41,42,43,68` melhora a **precisão do retrieval/grounding**.

**Enquadramento honesto (anti assemble≠consumption):** este UPDATE muda **qual artigo é recuperado para fundamentar o
briefing**, **não** o número de riscos gerados na matriz. **Não deve ser vendido como "faz os 13 riscos aparecerem"** —
isso repetiria o erro do DOC3. A prova definitiva é o **before/after de `risks_v4` count** (DM-1, ainda pendente).

## 5. Orientação de decisão

| Item | Recomendação | Quem decide |
|---|---|---|
| **UPDATE Decreto 12.955** Arts. 360–372 (`''`→`41,42,43,68`, 18 chunks, só preenche vazios) | ✅ Aprovável como **higiene de grounding** — baixo risco (não sobrescreve valores). Enquadrar como retrieval, não geração | **P.O.** |
| **CGIBS 6 mis-tag agro** (`01,02,03,...`→construção, ~30 chunks) | ⚠️ É sobrescrever valor existente → **gate jurídico Dr. José** ([[Lição #133]]) antes | Dr. José + P.O. |
| **LC 214 tags divergentes** (252/262=`64,65,66`; 266=manufatura) | ⚠️ Curadoria — **não mecânico** | Dr. José |
| **GAP-Q4** (sem teste de roteamento setorial em banco real) | tech debt válido — criar teste de persistência `fetchSetorialCandidates`(CNAE 41)→Arts. construção | backlog |
| **DM-1 before/after** (count `risks_v4` antes/depois do UPDATE) | **ainda pendente** — é a prova de que o UPDATE não muda geração | Manus |

## 6. Estado das pendências (atualizado)

| ID | Antes | Agora |
|---|---|---|
| DM-1 (cnaeGroups gera ou só grounding?) | aberto | **quase fechado** — investigação mostra LC 214 já tagueada e riscos não aparecem → cnaeGroups nunca foi o bloqueio; falta só o before/after no Decreto p/ selar |
| DM-2 (permuta = Art. 252, não 259) | aberto | mantido (DOC1/QUADRO ainda erram) |
| DM-3 (DOC1 retrieval vs curadoria) | aberto | corroborado — tags da CGIBS (agro) e do Decreto inconsistentes = ingestão/retrieval, não curadoria |
| DM-7 / GAP-3 (regras v4) | **lever único** | inalterado — o caminho de geração |

## Vinculadas

- `INVESTIGACAO-CR-02-CNAEGROUPS.md` (Manus) · `CRUZAMENTO-CONSTRUCAO-CIVIL-RISCOS-LEI-EVIDENCIA-20260629.md` (v2) · `CRITICA-QUADRO-EVIDENCIAS-FLUXO-ATIVO-20260629.md` · `DESPACHO-MANUS-1607-CRUZAMENTO-CR02-20260629.md`
- REGRA-ORQ-27 (assemble≠consumption) · [[Lição #59]] · [[Lição #93]] · [[Lição #133]] (cnaeGroups = camada interpretativa, gate jurídico) · [[Lição #134]] (retrieval ≠ curadoria)
- Código: `rag-retriever.ts:134/314/364` (consumo retrieval) · `normative-inference.ts` (geração — não lê cnaeGroups)
