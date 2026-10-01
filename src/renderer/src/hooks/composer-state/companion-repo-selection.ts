import { useCallback, useMemo, useState } from 'react'
import type { Repo } from '../../../../shared/repo-types'
import { isFolderRepo } from '../../../../shared/repo-kind'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../shared/execution-host'

export type ComposerCompanionRepoModel = {
  /** Repos that can also get the same-named workspace in this submit. */
  companionRepoOptions: Repo[]
  /** Selected companions, already narrowed to the current options. */
  companionRepoIds: string[]
  setCompanionRepoIds: (repoIds: readonly string[]) => void
}

/** Local git repos only: remote/runtime repos need their own host, setup, and connection flow. */
export function isCompanionRepoCandidate(repo: Repo): boolean {
  return (
    !isFolderRepo(repo) &&
    !repo.connectionId &&
    (!repo.executionHostId || repo.executionHostId === LOCAL_EXECUTION_HOST_ID)
  )
}

export function getCompanionRepoOptions(args: {
  eligibleRepos: readonly Repo[]
  repoId: string
  primaryIsLocalGit: boolean
}): Repo[] {
  if (!args.primaryIsLocalGit || !args.repoId) {
    return []
  }
  return args.eligibleRepos.filter(
    (repo) => repo.id !== args.repoId && isCompanionRepoCandidate(repo)
  )
}

export function useCompanionRepoSelection(args: {
  eligibleRepos: readonly Repo[]
  repoId: string
  selectedRepoIsGit: boolean
  selectedRepoIsRemote: boolean
  isProjectGroupTarget: boolean
}): ComposerCompanionRepoModel {
  const { eligibleRepos, repoId, selectedRepoIsGit, selectedRepoIsRemote, isProjectGroupTarget } =
    args
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([])
  const companionRepoOptions = useMemo(
    () =>
      getCompanionRepoOptions({
        eligibleRepos,
        repoId,
        primaryIsLocalGit: selectedRepoIsGit && !selectedRepoIsRemote && !isProjectGroupTarget
      }),
    [eligibleRepos, isProjectGroupTarget, repoId, selectedRepoIsGit, selectedRepoIsRemote]
  )
  // Why: switching the primary project must not keep it (or a now-ineligible repo) as its own companion.
  const companionRepoIds = useMemo(() => {
    const allowed = new Set(companionRepoOptions.map((repo) => repo.id))
    return selectedIds.filter((id) => allowed.has(id))
  }, [companionRepoOptions, selectedIds])
  const setCompanionRepoIds = useCallback((repoIds: readonly string[]) => {
    setSelectedIds([...repoIds])
  }, [])
  return { companionRepoOptions, companionRepoIds, setCompanionRepoIds }
}
