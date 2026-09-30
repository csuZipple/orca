import { FolderRoot, Layers } from 'lucide-react'
import type { Repo } from '../../../../../../shared/repo-types'
import type { Worktree } from '../../../../../../shared/worktree/types'
import { branchName } from '../../../../lib/git-utils'
import { translate } from '@/i18n/i18n'
import type { OrderedGroupEntry, WorktreeGroupEntry } from './project-grouping'

export const WORKSPACE_NAME_GROUP_PREFIX = 'name:'
// Why: every main worktree sits on its default branch, so name-grouping them would pile all repos into one "main" lane.
export const WORKSPACE_NAME_MAIN_GROUP_KEY = 'name-main'

export const WORKSPACE_NAME_GROUP_META = {
  tone: 'text-foreground',
  icon: Layers
} as const

export const WORKSPACE_NAME_MAIN_GROUP_META = {
  get label() {
    return translate(
      'auto.components.sidebar.worktree.list.groups.workspaceNameMain',
      'Project roots'
    )
  },
  tone: 'text-muted-foreground',
  icon: FolderRoot
} as const

/** Cross-repo name of a worktree: its branch, or the folder basename when detached. */
export function getWorkspaceName(worktree: Pick<Worktree, 'branch' | 'path'>): string {
  const branch = worktree.branch ? branchName(worktree.branch) : ''
  if (branch) {
    return branch
  }
  const segments = worktree.path.split(/[\\/]/).filter(Boolean)
  return segments.at(-1) ?? worktree.path
}

export function getWorkspaceNameGroupKeyForName(name: string): string {
  return `${WORKSPACE_NAME_GROUP_PREFIX}${name}`
}

export function getWorkspaceNameGroupKey(
  worktree: Pick<Worktree, 'branch' | 'path' | 'isMainWorktree'>
): string {
  return worktree.isMainWorktree
    ? WORKSPACE_NAME_MAIN_GROUP_KEY
    : getWorkspaceNameGroupKeyForName(getWorkspaceName(worktree))
}

export function getWorkspaceNameLabelForKey(key: string): string {
  return key === WORKSPACE_NAME_MAIN_GROUP_KEY
    ? WORKSPACE_NAME_MAIN_GROUP_META.label
    : key.slice(WORKSPACE_NAME_GROUP_PREFIX.length)
}

function latestActivity(group: WorktreeGroupEntry): number {
  let latest = 0
  for (const worktree of group.items) {
    latest = Math.max(latest, worktree.lastActivityAt ?? 0)
  }
  for (const pair of group.folderWorkspaces ?? []) {
    latest = Math.max(latest, pair.folderWorkspace.lastActivityAt ?? 0)
  }
  return latest
}

/**
 * Most recently active workspace first, Project roots last; rows inside a lane
 * read by repo name so the same repos line up across lanes.
 */
export function orderWorkspaceNameGroups(
  entries: readonly OrderedGroupEntry[],
  repoMap: Map<string, Repo>
): OrderedGroupEntry[] {
  const repoLabel = (worktree: Worktree): string =>
    repoMap.get(worktree.repoId)?.displayName ?? worktree.repoId
  for (const [, group] of entries) {
    group.items.sort((left, right) => repoLabel(left).localeCompare(repoLabel(right)))
  }
  return [...entries].sort(([leftKey, left], [rightKey, right]) => {
    const leftIsMain = leftKey === WORKSPACE_NAME_MAIN_GROUP_KEY
    const rightIsMain = rightKey === WORKSPACE_NAME_MAIN_GROUP_KEY
    if (leftIsMain !== rightIsMain) {
      return leftIsMain ? 1 : -1
    }
    return latestActivity(right) - latestActivity(left) || left.label.localeCompare(right.label)
  })
}
