import { createRoot } from 'react-dom/client';
import App from './App';
import { CompetitionSecurityProvider } from './security';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <CompetitionSecurityProvider><App /></CompetitionSecurityProvider>,
);
