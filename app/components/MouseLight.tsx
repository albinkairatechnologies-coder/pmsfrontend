'use client';

import { useEffect, useRef } from 'react';

export default function MouseLight() {
  const lightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let cx = x, cy = y;
    let raf: number;

    const onMove = (e: MouseEvent) => { x = e.clientX; y = e.clientY; };
    window.addEventListener('mousemove', onMove);

    const animate = () => {
      // Smooth follow with lerp
      cx += (x - cx) * 0.08;
      cy += (y - cy) * 0.08;
      if (lightRef.current) {
        lightRef.current.style.left = `${cx}px`;
        lightRef.current.style.top  = `${cy}px`;
      }
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={lightRef} className="mouse-light" />;
}
