import { detectLanguage } from '@/lib/language-detect'
import { joinPath } from '@/lib/path'
import type { AppState } from '@/store'
import type { GitStatusEntry } from '../../../../../../shared/git-status-types'

type StatusEntryDiffOpeners = Pick<AppState, 'openDiff' | 'openFile' | 'setEditorViewMode'>

// Opens a non-conflict status entry the way a Source Control row click does.
export function openStatusEntryDiff(
  actions: StatusEntryDiffOpeners,
  args: {
    worktreeId: string
    worktreePath: string
    entry: GitStatusEntry
    options?: { targetGroupId?: string; preview?: boolean }
  }
): void {
  const { worktreeId, worktreePath, entry, options } = args
  const language = detectLanguage(entry.path)
  const filePath = joinPath(worktreePath, entry.path)
  // Why: unstaged markdown diffs open as an edit tab in Changes view (one tab per file); staged diffs still get a separate diff tab since that isn't what the editor edits.
  if (language === 'markdown' && entry.area === 'unstaged') {
    actions.openFile(
      { filePath, relativePath: entry.path, worktreeId, language, mode: 'edit' },
      options
    )
    actions.setEditorViewMode(filePath, 'changes')
    return
  }
  actions.openDiff(worktreeId, filePath, entry.path, language, entry.area === 'staged', options)
}
