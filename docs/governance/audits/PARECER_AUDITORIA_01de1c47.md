# Parecer ao Orquestrador — Auditoria Profunda HEAD `01de1c47` (épico regime tributário F1-F6)

**Data:** 19/06/2026
**Autor:** Consultor / Orquestrador
**Objeto:** Auditoria de fechamento do épico ADR-0038 (regime tributário) — produção pós-#1524 (F6)
**Veredito:** ✅ **Auditoria sólida — fecha legitimamente.** As duas pendências que eu havia bloqueado foram resolvidas e comprovadas. Resta 1 ressalva menor e 2 observações de acompanhamento.

---

## 1. As duas pendências que eu bloqueei — RESOLVIDAS e comprovadas

No parecer anterior, bloqueei o avanço até duas verificações. Ambas agora têm evidência bruta:

### 1.1 Tabela `tax_regimes` — a verificação crítica que estava em aberto

| Verificação exigida | Resultado nesta auditoria | Status |
|---|---|---|
| `solaris_questions.tax_regimes` existe | ✅ Confirmado (INFORMATION_SCHEMA.COLUMNS) | ✅ **Resolvido** |
| `projects.tax_regimes` NÃO existe | ✅ 0 rows (INFORMATION_SCHEMA.COLUMNS) | ✅ **Resolvido** |

**Este era o bloqueio principal.** O report anterior do Manus dizia "ALTER TABLE projects" (errado). A auditoria agora prova, com query em INFORMATION_SCHEMA, que a coluna está em `solaris_questions` (alvo correto da migration 0127) e **não** em `projects`. O erro era typo no report, não no banco — o cenário benigno da árvore de decisão do parecer anterior. A coluna está na tabela certa. F2/F3 leem o alvo correto. Bloqueio levantado legitimamente.

### 1.2 DoD negativo (NULL = universal) — comprovado por SQL

| Verificação | Resultado |
|---|---|
| 18 perguntas ativas, todas `tax_regimes = NULL` | ✅ `WHERE ativo=1 AND tax_regimes IS NOT NULL` → 0 rows |
| Filtro inerte por design | ✅ Confirmado — null = universal = exibição inalterada |

O filtro está genuinamente inerte (não "inerte por erro de coluna inexistente", que era meu receio anterior). Como a coluna existe em `solaris_questions` e está toda NULL, o "universal" é por design, não por falha. O receio do parecer anterior (filtro mascarando erro) está **descartado por evidência**.

---

## 2. A pendência D-C (fallback do AND) — parcialmente endereçada, ver ressalva

O parecer anterior pediu confirmar que o fallback do AND trata "CNAE não-mapeado incluindo categoria genérica" (caso V-10). A auditoria **não testa esse caminho diretamente** — e há uma razão: com todas as 18 perguntas em `tax_regimes=NULL`, o filtro AND ainda **não está ativo** (tudo é universal). O fallback D-C só será exercitado quando o Dr. José popular regimes (uso real de F5).

| Aspecto | Status |
|---|---|
| Fallback D-C implementado no código (F2/F3) | ❓ Não evidenciado nesta auditoria (não testável com tudo NULL) |
| Fallback D-C exercitado em produção | ⏳ Só ocorrerá quando regimes forem populados |

**Ressalva:** a auditoria fecha o épico **estruturalmente** (backend + UI + CSV entregues, inertes e seguros), mas o **comportamento do filtro com dados reais ainda não foi exercitado** — porque não há dados reais ainda (tudo NULL). Isto não invalida o fechamento, mas significa que o GATE-PO-REGIME-TRIBUTARIO (teste manual T1-T5) precisa, quando o Dr. José popular ao menos uma pergunta com regime específico, validar explicitamente o caso V-10: empresa com CNAE genérico + pergunta marcada para `lucro_real` → a pergunta deve aparecer (fallback considera só regime), não desaparecer. Registrar este caso de teste no GATE-PO.

---

## 3. Avaliação dos demais gates

| Gate | Avaliação |
|---|---|
| Gate 0 — 4 HEADs alinhados (`01de1c47`) | ✅ Sólido — todos os 4 artefatos no mesmo HEAD, 0 PRs abertos, tsc 0. Cumpre o ADR-0037 que a sessão criou |
| Gate 2 — 9/9 fluxos E2E | ✅ Todos PASS com URL e evidência. Fluxo 5 (Risk Dashboard v4) na rota CERTA (`/risk-dashboard-v4`), não a legada — corrige o erro do v82 |
| Gate 3 — F5 Admin (T1/T4) | ✅ Coluna "Regimes" visível, badges "Todos" (=NULL=universal), CRUD presente |
| Gate 4 — F6 CSV (T3/T5) | ✅ Tab Upload CSV presente, regressão NULL confirmada por SQL |
| Gate 5 — Environment | ✅ `ENABLE_UNIFIED_ELIGIBILITY=true` confirmado — **o flip da PR-B F4 foi ativado** |

### 3.1 Destaque positivo — A-2/A-3 validados na rota certa

O tracing do Risk Dashboard v4 (projeto 8760001) confirma deterministicamente:

```
Categorias geradas (4): split_payment, confissao_automatica,
                        inscricao_cadastral, obrigacao_acessoria
                        (todas op:industria::geo:multi)
Categorias AUSENTES (correto):
  - transicao_iss_ibs (A-2) ✅
  - regime_diferenciado (A-3) ✅
  - imposto_seletivo (IS gate NCM/CNAE, 8436 não mapeado) ✅
```

