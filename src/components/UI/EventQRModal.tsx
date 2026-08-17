import { useRef } from "react";
import { Modal, Button, Typography, Tag, message, Space } from "antd";
import { QRCodeCanvas } from "qrcode.react";
import {DownloadOutlined,CopyOutlined,EnvironmentOutlined,CalendarOutlined,ClockCircleOutlined,} from "@ant-design/icons";
import { buildEventQrUrl } from "../../utils/eventQrUtils";
import "./EventQRModal.css";

const { Title, Text } = Typography;

interface EventQRModalProps {
  event: any | null;
  onClose: () => void;
}

export default function EventQRModal({ event, onClose }: EventQRModalProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  if (!event) return null;

  const qrUrl = buildEventQrUrl(event);

  const handleDownload = () => {
    const canvas = wrapperRef.current?.querySelector("canvas");
    if (!canvas) return;

    const pngUrl = (canvas as HTMLCanvasElement)
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");

    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = `${event.name.replace(/\s+/g, "_")}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success("QR code downloaded");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      message.success("Event link copied to clipboard");
    } catch {
      message.error("Clipboard permission is not available");
    }
  };

  return (
    <Modal
      open={!!event}
      onCancel={onClose}
      footer={null}
      width={420}
      centered
      className="event-modal event-qr-modal"
    >
      <div className="event-qr-shell">
        <div className="event-qr-heading">
          <Title level={4}>Scan for Event Details</Title>
          <Text>Anyone who scans this code sees the full event card instantly.</Text>
        </div>

        <div className="event-qr-canvas-wrap" ref={wrapperRef}>
          <QRCodeCanvas
            value={qrUrl}
            size={240}
            bgColor="#ffffff"
            fgColor="#0f172a"
            level="M"
            includeMargin
          />
        </div>

        <div className="event-qr-summary">
          <strong>{event.name}</strong>
          <Tag className="event-qr-tag">{event.status}</Tag>
          <p>
            <CalendarOutlined /> {event.date} &nbsp;<ClockCircleOutlined /> {event.time}
          </p>
          <p>
            <EnvironmentOutlined /> {event.address}, {event.city}
          </p>
        </div>

        <Space className="event-qr-actions" size={10}>
          <Button icon={<DownloadOutlined />} onClick={handleDownload}>
            Download PNG
          </Button>
          <Button type="primary" icon={<CopyOutlined />} onClick={handleCopyLink}>
            Copy Link
          </Button>
        </Space>
      </div>
    </Modal>
  );
}