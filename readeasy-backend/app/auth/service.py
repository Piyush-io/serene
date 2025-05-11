from datetime import datetime, timedelta, timezone
from typing import Optional
import json
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError
import redis.asyncio as redis

from app.core.config import settings
from app.core.redis_client import get_redis_client
from app.schemas.auth import TokenData, User, UserInDB
from app.auth.utils import verify_password, get_password_hash
from app.auth.firebase_service import verify_firebase_token

# --- Redis User Functions (Replaces fake_users_db) ---
USER_DB_PREFIX = "user:"

async def get_user(username: str, r: redis.Redis = Depends(get_redis_client)) -> Optional[UserInDB]:
    user_key = f"{USER_DB_PREFIX}{username}"
    user_data_json = await r.get(user_key)
    if user_data_json:
        try:
            user_data = json.loads(user_data_json)
            # Add username back if not stored in the hash, Pydantic needs it
            if 'username' not in user_data:
                 user_data['username'] = username
            return UserInDB(**user_data)
        except (json.JSONDecodeError, ValidationError) as e:
            print(f"Error decoding/validating user data for {username}: {e}")
            return None
    return None

async def user_exists(username: str, r: redis.Redis = Depends(get_redis_client)) -> bool:
    user_key = f"{USER_DB_PREFIX}{username}"
    return await r.exists(user_key)

async def save_user(user_in_db: UserInDB, r: redis.Redis = Depends(get_redis_client)):
    user_key = f"{USER_DB_PREFIX}{user_in_db.username}"
    # Store user data as JSON string in Redis
    user_data_json = user_in_db.model_dump_json()
    await r.set(user_key, user_data_json)
    # Potentially set an expiration if needed, or manage user TTL separately

# --- OAuth2 Setup ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

# --- JWT Token Functions ---
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

# --- Authentication Functions ---
async def authenticate_user(username: str, password: str, r: redis.Redis = Depends(get_redis_client)) -> Optional[UserInDB]:
    user = await get_user(username, r) # Pass redis client
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

# --- Get or Create Firebase User ---
async def get_or_create_firebase_user(decoded_token: dict, r: redis.Redis) -> User:
    """
    Get a user from Firebase token data, or create one if they don't exist
    """
    firebase_uid = decoded_token.get("uid")
    email = decoded_token.get("email", f"{firebase_uid}@firebase.user")
    username = email  # Use email as username
    
    # Check if user exists by username
    user = await get_user(username, r)
    
    if not user:
        # Create new user
        user_in_db = UserInDB(
            id=str(uuid.uuid4()),
            username=username,
            email=email,
            firebase_uid=firebase_uid,
            full_name=decoded_token.get("name", ""),
            disabled=False,
            hashed_password=get_password_hash(f"{firebase_uid}-{uuid.uuid4()}")  # Use a random password
        )
        await save_user(user_in_db, r)
        # Convert to User model (exclude hashed_password)
        user_data = user_in_db.model_dump(exclude={"hashed_password"})
        user = User(**user_data)
    else:
        # Convert UserInDB to User (excluding hashed_password)
        user_data = user.model_dump(exclude={"hashed_password"})
        user = User(**user_data)
    
    return user

# --- Dependency for Getting Current User ---
async def get_current_user(token: str = Depends(oauth2_scheme), r: redis.Redis = Depends(get_redis_client)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # First, try to verify as a Firebase token
    try:
        # If token verification successful, get or create user
        decoded_token = await verify_firebase_token(token)
        return await get_or_create_firebase_user(decoded_token, r)
    except Exception as firebase_error:
        # If Firebase validation fails, try the regular JWT
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )
            username: str | None = payload.get("sub")
            if username is None:
                raise credentials_exception
            token_data = TokenData(username=username)
        except (JWTError, ValidationError):
            # If both Firebase and JWT validation fail, raise error
            raise credentials_exception
        
        user = await get_user(username=token_data.username, r=r) # Pass redis client
        if user is None:
            raise credentials_exception
        # Convert UserInDB to User (excluding hashed_password)
        user_data = user.model_dump(exclude={"hashed_password"})
        return User(**user_data)

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user 