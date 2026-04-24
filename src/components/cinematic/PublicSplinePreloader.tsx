import { memo, useCallback } from 'react';
import SplineScene from './SplineScene';
import type { Application } from '@splinetool/runtime';
import { PUBLIC_LOADING_SPLINE_SCENE } from './splineWarmup';

const LOADING_SPLINE_BACKDROP_ID = '6083c9f1-1e5b-4f8d-bb61-89e24484a04d';
const LOADING_SPLINE_BACKDROP_NAMES = ['Rectangle 2', 'Rectangle', 'Background', 'Backdrop'];

type PublicSplinePreloaderProps = {
  isLeaving: boolean;
  isSceneHidden: boolean;
  onSceneReady?: () => void;
};

function findBackdrop(app: Application) {
  try {
    const backdropById = app.findObjectById?.(LOADING_SPLINE_BACKDROP_ID);
    if (backdropById) {
      return backdropById;
    }

    for (const name of LOADING_SPLINE_BACKDROP_NAMES) {
      const backdropByName = app.findObjectByName?.(name);
      if (backdropByName) {
        return backdropByName;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export default memo(function PublicSplinePreloader({ isLeaving, isSceneHidden, onSceneReady }: PublicSplinePreloaderProps) {
  const handleSceneReady = useCallback((app: Application) => {
    const backdrop = findBackdrop(app);

    if (backdrop) {
      backdrop.visible = false;
      app.requestRender();
    }

    onSceneReady?.();
  }, [onSceneReady]);

  return (
    <div
      className={`public-spline-preloader ${isSceneHidden ? 'public-spline-preloader--scene-hidden' : ''} ${isLeaving ? 'public-spline-preloader--leaving' : ''}`}
      role="status"
      aria-label="Loading website"
    >
      <SplineScene
        scene={PUBLIC_LOADING_SPLINE_SCENE}
        className="public-spline-preloader__scene"
        decorative
        onLoad={handleSceneReady}
      />
    </div>
  );
});
