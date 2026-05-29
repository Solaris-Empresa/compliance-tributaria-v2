# Tooling de Análise de Impacto — Guia para o Orquestrador

**Data:** 2026-05-29
**Autor:** Claude Code (sessão presencial Uires Tapajós)
**Contexto:** após a sessão de AS-IS/TO-BE CPF agro (v1 75% → v2 97% → v3 baseline → v4 cirúrgica)
**Status do documento:** local, não-commitado · destinado a ser enviado ao orquestrador como referência permanente
**Status das ferramentas:** **instaladas globalmente no PC do P.O. nesta sessão · ZERO impacto no `package.json` do repo · ZERO commit relacionado**

---

## §0 · Por que este guia existe

Na sessão de 29/05/2026, ao produzir o AS-IS/TO-BE "Aceitar CPF para Produtor Rural PF", o Claude Code entregou uma primeira versão (v1) com **~75% de confiabilidade** — listou ~12 consumers do campo CNPJ, perdeu o PDF, perdeu o ADR-0032, perdeu o test E2E com `min(14)`, classificou Classe B sem medir LOC. O P.O. forçou auto-crítica e a v2 subiu para 97% revelando **44 consumers reais**. A v3 e a v4 estabilizaram em 98-99%.

A diferença entre 75% e 97% **não foi inteligência — foi rigor metodológico com ferramentas certas**. Este guia documenta as 4 ferramentas instaladas + a skill custom criada nesta sessão para que o orquestrador (ou qualquer próximo agente) consiga reproduzir 95%+ de confiabilidade em qualquer próximo AS-IS/TO-BE.

---

## §1 · Tier 1 — 4 ferramentas CLI globais instaladas

### 1.1 — `ast-grep` · busca semântica em AST TypeScript

| Item | Valor |
|---|---|
| **Comando install** | `npm install -g @ast-grep/cli` (já estava no PC do P.O. antes desta sessão) |
| **Comando uso (Windows Git Bash)** | `ast-grep` ou alias `sg` |
| **Quando usar** | Antes de qualquer AS-IS/TO-BE de mudança em campo persistido, tipo compartilhado, identidade, enum global, contrato ADR — para encontrar **padrões estruturais** (assinaturas Zod, acessos a campo, definições de interface) que `grep` textual perde |
| **O que detecta** | Padrões AST com placeholders `$_` (1 nó) e `$$$` (vários nós): `z.string().min(14, $_)`, `$_.cnpj`, `<Label>$$$CNPJ$$$</Label>`, etc. |
| **O que NÃO detecta** | Padrões em **tipos dentro de `interface { }`** — `cnpj?: string` puro não casa como linha isolada (precisa de `$$$` mais contexto). Para tipos, grep textual ainda é necessário. |
| **Caso canônico desta sessão** | Revelou `server/integration/test-e2e-v212.test.ts:18` com `cnpj: z.string().min(14, "CNPJ é obrigatório")` — espelhando `routers-fluxo-v3.ts:201`. **Grep textual perdeu** porque eu havia filtrado testes com `-vE "test"`. |

**Exemplos de uso para próxima feature:**

```bash
# Todos os z.string().min(N, "msg") em backend:
ast-grep --pattern 'z.string().min($_, $_)' --lang typescript server/

# Todos os acessos $.cnpj em qualquer expressão:
ast-grep --pattern '$_.cnpj' --lang typescript server/ client/src/

# Todos os <Label> que mencionam CNPJ:
ast-grep --pattern '<Label $$$>$$$CNPJ$$$</Label>' --lang tsx client/src/
```

---

### 1.2 — `knip` · detecta dead-exports

| Item | Valor |
|---|---|
| **Comando install** | `npm install -g knip` (instalado nesta sessão — 15s) |
| **Comando uso** | `knip --strict` (uso geral) · `knip --reporter compact` (output enxuto) · `knip --reporter json` (parsing) |
| **Quando usar** | Antes de propor remover/rename de uma função/classe/type exportada. Antes de classificar "Classe A/B/C" para descobrir se há exports não-usados que aumentam o escopo aparente sem impacto real. |
| **O que detecta** | **Exports não-utilizados** (funções, classes, types, constantes exportadas que ninguém importa); dependências em `package.json` não-usadas; arquivos órfãos |
| **O que NÃO detecta** | **Dead FIELDS** (colunas de schema gravadas mas nunca lidas). Para isso, grep manual `\.<field>\b` é necessário. **Esta foi uma limitação aprendida nesta sessão** — eu esperava knip detectar `users.cpf` como dead-read e ele não detectou (porque cpf é campo, não export). |
| **Caso canônico desta sessão** | Rodado com filtro `cnpj\|cpf` — confirmou **ZERO dead-exports relacionados** (nenhuma função `validateCnpj` ou similar não-consumida). Útil para fechar a auditoria do que NÃO precisa mexer. |

