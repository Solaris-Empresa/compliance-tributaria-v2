# Epic — Auditoria + Refatoração: Gate de Elegibilidade no `risk-categorizer`

**Criado:** 2026-04-21
**Categoria:** tech-debt · compliance · governança
**Motivador:** bug confirmado do IS em transportadora revela padrão estrutural
**Prioridade:** 🔴 alta (impacto jurídico em clientes reais)
**Responsáveis sugeridos:** Orquestrador (spec) · Claude Code (impl) · Manus (deploy/UAT) · P.O. (validação)

---

## 1. Contexto

### 1.1 Bug comprovado

**Cenário:** empresa transportadora (não produtora) recebe categoria `imposto_seletivo` no briefing porque o texto da descrição menciona "combustível".

**Causa raiz:** `server/lib/risk-categorizer.ts` atribui categoria por **keyword match** sem verificar **sujeição passiva** (quem é o contribuinte do tributo segundo a lei).

### 1.2 Hipótese técnica forte

O mesmo padrão de implementação existe nas **10 categorias** do arquivo. Fragilidade sistêmica, não bug isolado.

> O erro não é "o sistema recupera a lei errada". O erro é: **o sistema encontra texto juridicamente verdadeiro, mas aplica a categoria ao contribuinte errado.**

### 1.3 Evidência no código (auditoria rápida)

`risk-categorizer.ts` linha 68+ — função `categorizeRisk(input: RiskCategorizationInput)`.

**Input recebido:**
- `description`, `lei_ref`, `topicos`, `domain`, `category`, `type`

**O que o input NÃO contém:**
- ❌ CNAE(s) da empresa
- ❌ `operationType` (produto / serviço / misto)
- ❌ `principaisProdutos` / `principaisServicos`
- ❌ Papel na cadeia (produtor · distribuidor · varejista · consumidor final · transportador)
- ❌ Porte ou regime tributário
- ❌ Qualquer sinal de **elegibilidade jurídica**

**Conclusão do audit de código:** nenhuma categoria hoje consegue distinguir *"o texto menciona X"* de *"a empresa é sujeito passivo de X"*.

---

## 2. Matriz de risco — 10 categorias

Classificação preliminar (a validar individualmente):

| # | Categoria | Depende de sujeito passivo? | Keywords atuais | Risco falso-positivo | Severidade |
|---|---|---|---|---|---|
| 1 | `imposto_seletivo` | ✅ **FORTEMENTE** (só produtor/importador de bens sujeitos) | destilado · cigarro · tabaco · bebida alcoólica · veículo+combustível · arts. 2-4 | 🔴 **alto** (bug confirmado) | 🔴 P0 |
| 2 | `regime_diferenciado` | ✅ **FORTEMENTE** (enquadramento formal: saúde, educação, agro, financeiro) | saúde · medicamento · educação · ensino · agro · rural · seguro · financeiro | 🔴 alto | 🔴 P0 |
| 3 | `aliquota_zero` | ✅ **FORTEMENTE** (NCM/NBS específico + papel na cadeia) | alíquota zero · isenção · isento | 🟠 médio-alto | 🟠 P1 |
| 4 | `aliquota_reduzida` | ✅ **FORTEMENTE** (NCM/NBS + categoria) | alíquota reduzida · redução · 50% + alíquota | 🟠 médio-alto | 🟠 P1 |
| 5 | `split_payment` | ⚠️ **PARCIAL** (obrigação geral, mas com exceções por meio de pagamento) | split payment · recolhimento automático · split | 🟡 médio | 🟡 P2 |
| 6 | `ibs_cbs` | 🟢 **NÃO** (todos contribuintes entram) | ibs · cbs · LC 214 · contribuição sobre bens | 🟢 baixo | 🟢 P3 |
| 7 | `cadastro_fiscal` | 🟢 **NÃO** (obrigação geral) | inscrição · cadastro · CNPJ · registro | 🟢 baixo | 🟢 P3 |
| 8 | `obrigacao_acessoria` | ⚠️ **PARCIAL** (MEI não emite NF-e, etc) | NF-e · SPED · eSocial · nota fiscal · declaração | 🟡 baixo-médio | 🟡 P2 |
| 9 | `transicao` | 🟢 **NÃO** (afeta todos) | arts. 25-30 · 2026 · 2032 · transição | 🟢 baixo | 🟢 P3 |
| 10 | `enquadramento_geral` | — (fallback) | n/a | n/a | — |

