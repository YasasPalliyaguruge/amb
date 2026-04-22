import SplineScene from './SplineScene';

const PUBLIC_LOADING_SPLINE_SCENE = 'https://prod.spline.design/fi4kVao3vk5K2oVj/scene.splinecode';

type PublicSplinePreloaderProps = {
  isExiting: boolean;
  onSceneReady?: () => void;
};

export default function PublicSplinePreloader({ isExiting, onSceneReady }: PublicSplinePreloaderProps) {
  return (
    <div
      className={`public-spline-preloader ${isExiting ? 'public-spline-preloader--leaving' : ''}`}
      role="status"
      aria-label="Loading website"
    >
      <SplineScene
        scene={PUBLIC_LOADING_SPLINE_SCENE}
        className="public-spline-preloader__scene"
        decorative
        onLoad={onSceneReady}
      />
      <div className="public-spline-preloader__watermark-cover" aria-hidden="true" />
    </div>
  );
}
