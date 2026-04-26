import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { isPublicExperienceRoute, warmPublicSplineAssets } from './components/cinematic/splineWarmup';
import { startPerformanceMonitoring } from './utils/performanceMonitor';
import { registerServiceWorker } from './utils/registerServiceWorker';
import './index.css';

if (isPublicExperienceRoute()) {
  void warmPublicSplineAssets();
}

startPerformanceMonitoring();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
