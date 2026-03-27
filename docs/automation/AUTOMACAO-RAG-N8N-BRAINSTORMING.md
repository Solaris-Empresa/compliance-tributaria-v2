# Automação do Ciclo de Vida RAG — IA SOLARIS
## Brainstorming: n8n + Claude API + Human-in-the-Loop

> **Sessão:** 2026-03-26
> **Contexto:** Sprint G concluída · Baseline v1.7 · Corpus 100% confiável
> **Status:** Documento de decisão estratégica — ainda não implementado
> **Repositório:** https://github.com/Solaris-Empresa/compliance-tributaria-v2

---

## 1. O problema que motiva esta decisão

### Estado atual — gestão reativa

Toda RFC do corpus RAG exige um ciclo manual que consome 2–4 horas:

| Etapa | Responsável | Tempo |
|---|---|---|
| Detectar anomalia | Humano (reporta ou P.O. percebe) | Variável — geralmente tarde |
| Solicitar diagnóstico ao Manus | P.O. via sessão Claude | 30 min |
| Manus executa queries e reporta | Manus | 30–60 min |
| Orquestrador analisa (Claude) | Claude — nova sessão, sem memória | 30 min |
| Iterar (queries adicionais) | Múltiplos agentes | 30–90 min |
| RFC escrita manualmente | Orquestrador | 30 min |
| P.O. aprova | P.O. | 10 min |
| Execução + validação | Manus | 30 min |
| **Total por RFC** | — | **2–4 horas** |

**Evidência real:** na Sprint G, foram necessárias 5 rodadas de diagnóstico (D-01, D-02a, D-02b, D-02c, D-02d) antes de autorizar o primeiro UPDATE. Sem automação, esse ciclo se repetirá integralmente em toda RFC futura.

### O objetivo

> **Proativo e reativo. Automatizado de ponta a ponta. Ciclo de vida completo do RAG.**

---

## 2. Por que o modelo híbrido — não automação total nem manual

### Por que agente autônomo puro é prematuro

O diagnóstico da Sprint G ilustra o risco: a faixa 617–779 parecia simples ("163 chunks com lei errada"), mas exigiu 4 rodadas de análise humana para descobrir 3 grupos distintos com leis diferentes. Um agente autônomo teria feito o UPDATE em bloco e criado um corpus pior do que o anterior.

O corpus ainda está em maturação — não tem massa crítica de padrões estáveis suficientes para confiar em execução autônoma completa em operações P0/P1.

### Por que n8n puro não resolve

n8n é excelente para fluxos determinísticos, mas o ciclo de vida do RAG tem duas etapas que exigem raciocínio contextual:

1. **Diagnóstico** — interpretar o que os dados significam no contexto de lei tributária brasileira
2. **Geração da RFC** — propor o SQL correto com as condições exatas

Sem Claude API no meio, você tem um sistema que detecta o problema mas não sabe o que fazer com ele.

### O princípio do híbrido

> Cada componente faz o que faz melhor.

| Componente | Responsabilidade | Não faz |
|---|---|---|
| **n8n** | Orquestra eventos, agenda tarefas, move dados, dispara webhooks | Não raciocina |
| **Claude API** | Analisa, interpreta, diagnostica, propõe | Não executa |
| **Humano (P.O.)** | Aprova ou rejeita operações de risco | Não gerencia execução |
| **Manus** | Executa código e banco, após aprovação | Não decide |

---

## 3. Arquitetura — fluxo completo

### Visão geral do ciclo

```
BANCO (ragDocuments)
    │
    ▼ a cada hora
n8n scheduler ──► getSnapshot via tRPC ──► confidence < 98%?
                                                   │
                              NÃO ◄────────────────┤
                           (log + dorme)           │ SIM
                                                   ▼
                                          issue GitHub + alerta
                                                   │
                                                   ▼
                                    n8n monta payload completo
                                    (snapshot + governance docs)
                                                   │
                                                   ▼
                                           Claude API
                                      diagnóstico + RFC gerada
                                      SQL + dry-run + rollback
                                                   │
                                                   ▼
                                    commit RFC no GitHub
                                                   │
                                                   ▼
                                    interface de aprovação P.O.
                                    (anomalia + SQL + dry-run)
                                                   │
                              REJEITA ◄────────────┤
                           (issue fechada + log)   │ APROVA
                                                   ▼
                                    n8n webhook → Manus executa
                                                   │
                                                   ▼
                                    n8n valida gold set auto
                                                   │
                                                   ▼
                                    RFC → EXECUTED
                                    baseline auto-atualizado
                                                   │
                                                   ▼ loop
                                    ↻ próximo ciclo (1 hora)
```

---

## 4. Detalhe de cada componente

### 4.1 n8n — motor de orquestração

O n8n não toma nenhuma decisão. É puro sequenciamento de eventos.

**Agendamentos (proativo):**
- Executa `ragInventory.getSnapshot` via HTTP/tRPC a cada hora
- Se `confidence < 98` ou `anomalies > 0` → dispara fluxo de diagnóstico
- Se tudo verde → registra log e dorme

