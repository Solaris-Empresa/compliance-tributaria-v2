# Arquitetura RAG Automatizada — Híbrido + Human-in-the-Loop
## IA SOLARIS · Decisão estratégica de automação

> **Versão:** 1.0 | **Data:** 2026-03-26
> **Status:** Decisão tomada pelo P.O. — implementação faseada aprovada
> **Contexto:** Pós-Sprint G · Baseline v1.7 · Corpus 100% confiável
> **Repositório:** https://github.com/Solaris-Empresa/compliance-tributaria-v2

---

## Por que esta abordagem foi escolhida

A tabela de tradeoff comparou 5 abordagens. O Híbrido + Human-in-the-Loop foi o único que pontuou **Ideal** em adequação ao SOLARIS. As razões:

| Dimensão crítica | Por que importa para o SOLARIS |
|---|---|
| Risco de erro no banco: **Baixo** | O corpus alimenta diagnósticos jurídicos. Erro = advogado recebe análise incorreta. |
| Conformidade GRC: **Alta** | Você é especialista em GRC. Sem audit trail formal, a governança existe só no papel. |
| Aprovação P.O.: **Botão + contexto completo** | Você decide com informação — não às cegas como hoje. |
| Rastreabilidade: **Completa** | RFC + aprovação registrada. Quem aprovou, quando, com qual SQL, com qual dry-run. |
| Adequação: **Proativo + seguro + rastreável** | As três palavras que resumem o que o projeto precisava desde o início. |

As demais abordagens falharam em pelo menos uma dimensão crítica:
- **Agente autônomo:** aprovação ausente, risco alto. O Sprint G provou o motivo — a faixa 617–779 exigiu análise humana para não trocar um erro por outro.
- **Híbrido n8n + Claude API (sem human-in-loop):** boa base, mas conformidade GRC média e falta a interface de aprovação.
- **n8n puro:** resolve monitoramento, não resolve diagnóstico nem geração de RFC.

---

## O que "human-in-the-loop" significa de forma prática

Não significa que o humano gerencia a execução — significa que o humano **decide** se a execução acontece.

```
ANTES (hoje):
  Humano gerencia tudo: detecta, diagnostica,
  escreve RFC, escreve prompt, acompanha execução.
  Tempo: 2–4 horas por RFC.

DEPOIS (híbrido + HIL):
  Máquina detecta, diagnostica, escreve RFC, prepara execução.
  Humano recebe: "aqui está o problema, aqui está a solução,
  aqui está o dry-run, aqui está o rollback. Aprovar?"
  Tempo: 2 minutos por RFC.
```

O humano não sai do loop — ele **sobe de nível** no loop. De executor para decisor.

---

## Arquitetura completa

### Visão estrutural — 4 camadas

```
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 1 — OBSERVABILIDADE (n8n + tRPC)                   │
│  gold set a cada hora · alerta se confidence < 98%          │
│  issue GitHub automática · notificação e-mail/Slack          │
└───────────────────────────┬─────────────────────────────────┘
                            │ anomalia detectada
┌───────────────────────────▼─────────────────────────────────┐
│  CAMADA 2 — INTELIGÊNCIA (Claude API)                       │
│  diagnóstico contextual · classificação P0–P3               │
│  RFC completa com SQL cirúrgico · dry-run · rollback         │
└───────────────────────────┬─────────────────────────────────┘
                            │ RFC proposta
┌───────────────────────────▼─────────────────────────────────┐
│  CAMADA 3 — DECISÃO (Humano — P.O.)                        │
│  contexto completo em 1 tela · 1 clique · audit trail       │
│  P0/P1: sempre obrigatório · P2/P3: opcional na Fase 3      │
└───────────────────────────┬─────────────────────────────────┘
                            │ aprovação
┌───────────────────────────▼─────────────────────────────────┐
│  CAMADA 4 — EXECUÇÃO (Manus + n8n)                         │
│  dry-run → execução → validação gold set → PR automático    │
│  CORPUS-BASELINE.md atualizado · RFC → EXECUTED             │
└─────────────────────────────────────────────────────────────┘
```

---

## Fluxo detalhado — passo a passo

### Fluxo 1 — Ciclo proativo (nenhum humano acionou)

```
[n8n · a cada hora]
    → GET /trpc/ragInventory.getSnapshot
    → confidence = 100%, anomalies = 0
    → log "corpus ok · 2026-03-26T14:00:00Z"
    → dorme 1 hora

[n8n · hora seguinte]
    → GET /trpc/ragInventory.getSnapshot
    → confidence = 87.5%, anomalies = 1
    → DISPARA fluxo de diagnóstico ──►
```

### Fluxo 2 — Diagnóstico automático

