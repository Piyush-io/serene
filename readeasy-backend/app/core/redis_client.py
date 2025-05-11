import redis.asyncio as redis
from app.core.config import settings
import logging
from typing import Union, Optional, Any, Dict, Callable, List

# Configure logger
logger = logging.getLogger(__name__)

class UpstashRedisWrapper:
    """Wrapper to make Upstash Redis API compatible with asyncio Redis."""
    
    def __init__(self, client):
        self.client = client
        
    async def set(self, key, value, ex=None):
        return self.client.set(key, value, ex=ex)
        
    async def get(self, key):
        return self.client.get(key)
        
    async def delete(self, *keys):
        return self.client.delete(*keys)
        
    async def exists(self, *keys):
        return self.client.exists(*keys)
        
    async def ping(self):
        return self.client.ping()
        
    async def expire(self, key, seconds):
        return self.client.expire(key, seconds)
        
    async def hset(self, name, key=None, value=None, mapping=None):
        if mapping:
            return self.client.hset(name, mapping=mapping)
        return self.client.hset(name, key, value)
        
    async def hget(self, name, key):
        return self.client.hget(name, key)
        
    async def hgetall(self, name):
        return self.client.hgetall(name)
        
    async def hmset(self, name, mapping):
        return self.client.hmset(name, mapping)
        
    async def hmget(self, name, keys):
        return self.client.hmget(name, keys)
        
    async def hdel(self, name, *keys):
        return self.client.hdel(name, *keys)
    
    async def keys(self, pattern):
        return self.client.keys(pattern)
        
    async def scan_iter(self, match=None, count=None):
        # Upstash might not support scan_iter, so we implement it using keys
        if match:
            keys = await self.keys(match)
            for key in keys:
                yield key
        else:
            keys = await self.keys('*')
            for key in keys:
                yield key
                
    async def aclose(self):
        # No-op for Upstash client which doesn't need explicit closing
        pass

# Initialize Redis client based on environment
redis_client: Union[redis.Redis, UpstashRedisWrapper] = None

if settings.USE_UPSTASH and settings.UPSTASH_REDIS_URL and settings.UPSTASH_REDIS_TOKEN:
    try:
        from upstash_redis import Redis
        # Initialize Upstash Redis client with wrapper for compatibility
        upstash_client = Redis(
            url=settings.UPSTASH_REDIS_URL,
            token=settings.UPSTASH_REDIS_TOKEN
        )
        redis_client = UpstashRedisWrapper(upstash_client)
        logger.info("Initialized Upstash Redis client for production")
    except ImportError:
        logger.error("Failed to import upstash_redis, falling back to standard Redis")
        redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            password=settings.REDIS_PASSWORD,
            decode_responses=True
        )
else:
    # Use standard Redis for local development
    redis_client = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        password=settings.REDIS_PASSWORD,
        decode_responses=True
    )
    logger.info(f"Initialized standard Redis client ({settings.REDIS_HOST}:{settings.REDIS_PORT})")

async def get_redis_client():
    """Dependency to get the Redis client."""
    return redis_client

async def close_redis_client():
    """Close Redis connection on application shutdown."""
    if hasattr(redis_client, 'aclose'):
        await redis_client.aclose() 