import type { OpenFile } from '@/store/slices/editor/types/open-file'
import type { GitBranchChangeEntry } from '../../../../shared/git-diff-compare-types'
import type { GitStatusEntry } from '../../../../shared/git-status-types'
import { compareGitStatusEntries } from '../right-sidebar/source-control-status-sort'
import type { VisibleDiffOrder } from '../right-sidebar/source-control/listing/visible-diff-order'
import type { DiffNavigationDirection } from './diff-change-edge'

export type AdjacentDiffTarget =
  | { kind: 'status'; entry: GitStatusEntry }
  | { kind: 'branch'; entry: GitBranchChangeEntry }

const FALLBACK_AREA_ORDER: GitStatusEntry['area'][] = ['staged', 'unstaged', 'untracked']

function isConflictEntry(entry: GitStatusEntry): boolean {
  return Boolean(entry.conflictKind && entry.conflictStatus)
}

function sortStatusEntriesForFallback(entries: readonly GitStatusEntry[]): GitStatusEntry[] {
  return FALLBACK_AREA_ORDER.flatMap((area) =>
    entries.filter((entry) => entry.area === area).sort(compareGitStatusEntries)
  )
}

function stepFrom<T>(
  list: readonly T[],
  currentIndex: number,
  direction: DiffNavigationDirection,
  isNavigable: (item: T) => boolean
): T | null {
  const delta = direction === 'next' ? 1 : -1
  for (let index = currentIndex + delta; index >= 0 && index < list.length; index += delta) {
    if (isNavigable(list[index])) {
      return list[index]
    }
  }
  return null
}

/** Picks the file a change jump should continue into, in Source Control order; null at either end. */
export function resolveAdjacentDiffTarget(args: {
  activeFile: Pick<OpenFile, 'diffSource' | 'relativePath' | 'mode'>
  isChangesMode: boolean
  direction: DiffNavigationDirection
  visibleOrder: VisibleDiffOrder | undefined
  statusEntries: readonly GitStatusEntry[]
  branchEntries: readonly GitBranchChangeEntry[]
}): AdjacentDiffTarget | null {
  const { activeFile, isChangesMode, direction, visibleOrder } = args
  const source = activeFile.mode === 'edit' && isChangesMode ? 'unstaged' : activeFile.diffSource

  if (source === 'staged' || source === 'unstaged') {
    const areas: GitStatusEntry['area'][] =
      source === 'staged' ? ['staged'] : ['unstaged', 'untracked']
    const isCurrent = (entry: GitStatusEntry): boolean =>
      entry.path === activeFile.relativePath && areas.includes(entry.area)
    // Why: the panel's order is only usable while it still lists this file (e.g. not inside a collapsed section).
    const list = visibleOrder?.statusEntries.some(isCurrent)
      ? visibleOrder.statusEntries
      : sortStatusEntriesForFallback(args.statusEntries)
    const currentIndex = list.findIndex(isCurrent)
    if (currentIndex === -1) {
      return null
    }
    const entry = stepFrom(list, currentIndex, direction, (item) => !isConflictEntry(item))
    return entry ? { kind: 'status', entry } : null
  }

  if (source === 'branch') {
    const isCurrent = (entry: GitBranchChangeEntry): boolean =>
      entry.path === activeFile.relativePath
    const list = visibleOrder?.branchEntries.some(isCurrent)
      ? visibleOrder.branchEntries
      : args.branchEntries
    const currentIndex = list.findIndex(isCurrent)
    if (currentIndex === -1) {
      return null
    }
    const entry = stepFrom(list, currentIndex, direction, () => true)
    return entry ? { kind: 'branch', entry } : null
  }

  // Commit and combined tabs have no single-file sequence to continue through.
  return null
}
