import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import { env } from '../config/env';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
    try {
        if (mongoose.connection.readyState === 1) {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'creatorpulse-backend',
                database: 'connected',
                uptime: Math.floor(process.uptime()),
            });
        } else {
            throw new Error('Disconnected');
        }
    } catch {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            service: 'creatorpulse-backend',
            database: 'disconnected',
        });
    }
});

router.get('/api/ai-status', async (_req: Request, res: Response) => {
    try {
        const aiUrl = env.AI_SERVICE_URL || 'http://localhost:8000';
        const response = await axios.get(`${aiUrl}/health`, { timeout: 5000 });
        res.json({ status: 'ok', ...response.data });
    } catch (err: any) {
        const detail = err.code === 'ECONNREFUSED'
            ? 'AI service is not running (start_service.bat)'
            : err.message;
        res.status(503).json({ status: 'unreachable', detail });
    }
});

export default router;
