---
name: gate-check
description: Verificar labels e seções de uma issue GitHub para F3. Use ao auditar spec, checar gate, verificar issue antes de implementar.
---

# Gate Check — Auditoria F3

Verificar issue $ARGUMENTS contra 5 labels obrigatórias e 4 seções de spec.

## Executar:

1. Ler labels da issue:
```bash
gh issue view $ARGUMENTS --json labels --jq '[.labels[].name]'
```

2. Verificar 5 labels presentes:
   - `spec-bloco9`
   - `spec-adr`
   - `spec-contrato`
   - `spec-e2e`
   - `spec-aprovada`

3. Ler body e verificar 4 seções:
```bash
BODY=$(gh issue view $ARGUMENTS --json body --jq '.body')
echo "$BODY" | grep -c "Bloco 9"
echo "$BODY" | grep -c "ADR"
echo "$BODY" | grep -c "Contrato"
echo "$BODY" | grep -c "Fluxo E2E\|E2E"
```

4. Reportar:
   - 5 labels: SIM/NÃO (listar ausentes)
   - 4 seções: SIM/NÃO (listar ausentes)
   - Veredicto: APROVADA (16/16) ou DEVOLVIDA (motivo)

**NUNCA iniciar implementação sem veredicto APROVADA.**
