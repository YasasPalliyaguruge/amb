import React, { lazy, memo, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Application } from '@splinetool/runtime';
import { loadSplineRuntime, warmSplineScene } from './splineWarmup';

const Spline = lazy(() => loadSplineRuntime());

type SplineSceneProps = {
  scene?: string;
  className?: string;
  decorative?: boolean;
  transparentBackground?: boolean;
  warmBeforeRender?: boolean;
  prepareBeforeReveal?: (app: Application) => void;
  onLoad?: (app: Application) => void;
  onError?: (error: unknown) => void;
};

type TransparentRendererApp = Application & {
  renderer?: {
    setClearAlpha?: (alpha: number) => void;
    setClearColor?: (color: string | number, alpha?: number) => void;
  };
};

type SplineSceneErrorBoundaryProps = {
  children: ReactNode;
  onError?: (error: unknown) => void;
};

type SplineSceneErrorBoundaryState = {
  hasError: boolean;
};

class SplineSceneErrorBoundary extends React.Component<SplineSceneErrorBoundaryProps, SplineSceneErrorBoundaryState> {
  declare props: Readonly<SplineSceneErrorBoundaryProps>;
  state: SplineSceneErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

function makeSplineCanvasTransparent(app: Application) {
  const transparentApp = app as TransparentRendererApp;
  app.setBackgroundColor('rgba(0, 0, 0, 0)');
  transparentApp.renderer?.setClearAlpha?.(0);
  transparentApp.renderer?.setClearColor?.(0x000000, 0);
  app.canvas.style.background = 'transparent';
  app.canvas.style.backgroundColor = 'transparent';
  app.canvas.parentElement?.style.setProperty('background', 'transparent');
  app.requestRender();
  window.requestAnimationFrame(() => app.requestRender());
}

function afterTransparentRepaint(callback: () => void) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(callback);
  });
}

function SplineScene({
  scene,
  className = '',
  decorative = true,
  transparentBackground = true,
  warmBeforeRender = true,
  prepareBeforeReveal,
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

    if (!warmBeforeRender) {
      setCanRenderScene(true);
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
  }, [onError, scene, warmBeforeRender]);

  const handleLoad = useCallback(
    (app: Application) => {
      if (hasHandledLoadRef.current) {
        return;
      }

      hasHandledLoadRef.current = true;

      if (transparentBackground) {
        makeSplineCanvasTransparent(app);
      }

      prepareBeforeReveal?.(app);

      const revealScene = () => {
        setIsLoaded(true);
        onLoad?.(app);
      };

      if (transparentBackground) {
        afterTransparentRepaint(revealScene);
        return;
      }

      revealScene();
    },
    [onLoad, prepareBeforeReveal, transparentBackground]
  );

  if (!scene?.trim() || !canRenderScene) {
    return null;
  }

  return (
    <div className={`spline-scene ${className}`} aria-hidden={decorative ? 'true' : undefined}>
      <SplineSceneErrorBoundary onError={onError}>
        <Suspense fallback={null}>
          <Spline
            scene={scene}
            onLoad={handleLoad}
            className={`spline-scene__canvas ${isLoaded ? 'spline-scene__canvas--loaded' : ''}`}
          />
        </Suspense>
      </SplineSceneErrorBoundary>
    </div>
  );
}

export default memo(SplineScene);
