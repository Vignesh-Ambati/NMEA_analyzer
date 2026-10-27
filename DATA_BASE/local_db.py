import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "OUTPUT/DATABASE"

def _connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection

def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS developer_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                payload TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS engine_params (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                payload TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )

def db_snapshot() -> Dict[str, Any]:
    init_db()
    with _connect() as _connection:
        developer = _connection.execute("SELECT payload FROM developer_settings WHERE id = 1").fetchone()
        engine = _connection.execute("SELECT payload FROM engine_params WHERE id = 1").fetchone()

    return {
        "developer_settings": json.loads(developer["payload"]) if developer else None,
        "engine_params": json.loads(engine["payload"]) if engine else None,
        "db_path": str(DB_PATH),
    }

def get_developer_settings() -> Dict[str, Any]:
    init_db()
    with _connect() as _connection:
        row = _connection.execute("SELECT payload FROM developer_settings WHERE id = 1").fetchone()
    if row is None:
        return {
            "batchSize": 50000,
            "retentionWindow": 259200,
            "workerCount": 4,
            "debugMode": False,
            "backendConfig": {
                "protocol": "http",
                "host": "127.0.0.1",
                "port": "8000",
                "apiPrefix": "/api",
                "wsProtocol": "ws",
                "timeoutMs": 15000,
            },
        }
    return json.loads(row["payload"])

def save_developer_settings(payload: Dict[str, Any]) -> Dict[str, Any]:
    init_db()
    now = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO developer_settings (id, payload, updated_at)
            VALUES (1, ?, ?)
            ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
            """,
            (json.dumps(payload, ensure_ascii=False), now),
        )
    return payload


def get_engine_params() -> Dict[str, Any]:
    init_db()
    with _connect() as conn:
        row = conn.execute(
            "SELECT payload FROM engine_params WHERE id = 1"
        ).fetchone()
    if row is None:
        return {
            "batchSize": 50000,
            "retentionWindow": 259200,
            "workerCount": 4,
            "debugMode": False,
        }
    return json.loads(row["payload"])


def save_engine_params(payload: Dict[str, Any]) -> Dict[str, Any]:
    init_db()
    now = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO engine_params (id, payload, updated_at)
            VALUES (1, ?, ?)
            ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
            """,
            (json.dumps(payload, ensure_ascii=False), now),
        )
    return payload

def fetch_logs(limit: int = 200, level: Optional[str] = None, stage: Optional[str] = None, source: Optional[str] = None) -> List[Dict[str, Any]]:
    init_db()
    query = "SELECT * FROM app_logs"
    clauses: List[str] = []
    params: List[Any] = []

    if level:
        clauses.append("level = ?")
        params.append(level)
    if stage:
        clauses.append("stage = ?")
        params.append(stage)
    if source:
        clauses.append("source = ?")
        params.append(source)

    if clauses:
        query += " WHERE " + " AND ".join(clauses)

    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)

    with _connect() as conn:
        rows = conn.execute(query, params).fetchall()

    result: List[Dict[str, Any]] = []
    for row in rows:
        result.append(
            {
                "id": row["id"],
                "source": row["source"],
                "stage": row["stage"],
                "level": row["level"],
                "message": row["message"],
                "details": json.loads(row["details"]) if row["details"] else None,
                "duration_ms": row["duration_ms"],
                "timestamp": row["created_at"],
            }
        )
    return result
