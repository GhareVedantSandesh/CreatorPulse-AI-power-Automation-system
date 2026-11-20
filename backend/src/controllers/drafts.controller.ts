import { Request, Response } from 'express';
import { Draft } from '../models';
import { logger } from '../utils/logger';
import { linkedinService } from '../services/linkedin.service';

export const draftsController = {
    /**
     * GET /api/drafts
     * Fetch all drafts for the authenticated user
     */
    async getAll(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const drafts = await Draft.find({ user_id: userId }).sort({ created_at: -1 });
            
            // Map _id to id for frontend compatibility
            res.json(drafts.map(d => {
                const doc = d.toJSON();
                doc.id = doc._id;
                delete doc._id;
                return doc;
            }));
        } catch (error: any) {
            logger.error('Error fetching drafts', { error: error.message });
            res.status(500).json({ error: 'Failed to fetch drafts' });
        }
    },

    /**
     * POST /api/drafts
     * Create a new draft
     */
    async create(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { platform, content_type, title, content, metadata, status } = req.body;

            const draft = new Draft({
                user_id: userId,
                platform,
                content_type,
                title,
                content,
                metadata,
                status: status || 'draft'
            });
            await draft.save();

            const doc = draft.toJSON();
            doc.id = doc._id;
            delete doc._id;

            res.status(201).json(doc);
        } catch (error: any) {
            logger.error('Error creating draft', { error: error.message });
            res.status(500).json({ error: 'Failed to create draft' });
        }
    },

    /**
     * PUT /api/drafts/:id
     * Update an existing draft
     */
    async update(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;
            const { title, content, status, metadata } = req.body;

            const updateData: any = {};
            if (title !== undefined) updateData.title = title;
            if (content !== undefined) updateData.content = content;
            if (status !== undefined) updateData.status = status;
            if (metadata !== undefined) updateData.metadata = metadata;

            if (Object.keys(updateData).length === 0) {
                res.status(400).json({ error: 'No fields to update' });
                return;
            }

            const draft = await Draft.findOneAndUpdate(
                { _id: id, user_id: userId },
                { $set: updateData },
                { new: true }
            );

            if (!draft) {
                res.status(404).json({ error: 'Draft not found or unauthorized' });
                return;
            }

            const doc = draft.toJSON();
            doc.id = doc._id;
            delete doc._id;

            res.json(doc);
        } catch (error: any) {
            logger.error('Error updating draft', { error: error.message });
            res.status(500).json({ error: 'Failed to update draft' });
        }
    },

    /**
     * DELETE /api/drafts/:id
     * Delete a draft
     */
    async delete(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;

            const draft = await Draft.findOne({ _id: id, user_id: userId });

            if (!draft) {
                res.status(404).json({ error: 'Draft not found or unauthorized' });
                return;
            }

            // If it's published to LinkedIn, delete it natively first
            if (draft.upstream_id) {
                try {
                    const token = await linkedinService.getValidToken(userId);
                    await linkedinService.deletePost(token, draft.upstream_id);
                    logger.info('Successfully deleted post natively from LinkedIn', { upstream_id: draft.upstream_id });
                } catch (linkedinErr: any) {
                    logger.error('Failed to natively delete post from LinkedIn', { error: linkedinErr.message, upstream_id: draft.upstream_id });
                    res.status(500).json({ error: 'Failed to delete the post natively on LinkedIn. The local draft was kept.' });
                    return;
                }
            }

            await Draft.deleteOne({ _id: id, user_id: userId });

            res.json({ message: 'Post permanently deleted from local drafts and LinkedIn' });
        } catch (error: any) {
            logger.error('Error deleting draft', { error: error.message });
            res.status(500).json({ error: 'Failed to delete draft' });
        }
    }
};
