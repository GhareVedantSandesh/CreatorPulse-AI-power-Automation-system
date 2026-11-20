import { Request, Response } from 'express';
import crypto from 'crypto';
import { linkedinService } from '../services/linkedin.service';
import { PlatformConnection, Draft } from '../models';
import { logger } from '../utils/logger';

const oauthStates = new Map<string, { userId: string; expiresAt: number }>();

setInterval(() => {
    const now = Date.now();
    for (const [state, data] of oauthStates.entries()) {
        if (data.expiresAt < now) {
            oauthStates.delete(state);
        }
    }
}, 5 * 60 * 1000);

export const linkedinController = {
    async getAuthUrl(req: Request, res: Response): Promise<void> {
        try {
            const state = crypto.randomBytes(32).toString('hex');

            oauthStates.set(state, {
                userId: req.user!.id,
                expiresAt: Date.now() + 10 * 60 * 1000,
            });

            const url = linkedinService.getAuthUrl(state);

            logger.info('LinkedIn OAuth URL generated', { userId: req.user!.id });
            res.json({ url });
        } catch (err: any) {
            logger.error('Failed to generate auth URL', { error: err.message });
            res.status(500).json({ error: 'Failed to generate authorization URL' });
        }
    },

    async callback(req: Request, res: Response): Promise<void> {
        const { code, state, error: oauthError } = req.query;

        if (oauthError) {
            logger.warn('LinkedIn OAuth error', { error: oauthError });
            res.redirect('http://localhost:8111/settings?linkedin=error');
            return;
        }

        if (!code || !state) {
            logger.warn('LinkedIn callback missing code or state');
            res.redirect('http://localhost:8111/settings?linkedin=error');
            return;
        }

        const storedState = oauthStates.get(state as string);
        if (!storedState || storedState.expiresAt < Date.now()) {
            oauthStates.delete(state as string);
            logger.warn('LinkedIn callback invalid or expired state');
            res.redirect('http://localhost:8111/settings?linkedin=invalid_state');
            return;
        }

        const userId = storedState.userId;
        oauthStates.delete(state as string);

        try {
            logger.info('Exchanging LinkedIn auth code', { userId });
            const tokens = await linkedinService.exchangeCode(code as string);

            const profile = await linkedinService.getProfile(tokens.access_token);
            logger.info('LinkedIn profile fetched', {
                userId,
                linkedinName: profile.name,
            });

            await linkedinService.storeTokens(userId, profile, tokens);

            logger.info('LinkedIn connected successfully', {
                userId,
                linkedinUser: profile.name,
                linkedinId: profile.sub,
            });

            res.redirect('http://localhost:8111/settings?linkedin=success');
        } catch (err: any) {
            logger.error('LinkedIn OAuth callback failed', {
                error: err.message,
                userId,
            });
            res.redirect('http://localhost:8111/settings?linkedin=error');
        }
    },

    async getStatus(req: Request, res: Response): Promise<void> {
        try {
            const connection = await PlatformConnection.findOne({
                user_id: req.user!.id,
                platform: 'linkedin'
            });

            if (!connection) {
                res.json({ connected: false });
                return;
            }

            const tokenExpires = connection.token_expires_at ? new Date(connection.token_expires_at) : new Date(0);
            const isTokenValid = tokenExpires > new Date();

            res.json({
                connected: connection.is_active,
                username: connection.platform_username,
                linkedinId: connection.platform_user_id,
                lastSync: connection.last_sync_at,
                tokenExpires: connection.token_expires_at,
                tokenValid: isTokenValid,
            });
        } catch (err: any) {
            logger.error('Failed to get LinkedIn status', { error: err.message });
            res.status(500).json({ error: 'Failed to check LinkedIn status' });
        }
    },

    async disconnect(req: Request, res: Response): Promise<void> {
        try {
            await PlatformConnection.updateOne(
                { user_id: req.user!.id, platform: 'linkedin' },
                { $set: { is_active: false, access_token: null, refresh_token: null } }
            );

            logger.info('LinkedIn disconnected', { userId: req.user!.id });
            res.json({ disconnected: true });
        } catch (err: any) {
            logger.error('LinkedIn disconnect error', { error: err.message });
            res.status(500).json({ error: 'Failed to disconnect LinkedIn' });
        }
    },

    /**
     * POST /api/linkedin/post-carousel
     * Accepts a base64-encoded PDF of carousel slides, uploads to LinkedIn
     * as a Document post, and marks the associated draft as 'published'.
     *
     * Body: { pdf_base64: string, caption: string, draft_id: string, title: string }
     */
    async postCarousel(req: Request, res: Response): Promise<void> {
        const userId = req.user!.id;
        const { pdf_base64, caption, draft_id, title } = req.body;

        if (!pdf_base64) {
            res.status(400).json({ error: 'pdf_base64 is required' });
            return;
        }
        if (!caption || caption.trim().length === 0) {
            res.status(400).json({ error: 'caption is required' });
            return;
        }

        try {
            // 1. Get valid LinkedIn token (auto-refreshes if needed)
            const accessToken = await linkedinService.getValidToken(userId);

            // 2. Look up the LinkedIn person URN
            const connection = await PlatformConnection.findOne({
                user_id: userId,
                platform: 'linkedin',
                is_active: true,
            });
            if (!connection?.platform_user_id) {
                res.status(400).json({ error: 'LinkedIn not connected. Please connect in Settings.' });
                return;
            }
            const authorUrn = connection.platform_user_id;

            // 3. Decode base64 → Buffer
            const pdfBuffer = Buffer.from(pdf_base64, 'base64');
            logger.info('Uploading carousel PDF to LinkedIn', {
                userId, bytes: pdfBuffer.length, title,
            });

            // 4. Upload document → get asset URN
            const assetUrn = await linkedinService.uploadDocument(accessToken, authorUrn, pdfBuffer);

            // 5. Create the LinkedIn document post
            const post = await linkedinService.createPost(
                accessToken,
                authorUrn,
                caption.trim(),
                assetUrn,
                title || 'LinkedIn Carousel'
            );

            logger.info('Carousel posted to LinkedIn', { userId, postId: post.id, assetUrn });

            // 6. Mark draft as published (if draft_id provided)
            if (draft_id) {
                await Draft.findOneAndUpdate(
                    { _id: draft_id, user_id: userId },
                    {
                        $set: {
                            status: 'published',
                            linkedin_post_id: post.id,
                            published_at: new Date(),
                        },
                    }
                );
            }

            res.json({
                success: true,
                post_id: post.id,
                message: 'Carousel posted to LinkedIn successfully',
            });

        } catch (err: any) {
            logger.error('Carousel LinkedIn publish failed', { userId, error: err.message });
            const status = err.message?.includes('not connected') ? 400 : 500;
            res.status(status).json({ error: err.message || 'Failed to post carousel to LinkedIn' });
        }
    },
};
