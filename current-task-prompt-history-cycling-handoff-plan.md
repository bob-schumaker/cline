# Current-Task Prompt History Cycling Handoff Plan

## Goal

Add terminal-style prompt history navigation to the VS Code webview chat input so users can press **Up/Down** in the input box to cycle through prior **text prompts from the current task**.

This first implementation should be deliberately narrow:

- current task only
- text-only history
- no persistence changes
- no backend/proto changes
- no cross-task prompt history
- no image/file restoration
- no behavior change while slash/context menus are open

## Handoff Role

- Type: internal implementation handoff plan
- Audience: future Cline session or developer implementing the first slice
- Authority: supporting implementation plan; repository source remains authoritative
- Paired artifacts: none

## Current Status

- Done: Slice 1 added a current-task text prompt-history derivation helper and
  focused tests in commit `4bc5715c2`. Slice 2 added prompt-history navigation
  state/actions to `useChatState(messages)` in commit `d067ee76`.
- In progress: No implementation slice is currently active.
- Remaining: Slice 3 should pass prompt-history navigation callbacks through
  `InputSection`.

## Slice Progress

- [x] Slice 1 — extract prompt-history helper (`4bc5715c2`)
- [x] Slice 2 — add prompt-history navigation state to `useChatState` (`d067ee76`)
- [ ] Slice 3 — pass navigation callbacks through `InputSection`
- [ ] Slice 4 — add narrow keydown integration in `ChatTextArea`
- [ ] Slice 5 — preserve draft on send/reset
- [ ] Slice 6 — add focused navigation tests where feasible
- [ ] Slice 7 — run final validation for the implemented prompt-history flow
- Next active slice: Slice 3 — pass navigation callbacks through `InputSection`

## Validation Performed

- RED: `cd apps/vscode/webview-ui && npm run test -- src/components/chat/chat-view/utils/promptHistory.test.ts 2>&1` — fail — expected missing-module failure for `./promptHistory` before the helper existed.
- GREEN: `cd apps/vscode/webview-ui && npm run test -- src/components/chat/chat-view/utils/promptHistory.test.ts 2>&1` — pass — 4 prompt-history helper tests passed.
- Format/check: `cd apps/vscode && npx biome check webview-ui/src/components/chat/chat-view/utils/promptHistory.ts webview-ui/src/components/chat/chat-view/utils/promptHistory.test.ts --no-errors-on-unmatched --files-ignore-unknown=true --diagnostic-level=error 2>&1` — pass — checked 2 files with no fixes applied.
- Pre-commit: `pre-commit run --files apps/vscode/webview-ui/src/components/chat/chat-view/utils/promptHistory.ts apps/vscode/webview-ui/src/components/chat/chat-view/utils/promptHistory.test.ts 2>&1` — fail/not available — repository checkout has no `.pre-commit-config.yaml` file.
- Slice 2 RED: `cd apps/vscode/webview-ui && npm run test -- src/components/chat/chat-view/hooks/useChatState.test.ts 2>&1` — fail — expected missing-function failures for `navigatePromptHistory` before the hook exposed navigation actions.
- Slice 2 GREEN: `cd apps/vscode/webview-ui && npm run test -- src/components/chat/chat-view/hooks/useChatState.test.ts src/components/chat/chat-view/utils/promptHistory.test.ts 2>&1` — pass — 8 hook/helper tests passed.
- Slice 2 format/check: `cd apps/vscode && npx biome check webview-ui/src/components/chat/chat-view/hooks/useChatState.ts webview-ui/src/components/chat/chat-view/hooks/useChatState.test.ts webview-ui/src/components/chat/chat-view/types/chatTypes.ts --no-errors-on-unmatched --files-ignore-unknown=true --diagnostic-level=error 2>&1` — pass after adding a final newline to `useChatState.test.ts` — checked 3 files with no fixes applied.
- Slice 2 pre-commit: `pre-commit run --files apps/vscode/webview-ui/src/components/chat/chat-view/hooks/useChatState.ts apps/vscode/webview-ui/src/components/chat/chat-view/hooks/useChatState.test.ts apps/vscode/webview-ui/src/components/chat/chat-view/types/chatTypes.ts 2>&1` — fail/not available — repository checkout has no `.pre-commit-config.yaml` file.

