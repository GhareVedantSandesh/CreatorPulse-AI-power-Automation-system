import React from 'react';
import type { CarouselSlide as SlideType, CarouselData } from './types';
import { THEMES } from './types';

interface SlideProps {
  slide: SlideType;
  index: number;
  total: number;
  carousel: CarouselData;
  dimmed?: boolean;
  coverImageUrl?: string; // Phase 3: optional cover background
  pngUrl?: string; // Phase 4: rendered slide image from storage
}

const SLIDE_SIZE = 540;

export function CarouselSlide({ slide, index, total, carousel, dimmed = false, coverImageUrl }: SlideProps) {
  const theme = THEMES[carousel.color_theme] ?? THEMES.indigo;
  const slideNumber = `${index + 1} / ${total}`;

  const baseStyle: React.CSSProperties = {
    width: SLIDE_SIZE,
    height: SLIDE_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    background: theme.slideBg,
    color: theme.text,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '48px',
    boxSizing: 'border-box',
    userSelect: 'none',
    opacity: dimmed ? 0.35 : 1,
    transition: 'opacity 0.2s',
  };

  if (pngUrl) {
    return (
      <div style={{ ...baseStyle, padding: 0, border: 'none' }} className="carousel-slide">
        <img 
          src={pngUrl} 
          alt={`Slide ${index + 1}`} 
          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
        />
      </div>
    );
  }

  const numBadge = (
    <span style={{ position: 'absolute', bottom: 24, right: 28, fontSize: 12, color: theme.muted, letterSpacing: 1 }}>
      {slideNumber}
    </span>
  );

  const accentLine = (
    <span style={{ display: 'block', width: 40, height: 3, background: theme.accent, borderRadius: 2, marginBottom: 20 }} />
  );

  switch (slide.type) {
    case 'cover':
      return (
        <div style={baseStyle} className="carousel-slide">
          {/* Phase 3: background photo (upload or unsplash) */}
          {coverImageUrl && (
            <img
              src={coverImageUrl}
              alt="cover"
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', opacity: 0.35,
              }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          {/* Theme gradient overlay — stronger when no photo, lighter when photo present */}
          <div style={{
            position: 'absolute', inset: 0,
            background: theme.gradient,
            opacity: coverImageUrl ? 0.72 : 0.92,
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span style={{
              display: 'inline-block', background: theme.tag,
              color: theme.accent, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: 2,
              padding: '4px 12px', borderRadius: 20, marginBottom: 20,
            }}>
              {carousel.cover_keyword}
            </span>
            <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.15, margin: 0, marginBottom: 16 }}>
              {slide.title}
            </h1>
            {slide.subtitle && (
              <p style={{ fontSize: 16, color: theme.muted, margin: 0, lineHeight: 1.5 }}>
                {slide.subtitle}
              </p>
            )}
          </div>
          {numBadge}
        </div>
      );

    case 'problem':
      return (
        <div style={baseStyle} className="carousel-slide">
          {accentLine}
          <span style={{ fontSize: 11, color: theme.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
            The Challenge
          </span>
          <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, marginBottom: 16, lineHeight: 1.2 }}>
            {slide.heading}
          </h2>
          {slide.body && <p style={{ fontSize: 16, color: theme.muted, lineHeight: 1.65, margin: 0 }}>{slide.body}</p>}
          {numBadge}
        </div>
      );

    case 'stat':
      return (
        <div style={{ ...baseStyle, alignItems: 'flex-start', justifyContent: 'center' }} className="carousel-slide">
          {accentLine}
          <div style={{
            fontSize: 88, fontWeight: 900, lineHeight: 1,
            background: theme.gradient, WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent', marginBottom: 8,
          }}>
            {slide.number}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{slide.label}</div>
          {slide.context && <p style={{ fontSize: 14, color: theme.muted, margin: 0, lineHeight: 1.6 }}>{slide.context}</p>}
          {numBadge}
        </div>
      );

    case 'insight':
      return (
        <div style={baseStyle} className="carousel-slide">
          {accentLine}
          <span style={{ fontSize: 11, color: theme.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
            Key Insight
          </span>
          <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, marginBottom: 16, lineHeight: 1.2 }}>{slide.heading}</h2>
          {slide.body && <p style={{ fontSize: 16, color: theme.muted, lineHeight: 1.65, margin: 0 }}>{slide.body}</p>}
          {numBadge}
        </div>
      );

    case 'list':
      return (
        <div style={baseStyle} className="carousel-slide">
          {accentLine}
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, marginBottom: 24, lineHeight: 1.2 }}>{slide.heading}</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(slide.points || []).map((pt, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 15, lineHeight: 1.5 }}>
                <span style={{
                  flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
                  background: theme.tag, color: theme.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                }}>{i + 1}</span>
                <span style={{ color: theme.muted }}>{pt}</span>
              </li>
            ))}
          </ul>
          {numBadge}
        </div>
      );

    case 'quote':
      return (
        <div style={{ ...baseStyle, justifyContent: 'center', alignItems: 'flex-start' }} className="carousel-slide">
          <span style={{ fontSize: 72, lineHeight: 0.8, color: theme.accent, marginBottom: 20, fontFamily: 'Georgia, serif' }}>❝</span>
          <p style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>{slide.body}</p>
          {numBadge}
        </div>
      );

    case 'cta':
      return (
        <div style={{ ...baseStyle, alignItems: 'center', textAlign: 'center' }} className="carousel-slide">
          <div style={{ position: 'absolute', inset: 0, background: theme.gradient, opacity: 0.75 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span style={{ display: 'block', width: 40, height: 3, background: theme.accent, borderRadius: 2, margin: '0 auto 20px' }} />
            <p style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 16, lineHeight: 1.4 }}>{slide.text}</p>
            {slide.action && (
              <span style={{
                display: 'inline-block',
                background: 'rgba(255,255,255,0.15)',
                border: `1.5px solid ${theme.accent}`,
                color: theme.accent,
                padding: '10px 24px', borderRadius: 30,
                fontSize: 14, fontWeight: 600,
              }}>{slide.action}</span>
            )}
          </div>
          {numBadge}
        </div>
      );

    default:
      return (
        <div style={baseStyle} className="carousel-slide">
          <p style={{ color: theme.muted }}>Unknown slide type: {slide.type}</p>
          {numBadge}
        </div>
      );
  }
}
