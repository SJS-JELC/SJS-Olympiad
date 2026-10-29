import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u6p8 } from './definition';
import diagram1 from './assets/sn1-mechanism.svg';
import diagram2 from './assets/sn2-mechanism.svg';
import './U6Problem8.css';

export function U6Problem8({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--dense u6p8-question">
    <section className="question-brief" aria-label="Question">
      <p className="type-body">{"The reaction below can take place via an SN1 or an SN2 mechanism."}</p>
      <p className="type-body">{"Given the initial rate data, calculate, to 3 significant figures, the percentage of the bromoethane that proceeds via each mechanism in experiment 1."}</p>
      <table className="u6p8-rate-data type-body" aria-label="Initial rate data">
        <thead><tr><th scope="col">Experiment</th><th scope="col">[CH₃CH₂Br] / mol dm<sup>−3</sup></th><th scope="col">[OH<sup>−</sup>] / mol dm<sup>−3</sup></th><th scope="col">Rate / mol dm<sup>−3</sup> s<sup>−1</sup></th></tr></thead>
        <tbody>
          <tr><th scope="row">1</th><td>0.1</td><td>0.3</td><td>3.20 × 10<sup>−5</sup></td></tr>
          <tr><th scope="row">2</th><td>0.2</td><td>0.3</td><td>6.40 × 10<sup>−5</sup></td></tr>
          <tr><th scope="row">3</th><td>0.2</td><td>0.6</td><td>8.94 × 10<sup>−5</sup></td></tr>
        </tbody>
      </table>
      <div className="u6p8-diagrams">
      <figure className="u6p8-diagram u6p8-diagram-1"><figcaption className="type-label">SN 1 Mechanism</figcaption><div className="u6p8-reaction"><img src={diagram1} alt="SN1 mechanism for bromoethane reacting with hydroxide. The first ionisation step is labelled SLOW." /><svg className="u6p8-slow" viewBox="0 0 1453.52 324.93" aria-hidden="true"><text className="type-label" x="405" y="235">SLOW</text></svg></div></figure>
      <figure className="u6p8-diagram u6p8-diagram-2"><figcaption className="type-label">SN 2 Mechanism</figcaption><img src={diagram2} alt="SN2 mechanism for bromoethane reacting with hydroxide." /></figure></div>
    </section>
    <QuestionAnswerForm layout="inline" definition={u6p8} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u6p8-answers">
        <label className="u6p8-answer type-label" htmlFor="u6p8-sn1">
          <span>SN1 (%)</span>
          <AnswerInput aria-label="SN1 (%)" unit="%" id="u6p8-sn1" name="sn1" value={attempt.answers.sn1 ?? ''} inputMode="decimal" maxLength={6} disabled={disabled}
            onValueChange={value => onEdit('sn1', value)} />
        </label>
        <label className="u6p8-answer type-label" htmlFor="u6p8-sn2">
          <span>SN2 (%)</span>
          <AnswerInput aria-label="SN2 (%)" unit="%" id="u6p8-sn2" name="sn2" value={attempt.answers.sn2 ?? ''} inputMode="decimal" maxLength={6} disabled={disabled}
            onValueChange={value => onEdit('sn2', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
