import type { CarouselSlide } from '../types';

export interface CarouselTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  slideTypes: CarouselSlide['type'][];
  hint: string; // injected into AI prompt
}

export const CAROUSEL_TEMPLATES: CarouselTemplate[] = [
  {
    id: 'five-point-list',
    name: '5-Point List',
    description: 'Cover → 4 key takeaways in list format → CTA. Perfect for step-by-step breakdowns.',
    icon: '📋',
    slideTypes: ['cover', 'list', 'list', 'list', 'list', 'cta'],
    hint: 'Structure: 1 cover slide, then 4 list slides each with a distinct heading and 3-4 bullet points, ending with 1 cta slide.',
  },
  {
    id: 'before-after',
    name: 'Before / After',
    description: 'Cover → Problem → 2 Insights (transformation) → CTA. Great for showing change.',
    icon: '🔄',
    slideTypes: ['cover', 'problem', 'insight', 'insight', 'cta'],
    hint: 'Structure: 1 cover, 1 problem slide showing the challenge, 2 insight slides showing the solution/transformation, 1 cta slide.',
  },
  {
    id: 'stat-story',
    name: 'Stat Story',
    description: 'Cover → Stat → Insight → List → CTA. Data-driven narrative for authority content.',
    icon: '📊',
    slideTypes: ['cover', 'stat', 'insight', 'list', 'cta'],
    hint: 'Structure: 1 cover, 1 stat slide with a real number from the content, 1 insight explaining the stat, 1 list slide with implications, 1 cta.',
  },
  {
    id: 'quote-carousel',
    name: 'Quote Carousel',
    description: 'Cover → 3 powerful quotes → CTA. Ideal for thought leadership and inspiration.',
    icon: '💬',
    slideTypes: ['cover', 'quote', 'quote', 'quote', 'cta'],
    hint: 'Structure: 1 cover, 3 quote slides each with a distinct impactful pull-quote from the content, 1 cta slide.',
  },
];
