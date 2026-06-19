# HANDOFF — Bundle stale em produção (CNAE não aparece) · causa-raiz + fix

**Data:** 2026-06-19 · **De:** Claude Code · **Para:** Manus (deploy) · **Incidente:** UI Admin sem coluna "Grupos CNAE" mesmo após merge do #1530 (F7-A/B) · **Git:** `a4da5cb8`

## TL;DR
**Não era código nem git** (F7-A/B 100% correto em `a4da5cb8`, provado por build local). **Causa-raiz:** o script `pnpm build` **pulava o `vite build`** por causa de um `;` (parsing de shell) → o **frontend nunca era reconstruído** → o deploy publicava/servia o `dist/public` antigo. **Fix neste PR:** `;` → `&&` no script `build`.

## Evidência determinística (reproduzível)
| Comando | Tempo | Resultado |
|---|---|---|
| `pnpm build` (com `;`) | **84ms** | só `dist/index.js` (esbuild). **vite build PULADO** — nenhum bundle frontend |
| `pnpm exec vite build` (isolado) | **56s** | bundle frontend gerado (3.69MB) |
| `pnpm build` (com `&&`, este fix) | **21s** | ✅ vite build RODA → `dist/public/assets/index-*.js` (3.69MB) |

→ Com `;`, o deploy rodava `pnpm build`, o vite era pulado, e o `dist/public` ficava com o bundle antigo (`index-CXg7VRDJ.js`, 1.3MB) — sem F7-A/B. Bundle de prod fresco **contém** F7-A/B (`grep "col-cnae-groups" → 1`, `"Grupos CNAE" → 3`).

## Mudanças deste PR
1. **`package.json` build:** `… > .env.production.local && vite build && esbuild …`
   - `;` → `&&` (corrige o skip do vite build — **o fix principal**).
   - `>>` → `>` (overwrite do `.env.production.local`; antes acumulava — 54 linhas — e o dotenv usa o PRIMEIRO valor → `VITE_BUILD_HASH` ficava congelado em `2df02fd` de 02/05).
2. **`AdminSolarisQuestions.tsx`:** marcador de build visível (`data-testid="build-hash"`) → `build: {VITE_BUILD_HASH}`. Permite **verificar instantaneamente qual bundle está no ar** (fecha o loop "está deployado?").

## Passos para o Manus (após merge)
```bash
# 1. Sincronizar com o git real (R-SYNC-02)
git fetch github refs/heads/main:refs/remotes/github/main
git reset --hard refs/remotes/github/main
git rev-parse --short HEAD                 # deve ser o HEAD pós-merge deste PR

# 2. Build limpo (agora o vite build RODA)
rm -rf dist/public node_modules/.vite
pnpm build                                 # DEVE levar ~20-60s e logar "✓ built in Xs" + "3083 modules transformed"
                                           # se logar "Done in <Xms>" SEM "modules transformed" → vite foi pulado (ABORTAR)

# 3. Confirmar bundle fresco gerado
ls dist/public/assets/index-*.js           # deve existir (hash novo)
grep -oE 'index-[A-Za-z0-9_-]+\.js' dist/public/index.html   # index.html aponta p/ o hash novo

# 4. Publicar / deploy a partir DESTE dist

# 5. Verificar produção (2 testes)
curl -s https://iasolaris.manus.space/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'
#   → deve ser o hash NOVO (não index-CXg7VRDJ.js)
#   → e a página Admin deve mostrar "build: <sha>" igual ao git HEAD
```

## Verificação final (GATE-PO-CNAE-ADMIN)
- Admin `/admin/solaris-questions` → header mostra `build: a4da5cb8…` (ou o HEAD atual) **e** coluna **"Grupos CNAE"** visível.
- Editar pergunta: adicionar grupo CNAE (chip "28") → `SELECT cnae_groups WHERE id=?` = `["28"]`.
- Editar removendo todos os chips → `cnae_groups IS NULL` (DoD negativo, Lição #138).

## Atualização (Docker / Cloud Build) — resiliência + DATABASE_URL

Após o 1º fix (`;`→`&&`), o deploy Docker falhou com **exit 1 sem output**. Duas causas distintas:

**(a) `git rev-parse` sem `.git` no Docker (NOSSO código — corrigido aqui).**
O build inline `node -e "...git rev-parse..."` **lança** quando o contexto Docker não tem `.git` → com `&&`, aborta o `vite build` → `pnpm build` exit 1. **Fix:** extraí para **`scripts/write-build-env.cjs`** — resiliente:
- resolve o hash por **env var de CI** (`SOURCE_COMMIT`/`GITHUB_SHA`/`MANUS_COMMIT`/…) quando houver;
- senão `git rev-parse` (dev); senão **`"unknown"`** (try/catch);
- **`process.exit(0)` sempre** → jamais bloqueia o `&& vite build`.
- Remove o quoting inline frágil (Docker-shell-safe).
- build agora: `node scripts/write-build-env.cjs && vite build && esbuild …`.
- Testado: `SOURCE_COMMIT=x` → usa x; git local → SHA; `pnpm build` → vite roda (3083 módulos).

> **Recomendação opcional (Manus):** injetar `SOURCE_COMMIT` (ou similar) no build do Docker para o marcador `build:` mostrar o SHA real (senão mostra `unknown`, o que ainda é válido — não quebra).

**(b) `DATABASE_URL` com `ssl={"rejectUnauthorized":true}` no `RUN` do Docker (PLATAFORMA Manus — fora do nosso código).**
As chaves `{ }` no valor são interpretadas pelo shell do Docker (brace expansion) → parse error no `RUN`. **Não é resolvível por código nosso.** Recomendações p/ o Manus:
- **Não injetar `DATABASE_URL` em build-time** — o `vite build` (frontend) e o `esbuild` (server) **não precisam** de DB para buildar. DATABASE_URL só é necessária em **runtime**. Mover o secret para runtime (ENV do container em execução), não para `ARG`/`RUN` do build.
- Se precisar no build, **aspas simples** em volta do valor no Dockerfile ou usar `--secret` (BuildKit) em vez de interpolar no `RUN`.

## Notas de governança
- `e73d6c73` (republish reportado) **NÃO é commit git** (`git cat-file` → not a valid object) — checkpoint Manus.space (REGRA-ORQ-25). O git real é `a4da5cb8`.
- Lição candidata (a commitar): "script de build com `;` em vez de `&&` pula etapas silenciosamente — deploy serve artefato stale" (estende REGRA-ORQ-25 / ADR-0037: artefato de prod ≠ git HEAD).
- ADR-0037 (4 HEADs) deveria ter pego: o "HEAD de produção" era o **artefato** (bundle), não o git — o gate precisa comparar o **build hash servido** vs git, não só o checkpoint.
