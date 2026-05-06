import React, { useMemo } from "react";

interface CashParticlesProps {
  count?: number;
  className?: string;
  type?: "mixed" | "coins" | "rain";
}

export function CashParticles({ count = 8, className = "", type = "mixed" }: CashParticlesProps) {
  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const size = Math.random() * 16 + 12; // 12px to 28px
      const left = Math.random() * 100; // 0% to 100%
      const delay = Math.random() * 5; // 0s to 5s
      const duration = Math.random() * 3 + 4; // 4s to 7s
      const isCoin = type === "coins" || (type === "mixed" && Math.random() > 0.5);

      if (type === "rain") {
        return {
          id: i,
          isCoin: false,
          size,
          style: {
            left: `${left}%`,
            top: `-20%`,
            width: `${size * 2.5}px`,
            height: `${size}px`,
            animation: `money-rain ${duration}s linear ${delay}s infinite`,
            opacity: Math.random() * 0.3 + 0.1,
          },
        };
      }

      return {
        id: i,
        isCoin,
        size,
        style: {
          left: `${left}%`,
          bottom: `-${size * 2}px`,
          width: `${size}px`,
          height: `${size}px`,
          animation: `float-up ${duration}s ease-in-out ${delay}s infinite`,
        },
      };
    });
  }, [count, type]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none z-0 ${className}`}>
      {particles.map((p) => {
        if (type === "rain") {
          return (
            <div
              key={p.id}
              className="absolute bg-emerald-500/20 border border-emerald-500/30 rounded shadow-sm backdrop-blur-[1px]"
              style={p.style}
            />
          );
        }

        if (p.isCoin) {
          return (
            <div
              key={p.id}
              className="absolute rounded-full border border-amber-400/30 bg-amber-400/10 flex items-center justify-center shadow-sm backdrop-blur-[2px]"
              style={p.style}
            />
          );
        }

        return (
          <div
            key={p.id}
            className="absolute flex items-center justify-center text-emerald-500/30 font-bold"
            style={{ ...p.style, fontSize: `${p.size}px` }}
          >
            $
          </div>
        );
      })}
    </div>
  );
}

export function CoinShower({ trigger }: { trigger: number }) {
  const coins = useMemo(() => {
    if (trigger === 0) return [];
    return Array.from({ length: 20 }).map((_, i) => ({
      id: `${trigger}-${i}`,
      angle: Math.random() * Math.PI - Math.PI / 2, // -90 to 90 deg
      velocity: Math.random() * 100 + 80,
      delay: Math.random() * 0.15,
    }));
  }, [trigger]);

  if (trigger === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
      {coins.map((c) => (
        <div
          key={c.id}
          className="absolute w-8 h-8 rounded-full bg-amber-400 border-2 border-amber-500 shadow-md flex items-center justify-center animate-coin-flip"
          style={{
            transform: `translate(${Math.sin(c.angle) * c.velocity}px, ${-Math.cos(c.angle) * c.velocity}px)`,
            opacity: 0,
            animation: `float-up 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) ${c.delay}s forwards`,
          }}
        >
          <span className="text-amber-700 text-xs font-bold">$</span>
        </div>
      ))}
    </div>
  );
}
