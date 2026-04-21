# Vitest Realtime Progress

**Started:** 2026-04-21T21:51:45.964Z
**Output:** reports/battery-current/progress.md

| Arquivo | Teste | Estado | Duração | Timestamp |
|---|---|---|---|---|
| briefing-sanitizer.test.ts | server/lib/briefing-sanitizer.test.ts | PASS | 10ms | 2026-04-21T21:51:46.328Z |
| briefing-sanitizer.test.ts | briefing-sanitizer | PASS | 10ms | 2026-04-21T21:51:46.328Z |
| briefing-sanitizer.test.ts | cenário real do incidente UAT 2026-04-21 | PASS | 4ms | 2026-04-21T21:51:46.328Z |
| briefing-sanitizer.test.ts | bloqueia NCMs citados quando usuário não cadastrou nenhum | PASS | 3ms | 2026-04-21T21:51:46.328Z |
| briefing-sanitizer.test.ts | códigos autorizados (cadastrados em meta.ncms) | PASS | 1ms | 2026-04-21T21:51:46.328Z |
| briefing-sanitizer.test.ts | permite NCM cadastrado sem disclaimer | PASS | 0ms | 2026-04-21T21:51:46.328Z |
| briefing-sanitizer.test.ts | normaliza NCM com ponto (1006.10) vs sem ponto (1006) | PASS | 0ms | 2026-04-21T21:51:46.329Z |
| briefing-sanitizer.test.ts | caso misto — 1006 autorizado mas 0713 não | PASS | 0ms | 2026-04-21T21:51:46.329Z |
| briefing-sanitizer.test.ts | repetições do mesmo código | PASS | 1ms | 2026-04-21T21:51:46.329Z |
| briefing-sanitizer.test.ts | disclaimer completo só na primeira ocorrência | PASS | 1ms | 2026-04-21T21:51:46.329Z |
| briefing-sanitizer.test.ts | NBS (serviços) | PASS | 1ms | 2026-04-21T21:51:46.329Z |
| briefing-sanitizer.test.ts | bloqueia NBS não cadastrado | PASS | 0ms | 2026-04-21T21:51:46.329Z |
| briefing-sanitizer.test.ts | permite NBS cadastrado | PASS | 0ms | 2026-04-21T21:51:46.329Z |
| briefing-sanitizer.test.ts | feature flag | PASS | 1ms | 2026-04-21T21:51:46.329Z |
| briefing-sanitizer.test.ts | BRIEFING_SANITIZER_ENABLED=false → no-op | PASS | 0ms | 2026-04-21T21:51:46.329Z |
| briefing-sanitizer.test.ts | default (sem env var) → sanitizer ativo | PASS | 1ms | 2026-04-21T21:51:46.329Z |
| briefing-sanitizer.test.ts | edge cases | PASS | 1ms | 2026-04-21T21:51:46.329Z |
| briefing-sanitizer.test.ts | markdown sem NCM/NBS → sem mudanças | PASS | 0ms | 2026-04-21T21:51:46.329Z |
| briefing-sanitizer.test.ts | meta undefined → comporta como vazio | PASS | 0ms | 2026-04-21T21:51:46.329Z |
| briefing-sanitizer.test.ts | caixa variada (ncm, Ncm, NCM) → todos capturados | PASS | 0ms | 2026-04-21T21:51:46.329Z |
| briefing-sanitizer.test.ts | é determinístico — mesma entrada → mesma saída | PASS | 0ms | 2026-04-21T21:51:46.329Z |
| briefing-quality.test.ts | server/lib/briefing-quality.test.ts | PASS | 8ms | 2026-04-21T21:51:46.329Z |
| briefing-quality.test.ts | calculateBriefingQuality | PASS | 5ms | 2026-04-21T21:51:46.329Z |
| briefing-quality.test.ts | cenário canônico — empresa com produtos e serviços | PASS | 3ms | 2026-04-21T21:51:46.329Z |
| briefing-quality.test.ts | projeto vazio (0/5 questionários, sem produtos/serviços, sem descrição) → 0% | PASS | 1ms | 2026-04-21T21:51:46.329Z |
| briefing-quality.test.ts | projeto completo (5/5, 100% classificação, descrição rica) → 100% | PASS | 0ms | 2026-04-21T21:51:46.329Z |
| briefing-quality.test.ts | projeto meio caminho (3/5, 50% classificação, descrição ok) → ~65% | PASS | 0ms | 2026-04-21T21:51:46.329Z |
| briefing-quality.test.ts | redistribuição (sem produtos nem serviços cadastrados) | PASS | 1ms | 2026-04-21T21:51:46.329Z |
| briefing-quality.test.ts | pesos redistribuídos: questionário 60% + descrição 40% | PASS | 0ms | 2026-04-21T21:51:46.329Z |
| briefing-quality.test.ts | só descrição rica (sem questionários, sem produtos) → 40% | PASS | 0ms | 2026-04-21T21:51:46.329Z |
| briefing-quality.test.ts | edge cases | PASS | 2ms | 2026-04-21T21:51:46.329Z |
| briefing-quality.test.ts | questionariosRespondidos > total → clampado em 100% | PASS | 0ms | 2026-04-21T21:51:46.329Z |
| briefing-quality.test.ts | descrição null → component 0 | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| briefing-quality.test.ts | projeto real do UAT 2026-04-21 (0/5, sem produtos, descrição 24 palavras) → 20% | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| briefing-quality.test.ts | determinístico — mesmo input → mesmo output | PASS | 1ms | 2026-04-21T21:51:46.330Z |
| briefing-quality.test.ts | classifyMaturityBadge — assinatura legada (só confidence) | PASS | 1ms | 2026-04-21T21:51:46.330Z |
| briefing-quality.test.ts | conf<40 E qualidade sem informação → MAPA_REGULATORIO | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| briefing-quality.test.ts | 40..84 → DIAGNOSTICO_PARCIAL | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| briefing-quality.test.ts | >=85 SOZINHO não garante COMPLETO — exige AND com qualidade/cadastro/questionários | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| briefing-quality.test.ts | null/undefined/NaN → MAPA_REGULATORIO (conservador) | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| briefing-quality.test.ts | labels canônicos | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| briefing-quality.test.ts | classifyMaturityBadge — assinatura multi-sinal (fix UAT 2026-04-21) | PASS | 1ms | 2026-04-21T21:51:46.330Z |
| briefing-quality.test.ts | AND completo → DIAGNOSTICO_COMPLETO | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| briefing-quality.test.ts | cenário UAT 2026-04-21 (conf=85, qual=76, 0 produtos, 3/5 quest) → PARCIAL (não COMPLETO) | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| briefing-quality.test.ts | conf=90 mas sem cadastro → PARCIAL (falha no AND) | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| briefing-quality.test.ts | conf=90 mas qualidade=70 → PARCIAL | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| briefing-quality.test.ts | conf=90 mas questionários 3/5 (60%) → PARCIAL (ratio<0.8) | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| briefing-quality.test.ts | conf=30 E qualidade=20 → MAPA (ambos fracos) | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| briefing-quality.test.ts | conf=30 mas qualidade=50 → PARCIAL (qualidade salva) | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| briefing-quality.test.ts | serviços ao invés de produtos também conta como cadastro | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| briefing-quality.test.ts | 4/5 questionários (ratio 0.8) atinge o limite para COMPLETO | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | server/lib/calculate-briefing-confidence.test.ts | PASS | 11ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | calculate-briefing-confidence — v2 ponderada | PASS | 10ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | pesos canônicos (fonte única da verdade) | PASS | 3ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | pesos 8/10/10/10/5/2 | PASS | 1ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | Q3 composto: 30% cadastro + 70% respostas | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | denominador total por tipo — produto=35, servico=35, mista=45 | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | cenários canônicos | PASS | 1ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | tudo zero + mista → 0% | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | tudo 100% + mista → 100% | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | modelo composto Q3 — regra crítica 30/70 | PASS | 2ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | Q3 Produtos com 0 cadastrados → completude = 0 | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | Q3 Produtos com 3 cadastrados e 0 NCM → ratio cadastro = 0, total = 0 | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | Q3 Produtos: 3/3 com NCM + 0 respostas → 0,3·1 + 0,7·0 = 30% do pilar | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | Q3 Produtos: 3/3 NCM + 5/10 respostas → 0,3·1 + 0,7·0,5 = 0,65 → 65% | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | Q3 Produtos: todos cadastrados com NCM + respostas completas → 100% | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | Q3 Produtos: 2 cadastrados mas só 1 com NCM + respostas 0/10 → 0,3·0,5 + 0 = 15% | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | Q2 IA Gen binário (limitação do schema atual) | PASS | 1ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | q2Respostas = 0 → completude 0 | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | q2Respostas >= 1 → completude 1 (binário) | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | q2 sempre aplicável (entra no denominador) | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | caso real UAT 2026-04-21 (1.pdf — Distribuidora Alimentos Teste) | PASS | 1ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | perfil 100%, só Q1 respondido (10/10), 0 produtos — tipo mista → 29% | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | mesmo cenário + tipo produto → 37% | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | perfil 60% + Q1 1/10 (mista) → 5% | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | aplicabilidade por tipo de empresa | PASS | 1ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | tipo produto — Q3 Serviços fora do denominador | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | default sem tipoEmpresa = 'mista' | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | breakdown — transparência ao cliente | PASS | 2ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | retorna 6 pilares na ordem canônica | PASS | 1ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | rótulos PT-BR em cada pilar | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | Q3 carrega detalhe estruturado (ratioCadastro + ratioRespostas) | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | edge cases | PASS | 1ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | valores negativos tratados como 0 | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | respostas > total → clampado em 100% | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | perfilCompletude > 1 clampado em 1 | PASS | 0ms | 2026-04-21T21:51:46.330Z |
| calculate-briefing-confidence.test.ts | determinístico — mesmo input → mesmo output | PASS | 1ms | 2026-04-21T21:51:46.330Z |
| ai-schemas.briefing.test.ts | server/ai-schemas.briefing.test.ts | PASS | 12ms | 2026-04-21T21:51:46.754Z |
| ai-schemas.briefing.test.ts | BriefingStructuredSchema — bundle D/A/B/C backward-compat | PASS | 11ms | 2026-04-21T21:51:46.754Z |
| ai-schemas.briefing.test.ts | aceita payload legado — sem top_3_acoes, sem source_type (briefings pré-#810/#811) | PASS | 4ms | 2026-04-21T21:51:46.754Z |
| ai-schemas.briefing.test.ts | aceita payload novo completo — com top_3_acoes e source_type | PASS | 2ms | 2026-04-21T21:51:46.754Z |
| ai-schemas.briefing.test.ts | aceita payload misto — alguns gaps com source, outros sem | PASS | 0ms | 2026-04-21T21:51:46.754Z |
| ai-schemas.briefing.test.ts | tolera source_type inválido via .catch (LLM com typo) | PASS | 1ms | 2026-04-21T21:51:46.754Z |
| ai-schemas.briefing.test.ts | tolera prazo inválido em top_3_acoes via .catch (default curto_prazo) | PASS | 0ms | 2026-04-21T21:51:46.754Z |
| ai-schemas.briefing.test.ts | top_3_acoes com mais de 3 itens → rejeita | PASS | 3ms | 2026-04-21T21:51:46.754Z |
| briefing-confidence-signals.test.ts | server/lib/briefing-confidence-signals.test.ts | PASS | 5ms | 2026-04-21T21:51:46.822Z |
| briefing-confidence-signals.test.ts | computePerfilCompleteness — replica calcProfileScore do frontend | PASS | 4ms | 2026-04-21T21:51:46.822Z |
| briefing-confidence-signals.test.ts | 7 obrigatórios + 12 opcionais | PASS | 1ms | 2026-04-21T21:51:46.822Z |
| briefing-confidence-signals.test.ts | perfil vazio → 0% | PASS | 1ms | 2026-04-21T21:51:46.822Z |
| briefing-confidence-signals.test.ts | só obrigatórios completos → 70% | PASS | 0ms | 2026-04-21T21:51:46.822Z |
| briefing-confidence-signals.test.ts | perfil 100% (todos obrigatórios + todos opcionais) → 100% | PASS | 0ms | 2026-04-21T21:51:46.822Z |
| briefing-confidence-signals.test.ts | multiState=false ainda conta como preenchido (boolean presente) | PASS | 0ms | 2026-04-21T21:51:46.822Z |
| briefing-confidence-signals.test.ts | arrays vazios (clientType/paymentMethods) NÃO contam | PASS | 0ms | 2026-04-21T21:51:46.822Z |
| briefing-confidence-signals.test.ts | cenário real do PDF Jose Combustível (perfil 100%) | PASS | 0ms | 2026-04-21T21:51:46.822Z |
| briefing-confidence-signals.test.ts | countQ3CnaeAnswers | PASS | 1ms | 2026-04-21T21:51:46.822Z |
| briefing-confidence-signals.test.ts | array vazio → 0 | PASS | 0ms | 2026-04-21T21:51:46.822Z |
| briefing-confidence-signals.test.ts | string JSON é parseada | PASS | 0ms | 2026-04-21T21:51:46.822Z |
| briefing-confidence-signals.test.ts | exclui CORPORATIVO e OPERACIONAL (legado) | PASS | 0ms | 2026-04-21T21:51:46.822Z |
| briefing-fingerprint.test.ts | server/lib/briefing-fingerprint.test.ts | PASS | 7ms | 2026-04-21T21:51:46.910Z |
| briefing-fingerprint.test.ts | canonicalize — JSON determinístico | PASS | 3ms | 2026-04-21T21:51:46.910Z |
| briefing-fingerprint.test.ts | chaves ordenadas alfabeticamente | PASS | 1ms | 2026-04-21T21:51:46.910Z |
| briefing-fingerprint.test.ts | aninhamento profundo preserva ordenação | PASS | 0ms | 2026-04-21T21:51:46.910Z |
| briefing-fingerprint.test.ts | arrays preservam ordem (não reordena) | PASS | 1ms | 2026-04-21T21:51:46.910Z |
| briefing-fingerprint.test.ts | null/undefined tratados | PASS | 0ms | 2026-04-21T21:51:46.910Z |
| briefing-fingerprint.test.ts | hashContent — SHA256 determinístico | PASS | 1ms | 2026-04-21T21:51:46.910Z |
| briefing-fingerprint.test.ts | mesmo conteúdo → mesmo hash | PASS | 1ms | 2026-04-21T21:51:46.910Z |
| briefing-fingerprint.test.ts | conteúdo diferente → hash diferente | PASS | 0ms | 2026-04-21T21:51:46.910Z |
| briefing-fingerprint.test.ts | produz SHA256 hex (64 chars) | PASS | 0ms | 2026-04-21T21:51:46.910Z |
| briefing-fingerprint.test.ts | diffFingerprints — detecção de mudança | PASS | 2ms | 2026-04-21T21:51:46.910Z |
| briefing-fingerprint.test.ts | sem snapshot prévio → nenhum diff é 'changed' | PASS | 0ms | 2026-04-21T21:51:46.910Z |
| briefing-fingerprint.test.ts | tudo igual → zero diffs | PASS | 0ms | 2026-04-21T21:51:46.910Z |
| briefing-fingerprint.test.ts | hash mudou → changed=true, reason='hash' | PASS | 0ms | 2026-04-21T21:51:46.910Z |
| briefing-fingerprint.test.ts | só ts mudou (hash igual) → changed=false, reason='ts_only' (save sem alteração) | PASS | 0ms | 2026-04-21T21:51:46.910Z |
| briefing-fingerprint.test.ts | múltiplas fontes mudam simultaneamente | PASS | 0ms | 2026-04-21T21:51:46.910Z |
| briefing-fingerprint.test.ts | retorna todos 6 pilares sempre (mesmo os inalterados) | PASS | 0ms | 2026-04-21T21:51:46.910Z |
| briefing-markdown-v2.test.ts | server/briefing-markdown-v2.test.ts | PASS | 10ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | buildBriefingMarkdown V2 — bundle #808-#811 | PASS | 9ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | #809 — linguagem condicional + banner de confiança | PASS | 4ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | renderiza banner topo quando conf<85% | PASS | 2ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | NÃO renderiza banner quando conf>=85% | PASS | 0ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | usa 'Nível de Exposição' (não 'Risco Geral') | PASS | 0ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | adiciona aviso de validação per-gap quando conf<85% | PASS | 0ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | NÃO adiciona aviso per-gap quando conf>=85% | PASS | 0ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | #810 — Top 3 + Qualidade + Badge (fix UAT 2026-04-21 multi-sinal) | PASS | 3ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | conf<40 E qualidade baixa → MAPA | PASS | 0ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | conf 40..84 → DIAGNOSTICO PARCIAL | PASS | 0ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | conf=85 MAS sem produtos → PARCIAL (cenário UAT real) | PASS | 0ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | AND completo (conf>=85 + qualidade>=80 + cadastro + questionários 4/5+) → COMPLETO | PASS | 0ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | NÃO exibe mais 'Qualidade das Informações' no header (fix UAT 2026-04-21) | PASS | 0ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | renderiza Top 3 Ações quando gaps>=3 E top_3_acoes preenchido | PASS | 1ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | NÃO renderiza Top 3 quando gaps<3 | PASS | 0ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | NÃO renderiza Top 3 quando top_3_acoes vazio (mesmo com gaps>=3) | PASS | 0ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | #811 — source_type + source_reference por gap | PASS | 1ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | renderiza linha Fonte quando source_type presente | PASS | 0ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | omite linha Fonte quando source_type ausente (graceful — briefings legados) | PASS | 0ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | renderiza Fonte sem suffix quando source_reference ausente | PASS | 0ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | todos os source_type conhecidos renderizam com label canônico | PASS | 0ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | rollback — feature flag template v1 | PASS | 1ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | BRIEFING_TEMPLATE_VERSION=v1 → ignora toda infra do bundle | PASS | 0ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | determinismo | PASS | 0ms | 2026-04-21T21:51:47.179Z |
| briefing-markdown-v2.test.ts | mesma entrada → mesma saída | PASS | 0ms | 2026-04-21T21:51:47.179Z |

## Summary

- **Pass:** 110
- **Fail:** 0
- **Skipped:** 0
- **Total:** 110
- **Started:** 2026-04-21T21:51:45.964Z
- **Finished:** 2026-04-21T21:51:47.193Z
