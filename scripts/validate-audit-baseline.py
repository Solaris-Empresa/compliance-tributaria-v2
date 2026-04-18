#!/usr/bin/env python3
"""
validate-audit-baseline.py — Sprint Z-21 PR #722
Valida audit_log usando baseline timestamp para filtrar apenas entradas
geradas durante a execução do Playwright.
"""
import os, sys, mysql.connector
from urllib.parse import urlparse

DATABASE_URL = os.environ.get("DATABASE_URL", "")
PROJECT_ID = int(os.environ.get("E2E_DESTRUCTIVE_PROJECT_ID", "1200001"))
BASELINE = int(os.environ.get("BASELINE_UNIX", "0"))

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
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL não configurada")
        sys.exit(1)

    conn = get_conn()
    cur = conn.cursor(dictionary=True)

    # Query A: GROUP BY entity, action (todas as entradas desde baseline)
    print(f"\n=== (h) audit_log GROUP BY entity, action (project={PROJECT_ID}, baseline={BASELINE}) ===")
    if BASELINE > 0:
        cur.execute("""
            SELECT entity, action, COUNT(*) as cnt
            FROM audit_log
            WHERE project_id = %s
              AND created_at >= FROM_UNIXTIME(%s)
            GROUP BY entity, action
            ORDER BY cnt DESC
        """, (PROJECT_ID, BASELINE))
    else:
        # Sem baseline: últimas 20 entradas
        cur.execute("""
            SELECT entity, action, COUNT(*) as cnt
            FROM audit_log
            WHERE project_id = %s
            GROUP BY entity, action
            ORDER BY cnt DESC
            LIMIT 20
        """, (PROJECT_ID,))
    rows_a = cur.fetchall()
    if rows_a:
        print(f"{'entity':<20} {'action':<30} {'cnt':>5}")
        print("-" * 58)
        for r in rows_a:
            print(f"{str(r['entity']):<20} {str(r['action']):<30} {r['cnt']:>5}")
    else:
        print("(sem entradas)")

    # Query B: cascade_source não nulo
    print(f"\n=== (i) cascade_source output (project={PROJECT_ID}, baseline={BASELINE}) ===")
    if BASELINE > 0:
        cur.execute("""
            SELECT entity, action,
                   JSON_EXTRACT(after_state, '$.cascade_source') as src,
                   COUNT(*) as cnt
            FROM audit_log
            WHERE project_id = %s
              AND JSON_EXTRACT(after_state, '$.cascade_source') IS NOT NULL
              AND created_at >= FROM_UNIXTIME(%s)
            GROUP BY entity, action, src
        """, (PROJECT_ID, BASELINE))
    else:
        cur.execute("""
            SELECT entity, action,
                   JSON_EXTRACT(after_state, '$.cascade_source') as src,
                   COUNT(*) as cnt
            FROM audit_log
            WHERE project_id = %s
              AND JSON_EXTRACT(after_state, '$.cascade_source') IS NOT NULL
            GROUP BY entity, action, src
            LIMIT 20
        """, (PROJECT_ID,))
    rows_b = cur.fetchall()
    if rows_b:
        print(f"{'entity':<20} {'action':<30} {'src':<20} {'cnt':>5}")
        print("-" * 78)
        for r in rows_b:
            print(f"{str(r['entity']):<20} {str(r['action']):<30} {str(r['src']):<20} {r['cnt']:>5}")
    else:
        print("(sem entradas com cascade_source)")

    # Detalhe: últimas 20 entradas brutas
    print(f"\n=== Detalhe: últimas 20 entradas audit_log (project={PROJECT_ID}) ===")
    cur.execute("""
        SELECT entity, action, entity_id,
               JSON_EXTRACT(after_state, '$.cascade_source') as cascade_source,
               JSON_EXTRACT(after_state, '$.cascade_via_plan') as cascade_via_plan,
               created_at
        FROM audit_log
        WHERE project_id = %s
        ORDER BY created_at DESC
        LIMIT 20
    """, (PROJECT_ID,))
    rows_c = cur.fetchall()
    for r in rows_c:
        print(f"  {str(r['entity']):<15} | {str(r['action']):<25} | id={r['entity_id']} | src={r['cascade_source']} | via={r['cascade_via_plan']} | at={r['created_at']}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
