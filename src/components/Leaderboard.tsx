import { useEffect, useRef, useState } from 'react';
import { OlympiadLogo } from './OlympiadLogo';
import { ArtworkBackButton, TeacherSettingsButton } from './SharedNavigation';
import equipment14 from '../assets/powerapp/14-equipment.png';
import equipment2 from './leaderboard/assets/equipment-2.png';
import equipment8 from './leaderboard/assets/equipment-8.png';
import { createLeaderboardPoller } from './leaderboard/polling';
import './Leaderboard.css';

export type LeaderboardEvent = { id: string; name: string; year: string | number; endsAt?: number | string | null };
export type LeaderboardRow = { teamId: string; name: string; score: number };
export type LeaderboardSnapshot = { activeEvent: LeaderboardEvent | null; rows: LeaderboardRow[] };

export async function loadLeaderboard(signal: AbortSignal): Promise<LeaderboardSnapshot> {
  const response = await fetch('/api/olympiad/leaderboard', { signal, credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('Leaderboard unavailable');
  const value: unknown = await response.json();
  if (!value || typeof value !== 'object') throw new Error('Invalid leaderboard');
  const snapshot = value as LeaderboardSnapshot;
  if (!Array.isArray(snapshot.rows) || snapshot.rows.length > 3 ||
    snapshot.rows.some(row => !row || typeof row.teamId !== 'string' || typeof row.name !== 'string' || !Number.isFinite(row.score) || row.score <= 0) ||
    (snapshot.activeEvent !== null && (!snapshot.activeEvent || typeof snapshot.activeEvent.id !== 'string' || typeof snapshot.activeEvent.name !== 'string'))) {
    throw new Error('Invalid leaderboard');
  }
  return snapshot;
}

/** Teacher route only. The server always chooses the active event and ranking. */
export function Leaderboard({ activeEvent, onBack, onSettings, visible = true }: {
  activeEvent: LeaderboardEvent | null;
  onBack: () => void;
  onSettings?: () => void;
  visible?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [stale, setStale] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  const poller = useRef<ReturnType<typeof createLeaderboardPoller<LeaderboardSnapshot>> | null>(null);
  useEffect(() => {
    const instance = createLeaderboardPoller({
      load: loadLeaderboard,
      onValue: value => { setSnapshot(value); setStale(false); },
      onError: () => setStale(true),
      isDocumentVisible: () => document.visibilityState === 'visible',
      subscribeVisibility: listener => {
        document.addEventListener('visibilitychange', listener);
        return () => document.removeEventListener('visibilitychange', listener);
      },
    });
    poller.current = instance;
    return () => { instance.dispose(); poller.current = null; };
  }, []);
  useEffect(() => { poller.current?.setVisible(visible); }, [visible]);
  const event = snapshot ? snapshot.activeEvent : activeEvent;
  const rows = snapshot?.rows ?? [];
  async function fullscreen() {
    setFullscreenError('');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { setFullscreenError('Fullscreen is unavailable.'); }
  }
  if (!visible) return null;
  return <section className="leaderboard-stage" aria-labelledby="leaderboard-title">
    <h1 id="leaderboard-title" className="sr-only">Leaderboard</h1>
    <OlympiadLogo className="leaderboard-logo" />
    <div className="leaderboard-controls">
      <button type="button" className="leaderboard-fullscreen type-label ui-button" onClick={() => { void fullscreen(); }}>Fullscreen</button>
      {onSettings && <TeacherSettingsButton onClick={onSettings} />}
      <ArtworkBackButton className="leaderboard-back" label="Back to teacher settings" onClick={onBack} />
    </div>
    <p className="leaderboard-event type-label">{event?.name ?? 'No active event'}</p>
    <ol className="leaderboard-podium" aria-label="Top three teams">
      {[0, 1, 2].map(index => <li key={index} className={`leaderboard-place leaderboard-place--${index + 1}`} aria-label={`${index + 1}${['st', 'nd', 'rd'][index]} place${rows[index] ? `: ${rows[index].name}, ${rows[index].score} ${rows[index].score === 1 ? 'point' : 'points'}` : ': no team'}`}>
        <span className="leaderboard-badge type-label" aria-hidden="true">{['1ST PLACE', '2ND PLACE', '3RD PLACE'][index]}</span>
        <span className="leaderboard-team type-heading" aria-hidden="true">{rows[index]?.name ?? ''}</span>
        <span className="leaderboard-points type-body" aria-hidden="true">{rows[index] ? `${rows[index].score} ${rows[index].score === 1 ? 'Point' : 'Points'}` : ''}</span>
      </li>)}
    </ol>
    <img className="leaderboard-art leaderboard-art--left" src={equipment2} alt="" />
    <img className="leaderboard-art leaderboard-art--centre" src={equipment14} alt="" />
    <img className="leaderboard-art leaderboard-art--right" src={equipment8} alt="" />
    <p className={`leaderboard-status type-label${stale ? ' leaderboard-status--stale' : ''}`} role="status">
      {stale ? (snapshot ? 'Updates paused — showing last received results' : 'Leaderboard unavailable — retrying') : !snapshot ? 'Loading leaderboard…' : !event ? 'Activate an event in teacher settings to show results.' : rows.length === 0 ? 'Waiting for the first points' : 'Live results'}
      {fullscreenError && <span> · {fullscreenError}</span>}
    </p>
  </section>;
}
