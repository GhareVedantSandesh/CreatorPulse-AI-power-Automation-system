export interface CarouselSlide {
  type: 'cover' | 'problem' | 'insight' | 'stat' | 'list' | 'quote' | 'cta';
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
  png_url?: string;
}

export type CoverMode = 'gradient' | 'unsplash' | 'upload';

export interface CarouselData {
  title: string;
  color_theme: 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate';
  cover_keyword: string;
  cover_image_url?: string;   // set when using unsplash or upload
  cover_mode?: CoverMode;     // 'gradient' | 'unsplash' | 'upload'
  slides: CarouselSlide[];
  tokens_consumed?: number;
  processing_time_ms?: number;
  pdf_url?: string;
}

export const THEMES = {
  indigo: {
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    accent: '#818cf8',
    text: '#ffffff',
    muted: 'rgba(255,255,255,0.75)',
    bg: '#1e1b4b',
    slideBg: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 100%)',
    tag: 'rgba(129,140,248,0.25)',
  },
  emerald: {
    gradient: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
    accent: '#34d399',
    text: '#ffffff',
    muted: 'rgba(255,255,255,0.75)',
    bg: '#022c22',
    slideBg: 'linear-gradient(145deg, #022c22 0%, #064e3b 100%)',
    tag: 'rgba(52,211,153,0.25)',
  },
  rose: {
    gradient: 'linear-gradient(135deg, #e11d48 0%, #db2777 100%)',
    accent: '#fb7185',
    text: '#ffffff',
    muted: 'rgba(255,255,255,0.75)',
    bg: '#4c0519',
    slideBg: 'linear-gradient(145deg, #4c0519 0%, #881337 100%)',
    tag: 'rgba(251,113,133,0.25)',
  },
  amber: {
    gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    accent: '#fbbf24',
    text: '#ffffff',
    muted: 'rgba(255,255,255,0.75)',
    bg: '#451a03',
    slideBg: 'linear-gradient(145deg, #451a03 0%, #78350f 100%)',
    tag: 'rgba(251,191,36,0.25)',
  },
  slate: {
    gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    accent: '#94a3b8',
    text: '#ffffff',
    muted: 'rgba(255,255,255,0.75)',
    bg: '#0f172a',
    slideBg: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
    tag: 'rgba(148,163,184,0.25)',
  },
} as const;
