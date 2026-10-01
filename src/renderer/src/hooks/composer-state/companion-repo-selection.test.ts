import { describe, expect, it } from 'vitest'
import type { Repo } from '../../../../shared/repo-types'
import type { WorktreeCreationRequest } from '@/lib/pending-worktree-creation'
import { getCompanionRepoOptions } from './companion-repo-selection'
import {
  buildCompanionCreationRequest,
  prepareCompanionCreationRequests
} from './companion-creation-requests'

function repo(id: string, overrides: Partial<Repo> = {}): Repo {
  return {
    id,
    path: `/tmp/${id}`,
    displayName: id,
    badgeColor: '#999999',
    addedAt: 1,
    ...overrides
  }
}

describe('getCompanionRepoOptions', () => {
  const repos = [
    repo('app'),
    repo('backend'),
    // Why: repos registered on this Mac carry an explicit 'local' host id.
    repo('ios', { executionHostId: 'local' }),
    repo('remote', { connectionId: 'ssh-1' }),
    repo('runtime', { executionHostId: 'runtime:env-1' }),
    repo('notes', { kind: 'folder' })
  ]

  it('offers the other local git repos, never the primary itself', () => {
    expect(
      getCompanionRepoOptions({ eligibleRepos: repos, repoId: 'app', primaryIsLocalGit: true }).map(
        (option) => option.id
      )
    ).toEqual(['backend', 'ios'])
  })

  it('offers nothing when the primary target is remote, a folder, or unset', () => {
    expect(
      getCompanionRepoOptions({ eligibleRepos: repos, repoId: 'app', primaryIsLocalGit: false })
    ).toEqual([])
    expect(
      getCompanionRepoOptions({ eligibleRepos: repos, repoId: '', primaryIsLocalGit: true })
    ).toEqual([])
  })
})

describe('buildCompanionCreationRequest', () => {
  const primary: WorktreeCreationRequest = {
    repoId: 'app',
    name: 'feat-login',
    displayName: 'Login',
    displayNameKind: 'user',
    baseBranch: 'release',
    setupDecision: 'run',
    linkedIssue: 42,
    linkedPR: 7,
    parentWorktreeId: 'app::/tmp/parent',
    sparseCheckout: { directories: ['src'] },
    branchNameOverride: 'feat-login',
    agent: 'claude',
    pendingFirstAgentMessageRename: true,
    note: 'shared note',
    startupPlan: null,
    quickPrompt: 'fix login',
    quickTelemetry: null,
    workspaceStatus: 'in-progress'
  }

  it('keeps the shared identity and drops everything owned by the primary repo', () => {
    const companion = buildCompanionCreationRequest(primary, 'backend', 'inherit')

    expect(companion).toMatchObject({
      repoId: 'backend',
      name: 'feat-login',
      displayName: 'Login',
      branchNameOverride: 'feat-login',
      setupDecision: 'inherit',
      note: 'shared note',
      workspaceStatus: 'in-progress',
      agent: null,
      quickPrompt: '',
      pendingFirstAgentMessageRename: false,
      companionCreate: true,
      suppressTerminalFocusOnCompletion: true
    })
    for (const key of [
      'baseBranch',
      'linkedIssue',
      'linkedPR',
      'parentWorktreeId',
      'sparseCheckout'
    ]) {
      expect(companion).not.toHaveProperty(key)
    }
  })
})

describe('prepareCompanionCreationRequests', () => {
  it('passes the primary through untouched when no companions are selected', async () => {
    const primary = { repoId: 'app', name: 'x', pendingFirstAgentMessageRename: true } as const
    const requests = await prepareCompanionCreationRequests({
      primary: {
        ...primary,
        setupDecision: 'inherit',
        agent: null,
        note: '',
        startupPlan: null,
        quickPrompt: '',
        quickTelemetry: null
      },
      companionRepoIds: [],
      isSubmissionCancelled: () => false
    })
    expect(requests).toHaveLength(1)
    expect(requests?.[0]?.pendingFirstAgentMessageRename).toBe(true)
  })
})
