# Por que criamos o "Perfil da Entidade" (M2) e o arquétipo para o RAG

> **Status:** Documento canônico — fonte da verdade
> **Versão:** v1.0 (2026-05-01)
> **Aprovação:** P.O. Uires Tapajós
> **Localização final:** `docs/produto/PERFIL-DA-ENTIDADE-FONTE-DA-VERDADE.md`
> **Substitui:** rascunhos dispersos em `docs/governance/audits/`, `docs/epic-830-rag-arquetipo/` e contextos de chat

---

## Sumário executivo (1 minuto de leitura)

O **Perfil da Entidade** é a camada determinística que transforma input do cliente (CNAE, NCM, NBS, regime tributário, território) em **contexto fiscal estruturado e auditável** que alimenta o RAG, o briefing, o motor de riscos e o plano de ação.

Antes do Perfil, o sistema dependia de:

- texto livre na descrição do negócio (ambíguo)
- CNAE isolado (insuficiente)
- keyword matching (frágil)
- LLM inferindo classificação (não-determinístico)

Depois do Perfil, o sistema opera sobre:

- 6 dimensões canônicas determinísticas (objeto, papel na cadeia, tipo de relação, território, regime, subnatureza setorial)
- snapshot imutável e versionado (ADR-0031, ADR-0032)
- rules_hash byte-a-byte invariante (`4929516b...e272`)
- contrato cristalino para downstream (RAG, briefing, riscos, ações)

**Em uma frase:** O Perfil da Entidade existe porque o produto exige 98% de confiabilidade jurídica, e isso é incompatível com LLM inferindo lei tributária a partir de texto livre.

---

## Parte 1 — Visão do P.O. (linguagem de produto)

### 1.1 — O problema que os advogados sentiam

Antes do Perfil da Entidade, os advogados que usavam o SOLARIS reportavam três frustrações recorrentes:

1. **"O sistema confunde minha empresa com outra parecida."**
   Banco digital classificado como "serviço genérico". Transportadora de combustível recebendo Imposto Seletivo (IS) que aplica ao **fabricante**, não ao **transportador**. Distribuidora de medicamentos misturada com farmácia varejista.

2. **"Cada vez que rodo o diagnóstico, vem algo um pouco diferente."**
   Sem perfil canônico, dois diagnósticos do mesmo cliente podiam diferir porque o LLM interpretava a descrição livre de modo distinto. Inaceitável em contexto jurídico.

3. **"Como eu defendo isso para o cliente?"**
   Quando um risco apontava o Art. X da LC 214, o advogado não tinha como rastrear **por que** aquele artigo aplicava àquela empresa. A resposta era um vago "o sistema interpretou".

### 1.2 — O que o produto precisava entregar

Tu (P.O.) cravou a meta com clareza:

> *"Nosso projeto tem a meta 98% de confiabilidade com as informações, por se tratar de lei tributária e fiscal. Só tem um caminho: Determinismo."*

Determinismo significa: **mesmo input → mesmo output, sempre, byte-a-byte**. Significa que o advogado pode olhar para um diagnóstico e justificá-lo passo a passo até a lei.

### 1.3 — A analogia que esclarece

| Analogia | Antes do Perfil | Depois do Perfil |
|---|---|---|
| **GPS sem CEP** | Você diz ao motorista "perto da praça grande, depois da padaria" | Você fornece o CEP exato |
| **Médico sem exame** | "Acho que pode ser X, vou prescrever Y" | "O exame confirma X, prescrevo Y baseado no protocolo Z" |
| **Tribunal sem certidão** | Advogado argumenta com base na lembrança | Advogado apresenta a certidão pública oficial |

O Perfil da Entidade é o "CEP fiscal" da empresa — informação estruturada, auditável, defensável.

### 1.4 — O ganho concreto para o cliente

| Dimensão | Impacto |
|---|---|
| **Previsibilidade** | Mesmo cliente, mesmo perfil → mesmo diagnóstico, sempre |
| **Defensabilidade** | Cada risco vem com cadeia de evidência: NCM → arquétipo → artigo → lei |
| **Personalização real** | Onda 2 (perguntas customizadas) gera questões específicas para banco digital, não para "qualquer serviço" |
| **Auditoria** | Snapshot imutável: o diagnóstico de hoje fica preservado mesmo que o engine evolua amanhã |
| **Transparência** | O cliente vê as 6 dimensões antes de prosseguir e confirma o perfil — nada é "caixa preta" |

---

## Parte 2 — Visão técnica (engenharia)

### 2.1 — Achado empírico que motivou a criação do M2

Auditoria v7.60 (28 de abril de 2026), seção 7.1, identificou:

