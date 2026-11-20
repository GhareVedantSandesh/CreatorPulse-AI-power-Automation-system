import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, CheckSquare, Square, Send, Loader2, Layers, Download, Archive, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CarouselSlide } from '@/components/carousel/CarouselSlide';
import { CoverImagePicker } from '@/components/carousel/CoverImagePicker';
import { THEMES, type CarouselData } from '@/components/carousel/types';
import { downloadSlide, downloadAllSlidesAsZip, downloadAllSlidesAsPdf, generatePdfBase64 } from './CarouselExporter';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface Draft {
  id: string;
  content: any;
  title?: string;
}

interface CarouselReviewDialogProps {
  draft: Draft | null;
  open: boolean;
  onClose: () => void;
  onPublished: (draftId: string) => void;
  carousel?: CarouselData;
  mainPostContent?: string;
}

export function CarouselReviewDialog({ draft, open, onClose, onPublished, mainPostContent }: CarouselReviewDialogProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedSlides, setSelectedSlides] = useState<Set<number>>(new Set());
  const [isPublishing, setIsPublishing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showPublishBar, setShowPublishBar] = useState(false);
  const [caption, setCaption] = useState('');
  const [localCarousel, setLocalCarousel] = useState<CarouselData | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Parse base carousel data from the draft content
  let parsedCarousel: CarouselData | null = null;
  try {
    const raw = draft?.content;
    parsedCarousel = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    parsedCarousel = null;
  }

  // localCarousel lets us apply Phase 3 cover changes without re-saving the draft
  const carousel = localCarousel ?? parsedCarousel;

  const handleCoverUpdate = async (updates: Partial<CarouselData>) => {
    const updatedCarousel = {
      ...(carousel ?? parsedCarousel!),
      ...updates,
    };
    setLocalCarousel(updatedCarousel);
    
    if (draft?.id) {
      try {
        await api.put(`/drafts/${draft.id}`, { content: JSON.stringify(updatedCarousel) });
      } catch (err) {
        console.error("Failed to auto-save carousel updates", err);
      }
    }
  };

  const slides = carousel?.slides ?? [];
  const theme = carousel ? (THEMES[carousel.color_theme] ?? THEMES.indigo) : THEMES.indigo;
  const coverImageUrl = carousel?.cover_mode !== 'gradient' ? carousel?.cover_image_url : undefined;

  // Init all selected on first open
  if (selectedSlides.size === 0 && slides.length > 0) {
    setSelectedSlides(new Set(slides.map((_, i) => i)));
  }

  const toggleSlide = (i: number) => {
    setSelectedSlides(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const handlePublish = async () => {
    if (!draft || selectedSlides.size === 0) return;
    if (!caption.trim()) {
      toast({ title: 'Caption required', description: 'Add a caption for your LinkedIn post.', variant: 'destructive' });
      return;
    }
    setIsPublishing(true);
    try {
      const validRefs = slideRefs.current.filter((r): r is HTMLDivElement => r !== null);
      const selectedArr = Array.from(selectedSlides).sort((a, b) => a - b);

      toast({ title: 'Generating PDF...', description: 'Preparing high-resolution carousel slides.' });
      const pdfBase64 = await generatePdfBase64(validRefs, selectedArr.length > 0 ? selectedArr : undefined);

      toast({ title: 'Uploading to LinkedIn...', description: 'This may take a few seconds.' });
      await api.post('/linkedin/post-carousel', {
        pdf_base64: pdfBase64,
        caption: caption.trim(),
        draft_id: draft.id,
        title: carousel?.title || draft.title || 'LinkedIn Carousel',
      });

      toast({ title: '✅ Posted to LinkedIn!', description: `${selectedSlides.size} slides published as a Document Carousel.` });
      onPublished(draft.id);
      onClose();
    } catch (err: any) {
      toast({ title: 'Publish failed', description: err.response?.data?.error || err.message, variant: 'destructive' });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleExportCurrent = async () => {
    const el = slideRefs.current[activeSlide];
    if (!el || !carousel) return;
    setIsExporting(true);
    try {
      await downloadSlide(el, activeSlide, carousel.title || 'carousel');
      toast({ title: `✅ Slide ${activeSlide + 1} downloaded` });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAll = async () => {
    if (!carousel) return;
    setIsExporting(true);
    try {
      const validRefs = slideRefs.current.filter((r): r is HTMLDivElement => r !== null);
      const selectedArr = Array.from(selectedSlides).sort((a, b) => a - b);
      await downloadAllSlidesAsZip(validRefs, carousel, selectedArr.length > 0 ? selectedArr : undefined);
      toast({ title: `✅ ZIP downloaded`, description: `${selectedArr.length || slides.length} slides exported` });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!carousel) return;
    setIsExporting(true);
    try {
      const validRefs = slideRefs.current.filter((r): r is HTMLDivElement => r !== null);
      const selectedArr = Array.from(selectedSlides).sort((a, b) => a - b);
      await downloadAllSlidesAsPdf(validRefs, carousel, selectedArr.length > 0 ? selectedArr : undefined);
      toast({ title: '✅ PDF downloaded successfully', description: 'Upload this PDF directly to LinkedIn as a Document to create a native carousel.' });
    } catch {
      toast({ title: 'PDF Export failed', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  if (!carousel || slides.length === 0) {
    return (
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Carousel Review</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">Could not load carousel data.</p>
        </DialogContent>
      </Dialog>
    );
  }

  const selectedCount = selectedSlides.size;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-violet-400" />
            Review Carousel — {draft?.title || carousel.title || 'Untitled'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-300">
            ✅ Check slides to include · ✗ Uncheck to exclude · Export as PNG or ZIP · Post to LinkedIn
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Badge style={{ background: theme.gradient, color: '#fff', border: 'none' }}>
                {carousel.color_theme}
              </Badge>
              <span className="text-sm text-gray-400">{slides.length} slides</span>
              <span className="text-sm font-medium text-violet-400">{selectedCount} selected</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCurrent} disabled={isExporting}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                {isExporting ? 'Exporting...' : `Slide ${activeSlide + 1}`}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={isExporting || selectedCount === 0} className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10">
                <Archive className="w-3.5 h-3.5 mr-1.5" />
                {isExporting ? 'Generating...' : `Export PDF (${selectedCount})`}
              </Button>
            </div>
          </div>

          <div className="flex gap-6 items-start">
            {/* Main preview */}
            <div className="flex-1 flex flex-col items-center gap-4">
              <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
                    <div ref={el => { slideRefs.current[activeSlide] = el; }}>
                      <CarouselSlide
                        slide={slides[activeSlide]}
                        index={activeSlide}
                        total={slides.length}
                        carousel={carousel}
                        dimmed={!selectedSlides.has(activeSlide)}
                        coverImageUrl={activeSlide === 0 ? coverImageUrl : undefined}
                      />
                    </div>
              </div>

              {/* Include toggle */}
              <Button
                variant={selectedSlides.has(activeSlide) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSlide(activeSlide)}
                style={selectedSlides.has(activeSlide) ? { background: theme.accent, color: '#000' } : {}}
              >
                {selectedSlides.has(activeSlide)
                  ? <><CheckSquare className="w-4 h-4 mr-2" />Included in post</>
                  : <><Square className="w-4 h-4 mr-2" />Excluded from post</>
                }
              </Button>

              {/* Navigation */}
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm"
                  onClick={() => setActiveSlide(Math.max(0, activeSlide - 1))}
                  disabled={activeSlide === 0}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex gap-1.5">
                  {slides.map((_, i) => (
                    <button key={i} onClick={() => setActiveSlide(i)} style={{
                      width: i === activeSlide ? 24 : 8, height: 8, borderRadius: 4,
                      background: selectedSlides.has(i)
                        ? (i === activeSlide ? theme.accent : 'rgba(255,255,255,0.4)')
                        : 'rgba(255,60,60,0.35)',
                      border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    }} />
                  ))}
                </div>
                <Button variant="outline" size="sm"
                  onClick={() => setActiveSlide(Math.min(slides.length - 1, activeSlide + 1))}
                  disabled={activeSlide === slides.length - 1}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Slide {activeSlide + 1} of {slides.length} · <span className="capitalize">{slides[activeSlide]?.type}</span>
              </p>

              {/* Phase 3: cover image customiser — slide 0 only */}
              {activeSlide === 0 && (
                <>
                  <button
                    onClick={() => setShowCoverPicker(v => !v)}
                    className="text-xs flex items-center gap-1.5 text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    <span>{showCoverPicker ? '▲' : '▼'}</span>
                    {showCoverPicker ? 'Hide' : 'Customise'} cover image
                  </button>

                  {showCoverPicker && (
                    <div className="w-full">
                      <Card className="bg-gray-900/80 border-gray-800/60">
                        <CardContent className="p-4">
                          <CoverImagePicker carousel={carousel} onUpdate={handleCoverUpdate} />
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            <div className="flex flex-col gap-3 w-28 shrink-0 max-h-[540px] overflow-y-auto pr-1">
              {slides.map((slide, i) => (
                <div key={i} className="relative">
                  <button
                    onClick={() => setActiveSlide(i)}
                    style={{
                      border: `2px solid ${i === activeSlide ? theme.accent : selectedSlides.has(i) ? 'rgba(255,255,255,0.12)' : 'rgba(255,60,60,0.25)'}`,
                      borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                      background: 'transparent', padding: 0, transition: 'border-color 0.2s', width: '100%',
                    }}
                  >
                    <div
                      ref={el => { slideRefs.current[i] = el; }}
                      style={{ transform: 'scale(0.21)', transformOrigin: 'top left', width: 540, height: 540, pointerEvents: 'none' }}
                    >
                      <CarouselSlide
                        slide={slide} index={i} total={slides.length}
                        carousel={carousel} dimmed={!selectedSlides.has(i)}
                        coverImageUrl={i === 0 ? coverImageUrl : undefined}
                      />
                    </div>
                    <div style={{ height: 113 }} />
                  </button>
                  {/* Check badge */}
                  <button onClick={() => toggleSlide(i)} style={{
                    position: 'absolute', top: 4, right: 4,
                    background: selectedSlides.has(i) ? theme.accent : 'rgba(0,0,0,0.7)',
                    border: `1px solid ${theme.accent}`,
                    borderRadius: 4, width: 18, height: 18, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: selectedSlides.has(i) ? '#000' : theme.accent,
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {selectedSlides.has(i) ? '✓' : '✗'}
                  </button>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 2, textTransform: 'capitalize' }}>
                    {slide.type}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Publish bar */}
          <div className="space-y-3 pt-2 border-t border-gray-800">
            {/* Toggle publish bar */}
            {!showPublishBar ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {selectedCount === 0
                    ? '⚠️ Select at least 1 slide to post'
                    : `${selectedCount} slide${selectedCount !== 1 ? 's' : ''} selected — ready to post`
                  }
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>Close</Button>
                  <Button
                    onClick={() => {
                      if (!caption) setCaption(carousel?.title || draft?.title || '');
                      setShowPublishBar(true);
                    }}
                    disabled={selectedCount === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  >
                    <Linkedin className="w-4 h-4" />
                    Post to LinkedIn
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-300 mb-2">Post Caption</p>
                  <textarea
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder="Write your LinkedIn post caption here... (this appears above the carousel)"
                    rows={4}
                    maxLength={3000}
                    className="w-full bg-transparent text-sm text-gray-200 placeholder:text-gray-600 resize-none outline-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-600">{caption.length}/3000 chars</span>
                    <span className="text-[10px] text-gray-600">{selectedCount} slides will be posted</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowPublishBar(false)} className="text-xs">
                    ← Back
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
                    <Button
                      onClick={handlePublish}
                      disabled={isPublishing || selectedCount === 0 || !caption.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    >
                      {isPublishing
                        ? <><Loader2 className="w-4 h-4 animate-spin" />Publishing...</>
                        : <><Send className="w-4 h-4" />Post {selectedCount} Slide{selectedCount !== 1 ? 's' : ''}</>
                      }
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
