from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.config import get_settings
from groq import AsyncGroq
import logging
import time

logger = logging.getLogger(__name__)
router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    stream: Optional[bool] = False

async def verify_openai_key(authorization: str = Header(None)):
    return True # Lenient for dev

@router.post("/v1/chat/completions")
async def chat_completions(
    request: ChatCompletionRequest,
    _auth = Depends(verify_openai_key)
):
    """
    OpenAI-compatible proxy endpoint for Groq.
    This allows the backend to use our local AI service as if it were OpenAI.
    """
    settings = get_settings()
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    
    try:
        logger.info(f"RECEIVED OpenAI PROXY REQUEST for model: {request.model}")
        
        # Map requested model to Groq model if needed
        model = request.model if "llama" in request.model.lower() else settings.GROQ_MODEL
        
        completion = await client.chat.completions.create(
            model=model,
            messages=[{"role": m.role, "content": m.content} for m in request.messages],
            temperature=request.temperature,
            max_completion_tokens=request.max_tokens or 2000,
            stream=False
        )
        
        return {
            "id": completion.id,
            "object": "chat.completion",
            "created": int(time.time()),
            "model": model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": completion.choices[0].message.content
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": completion.usage.prompt_tokens,
                "completion_tokens": completion.usage.completion_tokens,
                "total_tokens": completion.usage.total_tokens
            }
        }
    except Exception as e:
        logger.error(f"OpenAI Proxy Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