**Tempo de execução típico:** 30-90s no repo SOLARIS (varia com tamanho). Pode usar `--strict` (mais rigoroso) ou padrão.

---

### 1.3 — `ts-prune` · alternativa mais simples ao knip

| Item | Valor |
|---|---|
| **Comando install** | `npm install -g ts-prune` (instalado nesta sessão) |
| **Comando uso** | `ts-prune` (sem flags na maioria dos casos) |
| **Quando usar** | Mesma motivação do `knip`, mas com output mais enxuto. Bom para um check rápido. |
| **O que detecta** | Apenas exports não-usados (subset do que `knip` detecta) |
| **O que NÃO detecta** | Tudo o que `knip` não detecta + dead-fields + dependências em package.json |
| **Caso canônico desta sessão** | Confirmação cruzada com `knip` — ambos retornaram ZERO matches para cnpj/cpf, validação dupla. |

**Recomendação:** se o ambiente tem ambos, rode `knip` (mais completo). `ts-prune` é fallback se `knip` der problema.

---

### 1.4 — `dependency-cruiser` (`depcruise`) · grafo de dependências

| Item | Valor |
|---|---|
| **Comando install** | `npm install -g dependency-cruiser` (instalado nesta sessão) |
| **Comando uso** | `depcruise <arquivo-alvo> --output-type text --no-config` |
| **Quando usar** | Para mapear **quem importa quem** quando o AS-IS precisa listar consumers de um módulo. Substitui a tabela manual de "writers/readers" com saída automatizada. |
| **O que detecta** | Grafo de imports/exports (quem consome o arquivo-alvo, e quem o alvo consome) |
| **O que NÃO detecta** | Consumers indiretos via runtime/string (ex: `require(variavel)`, dynamic imports) |
| **Avisos conhecidos** | Versão global emite warning recomendando `devDependency` local — **funciona normalmente em uso pontual**, basta ignorar o warning |
| **Caso canônico desta sessão** | Revelou que `client/src/lib/generateDiagnosticoPDF.ts` é importado por **3 telas** (`ActionPlanPage`, `ConsolidacaoV4`, `ComplianceDashboard`). A primeira versão do AS-IS (v1) listou apenas 2 — `ComplianceDashboard.tsx` foi descoberto via `depcruise`. |

**Exemplo de uso:**

```bash
# Quem importa este arquivo?
depcruise client/src/lib/generateDiagnosticoPDF.ts --output-type text --no-config

# Ou (equivalente via grep, fallback se depcruise falhar):
grep -rln "from.*generateDiagnosticoPDF\|import.*generateDiagnosticoPDF" client/src --include="*.ts" --include="*.tsx"
```

---

## §2 · Skill custom: `impact-tree`

| Item | Valor |
|---|---|
| **Localização** | `.claude/skills/impact-tree/SKILL.md` (criada nesta sessão · 225 LOC) |
| **Status no repo** | Commitada na branch `chore/impact-tree-skill` + **PR #1287 OPEN** · MERGEABLE · aguarda autorização |
| **Como invocar (Claude Code)** | `/impact-tree <alvo> — <contexto>` |
| **Argumento esperado** | Termo/campo-alvo + opcionalmente contexto da feature |
| **Quando o agente carrega automaticamente** | Quando o usuário pede "AS-IS e TO-BE para X" · "análise de impacto" · "lista de consumers" · "é cirúrgico?" · "Classe B ou C?" · "que ADR isso impacta?" |

### Procedimento de 11 passos (resumo)

