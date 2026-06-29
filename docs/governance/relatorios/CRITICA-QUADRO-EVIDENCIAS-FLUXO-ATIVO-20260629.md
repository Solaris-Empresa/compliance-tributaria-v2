# Crítica determinística — QUADRO-EVIDENCIAS-DR-JOSE (Manus) × fluxo ativo

> **Objeto:** `QUADRO-EVIDENCIAS-DR-JOSE.md` (Manus, branch `docs/quadro-evidencias-dr-jose`, 2026-06-29).
> **Método:** verificação de código `arquivo:linha` em `main` (REGRA-ORQ-41 · Lição #93 · #147). **Sem veredito jurídico.**
> **Veredito técnico:** o QUADRO **converge** comigo no lever real (GAP-3), mas **erra a premissa de fluxo** — GAP-1 mira **dead code** e GAP-2 não afeta a geração da matriz. Issue #1607.

---

## 1. Convergência (onde o Manus acertou e evoluiu)

| Tema | DOC3 (antes) | QUADRO (agora) | Minha v2 | Situação |
|---|---|---|---|---|
| Causa via `cnaeGroups=''` | era a causa-raiz (CR-02) | **abandonada** | refutada (grounding, não geração) | ✅ convergiu |
| Engine v4 tem poucas regras de imóveis | — | **GAP-3** (2 de 13) | "faltam ramos de inferência" | ✅ **mesmo lever** |
| Dataset/corpus é o gargalo | — | "dataset não é o problema" | idem | ✅ convergiu |

O **GAP-3 do QUADRO é o diagnóstico correto** e coincide com a "camada setorial / ramos de inferência" da minha v2.

---

## 2. Erro estrutural do QUADRO — premissa de "Fluxo A" (dead code)

O QUADRO afirma (§1.1): *"Os 13 riscos do Dr. José pertencem ao **Fluxo A — Matriz Legada** (`generateRiskMatrices`, LLM)"*.
**Isso é factualmente incorreto:** o `generateRiskMatrices` está **desativado desde a Sprint Z-12 (ADR-0022)**.

| Afirmação do QUADRO | Verificação em código (`main`) | Veredito |
|---|---|---|
| GAP-1: corrigir RAG em `generateRiskMatrices` (`routers-fluxo-v3.ts:3118`) | `routers-fluxo-v3.ts:3047` — `throw new TRPCError({code:"METHOD_NOT_SUPPORTED", ...[Z-12] Endpoint legado desativado})` **incondicional**, antes de qualquer lógica. A linha 3118 está **dentro do bloco comentado** `/* LEGADO PRESERVADO PARA ROLLBACK */` | ❌ **GAP-1 mira dead code** — a query RAG citada **nunca executa** |
| GAP-2: expandir `buildRegimeImoveisRestriction` p/ o briefing alimentar `generateRiskMatrices` | `buildRegimeImoveisRestriction` é chamado em **`generateBriefing`** (`routers-fluxo-v3.ts:1923`, procedure 1615) — alimenta o **texto do briefing**. Mas o **engine v4 NÃO lê o briefing** (`normative-inference.ts` grep `briefing` = vazio) | ⚠️ **GAP-2 melhora a narrativa do briefing, não a geração da matriz** |
| Fluxo ativo da matriz | `BriefingV3.tsx:461/489` → `setLocation('/risk-dashboard-v4')`. A matriz do Dr. José = **engine v4 determinístico** (`risks_v4`), não `generateRiskMatrices` | ✅ **É Fluxo B**, não A |

**Consequência:** o próprio QUADRO se contradiz — a evidência do GAP-3 cita `risks_v4` (Fluxo B, v4), mas o enquadramento §1.1 atribui os riscos ao Fluxo A (LLM desativado). A matriz que o Dr. José avaliou é a do **engine v4**; portanto **só o GAP-3 atua no fluxo que roda**.

---

## 3. Convergência das 3 iterações de diagnóstico (o lever único que sobrevive à verificação)

| Iteração Manus | Causa proposta | Verificação de código | Sobrevive? |
|---|---|---|---|
| Parecer/Despacho (3 lacunas) | link Q.CNAE + motor resposta→risco + requisitos | cadeia requisito→gap→risco real, mas é o caminho de **gaps**, não o engine determinístico | parcial |
| DOC3 (CR-02) | `cnaeGroups=''` nos artigos | `cnaeGroups` alimenta **retrieval** (`rag-retriever.ts:134`), não geração (`normative-inference` não lê) | ❌ |
| QUADRO (GAP-1/2/3) | RAG query + briefing + regras v4 | GAP-1 = dead code; GAP-2 = não afeta matriz; **GAP-3 = regras v4** | **só GAP-3** |

> **Lever único, code-verified:** implementar as ~11 regras de imóveis faltantes no **engine v4 ATIVO**
> (`normative-inference.ts`, hoje com 3 gates: `isRegimeImoveisOportunidade/Locacao/Risco`, linhas 232/241/250),
> OU a cadeia **requisito→gap→risco** (Content Engine Rule #3). Tudo o mais (cnaeGroups, RAG query no
> `generateRiskMatrices`, briefing) é grounding/narrativa ou dead code — **não gera risco na matriz**.

---

## 4. Erro de citação que persiste (DM-2)

O QUADRO mantém (Seção 3 e §53): **#4 permuta → "Art. 259 LC 214"**. O Art. 259 (verificado na fonte primária,
`Lcp 214.pdf`) é **redutor social** (*"...redutor social no valor de R$ 100.000..."*). A permuta é **Art. 252 §2º**
(*"não incidem... permuta... exceto sobre a torna"*). Corrigir antes de virar nome de regra (`risco_permuta_imoveis`).

