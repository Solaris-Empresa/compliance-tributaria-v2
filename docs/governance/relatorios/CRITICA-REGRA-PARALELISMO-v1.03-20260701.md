# Crítica — REGRA-PARALELISMO-CC1-CC2 v1.03 (rodada 3)

**Autor:** Claude Code · **Data:** 01/07/2026 · **Método:** REGRA-ORQ-22 (3 níveis) · evidência `arquivo:linha`/PR
**Objeto:** `REGRA-PARALELISMO-CC1-CC2_v1.03.md` (proposta do Orquestrador)

## Veredito

Documento maduro e honesto — a Seção 4 (2 mecanismos ainda pseudocódigo, com backstop do Manus) aplica corretamente a Lição #128; R2/R6/N3-C fechados com evidência. **Resta 1 conflação estrutural (N1-A)** que sobreviveu a todas as rodadas: **migration ≠ arquivo hub.**

---

## Nível 1 — Bloqueante técnico

### N1-A — R4 trata migrations como "hub sprint-close do Orquestrador", contra a evidência da própria sessão

R4 coloca `drizzle/*.sql` (132), `drizzle/downs/*.sql`, `drizzle/migrations/manual/*.sql`, `scripts/**/*.sql` no bucket **hub** — cuja semântica (herdada da v1.02, inalterada) é *"serial-only… alterações só no fechamento de sprint, sob responsabilidade do Orquestrador"*.

**Contradiz o fluxo real, comprovado nesta sessão:**

| Migration | PR | Autor | Contexto |
|---|---|---|---|
| `0130_categoria_map_setorial.sql` | #1677 (feat) | CC | rotina (B1 Fase 1) |
| `0131_categoria_map_titulo.sql` | #1679 (feat) | CC | rotina (B1 Fase 2) |
| `0128`, `0129` | feat/fix (#1655…) | CC | rotina (arco #1607) |

→ Migrations são artefato de **feature PR de rotina** (CC cria, Manus mergeia) — **nunca** "no fechamento de sprint pelo Orquestrador" (que tem **0 commits**, confirmado na rodada 2). Colocá-las no bucket hub-sprint-close **bloquearia todo trabalho de schema** — o mesmo erro que a v1.02 corrigiu para `docs/governance/**` (R4-a), mas **não** para migrations.

**A conflação (dois regimes num bucket só):**

| Regime | Exemplos | Tratamento correto |
|---|---|---|
| **Hub verdadeiro** (raramente muda) | `package.json`, `CODEOWNERS`, `ESTADO-ATUAL.md` | serial-only + sprint-close |
| **Migration** (rotina, número-sensível) | `drizzle/0NNN_*.sql` (132) | **R10 (gate de número) + R5 (Manus executa DB)** — NÃO sprint-close |

**Fix:** tirar migrations do bucket hub-sprint-close. Já cobertas por R10 (colisão de número) + R5 (DB exclusivo do Manus). `drizzle/downs/*.sql` são artefato do mesmo feature PR (a reversão) — idem, não hub.

### N1-B — R2 resolveu o ARMAZENAMENTO do estado, não o ACESSO do leitor

R2 move o estado para Project board (`PVT_kwHOCZgs1M4BSQH1`) + `assignees` — confirmados existentes. **Mas** toda a investigação com `gh` foi feita pelo **CC**, não pelo Orquestrador (agente de chat). O documento assume que o Orquestrador consulta o board via `gh` — **não confirmado**. Falta cravar: **o Orquestrador tem `gh`/read-access, ou quem lê o board é o CI/CC?** Sem isso, R2 troca "estado na memória" por "estado que o leitor não consegue ler".

---

## Nível 2 — Design improvements

- **N2-A — R10 para número de LIÇÃO é redundante com R4-b.** Lições vivem num **único arquivo** (`governance-lessons.md`) → 2 PRs colidem no arquivo → R4-b/R2/R3 já serializam. O gate de número (R10) é necessário só para **migrations** (arquivos diferentes, mesmo número), não para lições. → R10 aplica a migrations; lições sob R4-b.
- **N2-B — a race do R10 é a mesma do R7**, mitigada pelo `concurrency:` (mesmo workflow), mas **qual PR é bloqueado é não-determinístico**. Manter explícito o backstop do Manus (merge-time) como gate autoritativo para número **também**.

---

## Nível 3 — Observações

- **N3-A (ROI, aberto):** a sessão foi toda **sequencial-dependente** (B1 Fase 1→2→3→4; hotfix gate da Fase 4). Footprint disjunto real foi raro. O aparato tem custo fixo alto — vale o P.O. estimar a frequência de ativação antes de investir na Seção 4.
- **N3-B (positivo):** honestidade "não-operacional até Seção 4 sair de pseudocódigo" + R4-⚠ (não decidir sozinho z06/m3.7) = padrão-ouro. Manter.
- **N3-C:** z06/m3.7 já rodaram (one-time). A decisão do P.O. só importa para **futuros** scripts — talvez uma regra genérica ("`.sql` que escreve dados fora de `drizzle/0NNN` requer aprovação do Manus") em vez de listar arquivos.

---

## Recomendação

**Aprovar com 1 ressalva bloqueante (N1-A):** tirar migrations do bucket hub-sprint-close (são rotina, cobertas por R10+R5). Confirmar N1-B (acesso do Orquestrador ao board).

**Padrão que se repete:** cada rodada a regra protegeu demais o que é **rotina** tratando-o como **hub** — v1.01/02 com `docs/governance/` (corrigido em R4-a); v1.03 ainda com **migrations**. Falta cravar: *"serial-only por colisão de número" (migration → R10) ≠ "hub raramente-mudado, sprint-close" (package.json)* — são dois regimes, o documento tem um bucket só.

## Vinculadas

REGRA-ORQ-22 (crítica 3 níveis) · Lição #128 (gate enforçado) · Lição #92/REGRA-ORQ-FILENAME-01 · REGRA-ORQ-45 (Gate 0 emissor) · REGRA-ORQ-46 (lição=PR) · REGRA-ORQ-33 v59 (RACI) · migrations #1677/#1679 (evidência N1-A) · investigação rodadas 1/2 (evidência de path/estado/gates)
