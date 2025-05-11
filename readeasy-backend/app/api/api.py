from fastapi import APIRouter

from app.auth import router as auth_router
from app.api.endpoints import process as process_router
from app.api.endpoints import images as images_router

api_router = APIRouter()

api_router.include_router(auth_router.router, prefix="/auth", tags=["auth"])
api_router.include_router(process_router.router, prefix="/process", tags=["process"])
api_router.include_router(images_router.router, prefix="/images", tags=["images"])
