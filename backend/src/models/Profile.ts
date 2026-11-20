import mongoose, { Schema, Document } from 'mongoose';

export interface IBrandKit {
    primary_color: string;
    accent_color: string;
    font_family: 'Inter' | 'Outfit' | 'Poppins' | 'Roboto';
    logo_url?: string;
    default_cta_text: string;
}

export interface ICreatorProfile extends Document {
    user_id: mongoose.Types.ObjectId;
    full_name?: string;
    email?: string;
    industry?: string;
    creator_type?: string;
    platforms?: string[];
    timezone?: string;
    onboarding_completed: boolean;
    brand_kit?: IBrandKit;
}

const creatorProfileSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    full_name: String,
    email: String,
    industry: String,
    creator_type: String,
    platforms: { type: [String], default: [] },
    timezone: String,
    onboarding_completed: { type: Boolean, default: false },
    brand_kit: {
        type: {
            primary_color: { type: String, default: '#4f46e5' },
            accent_color: { type: String, default: '#818cf8' },
            font_family: { type: String, default: 'Inter' },
            logo_url: String,
            default_cta_text: { type: String, default: 'Follow for more insights' },
        },
        default: null,
    },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const CreatorProfile = mongoose.models.CreatorProfile || mongoose.model<ICreatorProfile>('CreatorProfile', creatorProfileSchema);

export interface IContentSample extends Document {
    user_id: mongoose.Types.ObjectId;
    platform: string;
    content: string;
    engagement_metrics: any;
}

const contentSampleSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    platform: { type: String, required: true },
    content: { type: String, required: true },
    engagement_metrics: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export const ContentSample = mongoose.models.ContentSample || mongoose.model<IContentSample>('ContentSample', contentSampleSchema);
