# Tracing CONSOLIDADO — Projeto 5370032 (Manus + Claude Code)

**Data:** 2026-06-02 · **HEAD main:** `bc7aba9a` · **Projeto:** 5370032 (Milho, CNAE 4623-1/99 agro, lucro_presumido)
**Auditoria runtime Manus:** 2026-06-02 03:15 UTC (`Auditoria de Rastreabilidade — Projeto 5370032.md`)
**Tracing código Claude Code:** v1 `TRACING-SOLARIS-5370032-20260602.md` (revisado aqui — diagnóstico parcial corrigido)

---

## 0. Convergência final + Errata do meu diagnóstico v1

### ✅ Sprint 3 (PR #1332) validada empiricamente em runtime

| Verificação | Resultado | Evidência Manus |
|---|---|---|
| `solaris_answers` populada | ✅ 12 respostas | M-2 confirmado |
| `classifyForGap` dual-column | ✅ 8/12 opcao-based + 4/12 fallback texto | PR #1321 funcional |
| `project_gaps_v3.question_id` real (FIX-VIS-U4) | ✅ IDs 1620036-1620046 (não literal 0) | M-3 confirmado |
| `project_gaps_v3.answer_value` canônico (FIX-VIS-U6) | ✅ `'nao'`, `'nao_sei'` (não `'não'` literal) | M-3 confirmado |
| `briefingStructured` com `source_type="solaris"` (FIX-VIS-U3) | ✅ Gap 4 = `source_reference: "SOL-048"` | M-4 confirmado |
| `briefingContent` cita SOLARIS no markdown | ✅ "Fonte: solaris · SOL-048" | M-4 confirmado |
| Audit log `source_coverage.breakdown.solaris` > 0 | ✅ `solaris: 1` (5 gaps no total) | observabilidade Sprint 3 |
| Gerado pós-PR #1332 (timestamp > deploy) | ✅ 02:56:56Z briefing > 02:38:55Z merge | confirmado |

**Pipeline SOLARIS → Briefing: 100% funcional.** Sprint 3 entrega o que prometeu.

### ❌ Erro do meu diagnóstico v1 (Lição #93 aplicada — refutação técnica)

No `TRACING-SOLARIS-5370032-20260602.md` (v1, sem dados runtime) apontei como causa raiz:
- **B1** `risk-categorizer.ts:89-99` — keyword "agro" → categoria `regime_diferenciado` (genérica)
- **B2** `rag-risk-validator.ts:61` — query RAG `"regime diferenciado"` nua → Art. 204 (consórcio)

**Manus refutou via leitura do código real (`risk-engine-v4.ts:412-421` + `rag-risk-validator.ts:98-119`).** Validei: Manus está correto.

A causa raiz não é o categorizer nem a query — é **`formatArticleRange` + `articleMatches` em conjunto**.

**B1 e B2 podem ser contribuintes adjacentes, mas não são a causa raiz reportada.** Errata registrada conforme Lição #93 ("mecanismo verificado, não inferido").

---

## 1. Causa raiz confirmada — Range expansion em validator

### 1.1 Cadeia exata (validada por Read em código)

```
risk_categories.normative_bundle.artigos_decreto = ["Art. 200", "Art. 201", "Art. 203", "Art. 245"]
                                                          ↓
formatArticleRange (risk-engine-v4.ts:412-421):
   const nums = ["200","201","203","245"].map(parseInt).sort() = [200,201,203,245]
   if (nums.length === 1) return "Art. N LEI"
   return `Arts. ${nums[0]}-${nums[last]} ${lei}`     ← COLLAPSE PARA RANGE CONTÍNUO
                                                          ↓
"Arts. 200-245 Decreto 12.955/2026"                   ← span de 46 artigos (DISTORÇÃO)
                                                          ↓
enrichArticle (risk-engine-v4.ts:429-448):
   parts = ["Art. 126 LC 214/2025", "Arts. 200-245 Decreto 12.955/2026", ...]
   return parts.join("; ")                            ← gravado em risks_v4.artigo
                                                          ↓
RAG query "regime diferenciado" → 50 hits
   Inclui: Art. 204 LC 214/2025 (administração de consórcio — fala "regime diferenciado")
                                                          ↓
selectBestArtigo (rag-risk-validator.ts:129-...):
   docs.filter(d => articleMatches(d.artigo, principalArtigo))
                                                          ↓
articleMatches (rag-risk-validator.ts:98-119):
   const rangeMatch = riskN.match(/arts?\.\s*(\d+)\s*-\s*(\d+)/)
   if (rangeMatch) {
     const start = 200; const end = 245;
     const chunkNum = "art. 204" → 204;
     return 204 >= 200 && 204 <= 245;                 ← TRUE (falso positivo)
   }
                                                          ↓
Art. 204 (consórcio) aceito como match válido para regime_diferenciado agro
                                                          ↓
rag_artigo_exato = "Art. 204"
rag_trecho_legal = "Art. 204. Na administração de consórcio..."
   ↑ INCONSISTÊNCIA SEMÂNTICA (consórcio vs agronegocio)
```

