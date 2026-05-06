import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  isCurrency?: boolean;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 800,
  isCurrency = true,
  className,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const startValue = displayValue;
    const endValue = value;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setDisplayValue(startValue + (endValue - startValue) * easeProgress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className={className}>
      {isCurrency ? formatCurrency(displayValue) : Math.round(displayValue)}
    </span>
  );
}