```
[n8n monta payload]
    → snapshot completo (2.078 chunks, by_lei, anomalies, gold_set)
    → lê docs/rag/RAG-GOVERNANCE.md via GitHub API
    → lê docs/rag/CORPUS-BASELINE.md via GitHub API
    → lê docs/rag/RFC/CORPUS-RFC-001.md (exemplo canônico) via GitHub API

[POST Claude API]
    model: claude-sonnet-4-6
    system: [prompt do sistema SOLARIS — ver Seção 6]
    user: "Snapshot RAG: {payload}"

[Claude API responde]
    {
      "severidade": "P1",
      "lei_afetada": "lc227",
      "ids_afetados": [811, 812, 813],
      "causa_raiz": "3 chunks do Art. 3 da LC 227 com lei=lc214...",
      "impacto": "GS-03 falha — split payment não recuperável...",
      "rfc_numero": "003",
      "sql_execucao": "UPDATE ragDocuments SET lei='lc227'...",
      "sql_dry_run": "SELECT COUNT(*) FROM ragDocuments WHERE...",
      "sql_rollback": "UPDATE ragDocuments SET lei='lc214'...",
      "confiabilidade_esperada": 100.0
    }

[n8n]
    → cria docs/rag/RFC/CORPUS-RFC-003.md via GitHub API
    → cria issue GitHub "RFC-003 · P1 · lc227 · aguarda aprovação"
```

### Fluxo 3 — Aprovação human-in-the-loop

```
[n8n envia e-mail para P.O.]

  Assunto: [P1] RFC-003 · lc227 · 3 chunks · aprovação necessária

  Anomalia detectada no corpus RAG:
  ─────────────────────────────────
  Lei afetada:      lc227
  IDs afetados:     811, 812, 813 (3 chunks)
  Causa:            Art. 3 LC 227 com lei=lc214 incorreto
  Impacto:          GS-03 falha — split payment não recuperável

  SQL proposto:
  UPDATE ragDocuments SET lei='lc227', autor='rfc-003-auto'
  WHERE id IN (811, 812, 813) AND lei='lc214';

  Dry-run confirma: 3 registros afetados ✓
  Rollback disponível: sim ✓
  Confiabilidade esperada após: 100% ✓

  [ APROVAR ]    [ REJEITAR ]

  Ver RFC completa: github.com/.../CORPUS-RFC-003.md

[P.O. clica APROVAR]
    → webhook recebido pelo n8n
    → timestamp de aprovação registrado
    → RFC atualizada: "Aprovado por Uires Tapajós · 2026-03-26T14:07:23Z"
    → DISPARA execução ──►

[P.O. clica REJEITAR]
    → webhook recebido pelo n8n
    → issue fechada: "RFC-003 rejeitada pelo P.O. · motivo: [campo livre]"
    → log de auditoria registrado
    → FIM DO FLUXO
```

### Fluxo 4 — Execução e fechamento

```
[n8n dispara Manus via webhook]
    → prompt construído com RFC-003 completa
    → instrução: executar SQL, verificar, colar resultado

[Manus executa]
    → dry-run final: confirma 3 registros
    → UPDATE: 3 rows affected
    → verificação pós: lc227 | 3 | 811 | 813 ✓

[Manus reporta via webhook de retorno]
    → resultado da execução
    → resultado do gold set (8/8 verde)

[n8n recebe resultado]
    → valida gold set via ragInventory.getSnapshot
    → confidence = 100% ✓
    → commit: CORPUS-BASELINE.md v+1 atualizado
    → RFC-003: status → EXECUTED
    → issue GitHub: fechada como concluída
    → notificação P.O.: "RFC-003 executada com sucesso · corpus 100%"

[Resultado final]
    → ciclo completo: ~15 minutos
    → interação humana: 1 clique + 2 minutos de leitura
    → audit trail: completo e rastreável
```

---

## Conformidade GRC — o que o audit trail registra

Para cada RFC processada automaticamente, o sistema registra:

| Campo | Valor exemplo |
|---|---|
| RFC ID | CORPUS-RFC-003 |
| Detectado por | n8n scheduler · 2026-03-26T14:00:00Z |
| Anomalia | confidence=87.5%, GS-03 fail, ids 811-813 |
| Diagnóstico por | Claude API · claude-sonnet-4-6 |
| RFC gerada em | 2026-03-26T14:02:14Z |
| Aprovado por | Uires Tapajós |
| Aprovado em | 2026-03-26T14:07:23Z |
| Executado por | Manus AI |
| Executado em | 2026-03-26T14:09:41Z |
| Resultado | 3 rows affected · gold set 8/8 |
| Confiabilidade final | 100% |
| Rollback disponível | Sim · SQL documentado na RFC |

Isso responde as perguntas de qualquer auditoria: **quem**, **quando**, **o quê**, **por quê**, **como**, **resultado**.

