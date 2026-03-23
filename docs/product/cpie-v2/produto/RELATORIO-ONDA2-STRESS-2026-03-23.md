# Relatório da Onda 2 de Testes — Stress, Carga e Concorrência

**Data de execução:** 23 de março de 2026  
**Ambiente:** Produção (TiDB/MySQL via DATABASE_URL)  
**Executor:** Manus AI (automático)  
**Baseline do sistema:** 2.137 projetos totais | 500 ativos | 18 aprovados | 274 divergências Shadow Mode

---

## Sumário Executivo

A Onda 2 de testes automáticos foi executada com sucesso em **23/03/2026**, validando a robustez da plataforma sob condições de carga, concorrência e stress. Todos os **32 testes em 4 suites** passaram sem falhas, com tempo total de execução de **1,19 segundos** (2,00s de tempo de teste efetivo). Nenhuma regressão foi introduzida nos 75 testes da Onda 1, totalizando **107/107 asserções aprovadas** na suite combinada.

| Métrica | Resultado |
|---|---|
| Total de testes (Onda 2) | 32/32 ✅ |
| Total combinado (Onda 1 + 2) | 107/107 ✅ |
| Regressões introduzidas | 0 |
| Tempo de execução (Onda 2) | 1,19s |
| Deadlocks detectados | 0 |
| Corrupções de dados detectadas | 0 |

---

## Problema Corrigido: Arquitetura de Conexão

Os testes T11 a T14 foram inicialmente implementados com `mysql2.createConnection()` (conexão única por arquivo). Quando executados em paralelo pelo Vitest, o `afterAll` de um arquivo fechava a conexão antes dos demais testes terminarem, causando falhas em cascata.

A correção aplicada foi migrar todos os arquivos para `mysql2.createPool()` com `connectionLimit` configurado por suite:

| Suite | Pool | connectionLimit |
|---|---|---|
| T11 (carga) | `pool` | 20 |
| T12 (timeout IA) | `poolT12` | 5 |
| T13 (7 CNAEs) | `poolT13` | 10 |
| T14 (retrocesso) | `pool` | 5 |

Cada suite possui seu próprio pool independente, eliminando o conflito de `afterAll` entre arquivos.

---

## T11 — Carga: 50 Projetos em Paralelo (9 asserções)

Este teste valida o comportamento do sistema sob criação massiva e concorrente de projetos.

| Teste | Descrição | Resultado | Métrica |
|---|---|---|---|
| T11.1 | Cria 50 projetos em paralelo sem erro | ✅ | 50/50 em 141ms |
| T11.2 | Todos os 50 projetos têm IDs únicos (sem colisão) | ✅ | 50 IDs distintos |
| T11.3 | Todos os 50 projetos têm status `rascunho` correto | ✅ | 0 status incorretos |
| T11.4 | Atualização concorrente de status em 50 projetos sem deadlock | ✅ | 50 updates em 38ms |
| T11.5 | Integridade após atualização paralela | ✅ | 0 status incorretos |
| T11.6 | Race condition: dois updates simultâneos — último vence | ✅ | Estado consistente |
| T11.7 | Leitura concorrente de 50 projetos sem erro | ✅ | 50 leituras em 32ms |
| T11.8 | Inserção de 50 respostas de questionário em paralelo | ✅ | 50 inserts em 34ms |
| T11.9 | Contagem final: exatamente 50 projetos no banco | ✅ | COUNT = 50 |

**Throughput observado:** 50 projetos criados em 141ms = **354 projetos/segundo**. O limite de 10 segundos estabelecido como critério mínimo foi superado em 98,6%.

---

## T12 — Resiliência a Timeout de IA (6 asserções)

Este teste valida que o sistema mantém integridade de dados quando a geração de IA falha ou é interrompida, sem corromper o estado do projeto.

| Teste | Descrição | Resultado |
|---|---|---|
| T12.1 | Projeto em `diagnostico_cnae` tem estado válido antes da geração | ✅ |
| T12.2 | Falha de geração: status permanece em `diagnostico_cnae` (não avança) | ✅ |
| T12.3 | Timeout parcial: dados parciais não corrompem o projeto | ✅ |
| T12.4 | Recuperação após timeout: pode tentar novamente sem erro | ✅ |
| T12.5 | Avanço manual após timeout: integridade mantida | ✅ |
| T12.6 | Invariante: projeto recuperado pode avançar normalmente | ✅ |

**Conclusão:** O sistema é resiliente a falhas de IA. O status do projeto nunca avança automaticamente sem dados de briefing válidos, e dados parciais podem ser limpos e regenerados sem corrupção.

---

## T13 — 7 CNAEs Simultâneos (Máximo Permitido) (7 asserções)

Este teste valida o cenário de maior complexidade do fluxo: um projeto com 7 CNAEs confirmados, com respostas sendo salvas em paralelo para todos os CNAEs.

| Teste | Descrição | Resultado | Métrica |
|---|---|---|---|
| T13.1 | Projeto tem 7 CNAEs confirmados | ✅ | — |
| T13.2 | Salva respostas para 7 CNAEs em paralelo sem erro | ✅ | 7 respostas em 72ms |
| T13.3 | Todas as 7 respostas foram persistidas individualmente | ✅ | 7/7 CNAEs salvos |
| T13.4 | `diagnosticStatus.cnae` permanece `pending` com apenas 1 CNAE respondido | ✅ | Status não avança |
| T13.5 | Respostas de CNAEs diferentes não se sobrepõem (isolamento por `cnaeCode`) | ✅ | Isolamento confirmado |
| T13.6 | Dois inserts concorrentes no mesmo CNAE completam sem erro | ✅ | 2/2 fulfilled |
| T13.7 | 7 CNAEs × 5 questões = 35 respostas em paralelo | ✅ | 35 inserts em 67ms |

