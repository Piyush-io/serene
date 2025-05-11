from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
import redis.asyncio as redis

from app.schemas.auth import Token, User, UserCreate, UserInDB
from app.auth.service import (
    authenticate_user, create_access_token, get_current_active_user, 
    user_exists, save_user
)
from app.auth.utils import get_password_hash
from app.core.config import settings
from app.core.redis_client import get_redis_client

router = APIRouter()

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    r: redis.Redis = Depends(get_redis_client)
):
    user = await authenticate_user(form_data.username, form_data.password, r=r)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserCreate, r: redis.Redis = Depends(get_redis_client)):
    exists = await user_exists(user_in.username, r=r)
    if exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    hashed_password = get_password_hash(user_in.password)
    
    # Generate a unique ID (simple counter for now, replace with DB sequence or UUID in production)
    user_id = await r.incr("user_id_counter") 

    new_user_db = UserInDB(
        id=user_id,
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hashed_password,
        disabled=False
    )

    await save_user(new_user_db, r=r)
    
    # Return user data without the hashed password
    return User(**new_user_db.model_dump(exclude={"hashed_password"}))


@router.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    # get_current_active_user already handles fetching user data via get_current_user
    return current_user 