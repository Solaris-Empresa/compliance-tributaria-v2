# Fluxo de Escalação — IA Solaris

**Plataforma:** https://iasolaris.manus.space
**Audiência:** Advogados e usuários da plataforma em produção
**Versão:** 1.0 — 2026-03-24

---

## Como usar este documento

Se algo não está funcionando como esperado, siga a ordem abaixo. A maioria dos problemas é resolvida nos níveis 1 ou 2 sem precisar contato direto com a equipe técnica.

---

## Nível 1 — Autoconsulta (resolva sem esperar)

Antes de contatar suporte, verifique:

**1. Consulte o FAQ**
→ `docs/suporte/FAQ.md` — cobre os problemas mais comuns com respostas imediatas.

**2. Verifique sua conexão e perfil de acesso**
- Você está acessando https://iasolaris.manus.space com sua conta Manus?
- Seu perfil `advogado_senior` foi atribuído? (Se não, você verá funcionalidades bloqueadas — isso é Nível 2)

**3. Tente um reload simples**
- Pressione `Ctrl + Shift + R` (Windows) ou `Cmd + Shift + R` (Mac) para limpar o cache e recarregar.
- Se o problema persistir após o reload, avance para o Nível 2.

**Tempo esperado:** Imediato.

---

## Nível 2 — Suporte interno Solaris

**Quando acionar:** Problema persiste após Nível 1, ou você identificou um comportamento inesperado do sistema.

**Como acionar:**

1. **Documente o problema** com as informações abaixo antes de contatar:

```
Etapa em que ocorreu:
  [ ] Criação de projeto   [ ] Questionário   [ ] Briefing
  [ ] Matrizes de risco   [ ] Plano de ação   [ ] Outro: _______

Ação que você realizou:
[descreva o que fez]

Comportamento esperado:
[o que deveria ter acontecido]

Comportamento observado:
[o que aconteceu de fato]

Nome do projeto afetado (prefixo [UAT] se em ambiente de teste):
[nome do projeto]

Horário aproximado:
[hora e data]

Navegador utilizado:
[ ] Chrome  [ ] Firefox  [ ] Safari  [ ] Edge  [ ] Outro: _______
```

2. **Envie para o canal técnico** da equipe Solaris (canal definido pelo P.O. Uires Tapajós).

**Tempo de resposta esperado:**
- Problemas que bloqueiam o fluxo (P0/P1): resposta em até 1 hora em horário comercial.
- Problemas que degradam a experiência (P2): resposta em até 4 horas.
- Dúvidas e melhorias (P3): próximo dia útil.

---

## Nível 3 — Escalação técnica urgente (P.O.)

**Quando acionar:** O problema bloqueia completamente o trabalho e o Nível 2 não foi resolvido em 1 hora, **ou** você identificou comportamento que compromete a integridade jurídica dos dados gerados (briefing incorreto, riscos ausentes, plano inconsistente com o CNAE).

**Acionar diretamente:** P.O. Uires Tapajós pelo canal definido internamente.

**O que constitui escalação urgente (P0):**

| Situação | Nível |
|---|---|
| Plataforma fora do ar — nenhum usuário consegue acessar | P0 |
| Projeto perdido ou dados apagados sem ação do usuário | P0 |
| Briefing ou matrizes com conteúdo juridicamente incorreto ou perigoso | P0 |
| Loop infinito ou tela travada sem possibilidade de avançar | P1 |
| Perfil `advogado_senior` não atribuído e bloqueando acesso | P1 |
| Etapa do fluxo não salva os dados corretamente | P1 |
| Geração de briefing/matriz/plano demora mais de 5 minutos | P2 |
| Textos de interface com erros ou mensagens confusas | P3 |

---

## Classificação de severidade

| Severidade | Definição | Resposta esperada |
|---|---|---|
| **P0 — Crítico** | Sistema inoperante ou dados comprometidos | Até 1 hora |
| **P1 — Alto** | Bloqueia o fluxo de trabalho do usuário | Até 1 hora (horário comercial) |
| **P2 — Médio** | Degrada a experiência, mas permite contornar | Até 4 horas |
| **P3 — Baixo** | Melhoria ou dúvida, não impede uso | Próximo dia útil |

---

## O que NÃO escalas por aqui

- Dúvidas sobre a LC 214/2025 ou interpretação jurídica dos resultados → consulte seu time jurídico.
- Solicitações de novos CNAEs ou funcionalidades → registre como sugestão no formulário de feedback do UAT.
- Problemas com sua conta Manus (senha, acesso) → suporte da plataforma Manus.

---

## Histórico de escalações

O registro de incidentes é mantido internamente em:
`docs/ERROS-CONHECIDOS.md` — 10 erros catalogados com runbooks de resolução.

Se o seu problema já está descrito lá, a solução também estará.

---

*ESCALACAO.md — IA Solaris v1.0 · 2026-03-24*
*Responsável: P.O. Uires Tapajós*
*Revisão: ao final de cada sprint ou quando um novo padrão de incidente for identificado*
