import { memo, useCallback, useEffect, useRef, useState } from 'react';
import SplineScene from './SplineScene';
import type { Application, SPEObject } from '@splinetool/runtime';
import { PUBLIC_BACKGROUND_SPLINE_SCENE } from './splineWarmup';

const BACKGROUND_SCENE_OBJECT_KEYWORDS = ['background', 'backdrop', 'withbackground', 'floor'];
const BACKGROUND_SCENE_OBJECT_NAMES = ['plane'];

type SplineBackgroundProps = {
  isVisible?: boolean;
  onSceneReady?: () => void;
};

function shouldHideBackgroundObject(object: SPEObject) {
  const name = (object.name || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return BACKGROUND_SCENE_OBJECT_NAMES.includes(name) || BACKGROUND_SCENE_OBJECT_KEYWORDS.some((keyword) => name.includes(keyword));
}

function hideBackgroundObjects(app: Application) {
  try {
    app.getAllObjects?.().forEach((object) => {
      if (shouldHideBackgroundObject(object)) {
        object.hide?.();
        object.visible = false;
      }
    });
  } catch {
    // Keep the decorative scene alive if Spline object inspection is unavailable.
  }

  app.canvas.style.background = 'transparent';
  app.canvas.style.backgroundColor = 'transparent';
  app.requestRender();
  window.requestAnimationFrame(() => app.requestRender());
}

function SplineBackground({ isVisible = true, onSceneReady }: SplineBackgroundProps) {
  const [isHeroActive, setIsHeroActive] = useState(true);
  const [shouldLoadScene, setShouldLoadScene] = useState(false);
  const hasReportedReady = useRef(false);

  useEffect(() => {
    if (!isVisible || shouldLoadScene) {
      return;
    }

    setShouldLoadScene(true);
  }, [isVisible, shouldLoadScene]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

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
  }, [isVisible]);

  const prepareSceneBeforeReveal = useCallback((app: Application) => {
    hideBackgroundObjects(app);
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
      {shouldLoadScene && (
        <SplineScene
          scene={PUBLIC_BACKGROUND_SPLINE_SCENE}
          className="public-spline-background__scene"
          decorative
          warmBeforeRender={false}
          prepareBeforeReveal={prepareSceneBeforeReveal}
          onLoad={handleSceneReady}
          onError={handleSceneReady}
        />
      )}
      <div className="public-spline-background__veil" />
    </div>
  );
}

export default memo(SplineBackground);
