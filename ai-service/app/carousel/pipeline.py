import logging
import json
import httpx
import img2pdf
import os
from pathlib import Path
from app.services.db_client import db
from app.carousel.schemas import CarouselJobStatus, TopicAnalysis, CarouselStructure, VisualTheme
from app.carousel.templates import ANALYSIS_PROMPT, PLANNER_PROMPT, STYLING_PROMPT
from groq import AsyncGroq
from app.config import get_settings

logger = logging.getLogger(__name__)

# Local storage path (root of the project)
STORAGE_ROOT = Path(__file__).parent.parent.parent.parent / "storage"

async def run_carousel_pipeline(job_id: str):
    settings = get_settings()
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    # 1. Fetch job data from local Postgres
    job = db.fetch_one("SELECT * FROM carousel_jobs WHERE id = %s", [job_id])
    if not job:
        raise ValueError(f"Job {job_id} not found")

    payload = job.get("payload") or {}
    topic = job.get("topic")
    content = payload.get("generatedContent")

    # --- Step 1: Analysis ---
    await update_job_status(job_id, CarouselJobStatus.ANALYZING, 1)
    analysis = await call_llm(client, ANALYSIS_PROMPT.format(topic=topic, content=content), TopicAnalysis)
    
    # --- Step 2: Planning ---
    await update_job_status(job_id, CarouselJobStatus.GENERATING, 2, {"analysis": analysis.model_dump()})
    structure = await call_llm(client, PLANNER_PROMPT.format(analysis=analysis.model_dump_json(), content=content), CarouselStructure)
    
    # Save slides to carousel_slides
    for i, slide in enumerate(structure.slides):
        db.insert("carousel_slides", {
            "job_id": job_id,
            "slide_index": i,
            "type": slide.type,
            "content": json.dumps(slide.model_dump()),
            "visual_hint": slide.visual_hint
        })

    # --- Step 3: Styling ---
    await update_job_status(job_id, CarouselJobStatus.STYLING, 3)
    theme = await call_llm(client, STYLING_PROMPT.format(summary=analysis.core_message), VisualTheme)
    
    # --- Step 4: Rendering ---
    await update_job_status(job_id, CarouselJobStatus.RENDERING, 4, {"theme": theme.model_dump()})
    
    slides = db.execute("SELECT * FROM carousel_slides WHERE job_id = %s", [job_id])
    
    png_bytes_list = []
    png_paths = []

    async with httpx.AsyncClient() as http_client:
        for slide in sorted(slides, key=lambda x: x["slide_index"]):
            render_res = await http_client.post(f"{settings.RENDER_SERVICE_URL}/render", json={
                "slide_id": str(slide["id"]),
                "payload": {
                    "content": slide["content"],
                    "theme": theme.model_dump()
                }
            }, timeout=60.0)
            
            if render_res.status_code == 200:
                storage_path = render_res.json().get("storage_path")
                png_paths.append(storage_path)
                
                # Update slide in DB
                db.update("carousel_slides", {
                    "png_storage_path": storage_path, 
                    "render_status": "rendered"
                }, "id = %s", [slide["id"]])
                
                # Load PNG bytes for PDF generation
                full_path = STORAGE_ROOT / storage_path
                with open(full_path, "rb") as f:
                    png_bytes_list.append(f.read())
            else:
                raise ValueError(f"Failed to render slide {slide['id']}: {render_res.text}")

    # --- Step 5: Exporting (PDF) ---
    await update_job_status(job_id, CarouselJobStatus.EXPORTING, 5)
    
    if png_bytes_list:
        pdf_bytes = img2pdf.convert(png_bytes_list)
        pdf_filename = f"exports/{job_id}.pdf"
        full_pdf_path = STORAGE_ROOT / pdf_filename
        full_pdf_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(full_pdf_path, "wb") as f:
            f.write(pdf_bytes)
        
        # Update job with final assets
        db.update("carousel_jobs", {
            "final_assets": json.dumps({
                "pdf_url": pdf_filename,
                "png_urls": png_paths
            })
        }, "id = %s", [job_id])

    # --- Finalize ---
    await update_job_status(job_id, CarouselJobStatus.DONE, 6)

async def update_job_status(job_id: str, status: CarouselJobStatus, step: int, extra_payload: dict = None):
    data = {"status": status.value, "current_step": step}
    if extra_payload:
        job = db.fetch_one("SELECT payload FROM carousel_jobs WHERE id = %s", [job_id])
        current = job.get("payload") if job and job.get("payload") else {}
        current.update(extra_payload)
        data["payload"] = json.dumps(current)
    
    db.update("carousel_jobs", data, "id = %s", [job_id])
    logger.info(f"Job {job_id} updated to {status} (Step {step})")

async def call_llm(client: AsyncGroq, prompt: str, schema):
    settings = get_settings()
    completion = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.2
    )
    content = completion.choices[0].message.content
    return schema.model_validate_json(content)
