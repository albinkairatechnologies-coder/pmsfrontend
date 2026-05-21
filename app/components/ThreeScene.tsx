'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ──────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ── Scene & Camera ────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0, 30);

    // ── Floating orbs (additive blending light spheres) ──
    const orbData: { mesh: THREE.Mesh; speed: THREE.Vector3; phase: number }[] = [];

    const orbConfigs = [
      { color: 0x6366f1, size: 3.5, x: -12, y: 6,  z: -10 },
      { color: 0x8b5cf6, size: 2.8, x:  14, y: -5, z: -15 },
      { color: 0xf5c842, size: 2.2, x:  -6, y: -9, z: -8  },
      { color: 0x06b6d4, size: 1.8, x:  10, y:  9, z: -12 },
      { color: 0xa855f7, size: 3.0, x:   2, y:  3, z: -20 },
      { color: 0xf59e0b, size: 1.5, x: -16, y: -2, z: -18 },
    ];

    orbConfigs.forEach(cfg => {
      const geo = new THREE.SphereGeometry(cfg.size, 32, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cfg.x, cfg.y, cfg.z);
      scene.add(mesh);
      orbData.push({
        mesh,
        speed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.008,
          (Math.random() - 0.5) * 0.006,
          0,
        ),
        phase: Math.random() * Math.PI * 2,
      });

      // Outer glow halo
      const haloGeo = new THREE.SphereGeometry(cfg.size * 2.8, 32, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.04,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(mesh.position);
      scene.add(halo);
    });

    // ── Particle field ────────────────────────────────
    const PARTICLE_COUNT = 280;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors    = new Float32Array(PARTICLE_COUNT * 3);
    const palette   = [
      new THREE.Color(0x6366f1),
      new THREE.Color(0xf5c842),
      new THREE.Color(0x8b5cf6),
      new THREE.Color(0x06b6d4),
      new THREE.Color(0xffffff),
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 10;
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ── Grid lines (subtle depth grid) ───────────────
    const gridHelper = new THREE.GridHelper(80, 30, 0x6366f1, 0x6366f1);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.04;
    gridHelper.position.y = -18;
    gridHelper.rotation.x = 0.15;
    scene.add(gridHelper);

    // ── Mouse tracking ────────────────────────────────
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    // ── Scroll tracking ───────────────────────────────
    let scrollY = 0;
    const onScroll = () => { scrollY = window.scrollY; };
    window.addEventListener('scroll', onScroll);

    // ── Resize ────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // ── Animation loop ────────────────────────────────
    let raf: number;
    const clock = new THREE.Clock();

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Smooth mouse follow
      targetX += (mouseX - targetX) * 0.04;
      targetY += (mouseY - targetY) * 0.04;

      // Camera parallax from mouse
      camera.position.x = targetX * 3;
      camera.position.y = -targetY * 2 - scrollY * 0.01;
      camera.lookAt(0, 0, 0);

      // Animate orbs
      orbData.forEach((o, i) => {
        o.mesh.position.x += o.speed.x;
        o.mesh.position.y += o.speed.y + Math.sin(t * 0.4 + o.phase) * 0.003;

        // Bounce within bounds
        if (Math.abs(o.mesh.position.x) > 20) o.speed.x *= -1;
        if (Math.abs(o.mesh.position.y) > 14) o.speed.y *= -1;

        // Pulse opacity
        const mat = o.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.12 + Math.sin(t * 0.6 + o.phase) * 0.06;
      });

      // Slowly rotate particle field
      particles.rotation.y = t * 0.015;
      particles.rotation.x = t * 0.008;

      // Grid drift
      gridHelper.position.z = (t * 0.5) % 4;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  );
}
