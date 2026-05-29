---
description: "Análise de impacto cross-cutting ANTES de qualquer AS-IS/TO-BE. Roda 11 passos obrigatórios (ast-grep semântico + knip dead-read + LOC + gh issue + ADR/snapshot scan + writers/readers map + auto-auditoria). Evita o erro recorrente de AS-IS com 75% de confiabilidade."
---

# impact-tree

Skill obrigatória antes de produzir qualquer **AS-IS / TO-BE** de mudança que afete:

- campo persistido (schema column ou JSON shape compartilhado)
- tipo compartilhado (interface usada por backend + frontend + shared)
- identidade (cnpj, cpf, user_id, project_id, e similares)
- enum global (companyType, taxRegime, status, etc.)
- contrato canônico governado por ADR (perfilHash, archetypeVersion, etc.)

## Motivação

**Caso canônico que motivou esta skill:** sessão 2026-05-28, AS-IS "CPF para produtor rural PF" (`docs/governance/relatorios/AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-20260528.md`). Primeira passagem produziu AS-IS com ~75% de confiabilidade — listou ~12 consumers, perdeu o PDF, perdeu ADR-0032, perdeu test E2E com `min(14)`, classificou Classe B sem medir LOC. Segunda passagem (após auto-crítica forçada pelo P.O.) subiu a ~95% revelando 44 consumers reais, bump MINOR obrigatório no ADR-0032, e reclassificação Classe C. **Diferença: rigor metodológico, não inteligência.**

Esta skill cristaliza os 11 passos que diferenciam 75% de 95% de confiabilidade.

## Quando usar

Antes de qualquer prompt que peça:

- "AS-IS e TO-BE para …"
- "análise de impacto de mudar …"
- "lista de consumers de …"
- "é cirúrgico ou amplo?"
- "qual classe (B vs C) esta mudança?"
- "que ADR isso impacta?"

E sempre que o usuário pedir crítica/auditoria de uma análise prévia sua.

## Argumento

`$ARGUMENTS` deve ser o termo/campo-alvo + opcionalmente o contexto. Exemplos:

- `/impact-tree cnpj — aceitar cpf para produtor rural PF`
- `/impact-tree archetypeVersion — bump v1.0.0 → v1.1.0`
- `/impact-tree risk_category_code — substituir enum por tabela`

## Procedimento — 11 passos obrigatórios

Execute na ordem. **Não pule etapas.** Cada passo gera uma seção do AS-IS final com `arquivo:linha` real (REGRA-ORQ-27).

### Passo 1 — ast-grep semântico (REGRA-ORQ-36 T1)

Para cada padrão estrutural relevante ao alvo, rodar `ast-grep`:

```bash
ast-grep --pattern '<alvo>: z.string().min($_, $_)' --lang typescript server/
ast-grep --pattern '$_.<alvo>' --lang typescript server/ client/src/
ast-grep --pattern '<alvo>?: string' --lang typescript server/ client/src/ shared/
ast-grep --pattern '<Label $$$>$$$<ALVO>$$$</Label>' --lang tsx client/src/
```

**Por que importa:** rg/grep textual perde padrões que diferem em whitespace ou nomenclatura de variável. ast-grep casa AST. Em 2026-05-28 revelou `test-e2e-v212.test.ts:18` (com mesma validação `min(14)`) que grep textual perdeu por filtro `-vE test`.

### Passo 2 — Dead-read check com knip / ts-prune

```bash
# Lista exports não-usados em produção:
knip --strict 2>&1 | grep -i '<alvo>'
# OU:
ts-prune | grep -i '<alvo>'
```

**Por que importa:** coluna ou campo pode existir no schema mas nunca ser lido downstream — Lição #64 (campo persistido mas nunca consumido = dead read). Em 2026-05-28 confirmou que `users.cpf` é dead-read (gravado em `NovoCliente.tsx` sem leitores).

### Passo 3 — Issues pré-existentes (Lição #83)

```bash
for q in "<alvo>" "<sinônimo1>" "<sinônimo2>" "<intent>"; do
  gh issue list --search "$q" --state all --limit 5 --json number,title,state \
    --jq '.[] | "  #\(.number) [\(.state)] \(.title)"'
done
```

**Por que importa:** alguém pode já ter aberto issue sobre o mesmo escopo. Criar duplicata fragmenta rastreabilidade. Em 2026-05-28 confirmou que CPF/PF não tinha issue prévia — primeira entrada no backlog.

### Passo 4 — Grep INCLUINDO testes

```bash
grep -rln "<alvo>" --include="*.test.ts" --include="*.spec.ts" --include="*.test.tsx" \
  server/ client/src 2>&1 | grep -v node_modules
```

