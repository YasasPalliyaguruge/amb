import { ReactNode, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion';
import type { FrameSequenceSceneConfig } from '../theme/frameSequenceManifest';

interface FrameSequenceSceneProps {
  scene: FrameSequenceSceneConfig;
  sectionId?: string;
  children?: ReactNode;
  className?: string;
  stickyClassName?: string;
  overlayClassName?: string;
  priority?: boolean;
}

export default function FrameSequenceScene({
  scene,
  sectionId,
  children,
  className = '',
  stickyClassName = '',
  overlayClassName = '',
  priority = false,
}: FrameSequenceSceneProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });
  const [frameState, setFrameState] = useState({ index: 0, nextIndex: 0, nextOpacity: 0 });
  const totalFrames = scene.frames.length;

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (shouldReduceMotion || totalFrames <= 1) return;
    const raw = latest * (totalFrames - 1);
    const index = Math.floor(raw);
    const nextIndex = Math.min(totalFrames - 1, index + 1);
    const nextOpacity = raw - index;
    setFrameState({ index, nextIndex, nextOpacity });
  });

  if (shouldReduceMotion) {
    return (
      <section id={sectionId} ref={sectionRef} className={`relative ${className}`}>
        <div className={`relative overflow-hidden ${stickyClassName}`}>
          <img
            src={scene.fallback}
            alt={scene.label}
            width={1600}
            height={1000}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: scene.objectPosition || 'center center' }}
            loading={priority ? 'eager' : 'lazy'}
          />
          <div className={`relative z-10 ${overlayClassName}`}>{children}</div>
        </div>
      </section>
    );
  }

  return (
    <section id={sectionId} ref={sectionRef} className={`relative ${className}`} style={{ height: `${scene.scrollHeightVh}vh` }}>
      <div className={`sticky top-0 h-screen overflow-hidden ${stickyClassName}`}>
        <div className="absolute inset-0">
          <img
            src={scene.frames[frameState.index]}
            alt={scene.label}
            width={1600}
            height={1000}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: scene.objectPosition || 'center center' }}
            loading={priority ? 'eager' : 'lazy'}
          />

          {frameState.nextIndex !== frameState.index && (
            <motion.img
              key={`${scene.id}-${frameState.nextIndex}`}
              src={scene.frames[frameState.nextIndex]}
              alt=""
              aria-hidden="true"
              width={1600}
              height={1000}
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                objectPosition: scene.objectPosition || 'center center',
                opacity: frameState.nextOpacity,
              }}
              loading="lazy"
            />
          )}
        </div>

        <div className={`relative z-10 h-full ${overlayClassName}`}>{children}</div>
      </div>
    </section>
  );
}
