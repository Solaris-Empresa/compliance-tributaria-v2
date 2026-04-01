# Post-mortem — [título do bug]
> **Gate 4 — IA SOLARIS v5.0** · Blameless Culture · Foco em sistemas, não em pessoas  
> **Regra:** Todo bug em produção que passou pelos Gates 1–3 requer um post-mortem.  
> **Output obrigatório:** pelo menos 1 item de melhoria em um gate existente.

**Data:** YYYY-MM-DD | **Severidade:** P0/P1/P2 | **MTTR:** Xh Ymin  
**Autores:** [Claude, P.O.]  
**Issue relacionada:** [#N]

---

## 1. Sumário executivo (3 linhas máximo)

[O que aconteceu, por quanto tempo, qual o impacto]

---

## 2. Timeline

| Horário | Evento |
|---|---|
| HH:MM | Anomalia detectada por [observabilidade / usuário] |
| HH:MM | Gate 3 acionado — Passo 0 iniciado |
| HH:MM | Causa raiz identificada |
| HH:MM | Fix implementado |
| HH:MM | Fix mergeado em produção |
| HH:MM | Verificação de resolução |

**MTTR calculado:** `t_merge - t_anomalia` = ___

---

## 3. Causa raiz — 5 Whys

```
Por que o bug ocorreu?          → [resposta 1]
Por que [resposta 1] aconteceu? → [resposta 2]
Por que [resposta 2] aconteceu? → [resposta 3]
Por que [resposta 3] aconteceu? → [resposta 4]
Por que [resposta 4] aconteceu? → [causa raiz sistêmica]
```

**Causa raiz sistêmica:** [1 frase — o que no processo/gate permitiu este bug]

---

## 4. O que funcionou bem

[Gates, processos ou ferramentas que ajudaram a detectar ou limitar o impacto]

---

## 5. O que pode melhorar

[Oportunidades de melhoria — nunca culpar pessoas]

---

## 6. Ações corretivas (obrigatórias)

| Ação | Gate afetado | Responsável | Prazo |
|---|---|---|---|
| Adicionar padrão ao Passo 0 | Gate 3 | Claude | Imediato |
| Atualizar tabela de erros | Skill solaris-orquestracao | Manus | PR desta sprint |
| Criar teste de regressão | Gate 2 Q5 | Manus | PR desta sprint |
| [Outra ação específica] | [Gate N] | [Agente] | [Prazo] |

> **Regra:** Toda ação que melhora um gate deve ser implementada antes do início da próxima sprint.

---

## 7. Métricas DORA impactadas

| Métrica | Valor real | Meta |
|---|---|---|
| MTTR | [valor] | P0: < 1h / P1: < 4h |
| Change failure rate | +1 ocorrência esta sprint | < 5% |
| Lead time para o fix | [valor] | < 1 dia |

---

## 8. Loop de aprendizado — o que muda nos gates

```
Bug em produção
    ↓
Post-mortem → ação de melhoria identificada
    ↓
PR de chore: tabela de erros + Passo 0 + skill atualizado
    ↓
Na próxima sprint: Passo 0 resolve esse padrão em 1 mensagem
```

**Padrão adicionado ao Passo 0:** [sintoma → comando direto]

---

*IA SOLARIS · Gate 4 Post-mortem · v5.0 · Blameless Culture*  
*Arquivo: `docs/governance/post-mortems/YYYY-MM-DD-titulo.md`*
