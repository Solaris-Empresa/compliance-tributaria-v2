# Relatório Unificado de Gaps — Cadeia de Valor do Agronegócio (v3 FINAL)

**Data:** 2026-04-30
**Versão:** v3 — consolidação final (Manus + Claude Code + Orquestrador + P.O.)
**Autores:** Manus AI (auditoria datasets/DB/RAG) + Claude Code (auditoria engine/suite/bug) + Orquestrador Claude (estratégia/plano) + P.O. Uires Tapajós (decisão/priorização)
**Commit de referência:** `7eccae1` (HEAD pós-PR #886, suite com 60 cenários, checkpoint `8372d35e`)

---

## 0. O que mudou do v1 para o v3

| Aspecto | v1 (Manus original) | v2 (Orquestrador) | v3 (consolidado) |
|---------|---------------------|-------------------|-------------------|
| Diagnóstico técnico | ✅ correto | ✅ mantido | ✅ mantido + detalhado |
| Métrica | ❌ "% cobertura dataset" enganosa | ✅ "% cenários reais atendidos" | ✅ mantido |
| Estratégia | ❌ dataset-first inflado | ✅ use-case-driven incremental | ✅ mantido |
| Priorização | ❌ 8 PRs paralelos sem ordem | ✅ 3 fases com critério de saída claro | ✅ mantido |
| Gargalo | ❌ Dr. José bloqueia tudo | ✅ separação 3 camadas | ✅ mantido |
| Riscos | ❌ não identificados | ✅ R1–R5 mapeados com mitigação | ✅ mantido |
| Loop operacional | ❌ linear jurídico→técnico | ✅ cliente real → gap → fix → smoke | ✅ mantido |
| Validação automática | ❌ ausente | ✅ `rules_hash` diff obrigatório por PR | ✅ mantido |
| Briefing Dr. José | ✅ completo (14 armadilhas, 3 exemplos) | ✅ simplificado (consultor sob demanda) | ✅ unificado (ambos) |
| Esforço para começar | 3 semanas Classe C com SPEC + ADR | **30min HOJE** (PR-AGRO-1) | **30min HOJE** |

---

## 1. Estratégia Oficial — USE-CASE-DRIVEN

### 1.1 O que NÃO fazer

- ❌ Construir o dataset inteiro antes de servir clientes
- ❌ Esperar Dr. José entregar 7 lotes para começar a implementar
- ❌ Tratar "carne (A48)" e "transporte combustível" com a mesma urgência
- ❌ Acreditar que ausência no dataset = sistema quebrado

### 1.2 O que fazer

- ✅ **Loop incremental:** cliente real → reproduzir no M2 → identificar gap específico → fix mínimo → smoke → deploy
- ✅ Construir só o que cliente atual da carteira do escritório precisa hoje
- ✅ Aproveitar o fallback do engine para os casos que ainda não têm cobertura precisa (sistema não quebra, só dá diagnóstico genérico)
- ✅ Bug crítico (NBS 1.0501 → financeiro) é prioridade absoluta porque **classifica errado**, não porque falta dado

### 1.3 Distinção essencial

| Tipo de problema | Comportamento atual | Severidade real |
|---|---|---|
| **Classificação errada** (ex.: bug 1.0501) | Engine retorna `servico_financeiro` para transportadora | 🔴 Crítica — corrigir AGORA |
| **Cobertura ausente** (ex.: NCM algodão) | Engine cai em fallback genérico, M2 funciona, briefing é menos preciso | 🟡 Incremental — corrigir conforme demanda |
| **Cenário não testado** (ex.: posto de combustível) | Sem regressão automática para esse perfil de cliente | 🟠 Adicionar quando aparecer cliente |

---

## 2. Princípio Operacional — Separação de Responsabilidades

| Camada | Responsável | O que define | Independência |
|---|---|---|---|
| **Estrutura técnica** (schema do dataset, formato YAML, integração engine, testes, validação rules_hash) | Claude Code | Como o dado entra no sistema | Avança SOZINHO — independe de regra jurídica |
| **Regra jurídica** (regime tributário, fonte LC, gap típico setorial, base anterior) | Dr. José + equipe | O conteúdo do regime aplicável | Avança POR LOTE conforme casos reais aparecem |
| **Priorização** (qual cliente atender primeiro, qual gap urgente, quando empurrar) | P.O. (Uires) | Sequência e oportunidade | Decide o ritmo dos outros dois |

**Consequência prática:** Claude Code começa o trabalho técnico (PR-AGRO-1 fix do bug 1.0501) **hoje**, sem esperar Dr. José. Os PRs de dataset puxam Dr. José só quando um cliente real bate.

---

## 3. Diagnóstico Técnico (achados empíricos)

### 3.1 Bug crítico — único item de classificação errada

```typescript
// server/lib/archetype/deriveObjeto.ts:120
["regime_especial|1.0501", "servico_financeiro"],  // ❌ ERRADO
```

NBS divisão **1.0501** na classificação NBS Brasil é **Transporte rodoviário de cargas**. Mapear como `servico_financeiro` faz com que produtor de soja com frete (cenário A45 da suite), transportadora de combustível e transportadora de ração sejam tratados como banco. Esse é o **único item que classifica errado** — todos os outros gaps são de cobertura ausente, que o fallback do engine trata.

### 3.2 Cobertura ausente — não bloqueia, só reduz precisão

| Camada | Estado | O que isso significa na prática |
|---|---|---|
| NCM dataset | 24 entradas, 17 capítulos (`04, 07, 09, 10, 11, 12, 15, 17, 19, 22, 25, 27, 31, 34, 38, 48, 96`) | Capítulos ausentes (02 carnes, 23 ração, 47 celulose, 52 algodão, 84/87 máquinas) → engine cai em fallback `bens_mercadoria_geral`. M2 finaliza com diagnóstico genérico, **não quebra**. |
| NBS dataset | 19 entradas, dominância financeira/profissional | Divisões transporte (1.0501–1.0509) e armazenagem (1.0507) ausentes → engine usa fallback `servico_geral`. **Não quebra**, só genérico. |
| Engine NCM tuples | 13 regras em `REGIME_TUPLE_TO_OBJETO_NCM` | Gaps em chapters 02, 23, 47, 52, 84, 87. Cenários A48/A50 da suite já marcados `expected_fallback: true` — comportamento documentado, não é bug. |
| Engine NBS tuples | 11 regras (1 com bug) | Apenas o bug 1.0501 é classificação errada. Demais gaps são cobertura. |
| CNAE table IBGE (`shared/cnae-table.ts`) | 1332 entradas — **completo** | Sem gap. |
| CNAE artigos map (`server/cnae-articles-map.ts`) | 23 divisões | Divisões 02 (florestal), 28 (máquinas), 29 (veículos) ausentes. Divisão 49 (transporte) genérica demais. Gap real mas não-bloqueante. |
| Suite oficial | 60 cenários, 7 agro (A44–A50), 0 posto/transportadora dedicado | Sem regressão automática para esses perfis quando vierem clientes. |
| RAG corpus | ~55/80 artigos agro cobertos | Artigos ausentes: 172-180 (combustíveis monofásico), 251-270 (regime combustíveis), 393-410 (IS combustível). |
| Risk eligibility | IS bloqueado para `operationType=agronegocio` (ADR-0030 D-6) | Falso negativo para postos/transportadoras de combustível. |

### 3.3 Métrica correta — % de cenários reais atendidos

| Perfil de cliente da carteira | Atendido hoje? | Como? |
|---|---|---|
| Produtor de soja simples (A44) | ✅ | NCM 1201 mapeado, regime correto |
| Produtor de soja com frete (A45) | 🟡 | NCM ok, mas NBS 1.0501 vai para fallback (e classifica errado pelo bug) |
| Cooperativa agrícola (A46) | 🟡 | Fallback genérico funciona |
| Trading exportadora (A47) | 🟡 | Fallback + flags exportação |
| Agroindústria carnes (A48) | 🟡 | `expected_fallback: true` documentado |
| Laticínios (A49) | ✅ | Capítulo 04 mapeado |
| Florestal celulose (A50) | 🟡 | `expected_fallback: true` documentado |
| **Posto de combustível** | ❌ | Sem cenário, sem NCM 2207.10.10, sem NBS 1.1701 |
| **Transportadora carga seca** | ❌ | Sem cenário, NBS 1.0501 mapeada errada |
| **Transportadora combustível** | ❌ | Sem cenário, sem NBS 1.0501.14.51 |
| **Indústria de ração** | ❌ | Sem cenário, NCM 2309 ausente |
| **Produtor de algodão** | ❌ | Sem cenário, NCM capítulo 52 ausente |

**Atendidos hoje:** 2 plenos + 5 com fallback aceitável = 7 de 12 perfis (~58%) — sendo que **0 dos 5 perfis críticos** para o escritório (posto/transportadora/ração/algodão) está pronto.

---

## 4. Riscos Identificados

### 🔴 R1 — Regressão silenciosa do `rules_hash`

Adicionar tuplas em `REGIME_TUPLE_TO_OBJETO_NCM` ou `REGIME_TUPLE_TO_OBJETO_NBS` muda o que o engine retorna para casos pré-existentes. O `rules_hash` canonical (atual `4929516b…e272`) é byte-a-byte invariante — qualquer mudança quebra reprodutibilidade histórica.

**Mitigação:** todo PR de dataset/engine roda `pnpm vitest run tests/archetype-validation/` e exibe diff do `rules_hash` no PR body. Se o hash mudar, o PR exige aprovação explícita do P.O. + nota no CHANGELOG.

### 🔴 R2 — Explosão combinatória

50 NCMs novos × 15 NBS novos × ~30 CNAEs agro = milhares de combinações possíveis. Sem disciplina, suite sobe descontrolada e cenários especulativos. Suite cresce 1–2 cenários por PR, no máximo.

**Mitigação:** cenários representam perfis reais de clientes, não combinações especulativas. Suite cresce 1–2 cenários por PR, no máximo.

### 🟠 R3 — Dependência jurídica como gargalo

Se Dr. José não entregar lote, todo o sprint para. Esse foi o erro estrutural do v1.

**Mitigação:** estrutura técnica avança em paralelo (PR-AGRO-1 fix do bug NÃO depende de Dr. José). Lotes jurídicos viram backlog conforme cliente real entra. P.O. pode pular ordem se urgência muda.

### 🟠 R4 — Desalinhamento com M2 já validado

M2 (Perfil da Entidade) foi validado em 60 cenários incluindo agro genérico. Refazer datasets sem rodar smoke pleno em M2 pode quebrar fluxo já aprovado pelo P.O.

**Mitigação:** todo PR roda smoke M2 em projeto de referência (5 perfis: agro, comercio, servicos, financeiro, industria) antes de merge. Manus reporta resultado no PR.

### 🟡 R5 — Pesquisa jurídica obsoleta

LC 214/2025 já teve LC 244/2024 (cesta básica) e pode ter mais. Anexos publicados pós-vigência. Lote de Dr. José com `versao_texto` errada pode envelhecer mal.

**Mitigação:** todo bloco YAML de Dr. José tem `versao_texto` obrigatório. Auditoria semestral verifica se algum anexo novo invalida regimes antigos.

---

## 5. Plano Executável (priorização use-case-driven)

### 5.1 Fase 1 — Crítica (executar AGORA, paralelo total)

| Item | Tipo | PR | Bloqueio jurídico | Esforço | Por que agora |
|---|---|---|---|---|---|
| Fix bug NBS 1.0501 → tipo `Objeto = "transporte"` + 1 cenário transportadora carga seca | classificação errada | PR-AGRO-1 | **NENHUM** (correção técnica óbvia) | 30min | Bug ativo classifica transportadora como banco. **Único item da fase 1 sem dependência jurídica.** |
| NCM combustível varejo (2207.10.10 etanol, 3826.00.00 biodiesel, complemento 2710.x) + IS combustível + 2 cenários (posto + usina) | cobertura crítica + IS | PR-AGRO-2 | Lote D (Dr. José) | 1h30 | IS combustível é **compliance crítico** — empresa que erra paga multa. Posto de gasolina é cliente real recorrente. |
| NBS transporte (1.0501.10.00, 1.0501.14.51) + 2 cenários transportadora (combustível + ração) | cobertura crítica | PR-AGRO-3 | Lote B (Dr. José) — depende PR-1 | 2h | Cliente real do escritório (frota de combustível). Sem isso, transportadora cai em fallback errado mesmo após fix. |

**Critério de saída Fase 1:** os 5 perfis críticos do escritório (posto, transportadora seca, transportadora combustível, transportadora ração, produtor c/ frete) atendidos com classificação correta.

### 5.2 Fase 2 — Comum (executar conforme demanda real)

| Item | Tipo | PR | Bloqueio jurídico | Esforço | Quando |
|---|---|---|---|---|---|
| NCM ração animal (2304, 2308, 2309) + sementes plantio (1209) + 1 cenário indústria ração | cobertura média | PR-AGRO-4 | Lote C | 1h | Quando aparecer cliente do segmento |
| NCM defensivos completos (3808.91, 3808.93, 3808.94 — só fungicidas mapeados hoje) | cobertura média | PR-AGRO-5 | Lote E | 30min | Quando distribuidor real entrar |
| NCM fertilizantes específicos (3105 NPK além do 3101 genérico) | cobertura média | PR-AGRO-6 | Lote F | 30min | Conforme demanda |

**Critério de saída Fase 2:** segmentos comuns da carteira (ração, defensivos, fertilizantes) atendidos com regime preciso quando cliente entra.

### 5.3 Fase 3 — Edge cases (só se P.O. pedir)

| Item | Tipo | PR | Bloqueio jurídico | Esforço | Trigger |
|---|---|---|---|---|---|
| NCM carnes capítulo 02 + engine tuple → A48 deixa de ser fallback | edge | PR-AGRO-7 | Lote G | 1h | Cliente agroindústria de carnes assina |
| NCM celulose 4703 + engine tuple → A50 deixa de ser fallback | edge | PR-AGRO-8 | Lote H | 30min | Cliente florestal assina |
| NCM máquinas agrícolas (8432, 8433, 8434, 8701) | edge | PR-AGRO-9 | Lote I | 1h | Cliente metal-mecânico agro entra |
| NCM algodão capítulo 52 | edge | PR-AGRO-10 | Lote J | 1h | Produtor de algodão entra |

**Critério de saída Fase 3:** sem critério rígido — só desbloqueia se houver cliente real ou solicitação explícita do P.O.

---

## 6. Loop Operacional Canônico

```
┌──────────────────────────────────────────────────────────┐
│  1. Cliente real entra na carteira do escritório         │
│  2. Manus (ou advogado) reproduz cenário no M2 prod      │
│  3. Identifica gap específico (qual classificação errou) │
│  4. P.O. classifica: bug? cobertura? edge case?          │
│  5. Se bug → fix imediato (Claude Code, sem jurídico)    │
│     Se cobertura → Dr. José monta lote mínimo            │
│     Se edge → backlog                                    │
│  6. Claude Code implementa PR pequeno (Classe A)         │
│  7. Suite + smoke + diff rules_hash → merge              │
│  8. Manus republica + smoke prod                         │
│  9. Volta para o cliente: "agora classifica X corretam." │
│  10. Volta a (1) com próximo cliente                     │
└──────────────────────────────────────────────────────────┘
```

Esse loop respeita Lição #41 (smoke real é gate), Lição #44 (não fazer trabalho sem valor crítico), REGRA-ORQ-21 (caminho C, última spec é formal), REGRA-ORQ-24 (Classe A).

---

## 7. Validação Automática Obrigatória por PR

Antes de cada merge:

1. **`pnpm test`** — unit + integration (zero erro)
2. **`pnpm check`** — TypeScript zero erro
3. **`pnpm vitest run tests/archetype-validation/`** — suite oficial 60+ cenários PASS
4. **Diff `rules_hash`** explícito no PR body:
   - Se invariante (`4929516b…e272`): ok, merge livre
   - Se mudou: aprovação explícita P.O. + nota CHANGELOG + comunicação aos clientes ativos
5. **Smoke Manus em projeto de referência** — 5 perfis (agro, comercio, servicos, financeiro, industria) PASS
6. **Auto-auditoria** PR seguindo template `.github/PULL_REQUEST_TEMPLATE.md`

---

## 8. Briefing Técnico-Jurídico — Equipe Dr. José Rodrigues

### 8.1 Por que essa curadoria existe

A plataforma usa um engine determinístico (`server/lib/archetype/`) que **NÃO consulta LLM** para classificar produtos/serviços. Para cada NCM ou NBS, o engine olha o dataset (`ncm-dataset.json`, `nbs-dataset.json`) e decide:

- Qual regime tributário aplicar (`aliquota_zero`, `reducao_60`, `regime_geral`, `regime_especial`, `condicional`)
- Se há Imposto Seletivo
- Qual o `gap_tipico` que empresas cometem (vira pergunta no questionário do cliente)
- Qual a base normativa (LC 214/2025 + Anexos + EC 132/2023) — vira justificativa no briefing

Sem o regime jurídico definido por advogado tributarista, o engine cai em fallback genérico e o cliente recebe diagnóstico incompleto. **Dr. José é o único elo que pode autorizar uma entrada nova** — Claude Code só transcreve.

### 8.2 Quando Dr. José é acionado (v2 — consultor sob demanda)

Quando P.O. autoriza um PR de cobertura (não de bug). Nesse momento, Manus envia ao Dr. José o template do lote correspondente, **já pré-preenchido com**:

- Lista exata de NCMs/NBSs a curar
- Cenário do cliente real que motivou o lote
- Capítulo da LC 214 a investigar (sugestão Claude Code)

Dr. José só preenche o regime, fonte, gap típico e assina.

### 8.3 O que Dr. José tem que fazer (ciclo de 8 passos)

Para cada lote (A a J na tabela da Seção 5):

1. **Confirmar a NCM/NBS exata** (8 dígitos completos para NCM, 9-11 dígitos para NBS) — não usar capítulo ou divisão genérica
2. **Classificar regime** entre os 5 enumerados (sem inventar variantes)
3. **Citar fonte normativa exata** (Lei + Artigo + Anexo + Inciso quando houver)
4. **Descrever o gap típico** que empresa do setor comete na prática (campo livre ~200 caracteres)
5. **Marcar Imposto Seletivo** (true/false) — se true, citar artigo de instituição
6. **Indicar regime anterior** (ICMS/PIS/COFINS/ISS/IPI antes da reforma) — gera contraste no briefing
7. **Atribuir confiança** (0-100) e tipo (`deterministico` / `regra` / `condicional` / `pending_validation`)
8. **Assinar e datar** (`validado_por: "Dr. José Rodrigues"`, `data_validacao: YYYY-MM-DD`)

### 8.4 Schema de entrega (1 arquivo `.md` por lote)

#### Frontmatter obrigatório

```yaml
---
lote: D
escopo: NCM combustíveis varejo (etanol, biodiesel)
codigos: [2207.10.10, 3826.00.00, 2710.19.31]
cliente_motivador: "Posto Boa Sorte LTDA — entrou na carteira em 2026-04-22"
validado_por: "Dr. José Rodrigues + [advogado co-autor]"
data_validacao: 2026-05-10
fontes_consultadas:
  - LC 214/2025 (texto original)
  - LC 244/2024
  - EC 132/2023
  - Anexo I, III, IX da LC 214/2025
versao_texto_referencia: original_lcp214_2025
---
```

#### Tabela-resumo (visão executiva)

| NCM | Descrição curta | Regime | IS | Confiança | Anexo |
|-----|-----------------|--------|-----|-----------|-------|
| 5201.00.10 | Algodão não cardado/penteado, fibra | regime_geral | false | 95 / regra | — |
| 2207.10.10 | Etanol combustível ≥80% vol | regime_geral | true | 100 / deterministico | — |

#### Bloco completo por código (todos os campos do schema do dataset)

```yaml
ncm_code: "2207.10.10"
descricao: "Álcool etílico não desnaturado, com teor alcoólico ≥ 80% vol — combustível"
setor_economico: "Usinas sucroalcooleiras · distribuidoras · postos · varejo"
regime: "regime_geral"
aliquota: null
imposto_seletivo: true
categoria_is: "combustivel"
instrucao_is: "Sinalizar incidência do IS combustível e natureza monofásica (incidência única na produção/importação). Não determinar sujeito passivo na cadeia no M1 — varia entre usina/distribuidora/posto."
regime_anterior: "ICMS-Combustíveis (monofásico desde EC 33/2001 + LC 192/2022) · CIDE-Combustíveis · PIS/COFINS-Combustíveis · IPI"
impacto_compliance: "alto"
gap_tipico: "Posto que comprava etanol de distribuidora com ICMS pago monofásico assume que IBS/CBS também é monofásico via distribuidora — esquece a apuração IS própria sobre venda ao consumidor final. Não segrega B100 (biodiesel) que tem regime diferente."
confianca:
  valor: 100
  tipo: "deterministico"
fonte:
  lei: "LC 214/2025"
  artigo_is_instituicao:
    numero_compilado: "393"
    numero_original: "409"
    paragrafo_1_inciso: "VIII (combustíveis)"
  artigo_incidencia_unica:
    numero_compilado: "394"
    numero_original: "410"
  versao_texto: "original_lcp214_2025"
status: "confirmado"
validado_por: "Dr. José Rodrigues"
data_validacao: "2026-05-10"
```

### 8.5 Três exemplos completos para calibrar

#### Exemplo 1 — Lote A item 1 (NCM algodão fibra) — regime simples

```yaml
ncm_code: "5201.00.10"
descricao: "Algodão não cardado nem penteado, fibra em rama"
setor_economico: "Cotonicultura · cooperativas · indústria têxtil"
regime: "regime_geral"
aliquota: null
imposto_seletivo: false
regime_anterior: "ICMS (alíquota interestadual 7-12%, intra-SP 18%) · PIS/COFINS cumulativo (3,65%) ou não-cumulativo (9,25%) · FUNRURAL 1,5% sobre receita"
impacto_compliance: "alto"
gap_tipico: "Produtor rural pessoa física que vende para cooperativa não emite NFe e não monitora retenção do FUNRURAL substituto. Cooperativa não calcula crédito presumido para insumo agropecuário não-contribuinte (Art. 9 LC 244/2024)."
confianca:
  valor: 95
  tipo: "regra"
nota_confianca: "Algodão não consta nos Anexos I (cesta básica) nem IX (insumos agropecuários). Regime geral por exclusão. Confirmar se algodão entra no Anexo III (cesta básica nacional ampliada) — pendente publicação."
condicionante: null
instrucao_engine: null
fonte:
  lei: "LC 214/2025"
  artigo: "Art. 9 (fato gerador)"
  paragrafo: "caput"
  incisos: []
  anexo: null
  versao_texto: "original_lcp214_2025"
status: "confirmado"
validado_por: "Dr. José Rodrigues"
data_validacao: "2026-05-10"
```

#### Exemplo 2 — Lote D item 1 (NCM etanol) — Imposto Seletivo

```yaml
ncm_code: "2207.10.10"
descricao: "Álcool etílico não desnaturado, com teor alcoólico >= 80% vol — combustível"
setor_economico: "Usinas sucroalcooleiras · distribuidoras de combustíveis · postos · varejo"
regime: "regime_geral"
aliquota: null
imposto_seletivo: true
categoria_is: "combustivel"
instrucao_is: "Sinalizar incidência do IS combustível e natureza monofásica (incidência única na produção/importação). Não determinar sujeito passivo na cadeia no M1 — varia entre usina/distribuidora/posto."
regime_anterior: "ICMS-Combustíveis (monofásico desde EC 33/2001 + LC 192/2022) · CIDE-Combustíveis · PIS/COFINS-Combustíveis · IPI"
impacto_compliance: "alto"
gap_tipico: "Posto que comprava etanol de distribuidora com ICMS pago monofásico assume que IBS/CBS também é monofásico via distribuidora — esquece a apuração IS própria sobre operação de venda ao consumidor final. Não segrega B100 (biodiesel) que tem regime diferente."
confianca:
  valor: 100
  tipo: "deterministico"
fonte:
  lei: "LC 214/2025"
  artigo_is_instituicao:
    numero_compilado: "393"
    numero_original: "409"
    paragrafo_1_inciso: "VIII (combustíveis)"
    texto_caput: "Fica instituído o Imposto Seletivo, incidente sobre a produção, extração, comercialização ou importação de bens e serviços prejudiciais à saúde ou ao meio ambiente."
  artigo_incidencia_unica:
    numero_compilado: "394"
    numero_original: "410"
  artigo_base_calculo:
    numero_compilado: "395"
  anexo: null
  versao_texto: "original_lcp214_2025"
status: "confirmado"
validado_por: "Dr. José Rodrigues"
data_validacao: "2026-05-10"
```

#### Exemplo 3 — Lote B item 1 (NBS transporte cargas) — fix do bug 1.0501

```yaml
nbs_code: "1.0501.10.00"
descricao: "Serviços de transporte rodoviário de cargas em geral"
setor_economico: "Transportadoras de carga · cooperativas de caminhoneiros · operadores logísticos · frota própria de produtores rurais"
regime: "regime_geral"
subtipo_regime: null              # NÃO É servicos_financeiros (era o bug atual)
imposto_seletivo: false
regime_anterior: "ICMS-Transporte interestadual/intermunicipal (Art. 155 II CF) · ISS apenas para transporte municipal · PIS/COFINS"
impacto_compliance: "alto"
gap_tipico: "Transportadora interestadual emite CT-e com ICMS para UF de origem mas no novo regime IBS é devido para UF do destinatário (tomador). Não possui inscrição nas UFs de destino. Não calcula crédito presumido sobre combustível B100/etanol/diesel."
confianca:
  valor: 98
  tipo: "regra"
nota_confianca: "Transporte rodoviário de cargas não consta nos Anexos diferenciados pesquisados — regime geral por ausência de listagem expressa. Atenção: NBS 1.0501 NÃO é serviço financeiro (bug atual no engine deriveObjeto.ts:120 mapeia errado)."
nota_engine: "Engine deve mapear regime_geral|1.0501 → Objeto = 'transporte' (novo tipo a ser criado em PR-AGRO-1). NÃO confundir com 1.0901 (serviços financeiros)."
fonte:
  lei: "LC 214/2025"
  artigo_local_operacao:
    numero: "11"
    paragrafo: "específico transporte"
    texto: "Para transporte de cargas, o local da operação é o do destinatário"
  artigo_credito_combustivel:
    numero: "47"
    inciso: "X"
    texto: "Crédito sobre aquisição de combustível usado na atividade-fim"
  contraste_regime_anterior: "ICMS Art. 155 II CF: UF de origem → IBS Art. 11 LC 214: UF do destinatário"
  versao_texto: "original_lcp214_2025"
status: "confirmado"
validado_por: "Dr. José Rodrigues"
data_validacao: "2026-05-10"
```

### 8.6 Armadilhas — 14 erros comuns que invalidam um lote

#### 🔴 Críticas (engine quebra ou classifica errado)

| # | Armadilha | Como evitar |
|---|-----------|-------------|
| 1 | Confundir `reducao_60` com "alíquota 60%" | `reducao_60` significa redução de 60% sobre a alíquota cheia → paga 40% da cheia. Não escrever "alíquota 60%". |
| 2 | Usar `aliquota_zero` quando é isenção | `aliquota_zero` mantém direito ao crédito (Art. 47 §1 LC 214). Isenção sem texto expresso vira `regime_geral`. Não há valor enum "isencao" no engine. |
| 3 | `regime_geral` quando deveria ser `condicional` | Se o produto requer registro MAPA/Anvisa/ANP/ANEEL para fruir benefício, é `condicional` com condicionante obrigatória + `regime_se_condicao_cumprida` + `regime_se_condicao_nao_cumprida`. Engine NÃO infere cumprimento. |
| 4 | NCM com 6 dígitos (ex. "5201.00") em vez de 8 ("5201.00.10") | Engine procura 8 dígitos exatos. NCM curta gera fallback. Se o regime cobre toda a posição, listar TODAS as 8 dígitos da posição. |
| 5 | NBS sem ponto separador (ex. "10501100" em vez de "1.0501.10.00") | Engine separa por divisão (4 primeiros dígitos após "1."). Sem o formato canônico, lookup falha. |
| 6 | Marcar `imposto_seletivo: true` sem `categoria_is` e `instrucao_is` | Schema exige os 3 campos juntos. Categoria deve ser uma de: `bebidas_acucaradas`, `combustivel`, `tabaco`, `bens_minerais`, `automoveis_poluentes`, `apostas_jogos`. |

#### 🟠 Médias (qualidade do diagnóstico cai)

| # | Armadilha | Como evitar |
|---|-----------|-------------|
| 7 | `gap_tipico` genérico ("empresa não conhece a lei") | Tem que ser específico do setor: "Posto não segrega B100 do diesel — perde crédito presumido". É essa frase que vira pergunta para o cliente. |
| 8 | Citar artigo sem inciso/parágrafo | LC 214 tem 500+ artigos com múltiplos incisos. "Art. 128" sozinho é insuficiente — usar Art. 128 IX ou Art. 138 §1. |
| 9 | Não citar `versao_texto` | LC 214 já teve emendas (LC 244/2024 cesta básica). Sempre marcar `versao_texto: "original_lcp214_2025"` ou `"pos_lcp244_2024"`. |
| 10 | Misturar competência tributária com regime | Dizer "ICMS para UF" no campo regime — ICMS é tributo antigo, não é regime do IBS/CBS. Esse contexto vai em `regime_anterior` ou `contraste_regime_anterior`. |
| 11 | `regime_anterior` impreciso | "Cobrava ICMS" não basta. Precisa: alíquota efetiva, base legal (LC 87/96, Conv. 100/97 etc.), se era cumulativo/não-cumulativo. Esse texto vira parágrafo do briefing. |

#### 🟡 Sutis (passa no schema mas erra na prática)

| # | Armadilha | Como evitar |
|---|-----------|-------------|
| 12 | Confundir nível NBS | NBS divisão (1.0501) ≠ posição (1.0501.10) ≠ subposição (1.0501.10.00). Engine usa divisão para mapeamento, mas dataset deve trazer o código completo de 11 dígitos para o cliente. |
| 13 | Subnível NBS com regime diferente do superior | Exemplo: 1.0501.10 (cargas em geral, regime_geral) ≠ 1.0501.14.51 (cargas perigosas/combustíveis) — pode ter ANP regulando, virando `regime_especial` ou `condicional`. Pesquisar caso a caso. |
| 14 | Esquecer transição 2026-2032 | Algumas regras só vigem após 2033 (regime pleno). Se o regime descrito é pós-transição, marcar em `nota_confianca`: "Regime aplicável a partir de 2033, na transição 2026-2032 vige regime ICMS/ISS conforme cronograma EC 132". |

### 8.7 Canal de entrega e timing

| O que | Quem entrega | Para quem | Formato | SLA sugerido |
|-------|-------------|-----------|---------|-------------|
| Lote preenchido | Dr. José + equipe | Orquestrador (P.O. Uires) | 1 arquivo `.md` por lote, anexado em comentário no GitHub Issue do PR correspondente, OU enviado por email com cópia ao P.O. | 2 dias úteis por lote pequeno (≤5 códigos), 5 dias por lote grande (>5) |
| Validação pós-implementação (review) | Dr. José | Orquestrador | "Aprovado para merge" no PR após smoke Manus | 1 dia útil |

> **Regra de ouro:** Claude Code NÃO interpreta lacuna nem inventa entrada. Se faltar um campo, devolve o lote com pergunta específica. Se Dr. José disser "use o que está no exemplo", Claude Code recusa e pede explicitação.

### 8.8 Checklist final (Dr. José deve correr antes de entregar cada lote)

- [ ] Frontmatter completo (lote, escopo, códigos, cliente_motivador, validado_por, data, fontes, versao)
- [ ] Tabela-resumo presente com 1 linha por código
- [ ] Bloco completo por código com TODOS os campos (sem `???` ou `TODO`)
- [ ] Cada regime está nos 5 enumerados (sem variantes inventadas)
- [ ] Cada `imposto_seletivo: true` tem `categoria_is` + `instrucao_is`
- [ ] Cada `regime: condicional` tem `condicionante` + 2 ramos (`regime_se_condicao_cumprida` / `nao_cumprida`)
- [ ] Cada NCM tem 8 dígitos no formato `XXXX.XX.XX`
- [ ] Cada NBS tem 11 caracteres no formato `1.XXXX.XX.XX`
- [ ] `fonte.lei` + `fonte.artigo` + `fonte.versao_texto` preenchidos sempre
- [ ] `gap_tipico` é específico do setor (não genérico)
- [ ] `regime_anterior` com base legal e alíquota
- [ ] `confianca.valor` entre 0-100, tipo em [`deterministico`, `regra`, `condicional`, `pending_validation`]
- [ ] `data_validacao` no formato `YYYY-MM-DD`
- [ ] `validado_por` assinado

### 8.9 Resumo executivo para o Dr. José

> "Você (Dr. José + equipe) vai produzir lotes `.md` sob demanda ao longo das próximas semanas. Cada lote tem ~3 a 8 códigos NCM/NBS, motivado por um cliente real que entrou na carteira. Para cada código, decida regime + cite Lei/Artigo/Anexo + escreva 1 frase de gap típico. Não invente regimes. Não simplifique nuances de Imposto Seletivo. Cada lote entregue desbloqueia 1 PR Claude Code (~30min a 2h de implementação). Se faltar 1 campo, o lote volta para você antes de virar código. Total esperado: ~50 códigos curados incrementalmente, gerando cobertura agro/transporte/combustível plena para a carteira."

---

## 9. Tabela Mestre Executável

| # | PR | Tipo | Pré-req | Esforço CC | Esforço Dr. José | Trigger |
|---|---|---|---|---|---|---|
| 1 | PR-AGRO-1 — fix bug 1.0501 + tipo `transporte` + 1 cenário | bug | nenhum | 30min | **0** | **AGORA** |
| 2 | PR-AGRO-2 — NCM combustível + IS + 2 cenários (posto, usina) | cobertura crítica | Lote D | 1h30 | 2 dias úteis | Fase 1 |
| 3 | PR-AGRO-3 — NBS transporte + 2 cenários transportadora | cobertura crítica | PR-1 + Lote B | 2h | 2 dias úteis | Fase 1 |
| 4 | PR-AGRO-4 — NCM ração + sementes + 1 cenário | cobertura média | Lote C | 1h | 2 dias úteis | Cliente real ração |
| 5 | PR-AGRO-5 — NCM defensivos completos | cobertura média | Lote E | 30min | 1 dia útil | Cliente real defensivos |
| 6 | PR-AGRO-6 — NCM fertilizantes NPK | cobertura média | Lote F | 30min | 1 dia útil | Cliente real fertilizantes |
| 7 | PR-AGRO-7 — NCM carnes + tuple chapter 02 | edge | Lote G | 1h | 2 dias úteis | Cliente agroindústria carnes |
| 8 | PR-AGRO-8 — NCM celulose + tuple chapter 47 | edge | Lote H | 30min | 1 dia útil | Cliente florestal |
| 9 | PR-AGRO-9 — NCM máquinas agrícolas | edge | Lote I | 1h | 2 dias úteis | Cliente metal-mecânico |
| 10 | PR-AGRO-10 — NCM algodão capítulo 52 | edge | Lote J | 1h | 2 dias úteis | Produtor de algodão |

**Total estimado se TODO o backlog for executado:** ~10h Claude Code + ~15 dias úteis Dr. José (paralelizado por demanda).
**Total estimado para Fase 1 apenas (cobre os 5 perfis críticos do escritório):** ~4h Claude Code + ~4 dias úteis Dr. José.
**Total estimado para começar HOJE (PR-AGRO-1):** 30min Claude Code + **0 dependência jurídica.**

---

## 10. Tarefas por Ator (todas as fases)

### 10.1 Claude Code

- Implementar PRs Classe A seguindo templates já validados
- Atualizar `RESULT-51-casos-brasil-v3.json` regenerado a cada PR (mitiga drift T3 do standby anterior)
- Bloco "Avaliação de Risco" no PR (Classe A — Tier 3 — dataset puro reversível, ou Tier 2 se mexer engine)
- Diff `rules_hash` no PR body
- Auto-auditoria conforme REGRA-ORQ-15

### 10.2 Manus

- **Banco de dados:** nenhuma migração — datasets são JSON puro carregado em runtime. `pnpm db:push` não necessário em nenhum PR.
- **Code review:** revisão focada em diff de dataset + tuplas
- **Deploy:** republish Manus.space pós-merge com novo SHA, reportando `git=<sha> / checkpoint=<id>` (REGRA-ORQ-25)
- **Smoke browser:** projeto fictício do perfil-alvo, validar archetype + status + briefing
- **Cross-check:** quando cliente real entrar, reproduzir M2 e identificar gap específico (entrada do loop §6)

### 10.3 P.O. (Uires)

- F1/F2 cada issue com 5 labels obrigatórios
- Aprovação SPEC após Dr. José entregar lote (Caminho C — REGRA-ORQ-21)
- Decisão de fase (1/2/3) por cliente real, não por checklist
- F7 smoke pós-deploy → autorizar próximo PR
- REGRA-ORQ-19 auditoria de fim de sessão a cada ≥3 PRs mergeados

### 10.4 Dr. José Rodrigues + equipe

- Lote sob demanda (não em batch antecipado)
- 1 arquivo `.md` por lote no formato §8.4
- Checklist §8.8 antes de entregar
- Resposta a dúvidas Claude Code via comentário no PR (SLA 24h)
- Validação pós-implementação ("aprovado para merge" no PR após smoke Manus, SLA 1 dia útil)

---

## 11. Próximo Passo Concreto

**Hoje:** abrir issue + PR-AGRO-1 (fix bug 1.0501 + tipo `Objeto = "transporte"` + 1 cenário transportadora carga seca). 30min Claude Code, **zero dependência jurídica**, fecha o único item crítico de classificação errada da plataforma.

**Esta semana (se P.O. autorizar):** acionar Dr. José para Lote B (NBS transporte) e Lote D (NCM combustível), ambos endereçando perfis críticos da carteira.

**Daqui em diante:** loop §6 — só fazer o que cliente real precisa.

---

## 12. Referências

[1]: https://www.in.gov.br/en/web/dou/-/lei-complementar-n-214-de-16-de-janeiro-de-2025-607430757 "Lei Complementar nº 214/2025 — Imprensa Nacional"
[2]: https://www.cnabrasil.org.br/storage/arquivos/dtec.nt_3_regulamentacao_reforma_tributaria_PLP68-LC214.21fev2025.VF.pdf "CNA Brasil — Impactos da Reforma Tributária no Agro"
[3]: https://www.conjur.com.br/2025-dez-18/o-produtor-rural-e-os-creditos-presumidos-na-reforma-tributaria/ "Conjur — Produtor rural e créditos presumidos"
[4]: https://www.gov.br/mdic/pt-br/images/REPOSITORIO/scs/decos/NBS/Anexoa_Ia_NBSa_2.0a_coma_alteraa_esa_6.12.18.pdf "MDIC — Nomenclatura Brasileira de Serviços (NBS 2.0)"
[5]: https://painel-website.rolim.com/wp-content/uploads/2025/05/Capitulo-9-Regimes-Especificos-Combustiveis.pdf "Rolim — Regimes Específicos Combustíveis LC 214"

---

## Vinculadas

- BACKLOG_M3.md
- Lições arquiteturais #41–#44 (smoke real é gate, callgraph completo, diagnóstico onde há lacuna)
- REGRA-ORQ-21/22/23/24 (Caminho C, classes A/B/C, tempo-box aprovação)
- REGRA-ORQ-25 (anti-drift SHA Manus.space)
- REGRA-ORQ-26 (branch obrigatória)
- REGRA-ORQ-19 (auditoria fim de sessão)
- ADR-0021/0022 (engine v4 hot swap)

---

*Documento unificado v3 FINAL para decisão do P.O. — não commitado no repositório.*