**Throughput observado:** 35 operações em 67ms = **522 operações/segundo**. O limite de 8 segundos foi superado em 99,2%.

---

## T14 — Retrocesso Múltiplo Acumulado (10 asserções)

Este teste valida a integridade de dados após múltiplos retrocessos consecutivos, incluindo padrões adversariais (loop de 10 retrocessos) e retrocesso pós-aprovação.

| Teste | Descrição | Resultado |
|---|---|---|
| T14.1 | Avança projeto até `riscos` (etapa 4) | ✅ |
| T14.2 | 1º retrocesso: `riscos` → `briefing` preserva `riskMatricesData` | ✅ |
| T14.3 | 2º retrocesso: `briefing` → `diagnostico_cnae` preserva `briefingContent` | ✅ |
| T14.4 | 3º retrocesso: `diagnostico_cnae` → `cnaes_confirmados` | ✅ |
| T14.5 | Após 3 retrocessos: dados originais (briefing, riscos) ainda preservados | ✅ |
| T14.6 | Pode avançar novamente após 3 retrocessos (ciclo completo) | ✅ |
| T14.7 | Loop adversarial: 10 retrocessos consecutivos sem corrupção | ✅ |
| T14.8 | Invariante após loop: `currentStep` consistente com `status` | ✅ |
| T14.9 | Projeto aprovado pode retroceder para `plano_acao` (alteração) | ✅ |
| T14.10 | Após retrocesso pós-aprovação: pode retornar a `aprovado` | ✅ |

**Conclusão:** O sistema mantém integridade total de dados após qualquer sequência de retrocessos. O `stepHistory` registra cada retrocesso corretamente, e os dados de briefing, riscos e plano de ação nunca são perdidos — apenas o status do projeto retrocede.

---

## Evidências de Performance

As métricas coletadas durante a execução confirmam que o sistema opera bem dentro dos limites estabelecidos:

| Operação | Tempo Observado | Limite Definido | Margem |
|---|---|---|---|
| 50 projetos criados em paralelo | 141ms | 10.000ms | 98,6% |
| 50 updates de status em paralelo | 38ms | 8.000ms | 99,5% |
| 50 leituras em paralelo | 32ms | 5.000ms | 99,4% |
| 50 inserts de resposta em paralelo | 34ms | 8.000ms | 99,6% |
| 7 respostas CNAE em paralelo | 72ms | 5.000ms | 98,6% |
| 35 inserts (7 CNAEs × 5 questões) | 67ms | 8.000ms | 99,2% |

Todos os limites de performance foram atendidos com ampla margem. O banco TiDB demonstrou excelente suporte à concorrência, sem deadlocks em nenhum dos cenários testados.

---

## Correções Técnicas Aplicadas

Durante a implementação dos testes, foram identificados e corrigidos os seguintes problemas:

**1. Colunas inexistentes no schema:** Os testes originais referenciavam colunas `flowVersion`, `revenueRange`, `operationTypes`, `clientTypes`, `operatesMultipleStates` e `paymentMethods` que não existem no banco de produção. Os INSERTs foram corrigidos para usar apenas as colunas reais da tabela `projects`.

**2. Schema da tabela `questionnaireAnswersV3`:** A tabela usa colunas `cnaeCode`, `level`, `questionIndex`, `questionText`, `answerValue` — não `layer`, `sectionId`, `questionId`, `answer` como os testes originais assumiam. Todos os INSERTs foram corrigidos para o schema real.

**3. JSON nativo do mysql2:** O driver mysql2 retorna colunas do tipo `json` como objetos JavaScript nativos, não como strings. Os testes que chamavam `JSON.parse()` em valores já parseados falhavam com "Unexpected end of JSON input". Foi adicionado um helper `parseJson()` que detecta se o valor já é um objeto nativo.

---

## Estado do Sistema Pós-Onda 2

| Indicador | Valor |
|---|---|
| Total de projetos no banco | 2.137 |
| Projetos ativos | 500 |
| Projetos aprovados | 18 |
| Divergências Shadow Mode | 274 (todas esperadas — projetos pré-v2.1) |
| Divergências críticas | 0 |
| TypeScript: erros reais | 0 |
| Testes passando (Onda 1 + 2) | 107/107 |

---

## Próximos Passos

Com a Onda 2 concluída, o sistema está pronto para as etapas finais do UAT:

1. **Publicação da plataforma** — Clicar no botão **Publish** na interface Manus para disponibilizar em `iasolaris.manus.space` e liberar o UAT amplo para a equipe de advogados.

2. **Limpeza de projetos de teste** — Arquivar ou deletar projetos `[ONDA1-T0x]` e `[ONDA2-T1x]` criados pelos testes automáticos antes do UAT amplo.

3. **Período de observação** — Manter Shadow Mode ativo por 48–72 horas após a publicação, monitorando divergências críticas no dashboard `/admin/shadow-monitor`.

4. **Ativação do modo `new`** — Somente após UAT completo e 48–72h de observação com divergências críticas = 0.

---

*Relatório gerado automaticamente em 23/03/2026 às 15:56 UTC-3.*  
*Commit de referência: a ser gerado no checkpoint pós-Onda 2.*
