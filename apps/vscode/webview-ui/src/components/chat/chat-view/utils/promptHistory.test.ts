import type { ClineMessage } from "@shared/ExtensionMessage"
import { describe, expect, it } from "vitest"
import { getPromptHistory } from "./promptHistory"

const createSayMessage = (say: ClineMessage["say"], ts: number, text?: string): ClineMessage => ({
	type: "say",
	say,
	text,
	ts,
})

const createAskMessage = (ask: ClineMessage["ask"], ts: number, text?: string): ClineMessage => ({
	type: "ask",
	ask,
	text,
	ts,
})

describe("getPromptHistory", () => {
	it("includes the initial task prompt and later user feedback", () => {
		const history = getPromptHistory([
			createSayMessage("task", 1, "initial task"),
			createSayMessage("user_feedback", 2, "follow-up prompt"),
		])

		expect(history).toEqual([
			{ text: "initial task", ts: 1 },
			{ text: "follow-up prompt", ts: 2 },
		])
	})

	it("excludes empty prompt text", () => {
		const history = getPromptHistory([
			createSayMessage("task", 1, ""),
			createSayMessage("user_feedback", 2, "   "),
			createSayMessage("user_feedback", 3, "real prompt"),
		])

		expect(history).toEqual([{ text: "real prompt", ts: 3 }])
	})

	it("excludes non-user message types", () => {
		const history = getPromptHistory([
			createSayMessage("text", 1, "assistant response"),
			createAskMessage("tool", 2, "tool approval"),
			createSayMessage("api_req_started", 3, "api metadata"),
			createSayMessage("user_feedback_diff", 4, "diff feedback"),
			createSayMessage("task", 5, "user task"),
		])

		expect(history).toEqual([{ text: "user task", ts: 5 }])
	})

	it("preserves chronological order and duplicate prompts", () => {
		const history = getPromptHistory([
			createSayMessage("task", 1, "repeat"),
			createSayMessage("user_feedback", 2, "middle"),
			createSayMessage("user_feedback", 3, "repeat"),
		])

		expect(history).toEqual([
			{ text: "repeat", ts: 1 },
			{ text: "middle", ts: 2 },
			{ text: "repeat", ts: 3 },
		])
	})
})
