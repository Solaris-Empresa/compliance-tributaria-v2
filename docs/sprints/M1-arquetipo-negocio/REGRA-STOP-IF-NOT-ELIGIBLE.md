# REGRA E2E — `STOP_IF_NOT_ELIGIBLE`

> Enviada pelo P.O. em 2026-04-23 · entra no escopo obrigatório da SPEC v3 · sem implementação ainda.

---

## Definição canônica (source of truth)

```json
{
  "rule_id": "STOP_IF_NOT_ELIGIBLE",
  "scope": "E2E",
  "condition": "arquetipo.status != 'valido' OR eligibility.overall != 'allowed'",
  "action": [
    "STOP_PIPELINE",
    "DO_NOT_RUN_RAG",
    "DO_NOT_GENERATE_QUESTIONS",
    "DO_NOT_BUILD_BRIEFING",
    "DO_NOT_GENERATE_RISKS",
    "DO_NOT_GENERATE_PLAN"
  ],
  "ui": {
    "state": "BLOCKED",
    "message": "Arquétipo inválido ou não elegível. Complete/corrija os dados para continuar.",
    "show_missing_fields": true,
    "show_conflicts": true
  },
  "audit": {
    "log": true,
    "fields": [
      "arquetipo_snapshot",
      "failed_rules",
      "missing_fields",
      "timestamp"
    ]
  }
}
```

---

## O que esta regra pede

Um **gate único E2E** antes de todo o pipeline downstream. Se qualquer uma das duas condições falhar, o sistema:

1. **Para o pipeline** — nenhuma etapa downstream roda
2. **UI entra em BLOCKED** — mensagem + missing_fields + conflicts visíveis
3. **Audit log** — snapshot do arquétipo, regras falhas, campos faltando, timestamp

O gate é pré-requisito para:
- RAG (Epic RAG+Arquétipo)
- Geração de perguntas (Q1/Q2/Q3)
- Briefing V3
- Matriz de riscos V4 (risk-categorizer + risks-v4)
- Plano de ação V4 (action-plan-engine-v4)

Ou seja: todo o motor do produto só executa se **arquétipo válido E elegibilidade liberada**.

---

## Mapeamento com o estado atual

### Condição 1: `arquetipo.status != 'valido'`

Já coberto pelo avaliador v2. Disparos conhecidos:

| Fonte | Quando dispara |
|---|---|
| V-01 HARD_BLOCK | `possui_bens=true AND ncms_principais IS EMPTY` |
| V-02 HARD_BLOCK | `possui_servicos=true AND nbss_principais IS EMPTY` |
| V-03 HARD_BLOCK | `(atua_importacao OR atua_exportacao) AND papel_comercio_exterior IS EMPTY` |
| V-04 HARD_BLOCK | `setor_regulado=true AND subnatureza_setorial IS EMPTY` |
| V-05 BLOCK_FLOW | `integra_grupo_economico=true AND analise_1_cnpj_operacional=false` (multi-CNPJ) |

**Comprovado** pela bateria v2 (50/50 cenários respeitam a semântica: 49 PASS = status valido, 1 BLOCKED = S27 multi-CNPJ).

### Condição 2: `eligibility.overall != 'allowed'`

**Novo conceito — não existe no modelo atual.** Precisa ser definido pelo consultor na v3. Decisões necessárias:

| Dúvida aberta (consultor responde) | Impacto |
|---|---|
| O que é `eligibility`? (nova dimensão independente do arquétipo) | Define se é objeto separado ou sub-campo |
| Valores possíveis de `overall`? (`allowed`, `denied`, `pending`, `manual_review`?) | Define a máquina de estados |
| Critérios que determinam cada valor? (KYC-like? sanction list? UF restrita? porte/regime? tier de plano?) | Define inputs e semântica |
| `eligibility` é derivada do arquétipo ou de inputs externos? (sanction list, CNAE blocked list, geolocalização, etc.) | Define se engine é puro ou depende de I/O |
| Quem grava os valores? (usuário declara? sistema computa? operador humano revisa?) | Define UX + audit |
| Reagir a mudanças em eligibility? (se state vira `denied` após passar, volta para BLOCKED?) | Define lifecycle |

Enquanto esta definição não chegar, **não há como escrever teste para a condição 2**. A bateria v2 cobre 100% da condição 1; cobre 0% da condição 2.

---

## O que esta regra requer na SPEC v3 (além dos 7 P0 já confirmados)

1. **Definição formal de `eligibility`** com schema declarado (tipo, valores, inputs)
2. **Contrato do gate E2E** — onde vive, o que consome, o que produz
3. **Semântica de fail-closed** — default deve ser `allowed=false` até comprovar (padrão KYC/AML mundial)
4. **UI spec do estado BLOCKED** — componente que mostra missing_fields + conflicts + mensagem (hoje só tem mockup de Tela 8 Revisão; BLOCKED E2E pode ser outra tela ou banner global)
5. **Audit log spec** — tabela ou evento (hoje existe `audit_log` via `insertAuditLog`; pode-se reusar com `entity='archetype_gate'`)
6. **Lista exaustiva de pipelines a bloquear** — os 5 listados (RAG, perguntas, briefing, riscos, plano) cobrem tudo? Incluir Q1/Q2/Q3 separadamente? Action items pós-plano?

---

## Impacto na bateria de testes

A bateria v2 (50 cenários) precisa ser estendida na **rodada D** (contra v3):

| Novo cenário a adicionar | O que testa |
|---|---|
| Caso com arquetipo valido + eligibility=allowed | PASS, pipeline roda |
| Caso com arquetipo valido + eligibility=denied | **BLOCKED** (nova condição) |
| Caso com arquetipo invalido + eligibility=allowed | BLOCKED (condição 1 já coberta) |
| Caso com arquetipo invalido + eligibility=denied | BLOCKED (dupla negação) |
| Caso com eligibility=pending | **BLOCKED** até virar allowed |
| Caso com eligibility=manual_review | **BLOCKED** até operador decidir |

Sem a definição de `eligibility` pelo consultor, estes testes não podem ser especificados.

---

## Checklist de Claude Code antes de rodada D

- [ ] Consultor entrega SPEC v3 com 7 P0 resolvidos
- [ ] Consultor entrega definição de `eligibility.overall` (valores, critérios, inputs)
- [ ] Consultor entrega spec do gate E2E `STOP_IF_NOT_ELIGIBLE`
- [ ] Bateria v2 + novos cenários de eligibility consolidados em suite v3
- [ ] Runner atualizado para checar condição 1 E condição 2
- [ ] Rodada D executada contra spec v3
- [ ] REGRA-M1-GO-NO-GO re-avaliada (C1 + C2 + C3)

---

## Reafirmação de escopo (P.O., 2026-04-23)

> "**pode avançar sem implementar nada ainda**"

- Consultor: autorizado a produzir spec v3 + definir eligibility
- Claude Code: análise, validação, documentação
- Manus: suspenso de implementação até F1 aprovado
- Produção: intocada

Implementação M1 segue **suspensa**.
