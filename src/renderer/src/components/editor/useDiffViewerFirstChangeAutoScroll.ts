import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { editor } from 'monaco-editor'
import { diffViewStateCache } from '@/lib/scroll-cache'
import { clearDiffLanding, getDiffChangeAnchorLine, peekDiffLanding } from './diff-change-edge'

type DiffViewerFirstChangeAutoScrollInput = {
  diffEditorRef: RefObject<editor.IStandaloneDiffEditor | null>
  modifiedEditor: editor.ICodeEditor | null
  modelKey: string
  pendingScrollCommentId: string | null
}

/**
 * Centers the viewport on a diff's first change (or the last, after a cross-file previous-change jump), once per modelKey.
 *
 * Why: lives outside handleMount so it sequences after the comment decorator's
 * view zones, which would otherwise shift the measured content downward.
 */
export function useDiffViewerFirstChangeAutoScroll({
  diffEditorRef,
  modifiedEditor,
  modelKey,
  pendingScrollCommentId
}: DiffViewerFirstChangeAutoScrollInput): void {
  const didAutoScrollFirstDiffRef = useRef(false)
  const didAutoScrollModelKeyRef = useRef(modelKey)
  useEffect(() => {
    if (didAutoScrollModelKeyRef.current !== modelKey) {
      didAutoScrollModelKeyRef.current = modelKey
      // Why: reset the per-modelKey one-shot here before the first-diff guard runs for the new file.
      didAutoScrollFirstDiffRef.current = false
    }
    const diffEditor = diffEditorRef.current
    if (!diffEditor || !modifiedEditor) {
      return
    }
    if (didAutoScrollFirstDiffRef.current) {
      return
    }
    // Why: a cross-file change jump must land on its edge even when the file has a remembered scroll.
    const landing = peekDiffLanding(modelKey)
    if (!landing && diffViewStateCache.get(modelKey)) {
      return
    }
    if (!landing && pendingScrollCommentId) {
      // Why: decorator owns this scroll, so set the one-shot flag; else we'd re-run and overwrite it when pendingScroll flips back to null.
      didAutoScrollFirstDiffRef.current = true
      return
    }
    let rafId: number | null = null
    const run = (): void => {
      if (didAutoScrollFirstDiffRef.current) {
        return
      }
      const changes = diffEditor.getLineChanges()
      if (!changes || changes.length === 0) {
        return
      }
      const lastChange = changes.at(-1)
      const line = Math.max(
        1,
        landing === 'last' && lastChange
          ? getDiffChangeAnchorLine(lastChange)
          : changes[0].modifiedStartLineNumber
      )
      // Defer one frame so view zones are laid out before measuring; cancel any earlier rAF to avoid a redundant scroll.
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      rafId = requestAnimationFrame(() => {
        rafId = null
        if (didAutoScrollFirstDiffRef.current || !modifiedEditor.getModel()) {
          return
        }
        const top = modifiedEditor.getTopForLineNumber(line, true)
        const editorHeight = modifiedEditor.getLayoutInfo().height
        modifiedEditor.setPosition({ lineNumber: line, column: 1 })
        modifiedEditor.setScrollTop(Math.max(0, top - editorHeight / 2))
        didAutoScrollFirstDiffRef.current = true
        if (landing) {
          clearDiffLanding()
          modifiedEditor.focus()
        }
      })
    }
    // Run now if the diff is ready; otherwise onDidUpdateDiff fires once the computation lands.
    if (diffEditor.getLineChanges()) {
      run()
    }
    const sub = diffEditor.onDidUpdateDiff(() => run())
    return () => {
      sub.dispose()
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [diffEditorRef, modifiedEditor, modelKey, pendingScrollCommentId])
}
