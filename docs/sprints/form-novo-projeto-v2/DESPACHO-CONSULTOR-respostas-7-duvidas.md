# Despacho ao Consultor — Respostas às 7 dúvidas da review SPEC F3 (#1578)

**De:** Claude Code · **Para:** Consultor · **Data:** 25/06/2026 · **HEAD:** `4593ed7e`
**Fontes:** `despacho-revisao-spec-F3-wizard.txt` (7 dúvidas) · `SPEC-F3-wizard.md §11` (respostas) · `manus-resposta--MAPA-RISCOS-F3-WIZARD.md` (avaliado)

---

## 0. Meta-achado (verificado) — a "resposta" do Manus não respondeu nada

O arquivo `manus-resposta--MAPA-RISCOS-F3-WIZARD.md` é **`diff`-idêntico** (byte a byte) ao `manus-MAPA-RISCOS-F3-WIZARD.md` original — **0 linhas diferentes** (`diff -q` → IDÊNTICOS). O Manus **re-enviou o mesmo mapa de riscos** como "resposta". **Zero das 7 dúvidas foi respondida.**

→ Confirma o adendo do Consultor: foi **checklist de presença, não verificação de conteúdo** (mesma família da Lição #150 — "a seção existe" ≠ "a seção resolve"). **As respostas de conteúdo abaixo são do CC, verificadas no código** (REGRA-ORQ-27), e já estão na spec **#1578 §11 + invariantes 6/7 + Cenário 4 + DoD F0/F4**.

---

## 1. 🔴 Dúvida 1 — validação por passo vs `calcProfileScore` global → **há subset, NÃO é regra nova**

`calcProfileScore` (`PerfilEmpresaIntelligente.tsx:179-226`) já retorna `missingRequired` = **lista de LABELS** dos obrigatórios faltantes (condicional PJ 6 / PF 2). O gate de "Avançar" por passo é uma **constante estática `STEP_LABELS[passo]`** aplicada sobre `missingRequired`: `Avançar(passo) = passo.labels.every(l => !missingRequired.includes(l))`.

→ É **partição de exibição**, não check booleano novo. A verdade de validação continua **só em `calcProfileScore` + Zod** (intactos). **Zero risco de divergência.** *(spec §11 D1 + Invariante 6)*

## 2. 🔴 Dúvida 2 — DET cross-field entre passos → **premissa do Consultor incorreta (refutada no código)**

Premissa do Consultor: "hoje o usuário vê a inconsistência DET inline, antes de submeter". **Falso (verificado):** grep em `NovoProjeto.tsx` = **0 chamadas** a DET/consistency. As 8 regras DET rodam **pós-create**, via `consistencyRouter.runConsistencyAnalysis` (`:102`), no fluxo de diagnóstico — **nunca no form**. O único sinal inline no form é a heurística **soft de `confidence`** (`calcProfileScore:219-220`, 2 regras: simples+faturamento-alto −20; MEI+não-simples −15).

→ **O wizard NÃO muda quando o usuário vê o DET** (continua pós-create) = **sem mudança de comportamento**. Voltar é pré-submit (Passos 0-4 = state local) → seguro, **não re-cria projeto** (Invariante 2). *(spec §11 D2)*

## 3. 🔴 Dúvida 3 — cenário PJ→volta→PF → **adicionado como Cenário 4 BLOQUEANTE**

Concordo integralmente — é o caso que quebra. PLANO-TESTES §8 agora tem o **Cenário 4**: preenche PJ completo → `btn-wizard-voltar`×N → `card-tipo-pf` → re-avança → cascata #1299 limpa os 8 campos PJ → passos PJ-only somem → progresso recomputa → `taxIdType='cpf'` → payload sem campos PJ → **NÃO re-cria projeto**. DoD: Cenário 4 verde é **bloqueante**.

## 4. 🟠 Dúvida 4 — draft antigo / rollback → **backward-compat estrutural + isolamento de chave**

`loadTempData<T>` (`usePersistenceV3.ts:51`) é genérico: `JSON.parse(raw) as {data:T}`. Logo:
- **draft antigo** (`{name,description}`) no wizard novo → name/desc presentes, perfilData vazio → começa no Passo 0. ✅
- **draft novo + flag OFF (rollback)** → form de página única tipa `<{name?,description?}>` → lê só name/desc, **ignora** extras. ✅ sem crash.
- **Invariante 7 (nova):** wizard salva perfilData em **stage-key NOVO** (`'etapa1-perfil'`), sem tocar `'etapa1'` (name+desc). Backward-compat por isolamento. *(spec §11 D4)*

## 5. 🟠 Dúvida 5 — F0 não-regressão → **incorporado ao DoD do F0** (suite + E2E flag-OFF idêntico antes×depois; não construir casca sobre sub-blocos não-validados). Bloqueante.

## 6. 🟠 Dúvida 6 — unit obrigatórios → **F4 DoD agora exige** unit de `calcProfileScore` (PJ 6/PF 2 + confidence −20/−15) + cascata toggle PF/PJ (8 campos) + label-map por passo. Não "sugestão".

## 7. 🟡 Dúvida 7 — toggle import/export inerte (dual-name) → **decisão de produto do P.O.**

`toggle-importexport` escreve `hasImportExport` (morto downstream — engines leem `hasInternationalOps`, nunca escrito; fix é F2 separado). Opções: (a) **manter visível** (status quo — recomendo, F3 é layout-only) ou (b) ocultar até o F2. Não acoplar ao F3.

---

## Veredito solicitado

As **3 vermelhas (1,2,3) + 4 + 6** estão respondidas **com evidência de código** e materializadas na spec como **invariantes (6/7), Cenário 4 e DoD (F0/F4)** — não no papel. A **Dúvida 2 refutou uma premissa** (o tipo de coisa que só o código revela).

**Pedido:** 2ª passada do Consultor sobre o **CONTEÚDO** (spec #1578 §11), não sobre a duplicata do Manus. Se fecharem → libera-se o PR F3 (layout-only, flag OFF, zero rename).

## Observação de processo (sugestão de registro)
O Manus entregar documento **byte-idêntico** como "resposta" a uma review de conteúdo é o anti-padrão que o adendo do Consultor já nomeou. Candidato a lição/nota: *"responder uma review re-enviando o artefato original ≠ responder as perguntas"* — extensão da Lição #150 ("presença ≠ resolução"). Decisão do P.O.
