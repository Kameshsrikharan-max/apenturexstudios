import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { CheckCircleOutlined } from "@ant-design/icons";
import "./motion.css";

interface PaymentCelebrationProps {
  amount: number;
  onDone: () => void;
}

interface Coin {
  x: number; // % from left
  dx: number; // px horizontal drift
  size: number; // px
  delay: number; // ms
  duration: number; // ms
  spin: number; // deg
  tilt: number; // deg
}

const COIN_COUNT = 16;
const TOTAL_MS = 2800;

const buildCoins = (): Coin[] =>
  Array.from({ length: COIN_COUNT }, () => ({
    x: 40 + Math.random() * 20,
    dx: (Math.random() - 0.5) * 70,
    size: 22 + Math.random() * 14,
    delay: Math.random() * 380,
    duration: 1100 + Math.random() * 600,
    spin: 540 + Math.random() * 540,
    tilt: (Math.random() - 0.5) * 50,
  }));

/**
 * Coins drop into a point on screen, then water-style ripples spread out and a
 * "+₹X received" chip pops up. Mount it with a fresh `key` each time a payment
 * is recorded; it calls `onDone` after the animation finishes.
 */
export default function PaymentCelebration({ amount, onDone }: PaymentCelebrationProps) {
  const [coins] = useState<Coin[]>(buildCoins);

  useEffect(() => {
    const timer = window.setTimeout(onDone, TOTAL_MS);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return createPortal(
    <div className="mo-celebrate">
      <div className="mo-ripple-origin" aria-hidden="true">
        {[0, 1, 2].map((r) => (
          <span key={r} className="mo-ripple" style={{ "--r": r } as CSSProperties} />
        ))}
      </div>

      {coins.map((coin, i) => (
        <span
          key={i}
          className="mo-coin"
          aria-hidden="true"
          style={
            {
              "--x": `${coin.x}%`,
              "--dx": `${coin.dx}px`,
              "--size": `${coin.size}px`,
              "--delay": `${coin.delay}ms`,
              "--dur": `${coin.duration}ms`,
              "--spin": `${coin.spin}deg`,
              "--tilt": `${coin.tilt}deg`,
            } as CSSProperties
          }
        >
          ₹
        </span>
      ))}

      <div className="mo-chip" role="status">
        <CheckCircleOutlined />
        <span>+₹{amount.toLocaleString("en-IN")} received</span>
      </div>
    </div>,
    document.body
  );
}