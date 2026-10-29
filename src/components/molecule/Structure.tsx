import { useEffect, useMemo, useState } from 'react';
import type { MoleculeGraph } from '../../contracts/molecule';
import { core } from '../../chemistry/molecule/engine';
import { bondLines, displayedGraph, endpoint, labelFor } from '../../chemistry/molecule/depiction';
import type { Representation } from '../../chemistry/molecule/depiction';
export function Structure({
  graph,
  view,
  interactive = false,
  invalid = [],
  onSelect,
  expandHydrogens = true,
}: {
  graph: MoleculeGraph;
  view: Representation;
  interactive?: boolean;
  invalid?: readonly number[];
  onSelect?: (id: number) => void;
  /** Depiction only. False shows exactly the atoms supplied by the caller. */
  expandHydrogens?: boolean;
}) {
  const [font, setFont] = useState(0);
  useEffect(() => {
    let live = true;
    void (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (live) setFont(1);
    });
    return () => {
      live = false;
    };
  }, []);
  const measure = useMemo(() => {
    const context = document.createElement('canvas').getContext('2d');
    const family = getComputedStyle(document.documentElement).getPropertyValue('--font-body').trim();
    return (text: string, size: number) => {
      if (!context) return text.length * size * 0.65;
      context.font = `400 ${size}px ${family || 'sans-serif'}`;
      return context.measureText(text).width;
    };
  }, [font]);
  const drawing = view === 'displayed' && expandHydrogens ? displayedGraph(graph) : graph;
  const labels = new Map(drawing.atoms.map((a) => [a.id, labelFor(a, drawing, view, measure)]));
  return (
    <g className="molecule-structure">
      <g className="molecule-bonds">
        {drawing.bonds.map((b) => {
          const a = drawing.atoms.find((a) => a.id === b.a)!,
            c = drawing.atoms.find((a) => a.id === b.b)!;
          const active = interactive && b.a >= 0 && b.b >= 0;
          return (
            <g
              key={`${b.a}:${b.b}`}
              className={`bond-node${b.a < 0 || b.b < 0 ? ' implicit-hydrogen' : ''}`}
              data-bond={active ? `${b.a}:${b.b}` : undefined}
              tabIndex={active ? 0 : undefined}
              role={active ? 'button' : undefined}
              aria-label={
                active
                  ? `${['Single', 'Double', 'Triple'][b.order - 1]} bond between atom ${b.a} and atom ${b.b}`
                  : undefined
              }
            >
              <line className="bond-hit" x1={a.x} y1={a.y} x2={c.x} y2={c.y} />
              {bondLines(
                endpoint(a, c, labels.get(a.id)!),
                endpoint(c, a, labels.get(c.id)!),
                b.order,
              ).map((line, i) => (
                <line key={i} className="bond-line" {...line} />
              ))}
            </g>
          );
        })}
      </g>
      <g className="molecule-atoms">
        {drawing.atoms.map((a) => {
          const label = labels.get(a.id),
            hs = core.hydrogens(drawing, a);
          const active = interactive && a.id >= 0;
          return (
            <g
              key={a.id}
              data-atom={active ? a.id : undefined}
              className={`atom-node${a.id < 0 ? ' implicit-hydrogen' : ''}${invalid.includes(a.id) ? ' invalid' : ''}`}
              tabIndex={active ? 0 : undefined}
              role={active ? 'button' : undefined}
              aria-label={
                active
                  ? `${core.names[a.element]} atom ${a.id}${hs < 0 ? ', too many bonds' : expandHydrogens ? `, ${hs} implicit hydrogen${hs === 1 ? '' : 's'}` : ''}`
                  : undefined
              }
              onFocus={() => onSelect?.(a.id)}
            >
              <circle className="atom-hit" cx={a.x} cy={a.y} r={24} />
              {label && (
                <text className={`atom-label type-body element-${a.element}`} x={label.x} y={a.y}>
                  {label.chunks
                    .filter((c) => c.text)
                    .map((c, i) => (
                      <tspan key={i} className={c.sub ? 'atom-subscript type-body' : undefined}>
                        {c.text}
                      </tspan>
                    ))}
                  {a.charge ? (
                    <tspan className="atom-charge type-body">{a.charge > 0 ? '+' : '−'}</tspan>
                  ) : null}
                </text>
              )}
              {invalid.includes(a.id) && (
                <text className="invalid-mark type-caption" x={a.x + 26} y={a.y - 20}>
                  !
                </text>
              )}
            </g>
          );
        })}
      </g>
    </g>
  );
}
