import type { editor } from 'monaco-editor'

export type DiffNavigationDirection = 'next' | 'previous'
export type DiffLandingEdge = 'first' | 'last'

type LineChange = Pick<editor.ILineChange, 'modifiedStartLineNumber' | 'modifiedEndLineNumber'>

// Why: mirrors Monaco's goToDiff anchor; legacy line changes report a pure deletion one line above its mapping start.
export function getDiffChangeAnchorLine(change: LineChange): number {
  return change.modifiedEndLineNumber === 0
    ? change.modifiedStartLineNumber + 1
    : change.modifiedStartLineNumber
}

/** True when Monaco's goToDiff would wrap (or has nothing to go to) instead of moving within the file. */
export function isAtDiffNavigationEdge(args: {
  changes: readonly LineChange[]
  cursorLine: number
  lineCount: number
  direction: DiffNavigationDirection
}): boolean {
  const { changes, cursorLine, lineCount, direction } = args
  if (changes.length === 0) {
    return true
  }
  const anchors = changes.map(getDiffChangeAnchorLine)
  if (direction === 'next') {
    return cursorLine === lineCount || !anchors.some((line) => line > cursorLine)
  }
  return !anchors.some((line) => line < cursorLine)
}

// Why: one slot is enough; a newer cross-file jump supersedes an unconsumed one.
let pendingLanding: { fileId: string; edge: DiffLandingEdge } | null = null

export function requestDiffLanding(fileId: string, edge: DiffLandingEdge): void {
  pendingLanding = { fileId, edge }
}

/** modelKey is the tab id, optionally suffixed with `::<scope>` for split panes. */
export function peekDiffLanding(modelKey: string): DiffLandingEdge | null {
  if (!pendingLanding) {
    return null
  }
  const { fileId, edge } = pendingLanding
  return modelKey === fileId || modelKey.startsWith(`${fileId}::`) ? edge : null
}

export function clearDiffLanding(): void {
  pendingLanding = null
}
