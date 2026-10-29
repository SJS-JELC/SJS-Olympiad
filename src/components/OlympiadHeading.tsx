import { useId } from 'react';
import './OlympiadHeading.css';

type OlympiadHeadingProps = {
  lines: readonly [string, ...string[]];
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  as?: 'span';
  shadow?: boolean;
  variant?: 'display' | 'score';
};

/** Shared 04b_19 styles: inset display headings or white/black outlined score lettering. */
export function OlympiadHeading({ lines, level = 2, shadow = true, as, variant = 'display' }: OlympiadHeadingProps) {
  const filterId = 'olympiad-heading-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const artWidth = variant === 'score' ? Math.max(...lines.map(line => line.length)) * 38 : 350;
  const Heading = as ?? (('h' + level) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6');
  return <Heading className={`olympiad-heading olympiad-heading--${variant} type-${variant === 'score' ? 'outlined' : 'display'}`} aria-label={lines.join(' ')} style={shadow ? { filter: variant === 'score' ? 'drop-shadow(0 var(--outlined-shadow-offset, 3px) 0 #303030)' : `url('#${filterId}')` } : undefined}>
    {shadow && <svg className="olympiad-heading__definitions" aria-hidden="true" focusable="false"><defs>
      <filter id={filterId} x="-5%" y="-10%" width="110%" height="130%" colorInterpolationFilters="sRGB">
        {variant === 'score' ? <feDropShadow dx="0" dy="3" stdDeviation="0" floodColor="#303030" /> : <>
        <feOffset in="SourceAlpha" dx="0" dy="3" result="drop-mask" />
        <feFlood floodColor="#303030" />
        <feComposite in2="drop-mask" operator="in" result="drop-shadow" />
        <feComponentTransfer in="SourceAlpha"><feFuncA type="table" tableValues="1 0" /></feComponentTransfer>
        <feGaussianBlur stdDeviation="1.25" />
        <feOffset dx="-1.3" dy="-1.3" />
        <feComposite in2="SourceAlpha" operator="in" result="inner-edge" />
        <feFlood floodColor="#969696" floodOpacity="0.8" />
        <feComposite in2="inner-edge" operator="in" result="inner-shadow" />
        <feMerge><feMergeNode in="drop-shadow" /><feMergeNode in="SourceGraphic" /><feMergeNode in="inner-shadow" /></feMerge>
        </>}
      </filter>
    </defs></svg>}
    <svg className="olympiad-heading__art" viewBox={`0 0 ${artWidth} ${lines.length * 60}`} aria-hidden="true" focusable="false">
      {/* Centre the 54-unit visible glyph height, allowing for the 3-unit shadow. */}
      {lines.map((line, index) => <text key={index} x={artWidth / 2} textAnchor="middle" y={(shadow ? 55.5 : 57) + index * 60} textLength={artWidth - (variant === 'score' ? 3.4 : 10)} lengthAdjust="spacingAndGlyphs">{line.toUpperCase()}</text>)}
    </svg>
  </Heading>;
}