Isto valida, em produção e na rota certa, **três coisas da sessão de uma vez**: os fixes A-2/A-3 (#1507), e que o IS está sendo gateado por NCM/CNAE (não aparece para 8436 não-mapeado) — exatamente o D1-IS / Art. 409 §1º que fundamentei. A ausência do IS confirma que o flip parcial (Opção 2) funcionou como projetado: o IS não vazou amplo.

### 3.2 O flip da PR-B F4 foi ativado (Gate 5)

`ENABLE_UNIFIED_ELIGIBILITY=true` em produção significa que o cold→hot da PR-B F4 foi executado pelo Manus. Combinado com o tracing 3.1 (zero falsos positivos), o flip parece seguro em produção. **Mas:** a auditoria não mostra o teste de **paridade F2≡F3** rodado pós-flip (estava previsto). O tracing mostra a matriz correta, mas não a comparação matriz≡Onda 2 sob flag ON. Ver observação 4.2.

---

## 4. Observações de acompanhamento (não bloqueiam o fechamento)

### 4.1 V-10-FALLBACK persiste (NCM 8436 → genérico)

O perfil mostra `Objeto: bens_mercadoria_geral [Fallback - baixa confiança]`. O NCM-símbolo da sessão continua caindo em genérico. Já rastreado em #1510 (P2). Não bloqueia, mas registro: o produto-bandeira ainda não está mapeado. Confiança 100/100 do perfil é por confirmação do usuário, não por mapeamento do NCM — distinção que vale manter visível.

### 4.2 Paridade F2≡F3 pós-flip não evidenciada

O Gate 5 confirma a flag ON, e o tracing 3.1 mostra a matriz correta. Mas o **teste de paridade** (matriz≡Onda 2 sob flag ON) — pré-condição que o parecer do flip estabeleceu — não aparece na auditoria. Recomendo confirmar que o smoke da Onda 2 (geração de perguntas) sob flag ON não introduziu perguntas indevidas, especialmente do IS (que na Onda 2 mantém o gate legado `[industria,comercio]`). Para o projeto 8760001 (indústria), o IS legado geraria pergunta — verificar se isso é o esperado ou se roça ORQ-29.

### 4.3 Shadow Monitor — 37 divergências, 0 críticas

O padrão "briefingContent: legada tem valor, nova é null" é explicado como shadow mode funcionando (leitura nova retorna null quando briefing não regenerado). Plausível. Mas 37 divergências acumuladas merecem, em algum momento, uma reconciliação — não como bloqueio, mas para o shadow mode não virar ruído permanente que esconda uma divergência real futura. Quando o `DIAGNOSTIC_READ_MODE` migrar de `shadow` para `live`, essas 37 precisam estar entendidas. Registrar como acompanhamento.

---

## 5. Síntese

| Dimensão | Veredito |
|---|---|
| Pendência tabela `tax_regimes` (bloqueio anterior) | ✅ **Resolvida** — coluna em solaris_questions, ausente em projects (SQL) |
| Pendência DoD NULL=universal | ✅ **Comprovada** — 0 rows não-nulas |
| Pendência D-C fallback | ⚠️ Não exercitável com tudo NULL — validar no GATE-PO quando regimes forem populados |
| 4 HEADs / tsc / 0 PRs | ✅ Sólido |
| 9/9 E2E na rota certa | ✅ Risk Dashboard v4 correto (não legado) |
| A-2/A-3 + IS gate | ✅ Validados em produção via tracing |
| Flip PR-B F4 (flag ON) | ✅ Ativado; ⚠️ paridade F2≡F3 não evidenciada |
| Épico regime tributário F1-F6 | ✅ **Fecha estruturalmente** |

### Veredito final

A auditoria é **legítima e fecha o épico**. As duas pendências que eu havia bloqueado (tabela e DoD) foram resolvidas com evidência bruta — a tabela estava certa no banco (era typo no report anterior), e o DoD NULL=universal está provado. O fechamento é honesto: backend + UI + CSV entregues, inertes por design, sem regressão.

As três observações (V-10, paridade F2≡F3, shadow 37) **não bloqueiam** — são acompanhamentos. A única que recomendo não esquecer é a **D-C no GATE-PO**: quando o Dr. José popular o primeiro regime, testar explicitamente o caso V-10 (CNAE genérico + pergunta com regime → pergunta deve aparecer). É o único comportamento que o épico entrega mas que ainda não foi exercitado, por não haver dados.

---

## 6. Recomendação de fechamento

| # | Ação | Quando |
|---|---|---|
| 1 | Declarar épico regime tributário (F1-F6) fechado | Agora — auditoria sustenta |
| 2 | Arquivar esta auditoria em `docs/governance/audits/` | Antes de encerrar (REGRA-ORQ-19 — não repetir o gap do ORQ-19 v7.79) |
| 3 | Incluir caso V-10 no GATE-PO-REGIME-TRIBUTARIO | Quando Dr. José popular o 1º regime (F5 uso real) |
| 4 | Confirmar paridade F2≡F3 pós-flip (smoke Onda 2) | Próxima sessão — fecha a PR-B F4 |
| 5 | Manter #1510 (V-10) e shadow-37 no radar | Backlog |

O item 2 é o que eu faria **antes** de declarar encerrado — pelo padrão que a sessão estabeleceu: o ORQ-19 v7.79 ficou com o veredito não-arquivado, e seria incoerente fechar este épico repetindo o mesmo gap. Auditoria que prova produção limpa merece estar versionada, não só em chat.

---

*Parecer determinístico. Evidência bruta verificada: INFORMATION_SCHEMA (tabela), SQL DoD (NULL=universal), tracing Risk Dashboard v4 (A-2/A-3/IS). Pendências anteriores resolvidas. Fundamento jurídico do IS (Art. 409 §1º) confirmado em produção pela ausência de IS para NCM 8436 não-mapeado.*