**Por que importa:** testes são consumers reais — fixtures, helpers compartilhados, snapshots. Excluir testes do grep esconde impacto downstream. Em 2026-05-28 revelou `test-helpers.ts` (helper compartilhado por todo backend) + 17 test files com fixtures `cnpj: "..."`.

### Passo 5 — Grep .sql / .md / .json

```bash
for ext in sql md json; do
  N=$(grep -rln "<alvo>" --include="*.$ext" . 2>/dev/null | grep -vE "node_modules|dist|package-lock" | wc -l)
  echo ".$ext: $N arquivos"
done
grep -rln "<alvo>" --include="*.md" docs/ .github/ .claude/ 2>&1 | grep -v node_modules
grep -rln "<alvo>" --include="*.json" . 2>&1 | grep -vE "node_modules|dist|package-lock"
```

**Por que importa:** ADRs, specs canônicos, fixtures JSON, snapshots ficam fora de `*.ts/*.tsx`. Em 2026-05-28 revelou **ADR-0032 (que define `cnpj` em hash canonical)** + 51-casos JSON (zero impacto) + 5 fixtures relevantes.

### Passo 6 — Verificar geração de PDF/email/templates fora de prompts LLM

```bash
grep -rnE "jsPDF|pdf-lib|puppeteer|@react-pdf|pdfmake|generatePdf|generatePDF|sendEmail|nodemailer" \
  server/ client/src --include="*.ts" --include="*.tsx" 2>&1 | grep -v node_modules
# Se encontrar, abrir o arquivo e grep <alvo> dentro dele.
```

**Por que importa:** strings hardcoded em templates de saída (PDF, email, SMS) NÃO aparecem em prompts LLM. Em 2026-05-28 revelou `generateDiagnosticoPDF.ts:125` imprimindo `CNPJ: ${data.cnpj}` literal no PDF + `:355` usando CNPJ no nome do arquivo gerado.

### Passo 7 — Verificar snapshots `.snap`

```bash
find . -name "__snapshots__" -type d 2>/dev/null | grep -v node_modules
find . -name "*.snap" 2>/dev/null | grep -v node_modules
# Para cada .snap encontrado, grep <alvo>:
for f in $(find . -name "*.snap" 2>/dev/null | grep -v node_modules); do
  if grep -q "<alvo>" "$f"; then echo "  ⚠️  $f tem '<alvo>' fixado"; fi
done
```

**Por que importa:** snapshots `.snap` vitest contêm valores serializados — se o shape mudar, todos quebram. Listagem prévia evita "200 testes quebrados no CI" como surpresa.

### Passo 8 — LOC reais ANTES de classificar Classe (REGRA-ORQ-24)

```bash
for f in <arquivos-candidatos-impactados>; do
  if [ -f "$f" ]; then printf "  %6d  %s\n" "$(wc -l < $f)" "$f"; fi
done
```

**Por que importa:** Classe A (≤50), B (≤500), C (>500 OU cross-cutting). Sem medir LOC, classifica-se por palpite. Em 2026-05-28 medi `PerfilEmpresaIntelligente.tsx = 1377 LOC` e `routers-fluxo-v3.ts = 6805 LOC` — minha estimativa "Classe B" foi rebaixada para Classe C.

### Passo 9 — ADRs afetados + bump explícito (MAJOR/MINOR/PATCH)

```bash
grep -rln "<alvo>" --include="*.md" docs/adr/ 2>&1 | grep -v node_modules
# Para cada ADR encontrado, abrir e ler decisão:
# - MAJOR: breaking change (campo removido, mudança de tipo, mudança de semântica) → re-derivação obrigatória
# - MINOR: campo aditivo (sem invalidar registros anteriores) → re-derivação opcional
# - PATCH: correção de bug
```

**Por que importa:** ADRs estabelecem contratos imutáveis (ex: ADR-0031 imutabilidade snapshot, ADR-0032 versionamento). Mudar shape sem bump quebra o contrato. Em 2026-05-28 ADR-0032 estabeleceu `archetypePerfilHash = sha256(cnpj + cnaes + dim)` — adicionar CPF é **bump MINOR** (aditivo), não MAJOR.

### Passo 10 — Mapa writers/readers formal (REGRA-ORQ-36 T4)

