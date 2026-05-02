import { memo, useCallback, useState } from 'react';
import type { Application } from '@splinetool/runtime';
import SplineScene from './SplineScene';
import { PUBLIC_LOADING_SPLINE_SCENE } from './splineWarmup';

type PublicSplinePreloaderProps = {
  isLeaving: boolean;
  isSceneHidden: boolean;
  onSceneReady?: () => void;
};

export default memo(function PublicSplinePreloader({ isLeaving, isSceneHidden, onSceneReady }: PublicSplinePreloaderProps) {
  const [isCoffeeSceneReady, setIsCoffeeSceneReady] = useState(false);

  const handleSceneReady = useCallback((app: Application) => {
    app.requestRender();
    window.requestAnimationFrame(() => app.requestRender());
    setIsCoffeeSceneReady(true);
    onSceneReady?.();
  }, [onSceneReady]);

  const handleSceneError = useCallback(() => {
    setIsCoffeeSceneReady(false);
    onSceneReady?.();
  }, [onSceneReady]);

  return (
    <div
      className={`public-spline-preloader ${isCoffeeSceneReady ? 'public-spline-preloader--coffee-ready' : ''} ${isSceneHidden ? 'public-spline-preloader--scene-hidden' : ''} ${isLeaving ? 'public-spline-preloader--leaving' : ''}`}
      role="status"
      aria-label="Loading website"
    >
      <SplineScene
        scene={PUBLIC_LOADING_SPLINE_SCENE}
        className="public-spline-preloader__scene"
        decorative
        warmBeforeRender={false}
        onLoad={handleSceneReady}
        onError={handleSceneError}
      />
    </div>
  );
});
