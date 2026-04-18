# E-mail Modelo — Convite para Testes UAT
## Plataforma IA SOLARIS — Compliance Tributário

> **Instruções de uso:** Copiar o texto abaixo, substituir os campos entre `[colchetes]` e enviar para cada advogado testador. Anexar o arquivo `GUIA-UAT-ADVOGADOS-v2.pdf` ao e-mail.

---

**Assunto:** [IA SOLARIS] Convite para Testes de Aceitação — Plataforma de Compliance Tributário

---

**Corpo do e-mail:**

Prezado(a) Dr(a). [NOME DO ADVOGADO],

Gostaríamos de convidá-lo(a) para participar dos testes de aceitação (UAT) da **Plataforma IA SOLARIS de Compliance Tributário**, desenvolvida para apoiar escritórios e departamentos jurídicos na adequação à Reforma Tributária.

**O que é o UAT?**
É uma rodada de testes conduzida pela equipe jurídica para validar se a plataforma está pronta para uso profissional com clientes reais. Sua avaliação é o gate de qualidade final antes do lançamento.

**Acesso à plataforma:**
- **URL:** https://iasolaris.manus.space
- **Como acessar:** Clique em "Entrar" e autentique com a conta Manus que será fornecida pela equipe Solaris
- **Após o primeiro login:** Informe seu e-mail para que o perfil `advogado_senior` seja ativado

**Regra obrigatória:** Todos os projetos criados durante os testes devem usar o prefixo **`[UAT]`** no nome. Exemplo: `[UAT] Empresa Teste Ltda`.

**Cronograma sugerido:**

| Dia | Data | Atividade estimada |
|---|---|---|
| Dia 1 | [DATA INÍCIO] | Acesso à plataforma + Cenários 1 e 2 (≈ 1h) |
| Dia 2 | [DATA +1] | Cenários 3–7 + avaliações jurídicas (≈ 1,5h) |
| Dia 3 | [DATA +2] | Cenário 8 + formulário de feedback (≈ 30min) |
| Dia 4 | [DATA +3] | Reunião de revisão (≈ 30min) |

**Guia completo de testes:** Em anexo (PDF) e também disponível em:
https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/GUIA-UAT-ADVOGADOS-v2.md

**Dúvidas ou problemas durante os testes?**
Contate [NOME DO RESPONSÁVEL TÉCNICO] pelo [CANAL DE COMUNICAÇÃO — ex: WhatsApp, Slack, e-mail].

Agradecemos sua participação. Sua avaliação jurídica é fundamental para garantir que a plataforma atenda às necessidades reais do trabalho tributário.

Atenciosamente,
[NOME DO P.O.]
Equipe Solaris

---

## Lista de Distribuição (preencher)

| # | Nome | E-mail | Conta Manus | Perfil Ativado? | Feedback Recebido? |
|---|---|---|---|---|---|
| 1 | | | | [ ] | [ ] |
| 2 | | | | [ ] | [ ] |
| 3 | | | | [ ] | [ ] |
| 4 | | | | [ ] | [ ] |
| 5 | | | | [ ] | [ ] |

---

## Checklist de Distribuição

- [ ] PDF do Guia UAT gerado e revisado
- [ ] E-mails enviados para todos os testadores
- [ ] Contas Manus criadas e compartilhadas
- [ ] Perfil `advogado_senior` ativado para cada testador (via banco de dados)
- [ ] Canal de suporte comunicado a todos
- [ ] Data da reunião de revisão (Dia 4) agendada no calendário

---

## Como ativar o perfil `advogado_senior`

Após o primeiro login de cada advogado, executar no painel de banco de dados do Manus:

```sql
-- Substituir 'email@advogado.com' pelo e-mail real do usuário
UPDATE users 
SET role = 'advogado_senior' 
WHERE email = 'email@advogado.com';

-- Verificar:
SELECT id, email, role FROM users WHERE email = 'email@advogado.com';
```

> **Atenção:** O campo `role` da tabela `users` aceita os valores: `admin`, `user`, `advogado_senior`. Confirmar que o valor exato está correto antes de executar.

---

*Documento preparado pela equipe técnica Solaris — 2026-03-23.*
