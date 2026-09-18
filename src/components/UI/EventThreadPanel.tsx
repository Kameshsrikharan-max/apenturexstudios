import { Fragment, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  SendOutlined,
  CloseOutlined,
  MessageOutlined,
  LoadingOutlined,
  SearchOutlined,
  PaperClipOutlined,
  SmileOutlined,
  RollbackOutlined,
  CopyOutlined,
  DeleteOutlined,
  ArrowDownOutlined,
  CheckOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  fetchEventMessagesRequest,
  sendEventMessageRequest,
  deleteEventMessageRequest,
} from "../../redux/actions/messageActions";
import { Message } from "../../redux/types/messageTypes";
import "./EventThreadPanel.css";

const POLL_INTERVAL_MS = 12000;
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const COMPOSER_EMOJIS = ["😀", "😂", "😍", "👍", "🙏", "🎉", "🔥", "👀", "✅", "❌", "📸", "💡"];

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

// --- content encoding helpers -------------------------------------------------
// Reply / image payloads are packed into the plain-text message so no backend
// schema change is required. Swap for real structured fields when available.
const REPLY_RE = /^⟪reply:([^⟫]*)⟫([^\n]*)\n([\s\S]*)$/;
const IMG_RE = /^⟪img⟫([^⟫]*)⟫([\s\S]*)$/;

function parseMessageContent(raw: string) {
  let text = raw ?? "";
  let replyQuote: { id: string; label: string } | null = null;
  const replyMatch = text.match(REPLY_RE);
  if (replyMatch) {
    replyQuote = { id: replyMatch[1], label: replyMatch[2] };
    text = replyMatch[3];
  }
  let image: string | null = null;
  const imgMatch = text.match(IMG_RE);
  if (imgMatch) {
    image = imgMatch[1];
    text = imgMatch[2];
  }
  return { replyQuote, image, body: text };
}

