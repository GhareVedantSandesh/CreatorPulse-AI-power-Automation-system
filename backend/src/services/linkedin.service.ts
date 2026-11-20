import axios from 'axios';
import { env } from '../config/env';
import { encrypt, decrypt } from '../utils/encrypt';
import { PlatformConnection } from '../models';
import { logger } from '../utils/logger';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const LINKEDIN_UGC_URL = 'https://api.linkedin.com/v2/ugcPosts';

const SCOPES = ['openid', 'profile', 'email', 'w_member_social'];

export const linkedinService = {
    getAuthUrl(state: string): string {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: env.LINKEDIN_CLIENT_ID || '',
            redirect_uri: env.LINKEDIN_REDIRECT_URI || 'http://localhost:4000/api/linkedin/callback',
            state,
            scope: SCOPES.join(' '),
        });
        return `${LINKEDIN_AUTH_URL}?${params}`;
    },

    async exchangeCode(code: string): Promise<{
        access_token: string;
        refresh_token?: string;
        expires_in: number;
    }> {
        const response = await axios.post(LINKEDIN_TOKEN_URL, null, {
            params: {
                grant_type: 'authorization_code',
                code,
                client_id: env.LINKEDIN_CLIENT_ID || '',
                client_secret: env.LINKEDIN_CLIENT_SECRET || '',
                redirect_uri: env.LINKEDIN_REDIRECT_URI || 'http://localhost:4000/api/linkedin/callback',
            },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        return response.data;
    },

    async refreshToken(encryptedRefreshToken: string): Promise<{
        access_token: string;
        refresh_token?: string;
        expires_in: number;
    }> {
        const refreshToken = decrypt(encryptedRefreshToken);
        const response = await axios.post(LINKEDIN_TOKEN_URL, null, {
            params: {
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: env.LINKEDIN_CLIENT_ID || '',
                client_secret: env.LINKEDIN_CLIENT_SECRET || '',
            },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        return response.data;
    },

    async getProfile(accessToken: string): Promise<{
        sub: string;
        name: string;
        email: string;
        picture?: string;
    }> {
        const response = await axios.get(LINKEDIN_USERINFO_URL, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return response.data;
    },

    async storeTokens(
        userId: string,
        profile: { sub: string; name: string; email: string },
        tokens: { access_token: string; refresh_token?: string; expires_in: number }
    ): Promise<void> {
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        try {
            await PlatformConnection.findOneAndUpdate(
                { user_id: userId, platform: 'linkedin' },
                {
                    $set: {
                        platform_user_id: profile.sub,
                        platform_username: profile.name,
                        access_token: encrypt(tokens.access_token),
                        refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
                        token_expires_at: expiresAt,
                        is_active: true,
                        last_sync_at: new Date(),
                        platform_data: { email: profile.email }
                    }
                },
                { upsert: true }
            );
        } catch (error) {
            logger.error('Failed to store LinkedIn tokens', { error });
            throw new Error('Failed to store tokens');
        }
    },

    async getValidToken(userId: string): Promise<string> {
        const connection = await PlatformConnection.findOne({
            user_id: userId,
            platform: 'linkedin',
            is_active: true
        });

        if (!connection) {
            throw new Error('LinkedIn not connected. Please connect your account in Settings.');
        }

        const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : new Date(0);
        const bufferTime = new Date(Date.now() + 5 * 60 * 1000);

        if (bufferTime < expiresAt) {
            return decrypt(connection.access_token!);
        }

        if (!connection.refresh_token) {
            throw new Error('LinkedIn token expired and no refresh token available. Please reconnect.');
        }

        logger.info('Refreshing expired LinkedIn token', { userId });

        try {
            const newTokens = await this.refreshToken(connection.refresh_token);

            await PlatformConnection.updateOne(
                { user_id: userId, platform: 'linkedin' },
                {
                    $set: {
                        access_token: encrypt(newTokens.access_token),
                        refresh_token: newTokens.refresh_token ? encrypt(newTokens.refresh_token) : connection.refresh_token,
                        token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000),
                        last_sync_at: new Date()
                    }
                }
            );

            return newTokens.access_token;
        } catch (refreshError: any) {
            logger.error('Token refresh failed', { error: refreshError.message });
            await PlatformConnection.updateOne(
                { user_id: userId, platform: 'linkedin' },
                { $set: { is_active: false } }
            );

            throw new Error('LinkedIn token expired and refresh failed. Please reconnect.');
        }
    },

    async uploadDocument(
        accessToken: string,
        authorUrn: string,
        pdfBuffer: Buffer
    ): Promise<string> {
        try {
            // 1. Initialize Upload using Versioned API
            const registerRes = await axios.post(
                'https://api.linkedin.com/rest/documents?action=initializeUpload',
                {
                    initializeUploadRequest: {
                        owner: `urn:li:person:${authorUrn}`
                    }
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'LinkedIn-Version': '202601',
                        'X-Restli-Protocol-Version': '2.0.0',
                    }
                }
            );

            const uploadUrl = registerRes.data.value.uploadUrl;
            const assetUrn = registerRes.data.value.document;

            // 2. Upload binary
            await axios.put(uploadUrl, pdfBuffer, {
                headers: {
                    'Content-Type': 'application/octet-stream'
                }
            });

            return assetUrn;
        } catch (error: any) {
            const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            logger.error('LinkedIn Document Upload error', { error: errorDetails });
            throw new Error(`LinkedIn Document Upload failed: ${errorDetails}`);
        }
    },

    async createPost(
        accessToken: string,
        authorUrn: string,
        content: string,
        documentUrn?: string,
        title?: string
    ): Promise<{ id: string }> {
        try {
            // Use the new Versioned API (/rest/posts)
            const postPayload: any = {
                author: `urn:li:person:${authorUrn}`,
                commentary: content,
                visibility: 'PUBLIC',
                distribution: {
                    feedDistribution: 'MAIN_FEED',
                    targetEntities: [],
                    thirdPartyDistributionChannels: []
                },
                lifecycleState: 'PUBLISHED',
                isReshareDisabledByAuthor: false
            };

            if (documentUrn) {
                postPayload.content = {
                    media: {
                        title: title || 'LinkedIn Carousel',
                        id: documentUrn
                    }
                };
            }

            const response = await axios.post(
                'https://api.linkedin.com/rest/posts',
                postPayload,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'LinkedIn-Version': '202601',
                        'X-Restli-Protocol-Version': '2.0.0',
                    },
                }
            );

            return { id: response.headers['x-restli-id'] || response.data?.id };
        } catch (error: any) {
            const status = error.response?.status;
            const message = error.response?.data?.message || error.message;

            if (status === 429) {
                throw new Error('LinkedIn rate limit exceeded. Try again later.');
            }
            if (status === 401) {
                throw new Error('LinkedIn token expired. Please reconnect your account.');
            }

            logger.error('LinkedIn API error', { status, message });
            throw new Error(`LinkedIn post failed: ${message}`);
        }
    },

    async getPostMetrics(accessToken: string, urn: string): Promise<{ likes: number; comments: number }> {
        let scrapedLikes = 0;
        let scrapedComments = 0;

        try {
            const embedRes = await axios.get(`https://www.linkedin.com/embed/feed/update/${encodeURIComponent(urn)}`);
            const html = embedRes.data;

            const likesMatch = html.match(/"numLikes":(\d+)/i) || html.match(/>([\d,]+)\s+Likes?</i) || html.match(/([\d,]+)\s+Reactions?/i);
            const commentsMatch = html.match(/"numComments":(\d+)/i) || html.match(/>([\d,]+)\s+Comments?</i) || html.match(/([\d,]+)\s+Comments?/i);

            if (likesMatch) scrapedLikes = parseInt(likesMatch[1].replace(/,/g, ''), 10) || 0;
            if (commentsMatch) scrapedComments = parseInt(commentsMatch[1].replace(/,/g, ''), 10) || 0;

        } catch (embedError: any) {
            if (embedError.response?.status === 404) {
                logger.info('Post detected as natively deleted via embed check', { urn });
                throw new Error('POST_DELETED');
            }
        }

        try {
            const response = await axios.get(`https://api.linkedin.com/v2/socialActions/${encodeURIComponent(urn)}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0',
                },
            });

            return {
                likes: response.data.likesSummary?.totalLikes || 0,
                comments: response.data.commentsSummary?.totalFirstLevelComments || 0,
            };
        } catch (error: any) {
            const status = error.response?.status;
            if (status === 404) {
                throw new Error('POST_DELETED');
            }
            if (status === 403) {
                logger.info(`Returning scraped metrics for ${urn} due to API 403 restriction`, { scrapedLikes, scrapedComments });
                return {
                    likes: scrapedLikes,
                    comments: scrapedComments,
                };
            }
            logger.error('Failed to fetch post metrics from LinkedIn', { urn, error: error.message });
            throw error;
        }
    },

    async deletePost(accessToken: string, urn: string): Promise<boolean> {
        try {
            const endpoint = urn.includes('ugcPost') ? 'ugcPosts' : 'shares';
            await axios.delete(`https://api.linkedin.com/v2/${endpoint}/${encodeURIComponent(urn)}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0',
                },
            });
            return true;
        } catch (error: any) {
            const status = error.response?.status;
            if (status === 404) {
                 return true;
            }
            logger.error('Failed to delete LinkedIn post', { urn, message: error.response?.data?.message || error.message });
            throw new Error(`Failed to forcefully delete post: ${error.message}`);
        }
    },
};
