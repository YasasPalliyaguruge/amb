export const PUBLIC_LOADING_SPLINE_SCENE = '/spline/coffee-loader-clean.splinecode?v=20260427c';
export const PUBLIC_BACKGROUND_SPLINE_SCENE = '/spline/flower-bee-background-clean.splinecode?v=20260427b';

export const splineRuntimeWarmupPromise = import('@splinetool/react-spline');

const warmedScenePromises = new Map<string, Promise<boolean>>();
let publicSplineWarmupPromise: Promise<PromiseSettledResult<unknown>[]> | null = null;

const hasFetchSupport = () => typeof window !== 'undefined' && typeof window.fetch === 'function';
export const isMobileSplineViewport = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
export const isPublicExperienceRoute = (pathname = typeof window !== 'undefined' ? window.location.pathname : '/') =>
  pathname === '/';

export function warmSplineScene(sceneUrl: string) {
  if (!sceneUrl || !hasFetchSupport()) {
    return Promise.resolve(false);
  }

  const cachedPromise = warmedScenePromises.get(sceneUrl);
  if (cachedPromise) {
    return cachedPromise;
  }

  const warmupPromise = window
    .fetch(sceneUrl, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'force-cache',
    } as RequestInit)
    .then((response) => response.ok)
    .catch(() => false);

  warmedScenePromises.set(sceneUrl, warmupPromise);
  return warmupPromise;
}

export function warmPublicSplineAssets() {
  if (!publicSplineWarmupPromise) {
    const tasks: Promise<unknown>[] = [splineRuntimeWarmupPromise, warmSplineScene(PUBLIC_BACKGROUND_SPLINE_SCENE)];

    if (!isMobileSplineViewport()) {
      tasks.push(warmSplineScene(PUBLIC_LOADING_SPLINE_SCENE));
    }

    publicSplineWarmupPromise = Promise.allSettled(tasks);
  }

  return publicSplineWarmupPromise;
}
