import firebase_admin
from firebase_admin import auth
from fastapi import HTTPException, status
import logging
from .firebase_admin import get_firebase_app

logger = logging.getLogger(__name__)

# Function to verify Firebase ID token
async def verify_firebase_token(token: str):
    """
    Verify a Firebase ID token and return the decoded token with user info
    """
    if not token:
        logger.warning("Empty token provided to verify_firebase_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    app = get_firebase_app()
    if not app:
        logger.error("Firebase app not initialized when verifying token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication service unavailable",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Verify the token
        decoded_token = auth.verify_id_token(token, app=app)
        logger.info(f"Firebase token verified for user: {decoded_token.get('uid')}")
        return decoded_token
    except firebase_admin.exceptions.FirebaseError as e:
        logger.error(f"Firebase token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Unexpected error verifying Firebase token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication error",
            headers={"WWW-Authenticate": "Bearer"},
        ) 