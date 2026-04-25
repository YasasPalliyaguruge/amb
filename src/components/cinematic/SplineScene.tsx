import { lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { Application } from '@splinetool/runtime';
import { splineRuntimeWarmupPromise, warmSplineScene } from './splineWarmup';

const Spline = lazy(() => splineRuntimeWarmupPromise);

type SplineSceneProps = {
  scene?: string;
  className?: string;
  decorative?: boolean;
  transparentBackground?: boolean;
  onLoad?: (app: Application) => void;
  onError?: (error: unknown) => void;
};

function SplineScene({
  scene,
  className = '',
  decorative = true,
  transparentBackground = true,
  onLoad,
  onError,
}: SplineSceneProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [canRenderScene, setCanRenderScene] = useState(false);
  const hasHandledLoadRef = useRef(false);
  const hasReportedErrorRef = useRef(false);

  useEffect(() => {
    hasHandledLoadRef.current = false;
    hasReportedErrorRef.current = false;
    setIsLoaded(false);
    setCanRenderScene(false);

    if (!scene?.trim()) {
      return;
    }

    let isActive = true;

    warmSplineScene(scene).then((didWarmScene) => {
      if (!isActive) {
        return;
      }

      if (didWarmScene) {
        setCanRenderScene(true);
        return;
      }

      if (!hasReportedErrorRef.current) {
        hasReportedErrorRef.current = true;
        onError?.(new Error(`Failed to warm Spline scene: ${scene}`));
      }
    });

    return () => {
      isActive = false;
    };
  }, [onError, scene]);

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

  if (!scene?.trim() || !canRenderScene) {
    return null;
  }

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
