import {
  WORKSPACE_NAME_GROUP_PREFIX,
  WORKSPACE_NAME_MAIN_GROUP_KEY
} from './worktree-list/grouping/workspace-name-groups'

export type WorkspaceNameLaneCardIdentity = {
  title: string
  hideRepoBadge: boolean
  hideBranch: boolean
}

/**
 * Drops identity the Workspace group-by header already states: in a same-name lane
 * the branch is the header, so the branch row goes and a branch-titled card is retitled by its repo.
 * Returns null when the card keeps its normal identity.
 */
export function getWorkspaceNameLaneCardIdentity(args: {
  laneKey: string | undefined
  visibleCardTitle: string
  branch: string
  repoName: string | undefined
}): WorkspaceNameLaneCardIdentity | null {
  const { laneKey, visibleCardTitle, branch, repoName } = args
  if (!laneKey || !branch) {
    return null
  }
  const title = visibleCardTitle.trim()
  if (laneKey === WORKSPACE_NAME_MAIN_GROUP_KEY) {
    // Why: a project root sits on its default branch, so the repo name is what tells these rows apart.
    return title === branch && repoName
      ? { title: repoName, hideRepoBadge: true, hideBranch: true }
      : null
  }
  // Why: nested lineage children share the lane but can sit on another branch, which is then new information.
  if (
    !laneKey.startsWith(WORKSPACE_NAME_GROUP_PREFIX) ||
    laneKey.slice(WORKSPACE_NAME_GROUP_PREFIX.length) !== branch
  ) {
    return null
  }
  if ((title === '' || title === branch) && repoName) {
    return { title: repoName, hideRepoBadge: true, hideBranch: true }
  }
  return { title: visibleCardTitle, hideRepoBadge: false, hideBranch: true }
}
