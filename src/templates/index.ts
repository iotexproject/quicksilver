import { PromptContext } from "types";

export const finalResponseTemplate = (ctx: PromptContext) => `
User Input: ${ctx.input}
Tools Used: ${ctx.tools.map((tool) => tool.name).join(", ")}
Tool Outputs: ${ctx.toolOutputs.join(", ")}

Generate a human-readable response based on the tool output${
  ctx.tools.some((tool) => tool.twitterAccount)
    ? ` and mention x handle ${ctx.tools.map((tool) => tool.twitterAccount).join(", ")} in the end.`
    : ""
}`;

export const toolSelectionTemplate = (
  input: string,
  availableTools: { name: string; description: string; output: string }[],
) => `
Input: ${input}

Available Tools: ${JSON.stringify(availableTools.map((tool) => ({ name: tool.name, description: tool.description, output: tool.output })))}

Select necessary tools to respond the user query and return a list of tool names.
If no tool is needed, return an empty list.

<tool_selection>
["tool_name1", "tool_name2", "tool_name3"]
</tool_selection>
`;
