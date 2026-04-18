# Template: Manus criar issue

## Regras obrigatórias

1. SEMPRE usar `--body-file` com spec fornecida pelo Orquestrador/Claude Code
2. NUNCA reescrever o body com texto próprio
3. Se body-file não fornecido: PARAR e pedir ao Orquestrador
4. Após criar: confirmar com `gh issue view [N] --json body | head -5`

## Formato obrigatório

```bash
cat > /tmp/issue-body.md << 'SPECBODY'
[conteúdo da spec — copiar EXATAMENTE como fornecido]
SPECBODY

gh issue create \
  --title "[título fornecido]" \
  --milestone "[milestone]" \
  --label "[labels]" \
  --body-file /tmp/issue-body.md
```

## Se Manus reescrever o body

Claude Code corrige via:
```bash
gh issue edit [N] --body-file /tmp/spec-correta.md
```

Manus NÃO deve resistir à correção.

## Evidência de retrabalho

Lição Z-18: Manus reescreveu specs 3x (#697 #701 #705) — 30+ min de retrabalho.
Template criado para prevenir recorrência.
