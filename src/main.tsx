import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { isPublicExperienceRoute, warmPublicSplineAssets } from './components/cinematic/splineWarmup';
import './index.css';

if (isPublicExperienceRoute()) {
  void warmPublicSplineAssets();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
