import { UUID } from 'crypto';

import { tool } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';


import { APITool } from './tool';
import { logger } from '../logger/winston';
import { LumaEvent, LumaParams, ICalEvent } from './types/luma';

// Default ETHDenver Luma calendar URL
const DEFAULT_LUMA_CALENDAR_URL = 'https://api.lu.ma/ics/get?entity=calendar&id=cal-VFzfuxD01QUFkSs';

const FetchLumaEventsToolSchema = {
  name: 'fetch_luma_events',
  description:
    'Fetches events from a Luma calendar, starting with ETHDenver events. Call it after ethdenver tool to back the ethdenver tool with luma events',
  parameters: z.object({
    calendarUrl: z.string().optional().describe('Optional Luma calendar URL. If not provided, uses ETHDenver calendar'),
  }),
  execute: async (input: { calendarUrl?: string; filter?: string }) => {
    try {
      const tool = new LumaEventsTool();
      return await tool.getRawData({
        calendarUrl: input.calendarUrl || DEFAULT_LUMA_CALENDAR_URL,
        filter: input.filter,
      });
    } catch (error) {
      logger.error('Error executing fetch_luma_events tool', error);
      return `Error executing fetch_luma_events tool`;
    }
  },
};

export class LumaEventsTool extends APITool<LumaParams> {
  schema = [
    {
      name: FetchLumaEventsToolSchema.name,
      tool: tool(FetchLumaEventsToolSchema),
    },
  ];

  constructor() {
    super({
      name: 'LumaEvents',
      description: 'Tool for fetching and filtering events from Luma calendars',
      baseUrl: 'https://api.lu.ma',
    });
  }

  async getRawData(params: LumaParams): Promise<LumaEvent[]> {
    try {
      const events = await this.fetchEventsFromLuma(params.calendarUrl);

      // Apply filter if provided
      if (params.filter) {
        const filterLower = params.filter.toLowerCase();
        return events.filter(
          event =>
            event.title.toLowerCase().includes(filterLower) || event.description.toLowerCase().includes(filterLower)
        );
      }

      return events;
    } catch (error) {
      logger.error('Luma Events Error', error);
      throw new Error(`Error fetching Luma events: ${error}`);
    }
  }

  private async fetchEventsFromLuma(calendarUrl: string): Promise<LumaEvent[]> {
    try {
      const response = await fetch(calendarUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch calendar: ${response.status} ${response.statusText}`);
      }

      const icsText = await response.text();

      // Parse the iCalendar data using a simple approach
      const events = this.parseICalendar(icsText);

      // Transform the events into our format
      return events.map(event => {
        const uid = event.uid || uuidv4();

        return {
          id: uid,
          title: event.summary || 'Untitled Event',
          start: event.dtstart ? new Date(event.dtstart) : new Date(),
          end: event.dtend ? new Date(event.dtend) : new Date(),
          location: event.location || '',
          description: event.description || '',
          url: this.extractUrlFromDescription(event.description || ''),
        };
      });
    } catch (error) {
      logger.error('Error fetching Luma calendar', error);
      throw new Error(`Failed to fetch or parse Luma calendar: ${error}`);
    }
  }

  // Simple iCalendar parser
  private parseICalendar(icsData: string): ICalEvent[] {
    const events: ICalEvent[] = [];
    let currentEvent: ICalEvent | null = null;
    let currentProperty = '';

    // Split by lines and process
    const lines = icsData.split(/\r\n|\n|\r/);

    for (const line of lines) {
      if (line.startsWith('BEGIN:VEVENT')) {
        currentEvent = {};
      } else if (line.startsWith('END:VEVENT') && currentEvent) {
        events.push(currentEvent);
        currentEvent = null;
      } else if (currentEvent) {
        // Handle property
        if (line.startsWith(' ') && currentProperty) {
          // This is a continuation of the previous property
          const value = line.substring(1);
          if (currentEvent[currentProperty as keyof ICalEvent]) {
            currentEvent[currentProperty as keyof ICalEvent] += value;
          }
        } else {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).toLowerCase();
            const value = line.substring(colonIndex + 1);

            // Handle common properties
            if (key === 'uid' || key === 'summary' || key === 'description' || key === 'location') {
              currentEvent[key] = value;
            } else if (key.startsWith('dtstart')) {
              currentEvent.dtstart = this.parseICalDate(value);
            } else if (key.startsWith('dtend')) {
              currentEvent.dtend = this.parseICalDate(value);
            }

            currentProperty = key;
          }
        }
      }
    }

    return events;
  }

  // Parse iCalendar date format to ISO string
  private parseICalDate(dateStr: string): string {
    // Basic handling for common iCal date formats
    // This is a simplified version and might need enhancement for all iCal date formats
    if (dateStr.includes('T')) {
      // Format with time component
      const cleanDate = dateStr.replace(/[Z]/g, '');
      if (cleanDate.includes('-')) {
        return cleanDate; // Already in ISO format
      }

      // Format like: 20230101T120000
      const year = cleanDate.substring(0, 4);
      const month = cleanDate.substring(4, 6);
      const day = cleanDate.substring(6, 8);
      const time = cleanDate.substring(9);

      const hour = time.substring(0, 2);
      const minute = time.substring(2, 4);
      const second = time.substring(4, 6);

      return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    } else {
      // Date only format
      if (dateStr.includes('-')) {
        return `${dateStr}T00:00:00`;
      }

      // Format like: 20230101
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);

      return `${year}-${month}-${day}T00:00:00`;
    }
  }

  // Helper method to extract event URL from description if present
  private extractUrlFromDescription(description: string): string | undefined {
    // Look for URLs in the description
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = description.match(urlRegex);

    if (matches && matches.length > 0) {
      return matches[0];
    }

    return undefined;
  }

  // Optional method to store events in knowledge base if needed
  async storeEventsInKnowledgeBase(events: LumaEvent[], runtime: any): Promise<void> {
    for (const event of events) {
      await runtime.ragKnowledgeManager.createKnowledge({
        id: uuidv4() as UUID,
        agentId: runtime.agentId,
        content: {
          text: JSON.stringify(event),
          metadata: {
            title: event.title,
            isMain: true,
            isChunk: false,
            type: 'event',
          },
        },
      });
    }
  }
}

export default LumaEventsTool;
