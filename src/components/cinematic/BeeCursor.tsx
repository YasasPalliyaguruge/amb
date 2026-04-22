import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

export default function BeeCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const cursor = cursorRef.current;
    const supportsPointer = window.matchMedia('(pointer: fine)').matches;

    if (!cursor || !supportsPointer || shouldReduceMotion) {
      return;
    }

    const target = { x: window.innerWidth * 0.68, y: window.innerHeight * 0.4 };
    const current = { ...target };
    let rafId = 0;

    const updateTarget = (event: PointerEvent) => {
      target.x = event.clientX + 18;
      target.y = event.clientY - 18;
      cursor.classList.add('bee-cursor--visible');
    };

    const animate = () => {
      current.x += (target.x - current.x) * 0.14;
      current.y += (target.y - current.y) * 0.14;
      const tilt = Math.max(-18, Math.min(18, (target.x - current.x) * 0.08));
      cursor.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) rotate(${tilt}deg)`;
      rafId = window.requestAnimationFrame(animate);
    };

    window.addEventListener('pointermove', updateTarget, { passive: true });
    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('pointermove', updateTarget);
      window.cancelAnimationFrame(rafId);
    };
  }, [shouldReduceMotion]);

  if (shouldReduceMotion) {
    return null;
  }

  return (
    <div ref={cursorRef} className="bee-cursor" aria-hidden="true">
      <svg viewBox="0 0 64 52">
        <ellipse className="bee-cursor__wing bee-cursor__wing--left" cx="24" cy="17" rx="13" ry="9" />
        <ellipse className="bee-cursor__wing bee-cursor__wing--right" cx="39" cy="15" rx="13" ry="9" />
        <ellipse className="bee-cursor__body" cx="34" cy="29" rx="18" ry="12" />
        <path className="bee-cursor__stripe" d="M24 19c4 7 4 14 0 21" />
        <path className="bee-cursor__stripe" d="M35 17c4 8 4 17 0 25" />
        <circle className="bee-cursor__head" cx="18" cy="29" r="8" />
        <path className="bee-cursor__antenna" d="M14 22c-5-6-8-8-11-8" />
        <path className="bee-cursor__antenna" d="M19 21c-2-7-2-10 1-14" />
      </svg>
    </div>
  );
}
