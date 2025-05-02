import { logger } from './logger/winston';
import { MeteringEvent, TrackPromptParams, IMetering } from './types';

interface MeteringResponse {
  success: boolean;
  errors?: string[];
  eventIds?: string[];
}

/**
 * Metering client for tracking usage events
 */
export class Metering implements IMetering {
  private apiUrl: string = 'https://openmeter.cloud/api/v1';
  private eventQueue: MeteringEvent[] = [];
  private batchSize: number = 10;
  private autoFlush: boolean = true;
  private flushInterval: number = 5000;
  private flushTimer: NodeJS.Timeout | null = null;
  private source: string;
  private subject: string;
  private isLocal: boolean = false;

  /**
   * Creates a new Metering client instance
   */
  constructor(opts: { source: string }) {
    if (!process.env.OPENMETER_API_KEY) {
      this.isLocal = true;
    }
    this.source = opts.source;

    this.subject = process.env.OPENMETER_SUBJECT || opts.source;
    this.apiUrl = process.env.OPENMETER_API_URL || this.apiUrl;
    this.batchSize = process.env.OPENMETER_BATCH_SIZE ? parseInt(process.env.OPENMETER_BATCH_SIZE) : this.batchSize;

    this.autoFlush =
      process.env.OPENMETER_AUTO_FLUSH !== undefined ? process.env.OPENMETER_AUTO_FLUSH === 'true' : true;
    this.flushInterval = process.env.OPENMETER_FLUSH_INTERVAL
      ? parseInt(process.env.OPENMETER_FLUSH_INTERVAL)
      : this.flushInterval;

    if (this.autoFlush) {
      this.startAutoFlush();
    }
  }

  /**
   * Starts the auto-flush timer
   */
  private startAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush().catch(err => {
          logger.error('Auto-flush error', err);
        });
      }
    }, this.flushInterval);
  }

  /**
   * Stops the auto-flush timer
   */
  public stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Submits an event to be metered
   */
  public track(event: MeteringEvent): void {
    this.eventQueue.push(event);
    logger.info('Event queued', event);

    if (this.eventQueue.length >= this.batchSize) {
      this.flush().catch(err => {
        logger.error('Flush error after reaching batch size', err);
      });
    }
  }

  /**
   * Creates a standardized event with proper format
   */
  public createEvent(params: { type: string; data: Record<string, unknown>; id: string }): MeteringEvent {
    const now = new Date().toISOString();

    return {
      specversion: '1.0',
      type: params.type,
      id: params.id,
      time: now,
      source: this.source,
      subject: this.subject,
      data: params.data,
    };
  }

  /**
   * Convenience method for tracking LLM prompt events
   */
  public trackPrompt(params: TrackPromptParams): void {
    const event = this.createEvent({
      type: 'prompt',
      data: {
        tokens: params.tokens.toString(),
        model: params.model,
        type: params.type,
      },
      id: params.id,
    });

    this.track(event);
  }

  /**
   * Sends queued events to the metering API
   */
  public async flush(): Promise<MeteringResponse> {
    if (this.eventQueue.length === 0) {
      logger.info('No events to flush');
      return { success: true, eventIds: [] };
    }

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    logger.info(`Flushing ${eventsToSend.length} events`, eventsToSend);

    if (this.isLocal) {
      logger.info('Remote metering is disabled');
      logger.info('METERING_EVENTS', eventsToSend);
      return { success: true, eventIds: [] };
    }

    try {
      // Send each event individually per the CloudEvents format
      const results = await Promise.all(
        eventsToSend.map(async event => {
          const response = await fetch(`${this.apiUrl}/events`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/cloudevents+json',
              Authorization: `Bearer ${process.env.OPENMETER_API_KEY}`,
            },
            body: JSON.stringify(event),
          });

          if (!response.ok) {
            const errorText = await response.text();
            logger.error('API error', {
              status: response.status,
              body: errorText,
            });
            return {
              success: false,
              error: errorText,
              eventId: event.id,
            };
          }

          return { success: true, eventId: event.id };
        })
      );

      const failures = results.filter(r => !r.success);

      // Add failed events back to the queue
      if (failures.length > 0) {
        const failedIds = failures.map(f => f.eventId);
        const failedEvents = eventsToSend.filter(e => failedIds.includes(e.id));
        this.eventQueue = [...failedEvents, ...this.eventQueue];

        return {
          success: false,
          errors: failures.map(f => f.error || 'Unknown error'),
        };
      }

      return {
        success: true,
        eventIds: eventsToSend.map(e => e.id),
      };
    } catch (error) {
      logger.error('Flush error', error);

      // Put events back in queue for retry
      this.eventQueue = [...eventsToSend, ...this.eventQueue];

      return {
        success: false,
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Disposes of the metering client resources
   */
  public dispose(): void {
    this.stopAutoFlush();
  }
}
