import type { Part } from '@opencode-ai/sdk';
import { log } from '../../utils/logger';
import PROMPT_ANALYZE from './template/analyze.txt';

type ReviewType = 'uncommitted' | 'commit' | 'branch' | 'pr' | 'file';

function detectReviewType(args: string): ReviewType {
  if (!args) return 'uncommitted';

  // PR: contains github.com, pull, or gh pr URL patterns
  if (
    args.includes('github.com') ||
    args.includes('gitlab.com') ||
    args.includes('/pull/') ||
    args.includes('/merge_requests/')
  ) {
    return 'pr';
  }

  // PR number: bare number like "42" or "#42"
  if (/^#?\d+$/.test(args.trim())) return 'pr';

  // Commit hash: 7-40 hex characters
  if (/^[0-9a-f]{7,40}$/i.test(args.trim())) return 'commit';

  // File path: contains a dot with extension, or starts with ./ or /
  if (
    /\.\w+$/.test(args.trim()) ||
    args.trim().startsWith('./') ||
    args.trim().startsWith('/')
  ) {
    return 'file';
  }

  // Default to branch name
  return 'branch';
}

function buildReviewTarget(type: ReviewType, args: string): string {
  switch (type) {
    case 'uncommitted':
      return `## Review Target: Uncommitted Changes

Review all uncommitted changes in the current working directory.

- Run: \`git diff\` for unstaged changes
- Run: \`git diff --cached\` for staged changes
- Run: \`git status --short\` to identify untracked (net new) files`;

    case 'commit':
      return `## Review Target: Commit \`${args}\`

Review the specified commit.

- Run: \`git show ${args}\``;

    case 'branch':
      return `## Review Target: Branch \`${args}\`

Compare the current branch against the specified branch.

- Run: \`git diff ${args}...HEAD\``;

    case 'pr':
      return `## Review Target: Pull Request \`${args}\`

Review the specified pull request.

- Run: \`gh pr view ${args}\` to get PR context
- Run: \`gh pr diff ${args}\` to get the diff`;

    case 'file':
      return `## Review Target: File \`${args}\`

Review a specific file and its recent changes.

- Verify the file exists and is a regular file (not a directory or binary)
- Read the full file contents
- Run: \`git log --oneline -10 "${args}"\` to see recent history
- Run: \`git diff HEAD~5 -- "${args}"\` to get recent changes (adjust range based on log output)
- Review the recent changes in context of the full file

If the file does not exist: "File not found: \`${args}\`. Please check the path and try again."
If a directory was provided: "Cannot review a directory. Please provide a specific file path."`;
  }
}

export function createAnalyzeCommandHook() {
  return {
    'command.execute.before': async (
      input: {
        command: string;
        sessionID: string;
        arguments: string;
      },
      output: { parts: Part[] },
    ): Promise<void> => {
      if (input.command === 'analyze') {
        const args = input.arguments?.trim() || '';
        const reviewType = detectReviewType(args);

        log('[analyze-command] Intercepted /analyze command', {
          arguments: args,
          reviewType,
        });

        const reviewTarget = buildReviewTarget(reviewType, args);
        const template = PROMPT_ANALYZE.replace('$REVIEW_TARGET', reviewTarget);

        output.parts.push({
          type: 'text',
          text: template,
        } as Part);

        // Force the target agent to be the Oracle for high-quality code review
        output.parts.push({
          type: 'agent',
          name: 'oracle',
        } as Part);
      }
    },
  };
}
