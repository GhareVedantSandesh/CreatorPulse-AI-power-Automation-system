import { Request, Response } from 'express';
import { TrendResearch, Topic, IngestedContent } from '../models';
import { logger } from '../utils/logger';
import { aiService } from '../services/ai.service';

export const trendsController = {
    async getTrend(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;

            const trend = await TrendResearch.findOne({ _id: id, user_id: userId });

            if (!trend) {
                res.status(404).json({ error: 'Trend research not found' });
                return;
            }

            const doc = trend.toJSON(); doc.id = doc._id; delete doc._id;
            res.json(doc);
        } catch (error: any) {
            logger.error('Error fetching trend', { error: error.message });
            res.status(500).json({ error: 'Failed to fetch trend' });
        }
    },

    async listTrends(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const trends = await TrendResearch.find({ user_id: userId }).sort({ created_at: -1 });
            res.json(trends.map(t => { const doc = t.toJSON(); doc.id = doc._id; delete doc._id; return doc; }));
        } catch (error: any) {
            logger.error('Error listing trends', { error: error.message });
            res.status(500).json({ error: 'Failed to list trends' });
        }
    },

    async triggerResearch(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            logger.info('Triggering AI trend research', { userId });

            const latestContent = await IngestedContent.find({ user_id: userId })
                .sort({ published_at: -1 })
                .limit(50);

            if (latestContent.length === 0) {
                res.status(400).json({ error: 'No scraped content found to analyze. Please add sources first.' });
                return;
            }

            const rawTexts = latestContent.map(c => c.raw_content).filter((text): text is string => !!text && text.length > 50);

            if (rawTexts.length === 0) {
                res.status(400).json({ error: 'Scraped content was too short or empty.' });
                return;
            }

            const aiResponse = await aiService.analyzeTrends({ raw_texts: rawTexts });

            const savedTopics = [];
            for (const topicData of aiResponse.topics) {
                const trendScore = topicData.score || 0;
                // A topic is trending if the AI scored it 70 or above
                const isTrending = trendScore >= 70;
                // Use the AI score as both trend_score and confidence_score (they're the same signal)
                const topicInsert = new Topic({
                    user_id: userId,
                    title: topicData.topic,
                    description: topicData.description,
                    keywords: topicData.keywords || [],
                    trend_score: trendScore,
                    confidence_score: trendScore,
                    is_trending: isTrending,
                });
                await topicInsert.save();
                const doc = topicInsert.toJSON(); doc.id = doc._id; delete doc._id;
                savedTopics.push(doc);
            }

            logger.info('Trend research completed successfully', {
                userId,
                topicsFound: savedTopics.length,
                tokensUsed: aiResponse.tokens_consumed
            });

            res.json({
                success: true,
                topics: savedTopics,
                meta: {
                    tokens: aiResponse.tokens_consumed,
                    processing_ms: aiResponse.processing_time_ms
                }
            });

        } catch (error: any) {
            logger.error('Error triggering trend research', { error: error.message });
            res.status(500).json({ error: 'Failed to conduct trend research via AI' });
        }
    }
};
