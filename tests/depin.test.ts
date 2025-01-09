import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { DePINTool } from "../src/tools/depin_tool";

describe("DePINTool", () => {
    let depin: DePINTool;

    beforeEach(() => {
        depin = new DePINTool(process.env.DIFY_API_KEY!);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });
});