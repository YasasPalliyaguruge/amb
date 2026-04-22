import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

const botanicalPaths = [
  'M15 185 C54 122 92 73 151 37 C194 11 250 4 306 31 C241 51 204 95 186 155 C171 204 133 235 83 246 C48 254 23 232 15 185Z',
  'M36 246 C78 198 121 174 173 169 C229 164 279 183 324 224 C260 241 220 274 194 326 C172 369 133 391 89 381 C48 372 26 319 36 246Z',
  'M191 29 C223 71 235 113 222 156 C204 217 155 260 94 285 C88 222 103 167 139 119 C159 91 169 57 191 29Z',
];

function BotanicalGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 420" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="botanical-petal-gradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(246,238,220,0.72)" />
          <stop offset="54%" stopColor="rgba(118,174,139,0.42)" />
          <stop offset="100%" stopColor="rgba(225,132,101,0.18)" />
        </linearGradient>
        <radialGradient id="botanical-core-gradient" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="rgba(255,204,154,0.95)" />
          <stop offset="52%" stopColor="rgba(198,104,72,0.58)" />
          <stop offset="100%" stopColor="rgba(198,104,72,0)" />
        </radialGradient>
      </defs>
      <g fill="none" stroke="url(#botanical-petal-gradient)" strokeLinecap="round" strokeLinejoin="round">
        {botanicalPaths.map((path, index) => (
          <path key={path} d={path} strokeWidth={index === 1 ? 1.4 : 1.1} />
        ))}
        <path d="M188 390 C175 296 183 203 218 112 C229 82 239 54 248 22" strokeWidth="1.2" />
        <path d="M186 276 C143 251 101 241 58 247" strokeWidth="1" />
        <path d="M202 219 C238 202 278 196 320 202" strokeWidth="1" />
      </g>
      <circle cx="188" cy="226" r="34" fill="url(#botanical-core-gradient)" />
    </svg>
  );
}

export default function CinematicFloralBackdrop() {
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const bloomY = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? [0, 0] : [0, -180]);
  const bloomRotate = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? [0, 0] : [-8, 18]);
  const strandY = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? [0, 0] : [80, -120]);
  const mistOpacity = useTransform(scrollYProgress, [0, 0.45, 1], [0.58, 0.32, 0.5]);

  return (
    <div aria-hidden="true" className="cinematic-floral-backdrop">
      <motion.div className="cinematic-floral-backdrop__mist" style={{ opacity: mistOpacity }} />
      <motion.div
        className="cinematic-floral-backdrop__glyph cinematic-floral-backdrop__glyph--left"
        style={{ y: bloomY, rotate: bloomRotate }}
        animate={shouldReduceMotion ? undefined : { x: [0, 16, -10, 0], scale: [1, 1.035, 0.98, 1] }}
        transition={shouldReduceMotion ? undefined : { duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      >
        <BotanicalGlyph />
      </motion.div>
      <motion.div
        className="cinematic-floral-backdrop__glyph cinematic-floral-backdrop__glyph--right"
        style={{ y: strandY }}
        animate={shouldReduceMotion ? undefined : { x: [0, -20, 12, 0], rotate: [9, 2, 14, 9] }}
        transition={shouldReduceMotion ? undefined : { duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      >
        <BotanicalGlyph />
      </motion.div>
      <motion.div
        className="cinematic-floral-backdrop__wash cinematic-floral-backdrop__wash--amber"
        animate={shouldReduceMotion ? undefined : { y: [0, -22, 14, 0], scale: [1, 1.06, 0.98, 1] }}
        transition={shouldReduceMotion ? undefined : { duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="cinematic-floral-backdrop__wash cinematic-floral-backdrop__wash--sage"
        animate={shouldReduceMotion ? undefined : { y: [0, 18, -10, 0], x: [0, -12, 10, 0] }}
        transition={shouldReduceMotion ? undefined : { duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
