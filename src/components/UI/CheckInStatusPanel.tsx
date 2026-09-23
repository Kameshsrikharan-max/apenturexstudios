import { useEffect, useState } from "react";
import { Typography, Spin, Empty } from "antd";
import { CheckCircleFilled, ClockCircleOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { fetchCheckInStatusForEvent, EventCheckInStatus } from "../../utils/checkinStatusApi";
import "./CheckInStatusPanel.css";

const { Title, Text } = Typography;

interface Props {
  eventId: string;
}

const googleMapsUrl = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;

export default function CheckInStatusPanel({ eventId }: Props) {
  const [status, setStatus] = useState<EventCheckInStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [eventId]);

  if (loading) {
    return (
      <div className="cisp-panel cisp-loading">
        <Spin size="small" />
      </div>
    );
  }

  if (!status || status.totalPhotographers === 0) {
    return null; // nothing assigned yet — no point showing an empty check-in section
  }

  return (
    <div className="cisp-panel">
      <Title level={4} className="cisp-title">
        Pre-Event Check-In
      </Title>

      {status.checkedIn.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No one has checked in yet"
          className="cisp-empty"
        />
      ) : (
        <div className="cisp-list">
          {status.checkedIn.map((c) => (
            <div key={c.photographerEmail} className="cisp-row">
              {c.photo ? (
                <img src={c.photo} alt={c.photographerName || c.photographerEmail} className="cisp-photo" />
              ) : (
                <div className="cisp-photo cisp-photo-placeholder" />
              )}
              <div className="cisp-row-body">
                <Text strong className="cisp-name">
                  <CheckCircleFilled className="cisp-check-icon" /> {c.photographerName || c.photographerEmail}
                </Text>
                {c.submittedAt ? (
                  <Text type="secondary" className="cisp-time">
                    <ClockCircleOutlined />{" "}
                    {new Date(c.submittedAt).toLocaleString([], {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                ) : null}
                {c.location ? (
                  <a
                    href={googleMapsUrl(c.location.lat, c.location.lng)}
                    target="_blank"
                    rel="noreferrer"
                    className="cisp-location-link"
                  >
                    <EnvironmentOutlined /> View location
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {status.pending.length > 0 ? (
        <div className="cisp-pending">
          <Text type="secondary">
            Still pending: {status.pending.map((p) => p.photographerName || p.photographerEmail).join(", ")}
          </Text>
        </div>
      ) : null}
    </div>
  );
}