import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { de } from "date-fns/locale";
import type { Booking } from "../types";

interface Props {
  month: Date;
  onMonthChange: (d: Date) => void;
  bookings: Booking[];
  selected: Date;
  onSelect: (d: Date) => void;
  myUserId?: string;
}

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function bookingsOnDay(bookings: Booking[], day: Date) {
  const s = startOfDay(day);
  const e = endOfDay(day);
  return bookings.filter((b) => new Date(b.starts_at) <= e && new Date(b.ends_at) >= s);
}

export default function MonthCalendar({ month, onMonthChange, bookings, selected, onSelect, myUserId }: Props) {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);
  const today = new Date();

  return (
    <div className="calendar card">
      <div className="row between cal-head">
        <button className="btn icon" onClick={() => onMonthChange(addMonths(month, -1))} aria-label="Vorheriger Monat">
          ‹
        </button>
        <div className="strong">{format(month, "MMMM yyyy", { locale: de })}</div>
        <button className="btn icon" onClick={() => onMonthChange(addMonths(month, 1))} aria-label="Nächster Monat">
          ›
        </button>
      </div>
      <div className="cal-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="cal-wd">
            {w}
          </div>
        ))}
        {days.map((d) => {
          const dayBookings = bookingsOnDay(bookings, d);
          const mine = dayBookings.some((b) => b.user_id === myUserId);
          const cls = [
            "cal-day",
            !isSameMonth(d, month) && "other",
            isSameDay(d, today) && "today",
            isSameDay(d, selected) && "selected",
            dayBookings.length > 0 && (mine ? "booked mine" : "booked"),
            d < startOfDay(today) && "past",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button key={d.toISOString()} className={cls} onClick={() => onSelect(d)}>
              {format(d, "d")}
              {dayBookings.length > 0 && <span className="dot" />}
            </button>
          );
        })}
      </div>
      <div className="row gap small muted legend">
        <span><span className="dot inline" /> belegt</span>
        <span><span className="dot inline mine" /> meine Buchung</span>
      </div>
    </div>
  );
}
