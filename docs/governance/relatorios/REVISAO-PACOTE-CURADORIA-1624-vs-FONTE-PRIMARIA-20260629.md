# Revisão do Pacote de Curadoria (#1624) × fonte primária

> **Objeto:** `docs/PACOTE-CURADORIA-DR-JOSE.md` (#1624). **De:** CC · **Data:** 2026-06-29 · Despacho 29/06 13h51 (D-GOV-2).
> **Método:** cruzamento dos artigos-fonte de cada categoria contra a fonte primária (LC 214/2025 `Lcp 214.pdf` + Decreto 12.955 via anotações literais `(Art. N da LC)` do DOC1). **Não toca severidade** (juízo do Dr. José, SEVERITY_TABLE nunca-LLM).
> **Veredito:** artigos **LC majoritariamente corretos**; **2 correções obrigatórias antes do gate** — (1) permuta LC 259→252; (2) coluna **Decreto 12.955 sistematicamente errada** (ruído de retrieval do DOC1, DM-3).

---

## 1. Correção crítica #1 — B3 permuta: LC Art. 259 → **Art. 252 §2º**

O pacote (B3, linha 105 + resumo linha 205) fixa `risco_permuta_imoveis` em **`Art. 259 LC`**. Verificação primária:

- **Art. 259** (`Lcp 214.pdf`): *"Na alienação de bem imóvel residencial novo... **redutor social** no valor de R$ 100.000..."* → **é redutor social, não permuta.**
- **Permuta** = **Art. 252 §2º I**: *"O IBS e a CBS não incidem... nas operações de **permuta** de bens imóveis, exceto sobre a torna..."* (+ §3º/§5º/§6º).

→ Criar `risco_permuta_imoveis` com `artigo_base='Art. 259'` ancoraria a categoria no artigo errado. **Corrigir para Art. 252 §2º** antes do gate. (Erro recorrente: DM-2, persistiu de DOC1/QUADRO.)

## 2. Correção crítica #2 — coluna Decreto 12.955 sistematicamente errada (todo o Grupo B)

Os artigos do Decreto no pacote vieram do DOC1, que os atribuiu por **recuperação semântica** (DM-3), não por tópico. As próprias anotações `(Art. N da LC 214)` dos chunks do Decreto provam o desalinhamento:

| Cat. | LC (✓ correto) | Decreto no pacote | Decreto **real** (pela anotação `(Art. N da LC)`) | Status |
|---|---|---|---|---|
| B1 redutor de ajuste | Art. 257–258 ✓ | **360–362** | **369 (=257) · 375 (=258)** | ❌ corrigir (360–362 = incidência/locação/acessório = LC 252/253/7) |
| B2 SINTER/avaliação | Art. 256 ✓ | **363–364** | **366 (=256) · 367–368 (=256 §3/§4, Sinter)** | ❌ corrigir (363–364 = fato gerador/base = LC 254/255) |
| B3 permuta | **252 §2º** (≠259) | **365–366** | **360 (=252)** | ❌ corrigir (365–366 = crédito obra/valor ref = LC 255§5/256) |
| B4 controle empreendimento | Art. 270 ✓ | **370–371** | **390 (=270)** | ❌ corrigir (370–371 = redutor = LC 257 §2/§4) |
| B5 CIB | Art. 265–266 ✓ | **367–368** | **389 (=269) + decreto 265/266 — re-extrair** | ⚠️ 367–368 = valor ref (LC 256§3/§4); confirmar nº Decreto do CIB |
| B6 custos históricos | Art. 258 ✓ | **361–362** | **375 (=258)** | ❌ corrigir |
| B7 tributação parcelas | Art. 262 ✓ | **372** | decreto Art.262 (Seção V incorporação) — **re-extrair** | ⚠️ 372 = fusão/redutor (LC 257§5) |
| B8 revisão contratos | Art. 263–264 ✓ | **365–366** | decreto Art.263/264 — **re-extrair** | ⚠️ 365–366 errado |

→ **Recomendação:** para o gate do Dr. José, **remover a coluna Decreto** OU substituí-la pelos números corrigidos acima. Os 4 marcados "re-extrair" (B5/B7/B8 + confirmação B-CIB) exigem nova query do Manus ao banco (`SELECT artigo, conteudo WHERE lei='decreto12955'` + a anotação `(Art. N da LC)`). **A coluna LC é suficiente e correta para o gate** — o Decreto é regulamento secundário.

## 3. Grupo A — observações pontuais (não bloqueantes)

| Cat. | No pacote | Observação |
|---|---|---|
| A1 `risco_art_269_270` | Art. 269–270 ✓ | LC correto. Decreto "388–390": 389=Art.269, 390=Art.270 ✓ plausível (388 confirmar). Severidade `media`→`alta`? = juízo Dr. José. |
| A2 `regime_especifico_imoveis` | artigo-fonte "Art. 251" | A **redução de 50%** é **Art. 261** (a base legal citada na própria linha 48 diz "Art. 261 caput"). Sugerir artigo-fonte = **Art. 261** (ou faixa 251–270). |
| A3 `regime_diferenciado_reabilitacao_urbana` | Art. 234 | **Não verificado por mim** contra a primária (fora do bloco 251–270/365 que extraí). Marcar como "CC não confirmou — Dr. José valida o Art. 234". |

## 4. Grupo C — vigência (sem reparo de artigo)

C1–C3 são confirmações de vigência (`pending_vigency`) — juízo do Dr. José. Os artigos citados (258/256/245) não foram re-verificados (não são o foco do gate de vigência). Sem objeção do CC.

## 5. O que está correto (não mexer)

- **Todos os artigos LC do Grupo B** exceto B3 (permuta) — corretos contra a primária.
- **CNAEs `41,42,43,68`** — consistentes com o regime de imóveis (gate Dr. José confirma 68xx).
- **Severidades propostas** — corretamente deixadas para o Dr. José (não-LLM).

## 6. Ações antes do gate Dr. José

1. **Corrigir B3:** `artigo_base` permuta = **Art. 252 §2º** (não 259). — CC/Manus (1 linha no pacote).
2. **Corrigir/remover a coluna Decreto** do Grupo B (números acima). — CC/Manus.
3. **Re-extrair** Decreto para B5/B7/B8 (+ A1-388) — Manus (query read-only).
4. **A2:** artigo-fonte → Art. 261. **A3:** marcar Art. 234 como não-confirmado pelo CC.

## Vinculadas

- `docs/PACOTE-CURADORIA-DR-JOSE.md` (#1624) · `DESPACHO-ORQUESTRACAO-TOBE-CONSTRUCAO-CIVIL-1607-20260629.md` · `CRUZAMENTO-CONSTRUCAO-CIVIL-RISCOS-LEI-EVIDENCIA-20260629.md` (v2)
- DM-2 (permuta 252) · DM-3 (Decreto retrieval-noise) · [[Lição #126]] (fonte primária) · [[Lição #133]] (gate jurídico) · [[Lição #134]] (retrieval ≠ curadoria) · [[Lição #93]] (verificado, não inferido) · REGRA-ORQ-45 (Gate 0 do emissor)
