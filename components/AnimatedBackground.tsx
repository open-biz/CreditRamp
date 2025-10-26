'use client';

import { useEffect, useRef } from 'react';

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Dot matrix configuration
    const dotSize = 2;
    const spacing = 20;
    const dots: { x: number; y: number; opacity: number; speed: number }[] = [];

    // Create dots
    for (let x = 0; x < canvas.width; x += spacing) {
      for (let y = 0; y < canvas.height; y += spacing) {
        dots.push({
          x,
          y,
          opacity: Math.random() * 0.5,
          speed: 0.001 + Math.random() * 0.002,
        });
      }
    }

    // Animation
    let animationId: number;
    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.01;

      dots.forEach((dot, i) => {
        // Animate opacity
        const wave = Math.sin(time + i * 0.01) * 0.5 + 0.5;
        dot.opacity = wave * 0.3;

        // Draw dot
        ctx.fillStyle = `rgba(255, 255, 255, ${dot.opacity})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
