import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../utils/logger';

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

export const carouselQueue = new Queue('carousel_generation', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

redisConnection.on('error', (err) => {
    logger.error('Redis connection error', { error: err.message });
});

redisConnection.on('connect', () => {
    logger.info('Connected to Redis for Carousel Queue');
});
