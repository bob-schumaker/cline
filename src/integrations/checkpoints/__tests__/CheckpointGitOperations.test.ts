import { expect } from "chai"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { CHECKPOINT_IGNORE_FILENAME, GIT_DISABLED_SUFFIX, GitOperations } from "../CheckpointGitOperations"

describe("GitOperations", () => {
	let tempDir: string

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cline-checkpoint-git-ops-"))
	})

	afterEach(async () => {
		await fs.rm(tempDir, { recursive: true, force: true })
	})

	describe("renameNestedGitRepos", () => {
		it("renames nested git repositories while preserving the root git repository", async () => {
			await createDirectory(".git")
			await createDirectory("packages/a/.git")

			await new GitOperations(tempDir).renameNestedGitRepos(true)

			expect(await exists(".git")).to.equal(true)
			expect(await exists("packages/a/.git")).to.equal(false)
			expect(await exists(`packages/a/.git${GIT_DISABLED_SUFFIX}`)).to.equal(true)
		})

		it("restores disabled nested git repositories while preserving the root git repository", async () => {
			await createDirectory(".git")
			await createDirectory(`packages/a/.git${GIT_DISABLED_SUFFIX}`)

			await new GitOperations(tempDir).renameNestedGitRepos(false)

			expect(await exists(".git")).to.equal(true)
			expect(await exists(`packages/a/.git${GIT_DISABLED_SUFFIX}`)).to.equal(false)
			expect(await exists("packages/a/.git")).to.equal(true)
		})

		it("always skips nested git repositories under node_modules", async () => {
			await createDirectory("node_modules/pkg/.git")
			await createDirectory("src/repo/.git")

			await new GitOperations(tempDir).renameNestedGitRepos(true)

			expect(await exists("node_modules/pkg/.git")).to.equal(true)
			expect(await exists(`node_modules/pkg/.git${GIT_DISABLED_SUFFIX}`)).to.equal(false)
			expect(await exists("src/repo/.git")).to.equal(false)
			expect(await exists(`src/repo/.git${GIT_DISABLED_SUFFIX}`)).to.equal(true)
		})

		it("uses .checkpointignore with standard gitignore directory patterns", async () => {
			await writeCheckpointIgnore("dist/\n")
			await createDirectory("dist/generated/.git")
			await createDirectory("src/repo/.git")

			await new GitOperations(tempDir).renameNestedGitRepos(true)

			expect(await exists("dist/generated/.git")).to.equal(true)
			expect(await exists(`dist/generated/.git${GIT_DISABLED_SUFFIX}`)).to.equal(false)
			expect(await exists("src/repo/.git")).to.equal(false)
			expect(await exists(`src/repo/.git${GIT_DISABLED_SUFFIX}`)).to.equal(true)
		})

		it("uses .checkpointignore with nested path patterns", async () => {
			await writeCheckpointIgnore("docs/build/\n")
			await createDirectory("docs/build/plugin/.git")
			await createDirectory("build/plugin/.git")

			await new GitOperations(tempDir).renameNestedGitRepos(true)

			expect(await exists("docs/build/plugin/.git")).to.equal(true)
			expect(await exists(`docs/build/plugin/.git${GIT_DISABLED_SUFFIX}`)).to.equal(false)
			expect(await exists("build/plugin/.git")).to.equal(false)
			expect(await exists(`build/plugin/.git${GIT_DISABLED_SUFFIX}`)).to.equal(true)
		})

		it("uses .checkpointignore with globs, comments, and negation", async () => {
			await writeCheckpointIgnore(["# generated package repos", "vendor/*", "!vendor/keep/", ""].join("\n"))
			await createDirectory("vendor/drop/.git")
			await createDirectory("vendor/keep/.git")

			await new GitOperations(tempDir).renameNestedGitRepos(true)

			expect(await exists("vendor/drop/.git")).to.equal(true)
			expect(await exists(`vendor/drop/.git${GIT_DISABLED_SUFFIX}`)).to.equal(false)
			expect(await exists("vendor/keep/.git")).to.equal(false)
			expect(await exists(`vendor/keep/.git${GIT_DISABLED_SUFFIX}`)).to.equal(true)
		})

		it("handles missing .checkpointignore gracefully", async () => {
			await createDirectory("nested/repo/.git")

			await new GitOperations(tempDir).renameNestedGitRepos(true)

			expect(await exists("nested/repo/.git")).to.equal(false)
			expect(await exists(`nested/repo/.git${GIT_DISABLED_SUFFIX}`)).to.equal(true)
		})
	})

	async function createDirectory(relativePath: string): Promise<void> {
		await fs.mkdir(path.join(tempDir, relativePath), { recursive: true })
	}

	async function exists(relativePath: string): Promise<boolean> {
		try {
			await fs.access(path.join(tempDir, relativePath))
			return true
		} catch {
			return false
		}
	}

	async function writeCheckpointIgnore(content: string): Promise<void> {
		await fs.writeFile(path.join(tempDir, CHECKPOINT_IGNORE_FILENAME), content)
	}
})
