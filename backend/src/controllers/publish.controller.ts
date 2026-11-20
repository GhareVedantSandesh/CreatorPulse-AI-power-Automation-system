import { Request, Response } from 'express';
import { linkedinService } from '../services/linkedin.service';
import { PlatformConnection, PublishedPost, Draft } from '../models';
import { logger } from '../utils/logger';
import { PublishContentInput } from '../middleware/validate.middleware';

export const publishController = {
    async publishNow(req: Request, res: Response): Promise<void> {
        const payload = req.body as PublishContentInput;
        const { content, media_base64, media_title } = payload;
        const userId = req.user!.id;

        try {
            logger.info('Publishing to LinkedIn', { userId });
            const accessToken = await linkedinService.getValidToken(userId);

            const connection = await PlatformConnection.findOne({
                user_id: userId,
                platform: 'linkedin',
                is_active: true
            });

            if (!connection?.platform_user_id) {
                res.status(400).json({
                    error: 'LinkedIn profile ID not found. Please reconnect your account.',
                });
                return;
            }

            let documentUrn: string | undefined;

            if (media_base64) {
                logger.info('Uploading media document to LinkedIn', { userId });
                const base64Data = media_base64.replace(/^data:.*?;base64,/, '');
                const pdfBuffer = Buffer.from(base64Data, 'base64');
                documentUrn = await linkedinService.uploadDocument(
                    accessToken,
                    connection.platform_user_id,
                    pdfBuffer
                );
            }

            const result = await linkedinService.createPost(
                accessToken,
                connection.platform_user_id,
                content,
                documentUrn,
                media_title || undefined
            );

            const pubPost = new PublishedPost({
                user_id: userId,
                platform: 'linkedin',
                platform_post_id: result.id,
                content,
                published_at: new Date(),
                status: 'published'
            });
            await pubPost.save();

            if (req.body.draft_id) {
                await Draft.updateOne(
                    { _id: req.body.draft_id, user_id: userId },
                    { 
                        $set: { 
                            status: 'published', 
                            upstream_id: result.id, 
                            upstream_status: 'live' 
                        } 
                    }
                );
            }

            logger.info('Post published to LinkedIn', {
                userId,
                postId: result.id,
                contentLength: content.length,
            });

            res.json({
                success: true,
                data: {
                    post_id: result.id,
                    platform: 'linkedin',
                    published_at: new Date().toISOString(),
                },
            });
        } catch (err: any) {
            logger.error('Publish failed', {
                error: err.message,
                userId,
            });

            if (err.message.includes('not connected') || err.message.includes('reconnect')) {
                res.status(401).json({ error: err.message });
                return;
            }
            if (err.message.includes('rate limit')) {
                res.status(429).json({ error: err.message });
                return;
            }

            res.status(500).json({
                error: `Publish failed: ${err.message}`,
                details: err.message,
            });
        }
    },
};
