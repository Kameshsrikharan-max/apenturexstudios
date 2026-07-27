import React from "react";
import { motion, Variants } from "framer-motion";
import { Typography } from "antd";

const { Text } = Typography;

const letterVariant: Variants = {
  hidden: { y: 100, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
};

interface WelcomeScreenProps {
  onFinished?: () => void;
  durationMs?: number;
}

export default function WelcomeScreen({ onFinished, durationMs = 3000 }: WelcomeScreenProps) {
  React.useEffect(() => {
    if (!onFinished) return;
    const timer = setTimeout(() => {
      onFinished();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [onFinished, durationMs]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#000",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* WELCOME BACKGROUND SCENE */}
      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2 }}
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url('https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2071')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.5)",
          zIndex: -1,
        }}
      />

      {/* WELCOME SCREEN TYPOGRAPHY */}
      <motion.div initial="hidden" animate="visible" style={{ textAlign: "center", zIndex: 11 }}>
        <motion.div variants={letterVariant}>
          <Text
            style={{
              color: "#38BDF8",
              letterSpacing: "15px",
              fontSize: "12px",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "20px",
            }}
          >
            Capturing Moments, Creating Memories
          </Text>
        </motion.div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          {"APENTURE".split("").map((char, i) => (
            <motion.span
              key={i}
              variants={letterVariant}
              style={{ fontSize: "min(60px, 6vw)", color: "#fff", fontWeight: 100 }}
            >
              {char}
            </motion.span>
          ))}
          <motion.span
            variants={letterVariant}
            style={{ fontSize: "min(70px, 7vw)", color: "#38BDF8", margin: "0 15px", fontWeight: "bold" }}
          >
            X
          </motion.span>
          {"STUDIOS".split("").map((char, i) => (
            <motion.span
              key={i}
              variants={letterVariant}
              style={{ fontSize: "min(60px, 6vw)", color: "#fff", fontWeight: 100 }}
            >
              {char}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}