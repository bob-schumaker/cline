import { ClineMessage } from "@shared/ExtensionMessage"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChatState } from "../types/chatTypes"
import { getPromptHistory } from "../utils/promptHistory"

/**
 * Custom hook for managing chat state
 * Handles input values, selection states, and UI state
 */
export function useChatState(messages: ClineMessage[]): ChatState {
	// Input and selection state
	const [inputValue, setInputValue] = useState("")
	const [activeQuote, setActiveQuote] = useState<string | null>(null)
	const [isTextAreaFocused, setIsTextAreaFocused] = useState(false)
	const [selectedImages, setSelectedImages] = useState<string[]>([])
	const [selectedFiles, setSelectedFiles] = useState<string[]>([])

	// UI state
	const [sendingDisabled, setSendingDisabled] = useState(false)
	const [enableButtons, setEnableButtons] = useState<boolean>(false)
	const [primaryButtonText, setPrimaryButtonText] = useState<string | undefined>("Approve")
	const [secondaryButtonText, setSecondaryButtonText] = useState<string | undefined>("Reject")
	const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})

	// Refs
	const textAreaRef = useRef<HTMLTextAreaElement>(null)
	const draftBeforePromptHistoryNavigationRef = useRef<string | null>(null)

	// Derived state
	const lastMessage = useMemo(() => messages.at(-1), [messages])
	const secondLastMessage = useMemo(() => messages.at(-2), [messages])
	const clineAsk = useMemo(() => (lastMessage?.type === "ask" ? lastMessage.ask : undefined), [lastMessage])
	const promptHistory = useMemo(() => getPromptHistory(messages), [messages])
	const [promptHistoryIndex, setPromptHistoryIndex] = useState<number | null>(null)

	// Clear expanded rows when task changes
	const task = useMemo(() => messages.at(0), [messages])
	const clearExpandedRows = useCallback(() => {
		setExpandedRows({})
	}, [])

	// Reset state when starting new conversation
	const resetState = useCallback(() => {
		setInputValue("")
		setActiveQuote(null)
		setSelectedImages([])
		setSelectedFiles([])
		setPromptHistoryIndex(null)
		draftBeforePromptHistoryNavigationRef.current = null
	}, [])

	const resetPromptHistoryNavigation = useCallback(() => {
		setPromptHistoryIndex(null)
		draftBeforePromptHistoryNavigationRef.current = null
	}, [])

	const navigatePromptHistory = useCallback(
		(direction: "previous" | "next", currentInputValue: string): boolean => {
			if (promptHistory.length === 0) {
				return false
			}

			if (direction === "next" && promptHistoryIndex === null) {
				return false
			}

			if (direction === "previous") {
				const nextIndex = promptHistoryIndex === null ? promptHistory.length - 1 : Math.max(promptHistoryIndex - 1, 0)

				if (promptHistoryIndex === null) {
					draftBeforePromptHistoryNavigationRef.current = currentInputValue
				}

				setPromptHistoryIndex(nextIndex)
				setInputValue(promptHistory[nextIndex].text)
				return true
			}

			const nextIndex = promptHistoryIndex + 1
			if (nextIndex >= promptHistory.length) {
				setPromptHistoryIndex(null)
				setInputValue(draftBeforePromptHistoryNavigationRef.current ?? "")
				draftBeforePromptHistoryNavigationRef.current = null
				return true
			}

			setPromptHistoryIndex(nextIndex)
			setInputValue(promptHistory[nextIndex].text)
			return true
		},
		[promptHistory, promptHistoryIndex],
	)

	// Handle focus change
	const handleFocusChange = useCallback((isFocused: boolean) => {
		setIsTextAreaFocused(isFocused)
	}, [])

	// Auto-expand last message row when task or messages first changed.
	useEffect(() => {
		clearExpandedRows()
		resetPromptHistoryNavigation()
	}, [task?.ts, clearExpandedRows])

	useEffect(() => {
		if (promptHistoryIndex !== null && promptHistoryIndex >= promptHistory.length) {
			resetPromptHistoryNavigation()
		}
	}, [promptHistory.length, promptHistoryIndex, resetPromptHistoryNavigation])

	return {
		// State values
		inputValue,
		setInputValue,
		activeQuote,
		setActiveQuote,
		isTextAreaFocused,
		setIsTextAreaFocused,
		selectedImages,
		setSelectedImages,
		selectedFiles,
		setSelectedFiles,
		sendingDisabled,
		setSendingDisabled,
		enableButtons,
		setEnableButtons,
		primaryButtonText,
		setPrimaryButtonText,
		secondaryButtonText,
		setSecondaryButtonText,
		expandedRows,
		setExpandedRows,

		// Refs
		textAreaRef,

		// Derived values
		lastMessage,
		secondLastMessage,
		clineAsk,
		task,

		// Handlers
		handleFocusChange,
		clearExpandedRows,
		resetState,
		navigatePromptHistory,
		resetPromptHistoryNavigation,
	}
}
