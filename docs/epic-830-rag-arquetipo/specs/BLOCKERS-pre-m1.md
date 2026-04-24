# BLOCKERS identificados durante exploração pré-M1

> Lista viva. Atualizar à medida que novos BLOCKERS são descobertos
> ou resolvidos.

## Nota metodológica

BLOCKERS listados aqui foram identificados durante análise do docx
`0--CAMPOS-FORM--EMPRESA-form-arquetipo-negocio-v1_00.docx` (formulário
TO-BE) e PDF `projeto-preenchido.pdf` (AS-IS atual), cruzada com o
modelo dimensional proposto pelo consultor.

**Critério de BLOCKER:** problema estrutural que, se não resolvido,
viola C1 da REGRA-M1-GO-NO-GO (determinismo) ou C3 (amarração
form↔testes).

**Status:** todos os 8 BLOCKERS estão **abertos**. Nenhum resolvido ainda.

## BLOCKERS abertos

### BLOCKER #1 — Sobreposição "Natureza da operação" × "Posição na cadeia"

**Problema:** opções como "Transporte" e "Intermediação" aparecem em ambos
os campos. Usuário pode escolher combinações incoerentes (ex: natureza=Serviço
+ posição=Produtor/fabricante).

**Impacto:** arquétipo inconsistente, regras disparam incorretamente.

**Correção proposta (revisada pós-consultor):**
Abandonar tabela de coerência 13×12 combinatória. Adotar **modelo
dimensional** onde posição e natureza são eixos independentes:
- `papel_na_cadeia` captura a posição (transportador, distribuidor, etc.)
- `tipo_de_relacao` captura a natureza (venda, serviço, produção, etc.)
- Regras atuam por eixo isolado, não por combinação.

**Dependência:** resolver junto com BLOCKERS #5, #17 (mesmo núcleo conceitual).

---

### BLOCKER #2 — "CNAE principal confirmado" — quem confirma?

**Problema:** se "confirmação" é feita pela IA (AS-IS atual), mantém
inferência. Se é feita pelo usuário, como ele sabe o código correto?

**Impacto:** viola C1 (zero LLM) se IA confirma; dificulta C3 (amarração)
se falta contrato claro.

**Correção proposta:** separar em 2 campos:
- `cnae_informado` — obrigatório, preenchido pelo usuário via busca
  controlada (enum tabela CNAE oficial). Entra no motor determinístico.
- `cnae_sugerido_ia` — opcional, dica ao lado do campo. **Não entra no motor.**

Motor consome apenas `cnae_informado`.

---

### BLOCKER #3 — Operador `CONTAINS` em categoria semântica

**CRÍTICO — é o maior risco do sistema inteiro (segundo consultor).**

**Problema:** regras como `IF tipo_objeto CONTAINS "combustivel"` parecem
determinísticas mas são inferência disfarçada. Se "combustível" não está
em um enum fechado, é lookup de categoria semântica → quebra determinismo.

**Impacto:** viola **diretamente** C1 (zero inferência).

**Correção proposta:** enumerar explicitamente o conjunto de valores que
disparam cada bloco. Proibir `CONTAINS` em qualquer campo que envolva
categoria semântica. Só permitir em arrays de enum fechado.

Exemplo:
- ❌ `IF natureza CONTAINS "combustivel"`
- ✅ `IF subnatureza_setorial IN [refinaria, distribuidora, transportadora_combustivel]`

