import { useCallback } from 'react'
import { useAppStore } from '@/store'

export type DiffSideBySidePreference = {
  sideBySide: boolean
  toggleSideBySide: () => void
}

// Why: every diff surface shares one persisted choice, so a toolbar toggle survives remounts, tab switches, and restarts.
export function useDiffSideBySidePreference(): DiffSideBySidePreference {
  const sideBySide = useAppStore((s) => s.settings?.diffDefaultView === 'side-by-side')
  const updateSettings = useAppStore((s) => s.updateSettings)
  const toggleSideBySide = useCallback(() => {
    void updateSettings({ diffDefaultView: sideBySide ? 'inline' : 'side-by-side' })
  }, [sideBySide, updateSettings])
  return { sideBySide, toggleSideBySide }
}
