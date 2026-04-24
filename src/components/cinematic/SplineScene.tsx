import { lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { Application } from '@splinetool/runtime';
import { splineRuntimeWarmupPromise } from './splineWarmup';

const Spline = lazy(() => splineRuntimeWarmupPromise);

type SplineSceneProps = {
  scene?: string;
  className?: string;
  decorative?: boolean;
  transparentBackground?: boolean;
  onLoad?: (app: Application) => void;
};

function SplineScene({
  scene,
  className = '',
  decorative = true,
  transparentBackground = true,
  onLoad,
}: SplineSceneProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const hasHandledLoadRef = useRef(false);

  useEffect(() => {
    hasHandledLoadRef.current = false;
    setIsLoaded(false);
  }, [scene]);

  if (!scene?.trim()) {
    return null;
  }

  const handleLoad = useCallback(
    (app: Application) => {
      if (transparentBackground) {
        app.setBackgroundColor('rgba(0, 0, 0, 0)');
        app.canvas.style.background = 'transparent';
        app.requestRender();
      }

      if (!hasHandledLoadRef.current) {
        hasHandledLoadRef.current = true;
        setIsLoaded(true);
        onLoad?.(app);
      }
    },
    [onLoad, transparentBackground]
  );

  return (
    <div className={`spline-scene ${className}`} aria-hidden={decorative ? 'true' : undefined}>
      <Suspense fallback={null}>
        <Spline
          scene={scene}
          onLoad={handleLoad}
          className={`spline-scene__canvas ${isLoaded ? 'spline-scene__canvas--loaded' : ''}`}
        />
      </Suspense>
    </div>
  );
}

export default memo(SplineScene);
