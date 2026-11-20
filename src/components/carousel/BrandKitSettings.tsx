import { useState, useEffect } from 'react';
import { Palette, Type, Image, MessageSquare, Save, RotateCcw, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBrandKit, useUpdateBrandKit, DEFAULT_BRAND_KIT, type BrandKit } from '@/hooks/useBrandKit';
import { toast } from '@/hooks/use-toast';
import { CarouselSlide } from '@/components/carousel/CarouselSlide';
import { THEMES } from '@/components/carousel/types';

const FONT_OPTIONS: Array<{ value: BrandKit['font_family']; label: string }> = [
  { value: 'Inter', label: 'Inter — Modern & Clean' },
  { value: 'Outfit', label: 'Outfit — Friendly & Bold' },
  { value: 'Poppins', label: 'Poppins — Rounded & Professional' },
  { value: 'Roboto', label: 'Roboto — Neutral & Versatile' },
];

const label = (text: string, sub?: string) => (
  <div className="mb-1.5">
    <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 block">{text}</span>
    {sub && <span className="text-[11px] text-gray-600">{sub}</span>}
  </div>
);

export function BrandKitSettings() {
  const { data: savedKit, isLoading } = useBrandKit();
  const { mutate: saveKit, isPending: isSaving } = useUpdateBrandKit();
  const [kit, setKit] = useState<BrandKit>(DEFAULT_BRAND_KIT);
  const [saved, setSaved] = useState(false);

  // Sync with server data when loaded
  useEffect(() => {
    if (savedKit) setKit({ ...DEFAULT_BRAND_KIT, ...savedKit });
  }, [savedKit]);

  const set = <K extends keyof BrandKit>(field: K, value: BrandKit[K]) => {
    setKit(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveKit(kit, {
      onSuccess: () => {
        setSaved(true);
        toast({ title: '✅ Brand Kit saved', description: 'Applied to all future carousels.' });
        setTimeout(() => setSaved(false), 3000);
      },
      onError: () => {
        toast({ title: 'Save failed', variant: 'destructive' });
      },
    });
  };

  const handleReset = () => {
    setKit(DEFAULT_BRAND_KIT);
    setSaved(false);
  };

  // Sample slide for live preview
  const previewCarousel: any = {
    title: 'Your Brand Preview',
    color_theme: 'indigo',
    cover_keyword: 'brand',
    slides: [{
      type: 'cover',
      title: kit.default_cta_text ? 'Your Brand Voice' : 'Creator Pulse',
      subtitle: 'This is how your carousel cover will look',
    }],
    brand_kit: kit,
  };

  const inputCls = 'bg-gray-900/80 border-gray-700/60 text-gray-100 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30';

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-8 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading brand kit...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <Palette className="w-5 h-5 text-violet-400" />
          Brand Kit
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Define your brand colors, font, and default CTA. Applied automatically to all carousels you generate.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Settings */}
        <div className="space-y-5">

          {/* Colors */}
          <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">
              <Palette className="w-3.5 h-3.5" /> Colors
            </div>
            <div>
              {label('Primary Color', 'Used for accents, headlines, and slide borders')}
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={kit.primary_color}
                  onChange={e => set('primary_color', e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-gray-700 bg-transparent"
                />
                <Input
                  value={kit.primary_color}
                  onChange={e => set('primary_color', e.target.value)}
                  placeholder="#4f46e5"
                  className={`${inputCls} flex-1`}
                  maxLength={7}
                />
              </div>
            </div>
            <div>
              {label('Accent Color', 'Hover states, badges, and secondary highlights')}
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={kit.accent_color}
                  onChange={e => set('accent_color', e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-gray-700 bg-transparent"
                />
                <Input
                  value={kit.accent_color}
                  onChange={e => set('accent_color', e.target.value)}
                  placeholder="#818cf8"
                  className={`${inputCls} flex-1`}
                  maxLength={7}
                />
              </div>
            </div>
          </div>

          {/* Font */}
          <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              <Type className="w-3.5 h-3.5" /> Font Family
            </div>
            <div className="grid grid-cols-1 gap-2">
              {FONT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => set('font_family', opt.value)}
                  className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                    kit.font_family === opt.value
                      ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                      : 'border-gray-700/60 text-gray-500 hover:border-gray-600 hover:text-gray-400'
                  }`}
                  style={{ fontFamily: opt.value }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Logo URL */}
          <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              <Image className="w-3.5 h-3.5" /> Logo
            </div>
            {label('Logo URL', 'Paste a direct image link — shown on cover slides')}
            <Input
              value={kit.logo_url ?? ''}
              onChange={e => set('logo_url', e.target.value || undefined)}
              placeholder="https://example.com/logo.png"
              className={inputCls}
            />
            {kit.logo_url && (
              <img
                src={kit.logo_url}
                alt="Logo preview"
                className="mt-2 h-8 object-contain rounded"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
          </div>

          {/* Default CTA */}
          <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              <MessageSquare className="w-3.5 h-3.5" /> Default CTA
            </div>
            {label('Default CTA Text', 'Pre-fills the action button on your CTA slides')}
            <Input
              value={kit.default_cta_text}
              onChange={e => set('default_cta_text', e.target.value)}
              placeholder="Follow for more insights"
              className={inputCls}
              maxLength={80}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : saved ? (
                <><Check className="w-4 h-4 mr-2" />Saved!</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />Save Brand Kit</>
              )}
            </Button>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          </div>
        </div>

        {/* Right: Live preview */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Live Preview</p>
          <div
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 24px 48px -8px rgba(0,0,0,0.7)',
              width: '100%',
              maxWidth: 380,
            }}
          >
            <div
              style={{
                transform: 'scale(0.7)',
                transformOrigin: 'top left',
                width: 540,
                height: 540,
                pointerEvents: 'none',
              }}
            >
              <CarouselSlide
                slide={previewCarousel.slides[0]}
                index={0}
                total={1}
                carousel={previewCarousel}
              />
            </div>
            <div style={{ height: 540 * 0.7 - 540 }} />
          </div>
          <p className="text-[11px] text-gray-600">
            Brand colors will be applied when you select "Custom" theme in Carousel Maker (coming in next update).
          </p>
        </div>
      </div>
    </div>
  );
}
