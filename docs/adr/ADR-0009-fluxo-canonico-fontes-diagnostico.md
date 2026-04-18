# ADR-0009 — Fluxo Canônico e Fontes do Diagnóstico
## IA SOLARIS · Architecture Decision Record
**Status:** APROVADO
**Data:** 2026-04-06
**Autores:** P.O. (Uires Tapajós) + Orquestrador (Claude)
**Supersede:** ADR-001 (parcial) · ADR-002 (parcial)
**Relacionado:** ADR-007 · DEC-M3-05 v3

---

## Decisão

### Fontes canônicas do diagnóstico (5 fontes calculadas)

SOLARIS  — Onda 1 · 24 perguntas jurídicas
IAGEN    — Onda 2 · engine dispara aqui
NCM      — Q. de Produtos · condicional produto/misto
NBS      — Q. de Serviços · condicional serviço/misto
CNAE     — Questionário setorial por CNAE

Pré-condição (não entra no score):
perfil_minimo: operationProfile preenchido + 1 CNAE confirmado

### Substituição de QC e QO
Questionário Corporativo (QC):
ELIMINADO como etapa própria.
Conteúdo: perguntas geradas pelos NCMs do operationProfile.
Componente: QuestionarioCorporativoV2.tsx (mantido — troca conteúdo)
Status: diagnostico_corporativo (mantido temporariamente)
Questionário Operacional (QO):
ELIMINADO como etapa genérica.
Conteúdo: perguntas geradas pelos NBS do operationProfile.
Componente: QuestionarioOperacional.tsx (mantido — troca conteúdo)
Status: diagnostico_operacional (mantido temporariamente)
Condicional: aparece apenas para tipo = 'servico' | 'misto'

### VALID_TRANSITIONS canônico (pós-Sprint Z)
```typescript
{
  rascunho:                  ['consistencia_pendente'],
  consistencia_pendente:     ['cnaes_confirmados', 'rascunho'],
  cnaes_confirmados:         ['onda1_solaris', 'consistencia_pendente'],
  onda1_solaris:             ['onda2_iagen', 'rascunho'],
  onda2_iagen:               ['questionario_produtos',
                              'questionario_servicos'],
  questionario_produtos:     ['questionario_servicos',
                              'diagnostico_cnae'],
  questionario_servicos:     ['diagnostico_cnae',
                              'questionario_produtos'],
  diagnostico_cnae:          ['briefing', 'questionario_servicos'],
  briefing:                  ['matriz_riscos', 'diagnostico_cnae'],
  matriz_riscos:             ['plano_acao', 'briefing'],
  plano_acao:                ['aprovado', 'matriz_riscos'],
  aprovado:                  ['matriz_riscos'],
}
```

### Princípio de implementação (Sprint Z)
Trocar conteúdo, não refatorar estrutura.
Componentes mantidos. Status temporariamente mantidos.
Conteúdo das perguntas substituído por NCM/NBS.

### Banco operacional
Limpar: todas as tabelas de projeto (ver DEC-M3-05 v3)
Preservar: ragDocuments · ragUsageLog · solarisQuestions
cnaeEmbeddings · cnaes · users · cpieSettings

## Consequências

### Positivas
- Diagnóstico orientado ao produto/serviço real da empresa
- NCM e NBS como fontes formais do consolidador
- Fluxo condicional por tipo de empresa

### Negativas / trade-offs
- Sprint Z necessária para substituição de conteúdo
- Testes E2E precisam cobrir 3 caminhos (produto/serviço/misto)

## Referências
- DEC-M3-05 v3 (2026-04-06) — decisão formal completa
- ADR-007 — gate de limpeza (atualizado em paralelo)
- E2E automatizado: 15/15 casos (PR #364)
