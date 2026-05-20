import React, { useState, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useSpring,
  useMotionValue,
  useTransform,
} from "framer-motion";

import {
  Button,
  Input,
  Space,
  Typography,
  Card,
  message,
  ConfigProvider,
  Row,
  Col,
} from "antd";

import {
  CameraOutlined,
  ScanOutlined,
  UserOutlined,
  LoadingOutlined,
  GoogleOutlined,
  TwitterOutlined,
  FacebookOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const quotes = [
  "Photography is the story I fail to put into words.",
  "Your first 10,000 photographs are your worst.",
  "Skill in photography is acquired by practice, not purchase.",
  "Focus on what's important, capture the good times.",
  "A camera is a save button for the mind's eye.",
];

export default function LoginPage({ onLogin, onSignUp }) {
  const [msgApi, contextHolder] = message.useMessage();

  const [isAnimating, setIsAnimating] = useState(false);
  const [identifier, setIdentifier] = useState("");
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

    setIsAnimating(true);

    setTimeout(() => {
      if (onLogin) {
        onLogin({ identifier });
      }
    }, 5000);
  };


  const formBoxVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: 50,
      rotateX: -15,
    },

    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      rotateX: 0,

      transition: {
        type: "spring",
        stiffness: 50,
        damping: 15,
        duration: 1,
        staggerChildren: 0.12,
        delayChildren: 0.4,
      },
    },
  };

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

        {/*BACKGROUND IMAGE */}
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

        {/*BLUE SCREEN / WELCOME SCREEN*/}
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
              {/* BACKGROUND */}
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

              {/* GLOW */}
              <motion.div
                animate={{
                  opacity: [0.3, 0.7, 0.3],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
                style={{
                  position: "absolute",
                  width: "500px",
                  height: "500px",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(56,189,248,0.25), transparent 70%)",
                  filter: "blur(40px)",
                  zIndex: 2,
                }}
              />

              {/* CONTENT */}
              <div
                style={{
                  position: "relative",
                  zIndex: 10,
                  textAlign: "center",
                }}
              >
                {/* CAMERA ANIMATION */}
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
                      style={{
                        fontSize: "120px",
                        color: "#38BDF8",
                        filter:
                          "drop-shadow(0 0 25px rgba(56,189,248,0.8))",
                      }}
                    />
                  </motion.div>
                </motion.div>

                {/* CAMERA FLASH */}
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

                {/* WELCOME TEXT */}
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
                    style={{
                      color: "#38BDF8",
                      letterSpacing: "12px",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: "20px",
                    }}
                  >
                    Welcome To
                  </Text>

                  {/* TITLE */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    {"APERTURE".split("").map((char, i) => (
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
                        style={{
                          fontSize: "min(60px, 6vw)",
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
                      style={{
                        fontSize: "min(70px, 7vw)",
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
                        style={{
                          fontSize: "min(60px, 6vw)",
                          color: "#fff",
                          fontWeight: 100,
                        }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </div>

                  {/* SUBTEXT */}
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
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: "16px",
                        display: "block",
                        marginTop: "30px",
                        letterSpacing: "2px",
                      }}
                    >
                      Capturing Moments • Creating Memories
                    </Text>
                  </motion.div>

                  {/* LOADING BAR */}
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

        {/*MAIN CONTENT*/}
        <Row
          style={{
            height: "100vh",
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* LEFT */}
          <Col
            xs={0}
            md={12}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "0 8%",
            }}
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
                  style={{
                    fontSize: "40px",
                    color: "#38BDF8",
                  }}
                />

                <Title
                  level={4}
                  style={{
                    color: "#fff",
                    margin: 0,
                    letterSpacing: "8px",
                    fontWeight: 200,
                    ...timesFont,
                  }}
                >
                  APERTURE X Studios
                </Title>
              </Space>

              <Title
                style={{
                  color: "#fff",
                  fontSize: "min(4.5rem, 5.5vw)",
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

              {/* QUOTES */}
              <div
                style={{
                  height: "60px",
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
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: "18px",
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

          {/* RIGHT */}
          <Col
            xs={24}
            md={12}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
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
                className="glass-card"
                style={{
                  width: "90vw",
                  maxWidth: "400px",

                  background: "rgba(0, 0, 0, 0.7)",

                  backdropFilter:
                    "blur(10px) saturate(100%)",

                  borderRadius: "40px",

                  border:
                    "1px solid rgba(255,255,255,0.2)",

                  padding: "20px",

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
                  {/* INPUT */}
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
                      className="creative-input"
                    />
                  </motion.div>

                  {/* BUTTON */}
                  <motion.div variants={itemVariants}>
                    <Button
                      block
                      onClick={triggerAdvancedSequence}
                      icon={
                        isAnimating ? (
                          <LoadingOutlined />
                        ) : (
                          <ScanOutlined />
                        )
                      }
                      className="submit-button-innovative"
                    >
                      {isAnimating
                        ? "WELCOME TO ..."
                        : "LOG IN"}
                    </Button>
                  </motion.div>

                  {/* SOCIAL */}
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

                  {/* SIGNUP */}
                  <motion.div
                    variants={itemVariants}
                    style={{
                      textAlign: "center",
                    }}
                  >
                    <Button
                      type="link"
                      onClick={onSignUp}
                      className="signup-link"
                    >
                      Don't have an account?{" "}
                      <span style={{ color: "#38BDF8" }}>
                        Sign Up
                      </span>
                    </Button>
                  </motion.div>
                </div>
              </Card>
            </motion.div>
          </Col>
        </Row>

        {/*STYLES */}
        <style>{`
          .glass-card {
            transition: border 0.4s ease;
          }

          .glass-card:hover {
            border-color:
              rgba(56, 189, 248, 0.5) !important;
          }

          .creative-input {
            background:
              rgba(255, 255, 255, 0.08) !important;

            border:
              1px solid rgba(255, 255, 255, 0.1) !important;

            border-radius: 20px !important;

            padding: 14px 20px !important;

            color: #fff !important;
          }

          .creative-input:focus {
            background:
              rgba(255, 255, 255, 0.12) !important;

            border-color: #38BDF8 !important;

            box-shadow:
              0 0 15px rgba(56, 189, 248, 0.2) !important;
          }

          .label-text {
            color: rgba(255,255,255,0.5);

            margin-left: 8px;

            margin-bottom: 8px;

            display: block;

            font-size: 10px;

            letter-spacing: 2px;
          }

          .submit-button-innovative {
            height: 60px !important;

            background:
              linear-gradient(
                135deg,
                #38BDF8,
                #0ea5e9
              ) !important;

            color: #000 !important;

            border: none !important;

            border-radius: 20px !important;

            font-weight: 800 !important;

            letter-spacing: 2px;

            box-shadow:
              0 10px 30px rgba(56, 189, 248, 0.4) !important;
          }

          .submit-button-innovative:hover {
            transform: translateY(-4px);
            filter: brightness(1.1);
          }

          .social-icon {
            font-size: 22px;
            color: rgba(255,255,255,0.4);
            cursor: pointer;
            transition: all 0.3s;
          }

          .social-icon:hover {
            color: #38BDF8;

            transform:
              translateY(-5px)
              scale(1.2);
          }

          .signup-link {
            color:
              rgba(255,255,255,0.5) !important;

            font-size: 13px !important;
          }

          .ant-input {
            color: #fff !important;
          }

          .ant-input::placeholder {
            color:
              rgba(255,255,255,0.2) !important;
          }

          .ant-input-affix-wrapper {
            background: transparent !important;
            border: none !important;
          }
        `}</style>
      </div>
    </ConfigProvider>
  );
}