function formatDaySeparator(date: dayjs.Dayjs) {
  const today = dayjs();
  if (date.isSame(today, "day")) return "Today";
  if (date.isSame(today.subtract(1, "day"), "day")) return "Yesterday";
  if (date.isSame(today, "year")) return date.format("D MMMM");
  return date.format("D MMMM YYYY");
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function MessageTicks({ message }: { message: Message }) {
  const status =
    (message as any).status || ((message as any).readBy?.length ? "read" : "sent");
  if (status === "read")
    return <CheckCircleFilled style={{ color: "#38d5ff", fontSize: 12 }} />;
  if (status === "delivered")
    return (
      <span className="etp-ticks-double">
        <CheckOutlined />
        <CheckOutlined />
      </span>
    );
  return <CheckOutlined style={{ fontSize: 11 }} />;
}

// --- local reaction store ------------------------------------------------------
type ReactionMap = Record<string, Record<string, string[]>>; // messageId -> emoji -> [emails]

function loadReactions(eventId: string): ReactionMap {
  try {
    const raw = localStorage.getItem(`etp_reactions_${eventId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveReactions(eventId: string, data: ReactionMap) {
  try {
    localStorage.setItem(`etp_reactions_${eventId}`, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

export default function EventThreadPanel({ event, onClose, user }: EventThreadPanelProps) {
  const dispatch = useDispatch();
  const eventId = event?.id;

  const { messagesByEvent, fetchLoading, sending, actionLoadingMessageId } = useSelector(
    (state: any) => state.message
  );

  const messages: Message[] = eventId ? messagesByEvent?.[eventId] || [] : [];

  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [reactions, setReactions] = useState<ReactionMap>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [newCount, setNewCount] = useState(0);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const prevLenRef = useRef(messages.length);
  const lastSeenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    dispatch(fetchEventMessagesRequest(eventId));
    const interval = setInterval(() => {
      dispatch(fetchEventMessagesRequest(eventId));
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [eventId, dispatch]);

  useEffect(() => {
    if (!eventId) return;
    setReactions(loadReactions(eventId));
    const key = `etp_last_seen_${eventId}`;
    lastSeenRef.current = localStorage.getItem(key);
    return () => {
      localStorage.setItem(key, new Date().toISOString());
    };
  }, [eventId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (atBottom) {
      el.scrollTop = el.scrollHeight;
    } else if (messages.length > prevLenRef.current) {
      setNewCount((c) => c + (messages.length - prevLenRef.current));
    }
    prevLenRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [draft]);

  if (!event) return null;

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setShowScrollBtn(!atBottom);
    if (atBottom) setNewCount(0);
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setNewCount(0);
  };

  const handleSend = () => {
    let text = draft.trim();
    if (!text && !attachment) return;
    if (!eventId) return;

    if (attachment) {
      text = `⟪img⟫${attachment}⟫${text}`;
    }
    if (replyTo) {
      const label = `${replyTo.senderName}: ${parseMessageContent(replyTo.text).body.slice(0, 60)}`;
      text = `⟪reply:${(replyTo as any)._id}⟫${label}\n${text}`;
    }

    dispatch(sendEventMessageRequest(eventId, text));
    setDraft("");
    setAttachment(null);
    setReplyTo(null);
    setEmojiPickerOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape" && replyTo) setReplyTo(null);
  };

  const handleDelete = (messageId: string) => {
    if (!eventId) return;
    dispatch(deleteEventMessageRequest(eventId, messageId));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setAttachment(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCopy = (raw: string) => {
    navigator.clipboard?.writeText(parseMessageContent(raw).body);
  };

  const toggleReaction = (messageId: string, emoji: string) => {
    if (!eventId || !user?.email) return;
    setReactions((prev) => {
      const msgReactions = { ...(prev[messageId] || {}) };
      const users = new Set(msgReactions[emoji] || []);
      if (users.has(user.email)) users.delete(user.email);
      else users.add(user.email);
      if (users.size === 0) delete msgReactions[emoji];
      else msgReactions[emoji] = Array.from(users);
      const next = { ...prev, [messageId]: msgReactions };
      saveReactions(eventId, next);
      return next;
    });
    setReactionPickerFor(null);
  };

  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) =>
        parseMessageContent(m.text).body.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  let lastDay: string | null = null;
  let unreadDividerShown = false;

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
          <div className="etp-header-actions">
            <button
              className="etp-icon-btn"
              type="button"
              title="Search"
              onClick={() => setSearchOpen((v) => !v)}
            >
              <SearchOutlined />
            </button>
            <button className="etp-close" type="button" onClick={onClose}>
              <CloseOutlined />
            </button>
          </div>
        </header>

        {searchOpen && (
          <div className="etp-search-bar">
            <SearchOutlined />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in conversation…"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}>
                <CloseOutlined />
              </button>
            )}
          </div>
        )}

        <div className="etp-messages-area">
          <div className="etp-messages" ref={scrollRef} onScroll={handleScroll}>
            {fetchLoading && messages.length === 0 ? (
              <div className="etp-empty">
                <LoadingOutlined spin /> Loading conversation…
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="etp-empty">
                {searchQuery ? "No matching messages." : "No messages yet. Start the conversation about this event."}
              </div>
            ) : (
              filteredMessages.map((m) => {
                const isOwn = user?.email && m.senderEmail === user.email;
                const color = ROLE_COLORS[m.senderRole] || "#38d5ff";
                const { replyQuote, image, body } = parseMessageContent(m.text);
                const msgId = (m as any)._id;

                const day = dayjs(m.createdAt).format("YYYY-MM-DD");
                const showDaySeparator = day !== lastDay;
                lastDay = day;

                const isUnreadStart =
                  !!lastSeenRef.current &&
                  !unreadDividerShown &&
                  !isOwn &&
                  dayjs(m.createdAt).isAfter(dayjs(lastSeenRef.current));
                if (isUnreadStart) unreadDividerShown = true;

                const msgReactions = reactions[msgId] || {};

                return (
                  <Fragment key={msgId}>
                    {showDaySeparator && (
                      <div className="etp-day-separator">
                        <span>{formatDaySeparator(dayjs(m.createdAt))}</span>
                      </div>
                    )}
                    {isUnreadStart && (
                      <div className="etp-unread-divider">
                        <span>Unread messages</span>
                      </div>
                    )}

                    <div className={`etp-msg ${isOwn ? "own" : ""}`}>
                      <span className="etp-avatar" style={{ borderColor: `${color}55`, color }}>
                        {initials(m.senderName)}
                      </span>

                      <div className="etp-bubble-col">
                        <div
                          className="etp-bubble"
                          style={{ "--accent": color } as React.CSSProperties}
                        >
                          <div className="etp-bubble-head">
                            <strong>{m.senderName}</strong>
                            <span
                              className="etp-role-chip"
                              style={{ color, borderColor: `${color}55` }}
                            >
                              {roleLabel(m.senderRole)}
                            </span>
                          </div>

                          {replyQuote && (
                            <div className="etp-quote">
                              <span className="etp-quote-bar" />
                              <span className="etp-quote-text">{replyQuote.label}</span>
                            </div>
                          )}

                          {image && (
                            <img
                              src={image}
                              alt="attachment"
                              className="etp-msg-image"
                              onClick={() => window.open(image, "_blank")}
                            />
                          )}

                          {body && <p>{highlightMatch(body, searchQuery)}</p>}

                          <div className="etp-bubble-meta">
                            <span>{dayjs(m.createdAt).format("DD MMM, h:mm A")}</span>
                            {(m as any).edited ? <span> · edited</span> : null}
                            {isOwn && <MessageTicks message={m} />}
                          </div>

                          <div className="etp-msg-actions">
                            <button
                              title="React"
                              onClick={() =>
                                setReactionPickerFor(reactionPickerFor === msgId ? null : msgId)
                              }
                            >
                              <SmileOutlined />
                            </button>
                            <button title="Reply" onClick={() => setReplyTo(m)}>
                              <RollbackOutlined />
                            </button>
                            <button title="Copy" onClick={() => handleCopy(m.text)}>
                              <CopyOutlined />
                            </button>
                            {isOwn && (
                              <button
                                title="Delete"
                                disabled={actionLoadingMessageId === msgId}
                                onClick={() => handleDelete(msgId)}
                              >
                                <DeleteOutlined />
                              </button>
                            )}
                          </div>

                          {reactionPickerFor === msgId && (
                            <div className="etp-reaction-picker">
                              {REACTION_EMOJIS.map((e) => (
                                <button key={e} onClick={() => toggleReaction(msgId, e)}>
                                  {e}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {Object.keys(msgReactions).length > 0 && (
                          <div className={`etp-reactions ${isOwn ? "own" : ""}`}>
                            {Object.entries(msgReactions).map(([emoji, users]) => (
                              <button
                                key={emoji}
                                className={`etp-reaction-chip ${
                                  users.includes(user?.email) ? "active" : ""
                                }`}
                                onClick={() => toggleReaction(msgId, emoji)}
                              >
                                {emoji} {users.length > 1 ? users.length : ""}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Fragment>
                );
              })
            )}
          </div>

          {showScrollBtn && (
            <button className="etp-scroll-bottom" onClick={scrollToBottom} type="button">
              <ArrowDownOutlined />
              {newCount > 0 && <span className="etp-scroll-badge">{newCount}</span>}
            </button>
          )}
        </div>

        <footer className="etp-composer-wrap">
          {replyTo && (
            <div className="etp-reply-banner">
              <div>
                <span className="etp-reply-banner-label">Replying to {replyTo.senderName}</span>
                <p>{parseMessageContent(replyTo.text).body.slice(0, 80)}</p>
              </div>
              <button onClick={() => setReplyTo(null)}>
                <CloseOutlined />
              </button>
            </div>
          )}

          {attachment && (
            <div className="etp-attach-preview">
              <img src={attachment} alt="preview" />
              <button onClick={() => setAttachment(null)}>
                <CloseCircleFilled />
              </button>
            </div>
          )}

          <div className="etp-composer">
            <button
              className="etp-icon-btn"
              type="button"
              title="Attach image"
              onClick={() => fileInputRef.current?.click()}
            >
              <PaperClipOutlined />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileChange}
            />

            <div className="etp-textarea-wrap">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message the team about this event…"
                rows={1}
                maxLength={2000}
              />
              <button
                className="etp-icon-btn emoji"
                type="button"
                onClick={() => setEmojiPickerOpen((v) => !v)}
              >
                <SmileOutlined />
              </button>
              {emojiPickerOpen && (
                <div className="etp-emoji-popover">
                  {COMPOSER_EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => {
                        setDraft((d) => d + e);
                        setEmojiPickerOpen(false);
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className="etp-send"
              type="button"
              disabled={(!draft.trim() && !attachment) || sending}
              onClick={handleSend}
            >
              {sending ? <LoadingOutlined spin /> : <SendOutlined />}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}