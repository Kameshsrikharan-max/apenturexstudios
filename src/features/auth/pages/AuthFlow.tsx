import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import { message } from "antd";
import LoginPage from "./LoginPage";
import RegisterPage, { RegisterRole } from "./RegisterPage";
import OnboardingModal from "../../../components/Onboarding/OnboardingModal";
import StudioAdminRegisterPage, {
  StudioAdminFormData,
} from "./register/studio-admin/StudioAdminRegisterPage";
import { signupRequest, resetOtpState } from "../../../redux/actions/authActions";

type AuthStep = "login" | "register" | "studio-admin-register" | "onboarding" | "camera";

interface AuthFlowProps {
  onComplete: (data: any) => void;
}

export default function AuthFlow({ onComplete }: AuthFlowProps) {
  const [msgApi, contextHolder] = message.useMessage();
  const dispatch = useDispatch();

  const { signupEmail, signupToken, user, loading, error } = useSelector(
    (state: any) => state.auth
  );

  const [step, setStep] = useState<AuthStep>("login");
  const [authData, setAuthData] = useState<any>(null);
  const [signupSubmitted, setSignupSubmitted] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RegisterRole | null>(null);

  const handleLoginPageDone = (data: any) => {
    setAuthData(data);
    setStep("camera");
  };

  const handleGoToRegister = () => {
    setStep("register");
  };

  const handleBackToLogin = () => {
    setSignupSubmitted(false);
    setSelectedRole(null);
    dispatch(resetOtpState());
    setStep("login");
  };

  const handleRoleVerified = (role: RegisterRole) => {
    setSelectedRole(role);

    if (role === "studio_admin") {
      // Studio Admin has its own dedicated multi-step wizard (Basic Info ->
      // KYC -> Studio Details -> Documents -> Review) and skips the OTP
      // verify stage inside RegisterPage entirely, so there's no
      // signupToken yet at this point — that's fine, the wizard collects
      // everything itself before final submission.
      setStep("studio-admin-register");
      return;
    }

    // Freelance Photographer still goes through RegisterPage's OTP verify
    // stage first, so signupToken/signupEmail are already set by the time
    // we get here.
    setStep("onboarding");
  };

  // Placeholder until the studio admin backend submission flow is wired up:
  // for now this just logs the collected data and hands off to the same
  // camera splash / dashboard entry the rest of the app uses.
  const handleStudioAdminSubmitted = (data: StudioAdminFormData) => {
    console.log("Studio admin registration submitted:", data);
    msgApi.info("Studio registration captured — backend submission isn't wired up yet.");
  };

  const handleOnboardingComplete = (formData: any) => {
    if (!signupToken) {
      msgApi.error("Your signup session expired — please verify your email again.");
      setSelectedRole(null);
      setStep("login");
      return;
    }

    try {
      localStorage.setItem(`axsOnboardingData_${signupEmail}`, JSON.stringify(formData));
    } catch {
    
    }

    setSignupSubmitted(true);
    dispatch(
      signupRequest({
        signupToken,
        role: selectedRole,
        name: formData?.basic?.name,
        phone: formData?.basic?.phone,
      })
    );
  };

  useEffect(() => {
    if (signupSubmitted && step === "onboarding" && user && !loading) {
      setSignupSubmitted(false);
      setAuthData(user);
      setStep("camera");
    }
  }, [signupSubmitted, step, user, loading]);

  useEffect(() => {
    if (signupSubmitted && error) {
      msgApi.error(error);
      setSignupSubmitted(false);
    }
  }, [error]);

  const handleCameraFinished = () => {
    onComplete(authData);
  };

  return (
    <>
      {contextHolder}

      {step === "login" && <LoginPage onLogin={handleLoginPageDone} onRegister={handleGoToRegister} />}

      {step === "register" && (
        <RegisterPage onBack={handleBackToLogin} onComplete={handleRoleVerified} />
      )}

      {step === "studio-admin-register" && (
        <StudioAdminRegisterPage
          onBackToLogin={handleBackToLogin}
          onSubmitted={handleStudioAdminSubmitted}
        />
      )}

      {step === "onboarding" && (
        <OnboardingModal
          prefill={{ email: signupEmail || "" }}
          role={selectedRole}
          onComplete={handleOnboardingComplete}
          onBack={handleBackToLogin}
        />
      )}

      <AnimatePresence>
        {step === "camera" && (
          <motion.div
            key="camera-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999999,
              overflow: "hidden",
              background: "radial-gradient(circle at center, #0f172a 0%, #020617 70%)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <motion.div
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.25 }}
              transition={{ duration: 3.5, ease: "easeOut" }}
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=2070')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(4px) brightness(0.5)",
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
                transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  width: `${120 + i * 50}px`,
                  height: `${120 + i * 50}px`,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(56,189,248,0.25), transparent 70%)",
                  filter: "blur(40px)",
                  top: `${10 + i * 10}%`,
                  left: `${5 + i * 15}%`,
                }}
              />
            ))}

            <div style={{ position: "relative", zIndex: 20, textAlign: "center" }}>
              <motion.div
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 90, damping: 14, duration: 1.2 }}
              >
                <motion.div
                  animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    display: "inline-flex",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "150px",
                    height: "150px",
                    borderRadius: "50%",
                    border: "1px solid rgba(56,189,248,0.3)",
                    backdropFilter: "blur(10px)",
                    background: "rgba(255,255,255,0.03)",
                    boxShadow: "0 0 80px rgba(56,189,248,0.35)",
                  }}
                >
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ fontSize: "70px" }}
                  >
                    📸
                  </motion.span>
                </motion.div>
              </motion.div>

              <div style={{ marginTop: "50px" }}>
                {" AXS".split("").map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 80 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 90, damping: 12 }}
                    style={{
                      color: char === "X" ? "#38BDF8" : "#fff",
                      fontSize: "clamp(28px, 5vw, 64px)",
                      fontWeight: char === "X" ? "700" : "200",
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6, duration: 1 }}
                style={{ marginTop: "25px" }}
              >
                <motion.p
                  animate={{ opacity: [0.4, 1, 0.4], letterSpacing: ["3px", "6px", "3px"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: "14px",
                    margin: 0,
                    textTransform: "uppercase",
                  }}
                >
                  Initializing AXS Workspace
                </motion.p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 2, duration: 1 }}
                style={{
                  width: "320px",
                  maxWidth: "85vw",
                  height: "5px",
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: "999px",
                  overflow: "hidden",
                  margin: "40px auto 0 auto",
                  position: "relative",
                }}
              >
                <motion.div
                  animate={{ x: ["-100%", "350%"] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                  style={{
                    width: "140px",
                    height: "100%",
                    borderRadius: "999px",
                    background: "linear-gradient(90deg,#38BDF8,#0ea5e9,#7dd3fc)",
                    boxShadow: "0 0 20px rgba(56,189,248,0.8)",
                  }}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.4 }}
                style={{ marginTop: "20px" }}
              >
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "11px",
                    letterSpacing: "4px",
                  }}
                >
                  ENTERING DASHBOARD
                </motion.span>
              </motion.div>
            </div>

            <motion.div
              animate={{ opacity: [0, 0.08, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(120deg, transparent 20%, rgba(255,255,255,0.08), transparent 80%)",
              }}
            />

            <CameraStageTimer onDone={handleCameraFinished} durationMs={4600} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function CameraStageTimer({ onDone, durationMs }: { onDone: () => void; durationMs: number }) {
  React.useEffect(() => {
    const t1 = setTimeout(() => {
      onDone();
    }, durationMs);
    return () => clearTimeout(t1);
  }, [onDone, durationMs]);

  return null;
}