# Condense Request-Local Native Tool Handoff

## Goal

- Preserve the full investigation and implementation context for fixing why Cline `/smol` / `/compact` condense instructions can request a `condense` tool that is not visible in native-tool sessions.
- Combine this Cline source-repository work with relevant findings from the external Power Tetris handoff at `/Users/roschuma/Repos/roschuma/power-tetris/cline-tasks/condense-tool-investigation-handoff.md`.
- Provide a future Cline session enough verified context to continue, review, push, open a PR, or adjust the implementation without rediscovering the issue.

## Handoff Role

- Type: internal resume handoff
- Audience: future Cline session or developer continuing the Cline source-repository fix
- Authority: authoritative restart document for this Cline repository task state
- Paired artifacts:
  - `/Users/roschuma/Repos/roschuma/power-tetris/cline-tasks/condense-tool-investigation-handoff.md` — supporting/historical; original installed-extension investigation and evidence bundle
  - `condense-request-local-native-tool-handoff.md` — authoritative for the current Cline source repository branch and implementation state

## Current Status

- Done:
  - Investigated why `condense` was not exposed in the current task/tool surface despite `/compact` / `/smol` injecting `<explicit_instructions type="condense">`.
  - Created branch `cobblers/request-local-condense-native-tool`.
  - Implemented Option B: request-local native tool exposure for `/compact` / `/smol`, rather than globally adding `condense` to every prompt variant.
  - Added regression tests for slash command metadata and request-local native tool generation.
  - Committed implementation and tests in two separate conventional commits.
  - User reported full validation passed after environment refresh: `npm run test` and `npm run compile -- --noEmit`.
- In progress:
  - This handoff note has been moved to the repository root and is being committed as a root-level local handoff artifact.
- Remaining:
  - Use this committed root-level handoff as the restart artifact for future continuation.
  - Optionally push the branch and create a PR.
  - If reviewing further, verify whether the request-local approach should also be applied to `summarize_task` in a separate task; current implementation intentionally only targets manual `/compact` / `/smol` condense.

## Repository Context

- Repo root: `/Users/roschuma/Repos/github/cline`
- Current branch at latest check: `cobblers/request-local-condense-native-tool`
- Latest `git status --short --branch` observed before writing this handoff:

  ```text
  ## cobblers/request-local-condense-native-tool
  ?? .vscode/cline.code-workspace
  ```

- The untracked `.vscode/cline.code-workspace` file is unrelated local workspace noise and was intentionally left unstaged.
- Latest observed commits:

  ```text
  cf1b78b1 test(prompt): cover request-local condense native tools
  e3dbe74f feat(prompt): expose condense as request-local native tool
  f936d53d fix(openrouter): enable cache control for Qwen models (#10578)
  90c81122 At-mention picker: show "Searching..." instead of misleading "No results found" (#10478)
  86f46349 bump versions and changelog (#10503)
  ```

## Model Used

- Exact model name was not exposed by the interface in this session.

## Branch and Integration State

- Working branch: `cobblers/request-local-condense-native-tool`
- Base branch at branch creation: `main` at/near `f936d53d25124b6552d126ae5d569497274f1093`
- Relevant commits created in this task:
  - `e3dbe74f` — `feat(prompt): expose condense as request-local native tool`
  - `cf1b78b1` — `test(prompt): cover request-local condense native tools`
- Planned integration method: normal PR/merge from `cobblers/request-local-condense-native-tool` into the upstream target branch after review.
- Backup branches: none created.
- Staging/commit state:
  - Implementation and tests are committed.
  - This handoff note is committed as a root-level local handoff artifact.
  - `.vscode/cline.code-workspace` remains unrelated and should stay unstaged unless the user explicitly says otherwise.

## Files Reviewed

