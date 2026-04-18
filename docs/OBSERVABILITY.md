# Observabilidade — Pipeline CNAE Discovery

> **Versão:** 5.6.0 — Atualizado em 2026-03-21  
> **Escopo:** Endpoints de diagnóstico, tracing estruturado e alertas automáticos do pipeline de identificação de CNAEs por IA.

---

## Visão Geral

O pipeline CNAE Discovery é o componente central da plataforma: converte a descrição textual de um negócio em códigos CNAE (Classificação Nacional de Atividades Econômicas) usando embeddings semânticos e GPT-4.1. A partir da Sprint v5.4.0, o pipeline conta com três camadas de observabilidade:

| Camada | Ferramenta | Propósito |
|---|---|---|
| **Health Check** | `GET /api/health/cnae` | Status instantâneo de todos os componentes |
| **Validação On-Demand** | `GET /api/health/cnae/validate` | Executa 4 casos canônicos e mede qualidade |
| **Tracing por Requisição** | `server/tracer.ts` | Latência por etapa, `requestId` único, diagnóstico de falhas |
| **Alerta de Deploy** | `notifyOwner()` no startup | Confirmação automática de versão em produção |

---

## 1. Endpoint `GET /api/health/cnae`

Retorna o status completo do pipeline em JSON. Não requer autenticação. Ideal para monitoramento externo (UptimeRobot, Grafana, etc.).

### Resposta de exemplo (status `ok`)

```json
{
  "status": "ok",
  "version": "5.6.0",
  "timestamp": "2026-03-21T12:00:00.000Z",
  "components": {
    "openaiKey": {
      "ok": true,
      "prefix": "sk-proj-AB...",
      "message": "Chave configurada"
    },
    "embeddingsDb": {
      "ok": true,
      "count": 1332,
      "expected": 1332,
      "coverage": 100,
      "lastUpdated": "2026-03-18T17:24:29.000Z",
      "message": "1332/1332 CNAEs (100%)"
    },
    "embeddingsCache": {
      "ok": true,
      "loaded": true,
      "size": 1332,
      "ageMinutes": 2,
      "message": "Cache carregado: 1332 vetores, 2min atrás"
    },
    "lastRebuild": {
      "ok": true,
      "status": "completed",
      "cnaesProcessed": 1332,
      "durationMs": 187432,
      "timestamp": "2026-03-18T17:24:29.000Z",
      "message": "Último rebuild: completed em 187s"
    }
  }
}
```

### Tabela de status possíveis

| `status` | HTTP | Significado |
|---|---|---|
| `"ok"` | 200 | Todos os componentes funcionais |
| `"degraded"` | 200 | Cache não carregado ou rebuild pendente (pipeline funciona, mas com latência extra) |
| `"down"` | 503 | Chave OpenAI ausente ou embeddings insuficientes (<95% de cobertura) |

### Quando usar

Execute este endpoint para diagnóstico rápido sem acesso a logs:

```bash
curl https://iasolaris.manus.space/api/health/cnae | jq .
```

---

## 2. Endpoint `GET /api/health/cnae/validate`

Executa 4 casos canônicos de busca semântica e retorna o resultado completo. Útil para verificar a qualidade do pipeline após um rebuild ou deploy.

### Casos de teste canônicos

| Query | CNAE Esperado | Descrição |
|---|---|---|
| "fabricação de cerveja artesanal stout e trapista" | `1113-5/02` | Fabricação De Cervejas E Chopes |
| "desenvolvimento de software aplicativo mobile" | `6201-5/01` | Desenvolvimento De Programas Sob Encomenda |
| "restaurante e lanchonete alimentação" | `5611-2/01` | Restaurantes E Similares |
| "comércio varejista de medicamentos farmácia drogaria" | `4771-7/01` | Comércio Varejista De Produtos Farmacêuticos |

### Resposta de exemplo

```json
{
  "startedAt": "2026-03-21T12:38:40.859Z",
  "finishedAt": "2026-03-21T12:38:43.672Z",
  "success": true,
  "durationMs": 2813,
  "embeddingCount": 1332,
  "expectedCount": 1332,
  "coverage": 100,
  "dimensionCheck": true,
  "cases": [
    {
      "query": "fabricação de cerveja artesanal stout e trapista",
      "expectedCode": "1113-5/02",
      "found": true,
      "rank": 1,
      "topResults": ["1113-5/02 (62%)", "1113-5/01 (52%)", "1111-9/02 (49%)"],
      "durationMs": 1649
    }
  ],
  "failedCases": [],
  "summary": "✅ Pipeline CNAE validado: 1332 embeddings (100%), 4/4 casos passaram em 3s"
}
```

### Códigos HTTP

- **200** — `success: true` — pipeline saudável
- **503** — `success: false` — um ou mais casos falharam ou cobertura insuficiente

```bash
# Verificação rápida após deploy
curl -s https://iasolaris.manus.space/api/health/cnae/validate | jq '.summary'
```

---

## 3. Endpoint `GET /api/version`

Retorna metadados do build atual em produção. Permite confirmar que o deploy está rodando o código correto.

