'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number; 
  maxR: number;
  alpha: number;
  type: 'bokeh' | 'sparkle' | 'stardust';
  color: string;
  glowColor: string;
}

const COLORS = [
  { p: 'rgba(99, 102, 241,', g: '99, 102, 241' },   // Indigo
  { p: 'rgba(168, 85, 247,', g: '168, 85, 247' },  // Purple
  { p: 'rgba(236, 72, 153,', g: '236, 72, 153' },  // Pink
  { p: 'rgba(255, 255, 255,', g: '255, 255, 255' } // White
];

export default function ParticleBackground({ count }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const particles: Particle[] = [];
    
    // Create Layers
    // 1. Large Bokeh (20) - Large soft circles
    for (let i = 0; i < 25; i++) {
      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      particles.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
        maxR: Math.random() * 40 + 20, r: 0,
        alpha: Math.random() * 0.1 + 0.05,
        type: 'bokeh', color: c.p, glowColor: c.g
      });
    }

    // 2. Medium Sparkles (50) - Middle layer
    for (let i = 0; i < 60; i++) {
        const c = COLORS[Math.floor(Math.random() * COLORS.length)];
        particles.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
          maxR: Math.random() * 4 + 2, r: 0,
          alpha: Math.random() * 0.5 + 0.1,
          type: 'sparkle', color: c.p, glowColor: c.g
        });
    }

    // 3. Tiny Stardust (120) - Background depth
    for (let i = 0; i < 150; i++) {
        particles.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.1, vy: (Math.random() - 0.5) * 0.1,
          maxR: Math.random() * 1.5 + 0.5, r: 0,
          alpha: Math.random() * 0.8 + 0.2,
          type: 'stardust', color: 'rgba(255,255,255,', glowColor: '255,255,255'
        });
    }

    // Initialize radius
    particles.forEach(p => p.r = p.maxR);

    const isDark = () => document.documentElement.classList.contains('dark');

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const dark = isDark();

      // DYNAMIC LUXURY GRADIENT BASE
      if (dark) {
          canvas.style.background = 'radial-gradient(circle at top right, #1e1b4b 0%, #111827 50%, #030712 100%)';
      } else {
          canvas.style.background = 'radial-gradient(circle at top right, #f5f3ff 0%, #ffffff 60%, #eff6ff 100%)';
      }

      particles.forEach(p => {
        // Subtle twinkling (pulsing alpha)
        const twinkle = Math.sin(Date.now() * 0.001 + p.x) * 0.15;
        const currentAlpha = Math.max(0.01, p.alpha + twinkle);

        if (p.type === 'bokeh') {
          // Large soft glow
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          grad.addColorStop(0, `${p.color}${currentAlpha})`);
          grad.addColorStop(1, `${p.color}0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        } else if (p.type === 'sparkle') {
          // Sharp glowing point
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${currentAlpha})`;
          ctx.fill();
          
          // Outer bloom
          const bloom = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
          bloom.addColorStop(0, `rgba(${p.glowColor}, ${currentAlpha * 0.3})`);
          bloom.addColorStop(1, `rgba(${p.glowColor}, 0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
          ctx.fillStyle = bloom;
          ctx.fill();
        } else {
          // Tiny stardust point
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${currentAlpha * (dark ? 0.8 : 0.4)})`;
          ctx.fill();
        }

        // Float movement
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < -100) p.x = W + 100;
        if (p.x > W + 100) p.x = -100;
        if (p.y < -100) p.y = H + 100;
        if (p.y > H + 100) p.y = -100;
      });

      raf = requestAnimationFrame(draw);
    };

    draw();

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener('resize', onResize);
    const observer = new MutationObserver(draw);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="particle-canvas fixed top-0 left-0 w-full h-full pointer-events-none -z-10 transition-all duration-1000"
    />
  );
}