- `src/core/prompts/commands.ts` — confirmed `condenseToolResponse(...)` injects XML-only instructions for `/smol` / `/compact` and does not include native-tool-specific handling.
- `src/core/slash-commands/index.ts` — confirmed slash command preprocessing maps `smol` and `compact` to `condenseToolResponse(...)`; later modified to return request-local tool metadata.
- `src/shared/tools.ts` — confirmed `ClineDefaultTool.CONDENSE = "condense"` and `SUMMARIZE_TASK = "summarize_task"` exist as tool IDs.
- `src/core/task/tools/ToolExecutorCoordinator.ts` — confirmed `ClineDefaultTool.CONDENSE` already has runtime handler registration via `CondenseHandler`.
- `src/core/task/tools/handlers/CondenseHandler.ts` — confirmed manual condense runtime flow: validates `context`, asks user for preview/approval, truncates conversation on acceptance.
- `src/core/task/tools/handlers/SummarizeTaskHandler.ts` — confirmed auto-condense uses separate `summarize_task` flow and context truncation state.
- `src/core/prompts/contextManagement.ts` — confirmed auto-context compaction prompt asks for `summarize_task`, not `condense`.
- `src/core/context/context-management/ContextManager.ts` — confirmed context-window threshold logic used by auto-condense.
- `src/core/task/index.ts` — reviewed task loop, `loadContext()` slash parsing, prompt context construction, native tool plumbing, and stream parsing behavior.
- `src/core/assistant-message/index.ts` and `parse-assistant-message.ts` — confirmed XML parsing recognizes tool names from `getToolUseNames()` including `condense`, but that does not add native tool schema.
- `src/core/prompts/system-prompt/registry/ClineToolSet.ts` — reviewed and modified native tool construction.
- `src/core/prompts/system-prompt/types.ts` — reviewed and modified `SystemPromptContext`.
- `src/core/prompts/system-prompt/tools/new_task.ts` — used as a reference for native tool spec shape and confirmed `new_task` has prompt/native spec support that `condense` lacked.
- `src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts`, `native-next-gen/config.ts`, and related variant searches — confirmed `condense` and `summarize_task` were not present in normal prompt variant `.tools(...)` lists.
- `cli/src/index.ts` and `webview-ui/src/components/settings/sections/FeatureSettingsSection.tsx` — reviewed auto-condense setting surfaces for context.
- `/Users/roschuma/Repos/roschuma/power-tetris/cline-tasks/condense-tool-investigation-handoff.md` — read and incorporated relevant installed-extension investigation findings.

## Files Changed

### Commit `e3dbe74f` — implementation

- `src/core/slash-commands/index.ts`
  - `parseSlashCommands(...)` now returns optional `requestLocalTools` metadata.
  - `/smol` and `/compact` map to `[ClineDefaultTool.CONDENSE]` as request-local tools.
  - Removed unsafe non-null assertion around `providerInfo` while computing `willUseNativeTools`.
- `src/core/task/TaskState.ts`
  - Added `requestLocalTools: ClineDefaultTool[]` state for one-request tool exposure.
- `src/core/task/index.ts`
  - Clears `requestLocalTools` before context loading for a new request.
  - Accumulates request-local tools emitted by slash-command parsing inside `loadContext()`.
  - Passes `requestLocalTools` into `SystemPromptContext` during prompt/native tool generation.
  - Clears request-local tool state immediately after `getSystemPrompt(...)`, keeping exposure one-turn scoped.
- `src/core/prompts/system-prompt/types.ts`
  - Added optional `requestLocalTools?: readonly ClineDefaultTool[]` to `SystemPromptContext`.
- `src/core/prompts/system-prompt/registry/ClineToolSet.ts`
  - Merges request-local tool specs into native tool generation alongside standard and MCP tools.
- `src/core/prompts/system-prompt/tools/request-local.ts`
  - New helper defining request-local native specs.
  - Currently supports `ClineDefaultTool.CONDENSE` only.
  - Includes required `context` parameter and focus-chain-gated optional `task_progress` parameter.

### Commit `cf1b78b1` — tests

- `src/core/slash-commands/__tests__/index.test.ts`
  - Added coverage that `<task>/compact</task>` injects condense instructions and returns `[ClineDefaultTool.CONDENSE]` as request-local metadata.
- `src/core/prompts/system-prompt/__tests__/openai-compatible-gpt-oss-file-tools.test.ts`
  - Added coverage that `condense` is absent by default in native tools.
  - Added coverage that `condense` appears when `requestLocalTools: [ClineDefaultTool.CONDENSE]` is supplied.

## Untouched Areas and Unrelated Local Changes

- `.vscode/cline.code-workspace` — unrelated untracked local file; intentionally not staged or committed.
- `package-lock.json` — briefly changed by an attempted validation command, then explicitly reverted with `git checkout -- package-lock.json` before commits.
- No generated proto files were intentionally changed.
- No installed VS Code extension bundle files were modified.
- No CLI TUI changes were made; this change is backend prompt/native-tool plumbing and test coverage only.

## Key Findings and Decisions

- Original installed-extension investigation from Power Tetris found:
  - `condense` exists in the bundled installed extension as a tool enum and handler.
  - `/smol` and `/compact` both route to manual condense instructions requiring `<condense>`.
  - Prompt variant `.tools(...)` lists in inspected bundled snippets omitted `"condense"`, so native-tool sessions did not expose a callable `condense` tool.
  - `summarize_task` is a separate auto-compaction path and should not be conflated with manual `/smol` / `/compact`.
- Source-repo investigation confirmed the same architecture:
  - `ClineDefaultTool.CONDENSE` and `CondenseHandler` already existed.
  - `parseAssistantMessageV2()` can parse XML `<condense>` if a model emits literal XML text.
  - Native tool providers receive callable schemas only through `registry.nativeTools`, which are built from registered prompt tool specs and active variant `.tools(...)` lists.
  - `condense` had no normal prompt/native spec file and was absent from prompt variants.