---

## 5. Direção corrigida para o Manus (atualiza o despacho CR-02)

| ID | Item | Status |
|---|---|---|
| **DM-5** | **Reenquadrar o QUADRO:** os 13 riscos são avaliados no **Fluxo B (engine v4 / `risks_v4` / `/risk-dashboard-v4`)**. **Descartar GAP-1** (mira `generateRiskMatrices`, desativado ADR-0022). | novo |
| **DM-6** | **GAP-2 = melhoria de narrativa do briefing** (válida para o texto que o Dr. José lê), **não** mecanismo de geração da matriz (v4 não lê briefing). Não contar como cobertura de risco. | novo |
| **DM-7** | **GAP-3 é o lever:** especificar as ~11 regras determinísticas em `normative-inference.ts` — **cada uma exige gate de elegibilidade** (perfil/CNAE/resposta) para **não** gerar falso-positivo para toda construtora (vários riscos dependem de fato do negócio: faz permuta? tem SPE? recebe parcelado?). Casar com `SEVERITY_TABLE`/`Categoria` (Lição #88). **Curadoria jurídica (Dr. José) + aprovação P.O.** | substitui DM-4 |
| DM-2 | Corrigir permuta → **Art. 252 §2º** (não 259) | mantido |
| DM-1 | (cnaeGroups) — **encerrado:** QUADRO já abandonou o CR-02; cnaeGroups fica como melhoria de **grounding**, não geração | resolvido |

## Vinculadas

- `QUADRO-EVIDENCIAS-DR-JOSE.md` (Manus) · `CRUZAMENTO-CONSTRUCAO-CIVIL-RISCOS-LEI-EVIDENCIA-20260629.md` (v2) · `DESPACHO-MANUS-1607-CRUZAMENTO-CR02-20260629.md` · `AS-IS-TO-BE-CONSTRUCAO-CIVIL-RISCOS-SETORIAIS-20260628.md`
- **ADR-0022** (hot swap — `generateRiskMatrices` desativado) · REGRA-ORQ-27 (assemble≠consumption) · [[Lição #59]] · [[Lição #93]] · [[Lição #147]] (achar código ≠ confirmar que roda) · [[Lição #88]] (acoplamento engine/seed) · [[Lição #133]] (gate jurídico)
- Código: `routers-fluxo-v3.ts:3047` (throw) · `:1923` (briefing) · `normative-inference.ts:232/241/250` · `BriefingV3.tsx:461/489` (rota ativa)
