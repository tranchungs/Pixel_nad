import { useEffect, useState } from "react";

interface BoomEffectProps {
  x: number;
  y: number;
  scale: number;
  offset: { x: number; y: number };
  radius: number;
  duration?: number; // 🎯 Thêm prop để điều chỉnh thời gian (giây)
}

interface PixelParticle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  size: number;
  opacity: number;
  lifetime: number;
  maxLifetime: number;
  rotation: number;
  rotationSpeed: number;
}

export default function BoomEffect({
  x,
  y,
  scale,
  offset,
  radius,
  duration = 5, // 🎯 Default 2 giây, có thể chỉnh
}: BoomEffectProps) {
  const [pixels, setPixels] = useState<PixelParticle[]>([]);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    // Quick flash
    setFlash(true);
    setTimeout(() => setFlash(false), 100);

    // Bomb explosion colors (dark bomb + fire)
    const bombColors = ["#2C2C2C", "#404040", "#1A1A1A"]; // Dark bomb pieces
    const fireColors = ["#FFFFFF", "#FFFF00", "#FFA500", "#FF4500", "#FF0000"]; // Fire

    const createBombExplosion = () => {
      const newPixels: PixelParticle[] = [];
      const explosionForce = 12; // 🚀 Strong explosion force
      const framesToLive = Math.floor((duration * 1000) / 50); // Convert seconds to frames

      // 💣 BOMB PIECES - dark chunks flying out
      for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30 + Math.random() * 0.5;
        const speed =
          (Math.random() * explosionForce + explosionForce * 0.5) * 0.15;
        const size = Math.random() * 2 + 1;

        newPixels.push({
          x: x + 0.5,
          y: y + 0.5,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed,
          color: bombColors[Math.floor(Math.random() * bombColors.length)],
          size: size,
          opacity: 1,
          lifetime: framesToLive * (0.6 + Math.random() * 0.4), // Bomb pieces last longer
          maxLifetime: framesToLive,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 15,
        });
      }

      // 🔥 FIRE EXPLOSION - bright center blast
      for (let i = 0; i < 80; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed =
          (Math.random() * explosionForce + explosionForce * 0.3) * 0.12;
        const size = Math.random() * 1.5 + 0.5;

        newPixels.push({
          x: x + 0.5,
          y: y + 0.5,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed,
          color: fireColors[Math.floor(Math.random() * fireColors.length)],
          size: size,
          opacity: 1,
          lifetime: framesToLive * (0.4 + Math.random() * 0.3), // Fire fades faster
          maxLifetime: framesToLive * 0.7,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 20,
        });
      }

      // ✨ SPARKS - small bright particles
      for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * explosionForce + explosionForce) * 0.2;

        newPixels.push({
          x: x + 0.5,
          y: y + 0.5,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed,
          color: "#FFFFFF",
          size: Math.random() * 0.8 + 0.4,
          opacity: 1,
          lifetime: framesToLive * (0.2 + Math.random() * 0.2), // Sparks fade fastest
          maxLifetime: framesToLive * 0.4,
          rotation: 0,
          rotationSpeed: 0,
        });
      }

      setPixels(newPixels);
    };

    createBombExplosion();

    // Animate with physics
    const interval = setInterval(() => {
      setPixels((prev) =>
        prev
          .map((p) => {
            const ageRatio = (p.maxLifetime - p.lifetime) / p.maxLifetime;

            return {
              ...p,
              x: p.x + p.dx,
              y: p.y + p.dy,
              dx: p.dx * 0.96, // Air resistance
              dy: p.dy * 0.96 + 0.02, // Gravity
              opacity: Math.max(0, 1 - ageRatio * ageRatio), // Fade out
              size: p.size * (1 - ageRatio * 0.1), // Shrink slightly
              rotation: p.rotation + p.rotationSpeed,
              lifetime: p.lifetime - 1,
            };
          })
          .filter((p) => p.lifetime > 0)
      );
    }, 50); // 20 FPS for retro feel

    const cleanup = setTimeout(() => {
      clearInterval(interval);
      setPixels([]);
    }, duration * 1000 + 500); // 🎯 Cleanup based on duration

    return () => {
      clearInterval(interval);
      clearTimeout(cleanup);
    };
  }, [x, y, radius, duration]); // 🎯 Re-run if duration changes

  return (
    <>
      {/* Flash effect */}
      {flash && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${radius * 8 * scale}px`,
            height: `${radius * 8 * scale}px`,
            background: `radial-gradient(circle, 
              rgba(255, 255, 255, 0.9) 0%, 
              rgba(255, 255, 0, 0.7) 30%, 
              rgba(255, 69, 0, 0.4) 60%,
              transparent 100%)`,
            left: `${(x + 0.5 - offset.x) * scale}px`,
            top: `${(y + 0.5 - offset.y) * scale}px`,
            transform: "translate(-50%, -50%)",
            animation: "bombFlash 0.1s ease-out",
          }}
        />
      )}

      {/* Flying pixels */}
      {pixels.map((pixel, i) => {
        const screenX = (pixel.x - offset.x) * scale;
        const screenY = (pixel.y - offset.y) * scale;

        // Skip rendering if outside viewport
        if (
          screenX < -100 ||
          screenX > window.innerWidth + 100 ||
          screenY < -100 ||
          screenY > window.innerHeight + 100
        ) {
          return null;
        }

        const pixelSize = Math.max(scale * 0.5, pixel.size * scale);

        return (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              left: `${screenX}px`,
              top: `${screenY}px`,
              width: `${pixelSize}px`,
              height: `${pixelSize}px`,
              backgroundColor: pixel.color,
              opacity: pixel.opacity,
              imageRendering: "pixelated",
              transform: `translate(-50%, -50%) rotate(${pixel.rotation}deg)`,
              boxShadow:
                pixel.color === "#FFFFFF"
                  ? `0 0 ${pixelSize}px ${pixel.color}`
                  : "none",
            }}
          />
        );
      })}

      <style jsx>{`
        @keyframes bombFlash {
          0% {
            transform: translate(-50%, -50%) scale(0.3);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
