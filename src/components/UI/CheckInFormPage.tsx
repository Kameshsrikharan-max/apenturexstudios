import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Typography, Button, Switch, Spin, Segmented, message } from "antd";
import { motion, AnimatePresence } from "framer-motion";
import {
  CameraOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  UserOutlined,
  UploadOutlined,
  InboxOutlined,
  ReloadOutlined,
  AimOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import "./CheckInFormPage.css";

const { Title, Text } = Typography;

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB

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

type PhotoSource = "camera" | "upload";

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

const STEPS = [
  { key: "photo", label: "Photo", icon: <CameraOutlined /> },
  { key: "location", label: "Location", icon: <EnvironmentOutlined /> },
  { key: "confirm", label: "Confirm", icon: <CheckCircleOutlined /> },
] as const;

export default function CheckInFormPage() {
  const { token } = useParams<{ token: string }>();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [context, setContext] = useState<CheckInContext | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [photoSource, setPhotoSource] = useState<PhotoSource>("camera");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [arrivedConfirmed, setArrivedConfirmed] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const stopCameraStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const startCamera = async () => {
    setErrorMsg("");
    setCameraStarting(true);
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
      setErrorMsg("Camera access is required to check in this way. Please allow camera permission, or switch to Upload.");
    } finally {
      setCameraStarting(false);
    }
  };

  const captureLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocError("Location access is required to check in.");
      return;
    }
    setLocError("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocError("Please allow location access to complete check-in.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

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
    stopCameraStream();
    captureLocation();
  };

  const retakePhoto = () => {
    setPhoto(null);
    setCoords(null);
    setLocError("");
    if (photoSource === "camera") startCamera();
  };

  const handleSourceChange = (value: PhotoSource) => {
    setErrorMsg("");
    if (value === photoSource) return;
    stopCameraStream();
    setPhoto(null);
    setCoords(null);
    setLocError("");
    setPhotoSource(value);
  };

  const readFileAsPhoto = (file: File) => {
    if (!file.type.startsWith("image/")) {
      message.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      message.error("Image is too large. Please choose a file under 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result as string);
      captureLocation();
    };
    reader.onerror = () => {
      message.error("Couldn't read that file. Please try another photo.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFileAsPhoto(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFileAsPhoto(file);
  };

  const canCheckIn = !!photo && !!coords && arrivedConfirmed;

  const activeStepIndex = !photo ? 0 : !coords ? 1 : 2;

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
          photoSource,
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
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 15 }}
          >
            <CheckCircleOutlined className="ci-status-icon ci-success-icon" />
          </motion.div>
          <Title level={3}>You're checked in</Title>
          <Text>Have a great shoot. The studio has been notified.</Text>
          {coords ? (
            <div className="ci-mini-map">
              <iframe
                title="check-in location"
                className="ci-mini-map-frame"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.004}%2C${
                  coords.lat - 0.003
                }%2C${coords.lng + 0.004}%2C${coords.lat + 0.003}&marker=${coords.lat}%2C${coords.lng}&layer=mapnik`}
              />
            </div>
          ) : null}
        </motion.div>
      </main>
    );
  }

  return (
    <main className="ci-page">
      <div className="ci-card ci-card-glow">
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

        {/* Step progress rail */}
        <div className="ci-stepper">
          {STEPS.map((step, i) => (
            <div className="ci-stepper-item" key={step.key}>
              <div
                className={
                  "ci-stepper-dot" +
                  (i < activeStepIndex ? " ci-stepper-dot-done" : "") +
                  (i === activeStepIndex ? " ci-stepper-dot-active" : "")
                }
              >
                {i < activeStepIndex ? <CheckCircleOutlined /> : step.icon}
              </div>
              <Text className="ci-stepper-label">{step.label}</Text>
              {i < STEPS.length - 1 ? (
                <div className={"ci-stepper-line" + (i < activeStepIndex ? " ci-stepper-line-done" : "")} />
              ) : null}
            </div>
          ))}
        </div>

        <div className="ci-step">
          <div className="ci-step-header">
            <Text strong>Step 1 — Verification photo</Text>
            <Segmented
              size="small"
              value={photoSource}
              onChange={(v) => handleSourceChange(v as PhotoSource)}
              options={[
                { label: "Camera", value: "camera", icon: <CameraOutlined /> },
                { label: "Upload", value: "upload", icon: <UploadOutlined /> },
              ]}
            />
          </div>

          <AnimatePresence mode="wait">
            {photo ? (
              <motion.div
                key="preview"
                className="ci-photo-preview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <img src={photo} alt="Check-in capture" className={photoSource === "camera" ? "ci-mirrored" : ""} />
                <Button icon={<ReloadOutlined />} size="small" onClick={retakePhoto}>
                  {photoSource === "camera" ? "Retake" : "Choose another"}
                </Button>
              </motion.div>
            ) : photoSource === "camera" ? (
              <motion.div
                key="camera"
                className="ci-camera-box"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {!cameraActive ? (
                  <Button
                    icon={<CameraOutlined />}
                    type="primary"
                    loading={cameraStarting}
                    onClick={startCamera}
                  >
                    Open Camera
                  </Button>
                ) : (
                  <div className="ci-camera-live">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video ref={videoRef} playsInline muted />
                    <div className="ci-camera-ring" />
                    <Button type="primary" onClick={capturePhoto} className="ci-capture-btn">
                      Capture
                    </Button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                className={"ci-upload-zone" + (isDragging ? " ci-upload-zone-active" : "")}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <InboxOutlined className="ci-upload-icon" />
                <Text strong>Drop a photo here, or click to browse</Text>
                <Text type="secondary" className="ci-upload-hint">
                  JPG or PNG, up to 8MB
                </Text>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="ci-hidden-input"
                  onChange={handleFileInputChange}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>

        <div className="ci-step">
          <Text strong>Step 2 — Location</Text>
          <div className="ci-location-box">
            {locating ? (
              <div className="ci-location-locating">
                <Spin size="small" />
                <Text type="secondary">Pinpointing your location…</Text>
              </div>
            ) : coords ? (
              <>
                <Text className="ci-coords">
                  <AimOutlined /> {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} captured
                </Text>
                <div className="ci-mini-map">
                  <iframe
                    title="captured location"
                    className="ci-mini-map-frame"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.004}%2C${
                      coords.lat - 0.003
                    }%2C${coords.lng + 0.004}%2C${coords.lat + 0.003}&marker=${coords.lat}%2C${coords.lng}&layer=mapnik`}
                  />
                </div>
              </>
            ) : locError ? (
              <Text type="danger">
                <CloseCircleOutlined /> {locError}
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