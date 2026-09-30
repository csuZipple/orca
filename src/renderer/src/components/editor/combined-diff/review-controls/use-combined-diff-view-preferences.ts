import { useCallback, useEffect, useState } from 'react'
import type React from 'react'
import type { DiffSection } from '../../diff-section-types'
import { combinedDiffViewPreferences } from '../remember-view/combined-diff-view-memory'
import { getInitialCombinedDiffSectionLoadIndices } from '../load-sections/combined-diff-initial-section-load'
import type { CombinedDiffSectionLoadRegistry } from '../load-sections/combined-diff-section-load-registry'
import { useDiffSideBySidePreference } from '../../use-diff-side-by-side-preference'

export type CombinedDiffViewPreferences = {
  fileTreeCollapsed: boolean
  setAllSectionsCollapsed: (collapsed: boolean) => void
  setFileTreeCollapsed: (collapsed: boolean) => void
  sideBySide: boolean
  toggleDiffShowWhitespace: () => void
  toggleDiffWordWrap: () => void
  toggleSideBySide: () => void
}

export function useCombinedDiffViewPreferences({
  combinedDiffFileTreeVisibleByDefault,
  diffShowWhitespace,
  diffWordWrap,
  registry,
  setSections,
  updateSettings
}: {
  combinedDiffFileTreeVisibleByDefault: boolean | undefined
  diffShowWhitespace: boolean | undefined
  diffWordWrap: boolean | undefined
  registry: CombinedDiffSectionLoadRegistry
  setSections: React.Dispatch<React.SetStateAction<DiffSection[]>>
  updateSettings: (patch: { diffShowWhitespace?: boolean; diffWordWrap?: boolean }) => unknown
}): CombinedDiffViewPreferences {
  const { loadSchedulerRef, loadedIndicesRef, sectionsRef } = registry
  const { sideBySide, toggleSideBySide } = useDiffSideBySidePreference()
  const [fileTreeCollapsed, setFileTreeCollapsedState] = useState(
    () =>
      // Why: the tree is opt-in; only an explicit saved setting should open it while settings are still loading.
      combinedDiffViewPreferences.fileTreeCollapsed ?? combinedDiffFileTreeVisibleByDefault !== true
  )

  useEffect(() => {
    if (
      combinedDiffFileTreeVisibleByDefault !== undefined &&
      combinedDiffViewPreferences.fileTreeCollapsed === null
    ) {
      setFileTreeCollapsedState(combinedDiffFileTreeVisibleByDefault === false)
    }
  }, [combinedDiffFileTreeVisibleByDefault])

  const setFileTreeCollapsed = useCallback((collapsed: boolean) => {
    combinedDiffViewPreferences.fileTreeCollapsed = collapsed
    setFileTreeCollapsedState(collapsed)
  }, [])

  const setAllSectionsCollapsed = useCallback(
    (collapsed: boolean) => {
      combinedDiffViewPreferences.collapsed = collapsed
      setSections((prev) => prev.map((section) => ({ ...section, collapsed })))
      if (!collapsed) {
        const initialIndices = getInitialCombinedDiffSectionLoadIndices({
          sectionCount: sectionsRef.current.length,
          loadedIndices: loadedIndicesRef.current
        })
        for (const index of initialIndices) {
          loadSchedulerRef.current.request(index)
        }
      }
    },
    [loadSchedulerRef, loadedIndicesRef, sectionsRef, setSections]
  )

  const toggleDiffWordWrap = useCallback(() => {
    void updateSettings({ diffWordWrap: diffWordWrap !== true })
  }, [diffWordWrap, updateSettings])

  const toggleDiffShowWhitespace = useCallback(() => {
    void updateSettings({ diffShowWhitespace: diffShowWhitespace !== true })
  }, [diffShowWhitespace, updateSettings])

  return {
    fileTreeCollapsed,
    setAllSectionsCollapsed,
    setFileTreeCollapsed,
    sideBySide,
    toggleDiffShowWhitespace,
    toggleDiffWordWrap,
    toggleSideBySide
  }
}
