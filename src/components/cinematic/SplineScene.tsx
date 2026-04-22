import { lazy, Suspense, useState } from 'react';
import type { Application } from '@splinetool/runtime';

const Spline = lazy(() => import('@splinetool/react-spline'));

type SplineSceneProps = {
  scene?: string;
  className?: string;
  decorative?: boolean;
  onLoad?: (app: Application) => void;
};

export default function SplineScene({
  scene,
  className = '',
  decorative = true,
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
            setIsLoaded(true);
            onLoad?.(app);
          }}
          className={`spline-scene__canvas ${isLoaded ? 'spline-scene__canvas--loaded' : ''}`}
        />
      </Suspense>
    </div>
  );
}
