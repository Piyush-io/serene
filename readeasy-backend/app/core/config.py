import os
import secrets
import logging
import json # Import json module
from pydantic_settings import BaseSettings
from dotenv import load_dotenv # Import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # Generate a random secret key if not provided in environment
    # Using os.getenv for the default value ensures it's re-evaluated on each load
    SECRET_KEY: str = os.getenv("SECRET_KEY", secrets.token_hex(32))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "ReadEasy API"
    VERSION: str = "1.0.0"

    # CORS Configuration
    # Use os.getenv and split for list
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

    # External API Keys
    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")
    MISTRAL_API_URL: str = os.getenv("MISTRAL_API_URL", "https://api.mistral.ai/v1/chat/completions")
    TOGETHER_API_KEY: str | None = os.getenv("TOGETHER_API_KEY", None)
    GOOGLE_API_KEY: str | None = os.getenv("GOOGLE_API_KEY", None)

    # Firebase Configuration
    # Store the path to the service account JSON file
    FIREBASE_SERVICE_ACCOUNT_FILE_PATH: str | None = os.getenv("FIREBASE_SERVICE_ACCOUNT_FILE_PATH", None)
    FIREBASE_PROJECT_ID: str | None = os.getenv("FIREBASE_PROJECT_ID", None)

    # Redis Configuration
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")

    # Upstash Redis config (for production)
    UPSTASH_REDIS_URL: str | None = os.getenv("UPSTASH_REDIS_URL", None)
    UPSTASH_REDIS_TOKEN: str | None = os.getenv("UPSTASH_REDIS_TOKEN", None)
    # Correctly convert boolean string from env var
    USE_UPSTASH: bool = os.getenv("USE_UPSTASH", "false").lower() == "true"

    # Application Settings
    PROCESSING_RESULT_EXPIRATION_SECONDS: int = int(os.getenv("PROCESSING_RESULT_EXPIRATION_SECONDS", str(3600 * 24)))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = ENVIRONMENT == "development"

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))

    # Backend URL for constructing absolute URLs (e.g., for image links)
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8001")

    class Config:
        # env_file is not needed here if load_dotenv() is called manually
        # from dotenv import load_dotenv
        # load_dotenv() would handle loading from .env
        # If you prefer pydantic_settings to handle it, uncomment env_file
        env_file = ".env" # Uncomment if you want pydantic_settings to load .env
        extra = "ignore"
        case_sensitive = True

    # Method to load the Firebase service account JSON from the file path
    def load_firebase_service_account_json(self) -> dict | None:
        if self.FIREBASE_SERVICE_ACCOUNT_FILE_PATH and os.path.exists(self.FIREBASE_SERVICE_ACCOUNT_FILE_PATH):
            try:
                with open(self.FIREBASE_SERVICE_ACCOUNT_FILE_PATH, 'r') as f:
                    json_data = json.load(f)
                    return json_data
            except (FileNotFoundError, json.JSONDecodeError) as e:
                logger.error(f"Error loading or parsing Firebase service account JSON file: {e}")
                return None
        elif self.FIREBASE_SERVICE_ACCOUNT_FILE_PATH:
            logger.error(f"Firebase service account file not found at {self.FIREBASE_SERVICE_ACCOUNT_FILE_PATH}")
        else:
            logger.error("FIREBASE_SERVICE_ACCOUNT_FILE_PATH is not set")

        return None


# Initialize settings
settings = Settings()


# Log warning if using default SECRET_KEY in production
if settings.ENVIRONMENT == "production" and settings.SECRET_KEY == os.getenv("SECRET_KEY", secrets.token_hex(32)):
    logger.warning("Using a randomly generated SECRET_KEY in production. This will change on restart!")

# Log warning if API keys are missing
if not settings.MISTRAL_API_KEY:
    logger.warning("MISTRAL_API_KEY is not set - OCR functionality may be limited")

if not settings.GOOGLE_API_KEY:
    logger.warning("GOOGLE_API_KEY is not set - Refinement functionality may be limited")

# IMPORTANT: Removed Firebase initialization and its warnings from here.
# These will be handled in your main application file's lifespan.

