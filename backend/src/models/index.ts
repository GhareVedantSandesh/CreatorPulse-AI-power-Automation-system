import mongoose, { Schema, Document } from 'mongoose';

// User Schema (Already exists, but adding for completeness in index)
export interface IUser extends Document {
    email: string;
    password_hash: string;
    created_at: Date;
    updated_at: Date;
}
const userSchema = new Schema({
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

// Platform Connection Schema
export interface IPlatformConnection extends Document {
    user_id: mongoose.Types.ObjectId;
    platform: string;
    platform_user_id?: string;
    platform_username?: string;
    access_token?: string;
    refresh_token?: string;
    token_expires_at?: Date;
    is_active: boolean;
    last_sync_at?: Date;
    platform_data?: any;
}
const platformConnectionSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    platform: { type: String, required: true, default: 'linkedin' },
    platform_user_id: String,
    platform_username: String,
    access_token: String,
    refresh_token: String,
    token_expires_at: Date,
    is_active: { type: Boolean, default: true },
    last_sync_at: Date,
    platform_data: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
export const PlatformConnection = mongoose.models.PlatformConnection || mongoose.model<IPlatformConnection>('PlatformConnection', platformConnectionSchema);

// Published Post Schema
export interface IPublishedPost extends Document {
    user_id: mongoose.Types.ObjectId;
    platform: string;
    platform_post_id?: string;
    content: string;
    published_at?: Date;
    status: string;
    engagement_data?: any;
}
const publishedPostSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    platform: { type: String, required: true, default: 'linkedin' },
    platform_post_id: String,
    content: { type: String, required: true },
    published_at: { type: Date, default: Date.now },
    status: { type: String, default: 'published', enum: ['published', 'failed', 'deleted'] },
    engagement_data: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
export const PublishedPost = mongoose.models.PublishedPost || mongoose.model<IPublishedPost>('PublishedPost', publishedPostSchema);

// Scheduled Post Schema
export interface IScheduledPost extends Document {
    user_id: mongoose.Types.ObjectId;
    platform: string;
    content: string;
    scheduled_at: Date;
    status: string;
    error_message?: string;
}
const scheduledPostSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    platform: { type: String, required: true, default: 'linkedin' },
    content: { type: String, required: true },
    scheduled_at: { type: Date, required: true },
    status: { type: String, default: 'pending', enum: ['pending', 'published', 'failed', 'cancelled'] },
    error_message: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
export const ScheduledPost = mongoose.models.ScheduledPost || mongoose.model<IScheduledPost>('ScheduledPost', scheduledPostSchema);

// Drafts Schema
export interface IDraft extends Document {
    user_id: mongoose.Types.ObjectId;
    platform?: string;
    content_type?: string;
    title?: string;
    content: any;
    metadata?: any;
    status: string;
    scheduled_for?: Date;
    upstream_id?: string;
    upstream_status?: string;
    metrics?: any;
}
const draftSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    platform: String,
    content_type: String,
    title: String,
    content: { type: Schema.Types.Mixed, default: {} },
    metadata: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, default: 'draft' },
    scheduled_for: Date,
    upstream_id: String,
    upstream_status: { type: String, default: 'unknown' },
    metrics: { type: Schema.Types.Mixed, default: { likes: 0, comments: 0, shares: 0, views: 0 } },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
export const Draft = mongoose.models.Draft || mongoose.model<IDraft>('Draft', draftSchema);

// Sources Schema
export interface ISource extends Document {
    user_id: mongoose.Types.ObjectId;
    source_type: string;
    source_name: string;
    source_url?: string;
    source_config?: any;
    is_active: boolean;
    last_sync_at?: Date;
    sync_status: string;
    sync_error?: string;
    metrics?: any;
}
const sourceSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    source_type: { type: String, required: true },
    source_name: { type: String, required: true },
    source_url: String,
    source_config: { type: Schema.Types.Mixed, default: {} },
    is_active: { type: Boolean, default: true },
    last_sync_at: Date,
    sync_status: { type: String, default: 'pending', enum: ['pending', 'syncing', 'success', 'error'] },
    sync_error: String,
    metrics: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
export const Source = mongoose.models.Source || mongoose.model<ISource>('Source', sourceSchema);

// Ingested Contents Schema
export interface IIngestedContent extends Document {
    user_id: mongoose.Types.ObjectId;
    source_id?: mongoose.Types.ObjectId;
    url: string;
    title?: string;
    raw_content?: string;
    content_md?: string;
    content_html?: string;
    hash: string;
    published_at?: Date;
    metadata?: any;
    status: string;
}
const ingestedContentSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    source_id: { type: Schema.Types.ObjectId, ref: 'Source' },
    url: { type: String, required: true },
    title: String,
    raw_content: String,
    content_md: String,
    content_html: String,
    hash: { type: String, required: true },
    published_at: Date,
    metadata: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, default: 'fetched' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
export const IngestedContent = mongoose.models.IngestedContent || mongoose.model<IIngestedContent>('IngestedContent', ingestedContentSchema);

// Trend Research Schema
export interface ITrendResearch extends Document {
    user_id: mongoose.Types.ObjectId;
    query: string;
    title?: string;
    status: string;
    research_data?: any;
    priority_score: number;
    n8n_execution_id?: string;
}
const trendResearchSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    query: { type: String, required: true },
    title: String,
    status: { type: String, default: 'pending' },
    research_data: { type: Schema.Types.Mixed, default: {} },
    priority_score: { type: Number, default: 0 },
    n8n_execution_id: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
export const TrendResearch = mongoose.models.TrendResearch || mongoose.model<ITrendResearch>('TrendResearch', trendResearchSchema);

// Topics Schema
export interface ITopic extends Document {
    user_id: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    keywords?: string[];
    confidence_score: number;
    trend_score: number;
    is_trending: boolean;
    topic_type?: string;
}
const topicSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: String,
    keywords: { type: [String], default: [] },
    confidence_score: { type: Number, default: 0 },
    trend_score: { type: Number, default: 0 },
    is_trending: { type: Boolean, default: false },
    topic_type: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
export const Topic = mongoose.models.Topic || mongoose.model<ITopic>('Topic', topicSchema);

// Delivery Preferences Schema
export interface IDeliveryPreference extends Document {
    user_id: mongoose.Types.ObjectId;
    delivery_time: string;
    frequency: string;
    channels: string[];
    timezone: string;
}
const deliveryPreferenceSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    delivery_time: { type: String, default: '09:00' },
    frequency: { type: String, default: 'daily' },
    channels: { type: [String], default: ['email'] },
    timezone: { type: String, default: 'UTC' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
export const DeliveryPreference = mongoose.models.DeliveryPreference || mongoose.model<IDeliveryPreference>('DeliveryPreference', deliveryPreferenceSchema);

// Delivery Schedules Schema
export interface IDeliverySchedule extends Document {
    user_id: mongoose.Types.ObjectId;
    content_id?: mongoose.Types.ObjectId;
    status: string;
    scheduled_at?: Date;
    sent_at?: Date;
    error_message?: string;
}
const deliveryScheduleSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content_id: { type: Schema.Types.ObjectId },
    status: { type: String, default: 'pending' },
    scheduled_at: Date,
    sent_at: Date,
    error_message: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
export const DeliverySchedule = mongoose.models.DeliverySchedule || mongoose.model<IDeliverySchedule>('DeliverySchedule', deliveryScheduleSchema);
export * from './Profile';
