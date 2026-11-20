# Creator Pulse — Revised System Architecture
> **Version:** 2.0 | **Date:** 2026-05-07 | **Status:** Active Development
> Reconciles the proposed Carousel Creator plan with the current codebase state.

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Service Architecture](#3-service-architecture)
4. [Current Feature State](#4-current-feature-state)
5. [Carousel Creator — Current vs Proposed](#5-carousel-creator--current-vs-proposed)
6. [Data Models & DB Schema](#6-data-models--db-schema)
7. [API Surface](#7-api-surface)
8. [AI Service Pipeline](#8-ai-service-pipeline)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Revised Implementation Roadmap](#10-revised-implementation-roadmap)
11. [Environment & Ports](#11-environment--ports)

---

## 1. System Overview

Creator Pulse is a **LinkedIn content automation SaaS** for creators. It scrapes trends, generates AI-written posts and carousels, and publishes or schedules them to LinkedIn — all from one dashboard.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CREATOR PULSE                           │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   Frontend   │───▶│   Backend    │───▶│   AI Service     │  │
│  │  React/Vite  │    │  Express 5   │    │  FastAPI/Python  │  │
│  │  Port 5173   │    │  Port 3000   │    │  Port 8000       │  │
│  └──────────────┘    └──────┬───────┘    └──────────────────┘  │
│                             │                                   │
│                    ┌────────▼────────┐                          │
│                    │   MongoDB       │                          │
│                    │  (Local/Atlas)  │                          │
│                    └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

**Core Value Loop:**
```
Scrape Sources → Ingest Content → AI Trend Analysis → Topic Selection
→ Hook Generation → Post/Carousel Generation → Review → Schedule/Publish
```

---

## 2. Monorepo Structure

```
creator_pulse/                    ← pnpm workspace root
├── doc/                          ← ✅ Architecture docs (NEW)
│   └── architecture.md
├── src/                          ← Frontend source (Vite artifact)
│   └── components/
│       └── carousel/             ← ✅ Carousel UI components (BUILT)
│           ├── CarouselMaker.tsx
│           ├── CarouselSlide.tsx
│           ├── CarouselReviewDialog.tsx
│           ├── CoverImagePicker.tsx
│           ├── CarouselExporter.ts
│           └── types.ts
├── backend/                      ← Node.js API server
│   └── src/
│       ├── routes/               ← 16 route files
│       ├── controllers/          ← 16 controllers
│       ├── services/             ← ai.service, linkedin, scheduler, analytics
│       ├── models/               ← MongoDB models
│       ├── middleware/
│       └── server.ts
├── ai-service/                   ← Python FastAPI
│   └── app/
│       ├── routes/generate.py
│       ├── services/
│       │   ├── generator.py      ← Content + hook + trend generation
│       │   ├── carousel.py       ← ✅ Carousel AI generation (BUILT)
│       │   └── article_scraper.py
│       └── models/schemas.py
├── lib/                          ← Shared TS utilities
├── artifacts/                    ← Build artifacts / Drizzle DB
├── scripts/
├── package.json                  ← Root workspace config
├── pnpm-workspace.yaml
└── start_all.bat                 ← Dev launcher (all 3 services)
```

---

## 3. Service Architecture

### 3.1 Request Flow

```
Browser
  │
  │  HTTP (Axios, /api/*)
  ▼
Frontend (React, :5173)
  │
  │  Proxied to Backend
  ▼
Backend (Express 5, :3000)
  ├─ Auth Middleware (JWT)
  ├─ Rate Limiter
  │
  ├──▶ MongoDB (users, drafts, topics, sources…)
  │
  └──▶ AI Service (FastAPI, :8000)
           ├─ POST /generate          → LinkedIn post content
           ├─ POST /generate/hooks    → Hook variations
           ├─ POST /generate/trends   → Trend analysis
           └─ POST /generate/carousel → ✅ Carousel slides (BUILT)
```

### 3.2 Auth Flow

```
POST /api/auth/register  →  bcrypt hash  →  MongoDB users  →  JWT
POST /api/auth/login     →  bcrypt verify →  JWT returned
All protected routes     →  authMiddleware validates JWT
```

---

## 4. Current Feature State

| Feature | Frontend | Backend | AI Service | Status |
|---|---|---|---|---|
| Auth (register/login) | ✅ | ✅ | — | **Complete** |
| Onboarding | ✅ | ✅ | — | **Complete** |
| Creator Profile | ✅ | ✅ | — | **Complete** |
| Source Management | ✅ | ✅ | — | **Complete** |
| Content Scraping | ✅ | ✅ | ✅ | **Complete** |
| Trend Analysis | ✅ | ✅ | ✅ | **Complete** |
| Topic Management | ✅ | ✅ | — | **Complete** |
| Hook Generation | ✅ | ✅ | ✅ | **Complete** |
| LinkedIn Post Generation | ✅ | ✅ | ✅ | **Complete** |
| Drafts (CRUD) | ✅ | ✅ | — | **Complete** |
| Scheduler | ✅ | ✅ | — | **Complete** |
| LinkedIn OAuth / Publish | ✅ | ✅ | — | **Complete** |
| Analytics | ✅ | ✅ | — | **Complete** |
| **Carousel Generator (AI)** | ✅ | ✅ | ✅ | **Complete** |
| **Carousel Slide Preview** | ✅ | — | — | **Complete** |
| **Carousel Cover Image Picker** | ✅ | — | — | **Complete** |
| **Carousel Save to Draft** | ✅ | ✅ | — | **Complete** |
| **Carousel Export (PNG/PDF/ZIP)** | ✅ | — | — | **Complete** |
| Carousel Slide Editor (inline edit) | ✅ | — | — | **Complete** |
| Carousel LinkedIn Direct Publish | ✅ | ✅ | — | **Complete** |
| Carousel Brand Kit | ✅ | ✅ | — | **Complete** |
| Carousel Template Library | ✅ | — | — | **Complete** |
| Voice Training / Style Match | 🔶 | 🔶 | ✅ | **Partial (AI ready)** |
| Delivery Preferences | ✅ | ✅ | — | **Complete** |

> ✅ Done · ❌ Not started · 🔶 Partial

---

## 5. Carousel Creator — Current vs Proposed

### 5.1 What Is Already Built (Current State)

The carousel feature has a **solid foundation** already deployed:

#### Frontend (`src/components/carousel/`)
- **`CarouselMaker.tsx`** — 2-step wizard (Paste Content → Preview & Save)
  - Topic selector (auto-fills description)
  - Content textarea with char counter
  - Slide count picker (3–8 slides)
  - Live preview with navigation arrows + dot indicators
  - Thumbnail strip (right panel)
  - Cover image picker toggle
  - Save to Drafts button
- **`CarouselSlide.tsx`** — Renders each slide type with theme gradients
  - Slide types: `cover | problem | insight | stat | list | quote | cta`
  - 5 color themes: `indigo | emerald | rose | amber | slate`
- **`CoverImagePicker.tsx`** — Unsplash search + gradient/upload modes
- **`CarouselReviewDialog.tsx`** — Full review dialog (from Drafts page)
- **`CarouselExporter.ts`** — html2canvas + jsPDF + JSZip export pipeline
- **`types.ts`** — `CarouselData`, `CarouselSlide`, `THEMES`, `CoverMode`

#### Backend (`backend/src/`)
- **`carousel.routes.ts`** — `POST /api/carousel/generate`, `POST /api/carousel/save`
- **`carousel.controller.ts`** — Loads topic from MongoDB, calls AI service, saves as draft
- Carousel drafts stored in `drafts` collection with `content_type: 'carousel'`

#### AI Service (`ai-service/app/`)
- **`carousel.py`** — Groq LLM call with structured JSON prompt
  - Slide-type-aware prompt engineering
  - Content capped at 8000 chars to avoid token overflow
  - Strict "no invented data" rules
  - Returns: title, color_theme, cover_keyword, slides[]
- **`schemas.py`** — `CarouselRequest`, `CarouselResponse`, `CarouselSlide` Pydantic models

---

### 5.2 Proposed Enhancements (From PDF Plan)

The PDF architecture proposed the following additions on top of the existing foundation:

#### Phase A — Inline Slide Editor
Allow users to **edit slide text directly** in the preview UI without regenerating.

```
CarouselMaker (Step 2 Preview)
  └── SlideEditor panel (click slide → edit fields inline)
       ├── Edit: heading, body, bullet points, stat number
       ├── Real-time preview update (no API call)
       └── Reset slide to AI-generated version
```

**Files to add/modify:**
- `src/components/carousel/SlideEditor.tsx` (new)
- `src/components/carousel/CarouselMaker.tsx` (add edit mode state)
- `src/components/carousel/types.ts` (add `editedSlides` tracking)

#### Phase B — Brand Kit
User-defined brand settings that auto-apply to all carousels.

```
Creator Profile → Brand Kit Tab
  ├── Primary color (hex picker)
  ├── Logo upload
  ├── Font family selector (Inter / Outfit / Poppins)
  └── Default CTA text
```

**DB change needed:**
- Add `brand_kit` JSON field to `creator_profiles` MongoDB collection

**Files to add/modify:**
- `src/components/carousel/BrandKitSettings.tsx` (new)
- `backend/src/controllers/profile.controller.ts` (add brand_kit CRUD)
- `ai-service/app/services/carousel.py` (accept `brand_kit` in request)

#### Phase C — Template Library
Pre-defined slide structure templates beyond AI generation.

```
CarouselMaker Step 1
  └── "Start from Template" toggle
       ├── Template: "5-Point List" (cover + 4 list + cta)
       ├── Template: "Before/After" (cover + problem + insight + cta)
       ├── Template: "Stat Story" (cover + stat + insight + list + cta)
       └── Template: "Quote Carousel" (cover + 4 quotes + cta)
```

**Files to add:**
- `src/components/carousel/TemplateLibrary.tsx` (new)
- `src/components/carousel/templates/` (static template definitions)

#### Phase D — LinkedIn Direct Publish from Carousel
Publish a carousel directly to LinkedIn as a document/PDF post.

```
Carousel Review Dialog
  └── "Post to LinkedIn" button
       ├── Export slides as PDF (already: CarouselExporter)
       ├── Upload PDF to LinkedIn as document post via API
       └── Post text prompt (auto-suggested from carousel title)
```

**Files to modify:**
- `backend/src/controllers/linkedin.controller.ts` (add document post endpoint)
- `backend/src/routes/linkedin.routes.ts` (add POST /api/linkedin/post-document)
- `backend/src/services/linkedin.service.ts` (implement document upload flow)
- `src/components/carousel/CarouselReviewDialog.tsx` (add publish button)

---

## 6. Data Models & DB Schema

### MongoDB Collections (Current)

```
users
  _id, email, password_hash, created_at

creator_profiles
  _id, user_id, full_name, email, industry, creator_type,
  platforms[], timezone, voice_samples[], onboarding_completed,
  updated_at
  ── PLANNED: brand_kit { primary_color, font, logo_url, cta_text }

drafts
  _id, user_id, topic_id, title, content,
  content_type: 'post' | 'carousel',
  platform: 'linkedin',
  status: 'draft' | 'scheduled' | 'published',
  created_at, updated_at

topics
  _id, user_id, title, description, keywords[],
  trend_score, confidence_score, source_url, created_at

sources
  _id, user_id, source_type, source_name, source_url,
  source_config, is_active, sync_status, created_at

ingested_contents
  _id, user_id, source_id, title, content, summary,
  url, metadata, created_at

trend_research
  _id, user_id, query, title, status, categories[], results, created_at

scheduled_posts
  _id, user_id, draft_id, platform, scheduled_at,
  status: 'pending' | 'sent' | 'failed', created_at

platform_connections
  _id, user_id, platform, access_token, refresh_token,
  expires_at, created_at

delivery_preferences
  _id, user_id, delivery_time, frequency, channels[], timezone, updated_at
```

### Carousel JSON Shape (stored in `drafts.content`)

```typescript
{
  title: string;
  color_theme: 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate';
  cover_keyword: string;
  cover_image_url?: string;
  cover_mode?: 'gradient' | 'unsplash' | 'upload';
  slides: Array<{
    type: 'cover' | 'problem' | 'insight' | 'stat' | 'list' | 'quote' | 'cta';
    title?: string; subtitle?: string;   // cover
    heading?: string; body?: string;     // problem, insight
    number?: string; label?: string; context?: string; // stat
    points?: string[];                   // list
    text?: string; action?: string;      // cta
  }>;
  tokens_consumed?: number;
  processing_time_ms?: number;
}
```

---

## 7. API Surface

### Backend (`/api/*`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Register user |
| POST | `/api/auth/login` | ❌ | Login → JWT |
| GET | `/api/auth/me` | ✅ | Current user |
| GET/PUT | `/api/profile` | ✅ | Creator profile |
| GET/POST/DELETE | `/api/sources` | ✅ | RSS/web sources |
| POST | `/api/scraper/run` | ✅ | Trigger scrape |
| GET/POST | `/api/topics` | ✅ | Topic management |
| GET | `/api/ingested-contents` | ✅ | Ingested articles |
| POST | `/api/trends/analyze` | ✅ | AI trend analysis |
| POST | `/api/generate` | ✅ | LinkedIn post gen |
| POST | `/api/generate/hooks` | ✅ | Hook generation |
| GET/POST/DELETE | `/api/drafts` | ✅ | Draft CRUD |
| **POST** | **`/api/carousel/generate`** | ✅ | **Generate carousel** |
| **POST** | **`/api/carousel/save`** | ✅ | **Save carousel draft** |
| GET/POST | `/api/schedule` | ✅ | Scheduling |
| POST | `/api/linkedin/publish` | ✅ | Publish text post |
| GET | `/health` | ❌ | Health check |

### AI Service (`:8000`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/generate` | LinkedIn post |
| POST | `/generate/hooks` | Hook variations |
| POST | `/generate/trends` | Trend analysis |
| **POST** | **`/generate/carousel`** | **Carousel slides** |
| GET | `/health` | Health check |

---

## 8. AI Service Pipeline

### Content Generation
```
Request → article_scraper (optional) → Groq prompt (SHORT|LONG)
→ Parse JSON → { content, hook, hashtags, engagement_prediction }
```

### Carousel Generation
```
CarouselRequest { topic, description, generated_content, keywords, slide_count }
  → CAROUSEL_PROMPT (type-constrained, no invented data)
  → Groq (temp=0.5, max_tokens=4096, streaming)
  → Parse JSON → CarouselResponse { title, color_theme, cover_keyword, slides[] }
```

### Carousel Slide Types

| Type | Required Fields | Rule |
|---|---|---|
| `cover` | title, subtitle | Always slide 1 |
| `problem` | heading, body | Context/challenge |
| `insight` | heading, body | Key takeaway |
| `stat` | number, label, context | Real data only |
| `list` | heading, points[] | Max 4 bullets |
| `quote` | body | Pull quote |
| `cta` | text, action | Always last |

---

## 9. Frontend Architecture

### Tech Stack
React 18 + Vite · React Router v6 · TanStack Query v5 · Zustand v5
Radix UI + shadcn/ui · Tailwind CSS v3 · Framer Motion v12
Axios · html2canvas + jsPDF + JSZip · embla-carousel-react

### Carousel Component Graph
```
WorkflowPage
  └── CarouselMaker
        ├── useTopics() → GET /api/topics
        ├── useGenerateCarousel() → POST /api/carousel/generate
        ├── useSaveCarousel() → POST /api/carousel/save
        ├── CarouselSlide (themed renderer)
        └── CoverImagePicker (Unsplash/upload/gradient)

DraftsPage
  └── CarouselReviewDialog
        ├── CarouselSlide (preview)
        └── CarouselExporter (PNG/PDF/ZIP)
```

### Slide Rendering
- Canvas: **540×540px** (1:1 LinkedIn format)
- Thumbnails: CSS `scale(0.178)` → 96px live miniatures
- 5 gradient themes: indigo, emerald, rose, amber, slate

---

## 10. Revised Implementation Roadmap

### ✅ Phase 1 — Core Platform (COMPLETE)
Auth, sources, scraping, trends, topics, hooks, post gen, drafts, scheduling, LinkedIn, analytics.

### ✅ Phase 2 — Carousel MVP (COMPLETE)
AI generation · slide rendering · cover image picker · save to drafts · PNG/PDF/ZIP export.

### ✅ Phase 3 — Carousel Creator Enhancements (COMPLETE)

| Sprint | Feature | Status |
|---|---|---|
| 3A | **Inline Slide Editor** — `SlideEditor.tsx` wired into `CarouselMaker` with per-slide edit state | ✅ |
| 3B | **LinkedIn Direct Publish** — `/api/linkedin/post-carousel` endpoint + caption textarea + PDF pipeline | ✅ |
| 3C | **Template Library** — 4 templates (List/Before-After/Stat/Quote), tab switcher in CarouselMaker | ✅ |
| 3D | **Brand Kit** — `brand_kit` on `CreatorProfile` model, GET/PUT `/api/profile/brand-kit`, `BrandKitSettings.tsx` | ✅ |

### 🔶 Phase 4 — Advanced (NEXT)

| Sprint | Feature | Effort |
|---|---|---|
| 4A | **Voice-Matched Carousel Tone** — pass `voice_samples` to carousel AI (schema ready) | ~0.5 days |
| 4B | **Carousel Analytics** — track LinkedIn document post metrics | ~2 days |
| 4C | **Multi-Platform Export** — 4:5 Instagram, 16:9 Twitter formats | ~2 days |

---

## 11. Environment & Ports

| Service | Port | Command |
|---|---|---|
| Frontend (Vite) | 5173 | `pnpm --filter @workspace/creatorpulse run dev` |
| Backend (Express) | 3000 | `pnpm --filter @workspace/api-server run dev` |
| AI Service (FastAPI) | 8000 | `cd ai-service && uvicorn app.main:app --reload` |
| DB Studio | 4983 | `npm run db:studio` |
| MongoDB | 27017 | Local / Atlas |

```bash
# Key env vars
JWT_SECRET=          # backend
MONGODB_URI=         # backend
GROQ_API_KEY=        # ai-service
GROQ_MODEL=llama-3.3-70b-versatile
UNSPLASH_ACCESS_KEY= # ai-service / frontend
```

### CORS Origins (server.ts)
`localhost:8080` · `localhost:8111` · `localhost:5173`
