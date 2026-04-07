# Governança Operacional do Manus — Sprint 98% Confidence

**Versão:** 1.0  
**Data:** 2026-03-23  
**Milestone:** [Sprint-98-Confidence-Content-Engine](https://github.com/Solaris-Empresa/compliance-tributaria-v2/milestone/7)

---

## Sequência de blocos (ordem obrigatória)

| Bloco | Conteúdo | Gate | Status |
|-------|----------|------|--------|
| **B0** | Governança GitHub: milestone, labels, 34 issues, PR template, CONTRIBUTING.md, MANUS-GOVERNANCE.md | Checkpoint + Push | ✅ Concluído |
| **B1** | ADR-010, Matriz canônica inputs/outputs, Matriz de rastreabilidade req→pergunta→gap→risco→ação | Aprovação do Orquestrador | 🟡 Aguardando gate |
| **B2** | Implementação das 6 engines + briefing + shadow + CI | Checkpoint por engine + Shadow validation | 🔵 Backlog |

**Regra crítica:** nenhum bloco pode ser iniciado sem o gate do bloco anterior aprovado pelo Orquestrador.

---

## Rotina por bloco

### Ao iniciar um bloco
1. Verificar se o gate do bloco anterior foi aprovado
2. Ler as issues do bloco no GitHub (milestone `Sprint-98-Confidence-Content-Engine`)
3. Verificar `pnpm test` — todos os testes devem estar passando antes de começar

### Durante a implementação
1. Um commit por mudança significativa (não acumular)
2. Formato: `tipo(escopo): descrição` (ver CONTRIBUTING.md)
3. Push ao concluir cada issue (não ao final do bloco)
4. Atualizar o status da issue no GitHub ao concluir

### Ao concluir uma engine (B2)
1. Executar `pnpm test` — todos os testes passando
2. Executar `tsc --noEmit` — zero erros TypeScript
   > **Nota:** `tsc --noEmit` verifica compilação TypeScript. Gate Q7 (seção abaixo) é diferente — valida nomenclatura de interfaces. São verificações distintas e ambas são obrigatórias.
3. Executar Shadow Mode — zero divergências críticas novas
4. Criar checkpoint no Manus
5. Registrar evidências (output de test + screenshot Shadow Monitor)
6. Fechar a issue no GitHub com `Closes #N`

### Ao concluir um bloco
1. Push de todos os commits do bloco
2. Criar checkpoint no Manus com descrição do bloco
3. Notificar o Orquestrador para aprovação do gate
4. Aguardar aprovação antes de iniciar o próximo bloco

---

## Evidências obrigatórias por tipo de issue

| Label | Evidência obrigatória |
|-------|----------------------|
| `checkpoint-required` | Versão do checkpoint Manus registrada no PR |
| `shadow-required` | Screenshot do Shadow Monitor ou query SQL com resultado |
| `evidence-required` | Output de `pnpm test` + link do commit |
| `needs-orchestrator` | Aprovação explícita do Orquestrador antes do merge |

---

## Confidence Score — dimensões e pesos

O Confidence Score 98% é calculado sobre as seguintes dimensões:

| Dimensão | Peso | Métrica | Meta |
|----------|------|---------|------|
| Coverage regulatório | 25% | requisitos_cobertos / requisitos_aplicáveis | 100% |
| Qualidade de gaps | 15% | gaps_com_evidência / total_gaps | ≥ 95% |
| Consistência cross-stage | 15% | 1 - (contradições / total_checks) | ≥ 98% |
| Qualidade de perguntas | 10% | média dos scores LLM-as-judge | ≥ 4.0/5.0 |
| Precisão de riscos | 15% | riscos_com_origem_gap / total_riscos | 100% |
| Qualidade de ações | 10% | ações_com_template / total_ações | ≥ 95% |
| Estabilidade Shadow | 10% | 1 - (divergências_críticas / total_checks) | 100% |

**Score mínimo para promoção a produção:** 95%  
**Score alvo da sprint:** 98%

---

## Regras fundamentais (invioláveis)

1. **Fonte obrigatória:** toda pergunta tem `requirement_id` + `source_reference`
2. **Coverage total:** 100% dos requisitos aplicáveis avaliados antes do briefing
3. **Cadeia obrigatória:** Requisito → Gap → Risco → Ação (sem exceção)
4. **Anti-alucinação:** LLM transforma RAG, não cria conhecimento
5. **CNAE condicionado:** sem requisito aplicável → sem questionário

---

## Processos obrigatórios por sprint

| Processo | Momento | Responsável | Critério de aprovação |
|---|---|---|---|
| Gate 0 | Início de cada tarefa | Manus | HEAD confirmado + arquivos de governança lidos |
| Q1–Q5 | Em todo PR | Manus | Declaração explícita no body do PR |
| Q6 | PRs que tocam config/ ou mapeamento | Manus | Query SQL real executada, cobertura ≥ 80% |
| Gate 7 — Auto-auditoria | Fim de cada sprint | Manus executa 6 blocos · Orquestrador analisa · P.O. só valida após APROVADO ou APROVADO COM RESSALVAS resolvidas |

---

## Checkpoints da sprint

| Bloco | Versão Manus | Data | Status |
|-------|-------------|------|--------|
| B0 — Governança GitHub | *(a preencher)* | 2026-03-23 | 🟡 Em andamento |
| B1 — Modelo canônico | *(a preencher)* | *(a definir)* | 🔵 Aguardando B0 |
| B2 — Requirement Engine | *(a preencher)* | *(a definir)* | 🔵 Aguardando B1 |
| B2 — Question Engine | *(a preencher)* | *(a definir)* | 🔵 Aguardando B1 |
| B2 — Gap + Consistency Engine | *(a preencher)* | *(a definir)* | 🔵 Aguardando B1 |
| B2 — Risk + Action Engine | *(a preencher)* | *(a definir)* | 🔵 Aguardando B1 |
| B2 — Briefing + Relatório | *(a preencher)* | *(a definir)* | 🔵 Aguardando B1 |
| B2 — Shadow + CI + QA | *(a preencher)* | *(a definir)* | 🔵 Aguardando B1 |

---

## Links rápidos

- [Milestone Sprint-98-Confidence](https://github.com/Solaris-Empresa/compliance-tributaria-v2/milestone/7)
- [Issues abertas da sprint](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues?q=milestone%3ASprint-98-Confidence-Content-Engine+is%3Aopen)
- [ADR-010](../docs/adr/ADR-010-content-architecture-98.md) *(a criar em B1)*
- [Tabela de melhorias técnicas](../docs/product/cpie-v2/produto/TABELA-MELHORIAS-TECNICAS-HOW-v1.md)
- [Playbook v3.0](../docs/product/cpie-v2/produto/PLAYBOOK-DA-PLATAFORMA-v3.md)
- [Shadow Monitor](https://iasolaris.manus.space/admin/shadow-monitor)

---

## Erros Recorrentes e Lições Aprendidas

| Data | Erro | Causa Raiz | Resolução |
|------|------|-----------|-----------|
| 2026-04-01 | SOLARIS_GAPS_MAP 96% ineficaz | 7/10 chaves com acentos vs snake_case no banco — grep aceitou como OK, query real revelou falha | Q6 adicionado ao CONTRIBUTING.md |
| 2026-04-07 | Gate Q7 implementado como tsc check | Manus interpretou validação de interface como TypeScript check — `npx tsc --noEmit` não captura divergências de nomenclatura (DIV-Z01-003) | Gate Q7 corrigido para grep de interfaces neste PR |
| 2026-04-07 | Backend implementado sem frontend | product-questions.ts Z-01: 198 testes PASS, UI nunca conectada. Gate FC ausente (DIV-Z01-006) | Gate FC implementado neste PR |

---

## Gate Q7 — Validação de Interface (v4.2 · 2026-04-07)

> **ATENÇÃO:** Gate Q7 NÃO é TypeScript check.
> `npx tsc --noEmit` verifica compilação — já coberto pelo critério "TypeScript 0 erros" desde Sprint K.
> Gate Q7 valida **nomenclatura de campos de interface** contra a spec. São verificações diferentes.

**Quando aplicar:** obrigatório antes de qualquer prompt de testes que
referencie tipos do sistema: DiagnosticLayer · CompleteBriefing ·
TrackedQuestion · GapScore · RiskScore · CpieScore · QuestionResult ·
ou qualquer interface declarada em `server/lib/*.ts`

**Comando obrigatório:**
```bash
grep -rn "export interface\|export type\|export class" \
  server/lib/*.ts server/routers-fluxo-v3.ts \
  | grep -Ei "(diagnostic|briefing|gap|risk|cpie|tracked|question|score)" \
  | sort
```

**O que fazer com o resultado:**
1. Retornar output completo ao Orquestrador
2. Orquestrador confronta com spec (ADR-0009, DEC-M3-*, prompts)
3. SE campo real ≠ campo da spec → abrir DIV antes de prosseguir
4. SE campo real = campo da spec → Gate Q7 PASS · prosseguir

**Resultado obrigatório no body do PR:**
```
## Gate Q7 — Validação de Interface
Interfaces verificadas: [lista]
Divergências encontradas: [N] → [lista de DIVs abertas ou "nenhuma"]
Resultado: [ PASS | DIVERGÊNCIA DOCUMENTADA ]
```

---

## Regra DIV — Divergência de Spec vs Implementação

**O que é uma divergência:**
Qualquer diferença entre o campo/tipo/nome descrito na spec (prompt, ADR,
DEC) e o campo/tipo/nome real no código.

Exemplos:
- Spec: `result.layer` → Código: `result.cnaeCode`
- Spec: `result.sections` → Código: `result.section_identificacao`
- Spec: `status='insuficiente'` → Código: `status='parcial'`

**O que NÃO fazer:**
```
❌ Adaptar o assert silenciosamente
❌ Colocar a divergência só em comentário de código
❌ Ignorar e continuar
❌ Decidir sozinho qual está certo
```

**O que fazer SEMPRE:**
```
1. PARAR a implementação do bloco afetado
2. NÃO adaptar o assert — mantê-lo como na spec
3. CRIAR: docs/divergencias/DIV-{SPRINT}-{ID}-{campo}.md
   (usar template em docs/templates/DIV-TEMPLATE.md)
4. REPORTAR ao Orquestrador com o arquivo gerado
5. AGUARDAR decisão antes de continuar

O Orquestrador decide uma de três opções:
  A) Spec está errada → atualizar ADR/DEC com nome real
  B) Código está errado → corrigir código antes de testar
  C) São equivalentes → registrar como alias no ADR + adaptar assert
```

**Prioridade de reporte:**
```
CRÍTICO (parar sprint): campo inexistente · tipo incompatível · array vs objeto
ALTO (reportar antes do PR): nome diferente · campo opcional vs obrigatório
MÉDIO (reportar no body do PR): valor enum diferente · ordem de campos
```

**Histórico Z-01:**
| ID | Campo | Decisão |
|---|---|---|
| DIV-Z01-001 | DiagnosticLayer.layer vs cnaeCode | Opção A — spec atualizada |
| DIV-Z01-002 | CpieScore hasData | Opção A — spec atualizada |
| DIV-Z01-003 | Gate Q7 tsc vs grep | Opção B — código corrigido (este PR) |
| DIV-Z01-006 | Backend sem frontend | Gate FC implementado (este PR) |

---

## Gate FC — Feature Completeness (v4.3 · 2026-04-07)

**Origem:** BUG-MANUAL-02 — product-questions.ts implementado mas não
conectado ao frontend. 198 testes passaram; E2E manual falhou.

**Quando aplicar:** obrigatório em todo PR que:
  - Adiciona procedure em `server/routers-fluxo-v3.ts`
  - Cria novo endpoint tRPC com interação de usuário

**Comando obrigatório:**
```bash
./scripts/gate-fc.sh
```

**O que verifica:**
  1. Cada procedure nova tem referência em `client/src/`
  2. Rota correspondente existe em `App.tsx` (se aplicável)
  3. `connection-manifest.test.ts` tem entrada para a procedure

**Resultado no body do PR:**
```
## Gate FC — Feature Completeness
Procedures novas: [lista]
Consumidores verificados: [componentes encontrados]
Rotas em App.tsx: [verificadas ou N/A]
connection-manifest.test.ts: [atualizado? sim/não]
Resultado: [ PASS | BLOQUEADO ]
```

**Definição de "done" atualizada para features com UI:**
```
✅ Testes unitários PASS
✅ Testes integração backend PASS
✅ TypeScript 0 erros
✅ Gate Q7: interfaces validadas
✅ Gate FC: PASS — procedure tem consumidor no frontend   ← NOVO
✅ connection-manifest.test.ts atualizado                 ← NOVO
✅ E2E manual após deploy confirmado pelo P.O.            ← NOVO
```

**SE Gate FC BLOQUEADO:**
  → Não mergear o PR
  → Criar componente frontend antes
  → Re-executar gate-fc.sh
  → Atualizar connection-manifest.test.ts

**Histórico:** DIV-Z01-006 · BUG-MANUAL-02 · Sprint Z E2E manual
