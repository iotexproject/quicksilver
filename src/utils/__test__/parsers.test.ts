import { describe, it, expect } from "vitest";
import { extractContentFromTags } from "../parsers";

describe("extractContentFromTags", () => {
  it("should extract content between tags", () => {
    const content = "<test>Hello World</test>";
    const result = extractContentFromTags(content, "test");
    expect(result).toBe("Hello World");
  });

  it("should handle multiline content", () => {
    const content = `<test>
      Hello
      World
    </test>`;
    const result = extractContentFromTags(content, "test");
    expect(result).toBe("\n      Hello\n      World\n    ");
  });

  it("should return null if tags not found", () => {
    const content = "Hello World";
    const result = extractContentFromTags(content, "test");
    expect(result).toBeNull();
  });

  it("should return empty string if content is empty", () => {
    const content = "<test></test>";
    const result = extractContentFromTags(content, "test");
    expect(result).toBe("");
  });

  it("should handle different tag names", () => {
    const content = "<custom_tag>Custom Content</custom_tag>";
    const result = extractContentFromTags(content, "custom_tag");
    expect(result).toBe("Custom Content");
  });

  it("should handle nested tags", () => {
    const content = "<test><nested>Nested Content</nested></test>";
    const result = extractContentFromTags(content, "test");
    expect(result).toBe("<nested>Nested Content</nested>");
  });

  it("should extract json from tags", () => {
    const content = '<test>{"name": "John", "age": 30}</test>';
    const result = extractContentFromTags(content, "test");
    expect(result).toBe('{"name": "John", "age": 30}');
  });
});
