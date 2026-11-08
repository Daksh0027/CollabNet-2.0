import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "collabonet")

SESSION_COOKIE = "session_token"
AUTH_EXCHANGE_URL = os.environ.get("AUTH_EXCHANGE_URL", "").strip()
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")

STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

AI_API_KEY = os.environ.get("AI_API_KEY", "").strip()
AI_BASE_URL = os.environ.get("AI_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
AI_MODEL = os.environ.get("AI_MODEL", "google/gemini-2.5-flash")

BANNED_WORDS = {"scam", "fraud", "idiot", "stupid", "trash", "hate", "worst", "liar", "thief"}
DEFAULT_ON_TIME_RATE = 98.0
