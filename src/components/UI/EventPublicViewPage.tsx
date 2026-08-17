import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Typography, Tag } from "antd";
import {CalendarOutlined,ClockCircleOutlined,EnvironmentOutlined,TeamOutlined,UserOutlined,WalletOutlined,QrcodeOutlined,} from "@ant-design/icons";
import { decodeEventFromQr } from "../../utils/eventQrUtils";
import "./EventPublicViewPage.css";

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
  DRAFT: "#cbd5e1",
  PLANNED: "#93c5fd",
  LIVE: "#86efac",
  DONE: "#c4b5fd",
};

const googleMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps?q=${lat},${lng}`;

export default function EventPublicViewPage() {
  const [searchParams] = useSearchParams();
  const encoded = searchParams.get("data");

  const event = useMemo(() => (encoded ? decodeEventFromQr(encoded) : null), [encoded]);

  if (!event) {
    return (
      <main className="epv-page epv-empty">
        <div className="epv-empty-card">
          <QrcodeOutlined />
          <Title level={3}>Invalid or expired QR code</Title>
          <Text>We could not read any event details from this code.</Text>
        </div>
      </main>
    );
  }

  return (
    <main className="epv-page">
      <div className="epv-card">
        {event.image ? (
          <div className="epv-cover">
            <img src={event.image} alt={event.name} />
          </div>
        ) : null}

        <div className="epv-body">
          <Tag
            className="epv-status"
            style={{ "--tag-color": statusColors[event.status] || "#93c5fd" } as React.CSSProperties}
          >
            {event.status}
          </Tag>

          <Title level={2}>{event.name}</Title>
          <Text className="epv-type">{event.type}</Text>

          <div className="epv-grid">
            <div className="epv-tile">
              <CalendarOutlined />
              <small>Date</small>
              <strong>{event.date}</strong>
            </div>
            <div className="epv-tile">
              <ClockCircleOutlined />
              <small>Time</small>
              <strong>{event.time}</strong>
            </div>
            <div className="epv-tile">
              <UserOutlined />
              <small>Customer</small>
              <strong>{event.customer}</strong>
            </div>
            <div className="epv-tile">
              <TeamOutlined />
              <small>Members</small>
              <strong>{event.members}</strong>
            </div>
            <div className="epv-tile">
              <WalletOutlined />
              <small>Budget</small>
              <strong>{event.budget}</strong>
            </div>
            <div className="epv-tile">
              <EnvironmentOutlined />
              <small>City</small>
              <strong>{event.city}</strong>
            </div>
          </div>

          <div className="epv-address">
            <small>Venue Address</small>
            <strong>{event.address}</strong>
          </div>

          {event.location ? (
            <a
              className="epv-map-link"
              href={googleMapsUrl(event.location.lat, event.location.lng)}
              target="_blank"
              rel="noreferrer"
            >
              <EnvironmentOutlined /> Open venue location in Maps
            </a>
          ) : null}
        </div>
      </div>
    </main>
  );
}