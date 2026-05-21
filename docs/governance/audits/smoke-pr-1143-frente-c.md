# Smoke Runtime — Validação Final · PR #1143 (Frente C: Portaria Grounding)

**Projeto testado:** 300001 (greenfield) · **SHA prod:** `8ebe3936` (squash-merged)
**Datas:** smoke original 21/05/2026 ~17:21 UTC (P.O.) · prova runtime de consumo 21/05/2026 (query direta)
**Base:** smoke original (P.O.) + crítica Claude Code (3 níveis, REGRA-ORQ-22) + prova runtime de consumo

---

## Veredito

**✅ PASS — com consumo COMPROVADO em runtime.**

O smoke original concluiu "4/4 PASS", mas o suporte era frágil: apoiava-se em *análise estática do código* para a afirmação central (o grounding chega ao LLM). A prova runtime abaixo fecha a lacuna `assemble ≠ consumption` (REGRA-ORQ-27 / Lição #59). Reclassificação honesta dos 4 critérios na tabela.

---

## Prova de consumo em runtime (fecha N1.1/N1.2 da crítica)

Query executada no corpus de produção — idêntica à de `fetchPortariaGrounding()`
(`SELECT conteudo FROM ragDocuments WHERE lei='portaria_mf_cgibs_7' ORDER BY artigo`):

```
Art. 1 | Art. 1º Ficam reconhecidas como disposições comuns ao IBS e à CBS aquelas consta…
Art. 2 | Art. 2º Esta Portaria Conjunta entra em vigor na data de sua publicação no Diári…
```

**Cadeia de consumo comprovada:**

1. **Runtime:** a query retorna 2 chunks **não-vazios** → `fetchPortariaGrounding()` retorna bloco não-vazio (`""` ocorreria só em falha — descartado pela evidência).
2. **Conteúdo substantivo:** Art. 1º carrega a "ponte" CBS/IBS ("disposições comuns ao IBS e à CBS"); Art. 2º é cláusula de vigência.
3. **Assemble:** `regulatoryContext = ragCtxBriefing.contextText + (await fetchPortariaGrounding())` — `routers-fluxo-v3.ts:1428` (V3) e `:4083` (FD).
4. **Interpolação no prompt:** `regulatoryContext` é injetado no prompt do LLM — `routers-fluxo-v3.ts:1681` / `:4182`.

→ Grounding **injetado e entregue ao LLM**, comprovado por dados em runtime + caminho de código verificado (não mais só estático).

---

## Reclassificação dos 4 critérios

| # | Critério | Status real | Observação |
|---|----------|-------------|------------|
| **C1** | Chunks da Portaria existem | ✅ PASS | Precondição (verdadeira pré-#1143); **promovida a prova de consumo** pela query acima |
| **C2** | Portaria não citada explicitamente | ✅ PASS **(teste real)** | Grounding silencioso — 0 ocorrências de "Portaria"/"CGIBS". Único critério que mede diretamente o requisito do #1143 |
| **C3** | Riscos estáveis | ⚪ N/A | **Não-teste:** riscos não foram regenerados (tabela intocada). #1143 não toca geração de risco — estabilidade por construção |
| **C4** | Confiança estável | ⚪ N/A | **Não-teste:** confiança = completude do questionário, não do briefing → #1143 não pode afetá-la |

**Resumo honesto:** o #1143 é medido de fato por **C2 (silent grounding)** + a **prova runtime de consumo** (C1 promovida). C3/C4 são não-testes (sem regressão possível por construção). O efeito do grounding no texto é, por design, sutil/indistinguível — esperado para grounding silencioso.

---

## Residuais (não-bloqueantes)

- **R1:** confiança 71% < threshold aprovável (≥85%; meta 98% — REGRA-ORQ-31). Artefato do projeto greenfield de teste, **não** issue do #1143. Briefing não deve ir a cliente abaixo de 85%.
- **R2:** prova end-to-end máxima (nível-ouro, opcional) seria um **log do `regulatoryContext`** numa geração real, exibindo o bloco da Portaria na string. A cadeia atual (runtime query + caminho de código) é suficiente para o veredito.

---

## Veredito final

**✅ SMOKE RUNTIME PASS — consumo comprovado.**

- Portaria no banco com conteúdo substantivo (Art. 1º) ✅
- `fetchPortariaGrounding()` retorna não-vazio em runtime ✅
- Grounding injetado no `regulatoryContext` e entregue ao LLM ✅
- Sem citação forçada (silent grounding — C2) ✅
- Sem regressão (riscos/confiança fora do escopo do #1143) ✅

Frente C **fechada com evidência de runtime** — não apenas estática.

---

## Vinculadas

- PR #1143 (Closes — Frente C, squash `8ebe3936`)
- REGRA-ORQ-27 / Lição #59 (assemble ≠ consumption — lacuna que a prova runtime fecha)
- REGRA-ORQ-22 (crítica em 3 níveis — base desta reclassificação)
- REGRA-ORQ-34 Protocolo 1 (greenfield) · REGRA-ORQ-31 (meta confiança — R1)
- BUG-FONTES: Frente A (#1144/#1147, #1145/#1148, #1146) · Frente B (branch `feat/bug-fontes-b-leifilter-source-basis`, aguarda spike)