| # | Passo | Ferramenta principal | Saída esperada |
|---|---|---|---|
| 1 | ast-grep semântico (≥3 padrões) | `ast-grep` | lista de padrões estruturais detectados |
| 2 | Dead-read check com ressalva | `knip` + `ts-prune` | dead-exports detectados (NOT dead-fields) |
| 3 | Issues pré-existentes (Lição #83) | `gh issue list --search` | issue # se houver duplicata |
| 4 | Grep INCLUINDO testes | `grep` sem `-vE test` | test files que tocam o alvo (fixtures, helpers) |
| 5 | Grep `.sql` / `.md` / `.json` | `grep` por extensão | ADRs, specs, fixtures canônicos |
| 6 | PDF / email / templates | `grep jsPDF\|pdf-lib\|...` | geradores de saída fora de prompts LLM |
| 7 | Snapshots `.snap` | `find + grep` | snapshots que asserem campos do alvo |
| 8 | LOC reais (REGRA-ORQ-24) | `wc -l` | tamanho real dos arquivos-chave |
| 9 | ADRs afetados + bump explícito | `grep docs/adr/` | MAJOR/MINOR/PATCH decisão documentada |
| 10 | Mapa writers/readers formal | `grep + depcruise` | tabela com origem e destino do dado |
| 11 | Auto-auditoria final | tabela | cobertura % declarada |

### Anti-padrões (a skill rejeita explicitamente)

❌ Filtrar testes com `-vE "test"` (perde fixtures e helpers compartilhados)
❌ Restringir grep a `--include="*.ts" --include="*.tsx"` (perde ADRs, fixtures JSON, snapshots, SQL)
❌ Classificar Classe B/C sem `wc -l` (palpite vira retrabalho de spec)
❌ Afirmar "PDF não tem X literal" sem grep no PDF generator (Lição #87)
❌ Pular `gh issue list --search` (Lição #83 — duplicata fragmenta backlog)
❌ Apresentar AS-IS sem auto-auditoria final (sem tabela de cobertura, leitor não sabe quanto confiar)

### Output esperado pela skill

Documento `.md` salvo em `docs/governance/relatorios/AS-IS-TO-BE-<TEMA>-<YYYYMMDD>.md` com 9 seções:

1. Auto-auditoria das técnicas usadas
2. Risco de regressão por gravidade
3. Consumers reais (lista canônica com `arquivo:linha`)
4. Árvore de impacto ASCII
5. Cirurgia possível? (escopo mínimo vs amplo)
6. AS-IS em N camadas com citações
7. TO-BE com fases F0-FN + bump ADR explícito
8. Auto-auditoria final (tabela de cobertura)
9. Pendências para Manus (se cobertura < 100%)

### Vinculadas (REGRAs/Lições do projeto)

REGRA-ORQ-24 (classe de impacto) · REGRA-ORQ-27 (Lição #59 — assemble ≠ consumption) · REGRA-ORQ-35 (NUNCA ASSUMA) · REGRA-ORQ-36 (técnicas de investigação T1-T5) · Lições #59, #64, #65, #66, #83, #87, #93

---

## §3 · Limitações descobertas nesta sessão (capturadas para próximos usuários)

### 3.1 — knip e ts-prune NÃO detectam dead-FIELDS

Ferramentas detectam **exports** (símbolos exportados não-consumidos). NÃO detectam **fields** (colunas de schema gravadas mas nunca lidas downstream). Para esses casos, grep manual `\.<field>\b` continua necessário.

**Implicação:** quando a skill `impact-tree` rodar Passo 2, ela retorna "ZERO dead-exports" para campos de schema — isso é correto mas pode dar falsa impressão de "tudo OK". Confirmação manual com grep do field ainda é necessária.

### 3.2 — ast-grep tem limitação com tipos em `interface { }`

Padrões como `cnpj?: string` ou `cnpj: string` NÃO casam como linhas isoladas dentro de blocos `interface { ... }`. Precisa de pattern com `$$$` para casar contexto, ou grep textual continua melhor.

**Implicação:** ast-grep brilha em padrões de **expressão/função** (`z.string().min(...)`, `$.cnpj`, `<Label>$$$X$$$</Label>`). Para definições de tipo em interfaces, prefira `grep -nE "fieldName\s*\??\s*:"`.

### 3.3 — `dependency-cruiser` global emite warning

Cada execução mostra warning recomendando `devDependency` local. **Funciona normalmente**, apenas adiciona ruído visual. Pode ser ignorado.

### 3.4 — Ambiente Windows Git Bash exige cuidados

`/tmp` no Git Bash mapeia para `C:/Users/<user>/AppData/Local/Temp` mas algumas ferramentas Node resolvem `/tmp` como `D:\tmp` — paths divergentes. Saídas longas devem ser redirecionadas para path explícito (ex: `~/.claude/...` ou local do projeto), não `/tmp`.

---

## §4 · Fluxo recomendado de uso (próxima feature do orquestrador)

Quando o orquestrador receber um pedido de AS-IS/TO-BE de mudança cross-cutting:

```text
PASSO 0 — Antes de qualquer análise:
  □ Confirmar que ast-grep, knip, ts-prune e depcruise estão instalados
    (which ast-grep && which knip && which ts-prune && which depcruise)
  □ Sincronizar repo (git fetch + git status)
  □ Verificar branch atual (ORQ-26 — branch obrigatória antes de qualquer Edit)

PASSO 1 — Invocar a skill:
  /impact-tree <alvo> — <contexto da feature>

PASSO 2 — Aplicar os 11 passos da skill em ordem (NÃO PULAR):
  1.  ast-grep com ≥3 padrões semânticos
  2.  knip + ts-prune (com ressalva: dead-EXPORTS, não dead-FIELDS)
  3.  gh issue list --search ≥3 queries (Lição #83)
  4.  grep INCLUINDO testes e helpers
  5.  grep .sql / .md / .json
  6.  grep PDF/email/templates fora de prompts LLM
  7.  find + grep snapshots .snap (abrir, não só listar)
  8.  wc -l dos arquivos-chave (REGRA-ORQ-24)
  9.  grep docs/adr/ + bump MAJOR/MINOR/PATCH declarado
  10. mapa writers/readers + depcruise opcional
  11. tabela de auto-auditoria com % cobertura

PASSO 3 — Salvar output:
  docs/governance/relatorios/AS-IS-TO-BE-<TEMA>-<YYYYMMDD>.md
  9 seções obrigatórias (ver skill)
  Cobertura mínima aceitável: 90%; alvo 95%+

PASSO 4 — Validar com refutação técnica se necessário:
  Se algum agente externo (Manus, ChatGPT, etc.) der análise divergente,
  validar empiricamente via Read + ast-grep ANTES de aceitar.
  Caso canônico desta sessão: Manus afirmou semântica da flag
  analise_1_cnpj_operacional sem citação; validação empírica em
  buildPerfilEntidade.ts:346-369 mostrou que Manus estava errado.
```

---

## §5 · Replicação em outra máquina (instalação completa)

Se o orquestrador rodar em ambiente diferente (Manus, outro PC, CI), basta:

```bash
# Tier 1 — instalação global (~30s total, requer Node.js + npm)
npm install -g @ast-grep/cli
npm install -g knip
npm install -g ts-prune
npm install -g dependency-cruiser

# Verificar instalação:
ast-grep --version
knip --version
ts-prune --version
depcruise --version

# Tier 2 — skill impact-tree
# A skill está no PR #1287 (.claude/skills/impact-tree/SKILL.md).
# Quando o PR mergear em main, qualquer sessão Claude Code carrega
# automaticamente. Antes do merge: aparece na lista "available skills"
# após o arquivo ser criado no .claude/skills/ local.

# Para verificar se a skill está carregada:
# Em uma sessão Claude Code, ela aparecerá na lista de skills disponíveis
# como "impact-tree: Análise de impacto cross-cutting ANTES de qualquer AS-IS/TO-BE..."
```

---

## §6 · Caso canônico desta sessão (referência permanente)

| Versão | Cobertura | O que mudou | Custo de descoberta |
|---|---|---|---|
| **v1 (75%)** | 75% | Apenas grep textual + leitura de 3 arquivos · excluiu testes · sem ast-grep · sem knip/ts-prune · sem depcruise · sem snapshots | sessão inicial, palpite informado |
| **v2 (97%)** | +22pp | Auto-crítica forçada pelo P.O. → grep `.sql/.md/.json` · ast-grep semântico · 4 ferramentas usadas · snapshots verificados | ~2h adicional |
| **v3 (98%)** | +1pp | Mockup UX Variante A · Plano Rollback 5N · Validação CPF Opção A (aprovações P.O.) | ~30 min |
| **v4 (99%)** | +1pp | Refutação técnica do Manus via Read empírico em `buildPerfilEntidade.ts:346-369` (Lição #93 aplicada) | ~10 min |

**Lição central:** o salto v1 → v2 (75% → 97%) **não foi inteligência adicional** — foi rigor metodológico com 4 ferramentas certas. A skill `impact-tree` cristaliza esse rigor para que próximas sessões iniciem em 95%+, não em 75%.

---

## §7 · O que o P.O. precisa autorizar para tornar isso permanente

| # | Item | Estado | Ação para tornar permanente |
|---|---|---|---|
| 1 | 4 ferramentas Tier 1 instaladas globalmente | ✅ instaladas no PC do P.O. nesta sessão | nenhuma — instalação global persiste |
| 2 | Skill `impact-tree` no `.claude/skills/` | ✅ commitada em `chore/impact-tree-skill` | autorizar merge do **PR #1287** |
| 3 | Caso canônico v1/v2 (mostra o ganho do rigor) | ✅ commitado em PR #1287 | mergeará junto com a skill |
| 4 | Este guia de tooling (TOOLING-IMPACT-TREE-GUIDE) | ⏸ working tree local · não-commitado | autorizar commit + push (sugestão minha: anexar ao PR #1287 ou criar PR #1290 separado) |
| 5 | Skill em outros ambientes (Manus etc.) | ⏸ pendente | após merge do #1287, qualquer clone do repo recebe a skill |

---

## §8 · Anexo — caso canônico de refutação técnica (Lição #93 aplicada)

Durante esta sessão, o **Manus** afirmou:

> "Hoje essa flag (`analise_1_cnpj_operacional`) verifica se o CNPJ existe. Com a mudança para aceitar CPF, essa mesma flag passaria a verificar 'tem CNPJ ou CPF válido?'"

Sem citação `arquivo:linha`. O Claude Code, antes de aceitar, validou via Read em `server/lib/archetype/buildPerfilEntidade.ts:346-369`:

```typescript
function detectMultiCnpjBlocker(seed: Seed): Blocker | null {
  const { integra_grupo_economico: integra, analise_1_cnpj_operacional: analise1 } = seed;
  if (!integra) return null; // NONE
  if (integra && analise1) {
    return { id: "V-05-INFO", severity: "INFO",
      rule: "empresa integra grupo econômico — análise neste projeto é de 1 CNPJ operacional; consolidação requer projetos adicionais" };
  }
  return { id: "V-05-DENIED", severity: "BLOCK_FLOW",
    rule: "empresa integra grupo econômico E análise consolidada solicitada — fora do escopo M1 (1 CNPJ)" };
}
```

**Achado:** a flag **não é "tem CNPJ existe"** — é **"escopo unitário de 1 entidade vs consolidação multi-CNPJ de grupo econômico"**. O Manus errou a semântica. A conclusão (manter o nome — Opção A) permanece correta, mas pela **razão certa**: a flag já é abstrata o suficiente; "1 entidade operacional" engloba "1 CNPJ OU 1 CPF" naturalmente.

**Princípio:** REGRA-ORQ-35 (NUNCA ASSUMA) + Lição #93 (mecanismo verificado, não inferido). **Qualquer afirmação de outro agente sobre semântica de campo deve ser validada via Read antes de incorporar ao TO-BE.**

---

## §9 · TL;DR para o orquestrador

```text
INSTALADAS GLOBALMENTE no PC do P.O. (sem tocar package.json):
  - ast-grep  (já estava antes)  → busca semântica AST TypeScript
  - knip      (instalado 29/05)  → dead-exports (não dead-fields)
  - ts-prune  (instalado 29/05)  → alternativa enxuta ao knip
  - depcruise (instalado 29/05)  → grafo formal de imports/exports

SKILL CUSTOM criada nesta sessão:
  - impact-tree   → 11 passos obrigatórios antes de qualquer AS-IS/TO-BE
                    de mudança cross-cutting (campo persistido, tipo
                    compartilhado, identidade, enum, contrato ADR)
                    Localização: .claude/skills/impact-tree/SKILL.md
                    PR: #1287 (OPEN · aguarda autorização do P.O.)

QUANDO USAR:
  Sempre que o orquestrador for produzir AS-IS/TO-BE de feature que
  toque mais de 5 arquivos OU envolva ADR OU envolva campo persistido.

LIMITAÇÕES CONHECIDAS (capturadas nesta sessão):
  - knip/ts-prune detectam EXPORTS, não FIELDS de schema
  - ast-grep não casa tipos em interfaces como linhas isoladas
  - depcruise global emite warning (funcional, ignorável)

CASO CANÔNICO (mostra o ganho):
  v1 (sem skill, palpite informado): 75% confiabilidade
  v2 (com skill aplicada): 97% confiabilidade
  v3 (com aprovações P.O.): 98%
  v4 (com refutação técnica via Read empírico): 99%

AUTORIZAÇÕES PENDENTES:
  - Mergear PR #1287 → skill vira permanente para todas as sessões
  - Autorizar push deste guia → orquestrador tem referência canônica
  - Autorizar push de PR #1288 (v3 baseline) e branch v4 local
```

---

**Status deste documento:** local · working tree · não-commitado · aguarda autorização do P.O. para push.

**Sugestão minha:** anexar este guia ao PR #1287 (mesma branch `chore/impact-tree-skill`) — fica junto com a skill que documenta. Alternativamente, abrir PR #1290 separado (`docs/tooling-guide`). Aguardo seu despacho.
