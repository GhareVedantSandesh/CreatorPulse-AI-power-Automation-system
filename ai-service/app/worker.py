import asyncio
import logging
import signal
import sys
from bullmq import Worker
from app.config import get_settings
from app.carousel.pipeline import run_carousel_pipeline
from app.services.db_client import db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("carousel-worker")

async def process_carousel_job(job, job_id):
    """
    Worker process function for BullMQ.
    """
    job_uuid = job.data.get("jobId")
    logger.info(f"🚀 Processing carousel job: {job_uuid}")
    
    try:
        await run_carousel_pipeline(job_uuid)
        logger.info(f"✅ Job {job_uuid} completed successfully")
        return {"status": "done", "jobId": job_uuid}
    except Exception as e:
        logger.error(f"❌ Job {job_uuid} failed: {e}", exc_info=True)
        # Final safety update in case pipeline didn't catch it
        try:
            db.update("carousel_jobs", {
                "status": "failed", 
                "error_log": str(e)
            }, "id = %s", [job_uuid])
        except:
            pass
        raise e

async def main():
    settings = get_settings()
    
    # Connection settings for Redis
    connection_opts = settings.REDIS_URL
    
    worker = Worker(
        "carousel_generation", 
        process_carousel_job, 
        {"connection": connection_opts}
    )
    
    logger.info(f"👷 Carousel worker started on {settings.REDIS_URL}")
    logger.info("Waiting for jobs in 'carousel_generation' queue...")
    
    # Handle graceful shutdown - Windows compatible
    stop_event = asyncio.Event()
    
    if sys.platform == "win32":
        # Windows doesn't support add_signal_handler
        def handle_signal():
            logger.info("Signal received, stopping...")
            stop_event.set()
            
        signal.signal(signal.SIGINT, lambda s, f: handle_signal())
        signal.signal(signal.SIGTERM, lambda s, f: handle_signal())
    else:
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, stop_event.set)
        
    # Run the worker until stopped
    # Note: Using asyncio.gather or just waiting for the event
    worker_task = asyncio.create_task(worker.run())
    
    try:
        await stop_event.wait()
    except asyncio.CancelledError:
        pass

    logger.info("Stopping worker...")
    await worker.close()
    worker_task.cancel()
    logger.info("Worker stopped.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