```json
{
  "version": "5.6.0",
  "gitHash": "7252416",
  "commitTime": "2026-03-21T11:45:00.000Z",
  "commitMessage": "Checkpoint: Sprint v5.6.0...",
  "serverTime": "2026-03-21T12:00:00.000Z",
  "env": "production",
  "uptimeSeconds": 3600,
  "nodeVersion": "v22.13.0",
  "howToVerify": "Compare gitHash com os primeiros 7 chars do ID do checkpoint Manus publicado"
}
```

**Como verificar o deploy:**
1. Anote o ID do checkpoint publicado no painel Manus (ex: `72524167`)
2. Execute `curl https://iasolaris.manus.space/api/version | jq .gitHash`
3. Os primeiros 7 chars devem coincidir: `7252416`

---

## 4. Tracing Estruturado

Cada chamada ao `extractCnaes` e `refineCnaes` gera um `requestId` único de 8 chars e registra 9 etapas com latência individual nos logs do servidor.

### Etapas instrumentadas

| Etapa | Descrição |
|---|---|
| `start` | Início da chamada, parâmetros de entrada |
| `project_loaded` | Projeto carregado do banco de dados |
| `embedding_context_start` | Início da construção do contexto semântico |
| `embedding_context_done` | Contexto construído (inclui Company Profile se disponível) |
| `llm_call_start` | Chamada ao GPT-4.1 iniciada |
| `llm_call_done` | Resposta do LLM recebida e parseada |
| `llm_call_error` | Falha na chamada LLM (ativa fallback semântico) |
| `serialize_start` | Início da serialização dos CNAEs para resposta |
| `serialize_done` / `finish` | Resposta pronta, latência total |

### Formato dos logs

```
{"trace":"step","requestId":"A1B2C3D4","operation":"extractCnaes","step":"llm_call_done","t":1823,"durationMs":1823,"cnaesCount":3}
{"trace":"finish","requestId":"A1B2C3D4","operation":"extractCnaes","totalMs":2145,"status":"ok","cnaesCount":3}
```

### Como usar para diagnóstico

Quando o usuário reportar "Nenhum CNAE identificado":

1. Reproduza o erro e anote o horário aproximado.
2. No painel de logs do servidor, filtre por `[TRACE` ou pelo `requestId`.
3. Identifique a última etapa registrada — ela indica onde o pipeline parou:
   - Parou em `llm_call_start` sem `llm_call_done` → timeout ou erro de rede para a OpenAI.
   - Parou em `llm_call_error` → GPT-4.1 retornou erro (verifique `OPENAI_API_KEY`).
   - Parou em `embedding_context_done` sem `llm_call_start` → erro na construção do contexto.

### Configuração do nível de log

Defina a variável de ambiente `TRACE_LEVEL` no painel Secrets:

| Valor | Comportamento |
|---|---|
| `"debug"` (padrão em dev) | Todas as etapas registradas |
| `"info"` (recomendado em produção) | Apenas `start` e `finish` |
| `"off"` | Tracing desabilitado |

---

## 5. Warm-up do Cache no Startup

A partir da v5.6.0, o servidor chama `warmUpEmbeddingCache()` durante a inicialização (via `setImmediate`, sem bloquear o `server.listen`). Os 1.332 vetores de embeddings são carregados em memória antes da primeira requisição do usuário.

**Log esperado no startup:**
```
[startup] ✅ Cache de embeddings pré-carregado: 1332 CNAEs em 342ms
```

Se este log não aparecer após um deploy, verifique o `/api/health/cnae` — o campo `embeddingsCache.loaded` indicará `false` e o status será `"degraded"`.

---

## 6. Alerta Automático de Deploy

Em `NODE_ENV=production`, o servidor envia uma notificação ao owner via `notifyOwner()` a cada restart/deploy com:

- Versão semântica (`5.6.0`)
- Git hash (`7252416`)
- Commit message
- Ambiente (`production`)
- Versão do Node.js
- Timestamp ISO

Isso permite confirmar imediatamente que o deploy correto está no ar, sem precisar acessar logs ou o painel de gerenciamento.

---

## 7. Validação Automática Semanal

O `embeddings-scheduler.ts` executa um rebuild completo dos embeddings toda segunda-feira às 03:00 BRT (`0 3 * * 1`). Após cada rebuild bem-sucedido, o `cnae-pipeline-validator.ts` é executado automaticamente e envia o resultado via `notifyOwner()`.

**Resultado esperado na notificação:**
```
✅ Validação CNAE pós-rebuild: 4/4 casos passaram
  1113-5/02 rank #1 (62%) — cerveja artesanal
  6201-5/01 rank #3 (46%) — software mobile
  5611-2/01 rank #5 (48%) — restaurante
  4771-7/01 rank #1 (69%) — farmácia
```

---

## Referência Rápida de Diagnóstico

| Sintoma | Endpoint a consultar | Campo a verificar |
|---|---|---|
| "Nenhum CNAE identificado" | `/api/health/cnae` | `components.openaiKey.ok`, `components.embeddingsCache.loaded` |
| Latência alta na extração | Logs do servidor | `[TRACE] totalMs` por `requestId` |
| Deploy desatualizado | `/api/version` | `gitHash` vs. ID do checkpoint |
| Pipeline degradado após rebuild | `/api/health/cnae/validate` | `success`, `failedCases` |
| Cache não carregado | `/api/health/cnae` | `embeddingsCache.loaded` |
