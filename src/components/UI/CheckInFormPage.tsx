import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Typography, Button, Switch, Spin } from "antd";
import { motion } from "framer-motion";
import {
  CameraOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  UserOutlined,
} from "@ant-design/icons";
import "./CheckInFormPage.css";

const { Title, Text } = Typography;

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

type PageState =
  | "loading"
  | "invalid"
  | "not_yet_valid"
  | "expired"
  | "already_checked_in"
  | "form"
  | "submitting"
  | "success"
  | "error";

interface CheckInContext {
  state: string;
  opensAt?: number | null;
  event: {
    name: string;
    date: string;
    time: string;
    address?: string;
    city?: string;
  };
  photographer: {
    name: string;
    email: string;
  };
}

export default function CheckInFormPage() {
  const { token } = useParams<{ token: string }>();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [context, setContext] = useState<CheckInContext | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [cameraActive, setCameraActive] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [arrivedConfirmed, setArrivedConfirmed] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/checkin/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Unable to load check-in.");
        return data as CheckInContext;
      })
      .then((data) => {
        setContext(data);
        setPageState(data.state === "valid" ? "form" : (data.state as PageState));
      })
      .catch((err: Error) => {
        setErrorMsg(err.message);
        setPageState("invalid");
      });
  }, [token]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setErrorMsg("Camera access is required to check in. Please allow camera permission and try again.");
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Location access is required to check in.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setErrorMsg("Please allow location access to complete check-in.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL("image/jpeg", 0.85));

    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraActive(false);

    captureLocation();
  };

  const retakePhoto = () => {
    setPhoto(null);
    setCoords(null);
    startCamera();
  };

  const canCheckIn = !!photo && !!coords && arrivedConfirmed;

  const handleSubmit = async () => {
    if (!token || !canCheckIn) return;
    setErrorMsg("");
    setPageState("submitting");
    try {
      const res = await fetch(`${API_BASE}/checkin/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arrivedConfirmed,
          photo,
          lat: coords!.lat,
          lng: coords!.lng,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Check-in failed.");
      setPageState("success");
    } catch (err) {
      setErrorMsg((err as Error).message);
      setPageState("error");
    }
  };

  const statusMessages: Partial<Record<PageState, { title: string; text: string }>> = {
    not_yet_valid: {
      title: "Not open yet",
      text: "This check-in link becomes active exactly 1 hour before the event starts. Come back then.",
    },
    expired: {
      title: "Check-in window closed",
      text: "This link was only valid until the event's start time and has now expired.",
    },
    already_checked_in: {
      title: "Already checked in",
      text: "You've already completed check-in for this event.",
    },
    invalid: {
      title: "Invalid link",
      text: errorMsg || "This check-in link is invalid or has expired.",
    },
    error: {
      title: "Something went wrong",
      text: errorMsg || "Please try again.",
    },
  };

  if (pageState === "loading") {
    return (
      <main className="ci-page ci-center">
        <Spin size="large" />
      </main>
    );
  }

  if (statusMessages[pageState]) {
    const msg = statusMessages[pageState]!;
    return (
      <main className="ci-page ci-center">
        <div className="ci-status-card">
          <ClockCircleOutlined className="ci-status-icon" />
          <Title level={3}>{msg.title}</Title>
          <Text>{msg.text}</Text>
        </div>
      </main>
    );
  }

  if (pageState === "success") {
    return (
      <main className="ci-page ci-center">
        <motion.div
          className="ci-status-card ci-success"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <CheckCircleOutlined className="ci-status-icon ci-success-icon" />
          <Title level={3}>You're checked in</Title>
          <Text>Have a great shoot. The studio has been notified.</Text>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="ci-page">
      <div className="ci-card">
        <Title level={3} className="ci-heading">
          Pre-Event Check-In
        </Title>

        <div className="ci-event-summary">
          <div className="ci-summary-row">
            <CalendarOutlined /> <span>{context?.event.name}</span>
          </div>
          <div className="ci-summary-row">
            <ClockCircleOutlined />{" "}
            <span>
              {context?.event.date} · {context?.event.time}
            </span>
          </div>
          {context?.event.address ? (
            <div className="ci-summary-row">
              <EnvironmentOutlined />{" "}
              <span>
                {context.event.address}
                {context.event.city ? `, ${context.event.city}` : ""}
              </span>
            </div>
          ) : null}
          {context?.photographer.name ? (
            <div className="ci-summary-row">
              <UserOutlined /> <span>{context.photographer.name}</span>
            </div>
          ) : null}
        </div>

        <div className="ci-step">
          <Text strong>Step 1 — Live photo</Text>
          <div className="ci-camera-box">
            {!photo && !cameraActive ? (
              <Button icon={<CameraOutlined />} type="primary" onClick={startCamera}>
                Open Camera
              </Button>
            ) : null}

            {cameraActive ? (
              <div className="ci-camera-live">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video ref={videoRef} playsInline muted />
                <Button type="primary" onClick={capturePhoto} className="ci-capture-btn">
                  Capture
                </Button>
              </div>
            ) : null}

            {photo ? (
              <div className="ci-photo-preview">
                <img src={photo} alt="Check-in capture" />
                <Button size="small" onClick={retakePhoto}>
                  Retake
                </Button>
              </div>
            ) : null}
          </div>
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>

        <div className="ci-step">
          <Text strong>Step 2 — Location</Text>
          <div className="ci-location-box">
            {locating ? <Spin size="small" /> : null}
            {coords ? (
              <Text className="ci-coords">
                <EnvironmentOutlined /> {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} captured
              </Text>
            ) : (
              <Text type="secondary">Captured automatically right after your photo.</Text>
            )}
          </div>
        </div>

        <div className="ci-step ci-arrive-row">
          <Text strong>I have arrived at the venue</Text>
          <Switch checked={arrivedConfirmed} onChange={setArrivedConfirmed} />
        </div>

        {errorMsg ? (
          <Text type="danger" className="ci-error">
            {errorMsg}
          </Text>
        ) : null}

        <Button
          type="primary"
          size="large"
          block
          disabled={!canCheckIn}
          loading={pageState === "submitting"}
          onClick={handleSubmit}
          className="ci-submit-btn"
        >
          Check In
        </Button>
      </div>
    </main>
  );
}