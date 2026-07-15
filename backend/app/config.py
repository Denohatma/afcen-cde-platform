from __future__ import annotations
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")
except ImportError:
    pass

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./cde.db")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./backend/uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
