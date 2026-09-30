import { describe, expect, it } from 'vitest'
import type { GitStatusEntry } from '../../../../shared/git-status-types'
import { resolveAdjacentDiffTarget } from './diff-adjacent-file'

function status(
  path: string,
  area: GitStatusEntry['area'],
  extra: Partial<GitStatusEntry> = {}
): GitStatusEntry {
  return { path, area, status: 'modified', ...extra }
}

const statusEntries = [
  status('b.ts', 'unstaged'),
  status('a.ts', 'unstaged'),
  status('c.ts', 'staged'),
  status('d.ts', 'untracked')
]

function resolve(
  overrides: Partial<Parameters<typeof resolveAdjacentDiffTarget>[0]>
): ReturnType<typeof resolveAdjacentDiffTarget> {
  return resolveAdjacentDiffTarget({
    activeFile: { diffSource: 'unstaged', relativePath: 'a.ts', mode: 'diff' },
    isChangesMode: false,
    direction: 'next',
    visibleOrder: undefined,
    statusEntries,
    branchEntries: [],
    ...overrides
  })
}

describe('resolveAdjacentDiffTarget', () => {
  it('falls back to staged → unstaged → untracked, sorted by path', () => {
    expect(resolve({})?.entry.path).toBe('b.ts')
    expect(resolve({ direction: 'previous' })?.entry.path).toBe('c.ts')
    expect(
      resolve({ activeFile: { diffSource: 'unstaged', relativePath: 'b.ts', mode: 'diff' } })?.entry
        .path
    ).toBe('d.ts')
  })

  it('follows the panel order when it lists the current file', () => {
    const visibleOrder = {
      statusEntries: [status('a.ts', 'unstaged'), status('d.ts', 'untracked')],
      branchEntries: []
    }
    expect(resolve({ visibleOrder, direction: 'next' })?.entry.path).toBe('d.ts')
    expect(resolve({ visibleOrder, direction: 'previous' })).toBeNull()
  })

  it('ignores a panel order that no longer lists the current file', () => {
    const visibleOrder = { statusEntries: [status('z.ts', 'unstaged')], branchEntries: [] }
    expect(resolve({ visibleOrder })?.entry.path).toBe('b.ts')
  })

  it('skips conflicted entries, which open a conflict editor rather than a diff', () => {
    const entries = [
      status('a.ts', 'unstaged'),
      status('b.ts', 'unstaged', { conflictKind: 'both_modified', conflictStatus: 'unresolved' }),
      status('c.ts', 'unstaged')
    ]
    expect(resolve({ statusEntries: entries })?.entry.path).toBe('c.ts')
  })

  it('treats a markdown Changes-mode edit tab as an unstaged diff', () => {
    const target = resolve({
      activeFile: { diffSource: undefined, relativePath: 'a.ts', mode: 'edit' },
      isChangesMode: true
    })
    expect(target?.entry.path).toBe('b.ts')
  })

  it('walks branch compare entries in order', () => {
    const branchEntries = [
      { path: 'x.ts', status: 'modified' as const },
      { path: 'y.ts', status: 'added' as const }
    ]
    const target = resolve({
      activeFile: { diffSource: 'branch', relativePath: 'x.ts', mode: 'diff' },
      branchEntries
    })
    expect(target).toEqual({ kind: 'branch', entry: branchEntries[1] })
  })

  it('has no sequence for commit or combined tabs', () => {
    expect(
      resolve({ activeFile: { diffSource: 'commit', relativePath: 'a.ts', mode: 'diff' } })
    ).toBeNull()
    expect(
      resolve({ activeFile: { diffSource: 'combined-all', relativePath: '', mode: 'diff' } })
    ).toBeNull()
  })
})
