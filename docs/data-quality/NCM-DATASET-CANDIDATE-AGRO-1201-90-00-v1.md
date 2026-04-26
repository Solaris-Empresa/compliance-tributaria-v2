# NCM Dataset Candidate — Agro · NCM 1201.90.00
## Versão: v1.1 · Rodada 3.1
## Data: 2026-04-25 · Autor: Manus (IA SOLARIS Implementador Técnico)

---

**Status:** NOT_APPROVED_FOR_EXECUTION
**Mutação produtiva:** BLOQUEADA — proibida promoção direta para `confirmed`
**Status do candidato:** `candidate/pending_validation`
**Aprovação necessária:** Orquestrador (Claude) — validação jurídico-tributária + P.O. (Uires Tapajós) — aprovação de produto
**Referência ao protocolo:** `docs/data-quality/CORPUS-MUTATION-PROTOCOL-v1.md`

---

## 1. Identificação do NCM

| Campo | Valor |
|---|---|
| **NCM** | `1201.90.00` |
| **Descrição oficial (TIPI)** | Soja, mesmo triturada — exceto para semeadura |
| **Capítulo NCM** | 12 — Sementes e frutos oleaginosos; grãos, sementes e frutos diversos; plantas industriais ou medicinais; palha e forragens |
| **Posição** | 12.01 — Soja, mesmo triturada |
| **Subposição** | 1201.90 — Outras (exceto para semeadura) |
| **Código completo** | `1201.90.00` |

---

## 2. Classificação Econômica

| Campo | Valor |
|---|---|
| **Setor econômico** | `agronegocio` |
| **Família econômica** | `commodity_agricola` |
| **Subfamília** | `oleaginosas` |
| **Tipo de operação principal** | Produção própria + Comércio (B2B) |
| **Cadeia econômica** | Produtor rural → Cooperativa/Trading → Exportação / Esmagamento |
| **CNAE principal associado** | `0115-6/00` — Cultivo de soja |
| **CNAEs secundários** | `0111-3/01` (arroz), `0119-9/99` (outros grãos), `4622-2/00` (comércio atacadista de soja) |

---

## 3. Objeto Canônico Proposto

### 3.1 Análise das Opções

| Opção | Descrição | Adequação |
|---|---|---|
| `agricola` | Objeto genérico para produtos agropecuários | **Recomendado** — existe no engine, cobre CNAE 01xx |
| `commodity_agricola` | Objeto específico para commodities | Ideal mas não existe no engine atual — exigiria novo tipo e migration |
| `bens_mercadoria_geral` com `setor_economico=agro` | Fallback genérico com flag de setor | **Inadequado** — perde especificidade fiscal, não permite inferência de alíquota zero |

### 3.2 Recomendação

**Usar `agricola` como objeto canônico** com os seguintes atributos adicionais:

```json
{
  "ncm": "1201.90.00",
  "descricao": "Soja em grão, exceto para semeadura",
  "objeto": "agricola",
  "setor_economico": "agronegocio",
  "familia_economica": "oleaginosas",
  "tipo_produto": "commodity",
  "regime": "aliquota_zero",
  "base_legal_principal": "LC 214/2025 Art. 128 I",
  "beneficio_adicional": "reducao_60pct_insumos",
  "base_legal_beneficio": "LC 214/2025 Art. 138",
  "cnaeGroups": "01,02,03,10,11,12",
  "vigencia_inicio": "2026-01-01",
  "confianca": { "valor": 0, "tipo": "pending_validation" },
  "status": "candidate"
}
```

> **Justificativa:** O objeto `agricola` já existe no engine e é reconhecido pelo runner. A adição
> de `familia_economica = "oleaginosas"` e `tipo_produto = "commodity"` permite que futuras regras
> distingam soja de outros produtos agrícolas sem criar um novo tipo de objeto ou migration de schema.

---

## 4. Regime Tributário Proposto

### 4.1 Regime IBS/CBS (Reforma Tributária — LC 214/2025)

| Aspecto | Regime | Base Legal |
|---|---|---|
| **Alíquota IBS/CBS** | Zero (alíquota zero) | LC 214/2025, Art. 128, I — produtos da cesta básica nacional ampliada |
| **Crédito presumido** | Aplicável ao produtor rural | LC 214/2025, Art. 168 |
| **Insumos agropecuários** | Redução de 60% nas alíquotas | LC 214/2025, Art. 138 |
| **Regime optativo** | Produtor rural pode optar pelo regime regular | LC 214/2025, Art. 165 |
| **Limiar de contribuição** | R$ 3,6M de receita bruta anual | LC 214/2025, Art. 164 |