### 1.2 Por que existe e quando começou

- **Origem:** Issue #1044 (P.O. 2026-05-09) "Opção B" para `rag_artigo_exato` — `articleMatches` adicionou suporte a **ranges no risk.artigo** assumindo que ranges representariam intervalos consecutivos reais (ex: "Arts. 6-12" quando todos 6,7,8,9,10,11,12 estavam no bundle).
- **Acoplamento implícito:** `formatArticleRange` sempre formata como range MIN-MAX (`risk-engine-v4.ts:420`), mesmo quando o conjunto é discreto. `articleMatches` não tem como saber se o range é "real" ou "artificial".
- **Cobertura de teste:** `rag-risk-validator-artigo-principal.test.ts` testa ranges consecutivos ("Arts. 6-12" inclui Art. 9) — não testa o cenário "conjunto discreto colapsado em range".

### 1.3 Cobertura do bug

| Categoria com `normative_bundle.artigos_decreto` não-consecutivo | Afetada? |
|---|---|
| `regime_diferenciado` (bundle exemplo `[200, 201, 203, 245]`) | ✅ Sim |
| Qualquer categoria onde curador jurídico selecionou artigos esparsos | ✅ Sim |
| Categorias com artigos consecutivos reais (ex: Arts. 6-12 contíguos) | ❌ Não — range é semanticamente correto |

**Estimativa:** depende de quantas linhas em `risk_categories` têm `artigos_decreto` discretos. Manus pode confirmar via:

```sql
SELECT codigo,
       JSON_LENGTH(JSON_EXTRACT(normative_bundle, '$.artigos_decreto')) AS qtd,
       JSON_EXTRACT(normative_bundle, '$.artigos_decreto') AS lista
FROM risk_categories
WHERE JSON_LENGTH(JSON_EXTRACT(normative_bundle, '$.artigos_decreto')) >= 2;
```

---

## 2. As 3 opções de fix do Manus + minha análise

### Opção A — `formatArticleRange` lista individualmente quando não-consecutivo

```typescript
function formatArticleRange(artigos, lei) {
  if (!artigos?.length) return "";
  const nums = ...sort();
  if (nums.length === 1) return `Art. ${nums[0]} ${lei}`;
  const isConsecutive = nums.every((n, i) => i === 0 || n === nums[i-1] + 1);
  if (isConsecutive) return `Arts. ${nums[0]}-${nums[nums.length - 1]} ${lei}`;
  return `Arts. ${nums.join(", ")} ${lei}`;  // ← "Arts. 200, 201, 203, 245 Decreto"
}
```

**Pros:**
- Cirúrgica — 5 LOC em 1 função
- Não toca `articleMatches`
- Sem regressão para ranges consecutivos reais (que continuam compactos)

**Cons:**
- Output string pode ficar verboso se bundle tem muitos artigos discretos (ex: 12 artigos esparsos → "Arts. 5, 17, 23, 31, 45, 52, 67, 78, 91, 108, 119, 134 Decreto")
- `articleMatches` precisa adicionar suporte a "lista por vírgulas" senão **outro falso negativo** apareceria (chunk Art. 31 vs riskArtigo "Arts. 5, 17, 23, 31...")

**Veredito Claude Code:** **incompleta** — Opção A sem ajuste em `articleMatches` quebra o match para casos válidos. Manus precisa adicionar parsing de vírgula no `articleMatches`.

