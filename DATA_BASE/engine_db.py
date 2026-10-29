# CORE/DATA_BASE/engine_db.py
from abc import ABC, abstractmethod
import datetime
from pathlib import Path
import sqlite3
from typing import Any, Dict, Final, Optional

_DB_DIR: Final[Path] = Path("OUTPUT")
_DB_PATH: Final[Path] = _DB_DIR / "DATABASE/engine_params.db"

_DEFAULT_BATCH_SIZE: Final[int] = 500
_DEFAULT_RETENTION_WINDOW: Final[int] = 3600
_DEFAULT_WORKER_COUNT: Final[int] = 4

def _get_utc_now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


class BaseEngineParamsRepository(ABC):
    """Abstract interface for engine tuning parameters storage."""

    @abstractmethod
    def initialize_schema(self) -> None:
        """Create tables and populate default baseline settings if empty."""
        pass

    @abstractmethod
    def get_parameters(self) -> Dict[str, Any]:
        """Fetch the current engine tuning parameters."""
        pass

    @abstractmethod
    def update_parameters(
        self,
        batch_size: int,
        retention_window: int,
        worker_count: int,
    ) -> Dict[str, Any]:
        """Persist updated engine tuning parameters."""
        pass


class SqliteEngineParamsRepository(BaseEngineParamsRepository):
    """SQLite repository for offline engine parameter persistence."""

    def __init__(self, db_path: Path = _DB_PATH) -> None:
        self._db_path = db_path
        self._db_dir = self._db_path.parent
        self._initialize_vault()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self._db_path), timeout=5.0)
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _initialize_vault(self) -> None:
        self._db_dir.mkdir(parents=True, exist_ok=True)
        self.initialize_schema()

    def initialize_schema(self) -> None:
        with self._get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS engine_tuning_params (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    batch_size INTEGER NOT NULL,
                    retention_window INTEGER NOT NULL,
                    worker_count INTEGER NOT NULL,
                    updated_at TEXT NOT NULL
                );
                """
            )
            cursor = conn.execute("SELECT id FROM engine_tuning_params WHERE id = 1;")
            if cursor.fetchone() is None:
                conn.execute(
                    """
                    INSERT INTO engine_tuning_params (id, batch_size, retention_window, worker_count, updated_at)
                    VALUES (1, ?, ?, ?, ?);
                    """,
                    (
                        _DEFAULT_BATCH_SIZE,
                        _DEFAULT_RETENTION_WINDOW,
                        _DEFAULT_WORKER_COUNT,
                        _get_utc_now_iso(),
                    ),
                )
            conn.commit()

    def get_parameters(self) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT batch_size, retention_window, worker_count, updated_at
                FROM engine_tuning_params
                WHERE id = 1;
                """
            )
            row = cursor.fetchone()

        if not row:
            return {
                "batchSize": _DEFAULT_BATCH_SIZE,
                "retentionWindow": _DEFAULT_RETENTION_WINDOW,
                "workerCount": _DEFAULT_WORKER_COUNT,
                "updatedAt": _get_utc_now_iso(),
            }

        return {
            "batchSize": int(row[0]),
            "retentionWindow": int(row[1]),
            "workerCount": int(row[2]),
            "updatedAt": str(row[3]),
        }

    def update_parameters(
        self,
        batch_size: int,
        retention_window: int,
        worker_count: int,
    ) -> Dict[str, Any]:
        now_iso = _get_utc_now_iso()
        with self._get_connection() as conn:
            conn.execute(
                """
                UPDATE engine_tuning_params
                SET batch_size = ?,
                    retention_window = ?,
                    worker_count = ?,
                    updated_at = ?
                WHERE id = 1;
                """,
                (batch_size, retention_window, worker_count, now_iso),
            )
            conn.commit()

        return {
            "batchSize": batch_size,
            "retentionWindow": retention_window,
            "workerCount": worker_count,
            "updatedAt": now_iso,
        }


engine_params_repo: BaseEngineParamsRepository = SqliteEngineParamsRepository()