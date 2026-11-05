import './TwistAndBump.css';
import type { QuestionViewProps } from '../catalog';
import { AnswerPart } from '../AnswerPart';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l6p5 } from './definition';
import { ScientificDiagram } from '../../components/ScientificDiagram';
import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
type DiagramLabels={viewBox:string;labels:readonly {text:string;x:number;y:number;role:string}[]};
export interface TwistAndBumpPresentation extends PresentationPayload {
 renderer:'L6P5';paragraphs:string[];exampleLabels:DiagramLabels;questionLabels:DiagramLabels;
 descriptions:string[];captions:string[];rowLabels:string[];briefLabel:string;exampleViewBox:string;
}
export function TwistAndBump({ attempt, onAction, presentation }:QuestionViewProps) {
 const {record:{presentation:content},assets}=requirePresentation<TwistAndBumpPresentation>(presentation,'L6P5');
 const definition=presentedDefinition(l6p5,content);
 return <div className="question-content question-content--aligned l6p5-question" data-testid="l6p5-content">
  <section className="question-brief" aria-label={content.briefLabel}>
   {content.paragraphs.map((text,index)=><p key={index}>{text}</p>)}
   <figure className="l6p5-example"><ScientificDiagram geometry={assets.example} viewBox={content.exampleViewBox} data={{...content.exampleLabels,labels:content.exampleLabels.labels.filter(label=>label.role==='atom')}} description={content.descriptions[0]}/><figcaption className="l6p5-captions type-body"><p>{content.captions[0]}<br/>{content.captions[1]}</p><p>{content.captions[2]}<br/>{content.captions[3]}</p></figcaption></figure>
   <figure className="l6p5-diagram"><ScientificDiagram geometry={assets.question} data={content.questionLabels} description={content.descriptions[1]}/></figure>
  </section>
  <QuestionAnswerForm definition={definition} attempt={attempt} onAction={onAction} layout="inline">
   {({disabled,onEdit})=><div className="l6p5-answers"><div className="l6p5-row-labels type-label" aria-hidden="true"><span>{content.rowLabels[0]}</span><span>{content.rowLabels[1]}</span></div><div className="question-answer-grid">{definition.parts.map(part=><AnswerPart key={part.id} part={part} answers={attempt.answers} correct={false} wrong={false} disabled={disabled} onEdit={onEdit}/>)}</div></div>}
  </QuestionAnswerForm>
 </div>;
}
