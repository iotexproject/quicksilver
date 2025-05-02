import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Metering } from '../metering';
import { MeteringEvent } from '../types';
import { logger } from '../logger/winston';
import { Logger } from 'winston';
describe('Metering', () => {
  let metering: Metering;
  let fetchMock: any;

  beforeEach(() => {
    // Mock the fetch function
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    global.fetch = fetchMock;

    const originalSubject = process.env.OPENMETER_SUBJECT;
    const originalApiKey = process.env.OPENMETER_API_KEY;
    const originalApiUrl = process.env.OPENMETER_API_URL;

    process.env.OPENMETER_SUBJECT = 'test-customer';
    process.env.OPENMETER_API_KEY = 'test-api-key';
    process.env.OPENMETER_API_URL = 'https://test-api.example.com/v1';

    metering = new Metering({
      source: 'test-source',
    });

    if (!originalSubject) delete process.env.OPENMETER_SUBJECT;
    else process.env.OPENMETER_SUBJECT = originalSubject;

    if (!originalApiKey) delete process.env.OPENMETER_API_KEY;
    else process.env.OPENMETER_API_KEY = originalApiKey;

    if (!originalApiUrl) delete process.env.OPENMETER_API_URL;
    else process.env.OPENMETER_API_URL = originalApiUrl;
  });

  afterEach(() => {
    metering.dispose();
    vi.resetAllMocks();
  });

  it('should configure with default options', () => {
    const defaultMetering = new Metering({
      source: 'test-source',
    });
    expect(defaultMetering).toBeDefined();
  });

  it('should create a correctly formatted event', () => {
    const event = metering.createEvent({
      type: 'test-event',
      data: { value: 123 },
      id: 'test-id',
    });

    expect(event).toMatchObject({
      specversion: '1.0',
      type: 'test-event',
      source: 'test-source',
      subject: 'test-customer',
      data: { value: 123 },
    });

    expect(event.id).toBeDefined();
    expect(event.time).toBeDefined();
  });

  it('should track an event and add it to queue', async () => {
    // Reset mock to ensure clean state
    fetchMock.mockClear();

    // Save original API key and set test value
    const savedApiKey = process.env.OPENMETER_API_KEY;
    process.env.OPENMETER_API_KEY = 'test-api-key';

    const testEvent: MeteringEvent = {
      specversion: '1.0',
      type: 'test-event',
      id: 'test-id',
      time: new Date().toISOString(),
      source: 'test-source',
      subject: 'test-customer',
      data: { value: 123 },
    };

    metering.track(testEvent);

    // Trigger flush to check the queue contents
    await metering.flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://test-api.example.com/v1/events');
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBe('application/cloudevents+json');
    expect(fetchMock.mock.calls[0][1].headers['Authorization']).toBe('Bearer test-api-key');

    const sentData = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sentData.id).toBe('test-id');
    expect(sentData.type).toBe('test-event');

    // Restore original API key
    process.env.OPENMETER_API_KEY = savedApiKey;
  });

  it('should provide a convenience method for tracking prompts', () => {
    metering.trackPrompt({
      tokens: 456,
      model: 'gpt4o',
      type: 'input',
      id: 'test-id',
    });

    // Trigger flush to check the queue contents
    metering.flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const callArgs = fetchMock.mock.calls[0];
    const payload = JSON.parse(callArgs[1].body);

    expect(payload.type).toBe('prompt');
    expect(payload.source).toBe('test-source');
    expect(payload.subject).toBe('test-customer');
    expect(payload.data).toEqual({
      tokens: '456',
      model: 'gpt4o',
      type: 'input',
    });
  });

  it('should handle API errors', async () => {
    // Override the mock for this test
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const testEvent: MeteringEvent = {
      specversion: '1.0',
      type: 'test-event',
      id: 'test-id',
      time: new Date().toISOString(),
      source: 'test-source',
      subject: 'test-customer',
      data: { value: 123 },
    };

    metering.track(testEvent);

    const result = await metering.flush();

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(['Internal Server Error']);

    // Verify the event was put back in the queue
    // Should trigger another call with the same event
    await metering.flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should handle network errors', async () => {
    // Override the mock for this test
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    const testEvent: MeteringEvent = {
      specversion: '1.0',
      type: 'test-event',
      id: 'test-id',
      time: new Date().toISOString(),
      source: 'test-source',
      subject: 'test-customer',
      data: { value: 123 },
    };

    metering.track(testEvent);

    const result = await metering.flush();

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Network error');

    // Verify the event was put back in the queue
    // Should trigger another call with the same event
    await metering.flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should configure custom batch size from environment variable', () => {
    // Save original environment variables
    const originalBatchSize = process.env.OPENMETER_BATCH_SIZE;

    // Set custom batch size
    process.env.OPENMETER_BATCH_SIZE = '25';

    // Create new instance with custom configuration
    const customBatchMetering = new Metering({
      source: 'test-source',
    });

    // Test internal state through controlled flush behavior
    const mockFlush = vi.fn().mockResolvedValue({ success: true });
    customBatchMetering.flush = mockFlush;

    // Add events just below the batch threshold
    for (let i = 0; i < 24; i++) {
      customBatchMetering.track({
        specversion: '1.0',
        type: 'test-event',
        id: `batch-${i}`,
        time: new Date().toISOString(),
        source: 'test-source',
        subject: 'test-customer',
        data: { index: i },
      });
    }

    // Should not trigger auto-flush yet
    expect(mockFlush).not.toHaveBeenCalled();

    // Add one more event to reach the threshold
    customBatchMetering.track({
      specversion: '1.0',
      type: 'test-event',
      id: 'batch-final',
      time: new Date().toISOString(),
      source: 'test-source',
      subject: 'test-customer',
      data: { index: 24 },
    });

    // Should trigger auto-flush now
    expect(mockFlush).toHaveBeenCalled();

    // Cleanup
    customBatchMetering.dispose();

    // Restore original environment variables
    if (!originalBatchSize) delete process.env.OPENMETER_BATCH_SIZE;
    else process.env.OPENMETER_BATCH_SIZE = originalBatchSize;
  });

  it('should respect auto flush configuration from environment variable', () => {
    // Save original environment variables
    const originalAutoFlush = process.env.OPENMETER_AUTO_FLUSH;

    // Setup spy before creating the instance
    const setIntervalSpy = vi.spyOn(global, 'setInterval');

    // First verify normal behavior (auto flush enabled by default)
    setIntervalSpy.mockClear();
    const defaultMetering = new Metering({
      source: 'test-source',
    });

    // By default, setInterval should be called in constructor
    expect(setIntervalSpy).toHaveBeenCalled();
    defaultMetering.dispose();

    // Now test with auto flush disabled
    process.env.OPENMETER_AUTO_FLUSH = 'false';
    setIntervalSpy.mockClear();

    const noAutoFlushMetering = new Metering({
      source: 'test-source',
    });

    // With auto flush disabled, setInterval should not be called
    expect(setIntervalSpy).not.toHaveBeenCalled();

    // Clean up
    noAutoFlushMetering.dispose();
    setIntervalSpy.mockRestore();

    // Restore original environment variables
    if (!originalAutoFlush) delete process.env.OPENMETER_AUTO_FLUSH;
    else process.env.OPENMETER_AUTO_FLUSH = originalAutoFlush;
  });

  it('should configure custom flush interval from environment variable', () => {
    // Save original environment variables
    const originalFlushInterval = process.env.OPENMETER_FLUSH_INTERVAL;

    // Setup custom flush interval
    const customInterval = 10000; // 10 seconds
    process.env.OPENMETER_FLUSH_INTERVAL = customInterval.toString();

    // Spy on setInterval to capture the interval value
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    setIntervalSpy.mockClear();

    // Create new instance with custom interval
    const customIntervalMetering = new Metering({
      source: 'test-source',
    });

    // Verify setInterval was called with the custom interval value
    expect(setIntervalSpy).toHaveBeenCalled();
    expect(setIntervalSpy.mock.calls[0][1]).toBe(customInterval);

    // Clean up
    customIntervalMetering.dispose();
    setIntervalSpy.mockRestore();

    // Restore original environment variables
    if (!originalFlushInterval) delete process.env.OPENMETER_FLUSH_INTERVAL;
    else process.env.OPENMETER_FLUSH_INTERVAL = originalFlushInterval;
  });

  it('should clear existing flush timer when starting auto flush', () => {
    // Setup spies
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    // Create new metering instance
    const meteringInstance = new Metering({
      source: 'test-source',
    });

    // Initial constructor call creates first interval
    expect(setIntervalSpy).toHaveBeenCalled();

    // Reset counters for clearer test
    setIntervalSpy.mockClear();
    clearIntervalSpy.mockClear();

    // Access private method for testing
    const startAutoFlushMethod = Object.getPrototypeOf(meteringInstance).constructor.prototype.startAutoFlush;

    // Trigger startAutoFlush directly to simulate a second call
    startAutoFlushMethod.call(meteringInstance);

    // Verify clearInterval was called first to clean up existing timer
    expect(clearIntervalSpy).toHaveBeenCalled();

    // Verify setInterval was called to create a new timer
    expect(setIntervalSpy).toHaveBeenCalled();

    // Cleanup
    meteringInstance.dispose();
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it('should handle errors during auto flush interval execution', () => {
    // Setup mocks and spies
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create metering instance
    const meteringInstance = new Metering({
      source: 'test-source',
    });

    // Mock the flush method to throw an error
    const flushMock = vi.fn().mockRejectedValue(new Error('Auto flush error'));
    meteringInstance.flush = flushMock;

    // Add an event to the queue to trigger flush in the interval
    meteringInstance.track({
      specversion: '1.0',
      type: 'test-event',
      id: 'auto-flush-test',
      time: new Date().toISOString(),
      source: 'test-source',
      subject: 'test-subject',
      data: { test: true },
    });

    // Fast-forward past the flush interval
    vi.advanceTimersByTime(6000); // Default is 5000ms

    // Verify flush was called
    expect(flushMock).toHaveBeenCalled();

    // Cleanup
    meteringInstance.dispose();
    vi.useRealTimers();
    consoleSpy.mockRestore();
  });

  it('should handle flush errors after reaching batch size', async () => {
    // Save original fetch
    const originalFetch = global.fetch;

    // Setup fake timers
    vi.useFakeTimers();

    // Create metering instance with small batch size
    process.env.OPENMETER_BATCH_SIZE = '3';
    process.env.OPENMETER_API_KEY = 'test-api-key';
    const errorMetering = new Metering({
      source: 'test-source',
    });

    // Stop auto flush to prevent interference
    errorMetering.stopAutoFlush();

    // Mock fetch to fail
    const fetchErrorMock = vi.fn().mockRejectedValue(new Error('Network error on batch size trigger'));
    global.fetch = fetchErrorMock;

    // Spy on logger error
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Add events but not enough to trigger batch flush
    errorMetering.track({
      specversion: '1.0',
      type: 'test-event',
      id: 'batch-error-1',
      time: new Date().toISOString(),
      source: 'test-source',
      subject: 'test-customer',
      data: { index: 1 },
    });

    // Verify fetch was not called yet
    expect(fetchErrorMock).not.toHaveBeenCalled();

    // Add more events to trigger batch flush
    errorMetering.track({
      specversion: '1.0',
      type: 'test-event',
      id: 'batch-error-2',
      time: new Date().toISOString(),
      source: 'test-source',
      subject: 'test-customer',
      data: { index: 2 },
    });

    errorMetering.track({
      specversion: '1.0',
      type: 'test-event',
      id: 'batch-error-3',
      time: new Date().toISOString(),
      source: 'test-source',
      subject: 'test-customer',
      data: { index: 3 },
    });

    // Since we're mocking fetch to fail asynchronously,
    // we need to wait for the promise to resolve
    await vi.runAllTimersAsync();

    // Verify fetch was called
    expect(fetchErrorMock).toHaveBeenCalled();

    // Clean up
    errorMetering.dispose();
    global.fetch = originalFetch;
    errorSpy.mockRestore();
    vi.useRealTimers();
    delete process.env.OPENMETER_BATCH_SIZE;
  });

  it('should return success and empty eventIds when flushing with empty queue', async () => {
    // Create instance with clean state
    const emptyQueueMetering = new Metering({
      source: 'test-source',
    });

    const winstonLogger = (await import('../logger/winston')).logger;
    const debugSpy = vi.spyOn(winstonLogger, 'info').mockImplementation((message: Object): Logger => {
      console.log(message);
      return winstonLogger;
    });

    // Spy on fetch to ensure it's not called
    const fetchSpy = vi.spyOn(global, 'fetch');

    // Flush with empty queue
    const result = await emptyQueueMetering.flush();

    // Verify correct result is returned
    expect(result).toEqual({ success: true, eventIds: [] });

    // Verify debug message was logged
    expect(debugSpy).toHaveBeenCalledWith('No events to flush');

    // Verify fetch was not called as there are no events to send
    expect(fetchSpy).not.toHaveBeenCalled();

    // Clean up
    emptyQueueMetering.dispose();
    debugSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it('should log events locally when no API key is provided', async () => {
    // Save original API key
    const originalApiKey = process.env.OPENMETER_API_KEY;

    // Ensure no API key is set
    delete process.env.OPENMETER_API_KEY;

    // Create instance with no API key
    const localMetering = new Metering({
      source: 'local-source',
    });

    const winstonLogger = (await import('../logger/winston')).logger;
    const debugSpy = vi.spyOn(winstonLogger, 'info').mockImplementation((message: Object): Logger => {
      console.log(message);
      return winstonLogger;
    });

    // Spy on fetch to ensure it's not called
    const fetchSpy = vi.spyOn(global, 'fetch');

    // Add events to the queue
    localMetering.track({
      specversion: '1.0',
      type: 'local-event',
      id: 'local-test',
      time: new Date().toISOString(),
      source: 'local-source',
      subject: 'local-subject',
      data: { local: true },
    });

    // Flush events
    const result = await localMetering.flush();

    // Verify correct result is returned
    expect(result).toEqual({ success: true, eventIds: [] });

    // Verify debug messages were logged
    expect(debugSpy).toHaveBeenCalledWith('Remote metering is disabled');
    expect(debugSpy).toHaveBeenCalledWith('METERING_EVENTS', expect.any(Array));

    // Verify fetch was not called
    expect(fetchSpy).not.toHaveBeenCalled();

    // Clean up
    localMetering.dispose();
    debugSpy.mockRestore();
    fetchSpy.mockRestore();

    // Restore original API key
    if (originalApiKey) {
      process.env.OPENMETER_API_KEY = originalApiKey;
    }
  });

  it('should batch events correctly', async () => {
    // Reset mock to ensure clean state
    fetchMock.mockClear();

    // Save original environment variables and set test values
    const savedApiKey = process.env.OPENMETER_API_KEY;
    const savedBatchSize = process.env.OPENMETER_BATCH_SIZE;

    process.env.OPENMETER_API_KEY = 'test-api-key';
    // Explicitly set batch size to avoid interference from other tests
    process.env.OPENMETER_BATCH_SIZE = '10';

    const batchMetering = new Metering({
      source: 'test-source',
    });

    // Stop auto-flush to control the test flow
    batchMetering.stopAutoFlush();

    const createTestEvent = (id: string) => ({
      specversion: '1.0',
      type: 'test-event',
      id,
      time: new Date().toISOString(),
      source: 'test-source',
      subject: 'test-customer',
      data: { id },
    });

    // Track multiple events
    batchMetering.track(createTestEvent('1'));
    batchMetering.track(createTestEvent('2'));
    batchMetering.track(createTestEvent('3'));

    // No auto-flush should happen since we disabled it
    expect(fetchMock).not.toHaveBeenCalled();

    // Manually flush the events
    await batchMetering.flush();

    // Each event should be sent in a separate call
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Check that each event was sent individually
    const calls = fetchMock.mock.calls;

    // Verify each payload contains the right event
    const payload1 = JSON.parse(calls[0][1].body);
    expect(payload1.data.id).toBe('1');

    const payload2 = JSON.parse(calls[1][1].body);
    expect(payload2.data.id).toBe('2');

    const payload3 = JSON.parse(calls[2][1].body);
    expect(payload3.data.id).toBe('3');

    // Clean up
    batchMetering.dispose();
    process.env.OPENMETER_API_KEY = savedApiKey;
    process.env.OPENMETER_BATCH_SIZE = savedBatchSize;
  });
});
