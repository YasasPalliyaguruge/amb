import SplineScene from './SplineScene';

const HERO_SPLINE_SCENE = 'https://prod.spline.design/mk2OfkXd-CKewFlt/scene.splinecode';

type HeroSplineAccentProps = {
  fallbackImage: string;
};

export default function HeroSplineAccent({ fallbackImage }: HeroSplineAccentProps) {
  return (
    <div className="hero-spline-accent" aria-hidden="true">
      <SplineScene
        scene={HERO_SPLINE_SCENE}
        fallbackImage={fallbackImage}
        fallbackAlt=""
        decorative
        minDesktopWidth={1024}
      />
    </div>
  );
}
