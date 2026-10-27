# CORE/DATA_BASE/auth_db.py
from abc import ABC, abstractmethod
import hashlib
import hmac
import os
from pathlib import Path
import sqlite3
from typing import Final, Optional

_DB_DIR: Final[Path] = Path("OUTPUT/DATABASE")
_DB_PATH: Final[Path] = _DB_DIR / "dev_auth.db"

_DEFAULT_DEV_USER: Final[str] = "developer"
_DEFAULT_DEV_PASS: Final[str] = "Accord@ready2go"


class BaseAuthRepository(ABC):
    """Abstract interface defining developer authentication storage contracts."""

    @abstractmethod
    def initialize_schema(self) -> None:
        """Create necessary database tables and seed baseline credentials."""
        pass

    @abstractmethod
    def verify_developer_passkey(self, raw_password: str) -> bool:
        """Verify the raw developer passphrase against the stored credential."""
        pass

    @abstractmethod
    def update_developer_passkey(self, new_password: str) -> bool:
        """Update and rehash the stored developer passphrase."""
        pass


class SqliteDevAuthRepository(BaseAuthRepository):
    """SQLite-backed local authentication store with salted scrypt hashing."""

    def __init__(self, db_path: Path = _DB_PATH) -> None:
        self._db_path = db_path
        self._db_dir = self._db_path.parent
        self._initialize_vault()

    def _get_connection(self) -> sqlite3.Connection:
        """Acquire a connection configured with write-ahead logging."""
        conn = sqlite3.connect(str(self._db_path), timeout=5.0)
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    @staticmethod
    def _hash_passphrase(password: str, salt: Optional[bytes] = None) -> tuple[bytes, bytes]:
        """Generate a cryptographically secure salted hash via scrypt."""
        salt_bytes = salt if salt is not None else os.urandom(16)
        derived_key = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt_bytes,
            n=16384,
            r=8,
            p=1,
            maxmem=33554432,
            dklen=32,
        )
        return derived_key, salt_bytes

    def _initialize_vault(self) -> None:
        """Ensure directories exist and initialize database schema upon construction."""
        self._db_dir.mkdir(parents=True, exist_ok=True)
        self.initialize_schema()

    def initialize_schema(self) -> None:
        """Automatically create authentication tables and seed default offline credentials."""
        with self._get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS dev_credentials (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    username TEXT NOT NULL UNIQUE,
                    password_hash BLOB NOT NULL,
                    password_salt BLOB NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            # Check if developer credential already seeded
            cursor = conn.execute("SELECT id FROM dev_credentials WHERE id = 1;")
            if cursor.fetchone() is None:
                pwd_hash, salt = self._hash_passphrase(_DEFAULT_DEV_PASS)
                conn.execute(
                    """
                    INSERT INTO dev_credentials (id, username, password_hash, password_salt)
                    VALUES (1, ?, ?, ?);
                    """,
                    (_DEFAULT_DEV_USER, pwd_hash, salt),
                )
            conn.commit()

    def verify_developer_passkey(self, raw_password: str) -> bool:
        """Constant-time verification against the database salt and hash."""
        if not raw_password:
            return False

        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT password_hash, password_salt FROM dev_credentials WHERE id = 1;"
            )
            row = cursor.fetchone()

        if not row:
            return False

        stored_hash: bytes = row[0]
        stored_salt: bytes = row[1]

        computed_hash, _ = self._hash_passphrase(raw_password, salt=stored_salt)
        return hmac.compare_digest(stored_hash, computed_hash)

    def update_developer_passkey(self, new_password: str) -> bool:
        """Update and commit a new password hash to the local database."""
        if not new_password or len(new_password) < 4:
            return False

        new_hash, new_salt = self._hash_passphrase(new_password)
        with self._get_connection() as conn:
            conn.execute(
                """
                UPDATE dev_credentials
                SET password_hash = ?, password_salt = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = 1;
                """,
                (new_hash, new_salt),
            )
            conn.commit()
        return True

dev_auth_repo: BaseAuthRepository = SqliteDevAuthRepository()