> 🔴 Achado crítico: M1 v3 → RAG está DESACOPLADO
>
> `retrieveArticles(cnaes, contextQuery, topK)` recebe APENAS lista de CNAEs e string de contexto livre. NÃO recebe nenhum campo do `PerfilDimensional` produzido pelo M1 v3 (objeto, papel_na_cadeia, tipo_de_relacao, territorio, regime, subnatureza_setorial, derived_legacy_operation_type).
>
> Snapshot do M1 (`buildSnapshot`) é persistido em `m1_runner_logs` (tabela de monitoring). **Nenhum router downstream lê essa tabela** para alimentar RAG/briefing/risk-engine.
>
> Caminho real continua sendo o legado: `companyProfile` + `operationProfile` (single-select preenchido pelo `PerfilEmpresaIntelligente.tsx`).

**Tradução técnica:** o engine determinístico (M1 v3) já existia, com 51 cenários validados, mas seu output morria em uma tabela de logs. RAG, briefing e motor de riscos continuavam consumindo o caminho legado (dropdown plano `operationType`).

### 2.2 — Arquitetura conceitual em 5 camadas

```
┌──────────────────────────────────────────────────────────────────┐
│ CAMADA 5 — UI (M2 Perfil da Entidade)                            │
│ /projetos/:id/perfil-entidade                                    │
│ Painel Confiança · 6 dimensões · CTA "Confirmar"                 │
│ ADR-0031: snapshot imutável após confirmação                     │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────────┐
│ CAMADA 4 — PERSISTÊNCIA (projects.archetype)                     │
│ Coluna JSONB no Drizzle schema                                   │
│ archetypeRulesHash · archetypeConfirmedAt · archetypeConfirmedBy │
│ ADR-0032: versionamento + imutabilidade pós-confirmação          │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────────┐
│ CAMADA 3 — ENGINE M1 v3 (server/lib/archetype/)                  │
│ buildPerfilEntidade(input) → { 6 dimensões + rules_hash }        │
│ deriveObjeto, validateConflicts, perfilHash, seedNormalizers     │
│ rules_hash byte-a-byte invariante: 4929516b...e272               │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────────┐
│ CAMADA 2 — INPUT TOKENIZADO (CNAE + NCM + NBS + regime + ...)    │
│ confirmedCnaes · ncmCodes · nbsCodes · operationType · taxRegime │
│ companyProfile (porte, filiais, grupo econômico)                 │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────────┐
│ CAMADA 1 — INPUT BRUTO DO CLIENTE                                │
│ Modal /projetos/novo → CNAEs + NCMs + NBS + regime tributário    │
└──────────────────────────────────────────────────────────────────┘
```

### 2.3 — As 6 dimensões canônicas (ADR-0031)

| Dimensão | O que classifica | Valores possíveis | Função no RAG |
|---|---|---|---|
| **objeto** | O que está economicamente envolvido | combustível, alimento, medicamento, serviço médico, serviço financeiro, mercadoria geral | Filtro principal do retrieval — diferencia "vender combustível" de "transportar combustível" |
| **papel_na_cadeia** | Posição da empresa na cadeia de valor | produtor, fabricante, distribuidor, varejista, transportador, prestador, intermediador | Resolve o caso símbolo: transportador de combustível ≠ fabricante de combustível |
| **tipo_de_relacao** | Como a empresa se relaciona com o objeto | venda, serviço, produção, intermediação, locação | Diferencia operação ativa de mediação |
| **territorio** | Onde a operação ocorre | municipal, interestadual, internacional, ZFM, ALC | Habilita regimes especiais (Zona Franca, exportação) |
| **regime** | Regime tributário escolhido | simples_nacional, lucro_presumido, lucro_real, regime_específico | Define quais artigos da LC 214 aplicam |
| **subnatureza_setorial** | Setor regulado específico | financeiro, transporte, combustíveis, agro, saúde, telecom, energia | Habilita órgão regulador (BCB, ANP, ANTT, ANATEL, ANS) |

Adicionalmente, o snapshot inclui o campo derivado `orgao_regulador` (BCB, ANP, ANTT, ANATEL, ANS, ANEEL), inferido a partir de subnatureza_setorial + papel_na_cadeia.

### 2.4 — Por que dimensional e não classificação plana

ADR-0031, linhas 7-13:

> O modelo atual tende a classificar empresas por categorias fixas, como "transportadora" ou "distribuidora", gerando:
> - explosão combinatória de regras
> - ambiguidades semânticas, especialmente entre operar, vender, transportar e intermediar
> - erros de elegibilidade, como a aplicação indevida de Imposto Seletivo para transportadora de combustível

