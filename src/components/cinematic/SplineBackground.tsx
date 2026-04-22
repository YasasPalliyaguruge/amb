import { useEffect, useState } from 'react';
import SplineScene from './SplineScene';

const CLEAN_SPLINE_BACKGROUND_SCENE = 'https://prod.spline.design/mk2OfkXd-CKewFlt/scene.splinecode';
const SPLINE_BACKGROUND_POSTER = '';

export default function SplineBackground() {
  const [isHeroActive, setIsHeroActive] = useState(true);

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
        fallbackImage={SPLINE_BACKGROUND_POSTER}
        fallbackAlt=""
        className="public-spline-background__scene"
        decorative
        minDesktopWidth={1024}
      />
      <div className="public-spline-background__veil" />
    </div>
  );
}
