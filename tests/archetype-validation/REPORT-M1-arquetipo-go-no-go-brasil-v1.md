# Relatório — Suite `M1-arquetipo-go-no-go-brasil-v1`

> Executado em 2026-04-23 · runner `tests/archetype-validation/run.mjs` · 15 cenários
> Tipo: **teste determinístico de papel** (paper test). Não há código de produção do form novo — o runner avalia a suite contra as regras declaradas (core fields + conditional rules) **como se o form já estivesse implementado conforme a SPEC**.

---

## Veredito

**🟢 GO** — 15/15 cenários produzem `status_arquetipo = "valido"` com todos os campos obrigatórios (core + condicionais) presentes.

**Caveat:** há 6 cenários com **desalinhamento entre `expected_open_blocks` declarados e blocos derivados pelas regras**. Não falham a suite (são blocos a mais, não a menos), mas indicam que a spec dos testes sub-declara blocos. Ver Seção "Findings".

---

## Resumo por cenário

| ID  | Cenário | Resultado | `status_arquetipo` | Observação |
|-----|---------|-----------|--------------------|------------|
| T01 | Saúde regulada — operadora de plano de saúde | ✅ PASS | valido | Bloco extra derivado: `nbs`, `regimes_especiais`, `territorial_expandido` |
| T02 | Farmácia regulada — varejo de medicamentos | ✅ PASS | valido | Bloco extra derivado: `regimes_especiais` |
| T03 | Distribuidora de combustíveis | ✅ PASS | valido | Bloco extra derivado: `territorial_expandido` |
| T04 | Transporte rodoviário de produtos perigosos | ✅ PASS | valido | — |
| T05 | Instituição de pagamento / fintech | ✅ PASS | valido | Bloco extra derivado: `nbs`, `regimes_especiais`, `cadeia_operacao` |
| T06 | Trading importadora e exportadora | ✅ PASS | valido | — |
| T07 | Agronegócio produtor rural | ✅ PASS | valido | Bloco extra derivado: `comercio_exterior`, `regimes_especiais` |
| T08 | Indústria química | ✅ PASS | valido | — |
| T09 | Comércio atacadista | ✅ PASS | valido | — |
| T10 | Prestadora de serviços de TI | ✅ PASS | valido | — |
| T11 | Indústria metalúrgica | ✅ PASS | valido | — |
| T12 | Indústria na Zona Franca de Manaus | ✅ PASS | valido | Bloco extra derivado: `comercio_exterior` |
| T13 | Pequena empresa de comércio local | ✅ PASS | valido | — |
| T14 | Marketplace / plataforma digital | ✅ PASS | valido | — |
| T15 | Logística integrada / operação híbrida | ✅ PASS | valido | — |

**PASS: 15/15** · **FAIL: 0/15** · **Blocked: 0/15**

---

## Gaps agregados

| Tipo | Gaps encontrados |
|---|---|
| Core (`core_required_fields`) | **nenhum** — todos os 26 campos core estão presentes em todos os 15 cenários |
| Conditional (`conditional_rules → then_required`) | **nenhum** — todos os campos que as regras condicionais exigem estão presentes quando a regra dispara |

**Implicação:** o conjunto de campos declarado na SPEC (core + condicional) **é suficiente** para classificar deterministicamente os 15 cenários brasileiros propostos, sem dependência de texto livre.

---

## Findings — desalinhamento entre `expected_open_blocks` e blocos derivados

Os cenários abaixo têm `expected_open_blocks` menor do que o conjunto de blocos que as próprias regras da SPEC abririam a partir das flags de input. São **blocos a mais** derivados (não blocos a menos), portanto **não falham** a suite, mas sinalizam que a declaração `expected_open_blocks` está incompleta em 6 dos 15 cenários.

| Cenário | Blocos esperados (suite) | Blocos derivados pelas regras (adicionais) | Motivo |
|---|---|---|---|
| T01 Saúde | `setor_regulado` | + `nbs`, `regimes_especiais`, `territorial_expandido` | `possui_servicos=true` (abre nbs) · `possui_regime_especial_negocio=true` (abre regimes) · `possui_filial_outra_uf=true` (abre territorial) |
| T02 Farmácia | `ncm`, `setor_regulado` | + `regimes_especiais` | `possui_regime_especial_negocio=true` |
| T03 Combustíveis | `ncm`, `setor_regulado`, `regimes_especiais` | + `territorial_expandido` | `possui_filial_outra_uf=true` |
| T05 Fintech | `setor_regulado` | + `nbs`, `regimes_especiais`, `cadeia_operacao` | `possui_servicos=true` · regime especial · marketplace=true |
| T07 Agro | `ncm`, `setor_regulado`, `cadeia_operacao` | + `comercio_exterior`, `regimes_especiais` | `atua_exportacao=true` · regime especial |
| T12 ZFM | `ncm`, `territorio_incentivado`, `regimes_especiais` | + `comercio_exterior` | `atua_importacao=true` |

