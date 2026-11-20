import time
import json
import logging
from groq import AsyncGroq
from app.config import get_settings
from app.models.schemas import CarouselRequest, CarouselResponse, CarouselSlide

logger = logging.getLogger(__name__)

CAROUSEL_PROMPT = """You are an expert LinkedIn carousel designer and content strategist.

Based ONLY on the content provided below, create a structured LinkedIn carousel.
Do NOT invent facts or statistics. Extract insights strictly from the source material.

TOPIC: {topic}
DESCRIPTION: {description}
SOURCE CONTENT:
{generated_content}

KEYWORDS: {keywords}
REQUIRED SLIDES: {slide_count}

{template_section}

{voice_section}

SLIDE TYPES AVAILABLE:
- cover: Big title + subtitle (always slide 1)
- problem: The challenge/context (heading + body)
- insight: A key takeaway (heading + body)
- stat: A compelling number (number + label + context) — only use if a real stat exists in the content
- list: Up to 4 bullet points (heading + points array)
- quote: A pull quote from the content (body)
- cta: Call to action (text + action) — always the last slide

RULES:
1. First slide MUST be type "cover"
2. Last slide MUST be type "cta"
3. Use "stat" only if actual numbers appear in the source content
4. All text must come from the source content — no invented data
5. Keep text SHORT — this is a visual carousel, not an article
   - heading: max 8 words
   - body/subtitle: max 20 words
   - stat number: just the number (e.g. "47" or "3x")
   - list points: max 6 words each
6. Pick a color_theme based on the topic: indigo (tech/AI), emerald (business/growth), rose (leadership/bold), amber (finance/strategy), slate (minimal/professional)
7. cover_keyword: 2-3 words for an Unsplash photo search that fits this topic

OUTPUT FORMAT (valid JSON only, no markdown):
{{
  "title": "Short carousel title",
  "color_theme": "indigo",
  "cover_keyword": "artificial intelligence law",
  "slides": [
    {{"type": "cover", "title": "...", "subtitle": "..."}},
    {{"type": "problem", "heading": "...", "body": "..."}},
    {{"type": "stat", "number": "47", "label": "...", "context": "..."}},
    {{"type": "insight", "heading": "...", "body": "..."}},
    {{"type": "list", "heading": "...", "points": ["...", "...", "..."]}},
    {{"type": "cta", "text": "...", "action": "..."}}
  ]
}}"""


async def generate_carousel(request: CarouselRequest) -> CarouselResponse:
    """
    Generate a structured carousel from existing topic content.
    Uses Groq to extract slide structure strictly from the provided content.
    """
    settings = get_settings()
    start_time = time.time()

    keywords_str = ", ".join(request.keywords) if request.keywords else "none"

    # Build optional template section
    if request.template_hint:
        template_section = f"TEMPLATE STRUCTURE (follow this exactly):\n{request.template_hint}"
    else:
        template_section = "TEMPLATE STRUCTURE: Use your best judgment for slide sequence."

    # Build optional voice section
    if request.voice_samples:
        voice_text = "\n---\n".join(request.voice_samples[:3])  # cap at 3 samples
        voice_section = f"VOICE STYLE (match this creator's tone and style):\n{voice_text}"
    else:
        voice_section = "VOICE STYLE: Use a professional, concise LinkedIn tone."

    prompt = CAROUSEL_PROMPT.format(
        topic=request.topic,
        description=request.description,
        generated_content=request.generated_content[:8000],
        keywords=keywords_str,
        slide_count=request.slide_count,
        template_section=template_section,
        voice_section=voice_section,
    )

    logger.info(f"Generating carousel for topic: {request.topic} ({request.slide_count} slides)")

    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    full_content = ""
    total_tokens = 0

    completion = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,  # Lower temp for structured, factual output
        max_completion_tokens=4096,
        top_p=1,
        stream=True,
        stop=None,
    )

    async for chunk in completion:
        full_content += chunk.choices[0].delta.content or ""
        if chunk.usage:
            total_tokens = chunk.usage.total_tokens

    # Parse JSON response
    try:
        text = full_content.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
        parsed = json.loads(text)
    except Exception as e:
        logger.error(f"Failed to parse carousel JSON: {e}\nRaw: {full_content[:500]}")
        raise ValueError(f"AI returned invalid JSON for carousel: {e}")

    # Build slides
    slides = []
    for slide_data in parsed.get("slides", []):
        slides.append(CarouselSlide(**slide_data))

    processing_time = int((time.time() - start_time) * 1000)

    logger.info(
        f"Carousel generated: {len(slides)} slides, "
        f"{total_tokens} tokens, {processing_time}ms"
    )

    return CarouselResponse(
        title=parsed.get("title", request.topic),
        color_theme=parsed.get("color_theme", "indigo"),
        cover_keyword=parsed.get("cover_keyword", request.topic),
        slides=slides,
        tokens_consumed=total_tokens,
        processing_time_ms=processing_time,
    )
