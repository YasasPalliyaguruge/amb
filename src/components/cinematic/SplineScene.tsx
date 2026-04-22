import { lazy, Suspense, useState } from 'react';
import type { Application } from '@splinetool/runtime';

const Spline = lazy(() => import('@splinetool/react-spline'));

type SplineSceneProps = {
  scene?: string;
  className?: string;
  decorative?: boolean;
  transparentBackground?: boolean;
  onLoad?: (app: Application) => void;
};

export default function SplineScene({
  scene,
  className = '',
  decorative = true,
  transparentBackground = true,
  onLoad,
}: SplineSceneProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  if (!scene?.trim()) {
    return null;
  }

  return (
    <div className={`spline-scene ${className}`} aria-hidden={decorative ? 'true' : undefined}>
      <Suspense fallback={null}>
        <Spline
          scene={scene}
          onLoad={(app) => {
            if (transparentBackground) {
              app.setBackgroundColor('rgba(0, 0, 0, 0)');
              app.canvas.style.background = 'transparent';
              app.requestRender();
            }
            setIsLoaded(true);
            onLoad?.(app);
          }}
          className={`spline-scene__canvas ${isLoaded ? 'spline-scene__canvas--loaded' : ''}`}
        />
      </Suspense>
    </div>
  );
}
