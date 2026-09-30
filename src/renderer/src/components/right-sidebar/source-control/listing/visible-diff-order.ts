import type { GitBranchChangeEntry } from '../../../../../../shared/git-diff-compare-types'
import type { GitStatusEntry } from '../../../../../../shared/git-status-types'

export type VisibleDiffOrder = {
  statusEntries: readonly GitStatusEntry[]
  branchEntries: readonly GitBranchChangeEntry[]
}

// Why: the editor's cross-file diff navigation follows the panel's on-screen order (tree/list, section order, filter) without re-deriving it.
const visibleDiffOrderByWorktree = new Map<string, VisibleDiffOrder>()

export function publishVisibleDiffOrder(worktreeId: string, order: VisibleDiffOrder): void {
  visibleDiffOrderByWorktree.set(worktreeId, order)
}

export function getVisibleDiffOrder(worktreeId: string): VisibleDiffOrder | undefined {
  return visibleDiffOrderByWorktree.get(worktreeId)
}

export function clearVisibleDiffOrderForTests(): void {
  visibleDiffOrderByWorktree.clear()
}
