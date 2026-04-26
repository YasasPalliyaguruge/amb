type MetricName =
  | 'ttfb'
  | 'fcp'
  | 'lcp'
  | 'cls'
  | 'inp'
  | 'public-ready'
  | 'route-loader-ready';

type MetricRating = 'good' | 'needs-improvement' | 'poor';

type MetricPayload = {
  name: MetricName;
  value: number;
  rating: MetricRating;
  path: string;
  timestamp: number;
  detail?: Record<string, string | number | boolean | null>;
};

const PERF_BUFFER_KEY = 'amb-perf-buffer-v1';
const PERF_ENDPOINT = import.meta.env.VITE_PERF_ENDPOINT?.trim();
const PERF_BUFFER_LIMIT = 24;
const REPORTED_ONCE = new Set<string>();

function getPathname() {
  return typeof window === 'undefined' ? '/' : window.location.pathname + window.location.hash;
}

function classifyMetric(name: MetricName, value: number): MetricRating {
  switch (name) {
    case 'cls':
      if (value <= 0.1) return 'good';
      if (value <= 0.25) return 'needs-improvement';
      return 'poor';
    case 'inp':
      if (value <= 200) return 'good';
      if (value <= 500) return 'needs-improvement';
      return 'poor';
    case 'ttfb':
      if (value <= 800) return 'good';
      if (value <= 1800) return 'needs-improvement';
      return 'poor';
    case 'fcp':
      if (value <= 1800) return 'good';
      if (value <= 3000) return 'needs-improvement';
      return 'poor';
    case 'lcp':
    case 'public-ready':
    case 'route-loader-ready':
      if (value <= 2500) return 'good';
      if (value <= 4000) return 'needs-improvement';
      return 'poor';
    default:
      return 'good';
  }
}

function readMetricBuffer(): MetricPayload[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(PERF_BUFFER_KEY);
    return raw ? (JSON.parse(raw) as MetricPayload[]) : [];
  } catch {
    return [];
  }
}

function writeMetricBuffer(metrics: MetricPayload[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(PERF_BUFFER_KEY, JSON.stringify(metrics.slice(-PERF_BUFFER_LIMIT)));
  } catch {
    // Best-effort only.
  }
}

function persistMetric(payload: MetricPayload) {
  const next = [...readMetricBuffer(), payload];
  writeMetricBuffer(next);
}

function emitMetric(payload: MetricPayload) {
  persistMetric(payload);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('amb:performance-metric', { detail: payload }));
  }

  if (import.meta.env.DEV) {
    console.info('[AMB perf]', payload);
  }

  if (!PERF_ENDPOINT || typeof navigator === 'undefined') {
    return;
  }

  const body = JSON.stringify(payload);

  try {
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(PERF_ENDPOINT, blob);
      return;
    }
  } catch {
    // Fall back to fetch below.
  }

  void fetch(PERF_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    mode: 'cors',
  }).catch(() => undefined);
}

export function recordPerformanceMetric(
  name: MetricName,
  value: number,
  detail?: MetricPayload['detail'],
  onceKey = `${name}:${getPathname()}`
) {
  if (typeof window === 'undefined' || !Number.isFinite(value)) {
    return;
  }

  if (REPORTED_ONCE.has(onceKey)) {
    return;
  }

  REPORTED_ONCE.add(onceKey);

  emitMetric({
    name,
    value: Math.round(value * 100) / 100,
    rating: classifyMetric(name, value),
    path: getPathname(),
    timestamp: Date.now(),
    detail,
  });
}

export function startPerformanceMonitoring() {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    return;
  }

  const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (navigationEntry) {
    recordPerformanceMetric('ttfb', navigationEntry.responseStart);
  }

  try {
    const paintObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          recordPerformanceMetric('fcp', entry.startTime);
        }
      }
    });
    paintObserver.observe({ type: 'paint', buffered: true });
  } catch {
    // Ignore unsupported observers.
  }

  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        recordPerformanceMetric('lcp', lastEntry.startTime, undefined, `lcp:${getPathname()}:${Math.round(lastEntry.startTime)}`);
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.visibilityState === 'hidden') {
          lcpObserver.disconnect();
        }
      },
      { once: true }
    );
  } catch {
    // Ignore unsupported observers.
  }

  try {
    let cumulativeShift = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as Array<PerformanceEntry & { hadRecentInput?: boolean; value?: number }>) {
        if (!entry.hadRecentInput) {
          cumulativeShift += entry.value || 0;
        }
      }

      recordPerformanceMetric('cls', cumulativeShift, undefined, `cls:${getPathname()}`);
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // Ignore unsupported observers.
  }

  try {
    const inpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries() as Array<PerformanceEntry & { duration?: number }>;
      const slowestEntry = entries.reduce((slowest, current) =>
        (current.duration || 0) > (slowest.duration || 0) ? current : slowest,
      entries[0]);

      if (slowestEntry?.duration != null) {
        recordPerformanceMetric('inp', slowestEntry.duration, undefined, `inp:${getPathname()}`);
      }
    });
    inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 40 } as any);
  } catch {
    // Ignore unsupported observers.
  }
}