### Opção B — `articleMatches` valida contra lista discreta

Refatorar `selectBestArtigo` para receber `artigos_decreto: string[]` em vez de string range compactada.

```typescript
export function selectBestArtigo(
  docs: Array<{ artigo, conteudo }>,
  principalArtigo: string,
  bundleArtigos?: { decreto?: number[], cgibs6?: number[], portaria7?: number[] }  // ← novo
) {
  const matching = docs.filter((d) => {
    if (articleMatches(d.artigo, principalArtigo)) return true;
    // Validar contra lista discreta do bundle (não range)
    if (bundleArtigos) {
      const chunkNum = parseInt(d.artigo.replace(/\D/g, ""), 10);
      return bundleArtigos.decreto?.includes(chunkNum) ||
             bundleArtigos.cgibs6?.includes(chunkNum) ||
             bundleArtigos.portaria7?.includes(chunkNum);
    }
    return false;
  });
  ...
}
```

**Pros:**
- Corrige causa raiz na camada certa (validator)
- Range continua compacto na string `risks_v4.artigo` (UI/PDF/output)
- Validação semanticamente correta — chunk só é aceito se ESTÁ no bundle curado

**Cons:**
- Refactor — muda assinatura pública de `selectBestArtigo` e `validateRiskArtigos` (caller)
- 4-6 arquivos tocados (engine + validator + callers + tests)
- ~30-50 LOC + atualização de test contracts

**Veredito Claude Code:** **mais robusta** — corrige a semântica sem afetar visualização. Custo médio.

### Opção C — `articleMatches` split por `;` + validar segmento

```typescript
export function articleMatches(chunkArtigo, riskArtigo) {
  const chunkN = normalizeArtigo(chunkArtigo);
  // riskArtigo pode ser "Art. 126 LC 214/2025; Arts. 200-245 Decreto 12.955/2026"
  const segments = riskArtigo.split(";").map(s => s.trim());
  return segments.some(seg => articleMatchesSingleSegment(chunkN, normalizeArtigo(seg)));
}
```

**Pros:**
- 5 LOC, refatoração mínima
- Mantém range string como output

**Cons:**
- **Não resolve o falso positivo dentro de um único segmento!** Bundle `[200, 201, 203]` → `"Arts. 200-203"` → Art. 202 (que NÃO está no bundle) ainda match.
- Apenas previne cross-segment leak (LC 214 chunks aceitos para range Decreto 12.955 vice-versa) — mas isso não é o bug reportado.

**Veredito Claude Code:** **não corrige o bug reportado.** Resolve um caso teórico (cross-segment) que não está em jogo no 5370032.

### Opção D — minha sugestão híbrida (A+B fundidas)

```typescript
// risk-engine-v4.ts:412 — Opção A (detecta consecutividade)
function formatArticleRange(artigos, lei) {
  // ... mesmo da Opção A ...
  if (isConsecutive) return `Arts. ${first}-${last} ${lei}`;
  return `Arts. ${nums.join(", ")} ${lei}`;
}

// rag-risk-validator.ts:98 — articleMatches adiciona suporte a lista por vírgulas
export function articleMatches(chunkArtigo, riskArtigo) {
  const chunkN = normalizeArtigo(chunkArtigo);
  const riskN = normalizeArtigo(riskArtigo);
  if (chunkN === riskN) return true;

  // Caso range "arts. 6-12" (preserva — usado por bundles consecutivos)
  const rangeMatch = riskN.match(/arts?\.\s*(\d+)\s*-\s*(\d+)/);
  if (rangeMatch) {
    const [_, s, e] = rangeMatch;
    const chunkNum = chunkN.match(/art\.?\s*(\d+)/)?.[1];
    if (chunkNum) {
      const n = +chunkNum;
      return n >= +s && n <= +e;
    }
  }

  // NOVO: lista por vírgulas "arts. 200, 201, 203, 245"
  const listMatch = riskN.match(/arts?\.\s*([\d,\s]+)/);
  if (listMatch) {
    const list = listMatch[1].split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    const chunkNum = chunkN.match(/art\.?\s*(\d+)/)?.[1];
    if (chunkNum && list.length > 1) {  // pelo menos 2 itens para não confundir com Art. único
      return list.includes(+chunkNum);
    }
  }

  return false;
}
```

