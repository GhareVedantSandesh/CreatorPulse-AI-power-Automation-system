import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export async function connectDB() {
    try {
        const mongoUri = env.DATABASE_URL;

        if (!mongoUri.startsWith('mongodb')) {
            throw new Error(`DATABASE_URL must be a MongoDB URI. Current: ${mongoUri}`);
        }

        await mongoose.connect(mongoUri);

        logger.info('✅ Successfully connected to MongoDB database');
    } catch (error: any) {
        logger.error('❌ Failed to connect to MongoDB database', { error: error.message });
        process.exit(1);
    }
}
