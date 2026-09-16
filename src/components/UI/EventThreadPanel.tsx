import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SendOutlined, CloseOutlined, MessageOutlined, LoadingOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  fetchEventMessagesRequest,
  sendEventMessageRequest,
  deleteEventMessageRequest,
} from "../../redux/actions/messageActions";
import { Message } from "../../redux/types/messageTypes";
import "./EventThreadPanel.css";

const POLL_INTERVAL_MS = 12000;

type EventThreadPanelProps = {
  event: any | null;
  onClose: () => void;
  user?: any;
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "#fac775",
  studio_admin: "#fac775",
  studio_manager: "#38d5ff",
  freelance_photographer: "#4ade80",
  studio_photographer: "#4ade80",
};

const roleLabel = (role: string) =>
  role
    ? role
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "";

const initials = (name: string) =>
  name
    ?.split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

export default function EventThreadPanel({ event, onClose, user }: EventThreadPanelProps) {
  const dispatch = useDispatch();
  const eventId = event?.id;

  const { messagesByEvent, fetchLoading, sending, actionLoadingMessageId } = useSelector(
    (state: any) => state.message
  );

  const messages: Message[] = eventId ? messagesByEvent?.[eventId] || [] : [];

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!eventId) return;

    dispatch(fetchEventMessagesRequest(eventId));
    const interval = setInterval(() => {
      dispatch(fetchEventMessagesRequest(eventId));
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [eventId, dispatch]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  if (!event) return null;

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !eventId) return;
    dispatch(sendEventMessageRequest(eventId, text));
    setDraft("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = (messageId: string) => {
    if (!eventId) return;
    dispatch(deleteEventMessageRequest(eventId, messageId));
  };

  return (
    <div className="etp-overlay" onClick={onClose}>
      <div className="etp-panel" onClick={(e) => e.stopPropagation()}>
        <header className="etp-header">
          <div className="etp-header-title">
            <span className="etp-header-icon">
              <MessageOutlined />
            </span>
            <div>
              <h3>Event Thread</h3>
              <p>{event.name || event.eventName}</p>
            </div>
          </div>
          <button className="etp-close" type="button" onClick={onClose}>
            <CloseOutlined />
          </button>
        </header>

        <div className="etp-messages" ref={scrollRef}>
          {fetchLoading && messages.length === 0 ? (
            <div className="etp-empty">
              <LoadingOutlined spin /> Loading conversation…
            </div>
          ) : messages.length === 0 ? (
            <div className="etp-empty">
              No messages yet. Start the conversation about this event.
            </div>
          ) : (
            messages.map((m) => {
              const isOwn = user?.email && m.senderEmail === user.email;
              const color = ROLE_COLORS[m.senderRole] || "#38d5ff";

              return (
                <div key={m._id} className={`etp-msg ${isOwn ? "own" : ""}`}>
                  <span
                    className="etp-avatar"
                    style={{ borderColor: `${color}55`, color }}
                  >
                    {initials(m.senderName)}
                  </span>
                  <div className="etp-bubble" style={{ "--accent": color } as React.CSSProperties}>
                    <div className="etp-bubble-head">
                      <strong>{m.senderName}</strong>
                      <span className="etp-role-chip" style={{ color, borderColor: `${color}55` }}>
                        {roleLabel(m.senderRole)}
                      </span>
                    </div>
                    <p>{m.text}</p>
                    <div className="etp-bubble-meta">
                      <span>{dayjs(m.createdAt).format("DD MMM, h:mm A")}</span>
                      {m.edited ? <span> · edited</span> : null}
                      {isOwn ? (
                        <button
                          className="etp-delete"
                          type="button"
                          disabled={actionLoadingMessageId === m._id}
                          onClick={() => handleDelete(m._id)}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer className="etp-composer">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message the team about this event…"
            rows={1}
          />
          <button
            className="etp-send"
            type="button"
            disabled={!draft.trim() || sending}
            onClick={handleSend}
          >
            {sending ? <LoadingOutlined spin /> : <SendOutlined />}
          </button>
        </footer>
      </div>
    </div>
  );
}