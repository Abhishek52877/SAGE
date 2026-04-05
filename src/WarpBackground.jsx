import React, { useEffect, useState } from 'react';
import { Warp } from '@paper-design/shaders-react';

/** SAGE · brand-aligned warp (deep crimson / black / subtle cool depth) — matches Netflix-style red twin vibe */
const WARP_COLORS = [
  'hsl(0, 0%, 4%)',
  'hsl(355, 65%, 12%)',
  'hsl(358, 78%, 38%)',
  'hsl(195, 35%, 14%)',
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return reduced;
}

export function WarpBackground() {
  const reduced = usePrefersReducedMotion();

  const vignette = (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        background: `
          linear-gradient(180deg, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.28) 38%, rgba(0, 0, 0, 0.88) 100%),
          radial-gradient(ellipse 110% 55% at 50% -8%, rgba(229, 9, 20, 0.2), transparent 52%)
        `,
      }}
    />
  );

  if (reduced) {
    return (
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(ellipse 100% 70% at 50% 0%, rgba(229, 9, 20, 0.2), transparent 55%),
              linear-gradient(165deg, hsl(355, 40%, 8%) 0%, hsl(0, 0%, 3%) 45%, hsl(200, 25%, 6%) 100%)
            `,
          }}
        />
        {vignette}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <Warp
        style={{ height: '100%', width: '100%', display: 'block', position: 'relative', zIndex: 0 }}
        proportion={0.45}
        softness={1}
        distortion={0.25}
        swirl={0.8}
        swirlIterations={10}
        shape="checks"
        shapeScale={0.1}
        scale={1}
        rotation={0}
        speed={0.85}
        colors={WARP_COLORS}
      />
      {vignette}
    </div>
  );
}
