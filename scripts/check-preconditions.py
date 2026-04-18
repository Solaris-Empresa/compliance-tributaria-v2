#!/usr/bin/env python3
"""
check-preconditions.py — Sprint Z-21 PR #722
Verifica pré-condições obrigatórias: dados do projeto 1200001.
"""
import os, sys, mysql.connector
from urllib.parse import urlparse

DATABASE_URL = os.environ.get("DATABASE_URL", "")
PROJECT_ID = int(os.environ.get("E2E_DESTRUCTIVE_PROJECT_ID", "1200001"))

def get_conn():
    parsed = urlparse(DATABASE_URL)
    cfg = {
        "host": parsed.hostname,
        "port": parsed.port or 4000,
        "user": parsed.username,
        "password": parsed.password,
        "database": parsed.path.lstrip("/").split("?")[0],
        "ssl_ca": "/etc/ssl/certs/ca-certificates.crt",
        "ssl_verify_cert": True,
        "ssl_verify_identity": True,
    }
    return mysql.connector.connect(**cfg)

def main():
    conn = get_conn()
    cur = conn.cursor(dictionary=True)

    # Riscos ativos
    cur.execute("SELECT COUNT(*) as cnt FROM risks_v4 WHERE project_id=%s AND status='active'", (PROJECT_ID,))
    risks = cur.fetchone()["cnt"]

    # Planos não deletados
    cur.execute("SELECT COUNT(*) as cnt FROM action_plans WHERE project_id=%s AND status!='deleted'", (PROJECT_ID,))
    plans = cur.fetchone()["cnt"]

    # Tasks via FK
    cur.execute("""
        SELECT COUNT(*) as cnt FROM tasks t
        JOIN action_plans ap ON t.action_plan_id = ap.id
        WHERE ap.project_id = %s
    """, (PROJECT_ID,))
    tasks = cur.fetchone()["cnt"]

    print(f"risks_v4 (active):          {risks}")
    print(f"action_plans (not deleted): {plans}")
    print(f"tasks (via FK):             {tasks}")

    ok = risks >= 3 and plans >= 3 and tasks >= 5
    if ok:
        print(f"\nPRE_CONDITIONS: PASS (risks={risks}>=3, plans={plans}>=3, tasks={tasks}>=5)")
    else:
        print(f"\nPRE_CONDITIONS: FAIL — 1200001 precisa AÇÃO 2 da Z-20")
        if risks < 3: print(f"  MISSING: risks={risks} < 3")
        if plans < 3: print(f"  MISSING: plans={plans} < 3")
        if tasks < 5: print(f"  MISSING: tasks={tasks} < 5")

    cur.close()
    conn.close()
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
