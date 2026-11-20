import cron from 'node-cron';
import { Draft } from '../models';
import { logger } from '../utils/logger';
import { linkedinService } from './linkedin.service';

export const analyticsWorker = {
    init() {
        logger.info('🕒 Initializing Analytics Worker: Polling LinkedIn every hour');
        
        cron.schedule('0 * * * *', async () => {
             logger.info('🔄 Running hourly Analytics Sync Worker');
             await this.syncAllActivePosts();
        });
    },

    async syncAllActivePosts() {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const recentDrafts = await Draft.find({
                status: 'published',
                upstream_status: 'live',
                upstream_id: { $ne: null },
                updated_at: { $gte: sevenDaysAgo }
            });

            if (recentDrafts.length === 0) {
                logger.info('Analytics Worker: No recent active posts to sync');
                return;
            }

            logger.info(`Analytics Worker: Found ${recentDrafts.length} posts to sync`);

            for (const draft of recentDrafts) {
                try {
                    const accessToken = await linkedinService.getValidToken(draft.user_id.toString());
                    
                    const metrics = await linkedinService.getPostMetrics(accessToken, draft.upstream_id!);
                    
                    const rawMetrics = {
                        likes: metrics.likes,
                        comments: metrics.comments,
                        shares: 0,
                        views: 0
                    };

                    await Draft.updateOne(
                        { _id: draft._id },
                        { $set: { metrics: rawMetrics } }
                    );

                    logger.info(`Analytics Worker: Successfully synced draft ${draft._id}`);

                } catch (err: any) {
                    if (err.message === 'POST_DELETED') {
                        logger.info(`Analytics Worker: Draft ${draft._id} was natively deleted on LinkedIn. Updating status.`);
                        await Draft.updateOne(
                            { _id: draft._id },
                            { $set: { upstream_status: 'deleted' } }
                        );
                    } else {
                        logger.error(`Analytics Worker: Failed to sync draft ${draft._id}`, { error: err.message });
                    }
                }
                
                await new Promise(res => setTimeout(res, 500));
            }

        } catch (error: any) {
            logger.error('Analytics Worker System Failure', { error: error.message });
        }
    }
};
