import './TwistAndBump.css';
import type { Attempt, AttemptAction } from '../attempts';
import { AnswerPart } from '../AnswerPart';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l6p5 } from './definition';
import { ScientificDiagram } from '../../components/ScientificDiagram';
import example from './assets/newman-example-geometry.svg';
import question from './assets/newman-question-geometry.svg';
import exampleLabels from './assets/newman-example-labels.json';
import questionLabels from './assets/newman-question-labels.json';

export function TwistAndBump({ attempt, onAction }: { attempt: Attempt; onAction: (action: AttemptAction) => void }) {
  return <div className="question-content question-content--aligned l6p5-question" data-testid="l6p5-content">
    <section className="question-brief" aria-label="Question and diagrams">
      <p>As a molecule rotates about a single bond, it adopts a range of different conformations, some of which are more stable than others.</p>
      <p>For each of the molecules shown, consider the view along the indicated C–C bond from left to right (i.e. the front carbon is on the left). As the bond rotates, the back carbon turns clockwise relative to the front.</p>
      <p>Suggest the angle(s) of rotation that give the most and least stable conformations.</p>
      <figure className="newman-example"><ScientificDiagram geometry={example} viewBox="0 0 1000 296" data={{ ...exampleLabels, labels: exampleLabels.labels.filter(label => label.role === 'atom') }} description="Worked Newman projection example: view from left to right along the carbon–carbon bond, with the back carbon rotating clockwise. The most stable conformation is at 0 degrees and the least stable at 180 degrees." /><figcaption className="newman-conformations type-body"><p>Most Stable<br />Conformation: 0°</p><p>Least Stable<br />Conformation: 180°</p></figcaption></figure>
      <figure className="newman-question"><ScientificDiagram geometry={question} data={questionLabels} description="The three molecules to solve, corresponding to Molecules 1, 2 and 3 from left to right, with their indicated carbon–carbon bonds." /></figure>
    </section>
    <QuestionAnswerForm definition={l6p5} attempt={attempt} onAction={onAction} layout="inline">
      {({ disabled, onEdit }) => <div className="newman-answers">
        <div className="newman-row-labels type-label" aria-hidden="true"><span>Most stable</span><span>Least stable</span></div>
        <div className="question-answer-grid">{l6p5.parts.map(part => <AnswerPart key={part.id} part={part} answers={attempt.answers} correct={false} wrong={false} disabled={disabled} onEdit={onEdit} />)}</div>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
