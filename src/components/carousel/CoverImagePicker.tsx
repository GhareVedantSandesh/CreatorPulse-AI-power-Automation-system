import { useState, useRef } from 'react';
import { Image, Wand2, Upload, Palette, Search, Loader2, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CoverMode, CarouselData } from './types';
import { THEMES } from './types';

interface CoverImagePickerProps {
  carousel: CarouselData;
  onUpdate: (updates: Partial<CarouselData>) => void;
}

// Unsplash source URL — works without API key, returns a relevant photo
function buildUnsplashUrl(keyword: string): string {
  const encoded = encodeURIComponent(keyword.trim());
  return `https://source.unsplash.com/1080x1080/?${encoded}`;
}

// Alternative: Picsum for random beautiful placeholder
function buildPicsumUrl(seed?: string): string {
  return seed
    ? `https://picsum.photos/seed/${encodeURIComponent(seed)}/1080/1080`
    : `https://picsum.photos/1080/1080`;
}

const COVER_MODES: { id: CoverMode; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    id: 'gradient',
    label: 'Gradient',
    icon: <Palette className="w-4 h-4" />,
    desc: 'CSS gradient from your theme. Clean, always on-brand.',
  },
  {
    id: 'unsplash',
    label: 'Unsplash Photo',
    icon: <Search className="w-4 h-4" />,
    desc: 'Free stock photo based on your topic keyword.',
  },
  {
    id: 'upload',
    label: 'Upload',
    icon: <Upload className="w-4 h-4" />,
    desc: 'Use your own image — logo, product shot, or graphic.',
  },
];

export function CoverImagePicker({ carousel, onUpdate }: CoverImagePickerProps) {
  const theme = THEMES[carousel.color_theme] ?? THEMES.indigo;
  const mode = carousel.cover_mode ?? 'gradient';

  const [unsplashKeyword, setUnsplashKeyword] = useState(carousel.cover_keyword || '');
  const [unsplashPreview, setUnsplashPreview] = useState(carousel.cover_image_url || '');
  const [isLoadingUnsplash, setIsLoadingUnsplash] = useState(false);
  const [uploadPreview, setUploadPreview] = useState(
    mode === 'upload' ? (carousel.cover_image_url || '') : ''
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const setMode = (m: CoverMode) => {
    if (m === 'gradient') {
      onUpdate({ cover_mode: 'gradient', cover_image_url: undefined });
    } else if (m === 'unsplash') {
      onUpdate({
        cover_mode: 'unsplash',
        cover_image_url: unsplashPreview || buildUnsplashUrl(unsplashKeyword || carousel.cover_keyword),
      });
    } else if (m === 'upload') {
      onUpdate({ cover_mode: 'upload', cover_image_url: uploadPreview || undefined });
    }
  };

  const fetchUnsplash = () => {
    const kw = unsplashKeyword || carousel.cover_keyword;
    if (!kw.trim()) return;
    setIsLoadingUnsplash(true);
    // Add cache-busting to get a different photo each time
    const url = buildUnsplashUrl(kw) + `&cb=${Date.now()}`;
    const img = new window.Image();
    img.onload = () => {
      setUnsplashPreview(img.src);
      setIsLoadingUnsplash(false);
      onUpdate({ cover_mode: 'unsplash', cover_image_url: img.src });
    };
    img.onerror = () => {
      // Fallback to picsum if unsplash fails
      const fallback = buildPicsumUrl(kw);
      setUnsplashPreview(fallback);
      setIsLoadingUnsplash(false);
      onUpdate({ cover_mode: 'unsplash', cover_image_url: fallback });
    };
    img.src = url;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setUploadPreview(dataUrl);
      onUpdate({ cover_mode: 'upload', cover_image_url: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const clearUpload = () => {
    setUploadPreview('');
    onUpdate({ cover_mode: 'upload', cover_image_url: undefined });
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Image className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-semibold text-gray-200">Cover Image — Phase 3</span>
        <span className="text-xs text-gray-500 ml-auto">Only affects the first slide</span>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-3 gap-2">
        {COVER_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all"
            style={{
              border: `1.5px solid ${mode === m.id ? theme.accent : 'rgba(255,255,255,0.08)'}`,
              background: mode === m.id ? `${theme.accent}18` : 'rgba(255,255,255,0.03)',
              cursor: 'pointer',
            }}
          >
            <span style={{ color: mode === m.id ? theme.accent : 'rgba(255,255,255,0.45)' }}>
              {m.icon}
            </span>
            <span className="text-xs font-semibold" style={{ color: mode === m.id ? theme.accent : 'rgba(255,255,255,0.6)' }}>
              {m.label}
            </span>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        {COVER_MODES.find(m => m.id === mode)?.desc}
      </p>

      {/* ── Gradient mode: show theme swatches ── */}
      {mode === 'gradient' && (
        <div className="rounded-xl overflow-hidden h-24 flex items-center justify-center"
          style={{ background: theme.gradient }}>
          <span className="text-white text-sm font-semibold opacity-80">
            {carousel.color_theme} gradient
          </span>
        </div>
      )}

      {/* ── Unsplash mode ── */}
      {mode === 'unsplash' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={unsplashKeyword}
              onChange={e => setUnsplashKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchUnsplash()}
              placeholder={carousel.cover_keyword || 'e.g. artificial intelligence'}
              className="bg-gray-800/60 border-gray-700 text-sm"
            />
            <Button
              size="sm"
              onClick={fetchUnsplash}
              disabled={isLoadingUnsplash}
              style={{ background: theme.gradient, border: 'none', color: '#fff' }}
            >
              {isLoadingUnsplash
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Search className="w-4 h-4" />
              }
            </Button>
            {unsplashPreview && (
              <Button size="sm" variant="outline" onClick={fetchUnsplash} title="Get different photo">
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>

          {unsplashPreview ? (
            <div className="relative rounded-xl overflow-hidden h-40 border border-gray-700/50">
              <img src={unsplashPreview} alt="Cover preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-end p-2">
                <span className="text-[10px] text-white/60 bg-black/50 px-2 py-0.5 rounded-full">
                  Unsplash · Free to use
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={fetchUnsplash}
              className="w-full h-32 rounded-xl border border-dashed border-gray-700 flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-violet-500/50 hover:text-violet-400 transition-colors"
            >
              <Wand2 className="w-6 h-6" />
              <span className="text-xs">Click to fetch a photo</span>
            </button>
          )}
        </div>
      )}

      {/* ── Upload mode ── */}
      {mode === 'upload' && (
        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          {uploadPreview ? (
            <div className="relative rounded-xl overflow-hidden h-40 border border-gray-700/50">
              <img src={uploadPreview} alt="Cover upload" className="w-full h-full object-cover" />
              <button
                onClick={clearUpload}
                className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full w-7 h-7 flex items-center justify-center border border-white/20"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-2 left-2 text-xs h-7"
              >
                Change
              </Button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-32 rounded-xl border border-dashed border-gray-700 flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-violet-500/50 hover:text-violet-400 transition-colors"
            >
              <Upload className="w-6 h-6" />
              <span className="text-xs">Click to upload an image</span>
              <span className="text-[10px] text-gray-600">PNG, JPG, WEBP · max display at 1080×1080</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
