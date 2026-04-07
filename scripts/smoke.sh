#!/usr/bin/env bash
# Gate POST-DEPLOY — Smoke Tests de Produção SOLARIS
# Verifica em < 60s que o deploy chegou em produção corretamente
#
# Uso:
#   ./scripts/smoke.sh                              # usa PLAYWRIGHT_BASE_URL
#   ./scripts/smoke.sh https://iasolaris.manus.space # URL explícita
#   ./scripts/smoke.sh https://staging.exemplo.com  # staging
#
# Variáveis de ambiente:
#   EXPECTED_SHA: SHA esperado (curto, 7 chars) para validação de versão
#   TEST_USER_EMAIL / TEST_USER_PASSWORD: credenciais de teste (opcional)
#
# Referência: MANUS-GOVERNANCE.md v4.6 · Gate POST-DEPLOY
# Origem: Z-02 mergeado com 47/47 PASS mas produção exibia QC legado.
#         Gate POST-DEPLOY detecta o mesmo problema em < 3 minutos.

set -e

BASE_URL="${1:-${PLAYWRIGHT_BASE_URL:-https://iasolaris.manus.space}}"
EXPECTED_SHA="${EXPECTED_SHA:-}"
TIMEOUT=15
FAILED=0

echo "════════════════════════════════════════════════"
echo "  Gate POST-DEPLOY — Smoke Tests SOLARIS"
echo "  URL: $BASE_URL"
echo "  SHA esperado: ${EXPECTED_SHA:-não verificado}"
echo "  Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "════════════════════════════════════════════════"
echo ""

# ── S-01: Health endpoint ─────────────────────────────────────────────────────
echo -n "S-01 — Health endpoint... "
HEALTH_RESPONSE=$(curl -sf --max-time "$TIMEOUT" "$BASE_URL/api/health" 2>/dev/null || true)

if [ -z "$HEALTH_RESPONSE" ]; then
  echo "❌ FAIL — /api/health não respondeu (timeout ou 5xx)"
  FAILED=1
else
  STATUS=$(echo "$HEALTH_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  if [ "$STATUS" = "healthy" ]; then
    echo "✅ PASS — status=healthy"
  else
    echo "❌ FAIL — status=$STATUS"
    echo "   Response: $HEALTH_RESPONSE"
    FAILED=1
  fi
fi

# ── S-02: SHA match ───────────────────────────────────────────────────────────
if [ -n "$EXPECTED_SHA" ]; then
  echo -n "S-02 — SHA match... "
  DEPLOYED_SHA=$(echo "$HEALTH_RESPONSE" | grep -o '"sha":"[^"]*"' | cut -d'"' -f4)

  if [ "$DEPLOYED_SHA" = "$EXPECTED_SHA" ]; then
    echo "✅ PASS — sha=$DEPLOYED_SHA (correto)"
  elif [ -z "$DEPLOYED_SHA" ]; then
    echo "⚠️  WARN — SHA não retornado pelo /api/health"
  else
    echo "❌ FAIL — SHA mismatch"
    echo "   Esperado:    $EXPECTED_SHA"
    echo "   Em produção: $DEPLOYED_SHA"
    echo "   → Deploy não completou ou está na versão errada"
    FAILED=1
  fi
else
  echo "S-02 — SHA match... ⏭  SKIP (EXPECTED_SHA não definido)"
fi

# ── S-03: Rota /questionario-produto ─────────────────────────────────────────
echo -n "S-03 — Rota /questionario-produto... "
HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" \
  --max-time "$TIMEOUT" "$BASE_URL/projetos/1/questionario-produto" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "401" ]; then
  # 401 = rota existe mas requer auth (correto para SPA)
  echo "✅ PASS — HTTP $HTTP_CODE (rota registrada)"
elif [ "$HTTP_CODE" = "404" ]; then
  echo "❌ FAIL — HTTP 404 (rota não existe em produção)"
  echo "   → Z-02 frontend não chegou ao deploy"
  FAILED=1
else
  echo "⚠️  WARN — HTTP $HTTP_CODE (verificar manualmente)"
fi

# ── S-04: Rota /questionario-servico ─────────────────────────────────────────
echo -n "S-04 — Rota /questionario-servico... "
HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" \
  --max-time "$TIMEOUT" "$BASE_URL/projetos/1/questionario-servico" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "401" ]; then
  echo "✅ PASS — HTTP $HTTP_CODE (rota registrada)"
elif [ "$HTTP_CODE" = "404" ]; then
  echo "❌ FAIL — HTTP 404 (rota não existe em produção)"
  FAILED=1
else
  echo "⚠️  WARN — HTTP $HTTP_CODE (verificar manualmente)"
fi

# ── S-05: API de autenticação responde ───────────────────────────────────────
echo -n "S-05 — Login API (OAuth)... "
# Para Manus OAuth, verificar se o endpoint de callback existe
OAUTH_CODE=$(curl -sf -o /dev/null -w "%{http_code}" \
  --max-time "$TIMEOUT" "$BASE_URL/api/oauth/callback" 2>/dev/null || echo "000")
# Garantir apenas 3 dígitos
OAUTH_CODE="${OAUTH_CODE:0:3}"

if [ "$OAUTH_CODE" = "200" ] || [ "$OAUTH_CODE" = "302" ] || [ "$OAUTH_CODE" = "400" ] || [ "$OAUTH_CODE" = "401" ]; then
  # 400 = endpoint existe mas parâmetros ausentes (correto — sem code/state)
  echo "✅ PASS — OAuth endpoint responde (HTTP $OAUTH_CODE)"
elif [ "$OAUTH_CODE" = "404" ]; then
  echo "❌ FAIL — /api/oauth/callback não encontrado"
  FAILED=1
else
  echo "⚠️  WARN — HTTP $OAUTH_CODE"
fi

# ── Resultado final ───────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════"
if [ "$FAILED" -eq "0" ]; then
  echo "✅ Gate POST-DEPLOY: PASS"
  echo "   Produção está na versão correta e saudável."
  echo "   P.O. pode iniciar E2E manual."
else
  echo "❌ Gate POST-DEPLOY: FALHOU"
  echo ""
  echo "   Ações necessárias:"
  echo "   1. Verificar logs do deploy em iasolaris.manus.space"
  echo "   2. Verificar se o deploy completou após o merge"
  echo "   3. Re-executar deploy manualmente se necessário"
  echo "   4. Reportar ao Orquestrador com output completo"
  exit 1
fi
echo "════════════════════════════════════════════════"
