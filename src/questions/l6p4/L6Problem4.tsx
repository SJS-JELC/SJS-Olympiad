import type { QuestionViewProps } from '../catalog';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l6p4 } from './definition';
import example from './assets/mo-example.svg';
import homo from './assets/mo-question-homo.svg';
import lumo from './assets/mo-question-lumo.svg';
import empty from './assets/porbitalempty.svg';
import phase1 from './assets/porbitalphase1.svg';
import phase2 from './assets/porbitalphase2.svg';
import './L6Problem4.css';

const positions = [19, 96, 168, 243, 317, 392];
const widths = [46, 41, 45, 46, 46, 46];
export function L6Problem4({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content l6p4-question" data-testid="l6p4-content">
    <QuestionAnswerForm definition={l6p4} attempt={attempt} onAction={onAction} layout="dense">
      {({ disabled, onEdit }) => <>
        <section className="question-brief" aria-label="Question and worked molecular orbital example">
          <div className="l6p4-brief-layout"><div>
            <p>π bonds form by overlap of p orbitals. In-phase overlap gives a bonding interaction; out-of-phase overlap gives an antibonding interaction.</p>
            <p>More bonding interactions mean lower orbital energy.</p>
            <p>Buta-1,3-diene has four p orbitals (one electron each), forming four molecular orbitals. The lowest has three bonding interactions; the highest has none.</p>
            <p>Click on the orbitals below to show the molecular orbitals of hexa-1,3,5-triene.</p>
          </div><img src={example} alt="Buta-1,3-diene molecular orbital example, from lowest to highest energy" /></div>
        </section>
        <div className="l6p4-orbital-answers">{l6p4.parts.map(part => <div className="l6p4-orbital" key={part.id} role="group" aria-label={part.id + ' phases'}>
          <img className="l6p4-orbital-reference" src={part.id === 'HOMO' ? homo : lumo} alt={part.id + ' hexa-1,3,5-triene skeleton'} />
          {part.fields.map((field, index) => {
            const value = attempt.answers[field.id];
            return <button key={field.id} type="button" className="l6p4-phase" disabled={disabled}
              aria-label={field.label + ': ' + (value ? 'phase ' + value : 'not selected') + '. Change phase.'}
              style={{ left: (part.id === 'LUMO' ? [20, 97, 170, 243, 317, 392][index] : positions[index]) / 448 * 100 + '%', top: (index % 2 === 0 ? 50 : 25) / 169 * 100 + '%', width: widths[index] / 448 * 100 + '%' }}
              onClick={() => onEdit(field.id, value === '1' ? '2' : '1')}>
              <img src={value === '1' ? phase1 : value === '2' ? phase2 : empty} alt="" />
            </button>;
          })}
        </div>)}</div>
      </>}
    </QuestionAnswerForm>
  </div>;
}
