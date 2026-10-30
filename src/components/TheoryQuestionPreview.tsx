import { QuestionHeading } from './QuestionHeading';
import { ArtworkBackButton, TeacherSettingsButton } from './SharedNavigation';
import '../background.css';
import '../splash.css';
import './TheoryQuestionPreview.css';

/** Temporary visual controls only; contains no competition question or marking. */
export function TheoryQuestionPreview({ question, onBack, onSettings, backLabel = 'Back to theory' }: {
  question: number;
  onBack: () => void;
  backLabel?: string;
  onSettings?: () => void;
}) {
  return <div className="splash-preview">
    <main className="question-preview">
      <header className="question-preview-header">
        <div className="question-preview-title"><QuestionHeading title={`Question ${question}`} /></div>
        <div className="question-preview-navigation">{onSettings && <TeacherSettingsButton onClick={onSettings} />}<ArtworkBackButton className="question-preview-back" onClick={onBack} label={backLabel} /></div>
      </header>
      <section className="question-preview-panel" aria-label={`Question ${question} preview controls`}>
        <p>This question is not available for the selected event year.</p>
      </section>
    </main>
  </div>;
}
