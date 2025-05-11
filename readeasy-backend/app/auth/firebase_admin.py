import firebase_admin
from firebase_admin import auth, credentials
import logging
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

# Function to get the default Firebase app instance
def get_firebase_app():
    """Gets the default Firebase app instance."""
    try:
        # This will return the already initialized app instance
        return firebase_admin.get_app()
    except ValueError:
        # Handle the case where the app is not initialized yet
        # This shouldn't happen if you call this function *after* lifespan completes
        # but it's good practice for robustness.
        logger.error("Firebase Admin SDK is not initialized.")
        return None

# Example function to get a user by UID
def get_user_by_uid(uid: str):
    app = get_firebase_app()
    if app:
        try:
            user = auth.get_user(uid, app=app) # Pass the app instance
            return user
        except Exception as e:
            logger.error(f"Error getting user by UID {uid}: {e}")
            return None
    return None

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