-- Milestone 1: Carousel Engine Tables

-- 1. Create enum for job status
DO $$ BEGIN
    CREATE TYPE carousel_job_status AS ENUM (
        'queued', 
        'analyzing', 
        'generating', 
        'styling', 
        'rendering', 
        'exporting',
        'done', 
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create design_templates table
CREATE TABLE IF NOT EXISTS design_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    config JSONB NOT NULL DEFAULT '{}',
    html_template_path TEXT,
    preview_url TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create carousel_jobs table
CREATE TABLE IF NOT EXISTS carousel_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- references auth.users in Supabase
    topic TEXT NOT NULL,
    status carousel_job_status DEFAULT 'queued',
    current_step INTEGER DEFAULT 0,
    payload JSONB DEFAULT '{}',
    final_assets JSONB DEFAULT '{}', -- { pdf_url, png_urls: [] }
    error_log TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, idempotency_key)
);

-- 4. Create carousel_slides table (stores intermediate results for editing)
CREATE TABLE IF NOT EXISTS carousel_slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES carousel_jobs(id) ON DELETE CASCADE,
    slide_index INTEGER NOT NULL,
    type TEXT NOT NULL, -- cover, problem, insight, etc.
    content JSONB NOT NULL, -- { title, body, list_points, etc. }
    visual_hint TEXT,
    render_status TEXT DEFAULT 'pending', -- pending, rendered, failed
    png_storage_path TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(job_id, slide_index)
);

-- 5. Create carousel_exports table
CREATE TABLE IF NOT EXISTS carousel_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES carousel_jobs(id) ON DELETE CASCADE,
    pdf_storage_path TEXT,
    zip_storage_path TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE carousel_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_exports ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- Jobs: Users can only see and manage their own jobs
CREATE POLICY "Users can manage their own carousel jobs" 
ON carousel_jobs FOR ALL 
USING (auth.uid() = user_id);

-- Slides: Users can see slides belonging to their jobs
CREATE POLICY "Users can see slides for their own jobs" 
ON carousel_slides FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM carousel_jobs 
        WHERE carousel_jobs.id = carousel_slides.job_id 
        AND carousel_jobs.user_id = auth.uid()
    )
);

-- Exports: Users can see exports belonging to their jobs
CREATE POLICY "Users can see exports for their own jobs" 
ON carousel_exports FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM carousel_jobs 
        WHERE carousel_jobs.id = carousel_exports.job_id 
        AND carousel_jobs.user_id = auth.uid()
    )
);

-- 8. Enable Realtime
-- In Supabase, you typically do:
-- alter publication supabase_realtime add table carousel_jobs;

-- 9. Initial Template Seed
INSERT INTO design_templates (name, is_default, config)
VALUES ('dark_modern', true, '{
    "colors": {
        "primary": "#6366f1",
        "background": "#0f172a",
        "text": "#f8fafc"
    },
    "fonts": {
        "heading": "Inter",
        "body": "Inter"
    }
}')
ON CONFLICT (name) DO NOTHING;
