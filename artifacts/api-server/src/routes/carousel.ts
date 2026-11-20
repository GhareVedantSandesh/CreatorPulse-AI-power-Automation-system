import { Router, type Request, type Response } from "express";
import { db, carouselJobsTable, carouselSlidesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middlewares/auth";
import { carouselQueue } from "../lib/queues";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../lib/logger";

const router: Router = Router();

router.use(authMiddleware);

// POST /api/carousel/generate
router.post("/generate", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { topicId, generatedContent, slideCount = 6, templateHint, idempotencyKey } = req.body;

    let content = generatedContent || "";
    
    // If we only have a topicId, we'd normally fetch it here. 
    // For now, we expect content to be passed or handled by the AI worker later.

    const finalIdempotencyKey = idempotencyKey || uuidv4();

    // 1. Check for existing job
    const existingJob = await db.query.carouselJobsTable.findFirst({
      where: eq(carouselJobsTable.idempotency_key, finalIdempotencyKey)
    });

    if (existingJob) {
      res.json({ jobId: existingJob.id, status: existingJob.status });
      return;
    }

    // 2. Create job in DB
    const [job] = await db.insert(carouselJobsTable).values({
      user_id: userId,
      topic: "LinkedIn Carousel",
      status: "queued",
      payload: { 
        topicId, 
        generatedContent: content, 
        slideCount, 
        templateHint 
      },
      idempotency_key: finalIdempotencyKey
    }).returning();

    // 3. Enqueue
    await carouselQueue.add("generate", { jobId: job.id });

    res.status(202).json({ 
      jobId: job.id, 
      status: "queued" 
    });

  } catch (err) {
    logger.error({ err }, "Failed to start carousel generation");
    res.status(500).json({ error: "Failed to start generation" });
  }
});

// GET /api/carousel/jobs/:id
router.get("/jobs/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const jobId = req.params.id as any;

    const job = await db.query.carouselJobsTable.findFirst({
      where: eq(carouselJobsTable.id, jobId)
    });

    if (!job || job.user_id !== userId) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const slides = await db.select().from(carouselSlidesTable).where(eq(carouselSlidesTable.job_id, jobId));

    // Map local file paths to static URLs
    const host = req.get("host");
    const protocol = req.protocol;

    res.json({
      ...job,
      carousel_slides: slides.map(s => ({
        ...s,
        png_url: s.png_storage_path ? `${protocol}://${host}/storage/${s.png_storage_path}` : null
      })),
      pdf_url: (job.final_assets as any)?.pdf_url ? `${protocol}://${host}/storage/${(job.final_assets as any).pdf_url}` : null
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

// GET /api/carousel/history
router.get("/history", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const jobs = await db.select().from(carouselJobsTable)
      .where(eq(carouselJobsTable.user_id, userId))
      .orderBy(desc(carouselJobsTable.created_at));

    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

export default router;
