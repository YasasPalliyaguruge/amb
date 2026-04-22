import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { Application } from '@splinetool/runtime';

const Spline = lazy(() => import('@splinetool/react-spline'));

type SplineSceneProps = {
  scene: string;
  fallbackImage?: string;
  fallbackAlt?: string;
  className?: string;
  decorative?: boolean;
  minDesktopWidth?: number;
  onLoad?: (app: Application) => void;
};

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const update = () => setMatches(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, [query]);

  return matches;
}

function SplineFallback({ fallbackImage, fallbackAlt, decorative }: Pick<SplineSceneProps, 'fallbackImage' | 'fallbackAlt' | 'decorative'>) {
  if (fallbackImage) {
    return (
      <img
        src={fallbackImage}
        alt={decorative ? '' : fallbackAlt ?? 'Interactive 3D scene preview'}
        aria-hidden={decorative ? 'true' : undefined}
        className="spline-scene__fallback-image"
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <div className="spline-scene__fallback" aria-hidden={decorative ? 'true' : undefined}>
      <span />
    </div>
  );
}

export default function SplineScene({
  scene,
  fallbackImage,
  fallbackAlt,
  className = '',
  decorative = true,
  minDesktopWidth = 768,
  onLoad,
}: SplineSceneProps) {
  const shouldReduceMotion = useReducedMotion();
  const shouldUseFallback = useMediaQuery(`(max-width: ${minDesktopWidth - 1}px)`);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || shouldReduceMotion || shouldUseFallback) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px 0px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [shouldReduceMotion, shouldUseFallback]);

  const showFallback = shouldReduceMotion || shouldUseFallback || !isVisible;

  return (
    <div ref={containerRef} className={`spline-scene ${className}`} aria-hidden={decorative ? 'true' : undefined}>
      {showFallback ? (
        <SplineFallback fallbackImage={fallbackImage} fallbackAlt={fallbackAlt} decorative={decorative} />
      ) : (
        <>
          {!isLoaded && <SplineFallback fallbackImage={fallbackImage} fallbackAlt={fallbackAlt} decorative={decorative} />}
          <Suspense fallback={<SplineFallback fallbackImage={fallbackImage} fallbackAlt={fallbackAlt} decorative={decorative} />}>
            <Spline
              scene={scene}
              onLoad={(app) => {
                setIsLoaded(true);
                onLoad?.(app);
              }}
              className={`spline-scene__canvas ${isLoaded ? 'spline-scene__canvas--loaded' : ''}`}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}
