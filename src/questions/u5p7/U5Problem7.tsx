import type { QuestionViewProps } from '../catalog';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { MoleculeEditor } from '../../components/molecule/MoleculeEditor';
import { ScientificDiagram } from '../../components/ScientificDiagram';
import { u5p7 } from './definition';
import { p7Limits, readP7Drawing, serializeP7Drawing, valence, type Drawing } from './model';
import productGeometry from './assets/ozonolysis-products.svg';
import productLabels from './assets/ozonolysis-products.labels.json';
import './U5Problem7.css';

/** An unusually large old draft stays intact instead of disappearing into a blank canvas. */
function LegacyDrawingPreview({ drawing }: { drawing: Drawing }) {
  return <section className="cut-legacy" aria-label="Saved molecular drawings">
    <p className="type-caption" role="status">Your saved structures exceed the canvas limit and are shown read-only. They have been preserved.</p>
    <div className="cut-legacy-grid">{drawing.graphs.filter(g => g.atoms.length).map((g, index) => {
      const left = Math.min(...g.atoms.map(a => a.x)) - 45, top = Math.min(...g.atoms.map(a => a.y)) - 35;
      const width = Math.max(...g.atoms.map(a => a.x)) - left + 45, height = Math.max(...g.atoms.map(a => a.y)) - top + 35;
      return <svg key={index} viewBox={`${left} ${top} ${width} ${height}`} role="img" aria-label={`Saved structure ${index + 1}`}>
        {g.bonds.map(b => {
          const a = g.atoms.find(a => a.id === b.a)!, c = g.atoms.find(a => a.id === b.b)!;
          return <g key={`${b.a}:${b.b}`}><line x1={a.x} y1={a.y} x2={c.x} y2={c.y} />
            {b.order === 2 && <line x1={a.x} y1={a.y + 5} x2={c.x} y2={c.y + 5} />}</g>;
        })}
        {g.atoms.map(a => {
          const h = 4 - valence(g, a.id), label = `C${h ? `H${h > 1 ? ['₀', '₁', '₂', '₃', '₄'][h] : ''}` : ''}`;
          return <g key={a.id}><rect x={a.x - 24} y={a.y - 15} width="48" height="30" />
            <text x={a.x} y={a.y + 6} className="type-body">{label}</text></g>;
        })}
      </svg>;
    })}</div>
  </section>;
}

export function U5Problem7({ attempt, onAction }: QuestionViewProps) {
  const drawing = readP7Drawing(attempt.answers.drawings);
  return <div className="question-content question-content--aligned cut-question" data-testid="u5p7-content">
    <section className="question-brief" aria-label="Question">
      <p>Ozonolysis cuts a C=C bond and replaces it with two C=O bonds. The attached groups stay in place; cutting a double bond in a ring can open the ring.</p>
      <p>X has formula C₁₀H₁₆, two C=C bonds and no triple bonds. Cutting both double bonds gives one molecule of each product below.</p>
      <p>Draw all possible structures of X.</p>
      <figure className="cut-products"><ScientificDiagram geometry={productGeometry} data={productLabels}
        description="Ozonolysis products: one methanal molecule and OHC–CH₂–CH[C(=O)CH₃]–CH₂–CH₂–C(=O)–CH₃. Every carbon, hydrogen and oxygen atom is displayed." /></figure>
    </section>
    <QuestionAnswerForm definition={u5p7} attempt={attempt} onAction={onAction} layout="aligned" autoFocusAnswer={false} className="cut-form">
      {({ disabled, onEdit }) => drawing.kind === 'legacy-readonly' ? <LegacyDrawingPreview drawing={drawing.drawing} /> :
        <MoleculeEditor value={drawing.state} readOnly={disabled} limits={p7Limits}
          elements={['C', 'H', 'O']} representations={['displayed']} explicitHydrogensOnly
          label="Structures of X" onChange={state => onEdit('drawings', serializeP7Drawing(state))} />}
    </QuestionAnswerForm>
  </div>;
}
