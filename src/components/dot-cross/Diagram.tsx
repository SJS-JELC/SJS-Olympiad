import type {
  DotCrossState,
  DotCrossElement,
  ElectronSymbol,
  Point,
  DotCrossAnchor,
} from './contracts';
import type { ChargeDestination } from './interaction';
import type { Layout } from './layout.js';
export type DrawingTool = 'atom' | 'dot' | 'cross' | 'triangle' | 'charge' | 'erase';
export interface DiagramPreview {
  readonly kind: string;
  readonly point?: Point | null;
  readonly anchor?: DotCrossAnchor | null;
  readonly element?: DotCrossElement;
  readonly symbol?: ElectronSymbol;
  readonly electronId?: string;
  readonly charge?: number;
}
export function ElectronMark({ symbol, point }: { symbol: ElectronSymbol; point: Point }) {
  return symbol === 'dot' ? (
    <circle className="electron-mark" cx={point.x} cy={point.y} r={2.6} />
  ) : symbol === 'triangle' ? (
    <path
      className="electron-mark triangle-mark"
      d={`M${point.x} ${point.y - 5}L${point.x + 5} ${point.y + 4}L${point.x - 5} ${point.y + 4}Z`}
    />
  ) : (
    <path className="electron-mark" d={`M${point.x - 3.5} ${point.y - 3.5}l7 7m-7 0l7 -7`} />
  );
}
/** Declarative equivalent of original renderer.draw(), with the same ordering/hits/glyphs. */
export function Diagram({
  state,
  layout,
  tool,
  circles,
  selected,
  hover,
  drag,
  chargePreview,
  cursor,
  emptyCenter,
  readOnly,
}: {
  state: DotCrossState;
  layout: Layout;
  tool: DrawingTool;
  circles: boolean;
  selected: readonly string[];
  hover: DotCrossAnchor | null;
  drag: DiagramPreview | null;
  chargePreview: (ChargeDestination & { charge: number }) | null;
  cursor: Point | null;
  emptyCenter: Point;
  readOnly: boolean;
}) {
  const anchor = drag ? drag.anchor : hover,
    electronTool = drag?.symbol || tool;
  const electronSymbols = ['dot', 'cross', 'triangle'];
  const previewState = anchor
    ? {
        ...state,
        electrons: [
          ...state.electrons.filter((e) => e.id !== drag?.electronId),
          { id: '__preview__', symbol: electronTool as ElectronSymbol, anchor },
        ],
      }
    : state;
  const ghost =
    electronSymbols.includes(electronTool) && anchor ? layout.point(previewState, anchor) : null;
  const charge = (group: ChargeDestination & { charge: number; id?: string }, preview = false) => {
    const atoms = state.atoms.filter((a) => group.atomIds.includes(a.id)),
      box = layout.groupBounds(state, group.atomIds);
    if (!box || !atoms.length) return null;
    const local = !group.bracket && atoms.length === 1,
      { x, y, right, bottom } = box;
    const d = `M${x + 10} ${y}H${x}V${bottom}H${x + 10} M${right - 10} ${y}H${right}V${bottom}H${right - 10}`;
    return (
      <g
        key={preview ? 'preview' : group.id}
        className={`${preview ? 'charge-preview' : 'ion-group'}${local ? ' local-charge' : ''}`}
        data-group={preview ? undefined : group.id}
        data-object={preview ? undefined : group.id}
        data-local-atom={local ? atoms[0]!.id : undefined}
        pointerEvents={preview ? 'none' : undefined}
        tabIndex={readOnly || preview ? -1 : 0}
        role={preview ? undefined : 'button'}
        aria-label={
          preview
            ? undefined
            : `${local ? 'Local charge on' : 'Ion group'} ${atoms.map((a) => a.element).join(', ')}, charge ${layout.chargeText(group.charge) || 'zero'}.`
        }
      >
        {group.bracket && (
          <>
            <path d={d} fill="none" stroke="transparent" strokeWidth={16} className="bracket-hit" />
            <path className="bracket-path" d={d} />
          </>
        )}
        <text
          x={local ? atoms[0]!.x + 20 : right + 6}
          y={local ? atoms[0]!.y - 15 : y + 8}
          className="charge-label"
        >
          {layout.chargeText(group.charge)}
        </text>
      </g>
    );
  };
  return (
    <>
      <title>Your dot-and-cross diagram</title>
      <desc>{`${state.atoms.length} atoms, ${state.electrons.length} electrons, ${state.groups.length} bracket groups. Outer-shell circles ${circles ? 'shown' : 'hidden'}.`}</desc>
      {state.groups.map((g) => charge(g))}
      {!readOnly && electronSymbols.includes(tool) && (
        <>
          {state.atoms.map((a) => (
            <circle
              key={`region:${a.id}`}
              cx={a.x}
              cy={a.y}
              r={layout.shellRadius(a) + 12}
              className="region-hit atom-region"
              data-region={JSON.stringify({ kind: 'atom', atomId: a.id })}
              tabIndex={0}
              role="button"
              aria-label={`Non-bonding electron region around ${a.element} atom ${a.id}`}
              fill="transparent"
              stroke="transparent"
              strokeWidth={1}
            />
          ))}
          {layout.nearbyPairs(state).map(([aid, bid]) => {
            const a = state.atoms.find((a) => a.id === aid)!,
              b = state.atoms.find((a) => a.id === bid)!,
              d = layout.lensPath(a, b);
            return d ? (
              <path
                key={`region:${aid}:${bid}`}
                d={d}
                className="region-hit bond-region"
                data-region={JSON.stringify({ kind: 'bond', a: aid, b: bid })}
                tabIndex={0}
                role="button"
                aria-label={`Shared-electron region between atoms ${aid} and ${bid}`}
                fill="transparent"
                stroke="transparent"
                strokeWidth={0}
              />
            ) : null;
          })}
        </>
      )}
      {state.atoms.map((a) => (
        <g
          key={a.id}
          className={`atom${selected.includes(a.id) ? ' selected' : ''}`}
          data-atom={a.id}
          data-object={a.id}
          tabIndex={readOnly ? -1 : 0}
          role="button"
          aria-label={`${a.element} atom ${a.id}${selected.includes(a.id) ? ', selected' : ''}`}
        >
          {circles && <circle cx={a.x} cy={a.y} r={layout.shellRadius(a)} className="shell" />}
          <circle cx={a.x} cy={a.y} r={25} className="atom-hit" />
          <text
            x={a.x}
            y={a.y + 9}
            textAnchor="middle"
            className={`atom-label type-heading element-${a.element}`}
          >
            {a.element}
          </text>
        </g>
      ))}
      {state.electrons.map((e) => {
        if (ghost && drag?.electronId === e.id) return null;
        const p =
          drag?.electronId === e.id && drag.point ? drag.point : layout.point(state, e.anchor);
        if (!p) return null;
        return (
          <g
            key={e.id}
            className="electron"
            data-electron={e.id}
            data-object={e.id}
            tabIndex={readOnly ? -1 : 0}
            role="button"
            aria-label={`${e.symbol} electron, ${e.anchor.kind === 'atom' ? 'non-bonding on ' + e.anchor.atomId : 'shared by ' + e.anchor.a + ' and ' + e.anchor.b}`}
          >
            <circle cx={p.x} cy={p.y} r={8} className="electron-hit" />
            <ElectronMark symbol={e.symbol} point={p} />
          </g>
        );
      })}
      {ghost && (
        <g className="electron-preview" pointerEvents="none" aria-hidden="true">
          <ElectronMark symbol={electronTool as ElectronSymbol} point={ghost} />
        </g>
      )}
      {drag?.kind === 'palette' && drag.point && (
        <g className="drag-ghost" pointerEvents="none" opacity={0.7}>
          {circles && (
            <circle
              cx={drag.point.x}
              cy={drag.point.y}
              r={layout.shellRadius(drag.element!)}
              className="shell"
            />
          )}
          <text
            x={drag.point.x}
            y={drag.point.y + 9}
            textAnchor="middle"
            className={`atom-label type-heading element-${drag.element}`}
          >
            {drag.element}
          </text>
        </g>
      )}
      {drag?.point &&
        ((drag.kind === 'paletteSymbol' && !ghost) ||
          (drag.kind === 'paletteCharge' && !chargePreview)) && (
          <g className="drag-ghost" pointerEvents="none" opacity={0.7}>
            {drag.kind === 'paletteSymbol' ? (
              <ElectronMark symbol={drag.symbol!} point={drag.point} />
            ) : (
              <text
                x={drag.point.x}
                y={drag.point.y + 8}
                textAnchor="middle"
                className="charge-label"
              >
                {layout.chargeText(drag.charge!)}
              </text>
            )}
          </g>
        )}
      {chargePreview && charge(chargePreview, true)}
      {cursor && <path d={`M${cursor.x - 10} ${cursor.y}h20m-10 -10v20`} className="cursor-mark" />}
    </>
  );
}
