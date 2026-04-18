# ORQ-16 — Governance Hard-Enforced
## IA SOLARIS · v1.0 · 2026-04-15 · P.O.: Uires Tapajos

## Objetivo
Impedir tecnicamente qualquer implementacao:
- sem aprovacao do P.O.
- misturando fases F1 (definicao) e F2 (execucao)
- por pressao de velocidade

## Regra central
SEM APPROVED_SPEC.json VALIDO → PROIBIDO IMPLEMENTAR

## Fluxo obrigatorio
1. P.O. define decisao
2. Spec criada em /docs/specs/
3. P.O. aprova
4. APPROVED_SPEC.json gerado com hash da spec
5. Commit do artefato
6. Claude Code implementa
7. CI valida governanca
8. Merge permitido

## Proibicoes absolutas
- Nenhum codigo sem gate aprovado
- Nenhum prompt de implementacao sem artefato
- Nenhuma alteracao de spec apos aprovacao

## Checklist ORQ-16 (obrigatorio antes de F3)
Para todo lote de frontend:
1. grep data-testid no mockup → lista completa
2. grep data-testid no componente → lista completa
3. diff entre os dois
4. Gap = 0 e pre-requisito para F3
5. Cada elemento sem issue = defer documentado pelo P.O.
