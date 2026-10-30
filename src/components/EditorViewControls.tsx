import './editor-view-controls.css';

export interface EditorViewControlsProps {
  readonly scale: number;
  readonly panning: boolean;
  readonly onZoom: (factor: number) => void;
  readonly onTogglePan: () => void;
  readonly onFit: () => void;
  readonly fitLabel?: string;
}
/** Presentation-only controls: none of these actions commits an editor response. */
export function EditorViewControls({ scale, panning, onZoom, onTogglePan, onFit, fitLabel = 'Fit molecule' }: EditorViewControlsProps) {
  return <div className="editor-view-controls" role="group" aria-label="Canvas view">
    <button type="button" className="ui-button editor-view-tool" aria-label="Zoom in" title="Zoom in" onClick={() => onZoom(1.25)} disabled={scale >= 4}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6M6 10h8M10 6v8" /></svg>
    </button>
    <button type="button" className="ui-button editor-view-tool" aria-label="Zoom out" title="Zoom out" onClick={() => onZoom(.8)} disabled={scale <= .15}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6M6 10h8" /></svg>
    </button>
    <button type="button" className="ui-button editor-view-tool" aria-label="Pan canvas" title="Hand: drag or use arrow keys to pan" aria-pressed={panning} onClick={onTogglePan}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 12V5a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v7c0 4-2 7-6 7h-1c-2 0-3-1-4-2l-5-6a1.5 1.5 0 0 1 2-2l2 2" /></svg>
    </button>
    <button type="button" className="ui-button editor-view-tool" aria-label={fitLabel} title={fitLabel} onClick={onFit}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6" /><circle cx="12" cy="12" r="3" /></svg>
    </button>
  </div>;
}
