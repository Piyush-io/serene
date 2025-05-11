import httpx
import asyncio
from app.core.config import settings

async def call_mistral_api(text: str) -> str:
    """Simulates or makes a call to the Mistral API for text simplification."""
    # --- Actual API Call (Example - requires valid API key and endpoint) ---
    # if not settings.MISTRAL_API_KEY:
    #     # In a real app, handle this more gracefully or ensure key exists
    #     print("Warning: MISTRAL_API_KEY not set. Returning original text.")
    #     return f"(Simplified) {text[:100]}..."
    # 
    # headers = {
    #     "Authorization": f"Bearer {settings.MISTRAL_API_KEY}",
    #     "Content-Type": "application/json",
    #     "Accept": "application/json",
    # }
    # data = {
    #     "model": "mistral-large-latest", # Or your desired model
    #     "messages": [
    #         {
    #             "role": "system", 
    #             "content": "You are a helpful assistant that simplifies complex text while preserving the original meaning and tone. Focus on clarity and conciseness. Remove jargon."
    #         },
    #         {"role": "user", "content": f"Simplify the following text:\n\n{text}"}
    #     ],
    #     "temperature": 0.3,
    #     "max_tokens": 500, # Adjust as needed
    # }
    # 
    # try:
    #     async with httpx.AsyncClient(timeout=30.0) as client:
    #         response = await client.post(settings.MISTRAL_API_URL, headers=headers, json=data)
    #         response.raise_for_status() # Raise exception for 4xx/5xx errors
    #         result = response.json()
    #         if result.get("choices") and len(result["choices"]) > 0:
    #             simplified_text = result["choices"][0].get("message", {}).get("content", "")
    #             return simplified_text.strip() if simplified_text else f"(Simplified) {text[:100]}..."
    #         else:
    #             print("Warning: Mistral API response format unexpected.")
    #             return f"(Simplified) {text[:100]}..."
    # except httpx.HTTPStatusError as e:
    #     print(f"HTTP error occurred: {e.response.status_code} - {e.response.text}")
    #     return f"(Error simplifying) {text[:100]}..."
    # except Exception as e:
    #     print(f"An error occurred calling Mistral API: {e}")
    #     return f"(Error simplifying) {text[:100]}..."
    # 
    # --- Simulation for now ---
    await asyncio.sleep(1.5) # Simulate network delay (increased from 0.5 to 1.5 seconds)
    if len(text) < 50:
        return f"Simply: {text}"
    else:
        return f"Simplified version of: {text[:50]}... (rest of the content made simpler)" 