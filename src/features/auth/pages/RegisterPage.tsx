import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input, Typography, message, ConfigProvider, Row, Col } from "antd";
import {ShopOutlined,CameraOutlined,UserOutlined,ScanOutlined,LoadingOutlined,ArrowLeftOutlined,CheckCircleFilled,RightOutlined,RocketOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { sendOtpRequest, verifyOtpRequest, resetOtpState, setRegisterRole } from "../../../redux/actions/authActions";
import "./RegisterPage.css";

const { Title, Text } = Typography;

export type RegisterRole = "studio_admin" | "freelance_photographer";

interface RegisterPageProps {
  onBack: () => void;
  onComplete: (role: RegisterRole) => void;
}

interface RoleMeta {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
  accentSoft: string;
  features: string[];
}

const ROLE_META: Record<RegisterRole, RoleMeta> = {
  studio_admin: {
    title: "Studio Admin",
    subtitle: "Run your studio — invite photographers, assign projects, track performance.",
    icon: <ShopOutlined />,
    accent: "#38BDF8",
    accentSoft: "rgba(56,189,248,0.15)",
    features: ["Manage studio profile", "Invite photographers", "Assign projects", "Track performance"],
  },
  freelance_photographer: {
    title: "Freelance Photographer",
    subtitle: "Build your portfolio, get assignments, and work with studios directly.",
    icon: <CameraOutlined />,
    accent: "#4ade80",
    accentSoft: "rgba(74,222,128,0.15)",
    features: ["Build your portfolio", "Get assignments", "Work with studios", "Grow your career"],
  },
};

export default function RegisterPage({ onBack, onComplete }: RegisterPageProps) {
  const [msgApi, contextHolder] = message.useMessage();
  const dispatch = useDispatch();

  const { otpSent, otpLoading, otpError, verifyingOtp, error, needsSignup, user } = useSelector(
    (state: any) => state.auth
  );

  const [stage, setStage] = useState<"role" | "verify">("role");
  const [role, setRole] = useState<RegisterRole | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");

  useEffect(() => {
    dispatch(resetOtpState());
  }, []);

  useEffect(() => {
    if (needsSignup && role) {
      onComplete(role);
    }
  }, [needsSignup]);

  useEffect(() => {
    if (user) {
      msgApi.info("This email is already registered — logging you in instead.");
      onBack();
    }
  }, [user]);

  useEffect(() => {
    if (otpError) msgApi.error(otpError);
  }, [otpError]);

  useEffect(() => {
    if (error) msgApi.error(error);
  }, [error]);

  useEffect(() => {
    if (otpSent) msgApi.success("Code sent — check your email.");
  }, [otpSent]);

  const handleSelectRole = (r: RegisterRole) => {
    setRole(r);
    // Persist to redux immediately — needed later when the onboarding
    // step completes signup, well after this component may be gone.
    dispatch(setRegisterRole(r));

    if (r === "studio_admin") {
      // Studio Admin has its own dedicated multi-step registration wizard
      // (Basic Info -> KYC/Aadhaar -> Studio Details -> Documents -> Review),
      // so skip this page's email-OTP verify stage entirely and hand off
      // to the wizard right away.
      onComplete(r);
      return;
    }

    // Freelance Photographer still goes through the OTP verify stage
    // here until its own dedicated flow is built.
    setTimeout(() => setStage("verify"), 300);
  };

  const handleBackToRole = () => {
    setOtp("");
    setIdentifier("");
    dispatch(resetOtpState());
    setStage("role");
  };

  const triggerVerify = () => {
    if (!identifier) {
      return msgApi.warning("Enter your email to continue.");
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

  const activeMeta = role ? ROLE_META[role] : null;

  return (
    <ConfigProvider theme={{ token: { colorPrimary: activeMeta?.accent || "#38BDF8", borderRadius: 24 } }}>
      <div className="register-root">
        {contextHolder}

        <div className="register-backdrop" />

        <div className="register-content">
          <div className="register-topbar">
            <div className="register-topbar-brand">
              <CameraOutlined className="register-topbar-brand-icon" />
              <Text className="register-topbar-brand-text">APENTURE X STUDIOS</Text>
            </div>
            <Button
              type="link"
              icon={<ArrowLeftOutlined />}
              onClick={stage === "verify" ? handleBackToRole : onBack}
              className="register-back-link"
            >
              {stage === "verify" ? "Change role" : "Back to Login"}
            </Button>
          </div>

          <div className="register-stepper">
            <div className="register-stepper-inner">
              <StepDot label="Choose role" active index={1} done={stage === "verify"} />
              <div className={`step-connector ${stage === "verify" ? "step-connector-active" : ""}`} />
              <StepDot label="Verify email" active={stage === "verify"} index={2} done={false} />
            </div>
          </div>

          <div className="register-stage-wrap">
            <AnimatePresence mode="wait">
              {stage === "role" ? (
                <motion.div
                  key="role-stage"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="register-role-stage"
                >
                  <div className="role-header">
                    <Title level={2} className="role-header-title">
                      Join <span className="role-header-highlight">APENTURE X STUDIOS</span>
                    </Title>
                    <Text className="role-header-subtitle">
                      Choose how you'll work with the platform to get started.
                    </Text>
                  </div>

                  <Row gutter={[24, 24]} justify="center">
                    {(Object.keys(ROLE_META) as RegisterRole[]).map((key, i) => {
                      const meta = ROLE_META[key];
                      return (
                        <Col xs={24} sm={24} md={11} key={key}>
                          <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.12, type: "spring", stiffness: 100, damping: 14 }}
                            whileHover={{ y: -6, scale: 1.015 }}
                            className="role-card"
                            onClick={() => handleSelectRole(key)}
                            style={{ "--accent": meta.accent, "--accent-soft": meta.accentSoft } as React.CSSProperties}
                          >
                            <div className="role-card-glow" />
                            <div className="role-card-icon">{meta.icon}</div>

                            <Title level={4} className="role-card-title">
                              {meta.title}
                            </Title>
                            <Text className="role-card-subtitle">{meta.subtitle}</Text>

                            <Text className="role-card-features-label">Key Features</Text>
                            <div className="role-card-features">
                              {meta.features.map((f) => (
                                <div key={f} className="role-card-feature">
                                  <CheckCircleFilled className="role-card-feature-dot" />
                                  <Text className="role-card-feature-text">{f}</Text>
                                </div>
                              ))}
                            </div>

                            <Button block className="role-card-cta">
                              Register as {meta.title} <RightOutlined />
                            </Button>
                          </motion.div>
                        </Col>
                      );
                    })}
                  </Row>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55, duration: 0.5 }}
                    className="register-signin-cta"
                  >
                    <span className="register-signin-divider" />
                    <Text className="register-signin-text">
                      Already have an account?
                      <button
                        type="button"
                        className="register-signin-link"
                        onClick={onBack}
                      >
                        <span className="register-signin-link-label">Sign In</span>
                        <RightOutlined className="register-signin-link-arrow" />
                      </button>
                    </Text>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="verify-stage"
                  initial={{ opacity: 0, scale: 0.94, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -20 }}
                  transition={{ type: "spring", stiffness: 120, damping: 16 }}
                  className="register-verify-stage"
                  style={{ "--accent": activeMeta?.accent, "--accent-soft": activeMeta?.accentSoft } as React.CSSProperties}
                >
                  <div className="glass-card register-card">
                    <div className="verify-header">
                      <div className="verify-badge">
                        <span className="verify-badge-icon">{activeMeta?.icon}</span>
                        <Text className="verify-badge-text">{activeMeta?.title}</Text>
                      </div>
                      <Title level={3} className="verify-title">
                        VERIFY
                      </Title>
                      <Text className="verify-subtitle">Confirm your email to continue</Text>
                    </div>

                    <div className="verify-body">
                      {!otpSent ? (
                        <div>
                          <Text className="label-text">Email</Text>
                          <Input
                            placeholder="you@example.com"
                            prefix={<UserOutlined className="input-prefix-icon" />}
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            onPressEnter={triggerVerify}
                            disabled={otpLoading}
                            className="creative-input"
                          />
                        </div>
                      ) : (
                        <div>
                          <Text className="label-text">6-Digit Code</Text>
                          <Input
                            placeholder="Enter code"
                            maxLength={6}
                            prefix={<ScanOutlined className="input-prefix-icon" />}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            onPressEnter={triggerVerify}
                            disabled={verifyingOtp}
                            className="creative-input"
                          />
                          <div className="verify-actions-row">
                            <Button type="link" onClick={handleChangeEmail} className="signup-link">
                              Change email
                            </Button>
                            <Button type="link" onClick={handleResendOtp} className="signup-link">
                              Resend code
                            </Button>
                          </div>
                        </div>
                      )}

                      <Button
                        block
                        onClick={triggerVerify}
                        disabled={otpLoading || verifyingOtp}
                        icon={otpLoading || verifyingOtp ? <LoadingOutlined /> : <RocketOutlined />}
                        className="verify-submit-button"
                      >
                        {otpLoading
                          ? "SENDING CODE..."
                          : verifyingOtp
                          ? "VERIFYING..."
                          : !otpSent
                          ? "SEND CODE"
                          : "VERIFY & CONTINUE"}
                      </Button>

                      <div className="register-signin-cta register-signin-cta--compact">
                        <Text className="register-signin-text">
                          Already have an account?
                          <button
                            type="button"
                            className="register-signin-link"
                            onClick={onBack}
                          >
                            <span className="register-signin-link-label">Sign In</span>
                            <RightOutlined className="register-signin-link-arrow" />
                          </button>
                        </Text>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}

function StepDot({ label, active, index, done }: { label: string; active: boolean; index: number; done: boolean }) {
  return (
    <div className="step-dot">
      <div className={`step-dot-circle ${active || done ? "step-dot-circle-active" : ""}`}>
        {done ? <CheckCircleFilled /> : index}
      </div>
      <Text className={`step-dot-label ${active ? "step-dot-label-active" : ""}`}>{label}</Text>
    </div>
  );
}