### 4.2 Regime ICMS (Vigente até transição completa)

| Aspecto | Regime | Base Legal |
|---|---|---|
| **ICMS nas operações internas** | Diferido ou isento (maioria dos estados) | Conv. ICMS 100/97 e legislações estaduais |
| **ICMS nas exportações** | Imune | CF/88, Art. 155, §2º, X, a |
| **ICMS-ST** | Não aplicável para soja em grão | — |

### 4.3 Regime PIS/COFINS (Vigente até 2033)

| Aspecto | Regime | Base Legal |
|---|---|---|
| **Alíquota** | Zero (suspensão) | Lei 10.925/2004, Art. 9º |
| **Crédito presumido** | Aplicável ao adquirente | Lei 10.925/2004, Art. 8º |

---

## 5. Base Normativa Completa

| Norma | Artigo | Tema | Relevância |
|---|---|---|---|
| LC 214/2025 | Art. 128, I | Alíquota zero — cesta básica nacional | **PRINCIPAL** |
| LC 214/2025 | Art. 138 | Redução 60% — insumos agropecuários | Alta |
| LC 214/2025 | Art. 163 | Produtor rural — lei ordinária federal | Alta |
| LC 214/2025 | Art. 164 | Limiar R$ 3,6M para contribuição obrigatória | Alta |
| LC 214/2025 | Art. 165 | Opção de inscrição como contribuinte IBS/CBS | Alta |
| LC 214/2025 | Art. 168 | Crédito presumido — regime regular | Alta |
| LC 214/2025 | Art. 168 (p2) | Crédito presumido — Simples Nacional | Média |
| EC 132/2023 | Art. 153, VIII | Imposto Seletivo — não incide sobre commodities agro | Alta |
| Lei 10.925/2004 | Art. 8º e 9º | PIS/COFINS — suspensão e crédito presumido agro | Média |
| Conv. ICMS 100/97 | — | ICMS — isenção nas operações com insumos agropecuários | Média |

---

## 6. Família de Cobertura — Capítulo 12 NCM

O NCM 1201.90.00 deve ser tratado como o **primeiro item de uma família** de commodities
oleaginosas do Capítulo 12, não como um caso isolado. A metodologia de cobertura da família
deve ser aplicada sistematicamente para todos os NCMs do Capítulo 12 com regime de alíquota zero.

### 6.1 NCMs Prioritários do Capítulo 12

| NCM | Descrição | Prioridade | Status sugerido |
|---|---|---|---|
| `1201.10.00` | Soja para semeadura | Alta | `candidate` |
| `1201.90.00` | Soja em grão (exceto semeadura) | **Este documento** | `candidate` |
| `1202.41.00` | Amendoim em casca | Média | `backlog` |
| `1205.10.00` | Colza (canola) | Média | `backlog` |
| `1206.00.10` | Girassol | Média | `backlog` |
| `1207.40.00` | Gergelim | Baixa | `backlog` |
| `1208.10.00` | Farinha de soja | Alta | `candidate` |
| `1507.10.00` | Óleo de soja bruto | Alta | `candidate` |

### 6.2 Impacto em `project_dataset_coverage` e `sector_dataset_coverage`

A adição do NCM 1201.90.00 ao dataset impacta diretamente:

- **`project_dataset_coverage`:** Projetos com CNAE 0115-6/00 e NCM 1201.90.00 passam de
  `coverage = "fallback"` para `coverage = "mapped"`. Estimativa: ~5–8% dos projetos ativos.
- **`sector_dataset_coverage`:** O setor `agronegocio` passa de cobertura de NCM ~12% para ~18%
  (apenas com a adição deste NCM). Para atingir 80% de cobertura do setor agro, são necessários
  pelo menos os 4 NCMs de alta prioridade da tabela acima.

---

## 7. Checklist Jurídico-Tributário (Obrigatório para Promoção)

Todos os itens abaixo devem ser confirmados pelo Orquestrador (Claude) antes da promoção:

