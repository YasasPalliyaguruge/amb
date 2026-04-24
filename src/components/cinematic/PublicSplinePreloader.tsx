import SplineScene from './SplineScene';
import type { Application } from '@splinetool/runtime';
import { PUBLIC_LOADING_SPLINE_SCENE } from './splineWarmup';
const LOADING_SPLINE_BACKDROP_ID = '6083c9f1-1e5b-4f8d-bb61-89e24484a04d';

type PublicSplinePreloaderProps = {
  isLeaving: boolean;
  isSceneHidden: boolean;
  onSceneReady?: () => void;
};

export default function PublicSplinePreloader({ isLeaving, isSceneHidden, onSceneReady }: PublicSplinePreloaderProps) {
  const handleSceneReady = (app: Application) => {
    const backdrop = app.findObjectById(LOADING_SPLINE_BACKDROP_ID) ?? app.findObjectByName('Rectangle 2');

    if (backdrop) {
      backdrop.visible = false;
      app.requestRender();
    }

    onSceneReady?.();
  };

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
}
