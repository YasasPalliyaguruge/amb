import { useRef, type Key, type PointerEvent, type ReactNode } from 'react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

interface InteractivePlaneProps {
  children: ReactNode;
  key?: Key;
  className?: string;
  glowClassName?: string;
  intensity?: number;
}

export default function InteractivePlane({
  children,
  className = '',
  glowClassName = '',
  intensity,
}: InteractivePlaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { siteSettings } = useSiteSettings();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 180, damping: 18, mass: 0.3 });
  const springY = useSpring(pointerY, { stiffness: 180, damping: 18, mass: 0.3 });
  const tilt = intensity ?? siteSettings.motion.pointerStrength;
  const rotateX = useTransform(springY, [-1, 1], [tilt, -tilt]);
  const rotateY = useTransform(springX, [-1, 1], [-tilt, tilt]);
  const translateX = useTransform(springX, [-1, 1], [-tilt * 0.6, tilt * 0.6]);
  const translateY = useTransform(springY, [-1, 1], [-tilt * 0.45, tilt * 0.45]);
  const glow = useMotionTemplate`radial-gradient(circle at ${useTransform(springX, [-1, 1], ['20%', '80%'])} ${useTransform(springY, [-1, 1], ['20%', '80%'])}, rgb(var(--theme-accent-rgb) / 0.18), transparent 48%)`;

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !containerRef.current) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    pointerX.set((x - 0.5) * 2);
    pointerY.set((y - 0.5) * 2);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <motion.div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      onPointerUp={resetPointer}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
      style={
        shouldReduceMotion
          ? undefined
          : {
              rotateX,
              rotateY,
              x: translateX,
              y: translateY,
              transformStyle: 'preserve-3d',
            }
      }
      className={`relative will-change-transform ${className}`}
    >
      {!shouldReduceMotion && (
        <motion.div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${glowClassName}`}
          style={{ backgroundImage: glow }}
        />
      )}
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}
