import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Input,
  Select,
  Button,
  Empty,
  Spin,
  Segmented,
  TimePicker,
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
  CloseOutlined,
  ClockCircleOutlined,
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

const makeTime = (hour, minute = 0) =>
  dayjs().hour(hour).minute(minute).second(0).millisecond(0);

const timeToDayjs = (time) => {
  if (!time) return null;
  const [hour, minute] = time.split(":").map(Number);
  return makeTime(hour, minute);
};

const getMinutes = (time) => {
  if (!time) return 9 * 60;
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

const formatEventTime = (event) => {
  if (!event.startTime && !event.endTime) return event.category || "Event";
  if (event.startTime && event.endTime) return `${event.startTime} - ${event.endTime}`;
  return event.startTime || event.endTime;
};

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
  const [dayPageOpen, setDayPageOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [viewMode, setViewMode] = useState("day");
  const [selectedWeek, setSelectedWeek] = useState(1);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("blue");
  const [startTime, setStartTime] = useState(makeTime(9));
  const [endTime, setEndTime] = useState(makeTime(10));

  const [editingIndex, setEditingIndex] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("blue");
  const [editStartTime, setEditStartTime] = useState(makeTime(9));
  const [editEndTime, setEditEndTime] = useState(makeTime(10));

  const currentYear = currentMonth.format("YYYY");
  const today = dayjs().format("YYYY-MM-DD");
  const monthKey = currentMonth.format("YYYY-MM");

  const dayHours = useMemo(() => Array.from({ length: 24 }, (_, index) => index), []);

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
          const descriptionText = holiday.description?.toLowerCase() || "";

          const isNational =
            types.includes("National holiday") || types.includes("national");

          const isTamilHoliday = TAMIL_HOLIDAY_KEYWORDS.some(
            (keyword) => name.includes(keyword) || descriptionText.includes(keyword)
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
      merged[date] = [...(holidayEvents[date] || []), ...(userEvents[date] || [])];
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

  const timelineEvents = useMemo(
    () =>
      selectedEventsWithIndex
        .filter((event) => !event.isHoliday && event.startTime)
        .sort((a, b) => getMinutes(a.startTime) - getMinutes(b.startTime)),
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

  const selectedWeekGroups = useMemo(() => splitEvents(selectedWeekEvents), [selectedWeekEvents]);
  const selectedMonthGroups = useMemo(() => splitEvents(selectedMonthEvents), [selectedMonthEvents]);

  const getFullDate = (date) => `${monthKey}-${String(date).padStart(2, "0")}`;

  const resetCreateForm = () => {
    setTitle("");
    setDescription("");
    setColor("blue");
    setStartTime(makeTime(9));
    setEndTime(makeTime(10));
  };

  const openEventList = (date) => {
    if (!date) return;

    setSelectedDate(getFullDate(date));
    setEditingIndex(null);
    setDayPageOpen(true);
  };

  const closeDayPage = () => {
    setDayPageOpen(false);
    setEditingIndex(null);
  };

  const openCreateEvent = (date) => {
    if (!date) return;

    setSelectedDate(getFullDate(date));
    resetCreateForm();
    setCreateOpen(true);
  };

  const openCreateFromDayPage = () => {
    resetCreateForm();
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

    const start = startTime ? startTime.format("HH:mm") : "";
    const end = endTime ? endTime.format("HH:mm") : "";

    if (start && end && getMinutes(end) <= getMinutes(start)) return;

    setUserEvents((prev) => ({
      ...prev,
      [selectedDate]: [
        ...(prev[selectedDate] || []),
        {
          title: title.trim(),
          description: description.trim(),
          startTime: start,
          endTime: end,
          color,
          category: "Personal Event",
          isHoliday: false,
        },
      ],
    }));

    resetCreateForm();
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
    setEditTitle(event.title || "");
    setEditDescription(event.description || "");
    setEditColor(event.color || "blue");
    setEditStartTime(timeToDayjs(event.startTime) || makeTime(9));
    setEditEndTime(timeToDayjs(event.endTime) || makeTime(10));
  };

  const openEditFromDayPage = (event, index) => {
    if (event.isHoliday) return;

    startEdit(event, index);
    setDetailsOpen(true);
  };

  const saveEdit = (index) => {
    if (!selectedDate || !editTitle.trim()) return;

    const start = editStartTime ? editStartTime.format("HH:mm") : "";
    const end = editEndTime ? editEndTime.format("HH:mm") : "";

    if (start && end && getMinutes(end) <= getMinutes(start)) return;

    const userIndex = getUserEventIndex(selectedDate, index);
    if (userIndex < 0) return;

    setUserEvents((prev) => {
      const updated = [...(prev[selectedDate] || [])];

      updated[userIndex] = {
        ...updated[userIndex],
        title: editTitle.trim(),
        description: editDescription.trim(),
        color: editColor,
        startTime: start,
        endTime: end,
      };

      return {
        ...prev,
        [selectedDate]: updated,
      };
    });

    setEditingIndex(null);
  };

  const formatHour = (hour) => {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
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
                <div className="edit-form edit-form-expanded">
                  <Input
                    placeholder="Event title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onPressEnter={() => saveEdit(index)}
                  />

                  <Input
                    placeholder="Description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />

                  <div className="time-picker-row">
                    <TimePicker
                      value={editStartTime}
                      format="HH:mm"
                      minuteStep={5}
                      onChange={setEditStartTime}
                      suffixIcon={<ClockCircleOutlined />}
                    />

                    <TimePicker
                      value={editEndTime}
                      format="HH:mm"
                      minuteStep={5}
                      onChange={setEditEndTime}
                      suffixIcon={<ClockCircleOutlined />}
                    />
                  </div>

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
                    <small>
                      {formatEventTime(event)}
                      {event.description ? ` • ${event.description}` : ""}
                    </small>
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
          <div key={`${sectionTitle}-${index}-${event.title}`} className={`detail-row ${event.color}`}>
            <span className="event-dot" />

            <div>
              <strong>{event.title}</strong>
              <small>
                {event.date
                  ? dayjs(event.date).format("dddd, MMM D")
                  : dayjs(selectedDate).format("MMM D, YYYY")}
                {" • "}
                {formatEventTime(event)}
                {event.description ? ` • ${event.description}` : ""}
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

                {Object.keys(events).filter((date) => date.startsWith(monthKey)).length === 0 && (
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
                            <small>{formatEventTime(event)}</small>
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            )}
          </aside>

          <main className="main">
            {dayPageOpen ? (
              <div className="day-page">
                <div className="day-page-top">
                  <div className="day-page-timezone">GMT+05:30</div>

                  <div className="day-page-date">
                    <span>{dayjs(selectedDate).format("ddd").toUpperCase()}</span>
                    <strong>{dayjs(selectedDate).format("D")}</strong>
                  </div>

                  <div className="day-page-actions">
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      className="day-page-create"
                      onClick={openCreateFromDayPage}
                    >
                      Add Event
                    </Button>

                    <Button icon={<CloseOutlined />} className="day-page-exit" onClick={closeDayPage}>
                      Exit
                    </Button>
                  </div>
                </div>

                {selectedEventsWithIndex.length > 0 && (
                  <div className="day-page-events">
                    {selectedEventsWithIndex.map((event) => (
                      <div
                        key={event.mergedIndex}
                        className={`day-page-chip day-page-chip-action ${event.color}`}
                      >
                        <span className="event-dot" />

                        <span className="day-page-chip-text">
                          {event.startTime ? `${event.startTime} ` : ""}
                          {event.title}
                        </span>

                        {!event.isHoliday && (
                          <span className="day-page-chip-buttons">
                            <button
                              type="button"
                              onClick={() => openEditFromDayPage(event, event.mergedIndex)}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteEvent(event.mergedIndex, event)}
                            >
                              Delete
                            </button>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="day-schedule">
                  <div className="timeline-layer">
                    {timelineEvents.map((event) => {
                      const start = getMinutes(event.startTime);
                      const end = getMinutes(event.endTime || event.startTime);
                      const top = start;
                      const height = Math.max(end - start, 38);

                      return (
                        <div
                          key={`${event.mergedIndex}-${event.title}`}
                          className={`timeline-event ${event.color}`}
                          style={{ top, height }}
                        >
                          <strong>{event.title}</strong>
                          <small>{formatEventTime(event)}</small>
                        </div>
                      );
                    })}
                  </div>

                  {dayHours.map((hour) => (
                    <div key={hour} className="time-row">
                      <div className="time-label">{formatHour(hour)}</div>
                      <div className="time-line" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="header">
                  <div className="header-actions">
                    <Button icon={<LeftOutlined />} onClick={() => setCurrentMonth((prev) => prev.subtract(1, "month"))} />

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

                    <Button icon={<RightOutlined />} onClick={() => setCurrentMonth((prev) => prev.add(1, "month"))} />

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
                      <Select value={selectedWeek} onChange={setSelectedWeek} className="week-select">
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
                        className={`cell ${!date ? "empty" : ""} ${fullDate === today ? "today" : ""} ${
                          fullDate === selectedDate ? "selected-cell" : ""
                        }`}
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

                              {dayEvents.length > 0 && <span className="event-count">{dayEvents.length}</span>}
                            </div>

                            <div className="cell-events-scroll">
                              {visibleEvents.map((event, eventIndex) => (
                                <div key={eventIndex} className={`event ${event.color}`}>
                                  <span className="event-dot" />
                                  <span>
                                    {event.startTime ? `${event.startTime} ` : ""}
                                    {event.title}
                                  </span>
                                </div>
                              ))}

                              {hiddenCount > 0 && <div className="more-events">+{hiddenCount} more</div>}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </main>
        </div>
      </Modal>

      <Modal open={detailsOpen} onCancel={() => setDetailsOpen(false)} footer={null} className="creative-modal details-modal" title={null}>
        <h3 className="modal-heading black-heading">
          <EyeOutlined /> {viewMode === "day" ? "Day Details" : viewMode === "week" ? "Week Details" : "Month Details"}
        </h3>

        {viewMode === "day" && (
          <>
            <p className="modal-date-text">{dayjs(selectedDate).format("dddd, MMMM D, YYYY")}</p>

            <div className="details-count">
              {selectedEvents.length} event{selectedEvents.length === 1 ? "" : "s"} on this day
            </div>

            {selectedEvents.length === 0 ? (
              <div className="day-empty">
                <Empty description="No events for this day" />
              </div>
            ) : (
              <div className="details-scroll">
                {renderEventSection({ title: "Created Events", events: selectedEventGroups.created })}
                {renderDetailsSection({ title: "Holiday / Other Events", events: selectedEventGroups.other })}
              </div>
            )}
          </>
        )}

        {viewMode === "week" && (
          <>
            <p className="modal-date-text">
              {selectedWeekInfo
                ? `${currentMonth.format("MMMM")} ${selectedWeekInfo.start} - ${selectedWeekInfo.end}, ${currentMonth.format("YYYY")}`
                : ""}
            </p>

            <div className="details-count">
              {selectedWeekEvents.length} event{selectedWeekEvents.length === 1 ? "" : "s"} in Week {selectedWeek}
            </div>

            {selectedWeekEvents.length === 0 ? (
              <div className="day-empty">
                <Empty description="No events for this week" />
              </div>
            ) : (
              <div className="details-scroll">
                {renderDetailsSection({ title: "Created Events", events: selectedWeekGroups.created })}
                {renderDetailsSection({ title: "Holiday / Other Events", events: selectedWeekGroups.other })}
              </div>
            )}
          </>
        )}

        {viewMode === "month" && (
          <>
            <p className="modal-date-text">{currentMonth.format("MMMM YYYY")}</p>

            <div className="details-count">
              {selectedMonthEvents.length} event{selectedMonthEvents.length === 1 ? "" : "s"} in this month
            </div>

            {selectedMonthEvents.length === 0 ? (
              <div className="day-empty">
                <Empty description="No events for this month" />
              </div>
            ) : (
              <div className="details-scroll">
                {renderDetailsSection({ title: "Created Events", events: selectedMonthGroups.created })}
                {renderDetailsSection({ title: "Holiday / Other Events", events: selectedMonthGroups.other })}
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
        cancelText="Cancel"
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

          <label>Description</label>
          <Input
            placeholder="Example: Client call, birthday plan, project review"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <label>Event Timing</label>
          <div className="time-picker-row">
            <TimePicker
              value={startTime}
              format="HH:mm"
              minuteStep={5}
              onChange={setStartTime}
              suffixIcon={<ClockCircleOutlined />}
            />

            <TimePicker
              value={endTime}
              format="HH:mm"
              minuteStep={5}
              onChange={setEndTime}
              suffixIcon={<ClockCircleOutlined />}
            />
          </div>

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
