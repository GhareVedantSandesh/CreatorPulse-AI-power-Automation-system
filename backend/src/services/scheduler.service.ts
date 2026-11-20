import cron from 'node-cron';
import { ScheduledPost, DeliverySchedule, PlatformConnection } from '../models';
import { linkedinService } from './linkedin.service';
import { logger } from '../utils/logger';

export const schedulerService = {
    init() {
        logger.info('Starting Cron Scheduler: * * * * *');
        cron.schedule('* * * * *', async () => {
            logger.info('Scheduler tick: Checking for due posts...');
            await this.processDuePosts();
        });
    },

    async processDuePosts() {
        try {
            const duePosts = await ScheduledPost.find({
                status: 'pending',
                scheduled_at: { $lte: new Date() }
            }).limit(10);

            if (duePosts.length === 0) {
                return;
            }

            logger.info(`Found ${duePosts.length} posts due for publishing.`);

            for (const post of duePosts) {
                await this.publishPost(post);
            }

        } catch (err: any) {
            logger.error('Unexpected error in scheduler tick', { error: err.message });
        }
    },

    async publishPost(post: any) {
        logger.info(`Processing scheduled post ${post._id} for user ${post.user_id}`);

        try {
            const accessToken = await linkedinService.getValidToken(post.user_id);

            const connection = await PlatformConnection.findOne({
                user_id: post.user_id,
                platform: 'linkedin',
                is_active: true
            });

            if (!connection?.platform_user_id) {
                throw new Error('LinkedIn not connected or inactive');
            }

            const result = await linkedinService.createPost(
                accessToken,
                connection.platform_user_id,
                post.content
            );

            await ScheduledPost.updateOne(
                { _id: post._id },
                { $set: { status: 'published' } }
            );

            await DeliverySchedule.create({
                user_id: post.user_id,
                status: 'sent',
                content_id: post._id,
                sent_at: new Date()
            });

            logger.info(`Scheduled post ${post._id} published successfully`);

        } catch (err: any) {
            logger.error(`Failed to publish scheduled post ${post._id}`, { error: err.message });

            await ScheduledPost.updateOne(
                { _id: post._id },
                { $set: { status: 'failed', error_message: err.message } }
            );

            await DeliverySchedule.create({
                user_id: post.user_id,
                status: 'failed',
                content_id: post._id,
                error_message: err.message
            });
        }
    }
};