---

## Regras de severidade — quando o humano é obrigatório

| Severidade | Definição | Human-in-loop | Justificativa |
|---|---|---|---|
| **P0 — Crítico** | Lei ativa com 0 chunks em produção | **Sempre obrigatório** | Impacto imediato em diagnósticos |
| **P1 — Alto** | Campo estrutural incorreto em faixa de ids | **Sempre obrigatório** | Risco de trocar erro por erro (lição Sprint G) |
| **P2 — Médio** | Chunk fragmentado, topicos incompletos | **Obrigatório na Fase 2** · opcional na Fase 3 | Padrão previsível, baixo risco |
| **P3 — Baixo** | Backlog, não urgente | **Opcional** | Pode esperar próxima sprint |

**Regra permanente:** P0/P1 sempre exigem aprovação humana. Nenhuma automação remove esse controle.

---

## Prompt do sistema Claude API — estrutura

O prompt do sistema é o componente mais crítico. Ele precisa conter:

```
SISTEMA:
Você é o Orquestrador de governança do corpus RAG da IA SOLARIS.

CONTEXTO DO PRODUTO:
- Plataforma de compliance da Reforma Tributária brasileira
- Corpus RAG: {N} chunks · {N} leis ativas
- Meta de confiabilidade: 98%
- Escopo: todas as empresas brasileiras (privadas, públicas, economia mista)

REGRAS DE GOVERNANÇA (resumo de RAG-GOVERNANCE.md):
- Nenhum UPDATE sem dry-run documentado
- Nenhum UPDATE sem SQL de rollback
- P0/P1 sempre exigem aprovação humana
- Toda RFC usa o template CORPUS-RFC-TEMPLATE.md

RACI:
- P.O. (Uires Tapajós): Accountable final para qualquer escrita no banco
- Orquestrador (você): Responsible pela análise e RFC
- Manus: executa após aprovação

EXEMPLOS CANÔNICOS (few-shot):
[conteúdo de CORPUS-RFC-001.md — fusão 810+811]
[conteúdo de CORPUS-RFC-002.md — UPDATE cirúrgico lc123]

TASK:
Dado o snapshot do corpus abaixo, identifique anomalias,
classifique por severidade (P0-P3), e gere a RFC completa
no formato JSON especificado.

FORMATO DE SAÍDA: JSON com campos [...]
```

---

## Implementação faseada

### Fase 1 · Monitoramento proativo (Sprint I)

**Duração:** ~2 semanas
**Esforço:** baixo — apenas n8n + endpoint existente

```
n8n workflow "rag-monitor":
  TRIGGER: cron (a cada hora)
  NODE 1: HTTP Request → GET /trpc/ragInventory.getSnapshot
  NODE 2: IF confidence < 98 OR anomalies > 0
    → NODE 3: GitHub API → criar issue
    → NODE 4: Send Email → notificar P.O.
  ELSE: log "ok" → fim
```

**Resultado:** você para de descobrir problemas reativamente.
**Risco:** zero.

---

### Fase 2 · RFC automática + aprovação (Sprint J) ★

**Duração:** ~4–6 semanas
**Esforço:** médio — Claude API + interface de aprovação

```
n8n workflow "rag-rfc-auto":
  TRIGGER: webhook (chamado pelo rag-monitor quando anomalia)
  NODE 1: GitHub API → ler docs de governança
  NODE 2: HTTP Request → POST Claude API (diagnóstico + RFC)
  NODE 3: GitHub API → commit RFC-NNN.md
  NODE 4: Send Email → aprovação com botões (Aprovar/Rejeitar)
  NODE 5: Wait for Webhook → aguardar decisão P.O.
    → APROVADO: NODE 6: webhook → Manus executa
    → REJEITADO: NODE 7: fechar issue + log

n8n workflow "rag-post-execution":
  TRIGGER: webhook (Manus reporta conclusão)
  NODE 1: HTTP Request → GET /trpc/ragInventory.getSnapshot
  NODE 2: GitHub API → atualizar CORPUS-BASELINE.md
  NODE 3: GitHub API → fechar RFC como EXECUTED
  NODE 4: Send Email → notificar P.O. com resultado
```

**Resultado:** ciclo RFC de 2–4 horas → ~15 minutos.
**Interação humana:** 1 clique + 2 minutos.

---

### Fase 3 · Auto-execução P2/P3 (Sprint L+)

**Duração:** ~2 semanas (incremental sobre Fase 2)

Adicionar ao workflow Fase 2:
```
NODE 5 (modificado):
  IF severidade IN [P2, P3] AND dry_run_ok = true:
    → não envia para aprovação
    → executa automaticamente
    → notifica P.O. pós-execução (informativo)
  IF severidade IN [P0, P1]:
    → aprovação obrigatória (igual Fase 2)
```