**Insight fundamental** (Epic #830 README):

> Vocês estão construindo um sistema de **decisão**, não de **classificação**.
>
> Em vez de mapear empresa → categoria fixa (classificação, que explode em combinações), aplicar regras determinísticas por dimensão independente e compor o resultado (decisão).

**Exemplo canônico:** combustível + transportador + serviço → **não contribuinte de IS** (resolve o erro recorrente de aplicar IS para transportadora de combustível, que tributariamente é prestador de serviço, não fabricante).

### 2.5 — Estratégia em 2 fases

| Fase | Sprint | O que faz | RAG é alterado? |
|---|---|---|---|
| **M2** (✅ concluída) | Persistência | Persiste o archetype (snapshot M1) em `projects.archetype` — imutável (ADR-0031), versionado (ADR-0032) | NÃO altera o RAG |
| **M3** (🟡 próxima) | Consumo | `retrieveArticles` passa a aceitar `PerfilDimensional` opcional. Briefing, riscos e plano de ação leem `projects.archetype` em vez do legado | SIM (refactor incremental) |

A separação em 2 fases foi proposital: persistir primeiro garante que o snapshot existe e é confiável; consumir depois permite refactor incremental sem quebrar o RAG existente (2.515 chunks LC 214/2025 preservados intactos).

---

## Parte 3 — Tabela comparativa: Antes × Depois

### 3.1 — Visão técnica

| Aspecto | Antes do Perfil da Entidade | Depois do Perfil da Entidade |
|---|---|---|
| **Input do RAG** | `retrieveArticles(cnaes, contextQuery, topK)` — texto livre + CNAEs | `retrieveArticles(cnaes, contextQuery, topK, perfilDimensional?)` — adicionado vetor de 6 dimensões |
| **Fonte de classificação** | LLM inferindo a partir de descrição | Engine determinístico (M1 v3) com 51 cenários validados |
| **Determinismo** | Não-determinístico (mesma entrada pode gerar saídas diferentes) | 100% determinístico — `rules_hash` byte-a-byte invariante |
| **Rastreabilidade** | "O sistema interpretou" — caixa preta | Cadeia completa: NCM → arquétipo → categoria → artigo → gap → risco |
| **Persistência** | `companyProfile` + `operationProfile` mutáveis | `projects.archetype` JSONB imutável + `archetypeRulesHash` + `archetypeConfirmedAt` |
| **Caso símbolo: transportadora de combustível** | Recebia IS (errado — IS aplica ao fabricante) | Identifica papel_na_cadeia=transportador → não recebe IS |
| **Caso: banco digital** | "Serviço genérico" — perdia regulação BCB | subnatureza_setorial=financeiro + orgao_regulador=BCB → puxa artigos específicos |
| **Caso: produtor de soja** | Keyword "agro" genérica | papel_na_cadeia=produtor + objeto=alimento + subnatureza=agro |
| **Auditabilidade** | Sem rastreabilidade do classificador | Snapshot imutável + versionamento (ADR-0032) |
| **Onda 2 (questionário customizado)** | Perguntas genéricas baseadas em CNAE | Perguntas específicas combinando regime + papel + território |
| **Score CPIE** | Dependia de inferência LLM | 100% determinístico (DEC-SWAP-05) |

### 3.2 — Visão do P.O. (impacto no produto)

| Cenário cliente | Antes | Depois |
|---|---|---|
| **Banco digital com Pix** | "Diagnóstico de serviço genérico — verifique enquadramento" | "Operadora regulada BCB, regime Lucro Real, IBS/CBS sobre serviços financeiros (Art. X), regime de não-cumulatividade aplicável" |
| **Transportadora de etanol** | Risco de IS sobre etanol — alerta crítico errado | Não-contribuinte de IS (papel=transportador), risco real é ANTT compliance |
| **Importadora de eletrônicos** | Alíquota padrão IBS/CBS | Identificação automática de produtos com alíquota reduzida (Anexo XIV) + regime de drawback |
| **Construtora com incorporação** | Perguntas genéricas sobre serviços | Perguntas específicas: incorporação direta vs construção por administração + regime de patrimônio de afetação |
| **Distribuidora de alimentos** | Lista exaustiva de NCMs sem priorização | Cesta básica (Anexo I, alíquota zero) priorizada + IS sobre bebidas açucaradas |
| **Clínica médica** | "Serviço de saúde" | Regime diferenciado Art. 29 + alíquota reduzida medicamentos + IBS sobre serviços + ANS quando aplicável |
| **Mineradora exportadora** | Carga tributária genérica | Imunidade exportação (Art. 156-A §3º) + IS sobre minério + diferimento ICMS interestadual |
| **Empresa em ZFM** | Tratamento fiscal padrão | Manutenção de incentivos ZFM até 2032 (Art. 92 ADCT) + IBS reduzido |

### 3.3 — Pergunta vs resposta — antes e depois

**Pergunta do advogado:** *"Por que esse risco aplica à minha empresa cliente?"*

**Antes:**
> "O sistema gerou esse risco com base nas respostas do questionário e no contexto da empresa. A confiança é de 78%."

**Depois:**
> "Sua empresa cliente foi classificada como `papel_na_cadeia=distribuidor`, `objeto=alimento`, `subnatureza=cesta_básica`, `regime=lucro_presumido`. O risco identificado vem da regra GAP-AZ-001 (Alíquota Zero não-aproveitada), que combina essas 4 dimensões e referencia o Art. 14 da LC 214/2025. Confiabilidade: 98% — verificável no snapshot imutável do dia DD/MM/AAAA, hash `4929516b...`."

---

## Parte 4 — Fluxo End-to-End (E2E)

### 4.1 — Fluxo completo do cliente

```
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 1 — Cliente cria projeto                                  │
│ /projetos/novo                                                  │
│ Inputs: nome empresa, CNAEs, NCMs, NBS, regime, território      │
└──────────────────────────────────┬──────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 2 — Confirmação CNAEs                                     │
│ Modal de validação com checklist                                │
│ Status: rascunho → cnaes_confirmados                            │
└──────────────────────────────────┬──────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 3 — Perfil da Entidade (M2) ⭐ ETAPA NOVA                  │
│ /projetos/:id/perfil-entidade                                   │
│ Engine M1 v3 calcula 6 dimensões                                │
│ Painel Confiança exibe resultado                                │
│ Cliente confirma → projects.archetype gravado IMUTÁVEL          │
│ rules_hash byte-a-byte invariante                               │
│ Status: cnaes_confirmados → perfil_entidade_confirmado          │
└──────────────────────────────────┬──────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 4 — Onda 1 (questionário SOLARIS curado)                  │
│ Perguntas filtradas por cnaeGroups                              │
│ Status: perfil_entidade_confirmado → onda1_solaris              │
└──────────────────────────────────┬──────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 5 — Onda 2 (questionário IA Generativa) ⭐ USA ARQUÉTIPO   │
│ LLM gera perguntas combinando archetype + regime + território   │
│ Banco digital: perguntas BCB + IBS/CBS financeiro               │
│ Transportadora: perguntas ANTT, NÃO IS                          │
│ Status: onda1_solaris → onda2_iagen                             │
└──────────────────────────────────┬──────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 6 — Questionários condicionais                            │
│ tipo=produto → questionario_produtos (NCM)                      │
│ tipo=serviço → questionario_servicos (NBS)                      │
│ tipo=misto   → ambos                                            │
└──────────────────────────────────┬──────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 7 — Diagnóstico CNAE (Onda 3 regulatório)                 │
│ retrieveArticles(cnaes, contextQuery, topK, perfilDimensional)  │
│ ⭐ M3 PRÓXIMA: aceitar PerfilDimensional opcional                │
│ Status: ... → diagnostico_cnae                                  │
└──────────────────────────────────┬──────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 8 — Briefing                                              │
│ briefingEngine lê projects.archetype (M3)                       │
│ Inclui rastreabilidade dimensional                              │
│ Status: diagnostico_cnae → briefing                             │
└──────────────────────────────────┬──────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 9 — Matriz de Riscos                                      │
│ gap-engine + risk-engine consomem archetype                     │
│ Cada risco com cadeia: arquétipo → gap → artigo                 │
│ Status: briefing → matriz_riscos                                │
└──────────────────────────────────┬──────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 10 — Plano de Ação                                        │
│ Para cada risco: N planos COSO (mitigar/transferir/aceitar)     │
│ Status: matriz_riscos → plano_acao → aprovado                   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 — Fluxo de dados (data flow)

```
[Inputs cliente]
      ↓
[Engine M1 v3 (server/lib/archetype/buildPerfilEntidade.ts)]
      ↓
{ objeto, papel_na_cadeia, tipo_de_relacao, territorio, regime, subnatureza_setorial,
  orgao_regulador, derived_legacy_operation_type, rules_hash }
      ↓
[projects.archetype (JSONB) + archetypeConfirmedAt + archetypeRulesHash]
      ↓
[M3: retrieveArticles(cnaes, query, topK, perfilDimensional?)]
      ↓
[RAG retrieval com filtros dimensionais]
      ↓
[gap-engine.ts → GapConfirmed[]]
      ↓
[risk-engine-v4 → risks_v4]
      ↓
[action_plans + tasks]
```

### 4.3 — Pontos de validação (gates)

| Gate | O que valida | Quem valida | Quando |
|---|---|---|---|
| **G1 — Engine determinístico** | Suite 60 cenários, rules_hash byte-a-byte | CI automatizado | Cada PR que toca engine |
| **G2 — Snapshot imutável** | archetype não pode ser alterado pós-confirmação | Drizzle constraint + teste | Cada PR de schema |
| **G3 — Smoke real** | Fluxo end-to-end em produção | P.O. + Manus SQL | Pós-deploy crítico |
| **G4 — Defensabilidade jurídica** | Advogado consegue rastrear risco → artigo | Dr. José Rodrigues | UAT Round 2+ |

---

## Parte 5 — Caso símbolo: transportadora de combustível

### 5.1 — Por que este é o caso símbolo

Esse caso resume todos os problemas de classificação plana e mostra como o modelo dimensional resolve. Foi o **caso de uso que motivou** ADR-0031.

### 5.2 — Cenário

Empresa cliente: **TransCombustíveis Ltda.**
- CNAE 4930-2/03 (transporte rodoviário de carga, exceto produtos perigosos)
- Movimenta etanol e diesel para distribuidoras
- Não é produtor de combustível
- Não é distribuidor (apenas frete)

### 5.3 — Tratamento antes do Perfil

```
Sistema lê: CNAE 4930 + NCM 2207 (etanol) + NCM 2710 (diesel)
LLM infere: "Empresa relacionada a combustível"
Categoria atribuída: imposto_seletivo (Art. 2 LC 214/2025)
Risco gerado: "Apuração de IS sobre combustível não realizada"
Severidade: ALTA
```

**Erro:** IS aplica ao **fabricante/produtor** de combustível, não ao **transportador**. Empresa recebe alerta crítico errado, advogado precisa explicar manualmente que não aplica.

### 5.4 — Tratamento depois do Perfil

```
Engine M1 v3 lê:
  CNAE 4930 + NCM 2207/2710 + operationType=service
Calcula:
  objeto: "combustível"
  papel_na_cadeia: "transportador"
  tipo_de_relacao: "serviço"
  territorio: "interestadual"
  regime: "lucro_presumido"
  subnatureza_setorial: "transporte" + "combustíveis"
  orgao_regulador: "ANTT" + "ANP"

Regra dimensional:
  IF papel_na_cadeia="transportador" AND tipo_de_relacao="serviço"
  THEN não-contribuinte de IS (combustível é objeto da carga, não da operação)

RAG retrieval com filtros:
  ANTT regulamentos + ANP (transporte de produtos perigosos)
  IBS sobre serviços de transporte interestadual
  NÃO traz Art. 2 (IS sobre combustível)

Riscos gerados:
  - ANTT compliance (RNTRC ativo)
  - IBS/CBS sobre frete interestadual (Art. 15)
  - Manifesto eletrônico (MDF-e)
```

**Resultado:** diagnóstico correto, defensável, alinhado à realidade da empresa.

### 5.5 — Tabela cenário-resposta

| Pergunta | Antes | Depois |
|---|---|---|
| Empresa contribui IS? | "Provável — recomenda-se análise" | "Não — papel é transportador" |
| Risco prioritário? | IS (errado, severidade ALTA) | ANTT compliance (correto) |
| Quem valida? | Advogado precisa corrigir manualmente | Sistema entrega correto |
| Confiabilidade declarada? | 78% | 98% |
| Auditável? | Não — caixa preta | Sim — snapshot rules_hash |

---

## Parte 6 — Histórico de decisões (cronologia)

### 6.1 — Timeline dos marcos

| Data | Evento | Documento | Decisão |
|---|---|---|---|
| **2026-03-26** | AS-IS to TO-BE | `1_2-CLAUDE--as-is--to-be-v1_00.md` | Tu cravou rastreabilidade obrigatória em toda a cadeia (perguntas → riscos → ações) |
| **2026-03-27** | Sprint K (3 Ondas) | E6 issues #K-1..K-4 | Onda 2 precisa customizar perguntas por perfil |
| **2026-03-31** | ADR-0002 | `docs/adr/0002-arquitetura-3-ondas-perguntas.md` | Campo `fonte` (regulatorio/solaris/ia_gen) no QuestionSchema |
| **2026-04-01** | DEC-M3-01 | docs governance | NCM/NBS condicionais por tipo de empresa (produto/serviço/misto) |
| **2026-04-06** | ADR-0007 | docs adr | Completude ≠ confiança ≠ cobertura — 3 dimensões separadas |
| **2026-04-08** | DEC-SWAP-05 + AUDIT-C-004 | docs governance | Score CPIE-B 100% determinístico (sem LLM) |
| **2026-04-10** | Sprint Z-07 | docs sprints | LLM eliminado da identificação de riscos — só redige texto |
| **2026-04-16** | Determinism architecture | docs governance | Engine puro: severity, urgency, type, article, breadcrumb sempre determinísticos |
| **2026-04-28** | Auditoria v7.60 | `docs/governance/audits/v7.60-2026-04-28-bundle-m1-corpus-gate.md` | 🔴 Achado: M1 v3 desacoplado do RAG |
| **2026-04-28** | ADR-0031 | `docs/epic-830-rag-arquetipo/adr/ADR-0031-modelo-dimensional.md` | Modelo dimensional 5+ eixos |
| **2026-04-28** | ADR-0032 | `docs/epic-830-rag-arquetipo/adr/ADR-0032-imutabilidade-versionamento.md` | Snapshot imutável + versionamento |
| **2026-04-28** | SPEC M2 v3 | `docs/specs/m2-perfil-entidade/README.md` | Inserir `/projetos/:id/perfil-entidade` entre confirmação CNAE e questionário |
| **2026-04-29 a 30** | PRs #871-#886 | GitHub PRs | Implementação engine financeiro, NBS gate, deriveObjeto |
| **2026-05-01** | Step 4 GO efetivo | Smoke 6c + M3-PROMPT-0-BIS | Habilitação global M2_PERFIL_ENTIDADE_ENABLED=true |
| **2026-05-01** | PR-J Fase 2b | PR #894 | Refactor estrutural seedNormalizers (Lição #32 endereçada) |
| **2026-05-01** | Smoke regressivo PR-J | Validação P.O. equipe_solaris | PASS 10/10 + 8/8 — refactor sem regressão |

### 6.2 — Decisões formais consolidadas

| ID | Decisão | Status |
|---|---|---|
| DEC-M2-08 | onda3_rag não existe — destino completeOnda2 é diagnostico_corporativo | ✅ |
| DEC-M2-12 | diagnostic_completeness_status ≠ evaluation_confidence | ✅ |
| DEC-M3-01 | NCM/NBS condicionais por inferCompanyType | ✅ |
| DEC-SWAP-05 | Score CPIE-B 100% determinístico | ✅ |
| ADR-0031 | Modelo dimensional 5+ eixos | ✅ |
| ADR-0032 | Imutabilidade + versionamento snapshot | ✅ |
| SPEC M2 v3 | /projetos/:id/perfil-entidade | ✅ Implementado |

---

## Parte 7 — Estado atual (baseline pós PR-J)

### 7.1 — HEAD em produção

| Item | Valor |
|---|---|
| origin/main SHA | `50afed6` (pós-merge #896) |
| Checkpoint Manus.space | `89c4581e` |
| M2_PERFIL_ENTIDADE_ENABLED | `true` (global) |
| rules_hash invariante | `4929516bb51f737a041eda96385a71debdbbf5c8d1ad2544ff8d18096e86e272` |
| Total projects (orgânico) | 985 |
| Total users | 16.537 |
| RAG corpus | 2.515 chunks LC 214/2025 |
| archetype confirmados (limpo) | 0 (pós-cleanup smoke 2580001) |

### 7.2 — PRs Sprint M3 mergeados nesta sessão

| PR | Tipo | Conteúdo |
|---|---|---|
| #889 | Docs | CI secrets gap analysis |
| #890 | Governança | LICOES_ARQUITETURAIS.md (#41-#45) |
| #891 | Decisão | cpie_analysis_history decision doc |
| #892 | Investigação | PR-J Fase 1 pré-análise |
| #893 | Tests | PR-J Fase 2a snapshots gates de regressão |
| #894 | Refactor | PR-J Fase 2b extract seedNormalizers |
| #895 | Fix CI | PR-FIX-1 SEVERITY_TABLE snapshot defensivo |
| #896 | Fix CI | PR-FIX-2 graceful skip DB tests via CI_HAS_TEST_DB |

**Total sessão histórica:** 21 PRs mergeados (13 sessão original + 8 Sprint M3).

### 7.3 — Validações empíricas Step 4 GO efetivo

| Validação | Resultado | Data |
|---|---|---|
| Smoke 6c financeiro SEM NBS | ✅ PASS 10/10 + 8/8 | 2026-04-30 |
| M3-PROMPT-0-BIS Caminho B JWT | ✅ PASS HTTP 200 | 2026-04-30 |
| Smoke regressivo PR-J Fase 2 | ✅ PASS 10/10 + 8/8 | 2026-05-01 |
| rules_hash byte-a-byte | ✅ Invariante 3x | 3 validações |

---

## Parte 8 — Backlog (o que falta para completar o ciclo)

### 8.1 — Pendências de produto (priorizadas)

#### Prioridade 1 — Destravar cliente real

| # | Item | Esforço | Razão |
|---|---|---|---|
| 1 | **PR-LISTCLIENTS-FIX** | Classe A ~30min | Sem isso, role=cliente não usa M2 (BUG-listClients bloqueia dropdown) |

#### Prioridade 2 — M3 Consumo do arquétipo no RAG (objetivo principal do epic)

| # | Item | Esforço | Tipo |
|---|---|---|---|
| 2 | **M3-RAG-01** Refactor `retrieveArticles` para aceitar `PerfilDimensional` opcional | Classe B ~4h | Implementador |
| 3 | **M3-RAG-02** `briefingEngine` lê `projects.archetype` em vez de `companyProfile` legado | Classe B ~3h | Implementador |
| 4 | **M3-RAG-03** `gap-engine` consome dimensões para regras (papel × objeto × território) | Classe B ~4h | Implementador |
| 5 | **M3-RAG-04** Smoke E2E completo: novo projeto → archetype → RAG dimensional → briefing → riscos | P.O. + Manus | ~30min |

#### Prioridade 3 — Operacional crítica (CI/governança)

| # | Item | Esforço | Owner |
|---|---|---|---|
| 6 | **Issue #873** abordagem A+C (mocks + transaction rollback) | ~5h Classe B | Manus |
| 7 | **Issue #875** cleanup retroativo (16k+ users sintéticos) | Classe C com gates | Manus |
| 8 | **cpie_analysis_history** Opção A revisada | ~30min Classe A | Claude Code |

#### Prioridade 4 — Bugs latentes M2

| # | Item | Esforço | Tipo |
|---|---|---|---|
| 9 | **PR-H** 3 bugs ALTOS adapter (BUG-5/6/7 abrangencia/import/export) | Classe B ~6h | Implementador |
| 10 | **PR-I** 5 bugs MÉDIOS regime/ZFM | Classe B ~4h | Implementador |
| 11 | **PR-FIN-OBJETO-V3** generalização setores regulados (saúde/energia/telecom) | Reativo | Conforme trigger |

#### Prioridade 5 — UX/cosméticos

| # | Item | Esforço | Tipo |
|---|---|---|---|
| 12 | **PR-G** PC-04 fix UX tela branca | Classe C com SPEC + ADR | Sprint dedicada |

#### Prioridade 6 — Validação contínua

| # | Item | Esforço | Quando |
|---|---|---|---|
| 13 | Smokes 7-10 setores regulados progressivos | ~10-15min cada | Reativo conforme carteira |
| 14 | Lições #1-#40 consolidação | ~2-3h Classe A | Sprint dedicada futura |
| 15 | TAX_REGIME_ALIASES vs SNAKE_TO_LABEL — bug ou design? | Decisão produto | Após PR-H/I |
| 16 | PR-FIX-3 LLM tests sem OPENAI_API_KEY | ~30min Classe A | Sprint dedicada futura |

#### Prioridade 7 — Governança

| # | Item | Esforço |
|---|---|---|
| 17 | BACKLOG_M3.md atualizar status PRs | ~15min Classe A |
| 18 | Lições #46-#49 a registrar (4 novas desta sessão) | ~30min Classe A |

### 8.2 — Roadmap Epic Perfil da Empresa (consolidado)

```
[Marco 1: M1 Arquétipo determinístico]                        ✅ CONCLUÍDO
   └─ Engine puro NCM/CNAE → archetype canonical
   └─ Suite 60 cenários byte-a-byte
   └─ rules_hash invariante

[Marco 2: M2 Perfil Entidade UI]                              ✅ CONCLUÍDO
   └─ Painel Confiança 6 dimensões
   └─ CTA confirmação + ADR-0031 imutável
   └─ Step 4 GO efetivo (flag global)

[Marco 3: Cliente real ponta-a-ponta]                         🔄 EM CURSO
   ├─ ✅ Backend (guard M2 aceita role=cliente)
   ├─ ✅ Engine (financeiro sem NBS funciona)
   ├─ ⏳ Frontend (BUG-listClients bloqueia)
   └─ ⏳ Smoke real role=cliente (pós PR-LISTCLIENTS)

[Marco 4: M3 RAG consome arquétipo] ⭐ PRÓXIMO MARCO PRINCIPAL ⏸️
   ├─ Refactor retrieveArticles
   ├─ briefingEngine lê archetype
   ├─ gap-engine usa dimensões
   └─ Smoke E2E completo dimensional

[Marco 5: Robustez setores regulados]                         ⏸️
   ├─ Saúde · Energia · Telecom · Combustíveis · Transporte
   (Trigger PR-FIN-OBJETO-V3 reativo)

[Marco 6: Cobertura bugs latentes M2]                         ⏸️
   ├─ PR-H (3 bugs ALTOS)
   └─ PR-I (5 bugs MÉDIOS)

[Marco 7: UX polishing M2]                                    ⏸️
   └─ PR-G PC-04

[Marco 8: Operacional saudável]                               ⏸️
   ├─ Issue #873 CI prod isolation
   ├─ Issue #875 cleanup
   └─ CI 100% verde
```

---

## Parte 9 — Lições aprendidas (#41 a #49)

### 9.1 — Lições registradas formalmente (#41-#45)

Disponíveis em `docs/governance/LICOES_ARQUITETURAIS.md`:

- **#41** Smoke real é gate de release efetivo (não opcional)
- **#42** Reporte de smoke deve explicitar caso testado vs caso real esperado
- **#43** Engine multi-camada exige callgraph completo
- **#44** Pré-análise é diagnóstico onde há lacuna, não ritual obrigatório
- **#45** Despachos paralelos exigem isolamento de working tree (HEAD único)

### 9.2 — Lições novas a registrar (#46-#49)

A serem incluídas em PR docs futuro:

- **#46** Validar empiricamente o estado de ambiente antes de propor guard. Variáveis de ambiente, secrets configurados e estado de infra precisam ser confirmados (não assumidos) — guard pode ser cosmético ou ineficaz
- **#47** Validações empíricas P.O. devem ser explicitamente mapeadas no plano de sprint. Cada PR deve indicar (a) validação CI, (b) validação P.O. browser/SQL, (c) qual user/role é viável dado bloqueios atuais
- **#48** Issue de CI prod isolation (#873) bloqueia cobertura runtime de várias suites integration. 213 testes falhando = cobertura efetiva muito menor que parece. Priorizar destrava cobertura real
- **#49** Análise estática de duplicação deve verificar escopo lexical, não só similaridade textual. Constantes em escopo de função não podem ser exportadas sem refactor — distinção crítica para planejar fases

---

## Parte 10 — Fontes oficiais

### 10.1 — Documentos primários

| Documento | Conteúdo |
|---|---|
| `docs/governance/audits/v7.60-2026-04-28-bundle-m1-corpus-gate.md` §7.1 | Achado empírico: M1 desacoplado de RAG |
| `docs/epic-830-rag-arquetipo/README.md` | Insight "decisão > classificação" |
| `docs/epic-830-rag-arquetipo/adr/ADR-0031-modelo-dimensional.md` | Decisão formal modelo dimensional |
| `docs/epic-830-rag-arquetipo/adr/ADR-0032-imutabilidade-versionamento.md` | Política de snapshot imutável |
| `docs/epic-830-rag-arquetipo/specs/CANONICAL-RULES-MANIFEST.md` | Regras determinísticas por dimensão |
| `docs/specs/m2-perfil-entidade/README.md` | Por que M2 vira tela no fluxo |
| `docs/governance/GOV-PRE-M1-EXPLORACAO-GOVERNADA.md` | Processo que governou exploração |
| `docs/governance/LICOES_ARQUITETURAIS.md` | Lições #41-#45 (registradas) |
| `docs/governance/BACKLOG_M3.md` | Backlog atualizado pós M2 |

### 10.2 — Fontes secundárias (insumos desta consolidação)

| Fonte | Origem |
|---|---|
| Relatório Manus (parte técnica) | Sessão 2026-05-01 |
| Relatório Consultor (parte estratégica) | Sessão 2026-05-01 |
| Histórico Claude Orquestrador | conversation_search 2026-03-27 a 2026-05-01 |
| Validações smoke 6c + regressivo PR-J | Sessão P.O. + Manus 2026-05-01 |

---

## Parte 11 — Resposta consolidada à pergunta original

> **"Por que criamos o Perfil da Entidade (Arquétipo) para o RAG?"**

**Resposta em três níveis:**

### Nível 1 — Uma frase

O Perfil da Entidade existe porque o produto exige 98% de confiabilidade jurídica, e isso é incompatível com LLM inferindo lei tributária a partir de texto livre.

### Nível 2 — Um parágrafo

Criamos o Perfil da Entidade para transformar input bruto do cliente (CNAE, NCM, NBS, regime, território) em um vetor determinístico de 6 dimensões fiscais auditáveis (objeto, papel na cadeia, tipo de relação, território, regime, subnatureza setorial). Sem ele, o RAG operava com keywords e contexto livre — gerando casos como "transportadora de combustível recebendo IS", "banco digital classificado como serviço genérico", e diagnósticos diferentes para o mesmo cliente em rodadas distintas. Com ele, cada risco vem com cadeia de evidência completa: NCM → arquétipo → categoria → artigo → gap → risco → ação. O snapshot é imutável (ADR-0031), versionado (ADR-0032), e o `rules_hash` é byte-a-byte invariante. Defensável em juízo, auditável historicamente.

### Nível 3 — Um documento (este)

Vide Partes 1-10 acima.

---

## Aprovação e governança

| Papel | Responsabilidade |
|---|---|
| **P.O. (Uires Tapajós)** | Aprovação final + commit no repositório como fonte da verdade |
| **Orquestrador (Claude)** | Geração e consolidação do documento |
| **Manus** | Insumo técnico (relatório de auditoria v7.60) |
| **Consultor (ChatGPT)** | Insumo estratégico (linguagem de produto) |

**Status:** ⏳ Aguardando aprovação final do P.O. para commit em `docs/produto/PERFIL-DA-ENTIDADE-FONTE-DA-VERDADE.md`.

**Pós-aprovação:** este documento substitui rascunhos dispersos, vira fonte única da verdade, e é referenciado por toda decisão futura sobre o Epic Perfil da Empresa.

---

*Documento gerado pelo Orquestrador Claude — 2026-05-01*
*IA SOLARIS Compliance Tributária · LC 214/2025*
*Versão 1.0 · 2026-05-01*
