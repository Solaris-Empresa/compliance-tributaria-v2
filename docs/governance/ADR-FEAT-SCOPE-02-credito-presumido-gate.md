# ADR-FEAT-SCOPE-02 — Gate Jurídico `credito_presumido` (Art. 168 LC 214/2025)
**Data:** 24/05/2026 | **Status:** APROVADO | **Issue:** #1178

## Contexto
22/22 projetos exibem `credito_presumido` sem nenhum filtro.
Curadoria jurídica finalizada (3 fontes: Consultor + Manus + Claude Code).
Categoria é guarda-chuva: Art. 168 (produtor rural) + Art. 169 (TAC) + Art. 170 (resíduos).

## Decisão
Gate por questionário operacional (Q5→Q1→Q2), aplicado SOMENTE à hipótese Art. 168.
Guardrail preventivo: taxRegime === 'simples_nacional' → skip (Art. 41 §1º LC 214).
Desambiguação via campo estruturado artigo_ref (X3) — NÃO via LIKE em texto livre.

## Ranges do Decreto 12.955/2026 (confirmados no corpus)
- Produtor rural (Art. 168): Arts. 245–249
- TAC (Art. 169): Arts. 250–255
- Resíduos (Art. 170): Arts. 256–257
- Art. 258 = Art. 171 (hipótese distinta)

## Alternativas rejeitadas
| Alternativa | Motivo |
|---|---|
| Gate por CNAE + lucro_real | Art. 168 não restringe por CNAE nem por regime de IRPJ |
| X1 (source_reference LIKE '%168%') | Antipattern Lição #61 — regex em texto livre |
| Renomear para credito_presumido_produtor_rural | Categoria é guarda-chuva; mislabel Art. 169/170 |

## Lições aplicadas
- Lição #61: nunca inferir por regex em texto livre — usar campo estruturado
- Lição #88: filtro data-driven, não hardcode (REGRA-ORQ-32)
- Conservadorismo tributário: NULL → não presumir benefício
