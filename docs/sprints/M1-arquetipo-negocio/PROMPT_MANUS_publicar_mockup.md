# Prompt Manus — Publicar MOCKUP_arquetipo_deterministico.html como URL pública

> Prompt autocontido seguindo convenção `.claude/rules/governance.md` (1 tarefa, HEAD explícito, git add por nome, terminar com FIM.).
> Gerado 2026-04-23 para o P.O. usar.

---

## Texto do prompt (copiar e colar para o Manus)

```
TAREFA ÚNICA: hospedar MOCKUP_arquetipo_deterministico.html em URL pública renderizada e documentar o link no repo.

CONTEXTO (autocontido — não consulte histórico, não leia outros arquivos):
- Repo: Solaris-Empresa/compliance-tributaria-v2
- Branch: docs/m1-arquetipo-exploracao
- HEAD esperado: 363168e (ou mais recente na mesma branch)
- Arquivo alvo: docs/sprints/M1-arquetipo-negocio/MOCKUP_arquetipo_deterministico.html
- Motivo: P.O. quer visualizar o mockup no navegador via link direto, sem clonar o repo.
- Status do projeto: fase de exploração pré-M1 (REGRA-M1-GO-NO-GO em vigor). Implementação M1 proibida.

RESTRIÇÕES:
- NÃO modificar o HTML (ele é artefato de análise)
- NÃO criar PR
- NÃO tocar outras branches (NÃO merge em main, NÃO checkout de main)
- NÃO rodar git add . OU git add -A (apenas git add por nome de arquivo específico)
- NÃO deployar em Vercel/Netlify/etc. (só opções nativas do GitHub)

PASSO 0 — R-SYNC-01 (sincronizar):
  git fetch origin
  git checkout docs/m1-arquetipo-exploracao
  git reset --hard origin/docs/m1-arquetipo-exploracao
  git log -1 --format="%H %s"
  # Confirmar que HEAD contém MOCKUP_arquetipo_deterministico.html:
  ls -la docs/sprints/M1-arquetipo-negocio/MOCKUP_arquetipo_deterministico.html

PASSO 1 — Checar visibilidade do repo:
  gh repo view Solaris-Empresa/compliance-tributaria-v2 --json visibility,isPrivate
  # guardar resultado: repo_visibility = public | private

PASSO 2 — Checar status atual do GitHub Pages:
  gh api repos/Solaris-Empresa/compliance-tributaria-v2/pages 2>&1 | head -30
  # possíveis resultados:
  # (a) 404 Not Found => Pages não habilitado
  # (b) JSON com source.branch => Pages habilitado em alguma branch

PASSO 3 — Decidir baseado em Passo 1 + Passo 2:

  CENÁRIO A: repo PUBLIC + Pages NÃO habilitado
    Ação: habilitar Pages na branch docs/m1-arquetipo-exploracao, path root
    Comando:
      gh api -X POST repos/Solaris-Empresa/compliance-tributaria-v2/pages \
        -f "source[branch]=docs/m1-arquetipo-exploracao" \
        -f "source[path]=/"
    URL final esperada:
      https://solaris-empresa.github.io/compliance-tributaria-v2/docs/sprints/M1-arquetipo-negocio/MOCKUP_arquetipo_deterministico.html
    Tempo de propagação: 1-3 minutos

  CENÁRIO B: repo PUBLIC + Pages JÁ habilitado em outra branch
    Ação: NÃO alterar configuração existente. Usar fallback htmlpreview.
    URL final:
      https://htmlpreview.github.io/?https://raw.githubusercontent.com/Solaris-Empresa/compliance-tributaria-v2/docs/m1-arquetipo-exploracao/docs/sprints/M1-arquetipo-negocio/MOCKUP_arquetipo_deterministico.html

  CENÁRIO C: repo PRIVATE (qualquer estado de Pages)
    Ação: criar gist público com o conteúdo do HTML
    Comando:
      gh gist create docs/sprints/M1-arquetipo-negocio/MOCKUP_arquetipo_deterministico.html \
        --public \
        --desc "IA SOLARIS M1 - Mockup Arquetipo Deterministico (2026-04-23)"
    Pegue o ID do gist no output (GIST_ID).
    URL final:
      https://htmlpreview.github.io/?https://gist.githubusercontent.com/<USERNAME>/<GIST_ID>/raw/MOCKUP_arquetipo_deterministico.html
    (substituir <USERNAME> e <GIST_ID> pelos valores reais do gh gist)

  CENÁRIO DE FALHA: se nenhuma das 3 opções funcionar
    PARAR. Reportar ao P.O.: qual cenário, qual comando falhou, qual erro.
    NÃO tentar alternativas não listadas.

PASSO 4 — Validar que a URL está respondendo:
  # aguardar 2 minutos se foi Cenário A (propagação do Pages)
  curl -sI "<URL_FINAL>" | head -5
  # esperado: HTTP/2 200 ou HTTP/1.1 200 OK
  # se 404 após 2min: aguardar mais 2min e retentar (Pages às vezes demora)
  # se ainda 404: relatar ao P.O. e oferecer Cenário B como fallback

PASSO 5 — Documentar no repo:
  Criar arquivo: docs/sprints/M1-arquetipo-negocio/MOCKUP_URL.md
  Conteúdo exato (use here-doc com EOF no começo da linha):

cat > docs/sprints/M1-arquetipo-negocio/MOCKUP_URL.md << 'EOF'
# Mockup — URL pública

**Arquivo fonte:** `MOCKUP_arquetipo_deterministico.html` (commit `363168e`)
**URL pública:** <URL_FINAL>
**Tipo de hospedagem:** <Pages | htmlpreview | gist>
**Data de publicação:** 2026-04-23
**Responsável:** Manus
**Cenário escolhido:** <A | B | C>
**Notas:**
- <caveat 1: tempo de propagação, cache, etc.>
- <caveat 2: expiração, autenticação, etc.>

## Como revalidar a URL
```bash
curl -sI "<URL_FINAL>" | head -5
```

## Como atualizar o mockup
Qualquer commit novo em `docs/m1-arquetipo-exploracao` que modifique o HTML é refletido automaticamente na URL (Pages/htmlpreview) ou requer novo `gh gist edit` (gist).
EOF

  Commit:
    git add docs/sprints/M1-arquetipo-negocio/MOCKUP_URL.md
    git commit -m "docs(m1): documenta URL publica do mockup arquetipo (cenario <X>)"
    git push origin docs/m1-arquetipo-exploracao

PASSO 6 — Reportar ao P.O. no chat:
  - URL final (clicável)
  - Cenário escolhido (A / B / C)
  - Saída do curl validando HTTP 200
  - Link do commit de MOCKUP_URL.md

CRITÉRIOS DE SUCESSO:
  [ ] URL responde HTTP 200
  [ ] URL renderiza o HTML (testar abrindo no navegador se possível)
  [ ] MOCKUP_URL.md criado e pushed
  [ ] Nenhuma outra branch ou arquivo foi tocado
  [ ] Zero implementação de produto feita (só config/docs)

FIM.
```

---

## Notas ao P.O. (não enviar ao Manus)

- **Se o repo for público**, o Cenário A (GitHub Pages) é o mais elegante: URL `solaris-empresa.github.io/...` vira permanente e atualiza automaticamente a cada push. Mas é a que mais mexe em config (habilita Pages no repo).
- **Se o repo for privado e org não tiver Pro/Enterprise**, o Cenário C (gist público) vaza conteúdo do mockup. Aceitável porque mockup não tem dado sensível (é UX estática).
- **Se quiser opção de menor impacto**, oriente o Manus a pular direto para o Cenário B (htmlpreview). Zero config no repo, requer apenas repo público.
- **Tempo esperado:** Manus deve concluir em 5-10 min (a maior parte é propagação do Pages).
- **Governance:** o commit de `MOCKUP_URL.md` é o rastreio formal — qualquer pessoa vendo o repo encontra a URL.
