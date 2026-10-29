import { useId } from 'react';
import './ScientificDiagram.css';

type DiagramLabels = { viewBox: string; labels: readonly { text: string; x: number; y: number; role: string }[] };
/** Geometry stays immutable; all visible lettering uses central app typography. */
export function ScientificDiagram({ geometry, data, description, viewBox }: { geometry: string; data: DiagramLabels; description: string; viewBox?: string }) {
  const titleId = useId();
  const [, , width, height] = data.viewBox.split(' ').map(Number);
  return <svg className="scientific-diagram" viewBox={viewBox ?? data.viewBox} role="img" aria-labelledby={titleId}>
    <title id={titleId}>{description}</title>
    <image href={geometry} width={width} height={height} />
    {data.labels.map((label, index) => <text key={index} className={label.role === 'caption' ? 'type-caption' : 'type-body'} data-label-kind={label.role} x={label.x} y={label.y}>{label.text}</text>)}
  </svg>;
}
