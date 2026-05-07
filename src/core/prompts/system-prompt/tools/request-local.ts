import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"
import { TASK_PROGRESS_PARAMETER } from "../types"

const condenseToolSpec = (variant: ModelFamily): ClineToolSpec => ({
	variant,
	id: ClineDefaultTool.CONDENSE,
	name: "condense",
	description:
		"Create a detailed summary of the conversation so far so the current context window can be compacted while retaining key information. The user will be shown the summary and can choose whether to use it.",
	parameters: [
		{
			name: "context",
			required: true,
			instruction: `The context to continue the conversation with. If applicable based on the current task, include:
1. Previous Conversation: High level details about what was discussed throughout the entire conversation with the user.
2. Current Work: Detail what was being worked on before compacting, especially recent messages.
3. Key Technical Concepts: Important technologies, conventions, and architectural decisions.
4. Relevant Files and Code: Files examined, modified, or created, including important snippets when helpful.
5. Problem Solving: Problems solved and any ongoing troubleshooting.
6. Pending Tasks and Next Steps: Explicit pending tasks and exact next steps, including direct quotes from the recent conversation when needed to prevent context loss.`,
			usage: "Detailed conversation summary",
		},
		{
			...TASK_PROGRESS_PARAMETER,
			required: false,
			contextRequirements: (context) => context.focusChainSettings?.enabled === true,
		},
	],
})

export function getRequestLocalToolSpec(tool: ClineDefaultTool, variant: ModelFamily): ClineToolSpec | undefined {
	switch (tool) {
		case ClineDefaultTool.CONDENSE:
			return condenseToolSpec(variant)
		default:
			return undefined
	}
}
