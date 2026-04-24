export const PUBLIC_LOADING_SPLINE_SCENE = 'https://prod.spline.design/fi4kVao3vk5K2oVj/scene.splinecode';
export const PUBLIC_BACKGROUND_SPLINE_SCENE = 'https://prod.spline.design/mk2OfkXd-CKewFlt/scene.splinecode';

export const splineRuntimeWarmupPromise = import('@splinetool/react-spline');

const warmedScenePromises = new Map<string, Promise<void>>();
let publicSplineWarmupPromise: Promise<PromiseSettledResult<unknown>[]> | null = null;

const hasFetchSupport = () => typeof window !== 'undefined' && typeof window.fetch === 'function';

export function warmSplineScene(sceneUrl: string) {
  if (!sceneUrl || !hasFetchSupport()) {
    return Promise.resolve();
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
    .then(() => undefined)
    .catch(() => undefined);

  warmedScenePromises.set(sceneUrl, warmupPromise);
  return warmupPromise;
}

export function warmPublicSplineAssets() {
  if (!publicSplineWarmupPromise) {
    publicSplineWarmupPromise = Promise.allSettled([
      splineRuntimeWarmupPromise,
      warmSplineScene(PUBLIC_LOADING_SPLINE_SCENE),
      warmSplineScene(PUBLIC_BACKGROUND_SPLINE_SCENE),
    ]);
  }

  return publicSplineWarmupPromise;
}
