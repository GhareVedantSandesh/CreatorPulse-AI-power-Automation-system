import { CAROUSEL_TEMPLATES, type CarouselTemplate } from './templates/index';
import { THEMES } from './types';

interface TemplateLibraryProps {
  selectedId: string | null;
  onSelect: (template: CarouselTemplate | null) => void;
  colorTheme?: keyof typeof THEMES;
}

export function TemplateLibrary({ selectedId, onSelect, colorTheme = 'indigo' }: TemplateLibraryProps) {
  const theme = THEMES[colorTheme] ?? THEMES.indigo;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Choose a structure — AI fills your content into the chosen template.
        </p>
        {selectedId && (
          <button
            onClick={() => onSelect(null)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Clear selection
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CAROUSEL_TEMPLATES.map(tpl => {
          const isSelected = selectedId === tpl.id;
          return (
            <button
              key={tpl.id}
              onClick={() => onSelect(isSelected ? null : tpl)}
              className="text-left rounded-xl border p-4 transition-all duration-200 group"
              style={{
                borderColor: isSelected ? theme.accent : 'rgba(255,255,255,0.08)',
                background: isSelected
                  ? `linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(124,58,237,0.08) 100%)`
                  : 'rgba(255,255,255,0.02)',
                boxShadow: isSelected ? `0 0 0 1px ${theme.accent}40` : 'none',
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{tpl.icon}</span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: isSelected ? theme.accent : 'rgba(255,255,255,0.85)' }}
                  >
                    {tpl.name}
                  </span>
                </div>
                {/* Slide count badge */}
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: isSelected ? theme.tag : 'rgba(255,255,255,0.06)',
                    color: isSelected ? theme.accent : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {tpl.slideTypes.length} slides
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-500 leading-relaxed mb-3">{tpl.description}</p>

              {/* Slide type pills */}
              <div className="flex flex-wrap gap-1">
                {tpl.slideTypes.map((type, i) => (
                  <span
                    key={i}
                    className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded capitalize"
                    style={{
                      background: isSelected ? theme.tag : 'rgba(255,255,255,0.05)',
                      color: isSelected ? theme.accent : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {type}
                  </span>
                ))}
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <div
                  className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold"
                  style={{ color: theme.accent }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
                    style={{ background: theme.accent, color: '#000' }}
                  >
                    ✓
                  </span>
                  Template selected — generate to apply
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
