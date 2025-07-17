import { useEffect, useState } from "react";

interface BoomEffectProps {
  x: number;
  y: number;
  scale: number;
  offset: { x: number; y: number };
  radius: number;
}

interface Particle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  size: number;
  opacity: number;
}

export default function BoomEffect({
  x,
  y,
  scale,
  offset,
  radius,
}: BoomEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    let stage = 0;
    const maxStages = Math.floor(Math.random() * 2) + 5; // 2 hoặc 3 lượt nổ

    const triggerExplosion = () => {
      const explosionRadius = radius * (0.8 - stage * 0.3); // giảm dần radius
      const newParticles: Particle[] = [];

      for (let i = 0; i < 200; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * explosionRadius;
        const speed = Math.random() * 0.5 + 0.2;

        newParticles.push({
          x: x + 0.5,
          y: y + 0.5,
          dx: Math.cos(angle) * distance * speed,
          dy: Math.sin(angle) * distance * speed,
          color: `hsl(${Math.floor(Math.random() * 40 + 20)}, 100%, 60%)`,
          size: Math.random() * 3 + 2,
          opacity: 1,
        });
      }

      setParticles((prev) => [...prev, ...newParticles]);
      stage++;
    };

    triggerExplosion(); // nổ đầu tiên

    const stageInterval = setInterval(() => {
      if (stage >= maxStages) {
        clearInterval(stageInterval);
        return;
      }
      triggerExplosion();
    }, 300); // cách nhau 300ms mỗi đợt nổ

    const moveInterval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.dx,
            y: p.y + p.dy,
            dx: p.dx * 0.9,
            dy: p.dy * 0.9,
            opacity: p.opacity - 0.02,
          }))
          .filter((p) => p.opacity > 0)
      );
    }, 16);

    const timeout = setTimeout(() => {
      clearInterval(moveInterval);
    }, 4000);

    return () => {
      clearInterval(stageInterval);
      clearInterval(moveInterval);
      clearTimeout(timeout);
    };
  }, [x, y, radius]);

  return (
    <>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            opacity: p.opacity,
            left: `${(p.x - offset.x) * scale}px`,
            top: `${(p.y - offset.y) * scale}px`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </>
  );
}
