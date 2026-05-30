import type { ClineMessage } from "@shared/ExtensionMessage"

export interface PromptHistoryEntry {
	text: string
	ts: number
}

const USER_PROMPT_SAY_TYPES = new Set<ClineMessage["say"]>(["task", "user_feedback"])

export function getPromptHistory(messages: ClineMessage[]): PromptHistoryEntry[] {
	return messages
		.filter((message) => {
			return (
				message.type === "say" &&
				USER_PROMPT_SAY_TYPES.has(message.say) &&
				typeof message.text === "string" &&
				message.text.trim().length > 0
			)
		})
		.map((message) => ({ text: message.text!, ts: message.ts }))
}
