export type PromptHistoryNavigationDirection = "previous" | "next"

export interface PromptHistoryNavigationKeyState {
	key: string
	inputValue: string
	isPromptHistoryNavigating: boolean
	isComposing?: boolean
	metaKey?: boolean
	ctrlKey?: boolean
	altKey?: boolean
}

export function getPromptHistoryNavigationDirection({
	key,
	inputValue,
	isPromptHistoryNavigating,
	isComposing = false,
	metaKey = false,
	ctrlKey = false,
	altKey = false,
}: PromptHistoryNavigationKeyState): PromptHistoryNavigationDirection | null {
	if (isComposing || metaKey || ctrlKey || altKey) {
		return null
	}

	if (key === "ArrowUp") {
		if (isPromptHistoryNavigating || inputValue.trim().length === 0) {
			return "previous"
		}
		return null
	}

	if (key === "ArrowDown" && isPromptHistoryNavigating) {
		return "next"
	}

	return null
}
