#!/bin/bash
set -e

SPEC_FILE="governance/APPROVED_SPEC.json"

# Gate 1 — arquivo existe
if [ ! -f "$SPEC_FILE" ]; then
  echo "::error::GOVERNANCE FAIL: Missing $SPEC_FILE"
  exit 1
fi

# Gates 2+3 via node (sem dependencia de jq)
node -e "
  const fs = require('fs');
  const crypto = require('crypto');
  const spec = JSON.parse(fs.readFileSync('$SPEC_FILE', 'utf8'));

  // Gate 2 — status = APPROVED
  if (spec.status !== 'APPROVED') {
    console.error('::error::GOVERNANCE FAIL: status=' + spec.status + ' (expected APPROVED)');
    process.exit(1);
  }

  // Gate 3 — hash confere
  const content = fs.readFileSync(spec.spec_path, 'utf8');
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  if (hash !== spec.hash) {
    console.error('::error::GOVERNANCE FAIL: Spec altered after approval');
    console.error('   Expected: ' + spec.hash);
    console.error('   Current:  ' + hash);
    process.exit(1);
  }

  console.log('GOVERNANCE PASS: ' + spec.id + ' valido (hash ok)');
"