```bash
echo "[WRITERS — INSERT/UPDATE/set de <alvo>]:"
grep -rnE "INSERT INTO.*<alvo>|UPDATE.*<alvo>|set\(.<alvo>.|setCnpj|update<Alvo>" \
  server/ client/src --include="*.ts" --include="*.tsx" 2>&1 | grep -v node_modules

echo "[READERS — lê <alvo> de objeto persistido]:"
grep -rnE "SELECT.*<alvo>|\.<alvo>\b|companyProfile.*<alvo>|project\.<alvo>" \
  server/ client/src --include="*.ts" --include="*.tsx" 2>&1 | grep -v node_modules
```

**Por que importa:** writer sem reader = dead write; reader sem writer = leitura vazia. Lição #65 (rastrear fluxo end-to-end). Em 2026-05-28 confirmou que `users.cpf` tem 1 writer (`NovoCliente.tsx`) e zero readers → dead read.

### Passo 11 — Auto-auditoria final com tabela de cobertura

Antes de declarar AS-IS pronto, gerar tabela:

| Item | Status | Evidência |
|---|---|---|
| Toda afirmação tem `arquivo:linha` | ✅/❌ | … |
| Incluí testes no grep | ✅/❌ | … |
| Incluí .sql/.md/.json | ✅/❌ | … |
| Verifiquei PDF/email | ✅/❌ | … |
| Issues pré-existentes consultadas | ✅/❌ | … |
| ast-grep aplicado em ≥3 padrões | ✅/❌ | … |
| Dead-read check via knip/ts-prune | ✅/❌ | … |
| LOC reais antes de classificar | ✅/❌ | … |
| ADRs identificados + bump declarado | ✅/❌ | … |
| Mapa writers/readers formal | ✅/❌ | … |
| **Cobertura total estimada** | … | … |

**Cobertura mínima aceitável:** 🟢 ≥90%. Abaixo de 90%, declarar pendências explicitamente e listar o que falta como "Pendente para Manus".

## Output esperado

Documento `.md` salvo em `docs/governance/relatorios/AS-IS-TO-BE-<TEMA>-<YYYYMMDD>.md` com 9 seções:

1. Auto-auditoria das técnicas usadas
2. Risco de regressão por gravidade (🔴 crítico / 🟡 visível / 🟢 cosmético)
3. Consumers reais (lista canônica com arquivo:linha)
4. Árvore de impacto (ASCII com cascata)
5. Cirurgia possível? (escopo mínimo vs amplo)
6. AS-IS em N camadas com citações
7. TO-BE com fases F0-FN + bump ADR explícito
8. Auto-auditoria final (tabela de cobertura)
9. Pendências para Manus (se cobertura < 100%)

## Anti-padrões (não fazer)

❌ **Filtrar testes com `-vE "test"`** — perde fixtures e helpers compartilhados.
❌ **Restringir grep a `--include="*.ts" --include="*.tsx"`** — perde ADRs, fixtures JSON, snapshots, SQL.
❌ **Classificar Classe B/C sem `wc -l`** — palpite vira retrabalho de spec.
❌ **Afirmar "PDF não tem CNPJ literal" sem grep no PDF generator** — Lição #87 (mecanismo verificado, não inferido).
❌ **Pular `gh issue list --search`** — Lição #83 (duplicata fragmenta backlog).
❌ **Apresentar AS-IS sem auto-auditoria final** — sem tabela de cobertura, o leitor não sabe quanto confiar.

## Ferramentas exigidas

| Tool | Comando install global | Uso no procedimento |
|---|---|---|
| `ast-grep` | `npm install -g @ast-grep/cli` | Passo 1 |
| `knip` | `npm install -g knip` | Passo 2 |
| `ts-prune` (alternativa ao knip) | `npm install -g ts-prune` | Passo 2 |
| `dependency-cruiser` | `npm install -g dependency-cruiser` | Passo 10 (opcional, para grafo formal) |
| `gh` CLI | já instalado | Passo 3 |
| `grep` / `rg` | já instalado | Passos 4-7, 9 |

Se alguma ferramenta exigida estiver ausente, instalar antes de prosseguir ou declarar a lacuna na auto-auditoria final (Passo 11).

## Vinculadas

- REGRA-ORQ-27 (validação de consumo / Lição #59 — assemble ≠ consumption)
- REGRA-ORQ-35 (NUNCA ASSUMA — Read Before Write)
- REGRA-ORQ-36 (técnicas de investigação T1-T5)
- REGRA-ORQ-24 (classe de impacto B vs C)
- Lições #64 (dead-read), #65 (fluxo end-to-end), #66 (spec sem dados), #83 (issues pré-existentes), #87 (smoke estático ≠ consumo), #93 (mecanismo verificado)
- Caso canônico: `docs/governance/relatorios/AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-20260528.md` (v1 75% → v2 95%)
