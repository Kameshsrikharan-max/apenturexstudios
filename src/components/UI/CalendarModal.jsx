import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Input,
  Select,
  Button,
  Empty,
  Spin,
  Segmented,
} from "antd";

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

const API_KEY = "WJTWQRzs553ZRynmQvY6P2WSSXCVDub5";

const COLORS = [
  { value: "blue", label: "Ocean Blue" },
  { value: "green", label: "Mint Green" },
  { value: "red", label: "Coral Red" },
  { value: "violet", label: "Festival Violet" },
  { value: "gold", label: "National Gold" },
];

const TAMIL_HOLIDAY_KEYWORDS = [
  "pongal",
  "thai pongal",
  "mattu pongal",
  "kanum pongal",
  "tamil new year",
  "puthandu",
  "thiruvalluvar",
  "thaipusam",
  "deepavali",
  "diwali",
  "ayudha pooja",
  "vijaya dashami",
  "maha shivaratri",
  "vinayaka chaturthi",
];

const getSavedEvents = () => {
  try {
    const saved = localStorage.getItem("calendarEvents");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const splitEvents = (list) => ({
  created: list.filter((event) => !event.isHoliday),
  other: list.filter((event) => event.isHoliday),
});

const CalendarModal = ({ open, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [userEvents, setUserEvents] = useState(getSavedEvents);
  const [holidayEvents, setHolidayEvents] = useState({});
  const [loading, setLoading] = useState(false);

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

  const currentYear = currentMonth.format("YYYY");
  const today = dayjs().format("YYYY-MM-DD");
  const monthKey = currentMonth.format("YYYY-MM");

  useEffect(() => {
    localStorage.setItem("calendarEvents", JSON.stringify(userEvents));
  }, [userEvents]);

  useEffect(() => {
    let mounted = true;

    const fetchIndianEvents = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `https://calendarific.com/api/v2/holidays?api_key=${API_KEY}&country=IN&year=${currentYear}`
        );

        const json = await response.json();
        const holidays = json?.response?.holidays || [];
        const holidayMap = {};

        holidays.forEach((holiday) => {
          const date = holiday.date.iso;

          if (!holidayMap[date]) holidayMap[date] = [];

          const types = holiday.type || [];
          const name = holiday.name?.toLowerCase() || "";
          const description = holiday.description?.toLowerCase() || "";

          const isNational =
            types.includes("National holiday") || types.includes("national");

          const isTamilHoliday = TAMIL_HOLIDAY_KEYWORDS.some(
            (keyword) =>
              name.includes(keyword) || description.includes(keyword)
          );

          holidayMap[date].push({
            title: holiday.name,
            color: isTamilHoliday ? "violet" : isNational ? "gold" : "blue",
            isHoliday: true,
            isTamilHoliday,
            category: isTamilHoliday
              ? "Tamil Holiday"
              : isNational
                ? "National Holiday"
                : "Festival / Religious",
          });
        });

        if (mounted) setHolidayEvents(holidayMap);
      } catch (error) {
        console.error("Holiday Fetch Error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchIndianEvents();

    return () => {
      mounted = false;
    };
  }, [currentYear]);

  const events = useMemo(() => {
    const merged = { ...userEvents };

    Object.keys(holidayEvents).forEach((date) => {
      merged[date] = [
        ...(holidayEvents[date] || []),
        ...(userEvents[date] || []),
      ];
    });

    return merged;
  }, [userEvents, holidayEvents]);

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

  const selectedEvents = events[selectedDate] || [];
  const selectedWeekInfo = weeks.find((week) => week.value === selectedWeek);

  const displayedDates = useMemo(() => {
    if (viewMode !== "week" || !selectedWeekInfo) return dates;

    const weekDates = [];

    for (let day = selectedWeekInfo.start; day <= selectedWeekInfo.end; day++) {
      weekDates.push(day);
    }

    return weekDates;
  }, [dates, viewMode, selectedWeekInfo]);

  const selectedEventsWithIndex = useMemo(
    () =>
      selectedEvents.map((event, index) => ({
        ...event,
        mergedIndex: index,
      })),
    [selectedEvents]
  );

  const selectedEventGroups = useMemo(
    () => splitEvents(selectedEventsWithIndex),
    [selectedEventsWithIndex]
  );

  const selectedWeekEvents = useMemo(() => {
    if (!selectedWeekInfo) return [];

    const result = [];

    for (let day = selectedWeekInfo.start; day <= selectedWeekInfo.end; day++) {
      const fullDate = `${monthKey}-${String(day).padStart(2, "0")}`;
      const dayEvents = events[fullDate] || [];

      dayEvents.forEach((event, eventIndex) => {
        result.push({
          ...event,
          eventIndex,
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
        events[date].forEach((event, eventIndex) => {
          result.push({
            ...event,
            eventIndex,
            date,
          });
        });
      });

    return result;
  }, [events, monthKey]);

  const selectedWeekGroups = useMemo(
    () => splitEvents(selectedWeekEvents),
    [selectedWeekEvents]
  );

  const selectedMonthGroups = useMemo(
    () => splitEvents(selectedMonthEvents),
    [selectedMonthEvents]
  );

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

  const openCreateFromList = () => {
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

  const getUserEventIndex = (date, mergedIndex) => {
    const holidayCount = holidayEvents[date]?.length || 0;
    return mergedIndex - holidayCount;
  };

  const createEvent = () => {
    if (!selectedDate || !title.trim()) return;

    setUserEvents((prev) => ({
      ...prev,
      [selectedDate]: [
        ...(prev[selectedDate] || []),
        {
          title: title.trim(),
          color,
          category: "Personal Event",
          isHoliday: false,
        },
      ],
    }));

    setTitle("");
    setColor("blue");
    setCreateOpen(false);
  };

  const deleteEvent = (index, event) => {
    if (!selectedDate || event.isHoliday) return;

    const userIndex = getUserEventIndex(selectedDate, index);
    if (userIndex < 0) return;

    setUserEvents((prev) => {
      const updated = [...(prev[selectedDate] || [])];
      updated.splice(userIndex, 1);

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
    if (event.isHoliday) return;

    setEditingIndex(index);
    setEditTitle(event.title);
    setEditColor(event.color);
  };

  const saveEdit = (index) => {
    if (!selectedDate || !editTitle.trim()) return;

    const userIndex = getUserEventIndex(selectedDate, index);
    if (userIndex < 0) return;

    setUserEvents((prev) => {
      const updated = [...(prev[selectedDate] || [])];

      updated[userIndex] = {
        ...updated[userIndex],
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

  const renderEventSection = ({ title: sectionTitle, events: sectionEvents }) => (
    <>
      <h4 className="event-section-title">{sectionTitle}</h4>

      {sectionEvents.length === 0 ? (
        <p className="event-section-empty">No events</p>
      ) : (
        sectionEvents.map((event) => {
          const index = event.mergedIndex;
          const isEditing = editingIndex === index;

          return (
            <div
              key={`${sectionTitle}-${index}-${event.title}`}
              className={`day-event-card ${event.color}`}
            >
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

                  <div>
                    <strong>{event.title}</strong>
                    {event.category && <small>{event.category}</small>}
                  </div>
                </div>
              )}

              {!event.isHoliday && (
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
                    onClick={() => deleteEvent(index, event)}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );

  const renderDetailsSection = ({ title: sectionTitle, events: sectionEvents }) => (
    <>
      <h4 className="event-section-title">{sectionTitle}</h4>

      {sectionEvents.length === 0 ? (
        <p className="event-section-empty">No events</p>
      ) : (
        sectionEvents.map((event, index) => (
          <div
            key={`${sectionTitle}-${index}-${event.title}`}
            className={`detail-row ${event.color}`}
          >
            <span className="event-dot" />

            <div>
              <strong>{event.title}</strong>
              <small>
                {event.date
                  ? dayjs(event.date).format("dddd, MMM D")
                  : event.category || dayjs(selectedDate).format("MMM D, YYYY")}
                {event.date && event.category ? ` • ${event.category}` : ""}
              </small>
            </div>
          </div>
        ))
      )}
    </>
  );

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
                <CalendarOutlined /> Indian Calendar
              </span>

              <h2>{currentMonth.format("MMMM YYYY")}</h2>
            </div>

            {loading ? (
              <div className="loading">
                <Spin />
              </div>
            ) : (
              <div className="event-list">
                <h4>Events</h4>

                {Object.keys(events).filter((date) => date.startsWith(monthKey))
                  .length === 0 && (
                  <p className="empty-text">No events this month</p>
                )}

                {Object.keys(events)
                  .sort()
                  .filter((date) => date.startsWith(monthKey))
                  .map((date) => (
                    <div key={date} className="event-group">
                      <strong>{dayjs(date).format("MMM D, YYYY")}</strong>

                      {events[date].map((event, index) => (
                        <div key={index} className={`event-item ${event.color}`}>
                          <span className="event-dot" />

                          <span>
                            {event.title}
                            {event.category && <small>{event.category}</small>}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            )}
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

            <div className={`grid ${viewMode === "week" ? "week-grid" : ""}`}>
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                <div key={day} className="day-header">
                  {day}
                </div>
              ))}

              {displayedDates.map((date, index) => {
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
                      <>
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

                        <div className="cell-events-scroll">
                          {visibleEvents.map((event, eventIndex) => (
                            <div
                              key={eventIndex}
                              className={`event ${event.color}`}
                            >
                              <span className="event-dot" />
                              <span>{event.title}</span>
                            </div>
                          ))}

                          {hiddenCount > 0 && (
                            <div className="more-events">+{hiddenCount} more</div>
                          )}
                        </div>
                      </>
                    )}
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
          {dayjs(selectedDate).format("dddd, MMMM D, YYYY")}
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

        {selectedEvents.length === 0 ? (
          <div className="day-empty">
            <Empty description="No events for this date" />
          </div>
        ) : (
          <div className="day-event-list">
            {renderEventSection({
              title: "Created Events",
              events: selectedEventGroups.created,
            })}

            {renderEventSection({
              title: "Holiday / Other Events",
              events: selectedEventGroups.other,
            })}
          </div>
        )}
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
              {dayjs(selectedDate).format("dddd, MMMM D, YYYY")}
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
                {renderDetailsSection({
                  title: "Created Events",
                  events: selectedEventGroups.created,
                })}

                {renderDetailsSection({
                  title: "Holiday / Other Events",
                  events: selectedEventGroups.other,
                })}
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
                {renderDetailsSection({
                  title: "Created Events",
                  events: selectedWeekGroups.created,
                })}

                {renderDetailsSection({
                  title: "Holiday / Other Events",
                  events: selectedWeekGroups.other,
                })}
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
                {renderDetailsSection({
                  title: "Created Events",
                  events: selectedMonthGroups.created,
                })}

                {renderDetailsSection({
                  title: "Holiday / Other Events",
                  events: selectedMonthGroups.other,
                })}
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
            {dayjs(selectedDate).format("MMMM D, YYYY")}
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
