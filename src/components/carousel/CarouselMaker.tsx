import { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Sparkles, AlertCircle, Layers, Save, RefreshCw, Pencil, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CarouselSlide } from './CarouselSlide';
import { SlideEditor } from './SlideEditor';
import { TemplateLibrary } from './TemplateLibrary';
import { CoverImagePicker } from './CoverImagePicker';
import { useGenerateCarousel, useSaveCarousel, useCarouselJob } from '@/hooks/useCarousel';
import { useTopics } from '@/hooks/useTopics';
import type { CarouselData, CarouselSlide as SlideType } from './types';
import { THEMES } from './types';
import { type CarouselTemplate } from './templates/index';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export function CarouselMaker() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [inputTab, setInputTab] = useState<'paste' | 'template'>('paste');
  const [selectedTemplate, setSelectedTemplate] = useState<CarouselTemplate | null>(null);
  const [topicId, setTopicId] = useState<string>('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [slideCount, setSlideCount] = useState(3);
  const [carousel, setCarousel] = useState<CarouselData | null>(null);
  const [aiSlides, setAiSlides] = useState<SlideType[]>([]); // original AI output — never mutated
  const [editedSlides, setEditedSlides] = useState<Record<number, SlideType>>({}); // per-slide overrides
  const [activeSlide, setActiveSlide] = useState(0);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showEditor, setShowEditor] = useState(true);

  const { data: topics = [] } = useTopics(null);
  const { mutate: generate, isPending: isInitiating, error: generateError } = useGenerateCarousel();
  const { mutate: save, isPending: isSaving } = useSaveCarousel();

  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const { data: job } = useCarouselJob(currentJobId);

  const isGenerating = isInitiating || (!!currentJobId && job?.status !== 'done' && job?.status !== 'failed');

  // Sync job result to local state when done
  useEffect(() => {
    if (job?.status === 'done') {
      const slides = job.carousel_slides
        .sort((a: any, b: any) => a.slide_index - b.slide_index)
        .map((s: any) => ({
          ...s.content,
          png_url: s.png_url
        }));
      
      const carouselData: CarouselData = {
        title: job.topic,
        color_theme: job.payload?.theme?.color_palette || 'indigo',
        cover_keyword: job.payload?.analysis?.title || job.topic,
        slides: slides,
        pdf_url: job.pdf_url
      };
      setCarousel(carouselData);
      setAiSlides(slides);
      setEditedSlides({});
      setActiveSlide(0);
      setStep('preview');
      setCurrentJobId(null);
      toast({ title: '✅ Carousel ready', description: `${slides.length} slides generated` });
    }
    if (job?.status === 'failed') {
      setCurrentJobId(null);
      toast({ title: 'Generation failed', description: job.error_log, variant: 'destructive' });
    }
  }, [job?.status]);

  const handleGenerate = () => {
    if (!generatedContent.trim() || generatedContent.trim().length < 20) {
      toast({ title: 'Content required', description: 'Paste your LinkedIn post first.', variant: 'destructive' });
      return;
    }
    const effectiveSlideCount = selectedTemplate ? selectedTemplate.slideTypes.length : slideCount;
    generate(
      {
        topicId: topicId || undefined,
        generatedContent,
        slideCount: effectiveSlideCount,
        templateHint: selectedTemplate?.hint,
      },
      {
        onSuccess: (data) => {
          setCurrentJobId(data.jobId);
        },
        onError: (err: any) => {
          toast({ title: 'Generation failed', description: err?.response?.data?.error || err?.message || 'Make sure the AI service is running.', variant: 'destructive' });
        },
      }
    );
  };

  const handleSaveToDrafts = () => {
    if (!carousel) return;
    save(
      { carousel_data: carousel, topicId: topicId || undefined },
      {
        onSuccess: () => {
          toast({ title: '✅ Saved to Drafts', description: 'Redirecting to Drafts...' });
          setTimeout(() => navigate('/drafts'), 800);
        },
        onError: () => toast({ title: 'Save failed', variant: 'destructive' }),
      }
    );
  };

  const handleCoverUpdate = (updates: Partial<CarouselData>) => {
    setCarousel(prev => prev ? { ...prev, ...updates } : prev);
  };

  // Merge AI slides with any user edits
  const mergedSlides: SlideType[] = (carousel?.slides ?? []).map((s, i) =>
    editedSlides[i] ?? s
  );

  const handleSlideChange = (index: number, updated: SlideType) => {
    setEditedSlides(prev => ({ ...prev, [index]: updated }));
    // Keep carousel.slides in sync so thumbnail renders update live
    setCarousel(prev => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      slides[index] = updated;
      return { ...prev, slides };
    });
  };

  const handleSlideReset = (index: number) => {
    setEditedSlides(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    // Restore original AI slide
    setCarousel(prev => {
      if (!prev || !aiSlides[index]) return prev;
      const slides = [...prev.slides];
      slides[index] = aiSlides[index];
      return { ...prev, slides };
    });
  };

  const editedCount = Object.keys(editedSlides).length;

  const theme = carousel ? (THEMES[carousel.color_theme] ?? THEMES.indigo) : THEMES.indigo;
  const coverImageUrl = carousel?.cover_mode && carousel.cover_mode !== 'gradient' ? carousel.cover_image_url : undefined;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Step indicator ── */}
      <div className="flex items-center gap-3">
        {['input', 'preview'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step === s ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' :
              (i === 0 && step === 'preview') ? 'bg-violet-900/50 text-violet-400 border border-violet-700' :
              'bg-gray-800 text-gray-600 border border-gray-700'
            }`}>{i + 1}</div>
            <span className={`text-xs font-medium capitalize ${step === s ? 'text-gray-200' : 'text-gray-600'}`}>
              {s === 'input' ? 'Paste Content' : 'Preview & Save'}
            </span>
            {i === 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-700" />}
          </div>
        ))}
        {step === 'preview' && (
          <Button variant="ghost" size="sm" onClick={() => setStep('input')} className="ml-auto text-gray-500 hover:text-gray-300">
            ← Edit Input
          </Button>
        )}
      </div>

      {/* ═══ STEP 1 — INPUT ═══ */}
      {step === 'input' && (
        <Card className="bg-gray-900/70 border-gray-800/50 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-400" />
              Create Carousel
            </CardTitle>
            {/* Tabs */}
            <div className="flex gap-1 mt-3 bg-gray-800/50 rounded-lg p-1">
              <button
                onClick={() => setInputTab('paste')}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-md transition-all ${
                  inputTab === 'paste'
                    ? 'bg-gray-700 text-gray-100 shadow'
                    : 'text-gray-500 hover:text-gray-400'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Paste Content
              </button>
              <button
                onClick={() => setInputTab('template')}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-md transition-all ${
                  inputTab === 'template'
                    ? 'bg-gray-700 text-gray-100 shadow'
                    : 'text-gray-500 hover:text-gray-400'
                }`}
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                Pick Template
                {selectedTemplate && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-violet-400" />
                )}
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            {/* Template Library tab */}
            {inputTab === 'template' && (
              <TemplateLibrary
                selectedId={selectedTemplate?.id ?? null}
                onSelect={tpl => {
                  setSelectedTemplate(tpl);
                  if (tpl) setSlideCount(tpl.slideTypes.length);
                }}
              />
            )}

            {/* Paste Content tab */}
            {inputTab === 'paste' && (
              <>
            {/* Topic picker */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-400">Topic (optional)</label>
              <Select
                value={topicId || '__none__'}
                onValueChange={v => {
                  const newTopicId = v === '__none__' ? '' : v;
                  setTopicId(newTopicId);
                  if (newTopicId) {
                    const selectedTopic = topics.find(t => t.id === newTopicId);
                    if (selectedTopic?.description && (!generatedContent || generatedContent.length < 20)) {
                      setGeneratedContent(selectedTopic.description);
                    }
                  } else {
                    setGeneratedContent('');
                  }
                }}
              >
                <SelectTrigger className="bg-gray-800/60 border-gray-700 text-sm">
                  <SelectValue placeholder="Select a trending topic..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No topic — paste content manually</SelectItem>
                  {topics.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-400">
                  Carousel Context / Content <span className="text-red-400">*</span>
                </label>
                <span className={`text-xs ${generatedContent.length > 20 ? 'text-green-500' : 'text-gray-600'}`}>
                  {generatedContent.length} chars
                </span>
              </div>
              <Textarea
                placeholder="Select a topic above to auto-fill its data, or paste your AI-generated LinkedIn post here manually..."
                value={generatedContent}
                onChange={e => setGeneratedContent(e.target.value)}
                className="min-h-[220px] bg-gray-800/60 border-gray-700 resize-none text-sm leading-relaxed placeholder:text-gray-600 focus:border-violet-600 focus:ring-violet-600/20"
              />
            </div>

            {/* Slide count + generate */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-400 whitespace-nowrap">Slides:</label>
                <div className="flex gap-1.5">
                  {selectedTemplate ? (
                    <span className="text-sm text-violet-400 font-semibold">
                      {selectedTemplate.slideTypes.length} slides (locked by template)
                    </span>
                  ) : (
                    [3, 4, 5, 6, 7, 8].map(n => (
                      <button
                        key={n}
                        onClick={() => setSlideCount(n)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all border ${
                          slideCount === n
                            ? 'bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-500/25'
                            : 'bg-gray-800/60 text-gray-500 border-gray-700 hover:border-gray-600 hover:text-gray-400'
                        }`}
                      >
                        {n}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
            </>
            )}

            {/* Error */}
            {generateError && (
              <div className="flex items-start gap-3 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Generation failed</p>
                  <p className="text-xs text-red-400/70 mt-0.5">
                    {(generateError as any)?.response?.data?.error || (generateError as any)?.message || 'Make sure all 3 services are running (AI service on port 8000).'}
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || (inputTab === 'paste' && generatedContent.trim().length < 20)}
              className="w-full h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50"
            >
              {isInitiating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Initiating...</>
              ) : currentJobId ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{job?.status || 'Queued'} (Step {job?.current_step || 0}/6)...</>
              ) : selectedTemplate ? (
                <><LayoutTemplate className="w-4 h-4 mr-2" />Generate "{selectedTemplate.name}" Carousel</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Generate {slideCount}-Slide Carousel</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ═══ STEP 2 — PREVIEW ═══ */}
      {step === 'preview' && carousel && (
        <div className="space-y-5">

          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-gray-900/60 border border-gray-800/40 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                style={{ background: theme.gradient, border: 'none', color: '#fff', fontWeight: 600 }}
                className="px-3"
              >
                {carousel.color_theme}
              </Badge>
              <span className="text-sm text-gray-400">{carousel.slides.length} slides</span>
              {carousel.processing_time_ms && (
                <span className="text-xs text-gray-600">{carousel.processing_time_ms}ms</span>
              )}
              {carousel.cover_mode && carousel.cover_mode !== 'gradient' && (
                <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-400">
                  Cover: {carousel.cover_mode}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep('input')} className="text-xs">
                <RefreshCw className="w-3 h-3 mr-1.5" /> Regenerate
              </Button>
              <Button
                size="sm"
                onClick={handleSaveToDrafts}
                disabled={isSaving}
                style={{ background: theme.gradient, border: 'none', color: '#fff' }}
                className="font-medium shadow-lg"
              >
                {isSaving
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving...</>
                  : <><Save className="w-3.5 h-3.5 mr-1.5" />Save to Drafts</>
                }
              </Button>
            </div>
          </div>

          <div className="flex gap-5 items-start">
            {/* ── Left: main slide + nav ── */}
            <div className="flex-1 flex flex-col items-center gap-4 min-w-0">

              {/* Slide display — scaled to fit */}
              <div className="w-full flex justify-center">
                <div
                  style={{
                    width: '100%',
                    maxWidth: 540,
                    aspectRatio: '1/1',
                    borderRadius: 20,
                    overflow: 'hidden',
                    boxShadow: `0 32px 64px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)`,
                  }}
                >
                  <div
                    style={{
                      transform: 'scale(1)',
                      transformOrigin: 'top left',
                      width: 540,
                      height: 540,
                    }}
                  >
                    <CarouselSlide
                      slide={mergedSlides[activeSlide]}
                      index={activeSlide}
                      total={carousel.slides.length}
                      carousel={carousel}
                      coverImageUrl={activeSlide === 0 ? coverImageUrl : undefined}
                      pngUrl={mergedSlides[activeSlide]?.png_url}
                    />
                  </div>
                </div>
              </div>

              {/* Navigation arrows + dots */}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setActiveSlide(Math.max(0, activeSlide - 1))}
                  disabled={activeSlide === 0}
                  className="w-8 h-8 p-0 rounded-full"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex gap-1.5">
                  {carousel.slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSlide(i)}
                      style={{
                        width: i === activeSlide ? 24 : 8,
                        height: 8, borderRadius: 4,
                        background: i === activeSlide
                          ? theme.accent
                          : editedSlides[i]
                            ? theme.tag
                            : 'rgba(255,255,255,0.15)',
                        border: 'none', cursor: 'pointer', transition: 'all 0.25s ease',
                      }}
                    />
                  ))}
                </div>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setActiveSlide(Math.min(carousel.slides.length - 1, activeSlide + 1))}
                  disabled={activeSlide === carousel.slides.length - 1}
                  className="w-8 h-8 p-0 rounded-full"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-xs text-gray-500">
                {activeSlide + 1} / {carousel.slides.length} · <span className="capitalize text-gray-400">{carousel.slides[activeSlide]?.type}</span>
                {editedSlides[activeSlide] && <span className="ml-2 text-violet-400">· edited</span>}
              </p>

              {/* Cover image picker — inline below nav when on slide 1 */}
              {activeSlide === 0 && (
                <div className="w-full max-w-[540px]">
                  <button
                    onClick={() => setShowCoverPicker(v => !v)}
                    className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1.5 transition-colors mb-2"
                  >
                    <span>{showCoverPicker ? '▲' : '▼'}</span>
                    {showCoverPicker ? 'Hide' : 'Customise'} cover image
                  </button>
                  {showCoverPicker && (
                    <Card className="bg-gray-900/80 border-gray-800/60">
                      <CardContent className="p-4">
                        <CoverImagePicker carousel={carousel} onUpdate={handleCoverUpdate} />
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* ── Inline Slide Editor ── */}
              <div className="w-full max-w-[540px]">
                <button
                  onClick={() => setShowEditor(v => !v)}
                  className="text-xs flex items-center gap-1.5 mb-2 transition-colors"
                  style={{ color: theme.accent }}
                >
                  <Pencil className="w-3 h-3" />
                  {showEditor ? 'Hide' : 'Show'} slide editor
                  {editedCount > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: theme.tag, color: theme.accent }}
                    >
                      {editedCount} edited
                    </span>
                  )}
                </button>
                {showEditor && aiSlides.length > 0 && (
                  <SlideEditor
                    key={activeSlide}
                    slide={mergedSlides[activeSlide]}
                    slideIndex={activeSlide}
                    originalSlide={aiSlides[activeSlide]}
                    carousel={carousel}
                    onChange={handleSlideChange}
                    onReset={handleSlideReset}
                  />
                )}
              </div>
            </div>

            {/* ── Right: thumbnail strip ── */}
            <div className="flex flex-col gap-2.5 w-24 shrink-0 max-h-[560px] overflow-y-auto pr-0.5">
              {carousel.slides.map((slide, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  title={`Slide ${i + 1}: ${slide.type}`}
                  style={{
                    border: `2px solid ${i === activeSlide ? theme.accent : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 8, overflow: 'hidden', background: 'transparent', padding: 0,
                    cursor: 'pointer', transition: 'border-color 0.2s',
                    position: 'relative', flexShrink: 0,
                  }}
                >
                  {/* Thumbnail via CSS scale */}
                  <div style={{ height: 96, position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                      transform: 'scale(0.178)',
                      transformOrigin: 'top left',
                      width: 540, height: 540,
                      pointerEvents: 'none',
                      position: 'absolute', top: 0, left: 0,
                    }}>
                      <CarouselSlide
                        slide={slide} index={i} total={carousel.slides.length}
                        carousel={carousel}
                        coverImageUrl={i === 0 ? coverImageUrl : undefined}
                        pngUrl={slide.png_url}
                      />
                    </div>
                  </div>
                  <p style={{
                    fontSize: 9, color: i === activeSlide ? theme.accent : 'rgba(255,255,255,0.35)',
                    textAlign: 'center', padding: '3px 0', textTransform: 'capitalize',
                    background: 'rgba(0,0,0,0.4)',
                  }}>
                    {slide.type}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Hint */}
          <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-900/30 border border-gray-800/20 rounded-lg px-4 py-3">
            <span>💡</span>
            <span>After saving, go to <strong className="text-gray-500">Drafts</strong> to select/deselect individual slides and post directly to LinkedIn.</span>
          </div>
        </div>
      )}
    </div>
  );
}
