import { Request, Response } from 'express';
import { ScheduledPost } from '../models';
import { logger } from '../utils/logger';
import { SchedulePostInput } from '../middleware/validate.middleware';

export const scheduleController = {
    async create(req: Request, res: Response): Promise<void> {
        const { content, scheduled_at } = req.body as SchedulePostInput;
        const userId = req.user!.id;

        try {
            logger.info('Scheduling post', { userId, scheduledAt: scheduled_at });

            const scheduledPost = new ScheduledPost({
                user_id: userId,
                platform: 'linkedin',
                content,
                scheduled_at: new Date(scheduled_at),
                status: 'pending'
            });
            await scheduledPost.save();

            const doc = scheduledPost.toJSON(); doc.id = doc._id; delete doc._id;

            logger.info('Post scheduled successfully', { userId, postId: doc.id });
            res.status(201).json({ success: true, data: doc });
        } catch (err: any) {
            logger.error('Failed to schedule post', { error: err.message, userId });
            res.status(500).json({ error: 'Failed to schedule post', details: err.message });
        }
    },

    async list(req: Request, res: Response): Promise<void> {
        const userId = req.user!.id;
        const status = req.query.status as string;

        try {
            const query: any = { user_id: userId };
            if (status) query.status = status;

            const posts = await ScheduledPost.find(query).sort({ scheduled_at: 1 });
            const docs = posts.map(p => { const doc = p.toJSON(); doc.id = doc._id; delete doc._id; return doc; });

            res.json({ success: true, count: docs.length, data: docs });
        } catch (err: any) {
            logger.error('Failed to list scheduled posts', { error: err.message, userId });
            res.status(500).json({ error: 'Failed to fetch schedule' });
        }
    },

    async delete(req: Request, res: Response): Promise<void> {
        const userId = req.user!.id;
        const postId = req.params.id;

        if (!postId) {
            res.status(400).json({ error: 'Post ID is required' });
            return;
        }

        try {
            const result = await ScheduledPost.findOneAndDelete({ _id: postId, user_id: userId });

            if (!result) {
                res.status(404).json({ error: 'Scheduled post not found' });
                return;
            }

            logger.info('Scheduled post deleted', { userId, postId });
            res.json({ success: true, message: 'Scheduled post cancelled' });
        } catch (err: any) {
            logger.error('Failed to delete scheduled post', { error: err.message, userId, postId });
            res.status(500).json({ error: 'Failed to delete post' });
        }
    },

    async update(req: Request, res: Response): Promise<void> {
        const userId = req.user!.id;
        const postId = req.params.id;
        const { scheduledFor, status, content } = req.body;

        try {
            const updateData: any = {};
            if (scheduledFor) updateData.scheduled_at = new Date(scheduledFor);
            if (status) updateData.status = status;
            if (content) updateData.content = content;

            if (Object.keys(updateData).length === 0) {
                res.status(400).json({ error: 'No fields to update' });
                return;
            }

            const result = await ScheduledPost.findOneAndUpdate(
                { _id: postId, user_id: userId },
                { $set: updateData },
                { new: true }
            );

            if (!result) {
                res.status(404).json({ error: 'Scheduled post not found' });
                return;
            }

            const doc = result.toJSON(); doc.id = doc._id; delete doc._id;
            res.json({ success: true, data: doc });
        } catch (err: any) {
            logger.error('Failed to update scheduled post', { error: err.message, userId, postId });
            res.status(500).json({ error: 'Failed to update post' });
        }
    },
};
