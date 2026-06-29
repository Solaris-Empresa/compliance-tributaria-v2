# Cruzamento determinístico — Riscos Construção Civil × Regulamentação (v2)

> **v2 (2026-06-29):** reconcilia a v1 (LC 214/2025 + CGIBS 6) com os 3 documentos do Manus
> (DOC1/DOC2/DOC3, PR #1617), incorpora o **Decreto 12.955/2026** (regulamento da CBS) e adiciona
> a **análise de mecanismo do CR-02** (geração de risco vs. retrieval). Issue #1607.
> **Método:** `pdftotext -enc UTF-8 -layout` (fonte primária) + verificação de código `arquivo:linha`.
> **Natureza:** evidência + crítica de mecanismo. **Não emite veredito jurídico** (curadoria = gate humano, Dr. José).

## Fontes

| Sigla | Arquivo | Natureza |
|---|---|---|
| **LC** | `Lcp 214.pdf` — LC 214/2025 (16/jan/2025) | Lei Complementar — primária |
| **DEC** | `rag-corpus-decreto12955.ts` / Decreto 12.955/2026 | Regulamento da **CBS** (federal) |
| **CG** | Resolução CGIBS nº 6/2026 | Regulamento do **IBS** |
| **M1/M3** | `DOC1-TABELA-QUESTAO-FUNDAMENTACAO.pdf` · `DOC3-RELATORIO-TOBE.pdf` (Manus, PR #1617) | Mapeamento + TO-BE do Manus |

> **Nota de nomenclatura:** os documentos do Manus rotulam "LC 214/**2024**"; o texto dos próprios chunks diz
> *"Lei Complementar nº 214, de 16 de janeiro de **2025**"*. O canônico é **2025** (2.171 refs no código). Typo de rótulo, não de conteúdo.

---

## 1. Convergência com o Manus (DOC1 corrigiu divergências que a v1 apontou)

A v1 deste relatório sinalizou que o doc secundário antigo (`AS-IS-TO-BE...20260628`) tinha citações erradas.
O **DOC1 do Manus corrigiu a maioria** — convergência factual com a fonte primária:

| Risco | v1 (doc antigo) | DOC1 Manus | Primária LC | Convergiu? |
|---|---|---|---|---|
| #1/#6 créditos/doc fiscal | Art. **365** (errado) | Art. 269/270 | 269/270 | ✅ Art. 365 removido |
| #2 Redutor de Ajuste | 260–268 | **257–258** | 257–258 | ✅ |
| #7 CIB | 269–270 | **265–266** | 265–266 | ✅ |
| #8 custos / #9 contrapartidas | 260–268 | **258** | 258 (II b / §6º-§7º) | ✅ |
| #12 contratos | 251–270 | **263–264** | 264 (SCP) | ✅ |

→ O **Art. 365** era erro de transcrição do doc secundário, **não** do Dr. José nem da lei. Resolvido.

---

## 2. Divergências REMANESCENTES no DOC1 (evidência literal do próprio DOC1)

O DOC1 declara *"apenas citações literais dos chunks do banco, nenhuma inferência"*. As citações literais
**são reais**, mas a **atribuição artigo→risco** contém erros — o texto literal impresso pelo DOC1 os expõe:

| # | Risco | DOC1 cita | Texto literal que o DOC1 imprimiu | Constatação |
|---|---|---|---|---|
| **4** | **Permuta** | **LC Art. 259** | *"Art. 259. Na alienação de bem imóvel residencial novo... redutor social no valor de R$ 100.000..."* | ✗ **Art. 259 = redutor social, NÃO permuta.** O artigo da permuta — **LC Art. 252 §2º I** (*"...não incidem... nas operações de permuta de bens imóveis, exceto sobre a torna..."*) + §3º/§5º/§6º — **está ausente** do #4 |
| 2 | Redutor de Ajuste | DEC Art. 360–362 | 360 = incidência (LC 252) · 361 = locação 90d (LC 253) · 362 = acessório (LC 7º) | ⚠ Decreto do redutor é **369–375** (369=LC257, 375=LC258). 360–362 é off-topic |
| 3 | SINTER/avaliação | DEC Art. 363–364 | 363 = fato gerador (LC 254) · 364 = base de cálculo (LC 255) | ⚠ Decreto da avaliação é **366–368** (366=LC256, 368=Sinter). 363–364 off-topic |
| 5/11/etc. | vários | DEC 370/371/372 | redutor composto/alienação/fusão (LC 257) | ⚠ citados em riscos não-redutor |
| todos | — | CG Art. 10, 106, 15, 6… | imunidades · estabelecimento · energia elétrica · não-incidência | ⚠ **genéricos** — não tratam do risco; padrão de **ruído de retrieval** |

**Padrão observado:** as citações **LC 214** (corpus bem indexado) acertam quase sempre; as de **Decreto 12.955 e
CGIBS 6** são **sistematicamente off-topic** — coerente com geração por **recuperação semântica (RAG)**, não por
curadoria de tópico. (Ver despacho DM-3.) Isto é exatamente a classe de falso-positivo de retrieval que motiva o #1607
([[Lição #134]] — reranker/retrieval não substitui curadoria; [[Lição #93]] — mecanismo verificado, não inferido).

---

## 3. CR-02 — análise de mecanismo (geração de risco ≠ retrieval) — **bloqueante técnico**

O DOC3 afirma: *"cnaeGroups='' em todos os artigos... Motor não roteia riscos setoriais → 13 riscos não aparecem"*
e propõe *"Popular cnaeGroups='41,42,43,68' → Motor passa a rotear todos os 13 riscos → 13/13 Briefing+Matriz+Plano"*.

**Verificação de código (REGRA-ORQ-27, assemble≠consumption):**

| Quem consome `ragDocuments.cnaeGroups` | `arquivo:linha` | Função |
|---|---|---|
| **RAG retriever** (grounding) | `rag-retriever.ts:134` (`like(ragDocuments.cnaeGroups, '%${g}%')`) | filtro de relevância CNAE na **recuperação** de chunks p/ o briefing |
| RAG category sensor | `rag-category-sensor.ts:77` | sensor de categoria |
| **Motor de geração de risco** | `normative-inference.ts` · `risk-engine-v4.ts` → **grep vazio** | **NÃO lê** `ragDocuments.cnaeGroups` |

Os riscos de imóveis **geram via Path B**, gated por **`isRegimeImoveisRisco(profile.cnaes)`**
(`normative-inference.ts:250` → `regime-imoveis-eligibility.ts`, **CNAE do projeto**), **não** por `cnaeGroups` do corpus.

**Conclusão de mecanismo:**
- Popular `ragDocuments.cnaeGroups='41,42,43,68'` muda **qual artigo é recuperado para fundamentar (grounding)** o
  briefing — **não** faz o motor **gerar** novos riscos.
- Os ~8 riscos ausentes (Redutor, SINTER, permuta, parcelas, custos, contrapartidas, recálculo, contratos) **não
  têm ramo de inferência** (Path B) **nem requisito/pergunta** (Path A) — então **não geram** mesmo com cnaeGroups populado.
- Logo, a meta do DOC3 **"13/13 Briefing + Matriz + Plano"** está **superestimada**: o CR-02 sozinho cobre **grounding/citação**,
  não **geração**. (Confirmação empírica before/after = **despacho DM-1**, Manus.)

> Isto **não invalida** popular `cnaeGroups` — é necessário para o **grounding** correto (e para o filtro de **perguntas**,
> que lê `solarisQuestions.cnaeGroups`, tabela distinta). Apenas **não é suficiente** para os 13 riscos aparecerem na matriz.
> O caminho de geração exige **ramos de inferência** e/ou a cadeia **requisito→gap→risco** (CR-03 + camada setorial F1-F4 do
> `AS-IS-TO-BE-CONSTRUCAO-CIVIL-RISCOS-SETORIAIS-20260628.md`).

---

## 4. CR-01 — nota sobre o fallback proposto

DOC3 propõe: `taxRegime = project.taxRegime ?? companyProfile?.taxRegime ?? 'lucro_real'`.
- ✅ Ler `companyProfile.taxRegime` é correto ([[Lição #140]] — fonte canônica é o JSON).
- ⚠ **Hardcode final `'lucro_real'`** é desaconselhado (REGRA-ORQ-29/32 — no hardcode) e **inverte o DoD discriminante**
  ([[Lição #139]]): uma construtora **Simples Nacional** sem regime persistido receberia `'lucro_real'` → passaria o gate
  `!== "simples_nacional"` → **falso-positivo** de riscos de imóveis. Fallback correto: **`?? null`** + DoD discriminante
  (SN→exclui · lucro_real→inclui).

---

## 5. Tabela consolidada — Risco × Artigo (corrigida contra a primária)

| # | Risco | LC 214/2025 (primária) | Decreto 12.955 (CBS) | Res. CGIBS 6 (IBS) |
|---|---|---|---|---|
| 1 | Créditos IBS / gestão da obra | 255 §5º · 262 · 269 · 270 | 365 (=LC255§5) | 113 (docs) |
| 2 | Redutor de Ajuste | **257–258** | **369–375** (≠ 360–362 do DOC1) | — |
| 3 | SINTER / avaliação | **256** · 265 | **366–368** (≠ 363–364 do DOC1) | 16 (arbitramento) |
| 4 | **Permuta** | **252 §2º** (≠ 259 do DOC1) | 360 (=LC252) | — |
| 5 | Controle por empreendimento | **270** | (art. =LC270) | 112 (doc fiscal) |
| 6 | Documentação fiscal da obra | 270 §único · 265 §2º | 369? (rever) | 113/114 (NF-e ABI) |
| 7 | CIB | **265–266** | 367–368 (Sinter) | 105/110 (cadastro) |
| 8 | Custos históricos < 2027 | **258 II b** | 375 (=LC258) | — |
| 9 | Contrapartidas urbanísticas | **258 §6º-§7º** | 375 (=LC258) | — |
| 10 | Recálculo posterior do IBS | 256 §2ºIII / 258 §3º (candidatos) · DOC1 propõe 262 | — | — |
| 11 | Tributação por parcelas | **262** · 254 §2º | (art. =LC262) | 11 (fato gerador) |
| 12 | Revisão de contratos (SPE/SCP) | **263–264** | — | 114 (DeRE/NF-e ABI) |
| 13 | Risco tecnológico (ERP) | **270** | 371 (parcial) | — |

> Colunas Decreto/CGIBS marcadas "≠ DOC1" indicam onde o DOC1 atribuiu artigo divergente do tópico (ver §2).
> "ERP"/"SPE" não aparecem literais na lei — a obrigação correspondente (centro de custo Art. 270 / SCP Art. 264) sim.

---

## 6. Pendências (→ Despacho Manus `DESPACHO-MANUS-1607-CRUZAMENTO-CR02-20260629.md`)

| ID | Pendência | Por quê só o Manus |
|---|---|---|
| DM-1 | **Prova before/after** de que cnaeGroups gera risco (ou só grounding) — `risks_v4` count/DISTINCT categoria p/ CONSTRUTORA VII greenfield, antes e depois | empirismo em DB de produção ("sem empirismo" pelo Claude) |
| DM-2 | Re-extrair o chunk de **permuta (LC Art. 252 §2º)** e corrigir o #4 do DOC1 (hoje cita Art. 259 = redutor social) | leitura do banco |
| DM-3 | DOC1 foi gerado por **retrieval semântico** ou curadoria por tópico? (mismatches sistemáticos Decreto/CGIBS) | metadado de geração |
| DM-4 | Escopo do UPDATE cnaeGroups: subconjunto construção-civil-**específico** vs imóveis-geral (68xx) — **gate jurídico por artigo** ([[Lição #133]]) antes de qualquer UPDATE | curadoria Dr. José + DB |

## Vinculadas

- Issue #1607 · DOC1/DOC2/DOC3 (Manus, PR #1617) · `AS-IS-TO-BE-CONSTRUCAO-CIVIL-RISCOS-SETORIAIS-20260628.md` (camada setorial F1-F4) · `PARECER-FINAL-DR-JOSE-CONSTRUCAO-CIVIL-20260628.md`
- REGRA-ORQ-27 (assemble≠consumption) · [[Lição #59]] · [[Lição #93]] · [[Lição #126]] (fonte primária) · [[Lição #133]] (cnaeGroups = camada interpretativa, gate jurídico) · [[Lição #134]] (retrieval não substitui curadoria) · [[Lição #139]]/[[Lição #140]] (DoD discriminante / dual-storage taxRegime)
- Código: `rag-retriever.ts:134` · `normative-inference.ts:250` · `regime-imoveis-eligibility.ts` · `solaris-context-filter.ts:91`
