import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { message, Button, Typography } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";
import LoginPage from "./LoginPage";
import RegisterPage, { RegisterRole } from "./RegisterPage";
import StudioAdminRegisterPage, {
  StudioAdminFormData,
} from "./register/studio-admin/StudioAdminRegisterPage";
import FreelancePhotographerRegisterPage, {
  FreelancePhotographerFormData,
} from "./register/freelancePhotographer/FreelancePhotographerRegisterPage";
import { pushNotification } from "../../../utils/notificationStore";

const { Title, Text } = Typography;

type AuthStep =
  | "login"
  | "register"
  | "studio-admin-register"
  | "freelance-photographer-register"
  | "pending-approval"
  | "camera";

interface AuthFlowProps {
  onComplete: (data: any) => void;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export default function AuthFlow({ onComplete }: AuthFlowProps) {
  const [msgApi, contextHolder] = message.useMessage();

  const [step, setStep] = useState<AuthStep>("login");
  const [authData, setAuthData] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const handleLoginPageDone = (data: any) => {
    setAuthData(data);
    setStep("camera");
  };

  const handleGoToRegister = () => {
    setStep("register");
  };

  const handleBackToLogin = () => {
    setStep("login");
  };

  const handleRoleSelected = (role: RegisterRole) => {
    if (role === "studio_admin") {
      setStep("studio-admin-register");
      return;
    }
    setStep("freelance-photographer-register");
  };

  const submitRegistration = async (endpoint: string, formData: unknown) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok || !body?.success) {
      throw new Error(body?.message || "Registration failed. Please try again.");
    }

    return body as { user: any; profile: any };
  };

  const handleStudioAdminSubmitted = async (data: StudioAdminFormData) => {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        studioDetails: { ...data.studioDetails, media: [] },
        documents: { ...data.documents, documentFile: null },
      };
      const result = await submitRegistration("/register/studio-admin", payload);

      const applicantName = `${data.basicInfo.firstName} ${data.basicInfo.lastName}`.trim();
      const applicantEmail = result.user?.email || data.basicInfo.email;

      // Notifies whoever's browser has the super admin's session open —
      // same client-side notification mechanism used for delete requests.
      pushNotification({
        title: `New Studio Admin registration: ${applicantName}`,
        notifCategory: "registrationRequest",
        category: "Registration",
        triggeredBy: applicantName,
        priority: "medium",
        tags: ["registration", "studio-admin"],
        isActionable: false,
        payload: {
          registrationType: "studio-admin",
          applicantName,
          applicantEmail,
        },
      });

      setPendingEmail(applicantEmail);
      setStep("pending-approval");
    } catch (err: any) {
      msgApi.error(err.message || "Studio registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFreelancePhotographerSubmitted = async (data: FreelancePhotographerFormData) => {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        photographerDetails: { ...data.photographerDetails, media: [] },
        workArea: { ...data.workArea, documentFile: null },
      };
      const result = await submitRegistration("/register/freelance-photographer", payload);

      const applicantName = `${data.basicInfo.firstName} ${data.basicInfo.lastName}`.trim();
      const applicantEmail = result.user?.email || data.basicInfo.email;

      pushNotification({
        title: `New Freelance Photographer registration: ${applicantName}`,
        notifCategory: "registrationRequest",
        category: "Registration",
        triggeredBy: applicantName,
        priority: "medium",
        tags: ["registration", "freelance-photographer"],
        isActionable: false,
        payload: {
          registrationType: "freelance-photographer",
          applicantName,
          applicantEmail,
        },
      });

      setPendingEmail(applicantEmail);
      setStep("pending-approval");
    } catch (err: any) {
      msgApi.error(err.message || "Photographer registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCameraFinished = () => {
    onComplete(authData);
  };

  return (
    <>
      {contextHolder}

      {step === "login" && <LoginPage onLogin={handleLoginPageDone} onRegister={handleGoToRegister} />}

      {step === "register" && (
        <RegisterPage onBack={handleBackToLogin} onComplete={handleRoleSelected} />
      )}

      {step === "studio-admin-register" && (
        <StudioAdminRegisterPage
          onBackToLogin={handleBackToLogin}
          onSubmitted={handleStudioAdminSubmitted}
        />
      )}

      {step === "freelance-photographer-register" && (
        <FreelancePhotographerRegisterPage
          onBackToLogin={handleBackToLogin}
          onSubmitted={handleFreelancePhotographerSubmitted}
        />
      )}

      {step === "pending-approval" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "radial-gradient(circle at center, #0f172a 0%, #020617 70%)",
            padding: 24,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{
              maxWidth: 440,
              width: "100%",
              background: "rgba(15, 23, 42, 0.9)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: 24,
              padding: "40px 32px",
              textAlign: "center",
              boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
            }}
          >
            <CheckCircleFilled style={{ fontSize: 56, color: "#38BDF8", marginBottom: 20 }} />

            <Title level={3} style={{ color: "#fff", margin: "0 0 12px" }}>
              Registration Submitted
            </Title>

            <Text style={{ color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 8 }}>
              Thanks — your details for <strong style={{ color: "#38BDF8" }}>{pendingEmail}</strong> have
              been sent to our team.
            </Text>

            <Text style={{ color: "rgba(255,255,255,0.55)", display: "block", marginBottom: 28, fontSize: 13 }}>
              A super admin needs to review and approve your account before you can log in. This usually
              doesn't take long — try logging in again once you've been notified.
            </Text>

            <Button type="primary" block size="large" onClick={handleBackToLogin}>
              Back to Login
            </Button>
          </motion.div>
        </div>
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