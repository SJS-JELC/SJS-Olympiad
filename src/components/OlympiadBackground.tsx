import '../background.css';

/** One persistent viewport backdrop, mounted above the route boundary. */
export function OlympiadBackground() {
  return <div className="olympiad-background" aria-hidden="true"><div className="olympiad-background__floor" /></div>;
}
