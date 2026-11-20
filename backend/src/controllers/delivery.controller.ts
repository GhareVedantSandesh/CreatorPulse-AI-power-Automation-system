import { Request, Response } from 'express';
import { DeliveryPreference, DeliverySchedule } from '../models';
import { logger } from '../utils/logger';

export const deliveryController = {
    async getSettings(req: Request, res: Response) {
        try {
            const userId = req.user!.id;

            const pref = await DeliveryPreference.findOne({ user_id: userId });

            if (!pref) {
                return res.json({
                    delivery_time: '09:00',
                    frequency: 'daily',
                    channels: ['email'],
                    timezone: 'UTC'
                });
            }

            const doc = pref.toJSON(); doc.id = doc._id; delete doc._id;
            res.json(doc);
        } catch (error: any) {
            logger.error('Error fetching delivery settings', { error: error.message });
            res.status(500).json({ error: 'Failed to fetch settings' });
        }
    },

    async updateSettings(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { delivery_time, frequency, channels, timezone } = req.body;

            const pref = await DeliveryPreference.findOneAndUpdate(
                { user_id: userId },
                {
                    $set: {
                        delivery_time: delivery_time || '09:00',
                        frequency: frequency || 'daily',
                        channels: channels || ['email'],
                        timezone: timezone || 'UTC'
                    }
                },
                { new: true, upsert: true }
            );

            const doc = pref.toJSON(); doc.id = doc._id; delete doc._id;
            res.json(doc);
        } catch (error: any) {
            logger.error('Error updating delivery settings', { error: error.message });
            res.status(500).json({ error: 'Failed to update settings' });
        }
    },

    async getDeliveryStatus(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const schedules = await DeliverySchedule.find({ user_id: userId })
                .sort({ created_at: -1 })
                .limit(5);

            res.json(schedules.map((s: any) => { const doc = s.toJSON(); doc.id = doc._id; delete doc._id; return doc; }));
        } catch (error: any) {
            logger.error('Error fetching delivery status', { error: error.message });
            res.status(500).json({ error: 'Failed to fetch status' });
        }
    }
};
