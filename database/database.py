import hashlib
import os
import secrets
import sqlite3
import time
from pathlib import Path


DATABASE_PATH = Path(
	os.getenv(
		"DATABASE_PATH",
		str(Path(__file__).resolve().parent / "identity.sqlite3"),
	)
)


def connection() -> sqlite3.Connection:
	database = sqlite3.connect(DATABASE_PATH)
	database.row_factory = sqlite3.Row
	return database


def init_database() -> None:
	with connection() as database:
		database.executescript(
			"""
			CREATE TABLE IF NOT EXISTS encrypted_identities (
				did TEXT PRIMARY KEY,
				wallet_address TEXT NOT NULL UNIQUE,
				nonce TEXT NOT NULL,
				ciphertext TEXT NOT NULL,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			);
			CREATE TABLE IF NOT EXISTS auth_challenges (
				address TEXT PRIMARY KEY,
				nonce TEXT NOT NULL,
				expires_at INTEGER NOT NULL
			);
			CREATE TABLE IF NOT EXISTS auth_sessions (
				token_hash TEXT PRIMARY KEY,
				address TEXT NOT NULL,
				expires_at INTEGER NOT NULL
			);
			CREATE TABLE IF NOT EXISTS access_audit_log (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				requester_address TEXT NOT NULL,
				subject_did TEXT NOT NULL,
				action TEXT NOT NULL,
				created_at INTEGER NOT NULL
			);
			CREATE TABLE IF NOT EXISTS encrypted_documents (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				did TEXT NOT NULL,
				document_type TEXT NOT NULL,
				filename TEXT NOT NULL,
				media_type TEXT NOT NULL,
				nonce TEXT NOT NULL,
				ciphertext TEXT NOT NULL,
				created_at INTEGER NOT NULL
			);
			"""
		)


def save_challenge(address: str, nonce: str, expires_at: int) -> None:
	with connection() as database:
		database.execute(
			"INSERT OR REPLACE INTO auth_challenges VALUES (?, ?, ?)",
			(address, nonce, expires_at),
		)


def take_challenge(address: str) -> tuple[str, int] | None:
	with connection() as database:
		row = database.execute(
			"SELECT nonce, expires_at FROM auth_challenges WHERE address = ?",
			(address,),
		).fetchone()
		database.execute("DELETE FROM auth_challenges WHERE address = ?", (address,))
	return (row["nonce"], row["expires_at"]) if row else None


def create_session(address: str, lifetime_seconds: int = 900) -> str:
	token = secrets.token_urlsafe(32)
	expires_at = int(time.time()) + lifetime_seconds
	with connection() as database:
		database.execute(
			"INSERT INTO auth_sessions VALUES (?, ?, ?)",
			(hashlib.sha256(token.encode()).hexdigest(), address, expires_at),
		)
	return token


def session_address(token: str) -> str | None:
	token_hash = hashlib.sha256(token.encode()).hexdigest()
	with connection() as database:
		row = database.execute(
			"SELECT address, expires_at FROM auth_sessions WHERE token_hash = ?",
			(token_hash,),
		).fetchone()
		if row and row["expires_at"] <= int(time.time()):
			database.execute("DELETE FROM auth_sessions WHERE token_hash = ?", (token_hash,))
			return None
	return row["address"] if row else None


def save_identity(did: str, address: str, nonce: str, ciphertext: str) -> None:
	now = int(time.time())
	with connection() as database:
		database.execute(
			"""
			INSERT INTO encrypted_identities
				(did, wallet_address, nonce, ciphertext, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT(did) DO UPDATE SET
				nonce = excluded.nonce,
				ciphertext = excluded.ciphertext,
				updated_at = excluded.updated_at
			""",
			(did, address, nonce, ciphertext, now, now),
		)


def get_identity(did: str) -> sqlite3.Row | None:
	with connection() as database:
		return database.execute(
			"SELECT * FROM encrypted_identities WHERE did = ?", (did,)
		).fetchone()


def write_audit_log(requester: str, did: str, action: str) -> None:
	with connection() as database:
		database.execute(
			"INSERT INTO access_audit_log (requester_address, subject_did, action, created_at) VALUES (?, ?, ?, ?)",
			(requester, did, action, int(time.time())),
		)


def save_document(
	did: str,
	document_type: str,
	filename: str,
	media_type: str,
	nonce: str,
	ciphertext: str,
) -> int:
	with connection() as database:
		cursor = database.execute(
			"""
			INSERT INTO encrypted_documents
				(did, document_type, filename, media_type, nonce, ciphertext, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
			""",
			(did, document_type, filename, media_type, nonce, ciphertext, int(time.time())),
		)
		return int(cursor.lastrowid)


def get_document(document_id: int, did: str) -> sqlite3.Row | None:
	with connection() as database:
		return database.execute(
			"SELECT * FROM encrypted_documents WHERE id = ? AND did = ?",
			(document_id, did),
		).fetchone()


def delete_identity(did: str) -> None:
	with connection() as database:
		database.execute("DELETE FROM encrypted_documents WHERE did = ?", (did,))
		database.execute("DELETE FROM encrypted_identities WHERE did = ?", (did,))
