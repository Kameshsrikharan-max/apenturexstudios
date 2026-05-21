import { useState } from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import AppRoutes from "./routes/AppRoutes";

function App() {
  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [user, setUser] = useState(null);

  const [isTransitioning, setIsTransitioning] =
    useState(false);

  const handleLoginSuccess = (data) => {
    console.log("Access Granted:", data);

    setUser(data);


    setIsTransitioning(true);

    
    setTimeout(() => {
      setIsAuthenticated(true);

      
      setTimeout(() => {
        setIsTransitioning(false);

        data?.onComplete?.();
      }, 1800);

    }, 600);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("isLoggedIn");

    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "#020617",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
    
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: 1,
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999999,
              overflow: "hidden",
              background:
                "radial-gradient(circle at center, #0f172a 0%, #020617 70%)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            
            <motion.div
              initial={{
                scale: 1.3,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 0.25,
              }}
              transition={{
                duration: 3,
              }}
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=2070')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter:
                  "blur(4px) brightness(0.5)",
              }}
            />

          
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -50, 0],
                  x: [0, 30, 0],
                  opacity: [0.2, 0.6, 0.2],
                }}
                transition={{
                  duration: 4 + i,
                  repeat: Infinity,
                }}
                style={{
                  position: "absolute",
                  width: `${120 + i * 50}px`,
                  height: `${120 + i * 50}px`,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(56,189,248,0.25), transparent 70%)",
                  filter: "blur(40px)",
                  top: `${10 + i * 10}%`,
                  left: `${5 + i * 15}%`,
                }}
              />
            ))}

            
            <div
              style={{
                position: "relative",
                zIndex: 20,
                textAlign: "center",
              }}
            >
              {/* CAMERA ICON */}
              <motion.div
                initial={{
                  scale: 0,
                  rotate: -180,
                  opacity: 0,
                }}
                animate={{
                  scale: 1,
                  rotate: 0,
                  opacity: 1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 120,
                  damping: 12,
                }}
              >
                <motion.div
                  animate={{
                    y: [0, -15, 0],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                  }}
                  style={{
                    display: "inline-flex",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "150px",
                    height: "150px",
                    borderRadius: "50%",
                    border:
                      "1px solid rgba(56,189,248,0.3)",
                    backdropFilter: "blur(10px)",
                    background:
                      "rgba(255,255,255,0.03)",
                    boxShadow:
                      "0 0 80px rgba(56,189,248,0.35)",
                  }}
                >
                  <motion.span
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    style={{
                      fontSize: "70px",
                    }}
                  >
                    📸
                  </motion.span>
                </motion.div>
              </motion.div>

            
              <div
                style={{
                  marginTop: "50px",
                }}
              >
                {" AXS"
                  .split("")
                  .map((char, i) => (
                    <motion.span
                      key={i}
                      initial={{
                        opacity: 0,
                        y: 80,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay: i * 0.04,
                        type: "spring",
                        stiffness: 100,
                      }}
                      style={{
                        color:
                          char === "X"
                            ? "#38BDF8"
                            : "#fff",
                        fontSize:
                          "clamp(28px, 5vw, 64px)",
                        fontWeight:
                          char === "X"
                            ? "700"
                            : "200",
                        letterSpacing: "6px",
                        display: "inline-block",
                        whiteSpace: "pre",
                      }}
                    >
                      {char}
                    </motion.span>
                  ))}
              </div>

            
              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 1,
                  duration: 1,
                }}
                style={{
                  marginTop: "25px",
                }}
              >
                <motion.p
                  animate={{
                    opacity: [0.4, 1, 0.4],
                    letterSpacing: [
                      "3px",
                      "6px",
                      "3px",
                    ],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                  }}
                  style={{
                    color:
                      "rgba(255,255,255,0.7)",
                    fontSize: "14px",
                    margin: 0,
                    textTransform: "uppercase",
                  }}
                >
                  Initializing AXS Workspace
                </motion.p>
              </motion.div>

              {/* LOADING BAR */}
              <motion.div
                initial={{
                  opacity: 0,
                  scaleX: 0,
                }}
                animate={{
                  opacity: 1,
                  scaleX: 1,
                }}
                transition={{
                  delay: 1.2,
                  duration: 1,
                }}
                style={{
                  width: "320px",
                  maxWidth: "85vw",
                  height: "5px",
                  background:
                    "rgba(255,255,255,0.08)",
                  borderRadius: "999px",
                  overflow: "hidden",
                  margin:
                    "40px auto 0 auto",
                  position: "relative",
                }}
              >
                <motion.div
                  animate={{
                    x: ["-100%", "350%"],
                  }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{
                    width: "140px",
                    height: "100%",
                    borderRadius: "999px",
                    background:
                      "linear-gradient(90deg,#38BDF8,#0ea5e9,#7dd3fc)",
                    boxShadow:
                      "0 0 20px rgba(56,189,248,0.8)",
                  }}
                />
              </motion.div>

              
              <motion.div
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                transition={{
                  delay: 1.4,
                }}
                style={{
                  marginTop: "20px",
                }}
              >
                <motion.span
                  animate={{
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                  style={{
                    color:
                      "rgba(255,255,255,0.5)",
                    fontSize: "11px",
                    letterSpacing: "4px",
                  }}
                >
                  ENTERING DASHBOARD
                </motion.span>
              </motion.div>
            </div>

            
            <motion.div
              animate={{
                opacity: [0, 0.08, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
              }}
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(120deg, transparent 20%, rgba(255,255,255,0.08), transparent 80%)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      
      <motion.div
        initial={{
          opacity: 0,
          scale: 1.05,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        transition={{
          duration: 1,
        }}
      >
        <AppRoutes
          isAuthenticated={isAuthenticated}
          onLogin={handleLoginSuccess}
          onLogout={handleLogout}
          user={user}
        />
      </motion.div>
    </div>
  );
}

export default App;