- [ ] Confirmar que `1201.90.00` está listado no Anexo I da LC 214/2025 (cesta básica nacional ampliada)
- [ ] Confirmar que a alíquota zero se aplica tanto à produção quanto à comercialização B2B
- [ ] Confirmar que o crédito presumido do Art. 168 se aplica ao produtor rural com CNAE 0115-6/00
- [ ] Confirmar que o IS (Imposto Seletivo) não incide sobre soja em grão (EC 132, Art. 153, VIII)
- [ ] Confirmar o calendário de vigência (Art. 413 e seguintes da LC 214/2025)
- [ ] Confirmar que o regime de suspensão PIS/COFINS (Lei 10.925/2004) permanece vigente até 2033
- [ ] Confirmar que ICMS-ST não se aplica a soja em grão em nenhum estado da federação
- [ ] Confirmar que o limiar de R$ 3,6M (Art. 164) é o correto para 2026

---

## 8. Fluxo de Promoção

```
CANDIDATE (este documento)
    ↓ checklist jurídico completo (Orquestrador)
pending_validation
    ↓ teste A/B abordagem C (Manus)
    ↓ aprovação P.O.
confirmed
```

**Proibição explícita:** A promoção direta de `candidate` para `confirmed` sem passar por
`pending_validation` e sem o checklist jurídico completo é **vedada** pelas regras de governança
do projeto. Qualquer tentativa de promoção direta deve ser rejeitada pelo Orquestrador.

---

## 9. Testes Obrigatórios Antes da Promoção

| Teste | Critério de Aceite |
|---|---|
| Runner M1 com NCM 1201.90.00 | `V-10-FALLBACK` ausente |
| Score M1 — caso Agro Soja | `score_confianca = 100` (sem fallback) |
| RAG retrieval — CNAE 0115-6/00 | Art. 128 I e Art. 168 no top-5 |
| Gaps gerados | Pelo menos 1 gap relacionado a crédito presumido (Art. 168) |
| Riscos gerados | Sem riscos de IS sobre soja (IS não incide — EC 132 Art. 153 VIII) |
| Regressão — caso Transportadora | `status_arquetipo = confirmado` (sem regressão) |

---

## 10. Plano de Rollback (Caso Falso Positivo)

Se após a promoção para `confirmed` o NCM gerar falsos positivos (ex: alíquota zero aplicada
indevidamente a soja industrializada ou a operações não cobertas pelo Art. 128 I), o rollback
consiste em:

1. Reverter `status` de `confirmed` para `candidate` no `ncm-dataset.json`.
2. Executar commit na branch `feat/ncm-rollback-1201-90-00`.
3. Registrar o falso positivo como evidência no `CORPUS-MUTATION-PROTOCOL-v1.md`.
4. Abrir issue no repositório com o caso de falso positivo documentado.
5. Aguardar nova validação jurídica antes de nova tentativa de promoção.

---

## 11. Impacto Esperado

| Métrica | Antes | Depois |
|---|---|---|
| `V-10-FALLBACK` no caso Agro Soja | Presente (INFO) | **Ausente** |
| `confianca.valor` do NCM | 60 (fallback) | 100 (confirmed) |
| `score_confianca` M1 | 70% | **100%** |
| Objeto canônico inferido | `bens_mercadoria_geral` | `agricola` |
| Gaps de crédito presumido | Ausentes | **Presentes** (Art. 168) |
| Riscos de IS indevidos | ~2 | **0** (IS não incide sobre soja) |
| `project_dataset_coverage` (CNAE 0115-6/00) | `fallback` | `mapped` |
| `sector_dataset_coverage` (agronegocio) | ~12% | ~18% |

---

## 12. Histórico de Versões

| Versão | Data | Alteração |
|---|---|---|
| v1.0 | 2026-04-25 | Criação inicial — candidato de dataset mapeado |
| v1.1 | 2026-04-25 | Rodada 3.1 — status NOT_APPROVED_FOR_EXECUTION, proibição explícita de `confirmed` direto, checklist jurídico, família Capítulo 12, impacto em coverage, plano de rollback, campo `vigencia_inicio` |

---

*Documento gerado pelo Implementador Técnico IA SOLARIS · Rodada 3.1 · 2026-04-25*
*NÃO promover para `confirmed` sem checklist jurídico completo e aprovação formal do P.O.*
