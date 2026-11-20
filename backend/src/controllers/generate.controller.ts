import { Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { logger } from '../utils/logger';
import { GenerateContentInput } from '../middleware/validate.middleware';
import { Draft } from '../models';

export const generateController = {
    async generate(req: Request, res: Response): Promise<void> {
        const body = req.validatedBody as GenerateContentInput;
        const userId = req.user!.id;

        try {
            logger.info('Content generation requested', {
                userId,
                topic: body.topic.substring(0, 50),
                contentType: body.content_type,
            });

            const result = await aiService.generateContent({
                trend: {
                    topic: body.topic,
                    description: body.description,
                    source_url: body.source_url || undefined,
                    keywords: body.keywords,
                },
                hook_text: req.body.hook_text,
                voice_samples: body.voice_samples,
                content_type: body.content_type,
                platform: 'linkedin',
            });

            const draftContent = {
                text: result.content,
                hashtags: result.hashtags || [],
                mentions: []
            };

            const draft = new Draft({
                user_id: userId,
                platform: 'linkedin',
                content_type: body.content_type,
                title: body.topic.substring(0, 100),
                content: draftContent,
                status: 'draft'
            });
            await draft.save();
            const draft_id = draft._id;

            logger.info('Content generated successfully and saved to drafts', {
                userId,
                draftId: draft_id,
                contentLength: result.content.length,
                tokens: result.tokens_consumed,
                processingMs: result.processing_time_ms,
            });

            res.json({
                success: true,
                data: {
                    ...result,
                    draft_id
                },
            });
        } catch (err: any) {
            logger.error('Content generation failed', {
                error: err.message,
                userId,
            });
            res.status(502).json({
                error: 'Content generation failed',
                details: err.message,
            });
        }
    },

    async generateHooks(req: Request, res: Response): Promise<void> {
        const body = req.validatedBody as GenerateContentInput;
        const userId = req.user!.id;
        const angle = req.body.angle;

        try {
            logger.info('Hook generation requested', { userId, topic: body.topic.substring(0, 50) });

            const result = await aiService.generateHooks({
                trend: {
                    topic: body.topic,
                    description: body.description,
                    source_url: body.source_url || undefined,
                    keywords: body.keywords,
                },
                angle: angle,
                voice_samples: body.voice_samples,
            });

            res.json({
                success: true,
                data: result,
            });
        } catch (err: any) {
            logger.error('Hook generation failed', { error: err.message, userId });
            res.status(502).json({ error: 'Hook generation failed', details: err.message });
        }
    },
};
