import { describe, expect, it } from 'vitest'
import { getWorkspaceNameLaneCardIdentity } from './worktree-card-workspace-name-lane'

const base = { visibleCardTitle: 'feat/login', branch: 'feat/login', repoName: 'tipsy-app' }

describe('getWorkspaceNameLaneCardIdentity', () => {
  it('keeps the normal card outside the Workspace group-by', () => {
    expect(getWorkspaceNameLaneCardIdentity({ ...base, laneKey: undefined })).toBeNull()
  })

  it('retitles a branch-named card by its repo and drops the repeated branch', () => {
    expect(getWorkspaceNameLaneCardIdentity({ ...base, laneKey: 'name:feat/login' })).toEqual({
      title: 'tipsy-app',
      hideRepoBadge: true,
      hideBranch: true
    })
  })

  it('keeps a custom title and repo badge, dropping only the branch', () => {
    expect(
      getWorkspaceNameLaneCardIdentity({
        ...base,
        visibleCardTitle: 'Login redesign',
        laneKey: 'name:feat/login'
      })
    ).toEqual({ title: 'Login redesign', hideRepoBadge: false, hideBranch: true })
  })

  it('leaves a nested child on another branch untouched', () => {
    expect(
      getWorkspaceNameLaneCardIdentity({
        ...base,
        visibleCardTitle: 'feat/login-child',
        branch: 'feat/login-child',
        laneKey: 'name:feat/login'
      })
    ).toBeNull()
  })

  it('titles Project roots cards by repo and drops the default-branch row', () => {
    expect(
      getWorkspaceNameLaneCardIdentity({
        visibleCardTitle: 'main',
        branch: 'main',
        repoName: 'ai-tools',
        laneKey: 'name-main'
      })
    ).toEqual({ title: 'ai-tools', hideRepoBadge: true, hideBranch: true })
  })
})
