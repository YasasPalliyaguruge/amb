import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { startPerformanceMonitoring } from './utils/performanceMonitor';
import { registerServiceWorker } from './utils/registerServiceWorker';
import './index.css';

startPerformanceMonitoring();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
