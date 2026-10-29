import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type {
  MoleculeElement,
  MoleculeGraph,
  MoleculeState,
  Point,
} from '../../contracts/molecule';
import { blankMolecule, core, moleculeEngine } from '../../chemistry/molecule/engine';
import type { MoleculeCommand } from '../../chemistry/molecule/engine';
import {
  applyTarget,
  destination,
  gestureGraph,
  LENGTH,
  STEP,
} from '../../chemistry/molecule/interaction';
import type { MoleculeTarget } from '../../chemistry/molecule/interaction';
import { bondLines, thumbnailViewBox } from '../../chemistry/molecule/depiction';
import type { Representation } from '../../chemistry/molecule/depiction';
import { Structure } from './Structure';
import { cameraViewBox, fitMoleculeCamera, panMoleculeCamera, zoomMoleculeCamera } from './camera';
import type { MoleculeCamera } from './camera';
import './molecule.css';
const defaultElements: readonly MoleculeElement[] = ['C', 'O', 'N', 'Cl', 'F', 'H'];
const defaultViews: readonly Representation[] = ['displayed', 'skeletal'];
function targetOf(node: EventTarget | null): MoleculeTarget | null {
  const e = node instanceof Element ? node : null,
    a = e?.closest('[data-atom]'),
    b = e?.closest('[data-bond]');
  if (a) return { kind: 'atom', id: Number(a.getAttribute('data-atom')) };
  if (b) {
    const [x, y] = b.getAttribute('data-bond')!.split(':').map(Number);
    return { kind: 'bond', a: x!, b: y! };
  }
  return null;
}
export function MoleculePreview({
  graph,
  label = 'Saved molecular structure',
}: {
  graph: MoleculeGraph;
  label?: string;
}) {
  return (
    <svg
      className="molecule-preview stage-preview"
      viewBox={thumbnailViewBox(graph)}
      role="img"
      aria-label={label}
    >
      <Structure graph={graph} view="skeletal" />
    </svg>
  );
}
export interface MoleculeEditorProps {
  readonly value: MoleculeState;
  readonly onChange: (value: MoleculeState) => void;
  readonly readOnly?: boolean;
  readonly label?: string;
  readonly elements?: readonly MoleculeElement[];
  readonly representations?: readonly Representation[];
  readonly explicitHydrogensOnly?: boolean;
}
interface Drag {
  pointerId: number;
  target: MoleculeTarget | null;
  start: Point;
  end: Point;
  screenX: number;
  screenY: number;
  moved: boolean;
}
export function MoleculeEditor({
  value = blankMolecule(),
  onChange,
  readOnly = false,
  label = 'Molecular drawing',
  elements = defaultElements,
  representations = defaultViews,
  explicitHydrogensOnly = false,
}: MoleculeEditorProps) {
  const [element, setElement] = useState<MoleculeElement>('C'),
    [chain, setChain] = useState(false),
    [erasing, setErasing] = useState(false),
    [view, setView] = useState<Representation>(representations[0] ?? 'displayed'),
    [panning, setPanning] = useState(false),
    [panDragging, setPanDragging] = useState(false),
    [message, setMessage] = useState(''),
    [drag, setDrag] = useState<Drag | null>(null),
    [keyboard, setKeyboard] = useState<{ id: number; angle: number } | null>(null),
    [placement, setPlacement] = useState<Point>({x: 0, y: 0});
  const [size, setSize] = useState({ w: 600, h: 400 }),
    [camera, setCamera] = useState<MoleculeCamera | null>(null),
    openingGraph = useRef(value.graph),
    pan = useRef<{pointerId: number; screenX: number; screenY: number; camera: MoleculeCamera} | null>(null),
    canvas = useRef<SVGSVGElement>(null),
    touchTool = useRef<{ button: HTMLButtonElement; at: number } | null>(null),
    gesture = useRef<Drag | null>(null),
    state = useRef(value),
    locked = useRef(readOnly);
  state.current = value;
  locked.current = readOnly;
  const order = 1;
  const graph = value.graph,
    valid = core.validate(graph),
    currentCamera = camera ?? fitMoleculeCamera(openingGraph.current, size.w, size.h),
    viewport = cameraViewBox(currentCamera, size.w, size.h);
  const cancel = () => {
    const g = pan.current ?? gesture.current;
    pan.current = null;
    setPanDragging(false);
    gesture.current = null;
    if (g && canvas.current?.hasPointerCapture(g.pointerId))
      canvas.current.releasePointerCapture(g.pointerId);
    setDrag(null);
    setKeyboard(null);
  };
  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      const r = node.getBoundingClientRect();
      setSize({ w: r.width || 600, h: r.height || 400 });
      cancel();
    });
    observer.observe(node.parentElement!);
    return () => {
      observer.disconnect();
      gesture.current = null;
      pan.current = null;
    };
  }, []);
  useEffect(() => {
    if (readOnly) cancel();
  }, [readOnly]);
  useEffect(() => {
    cancel();
    setPanning(false);
    openingGraph.current = value.graph;
    setCamera(null);
  }, [label]);
  const focus = (t: MoleculeTarget | null) =>
    requestAnimationFrame(() => {
      const node = t
        ? canvas.current?.querySelector<SVGElement>(
            t.kind === 'atom' ? `[data-atom="${t.id}"]` : `[data-bond="${t.a}:${t.b}"]`,
          )
        : canvas.current;
      node?.focus({ preventScroll: true });
    });
  const send = (cmd: MoleculeCommand, announcement = '') => {
    if (locked.current) return false;
    try {
      const before = state.current,
        next = moleculeEngine.apply(before, cmd);
      if (next === before) {
        if (announcement) setMessage(announcement);
        return false;
      }
      state.current = next;
      onChange(next);
      setMessage(announcement);
      return true;
    } catch (e) {
      setMessage(String(e));
      return false;
    }
  };
  const commit = (g: MoleculeGraph, text = '') => send({ kind: 'commit-graph', graph: g }, text),
    scale = () => canvas.current?.getScreenCTM()?.a || 1;
  const point = (e: { clientX: number; clientY: number }): Point => {
    const m = canvas.current?.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const choose = (e: MoleculeElement) => {
      cancel();
      setPanning(false);
      setElement(e);
      setChain(false);
      setErasing(false);
    },
    toggleChain = () => {
      cancel();
      setPanning(false);
      setChain(!chain || erasing);
      setElement('C');
      setErasing(false);
    };
  const grow = (id: number, end: Point) => {
    const start = state.current.graph.atoms.find((a) => a.id === id);
    if (!start) return;
    const next = gestureGraph(
      state.current.graph,
      { target: { kind: 'atom', id }, start },
      end,
      element,
      order,
      false,
      scale(),
    );
    if (commit(next, 'Bond added.'))
      focus({ kind: 'atom', id: destination(state.current.graph, start, end, scale()).id ?? next.atoms.at(-1)!.id });
    else
      setMessage(
        'That space is occupied or those atoms are already connected. Tap a bond to change its order.',
      );
  };
  const apply = (t: MoleculeTarget | null, p: Point) => {
    const before = state.current.graph,
      next = applyTarget(before, t, p, element, erasing);
    if (
      commit(
        next,
        erasing
          ? 'Removed.'
          : t?.kind === 'bond'
            ? 'Bond order changed.'
            : `${core.names[element]} added or changed.`,
      )
    ) {
      if (!t) focus({ kind: 'atom', id: next.atoms.at(-1)!.id });
      else if (erasing) focus(null);
    } else if (core.heavyCount(before) >= core.LIMIT)
      setMessage('This canvas holds up to twenty heavy atoms. Erase an atom to make room.');
  };
  const keyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (panning && (e.key.startsWith('Arrow') || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const dx = e.key === 'ArrowLeft' ? -40 : e.key === 'ArrowRight' ? 40 : 0;
      const dy = e.key === 'ArrowUp' ? -40 : e.key === 'ArrowDown' ? 40 : 0;
      setCamera(panMoleculeCamera(currentCamera, dx, dy));
      return;
    }
    if (readOnly) return;
    const t = targetOf(e.target);
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
      return;
    }
    if (['Delete', 'Backspace'].includes(e.key) && t) {
      e.preventDefault();
      cancel();
      commit(core.remove(state.current.graph, t), 'Removed.');
      focus(null);
      return;
    }
    if (e.key.startsWith('Arrow') && t?.kind === 'atom' && !erasing) {
      e.preventDefault();
      let a = keyboard?.id === t.id ? keyboard.angle : -STEP;
      if (e.key === 'ArrowLeft') a -= STEP;
      if (e.key === 'ArrowRight') a += STEP;
      if (e.key === 'ArrowUp') a = -Math.PI / 2;
      if (e.key === 'ArrowDown') a = Math.PI / 2;
      setKeyboard({ id: t.id, angle: a });
      return;
    }
    if (e.key.startsWith('Arrow') && !t) {
      e.preventDefault();
      setPlacement(p => ({
        x: p.x + (e.key === 'ArrowLeft' ? -LENGTH : e.key === 'ArrowRight' ? LENGTH : 0),
        y: p.y + (e.key === 'ArrowUp' ? -LENGTH : e.key === 'ArrowDown' ? LENGTH : 0),
      }));
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (keyboard) {
        const a = state.current.graph.atoms.find((a) => a.id === keyboard.id)!;
        grow(a.id, {
          x: a.x + LENGTH * Math.cos(keyboard.angle),
          y: a.y + LENGTH * Math.sin(keyboard.angle),
        });
        setKeyboard(null);
      } else apply(t, placement);
    }
  };
  const preview = (() => {
    if (drag?.moved && !erasing && (chain || !drag.target))
      return gestureGraph(graph, drag, drag.end, element, order, chain, scale());
    let start, end;
    if (drag?.moved && drag.target?.kind === 'atom' && !erasing) {
      start = graph.atoms.find((a) => a.id === (drag.target as { id: number }).id);
      if (start) end = destination(graph, start, drag.end, scale());
    } else if (keyboard) {
      start = graph.atoms.find((a) => a.id === keyboard.id);
      if (start)
        end = destination(
          graph,
          start,
          {
            x: start.x + LENGTH * Math.cos(keyboard.angle),
            y: start.y + LENGTH * Math.sin(keyboard.angle),
          },
          scale(),
        );
    }
    return start && end ? { start, end } : null;
  })();
  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (!e.isPrimary || e.button !== 0 || gesture.current || pan.current) return;
    if (panning) {
      e.preventDefault();
      pan.current = { pointerId: e.pointerId, screenX: e.clientX, screenY: e.clientY, camera: currentCamera };
      setPanDragging(true);
      focus(null);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (readOnly) return;
    e.preventDefault();
    setKeyboard(null);
    const t = targetOf(e.target),
      p = point(e);
    focus(t);
    const g = {
      pointerId: e.pointerId,
      target: t,
      start: p,
      end: p,
      screenX: e.clientX,
      screenY: e.clientY,
      moved: false,
    };
    gesture.current = g;
    setDrag(g);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const p = pan.current;
    if (p?.pointerId === e.pointerId) {
      setCamera(panMoleculeCamera(p.camera, e.clientX - p.screenX, e.clientY - p.screenY));
      return;
    }
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const next = {
      ...g,
      end: point(e),
      moved: g.moved || Math.hypot(e.clientX - g.screenX, e.clientY - g.screenY) > 9,
    };
    gesture.current = next;
    setDrag(next);
  };
  const up = (e: PointerEvent<SVGSVGElement>) => {
    if (pan.current?.pointerId === e.pointerId) { move(e); cancel(); return; }
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const end = point(e),
      r = e.currentTarget.getBoundingClientRect();
    cancel();
    if (
      readOnly ||
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      return;
    if (g.moved && !erasing && (chain || !g.target)) {
      if (Math.hypot(e.clientX - g.screenX, e.clientY - g.screenY) >= 18) {
        const next = gestureGraph(state.current.graph, g, end, element, order, chain, scale());
        if (
          commit(next, chain ? 'Carbon chain added. Undo removes this whole drag.' : 'Bond added.')
        )
          focus({ kind: 'atom', id: next.atoms.at(-1)!.id });
      }
    } else if (g.moved && g.target?.kind === 'atom' && !erasing) {
      if (Math.hypot(e.clientX - g.screenX, e.clientY - g.screenY) >= 18) grow(g.target.id, end);
    } else if (!g.moved) apply(g.target, g.start);
  };
  const zoom = (factor: number) => {
    cancel();
    setCamera(zoomMoleculeCamera(currentCamera, factor));
  };
  const togglePan = () => {
    cancel();
    setPanning(!panning);
    setErasing(false);
    setChain(false);
  };
  return (
    <section
      className="molecule-editor type-body"
      aria-label={label}
      onKeyDown={(e) => {
        if (readOnly || e.altKey) return;
        if (e.ctrlKey || e.metaKey) {
          if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
            e.preventDefault();
            cancel();
            send({ kind: 'undo' }, 'Last edit undone.');
          }
          return;
        }
        if (/INPUT|TEXTAREA|SELECT/.test((e.target as Element).tagName)) return;
        const keys: Record<string, MoleculeElement> = {
            c: 'C',
            o: 'O',
            n: 'N',
            f: 'F',
            l: 'Cl',
            h: 'H',
          },
          k = e.key.toLowerCase();
        if (keys[k] && elements.includes(keys[k])) choose(keys[k]);
        if (k === '3') toggleChain();
        if (k === 'e') {
          cancel();
          setPanning(false);
          setErasing(!erasing);
        }
      }}
    >
      <div className="drawing-card">
        <div className="editor-bar"
          onPointerUp={event => {
            if (event.pointerType !== 'touch') return;
            const button = (event.target as Element).closest('button');
            if (!(button instanceof HTMLButtonElement) || button.disabled) return;
            const box = button.getBoundingClientRect();
            if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) return;
            // Chromium can omit the compatibility click immediately after a canvas drag.
            // Activate from touch release, then consume its optional native touch click.
            touchTool.current = {button, at: performance.now()};
            event.preventDefault();
            button.click();
          }}
          onClickCapture={event => {
            const last = touchTool.current;
            const pointerType = (event.nativeEvent as MouseEvent & {pointerType?:string}).pointerType;
            const button = (event.target as Element).closest('button');
            if (last && event.nativeEvent.isTrusted && pointerType === 'touch' &&
                button === last.button && performance.now() - last.at < 800) {
              event.preventDefault();
              event.stopPropagation();
              touchTool.current = null;
            }
          }}>
          <div className="tools" role="toolbar" aria-label="Drawing tools">
            <div className="tool-group" role="group" aria-label="Element">
              {elements.map((e) => (
                <button
                  type="button"
                  key={e}
                  className="tool atom-tool"
                  data-element={e}
                  disabled={readOnly}
                  aria-label={core.names[e]}
                  title={`${core.names[e]} (${e === 'Cl' ? 'L' : e})`}
                  aria-pressed={element === e && !erasing && !chain && !panning}
                  onClick={() => choose(e)}
                >
                  {e}
                </button>
              ))}
            </div>
            <span className="divider" aria-hidden="true" />
            <button
              type="button"
              className="tool"
              aria-label="Carbon chain"
              title="Toggle carbon chain (3)"
              disabled={readOnly}
              aria-pressed={chain && !erasing && !panning}
              onClick={toggleChain}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m2 16 5-8 5 8 5-8 5 8" />
              </svg>
            </button>
            <button
              type="button"
              className="tool"
              aria-label="Erase"
              title="Erase (E)"
              disabled={readOnly}
              aria-pressed={erasing}
              onClick={() => {
                cancel();
                setPanning(false);
                setErasing(!erasing);
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m13 4 7 7-9 9H7l-4-4L13 4Zm-7 9 7 7M11 20h10" />
              </svg>
            </button>
            <button
              type="button"
              className="tool"
              aria-label="Undo"
              title="Undo (Ctrl+Z)"
              disabled={readOnly || !value.history.length}
              onClick={() => {
                cancel();
                send({ kind: 'undo' }, 'Last edit undone.');
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12" transform="translate(0 -2)" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            className="clean-button"
            disabled={readOnly || graph.atoms.length < 2}
            onClick={() => {
              cancel();
              send(
                { kind: 'clean' },
                'Layout tidied. Connections are unchanged. Undo restores the original layout.',
              );
            }}
          >
            Clean up
          </button>
          <button
            type="button"
            className="clear-button"
            disabled={readOnly || !graph.atoms.length}
            onClick={() => {
              cancel();
              send({ kind: 'clear' }, 'Canvas cleared. Undo will restore it.');
            }}
          >
            Clear structure
          </button>
          {representations.length > 1 && <div className="view-switch" role="group" aria-label="Formula representation">
            {representations.map((v) => (
              <button
                type="button"
                key={v}
                data-view={v}
                aria-pressed={view === v}
                onClick={() => {
                  cancel();
                  setView(v);
                }}
              >
                {v === 'skeletal' ? 'Skeletal' : 'Displayed'}
              </button>
            ))}
          </div>}
          <div className="canvas-tools" role="group" aria-label="Canvas view">
            <button type="button" className="tool" aria-label="Zoom in" title="Zoom in" onClick={() => zoom(1.25)} disabled={currentCamera.scale >= 4}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6M6 10h8M10 6v8" /></svg>
            </button>
            <button type="button" className="tool" aria-label="Zoom out" title="Zoom out" onClick={() => zoom(.8)} disabled={currentCamera.scale <= .15}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6M6 10h8" /></svg>
            </button>
            <button type="button" className="tool" aria-label="Pan canvas" title="Hand: drag to pan" aria-pressed={panning} onClick={togglePan}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 12V5a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v7c0 4-2 7-6 7h-1c-2 0-3-1-4-2l-5-6a1.5 1.5 0 0 1 2-2l2 2" /></svg>
            </button>
            <button type="button" className="tool" aria-label="Fit molecule" title="Fit molecule" onClick={() => { cancel(); setCamera(fitMoleculeCamera(graph, size.w, size.h)); }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6" /><circle cx="12" cy="12" r="3" /></svg>
            </button>
          </div>
        </div>
        <div className="canvas-wrap">
          <svg
            ref={canvas}
            className={`molecule-workspace${erasing ? ' erasing' : ''}${panning ? ' panning' : ''}${panDragging ? ' dragging' : ''}`}
            tabIndex={0}
            viewBox={`${viewport.x} ${viewport.y} ${viewport.w} ${viewport.h}`}
            role="group"
            aria-label={`${label}. Molecule drawing area. Drag to grow bonds. Arrow keys on an atom preview a bond; Enter commits.`}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={cancel}
            onLostPointerCapture={() => {
              if (gesture.current || pan.current) cancel();
            }}
            onKeyDown={keyDown}
            onBlur={() => setKeyboard(null)}
          >
            <title>Your molecule</title>
            <Structure
              graph={graph}
              view={view}
              interactive={!readOnly}
              invalid={valid.atoms ?? []}
              expandHydrogens={!explicitHydrogensOnly}
            />
            <g className="mechanism-annotations" />
            {!readOnly && !panning && <circle className="keyboard-placement" cx={placement.x} cy={placement.y} r={5} aria-hidden="true" />}
            <g className="molecule-gesture-preview" aria-hidden="true">
              {preview &&
                ('atoms' in preview ? (
                  <g className="ghost">
                    {preview.bonds.slice(graph.bonds.length).map((b, i) => {
                      const a = preview.atoms.find((a) => a.id === b.a)!,
                        c = preview.atoms.find((a) => a.id === b.b)!;
                      return bondLines(a, c, b.order).map((line, j) => (
                        <line key={`${i}-${j}`} className="bond-line" {...line} />
                      ));
                    })}
                    {preview.atoms.slice(graph.atoms.length).map((a) => (
                      <circle key={a.id} cx={a.x} cy={a.y} r={5} className="preview-end" />
                    ))}
                  </g>
                ) : (
                  <g className="ghost">
                    {bondLines(preview.start, preview.end, order).map((line, i) => (
                      <line key={i} className="bond-line" {...line} />
                    ))}
                    <circle cx={preview.end.x} cy={preview.end.y} r={5} className="preview-end" />
                    {preview.end.id !== undefined && (
                      <circle
                        cx={preview.end.x}
                        cy={preview.end.y}
                        r={25}
                        className="preview-target"
                      />
                    )}
                  </g>
                ))}
            </g>
          </svg>
        </div>
      </div>
      <p className="drawing-instruction type-caption">
        Tap to place atoms; drag to bond. Tap a bond to cycle its order. {explicitHydrogensOnly
          ? 'Draw hydrogens explicitly. Select an element, then tap an atom to replace it.'
          : 'Hydrogens appear automatically.'}
      </p>
      <p className="molecule-announcement type-caption" role="status" aria-live="polite">
        {message}
      </p>
      {readOnly && (
        <p className="molecule-readonly type-caption">Drawing locked.</p>
      )}
    </section>
  );
}