**Gatilhos por evento (reativo):**
- PR mergeado em `docs/rag/` → roda gold set imediatamente
- Nova lei detectada no corpus → cria issue de revisão
- RFC aberta há > 5 dias sem movimento → notifica P.O.
- Confiabilidade cai > 5 pontos percentuais → alerta urgente

**Orquestração de aprovação:**
- RFC gerada pelo Claude API → cria entrada na interface de aprovação
- Envia e-mail com link direto (dois botões: Aprovar / Rejeitar)
- Aguarda resposta do webhook
- Se aprovado → dispara Manus com prompt RFC
- Se rejeitado → fecha issue com motivo registrado

**Por que n8n e não código customizado:**
Visual builder auditável por qualquer pessoa sem programar. Cada fluxo é um diagrama — alinha com a necessidade de governança transparente e rastreável.

---

### 4.2 Claude API — motor de raciocínio

Entra em dois momentos específicos, não em todos.

**Momento 1 — Diagnóstico**

Recebe:
- Snapshot completo do `ragInventory.getSnapshot` (totais, distribuição por lei, anomalias, gold set, histórico de ingestões)
- Contexto de governança: `RAG-GOVERNANCE.md`, `RAG-PROCESSO.md`, `CORPUS-BASELINE.md`
- Exemplos canônicos: RFC-001 e RFC-002 como few-shot

Produz:
- Classificação da anomalia (P0/P1/P2/P3)
- Análise da causa raiz em linguagem natural
- Grupo afetado (qual lei, quais IDs, qual padrão)
- Risco para o corpus e para os diagnósticos dos advogados

**Momento 2 — Geração da RFC**

A partir do diagnóstico, gera `CORPUS-RFC-NNN.md` completo:
- SQL de execução cirúrgico com condições WHERE específicas
- Dry-run (SELECT que confirma escopo)
- Verificação pós-execução
- SQL de rollback
- Seções de aprovação com checkboxes

**Prompt do sistema (crítico):**
O prompt precisa conter o contexto do SOLARIS, as regras da RACI, e os exemplos canônicos das RFCs anteriores. Com o contexto certo, o Claude API produz RFCs no mesmo padrão validado nas sessões de orquestramento.

**Custo real:**
Claude API só é chamado quando uma anomalia é detectada — não a cada hora. Para um corpus que muda a cada sprint: ~2 a 4 chamadas por mês. Custo marginal.

---

### 4.3 Humano (P.O.) — ponto de controle estratégico

O redesenho mais importante: o P.O. sai do loop de gerenciamento e entra apenas no ponto de decisão de risco.

**Interface de aprovação — conteúdo mínimo:**

```
╔══════════════════════════════════════════════════════╗
║  RFC-NNN · Anomalia P1 · lc227 · 2026-03-26         ║
╠══════════════════════════════════════════════════════╣
║  O que foi detectado                                  ║
║  → 15 chunks com campo lei incorreto (lc227 / lc214) ║
║                                                      ║
║  O que o Claude diagnosticou                         ║
║  → Artigos Art. 2 e Art. 3 da LC 227 ingeridos com  ║
║    lei=lc214. Queries sobre lc227 retornam 0.        ║
║                                                      ║
║  SQL que será executado                              ║
║  UPDATE ragDocuments SET lei='lc227'                 ║
║  WHERE id BETWEEN 812 AND 826 AND lei='lc214';      ║
║                                                      ║
║  Dry-run: 15 registros afetados ✓                   ║
║  Rollback disponível: sim ✓                          ║
║  Confiabilidade esperada após: 100% ✓               ║
║                                                      ║
║  [  APROVAR  ]        [  REJEITAR  ]                 ║
╚══════════════════════════════════════════════════════╝
```

**Tempo de decisão:** 2 minutos.
**Audit trail:** gerado automaticamente com timestamp, decisão e motivo.

**Regra de severidade:**
- P0/P1 → aprovação humana obrigatória sempre
- P2/P3 → aprovação humana na Fase 2; auto-execução possível na Fase 3

---

### 4.4 Manus — executor

O papel do Manus não muda — ele continua sendo o executor. O que muda é como recebe as instruções: em vez do P.O. escrever o prompt manualmente em uma sessão, o n8n dispara um webhook com o prompt já construído pela Claude API.

Manus executa → verifica → reporta resultado → n8n capta via webhook → valida gold set automaticamente.

---

## 5. Implementação faseada

### Fase 1 — Monitoramento (Sprint H/I) · ~2 semanas

**Entrega:** n8n rodando gold set a cada hora, alertas proativos funcionando.

Fluxo a implementar:
- `ragInventory.getSnapshot` via HTTP request agendado
- Comparação com threshold (98%)
- Criação de issue no GitHub via API
- Notificação por e-mail/Slack

**Valor imediato:** você para de descobrir problemas quando o advogado reclama. O sistema notifica antes.

