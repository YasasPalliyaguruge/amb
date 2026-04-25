import { memo, useCallback, useEffect, useRef, useState } from 'react';
import SplineScene from './SplineScene';
import { PUBLIC_BACKGROUND_SPLINE_SCENE } from './splineWarmup';

type SplineBackgroundProps = {
  isVisible?: boolean;
  onSceneReady?: () => void;
};

function SplineBackground({ isVisible = true, onSceneReady }: SplineBackgroundProps) {
  const [isHeroActive, setIsHeroActive] = useState(true);
  const hasReportedReady = useRef(false);

  useEffect(() => {
    const hero = document.querySelector('#home');

    if (!hero) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextIsHeroActive = Boolean(entry?.isIntersecting && entry.intersectionRatio > 0.36);
        setIsHeroActive((currentValue) => (currentValue === nextIsHeroActive ? currentValue : nextIsHeroActive));
      },
      { threshold: [0, 0.2, 0.36, 0.6] }
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  const handleSceneReady = useCallback(() => {
    if (!hasReportedReady.current) {
      hasReportedReady.current = true;
      onSceneReady?.();
    }
  }, [onSceneReady]);

  return (
    <div
      className={`public-spline-background ${isVisible ? 'public-spline-background--visible' : ''} ${isHeroActive ? 'public-spline-background--hero' : ''}`}
      aria-hidden="true"
    >
      <SplineScene
        scene={PUBLIC_BACKGROUND_SPLINE_SCENE}
        className="public-spline-background__scene"
        decorative
        onLoad={handleSceneReady}
        onError={handleSceneReady}
      />
      <div className="public-spline-background__veil" />
    </div>
  );
}

export default memo(SplineBackground);