### Interpretação

Duas leituras possíveis — a escolha é do P.O.:

**Leitura A — "expected_open_blocks" lista apenas blocos *discriminantes*** do cenário (os blocos novos/característicos). Nesse caso os findings são ruído e a suite está correta como está — a implementação real da UX abrirá mais blocos, e isso é OK.

**Leitura B — "expected_open_blocks" é exaustivo** (deve listar *todos* os blocos que devem abrir). Nesse caso a suite tem 6 cenários com listas incompletas e precisa ser corrigida antes do F1.

**Recomendação Claude Code:** Leitura A. O test author provavelmente quis destacar o "coração" do cenário. Formalizar essa convenção na v2 da suite.

---

## O que a suite **validou** (contrato já fechado pelos testes)

1. **Determinismo dos campos**: 26 core fields + 10 conditional rules cobrem os 15 cenários **sem precisar de texto livre** para classificação. A restrição "não depender de texto livre" está atendida na SPEC.
2. **Multi-CNPJ blocker**: nenhum cenário dispara o bloqueio — consistente com o enunciado (todos têm `analise_1_cnpj_operacional=true` ou `integra_grupo_economico=false`).
3. **Expected archetype minimo**: para todos os 15, os valores esperados do JSON `expected_arquetipo_minimo` são **derivaveis** dos campos de input (tolerando case e separadores).
4. **Cobertura setorial**: os 15 cenários tocam — saúde, farmácia, combustíveis, transporte perigoso, fintech, trading, agro, indústria química, atacado, TI, metalúrgica, ZFM, pequeno comércio, marketplace, logística híbrida. Nenhum setor crítico do Brasil ficou de fora.

---

## O que a suite **NÃO valida** (limites deste teste)

Esta é a camada de **regras sobre inputs**. A suite comprova que:

- Se o usuário preencher os campos exatamente como nos 15 cenários →
- As regras produzirão `status_arquetipo = "valido"` →
- Com os campos previstos →
- Sem depender de texto livre.

Ela **não** valida:

1. **Fluxo UX real**: se o usuário consegue chegar a esses campos sem desistir (Seção 12.7 da EXPLORACAO)
2. **LLM de CNAE**: se a descrição livre gera o CNAE correto (fluxo atual preservado, fora do teste)
3. **RAG a jusante**: se o arquétipo produzido leva o RAG a categorizar os riscos corretamente (teste de integração, exigiria OPENAI_API_KEY + casos reais de riscos esperados)
4. **Setores que ficaram fora**: telecom, energia elétrica, educação, construção civil, aviação — não estão nos 15. Podem ser a próxima bateria.
5. **Casos-limite (5% não cobertos do KPI §12.1)**: empresas híbridas extremas, setores emergentes, regimes com sobreposição incomum
6. **Falsificadores**: a suite **não tem casos que deveriam falhar**. Só tem casos que devem passar. Sem um "par de casos parecidos com gabaritos diferentes" (T5 da §11.4 da EXPLORACAO), não se comprova que o arquétipo **discrimina**.

---

## Próximos passos sugeridos

Em ordem de importância para fechar a validação da hipótese da §11 da EXPLORACAO:

1. **P.O. decide entre Leitura A e Leitura B** dos findings. Se Leitura B: atualizar a suite com blocos exaustivos nos 6 cenários.
2. **P.O. adiciona bateria de refutação** — pelo menos 3 casos que *deveriam falhar* ou produzir arquétipo de fallback (blocker multi-CNPJ, dados inconsistentes tipo `possui_bens=true` + `ncms_principais=[]`, etc.).
3. **P.O. adiciona pares discriminantes** — ex: T04 (transporte produtos perigosos) vs um novo T16 (transporte carga geral). O arquétipo tem que sair diferente.
4. **P.O. expande cobertura** para setores fora dos 15: telecom, energia, educação, construção, aviação — se o KPI é 95%, 15 casos não basta estatisticamente.
5. **Integração RAG** (exige OPENAI_API_KEY): rodar cada arquétipo produzido contra o risk-categorizer real e comparar categorias geradas × categorias esperadas. Só aí a hipótese "arquétipo faz o RAG acertar" fica validada.

---

## Como reproduzir

```bash
# a partir da raiz do repo
node tests/archetype-validation/run.mjs
# ou explicitando a suite:
node tests/archetype-validation/run.mjs tests/archetype-validation/M1-arquetipo-go-no-go-brasil-v1.json
```

Saída via stdout em formato tabelado. Exit code `0` se 🟢 GO, `1` se 🔴 NO-GO.

Saída bruta desta execução: `tests/archetype-validation/run-output.txt`.
