import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input, Space, Typography, Card, message, ConfigProvider } from "antd";
import { 
  LockOutlined, 
  CameraOutlined, 
  ScanOutlined, 
  UserOutlined,
  LoadingOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone
} from "@ant-design/icons";

const { Title, Text } = Typography;

export default function UltraModernPhotoLog({ onLogin, onSignUp }) {
  const [msgApi, contextHolder] = message.useMessage();
  const [isAnimating, setIsAnimating] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [identifier, setIdentifier] = useState(""); 
  const [password, setPassword] = useState("");

  const timesFont = { fontFamily: "'Times New Roman', Times, serif" };

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX - window.innerWidth / 2) / 60,
        y: (e.clientY - window.innerHeight / 2) / 60,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const triggerAdvancedSequence = () => {
    if (!identifier || !password) {
      return msgApi.warning("Please enter your credentials.");
    }
    
    setIsAnimating(true);
    
    // Sequence: Shutter closes -> Background appears -> Text animates -> Callback
    setTimeout(() => setShowWelcome(true), 1000);
    
    setTimeout(() => {
      setIsAnimating(false);
      setShowWelcome(false);
      if (onLogin) onLogin({ identifier, password });
    }, 5000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.5 }
    }
  };

  const letterVariant = {
    hidden: { y: 100, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#38BDF8', borderRadius: 20 } }}>
      <div style={{ 
        ...timesFont, 
        overflow: "hidden", 
        height: "100vh", 
        width: "100vw", 
        position: "fixed", 
        top: 0,
        left: 0,
        backgroundColor: "#000"
      }}>
        {contextHolder}

        <motion.div
          animate={{ x: -mousePos.x, y: -mousePos.y, scale: 1.05 }}
          transition={{ type: "tween", ease: "linear", duration: 0.1 }}
          style={{
            position: "absolute",
            inset: "-10%",
            backgroundImage: `url('https://images.unsplash.com/photo-1554048612-b6a482bc67e5?q=80&w=2070')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(0.3) contrast(1.1)",
            zIndex: 1
          }}
        />

        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 2,
          opacity: 0.03,
          pointerEvents: "none",
          background: `url('https://grainy-gradients.vercel.app/noise.svg')`, 
        }} />

      
        <AnimatePresence>
          {isAnimating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: "#000",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {showWelcome && (
                <motion.div 
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 2.5 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `url('https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2071')`, 
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "brightness(0.4)",
                    zIndex: -1
                  }}
                />
              )}

              {!showWelcome && (
                <motion.div 
                  initial={{ scale: 5 }}
                  animate={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
                  style={{
                    width: '300vw',
                    height: '300vh',
                    border: '150vw solid #38BDF8',
                    borderRadius: '50%',
                    position: 'absolute',
                    zIndex: 10
                  }}
                />
              )}

              {showWelcome && (
                <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ textAlign: "center", zIndex: 11 }}>
                  <motion.div variants={letterVariant}>
                    <Text style={{ color: "#38BDF8", letterSpacing: "15px", fontSize: "14px", textTransform: "uppercase", display: 'block', marginBottom: '20px' }}>
                      Capturing Moments, Creating Memories
                    </Text>
                  </motion.div>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                    {"APENTURE".split("").map((char, i) => (
                      <motion.span key={i} variants={letterVariant} style={{ fontSize: "min(60px, 6vw)", color: "#fff", fontWeight: 100 }}>{char}</motion.span>
                    ))}
                    <motion.span variants={letterVariant} style={{ fontSize: "min(70px, 7vw)", color: "#38BDF8", margin: "0 15px", fontWeight: "bold" }}>X</motion.span>
                    {"STUDIOS".split("").map((char, i) => (
                      <motion.span key={i} variants={letterVariant} style={{ fontSize: "min(60px, 6vw)", color: "#fff", fontWeight: 100 }}>{char}</motion.span>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* LOGIN */}
        <div style={{ position: "relative", zIndex: 10, height: "100%", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8 }}>
            <Card
              bordered={false}
              style={{
                width: "90vw",
                maxWidth: "420px",
                background: "rgba(0, 0, 0, 0.2)", 
                backdropFilter: "blur(15px)",
                WebkitBackdropFilter: "blur(15px)",
                borderRadius: "40px", 
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "20px"
              }}
            >
              <div style={{ textAlign: "center", marginBottom: "35px" }}>
                <motion.div
                   initial={{ y: -40, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
                >
                  <CameraOutlined style={{ color: "#38BDF8", fontSize: "48px", filter: "drop-shadow(0 0 10px rgba(56, 189, 248, 0.4))" }} />
                </motion.div>
                
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  <Title level={2} style={{ ...timesFont, color: "#fff", margin: "15px 0 5px", letterSpacing: "8px", fontWeight: 100 }}>
                    A <span style={{ color: "#38BDF8" }}>X</span> S
                  </Title>
                  <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px", letterSpacing: "4px", textTransform: "uppercase" }}>
                    Aperture X Studios
                  </Text>
                </motion.div>
              </div>

              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                {/* Email */}
                <div>
                  <Text style={{ color: "#38BDF8", fontSize: "10px", fontWeight: "bold", marginLeft: "5px", letterSpacing: "1px" }}>EMAIL OR PHONE</Text>
                  <Input 
                    variant="borderless"
                    prefix={<UserOutlined style={{ color: "rgba(255,255,255,0.4)", marginRight: "10px" }} />}
                    placeholder="EMAIL OR PHONE"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "12px 5px", borderRadius: 0 }}
                  />
                </div>

                {/* PASSWORD */}
                <div>
                  <Text style={{ color: "#38BDF8", fontSize: "10px", fontWeight: "bold", marginLeft: "5px", letterSpacing: "1px" }}>PASSWORD</Text>
                  <Input.Password
                    variant="borderless"
                    prefix={<LockOutlined style={{ color: "rgba(255,255,255,0.4)", marginRight: "10px" }} />}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    iconRender={visible => (visible ? <EyeTwoTone twoToneColor="#38BDF8" /> : <EyeInvisibleOutlined style={{color: 'rgba(255,255,255,0.4)'}} />)}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "12px 5px", borderRadius: 0 }}
                  />
                </div>

                <Button
                  block
                  onClick={triggerAdvancedSequence}
                  icon={isAnimating ? <LoadingOutlined /> : <ScanOutlined />}
                  style={{
                    height: "55px",
                    background: "#38BDF8",
                    color: "#000",
                    border: "none",
                    borderRadius: "28px", 
                    fontSize: "14px",
                    letterSpacing: "3px",
                    fontWeight: "bold",
                    marginTop: "25px",
                    boxShadow: "0 10px 25px rgba(56, 189, 248, 0.3)"
                  }}
                >
                  {isAnimating ? "AUTHENTICATING..." : "LOG IN"}
                </Button>

                <div style={{ textAlign: "center", marginTop: "10px" }}>
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>Access needed? </Text>
                  <Button type="link" onClick={onSignUp} style={{ color: "#38BDF8", padding: 0, fontWeight: "bold", fontSize: "12px" }}>
                    SIGN UP
                  </Button>
                </div>
              </Space>
            </Card>
          </motion.div>
        </div>

        <style>{`
          body { margin: 0; padding: 0; overflow: hidden; background: #000; }
          .ant-input { color: #fff !important; }
          .ant-input::placeholder { color: rgba(255,255,255,0.2) !important; font-size: 11px; letter-spacing: 1px; }
          .ant-input-password { background: transparent !important; }
          .ant-input-affix-wrapper { background: transparent !important; border-bottom: 1px solid rgba(255,255,255,0.2) !important; }
          .ant-input-affix-wrapper-focused { border-bottom: 1px solid #38BDF8 !important; box-shadow: none !important; }
          .ant-btn-primary:hover { background: #7DD3FC !important; }
        `}</style>
      </div>
    </ConfigProvider>
  );
}