# Worklist de Curadoria Jurídica — LC 224/2025

**Fonte:** LC 224/2025 (texto integral, DOU 26.12.2025 — fornecido pelo P.O.)
**Método:** extração determinística por `Art. N` do caput. 100% determinístico, sem LLM.
**Menção a CNAE:** **Nenhuma** (0 ocorrências no texto).

## Achado estrutural — impacto no cnaeGroups

A LC 224/2025 **não regula setores econômicos**. Objeto: redução/critérios de incentivos e benefícios federais (tributários, financeiros, creditícios), responsabilidade solidária em apostas de quota fixa, e alterações a outras leis (LRF, LC 105, Lei 7.689, Lei 13.756 etc.). Aplica-se de forma **transversal**.

**Recomendação padrão:** `universal` para a maioria; recortes setoriais só onde o dispositivo alterado é setorial (financeiro/seguros, apostas). **Curadoria de `cnaeGroups` permanece no legal gate (jurídico).**

## Artigos no worklist industrial (3 chunks — prioridade)

| Art. | Caput (fonte primária) | Setor real | `cnaeGroups` proposto | Validado por |
|---|---|---|---|---|
| **4º** | "Os incentivos e benefícios federais de natureza tributária são reduzidos na forma deste artigo." (§1: PIS/Cofins, IRPJ/CSLL, II, IPI, contrib. previdenciária) | **Transversal** → `universal` | _(preencher)_ | ⬜ |
| **7º** | "O art. 3º da Lei nº 7.689, de 15 de dezembro de 1988, passa a vigorar com a seguinte redação:" (alíquotas CSLL de seguros, instituições financeiras, capitalização) | Financeiro/seguros (emenda) | _(preencher)_ | ⬜ |
| **9º** | "O art. 30 da Lei nº 13.756, de 12 de dezembro de 2018, passa a vigorar com a seguinte redação:" (distribuição da arrecadação de loteria de apostas de quota fixa) | Apostas/loterias (emenda) | _(preencher)_ | ⬜ |

> ⚠️ Os 3 chunks acima estão hoje com `cnaeGroups` = faixa industrial `10–33` no corpus — **incorreto** (nenhum é industrial). Ver Issue de integridade de corpus.

## Estrutura completa da LC 224 (14 artigos, contexto)

| Art. | Caput (trecho) | Classificação determinística |
|---|---|---|
| 1 | "Esta Lei Complementar dispõe sobre a redução e os critérios de concessão de incentivos e benefícios..." | universal (objeto da lei) |
| 2 | "A Lei Complementar nº 101 (LRF) passa a vigorar com as seguintes alterações" | estrutural (LRF — emenda) |
| 3 | "O § 3º do art. 1º da Lei Complementar nº 105 passa a vigorar acrescido do inciso VIII" | financeiro/estrutural (sigilo — emenda) |
| **4** | "Os incentivos e benefícios federais de natureza tributária são reduzidos..." | **universal (transversal)** |
| 5 | "Caso o valor total dos incentivos... ultrapasse 2% do PIB, fica vedada a concessão..." | universal (limite fiscal) |
| 6 | "Respondem solidariamente... pelos tributos incidentes sobre a exploração de apostas de quota fixa..." | apostas/financeiro |
| **7** | "O art. 3º da Lei nº 7.689 (CSLL) passa a vigorar com a seguinte redação" | **financeiro/seguros (emenda)** |
| 8 | "O § 2º do art. 9º da Lei nº 9.249 (IR sobre juros) passa a vigorar..." | financeiro (emenda) |
| **9** | "O art. 30 da Lei nº 13.756 (loteria) passa a vigorar com a seguinte redação" | **apostas/loterias (emenda)** |
| 10 | (VETADO) | — |
| 11 | "O caput do art. 12 da Lei nº 8.137 (crimes contra a ordem tributária)... acrescido do inciso IV" | estrutural/penal (emenda) |
| 12 | "O disposto nesta Lei Complementar relativo aos requisitos para prorrogação... não se aplica à TBU" | universal/estrutural |
| 13 | (VETADO) | — |
| 14 | "Esta Lei Complementar entra em vigor na data de sua publicação e produzirá efeitos:" | universal (vigência) |

## Vinculadas

- Worklist industrial `docs/governance/corpus-curation-worklist-industrial-10-33.md` (chunks LC224 Art.4/7/9) · CORPUS-FIX-01 #1466 · CORPUS-FIX-02 #1467 (`blocked-legal-gate`)
- Companheiros: `corpus-curation-worklist-lc214-primario.md` · `corpus-curation-worklist-lc227-primario.md`
- Lição #126 (fonte primária) · #133 (cnaeGroups é camada interpretativa) · REGRA-ORQ-33 (gate jurídico)
