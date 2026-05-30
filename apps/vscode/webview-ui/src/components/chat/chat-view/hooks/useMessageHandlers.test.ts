import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ChatState } from "../types/chatTypes"
import { useMessageHandlers } from "./useMessageHandlers"

const grpcMocks = vi.hoisted(() => ({
	newTask: vi.fn(),
}))

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => ({
		backgroundCommandRunning: false,
	}),
}))

vi.mock("@/services/grpc-client", () => ({
	SlashServiceClient: {
		condense: vi.fn(),
		reportBug: vi.fn(),
	},
	TaskServiceClient: {
		askResponse: vi.fn(),
		cancelBackgroundCommand: vi.fn(),
		cancelTask: vi.fn(),
		clearTask: vi.fn(),
		newTask: grpcMocks.newTask,
	},
}))

const createChatState = (overrides: Partial<ChatState> = {}): ChatState => ({
	inputValue: "",
	setInputValue: vi.fn(),
	activeQuote: null,
	setActiveQuote: vi.fn(),
	isTextAreaFocused: false,
	setIsTextAreaFocused: vi.fn(),
	selectedImages: [],
	setSelectedImages: vi.fn(),
	selectedFiles: [],
	setSelectedFiles: vi.fn(),
	sendingDisabled: false,
	setSendingDisabled: vi.fn(),
	enableButtons: false,
	setEnableButtons: vi.fn(),
	primaryButtonText: "Approve",
	setPrimaryButtonText: vi.fn(),
	secondaryButtonText: "Reject",
	setSecondaryButtonText: vi.fn(),
	expandedRows: {},
	setExpandedRows: vi.fn(),
	textAreaRef: { current: null },
	lastMessage: undefined,
	secondLastMessage: undefined,
	clineAsk: undefined,
	task: undefined,
	isPromptHistoryNavigating: false,
	handleFocusChange: vi.fn(),
	clearExpandedRows: vi.fn(),
	resetState: vi.fn(),
	navigatePromptHistory: vi.fn(),
	resetPromptHistoryNavigation: vi.fn(),
	...overrides,
})

describe("useMessageHandlers prompt history navigation", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("resets prompt history navigation after a message is sent", async () => {
		const resetPromptHistoryNavigation = vi.fn()
		const chatState = createChatState({ resetPromptHistoryNavigation })
		const { result } = renderHook(() => useMessageHandlers([], chatState))

		await act(async () => {
			await result.current.handleSendMessage("hello", [], [])
		})

		expect(grpcMocks.newTask).toHaveBeenCalledOnce()
		expect(resetPromptHistoryNavigation).toHaveBeenCalledOnce()
	})
})
