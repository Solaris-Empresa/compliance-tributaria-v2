# Vitest Realtime Progress

**Started:** 2026-04-27T00:35:06.241Z
**Output:** reports/battery-current/progress.md

| Arquivo | Teste | Estado | Duração | Timestamp |
|---|---|---|---|---|
| sprint-v59-fluxo-v3-ai.test.ts | server/integration/sprint-v59-fluxo-v3-ai.test.ts | FAIL | — | 2026-04-27T00:35:07.127Z |
| sprint-v60-v63-e2e.test.ts | server/integration/sprint-v60-v63-e2e.test.ts | FAIL | — | 2026-04-27T00:35:07.131Z |
| prefill-contract.test.ts | server/prefill-contract.test.ts | PASS | 34ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | BLOCO 2 — Normalização da API | PASS | 7ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | safeParseJson: objeto já parseado retorna como está | PASS | 2ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | safeParseJson: string JSON é parseada corretamente | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | safeParseJson: null retorna fallback | PASS | 1ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | safeParseJson: undefined retorna fallback | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | safeParseJson: string JSON inválida retorna fallback sem lançar erro | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | normalizeProject: campos JSON como string são convertidos para objeto | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | normalizeProject: campos já como objeto não são alterados | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | normalizeProject: campos null permanecem null (exceto confirmedCnaes que vira []) | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | normalizeProject: não lança erro com objeto null/undefined | PASS | 1ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | BLOCO 3 — Builders de Prefill (Centralização) | PASS | 2ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | buildCorporatePrefill é uma função exportada do shared | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | buildOperationalPrefill é uma função exportada do shared | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | buildCnaePrefill é uma função exportada do shared | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | buildCorporatePrefill retorna objeto (nunca lança erro) | PASS | 1ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | buildOperationalPrefill retorna objeto (nunca lança erro) | PASS | 1ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | buildCnaePrefill retorna objeto (nunca lança erro) | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | BLOCO 4 — Matriz de Prefill (Contrato) | PASS | 5ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | TAX_REGIME_MAP — cobertura completa | PASS | 1ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre simples_nacional | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre lucro_presumido | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre lucro_real | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre mei | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | COMPANY_SIZE_MAP — cobertura completa | PASS | 1ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre mei | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre micro | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre pequena | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre media | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre grande | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | OPERATION_TYPE_TO_CANAIS — cobertura completa | PASS | 2ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre industria | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre comercio | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre servicos | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre misto | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre agronegocio | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre financeiro | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre produto | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre servico | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | OPERATION_TYPE_TO_SETOR — cobertura completa | PASS | 1ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre industria | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre comercio | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre servicos | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre misto | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre agronegocio | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre financeiro | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre produto | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre servico | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | PAYMENT_METHOD_MAP — cobertura completa | PASS | 1ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre pix | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre cartao | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre boleto | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre transferencia | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre dinheiro | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | cobre marketplace | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | campos sem prefill legítimo NÃO estão no buildCorporatePrefill (qc02_grupo, qc02_centralizacao) | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | BLOCO 5 — Não Repetição de Perguntas (Invariante Crítico) | PASS | 2ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | regime tributário coletado → qc01_regime preenchido (não reaparece vazio) | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | porte coletado → qc01_porte preenchido (não reaparece vazio) | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | operationType coletado → qo01_canais preenchido (não reaparece vazio) | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | clientType coletado → qo01_clientes preenchido (não reaparece vazio) | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | paymentMethods coletados → qo03_meios preenchido (não reaparece vazio) | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | hasTaxTeam coletado → qo08_equipe preenchido (não reaparece vazio) | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | operationType coletado → qcnae01_setor preenchido (não reaparece vazio) | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | confirmedCnaes coletados → qcnae01_atividades preenchido (não reaparece vazio) | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | BLOCO 6 — Prefill Funcional | PASS | 5ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | Campos diretos — QC-01 | PASS | 1ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | lucro_presumido → 'Lucro Presumido' | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | lucro_real → 'Lucro Real' | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | simples_nacional → 'Simples Nacional' | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | media → 'Médio porte (até R$ 78 mi)' | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | grande → 'Grande porte (acima de R$ 78 mi)' | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | Campos derivados — QC-02 | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | multiState=true → qc02_filiais='Sim' | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | hasMultipleEstablishments=false → qc02_filiais='Não' | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | multiState tem prioridade sobre hasMultipleEstablishments | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | Campos derivados — QO | PASS | 3ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | servicos → canais=['Venda direta B2B'] | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | misto → canais=['Loja física', 'Venda direta B2B'] | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | b2b only → 'Pessoa Jurídica (B2B)' | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | b2b+b2c → 'Misto (B2B e B2C)' | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | pix+boleto → meios corretos | PASS | 1ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | hasTaxTeam=false → 'Contador autônomo' | PASS | 0ms | 2026-04-27T00:35:07.168Z |
| prefill-contract.test.ts | hasTaxTeam=true → 'Equipe interna dedicada' | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | Campos derivados — CNAE | PASS | 1ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | servicos → setor='Serviços (geral)' | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | 1 CNAE → 'Não — apenas CNAE principal' | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | 5 CNAEs → 'Sim — mais de 3 CNAEs secundários' | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | observações contém os códigos CNAE | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | Campos não aplicáveis — permanecem undefined (não forçados) | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | qc02_grupo não é preenchido (dado não coletado) | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | qc02_centralizacao não é preenchido (dado não coletado) | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | BLOCO 7 — Robustez (Edge Cases) | PASS | 4ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | projeto completamente vazio não quebra buildCorporatePrefill | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | projeto completamente vazio não quebra buildOperationalPrefill | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | projeto completamente vazio não quebra buildCnaePrefill | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | projeto com JSONs null não quebra builders | PASS | 2ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | confirmedCnaes como array vazio não quebra buildCnaePrefill | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | clientType como array vazio não quebra buildOperationalPrefill | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | hasTaxTeam=null não gera valor incorreto | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | paymentMethods com valor desconhecido é filtrado silenciosamente | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | safeParseJson: string JSON de array retorna array | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | BLOCO 8 — Logs e Rastreabilidade (PrefillTrace) | PASS | 1ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | buildCorporatePrefill com trace registra paths usados | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | buildCorporatePrefill com trace registra campos resolvidos | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | buildCorporatePrefill com trace registra campos missing quando dados ausentes | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | buildOperationalPrefill com trace registra paths corretos | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | buildCnaePrefill com trace registra paths corretos | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | buildCnaePrefill com trace registra erro de parse quando confirmedCnaes é string | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | trace sem option não polui o objeto de retorno com _trace | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | BLOCO 9 — Cobertura Mínima (Deduplicação e Regressão) | PASS | 3ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | getPrefilledSectionsOperacional detecta QO-01 quando operationType presente | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | getPrefilledSectionsOperacional detecta QO-03 quando paymentMethods presente | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | getPrefilledSectionsOperacional detecta QO-08 quando hasTaxTeam presente | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | getPrefilledSectionsCnae detecta QCNAE-01 quando operationType presente | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | getPrefilledSectionsOperacional retorna Set vazio para projeto vazio | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | getPrefilledSectionsCnae retorna Set vazio para projeto vazio | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | REGRESSÃO: buildCorporatePrefill com coluna direta (legado) ainda funciona | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | REGRESSÃO: companyProfile tem prioridade sobre colunas diretas | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | clientTypeToPerfilClientes: b2g sozinho → 'Governo (B2G)' | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | clientTypeToPerfilClientes: b2b2c → 'Misto (B2B e B2C)' | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | hasTaxTeamToEquipe: true → 'Equipe interna dedicada' | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | hasTaxTeamToEquipe: false → 'Contador autônomo' | PASS | 1ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | hasTaxTeamToEquipe: null → '' | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | cnaeCountToAtividades: 1 → 'Não — apenas CNAE principal' | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | cnaeCountToAtividades: 3 → 'Sim — 1 a 3 CNAEs secundários' | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | cnaeCountToAtividades: 5 → 'Sim — mais de 3 CNAEs secundários' | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | cnaesToObservacoes: formata corretamente | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | BLOCO 10 — Casos de Validação (Simples, Complexo, Inconsistente) | PASS | 3ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | Caso 1 — Simples (1 CNAE, campos básicos) | PASS | 1ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | todos os campos básicos são preenchidos corretamente | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | zero repetições: nenhum campo coletado reaparece vazio | PASS | 1ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | Caso 2 — Complexo (múltiplos CNAEs, múltiplos campos derivados) | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | todos os campos complexos são preenchidos corretamente | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | Caso 3 — Inconsistente (dados legados, campos conflitantes) | PASS | 1ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | projeto inconsistente não quebra nenhum builder | PASS | 1ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | projeto inconsistente: coluna direta funciona como fallback | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | projeto inconsistente: operacionais/CNAE retornam vazio sem erro | PASS | 1ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | BLOCO 1 — Fonte da Verdade (Estrutura do Schema) | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | NormalizedProjectForPrefill define todos os JSONs canônicos esperados | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| prefill-contract.test.ts | normalizeProject cobre todos os JSONs canônicos do schema | PASS | 0ms | 2026-04-27T00:35:07.169Z |
| diagnostic-integration.test.ts | server/integration/diagnostic-integration.test.ts | FAIL | 35ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | Bloco 3 — Leitura centralizada: getDiagnosticSource | FAIL | 19ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | 3.1 Projeto V1 — leitura correta | FAIL | 8ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | retorna todos os campos V1 e nenhum campo V3 | FAIL | 5ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | V1: assertFlowVersion permite acesso a endpoints V1 | PASS | 2ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | V1: assertFlowVersion BLOQUEIA acesso a endpoints V3 | PASS | 1ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | V1: validateV1DataSufficiency retorna null quando dados suficientes | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | 3.2 Projeto V3 — leitura correta | FAIL | 3ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | retorna todos os campos V3 e nenhum campo V1 | FAIL | 2ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | V3: assertFlowVersion permite acesso a endpoints V3 | PASS | 1ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | V3: assertFlowVersion BLOQUEIA acesso a endpoints V1 | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | V3: validateV3DataSufficiency retorna null quando dados suficientes | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | 3.3 Projeto híbrido — comportamento definido | FAIL | 3ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | retorna flowVersion='hybrid' com ambos os campos disponíveis | FAIL | 2ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | híbrido: assertFlowVersion NÃO bloqueia (estado documentado, não bloqueante) | PASS | 1ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | 3.4 Sem leitura ambígua — isolamento garantido pelo adaptador | FAIL | 4ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | V3 puro: nenhum campo V1 é exposto mesmo que existam no banco | FAIL | 2ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | V1 puro: nenhum campo V3 é exposto mesmo que existam no banco | FAIL | 1ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | Bloco 4 — State Machine: validateTransition e getResumePoint | PASS | 7ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | 4.1 Projeto V1 — fluxo de estados | PASS | 1ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | projeto novo: currentStep=1, status=rascunho | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | projeto V1 com corporateAnswers: pode avançar para operacional | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | projeto V1 sem corporateAnswers: NÃO pode avançar para operacional | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | projeto V1 com todos os dados: pode avançar para briefing | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | 4.2 Projeto V3 — fluxo de estados | PASS | 1ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | projeto V3 com briefing: pode avançar para riscos | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | projeto V3 sem briefing: NÃO pode avançar para riscos | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | projeto V3 com riscos: pode avançar para plano | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | 4.3 Mudança de rota — não pode pular etapas | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | não pode pular do step 1 para o step 5 | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | DOCUMENTA: state machine permite retroceder (comportamento de revisão) | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | 4.4 Reload da página — getResumePoint consistente | PASS | 1ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | projeto no step 5 retoma no step 5 após reload | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | projeto no step 8 com briefing retoma no step 8 | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | resumeData reflete corretamente o estado do projeto | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | 4.5 Stepper — consistência de FLOW_STEPS | PASS | 4ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | FLOW_STEPS tem 11 etapas definidas | PASS | 1ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | cada etapa tem stepNumber único e sequencial | PASS | 3ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | cada etapa tem stepName único | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | etapas de diagnóstico V1 têm gates corretos | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | Bloco 6 — Integridade de dados | FAIL | 8ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | 6.1 Projeto V1 puro — sem sobrescrita V3 | FAIL | 2ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | dados V1 retornados são idênticos ao que está no banco | FAIL | 1ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | leitura V1 não modifica os dados originais | FAIL | 1ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | 6.2 Projeto V3 puro — sem sobrescrita V1 | FAIL | 1ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | dados V3 retornados são idênticos ao que está no banco | FAIL | 1ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | 6.3 Projeto híbrido — ambos os dados disponíveis sem perda | FAIL | 1ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | dados V1 e V3 coexistem sem perda no estado híbrido | FAIL | 1ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | 6.4 Rollback após V3 — dados V1 preservados | FAIL | 2ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | após rollback para V1, dados V1 originais são preservados | FAIL | 1ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | determineFlowVersion é determinístico pós-rollback | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | 6.5 Sem duplicidade inconsistente | FAIL | 1ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | flowVersion é único e imutável para cada estado de projeto | PASS | 0ms | 2026-04-27T00:35:07.234Z |
| diagnostic-integration.test.ts | leitura múltipla do mesmo projeto retorna dados idênticos (sem efeito colateral) | FAIL | 1ms | 2026-04-27T00:35:07.234Z |
| fase2-e2e-validation.test.ts | server/integration/fase2-e2e-validation.test.ts | FAIL | — | 2026-04-27T00:35:07.343Z |
| questionario-prefill.test.ts | server/integration/questionario-prefill.test.ts | FAIL | 29ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | buildCorporatePrefill | FAIL | 14ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve mapear taxRegime simples_nacional corretamente | PASS | 1ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve mapear taxRegime lucro_presumido corretamente | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve mapear taxRegime lucro_real corretamente | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve mapear companySize grande corretamente | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve mapear companySize media corretamente | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve mapear companySize pequena corretamente | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve mapear companySize mei corretamente | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve mapear companySize micro corretamente (alias de mei) | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve preencher ambos os campos quando ambos estão disponíveis | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve retornar objeto vazio quando ambos são nulos | PASS | 1ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve retornar objeto vazio para valores desconhecidos | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve ler taxRegime de companyProfile aninhado | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve preferir campos diretos sobre companyProfile aninhado | FAIL | 9ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | clientTypeToPerfilClientes | PASS | 3ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve retornar B2B para apenas b2b | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve retornar B2C para apenas b2c | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve retornar Governo para apenas b2g | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve retornar Misto para b2b + b2c | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve retornar Misto para b2b2c | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve retornar Misto para b2b2c mesmo com outros tipos | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve retornar string vazia para array vazio | PASS | 2ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve retornar Misto para b2b + b2g (ambos presentes) | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | hasTaxTeamToEquipe | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve retornar equipe interna para true | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve retornar contador autônomo para false | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve retornar string vazia para null | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve retornar string vazia para undefined | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | buildOperationalPrefill | PASS | 3ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve pré-preencher canais de venda para operationType=comercio | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve pré-preencher canais de venda para operationType=industria | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve pré-preencher canais de venda para operationType=misto (loja + B2B) | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve pré-preencher perfil de clientes para clientType=[b2b] | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve pré-preencher perfil de clientes para clientType=[b2c] | PASS | 0ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve pré-preencher meios de pagamento para paymentMethods=[pix, cartao] | PASS | 1ms | 2026-04-27T00:35:07.579Z |
| questionario-prefill.test.ts | deve pré-preencher meios de pagamento para paymentMethods=[boleto, transferencia, dinheiro] | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve pré-preencher gestão fiscal para hasTaxTeam=true | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve pré-preencher gestão fiscal para hasTaxTeam=false | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve preencher todos os campos quando todos os perfis estão disponíveis | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve retornar objeto vazio quando todos os perfis são nulos | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve ignorar paymentMethods desconhecidos (não mapear) | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve ignorar hasTaxTeam=null (não preencher campo) | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve não preencher qo01_clientes para clientType vazio | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | getPrefilledSectionsOperacional | PASS | 1ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve detectar QO-01 quando operationType está preenchido | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve detectar QO-01 quando clientType tem itens | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve detectar QO-03 quando paymentMethods tem itens | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve detectar QO-08 quando hasTaxTeam=true | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve detectar QO-08 quando hasTaxTeam=false | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve detectar todas as 3 seções quando todos os perfis estão preenchidos | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve retornar Set vazio quando todos os perfis são nulos | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | não deve detectar QO-08 quando hasTaxTeam=null | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | não deve detectar QO-03 quando paymentMethods está vazio | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | cnaeCountToAtividades | PASS | 1ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve retornar apenas CNAE principal para count=1 | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve retornar 1 a 3 CNAEs secundários para count=2 | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve retornar 1 a 3 CNAEs secundários para count=4 | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve retornar mais de 3 CNAEs secundários para count=5 | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve retornar mais de 3 CNAEs secundários para count=10 | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve retornar apenas CNAE principal para count=0 | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | cnaesToObservacoes | PASS | 1ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve formatar CNAEs com código e descrição | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve formatar CNAEs sem descrição (apenas código) | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve retornar string vazia para array vazio | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve retornar string vazia para array nulo | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve formatar múltiplos CNAEs separados por newline | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | buildCnaePrefill | PASS | 2ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve pré-preencher setor para operationType=comercio | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve pré-preencher setor para operationType=industria | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve pré-preencher setor para operationType=servicos | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve pré-preencher setor para operationType=agronegocio | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve pré-preencher setor para operationType=financeiro | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve pré-preencher atividades para 1 CNAE confirmado | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve pré-preencher atividades para 3 CNAEs confirmados | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve pré-preencher atividades para 5 CNAEs confirmados | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve pré-preencher observações com lista de CNAEs | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve preencher todos os campos quando operationType e CNAEs estão disponíveis | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve retornar objeto vazio quando tudo é nulo | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve retornar objeto vazio para confirmedCnaes vazio | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | getPrefilledSectionsCnae | PASS | 1ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve detectar QCNAE-01 quando operationType está preenchido | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve detectar QCNAE-01 quando confirmedCnaes tem itens | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve retornar Set vazio quando tudo é nulo | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve retornar Set vazio quando confirmedCnaes está vazio | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | não deve detectar seções além de QCNAE-01 (outras seções não têm prefill) | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | Não-regressão: respostas salvas têm prioridade sobre prefill | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve preservar resposta salva de qc01_regime mesmo com taxRegime diferente no perfil | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve preservar resposta salva de qo01_clientes mesmo com clientType diferente | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | deve preservar resposta salva de qcnae01_setor mesmo com operationType diferente | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | Cobertura dos mapas de mapeamento | PASS | 2ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | TAX_REGIME_MAP cobre todos os valores do enum do banco | PASS | 1ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | COMPANY_SIZE_MAP cobre todos os valores do enum do banco | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | OPERATION_TYPE_TO_CANAIS cobre todos os operationTypes do banco | PASS | 1ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | OPERATION_TYPE_TO_SETOR cobre todos os operationTypes do banco | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| questionario-prefill.test.ts | PAYMENT_METHOD_MAP cobre todos os paymentMethods do banco | PASS | 0ms | 2026-04-27T00:35:07.580Z |
| e2e-projects.test.ts | server/integration/e2e-projects.test.ts | FAIL | — | 2026-04-27T00:35:07.618Z |
| prefill-contract-v2.test.ts | server/prefill-contract-v2.test.ts | PASS | 27ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | BLOCO 1 — Contrato de Entrada Completo | PASS | 4ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | isEconomicGroup está presente no tipo NormalizedProjectForPrefill | PASS | 1ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | taxCentralization está presente no tipo NormalizedProjectForPrefill | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc02_filiais é derivável de operationProfile.multiState | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc02_filiais é derivável de taxComplexity.hasMultipleEstablishments quando multiState é null | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc02_obs é campo livre — não pré-preenchível (ausência intencional) | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | todos os campos QC-02 classificados: direto, derivado ou não aplicável | PASS | 1ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | BLOCO 2 — Matriz de Prefill (Contrato) | PASS | 2ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | QC-01: qc01_regime e qc01_porte cobertos | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | QC-02: qc02_grupo, qc02_filiais, qc02_centralizacao cobertos no projeto complexo | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | QO: qo01_canais, qo01_clientes, qo03_meios, qo08_equipe cobertos | PASS | 1ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | CNAE: qcnae01_setor, qcnae01_atividades, qcnae01_observacoes cobertos | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | zero campos órfãos — todos os campos têm path canônico no trace | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | BLOCO 3 — Builders (Centralização) | PASS | 3ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | buildCorporatePrefill retorna objeto (não lança exceção) | PASS | 1ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | buildOperationalPrefill retorna objeto (não lança exceção) | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | buildCnaePrefill retorna objeto (não lança exceção) | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | builders retornam Record<string, string \| string[]> — sem campos inesperados no resultado | PASS | 1ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | zero lógica de prefill duplicada — builders são a única fonte de verdade | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | BLOCO 4 — Normalização da API | PASS | 2ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | normalizeProject aceita objeto → retorna objeto | PASS | 1ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | normalizeProject aceita string JSON → parseia e retorna objeto | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | normalizeProject aceita null → retorna fallback seguro (null) | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | normalizeProject nunca lança exceção com JSON malformado | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | normalizeProject nunca lança exceção com undefined | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | safeParseJson retorna objeto para string JSON válida | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | safeParseJson retorna fallback para string inválida | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | safeParseJson retorna objeto diretamente quando já é objeto | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | normalizeProject preserva isEconomicGroup e taxCentralization no companyProfile | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | BLOCO 5 — Prefill Funcional | PASS | 2ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc01_regime: Simples Nacional → label correto | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc01_porte: micro → label correto | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc01_regime: Lucro Real → label correto | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc01_porte: grande → label correto | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc02_grupo: false → 'Não' | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc02_grupo: true → 'Sim' | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc02_filiais: multiState false → 'Não' | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc02_filiais: multiState true → 'Sim' | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc02_centralizacao: centralized → label correto | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc02_centralizacao: decentralized → label correto | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc02_centralizacao: partial → label correto | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | campos não aplicáveis permanecem ausentes (não inventados) | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | BLOCO 6 — Não Repetição (Crítico) | PASS | 3ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc01_regime: campo coletado no perfil → não aparece como vazio no prefill | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc01_porte: campo coletado no perfil → não aparece como vazio no prefill | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc02_grupo: campo coletado no perfil → não aparece como vazio no prefill | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc02_filiais: campo derivado do perfil → não aparece como vazio no prefill | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc02_centralizacao: campo coletado no perfil → não aparece como vazio no prefill | PASS | 1ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | campos ausentes no perfil → ausentes no prefill (não inventados) | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | BLOCO 7 — Robustez | PASS | 4ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | projeto com companyProfile: null → não quebra | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | projeto com companyProfile: {} → não quebra | PASS | 1ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | projeto legado sem isEconomicGroup → não quebra, campo ausente no prefill | PASS | 1ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | projeto legado sem taxCentralization → não quebra, campo ausente no prefill | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | projeto parcial (alguns campos preenchidos) → não quebra | PASS | 1ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | normalizeProject com projeto completamente vazio → não quebra | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | normalizeProject com todos os profiles como string JSON → parseia todos | PASS | 1ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | BLOCO 8 — Testes Automatizados | PASS | 4ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | companyProfile com isEconomicGroup é preservado após normalização | PASS | 2ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | prefill corporativo funciona com projeto normalizado (pipeline completo) | PASS | 1ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | prefill operacional funciona com projeto normalizado | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | prefill CNAE funciona com projeto normalizado | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | regressão: legado sem novos campos não quebra o pipeline completo | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | BLOCO 9 — Cenários de Validação | PASS | 2ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | Caso 1 — Empresa Simples (Simples Nacional, micro, sem grupo, sem filiais, centralizada) | PASS | 1ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc01_regime = Simples Nacional | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc01_porte = Microempresa | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc02_grupo = Não | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc02_filiais = Não | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc02_centralizacao = centralizada | PASS | 0ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | Caso 2 — Empresa Complexa (Lucro Real, grande, com grupo, múltiplos CNAEs, descentralizada) | PASS | 1ms | 2026-04-27T00:35:07.732Z |
| prefill-contract-v2.test.ts | qc01_regime = Lucro Real | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | qc01_porte = Grande | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | qc02_grupo = Sim | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | qc02_filiais = Sim | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | qc02_centralizacao = descentralizada | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | CNAE: 3 atividades → qcnae01_atividades reflete múltiplas atividades | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | Caso 3 — Projeto Legado (sem isEconomicGroup, sem taxCentralization) | PASS | 1ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | não quebra — retorna objeto válido | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | qc01_regime preenchido a partir de companyProfile.taxRegime (legado) | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | qc02_grupo ausente (campo não existia no legado) | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | qc02_centralizacao ausente (campo não existia no legado) | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | normalizeProject com projeto legado → não quebra | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | BLOCO 10 — Evidências (PrefillTrace) | PASS | 2ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | trace contém prefill_fields_expected, prefill_fields_resolved, prefill_fields_missing | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | trace: qc02_grupo resolvido para projeto complexo | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | trace: qc02_centralizacao resolvido para projeto complexo | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | trace: qc02_grupo ausente no legado → está em prefill_fields_missing | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | trace: qc02_centralizacao ausente no legado → está em prefill_fields_missing | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | trace: source path 'companyProfile.isEconomicGroup' usado para projeto complexo | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | trace: source path 'companyProfile.taxCentralization' usado para projeto complexo | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | trace operacional: qo01_canais resolvido | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | trace CNAE: qcnae01_setor resolvido | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| prefill-contract-v2.test.ts | trace: projeto simples — qc02_grupo em missing quando isEconomicGroup é null | PASS | 0ms | 2026-04-27T00:35:07.733Z |
| invariants-606-607-608.test.ts | server/invariants-606-607-608.test.ts | PASS | 16ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | INV-006 — Risco Sem Origem É Inválido | PASS | 6ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | Unitário: isRiskValid() | PASS | 3ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | risco com origem questionnaire_answer é válido | PASS | 1ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | risco com origem cnae é válido | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | risco com origem profile_field é válido | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | risco sem origin é inválido — viola INV-006 | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | risco com origin null é inválido — viola INV-006 | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | risco com questionnaire_answer sem questionId é inválido | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | risco com cnae sem cnaeCode é inválido | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | Funcional: validateRiskList() | PASS | 2ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | lista com todos os riscos válidos retorna array vazio | PASS | 1ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | lista com risco sem origem retorna o risco inválido | PASS | 1ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | lista vazia retorna array vazio | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | lista com múltiplos riscos inválidos retorna todos | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | Regressão: INV-006 não pode ser contornado | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | REGRESSÃO: risco gerado por IA sem origin ainda é inválido | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | REGRESSÃO: risco com description mas sem origin é inválido | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | INV-007 — Ação Sem Evidence Required É Inválida | PASS | 4ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | Unitário: isActionValid() | PASS | 1ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | ação com evidence_required=true é válida | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | ação com evidence_required=false é válida | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | ação sem evidence_required é inválida — viola INV-007 | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | ação com evidence_required=null é inválida — viola INV-007 | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | ação com evidence_required=undefined é inválida — viola INV-007 | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | Funcional: validateActionList() | PASS | 2ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | lista com todas as ações válidas retorna array vazio | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | lista com ação sem evidence_required retorna a ação inválida | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | lista vazia retorna array vazio | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | lista com múltiplas ações inválidas retorna todas | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | plano de ação completo com mix de true/false é válido | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | Integração: plano de ação gerado por IA deve ter evidence_required | PASS | 1ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | plano gerado por IA com evidence_required em todas as ações é válido | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | plano gerado por IA sem evidence_required em alguma ação é inválido | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | Regressão: INV-007 não pode ser contornado | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | REGRESSÃO: ação com todos os outros campos preenchidos mas sem evidence_required é inválida | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | REGRESSÃO: evidence_required como string 'true' não é válido (deve ser boolean) | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | REGRESSÃO: evidence_required como número 1 não é válido (deve ser boolean) | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | INV-008 — Briefing Sem Cobertura 100% É Inválido | PASS | 5ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | Unitário: canGenerateBriefing() | PASS | 1ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | cobertura 100% (todas completed) permite gerar briefing | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | corporate not_started bloqueia geração de briefing — viola INV-008 | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | operational in_progress bloqueia geração de briefing — viola INV-008 | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | cnae not_started bloqueia geração de briefing — viola INV-008 | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | todas as camadas not_started bloqueia geração de briefing | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | duas camadas completed mas uma in_progress bloqueia | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | Funcional: getMissingCoverage() | PASS | 3ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | cobertura 100% retorna array vazio | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | corporate not_started retorna ['corporate'] | PASS | 1ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | operational in_progress retorna ['operational'] | PASS | 2ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | todas as camadas incompletas retorna todas as 3 | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | Integração: fluxo de geração de briefing | PASS | 1ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | projeto com diagnosticStatus null não pode gerar briefing | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | projeto com diagnosticStatus parcialmente preenchido não pode gerar briefing | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | projeto com todas as 3 camadas completed pode gerar briefing | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | gate de briefing: erro descritivo quando cobertura incompleta | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | Regressão: INV-008 não pode ser contornado | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | REGRESSÃO: briefing não pode ser gerado com apenas corporate completed | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | REGRESSÃO: briefing não pode ser gerado com apenas 2 camadas completed | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | REGRESSÃO: in_progress não é equivalente a completed para fins de briefing | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | Integração Cruzada — INV-006 + INV-007 + INV-008 | PASS | 1ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | projeto válido: diagnóstico 100%, riscos com origem, ações com evidence_required | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| invariants-606-607-608.test.ts | projeto inválido: qualquer violação bloqueia o fluxo completo | PASS | 0ms | 2026-04-27T00:35:07.804Z |
| routers-briefing-engine.test.ts | BRIEFING_SECTIONS tem exatamente 8 seções | PASS | 2ms | 2026-04-27T00:35:07.810Z |
| routers-briefing-engine.test.ts | as 8 seções são: identificacao, escopo, resumo_executivo, perfil_regulatorio, gaps, riscos, plano_acao, proximos_passos | PASS | 1ms | 2026-04-27T00:35:07.810Z |
| routers-briefing-engine.test.ts | BriefingSectionSchema rejeita seção inválida | PASS | 1ms | 2026-04-27T00:35:07.810Z |
| routers-briefing-engine.test.ts | CompleteBriefingSchema exige todas as 8 seções | PASS | 7ms | 2026-04-27T00:35:07.810Z |
| routers-briefing-engine.test.ts | tabela project_briefings_v3 tem colunas para todas as 8 seções | PASS | 50ms | 2026-04-27T00:35:07.862Z |
| routers-briefing-engine.test.ts | T-B7-01: Template obrigatório — 8 seções fixas | PASS | 62ms | 2026-04-27T00:35:07.862Z |
| routers-briefing-engine.test.ts | T-B7-02: Coverage = 100% obrigatório | PASS | 2ms | 2026-04-27T00:35:07.862Z |
| routers-briefing-engine.test.ts | briefing com seção faltando tem coverage < 100% | PASS | 0ms | 2026-04-27T00:35:07.862Z |
| routers-briefing-engine.test.ts | briefing com pending_valid_questions > 0 não pode ter coverage 100% | PASS | 0ms | 2026-04-27T00:35:07.862Z |
| routers-briefing-engine.test.ts | briefing completo com pending_valid_questions = 0 tem coverage = 100% | PASS | 0ms | 2026-04-27T00:35:07.862Z |
| routers-briefing-engine.test.ts | SectionEscopo exige ao menos 1 norma coberta | PASS | 1ms | 2026-04-27T00:35:07.862Z |
| routers-briefing-engine.test.ts | T-B7-03: Consistency obrigatório — sem conflito crítico | PASS | 1ms | 2026-04-27T00:35:07.862Z |
| routers-briefing-engine.test.ts | resumo 'adequada' com riscos críticos gera conflito crítico | PASS | 0ms | 2026-04-27T00:35:07.862Z |
| routers-briefing-engine.test.ts | risco crítico sem ação gera conflito crítico no plano | PASS | 0ms | 2026-04-27T00:35:07.862Z |
| routers-briefing-engine.test.ts | briefing consistente não tem conflitos críticos | PASS | 0ms | 2026-04-27T00:35:07.862Z |
| routers-briefing-engine.test.ts | conflito de aviso não bloqueia o briefing | PASS | 0ms | 2026-04-27T00:35:07.862Z |
| sprint-d-g4-g3.test.ts | Sprint D — G4 + G3 — Corpus RAG LC 214/2025 e EC 132/2023 | PASS | 16ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | normalizeAnchorSegment — canônica e compartilhada | PASS | 4ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | normaliza NCM com pontos | PASS | 1ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | normaliza artigo com parágrafo | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | normaliza ZFM com espaços e travessão | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | normaliza acentos | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | 5 pares distintos geram outputs distintos (sem colisão) | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | Anexo III NCM X e Anexo I NCM X têm outputs distintos | PASS | 1ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | Art. 149-A §1º e Art. 149-A §2º têm outputs distintos | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | buildAnchorId — formato canônico | PASS | 1ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | gera anchor_id para NCM do Anexo I | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | gera anchor_id para Art. 149-A §1º da EC 132 | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | gera anchor_id para Anexo XI ZFM | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | chunkIndex diferente gera anchor_id diferente | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | chunkIndex — sequência e unicidade | PASS | 1ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | chunkIndex começa em 1 no mock corpus | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | não há dois chunks com mesmo (lei + artigo + chunkIndex) | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | anchor_id é único globalmente no mock corpus | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | Integridade de conteúdo | PASS | 1ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | conteudo.length > 30 em todos os chunks do mock | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | conteudo contém ao menos 1 indicador jurídico em todos os chunks | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | conteudo não termina com caractere de truncamento abrupto | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | Fronteiras semânticas | PASS | 1ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | nenhum chunk do mock inicia com letra minúscula (início no meio de frase) | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | nenhum chunk do mock termina com vírgula ou conjunção | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | chunks da EC 132 contêm dispositivo completo (caput ou § inteiro) | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | Qualidade de tópicos | PASS | 1ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | topicos.length entre 3 e 10 em todos os chunks do mock | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | ao menos 1 tópico presente no conteudo em todos os chunks | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | Cobertura por Anexo e grupo obrigatório | PASS | 1ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | corpus mock contém chunks de Anexo I (lc214) | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | corpus mock contém chunks de Anexo III (alíquota zero) | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | corpus mock contém chunks de Anexo XI (ZFM) | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | corpus mock contém chunks de Arts. 149-A a 149-G (CBS) | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | corpus mock contém chunks de Arts. 156-A a 156-G (IBS) | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | corpus mock contém chunks de Art. 153 VIII (IS) | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | Ausência de colisão de anchor_id | PASS | 1ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | anchor_id é único globalmente | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | Anexo III NCM X e Anexo I NCM X têm anchor_id distintos | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | Art. 149-A §1º e Art. 149-A §2º têm anchor_id distintos | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | Recall semântico (com mock) | PASS | 1ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | 'cesta basica' → chunks com lei=lc214 e anchor_id contendo 'anexo-iii' | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | 'Imposto Seletivo' → chunks com topicos incluindo 'IS' | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | 'reforma tributaria IBS CBS' → chunks com lei=ec132 | PASS | 1ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | 'Zona Franca de Manaus' → chunks com anchor_id contendo 'anexo-xi' | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | Ranking de retrieval — scoreChunkByTopics (auxiliar de teste) | PASS | 2ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | 'aliquota zero cesta basica' → Anexo III aparece ANTES de Anexo I | PASS | 1ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | 'EC 132 IBS competencia subnacional' → Art. 156-A aparece ANTES de Art. 149-A | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | scoreChunkByTopics retorna 0 para chunk sem sobreposição | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | scoreChunkByTopics retorna > 0 para chunk com sobreposição | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | Idempotência — lógica de upsert | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | double-run: mesmo anchor_id com mesmo conteudo → resultado 'skip' | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | update: mesmo anchor_id com conteudo diferente → resultado 'update' | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | sem duplicata: anchor_id único em todo o corpus mock | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | Schema DEC-002 — campos obrigatórios do Sprint D | PASS | 3ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | todos os chunks do mock têm anchor_id preenchido | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | todos os chunks do mock têm autor preenchido | PASS | 0ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | todos os chunks do mock têm data_revisao no formato YYYY-MM-DD | PASS | 2ms | 2026-04-27T00:35:08.020Z |
| sprint-d-g4-g3.test.ts | artigo não ultrapassa 300 chars em nenhum chunk do mock | PASS | 0ms | 2026-04-27T00:35:08.021Z |
| routers-action-engine.test.ts | ação sem risk_id é inválida | PASS | 1ms | 2026-04-27T00:35:08.042Z |
| routers-action-engine.test.ts | ação sem gap_id é inválida | PASS | 0ms | 2026-04-27T00:35:08.042Z |
| routers-action-engine.test.ts | ação sem requirement_id é inválida | PASS | 0ms | 2026-04-27T00:35:08.042Z |
| routers-action-engine.test.ts | ação com risk_id + gap_id + requirement_id é válida (vínculo completo) | PASS | 1ms | 2026-04-27T00:35:08.042Z |
| diagnostic-source.test.ts | server/integration/diagnostic-source.test.ts | FAIL | 23ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | determineFlowVersion — determinação do fluxo | PASS | 4ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna 'v3' quando questionnaireAnswers preenchido e V1 ausente | PASS | 2ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna 'v1' quando corporateAnswers preenchido e V3 ausente | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna 'v1' quando operationalAnswers preenchido e V3 ausente | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna 'v1' quando ambos corporateAnswers e operationalAnswers preenchidos (sem V3) | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna 'none' quando nenhum dado de diagnóstico presente | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna 'hybrid' quando V3 e V1 ambos preenchidos | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna 'hybrid' quando V3 e V1 (operacional) ambos preenchidos | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | array vazio em questionnaireAnswers não conta como V3 | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | assertFlowVersion — guard de fluxo | PASS | 4ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | não lança erro quando fluxo é v3 e esperado é v3 | PASS | 1ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | não lança erro quando fluxo é v1 e esperado é v1 | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | lança FORBIDDEN quando fluxo é v1 mas esperado é v3 | PASS | 1ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | lança FORBIDDEN quando fluxo é v3 mas esperado é v1 | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | lança BAD_REQUEST quando flowVersion é 'none' | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | NÃO lança erro quando flowVersion é 'hybrid' (estado documentado, não bloqueante) | PASS | 1ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | mensagem de erro inclui o nome do endpoint | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | mensagem de erro inclui o projectId | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | validateV3DataSufficiency — validação de suficiência V3 | PASS | 1ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna null quando V3 com questionnaireAnswers preenchido | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna null para hybrid com questionnaireAnswers preenchido | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna string de erro quando V3 sem questionnaireAnswers | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna string de erro quando questionnaireAnswers é array vazio | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna string de erro quando flowVersion é v1 | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna string de erro quando flowVersion é none | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | validateV1DataSufficiency — validação de suficiência V1 | PASS | 1ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna null quando V1 com corporateAnswers preenchido | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna null quando V1 com operationalAnswers preenchido | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna null para hybrid com corporateAnswers preenchido | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna string de erro quando V1 sem nenhum dado | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna string de erro quando flowVersion é v3 | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna string de erro quando flowVersion é none | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | getDiagnosticSource — integração com banco (mockado) | FAIL | 11ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | lança INTERNAL_SERVER_ERROR quando banco indisponível | FAIL | 7ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | lança NOT_FOUND quando projeto não existe | FAIL | 1ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna flowVersion='v3' para projeto V3 puro | FAIL | 1ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna flowVersion='v1' para projeto V1 puro | FAIL | 1ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna flowVersion='none' para projeto sem dados de diagnóstico | FAIL | 1ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | retorna flowVersion='hybrid' para projeto com dados de ambos os fluxos | FAIL | 1ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | Invariantes de isolamento — ADR-005 Seção 3 | FAIL | 2ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | projeto V3 puro nunca expõe campos V1 preenchidos | FAIL | 1ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | projeto V1 puro nunca expõe campos V3 preenchidos | FAIL | 1ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | assertFlowVersion impede que endpoint V3 acesse projeto V1 (bloqueio estrutural) | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | assertFlowVersion impede que endpoint V1 acesse projeto V3 (bloqueio estrutural) | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| diagnostic-source.test.ts | flowVersion é determinístico — mesma entrada sempre produz mesmo resultado | PASS | 0ms | 2026-04-27T00:35:08.086Z |
| routers-action-engine.test.ts | tabela project_actions_v3 tem colunas de rastreabilidade B6 | PASS | 50ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | T-B6-01: Vínculo obrigatório — risk_id + gap_id + requirement_id | PASS | 53ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | T-B6-02: Estrutura mínima — descrição, prioridade, prazo, responsável, evidência | PASS | 5ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | schema DerivedAction exige todos os campos obrigatórios | PASS | 2ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | ação sem prioridade é inválida | PASS | 1ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | ação sem prazo (deadline_days) é inválida | PASS | 0ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | schema ActionPriority aceita os 4 níveis corretos | PASS | 0ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | schema ActionType aceita os 10 tipos corretos | PASS | 0ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | T-B6-03: Ação executável — não genérica, não acadêmica, não vaga | PASS | 1ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | ação genérica 'revisar processos' é inválida (< 20 chars úteis) | PASS | 0ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | ação genérica 'avaliar cenário' é inválida | PASS | 0ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | todos os templates têm action_description com pelo menos 50 chars | PASS | 0ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | todos os templates têm action_name específico (não genérico) | PASS | 0ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | ação específica com descrição detalhada é válida | PASS | 0ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | T-B6-04: Template correto por domínio | PASS | 2ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | domínio fiscal tem templates específicos | PASS | 0ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | domínio trabalhista tem template específico | PASS | 0ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | domínio cadastral tem template específico | PASS | 0ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | tipo desconhecido usa fallback por domínio (não retorna null) | PASS | 0ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | todos os templates têm template_id, domain e source_reference | PASS | 1ms | 2026-04-27T00:35:08.101Z |
| routers-action-engine.test.ts | schema ActionTemplate exige source_reference não vazio | PASS | 0ms | 2026-04-27T00:35:08.101Z |
| routers-briefing-engine.test.ts | generateBriefing usa dados reais do banco (não inventa) | PASS | 362ms | 2026-04-27T00:35:08.223Z |
| routers-fluxo-v3-etapas2-5.test.ts | server/integration/routers-fluxo-v3-etapas2-5.test.ts | FAIL | 21ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | fluxoV3Router — Etapa 2: Questionário Adaptativo | FAIL | 13ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | generateQuestions — gera perguntas Nível 1 para um CNAE | FAIL | 9ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | generateQuestions — gera perguntas Nível 2 com contexto das respostas anteriores | FAIL | 1ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | generateQuestions — lança NOT_FOUND se projeto não existe | FAIL | 0ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | generateQuestions — lança INTERNAL_SERVER_ERROR se IA retorna JSON inválido | FAIL | 1ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | saveQuestionnaireProgress — salva respostas parciais sem avançar etapa | FAIL | 1ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | saveQuestionnaireProgress — avança para Etapa 3 quando completed=true | FAIL | 0ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | fluxoV3Router — Etapa 3: Briefing de Compliance | FAIL | 3ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | generateBriefing — gera briefing a partir das respostas do questionário | FAIL | 1ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | generateBriefing — incorpora correção do usuário na regeneração | FAIL | 1ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | generateBriefing — incorpora informações adicionais do usuário | FAIL | 1ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | approveBriefing — aprova e avança para Etapa 4 | FAIL | 1ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | fluxoV3Router — Etapa 4: Matrizes de Riscos | FAIL | 2ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | generateRiskMatrices — gera matrizes para todas as 4 áreas | FAIL | 0ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | generateRiskMatrices — regenera apenas uma área específica com ajuste | FAIL | 0ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | generateRiskMatrices — lança NOT_FOUND se projeto não existe | FAIL | 0ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | approveMatrices — aprova e avança para Etapa 5 | FAIL | 0ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | fluxoV3Router — Etapa 5: Plano de Ação | FAIL | 2ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | generateActionPlan — gera plano para todas as 4 áreas | FAIL | 0ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | generateActionPlan — regenera apenas uma área com ajuste | FAIL | 0ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | updateTask — atualiza status e progresso de uma tarefa | FAIL | 0ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | updateTask — atualiza configurações de notificação de uma tarefa | FAIL | 0ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | updateTask — atualiza datas de início e fim de uma tarefa | FAIL | 0ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | approveActionPlan — aprova plano e marca projeto como aprovado | FAIL | 0ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | fluxoV3Router — Fluxo Completo E2E (mock) | FAIL | 1ms | 2026-04-27T00:35:08.303Z |
| routers-fluxo-v3-etapas2-5.test.ts | fluxo completo: Etapa 2 → 3 → 4 → 5 executa sem erros | FAIL | 0ms | 2026-04-27T00:35:08.303Z |
| decision-kernel.test.ts | server/lib/decision-kernel/engine/decision-kernel.test.ts | PASS | 17ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | ncm-engine — lookupNcm | PASS | 5ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | NCM 9619.00.00 → aliquota_zero, confiança 100, deterministico | PASS | 2ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | NCM 3101.00.00 → condicional, confiança 100, tipo condicional | PASS | 1ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | 2202.10.00 retorna regime_geral com imposto_seletivo=true e artigo confirmado | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | NCM desconhecido → regime_geral, fallback < 95 | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | normaliza código NCM (trim + uppercase) | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | toda resposta NCM tem fonte.lei preenchida (CNT-02) | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | toda resposta NCM tem campo confianca preenchido (CNT-02) | PASS | 1ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | nbs-engine — lookupNbs | PASS | 3ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | NBS 1.1506.21.00 → regime_geral, confiança ≤ 98, tipo regra | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | NBS 1.0901.33.00 → regime_especial, confiança ≤ 98, tipo regra | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | NBS 1.1303.10.00 → regime_geral, confiança 95, tipo regra | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | confiança NBS nunca excede 98 (CNT-01b) | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | NBS desconhecido → regime_geral, fallback < 95 | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | toda resposta NBS tem fonte.lei preenchida (CNT-02) | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | toda resposta NBS tem campo confianca preenchido (CNT-02) | PASS | 1ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | ncm-engine — Lote 1 (cesta básica + alimentos) | PASS | 3ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | [L1-01] NCM 1006.40.00 → aliquota_zero, deterministico, artigo 125 | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | [L1-02] NCM 0401.10.10 → aliquota_zero, deterministico, artigo 125 | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | [L1-03] NCM 0713.33.19 → aliquota_zero, deterministico, artigo 125 | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | [L1-04] NCM 1106.20.00 → aliquota_zero, deterministico, artigo 125 | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | [L1-05] NCM 1701.14.00 → aliquota_zero, deterministico, artigo 125 | PASS | 2ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | [L1-06] NCM 1517.10.00 → aliquota_zero, deterministico, artigo 125 | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | nbs-engine — Lote 1 (educação + saúde + financeiro + TI) | PASS | 1ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | [NBS L1-01] NBS 1.2201.20.00 → reducao_60, deterministico (capped 98), artigo 129 | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | [NBS L1-02] NBS 1.2301.22.00 → reducao_60, deterministico (capped 98), artigo 130 | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | [NBS L1-03] NBS 1.0901.40.00 → regime_especial, regra ≤ 98, artigo 181 | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | [NBS L1-04] NBS 1.1501.10.00 → regime_geral, regra ≤ 98, artigos 11+15+21 | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | ncm-engine — Lote 2 (panificação + agropecuário) | PASS | 1ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | [L2-01] NCM 1905.90.90 → aliquota_zero, deterministico, artigo 125 Anexo I | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | [L2-02] NCM 2521.00.00 → condicional, 100, artigo 138 Anexo IX | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | [L2-03] NCM 3808.92.19 → condicional, 100, artigo 138 Anexo IX | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | nbs-engine — Lote 2 (educação superior + saúde + financeiro + TI) | PASS | 1ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | [NBS L2-01] NBS 1.2204.10.00 → reducao_60, regra ≤ 98, artigo 129 Anexo II | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | [NBS L2-03] NBS 1.0910.10.00 → regime_especial, regra ≤ 98, artigo 234 (planos saúde) | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | [NBS L2-04] NBS 1.1302.11.00 → regime_geral, regra ≤ 98, artigos 11+15+21 | PASS | 0ms | 2026-04-27T00:35:08.319Z |
| decision-kernel.test.ts | [NBS L2-05] NBS 1.0903.11.00 → regime_especial, regra ≤ 98, artigo 182 XI + 223 | PASS | 0ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | [NBS L2-06] NBS 1.1502.20.00 → regime_geral, regra ≤ 98, artigos 11+15+21 | PASS | 0ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | ncm-engine — Lote 3 (cesta básica + higiene + óleos) | PASS | 1ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | [L3-01] NCM 0402.10.10 → aliquota_zero, deterministico, artigo 125 Anexo I | PASS | 0ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | [L3-02] NCM 0901.11.00 → aliquota_zero, deterministico, artigo 125 Anexo I | PASS | 0ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | [L3-03] NCM 1101.00.10 → aliquota_zero, deterministico, artigo 125 Anexo I | PASS | 0ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | [L3-04] NCM 0405.10.00 → aliquota_zero, deterministico, artigo 125 Anexo I | PASS | 0ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | [L3-05] NCM 4818.10.00 → reducao_60, deterministico, artigo 136 Anexo VIII | PASS | 0ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | [L3-06] NCM 3401.19.00 → reducao_60, deterministico, artigo 136 Anexo VIII | PASS | 0ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | [L3-07] NCM 1507.90.11 → reducao_60, regra 95, artigo 135 Anexo VII | PASS | 0ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | nbs-engine — Lote 3 (saúde + educação + financeiro + geral + pending) | PASS | 1ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | [NBS L3-01] NBS 1.2301.98.00 → reducao_60, regra ≤ 98, artigo 130 Anexo III | PASS | 0ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | [NBS L3-02] NBS 1.2301.92.00 → reducao_60, regra ≤ 98, artigo 130 Anexo III | PASS | 0ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | [NBS L3-03] NBS 1.2201.30.00 → reducao_60, deterministico, artigo 129 Anexo II | PASS | 0ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | [NBS L3-04] NBS 1.0901.51.24 → regime_especial, regra ≤ 98, artigo 182 VI + 201 | PASS | 0ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | [NBS L3-05] NBS 1.1302.21.00 → regime_geral, regra 95, artigos 11+15+21 | PASS | 0ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | [NBS L3-06] NBS 1.1402.12.00 → regime_geral, regra 95, artigos 11+15+21 | PASS | 0ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | [NBS L3-07] NBS 1.0906.11.00 → confianca.valor=0, tipo=fallback (pending_validation) | PASS | 0ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | CNT-03 — campos obrigatórios para gaps com source=engine | PASS | 0ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | output NCM tem campos necessários para gap CNT-03 | PASS | 0ms | 2026-04-27T00:35:08.320Z |
| decision-kernel.test.ts | output NBS tem campos necessários para gap CNT-03 | PASS | 0ms | 2026-04-27T00:35:08.320Z |
| sprint-d-g4-g3.test.ts | todos os chunks de lc214 têm anchor_id não nulo | PASS | 396ms | 2026-04-27T00:35:08.405Z |
| routers-action-engine.test.ts | risco crítico gera ação com prazo ≤ 30 dias | PASS | 309ms | 2026-04-27T00:35:08.413Z |
| routers-action-engine.test.ts | prazo zero é inválido | PASS | 0ms | 2026-04-27T00:35:08.413Z |
| routers-action-engine.test.ts | prazo negativo é inválido | PASS | 0ms | 2026-04-27T00:35:08.413Z |
| routers-action-engine.test.ts | todos os templates têm deadline_rule não vazio | PASS | 0ms | 2026-04-27T00:35:08.413Z |
| routers-action-engine.test.ts | T-B6-05: Prazo determinístico — crítico 15–30d, alto 30–90d | PASS | 310ms | 2026-04-27T00:35:08.413Z |
| routers-action-engine.test.ts | template fiscal tem responsável fiscal/contábil | PASS | 0ms | 2026-04-27T00:35:08.413Z |
| routers-action-engine.test.ts | template trabalhista tem responsável de RH/Contabilidade | PASS | 0ms | 2026-04-27T00:35:08.413Z |
| routers-action-engine.test.ts | todos os templates têm responsible não vazio e específico | PASS | 2ms | 2026-04-27T00:35:08.413Z |
| routers-action-engine.test.ts | ação derivada herda responsável do template | PASS | 53ms | 2026-04-27T00:35:08.467Z |
| routers-action-engine.test.ts | T-B6-06: Responsável correto por domínio | PASS | 56ms | 2026-04-27T00:35:08.467Z |
| routers-action-engine.test.ts | T-B6-07: Evidência obrigatória e específica | PASS | 1ms | 2026-04-27T00:35:08.467Z |
| routers-action-engine.test.ts | ação sem evidence_required é inválida | PASS | 0ms | 2026-04-27T00:35:08.467Z |
| routers-action-engine.test.ts | evidência vaga (< 10 chars) é inválida | PASS | 0ms | 2026-04-27T00:35:08.467Z |
| routers-action-engine.test.ts | todos os templates têm evidence_required específica (≥ 20 chars) | PASS | 0ms | 2026-04-27T00:35:08.467Z |
| routers-action-engine.test.ts | evidência menciona documento específico (DARF, contrato, relatório, certificado, etc.) | PASS | 0ms | 2026-04-27T00:35:08.467Z |
| routers-action-engine.test.ts | risco crítico gera ação com prioridade imediata | PASS | 53ms | 2026-04-27T00:35:08.521Z |
| routers-action-engine.test.ts | schema ActionPriority rejeita prioridade inválida | PASS | 0ms | 2026-04-27T00:35:08.521Z |
| routers-action-engine.test.ts | template de risco crítico (split_payment) tem priority=imediata | PASS | 0ms | 2026-04-27T00:35:08.521Z |
| routers-action-engine.test.ts | template de planejamento societário tem priority=medio_prazo ou planejamento | PASS | 0ms | 2026-04-27T00:35:08.521Z |
| routers-action-engine.test.ts | T-B6-08: Prioridade coerente com score do risco | PASS | 54ms | 2026-04-27T00:35:08.521Z |
| routers-briefing-engine.test.ts | section_identificacao usa dados reais do projeto | PASS | 348ms | 2026-04-27T00:35:08.571Z |
| routers-action-engine.test.ts | deriveActionsFromRisks só gera ações para riscos com gap_id rastreável | PASS | 53ms | 2026-04-27T00:35:08.573Z |
| routers-action-engine.test.ts | ação solta (sem risk_id) falha na validação | PASS | 0ms | 2026-04-27T00:35:08.573Z |
| routers-action-engine.test.ts | traceability_chain contém todos os IDs da cadeia | PASS | 53ms | 2026-04-27T00:35:08.628Z |
| routers-action-engine.test.ts | T-B6-09: Nenhuma ação sem risco | PASS | 106ms | 2026-04-27T00:35:08.628Z |
| routers-action-engine.test.ts | Cenário 1 — Risco alto: ação com priority=curto_prazo e deadline ≤ 90 dias | PASS | 1ms | 2026-04-27T00:35:08.628Z |
| routers-action-engine.test.ts | Cenário 2 — Risco médio: ação com priority=medio_prazo e deadline ≤ 120 dias | PASS | 0ms | 2026-04-27T00:35:08.628Z |
| routers-action-engine.test.ts | Cenário 3 — Risco contextual: ação de governança com priority=imediata | PASS | 0ms | 2026-04-27T00:35:08.628Z |
| sprint-d-g4-g3.test.ts | todos os chunks de lc227 têm anchor_id não nulo | PASS | 346ms | 2026-04-27T00:35:08.750Z |
| sprint-v64-v65-e2e.test.ts | server/integration/sprint-v64-v65-e2e.test.ts | FAIL | 27ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | V64 — Alertas de Inconsistência | FAIL | 10ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | V64-01: getBriefingInconsistencias retorna array vazio quando briefingStructured é null | FAIL | 7ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | V64-02: getBriefingInconsistencias retorna inconsistências quando briefingStructured tem dados | FAIL | 1ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | V64-03: getProjectSummary expõe inconsistencias[] e briefingStructured | FAIL | 1ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | V64-04: inconsistencias[] é populado pelo generateBriefing quando IA detecta contradições | PASS | 2ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | V65 — RAG Híbrido (LIKE + Re-ranking LLM) | FAIL | 10ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | V65-01: retrieveArticlesFast retorna contexto para CNAEs conhecidos | FAIL | 2ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | V65-02: retrieveArticlesFast retorna fallback quando corpus está vazio | FAIL | 1ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | V65-03: retrieveArticles com re-ranking LLM seleciona artigos relevantes | FAIL | 1ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | V65-04: extractKeywords filtra stopwords e retorna termos relevantes | FAIL | 1ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | V65-05: extractCnaeGroups extrai 2 primeiros dígitos de CNAEs variados | FAIL | 1ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | V65-06: formatContextText formata artigos com labels de lei corretos | FAIL | 1ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | V65-07: generateBriefing injeta contexto RAG (integração via mock) | FAIL | 1ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | V65-08: generateRiskMatrices injeta contexto RAG (integração via mock) | FAIL | 1ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | V65-09: generateActionPlan injeta contexto RAG (integração via mock) | FAIL | 1ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | V65-10: generateDecision injeta contexto RAG com re-ranking (integração via mock) | FAIL | 1ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | Edge Cases V64 + V65 | FAIL | 4ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | EC-01: RAG com corpus vazio retorna contextText de fallback | FAIL | 1ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | EC-02: re-ranking com resposta LLM inválida usa fallback (primeiros topK) | FAIL | 1ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | EC-03: getBriefingInconsistencias com projeto sem briefing retorna array vazio | FAIL | 1ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | EC-04: retrieveArticlesFast com getDb() retornando null usa fallback silencioso | FAIL | 1ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | EC-05: inconsistencias[] com severidade mista é ordenada corretamente | PASS | 1ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | EC-06: formatContextText com lei desconhecida usa fallback de label | FAIL | 1ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | Integração V64 + V65: Fluxo Completo com Inconsistências e RAG | FAIL | 3ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | INT-01: Briefing com inconsistências é salvo e recuperado corretamente | FAIL | 1ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | INT-02: RAG retorna artigos reais e são injetados no contexto do briefing | FAIL | 1ms | 2026-04-27T00:35:08.782Z |
| sprint-v64-v65-e2e.test.ts | INT-03: Componente AlertasInconsistencia recebe dados corretos do backend | PASS | 1ms | 2026-04-27T00:35:08.782Z |
| routers-action-engine.test.ts | Cenário 4 — Persistência: ação pode ser inserida e recuperada do banco | PASS | 259ms | 2026-04-27T00:35:08.887Z |
| routers-action-engine.test.ts | T-B6-10: 4 cenários obrigatórios — alto, médio, contextual, gap oculto | PASS | 260ms | 2026-04-27T00:35:08.887Z |
| routers-briefing-engine.test.ts | section_gaps reflete gaps reais do banco | PASS | 324ms | 2026-04-27T00:35:08.895Z |
| routers-question-engine.test.ts | T-B3-01: Fonte obrigatória em cada pergunta | PASS | 4ms | 2026-04-27T00:35:09.045Z |
| routers-question-engine.test.ts | pergunta aprovada tem requirement_id não vazio | PASS | 1ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | pergunta aprovada tem source_reference com EC ou LC | PASS | 0ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | pergunta aprovada tem source_type válido | PASS | 1ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | pergunta aprovada tem confidence entre 0 e 1 | PASS | 0ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | getSourceType deriva corretamente o tipo da fonte | PASS | 0ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | T-B3-02: Pergunta não repete dados do perfil | PASS | 2ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | pergunta de exemplo não contém 'qual seu regime tributário' | PASS | 0ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | pergunta de exemplo não pergunta sobre UF (já conhecida) | PASS | 0ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | pergunta de exemplo aprofunda o requisito (menciona fonte normativa) | PASS | 0ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | pergunta ruim (genérica) seria identificada como não específica | PASS | 1ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | T-B3-03: Deduplicação semântica | PASS | 2ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | perguntas idênticas têm similaridade 1.0 | PASS | 0ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | perguntas muito similares (≥ 0.92) são detectadas como duplicatas | PASS | 1ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | perguntas completamente diferentes têm similaridade baixa | PASS | 0ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | pergunta duplicata é detectada corretamente | PASS | 0ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | cross-stage: pergunta do layer corporativo não duplica pergunta do layer operacional | PASS | 0ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | T-B3-04: Quality Gate (score ≥ 3.5, até 2 retries, fallback NO_QUESTION) | PASS | 1ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | pergunta com score 4.2 é aprovada (≥ 3.5) | PASS | 0ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | pergunta com score 3.0 seria descartada (< 3.5) | PASS | 0ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | log registra tentativas e scores corretamente | PASS | 1ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | pergunta aprovada na primeira tentativa tem quality_gate_attempts = 1 | PASS | 0ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | pergunta aprovada na segunda tentativa tem quality_gate_attempts = 2 | PASS | 0ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | pergunta boa menciona fonte normativa específica | PASS | 0ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | pergunta ruim não menciona fonte normativa | PASS | 0ms | 2026-04-27T00:35:09.046Z |
| routers-question-engine.test.ts | pergunta aprovada tem question_text com mais de 30 caracteres | PASS | 0ms | 2026-04-27T00:35:09.046Z |
| sprint-d-g4-g3.test.ts | todos os chunks de lc224 têm anchor_id não nulo | PASS | 348ms | 2026-04-27T00:35:09.098Z |
| routers-action-engine.test.ts | server/integration/routers-action-engine.test.ts | PASS | 1577ms | 2026-04-27T00:35:09.100Z |
| routers-briefing-engine.test.ts | section_riscos reflete riscos reais do banco | PASS | 320ms | 2026-04-27T00:35:09.215Z |
| routers-risk-engine.test.ts | T-B5-01: Rastreabilidade gap_id obrigatória | PASS | 3ms | 2026-04-27T00:35:09.321Z |
| routers-risk-engine.test.ts | risco direto tem gap_id não nulo | PASS | 1ms | 2026-04-27T00:35:09.321Z |
| routers-risk-engine.test.ts | risco contextual pode ter gap_id nulo mas DEVE ter origin_justification | PASS | 0ms | 2026-04-27T00:35:09.321Z |
| routers-risk-engine.test.ts | risco sem gap_id e sem justificativa é inválido | PASS | 0ms | 2026-04-27T00:35:09.321Z |
| routers-risk-engine.test.ts | T-B5-02: Taxonomia hierárquica 3 níveis | PASS | 3ms | 2026-04-27T00:35:09.321Z |
| routers-risk-engine.test.ts | schema RiskTaxonomy exige domain, category e type | PASS | 1ms | 2026-04-27T00:35:09.321Z |
| routers-risk-engine.test.ts | taxonomia sem type é inválida | PASS | 1ms | 2026-04-27T00:35:09.321Z |
| routers-risk-engine.test.ts | taxonomia com campos vazios é inválida | PASS | 1ms | 2026-04-27T00:35:09.321Z |
| routers-risk-engine.test.ts | domínios válidos incluem fiscal, trabalhista, societario, contratual, operacional, cadastral | PASS | 0ms | 2026-04-27T00:35:09.321Z |
| routers-risk-engine.test.ts | T-B5-03: Hybrid scoring base_criticality × gap_classification × porte × regime | PASS | 1ms | 2026-04-27T00:35:09.321Z |
| routers-risk-engine.test.ts | criticidade critica + ausencia + grande + lucro_real = score máximo (≥ 90) | PASS | 0ms | 2026-04-27T00:35:09.321Z |
| routers-risk-engine.test.ts | criticidade baixa + parcial + mei + simples = score mínimo (< 30) | PASS | 0ms | 2026-04-27T00:35:09.321Z |
| routers-risk-engine.test.ts | gap parcial tem score menor que gap ausencia para mesma criticidade | PASS | 0ms | 2026-04-27T00:35:09.321Z |
| routers-risk-engine.test.ts | risco contextual tem score menor que risco direto equivalente | PASS | 0ms | 2026-04-27T00:35:09.321Z |
| routers-risk-engine.test.ts | severity é derivado do adjusted_score de forma consistente | PASS | 0ms | 2026-04-27T00:35:09.321Z |
| routers-risk-engine.test.ts | schema RiskOrigin aceita direto, derivado e contextual | PASS | 0ms | 2026-04-27T00:35:09.321Z |
| routers-risk-engine.test.ts | schema RiskOrigin rejeita valores inválidos | PASS | 0ms | 2026-04-27T00:35:09.321Z |
| routers-risk-engine.test.ts | tabela project_risks_v3 tem coluna origin com enum correto | PASS | 49ms | 2026-04-27T00:35:09.369Z |
| routers-risk-engine.test.ts | T-B5-04: Campo origin obrigatório e válido | PASS | 50ms | 2026-04-27T00:35:09.370Z |
| routers-question-engine.test.ts | todos os requisitos no banco têm evaluation_criteria para guiar perguntas | PASS | 343ms | 2026-04-27T00:35:09.387Z |
| routers-question-engine.test.ts | T-B3-05: Relação direta com requisito (específica, não genérica) | PASS | 344ms | 2026-04-27T00:35:09.387Z |
| routers-question-engine.test.ts | pergunta aprovada tem evidence_type não vazio | PASS | 0ms | 2026-04-27T00:35:09.387Z |
| routers-question-engine.test.ts | pergunta aprovada tem evidence_description não vazia | PASS | 0ms | 2026-04-27T00:35:09.387Z |
| routers-question-engine.test.ts | evidence_type é um dos tipos válidos | PASS | 0ms | 2026-04-27T00:35:09.387Z |
| routers-risk-engine.test.ts | empresa grande com lucro_real gera riscos contextuais | PASS | 50ms | 2026-04-27T00:35:09.420Z |
| routers-risk-engine.test.ts | risco contextual tem origin='contextual' e origin_justification não vazia | PASS | 0ms | 2026-04-27T00:35:09.420Z |
| routers-risk-engine.test.ts | risco contextual tem confidence menor que risco direto (< 0.90) | PASS | 0ms | 2026-04-27T00:35:09.420Z |
| routers-risk-engine.test.ts | T-B5-05: Contextual Risk Layer — riscos do perfil da empresa | PASS | 50ms | 2026-04-27T00:35:09.420Z |
| routers-risk-engine.test.ts | risco direto com criticidade critica tem confidence ≥ 0.85 | PASS | 0ms | 2026-04-27T00:35:09.420Z |
| routers-risk-engine.test.ts | risco contextual tem confidence < 0.85 (inferido, não determinístico) | PASS | 0ms | 2026-04-27T00:35:09.420Z |
| routers-risk-engine.test.ts | schema RiskSeverity aceita os 4 níveis corretos | PASS | 0ms | 2026-04-27T00:35:09.420Z |
| routers-question-engine.test.ts | todos os requisitos no banco têm evidence_required para guiar evidências | PASS | 49ms | 2026-04-27T00:35:09.438Z |
| routers-question-engine.test.ts | T-B3-06: Evidência esperada em cada pergunta | PASS | 50ms | 2026-04-27T00:35:09.438Z |
| routers-question-engine.test.ts | T-B3-07: Protocolo NO_QUESTION | PASS | 1ms | 2026-04-27T00:35:09.438Z |
| routers-question-engine.test.ts | status no_valid_question_generated é registrado quando esgota tentativas | PASS | 0ms | 2026-04-27T00:35:09.438Z |
| routers-question-engine.test.ts | requisito com NO_QUESTION fica pendente (não é removido da lista) | PASS | 0ms | 2026-04-27T00:35:09.438Z |
| routers-question-engine.test.ts | sistema NÃO gera pergunta genérica como fallback | PASS | 1ms | 2026-04-27T00:35:09.438Z |
| routers-question-engine.test.ts | pergunta com cnae_code tem o código registrado | PASS | 0ms | 2026-04-27T00:35:09.438Z |
| routers-question-engine.test.ts | pergunta corporativa tem cnae_code = null | PASS | 0ms | 2026-04-27T00:35:09.438Z |
| sprint-d-g4-g3.test.ts | todos os chunks de ec132 têm anchor_id não nulo | PASS | 367ms | 2026-04-27T00:35:09.465Z |
| routers-risk-engine.test.ts | tabela project_risks_v3 tem coluna evaluation_confidence | PASS | 48ms | 2026-04-27T00:35:09.469Z |
| routers-risk-engine.test.ts | T-B5-06: Risco crítico tem confidence ≥ 0.85 | PASS | 49ms | 2026-04-27T00:35:09.469Z |
| routers-risk-engine.test.ts | T-B5-07: Scoring não é binário — range contínuo 0-100 | PASS | 1ms | 2026-04-27T00:35:09.469Z |
| routers-risk-engine.test.ts | scores são valores contínuos entre 0 e 100 | PASS | 1ms | 2026-04-27T00:35:09.469Z |
| routers-risk-engine.test.ts | scoring_factors documenta todos os multiplicadores aplicados | PASS | 0ms | 2026-04-27T00:35:09.469Z |
| routers-risk-engine.test.ts | risco direto sem source_reference é inválido | PASS | 0ms | 2026-04-27T00:35:09.469Z |
| routers-question-engine.test.ts | requisitos CNAE no banco estão separados por layer=cnae | PASS | 49ms | 2026-04-27T00:35:09.490Z |
| routers-question-engine.test.ts | perguntas de CNAEs diferentes não se misturam (cnae_code diferente) | PASS | 0ms | 2026-04-27T00:35:09.490Z |
| routers-question-engine.test.ts | T-B3-08: Loop por CNAE (perguntas próprias por CNAE) | PASS | 50ms | 2026-04-27T00:35:09.490Z |
| routers-question-engine.test.ts | T-B3-09: Logs de decisão completos | PASS | 1ms | 2026-04-27T00:35:09.490Z |
| routers-question-engine.test.ts | log de pergunta aprovada tem todos os campos obrigatórios | PASS | 0ms | 2026-04-27T00:35:09.490Z |
| routers-question-engine.test.ts | log de pergunta descartada por dedup tem discard_reason | PASS | 0ms | 2026-04-27T00:35:09.490Z |
| routers-question-engine.test.ts | log de NO_QUESTION tem retry_reasons com motivo de cada tentativa | PASS | 0ms | 2026-04-27T00:35:09.490Z |
| routers-question-engine.test.ts | resultado final tem contadores corretos | PASS | 1ms | 2026-04-27T00:35:09.490Z |
| routers-question-engine.test.ts | fonte ✔ — toda pergunta aprovada tem requirement_id + source_reference + source_type + confidence | PASS | 0ms | 2026-04-27T00:35:09.490Z |
| routers-question-engine.test.ts | deduplicação ✔ — perguntas idênticas são detectadas | PASS | 0ms | 2026-04-27T00:35:09.490Z |
| routers-question-engine.test.ts | retry ✔ — quality_gate_attempts pode ser 1, 2 ou 3 | PASS | 0ms | 2026-04-27T00:35:09.490Z |
| routers-question-engine.test.ts | fallback ✔ — status no_valid_question_generated existe como enum válido | PASS | 0ms | 2026-04-27T00:35:09.490Z |
| routers-risk-engine.test.ts | tabela project_risks_v3 tem coluna source_reference | PASS | 48ms | 2026-04-27T00:35:09.517Z |
| routers-risk-engine.test.ts | T-B5-08: source_reference obrigatório para riscos direto/derivado | PASS | 48ms | 2026-04-27T00:35:09.517Z |
| routers-risk-engine.test.ts | scoring_factors é um array não vazio | PASS | 0ms | 2026-04-27T00:35:09.517Z |
| routers-briefing-engine.test.ts | section_plano_acao reflete ações reais do banco | PASS | 315ms | 2026-04-27T00:35:09.531Z |
| routers-briefing-engine.test.ts | T-B7-04: Multi-input real — perfil + gaps + riscos + ações | PASS | 1669ms | 2026-04-27T00:35:09.531Z |
| routers-question-engine.test.ts | CNAE condicional ✔ — requisitos CNAE têm layer=cnae no banco | PASS | 49ms | 2026-04-27T00:35:09.531Z |
| routers-question-engine.test.ts | 5 exemplos reais de perguntas bem formadas (estrutura) | PASS | 1ms | 2026-04-27T00:35:09.531Z |
| routers-question-engine.test.ts | T-B3-10: Testes obrigatórios completos | PASS | 51ms | 2026-04-27T00:35:09.531Z |
| routers-question-engine.test.ts | server/integration/routers-question-engine.test.ts | PASS | 509ms | 2026-04-27T00:35:09.531Z |
| onda1-t06-t10.test.ts | T06 — Regressão de rotas legadas (regression suite) | PASS | 5ms | 2026-04-27T00:35:09.648Z |
| onda1-t06-t10.test.ts | T06.1 — rota /questionario-v3 não deve ser o destino após confirmação de CNAEs | PASS | 2ms | 2026-04-27T00:35:09.648Z |
| onda1-t06-t10.test.ts | T06.2 — QuestionarioCorporativoV2 não deve retornar para /projetos/:id após concluir | PASS | 1ms | 2026-04-27T00:35:09.648Z |
| onda1-t06-t10.test.ts | T06.3 — QuestionarioOperacional não deve retornar para /projetos/:id após concluir | PASS | 0ms | 2026-04-27T00:35:09.648Z |
| onda1-t06-t10.test.ts | T06.4 — QuestionarioCNAE deve navegar para briefing-v3 após concluir | PASS | 0ms | 2026-04-27T00:35:09.648Z |
| onda1-t06-t10.test.ts | T06.5 — flowStepperUtils mapeia todos os status v2.1 | PASS | 0ms | 2026-04-27T00:35:09.648Z |
| onda1-t06-t10.test.ts | T06.6 — ProjetoDetalhesV2 não usa rota legada para etapa 2 | PASS | 0ms | 2026-04-27T00:35:09.648Z |
| sprint-d-g4-g3.test.ts | nenhum anchor_id duplicado no corpus completo | PASS | 348ms | 2026-04-27T00:35:09.813Z |
| onda1-t06-t10.test.ts | T07.1 — máquina de estados: todas as transições são sequenciais | PASS | 1ms | 2026-04-27T00:35:09.849Z |
| routers-briefing-engine.test.ts | section_escopo tem normas_cobertas com LC/EC reais | PASS | 323ms | 2026-04-27T00:35:09.853Z |
| routers-risk-engine.test.ts | tabela project_risks_v3 tem colunas de auditoria B5 | PASS | 385ms | 2026-04-27T00:35:09.904Z |
| routers-risk-engine.test.ts | confidence_reason é uma string explicativa não vazia | PASS | 0ms | 2026-04-27T00:35:09.904Z |
| routers-risk-engine.test.ts | T-B5-09: Logs de decisão auditáveis (scoring_factors) | PASS | 385ms | 2026-04-27T00:35:09.904Z |
| onda1-t06-t10.test.ts | T07.2 — status inicial é rascunho, step 1 | PASS | 99ms | 2026-04-27T00:35:09.948Z |
| onda1-t06-t10.test.ts | T07.3 — transição rascunho → cnaes_confirmados | PASS | 152ms | 2026-04-27T00:35:10.100Z |
| sprint-d-g4-g3.test.ts | corpus lc214 tem pelo menos 819 chunks Sprint D com anchor_id canônico | PASS | 364ms | 2026-04-27T00:35:10.177Z |
| routers-briefing-engine.test.ts | section_perfil_regulatorio tem normas_aplicaveis com requirement_id | PASS | 327ms | 2026-04-27T00:35:10.180Z |
| onda1-t06-t10.test.ts | T07.4 — transição cnaes_confirmados → diagnostico_corporativo | PASS | 102ms | 2026-04-27T00:35:10.202Z |
| routers-risk-engine.test.ts | Cenário 1 — Risco direto: gap_id não nulo, origin=direto, confidence ≥ 0.85 | PASS | 311ms | 2026-04-27T00:35:10.214Z |
| routers-risk-engine.test.ts | Cenário 2 — Risco derivado: requirement_id rastreável, source_reference presente | PASS | 0ms | 2026-04-27T00:35:10.214Z |
| routers-risk-engine.test.ts | Cenário 3 — Risco contextual: gap_id nulo, justificativa obrigatória, confidence < 0.85 | PASS | 0ms | 2026-04-27T00:35:10.214Z |
| onda1-t06-t10.test.ts | T07.5 — transição diagnostico_corporativo → diagnostico_operacional | PASS | 100ms | 2026-04-27T00:35:10.302Z |
| onda1-t06-t10.test.ts | T07.6 — transição diagnostico_operacional → diagnostico_cnae | PASS | 100ms | 2026-04-27T00:35:10.402Z |
| routers-risk-engine.test.ts | Persistência: risco pode ser inserido e recuperado do banco | PASS | 211ms | 2026-04-27T00:35:10.425Z |
| routers-risk-engine.test.ts | T-B5-10: 3 cenários obrigatórios — direto, derivado, contextual | PASS | 522ms | 2026-04-27T00:35:10.426Z |
| routers-briefing-engine.test.ts | section_gaps tem source_reference para cada gap | PASS | 320ms | 2026-04-27T00:35:10.500Z |
| sprint-d-g4-g3.test.ts | corpus lc214 legado tem anchor_id com sufixo -id{n} | FAIL | 354ms | 2026-04-27T00:35:10.531Z |
| routers-gap-engine.test.ts | T-B4-01: Gap definido por regra determinística | PASS | 3ms | 2026-04-27T00:35:10.567Z |
| routers-gap-engine.test.ts | resposta 'nao' → gap ausencia com confidence ≥ 0.90 (determinístico) | PASS | 2ms | 2026-04-27T00:35:10.567Z |
| routers-gap-engine.test.ts | resposta 'sim' + atendido + evidência completa → sem gap (determinístico) | PASS | 0ms | 2026-04-27T00:35:10.567Z |
| routers-gap-engine.test.ts | resposta 'em andamento' → gap parcial (determinístico por regra de texto) | PASS | 0ms | 2026-04-27T00:35:10.567Z |
| routers-gap-engine.test.ts | resposta vazia → gap ausencia com confidence alto (determinístico) | PASS | 0ms | 2026-04-27T00:35:10.567Z |
| routers-gap-engine.test.ts | requisitos ativos no banco têm source_reference (pré-requisito B2) | PASS | 52ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | todos os cenários de resposta geram um gap_status definido | PASS | 1ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | T-B4-02: Todos os requisitos geram gap_status | PASS | 53ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | T-B4-03: Estados de gap corretos | PASS | 2ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | estado 'ausencia' gerado corretamente para resposta negativa | PASS | 0ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | estado 'parcial' gerado corretamente para resposta parcial | PASS | 0ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | estado 'inadequado' gerado quando há evidência mas não atende | PASS | 0ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | estado null (sem gap) para resposta positiva completa | PASS | 0ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | estado null (sem gap) para não aplicável | PASS | 0ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | estados são sempre do enum correto (ausencia\|parcial\|inadequado\|null) | PASS | 1ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | T-B4-04: Evidência obrigatória em todo gap | PASS | 1ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | gap gerado sempre tem evidence_status definido | PASS | 0ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | gap com evidência ausente tem confidence menor que gap com evidência completa | PASS | 0ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | T-B4-05: evaluation_confidence calculado por regra | PASS | 1ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | confidence alto (≥ 0.90) para casos determinísticos claros | PASS | 0ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | confidence menor (< 0.90) para casos ambíguos | PASS | 0ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | confidence nunca é 0 ou 1 exato (não é binário) | PASS | 0ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | confidence tem reason explicativa (não arbitrário) | PASS | 1ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | T-B4-06: Evidência insuficiente não passa como ok | PASS | 1ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | resposta vazia → gap ausencia (não passa como atendido) | PASS | 0ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | resposta 'nao_respondido' → gap ausencia | PASS | 0ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | evidência parcial com compliance nao_atendido → inadequado (não passa como ok) | PASS | 0ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | evidência insuficiente nunca retorna classification null | PASS | 0ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | T-B4-07: LLM controlado | PASS | 1ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | casos determinísticos não mencionam LLM na razão | PASS | 0ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | caso ambíguo usa fallback determinístico (não IA pura) | PASS | 0ms | 2026-04-27T00:35:10.628Z |
| routers-gap-engine.test.ts | toda classificação retorna reason não vazia | PASS | 0ms | 2026-04-27T00:35:10.628Z |
| routers-risk-engine.test.ts | server/integration/routers-risk-engine.test.ts | PASS | 1775ms | 2026-04-27T00:35:10.629Z |
| routers-gap-engine.test.ts | tabela project_gaps_v3 tem colunas de auditoria (evaluation_confidence_reason) | PASS | 51ms | 2026-04-27T00:35:10.680Z |
| routers-gap-engine.test.ts | T-B4-08: Logs de decisão auditáveis | PASS | 51ms | 2026-04-27T00:35:10.680Z |
| routers-gap-engine.test.ts | T-B4-09: Consistência gap ↔ resposta | PASS | 1ms | 2026-04-27T00:35:10.680Z |
| routers-gap-engine.test.ts | resposta 'sim' completa nunca gera gap (não contradiz resposta positiva) | PASS | 0ms | 2026-04-27T00:35:10.680Z |
| routers-gap-engine.test.ts | resposta 'nao' nunca gera gap null (não contradiz resposta negativa) | PASS | 0ms | 2026-04-27T00:35:10.680Z |
| routers-gap-engine.test.ts | resposta 'nao_aplicavel' nunca gera gap (não contradiz não aplicabilidade) | PASS | 0ms | 2026-04-27T00:35:10.680Z |
| routers-gap-engine.test.ts | resposta parcial nunca gera gap ausencia (seria inconsistente) | PASS | 0ms | 2026-04-27T00:35:10.680Z |
| routers-gap-engine.test.ts | Cenário 1 — Resposta positiva: sem gap, confidence ≥ 0.95 | PASS | 0ms | 2026-04-27T00:35:10.680Z |
| routers-gap-engine.test.ts | Cenário 2 — Resposta negativa: gap ausencia, confidence ≥ 0.90 | PASS | 0ms | 2026-04-27T00:35:10.680Z |
| routers-gap-engine.test.ts | Cenário 3 — Resposta parcial: gap parcial, confidence ≥ 0.85 | PASS | 0ms | 2026-04-27T00:35:10.680Z |
| routers-gap-engine.test.ts | Cenário 4 — Ausência de evidência: gap ausencia, confidence ≥ 0.90 | PASS | 0ms | 2026-04-27T00:35:10.680Z |
| routers-gap-engine.test.ts | Cenário 5 — Evidência inadequada: gap inadequado (não passa como ok) | PASS | 0ms | 2026-04-27T00:35:10.680Z |
| routers-gap-engine.test.ts | Cenário 6 — Não aplicável: sem gap (correto) | PASS | 0ms | 2026-04-27T00:35:10.680Z |
| onda1-t06-t10.test.ts | T07.7 — transição diagnostico_cnae → briefing (step 3) | PASS | 298ms | 2026-04-27T00:35:10.700Z |
| routers-gap-engine.test.ts | Banco de dados tem colunas B4 na tabela project_gaps_v3 | PASS | 50ms | 2026-04-27T00:35:10.730Z |
| routers-gap-engine.test.ts | Requisitos ativos têm source_reference (rastreabilidade normativa) | PASS | 51ms | 2026-04-27T00:35:10.781Z |
| routers-gap-engine.test.ts | T-B4-10: 4 cenários obrigatórios do checklist | PASS | 102ms | 2026-04-27T00:35:10.781Z |
| onda1-t06-t10.test.ts | T07.8 — transição briefing → riscos (step 4) | PASS | 102ms | 2026-04-27T00:35:10.802Z |
| routers-briefing-engine.test.ts | section_riscos tem source_reference para cada risco | PASS | 318ms | 2026-04-27T00:35:10.819Z |
| routers-briefing-engine.test.ts | SectionPerfilRegulatorio exige ao menos 1 norma_aplicavel com requirement_id | PASS | 1ms | 2026-04-27T00:35:10.819Z |
| routers-briefing-engine.test.ts | T-B7-05: Grounding normativo — LC/EC + requirement_id | PASS | 1288ms | 2026-04-27T00:35:10.819Z |
| sprint-d-g4-g3.test.ts | corpus ec132 tem exatamente 18 chunks | PASS | 343ms | 2026-04-27T00:35:10.874Z |
| onda1-t06-t10.test.ts | T07.9 — transição riscos → plano_acao (step 5) | PASS | 100ms | 2026-04-27T00:35:10.902Z |
| routers-gap-engine.test.ts | server/integration/routers-gap-engine.test.ts | PASS | 1117ms | 2026-04-27T00:35:10.995Z |
| onda1-t06-t10.test.ts | T07.10 — transição plano_acao → aprovado | PASS | 100ms | 2026-04-27T00:35:11.005Z |
| onda1-t06-t10.test.ts | T07.11 — sequência completa validada: 8 transições, rascunho → aprovado | PASS | 1ms | 2026-04-27T00:35:11.005Z |
| onda1-t06-t10.test.ts | T07 — Consistência de status e stepper (state machine) | PASS | 1356ms | 2026-04-27T00:35:11.005Z |
| risk-engine-v4.test.ts | server/lib/risk-engine-v4.test.ts | PASS | 29ms | 2026-04-27T00:35:11.071Z |
| risk-engine-v4.test.ts | Bloco A — classificação determinística | PASS | 6ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | A1: imposto_seletivo → severity alta, urgência imediata | PASS | 1ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | A2: confissao_automatica → severity alta, urgência imediata | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | A3: split_payment → severity alta, urgência imediata | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | A4: inscricao_cadastral → severity alta, urgência imediata | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | A5: regime_diferenciado → severity media, urgência curto_prazo | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | A6: obrigacao_acessoria → severity media, urgência curto_prazo | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | A7: SEVERITY_TABLE cobre 10 categorias canônicas + 1 fallback (v2.1) | PASS | 2ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | Bloco B — invariantes críticas | PASS | 2ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | B1: ruleId nunca é null no risco produzido | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | B2: artigo vem do GapRule, nunca inventado | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | B3: breadcrumb tem exatamente 4 nós | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | B4: oportunidade → buildActionPlans retorna array vazio | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | B5: evidence ordenada por SOURCE_RANK (menor = primeiro) | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | B6: função pura — mesma entrada produz mesma saída | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | B7: array vazio de gaps → array vazio de riscos | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | Bloco C — decision table completa | PASS | 1ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | C1: todas as categorias 'alta' têm urgência 'imediata' | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | C2: transicao_iss_ibs → severity media, urgência medio_prazo | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | C3: aliquota_zero → severity oportunidade, urgência curto_prazo | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | C4: aliquota_reduzida → severity oportunidade, urgência curto_prazo | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | C5: credito_presumido → severity oportunidade, urgência curto_prazo | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | C6: SOURCE_RANK respeita ordem cnae < ncm < nbs < solaris < iagen | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | C7: computeRiskMatrix preserva ruleId de cada gap na saída | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | C8: computeRiskMatrix ordena riscos por severity (alta > media > oportunidade) | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | Bloco D — action plan engine | PASS | 2ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | D1: risco severity alta gera plano de ação com prioridade imediata | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | D2: risco severity media gera plano com prioridade correspondente à urgência | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | D3: múltiplos riscos alta geram planos via fallback categoria | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | D4: plano de ação preserva ruleId do risco de origem | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | D5: plano de ação contém breadcrumb de 4 nós | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | D6: mix de severidades — oportunidades filtradas, demais geram planos | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | D7: buildActionPlans é função pura — mesma entrada, mesma saída | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | D8: buildActionPlans com array vazio retorna array vazio | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | Bloco E — DB categories cache | PASS | 1ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | R-31: cache TTL — segunda chamada não vai ao banco | PASS | 1ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | R-32: categoria com vigencia_fim expirada não aparece | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | Bloco F — consolidateRisks | PASS | 14ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | T-01: 138 gaps alimentar → between 20 and 45 consolidated risks, all unique risk_key | PASS | 13ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | T-01b: consolidateRisks groups gaps by categoria, produces evidence_count | PASS | 1ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | T-01c: consolidateRisks with empty gaps returns empty array | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | Bloco G — gate de elegibilidade em consolidateRisks | PASS | 3ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | G1: servicos → imposto_seletivo bloqueado, downgrade para enquadramento_geral | PASS | 1ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | G2: servico (alias singular) → imposto_seletivo também bloqueado | PASS | 1ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | G3: industria → imposto_seletivo permanece (sem regressão) | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| risk-engine-v4.test.ts | G4: comercio → imposto_seletivo permanece (sem regressão) | PASS | 0ms | 2026-04-27T00:35:11.072Z |
| routers-briefing-engine.test.ts | briefing gerado tem rastreabilidade completa | PASS | 320ms | 2026-04-27T00:35:11.139Z |
| routers-briefing-engine.test.ts | norma sem requirement_id gera claim não rastreável | PASS | 0ms | 2026-04-27T00:35:11.139Z |
| routers-briefing-engine.test.ts | tabela project_briefings_v3 tem coluna traceability_map | PASS | 50ms | 2026-04-27T00:35:11.189Z |
| sprint-d-g4-g3.test.ts | corpus total tem pelo menos 2078 chunks | PASS | 354ms | 2026-04-27T00:35:11.229Z |
| sprint-d-g4-g3.test.ts | Bloco 5 — Cobertura do corpus real (banco) | FAIL | 3220ms | 2026-04-27T00:35:11.229Z |
| sprint-d-g4-g3.test.ts | server/integration/sprint-d-g4-g3.test.ts | FAIL | 3237ms | 2026-04-27T00:35:11.229Z |
| routers-briefing-engine.test.ts | tabela project_briefings_v3 tem coluna source_requirements | PASS | 49ms | 2026-04-27T00:35:11.240Z |
| routers-briefing-engine.test.ts | T-B7-06: Rastreabilidade — toda afirmação com origem | PASS | 419ms | 2026-04-27T00:35:11.240Z |
| cnae-discovery-regression.test.ts | CnaesResponseSchema — validação Zod | PASS | 9ms | 2026-04-27T00:35:11.378Z |
| cnae-discovery-regression.test.ts | deve aceitar resposta válida com todos os campos obrigatórios | PASS | 3ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve aceitar resposta sem campo justification (opcional) | PASS | 0ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve rejeitar confidence acima de 100 | PASS | 1ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve rejeitar confidence negativo | PASS | 0ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve rejeitar lista de CNAEs vazia | PASS | 0ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve rejeitar CNAE sem campo code | PASS | 1ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve rejeitar CNAE sem campo description | PASS | 1ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve aceitar múltiplos CNAEs | PASS | 2ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | Extração robusta de JSON da resposta do LLM | PASS | 3ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve extrair JSON de resposta direta | PASS | 1ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve extrair JSON de markdown code block ```json | PASS | 0ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve extrair JSON de markdown code block ``` sem linguagem | PASS | 0ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve remover blocos thinking do Gemini antes de extrair | PASS | 0ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve retornar null para string vazia | PASS | 0ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve retornar null para texto sem JSON | PASS | 0ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve extrair o JSON mais externo quando há JSON aninhado em texto | PASS | 0ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | invokeLLM — temperature=0.2 no payload (regressão crítica) | PASS | 14ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve incluir temperature=0.2 no payload enviado à OpenAI por padrão | PASS | 4ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve usar temperature customizada quando fornecida | PASS | 2ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve usar temperature=0.0 quando explicitamente solicitado | PASS | 2ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve incluir model=gpt-4.1 no payload | PASS | 2ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve lançar erro quando OPENAI_API_KEY não está configurada | PASS | 3ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | generateWithRetry — repasse de temperature para invokeLLM | PASS | 21ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve repassar temperature=0.1 para invokeLLM quando especificado | PASS | 9ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve usar temperature padrão (0.2) quando não especificado | PASS | 4ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve retornar dados validados pelo schema Zod | PASS | 4ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve lançar TRPCError após maxRetries tentativas com JSON inválido | PASS | 5ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | Fallback semântico — confidence máximo de 70 | PASS | 2ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve garantir que candidatos do fallback têm confidence ≤ 70 | PASS | 1ms | 2026-04-27T00:35:11.379Z |
| cnae-discovery-regression.test.ts | deve diferenciar fallback (confidence ≤ 70) de resposta normal (confidence > 70) | PASS | 0ms | 2026-04-27T00:35:11.379Z |
| onda1-t06-t10.test.ts | T08.1 — briefing tem estrutura mínima esperada | PASS | 149ms | 2026-04-27T00:35:11.413Z |
| cnae-discovery-regression.test.ts | deve lançar LLM_TIMEOUT quando fetch demora mais que timeoutMs | PASS | 53ms | 2026-04-27T00:35:11.431Z |
| onda1-t06-t10.test.ts | T08.2 — briefing contém análise por CNAE (coerência com dados de entrada) | PASS | 48ms | 2026-04-27T00:35:11.461Z |
| cnae-discovery-regression.test.ts | deve incluir a duração na mensagem de erro de timeout | PASS | 53ms | 2026-04-27T00:35:11.477Z |
| cnae-discovery-regression.test.ts | deve usar 25s como timeout padrão para extractCnaes (não o padrão de 180s) | PASS | 0ms | 2026-04-27T00:35:11.477Z |
| cnae-discovery-regression.test.ts | invokeLLM — timeout de 25s para extractCnaes | PASS | 106ms | 2026-04-27T00:35:11.477Z |
| cnae-discovery-regression.test.ts | Regressão: cenários reais de produção | PASS | 2ms | 2026-04-27T00:35:11.477Z |
| cnae-discovery-regression.test.ts | deve parsear resposta real do GPT-4.1 para cervejaria | PASS | 0ms | 2026-04-27T00:35:11.477Z |
| cnae-discovery-regression.test.ts | deve parsear resposta real do GPT-4.1 para produtora de café | PASS | 1ms | 2026-04-27T00:35:11.477Z |
| cnae-discovery-regression.test.ts | deve rejeitar resposta com código CNAE inválido (string vazia) | PASS | 0ms | 2026-04-27T00:35:11.477Z |
| cnae-discovery-regression.test.ts | deve rejeitar resposta com description vazia | PASS | 0ms | 2026-04-27T00:35:11.477Z |
| cnae-discovery-regression.test.ts | deve aceitar confidence=0 (caso extremo válido) | PASS | 0ms | 2026-04-27T00:35:11.477Z |
| cnae-discovery-regression.test.ts | deve aceitar confidence=100 (caso extremo válido) | PASS | 0ms | 2026-04-27T00:35:11.477Z |
| cnae-discovery-regression.test.ts | server/cnae-discovery-regression.test.ts | PASS | 158ms | 2026-04-27T00:35:11.477Z |
| routers-briefing-engine.test.ts | resumo não contradiz riscos — situacao_geral coerente | PASS | 318ms | 2026-04-27T00:35:11.557Z |
| onda1-t06-t10.test.ts | T08.3 — matriz de riscos tem estrutura mínima esperada | PASS | 147ms | 2026-04-27T00:35:11.608Z |
| onda1-t06-t10.test.ts | T08.4 — plano de ação tem estrutura mínima esperada | PASS | 149ms | 2026-04-27T00:35:11.757Z |
| routers-briefing-engine.test.ts | plano não contradiz riscos — todo risco crítico tem ação | PASS | 316ms | 2026-04-27T00:35:11.872Z |
| routers-briefing-engine.test.ts | section_resumo_executivo.situacao_geral respeita hierarquia de severidade | PASS | 1ms | 2026-04-27T00:35:11.872Z |
| routers-briefing-engine.test.ts | T-B7-07: Consistência cross-section | PASS | 634ms | 2026-04-27T00:35:11.872Z |
| routers-briefing-engine.test.ts | section_resumo_executivo.fonte_dados não pode ser vazio | PASS | 0ms | 2026-04-27T00:35:11.872Z |
| onda1-t01-t05.test.ts | T01.1 — projeto criado com status rascunho e step 1 | PASS | 100ms | 2026-04-27T00:35:12.063Z |
| onda1-t01-t05.test.ts | T01.2 — CNAEs confirmados: 1 CNAE armazenado | PASS | 49ms | 2026-04-27T00:35:12.112Z |
| routers-bateria-avancada.test.ts | A-01: fluxo simples 1 CNAE — projeto piloto P1 tem dados completos | FAIL | 122ms | 2026-04-27T00:35:12.160Z |
| onda1-t06-t10.test.ts | T08.5 — saídas distintas para casos distintos (golden output check) | PASS | 404ms | 2026-04-27T00:35:12.161Z |
| onda1-t06-t10.test.ts | T08 — Geração de IA (estrutura e coerência) | PASS | 1158ms | 2026-04-27T00:35:12.161Z |
| onda1-t06-t10.test.ts | T09.1 — DIAGNOSTIC_READ_MODE está configurado como shadow ou legacy | PASS | 0ms | 2026-04-27T00:35:12.161Z |
| routers-briefing-engine.test.ts | briefing gerado tem fonte_dados descrevendo as tabelas reais | PASS | 326ms | 2026-04-27T00:35:12.198Z |
| onda1-t06-t10.test.ts | T09.2 — tabela diagnostic_shadow_divergences existe e tem estrutura correta | PASS | 95ms | 2026-04-27T00:35:12.257Z |
| onda1-t01-t05.test.ts | T01.3 — transição para cnaes_confirmados após confirmação | PASS | 147ms | 2026-04-27T00:35:12.260Z |
| routers-bateria-avancada.test.ts | A-02: fluxo 3 CNAEs — projeto piloto P2 tem múltiplos gaps | FAIL | 111ms | 2026-04-27T00:35:12.267Z |
| onda1-t06-t10.test.ts | T09.3 — divergências existentes são todas do tipo esperado | PASS | 98ms | 2026-04-27T00:35:12.355Z |
| onda1-t01-t05.test.ts | T01.4 — transição para diagnostico_corporativo após iniciar questionário | PASS | 100ms | 2026-04-27T00:35:12.360Z |
| routers-bateria-avancada.test.ts | A-03: fluxo 5 CNAEs — projeto P2 tem risco crítico | FAIL | 102ms | 2026-04-27T00:35:12.370Z |
| onda1-t06-t10.test.ts | T09.4 — não há divergências de conflito real (ambos têm valor mas diferentes) | PASS | 101ms | 2026-04-27T00:35:12.456Z |
| routers-bateria-avancada.test.ts | A-04: fluxo com reentrada — analysis_version incrementa | PASS | 103ms | 2026-04-27T00:35:12.473Z |
| routers-briefing-engine.test.ts | section_gaps.top_gaps não contém descrições inventadas | PASS | 315ms | 2026-04-27T00:35:12.514Z |
| routers-bateria-avancada.test.ts | A-05: fluxo com retrocesso — stepHistory existe na tabela projects | PASS | 99ms | 2026-04-27T00:35:12.571Z |
| onda1-t01-t05.test.ts | T01.5 — transição para diagnostico_operacional após concluir corporativo | PASS | 247ms | 2026-04-27T00:35:12.606Z |
| onda1-t06-t10.test.ts | T09.5 — total de divergências é consistente com projetos pré-v2.1 | PASS | 195ms | 2026-04-27T00:35:12.651Z |
| routers-bateria-avancada.test.ts | A-06: fluxo com alteração — currentStep existe na tabela projects | PASS | 98ms | 2026-04-27T00:35:12.669Z |
| routers-bateria-avancada.test.ts | A-07: fluxo completo aprovação — P1 tem gaps + risks + actions | FAIL | 112ms | 2026-04-27T00:35:12.781Z |
| onda1-t01-t05.test.ts | T01.6 — transição para diagnostico_cnae após concluir operacional | PASS | 200ms | 2026-04-27T00:35:12.806Z |
| routers-briefing-engine.test.ts | section_riscos.top_risks não contém scores inventados | PASS | 317ms | 2026-04-27T00:35:12.830Z |
| routers-briefing-engine.test.ts | T-B7-08: Sem alucinação — nada além dos dados | PASS | 958ms | 2026-04-27T00:35:12.830Z |
| routers-bateria-avancada.test.ts | A-08: fluxo interrompido — consistencyStatus existe na tabela projects | PASS | 98ms | 2026-04-27T00:35:12.880Z |
| routers-bateria-avancada.test.ts | A-09: fluxo retomado — scoringData existe na tabela projects | PASS | 103ms | 2026-04-27T00:35:12.983Z |
| onda1-t01-t05.test.ts | T01.7 — respostas CNAE salvas na tabela questionnaireAnswersV3 | PASS | 196ms | 2026-04-27T00:35:13.002Z |
| onda1-t06-t10.test.ts | T09.6 — logging de divergência funciona (insert e query) | PASS | 400ms | 2026-04-27T00:35:13.052Z |
| onda1-t06-t10.test.ts | T09.7 — modo shadow implementado com comparação assíncrona em background | PASS | 1ms | 2026-04-27T00:35:13.052Z |
| onda1-t06-t10.test.ts | T09 — Shadow Mode (observabilidade) | PASS | 890ms | 2026-04-27T00:35:13.052Z |
| routers-bateria-avancada.test.ts | A-10: fluxo edge-case vazio — sistema não quebra com projeto sem dados v3 | PASS | 103ms | 2026-04-27T00:35:13.086Z |
| routers-bateria-avancada.test.ts | GRUPO A — Fluxo | FAIL | 1053ms | 2026-04-27T00:35:13.086Z |
| routers-briefing-engine.test.ts | section_proximos_passos tem passos com prazo e responsável definidos | PASS | 316ms | 2026-04-27T00:35:13.161Z |
| onda1-t01-t05.test.ts | T01.8 — transição para briefing após diagnóstico completo | PASS | 152ms | 2026-04-27T00:35:13.161Z |
| routers-bateria-avancada.test.ts | B-11: coverage completo — 138/138 requisitos v3 mapeados no D7 | FAIL | 103ms | 2026-04-27T00:35:13.189Z |
| routers-bateria-avancada.test.ts | B-12: coverage bloqueado — zero coverage falso (score≥0.9 + nao_atendido) | FAIL | 104ms | 2026-04-27T00:35:13.294Z |
| onda1-t01-t05.test.ts | T01.9 — transição para riscos após aprovação do briefing | PASS | 199ms | 2026-04-27T00:35:13.354Z |
| onda1-t06-t10.test.ts | T10.1 — projeto aprovado tem status aprovado e step 5 | PASS | 48ms | 2026-04-27T00:35:13.356Z |
| routers-bateria-avancada.test.ts | B-13: requirement sem pergunta — D7 tem 499+ mapeamentos para 138 requisitos | FAIL | 108ms | 2026-04-27T00:35:13.402Z |
| onda1-t01-t05.test.ts | T01.10 — transição para plano_acao após aprovação das matrizes | PASS | 100ms | 2026-04-27T00:35:13.487Z |
| onda1-t06-t10.test.ts | T10.2 — início de alteração: status pode mudar para em_andamento | PASS | 100ms | 2026-04-27T00:35:13.487Z |
| routers-briefing-engine.test.ts | section_proximos_passos tem marcos com critério de sucesso | PASS | 316ms | 2026-04-27T00:35:13.488Z |
| routers-briefing-engine.test.ts | SectionProximosPassos exige ao menos 1 passo imediato | PASS | 1ms | 2026-04-27T00:35:13.488Z |
| routers-bateria-avancada.test.ts | B-14: perguntas aprovadas — 499/499 com question_quality_status=approved | FAIL | 101ms | 2026-04-27T00:35:13.503Z |
| onda1-t06-t10.test.ts | T10.3 — durante alteração: dados V3 preservados (sem corrupção) | PASS | 48ms | 2026-04-27T00:35:13.504Z |
| onda1-t01-t05.test.ts | T01.11 — transição para aprovado após aprovação do plano | PASS | 99ms | 2026-04-27T00:35:13.553Z |
| routers-bateria-avancada.test.ts | B-15: pending_valid_question — nenhuma pergunta com status inválido | PASS | 100ms | 2026-04-27T00:35:13.602Z |
| onda1-t06-t10.test.ts | T10.4 — alteração: pode modificar CNAEs (adicionar novo CNAE) | PASS | 150ms | 2026-04-27T00:35:13.653Z |
| onda1-t01-t05.test.ts | T01.12 — invariante final: projeto aprovado tem CNAEs e diagnosticStatus completo | PASS | 144ms | 2026-04-27T00:35:13.697Z |
| onda1-t01-t05.test.ts | T01 — Fluxo feliz simples (1 CNAE) | PASS | 1936ms | 2026-04-27T00:35:13.697Z |
| onda1-t06-t10.test.ts | T10.5 — após alteração: campo updatedAt existe e é não-nulo | PASS | 48ms | 2026-04-27T00:35:13.700Z |
| routers-bateria-avancada.test.ts | B-16: CNAE sem requisito — sistema retorna requisitos gerais (cnae_scope NULL) | PASS | 99ms | 2026-04-27T00:35:13.702Z |
| routers-briefing-engine.test.ts | section_plano_acao.top_actions tem action_description com ≥ 20 chars | PASS | 316ms | 2026-04-27T00:35:13.780Z |
| routers-briefing-engine.test.ts | T-B7-09: Qualidade executiva — claro, direto, útil | PASS | 949ms | 2026-04-27T00:35:13.780Z |
| routers-bateria-avancada.test.ts | B-17: múltiplos CNAEs — deduplicação via DISTINCT confirmada | PASS | 100ms | 2026-04-27T00:35:13.801Z |
| onda1-t06-t10.test.ts | T10.6 — retorno controlado: volta para aprovado sem corrupção | PASS | 99ms | 2026-04-27T00:35:13.801Z |
| onda1-t06-t10.test.ts | T10.7 — invariante de integridade após alteração + retorno | PASS | 96ms | 2026-04-27T00:35:13.897Z |
| onda1-t06-t10.test.ts | T10 — Alteração do projeto (reentrada completa) | PASS | 845ms | 2026-04-27T00:35:13.897Z |
| routers-bateria-avancada.test.ts | B-18: deduplicação — zero duplicatas em req_v3_to_canonical | PASS | 98ms | 2026-04-27T00:35:13.899Z |
| onda1-t01-t05.test.ts | T02.1 — 3 CNAEs confirmados e armazenados | PASS | 49ms | 2026-04-27T00:35:13.900Z |
| onda1-t06-t10.test.ts | server/integration/onda1-t06-t10.test.ts | PASS | 4659ms | 2026-04-27T00:35:14.000Z |
| routers-bateria-avancada.test.ts | B-19: repetição evitada — zero canonical_ids inválidos no D7 | PASS | 102ms | 2026-04-27T00:35:14.001Z |
| routers-briefing-engine.test.ts | Cenário 1 — Multi-CNAE: briefing com múltiplos CNAEs tem cnaes_secundarios | PASS | 318ms | 2026-04-27T00:35:14.098Z |
| routers-bateria-avancada.test.ts | B-20: question quality gate — zero perguntas sem question_type | PASS | 99ms | 2026-04-27T00:35:14.101Z |
| routers-bateria-avancada.test.ts | GRUPO B — Coverage e Regras | FAIL | 1015ms | 2026-04-27T00:35:14.101Z |
| onda1-t01-t05.test.ts | T02.2 — respostas salvas para cada CNAE individualmente | PASS | 206ms | 2026-04-27T00:35:14.107Z |
| audit-rf5-plano-acao.test.ts | server/audit-rf5-plano-acao.test.ts | PASS | 16ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | RF-5.04 — Status das Tarefas | PASS | 3ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve aceitar os 4 status válidos | PASS | 2ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve sugerir status 'concluido' quando progresso atinge 100% | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | não deve sugerir 'concluido' para progresso menor que 100% | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | RF-5.05 — Controle de Datas e Alertas Visuais | PASS | 1ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve identificar tarefa vencida (endDate no passado e não concluída) | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | não deve marcar tarefa concluída como vencida | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve identificar tarefa com prazo próximo (≤7 dias) | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | não deve marcar tarefa com prazo distante como próxima | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | não deve marcar tarefa sem data de fim como vencida | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | RF-5.06 — Percentual de Andamento (Slider 0-100%) | PASS | 2ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve aceitar valores de 0 a 100 em incrementos de 5 | PASS | 1ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve sugerir status 'concluido' ao atingir 100% | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve manter status atual para progresso entre 0 e 99% | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | RF-5.09 — Comentários por Tarefa com Histórico Cronológico | PASS | 1ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve adicionar comentário com autor, texto e timestamp | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve manter histórico cronológico (comentários ordenados por timestamp) | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve permitir múltiplos comentários por tarefa | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve rejeitar comentário vazio | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve incluir timestamp em milissegundos (UTC) | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | RF-5.10 — Filtros de Tarefas (Status, Responsável, Prazo, Prioridade) | PASS | 2ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve filtrar por status 'em_andamento' | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve filtrar por status 'concluido' | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve filtrar por responsável (case-insensitive) | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve filtrar tarefas vencidas | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve filtrar por prioridade 'Alta' | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve combinar filtros (status + prioridade) | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve retornar todas as tarefas ativas com filtro 'all' | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve excluir tarefas deletadas por padrão | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve incluir tarefas deletadas quando showDeleted=true | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | RF-5.11 — Adição Manual de Tarefas | PASS | 4ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve adicionar tarefa manual com ID único prefixado por 'manual-' | PASS | 1ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve marcar tarefa manual com flag manual=true | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve exigir título para adicionar tarefa manual | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve inicializar tarefa manual com status 'nao_iniciado' e progresso 0 | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve adicionar tarefa manual à área correta do plano | PASS | 2ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | RF-5.13 — Soft Delete e Restauração de Tarefas | PASS | 1ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve marcar tarefa como deletada sem removê-la da lista | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve restaurar tarefa deletada | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve excluir tarefas deletadas dos filtros padrão | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve exibir tarefas deletadas quando showDeleted=true | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve excluir tarefas deletadas do cálculo do dashboard | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | RF-5.16 — Dashboard de Progresso por Área | PASS | 1ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve calcular total de tarefas ativas (não deletadas) | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve calcular número de tarefas concluídas | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve calcular número de tarefas vencidas | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve calcular número de tarefas em andamento | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve calcular percentual de progresso (concluídas/total × 100) | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve retornar progresso 0 para lista vazia | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve retornar progresso 100 quando todas as tarefas estão concluídas | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| audit-rf5-plano-acao.test.ts | deve excluir tarefas deletadas do cálculo do dashboard | PASS | 0ms | 2026-04-27T00:35:14.192Z |
| routers-bateria-avancada.test.ts | C-21: gap atende — P1 tem gaps com compliance_status=atendido | FAIL | 104ms | 2026-04-27T00:35:14.206Z |
| onda1-t01-t05.test.ts | T02.3 — diagnosticStatus.cnae = completed após responder todos os CNAEs | PASS | 102ms | 2026-04-27T00:35:14.208Z |
| onda1-t01-t05.test.ts | T02.4 — briefing deve referenciar os 3 CNAEs | PASS | 105ms | 2026-04-27T00:35:14.313Z |
| routers-bateria-avancada.test.ts | C-22: gap nao_atende — P1 tem gaps com compliance_status=nao_atendido | FAIL | 118ms | 2026-04-27T00:35:14.323Z |
| onda1-t01-t05.test.ts | T02.5 — invariante: 3 CNAEs → 3 análises no briefing (coerência) | PASS | 96ms | 2026-04-27T00:35:14.410Z |
| onda1-t01-t05.test.ts | T02 — Loop com 3 CNAEs (múltiplos setores) | PASS | 712ms | 2026-04-27T00:35:14.410Z |
| routers-briefing-engine.test.ts | Cenário 2 — Risco alto: briefing com risco crítico tem situacao_geral=critica | PASS | 320ms | 2026-04-27T00:35:14.418Z |
| routers-bateria-avancada.test.ts | C-23: gap parcial — P1 tem gaps com compliance_status=parcialmente_atendido | FAIL | 103ms | 2026-04-27T00:35:14.426Z |
| retrocesso-cleanup.test.ts | server/retrocesso-cleanup.test.ts | PASS | 33ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | Bloco 1 — determineCleanupScope | PASS | 12ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 1.1 — avanço não gera limpeza | PASS | 2ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 1.2 — permanência na mesma etapa não gera limpeza | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 1.3 — flowVersion=none nunca gera limpeza | PASS | 0ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 1.4 — retrocesso V1 de etapa 8 para 7 limpa briefingContent, riskMatricesData e actionPlansData | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 1.5 — retrocesso V1 de etapa 10 para 7 limpa briefing, riscos e plano | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 1.6 — retrocesso V1 de etapa 9 para 4 limpa todos os dados de diagnóstico | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 1.7 — retrocesso V3 de etapa 9 para 7 limpa briefingContent e riskMatricesData (sem corporateAnswers V1) | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 1.8 — retrocesso híbrido de etapa 10 para 4 limpa colunas V1 e V3 | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 1.9 — retrocesso de etapa 2 para 1 limpa colunas de diagnóstico (limpeza conservadora) | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 1.10 — retrocesso V1 de etapa 11 para 1 limpa todos os dados de diagnóstico | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 1.11 — retrocesso V3 de etapa 8 para 8 não gera limpeza (mesma etapa) | PASS | 0ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 1.12 — retrocesso V1 de etapa 6 para 5 limpa operationalAnswers e dados das etapas posteriores | PASS | 0ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | Bloco 2 — retrocessoRequiresCleanup | PASS | 3ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 2.1 — retrocesso V1 de 9 para 7 requer limpeza | PASS | 0ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 2.2 — avanço não requer limpeza | PASS | 0ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 2.3 — flowVersion=none nunca requer limpeza | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 2.4 — retrocesso de etapa 3 para 1 requer limpeza (etapas 5-10 > 1 seriam limpas) | PASS | 0ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 2.5 — retrocesso V3 de etapa 8 para 6 requer limpeza | PASS | 0ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 2.6 — permanência na mesma etapa não requer limpeza | PASS | 0ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | Bloco 3 — getRetrocessoWarningMessage | PASS | 2ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 3.1 — retrocesso sem limpeza retorna string vazia | PASS | 0ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 3.2 — retrocesso com limpeza retorna mensagem não vazia | PASS | 0ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 3.3 — mensagem menciona 'Briefing gerado pela IA' ao retroceder de etapa 9 para 7 | PASS | 0ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 3.4 — mensagem menciona 'Matrizes de riscos' ao retroceder de etapa 10 para 8 | PASS | 0ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 3.5 — mensagem menciona 'não pode ser desfeita' | PASS | 0ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 3.6 — flowVersion=none retorna string vazia mesmo com retrocesso grande | PASS | 0ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | Bloco 4 — executeRetrocessoCleanup | PASS | 6ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 4.1 — avanço retorna cleaned=false sem chamar banco | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 4.2 — flowVersion=none retorna cleaned=false sem chamar banco | PASS | 0ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 4.3 — retrocesso V1 de 9 para 7 chama db.update com briefingContent e riskMatricesData | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 4.4 — retrocesso V3 de 9 para 4 chama db.update E db.delete (questionnaireAnswersV3) | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 4.5 — retrocesso híbrido de 10 para 4 chama db.update E db.delete | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 4.6 — retrocesso V3 de 9 para 8 NÃO deleta questionnaireAnswersV3 (etapas 5-7 não afetadas) | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 4.7 — resultado contém fromStep e toStep corretos | PASS | 0ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 4.8 — retrocesso de etapa 2 para 1 retorna cleaned=true (limpeza conservadora de etapas > 1) | PASS | 0ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | Bloco 5 — Invariantes de isolamento V1/V3/híbrido | PASS | 4ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 5.1 — V1 nunca limpa colunas V3 exclusivas (questionnaireAnswersV3 via tabela) | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 5.2 — V3 nunca limpa corporateAnswers/operationalAnswers/cnaeAnswers (colunas V1) | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 5.3 — híbrido limpa tanto colunas V1 quanto V3 | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 5.4 — RAG e CNAEs confirmados NUNCA aparecem nas colunas de limpeza | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 5.5 — stepHistory NUNCA aparece nas colunas de limpeza | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 5.6 — limpeza é idempotente: executar duas vezes não causa erro | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | Bloco 6 — Edge cases | PASS | 6ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 6.1 — fromStep=0 e toStep=0 não gera limpeza | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 6.2 — fromStep muito alto (99) retrocedendo para 1 limpa todos os dados V1 | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 6.3 — retrocesso de etapa 5 para 4 limpa corporateAnswers e todos os dados posteriores (V1) | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 6.4 — retrocesso V3 de etapa 7 para 4 deleta questionnaireAnswersV3 (etapas 5,6,7 > 4) | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 6.5 — retrocesso V3 de etapa 7 para 5 deleta questionnaireAnswersV3 (etapas 6,7 > 5) | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 6.6 — retrocesso V3 de etapa 7 para 7 não deleta questionnaireAnswersV3 (mesma etapa) | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 6.7 — determineCleanupScope retorna reason descritivo ao limpar | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| retrocesso-cleanup.test.ts | 6.8 — determineCleanupScope retorna reason descritivo ao não limpar | PASS | 1ms | 2026-04-27T00:35:14.508Z |
| routers-bateria-avancada.test.ts | C-24: gap evidencia_insuficiente — critical_evidence_flag existe na tabela | PASS | 98ms | 2026-04-27T00:35:14.525Z |
| routers-bateria-avancada.test.ts | C-25: gap nao_aplicavel — compliance_status aceita nao_aplicavel | PASS | 99ms | 2026-04-27T00:35:14.623Z |
| onda1-t01-t05.test.ts | T03.1 — projeto em diagnostico_cnae sem respostas: não pode avançar para briefing | PASS | 98ms | 2026-04-27T00:35:14.661Z |
| onda1-t01-t05.test.ts | T03.2 — projeto sem diagnosticStatus.corporate: bloqueio corporativo | PASS | 48ms | 2026-04-27T00:35:14.710Z |
| routers-bateria-avancada.test.ts | C-26: resposta inconsistente — P3 tem avg_score < 0.5 | PASS | 111ms | 2026-04-27T00:35:14.734Z |
| routers-briefing-engine.test.ts | Cenário 3 — Gaps ocultos: briefing detecta gaps_ocultos | PASS | 318ms | 2026-04-27T00:35:14.736Z |
| onda1-t01-t05.test.ts | T03.3 — projeto sem diagnosticStatus.operational: bloqueio operacional | PASS | 48ms | 2026-04-27T00:35:14.759Z |
| routers-bateria-avancada.test.ts | C-27: evidência fraca — zero coverage falso no banco | FAIL | 60ms | 2026-04-27T00:35:14.794Z |
| onda1-t01-t05.test.ts | T03.4 — após completar apenas corporativo: ainda bloqueado (operacional pendente) | PASS | 100ms | 2026-04-27T00:35:14.858Z |
| e2e.test.ts | E2E: Fluxo básico - criar projeto até transições de status | FAIL | 884ms | 2026-04-27T00:35:14.886Z |
| routers-bateria-avancada.test.ts | C-28: gap derivado corretamente — todos os gaps têm requirement_code | PASS | 102ms | 2026-04-27T00:35:14.896Z |
| onda1-t01-t05.test.ts | T03.5 — após completar corporativo + operacional: ainda bloqueado (cnae pendente) | PASS | 101ms | 2026-04-27T00:35:14.959Z |
| routers-bateria-avancada.test.ts | C-29: gap multi-resposta — score é decimal entre 0 e 1 | FAIL | 103ms | 2026-04-27T00:35:15.000Z |
| sprint-v69-e2e.test.ts | server/integration/sprint-v69-e2e.test.ts | PASS | 18ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | Sprint V69 — Onboarding Guiado | PASS | 17ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | V69-01: getStatus — novo usuário | PASS | 3ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | cria registro inicial e retorna isNew = true | PASS | 3ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | V69-02: getStatus — usuário existente | PASS | 1ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | retorna status existente sem criar duplicata | PASS | 1ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | V69-03: markStep — avança passo | PASS | 2ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | persiste completedSteps e avança currentStep | PASS | 2ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | V69-04: markStep — último passo | PASS | 1ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | marca completedAt quando step é o último (5) | PASS | 1ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | V69-05: skip | PASS | 1ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | marca skipped = true no banco | PASS | 1ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | V69-06: reset | PASS | 0ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | volta ao step 0 e limpa completedSteps | PASS | 0ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | V69-07: fluxo completo (6 passos) | PASS | 2ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | percorre todos os 6 passos e marca o tour como concluído | PASS | 2ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | V69-08: markStep idempotente | PASS | 1ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | não duplica completedSteps ao marcar o mesmo step duas vezes | PASS | 1ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | V69-09: getStatus após skip | PASS | 1ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | retorna skipped = true após pular | PASS | 0ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | V69-10: reset após tour completo | PASS | 1ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | permite recomeçar o tour após conclusão | PASS | 0ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | V69-11 a V69-13: funções utilitárias | PASS | 1ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | V69-11: parseCompletedSteps com string vazia retorna [] | PASS | 0ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | V69-12: completedSteps com JSON inválido retorna [] | PASS | 0ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | V69-13: completedSteps contém todos os passos após markStep | PASS | 1ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | V69-14: validação Zod | PASS | 2ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | markStep com step negativo lança erro de validação | PASS | 2ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | markStep com step > 5 lança erro de validação | PASS | 1ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | V69-15: autenticação obrigatória | PASS | 0ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | getStatus sem usuário autenticado lança erro | PASS | 0ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | V69-16: skip em novo usuário (sem registro prévio) | PASS | 0ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | cria registro com skipped = true diretamente | PASS | 0ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | V69-17: reset em novo usuário (sem registro prévio) | PASS | 0ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | cria registro com step 0 diretamente | PASS | 0ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | V69-18: totalSteps é sempre 6 | PASS | 0ms | 2026-04-27T00:35:15.016Z |
| sprint-v69-e2e.test.ts | getStatus retorna totalSteps = 6 | PASS | 0ms | 2026-04-27T00:35:15.016Z |
| onda1-t01-t05.test.ts | T03.6 — após completar as 3 camadas: desbloqueado para briefing | PASS | 100ms | 2026-04-27T00:35:15.060Z |
| routers-bateria-avancada.test.ts | C-30: gap edge-case — criticality aceita todos os valores esperados | PASS | 99ms | 2026-04-27T00:35:15.098Z |
| routers-bateria-avancada.test.ts | GRUPO C — Gap Engine | FAIL | 997ms | 2026-04-27T00:35:15.098Z |
| e2e.test.ts | E2E: Verificar controle de acesso - cliente não pode acessar projeto de outro | PASS | 261ms | 2026-04-27T00:35:15.148Z |
| routers-briefing-engine.test.ts | Cenário 4 — Persistência: briefing pode ser inserido e recuperado do banco | PASS | 428ms | 2026-04-27T00:35:15.164Z |
| routers-briefing-engine.test.ts | T-B7-10: 4 cenários obrigatórios | PASS | 1385ms | 2026-04-27T00:35:15.164Z |
| onda1-t01-t05.test.ts | T03.7 — status muda para briefing somente após desbloqueio | PASS | 106ms | 2026-04-27T00:35:15.165Z |
| onda1-t01-t05.test.ts | T03 — Bloqueio por incompletude (hard block) | PASS | 756ms | 2026-04-27T00:35:15.165Z |
| routers-bateria-avancada.test.ts | D-31: risco direto — todos os riscos têm origin definido | PASS | 100ms | 2026-04-27T00:35:15.198Z |
| ux-navigation.test.ts | server/ux-navigation.test.ts | PASS | 17ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | Sidebar — persistência localStorage | PASS | 3ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | abre por padrão quando localStorage está vazio | PASS | 1ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | restaura estado 'aberta' do localStorage | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | restaura estado 'fechada' do localStorage | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | toggle de aberta → fechada persiste 'false' | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | toggle de fechada → aberta persiste 'true' | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | Cards de projeto — CTA inteligente | PASS | 2ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | rascunho → 'Ver o fluxo' | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | assessment_fase1 → 'Continuar Fluxo' | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | assessment_fase2 → 'Continuar Fluxo' | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | matriz_riscos → 'Continuar Fluxo' | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | plano_acao → 'Continuar Fluxo' | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | em_avaliacao → 'Continuar Fluxo' | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | em_andamento → 'Continuar Fluxo' | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | parado → 'Continuar Fluxo' | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | aprovado → 'Ver Resultados' | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | concluido → 'Ver Resultados' | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | arquivado → 'Ver Resultados' | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | status desconhecido → 'Ver o fluxo' (fallback seguro) | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | FlowStepper — estados das etapas | PASS | 1ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | etapa atual é 'active' | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | etapa anterior à atual é 'done' | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | etapa futura é 'locked' | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | etapa concluída além da atual é 'done' (completedUpTo > currentStep) | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | etapa 1 (Projeto) é sempre done quando currentStep >= 2 | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | etapa 5 (Plano) é locked quando currentStep = 2 | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | FlowStepper — clicabilidade | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | etapa concluída é clicável | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | etapa atual NÃO é clicável (já está nela) | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | etapa futura NÃO é clicável | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | etapa 2 é clicável quando usuário está na etapa 4 e completou até 3 | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | Back navigation — labels e rotas | PASS | 1ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | Questionário volta para o Projeto com label correto | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | Briefing volta para o Questionário com label correto | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | Matrizes volta para o Briefing com label correto | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | Plano de Ação volta para as Matrizes com label correto | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | nenhuma etapa usa botão icon-only (sem texto) | PASS | 1ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | ProjetoDetalhesV2 — rotas do stepper interno (regressão bug 404) | PASS | 4ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | passo Projeto navega para /projetos/:id (não para /novo-projeto-v3?edit=:id) | PASS | 1ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | passo Questionário navega para /projetos/:id/questionario-v3 | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | passo Briefing navega para /projetos/:id/briefing-v3 | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | passo Riscos navega para /projetos/:id/matrizes-v3 | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | passo Plano de Ação navega para /projetos/:id/plano-v3 | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | nenhuma rota contém /novo-projeto-v3 ou ?edit= | PASS | 2ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | statusToCompletedStep — mapeamento status → etapa concluída | PASS | 2ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | status undefined/null retorna etapa 1 (seguro) | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | rascunho → etapa 1 (nenhuma etapa do fluxo concluída) | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | assessment_fase1 → etapa 1 (questionário em andamento) | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | assessment_fase2 → etapa 2 (questionário concluído) | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | matriz_riscos → etapa 3 (briefing concluído) | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | plano_acao → etapa 4 (riscos concluídos) | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | em_avaliacao → etapa 4 (aguardando aprovação) | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | aprovado → etapa 5 (todas as etapas concluídas) | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | em_andamento → etapa 5 | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | concluido → etapa 5 | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | arquivado → etapa 5 | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | status desconhecido → etapa 1 (fallback seguro) | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | FlowStepper com completedUpTo — projeto Aprovado (regressão bug etapas cinzas) | PASS | 1ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | projeto Aprovado: completedUpTo deve ser 5 | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | etapa 1 (Projeto) é clicável pois completedUpTo=5 > currentStep=2 | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | etapa 2 (Questionário) é active (não clicável — já está nela) | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | etapa 3 (Briefing) é clicável pois completedUpTo=5 >= 3 | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | etapa 4 (Riscos) é clicável pois completedUpTo=5 >= 4 | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | etapa 5 (Plano de Ação) é clicável pois completedUpTo=5 >= 5 | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | sem completedUpTo (fallback antigo): etapas 3,4,5 ficavam locked (BUG) | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | Badge contador — projetos ativos na sidebar | PASS | 1ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | retorna 0 para lista vazia | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | rascunho NÃO conta como ativo | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | arquivado NÃO conta como ativo | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | concluido NÃO conta como ativo | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | todos os 8 status ativos são contados corretamente | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | mix de ativos e inativos conta apenas os ativos | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | cada status ativo individualmente retorna 1 | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| ux-navigation.test.ts | retorna 0 quando todos são inativos | PASS | 0ms | 2026-04-27T00:35:15.217Z |
| routers-bateria-avancada.test.ts | D-32: risco derivado — riscos com origin=derivado existem no schema | PASS | 99ms | 2026-04-27T00:35:15.297Z |
| e2e.test.ts | E2E: Verificar que equipe_solaris tem acesso total | PASS | 157ms | 2026-04-27T00:35:15.304Z |
| routers-bateria-avancada.test.ts | D-33: risco contextual — riscos com origin=contextual existem no banco | FAIL | 100ms | 2026-04-27T00:35:15.399Z |
| onda1-t01-t05.test.ts | T04.1 — respostas do questionário corporativo persistidas no banco | PASS | 147ms | 2026-04-27T00:35:15.470Z |
| routers-bateria-avancada.test.ts | D-34: risco alto impacto — P2 tem risco crítico com risk_score alto | FAIL | 102ms | 2026-04-27T00:35:15.499Z |
| routers-bateria-avancada.test.ts | D-35: risco médio impacto — P1 tem riscos com risk_level=alto | FAIL | 101ms | 2026-04-27T00:35:15.601Z |
| onda1-t01-t05.test.ts | T04.2 — respostas do questionário operacional persistidas no banco | PASS | 158ms | 2026-04-27T00:35:15.628Z |
| e2e.test.ts | E2E: Verificar salvamento e recuperação de Assessment Fase 1 | PASS | 327ms | 2026-04-27T00:35:15.631Z |
| audit-e2e-fluxo-v3.test.ts | server/integration/audit-e2e-fluxo-v3.test.ts | FAIL | 18ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | E2E — Fluxo Completo V3 (Etapas 1 a 5) | FAIL | 14ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | Etapa 1 — Criação do Projeto e Aprovação de CNAEs | FAIL | 8ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve criar projeto com descrição ≥ 100 caracteres (RF-1.01) | FAIL | 6ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve extrair CNAEs via IA a partir da descrição (RF-1.04) | FAIL | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve refinar CNAEs com feedback do usuário (RF-1.05 — loop PG-05) | FAIL | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve confirmar CNAEs e avançar para step 2 (Gate 1) | FAIL | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | Etapa 2 — Questionário Adaptativo por CNAE | FAIL | 1ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve gerar perguntas específicas para cada CNAE via IA (RF-2.01) | FAIL | 1ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve gerar perguntas de Nível 2 com contexto das respostas do Nível 1 (RF-2.05) | FAIL | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve avançar para Etapa 3 somente quando todos os CNAEs têm Nível 1 concluído (Gate 2) | FAIL | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | Etapa 3 — Briefing de Compliance | FAIL | 1ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve gerar briefing consolidando todas as respostas do questionário (RF-3.01) | FAIL | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve incorporar correção do usuário na regeneração (RF-3.04) | FAIL | 1ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve salvar versão do briefing ao aprovar (RF-3.06 — histórico de versões) | FAIL | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | Etapa 4 — Matrizes de Riscos | FAIL | 1ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve gerar matrizes para as 4 áreas a partir do briefing aprovado (RF-4.01) | FAIL | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve bloquear Etapa 5 se nem todas as 4 áreas estiverem aprovadas (Gate 4 — RF-4.10) | FAIL | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve liberar Etapa 5 quando todas as 4 áreas estiverem aprovadas (Gate 4 — RF-4.10) | FAIL | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | Etapa 5 — Plano de Ação | FAIL | 1ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve gerar plano de ação para as 4 áreas a partir das matrizes aprovadas (RF-5.01) | FAIL | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve persistir plano aprovado no banco de dados (RF-5.03) | FAIL | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve salvar comentário em tarefa e manter histórico (RF-5.09) | FAIL | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve calcular progresso geral do projeto como média das 4 áreas (RF-5.16) | FAIL | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | Persistência — Auto-save e Recuperação de Rascunho | PASS | 2ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve salvar rascunho no localStorage com chave por projectId e etapa | PASS | 1ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve recuperar rascunho salvo ao recarregar a página | PASS | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve limpar rascunho após aprovação definitiva da etapa | PASS | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | deve ignorar rascunho corrompido (JSON inválido) | PASS | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | RF-2 UX: Tela de entrada por CNAE com persistência (startedCnaes) | PASS | 2ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | startedCnaes começa vazio — nenhum CNAE iniciado automaticamente | PASS | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | handleStartCnae adiciona o código ao Set | PASS | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | ao retomar rascunho, startedCnaes é restaurado do localStorage | PASS | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | CNAE não iniciado NÃO dispara loadQuestions (guard do useEffect) | PASS | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | CNAE iniciado SIM dispara loadQuestions (guard do useEffect) | PASS | 0ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | startedCnaes é serializado como array para o localStorage | PASS | 1ms | 2026-04-27T00:35:15.661Z |
| audit-e2e-fluxo-v3.test.ts | startedCnaes é restaurado corretamente de array para Set | PASS | 0ms | 2026-04-27T00:35:15.661Z |
| routers-bateria-avancada.test.ts | D-36: risco baixo impacto — risk_level aceita baixo | PASS | 99ms | 2026-04-27T00:35:15.699Z |
| onda1-t01-t05.test.ts | T04.3 — respostas CNAE persistidas em questionnaireAnswersV3 | PASS | 102ms | 2026-04-27T00:35:15.730Z |
| onda1-t01-t05.test.ts | T04.4 — retomada: status e step preservados após simular reconexão | PASS | 49ms | 2026-04-27T00:35:15.779Z |
| routers-bateria-avancada.test.ts | D-37: cluster de risco — risk_dimension cobre todos os domínios | PASS | 99ms | 2026-04-27T00:35:15.798Z |
| onda1-t01-t05.test.ts | T04.5 — retomada: respostas anteriores não perdidas após simular reconexão | PASS | 48ms | 2026-04-27T00:35:15.826Z |
| routers-bateria-avancada.test.ts | D-38: scoring correto — todos os riscos têm risk_score > 0 | PASS | 100ms | 2026-04-27T00:35:15.897Z |
| routers-briefing-engine.test.ts | M2-A-01: top_gaps inclui gaps source=engine junto com solaris/iagen | PASS | 306ms | 2026-04-27T00:35:15.919Z |
| onda1-t01-t05.test.ts | T04.6 — retomada: diagnosticStatus preservado após simular reconexão | PASS | 100ms | 2026-04-27T00:35:15.926Z |
| routers-bateria-avancada.test.ts | D-39: impacto correto — todos os riscos têm financial_impact_percent | PASS | 99ms | 2026-04-27T00:35:15.996Z |
| onda1-t01-t05.test.ts | T04.7 — progressão retomada: pode avançar do ponto onde parou | PASS | 154ms | 2026-04-27T00:35:16.080Z |
| onda1-t01-t05.test.ts | T04 — Persistência e retomada (session recovery) | PASS | 915ms | 2026-04-27T00:35:16.080Z |
| routers-bateria-avancada.test.ts | D-40: risco sem gap bloqueado — todos os riscos têm requirement_code | PASS | 100ms | 2026-04-27T00:35:16.097Z |
| routers-bateria-avancada.test.ts | GRUPO D — Risk Engine | FAIL | 998ms | 2026-04-27T00:35:16.097Z |
| routers-bateria-avancada.test.ts | E-41: ação executável — todas as ações têm action_description ou action_desc | PASS | 100ms | 2026-04-27T00:35:16.196Z |
| e2e.test.ts | E2E: Verificar transições de status sequenciais | FAIL | 576ms | 2026-04-27T00:35:16.200Z |
| e2e.test.ts | E2E: Fluxo Completo do Usuário | FAIL | 2205ms | 2026-04-27T00:35:16.200Z |
| e2e.test.ts | E2E com Mocks LLM: Fluxo Completo com Geração de Conteúdo | FAIL | 2ms | 2026-04-27T00:35:16.200Z |
| e2e.test.ts | server/integration/e2e.test.ts | FAIL | 2207ms | 2026-04-27T00:35:16.200Z |
| routers-briefing-engine.test.ts | M2-A-02: engine_gaps contém apenas gaps source=engine com evaluation_confidence | PASS | 308ms | 2026-04-27T00:35:16.227Z |
| routers-bateria-avancada.test.ts | E-42: ação com prazo — todas as ações têm estimated_days > 0 | PASS | 99ms | 2026-04-27T00:35:16.296Z |
| suite-uat-12-itens.test.ts | T-G5-01: chunk id=65 contém 'confissão de dívida' no topicos | PASS | 100ms | 2026-04-27T00:35:16.378Z |
| routers-bateria-avancada.test.ts | E-43: ação com evidência — todas as ações têm evidence_required | PASS | 99ms | 2026-04-27T00:35:16.395Z |
| onda1-t01-t05.test.ts | T05.1 — projeto em riscos (step 4) pode retroceder para briefing (step 3) | PASS | 100ms | 2026-04-27T00:35:16.433Z |
| fitness-functions.test.ts | server/integration/fitness-functions.test.ts | FAIL | 62ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | Fitness Function 1 — Existência de ADRs | FAIL | 24ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | FF-01: docs/adr/ existe e tem pelo menos 1 ADR | PASS | 3ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | FF-02: ADR-0009 existe (Fluxo Canônico e Fontes do Diagnóstico) | PASS | 0ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | FF-03: ADR-0010 existe (Substituição QC/QO por NCM/NBS) | PASS | 0ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | FF-04: todo ADR tem seção Status definida | PASS | 11ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | FF-05: todo ADR tem seção Decisão ou Decision | FAIL | 9ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | Fitness Function 2 — Existência de Contratos | PASS | 7ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | FF-06: docs/contratos/ existe | PASS | 2ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | FF-07: contrato DEC-M3-05 existe (Q.Produtos/Q.Serviços) | PASS | 2ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | FF-08: todo contrato tem seção de Invariantes | PASS | 3ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | FF-09: todo contrato tem seção de Violações | PASS | 1ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | Fitness Function 3 — Código vs Contrato DEC-M3-05 | PASS | 8ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | FF-10: ProductAnswer ou TrackedAnswer definido no código | PASS | 0ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | FF-11: getNextStateAfterProductQ usa valores em português (DIV-Z02-003) | PASS | 1ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | FF-12: schema tem productAnswers E serviceAnswers | PASS | 1ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | FF-13: completeProductQuestionnaire existe no router | PASS | 2ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | FF-14: getProductQuestions grava em productAnswers (não em corporateAnswers) | PASS | 2ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | FF-15: VALID_TRANSITIONS tem q_produto e q_servico | PASS | 0ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | FF-16: estados legados diagnostico_corporativo e diagnostico_operacional preservados | PASS | 2ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | Fitness Function 4 — Índice de ADRs e Contratos | FAIL | 11ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | FF-17: docs/adr/ADR-INDEX.md existe | PASS | 0ms | 2026-04-27T00:35:16.455Z |
| fitness-functions.test.ts | FF-18: ADR-INDEX.md lista todos os ADRs existentes | FAIL | 7ms | 2026-04-27T00:35:16.456Z |
| fitness-functions.test.ts | FF-19: DIVs resolvidas têm referência ao ADR/PR que resolveu | PASS | 3ms | 2026-04-27T00:35:16.456Z |
| fitness-functions.test.ts | FF-20: não existe ADR com status PROPOSTO há mais de 30 dias | PASS | 1ms | 2026-04-27T00:35:16.456Z |
| fitness-functions.test.ts | Fitness Function 5 — Rastreabilidade ADR → Código → Teste | PASS | 4ms | 2026-04-27T00:35:16.456Z |
| fitness-functions.test.ts | FF-21: ADR-0010 referenciado em algum teste de integração | PASS | 0ms | 2026-04-27T00:35:16.456Z |
| fitness-functions.test.ts | FF-22: Contrato DEC-M3-05 referenciado no MANUS-GOVERNANCE | PASS | 3ms | 2026-04-27T00:35:16.456Z |
| fitness-functions.test.ts | Fitness Function 6 — E2E Coverage de Frontend | PASS | 5ms | 2026-04-27T00:35:16.456Z |
| fitness-functions.test.ts | FF-23: QuestionarioProduto.tsx tem spec E2E em fluxo-produto.spec.ts | PASS | 3ms | 2026-04-27T00:35:16.456Z |
| fitness-functions.test.ts | FF-23: QuestionarioServico.tsx tem spec E2E em fluxo-servico.spec.ts | PASS | 0ms | 2026-04-27T00:35:16.456Z |
| fitness-functions.test.ts | FF-24: playwright.config.ts existe | PASS | 0ms | 2026-04-27T00:35:16.456Z |
| fitness-functions.test.ts | FF-25: GitHub Action e2e-frontend.yml existe | PASS | 1ms | 2026-04-27T00:35:16.456Z |
| fitness-functions.test.ts | Fitness Function 7 — Wiring de Rotas TO-BE (FF-WIRING) | PASS | 3ms | 2026-04-27T00:35:16.456Z |
| fitness-functions.test.ts | FF-WIRING-01: QuestionarioIaGen navega para questionario-produto | PASS | 0ms | 2026-04-27T00:35:16.456Z |
| fitness-functions.test.ts | FF-WIRING-02: ProjetoDetalhesV2 usa rotas TO-BE | PASS | 0ms | 2026-04-27T00:35:16.456Z |
| fitness-functions.test.ts | FF-WIRING-03: DiagnosticoStepper labels TO-BE | PASS | 0ms | 2026-04-27T00:35:16.456Z |
| fitness-functions.test.ts | FF-EVIDENCE-01: diretório docs/evidencias existe | PASS | 0ms | 2026-04-27T00:35:16.456Z |
| fitness-functions.test.ts | FF-EVIDENCE-02: PR template tem Gate EVIDENCE | PASS | 2ms | 2026-04-27T00:35:16.456Z |
| onda1-t01-t05.test.ts | T05.2 — retrocesso para briefing: dados do briefing preservados | PASS | 48ms | 2026-04-27T00:35:16.481Z |
| routers-bateria-avancada.test.ts | E-44: ação com responsável — owner_suggestion existe na tabela | PASS | 98ms | 2026-04-27T00:35:16.493Z |
| suite-uat-12-itens.test.ts | T-G5-02: busca por 'confissão de dívida' retorna pelo menos 1 chunk | PASS | 150ms | 2026-04-27T00:35:16.529Z |
| onda1-t01-t05.test.ts | T05.3 — retrocesso para briefing: matrizes de risco preservadas | PASS | 48ms | 2026-04-27T00:35:16.529Z |
| routers-bateria-avancada.test.ts | E-45: ação inválida bloqueada — zero ações genéricas (desc < 20 chars) | PASS | 110ms | 2026-04-27T00:35:16.604Z |
| suite-uat-12-itens.test.ts | T-G5-03: chunk id=65 pertence à lc214 e artigo é Art. 45 | PASS | 95ms | 2026-04-27T00:35:16.624Z |
| suite-uat-12-itens.test.ts | G5 — LC 214 Art. 45 — confissão de dívida no corpus | PASS | 346ms | 2026-04-27T00:35:16.624Z |
| onda1-t01-t05.test.ts | T05.4 — retrocesso para diagnóstico: status volta para diagnostico_cnae | PASS | 100ms | 2026-04-27T00:35:16.629Z |
| routers-bateria-avancada.test.ts | E-46: briefing completo — tabela project_briefings_v3 existe | PASS | 98ms | 2026-04-27T00:35:16.702Z |
| suite-uat-12-itens.test.ts | T-G6-01: todos os chunks LC 224 Art. 4 e Art. 4 (parte N) têm cnaeGroups='01-96' | PASS | 98ms | 2026-04-27T00:35:16.722Z |
| onda1-t01-t05.test.ts | T05.5 — retrocesso não cria bypass: briefing ainda bloqueado sem diagnóstico completo | PASS | 99ms | 2026-04-27T00:35:16.728Z |
| onda1-t01-t05.test.ts | T05.6 — verifica tabela de histórico de retrocesso (stepHistory) | PASS | 49ms | 2026-04-27T00:35:16.778Z |
| routers-bateria-avancada.test.ts | E-47: briefing inconsistente bloqueado — has_critical_conflicts existe na tabela | PASS | 98ms | 2026-04-27T00:35:16.800Z |
| suite-uat-12-itens.test.ts | T-G6-02: total de chunks lc224 = 28 (inalterado) | PASS | 97ms | 2026-04-27T00:35:16.875Z |
| suite-uat-12-itens.test.ts | G6 — LC 224 Art. 4° — cnaeGroups cobertura universal | PASS | 195ms | 2026-04-27T00:35:16.875Z |
| suite-uat-12-itens.test.ts | G1+G2 — Labels corretos no rag-retriever | PASS | 1ms | 2026-04-27T00:35:16.875Z |
| suite-uat-12-itens.test.ts | T-G1-01: label lc224 = 'LC 224/2026' (não ausente) | PASS | 0ms | 2026-04-27T00:35:16.875Z |
| suite-uat-12-itens.test.ts | T-G2-01: label lc227 = 'LC 227/2026' (não 2024) | PASS | 0ms | 2026-04-27T00:35:16.875Z |
| suite-uat-12-itens.test.ts | T-G1+G2-02: labels solaris e ia_gen presentes no rag-retriever | PASS | 0ms | 2026-04-27T00:35:16.875Z |
| suite-uat-12-itens.test.ts | G12 — Labels solaris/ia_gen no formatContextText | PASS | 1ms | 2026-04-27T00:35:16.875Z |
| suite-uat-12-itens.test.ts | T-G12-01: rag-retriever contém label 'Equipe Jurídica SOLARIS' | PASS | 0ms | 2026-04-27T00:35:16.875Z |
| suite-uat-12-itens.test.ts | T-G12-02: rag-retriever contém label ia_gen para análise de perfil | PASS | 0ms | 2026-04-27T00:35:16.875Z |
| suite-uat-12-itens.test.ts | G13-UI — Ausência de placeholders [QC-XX-PY] no frontend | PASS | 29ms | 2026-04-27T00:35:16.875Z |
| suite-uat-12-itens.test.ts | T-G13-01: nenhum arquivo .tsx contém padrão [QC-XX-PY] | PASS | 29ms | 2026-04-27T00:35:16.875Z |
| suite-uat-12-itens.test.ts | G14 — Label 'Contabilidade e Fiscal' no frontend | PASS | 21ms | 2026-04-27T00:35:16.875Z |
| suite-uat-12-itens.test.ts | T-G14-01: label 'Contabilidade e Fiscal' presente em pelo menos 3 arquivos .tsx | PASS | 12ms | 2026-04-27T00:35:16.875Z |
| suite-uat-12-itens.test.ts | T-G14-02: label antigo 'Contabilidade' isolado não existe como SelectItem value=CONT | PASS | 9ms | 2026-04-27T00:35:16.875Z |
| suite-uat-12-itens.test.ts | G9+G10 — Schema Zod: validateRagOutput + fonte_risco | FAIL | 4ms | 2026-04-27T00:35:16.875Z |
| suite-uat-12-itens.test.ts | T-G9-01: validateRagOutput implementado com safeParse em ai-schemas.ts | PASS | 0ms | 2026-04-27T00:35:16.875Z |
| suite-uat-12-itens.test.ts | T-G10-01: fonte_risco com fallback 'fonte não identificada' em RiskItemSchema | PASS | 0ms | 2026-04-27T00:35:16.875Z |
| suite-uat-12-itens.test.ts | T-G10-02: acao_concreta presente no TaskItemSchema | PASS | 0ms | 2026-04-27T00:35:16.875Z |
| suite-uat-12-itens.test.ts | T-G10-03: validateRagOutput retorna objeto estruturado (não exceção) para payload inválido | FAIL | 3ms | 2026-04-27T00:35:16.875Z |
| ncm-nbs-combinations.test.ts | server/integration/ncm-nbs-combinations.test.ts | PASS | 9ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | generateProductQuestions — Combinações NCM × operationType | PASS | 6ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-P-01: operationType=servico, NCM=vazio → nao_aplicavel | PASS | 2ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-P-02: operationType=servico, NCM=com código → nao_aplicavel (tipo prevalece sobre NCM) | PASS | 0ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-P-03: operationType=produto, NCM=vazio → fallback + alerta NCM | PASS | 1ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-P-04: operationType=produto, NCM=com código, RAG vazio → fallback parcial (RAG+SOLARIS vazios) | PASS | 1ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-P-05: operationType=produto, NCM=com código, RAG com chunk → fallback parcial (LLM indisponível em teste) | PASS | 1ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-P-06: operationType=misto, NCM=vazio → fallback + alerta NCM | PASS | 0ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-P-07: operationType=undefined, CNAE=serviço → nao_aplicavel (inferência CNAE) | PASS | 0ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-P-08: operationType=undefined, CNAE=produto, NCM=vazio → fallback + alerta NCM | PASS | 0ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-P-09: operationType=undefined, CNAE=vazio, NCM=vazio → fallback + alerta NCM (misto conservador) | PASS | 0ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | generateServiceQuestions — Combinações NBS × operationType | PASS | 2ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-S-01: operationType=produto, NBS=vazio → nao_aplicavel | PASS | 0ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-S-02: operationType=produto, NBS=com código → nao_aplicavel (tipo prevalece sobre NBS) | PASS | 0ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-S-03: operationType=servico, NBS=vazio → fallback + alerta NBS | PASS | 0ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-S-04: operationType=servico, NBS=com código, RAG vazio → fallback parcial (RAG+SOLARIS vazios) | PASS | 0ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-S-05: operationType=servico, NBS=com código, RAG com chunk → fallback parcial (LLM indisponível em teste) | PASS | 0ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-S-06: operationType=misto, NBS=vazio → fallback + alerta NBS | PASS | 0ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-S-07: operationType=undefined, CNAE=produto → nao_aplicavel (inferência CNAE) | PASS | 0ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-S-08: operationType=undefined, CNAE=serviço, NBS=vazio → fallback + alerta NBS | PASS | 0ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-S-09: operationType=undefined, CNAE=vazio, NBS=vazio → fallback + alerta NBS (misto conservador) | PASS | 0ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | Cenários cruzados — somente NCM \| somente NBS \| nenhum | PASS | 1ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-X-01: misto + somente NCM → Q.Produto com perguntas, Q.Serviço com fallback NBS | PASS | 0ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-X-02: misto + somente NBS → Q.Produto com fallback NCM, Q.Serviço com perguntas | PASS | 0ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-X-03: misto + nenhum código → ambos retornam fallback com alerta | PASS | 0ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-X-04: produto puro + NBS fornecido → Q.Serviço nao_aplicavel (tipo prevalece) | PASS | 0ms | 2026-04-27T00:35:16.900Z |
| ncm-nbs-combinations.test.ts | C-X-05: serviço puro + NCM fornecido → Q.Produto nao_aplicavel (tipo prevalece) | PASS | 0ms | 2026-04-27T00:35:16.900Z |
| routers-bateria-avancada.test.ts | E-48: briefing com múltiplos CNAEs — section_identificacao existe na tabela | PASS | 108ms | 2026-04-27T00:35:16.910Z |
| onda1-t01-t05.test.ts | T05.7 — retrocesso controlado: pode avançar novamente após retroceder | PASS | 153ms | 2026-04-27T00:35:16.931Z |
| suite-uat-12-itens.test.ts | T-G4-01: corpus tem pelo menos 50 chunks dos Anexos da LC 214 | PASS | 97ms | 2026-04-27T00:35:16.972Z |
| routers-bateria-avancada.test.ts | E-49: briefing com conflito — traceability_map existe na tabela | PASS | 103ms | 2026-04-27T00:35:17.012Z |
| routers-briefing-engine.test.ts | M2-A-03: engine_gaps é undefined quando não há gaps engine no projeto | PASS | 823ms | 2026-04-27T00:35:17.050Z |
| suite-uat-12-itens.test.ts | T-G4-02: chunks de Anexos LC 214 têm anchor_id preenchido (100%) | PASS | 101ms | 2026-04-27T00:35:17.074Z |
| suite-uat-12-itens.test.ts | G4 — Anexos LC 214 no corpus RAG | PASS | 198ms | 2026-04-27T00:35:17.074Z |
| onda1-t01-t05.test.ts | T05.8 — invariante de integridade: dados não corrompidos após retrocesso + avanço | PASS | 143ms | 2026-04-27T00:35:17.074Z |
| onda1-t01-t05.test.ts | T05 — Retrocesso controlado (step regression) | PASS | 994ms | 2026-04-27T00:35:17.074Z |
| routers-bateria-avancada.test.ts | E-50: briefing com oportunidade — coverage_percent existe na tabela | PASS | 98ms | 2026-04-27T00:35:17.101Z |
| routers-bateria-avancada.test.ts | GRUPO E — Action + Briefing | PASS | 1013ms | 2026-04-27T00:35:17.101Z |
| routers-bateria-avancada.test.ts | server/integration/routers-bateria-avancada.test.ts | FAIL | 5379ms | 2026-04-27T00:35:17.101Z |
| suite-uat-12-itens.test.ts | T-G3-01: corpus tem exatamente 18 chunks EC 132 | PASS | 96ms | 2026-04-27T00:35:17.170Z |
| suite-uat-12-itens.test.ts | T-G3-02: chunks EC 132 têm anchor_id preenchido (100%) | PASS | 104ms | 2026-04-27T00:35:17.268Z |
| suite-uat-12-itens.test.ts | G3 — EC 132 no corpus RAG | PASS | 200ms | 2026-04-27T00:35:17.268Z |
| suite-uat-12-itens.test.ts | G16 — CsvRowSchema (replicado localmente — C-01) | PASS | 4ms | 2026-04-27T00:35:17.268Z |
| suite-uat-12-itens.test.ts | T-G16-schema-01: CsvRowSchema valida linha válida | PASS | 2ms | 2026-04-27T00:35:17.268Z |
| suite-uat-12-itens.test.ts | T-G16-schema-02: CsvRowSchema rejeita linha sem lei | PASS | 1ms | 2026-04-27T00:35:17.268Z |
| suite-uat-12-itens.test.ts | T-G16-schema-03: CsvRowSchema rejeita lei inválida | PASS | 0ms | 2026-04-27T00:35:17.268Z |
| suite-uat-12-itens.test.ts | T-G16-schema-04: CsvRowSchema rejeita conteudo com menos de 10 chars | PASS | 0ms | 2026-04-27T00:35:17.268Z |
| suite-uat-12-itens.test.ts | server/integration/suite-uat-12-itens.test.ts | FAIL | 1291ms | 2026-04-27T00:35:17.268Z |
| onda1-t01-t05.test.ts | server/integration/onda1-t01-t05.test.ts | PASS | 5855ms | 2026-04-27T00:35:17.313Z |
| sprint-z13.5-engine-tests.test.ts | C1 — Chave de consolidacao (risk_key) | PASS | 4ms | 2026-04-27T00:35:17.539Z |
| sprint-z13.5-engine-tests.test.ts | C1: 10 gaps geram 3 riscos distintos agrupados por categoria+contexto | PASS | 4ms | 2026-04-27T00:35:17.539Z |
| sprint-z13.5-engine-tests.test.ts | C2 — Agregacao de evidencias | PASS | 2ms | 2026-04-27T00:35:17.539Z |
| sprint-z13.5-engine-tests.test.ts | C2: 22 gaps de split_payment — nenhum gap perdido na consolidacao | PASS | 2ms | 2026-04-27T00:35:17.539Z |
| sprint-z13.5-engine-tests.test.ts | C3 — Severidade maxima | PASS | 1ms | 2026-04-27T00:35:17.539Z |
| sprint-z13.5-engine-tests.test.ts | C3: severidade do risco consolidado e a maxima entre os gaps do grupo | PASS | 1ms | 2026-04-27T00:35:17.539Z |
| diagnostic-shadow.test.ts | server/diagnostic-shadow.test.ts | PASS | 13ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | utils — areValuesEquivalent | PASS | 4ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna true para dois nulls | PASS | 1ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna false para null vs string | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna false para string vs null | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna true para strings idênticas | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna false para strings diferentes | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna true para objetos com mesmas propriedades | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna false para objetos com propriedades diferentes | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna true para arrays idênticos | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna false para arrays com ordem diferente | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna true para objetos aninhados idênticos | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | utils — stableStringify | PASS | 1ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | serializa null como 'null' | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | serializa string como string com aspas | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | ordena chaves de objeto deterministicamente | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | serializa arrays preservando ordem | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | readers — determineShadowFlowVersion | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna 'v3' para projeto com questionnaireAnswers | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna 'v1' para projeto com corporateAnswers | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna 'none' para projeto sem dados | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna 'hybrid' para projeto com ambos | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | readers — readLegacyDiagnosticSource | PASS | 1ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | lê briefingContent da coluna legada para V3 | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna null para projeto none | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | lê riskMatricesData da coluna legada | PASS | 1ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | readers — readNewDiagnosticSource | PASS | 1ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | lê briefingContentV3 para projeto V3 | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | lê briefingContentV1 para projeto V1 | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna null para projeto none | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | logger — ConsoleDiagnosticDivergenceLogger | PASS | 2ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | loga divergência no console sem lançar erro | PASS | 2ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | logger — createDivergenceLogger | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna ConsoleDiagnosticDivergenceLogger quando NODE_ENV=test | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | shadow — compareDiagnosticSources (sem persistência) | PASS | 1ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna divergencesFound=0 quando legada e nova são iguais (ambas null) | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | detecta divergência quando legada tem valor e nova é null | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna divergencesFound=0 quando legada e nova coincidem | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna o projectId correto | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | shadow — runShadowComparison (com logger mock) | PASS | 2ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna dados legados (invariante de produção) | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | chama logger.log para cada divergência encontrada | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | NÃO chama logger.log quando não há divergência | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | não lança erro quando logger falha (fire-and-forget safety) | PASS | 1ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | getDiagnosticReadMode | PASS | 1ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna 'legacy' por padrão (sem variável de ambiente) | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna 'shadow' quando DIAGNOSTIC_READ_MODE=shadow | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna 'new' quando DIAGNOSTIC_READ_MODE=new | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna 'legacy' para valor inválido | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| diagnostic-shadow.test.ts | retorna 'legacy' para string vazia | PASS | 0ms | 2026-04-27T00:35:17.771Z |
| routers-briefing-engine.test.ts | M2-A-04: top_gaps.min(1) preservado quando projeto tem apenas gaps engine | PASS | 762ms | 2026-04-27T00:35:17.811Z |
| e2e-fluxo-completo.test.ts | Caso 1: completeOnda1 — cnaes_confirmados → onda1_solaris | PASS | 801ms | 2026-04-27T00:35:17.924Z |
| e2e-fluxo-completo.test.ts | Caso 2: completeOnda2 — onda1_solaris → onda2_iagen | PASS | 3ms | 2026-04-27T00:35:17.924Z |
| e2e-fluxo-completo.test.ts | Caso 3: completeDiagnosticLayer(corporate) — onda2_iagen → diagnostico_corporativo | PASS | 2ms | 2026-04-27T00:35:17.924Z |
| e2e-fluxo-completo.test.ts | Caso 4: completeDiagnosticLayer(operational) — diagnostico_corporativo → diagnostico_operacional | PASS | 1ms | 2026-04-27T00:35:17.924Z |
| e2e-fluxo-completo.test.ts | Caso 5: completeDiagnosticLayer(cnae) — diagnostico_operacional → diagnostico_cnae | PASS | 1ms | 2026-04-27T00:35:17.924Z |
| e2e-fluxo-completo.test.ts | Caso 6: approveBriefing — diagnostico_cnae → matriz_riscos (transição atômica) | PASS | 11ms | 2026-04-27T00:35:17.924Z |
| e2e-fluxo-completo.test.ts | Caso 7: approveMatrices — matriz_riscos → plano_acao | PASS | 1ms | 2026-04-27T00:35:17.924Z |
| e2e-fluxo-completo.test.ts | Caso 8: approveActionPlan — plano_acao → aprovado | PASS | 1ms | 2026-04-27T00:35:17.924Z |
| e2e-fluxo-completo.test.ts | Bloco 1 — Happy Path: progressão completa cnaes_confirmados → aprovado | PASS | 822ms | 2026-04-27T00:35:17.924Z |
| e2e-fluxo-completo.test.ts | Bloco 2 — Bloqueios: transições inválidas devem lançar FORBIDDEN | PASS | 5ms | 2026-04-27T00:35:17.924Z |
| e2e-fluxo-completo.test.ts | Caso 9: completeOnda2 com status cnaes_confirmados → FORBIDDEN (pula onda1_solaris) | PASS | 3ms | 2026-04-27T00:35:17.924Z |
| e2e-fluxo-completo.test.ts | Caso 10: approveBriefing com status onda2_iagen → FORBIDDEN (pula diagnóstico) | PASS | 1ms | 2026-04-27T00:35:17.924Z |
| e2e-fluxo-completo.test.ts | Caso 11: approveMatrices com status diagnostico_cnae → FORBIDDEN (pula approveBriefing) | PASS | 1ms | 2026-04-27T00:35:17.924Z |
| e2e-fluxo-completo.test.ts | Caso 12: approveActionPlan com status matriz_riscos → FORBIDDEN (pula approveMatrices) | PASS | 1ms | 2026-04-27T00:35:17.924Z |
| e2e-fluxo-completo.test.ts | Bloco 3 — computeCompleteness: cenários de status global | PASS | 2ms | 2026-04-27T00:35:17.924Z |
| e2e-fluxo-completo.test.ts | Caso 13: empresa produto + 24 solaris + diagnóstico completo + 1 NCM → status 'completo' | PASS | 1ms | 2026-04-27T00:35:17.924Z |
| e2e-fluxo-completo.test.ts | Caso 14: 0 solaris_answers + 0 iagen_answers → status 'insuficiente' | PASS | 0ms | 2026-04-27T00:35:17.924Z |
| e2e-fluxo-completo.test.ts | Caso 15: 12 solaris_answers + 0 iagen_answers + QC incompleto → status 'parcial' | PASS | 1ms | 2026-04-27T00:35:17.924Z |
| e2e-fluxo-completo.test.ts | server/integration/e2e-fluxo-completo.test.ts | PASS | 830ms | 2026-04-27T00:35:17.924Z |
| sprint-v55-status-transitions.test.ts | server/sprint-v55-status-transitions.test.ts | PASS | 18ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | Transições de Status — Permissões por Papel | PASS | 7ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | Equipe SOLARIS (equipe_solaris) | PASS | 4ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | pode mudar de qualquer status para qualquer outro | PASS | 3ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | pode arquivar um projeto em qualquer status | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | Advogado Sênior (advogado_senior) | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | tem as mesmas permissões da equipe SOLARIS | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | Cliente (cliente) | PASS | 2ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | pode solicitar avaliação a partir de rascunho | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | pode solicitar avaliação a partir de qualquer etapa de trabalho | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | NÃO pode aprovar diretamente o projeto | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | NÃO pode marcar como Em Andamento | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | NÃO pode arquivar o projeto | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | NÃO pode retroceder o status | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | NÃO pode transitar de em_avaliacao para aprovado | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | NÃO pode transitar de concluido para qualquer outro status | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | Advogado Júnior (advogado_junior) | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | tem as mesmas restrições de cliente para transições de status | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | Dropdown de Situação — Opções por Papel | PASS | 3ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | equipe_solaris vê todas as 11 opções de status | PASS | 1ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | advogado_senior vê todas as 11 opções de status | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | cliente com status rascunho vê apenas rascunho e em_avaliacao | PASS | 1ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | cliente com status plano_acao vê apenas plano_acao e em_avaliacao | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | cliente sempre vê o status atual no dropdown | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | opções do dropdown têm labels em português | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | Traduções de Status em Português | PASS | 5ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | todos os status do enum têm tradução em português | PASS | 1ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | traduções não contêm termos em inglês | PASS | 1ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | status 'em_avaliacao' é traduzido como 'Aguardando Aprovação' | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | status 'rascunho' é traduzido como 'Rascunho' | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | Filtros de Status na Lista de Projetos | PASS | 1ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | filtro 'todos' retorna todos os projetos | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | filtro por status específico retorna apenas projetos com aquele status | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | filtro por status sem correspondência retorna lista vazia | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | busca por nome filtra corretamente | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | combinação de filtro de status e busca por nome funciona | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | combinação de filtro de status e busca incompatível retorna lista vazia | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | busca é case-insensitive | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | Lógica de Auto-Avanço de Status (Servidor) | PASS | 1ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | ao completar fase 1, status avança para assessment_fase2 | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | ao completar fase 2, status avança para matriz_riscos | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | ao gerar matriz de riscos, status avança para plano_acao | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | ao gerar plano de ação, status permanece em plano_acao | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | ao submeter para aprovação, status avança para em_avaliacao | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | ao aprovar o plano, status avança para aprovado | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| sprint-v55-status-transitions.test.ts | sequência completa de status segue a ordem correta do fluxo | PASS | 0ms | 2026-04-27T00:35:17.974Z |
| routers-briefing-engine.test.ts | M2-A-05: source em top_gaps usa enum válido ['solaris','iagen','engine','v1'] | PASS | 318ms | 2026-04-27T00:35:18.130Z |
| routers-briefing-engine.test.ts | M2-A: engine_gaps + source enum + ordenação por confidence | PASS | 3074ms | 2026-04-27T00:35:18.238Z |
| novo-fluxo-fase3.test.ts | 1. Tabela sessionActionPlans existe no banco | PASS | 58ms | 2026-04-27T00:35:18.310Z |
| cnae-health-validator.test.ts | deve retornar loaded=false quando cache não foi carregado | PASS | 177ms | 2026-04-27T00:35:18.310Z |
| cnae-health-validator.test.ts | deve retornar objeto com campos corretos | PASS | 1ms | 2026-04-27T00:35:18.310Z |
| cnae-health-validator.test.ts | getCacheStatus — Estado do cache em memória | PASS | 178ms | 2026-04-27T00:35:18.310Z |
| cnae-health-validator.test.ts | deve retornar status 'down' quando banco não está disponível | PASS | 11ms | 2026-04-27T00:35:18.310Z |
| cnae-health-validator.test.ts | deve retornar status 'ok' quando banco tem ≥95% dos CNAEs | PASS | 1ms | 2026-04-27T00:35:18.310Z |
| cnae-health-validator.test.ts | deve retornar status 'down' quando OPENAI_API_KEY está ausente | PASS | 13ms | 2026-04-27T00:35:18.328Z |
| cnae-health-validator.test.ts | deve incluir todos os campos obrigatórios na resposta | PASS | 1ms | 2026-04-27T00:35:18.328Z |
| cnae-health-validator.test.ts | checkedAt deve ser um ISO timestamp válido | PASS | 2ms | 2026-04-27T00:35:18.328Z |
| cnae-health-validator.test.ts | version deve ser a versão correta do pipeline | PASS | 1ms | 2026-04-27T00:35:18.328Z |
| cnae-health-validator.test.ts | checkCnaeHealth — Health check do pipeline | PASS | 30ms | 2026-04-27T00:35:18.328Z |
| cnae-health-validator.test.ts | deve abortar com success=false quando OPENAI_API_KEY está ausente | PASS | 23ms | 2026-04-27T00:35:18.347Z |
| cnae-health-validator.test.ts | deve retornar estrutura completa com todos os campos obrigatórios | PASS | 1ms | 2026-04-27T00:35:18.347Z |
| cnae-health-validator.test.ts | expectedCount deve ser 1332 (total de CNAEs IBGE) | PASS | 0ms | 2026-04-27T00:35:18.347Z |
| cnae-health-validator.test.ts | timestamp deve ser um ISO timestamp válido | PASS | 0ms | 2026-04-27T00:35:18.347Z |
| cnae-health-validator.test.ts | durationMs deve ser um número não-negativo | PASS | 1ms | 2026-04-27T00:35:18.347Z |
| cnae-health-validator.test.ts | summary deve ser uma string não-vazia | PASS | 0ms | 2026-04-27T00:35:18.347Z |
| cnae-health-validator.test.ts | validateCnaePipeline — Validação do pipeline | PASS | 27ms | 2026-04-27T00:35:18.347Z |
| cnae-health-validator.test.ts | runAndNotifyValidation — Notificação de resultado | PASS | 2ms | 2026-04-27T00:35:18.347Z |
| cnae-health-validator.test.ts | deve chamar notifyOwner com título de falha quando pipeline falha | PASS | 1ms | 2026-04-27T00:35:18.347Z |
| cnae-health-validator.test.ts | não deve lançar exceção mesmo quando notifyOwner falha | PASS | 1ms | 2026-04-27T00:35:18.347Z |
| cnae-health-validator.test.ts | server/cnae-health-validator.test.ts | PASS | 238ms | 2026-04-27T00:35:18.347Z |
| novo-fluxo-fase3.test.ts | 2. Inserir plano de ação para sessão de teste | PASS | 57ms | 2026-04-27T00:35:18.366Z |
| novo-fluxo-fase3.test.ts | 3. Buscar plano por sessionToken | PASS | 54ms | 2026-04-27T00:35:18.421Z |
| routers-briefing-engine.test.ts | server/integration/routers-briefing-engine.test.ts | PASS | 11306ms | 2026-04-27T00:35:18.508Z |
| flowStateMachine.test.ts | server/flowStateMachine.test.ts | PASS | 14ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | FLOW_STEPS — estrutura | PASS | 4ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve ter 11 etapas | PASS | 2ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve ter stepNumbers sequenciais de 1 a 11 | PASS | 1ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve ter a primeira etapa como perfil_empresa | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve ter a última etapa como dashboard | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | STEP_BY_NAME deve mapear todas as etapas corretamente | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | STEP_BY_NUMBER deve mapear todos os números corretamente | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | validateTransition — transições válidas | PASS | 1ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve permitir avançar da etapa 1 para a 2 | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve permitir retroceder (revisão) | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve bloquear pular etapas (etapa 1 → etapa 4) | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve bloquear etapa desconhecida | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | validateTransition — gates de consistência | PASS | 1ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve bloquear descoberta_cnaes sem consistência executada | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve bloquear descoberta_cnaes com inconsistências críticas não aceitas | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve permitir descoberta_cnaes com consistência aprovada | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve permitir descoberta_cnaes com risco aceito mesmo com inconsistências críticas | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve permitir descoberta_cnaes com status low | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | validateTransition — gates de CNAEs | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve bloquear confirmacao_cnaes sem CNAEs descobertos | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve bloquear diagnostico_corporativo sem CNAEs confirmados | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve permitir diagnostico_corporativo com CNAEs confirmados | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | validateTransition — gates de diagnóstico | PASS | 1ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve bloquear diagnostico_operacional sem diagnóstico corporativo | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve bloquear diagnostico_cnae sem diagnóstico operacional | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve bloquear briefing sem diagnóstico CNAE | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve bloquear riscos sem briefing gerado | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve bloquear plano sem riscos gerados | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve bloquear dashboard sem plano gerado | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | validateTransition — fluxo completo (happy path) | PASS | 2ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve permitir o fluxo completo de 1 a 11 | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | getResumePoint | PASS | 1ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve retornar etapa 1 para projeto novo | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve retornar etapa 4 para projeto com CNAEs confirmados | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve retornar etapa 8 para projeto com briefing gerado | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve retornar resumeData com todos os flags corretos | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | createHistoryEntry | PASS | 1ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve criar entrada de histórico com timestamp ISO | PASS | 1ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve criar entrada sem userId quando não fornecido | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | validateTransition — testes de borda | PASS | 1ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve lidar com currentStep undefined (projeto sem step) | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve bloquear avanço de 11 etapas de uma vez | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| flowStateMachine.test.ts | deve permitir avançar exatamente 1 etapa | PASS | 0ms | 2026-04-27T00:35:18.569Z |
| novo-fluxo-fase3.test.ts | 4. Atualizar status de um item do plano | PASS | 164ms | 2026-04-27T00:35:18.585Z |
| novo-fluxo-fase3.test.ts | 5. Calcular progresso: 1 de 3 itens concluídos = 33% | PASS | 54ms | 2026-04-27T00:35:18.639Z |
| k1-solaris-questions.test.ts | T-K1-01: tabela solaris_questions existe no banco | PASS | 350ms | 2026-04-27T00:35:18.734Z |
| k1-solaris-questions.test.ts | T-K1-02: schema TS tem campos obrigatórios (texto, categoria, fonte, ativo, obrigatorio, criadoEm) | PASS | 1ms | 2026-04-27T00:35:18.735Z |
| k1-solaris-questions.test.ts | T-K1-03: createSolarisQuestion retorna id numérico > 0 | PASS | 54ms | 2026-04-27T00:35:18.787Z |
| novo-fluxo-fase3.test.ts | 6. Marcar todos os itens como concluídos = 100% | PASS | 163ms | 2026-04-27T00:35:18.802Z |
| novo-fluxo-fase3.test.ts | Fase 3 — Banco de Dados | PASS | 551ms | 2026-04-27T00:35:18.802Z |
| novo-fluxo-fase3.test.ts | Fase 3 — Lógica da Matriz de Riscos | PASS | 2ms | 2026-04-27T00:35:18.802Z |
| novo-fluxo-fase3.test.ts | 7. Agrupamento por ramo: 3 ramos distintos | PASS | 0ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | 8. Posicionamento x/y na matriz: critico=4, alto=3, medio=2, baixo=1 | PASS | 1ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | 9. Filtro por ramo: apenas itens de COM | PASS | 0ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | 10. Filtro por prioridade: apenas críticos | PASS | 0ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | Fase 3 — Estrutura de Arquivos | PASS | 3ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | 11. Arquivo routers-session-action-plan.ts existe | PASS | 0ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | 12. Arquivo PlanoAcaoSession.tsx existe | PASS | 0ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | 13. Arquivo MatrizRiscosSession.tsx existe | PASS | 0ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | 14. Rotas /plano-acao-session e /matriz-riscos-session no App.tsx | PASS | 0ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | 15. Router sessionActionPlan registrado no appRouter | PASS | 1ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | 16. Schema contém tabela sessionActionPlans | PASS | 1ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | 17. routers-session-action-plan.ts contém as 4 procedures | PASS | 0ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | Fase 3 — Lógica de Negócio | PASS | 3ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | 18. Prioridades válidas: critica, alta, media, baixa | PASS | 1ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | 19. Status válidos: gerando, gerado, aprovado, em_execucao | PASS | 0ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | 20. Score de compliance está entre 0 e 100 | PASS | 0ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | 21. Ordenação por prioridade: critica > alta > media > baixa | PASS | 0ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | 22. Custo estimado válido: baixo, medio, alto | PASS | 0ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | 23. Risco máximo do ramo calculado corretamente | PASS | 0ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | 24. PlanoAcaoSession.tsx contém tabs corretas | PASS | 0ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | 25. MatrizRiscosSession.tsx contém matriz 4x4 | PASS | 0ms | 2026-04-27T00:35:18.803Z |
| novo-fluxo-fase3.test.ts | server/novo-fluxo-fase3.test.ts | PASS | 1090ms | 2026-04-27T00:35:18.803Z |
| k1-solaris-questions.test.ts | T-K1-04: getSolarisQuestions retorna a pergunta criada | PASS | 109ms | 2026-04-27T00:35:18.896Z |
| bugs-pos-conclusao.test.ts | server/integration/bugs-pos-conclusao.test.ts | FAIL | 14ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | Bug #1 — saveQuestionnaireProgress salva questionnaireAnswers | FAIL | 6ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | deve chamar db.update com questionnaireAnswers no payload | FAIL | 5ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | deve salvar sem avançar etapa quando completed=false | FAIL | 1ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | Bug #1 — getProjectStep1 retorna questionnaireAnswers | FAIL | 1ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | deve retornar questionnaireAnswers no resultado | FAIL | 0ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | deve retornar null para questionnaireAnswers quando não existe | FAIL | 0ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | deve retornar todos os campos necessários para o fluxo pós-conclusão | FAIL | 0ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | Bug #4 — generateBriefing recebe allAnswers corretamente | FAIL | 1ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | deve aceitar allAnswers com o formato correto | FAIL | 0ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | deve aceitar allAnswers vazio (fallback sem respostas) | FAIL | 0ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | deve aceitar correction para re-geração | FAIL | 0ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | Bug #6 — statusToStep e FLOW_STEPS com completedStatuses corretos | PASS | 3ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | statusToStep deve mapear assessment_fase2 para step 2 | PASS | 1ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | statusToStep deve mapear aprovado para step 5 | PASS | 0ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | step Questionário deve estar concluído quando status=assessment_fase2 | PASS | 1ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | step Briefing deve estar concluído quando status=matriz_riscos | PASS | 0ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | step Briefing deve estar concluído quando status=aprovado | PASS | 0ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | step Riscos deve estar concluído quando status=aprovado | PASS | 0ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | step Plano deve estar concluído quando status=aprovado | PASS | 0ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | todos os steps devem estar concluídos quando status=concluido | PASS | 0ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | step Questionário NÃO deve ter assessment_fase1 como concluído (ainda ativo) | PASS | 0ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | Bug #1 — getProgress retorna respostas da tabela questionnaireAnswersV3 | FAIL | 1ms | 2026-04-27T00:35:18.984Z |
| bugs-pos-conclusao.test.ts | deve retornar answers com cnaeCode e questionText | FAIL | 1ms | 2026-04-27T00:35:18.984Z |
| k1-solaris-questions.test.ts | T-K1-05: getSolarisQuestions filtra por cnaePrefix (match: '11' → CNAE '1113-5') | PASS | 104ms | 2026-04-27T00:35:19.000Z |
| bug001-regression.test.ts | server/bug001-regression.test.ts | PASS | 12ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | BUG-001 — Teste 1: createProject salva os 2 campos | PASS | 6ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | companyProfile APÓS a correção contém isEconomicGroup | PASS | 2ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | companyProfile APÓS a correção contém taxCentralization | PASS | 1ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | companyProfile ANTES da correção NÃO continha isEconomicGroup (prova do bug) | PASS | 1ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | companyProfile ANTES da correção NÃO continha taxCentralization (prova do bug) | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | isEconomicGroup aceita false (empresa sem grupo econômico) | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | isEconomicGroup aceita null (usuário não respondeu) | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | taxCentralization aceita 'decentralized' | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | taxCentralization aceita 'partial' | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | taxCentralization aceita null (usuário não respondeu) | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | BUG-001 — Teste 2: getProjectById retorna os campos (via normalizeProject) | PASS | 2ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | normalizeProject desserializa isEconomicGroup=true do JSON do banco | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | normalizeProject desserializa isEconomicGroup=false do JSON do banco | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | normalizeProject desserializa taxCentralization='centralized' do JSON do banco | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | normalizeProject desserializa taxCentralization='decentralized' do JSON do banco | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | normalizeProject desserializa taxCentralization='partial' do JSON do banco | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | normalizeProject retorna null para isEconomicGroup quando campo ausente (projeto legado) | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | normalizeProject retorna null para taxCentralization quando campo ausente (projeto legado) | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | BUG-001 — Teste 3: buildCorporatePrefill usa isEconomicGroup e taxCentralization | PASS | 2ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | qc02_grupo pré-preenchido como 'Sim' quando isEconomicGroup=true | PASS | 1ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | qc02_grupo pré-preenchido como 'Não' quando isEconomicGroup=false | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | qc02_grupo ausente do prefill quando isEconomicGroup=null | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | qc02_centralizacao pré-preenchido quando taxCentralization='centralized' | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | qc02_centralizacao pré-preenchido quando taxCentralization='decentralized' | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | qc02_centralizacao pré-preenchido quando taxCentralization='partial' | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | qc02_centralizacao ausente do prefill quando taxCentralization=null | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | BUG-001 — Teste 4: QC-02 completo pré-preenchido | PASS | 1ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | cenário grupo econômico centralizado: qc02_grupo + qc02_centralizacao + qc02_filiais todos preenchidos | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | cenário empresa independente: qc02_grupo='Não', qc02_centralizacao ausente | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | cenário projeto legado (sem campos QC-02): qc02_grupo e qc02_centralizacao ausentes do prefill | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | qc01_regime e qc01_porte continuam pré-preenchidos no mesmo cenário (sem regressão) | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | BUG-001 — Teste 5: Regressão — campos antigos não foram afetados | PASS | 1ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | qc01_regime continua pré-preenchido após a correção | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | qc01_porte continua pré-preenchido após a correção | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | qc02_filiais continua pré-preenchido via operationProfile.multiState | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | normalizeProject ainda desserializa todos os 14 campos JSON corretamente | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | companyProfile com os 2 novos campos não quebra outros campos existentes | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| bug001-regression.test.ts | buildCorporatePrefill com projeto que tem todos os campos QC-02 retorna prefill completo | PASS | 0ms | 2026-04-27T00:35:19.020Z |
| k1-solaris-questions.test.ts | T-K1-06: getSolarisQuestions NÃO retorna pergunta com cnaeGroups incompatível | PASS | 105ms | 2026-04-27T00:35:19.105Z |
| k1-solaris-questions.test.ts | T-K1-07: pergunta universal (cnaeGroups=null) aparece para qualquer cnaePrefix | PASS | 105ms | 2026-04-27T00:35:19.212Z |
| sprint-v56-regression.test.ts | server/sprint-v56-regression.test.ts | PASS | 12ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | Limpeza do banco (Sprint V56) | PASS | 3ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve confirmar que a tabela projects foi truncada | PASS | 1ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve confirmar que questionnaireAnswersV3 foi truncada | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve confirmar que briefings foi truncada | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve confirmar que riskMatrix foi truncada | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve confirmar que actionPlans foi truncada | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve preservar a tabela users (não truncada) | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | upsertUser — criação de novos usuários via OAuth | PASS | 3ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve criar usuário com role 'cliente' por padrão | PASS | 2ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve usar upsert (INSERT ... ON DUPLICATE KEY UPDATE) para não duplicar usuários | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve atribuir role 'equipe_solaris' ao ownerOpenId automaticamente | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | users.updateRole — alteração de papel de usuário | PASS | 2ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve aceitar todos os roles válidos do enum | PASS | 1ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve rejeitar role inválido | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve impedir que o usuário altere o próprio papel | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve permitir que equipe_solaris altere papel de outro usuário | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve negar acesso para role 'cliente' | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | users.getStats — estatísticas de usuários | PASS | 1ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve contar o total de usuários corretamente | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve agrupar usuários por papel corretamente | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve contar apenas usuários com login nos últimos 7 dias | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | Schema da tabela projects — campos de conteúdo salvo | PASS | 1ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve ter o campo briefingContent do tipo text (nullable) | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve aceitar null para campos de conteúdo (projeto novo sem conteúdo) | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve aceitar JSON válido para riskMatricesData | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve aceitar JSON válido para actionPlansData | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | getProjectSummary — contagem de riscos e tarefas | PASS | 1ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve retornar 0 riscos quando riskMatricesData é null | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve contar riscos de todas as áreas | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve contar tarefas do plano de ação | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve retornar 0 tarefas quando actionPlansData é null | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | getProjectStep1 — retorno de campos de conteúdo | PASS | 1ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve retornar briefingContent quando projeto tem briefing salvo | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve retornar riskMatricesData quando projeto tem matrizes salvas | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve retornar actionPlansData quando projeto tem plano salvo | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve retornar null para campos não preenchidos em projeto novo | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | Regressão: fluxo completo questionário → briefing → riscos → plano | PASS | 1ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve permitir re-abrir questionário com respostas salvas | PASS | 1ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve detectar briefing já aprovado e mostrar aviso | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve detectar matrizes já aprovadas e mostrar aviso | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| sprint-v56-regression.test.ts | deve mostrar tela de conclusão com dados reais ao reabrir projeto aprovado | PASS | 0ms | 2026-04-27T00:35:19.223Z |
| k1-solaris-questions.test.ts | T-K1-08: updateSolarisQuestion altera o texto corretamente | PASS | 158ms | 2026-04-27T00:35:19.368Z |
| test-e2e-t4-state-machine.test.ts | server/integration/test-e2e-t4-state-machine.test.ts | PASS | 7ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | T4 — Máquina de Estados: Bloqueio Sequencial | PASS | 4ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | 1. Estado inicial: nenhuma camada iniciada | PASS | 2ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | 2. BLOQUEIO: Não pode completar 'operational' sem 'corporate' completed | PASS | 0ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | 3. BLOQUEIO: Não pode completar 'cnae' sem 'corporate' completed | PASS | 0ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | 4. BLOQUEIO: Não pode completar 'cnae' com apenas 'corporate' completed | PASS | 0ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | 5. BLOQUEIO: Não pode completar 'operational' com 'corporate' in_progress | PASS | 0ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | 6. PERMITIDO: Pode completar 'corporate' a partir de qualquer estado | PASS | 0ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | 7. PERMITIDO: Pode completar 'operational' após 'corporate' completed | PASS | 0ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | 8. PERMITIDO: Pode completar 'cnae' após 'corporate' e 'operational' completed | PASS | 0ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | T4 — GATE de Briefing: Só libera após 3 camadas completas | PASS | 1ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | 9. GATE BLOQUEADO: Briefing bloqueado com 0 camadas completas | PASS | 0ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | 10. GATE BLOQUEADO: Briefing bloqueado com 1 camada completa (corporate) | PASS | 0ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | 11. GATE BLOQUEADO: Briefing bloqueado com 2 camadas completas (corporate + operational) | PASS | 0ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | 12. GATE LIBERADO: Briefing liberado com 3 camadas completas | PASS | 0ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | 13. GATE BLOQUEADO: Briefing bloqueado com cnae in_progress (não completed) | PASS | 0ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | T4 — Progressão Completa: 0% → 33% → 66% → 100% | PASS | 1ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | 14. Progresso 0% — estado inicial | PASS | 0ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | 15. Progresso ~33% — corporate completed | PASS | 0ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | 16. Progresso ~66% — corporate + operational completed | PASS | 0ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | 17. Progresso 100% — todas as 3 camadas completas | PASS | 0ms | 2026-04-27T00:35:19.400Z |
| test-e2e-t4-state-machine.test.ts | 18. Sequência completa de transições válidas | PASS | 0ms | 2026-04-27T00:35:19.400Z |
| k1-solaris-questions.test.ts | T-K1-09: deactivateSolarisQuestion define ativo=0 (soft-delete) | PASS | 157ms | 2026-04-27T00:35:19.525Z |
| sprint-b-g8-g7.test.ts | server/sprint-b-g8-g7.test.ts | PASS | 13ms | 2026-04-27T00:35:19.599Z |
| sprint-b-g8-g7.test.ts | G8 — companyProfile injetado no generateBriefing | PASS | 10ms | 2026-04-27T00:35:19.599Z |
| sprint-b-g8-g7.test.ts | deve incluir bloco '## Perfil da Empresa' no user message quando companyProfile está presente | PASS | 8ms | 2026-04-27T00:35:19.599Z |
| sprint-b-g8-g7.test.ts | deve usar fallback gracioso quando companyProfile é null | PASS | 0ms | 2026-04-27T00:35:19.599Z |
| sprint-b-g8-g7.test.ts | deve usar project.name como razão social (não campo separado) | PASS | 0ms | 2026-04-27T00:35:19.599Z |
| sprint-b-g8-g7.test.ts | deve usar confirmedCnaes[0] como CNAE principal quando disponível | PASS | 0ms | 2026-04-27T00:35:19.599Z |
| sprint-b-g8-g7.test.ts | deve usar allAnswers[0].cnaeCode como fallback quando confirmedCnaes está vazio | PASS | 0ms | 2026-04-27T00:35:19.599Z |
| sprint-b-g8-g7.test.ts | G7 — RAG separado por área no generateRiskMatrices | PASS | 2ms | 2026-04-27T00:35:19.599Z |
| sprint-b-g8-g7.test.ts | deve chamar retrieveArticlesFast 4 vezes (uma por área) quando nenhuma área é especificada | PASS | 1ms | 2026-04-27T00:35:19.599Z |
| sprint-b-g8-g7.test.ts | deve incluir termos específicos de contabilidade na query da área contabilidade | PASS | 0ms | 2026-04-27T00:35:19.599Z |
| sprint-b-g8-g7.test.ts | deve manter retrocompatibilidade: chamada com área específica usa apenas 1 busca RAG | PASS | 0ms | 2026-04-27T00:35:19.599Z |
| sprint-b-g8-g7.test.ts | deve garantir que cada área recebe contexto RAG independente (não compartilhado) | PASS | 1ms | 2026-04-27T00:35:19.599Z |
| k1-solaris-questions.test.ts | T-K1-10: getSolarisQuestions não retorna perguntas inativas (ativo=0) | PASS | 103ms | 2026-04-27T00:35:19.628Z |
| novo-fluxo-fase1.test.ts | tabela sessions deve existir e aceitar insert | PASS | 463ms | 2026-04-27T00:35:19.703Z |
| k1-solaris-questions.test.ts | T-K1-11: bulkCreateSolarisQuestions insere 3 registros de uma vez | PASS | 104ms | 2026-04-27T00:35:19.732Z |
| k1-solaris-questions.test.ts | T-K1-12: todas as perguntas criadas têm fonte='solaris' | PASS | 51ms | 2026-04-27T00:35:19.783Z |
| onda2-t12-t13.test.ts | T12.1 — projeto em diagnostico_cnae tem estado válido antes da geração | PASS | 99ms | 2026-04-27T00:35:19.827Z |
| novo-fluxo-fase1.test.ts | tabela sessions deve aceitar modo 'historico' | PASS | 156ms | 2026-04-27T00:35:19.859Z |
| sprint-c-g9-g10.test.ts | server/sprint-c-g9-g10.test.ts | PASS | 17ms | 2026-04-27T00:35:19.870Z |
| sprint-c-g9-g10.test.ts | G9 — validateRagOutput: safeParse com erro estruturado | PASS | 12ms | 2026-04-27T00:35:19.870Z |
| sprint-c-g9-g10.test.ts | deve retornar { success: true, data } quando o schema é válido | PASS | 4ms | 2026-04-27T00:35:19.870Z |
| sprint-c-g9-g10.test.ts | deve retornar { success: false, error, raw } quando o schema é inválido | PASS | 2ms | 2026-04-27T00:35:19.870Z |
| sprint-c-g9-g10.test.ts | deve retornar { success: false } para payload completamente inválido (não-objeto) | PASS | 0ms | 2026-04-27T00:35:19.870Z |
| sprint-c-g9-g10.test.ts | deve retornar { success: false } para array vazio (min(1) violado) | PASS | 1ms | 2026-04-27T00:35:19.870Z |
| sprint-c-g9-g10.test.ts | deve não propagar exceção — sempre retorna objeto estruturado | PASS | 1ms | 2026-04-27T00:35:19.870Z |
| sprint-c-g9-g10.test.ts | deve logar erro estruturado no console.error quando falha | PASS | 3ms | 2026-04-27T00:35:19.870Z |
| sprint-c-g9-g10.test.ts | G10 — fonte_risco no RiskItemSchema | PASS | 2ms | 2026-04-27T00:35:19.870Z |
| sprint-c-g9-g10.test.ts | deve aceitar risco com fonte_risco preenchido | PASS | 0ms | 2026-04-27T00:35:19.870Z |
| sprint-c-g9-g10.test.ts | deve aplicar fallback 'fonte não identificada' quando fonte_risco está ausente | PASS | 0ms | 2026-04-27T00:35:19.870Z |
| sprint-c-g9-g10.test.ts | deve aceitar fonte_risco com formato EC 132/2023 | PASS | 1ms | 2026-04-27T00:35:19.870Z |
| sprint-c-g9-g10.test.ts | deve incluir fonte_risco no schema do RisksResponseSchema (array de riscos) | PASS | 1ms | 2026-04-27T00:35:19.870Z |
| sprint-c-g9-g10.test.ts | deve garantir que fonte_risco é string (não undefined) após parse | PASS | 0ms | 2026-04-27T00:35:19.870Z |
| sprint-c-g9-g10.test.ts | G9+G10 — Integração: validateRagOutput com fonte_risco | PASS | 2ms | 2026-04-27T00:35:19.870Z |
| sprint-c-g9-g10.test.ts | deve validar com sucesso um payload completo com fonte_risco | PASS | 1ms | 2026-04-27T00:35:19.870Z |
| sprint-c-g9-g10.test.ts | deve aplicar fallback em fonte_risco ausente mesmo em payload parcialmente válido | PASS | 0ms | 2026-04-27T00:35:19.870Z |
| sprint-c-g9-g10.test.ts | deve garantir que o prompt do generateRiskMatrices inclui instrução de fonte_risco | PASS | 0ms | 2026-04-27T00:35:19.870Z |
| sprint-c-g9-g10.test.ts | deve garantir que o formato de exemplo no prompt inclui fonte_risco | PASS | 0ms | 2026-04-27T00:35:19.870Z |
| onda2-t12-t13.test.ts | T12.2 — simula falha de geração: status permanece em diagnostico_cnae (não avança) | PASS | 49ms | 2026-04-27T00:35:19.876Z |
| novo-fluxo-fase1.test.ts | tabela branchSuggestions deve existir e aceitar insert | PASS | 155ms | 2026-04-27T00:35:20.016Z |
| novo-fluxo-fase1.test.ts | 1. Estrutura do banco de dados | PASS | 776ms | 2026-04-27T00:35:20.016Z |
| novo-fluxo-fase1.test.ts | deve criar sessão com token único | PASS | 1ms | 2026-04-27T00:35:20.016Z |
| onda2-t12-t13.test.ts | T12.3 — simula timeout parcial: dados parciais não corrompem o projeto | PASS | 149ms | 2026-04-27T00:35:20.025Z |
| novo-fluxo-fase1.test.ts | deve criar sessão e recuperar pelo token | PASS | 155ms | 2026-04-27T00:35:20.171Z |
| onda2-t12-t13.test.ts | T12.4 — recuperação após timeout: pode tentar novamente sem erro | PASS | 148ms | 2026-04-27T00:35:20.173Z |
| onda2-t12-t13.test.ts | T12.5 — avanço manual de status após timeout: integridade mantida | PASS | 148ms | 2026-04-27T00:35:20.321Z |
| novo-fluxo-fase1.test.ts | sessão expirada NÃO deve ser encontrada na query com gt(expiresAt) | PASS | 153ms | 2026-04-27T00:35:20.324Z |
| k1-solaris-questions.test.ts | K-1 — solarisQuestions (Onda 1) | PASS | 1992ms | 2026-04-27T00:35:20.366Z |
| k1-solaris-questions.test.ts | server/k1-solaris-questions.test.ts | PASS | 1993ms | 2026-04-27T00:35:20.366Z |
| onda2-t12-t13.test.ts | T12.6 — invariante: projeto recuperado pode avançar normalmente | PASS | 149ms | 2026-04-27T00:35:20.470Z |
| novo-fluxo-fase1.test.ts | deve atualizar currentStep da sessão | PASS | 208ms | 2026-04-27T00:35:20.532Z |
| sprint-z13.5-engine-tests.test.ts | C4: pipeline completa mesmo com RAG timeout — riscos retornados sem enriquecimento | PASS | 3009ms | 2026-04-27T00:35:20.539Z |
| sprint-z13.5-engine-tests.test.ts | C4 — RAG timeout (resiliencia) | PASS | 3009ms | 2026-04-27T00:35:20.539Z |
| sprint-z13.5-engine-tests.test.ts | C5 — Merge sem duplicatas (infer + consolidate) | PASS | 1ms | 2026-04-27T00:35:20.539Z |
| sprint-z13.5-engine-tests.test.ts | C5: mergeByRiskKey elimina duplicatas entre consolidate e infer | PASS | 1ms | 2026-04-27T00:35:20.539Z |
| sprint-z13.5-engine-tests.test.ts | server/lib/sprint-z13.5-engine-tests.test.ts | PASS | 3018ms | 2026-04-27T00:35:20.539Z |
| onda2-t12-t13.test.ts | T12 — Resiliência a Timeout de IA | PASS | 1322ms | 2026-04-27T00:35:20.540Z |
| audit-rf4-matrizes.test.ts | server/audit-rf4-matrizes.test.ts | PASS | 10ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | RF-4.04 — Adição Manual de Riscos | PASS | 4ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve adicionar um risco manual à área correta | PASS | 2ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve gerar ID único para cada risco manual adicionado | PASS | 1ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve exigir evento e plano_acao para adicionar risco manual | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve marcar risco manual com flag manual=true | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve calcular severidade automaticamente ao adicionar risco manual | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | RF-4.05 — Remoção de Riscos | PASS | 2ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve remover um risco pelo ID | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | não deve remover riscos de outras áreas ao remover de uma área específica | PASS | 1ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve retornar lista vazia se o único risco for removido | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve manter outros riscos da mesma área ao remover um específico | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | RF-4.08 — Aprovação por Área Individual e Reabrir para Edição | PASS | 1ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve aprovar uma área sem afetar as demais | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve reabrir uma área aprovada para edição | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve permitir editar riscos apenas em área não aprovada | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve registrar timestamp de aprovação por área | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | RF-4.09 — Cálculo Automático de Severidade (Probabilidade × Impacto) | PASS | 1ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | Alta × Alto = Crítica (score 9) | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | Alta × Médio = Alta (score 6) | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | Média × Alto = Alta (score 6) | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | Média × Médio = Alta (score 4 ≥ 4) | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | Baixa × Alto = Média (score 3) | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | Baixa × Baixo = Baixa (score 1) | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | Alta × Baixo = Média (score 3) | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | RF-4.10 — Gate 4: Avanço para Etapa 5 somente com todas as áreas aprovadas | PASS | 1ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve bloquear avanço se nenhuma área estiver aprovada | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve bloquear avanço se apenas 3 áreas estiverem aprovadas | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve permitir avanço somente quando todas as 4 áreas estiverem aprovadas | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve bloquear avanço após reabrir uma área previamente aprovada | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | RF-4.11 — Exportação CSV das Matrizes de Riscos | PASS | 1ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve gerar CSV com cabeçalho correto | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve incluir todos os riscos não deletados no CSV | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve excluir riscos marcados como deletados do CSV | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve escapar vírgulas em campos de texto no CSV | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| audit-rf4-matrizes.test.ts | deve gerar CSV vazio (apenas cabeçalho) se não houver riscos | PASS | 0ms | 2026-04-27T00:35:20.552Z |
| routers-requirement-engine.test.ts | todos os requisitos ativos têm id único (code) | PASS | 457ms | 2026-04-27T00:35:20.561Z |
| routers-requirement-engine.test.ts | todos os requisitos ativos têm source_reference não nulo | PASS | 51ms | 2026-04-27T00:35:20.612Z |
| routers-requirement-engine.test.ts | todos os requisitos ativos têm layer definido (não universal genérico) | PASS | 50ms | 2026-04-27T00:35:20.662Z |
| routers-requirement-engine.test.ts | todos os requisitos ativos têm legal_reference ou source_reference | PASS | 50ms | 2026-04-27T00:35:20.713Z |
| analyze-gaps-questionnaires.test.ts | server/lib/analyze-gaps-questionnaires.test.ts | PASS | 8ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | classifyCategoryPessimistic | PASS | 3ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | T-01: todas atendido → atendido | PASS | 1ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | T-02: 1 nao_atendido entre atendidos → nao_atendido (pessimista) | PASS | 0ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | T-03: mix parcial sem nao → parcialmente_atendido | PASS | 0ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | T-04: todas nao_aplicavel → nao_aplicavel | PASS | 0ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | T-05: array vazio → nao_atendido com confidence 0 | PASS | 0ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | Map aggregation | PASS | 1ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | T-06: 2 respostas mesma categoria → array com 2 items, não sobrescreve | PASS | 1ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | calcularLimitePerguntas (spec) | PASS | 1ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | T-07: MEI simples → mínimo 3 | PASS | 0ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | T-08: empresa complexa → máximo 12 | PASS | 0ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | filtrarCategoriasPorPerfil (spec) | PASS | 1ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | T-09: empresa só serviços → imposto_seletivo removido | PASS | 0ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | T-10: sem cartão/marketplace → split_payment removido | PASS | 0ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | Validação LLM (spec) | PASS | 0ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | T-11: risk_category_code inválido → pergunta rejeitada | PASS | 0ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | T-12: used_profile_fields.length < 2 → pergunta rejeitada | PASS | 0ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | analyzeGapsFromQuestionnaires logic | PASS | 1ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | T-13: solaris_answers populado → gaps com compliance_status correto | PASS | 1ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | T-14: iagen_answers populado → gaps com risk_category_code correto | PASS | 0ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | T-15: ambas tabelas vazias → gaps = [] sem crash | PASS | 0ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | Fallback legado | PASS | 0ms | 2026-04-27T00:35:20.739Z |
| analyze-gaps-questionnaires.test.ts | T-16: iagen answer sem risk_category_code → excluída do pipeline novo (fallback legado separado) | PASS | 0ms | 2026-04-27T00:35:20.739Z |
| novo-fluxo-fase1.test.ts | deve salvar ramos confirmados na sessão | PASS | 209ms | 2026-04-27T00:35:20.755Z |
| novo-fluxo-fase1.test.ts | 2. Ciclo de vida da sessão | PASS | 727ms | 2026-04-27T00:35:20.755Z |
| novo-fluxo-fase1.test.ts | 3. Validações de negócio | PASS | 3ms | 2026-04-27T00:35:20.755Z |
| novo-fluxo-fase1.test.ts | token deve ter comprimento mínimo de 64 caracteres | PASS | 1ms | 2026-04-27T00:35:20.755Z |
| novo-fluxo-fase1.test.ts | expiração de 24h deve ser futura | PASS | 0ms | 2026-04-27T00:35:20.755Z |
| novo-fluxo-fase1.test.ts | modo deve ser 'temporario' ou 'historico' | PASS | 1ms | 2026-04-27T00:35:20.755Z |
| novo-fluxo-fase1.test.ts | steps válidos do fluxo devem ser 8 | PASS | 0ms | 2026-04-27T00:35:20.755Z |
| novo-fluxo-fase1.test.ts | descrição mínima de 20 caracteres deve ser validada | PASS | 0ms | 2026-04-27T00:35:20.755Z |
| routers-requirement-engine.test.ts | distribuição por layer é coerente (corporativo, operacional, cnae presentes) | PASS | 51ms | 2026-04-27T00:35:20.764Z |
| sprint-e-g11.test.ts | server/sprint-e-g11.test.ts | PASS | 11ms | 2026-04-27T00:35:20.799Z |
| sprint-e-g11.test.ts | G11 — FundamentacaoSchema | PASS | 4ms | 2026-04-27T00:35:20.799Z |
| sprint-e-g11.test.ts | G11-1: valida objeto completo com todos os campos | PASS | 2ms | 2026-04-27T00:35:20.799Z |
| sprint-e-g11.test.ts | G11-1b: rejeita cobertura inválida | PASS | 1ms | 2026-04-27T00:35:20.799Z |
| sprint-e-g11.test.ts | G11-1c: rejeita confiabilidade > 1 | PASS | 0ms | 2026-04-27T00:35:20.799Z |
| sprint-e-g11.test.ts | G11 — calcularFundamentacao | PASS | 3ms | 2026-04-27T00:35:20.799Z |
| sprint-e-g11.test.ts | G11-2: cobertura=completa com >=3 artigos | PASS | 0ms | 2026-04-27T00:35:20.799Z |
| sprint-e-g11.test.ts | G11-3: cobertura=parcial com 1-2 artigos | PASS | 0ms | 2026-04-27T00:35:20.799Z |
| sprint-e-g11.test.ts | G11-4: cobertura=insuficiente com 0 artigos | PASS | 0ms | 2026-04-27T00:35:20.799Z |
| sprint-e-g11.test.ts | G11-5: dispositivos preenchidos com anchorIds reais | PASS | 1ms | 2026-04-27T00:35:20.799Z |
| sprint-e-g11.test.ts | G11-6: artigos sem anchorId não quebram — dispositivos vazios | PASS | 0ms | 2026-04-27T00:35:20.799Z |
| sprint-e-g11.test.ts | G11-7: fonte_risco válida → confiabilidade=1.0 | PASS | 0ms | 2026-04-27T00:35:20.800Z |
| sprint-e-g11.test.ts | G11-8: fonte 'fonte não identificada' com >=3 artigos → confiabilidade=0.9 | PASS | 0ms | 2026-04-27T00:35:20.800Z |
| sprint-e-g11.test.ts | G11-4b: cobertura insuficiente gera alerta | PASS | 0ms | 2026-04-27T00:35:20.800Z |
| sprint-e-g11.test.ts | G11 — calcularMatrizMetadata | PASS | 1ms | 2026-04-27T00:35:20.800Z |
| sprint-e-g11.test.ts | G11-9: agrega corretamente 3 fundamentacoes mistas | PASS | 0ms | 2026-04-27T00:35:20.800Z |
| sprint-e-g11.test.ts | G11-10: 0 itens → confiabilidade_media=0, sem alerta | PASS | 0ms | 2026-04-27T00:35:20.800Z |
| sprint-e-g11.test.ts | G11-11: itens insuficientes geram alerta_geral | PASS | 0ms | 2026-04-27T00:35:20.800Z |
| sprint-e-g11.test.ts | G11-11b: sem insuficientes → sem alerta_geral | PASS | 0ms | 2026-04-27T00:35:20.800Z |
| sprint-e-g11.test.ts | G11 — MatrizMetadataSchema | PASS | 0ms | 2026-04-27T00:35:20.800Z |
| sprint-e-g11.test.ts | G11-12: valida objeto completo | PASS | 0ms | 2026-04-27T00:35:20.800Z |
| sprint-e-g11.test.ts | G11 — RiskItemSchema retrocompatibilidade | PASS | 2ms | 2026-04-27T00:35:20.800Z |
| sprint-e-g11.test.ts | G11-13: aceita campo fundamentacao opcional | PASS | 1ms | 2026-04-27T00:35:20.800Z |
| sprint-e-g11.test.ts | G11-14: aceita item sem fundamentacao (retrocompatibilidade) | PASS | 0ms | 2026-04-27T00:35:20.800Z |
| sprint-e-g11.test.ts | G11 — RetrievedArticle interface | PASS | 0ms | 2026-04-27T00:35:20.800Z |
| sprint-e-g11.test.ts | G11-15: anchorId está presente na interface RetrievedArticle | PASS | 0ms | 2026-04-27T00:35:20.800Z |
| sprint-e-g11.test.ts | G11-15b: anchorId é opcional — artigo sem anchorId é válido | PASS | 0ms | 2026-04-27T00:35:20.800Z |
| routers-requirement-engine.test.ts | total de requisitos ativos é coerente (≥ 100) | PASS | 51ms | 2026-04-27T00:35:20.815Z |
| routers-requirement-engine.test.ts | T-B2-01: Estrutura obrigatória dos requisitos | PASS | 712ms | 2026-04-27T00:35:20.815Z |
| novo-fluxo-fase1.test.ts | API sessions.create deve retornar token e expiração | PASS | 91ms | 2026-04-27T00:35:20.835Z |
| routers-requirement-engine.test.ts | requisitos com tag 'marketplace' não aparecem sem paymentMethods=marketplace | PASS | 51ms | 2026-04-27T00:35:20.866Z |
| novo-fluxo-fase1.test.ts | API sessions.create deve funcionar para modo 'historico' | PASS | 60ms | 2026-04-27T00:35:20.894Z |
| routers-requirement-engine.test.ts | requisitos universais (sem cnae_scope) aparecem para qualquer perfil | PASS | 50ms | 2026-04-27T00:35:20.916Z |
| novo-fluxo-fase1.test.ts | API sessions.get deve retornar null para token inexistente | PASS | 56ms | 2026-04-27T00:35:20.952Z |
| routers-requirement-engine.test.ts | requisitos corporativos aparecem independente de CNAE | PASS | 51ms | 2026-04-27T00:35:20.972Z |
| routers-requirement-engine.test.ts | requisitos CNAE-específicos têm source_reference válido | PASS | 56ms | 2026-04-27T00:35:21.025Z |
| routers-requirement-engine.test.ts | T-B2-02: Filtragem correta por perfil (varejo, Lucro Presumido, SP) | PASS | 208ms | 2026-04-27T00:35:21.025Z |
| novo-fluxo-fase1.test.ts | API sessions.updateStep deve atualizar o passo | PASS | 120ms | 2026-04-27T00:35:21.066Z |
| novo-fluxo-fase1.test.ts | 4. Integração com API (via fetch direto) | PASS | 327ms | 2026-04-27T00:35:21.066Z |
| novo-fluxo-fase1.test.ts | 5. Rotas do frontend (verificação de arquivos) | PASS | 3ms | 2026-04-27T00:35:21.066Z |
| novo-fluxo-fase1.test.ts | ModoUso.tsx deve existir | PASS | 1ms | 2026-04-27T00:35:21.066Z |
| novo-fluxo-fase1.test.ts | BriefingInteligente.tsx deve existir | PASS | 0ms | 2026-04-27T00:35:21.066Z |
| novo-fluxo-fase1.test.ts | App.tsx deve conter rota /modo-uso | PASS | 0ms | 2026-04-27T00:35:21.066Z |
| novo-fluxo-fase1.test.ts | App.tsx deve conter rota /briefing | PASS | 0ms | 2026-04-27T00:35:21.066Z |
| novo-fluxo-fase1.test.ts | routers-sessions.ts deve exportar sessionsRouter | PASS | 0ms | 2026-04-27T00:35:21.066Z |
| novo-fluxo-fase1.test.ts | Fase 1 — Novo Fluxo v2.0: Sessões e Briefing Inteligente | PASS | 1840ms | 2026-04-27T00:35:21.066Z |
| novo-fluxo-fase1.test.ts | server/novo-fluxo-fase1.test.ts | PASS | 1840ms | 2026-04-27T00:35:21.066Z |
| routers-requirement-engine.test.ts | requisitos com layer=cnae têm source_reference (não são genéricos) | PASS | 51ms | 2026-04-27T00:35:21.076Z |
| routers-requirement-engine.test.ts | sistema registra requisitos por layer (corporativo/operacional/cnae separados) | PASS | 52ms | 2026-04-27T00:35:21.132Z |
| routers-requirement-engine.test.ts | T-B2-03: Regra CNAE condicional | PASS | 102ms | 2026-04-27T00:35:21.132Z |
| routers-requirement-engine.test.ts | payload de cobertura inicial tem estrutura correta {total, corporativo, operacional, cnae} | PASS | 55ms | 2026-04-27T00:35:21.182Z |
| routers-requirement-engine.test.ts | nenhum requisito está sem classificação de layer | PASS | 50ms | 2026-04-27T00:35:21.693Z |
| onda2-t12-t13.test.ts | T13.1 — projeto tem 7 CNAEs confirmados | PASS | 99ms | 2026-04-27T00:35:21.693Z |
| onda2-t12-t13.test.ts | T13.2 — salva respostas para todos os 7 CNAEs em paralelo sem erro | PASS | 369ms | 2026-04-27T00:35:21.693Z |
| routers-requirement-engine.test.ts | nenhum requisito está duplicado no banco | PASS | 49ms | 2026-04-27T00:35:21.694Z |
| routers-requirement-engine.test.ts | T-B2-04: Cobertura inicial pré-questionário | PASS | 154ms | 2026-04-27T00:35:21.694Z |
| routers-requirement-engine.test.ts | T-B2-05: Consistência entre CNAEs múltiplos | PASS | 201ms | 2026-04-27T00:35:21.694Z |
| routers-requirement-engine.test.ts | requisitos corporativos aparecem uma única vez (sem duplicação por CNAE) | PASS | 50ms | 2026-04-27T00:35:21.694Z |
| routers-requirement-engine.test.ts | requisitos operacionais aparecem uma única vez (sem duplicação por CNAE) | PASS | 50ms | 2026-04-27T00:35:21.694Z |
| routers-requirement-engine.test.ts | union de requisitos para múltiplos CNAEs não duplica corporativos/operacionais | PASS | 102ms | 2026-04-27T00:35:21.694Z |
| routers-requirement-engine.test.ts | T-B2-06: Integração com RAG — fonte normativa real | PASS | 203ms | 2026-04-27T00:35:21.694Z |
| routers-requirement-engine.test.ts | todos os requisitos ativos têm source_reference com referência a EC/LC | PASS | 51ms | 2026-04-27T00:35:21.694Z |
| routers-requirement-engine.test.ts | canonical_requirements têm sources com article_id rastreável | PASS | 52ms | 2026-04-27T00:35:21.694Z |
| routers-requirement-engine.test.ts | requirement_question_mapping tem canonical_id rastreável | PASS | 50ms | 2026-04-27T00:35:21.694Z |
| routers-requirement-engine.test.ts | nenhum requisito tem source_reference = 'INVENTADO' ou 'GENERICO' | PASS | 50ms | 2026-04-27T00:35:21.694Z |
| routers-requirement-engine.test.ts | server/integration/routers-requirement-engine.test.ts | PASS | 1583ms | 2026-04-27T00:35:21.694Z |
| onda2-t12-t13.test.ts | T13.3 — todas as 7 respostas foram persistidas individualmente | PASS | 103ms | 2026-04-27T00:35:21.788Z |
| test-e2e-t3-consolidator.test.ts | server/integration/test-e2e-t3-consolidator.test.ts | PASS | 9ms | 2026-04-27T00:35:21.901Z |
| test-e2e-t3-consolidator.test.ts | T3 — Diagnostic Consolidator | PASS | 6ms | 2026-04-27T00:35:21.901Z |
| test-e2e-t3-consolidator.test.ts | 1. consolidateDiagnosticLayers() gera camada CORPORATIVO com dados corretos | PASS | 2ms | 2026-04-27T00:35:21.901Z |
| test-e2e-t3-consolidator.test.ts | 2. consolidateDiagnosticLayers() gera camada OPERACIONAL com dados corretos | PASS | 0ms | 2026-04-27T00:35:21.901Z |
| test-e2e-t3-consolidator.test.ts | 3. consolidateDiagnosticLayers() inclui dados de taxComplexity e financialProfile | PASS | 0ms | 2026-04-27T00:35:21.901Z |
| test-e2e-t3-consolidator.test.ts | 4. consolidateDiagnosticLayers() inclui respostas CNAE como 3ª camada | PASS | 0ms | 2026-04-27T00:35:21.901Z |
| test-e2e-t3-consolidator.test.ts | 5. Payload consolidado é compatível com o formato allAnswers[] do generateBriefing | PASS | 2ms | 2026-04-27T00:35:21.901Z |
| test-e2e-t3-consolidator.test.ts | 6. consolidateDiagnosticLayers() funciona sem dados opcionais (mínimo viável) | PASS | 0ms | 2026-04-27T00:35:21.901Z |
| test-e2e-t3-consolidator.test.ts | T3 — Máquina de Estados do Diagnóstico | PASS | 2ms | 2026-04-27T00:35:21.901Z |
| test-e2e-t3-consolidator.test.ts | 7. isDiagnosticComplete() retorna false quando nenhuma camada está completa | PASS | 0ms | 2026-04-27T00:35:21.901Z |
| test-e2e-t3-consolidator.test.ts | 8. isDiagnosticComplete() retorna false quando apenas 2 camadas estão completas | PASS | 0ms | 2026-04-27T00:35:21.901Z |
| test-e2e-t3-consolidator.test.ts | 9. isDiagnosticComplete() retorna true quando todas as 3 camadas estão completas | PASS | 0ms | 2026-04-27T00:35:21.901Z |
| test-e2e-t3-consolidator.test.ts | 10. getNextDiagnosticLayer() retorna 'corporate' quando nenhuma camada foi iniciada | PASS | 0ms | 2026-04-27T00:35:21.901Z |
| test-e2e-t3-consolidator.test.ts | 11. getNextDiagnosticLayer() retorna 'operational' após corporate completed | PASS | 0ms | 2026-04-27T00:35:21.901Z |
| test-e2e-t3-consolidator.test.ts | 12. getNextDiagnosticLayer() retorna 'cnae' após corporate e operational completed | PASS | 0ms | 2026-04-27T00:35:21.901Z |
| test-e2e-t3-consolidator.test.ts | 13. getNextDiagnosticLayer() retorna null quando todas as camadas estão completas | PASS | 0ms | 2026-04-27T00:35:21.901Z |
| test-e2e-t3-consolidator.test.ts | 14. getDiagnosticProgress() retorna 0 quando nenhuma camada foi iniciada | PASS | 0ms | 2026-04-27T00:35:21.901Z |
| test-e2e-t3-consolidator.test.ts | 15. getDiagnosticProgress() retorna ~33 quando corporate está in_progress | PASS | 0ms | 2026-04-27T00:35:21.901Z |
| test-e2e-t3-consolidator.test.ts | 16. getDiagnosticProgress() retorna 100 quando todas as camadas estão completas | PASS | 0ms | 2026-04-27T00:35:21.901Z |
| sprint-v66-e2e.test.ts | server/integration/sprint-v66-e2e.test.ts | FAIL | 118ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-CORPUS: Integridade do Corpus Expandido | FAIL | 114ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-C01: corpus deve ter 63 artigos | FAIL | 11ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-C02: todos os artigos devem ter campos obrigatórios preenchidos | FAIL | 88ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-C03: deve ter 12 resoluções do CG-IBS | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-C04: deve ter artigos de instruções normativas da RFB/CBS | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-C05: deve ter artigos de convênios ICMS do CONFAZ | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-C06: deve manter os artigos originais (ec132, lc214, lc227, lc116, lc87) | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-C07: todos os cnaeGroups devem ser strings não vazias | PASS | 12ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-C08: artigos CG-IBS devem cobrir split payment | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-C09: artigos RFB/CBS devem cobrir alíquota 8,8% | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-C10: artigos Conv. ICMS devem cobrir Zona Franca de Manaus | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-BUSCA: Busca por Termos dos Novos Documentos | FAIL | 1ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-SETORIAL: Cobertura Setorial dos Novos Artigos | PASS | 2ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-S01: CG-IBS deve cobrir setor financeiro (CNAE 64) | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-S02: RFB/CBS deve cobrir setor financeiro | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-S03: Conv. ICMS deve cobrir setor de energia (CNAE 35) | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-S04: Conv. ICMS deve cobrir setor de telecomunicações (CNAE 61) | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-S05: Conv. ICMS deve cobrir setor automotivo (CNAE 29) | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-S06: CG-IBS deve cobrir cooperativas com regime específico | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-S07: RFB/CBS deve cobrir importação com CBS-Importação | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-S08: Conv. ICMS deve cobrir agronegócio com insumos isentos | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-S09: CG-IBS deve ter artigo sobre cashback para baixa renda | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-S10: Conv. ICMS deve cobrir e-commerce e marketplace | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-PRAZOS: Datas e Prazos Críticos nos Novos Artigos | PASS | 1ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-P01: CG-IBS deve mencionar prazo de 60 dias para ressarcimento | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-P02: RFB/CBS deve mencionar prazo de habilitação até 31/12/2028 | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-P03: Conv. ICMS deve mencionar extinção total em 2033 | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-P04: CG-IBS deve mencionar split payment via PIX a partir de 01/01/2027 | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-P05: RFB/CBS deve mencionar extinção do PIS/COFINS em 2027 | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-P06: Conv. ICMS deve mencionar vedação de novos benefícios a partir de 01/01/2025 | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| sprint-v66-e2e.test.ts | V66-P07: CG-IBS deve mencionar prazo de 30 dias para impugnação | PASS | 0ms | 2026-04-27T00:35:22.153Z |
| onda2-t12-t13.test.ts | T13.4 — diagnosticStatus.cnae permanece 'pending' com apenas 1 CNAE respondido | PASS | 590ms | 2026-04-27T00:35:22.379Z |
| rag-usage-log.test.ts | server/integration/rag-usage-log.test.ts | FAIL | 32ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | L-RAG-01 Bloco 1 — Schema rag_usage_log | FAIL | 14ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | tabela ragUsageLog deve estar definida no schema | FAIL | 3ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | tabela ragUsageLog deve ter os campos obrigatórios | FAIL | 1ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | migration 0060 deve existir com CREATE TABLE rag_usage_log | FAIL | 9ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | L-RAG-01 Bloco 2 — logUsage async non-blocking | FAIL | 5ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | logUsage não deve lançar exceção quando db não está disponível | FAIL | 2ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | retrieveArticlesFast deve retornar RAGContext com estrutura correta | FAIL | 1ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | retrieveArticles deve retornar RAGContext com estrutura correta | FAIL | 1ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | RAGUsageOptions deve aceitar todos os campos opcionais | FAIL | 1ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | L-RAG-01 Bloco 3 — Endpoints tRPC ragAdmin | FAIL | 5ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | ragAdmin router deve exportar getChunkUsageStats | FAIL | 2ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | arquivo ragAdmin.ts deve conter os 4 endpoints de telemetria | FAIL | 1ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | getChunkUsageStats deve conter SQL com COUNT DISTINCT anchor_id | FAIL | 1ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | getUnusedChunks deve conter LEFT JOIN com WHERE anchor_id IS NULL | FAIL | 0ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | getTopChunks deve conter GROUP BY anchor_id ORDER BY usos DESC | FAIL | 0ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | getUsageByLei deve conter GROUP BY lei | FAIL | 0ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | L-RAG-01 Bloco 4 — Gold Set (10 queries de validação) | FAIL | 6ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | gold set deve ter exatamente 10 queries | PASS | 0ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | cada query do gold set deve ter id, query e lei definidos | PASS | 4ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | retrieveArticlesFast deve processar cada query do gold set sem lançar exceção | FAIL | 1ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | resultado de cada query do gold set deve ter contextText não vazio | FAIL | 1ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | L-RAG-01 Bloco 5 — Governança e documentação | FAIL | 2ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | CORPUS-BASELINE.md deve mencionar L-RAG-01 como implementado | FAIL | 0ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | RAG-QUALITY-GATE.md deve mencionar os 4 endpoints de telemetria | FAIL | 0ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | rag-retriever.ts deve usar void para logUsage (non-blocking) | FAIL | 0ms | 2026-04-27T00:35:22.412Z |
| rag-usage-log.test.ts | rag-retriever.ts deve ter try/catch no logUsage (falha silenciosa) | FAIL | 0ms | 2026-04-27T00:35:22.412Z |
| g17b-solaris-pipeline.test.ts | server/gates/g17b-solaris-pipeline.test.ts | PASS | 12ms | 2026-04-27T00:35:22.423Z |
| g17b-solaris-pipeline.test.ts | G17-B — Teste 1: gap SOLARIS com gap_classification=NULL gera risco | PASS | 6ms | 2026-04-27T00:35:22.423Z |
| g17b-solaris-pipeline.test.ts | deve gerar risco para gap SOLARIS com gap_classification NULL usando criticality como fallback | PASS | 5ms | 2026-04-27T00:35:22.423Z |
| g17b-solaris-pipeline.test.ts | deve mapear criticality='critica' para severity='critico' no score | PASS | 0ms | 2026-04-27T00:35:22.423Z |
| g17b-solaris-pipeline.test.ts | G17-B — Teste 2: idempotência de deriveRisksFromGaps + persistRisks | PASS | 3ms | 2026-04-27T00:35:22.423Z |
| g17b-solaris-pipeline.test.ts | chamadas múltiplas de deriveRisksFromGaps+persistRisks não criam riscos duplicados | PASS | 3ms | 2026-04-27T00:35:22.423Z |
| g17b-solaris-pipeline.test.ts | gap_id único garante que SELECT+UPDATE/INSERT não duplica riscos SOLARIS | PASS | 0ms | 2026-04-27T00:35:22.423Z |
| g17b-solaris-pipeline.test.ts | G17-B — Teste 3: erro no riskEngine não bloqueia transição de status | PASS | 2ms | 2026-04-27T00:35:22.423Z |
| g17b-solaris-pipeline.test.ts | erro em deriveRisksFromGaps não deve impedir transição de status para onda2 | PASS | 1ms | 2026-04-27T00:35:22.423Z |
| g17b-solaris-pipeline.test.ts | bloco G17-B com gaps.length=0 não chama persistRisks (sem riscos para persistir) | PASS | 1ms | 2026-04-27T00:35:22.423Z |
| consistencyEngine.test.ts | server/consistencyEngine.test.ts | PASS | 77ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | ConsistencyEngine — Regras Determinísticas | PASS | 75ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | perfil completo e válido → sem findings | PASS | 2ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | CNPJ ausente → finding critical cnpj_invalido | PASS | 0ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | CNPJ com menos de 14 dígitos → finding critical | PASS | 0ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | razão social ausente → finding critical razao_social_ausente | PASS | 0ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | CNAE ausente → finding high cnae_ausente | PASS | 0ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | regime tributário ausente → finding high | PASS | 0ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | Simples Nacional com faturamento > 4.8M → finding critical | PASS | 70ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | Simples Nacional com faturamento <= 4.8M → sem finding de limite | PASS | 0ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | data de constituição futura → finding medium | PASS | 1ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | ConsistencyEngine — Classificação de Status | PASS | 1ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | sem findings → status clean | PASS | 0ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | apenas findings low/medium → status has_issues | PASS | 0ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | finding critical → status critical | PASS | 0ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | mix de severidades com critical → status critical | PASS | 0ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | ConsistencyEngine — Gate Obrigatório | PASS | 1ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | status clean → canProceed=true, reason=no_issues | PASS | 0ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | status critical sem aceite de risco → canProceed=false | PASS | 0ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | status critical com aceite de risco → canProceed=true | PASS | 0ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | status has_issues sem críticos → canProceed=true | PASS | 0ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | ConsistencyEngine — Cenários de Borda | PASS | 1ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | perfil completamente vazio → múltiplos findings críticos | PASS | 0ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | CNPJ com formatação (pontos e traços) → válido se 14 dígitos | PASS | 0ms | 2026-04-27T00:35:22.676Z |
| consistencyEngine.test.ts | Lucro Real com faturamento alto → sem finding de limite | PASS | 0ms | 2026-04-27T00:35:22.676Z |
| calculate-briefing-confidence.test.ts | server/lib/calculate-briefing-confidence.test.ts | PASS | 11ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | calculate-briefing-confidence — v2 ponderada | PASS | 10ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | pesos canônicos (fonte única da verdade) | PASS | 3ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | pesos 8/10/10/10/5/2 | PASS | 2ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | Q3 composto: 30% cadastro + 70% respostas | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | denominador total por tipo — produto=35, servico=35, mista=45 | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | cenários canônicos | PASS | 1ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | tudo zero + mista → 0% | PASS | 1ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | tudo 100% + mista → 100% | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | modelo composto Q3 — regra crítica 30/70 | PASS | 2ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | Q3 Produtos com 0 cadastrados → completude = 0 | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | Q3 Produtos com 3 cadastrados e 0 NCM → ratio cadastro = 0, total = 0 | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | Q3 Produtos: 3/3 com NCM + 0 respostas → 0,3·1 + 0,7·0 = 30% do pilar | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | Q3 Produtos: 3/3 NCM + 5/10 respostas → 0,3·1 + 0,7·0,5 = 0,65 → 65% | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | Q3 Produtos: todos cadastrados com NCM + respostas completas → 100% | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | Q3 Produtos: 2 cadastrados mas só 1 com NCM + respostas 0/10 → 0,3·0,5 + 0 = 15% | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | Q2 IA Gen binário (limitação do schema atual) | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | q2Respostas = 0 → completude 0 | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | q2Respostas >= 1 → completude 1 (binário) | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | q2 sempre aplicável (entra no denominador) | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | caso real UAT 2026-04-21 (1.pdf — Distribuidora Alimentos Teste) | PASS | 1ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | perfil 100%, só Q1 respondido (10/10), 0 produtos — tipo mista → 29% | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | mesmo cenário + tipo produto → 37% | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | perfil 60% + Q1 1/10 (mista) → 5% | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | aplicabilidade por tipo de empresa | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | tipo produto — Q3 Serviços fora do denominador | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | default sem tipoEmpresa = 'mista' | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | breakdown — transparência ao cliente | PASS | 2ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | retorna 6 pilares na ordem canônica | PASS | 1ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | rótulos PT-BR em cada pilar | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | Q3 carrega detalhe estruturado (ratioCadastro + ratioRespostas) | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | edge cases | PASS | 1ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | valores negativos tratados como 0 | PASS | 0ms | 2026-04-27T00:35:22.880Z |
| calculate-briefing-confidence.test.ts | respostas > total → clampado em 100% | PASS | 0ms | 2026-04-27T00:35:22.881Z |
| calculate-briefing-confidence.test.ts | perfilCompletude > 1 clampado em 1 | PASS | 0ms | 2026-04-27T00:35:22.881Z |
| calculate-briefing-confidence.test.ts | determinístico — mesmo input → mesmo output | PASS | 0ms | 2026-04-27T00:35:22.881Z |
| novo-fluxo-fase4.test.ts | Fase 4 - Schema: sessionConsolidations | PASS | 5ms | 2026-04-27T00:35:22.891Z |
| novo-fluxo-fase4.test.ts | tabela sessionConsolidations existe no schema | PASS | 1ms | 2026-04-27T00:35:22.891Z |
| novo-fluxo-fase4.test.ts | tabela tem campo sessionToken | PASS | 1ms | 2026-04-27T00:35:22.891Z |
| novo-fluxo-fase4.test.ts | tabela tem campo complianceScore | PASS | 0ms | 2026-04-27T00:35:22.891Z |
| novo-fluxo-fase4.test.ts | tabela tem campo overallRiskLevel | PASS | 0ms | 2026-04-27T00:35:22.891Z |
| novo-fluxo-fase4.test.ts | tabela tem campo executiveSummary | PASS | 0ms | 2026-04-27T00:35:22.891Z |
| novo-fluxo-fase4.test.ts | tabela tem campo keyFindings | PASS | 0ms | 2026-04-27T00:35:22.891Z |
| novo-fluxo-fase4.test.ts | tabela tem campo topRecommendations | PASS | 0ms | 2026-04-27T00:35:22.891Z |
| novo-fluxo-fase4.test.ts | tabela tem campo timeline | PASS | 0ms | 2026-04-27T00:35:22.891Z |
| novo-fluxo-fase4.test.ts | tabela tem campo branchSummaries | PASS | 0ms | 2026-04-27T00:35:22.891Z |
| novo-fluxo-fase4.test.ts | tabela tem campo status | PASS | 0ms | 2026-04-27T00:35:22.891Z |
| novo-fluxo-fase4.test.ts | tabela tem campo convertedToProjectId | PASS | 0ms | 2026-04-27T00:35:22.891Z |
| novo-fluxo-fase4.test.ts | Fase 4 - Router: sessionConsolidation registrado | PASS | 1ms | 2026-04-27T00:35:22.891Z |
| novo-fluxo-fase4.test.ts | appRouter tem sessionConsolidation | PASS | 0ms | 2026-04-27T00:35:22.891Z |
| novo-fluxo-fase4.test.ts | procedure generate existe | PASS | 0ms | 2026-04-27T00:35:22.891Z |
| novo-fluxo-fase4.test.ts | procedure get existe | PASS | 0ms | 2026-04-27T00:35:22.891Z |
| novo-fluxo-fase4.test.ts | procedure saveToHistory existe | PASS | 0ms | 2026-04-27T00:35:22.891Z |
| novo-fluxo-fase4.test.ts | procedure exportData existe | PASS | 0ms | 2026-04-27T00:35:22.891Z |
| novo-fluxo-fase4.test.ts | banco de dados está disponível | PASS | 0ms | 2026-04-27T00:35:22.891Z |
| riskEngine.test.ts | server/riskEngine.test.ts | PASS | 9ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | calculateBaseScore | PASS | 3ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | obrigacao + alta = 80 | PASS | 1ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | vedacao + alta = 80 | PASS | 0ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | direito + alta = 50 | PASS | 0ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | opcao + alta = 30 | PASS | 0ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | obrigacao + critica = 100 (capped at 100) | PASS | 0ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | obrigacao + media = 60 | PASS | 0ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | obrigacao + baixa = 40 | PASS | 0ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | opcao + baixa = 15 | PASS | 0ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | calculateRiskScore | PASS | 1ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | nao_compliant: multiplier 1.0 → risk_score = base_score | PASS | 0ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | parcial: multiplier 0.5 → risk_score = base_score / 2 | PASS | 0ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | compliant: multiplier 0 → risk_score = 0 | PASS | 0ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | nao_aplicavel: multiplier 0 → risk_score = 0 | PASS | 0ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | base 50 + parcial = 25 | PASS | 0ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | classifyRiskLevel | PASS | 1ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | score 70+ → critico | PASS | 0ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | score 50-69 → alto | PASS | 0ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | score 25-49 → medio | PASS | 0ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | score 0-24 → baixo | PASS | 0ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | classifyRisk | PASS | 1ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | obrigacao + nao_compliant + alta → critico (80×1.0=80) | PASS | 0ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | obrigacao + parcial + alta → alto (80×0.5=40) | PASS | 0ms | 2026-04-27T00:35:23.064Z |
| riskEngine.test.ts | obrigacao + compliant → risk_score = 0 | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | nao_aplicavel → risk_score = 0 | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | vedacao + nao_compliant + critica → risk_score = 100 (capped) | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | direito + nao_compliant + alta → alto (50×1.0=50) | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | opcao + nao_compliant + baixa → baixo (15×1.0=15) | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | inferNormativeType | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | texto com 'vedação' → vedacao | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | texto com 'direito' → direito | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | texto com 'opção' → opcao | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | texto genérico → obrigacao (default) | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | calculateRiskSummary — testes de borda | PASS | 2ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | 100% nao_aplicavel → sem riscos ativos, avgScore=0 | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | 100% compliant → sem riscos ativos, score=0 | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | 100% nao_compliant obrigacao alta → todos críticos | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | mistura: 2 critico + 1 medio + 2 compliant → overallRiskLevel correto | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | topRisks retorna máximo 5 itens ordenados por score desc | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | determineMitigationPriority | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | critico → imediata | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | alto + obrigacao → curto_prazo | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | medio → medio_prazo | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| riskEngine.test.ts | baixo → monitoramento | PASS | 0ms | 2026-04-27T00:35:23.065Z |
| projectAccess.test.ts | should allow equipe_solaris to access any project | PASS | 509ms | 2026-04-27T00:35:23.173Z |
| projectAccess.test.ts | validateProjectAccess - Equipe SOLARIS | PASS | 509ms | 2026-04-27T00:35:23.173Z |
| onda2-t12-t13.test.ts | T13.5 — respostas de CNAEs diferentes não se sobrepõem (isolamento por cnaeCode) | PASS | 857ms | 2026-04-27T00:35:23.236Z |
| rf-hist-task-history.test.ts | server/rf-hist-task-history.test.ts | PASS | 9ms | 2026-04-27T00:35:23.249Z |
| rf-hist-task-history.test.ts | RF-HIST: formatHistoryValue | PASS | 4ms | 2026-04-27T00:35:23.249Z |
| rf-hist-task-history.test.ts | retorna — para valor null | PASS | 1ms | 2026-04-27T00:35:23.249Z |
| rf-hist-task-history.test.ts | traduz status nao_iniciado | PASS | 0ms | 2026-04-27T00:35:23.249Z |
| rf-hist-task-history.test.ts | traduz status em_andamento | PASS | 0ms | 2026-04-27T00:35:23.249Z |
| rf-hist-task-history.test.ts | traduz status concluido | PASS | 0ms | 2026-04-27T00:35:23.249Z |
| rf-hist-task-history.test.ts | formata progresso com % | PASS | 0ms | 2026-04-27T00:35:23.249Z |
| rf-hist-task-history.test.ts | retorna valor bruto para campo desconhecido | PASS | 0ms | 2026-04-27T00:35:23.250Z |
| rf-hist-task-history.test.ts | formata notificações com toggles ativos | PASS | 0ms | 2026-04-27T00:35:23.250Z |
| rf-hist-task-history.test.ts | formata notificações desativadas | PASS | 0ms | 2026-04-27T00:35:23.250Z |
| rf-hist-task-history.test.ts | retorna valor bruto se JSON inválido em notificações | PASS | 0ms | 2026-04-27T00:35:23.250Z |
| rf-hist-task-history.test.ts | RF-HIST: computeHistoryEntries | PASS | 3ms | 2026-04-27T00:35:23.250Z |
| rf-hist-task-history.test.ts | gera entrada de histórico para mudança de status | PASS | 1ms | 2026-04-27T00:35:23.250Z |
| rf-hist-task-history.test.ts | não gera entrada quando valor não muda | PASS | 0ms | 2026-04-27T00:35:23.250Z |
| rf-hist-task-history.test.ts | gera entrada para mudança de progresso | PASS | 0ms | 2026-04-27T00:35:23.250Z |
| rf-hist-task-history.test.ts | gera entrada para atribuição de responsável | PASS | 0ms | 2026-04-27T00:35:23.250Z |
| rf-hist-task-history.test.ts | gera múltiplas entradas para múltiplas mudanças | PASS | 1ms | 2026-04-27T00:35:23.250Z |
| rf-hist-task-history.test.ts | gera entrada para mudança de notificações | PASS | 0ms | 2026-04-27T00:35:23.250Z |
| rf-hist-task-history.test.ts | gera entrada para mudança de prazo | PASS | 0ms | 2026-04-27T00:35:23.250Z |
| rf-hist-task-history.test.ts | gera entrada para mudança de título | PASS | 0ms | 2026-04-27T00:35:23.250Z |
| rf-hist-task-history.test.ts | RF-HIST: schema e integridade dos dados | PASS | 1ms | 2026-04-27T00:35:23.250Z |
| rf-hist-task-history.test.ts | entrada de histórico tem todos os campos obrigatórios | PASS | 0ms | 2026-04-27T00:35:23.250Z |
| rf-hist-task-history.test.ts | permite oldValue e newValue nulos (criação de tarefa) | PASS | 0ms | 2026-04-27T00:35:23.250Z |
| rf-hist-task-history.test.ts | filtra entradas por taskId corretamente | PASS | 0ms | 2026-04-27T00:35:23.250Z |
| rf-hist-task-history.test.ts | ordena entradas por createdAt decrescente (mais recente primeiro) | PASS | 0ms | 2026-04-27T00:35:23.250Z |
| novo-fluxo-fase2.test.ts | 1. Tabela sessionBranchAnswers existe no banco | PASS | 54ms | 2026-04-27T00:35:23.268Z |
| novo-fluxo-fase4.test.ts | pode inserir consolidação de teste | PASS | 393ms | 2026-04-27T00:35:23.280Z |
| novo-fluxo-fase2.test.ts | 2. Inserir registro em sessionBranchAnswers | PASS | 53ms | 2026-04-27T00:35:23.321Z |
| novo-fluxo-fase2.test.ts | 3. Buscar perguntas geradas por sessionToken + branchCode | PASS | 51ms | 2026-04-27T00:35:23.372Z |
| novo-fluxo-fase4.test.ts | pode atualizar status da consolidação | PASS | 103ms | 2026-04-27T00:35:23.384Z |
| projectAccess.test.ts | should allow advogado_senior to access any project | PASS | 211ms | 2026-04-27T00:35:23.384Z |
| projectAccess.test.ts | validateProjectAccess - Advogado Sênior | PASS | 212ms | 2026-04-27T00:35:23.384Z |
| novo-fluxo-fase4.test.ts | pode buscar consolidação por sessionToken | PASS | 49ms | 2026-04-27T00:35:23.432Z |
| onda2-t12-t13.test.ts | T13.6 — atualização concorrente de respostas do mesmo CNAE — ambas completam sem erro | PASS | 205ms | 2026-04-27T00:35:23.441Z |
| connection-manifest.test.ts | server/integration/connection-manifest.test.ts | PASS | 17ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | Connection Manifest — Gate FC | PASS | 17ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | Procedures registradas no router | PASS | 5ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | procedure 'confirmCnaes' existe em routers-fluxo-v3.ts | PASS | 1ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | procedure 'getOnda1Questions' existe em routers-fluxo-v3.ts | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | procedure 'completeOnda1' existe em routers-fluxo-v3.ts | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | procedure 'generateOnda2Questions' existe em routers-fluxo-v3.ts | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | procedure 'completeOnda2' existe em routers-fluxo-v3.ts | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | procedure 'getProductQuestions' existe em routers-fluxo-v3.ts [TO-BE] | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | procedure 'completeProductQuestionnaire' existe em routers-fluxo-v3.ts [TO-BE] | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | procedure 'getServiceQuestions' existe em routers-fluxo-v3.ts [TO-BE] | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | procedure 'completeServiceQuestionnaire' existe em routers-fluxo-v3.ts [TO-BE] | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | procedure 'generateBriefing' existe em routers-fluxo-v3.ts | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | procedure 'approveBriefing' existe em routers-fluxo-v3.ts | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | procedure 'generateRiskMatrices' existe em routers-fluxo-v3.ts | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | procedure 'generateActionPlan' existe em routers-fluxo-v3.ts | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | procedure 'approveActionPlan' existe em routers-fluxo-v3.ts | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | Componentes consumidores existem no frontend | PASS | 2ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | 'confirmCnaes' tem consumidor: NovoProjeto.tsx | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | 'getOnda1Questions' tem consumidor: QuestionarioSolaris.tsx | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | 'completeOnda1' tem consumidor: QuestionarioSolaris.tsx | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | 'generateOnda2Questions' tem consumidor: QuestionarioIaGen.tsx | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | 'completeOnda2' tem consumidor: QuestionarioIaGen.tsx | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | 'getProductQuestions' tem consumidor: QuestionarioProduto.tsx [TO-BE — FAIL esperado] | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | 'completeProductQuestionnaire' tem consumidor: QuestionarioProduto.tsx [TO-BE — FAIL esperado] | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | 'getServiceQuestions' tem consumidor: QuestionarioServico.tsx [TO-BE — FAIL esperado] | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | 'completeServiceQuestionnaire' tem consumidor: QuestionarioServico.tsx [TO-BE — FAIL esperado] | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | 'generateBriefing' tem consumidor: BriefingV3.tsx | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | 'approveBriefing' tem consumidor: BriefingV3.tsx | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | 'generateRiskMatrices' tem consumidor: MatrizesV3.tsx | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | 'generateActionPlan' tem consumidor: PlanoAcaoV3.tsx | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | 'approveActionPlan' tem consumidor: PlanoAcaoV3.tsx | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | Componentes realmente chamam as procedures | PASS | 6ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | NovoProjeto.tsx referencia 'confirmCnaes' | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | QuestionarioSolaris.tsx referencia 'getOnda1Questions' | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | QuestionarioSolaris.tsx referencia 'completeOnda1' | PASS | 1ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | QuestionarioIaGen.tsx referencia 'generateOnda2Questions' | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | QuestionarioIaGen.tsx referencia 'completeOnda2' | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | QuestionarioProduto.tsx referencia 'getProductQuestions' [TO-BE — FAIL esperado] | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | QuestionarioProduto.tsx referencia 'completeProductQuestionnaire' [TO-BE — FAIL esperado] | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | QuestionarioServico.tsx referencia 'getServiceQuestions' [TO-BE — FAIL esperado] | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | QuestionarioServico.tsx referencia 'completeServiceQuestionnaire' [TO-BE — FAIL esperado] | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | BriefingV3.tsx referencia 'generateBriefing' | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | BriefingV3.tsx referencia 'approveBriefing' | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | MatrizesV3.tsx referencia 'generateRiskMatrices' | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | PlanoAcaoV3.tsx referencia 'generateActionPlan' | PASS | 1ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | PlanoAcaoV3.tsx referencia 'approveActionPlan' | PASS | 1ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | Rotas declaradas em App.tsx | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | rota '/projetos/:id/questionario-solaris' presente em App.tsx | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | rota '/projetos/:id/questionario-iagen' presente em App.tsx | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | rota '/projetos/:id/questionario-produto' presente em App.tsx [TO-BE — FAIL esperado] | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | rota '/projetos/:id/questionario-servico' presente em App.tsx [TO-BE — FAIL esperado] | PASS | 0ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | Manifesto está atualizado com o router | PASS | 3ms | 2026-04-27T00:35:23.445Z |
| connection-manifest.test.ts | todas as procedures críticas do router devem estar no manifesto | PASS | 3ms | 2026-04-27T00:35:23.445Z |
| novo-fluxo-fase2.test.ts | 4. Salvar respostas de um ramo | PASS | 105ms | 2026-04-27T00:35:23.477Z |
| novo-fluxo-fase4.test.ts | pode deletar consolidação de teste | PASS | 103ms | 2026-04-27T00:35:23.531Z |
| novo-fluxo-fase4.test.ts | Fase 4 - Banco: operações CRUD em sessionConsolidations | PASS | 651ms | 2026-04-27T00:35:23.531Z |
| novo-fluxo-fase4.test.ts | Fase 4 - Frontend: rota /consolidacao registrada | PASS | 3ms | 2026-04-27T00:35:23.531Z |
| novo-fluxo-fase4.test.ts | App.tsx contém rota /consolidacao | PASS | 1ms | 2026-04-27T00:35:23.531Z |
| novo-fluxo-fase4.test.ts | Consolidacao.tsx existe | PASS | 0ms | 2026-04-27T00:35:23.531Z |
| novo-fluxo-fase4.test.ts | Consolidacao.tsx contém exposição ao risco de compliance | PASS | 0ms | 2026-04-27T00:35:23.531Z |
| novo-fluxo-fase4.test.ts | Consolidacao.tsx contém exportação CSV | PASS | 0ms | 2026-04-27T00:35:23.531Z |
| novo-fluxo-fase4.test.ts | Consolidacao.tsx contém exportação JSON | PASS | 0ms | 2026-04-27T00:35:23.531Z |
| novo-fluxo-fase4.test.ts | Consolidacao.tsx contém modal de salvar no histórico | PASS | 0ms | 2026-04-27T00:35:23.531Z |
| novo-fluxo-fase4.test.ts | Fase 4 - Fluxo: validação do fluxo completo v2.0 | PASS | 1ms | 2026-04-27T00:35:23.531Z |
| novo-fluxo-fase4.test.ts | fluxo completo: 4 fases implementadas | PASS | 0ms | 2026-04-27T00:35:23.531Z |
| novo-fluxo-fase4.test.ts | fluxo completo: 4 routers de sessão implementados | PASS | 0ms | 2026-04-27T00:35:23.531Z |
| novo-fluxo-fase4.test.ts | fluxo completo: 5 tabelas de sessão no banco | PASS | 0ms | 2026-04-27T00:35:23.531Z |
| novo-fluxo-fase4.test.ts | fluxo completo: todas as rotas registradas no App.tsx | PASS | 0ms | 2026-04-27T00:35:23.531Z |
| novo-fluxo-fase4.test.ts | server/novo-fluxo-fase4.test.ts | PASS | 661ms | 2026-04-27T00:35:23.531Z |
| novo-fluxo-fase2.test.ts | 5. Marcar ramo como concluído com análise de risco | PASS | 105ms | 2026-04-27T00:35:23.582Z |
| novo-fluxo-fase2.test.ts | 6. Verificar progresso: 1 de 1 ramo concluído = 100% | PASS | 105ms | 2026-04-27T00:35:23.684Z |
| novo-fluxo-fase2.test.ts | Fase 2 — Banco de Dados | PASS | 475ms | 2026-04-27T00:35:23.684Z |
| novo-fluxo-fase2.test.ts | Fase 2 — Estrutura de Arquivos | PASS | 3ms | 2026-04-27T00:35:23.684Z |
| novo-fluxo-fase2.test.ts | 7. Arquivo routers-session-questionnaire.ts existe | PASS | 0ms | 2026-04-27T00:35:23.684Z |
| novo-fluxo-fase2.test.ts | 8. Arquivo QuestionarioRamos.tsx existe | PASS | 0ms | 2026-04-27T00:35:23.684Z |
| novo-fluxo-fase2.test.ts | 9. Rota /questionario-ramos registrada no App.tsx | PASS | 0ms | 2026-04-27T00:35:23.684Z |
| novo-fluxo-fase2.test.ts | 10. Router sessionQuestionnaire registrado no appRouter | PASS | 1ms | 2026-04-27T00:35:23.684Z |
| novo-fluxo-fase2.test.ts | 11. Schema contém tabela sessionBranchAnswers | PASS | 1ms | 2026-04-27T00:35:23.684Z |
| novo-fluxo-fase2.test.ts | 12. QuestionarioRamos.tsx contém tipos de pergunta corretos | PASS | 0ms | 2026-04-27T00:35:23.684Z |
| novo-fluxo-fase2.test.ts | 13. routers-session-questionnaire.ts contém as 5 procedures | PASS | 0ms | 2026-04-27T00:35:23.684Z |
| novo-fluxo-fase2.test.ts | Fase 2 — Lógica de Negócio | PASS | 2ms | 2026-04-27T00:35:23.684Z |
| novo-fluxo-fase2.test.ts | 14. Níveis de risco válidos: baixo, medio, alto, critico | PASS | 1ms | 2026-04-27T00:35:23.684Z |
| novo-fluxo-fase2.test.ts | 15. Status válidos: pendente, em_andamento, concluido | PASS | 0ms | 2026-04-27T00:35:23.684Z |
| novo-fluxo-fase2.test.ts | 16. Cálculo de progresso: 2 de 4 ramos = 50% | PASS | 0ms | 2026-04-27T00:35:23.684Z |
| novo-fluxo-fase2.test.ts | 17. Cálculo de progresso: 0 de 3 ramos = 0% | PASS | 0ms | 2026-04-27T00:35:23.684Z |
| novo-fluxo-fase2.test.ts | 18. Perguntas obrigatórias devem ser validadas antes de concluir ramo | PASS | 0ms | 2026-04-27T00:35:23.684Z |
| novo-fluxo-fase2.test.ts | 19. Respostas de múltipla escolha são arrays | PASS | 0ms | 2026-04-27T00:35:23.684Z |
| novo-fluxo-fase2.test.ts | 20. Resposta de escala está entre 1 e 5 | PASS | 0ms | 2026-04-27T00:35:23.684Z |
| novo-fluxo-fase2.test.ts | server/novo-fluxo-fase2.test.ts | PASS | 829ms | 2026-04-27T00:35:23.684Z |
| projectAccess.test.ts | should DENY access to cliente not in project | PASS | 314ms | 2026-04-27T00:35:23.699Z |
| onda2-t12-t13.test.ts | T13.7 — performance: 7 CNAEs × 5 questões = 35 respostas em paralelo sem degradação | PASS | 367ms | 2026-04-27T00:35:23.808Z |
| projectAccess.test.ts | should ALLOW access to cliente IN project | PASS | 160ms | 2026-04-27T00:35:23.858Z |
| projectAccess.test.ts | validateProjectAccess - Cliente | PASS | 474ms | 2026-04-27T00:35:23.858Z |
| test-e2e-v212.test.ts | Evidência 3 — Validação de CNPJ inválido bloqueada | PASS | 5ms | 2026-04-27T00:35:23.932Z |
| test-e2e-v212.test.ts | rejeita CNPJ vazio | PASS | 5ms | 2026-04-27T00:35:23.932Z |
| test-e2e-v212.test.ts | Evidência 4 — Payload rejeitado pelo backend (Zod) | PASS | 5ms | 2026-04-27T00:35:23.932Z |
| test-e2e-v212.test.ts | rejeita payload sem companyType | PASS | 1ms | 2026-04-27T00:35:23.932Z |
| test-e2e-v212.test.ts | rejeita payload sem taxRegime | PASS | 1ms | 2026-04-27T00:35:23.932Z |
| test-e2e-v212.test.ts | rejeita payload sem operationType | PASS | 1ms | 2026-04-27T00:35:23.932Z |
| test-e2e-v212.test.ts | rejeita payload com clientType vazio | PASS | 1ms | 2026-04-27T00:35:23.932Z |
| test-e2e-v212.test.ts | rejeita payload sem multiState | PASS | 1ms | 2026-04-27T00:35:23.932Z |
| test-e2e-v212.test.ts | rejeita payload sem companyProfile inteiro | PASS | 0ms | 2026-04-27T00:35:23.932Z |
| test-e2e-v212.test.ts | aceita payload completo e válido | PASS | 0ms | 2026-04-27T00:35:23.932Z |
| onda2-t12-t13.test.ts | T13 — 7 CNAEs Simultâneos (máximo permitido) | PASS | 3508ms | 2026-04-27T00:35:24.040Z |
| onda2-t12-t13.test.ts | server/integration/onda2-t12-t13.test.ts | PASS | 4830ms | 2026-04-27T00:35:24.040Z |
| projectAccess.test.ts | should throw NOT_FOUND for non-existent project | PASS | 211ms | 2026-04-27T00:35:24.069Z |
| audit-painel-filtros.test.ts | server/audit-painel-filtros.test.ts | PASS | 12ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | matchesFilter | PASS | 6ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | all — retorna todos os projetos | PASS | 2ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | em_andamento — retorna apenas projetos em etapas ativas | PASS | 1ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | em_avaliacao — retorna apenas projetos com status em_avaliacao | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | aprovado — retorna projetos com status aprovado ou concluido | PASS | 1ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | rascunho — retorna projetos com status rascunho ou draft | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | não retorna projetos de outra categoria no filtro em_andamento | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | não retorna projetos em_andamento no filtro aprovado | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | filterCount | PASS | 1ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | all — conta todos os 9 projetos | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | em_andamento — conta 4 projetos | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | em_avaliacao — conta 1 projeto | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | aprovado — conta 2 projetos | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | rascunho — conta 2 projetos | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | soma de todas as categorias exclusivas é igual ao total | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | filterBySearch | PASS | 2ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | busca vazia retorna todos os projetos | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | busca case-insensitive por nome parcial | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | busca por prefixo 'Projeto' retorna todos | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | busca sem correspondência retorna lista vazia | PASS | 1ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | busca por substring do meio do nome | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | filtro + busca combinados | PASS | 1ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | filtro em_andamento + busca 'Alpha' retorna 1 projeto | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | filtro em_andamento + busca 'Gamma' retorna 0 (Gamma não é em_andamento) | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | filtro aprovado + busca 'Delta' retorna 1 projeto | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | filtro all + busca 'Projeto' retorna todos os 9 | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | estado vazio | PASS | 1ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | lista vazia com filtro all retorna 0 | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | lista vazia com busca retorna 0 | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | projeto com status desconhecido não aparece em nenhuma categoria exclusiva | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | chips de filtro — configuração | PASS | 1ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | existem 5 chips de filtro | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | todos os chips têm key e label definidos | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | o primeiro chip é 'all' | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| audit-painel-filtros.test.ts | cada key é única | PASS | 0ms | 2026-04-27T00:35:24.238Z |
| test-e2e-v212.test.ts | grava projeto completo no banco com todos os campos JSON | PASS | 352ms | 2026-04-27T00:35:24.278Z |
| briefing-markdown-v2.test.ts | server/briefing-markdown-v2.test.ts | PASS | 14ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | buildBriefingMarkdown V2 — bundle #808-#811 | PASS | 13ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | #809 — linguagem condicional + banner de confiança | PASS | 6ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | renderiza banner topo quando conf<85% | PASS | 3ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | NÃO renderiza banner quando conf>=85% | PASS | 1ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | usa 'Nível de Exposição' (não 'Risco Geral') | PASS | 0ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | adiciona aviso de validação per-gap quando conf<85% | PASS | 1ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | NÃO adiciona aviso per-gap quando conf>=85% | PASS | 0ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | #810 — Top 3 + Qualidade + Badge (fix UAT 2026-04-21 multi-sinal) | PASS | 4ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | conf<40 E qualidade baixa → MAPA | PASS | 0ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | conf 40..84 → DIAGNOSTICO PARCIAL | PASS | 0ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | conf=85 MAS sem produtos → PARCIAL (cenário UAT real) | PASS | 1ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | AND completo (conf>=85 + qualidade>=80 + cadastro + questionários 4/5+) → COMPLETO | PASS | 1ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | NÃO exibe mais 'Qualidade das Informações' no header (fix UAT 2026-04-21) | PASS | 0ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | renderiza Top 3 Ações quando gaps>=3 E top_3_acoes preenchido | PASS | 1ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | NÃO renderiza Top 3 quando gaps<3 | PASS | 0ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | NÃO renderiza Top 3 quando top_3_acoes vazio (mesmo com gaps>=3) | PASS | 0ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | #811 — source_type + source_reference por gap | PASS | 2ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | renderiza linha Fonte quando source_type presente | PASS | 0ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | omite linha Fonte quando source_type ausente (graceful — briefings legados) | PASS | 0ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | renderiza Fonte sem suffix quando source_reference ausente | PASS | 0ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | todos os source_type conhecidos renderizam com label canônico | PASS | 1ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | rollback — feature flag template v1 | PASS | 1ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | BRIEFING_TEMPLATE_VERSION=v1 → ignora toda infra do bundle | PASS | 1ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | determinismo | PASS | 0ms | 2026-04-27T00:35:24.279Z |
| briefing-markdown-v2.test.ts | mesma entrada → mesma saída | PASS | 0ms | 2026-04-27T00:35:24.279Z |
| projectAccess.test.ts | should throw NOT_FOUND for briefing of non-existent project | PASS | 215ms | 2026-04-27T00:35:24.284Z |
| test-e2e-v212.test.ts | getProjectById retorna companyProfile com todos os 7 campos obrigatórios | PASS | 58ms | 2026-04-27T00:35:24.331Z |
| test-e2e-v212.test.ts | Evidência 5 e 6 — Banco grava e reload mantém os dados | PASS | 410ms | 2026-04-27T00:35:24.331Z |
| test-e2e-v212.test.ts | v2.1.2 — Perfil da Empresa Obrigatório (E2E) | FAIL | 424ms | 2026-04-27T00:35:24.331Z |
| test-e2e-v212.test.ts | server/integration/test-e2e-v212.test.ts | FAIL | 425ms | 2026-04-27T00:35:24.331Z |
| m3-fase1-completeness.test.ts | server/integration/m3-fase1-completeness.test.ts | PASS | 8ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | inferCompanyType | PASS | 4ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | 1. operationType='produto' → 'produto' | PASS | 1ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | 2. operationType='servico' → 'servico' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | 3. operationType='misto' → 'misto' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | 4. operationProfile null + CNAE 4632 → 'produto' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | 5. operationProfile null + CNAE 8599 → 'servico' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | suporte defensivo: operationType='product' (inglês) → 'produto' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | suporte defensivo: operationType='service' (inglês) → 'servico' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | suporte defensivo: operationType='mixed' (inglês) → 'misto' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | operationType='industria' → 'produto' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | fallback conservador: operationProfile null + sem CNAEs → 'misto' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | evaluateSourceStatus | PASS | 2ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | 6. SOLARIS: 0 respostas → 'nao_iniciado' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | 7. SOLARIS: 12 respostas → 'suficiente' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | 8. SOLARIS: 24 respostas → 'completo' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | 9. NCM: companyType='servico' → 'nao_aplicavel' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | 10. NCM: companyType='produto', 1 código → 'completo' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | SOLARIS: 1 resposta → 'iniciado' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | IAGEN: 0 respostas → 'nao_iniciado' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | IAGEN: 3 respostas → 'completo' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | CORPORATE: diagnosticStatus null → 'nao_iniciado' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | CORPORATE: completed → 'completo' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | NBS: companyType='produto' → 'nao_aplicavel' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | computeCompleteness | PASS | 2ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | 11. zero respostas em todas as fontes → 'insuficiente' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | 12. SOLARIS suficiente, resto nao_iniciado → 'parcial' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | 13. todas fontes suficientes, NCM nao_aplicavel (serviço) → 'completo' | PASS | 1ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | 14. todas fontes suficientes, NCM aplicável mas 0 códigos → 'parcial' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | 15. todas fontes suficientes, NCM e NBS preenchidos (misto) → 'completo' | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | partiality_reasons | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | 16. empresa de produto sem NCM → reasons inclui texto sobre NCM | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| m3-fase1-completeness.test.ts | 17. SOLARIS não iniciado → reasons inclui texto sobre SOLARIS | PASS | 0ms | 2026-04-27T00:35:24.439Z |
| briefing-quality.test.ts | server/lib/briefing-quality.test.ts | PASS | 8ms | 2026-04-27T00:35:24.484Z |
| briefing-quality.test.ts | calculateBriefingQuality | PASS | 6ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | cenário canônico — empresa com produtos e serviços | PASS | 3ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | projeto vazio (0/5 questionários, sem produtos/serviços, sem descrição) → 0% | PASS | 1ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | projeto completo (5/5, 100% classificação, descrição rica) → 100% | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | projeto meio caminho (3/5, 50% classificação, descrição ok) → ~65% | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | redistribuição (sem produtos nem serviços cadastrados) | PASS | 1ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | pesos redistribuídos: questionário 60% + descrição 40% | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | só descrição rica (sem questionários, sem produtos) → 40% | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | edge cases | PASS | 2ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | questionariosRespondidos > total → clampado em 100% | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | descrição null → component 0 | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | projeto real do UAT 2026-04-21 (0/5, sem produtos, descrição 24 palavras) → 20% | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | determinístico — mesmo input → mesmo output | PASS | 1ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | classifyMaturityBadge — assinatura legada (só confidence) | PASS | 1ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | conf<40 E qualidade sem informação → MAPA_REGULATORIO | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | 40..84 → DIAGNOSTICO_PARCIAL | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | >=85 SOZINHO não garante COMPLETO — exige AND com qualidade/cadastro/questionários | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | null/undefined/NaN → MAPA_REGULATORIO (conservador) | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | labels canônicos | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | classifyMaturityBadge — assinatura multi-sinal (fix UAT 2026-04-21) | PASS | 1ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | AND completo → DIAGNOSTICO_COMPLETO | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | cenário UAT 2026-04-21 (conf=85, qual=76, 0 produtos, 3/5 quest) → PARCIAL (não COMPLETO) | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | conf=90 mas sem cadastro → PARCIAL (falha no AND) | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | conf=90 mas qualidade=70 → PARCIAL | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | conf=90 mas questionários 3/5 (60%) → PARCIAL (ratio<0.8) | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | conf=30 E qualidade=20 → MAPA (ambos fracos) | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | conf=30 mas qualidade=50 → PARCIAL (qualidade salva) | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | serviços ao invés de produtos também conta como cadastro | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| briefing-quality.test.ts | 4/5 questionários (ratio 0.8) atinge o limite para COMPLETO | PASS | 0ms | 2026-04-27T00:35:24.485Z |
| projectAccess.test.ts | should throw NOT_FOUND for action plan of non-existent project | PASS | 208ms | 2026-04-27T00:35:24.493Z |
| projectAccess.test.ts | validateProjectAccess - Projeto Inexistente | PASS | 634ms | 2026-04-27T00:35:24.493Z |
| novo-fluxo-navegacao.test.ts | server/novo-fluxo-navegacao.test.ts | PASS | 14ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | FluxoStepper Component | PASS | 3ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve existir o componente FluxoStepper | PASS | 1ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve exportar FluxoStepper como named export | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve definir todos os 6 passos do fluxo v2.0 | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve aceitar prop 'current' para indicar passo ativo | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve aceitar prop 'className' para customização | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | useFluxoSession Hook | PASS | 2ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve existir o hook useFluxoSession | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve exportar useFluxoSession como default ou named export | PASS | 1ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve centralizar acesso ao sessionToken via sessionStorage | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve expor função para salvar sessionToken | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve expor ramos confirmados | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | ModoUso.tsx — Navegação | PASS | 1ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve importar FluxoStepper | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve navegar para /briefing ao escolher modo | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve criar sessão antes de navegar | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | BriefingInteligente.tsx — Navegação | PASS | 1ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve importar FluxoStepper | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve navegar para /questionario-ramos após confirmar ramos | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve usar sessions.suggestBranches para sugestão de IA | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | QuestionarioRamos.tsx — Navegação | PASS | 1ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve importar FluxoStepper | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve usar FluxoStepper com current='questionario' | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve navegar para /plano-acao-session ao concluir todos os ramos | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve passar sessionToken como query param na navegação | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | PlanoAcaoSession.tsx — Navegação | PASS | 1ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve importar FluxoStepper | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve usar FluxoStepper com current='plano-acao' | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve ter botão para navegar para /matriz-riscos-session | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve ter botão para navegar para /consolidacao | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | MatrizRiscosSession.tsx — Navegação | PASS | 3ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve importar FluxoStepper | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve usar FluxoStepper com current='matriz-riscos' | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve ter botão voltar para /plano-acao-session | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve ter botão avançar para /consolidacao | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | Consolidacao.tsx — Navegação | PASS | 1ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve importar FluxoStepper | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve usar FluxoStepper com current='consolidacao' | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve ter opção de salvar no histórico | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve ter opção de exportar dados | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | App.tsx — Rotas do Fluxo v2.0 | PASS | 1ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve ter rota /modo-uso registrada | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve ter rota /briefing registrada | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve ter rota /questionario-ramos registrada | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve ter rota /plano-acao-session registrada | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve ter rota /matriz-riscos-session registrada | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| novo-fluxo-navegacao.test.ts | deve ter rota /consolidacao registrada | PASS | 0ms | 2026-04-27T00:35:24.636Z |
| questionnaire-completeness.test.ts | server/integration/questionnaire-completeness.test.ts | PASS | 12ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | CC-01: computeState — skippedAll=true retorna 'pulado' | PASS | 2ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | retorna pulado quando skippedAll=true independente de answeredCount | PASS | 1ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | CC-02: computeState — 0 respostas sem skippedAll retorna 'pulado' | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | retorna pulado quando answeredCount=0 e totalCount>0 | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | CC-03: computeState — totalCount=0 retorna 'completo' (não aplicável) | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | questionário não aplicável não penaliza | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | CC-04: computeState — ≥ 80% retorna 'completo' | PASS | 1ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | SOLARIS: 20/24 = 83% → completo | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | IA Gen: 6/7 = 86% → completo | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | exatamente 80%: 8/10 → completo | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | 100%: 24/24 → completo | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | CC-05: computeState — 30–79% retorna 'parcial' | PASS | 1ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | 50%: 12/24 → parcial | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | exatamente 30%: 3/10 → parcial | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | 79%: 19/24 → parcial (abaixo de 80%) | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | CC-06: computeState — < 30% retorna 'incompleto' | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | 21%: 5/24 → incompleto | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | 1/24 → incompleto | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | 29%: 2/7 → incompleto (abaixo de 30%) | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | CC-07: computeState — thresholds são exatos (sem arredondamento) | PASS | 1ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | THRESHOLD_COMPLETO = 0.8 | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | THRESHOLD_PARCIAL = 0.3 | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | 79.9%: 799/1000 → parcial (não completo) | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | 29.9%: 299/1000 → incompleto (não parcial) | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | CC-08: computeConfidenceLevel — todos completo → alta | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | retorna 'alta' quando todos os estados são 'completo' | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | CC-09: computeConfidenceLevel — algum parcial, sem incompleto → media | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | retorna 'media' quando há parcial mas não incompleto | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | retorna 'media' quando há parcial e pulado mas não incompleto | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | CC-10: computeConfidenceLevel — algum incompleto → baixa | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | retorna 'baixa' quando há incompleto | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | retorna 'baixa' mesmo com parcial + incompleto | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | CC-11: computeConfidenceLevel — todos pulado → nenhuma | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | retorna 'nenhuma' quando todos os estados são 'pulado' | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | retorna 'nenhuma' quando array vazio | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | CC-12: computeConfidenceLevel — DIV-Z02-003: sem valores em inglês | PASS | 1ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | estados são em português (não 'complete', 'partial', 'incomplete', 'skipped') | PASS | 1ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | CC-13: computeDiagnosticConfidence — score e level corretos | PASS | 1ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | todos completo: score=1.0, level=alta, warnings=[] | PASS | 1ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | CC-14: computeDiagnosticConfidence — warnings gerados para não-completo | PASS | 1ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | gera warning para questionário parcial | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | gera warning para questionário pulado | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | CC-15: computeDiagnosticConfidence — score médio ponderado | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | completo(1.0) + pulado(0.0) = score 0.5 | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | parcial(0.6) + incompleto(0.2) = score 0.4 | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | CC-16: buildQuestionnaireCompleteness — completionRatio correto | PASS | 2ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | 20/24 = 0.833... | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | totalCount=0 → completionRatio=1.0 (não aplicável) | PASS | 2ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | CC-17: buildQuestionnaireCompleteness — skippedIds preservados | PASS | 1ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | preserva array de IDs pulados | PASS | 1ms | 2026-04-27T00:35:24.688Z |
| questionnaire-completeness.test.ts | stateToLabel e confidenceLevelToLabel retornam strings em português | PASS | 0ms | 2026-04-27T00:35:24.688Z |
| projectAccess.test.ts | should allow equipe_solaris to save assessment phase 1 | PASS | 312ms | 2026-04-27T00:35:24.804Z |
| audit-rf207-rf508.test.ts | server/audit-rf207-rf508.test.ts | PASS | 7ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | RF-2.07: Confirmação ao retornar a CNAE já concluído | PASS | 4ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | não deve mostrar diálogo quando o CNAE anterior não foi concluído | PASS | 1ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | deve mostrar diálogo quando o CNAE anterior já foi concluído | PASS | 0ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | não deve mostrar diálogo quando está no primeiro CNAE (idx=0) | PASS | 0ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | deve navegar sem diálogo quando CNAE anterior não foi concluído | PASS | 0ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | deve mostrar diálogo e NÃO navegar quando CNAE anterior foi concluído e não confirmado | PASS | 0ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | deve navegar quando CNAE anterior foi concluído E usuário confirmou | PASS | 0ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | não deve navegar quando idx=0 (não há CNAE anterior) | PASS | 0ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | deve funcionar com múltiplos CNAEs — terceiro retornando ao segundo concluído | PASS | 0ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | deve preservar o progresso do CNAE atual ao retornar ao anterior | PASS | 1ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | RF-5.08: Painel de configuração de notificações por tarefa | PASS | 2ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | deve ter configurações padrão corretas (7 dias, tudo desabilitado) | PASS | 0ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | deve ativar notificação de mudança de status | PASS | 0ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | deve ativar notificação de novo comentário | PASS | 0ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | deve ativar notificação de atualização de progresso | PASS | 0ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | deve configurar o número de dias antes do prazo | PASS | 0ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | deve validar que beforeDays está entre 1 e 30 | PASS | 0ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | deve detectar que a tarefa tem notificações ativas | PASS | 0ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | deve manter as demais configurações ao atualizar uma notificação | PASS | 0ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | deve permitir ativar todas as notificações simultaneamente | PASS | 0ms | 2026-04-27T00:35:24.814Z |
| audit-rf207-rf508.test.ts | deve preservar o id e título da tarefa ao atualizar notificações | PASS | 0ms | 2026-04-27T00:35:24.814Z |
| onda2-t14-retrocesso.test.ts | T14.1 — avança projeto até 'riscos' (etapa 4) | PASS | 494ms | 2026-04-27T00:35:24.857Z |
| briefing-context-injection.test.ts | server/integration/briefing-context-injection.test.ts | PASS | 7ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | BCI-01: Fonte A — p.cnaeAnswers é lido e injetado como <qcnae_especializado> | PASS | 2ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve ler p.cnaeAnswers (com parse JSON se string) | PASS | 1ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve injetar o bloco <qcnae_especializado> no additionalContext | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | BCI-02: Fonte B — solarisAnswers são buscados e injetados como <respostas_solaris> | PASS | 1ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve chamar db.getOnda1Answers(input.projectId) | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve injetar o bloco <respostas_solaris> no additionalContext | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | BCI-03: Fonte C — iagenAnswers são buscados e injetados como <respostas_iagen> | PASS | 1ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve chamar db.getOnda2Answers(input.projectId) | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve injetar o bloco <respostas_iagen> no additionalContext | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | BCI-04: systemPrompt contém regra QCNAE ESPECIALIZADO (ADR-0018) | PASS | 1ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve conter instrução QCNAE ESPECIALIZADO no systemPrompt | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve instruir: IS confirmado → citar Art. 2 LC 214/2025 | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve instruir: alíquota zero confirmada → citar Art. 14 LC 214/2025 | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve referenciar a tag <qcnae_especializado> na instrução | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | BCI-05: additionalContextText é injetado no userPrompt enviado ao LLM | PASS | 1ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve incluir additionalContextText no conteúdo do userPrompt | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve ter o prefixo DADOS ADICIONAIS DO CLIENTE | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | BCI-06: ADR-0018 existe e documenta corretamente a decisão | PASS | 1ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve existir o arquivo ADR-0018 | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve ter status Aceito | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve documentar as 3 fontes: cnaeAnswers, solaris_answers, iagen_answers | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve referenciar BUG-BRIEFING-01 | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve mencionar IS e alíquota zero como casos de uso | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | BCI-07: Prompt assembly — cnaeAnswers com IS e alíquota zero gera contexto correto | PASS | 1ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve conter a tag <qcnae_especializado> | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve conter 'Imposto Seletivo' no contexto montado | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve conter 'alíquota zero' no contexto montado | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve conter 'sim' como resposta para IS | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve conter 'sim' como resposta para alíquota zero | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| briefing-context-injection.test.ts | deve conter o prefixo DADOS ADICIONAIS DO CLIENTE | PASS | 0ms | 2026-04-27T00:35:24.870Z |
| m2-componente-d-update-operation-profile.test.ts | M2-D-01: persiste principaisProdutos corretamente | PASS | 4ms | 2026-04-27T00:35:24.920Z |
| m2-componente-d-update-operation-profile.test.ts | M2-D-02: não sobrescreve campo ausente no input (undefined) | PASS | 1ms | 2026-04-27T00:35:24.920Z |
| m2-componente-d-update-operation-profile.test.ts | M2-D-03: aceita array vazio [] sobrescrevendo existente | PASS | 0ms | 2026-04-27T00:35:24.920Z |
| m2-componente-d-update-operation-profile.test.ts | M2-D-04: dispara engine apenas quando há change material | PASS | 14ms | 2026-04-27T00:35:24.932Z |
| m2-componente-d-update-operation-profile.test.ts | M2-D-05: NÃO dispara engine sem change material | PASS | 12ms | 2026-04-27T00:35:24.936Z |
| m2-componente-d-update-operation-profile.test.ts | M2-D-06: trata operationProfile null sem erro | PASS | 1ms | 2026-04-27T00:35:24.936Z |
| m2-componente-d-update-operation-profile.test.ts | M2-D-07: trata operationProfile string JSON sem erro | PASS | 0ms | 2026-04-27T00:35:24.936Z |
| m2-componente-d-update-operation-profile.test.ts | M2 Componente D — updateOperationProfile | PASS | 34ms | 2026-04-27T00:35:24.936Z |
| m2-componente-d-update-operation-profile.test.ts | server/m2-componente-d-update-operation-profile.test.ts | PASS | 35ms | 2026-04-27T00:35:24.936Z |
| onda2-t14-retrocesso.test.ts | T14.2 — 1º retrocesso: riscos → briefing preserva riskMatricesData | PASS | 196ms | 2026-04-27T00:35:25.053Z |
| tracer-version.test.ts | deve retornar um objeto com requestId, step e finish | PASS | 4ms | 2026-04-27T00:35:25.067Z |
| tracer-version.test.ts | requestId deve ter 8 caracteres alfanuméricos maiúsculos | PASS | 1ms | 2026-04-27T00:35:25.067Z |
| tracer-version.test.ts | dois traces simultâneos devem ter requestIds diferentes | PASS | 1ms | 2026-04-27T00:35:25.067Z |
| tracer-version.test.ts | finish deve retornar TraceResult com campos obrigatórios | PASS | 1ms | 2026-04-27T00:35:25.067Z |
| tracer-version.test.ts | error deve retornar TraceResult com status 'error' e campo error | PASS | 1ms | 2026-04-27T00:35:25.067Z |
| tracer-version.test.ts | error deve emitir via console.error (sempre visível) | PASS | 1ms | 2026-04-27T00:35:25.067Z |
| projectAccess.test.ts | should DENY cliente not in project to save assessment phase 1 | PASS | 309ms | 2026-04-27T00:35:25.113Z |
| projectAccess.test.ts | validateProjectAccess - Assessment Phase 1 | PASS | 621ms | 2026-04-27T00:35:25.113Z |
| skip-questionnaire.test.ts | server/integration/skip-questionnaire.test.ts | PASS | 8ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-18: skipQuestionnaire → solarisSkippedAll=true | PASS | 2ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-18.1: pular SOLARIS seta solarisSkippedAll=true | PASS | 1ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-18.2: pular IA Gen seta iagenSkippedAll=true | PASS | 0ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-18.3: pular SOLARIS NÃO seta iagenSkippedAll | PASS | 0ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-18.4: pular IA Gen NÃO seta solarisSkippedAll | PASS | 0ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-19: skip de pergunta individual é reversível (idempotente) | PASS | 2ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-19.1: adicionar mesma pergunta duas vezes não duplica | PASS | 1ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-19.2: remover pergunta do array (reversibilidade) | PASS | 0ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-19.3: solarisSkippedAll pode ser revertido para false | PASS | 0ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-19.4: skipIagenQuestion é idempotente | PASS | 0ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-20: skipQuestionnaire avança status via assertValidTransition | PASS | 1ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-20.1: pular SOLARIS de cnaes_confirmados → onda1_solaris | PASS | 0ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-20.2: pular IA Gen de onda1_solaris → onda2_iagen | PASS | 0ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-20.3: transição inválida lança erro (ex: rascunho → onda2_iagen) | PASS | 1ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-20.4: transição inválida inclui status atual e destino na mensagem | PASS | 0ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-21: confidenceWarning gerado quando questionário pulado | PASS | 1ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-21.1: pular SOLARIS gera aviso com 'SOLARIS (Onda 1)' | PASS | 0ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-21.2: pular IA Gen gera aviso com 'IA Gen (Onda 2)' | PASS | 0ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-21.3: aviso menciona revisão manual antes da aprovação | PASS | 0ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-21.4: confidenceWarning é string não-vazia | PASS | 0ms | 2026-04-27T00:35:25.117Z |
| skip-questionnaire.test.ts | CC-21.5: DIV-Z02-ADR16-001 — ConfidenceLevel 'nenhuma' é mais preciso que 'muito_baixa' | PASS | 1ms | 2026-04-27T00:35:25.117Z |
| onda2-t14-retrocesso.test.ts | T14.3 — 2º retrocesso: briefing → diagnostico_cnae preserva briefingContent | PASS | 147ms | 2026-04-27T00:35:25.200Z |
| tracer-version.test.ts | step deve registrar etapas com t (ms desde início) | PASS | 10ms | 2026-04-27T00:35:25.267Z |
| tracer-version.test.ts | finish com status 'fallback' deve ser aceito | PASS | 1ms | 2026-04-27T00:35:25.267Z |
| tracer-version.test.ts | finish com status 'timeout' deve ser aceito | PASS | 1ms | 2026-04-27T00:35:25.267Z |
| tracer-version.test.ts | context deve ser preservado no resultado final | PASS | 1ms | 2026-04-27T00:35:25.267Z |
| tracer-version.test.ts | deve emitir log de início via console.log | PASS | 1ms | 2026-04-27T00:35:25.267Z |
| tracer-version.test.ts | createTrace — Tracing estruturado | PASS | 22ms | 2026-04-27T00:35:25.267Z |
| tracer-version.test.ts | getBuildVersionInfo — Versão do build | PASS | 165ms | 2026-04-27T00:35:25.267Z |
| tracer-version.test.ts | deve retornar objeto com todos os campos obrigatórios | PASS | 57ms | 2026-04-27T00:35:25.267Z |
| tracer-version.test.ts | version deve ser '5.5.0' | PASS | 13ms | 2026-04-27T00:35:25.267Z |
| tracer-version.test.ts | gitHash deve ser uma string não-vazia | PASS | 13ms | 2026-04-27T00:35:25.267Z |
| tracer-version.test.ts | serverTime deve ser um ISO timestamp válido | PASS | 14ms | 2026-04-27T00:35:25.267Z |
| tracer-version.test.ts | env deve ser 'development' em ambiente de teste | PASS | 13ms | 2026-04-27T00:35:25.267Z |
| tracer-version.test.ts | uptimeSeconds deve ser um número não-negativo | PASS | 14ms | 2026-04-27T00:35:25.267Z |
| tracer-version.test.ts | nodeVersion deve começar com 'v' | PASS | 14ms | 2026-04-27T00:35:25.267Z |
| tracer-version.test.ts | howToVerify deve conter instrução de comparação de hash | PASS | 13ms | 2026-04-27T00:35:25.267Z |
| tracer-version.test.ts | gitHash em dev deve ter 7 chars (short hash do git) | PASS | 14ms | 2026-04-27T00:35:25.267Z |
| tracer-version.test.ts | deve retornar JSON com campo version via curl local | PASS | 71ms | 2026-04-27T00:35:25.307Z |
| tracer-version.test.ts | GET /api/version — Endpoint de versão | PASS | 71ms | 2026-04-27T00:35:25.307Z |
| tracer-version.test.ts | server/tracer-version.test.ts | PASS | 259ms | 2026-04-27T00:35:25.307Z |
| sprint-v57-step-comments.test.ts | deve ter os campos obrigatórios definidos no schema | PASS | 186ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | deve aceitar apenas os valores válidos para o campo step | PASS | 1ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | deve aceitar apenas os valores válidos para userRole | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | StepComments — Schema da Tabela | PASS | 188ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | StepComments — Validação de Input | PASS | 130ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | deve rejeitar content vazio ao adicionar comentário | PASS | 127ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | deve rejeitar content com mais de 2000 caracteres | PASS | 1ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | deve aceitar content válido (1-2000 chars) | PASS | 1ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | deve rejeitar step inválido | PASS | 1ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | deve aceitar todos os steps válidos | PASS | 1ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | StepComments — Controle de Permissões | PASS | 1ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | autor pode editar seu próprio comentário | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | equipe_solaris pode editar qualquer comentário | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | outro usuário não pode editar comentário alheio | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | advogado_senior não pode editar comentário de outro usuário | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | advogado_junior não pode editar comentário de outro usuário | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | cliente só pode ver comentários do seu próprio projeto | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | equipe_solaris pode ver comentários de qualquer projeto | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | advogado_senior pode ver comentários de qualquer projeto | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | StepComments — Formatação de Tempo Relativo | PASS | 1ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | deve retornar 'agora mesmo' para datas recentes (< 60s) | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | deve retornar minutos para datas entre 1-59 minutos atrás | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | deve retornar horas para datas entre 1-23 horas atrás | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | deve retornar dias para datas entre 1-6 dias atrás | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | StepComments — Geração de Iniciais | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | deve gerar iniciais de nome completo | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | deve gerar iniciais de nome único | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | deve usar apenas as 2 primeiras palavras | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | deve retornar em maiúsculas | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | StepComments — Integração com Páginas | PASS | 1ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | BriefingV3 deve usar step='briefing' | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | MatrizesV3 deve usar step='matrizes' | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | PlanoAcaoV3 deve usar step='plano_acao' | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | cada step deve ter um título descritivo único | PASS | 0ms | 2026-04-27T00:35:25.319Z |
| sprint-v57-step-comments.test.ts | server/sprint-v57-step-comments.test.ts | PASS | 322ms | 2026-04-27T00:35:25.319Z |
| onda2-t14-retrocesso.test.ts | T14.4 — 3º retrocesso: diagnostico_cnae → cnaes_confirmados | PASS | 147ms | 2026-04-27T00:35:25.347Z |
| onda2-t14-retrocesso.test.ts | T14.5 — após 3 retrocessos: dados originais (briefing, riscos) ainda preservados | PASS | 48ms | 2026-04-27T00:35:25.395Z |
| routers-fluxo-v3.test.ts | server/integration/routers-fluxo-v3.test.ts | FAIL | 13ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | fluxoV3Router — Etapa 1: Criação do Projeto | FAIL | 10ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | createProject | FAIL | 7ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | deve criar projeto com campos válidos e retornar projectId | FAIL | 5ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | deve rejeitar descrição com menos de 50 caracteres | FAIL | 0ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | deve rejeitar nome vazio | FAIL | 0ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | extractCnaes | FAIL | 1ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | deve extrair CNAEs via IA e retornar lista estruturada | FAIL | 0ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | deve retornar erro NOT_FOUND se projeto não existir | FAIL | 0ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | confirmCnaes | FAIL | 1ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | deve confirmar CNAEs e avançar para step 2 | FAIL | 0ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | deve rejeitar lista vazia de CNAEs | FAIL | 0ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | deve validar estrutura mínima de cada CNAE | FAIL | 0ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | createClientOnTheFly | FAIL | 1ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | deve criar cliente com razão social e retornar userId e companyName | FAIL | 0ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | deve rejeitar razão social vazia | FAIL | 0ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | deve aceitar criação sem campos opcionais (cnpj, email, phone) | FAIL | 1ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | fluxoV3Router — Validações de Schema | PASS | 2ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | deve validar que confidence está entre 0 e 100 | PASS | 1ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | deve validar que code de CNAE não é vazio | PASS | 0ms | 2026-04-27T00:35:25.554Z |
| routers-fluxo-v3.test.ts | deve validar que projectId é número positivo | PASS | 0ms | 2026-04-27T00:35:25.554Z |
| projectAccess.test.ts | should DENY cliente not in project to generate questions | PASS | 458ms | 2026-04-27T00:35:25.565Z |
| projectAccess.test.ts | validateProjectAccess - Assessment Phase 2 | PASS | 458ms | 2026-04-27T00:35:25.565Z |
| projectAccess.test.ts | Project Access Validation | PASS | 2908ms | 2026-04-27T00:35:25.565Z |
| projectAccess.test.ts | server/projectAccess.test.ts | PASS | 2908ms | 2026-04-27T00:35:25.565Z |
| onda2-t14-retrocesso.test.ts | T14.6 — pode avançar novamente após 3 retrocessos (ciclo completo) | PASS | 256ms | 2026-04-27T00:35:25.652Z |
| risk-eligibility.test.ts | server/lib/risk-eligibility.test.ts | PASS | 10ms | 2026-04-27T00:35:25.740Z |
| risk-eligibility.test.ts | isCategoryAllowed — imposto_seletivo eligible | PASS | 3ms | 2026-04-27T00:35:25.740Z |
| risk-eligibility.test.ts | industria permite imposto_seletivo sem reason | PASS | 1ms | 2026-04-27T00:35:25.740Z |
| risk-eligibility.test.ts | comercio permite imposto_seletivo sem reason | PASS | 0ms | 2026-04-27T00:35:25.740Z |
| risk-eligibility.test.ts | misto permite imposto_seletivo sem reason | PASS | 0ms | 2026-04-27T00:35:25.740Z |
| risk-eligibility.test.ts | isCategoryAllowed — imposto_seletivo blocked | PASS | 1ms | 2026-04-27T00:35:25.740Z |
| risk-eligibility.test.ts | servicos bloqueia com downgrade para enquadramento_geral (cenário transportadora) | PASS | 0ms | 2026-04-27T00:35:25.740Z |
| risk-eligibility.test.ts | financeiro bloqueia com downgrade para enquadramento_geral | PASS | 0ms | 2026-04-27T00:35:25.740Z |
| risk-eligibility.test.ts | agronegocio bloqueia com downgrade (ADR-0030 v1.1 D-6 — agro não-elegível) | PASS | 1ms | 2026-04-27T00:35:25.740Z |
| risk-eligibility.test.ts | isCategoryAllowed — fallbacks | PASS | 1ms | 2026-04-27T00:35:25.740Z |
| risk-eligibility.test.ts | operationType null → permite com reason operation_type_ausente | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | operationType undefined → permite com reason operation_type_ausente | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | operationType string vazia → permite com reason operation_type_ausente | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | operationType desconhecido (fora canônicos) → permite com warning | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | isCategoryAllowed — outras categorias (não-restritas) | PASS | 1ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | ibs_cbs sempre permitida independente de operationType | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | cadastro_fiscal sempre permitida para qualquer operationType | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | enquadramento_geral sempre permitida (categoria fallback) | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | isCategoryAllowed — resultado estrutural | PASS | 2ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | resultado sempre preserva suggested idêntico ao input | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | downgrade muda final mas mantém suggested | PASS | 1ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | resultado sem restrição: final === suggested | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | tabela ELIGIBILITY_TABLE expõe apenas imposto_seletivo em v1.2 | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | isOperationType — type guard | PASS | 1ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | aceita 6 valores canônicos | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | rejeita case diferente (é case-sensitive) | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | rejeita null, undefined, number, object | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | rejeita strings desconhecidas | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | narrow type guard permite uso sem cast | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | EligibilityResult — forma do resultado | PASS | 1ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | result.allowed=true quando reason=null (categoria não-restrita) | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | result.allowed=true com reason pode coexistir (fallback permissivo) | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | isCategoryAllowed — aliases (hotfix v1.2.1) | PASS | 1ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | servicos (canônico) → bloqueia IS com downgrade | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | servico (alias singular) → normalizado para servicos, bloqueia IS | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | industria → permite IS (sem regressão) | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| risk-eligibility.test.ts | comercio → permite IS (sem regressão) | PASS | 0ms | 2026-04-27T00:35:25.741Z |
| audit-rf1-refineCnaes.test.ts | server/audit-rf1-refineCnaes.test.ts | PASS | 10ms | 2026-04-27T00:35:25.759Z |
| audit-rf1-refineCnaes.test.ts | RF-1.05 — refineCnaes: Loop de Aprovação de CNAEs com Feedback da IA | PASS | 9ms | 2026-04-27T00:35:25.759Z |
| audit-rf1-refineCnaes.test.ts | deve aceitar feedback mínimo de 5 caracteres | PASS | 1ms | 2026-04-27T00:35:25.759Z |
| audit-rf1-refineCnaes.test.ts | deve rejeitar feedback com menos de 5 caracteres | PASS | 0ms | 2026-04-27T00:35:25.759Z |
| audit-rf1-refineCnaes.test.ts | deve chamar a IA com o contexto dos CNAEs atuais e o feedback do usuário | PASS | 1ms | 2026-04-27T00:35:25.759Z |
| audit-rf1-refineCnaes.test.ts | deve retornar lista refinada com CNAEs de alta confiança após feedback | PASS | 0ms | 2026-04-27T00:35:25.759Z |
| audit-rf1-refineCnaes.test.ts | deve suportar múltiplas iterações de refinamento (iteração 1, 2, 3) | PASS | 0ms | 2026-04-27T00:35:25.759Z |
| audit-rf1-refineCnaes.test.ts | deve incluir o número da iteração no prompt enviado à IA | PASS | 2ms | 2026-04-27T00:35:25.759Z |
| audit-rf1-refineCnaes.test.ts | deve exigir pelo menos 1 CNAE na lista atual para refinamento | PASS | 0ms | 2026-04-27T00:35:25.759Z |
| audit-rf1-refineCnaes.test.ts | deve retornar entre 2 e 6 CNAEs refinados | PASS | 0ms | 2026-04-27T00:35:25.759Z |
| audit-rf1-refineCnaes.test.ts | deve lançar erro se a IA retornar JSON inválido no refinamento | PASS | 1ms | 2026-04-27T00:35:25.760Z |
| audit-rf1-refineCnaes.test.ts | deve validar que cada CNAE refinado tem code, description e confidence | PASS | 0ms | 2026-04-27T00:35:25.760Z |
| audit-rf1-refineCnaes.test.ts | deve preservar CNAEs de alta confiança do usuário durante o refinamento | PASS | 0ms | 2026-04-27T00:35:25.760Z |
| audit-rf1-refineCnaes.test.ts | RF-1.05 — Validações de Schema do refineCnaes | PASS | 1ms | 2026-04-27T00:35:25.760Z |
| audit-rf1-refineCnaes.test.ts | deve validar estrutura mínima do input: projectId, description, feedback, currentCnaes | PASS | 0ms | 2026-04-27T00:35:25.760Z |
| audit-rf1-refineCnaes.test.ts | deve rejeitar description com menos de 50 caracteres no refinamento | PASS | 0ms | 2026-04-27T00:35:25.760Z |
| audit-rf1-refineCnaes.test.ts | deve aceitar iteration com valor padrão 1 quando não fornecido | PASS | 0ms | 2026-04-27T00:35:25.760Z |
| k4b-onda1-stepper.test.ts | server/integration/k4b-onda1-stepper.test.ts | PASS | 11ms | 2026-04-27T00:35:25.784Z |
| k4b-onda1-stepper.test.ts | T-K4B-01: DiagnosticoStepper — Onda 1 nunca bloqueada | PASS | 2ms | 2026-04-27T00:35:25.784Z |
| k4b-onda1-stepper.test.ts | Onda 1 não está bloqueada em nenhum estado | PASS | 1ms | 2026-04-27T00:35:25.784Z |
| k4b-onda1-stepper.test.ts | T-K4B-02: DiagnosticoStepper — Onda 2 bloqueada até Onda 1 completa | PASS | 1ms | 2026-04-27T00:35:25.784Z |
| k4b-onda1-stepper.test.ts | Onda 2 bloqueada quando Onda 1 = not_started | PASS | 0ms | 2026-04-27T00:35:25.784Z |
| k4b-onda1-stepper.test.ts | Onda 2 bloqueada quando Onda 1 = in_progress | PASS | 0ms | 2026-04-27T00:35:25.784Z |
| k4b-onda1-stepper.test.ts | Onda 2 desbloqueada quando Onda 1 = completed | PASS | 0ms | 2026-04-27T00:35:25.784Z |
| k4b-onda1-stepper.test.ts | T-K4B-03: DiagnosticoStepper — Corporativo bloqueado até Onda 2 completa | PASS | 0ms | 2026-04-27T00:35:25.784Z |
| k4b-onda1-stepper.test.ts | Corporativo bloqueado quando Onda 2 = not_started | PASS | 0ms | 2026-04-27T00:35:25.784Z |
| k4b-onda1-stepper.test.ts | Corporativo desbloqueado quando Onda 2 = completed | PASS | 0ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | T-K4B-04: DiagnosticoStepper — Cadeia completa de bloqueio | PASS | 1ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | Todas as etapas 2-8 bloqueadas no estado inicial | PASS | 0ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | Todas as etapas desbloqueadas quando todas concluídas | PASS | 0ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | T-K4B-05: VALID_TRANSITIONS — Onda 1 → onda1_solaris | PASS | 2ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | cnaes_confirmados → onda1_solaris é válido (K-4-B fix) | PASS | 1ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | onda1_solaris → onda2_iagen é válido | PASS | 0ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | onda1_solaris → rascunho é válido (rollback) | PASS | 0ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | onda2_iagen → diagnostico_corporativo é válido | PASS | 0ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | T-K4B-06: assertValidTransition — Enforcement Onda 1 | PASS | 2ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | assertValidTransition('cnaes_confirmados', 'onda1_solaris') não lança erro (K-4-B fix) | PASS | 1ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | assertValidTransition('onda1_solaris', 'onda2_iagen') não lança erro | PASS | 0ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | assertValidTransition('diagnostico_corporativo', 'onda1_solaris') lança erro (regressão) | PASS | 1ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | assertValidTransition('rascunho', 'diagnostico_corporativo') lança erro (pula Onda 1) | PASS | 0ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | T-K4B-07: Compatibilidade retroativa — projetos existentes | PASS | 1ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | Projetos em diagnostico_corporativo mantêm transições válidas | PASS | 0ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | Projetos em diagnostico_operacional mantêm transições válidas | PASS | 0ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | Projetos em diagnostico_cnae mantêm transições válidas | PASS | 0ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | VALID_TRANSITIONS tem pelo menos 8 entradas (K-4-A + retroativas) | PASS | 0ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | T-K4B-08: Schema — solarisAnswers campos obrigatórios | PASS | 1ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | Campos obrigatórios do InsertSolarisAnswer estão corretos | PASS | 1ms | 2026-04-27T00:35:25.785Z |
| k4b-onda1-stepper.test.ts | Campo fonte padrão é 'solaris' | PASS | 0ms | 2026-04-27T00:35:25.785Z |
| riskEngine.test.ts | server/routers/riskEngine.test.ts | PASS | 41ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | G11 — DerivedRiskSchema.fonte_risco | PASS | 7ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | aceita fonte_risco='solaris' (pipeline SOLARIS Onda 1) | PASS | 3ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | aceita fonte_risco='cnae' (análise setorial) | PASS | 0ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | aceita fonte_risco='iagen' (IA Generativa Onda 2) | PASS | 0ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | aceita fonte_risco='v1' (pipeline legado) | PASS | 0ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | usa default 'v1' quando fonte_risco não é fornecido | PASS | 0ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | rejeita valor inválido para fonte_risco | PASS | 1ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | aceita fonte_risco='engine' (Decision Kernel M2) | PASS | 0ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | gap_classification NULL para engine usa fallback 'ausencia' | PASS | 0ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | risco contextual (gap_id=null) aceita fonte_risco='v1' | PASS | 0ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | Componente B — Q5 testes obrigatórios (DEC-M2-05) | PASS | 33ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | fonteRisco deriva 'engine' para gap.gap_source === 'engine' | PASS | 0ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | gaps source='engine' são incluídos na query do riskEngine (cláusula WHERE) | PASS | 0ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | z.enum fonte_risco aceita valor 'engine' | PASS | 33ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | G11 — derivação lógica de fonte_risco a partir de gap.source | PASS | 1ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | gap.source='solaris' → fonte_risco='solaris' | PASS | 0ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | gap.source='v1' → fonte_risco='v1' | PASS | 0ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | gap.source desconhecido → fonte_risco='v1' (default seguro) | PASS | 0ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | gap.source=null → fonte_risco='v1' (default seguro) | PASS | 0ms | 2026-04-27T00:35:25.860Z |
| riskEngine.test.ts | gap.source='cnae' → fonte_risco='cnae' | PASS | 0ms | 2026-04-27T00:35:25.860Z |
| engine-gap-analyzer.test.ts | server/lib/engine-gap-analyzer.test.ts | PASS | 9ms | 2026-04-27T00:35:26.001Z |
| engine-gap-analyzer.test.ts | engine-gap-analyzer — Q5 obrigatórios (Bloco D) | PASS | 9ms | 2026-04-27T00:35:26.001Z |
| engine-gap-analyzer.test.ts | NCM confirmado (9619.00.00) gera gap com source=engine | PASS | 3ms | 2026-04-27T00:35:26.001Z |
| engine-gap-analyzer.test.ts | NBS confirmado (1.1506.21.00) gera gap com source=engine | PASS | 1ms | 2026-04-27T00:35:26.001Z |
| engine-gap-analyzer.test.ts | NBS pending_validation (1.0906.11.00) NÃO gera INSERT no banco | PASS | 1ms | 2026-04-27T00:35:26.001Z |
| engine-gap-analyzer.test.ts | evaluation_confidence = confianca.valor / 100 para NCM 9619.00.00 (confiança 100) | PASS | 1ms | 2026-04-27T00:35:26.001Z |
| engine-gap-analyzer.test.ts | source_reference contém artigo da lei (LC 214/2025 Art. ...) | PASS | 1ms | 2026-04-27T00:35:26.001Z |
| engine-gap-analyzer.test.ts | múltiplos NCM/NBS confirmados geram múltiplos gaps | PASS | 1ms | 2026-04-27T00:35:26.001Z |
| engine-gap-analyzer.test.ts | mix pending + confirmados: apenas confirmados gravam no banco | PASS | 0ms | 2026-04-27T00:35:26.001Z |
| engine-gap-analyzer.test.ts | DELETE source=engine é chamado antes dos INSERTs (idempotência) | PASS | 1ms | 2026-04-27T00:35:26.001Z |
| routers-rag-admin.test.ts | server/routers-rag-admin.test.ts | PASS | 8ms | 2026-04-27T00:35:26.011Z |
| routers-rag-admin.test.ts | G16 — ragAdmin.uploadCsv | PASS | 8ms | 2026-04-27T00:35:26.011Z |
| routers-rag-admin.test.ts | T-G16-01: CSV válido em dry-run retorna total=2, valid=2, inserted=0, errors=[] | PASS | 4ms | 2026-04-27T00:35:26.011Z |
| routers-rag-admin.test.ts | T-G16-02: CSV válido em run real — 2 linhas válidas prontas para inserção | PASS | 1ms | 2026-04-27T00:35:26.011Z |
| routers-rag-admin.test.ts | T-G16-03: CSV com linha inválida retorna errors com row=3 e message descritiva | PASS | 1ms | 2026-04-27T00:35:26.011Z |
| routers-rag-admin.test.ts | T-G16-04: CSV vazio (sem linhas de dados) retorna 0 linhas parseadas | PASS | 1ms | 2026-04-27T00:35:26.011Z |
| routers-rag-admin.test.ts | T-G16-05: guard rejeita role=cliente com TRPCError FORBIDDEN | PASS | 0ms | 2026-04-27T00:35:26.011Z |
| k4a-schema-statemachine.test.ts | server/k4a-schema-statemachine.test.ts | PASS | 15ms | 2026-04-27T00:35:26.175Z |
| k4a-schema-statemachine.test.ts | T-K4A-01: solarisAnswers exportado do schema | PASS | 4ms | 2026-04-27T00:35:26.175Z |
| k4a-schema-statemachine.test.ts | deve existir como objeto Drizzle | PASS | 1ms | 2026-04-27T00:35:26.175Z |
| k4a-schema-statemachine.test.ts | deve ter as colunas esperadas via Object.keys() | PASS | 2ms | 2026-04-27T00:35:26.175Z |
| k4a-schema-statemachine.test.ts | deve ter fonte com default 'solaris' | PASS | 0ms | 2026-04-27T00:35:26.175Z |
| k4a-schema-statemachine.test.ts | T-K4A-02: iagenAnswers exportado do schema | PASS | 1ms | 2026-04-27T00:35:26.175Z |
| k4a-schema-statemachine.test.ts | deve existir como objeto Drizzle | PASS | 0ms | 2026-04-27T00:35:26.175Z |
| k4a-schema-statemachine.test.ts | deve ter as colunas esperadas via Object.keys() | PASS | 1ms | 2026-04-27T00:35:26.175Z |
| k4a-schema-statemachine.test.ts | deve ter fonte com default 'ia_gen' | PASS | 0ms | 2026-04-27T00:35:26.175Z |
| k4a-schema-statemachine.test.ts | T-K4A-03: solarisQuestions tem campo codigo | PASS | 0ms | 2026-04-27T00:35:26.175Z |
| k4a-schema-statemachine.test.ts | deve ter a coluna codigo via Object.keys() | PASS | 0ms | 2026-04-27T00:35:26.175Z |
| k4a-schema-statemachine.test.ts | coluna codigo deve ser um objeto Drizzle (MySqlColumn) | PASS | 0ms | 2026-04-27T00:35:26.175Z |
| k4a-schema-statemachine.test.ts | T-K4A-04: enum status de projects inclui novos valores | PASS | 1ms | 2026-04-27T00:35:26.175Z |
| k4a-schema-statemachine.test.ts | coluna status deve existir | PASS | 0ms | 2026-04-27T00:35:26.175Z |
| k4a-schema-statemachine.test.ts | deve incluir onda1_solaris no enumValues | PASS | 0ms | 2026-04-27T00:35:26.175Z |
| k4a-schema-statemachine.test.ts | deve incluir onda2_iagen no enumValues | PASS | 0ms | 2026-04-27T00:35:26.175Z |
| k4a-schema-statemachine.test.ts | deve manter todos os status legados | PASS | 0ms | 2026-04-27T00:35:26.175Z |
| k4a-schema-statemachine.test.ts | T-K4A-05: VALID_TRANSITIONS exportado do flowStateMachine | PASS | 1ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | deve ser um objeto não-vazio | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | deve incluir onda1_solaris como chave | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | deve incluir onda2_iagen como chave | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | onda1_solaris deve permitir avançar para onda2_iagen | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | onda1_solaris deve permitir retroceder para rascunho | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | onda2_iagen deve permitir avançar para diagnostico_corporativo | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | T-K4A-06: assertValidTransition aceita transições válidas | PASS | 2ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | cnaes_confirmados → onda1_solaris deve ser válido (K-4-B fix: rascunho não vai direto para Onda 1) | PASS | 1ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | onda1_solaris → onda2_iagen deve ser válido | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | onda2_iagen → diagnostico_corporativo deve ser válido | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | onda1_solaris → rascunho (retrocesso) deve ser válido | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | briefing → matriz_riscos deve ser válido | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | T-K4A-07: assertValidTransition rejeita transições inválidas | PASS | 1ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | rascunho → diagnostico_corporativo (pulo de etapa) deve lançar erro | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | onda1_solaris → briefing (pulo de etapa) deve lançar erro | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | aprovado → rascunho (retrocesso não permitido) deve lançar erro | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | arquivado → qualquer coisa deve lançar erro | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | mensagem de erro deve mencionar os status envolvidos | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | T-K4A-08: VALID_TRANSITIONS cobre status críticos do enum | PASS | 3ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | "rascunho" deve ter entrada em VALID_TRANSITIONS | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | "onda1_solaris" deve ter entrada em VALID_TRANSITIONS | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | "onda2_iagen" deve ter entrada em VALID_TRANSITIONS | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | "diagnostico_corporativo" deve ter entrada em VALID_TRANSITIONS | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | "diagnostico_operacional" deve ter entrada em VALID_TRANSITIONS | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | "diagnostico_cnae" deve ter entrada em VALID_TRANSITIONS | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | "briefing" deve ter entrada em VALID_TRANSITIONS | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| k4a-schema-statemachine.test.ts | "aprovado" deve ter entrada em VALID_TRANSITIONS | PASS | 0ms | 2026-04-27T00:35:26.176Z |
| gapEngine.test.ts | server/gapEngine.test.ts | PASS | 8ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | classifyGap | PASS | 3ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | sim retorna compliant sem severity | PASS | 1ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | nao retorna nao_compliant com severity alta | PASS | 0ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | parcial retorna parcial com severity media | PASS | 0ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | nao_aplicavel retorna nao_aplicavel sem severity | PASS | 0ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | preserva canonicalId e mappingId | PASS | 0ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | preserva answerNote | PASS | 0ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | calculateComplianceScore | PASS | 2ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | 100% quando todos compliant | PASS | 0ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | 0% quando todos nao_compliant | PASS | 0ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | formula parcial: 0.5 * parcial / total | PASS | 0ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | nao_aplicavel nao conta no denominador | PASS | 0ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | riskLevel baixo para score >= 80% | PASS | 0ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | riskLevel critico para score < 40% | PASS | 0ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | lista vazia retorna score 0 | PASS | 0ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | prioritizeGaps | PASS | 2ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | separa gaps por severidade corretamente | PASS | 1ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | compliant nao entra nas prioridades de acao | PASS | 0ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | runGapAnalysis | PASS | 1ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | analise completa com mix de respostas | PASS | 0ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | score 100% somente se totalGaps == 0 | PASS | 0ms | 2026-04-27T00:35:26.210Z |
| gapEngine.test.ts | criticalGaps conta apenas gaps de severidade critica | PASS | 0ms | 2026-04-27T00:35:26.210Z |
| sprint-y-bl02-bl04.test.ts | server/integration/sprint-y-bl02-bl04.test.ts | PASS | 9ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | BL-02: completeOnda2 — transição de estado | PASS | 4ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | onda1_solaris → onda2_iagen é uma transição válida (fluxo correto) | PASS | 2ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | cnaes_confirmados → onda2_iagen é inválido (deve passar por onda1_solaris) | PASS | 1ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | onda2_iagen → onda2_iagen (auto-loop) é inválido | PASS | 0ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | VALID_TRANSITIONS['onda1_solaris'] contém 'onda2_iagen' | PASS | 1ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | completeOnda2 destino gravado no banco deve ser onda2_iagen (BUG-UAT-07 fix) | PASS | 0ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | BL-03: completeDiagnosticLayer — assertValidTransition (BL-01) | PASS | 2ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | diagnostico_corporativo é destino válido a partir de onda2_iagen (completeDiagnosticLayer corporate) | PASS | 0ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | diagnostico_operacional é destino válido a partir de diagnostico_corporativo | PASS | 0ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | diagnostico_cnae é destino válido a partir de diagnostico_operacional | PASS | 0ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | layer 'operational' sem corporate concluído deve lançar erro de gate (não de transição) | PASS | 0ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | layer 'cnae' sem operational concluído deve lançar erro de gate | PASS | 0ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | isDiagnosticComplete retorna true quando todas as 3 camadas estão completed | PASS | 0ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | isDiagnosticComplete retorna false quando alguma camada não está completed | PASS | 0ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | getNextDiagnosticLayer retorna 'operational' quando corporate está completed | PASS | 0ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | getNextDiagnosticLayer retorna null quando todas as camadas estão completed | PASS | 0ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | getDiagnosticProgress retorna 100 quando todas as camadas estão completed | PASS | 0ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | getDiagnosticProgress retorna 33 quando apenas corporate está completed | PASS | 0ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | BL-04: updateDiagnosticStatus — não interfere com project.status | PASS | 1ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | updateDiagnosticStatus não é um handler de transição de status do projeto | PASS | 0ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | VALID_TRANSITIONS cobre todos os status de diagnóstico | PASS | 0ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | grafo de transições de diagnóstico é sequencial (sem saltos) | PASS | 1ms | 2026-04-27T00:35:26.414Z |
| sprint-y-bl02-bl04.test.ts | não é possível ir de diagnostico_cnae direto para plano_acao (sem briefing) | PASS | 0ms | 2026-04-27T00:35:26.414Z |
| z02b-risk-categorizer-integration.test.ts | server/z02b-risk-categorizer-integration.test.ts | PASS | 9ms | 2026-04-27T00:35:26.536Z |
| z02b-risk-categorizer-integration.test.ts | categorizeRisk — Caso 1: Imposto Seletivo | PASS | 2ms | 2026-04-27T00:35:26.537Z |
| z02b-risk-categorizer-integration.test.ts | deve retornar imposto_seletivo para topicos com 'imposto seletivo' | PASS | 1ms | 2026-04-27T00:35:26.537Z |
| z02b-risk-categorizer-integration.test.ts | deve retornar imposto_seletivo quando description menciona 'cigarro' | PASS | 0ms | 2026-04-27T00:35:26.537Z |
| z02b-risk-categorizer-integration.test.ts | categorizeRisk — Caso 2: IBS/CBS | PASS | 1ms | 2026-04-27T00:35:26.537Z |
| z02b-risk-categorizer-integration.test.ts | deve retornar ibs_cbs para topicos com 'cbs' | PASS | 0ms | 2026-04-27T00:35:26.537Z |
| z02b-risk-categorizer-integration.test.ts | deve retornar ibs_cbs para description com 'ibs' | PASS | 0ms | 2026-04-27T00:35:26.537Z |
| z02b-risk-categorizer-integration.test.ts | categorizeRisk — Caso 3: Split Payment | PASS | 1ms | 2026-04-27T00:35:26.537Z |
| z02b-risk-categorizer-integration.test.ts | deve retornar split_payment para type = split_payment | PASS | 0ms | 2026-04-27T00:35:26.537Z |
| z02b-risk-categorizer-integration.test.ts | deve retornar split_payment para description com 'split payment' | PASS | 0ms | 2026-04-27T00:35:26.537Z |
| z02b-risk-categorizer-integration.test.ts | categorizeRisk — Caso 4: Fallback enquadramento_geral | PASS | 0ms | 2026-04-27T00:35:26.537Z |
| z02b-risk-categorizer-integration.test.ts | deve retornar enquadramento_geral quando não há dados suficientes | PASS | 0ms | 2026-04-27T00:35:26.537Z |
| z02b-risk-categorizer-integration.test.ts | deve retornar enquadramento_geral para input completamente vazio | PASS | 0ms | 2026-04-27T00:35:26.537Z |
| z02b-risk-categorizer-integration.test.ts | DerivedRiskSchema — Caso 5: campo categoria integrado | PASS | 4ms | 2026-04-27T00:35:26.537Z |
| z02b-risk-categorizer-integration.test.ts | deve aceitar DerivedRisk com categoria = 'imposto_seletivo' | PASS | 2ms | 2026-04-27T00:35:26.537Z |
| z02b-risk-categorizer-integration.test.ts | deve usar default 'enquadramento_geral' quando categoria não é fornecida | PASS | 0ms | 2026-04-27T00:35:26.537Z |
| z02b-risk-categorizer-integration.test.ts | assertCategoria não lança erro para categoria válida | PASS | 1ms | 2026-04-27T00:35:26.537Z |
| z02b-risk-categorizer-integration.test.ts | assertCategoria lança Error para categoria vazia | PASS | 0ms | 2026-04-27T00:35:26.537Z |
| z02b-risk-categorizer-integration.test.ts | assertCategoria lança Error para categoria null | PASS | 0ms | 2026-04-27T00:35:26.537Z |
| z02b-risk-categorizer-integration.test.ts | RED TEST — bug imposto_seletivo para transportadora (hotfix v1.2) | PASS | 0ms | 2026-04-27T00:35:26.537Z |
| z02b-risk-categorizer-integration.test.ts | [LIM-1:corrigido-para-servicos] transportadora de combustível NÃO deve receber imposto_seletivo | PASS | 0ms | 2026-04-27T00:35:26.537Z |
| bloco-e-operation-profile.test.ts | server/bloco-e-operation-profile.test.ts | PASS | 10ms | 2026-04-27T00:35:26.627Z |
| bloco-e-operation-profile.test.ts | Bloco E — operationProfile (CNT-01c) | PASS | 9ms | 2026-04-27T00:35:26.627Z |
| bloco-e-operation-profile.test.ts | projeto com principaisProdutos gera gaps source=engine | PASS | 4ms | 2026-04-27T00:35:26.627Z |
| bloco-e-operation-profile.test.ts | projeto sem principaisProdutos não quebra o fluxo | PASS | 1ms | 2026-04-27T00:35:26.627Z |
| bloco-e-operation-profile.test.ts | operationProfile aceita principaisProdutos e principaisServicos sem migration | PASS | 1ms | 2026-04-27T00:35:26.627Z |
| bloco-e-operation-profile.test.ts | engine-gap-analyzer recebe NCMs extraídos do operationProfile | PASS | 1ms | 2026-04-27T00:35:26.627Z |
| bloco-e-operation-profile.test.ts | operationProfile null não quebra (projeto legado) | PASS | 0ms | 2026-04-27T00:35:26.627Z |
| bloco-e-operation-profile.test.ts | principaisProdutos sem percentualFaturamento é aceito | PASS | 1ms | 2026-04-27T00:35:26.627Z |
| k2-onda1-injector.test.ts | server/integration/k2-onda1-injector.test.ts | FAIL | 14ms | 2026-04-27T00:35:26.643Z |
| k2-onda1-injector.test.ts | K-2: Onda 1 Injector — getOnda1Questions | FAIL | 11ms | 2026-04-27T00:35:26.643Z |
| k2-onda1-injector.test.ts | T-K2-01: campos obrigatórios presentes na pergunta mapeada | FAIL | 6ms | 2026-04-27T00:35:26.643Z |
| k2-onda1-injector.test.ts | T-K2-02: fonte sempre 'solaris' | FAIL | 1ms | 2026-04-27T00:35:26.643Z |
| k2-onda1-injector.test.ts | T-K2-03: requirement_id prefixado com 'SQ-' | FAIL | 1ms | 2026-04-27T00:35:26.643Z |
| k2-onda1-injector.test.ts | T-K2-04: obrigatorio=1 → peso_risco='alto' e required=true | FAIL | 1ms | 2026-04-27T00:35:26.643Z |
| k2-onda1-injector.test.ts | T-K2-05: obrigatorio=0 → peso_risco='medio' e required=false | FAIL | 1ms | 2026-04-27T00:35:26.643Z |
| k2-onda1-injector.test.ts | T-K2-09: filtra por cnaeGroups — CNAE compatível retorna pergunta | FAIL | 0ms | 2026-04-27T00:35:26.643Z |
| k2-onda1-injector.test.ts | T-K2-10: pergunta universal (cnaeGroups=null) aparece para qualquer CNAE | FAIL | 1ms | 2026-04-27T00:35:26.643Z |
| k2-onda1-injector.test.ts | T-K2-11: cnaeCode com '/' é normalizado — getSolarisQuestions recebe apenas prefixo | FAIL | 0ms | 2026-04-27T00:35:26.643Z |
| k2-onda1-injector.test.ts | K-2: Onda 1 Injector — injectOnda1IntoQuestions | FAIL | 3ms | 2026-04-27T00:35:26.643Z |
| k2-onda1-injector.test.ts | T-K2-06: Onda 1 vem ANTES das perguntas regulatórias | FAIL | 1ms | 2026-04-27T00:35:26.643Z |
| k2-onda1-injector.test.ts | T-K2-07: sem Onda 1 (banco vazio) retorna apenas regulatório inalterado | FAIL | 1ms | 2026-04-27T00:35:26.643Z |
| k2-onda1-injector.test.ts | T-K2-08: IDs sq-* não colidem com q1, q2 das regulatórias | FAIL | 1ms | 2026-04-27T00:35:26.643Z |
| k2-onda1-injector.test.ts | T-K2-12: total = onda1 + regulatorio | FAIL | 1ms | 2026-04-27T00:35:26.643Z |
| gap-to-rule-mapper.test.ts | server/lib/gap-to-rule-mapper.test.ts | PASS | 8ms | 2026-04-27T00:35:26.818Z |
| gap-to-rule-mapper.test.ts | Gap-to-Rule Mapper v2 — Gold Set Z-10 | PASS | 7ms | 2026-04-27T00:35:26.818Z |
| gap-to-rule-mapper.test.ts | T1: gap com categoria explícita válida em risk_categories → mapped | PASS | 2ms | 2026-04-27T00:35:26.818Z |
| gap-to-rule-mapper.test.ts | T2: gap com categoria explícita inexistente/inativa → unmapped (DEC-Z10-06) | PASS | 1ms | 2026-04-27T00:35:26.818Z |
| gap-to-rule-mapper.test.ts | T3: artigo com exatamente 1 candidato em risk_categories → mapped | PASS | 1ms | 2026-04-27T00:35:26.818Z |
| gap-to-rule-mapper.test.ts | T4: artigo com 2+ candidatos → ambiguous, NUNCA mapped | PASS | 1ms | 2026-04-27T00:35:26.818Z |
| gap-to-rule-mapper.test.ts | T5: artigo sem nenhum candidato em risk_categories → unmapped | PASS | 0ms | 2026-04-27T00:35:26.818Z |
| gap-to-rule-mapper.test.ts | T6: gap sem categoria, sem artigo, allowLayerInference=false → unmapped | PASS | 0ms | 2026-04-27T00:35:26.818Z |
| gap-to-rule-mapper.test.ts | T7: allowLayerInference=true + layer=onda2 + artigo 1 candidato → mapped com fonte=iagen | PASS | 1ms | 2026-04-27T00:35:26.818Z |
| audit-rf207-badge-revisado.test.ts | server/audit-rf207-badge-revisado.test.ts | PASS | 6ms | 2026-04-27T00:35:26.835Z |
| audit-rf207-badge-revisado.test.ts | RF-2.07 UX: Badge 'Revisado' no stepper de CNAEs | PASS | 6ms | 2026-04-27T00:35:26.835Z |
| audit-rf207-badge-revisado.test.ts | deve inicializar todos os CNAEs com revisado=false | PASS | 1ms | 2026-04-27T00:35:26.835Z |
| audit-rf207-badge-revisado.test.ts | deve marcar revisado=true ao confirmar retorno ao CNAE concluído | PASS | 1ms | 2026-04-27T00:35:26.835Z |
| audit-rf207-badge-revisado.test.ts | NÃO deve marcar revisado=true em CNAE que ainda não foi concluído | PASS | 0ms | 2026-04-27T00:35:26.835Z |
| audit-rf207-badge-revisado.test.ts | deve limpar revisado=false ao re-concluir o CNAE (handleFinishLevel1) | PASS | 0ms | 2026-04-27T00:35:26.835Z |
| audit-rf207-badge-revisado.test.ts | deve exibir badge apenas quando revisado=true E nivel1Done=true | PASS | 0ms | 2026-04-27T00:35:26.835Z |
| audit-rf207-badge-revisado.test.ts | deve funcionar corretamente com múltiplos CNAEs revisados | PASS | 1ms | 2026-04-27T00:35:26.835Z |
| audit-rf207-badge-revisado.test.ts | deve preservar o estado revisado dos outros CNAEs ao re-concluir um | PASS | 0ms | 2026-04-27T00:35:26.835Z |
| audit-rf207-badge-revisado.test.ts | deve manter o código e descrição do CNAE ao marcar revisado | PASS | 0ms | 2026-04-27T00:35:26.835Z |
| audit-rf207-badge-revisado.test.ts | deve preservar as respostas anteriores ao marcar revisado | PASS | 0ms | 2026-04-27T00:35:26.835Z |
| onda2-t14-retrocesso.test.ts | T14.7 — loop adversarial: 10 retrocessos consecutivos sem corrupção | PASS | 1616ms | 2026-04-27T00:35:27.267Z |
| onda2-t14-retrocesso.test.ts | T14.8 — invariante após loop: currentStep consistente com status | PASS | 48ms | 2026-04-27T00:35:27.314Z |
| bug-manual-04-02-stepper-wiring.test.ts | server/integration/bug-manual-04-02-stepper-wiring.test.ts | PASS | 10ms | 2026-04-27T00:35:27.358Z |
| bug-manual-04-02-stepper-wiring.test.ts | W01 — DiagnosticoStepper: labels não contêm strings legadas | PASS | 4ms | 2026-04-27T00:35:27.358Z |
| bug-manual-04-02-stepper-wiring.test.ts | label do step 'corporate' não deve ser 'Questionário Corporativo' | PASS | 3ms | 2026-04-27T00:35:27.358Z |
| bug-manual-04-02-stepper-wiring.test.ts | label do step 'operational' não deve ser 'Questionário Operacional' | PASS | 1ms | 2026-04-27T00:35:27.358Z |
| bug-manual-04-02-stepper-wiring.test.ts | W02 — DiagnosticoStepper: labels contêm strings TO-BE (Z-02) | PASS | 1ms | 2026-04-27T00:35:27.358Z |
| bug-manual-04-02-stepper-wiring.test.ts | label do step 'corporate' deve ser 'Q. de Produtos (NCM)' | PASS | 0ms | 2026-04-27T00:35:27.358Z |
| bug-manual-04-02-stepper-wiring.test.ts | label do step 'operational' deve ser 'Q. de Serviços (NBS)' | PASS | 0ms | 2026-04-27T00:35:27.358Z |
| bug-manual-04-02-stepper-wiring.test.ts | W03 — ProjetoDetalhesV2: rotas legadas removidas do onStartLayer | PASS | 1ms | 2026-04-27T00:35:27.358Z |
| bug-manual-04-02-stepper-wiring.test.ts | não deve navegar para /questionario-corporativo-v2 | PASS | 0ms | 2026-04-27T00:35:27.358Z |
| bug-manual-04-02-stepper-wiring.test.ts | não deve navegar para /questionario-operacional via onStartLayer | PASS | 0ms | 2026-04-27T00:35:27.358Z |
| bug-manual-04-02-stepper-wiring.test.ts | W04 — ProjetoDetalhesV2: rotas TO-BE presentes no onStartLayer | PASS | 1ms | 2026-04-27T00:35:27.358Z |
| bug-manual-04-02-stepper-wiring.test.ts | deve navegar para /questionario-produto quando layer='corporate' | PASS | 0ms | 2026-04-27T00:35:27.358Z |
| bug-manual-04-02-stepper-wiring.test.ts | deve navegar para /questionario-servico quando layer='operational' | PASS | 0ms | 2026-04-27T00:35:27.358Z |
| bug-manual-04-02-stepper-wiring.test.ts | W05 — projectStatusToStepState: status Z-02 mapeados corretamente | PASS | 1ms | 2026-04-27T00:35:27.358Z |
| bug-manual-04-02-stepper-wiring.test.ts | q_produto → corporate=in_progress, operational=not_started | PASS | 1ms | 2026-04-27T00:35:27.358Z |
| bug-manual-04-02-stepper-wiring.test.ts | q_servico → corporate=completed, operational=in_progress | PASS | 0ms | 2026-04-27T00:35:27.358Z |
| bug-manual-04-02-stepper-wiring.test.ts | W06 — DIV-Z02-003: condicional usa valores em português | PASS | 1ms | 2026-04-27T00:35:27.358Z |
| bug-manual-04-02-stepper-wiring.test.ts | DiagnosticoStepper não deve usar 'service' ou 'mixed' (inglês) como valores de operationType | PASS | 1ms | 2026-04-27T00:35:27.358Z |
| bug-manual-04-02-stepper-wiring.test.ts | ProjetoDetalhesV2 não deve usar 'service' ou 'mixed' (inglês) como valores de operationType | PASS | 0ms | 2026-04-27T00:35:27.358Z |
| bugfix-sprint-v53.test.ts | server/bugfix-sprint-v53.test.ts | PASS | 6ms | 2026-04-27T00:35:27.541Z |
| bugfix-sprint-v53.test.ts | Bug 1: Sanitização de CNPJ | PASS | 4ms | 2026-04-27T00:35:27.541Z |
| bugfix-sprint-v53.test.ts | formata CNPJ com 14 dígitos corretamente | PASS | 1ms | 2026-04-27T00:35:27.541Z |
| bugfix-sprint-v53.test.ts | formata CNPJ com pontuação já existente | PASS | 0ms | 2026-04-27T00:35:27.541Z |
| bugfix-sprint-v53.test.ts | trunca CNPJ com mais de 14 dígitos para 18 chars | PASS | 0ms | 2026-04-27T00:35:27.541Z |
| bugfix-sprint-v53.test.ts | retorna undefined para CNPJ vazio | PASS | 0ms | 2026-04-27T00:35:27.541Z |
| bugfix-sprint-v53.test.ts | remove caracteres não numéricos antes de processar | PASS | 0ms | 2026-04-27T00:35:27.541Z |
| bugfix-sprint-v53.test.ts | CNPJ com exatamente 18 chars não é truncado | PASS | 0ms | 2026-04-27T00:35:27.541Z |
| bugfix-sprint-v53.test.ts | Bug 2: Estado pendingClientName | PASS | 1ms | 2026-04-27T00:35:27.541Z |
| bugfix-sprint-v53.test.ts | selectedClient usa pendingClientName quando clients ainda não retornou o novo cliente | PASS | 0ms | 2026-04-27T00:35:27.541Z |
| bugfix-sprint-v53.test.ts | selectedClient usa dados reais quando clients já foi atualizado | PASS | 0ms | 2026-04-27T00:35:27.541Z |
| bugfix-sprint-v53.test.ts | botão Avançar fica habilitado quando clientId está definido | PASS | 0ms | 2026-04-27T00:35:27.541Z |
| bugfix-sprint-v53.test.ts | botão Avançar fica desabilitado quando clientId é null | PASS | 0ms | 2026-04-27T00:35:27.541Z |
| bugfix-sprint-v53.test.ts | Bug 3: Prevenção de chamada dupla no nível 2 | PASS | 1ms | 2026-04-27T00:35:27.541Z |
| bugfix-sprint-v53.test.ts | pré-registrar cacheKey antes de mudar nível evita chamada dupla do useEffect | PASS | 0ms | 2026-04-27T00:35:27.541Z |
| bugfix-sprint-v53.test.ts | sem pré-registro, useEffect dispararia chamada extra (comportamento antigo) | PASS | 0ms | 2026-04-27T00:35:27.541Z |
| bugfix-sprint-v53.test.ts | handleAcceptDeepDive pré-registra cacheKey antes de setCurrentLevel | PASS | 0ms | 2026-04-27T00:35:27.541Z |
| bugfix-sprint-v53.test.ts | cacheKey é único por CNAE e nível | PASS | 0ms | 2026-04-27T00:35:27.541Z |
| onda2-t14-retrocesso.test.ts | T14.9 — projeto aprovado pode retroceder para plano_acao (alteração) | PASS | 299ms | 2026-04-27T00:35:27.613Z |
| onda2-t11-carga.test.ts | T11.1 — cria 50 projetos em paralelo sem erro | PASS | 490ms | 2026-04-27T00:35:27.672Z |
| onda2-t11-carga.test.ts | T11.2 — todos os 50 projetos têm IDs únicos (sem colisão) | PASS | 0ms | 2026-04-27T00:35:27.672Z |
| onda2-t14-retrocesso.test.ts | T14.10 — após retrocesso pós-aprovação: pode retornar a aprovado | PASS | 102ms | 2026-04-27T00:35:27.715Z |
| onda2-t14-retrocesso.test.ts | T14 — Retrocesso Múltiplo Acumulado | PASS | 4025ms | 2026-04-27T00:35:27.778Z |
| onda2-t14-retrocesso.test.ts | server/integration/onda2-t14-retrocesso.test.ts | PASS | 4025ms | 2026-04-27T00:35:27.778Z |
| onda2-t11-carga.test.ts | T11.3 — todos os 50 projetos têm status 'rascunho' correto | PASS | 110ms | 2026-04-27T00:35:27.782Z |
| k4c-onda2-iagen.test.ts | server/integration/k4c-onda2-iagen.test.ts | FAIL | — | 2026-04-27T00:35:27.953Z |
| onda2-t11-carga.test.ts | T11.4 — atualização concorrente de status em 50 projetos sem deadlock | PASS | 212ms | 2026-04-27T00:35:27.997Z |
| onda2-t11-carga.test.ts | T11.5 — integridade após atualização paralela: todos têm status correto | PASS | 102ms | 2026-04-27T00:35:28.096Z |
| z01-qc-ncm.test.ts | server/integration/z01-qc-ncm.test.ts | PASS | 7ms | 2026-04-27T00:35:28.167Z |
| z01-qc-ncm.test.ts | Z-01 Q.Produtos (NCM) | PASS | 6ms | 2026-04-27T00:35:28.167Z |
| z01-qc-ncm.test.ts | Caso 1: NCM 2202.10.00 → TrackedQuestion[] com fonte='rag' | PASS | 2ms | 2026-04-27T00:35:28.167Z |
| z01-qc-ncm.test.ts | Caso 2: inferCategoria com topicos 'imposto seletivo' → 'imposto_seletivo' | PASS | 0ms | 2026-04-27T00:35:28.167Z |
| z01-qc-ncm.test.ts | Caso 3: empresa de serviço → { nao_aplicavel: true } | PASS | 1ms | 2026-04-27T00:35:28.167Z |
| z01-qc-ncm.test.ts | Caso 4: empresa de produto sem NCM → fallback com alerta | PASS | 1ms | 2026-04-27T00:35:28.167Z |
| z01-qc-ncm.test.ts | Caso 5: deduplicateById remove duplicatas por id | PASS | 1ms | 2026-04-27T00:35:28.167Z |
| z01-qc-ncm.test.ts | Caso 6: TrackedQuestion[] gerada tem fonte_ref e lei_ref preenchidos | PASS | 1ms | 2026-04-27T00:35:28.167Z |
| sprint-v53-features.test.ts | server/sprint-v53-features.test.ts | PASS | 6ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | Máscara de CNPJ (maskCnpj) | PASS | 4ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | retorna vazio para string vazia | PASS | 1ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | formata 2 dígitos sem separador | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | formata 3 dígitos com ponto | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | formata 5 dígitos com ponto | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | formata 6 dígitos com dois pontos | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | formata 8 dígitos com dois pontos | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | formata 9 dígitos com barra | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | formata 12 dígitos com barra | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | formata 14 dígitos completo com hífen | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | ignora dígitos além de 14 | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | remove caracteres não numéricos antes de formatar | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | resultado tem no máximo 18 caracteres | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | Validação de CNPJ (isCnpjValid) | PASS | 1ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | CNPJ vazio é válido (campo opcional) | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | CNPJ com 14 dígitos é válido | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | CNPJ com 13 dígitos é inválido | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | CNPJ com 15 dígitos é inválido | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | CNPJ parcialmente digitado (5 dígitos) é inválido | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | RF-5.08 UI: Painel de Notificações | PASS | 1ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | hasActiveNotifications retorna false para notificações padrão | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | hasActiveNotifications retorna true quando onStatusChange ativo | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | hasActiveNotifications retorna true quando onProgressUpdate ativo | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | hasActiveNotifications retorna true quando onComment ativo | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | hasActiveNotifications retorna false para undefined | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | clampBeforeDays mantém valor entre 1 e 30 | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | clampBeforeDays corrige valor abaixo de 1 | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | clampBeforeDays corrige valor acima de 30 | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | atualizar onStatusChange não afeta outros campos | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| sprint-v53-features.test.ts | ícone de sino deve ser exibido quando qualquer notificação está ativa | PASS | 0ms | 2026-04-27T00:35:28.353Z |
| onda2-t11-carga.test.ts | T11.6 — race condition: dois updates simultâneos no mesmo projeto — último vence | PASS | 294ms | 2026-04-27T00:35:28.390Z |
| extract-json.test.ts | server/lib/extract-json.test.ts | PASS | 8ms | 2026-04-27T00:35:28.573Z |
| extract-json.test.ts | extractJsonFromLLMResponse | PASS | 7ms | 2026-04-27T00:35:28.573Z |
| extract-json.test.ts | extrai array direto simples | PASS | 2ms | 2026-04-27T00:35:28.573Z |
| extract-json.test.ts | extrai array com múltiplos itens | PASS | 1ms | 2026-04-27T00:35:28.573Z |
| extract-json.test.ts | extrai array vazio | PASS | 0ms | 2026-04-27T00:35:28.573Z |
| extract-json.test.ts | extrai objeto direto | PASS | 0ms | 2026-04-27T00:35:28.573Z |
| extract-json.test.ts | extrai objeto wrapper com array interno | PASS | 0ms | 2026-04-27T00:35:28.573Z |
| extract-json.test.ts | extrai array de markdown fence json | PASS | 0ms | 2026-04-27T00:35:28.573Z |
| extract-json.test.ts | extrai objeto de markdown fence | PASS | 0ms | 2026-04-27T00:35:28.573Z |
| extract-json.test.ts | extrai de markdown fence sem tag json | PASS | 0ms | 2026-04-27T00:35:28.573Z |
| extract-json.test.ts | ignora thinking block e extrai JSON após | PASS | 0ms | 2026-04-27T00:35:28.573Z |
| extract-json.test.ts | extrai JSON de texto com prefixo | PASS | 0ms | 2026-04-27T00:35:28.573Z |
| extract-json.test.ts | extrai JSON de texto com sufixo | PASS | 0ms | 2026-04-27T00:35:28.573Z |
| extract-json.test.ts | prefere o maior bloco JSON quando há múltiplos | PASS | 0ms | 2026-04-27T00:35:28.573Z |
| extract-json.test.ts | retorna null para texto sem JSON | PASS | 0ms | 2026-04-27T00:35:28.573Z |
| extract-json.test.ts | retorna null para string vazia | PASS | 0ms | 2026-04-27T00:35:28.573Z |
| extract-json.test.ts | retorna null para null/undefined | PASS | 0ms | 2026-04-27T00:35:28.573Z |
| extract-json.test.ts | extrai resposta típica GPT-4.1 com wrapper 'tarefas' | PASS | 0ms | 2026-04-27T00:35:28.573Z |
| extract-json.test.ts | extrai resposta típica Gemini com thinking + array | PASS | 0ms | 2026-04-27T00:35:28.573Z |
| onda2-t11-carga.test.ts | T11.7 — leitura concorrente de 50 projetos sem erro | PASS | 195ms | 2026-04-27T00:35:28.584Z |
| onda2-t11-carga.test.ts | T11.8 — inserção de 50 respostas de questionário em paralelo sem erro | PASS | 208ms | 2026-04-27T00:35:28.793Z |
| onda2-t11-carga.test.ts | T11.9 — contagem final: exatamente 50 projetos ONDA2-T11 no banco | PASS | 103ms | 2026-04-27T00:35:28.896Z |
| onda2-t11-carga.test.ts | T11 — Carga: 50 projetos em paralelo | PASS | 2319ms | 2026-04-27T00:35:29.089Z |
| onda2-t11-carga.test.ts | server/integration/onda2-t11-carga.test.ts | PASS | 2319ms | 2026-04-27T00:35:29.089Z |
| g17-solaris-gap.test.ts | server/integration/g17-solaris-gap.test.ts | PASS | 67ms | 2026-04-27T00:35:29.344Z |
| g17-solaris-gap.test.ts | G17 — SOLARIS Gaps Map | PASS | 7ms | 2026-04-27T00:35:29.344Z |
| g17-solaris-gap.test.ts | Caso 1 — SOL-002 = 'Não' → gap confissão por inércia no mapa | PASS | 3ms | 2026-04-27T00:35:29.344Z |
| g17-solaris-gap.test.ts | Caso 4 — SOL-001 = 'Não' → gap NF-e no mapa | PASS | 1ms | 2026-04-27T00:35:29.344Z |
| g17-solaris-gap.test.ts | Caso 3 — Todas as respostas positivas → 0 gaps SOLARIS gerados | PASS | 0ms | 2026-04-27T00:35:29.344Z |
| g17-solaris-gap.test.ts | D2 — Detecção conservadora: 'Não aplicável' dispara gap (comportamento atual documentado) | PASS | 0ms | 2026-04-27T00:35:29.344Z |
| g17-solaris-gap.test.ts | D2 — 'Não' exato e variações disparam gap | PASS | 0ms | 2026-04-27T00:35:29.344Z |
| g17-solaris-gap.test.ts | D6 — Normalização de tópicos: trim + toLowerCase antes do lookup | PASS | 1ms | 2026-04-27T00:35:29.344Z |
| g17-solaris-gap.test.ts | Caso 5 — Idempotência: DELETE source='solaris' antes de INSERT | PASS | 0ms | 2026-04-27T00:35:29.344Z |
| g17-solaris-gap.test.ts | Caso 2 — Projeto V1 sem solaris_answers → retorna { inserted: 0 } sem erro | PASS | 0ms | 2026-04-27T00:35:29.344Z |
| g17-solaris-gap.test.ts | G17 — SOLARIS Gaps Map — cobertura de tópicos | PASS | 12ms | 2026-04-27T00:35:29.344Z |
| g17-solaris-gap.test.ts | Todos os tópicos do mapa têm campos obrigatórios preenchidos | PASS | 9ms | 2026-04-27T00:35:29.344Z |
| g17-solaris-gap.test.ts | Mapa tem pelo menos 6 tópicos mapeados (SOL-001..SOL-012 cobertura mínima) | PASS | 0ms | 2026-04-27T00:35:29.344Z |
| g17-solaris-gap.test.ts | Enums de area são válidos (contabilidade_fiscal \| juridico \| ti \| governanca \| operacional) | PASS | 2ms | 2026-04-27T00:35:29.344Z |
| g17-solaris-gap.test.ts | G17 — analyzeSolarisAnswers — módulo lib | PASS | 47ms | 2026-04-27T00:35:29.344Z |
| g17-solaris-gap.test.ts | Módulo server/lib/solaris-gap-analyzer.ts exporta analyzeSolarisAnswers | PASS | 47ms | 2026-04-27T00:35:29.344Z |
| g17-solaris-gap.test.ts | analyzeSolarisAnswers retorna Promise<{ inserted: number }> | PASS | 0ms | 2026-04-27T00:35:29.344Z |
| action-plans.test.ts | should return null when no corporate plan exists | PASS | 52ms | 2026-04-27T00:35:29.531Z |
| llm-timeout.test.ts | DEFAULT_LLM_TIMEOUT_MS | PASS | 3ms | 2026-04-27T00:35:29.539Z |
| llm-timeout.test.ts | deve ser 180000ms (3 minutos) | PASS | 2ms | 2026-04-27T00:35:29.539Z |
| llm-timeout.test.ts | deve ser maior que 60 segundos | PASS | 0ms | 2026-04-27T00:35:29.539Z |
| llm-timeout.test.ts | deve lançar LLM_TIMEOUT quando o fetch demora mais que timeoutMs | PASS | 53ms | 2026-04-27T00:35:29.591Z |
| llm-timeout.test.ts | deve incluir o tempo em minutos na mensagem de erro quando >= 60s | PASS | 51ms | 2026-04-27T00:35:29.644Z |
| llm-timeout.test.ts | deve formatar label em minutos corretamente para 180s | PASS | 0ms | 2026-04-27T00:35:29.644Z |
| llm-timeout.test.ts | deve formatar label em segundos corretamente para 30s | PASS | 0ms | 2026-04-27T00:35:29.644Z |
| llm-timeout.test.ts | deve completar com sucesso quando o fetch responde antes do timeout | PASS | 1ms | 2026-04-27T00:35:29.644Z |
| llm-timeout.test.ts | deve lançar erro HTTP quando o servidor retorna status não-ok | PASS | 1ms | 2026-04-27T00:35:29.644Z |
| llm-timeout.test.ts | invokeLLM timeout behavior | PASS | 106ms | 2026-04-27T00:35:29.644Z |
| llm-timeout.test.ts | deve propagar o timeoutMs para o invokeLLM | PASS | 81ms | 2026-04-27T00:35:29.718Z |
| llm-timeout.test.ts | generateWithRetry com timeoutMs | PASS | 81ms | 2026-04-27T00:35:29.718Z |
| llm-timeout.test.ts | server/llm-timeout.test.ts | PASS | 190ms | 2026-04-27T00:35:29.718Z |
| branch-plans-flow.test.ts | deve buscar ramos do projeto corretamente | FAIL | 63ms | 2026-04-27T00:35:31.784Z |
| fullFlow.e2e.test.ts | deve criar projeto e avançar até plano de ação validado | FAIL | 3084ms | 2026-04-27T00:35:32.925Z |
| fullFlow.e2e.test.ts | Fluxo Completo E2E - Projeto até Plano de Ação | FAIL | 3087ms | 2026-04-27T00:35:32.925Z |
| fullFlow.e2e.test.ts | server/integration/fullFlow.e2e.test.ts | FAIL | 3087ms | 2026-04-27T00:35:32.925Z |
| z01-qo-nbs.test.ts | server/integration/z01-qo-nbs.test.ts | PASS | 6ms | 2026-04-27T00:35:33.127Z |
| z01-qo-nbs.test.ts | Z-01 Q.Serviços (NBS) | PASS | 6ms | 2026-04-27T00:35:33.127Z |
| z01-qo-nbs.test.ts | Caso 7: NBS 1.01.01.00.00 → TrackedQuestion[] com fonte='rag' | PASS | 2ms | 2026-04-27T00:35:33.127Z |
| z01-qo-nbs.test.ts | Caso 8: empresa de produto → { nao_aplicavel: true } | PASS | 1ms | 2026-04-27T00:35:33.127Z |
| z01-qo-nbs.test.ts | Caso 9: empresa de serviço sem NBS → fallback com alerta | PASS | 1ms | 2026-04-27T00:35:33.127Z |
| z01-qo-nbs.test.ts | Caso 10: extractLeiRef extrai lei_ref do conteúdo do chunk | PASS | 0ms | 2026-04-27T00:35:33.127Z |
| z01-qo-nbs.test.ts | Caso 11: TrackedQuestion[] gerada tem fonte_ref e lei_ref preenchidos | PASS | 1ms | 2026-04-27T00:35:33.127Z |
| solarisAdmin.crud.test.ts | server/solarisAdmin.crud.test.ts | PASS | 8ms | 2026-04-27T00:35:33.313Z |
| solarisAdmin.crud.test.ts | solarisAdmin.listQuestions - T-DEC002-04 | PASS | 6ms | 2026-04-27T00:35:33.313Z |
| solarisAdmin.crud.test.ts | T-DEC002-04a: sem filtros — WHERE padrão inclui ativo = 1 | PASS | 3ms | 2026-04-27T00:35:33.313Z |
| solarisAdmin.crud.test.ts | T-DEC002-04b: filtros combinados — search + categoria + severidade geram WHERE correto | PASS | 1ms | 2026-04-27T00:35:33.313Z |
| solarisAdmin.crud.test.ts | T-DEC002-04c: filtro vigencia='com' — adiciona IS NOT NULL | PASS | 0ms | 2026-04-27T00:35:33.313Z |
| solarisAdmin.crud.test.ts | T-DEC002-04d: filtro ativo=false — mostra inativas | PASS | 0ms | 2026-04-27T00:35:33.313Z |
| solarisAdmin.crud.test.ts | solarisAdmin.deleteQuestions - T-DEC002-05 | PASS | 1ms | 2026-04-27T00:35:33.313Z |
| solarisAdmin.crud.test.ts | T-DEC002-05: soft delete com 3 ids — SQL correto com placeholders | PASS | 0ms | 2026-04-27T00:35:33.313Z |
| solarisAdmin.crud.test.ts | T-DEC002-05b: soft delete com 1 id — placeholder único | PASS | 0ms | 2026-04-27T00:35:33.313Z |
| solarisAdmin.crud.test.ts | solarisAdmin.restoreQuestions - T-DEC002-06 | PASS | 1ms | 2026-04-27T00:35:33.313Z |
| solarisAdmin.crud.test.ts | T-DEC002-06: restore com 2 ids — SQL com ativo = 1 | PASS | 0ms | 2026-04-27T00:35:33.313Z |
| solarisAdmin.crud.test.ts | T-DEC002-06b: restore é inverso de delete — mesmo padrão de placeholders | PASS | 0ms | 2026-04-27T00:35:33.313Z |
| branches.test.ts | deve listar todos os ramos ativos | PASS | 383ms | 2026-04-27T00:35:34.970Z |
| branches.test.ts | deve conter os 8 ramos iniciais do seed | PASS | 59ms | 2026-04-27T00:35:35.029Z |
| branches.test.ts | deve buscar ramo por ID | PASS | 106ms | 2026-04-27T00:35:35.135Z |
| branches.test.ts | deve permitir equipe Solaris criar novo ramo | PASS | 54ms | 2026-04-27T00:35:35.196Z |
| branches.test.ts | não deve permitir cliente criar ramo | PASS | 7ms | 2026-04-27T00:35:35.196Z |
| branches.test.ts | Issue #1 - Cadastro de Ramos de Atividade | PASS | 610ms | 2026-04-27T00:35:35.196Z |
| branches.test.ts | deve gerenciar ramos de um projeto (fluxo completo) | FAIL | 111ms | 2026-04-27T00:35:35.300Z |
| branches.test.ts | Issue #4 - Seleção de Ramos no Projeto | FAIL | 112ms | 2026-04-27T00:35:35.301Z |
| branches.test.ts | Issue #2 - Enum de Áreas Responsáveis | PASS | 1ms | 2026-04-27T00:35:35.301Z |
| branches.test.ts | deve validar áreas responsáveis no schema | PASS | 1ms | 2026-04-27T00:35:35.301Z |
| branches.test.ts | Issue #3 - Enum de Tipo de Tarefa | PASS | 0ms | 2026-04-27T00:35:35.301Z |
| branches.test.ts | deve validar tipos de tarefa no schema | PASS | 0ms | 2026-04-27T00:35:35.301Z |
| branches.test.ts | Branches Router - CAMADA 1 | FAIL | 723ms | 2026-04-27T00:35:35.301Z |
| branches.test.ts | server/integration/branches.test.ts | FAIL | 723ms | 2026-04-27T00:35:35.301Z |
| risk-engine-v4.afericao.test.ts | server/lib/risk-engine-v4.afericao.test.ts | FAIL | 16ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | afericao — 10 categorias na SEVERITY_TABLE (RN-RISK-02) | FAIL | 11ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | possui exatamente 10 categorias | FAIL | 9ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | todas as 10 categorias oficiais estão presentes | PASS | 1ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | NÃO contém tributacao_servicos (órfã no RN doc — DEC-02) | PASS | 1ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | inscricao_cadastral é alta (não media — D3) | PASS | 0ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | aliquota_zero/reduzida/credito_presumido são oportunidade | PASS | 0ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | afericao — SOURCE_RANK invariante (RN-RISK-09) | PASS | 1ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | cnae=1, ncm=2, nbs=3, solaris=4, iagen=5 | PASS | 0ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | sortBySourceRank ordena cnae antes de iagen | PASS | 0ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | afericao — breadcrumb de 4 nós (RN-RISK — snapshot §13.3) | PASS | 1ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | buildBreadcrumb retorna exatamente 4 nós: [fonte, categoria, artigo, ruleId] | PASS | 0ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | afericao — classifyRisk determinístico (RN-RISK-02) | PASS | 1ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | mesmo gap → mesmo risco (determinismo) | PASS | 1ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | split_payment → severity alta + imediata | PASS | 0ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | categoria desconhecida usa fallback media/curto_prazo | PASS | 0ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | afericao — computeRiskMatrix ordenação por severidade | PASS | 0ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | alta vem antes de media, que vem antes de oportunidade | PASS | 0ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | afericao — buildRiskKey (DEC-05: 1 risco por categoria) | PASS | 1ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | categoria + operacional → chave determinística | PASS | 0ms | 2026-04-27T00:35:35.708Z |
| risk-engine-v4.afericao.test.ts | multiestadual muda a chave | PASS | 0ms | 2026-04-27T00:35:35.708Z |
| branch-plans-flow.test.ts | deve gerar plano por ramo via IA | PASS | 4593ms | 2026-04-27T00:35:36.376Z |
| riskMatrix.versions.test.ts | deve salvar versão da matriz de riscos | FAIL | 557ms | 2026-04-27T00:35:36.705Z |
| riskMatrix.versions.test.ts | deve listar versões ordenadas por número decrescente | FAIL | 220ms | 2026-04-27T00:35:36.925Z |
| riskMatrix.versions.test.ts | deve recuperar versão específica | FAIL | 217ms | 2026-04-27T00:35:37.141Z |
| riskMatrix.versions.test.ts | deve retornar null para versão inexistente | PASS | 216ms | 2026-04-27T00:35:37.358Z |
| riskMatrix.versions.test.ts | deve obter último número de versão | FAIL | 271ms | 2026-04-27T00:35:37.630Z |
| riskMatrix.versions.test.ts | deve armazenar snapshot como JSON válido | FAIL | 219ms | 2026-04-27T00:35:37.849Z |
| action-plans.test.ts | should generate corporate action plan via AI | PASS | 8426ms | 2026-04-27T00:35:37.958Z |
| action-plans.test.ts | should retrieve generated corporate plan with tasks | PASS | 52ms | 2026-04-27T00:35:38.009Z |
| riskMatrix.versions.test.ts | deve armazenar metadados corretos (createdBy, triggerType) | FAIL | 214ms | 2026-04-27T00:35:38.053Z |
| riskMatrix.versions.test.ts | Risk Matrix Versions - Database Functions | FAIL | 1915ms | 2026-04-27T00:35:38.053Z |
| riskMatrix.versions.test.ts | server/integration/riskMatrix.versions.test.ts | FAIL | 1915ms | 2026-04-27T00:35:38.053Z |
| audit-rf507-project-members.test.ts | server/audit-rf507-project-members.test.ts | PASS | 16ms | 2026-04-27T00:35:38.255Z |
| audit-rf507-project-members.test.ts | RF-5.07 — clientMembers.listByProject | PASS | 16ms | 2026-04-27T00:35:38.255Z |
| audit-rf507-project-members.test.ts | deve retornar apenas membros ativos do cliente vinculado ao projeto | PASS | 10ms | 2026-04-27T00:35:38.255Z |
| audit-rf507-project-members.test.ts | deve retornar membros ordenados por nome (A-Z) | PASS | 1ms | 2026-04-27T00:35:38.255Z |
| audit-rf507-project-members.test.ts | deve retornar apenas os campos necessários (id, name, email, memberRole) | PASS | 1ms | 2026-04-27T00:35:38.255Z |
| audit-rf507-project-members.test.ts | deve buscar membros usando o clientId do projeto (não do usuário logado) | PASS | 1ms | 2026-04-27T00:35:38.255Z |
| audit-rf507-project-members.test.ts | deve lançar NOT_FOUND se o projeto não existir | PASS | 1ms | 2026-04-27T00:35:38.255Z |
| audit-rf507-project-members.test.ts | deve retornar lista vazia se o cliente não tiver membros ativos | PASS | 0ms | 2026-04-27T00:35:38.255Z |
| audit-rf507-project-members.test.ts | deve retornar lista vazia se o cliente não tiver nenhum membro cadastrado | PASS | 0ms | 2026-04-27T00:35:38.255Z |
| audit-rf507-project-members.test.ts | deve incluir o papel (memberRole) de cada membro no retorno | PASS | 0ms | 2026-04-27T00:35:38.255Z |
| exposicao-risco-thresholds.test.ts | client/src/lib/exposicao-risco-thresholds.test.ts | PASS | 9ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | classifyExposicao — thresholds 0-30/31-55/56-75/76-100 | PASS | 4ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | baixa: 0 até 30 inclusive | PASS | 1ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | moderada: 31 até 55 | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | alta: 56 até 75 | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | crítica: 76 até 100 | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | clampa acima de 100 em 100 e retorna crítica | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | clampa abaixo de 0 em 0 e retorna baixa | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | arredonda antes de classificar | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | NaN/Infinity retornam baixa (fallback seguro) | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | getExposicaoConfig | PASS | 1ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | retorna null para input inválido | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | retorna config com 4 campos obrigatórios | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | EXPOSICAO_CONFIG — sanidade estrutural | PASS | 1ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | tem todas as 4 faixas | PASS | 1ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | ranges cobrem 0-100 sem gap ou overlap | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | cores distintas entre faixas | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | getMetaInfo — distância até meta (anti-reflexo) | PASS | 1ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | META_EXPOSICAO = 30 | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | score <= 30 indica meta atingida (distancia=0) | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | score=30 (limite) também considera meta atingida | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | score=66 (alta) distância = 66-55 = 11 pontos para sair da faixa | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | score=45 (moderada) distância = 45-30 = 15 pontos para meta | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | score=85 (crítica) distância = 85-75 = 10 pontos para sair da faixa | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | clampa valores inválidos | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | arredonda antes de calcular | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | EXPOSICAO_TEXTOS — fonte única de verdade para copy | PASS | 1ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | título canônico | PASS | 0ms | 2026-04-27T00:35:38.448Z |
| exposicao-risco-thresholds.test.ts | subtítulo usa 'indicador' (não 'score' — evita ambiguidade) | PASS | 0ms | 2026-04-27T00:35:38.449Z |
| exposicao-risco-thresholds.test.ts | nota pedagógica menciona faixa 56-75 explicitamente | PASS | 0ms | 2026-04-27T00:35:38.449Z |
| exposicao-risco-thresholds.test.ts | alerta sinaliza MENOR = MELHOR | PASS | 0ms | 2026-04-27T00:35:38.449Z |
| exposicao-risco-thresholds.test.ts | frase final consolida | PASS | 0ms | 2026-04-27T00:35:38.449Z |
| projeto-detalhes-v2.test.ts | server/projeto-detalhes-v2.test.ts | PASS | 7ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | ProjetoDetalhesV2 — statusToStep | PASS | 4ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | rascunho → step 1 | PASS | 1ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | assessment_fase1 → step 2 | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | assessment_fase2 → step 2 | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | matriz_riscos → step 3 | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | plano_acao → step 4 | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | em_avaliacao → step 4 | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | aprovado → step 5 | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | em_andamento → step 5 | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | concluido → step 5 | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | status desconhecido → step 1 | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | ProjetoDetalhesV2 — STATUS_LABELS | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | aprovado tem label correto | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | em_andamento tem label correto | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | parado tem label Pausado | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | ProjetoDetalhesV2 — computeProgressPct | PASS | 1ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | 0 tarefas → 0% | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | 5 de 10 → 50% | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | 3 de 7 → 43% | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | 10 de 10 → 100% | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | ProjetoDetalhesV2 — computeTasksByArea | PASS | 2ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | null → zeros | PASS | 1ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | conta tarefas ativas e excluídas corretamente | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | área sem tarefas ativas não aparece na lista | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | ProjetoDetalhesV2 — computeRisks | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | null → 0 | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | soma riscos de todas as áreas | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| projeto-detalhes-v2.test.ts | objeto vazio → 0 | PASS | 0ms | 2026-04-27T00:35:38.642Z |
| briefing-sanitizer.test.ts | server/lib/briefing-sanitizer.test.ts | PASS | 10ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | briefing-sanitizer | PASS | 10ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | cenário real do incidente UAT 2026-04-21 | PASS | 4ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | bloqueia NCMs citados quando usuário não cadastrou nenhum | PASS | 3ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | códigos autorizados (cadastrados em meta.ncms) | PASS | 1ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | permite NCM cadastrado sem disclaimer | PASS | 0ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | normaliza NCM com ponto (1006.10) vs sem ponto (1006) | PASS | 0ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | caso misto — 1006 autorizado mas 0713 não | PASS | 0ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | repetições do mesmo código | PASS | 1ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | disclaimer completo só na primeira ocorrência | PASS | 1ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | NBS (serviços) | PASS | 1ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | bloqueia NBS não cadastrado | PASS | 0ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | permite NBS cadastrado | PASS | 0ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | feature flag | PASS | 1ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | BRIEFING_SANITIZER_ENABLED=false → no-op | PASS | 0ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | default (sem env var) → sanitizer ativo | PASS | 1ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | edge cases | PASS | 1ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | markdown sem NCM/NBS → sem mudanças | PASS | 0ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | meta undefined → comporta como vazio | PASS | 0ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | caixa variada (ncm, Ncm, NCM) → todos capturados | PASS | 0ms | 2026-04-27T00:35:38.834Z |
| briefing-sanitizer.test.ts | é determinístico — mesma entrada → mesma saída | PASS | 0ms | 2026-04-27T00:35:38.834Z |
| retrocesso-endpoint.test.ts | retrocesso de etapa 5 para etapa 2 — requer limpeza (V3) | PASS | 1133ms | 2026-04-27T00:35:40.186Z |
| retrocesso-endpoint.test.ts | retrocesso de etapa 3 para etapa 1 — requer limpeza (V3) | PASS | 1ms | 2026-04-27T00:35:40.186Z |
| retrocesso-endpoint.test.ts | avanço de etapa 2 para etapa 3 — não requer limpeza | PASS | 1ms | 2026-04-27T00:35:40.186Z |
| retrocesso-endpoint.test.ts | mesma etapa — não requer limpeza | PASS | 1ms | 2026-04-27T00:35:40.186Z |
| retrocesso-endpoint.test.ts | projeto não encontrado — lança NOT_FOUND | PASS | 2ms | 2026-04-27T00:35:40.186Z |
| retrocesso-endpoint.test.ts | projeto V1 — retrocesso de etapa 9 para etapa 5 inclui briefingContent | PASS | 1ms | 2026-04-27T00:35:40.186Z |
| retrocesso-endpoint.test.ts | projeto sem dados (flowVersion=none) — não requer limpeza | PASS | 1ms | 2026-04-27T00:35:40.186Z |
| retrocesso-endpoint.test.ts | retrocesso.check — endpoint tRPC | PASS | 1141ms | 2026-04-27T00:35:40.186Z |
| retrocesso-endpoint.test.ts | server/retrocesso-endpoint.test.ts | PASS | 1141ms | 2026-04-27T00:35:40.186Z |
| bug-resp-01.test.ts | server/integration/bug-resp-01.test.ts | PASS | 7ms | 2026-04-27T00:35:40.389Z |
| bug-resp-01.test.ts | R01-01: Projeto V3+ prioriza colunas TO-BE | PASS | 2ms | 2026-04-27T00:35:40.389Z |
| bug-resp-01.test.ts | deve retornar productAnswers e serviceAnswers quando ambas existem | PASS | 2ms | 2026-04-27T00:35:40.389Z |
| bug-resp-01.test.ts | R01-02: Projeto V1/V2 faz fallback para colunas legadas | PASS | 1ms | 2026-04-27T00:35:40.389Z |
| bug-resp-01.test.ts | deve usar corporateAnswers quando productAnswers é null | PASS | 0ms | 2026-04-27T00:35:40.389Z |
| bug-resp-01.test.ts | deve retornar null quando não há nenhuma coluna preenchida | PASS | 0ms | 2026-04-27T00:35:40.389Z |
| bug-resp-01.test.ts | R01-03: buildProductServiceLayers com formato Z-02 (TrackedAnswer[]) | PASS | 2ms | 2026-04-27T00:35:40.389Z |
| bug-resp-01.test.ts | deve criar camada NCM_PRODUTO com perguntas do TrackedAnswer[] | PASS | 1ms | 2026-04-27T00:35:40.389Z |
| bug-resp-01.test.ts | deve criar camada NBS_SERVICO com perguntas do TrackedAnswer[] | PASS | 0ms | 2026-04-27T00:35:40.389Z |
| bug-resp-01.test.ts | deve criar 2 camadas quando ambas têm respostas | PASS | 0ms | 2026-04-27T00:35:40.389Z |
| bug-resp-01.test.ts | R01-04: buildProductServiceLayers com formato legado (objeto com perguntas) | PASS | 1ms | 2026-04-27T00:35:40.389Z |
| bug-resp-01.test.ts | deve processar formato legado com campo perguntas[] | PASS | 0ms | 2026-04-27T00:35:40.389Z |
| bug-resp-01.test.ts | R01-05: Projeto sem respostas retorna array vazio | PASS | 1ms | 2026-04-27T00:35:40.389Z |
| bug-resp-01.test.ts | deve retornar array vazio quando productAnswers e serviceAnswers são null | PASS | 0ms | 2026-04-27T00:35:40.389Z |
| bug-resp-01.test.ts | deve retornar array vazio quando arrays estão vazios | PASS | 1ms | 2026-04-27T00:35:40.389Z |
| bug-resp-01.test.ts | deve parsear string JSON corretamente | PASS | 0ms | 2026-04-27T00:35:40.389Z |
| z02-gate-b-edge-cases.test.ts | server/z02-gate-b-edge-cases.test.ts | PASS | 4ms | 2026-04-27T00:35:40.579Z |
| z02-gate-b-edge-cases.test.ts | Gate B — Cenário 1: confirmedCnaes = null | PASS | 2ms | 2026-04-27T00:35:40.579Z |
| z02-gate-b-edge-cases.test.ts | deve bloquear transição para diagnostico_corporativo quando confirmedCnaes é null | PASS | 2ms | 2026-04-27T00:35:40.579Z |
| z02-gate-b-edge-cases.test.ts | deve bloquear transição para diagnostico_corporativo quando confirmedCnaes é undefined | PASS | 0ms | 2026-04-27T00:35:40.579Z |
| z02-gate-b-edge-cases.test.ts | Gate B — Cenário 2: confirmedCnaes = [] (array vazio) | PASS | 0ms | 2026-04-27T00:35:40.579Z |
| z02-gate-b-edge-cases.test.ts | deve bloquear transição quando confirmedCnaes é array vazio | PASS | 0ms | 2026-04-27T00:35:40.579Z |
| z02-gate-b-edge-cases.test.ts | Gate B — Cenário 3: confirmedCnaes com 1 CNAE válido | PASS | 0ms | 2026-04-27T00:35:40.579Z |
| z02-gate-b-edge-cases.test.ts | deve permitir transição quando há pelo menos 1 CNAE confirmado | PASS | 0ms | 2026-04-27T00:35:40.579Z |
| z02-gate-b-edge-cases.test.ts | Gate B — Cenário 4: confirmedCnaes com múltiplos CNAEs | PASS | 1ms | 2026-04-27T00:35:40.579Z |
| z02-gate-b-edge-cases.test.ts | deve permitir transição com 5 CNAEs confirmados | PASS | 0ms | 2026-04-27T00:35:40.579Z |
| z02-gate-b-edge-cases.test.ts | deve retornar newStepName = diagnostico_corporativo quando permitido | PASS | 0ms | 2026-04-27T00:35:40.579Z |
| z02-gate-b-edge-cases.test.ts | Gate B — Cenário 5: projeto em rascunho tenta pular para diagnostico_corporativo | PASS | 0ms | 2026-04-27T00:35:40.579Z |
| z02-gate-b-edge-cases.test.ts | deve bloquear transição direta de rascunho para diagnostico_corporativo | PASS | 0ms | 2026-04-27T00:35:40.579Z |
| z02-gate-b-edge-cases.test.ts | deve bloquear transição de cnaes_confirmados para diagnostico_corporativo sem CNAEs | PASS | 0ms | 2026-04-27T00:35:40.579Z |
| briefing-areas.test.ts | client/src/lib/briefing-areas.test.ts | PASS | 11ms | 2026-04-27T00:35:40.781Z |
| briefing-areas.test.ts | classifyItemByArea | PASS | 7ms | 2026-04-27T00:35:40.781Z |
| briefing-areas.test.ts | classifica fiscal por IBS/CBS/alíquota | PASS | 3ms | 2026-04-27T00:35:40.781Z |
| briefing-areas.test.ts | classifica TI por ERP/Sped/NFe | PASS | 0ms | 2026-04-27T00:35:40.781Z |
| briefing-areas.test.ts | classifica contabilidade por escrituração/fato gerador | PASS | 0ms | 2026-04-27T00:35:40.781Z |
| briefing-areas.test.ts | classifica legal por parecer/LC/Art. | PASS | 1ms | 2026-04-27T00:35:40.781Z |
| briefing-areas.test.ts | classifica gestão por fluxo de caixa/estratégia | PASS | 1ms | 2026-04-27T00:35:40.781Z |
| briefing-areas.test.ts | cai em genérico quando nenhuma keyword bate | PASS | 1ms | 2026-04-27T00:35:40.781Z |
| briefing-areas.test.ts | groupBriefingByArea | PASS | 3ms | 2026-04-27T00:35:40.781Z |
| briefing-areas.test.ts | agrupa gaps por área | PASS | 1ms | 2026-04-27T00:35:40.781Z |
| briefing-areas.test.ts | agrupa recomendações por área | PASS | 1ms | 2026-04-27T00:35:40.781Z |
| briefing-areas.test.ts | retorna buckets vazios quando structured é null | PASS | 0ms | 2026-04-27T00:35:40.781Z |
| briefing-areas.test.ts | formatWhatsAppSummary | PASS | 2ms | 2026-04-27T00:35:40.781Z |
| briefing-areas.test.ts | inclui risco no cabeçalho | PASS | 1ms | 2026-04-27T00:35:40.781Z |
| briefing-areas.test.ts | inclui resumo executivo só na área Genérica | PASS | 0ms | 2026-04-27T00:35:40.781Z |
| briefing-areas.test.ts | marca área vazia com mensagem explícita (exceto genérico) | PASS | 0ms | 2026-04-27T00:35:40.781Z |
| briefing-areas.test.ts | usa asteriscos para negrito (compatível WhatsApp) | PASS | 0ms | 2026-04-27T00:35:40.781Z |
| briefing-adr0018-validation.test.ts | ADR0018-E2E-01: briefing menciona Imposto Seletivo, Art. 2, alíquota zero e Art. 14 | PASS | 13756ms | 2026-04-27T00:35:41.258Z |
| briefing-adr0018-validation.test.ts | ADR-0018 — Validação E2E com LLM Real | PASS | 13757ms | 2026-04-27T00:35:41.258Z |
| briefing-adr0018-validation.test.ts | server/integration/briefing-adr0018-validation.test.ts | PASS | 15141ms | 2026-04-27T00:35:41.650Z |
| branch-plans-complete-flow.test.ts | server/integration/branch-plans-complete-flow.test.ts | FAIL | 5ms | 2026-04-27T00:35:42.068Z |
| branch-plans-complete-flow.test.ts | Fluxo Completo: Questionários + Planos por Ramo | FAIL | 4ms | 2026-04-27T00:35:42.068Z |
| branch-assessment-generate.test.ts | server/integration/branch-assessment-generate.test.ts | FAIL | 5ms | 2026-04-27T00:35:43.351Z |
| branch-assessment-generate.test.ts | branchAssessment.generate | FAIL | 5ms | 2026-04-27T00:35:43.351Z |
| k4e-status-log.test.ts | Caso 2 — criação de projeto registra from_status: null e to_status: 'rascunho' | PASS | 52ms | 2026-04-27T00:35:43.421Z |
| k4e-status-log.test.ts | Caso 1 — transição válida registra from_status, to_status e changed_by corretos | PASS | 267ms | 2026-04-27T00:35:43.687Z |
| k4e-status-log.test.ts | Caso 3 — falha no insertStatusLog não propaga e a função retorna void | PASS | 54ms | 2026-04-27T00:35:43.741Z |
| briefing-confidence-signals.test.ts | server/lib/briefing-confidence-signals.test.ts | PASS | 7ms | 2026-04-27T00:35:43.798Z |
| briefing-confidence-signals.test.ts | computePerfilCompleteness — replica calcProfileScore do frontend | PASS | 5ms | 2026-04-27T00:35:43.798Z |
| briefing-confidence-signals.test.ts | 7 obrigatórios + 12 opcionais | PASS | 2ms | 2026-04-27T00:35:43.798Z |
| briefing-confidence-signals.test.ts | perfil vazio → 0% | PASS | 1ms | 2026-04-27T00:35:43.798Z |
| briefing-confidence-signals.test.ts | só obrigatórios completos → 70% | PASS | 0ms | 2026-04-27T00:35:43.798Z |
| briefing-confidence-signals.test.ts | perfil 100% (todos obrigatórios + todos opcionais) → 100% | PASS | 0ms | 2026-04-27T00:35:43.798Z |
| briefing-confidence-signals.test.ts | multiState=false ainda conta como preenchido (boolean presente) | PASS | 0ms | 2026-04-27T00:35:43.798Z |
| briefing-confidence-signals.test.ts | arrays vazios (clientType/paymentMethods) NÃO contam | PASS | 0ms | 2026-04-27T00:35:43.798Z |
| briefing-confidence-signals.test.ts | cenário real do PDF Jose Combustível (perfil 100%) | PASS | 0ms | 2026-04-27T00:35:43.798Z |
| briefing-confidence-signals.test.ts | countQ3CnaeAnswers | PASS | 1ms | 2026-04-27T00:35:43.798Z |
| briefing-confidence-signals.test.ts | array vazio → 0 | PASS | 0ms | 2026-04-27T00:35:43.798Z |
| briefing-confidence-signals.test.ts | string JSON é parseada | PASS | 0ms | 2026-04-27T00:35:43.798Z |
| briefing-confidence-signals.test.ts | exclui CORPORATIVO e OPERACIONAL (legado) | PASS | 0ms | 2026-04-27T00:35:43.798Z |
| k4e-status-log.test.ts | K-4-E — project_status_log: auditoria jurídica de transições | PASS | 878ms | 2026-04-27T00:35:43.839Z |
| k4e-status-log.test.ts | server/integration/k4e-status-log.test.ts | PASS | 878ms | 2026-04-27T00:35:43.839Z |
| m1-feature-flag.test.ts | server/m1-feature-flag.test.ts | PASS | 6ms | 2026-04-27T00:35:43.985Z |
| m1-feature-flag.test.ts | isM1ArchetypeEnabled — Política de rollout controlado M1 | PASS | 5ms | 2026-04-27T00:35:43.985Z |
| m1-feature-flag.test.ts | R1: cliente NÃO tem acesso quando flag global = false | PASS | 1ms | 2026-04-27T00:35:43.985Z |
| m1-feature-flag.test.ts | R1: advogado_junior NÃO tem acesso quando flag global = false | PASS | 0ms | 2026-04-27T00:35:43.985Z |
| m1-feature-flag.test.ts | R2: equipe_solaris TEM acesso independente da flag global | PASS | 0ms | 2026-04-27T00:35:43.985Z |
| m1-feature-flag.test.ts | R3: advogado_senior TEM acesso independente da flag global | PASS | 0ms | 2026-04-27T00:35:43.985Z |
| m1-feature-flag.test.ts | R4: E2E_TEST_MODE=true habilita para qualquer role | PASS | 0ms | 2026-04-27T00:35:43.985Z |
| m1-feature-flag.test.ts | R4: E2E_TEST_MODE=false NÃO habilita para clientes | PASS | 0ms | 2026-04-27T00:35:43.985Z |
| m1-feature-flag.test.ts | R5: projeto em whitelist TEM acesso para qualquer role | PASS | 0ms | 2026-04-27T00:35:43.985Z |
| m1-feature-flag.test.ts | R5: projeto fora da whitelist NÃO tem acesso para cliente | PASS | 0ms | 2026-04-27T00:35:43.985Z |
| m1-feature-flag.test.ts | R5: whitelist vazia não habilita nenhum projeto | PASS | 0ms | 2026-04-27T00:35:43.985Z |
| m1-feature-flag.test.ts | R5: whitelist com espaços é parseada corretamente | PASS | 0ms | 2026-04-27T00:35:43.985Z |
| m1-feature-flag.test.ts | R6: flag global true habilita para todos | PASS | 0ms | 2026-04-27T00:35:43.985Z |
| m1-feature-flag.test.ts | INV: a função não recebe score como parâmetro (score não interfere no gate) | PASS | 0ms | 2026-04-27T00:35:43.985Z |
| solarisAdmin.upload.test.ts | server/solarisAdmin.upload.test.ts | PASS | 9ms | 2026-04-27T00:35:44.097Z |
| solarisAdmin.upload.test.ts | solarisAdmin.uploadCsv - DEC-002 | PASS | 8ms | 2026-04-27T00:35:44.097Z |
| solarisAdmin.upload.test.ts | T-DEC002-01: CSV valido em dry-run - 2 linhas validas, 0 erros | PASS | 5ms | 2026-04-27T00:35:44.097Z |
| solarisAdmin.upload.test.ts | T-DEC002-02: CSV com linha invalida - retorna line e message | PASS | 2ms | 2026-04-27T00:35:44.097Z |
| solarisAdmin.upload.test.ts | T-DEC002-03: Mapeamento correto - conteudo->texto, artigo->codigo, area->categoria | PASS | 1ms | 2026-04-27T00:35:44.097Z |
| consolidate-gaps.test.ts | server/lib/consolidate-gaps.test.ts | PASS | 11ms | 2026-04-27T00:35:44.171Z |
| consolidate-gaps.test.ts | normalizeEvidenciaKey | PASS | 5ms | 2026-04-27T00:35:44.171Z |
| consolidate-gaps.test.ts | extrai Art. N sem parágrafo | PASS | 2ms | 2026-04-27T00:35:44.171Z |
| consolidate-gaps.test.ts | extrai Art. N §M com normalização | PASS | 0ms | 2026-04-27T00:35:44.171Z |
| consolidate-gaps.test.ts | distingue parágrafos diferentes do mesmo artigo | PASS | 1ms | 2026-04-27T00:35:44.171Z |
| consolidate-gaps.test.ts | retorna vazio para input vazio/null | PASS | 1ms | 2026-04-27T00:35:44.171Z |
| consolidate-gaps.test.ts | consolidateGapsByArticle | PASS | 6ms | 2026-04-27T00:35:44.171Z |
| consolidate-gaps.test.ts | passa direto quando há 0 ou 1 gap | PASS | 1ms | 2026-04-27T00:35:44.171Z |
| consolidate-gaps.test.ts | não consolida gaps com artigos diferentes | PASS | 1ms | 2026-04-27T00:35:44.171Z |
| consolidate-gaps.test.ts | consolida 3 gaps com mesmo Art. 21 §1º em 1 gap | PASS | 1ms | 2026-04-27T00:35:44.171Z |
| consolidate-gaps.test.ts | preserva ordem de aparição | PASS | 1ms | 2026-04-27T00:35:44.171Z |
| consolidate-gaps.test.ts | não consolida quando parágrafos diferem | PASS | 1ms | 2026-04-27T00:35:44.171Z |
| consolidate-gaps.test.ts | gaps sem evidencia_regulatoria nunca são consolidados entre si | PASS | 0ms | 2026-04-27T00:35:44.171Z |
| consolidate-gaps.test.ts | prefere urgência imediata como primary no merge | PASS | 0ms | 2026-04-27T00:35:44.171Z |
| pr375-div-z01-004-005.test.ts | server/pr375-div-z01-004-005.test.ts | PASS | 8ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | DIV-Z01-004 — assertValidTransition lança TRPCError | PASS | 4ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | Caso 4: TRPCError lançado em transição inválida | PASS | 2ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | Status desconhecido lança TRPCError com FORBIDDEN | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | Transição válida NÃO lança erro | PASS | 1ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | Mensagem de erro inclui transições permitidas | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | DIV-Z01-005 — categoria transicao (Arts. 25–30 LC 214/2025) | PASS | 2ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | Caso novo 1: lei_ref='Art. 25 LC 214/2025' → transicao | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | Caso novo 2: lei_ref='Art. 28 LC 214/2025' → transicao | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | Caso novo 3: descricao='período de transição 2026-2032' → transicao | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | Art. 26 → transicao | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | Art. 30 → transicao | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | Descrição com 'fase de transição' → transicao | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | Art. 2 (IS) não é confundido com Art. 25 (transicao) | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | Imposto seletivo não é confundido com transicao | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | Regressão — 10 categorias canônicas aprovadas | PASS | 2ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | "imposto seletivo sobre tabaco" → imposto_seletivo | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | "medicamento com alíquota reduzida" → regime_diferenciado | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | "produto isento de tributação" → aliquota_zero | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | "alíquota reduzida de 50%" → aliquota_reduzida | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | "split payment automático" → split_payment | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | "apuração de IBS e CBS" → ibs_cbs | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | "inscrição no cadastro fiscal" → cadastro_fiscal | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | "entrega de NF-e e SPED" → obrigacao_acessoria | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | "período de transição 2026-2032" → transicao | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| pr375-div-z01-004-005.test.ts | "risco genérico sem categoria" → enquadramento_geral | PASS | 0ms | 2026-04-27T00:35:44.288Z |
| baseline-update-v34.test.ts | server/baseline-update-v34.test.ts | PASS | 20ms | 2026-04-27T00:35:44.379Z |
| baseline-update-v34.test.ts | Atualização da Baseline - Sprint V34 | PASS | 20ms | 2026-04-27T00:35:44.379Z |
| baseline-update-v34.test.ts | Deve ter versão 1.1 no cabeçalho | PASS | 6ms | 2026-04-27T00:35:44.379Z |
| baseline-update-v34.test.ts | Deve ter data 02/02/2026 no cabeçalho | PASS | 1ms | 2026-04-27T00:35:44.379Z |
| baseline-update-v34.test.ts | Deve ter checkpoint 3fc6120e no cabeçalho | PASS | 1ms | 2026-04-27T00:35:44.379Z |
| baseline-update-v34.test.ts | Deve ter 34 sprints concluídos nas métricas | PASS | 1ms | 2026-04-27T00:35:44.379Z |
| baseline-update-v34.test.ts | Deve ter 62 issues resolvidas nas métricas | PASS | 1ms | 2026-04-27T00:35:44.379Z |
| baseline-update-v34.test.ts | Deve ter 35+ checkpoints nas métricas | PASS | 1ms | 2026-04-27T00:35:44.379Z |
| baseline-update-v34.test.ts | Deve ter Sprint V34 documentado em erros conhecidos | PASS | 1ms | 2026-04-27T00:35:44.379Z |
| baseline-update-v34.test.ts | Deve ter referência a docs/funcionalidade-planos-por-ramo.md | PASS | 1ms | 2026-04-27T00:35:44.379Z |
| baseline-update-v34.test.ts | Deve ter rodapé atualizado com versão 1.1 | PASS | 2ms | 2026-04-27T00:35:44.379Z |
| baseline-update-v34.test.ts | Deve ter backlog atualizado para V1-V34 | PASS | 1ms | 2026-04-27T00:35:44.379Z |
| baseline-update-v34.test.ts | Deve ter Sprint V34 completo em erros-conhecidos.md | PASS | 3ms | 2026-04-27T00:35:44.379Z |
| baseline-update-v34.test.ts | Deve ter 5/5 testes passaram em erros-conhecidos.md | PASS | 0ms | 2026-04-27T00:35:44.379Z |
| baseline-update-v34.test.ts | Deve ter issue #62 referenciada em erros-conhecidos.md | PASS | 0ms | 2026-04-27T00:35:44.379Z |
| detect-export-signal.test.ts | server/lib/detect-export-signal.test.ts | PASS | 17ms | 2026-04-27T00:35:44.491Z |
| detect-export-signal.test.ts | detectExportSignal — países | PASS | 11ms | 2026-04-27T00:35:44.491Z |
| detect-export-signal.test.ts | detecta Bolívia mesmo lowercase/sem acento | PASS | 6ms | 2026-04-27T00:35:44.491Z |
| detect-export-signal.test.ts | detecta Bolívia com acento | PASS | 3ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | detecta EUA / USA / Estados Unidos | PASS | 1ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | detecta Argentina com pontuação | PASS | 0ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | NÃO detecta Brasil (país-base) | PASS | 0ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | NÃO detecta 'bolivia' dentro de palavra maior | PASS | 0ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | detectExportSignal — termos | PASS | 2ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | detecta 'exportação' | PASS | 0ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | detecta 'exportamos' | PASS | 0ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | detecta 'mercado externo' | PASS | 0ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | detecta 'comércio exterior' com e sem acento | PASS | 0ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | detecta 'cross-border' e 'cross border' | PASS | 0ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | detecta 'importação' também (relevante para créditos) | PASS | 0ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | detectExportSignal — sufixo jurídico | PASS | 2ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | gera sufixo vazio quando não detecta | PASS | 0ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | gera sufixo com Art. 8 quando detecta termo | PASS | 0ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | gera sufixo com 'transfronteiriça' quando detecta país | PASS | 0ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | combina country + term sem duplicar | PASS | 0ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | detectExportSignal — input | PASS | 1ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | aceita array com nulls/undefined sem quebrar | PASS | 0ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | retorna detected=false para array vazio | PASS | 0ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | retorna detected=false para strings vazias | PASS | 0ms | 2026-04-27T00:35:44.492Z |
| detect-export-signal.test.ts | concatena múltiplos textos (description + correction + complement) | PASS | 0ms | 2026-04-27T00:35:44.492Z |
| z12-migration-0072.test.ts | Coluna risk_category_code existe na tabela | PASS | 434ms | 2026-04-27T00:35:45.115Z |
| z12-migration-0072.test.ts | FK fk_req_v3_risk_category existe e aponta para risk_categories | PASS | 343ms | 2026-04-27T00:35:45.459Z |
| action-plans.test.ts | should regenerate corporate plan and update existing | PASS | 8110ms | 2026-04-27T00:35:46.120Z |
| action-plans.test.ts | Corporate Action Plans | PASS | 16641ms | 2026-04-27T00:35:46.120Z |
| z12-migration-0072.test.ts | Todos os 138 requisitos têm risk_category_code preenchido (0 NULLs) | PASS | 686ms | 2026-04-27T00:35:46.144Z |
| action-plans.test.ts | should return empty list when no branch plans exist | PASS | 54ms | 2026-04-27T00:35:46.174Z |
| branch-plans-flow.test.ts | deve listar todos os planos por ramo do projeto | PASS | 10522ms | 2026-04-27T00:35:46.898Z |
| branch-plans-flow.test.ts | deve buscar plano específico de um ramo | PASS | 54ms | 2026-04-27T00:35:46.952Z |
| branch-plans-flow.test.ts | deve validar estrutura das tarefas geradas | PASS | 54ms | 2026-04-27T00:35:46.996Z |
| branch-plans-flow.test.ts | Branch Plans Flow - Geração de Planos por Ramo | FAIL | 16056ms | 2026-04-27T00:35:46.996Z |
| branch-plans-flow.test.ts | server/integration/branch-plans-flow.test.ts | FAIL | 16057ms | 2026-04-27T00:35:46.997Z |
| projects.updateStatus.test.ts | should allow equipe_solaris to update project status | PASS | 618ms | 2026-04-27T00:35:48.947Z |
| projects.updateStatus.test.ts | should allow cliente to update their own project status | PASS | 205ms | 2026-04-27T00:35:49.152Z |
| projects.updateStatus.test.ts | should deny cliente not in project from updating status | PASS | 205ms | 2026-04-27T00:35:49.357Z |
| projects.updateStatus.test.ts | should allow advogado_senior to update project status | PASS | 307ms | 2026-04-27T00:35:49.664Z |
| projects.updateStatus.test.ts | should deny update for non-existent project | PASS | 103ms | 2026-04-27T00:35:49.767Z |
| z12-migration-0072.test.ts | Mapeamento domain → risk_category_code está correto | PASS | 4187ms | 2026-04-27T00:35:50.331Z |
| z12-migration-0072.test.ts | Todos os 10 códigos de risco foram usados na seed | PASS | 353ms | 2026-04-27T00:35:50.685Z |
| projects.updateStatus.test.ts | should update status to all valid enum values | PASS | 1069ms | 2026-04-27T00:35:50.826Z |
| projects.updateStatus.test.ts | projects.updateStatus | PASS | 2507ms | 2026-04-27T00:35:50.826Z |
| projects.updateStatus.test.ts | server/projects.updateStatus.test.ts | PASS | 2508ms | 2026-04-27T00:35:50.826Z |
| z12-migration-0072.test.ts | Sem violações de FK (todos os códigos existem em risk_categories) | PASS | 340ms | 2026-04-27T00:35:51.015Z |
| z12-migration-0072.test.ts | Z-12 migration 0072 — risk_category_code em regulatory_requirements_v3 | PASS | 6344ms | 2026-04-27T00:35:51.015Z |
| z12-migration-0072.test.ts | server/z12-migration-0072.test.ts | PASS | 6344ms | 2026-04-27T00:35:51.015Z |
| action-plans.test.ts | should generate branch action plan via AI | PASS | 5039ms | 2026-04-27T00:35:51.213Z |
| briefing-fingerprint.test.ts | server/lib/briefing-fingerprint.test.ts | PASS | 7ms | 2026-04-27T00:35:51.259Z |
| briefing-fingerprint.test.ts | canonicalize — JSON determinístico | PASS | 3ms | 2026-04-27T00:35:51.259Z |
| briefing-fingerprint.test.ts | chaves ordenadas alfabeticamente | PASS | 1ms | 2026-04-27T00:35:51.259Z |
| briefing-fingerprint.test.ts | aninhamento profundo preserva ordenação | PASS | 0ms | 2026-04-27T00:35:51.259Z |
| briefing-fingerprint.test.ts | arrays preservam ordem (não reordena) | PASS | 1ms | 2026-04-27T00:35:51.259Z |
| briefing-fingerprint.test.ts | null/undefined tratados | PASS | 0ms | 2026-04-27T00:35:51.259Z |
| briefing-fingerprint.test.ts | hashContent — SHA256 determinístico | PASS | 1ms | 2026-04-27T00:35:51.259Z |
| briefing-fingerprint.test.ts | mesmo conteúdo → mesmo hash | PASS | 1ms | 2026-04-27T00:35:51.259Z |
| briefing-fingerprint.test.ts | conteúdo diferente → hash diferente | PASS | 0ms | 2026-04-27T00:35:51.259Z |
| briefing-fingerprint.test.ts | produz SHA256 hex (64 chars) | PASS | 0ms | 2026-04-27T00:35:51.259Z |
| briefing-fingerprint.test.ts | diffFingerprints — detecção de mudança | PASS | 2ms | 2026-04-27T00:35:51.259Z |
| briefing-fingerprint.test.ts | sem snapshot prévio → nenhum diff é 'changed' | PASS | 0ms | 2026-04-27T00:35:51.259Z |
| briefing-fingerprint.test.ts | tudo igual → zero diffs | PASS | 0ms | 2026-04-27T00:35:51.259Z |
| briefing-fingerprint.test.ts | hash mudou → changed=true, reason='hash' | PASS | 0ms | 2026-04-27T00:35:51.259Z |
| briefing-fingerprint.test.ts | só ts mudou (hash igual) → changed=false, reason='ts_only' (save sem alteração) | PASS | 0ms | 2026-04-27T00:35:51.259Z |
| briefing-fingerprint.test.ts | múltiplas fontes mudam simultaneamente | PASS | 0ms | 2026-04-27T00:35:51.259Z |
| briefing-fingerprint.test.ts | retorna todos 6 pilares sempre (mesmo os inalterados) | PASS | 0ms | 2026-04-27T00:35:51.259Z |
| action-plans.test.ts | should list branch plans with tasks | PASS | 53ms | 2026-04-27T00:35:51.266Z |
| ai-schemas.briefing.test.ts | server/ai-schemas.briefing.test.ts | PASS | 10ms | 2026-04-27T00:35:51.272Z |
| ai-schemas.briefing.test.ts | BriefingStructuredSchema — bundle D/A/B/C backward-compat | PASS | 9ms | 2026-04-27T00:35:51.272Z |
| ai-schemas.briefing.test.ts | aceita payload legado — sem top_3_acoes, sem source_type (briefings pré-#810/#811) | PASS | 4ms | 2026-04-27T00:35:51.272Z |
| ai-schemas.briefing.test.ts | aceita payload novo completo — com top_3_acoes e source_type | PASS | 2ms | 2026-04-27T00:35:51.272Z |
| ai-schemas.briefing.test.ts | aceita payload misto — alguns gaps com source, outros sem | PASS | 0ms | 2026-04-27T00:35:51.272Z |
| ai-schemas.briefing.test.ts | tolera source_type inválido via .catch (LLM com typo) | PASS | 1ms | 2026-04-27T00:35:51.272Z |
| ai-schemas.briefing.test.ts | tolera prazo inválido em top_3_acoes via .catch (default curto_prazo) | PASS | 0ms | 2026-04-27T00:35:51.272Z |
| ai-schemas.briefing.test.ts | top_3_acoes com mais de 3 itens → rejeita | PASS | 1ms | 2026-04-27T00:35:51.272Z |
| action-plans.test.ts | should retrieve specific branch plan | PASS | 52ms | 2026-04-27T00:35:51.319Z |
| action-plans.test.ts | Branch Action Plans | PASS | 5199ms | 2026-04-27T00:35:51.319Z |
| action-plans.test.ts | should throw error when corporate assessment not found | PASS | 60ms | 2026-04-27T00:35:51.378Z |
| action-plans.test.ts | should throw error when branch assessment not found | PASS | 51ms | 2026-04-27T00:35:51.422Z |
| action-plans.test.ts | Error Handling | PASS | 111ms | 2026-04-27T00:35:51.422Z |
| action-plans.test.ts | Action Plans Router | PASS | 22518ms | 2026-04-27T00:35:51.422Z |
| action-plans.test.ts | server/action-plans.test.ts | PASS | 22519ms | 2026-04-27T00:35:51.422Z |
| versionHistory.test.ts | should save briefing version when regenerating | PASS | 23986ms | 2026-04-27T00:35:52.127Z |
| assessment-phase1-save.test.ts | deve salvar Fase 1 SEM campos completed* (usando NULL como padrão) | PASS | 106ms | 2026-04-27T00:35:52.343Z |
| assessment-phase1-save.test.ts | deve permitir UPDATE para adicionar campos completed* posteriormente | PASS | 152ms | 2026-04-27T00:35:52.495Z |
| assessment-phase1-save.test.ts | deve aceitar valores explícitos NULL para campos completed* | PASS | 151ms | 2026-04-27T00:35:52.646Z |
| assessment-phase1-save.test.ts | Assessment Phase 1 - Save Functionality | PASS | 870ms | 2026-04-27T00:35:52.744Z |
| assessment-phase1-save.test.ts | server/assessment-phase1-save.test.ts | PASS | 871ms | 2026-04-27T00:35:52.744Z |
| branches-complete.test.ts | Branches System - Complete Tests | FAIL | 354ms | 2026-04-27T00:35:52.918Z |
| branches-complete.test.ts | server/integration/branches-complete.test.ts | FAIL | 354ms | 2026-04-27T00:35:52.918Z |
| questionarios-ramo-page.test.ts | deve listar ramos do projeto | PASS | 54ms | 2026-04-27T00:35:53.184Z |
| bug-manual-03.test.ts | server/integration/bug-manual-03.test.ts | FAIL | 33ms | 2026-04-27T00:35:53.210Z |
| bug-manual-03.test.ts | M03-01: Instrução Art. 2 IS está no prompt do generateBriefingFromDiagnostic | PASS | 3ms | 2026-04-27T00:35:53.210Z |
| bug-manual-03.test.ts | deve conter instrução para citar Art. 2 para riscos IS | PASS | 1ms | 2026-04-27T00:35:53.210Z |
| bug-manual-03.test.ts | deve conter instrução EXCLUSIVAMENTE para Art. 2 | PASS | 0ms | 2026-04-27T00:35:53.210Z |
| bug-manual-03.test.ts | M03-02: Instrução proíbe associação Art. 57 / IS | FAIL | 14ms | 2026-04-27T00:35:53.210Z |
| bug-manual-03.test.ts | deve conter instrução explícita que Art. 57 NÃO é IS | FAIL | 13ms | 2026-04-27T00:35:53.210Z |
| bug-manual-03.test.ts | deve conter instrução para ignorar Art. 57 em contexto IS do RAG | PASS | 0ms | 2026-04-27T00:35:53.210Z |
| bug-manual-03.test.ts | M03-03: ADR-0012 existe e documenta o mapeamento canônico | PASS | 1ms | 2026-04-27T00:35:53.210Z |
| bug-manual-03.test.ts | deve existir o arquivo ADR-0012 | PASS | 1ms | 2026-04-27T00:35:53.210Z |
| bug-manual-03.test.ts | deve ter status Aceito | PASS | 0ms | 2026-04-27T00:35:53.210Z |
| bug-manual-03.test.ts | deve ter tabela de mapeamento canônico com Art. 2 e Art. 57 | PASS | 0ms | 2026-04-27T00:35:53.210Z |
| bug-manual-03.test.ts | M03-04: Corpus RAG contém Art. 57 com contexto correto (uso/consumo pessoal) | PASS | 14ms | 2026-04-27T00:35:53.210Z |
| bug-manual-03.test.ts | deve existir o corpus RAG | PASS | 14ms | 2026-04-27T00:35:53.211Z |
| bug-manual-03.test.ts | M03-05: ADR-0012 está referenciado no ADR-INDEX | PASS | 1ms | 2026-04-27T00:35:53.211Z |
| bug-manual-03.test.ts | deve estar no ADR-INDEX.md | PASS | 1ms | 2026-04-27T00:35:53.211Z |
| gate-post-deploy.test.ts | server/integration/gate-post-deploy.test.ts | PASS | 11ms | 2026-04-27T00:35:53.399Z |
| gate-post-deploy.test.ts | G01 — server/routers/health.ts existe | PASS | 4ms | 2026-04-27T00:35:53.399Z |
| gate-post-deploy.test.ts | health.ts deve existir em server/routers/ | PASS | 1ms | 2026-04-27T00:35:53.399Z |
| gate-post-deploy.test.ts | health.ts deve exportar healthRouter | PASS | 2ms | 2026-04-27T00:35:53.399Z |
| gate-post-deploy.test.ts | G02 — /api/health retorna campos obrigatórios | PASS | 0ms | 2026-04-27T00:35:53.399Z |
| gate-post-deploy.test.ts | health.ts deve incluir status, sha, version, timestamp, checks | PASS | 0ms | 2026-04-27T00:35:53.399Z |
| gate-post-deploy.test.ts | G03 — /api/health verifica database | PASS | 0ms | 2026-04-27T00:35:53.399Z |
| gate-post-deploy.test.ts | health.ts deve ter check de database | PASS | 0ms | 2026-04-27T00:35:53.399Z |
| gate-post-deploy.test.ts | G04 — scripts/smoke.sh existe e é executável | PASS | 3ms | 2026-04-27T00:35:53.399Z |
| gate-post-deploy.test.ts | smoke.sh deve existir em scripts/ | PASS | 1ms | 2026-04-27T00:35:53.399Z |
| gate-post-deploy.test.ts | smoke.sh deve ter os 5 smoke tests (S-01..S-05) | PASS | 2ms | 2026-04-27T00:35:53.399Z |
| gate-post-deploy.test.ts | smoke.sh deve verificar /api/health | PASS | 0ms | 2026-04-27T00:35:53.399Z |
| gate-post-deploy.test.ts | G05 — .github/workflows/smoke-post-deploy.yml existe | PASS | 2ms | 2026-04-27T00:35:53.399Z |
| gate-post-deploy.test.ts | smoke-post-deploy.yml deve existir | PASS | 0ms | 2026-04-27T00:35:53.400Z |
| gate-post-deploy.test.ts | smoke-post-deploy.yml deve disparar em deployment_status | PASS | 2ms | 2026-04-27T00:35:53.400Z |
| gate-post-deploy.test.ts | smoke-post-deploy.yml deve chamar scripts/smoke.sh | PASS | 0ms | 2026-04-27T00:35:53.400Z |
| questionarios-ramo-page.test.ts | deve gerar questionário para um ramo | FAIL | 260ms | 2026-04-27T00:35:53.446Z |
| questionarios-ramo-page.test.ts | deve obter questionário gerado | FAIL | 52ms | 2026-04-27T00:35:53.498Z |
| questionarios-ramo-page.test.ts | deve salvar resposta de uma pergunta | FAIL | 2ms | 2026-04-27T00:35:53.498Z |
| questionarios-ramo-page.test.ts | deve completar questionário após responder todas as perguntas | FAIL | 52ms | 2026-04-27T00:35:53.549Z |
| bug-manual-04-category-badge.test.ts | server/integration/bug-manual-04-category-badge.test.ts | PASS | 7ms | 2026-04-27T00:35:53.584Z |
| bug-manual-04-category-badge.test.ts | M04-01 — Schema projectRisksV3 tem riskCategoryL2 | PASS | 2ms | 2026-04-27T00:35:53.584Z |
| bug-manual-04-category-badge.test.ts | drizzle/schema-compliance-engine-v3.ts deve declarar riskCategoryL2 | PASS | 1ms | 2026-04-27T00:35:53.584Z |
| bug-manual-04-category-badge.test.ts | M04-02 — Tipo RiskItem tem riskCategoryL2 | PASS | 3ms | 2026-04-27T00:35:53.584Z |
| bug-manual-04-category-badge.test.ts | client/src/types/compliance-v3/index.ts deve ter riskCategoryL2 no RiskItem | PASS | 3ms | 2026-04-27T00:35:53.584Z |
| bug-manual-04-category-badge.test.ts | M04-03 — CategoryBadge exportado de Badges.tsx | PASS | 0ms | 2026-04-27T00:35:53.584Z |
| bug-manual-04-category-badge.test.ts | Badges.tsx deve exportar CategoryBadge | PASS | 0ms | 2026-04-27T00:35:53.584Z |
| bug-manual-04-category-badge.test.ts | M04-04 — CategoryBadge cobre 10 categorias canônicas LC 214/2025 | PASS | 1ms | 2026-04-27T00:35:53.584Z |
| bug-manual-04-category-badge.test.ts | Badges.tsx deve conter todas as 10 categorias canônicas | PASS | 0ms | 2026-04-27T00:35:53.584Z |
| bug-manual-04-category-badge.test.ts | M04-05 — RisksV3.tsx importa CategoryBadge | PASS | 1ms | 2026-04-27T00:35:53.584Z |
| bug-manual-04-category-badge.test.ts | RisksV3.tsx deve importar CategoryBadge de Badges | PASS | 0ms | 2026-04-27T00:35:53.584Z |
| bug-manual-04-category-badge.test.ts | M04-06 — RisksV3.tsx tem coluna Categoria na tabela de riscos | PASS | 0ms | 2026-04-27T00:35:53.584Z |
| bug-manual-04-category-badge.test.ts | RisksV3.tsx deve ter th com texto 'Categoria' | PASS | 0ms | 2026-04-27T00:35:53.584Z |
| questionarios-ramo-page.test.ts | Questionários por Ramo - Integração Frontend/Backend | FAIL | 1139ms | 2026-04-27T00:35:53.696Z |
| questionarios-ramo-page.test.ts | server/integration/questionarios-ramo-page.test.ts | FAIL | 1140ms | 2026-04-27T00:35:53.696Z |
| iagen-gap-logic.test.ts | server/integration/iagen-gap-logic.test.ts | PASS | 4ms | 2026-04-27T00:35:53.778Z |
| iagen-gap-logic.test.ts | iagen-gap-analyzer — isNonCompliantAnswer (fix/iagen-gap-logic) | PASS | 4ms | 2026-04-27T00:35:53.778Z |
| iagen-gap-logic.test.ts | resposta "não" gera gap source=iagen | PASS | 2ms | 2026-04-27T00:35:53.778Z |
| iagen-gap-logic.test.ts | resposta "sim" não gera gap | PASS | 0ms | 2026-04-27T00:35:53.778Z |
| iagen-gap-logic.test.ts | resposta "não sei" gera gap de incerteza | PASS | 0ms | 2026-04-27T00:35:53.778Z |
| iagen-gap-logic.test.ts | resposta "depende" gera gap de incerteza | PASS | 0ms | 2026-04-27T00:35:53.778Z |
| iagen-gap-logic.test.ts | confidence_score alto não impede geração de gap (regressão) | PASS | 0ms | 2026-04-27T00:35:53.778Z |
| m2-1-completeness.test.ts | server/integration/m2-1-completeness.test.ts | FAIL | 13ms | 2026-04-27T00:35:53.895Z |
| m2-1-completeness.test.ts | M2.1 — calcDiagnosticCompleteness | FAIL | 11ms | 2026-04-27T00:35:53.895Z |
| m2-1-completeness.test.ts | Caso 1: retorna 'insuficiente' quando solarisAnswersCount=0 e iagenAnswersCount=0 | PASS | 2ms | 2026-04-27T00:35:53.895Z |
| m2-1-completeness.test.ts | Caso 2: retorna 'parcial' quando há respostas mas nem todas as camadas estão 'completed' | PASS | 0ms | 2026-04-27T00:35:53.895Z |
| m2-1-completeness.test.ts | Caso 3: retorna 'adequado' quando todas as camadas estão 'completed' mas operationProfile é null | FAIL | 7ms | 2026-04-27T00:35:53.895Z |
| m2-1-completeness.test.ts | Caso 4: retorna 'completo' quando todas as camadas estão 'completed' e operationProfile está preenchido | FAIL | 1ms | 2026-04-27T00:35:53.895Z |
| m2-1-completeness.test.ts | Caso 5: retorna 'parcial' quando diagnosticStatus é null mas há respostas em pelo menos uma onda | FAIL | 1ms | 2026-04-27T00:35:53.895Z |
| m2-1-completeness.test.ts | M2.1 — getPendingDiagnosticLayers | PASS | 1ms | 2026-04-27T00:35:53.895Z |
| m2-1-completeness.test.ts | retorna todas as 3 dimensões quando diagnosticStatus é null | PASS | 0ms | 2026-04-27T00:35:53.895Z |
| m2-1-completeness.test.ts | retorna apenas as dimensões não concluídas | PASS | 0ms | 2026-04-27T00:35:53.895Z |
| m2-1-completeness.test.ts | retorna array vazio quando todas as dimensões estão 'completed' | PASS | 0ms | 2026-04-27T00:35:53.895Z |
| actionPlan.test.ts | should generate action plan from briefing recommendations | PASS | 9360ms | 2026-04-27T00:35:53.924Z |
| actionPlan.test.ts | Action Plan Generation | PASS | 9360ms | 2026-04-27T00:35:53.924Z |
| actionPlan.test.ts | server/actionPlan.test.ts | PASS | 9361ms | 2026-04-27T00:35:53.924Z |
| bug-e2e-01-confirm-cnaes.test.ts | server/bug-e2e-01-confirm-cnaes.test.ts | PASS | 6ms | 2026-04-27T00:35:53.964Z |
| bug-e2e-01-confirm-cnaes.test.ts | BUG-E2E-01 — confirmCnaes transição atômica | PASS | 6ms | 2026-04-27T00:35:53.964Z |
| bug-e2e-01-confirm-cnaes.test.ts | ANTES do fix — comportamento bugado | PASS | 3ms | 2026-04-27T00:35:53.964Z |
| bug-e2e-01-confirm-cnaes.test.ts | ANTES: rascunho → cnaes_confirmados lança FORBIDDEN (BUG) | PASS | 2ms | 2026-04-27T00:35:53.964Z |
| bug-e2e-01-confirm-cnaes.test.ts | ANTES: consistencia_pendente → cnaes_confirmados funciona | PASS | 0ms | 2026-04-27T00:35:53.964Z |
| bug-e2e-01-confirm-cnaes.test.ts | DEPOIS do fix — comportamento correto | PASS | 1ms | 2026-04-27T00:35:53.964Z |
| bug-e2e-01-confirm-cnaes.test.ts | Caso 1: rascunho → confirmCnaes → status=cnaes_confirmados ✅ | PASS | 0ms | 2026-04-27T00:35:53.964Z |
| bug-e2e-01-confirm-cnaes.test.ts | Caso 2: consistencia_pendente → confirmCnaes → status=cnaes_confirmados ✅ | PASS | 0ms | 2026-04-27T00:35:53.964Z |
| bug-e2e-01-confirm-cnaes.test.ts | Caso 3: onda1_solaris → confirmCnaes → lança erro de transição inválida ✅ | PASS | 0ms | 2026-04-27T00:35:53.964Z |
| bug-e2e-01-confirm-cnaes.test.ts | Caso 3b: briefing → confirmCnaes → lança erro de transição inválida ✅ | PASS | 0ms | 2026-04-27T00:35:53.964Z |
| bug-e2e-01-confirm-cnaes.test.ts | Caso 3c: aprovado → confirmCnaes → lança erro de transição inválida ✅ | PASS | 0ms | 2026-04-27T00:35:53.964Z |
| bug-e2e-01-confirm-cnaes.test.ts | VALID_TRANSITIONS — integridade da máquina de estados | PASS | 1ms | 2026-04-27T00:35:53.964Z |
| bug-e2e-01-confirm-cnaes.test.ts | rascunho → consistencia_pendente é válida | PASS | 0ms | 2026-04-27T00:35:53.964Z |
| bug-e2e-01-confirm-cnaes.test.ts | consistencia_pendente → cnaes_confirmados é válida | PASS | 0ms | 2026-04-27T00:35:53.964Z |
| bug-e2e-01-confirm-cnaes.test.ts | rascunho → cnaes_confirmados NÃO é válida (transição direta proibida) | PASS | 0ms | 2026-04-27T00:35:53.964Z |
| schema-g15-question.test.ts | server/schema-g15-question.test.ts | PASS | 6ms | 2026-04-27T00:35:54.217Z |
| schema-g15-question.test.ts | G15 — QuestionSchema: rastreabilidade de origem (fonte/requirement_id/source_reference) | PASS | 5ms | 2026-04-27T00:35:54.217Z |
| schema-g15-question.test.ts | T-G15-01: pergunta regulatória com todos os campos — schema aceita | PASS | 3ms | 2026-04-27T00:35:54.217Z |
| schema-g15-question.test.ts | T-G15-02: pergunta ia_gen com campos vazios — schema aceita | PASS | 0ms | 2026-04-27T00:35:54.217Z |
| schema-g15-question.test.ts | T-G15-03: sem campo fonte — default ia_gen aplicado automaticamente | PASS | 0ms | 2026-04-27T00:35:54.217Z |
| schema-g15-question.test.ts | T-G15-04: fonte inválida — ZodError | PASS | 1ms | 2026-04-27T00:35:54.217Z |
| schema-g15-question.test.ts | T-G15-05: INV-005 — output nunca tem fonte undefined mesmo sem o campo | PASS | 0ms | 2026-04-27T00:35:54.217Z |
| solaris-admin-bugs.test.ts | server/integration/solaris-admin-bugs.test.ts | PASS | 4ms | 2026-04-27T00:35:54.394Z |
| solaris-admin-bugs.test.ts | BUG 1 — upsert reativa ativo=1 em reimportação de CSV | PASS | 3ms | 2026-04-27T00:35:54.394Z |
| solaris-admin-bugs.test.ts | UPDATE do upsert inclui 'ativo = 1' no SET | PASS | 1ms | 2026-04-27T00:35:54.394Z |
| solaris-admin-bugs.test.ts | INSERT do upsert também seta ativo = 1 (comportamento existente preservado) | PASS | 1ms | 2026-04-27T00:35:54.394Z |
| solaris-admin-bugs.test.ts | Lógica de reativação: UPDATE cobre pergunta com ativo=0 (documentado) | PASS | 0ms | 2026-04-27T00:35:54.394Z |
| solaris-admin-bugs.test.ts | BUG 2 — listBatches oculta lotes com ativo=0 | PASS | 1ms | 2026-04-27T00:35:54.394Z |
| solaris-admin-bugs.test.ts | Query listBatches inclui filtro 'AND ativo = 1' | PASS | 0ms | 2026-04-27T00:35:54.394Z |
| solaris-admin-bugs.test.ts | deleteBatch faz soft-delete (ativo=0) nas perguntas do lote | PASS | 0ms | 2026-04-27T00:35:54.394Z |
| solaris-admin-bugs.test.ts | Após deleteBatch, lote não aparece em listBatches (lógica documentada) | PASS | 0ms | 2026-04-27T00:35:54.394Z |
| b-z11-012-evidence.test.ts | B-Z11-012 — completeDiagnosticLayer transição TO-BE | FAIL | 413ms | 2026-04-27T00:35:54.765Z |
| b-z11-012-evidence.test.ts | server/b-z11-012-evidence.test.ts | FAIL | 414ms | 2026-04-27T00:35:54.765Z |
| bloco-e-frontend.test.ts | server/bloco-e-frontend.test.ts | PASS | 6ms | 2026-04-27T00:35:55.043Z |
| bloco-e-frontend.test.ts | Bloco E — Frontend: PerfilEmpresaData | PASS | 3ms | 2026-04-27T00:35:55.043Z |
| bloco-e-frontend.test.ts | Q5-FE-1: tipo aceita principaisProdutos e principaisServicos | PASS | 2ms | 2026-04-27T00:35:55.043Z |
| bloco-e-frontend.test.ts | Bloco E — Frontend: PERFIL_VAZIO | PASS | 1ms | 2026-04-27T00:35:55.043Z |
| bloco-e-frontend.test.ts | Q5-FE-2: PERFIL_VAZIO tem principaisProdutos=[] e principaisServicos=[] | PASS | 1ms | 2026-04-27T00:35:55.043Z |
| bloco-e-frontend.test.ts | Bloco E — Frontend: filtragem de entradas vazias | PASS | 1ms | 2026-04-27T00:35:55.043Z |
| bloco-e-frontend.test.ts | Q5-FE-3: entradas com ncm_code vazio são filtradas antes de enviar ao backend | PASS | 0ms | 2026-04-27T00:35:55.043Z |
| bloco-e-frontend.test.ts | Q5-FE-3b: entradas com nbs_code vazio são filtradas antes de enviar ao backend | PASS | 1ms | 2026-04-27T00:35:55.043Z |
| bloco-e-frontend.test.ts | Bloco E — Frontend: extractNcmNbsFromProfile com dados do formulário | PASS | 1ms | 2026-04-27T00:35:55.043Z |
| bloco-e-frontend.test.ts | Q5-FE-4: extrai NCM/NBS de operationProfile preenchido via formulário | PASS | 0ms | 2026-04-27T00:35:55.043Z |
| bloco-e-frontend.test.ts | Q5-FE-4b: projeto sem NCM/NBS no formulário retorna arrays vazios (compatibilidade legada) | PASS | 0ms | 2026-04-27T00:35:55.043Z |
| task-generator-v4.integration.test.ts | gera 2-4 tarefas para plano de split_payment | PASS | 2115ms | 2026-04-27T00:35:55.057Z |
| planos-por-ramo-renderizacao.test.ts | server/integration/planos-por-ramo-renderizacao.test.ts | FAIL | — | 2026-04-27T00:35:55.208Z |
| audit.test.ts | deve registrar criação de tarefa no log de auditoria | PASS | 62ms | 2026-04-27T00:35:56.296Z |
| audit.test.ts | deve registrar mudança de status no log | PASS | 211ms | 2026-04-27T00:35:56.507Z |
| riskMatrix.generate.v2.test.ts | server/integration/riskMatrix.generate.v2.test.ts | FAIL | 6ms | 2026-04-27T00:35:56.531Z |
| riskMatrix.generate.v2.test.ts | riskMatrix.generate - Teste com SQL Direto | FAIL | 5ms | 2026-04-27T00:35:56.531Z |
| riskMatrix.generate.v2.test.ts | deve gerar riscos automaticamente após criar briefing | FAIL | 5ms | 2026-04-27T00:35:56.531Z |
| audit.test.ts | deve buscar logs por entidade específica | PASS | 51ms | 2026-04-27T00:35:56.558Z |
| audit.test.ts | deve buscar logs por usuário | PASS | 53ms | 2026-04-27T00:35:56.612Z |
| audit.test.ts | deve validar estrutura de entityTypes | PASS | 1ms | 2026-04-27T00:35:56.612Z |
| audit.test.ts | deve validar estrutura de actions | PASS | 0ms | 2026-04-27T00:35:56.612Z |
| task-generator-v4.integration.test.ts | gera tarefas sem artigo (Onda 1 Solaris) | PASS | 1658ms | 2026-04-27T00:35:56.713Z |
| audit.test.ts | Sistema de Auditoria | FAIL | 1075ms | 2026-04-27T00:35:56.783Z |
| audit.test.ts | server/integration/audit.test.ts | FAIL | 1075ms | 2026-04-27T00:35:56.783Z |
| compliance-score-v4.test.ts | server/lib/compliance-score-v4.test.ts | PASS | 5ms | 2026-04-27T00:35:56.969Z |
| compliance-score-v4.test.ts | compliance-score-v4 | PASS | 5ms | 2026-04-27T00:35:56.969Z |
| compliance-score-v4.test.ts | 0 riscos → score=0, nivel=baixo | PASS | 1ms | 2026-04-27T00:35:56.969Z |
| compliance-score-v4.test.ts | riscos não aprovados são ignorados (RN-CV4-01) | PASS | 0ms | 2026-04-27T00:35:56.969Z |
| compliance-score-v4.test.ts | oportunidades fora do denominador (RN-CV4-02) | PASS | 0ms | 2026-04-27T00:35:56.969Z |
| compliance-score-v4.test.ts | confidence mínima 0.5 aplicada (RN-CV4-04) | PASS | 0ms | 2026-04-27T00:35:56.969Z |
| compliance-score-v4.test.ts | nível critico >= 75 | PASS | 0ms | 2026-04-27T00:35:56.969Z |
| compliance-score-v4.test.ts | nível alto >= 50 < 75 | PASS | 0ms | 2026-04-27T00:35:56.969Z |
| compliance-score-v4.test.ts | nível medio >= 25 < 50 | PASS | 0ms | 2026-04-27T00:35:56.969Z |
| compliance-score-v4.test.ts | constantes exportadas corretamente | PASS | 0ms | 2026-04-27T00:35:56.969Z |
| compliance-score-v4.test.ts | total_alta e total_media contam corretamente | PASS | 0ms | 2026-04-27T00:35:56.969Z |
| analytics.test.ts | deve obter métricas globais do usuário | PASS | 685ms | 2026-04-27T00:35:57.481Z |
| analytics.test.ts | deve obter métricas de um projeto específico | PASS | 322ms | 2026-04-27T00:35:57.804Z |
| assessment-phase1-fix.test.ts | server/integration/assessment-phase1-fix.test.ts | FAIL | — | 2026-04-27T00:35:57.861Z |
| analytics.test.ts | deve retornar estatísticas de tarefas por status | PASS | 319ms | 2026-04-27T00:35:58.122Z |
| permissions-integration.test.ts | server/integration/permissions-integration.test.ts | PASS | 5ms | 2026-04-27T00:35:58.309Z |
| permissions-integration.test.ts | Permissions System - Integration Tests | PASS | 4ms | 2026-04-27T00:35:58.309Z |
| permissions-integration.test.ts | should have permissionsCheck router registered | PASS | 1ms | 2026-04-27T00:35:58.309Z |
| permissions-integration.test.ts | should have getProjectPermissions procedure | PASS | 0ms | 2026-04-27T00:35:58.309Z |
| permissions-integration.test.ts | should have checkPermission procedure | PASS | 0ms | 2026-04-27T00:35:58.309Z |
| permissions-integration.test.ts | should define correct permissions for equipe_solaris | PASS | 0ms | 2026-04-27T00:35:58.309Z |
| permissions-integration.test.ts | should define correct permissions for cliente | PASS | 0ms | 2026-04-27T00:35:58.309Z |
| permissions-integration.test.ts | should define correct permissions for responsavel in project | PASS | 0ms | 2026-04-27T00:35:58.309Z |
| permissions-integration.test.ts | should define correct permissions for observador in project | PASS | 0ms | 2026-04-27T00:35:58.309Z |
| permissions-integration.test.ts | should have all user roles defined | PASS | 0ms | 2026-04-27T00:35:58.309Z |
| permissions-integration.test.ts | should have all project roles defined | PASS | 0ms | 2026-04-27T00:35:58.309Z |
| analytics.test.ts | deve retornar estatísticas de tarefas por área | PASS | 320ms | 2026-04-27T00:35:58.441Z |
| analytics.test.ts | deve retornar tarefas críticas e atrasadas | PASS | 320ms | 2026-04-27T00:35:58.761Z |
| task-generator-v4.integration.test.ts | gera tarefas com artigo vazio (Onda 2 IA Gen) | PASS | 2238ms | 2026-04-27T00:35:58.943Z |
| task-generator-v4.integration.test.ts | TaskGenerator Integration (LLM real) | PASS | 6012ms | 2026-04-27T00:35:58.943Z |
| task-generator-v4.integration.test.ts | server/lib/task-generator-v4.integration.test.ts | PASS | 6012ms | 2026-04-27T00:35:58.943Z |
| analytics.test.ts | deve calcular progresso de questionários por ramo corretamente | PASS | 318ms | 2026-04-27T00:35:59.079Z |
| action-plans-json-parsing.test.ts | server/action-plans-json-parsing.test.ts | PASS | 5ms | 2026-04-27T00:35:59.121Z |
| action-plans-json-parsing.test.ts | Action Plans JSON Parsing | PASS | 4ms | 2026-04-27T00:35:59.121Z |
| action-plans-json-parsing.test.ts | deve fazer parse de JSON puro sem markdown | PASS | 2ms | 2026-04-27T00:35:59.121Z |
| action-plans-json-parsing.test.ts | deve fazer parse de JSON com markdown code blocks (```json ... ```) | PASS | 1ms | 2026-04-27T00:35:59.121Z |
| action-plans-json-parsing.test.ts | deve fazer parse de JSON com espaços extras e markdown | PASS | 0ms | 2026-04-27T00:35:59.121Z |
| action-plans-json-parsing.test.ts | deve fazer parse de JSON com múltiplas tarefas | PASS | 0ms | 2026-04-27T00:35:59.121Z |
| action-plans-json-parsing.test.ts | deve retornar tasks vazio para conteúdo null | PASS | 0ms | 2026-04-27T00:35:59.121Z |
| action-plans-json-parsing.test.ts | deve fazer parse de JSON complexo com todos os campos | PASS | 0ms | 2026-04-27T00:35:59.121Z |
| risk-engine-v4-integration.test.ts | apenas categoria ativa retorna de getRiskCategories() | PASS | 357ms | 2026-04-27T00:35:59.224Z |
| risk-engine-v4-integration.test.ts | computeRiskMatrix com gap da categoria do banco produz risco correto | PASS | 53ms | 2026-04-27T00:35:59.277Z |
| risk-engine-v4-integration.test.ts | GAP-CONTRACT-03 — integração real risk_categories | PASS | 411ms | 2026-04-27T00:35:59.277Z |
| risk-engine-v4-integration.test.ts | server/integration/risk-engine-v4-integration.test.ts | PASS | 1074ms | 2026-04-27T00:35:59.330Z |
| analytics.test.ts | Analytics Router - Dashboard Executivo | FAIL | 2989ms | 2026-04-27T00:35:59.345Z |
| analytics.test.ts | server/integration/analytics.test.ts | FAIL | 2989ms | 2026-04-27T00:35:59.345Z |
| generate-risks-pipeline.integration.test.ts | importa o pipeline sem erro | PASS | 253ms | 2026-04-27T00:35:59.796Z |
| generate-risks-pipeline.integration.test.ts | pipeline orquestra 5 etapas documentadas | PASS | 2ms | 2026-04-27T00:35:59.796Z |
| generate-risks-pipeline.integration.test.ts | 930001 existe em projects (read-only smoke) | PASS | 0ms | 2026-04-27T00:35:59.796Z |
| generate-risks-pipeline.integration.test.ts | generate-risks-pipeline — integração contra DB real | PASS | 256ms | 2026-04-27T00:35:59.796Z |
| generate-risks-pipeline.integration.test.ts | generate-risks-pipeline — smoke sem DB (sempre roda) | PASS | 1ms | 2026-04-27T00:35:59.796Z |
| generate-risks-pipeline.integration.test.ts | mergeByRiskKey dedup — último vence em colisão (documentado na spec) | PASS | 0ms | 2026-04-27T00:35:59.797Z |
| generate-risks-pipeline.integration.test.ts | enrichAllWithRag tem timeout 3s (não bloqueia pipeline) | PASS | 0ms | 2026-04-27T00:35:59.797Z |
| generate-risks-pipeline.integration.test.ts | server/lib/generate-risks-pipeline.integration.test.ts | PASS | 258ms | 2026-04-27T00:35:59.797Z |
| normative-inference.afericao.test.ts | server/lib/normative-inference.afericao.test.ts | PASS | 6ms | 2026-04-27T00:36:00.001Z |
| normative-inference.afericao.test.ts | afericao — CNAES hardcoded (snapshot §18.4) | PASS | 4ms | 2026-04-27T00:36:00.001Z |
| normative-inference.afericao.test.ts | CNAES_ALIMENTAR tem exatamente 5 CNAEs | PASS | 2ms | 2026-04-27T00:36:00.001Z |
| normative-inference.afericao.test.ts | CNAES_ATACADISTA tem 8 CNAEs (5 alimentar + 3 adicionais) | PASS | 1ms | 2026-04-27T00:36:00.001Z |
| normative-inference.afericao.test.ts | RI-08: CNAES_ALIMENTAR ⊂ CNAES_ATACADISTA | PASS | 0ms | 2026-04-27T00:36:00.001Z |
| normative-inference.afericao.test.ts | afericao — integração com pipeline v4 | PASS | 1ms | 2026-04-27T00:36:00.001Z |
| normative-inference.afericao.test.ts | usa buildRiskKey de risk-engine-v4 (consistência de consolidação) | PASS | 0ms | 2026-04-27T00:36:00.001Z |
| normative-inference.afericao.test.ts | lê normative_product_rules (migration 0076) | PASS | 0ms | 2026-04-27T00:36:00.001Z |
| normative-inference.afericao.test.ts | exporta inferNormativeRisks | PASS | 0ms | 2026-04-27T00:36:00.001Z |
| normative-inference.afericao.test.ts | afericao — projeto destrutivo test_z20_destructive (P5) | PASS | 1ms | 2026-04-27T00:36:00.001Z |
| normative-inference.afericao.test.ts | CNAE 4639-7/01 está em CNAES_ALIMENTAR (aciona credito_presumido) | PASS | 0ms | 2026-04-27T00:36:00.001Z |
| normative-inference.afericao.test.ts | CNAE 4639-7/01 também está em CNAES_ATACADISTA (aciona regime_diferenciado) | PASS | 1ms | 2026-04-27T00:36:00.001Z |
| tasks.test.ts | deve listar tarefas de um projeto | FAIL | 363ms | 2026-04-27T00:36:00.080Z |
| tasks.test.ts | tasks.list | FAIL | 364ms | 2026-04-27T00:36:00.081Z |
| tasks.test.ts | deve criar nova tarefa com dados válidos | FAIL | 3ms | 2026-04-27T00:36:00.081Z |
| tasks.test.ts | deve criar tarefa com valores padrão | FAIL | 51ms | 2026-04-27T00:36:00.131Z |
| tasks.test.ts | tasks.create | FAIL | 54ms | 2026-04-27T00:36:00.131Z |
| tasks.test.ts | deve atualizar status de tarefa existente | FAIL | 50ms | 2026-04-27T00:36:00.181Z |
| tasks.test.ts | tasks.updateStatus | FAIL | 50ms | 2026-04-27T00:36:00.181Z |
| tasks.test.ts | deve atualizar dados completos da tarefa | FAIL | 50ms | 2026-04-27T00:36:00.230Z |
| tasks.test.ts | tasks.update | FAIL | 50ms | 2026-04-27T00:36:00.230Z |
| tasks.test.ts | deve deletar tarefa existente | FAIL | 50ms | 2026-04-27T00:36:00.271Z |
| tasks.test.ts | tasks.delete | FAIL | 50ms | 2026-04-27T00:36:00.271Z |
| tasks.test.ts | Tasks Router (Kanban) | FAIL | 568ms | 2026-04-27T00:36:00.271Z |
| tasks.test.ts | server/integration/tasks.test.ts | FAIL | 568ms | 2026-04-27T00:36:00.271Z |
| compute-profile-quality.test.ts | client/src/lib/compute-profile-quality.test.ts | PASS | 6ms | 2026-04-27T00:36:00.499Z |
| compute-profile-quality.test.ts | computeProfileQuality | PASS | 5ms | 2026-04-27T00:36:00.499Z |
| compute-profile-quality.test.ts | retorna 0% para perfil null/undefined | PASS | 2ms | 2026-04-27T00:36:00.499Z |
| compute-profile-quality.test.ts | retorna 0% para perfil vazio (todos os campos nulos) | PASS | 0ms | 2026-04-27T00:36:00.499Z |
| compute-profile-quality.test.ts | retorna 100% quando todos os 16 campos estao preenchidos | PASS | 0ms | 2026-04-27T00:36:00.499Z |
| compute-profile-quality.test.ts | CNPJ com menos de 14 digitos nao conta como preenchido | PASS | 0ms | 2026-04-27T00:36:00.499Z |
| compute-profile-quality.test.ts | CNPJ formatado com mascara conta quando tem 14 digitos | PASS | 0ms | 2026-04-27T00:36:00.499Z |
| compute-profile-quality.test.ts | array vazio nao conta como preenchido | PASS | 0ms | 2026-04-27T00:36:00.499Z |
| compute-profile-quality.test.ts | string vazia/espacos nao conta como preenchido | PASS | 0ms | 2026-04-27T00:36:00.499Z |
| compute-profile-quality.test.ts | boolean false conta como preenchido (decisao foi tomada) | PASS | 0ms | 2026-04-27T00:36:00.499Z |
| compute-profile-quality.test.ts | arredonda percentual com Math.round | PASS | 0ms | 2026-04-27T00:36:00.499Z |
| compute-profile-quality.test.ts | calcula 50% quando 8 de 16 campos preenchidos | PASS | 0ms | 2026-04-27T00:36:00.499Z |
| schema-g11-136.test.ts | server/schema-g11-136.test.ts | PASS | 8ms | 2026-04-27T00:36:00.780Z |
| schema-g11-136.test.ts | Issue #136 — fonte_risco_tipo no RiskItemSchema | PASS | 7ms | 2026-04-27T00:36:00.780Z |
| schema-g11-136.test.ts | aceita fonte_risco_tipo = regulatorio | PASS | 4ms | 2026-04-27T00:36:00.780Z |
| schema-g11-136.test.ts | aceita fonte_risco_tipo = solaris | PASS | 0ms | 2026-04-27T00:36:00.780Z |
| schema-g11-136.test.ts | aceita fonte_risco_tipo = ia_gen | PASS | 0ms | 2026-04-27T00:36:00.780Z |
| schema-g11-136.test.ts | default de fonte_risco_tipo é ia_gen quando ausente | PASS | 0ms | 2026-04-27T00:36:00.780Z |
| schema-g11-136.test.ts | rejeita fonte_risco_tipo com valor inválido (usa catch → ia_gen) | PASS | 1ms | 2026-04-27T00:36:00.780Z |
| schema-g11-136.test.ts | mantém compatibilidade retroativa — fonte_risco string livre ainda funciona | PASS | 0ms | 2026-04-27T00:36:00.780Z |
| schema-g11-136.test.ts | INV-006: risco sem fonte_risco_tipo usa default ia_gen (não é inválido) | PASS | 0ms | 2026-04-27T00:36:00.780Z |
| permissions.test.ts | deve criar permissão com nível view | PASS | 112ms | 2026-04-27T00:36:01.065Z |
| permissions.test.ts | deve listar permissões do projeto | PASS | 112ms | 2026-04-27T00:36:01.177Z |
| riskMatrix.generate.test.ts | riskMatrix.generate - Teste End-to-End | FAIL | 458ms | 2026-04-27T00:36:01.219Z |
| riskMatrix.generate.test.ts | server/integration/riskMatrix.generate.test.ts | FAIL | 459ms | 2026-04-27T00:36:01.219Z |
| permissions.test.ts | deve atualizar nível de permissão | PASS | 158ms | 2026-04-27T00:36:01.335Z |
| actions-crud-integration.test.ts | server/integration/actions-crud-integration.test.ts | FAIL | — | 2026-04-27T00:36:01.338Z |
| e2e-testlogin.test.ts | server/integration/e2e-testlogin.test.ts | PASS | 7ms | 2026-04-27T00:36:01.418Z |
| e2e-testlogin.test.ts | auth.testLogin — guard E2E_TEST_MODE | PASS | 6ms | 2026-04-27T00:36:01.418Z |
| e2e-testlogin.test.ts | deve retornar FORBIDDEN quando E2E_TEST_MODE não está definido | PASS | 2ms | 2026-04-27T00:36:01.418Z |
| e2e-testlogin.test.ts | deve retornar FORBIDDEN quando E2E_TEST_MODE='false' | PASS | 0ms | 2026-04-27T00:36:01.418Z |
| e2e-testlogin.test.ts | deve retornar FORBIDDEN quando E2E_TEST_MODE='production' | PASS | 0ms | 2026-04-27T00:36:01.418Z |
| e2e-testlogin.test.ts | deve permitir quando E2E_TEST_MODE='true' | PASS | 0ms | 2026-04-27T00:36:01.418Z |
| e2e-testlogin.test.ts | deve rejeitar secret inválido mesmo com E2E_TEST_MODE=true | PASS | 0ms | 2026-04-27T00:36:01.418Z |
| e2e-testlogin.test.ts | deve aceitar secret correto com E2E_TEST_MODE=true | PASS | 0ms | 2026-04-27T00:36:01.418Z |
| e2e-testlogin.test.ts | deve rejeitar quando E2E_TEST_SECRET não está definido | PASS | 0ms | 2026-04-27T00:36:01.418Z |
| e2e-testlogin.test.ts | openId do usuário de teste deve ser constante (determinístico) | PASS | 1ms | 2026-04-27T00:36:01.418Z |
| permissions.test.ts | deve criar permissão com áreas específicas | PASS | 113ms | 2026-04-27T00:36:01.449Z |
| permissions.test.ts | deve verificar hierarquia de permissões | PASS | 0ms | 2026-04-27T00:36:01.449Z |
| permissions.test.ts | deve validar estrutura de áreas | PASS | 1ms | 2026-04-27T00:36:01.449Z |
| permissions.test.ts | Sistema de Permissões | FAIL | 1038ms | 2026-04-27T00:36:01.555Z |
| permissions.test.ts | server/integration/permissions.test.ts | FAIL | 1038ms | 2026-04-27T00:36:01.555Z |
| openai-key-validation.test.ts | deve ter OPENAI_API_KEY configurada no ambiente | PASS | 2ms | 2026-04-27T00:36:01.589Z |
| client-members.test.ts | server/client-members.test.ts | PASS | 8ms | 2026-04-27T00:36:01.627Z |
| client-members.test.ts | clientMembers — RF-1.03 / RF-5.17 | PASS | 7ms | 2026-04-27T00:36:01.627Z |
| client-members.test.ts | deve listar membros de um cliente | PASS | 2ms | 2026-04-27T00:36:01.627Z |
| client-members.test.ts | deve adicionar um novo membro com papel colaborador por padrão | PASS | 2ms | 2026-04-27T00:36:01.627Z |
| client-members.test.ts | deve atualizar o papel de um membro | PASS | 1ms | 2026-04-27T00:36:01.627Z |
| client-members.test.ts | deve desativar um membro (soft delete) | PASS | 0ms | 2026-04-27T00:36:01.627Z |
| client-members.test.ts | deve remover um membro permanentemente | PASS | 0ms | 2026-04-27T00:36:01.627Z |
| client-members.test.ts | deve filtrar membros ativos vs inativos | PASS | 0ms | 2026-04-27T00:36:01.627Z |
| compute-execution-score.test.ts | server/lib/compute-execution-score.test.ts | PASS | 5ms | 2026-04-27T00:36:01.748Z |
| compute-execution-score.test.ts | computeExecutionScore | PASS | 5ms | 2026-04-27T00:36:01.748Z |
| compute-execution-score.test.ts | retorna no_plans_yet quando nao ha planos nem tasks | PASS | 2ms | 2026-04-27T00:36:01.748Z |
| compute-execution-score.test.ts | calcula 60% quando 3 de 5 tasks estao done | PASS | 0ms | 2026-04-27T00:36:01.748Z |
| compute-execution-score.test.ts | calcula 100% quando todas as tasks estao done | PASS | 0ms | 2026-04-27T00:36:01.748Z |
| compute-execution-score.test.ts | calcula 0% quando nenhuma task esta done mas existem tasks | PASS | 0ms | 2026-04-27T00:36:01.748Z |
| compute-execution-score.test.ts | arredonda com Math.round quando percentual nao e inteiro | PASS | 1ms | 2026-04-27T00:36:01.748Z |
| compute-execution-score.test.ts | conta apenas planos com status aprovado | PASS | 0ms | 2026-04-27T00:36:01.748Z |
| compute-execution-score.test.ts | retorna percent=0 quando ha planos mas 0 tasks | PASS | 0ms | 2026-04-27T00:36:01.748Z |
| branch-plans-redirect.test.ts | server/branch-plans-redirect.test.ts | PASS | 5ms | 2026-04-27T00:36:01.962Z |
| branch-plans-redirect.test.ts | Redirecionamento após geração de planos por ramo | PASS | 5ms | 2026-04-27T00:36:01.962Z |
| branch-plans-redirect.test.ts | deve construir URL correta com projectId | PASS | 2ms | 2026-04-27T00:36:01.962Z |
| branch-plans-redirect.test.ts | deve incluir prefixo /planos-acao/ na rota | PASS | 1ms | 2026-04-27T00:36:01.962Z |
| branch-plans-redirect.test.ts | deve validar formato completo da URL | PASS | 0ms | 2026-04-27T00:36:01.962Z |
| branch-plans-redirect.test.ts | deve aceitar diferentes valores de projectId | PASS | 0ms | 2026-04-27T00:36:01.962Z |
| branch-plans-redirect.test.ts | deve rejeitar URL incorreta (sem /planos-acao/) | PASS | 0ms | 2026-04-27T00:36:01.962Z |
| openai-key-validation.test.ts | deve conseguir chamar o modelo gpt-4.1 com sucesso | PASS | 680ms | 2026-04-27T00:36:02.216Z |
| openai-key-validation.test.ts | OpenAI API Key Validation | PASS | 683ms | 2026-04-27T00:36:02.216Z |
| openai-key-validation.test.ts | server/openai-key-validation.test.ts | PASS | 683ms | 2026-04-27T00:36:02.216Z |
| riskMatrix.test.ts | should create a new risk | PASS | 109ms | 2026-04-27T00:36:02.750Z |
| riskMatrix.test.ts | should list all risks for a project | PASS | 204ms | 2026-04-27T00:36:02.955Z |
| db-queries-risks-v4.integration.test.ts | getProjectAuditLog executa sem erro e retorna array | PASS | 623ms | 2026-04-27T00:36:03.053Z |
| db-queries-risks-v4.integration.test.ts | getRisksV4ByProject executa sem erro | PASS | 105ms | 2026-04-27T00:36:03.158Z |
| assessments-complete.test.ts | should get corporate assessment by project | PASS | 346ms | 2026-04-27T00:36:03.242Z |
| assessments-complete.test.ts | Corporate Assessment Router | PASS | 347ms | 2026-04-27T00:36:03.242Z |
| db-queries-risks-v4.integration.test.ts | getTasksByActionPlan aceita UUID e retorna array | PASS | 97ms | 2026-04-27T00:36:03.256Z |
| assessments-complete.test.ts | should list branch assessments by project | PASS | 53ms | 2026-04-27T00:36:03.295Z |
| assessments-complete.test.ts | Branch Assessment Router | PASS | 53ms | 2026-04-27T00:36:03.295Z |
| riskMatrix.test.ts | should delete a risk | PASS | 354ms | 2026-04-27T00:36:03.299Z |
| riskMatrix.test.ts | Risk Matrix Endpoints | PASS | 1135ms | 2026-04-27T00:36:03.300Z |
| riskMatrix.test.ts | server/riskMatrix.test.ts | PASS | 1135ms | 2026-04-27T00:36:03.300Z |
| assessments-complete.test.ts | should get corporate action plan | PASS | 51ms | 2026-04-27T00:36:03.346Z |
| db-queries-risks-v4.integration.test.ts | getActionPlansByProject executa sem erro | PASS | 97ms | 2026-04-27T00:36:03.354Z |
| assessments-complete.test.ts | should list branch action plans | PASS | 54ms | 2026-04-27T00:36:03.400Z |
| assessments-complete.test.ts | Action Plans Router | PASS | 105ms | 2026-04-27T00:36:03.400Z |
| db-queries-risks-v4.integration.test.ts | getAuditLog com filtro entity funciona | PASS | 97ms | 2026-04-27T00:36:03.441Z |
| db-queries-risks-v4.integration.test.ts | db-queries-risks-v4 Integration (banco real) | PASS | 1020ms | 2026-04-27T00:36:03.441Z |
| db-queries-risks-v4.integration.test.ts | server/lib/db-queries-risks-v4.integration.test.ts | PASS | 1021ms | 2026-04-27T00:36:03.441Z |
| assessments-complete.test.ts | should list tasks with filters | PASS | 62ms | 2026-04-27T00:36:03.462Z |
| assessments-complete.test.ts | Tasks Router (tasksV2) | PASS | 62ms | 2026-04-27T00:36:03.462Z |
| assessments-complete.test.ts | should get user notification preferences | PASS | 51ms | 2026-04-27T00:36:03.513Z |
| assessments-complete.test.ts | should list user notifications | PASS | 51ms | 2026-04-27T00:36:03.555Z |
| assessments-complete.test.ts | Notifications Router (notificationsV2) | PASS | 103ms | 2026-04-27T00:36:03.555Z |
| assessments-complete.test.ts | server/assessments-complete.test.ts | PASS | 669ms | 2026-04-27T00:36:03.555Z |
| dashboard.test.ts | should return KPIs for a project | PASS | 558ms | 2026-04-27T00:36:03.793Z |
| dashboard.test.ts | should return task distribution | PASS | 204ms | 2026-04-27T00:36:03.997Z |
| dashboard.test.ts | should return risk distribution | PASS | 204ms | 2026-04-27T00:36:04.201Z |
| dashboard.test.ts | should return overdue tasks | PASS | 208ms | 2026-04-27T00:36:04.399Z |
| dashboard.test.ts | Dashboard Router | PASS | 1175ms | 2026-04-27T00:36:04.400Z |
| dashboard.test.ts | server/dashboard.test.ts | PASS | 1175ms | 2026-04-27T00:36:04.400Z |
| rag-inventory.test.ts | server/rag-inventory.test.ts | PASS | 6ms | 2026-04-27T00:36:04.594Z |
| rag-inventory.test.ts | ragInventory — estrutura do gold set | PASS | 5ms | 2026-04-27T00:36:04.594Z |
| rag-inventory.test.ts | gold set tem exatamente 8 queries canônicas (GS-01 a GS-08) | PASS | 2ms | 2026-04-27T00:36:04.594Z |
| rag-inventory.test.ts | GS-07b é auxiliar informativo — não entra no cálculo de confidence | PASS | 1ms | 2026-04-27T00:36:04.594Z |
| rag-inventory.test.ts | confidence calculado corretamente — 6/8 = 75% | PASS | 0ms | 2026-04-27T00:36:04.594Z |
| rag-inventory.test.ts | confidence 100% quando todos os 8 verdes | PASS | 0ms | 2026-04-27T00:36:04.594Z |
| rag-inventory.test.ts | confidence 0% quando nenhum verde | PASS | 0ms | 2026-04-27T00:36:04.594Z |
| rag-inventory.test.ts | GS-07 threshold é 10 bytes — captura fragmentos de ingestão | PASS | 0ms | 2026-04-27T00:36:04.594Z |
| q5-iserror.test.ts | server/gates/q5-iserror.test.ts | PASS | 8ms | 2026-04-27T00:36:04.778Z |
| q5-iserror.test.ts | Gate Q5 — isError ≠ lista vazia | PASS | 7ms | 2026-04-27T00:36:04.778Z |
| q5-iserror.test.ts | AdminCategorias.tsx — deve declarar isError | PASS | 2ms | 2026-04-27T00:36:04.778Z |
| q5-iserror.test.ts | AdminCategorias.tsx — isError deve ter tratamento visível | PASS | 0ms | 2026-04-27T00:36:04.778Z |
| q5-iserror.test.ts | AdminCategorias.tsx — queryInput com múltiplos campos usa useMemo | PASS | 0ms | 2026-04-27T00:36:04.778Z |
| q5-iserror.test.ts | AdminConsistencia.tsx — deve declarar isError | PASS | 0ms | 2026-04-27T00:36:04.778Z |
| q5-iserror.test.ts | AdminConsistencia.tsx — isError deve ter tratamento visível | PASS | 0ms | 2026-04-27T00:36:04.778Z |
| q5-iserror.test.ts | AdminConsistencia.tsx — queryInput com múltiplos campos usa useMemo | PASS | 0ms | 2026-04-27T00:36:04.778Z |
| q5-iserror.test.ts | AdminEmbeddings.tsx — deve declarar isError | PASS | 0ms | 2026-04-27T00:36:04.778Z |
| q5-iserror.test.ts | AdminEmbeddings.tsx — isError deve ter tratamento visível | PASS | 0ms | 2026-04-27T00:36:04.778Z |
| q5-iserror.test.ts | AdminEmbeddings.tsx — queryInput com múltiplos campos usa useMemo | PASS | 0ms | 2026-04-27T00:36:04.778Z |
| q5-iserror.test.ts | AdminSolarisQuestions.tsx — deve declarar isError | PASS | 0ms | 2026-04-27T00:36:04.778Z |
| q5-iserror.test.ts | AdminSolarisQuestions.tsx — isError deve ter tratamento visível | PASS | 0ms | 2026-04-27T00:36:04.778Z |
| q5-iserror.test.ts | AdminSolarisQuestions.tsx — queryInput com múltiplos campos usa useMemo | PASS | 0ms | 2026-04-27T00:36:04.778Z |
| q5-iserror.test.ts | Nenhum componente Admin com useQuery silencia isError | PASS | 2ms | 2026-04-27T00:36:04.778Z |
| notifications.test.ts | should list notifications for user | PASS | 353ms | 2026-04-27T00:36:04.927Z |
| notifications.test.ts | should create notification (as equipe_solaris) | PASS | 165ms | 2026-04-27T00:36:05.092Z |
| notifications.test.ts | should mark notification as read | PASS | 213ms | 2026-04-27T00:36:05.306Z |
| assessment.test.ts | should save assessment phase 1 data | PASS | 629ms | 2026-04-27T00:36:05.343Z |
| notifications.test.ts | should filter notifications by projectId | PASS | 157ms | 2026-04-27T00:36:05.453Z |
| notifications.test.ts | Notifications Router | PASS | 889ms | 2026-04-27T00:36:05.453Z |
| notifications.test.ts | server/notifications.test.ts | PASS | 889ms | 2026-04-27T00:36:05.453Z |
| normative-inference.test.ts | should be importable | PASS | 28ms | 2026-04-27T00:36:05.667Z |
| normative-inference.test.ts | T-02: inferNormativeRisks — CNAE alimentar + NCM elegível | PASS | 29ms | 2026-04-27T00:36:05.668Z |
| normative-inference.test.ts | T-03: inferNormativeRisks type safety | PASS | 1ms | 2026-04-27T00:36:05.668Z |
| normative-inference.test.ts | ProjectProfile interface matches expected shape | PASS | 1ms | 2026-04-27T00:36:05.668Z |
| normative-inference.test.ts | server/lib/normative-inference.test.ts | PASS | 31ms | 2026-04-27T00:36:05.668Z |
| assessment.test.ts | should retrieve saved assessment data | PASS | 363ms | 2026-04-27T00:36:05.706Z |
| assessment.test.ts | should complete phase 1 and NOT throw projectId error (Bug #3 regression) | FAIL | 589ms | 2026-04-27T00:36:06.287Z |
| assessment.test.ts | Assessment Fase 1 | FAIL | 1582ms | 2026-04-27T00:36:06.287Z |
| assessment.test.ts | Assessment Router | FAIL | 1583ms | 2026-04-27T00:36:06.287Z |
| assessment.test.ts | server/integration/assessment.test.ts | FAIL | 1583ms | 2026-04-27T00:36:06.287Z |
| qa-phase1-save.test.ts | QA: Assessment Phase 1 - Save Flow | FAIL | 348ms | 2026-04-27T00:36:06.339Z |
| qa-phase1-save.test.ts | server/integration/qa-phase1-save.test.ts | FAIL | 349ms | 2026-04-27T00:36:06.339Z |
| rag-risk-validator.test.ts | should be importable | PASS | 187ms | 2026-04-27T00:36:06.696Z |
| rag-risk-validator.test.ts | InsertRiskV4 includes rag fields | PASS | 0ms | 2026-04-27T00:36:06.696Z |
| rag-risk-validator.test.ts | T-04: no-result scenario preserves risk and reduces confidence | PASS | 0ms | 2026-04-27T00:36:06.696Z |
| rag-risk-validator.test.ts | T-04: enrichRiskWithRag type safety and module export | PASS | 188ms | 2026-04-27T00:36:06.696Z |
| rag-risk-validator.test.ts | server/lib/rag-risk-validator.test.ts | PASS | 189ms | 2026-04-27T00:36:06.696Z |
| comments.test.ts | server/integration/comments.test.ts | FAIL | 6ms | 2026-04-27T00:36:06.910Z |
| comments.test.ts | Comments Router | FAIL | 6ms | 2026-04-27T00:36:06.911Z |
| comments.test.ts | should create a comment | FAIL | 4ms | 2026-04-27T00:36:06.911Z |
| comments.test.ts | should list comments for a task | FAIL | 1ms | 2026-04-27T00:36:06.911Z |
| comments.test.ts | should delete a comment | FAIL | 0ms | 2026-04-27T00:36:06.911Z |
| dt01-db-push.test.ts | server/dt01-db-push.test.ts | PASS | 4ms | 2026-04-27T00:36:07.288Z |
| dt01-db-push.test.ts | DT-01 — db:push guard e integridade de schema | PASS | 4ms | 2026-04-27T00:36:07.288Z |
| dt01-db-push.test.ts | T1 — guard lança erro quando NODE_ENV=production | PASS | 2ms | 2026-04-27T00:36:07.288Z |
| dt01-db-push.test.ts | T2 — guard não lança erro em NODE_ENV=development | PASS | 0ms | 2026-04-27T00:36:07.288Z |
| dt01-db-push.test.ts | T3 — colunas críticas presentes no schema Drizzle (teste em memória) | PASS | 1ms | 2026-04-27T00:36:07.288Z |
| projects.test.ts | should create project and NOT return NaN (Bug #4 regression) | PASS | 491ms | 2026-04-27T00:36:07.467Z |
| projects.test.ts | projects.create | PASS | 491ms | 2026-04-27T00:36:07.467Z |
| websocket-integration.test.ts | server/integration/websocket-integration.test.ts | PASS | 4ms | 2026-04-27T00:36:07.513Z |
| websocket-integration.test.ts | Integração WebSocket com Tarefas | PASS | 4ms | 2026-04-27T00:36:07.513Z |
| websocket-integration.test.ts | deve exportar funções de notificação WebSocket | PASS | 2ms | 2026-04-27T00:36:07.513Z |
| websocket-integration.test.ts | deve verificar estrutura de eventos WebSocket | PASS | 1ms | 2026-04-27T00:36:07.513Z |
| websocket-integration.test.ts | deve ter eventos com nomenclatura correta | PASS | 1ms | 2026-04-27T00:36:07.513Z |
| ui-permissions-integration.test.ts | server/integration/ui-permissions-integration.test.ts | PASS | 3ms | 2026-04-27T00:36:07.611Z |
| ui-permissions-integration.test.ts | UI Permissions Integration - Backend Tests | PASS | 2ms | 2026-04-27T00:36:07.611Z |
| ui-permissions-integration.test.ts | should have permissionsCheck router available for UI | PASS | 1ms | 2026-04-27T00:36:07.611Z |
| ui-permissions-integration.test.ts | should have getProjectPermissions procedure for useProjectPermissions hook | PASS | 0ms | 2026-04-27T00:36:07.611Z |
| ui-permissions-integration.test.ts | should have checkPermission procedure for conditional rendering | PASS | 0ms | 2026-04-27T00:36:07.611Z |
| ui-permissions-integration.test.ts | should return permissions structure compatible with UI hooks | PASS | 0ms | 2026-04-27T00:36:07.611Z |
| projects.test.ts | should retrieve created project | PASS | 221ms | 2026-04-27T00:36:07.688Z |
| projects.test.ts | projects.getById | PASS | 221ms | 2026-04-27T00:36:07.688Z |
| briefing.test.ts | should generate briefing content via LLM | PASS | 4267ms | 2026-04-27T00:36:08.012Z |
| briefing.test.ts | Briefing Generation | PASS | 4268ms | 2026-04-27T00:36:08.012Z |
| briefing.test.ts | server/briefing.test.ts | PASS | 4269ms | 2026-04-27T00:36:08.012Z |
| gerenciar-acoes-integration.test.ts | server/integration/gerenciar-acoes-integration.test.ts | PASS | 3ms | 2026-04-27T00:36:08.198Z |
| gerenciar-acoes-integration.test.ts | GerenciarAcoes Page Integration | PASS | 3ms | 2026-04-27T00:36:08.198Z |
| gerenciar-acoes-integration.test.ts | should have correct route registered | PASS | 1ms | 2026-04-27T00:36:08.199Z |
| gerenciar-acoes-integration.test.ts | should support projectId query parameter | PASS | 0ms | 2026-04-27T00:36:08.199Z |
| gerenciar-acoes-integration.test.ts | should validate component structure | PASS | 0ms | 2026-04-27T00:36:08.199Z |
| projects.test.ts | should list projects | PASS | 535ms | 2026-04-27T00:36:08.214Z |
| projects.test.ts | projects.list | PASS | 535ms | 2026-04-27T00:36:08.214Z |
| projects.test.ts | Projects Router | PASS | 1248ms | 2026-04-27T00:36:08.214Z |
| projects.test.ts | server/projects.test.ts | PASS | 1248ms | 2026-04-27T00:36:08.214Z |
| websocket.test.ts | server/websocket.test.ts | PASS | 58ms | 2026-04-27T00:36:08.459Z |
| websocket.test.ts | WebSocket - Notificações em Tempo Real | PASS | 58ms | 2026-04-27T00:36:08.459Z |
| websocket.test.ts | deve exportar funções de notificação | PASS | 56ms | 2026-04-27T00:36:08.459Z |
| websocket.test.ts | deve ter estrutura correta de eventos | PASS | 1ms | 2026-04-27T00:36:08.459Z |
| branch-assessments.test.ts | should answer a branch assessment question | PASS | 2ms | 2026-04-27T00:36:08.904Z |
| branch-assessments.test.ts | should complete a branch assessment | PASS | 0ms | 2026-04-27T00:36:08.904Z |
| branch-assessments.test.ts | should list branch assessments by project | PASS | 374ms | 2026-04-27T00:36:09.269Z |
| users.test.ts | should create client and return valid userId | PASS | 344ms | 2026-04-27T00:36:09.299Z |
| users.test.ts | users.createClient | PASS | 345ms | 2026-04-27T00:36:09.299Z |
| branch-assessments.test.ts | should get specific branch assessment | PASS | 52ms | 2026-04-27T00:36:09.312Z |
| branch-assessments.test.ts | Branch Assessment Procedures | PASS | 429ms | 2026-04-27T00:36:09.312Z |
| branch-assessments.test.ts | server/branch-assessments.test.ts | PASS | 429ms | 2026-04-27T00:36:09.312Z |
| audit-logs-integration.test.ts | server/integration/audit-logs-integration.test.ts | PASS | 3ms | 2026-04-27T00:36:09.512Z |
| audit-logs-integration.test.ts | auditLogs Router - Integration Tests | PASS | 2ms | 2026-04-27T00:36:09.512Z |
| audit-logs-integration.test.ts | should have auditLogs router registered | PASS | 1ms | 2026-04-27T00:36:09.512Z |
| audit-logs-integration.test.ts | should have list procedure | PASS | 0ms | 2026-04-27T00:36:09.512Z |
| audit-logs-integration.test.ts | should have get procedure | PASS | 0ms | 2026-04-27T00:36:09.512Z |
| audit-logs-integration.test.ts | should have stats procedure | PASS | 0ms | 2026-04-27T00:36:09.512Z |
| users.test.ts | should list clients | PASS | 358ms | 2026-04-27T00:36:09.648Z |
| users.test.ts | users.listClients | PASS | 358ms | 2026-04-27T00:36:09.648Z |
| users.test.ts | Users Router | PASS | 703ms | 2026-04-27T00:36:09.648Z |
| users.test.ts | server/integration/users.test.ts | PASS | 704ms | 2026-04-27T00:36:09.648Z |
| versionHistory.test.ts | should retrieve specific version from history | PASS | 20780ms | 2026-04-27T00:36:12.907Z |
| versionHistory.test.ts | should maintain version sequence correctly | PASS | 31126ms | 2026-04-27T00:36:44.033Z |
| versionHistory.test.ts | should return empty array when no versions exist | PASS | 362ms | 2026-04-27T00:36:44.396Z |
| versionHistory.test.ts | Version History - Briefing | PASS | 76255ms | 2026-04-27T00:36:44.396Z |
| versionHistory.test.ts | should save action plan version when regenerating | PASS | 30782ms | 2026-04-27T00:37:15.178Z |
| versionHistory.test.ts | should retrieve specific version from history | PASS | 30762ms | 2026-04-27T00:37:45.941Z |
| versionHistory.test.ts | should return empty array when no versions exist | PASS | 11231ms | 2026-04-27T00:37:57.171Z |
| versionHistory.test.ts | Version History - Action Plan | PASS | 72775ms | 2026-04-27T00:37:57.173Z |
| versionHistory.test.ts | should deny access to versions of projects user doesn't have access to | PASS | 52ms | 2026-04-27T00:37:57.214Z |
| versionHistory.test.ts | Version History - Access Control | PASS | 52ms | 2026-04-27T00:37:57.214Z |
| versionHistory.test.ts | server/integration/versionHistory.test.ts | PASS | 149083ms | 2026-04-27T00:37:57.214Z |

## Summary

- **Pass:** 2982
- **Fail:** 182
- **Skipped:** 40
- **Total:** 3204
- **Started:** 2026-04-27T00:35:06.241Z
- **Finished:** 2026-04-27T00:37:57.480Z
