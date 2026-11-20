import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

interface GenerateRequest {
    trend: {
        topic: string;
        description: string;
        source_url?: string;
        keywords?: string[];
    };
    voice_samples: string[];
    hook_text?: string;
    content_type: 'linkedin_short' | 'linkedin_long';
    platform: string;
}

export interface AnalyzeTrendsRequest {
    raw_texts: string[];
}

export interface TopicResult {
    topic: string;
    description: string;
    keywords: string[];
    score: number;
}

export interface AnalyzeTrendsResponse {
    topics: TopicResult[];
    tokens_consumed: number;
    processing_time_ms: number;
}

export interface GenerateHooksRequest {
    trend: {
        topic: string;
        description: string;
        source_url?: string;
        keywords?: string[];
    };
    angle?: string;
    voice_samples: string[];
}

export interface HookResult {
    hook: string;
    reasoning: string;
}

export interface GenerateHooksResponse {
    hooks: HookResult[];
    tokens_consumed: number;
    processing_time_ms: number;
}

interface GenerateResponse {
    content: string;
    hook: string;
    hashtags: string[];
    engagement_prediction: {
        estimated_likes: number;
        estimated_comments: number;
        estimated_shares: number;
        confidence: number;
    };
    ai_model_version: string;
    tokens_consumed: number;
    processing_time_ms: number;
}

/**
 * AI Service HTTP Client
 * 
 * Bridges the backend to the AI microservice.
 * All calls are authenticated via shared API key (X-API-Key header).
 */
export const aiService = {
    async generateContent(request: GenerateRequest): Promise<GenerateResponse> {
        try {
            logger.info('Calling AI service', {
                topic: request.trend.topic,
                contentType: request.content_type,
            });

            const response = await axios.post<GenerateResponse>(
                `${env.AI_SERVICE_URL}/generate`,
                request,
                {
                    headers: {
                        'X-API-Key': env.AI_SERVICE_KEY || '',
                        'Content-Type': 'application/json',
                    },
                    timeout: 60000, // 60s — LLM calls can be slow
                }
            );

            logger.info('AI service responded', {
                contentLength: response.data.content.length,
                tokens: response.data.tokens_consumed,
                processingMs: response.data.processing_time_ms,
            });

            return response.data;
        } catch (error: any) {
            const status = error.response?.status;
            const detail = error.response?.data?.detail || error.message;

            logger.error('AI service call failed', { status, detail });

            if (status === 403) {
                throw new Error('AI service authentication failed. Check AI_SERVICE_KEY.');
            }
            if (status === 422) {
                throw new Error(`Invalid request to AI service: ${detail}`);
            }

            throw new Error(`AI service error: ${detail}`);
        }
    },

    async analyzeTrends(request: AnalyzeTrendsRequest): Promise<AnalyzeTrendsResponse> {
        try {
            logger.info('Calling AI service for trend analysis', { textCount: request.raw_texts.length });

            const response = await axios.post<AnalyzeTrendsResponse>(
                `${env.AI_SERVICE_URL}/analyze-trends`,
                request,
                {
                    headers: {
                        'X-API-Key': env.AI_SERVICE_KEY || '',
                        'Content-Type': 'application/json',
                    },
                    timeout: 120000, // 120s — analysis of multiple texts can take long
                }
            );

            logger.info('AI service responded with trends', { topicsCount: response.data.topics.length });
            return response.data;
        } catch (error: any) {
            const status = error.response?.status;
            const detail = error.response?.data?.detail || error.message;

            logger.error('AI service trend analysis failed', { status, detail });
            throw new Error(`AI service error: ${detail}`);
        }
    },

    async generateHooks(request: GenerateHooksRequest): Promise<GenerateHooksResponse> {
        try {
            logger.info('Calling AI service for hook generation', { topic: request.trend.topic });

            const response = await axios.post<GenerateHooksResponse>(
                `${env.AI_SERVICE_URL}/generate-hooks`,
                request,
                {
                    headers: {
                        'X-API-Key': env.AI_SERVICE_KEY || '',
                        'Content-Type': 'application/json',
                    },
                    timeout: 60000,
                }
            );

            logger.info('AI service responded with hooks', { hooksCount: response.data.hooks.length });
            return response.data;
        } catch (error: any) {
            const status = error.response?.status;
            const detail = error.response?.data?.detail || error.message;

            logger.error('AI service hook generation failed', { status, detail });
            throw new Error(`AI service error: ${detail}`);
        }
    },

    async generateCarousel(request: {
        topic: string;
        description: string;
        generated_content: string;
        keywords: string[];
        slide_count: number;
        template_hint?: string;
        voice_samples?: string[];
    }): Promise<CarouselResponse> {
        try {
            logger.info('Calling AI service for carousel generation', { topic: request.topic });

            const response = await axios.post<CarouselResponse>(
                `${env.AI_SERVICE_URL}/generate-carousel`,
                request,
                {
                    headers: {
                        'X-API-Key': env.AI_SERVICE_KEY || '',
                        'Content-Type': 'application/json',
                    },
                    timeout: 90000,
                }
            );

            logger.info('AI service responded with carousel', {
                slides: response.data.slides.length,
                theme: response.data.color_theme,
            });
            return response.data;
        } catch (error: any) {
            const status = error.response?.status;
            const rawDetail = error.response?.data?.detail;
            const detail = Array.isArray(rawDetail)
                ? rawDetail.map((d: any) => `${d.loc?.join('.')}: ${d.msg}`).join('; ')
                : rawDetail || error.message;

            logger.error('AI service carousel generation failed', { status, detail });
            throw new Error(`AI service error: ${detail}`);
        }
    },
};

// ─── Carousel Types ───────────────────────────────────────────────────────────

export interface CarouselSlide {
    type: string;
    title?: string;
    subtitle?: string;
    heading?: string;
    body?: string;
    number?: string;
    label?: string;
    context?: string;
    points?: string[];
    text?: string;
    action?: string;
}

export interface CarouselResponse {
    title: string;
    color_theme: string;
    cover_keyword: string;
    cover_image_url?: string;
    slides: CarouselSlide[];
    tokens_consumed: number;
    processing_time_ms: number;
}
