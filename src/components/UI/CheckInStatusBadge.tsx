import { CheckCircleFilled } from "@ant-design/icons";
import { Tooltip } from "antd";
import type { EventCheckInStatus } from "../../utils/checkinStatusApi";
import "./CheckInStatusBadge.css";

interface Props {
  status?: EventCheckInStatus;
  /** Only the "awaiting" state animates, and only when this is true — a
   *  pending check-in for an event three weeks out isn't urgent, so it
   *  shouldn't visually compete with one happening today. */
  isToday?: boolean;
}

const RING_SIZE = 15;
const RING_STROKE = 2;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({ fraction, spin }: { fraction: number; spin?: boolean }) {
  const clamped = Math.max(0, Math.min(1, fraction));
  const offset = RING_CIRCUMFERENCE * (1 - clamped);
  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      className={`cis-ring ${spin ? "cis-ring-complete" : ""}`}
    >
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        className="cis-ring-track"
        strokeWidth={RING_STROKE}
        fill="none"
      />
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        className="cis-ring-progress"
        strokeWidth={RING_STROKE}
        fill="none"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
      />
    </svg>
  );
}

/**
 * Renders nothing if the event has no assigned photographers (nothing to
 * report) or status hasn't loaded yet — caller doesn't need to guard for that.
 */
export default function CheckInStatusBadge({ status, isToday }: Props) {
  if (!status || status.totalPhotographers === 0) return null;

  const checkedInCount = status.checkedIn.length;
  const total = status.totalPhotographers;
  const allIn = checkedInCount === total;
  const fraction = total ? checkedInCount / total : 0;

  if (checkedInCount === 0) {
    return (
      <span className={`cis-pill ${isToday ? "cis-pill-live" : "cis-pill-idle"}`}>
        {isToday ? (
          <span className="cis-radar">
            <span className="cis-radar-ping" />
            <span className="cis-radar-ping cis-radar-ping-delay" />
            <span className="cis-radar-dot" />
          </span>
        ) : (
          <span className="cis-idle-dot" />
        )}
        {isToday ? "Live · Awaiting" : "Awaiting"}
      </span>
    );
  }

  const tooltipText = status.checkedIn
    .map(
      (c) =>
        `${c.photographerName || c.photographerEmail}${
          c.submittedAt
            ? ` · ${new Date(c.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : ""
        }`
    )
    .join("\n");

  return (
    <Tooltip title={<div style={{ whiteSpace: "pre-line" }}>{tooltipText}</div>}>
      <span className={`cis-pill ${allIn ? "cis-pill-complete" : "cis-pill-partial"}`}>
        <ProgressRing fraction={fraction} spin={allIn} />
        {allIn ? <CheckCircleFilled className="cis-check-icon" /> : null}
        {checkedInCount}/{total}
      </span>
    </Tooltip>
  );
}