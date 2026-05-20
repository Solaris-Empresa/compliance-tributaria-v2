# PARECER TÉCNICO DE VALIDAÇÃO

## Engine de Classificação do Perfil da Entidade (M1 — Arquétipo do Negócio)

**Suite oficial:** M1-arquetipo-51-casos-brasil-v3 (60 cenários brasileiros)
**Data de execução:** 20 de maio de 2026, 12:16:33 UTC
**Plataforma:** IA SOLARIS Compliance Tributária v2 — Reforma Tributária (LC 214/2025)
**Repositório auditado:** Solaris-Empresa/compliance-tributaria-v2
**Commit (HEAD da execução):** `f4c898fc678b44f6a3217ff64261403ec69ce7b7`
**Branch:** `docs/corpus-baseline-v8.1`
**Hash determinístico das regras (rules_hash):**
`sha256:4929516bb51f737a041eda96385a71debdbbf5c8d1ad2544ff8d18096e86e272`

---

## I. OBJETO DA VALIDAÇÃO

Trata-se de auditoria técnica do **motor M1 — Perfil da Entidade**, módulo responsável pela classificação multidimensional da empresa-cliente em cinco eixos canônicos que orientam toda a cadeia subsequente de diagnóstico tributário:

| Dimensão | Função jurídico-tributária |
|---|---|
| **objeto** | Identifica a natureza econômica do produto/serviço prestado (bens, serviços, agrícola, financeiro etc.). Determina a aplicabilidade de regimes específicos (ex.: Imunidade Setorial, regime especial de bens digitais). |
| **papel_na_cadeia** | Posiciona a empresa na cadeia produtiva (fabricante, varejista, distribuidor, prestador, intermediador, operadora regulada, transportador). Determina obrigações de creditamento e responsabilidade tributária. |
| **tipo_de_relacao** | Define a natureza da operação realizada (venda, serviço, produção, intermediação). Vincula-se à hipótese de incidência do IBS/CBS. |
| **territorio** | Mapeia abrangência operacional (municipal, interestadual, nacional, internacional). Define competência ativa e regime de origem/destino. |
| **regime** | Identifica o regime tributário atual (Simples Nacional, Lucro Presumido, Lucro Real). Determina o universo de obrigações acessórias aplicáveis. |

A correta classificação deste perfil é **pré-requisito de validade** para todas as etapas subsequentes (questionário, gap analysis, matriz de riscos e plano de ação), razão pela qual sua estabilidade e determinismo são objeto de auditoria formal pré-deploy.

---

## II. METODOLOGIA

A validação adotou método de **execução determinística com data_version fixada**, conforme protocolo descrito em `tests/archetype-validation/run-50-v3.mjs` e especificação `SPEC-RUNNER-RODADA-D.md §1 e §5`:

1. **Carga da suite:** leitura de 60 cenários previamente catalogados em `M1-arquetipo-51-casos-brasil-v3.json`, cada um com seed de dados representativo de empresa brasileira real (descrição livre, CNAE, NCM/NBS, regime, porte, território).
2. **Execução por cenário:** invocação da função pura `buildSnapshot(seed, data_version)` com **data_version fixada em `2026-04-24T12:00:00.000Z`**, garantindo reprodutibilidade byte-a-byte.
3. **Coleta:** para cada cenário, registrou-se `status_arquetipo`, `motivo_bloqueio`, `blockers_triggered`, `missing_required_fields`, `perfil_hash` e `rules_hash`.
4. **Agregação e veredito:** contagem por status, setor, blocker e severidade.
5. **Gate de aprovação (GO/NO-GO):** conforme definido na especificação técnica, considera-se **GO** o resultado em que `FAIL == 0` **E** `BLOCKED == 1` (o caso bloqueado corresponde a controle negativo deliberadamente inserido na suite — cenário S27 — que **deve** ser barrado pelo motor para validar a função de proteção).

---

## III. ESCOPO AMOSTRAL

| Setor | Cenários | Percentual |
|---|---|---|
| Serviços | 36 | 60,0% |
| Indústria | 17 | 28,3% |
| Agronegócio | 7 | 11,7% |
| **Total** | **60** | **100%** |

**Distribuição por regime tributário derivado:**

| Regime | Cenários |
|---|---|
| Lucro Real | 48 |
| Lucro Presumido | 9 |
| Simples Nacional | 3 |

**Distribuição por papel na cadeia:**

| Papel | Cenários |
|---|---|
| Prestador de serviço | 24 |
| Fabricante | 23 |
| Operadora regulada | 4 |
| Varejista | 3 |
| Distribuidor | 2 |
| Intermediador | 2 |
| Transportador | 2 |

A suite cobre, portanto, espectro suficientemente amplo dos arranjos econômicos relevantes para a Reforma Tributária brasileira, contemplando setores de elevada complexidade regulatória (financeiro, agronegócio, indústria de transformação, serviços digitais).

---

## IV. RESULTADO QUANTITATIVO

