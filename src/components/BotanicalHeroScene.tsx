import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

function BotanicalHeroFallback() {
  return (
    <div className="botanical-hero-fallback" aria-hidden="true">
      <svg viewBox="0 0 520 520">
        <defs>
          <linearGradient id="fallback-petal" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(246,239,222,0.88)" />
            <stop offset="52%" stopColor="rgba(126,180,143,0.56)" />
            <stop offset="100%" stopColor="rgba(212,119,84,0.28)" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#fallback-petal)" strokeLinecap="round" strokeLinejoin="round">
          <path d="M274 479 C242 358 246 236 300 112" strokeWidth="2" />
          <path d="M285 302 C222 253 146 247 72 287 C142 316 199 342 248 408" strokeWidth="1.4" />
          <path d="M302 249 C360 200 421 184 486 202 C424 245 383 291 352 359" strokeWidth="1.4" />
          <path d="M292 118 C231 132 184 171 151 232 C224 220 278 184 318 124" strokeWidth="1.6" />
          <path d="M317 104 C367 111 404 141 430 194 C372 184 331 156 307 111" strokeWidth="1.3" />
        </g>
        <circle cx="301" cy="244" r="42" fill="rgba(209,116,82,0.23)" />
        <circle cx="301" cy="244" r="11" fill="rgba(246,217,168,0.72)" />
      </svg>
    </div>
  );
}

export default function BotanicalHeroScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [shouldUseFallback, setShouldUseFallback] = useState(true);

  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 900px)').matches;
    const canvas = canvasRef.current;

    if (!canvas || shouldReduceMotion || !isDesktop) {
      setShouldUseFallback(true);
      return;
    }

    let cleanup: () => void = () => undefined;
    let isMounted = true;

    void import('three')
      .then((THREE) => {
        if (!isMounted || !canvasRef.current) {
          return;
        }

        const renderer = new THREE.WebGLRenderer({
          canvas: canvasRef.current,
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        });
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
        camera.position.set(0, 0.1, 8.2);

        const root = new THREE.Group();
        scene.add(root);

        const petalShape = new THREE.Shape();
        petalShape.moveTo(0, 0);
        petalShape.bezierCurveTo(0.42, 0.16, 0.72, 0.78, 0.16, 1.48);
        petalShape.bezierCurveTo(-0.42, 0.76, -0.32, 0.16, 0, 0);
        const petalGeometry = new THREE.ShapeGeometry(petalShape, 28);
        petalGeometry.center();

        const stemMaterial = new THREE.MeshBasicMaterial({ color: 0x7bb08d, transparent: true, opacity: 0.42 });
        const petalMaterials = [0xf4ecd7, 0xb6cda2, 0xd68b68, 0x88b18b].map(
          (color, index) =>
            new THREE.MeshBasicMaterial({
              color,
              transparent: true,
              opacity: index === 0 ? 0.72 : 0.56,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
        );

        const flower = new THREE.Group();
        for (let i = 0; i < 14; i += 1) {
          const petal = new THREE.Mesh(petalGeometry, petalMaterials[i % petalMaterials.length]);
          const angle = (i / 14) * Math.PI * 2;
          petal.position.set(Math.cos(angle) * 0.36, Math.sin(angle) * 0.32, Math.sin(angle * 2) * 0.28);
          petal.rotation.set(0.72 + Math.sin(angle) * 0.28, 0.2 + Math.cos(angle) * 0.5, angle);
          petal.scale.setScalar(0.86 + (i % 3) * 0.08);
          flower.add(petal);
        }

        const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xf0c78f, transparent: true, opacity: 0.86 });
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 32, 16),
          coreMaterial
        );
        flower.add(core);
        flower.position.set(1.02, 0.74, 0);
        flower.scale.setScalar(1.35);
        root.add(flower);

        const stemCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-1.6, -2.3, -0.2),
          new THREE.Vector3(-0.72, -1.05, 0.15),
          new THREE.Vector3(0.28, -0.22, -0.1),
          new THREE.Vector3(0.95, 0.72, 0.03),
        ]);
        const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 64, 0.018, 8, false), stemMaterial);
        root.add(stem);

        const leafShape = new THREE.Shape();
        leafShape.moveTo(0, 0);
        leafShape.bezierCurveTo(0.9, 0.1, 1.22, 0.86, 0.2, 1.32);
        leafShape.bezierCurveTo(-0.54, 0.7, -0.32, 0.14, 0, 0);
        const leafGeometry = new THREE.ShapeGeometry(leafShape, 28);
        leafGeometry.center();
        const leafMaterial = new THREE.MeshBasicMaterial({
          color: 0x8eb689,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
          depthWrite: false,
        });

        [-1, 1].forEach((direction, index) => {
          const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
          leaf.position.set(-0.55 + index * 1.1, -1.0 + index * 0.32, -0.2);
          leaf.rotation.set(0.35, direction * 0.7, direction * 0.92);
          leaf.scale.set(1.05, 0.74, 1);
          root.add(leaf);
        });

        root.rotation.set(-0.14, -0.2, -0.16);

        const resize = () => {
          const parent = canvas.parentElement;
          const width = Math.max(parent?.clientWidth || 360, 1);
          const height = Math.max(parent?.clientHeight || 360, 1);
          renderer.setSize(width, height, false);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };

        let frameId = 0;
        const animate = () => {
          const elapsed = performance.now() * 0.001;
          root.rotation.y = -0.2 + Math.sin(elapsed * 0.35) * 0.18;
          root.rotation.x = -0.14 + Math.cos(elapsed * 0.28) * 0.06;
          flower.rotation.z = Math.sin(elapsed * 0.42) * 0.12;
          renderer.render(scene, camera);
          frameId = window.requestAnimationFrame(animate);
        };

        resize();
        window.addEventListener('resize', resize);
        animate();
        setShouldUseFallback(false);

        cleanup = () => {
          window.cancelAnimationFrame(frameId);
          window.removeEventListener('resize', resize);
          petalGeometry.dispose();
          stem.geometry.dispose();
          stemMaterial.dispose();
          petalMaterials.forEach((material) => material.dispose());
          core.geometry.dispose();
          coreMaterial.dispose();
          leafGeometry.dispose();
          leafMaterial.dispose();
          renderer.dispose();
        };
      })
      .catch(() => setShouldUseFallback(true));

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [shouldReduceMotion]);

  return (
    <motion.div
      className="botanical-hero-scene"
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0.96, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <canvas ref={canvasRef} className="botanical-hero-scene__canvas" />
      {shouldUseFallback ? <BotanicalHeroFallback /> : null}
      <div className="botanical-hero-scene__halo" />
    </motion.div>
  );
}
