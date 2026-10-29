import { QuestionHeading } from './QuestionHeading';
import backArrow from '../assets/powerapp/backarrow.svg';
import '../background.css';
import '../splash.css';
import './TheoryQuestionPreview.css';

/** Temporary visual controls only; contains no competition question or marking. */
export function TheoryQuestionPreview({ question, onBack, backLabel = 'Back to theory' }: {
  question: number;
  onBack: () => void;
  backLabel?: string;
}) {
  return <div className="splash-preview">
    <main className="question-preview">
      <header className="question-preview-header">
        <div className="question-preview-title"><QuestionHeading title={`Question ${question}`} /></div>
        <button className="question-preview-back" type="button" onClick={onBack} aria-label={backLabel}>
          <img src={backArrow} alt="" />
        </button>
      </header>
      <section className="question-preview-panel" aria-label={`Question ${question} preview controls`}>
        <p>This question has not been recreated yet. Open Problem 5 to try Twist and Bump.</p>
      </section>
    </main>
  </div>;
}
