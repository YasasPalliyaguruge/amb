import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { warmPublicSplineAssets } from './components/cinematic/splineWarmup';
import './index.css';

void warmPublicSplineAssets();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
