import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface FloralSectionRevealProps {
  children: ReactNode;
  index: number;
}

export default function FloralSectionReveal({ children, index }: FloralSectionRevealProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="floral-section-reveal"
      initial={shouldReduceMotion || index === 0 ? false : { opacity: 0.001, filter: 'blur(8px)' }}
      whileInView={shouldReduceMotion || index === 0 ? undefined : { opacity: 1, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-18% 0px -12% 0px' }}
      transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
