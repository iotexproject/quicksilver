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

    it("should correctly query the depin tool", async () => {
        const response = await depin.execute("What is the current IOTX price?");
        expect(response).toContain("price");
    });

    it("should correctly query the depin tool with a project name", async () => {
        const response = await depin.execute("what is the dimo project?");
        console.log("🚀 ~ it ~ response:", response)
        expect(response).toContain("DIMO");
    });
});