**Risco:** zero. Nenhum banco tocado. Somente leitura.

---

### Fase 2 — Diagnóstico + RFC automática (Sprint J/K) · ~4–6 semanas ★ recomendada

**Entrega:** anomalia detectada → Claude API analisa → RFC gerada → P.O. aprova com 1 clique → Manus executa.

Fluxo adicional:
- n8n monta payload com snapshot + docs de governança
- Chamada à Claude API com prompt do sistema SOLARIS
- Commit automático da RFC no GitHub
- Interface de aprovação (e-mail com botões ou página simples)
- Webhook de retorno para disparar Manus
- Validação automática do gold set pós-execução

**Valor:** elimina o ciclo de diagnóstico manual de 2–4 horas por RFC.

**Risco:** médio. Exige validação do prompt do sistema Claude antes de produção.

---

### Fase 3 — Auto-execução P2/P3 (Sprint L+)

**Entrega:** RFCs de baixo risco executadas automaticamente após dry-run positivo.

Critério de auto-execução:
- Severidade P2 ou P3 (nunca P0/P1)
- Dry-run retorna resultado esperado (escopo confirmado)
- Gold set antes: sem anomalia nova além da detectada
- Rollback documentado e verificado

P0/P1: aprovação humana obrigatória permanece para sempre.

---

## 6. Três perguntas que definem a implementação

### Pergunta 1 — Onde fica a interface de aprovação?

**Opção A (mais simples):** e-mail com dois botões (Aprovar / Rejeitar) que são links para webhooks n8n. Zero desenvolvimento frontend. n8n tem esse padrão nativo com o node "Wait for webhook".

**Opção B (mais rica):** página simples no próprio SOLARIS (`/admin/rfc-approval`) que lista RFCs pendentes com contexto completo. Mais esforço, melhor UX para volume maior de RFCs.

**Recomendação para Fase 2:** Opção A — rápido de implementar, suficiente para o volume atual.

---

### Pergunta 2 — Onde roda o n8n?

**Opção A:** n8n Cloud gerenciado (~$20/mês). Zero infraestrutura. Ideal para começar.

**Opção B:** n8n self-hosted via Docker no ambiente do Manus. Gratuito, mais controle, dados no mesmo ecossistema do projeto.

**Recomendação:** Opção B se o Manus já tem Docker disponível — integra com o banco TiDB Cloud diretamente via variáveis de ambiente já existentes.

---

### Pergunta 3 — Qual é o primeiro fluxo a implementar?

Monitoramento — o fluxo mais simples, mais valioso imediatamente, e que não toca no banco.

Em uma semana você teria:
- Gold set executado a cada hora
- Alerta automático se confiabilidade cair
- Issue criada automaticamente no GitHub
- Notificação por e-mail

Sem nenhum risco técnico. Puro ganho de visibilidade proativa.

---

## 7. Decisões pendentes (P.O.)

| Decisão | Opções | Impacto |
|---|---|---|
| Interface de aprovação | E-mail com botões vs página admin | Tempo de implementação |
| Infraestrutura n8n | Cloud ($20/mês) vs self-hosted | Controle vs simplicidade |
| Primeiro fluxo | Monitoramento (recomendado) vs diagnóstico completo | Risco vs valor imediato |
| Threshold de auto-execução P2/P3 | Implementar na Fase 3 ou nunca | Grau de autonomia |

---

## 8. O que não muda

Independente da automação:

- ❌ Nenhum UPDATE em P0/P1 sem aprovação explícita do P.O.
- ❌ Nenhuma RFC sem dry-run documentado
- ❌ Nenhuma execução sem SQL de rollback
- ✅ Toda decisão registrada com audit trail
- ✅ CORPUS-BASELINE.md sempre atualizado pós-execução
- ✅ Gold set validado após qualquer mudança no banco

A automação não remove os controles — ela os executa de forma consistente, sem depender de memória humana ou disponibilidade de sessão.

---

## 9. Conexão com o que já existe

A Sprint H já construiu o `ragInventory.getSnapshot` — o endpoint tRPC que é a fonte de dados de toda essa automação. O cockpit ao vivo (`/admin/rag-cockpit`) já consome esses dados.

O n8n simplesmente chama o mesmo endpoint que o cockpit usa, de forma agendada e automatizada.

**Sequência de implementação natural:**
```
Sprint H  → ragInventory.getSnapshot (concluído)
Sprint H  → cockpit ao vivo (em andamento)
Sprint I  → n8n Fase 1: monitoramento agendado
Sprint J  → n8n Fase 2: Claude API + RFC automática + aprovação
Sprint L+ → n8n Fase 3: auto-execução P2/P3
```

---

*Documento gerado pelo Orquestrador (Claude) · 2026-03-26*
*Sessão de brainstorming — não é uma RFC nem um compromisso de sprint*
*Para converter em sprint: abrir issue com escopo definido e aprovação do P.O.*
*Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
