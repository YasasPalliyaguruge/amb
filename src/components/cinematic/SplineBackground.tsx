import { useEffect, useRef, useState } from 'react';
import SplineScene from './SplineScene';

const CLEAN_SPLINE_BACKGROUND_SCENE = 'https://prod.spline.design/mk2OfkXd-CKewFlt/scene.splinecode';

type SplineBackgroundProps = {
  onSceneReady?: () => void;
};

export default function SplineBackground({ onSceneReady }: SplineBackgroundProps) {
  const [isHeroActive, setIsHeroActive] = useState(true);
  const hasReportedReady = useRef(false);

  useEffect(() => {
    const hero = document.querySelector('#home');

    if (!hero) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsHeroActive(Boolean(entry?.isIntersecting && entry.intersectionRatio > 0.36)),
      { threshold: [0, 0.2, 0.36, 0.6] }
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`public-spline-background ${isHeroActive ? 'public-spline-background--hero' : ''}`} aria-hidden="true">
      <SplineScene
        scene={CLEAN_SPLINE_BACKGROUND_SCENE}
        className="public-spline-background__scene"
        decorative
        onLoad={() => {
          if (!hasReportedReady.current) {
            hasReportedReady.current = true;
            onSceneReady?.();
          }
        }}
      />
      <div className="public-spline-background__veil" />
    </div>
  );
}
