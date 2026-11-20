import { Request, Response } from 'express';
import { Topic } from '../models';
import { logger } from '../utils/logger';

export const topicsController = {
    async getTopics(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { date } = req.query;

            const query: any = { user_id: userId };

            if (date) {
                const dateObj = new Date(date as string);
                const start = new Date(dateObj);
                start.setHours(0, 0, 0, 0);
                const end = new Date(dateObj);
                end.setHours(23, 59, 59, 999);
                query.created_at = { $gte: start, $lte: end };
            }

            const topics = await Topic.find(query).sort({ trend_score: -1 });
            res.json(topics.map(t => { const doc = t.toJSON(); doc.id = doc._id; delete doc._id; return doc; }));
        } catch (error: any) {
            logger.error('Error fetching topics', { error: error.message });
            res.status(500).json({ error: 'Failed to fetch topics' });
        }
    },

    async createTopic(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { title, description, keywords, trend_score, confidence_score } = req.body;

            const topic = new Topic({
                user_id: userId,
                title,
                description,
                keywords: keywords || [],
                trend_score: trend_score || 0,
                confidence_score: confidence_score || 0
            });
            await topic.save();
            const doc = topic.toJSON();
            doc.id = doc._id;
            delete doc._id;
            res.json(doc);
        } catch (error: any) {
            logger.error('Error creating topic', { error: error.message });
            res.status(500).json({ error: 'Failed to create topic' });
        }
    }
};