**Leitura da matriz:** 4 categorias P0/P1 concentram ~90% do risco de falso-positivo jurídico. 3 categorias P3 são baixo risco mas devem ser auditadas para confirmar.

---

## 3. Arquitetura proposta (alta-nível, a detalhar em ADR)

### 3.1 Princípio

**Separar deteção textual de atribuição de categoria.**

A detecção textual (keyword match atual) produz **candidatos**. Um **gate de elegibilidade** decide se a empresa é sujeito passivo antes de atribuir a categoria.

### 3.2 Novo fluxo proposto

```
 RAG (chunks) + Gap
        │
        ▼
  detectaCandidatos()          ← keyword match (o que existe hoje)
        │
        ▼
 checkElegibilidade(empresa)   ← NOVO
   - CNAE
   - operationType
   - principaisProdutos/Serviços
   - papel na cadeia
        │
        ▼
  categoria aplicada OU     ← decisão final
  categoria descartada
        │
        ▼
 registra em project_risks_v3
```

### 3.3 Novo input (proposto)

```ts
interface RiskCategorizationInput {
  // existente (detecção textual)
  description?: string | null;
  lei_ref?: string | null;
  topicos?: string | null;
  domain?: string | null;
  category?: string | null;
  type?: string | null;

  // NOVO (elegibilidade)
  empresa?: {
    cnaes?: string[];
    operationType?: "produto" | "servico" | "misto";
    principaisProdutos?: Array<{ ncm_code: string }>;
    principaisServicos?: Array<{ nbs_code: string }>;
    papelNaCadeia?: "produtor" | "distribuidor" | "varejista" | "transportador" | "consumidor_final";
    porte?: "mei" | "microempresa" | "pequena" | "media" | "grande";
  };
}
```

### 3.4 Gate de elegibilidade por categoria (exemplos)

| Categoria | Regra de elegibilidade proposta |
|---|---|
| `imposto_seletivo` | `operationType=produto` AND `principaisProdutos` contém NCM em tabela IS (2203-2208 bebidas · 2401-2403 tabaco · 2710 combustível [produtor/importador, NÃO transportador] · 8703 veículos) AND papel ∈ {produtor, importador} |
| `regime_diferenciado` (saúde) | CNAE seção Q (saúde) OU NCM em tabela medicamentos |
| `regime_diferenciado` (educação) | CNAE seção P (educação) |
| `regime_diferenciado` (agro) | CNAE seção A (agricultura) |
| `regime_diferenciado` (financeiro) | CNAE seção K (atividades financeiras) |
| `aliquota_zero` (cesta básica) | NCM na tabela cesta básica LC 214/2025 Art. 9 E empresa comercializa (produto+varejista/distribuidor) |
| `aliquota_reduzida` | NCM/NBS em lista explícita Art. X |
| `split_payment` | Recebe pagamento digital (cartão/PIX/marketplace) — excluir dinheiro/boleto puro |
| `ibs_cbs` | Todo contribuinte sujeito → sempre ✅ |
| `cadastro_fiscal` | Todo contribuinte sujeito → sempre ✅ |
| `obrigacao_acessoria` | Excluir MEI para NF-e, regras específicas por porte |
| `transicao` | Todo contribuinte sujeito → sempre ✅ |

---

## 4. Backlog de issues

### Ordem sugerida (respeitando dependências)

#### Fase 1 — Discovery (sem código)

**Issue 1 — Mapeamento analítico das 10 categorias**
- **Escopo:** rodar auditoria formal de cada categoria, validar matriz seção 2, produzir **documento de padrões** por categoria
- **Entregável:** `docs/specs/risk-categorizer-audit.md` com matriz validada + evidências por categoria (citar artigo da LC, casos de borda)
- **Sem código.** Pura análise.

**Issue 2 — ADR: Gate de elegibilidade na categorização de riscos**
- **Escopo:** decisão arquitetural — separar detecção de atribuição, novo input enriquecido, contrato de retorno
- **Entregável:** `docs/adr/ADR-XXXX-gate-elegibilidade-categorizer.md`
- Baseia-se no produto da Issue 1

#### Fase 2 — Refatoração base (com código)

