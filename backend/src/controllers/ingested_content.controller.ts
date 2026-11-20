import { Request, Response } from 'express';
import { IngestedContent } from '../models';
import { logger } from '../utils/logger';

export const ingestedContentController = {
    async listContent(req: Request, res: Response) {
        try {
            const userId = req.user!.id;

            const contents = await IngestedContent.find({ user_id: userId })
                .sort({ created_at: -1 })
                .populate('source_id', 'source_name source_type');

            const data = contents.map(c => {
                const doc: any = c.toJSON();
                doc.id = doc._id;
                delete doc._id;
                
                doc.sources = {
                    source_name: (doc.source_id as any)?.source_name,
                    source_type: (doc.source_id as any)?.source_type
                };
                doc.source_id = (doc.source_id as any)?._id;

                return doc;
            });

            res.json(data);
        } catch (error: any) {
            logger.error('Error listing ingested content', { error: error.message });
            res.status(500).json({ error: 'Failed to list content' });
        }
    },

    async getContent(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;

            const content = await IngestedContent.findOne({ _id: id, user_id: userId })
                .populate('source_id', 'source_name source_type');

            if (!content) {
                res.status(404).json({ error: 'Content not found' });
                return;
            }

            const doc: any = content.toJSON();
            doc.id = doc._id;
            delete doc._id;

            doc.sources = {
                source_name: (doc.source_id as any)?.source_name,
                source_type: (doc.source_id as any)?.source_type
            };
            doc.source_id = (doc.source_id as any)?._id;

            res.json(doc);
        } catch (error: any) {
            logger.error('Error fetching content', { error: error.message });
            res.status(500).json({ error: 'Failed to fetch content' });
        }
    }
};