## Relevant Existing Code

### Chat state and message availability

- `apps/vscode/webview-ui/src/components/chat/ChatView.tsx`
  - Reads `clineMessages` as `messages` from `useExtensionState()` around lines `46-57`.
  - Passes `messages` into `useChatState(messages)` around line `75`.

- `apps/vscode/webview-ui/src/components/chat/chat-view/hooks/useChatState.ts`
  - Owns `inputValue` and `setInputValue`.
  - Already receives all current-task `messages`.
  - Best first place to derive prompt history and hold history-navigation state.

- `apps/vscode/src/shared/ExtensionMessage.ts`
  - `ClineMessage` has `type`, `say`, `text`, `images`, `files`, etc.
  - `ClineSay` includes:
    - `task`
    - `user_feedback`
    - `user_feedback_diff`

### Where prompt messages come from

- Initial task prompt:
  - `apps/vscode/src/core/task/index.ts:1058-1072`
  - Stored as `say: "task"`.

- Later user replies/feedback:
  - `apps/vscode/src/core/task/index.ts:1299-1304`
  - `apps/vscode/src/core/task/index.ts:2408`
  - Stored as `say: "user_feedback"`.

### Chat input

- `apps/vscode/webview-ui/src/components/chat/chat-view/components/layout/InputSection.tsx`
  - Passes `inputValue`, `setInputValue`, etc. into `ChatTextArea`.

- `apps/vscode/webview-ui/src/components/chat/ChatTextArea.tsx`
  - Props currently do **not** include message history.
  - `handleKeyDown` already owns keyboard behavior.
  - Existing arrow-key behavior is used by:
    - slash commands menu around `471-503`
    - context menu around `522-545`
  - Any prompt-history behavior must not interfere with those menus.

## Proposed First-Slice Scope

### In scope

1. Derive an ordered text prompt history from current-task `messages`.
2. Allow Up/Down cycling only when safe.
3. Preserve the user’s unsent draft while navigating history.
4. Restore the unsent draft when navigating back past the newest history entry.
5. Reset history cursor when the user edits input normally or sends a message.
6. Add focused tests for the pure derivation/navigation logic if feasible.

### Out of scope

1. Restoring images/files from prior prompts.
2. Cross-task prompt history.
3. Disk-backed prompt history.
4. Backend/proto changes.
5. CLI/TUI implementation.
6. Adding UI settings/toggles.
7. Rewriting chat input behavior broadly.

## Data Model Recommendation

Add a small prompt-history model in webview state, most likely in `useChatState.ts` or a small helper file.

### History entry type

For the first slice, text-only is enough:

```ts
type PromptHistoryEntry = {
  text: string
  ts: number
}
```

Keep `ts` only for stable ordering/debugging. Do not expose it in UI.

### Derivation rule

Derive from current task `messages`:

```ts
const promptHistory = messages
  .filter((message) =>
    message.type === "say" &&
    (message.say === "task" || message.say === "user_feedback") &&
    typeof message.text === "string" &&
    message.text.trim().length > 0
  )
  .map((message) => ({ text: message.text!, ts: message.ts }))
```

For the safest first implementation, exclude:

- `user_feedback_diff`
- messages with images/files but no text
- synthetic internal context blocks unless they appear in `user_feedback` text and are already user-visible

### Optional duplicate handling

Safest behavior: preserve exact chronological history, including duplicates. Deduping can be added later if users want it.

## Navigation State Recommendation

Maintain state in `useChatState(messages)`:

```ts
const [promptHistoryIndex, setPromptHistoryIndex] = useState<number | null>(null)
const draftBeforePromptHistoryNavigationRef = useRef<string | null>(null)
```

Interpretation:

- `null` means not currently navigating history.
- `0..promptHistory.length - 1` points into `promptHistory`.
- Index order should match chronological order, where `promptHistory.length - 1` is the newest prompt.

### Navigation behavior

- Press `ArrowUp`:
  - If history is empty, do nothing.
  - If not currently navigating:
    - store current `inputValue` in `draftBeforePromptHistoryNavigationRef`
    - load newest prompt: `promptHistory[promptHistory.length - 1]`
  - If already navigating and not at oldest:
    - decrement index
  - If already at oldest:
    - keep oldest selected; do not wrap.