**Issue 3 — Refatoração `risk-categorizer.ts`: aceitar contexto da empresa**
- **Escopo:** ampliar `RiskCategorizationInput` com novo campo `empresa?`, introduzir helper `checkElegibilidade(candidato, empresa)`, preservar comportamento atual quando `empresa` é `undefined` (backward-compat)
- **Entregável:** código + testes unitários
- **Feature flag:** `CATEGORIZER_ELEGIBILIDADE_ENABLED=false` default → opt-in durante transição
- **Depends on:** Issue 2

**Issue 4 — Helper `inferPapelNaCadeia(projeto)`**
- **Escopo:** função que infere papel (produtor · distribuidor · varejista · transportador · consumidor final) a partir de CNAE + operationType + descrição
- **Entregável:** `server/lib/papel-na-cadeia.ts` + testes
- **Depends on:** Issue 2

**Issue 5 — Tabela NCM→sujeito passivo IS**
- **Escopo:** dataset canônico mapeando NCMs sujeitos ao IS (bebidas, tabaco, combustível, veículos) + papel exigido (produtor/importador)
- **Entregável:** `decision-kernel/datasets/ncm-imposto-seletivo.json` + loader
- **Pode reaproveitar dataset existente em `decision-kernel/datasets/`.**

#### Fase 3 — Fix por categoria (ordem de prioridade)

**Issue 6 — 🔴 P0: Fix `imposto_seletivo` (BUG COMPROVADO)**
- **Escopo:** aplicar gate de elegibilidade para IS — empresa só recebe categoria se for produtor/importador E NCM estar em lista canônica
- **Critério de aceite:** transportadora mencionando "combustível" NÃO recebe categoria IS (bug original do user)
- **Testes:** 5 cenários (produtor de bebida ✅, distribuidor de bebida ❌, transportador ❌, varejista ❌, importador de veículo ✅)
- **Depends on:** Issues 3, 4, 5
- **Monitoramento pós-deploy:** audit_log registra cada "categoria IS aplicada" com decisão de elegibilidade

**Issue 7 — 🔴 P0: Fix `regime_diferenciado`**
- Similar ao anterior, mas com 4 sub-categorias (saúde · educação · agro · financeiro) validadas por CNAE
- **Casos de borda:** empresa de TI vendendo para hospital ≠ regime saúde

**Issue 8 — 🟠 P1: Fix `aliquota_zero`**
- Validar NCM em tabela cesta básica + papel na cadeia (comerciante, não consumidor)

**Issue 9 — 🟠 P1: Fix `aliquota_reduzida`**
- Similar ao P1 anterior com NCM+NBS

**Issue 10 — 🟡 P2: Fix `split_payment`**
- Validar meios de pagamento aceitos

**Issue 11 — 🟡 P2: Fix `obrigacao_acessoria`**
- Validar porte (MEI) e regime

**Issue 12 — 🟢 P3: Auditar `ibs_cbs` · `cadastro_fiscal` · `transicao`**
- Categorias "universais" — confirmar que aplicam a todos, mas rodar o mesmo gate para consistência arquitetural

#### Fase 4 — Backfill e observabilidade

**Issue 13 — Backfill de riscos existentes**
- **Escopo:** rodar nova lógica sobre `project_risks_v3` existentes e flaggar (não deletar) riscos que passam a ser classificados como "não elegível"
- **Entregável:** script de backfill + coluna nova `elegibilidade_status` (aplicável | nao_aplicavel | revisao_pendente)
- **Sem destruição** — apenas marcação. P.O. revisa antes de remover.

**Issue 14 — Dashboard de observabilidade**
- **Escopo:** métricas de false positives pós-fix por categoria
- **Entregável:** endpoint tRPC + tela admin com: `categoria_atribuida / empresa_elegivel / taxa_revisao`

**Issue 15 — Remoção do gate-flag após estabilização**
- Após 30 dias com dashboard estável: remover `CATEGORIZER_ELEGIBILIDADE_ENABLED` flag (vira default sempre-ativo)

---

## 5. Critérios de aceite globais do Epic

