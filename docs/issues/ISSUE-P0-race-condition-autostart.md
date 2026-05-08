# P0 — Race condition no auto-start: CNAEs ≠ currentCnaeIdx exibem state vazio

**Severidade:** P0 — Bloqueia UX em projetos com 2+ CNAEs
**Status:** Backlog — issue separada de Issue #1028 (fonte única regulatório)
**Data:** 2026-05-08
**Origem:** Diagnóstico empírico Manus durante validação FASE 1 da Issue #1028

---

## Sintoma observável

Em projetos com múltiplos CNAEs, ao usuário navegar para CNAEs ≠ primeiro:
- Tela exibe `"0/0 respondidas"` mesmo quando o cache do banco contém perguntas
- Botão "Concluir Nível 1" habilitado com 0 perguntas (bypass residual)
- Nenhum CnaeGapBanner ou mensagem informativa exibida

**Evidência empírica:**

🔴 Empírico (Manus 2026-05-08, projeto 4800002):
- 3 CNAEs cadastrados: 4930-2/03, 4681-8/01, 8299-7/99
- DB `questionnaireQuestionsCache` tem 34 perguntas para CADA um dos 3 CNAEs
- UI exibe 34 perguntas para CNAE 1 (4930-2/03 — `currentCnaeIdx=0`)
- UI exibe **0 perguntas** para CNAEs 2 e 3 (mesmo com cache populado)

PDF de evidência: `Questionarios/3-CNAES/cnae2-frete.pdf`

## Causa raiz

