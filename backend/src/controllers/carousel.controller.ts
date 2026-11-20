import { Request, Response } from 'express';
import { Topic } from '../models';
import { logger } from '../utils/logger';
import { db, carouselJobsTable, carouselSlidesTable } from '@workspace/db';
import { eq, desc } from 'drizzle-orm';
import { carouselQueue } from '../queues/carousel.queue';
import { v4 as uuidv4 } from 'uuid';

export const carouselController = {

    /**
     * POST /api/carousel/generate
     * Initiates a new async generation job using local Postgres (Drizzle).
     */
    async generate(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const { topicId, generatedContent, slideCount = 6, templateHint, idempotencyKey } = req.body;

            if (!topicId && !generatedContent) {
                res.status(400).json({ error: 'Provide either topicId or generatedContent' });
                return;
            }

            // Load topic from MongoDB (keeping legacy for now)
            let topic: any = null;
            if (topicId) {
                try {
                    topic = await Topic.findOne({ _id: topicId });
                } catch (e) {
                    logger.warn('Topic not found in MongoDB', { topicId });
                }
            }

            let content = generatedContent || '';
            if ((!content || content.trim().length < 20) && topic?.description) {
                content = topic.description;
            }

            if (!content || content.trim().length < 20) {
                res.status(400).json({
                    error: 'Please provide enough content or select a valid topic to generate a carousel.'
                });
                return;
            }

            const finalIdempotencyKey = idempotencyKey || uuidv4();

            logger.info('Initiating local async carousel generation', { userId, topicId, slideCount });

            // 1. Check for existing job
            const [existingJob] = await db
                .select()
                .from(carouselJobsTable)
                .where(eq(carouselJobsTable.idempotency_key, finalIdempotencyKey))
                .limit(1);

            if (existingJob) {
                res.status(200).json({ jobId: existingJob.id, status: existingJob.status, message: 'Existing job found' });
                return;
            }

            // 2. Create carousel_jobs row in Local Postgres
            const [job] = await db
                .insert(carouselJobsTable)
                .values({
                    user_id: userId,
                    topic: topic?.title || 'LinkedIn Content',
                    status: 'queued',
                    payload: { 
                        topicId, 
                        generatedContent: content, 
                        slideCount, 
                        templateHint 
                    },
                    idempotency_key: finalIdempotencyKey
                })
                .returning();

            if (!job) {
                throw new Error('Failed to create carousel job in Postgres');
            }

            // 3. Enqueue job in BullMQ
            await carouselQueue.add('generate', { jobId: job.id });

            // 4. Return 202 Accepted
            res.status(202).json({ 
                jobId: job.id, 
                status: 'queued',
                message: 'Generation started in background'
            });

        } catch (error: any) {
            logger.error('Carousel generation initiation failed', { error: error.message });
            res.status(500).json({ error: error.message || 'Failed to start generation' });
        }
    },

    /**
     * GET /api/carousel/jobs/:id
     * Returns job status and results from Local Postgres.
     */
    async getJob(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const jobId = req.params.id;

            const [job] = await db
                .select()
                .from(carouselJobsTable)
                .where(eq(carouselJobsTable.id, jobId))
                .limit(1);

            if (!job || job.user_id !== userId) {
                res.status(404).json({ error: 'Job not found' });
                return;
            }

            // Fetch slides
            const slides = await db
                .select()
                .from(carouselSlidesTable)
                .where(eq(carouselSlidesTable.job_id, jobId));

            // Map local file paths to static URLs
            const jobWithSlides = {
                ...job,
                carousel_slides: slides.map(s => ({
                    ...s,
                    png_url: s.png_storage_path ? `${req.protocol}://${req.get('host')}/storage/${s.png_storage_path}` : null
                })),
                pdf_url: (job.final_assets as any)?.pdf_url ? `${req.protocol}://${req.get('host')}/storage/${(job.final_assets as any).pdf_url}` : null
            };

            res.json(jobWithSlides);
        } catch (error: any) {
            logger.error('Failed to fetch job', { error: error.message });
            res.status(500).json({ error: 'Failed to fetch job' });
        }
    },

    /**
     * GET /api/carousel/history
     */
    async getHistory(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const jobs = await db
                .select()
                .from(carouselJobsTable)
                .where(eq(carouselJobsTable.user_id, userId))
                .orderBy(desc(carouselJobsTable.created_at));

            res.json(jobs);
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to fetch history' });
        }
    },

    /**
     * POST /api/carousel/save
     */
    async save(req: Request, res: Response): Promise<void> {
        // ... same as before, MongoDB drafts ...
        res.status(501).json({ error: 'Not implemented for local yet' });
    },
};