- Press `ArrowDown`:
  - If not navigating, let native textarea behavior continue.
  - If navigating and not at newest:
    - increment index
  - If navigating and at newest:
    - restore draft from `draftBeforePromptHistoryNavigationRef.current ?? ""`
    - set index to `null`
    - clear draft ref

Do **not** wrap around. Non-wrapping matches common shell/input history behavior and avoids surprise.

## Safe Key Handling Rules

Add a handler exposed by chat state, e.g.:

```ts
navigatePromptHistory(direction: "previous" | "next", currentInputValue: string): boolean
resetPromptHistoryNavigation(): void
```

Return `true` when the key was handled and default behavior should be prevented.

### Only handle Up/Down when all are true

1. `ChatTextArea` is focused.
2. Slash command menu is not open.
3. Context menu is not open.
4. IME composition is not active.
5. No modifier keys that should preserve native/editor behavior:
   - no `metaKey`
   - no `ctrlKey`
   - no `altKey`
6. Cursor is in an appropriate location:
   - Up: cursor is on the first visual/logical line, or input is empty.
   - Down: cursor is on the last visual/logical line, or currently navigating history.

A simpler but safe first version can be even stricter:

- Only start history navigation with Up when `inputValue.trim() === ""`.
- Once navigation has started, Up/Down continue cycling.

That avoids hijacking multiline editing. It is less powerful but safest.

## Recommended First Implementation Strategy

### Step 1 — Extract prompt-history helper

Create a small helper near chat-view hooks, for example:

```text
apps/vscode/webview-ui/src/components/chat/chat-view/utils/promptHistory.ts
```

Suggested exports:

```ts
export interface PromptHistoryEntry {
  text: string
  ts: number
}

export function getPromptHistory(messages: ClineMessage[]): PromptHistoryEntry[]
```

Why helper first:

- easier to test
- avoids bloating `useChatState.ts`
- keeps message filtering rules explicit

### Step 2 — Add prompt-history state to `useChatState`

In `useChatState(messages)`:

- derive `promptHistory` with `useMemo`
- add navigation cursor state/ref
- add `navigatePromptHistory`
- add `resetPromptHistoryNavigation`
- reset cursor when task changes (`task?.ts`) or promptHistory shrinks unexpectedly

Return these from `ChatState`.

Update type definitions in:

```text
apps/vscode/webview-ui/src/components/chat/chat-view/types/chatTypes.ts
```

### Step 3 — Pass navigation callbacks through `InputSection`

In `InputSection.tsx`, pull from `chatState`:

```ts
navigatePromptHistory
resetPromptHistoryNavigation
```

Pass them into `ChatTextArea` as optional props.

### Step 4 — Add narrow keydown integration in `ChatTextArea`

In `ChatTextArea.tsx`:

1. Extend props with:

```ts
navigatePromptHistory?: (direction: "previous" | "next", currentInputValue: string) => boolean
resetPromptHistoryNavigation?: () => void
```

2. In `handleKeyDown`, after slash/context menu arrow handling and before generic Enter/backspace logic, add something like:

```ts
if (
  (event.key === "ArrowUp" || event.key === "ArrowDown") &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.altKey &&
  !event.nativeEvent.isComposing &&
  !showSlashCommandsMenu &&
  !showContextMenu
) {
  const direction = event.key === "ArrowUp" ? "previous" : "next"
  const handled = navigatePromptHistory?.(direction, inputValue)
  if (handled) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
}
```

3. On normal input changes, call `resetPromptHistoryNavigation` when the user typed rather than when history navigation set the value.

Implementation detail: avoid resetting immediately after history navigation itself. Easiest approach is to let the navigation function own the state and reset from `handleInputChange` only on actual change events triggered by the user. If React fires `onChange` from programmatic `setInputValue`, verify behavior; if it does, add a ref guard.

### Step 5 — Preserve draft on send/reset

When `useMessageHandlers.handleSendMessage` sends a message, it already calls `setInputValue("")` around lines `119-126`.

Add a call to `resetPromptHistoryNavigation()` there if exposed through `chatState`, or ensure `useChatState.resetState()` clears prompt-history cursor/ref.

### Step 6 — Add focused tests

