import type { QuestionViewProps } from '../catalog';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l6p4 } from './definition';
import './L6Problem4.css';

import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
export interface L6P4Presentation extends PresentationPayload {
  renderer: 'L6P4'; paragraphs: readonly string[]; briefLabel: string; exampleDescription: string; exampleAsset: string;
  choiceAssets: Readonly<Record<string, string>>; valueLabel: string; unselectedLabel: string; changeLabel: string;
  panels: readonly { id: string; groupLabel: string; assetId: string; description: string; viewWidth: number; viewHeight: number; positions: readonly (readonly [number, number, number])[] }[];
}
export function L6Problem4({ attempt, onAction, presentation }: QuestionViewProps) {
  const { record: { presentation: content }, assets } = requirePresentation<L6P4Presentation>(presentation, 'L6P4');
  const definition = presentedDefinition(l6p4, content);
  return <div className="question-content l6p4-question" data-testid="l6p4-content">
    <QuestionAnswerForm definition={definition} attempt={attempt} onAction={onAction} layout="dense">
      {({ disabled, onEdit }) => <>
        <section className="question-brief" aria-label={content.briefLabel}>
          <div className="l6p4-brief-layout"><div>
            {content.paragraphs.map((text, index) => <p key={index}>{text}</p>)}
          </div><img src={assets[content.exampleAsset]} alt={content.exampleDescription} /></div>
        </section>
        <div className="l6p4-panel-answers">{definition.parts.map((part, partIndex) => <div className="l6p4-panel" key={part.id} role="group" aria-label={content.panels[partIndex].groupLabel}>
          <img className="l6p4-panel-reference" src={assets[content.panels[partIndex].assetId]} alt={content.panels[partIndex].description} />
          {part.fields.map((field, index) => {
            const value = attempt.answers[field.id];
            return <button key={field.id} type="button" className="l6p4-choice" disabled={disabled}
              aria-label={field.label + ': ' + (value ? content.valueLabel + value : content.unselectedLabel) + content.changeLabel}
              style={{ left: content.panels[partIndex].positions[index][0] / content.panels[partIndex].viewWidth * 100 + '%', top: content.panels[partIndex].positions[index][1] / content.panels[partIndex].viewHeight * 100 + '%', width: content.panels[partIndex].positions[index][2] / content.panels[partIndex].viewWidth * 100 + '%' }}
              onClick={() => onEdit(field.id, value === '1' ? '2' : '1')}>
              <img src={assets[content.choiceAssets[value === '1' || value === '2' ? value : 'empty']]} alt="" />
            </button>;
          })}
        </div>)}</div>
      </>}
    </QuestionAnswerForm>
  </div>;
}
