import { useEffect, useRef, useState } from "react";

interface BombTargetHighlightProps {
  x: number;
  y: number;
  scale: number;
  offset: { x: number; y: number };
  radius: number;
  isActive: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onCancel?: () => void;
}

export default function BombTargetHighlight({
  x,
  y,
  scale,
  offset,
  radius,
  isActive,
  canvasRef,
  onCancel,
}: BombTargetHighlightProps) {
  const animationRef = useRef<number | undefined>(undefined);
  const [animationTime, setAnimationTime] = useState(0);
  const [pulseIntensity, setPulseIntensity] = useState(0);
  const backgroundDataRef = useRef<ImageData | null>(null);

  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let startTime = Date.now();

    // Lưu background lần đầu
    const centerX = (x - offset.x) * scale;
    const centerY = (y - offset.y) * scale;
    const captureRadius = (radius + 4) * scale;
    const captureX = Math.max(0, centerX + scale / 2 - captureRadius);
    const captureY = Math.max(0, centerY + scale / 2 - captureRadius);
    const captureW = Math.min(canvas.width - captureX, captureRadius * 2);
    const captureH = Math.min(canvas.height - captureY, captureRadius * 2);

    if (captureW > 0 && captureH > 0) {
      backgroundDataRef.current = ctx.getImageData(
        captureX,
        captureY,
        captureW,
        captureH
      );
    }

    const animate = () => {
      const elapsed = Date.now() - startTime;
      setAnimationTime(elapsed);

      const baseFrequency = 3;
      const acceleratedFrequency = baseFrequency + (elapsed / 1000) * 2;
      const intensity =
        Math.sin(elapsed * acceleratedFrequency * 0.01) * 0.5 + 0.5;

      const urgencyBoost = Math.min(0.5, elapsed / 10000);
      const finalPulse = Math.min(1, intensity + urgencyBoost);
      setPulseIntensity(finalPulse);

      const centerX = (x - offset.x) * scale;
      const centerY = (y - offset.y) * scale;

      // Khôi phục background trước khi vẽ hiệu ứng mới
      if (backgroundDataRef.current) {
        const captureRadius = (radius + 4) * scale;
        const captureX = Math.max(0, centerX + scale / 2 - captureRadius);
        const captureY = Math.max(0, centerY + scale / 2 - captureRadius);
        ctx.putImageData(backgroundDataRef.current, captureX, captureY);
      }

      const urgencyLevel = Math.min(1, elapsed / 5000);

      ctx.save();

      // Outer ring
      ctx.beginPath();
      ctx.arc(
        centerX + scale / 2,
        centerY + scale / 2,
        (radius + 1.5) * scale,
        0,
        2 * Math.PI
      );
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = `rgba(255, ${100 - urgencyLevel * 100}, 0, ${
        finalPulse * 0.9
      })`;
      ctx.lineWidth = 3;
      ctx.shadowColor = `rgba(255, ${50 - urgencyLevel * 50}, 0, ${
        finalPulse * 0.6
      })`;
      ctx.shadowBlur = 20 * finalPulse;
      ctx.stroke();
      ctx.setLineDash([]);

      // Target area - vẽ với alpha thay đổi theo pulse
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > radius) continue;

          const px = (x + dx - offset.x) * scale;
          const py = (y + dy - offset.y) * scale;

          if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height)
            continue;

          const fillAlpha = finalPulse * 0.5;
          const strokeAlpha = finalPulse * 0.7;

          // Vẽ fill
          const fillColor = `rgba(255, ${Math.max(
            0,
            200 - urgencyLevel * 200
          )}, 0, ${fillAlpha})`;

          ctx.fillStyle = fillColor;
          ctx.fillRect(px, py, scale, scale);

          // Vẽ border
          const borderColor = `rgba(255, ${Math.max(
            0,
            100 - urgencyLevel * 100
          )}, 0, ${strokeAlpha})`;

          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, scale, scale);
        }
      }

      // Center highlight
      const centerFillAlpha = finalPulse * 0.7;
      const centerStrokeAlpha = finalPulse;

      ctx.fillStyle = `rgba(255, 255, 0, ${centerFillAlpha})`;
      ctx.fillRect(centerX, centerY, scale, scale);

      ctx.strokeStyle = `rgba(255, 200, 0, ${centerStrokeAlpha})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(centerX, centerY, scale, scale);

      ctx.restore();

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, x, y, scale, offset.x, offset.y, radius, canvasRef]);

  const urgencyLevel = Math.min(1, animationTime / 5000);
  const centerX = (x - offset.x) * scale;
  const centerY = (y - offset.y) * scale;

  return (
    <>
      {/* Status text */}
      <div
        className="absolute pointer-events-none select-none font-bold"
        style={{
          left: `${centerX}px`,
          top: `${centerY - (radius + 1) * scale}px`,
          transform: "translate(-50%, -50%)",
          fontSize: `${Math.max(12, scale)}px`,
          color: `rgba(255, ${Math.max(
            0,
            255 - urgencyLevel * 255
          )}, 0, ${pulseIntensity})`,
          textShadow: `0 0 ${
            pulseIntensity * 15
          }px rgba(255, 255, 0, ${pulseIntensity})`,
          animation: `bounce ${Math.max(
            0.3,
            0.8 - urgencyLevel * 0.5
          )}s ease-in-out infinite alternate`,
        }}
      >
        {urgencyLevel < 0.3
          ? "🎯 TARGETING..."
          : urgencyLevel < 0.7
          ? "⚠️ CONFIRM TRANSACTION"
          : "🚨 PLEASE CONFIRM! 🚨"}
      </div>

      {/* Cancel button */}

      <style jsx>{`
        @keyframes bounce {
          0% {
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            transform: translate(-50%, -50%) scale(1.15);
          }
        }
      `}</style>
    </>
  );
}