Suggested tests should cover helper/state logic, not full DOM unless the project has existing convenient React tests for `ChatTextArea`.

Minimum helper tests:

- includes initial `say: "task"` text
- includes later `say: "user_feedback"` text
- excludes empty text
- excludes non-user messages like `say: "text"`, `ask: "tool"`, `say: "api_req_started"`
- preserves chronological order

If adding hook tests is feasible:

- Up from empty input selects newest prompt
- Up again selects previous prompt
- Down moves forward
- Down from newest restores unsent draft
- task change resets cursor/draft

Potential test location:

```text
apps/vscode/webview-ui/src/components/chat/chat-view/utils/promptHistory.test.ts
```

or colocated with existing chat-view tests if conventions differ.

## Edge Cases to Handle Explicitly

1. **No history**
   - Up/Down do nothing.

2. **Single prompt**
   - Up selects it.
   - Repeated Up stays there.
   - Down restores draft.

3. **Draft exists before navigation**
   - Up stores draft.
   - Down past newest restores draft exactly.

4. **User edits while viewing history item**
   - Reset navigation cursor.
   - Edited text becomes ordinary current draft.

5. **Slash command menu open**
   - Arrow keys continue moving slash-command selection.

6. **Context menu open**
   - Arrow keys continue moving context-menu selection.

7. **Multiline input**
   - First slice should avoid hijacking Up/Down during normal multiline cursor movement.
   - Prefer strict start condition: only begin history navigation when input is empty.

8. **Images/files**
   - Do not restore in first slice.
   - If selected images/files currently exist while cycling text history, leave them alone.

9. **Resumed task**
   - Since `clineMessages` are loaded into webview state, current-task prompt history should work after resume as long as those messages are present.

## Validation Plan

Run the narrowest available validation first. Check `apps/vscode/package.json` for exact scripts before running.

Likely validation commands:

```bash
cd apps/vscode && npm run typecheck
```

or, if project conventions indicate:

```bash
cd apps/vscode && npm run test:unit -- ChatTextArea
```

Also do a manual UI check in VS Code:

1. Start a task with text prompt A.
2. Reply with prompt B at a follow-up or mistake-limit prompt.
3. Focus empty input.
4. Press Up: expect prompt B.
5. Press Up again: expect prompt A.
6. Press Down: expect prompt B.
7. Press Down again: expect empty draft.
8. Type a draft, press Up: behavior depends on chosen strictness:
   - strict first slice: should not navigate unless empty
   - more terminal-like slice: should store draft and navigate
9. Open slash-command menu and confirm Up/Down still navigate menu, not history.
10. Type multiline text and confirm Up/Down still move caret unless intentionally at a safe boundary.

## Implementation Risks

### Risk 1 — Hijacking textarea navigation

Most important UX risk. Users expect Up/Down to move caret in multiline text.

Mitigation:

- strict first slice: only start history navigation when input is empty
- continue navigation only once history mode is active
- never run while menus are open

### Risk 2 — Losing unsent draft

Mitigation:

- store draft before first history navigation
- restore draft when navigating down past newest
- reset only after send/task change/user edit

### Risk 3 — Accidentally including non-user/system text

Mitigation:

- only include `say: "task"` and `say: "user_feedback"`
- exclude `ask` messages and assistant text
- exclude empty strings

### Risk 4 — Programmatic `setInputValue` resets navigation state

Mitigation:

- if needed, use a ref guard around history-driven `setInputValue`

```ts
const isApplyingPromptHistoryRef = useRef(false)
```

Set true before `setInputValue(historyText)`, then clear in microtask or immediately after depending on event behavior.

## Suggested Handoff Prompt for Next Implementer

Continue the implementation of current-task prompt-history cycling in the VS Code webview chat input. Use this plan as the source of truth. Keep the first slice narrow: current-task, text-only, no backend/proto changes, no cross-task history, and no image/file restoration. Derive history from `clineMessages` entries where `type === "say"` and `say` is `"task"` or `"user_feedback"`. Implement safe Up/Down navigation without interfering with slash-command/context-menu navigation or normal multiline textarea caret movement. Preserve the user’s unsent draft while navigating. Add focused tests for prompt-history derivation and navigation behavior where practical, then run the narrowest relevant validation commands and report exact outcomes.