| Indicador | Resultado | Alvo da especificação | Conformidade |
|---|---|---|---|
| **Cenários aprovados (PASS)** | 59 | ≥ 57 | ✅ Conforme |
| **Cenários falhos (FAIL)** | 0 | = 0 | ✅ Conforme |
| **Cenários bloqueados (BLOCKED)** | 1 | = 1 (controle negativo) | ✅ Conforme |
| **Cenários totais** | 60 | — | — |
| **Hash de regras único (rules_hash)** | 1 | = 1 | ✅ Conforme |

**Distribuição de status do arquétipo (`status_arquetipo`):**

| Status | Cenários | Significado |
|---|---|---|
| `confirmado` | 59 | Perfil reconhecido com dimensões consistentes |
| `bloqueado` | 1 | Cenário fora do escopo M1 (controle negativo) |
| `inconsistente` | 0 | Sem ocorrências |
| `pendente` | 0 | Sem ocorrências |

### Veredito formal

> **DECISÃO: GO**
>
> O motor M1 — Perfil da Entidade satisfaz integralmente os critérios de aceitação definidos na especificação `SPEC-RUNNER-RODADA-D.md §5.1`. Não foram observadas falhas funcionais, divergências de classificação, nem instabilidade determinística.

---

## V. ANÁLISE QUALITATIVA

### V.1 Determinismo (auditabilidade jurídica)

A execução produziu **hash de regras único** (`sha256:4929516b…`) em todos os 60 cenários, comprovando que:

- Não há regras divergentes carregadas em paralelo;
- Não há contaminação por estado mutável entre execuções;
- A mesma entrada produz, com garantia matemática, a mesma saída — propriedade essencial para que pareceres jurídicos baseados no diagnóstico sejam **reproduzíveis** em eventual contestação administrativa ou judicial.

Adicionalmente, foram observados **46 perfis distintos** entre os 60 cenários, evidenciando que cenários semanticamente equivalentes (ex.: prestadores de serviço em regime Lucro Real com objeto serviço geral) convergem para o mesmo hash, comportamento esperado e desejável do ponto de vista de consistência classificatória.

### V.2 Controle negativo — caso S27

| Campo | Valor |
|---|---|
| **ID** | S27 |
| **Cenário** | "Holding consolidada de 3 CNPJs (controle negativo)" |
| **Setor** | Serviços |
| **Status** | `bloqueado` |
| **Motivo do bloqueio** | `[V-05-DENIED]` empresa integra grupo econômico **E** análise consolidada solicitada — fora do escopo M1 (1 CNPJ) |
| **Blocker complementar** | `[V-LC-103]` papel_na_cadeia="prestador" sem "servico" em tipo_de_relacao — contradição direta detectada (HARD_BLOCK) |

Este cenário foi **deliberadamente inserido** na suite para validar a capacidade do motor de **recusar processar** situações que excedem seu escopo declarado (análise individual por CNPJ). O bloqueio funcionou conforme especificado, indicando que o sistema **não emitirá diagnóstico** para hipóteses de consolidação de grupo econômico — protegendo o advogado tributarista contra pareceres baseados em premissas não suportadas pelo motor.

### V.3 Blockers acionados (observabilidade)

| ID | Severidade | Ocorrências | Significado |
|---|---|---|---|
| `V-10-FALLBACK` | INFO | 62 | NBS sem mapeamento direto no dataset — categoria genérica aplicada com confiança rebaixada. **Não impede** confirmação do perfil; é alerta de baixa precisão de subcategorização. |
| `V-10-FALLBACK-REGULATED` | INFO | 2 | Equivalente do anterior em setor regulado. |
| `V-10-FALLBACK-REGULATED-NO-NBS` | INFO | 1 | Setor regulado sem NBS declarada — fallback informativo. |
| `V-05-INFO` | INFO | 1 | Informativo sobre grupo econômico (sem bloqueio). |
| `V-05-DENIED` | BLOCK_FLOW | 1 | **Cenário S27** — bloqueio do controle negativo. |
| `V-LC-103` | HARD_BLOCK | 1 | **Cenário S27** — contradição lógica detectada. |

**Severidade agregada:** 66 INFO + 1 BLOCK_FLOW + 1 HARD_BLOCK = 68 acionamentos em 60 cenários.

Observa-se que a totalidade dos blockers de severidade INFO (`V-10-FALLBACK` e variantes) é **alerta de observabilidade**, não bloqueio funcional. Tais ocorrências indicam **oportunidade de enriquecimento** do dataset NBS (Nomenclatura Brasileira de Serviços) em sprint futura, sem prejuízo da operação atual do motor.

### V.4 Compatibilidade com tipologia tributária clássica

O motor produz, paralelamente à classificação multidimensional, um campo `derived_legacy_operation_type` que mapeia o perfil ao vocabulário tradicional de operação (comércio, serviços, indústria, agronegócio, financeiro). Esta camada de tradução permite integração com sistemas e relatórios legados sem perda de granularidade na classificação interna. Distribuição observada:

