export const PUBLIC_LOADING_SPLINE_SCENE = 'https://prod.spline.design/fi4kVao3vk5K2oVj/scene.splinecode';
export const PUBLIC_BACKGROUND_SPLINE_SCENE = 'https://prod.spline.design/mk2OfkXd-CKewFlt/scene.splinecode';

export const splineRuntimeWarmupPromise = import('@splinetool/react-spline');

const warmedSceneUrls = new Set<string>();

const hasFetchSupport = () => typeof window !== 'undefined' && typeof window.fetch === 'function';

export function warmSplineScene(sceneUrl: string) {
  if (!sceneUrl || warmedSceneUrls.has(sceneUrl) || !hasFetchSupport()) {
    return Promise.resolve();
  }

  warmedSceneUrls.add(sceneUrl);

  return window
    .fetch(sceneUrl, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'force-cache',
      priority: 'high',
    } as RequestInit)
    .then(() => undefined)
    .catch(() => undefined);
}

export function warmPublicSplineAssets() {
  return Promise.allSettled([
    splineRuntimeWarmupPromise,
    warmSplineScene(PUBLIC_LOADING_SPLINE_SCENE),
    warmSplineScene(PUBLIC_BACKGROUND_SPLINE_SCENE),
  ]);
}