- Chosen implementation is Option B:
  - Do **not** globally add `condense` to every prompt variant.
  - Instead, carry metadata from slash parsing and add a request-local native tool spec for the next request only.
- This keeps `condense` scoped to manual `/smol` / `/compact` requests and avoids making it a generally available session tool.
- `new_task` differs from `condense`: `new_task` already has a registered prompt/native spec in `src/core/prompts/system-prompt/tools/new_task.ts`; this helped identify the missing layer for `condense`.
- Auto-condense remains separate and still uses `summarize_task`.

## Validation Performed

Commands run by assistant before commits:

```bash
npx tsc --noEmit --pretty false
```

- Result: passed.

```bash
npx biome check --no-errors-on-unmatched --files-ignore-unknown=true --diagnostic-level=error \
  src/core/slash-commands/index.ts \
  src/core/slash-commands/__tests__/index.test.ts \
  src/core/task/index.ts \
  src/core/task/TaskState.ts \
  src/core/prompts/system-prompt/types.ts \
  src/core/prompts/system-prompt/registry/ClineToolSet.ts \
  src/core/prompts/system-prompt/tools/request-local.ts \
  src/core/prompts/system-prompt/__tests__/openai-compatible-gpt-oss-file-tools.test.ts
```

- Result: passed.

```bash
git diff --check
```

- Result: passed.

Manual validation reported by user after environment refresh:

```bash
npm run test
npm run compile -- --noEmit
```

- Result: user reported both passed.

Commit-time hooks:

- Both commits ran the repository git hook, which backed up state and executed:

  ```text
  biome check --write --staged --no-errors-on-unmatched --files-ignore-unknown=true
  ```

- Result: passed for both commit groups.

Pre-commit caveat:

- Direct `pre-commit run --files ...` failed because this repo does not have a root `.pre-commit-config.yaml`:

  ```text
  InvalidConfigError: .pre-commit-config.yaml is not a file
  ```

- The actual `git commit` hook still ran staged Biome checks successfully.

Earlier validation blockers before environment refresh:

- `npm run compile -- --noEmit` initially failed because `node_modules/chalk` was missing for `scripts/build-proto.mjs`.
- Direct targeted Mocha invocation initially failed due to module resolution from `src/test/requires.ts`.
- User later refreshed environment and reported full `npm run test` and `npm run compile -- --noEmit` passed.

## Running or Stuck Commands

- No commands are currently running or stuck.

## Rejected Strategies

- Rejected global variant exposure as the preferred first implementation:
  - Adding `ClineDefaultTool.CONDENSE` directly to all prompt variant `.tools(...)` lists would make `condense` generally available rather than slash-command scoped.
- Rejected forcing XML mode for `/compact`:
  - Risky for Responses API / native-tool providers and inconsistent with native tool architecture.
- Did not patch installed extension bundle:
  - The fix was implemented in the Cline source repository instead.

## Staging or Commit Boundaries

Completed commits:

1. `e3dbe74f feat(prompt): expose condense as request-local native tool`
   - Runtime and prompt/native-tool plumbing only.
2. `cf1b78b1 test(prompt): cover request-local condense native tools`
   - Regression tests only.

This handoff note is intentionally not included in those commits because it was requested after the implementation/test commits were created.

## Open Questions or Risks

- Whether `request-local` tool specs should support additional slash-command-only tools in the future beyond `condense`.
- Whether `summarize_task` needs similar treatment for a native auto-condense path. Current code intentionally does not change this.
- Whether the product wants `/compact` in slash autocomplete alongside `/smol`; that was identified as a secondary discoverability issue in the external Power Tetris handoff, not addressed here.
- Whether to push the branch and open a PR after this local handoff commit.

## Next Steps

- [x] Commit `condense-request-local-native-tool-handoff.md` at the repository root.
- [ ] Keep `.vscode/cline.code-workspace` unstaged unless the user explicitly wants it included.
- [ ] Optionally run `git log --oneline -2` and `git status --short --branch` before pushing.
- [ ] Push branch `cobblers/request-local-condense-native-tool` if requested.
- [ ] Create a PR if requested, describing both commits and the request-local native-tool design.
- [ ] If future QA finds native `/compact` still failing, inspect the actual outgoing `tools` payload for the request that contains `<explicit_instructions type="condense">` and verify it includes function/tool name `condense`.

## Resume Prompt

Continue from `condense-request-local-native-tool-handoff.md` in `/Users/roschuma/Repos/github/cline`. Trust the recorded current branch, commits, and validation state only after first running `git status --short --branch` and checking that commits `e3dbe74f` and `cf1b78b1` are present. The core implementation is complete and committed: `/compact` and `/smol` now expose `condense` as a request-local native tool instead of a default global native tool. Do not repeat the installed-extension investigation unless this handoff conflicts with current repository state. Keep `.vscode/cline.code-workspace` unstaged unless the user explicitly says otherwise.
