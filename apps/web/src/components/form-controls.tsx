"use client";

import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type SelectOption = { value: string; label: string; disabled?: boolean };

type SelectFieldProps = {
  id: string;
  name: string;
  options: SelectOption[];
  defaultValue?: string | undefined;
  value?: string | undefined;
  placeholder?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  ariaLabel?: string | undefined;
  onValueChange?: ((value: string) => void) | undefined;
};

export function SelectField({ id, name, options, defaultValue, value, placeholder = "Select…", required, disabled, ariaLabel, onValueChange }: SelectFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value ?? defaultValue ?? "");
  const selectedValue = value ?? internalValue;
  const selected = options.find((option) => option.value === selectedValue);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); window.removeEventListener("keydown", escape); };
  }, []);

  const choose = (next: string) => {
    setInternalValue(next);
    onValueChange?.(next);
    setOpen(false);
  };

  return <div className={`custom-select ${open ? "is-open" : ""}`} data-required={required || undefined} ref={rootRef}>
    <input type="hidden" name={name} value={selectedValue} />
    <button className="custom-select-trigger" id={id} type="button" disabled={disabled} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span className={selected ? "" : "placeholder"}>{selected?.label ?? placeholder}</span><ChevronDown aria-hidden="true" />
    </button>
    {open ? <div className="custom-select-menu" data-lenis-prevent role="listbox" aria-label={ariaLabel}>
      {options.map((option) => <button className="custom-select-option" type="button" role="option" aria-selected={option.value === selectedValue} disabled={option.disabled} key={option.value} onClick={() => choose(option.value)}><span>{option.label}</span>{option.value === selectedValue ? <Check aria-hidden="true" /> : null}</button>)}
    </div> : null}
  </div>;
}

type DateTimeFieldProps = { id: string; name: string; defaultValue?: string | undefined; required?: boolean | undefined; placeholder?: string | undefined };

const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function DateTimeField({ id, name, defaultValue = "", required, placeholder = "Choose date and time" }: DateTimeFieldProps) {
  const parsed = defaultValue ? new Date(defaultValue) : null;
  const [selectedDate, setSelectedDate] = useState(parsed && !Number.isNaN(parsed.getTime()) ? dateKey(parsed) : "");
  const [hour, setHour] = useState(parsed && !Number.isNaN(parsed.getTime()) ? pad(parsed.getHours()) : "09");
  const [minute, setMinute] = useState(parsed && !Number.isNaN(parsed.getTime()) ? pad(parsed.getMinutes()) : "00");
  const [month, setMonth] = useState(() => parsed && !Number.isNaN(parsed.getTime()) ? new Date(parsed.getFullYear(), parsed.getMonth(), 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); window.removeEventListener("keydown", escape); };
  }, []);

  const days = useMemo(() => {
    const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(firstWeekday).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [month]);
  const value = selectedDate ? `${selectedDate}T${hour}:${minute}` : "";
  const label = selectedDate ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${selectedDate}T12:00:00`)) : placeholder;
  const hourOptions = Array.from({ length: 24 }, (_, index) => ({ value: pad(index), label: pad(index) }));
  const minuteOptions = ["00", "15", "30", "45"].map((item) => ({ value: item, label: item }));

  return <div className={`date-time-field ${open ? "is-open" : ""}`} data-required={required || undefined} ref={rootRef}>
    <input type="hidden" name={name} value={value} />
    <button className="date-time-trigger" id={id} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((current) => !current)}><CalendarDays aria-hidden="true" /><span className={selectedDate ? "" : "placeholder"}>{label}</span>{selectedDate ? <small>{hour}:{minute}</small> : null}<ChevronDown aria-hidden="true" /></button>
    {open ? <div className="date-time-popover" role="dialog" aria-label="Choose date and time">
      <header><button type="button" data-tooltip="Previous month" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft /></button><strong>{new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month)}</strong><button type="button" data-tooltip="Next month" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight /></button></header>
      <div className="calendar-weekdays">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendar-grid">{days.map((day, index) => day ? <button type="button" className={selectedDate === dateKey(new Date(month.getFullYear(), month.getMonth(), day)) ? "selected" : ""} key={day} onClick={() => setSelectedDate(dateKey(new Date(month.getFullYear(), month.getMonth(), day)))}>{day}</button> : <span key={`empty-${index}`} />)}</div>
      <footer><Clock aria-hidden="true" /><span>Time</span><SelectField id={`${id}-hour`} name="" value={hour} options={hourOptions} ariaLabel="Hour" onValueChange={setHour} /><b>:</b><SelectField id={`${id}-minute`} name="" value={minute} options={minuteOptions} ariaLabel="Minute" onValueChange={setMinute} /><button className="button primary" type="button" disabled={!selectedDate} onClick={() => setOpen(false)}>Done</button></footer>
    </div> : null}
  </div>;
}
