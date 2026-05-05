# Checklist de Validação — Sprint M3.10 Fase 3a (PoC)

**Origem:** Decisão P.O. 2026-05-05 — testes runtime de hooks/commands não puderam ser executados na sessão de criação porque `.claude/settings.local.json` modificado em sessão ativa não recarrega.

**Pré-requisito:** Esta branch (`feat/claude-hooks-poc`) deve estar checkout em **NOVA sessão Claude Code** (reload completo). Comando `/hooks` na UI também pode forçar reload.

---

## Testes a executar (na ordem)

### Teste 1 — Custom Command `/echo-test` invocável

- [ ] Digitar `/echo-test hello world` no prompt
- [ ] **Esperado:** output contendo `ECHO-TEST OK: recebi [hello world]`
- [ ] **Se falhar:** verificar se `.claude/commands/echo-test.md` está commitado, se sintaxe `$ARGUMENTS` é reconhecida, se frontmatter YAML está válido

### Teste 2 — Hook PreToolUse dispara em Edit

- [ ] Fazer Edit em qualquer arquivo (ex: adicionar comentário em arquivo de teste)
- [ ] **Esperado:** ver `HOOK-POC: tool=Edit file=<caminho>` no stderr/log
- [ ] **Se falhar:** verificar `.claude/settings.local.json` matcher syntax (`Edit` case-sensitive), verificar permissão de execução do `.sh` (`chmod +x`)

### Teste 3 — Hook NÃO bloqueia (exit 0)

- [ ] Confirmar que o Edit do Teste 2 EXECUTOU normalmente
- [ ] **Esperado:** arquivo modificado com sucesso (não bloqueado)
- [ ] **Se falhar:** verificar exit code do script — deve ser `exit 0`

### Teste 4 — Hook NÃO dispara em Read

- [ ] Fazer Read de qualquer arquivo
- [ ] **Esperado:** NENHUM output `HOOK-POC:` (matcher é apenas `Edit`)
- [ ] **Se falhar:** matcher pode estar amplo demais — revisar settings.local.json

### Teste 5 — Bloqueio com `exit 2` (APÓS testes 1-4 verdes)

- [ ] Editar `.claude/hooks/poc-edit-detector.sh` linha final, trocar `exit 0` por `exit 2`
- [ ] Tentar Edit em qualquer arquivo
- [ ] **Esperado:** Edit BLOQUEADO com mensagem de erro
- [ ] **REVERTER** script para `exit 0` IMEDIATAMENTE após o teste (importante)

### Teste 6 — Matcher case-sensitive

- [ ] Editar `.claude/settings.local.json`, trocar `"matcher": "Edit"` por `"matcher": "edit"` (minúsculo)
- [ ] Reload sessão
- [ ] Fazer Edit
- [ ] **Esperado:** hook NÃO dispara (matcher case-sensitive)
- [ ] **REVERTER** matcher para `"Edit"` IMEDIATAMENTE após o teste

---

## Resultado

| # | Teste | Status | Observação |
|---|---|---|---|
| 1 | /echo-test invocável | ✅ / ❌ | |
| 2 | Hook dispara em Edit | ✅ / ❌ | |
| 3 | Hook NÃO bloqueia | ✅ / ❌ | |
| 4 | Hook NÃO dispara em Read | ✅ / ❌ | |
| 5 | exit 2 bloqueia | ✅ / ❌ | |
| 6 | Matcher case-sensitive | ✅ / ❌ | |

---

## Critério go/no-go automático para Fase 3b

Conforme decisão P.O. 2026-05-05:

- **6/6 verde** → Fase 3b auto-autorizada (executar imediatamente sem nova autorização)
- **5/6 com 1 workaround documentado** → GO com ajuste documentado
- **< 5/6 verde** → STOP e reportar antes de prosseguir

## Após validação

Reportar tabela completa ao P.O. Se 6/6, prosseguir com Fase 3b:
- Criar `.claude/skills/investigate-deep/SKILL.md` (auto-invocada via `paths:` frontmatter)
- Criar `.claude/skills/safe-fix-pipeline/SKILL.md`
- Criar `.claude/hooks/require-investigation.sh` (bloqueante, exit 2 quando evidência ausente)
- Atualizar `.claude/settings.json` (commitado, não local) com hook PreToolUse + matcher + path filter
- Tests funcionais que confirmem bloqueio em arquivo crítico sem evidência

## Achados empíricos da Fase 3a (Sprint M3.10)

1. **`jq` indisponível no Windows** — script PoC adaptado para Node.js como fallback (parser JSON via stdin)
2. **`settings.local.json` não recarrega em sessão ativa** — modificações requerem reload do Claude Code
3. **Hooks JÁ EXISTEM no projeto** (3 ativos em `.claude/settings.json`: SessionStart, PreToolUse `Bash(git push*)`, PostToolUse `Write|Edit`) — padrão validado em produção
4. **`ast-grep 0.42.1` instalado** globalmente via `npm install -g @ast-grep/cli` sem bloqueio de sandbox

## Vinculadas

- PR #981 — Fase 1 (REGRA-ORQ-35 + ORQ-36 + Lições #69-#70)
- Decisão P.O. 2026-05-05 — Opção A: commit PoC + reload
- Pesquisa Fase 2 (`claude-code-guide` agent) — confirmou viabilidade hooks
- Sprint M3.10 — bug mono-fonte que motivou enforcement mecânico
