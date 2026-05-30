import { describe, expect, it } from "vitest"
import { getPromptHistoryNavigationDirection } from "./promptHistoryNavigation"

describe("getPromptHistoryNavigationDirection", () => {
	it("starts previous history navigation from an empty input", () => {
		expect(
			getPromptHistoryNavigationDirection({
				key: "ArrowUp",
				inputValue: "",
				isPromptHistoryNavigating: false,
			}),
		).toBe("previous")
	})

	it("does not start previous history navigation from a non-empty input", () => {
		expect(
			getPromptHistoryNavigationDirection({
				key: "ArrowUp",
				inputValue: "draft",
				isPromptHistoryNavigating: false,
			}),
		).toBeNull()
	})

	it("continues navigation with previous and next once history navigation is active", () => {
		expect(
			getPromptHistoryNavigationDirection({
				key: "ArrowUp",
				inputValue: "history item",
				isPromptHistoryNavigating: true,
			}),
		).toBe("previous")

		expect(
			getPromptHistoryNavigationDirection({
				key: "ArrowDown",
				inputValue: "history item",
				isPromptHistoryNavigating: true,
			}),
		).toBe("next")
	})

	it("does not navigate next when history navigation is inactive", () => {
		expect(
			getPromptHistoryNavigationDirection({
				key: "ArrowDown",
				inputValue: "",
				isPromptHistoryNavigating: false,
			}),
		).toBeNull()
	})

	it("ignores composing events and modified arrow keys", () => {
		expect(
			getPromptHistoryNavigationDirection({
				key: "ArrowUp",
				inputValue: "",
				isComposing: true,
				isPromptHistoryNavigating: false,
			}),
		).toBeNull()

		expect(
			getPromptHistoryNavigationDirection({
				key: "ArrowUp",
				inputValue: "",
				metaKey: true,
				isPromptHistoryNavigating: false,
			}),
		).toBeNull()
	})
})
