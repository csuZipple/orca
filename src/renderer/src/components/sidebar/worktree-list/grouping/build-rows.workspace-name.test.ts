import { describe, expect, it } from 'vitest'
import { buildRows } from './build-rows'
import { getGroupKeyForWorktree } from './worktree-group-keys'
import {
  WORKSPACE_NAME_MAIN_GROUP_KEY,
  getWorkspaceName,
  getWorkspaceNameGroupKey
} from './workspace-name-groups'
import { repo, worktree } from '../../worktree-list-groups-test-fixtures'
import type { Repo } from '../../../../../../shared/repo-types'
import type { Worktree } from '../../../../../../shared/worktree/types'

const web: Repo = { ...repo, id: 'repo-web', path: '/tmp/web', displayName: 'web' }
const api: Repo = { ...repo, id: 'repo-api', path: '/tmp/api', displayName: 'api' }
const repoMap = new Map([
  [web.id, web],
  [api.id, api]
])

function wt(id: string, repoId: string, branch: string, extra: Partial<Worktree> = {}): Worktree {
  return { ...worktree, id, repoId, path: `/tmp/${id}`, branch, displayName: id, ...extra }
}

function headers(
  rows: ReturnType<typeof buildRows>
): { key: string; label: string; count: number }[] {
  return rows.flatMap((row) =>
    row.type === 'header' ? [{ key: row.key, label: row.label, count: row.count }] : []
  )
}

function itemIdsUnder(rows: ReturnType<typeof buildRows>, headerKey: string): string[] {
  const ids: string[] = []
  let inside = false
  for (const row of rows) {
    if (row.type === 'header') {
      inside = row.key === headerKey
    } else if (inside && row.type === 'item') {
      ids.push(row.worktree.id)
    }
  }
  return ids
}

describe('workspace-name grouping', () => {
  it('names a worktree by its branch, falling back to the folder when detached', () => {
    expect(getWorkspaceName({ branch: 'refs/heads/feat/login', path: '/x/y' })).toBe('feat/login')
    expect(getWorkspaceName({ branch: '', path: 'C:\\work\\hotfix' })).toBe('hotfix')
  })

  it('puts main worktrees in Project roots instead of one shared default-branch lane', () => {
    const main = wt('web-main', web.id, 'refs/heads/main', { isMainWorktree: true })
    expect(getWorkspaceNameGroupKey(main)).toBe(WORKSPACE_NAME_MAIN_GROUP_KEY)
    expect(getGroupKeyForWorktree('workspace-name', main, repoMap, null)).toBe(
      WORKSPACE_NAME_MAIN_GROUP_KEY
    )
  })

  it('aggregates same-named worktrees across repos, newest lane first, Project roots last', () => {
    const rows = buildRows(
      'workspace-name',
      [
        wt('web-main', web.id, 'refs/heads/main', { isMainWorktree: true, lastActivityAt: 99 }),
        wt('web-login', web.id, 'refs/heads/feat/login', { lastActivityAt: 5 }),
        wt('api-login', api.id, 'refs/heads/feat/login', { lastActivityAt: 1 }),
        wt('api-cache', api.id, 'refs/heads/feat/cache', { lastActivityAt: 10 })
      ],
      repoMap,
      null,
      new Set()
    )

    expect(headers(rows)).toEqual([
      { key: 'name:feat/cache', label: 'feat/cache', count: 1 },
      { key: 'name:feat/login', label: 'feat/login', count: 2 },
      { key: WORKSPACE_NAME_MAIN_GROUP_KEY, label: 'Project roots', count: 1 }
    ])
    // Rows inside a lane read by repo name so repos line up across lanes.
    expect(itemIdsUnder(rows, 'name:feat/login')).toEqual(['api-login', 'web-login'])
  })

  it('keeps a collapsed lane header but hides its rows', () => {
    const rows = buildRows(
      'workspace-name',
      [
        wt('web-login', web.id, 'refs/heads/feat/login'),
        wt('api-login', api.id, 'refs/heads/feat/login')
      ],
      repoMap,
      null,
      new Set(['name:feat/login'])
    )
    expect(headers(rows).map((header) => header.key)).toEqual(['name:feat/login'])
    expect(itemIdsUnder(rows, 'name:feat/login')).toEqual([])
  })
})
