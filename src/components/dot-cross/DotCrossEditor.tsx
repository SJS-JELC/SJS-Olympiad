import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import type {
  DotCrossState,
  DotCrossElement,
  DotCrossAnchor,
  ElectronSymbol,
  Point,
} from './contracts';
interface EditorSurfaceProps { part: {kind:'dot-and-cross'; initial:DotCrossState; markingPolicyId:string}; response:DotCrossState; readOnly:boolean; onResponse:(state:DotCrossState)=>void; workspaceAside?:import('react').ReactNode }
import { dotCrossEngine, type DotCrossCommand } from './engine';
import { createLayout, type ElectronRegion } from './layout.js';
const editorLayoutQuestionId = (_id:string) => 'n2o';
import {
  adaptiveView,
  clampPoint,
  snapPoint,
  chargeDestination,
  dragDelta,
  type ChargeDestination,
} from './interaction';
import { Diagram, type DrawingTool, type DiagramPreview } from './Diagram';
import './editor.css';
// Original initial HTML palette followed by full-bank app.js append order; no atom-count hints.
const palette: readonly DotCrossElement[] = [
  'H',
  'C',
  'N',
  'O',
  'F',
  'Cl',
  'Na',
  'Mg',
  'Ca',
  'Br',
  'I',
  'S',
  'Si',
  'K',
  'Li',
  'Al',
  'B',
  'P',
];
const names: Record<DotCrossElement, string> = {
  H: 'Hydrogen',
  C: 'Carbon',
  N: 'Nitrogen',
  O: 'Oxygen',
  F: 'Fluorine',
  Cl: 'Chlorine',
  Na: 'Sodium',
  Mg: 'Magnesium',
  Ca: 'Calcium',
  Br: 'Bromine',
  I: 'Iodine',
  S: 'Sulfur',
  Si: 'Silicon',
  K: 'Potassium',
  Li: 'Lithium',
  Al: 'Aluminium',
  B: 'Boron',
  P: 'Phosphorus',
};
interface Drag extends DiagramPreview {
  readonly pointerId: number;
  readonly capture: Element;
  readonly start: Point;
  readonly client: Point;
  readonly before: DotCrossState;
  readonly clickTarget: Element;
  readonly ids?: readonly string[];
  readonly atomId?: string;
  readonly groupId?: string;
  moved: boolean;
  point: Point | null;
  anchor: DotCrossAnchor | null;
  delta?: Point;
}
const targetElement = (target: EventTarget | null) => (target instanceof Element ? target : null);
const objects = (target: Element | null) => ({
  atomId: target?.closest<SVGElement>('[data-atom]')?.dataset.atom,
  electronId: target?.closest<SVGElement>('[data-electron]')?.dataset.electron,
  groupId: target?.closest<SVGElement>('[data-group]')?.dataset.group,
});
const regionOf = (target: Element | null): ElectronRegion | null => {
  const value = target?.closest<SVGElement>('[data-region]')?.dataset.region;
  return value ? (JSON.parse(value) as ElectronRegion) : null;
};
/** Source drawing controller adapted to local React previews and shared semantic response commits. */
export function DotCrossEditor({
  part,
  response,
  readOnly,
  onResponse,
  workspaceAside,
}: EditorSurfaceProps) {
  if (part.kind !== 'dot-and-cross') throw Error('DotCrossEditor needs a dot-and-cross part.');
  const parentState = response?.kind === 'dot-and-cross' ? response : part.initial;
  const stateRef = useRef(parentState),
    lastParent = useRef(parentState);
  if (lastParent.current !== parentState) {
    lastParent.current = parentState;
    stateRef.current = parentState;
  }
  const [, paint] = useState(0),
    state = stateRef.current;
  const igcse = part.markingPolicyId.startsWith('igcse-dot-cross:'),
    questionId = editorLayoutQuestionId(part.markingPolicyId);
  const elements: readonly DotCrossElement[] = ['N', 'O'];
  const symbols: readonly ElectronSymbol[] = igcse
    ? ['dot', 'cross']
    : ['dot', 'cross', 'triangle'];
  const layout = useMemo(() => createLayout(questionId), [questionId]);
  const [tool, setToolState] = useState<DrawingTool>('atom'),
    [element, setElement] = useState<DotCrossElement>('N'),
    [pendingCharge, setPendingCharge] = useState(1);
  const [selected, setSelected] = useState<readonly string[]>([]),
    [hover, setHover] = useState<DotCrossAnchor | null>(null),
    [chargePreview, setChargePreview] = useState<(ChargeDestination & { charge: number }) | null>(
      null,
    );
  const [cursor, setCursor] = useState<Point>({ x: 400, y: 325 }),
    [showCursor, setShowCursor] = useState(false),
    [message, setMessage] = useState('Select or drag an element to the canvas.');
  const svg = useRef<SVGSVGElement>(null),
    root = useRef<HTMLDivElement>(null),
    viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null),
    [dragView, setDragView] = useState<Drag | null>(null),
    [magnified, setMagnified] = useState(false);
  const [view, setView] = useState({ x: 0, y: 0, width: 1000, height: 650 });
  const [x, setX] = useState(400),
    [y, setY] = useState(325),
    [first, setFirst] = useState(''),
    [second, setSecond] = useState(''),
    [slot, setSlot] = useState(0),
    [symbol, setSymbol] = useState<ElectronSymbol>('dot');
  const [chargeText, setChargeText] = useState('1'),
    [bracket, setBracket] = useState(true),
    [electronId, setElectronId] = useState('');
  const circles = true,
    liveSelected = selected.filter((id) => state.atoms.some((a) => a.id === id));
  const limits = {
    left: view.x,
    right: view.x + view.width,
    top: view.y,
    bottom: view.y + view.height,
  };
  const touchTap = useRef<{ button: HTMLButtonElement; id: number; point: Point } | null>(null),
    touchClicks = useRef(new WeakMap<HTMLButtonElement, number>());
  useLayoutEffect(() => {
    const node = svg.current;
    if (!node) return;
    const update = () => {
      const b = node.getBoundingClientRect();
      setView(adaptiveView(b.width, b.height));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [magnified]);
  useEffect(() => {
    const node = viewport.current;
    if (node)
      node.scrollLeft = magnified ? Math.max(0, (node.scrollWidth - node.clientWidth) / 2) : 0;
  }, [magnified]);
  useEffect(() => {
    setToolState('atom');
    setElement('N');
    setSelected([]);
    setHover(null);
    setChargePreview(null);
    setCursor({ x: 400, y: 325 });
    setShowCursor(false);
    setFirst('');
    setSecond('');
    setElectronId('');
  }, [questionId]);
  const apply = (command: DotCrossCommand, success = 'Diagram updated.') => {
    if (readOnly) return false;
    const next = dotCrossEngine.apply(stateRef.current, {
      ...command,
      organisation: igcse ? 'igcse' : 'alevel',
    });
    if (next === stateRef.current) {
      setMessage(
        'No change: leave space between atom labels, use a free electron region, or complete the selection.',
      );
      return false;
    }
    stateRef.current = next;
    paint((n) => n + 1);
    onResponse(next);
    setHover(null);
    setChargePreview(null);
    setMessage(success);
    return true;
  };
  const setTool = (next: DrawingTool, nextElement = element, nextCharge = pendingCharge) => {
    setToolState(next);
    setSelected([]);
    setHover(null);
    setChargePreview(null);
    const origin = igcse
      ? 'Dots and crosses are interchangeable; use them consistently to distinguish electron sources.'
      : 'Dots, crosses and triangles are interchangeable; use them consistently to distinguish electron sources.';
    const help: Record<DrawingTool, string> = {
      atom: `Drag ${nextElement} here, or tap to place it. Drag diagram objects to move them.`,
      dot: `Tap or drop a dot on a shell or shared region. ${origin}`,
      cross: `Tap or drop a cross on a shell or shared region. ${origin}`,
      triangle: `Tap or drop a triangle on a shell or shared region. ${origin}`,
      charge: `Apply ${layout.chargeText(nextCharge)}: an ion gains brackets; a covalent atom symbol gets a local charge. Drop on the outer shell to bracket a connected ion.`,
      erase: 'Tap an object to erase it; dragging still moves it.',
    };
    setMessage(help[next]);
  };
  const at = (event: { clientX: number; clientY: number }): Point => {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return { x: 500, y: 325 };
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: p.x, y: p.y };
  };
  const inside = (event: { clientX: number; clientY: number }) => {
    const b = svg.current?.getBoundingClientRect();
    return (
      !!b &&
      event.clientX >= b.left &&
      event.clientX <= b.right &&
      event.clientY >= b.top &&
      event.clientY <= b.bottom
    );
  };
  const addAtom = (p: Point, value = element) => {
    if (stateRef.current.atoms.length >= 30) {
      setMessage('This canvas holds up to 30 atoms.');
      return;
    }
    const point = snapPoint(stateRef.current, p, [], value, layout, limits);
    if (stateRef.current.atoms.some((a) => Math.hypot(a.x - point.x, a.y - point.y) < 45)) {
      setMessage('Leave space between atom labels.');
      return;
    }
    apply({ type: 'atom', element: value, point }, `${value} added.`);
  };
  const addElectron = (anchor: DotCrossAnchor | null, value: ElectronSymbol) => {
    if (!anchor) {
      setMessage('Choose a shell or an overlapping shared region with room for another electron.');
      return;
    }
    apply(
      { type: 'electron', symbol: value, anchor },
      `${value[0]!.toUpperCase() + value.slice(1)} added to the ${anchor.kind === 'bond' ? 'shared' : 'outer-shell'} region.`,
    );
  };
  const chargeAt = (point: Point, charge: number, target: Element | null) => {
    const destination = chargeDestination(stateRef.current, point, layout, objects(target));
    if (!destination) {
      setMessage('Drop on an ion, a covalent atom symbol, or the outer shell of a connected ion.');
      return;
    }
    apply(
      { type: 'group', ...destination, charge },
      destination.bracket
        ? 'Ion charge and square brackets applied.'
        : 'Charge localised on the atom.',
    );
  };
  const cycleElectron = (id: string) => {
    const e = stateRef.current.electrons.find((e) => e.id === id);
    if (e)
      apply(
        {
          type: 'electron-symbol',
          id,
          symbol: symbols[(symbols.indexOf(e.symbol) + 1) % symbols.length]!,
        },
        'Electron symbol changed.',
      );
  };
  const activate = (target: Element | null, p: Point) => {
    const { atomId, electronId, groupId } = objects(target);
    if (tool === 'charge') {
      chargeAt(p, pendingCharge, target);
      return;
    }
    if (tool === 'erase') {
      const id = electronId || atomId || groupId;
      if (id)
        apply(
          { type: 'delete', ids: [id] },
          'Object and any attached electrons or brackets removed.',
        );
      return;
    }
    if (symbols.includes(tool as ElectronSymbol)) {
      const region = regionOf(target),
        e = stateRef.current.electrons.find((e) => e.id === electronId);
      addElectron(
        region
          ? layout.freeAnchor(stateRef.current, region)
          : e
            ? layout.freeAnchor(stateRef.current, e.anchor)
            : layout.regionAt(stateRef.current, p),
        tool as ElectronSymbol,
      );
      return;
    }
    if (electronId) {
      cycleElectron(electronId);
      return;
    }
    if (!atomId && !groupId) addAtom(p);
  };
  const release = (d: Drag) => {
    if (d.capture.hasPointerCapture(d.pointerId)) d.capture.releasePointerCapture(d.pointerId);
  };
  const cancelDrag = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    release(d);
    setDragView(null);
    setChargePreview(null);
    setHover(null);
    if (d.kind.startsWith('palette')) (d.capture as HTMLElement).dataset.dragged = 'true';
    setMessage('Move cancelled.');
  };
  const startDrag = (
    event: ReactPointerEvent<Element>,
    details: Partial<Drag>,
    capture: Element,
  ) => {
    if (readOnly || event.button !== 0 || drag.current) return;
    drag.current = {
      kind: 'blank',
      ...details,
      pointerId: event.pointerId,
      start: at(event),
      client: { x: event.clientX, y: event.clientY },
      before: stateRef.current,
      capture,
      clickTarget: event.target as Element,
      moved: false,
      point: null,
      anchor: null,
    };
    capture.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const canvasDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    const hit = objects(targetElement(event.target)),
      e = stateRef.current.electrons.find((e) => e.id === hit.electronId),
      g = stateRef.current.groups.find((g) => g.id === hit.groupId);
    const details = e
      ? { kind: 'electron', electronId: e.id, symbol: e.symbol }
      : hit.atomId
        ? { kind: 'atoms', atomId: hit.atomId, ids: [hit.atomId] }
        : g
          ? { kind: 'atoms', atomId: g.atomIds[0]!, ids: g.atomIds, groupId: g.id }
          : { kind: 'blank' };
    startDrag(event, details, event.currentTarget);
  };
  const move = (event: globalThis.PointerEvent) => {
    const d = drag.current;
    if (d) {
      if (event.pointerId !== d.pointerId) return;
      if (Math.hypot(event.clientX - d.client.x, event.clientY - d.client.y) > 4) d.moved = true;
      if (!d.moved) return;
      const p = at(event);
      d.point = p;
      if (d.kind === 'blank') return;
      if (d.kind === 'electron' || d.kind === 'paletteSymbol')
        d.anchor = inside(event) ? layout.regionAt(d.before, p, d.electronId) : null;
      else if (d.kind === 'palette' && inside(event))
        d.point = snapPoint(d.before, p, [], d.element!, layout, limits);
      else if (d.kind === 'paletteCharge') {
        const destination = inside(event)
          ? chargeDestination(
              d.before,
              p,
              layout,
              objects(document.elementFromPoint(event.clientX, event.clientY)),
            )
          : null;
        setChargePreview(destination ? { ...destination, charge: d.charge! } : null);
      } else if (d.kind === 'atoms') {
        const initial = d.before.atoms.find((a) => a.id === d.atomId)!;
        d.delta = dragDelta(
          d.before,
          d.ids!,
          d.atomId!,
          { x: initial.x + p.x - d.start.x, y: initial.y + p.y - d.start.y },
          !!d.groupId,
          layout,
          limits,
        );
      }
      setDragView({ ...d });
      return;
    }
    if (readOnly || !svg.current?.contains(targetElement(event.target))) return;
    if (tool === 'charge') {
      const destination = chargeDestination(
        stateRef.current,
        at(event),
        layout,
        objects(targetElement(event.target)),
      );
      setChargePreview(destination ? { ...destination, charge: pendingCharge } : null);
    } else if (symbols.includes(tool as ElectronSymbol))
      setHover(layout.regionAt(stateRef.current, at(event)));
  };
  const up = (event: globalThis.PointerEvent) => {
    const d = drag.current;
    if (!d || event.pointerId !== d.pointerId) return;
    drag.current = null;
    release(d);
    setDragView(null);
    setChargePreview(null);
    if (d.kind.startsWith('palette')) {
      (d.capture as HTMLElement).dataset.dragged = d.moved ? 'true' : 'false';
      if (d.moved && inside(event)) {
        if (d.kind === 'palette') addAtom(at(event), d.element);
        else if (d.kind === 'paletteSymbol') addElectron(d.anchor, d.symbol!);
        else
          chargeAt(at(event), d.charge!, document.elementFromPoint(event.clientX, event.clientY));
      }
      return;
    }
    if (!d.moved) {
      activate(d.clickTarget, at(event));
      return;
    }
    if (d.kind === 'blank') return;
    if (!inside(event)) {
      setMessage('Move cancelled outside the canvas.');
      return;
    }
    if (d.kind === 'electron') {
      if (!d.anchor) {
        setMessage('Electron returned: drop on a shell or shared region.');
        return;
      }
      apply(
        { type: 'relocate-electron', id: d.electronId!, anchor: d.anchor },
        'Moved. Attached electrons and brackets follow their atoms.',
      );
    } else if (d.delta)
      apply(
        { type: 'move', ids: d.ids!, dx: d.delta.x, dy: d.delta.y, bounds: limits },
        'Moved. Attached electrons and brackets follow their atoms.',
      );
  };
  const highlightedAction = () => {
    const check = root.current?.querySelector<HTMLButtonElement>('[data-dot-action="check"]');
    const next = root.current?.querySelector<HTMLButtonElement>('[data-dot-action="next"]');
    const action = next?.classList.contains('primary') ? next : check;
    if (!readOnly && !drag.current && action && !action.disabled) action.click();
  };
  const historyKey = (redo: boolean) => {
    if (!readOnly) apply({ type: redo ? 'redo' : 'undo' });
  };
  const handlers = useRef({ move, up, cancelDrag, highlightedAction, historyKey });
  handlers.current = { move, up, cancelDrag, highlightedAction, historyKey };
  useEffect(() => () => handlers.current.cancelDrag(), [questionId]);
  // Palette drag prevents native focus; retain source document shortcuts for body focus.
  useEffect(() => {
    const key = (event: globalThis.KeyboardEvent) => {
      if (root.current?.closest('[inert]')) return;
      if (event.key === 'Escape' && drag.current) handlers.current.cancelDrag();
      if (
        event.defaultPrevented ||
        document.activeElement !== document.body ||
        document.querySelector('dialog[open]')
      )
        return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        handlers.current.historyKey(event.shiftKey);
      } else if (
        event.key === 'Enter' &&
        !event.repeat &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey &&
        !event.isComposing
      ) {
        event.preventDefault();
        handlers.current.highlightedAction();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    const move = (e: globalThis.PointerEvent) => {
        if (root.current?.closest('[inert]')) handlers.current.cancelDrag();
        else handlers.current.move(e);
      },
      up = (e: globalThis.PointerEvent) => {
        if (root.current?.closest('[inert]')) handlers.current.cancelDrag();
        else handlers.current.up(e);
      },
      cancel = () => handlers.current.cancelDrag();
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('blur', cancel);
    return () => {
      cancel();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('blur', cancel);
    };
  }, []);
  useEffect(() => {
    if (readOnly) cancelDrag();
  }, [readOnly]);
  const keyboard = (event: KeyboardEvent<SVGSVGElement>) => {
    if (readOnly) return;
    const target = targetElement(event.target),
      { atomId, electronId, groupId } = objects(target),
      key = event.key;
    if (key === 'Delete' || key === 'Backspace') {
      event.preventDefault();
      const ids = electronId
        ? [electronId]
        : atomId
          ? [atomId]
          : groupId
            ? [groupId]
            : liveSelected;
      if (ids.length)
        apply({ type: 'delete', ids }, 'Object and any attached electrons or brackets removed.');
      return;
    }
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      const atom = stateRef.current.atoms.find((a) => a.id === atomId),
        region = regionOf(target);
      if (symbols.includes(tool as ElectronSymbol)) {
        addElectron(
          region
            ? layout.freeAnchor(stateRef.current, region)
            : atom
              ? layout.freeAnchor(stateRef.current, { kind: 'atom', atomId: atom.id })
              : layout.regionAt(stateRef.current, cursor),
          tool as ElectronSymbol,
        );
        return;
      }
      if (tool === 'charge') {
        chargeAt(atom || cursor, pendingCharge, target);
        return;
      }
      if (electronId) {
        cycleElectron(electronId);
        return;
      }
      if (tool === 'atom' && !atomId && !groupId) {
        addAtom(cursor);
        setCursor(
          clampPoint({ x: cursor.x + layout.bondDistance(element, element), y: cursor.y }, limits),
        );
        setShowCursor(true);
      }
      return;
    }
    const delta: Record<string, Point> = {
      ArrowLeft: { x: -10, y: 0 },
      ArrowRight: { x: 10, y: 0 },
      ArrowUp: { x: 0, y: -10 },
      ArrowDown: { x: 0, y: 10 },
    };
    if (delta[key]) {
      event.preventDefault();
      const step = event.shiftKey ? 2 : 1,
        d = { x: delta[key].x * step, y: delta[key].y * step };
      const group = stateRef.current.groups.find((g) => g.id === groupId),
        ids = atomId ? [atomId] : group ? group.atomIds : liveSelected;
      if (ids.length) apply({ type: 'move', ids, dx: d.x, dy: d.y, bounds: limits });
      else {
        const next = clampPoint({ x: cursor.x + d.x, y: cursor.y + d.y }, limits);
        setCursor(next);
        setShowCursor(true);
        setHover(
          symbols.includes(tool as ElectronSymbol) ? layout.regionAt(stateRef.current, next) : null,
        );
      }
    }
  };
  const keyCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = targetElement(event.target);
    if (!target) return;
    if (event.key === 'Escape') {
      cancelDrag();
      setSelected([]);
      return;
    }
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === 'z' &&
      !target.closest('input,textarea,select')
    ) {
      event.preventDefault();
      if (!readOnly) apply({ type: event.shiftKey ? 'redo' : 'undo' });
      return;
    }
    if (
      event.key !== 'Enter' ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    )
      return;
    if (
      target.closest(
        'input,textarea,select,a,summary,[contenteditable]:not([contenteditable="false"])',
      ) ||
      document.querySelector('dialog[open]')
    )
      return;
    const button = target.closest<HTMLButtonElement>('button');
    if (button && !button.dataset.dotAction) return;
    const check = root.current?.querySelector<HTMLButtonElement>('[data-dot-action="check"]'),
      next = root.current?.querySelector<HTMLButtonElement>('[data-dot-action="next"]');
    const action = next?.classList.contains('primary') ? next : check;
    if (action) {
      event.preventDefault();
      event.stopPropagation();
      if (!readOnly && !event.repeat && !drag.current && !action.disabled) action.click();
    }
  };
  const shownState =
    dragView?.kind === 'atoms' && dragView.delta
      ? {
          ...dragView.before,
          atoms: dragView.before.atoms.map((a) =>
            dragView.ids!.includes(a.id)
              ? { ...a, x: a.x + dragView.delta!.x, y: a.y + dragView.delta!.y }
              : a,
          ),
        }
      : state;
  const paletteClick = (event: React.MouseEvent<HTMLButtonElement>, fn: () => void) => {
    if (event.currentTarget.dataset.dragged === 'true') {
      event.currentTarget.dataset.dragged = 'false';
      return;
    }
    fn();
  };
  const manualElectron = () => {
    if (!first) {
      setMessage('Choose the first atom.');
      return;
    }
    if (first === second) {
      setMessage('Shared electrons need two different atoms.');
      return;
    }
    addElectron(
      second
        ? { kind: 'bond', a: first, b: second, slot: Math.min(slot, 5) as 0 | 1 | 2 | 3 | 4 | 5 }
        : { kind: 'atom', atomId: first, slot: slot as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 },
      symbol,
    );
  };
  const atomOptions = state.atoms.map((a) => (
    <option key={a.id} value={a.id}>
      {a.element} {a.id}
    </option>
  ));
  return (
    <div
      className={`dot-cross-editor type-body${igcse ? ' dc-igcse' : ' dc-alevel'}`}
      data-question-id={questionId}
      ref={root}
      onKeyDownCapture={keyCapture}
      onLostPointerCapture={(event) => {
        if (drag.current?.pointerId === event.pointerId) cancelDrag();
      }}
      onPointerDownCapture={(event) => {
        const button = targetElement(event.target)?.closest<HTMLButtonElement>('button');
        if (
          event.pointerType === 'touch' &&
          button &&
          !button.disabled &&
          !button.matches(
            '[data-element],[data-charge],[data-tool="dot"],[data-tool="cross"],[data-tool="triangle"]',
          )
        )
          touchTap.current = {
            button,
            id: event.pointerId,
            point: { x: event.clientX, y: event.clientY },
          };
      }}
      onPointerUpCapture={(event) => {
        const tap = touchTap.current;
        if (!tap || tap.id !== event.pointerId) return;
        touchTap.current = null;
        if (
          Math.hypot(event.clientX - tap.point.x, event.clientY - tap.point.y) > 10 ||
          !tap.button.contains(targetElement(event.target))
        )
          return;
        touchClicks.current.set(tap.button, performance.now());
        tap.button.click();
      }}
      onPointerCancel={() => (touchTap.current = null)}
      onClickCapture={(event) => {
        const button = targetElement(event.target)?.closest<HTMLButtonElement>('button');
        if (
          button &&
          event.isTrusted &&
          event.detail > 0 &&
          performance.now() - (touchClicks.current.get(button) ?? -Infinity) < 700
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <section className="dc-editor-card" aria-label="Diagram builder">
        <div className="toolbar" role="toolbar" aria-label="Drawing palette">
          <div className="palette-group element-palette" role="group" aria-label="Element palette">
            {elements.map((value) => (
              <button
                type="button"
                key={value}
                className="element-tool"
                data-element={value}
                aria-label={`${value} atom`}
                title={`${names[value]} (${value})`}
                aria-pressed={tool === 'atom' && element === value}
                disabled={readOnly}
                onPointerDown={(event) => {
                  event.currentTarget.dataset.dragged = 'false';
                  setElement(value);
                  setTool('atom', value);
                  startDrag(event, { kind: 'palette', element: value }, event.currentTarget);
                }}
                onClick={(event) =>
                  paletteClick(event, () => {
                    setElement(value);
                    setTool('atom', value);
                  })
                }
              >
                {value}
              </button>
            ))}
          </div>
          <div className="control-palette" role="group" aria-label="Drawing controls">
            <div
              className="palette-group symbol-tools"
              role="group"
              aria-label="Electron and edit tools"
            >
              {symbols.map((value) => (
                <button
                  type="button"
                  key={value}
                  className="tool symbol-tool"
                  data-tool={value}
                  aria-label={`${value[0]!.toUpperCase() + value.slice(1)} electron`}
                  title={`Place a ${value} electron`}
                  aria-pressed={tool === value}
                  disabled={readOnly}
                  onPointerDown={(event) => {
                    event.currentTarget.dataset.dragged = 'false';
                    setTool(value);
                    startDrag(event, { kind: 'paletteSymbol', symbol: value }, event.currentTarget);
                  }}
                  onClick={(event) => paletteClick(event, () => setTool(value))}
                >
                  {(value === 'dot' ? '●' : value === 'cross' ? '×' : '▲') + ' '}
                  <span>{value[0]!.toUpperCase() + value.slice(1)}</span>
                </button>
              ))}
              <button
                type="button"
                className="tool erase-tool"
                data-tool="erase"
                aria-label="Erase"
                title="Erase an atom, electron or charge"
                aria-pressed={tool === 'erase'}
                disabled={readOnly}
                onClick={() => setTool('erase')}
              >
                ⌫ <span>Erase</span>
              </button>
            </div>
            <div className="palette-group history-tools" role="group" aria-label="Diagram history">
              <button
                type="button"
                className="tool history-tool"
                disabled={readOnly || !state.history?.length}
                onClick={() => apply({ type: 'undo' }, 'Last edit undone.')}
                title="Undo the last edit"
              >
                Undo
              </button>
              <button
                type="button"
                className="tool history-tool"
                disabled={readOnly || !state.future?.length}
                onClick={() => apply({ type: 'redo' }, 'Edit restored.')}
                title="Redo the last undone edit"
              >
                Redo
              </button>
              <button
                type="button"
                className="tool history-tool"
                disabled={readOnly || !state.atoms.length}
                onClick={() => {
                  apply({ type: 'clear' }, 'Canvas cleared. Undo restores your diagram.');
                  setSelected([]);
                }}
                title="Clear the diagram"
              >
                Clear
              </button>
            </div>

          </div>
        </div>
        <div className="workspace">
          <div className="drawing-area">
            <div
              className="canvas-wrap dc-viewport"
              ref={viewport}
              tabIndex={magnified ? 0 : -1}
              aria-label={magnified ? 'Scrollable diagram viewport' : undefined}
            >
              <svg
                ref={svg}
                viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
                className="dc-canvas"
                tabIndex={0}
                role="group"
                aria-label="Dot-and-cross drawing canvas. Use arrow keys to move the drawing cursor and Space to place an atom."
                style={magnified ? { width: 1000, minWidth: 1000 } : undefined}
                onPointerDown={canvasDown}
                onKeyDown={keyboard}
                onLostPointerCapture={(event) => {
                  if (drag.current?.pointerId === event.pointerId) cancelDrag();
                }}
                onPointerLeave={() => {
                  if (!drag.current) {
                    setHover(null);
                    setChargePreview(null);
                  }
                }}
              >
                <Diagram
                  state={shownState}
                  layout={layout}
                  tool={dragView?.kind === 'electron' ? dragView.symbol! : tool}
                  circles={circles}
                  selected={liveSelected}
                  hover={hover}
                  drag={dragView}
                  chargePreview={chargePreview}
                  cursor={showCursor ? cursor : null}
                  emptyCenter={{ x: 500, y: 325 }}
                  readOnly={readOnly}
                />
              </svg>
              {!shownState.atoms.length && <div className="dc-empty-hint type-body">
                <p>Build your diagram here</p>
                <p>Drag an element here, or choose one and tap.</p>
              </div>}
            </div>
            <p className="status dc-status visually-hidden" role="status" aria-live="polite">
              {message}
            </p>
          </div>
          {workspaceAside && (
            <aside className="marking" aria-label="Check your answer">
              {workspaceAside}
            </aside>
          )}
        </div>
      </section>
    </div>
  );
}
