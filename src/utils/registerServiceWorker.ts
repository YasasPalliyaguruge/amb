const SERVICE_WORKER_URL = '/sw.js';

export function registerServiceWorker() {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !import.meta.env.PROD ||
    import.meta.env.VITE_DISABLE_SW === 'true'
  ) {
    return;
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(SERVICE_WORKER_URL).catch((error) => {
      if (import.meta.env.DEV) {
        console.warn('[AMB sw] registration failed', error);
      }
    });
  });
}

