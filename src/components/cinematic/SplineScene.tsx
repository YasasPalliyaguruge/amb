import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { Application } from '@splinetool/runtime';

const Spline = lazy(() => import('@splinetool/react-spline'));

type SplineSceneProps = {
  scene?: string;
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
      <svg className="spline-scene__fallback-botanical" viewBox="0 0 420 360" role="presentation" focusable="false">
        <defs>
          <radialGradient id="fallbackYellowPetal" cx="50%" cy="45%" r="58%">
            <stop offset="0%" stopColor="#f8ee97" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#d8bc30" stopOpacity="0.7" />
          </radialGradient>
          <radialGradient id="fallbackPinkPetal" cx="50%" cy="45%" r="58%">
            <stop offset="0%" stopColor="#ebb0df" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#b45fae" stopOpacity="0.66" />
          </radialGradient>
        </defs>
        <path className="spline-scene__fallback-stem" d="M188 316 C176 250 178 198 206 126" />
        <path className="spline-scene__fallback-stem" d="M224 318 C224 250 244 200 272 128" />
        <path className="spline-scene__fallback-stem" d="M150 320 C146 256 136 206 118 142" />
        <path className="spline-scene__fallback-leaf" d="M191 238 C151 221 137 244 126 270 C162 270 184 260 191 238Z" />
        <path className="spline-scene__fallback-leaf" d="M228 252 C263 230 285 244 303 266 C266 274 241 268 228 252Z" />
        <g className="spline-scene__fallback-flower spline-scene__fallback-flower--yellow" transform="translate(118 126)">
          <ellipse rx="24" ry="43" transform="rotate(0)" />
          <ellipse rx="24" ry="43" transform="rotate(72)" />
          <ellipse rx="24" ry="43" transform="rotate(144)" />
          <ellipse rx="24" ry="43" transform="rotate(216)" />
          <ellipse rx="24" ry="43" transform="rotate(288)" />
          <circle r="9" />
        </g>
        <g className="spline-scene__fallback-flower spline-scene__fallback-flower--yellow spline-scene__fallback-flower--late" transform="translate(276 126) scale(0.88)">
          <ellipse rx="22" ry="39" transform="rotate(0)" />
          <ellipse rx="22" ry="39" transform="rotate(72)" />
          <ellipse rx="22" ry="39" transform="rotate(144)" />
          <ellipse rx="22" ry="39" transform="rotate(216)" />
          <ellipse rx="22" ry="39" transform="rotate(288)" />
          <circle r="8" />
        </g>
        <g className="spline-scene__fallback-flower spline-scene__fallback-flower--pink" transform="translate(188 232) scale(0.9)">
          <ellipse rx="23" ry="42" transform="rotate(0)" />
          <ellipse rx="23" ry="42" transform="rotate(72)" />
          <ellipse rx="23" ry="42" transform="rotate(144)" />
          <ellipse rx="23" ry="42" transform="rotate(216)" />
          <ellipse rx="23" ry="42" transform="rotate(288)" />
          <circle r="8" />
        </g>
        <g className="spline-scene__fallback-flower spline-scene__fallback-flower--pink spline-scene__fallback-flower--late" transform="translate(286 226) scale(0.86)">
          <ellipse rx="22" ry="39" transform="rotate(0)" />
          <ellipse rx="22" ry="39" transform="rotate(72)" />
          <ellipse rx="22" ry="39" transform="rotate(144)" />
          <ellipse rx="22" ry="39" transform="rotate(216)" />
          <ellipse rx="22" ry="39" transform="rotate(288)" />
          <circle r="8" />
        </g>
        <g className="spline-scene__fallback-bee" transform="translate(286 134)">
          <ellipse className="spline-scene__fallback-bee-wing" cx="-5" cy="-11" rx="14" ry="8" transform="rotate(-24)" />
          <ellipse className="spline-scene__fallback-bee-wing" cx="12" cy="-12" rx="13" ry="8" transform="rotate(20)" />
          <ellipse className="spline-scene__fallback-bee-body" cx="6" cy="2" rx="20" ry="12" />
          <path className="spline-scene__fallback-bee-line" d="M-1 -8 C4 -2 4 5 1 11" />
          <path className="spline-scene__fallback-bee-line" d="M11 -8 C15 -2 15 5 12 11" />
          <circle className="spline-scene__fallback-bee-head" cx="-15" cy="0" r="8" />
        </g>
      </svg>
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

  const hasScene = Boolean(scene?.trim());
  const showFallback = !hasScene || shouldReduceMotion || shouldUseFallback || !isVisible;

  return (
    <div ref={containerRef} className={`spline-scene ${className}`} aria-hidden={decorative ? 'true' : undefined}>
      {showFallback ? (
        <SplineFallback fallbackImage={fallbackImage} fallbackAlt={fallbackAlt} decorative={decorative} />
      ) : (
        <>
          {!isLoaded && <SplineFallback fallbackImage={fallbackImage} fallbackAlt={fallbackAlt} decorative={decorative} />}
          <Suspense fallback={<SplineFallback fallbackImage={fallbackImage} fallbackAlt={fallbackAlt} decorative={decorative} />}>
            <Spline
              scene={scene ?? ''}
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
