import { motion } from "framer-motion";
import { Button, Typography, message, ConfigProvider, Row, Col } from "antd";
import {
  ShopOutlined,
  CameraOutlined,
  ArrowLeftOutlined,
  CheckCircleFilled,
  RightOutlined,
} from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { setRegisterRole } from "../../../redux/actions/authActions";
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

  const handleSelectRole = (r: RegisterRole) => {
    // Persist to redux immediately — needed later when the onboarding
    // step completes signup, well after this component may be gone.
    dispatch(setRegisterRole(r));

    // Both roles now go straight into their own dedicated multi-step
    // registration wizard (Studio Admin -> StudioAdminRegisterPage,
    // Freelance Photographer -> FreelancePhotographerRegisterPage).
    // No OTP verify stage lives in this component anymore.
    onComplete(r);
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#38BDF8", borderRadius: 24 } }}>
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
              onClick={onBack}
              className="register-back-link"
            >
              Back to Login
            </Button>
          </div>

          <div className="register-stage-wrap">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
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
                  <button type="button" className="register-signin-link" onClick={onBack}>
                    <span className="register-signin-link-label">Sign In</span>
                    <RightOutlined className="register-signin-link-arrow" />
                  </button>
                </Text>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}