**Dependência:** requer enumeração completa de subnaturezas setoriais para
todos os 13 setores (BLOCKER #6).

---

### BLOCKER #4 — Regra usa `natureza = "misto"` — valor inexistente no enum

**Problema:** regra de abertura do Bloco 6 usa `natureza = "misto"`, mas
"misto" não está no enum de "Natureza da operação principal". Regra nunca
dispara por esse ramo.

**Impacto:** comportamento não-determinístico (regra morta que parece viva).

**Correção proposta:** eliminar o ramo OR `"misto"`. Se o conceito "empresa
com natureza mista" é relevante, derivar no motor a partir de
`operacoes_secundarias.length >= 1`, não como valor escolhido pelo usuário.

---

### BLOCKER #5 — Redundância `possui_bens` vs `tipo_objeto_economico CONTAINS "bens"`

**Problema:** dois campos descrevem a mesma informação. `possui_bens = sim`
e `tipo_objeto_economico INCLUDES "bens"` são equivalentes, mas o form os
tem separados.

**Impacto:** duas fontes para mesma informação → risco de inconsistência
se usuário preencher contraditoriamente.

**Correção proposta:** eliminar `possui_bens` e `possui_servicos`. Abertura
de bloco NCM/NBS deriva de `tipo_objeto_economico` (fonte única da verdade).

**Dependência:** resolver junto com BLOCKERS #1, #17 (mesmo núcleo).

---

### BLOCKER #6 — "Setores complexos" indefinido

**Problema:** regras referenciam "setores complexos" para abrir campos
específicos, mas não há lista fechada do que é "complexo".

**Impacto:** comportamento variável conforme interpretação humana.

**Correção proposta:** enum fechado
`setores_complexos = [Combustíveis/energia, Saúde, Financeiro, Aviação, Transporte]`.
Sem ambiguidade.

**Dependência:** completar tabela de subnaturezas para todos os 13 setores
identificados em "Natureza da operação principal".

---

### BLOCKER #7 — "Regime específico" sem efeito

**Problema:** enum de regime tributário inclui opção "Regime específico",
mas nenhuma regra subsequente é disparada por esse valor. Campo sem efeito
contradiz princípio "cada campo deve ter efeito".

**Impacto:** campo decorativo disfarçado de estrutural.

**Correção proposta:** duas opções:
- (a) remover opção "Regime específico" do enum
- (b) se manter, adicionar campo dependente `tipo_regime_especifico` com
  enum (MEI, SCP, RET, etc.) e regra associada

P.O. decide qual.

---

### BLOCKER #17 — `tipo_objeto_economico` colapsa "operar" e "comercializar"

**Problema:** transportadora de combustível **opera** combustível (NCM 2710)
mas **não vende**. No modelo AS-IS, marcar `tipo_objeto = ["Bens"]` faz o
bloco NCM abrir e a empresa ser tratada como se vendesse combustível → bug
original do Hotfix IS.

**Correção proposta inicial (Orquestrador):** separar `objeto_operado` vs
`objeto_comercializado`.

**Correção proposta revisada (consultor, superior):** modelar em **3 dimensões**:

| Dimensão | Exemplos |
|---|---|
| `objeto` | combustível, alimento, serviço digital |
| `papel_na_cadeia` | transportador, distribuidor, fabricante, intermediador |
| `tipo_de_relacao` | venda, serviço, produção, intermediação |

Exemplo de cenários:
- **Transportadora de combustível:** `objeto=combustível, papel=transportador, relação=serviço` → nunca contribuinte IS
- **Distribuidora Shell:** `objeto=combustível, papel=distribuidor, relação=venda` → contribuinte IS conforme regras
- **Refinaria:** `objeto=combustível, papel=fabricante, relação=produção` → contribuinte IS
- **Marketplace de combustível:** `objeto=combustível, papel=intermediador, relação=intermediação` → regras de marketplace

**Decoupling** entre objeto e papel elimina a explosão combinatória do
BLOCKER #1.

**Dependência:** resolver junto com BLOCKERS #1, #5. Este é o **BLOCKER
mais importante** conforme consultor.

## BLOCKERS resolvidos

_Nenhum ainda. Quando um BLOCKER for resolvido, mover para esta seção
com link ao ADR ou commit que o resolveu._

## Próximos passos (governança)

1. Cada BLOCKER pode gerar 1 ADR quando resolvido
2. BLOCKERS #1, #5, #17 devem ser resolvidos **juntos** (mesmo núcleo
   conceitual — modelo dimensional)
3. BLOCKER #3 tem prioridade — é o que mais ameaça C1 da REGRA-M1-GO-NO-GO
4. Após todos os 8 resolvidos, criar tag `pre-m1-blockers-consolidados`
