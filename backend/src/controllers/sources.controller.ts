import { Request, Response } from 'express';
import { Source } from '../models';
import { logger } from '../utils/logger';

export const sourcesController = {
    async getAll(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const sources = await Source.find({ user_id: userId }).sort({ created_at: -1 });
            res.json(sources.map(s => { const doc = s.toJSON(); doc.id = doc._id; delete doc._id; return doc; }));
        } catch (error: any) {
            logger.error('Error fetching sources', { error: error.message });
            res.status(500).json({ error: 'Failed to fetch sources' });
        }
    },

    async create(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { source_type, source_name, source_url, source_config } = req.body;

            const source = new Source({
                user_id: userId,
                source_type,
                source_name,
                source_url,
                source_config,
                is_active: true,
                sync_status: 'pending'
            });
            await source.save();
            const doc = source.toJSON(); doc.id = doc._id; delete doc._id;
            res.status(201).json(doc);
        } catch (error: any) {
            logger.error('Error creating source', { error: error.message });
            res.status(500).json({ error: 'Failed to create source' });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const { is_active } = req.body;

            if (is_active === undefined) {
                res.status(400).json({ error: "Missing is_active field" });
                return;
            }

            const source = await Source.findOneAndUpdate(
                { _id: id, user_id: userId },
                { $set: { is_active } },
                { new: true }
            );

            if (!source) {
                res.status(404).json({ error: 'Source not found or unauthorized' });
                return;
            }

            const doc = source.toJSON(); doc.id = doc._id; delete doc._id;
            res.json(doc);
        } catch (error: any) {
            logger.error('Error updating source', { error: error.message });
            res.status(500).json({ error: 'Failed to update source' });
        }
    },

    async delete(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;

            const result = await Source.findOneAndDelete({ _id: id, user_id: userId });

            if (!result) {
                res.status(404).json({ error: 'Source not found or unauthorized' });
                return;
            }

            res.json({ message: 'Source deleted successfully' });
        } catch (error: any) {
            logger.error('Error deleting source', { error: error.message });
            res.status(500).json({ error: 'Failed to delete source' });
        }
    }
};
