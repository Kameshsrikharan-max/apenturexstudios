import { useEffect, useMemo, useState } from "react";
import { Modal, Image, Button, Tag, message, Tooltip } from "antd";
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  EnvironmentOutlined,
  MailOutlined,
  SendOutlined,
  UserOutlined,
  RadarChartOutlined,
} from "@ant-design/icons";
import {
  fetchCheckInStatusForEvent,
  resendCheckInEmail,
  EventCheckInStatus,
  CheckInStatusEntry,
} from "../../utils/checkinStatusApi";
import "./CheckInStatusModal.css";

interface VenueLocation {
  lat: number;
  lng: number;
}

interface Props {
  open: boolean;
  eventId: string | null;
  eventName?: string;
  venueLocation?: VenueLocation | null;
  onClose: () => void;
}

const WINDOW_MS = 60 * 60 * 1000;

// Haversine — straight-line distance in meters between two lat/lng points.
// Used to flag a check-in that's suspiciously far from the pinned venue.
function distanceMeters(a: VenueLocation, b: VenueLocation): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CheckInStatusModal({ open, eventId, eventName, venueLocation, onClose }: Props) {
  const [status, setStatus] = useState<EventCheckInStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !eventId) return;
    let cancelled = false;
    setLoading(true);
    fetchCheckInStatusForEvent(eventId).then((data) => {
      if (!cancelled) {
        setStatus(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, eventId]);

  // Live tick, only while the modal is open and there's a countdown to show.
  useEffect(() => {
    if (!open || !status?.eventStartTs) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open, status?.eventStartTs]);

  const windowOpensAt = status?.eventStartTs ? status.eventStartTs - WINDOW_MS : null;
  const windowClosesAt = status?.eventStartTs ?? null;

  const windowPhase = useMemo(() => {
    if (!windowOpensAt || !windowClosesAt) return "unknown";
    if (now < windowOpensAt) return "before";
    if (now < windowClosesAt) return "active";
    return "closed";
  }, [now, windowOpensAt, windowClosesAt]);

  const handleResend = async (email: string) => {
    if (!eventId) return;
    setResendingEmail(email);
    const { ok, message: errMsg } = await resendCheckInEmail(eventId, email);
    setResendingEmail(null);
    if (ok) {
      message.success(`Check-in link resent to ${email}`);
    } else {
      message.error(errMsg || "Failed to resend.");
    }
  };

  const allPeople: Array<{ entry: CheckInStatusEntry; checkedIn: boolean }> = status
    ? [
        ...status.checkedIn.map((entry) => ({ entry, checkedIn: true })),
        ...status.pending.map((entry) => ({ entry, checkedIn: false })),
      ]
    : [];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      centered
      className="cism-modal"
      title={null}
    >
      <div className="cism-shell">
        <div className="cism-header">
          <span className="cism-header-icon">
            <RadarChartOutlined />
          </span>
          <div>
            <h3>Pre-Event Check-In</h3>
            <p>{eventName || status?.eventName || "Event"}</p>
          </div>
        </div>

        {/* Overall window status strip */}
        {status?.eventStartTs ? (
          <div className={`cism-window-strip cism-window-${windowPhase}`}>
            {windowPhase === "before" && windowOpensAt ? (
              <>
                <ClockCircleOutlined />
                <span>Check-in opens in <strong>{formatCountdown(windowOpensAt - now)}</strong></span>
              </>
            ) : windowPhase === "active" && windowClosesAt ? (
              <>
                <span className="cism-live-dot" />
                <span>Check-in window is <strong>live</strong> — closes in <strong>{formatCountdown(windowClosesAt - now)}</strong></span>
              </>
            ) : windowPhase === "closed" ? (
              <>
                <ClockCircleOutlined />
                <span>Check-in window has closed</span>
              </>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <div className="cism-loading">Loading…</div>
        ) : !status || allPeople.length === 0 ? (
          <div className="cism-empty">
            <UserOutlined />
            <p>No photographers assigned to this event yet.</p>
          </div>
        ) : (
          <div className="cism-people">
            {allPeople.map(({ entry, checkedIn }) => {
              const dist =
                checkedIn && venueLocation && entry.location
                  ? distanceMeters(venueLocation, entry.location)
                  : null;
              const farFromVenue = dist !== null && dist > 500;

              return (
                <div key={entry.photographerEmail} className={`cism-person ${checkedIn ? "is-in" : "is-pending"}`}>
                  {checkedIn && entry.photo ? (
                    <Image
                      src={entry.photo}
                      alt={entry.photographerName || entry.photographerEmail}
                      className="cism-person-photo"
                      width={52}
                      height={52}
                    />
                  ) : (
                    <div className="cism-person-avatar">
                      <UserOutlined />
                    </div>
                  )}

                  <div className="cism-person-body">
                    <div className="cism-person-name">
                      {entry.photographerName || entry.photographerEmail}
                      {checkedIn ? (
                        <Tag color="success" className="cism-person-tag">
                          <CheckCircleFilled /> Checked in
                        </Tag>
                      ) : (
                        <Tag className="cism-person-tag cism-tag-pending">Pending</Tag>
                      )}
                    </div>

                    {checkedIn ? (
                      <div className="cism-person-meta">
                        {entry.submittedAt ? (
                          <span>
                            <ClockCircleOutlined />{" "}
                            {new Date(entry.submittedAt).toLocaleString([], {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : null}
                        {entry.location ? (
                          <a
                            href={`https://www.google.com/maps?q=${entry.location.lat},${entry.location.lng}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <EnvironmentOutlined /> View location
                          </a>
                        ) : null}
                        {dist !== null ? (
                          <Tooltip title="Distance between the check-in point and the pinned venue">
                            <span className={farFromVenue ? "cism-dist-warn" : "cism-dist-ok"}>
                              {farFromVenue ? "⚠ " : "✓ "}
                              {dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`} from venue
                            </span>
                          </Tooltip>
                        ) : null}
                      </div>
                    ) : (
                      <div className="cism-person-meta">
                        <Button
                          size="small"
                          icon={<SendOutlined />}
                          loading={resendingEmail === entry.photographerEmail}
                          onClick={() => handleResend(entry.photographerEmail)}
                        >
                          {status.checkinEmailSentAt ? "Resend link" : "Send link now"}
                        </Button>
                        {status.checkinEmailSentAt ? (
                          <span className="cism-sent-at">
                            <MailOutlined /> Sent{" "}
                            {new Date(status.checkinEmailSentAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="cism-footer">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}