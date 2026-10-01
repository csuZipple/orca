import type { WorktreeCreationRequest } from '@/lib/pending-worktree-creation'
import type { SetupDecision } from '../../../../shared/worktree/create-types'
import { ensureHooksConfirmed } from '@/lib/ensure-hooks-confirmed'
import { settleComposerSubmit } from '@/lib/composer-submit-cancellation'
import { useAppStore } from '@/store'
import { buildQuickCreationRequest } from './quick-creation-request'

/**
 * A same-named workspace in another repo, created beside the primary one. It carries
 * only the shared identity; issue/PR links, start point, sparse checkout, and the agent
 * belong to the primary repo, and each repo starts from its own default base.
 */
export function buildCompanionCreationRequest(
  primary: WorktreeCreationRequest,
  repoId: string,
  setupDecision: SetupDecision
): WorktreeCreationRequest {
  return {
    ...buildQuickCreationRequest({
      repoId,
      ephemeralVmRecipe: undefined,
      indeterminateProgress: false,
      taskSourceContext: null,
      linkedWorkItem: null,
      workspaceRunContext: null,
      workspaceName: primary.name,
      nameWasGenerated: false,
      displayName: primary.displayName,
      displayNameKind: primary.displayNameKind,
      selectedRepoIsGit: true,
      baseBranch: undefined,
      compareBaseRef: undefined,
      setupDecision,
      sparseDirectories: null,
      sparsePresetId: null,
      telemetrySource: primary.telemetrySource,
      linkedIssue: null,
      linkedPR: null,
      pushTarget: undefined,
      agent: null,
      linkedLinearIssue: undefined,
      linkedLinearIssueWorkspaceId: undefined,
      linkedLinearIssueOrganizationUrlKey: undefined,
      // Why: an explicit branch override skips the per-repo prefix, so reusing it keeps every branch identical.
      branchNameOverride: primary.branchNameOverride,
      parentWorktreeId: null,
      workspaceStatus: primary.workspaceStatus,
      linkedGitLabMR: null,
      linkedGitLabIssue: null,
      includeGitLabLinks: false,
      startup: undefined,
      issueCommand: undefined,
      pendingFirstAgentMessageRename: false,
      note: primary.note,
      startupPlan: null,
      quickPrompt: '',
      launchDraftPrompt: undefined,
      promptDelivery: 'auto-submit',
      quickTelemetry: null,
      suppressTerminalFocusOnCompletion: true
    }),
    companionCreate: true
  }
}

/**
 * Returns the primary request followed by one companion per selected repo, resolving each
 * companion's setup trust up front so no prompt appears after the modal closes; null when cancelled.
 */
export async function prepareCompanionCreationRequests(args: {
  primary: WorktreeCreationRequest
  companionRepoIds: readonly string[]
  isSubmissionCancelled: () => boolean
}): Promise<WorktreeCreationRequest[] | null> {
  if (args.companionRepoIds.length === 0) {
    return [args.primary]
  }
  // Why: a later agent-driven rename would move the primary branch out of its companions' shared name.
  const primary = { ...args.primary, pendingFirstAgentMessageRename: false }
  const requests: WorktreeCreationRequest[] = [primary]
  for (const repoId of args.companionRepoIds) {
    const trust = await settleComposerSubmit(
      ensureHooksConfirmed(
        useAppStore.getState(),
        repoId,
        'setup',
        undefined,
        undefined,
        args.isSubmissionCancelled
      ),
      args.isSubmissionCancelled
    )
    if (trust.status === 'cancelled') {
      return null
    }
    // Why: 'inherit' lets each repo's own setup policy decide; an untrusted script is skipped, not the workspace.
    requests.push(
      buildCompanionCreationRequest(primary, repoId, trust.value === 'skip' ? 'skip' : 'inherit')
    )
  }
  return requests
}
