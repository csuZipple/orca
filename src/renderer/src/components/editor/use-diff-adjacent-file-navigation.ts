import { useCallback } from 'react'
import { detectLanguage } from '@/lib/language-detect'
import { useAppStore } from '@/store'
import type { OpenFile } from '@/store/slices/editor/types/open-file'
import { findWorktreeById } from '@/store/slices/worktree-helpers'
import { openStatusEntryDiff } from '../right-sidebar/source-control/listing/open-status-entry-diff'
import { getVisibleDiffOrder } from '../right-sidebar/source-control/listing/visible-diff-order'
import { resolveAdjacentDiffTarget } from './diff-adjacent-file'
import { requestDiffLanding, type DiffNavigationDirection } from './diff-change-edge'

/** Continues a change jump into the neighbouring Source Control file; false when there is none. */
export function useDiffAdjacentFileNavigation(
  activeFile: OpenFile | null,
  isChangesMode: boolean
): (direction: DiffNavigationDirection) => boolean {
  return useCallback(
    (direction: DiffNavigationDirection) => {
      if (!activeFile) {
        return false
      }
      const state = useAppStore.getState()
      const { worktreeId } = activeFile
      const worktreePath = findWorktreeById(state.worktreesByRepo, worktreeId)?.path
      if (!worktreePath) {
        return false
      }
      const target = resolveAdjacentDiffTarget({
        activeFile,
        isChangesMode,
        direction,
        visibleOrder: getVisibleDiffOrder(worktreeId),
        statusEntries: state.gitStatusByWorktree[worktreeId] ?? [],
        branchEntries: state.gitBranchChangesByWorktree[worktreeId] ?? []
      })
      if (!target) {
        return false
      }
      // Why: match a Source Control single click so stepping through files reuses one preview tab.
      const options = { preview: true }
      if (target.kind === 'status') {
        openStatusEntryDiff(state, { worktreeId, worktreePath, entry: target.entry, options })
      } else if (activeFile.branchCompare) {
        state.openBranchDiff(
          worktreeId,
          worktreePath,
          target.entry,
          activeFile.branchCompare,
          detectLanguage(target.entry.path),
          options
        )
      } else {
        return false
      }
      const openedFileId = useAppStore.getState().activeFileIdByWorktree[worktreeId]
      if (openedFileId) {
        requestDiffLanding(openedFileId, direction === 'next' ? 'first' : 'last')
      }
      return true
    },
    [activeFile, isChangesMode]
  )
}
