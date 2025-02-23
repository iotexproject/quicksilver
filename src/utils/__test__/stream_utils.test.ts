import { describe, it, expect, vi } from "vitest";
import { handleStreamResponse } from "../stream_utils";
import { logger } from "../../logger/winston";

describe("handleStreamResponse", () => {
  it("should handle empty stream", async () => {
    const mockResponse = {
      data: [],
    };
    const onData = vi.fn();

    const result = await handleStreamResponse(mockResponse, onData);

    expect(result).toBeUndefined();
    expect(onData).not.toHaveBeenCalled();
  });

  it("should process conversation_id", async () => {
    const mockResponse = {
      data: [Buffer.from('data: {"conversation_id": "123"}\n')],
    };
    const onData = vi.fn();

    const result = await handleStreamResponse(mockResponse, onData);

    expect(result).toBe("123");
    expect(onData).not.toHaveBeenCalled();
  });

  it("should process answer chunks", async () => {
    const mockResponse = {
      data: [
        Buffer.from('data: {"answer": "Hello"}\n'),
        Buffer.from('data: {"answer": " World"}\n'),
      ],
    };
    const onData = vi.fn();

    const result = await handleStreamResponse(mockResponse, onData);

    expect(result).toBeUndefined();
    expect(onData).toHaveBeenCalledTimes(2);
    expect(onData).toHaveBeenNthCalledWith(1, "Hello");
    expect(onData).toHaveBeenNthCalledWith(2, " World");
  });

  it("should handle both conversation_id and answer", async () => {
    const mockResponse = {
      data: [
        Buffer.from('data: {"conversation_id": "123", "answer": "Hello"}\n'),
        Buffer.from('data: {"answer": " World"}\n'),
      ],
    };
    const onData = vi.fn();

    const result = await handleStreamResponse(mockResponse, onData);

    expect(result).toBe("123");
    expect(onData).toHaveBeenCalledTimes(2);
    expect(onData).toHaveBeenNthCalledWith(1, "Hello");
    expect(onData).toHaveBeenNthCalledWith(2, " World");
  });

  it("should handle multiple lines in single chunk", async () => {
    const mockResponse = {
      data: [
        Buffer.from('data: {"answer": "Hello"}\ndata: {"answer": " World"}\n'),
      ],
    };
    const onData = vi.fn();

    const result = await handleStreamResponse(mockResponse, onData);

    expect(result).toBeUndefined();
    expect(onData).toHaveBeenCalledTimes(2);
    expect(onData).toHaveBeenNthCalledWith(1, "Hello");
    expect(onData).toHaveBeenNthCalledWith(2, " World");
  });

  it("should handle invalid JSON gracefully", async () => {
    const consoleSpy = vi
      .spyOn(logger, "warn")
      .mockImplementation(() => logger);
    const mockResponse = {
      data: [Buffer.from('data: {"invalid json\n')],
    };
    const onData = vi.fn();

    const result = await handleStreamResponse(mockResponse, onData);

    expect(result).toBeUndefined();
    expect(onData).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to parse streaming data:",
      expect.any(Error),
    );
  });

  it("should ignore non-data lines", async () => {
    const mockResponse = {
      data: [
        Buffer.from(
          'ignore: {"answer": "Ignore this"}\ndata: {"answer": "Hello"}\n',
        ),
      ],
    };
    const onData = vi.fn();

    const result = await handleStreamResponse(mockResponse, onData);

    expect(result).toBeUndefined();
    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith("Hello");
  });

  it("should handle empty data lines", async () => {
    const mockResponse = {
      data: [Buffer.from('data: \ndata: {"answer": "Hello"}\n')],
    };
    const onData = vi.fn();

    const result = await handleStreamResponse(mockResponse, onData);

    expect(result).toBeUndefined();
    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith("Hello");
  });
});
