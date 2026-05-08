import React, { useEffect, useMemo, useState } from "react";
import { Modal, Input, Select, Button, Empty, Segmented } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
  AimOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "./CalendarModal.css";

const { Option } = Select;

const COLORS = [
  { value: "blue", label: "Ocean Blue" },
  { value: "green", label: "Mint Green" },
  { value: "red", label: "Coral Red" },
  { value: "violet", label: "Neon Violet" },
  { value: "gold", label: "Solar Gold" },
];

const getSavedEvents = () => {
  try {
    const saved = localStorage.getItem("calendarEvents");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const CalendarModal = ({ open, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [events, setEvents] = useState(getSavedEvents);
  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));

  const [eventListOpen, setEventListOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [viewMode, setViewMode] = useState("day");
  const [selectedWeek, setSelectedWeek] = useState(1);

  const [title, setTitle] = useState("");
  const [color, setColor] = useState("blue");

  const [editingIndex, setEditingIndex] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editColor, setEditColor] = useState("blue");

  useEffect(() => {
    localStorage.setItem("calendarEvents", JSON.stringify(events));
  }, [events]);

  const today = dayjs().format("YYYY-MM-DD");
  const monthKey = currentMonth.format("YYYY-MM");

  const dates = useMemo(() => {
    const list = [];
    const startDay = currentMonth.startOf("month").day();
    const daysInMonth = currentMonth.daysInMonth();

    for (let i = 0; i < startDay; i++) list.push(null);
    for (let i = 1; i <= daysInMonth; i++) list.push(i);

    return list;
  }, [currentMonth]);

  const weeks = useMemo(() => {
    const daysInMonth = currentMonth.daysInMonth();
    const totalWeeks = Math.ceil(daysInMonth / 7);

    return Array.from({ length: totalWeeks }, (_, index) => {
      const start = index * 7 + 1;
      const end = Math.min(start + 6, daysInMonth);

      return {
        value: index + 1,
        label: `Week ${index + 1}`,
        start,
        end,
      };
    });
  }, [currentMonth]);

  useEffect(() => {
    setSelectedWeek(1);
  }, [monthKey]);

  const selectedEvents = selectedDate ? events[selectedDate] || [] : [];
  const selectedWeekInfo = weeks.find((week) => week.value === selectedWeek);

  const selectedWeekEvents = useMemo(() => {
    if (!selectedWeekInfo) return [];

    const result = [];

    for (let day = selectedWeekInfo.start; day <= selectedWeekInfo.end; day++) {
      const fullDate = `${monthKey}-${String(day).padStart(2, "0")}`;
      const dayEvents = events[fullDate] || [];

      dayEvents.forEach((event) => {
        result.push({
          ...event,
          date: fullDate,
        });
      });
    }

    return result;
  }, [events, monthKey, selectedWeekInfo]);

  const selectedMonthEvents = useMemo(() => {
    const result = [];

    Object.keys(events)
      .filter((date) => date.startsWith(monthKey))
      .sort()
      .forEach((date) => {
        events[date].forEach((event) => {
          result.push({
            ...event,
            date,
          });
        });
      });

    return result;
  }, [events, monthKey]);

  const getFullDate = (date) => {
    return `${monthKey}-${String(date).padStart(2, "0")}`;
  };

  const openEventList = (date) => {
    if (!date) return;

    setSelectedDate(getFullDate(date));
    setEditingIndex(null);
    setEventListOpen(true);
  };

  const openCreateEvent = (date) => {
    if (!date) return;

    setSelectedDate(getFullDate(date));
    setTitle("");
    setColor("blue");
    setCreateOpen(true);
  };

  const openDetailsModal = () => {
    if (viewMode === "day" && !selectedDate) {
      setSelectedDate(today);
    }

    setDetailsOpen(true);
  };

  const createEvent = () => {
    if (!selectedDate || !title.trim()) return;

    setEvents((prev) => ({
      ...prev,
      [selectedDate]: [
        ...(prev[selectedDate] || []),
        {
          title: title.trim(),
          color,
        },
      ],
    }));

    setTitle("");
    setColor("blue");
    setCreateOpen(false);
  };

  const deleteEvent = (index) => {
    if (!selectedDate) return;

    setEvents((prev) => {
      const updated = [...(prev[selectedDate] || [])];
      updated.splice(index, 1);

      const next = { ...prev };

      if (updated.length === 0) {
        delete next[selectedDate];
      } else {
        next[selectedDate] = updated;
      }

      return next;
    });

    setEditingIndex(null);
  };

  const startEdit = (event, index) => {
    setEditingIndex(index);
    setEditTitle(event.title);
    setEditColor(event.color);
  };

  const saveEdit = (index) => {
    if (!selectedDate || !editTitle.trim()) return;

    setEvents((prev) => {
      const updated = [...(prev[selectedDate] || [])];

      updated[index] = {
        title: editTitle.trim(),
        color: editColor,
      };

      return {
        ...prev,
        [selectedDate]: updated,
      };
    });

    setEditingIndex(null);
    setEditTitle("");
    setEditColor("blue");
  };

  const openCreateFromList = () => {
    setTitle("");
    setColor("blue");
    setCreateOpen(true);
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width="100vw"
        style={{ top: 0, paddingBottom: 0 }}
        className="calendar-modal"
      >
        <div className="calendar-root">
          <aside className="sidebar">
            <div className="sidebar-heading">
              <span>
                <CalendarOutlined /> AXS Calendar
              </span>

              <h2>{currentMonth.format("MMMM YYYY")}</h2>
            </div>

            <div className="event-list">
              <h4>Events</h4>

              {Object.keys(events).length === 0 && (
                <p className="empty-text">No events created</p>
              )}

              {Object.keys(events)
                .sort()
                .map((date) => (
                  <div key={date} className="event-group">
                    <strong>{dayjs(date).format("MMM D, YYYY")}</strong>

                    {events[date].map((event, index) => (
                      <div key={index} className={`event-item ${event.color}`}>
                        <span className="event-dot" />
                        <span>{event.title}</span>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </aside>

          <main className="main">
            <div className="header">
              <div className="header-actions">
                <Button
                  icon={<LeftOutlined />}
                  onClick={() =>
                    setCurrentMonth((prev) => prev.subtract(1, "month"))
                  }
                />

                <Button
                  icon={<AimOutlined />}
                  onClick={() => {
                    const now = dayjs();
                    setCurrentMonth(now);
                    setSelectedDate(now.format("YYYY-MM-DD"));
                  }}
                >
                  Today
                </Button>

                <Button
                  icon={<RightOutlined />}
                  onClick={() => setCurrentMonth((prev) => prev.add(1, "month"))}
                />

                <Segmented
                  value={viewMode}
                  onChange={setViewMode}
                  options={[
                    { label: "Day", value: "day" },
                    { label: "Week", value: "week" },
                    { label: "Month", value: "month" },
                  ]}
                  className="mode-switch"
                />

                {viewMode === "week" && (
                  <Select
                    value={selectedWeek}
                    onChange={setSelectedWeek}
                    className="week-select"
                  >
                    {weeks.map((week) => (
                      <Option key={week.value} value={week.value}>
                        {week.label}
                      </Option>
                    ))}
                  </Select>
                )}

                <Button icon={<EyeOutlined />} onClick={openDetailsModal} />
              </div>

              <div className="month-title">
                <span>{currentMonth.format("YYYY")}</span>
                <h2>{currentMonth.format("MMMM")}</h2>
              </div>
            </div>

            <div className="grid">
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                <div key={day} className="day-header">
                  {day}
                </div>
              ))}

              {dates.map((date, index) => {
                const fullDate = date ? getFullDate(date) : null;
                const dayEvents = fullDate ? events[fullDate] || [] : [];
                const visibleEvents = dayEvents.slice(0, 3);
                const hiddenCount = dayEvents.length - visibleEvents.length;

                return (
                  <div
                    key={index}
                    className={`cell ${!date ? "empty" : ""} ${
                      fullDate === today ? "today" : ""
                    } ${fullDate === selectedDate ? "selected-cell" : ""}`}
                    onClick={() => openEventList(date)}
                    style={{ animationDelay: `${index * 16}ms` }}
                  >
                    {date && (
                      <div className="date-row">
                        <button
                          type="button"
                          className="date"
                          onClick={(event) => {
                            event.stopPropagation();
                            openCreateEvent(date);
                          }}
                        >
                          {date}
                        </button>

                        {dayEvents.length > 0 && (
                          <span className="event-count">{dayEvents.length}</span>
                        )}
                      </div>
                    )}

                    <div className="cell-events-scroll">
                      {visibleEvents.map((event, eventIndex) => (
                        <div key={eventIndex} className={`event ${event.color}`}>
                          <span className="event-dot" />
                          <span>{event.title}</span>
                        </div>
                      ))}

                      {hiddenCount > 0 && (
                        <div className="more-events">+{hiddenCount} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </main>
        </div>
      </Modal>

      <Modal
        open={eventListOpen}
        onCancel={() => setEventListOpen(false)}
        footer={null}
        className="event-list-modal creative-modal"
        title={null}
      >
        <h3 className="modal-heading black-heading">
          <CalendarOutlined /> Event List
        </h3>

        <p className="modal-date-text">
          {selectedDate ? dayjs(selectedDate).format("dddd, MMMM D, YYYY") : ""}
        </p>

        <div className="modal-toolbar">
          <span>
            {selectedEvents.length} event
            {selectedEvents.length === 1 ? "" : "s"}
          </span>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="create-button"
            onClick={openCreateFromList}
          >
            Create Event
          </Button>
        </div>

        {selectedEvents.length === 0 && (
          <div className="day-empty">
            <Empty description="No events for this date" />
          </div>
        )}

        <div className="day-event-list">
          {selectedEvents.map((event, index) => {
            const isEditing = editingIndex === index;

            return (
              <div key={index} className={`day-event-card ${event.color}`}>
                {isEditing ? (
                  <div className="edit-form">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onPressEnter={() => saveEdit(index)}
                    />

                    <Select value={editColor} onChange={setEditColor}>
                      {COLORS.map((item) => (
                        <Option key={item.value} value={item.value}>
                          {item.label}
                        </Option>
                      ))}
                    </Select>
                  </div>
                ) : (
                  <div className="day-event-content">
                    <span className="event-dot" />
                    <span>{event.title}</span>
                  </div>
                )}

                <div className="day-event-actions">
                  {isEditing ? (
                    <Button
                      size="small"
                      type="primary"
                      icon={<SaveOutlined />}
                      className="save-button"
                      onClick={() => saveEdit(index)}
                    >
                      Save
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      className="edit-button"
                      onClick={() => startEdit(event, index)}
                    >
                      Edit
                    </Button>
                  )}

                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    className="delete-button"
                    onClick={() => deleteEvent(index)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      <Modal
        open={detailsOpen}
        onCancel={() => setDetailsOpen(false)}
        footer={null}
        className="creative-modal details-modal"
        title={null}
      >
        <h3 className="modal-heading black-heading">
          <EyeOutlined />{" "}
          {viewMode === "day"
            ? "Day Details"
            : viewMode === "week"
              ? "Week Details"
              : "Month Details"}
        </h3>

        {viewMode === "day" && (
          <>
            <p className="modal-date-text">
              {selectedDate
                ? dayjs(selectedDate).format("dddd, MMMM D, YYYY")
                : ""}
            </p>

            <div className="details-count">
              {selectedEvents.length} event
              {selectedEvents.length === 1 ? "" : "s"} on this day
            </div>

            {selectedEvents.length === 0 ? (
              <div className="day-empty">
                <Empty description="No events for this day" />
              </div>
            ) : (
              <div className="details-scroll">
                {selectedEvents.map((event, index) => (
                  <div key={index} className={`detail-row ${event.color}`}>
                    <span className="event-dot" />
                    <div>
                      <strong>{event.title}</strong>
                      <small>{dayjs(selectedDate).format("MMM D, YYYY")}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {viewMode === "week" && (
          <>
            <p className="modal-date-text">
              {selectedWeekInfo
                ? `${currentMonth.format("MMMM")} ${selectedWeekInfo.start} - ${
                    selectedWeekInfo.end
                  }, ${currentMonth.format("YYYY")}`
                : ""}
            </p>

            <div className="details-count">
              {selectedWeekEvents.length} event
              {selectedWeekEvents.length === 1 ? "" : "s"} in Week{" "}
              {selectedWeek}
            </div>

            {selectedWeekEvents.length === 0 ? (
              <div className="day-empty">
                <Empty description="No events for this week" />
              </div>
            ) : (
              <div className="details-scroll">
                {selectedWeekEvents.map((event, index) => (
                  <div key={index} className={`detail-row ${event.color}`}>
                    <span className="event-dot" />
                    <div>
                      <strong>{event.title}</strong>
                      <small>{dayjs(event.date).format("dddd, MMM D")}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {viewMode === "month" && (
          <>
            <p className="modal-date-text">{currentMonth.format("MMMM YYYY")}</p>

            <div className="details-count">
              {selectedMonthEvents.length} event
              {selectedMonthEvents.length === 1 ? "" : "s"} in this month
            </div>

            {selectedMonthEvents.length === 0 ? (
              <div className="day-empty">
                <Empty description="No events for this month" />
              </div>
            ) : (
              <div className="details-scroll">
                {selectedMonthEvents.map((event, index) => (
                  <div key={index} className={`detail-row ${event.color}`}>
                    <span className="event-dot" />
                    <div>
                      <strong>{event.title}</strong>
                      <small>{dayjs(event.date).format("dddd, MMM D")}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={createEvent}
        okText="Create Event"
        className="create-event-modal creative-modal"
        title={null}
      >
        <h3 className="modal-heading black-heading">
          <PlusOutlined /> Create Event
        </h3>

        <div className="create-form">
          <div className="create-date-pill">
            <CalendarOutlined />
            {selectedDate ? dayjs(selectedDate).format("MMMM D, YYYY") : ""}
          </div>

          <label>Event Title</label>
          <Input
            placeholder="Enter event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onPressEnter={createEvent}
          />

          <label>Event Color</label>
          <Select value={color} onChange={setColor}>
            {COLORS.map((item) => (
              <Option key={item.value} value={item.value}>
                {item.label}
              </Option>
            ))}
          </Select>
        </div>
      </Modal>
    </>
  );
};

export default CalendarModal;
