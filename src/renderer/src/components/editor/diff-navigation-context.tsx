import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { editor } from 'monaco-editor'
import { installMonacoDiffChangeNavigationShortcut } from './editor-shortcuts'
import { isAtDiffNavigationEdge, type DiffNavigationDirection } from './diff-change-edge'

export type DiffEditorRegistrationContextValue = {
  registerDiffEditor: (editor: editor.IStandaloneDiffEditor) => void
  unregisterDiffEditor: (editor: editor.IStandaloneDiffEditor) => void
}

export type DiffNavigationContextValue = {
  goToPreviousDiff: () => void
  goToNextDiff: () => void
  changeCount: number
}

const noop = (): void => {}

// Why: registration stays separate from changeCount so diff recomputation only
// rerenders the header controls, not the heavy Monaco DiffViewer consumer.
const DiffEditorRegistrationContext = createContext<DiffEditorRegistrationContextValue>({
  registerDiffEditor: noop,
  unregisterDiffEditor: noop
})

const DiffNavigationContext = createContext<DiffNavigationContextValue>({
  goToPreviousDiff: noop,
  goToNextDiff: noop,
  changeCount: 0
})

function countChanges(diffEditor: editor.IStandaloneDiffEditor): number {
  return diffEditor.getLineChanges()?.length ?? 0
}

export function DiffNavigationProvider({
  children,
  onNavigatePastEdge
}: {
  children: React.ReactNode
  /** Called instead of Monaco's in-file wrap; return true when it moved to another file. */
  onNavigatePastEdge?: (direction: DiffNavigationDirection) => boolean
}): React.JSX.Element {
  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null)
  const onNavigatePastEdgeRef = useRef(onNavigatePastEdge)
  useEffect(() => {
    onNavigatePastEdgeRef.current = onNavigatePastEdge
  })
  const updateSubRef = useRef<{ dispose: () => void } | null>(null)
  // Why: F7/Shift+F7 change navigation shares the registered editor with the
  // header buttons, so the keyboard listener lives here rather than in DiffViewer.
  const shortcutCleanupRef = useRef<(() => void) | null>(null)
  // Why: changeCount must be state, not a ref — the header is a sibling consumer
  // and only re-renders (enabling the buttons) when the value object identity
  // changes on the 0 -> N flip once the diff computation lands.
  const [changeCount, setChangeCount] = useState(0)

  const navigate = useCallback((direction: DiffNavigationDirection) => {
    const diffEditor = editorRef.current
    if (!diffEditor) {
      return
    }
    const changes = diffEditor.getLineChanges()
    const modified = diffEditor.getModifiedEditor()
    const lineCount = modified.getModel()?.getLineCount()
    // Why: null changes means the diff is still computing, so an edge verdict would be a guess.
    if (
      changes &&
      lineCount !== undefined &&
      isAtDiffNavigationEdge({
        changes,
        cursorLine: modified.getPosition()?.lineNumber ?? 1,
        lineCount,
        direction
      }) &&
      onNavigatePastEdgeRef.current?.(direction)
    ) {
      return
    }
    diffEditor.goToDiff(direction)
  }, [])

  const registerDiffEditor = useCallback(
    (diffEditor: editor.IStandaloneDiffEditor) => {
      editorRef.current = diffEditor
      // Hold at most one update subscription; replace any prior editor's.
      updateSubRef.current?.dispose()
      updateSubRef.current = diffEditor.onDidUpdateDiff(() => {
        // Why: ignore updates from an editor that is no longer current so a stale
        // subscription in the fast-swap case can't write a wrong count.
        if (editorRef.current === diffEditor) {
          setChangeCount(countChanges(diffEditor))
        }
      })
      // Hold at most one keyboard listener; replace any prior editor's.
      shortcutCleanupRef.current?.()
      shortcutCleanupRef.current = installMonacoDiffChangeNavigationShortcut({
        getContainerDomNode: () => diffEditor.getContainerDomNode(),
        goToDiff: navigate
      })
      setChangeCount(countChanges(diffEditor))
    },
    [navigate]
  )

  const unregisterDiffEditor = useCallback((diffEditor: editor.IStandaloneDiffEditor) => {
    // Why: identity guard for the fast-swap race — a stale dispose carrying the
    // old editor must not wipe a freshly-registered new one.
    if (editorRef.current !== diffEditor) {
      return
    }
    updateSubRef.current?.dispose()
    updateSubRef.current = null
    shortcutCleanupRef.current?.()
    shortcutCleanupRef.current = null
    editorRef.current = null
    setChangeCount(0)
  }, [])

  const goToPreviousDiff = useCallback(() => navigate('previous'), [navigate])

  const goToNextDiff = useCallback(() => navigate('next'), [navigate])

  useEffect(() => {
    return () => {
      updateSubRef.current?.dispose()
      updateSubRef.current = null
      shortcutCleanupRef.current?.()
      shortcutCleanupRef.current = null
    }
  }, [])

  const registrationValue = useMemo(
    () => ({ registerDiffEditor, unregisterDiffEditor }),
    [registerDiffEditor, unregisterDiffEditor]
  )
  const navigationValue = useMemo(
    () => ({
      goToPreviousDiff,
      goToNextDiff,
      changeCount
    }),
    [goToPreviousDiff, goToNextDiff, changeCount]
  )

  return (
    <DiffEditorRegistrationContext.Provider value={registrationValue}>
      <DiffNavigationContext.Provider value={navigationValue}>
        {children}
      </DiffNavigationContext.Provider>
    </DiffEditorRegistrationContext.Provider>
  )
}

export function useDiffEditorRegistration(): DiffEditorRegistrationContextValue {
  return useContext(DiffEditorRegistrationContext)
}

export function useDiffNavigation(): DiffNavigationContextValue {
  return useContext(DiffNavigationContext)
}
