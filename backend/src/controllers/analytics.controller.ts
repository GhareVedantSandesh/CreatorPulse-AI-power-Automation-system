import { Request, Response } from 'express';
import { Draft } from '../models';
import { logger } from '../utils/logger';
import { linkedinService } from '../services/linkedin.service';

export const analyticsController = {
    async syncDraftAnalytics(req: Request, res: Response): Promise<void> {
        const userId = req.user!.id;
        const { draftId } = req.params;

        try {
            const draft = await Draft.findOne({ _id: draftId, user_id: userId, status: 'published' });

            if (!draft) {
                res.status(404).json({ error: 'Published draft not found or missing upstream LinkedIn ID.' });
                return;
            }

            const upstream_id = draft.upstream_id;

            if (!upstream_id) {
                res.status(400).json({ error: 'This draft has never been successfully published to LinkedIn.' });
                return;
            }

            const accessToken = await linkedinService.getValidToken(userId);

            try {
                const metrics = await linkedinService.getPostMetrics(accessToken, upstream_id);

                const rawMetrics = {
                    likes: metrics.likes,
                    comments: metrics.comments,
                    shares: 0,
                    views: 0
                };

                await Draft.updateOne(
                    { _id: draftId },
                    { $set: { metrics: rawMetrics, upstream_status: 'live' } }
                );

                res.json({
                    success: true,
                    data: {
                        metrics: rawMetrics,
                        upstream_status: 'live'
                    }
                });

            } catch (err: any) {
                if (err.message === 'POST_DELETED') {
                    await Draft.updateOne(
                        { _id: draftId },
                        { $set: { upstream_status: 'deleted' } }
                    );

                    res.status(404).json({
                        success: false,
                        error: 'Post was deleted directly on LinkedIn.',
                        upstream_status: 'deleted'
                    });
                    return;
                }

                throw err;
            }

        } catch (error: any) {
            logger.error('Failed to sync analytics', { error: error.message, draftId });
            res.status(500).json({ error: 'Failed to sync analytics.' });
        }
    }
};