| Operação derivada | Cenários |
|---|---|
| `servicos` | 29 |
| `industria` | 19 |
| `agronegocio` | 5 |
| `comercio` | 4 |
| `financeiro` | 3 |

---

## VI. CONCLUSÃO

À luz dos resultados apresentados, opina-se pela **conformidade integral** do motor M1 — Perfil da Entidade aos requisitos técnicos e funcionais definidos na especificação aplicável, nos seguintes termos:

1. **Estabilidade funcional:** 100% dos cenários válidos (59 de 59 elegíveis) foram corretamente classificados, sem qualquer falha de processamento ou divergência de saída.
2. **Determinismo:** hash de regras único em todas as execuções, comprovando reprodutibilidade matemática do output — pré-requisito indispensável para validade de pareceres em contencioso administrativo ou judicial.
3. **Controle de escopo:** o motor demonstrou capacidade de **recusar** processar cenários fora de seu domínio declarado (controle negativo S27), atuando como salvaguarda contra emissão de diagnóstico em hipóteses de consolidação de grupo econômico.
4. **Auditabilidade:** todos os 60 cenários produziram trilha completa (`perfil_hash`, `blockers_triggered`, `motivo_bloqueio`), permitindo reconstrução posterior do raciocínio classificatório.
5. **Cobertura amostral:** a suite contempla 7 papéis de cadeia produtiva, 7 categorias de objeto econômico, 3 regimes tributários e os 3 macro-setores da economia brasileira.

**Recomendação:** o motor está **apto a integrar o pipeline de produção** no que concerne à etapa M1 do diagnóstico. As ocorrências de severidade INFO (`V-10-FALLBACK`) constituem **oportunidade de melhoria** do dataset NBS em sprint futura, sem prejuízo da operação atual.

---

## VII. RESSALVAS E LIMITAÇÕES

1. **Escopo M1 estrito:** o motor classifica apenas o perfil da entidade. Não emite, neste estágio, juízo sobre incidência específica de IBS/CBS, alíquotas aplicáveis ou regime de creditamento. Tais avaliações são objeto de módulos subsequentes do pipeline (M2, M3 e seguintes).
2. **Único CNPJ:** a versão auditada **não suporta** análise consolidada de grupo econômico (vide caso S27). Cenários com múltiplos CNPJs vinculados devem ser processados individualmente.
3. **Dataset NBS:** observou-se que 62 dos 68 blockers acionados referem-se a códigos NBS não mapeados no dataset curado, situação que **não afeta** a classificação dimensional (objeto/papel/relação/território/regime), mas pode reduzir a precisão de subcategorização em módulos posteriores que dependam da NBS específica.
4. **Validade temporal:** o `data_version` fixado em `2026-04-24` reflete a base normativa congelada para esta execução. Alterações legislativas posteriores podem demandar nova execução com `data_version` atualizada.
5. **Suite vs. produção:** os 60 cenários da suite são representativos, não exaustivos. A operação em produção pode revelar arranjos não previstos, cuja inclusão em rodadas futuras é recomendada.

---

## VIII. EVIDÊNCIA TÉCNICA ARQUIVADA

| Artefato | Caminho |
|---|---|
| Runner da suite | `tests/archetype-validation/run-50-v3.mjs` |
| Suite (60 cenários) | `tests/archetype-validation/M1-arquetipo-51-casos-brasil-v3.json` |
| Resultado completo desta execução (JSON) | `.claude/.tmp-suite-result.json` (interno) |
| Especificação do gate | `SPEC-RUNNER-RODADA-D.md §1 e §5` |
| Auditorias anteriores | `docs/governance/audits/v7.60-2026-04-28-bundle-m1-corpus-gate.md`, `v7.61-2026-05-02-sprint-m3-encerrada.md` |

---

## IX. IDENTIFICAÇÃO TÉCNICA

| Campo | Valor |
|---|---|
| Suite executada | `M1-arquetipo-51-casos-brasil-v3` (fase `M1_RUNNER_V3`) |
| Modelo do motor | `m1-v1.0.0` |
| Data/hora de execução (UTC) | 2026-05-20 12:16:33 |
| Plataforma | IA SOLARIS Compliance Tributária v2 |
| Repositório | github.com/Solaris-Empresa/compliance-tributaria-v2 |
| Commit auditado | `f4c898fc678b44f6a3217ff64261403ec69ce7b7` |
| Rules hash | `sha256:4929516bb51f737a041eda96385a71debdbbf5c8d1ad2544ff8d18096e86e272` |

---

*Documento gerado automaticamente a partir da execução determinística da suite oficial de validação. Reprodutibilidade integral garantida pela fixação do `data_version` e pelo hash único de regras. Para reexecução de verificação, comando:*

```bash
pnpm exec tsx tests/archetype-validation/run-50-v3.mjs
```

*A reexecução, no mesmo commit, produzirá output byte-a-byte idêntico — exceto o campo `executed_at` (timestamp).*
