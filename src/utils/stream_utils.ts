import { logger } from "../logger/winston";

export async function handleStreamResponse(
  response: any,
  onData: (data: string) => void,
): Promise<string | undefined> {
  let lastConversationId: string | undefined;

  for await (const chunk of response.data) {
    const lines = chunk.toString().split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.conversation_id) {
            lastConversationId = data.conversation_id;
          }
          if (data.answer) {
            onData(data.answer);
          }
        } catch (e) {
          logger.warn("Failed to parse streaming data:", e);
        }
      }
    }
  }

  return lastConversationId;
}