**Resultado:** P2/P3 resolvidos sem interrupção do P.O.
**Regra permanente:** P0/P1 sempre com aprovação humana.

---

## Interface de aprovação — especificação mínima

### Opção A — E-mail com botões (Fase 2)

Implementação via n8n "Send Email" node com HTML:

```html
<h2>RFC-NNN · Anomalia P1 · lc227 · aprovação necessária</h2>

<table>
  <tr><td>Lei afetada</td><td>lc227</td></tr>
  <tr><td>IDs afetados</td><td>811, 812, 813</td></tr>
  <tr><td>Causa</td><td>Art. 3 LC 227 com lei=lc214</td></tr>
  <tr><td>Dry-run</td><td>3 registros confirmados ✓</td></tr>
  <tr><td>Rollback</td><td>disponível ✓</td></tr>
  <tr><td>Confiabilidade após</td><td>100% ✓</td></tr>
</table>

<p>SQL: UPDATE ragDocuments SET lei='lc227'...</p>

<a href="https://n8n.solaris.app/webhook/approve/RFC-003">
  ✅ APROVAR
</a>

<a href="https://n8n.solaris.app/webhook/reject/RFC-003">
  ❌ REJEITAR
</a>
```

Zero desenvolvimento frontend. Implementado em horas.

### Opção B — Página admin no SOLARIS (Fase 3)

`/admin/rfc-approval` — lista RFCs pendentes com contexto completo, botões de aprovação, histórico de decisões. Mais esforço, melhor UX para volume maior.

**Recomendação:** Opção A para Fase 2, Opção B para Fase 3 se o volume justificar.

---

## Infraestrutura n8n — recomendação

### Self-hosted via Docker (recomendado)

```yaml
# docker-compose.yml no ambiente Manus
version: '3'
services:
  n8n:
    image: n8nio/n8n
    environment:
      - N8N_BASIC_AUTH_USER=solaris
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - DB_TYPE=sqlite
      - DATABASE_URL=${DATABASE_URL}  # mesmo do projeto
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
```

**Vantagens:** gratuito, dados no mesmo ecossistema, acesso direto ao banco TiDB Cloud via variáveis de ambiente já existentes.

**Alternativa:** n8n Cloud (~$20/mês) se Docker não estiver disponível no Manus.

---

## Conexão com o que já existe no projeto

O endpoint `ragInventory.getSnapshot` (Sprint H em andamento) é a fundação de toda essa automação. O n8n apenas chama o mesmo endpoint que o cockpit usa — de forma agendada e programática.

```
Sprint H  → ragInventory.getSnapshot ← FUNDAÇÃO (em andamento)
Sprint H  → RAG Cockpit ao vivo
Sprint I  → n8n Fase 1: monitoramento agendado
Sprint J  → n8n Fase 2: Claude API + RFC + aprovação  ← OBJETIVO
Sprint L+ → n8n Fase 3: auto-execução P2/P3
```

Tudo que foi construído nas Sprints A–G (governança, baseline, RFCs, gold set, RACI, processos) alimenta o prompt do sistema do Claude API. Nenhum trabalho foi em vão — ele vira o contexto que torna o diagnóstico automático preciso.

---

## O que muda para o P.O.

| Hoje | Com Híbrido + HIL |
|---|---|
| Descobre problema quando alguém reclama | Recebe alerta antes do problema impactar |
| Passa horas gerenciando diagnóstico | Recebe diagnóstico pronto em minutos |
| Aprova SQL em chat sem contexto estruturado | Aprova com contexto completo em 1 clique |
| Audit trail fragmentado em sessões | Audit trail completo e formal |
| Dependente de disponibilidade de sessão Claude | Processo roda independente de sessão |
| Gestão reativa | Gestão proativa + reativa |

---

## O que não muda

Independente da automação, estes controles permanecem:

- ❌ Nenhum UPDATE em P0/P1 sem aprovação explícita do P.O.
- ❌ Nenhuma RFC sem dry-run documentado
- ❌ Nenhuma execução sem SQL de rollback registrado
- ✅ Toda decisão com audit trail
- ✅ CORPUS-BASELINE.md sempre atualizado pós-execução
- ✅ Gold set validado após qualquer mudança no banco

A automação não remove os controles — ela os executa de forma consistente, sem depender de memória humana ou disponibilidade de sessão.

---

*Documento de decisão estratégica · IA SOLARIS*
*Gerado pelo Orquestrador (Claude) · 2026-03-26*
*Sessão de brainstorming aprovada pelo P.O. (Uires Tapajós)*
*Próximo passo: abrir issues Sprint I (Fase 1) e Sprint J (Fase 2) no GitHub*
*Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
