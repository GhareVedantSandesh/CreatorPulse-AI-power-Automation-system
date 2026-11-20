import { Request, Response } from 'express';
import { CreatorProfile, ContentSample } from '../models/Profile';
import { DeliveryPreference } from '../models';
import { logger } from '../utils/logger';

export const profileController = {
    /**
     * GET /api/profile
     * Fetch user profile
     */
    async getProfile(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const profile = await CreatorProfile.findOne({ user_id: userId });

            if (!profile) {
                res.json({});
                return;
            }

            res.json(profile);
        } catch (error: any) {
            logger.error('Error fetching profile', { error: error.message });
            res.status(500).json({ error: 'Failed to fetch profile' });
        }
    },

    /**
     * PUT /api/profile
     * Update user profile
     */
    async updateProfile(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { full_name, email, industry, creator_type, platforms, timezone } = req.body;

            const updateData: any = {};
            if (full_name !== undefined) updateData.full_name = full_name;
            if (email !== undefined) updateData.email = email;
            if (industry !== undefined) updateData.industry = industry;
            if (creator_type !== undefined) updateData.creator_type = creator_type;
            if (platforms !== undefined) updateData.platforms = platforms;
            if (timezone !== undefined) updateData.timezone = timezone;

            const profile = await CreatorProfile.findOneAndUpdate(
                { user_id: userId },
                { $set: updateData },
                { new: true, upsert: true }
            );

            res.json(profile);
        } catch (error: any) {
            logger.error('Error updating profile', { error: error.message });
            res.status(500).json({ error: 'Failed to update profile' });
        }
    },

    /**
     * POST /api/profile/onboarding
     * Complete onboarding process
     */
    async completeOnboarding(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { profileData, contentSamples, deliveryPrefs } = req.body;

            // 1. Update Profile
            await CreatorProfile.findOneAndUpdate(
                { user_id: userId },
                { 
                    $set: {
                        industry: profileData.industry,
                        creator_type: profileData.creatorType,
                        platforms: profileData.platforms,
                        timezone: deliveryPrefs.timezone,
                        onboarding_completed: true
                    }
                },
                { upsert: true }
            );

            // 2. Insert Content Samples
            if (contentSamples && contentSamples.length > 0) {
                const samples = contentSamples.map((sample: any) => ({
                    user_id: userId,
                    platform: sample.platform,
                    content: sample.content,
                    engagement_metrics: sample.engagementMetrics || {}
                }));
                await ContentSample.insertMany(samples);
            }

            // 3. Upsert Delivery Preferences
            await DeliveryPreference.findOneAndUpdate(
                { user_id: userId },
                {
                    $set: {
                        delivery_time: deliveryPrefs.deliveryTime,
                        frequency: deliveryPrefs.frequency,
                        channels: deliveryPrefs.channels,
                        timezone: deliveryPrefs.timezone
                    }
                },
                { upsert: true }
            );

            res.json({ success: true, message: 'Onboarding completed' });

        } catch (error: any) {
            logger.error('Error completing onboarding', { error: error.message });
            res.status(500).json({ error: 'Failed to complete onboarding' });
        }
    },

    /**
     * GET /api/profile/brand-kit
     * Return the current user's brand kit settings.
     */
    async getBrandKit(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const profile = await CreatorProfile.findOne({ user_id: userId }, 'brand_kit');
            res.json(profile?.brand_kit ?? null);
        } catch (error: any) {
            logger.error('Error fetching brand kit', { error: error.message });
            res.status(500).json({ error: 'Failed to fetch brand kit' });
        }
    },

    /**
     * PUT /api/profile/brand-kit
     * Upsert the brand kit. Accepts partial updates.
     * Body: { primary_color?, accent_color?, font_family?, logo_url?, default_cta_text? }
     */
    async updateBrandKit(req: Request, res: Response) {
        try {
            const userId = req.user!.id;
            const { primary_color, accent_color, font_family, logo_url, default_cta_text } = req.body;

            const brandKitUpdate: Record<string, any> = {};
            if (primary_color !== undefined) brandKitUpdate['brand_kit.primary_color'] = primary_color;
            if (accent_color !== undefined) brandKitUpdate['brand_kit.accent_color'] = accent_color;
            if (font_family !== undefined) brandKitUpdate['brand_kit.font_family'] = font_family;
            if (logo_url !== undefined) brandKitUpdate['brand_kit.logo_url'] = logo_url;
            if (default_cta_text !== undefined) brandKitUpdate['brand_kit.default_cta_text'] = default_cta_text;

            const profile = await CreatorProfile.findOneAndUpdate(
                { user_id: userId },
                { $set: brandKitUpdate },
                { new: true, upsert: true }
            );

            logger.info('Brand kit updated', { userId });
            res.json(profile?.brand_kit ?? null);
        } catch (error: any) {
            logger.error('Error updating brand kit', { error: error.message });
            res.status(500).json({ error: 'Failed to update brand kit' });
        }
    },
};
