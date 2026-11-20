import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { TrendResearch } from '../models';

export const researchController = {
    async conductResearch(req: Request, res: Response) {
        try {
            const { topic_id, depth_level } = req.body;
            const userId = req.user!.id;

            logger.info('Topic research triggered (stub)', { userId, topic_id, depth_level });

            res.json({ success: true, message: "Research queued (stub)", cached: false });
        } catch (error: any) {
            logger.error('Research error', { error: error.message });
            res.status(500).json({ error: 'Failed to conduct research' });
        }
    },

    async getTopicResearch(req: Request, res: Response) {
        try {
            const { topicId } = req.params;
            const userId = req.user!.id;

            const result = await TrendResearch.findOne({ topic_id: topicId, user_id: userId }).sort({ created_at: -1 });

            if (!result) {
                res.json(null);
                return;
            }
            const doc = result.toJSON(); doc.id = doc._id; delete doc._id;
            res.json(doc);
        } catch (error: any) {
            logger.error('Get topic research error', { error: error.message });
            res.status(500).json({ error: 'Failed to get topic research' });
        }
    }
};
