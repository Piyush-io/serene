from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os
from pathlib import Path
import json # Import json module

# Import API router for better organization
from app.api.api import api_router
from app.core.redis_client import redis_client, close_redis_client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()  # Add file handler in production
    ]
)

logger = logging.getLogger(__name__)

# Create static directories if they don't exist
static_dir = Path("static")
if not static_dir.exists():
    static_dir.mkdir(exist_ok=True, parents=True)

# Create temp_images directory if it doesn't exist
temp_images_dir = static_dir / "temp_images"
if not temp_images_dir.exists():
    temp_images_dir.mkdir(exist_ok=True, parents=True)

# Import settings from config
from app.core.config import settings

# Define lifespan for application startup and shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to Redis, initialize Firebase, and perform other initialization
    logger.info(f"Starting ReadEasy API in {settings.ENVIRONMENT} mode")
    logger.info(f"CORS allowed origins: {settings.CORS_ORIGINS}")

    # Connect to Redis
    try:
        await redis_client.ping()  # Check connection
        logger.info("Connected to Redis")
    except Exception as e:
        logger.error(f"Could not connect to Redis: {e}")
        # Depending on requirements, you might want to prevent app startup
        # raise # Uncomment to stop startup if Redis connection fails

    # --- Firebase Initialization ---
    try:
        import firebase_admin
        from firebase_admin import credentials

        firebase_config = settings.load_firebase_service_account_json()

        if firebase_config:
            try:
                # Ensure Firebase is not already initialized (important for testing and some reloaders)
                if not firebase_admin._apps:
                    cred = credentials.Certificate(firebase_config)
                    firebase_admin.initialize_app(cred)
                    logger.info("Firebase Admin SDK initialized successfully.")
                else:
                    logger.info("Firebase Admin SDK already initialized.")

            except Exception as e:
                logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
                # Decide how to handle this failure:
                # - You could raise an exception here to prevent the app from starting.
                # - You could set a flag in settings or global state to indicate Firebase is not active.
                # For now, we just log the error.

        # Log warning if Firebase config is missing (placed here after attempting to load)
        if not firebase_config and not settings.FIREBASE_PROJECT_ID:
             logger.warning("Firebase service account JSON not loaded AND FIREBASE_PROJECT_ID not set - Firebase authentication will not work")
        elif not firebase_config and settings.FIREBASE_PROJECT_ID:
            logger.warning(f"Firebase service account JSON file not found or could not be loaded from {settings.FIREBASE_SERVICE_ACCOUNT_FILE_PATH}, but FIREBASE_PROJECT_ID is set. Firebase authentication may still fail.")
        elif firebase_config and not settings.FIREBASE_PROJECT_ID:
            logger.warning("Firebase service account JSON loaded, but FIREBASE_PROJECT_ID is not set. This might cause issues.")

    except ImportError:
        logger.warning("firebase_admin not installed. Firebase functionality will be unavailable.")

    # --- End Firebase Initialization ---

    yield

    # Shutdown: Close Redis connection and perform cleanup
    logger.info("Closing Redis connection")
    await close_redis_client()

# Initialize FastAPI app with proper metadata
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API for processing and simplifying documents with AI",
    version=settings.VERSION,
    docs_url="/api/docs" if not settings.ENVIRONMENT == "production" else None,
    redoc_url="/api/redoc" if not settings.ENVIRONMENT == "production" else None,
    lifespan=lifespan
)

# Configure CORS with settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=86400  # 24 hours cache for preflight requests
)

# Include the API router for better organization
app.include_router(api_router, prefix="/api/v1")

# Mount static files directory with proper cache headers
app.mount("/static", StaticFiles(directory="static", html=False), name="static")

@app.get("/")
async def root():
    """Health check endpoint for the API."""
    return {
        "status": "healthy",
        "service": "ReadEasy API",
        "version": "1.0.0"
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint for monitoring systems."""
    return {"status": "healthy"}


# Run directly with uvicorn when executed as script
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    host = os.environ.get("HOST", "0.0.0.0")
    # Use reload only in development
    uvicorn.run("main:app", host=host, port=port, reload=settings.DEBUG)

