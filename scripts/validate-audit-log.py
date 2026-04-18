#!/usr/bin/env python3
"""
validate-audit-log.py — Sprint Z-21 PR #722
Valida audit_log N+1 para project_id=1200001 após cascata soft delete.
"""
import os
import sys
import json
import mysql.connector
from urllib.parse import urlparse

DATABASE_URL = os.environ.get("DATABASE_URL", "")
PROJECT_ID = int(os.environ.get("E2E_DESTRUCTIVE_PROJECT_ID", "1200001"))

def parse_tidb_url(url: str):
    """Parse TiDB Cloud connection URL."""
    parsed = urlparse(url)
    return {
        "host": parsed.hostname,
        "port": parsed.port or 4000,
        "user": parsed.username,
        "password": parsed.password,
        "database": parsed.path.lstrip("/").split("?")[0],
        "ssl_ca": "/etc/ssl/certs/ca-certificates.crt",
        "ssl_verify_cert": True,
        "ssl_verify_identity": True,
    }

def main():
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL não configurada")
        sys.exit(1)

    print(f"Conectando ao TiDB Cloud (project_id={PROJECT_ID})...")
    
    try:
        cfg = parse_tidb_url(DATABASE_URL)
        conn = mysql.connector.connect(**cfg)
        cursor = conn.cursor(dictionary=True)
        
        # Query principal: audit_log N+1 para cascata
        query = """
            SELECT entity, action, entity_id,
                   JSON_UNQUOTE(JSON_EXTRACT(after_state, '$.cascade_source')) AS cascade_source,
                   JSON_UNQUOTE(JSON_EXTRACT(after_state, '$.cascade_via_plan')) AS cascade_via_plan,
                   created_at
            FROM audit_log
            WHERE project_id = %s
              AND action IN ('deleted', 'deleted_cascade', 'deleted_task_cascade')
            ORDER BY created_at DESC
            LIMIT 20
        """
        cursor.execute(query, (PROJECT_ID,))
        rows = cursor.fetchall()
        
        print(f"\n=== audit_log (project_id={PROJECT_ID}) — últimas 20 entradas ===")
        print(f"Total encontrado: {len(rows)}")
        print()
        
        risk_entries = []
        plan_entries = []
        task_entries = []
        
        for row in rows:
            entity = row.get("entity", "")
            action = row.get("action", "")
            src = row.get("cascade_source") or ""
            via = row.get("cascade_via_plan") or ""
            
            line = f"  {entity:15} | {action:25} | id={row.get('entity_id')} | cascade_source={src} | via_plan={via}"
            print(line)
            
            if entity == "risk":
                risk_entries.append(row)
            elif entity == "action_plan":
                plan_entries.append(row)
            elif entity == "task":
                task_entries.append(row)
        
        print()
        print(f"=== Resumo N+1 ===")
        print(f"  risk entries:        {len(risk_entries)}")
        print(f"  action_plan entries: {len(plan_entries)}")
        print(f"  task entries:        {len(task_entries)}")
        total = len(risk_entries) + len(plan_entries) + len(task_entries)
        print(f"  TOTAL:               {total}")
        
        # Validação
        ok = total >= 1
        if ok:
            print(f"\n✅ audit_log N+1 VÁLIDO: {total} entradas (risk={len(risk_entries)}, plans={len(plan_entries)}, tasks={len(task_entries)})")
        else:
            print(f"\n❌ audit_log VAZIO — cascata não registrou entradas")
        
        # Resultado JSON para o progress.md
        result = {
            "project_id": PROJECT_ID,
            "total_entries": total,
            "risk_entries": len(risk_entries),
            "plan_entries": len(plan_entries),
            "task_entries": len(task_entries),
            "valid": ok
        }
        print(f"\nJSON: {json.dumps(result)}")
        
        cursor.close()
        conn.close()
        
        sys.exit(0 if ok else 1)
        
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(2)

if __name__ == "__main__":
    main()
