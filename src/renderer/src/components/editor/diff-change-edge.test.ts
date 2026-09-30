import { afterEach, describe, expect, it } from 'vitest'
import {
  clearDiffLanding,
  getDiffChangeAnchorLine,
  isAtDiffNavigationEdge,
  peekDiffLanding,
  requestDiffLanding
} from './diff-change-edge'

const changes = [
  { modifiedStartLineNumber: 10, modifiedEndLineNumber: 12 },
  // Pure deletion after line 19 — Monaco anchors it at line 20.
  { modifiedStartLineNumber: 19, modifiedEndLineNumber: 0 },
  { modifiedStartLineNumber: 30, modifiedEndLineNumber: 30 }
]

describe('getDiffChangeAnchorLine', () => {
  it('anchors pure deletions one line below their legacy start', () => {
    expect(getDiffChangeAnchorLine(changes[0])).toBe(10)
    expect(getDiffChangeAnchorLine(changes[1])).toBe(20)
  })
})

describe('isAtDiffNavigationEdge', () => {
  const at = (cursorLine: number, direction: 'next' | 'previous', lineCount = 100): boolean =>
    isAtDiffNavigationEdge({ changes, cursorLine, lineCount, direction })

  it('stays within the file while a change lies ahead', () => {
    expect(at(1, 'next')).toBe(false)
    expect(at(20, 'next')).toBe(false)
    expect(at(30, 'previous')).toBe(false)
  })

  it('reports the edge when Monaco would wrap', () => {
    expect(at(30, 'next')).toBe(true)
    expect(at(10, 'previous')).toBe(true)
    expect(at(5, 'previous')).toBe(true)
  })

  it('treats the last model line as the end, like Monaco', () => {
    expect(at(8, 'next', 8)).toBe(true)
  })

  it('treats a file without changes as an edge in both directions', () => {
    const empty = { changes: [], cursorLine: 1, lineCount: 10 }
    expect(isAtDiffNavigationEdge({ ...empty, direction: 'next' })).toBe(true)
    expect(isAtDiffNavigationEdge({ ...empty, direction: 'previous' })).toBe(true)
  })
})

describe('diff landing requests', () => {
  afterEach(() => clearDiffLanding())

  it('matches the tab id and its split-pane scoped keys only', () => {
    requestDiffLanding('file-a', 'last')
    expect(peekDiffLanding('file-a')).toBe('last')
    expect(peekDiffLanding('file-a::tab-2')).toBe('last')
    expect(peekDiffLanding('file-ab')).toBeNull()
  })

  it('lets a newer request supersede an unconsumed one', () => {
    requestDiffLanding('file-a', 'last')
    requestDiffLanding('file-b', 'first')
    expect(peekDiffLanding('file-a')).toBeNull()
    expect(peekDiffLanding('file-b')).toBe('first')
  })
})