| # | Critério | Como validar |
|---|---|---|
| CA-1 | Transportadora mencionando "combustível" não recebe categoria IS | Teste E2E bug original |
| CA-2 | Empresa de TI que vende para hospital não recebe `regime_diferenciado` saúde | Teste E2E |
| CA-3 | Taxa de false-positive por categoria mensurada no dashboard | Issue 14 |
| CA-4 | Backward-compat: projetos antigos continuam com os riscos já gerados (flaggados, não deletados) | Issue 13 |
| CA-5 | Todas as 10 categorias têm gate de elegibilidade OU razão explícita para serem universais | Issues 6-12 |
| CA-6 | Feature flag funciona como rollback instantâneo durante transição | Issue 3 |
| CA-7 | Tempo médio de resposta da `categorizeRisk` não degrada > 20% com novo gate | Benchmark pós-impl |
| CA-8 | Audit_log grava decisão de elegibilidade em cada categorização | Issue 3+6+ |

---

## 6. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Gate muito restritivo pode excluir categorias legítimas (false negative) | 🟡 média | 🔴 alto (cliente sem análise relevante) | Feature flag + dashboard antes de tornar default |
| Tabela NCM→IS pode estar desatualizada | 🟡 média | 🟠 médio | Curadoria jurídica documentada + versionamento |
| Breakage em testes legados | 🟠 alta | 🟡 médio | Backward-compat mantido quando `empresa` é `undefined` |
| Performance degradada por queries adicionais | 🟢 baixa | 🟡 médio | Cache em memória do contexto empresa; medição no CA-7 |
| Briefings aprovados ficam inconsistentes com nova lógica | 🟡 média | 🟡 médio | Backfill flag, não deleta (Issue 13) |

---

## 7. Estimativa preliminar

| Fase | Issues | Esforço estimado | Dependências externas |
|---|---|---|---|
| 1 (Discovery) | 2 issues | 3-5 dias | Validação com jurídico |
| 2 (Refatoração base) | 3 issues | 5-7 dias | Tabela IS curada |
| 3 (Fix por categoria) | 7 issues | 10-15 dias | Sequencial por prioridade |
| 4 (Backfill + observabilidade) | 3 issues | 5-7 dias | Dashboard admin |
| **Total Epic** | **15 issues** | **~4-5 semanas** | — |

Obs: dependente de alocação do Orquestrador + validação jurídica por fase.

---

## 8. Referências

### Arquivos de código afetados (confirmados via grep)
- `server/lib/risk-categorizer.ts` (núcleo — 185 linhas)
- `server/routers/riskEngine.ts` (consumidor principal)
- `server/z02b-risk-categorizer-integration.test.ts` (testes existentes)
- `server/pr375-div-z01-004-005.test.ts` (testes históricos)
- `scripts/validate-z07-scenarios.mjs` (validação automática)
- `scripts/gate-z07-m02-m03.mjs` + `scripts/gate-z07-m01.mjs` (gates CI)

### Documentação histórica
- `docs/divergencias/DIV-Z01-005-split-payment-categoria-nao-aprovada.md` (precedente)
- `.github/MANUS-GOVERNANCE.md` (regras de implementação)

### Auditorias relacionadas
- `docs/governance/audits/v7.54-2026-04-21-v1-confianca-encerramento.md` (V1 Confiança)
- `docs/governance/audits/v7.56-2026-04-21-uat-v1-parcial.md` (UAT parcial)

---

## 9. Pergunta aberta para o Orquestrador

1. **Papel na cadeia — modelagem:** campo livre preenchido pelo usuário? Ou inferido 100% automático? Ou híbrido (inferido + usuário pode corrigir)?
2. **Tabela NCM→IS:** quem cura? Jurídico SOLARIS? Dataset externo (SIF/RFB)?
3. **Prioridade da ordem de fix:** segue a prioridade P0/P1/P2 do documento ou P.O. tem preferência diferente?
4. **Gate de elegibilidade no LLM também?** hoje o LLM tem "REGRAS DE ARTIGOS CRÍTICOS — GATILHOS SEMÂNTICOS" nos prompts do briefing. Devem receber o mesmo tratamento?
5. **Backfill destrutivo ou não?** flaggar (Issue 13) ou deletar riscos obsoletos?

---

**Criado por:** Claude Code (2026-04-21)
**Branch origem:** `docs/backlog-risk-categorizer-elegibilidade`
**Formato:** Epic spec — para ser instanciado como Epic no GitHub Projects pelo Orquestrador
