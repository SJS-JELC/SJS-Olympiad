import eagle from '../assets/powerapp/flipped-eagle.svg';
import './LoadingIndicator.css';

export function LoadingIndicator({full=false,label='LOADING'}:{full?:boolean;label?:string}) {
 return <div className={'loading-indicator'+(full?' loading-indicator--full':'')} role="status">
  {full && <img src={eagle} alt="St John's eagle"/>}
  <svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,19 76.847,34.5 76.847,65.5 50,81 23.153,65.5 23.153,34.5"/><circle cx="50" cy="50" r="17"/></svg>
  <span>{label}</span>
 </div>;
}
