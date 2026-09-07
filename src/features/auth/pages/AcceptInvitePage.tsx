import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button, Typography, Spin } from "antd";
import { CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";
import StudioManagerRegisterPage, {
  StudioManagerFormData,
} from "./register/studio-manager/StudioManagerRegisterPage";
import StudioPhotographerRegisterPage, {
  StudioPhotographerFormData,
} from "./register/studio-photographer/StudioPhotographerRegisterPage";

const { Title, Text } = Typography;

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

type InviteRole = "studio_manager" | "studio_photographer";

interface InviteInfo {
  email: string;
  role: InviteRole;
  studioName?: string;
}

type PageState = "loading" | "invalid" | "form" | "submitted";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<PageState>("loading");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadInvite = async () => {
      try {
        const response = await fetch(`${API_BASE}/invite/${token}`);
        const body = await response.json().catch(() => null);

        if (!response.ok || !body?.success) {
          throw new Error(body?.message || "This invite link is invalid or has expired.");
        }

        if (!cancelled) {
          setInvite(body.invite);
          setState("form");
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMessage(err.message || "This invite link is invalid or has expired.");
          setState("invalid");
        }
      }
    };

    loadInvite();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submitRegistration = async (formData: unknown) => {
    const response = await fetch(`${API_BASE}/invite/${token}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok || !body?.success) {
      throw new Error(body?.message || "Registration failed. Please try again.");
    }

    return body;
  };

  const handleManagerSubmitted = async (data: StudioManagerFormData) => {
    try {
      await submitRegistration(data);
      setState("submitted");
    } catch (err: any) {
      setErrorMessage(err.message || "Registration failed. Please try again.");
    }
  };

  const handlePhotographerSubmitted = async (data: StudioPhotographerFormData) => {
    try {
      await submitRegistration(data);
      setState("submitted");
    } catch (err: any) {
      setErrorMessage(err.message || "Registration failed. Please try again.");
    }
  };

  if (state === "loading") {
    return (
      <div style={centeredWrapStyle}>
        <Spin size="large" />
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div style={centeredWrapStyle}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={cardStyle}>
          <CloseCircleFilled style={{ fontSize: 56, color: "#f87171", marginBottom: 20 }} />
          <Title level={3} style={{ color: "#fff", margin: "0 0 12px" }}>Invite Not Valid</Title>
          <Text style={{ color: "rgba(255,255,255,0.65)", display: "block", marginBottom: 28 }}>
            {errorMessage}
          </Text>
          <Button type="primary" block size="large" onClick={() => navigate("/")}>
            Back to Login
          </Button>
        </motion.div>
      </div>
    );
  }

  if (state === "submitted") {
    return (
      <div style={centeredWrapStyle}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={cardStyle}>
          <CheckCircleFilled style={{ fontSize: 56, color: "#38BDF8", marginBottom: 20 }} />
          <Title level={3} style={{ color: "#fff", margin: "0 0 12px" }}>Application Submitted</Title>
          <Text style={{ color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 8 }}>
            Thanks — your details have been sent for review.
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.55)", display: "block", marginBottom: 28, fontSize: 13 }}>
            A super admin needs to approve your account before you can log in.
          </Text>
          <Button type="primary" block size="large" onClick={() => navigate("/")}>
            Back to Login
          </Button>
        </motion.div>
      </div>
    );
  }

  if (!invite) return null;

  if (invite.role === "studio_manager") {
    return (
      <StudioManagerRegisterPage
        email={invite.email}
        studioName={invite.studioName}
        onBack={() => navigate("/")}
        onSubmitted={handleManagerSubmitted}
      />
    );
  }

  return (
    <StudioPhotographerRegisterPage
      email={invite.email}
      studioName={invite.studioName}
      onBack={() => navigate("/")}
      onSubmitted={handlePhotographerSubmitted}
    />
  );
}

const centeredWrapStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "radial-gradient(circle at center, #0f172a 0%, #020617 70%)",
  padding: 24,
};

const cardStyle: React.CSSProperties = {
  maxWidth: 440,
  width: "100%",
  background: "rgba(15, 23, 42, 0.9)",
  border: "1px solid rgba(56, 189, 248, 0.3)",
  borderRadius: 24,
  padding: "40px 32px",
  textAlign: "center",
  boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
};