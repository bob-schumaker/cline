import type { ClineMessage } from "@shared/ExtensionMessage"
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useChatState } from "./useChatState"

const createPromptMessage = (say: "task" | "user_feedback", ts: number, text: string): ClineMessage => ({
	type: "say",
	say,
	text,
	ts,
})

describe("useChatState prompt history navigation", () => {
	it("navigates backward and forward through prompt history without wrapping", () => {
		const { result } = renderHook(() =>
			useChatState([createPromptMessage("task", 1, "initial task"), createPromptMessage("user_feedback", 2, "follow-up")]),
		)

		let handled = false
		act(() => {
			handled = result.current.navigatePromptHistory("previous", "")
		})
		expect(handled).toBe(true)
		expect(result.current.inputValue).toBe("follow-up")

		act(() => {
			handled = result.current.navigatePromptHistory("previous", result.current.inputValue)
		})
		expect(handled).toBe(true)
		expect(result.current.inputValue).toBe("initial task")

		act(() => {
			handled = result.current.navigatePromptHistory("previous", result.current.inputValue)
		})
		expect(handled).toBe(true)
		expect(result.current.inputValue).toBe("initial task")

		act(() => {
			handled = result.current.navigatePromptHistory("next", result.current.inputValue)
		})
		expect(handled).toBe(true)
		expect(result.current.inputValue).toBe("follow-up")

		act(() => {
			handled = result.current.navigatePromptHistory("next", result.current.inputValue)
		})
		expect(handled).toBe(true)
		expect(result.current.inputValue).toBe("")
	})

	it("preserves and restores the draft that existed before navigation", () => {
		const { result } = renderHook(() => useChatState([createPromptMessage("task", 1, "initial task")]))

		act(() => {
			result.current.setInputValue("draft text")
		})

		act(() => {
			result.current.navigatePromptHistory("previous", result.current.inputValue)
		})
		expect(result.current.inputValue).toBe("initial task")

		act(() => {
			result.current.navigatePromptHistory("next", result.current.inputValue)
		})
		expect(result.current.inputValue).toBe("draft text")
	})

	it("resets prompt history navigation state", () => {
		const { result } = renderHook(() => useChatState([createPromptMessage("task", 1, "initial task")]))

		act(() => {
			result.current.navigatePromptHistory("previous", "draft text")
		})
		expect(result.current.inputValue).toBe("initial task")

		act(() => {
			result.current.resetPromptHistoryNavigation()
		})
		expect(result.current.inputValue).toBe("initial task")

		let handled = true
		act(() => {
			handled = result.current.navigatePromptHistory("next", result.current.inputValue)
		})
		expect(handled).toBe(false)
		expect(result.current.inputValue).toBe("initial task")
	})

	it("does nothing when there is no prompt history", () => {
		const { result } = renderHook(() => useChatState([]))

		let handled = true
		act(() => {
			handled = result.current.navigatePromptHistory("previous", "")
		})

		expect(handled).toBe(false)
		expect(result.current.inputValue).toBe("")
	})
})
