import { useEffect, useState } from "react";

// Lightweight DOM-based confetti. No dependencies.
// Fires `count` particles that fall and fade.
export function Confetti({ fire, count = 90 }: { fire: number; count?: number }) {
  const [pieces, setPieces] = useState<
    { id: number; left: number; delay: number; duration: number; rotate: number; color: string; shape: "square" | "circle" }[]
  >([]);

  useEffect(() => {
    if (!fire) return;
    const colors = [
      "oklch(0.72 0.24 350)",
      "oklch(0.65 0.27 320)",
      "oklch(0.6 0.25 290)",
      "oklch(0.62 0.22 260)",
      "oklch(0.78 0.16 220)",
    ];
    const next = Array.from({ length: count }, (_, i) => ({
      id: fire * 1000 + i,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 1.6 + Math.random() * 1.4,
      rotate: Math.random() * 720 - 360,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() > 0.5 ? ("square" as const) : ("circle" as const),
    }));
    setPieces(next);
    const t = setTimeout(() => setPieces([]), 3500);
    return () => clearTimeout(t);
  }, [fire, count]);

  if (pieces.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className={`absolute top-0 ${p.shape === "circle" ? "rounded-full" : "rounded-[2px]"}`}
          style={{
            left: `${p.left}%`,
            width: 8 + Math.random() * 6,
            height: 8 + Math.random() * 6,
            background: p.color,
            animation: `confetti-fall ${p.duration}s ${p.delay}s cubic-bezier(0.2, 0.6, 0.4, 1) forwards`,
            transform: `rotate(${p.rotate}deg)`,
            opacity: 0.95,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