`client/src/pages/QuestionarioV3.tsx` na FASE 1 (PR #1029):

### 1. Auto-start dispara N loadQuestions paralelos

```typescript
useEffect(() => {
  if (cnaes.length > 0 && !autoStarted && !isViewMode && startedCnaes.size === 0 && savedAnswersReady) {
    setAutoStarted(true);
    cnaes.forEach((cnae) => {
      handleStartCnae(cnae.code);  // ← N CNAEs em paralelo
    });
  }
}, [cnaes, autoStarted, isViewMode, savedAnswersReady]);
```

### 2. Cada `loadQuestions` limpa e popula state ÚNICO

```typescript
const loadQuestions = useCallback(async (cnaeIdx, level, ...) => {
  // ...
  setAnswers({});
  setQuestions([]);  // ← LIMPA state global
  // ...
  const result = await generateQuestions.mutateAsync({...});  // ~40s LLM
  // ...
  setQuestions(qs);  // ← POPULA state global (sobrescreve outros CNAEs)
  saveQuestionsCacheMutation.mutate({...});  // ← cache DB OK
}, [...]);
```

### 3. State `questions` é único — última escrita vence

3 chamadas paralelas de `loadQuestions` produzem 3 `setQuestions(qs)`. React state final guarda apenas o último a resolver. Cache DB **independente** — populado para 3 CNAEs corretamente.

### 4. `loadedQuestionsRef` impede recarga ao navegar

```typescript
useEffect(() => {
  // ... linha 534-545
  if (startedCnaes.has(currentCode) && !loadedQuestionsRef.current.has(cacheKey)) {
    loadedQuestionsRef.current.add(cacheKey);
    loadQuestions(currentCnaeIdx, currentLevel);
  }
}, [currentLevel, currentCnaeIdx]);
```

Auto-start adicionou os 3 cacheKeys ao `loadedQuestionsRef`. Quando usuário navega para CNAE ≠ atual, o guard `!loadedQuestionsRef.current.has(cacheKey)` retorna `false` → não recarrega → state continua com perguntas do "último a resolver" ou vazio.

## Cadeia completa do bug

```
auto-start dispara 3 loadQuestions em paralelo
  ↓
loadQuestions[CNAE_A]: setQuestions([])  →  await LLM 40s  →  setQuestions(qs_A)
loadQuestions[CNAE_B]: setQuestions([])  →  await LLM 40s  →  setQuestions(qs_B)
loadQuestions[CNAE_C]: setQuestions([])  →  await LLM 40s  →  setQuestions(qs_C)
  ↓
React state `questions` = qs_C (último a resolver)
saveQuestionsCacheMutation: OK para 3 CNAEs (fire-and-forget)
loadedQuestionsRef contém 3 cacheKeys
  ↓
Usuário navega CNAE A → CNAE B
useEffect verifica: loadedQuestionsRef.has("CNAE_B-nivel1") → TRUE → não recarrega
  ↓
state `questions` continua com qs_C (ou outro stale state)
Render para CNAE B mostra "0/0 respondidas" ou perguntas erradas
```

## 3 fontes de truth divergentes (atual)

| Fonte | Estado | Coerência |
|---|---|---|
| DB `questionnaireQuestionsCache` | Correto — 3 CNAEs × N perguntas cada | ✅ Verdade |
| State React `questions` | Único — guarda apenas último a resolver | ❌ Inconsistente |
| `loadedQuestionsRef.current` | "Carregado" para 3 CNAEs (impede reload) | ⚠️ Mascarando bug |

## Por que NÃO foi capturado pela validação V1+V2+V3 da FASE 1

V1+V2+V3 da FASE 1 validavam apenas o **DB cache** (que está correto). Não validavam a **renderização de UI** ao navegar entre CNAEs.

PDF `cnae2-frete.pdf` capturou empiricamente o bug em runtime. Validação UI multi-CNAE deve ser adicionada em testes E2E (Playwright).

## Por que esta issue NÃO entra no escopo do fix de fonte única (PR `fix/1028-fonte-unica`)

PR `fix/1028-fonte-unica` (M1+M2+M3) resolve apenas:
- Bug de **mistura de fontes** (SOLARIS + ia_gen + regulatório → apenas regulatório)
- Backend exclusivamente — zero mudanças em frontend

Race condition é problema **frontend ortogonal**:
- Persiste mesmo após Opção C
- Requer refactor em `client/src/pages/QuestionarioV3.tsx`
- Pode envolver endpoint `getQuestionsCache` (já existe — `routers-fluxo-v3.ts:1000`) para rehidratar state ao navegar
- Decisão de design: state per-CNAE, fetch on-demand, ou refactor render

## 3 opções para o fix futuro

| Opção | Mudança | Diff | Trade-off |
|---|---|---|---|
| **A — Auto-start serial: só 1º CNAE** | `cnaes.forEach` → `if (cnaes[0]) handleStartCnae(cnaes[0].code)` | ~2 linhas | Cache só populado para 1 CNAE; demais lazy on-navigate |
| **B — State guarded + getQuestionsCache fetch** | `setQuestions` guarded por `cnaeIdx === currentCnaeIdx` + `useQuery` em `getQuestionsCache` ao navegar | ~30-50 linhas | Mantém ganho FASE 1 (cache populado); state coerente com tela |
| **C — State Map<cnaeCode, Question[]>** | Refactor `questions: Question[]` → `questionsByCnae: Map<string, Question[]>` | ~100+ linhas | State limpo; refactor grande de render |

## Critério de aceite para fix futuro

```
V1 — Criar projeto com 3+ CNAEs
V2 — Aguardar 60s após mount (auto-start completar)
V3 — Navegar para CADA CNAE no UI
V4 — Cada CNAE deve exibir suas perguntas (não 0/0 respondidas)
V5 — Botão "Concluir Nível 1" habilitado APENAS quando perguntas obrigatórias respondidas
```

## Vinculadas

- Issue principal: [#1028](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/1028)
- PR FASE 1 (mergeado): [#1029](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/1029)
- PR Opção C (em preparação): `fix/1028-fonte-unica`
- Spec relacionada: `docs/specs/SPEC-1028-QCNAE-FONTE-UNICA-v1.md`
- Diagnóstico empírico Manus: `Questionarios/3-CNAES/Diagnóstico Q.CNAE — Evidências Coletadas.md`
