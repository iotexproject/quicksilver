import { PromptContext } from "types";

export const finalResponseTemplate = (ctx: PromptContext) => `
User Input: ${ctx.input}
Tool Used: ${ctx.tool.name}
Tool Input: ${ctx.toolInput}
Tool Output: ${ctx.toolOutput}

Generate a human-readable response based on the tool output${
  ctx.tool.twitterAccount
    ? ` and mention x handle ${ctx.tool.twitterAccount} in the end.`
    : ""
}`;

export const toolSelectionTemplate = (
    input: string,
    availableTools: { name: string; description: string }[],
  ) => `
Input: ${input}

Available Tools: ${JSON.stringify(availableTools.map(tool => ({name: tool.name, description: tool.description})))}

Only respond with a JSON object in the following format:
\`\`\`json
{
    "tool": "tool_name_or_null", // The name of the tool to use, or null if no tool is needed
    "tool_input": "input_for_the_tool" // The input to pass to the tool in json format (only if a tool is selected)
}
\`\`\`
If no tool is needed, set "tool" to null.
`;