**Pros:**
- Combina cirurgia da A com semântica correta da B
- Sem refactor de assinatura — preserva contrato de `selectBestArtigo`
- 1 lugar para teste de consecutividade (formatArticleRange) + 1 caso novo em articleMatches
- Compatibilidade: ranges consecutivos continuam compactos

**Cons:**
- 2 arquivos tocados (risk-engine-v4 + rag-risk-validator) em vez de 1
- Output verboso se bundle tem ~20 artigos discretos (improvável segundo Manus)

**LOC estimado:** ~15 produção + ~10 testes

---

## 3. Sobre o "erro" reportado pelo P.O.

### Achado Manus A3 — risks_v4 está VAZIO para 5370032

```
SELECT COUNT(*) FROM risks_v4 WHERE project_id = 5370032; → 0 rows
```

**Conclusão:** o snippet inicial enviado pelo P.O. (com Art. 204, `trigger_type=auto_generation`) **NÃO é deste projeto** — provavelmente de outro projeto agro ou de uma tentativa anterior que foi descartada.

**Estado real do 5370032:** matriz não gerada porque auto-trigger só dispara quando o usuário navega para `RiskDashboardV4` (`useEffect` em :1072).

**Recomendação Manus:** P.O. navegar para a página de matriz na UI para disparar geração. **MAS:** se Opção A/B/D não estiverem mergeadas, o bug do range vai se manifestar de novo.

---

## 4. Recomendação Claude Code consolidada

### Para o P.O. decidir

| Pergunta | Recomendação |
|---|---|
| Qual opção de fix? | **Opção D** (híbrida A+B) — combina cirurgia com semântica correta sem refactor de assinatura |
| Quando gerar matriz 5370032? | **Após fix mergeado** — gerar agora reproduz o bug e gera Art. 204 no banco |
| Backfill necessário? | Sim, para projetos pré-existentes com `regime_diferenciado` que já passaram pela matriz. Manus pode listar via query em `risks_v4` |
| Issue a abrir? | **BUG-RAG-ARTIGO-RANGE** — escopo cirúrgico, ~15 LOC, Classe A |

### Honestidade sobre minha contribuição

- ✅ Tracing código do fluxo SOLARIS → matriz → plano (Seção 1 v1) correto
- ✅ Decodificação do snippet CSV/JSON (`trigger_type=auto_generation`) correto
- ❌ Causa raiz (B1+B2 em v1) incorreta — Manus identificou a correta via leitura de `formatArticleRange` + `articleMatches`
- ❌ Não pedi ao Manus query empírica do `risk_categories.normative_bundle` (que confirmaria o bundle discreto)
- ✅ Conformidade Lição #93 ("mecanismo verificado, não inferido") aplicada agora via re-leitura do código com hipótese Manus

**Manus tem visibilidade do banco que eu não tenho. Minha contribuição foi mapear o código; Manus mapeou os dados. Convergência produz diagnóstico completo.**

---

## 5. Vinculadas

- **PR #1332** (Sprint 3) — funcional, sem regressão; pipeline SOLARIS validado em runtime
- **Issue #1044 Opção B** — origem do `articleMatches` com range expansion (intenção original era ranges consecutivos reais)
- **Auditoria Manus 5370032** — `0-Questionarios/0-Solarios--1a.ONDA/Auditoria de Rastreabilidade — Projeto 5370032.md`
- **Tracing Claude Code v1** — `TRACING-SOLARIS-5370032-20260602.md` (parcial — Seção 0 errata acima)
- **Lição #93** (mecanismo verificado, não inferido) — meu diagnóstico v1 foi inferência sem leitura completa; refutado por Manus com leitura literal
- **REGRA-ORQ-22** (crítica 3 níveis) — Nível 1 bloqueante: diagnóstico v1 estava incorreto, precisa amendment
- **REGRA-ORQ-27** (assemble ≠ consumption) — confirmado: `articleMatches` consome range string SEM verificar se range representa consenso semântico
- **REGRA-ORQ-34** Protocolo 4 (3 cenários ortogonais) — fix precisa testar: (a) range consecutivo real, (b) conjunto discreto, (c) cross-segment

🤖 Tracing Claude Code v2 (consolidado com runtime Manus)
