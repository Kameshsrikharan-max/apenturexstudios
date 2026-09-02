import { useState, useEffect } from "react";
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from "framer-motion";

import { Button, Input, Space, Typography, Card, message, ConfigProvider, Row, Col } from "antd";

import {CameraOutlined,ScanOutlined,UserOutlined,LoadingOutlined,GoogleOutlined,TwitterOutlined,FacebookOutlined,} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { sendOtpRequest, verifyOtpRequest, resetOtpState } from "../../../redux/actions/authActions";

const { Title, Text } = Typography;

const quotes = [
  "Photography is the story I fail to put into words.",
  "Your first 10,000 photographs are your worst.",
  "Skill in photography is acquired by practice, not purchase.",
  "Focus on what's important, capture the good times.",
  "A camera is a save button for the mind's eye.",
];

export default function LoginPage({ onLogin, onRegister }) {
  const [msgApi, contextHolder] = message.useMessage();

  const dispatch = useDispatch();
  const {
    loading, error, user, otpSent, otpLoading, otpError, verifyingOtp,
    needsSignup, signupEmail,
  } = useSelector((state: any) => state.auth);

  const [isAnimating, setIsAnimating] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [quoteIndex, setQuoteIndex] = useState(0);

  const timesFont = {
    fontFamily: "'Times New Roman', Times, serif",
  };

  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 4000);

    return () => clearInterval(quoteInterval);
  }, []);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, {
    stiffness: 60,
    damping: 30,
  });

  const springY = useSpring(mouseY, {
    stiffness: 60,
    damping: 30,
  });

  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);

  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = e.clientX - window.innerWidth / 2;
      const y = e.clientY - window.innerHeight / 2;

      mouseX.set(x / 20);
      mouseY.set(y / 20);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () =>
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );
  }, [mouseX, mouseY]);

  const triggerAdvancedSequence = () => {
    if (!identifier) {
      return msgApi.warning(
        "Access denied: Identification missing."
      );
    }
    if (!otpSent) {
      dispatch(sendOtpRequest(identifier));
    } else {
      if (!otp || otp.length !== 6) {
        return msgApi.warning("Enter the 6-digit code sent to your email.");
      }
      dispatch(verifyOtpRequest(identifier, otp));
    }
  };

  const handleResendOtp = () => {
    setOtp("");
    dispatch(sendOtpRequest(identifier));
    msgApi.info("A new code has been sent.");
  };

  const handleChangeEmail = () => {
    setOtp("");
    dispatch(resetOtpState());
  };

  useEffect(() => {
    if (user) {
      setIsAnimating(true);

      const timer = setTimeout(() => {
        if (onLogin) {
          onLogin(user);
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    if (error) {
      setIsAnimating(false);
      msgApi.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (otpError) {
      msgApi.error(otpError);
    }
  }, [otpError]);

  useEffect(() => {
    if (otpSent) {
      msgApi.success("Code sent — check your email.");
    }
  }, [otpSent]);

  // The email checks out, but there's no account for it. This should only
  // happen if someone types a brand-new email into the login form directly
  // (registration now happens through the dedicated Register flow). Nudge
  // them there instead of silently jumping into onboarding.
  useEffect(() => {
    if (needsSignup) {
      msgApi.info("No account found for this email — please use Register to sign up.");
      setOtp("");
      dispatch(resetOtpState());
    }
  }, [needsSignup]);

const formBoxVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20, rotateX: -10 },
  visible: {
    opacity: 1, scale: 1, y: 0, rotateX: 0,
    transition: { type: "spring", stiffness: 120, damping: 14, duration: 0.6, staggerChildren: 0.05, delayChildren: 0.1 },
  },
} as const;
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },

    visible: {
      opacity: 1,
      y: 0,

      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#38BDF8",
          borderRadius: 24,
        },
      }}
    >
      <div
        className="login-root"
        style={{
          ...timesFont,
          overflow: "hidden",
          height: "100vh",
          width: "100vw",
          position: "fixed",
          top: 0,
          left: 0,
          backgroundColor: "#020617",
          perspective: "1200px",
        }}
      >
        {contextHolder}

      
        <motion.div
          style={{
            position: "absolute",
            inset: "-10%",

            backgroundImage: `
              linear-gradient(
                rgba(255,255,255,0.1),
                rgba(0,0,0,0.4)
              ),
              url('https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=2070')
            `,

            backgroundSize: "cover",
            backgroundPosition: "center",

            filter: "brightness(1.2)",

            x: springX,
            y: springY,

            scale: 1.05,
            zIndex: 1,
          }}
        />

        
        <AnimatePresence>
          {isAnimating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: "#020617",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
              }}
            >
            
              <motion.div
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ duration: 4 }}
                style={{
                  position: "absolute",
                  inset: 0,

                  backgroundImage: `
                    linear-gradient(
                      rgba(0,0,0,0.6),
                      rgba(0,0,0,0.8)
                    ),
                    url('https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2071')
                  `,

                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  zIndex: 1,
                }}
              />

          
              <motion.div
                animate={{
                  opacity: [0.3, 0.7, 0.3],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
                className="splash-glow"
                style={{
                  position: "absolute",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(56,189,248,0.25), transparent 70%)",
                  filter: "blur(40px)",
                  zIndex: 2,
                }}
              />

              
              <div
                className="splash-content"
                style={{
                  position: "relative",
                  zIndex: 10,
                  textAlign: "center",
                }}
              >
                
                <motion.div
                  initial={{
                    y: -500,
                    rotate: -20,
                    opacity: 0,
                    scale: 0.5,
                  }}
                  animate={{
                    y: 0,
                    rotate: 0,
                    opacity: 1,
                    scale: 1,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 80,
                    damping: 10,
                    duration: 1.5,
                  }}
                >
                  <motion.div
                    animate={{
                      y: [0, -10, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  >
                    <CameraOutlined
                      className="splash-camera-icon"
                      style={{
                        color: "#38BDF8",
                        filter:
                          "drop-shadow(0 0 25px rgba(56,189,248,0.8))",
                      }}
                    />
                  </motion.div>
                </motion.div>

            
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    delay: 1.4,
                    duration: 0.5,
                  }}
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "#fff",
                    zIndex: 20,
                    pointerEvents: "none",
                  }}
                />

              
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 40,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: 1.2,
                    duration: 1,
                  }}
                  style={{
                    marginTop: "40px",
                  }}
                >
                  <Text
                    className="splash-welcome-text"
                    style={{
                      color: "#38BDF8",
                      letterSpacing: "12px",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: "20px",
                    }}
                  >
                    Welcome To
                  </Text>

            
                  <div
                    className="splash-brand-row"
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    {"APENTURE".split("").map((char, i) => (
                      <motion.span
                        key={i}
                        initial={{
                          opacity: 0,
                          y: 100,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          delay: 1.5 + i * 0.05,
                          type: "spring",
                          stiffness: 100,
                        }}
                        className="splash-brand-char"
                        style={{
                          color: "#fff",
                          fontWeight: 100,
                        }}
                      >
                        {char}
                      </motion.span>
                    ))}

                    <motion.span
                      initial={{
                        opacity: 0,
                        scale: 0,
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                      }}
                      transition={{
                        delay: 2,
                        type: "spring",
                        stiffness: 200,
                      }}
                      className="splash-brand-x"
                      style={{
                        color: "#38BDF8",
                        margin: "0 15px",
                        fontWeight: "bold",
                      }}
                    >
                      X
                    </motion.span>

                    {"STUDIOS".split("").map((char, i) => (
                      <motion.span
                        key={i}
                        initial={{
                          opacity: 0,
                          y: 100,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          delay: 2.1 + i * 0.05,
                          type: "spring",
                          stiffness: 100,
                        }}
                        className="splash-brand-char"
                        style={{
                          color: "#fff",
                          fontWeight: 100,
                        }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </div>

                  
                  <motion.div
                    initial={{
                      opacity: 0,
                    }}
                    animate={{
                      opacity: 1,
                    }}
                    transition={{
                      delay: 2.8,
                      duration: 1,
                    }}
                  >
                    <Text
                      className="splash-tagline"
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        display: "block",
                        marginTop: "30px",
                        letterSpacing: "2px",
                      }}
                    >
                      Capturing Moments • Creating Memories
                    </Text>
                  </motion.div>

                  
                  <motion.div
                    initial={{
                      width: 0,
                    }}
                    animate={{
                      width: "260px",
                    }}
                    transition={{
                      delay: 2.5,
                      duration: 1.5,
                    }}
                    style={{
                      height: "3px",
                      background:
                        "linear-gradient(90deg,#38BDF8,#0ea5e9)",
                      margin: "40px auto 0",
                      borderRadius: "999px",
                      boxShadow:
                        "0 0 20px rgba(56,189,248,0.7)",
                    }}
                  />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        
        <Row
          style={{
            height: "100vh",
            position: "relative",
            zIndex: 10,
          }}
        >
          
          <Col
            xs={0}
            sm={0}
            md={12}
            className="login-left-col"
          >
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
            >
              <Space
                align="center"
                style={{
                  marginBottom: "20px",
                }}
              >
                <CameraOutlined
                  className="brand-icon"
                  style={{
                    color: "#38BDF8",
                  }}
                />

                <Title
                  level={4}
                  className="brand-title"
                  style={{
                    color: "#fff",
                    margin: 0,
                    fontWeight: 200,
                    ...timesFont,
                  }}
                >
                  APENTURE X Studios
                </Title>
              </Space>

              <Title
                className="hero-title"
                style={{
                  color: "#fff",
                  margin: 0,
                  lineHeight: 1.1,
                  fontWeight: 100,
                  ...timesFont,
                }}
              >
                Elevate your <br />
                <span
                  style={{
                    fontWeight: 600,
                    color: "#38BDF8",
                  }}
                >
                  visual
                </span>{" "}
                craft
              </Title>

              
              <div
                className="quote-box"
                style={{
                  marginTop: "30px",
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={quoteIndex}
                    initial={{
                      opacity: 0,
                      y: 15,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: -15,
                    }}
                    transition={{
                      duration: 0.8,
                    }}
                  >
                    <Text
                      className="quote-text"
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontStyle: "italic",
                        fontWeight: 300,
                      }}
                    >
                      "{quotes[quoteIndex]}"
                    </Text>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </Col>

        
          <Col
            xs={24}
            sm={24}
            md={12}
            className="login-right-col"
          >
            <motion.div
              style={{
                rotateX,
                rotateY,
              }}
              variants={formBoxVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.02 }}
            >
              <Card
                variant="borderless"
                className="glass-card login-card"
                style={{
                  background: "rgba(0, 0, 0, 0.7)",

                  backdropFilter:
                    "blur(10px) saturate(100%)",

                  border:
                    "1px solid rgba(255,255,255,0.2)",

                  boxShadow:
                    "0 40px 100px rgba(0,0,0,0.9)",
                }}
              >
                <motion.div
                  variants={itemVariants}
                  style={{
                    textAlign: "center",
                    marginBottom: "35px",
                  }}
                >
                  <Title
                    level={3}
                    className="card-title"
                    style={{
                      color: "#fff",
                      margin: 0,
                      fontWeight: 100,
                      letterSpacing: "8px",
                      ...timesFont,
                    }}
                  >
                    LOG
                    <span style={{ color: "#38BDF8" }}>
                      I
                    </span>
                    N
                  </Title>

                  <Text
                    style={{
                      color:
                        "rgba(255,255,255,0.4)",
                      fontSize: "10px",
                      letterSpacing: "3px",
                    }}
                  >
                    Welcome Back
                  </Text>
                </motion.div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "25px",
                  }}
                >
              
                  {!otpSent ? (
                    <motion.div variants={itemVariants}>
                      <Text className="label-text">
                        Email or Number
                      </Text>

                      <Input
                        placeholder="Email or Number"
                        prefix={
                          <UserOutlined
                            style={{
                              color: "#38BDF8",
                              marginRight: "10px",
                            }}
                          />
                        }
                        value={identifier}
                        onChange={(e) =>
                          setIdentifier(e.target.value)
                        }
                        onPressEnter={triggerAdvancedSequence}
                        disabled={otpLoading || isAnimating}
                        className="creative-input"
                      />
                    </motion.div>
                  ) : (
                    <motion.div variants={itemVariants}>
                      <Text className="label-text">
                        6-Digit Code
                      </Text>

                      <Input
                        placeholder="Enter code"
                        maxLength={6}
                        prefix={
                          <ScanOutlined
                            style={{
                              color: "#38BDF8",
                              marginRight: "10px",
                            }}
                          />
                        }
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, ""))
                        }
                        onPressEnter={triggerAdvancedSequence}
                        disabled={verifyingOtp || isAnimating}
                        className="creative-input"
                      />

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: "10px",
                        }}
                      >
                        <Button
                          type="link"
                          onClick={handleChangeEmail}
                          className="signup-link"
                          style={{ padding: 0 }}
                        >
                          Change email
                        </Button>
                        <Button
                          type="link"
                          onClick={handleResendOtp}
                          className="signup-link"
                          style={{ padding: 0 }}
                        >
                          Resend code
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  
                  <motion.div variants={itemVariants}>
                    <Button
                      block
                      onClick={triggerAdvancedSequence}
                      disabled={otpLoading || verifyingOtp || isAnimating}
                      icon={
                        otpLoading || verifyingOtp || isAnimating ? (
                          <LoadingOutlined />
                        ) : (
                          <ScanOutlined />
                        )
                      }
                      className="submit-button-innovative"
                    >
                      {otpLoading
                        ? "SENDING CODE..."
                        : verifyingOtp
                        ? "VERIFYING..."
                        : isAnimating
                        ? "WELCOME TO ..."
                        : !otpSent
                        ? "SEND CODE"
                        : "VERIFY & LOG IN"}
                    </Button>
                  </motion.div>

                
                  <motion.div
                    variants={itemVariants}
                    style={{
                      textAlign: "center",
                      marginTop: "10px",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          "rgba(255,255,255,0.3)",
                        fontSize: "9px",
                        letterSpacing: "2px",
                      }}
                    >
                      OR CONNECT VIA
                    </Text>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "30px",
                        marginTop: "20px",
                      }}
                    >
                      <TwitterOutlined className="social-icon" />
                      <FacebookOutlined className="social-icon" />
                      <GoogleOutlined className="social-icon" />
                    </div>
                  </motion.div>

              
                  <motion.div variants={itemVariants} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        margin: "4px 0 16px",
                      }}
                    >
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
                      <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: "10px", letterSpacing: "2px" }}>
                        NEW TO AXS STUDIO
                      </Text>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
                    </div>
                    <Button
                      block
                      onClick={() => onRegister && onRegister()}
                      className="register-cta-button"
                      style={{
                        height: "48px",
                        borderRadius: "18px",
                        background: "transparent",
                        border: "1px solid rgba(56,189,248,0.5)",
                        color: "#38BDF8",
                        fontWeight: 700,
                        letterSpacing: "1px",
                      }}
                    >
                      Register
                    </Button>
                  </motion.div>
                </div>
              </Card>
            </motion.div>
          </Col>
        </Row>

        
        <style>{`
          .glass-card {transition: border 0.4s ease;}
          .glass-card:hover {border-color:rgba(56, 189, 248, 0.5) !important;}
          .login-card {width: 90vw;max-width: 400px;border-radius: 40px !important;padding: 20px !important;}
          .login-left-col {display: none !important;}

          @media (min-width: 768px) {
            .login-left-col {display: flex !important;flex-direction: column;justify-content: center;padding: 0 8%;}}
          .login-right-col {display: flex;align-items: center;justify-content: center;padding: 20px;}
          .brand-icon {font-size: 40px;}
          .brand-title {letter-spacing: 8px;}
          .hero-title {font-size: min(4.5rem, 5.5vw) !important;}
          .quote-box {height: 60px;}
          .quote-text {font-size: 18px;}
          .card-title {font-size: 28px;}
          .splash-camera-icon {font-size: 120px;}
          .splash-welcome-text {font-size: 12px;}
          .splash-brand-char {font-size: min(60px, 6vw);}
          .splash-brand-x {font-size: min(70px, 7vw);}
          .splash-tagline {font-size: 16px;}
          .splash-glow {width: 500px;height: 500px;}
          .creative-input {background:rgba(255, 255, 255, 0.08) !important;border:1px solid rgba(255, 255, 255, 0.1) !important;border-radius: 20px !important;padding: 14px 20px !important;color: #fff !important;}
          .creative-input:focus {background:rgba(255, 255, 255, 0.12) !important;border-color: #38BDF8 !important;box-shadow:0 0 15px rgba(56, 189, 248, 0.2) !important;}
          .label-text {color: rgba(255,255,255,0.5);margin-left: 8px;margin-bottom: 8px;display: block;font-size: 10px;letter-spacing: 2px;}
          .submit-button-innovative {height: 60px !important;
            background:linear-gradient(135deg,#38BDF8,#0ea5e9) !important;color: #000 !important;border: none !important;border-radius: 20px !important;font-weight: 800 !important;letter-spacing: 2px;box-shadow:0 10px 30px rgba(56, 189, 248, 0.4) !important;}
          .submit-button-innovative:hover {transform: translateY(-4px);filter: brightness(1.1);}
          .register-cta-button:hover {background: rgba(56,189,248,0.1) !important;transform: translateY(-2px);}
          .social-icon {font-size: 22px;color: rgba(255,255,255,0.4);cursor: pointer;transition: all 0.3s;}
          .social-icon:hover {color: #38BDF8;transform:translateY(-5px)scale(1.2);}
          .signup-link {color: rgba(255,255,255,0.5) !important;font-size: 13px !important;}
          .ant-input {color: #fff !important;}
          .ant-input::placeholder {color:rgba(255,255,255,0.2) !important;}
          .ant-input-affix-wrapper {background: transparent !important;border: none !important;}

          @media (max-width: 1439px) {
            .login-left-col {padding: 0 5%;}
            .hero-title {font-size: min(3.6rem, 5vw) !important;}
            .login-card {max-width: 380px;}
          }

          @media (max-width: 1024px) {
            .login-left-col {padding: 0 4%;}
            .hero-title {font-size: min(2.8rem, 4.5vw) !important;}
            .brand-title {font-size: 16px !important;letter-spacing: 5px;}
            .brand-icon {font-size: 32px;}
            .quote-text {font-size: 15px;}
            .login-card {max-width: 360px;border-radius: 32px !important;}
            .card-title {font-size: 24px;}
            .splash-camera-icon {font-size: 90px;}
            .splash-brand-char {font-size: min(46px, 6vw);}
            .splash-brand-x {font-size: min(54px, 7vw);}
            .splash-tagline {font-size: 14px;}
            .splash-glow {width: 380px;height: 380px;}
          }

          @media (max-width: 768px) {
            .login-right-col {padding: 16px;}
            .login-card {width: 92vw;max-width: 420px;border-radius: 28px !important;padding: 16px !important;}
            .card-title {font-size: 22px;letter-spacing: 6px !important;}
            .submit-button-innovative {height: 54px !important;}
            .social-icon {font-size: 20px;}
            .splash-camera-icon {font-size: 70px;}
            .splash-welcome-text {font-size: 10px;letter-spacing: 8px !important;}
            .splash-brand-char {font-size: min(34px, 8vw);}
            .splash-brand-x {font-size: min(40px, 9vw);margin: 0 8px !important;}
            .splash-tagline {font-size: 12px;}
            .splash-glow {width: 300px;height: 300px;}
          }

          @media (max-width: 480px) {
            .login-right-col {padding: 10px;}
            .login-card {width: 94vw;max-width: 100%;border-radius: 22px !important;padding: 14px !important;}
            .card-title {font-size: 18px;letter-spacing: 4px !important;}
            .creative-input {border-radius: 16px !important;padding: 12px 16px !important;}
            .submit-button-innovative {height: 48px !important;border-radius: 16px !important;font-size: 13px;}
            .social-icon {font-size: 18px;}
            .signup-link {font-size: 12px !important;}
            .splash-camera-icon {font-size: 54px;}
            .splash-welcome-text {font-size: 9px;letter-spacing: 6px !important;margin-bottom: 10px !important;}
            .splash-brand-char {font-size: min(24px, 8vw);}
            .splash-brand-x {font-size: min(28px, 9vw);margin: 0 6px !important;}
            .splash-tagline {font-size: 10px;letter-spacing: 1px !important;}
            .splash-glow {width: 220px;height: 220px;}
            .login-root {height: 100dvh !important;}
          }

          @media (max-width: 360px) {
            .login-card {width: 96vw;padding: 10px !important;}
            .card-title {font-size: 16px;letter-spacing: 3px !important;}
            .splash-brand-char {font-size: 18px;}
            .splash-brand-x {font-size: 20px;}
          }
        `}</style>
      </div>
    </ConfigProvider>
  );
}