import { useState, useEffect } from 'react';
import { RotateCcw, Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { THEMES, type CarouselSlide, type CarouselData } from './types';

interface SlideEditorProps {
  slide: CarouselSlide;
  slideIndex: number;
  originalSlide: CarouselSlide;
  carousel: CarouselData;
  onChange: (index: number, updated: CarouselSlide) => void;
  onReset: (index: number) => void;
}

const label = (text: string) => (
  <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 mb-1 block">
    {text}
  </span>
);

export function SlideEditor({
  slide,
  slideIndex,
  originalSlide,
  carousel,
  onChange,
  onReset,
}: SlideEditorProps) {
  const theme = THEMES[carousel.color_theme] ?? THEMES.indigo;
  const [draft, setDraft] = useState<CarouselSlide>(slide);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(originalSlide);

  // Sync when parent changes active slide
  useEffect(() => {
    setDraft(slide);
  }, [slideIndex]);

  const set = (field: keyof CarouselSlide, value: string) => {
    const updated = { ...draft, [field]: value };
    setDraft(updated);
    onChange(slideIndex, updated);
  };

  const setPoint = (i: number, value: string) => {
    const pts = [...(draft.points ?? [])];
    pts[i] = value;
    const updated = { ...draft, points: pts };
    setDraft(updated);
    onChange(slideIndex, updated);
  };

  const handleReset = () => {
    setDraft(originalSlide);
    onReset(slideIndex);
  };

  const inputCls =
    'bg-gray-900/80 border-gray-700/60 text-gray-100 text-sm placeholder:text-gray-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30';
  const textareaCls =
    `${inputCls} resize-none leading-relaxed`;

  return (
    <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-2">
          <Pencil className="w-3.5 h-3.5" style={{ color: theme.accent }} />
          <span className="text-xs font-semibold text-gray-300 capitalize">
            Edit · Slide {slideIndex + 1} ({slide.type})
          </span>
          {isDirty && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: theme.tag, color: theme.accent }}
            >
              edited
            </span>
          )}
        </div>
        {isDirty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-6 px-2 text-[11px] text-gray-500 hover:text-red-400 gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </Button>
        )}
      </div>

      {/* Fields by slide type */}
      <div className="p-4 space-y-3">
        {slide.type === 'cover' && (
          <>
            <div>
              {label('Title')}
              <Input
                value={draft.title ?? ''}
                onChange={e => set('title', e.target.value)}
                placeholder="Big bold headline..."
                className={inputCls}
                maxLength={60}
              />
            </div>
            <div>
              {label('Subtitle')}
              <Textarea
                value={draft.subtitle ?? ''}
                onChange={e => set('subtitle', e.target.value)}
                placeholder="Supporting subheading..."
                className={textareaCls}
                rows={2}
                maxLength={120}
              />
            </div>
          </>
        )}

        {(slide.type === 'problem' || slide.type === 'insight') && (
          <>
            <div>
              {label('Heading')}
              <Input
                value={draft.heading ?? ''}
                onChange={e => set('heading', e.target.value)}
                placeholder="Short heading (max 8 words)..."
                className={inputCls}
                maxLength={60}
              />
            </div>
            <div>
              {label('Body')}
              <Textarea
                value={draft.body ?? ''}
                onChange={e => set('body', e.target.value)}
                placeholder="Supporting text (max 20 words)..."
                className={textareaCls}
                rows={3}
                maxLength={200}
              />
            </div>
          </>
        )}

        {slide.type === 'stat' && (
          <>
            <div>
              {label('Stat Number')}
              <Input
                value={draft.number ?? ''}
                onChange={e => set('number', e.target.value)}
                placeholder="e.g. 47 or 3x"
                className={inputCls}
                maxLength={10}
              />
            </div>
            <div>
              {label('Label')}
              <Input
                value={draft.label ?? ''}
                onChange={e => set('label', e.target.value)}
                placeholder="e.g. % increase in revenue"
                className={inputCls}
                maxLength={60}
              />
            </div>
            <div>
              {label('Context')}
              <Textarea
                value={draft.context ?? ''}
                onChange={e => set('context', e.target.value)}
                placeholder="Brief explanation of the stat..."
                className={textareaCls}
                rows={2}
                maxLength={150}
              />
            </div>
          </>
        )}

        {slide.type === 'list' && (
          <>
            <div>
              {label('Heading')}
              <Input
                value={draft.heading ?? ''}
                onChange={e => set('heading', e.target.value)}
                placeholder="List heading..."
                className={inputCls}
                maxLength={60}
              />
            </div>
            <div>
              {label('Bullet Points')}
              <div className="space-y-2">
                {(draft.points ?? ['', '', '']).map((pt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: theme.tag, color: theme.accent }}
                    >
                      {i + 1}
                    </span>
                    <Input
                      value={pt}
                      onChange={e => setPoint(i, e.target.value)}
                      placeholder={`Point ${i + 1}...`}
                      className={inputCls}
                      maxLength={80}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {slide.type === 'quote' && (
          <div>
            {label('Quote')}
            <Textarea
              value={draft.body ?? ''}
              onChange={e => set('body', e.target.value)}
              placeholder="Pull quote from your content..."
              className={textareaCls}
              rows={4}
              maxLength={250}
            />
          </div>
        )}

        {slide.type === 'cta' && (
          <>
            <div>
              {label('CTA Text')}
              <Textarea
                value={draft.text ?? ''}
                onChange={e => set('text', e.target.value)}
                placeholder="Main call-to-action message..."
                className={textareaCls}
                rows={2}
                maxLength={150}
              />
            </div>
            <div>
              {label('Action Button Label')}
              <Input
                value={draft.action ?? ''}
                onChange={e => set('action', e.target.value)}
                placeholder="e.g. Follow for more, Share this post..."
                className={inputCls}
                maxLength={60}
              />
            </div>
          </>
        )}

        {/* Saved indicator */}
        {!isDirty && (
          <p className="text-[11px] text-gray-600 flex items-center gap-1.5 pt-1">
            <Check className="w-3 h-3 text-emerald-500" />
            Changes saved to preview
          </p>
        )}
      </div>
    </div>
  );
}
