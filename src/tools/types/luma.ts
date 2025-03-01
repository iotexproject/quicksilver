export interface LumaEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location: string;
  description: string;
  url?: string;
}

export interface LumaParams {
  calendarUrl: string;
  filter?: string;
}

// Internal interface for iCalendar event components
export interface ICalEvent {
  uid?: string;
  summary?: string;
  description?: string;
  location?: string;
  dtstart?: string;
  dtend?: string;
} 