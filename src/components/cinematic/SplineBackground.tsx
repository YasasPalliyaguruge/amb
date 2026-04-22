import SplineScene from './SplineScene';

const CLEAN_SPLINE_BACKGROUND_SCENE = 'https://prod.spline.design/mk2OfkXd-CKewFlt/scene.splinecode';
const SPLINE_BACKGROUND_POSTER = '';

export default function SplineBackground() {
  return (
    <div className="public-spline-background" aria-hidden="true">
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
