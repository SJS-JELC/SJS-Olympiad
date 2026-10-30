import { useEffect, useRef, type ReactNode } from 'react';
import { Score } from '../components/Score';
import { QuestionHeading } from '../components/QuestionHeading';
import eagle from '../assets/powerapp/asset-30.svg';
import { ArtworkBackButton, TeacherSettingsButton } from '../components/SharedNavigation';
import type { QuestionDefinition } from './attempts';
import '../background.css';
import '../splash.css';
import './questions.css';

export function QuestionShell({ definition, score, onBack, onSettings, backLabel = 'Back to theory', children }: {
  definition: QuestionDefinition; score: number; onBack: () => void; onSettings?: () => void; backLabel?: string; children: ReactNode;
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const removeTooltips = () => {
      page.querySelectorAll<HTMLElement>('[title]').forEach(element => {
        const title = element.getAttribute('title');
        if (title && !element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby') && !element.getAttribute('alt')) element.setAttribute('aria-label', title);
        element.removeAttribute('title');
      });
      // Inline SVG titles are native hover tooltips too; retain their accessible name.
      page.querySelectorAll('svg > title').forEach(title => {
        const svg = title.parentElement;
        if (svg && !svg.getAttribute('aria-label')) {
          svg.setAttribute('aria-label', title.textContent ?? '');
          if (svg.getAttribute('aria-labelledby') === title.id) svg.removeAttribute('aria-labelledby');
        }
        title.remove();
      });
    };
    removeTooltips();
    const observer = new MutationObserver(removeTooltips);
    observer.observe(page, { childList: true, subtree: true, attributes: true, attributeFilter: ['title'] });
    return () => observer.disconnect();
  }, []);
  const artwork = definition.headerArtwork;
  return <div ref={pageRef} className="splash-preview question-page score-page"
    onDragStartCapture={event => {
      if (event.target instanceof Element && event.target.closest('img, svg') && !event.target.closest('[data-allow-image-save]')) event.preventDefault();
    }}
    onContextMenuCapture={event => {
      if (event.target instanceof Element && event.target.closest('img, svg') && !event.target.closest('[data-allow-image-save]')) event.preventDefault();
    }}>
    <div className="score-position question-score"><Score value={score} /></div>
    <main className="question-stage">
      <header className="question-header">
        <div className="question-identity"><img className={`question-eagle ${artwork?.className ?? ''}`} src={artwork?.src ?? eagle} alt={artwork?.alt ?? 'St John’s Olympiad eagle'} draggable={false} /><div className="question-title-panel"><QuestionHeading year={definition.year} number={definition.number} title={definition.title} /></div></div>
        <div className="question-navigation">{onSettings && <TeacherSettingsButton onClick={onSettings} />}<ArtworkBackButton className="question-back" onClick={onBack} label={backLabel} /></div>
      </header>
      {children}
    </main>
  </div>;
}
